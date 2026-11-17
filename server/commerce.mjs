import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const seed = JSON.parse(readFileSync(new URL("./commerce-rules-v1.json", import.meta.url), "utf8"));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isInt = (v, min = 0, max = 100000000) => Number.isSafeInteger(v) && v >= min && v <= max;
const safeString = (v, max = 160) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const bad = (status, message) => Object.assign(new Error(message), { status });
const json = (value) => (typeof value === "string" ? JSON.parse(value) : value);

export async function initializeCommerce(pool) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commerce_rules (version TEXT PRIMARY KEY, data TEXT NOT NULL, activated_by UUID NOT NULL REFERENCES users(id), activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commerce_variants (id TEXT PRIMARY KEY, product_id UUID NOT NULL REFERENCES entries(id), format TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), active BOOLEAN NOT NULL DEFAULT TRUE)",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commerce_stock_movements (id UUID PRIMARY KEY, variant_id TEXT NOT NULL REFERENCES commerce_variants(id), delta INTEGER NOT NULL, reason TEXT NOT NULL, actor_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commerce_profiles (user_id UUID PRIMARY KEY REFERENCES users(id), rank TEXT NOT NULL, updated_by UUID NOT NULL REFERENCES users(id))",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commerce_custom_options (id UUID PRIMARY KEY, name TEXT NOT NULL, lines TEXT NOT NULL, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS commerce_orders (id UUID PRIMARY KEY, buyer_id UUID NOT NULL REFERENCES users(id), kind TEXT NOT NULL, status TEXT NOT NULL, rules_version TEXT NOT NULL REFERENCES commerce_rules(version), snapshot TEXT NOT NULL, created_by UUID NOT NULL REFERENCES users(id), validated_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), validated_at TIMESTAMPTZ)",
  );
}

