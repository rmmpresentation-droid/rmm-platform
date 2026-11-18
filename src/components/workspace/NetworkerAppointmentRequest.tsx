import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Person = { id: string; name: string; role: string };
type Prospect = { id: string; title: string };
type NewProspect = { name: string; phone: string; email: string };
const input = "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
export function NetworkerAppointmentRequest({
  userId,
  directory,
  prospects,
  onClose,
  onSaved,
}: {
  userId: string;
  directory: Person[];
  prospects: Prospect[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState("");
  const [detail, setDetail] = useState("");
  const [networkers, setNetworkers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newPeople, setNewPeople] = useState<NewProspect[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  function toggle(id: string, selectedIds: string[], set: (value: string[]) => void) {
    set(
      selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id],
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          detail,
          date,
          request_kind: kind,
          networker_ids: networkers,
          prospect_ids: selected,
          new_prospects: newPeople,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible d’envoyer la demande.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="networker-request-heading"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-border bg-card text-foreground shadow-2xl backdrop:bg-black/70"
    >
      <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <h2 id="networker-request-heading" className="font-serif text-2xl">
            {t("Demander un rendez-vous")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("Fermer le formulaire")}>
            ×
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "L’administration fixera et confirmera le rendez-vous. La date saisie est une préférence.",
          )}
        </p>
        {error && (
          <p role="alert" className="rounded-md border border-red-400/40 p-3 text-sm text-red-500">
            {error}
          </p>
        )}
        <label className="block text-sm">
          {t("Sujet du rendez-vous")} *
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm">
          {t("Objet de la demande")} *
          <select required value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            <option value="">{t("Sélectionner")}</option>
            {["Présentation", "Closing", "Premier contact", "Suivi"].map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          {t("Début souhaité · heure de Tunis *")}
          <input
            required
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={input}
          />
        </label>
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm">{t("Autres networkers présents (facultatif)")}</legend>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("Ils pourront consulter ce rendez-vous et contribuer au compte rendu. Maximum 10.")}
          </p>
          <div className="max-h-40 space-y-2 overflow-auto">
            {directory
              .filter((p) => p.role === "networker" && p.id !== userId)
              .map((p) => (
                <label key={p.id} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={networkers.includes(p.id)}
                    disabled={!networkers.includes(p.id) && networkers.length >= 10}
                    onChange={() => toggle(p.id, networkers, setNetworkers)}
                  />
                  {p.name}
                </label>
              ))}
          </div>
        </fieldset>
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-sm">{t("Prospects existants participants")}</legend>
          <p className="mb-2 text-xs text-muted-foreground">
            {t(
              "Sélectionnez uniquement parmi vos prospects accessibles. Maximum 10 prospects au total.",
            )}
          </p>
          <div className="max-h-40 space-y-2 overflow-auto">
            {prospects.map((p) => (
              <label key={p.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  disabled={!selected.includes(p.id) && selected.length + newPeople.length >= 10}
                  onChange={() => toggle(p.id, selected, setSelected)}
                />
                {p.title}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm">{t("Nouveaux prospects participants")}</legend>
          {newPeople.map((p, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-background p-3">
              <label className="block text-sm">
                {t("Nom complet")} *
                <input
                  required
                  maxLength={160}
                  value={p.name}
                  onChange={(e) =>
                    setNewPeople(
                      newPeople.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className={input}
                />
              </label>
              <label className="block text-sm">
                {t("Téléphone")} *
                <input
                  required
                  type="tel"
                  maxLength={100}
                  value={p.phone}
                  onChange={(e) =>
                    setNewPeople(
                      newPeople.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)),
                    )
                  }
                  className={input}
                />
              </label>
              <label className="block text-sm">
                {t("E-mail (facultatif)")}
                <input
                  type="email"
                  maxLength={254}
                  value={p.email}
                  onChange={(e) =>
                    setNewPeople(
                      newPeople.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)),
                    )
                  }
                  className={input}
                />
              </label>
              <button
                type="button"
                onClick={() => setNewPeople(newPeople.filter((_, j) => j !== i))}
                className="text-sm text-red-500"
              >
                {t("Retirer")}
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={selected.length + newPeople.length >= 10}
            onClick={() => setNewPeople([...newPeople, { name: "", phone: "", email: "" }])}
            className="text-sm text-[var(--gold)] disabled:opacity-50"
          >
            {t("+ Ajouter un prospect")}
          </button>
        </fieldset>
        <label className="block text-sm">
          {t("Précisions facultatives")}
          <textarea
            maxLength={1000}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className={`${input} min-h-24`}
          />
        </label>
        <div className="flex gap-4">
          <button
            disabled={busy}
            className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {t("Envoyer ma demande")}
          </button>
          <button type="button" onClick={onClose}>
            {t("Annuler")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
