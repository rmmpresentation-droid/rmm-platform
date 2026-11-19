import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";

test("vidéothèque locale : droits, validation, classement et lecture protégée", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "rmm-videos-"));
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  try {
    await initialize(pool, "root@example.test", "password12345");
    const app = createApp(pool, { videoDirectory: dir });
    const root = request.agent(app);
    await root.post("/api/login").send({ email: "root@example.test", password: "password12345" });
    for (const [name, role] of [
      ["member", "networker"],
      ["presenter", "presentateur"],
    ])
      await root
        .post("/api/users")
        .send({ name, email: `${name}@example.test`, role, password: "password12345" })
        .expect(201);
    const member = request.agent(app);
    await member
      .post("/api/login")
      .send({ email: "member@example.test", password: "password12345" });
    const presenter = request.agent(app);
    await presenter
      .post("/api/login")
      .send({ email: "presenter@example.test", password: "password12345" });
    const bytes = Buffer.from("000000186674797069736f6d0000020000000000", "hex");
    const upload = (agent) =>
      agent
        .post("/api/training-videos?title=Formation&category=produit")
        .set("Content-Type", "video/mp4")
        .send(bytes);
    await request(app).get("/api/training-videos").expect(401);
    await upload(member).expect(403);
    await presenter
      .post("/api/training-videos?title=X&category=bad")
      .set("Content-Type", "video/mp4")
      .send(bytes)
      .expect(400);
    await presenter
      .post("/api/training-videos?title=X&category=produit")
      .set("Content-Type", "video/mp4")
      .send(Buffer.alloc(20))
      .expect(400);
    const created = await upload(presenter).expect(201);
    assert.equal(created.body.category, "produit");
    const list = await member.get("/api/training-videos").expect(200);
    assert.equal(list.body[0].id, created.body.id);
    await request(app).get(`/api/training-videos/${created.body.id}/content`).expect(401);
    const content = await member.get(`/api/training-videos/${created.body.id}/content`).expect(200);
    assert.deepEqual(content.body, bytes);
    assert.match(content.headers["content-type"], /^video\/mp4/);
    assert.equal(content.headers["cache-control"], "private, no-store");
    const diagnostic = await member
      .get(`/api/training-videos/${created.body.id}/content`)
      .set("Range", "bytes=0-0")
      .expect(206);
    assert.equal(diagnostic.headers["content-range"], `bytes 0-0/${bytes.length}`);
    assert.equal(diagnostic.headers["content-type"], "video/mp4");
    assert.deepEqual(diagnostic.body, bytes.subarray(0, 1));
    await member.get("/api/training-videos/../../etc/passwd/content").expect(404);
  } finally {
    await pool.end();
    await rm(dir, { recursive: true, force: true });
  }
});
