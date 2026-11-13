import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/demande-rendez-vous")({
  head: () => ({
    meta: [
      { title: "Demander un rendez-vous — RMM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AppointmentRequestPage,
});
const input = "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
function AppointmentRequestPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("");
  const [date, setDate] = useState("");
  const [end, setEnd] = useState("");
  const [detail, setDetail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (end <= date || end.slice(0, 10) !== date.slice(0, 10)) {
      setError("La fin doit être après le début, le même jour.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/public/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, kind, date, end_date: end, detail, consent }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible d’envoyer la demande.");
      setSent(true);
      setName("");
      setPhone("");
      setEmail("");
      setDate("");
      setEnd("");
      setDetail("");
      setConsent(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible d’envoyer la demande.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-6 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
        Préproduction locale : utilisez uniquement des données fictives.
      </p>
      <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">RMM · Prospection</p>
      <h1 className="mt-3 font-serif text-4xl">Demander un rendez-vous</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Indiquez votre préférence : votre demande sera examinée par l’administration. Le rendez-vous
        n’est pas confirmé tant que l’administration ne l’a pas fixé.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Les membres du réseau peuvent faire leurs demandes dans leur{" "}
        <Link to="/dashboard" className="text-[var(--gold)] underline">
          espace membre
        </Link>
        .
      </p>
      {sent ? (
        <div role="status" className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-2xl">Demande enregistrée</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Elle est en attente de traitement. Aucune confirmation automatique n’est envoyée.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setKind("");
            }}
            className="mt-5 text-sm text-[var(--gold)] underline"
          >
            Faire une autre demande
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 sm:p-8"
        >
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-400/40 p-3 text-sm text-red-500"
            >
              {error}
            </p>
          )}
          <label className="block text-sm">
            Nom complet *
            <input
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
              autoComplete="name"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Téléphone *
              <input
                required
                type="tel"
                maxLength={100}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={input}
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm">
              E-mail *
              <input
                required
                type="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                autoComplete="email"
              />
            </label>
          </div>
          <label className="block text-sm">
            Type de demande de prospection *
            <select
              required
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={input}
            >
              <option value="">Sélectionner</option>
              <option>Premier contact</option>
              <option>Présentation</option>
              <option>Closing</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Début souhaité · heure de Tunis *
              <input
                required
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={input}
              />
            </label>
            <label className="block text-sm">
              Fin souhaitée · heure de Tunis *
              <input
                required
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={input}
              />
            </label>
          </div>
          <label className="block text-sm">
            Précisions facultatives
            <textarea
              maxLength={1000}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className={`${input} min-h-24`}
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              required
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              J’accepte que mes coordonnées et cette demande soient enregistrées et consultées par
              l’administration RMM pour traiter ma demande. *
            </span>
          </label>
          <button
            disabled={busy}
            className="rounded-md bg-gradient-gold px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </form>
      )}
    </section>
  );
}
