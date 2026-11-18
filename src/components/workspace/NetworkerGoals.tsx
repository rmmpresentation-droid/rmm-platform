import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Task = { id: string; title: string; status: string };
export type Goal = {
  id: string;
  title: string;
  tasks: Task[];
  completed: number;
  total: number;
  progress: number;
};
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";
async function post(url: string, data: object, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Service indisponible");
}
function GoalCard({
  networker,
  goal,
  tasks,
  reload,
}: {
  networker: string;
  goal: Goal;
  tasks: Task[];
  reload: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [existing, setExisting] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const available = tasks.filter((task) => !goal.tasks.some((linked) => linked.id === task.id));
  async function submit(event: FormEvent, kind: "new" | "existing") {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await post(
        `/api/networkers/${networker}/goals/${goal.id}/tasks`,
        kind === "new" ? { title } : { task_id: existing },
      );
      setTitle("");
      setExisting("");
      setMessage(t("Tâche liée à l’objectif."));
      try {
        await reload();
      } catch {
        setError(t("Modification enregistrée, actualisation impossible. Rechargez la page."));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  async function unlink(id: string) {
    if (
      !window.confirm(t("Délier cette tâche de l’objectif ? Elle restera attribuée au networker."))
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await post(`/api/networkers/${networker}/goals/${goal.id}/tasks/${id}/unlink`, {}, "PUT");
      setMessage(t("Tâche déliée de l’objectif."));
      try {
        await reload();
      } catch {
        setError(t("Modification enregistrée, actualisation impossible. Rechargez la page."));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-lg border border-border p-4 space-y-3">
      <h4 className="font-semibold">{goal.title}</h4>
      <p className="text-sm">
        {t("Progression")} : {goal.progress}% · {goal.completed} / {goal.total}{" "}
        {t("tâches terminées")}
      </p>
      <progress
        className="w-full accent-[var(--gold)]"
        max={100}
        value={goal.progress}
        aria-label={`${t("Progression")} ${goal.title}`}
      />
      {goal.tasks.map((task) => (
        <p key={task.id} className="text-sm">
          {task.title} · {t(task.status)}{" "}
          <button
            type="button"
            disabled={busy}
            className="ml-2 text-[var(--gold)] underline disabled:opacity-50"
            onClick={() => void unlink(task.id)}
          >
            {t("Délier")}
          </button>
        </p>
      ))}
      {!goal.tasks.length && (
        <p className="text-sm text-muted-foreground">
          {t("Aucune tâche liée : progression à 0 %.")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={(e) => void submit(e, "new")} className="space-y-2">
          <label className="block text-sm">
            {t("Nouvelle tâche pour cet objectif")}
            <input
              className={`${field} mt-2`}
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button className={button} disabled={busy}>
            {t("Créer et lier la tâche")}
          </button>
        </form>
        <form onSubmit={(e) => void submit(e, "existing")} className="space-y-2">
          <label className="block text-sm">
            {t("Tâche déjà attribuée")}
            <select
              className={`${field} mt-2`}
              required
              value={existing}
              onChange={(e) => setExisting(e.target.value)}
            >
              <option value="">{t("Sélectionner")}</option>
              {available.map((task) => (
                <option value={task.id} key={task.id}>
                  {task.title} · {t(task.status)}
                </option>
              ))}
            </select>
          </label>
          <button className={button} disabled={busy || !available.length}>
            {t("Lier la tâche existante")}
          </button>
        </form>
      </div>
    </article>
  );
}
export function NetworkerGoals({
  networker,
  goals,
  tasks,
  reload,
}: {
  networker: string;
  goals: Goal[];
  tasks: Task[];
  reload: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await post(`/api/networkers/${networker}/goals`, { title });
      setTitle("");
      setMessage(t("Objectif créé."));
      try {
        await reload();
      } catch {
        setError(t("Modification enregistrée, actualisation impossible. Rechargez la page."));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl bg-card hairline p-5 space-y-4">
      <h3 className="font-serif text-xl">{t("Objectifs et progression")}</h3>
      <p className="text-sm text-muted-foreground">
        {t(
          "Les objectifs sont réservés à l’administration. Les tâches restent visibles par le networker.",
        )}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-2">
        <label className="block flex-1 min-w-48 text-sm">
          {t("Nouvel objectif")}
          <input
            className={`${field} mt-2`}
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <button className={button} disabled={busy}>
          {t("Créer l’objectif")}
        </button>
      </form>
      {!goals.length && (
        <p className="text-sm text-muted-foreground">{t("Aucun objectif défini.")}</p>
      )}
      {goals.map((goal) => (
        <GoalCard key={goal.id} networker={networker} goal={goal} tasks={tasks} reload={reload} />
      ))}
    </section>
  );
}
