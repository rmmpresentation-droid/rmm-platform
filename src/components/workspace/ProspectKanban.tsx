import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, GripVertical } from "lucide-react";

export type KanbanProspect = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  date: string;
  status: string;
  assigned_to: string | null;
  extra: Record<string, string>;
};
const columns = [
  { key: "unstarted", label: "Non commencé", statuses: [""], destination: "" },
  {
    key: "contact",
    label: "Premier contact",
    statuses: ["Premier contact"],
    destination: "Premier contact",
  },
  {
    key: "appointment",
    label: "Prise de rendez-vous",
    statuses: ["Prise de rendez-vous"],
    destination: "Prise de rendez-vous",
  },
  {
    key: "presentation",
    label: "Présentation",
    statuses: ["Présentation (nouvelle phase)"],
    destination: "Présentation (nouvelle phase)",
  },
  { key: "closing", label: "Closing", statuses: ["Closing"], destination: "Closing" },
  {
    key: "joined",
    label: "Rejoint",
    statuses: ["Consommateur", "Candidat networker"],
    destination: null,
  },
  { key: "refused", label: "Ne rejoint pas", statuses: ["Sans commande"], destination: null },
  {
    key: "legacy",
    label: "Présentation historique",
    statuses: ["Présentation"],
    destination: null,
  },
] as const;

export function prospectStatusLabel(status: string) {
  return (
    (
      {
        "": "Non commencé",
        Présentation: "Présentation historique (à préciser)",
        "Présentation (nouvelle phase)": "Présentation",
        Consommateur: "Rejoint · consommateur",
        "Candidat networker": "Rejoint · networker",
        "Sans commande": "Ne rejoint pas",
      } as Record<string, string>
    )[status] ?? status
  );
}

