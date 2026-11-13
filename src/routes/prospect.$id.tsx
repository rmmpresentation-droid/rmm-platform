import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CircleUserRound,
  Mail,
  MapPin,
  Phone,
  Target,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ProspectKanban, prospectStatusLabel } from "@/components/workspace/ProspectKanban";
import { businessForms } from "@/lib/business-fields.mjs";

type Prospect = {
  id: string;
  title: string;
  detail: string;
  status: string;
  owner: string;
  date: string;
  assigned_to: string | null;
  extra: Record<string, string>;
};
type DirectoryEntry = { id: string; name: string; role: string };
type CurrentUser = { id: string; name: string; role: string };

export const Route = createFileRoute("/prospect/$id")({
  head: () => ({
    meta: [{ title: "Fiche prospect — RMM" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ProspectPage,
});

function ProspectPage() {
  const { id } = Route.useParams();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "login" | "unavailable" | "error">(
    "loading",
  );

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setProspect(null);
    setDirectory([]);
    setUser(null);
    async function load() {
      try {
        // The existing list endpoint enforces prospect access on the server.
        const response = await fetch("/api/entries/prospects", { signal: controller.signal });
        if (response.status === 401) {
          setState("login");
          return;
        }
        if (response.status === 403) {
          setState("unavailable");
          return;
        }
        if (!response.ok) {
          setState("error");
          return;
        }
        const entries: Prospect[] = await response.json();
        const found = entries.find((entry) => entry.id === id);
        if (!found) {
          setState("unavailable");
          return;
        }
        const meResponse = await fetch("/api/me", { signal: controller.signal });
        if (meResponse.status === 401) {
          setState("login");
          return;
        }
        if (!meResponse.ok) {
          setState("error");
          return;
        }
        const me: CurrentUser = await meResponse.json();
        setUser(me);
        setProspect(found);
        setState("ready");
        try {
          const people = await fetch("/api/network-directory", { signal: controller.signal });
          if (people.ok) setDirectory(await people.json());
        } catch {
          /* The prospect remains visible if the directory is unavailable. */
        }
      } catch (error) {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [id]);

  async function updateProspect(updated: Prospect) {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/entries/prospects/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible de modifier le prospect.");
      setProspect(body);
      setEditing(false);
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible de modifier le prospect.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function deleteProspect() {
    if (!window.confirm("Supprimer cette fiche prospect ? Cette action est irréversible.")) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/entries/prospects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible de supprimer le prospect.");
      window.location.assign("/dashboard?section=prospects");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible de supprimer le prospect.",
      );
    } finally {
      setBusy(false);
    }
  }
  const canAdmin = user?.role === "admin" || user?.role === "superadmin";
  const contact = directory.find((person) => person.id === prospect?.assigned_to)?.name;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/">
            <Logo compact />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
        <a
          href="/dashboard?section=prospects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--gold)]"
        >
          <ArrowLeft size={16} /> Retour aux prospects
        </a>
        {state === "loading" && (
          <p className="mt-8 text-muted-foreground" role="status">
            Chargement de la fiche…
          </p>
        )}
        {state === "login" && (
          <div className="mt-8 rounded-xl bg-card hairline p-6">
            <h1 className="font-serif text-2xl">Connexion requise</h1>
            <p className="mt-3 text-muted-foreground">Connectez-vous pour consulter cette fiche.</p>
            <Link to="/dashboard" className="mt-4 inline-block text-[var(--gold)] underline">
              Se connecter
            </Link>
          </div>
        )}
        {state === "unavailable" && (
          <div className="mt-8 rounded-xl bg-card hairline p-6">
            <h1 className="font-serif text-2xl">Fiche indisponible</h1>
            <p className="mt-3 text-muted-foreground">
              Ce prospect est introuvable ou vous n’avez pas accès à sa fiche.
            </p>
          </div>
        )}
        {state === "error" && (
          <p role="alert" className="mt-8 rounded-md border border-red-400/40 p-4 text-red-500">
            Impossible de charger la fiche. Réessayez plus tard.
          </p>
        )}
        {state === "ready" && prospect && (
          <>
            <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[.2em] text-[var(--gold)]">
                Prospection · Fiche individuelle
              </p>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl">{prospect.title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Contact :{" "}
                    {contact ||
                      (prospect.assigned_to
                        ? "Membre du réseau"
                        : "Non renseigné (ancienne fiche)")}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--gold)]/15 px-4 py-2 text-sm text-[var(--gold)]">
                  {prospectStatusLabel(prospect.status)}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setActionError("");
                    setEditing(true);
                  }}
                  className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  Modifier la fiche
                </button>
                {canAdmin && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteProspect()}
                    className="rounded-md border border-red-500/50 px-4 py-2 text-sm text-red-500 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              {actionError && !editing && (
                <p role="alert" className="mt-4 text-sm text-red-500">
                  {actionError}
                </p>
              )}
              {editing && user && (
                <ProspectEditDialog
                  prospect={prospect}
                  user={user}
                  directory={directory}
                  busy={busy}
                  error={actionError}
                  onClose={() => {
                    setEditing(false);
                    setActionError("");
                  }}
                  onSave={updateProspect}
                />
              )}
            </section>
            <ProspectKanban
              single
              prospects={[prospect]}
              onUpdate={async (updated) => {
                if (!(await updateProspect({ ...prospect, ...updated })))
                  throw new Error(
                    "La phase n’a pas pu être enregistrée. Vérifiez vos droits et réessayez.",
                  );
              }}
            />
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-xl bg-card hairline p-6">
                <h2 className="font-serif text-2xl">Coordonnées et profil</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <Detail
                    icon={<Phone size={16} />}
                    label="Téléphone"
                    value={prospect.extra?.phone}
                  />
                  <Detail
                    icon={<Mail size={16} />}
                    label="Adresse e-mail"
                    value={prospect.extra?.email}
                  />
                  <Detail
                    icon={<MapPin size={16} />}
                    label="Emplacement"
                    value={prospect.extra?.location}
                  />
                  <Detail
                    icon={<Target size={16} />}
                    label="Centre d’intérêt"
                    value={prospect.extra?.interest}
                  />
                  <Detail
                    icon={<CircleUserRound size={16} />}
                    label="Responsable indicatif"
                    value={prospect.owner}
                  />
                </dl>
              </section>
              <section className="rounded-xl bg-card hairline p-6">
                <h2 className="font-serif text-2xl">Suivi de prospection</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <Detail
                    icon={<CalendarDays size={16} />}
                    label="Prochaine relance"
                    value={prospect.date?.replace("T", " ")}
                  />
                  <Detail
                    icon={<Target size={16} />}
                    label="Prochaine action"
                    value={prospect.extra?.next_action}
                  />
                </dl>
                {prospect.status === "Sans commande" && (
                  <p className="mt-6 text-sm">
                    <strong>Motif du refus :</strong>{" "}
                    {prospect.extra?.refusal_reason || "Non renseigné (historique)"}
                  </p>
                )}
                <h3 className="mt-6 text-sm font-semibold">Notes et résultat de prospection</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {prospect.detail || "Non renseigné"}
                </p>
              </section>
            </div>
            <ProspectNotes key={prospect.id} prospectId={prospect.id} />
          </>
        )}
      </main>
    </div>
  );
}

