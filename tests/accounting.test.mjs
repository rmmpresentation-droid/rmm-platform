import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { createApp, initialize } from "../server/app.mjs";

test("suivi comptable interne : droits, factures, charges, paiements et historique", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool);
  const root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  const created = await root.post("/api/users").send({
    name: "Membre",
    email: "membre@example.test",
    role: "networker",
    password: "password12345",
  });
  assert.equal(created.status, 201);
  const member = request.agent(app);
  await member.post("/api/login").send({ email: "membre@example.test", password: "password12345" });
  const doc = {
    kind: "invoice_income",
    title: "Facture test",
    reference: "F-001",
    counterparty: "Client fictif",
    issue_date: "2026-11-01",
    due_date: "2026-11-30",
    amount_millimes: 100050,
    notes: "Test",
  };
  assert.equal((await request(app).get("/api/accounting")).status, 401);
  assert.equal((await member.get("/api/accounting")).status, 403);
  assert.equal((await member.post("/api/accounting/documents").send(doc)).status, 403);
  assert.equal(
    (await root.post("/api/accounting/documents").send({ ...doc, amount_millimes: 0 })).status,
    400,
  );
  assert.equal(
    (await root.post("/api/accounting/documents").send({ ...doc, amount_millimes: 1.2 })).status,
    400,
  );
  assert.equal(
    (await root.post("/api/accounting/documents").send({ ...doc, due_date: "2026-10-30" })).status,
    400,
  );
  assert.equal(
    (await root.post("/api/accounting/documents").send({ ...doc, issue_date: "2026-02-30" }))
      .status,
    400,
  );
  const saved = await root.post("/api/accounting/documents").send(doc);
  assert.equal(saved.status, 201);
  const id = saved.body.id;
  assert.equal(
    (await root.put(`/api/accounting/documents/${id}`).send({ ...doc, title: "Facture modifiée" }))
      .status,
    200,
  );
  let data = (await root.get("/api/accounting")).body;
  assert.equal(data.history.length, 1);
  assert.equal(data.history[0].before_data.title, "Facture test");
  const payment = {
    amount_millimes: 50000,
    paid_date: "2026-11-02",
    method: "Virement",
    notes: "",
  };
  assert.equal(
    (await root.post(`/api/accounting/documents/${id}/payments`).send(payment)).status,
    201,
  );
  assert.equal(
    (
      await root
        .post(`/api/accounting/documents/${id}/payments`)
        .send({ ...payment, amount_millimes: 50051 })
    ).status,
    409,
  );
  assert.equal(
    (
      await root
        .post(`/api/accounting/documents/${id}/payments`)
        .send({ ...payment, amount_millimes: 50050 })
    ).status,
    201,
  );
  assert.equal(
    (await root.post(`/api/accounting/documents/${id}/payments`).send(payment)).status,
    409,
  );
  assert.equal((await root.put(`/api/accounting/documents/${id}`).send(doc)).status, 409);
  assert.equal((await root.post(`/api/accounting/documents/${id}/cancel`)).status, 409);
  const charge = await root
    .post("/api/accounting/documents")
    .send({ ...doc, kind: "expense", title: "Charge" });
  assert.equal(charge.status, 201);
  assert.equal((await root.post(`/api/accounting/documents/${charge.body.id}/cancel`)).status, 200);
  assert.equal(
    (await root.post(`/api/accounting/documents/${charge.body.id}/payments`).send(payment)).status,
    409,
  );
  data = (await root.get("/api/accounting")).body;
  assert.equal(data.documents.length, 2);
  assert.equal(data.payments.length, 2);
  assert.equal(data.history.length, 2);
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.equal((await root.post("/api/accounting/documents").send(doc)).status, 403);
    assert.equal((await root.get("/api/accounting")).status, 200);
  } finally {
    process.env.NODE_ENV = old;
  }
  await pool.end();
});
