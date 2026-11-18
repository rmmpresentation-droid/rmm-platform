import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";
import { schedule } from "../server/objectives.mjs";

test("échéances sur périodes depuis le début, tronquées en fin et mois courts", () => {
  assert.deepEqual(schedule("2026-01-01", 10, "daily").slice(0, 2), ["2026-01-01", "2026-01-02"]);
  assert.deepEqual(schedule("2026-01-01", 10, "weekly"), ["2026-01-07", "2026-01-10"]);
  assert.deepEqual(schedule("2026-01-31", 61, "monthly"), [
    "2026-02-27",
    "2026-03-30",
    "2026-04-01",
  ]);
  assert.throws(() => schedule("2026-02-30", 10, "daily"));
  assert.throws(() => schedule("2026-01-01", 30, "monthly"));
  assert.throws(() => schedule("2026-01-01", 367, "daily"));
});
test("objectifs planifiés, groupes figés, progression individuelle et reprise des brouillons", async () => {
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
  const n = await create("n"),
    child = await create("child"),
    grand = await create("grand"),
    stranger = await create("stranger"),
    presenter = await create("presenter", "presentateur");
  await root.put(`/api/networkers/${child.id}/sponsor`).send({ sponsor_id: n.id });
  await root.put(`/api/networkers/${grand.id}/sponsor`).send({ sponsor_id: child.id });
  const body = {
    title: "Objectif fictif",
    start_date: "2026-01-01",
    duration: 10,
    mode: "tree",
    ids: [n.id],
    tasks: [{ title: "Action", frequency: "weekly" }],
  };
  assert.equal((await n.agent.post("/api/objectives").send(body)).status, 403);
  assert.equal((await presenter.agent.get("/api/objectives")).status, 403);
  assert.equal((await root.post("/api/objectives").send({ ...body, tasks: [] })).status, 400);
  const result = await root.post("/api/objectives").send(body);
  assert.equal(result.status, 201);
  assert.equal(result.body.members, 3);
  assert.equal(result.body.occurrences, 2);
  let p = (await n.agent.get("/api/objectives")).body.plans[0];
  assert.equal(p.people.length, 1);
  assert.equal(p.total, 2);
  assert.equal(p.people[0].tasks[0].due_date, "2026-01-07");
  assert.equal((await stranger.agent.get("/api/objectives")).body.plans.length, 0);
  const occ = p.people[0].tasks[0].id;
  assert.equal(
    (await stranger.agent.put(`/api/objectives/occurrences/${occ}`).send({ completed: true }))
      .status,
    404,
  );
  assert.equal(
    (await root.put(`/api/objectives/occurrences/${occ}`).send({ completed: true })).status,
    403,
  );
  assert.equal(
    (await n.agent.put(`/api/objectives/occurrences/${occ}`).send({ completed: true })).status,
    200,
  );
  p = (await n.agent.get("/api/objectives")).body.plans[0];
  assert.equal(p.progress, 50);
  assert.equal((await child.agent.get("/api/objectives")).body.plans[0].progress, 0);
  let all = (await root.get("/api/objectives")).body.plans[0];
  assert.equal(all.total, 6);
  assert.equal(all.completed, 1);
  assert.equal(all.progress, 17);
  await root.put(`/api/networkers/${child.id}/sponsor`).send({ sponsor_id: "" });
  all = (await root.get("/api/objectives")).body.plans[0];
  assert.equal(all.people.length, 3);
  const custom = await root
    .post("/api/objectives")
    .send({ ...body, mode: "custom", ids: [child.id, stranger.id] });
  assert.equal(custom.status, 201);
  assert.equal(custom.body.members, 2);
  assert.equal(
    (await stranger.agent.get("/api/objectives")).body.plans.some(
      (plan) => plan.id === custom.body.id,
    ),
    true,
  );
  assert.equal(
    (await n.agent.get("/api/objectives")).body.plans.some((plan) => plan.id === custom.body.id),
    false,
  );
  const legacy = await root.post(`/api/networkers/${n.id}/goals`).send({ title: "Ancien" });
  assert.equal(legacy.status, 201);
  const linked = await root
    .post(`/api/networkers/${n.id}/goals/${legacy.body.id}/tasks`)
    .send({ title: "Ancienne action" });
  assert.equal(linked.status, 201);
  await n.agent.put(`/api/tasks/${linked.body.id}/progress`).send({ status: "Terminée" });
  assert.equal((await root.get("/api/objectives")).body.drafts.length, 1);
  const migration = {
    title: "Ancien",
    start_date: "2026-02-01",
    duration: 7,
    mode: "custom",
    ids: [n.id],
    tasks: [],
    legacy_goal_id: legacy.body.id,
  };
  const resumed = await root.post("/api/objectives").send(migration);
  assert.equal(resumed.status, 201);
  assert.equal((await root.post("/api/objectives").send(migration)).status, 409);
  assert.equal((await root.get("/api/objectives")).body.drafts.length, 0);
  const old = (await n.agent.get("/api/objectives")).body.plans.find(
    (x) => x.id === resumed.body.id,
  );
  assert.equal(old.progress, 100);
  assert.equal(old.people[0].tasks[0].frequency, "once");
  assert.equal(old.people[0].tasks[0].due_date, "");
  assert.equal(
    (
      await n.agent
        .put(`/api/objectives/occurrences/${old.people[0].tasks[0].id}`)
        .send({ completed: false })
    ).status,
    200,
  );
  assert.equal(
    (await n.agent.get("/api/entries/taches")).body.find((x) => x.id === linked.body.id).my_status,
    "À faire",
  );
  await pool.end();
});