function ProspectEditDialog({
  prospect,
  user,
  directory,
  busy,
  error,
  onClose,
  onSave,
}: {
  prospect: Prospect;
  user: CurrentUser;
  directory: DirectoryEntry[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (updated: Prospect) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Prospect>(() => ({
    ...prospect,
    extra: { ...prospect.extra },
  }));
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const field = "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    heading.current?.focus();
    return () => {
      if (element.open) element.close();
    };
  }, []);
  function setExtra(key: string, value: string) {
    setDraft((previous) => ({ ...previous, extra: { ...previous.extra, [key]: value } }));
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="prospect-edit-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-border bg-card text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <form
        className="space-y-4 p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void onSave(draft);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            ref={heading}
            id="prospect-edit-heading"
            tabIndex={-1}
            className="font-serif text-2xl outline-none"
          >
            Modifier la fiche prospect
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer le formulaire"
            className="rounded-md border border-border px-3 py-1 text-xl leading-none"
          >
            ×
          </button>
        </div>
        {error && (
          <p role="alert" className="rounded-md border border-red-400/40 p-3 text-sm text-red-500">
            {error}
          </p>
        )}
        <label className="block text-sm">
          Nom complet du prospect *
          <input
            required
            maxLength={160}
            className={field}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        {businessForms.prospects.fields
          .filter((f) => f.key !== "refusal_reason")
          .map((f) => (
            <label key={f.key} className="block text-sm">
              {f.label}
              {f.required && " *"}
              {f.type === "select" ? (
                <select
                  required={f.required}
                  className={field}
                  value={draft.extra[f.key] || ""}
                  onChange={(event) => setExtra(f.key, event.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {f.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  required={f.required}
                  maxLength={500}
                  className={field}
                  value={draft.extra[f.key] || ""}
                  onChange={(event) => setExtra(f.key, event.target.value)}
                />
              )}
            </label>
          ))}
        {isAdmin ? (
          <label className="block text-sm">
            Membre ayant contacté le prospect *
            <select
              required
              className={field}
              value={draft.assigned_to || ""}
              onChange={(event) => setDraft({ ...draft, assigned_to: event.target.value })}
            >
              <option value="">Sélectionner un compte existant</option>
              {directory.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · {person.role}
                </option>
              ))}
            </select>
            {!directory.length && (
              <span className="mt-1 block text-xs text-muted-foreground">
                Annuaire indisponible : réessayez avant de modifier l’affectation.
              </span>
            )}
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">Contact enregistré : {user.name}</p>
        )}
        <label className="block text-sm">
          Notes et résultat de prospection
          <textarea
            maxLength={1000}
            className={`${field} min-h-24`}
            value={draft.detail}
            onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
          />
        </label>
        <label className="block text-sm">
          Responsable (nom indicatif, non affecté)
          <input
            maxLength={160}
            className={field}
            value={draft.owner}
            onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
          />
        </label>
        <label className="block text-sm">
          Prochaine relance
          <input
            type="datetime-local"
            className={field}
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
        </label>
        <div className="flex gap-4">
          <button
            disabled={busy || (isAdmin && !directory.length)}
            className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="text-sm">
            Annuler
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[var(--gold)]">{icon}</span>
      <div>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words">{value || "Non renseigné"}</dd>
      </div>
    </div>
  );
}

type ProspectNote = { id: string; content: string; created_at: string; author: string };

function ProspectNotes({ prospectId }: { prospectId: string }) {
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    setError("");
    fetch(`/api/prospects/${encodeURIComponent(prospectId)}/notes`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Impossible de charger les notes. Vérifiez votre connexion et vos droits d’accès.",
          );
        return response.json() as Promise<ProspectNote[]>;
      })
      .then(setNotes)
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [prospectId, attempt]);

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !content.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/prospects/${encodeURIComponent(prospectId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible d’enregistrer la note.");
      setNotes((previous) => [body as ProspectNote, ...previous]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’enregistrer la note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-card hairline p-6" aria-labelledby="notes-heading">
      <h2 id="notes-heading" className="font-serif text-2xl">
        Notes de suivi
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ajoutez des observations au fil de la prospection. Les notes sont visibles par les personnes
        autorisées à consulter cette fiche.
      </p>
      <form onSubmit={addNote} className="mt-5 space-y-3">
        <label htmlFor="prospect-note" className="block text-sm font-medium">
          Nouvelle note
        </label>
        <textarea
          id="prospect-note"
          required
          maxLength={3000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Saisir une note de suivi…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{content.length} / 3 000 caractères</span>
          <button
            type="submit"
            disabled={saving || loading || loadFailed || !content.trim()}
            className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Ajouter la note"}
          </button>
        </div>
      </form>
      {error && (
        <div role="alert" className="mt-4 text-sm text-red-500">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer le chargement
          </button>
        </div>
      )}
      <h3 className="mt-7 font-semibold">Historique des notes</h3>
      {loading ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Chargement des notes…
        </p>
      ) : loadFailed ? (
        <p className="mt-3 text-sm text-muted-foreground">Historique indisponible.</p>
      ) : !notes.length ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucune note enregistrée.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <strong className="text-foreground">{note.author}</strong>
                <time dateTime={note.created_at}>
                  {new Intl.DateTimeFormat("fr-TN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Tunis",
                  }).format(new Date(note.created_at))}{" "}
                  · Tunis
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{note.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
