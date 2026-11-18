import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("tableau et suivi networker réservés aux administrateurs", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool),
    root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  async function create(name, role) {
    const r = await root
      .post("/api/users")
      .send({ name, email: `${name}@example.test`, role, password: "password12345" });
    const agent = request.agent(app);
    await agent.post("/api/login").send({ email: r.body.email, password: "password12345" });
    return { id: r.body.id, agent };
  }
  const n = await create("networker", "networker"),
    other = await create("other", "networker"),
    admin = await create("admin", "admin"),
    presenter = await create("presenter", "presentateur");
  assert.equal((await n.agent.get("/api/networkers")).status, 403);
  assert.equal((await presenter.agent.get("/api/networkers")).status, 403);
  assert.equal(
    (await n.agent.post(`/api/networkers/${n.id}/notes`).send({ content: "privé" })).status,
    403,
  );
  assert.equal((await n.agent.get(`/api/networkers/${other.id}/profile`)).status, 403);
  const prospect = await n.agent.post("/api/entries/prospects").send({
    title: "Prospect fictif",
    detail: "",
    owner: "",
    date: "",
    status: "",
    extra: { phone: "123", interest: "Produits" },
  });
  assert.equal(prospect.status, 201);
  let table = (await admin.agent.get("/api/networkers")).body;
  assert.equal(table.find((p) => p.id === n.id).prospect_count, 1);
  assert.equal(table.length, 2);
  assert.equal(
    (await admin.agent.post(`/api/networkers/${n.id}/notes`).send({ content: " " })).status,
    400,
  );
  assert.equal(
    (
      await admin.agent
        .post(`/api/networkers/${n.id}/notes`)
        .send({ content: "Appeler la semaine prochaine" })
    ).status,
    201,
  );
  const task = await admin.agent.post("/api/entries/taches").send({
    title: "Faire un suivi",
    detail: "",
    owner: "",
    date: "2026-12-04",
    status: "À faire",
    extra: { priority: "Normale", audience: "Networker spécifique", target: n.id },
  });
  assert.equal(task.status, 201);
  assert.equal(
    (await n.agent.get("/api/entries/taches")).body.some((t) => t.id === task.body.id),
    true,
  );
  assert.equal(
    (await n.agent.put(`/api/tasks/${task.body.id}/progress`).send({ status: "Terminée" })).status,
    200,
  );
  const meeting = await root.post("/api/entries/rendezvous").send({
    title: "Suivi fictif",
    detail: "",
    owner: "",
    date: "2026-12-01T10:00",
    status: "Demandé",
    extra: {
      category: "Networker",
      kind: "Suivi",
      networker_id: n.id,
      end_date: "2026-12-01T11:00",
    },
  });
  assert.equal(meeting.status, 201);
  const profile = (await root.get(`/api/networkers/${n.id}/profile`)).body;
  assert.equal(profile.notes[0].content, "Appeler la semaine prochaine");
  assert.equal(profile.notes[0].author, "admin");
  assert.equal(profile.tasks.find((t) => t.id === task.body.id).status, "Terminée");
  assert.equal(profile.prospects[0].id, prospect.body.id);
  assert.deepEqual(profile.orders, []);
  assert.equal(profile.meetings[0].id, meeting.body.id);
  const self = (await n.agent.get(`/api/networkers/${n.id}/profile`)).body;
  assert.equal(self.notes, undefined);
  assert.equal(self.orders, undefined);
  await pool.end();
});
