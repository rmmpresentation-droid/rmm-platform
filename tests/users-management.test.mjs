import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("compte désactivé conserve ses fiches mais perd ses sessions, droits contrôlés et réactivation", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool);
  const root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  const rootId = (await root.get("/api/me")).body.id;
  async function create(name, role) {
    const response = await root
      .post("/api/users")
      .send({ name, email: `${name}@example.test`, role, password: "password12345" });
    assert.equal(response.status, 201);
    const agent = request.agent(app);
    assert.equal(
      (
        await agent
          .post("/api/login")
          .send({ email: `${name}@example.test`, password: "password12345" })
      ).status,
      200,
    );
    return { ...response.body, is_active: true, agent };
  }
  const networker = await create("networker", "networker");
  const admin = await create("admin", "admin");
  const presenter = await create("presenter", "presentateur");
  const prospect = await networker.agent.post("/api/entries/prospects").send({
    title: "Prospect",
    detail: "",
    owner: "",
    date: "",
    status: "",
    extra: { phone: "123", interest: "Produits" },
  });
  assert.equal(prospect.status, 201);
  const update = (account, active) => ({
    name: account.name,
    email: account.email,
    role: account.role,
    is_active: active,
  });
  assert.equal(
    (await networker.agent.put(`/api/users/${networker.id}`).send(update(networker, false))).status,
    403,
  );
  assert.equal(
    (await admin.agent.put(`/api/users/${networker.id}`).send(update(networker, false))).status,
    403,
  );
  assert.equal(
    (await admin.agent.get("/api/users")).body.every((x) => x.role === "presentateur"),
    true,
  );
  assert.equal(
    (await admin.agent.put(`/api/users/${presenter.id}`).send(update(presenter, false))).status,
    200,
  );
  assert.equal((await presenter.agent.get("/api/me")).status, 401);
  assert.equal(
    (
      await root
        .put(`/api/users/${rootId}`)
        .send({ name: "Root", email: "root@example.test", role: "superadmin", is_active: false })
    ).status,
    400,
  );
  assert.equal(
    (await root.put(`/api/users/${networker.id}`).send(update(networker, false))).status,
    200,
  );
  assert.equal((await networker.agent.get("/api/me")).status, 401);
  assert.equal(
    (
      await networker.agent
        .post("/api/login")
        .send({ email: networker.email, password: "password12345" })
    ).status,
    401,
  );
  assert.equal(
    (await root.get("/api/entries/prospects")).body.some((x) => x.id === prospect.body.id),
    true,
  );
  assert.equal(
    (await root.put(`/api/users/${networker.id}`).send(update(networker, true))).status,
    200,
  );
  assert.equal(
    (await networker.agent.get("/api/me")).status,
    401,
    "ancienne session reste révoquée",
  );
  assert.equal(
    (
      await networker.agent
        .post("/api/login")
        .send({ email: networker.email, password: "password12345" })
    ).status,
    200,
  );
  assert.equal(
    (
      await root
        .put(`/api/users/${networker.id}`)
        .send({ ...update(networker, true), name: "Nouveau nom" })
    ).status,
    200,
  );
  assert.equal((await networker.agent.get("/api/me")).status, 401);
  assert.equal(
    (
      await root
        .put(`/api/users/${networker.id}`)
        .send({ ...update(networker, true), email: admin.email })
    ).status,
    409,
  );
  await pool.end();
});
