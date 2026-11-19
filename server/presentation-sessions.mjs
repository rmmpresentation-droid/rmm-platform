import { randomUUID } from "node:crypto";
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function initializePresentationSessions(pool) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS presentation_sessions (id UUID PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, presenter_id UUID NOT NULL REFERENCES users(id), created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS presentation_session_networkers (session_id UUID NOT NULL REFERENCES presentation_sessions(id), user_id UUID NOT NULL REFERENCES users(id), attended BOOLEAN, PRIMARY KEY(session_id,user_id))",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS presentation_session_prospects (session_id UUID NOT NULL REFERENCES presentation_sessions(id), prospect_id UUID NOT NULL REFERENCES entries(id), attended BOOLEAN, PRIMARY KEY(session_id,prospect_id))",
  );
}
export function mountPresentationSessions(app, pool, { auth, admin, presenter }) {
  const manage = (user, session) =>
    admin(user.role) || (presenter(user) && session.presenter_id === user.id);
  async function session(id) {
    if (!idPattern.test(id)) return null;
    return (await pool.query("SELECT * FROM presentation_sessions WHERE id=$1", [id])).rows[0];
  }
  app.get("/api/presentation-sessions", auth, async (req, res, next) => {
    try {
      if (admin(req.user.role))
        return res.json(
          (
            await pool.query(
              "SELECT s.id,s.title,s.date,s.presenter_id,u.name AS presenter_name FROM presentation_sessions s JOIN users u ON s.presenter_id=u.id ORDER BY s.date DESC",
            )
          ).rows,
        );
      if (presenter(req.user))
        return res.json(
          (
            await pool.query(
              "SELECT s.id,s.title,s.date,s.presenter_id,u.name AS presenter_name FROM presentation_sessions s JOIN users u ON s.presenter_id=u.id WHERE s.presenter_id=$1 ORDER BY s.date DESC",
              [req.user.id],
            )
          ).rows,
        );
      return res.json(
        (
          await pool.query(
            "SELECT s.id,s.title,s.date,s.presenter_id,u.name AS presenter_name,a.attended FROM presentation_sessions s JOIN users u ON s.presenter_id=u.id JOIN presentation_session_networkers a ON a.session_id=s.id WHERE a.user_id=$1 ORDER BY s.date DESC",
            [req.user.id],
          )
        ).rows,
      );
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/presentation-sessions-mine", auth, async (req, res, next) => {
    try {
      if (req.user.role !== "networker") return res.status(403).json({ error: "Accès interdit" });
      res.json(
        (
          await pool.query(
            "SELECT s.id,s.title,s.date,u.name AS presenter_name,a.attended FROM presentation_sessions s JOIN users u ON s.presenter_id=u.id JOIN presentation_session_networkers a ON a.session_id=s.id WHERE a.user_id=$1 ORDER BY s.date DESC",
            [req.user.id],
          )
        ).rows,
      );
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/presentation-sessions", auth, async (req, res, next) => {
    try {
      if (!admin(req.user.role)) return res.status(403).json({ error: "Accès interdit" });
      const { title, date, presenter_id } = req.body;
      if (
        typeof title !== "string" ||
        !title.trim() ||
        title.length > 120 ||
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        !idPattern.test(presenter_id || "")
      )
        return res.status(400).json({ error: "Titre, date et présentateur valides requis." });
      const p = (
        await pool.query(
          "SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND (role='presentateur' OR (is_presenter=TRUE AND (role='admin' OR role='networker')))",
          [presenter_id],
        )
      ).rows[0];
      if (!p) return res.status(400).json({ error: "Présentateur invalide." });
      const id = randomUUID();
      await pool.query(
        "INSERT INTO presentation_sessions (id,title,date,presenter_id,created_by) VALUES ($1,$2,$3,$4,$5)",
        [id, title.trim(), date, presenter_id, req.user.id],
      );
      res.status(201).json({ id });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/presentation-sessions/:id/attendance", auth, async (req, res, next) => {
    try {
      const s = await session(req.params.id);
      if (!s || !manage(req.user, s)) return res.status(403).json({ error: "Accès interdit" });
      const members = (
        await pool.query(
          "SELECT a.user_id AS id,u.name,a.attended FROM presentation_session_networkers a JOIN users u ON u.id=a.user_id WHERE a.session_id=$1",
          [s.id],
        )
      ).rows.map((r) => ({ ...r, kind: "networker" }));
      const prospects = (
        await pool.query(
          "SELECT a.prospect_id AS id,e.title AS name,a.attended FROM presentation_session_prospects a JOIN entries e ON e.id=a.prospect_id WHERE a.session_id=$1",
          [s.id],
        )
      ).rows.map((r) => ({ ...r, kind: "prospect" }));
      res.json([...members, ...prospects]);
    } catch (e) {
      next(e);
    }
  });
  app.put(
    "/api/presentation-sessions/:id/participants/:kind/:participantId",
    auth,
    async (req, res, next) => {
      try {
        const s = await session(req.params.id);
        if (!s || !manage(req.user, s)) return res.status(403).json({ error: "Accès interdit" });
        const { kind, participantId } = req.params;
        const { attended } = req.body;
        if (
          !["networker", "prospect"].includes(kind) ||
          !idPattern.test(participantId) ||
          ![true, false, null].includes(attended)
        )
          return res.status(400).json({ error: "Participant ou état invalide." });
        const table =
            kind === "networker"
              ? "presentation_session_networkers"
              : "presentation_session_prospects",
          col = kind === "networker" ? "user_id" : "prospect_id";
        const old = await pool.query(
          `SELECT ${col} FROM ${table} WHERE session_id=$1 AND ${col}=$2`,
          [s.id, participantId],
        );
        if (!old.rows.length) {
          if (!admin(req.user.role))
            return res
              .status(403)
              .json({ error: "Seul un administrateur ajoute les participants." });
          const target =
            kind === "networker"
              ? await pool.query("SELECT id FROM users WHERE id=$1 AND role='networker'", [
                  participantId,
                ])
              : await pool.query("SELECT id FROM entries WHERE id=$1 AND section='prospects'", [
                  participantId,
                ]);
          if (!target.rows.length)
            return res.status(400).json({ error: "Participant introuvable." });
          await pool.query(`INSERT INTO ${table} (session_id,${col},attended) VALUES ($1,$2,$3)`, [
            s.id,
            participantId,
            attended,
          ]);
        } else
          await pool.query(`UPDATE ${table} SET attended=$1 WHERE session_id=$2 AND ${col}=$3`, [
            attended,
            s.id,
            participantId,
          ]);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );
}
