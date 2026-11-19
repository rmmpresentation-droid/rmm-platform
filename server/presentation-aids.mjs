import express from "express";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export function mountPresentationAids(app, { auth, admin, presenter, directory }) {
  const root = path.resolve(directory);
  const meta = (id) => path.join(root, `aid-${id}.json`);
  const image = (id) => path.join(root, `aid-${id}.image`);
  const canWrite = (req, res, next) => {
    if (!admin(req.user.role) && !presenter(req.user))
      return res.status(403).json({ error: "Accès interdit" });
    if (process.env.NODE_ENV === "production")
      return res.status(403).json({ error: "Import désactivé en production" });
    next();
  };
  app.get("/api/presentation-aids", auth, async (req, res, next) => {
    try {
      await mkdir(root, { recursive: true });
      const names = await readdir(root);
      const items = await Promise.all(
        names
          .filter((n) => n.startsWith("aid-") && n.endsWith(".json") && uuid.test(n.slice(4, -5)))
          .map((n) => readFile(path.join(root, n), "utf8").then(JSON.parse)),
      );
      res.json(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/presentation-aids", auth, canWrite, async (req, res, next) => {
    try {
      const { title, kind, value } = req.body || {};
      if (
        !text(title, 120) ||
        !["link", "testimonial"].includes(kind) ||
        !text(value, kind === "link" ? 2000 : 3000)
      )
        return res.status(400).json({ error: "Titre et contenu valides requis." });
      if (kind === "link") {
        let u;
        try {
          u = new URL(value);
        } catch {
          return res.status(400).json({ error: "Lien HTTPS invalide." });
        }
        if (u.protocol !== "https:" || u.username || u.password)
          return res.status(400).json({ error: "Lien HTTPS invalide." });
      }
      const id = randomUUID();
      const item = {
        id,
        title: title.trim(),
        kind,
        value: value.trim(),
        created_at: new Date().toISOString(),
        uploaded_by: req.user.name,
      };
      await mkdir(root, { recursive: true });
      await writeFile(meta(id), JSON.stringify(item), { flag: "wx", mode: 0o600 });
      res.status(201).json(item);
    } catch (e) {
      next(e);
    }
  });
  let uploading = false;
  app.post(
    "/api/presentation-aids/image",
    auth,
    canWrite,
    (req, res, next) => {
      if (uploading) return res.status(429).json({ error: "Un import est déjà en cours." });
      uploading = true;
      res.once("close", () => {
        uploading = false;
      });
      next();
    },
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: 10 * 1024 * 1024 }),
    async (req, res, next) => {
      try {
        const title = req.query.title,
          type = req.get("content-type"),
          b = req.body;
        if (!text(title, 120) || !Buffer.isBuffer(b) || b.length < 16)
          return res.status(400).json({ error: "Titre et image JPEG, PNG ou WebP requis." });
        const valid =
          type === "image/jpeg"
            ? b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
            : type === "image/png"
              ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : type === "image/webp" &&
                b.subarray(0, 4).toString() === "RIFF" &&
                b.subarray(8, 12).toString() === "WEBP";
        if (!valid) return res.status(400).json({ error: "Format image invalide." });
        await mkdir(root, { recursive: true });
        const names = await readdir(root);
        const files = names.filter(
          (n) => n.startsWith("aid-") && n.endsWith(".image") && uuid.test(n.slice(4, -6)),
        );
        const sizes = await Promise.all(files.map((n) => stat(path.join(root, n))));
        if (sizes.reduce((n, s) => n + s.size, 0) + b.length > 100 * 1024 * 1024)
          return res
            .status(413)
            .json({ error: "Limite locale de 100 Mo pour les photos atteinte." });
        const id = randomUUID();
        const item = {
          id,
          title: title.trim(),
          kind: "image",
          type,
          size: b.length,
          created_at: new Date().toISOString(),
          uploaded_by: req.user.name,
        };
        await writeFile(image(id), b, { flag: "wx", mode: 0o600 });
        await writeFile(meta(id), JSON.stringify(item), { flag: "wx", mode: 0o600 });
        res.status(201).json(item);
      } catch (e) {
        next(e);
      }
    },
  );
  app.get("/api/presentation-aids/:id/image", auth, async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!uuid.test(id)) return res.status(404).json({ error: "Image introuvable" });
      let item;
      try {
        item = JSON.parse(await readFile(meta(id), "utf8"));
      } catch (e) {
        if (e.code === "ENOENT") return res.status(404).json({ error: "Image introuvable" });
        throw e;
      }
      if (item.kind !== "image" || !["image/jpeg", "image/png", "image/webp"].includes(item.type))
        return res.status(404).json({ error: "Image introuvable" });
      res.set({
        "Content-Type": item.type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      });
      // Only the validated UUID-derived file can be served; the storage parent is .local-data.
      res.sendFile(image(id), { cacheControl: false, dotfiles: "allow" }, (err) => {
        if (!err) return;
        if (res.headersSent) return res.destroy(err);
        res.removeHeader("Content-Type");
        if (err.status === 404) return res.status(404).json({ error: "Image introuvable" });
        if (err.status === 416) return res.status(416).json({ error: "Plage demandée invalide" });
        next(err);
      });
    } catch (e) {
      next(e);
    }
  });
}
