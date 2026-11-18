import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("un parrain direct, arbres autorisés et transfert explicite", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool),
    root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  async function create(name, role = "networker") {
    const r = await root
      .post("/api/users")
      .send({ name, email: `${name}@example.test`, password: "password12345", role });
    const agent = request.agent(app);
    await agent.post("/api/login").send({ email: r.body.email, password: "password12345" });
    return { ...r.body, agent };
  }
  const a = await create("a"),
    b = await create("b"),
    c = await create("c"),
    x = await create("x"),
    p = await create("presenter", "presentateur");
  const link = (child, parent, prev) =>
    root.put(`/api/networkers/${child.id}/sponsor`).send({
      sponsor_id: parent?.id || "",
      ...(prev !== undefined ? { previous_sponsor_id: prev } : {}),
    });
  assert.equal((await link(b, a)).status, 200);
  assert.equal((await link(c, b)).status, 200);
  assert.equal((await a.agent.get("/api/networkers/tree")).body.nodes.length, 3);
  const tree = (await b.agent.get("/api/networkers/tree")).body;
  assert.equal(tree.parent.name, "a");
  assert.deepEqual(new Set(tree.nodes.map((n) => n.id)), new Set([b.id, c.id]));
  assert.equal(tree.nodes.find((n) => n.id === b.id).sponsor_id, null);
  assert.equal(
    tree.nodes.some((n) => "email" in n),
    false,
  );
  assert.equal((await p.agent.get("/api/networkers/tree")).status, 403);
  assert.equal((await root.get("/api/networkers/tree")).body.nodes.length, 4);
  assert.equal(
    (await b.agent.put(`/api/networkers/${b.id}/sponsor`).send({ sponsor_id: x.id })).status,
    403,
  );
  assert.equal((await link(b, x)).status, 409);
  assert.equal((await link(b, x, x.id)).status, 409);
  assert.equal((await link(b, x, a.id)).status, 200);
  assert.equal((await a.agent.get("/api/networkers/tree")).body.nodes.length, 1);
  assert.deepEqual(
    new Set((await x.agent.get("/api/networkers/tree")).body.nodes.map((n) => n.id)),
    new Set([x.id, b.id, c.id]),
  );
  assert.equal((await link(x, c)).status, 400);
  assert.equal(
    (
      await root
        .put(`/api/users/${b.id}`)
        .send({ name: "b", email: b.email, role: "admin", is_active: true })
    ).status,
    409,
  );
  const history = (
    await pool.query(
      "SELECT old_sponsor_id,new_sponsor_id FROM networker_sponsor_history WHERE networker_id=$1",
      [b.id],
    )
  ).rows;
  assert.ok(history.some((h) => h.old_sponsor_id === a.id && h.new_sponsor_id === x.id));
  assert.equal((await link(b, null, x.id)).status, 200);
  assert.equal(
    (await root.get("/api/networkers/tree")).body.nodes.find((n) => n.id === b.id).sponsor_id,
    null,
  );
  await pool.query("UPDATE users SET sponsor_id=$1 WHERE id=$2", [c.id, b.id]);
  await pool.query("UPDATE users SET sponsor_id=$1 WHERE id=$2", [b.id, c.id]);
  const anomalous = (await root.get("/api/networkers/tree")).body;
  assert.equal(anomalous.integrity_warning, true);
  assert.equal(anomalous.nodes.length, 4);
  const own = (await b.agent.get("/api/networkers/tree")).body;
  assert.equal(own.integrity_warning, true);
  assert.equal(own.nodes.length, 1);
  await pool.end();
});
