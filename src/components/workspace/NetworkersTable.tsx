import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/lib/i18n";

type Person = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  prospect_count: number;
};
type Profile = {
  person: Person & { sponsor_id: string | null; is_presenter: boolean; created_at: string };
  sponsor: { id: string; name: string } | null;
  downlines: { id: string; name: string }[];
  prospects: { id: string; title: string; status: string }[];
  tasks: { id: string; title: string; status: string }[];
  formations: {
    training_id: string;
    title: string;
    date: string;
    attended: boolean;
    quiz_score: string;
  }[];
  meetings: { id: string; title: string; status: string; date: string }[];
  orders: { id: string; kind: string; status: string; created_at: string }[];
  notes: { id: string; content: string; author: string; created_at: string }[];
};
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Service indisponible");
  return data as T;
}
export function NetworkersTable() {
  const { t } = useLanguage();
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [due, setDue] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    api<Person[]>("/api/networkers")
      .then(setPeople)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setProfile(null);
    setNote("");
    setTask("");
    setDue("");
    setMessage("");
    setError("");
    if (!selected) return;
    let cancelled = false;
    api<Profile>(`/api/networkers/${selected}/profile`)
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setSponsor(p.person.sponsor_id || "");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);
  async function refresh() {
    const p = await api<Profile>(`/api/networkers/${selected}/profile`);
    setProfile(p);
    setSponsor(p.person.sponsor_id || "");
  }
  async function send(e: FormEvent, kind: "note" | "task" | "sponsor") {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (kind === "note")
        await api(`/api/networkers/${selected}/notes`, {
          method: "POST",
          body: JSON.stringify({ content: note }),
        });
      if (kind === "task")
        await api("/api/entries/taches", {
          method: "POST",
          body: JSON.stringify({
            title: task,
            detail: "",
            owner: "",
            date: due,
            status: "À faire",
            extra: { priority: "Normale", audience: "Networker spécifique", target: selected },
          }),
        });
      if (kind === "sponsor")
        await api(`/api/networkers/${selected}/sponsor`, {
          method: "PUT",
          body: JSON.stringify({ sponsor_id: sponsor }),
        });
      setNote("");
      setTask("");
      setDue("");
      setMessage(t("Modification enregistrée."));
      try {
        await refresh();
      } catch {
        setError(t("Modification enregistrée, actualisation impossible. Rechargez la page."));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  const filtered = people.filter((p) =>
    `${p.name} ${p.email}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()),
  );
  return (
    <section className="mt-8 space-y-5">
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
      {!selected ? (
        <div className="rounded-xl bg-card hairline p-6">
          <h2 className="font-serif text-2xl">{t("Tableau des networkers")}</h2>
          <label className="mt-4 block max-w-md text-sm">
            {t("Rechercher par nom ou e-mail")}
            <input
              className={`${field} mt-2`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3">{t("Nom")}</th>
                  <th>{t("E-mail")}</th>
                  <th>{t("Compte")}</th>
                  <th>{t("Prospects")}</th>
                  <th>
                    <span className="sr-only">{t("Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td>{p.email}</td>
                    <td>{t(p.is_active ? "Actif" : "Désactivé")}</td>
                    <td>{p.prospect_count}</td>
                    <td>
                      <button
                        type="button"
                        className="text-[var(--gold)] underline"
                        onClick={() => setSelected(p.id)}
                      >
                        {t("Voir la fiche")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <p className="mt-4 text-sm text-muted-foreground">{t("Aucun networker trouvé.")}</p>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            className="text-sm text-[var(--gold)] underline disabled:opacity-50"
            onClick={() => setSelected("")}
          >
            {t("← Retour au tableau")}
          </button>
          {profile && (
            <div className="space-y-5">
              <div className="rounded-xl bg-card hairline p-6">
                <h2 className="font-serif text-2xl">{profile.person.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {profile.person.email} · {t(profile.person.is_active ? "Actif" : "Désactivé")}
                  {profile.person.is_presenter && ` · ${t("Présentateur")}`}
                </p>
                <p className="mt-2 text-sm">
                  {t("Parrain :")} {profile.sponsor?.name || t("Non renseigné")} ·{" "}
                  {t("Filleuls directs :")}{" "}
                  {profile.downlines.map((p) => p.name).join(", ") || t("Aucun")}
                </p>
                <form
                  onSubmit={(e) => void send(e, "sponsor")}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  <select
                    aria-label={t("Parrain")}
                    className={`${field} max-w-xs`}
                    value={sponsor}
                    onChange={(e) => setSponsor(e.target.value)}
                  >
                    <option value="">{t("Sans parrain")}</option>
                    {people
                      .filter((p) => p.id !== selected)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {!p.is_active ? ` (${t("Désactivé")})` : ""}
                        </option>
                      ))}
                  </select>
                  <button disabled={busy} className={button}>
                    {t("Enregistrer le parrain")}
                  </button>
                </form>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">
                    {t("Prospects")} ({profile.prospects.length})
                  </h3>
                  {profile.prospects.map((p) => (
                    <p key={p.id} className="mt-2 text-sm">
                      <Link
                        className="text-[var(--gold)] underline"
                        to="/prospect/$id"
                        params={{ id: p.id }}
                      >
                        {p.title}
                      </Link>{" "}
                      · {t(p.status || "Non commencé")}
                    </p>
                  ))}
                  {!profile.prospects.length && (
                    <p className="mt-2 text-sm">{t("Aucune fiche.")}</p>
                  )}
                </div>
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">{t("Tâches")}</h3>
                  {profile.tasks.map((p) => (
                    <p key={p.id} className="mt-2 text-sm">
                      {p.title} · {t(p.status)}
                    </p>
                  ))}
                  {!profile.tasks.length && <p className="mt-2 text-sm">{t("Aucune fiche.")}</p>}
                </div>
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">{t("Formations et quiz")}</h3>
                  {profile.formations.map((p) => (
                    <p key={p.training_id} className="mt-2 text-sm">
                      {p.title} · {t(p.attended ? "Présent" : "Absent")}
                      {p.quiz_score && ` · ${p.quiz_score}`}
                    </p>
                  ))}
                  {!profile.formations.length && (
                    <p className="mt-2 text-sm">{t("Aucune présence enregistrée.")}</p>
                  )}
                </div>
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">{t("Rendez-vous")}</h3>
                  {profile.meetings.map((p) => (
                    <p key={p.id} className="mt-2 text-sm">
                      {p.title} · {t(p.status)} {p.date && `· ${p.date.replace("T", " ")}`}
                    </p>
                  ))}
                  {!profile.meetings.length && <p className="mt-2 text-sm">{t("Aucune fiche.")}</p>}
                </div>
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">{t("Commandes internes")}</h3>
                  {profile.orders.map((p) => (
                    <p key={p.id} className="mt-2 text-sm">
                      {p.kind} · {t(p.status)} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  ))}
                  {!profile.orders.length && <p className="mt-2 text-sm">{t("Aucune fiche.")}</p>}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">{t("Notes de suivi internes")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Visibles uniquement par l’administration.")}
                  </p>
                  {profile.notes.map((n) => (
                    <div key={n.id} className="mt-3 border-b border-border pb-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.author} · {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <form onSubmit={(e) => void send(e, "note")} className="mt-4 space-y-2">
                    <label className="block text-sm">
                      {t("Ajouter une note")}
                      <textarea
                        required
                        maxLength={3000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={`${field} mt-2`}
                      />
                    </label>
                    <button disabled={busy} className={button}>
                      {t("Ajouter la note")}
                    </button>
                  </form>
                </div>
                <div className="rounded-xl bg-card hairline p-5">
                  <h3 className="font-semibold">{t("Attribuer une tâche")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Cette tâche sera visible par le networker.")}
                  </p>
                  <form onSubmit={(e) => void send(e, "task")} className="mt-4 space-y-3">
                    <label className="block text-sm">
                      {t("Intitulé de la tâche")}
                      <input
                        required
                        maxLength={160}
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        className={`${field} mt-2`}
                      />
                    </label>
                    <label className="block text-sm">
                      {t("Échéance (facultative)")}
                      <input
                        type="date"
                        value={due}
                        onChange={(e) => setDue(e.target.value)}
                        className={`${field} mt-2`}
                      />
                    </label>
                    <button disabled={busy} className={button}>
                      {t("Créer la tâche")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
