import { randomUUID } from "node:crypto";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day = 86400000;
const format = (d) => d.toISOString().slice(0, 10);
const dateAt = (start, days) => new Date(start.getTime() + days * day);
function monthAt(start, n) {
  const y = start.getUTCFullYear(),
    m = start.getUTCMonth() + n,
    d = start.getUTCDate();
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last)));
}
export function schedule(startText, duration, frequency) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startText) ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 366
  )
    throw new Error("Date ou durée invalide (1 à 366 jours).");
  const start = new Date(`${startText}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || format(start) !== startText)
    throw new Error("Date de début invalide.");
  if (!["daily", "weekly", "monthly"].includes(frequency)) throw new Error("Fréquence invalide.");
  const end = dateAt(start, duration - 1);
  if (frequency === "monthly" && end < monthAt(start, 1))
    throw new Error("Une tâche mensuelle exige un objectif de plus d’un mois.");
  const result = [];
  if (frequency === "daily")
    for (let i = 0; i < duration; i++) result.push(format(dateAt(start, i)));
  else {
    let n = 1,
      previous = start;
    while (previous <= end) {
      const next = frequency === "weekly" ? dateAt(start, 7 * n) : monthAt(start, n);
      const due = dateAt(next, -1);
      result.push(format(due > end ? end : due));
      previous = next;
      n++;
    }
  }
  return result;
}
export async function initializeObjectives(pool) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS objective_plans (id UUID PRIMARY KEY, title TEXT NOT NULL, start_date TEXT NOT NULL, duration INTEGER NOT NULL, end_date TEXT NOT NULL, created_by UUID NOT NULL REFERENCES users(id), legacy_goal_id UUID UNIQUE REFERENCES networker_goals(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS objective_members (plan_id UUID NOT NULL REFERENCES objective_plans(id), user_id UUID NOT NULL REFERENCES users(id), PRIMARY KEY(plan_id,user_id))",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS objective_occurrences (id UUID PRIMARY KEY, plan_id UUID NOT NULL REFERENCES objective_plans(id), title TEXT NOT NULL, frequency TEXT NOT NULL, due_date TEXT NOT NULL, legacy_task_id UUID REFERENCES entries(id))",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS objective_progress (occurrence_id UUID NOT NULL REFERENCES objective_occurrences(id), user_id UUID NOT NULL REFERENCES users(id), completed BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(occurrence_id,user_id))",
  );
}
export function mountObjectives(app, pool, { auth, admin }) {
  app.use("/api/objectives", (req, res, next) =>
    process.env.NODE_ENV === "production" && req.method !== "GET"
      ? res.status(403).json({ error: "Module réservé à la préproduction." })
      : next(),
  );
  app.get("/api/objectives", auth, async (req, res, next) => {
    try {
      if (!admin(req.user.role) && req.user.role !== "networker")
        return res.status(403).json({ error: "Accès interdit" });
      const plans = (await pool.query("SELECT * FROM objective_plans ORDER BY created_at DESC"))
        .rows;
      const members = (
        await pool.query(
          "SELECT m.plan_id,m.user_id,u.name FROM objective_members m JOIN users u ON u.id=m.user_id",
        )
      ).rows;
      const occurrences = (await pool.query("SELECT * FROM objective_occurrences")).rows;
      const progress = (
        await pool.query("SELECT occurrence_id,user_id,completed FROM objective_progress")
      ).rows;
      const legacyProgress = (await pool.query("SELECT task_id,user_id,status FROM task_progress"))
        .rows;
      const progressMap = new Map(
        progress.map((x) => [`${x.occurrence_id}:${x.user_id}`, x.completed]),
      );
      const legacyMap = new Map(legacyProgress.map((x) => [`${x.task_id}:${x.user_id}`, x.status]));
      const oldTasks = (
        await pool.query("SELECT id,status,extra FROM entries WHERE section='taches'")
      ).rows;
      const taskMap = new Map(oldTasks.map((x) => [x.id, x]));
      const output = plans
        .filter(
          (p) =>
            admin(req.user.role) ||
            members.some((m) => m.plan_id === p.id && m.user_id === req.user.id),
        )
        .map((p) => {
          const group = members
            .filter((m) => m.plan_id === p.id)
            .filter((m) => admin(req.user.role) || m.user_id === req.user.id);
          const items = occurrences
            .filter((o) => o.plan_id === p.id)
            .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.title.localeCompare(b.title));
          const people = group.map((m) => {
            const tasks = items.map((o) => {
              let completed = progressMap.get(`${o.id}:${m.user_id}`) === true;
              if (o.legacy_task_id) {
                const old = taskMap.get(o.legacy_task_id);
                const state = legacyMap.get(`${o.legacy_task_id}:${m.user_id}`);
                completed = state
                  ? state === "Terminée"
                  : !!old && !JSON.parse(old.extra || "{}").audience && old.status === "Terminée";
              }
              return {
                id: o.id,
                title: o.title,
                frequency: o.frequency,
                due_date: o.due_date,
                completed,
                legacy_task_id: o.legacy_task_id,
              };
            });
            const completed = tasks.filter((t) => t.completed).length;
            return {
              id: m.user_id,
              name: m.name,
              tasks,
              completed,
              total: tasks.length,
              progress: tasks.length ? Math.round((100 * completed) / tasks.length) : 0,
            };
          });
          const completed = people.reduce((n, x) => n + x.completed, 0),
            total = people.reduce((n, x) => n + x.total, 0);
          return {
            id: p.id,
            title: p.title,
            start_date: p.start_date,
            end_date: p.end_date,
            duration: p.duration,
            legacy_goal_id: p.legacy_goal_id,
            people,
            completed,
            total,
            progress: total ? Math.round((100 * completed) / total) : 0,
          };
        });
      let drafts = [];
      if (admin(req.user.role)) {
        const old = (
          await pool.query(
            "SELECT g.id,g.networker_id,g.title,u.name FROM networker_goals g JOIN users u ON u.id=g.networker_id ORDER BY g.created_at DESC",
          )
        ).rows;
        drafts = old.filter((g) => !plans.some((p) => p.legacy_goal_id === g.id));
      }
      res.json({ plans: output, drafts });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/objectives", auth, async (req, res, next) => {
    if (!admin(req.user.role)) return res.status(403).json({ error: "Accès interdit" });
    const { title, start_date, duration, mode, ids, tasks, legacy_goal_id } = req.body || {};
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 160 ||
      !Array.isArray(tasks) ||
      tasks.length > 20 ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      ids.some((id) => typeof id !== "string" || !uuid.test(id)) ||
      new Set(ids).size !== ids.length ||
      !["custom", "tree"].includes(mode) ||
      (mode === "tree" && ids.length !== 1) ||
      (legacy_goal_id && !uuid.test(legacy_goal_id))
    )
      return res.status(400).json({ error: "Objectif ou destinataires invalides." });
    let defs = [];
    try {
      for (const task of tasks) {
        if (
          !task ||
          typeof task.title !== "string" ||
          !task.title.trim() ||
          task.title.length > 160
        )
          throw new Error("Intitulé de tâche invalide.");
        for (const due of schedule(start_date, duration, task.frequency))
          defs.push({
            id: randomUUID(),
            title: task.title.trim(),
            frequency: task.frequency,
            due_date: due,
            legacy_task_id: null,
          });
      }
      schedule(start_date, duration, "daily");
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const network = (
        await client.query("SELECT id,name,sponsor_id,is_active FROM users WHERE role='networker'")
      ).rows;
      let members = ids.map((id) => network.find((u) => u.id === id));
      if (members.some((u) => !u || !u.is_active)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Choisissez des networkers actifs." });
      }
      if (mode === "tree") {
        const seen = new Set(ids);
        let queue = [...ids];
        while (queue.length) {
          const parent = queue.shift();
          for (const u of network.filter((n) => n.sponsor_id === parent)) {
            if (!seen.has(u.id)) {
              seen.add(u.id);
              queue.push(u.id);
            }
          }
        }
        members = network.filter((u) => seen.has(u.id) && u.is_active);
      }
      if (members.length > 100) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Maximum 100 destinataires actifs." });
      }
      let legacy = null;
      if (legacy_goal_id) {
        legacy = (
          await client.query(
            "SELECT id,title,networker_id FROM networker_goals WHERE id=$1 FOR UPDATE",
            [legacy_goal_id],
          )
        ).rows[0];
        if (
          !legacy ||
          mode !== "custom" ||
          members.length !== 1 ||
          members[0].id !== legacy.networker_id
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Brouillon ou destinataire invalide." });
        }
        if (
          (
            await client.query("SELECT id FROM objective_plans WHERE legacy_goal_id=$1", [
              legacy.id,
            ])
          ).rows.length
        ) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "Brouillon déjà activé." });
        }
        const linked = (
          await client.query(
            "SELECT task_id FROM networker_goal_tasks WHERE goal_id=$1 AND active=TRUE",
            [legacy.id],
          )
        ).rows;
        for (const link of linked) {
          const row = (
            await client.query("SELECT id,title FROM entries WHERE id=$1 AND section='taches'", [
              link.task_id,
            ])
          ).rows[0];
          if (row)
            defs.push({
              id: randomUUID(),
              title: row.title,
              frequency: "once",
              due_date: "",
              legacy_task_id: row.id,
            });
        }
      }
      if (!defs.length || defs.length > 2000 || defs.length * members.length > 20000) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Ajoutez des tâches ; maximum 2 000 occurrences et 20 000 affectations.",
        });
      }
      const plan = randomUUID(),
        end = format(dateAt(new Date(`${start_date}T00:00:00Z`), duration - 1));
      await client.query(
        "INSERT INTO objective_plans (id,title,start_date,duration,end_date,created_by,legacy_goal_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [plan, title.trim(), start_date, duration, end, req.user.id, legacy?.id || null],
      );
      for (const member of members)
        await client.query("INSERT INTO objective_members (plan_id,user_id) VALUES ($1,$2)", [
          plan,
          member.id,
        ]);
      for (const o of defs)
        await client.query(
          "INSERT INTO objective_occurrences (id,plan_id,title,frequency,due_date,legacy_task_id) VALUES ($1,$2,$3,$4,$5,$6)",
          [o.id, plan, o.title, o.frequency, o.due_date, o.legacy_task_id],
        );
      await client.query("COMMIT");
      res.status(201).json({ id: plan, members: members.length, occurrences: defs.length });
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      if (e.code === "23505") return res.status(409).json({ error: "Objectif déjà activé." });
      next(e);
    } finally {
      client.release();
    }
  });
  app.put("/api/objectives/occurrences/:id", auth, async (req, res, next) => {
    try {
      if (req.user.role !== "networker")
        return res.status(403).json({ error: "Réservé au networker destinataire." });
      if (!uuid.test(req.params.id) || typeof req.body.completed !== "boolean")
        return res.status(400).json({ error: "Données invalides." });
      const occ = (
        await pool.query(
          "SELECT id,plan_id,legacy_task_id FROM objective_occurrences WHERE id=$1",
          [req.params.id],
        )
      ).rows[0];
      if (
        !occ ||
        !(
          await pool.query(
            "SELECT user_id FROM objective_members WHERE plan_id=$1 AND user_id=$2",
            [occ.plan_id, req.user.id],
          )
        ).rows.length
      )
        return res.status(404).json({ error: "Tâche introuvable." });
      if (occ.legacy_task_id) {
        const status = req.body.completed ? "Terminée" : "À faire";
        await pool.query(
          "INSERT INTO task_progress (task_id,user_id,status) VALUES ($1,$2,$3) ON CONFLICT (task_id,user_id) DO UPDATE SET status=EXCLUDED.status",
          [occ.legacy_task_id, req.user.id, status],
        );
      } else {
        await pool.query(
          "INSERT INTO objective_progress (occurrence_id,user_id,completed) VALUES ($1,$2,$3) ON CONFLICT (occurrence_id,user_id) DO UPDATE SET completed=EXCLUDED.completed",
          [occ.id, req.user.id, req.body.completed],
        );
      }
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
}
