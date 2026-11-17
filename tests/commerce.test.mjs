import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("catalogue commercial, options répétées, profils et validations", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool);
  const admin = request.agent(app);
  await admin.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  assert.equal((await request(app).get("/api/commerce")).status, 401);
  const u = await admin.post("/api/users").send({
    name: "Démonstration",
    email: "n@example.test",
    role: "networker",
    password: "password12345",
  });
  assert.equal(u.status, 201);
  const n = request.agent(app);
  await n.post("/api/login").send({ email: "n@example.test", password: "password12345" });
  assert.equal((await n.get("/api/commerce")).status, 403);
  assert.equal((await admin.post("/api/catalogue/import")).status, 200);
  let r = await admin.post("/api/commerce/setup");
  assert.equal(r.status, 200);
  assert.equal(r.body.created, true);
  assert.equal((await admin.post("/api/commerce/setup")).body.created, false);
  let data = (await admin.get("/api/commerce")).body;
  assert.equal(data.rules.options.length, 9);
  assert.equal(data.rules.packs.length, 5);
  assert.equal(data.variants.length, 12);
  assert.equal(
    (
      await admin
        .post("/api/commerce/stock")
        .send({ variant: "sfactor-20", delta: 6, reason: "Entrée test" })
    ).status,
    200,
  );
  const bad = await admin
    .post("/api/commerce/orders")
    .send({ buyerId: u.body.id, kind: "pack", packId: "business", options: ["option-1"] });
  assert.equal(bad.status, 400);
  r = await admin.post("/api/commerce/orders").send({
    buyerId: u.body.id,
    kind: "pack",
    packId: "business",
    options: ["option-1", "option-1"],
    lines: [{ variant: "htl-60", quantity: 50 }],
  });
  assert.equal(r.status, 201);
  const id = r.body.id;
  data = (await admin.get("/api/commerce")).body;
  let order = data.orders.find((x) => x.id === id);
  assert.equal(order.snapshot.lines[0].quantity, 4);
  assert.equal(order.snapshot.lines.length, 1);
  assert.equal(order.snapshot.lines[0].variant, "sfactor-20");
  assert.equal(order.snapshot.pp, 120);
  assert.equal(order.snapshot.priceMillimes, 1200000);
  r = await admin.post(`/api/commerce/orders/${id}/validate`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  data = (await admin.get("/api/commerce")).body;
  assert.equal(data.variants.find((x) => x.id === "sfactor-20").quantity, 2);
  assert.equal(data.orders.find((x) => x.id === id).status, "Validée");
  assert.equal((await admin.post(`/api/commerce/orders/${id}/validate`)).status, 409);
  const hydro = await admin
    .post("/api/commerce/orders")
    .send({ buyerId: u.body.id, kind: "hydro" });
  assert.equal(hydro.status, 201);
  await admin
    .post("/api/commerce/stock")
    .send({ variant: "hydro", delta: 1, reason: "Entrée test" });
  assert.equal((await admin.post(`/api/commerce/orders/${hydro.body.id}/validate`)).status, 403);
  assert.equal(
    (await admin.put(`/api/commerce/profiles/${u.body.id}`).send({ rank: "Silver" })).status,
    200,
  );
  assert.equal((await admin.post(`/api/commerce/orders/${hydro.body.id}/validate`)).status, 200);
  assert.equal(
    (
      await admin.post("/api/commerce/orders").send({
        buyerId: u.body.id,
        kind: "custom",
        priceMillimes: 1000,
        lines: [{ variant: "hydro", quantity: 1 }],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin
        .post("/api/commerce/options")
        .send({ name: "S Hydro", lines: [{ variant: "hydro", quantity: 1 }] })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin
        .post("/api/commerce/stock")
        .send({ variant: "sfactor-20", delta: -3, reason: "Retrait" })
    ).status,
    409,
  );
  const missing = await admin
    .post("/api/commerce/orders")
    .send({ buyerId: u.body.id, kind: "pack", packId: "bronze", options: ["option-2"] });
  assert.equal(missing.status, 201);
  assert.equal((await admin.post(`/api/commerce/orders/${missing.body.id}/validate`)).status, 409);
  assert.equal(
    (await admin.get("/api/commerce")).body.orders.find((x) => x.id === missing.body.id).status,
    "Brouillon",
  );
  const option = await admin
    .post("/api/commerce/options")
    .send({ name: "Option libre", lines: [{ variant: "sfactor-20", quantity: 1 }] });
  assert.equal(option.status, 201);
  const custom = await admin.post("/api/commerce/orders").send({
    buyerId: u.body.id,
    kind: "custom",
    priceMillimes: 150750,
    lines: [{ variant: "sfactor-20", quantity: 1 }],
  });
  assert.equal(custom.status, 201);
  assert.equal((await admin.post(`/api/commerce/orders/${custom.body.id}/validate`)).status, 200);
  assert.equal(
    (await admin.get("/api/commerce")).body.variants.find((x) => x.id === "sfactor-20").quantity,
    1,
  );
  await pool.end();
});
