import express from "express";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const categories = ["marketing", "produit", "temoignage"];
const maxSize = 100 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function mountTrainingVideos(app, { auth, admin, presenter, directory }) {
  const root = path.resolve(directory);
  let uploading = false;
  const meta = (id) => path.join(root, `${id}.json`);
  const file = (id) => path.join(root, `${id}.video`);
  app.get("/api/training-videos", auth, async (req, res, next) => {
    try {
      await mkdir(root, { recursive: true });
      const names = await readdir(root);
      const videos = await Promise.all(
        names
          .filter((n) => uuid.test(n.slice(0, -5)) && n.endsWith(".json"))
          .map((n) => readFile(path.join(root, n), "utf8").then(JSON.parse)),
      );
      res.json(videos.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      next(e);
    }
  });
  app.post(
    "/api/training-videos",
    auth,
    (req, res, next) => {
      if (!admin(req.user.role) && !presenter(req.user))
        return res.status(403).json({ error: "Accès interdit" });
      if (process.env.NODE_ENV === "production")
        return res.status(403).json({ error: "Import désactivé en production" });
      if (uploading) return res.status(429).json({ error: "Un import est déjà en cours." });
      uploading = true;
      res.once("close", () => {
        uploading = false;
      });
      next();
    },
    express.raw({ type: ["video/mp4", "video/webm"], limit: maxSize }),
    async (req, res, next) => {
      try {
        const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
        const category = req.query.category;
        const type = req.get("content-type");
        if (
          !title ||
          title.length > 120 ||
          !categories.includes(category) ||
          !Buffer.isBuffer(req.body) ||
          req.body.length < 16
        )
          return res.status(400).json({ error: "Titre, catégorie et vidéo MP4 ou WebM requis." });
        const valid =
          type === "video/mp4"
            ? req.body.subarray(4, 8).toString() === "ftyp"
            : type === "video/webm" &&
              req.body.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        if (!valid) return res.status(400).json({ error: "Format vidéo invalide." });
        await mkdir(root, { recursive: true });
        const existing = await readdir(root);
        const sizes = await Promise.all(
          existing
            .filter((n) => n.endsWith(".video") && uuid.test(n.slice(0, -6)))
            .map((n) => stat(path.join(root, n))),
        );
        if (
          sizes.reduce((sum, entry) => sum + entry.size, 0) + req.body.length >
          1024 * 1024 * 1024
        )
          return res
            .status(413)
            .json({ error: "Limite locale de 1 Go atteinte ; contactez l’administration." });
        const id = randomUUID();
        const record = {
          id,
          title,
          category,
          type,
          size: req.body.length,
          created_at: new Date().toISOString(),
          uploaded_by: req.user.name,
        };
        await writeFile(file(id), req.body, { flag: "wx", mode: 0o600 });
        await writeFile(meta(id), JSON.stringify(record), { flag: "wx", mode: 0o600 });
        res.status(201).json(record);
      } catch (e) {
        next(e);
      }
    },
  );
  app.get("/api/training-videos/:id/content", auth, async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!uuid.test(id)) return res.status(404).json({ error: "Vidéo introuvable" });
      let record;
      try {
        record = JSON.parse(await readFile(meta(id), "utf8"));
      } catch (e) {
        if (e.code === "ENOENT") return res.status(404).json({ error: "Vidéo introuvable" });
        throw e;
      }
      if (!["video/mp4", "video/webm"].includes(record.type))
        return res.status(500).json({ error: "Format indisponible" });
      res.set({
        "Content-Type": record.type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      });
      res.sendFile(file(id), (err) => {
        if (err && !res.headersSent) next(err);
      });
    } catch (e) {
      next(e);
    }
  });
}
