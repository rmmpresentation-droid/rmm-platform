import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("séances de présentation : participants, confidentialité et droits", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  try {
    await initialize(pool, "root@example.test", "password12345");
    const app = createApp(pool);
    const root = request.agent(app);
    await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
    async function create(name, role) {
      const u = (
        await root
          .post("/api/users")
          .send({ name, email: `${name}@example.test`, role, password: "password12345" })
          .expect(201)
      ).body;
      const agent = request.agent(app);
      await agent.post("/api/login").send({ email: u.email, password: "password12345" });
      return { u, agent };
    }
    const member = await create("member", "networker"),
      other = await create("other", "networker"),
      host = await create("host", "presentateur"),
      otherHost = await create("otherhost", "presentateur");
    const prospect = (
      await root
        .post("/api/entries/prospects")
        .send({
          title: "Prospect fictif",
          detail: "",
          status: "",
          owner: "",
          date: "",
          assigned_to: member.u.id,
          extra: { phone: "12345678", interest: "À préciser" },
        })
        .expect(201)
    ).body;
    await member.agent
      .post("/api/presentation-sessions")
      .send({ title: "Test", date: "2026-11-04T10:00", presenter_id: host.u.id })
      .expect(403);
    const session = (
      await root
        .post("/api/presentation-sessions")
        .send({ title: "Test", date: "2026-11-04T10:00", presenter_id: host.u.id })
        .expect(201)
    ).body;
    const base = `/api/presentation-sessions/${session.id}`;
    await otherHost.agent.get(`${base}/attendance`).expect(403);
    await host.agent
      .put(`${base}/participants/networker/${member.u.id}`)
      .send({ attended: true })
      .expect(403);
    await root
      .put(`${base}/participants/networker/${member.u.id}`)
      .send({ attended: null })
      .expect(200);
    await root
      .put(`${base}/participants/prospect/${prospect.id}`)
      .send({ attended: null })
      .expect(200);
    assert.equal((await host.agent.get(`${base}/attendance`).expect(200)).body.length, 2);
    await member.agent.get(`${base}/attendance`).expect(403);
    await host.agent
      .put(`${base}/participants/prospect/${prospect.id}`)
      .send({ attended: true })
      .expect(200);
    await host.agent
      .put(`${base}/participants/networker/${member.u.id}`)
      .send({ attended: false })
      .expect(200);
    assert.equal(
      (await member.agent.get("/api/presentation-sessions-mine").expect(200)).body[0].attended,
      false,
    );
    assert.equal(
      (await other.agent.get("/api/presentation-sessions-mine").expect(200)).body.length,
      0,
    );
    await root.delete(`/api/entries/prospects/${prospect.id}`).expect(409);
    await request(app).get("/api/presentation-sessions").expect(401);
  } finally {
    await pool.end();
  }
});
