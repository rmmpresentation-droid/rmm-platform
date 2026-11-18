import { randomUUID } from "node:crypto";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds = ["invoice_income", "invoice_expense", "expense"];
const methods = ["Espèces", "Virement", "Chèque", "Autre"];
const error = (status, message) => Object.assign(new Error(message), { status });
const dateValid = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const amountValid = (value) => Number.isSafeInteger(value) && value > 0 && value <= 1000000000;
function validateDocument(x) {
  if (
    !x ||
    !kinds.includes(x.kind) ||
    typeof x.title !== "string" ||
    !x.title.trim() ||
    x.title.length > 160 ||
    typeof x.reference !== "string" ||
    x.reference.length > 100 ||
    typeof x.counterparty !== "string" ||
    x.counterparty.length > 160 ||
    !dateValid(x.issue_date) ||
    typeof x.due_date !== "string" ||
    (x.due_date && (!dateValid(x.due_date) || x.due_date < x.issue_date)) ||
    !amountValid(x.amount_millimes) ||
    typeof x.notes !== "string" ||
    x.notes.length > 1000
  )
    throw error(400, "Vérifiez le type, le libellé, les dates et le montant.");
}
export async function initializeAccounting(pool) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS accounting_documents (id UUID PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, reference TEXT NOT NULL DEFAULT '', counterparty TEXT NOT NULL DEFAULT '', issue_date TEXT NOT NULL, due_date TEXT NOT NULL DEFAULT '', amount_millimes INTEGER NOT NULL CHECK (amount_millimes > 0), notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', created_by UUID NOT NULL REFERENCES users(id), updated_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS accounting_payments (id UUID PRIMARY KEY, document_id UUID NOT NULL REFERENCES accounting_documents(id), amount_millimes INTEGER NOT NULL CHECK (amount_millimes > 0), paid_date TEXT NOT NULL, method TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS accounting_document_history (id UUID PRIMARY KEY, document_id UUID NOT NULL REFERENCES accounting_documents(id), action TEXT NOT NULL, before_data TEXT NOT NULL, actor_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
}
export function mountAccounting(app, pool, { auth, admin }) {
  const gate = [
    auth,
    (req, res, next) =>
      admin(req.user.role)
        ? next()
        : res.status(403).json({ error: "Accès réservé à l’administration." }),
    (req, res, next) =>
      process.env.NODE_ENV === "production" && req.method !== "GET"
        ? res.status(403).json({ error: "Module réservé à la préproduction." })
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
      const value = await fn(client);
      await client.query("COMMIT");
      return value;
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw e;
    } finally {
      client.release();
    }
  };
  const validId = (id) => {
    if (!uuid.test(id)) throw error(400, "Identifiant invalide.");
  };
  app.get(
    "/api/accounting",
    ...gate,
    wrap(async (req, res) => {
      const documents = (
        await pool.query(
          "SELECT id,kind,title,reference,counterparty,issue_date,due_date,amount_millimes,notes,status,created_at FROM accounting_documents ORDER BY issue_date DESC,created_at DESC",
        )
      ).rows;
      const payments = (
        await pool.query(
          "SELECT id,document_id,amount_millimes,paid_date,method,notes,created_at FROM accounting_payments ORDER BY paid_date DESC,created_at DESC",
        )
      ).rows;
      const history = (
        await pool.query(
          "SELECT id,document_id,action,before_data,created_at FROM accounting_document_history ORDER BY created_at DESC",
        )
      ).rows.map((row) => ({ ...row, before_data: JSON.parse(row.before_data) }));
      res.json({ documents, payments, history });
    }),
  );
  app.post(
    "/api/accounting/documents",
    ...gate,
    wrap(async (req, res) => {
      validateDocument(req.body);
      const { kind, title, reference, counterparty, issue_date, due_date, amount_millimes, notes } =
        req.body;
      const row = await pool.query(
        "INSERT INTO accounting_documents (id,kind,title,reference,counterparty,issue_date,due_date,amount_millimes,notes,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id",
        [
          randomUUID(),
          kind,
          title.trim(),
          reference.trim(),
          counterparty.trim(),
          issue_date,
          due_date,
          amount_millimes,
          notes.trim(),
          req.user.id,
        ],
      );
      res.status(201).json({ id: row.rows[0].id });
    }),
  );
  app.put(
    "/api/accounting/documents/:id",
    ...gate,
    wrap(async (req, res) => {
      validId(req.params.id);
      validateDocument(req.body);
      const x = req.body;
      await tx(async (db) => {
        const doc = (
          await db.query("SELECT * FROM accounting_documents WHERE id=$1 FOR UPDATE", [
            req.params.id,
          ])
        ).rows[0];
        if (!doc) throw error(404, "Document introuvable.");
        if (doc.status !== "active")
          throw error(409, "Un document annulé ne peut pas être modifié.");
        if (
          (await db.query("SELECT id FROM accounting_payments WHERE document_id=$1", [doc.id])).rows
            .length
        )
          throw error(409, "Un document avec règlements ne peut pas être modifié.");
        await db.query(
          "INSERT INTO accounting_document_history (id,document_id,action,before_data,actor_id) VALUES ($1,$2,$3,$4,$5)",
          [randomUUID(), doc.id, "update", JSON.stringify(doc), req.user.id],
        );
        await db.query(
          "UPDATE accounting_documents SET kind=$1,title=$2,reference=$3,counterparty=$4,issue_date=$5,due_date=$6,amount_millimes=$7,notes=$8,updated_by=$9,updated_at=NOW() WHERE id=$10",
          [
            x.kind,
            x.title.trim(),
            x.reference.trim(),
            x.counterparty.trim(),
            x.issue_date,
            x.due_date,
            x.amount_millimes,
            x.notes.trim(),
            req.user.id,
            doc.id,
          ],
        );
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/accounting/documents/:id/cancel",
    ...gate,
    wrap(async (req, res) => {
      validId(req.params.id);
      await tx(async (db) => {
        const doc = (
          await db.query("SELECT * FROM accounting_documents WHERE id=$1 FOR UPDATE", [
            req.params.id,
          ])
        ).rows[0];
        if (!doc) throw error(404, "Document introuvable.");
        if (doc.status !== "active") throw error(409, "Document déjà annulé.");
        if (
          (await db.query("SELECT id FROM accounting_payments WHERE document_id=$1", [doc.id])).rows
            .length
        )
          throw error(409, "Un document avec règlements ne peut pas être annulé.");
        await db.query(
          "INSERT INTO accounting_document_history (id,document_id,action,before_data,actor_id) VALUES ($1,$2,$3,$4,$5)",
          [randomUUID(), doc.id, "cancel", JSON.stringify(doc), req.user.id],
        );
        await db.query(
          "UPDATE accounting_documents SET status='cancelled',updated_by=$1,updated_at=NOW() WHERE id=$2",
          [req.user.id, doc.id],
        );
      });
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/accounting/documents/:id/payments",
    ...gate,
    wrap(async (req, res) => {
      validId(req.params.id);
      const { amount_millimes, paid_date, method, notes } = req.body || {};
      if (
        !amountValid(amount_millimes) ||
        !dateValid(paid_date) ||
        !methods.includes(method) ||
        typeof notes !== "string" ||
        notes.length > 1000
      )
        throw error(400, "Vérifiez le montant, la date et le mode du règlement.");
      const id = await tx(async (db) => {
        const doc = (
          await db.query(
            "SELECT id,status,amount_millimes FROM accounting_documents WHERE id=$1 FOR UPDATE",
            [req.params.id],
          )
        ).rows[0];
        if (!doc) throw error(404, "Document introuvable.");
        if (doc.status !== "active") throw error(409, "Document annulé.");
        const previous = (
          await db.query("SELECT amount_millimes FROM accounting_payments WHERE document_id=$1", [
            doc.id,
          ])
        ).rows.reduce((sum, p) => sum + p.amount_millimes, 0);
        if (previous + amount_millimes > doc.amount_millimes)
          throw error(409, "Le règlement dépasse le solde restant.");
        const id = randomUUID();
        await db.query(
          "INSERT INTO accounting_payments (id,document_id,amount_millimes,paid_date,method,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [id, doc.id, amount_millimes, paid_date, method, notes.trim(), req.user.id],
        );
        return id;
      });
      res.status(201).json({ id });
    }),
  );
}
