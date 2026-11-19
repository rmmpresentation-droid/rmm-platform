import express from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sectionNames, statuses } from '../src/lib/local-workspace.mjs';
import { validateExtra } from '../src/lib/business-fields.mjs';
import { parseAdditionalNetworkers } from '../src/lib/meeting-participants.mjs';
import { initializeCommerce, mountCommerce } from './commerce.mjs';
import { initializeAccounting, mountAccounting } from './accounting.mjs';
import { initializeObjectives, mountObjectives } from './objectives.mjs';
import { mountTrainingVideos } from './training-videos.mjs';

const productReviewNotes = JSON.parse(readFileSync(new URL('./product-review-notes.json', import.meta.url), 'utf8'));
const productCatalogue = JSON.parse(readFileSync(new URL('../src/lib/product-catalogue.json', import.meta.url), 'utf8'));
// Stable namespaced IDs preserve edited imported entries and make repeated imports safe.
const catalogueEntryId = (id) => {const h = createHash('sha256').update(`rmm-product-catalogue-v1:${id}`).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};

const roles = ['superadmin', 'admin', 'presentateur', 'networker'];
const availableSections = sectionNames.filter(section => section !== 'ressources');
const allowed = { superadmin: availableSections, admin: availableSections, presentateur: ['rendezvous', 'formations'], networker: ['prospects', 'taches', 'rendezvous', 'formations'] };
const admin = (role) => role === 'admin' || role === 'superadmin';
const presenter = (user) => user.role === 'presentateur' || (['admin','networker'].includes(user.role) && user.is_presenter);
const hash = (token) => createHash('sha256').update(token).digest('hex');
const cookieToken = (req) => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('rmm_session='))?.slice(12);
const sessionCookie = (token, maxAge) => `rmm_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export async function initialize(pool, email, password) {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS entries (id UUID PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES users(id)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_presenter BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0');
  // Additive migration: preserve existing entries and keep their extra fields empty.
  await pool.query("ALTER TABLE entries ADD COLUMN IF NOT EXISTS extra TEXT NOT NULL DEFAULT '{}'");
  await pool.query('ALTER TABLE entries ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id)');
  await pool.query('CREATE TABLE IF NOT EXISTS networker_sponsor_history (id UUID PRIMARY KEY, networker_id UUID NOT NULL REFERENCES users(id), old_sponsor_id UUID REFERENCES users(id), new_sponsor_id UUID REFERENCES users(id), actor_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await pool.query('CREATE TABLE IF NOT EXISTS networker_followup_notes (id UUID PRIMARY KEY, networker_id UUID NOT NULL REFERENCES users(id), author_id UUID NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await pool.query("CREATE TABLE IF NOT EXISTS networker_goals (id UUID PRIMARY KEY, networker_id UUID NOT NULL REFERENCES users(id), title TEXT NOT NULL, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE TABLE IF NOT EXISTS networker_goal_tasks (goal_id UUID NOT NULL REFERENCES networker_goals(id), task_id UUID NOT NULL REFERENCES entries(id), active BOOLEAN NOT NULL DEFAULT TRUE, PRIMARY KEY (goal_id,task_id))");
  await pool.query('CREATE TABLE IF NOT EXISTS prospect_notes (id UUID PRIMARY KEY, prospect_id UUID NOT NULL REFERENCES entries(id), author_id UUID NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await pool.query('CREATE TABLE IF NOT EXISTS task_progress (task_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL, PRIMARY KEY (task_id,user_id))');
  await pool.query('CREATE TABLE IF NOT EXISTS appointment_reports (appointment_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, report TEXT NOT NULL, PRIMARY KEY (appointment_id,user_id))');
  await pool.query('CREATE TABLE IF NOT EXISTS training_attendance (training_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, attended BOOLEAN NOT NULL, quiz_score TEXT NOT NULL DEFAULT \'\', PRIMARY KEY (training_id,user_id))');
  await initializeObjectives(pool);
  await initializeCommerce(pool);
  await initializeAccounting(pool);
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (count.rows[0].count === 0) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('RMM_ADMIN_EMAIL valide et RMM_ADMIN_PASSWORD (12 caractères minimum, 72 octets maximum) sont requis pour initialiser la base.');
    await pool.query('INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), email.trim().toLowerCase(), 'Superadministrateur', 'superadmin', await bcrypt.hash(password, 12)]);
  }
}

export function createApp(pool, { publicRequestAdminId = "", videoDirectory = process.env.RMM_VIDEO_DIR || ".local-data/training-videos" } = {}) {
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
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({error:'Identifiants incorrects'});
    attempts.delete(ip);
    const token = randomBytes(32).toString('hex');
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at,auth_version) VALUES ($1,$2,NOW() + INTERVAL '12 hours',$3)", [hash(token), user.id, user.auth_version]);
    res.setHeader('Set-Cookie', sessionCookie(token, 43200));
    res.json({id:user.id,email:user.email,name:user.name,role:user.role,is_presenter:presenter(user)});
  } catch (err) { next(err); } });
  async function auth(req, res, next) { try {
    const token = cookieToken(req); if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({error:'Connexion requise'});
    const result = await pool.query('SELECT u.id,u.email,u.name,u.role,u.is_presenter FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > NOW() AND u.is_active=TRUE AND s.auth_version=u.auth_version', [hash(token)]);
    if (!result.rows[0]) return res.status(401).json({error:'Session expirée'});
    req.user = result.rows[0]; req.token = token; next();
  } catch (err) { next(err); } }
  mountTrainingVideos(app, {auth, admin, presenter, directory: videoDirectory});
  mountCommerce(app, pool, {auth, admin, catalogueEntryId});
  mountAccounting(app, pool, {auth, admin});
  mountObjectives(app, pool, {auth, admin});
  app.get('/api/me', auth, (req,res) => res.json({...req.user,is_presenter:presenter(req.user)}));
  app.post('/api/logout', auth, async (req,res,next) => { try { await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hash(req.token)]); res.setHeader('Set-Cookie', sessionCookie('',0)); res.json({ok:true}); } catch(e) {next(e);} });
  app.get('/api/users', auth, async (req,res,next) => { try { if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const result=await pool.query(req.user.role === 'superadmin' ? 'SELECT id,email,name,role,is_active,is_presenter,created_at FROM users ORDER BY created_at DESC' : "SELECT id,email,name,role,is_active,is_presenter,created_at FROM users WHERE role='presentateur' ORDER BY created_at DESC"); res.json(result.rows); } catch(e){next(e);} });
  app.post('/api/users', auth, async (req,res,next) => { try {
    const {email,name,role,password}=req.body;
    if(req.user.role !== 'superadmin') return res.status(403).json({error:'Accès interdit'});
    if(typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof name !== 'string' || !name.trim() || name.length > 100 || !roles.includes(role) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({error:'Nom, email valide, rôle et mot de passe de 12 caractères minimum requis.'});
    const result=await pool.query('INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,created_at',[randomUUID(),email.trim().toLowerCase(),name.trim(),role,await bcrypt.hash(password,12)]); res.status(201).json(result.rows[0]);
  } catch(e){ if(e.code==='23505') return res.status(409).json({error:'Email déjà utilisé'}); next(e); } });
  // Disable rather than delete: business records and authorship remain intact.
  app.put('/api/users/:id', auth, async (req,res,next) => {
    if (!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    const {name,email,role,is_active}=req.body;
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || typeof name !== 'string' || !name.trim() || name.length > 100 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !roles.includes(role) || typeof is_active !== 'boolean') return res.status(400).json({error:'Nom, e-mail, rôle et état valides requis.'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const users=(await client.query('SELECT id,name,email,role,is_active,sponsor_id FROM users ORDER BY id FOR UPDATE')).rows;
      const target=users.find(u=>u.id===req.params.id);
      if (!target) {await client.query('ROLLBACK');return res.status(404).json({error:'Compte introuvable'});}
      if (req.user.role !== 'superadmin' && (target.role !== 'presentateur' || role !== 'presentateur')) {await client.query('ROLLBACK');return res.status(403).json({error:'Accès interdit'});}
      if (target.role === 'superadmin' && (!is_active || role !== 'superadmin')) {await client.query('ROLLBACK');return res.status(400).json({error:'Un superadministrateur ne peut pas être désactivé ou rétrogradé.'});}
      if(role!==target.role && (target.role==='networker' || role==='networker') && (target.sponsor_id || users.some(u=>u.role==='networker' && u.sponsor_id===target.id))) {await client.query('ROLLBACK');return res.status(409).json({error:'Ce compte possède des liens de parrainage. Détachez ou transférez-les avant de changer son rôle.'});}
      const result=await client.query("UPDATE users SET name=$1,email=$2,role=$3,is_active=$4,auth_version=auth_version+1 WHERE id=$5 AND (role <> 'superadmin' OR ($3 = 'superadmin' AND $4 = TRUE)) AND ($6 = 'superadmin' OR role = 'presentateur') RETURNING id,email,name,role,is_active,created_at", [name.trim(),email.trim().toLowerCase(),role,is_active,target.id,req.user.role]);
      if (!result.rows[0]) {await client.query('ROLLBACK');return res.status(409).json({error:'Le compte a changé ; actualisez la liste.'});}
      await client.query('COMMIT');res.json(result.rows[0]);
    }catch(e){try{await client.query('ROLLBACK');}catch{}if(e.code==='23505') return res.status(409).json({error:'Email déjà utilisé'});next(e);}finally{client.release();}
  });
  // Only the superadmin can grant or revoke the additive title; existing legacy presenter roles remain unchanged.
  app.put('/api/users/:id/presenter',auth,async(req,res,next)=>{try{
    if(req.user.role!=='superadmin') return res.status(403).json({error:'Seul le superadministrateur peut attribuer ce titre.'});
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id) || typeof req.body.is_presenter!=='boolean') return res.status(400).json({error:'Titre invalide.'});
    const target=(await pool.query('SELECT id,role,is_presenter FROM users WHERE id=$1',[req.params.id])).rows[0];
    if(!target) return res.status(404).json({error:'Compte introuvable.'});
    if(!['admin','networker'].includes(target.role)) return res.status(400).json({error:'Titre complémentaire réservé aux administrateurs et networkers.'});
    if(target.is_presenter!==req.body.is_presenter) await pool.query('UPDATE users SET is_presenter=$1,auth_version=auth_version+1 WHERE id=$2',[req.body.is_presenter,target.id]);
    res.json({id:target.id,is_presenter:req.body.is_presenter});
  }catch(e){next(e);}});
  app.get('/api/presenters', auth, async(req,res,next)=>{ try { if (!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const result = await pool.query("SELECT id,name FROM users WHERE is_active=TRUE AND (role='presentateur' OR (is_presenter=TRUE AND (role='admin' OR role='networker'))) ORDER BY name"); res.json(result.rows); } catch(e){next(e);} });
  app.get('/api/network-directory', auth, async(req,res,next)=>{ try { if (!roles.includes(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const result = await pool.query(req.user.role === 'presentateur' ? "SELECT id,name,role FROM users WHERE role='networker' ORDER BY name" : "SELECT id,name,role FROM users ORDER BY name"); res.json(result.rows); } catch(e){next(e);} });
  function unpack(row) { return { ...row, extra: JSON.parse(row.extra || '{}') }; }
  const taskAssigned = (extra, user) => extra.audience === 'Tous les admins' ? admin(user.role) : extra.audience === 'Tous les networkers' ? user.role === 'networker' : ['Admin spécifique','Networker spécifique'].includes(extra.audience) && extra.target === user.id;
  async function taskValidation(extra) {
    const audience = extra.audience;
    if (!['Tous les admins','Admin spécifique','Tous les networkers','Networker spécifique'].includes(audience)) return 'Choisissez les destinataires de la tâche.';
    if (audience.endsWith('spécifique')) {
      if (!/^[0-9a-f-]{36}$/i.test(extra.target || '')) return 'Choisissez un destinataire existant.';
      const user = (await pool.query('SELECT id,role FROM users WHERE id=$1', [extra.target])).rows[0];
      if (!user || (audience === 'Admin spécifique' ? !admin(user.role) : user.role !== 'networker')) return 'Destinataire invalide.';
    } else if (extra.target) return 'Une tâche collective ne doit pas avoir de destinataire individuel.';
    return null;
  }
  app.get('/api/trainings/:id/attendance',auth,async(req,res,next)=>{try{
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({error:'Identifiant invalide'});
    const result=await pool.query("SELECT * FROM entries WHERE id=$1 AND section='formations'",[req.params.id]); const training=result.rows[0] && unpack(result.rows[0]);
    if(!training || !(admin(req.user.role) || (presenter(req.user) && training.extra.presenter_id === req.user.id))) return res.status(403).json({error:'Accès interdit'});
    const rows=await pool.query('SELECT a.user_id,a.attended,a.quiz_score,u.name FROM training_attendance a JOIN users u ON u.id=a.user_id WHERE a.training_id=$1',[req.params.id]);res.json(rows.rows);
  }catch(e){next(e);}});
  app.put('/api/trainings/:id/attendance/:userId',auth,async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id) || !/^[0-9a-f-]{36}$/i.test(req.params.userId) || typeof req.body.attended!=='boolean' || typeof req.body.quiz_score!=='string' || req.body.quiz_score.length>40) return res.status(400).json({error:'Données invalides'});
    const result=await pool.query("SELECT * FROM entries WHERE id=$1 AND section='formations'",[req.params.id]);const training=result.rows[0] && unpack(result.rows[0]);
    if(!training || !(admin(req.user.role) || (presenter(req.user) && training.extra.presenter_id===req.user.id))) return res.status(403).json({error:'Accès interdit'});
    if(training.status !== 'Terminée') return res.status(400).json({error:'Enregistrez les présences après la formation terminée.'});
    const target=await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[req.params.userId]);if(!target.rows.length) return res.status(400).json({error:'Networker invalide'});
    const old=await pool.query('SELECT quiz_score FROM training_attendance WHERE training_id=$1 AND user_id=$2',[req.params.id,req.params.userId]);
    const score=admin(req.user.role) ? req.body.quiz_score.trim() : (old.rows[0]?.quiz_score || '');
    const update=await pool.query('UPDATE training_attendance SET attended=$1,quiz_score=$2 WHERE training_id=$3 AND user_id=$4 RETURNING user_id',[req.body.attended,score,req.params.id,req.params.userId]);
    if (!update.rows.length) await pool.query('INSERT INTO training_attendance (training_id,user_id,attended,quiz_score) VALUES ($1,$2,$3,$4)',[req.params.id,req.params.userId,req.body.attended,score]);
    res.json({ok:true});
  }catch(e){next(e);}});
  app.get('/api/networkers',auth,async(req,res,next)=>{try{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    const people=(await pool.query("SELECT id,name,email,is_active,sponsor_id,created_at FROM users WHERE role='networker' ORDER BY name")).rows;
    const prospects=(await pool.query("SELECT assigned_to,created_by FROM entries WHERE section='prospects'")).rows;
    const counts=new Map();for(const p of prospects){const id=p.assigned_to || p.created_by;counts.set(id,(counts.get(id)||0)+1);}
    res.json(people.map(p=>({...p,prospect_count:counts.get(p.id)||0})));
  }catch(e){next(e);}});
  app.get('/api/networkers/tree',auth,async(req,res,next)=>{try{
    if(!admin(req.user.role) && req.user.role!=='networker') return res.status(403).json({error:'Accès interdit'});
    const all=(await pool.query("SELECT id,name,sponsor_id FROM users WHERE role='networker' ORDER BY name,id")).rows;
    const byId=new Map(all.map(u=>[u.id,u])), children=new Map();
    for(const u of all){if(u.sponsor_id){if(!children.has(u.sponsor_id)) children.set(u.sponsor_id,[]);children.get(u.sponsor_id).push(u);}}
    if(admin(req.user.role)) {
      const visited=new Set(), stack=all.filter(u=>!u.sponsor_id || !byId.has(u.sponsor_id));
      const incomplete=all.some(u=>u.sponsor_id && !byId.has(u.sponsor_id));
      while(stack.length){const node=stack.pop();if(visited.has(node.id)) continue;visited.add(node.id);for(const child of children.get(node.id)||[]) stack.push(child);}
      return res.json({nodes:all,integrity_warning:incomplete || visited.size!==all.length});
    }
    const me=byId.get(req.user.id);if(!me) return res.status(404).json({error:'Networker introuvable.'});
    const parent=byId.get(me.sponsor_id);const ancestors=new Set();let ancestor=me.sponsor_id;while(ancestor && !ancestors.has(ancestor) && ancestor!==me.id){ancestors.add(ancestor);ancestor=byId.get(ancestor)?.sponsor_id;}
    const seen=new Set(), stack=[me], nodes=[];let warning=(!!me.sponsor_id && !parent) || ancestor===me.id || (!!ancestor && ancestors.has(ancestor));
    while(stack.length){const node=stack.pop();if(seen.has(node.id)){warning=true;continue;}seen.add(node.id);nodes.push({id:node.id,name:node.name,sponsor_id:node.id===me.id?null:node.sponsor_id});for(const child of children.get(node.id)||[]) {if(ancestors.has(child.id)){warning=true;continue;}stack.push(child);}}
    res.json({nodes,parent:parent ? {name:parent.name} : null,integrity_warning:warning});
  }catch(e){next(e);}});
  app.post('/api/networkers/:id/notes',auth,async(req,res,next)=>{try{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id) || typeof req.body.content!=='string' || !req.body.content.trim() || req.body.content.length>3000) return res.status(400).json({error:'Note requise (3 000 caractères maximum).'});
    const target=(await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[req.params.id])).rows[0];
    if(!target) return res.status(404).json({error:'Networker introuvable.'});
    const note=(await pool.query('INSERT INTO networker_followup_notes (id,networker_id,author_id,content) VALUES ($1,$2,$3,$4) RETURNING id,content,created_at',[randomUUID(),target.id,req.user.id,req.body.content.trim()])).rows[0];
    res.status(201).json({...note,author:req.user.name});
  }catch(e){next(e);}});
  // Goals and their links are administrative; the task itself retains its existing visibility.
  app.post('/api/networkers/:id/goals',auth,async(req,res,next)=>{try{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id) || typeof req.body.title!=='string' || !req.body.title.trim() || req.body.title.length>160) return res.status(400).json({error:'Intitulé de l’objectif requis (160 caractères maximum).'});
    const person=(await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[req.params.id])).rows[0];
    if(!person) return res.status(404).json({error:'Networker introuvable.'});
    const result=await pool.query('INSERT INTO networker_goals (id,networker_id,title,created_by) VALUES ($1,$2,$3,$4) RETURNING id,title,created_at',[randomUUID(),person.id,req.body.title.trim(),req.user.id]);
    res.status(201).json(result.rows[0]);
  }catch(e){next(e);}});
  app.post('/api/networkers/:id/goals/:goalId/tasks',auth,async(req,res,next)=>{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    const {id,goalId}=req.params, {task_id,title}=req.body || {};
    if(!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(goalId) || (task_id ? (typeof task_id!=='string' || !/^[0-9a-f-]{36}$/i.test(task_id) || title!==undefined) : (typeof title!=='string' || !title.trim() || title.length>160))) return res.status(400).json({error:'Tâche invalide.'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const goal=(await client.query('SELECT id FROM networker_goals WHERE id=$1 AND networker_id=$2 FOR UPDATE',[goalId,id])).rows[0];
      const person=(await client.query("SELECT id,role FROM users WHERE id=$1 AND role='networker'",[id])).rows[0];
      if(!goal || !person) {await client.query('ROLLBACK');return res.status(404).json({error:'Objectif ou networker introuvable.'});}
      let taskId=task_id;
      if(taskId){
        const row=(await client.query("SELECT * FROM entries WHERE id=$1 AND section='taches' FOR UPDATE",[taskId])).rows[0];
        const task=row && unpack(row);
        if(!task || !(taskAssigned(task.extra,person) || (!task.extra.audience && task.created_by===person.id))) {await client.query('ROLLBACK');return res.status(400).json({error:'Cette tâche n’est pas attribuée à ce networker.'});}
        const link=(await client.query('SELECT active FROM networker_goal_tasks WHERE goal_id=$1 AND task_id=$2',[goalId,taskId])).rows[0];
        if(link?.active) {await client.query('ROLLBACK');return res.status(409).json({error:'Tâche déjà liée à cet objectif.'});}
      } else {
        taskId=randomUUID();
        const extra=JSON.stringify({priority:'Normale',audience:'Networker spécifique',target:id});
        await client.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[taskId,'taches',title.trim(),'','À faire','','',req.user.id,extra]);
      }
      const restored=await client.query('UPDATE networker_goal_tasks SET active=TRUE WHERE goal_id=$1 AND task_id=$2 RETURNING goal_id',[goalId,taskId]);
      if(!restored.rows.length) await client.query('INSERT INTO networker_goal_tasks (goal_id,task_id) VALUES ($1,$2)',[goalId,taskId]);
      await client.query('COMMIT');res.status(201).json({id:taskId});
    }catch(e){try{await client.query('ROLLBACK');}catch{} if(e.code==='23505') return res.status(409).json({error:'Tâche déjà liée à cet objectif.'});next(e);}finally{client.release();}
  });
  app.put('/api/networkers/:id/goals/:goalId/tasks/:taskId/unlink',auth,async(req,res,next)=>{try{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    if([req.params.id,req.params.goalId,req.params.taskId].some(id=>!/^[0-9a-f-]{36}$/i.test(id))) return res.status(400).json({error:'Identifiant invalide.'});
    const goal=(await pool.query('SELECT id FROM networker_goals WHERE id=$1 AND networker_id=$2',[req.params.goalId,req.params.id])).rows[0];
    if(!goal) return res.status(404).json({error:'Objectif introuvable.'});
    const link=await pool.query('UPDATE networker_goal_tasks SET active=FALSE WHERE goal_id=$1 AND task_id=$2 AND active=TRUE RETURNING task_id',[goal.id,req.params.taskId]);
    if(!link.rows.length) return res.status(404).json({error:'Lien introuvable.'});
    res.json({ok:true});
  }catch(e){next(e);}});
  app.put('/api/networkers/:id/sponsor',auth,async(req,res,next)=>{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    const id=req.params.id, sponsor=req.body.sponsor_id || null, previous=req.body.previous_sponsor_id;
    if(!/^[0-9a-f-]{36}$/i.test(id) || (sponsor && (typeof sponsor!=='string' || !/^[0-9a-f-]{36}$/i.test(sponsor))) || (previous!==undefined && previous!==null && (typeof previous!=='string' || !/^[0-9a-f-]{36}$/i.test(previous)))) return res.status(400).json({error:'Identifiant invalide'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      // Lock in a stable order so simultaneous reparentings cannot validate incompatible graphs.
      const network=(await client.query("SELECT id,role,sponsor_id FROM users ORDER BY id FOR UPDATE")).rows.filter(u=>u.role==='networker');
      const byId=new Map(network.map(u=>[u.id,u])), target=byId.get(id);
      if(!target){await client.query('ROLLBACK');return res.status(404).json({error:'Networker introuvable'});}
      if(target.sponsor_id && sponsor!==target.sponsor_id && previous!==target.sponsor_id){await client.query('ROLLBACK');return res.status(409).json({error:'Confirmez le transfert depuis le parrain actuel et actualisez si nécessaire.'});}
      if(previous!==undefined && previous!==target.sponsor_id){await client.query('ROLLBACK');return res.status(409).json({error:'Le parrain a changé ; actualisez la fiche.'});}
      let current=sponsor;const seen=new Set([id]);
      while(current){if(seen.has(current)){await client.query('ROLLBACK');return res.status(400).json({error:'Cette affectation créerait un cycle de parrainage.'});}seen.add(current);const row=byId.get(current);if(!row){await client.query('ROLLBACK');return res.status(400).json({error:'Parrain invalide'});}current=row.sponsor_id;}
      if(sponsor!==target.sponsor_id) {await client.query('UPDATE users SET sponsor_id=$1 WHERE id=$2',[sponsor,id]);await client.query('INSERT INTO networker_sponsor_history (id,networker_id,old_sponsor_id,new_sponsor_id,actor_id) VALUES ($1,$2,$3,$4,$5)',[randomUUID(),id,target.sponsor_id,sponsor,req.user.id]);}
      await client.query('COMMIT');res.json({ok:true});
    }catch(e){try{await client.query('ROLLBACK');}catch{}next(e);}finally{client.release();}
  });
  app.get('/api/networkers/:id/profile',auth,async(req,res,next)=>{try{
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || !(admin(req.user.role) || req.user.id===req.params.id)) return res.status(403).json({error:'Accès interdit'});
    const person=(await pool.query("SELECT id,name,email,role,created_at,sponsor_id,is_active,is_presenter FROM users WHERE id=$1 AND role='networker'",[req.params.id])).rows[0];
    if(!person) return res.status(404).json({error:'Networker introuvable'});
    const prospects=(await pool.query("SELECT id,title,status,assigned_to,created_by FROM entries WHERE section='prospects'")).rows.filter(p=>p.assigned_to===person.id || (!p.assigned_to && p.created_by===person.id));
    const tasks=(await pool.query("SELECT id,title,status,created_by,extra FROM entries WHERE section='taches'")).rows.map(unpack).filter(t=>taskAssigned(t.extra,person) || (!t.extra.audience && t.created_by===person.id));
    const progress=(await pool.query('SELECT task_id,status FROM task_progress WHERE user_id=$1',[person.id])).rows;const byId=new Map(progress.map(p=>[p.task_id,p.status]));
    const formations=(await pool.query("SELECT a.training_id,a.attended,a.quiz_score,e.title,e.date FROM training_attendance a JOIN entries e ON e.id=a.training_id WHERE a.user_id=$1",[person.id])).rows;
    const network=(await pool.query("SELECT id,name,sponsor_id FROM users WHERE role='networker'")).rows; const sponsor=network.find(p=>p.id===person.sponsor_id) || null; const downlines=network.filter(p=>p.sponsor_id===person.id).map(({id,name})=>({id,name}));
    const additional = {};
    if(admin(req.user.role)) {
      additional.notes=(await pool.query('SELECT n.id,n.content,n.created_at,u.name AS author FROM networker_followup_notes n JOIN users u ON u.id=n.author_id WHERE n.networker_id=$1 ORDER BY n.created_at DESC,n.id DESC',[person.id])).rows;
      const meetings=(await pool.query("SELECT id,title,status,date,created_by,assigned_to,extra FROM entries WHERE section='rendezvous' ORDER BY created_at DESC")).rows.map(unpack);
      additional.meetings=meetings.filter(m=>meetingVisible(m,{...person,is_presenter:presenter(person)})).map(({id,title,status,date})=>({id,title,status,date}));
      additional.orders=(await pool.query('SELECT id,kind,status,created_at FROM commerce_orders WHERE buyer_id=$1 ORDER BY created_at DESC',[person.id])).rows;
      const goals=(await pool.query('SELECT id,title,created_at FROM networker_goals WHERE networker_id=$1 ORDER BY created_at DESC',[person.id])).rows;
      const links=(await pool.query('SELECT goal_id,task_id FROM networker_goal_tasks WHERE active=TRUE')).rows;
      const byTask=new Map(tasks.map(t=>[t.id,{id:t.id,title:t.title,status:byId.get(t.id) || (t.extra.audience ? 'À faire' : t.status)}]));
      additional.goals=goals.map(g=>{const items=links.filter(l=>l.goal_id===g.id).map(l=>byTask.get(l.task_id)).filter(Boolean);const completed=items.filter(t=>t.status==='Terminée').length;return {...g,tasks:items,completed,total:items.length,progress:items.length ? Math.round(completed*100/items.length) : 0};});
    }
    res.json({person,sponsor:sponsor ? {id:sponsor.id,name:sponsor.name} : null,downlines,prospects:prospects.map(({id,title,status})=>({id,title,status})),tasks:tasks.map(t=>({id:t.id,title:t.title,status:byId.get(t.id) || (t.extra.audience ? 'À faire' : t.status)})),formations,...additional});
  }catch(e){next(e);}});
  async function validateCommerce(section, extra, legacy = false) {
    if (section === 'stock') {
      if (!extra.item_type && legacy) return null;
      if (!['Produit','Pack','Option d’achat'].includes(extra.item_type)) return 'Sélectionnez produit, pack ou option d’achat.';
    }
    if (section === 'commandes') {
      if (!extra.pack_id && legacy) return null;
      if (!/^[0-9a-f-]{36}$/i.test(extra.pack_id || '')) return 'Sélectionnez un pack existant.';
      const pack=(await pool.query("SELECT extra FROM entries WHERE id=$1 AND section='stock'",[extra.pack_id])).rows[0];
      if (!pack || JSON.parse(pack.extra || '{}').item_type !== 'Pack') return 'Pack invalide.';
      if (!extra.buyer?.trim() || !extra.payment_method?.trim()) return 'Acheteur et méthode de paiement requis.';
      if (!/^[0-9a-f-]{36}$/i.test(extra.ordered_by || '') || !(await pool.query('SELECT id FROM users WHERE id=$1',[extra.ordered_by])).rows[0]) return 'Sélectionnez le compte qui a passé la commande.';
    }
    return null;
  }
  async function validatePresenter(section, extra, previousPresenter = null) {
    if (section !== 'formations' || !extra.presenter_id || extra.presenter_id === previousPresenter) return null;
    if (!/^[0-9a-f-]{36}$/i.test(extra.presenter_id) || !(await pool.query("SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND (role='presentateur' OR (is_presenter=TRUE AND (role='admin' OR role='networker')))",[extra.presenter_id])).rows[0]) return 'Présentateur invalide';
    return null;
  }
  const validLocalDate = value => { if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return false; const d = new Date(value + ':00Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,16) === value; };
  const meetingTypes = { 'Prospection': ['Premier contact','Présentation','Closing'], 'Networker': ['Suivi','Demande du networker'] };
  async function validateMeeting(body, user, legacy = false, existingKind = "") {
    const x = body.extra;
    const additional = parseAdditionalNetworkers(x.additional_networker_ids);
    if (!additional || additional.some(id => id.toLowerCase() === (x.networker_id || '').toLowerCase())) return 'Liste des networkers supplémentaires invalide.';
    for (const id of additional) if (!(await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[id])).rows[0]) return 'Networker supplémentaire invalide.';
    const otherProspects = parseAdditionalNetworkers(x.additional_prospect_ids);
    if (!otherProspects) return 'Liste des prospects participants invalide.';
    for (const id of otherProspects) if (!(await pool.query("SELECT id FROM entries WHERE id=$1 AND section='prospects'",[id])).rows[0]) return 'Prospect participant introuvable.';
    if (!x.category && legacy) return ['Confirmé','Réalisé'].includes(body.status) && x.request_kind ? 'L’administration doit renseigner la catégorie, le type et la durée.' : null;
    if (x.source === 'site' && x.category !== 'Prospection') return 'Une demande du site est une demande de prospection.';
    // Public requests carry only a preferred start. Administration supplies type and end before confirmation.
    const incompletePublicRequest = x.source === 'site' && ['Demandé','Proposé','Annulé'].includes(body.status);
    if ((!incompletePublicRequest || x.kind) && !(meetingTypes[x.category]?.includes(x.kind) || (x.category === 'Networker' && x.kind === 'Formation' && existingKind === 'Formation'))) return 'Choisissez une catégorie et un type de rendez-vous valides.';
    if (!validLocalDate(body.date) || ((!incompletePublicRequest || x.end_date) && (!validLocalDate(x.end_date) || x.end_date <= body.date || x.end_date.slice(0,10) !== body.date.slice(0,10)))) return 'Indiquez une heure de début et de fin le même jour, la fin après le début.';
    if (x.networker_id || x.source !== 'site') {
      if (!/^[0-9a-f-]{36}$/i.test(x.networker_id || '')) return 'Sélectionnez un networker.';
      const networker = (await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[x.networker_id])).rows[0];
      if (!networker || (user.role === 'networker' && x.networker_id !== user.id)) return 'Networker invalide.';
    }
    if (x.admin_id) { if (!/^[0-9a-f-]{36}$/i.test(x.admin_id)) return 'Administrateur invalide.'; const a=(await pool.query('SELECT role FROM users WHERE id=$1',[x.admin_id])).rows[0]; if (!a || !admin(a.role)) return 'Administrateur invalide.'; }
    if (body.status === 'Confirmé' && !x.admin_id) return 'Sélectionnez l’administrateur qui assiste au rendez-vous.';
    if (x.category === 'Prospection') {
      if (!/^[0-9a-f-]{36}$/i.test(x.prospect_id || '')) return 'Sélectionnez un prospect.';
      const prospect=(await pool.query("SELECT id,created_by,assigned_to FROM entries WHERE id=$1 AND section='prospects'",[x.prospect_id])).rows[0];
      if (!prospect || (user.role === 'networker' && (prospect.assigned_to ? prospect.assigned_to !== x.networker_id : prospect.created_by !== x.networker_id))) return 'Ce prospect ne dépend pas du networker sélectionné.';
    } else if (x.prospect_id) return 'Un rendez-vous networker ne doit pas avoir de prospect.';
    return null;
  }
  const publicAttempts = new Map();
  app.post('/api/public/appointment-requests', async(req,res,next)=>{try{
    // Local/preproduction only; no anonymous endpoint is enabled in production.
    if (!['development','test'].includes(process.env.NODE_ENV) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(publicRequestAdminId)) return res.status(503).json({error:'Les demandes en ligne ne sont pas configurées.'});
    const now=Date.now(); for(const [key,value] of publicAttempts) if(value.until<=now) publicAttempts.delete(key);
    const attempt=publicAttempts.get(req.ip) || {count:0,until:now+60000};
    if(attempt.count>=5) return res.status(429).json({error:'Trop de demandes. Réessayez plus tard.'});
    attempt.count++;publicAttempts.set(req.ip,attempt);
    const {name,phone,email,date,detail,consent}=req.body || {};
    if(typeof name!=='string' || !name.trim() || name.length>160 || typeof phone!=='string' || !phone.trim() || phone.length>100 || typeof email!=='string' || email.length>254 || (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) || typeof detail!=='string' || detail.length>1000 || consent!==true || !validLocalDate(date)) return res.status(400).json({error:'Vérifiez les coordonnées et la date de la demande.'});
    const owner=(await pool.query("SELECT id,name FROM users WHERE id=$1 AND role IN ('admin','superadmin') AND is_active=TRUE",[publicRequestAdminId])).rows[0];
    if(!owner) return res.status(503).json({error:'Les demandes en ligne ne sont pas configurées.'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const prospectId=randomUUID();
      await client.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[prospectId,'prospects',name.trim(),'','', '', '', owner.id,JSON.stringify({phone:phone.trim(),email:email.trim(),interest:'À préciser'}),owner.id]);
      await client.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[randomUUID(),'rendezvous',`Demande de rendez-vous · ${name.trim()}`.slice(0,160),detail.trim(),'Demandé','',date,owner.id,JSON.stringify({source:'site',consent:'oui',category:'Prospection',kind:'',end_date:'',prospect_id:prospectId}),null]);
      await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally {client.release();}
    res.status(201).json({ok:true});
  }catch(e){next(e);}});
  async function meetingConflict(body, excludeId) {
    if (body.status !== 'Confirmé' || !body.extra.category) return false;
    const rows=(await pool.query("SELECT id,date,extra FROM entries WHERE section='rendezvous' AND status='Confirmé'")).rows;
    return rows.some(row=>row.id !== excludeId && row.date && JSON.parse(row.extra || '{}').end_date && row.date < body.extra.end_date && JSON.parse(row.extra).end_date > body.date);
  }
  const meetingVisible = (row, user) => admin(user.role) || (presenter(user) && row.assigned_to === user.id) || (user.role === 'networker' && (row.extra.networker_id === user.id || (parseAdditionalNetworkers(row.extra.additional_networker_ids) || []).includes(user.id) || (!row.extra.networker_id && row.created_by === user.id)));
  app.get('/api/appointments/busy',auth,async(req,res,next)=>{try{
    if (req.user.role !== 'networker') return res.status(403).json({error:'Accès interdit'});
    const result=await pool.query("SELECT id,date,extra,created_by,assigned_to FROM entries WHERE section='rendezvous' AND status='Confirmé'");
    res.json(result.rows.map(unpack).filter(row=>!meetingVisible(row,req.user) && row.date && row.extra.end_date).map(row=>({start:row.date,end:row.extra.end_date})));
  }catch(e){next(e);}});
  app.get('/api/appointments/:id/reports',auth,async(req,res,next)=>{try{
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({error:'Identifiant invalide'});
    const result=await pool.query("SELECT * FROM entries WHERE id=$1 AND section='rendezvous'",[req.params.id]);
    if (!result.rows[0] || !meetingVisible(unpack(result.rows[0]),req.user)) return res.status(404).json({error:'Rendez-vous introuvable'});
    const reports=await pool.query('SELECT r.user_id,r.report,u.name FROM appointment_reports r JOIN users u ON u.id=r.user_id WHERE r.appointment_id=$1',[req.params.id]); res.json(reports.rows);
  }catch(e){next(e);}});
  app.put('/api/appointments/:id/report',auth,async(req,res,next)=>{try{
    const report=req.body.report;
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || typeof report!=='string' || !report.trim() || report.length>3000) return res.status(400).json({error:'Compte rendu requis (3000 caractères maximum).'});
    const result=await pool.query("SELECT * FROM entries WHERE id=$1 AND section='rendezvous'",[req.params.id]); const row=result.rows[0] && unpack(result.rows[0]);
    if (!row || !meetingVisible(row,req.user) || row.status!=='Réalisé' || ![row.extra.networker_id,row.extra.admin_id,row.assigned_to,...(parseAdditionalNetworkers(row.extra.additional_networker_ids) || [])].includes(req.user.id)) return res.status(403).json({error:'Seuls les participants affectés peuvent remplir un compte rendu après la séance.'});
    const updated=await pool.query('UPDATE appointment_reports SET report=$1 WHERE appointment_id=$2 AND user_id=$3 RETURNING appointment_id',[report.trim(),row.id,req.user.id]);
    if (!updated.rows.length) await pool.query('INSERT INTO appointment_reports (appointment_id,user_id,report) VALUES ($1,$2,$3)',[row.id,req.user.id,report.trim()]);
    res.json({ok:true});
  }catch(e){next(e);}});
  app.put('/api/tasks/:id/progress',auth,async(req,res,next)=>{try{
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || !statuses.taches.includes(req.body.status)) return res.status(400).json({error:'Données invalides'});
    const result = await pool.query("SELECT * FROM entries WHERE id=$1 AND section='taches'",[req.params.id]);
    const task = result.rows[0]; if (!task || !(taskAssigned(JSON.parse(task.extra || '{}'),req.user) || (!JSON.parse(task.extra || '{}').audience && task.created_by===req.user.id))) return res.status(404).json({error:'Tâche non affectée'});
    const changed = await pool.query('UPDATE task_progress SET status=$1 WHERE task_id=$2 AND user_id=$3 RETURNING task_id',[req.body.status,task.id,req.user.id]);
    if (!changed.rows.length) await pool.query('INSERT INTO task_progress (task_id,user_id,status) VALUES ($1,$2,$3)',[task.id,req.user.id,req.body.status]);
    res.json({ok:true});
  }catch(e){next(e);}});
  async function visibleProspect(id, user) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !allowed[user.role]?.includes('prospects')) return false;
    const filter = admin(user.role) ? '' : 'AND (assigned_to=$2 OR (assigned_to IS NULL AND created_by=$2))';
    const result = await pool.query(`SELECT id FROM entries WHERE id=$1 AND section='prospects' ${filter}`, admin(user.role) ? [id] : [id,user.id]);
    return !!result.rows[0];
  }
  app.get('/api/prospects/:id/notes',auth,async(req,res,next)=>{try{
    if (!await visibleProspect(req.params.id,req.user)) return res.status(404).json({error:'Prospect introuvable'});
    const result=await pool.query('SELECT n.id,n.content,n.created_at,u.name AS author FROM prospect_notes n JOIN users u ON u.id=n.author_id WHERE n.prospect_id=$1 ORDER BY n.created_at DESC, n.id DESC',[req.params.id]);
    res.json(result.rows);
  }catch(e){next(e);}});
  app.post('/api/prospects/:id/notes',auth,async(req,res,next)=>{try{
    if (!await visibleProspect(req.params.id,req.user)) return res.status(404).json({error:'Prospect introuvable'});
    const content=req.body.content;
    if (typeof content !== 'string' || !content.trim() || content.length > 3000) return res.status(400).json({error:'Saisissez une note de 1 à 3 000 caractères.'});
    const result=await pool.query('INSERT INTO prospect_notes (id,prospect_id,author_id,content) VALUES ($1,$2,$3,$4) RETURNING id,content,created_at',[randomUUID(),req.params.id,req.user.id,content.trim()]);
    res.status(201).json({...result.rows[0],author:req.user.name});
  }catch(e){next(e);}});
  app.get('/api/catalogue/review-notes',auth,(req,res)=>{if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});res.json(productReviewNotes);});
  app.post('/api/catalogue/import',auth,async(req,res,next)=>{
    if(!admin(req.user.role)) return res.status(403).json({error:'Seule l’administration peut importer le catalogue.'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      let created=0;
      for(const product of productCatalogue) {
        const id=catalogueEntryId(product.id);
        if ((await client.query('SELECT id FROM entries WHERE id=$1',[id])).rows.length) continue;
        const extra={item_type:'Produit',image:`/products/${product.id}.${product.id === "3s-capsule" ? "png" : "jpg"}`,contents:`Source : ${product.sourceFile}${product.ingredients ? ` — ${product.ingredients}` : ''}`};
        const result=await client.query("INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING RETURNING id",[id,'stock',product.name,product.description,'Inactif','','',req.user.id,JSON.stringify(extra),null]);
        created+=result.rows.length;
      }
      await client.query('COMMIT');
      res.json({created,existing:productCatalogue.length-created});
    } catch(error) {try {await client.query('ROLLBACK');} catch {} next(error);} finally {client.release();}
  });
  function sectionAccess(req,res,next) { if (!allowed[req.user.role]?.includes(req.params.section)) return res.status(403).json({error:'Accès interdit'}); next(); }
  app.get('/api/entries/:section',auth,sectionAccess,async(req,res,next)=>{try{
    if (req.params.section === 'rendezvous') {
      const result = await pool.query("SELECT id,title,detail,status,owner,date,created_by,extra,assigned_to FROM entries WHERE section='rendezvous' ORDER BY created_at DESC");
      const visible=result.rows.map(unpack).filter(row=>meetingVisible(row,req.user));
      const rows=await Promise.all(visible.map(async row=>{
        const id=row.extra.prospect_id;
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return row;
        const prospect=(await pool.query("SELECT title FROM entries WHERE id=$1 AND section='prospects'",[id])).rows[0];
        return {...row,prospect_name:prospect?.title || null};
      }));
      return res.json(rows);
    }
    if (req.params.section === 'taches') {
      const result = await pool.query("SELECT id,title,detail,status,owner,date,created_by,extra,assigned_to FROM entries WHERE section='taches' ORDER BY created_at DESC");
      const progress = await pool.query('SELECT task_id,status FROM task_progress WHERE user_id=$1',[req.user.id]);
      const byId = new Map(progress.rows.map(row=>[row.task_id,row.status]));
      const rows = result.rows.map(unpack).filter(row=>admin(req.user.role) || (row.extra.audience ? taskAssigned(row.extra,req.user) : row.created_by === req.user.id)).map(row=>{const assigned=row.extra.audience ? taskAssigned(row.extra,req.user) : row.created_by === req.user.id; return {...row,can_progress:assigned,my_status:assigned ? (byId.get(row.id) || (row.extra.audience ? 'À faire' : row.status)) : null};});
      return res.json(rows);
    }
    // Administrators see all; regular users see their own work and shared resources.
    const unrestricted = admin(req.user.role) || ['formations','ressources'].includes(req.params.section);
    const filter = unrestricted ? '' : req.params.section === 'prospects' ? 'AND (assigned_to=$2 OR (assigned_to IS NULL AND created_by=$2))' : req.user.role === 'presentateur' && req.params.section === 'rendezvous' ? 'AND assigned_to=$2' : 'AND created_by=$2';
    const result=await pool.query(`SELECT id,title,detail,status,owner,date,created_by,extra,assigned_to FROM entries WHERE section=$1 ${filter} ORDER BY created_at DESC`, unrestricted ? [req.params.section] : [req.params.section,req.user.id]); res.json(result.rows.map(unpack));
  }catch(e){next(e);}});
  const validate = (section, body) => typeof body.title==='string' && body.title.trim().length>0 && body.title.length<=160 && typeof body.detail==='string' && body.detail.length<=1000 && typeof body.owner==='string' && body.owner.length<=160 && typeof body.date==='string' && body.date.length<=32 && statuses[section]?.includes(body.status);
  app.post('/api/appointment-requests', auth, async(req,res,next)=>{try{
    if(req.user.role !== 'networker') return res.status(403).json({error:'Réservé aux networkers.'});
    const {title,detail,date,request_kind,networker_ids,prospect_ids,new_prospects}=req.body || {};
    if(typeof title!=='string' || !title.trim() || title.length>160 || typeof detail!=='string' || detail.length>1000 || !validLocalDate(date) || !['Présentation','Closing','Premier contact','Suivi'].includes(request_kind) || !Array.isArray(networker_ids) || !Array.isArray(prospect_ids) || !Array.isArray(new_prospects) || new_prospects.length>10 || prospect_ids.length+new_prospects.length>10) return res.status(400).json({error:'Vérifiez la demande et les participants.'});
    const networkers=parseAdditionalNetworkers(JSON.stringify(networker_ids)), prospects=parseAdditionalNetworkers(JSON.stringify(prospect_ids));
    if(!networkers || !prospects || networkers.includes(req.user.id.toLowerCase())) return res.status(400).json({error:'Participants invalides ou en double.'});
    for(const id of networkers) if(!(await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker' AND is_active=TRUE",[id])).rows[0]) return res.status(400).json({error:'Networker participant invalide.'});
    for(const id of prospects) {const p=(await pool.query("SELECT id,assigned_to,created_by FROM entries WHERE id=$1 AND section='prospects'",[id])).rows[0];if(!p || (p.assigned_to || p.created_by)!==req.user.id) return res.status(400).json({error:'Prospect participant inaccessible.'});}
    for(const p of new_prospects) if(!p || typeof p.name!=='string' || !p.name.trim() || p.name.length>160 || typeof p.phone!=='string' || !p.phone.trim() || p.phone.length>100 || typeof p.email!=='string' || p.email.length>254 || (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))) return res.status(400).json({error:'Nom et téléphone requis pour chaque nouveau prospect ; e-mail facultatif valide.'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const allProspects=[...prospects];
      for(const p of new_prospects) {const id=randomUUID();await client.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,'prospects',p.name.trim(),'','','','',req.user.id,JSON.stringify({phone:p.phone.trim(),email:p.email.trim(),interest:'À préciser'}),req.user.id]);allProspects.push(id);}
      const extra={request_kind,networker_id:req.user.id,additional_networker_ids:JSON.stringify(networkers),additional_prospect_ids:JSON.stringify(allProspects),category:'',kind:'',end_date:''};
      const result=await client.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,title,detail,status,owner,date,created_by,extra,assigned_to',[randomUUID(),'rendezvous',title.trim(),detail.trim(),'Demandé','',date,req.user.id,JSON.stringify(extra),null]);
      await client.query('COMMIT'); return res.status(201).json(unpack(result.rows[0]));
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }catch(e){next(e);}});
  app.post('/api/entries/:section',auth,sectionAccess,async(req,res,next)=>{try{
    const section=req.params.section;
    if (section === 'rendezvous' && (req.body.extra?.source || req.body.extra?.consent)) return res.status(400).json({error:'Origine invalide.'});
    if (section === 'taches' && !admin(req.user.role)) return res.status(403).json({error:'Seule l’administration peut créer des tâches.'});
    if (section === 'rendezvous' && req.user.role === 'networker') return res.status(403).json({error:'Utilisez le formulaire de demande de rendez-vous.'});
    if (section === 'rendezvous' && req.user.role === 'presentateur') return res.status(403).json({error:'Les séances sont organisées par l’administration.'});
    if (!admin(req.user.role) && ['formations','ressources'].includes(section)) return res.status(403).json({error:'Accès en lecture seule'});
    if (!validate(section,req.body)) return res.status(400).json({error:'Données invalides'});
    const extraError = validateExtra(section, req.body.extra); if (extraError) return res.status(400).json({error:extraError});
    if (section === 'prospects' && req.body.status === 'Sans commande' && !req.body.extra.refusal_reason?.trim()) return res.status(400).json({error:'Indiquez le motif du refus.'});
    if (section === 'formations' && !req.body.extra.presenter_id) return res.status(400).json({error:'Sélectionnez un présentateur.'});
    const commerceError=await validateCommerce(section,req.body.extra); if(commerceError) return res.status(400).json({error:commerceError});
    const presenterError=await validatePresenter(section,req.body.extra); if(presenterError) return res.status(400).json({error:presenterError});
    if (section === 'taches') {const problem = await taskValidation(req.body.extra); if (problem) return res.status(400).json({error:problem});}
    if (section === 'rendezvous' && !admin(req.user.role) && req.body.status !== 'Demandé') return res.status(403).json({error:'Un rendez-vous doit être demandé à l’administration.'});
    if (section === 'rendezvous') {if(req.user.role==='networker') {req.body.extra.networker_id=req.user.id;} const problem=await validateMeeting(req.body,req.user); if(problem) return res.status(400).json({error:problem});}
    const assigned = section === 'prospects' && req.user.role === 'networker' ? req.user.id : (req.body.assigned_to || null);
    if (section === 'prospects' && !assigned) return res.status(400).json({error:'Sélectionnez le membre ayant contacté le prospect.'});
    if (assigned && (!/^[0-9a-f-]{36}$/i.test(assigned) || !['prospects','rendezvous'].includes(section) || (section === 'rendezvous' && !admin(req.user.role)) || !(await pool.query(section === 'prospects' ? 'SELECT id FROM users WHERE id=$1' : "SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND (role='presentateur' OR (is_presenter=TRUE AND (role='admin' OR role='networker')))", [assigned])).rows[0])) return res.status(400).json({error:'Compte affecté invalide'});
    if (section === 'rendezvous' && await meetingConflict(req.body,null)) return res.status(409).json({error:'Ce créneau est déjà réservé.'});
    const {title,detail,status,owner,date,extra}=req.body;
    const result=await pool.query('INSERT INTO entries (id,section,title,detail,status,owner,date,created_by,extra,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,title,detail,status,owner,date,created_by,extra,assigned_to',[randomUUID(),section,title.trim(),detail,status,owner,date,req.user.id,JSON.stringify(extra),assigned]);res.status(201).json(unpack(result.rows[0]));
  }catch(e){next(e);}});
  app.put('/api/entries/:section/:id',auth,sectionAccess,async(req,res,next)=>{try{
    const section=req.params.section;
    if (!admin(req.user.role) && ['formations','ressources','taches'].includes(section)) return res.status(403).json({error:'Accès en lecture seule'});
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || !validate(section,req.body)) return res.status(400).json({error:'Données invalides'});
    const filter = admin(req.user.role) ? '' : section === 'prospects' ? 'AND (assigned_to=$3 OR (assigned_to IS NULL AND created_by=$3))' : 'AND created_by=$3';
    const existing = await pool.query(`SELECT * FROM entries WHERE id=$1 AND section=$2 ${filter}`, [req.params.id,section,...(admin(req.user.role)?[]:[req.user.id])]);
    if (!existing.rows[0]) return res.status(404).json({error:'Élément introuvable'});
    const previous = existing.rows[0];
    if (section === 'rendezvous' && !admin(req.user.role) && (req.user.role !== 'networker' || !['Demandé','Annulé'].includes(req.body.status) || !['Demandé','Annulé'].includes(previous.status))) return res.status(403).json({error:'Seule l’administration peut fixer ou confirmer un rendez-vous.'});
    if (section === 'rendezvous' && req.user.role === 'networker') { const before=JSON.parse(previous.extra || '{}'); if (req.body.title !== previous.title || req.body.detail !== previous.detail || req.body.owner !== previous.owner || req.body.date !== previous.date || JSON.stringify(req.body.extra) !== JSON.stringify(before)) return res.status(403).json({error:'Seule l’administration peut modifier la demande.'}); }
    const extra = req.body.extra ?? JSON.parse(previous.extra || '{}');
    if (section === 'rendezvous' && ((extra.source || '') !== (JSON.parse(previous.extra || '{}').source || '') || (extra.consent || '') !== (JSON.parse(previous.extra || '{}').consent || ''))) return res.status(400).json({error:'L’origine de la demande ne peut pas être modifiée.'});
    // Legacy entries remain editable; structured entries are fully validated.
    const isIncompletePublicRequest = section === 'rendezvous' && (extra.source === 'site' || extra.request_kind) && ['Demandé','Proposé','Annulé'].includes(req.body.status);
    const extraError = validateExtra(section,extra,{required:!isIncompletePublicRequest && (Object.keys(JSON.parse(previous.extra || '{}')).length > 0 || Object.keys(extra).length > 0)});
    if (extraError) return res.status(400).json({error:extraError});
    if (section === 'prospects' && req.body.status === 'Sans commande' && !extra.refusal_reason?.trim() && (previous.status !== 'Sans commande' || JSON.parse(previous.extra || '{}').refusal_reason?.trim())) return res.status(400).json({error:'Indiquez le motif du refus.'});
    const commerceError=await validateCommerce(section,extra,!JSON.parse(previous.extra || '{}').item_type && !JSON.parse(previous.extra || '{}').pack_id && !extra.item_type && !extra.pack_id); if(commerceError) return res.status(400).json({error:commerceError});
    if (section==='stock' && extra.item_type!=='Produit' && (await pool.query('SELECT id FROM commerce_variants WHERE product_id=$1',[req.params.id])).rows.length) return res.status(409).json({error:'Ce produit possède des références de stock ; son type ne peut pas être modifié.'});
    if (section==='stock' && JSON.parse(previous.extra || '{}').item_type==='Pack' && extra.item_type!=='Pack') {const orders=(await pool.query("SELECT extra FROM entries WHERE section='commandes'")).rows; if(orders.some(o=>JSON.parse(o.extra||'{}').pack_id===previous.id)) return res.status(409).json({error:'Ce pack est utilisé dans une commande.'});}
    const presenterError=await validatePresenter(section,extra,JSON.parse(previous.extra || '{}').presenter_id); if(presenterError) return res.status(400).json({error:presenterError});
    if (section === 'formations' && JSON.parse(previous.extra || '{}').presenter_id && !extra.presenter_id) return res.status(400).json({error:'Présentateur requis'});
    if (section === 'rendezvous' && !admin(req.user.role)) { extra.networker_id=previous.extra ? JSON.parse(previous.extra).networker_id : req.user.id;  }
    if (section === 'rendezvous') {const problem=await validateMeeting({...req.body,extra},req.user,!JSON.parse(previous.extra || '{}').category && !extra.category,JSON.parse(previous.extra || '{}').kind || ''); if(problem) return res.status(400).json({error:problem});}
    if (section === 'taches' && (await pool.query('SELECT goal_id FROM networker_goal_tasks WHERE task_id=$1',[previous.id])).rows.length && (extra.audience !== JSON.parse(previous.extra || '{}').audience || extra.target !== JSON.parse(previous.extra || '{}').target)) return res.status(409).json({error:'Une tâche liée à un objectif ne peut pas changer de destinataire.'});
    if (section === 'taches' && JSON.parse(previous.extra || '{}').audience && (extra.audience !== JSON.parse(previous.extra).audience || extra.target !== JSON.parse(previous.extra).target)) return res.status(400).json({error:'Les destinataires ne peuvent pas être modifiés ; créez une nouvelle tâche.'});
    if (section === 'taches' && extra.audience) {const problem = await taskValidation(extra); if (problem) return res.status(400).json({error:problem});}
    if (section === 'rendezvous' && await meetingConflict({...req.body,extra},req.params.id)) return res.status(409).json({error:'Ce créneau est déjà réservé.'});
    const assigned = admin(req.user.role) && ['rendezvous','prospects'].includes(section) ? (req.body.assigned_to === '' ? null : (req.body.assigned_to ?? previous.assigned_to)) : previous.assigned_to;
    if (section === 'prospects' && previous.assigned_to && !assigned) return res.status(400).json({error:'Le membre ayant contacté le prospect est requis.'});
    if (assigned && (section !== 'rendezvous' || assigned !== previous.assigned_to) && (!/^[0-9a-f-]{36}$/i.test(assigned) || !(await pool.query(section === 'prospects' ? 'SELECT id FROM users WHERE id=$1' : "SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND (role='presentateur' OR (is_presenter=TRUE AND (role='admin' OR role='networker')))", [assigned])).rows[0])) return res.status(400).json({error:'Compte affecté invalide'});
    const {title,detail,status,owner,date}=req.body;
    const result=await pool.query(`UPDATE entries SET title=$1,detail=$2,status=$3,owner=$4,date=$5,extra=$6,assigned_to=$7,updated_at=NOW() WHERE id=$8 AND section=$9 ${admin(req.user.role)?'': section === 'prospects' ? 'AND (assigned_to=$10 OR (assigned_to IS NULL AND created_by=$10))' : 'AND created_by=$10'} RETURNING id,title,detail,status,owner,date,created_by,extra,assigned_to`, [title.trim(),detail,status,owner,date,JSON.stringify(extra),assigned,req.params.id,section,...(admin(req.user.role)?[]:[req.user.id])]); if(!result.rows[0]) return res.status(404).json({error:'Élément introuvable'}); res.json(unpack(result.rows[0]));
  }catch(e){next(e);}});
  app.delete('/api/entries/:section/:id',auth,sectionAccess,async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({error:'Identifiant invalide'});
    if(req.params.section === 'prospects' && !admin(req.user.role)) return res.status(403).json({error:'Seul un administrateur peut supprimer un prospect.'});
    if(req.params.section === 'rendezvous' && !admin(req.user.role)) return res.status(403).json({error:'Seul un administrateur peut supprimer un rendez-vous.'});
    if(!admin(req.user.role) && ['formations','ressources','taches'].includes(req.params.section)) return res.status(403).json({error:'Accès en lecture seule'});
    if(req.params.section==='taches' && (await pool.query('SELECT goal_id FROM networker_goal_tasks WHERE task_id=$1',[req.params.id])).rows.length) return res.status(409).json({error:'Cette tâche est liée à un objectif et ne peut pas être supprimée.'});
    if(req.params.section==='prospects' && (await pool.query('SELECT id FROM prospect_notes WHERE prospect_id=$1',[req.params.id])).rows.length) return res.status(409).json({error:'Ce prospect possède des notes et ne peut pas être supprimé.'});
    if(req.params.section==='prospects' && (await pool.query('SELECT id FROM commerce_consumer_orders WHERE prospect_id=$1',[req.params.id])).rows.length) return res.status(409).json({error:'Ce prospect est lié à une commande consommateur.'});
    if(req.params.section==='prospects') {const meetings=(await pool.query("SELECT extra FROM entries WHERE section='rendezvous'")).rows; if(meetings.some(m=>{const x=JSON.parse(m.extra||'{}');return x.prospect_id===req.params.id || (parseAdditionalNetworkers(x.additional_prospect_ids)||[]).includes(req.params.id.toLowerCase());})) return res.status(409).json({error:'Ce prospect est lié à un rendez-vous.'});}
    if(req.params.section==='stock' && (await pool.query('SELECT id FROM commerce_variants WHERE product_id=$1',[req.params.id])).rows.length) return res.status(409).json({error:'Ce produit possède des références de stock et ne peut pas être supprimé.'});
    if(req.params.section==='stock') {const orders=(await pool.query("SELECT extra FROM entries WHERE section='commandes'")).rows; if(orders.some(o=>JSON.parse(o.extra||'{}').pack_id===req.params.id)) return res.status(409).json({error:'Ce pack est utilisé dans une commande.'});}
    const result=await pool.query(`DELETE FROM entries WHERE id=$1 AND section=$2 ${admin(req.user.role)?'':'AND created_by=$3'} RETURNING id`,[req.params.id,req.params.section,...(admin(req.user.role)?[]:[req.user.id])]); if(!result.rows[0]) return res.status(404).json({error:'Élément introuvable'}); res.json({ok:true});
  }catch(e){next(e);}});
  app.get('/api/analytics',auth,async(req,res,next)=>{try{if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const entries=await pool.query("SELECT section,status,COUNT(*)::int AS count FROM entries WHERE section <> 'ressources' GROUP BY section,status ORDER BY section,status"); const users=await pool.query('SELECT role,COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role');res.json({entries:entries.rows,users:users.rows});}catch(e){next(e);}});
  app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Erreur serveur'});});
  return app;
}
