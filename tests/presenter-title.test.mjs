import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("titre présentateur supplémentaire : superadmin, droits cumulés et révocation", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool);
  const root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  async function create(name, role) {
    const user = (
      await root
        .post("/api/users")
        .send({ name, email: `${name}@example.test`, role, password: "password12345" })
    ).body;
    const agent = request.agent(app);
    await agent.post("/api/login").send({ email: user.email, password: "password12345" });
    return { user, agent };
  }
  const member = await create("member", "networker"),
    other = await create("other", "networker"),
    admin = await create("admin", "admin"),
    legacy = await create("legacy", "presentateur");
  const grant = (id) => `/api/users/${id}/presenter`;
  assert.equal(
    (await admin.agent.put(grant(member.user.id)).send({ is_presenter: true })).status,
    403,
  );
  assert.equal(
    (await member.agent.put(grant(member.user.id)).send({ is_presenter: true })).status,
    403,
  );
  assert.equal((await root.put(grant(legacy.user.id)).send({ is_presenter: false })).status, 400);
  assert.equal((await root.put(grant(member.user.id)).send({ is_presenter: true })).status, 200);
  assert.equal((await member.agent.get("/api/me")).status, 401);
  const login = () =>
    member.agent.post("/api/login").send({ email: member.user.email, password: "password12345" });
  assert.equal((await login()).body.is_presenter, true);
  assert.equal((await member.agent.get("/api/entries/prospects")).status, 200);
  assert.equal((await root.put(grant(admin.user.id)).send({ is_presenter: true })).status, 200);
  let presenters = (await root.get("/api/presenters")).body;
  assert.ok(
    [member.user.id, admin.user.id, legacy.user.id].every((id) =>
      presenters.some((p) => p.id === id),
    ),
  );
  const base = {
    title: "Session",
    detail: "",
    owner: "",
    date: "2026-12-02T10:00",
    status: "Demandé",
    assigned_to: member.user.id,
    extra: {
      category: "Networker",
      kind: "Suivi",
      networker_id: other.user.id,
      end_date: "2026-12-02T11:00",
    },
  };
  const meeting = await root.post("/api/entries/rendezvous").send(base);
  assert.equal(meeting.status, 201);
  assert.equal(
    (await member.agent.get("/api/entries/rendezvous")).body.some((x) => x.id === meeting.body.id),
    true,
  );
  const training = await root.post("/api/entries/formations").send({
    title: "Formation",
    detail: "",
    owner: "",
    date: "",
    status: "À préparer",
    extra: { format: "Présentiel", presenter_id: member.user.id },
  });
  assert.equal(training.status, 201);
  assert.equal(
    (
      await root
        .put(`/api/entries/formations/${training.body.id}`)
        .send({ ...training.body, status: "Terminée" })
    ).status,
    200,
  );
  assert.equal(
    (
      await member.agent
        .put(`/api/trainings/${training.body.id}/attendance/${other.user.id}`)
        .send({ attended: true, quiz_score: "19" })
    ).status,
    200,
  );
  assert.equal(
    (await root.get(`/api/trainings/${training.body.id}/attendance`)).body[0].quiz_score,
    "",
  );
  assert.equal((await root.put(grant(member.user.id)).send({ is_presenter: false })).status, 200);
  assert.equal((await member.agent.get("/api/me")).status, 401);
  await login();
  assert.equal(
    (await member.agent.get("/api/entries/rendezvous")).body.some((x) => x.id === meeting.body.id),
    false,
  );
  assert.equal(
    (await member.agent.get(`/api/trainings/${training.body.id}/attendance`)).status,
    403,
  );
  assert.equal(
    (
      await root
        .put(`/api/entries/formations/${training.body.id}`)
        .send({ ...training.body, status: "Terminée" })
    ).status,
    200,
  );
  assert.equal(
    (await root.put(`/api/entries/rendezvous/${meeting.body.id}`).send(meeting.body)).status,
    200,
  );
  assert.equal((await root.post("/api/entries/rendezvous").send(base)).status, 400);
  assert.equal((await legacy.agent.get("/api/me")).body.is_presenter, true);
  await pool.end();
});
