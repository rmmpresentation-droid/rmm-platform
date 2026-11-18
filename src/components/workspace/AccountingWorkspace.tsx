import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, FileText, Plus, Receipt, Wallet } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Kind = "invoice_income" | "invoice_expense" | "expense";
type Document = {
  id: string;
  kind: Kind;
  title: string;
  reference: string;
  counterparty: string;
  issue_date: string;
  due_date: string;
  amount_millimes: number;
  notes: string;
  status: string;
};
type Payment = {
  id: string;
  document_id: string;
  amount_millimes: number;
  paid_date: string;
  method: string;
  notes: string;
};
type History = {
  id: string;
  document_id: string;
  action: string;
  before_data: Document;
  created_at: string;
};
type Data = { documents: Document[]; payments: Payment[]; history: History[] };
type Draft = {
  kind: Kind;
  title: string;
  reference: string;
  counterparty: string;
  issue_date: string;
  due_date: string;
  amount: string;
  notes: string;
};
const blank = (): Draft => ({
  kind: "invoice_income",
  title: "",
  reference: "",
  counterparty: "",
  issue_date: "",
  due_date: "",
  amount: "",
  notes: "",
});
const field =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground";
const button =
  "rounded-lg bg-gradient-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50";
const card = "rounded-2xl border border-border bg-card p-5";
const labels: Record<Kind, string> = {
  invoice_income: "Facture client",
  invoice_expense: "Facture fournisseur",
  expense: "Charge",
};
const money = (value: number) =>
  `${new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value / 1000)} DT`;
