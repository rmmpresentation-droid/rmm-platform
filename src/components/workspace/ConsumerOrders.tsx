import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Prospect = { id: string; title: string; extra: Record<string, string> };
type Variant = { id: string; product_id: string; format: string; active: boolean };
type Product = { id: string; title: string };
type Line = {
  variant: string;
  quantity: number;
  product?: string;
  format?: string;
  unitPriceMillimes?: number;
};
type Option = { id: string; name: string; lines: Line[] };
type Pack = { id: string; name: string; priceMillimes: number; pp: number; optionCount: number };
type Order = {
  id: string;
  prospect_id: string;
  kind: string;
  status: string;
  rules_version: string;
  snapshot: {
    consumer: { name: string; phone: string; email: string };
    pack?: Pack;
    options?: { name: string }[];
    lines: Line[];
    priceMillimes: number;
    pp: number | null;
  };
};
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const button =
  "rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";
const card = "rounded-xl border border-border bg-card p-5";
const money = (v: number) =>
  `${new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v / 1000)} DT`;
function parseMoney(s: string) {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(s)) return NaN;
  const [a, b = ""] = s.replace(",", ".").split(".");
  return Number(a) * 1000 + Number(b.padEnd(3, "0"));
}
async function send(url: string, body?: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Service indisponible");
  return data;
}
export function ConsumerOrders({
  prospects,
  variants,
  products,
  packs,
  options,
  orders,
  hydroVariant,
  onRefresh,
}: {
  prospects: Prospect[];
  variants: Variant[];
  products: Product[];
  packs: Pack[];
  options: Option[];
  orders: Order[];
  hydroVariant: string;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [source, setSource] = useState<"existing" | "new">("existing");
  const [prospect, setProspect] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"pack" | "retail">("pack");
  const [pack, setPack] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const [lines, setLines] = useState([{ variant: "", quantity: 1, price: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const current = packs.find((p) => p.id === pack);
  const hydroProduct = variants.find((v) => v.id === hydroVariant)?.product_id;
  const available = variants.filter(
    (v) => v.active && v.id !== hydroVariant && (!hydroProduct || v.product_id !== hydroProduct),
  );
  const variantName = (id: string) => {
    const v = variants.find((x) => x.id === id);
    return v
      ? `${products.find((p) => p.id === v.product_id)?.title || t("Produit")} · ${t(v.format)}`
      : id;
  };
  const showLines = (items: Line[]) =>
    items
      .map(
        (l) =>
          `${l.quantity} × ${l.product ? `${l.product} · ${l.format}` : variantName(l.variant)}${l.unitPriceMillimes !== undefined ? ` · ${money(l.unitPriceMillimes)}` : ""}`,
      )
      .join(" ; ");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const consumer =
        source === "existing"
          ? { type: "existing", prospectId: prospect }
          : { type: "new", name, phone, email };
      const retailLines = lines.map((l) => ({
        variant: l.variant,
        quantity: l.quantity,
        unitPriceMillimes: parseMoney(l.price),
      }));
      if (kind === "retail" && retailLines.some((l) => !Number.isSafeInteger(l.unitPriceMillimes)))
        throw new Error(t("Indiquez un prix unitaire valide en dinars."));
      await send(
        "/api/commerce/consumer-orders",
        kind === "pack"
          ? { consumer, kind, packId: pack, options: choices }
          : { consumer, kind, lines: retailLines },
      );
      setName("");
      setPhone("");
      setEmail("");
      setProspect("");
      setPack("");
      setChoices([]);
      setLines([{ variant: "", quantity: 1, price: "" }]);
      setMessage(t("Commande enregistrée en brouillon ; aucun stock déduit."));
      try {
        await onRefresh();
      } catch {
        setError(
          t(
            "Commande enregistrée, mais actualisation impossible. Rechargez la page avant de réessayer.",
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  async function validate(order: Order) {
    if (!confirm(t("Valider cette commande et déduire le stock ?"))) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await send(`/api/commerce/consumer-orders/${order.id}/validate`);
      setMessage(t("Commande validée et stock déduit."));
      try {
        await onRefresh();
      } catch {
        setError(
          t(
            "Commande enregistrée, mais actualisation impossible. Rechargez la page avant de réessayer.",
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Service indisponible"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-md border border-red-400/50 p-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md border border-green-500/40 p-3 text-sm">
          {message}
        </p>
      )}
      <form className={`${card} space-y-4`} onSubmit={submit}>
        <h3 className="font-serif text-xl">{t("Commande consommateur")}</h3>
        <p className="text-sm text-muted-foreground">
          {t(
            "Choisissez un prospect existant ou créez sa fiche, puis sélectionnez un pack ou des produits individuels.",
          )}
        </p>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="mb-2 font-medium">{t("Client")}</legend>
          <label>
            <input
              type="radio"
              name="consumer-source"
              checked={source === "existing"}
              onChange={() => setSource("existing")}
            />{" "}
            {t("Prospect existant")}
          </label>
          <label>
            <input
              type="radio"
              name="consumer-source"
              checked={source === "new"}
              onChange={() => setSource("new")}
            />{" "}
            {t("Nouveau consommateur")}
          </label>
        </fieldset>
        {source === "existing" ? (
          <label className="block text-sm">
            {t("Sélectionner un prospect")}
            <select
              required
              className={`${field} mt-2`}
              value={prospect}
              onChange={(e) => setProspect(e.target.value)}
            >
              <option value="">{t("Sélectionner")}</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.extra.phone ? ` · ${p.extra.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              {t("Nom complet")} *
              <input
                required
                maxLength={160}
                className={`${field} mt-2`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              {t("Téléphone")} *
              <input
                required
                type="tel"
                maxLength={100}
                className={`${field} mt-2`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              {t("E-mail (facultatif)")}
              <input
                type="email"
                maxLength={254}
                className={`${field} mt-2`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <p className="self-end text-xs text-muted-foreground">
              {t("Une fiche prospect sera créée avec la commande, sans compte utilisateur.")}
            </p>
          </div>
        )}
        <label className="block text-sm">
          {t("Type de commande")}
          <select
            className={`${field} mt-2`}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "pack" | "retail");
              setPack("");
              setChoices([]);
            }}
          >
            <option value="pack">{t("Pack et options")}</option>
            <option value="retail">{t("Produits individuels")}</option>
          </select>
        </label>
        {kind === "pack" ? (
          <div className="space-y-3">
            <label className="block text-sm">
              {t("Choisir un pack")}
              <select
                required
                className={`${field} mt-2`}
                value={pack}
                onChange={(e) => {
                  setPack(e.target.value);
                  setChoices(
                    Array(packs.find((p) => p.id === e.target.value)?.optionCount || 0).fill(""),
                  );
                }}
              >
                <option value="">{t("Sélectionner")}</option>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.priceMillimes)} · {p.optionCount} {t("option(s)")}
                  </option>
                ))}
              </select>
            </label>
            {current && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-sm">
                  {t("Choisissez les options du pack ; elles peuvent être répétées.")}
                </p>
                {choices.map((value, i) => (
                  <label key={i} className="block text-sm">
                    {t("Choix")} {i + 1}
                    <select
                      required
                      value={value}
                      className={`${field} mt-1`}
                      onChange={(e) =>
                        setChoices(choices.map((x, n) => (n === i ? e.target.value : x)))
                      }
                    >
                      <option value="">{t("Sélectionner une option")}</option>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} · {showLines(o.lines)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <p className="text-sm">
                  {t("Total du pack :")} {money(current.priceMillimes)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm">
              {t("Saisissez le prix unitaire de chaque produit en dinars.")}
            </p>
            {lines.map((line, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <label className="text-sm">
                  {t("Produit et format")}
                  <select
                    required
                    className={`${field} mt-1`}
                    value={line.variant}
                    onChange={(e) =>
                      setLines(
                        lines.map((l, n) => (n === i ? { ...l, variant: e.target.value } : l)),
                      )
                    }
                  >
                    <option value="">{t("Sélectionner")}</option>
                    {available.map((v) => (
                      <option key={v.id} value={v.id}>
                        {variantName(v.id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  {t("Quantité")}
                  <input
                    required
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    className={`${field} mt-1`}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines(
                        lines.map((l, n) =>
                          n === i ? { ...l, quantity: Number(e.target.value) } : l,
                        ),
                      )
                    }
                  />
                </label>
                <label className="text-sm">
                  {t("Prix unitaire (DT)")}
                  <input
                    required
                    inputMode="decimal"
                    className={`${field} mt-1`}
                    value={line.price}
                    onChange={(e) =>
                      setLines(lines.map((l, n) => (n === i ? { ...l, price: e.target.value } : l)))
                    }
                    placeholder="0,000"
                  />
                </label>
                <button
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, n) => n !== i))}
                  className="pb-2 text-sm text-red-500 disabled:opacity-40"
                >
                  {t("Retirer")}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={lines.length >= 100}
              onClick={() => setLines([...lines, { variant: "", quantity: 1, price: "" }])}
              className="text-sm text-[var(--gold)] disabled:opacity-50"
            >
              {t("+ Ajouter une référence")}
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t("S Hydro reste réservé à une commande séparée avec profil Silver vérifié.")}
        </p>
        <button
          className={button}
          disabled={
            busy ||
            (source === "existing" && !prospect) ||
            (kind === "pack" && (!current || choices.some((v) => !v)))
          }
        >
          {t("Créer le brouillon")}
        </button>
      </form>
      <div className={card}>
        <h3 className="font-serif text-xl">{t("Commandes consommateurs")}</h3>
        {!orders.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("Aucune commande dans ce module.")}
          </p>
        )}
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="rounded-md border border-border p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {o.snapshot.consumer.name} · {o.snapshot.pack?.name || t("Produits individuels")}
                </strong>
                <span>{t(o.status)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[o.snapshot.consumer.phone, o.snapshot.consumer.email].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-2 text-muted-foreground">{showLines(o.snapshot.lines)}</p>
              <p className="mt-2">
                {money(o.snapshot.priceMillimes)} · {t("Règles")} {o.rules_version}
              </p>
              {o.snapshot.options && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.snapshot.options.map((x) => x.name).join(" · ")}
                </p>
              )}
              {o.status === "Brouillon" && (
                <button
                  type="button"
                  disabled={busy}
                  className={`${button} mt-3`}
                  onClick={() => void validate(o)}
                >
                  {t("Valider et déduire le stock")}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
