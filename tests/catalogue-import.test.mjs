import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import request from 'supertest';
import { initialize, createApp } from '../server/app.mjs';

test('import catalogue réservé à l’administration, sans écraser les fiches modifiées', async () => {
  const { Pool }=newDb().adapters.createPg(); const pool=new Pool();
  await initialize(pool,'root@example.test','password12345'); const app=createApp(pool); const root=request.agent(app);
  assert.equal((await request(app).post('/api/catalogue/import')).status,401);
  await root.post('/api/login').send({email:'root@example.test',password:'password12345'});
  const n=await root.post('/api/users').send({name:'Networker',email:'n@example.test',role:'networker',password:'password12345'});assert.equal(n.status,201);
  const networker=request.agent(app);await networker.post('/api/login').send({email:'n@example.test',password:'password12345'});
  assert.equal((await networker.post('/api/catalogue/import')).status,403);
  const imported=await root.post('/api/catalogue/import');assert.equal(imported.status,200);assert.deepEqual(imported.body,{created:11,existing:0});
  const items=(await root.get('/api/entries/stock')).body;assert.equal(items.length,11);
  for(const item of items) {assert.equal(item.status,'Inactif');assert.equal(item.extra.item_type,'Produit');assert.equal(item.extra.quantity,undefined);assert.match(item.extra.image,/^\/products\//);}
  const product=items[0];assert.equal((await root.put(`/api/entries/stock/${product.id}`).send({...product,detail:'Modification conservée'})).status,200);
  assert.deepEqual((await root.post('/api/catalogue/import')).body,{created:0,existing:11});
  assert.equal((await root.get('/api/entries/stock')).body.find(x=>x.id===product.id).detail,'Modification conservée');
  await pool.end();
});
