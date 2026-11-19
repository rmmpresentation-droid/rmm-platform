import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { newDb } from "pg-mem";
import request from "supertest";
import { initialize, createApp } from "../server/app.mjs";
test("supports présentation : médias protégés, validation et droits", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "rmm-aids-"));
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  try {
    await initialize(pool, "root@example.test", "password12345");
    const app = createApp(pool, { videoDirectory: dir });
    const admin = request.agent(app);
    await admin.post("/api/login").send({ email: "root@example.test", password: "password12345" });
    await admin
      .post("/api/users")
      .send({
        name: "Membre",
        email: "member@example.test",
        role: "networker",
        password: "password12345",
      })
      .expect(201);
    const member = request.agent(app);
    await member
      .post("/api/login")
      .send({ email: "member@example.test", password: "password12345" });
    await request(app).get("/api/presentation-aids").expect(401);
    await member
      .post("/api/presentation-aids")
      .send({ title: "x", kind: "link", value: "https://example.test" })
      .expect(403);
    await admin
      .post("/api/presentation-aids")
      .send({ title: "x", kind: "link", value: "javascript:alert(1)" })
      .expect(400);
    await admin
      .post("/api/presentation-aids")
      .send({ title: "x", kind: "link", value: "http://example.test" })
      .expect(400);
    await admin
      .post("/api/presentation-aids")
      .send({ title: "Site", kind: "link", value: "https://example.test" })
      .expect(201);
    await admin
      .post("/api/presentation-aids")
      .send({ title: "Témoignage fictif", kind: "testimonial", value: "texte de test" })
      .expect(201);
    await admin
      .post("/api/presentation-aids/image?title=X")
      .set("Content-Type", "image/png")
      .send(Buffer.alloc(16))
      .expect(400);
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    const image = await admin
      .post("/api/presentation-aids/image?title=Photo")
      .set("Content-Type", "image/png")
      .send(png)
      .expect(201);
    assert.equal((await member.get("/api/presentation-aids").expect(200)).body.length, 3);
    await request(app).get(`/api/presentation-aids/${image.body.id}/image`).expect(401);
    const response = await member.get(`/api/presentation-aids/${image.body.id}/image`).expect(200);
    assert.deepEqual(response.body, png);
    assert.equal(response.headers["content-type"], "image/png");
    assert.equal(response.headers["cache-control"], "private, no-store");
  } finally {
    await pool.end();
    await rm(dir, { recursive: true, force: true });
  }
});
