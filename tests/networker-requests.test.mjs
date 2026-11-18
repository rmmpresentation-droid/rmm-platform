import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("demandes networker : participants autorisés, création prospect, planification réservée à l’admin", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool);
  const root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  const adminId = (await root.get("/api/me")).body.id;
  async function member(name) {
    const u = await root
      .post("/api/users")
      .send({ name, email: `${name}@example.test`, password: "password12345", role: "networker" });
    const agent = request.agent(app);
    await agent
      .post("/api/login")
      .send({ email: `${name}@example.test`, password: "password12345" });
    return { id: u.body.id, agent };
  }
  const owner = await member("owner"),
    guest = await member("guest"),
    other = await member("other");
  async function prospect(agent, name) {
    return (
      await agent.post("/api/entries/prospects").send({
        title: name,
        detail: "",
        owner: "",
        date: "",
        status: "",
        extra: { phone: "111", interest: "À préciser" },
      })
    ).body;
  }
  const own = await prospect(owner.agent, "Existant"),
    secret = await prospect(other.agent, "Privé");
  const payload = {
    title: "Présentation",
    detail: "Demo",
    date: "2026-12-01T10:00",
    request_kind: "Présentation",
    networker_ids: [guest.id],
    prospect_ids: [own.id],
    new_prospects: [{ name: "Nouveau", phone: "123", email: "" }],
  };
  assert.equal((await root.post("/api/appointment-requests").send(payload)).status, 403);
  assert.equal(
    (
      await owner.agent
        .post("/api/appointment-requests")
        .send({ ...payload, prospect_ids: [secret.id] })
    ).status,
    400,
  );
  assert.equal(
    (
      await owner.agent
        .post("/api/appointment-requests")
        .send({ ...payload, networker_ids: [guest.id, guest.id] })
    ).status,
    400,
  );
  assert.equal(
    (
      await owner.agent
        .post("/api/appointment-requests")
        .send({ ...payload, new_prospects: [{ name: "Nouveau", phone: "", email: "" }] })
    ).status,
    400,
  );
  assert.equal((await owner.agent.post("/api/entries/rendezvous").send({})).status, 403);
  const result = await owner.agent.post("/api/appointment-requests").send({
    ...payload,
    admin_id: adminId,
    end_date: "2026-12-01T11:00",
    location: "Non autorisé",
  });
  assert.equal(result.status, 201);
  const meeting = result.body;
  assert.equal(meeting.status, "Demandé");
  assert.equal(meeting.extra.category, "");
  assert.equal(meeting.extra.end_date, "");
  assert.equal(meeting.extra.admin_id, undefined);
  assert.equal(meeting.extra.location, undefined);
  const ids = JSON.parse(meeting.extra.additional_prospect_ids);
  assert.equal(ids.length, 2);
  assert.ok(ids.includes(own.id));
  const created = (await owner.agent.get("/api/entries/prospects")).body.find(
    (x) => x.title === "Nouveau",
  );
  assert.equal(created.extra.phone, "123");
  assert.equal(created.assigned_to, owner.id);
  assert.ok(ids.includes(created.id));
  assert.equal((await root.delete(`/api/entries/prospects/${created.id}`)).status, 409);
  assert.equal(
    (await guest.agent.get("/api/entries/rendezvous")).body.some((x) => x.id === meeting.id),
    true,
  );
  assert.equal((await other.agent.get("/api/entries/rendezvous")).body.length, 0);
  assert.equal(
    (
      await owner.agent
        .put(`/api/entries/rendezvous/${meeting.id}`)
        .send({ ...meeting, extra: { ...meeting.extra, admin_id: adminId } })
    ).status,
    403,
  );
  assert.equal(
    (
      await owner.agent
        .put(`/api/entries/rendezvous/${meeting.id}`)
        .send({ ...meeting, status: "Confirmé" })
    ).status,
    403,
  );
  assert.equal(
    (
      await root
        .put(`/api/entries/rendezvous/${meeting.id}`)
        .send({ ...meeting, status: "Confirmé" })
    ).status,
    400,
  );
  const confirmed = {
    ...meeting,
    status: "Confirmé",
    extra: {
      ...meeting.extra,
      category: "Prospection",
      kind: "Présentation",
      prospect_id: own.id,
      admin_id: adminId,
      end_date: "2026-12-01T11:00",
    },
  };
  assert.equal(
    (await root.put(`/api/entries/rendezvous/${meeting.id}`).send(confirmed)).status,
    200,
  );
  assert.equal(
    (
      await owner.agent
        .put(`/api/entries/rendezvous/${meeting.id}`)
        .send({ ...meeting, status: "Annulé" })
    ).status,
    403,
  );
  await pool.end();
});
