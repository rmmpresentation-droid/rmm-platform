import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";
import {
  validateLocalTarget,
  resetSuperadmin,
  createDemoAccounts,
} from "../server/local-accounts.mjs";

test("outil local refuse bases distantes, usage non explicite et production", () => {
  assert.doesNotThrow(() =>
    validateLocalTarget({
      RMM_LOCAL_ACCOUNT_TOOL: "1",
      DATABASE_URL: "postgres://rmm:local@db:5432/rmm",
    }),
  );
  assert.throws(() => validateLocalTarget({ DATABASE_URL: "postgres://rmm@localhost/rmm" }));
  assert.throws(() =>
    validateLocalTarget({
      RMM_LOCAL_ACCOUNT_TOOL: "1",
      NODE_ENV: "production",
      DATABASE_URL: "postgres://rmm@localhost/rmm",
    }),
  );
  assert.throws(() =>
    validateLocalTarget({
      RMM_LOCAL_ACCOUNT_TOOL: "1",
      DATABASE_URL: "postgres://rmm@remote.example/rmm",
    }),
  );
});

test("restaure l’accès sans réinitialiser la base et crée les comptes de démonstration une seule fois", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "initial@example.test", "premiermotdepasse");
  const app = createApp(pool);
  const agent = request.agent(app);
  assert.equal(
    (
      await agent
        .post("/api/login")
        .send({ email: "initial@example.test", password: "premiermotdepasse" })
    ).status,
    200,
  );
  await assert.rejects(
    resetSuperadmin(pool, "nouveau@example.test", "nouveaumotdepasse"),
    /introuvable/,
  );
  await resetSuperadmin(pool, "initial@example.test", "nouveaumotdepasse");
  assert.equal((await agent.get("/api/me")).status, 401);
  assert.equal(
    (
      await agent
        .post("/api/login")
        .send({ email: "initial@example.test", password: "premiermotdepasse" })
    ).status,
    401,
  );
  assert.equal(
    (
      await agent
        .post("/api/login")
        .send({ email: "initial@example.test", password: "nouveaumotdepasse" })
    ).status,
    200,
  );
  const first = await createDemoAccounts(pool, () => "motdepassefictif123");
  assert.equal(first.created.length, 7);
  assert.equal(first.existing.length, 0);
  const counts = Object.fromEntries(
    ["admin", "presentateur", "networker"].map((role) => [
      role,
      first.created.filter((user) => user.role === role).length,
    ]),
  );
  assert.deepEqual(counts, { admin: 3, presentateur: 1, networker: 3 });
  const second = await createDemoAccounts(pool, () => {
    throw new Error("ne doit pas recréer");
  });
  assert.equal(second.created.length, 0);
  assert.equal(second.existing.length, 7);
  for (const account of first.created) {
    const logged = await request(app)
      .post("/api/login")
      .send({ email: account.email, password: account.password });
    assert.equal(logged.status, 200);
    assert.equal(logged.body.role, account.role);
  }
  await resetSuperadmin(pool, "nouveau@example.test", "nouveaumotdepasse", true);
  assert.equal(
    (
      await request(app)
        .post("/api/login")
        .send({ email: "nouveau@example.test", password: "nouveaumotdepasse" })
    ).status,
    200,
  );
  assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM users")).rows[0].count, 8);
  await pool.end();
});
