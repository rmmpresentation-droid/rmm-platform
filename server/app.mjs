import express from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { sectionNames, statuses } from '../src/lib/local-workspace.mjs';

const roles = ['superadmin', 'admin', 'presentateur', 'networker'];
const allowed = { superadmin: sectionNames, admin: sectionNames, presentateur: ['rendezvous', 'formations', 'ressources'], networker: ['prospects', 'taches', 'rendezvous', 'formations', 'ressources'] };
const admin = (role) => role === 'admin' || role === 'superadmin';
const hash = (token) => createHash('sha256').update(token).digest('hex');
const cookieToken = (req) => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('rmm_session='))?.slice(12);
const sessionCookie = (token, maxAge) => `rmm_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export async function initialize(pool, email, password) {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS entries (id UUID PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (count.rows[0].count === 0) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('RMM_ADMIN_EMAIL valide et RMM_ADMIN_PASSWORD (12 caractères minimum, 72 octets maximum) sont requis pour initialiser la base.');
    await pool.query('INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), email.trim().toLowerCase(), 'Superadministrateur', 'superadmin', await bcrypt.hash(password, 12)]);
  }
}

export function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({error:'Origine interdite'}); }
      catch { return res.status(403).json({error:'Origine invalide'}); }
    }
    next();
  });
  const attempts = new Map();
  app.post('/api/login', async (req, res, next) => { try {
    const ip = req.ip; const now = Date.now(); const attempt = attempts.get(ip) || { count: 0, until: now + 60000 };
    if (now > attempt.until) { attempt.count = 0; attempt.until = now + 60000; }
    if (attempt.count >= 10) return res.status(429).json({error:'Trop de tentatives. Réessayez dans une minute.'});
    attempt.count++; attempts.set(ip, attempt);
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase().slice(0,254) : '';
    const password = typeof req.body.password === 'string' ? req.body.password.slice(0,256) : '';
    const found = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = found.rows[0];
    if (Buffer.byteLength(password, 'utf8') > 72) return res.status(401).json({error:'Identifiants incorrects'});
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({error:'Identifiants incorrects'});
    attempts.delete(ip);
    const token = randomBytes(32).toString('hex');
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,NOW() + INTERVAL '12 hours')", [hash(token), user.id]);
    res.setHeader('Set-Cookie', sessionCookie(token, 43200));
    res.json({id:user.id,email:user.email,name:user.name,role:user.role});
  } catch (err) { next(err); } });
  async function auth(req, res, next) { try {
    const token = cookieToken(req); if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({error:'Connexion requise'});
    const result = await pool.query('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > NOW()', [hash(token)]);
    if (!result.rows[0]) return res.status(401).json({error:'Session expirée'});
    req.user = result.rows[0]; req.token = token; next();
  } catch (err) { next(err); } }
  app.get('/api/me', auth, (req,res) => res.json(req.user));
  app.post('/api/logout', auth, async (req,res,next) => { try { await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hash(req.token)]); res.setHeader('Set-Cookie', sessionCookie('',0)); res.json({ok:true}); } catch(e) {next(e);} });
  app.get('/api/users', auth, async (req,res,next) => { try { if(req.user.role !== 'superadmin') return res.status(403).json({error:'Accès interdit'}); const result=await pool.query('SELECT id,email,name,role,created_at FROM users ORDER BY created_at DESC'); res.json(result.rows); } catch(e){next(e);} });
  app.post('/api/users', auth, async (req,res,next) => { try {
    if(req.user.role !== 'superadmin') return res.status(403).json({error:'Accès interdit'});
    const {email,name,role,password}=req.body;
    if(typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof name !== 'string' || !name.trim() || name.length > 100 || !roles.includes(role) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({error:'Nom, email valide, rôle et mot de passe de 12 caractères minimum requis.'});
    const result=await pool.query('INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,created_at',[randomUUID(),email.trim().toLowerCase(),name.trim(),role,await bcrypt.hash(password,12)]); res.status(201).json(result.rows[0]);
  } catch(e){ if(e.code==='23505') return res.status(409).json({error:'Email déjà utilisé'}); next(e); } });
  function sectionAccess(req,res,next) { if (!allowed[req.user.role]?.includes(req.params.section)) return res.status(403).json({error:'Accès interdit'}); next(); }
  app.get('/api/entries/:section',auth,sectionAccess,async(req,res,next)=>{try{
    // Administrators see all; regular users see their own work and shared resources.
    const result=await pool.query(`SELECT id,title,detail,status,owner,date,created_by FROM entries WHERE section=$1 ${admin(req.user.role) || ['formations','ressources'].includes(req.params.section) ? '' : 'AND created_by=$2'} ORDER BY created_at DESC`, admin(req.user.role) || ['formations','ressources'].includes(req.params.section) ? [req.params.section] : [req.params.section,req.user.id]); res.json(result.rows);
  }catch(e){next(e);}});
  const validate = (section, body) => typeof body.title==='string' && body.title.trim().length>0 && body.title.length<=160 && typeof body.detail==='string' && body.detail.length<=1000 && typeof body.owner==='string' && body.owner.length<=160 && typeof body.date==='string' && body.date.length<=32 && statuses[section]?.includes(body.status);
  app.post('/api/entries/:section',auth,sectionAccess,async(req,res,next)=>{try{
    const section=req.params.section;
    if (!admin(req.user.role) && ['formations','ressources'].includes(section)) return res.status(403).json({error:'Accès en lecture seule'});
    if (!validate(section,req.body)) return res.status(400).json({error:'Données invalides'});
    const {title,detail,status,owner,date}=req.body;
    const result=await pool.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,title,detail,status,owner,date,created_by',[randomUUID(),section,title.trim(),detail,status,owner,date,req.user.id]);res.status(201).json(result.rows[0]);
  }catch(e){next(e);}});
  app.put('/api/entries/:section/:id',auth,sectionAccess,async(req,res,next)=>{try{
    const section=req.params.section;
    if (!admin(req.user.role) && ['formations','ressources'].includes(section)) return res.status(403).json({error:'Accès en lecture seule'});
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || !validate(section,req.body)) return res.status(400).json({error:'Données invalides'});
    const {title,detail,status,owner,date}=req.body;
    const result=await pool.query(`UPDATE entries SET title=$1,detail=$2,status=$3,owner=$4,date=$5,updated_at=NOW() WHERE id=$6 AND section=$7 ${admin(req.user.role)?'':'AND created_by=$8'} RETURNING id,title,detail,status,owner,date,created_by`, [title.trim(),detail,status,owner,date,req.params.id,section,...(admin(req.user.role)?[]:[req.user.id])]); if(!result.rows[0]) return res.status(404).json({error:'Élément introuvable'}); res.json(result.rows[0]);
  }catch(e){next(e);}});
  app.delete('/api/entries/:section/:id',auth,sectionAccess,async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({error:'Identifiant invalide'});
    if(!admin(req.user.role) && ['formations','ressources'].includes(req.params.section)) return res.status(403).json({error:'Accès en lecture seule'});
    const result=await pool.query(`DELETE FROM entries WHERE id=$1 AND section=$2 ${admin(req.user.role)?'':'AND created_by=$3'} RETURNING id`,[req.params.id,req.params.section,...(admin(req.user.role)?[]:[req.user.id])]); if(!result.rows[0]) return res.status(404).json({error:'Élément introuvable'}); res.json({ok:true});
  }catch(e){next(e);}});
  app.get('/api/analytics',auth,async(req,res,next)=>{try{if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const entries=await pool.query('SELECT section,status,COUNT(*)::int AS count FROM entries GROUP BY section,status ORDER BY section,status'); const users=await pool.query('SELECT role,COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role');res.json({entries:entries.rows,users:users.rows});}catch(e){next(e);}});
  app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Erreur serveur'});});
  return app;
}
