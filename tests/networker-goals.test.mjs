import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("objectifs privés, tâches liées et progression individuelle", async () => {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await initialize(pool, "root@example.test", "password12345");
  const app = createApp(pool),
    root = request.agent(app);
  await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
  async function create(name) {
    const r = await root
      .post("/api/users")
      .send({ name, email: `${name}@example.test`, role: "networker", password: "password12345" });
    const agent = request.agent(app);
    await agent.post("/api/login").send({ email: r.body.email, password: "password12345" });
    return { id: r.body.id, agent };
  }
  const n = await create("networker"),
    other = await create("other");
  const path = `/api/networkers/${n.id}/goals`;
  assert.equal((await n.agent.post(path).send({ title: "Privé" })).status, 403);
  assert.equal((await root.post(path).send({ title: "  " })).status, 400);
  const goal = await root.post(path).send({ title: "Objectif de test" });
  assert.equal(goal.status, 201);
  const pathTasks = `${path}/${goal.body.id}/tasks`;
  const profile = async () => (await root.get(`/api/networkers/${n.id}/profile`)).body;
  let g = (await profile()).goals[0];
  assert.deepEqual([g.completed, g.total, g.progress], [0, 0, 0]);
  const createTask = (audience, target) =>
    root.post("/api/entries/taches").send({
      title: "Tâche existante",
      detail: "",
      owner: "",
      date: "",
      status: "À faire",
      extra: { priority: "Normale", audience, ...(target ? { target } : {}) },
    });
  const task = await createTask("Networker spécifique", n.id),
    wrong = await createTask("Networker spécifique", other.id),
    shared = await createTask("Tous les networkers");
  assert.equal((await root.post(pathTasks).send({ task_id: wrong.body.id })).status, 400);
  assert.equal((await root.post(pathTasks).send({ task_id: task.body.id })).status, 201);
  assert.equal((await root.post(pathTasks).send({ task_id: task.body.id })).status, 409);
  assert.equal((await root.post(pathTasks).send({ task_id: shared.body.id })).status, 201);
  assert.equal((await root.post(pathTasks).send({ title: "Nouvelle tâche" })).status, 201);
  assert.equal((await n.agent.post(pathTasks).send({ title: "Interdit" })).status, 403);
  assert.equal(
    (
      await root
        .post(`/api/networkers/${other.id}/goals/${goal.body.id}/tasks`)
        .send({ task_id: shared.body.id })
    ).status,
    404,
  );
  g = (await profile()).goals[0];
  assert.deepEqual([g.completed, g.total, g.progress], [0, 3, 0]);
  const newTask = g.tasks.find((x) => x.title === "Nouvelle tâche");
  const visible = (await n.agent.get("/api/entries/taches")).body;
  assert.ok(visible.some((t) => t.id === newTask.id));
  assert.equal(
    (await other.agent.put(`/api/tasks/${shared.body.id}/progress`).send({ status: "Terminée" }))
      .status,
    200,
  );
  assert.equal(
    (await n.agent.put(`/api/tasks/${task.body.id}/progress`).send({ status: "Terminée" })).status,
    200,
  );
  g = (await profile()).goals[0];
  assert.deepEqual([g.completed, g.total, g.progress], [1, 3, 33]);
  assert.equal(
    (await n.agent.put(`/api/tasks/${newTask.id}/progress`).send({ status: "Terminée" })).status,
    200,
  );
  assert.equal(
    (await n.agent.put(`/api/tasks/${shared.body.id}/progress`).send({ status: "Terminée" }))
      .status,
    200,
  );
  g = (await profile()).goals[0];
  assert.deepEqual([g.completed, g.total, g.progress], [3, 3, 100]);
  assert.equal(
    (await n.agent.put(`/api/tasks/${task.body.id}/progress`).send({ status: "En cours" })).status,
    200,
  );
  g = (await profile()).goals[0];
  assert.equal(g.progress, 67);
  const unlink = `${pathTasks}/${task.body.id}/unlink`;
  assert.equal((await n.agent.put(unlink).send({})).status, 403);
  assert.equal((await root.put(unlink).send({})).status, 200);
  g = (await profile()).goals[0];
  assert.deepEqual([g.completed, g.total, g.progress], [2, 2, 100]);
  assert.equal((await root.post(pathTasks).send({ task_id: task.body.id })).status, 201);
  g = (await profile()).goals[0];
  assert.deepEqual([g.completed, g.total, g.progress], [2, 3, 67]);
  assert.equal((await root.delete(`/api/entries/taches/${task.body.id}`)).status, 409);
  assert.equal(
    (
      await root
        .put(`/api/entries/taches/${task.body.id}`)
        .send({ ...task.body, extra: { ...task.body.extra, target: other.id } })
    ).status,
    409,
  );
  assert.equal((await n.agent.get(`/api/networkers/${n.id}/profile`)).body.goals, undefined);
  assert.equal((await other.agent.get(`/api/networkers/${n.id}/profile`)).status, 403);
  await pool.end();
});
