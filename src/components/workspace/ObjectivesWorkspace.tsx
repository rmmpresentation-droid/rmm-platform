import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Frequency = "daily" | "weekly" | "monthly";
type Person = { id: string; name: string; is_active: boolean };
type Task = {
  id: string;
  title: string;
  frequency: string;
  due_date: string;
  completed: boolean;
  legacy_task_id: string | null;
};
type Member = {
  id: string;
  name: string;
  tasks: Task[];
  completed: number;
  total: number;
  progress: number;
};
type Plan = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  duration: number;
  people: Member[];
  completed: number;
  total: number;
  progress: number;
};
type Draft = { id: string; name: string; title: string; networker_id: string };
type Data = { plans: Plan[]; drafts: Draft[] };
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Service indisponible");
  return result as T;
}
export function ObjectivesWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [data, setData] = useState<Data>({ plans: [], drafts: [] });
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState<"custom" | "tree">("custom");
  const [ids, setIds] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState<{ title: string; frequency: Frequency }[]>([
    { title: "", frequency: "daily" },
  ]);
  async function load() {
    const result = await api<Data>("/api/objectives");
    setData(result);
    if (isAdmin) setPeople(await api<Person[]>("/api/networkers"));
  }
  useEffect(() => {
    let active = true;
    async function initial() {
      try {
        const result = await api<Data>("/api/objectives");
        const users = isAdmin ? await api<Person[]>("/api/networkers") : [];
        if (active) {
          setData(result);
          setPeople(users);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Service indisponible");
      }
    }
    void initial();
    return () => {
      active = false;
    };
  }, [isAdmin]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/objectives", {
        method: "POST",
        body: JSON.stringify({
          title,
          start_date: start,
          duration,
          mode,
          ids,
          tasks: tasks.filter((x) => x.title.trim()),
          ...(draft ? { legacy_goal_id: draft } : {}),
        }),
      });
      setTitle("");
      setStart("");
      setDuration(30);
      setMode("custom");
      setIds([]);
      setDraft("");
      setTasks([{ title: "", frequency: "daily" }]);
      setMessage(t("Objectif enregistré."));
      try {
        await load();
      } catch {
        setError(t("Modification enregistrée, actualisation impossible. Rechargez la page."));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(task: Task) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/objectives/occurrences/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: !task.completed }),
      });
      try {
        await load();
      } catch {
        setError(t("Modification enregistrée, actualisation impossible. Rechargez la page."));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  function chooseDraft(id: string) {
    setDraft(id);
    const d = data.drafts.find((x) => x.id === id);
    if (d) {
      setTitle(d.title);
      setMode("custom");
      setIds([d.networker_id]);
    } else {
      setTitle("");
      setIds([]);
    }
  }
  const activePeople = people.filter((p) => p.is_active);
  return (
    <section className="mt-8 space-y-5">
      <h2 className="font-serif text-2xl">{t("Objectifs")}</h2>
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
      {isAdmin && (
        <details className="rounded-xl bg-card hairline p-5">
          <summary className="cursor-pointer font-semibold">{t("Définir un objectif")}</summary>
          <form onSubmit={(e) => void create(e)} className="mt-4 space-y-4">
            {data.drafts.length > 0 && (
              <label className="block text-sm">
                {t("Reprendre un ancien objectif (facultatif)")}
                <select
                  className={`${field} mt-2`}
                  value={draft}
                  onChange={(e) => chooseDraft(e.target.value)}
                >
                  <option value="">{t("Nouvel objectif")}</option>
                  {data.drafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} · {d.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {draft && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "Les tâches déjà liées deviennent des tâches uniques sans échéance inventée et conservent leur progression.",
                )}
              </p>
            )}
            <label className="block text-sm">
              {t("Objectif")}
              <input
                className={`${field} mt-2`}
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                {t("Date de début")}
                <input
                  type="date"
                  required
                  className={`${field} mt-2`}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                {t("Durée en jours (1 à 366)")}
                <input
                  type="number"
                  required
                  min={1}
                  max={366}
                  className={`${field} mt-2`}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
            </div>
            <fieldset disabled={!!draft}>
              <legend className="text-sm">{t("Destinataires")}</legend>
              <div className="my-2 flex flex-wrap gap-4 text-sm">
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "custom"}
                    onChange={() => {
                      setMode("custom");
                      setIds([]);
                    }}
                  />{" "}
                  {t("Networker ou groupe personnalisé")}
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "tree"}
                    onChange={() => {
                      setMode("tree");
                      setIds([]);
                    }}
                  />{" "}
                  {t("Networker et son réseau descendant")}
                </label>
              </div>
              {mode === "tree" ? (
                <select
                  required
                  className={field}
                  value={ids[0] || ""}
                  onChange={(e) => setIds(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">{t("Sélectionner un networker")}</option>
                  {activePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="max-h-48 overflow-auto rounded-md border border-border p-3 space-y-1">
                  {activePeople.map((p) => (
                    <label className="block text-sm" key={p.id}>
                      <input
                        type="checkbox"
                        checked={ids.includes(p.id)}
                        onChange={(e) =>
                          setIds(
                            e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id),
                          )
                        }
                      />{" "}
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            {draft && (
              <p className="text-sm">
                {t("Destinataire")} : {data.drafts.find((d) => d.id === draft)?.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t(
                "Les destinataires actifs sont figés à la création. Chaque personne a sa propre progression.",
              )}
            </p>
            <fieldset>
              <legend className="text-sm font-semibold">{t("Tâches récurrentes")}</legend>
              <p className="my-2 text-xs text-muted-foreground">
                {t(
                  "Quotidiennes, hebdomadaires ou mensuelles depuis le début ; la dernière période est limitée à la fin de l’objectif.",
                )}
              </p>
              {tasks.map((x, i) => (
                <div key={i} className="mb-2 flex flex-wrap gap-2">
                  <input
                    aria-label={`${t("Tâche")} ${i + 1}`}
                    className={`${field} min-w-48 flex-1`}
                    maxLength={160}
                    placeholder={t("Intitulé de la tâche")}
                    value={x.title}
                    onChange={(e) =>
                      setTasks(tasks.map((v, j) => (j === i ? { ...v, title: e.target.value } : v)))
                    }
                  />
                  <select
                    aria-label={t("Fréquence")}
                    className={`${field} max-w-44`}
                    value={x.frequency}
                    onChange={(e) =>
                      setTasks(
                        tasks.map((v, j) =>
                          j === i ? { ...v, frequency: e.target.value as Frequency } : v,
                        ),
                      )
                    }
                  >
                    <option value="daily">{t("Chaque jour")}</option>
                    <option value="weekly">{t("Chaque semaine")}</option>
                    <option value="monthly">{t("Chaque mois")}</option>
                  </select>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-red-500"
                      onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                    >
                      {t("Retirer")}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-[var(--gold)] underline"
                disabled={tasks.length >= 20}
                onClick={() => setTasks([...tasks, { title: "", frequency: "daily" }])}
              >
                {t("Ajouter une tâche récurrente")}
              </button>
            </fieldset>
            <button disabled={busy || ids.length === 0} className={button}>
              {t("Créer l’objectif")}
            </button>
          </form>
        </details>
      )}
      {!data.plans.length && (
        <p className="rounded-xl border border-border p-5 text-sm">
          {t("Aucun objectif planifié.")}
        </p>
      )}
      {data.plans.map((plan) => (
        <article key={plan.id} className="rounded-xl bg-card hairline p-5 space-y-3">
          <div className="flex flex-wrap justify-between gap-2">
            <h3 className="font-semibold text-lg">{plan.title}</h3>
            <span className="text-sm text-muted-foreground">
              {plan.start_date} → {plan.end_date} · {plan.duration} {t("jours")}
            </span>
          </div>
          <p className="text-sm">
            {t(isAdmin ? "Progression globale" : "Progression")} : {plan.progress}% ·{" "}
            {plan.completed} / {plan.total} {t("tâches terminées")}
          </p>
          <progress
            className="w-full accent-[var(--gold)]"
            max={100}
            value={plan.progress}
            aria-label={`${t("Progression")} ${plan.title}`}
          />
          {plan.people.map((member) => (
            <details
              key={member.id}
              open={!isAdmin}
              className="rounded-lg border border-border p-3"
            >
              <summary className="cursor-pointer text-sm font-semibold">
                {isAdmin ? `${member.name} · ` : ""}
                {member.progress}% · {member.completed}/{member.total}
              </summary>
              <div className="mt-3 max-h-96 overflow-y-auto space-y-2">
                {member.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    {!isAdmin ? (
                      <input
                        aria-label={`${t("Terminée")} : ${task.title} ${task.due_date}`}
                        disabled={busy}
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => void toggle(task)}
                      />
                    ) : (
                      <span aria-hidden="true">{task.completed ? "✓" : "○"}</span>
                    )}
                    <span>
                      {task.title} ·{" "}
                      {t(
                        task.frequency === "daily"
                          ? "Chaque jour"
                          : task.frequency === "weekly"
                            ? "Chaque semaine"
                            : task.frequency === "monthly"
                              ? "Chaque mois"
                              : "Tâche unique",
                      )}{" "}
                      · {task.due_date || t("Sans échéance")} ·{" "}
                      {t(task.completed ? "Terminée" : "À faire")}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </article>
      ))}
    </section>
  );
}
