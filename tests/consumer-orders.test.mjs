import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("commandes consommateur : prospect existant ou nouveau, prix et stock protégés", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool);
  const admin = request.agent(app);
  await admin.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  const user = await admin.post("/api/users").send({
    name: "Networker",
    email: "n@example.test",
    role: "networker",
    password: "password12345",
  });
  const member = request.agent(app);
  await member.post("/api/login").send({ email: "n@example.test", password: "password12345" });
  assert.equal((await admin.post("/api/catalogue/import")).status, 200);
  assert.equal((await admin.post("/api/commerce/setup")).status, 200);
  const existing = await admin.post("/api/entries/prospects").send({
    title: "Client existant",
    detail: "",
    owner: "",
    date: "",
    status: "Premier contact",
    assigned_to: user.body.id,
    extra: { phone: "123", interest: "Produits" },
  });
  assert.equal(existing.status, 201);
  const pack = {
    consumer: { type: "existing", prospectId: existing.body.id },
    kind: "pack",
    packId: "business",
    options: ["option-1", "option-1"],
  };
  assert.equal((await member.post("/api/commerce/consumer-orders").send(pack)).status, 403);
  assert.equal(
    (await admin.post("/api/commerce/consumer-orders").send({ ...pack, options: ["option-1"] }))
      .status,
    400,
  );
  const draft = await admin.post("/api/commerce/consumer-orders").send(pack);
  assert.equal(draft.status, 201);
  let data = (await admin.get("/api/commerce")).body;
  let order = data.consumerOrders.find((x) => x.id === draft.body.id);
  assert.equal(order.snapshot.consumer.name, "Client existant");
  assert.equal(order.snapshot.priceMillimes, 1200000);
  assert.equal(order.snapshot.lines[0].quantity, 4);
  assert.equal((await admin.delete(`/api/entries/prospects/${existing.body.id}`)).status, 409);
  assert.equal(
    (await admin.post(`/api/commerce/consumer-orders/${draft.body.id}/validate`)).status,
    409,
  );
  await admin
    .post("/api/commerce/stock")
    .send({ variant: "sfactor-20", delta: 7, reason: "Stock fictif" });
  assert.equal(
    (await admin.post(`/api/commerce/consumer-orders/${draft.body.id}/validate`)).status,
    200,
  );
  assert.equal(
    (await admin.post(`/api/commerce/consumer-orders/${draft.body.id}/validate`)).status,
    409,
  );
  data = (await admin.get("/api/commerce")).body;
  assert.equal(data.variants.find((v) => v.id === "sfactor-20").quantity, 3);
  const retail = {
    consumer: { type: "new", name: "Nouveau client", phone: "456", email: "" },
    kind: "retail",
    lines: [{ variant: "sfactor-20", quantity: 2, unitPriceMillimes: 12550 }],
  };
  assert.equal(
    (
      await admin
        .post("/api/commerce/consumer-orders")
        .send({ ...retail, consumer: { ...retail.consumer, phone: "" } })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin
        .post("/api/commerce/consumer-orders")
        .send({ ...retail, lines: [{ variant: "hydro", quantity: 1, unitPriceMillimes: 1000 }] })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin
        .post("/api/commerce/consumer-orders")
        .send({ ...retail, lines: [retail.lines[0], retail.lines[0]] })
    ).status,
    400,
  );
  const fresh = await admin.post("/api/commerce/consumer-orders").send(retail);
  assert.equal(fresh.status, 201);
  data = (await admin.get("/api/commerce")).body;
  order = data.consumerOrders.find((x) => x.id === fresh.body.id);
  assert.equal(order.snapshot.priceMillimes, 25100);
  assert.equal(order.snapshot.lines[0].unitPriceMillimes, 12550);
  assert.equal(order.snapshot.pp, null);
  const prospects = (await admin.get("/api/entries/prospects")).body;
  const person = prospects.find((p) => p.id === order.prospect_id);
  assert.equal(person.title, "Nouveau client");
  assert.equal(person.extra.phone, "456");
  assert.equal(person.status, "");
  assert.equal(
    (await admin.post(`/api/commerce/consumer-orders/${fresh.body.id}/validate`)).status,
    200,
  );
  assert.equal(
    (await admin.get("/api/commerce")).body.variants.find((v) => v.id === "sfactor-20").quantity,
    1,
  );
  await pool.end();
});