function parseMoney(value: string) {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(value)) return NaN;
  const [whole, part = ""] = value.replace(",", ".").split(".");
  return Number(whole) * 1000 + Number(part.padEnd(3, "0"));
}
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || "Service indisponible");
  return result as T;
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  const first = Array.from(text).find(
    (character) => character.charCodeAt(0) > 31 && !/\s/.test(character),
  );
  if (first && "=+-@".includes(first)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function AccountingWorkspace() {
  const { t } = useLanguage();
  const [data, setData] = useState<Data>({ documents: [], payments: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [payDoc, setPayDoc] = useState<Document | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("Virement");
  const [payNotes, setPayNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  async function load() {
    const response = await api<Data>("/api/accounting");
    setData(response);
  }
  useEffect(() => {
    let active = true;
    api<Data>("/api/accounting")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const paid = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of data.payments)
      map[p.document_id] = (map[p.document_id] || 0) + p.amount_millimes;
    return map;
  }, [data.payments]);
  const visible = data.documents.filter(
    (doc) =>
      (filter === "all" ||
        doc.kind === filter ||
        (filter === "cancelled" && doc.status === "cancelled")) &&
      (!from || doc.issue_date >= from) &&
      (!to || doc.issue_date <= to) &&
      `${doc.title} ${doc.reference} ${doc.counterparty}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const active = visible.filter((doc) => doc.status === "active");
  const incomes = active.filter((doc) => doc.kind === "invoice_income");
  const costs = active.filter((doc) => doc.kind !== "invoice_income");
  const sum = (docs: Document[], fn: (doc: Document) => number) =>
    docs.reduce((total, doc) => total + fn(doc), 0);
  function reset() {
    setFormOpen(false);
    setEditing(null);
    setDraft(blank());
  }
  function edit(doc: Document) {
    setEditing(doc.id);
    setDraft({
      kind: doc.kind,
      title: doc.title,
      reference: doc.reference,
      counterparty: doc.counterparty,
      issue_date: doc.issue_date,
      due_date: doc.due_date,
      amount: (doc.amount_millimes / 1000).toFixed(3),
      notes: doc.notes,
    });
    setFormOpen(true);
    setNotice("");
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { amount, ...rest } = draft;
      const amount_millimes = parseMoney(amount);
      if (!Number.isSafeInteger(amount_millimes) || amount_millimes <= 0)
        throw new Error(t("Montant invalide (maximum trois décimales)."));
      await api(
        editing ? `/api/accounting/documents/${editing}` : "/api/accounting/documents",
        editing ? "PUT" : "POST",
        { ...rest, amount_millimes },
      );
      await load();
      reset();
      setNotice(t("Document enregistré."));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  async function cancel(doc: Document) {
    if (!window.confirm(t("Annuler ce document ? Il restera dans l’historique."))) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/accounting/documents/${doc.id}/cancel`, "POST");
      await load();
      setNotice(t("Document annulé."));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  async function savePayment(event: FormEvent) {
    event.preventDefault();
    if (!payDoc) return;
    setBusy(true);
    setError("");
    try {
      const amount_millimes = parseMoney(payAmount);
      if (!Number.isSafeInteger(amount_millimes) || amount_millimes <= 0)
        throw new Error(t("Montant invalide (maximum trois décimales)."));
      await api(`/api/accounting/documents/${payDoc.id}/payments`, "POST", {
        amount_millimes,
        paid_date: payDate,
        method: payMethod,
        notes: payNotes,
      });
      await load();
      setPayDoc(null);
      setPayAmount("");
      setPayDate("");
      setPayNotes("");
      setNotice(t("Règlement enregistré."));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const rows = [
      [
        "Type",
        "Libellé",
        "Référence",
        "Tiers",
        "Date",
        "Échéance",
        "Montant TND",
        "Réglé TND",
        "Solde TND",
        "Statut",
      ],
      ...visible.map((d) => [
        labels[d.kind],
        d.title,
        d.reference,
        d.counterparty,
        d.issue_date,
        d.due_date,
        (d.amount_millimes / 1000).toFixed(3),
        ((paid[d.id] || 0) / 1000).toFixed(3),
        ((d.amount_millimes - (paid[d.id] || 0)) / 1000).toFixed(3),
        d.status === "active" ? "Actif" : "Annulé",
      ]),
    ];
    const blob = new Blob(["\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suivi-comptable.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function exportPayments() {
    const ids = new Set(visible.map((d) => d.id));
    const rows = [
      ["Document", "Référence", "Date", "Montant TND", "Mode", "Notes"],
      ...data.payments
        .filter((p) => ids.has(p.document_id))
        .map((p) => {
          const d = data.documents.find((item) => item.id === p.document_id);
          return [
            d?.title || "",
            d?.reference || "",
            p.paid_date,
            (p.amount_millimes / 1000).toFixed(3),
            p.method,
            p.notes,
          ];
        }),
    ];
    const blob = new Blob(["\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reglements.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-5 text-sm leading-6">
        <strong>{t("Suivi interne · préproduction")}</strong>
        <p className="mt-1 text-muted-foreground">
          {t(
            "Ce suivi ne remplace pas une comptabilité légale ou une déclaration fiscale. Utilisez uniquement des données fictives.",
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Sauvegarde et restauration de ce module non vérifiées.")}
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">
            {t("Vue financière")}
          </p>
          <h2 className="mt-2 font-serif text-3xl">{t("Votre activité en un regard")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Factures, charges et règlements enregistrés manuellement.")}
          </p>
        </div>
        <button
          type="button"
          className={button}
          onClick={() => {
            setEditing(null);
            setDraft(blank());
            setFormOpen(!formOpen);
            setError("");
          }}
        >
          <Plus className="me-1 inline h-4 w-4" />
          {t("Ajouter un document")}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-green-600/40 p-3 text-sm">
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Factures clients",
            value: sum(incomes, (d) => d.amount_millimes),
            Icon: FileText,
          },
          {
            label: "Charges et factures fournisseurs",
            value: sum(costs, (d) => d.amount_millimes),
            Icon: Receipt,
          },
          { label: "Encaissé", value: sum(incomes, (d) => paid[d.id] || 0), Icon: ArrowDownLeft },
          { label: "Décaissé", value: sum(costs, (d) => paid[d.id] || 0), Icon: ArrowUpRight },
        ].map(({ label, value, Icon }) => (
          <div key={label} className={card}>
            <Icon className="h-5 w-5 text-[var(--gold)]" />
            <p className="mt-4 text-xs text-muted-foreground">{t(label)}</p>
            <strong className="mt-2 block text-xl">{money(value)}</strong>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Indicateurs calculés sur les documents filtrés, hors documents annulés ; encaissements et décaissements ne sont pas un bénéfice.",
        )}
      </p>
      {formOpen && (
        <form onSubmit={submit} className={`${card} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl">
              {t(editing ? "Modifier le document" : "Nouveau document")}
            </h3>
            <button type="button" onClick={reset} className="text-sm text-muted-foreground">
              {t("Fermer")}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              {t("Type de document")}
              <select
                className={field}
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}
              >
                {Object.entries(labels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {t(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t("Libellé")} *
              <input
                required
                maxLength={160}
                className={field}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {t("Référence")}
              <input
                maxLength={100}
                className={field}
                value={draft.reference}
                onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {t("Client ou fournisseur")}
              <input
                maxLength={160}
                className={field}
                value={draft.counterparty}
                onChange={(e) => setDraft({ ...draft, counterparty: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {t("Date du document")} *
              <input
                required
                type="date"
                className={field}
                value={draft.issue_date}
                onChange={(e) => setDraft({ ...draft, issue_date: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {t("Date d’échéance")}
              <input
                type="date"
                min={draft.issue_date || undefined}
                className={field}
                value={draft.due_date}
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {t("Montant total en DT")} *
              <input
                required
                inputMode="decimal"
                placeholder="0,000"
                className={field}
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {t("Notes")}
              <textarea
                maxLength={1000}
                className={field}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
          </div>
          <button className={button} disabled={busy}>
            {t("Enregistrer")}
          </button>
        </form>
      )}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl">{t("Documents et règlements")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {visible.length} {t("document(s)")}
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-[var(--gold)]"
          >
            {t("Exporter la liste CSV")}
          </button>
          <button
            type="button"
            onClick={exportPayments}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-[var(--gold)]"
          >
            {t("Exporter les règlements CSV")}
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="text-xs">
            {t("Rechercher")}
            <input
              className={field}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Rechercher…")}
            />
          </label>
          <label className="text-xs">
            {t("Type")}
            <select className={field} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t("Tous les documents")}</option>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
              <option value="cancelled">{t("Annulés")}</option>
            </select>
          </label>
          <label className="text-xs">
            {t("Du")}
            <input
              className={field}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-xs">
            {t("Au")}
            <input
              className={field}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <p className="mt-6 text-sm">{t("Chargement…")}</p>
        ) : !visible.length ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("Aucun document.")}</p>
        ) : (
          <div className="mt-5 space-y-3">
            {visible.map((doc) => {
              const settled = paid[doc.id] || 0;
              const remaining = doc.amount_millimes - settled;
              return (
                <article key={doc.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[var(--gold)]">
                        {t(labels[doc.kind])} ·{" "}
                        {doc.status === "cancelled"
                          ? t("Annulé")
                          : remaining === 0
                            ? t("Réglé")
                            : settled
                              ? t("Partiellement réglé")
                              : t("Non réglé")}
                      </p>
                      <h4 className="mt-1 font-semibold">{doc.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          doc.reference,
                          doc.counterparty,
                          doc.issue_date,
                          doc.due_date ? `${t("Échéance")} ${doc.due_date}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-end">
                      <strong>{money(doc.amount_millimes)}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("Reste")} : {money(remaining)}
                      </p>
                    </div>
                  </div>
                  {doc.notes && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {doc.notes}
                    </p>
                  )}
                  {data.history.some((h) => h.document_id === doc.id) && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer">
                        {t("Historique des modifications")}
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {data.history
                          .filter((h) => h.document_id === doc.id)
                          .map((h) => (
                            <li key={h.id}>
                              {h.created_at} ·{" "}
                              {t(h.action === "cancel" ? "Annulation" : "Modification")} ·{" "}
                              {h.before_data.title} · {money(h.before_data.amount_millimes)} ·{" "}
                              {h.before_data.issue_date}
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}
                  {data.payments.some((p) => p.document_id === doc.id) && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer">{t("Historique des règlements")}</summary>
                      <ul className="mt-2 space-y-2">
                        {data.payments
                          .filter((p) => p.document_id === doc.id)
                          .map((p) => (
                            <li key={p.id}>
                              {p.paid_date} · {t(p.method)} · {money(p.amount_millimes)}{" "}
                              {p.notes && `· ${p.notes}`}
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}
                  {doc.status === "active" && (
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      {remaining > 0 && (
                        <button
                          type="button"
                          className="text-[var(--gold)] underline"
                          onClick={() => {
                            setPayDoc(doc);
                            setPayAmount("");
                            setPayDate("");
                            setPayNotes("");
                            setError("");
                          }}
                        >
                          <Wallet className="me-1 inline h-4 w-4" />
                          {t("Ajouter un règlement")}
                        </button>
                      )}
                      {!settled && (
                        <>
                          <button
                            type="button"
                            className="text-[var(--gold)] underline"
                            onClick={() => edit(doc)}
                          >
                            {t("Modifier")}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-red-500 underline"
                            onClick={() => void cancel(doc)}
                          >
                            {t("Annuler le document")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      {payDoc && (
        <form onSubmit={savePayment} className={`${card} space-y-4`}>
          <h3 className="font-serif text-xl">
            {t("Ajouter un règlement")} · {payDoc.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("Solde restant")} : {money(payDoc.amount_millimes - (paid[payDoc.id] || 0))}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              {t("Montant du règlement en DT")} *
              <input
                required
                inputMode="decimal"
                className={field}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0,000"
              />
            </label>
            <label className="text-sm">
              {t("Date du règlement")} *
              <input
                required
                type="date"
                className={field}
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t("Mode de règlement")}
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className={field}
              >
                {["Espèces", "Virement", "Chèque", "Autre"].map((m) => (
                  <option key={m} value={m}>
                    {t(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t("Notes")}
              <input
                maxLength={1000}
                className={field}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Les règlements enregistrés ne sont pas modifiables dans ce prototype.")}
          </p>
          <div className="flex gap-4">
            <button disabled={busy} className={button}>
              {t("Enregistrer")}
            </button>
            <button type="button" onClick={() => setPayDoc(null)}>
              {t("Annuler")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
