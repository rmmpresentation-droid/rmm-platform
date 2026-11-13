import express from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { sectionNames, statuses } from '../src/lib/local-workspace.mjs';
import { validateExtra } from '../src/lib/business-fields.mjs';

const roles = ['superadmin', 'admin', 'presentateur', 'networker'];
const availableSections = sectionNames.filter(section => section !== 'ressources');
const allowed = { superadmin: availableSections, admin: availableSections, presentateur: ['rendezvous', 'formations'], networker: ['prospects', 'taches', 'rendezvous', 'formations'] };
const admin = (role) => role === 'admin' || role === 'superadmin';
const hash = (token) => createHash('sha256').update(token).digest('hex');
const cookieToken = (req) => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('rmm_session='))?.slice(12);
const sessionCookie = (token, maxAge) => `rmm_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export async function initialize(pool, email, password) {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS entries (id UUID PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES users(id)');
  // Additive migration: preserve existing entries and keep their extra fields empty.
  await pool.query("ALTER TABLE entries ADD COLUMN IF NOT EXISTS extra TEXT NOT NULL DEFAULT '{}'");
  await pool.query('ALTER TABLE entries ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id)');
  await pool.query('CREATE TABLE IF NOT EXISTS prospect_notes (id UUID PRIMARY KEY, prospect_id UUID NOT NULL REFERENCES entries(id), author_id UUID NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await pool.query('CREATE TABLE IF NOT EXISTS task_progress (task_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL, PRIMARY KEY (task_id,user_id))');
  await pool.query('CREATE TABLE IF NOT EXISTS appointment_reports (appointment_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, report TEXT NOT NULL, PRIMARY KEY (appointment_id,user_id))');
  await pool.query('CREATE TABLE IF NOT EXISTS training_attendance (training_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, attended BOOLEAN NOT NULL, quiz_score TEXT NOT NULL DEFAULT \'\', PRIMARY KEY (training_id,user_id))');
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
    const {email,name,role,password}=req.body;
    if(req.user.role !== 'superadmin' && !(req.user.role === 'admin' && role === 'presentateur')) return res.status(403).json({error:'Accès interdit'});
    if(typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof name !== 'string' || !name.trim() || name.length > 100 || !roles.includes(role) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({error:'Nom, email valide, rôle et mot de passe de 12 caractères minimum requis.'});
    const result=await pool.query('INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,created_at',[randomUUID(),email.trim().toLowerCase(),name.trim(),role,await bcrypt.hash(password,12)]); res.status(201).json(result.rows[0]);
  } catch(e){ if(e.code==='23505') return res.status(409).json({error:'Email déjà utilisé'}); next(e); } });
  app.get('/api/presenters', auth, async(req,res,next)=>{ try { if (!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const result = await pool.query("SELECT id,name FROM users WHERE role='presentateur' ORDER BY name"); res.json(result.rows); } catch(e){next(e);} });
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
    if(!training || !(admin(req.user.role) || training.extra.presenter_id === req.user.id)) return res.status(403).json({error:'Accès interdit'});
    const rows=await pool.query('SELECT a.user_id,a.attended,a.quiz_score,u.name FROM training_attendance a JOIN users u ON u.id=a.user_id WHERE a.training_id=$1',[req.params.id]);res.json(rows.rows);
  }catch(e){next(e);}});
  app.put('/api/trainings/:id/attendance/:userId',auth,async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id) || !/^[0-9a-f-]{36}$/i.test(req.params.userId) || typeof req.body.attended!=='boolean' || typeof req.body.quiz_score!=='string' || req.body.quiz_score.length>40) return res.status(400).json({error:'Données invalides'});
    const result=await pool.query("SELECT * FROM entries WHERE id=$1 AND section='formations'",[req.params.id]);const training=result.rows[0] && unpack(result.rows[0]);
    if(!training || !(admin(req.user.role) || (req.user.role==='presentateur' && training.extra.presenter_id===req.user.id))) return res.status(403).json({error:'Accès interdit'});
    if(training.status !== 'Terminée') return res.status(400).json({error:'Enregistrez les présences après la formation terminée.'});
    const target=await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[req.params.userId]);if(!target.rows.length) return res.status(400).json({error:'Networker invalide'});
    const old=await pool.query('SELECT quiz_score FROM training_attendance WHERE training_id=$1 AND user_id=$2',[req.params.id,req.params.userId]);
    const score=admin(req.user.role) ? req.body.quiz_score.trim() : (old.rows[0]?.quiz_score || '');
    const update=await pool.query('UPDATE training_attendance SET attended=$1,quiz_score=$2 WHERE training_id=$3 AND user_id=$4 RETURNING user_id',[req.body.attended,score,req.params.id,req.params.userId]);
    if (!update.rows.length) await pool.query('INSERT INTO training_attendance (training_id,user_id,attended,quiz_score) VALUES ($1,$2,$3,$4)',[req.params.id,req.params.userId,req.body.attended,score]);
    res.json({ok:true});
  }catch(e){next(e);}});
  app.put('/api/networkers/:id/sponsor',auth,async(req,res,next)=>{try{
    if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'});
    const id=req.params.id, sponsor=req.body.sponsor_id || null;
    if(!/^[0-9a-f-]{36}$/i.test(id) || (sponsor && !/^[0-9a-f-]{36}$/i.test(sponsor))) return res.status(400).json({error:'Identifiant invalide'});
    const target=(await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[id])).rows[0]; if(!target) return res.status(404).json({error:'Networker introuvable'});
    let current=sponsor; const seen=new Set([id]);
    while(current) {if(seen.has(current)) return res.status(400).json({error:'Cette affectation créerait un cycle de parrainage.'});seen.add(current);const row=(await pool.query("SELECT sponsor_id FROM users WHERE id=$1 AND role='networker'",[current])).rows[0];if(!row) return res.status(400).json({error:'Parrain invalide'});current=row.sponsor_id;}
    await pool.query('UPDATE users SET sponsor_id=$1 WHERE id=$2',[sponsor,id]);res.json({ok:true});
  }catch(e){next(e);}});
  app.get('/api/networkers/:id/profile',auth,async(req,res,next)=>{try{
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id) || !(admin(req.user.role) || req.user.id===req.params.id)) return res.status(403).json({error:'Accès interdit'});
    const person=(await pool.query("SELECT id,name,email,role,created_at,sponsor_id FROM users WHERE id=$1 AND role='networker'",[req.params.id])).rows[0];
    if(!person) return res.status(404).json({error:'Networker introuvable'});
    const prospects=(await pool.query("SELECT id,title,status,assigned_to,created_by FROM entries WHERE section='prospects'")).rows.filter(p=>p.assigned_to===person.id || (!p.assigned_to && p.created_by===person.id));
    const tasks=(await pool.query("SELECT id,title,status,created_by,extra FROM entries WHERE section='taches'")).rows.map(unpack).filter(t=>taskAssigned(t.extra,person) || (!t.extra.audience && t.created_by===person.id));
    const progress=(await pool.query('SELECT task_id,status FROM task_progress WHERE user_id=$1',[person.id])).rows;const byId=new Map(progress.map(p=>[p.task_id,p.status]));
    const formations=(await pool.query("SELECT a.training_id,a.attended,a.quiz_score,e.title,e.date FROM training_attendance a JOIN entries e ON e.id=a.training_id WHERE a.user_id=$1",[person.id])).rows;
    const network=(await pool.query("SELECT id,name,sponsor_id FROM users WHERE role='networker'")).rows; const sponsor=network.find(p=>p.id===person.sponsor_id) || null; const downlines=network.filter(p=>p.sponsor_id===person.id).map(({id,name})=>({id,name}));
    res.json({person,sponsor:sponsor ? {id:sponsor.id,name:sponsor.name} : null,downlines,prospects:prospects.map(({id,title,status})=>({id,title,status})),tasks:tasks.map(t=>({id:t.id,title:t.title,status:byId.get(t.id) || (t.extra.audience ? 'À faire' : t.status)})),formations});
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
  async function validatePresenter(section, extra) {
    if (section !== 'formations' || !extra.presenter_id) return null;
    if (!/^[0-9a-f-]{36}$/i.test(extra.presenter_id) || !(await pool.query("SELECT id FROM users WHERE id=$1 AND role='presentateur'",[extra.presenter_id])).rows[0]) return 'Présentateur invalide';
    return null;
  }
  const validLocalDate = value => { if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return false; const d = new Date(value + ':00Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,16) === value; };
  const meetingTypes = { 'Prospection': ['Premier contact','Présentation','Closing'], 'Networker': ['Formation','Suivi','Demande du networker'] };
  async function validateMeeting(body, user, legacy = false) {
    const x = body.extra;
    if (!x.category && legacy) return null;
    if (!meetingTypes[x.category]?.includes(x.kind)) return 'Choisissez une catégorie et un type de rendez-vous valides.';
    if (!validLocalDate(body.date) || !validLocalDate(x.end_date) || x.end_date <= body.date || x.end_date.slice(0,10) !== body.date.slice(0,10)) return 'Indiquez une heure de début et de fin le même jour, la fin après le début.';
    if (!/^[0-9a-f-]{36}$/i.test(x.networker_id || '')) return 'Sélectionnez un networker.';
    const networker = (await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'",[x.networker_id])).rows[0];
    if (!networker || (user.role === 'networker' && x.networker_id !== user.id)) return 'Networker invalide.';
    if (x.admin_id) { if (!/^[0-9a-f-]{36}$/i.test(x.admin_id)) return 'Administrateur invalide.'; const a=(await pool.query('SELECT role FROM users WHERE id=$1',[x.admin_id])).rows[0]; if (!a || !admin(a.role)) return 'Administrateur invalide.'; }
    if (body.status === 'Confirmé' && !x.admin_id) return 'Sélectionnez l’administrateur qui assiste au rendez-vous.';
    if (x.category === 'Prospection') {
      if (!/^[0-9a-f-]{36}$/i.test(x.prospect_id || '')) return 'Sélectionnez un prospect.';
      const prospect=(await pool.query("SELECT id,created_by,assigned_to FROM entries WHERE id=$1 AND section='prospects'",[x.prospect_id])).rows[0];
      if (!prospect || (user.role === 'networker' && (prospect.assigned_to ? prospect.assigned_to !== x.networker_id : prospect.created_by !== x.networker_id))) return 'Ce prospect ne dépend pas du networker sélectionné.';
    } else if (x.prospect_id) return 'Un rendez-vous networker ne doit pas avoir de prospect.';
    return null;
  }
  async function meetingConflict(body, excludeId) {
    if (body.status !== 'Confirmé' || !body.extra.category) return false;
    const rows=(await pool.query("SELECT id,date,extra FROM entries WHERE section='rendezvous' AND status='Confirmé'")).rows;
    return rows.some(row=>row.id !== excludeId && row.date && JSON.parse(row.extra || '{}').end_date && row.date < body.extra.end_date && JSON.parse(row.extra).end_date > body.date);
  }
  const meetingVisible = (row, user) => admin(user.role) || (user.role === 'presentateur' && row.assigned_to === user.id) || (user.role === 'networker' && (row.extra.networker_id === user.id || (!row.extra.networker_id && row.created_by === user.id)));
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
    if (!row || row.status!=='Réalisé' || ![row.extra.networker_id,row.extra.admin_id,row.assigned_to].includes(req.user.id)) return res.status(403).json({error:'Seuls les participants affectés peuvent remplir un compte rendu après la séance.'});
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
  function sectionAccess(req,res,next) { if (!allowed[req.user.role]?.includes(req.params.section)) return res.status(403).json({error:'Accès interdit'}); next(); }
  app.get('/api/entries/:section',auth,sectionAccess,async(req,res,next)=>{try{
    if (req.params.section === 'rendezvous' && !admin(req.user.role)) {
      const result = await pool.query("SELECT id,title,detail,status,owner,date,created_by,extra,assigned_to FROM entries WHERE section='rendezvous' ORDER BY created_at DESC");
      return res.json(result.rows.map(unpack).filter(row=>meetingVisible(row,req.user)));
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
  app.post('/api/entries/:section',auth,sectionAccess,async(req,res,next)=>{try{
    const section=req.params.section;
    if (section === 'taches' && !admin(req.user.role)) return res.status(403).json({error:'Seule l’administration peut créer des tâches.'});
    if (section === 'rendezvous' && req.user.role === 'presentateur') return res.status(403).json({error:'Les séances sont organisées par l’administration.'});
    if (!admin(req.user.role) && ['formations','ressources'].includes(section)) return res.status(403).json({error:'Accès en lecture seule'});
    if (!validate(section,req.body)) return res.status(400).json({error:'Données invalides'});
    const extraError = validateExtra(section, req.body.extra); if (extraError) return res.status(400).json({error:extraError});
    if (section === 'formations' && !req.body.extra.presenter_id) return res.status(400).json({error:'Sélectionnez un présentateur.'});
    const commerceError=await validateCommerce(section,req.body.extra); if(commerceError) return res.status(400).json({error:commerceError});
    const presenterError=await validatePresenter(section,req.body.extra); if(presenterError) return res.status(400).json({error:presenterError});
    if (section === 'taches') {const problem = await taskValidation(req.body.extra); if (problem) return res.status(400).json({error:problem});}
    if (section === 'rendezvous' && !admin(req.user.role) && req.body.status !== 'Demandé') return res.status(403).json({error:'Un rendez-vous doit être demandé à l’administration.'});
    if (section === 'rendezvous') {if(req.user.role==='networker') {req.body.extra.networker_id=req.user.id; req.body.extra.admin_id='';} const problem=await validateMeeting(req.body,req.user); if(problem) return res.status(400).json({error:problem});}
    const assigned = section === 'prospects' && req.user.role === 'networker' ? req.user.id : (req.body.assigned_to || null);
    if (section === 'prospects' && !assigned) return res.status(400).json({error:'Sélectionnez le membre ayant contacté le prospect.'});
    if (assigned && (!/^[0-9a-f-]{36}$/i.test(assigned) || !['prospects','rendezvous'].includes(section) || (section === 'rendezvous' && !admin(req.user.role)) || !(await pool.query(section === 'prospects' ? 'SELECT id FROM users WHERE id=$1' : "SELECT id FROM users WHERE id=$1 AND role='presentateur'", [assigned])).rows[0])) return res.status(400).json({error:'Compte affecté invalide'});
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
    const extra = req.body.extra ?? JSON.parse(previous.extra || '{}');
    // Legacy entries remain editable; structured entries are fully validated.
    const extraError = validateExtra(section,extra,{required:Object.keys(JSON.parse(previous.extra || '{}')).length > 0 || Object.keys(extra).length > 0});
    if (extraError) return res.status(400).json({error:extraError});
    const commerceError=await validateCommerce(section,extra,!JSON.parse(previous.extra || '{}').item_type && !JSON.parse(previous.extra || '{}').pack_id && !extra.item_type && !extra.pack_id); if(commerceError) return res.status(400).json({error:commerceError});
    if (section==='stock' && JSON.parse(previous.extra || '{}').item_type==='Pack' && extra.item_type!=='Pack') {const orders=(await pool.query("SELECT extra FROM entries WHERE section='commandes'")).rows; if(orders.some(o=>JSON.parse(o.extra||'{}').pack_id===previous.id)) return res.status(409).json({error:'Ce pack est utilisé dans une commande.'});}
    const presenterError=await validatePresenter(section,extra); if(presenterError) return res.status(400).json({error:presenterError});
    if (section === 'formations' && JSON.parse(previous.extra || '{}').presenter_id && !extra.presenter_id) return res.status(400).json({error:'Présentateur requis'});
    if (section === 'rendezvous' && !admin(req.user.role)) { extra.networker_id=previous.extra ? JSON.parse(previous.extra).networker_id : req.user.id; extra.admin_id=JSON.parse(previous.extra || '{}').admin_id || ''; }
    if (section === 'rendezvous') {const problem=await validateMeeting({...req.body,extra},req.user,!JSON.parse(previous.extra || '{}').category && !extra.category); if(problem) return res.status(400).json({error:problem});}
    if (section === 'taches' && JSON.parse(previous.extra || '{}').audience && (extra.audience !== JSON.parse(previous.extra).audience || extra.target !== JSON.parse(previous.extra).target)) return res.status(400).json({error:'Les destinataires ne peuvent pas être modifiés ; créez une nouvelle tâche.'});
    if (section === 'taches' && extra.audience) {const problem = await taskValidation(extra); if (problem) return res.status(400).json({error:problem});}
    if (section === 'rendezvous' && await meetingConflict({...req.body,extra},req.params.id)) return res.status(409).json({error:'Ce créneau est déjà réservé.'});
    const assigned = admin(req.user.role) && ['rendezvous','prospects'].includes(section) ? (req.body.assigned_to === '' ? null : (req.body.assigned_to ?? previous.assigned_to)) : previous.assigned_to;
    if (section === 'prospects' && previous.assigned_to && !assigned) return res.status(400).json({error:'Le membre ayant contacté le prospect est requis.'});
    if (assigned && (!/^[0-9a-f-]{36}$/i.test(assigned) || !(await pool.query(section === 'prospects' ? 'SELECT id FROM users WHERE id=$1' : "SELECT id FROM users WHERE id=$1 AND role='presentateur'", [assigned])).rows[0])) return res.status(400).json({error:'Compte affecté invalide'});
    const {title,detail,status,owner,date}=req.body;
    const result=await pool.query(`UPDATE entries SET title=$1,detail=$2,status=$3,owner=$4,date=$5,extra=$6,assigned_to=$7,updated_at=NOW() WHERE id=$8 AND section=$9 ${admin(req.user.role)?'': section === 'prospects' ? 'AND (assigned_to=$10 OR (assigned_to IS NULL AND created_by=$10))' : 'AND created_by=$10'} RETURNING id,title,detail,status,owner,date,created_by,extra,assigned_to`, [title.trim(),detail,status,owner,date,JSON.stringify(extra),assigned,req.params.id,section,...(admin(req.user.role)?[]:[req.user.id])]); if(!result.rows[0]) return res.status(404).json({error:'Élément introuvable'}); res.json(unpack(result.rows[0]));
  }catch(e){next(e);}});
  app.delete('/api/entries/:section/:id',auth,sectionAccess,async(req,res,next)=>{try{
    if(!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({error:'Identifiant invalide'});
    if(req.params.section === 'prospects' && !admin(req.user.role)) return res.status(403).json({error:'Seul un administrateur peut supprimer un prospect.'});
    if(req.params.section === 'rendezvous' && !admin(req.user.role)) return res.status(403).json({error:'Seul un administrateur peut supprimer un rendez-vous.'});
    if(!admin(req.user.role) && ['formations','ressources','taches'].includes(req.params.section)) return res.status(403).json({error:'Accès en lecture seule'});
    if(req.params.section==='prospects' && (await pool.query('SELECT id FROM prospect_notes WHERE prospect_id=$1',[req.params.id])).rows.length) return res.status(409).json({error:'Ce prospect possède des notes et ne peut pas être supprimé.'});
    if(req.params.section==='prospects') {const meetings=(await pool.query("SELECT extra FROM entries WHERE section='rendezvous'")).rows; if(meetings.some(m=>JSON.parse(m.extra||'{}').prospect_id===req.params.id)) return res.status(409).json({error:'Ce prospect est lié à un rendez-vous.'});}
    if(req.params.section==='stock') {const orders=(await pool.query("SELECT extra FROM entries WHERE section='commandes'")).rows; if(orders.some(o=>JSON.parse(o.extra||'{}').pack_id===req.params.id)) return res.status(409).json({error:'Ce pack est utilisé dans une commande.'});}
    const result=await pool.query(`DELETE FROM entries WHERE id=$1 AND section=$2 ${admin(req.user.role)?'':'AND created_by=$3'} RETURNING id`,[req.params.id,req.params.section,...(admin(req.user.role)?[]:[req.user.id])]); if(!result.rows[0]) return res.status(404).json({error:'Élément introuvable'}); res.json({ok:true});
  }catch(e){next(e);}});
  app.get('/api/analytics',auth,async(req,res,next)=>{try{if(!admin(req.user.role)) return res.status(403).json({error:'Accès interdit'}); const entries=await pool.query("SELECT section,status,COUNT(*)::int AS count FROM entries WHERE section <> 'ressources' GROUP BY section,status ORDER BY section,status"); const users=await pool.query('SELECT role,COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role');res.json({entries:entries.rows,users:users.rows});}catch(e){next(e);}});
  app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Erreur serveur'});});
  return app;
}