export function mountCommerce(app, pool, { auth, admin, catalogueEntryId }) {
  const gate = [
    auth,
    (req, res, next) =>
      admin(req.user.role)
        ? next()
        : res.status(403).json({ error: "Accès réservé à l’administration." }),
    (req, res, next) =>
      process.env.NODE_ENV === "production" && req.method !== "GET"
        ? res.status(403).json({ error: "Module commercial réservé à la préproduction." })
        : next(),
  ];
  const wrap = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      next(e);
    }
  };
  const tx = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw e;
    } finally {
      client.release();
    }
  };
  async function currentRules(db) {
    const rows = (
      await db.query("SELECT version,data FROM commerce_rules ORDER BY activated_at DESC")
    ).rows;
    if (!rows.length) throw bad(409, "Initialisez les règles de préproduction.");
    return json(rows[0].data);
  }
  const isHydro = (line) =>
    line.productId === catalogueEntryId("s-hydro") || /^s[\s-]*hydro$/i.test(line.product.trim());
  async function resolveLines(db, lines) {
    if (!Array.isArray(lines) || !lines.length || lines.length > 100)
      throw bad(400, "Ajoutez au moins une référence.");
    const totals = new Map();
    for (const line of lines) {
      if (typeof line.variant !== "string" || !isInt(line.quantity, 1, 10000))
        throw bad(400, "Référence ou quantité invalide.");
      totals.set(line.variant, (totals.get(line.variant) || 0) + line.quantity);
    }
    const result = [];
    for (const [id, quantity] of totals) {
      if (!isInt(quantity, 1, 100000)) throw bad(400, "Quantité trop élevée.");
      const row = (
        await db.query(
          "SELECT id,product_id,format,quantity,active FROM commerce_variants WHERE id=$1",
          [id],
        )
      ).rows[0];
      if (!row || !row.active) throw bad(400, `Référence indisponible : ${id}`);
      const product = (
        await db.query("SELECT title FROM entries WHERE id=$1 AND section=$2", [
          row.product_id,
          "stock",
        ])
      ).rows[0];
      if (!product) throw bad(400, "Produit introuvable.");
      result.push({
        variant: id,
        quantity,
        product: product.title,
        format: row.format,
        productId: row.product_id,
      });
    }
    return result.sort((a, b) => a.variant.localeCompare(b.variant));
  }
  app.post(
    "/api/commerce/setup",
    ...gate,
    wrap(async (req, res) => {
      if (process.env.NODE_ENV === "production")
        throw bad(403, "Initialisation locale interdite en production.");
      const result = await tx(async (db) => {
        const existing = (
          await db.query("SELECT version FROM commerce_rules WHERE version=$1", [seed.version])
        ).rows[0];
        if (existing) return { created: false };
        for (const v of seed.variants) {
          const product = (
            await db.query("SELECT id,extra FROM entries WHERE id=$1 AND section=$2", [
              catalogueEntryId(v.product),
              "stock",
            ])
          ).rows[0];
          if (!product || json(product.extra).item_type !== "Produit")
            throw bad(409, "Importez d’abord les références du catalogue dans Produits et stock.");
        }
        await db.query("INSERT INTO commerce_rules (version,data,activated_by) VALUES ($1,$2,$3)", [
          seed.version,
          JSON.stringify(seed),
          req.user.id,
        ]);
        for (const v of seed.variants)
          await db.query(
            "INSERT INTO commerce_variants (id,product_id,format,quantity,active) VALUES ($1,$2,$3,$4,$5)",
            [v.id, catalogueEntryId(v.product), v.format, 0, true],
          );
        return { created: true };
      });
      res.json(result);
    }),
  );
  app.get(
    "/api/commerce",
    ...gate,
    wrap(async (req, res) => {
      const versions = (
        await pool.query("SELECT version,data FROM commerce_rules ORDER BY activated_at DESC")
      ).rows;
      if (!versions.length) return res.json({ initialized: false });
      const variants = (
        await pool.query(
          "SELECT id,product_id,format,quantity,active FROM commerce_variants ORDER BY id",
        )
      ).rows;
      const entries = (
        await pool.query("SELECT id,title,extra FROM entries WHERE section='stock' ORDER BY title")
      ).rows
        .filter((x) => json(x.extra).item_type === "Produit")
        .map(({ id, title }) => ({ id, title }));
      const custom = (
        await pool.query("SELECT id,name,lines FROM commerce_custom_options ORDER BY created_at")
      ).rows.map((o) => ({ ...o, lines: json(o.lines) }));
      const orders = (
        await pool.query(
          "SELECT id,buyer_id,kind,status,rules_version,snapshot,created_at,validated_at FROM commerce_orders ORDER BY created_at DESC",
        )
      ).rows.map((o) => ({ ...o, snapshot: json(o.snapshot) }));
      const profiles = (await pool.query("SELECT user_id,rank FROM commerce_profiles")).rows;
      const movements = (
        await pool.query(
          "SELECT variant_id,delta,reason,created_at FROM commerce_stock_movements ORDER BY created_at DESC",
        )
      ).rows;
      res.json({
        initialized: true,
        rules: json(versions[0].data),
        variants,
        products: entries,
        custom,
        orders,
        profiles,
        movements,
      });
    }),
  );
  app.post(
    "/api/commerce/variants",
    ...gate,
    wrap(async (req, res) => {
      const { productId, format } = req.body;
      if (!uuid.test(productId || "") || !safeString(format, 160))
        throw bad(400, "Produit et format requis.");
      const entry = (
        await pool.query("SELECT extra FROM entries WHERE id=$1 AND section=$2", [
          productId,
          "stock",
        ])
      ).rows[0];
      if (!entry || json(entry.extra).item_type !== "Produit")
        throw bad(400, "Sélectionnez une fiche produit.");
      const id = randomUUID();
      await pool.query(
        "INSERT INTO commerce_variants (id,product_id,format,quantity,active) VALUES ($1,$2,$3,$4,$5)",
        [id, productId, format.trim(), 0, true],
      );
      res.status(201).json({ id });
    }),
  );
  app.post(
    "/api/commerce/stock",
    ...gate,
    wrap(async (req, res) => {
      const { variant, delta, reason } = req.body;
      if (
        typeof variant !== "string" ||
        !isInt(delta, -100000, 100000) ||
        delta === 0 ||
        !safeString(reason, 250)
      )
        throw bad(400, "Quantité et motif valides requis.");
      await tx(async (db) => {
        const row = (
          await db.query("SELECT id,quantity FROM commerce_variants WHERE id=$1 FOR UPDATE", [
            variant,
          ])
        ).rows[0];
        if (!row || row.quantity + delta < 0)
          throw bad(409, "Stock insuffisant ou référence inconnue.");
        await db.query("UPDATE commerce_variants SET quantity=$1 WHERE id=$2", [
          row.quantity + delta,
          variant,
        ]);
        await db.query(
          "INSERT INTO commerce_stock_movements (id,variant_id,delta,reason,actor_id) VALUES ($1,$2,$3,$4,$5)",
          [randomUUID(), variant, delta, reason.trim(), req.user.id],
        );
      });
      res.json({ ok: true });
    }),
  );
  app.put(
    "/api/commerce/profiles/:id",
    ...gate,
    wrap(async (req, res) => {
      const { rank } = req.body;
      if (
        !uuid.test(req.params.id) ||
        !["Bronze", "Business", "Silver", "Gold", "Platinum"].includes(rank)
      )
        throw bad(400, "Profil invalide.");
      if (
        !(
          await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'", [req.params.id])
        ).rows.length
      )
        throw bad(404, "Networker introuvable.");
      const old = (
        await pool.query("SELECT user_id FROM commerce_profiles WHERE user_id=$1", [req.params.id])
      ).rows[0];
      if (old)
        await pool.query("UPDATE commerce_profiles SET rank=$1,updated_by=$2 WHERE user_id=$3", [
          rank,
          req.user.id,
          req.params.id,
        ]);
      else
        await pool.query(
          "INSERT INTO commerce_profiles (user_id,rank,updated_by) VALUES ($1,$2,$3)",
          [req.params.id, rank, req.user.id],
        );
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/commerce/options",
    ...gate,
    wrap(async (req, res) => {
      if (!safeString(req.body.name)) throw bad(400, "Nom requis.");
      const lines = await resolveLines(pool, req.body.lines);
      const rules = await currentRules(pool);
      if (lines.some((line) => isHydro(line)))
        throw bad(400, "S Hydro est vendu uniquement séparément.");
      const id = randomUUID();
      await pool.query(
        "INSERT INTO commerce_custom_options (id,name,lines,created_by) VALUES ($1,$2,$3,$4)",
        [
          id,
          req.body.name.trim(),
          JSON.stringify(lines.map(({ variant, quantity }) => ({ variant, quantity }))),
          req.user.id,
        ],
      );
      res.status(201).json({ id });
    }),
  );
  app.post(
    "/api/commerce/orders",
    ...gate,
    wrap(async (req, res) => {
      const { buyerId, kind } = req.body;
      if (!uuid.test(buyerId || "") || !["pack", "hydro", "custom"].includes(kind))
        throw bad(400, "Commande invalide.");
      if (
        !(await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'", [buyerId])).rows
          .length
      )
        throw bad(400, "Sélectionnez un networker.");
      const rules = await currentRules(pool);
      let snapshot;
      if (kind === "pack") {
        const pack = rules.packs.find((p) => p.id === req.body.packId);
        if (
          !pack ||
          !Array.isArray(req.body.options) ||
          req.body.options.length !== pack.optionCount
        )
          throw bad(400, "Le nombre d’options doit correspondre au pack.");
        const custom = (
          await pool.query("SELECT id,name,lines FROM commerce_custom_options")
        ).rows.map((o) => ({ ...o, lines: json(o.lines) }));
        const all = [...rules.options, ...custom];
        const choices = req.body.options.map((id) => all.find((o) => o.id === id));
        if (choices.some((o) => !o)) throw bad(400, "Option inconnue.");
        const lines = await resolveLines(
          pool,
          choices.flatMap((o) => o.lines),
        );
        if (lines.some((l) => isHydro(l)))
          throw bad(400, "S Hydro est vendu uniquement séparément.");
        snapshot = {
          pack: { ...pack },
          options: choices.map((o) => ({ id: o.id, name: o.name })),
          lines,
          priceMillimes: pack.priceMillimes,
          pp: pack.pp,
        };
      } else if (kind === "hydro") {
        snapshot = {
          lines: await resolveLines(pool, [
            { variant: rules.hydro.variant, quantity: rules.hydro.quantity },
          ]),
          priceMillimes: rules.hydro.priceMillimes,
          pp: null,
          requiredRank: rules.hydro.requiredRank,
        };
      } else {
        if (!isInt(req.body.priceMillimes, 0, 1000000000))
          throw bad(400, "Montant personnalisé invalide.");
        const lines = await resolveLines(pool, req.body.lines);
        if (lines.some((line) => isHydro(line)))
          throw bad(400, "S Hydro est vendu uniquement séparément.");
        snapshot = { lines, priceMillimes: req.body.priceMillimes, pp: null };
      }
      const id = randomUUID();
      await pool.query(
        "INSERT INTO commerce_orders (id,buyer_id,kind,status,rules_version,snapshot,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id, buyerId, kind, "Brouillon", rules.version, JSON.stringify(snapshot), req.user.id],
      );
      res.status(201).json({ id });
    }),
  );
  app.post(
    "/api/commerce/orders/:id/validate",
    ...gate,
    wrap(async (req, res) => {
      if (!uuid.test(req.params.id)) throw bad(400, "Commande invalide.");
      await tx(async (db) => {
        const order = (
          await db.query(
            "SELECT id,buyer_id,kind,status,snapshot FROM commerce_orders WHERE id=$1 FOR UPDATE",
            [req.params.id],
          )
        ).rows[0];
        if (!order) throw bad(404, "Commande introuvable.");
        if (order.status !== "Brouillon") throw bad(409, "Commande déjà traitée.");
        const snapshot = json(order.snapshot);
        if (order.kind === "hydro") {
          const rank = (
            await db.query("SELECT rank FROM commerce_profiles WHERE user_id=$1 FOR UPDATE", [
              order.buyer_id,
            ])
          ).rows[0]?.rank;
          if (rank !== snapshot.requiredRank)
            throw bad(403, "Le profil doit être Silver à la validation.");
        }
        const locked = [];
        for (const line of snapshot.lines) {
          const row = (
            await db.query(
              "SELECT id,quantity,active FROM commerce_variants WHERE id=$1 FOR UPDATE",
              [line.variant],
            )
          ).rows[0];
          if (!row || !row.active || row.quantity < line.quantity)
            throw bad(409, `Stock insuffisant pour ${line.product} (${line.format}).`);
          locked.push({ line, quantity: row.quantity });
        }
        for (const { line, quantity } of locked) {
          await db.query("UPDATE commerce_variants SET quantity=$1 WHERE id=$2", [
            quantity - line.quantity,
            line.variant,
          ]);
          await db.query(
            "INSERT INTO commerce_stock_movements (id,variant_id,delta,reason,actor_id) VALUES ($1,$2,$3,$4,$5)",
            [
              randomUUID(),
              line.variant,
              -line.quantity,
              `Validation commande ${order.id}`,
              req.user.id,
            ],
          );
        }
        await db.query(
          "UPDATE commerce_orders SET status='Validée',validated_by=$1,validated_at=NOW() WHERE id=$2",
          [req.user.id, order.id],
        );
      });
      res.json({ ok: true });
    }),
  );
}
