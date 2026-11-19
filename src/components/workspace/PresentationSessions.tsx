import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";
type Session = {
  id: string;
  title: string;
  date: string;
  presenter_name: string;
  presenter_id: string;
  attended?: boolean | null;
};
type Participant = {
  id: string;
  name: string;
  kind: "networker" | "prospect";
  attended: boolean | null;
};
type Choice = { id: string; name: string };
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const action = "rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black";
async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const r = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || "Service indisponible");
  return body as T;
}
export function PresentationSessions({
  isAdmin,
  isPresenter,
  isNetworker,
  presenters,
  networkers,
  prospects,
}: {
  isAdmin: boolean;
  isPresenter: boolean;
  isNetworker: boolean;
  presenters: Choice[];
  networkers: Choice[];
  prospects: Choice[];
}) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mine, setMine] = useState<Session[]>([]);
  const [selected, setSelected] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [presenter, setPresenter] = useState("");
  const [kind, setKind] = useState<"networker" | "prospect">("networker");
  const [person, setPerson] = useState("");
  const [error, setError] = useState("");
  const canManage = isAdmin || isPresenter;
  async function refresh() {
    if (canManage) setSessions(await api<Session[]>("/api/presentation-sessions"));
    if (isNetworker) setMine(await api<Session[]>("/api/presentation-sessions-mine"));
  }
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [list, own] = await Promise.all([
          canManage ? api<Session[]>("/api/presentation-sessions") : Promise.resolve([]),
          isNetworker ? api<Session[]>("/api/presentation-sessions-mine") : Promise.resolve([]),
        ]);
        if (active) {
          setSessions(list);
          setMine(own);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [canManage, isNetworker]);
  async function open(id: string) {
    setSelected(id);
    setParticipants([]);
    try {
      setParticipants(await api<Participant[]>(`/api/presentation-sessions/${id}/attendance`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/presentation-sessions", {
        method: "POST",
        body: JSON.stringify({ title, date, presenter_id: presenter }),
      });
      setTitle("");
      setDate("");
      setPresenter("");
      await refresh();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(k: string, id: string, value: boolean | null) {
    try {
      await api(`/api/presentation-sessions/${selected}/participants/${k}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ attended: value }),
      });
      await open(selected);
      if (isNetworker) await refresh();
      setPerson("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="font-serif text-2xl">{t("Séances de présentation et présences")}</h2>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {isAdmin && (
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            {t("Titre")}
            <input
              className={`${field} mt-1`}
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t("Date et heure")}
            <input
              className={`${field} mt-1`}
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t("Présentateur")}
            <select
              className={`${field} mt-1`}
              required
              value={presenter}
              onChange={(e) => setPresenter(e.target.value)}
            >
              <option value="">{t("Sélectionner")}</option>
              {presenters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="self-end">
            <button className={action}>{t("Créer la séance")}</button>
          </div>
        </form>
      )}
      {canManage && (
        <>
          <h3 className="mt-6 font-semibold">{t("Séances accessibles")}</h3>
          {sessions.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{t("Aucune séance.")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {sessions.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-pressed={selected === s.id}
                onClick={() => void open(s.id)}
                className="rounded-md border border-border px-3 py-2 text-start text-sm"
              >
                {s.title} · {s.date.replace("T", " ")} · {s.presenter_name}
              </button>
            ))}
          </div>
          {selected && (
            <div className="mt-4 rounded-lg border border-border p-4">
              <h3 className="font-semibold">{t("Participants et présences")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Non renseigné ne signifie pas absent.")}
              </p>
              {isAdmin && (
                <form
                  className="mt-4 flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(kind, person, null);
                  }}
                >
                  <label className="text-sm">
                    {t("Type")}
                    <select
                      className={`${field} mt-1`}
                      value={kind}
                      onChange={(e) => {
                        setKind(e.target.value as "networker" | "prospect");
                        setPerson("");
                      }}
                    >
                      <option value="networker">Networker</option>
                      <option value="prospect">Prospect</option>
                    </select>
                  </label>
                  <label className="min-w-48 text-sm">
                    {t("Participant")}
                    <select
                      required
                      className={`${field} mt-1`}
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                    >
                      <option value="">{t("Sélectionner")}</option>
                      {(kind === "networker" ? networkers : prospects)
                        .filter((p) => !participants.some((r) => r.id === p.id && r.kind === kind))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button className={action}>{t("Ajouter le participant")}</button>
                </form>
              )}
              {!participants.length && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("Aucun participant enregistré.")}
                </p>
              )}
              {participants.map((p) => (
                <div
                  key={p.kind + p.id}
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
                >
                  <span className="text-sm">
                    {p.name} · {p.kind === "networker" ? "Networker" : "Prospect"}
                  </span>
                  <select
                    aria-label={`${t("Présence")} : ${p.name}`}
                    className={`${field} max-w-48`}
                    value={p.attended === null ? "unknown" : p.attended ? "yes" : "no"}
                    onChange={(e) =>
                      void save(
                        p.kind,
                        p.id,
                        e.target.value === "unknown" ? null : e.target.value === "yes",
                      )
                    }
                  >
                    <option value="unknown">{t("Non renseigné")}</option>
                    <option value="yes">{t("Présent")}</option>
                    <option value="no">{t("Absent")}</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {isNetworker && (
        <div className="mt-6">
          <h3 className="font-semibold">{t("Mes séances de présentation")}</h3>
          {mine.map((s) => (
            <p key={s.id} className="mt-2 text-sm">
              {s.title} · {s.date.replace("T", " ")} · {s.presenter_name} ·{" "}
              {t(s.attended == null ? "Non renseigné" : s.attended ? "Présent" : "Absent")}
            </p>
          ))}
          {!mine.length && (
            <p className="mt-2 text-sm text-muted-foreground">{t("Aucune séance enregistrée.")}</p>
          )}
        </div>
      )}
    </section>
  );
}
