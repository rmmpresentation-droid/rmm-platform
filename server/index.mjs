import pg from 'pg';
import { initialize, createApp } from './app.mjs';
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL || 'postgres://rmm:rmm_local@localhost:5432/rmm'});
try {
  await initialize(pool, process.env.RMM_ADMIN_EMAIL, process.env.RMM_ADMIN_PASSWORD);
  const server = createApp(pool, { publicRequestAdminId: process.env.RMM_PUBLIC_REQUEST_ADMIN_ID }).listen(Number(process.env.API_PORT || 3001), '0.0.0.0', () => console.log('API locale démarrée'));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => pool.end().finally(() => process.exit(0))));
} catch(e) { console.error('Initialisation impossible :',e.message); await pool.end(); process.exit(1); }