export function ProspectKanban({
  prospects,
  onUpdate,
  single = false,
}: {
  prospects: KanbanProspect[];
  onUpdate: (item: KanbanProspect) => Promise<void>;
  single?: boolean;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<{
    item: KanbanProspect;
    column: "joined" | "refused";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shownColumns = columns.filter(
    (column) => column.key !== "legacy" || prospects.some((item) => item.status === "Présentation"),
  );
  async function save(item: KanbanProspect, status: string, reason?: string) {
    setBusy(true);
    setError("");
    try {
      await onUpdate({
        ...item,
        status,
        extra: { ...item.extra, ...(reason !== undefined ? { refusal_reason: reason } : {}) },
      });
      setDecision(null);
      setChoice((previous) => ({ ...previous, [item.id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de changer la phase.");
    } finally {
      setBusy(false);
    }
  }
  function move(item: KanbanProspect, key: string) {
    const column = columns.find((c) => c.key === key);
    if (
      !column ||
      key === "legacy" ||
      busy ||
      (key !== "joined" &&
        key !== "refused" &&
        column.statuses.some((status) => status === item.status))
    )
      return;
    setError("");
    if (key === "joined" || key === "refused") {
      setDecision({ item, column: key });
      return;
    }
    if (column.destination !== null) void save(item, column.destination);
  }
  return (
    <section
      className="mt-6 min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
      aria-label="Kanban de prospection"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">
            Suivi de prospection
          </p>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Suivez chaque étape</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Une vue claire de vos prospects, du premier échange à leur décision.
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          {prospects.length} prospect{prospects.length !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Glissez une fiche vers une phase ou utilisez le bouton « Déplacer ». Les changements de
        phase ne créent pas de compte ni de rendez-vous.
      </p>
      {error && !decision && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      <div className="mt-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shownColumns.map((column, index) => {
            const cards = prospects.filter((item) =>
              column.statuses.some((status) => status === item.status),
            );
            return (
              <div
                key={column.key}
                onDragOver={(event) => {
                  if (column.key !== "legacy" && dragging) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const item = prospects.find((p) => p.id === dragging);
                  setDragging(null);
                  if (item) move(item, column.key);
                }}
                className={`min-w-0 rounded-xl border bg-background/60 p-4 transition-colors ${dragging && column.key !== "legacy" ? "border-dashed border-[var(--gold)]/60" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--gold)]/10 text-[10px] font-semibold text-[var(--gold)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="min-w-0 pt-0.5 text-sm font-semibold leading-snug">
                      {column.label}
                    </h3>
                  </div>
                  <span
                    aria-label={`${cards.length} prospect${cards.length !== 1 ? "s" : ""}`}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {cards.length}
                  </span>
                </div>
                {column.key === "legacy" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ancienne étape combinée, à repositionner manuellement.
                  </p>
                )}
                <div className="mt-3 min-h-20 space-y-3">
                  {cards.length === 0 && (
                    <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Aucun prospect à cette étape
                    </div>
                  )}
                  {cards.map((item) => (
                    <article
                      key={item.id}
                      draggable={!busy}
                      onDragStart={(event) => {
                        setDragging(item.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className="min-w-0 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical
                          size={15}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          {single ? (
                            <strong className="break-words text-sm">{item.title}</strong>
                          ) : (
                            <Link
                              to="/prospect/$id"
                              params={{ id: item.id }}
                              className="break-words text-sm font-semibold text-[var(--gold)] underline"
                            >
                              {item.title}{" "}
                              <ArrowUpRight size={13} className="inline" aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {prospectStatusLabel(item.status)}
                      </p>
                      {item.status === "Sans commande" && (
                        <p className="mt-2 break-words text-xs">
                          Motif : {item.extra?.refusal_reason || "Non renseigné (historique)"}
                        </p>
                      )}
                      <label className="mt-3 block text-xs">
                        Déplacer vers
                        <select
                          aria-label={`Déplacer ${item.title} vers`}
                          className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                          value={choice[item.id] || ""}
                          disabled={busy}
                          onChange={(e) => setChoice({ ...choice, [item.id]: e.target.value })}
                        >
                          <option value="">Choisir une phase</option>
                          {columns
                            .filter(
                              (c) =>
                                c.key !== "legacy" &&
                                (c.key === "joined" ||
                                  c.key === "refused" ||
                                  !c.statuses.some((s) => s === item.status)),
                            )
                            .map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={busy || !choice[item.id]}
                        onClick={() => move(item, choice[item.id])}
                        className="mt-2 w-full rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors enabled:hover:border-[var(--gold)] enabled:hover:text-[var(--gold)] disabled:opacity-50"
                      >
                        Déplacer
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {decision && (
        <DecisionDialog
          decision={decision}
          error={error}
          busy={busy}
          onCancel={() => {
            setDecision(null);
            setError("");
          }}
          onSave={(status, reason) => void save(decision.item, status, reason)}
        />
      )}
    </section>
  );
}

function DecisionDialog({
  decision,
  error,
  busy,
  onCancel,
  onSave,
}: {
  decision: { item: KanbanProspect; column: "joined" | "refused" };
  error: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (status: string, reason?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [kind, setKind] = useState("");
  const [reason, setReason] = useState(decision.item.extra?.refusal_reason || "");
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    node.showModal();
    heading.current?.focus();
    return () => {
      if (node.open) node.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="decision-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy)
            onSave(
              decision.column === "joined" ? kind : "Sans commande",
              decision.column === "refused" ? reason.trim() : undefined,
            );
        }}
      >
        <h3
          id="decision-heading"
          tabIndex={-1}
          ref={heading}
          className="font-serif text-2xl outline-none"
        >
          {decision.column === "joined" ? "Comment rejoint-il ?" : "Pourquoi ne rejoint-il pas ?"}
        </h3>
        <p className="text-sm text-muted-foreground">{decision.item.title}</p>
        {decision.column === "joined" ? (
          <label className="block text-sm">
            Type de participation *
            <select
              required
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background p-2"
            >
              <option value="">Sélectionner</option>
              <option value="Candidat networker">Networker</option>
              <option value="Consommateur">Consommateur</option>
            </select>
          </label>
        ) : (
          <label className="block text-sm">
            Motif du refus *
            <textarea
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-border bg-background p-2"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <div className="flex gap-4">
          <button
            disabled={busy || (decision.column === "refused" && !reason.trim())}
            className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : "Confirmer"}
          </button>
          <button type="button" disabled={busy} onClick={onCancel} className="text-sm">
            Annuler
          </button>
        </div>
      </form>
    </dialog>
  );
}
