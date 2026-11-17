import { useCallback, useEffect, useState, type FormEvent } from "react";

type Variant = {
  id: string;
  product_id: string;
  format: string;
  quantity: number;
  active: boolean;
};
type Product = { id: string; title: string };
type Line = { variant: string; quantity: number; product?: string; format?: string };
type Option = { id: string; name: string; lines: Line[] };
type Pack = { id: string; name: string; priceMillimes: number; pp: number; optionCount: number };
type Order = {
  id: string;
  buyer_id: string;
  kind: string;
  status: string;
  rules_version: string;
  snapshot: {
    lines: Line[];
    priceMillimes: number;
    pp: number | null;
    pack?: Pack;
    options?: { id: string; name: string }[];
  };
};
type Person = { id: string; name: string; role: string };
type Data =
  | { initialized: false }
  | {
      initialized: true;
      rules: {
        version: string;
        approval: string;
        packs: Pack[];
        options: Option[];
        hydro: { priceMillimes: number };
      };
      variants: Variant[];
      products: Product[];
      custom: Option[];
      orders: Order[];
      profiles: { user_id: string; rank: string }[];
      movements: { variant_id: string; delta: number; reason: string; created_at: string }[];
    };
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const btn =
  "rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";
const card = "rounded-xl border border-border bg-card p-5";
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Service indisponible");
  return data as T;
}
const formatMoney = (v: number) =>
  new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(
    v / 1000,
  ) + " DT";
function parseMoney(s: string) {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(s)) return NaN;
  const [a, b = ""] = s.replace(",", ".").split(".");
  return Number(a) * 1000 + Number(b.padEnd(3, "0"));
}
function LinesEditor({
  lines,
  onChange,
  variants,
  products,
}: {
  lines: Line[];
  onChange: (v: Line[]) => void;
  variants: Variant[];
  products: Product[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Composition</p>
      {lines.map((line, i) => (
        <div className="flex flex-wrap gap-2" key={i}>
          <select
            aria-label={`Référence ${i + 1}`}
            className={`${field} flex-1 min-w-48`}
            value={line.variant}
            onChange={(e) =>
              onChange(lines.map((x, n) => (n === i ? { ...x, variant: e.target.value } : x)))
            }
          >
            <option value="">Choisir un produit et son format</option>
            {variants
              .filter((v) => v.active)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {products.find((p) => p.id === v.product_id)?.title || v.product_id} · {v.format}
                </option>
              ))}
          </select>
          <input
            aria-label={`Quantité ${i + 1}`}
            className={`${field} max-w-28`}
            type="number"
            min="1"
            max="10000"
            value={line.quantity}
            onChange={(e) =>
              onChange(
                lines.map((x, n) => (n === i ? { ...x, quantity: Number(e.target.value) } : x)),
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, n) => n !== i))}
            className="px-2 text-sm text-red-400"
          >
            Retirer
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-[var(--gold)]"
        onClick={() => onChange([...lines, { variant: "", quantity: 1 }])}
      >
        + Ajouter une référence
      </button>
    </div>
  );
}
export function CommerceWorkspace({
  view,
  directory,
  onCatalogueImported,
}: {
  view: "stock" | "commandes";
  directory: Person[];
  onCatalogueImported: () => Promise<void>;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"stock" | "options" | "packs" | "profils">("stock");
  const [product, setProduct] = useState("");
  const [format, setFormat] = useState("");
  const [variant, setVariant] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [optionName, setOptionName] = useState("");
  const [lines, setLines] = useState<Line[]>([{ variant: "", quantity: 1 }]);
  const [buyer, setBuyer] = useState("");
  const [rank, setRank] = useState("Silver");
  const [kind, setKind] = useState<"pack" | "hydro" | "custom">("pack");
  const [pack, setPack] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const load = useCallback(async () => {
    setData(await api<Data>("/api/commerce"));
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  async function action(work: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      await load();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function setup() {
    await action(async () => {
      await api("/api/catalogue/import", "POST");
      await api("/api/commerce/setup", "POST");
      await onCatalogueImported();
    }, "Catalogue et règles de préproduction initialisés ; les quantités sont à zéro.");
  }
  if (!data)
    return (
      <div className={`${card} mt-6`}>{error || "Chargement du module commandes et stock…"}</div>
    );
  if (!data.initialized)
    return (
      <section className={`${card} mt-6`}>
        <h2 className="font-serif text-2xl">Module produits et commandes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Initialisez les produits existants, les formats séparés et les règles validées pour la
          préproduction. Les quantités commencent à zéro ; les fiches existantes ne sont pas
          écrasées.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}
        <button disabled={busy} className={`${btn} mt-4`} onClick={() => void setup()}>
          Initialiser le module local
        </button>
      </section>
    );
  const { rules, variants, products, custom, orders, profiles, movements } = data;
  const variantName = (id: string) => {
    const v = variants.find((x) => x.id === id);
    return v
      ? `${products.find((p) => p.id === v.product_id)?.title || "Produit"} · ${v.format}`
      : id;
  };
  const currentPack = rules.packs.find((p) => p.id === pack);
  const allOptions = [...rules.options, ...custom];
  function showLines(items: Line[]) {
    return items
      .map(
        (l) =>
          `${l.quantity} × ${l.product ? `${l.product} · ${l.format}` : variantName(l.variant)}`,
      )
      .join(" ; ");
  }
  function submitOrder(e: FormEvent) {
    e.preventDefault();
    const amount = parseMoney(price);
    const body =
      kind === "pack"
        ? { buyerId: buyer, kind, packId: pack, options }
        : kind === "hydro"
          ? { buyerId: buyer, kind }
          : { buyerId: buyer, kind, lines, priceMillimes: amount };
    void action(
      () => api("/api/commerce/orders", "POST", body),
      "Commande enregistrée en brouillon ; aucun stock déduit.",
    );
  }
  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-xl border border-[var(--gold)]/30 bg-card p-5">
        <h2 className="font-serif text-2xl">
          {view === "stock"
            ? "Produits, stock, options et packs"
            : "Commandes et stock transactionnel"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Règles {rules.version} · préproduction locale. Stock par format, déduit uniquement à la
          validation. Les anciennes fiches restent séparées et ne déduisent pas le stock.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-400/50 p-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md border border-green-500/40 p-3 text-sm">
          {message}
        </p>
      )}
      {view === "stock" ? (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Gestion commerciale">
            {(
              [
                ["stock", "Stock par format"],
                ["options", "Options d’achat"],
                ["packs", "Packs"],
                ["profils", "Profils networkers"],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`rounded-md border px-4 py-2 text-sm ${tab === id ? "border-[var(--gold)] text-[var(--gold)]" : "border-border"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "stock" && (
            <div className="space-y-4">
              <div className={card}>
                <h3 className="font-serif text-xl">Références et unités</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Les formats sont distincts. Les quantités sont modifiées par mouvement avec motif.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {variants.map((v) => (
                    <div key={v.id} className="rounded-md border border-border p-3 text-sm">
                      <strong>{variantName(v.id)}</strong>
                      <p className="mt-1 text-[var(--gold)]">{v.quantity} unité(s)</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <form
                  className={`${card} space-y-3`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      () =>
                        api("/api/commerce/stock", "POST", {
                          variant,
                          delta: Number(delta),
                          reason,
                        }),
                      "Mouvement enregistré.",
                    );
                  }}
                >
                  <h3 className="font-serif text-xl">Ajuster le stock</h3>
                  <label className="block text-sm">
                    Référence
                    <select
                      required
                      className={`${field} mt-1`}
                      value={variant}
                      onChange={(e) => setVariant(e.target.value)}
                    >
                      <option value="">Sélectionner</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {variantName(v.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    Variation (+ entrée, − sortie)
                    <input
                      required
                      type="number"
                      step="1"
                      className={`${field} mt-1`}
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    Motif
                    <input
                      required
                      maxLength={250}
                      className={`${field} mt-1`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button disabled={busy} className={btn}>
                    Enregistrer le mouvement
                  </button>
                </form>
                <form
                  className={`${card} space-y-3`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      () => api("/api/commerce/variants", "POST", { productId: product, format }),
                      "Format ajouté avec stock initial zéro.",
                    );
                  }}
                >
                  <h3 className="font-serif text-xl">Ajouter un format</h3>
                  <label className="block text-sm">
                    Produit
                    <select
                      required
                      className={`${field} mt-1`}
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    >
                      <option value="">Sélectionner</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    Format
                    <input
                      required
                      maxLength={160}
                      className={`${field} mt-1`}
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    />
                  </label>
                  <button disabled={busy} className={btn}>
                    Ajouter un format
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Pour ajouter ou modifier un produit, utilisez les fiches produits ci-dessous.
                  </p>
                </form>
              </div>
              <details className={card}>
                <summary className="cursor-pointer font-medium">
                  Historique des mouvements ({movements.length})
                </summary>
                <ul className="mt-3 space-y-2 text-xs">
                  {movements.map((m, i) => (
                    <li key={`${m.variant_id}-${i}`}>
                      {variantName(m.variant_id)} · {m.delta > 0 ? "+" : ""}
                      {m.delta} · {m.reason} · {new Date(m.created_at).toLocaleString("fr-TN")}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
          {tab === "packs" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rules.packs.map((p) => (
                <div key={p.id} className={card}>
                  <h3 className="font-serif text-xl">{p.name}</h3>
                  <p className="mt-3 text-sm">
                    {formatMoney(p.priceMillimes)} · {p.pp} PP
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.optionCount} option(s), répétition autorisée
                  </p>
                </div>
              ))}
              <div className={card}>
                <h3 className="font-serif text-xl">S Hydro · commande distincte</h3>
                <p className="mt-3 text-sm">{formatMoney(rules.hydro.priceMillimes)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Réservée au profil Silver à la validation · PP non défini.
                </p>
              </div>
            </div>
          )}
          {tab === "options" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allOptions.map((o) => (
                  <div key={o.id} className={card}>
                    <h3 className="font-serif text-xl">{o.name}</h3>
                    <p className="mt-3 text-sm text-muted-foreground">{showLines(o.lines)}</p>
                  </div>
                ))}
              </div>
              <form
                className={`${card} space-y-4`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(
                    () => api("/api/commerce/options", "POST", { name: optionName, lines }),
                    "Option personnalisée ajoutée.",
                  );
                }}
              >
                <h3 className="font-serif text-xl">Créer une option personnalisée</h3>
                <label className="block text-sm">
                  Nom
                  <input
                    required
                    maxLength={160}
                    className={`${field} mt-1`}
                    value={optionName}
                    onChange={(e) => setOptionName(e.target.value)}
                  />
                </label>
                <LinesEditor
                  lines={lines}
                  onChange={setLines}
                  products={products}
                  variants={variants}
                />
                <p className="text-xs text-muted-foreground">
                  S Hydro n’est pas éligible aux options de pack.
                </p>
                <button disabled={busy} className={btn}>
                  Créer l’option
                </button>
              </form>
            </div>
          )}
          {tab === "profils" && (
            <form
              className={`${card} max-w-xl space-y-3`}
              onSubmit={(e) => {
                e.preventDefault();
                void action(
                  () => api(`/api/commerce/profiles/${buyer}`, "PUT", { rank }),
                  "Profil mis à jour.",
                );
              }}
            >
              <h3 className="font-serif text-xl">Profil commercial du networker</h3>
              <label className="block text-sm">
                Networker
                <select
                  required
                  className={`${field} mt-1`}
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {directory
                    .filter((p) => p.role === "networker")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {profiles.find((x) => x.user_id === p.id)?.rank || "non défini"}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm">
                Profil
                <select
                  className={`${field} mt-1`}
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                >
                  {["Bronze", "Business", "Silver", "Gold", "Platinum"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <button disabled={busy} className={btn}>
                Enregistrer le profil
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="space-y-5">
          <form className={`${card} space-y-4`} onSubmit={submitOrder}>
            <h3 className="font-serif text-xl">Nouvelle commande interne</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Networker acheteur
                <select
                  required
                  className={`${field} mt-1`}
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {directory
                    .filter((p) => p.role === "networker")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ·{" "}
                        {profiles.find((x) => x.user_id === p.id)?.rank || "profil non défini"}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm">
                Type
                <select
                  className={`${field} mt-1`}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                >
                  <option value="pack">Pack et options</option>
                  <option value="hydro">S Hydro séparé</option>
                  <option value="custom">Commande personnalisée</option>
                </select>
              </label>
            </div>
            {kind === "pack" && (
              <>
                <label className="block text-sm">
                  Pack
                  <select
                    required
                    className={`${field} mt-1`}
                    value={pack}
                    onChange={(e) => {
                      const id = e.target.value;
                      setPack(id);
                      setOptions(
                        Array(rules.packs.find((p) => p.id === id)?.optionCount || 0).fill(""),
                      );
                    }}
                  >
                    <option value="">Sélectionner</option>
                    {rules.packs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatMoney(p.priceMillimes)} · {p.pp} PP
                      </option>
                    ))}
                  </select>
                </label>
                {currentPack && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((value, i) => (
                      <label key={i} className="block text-sm">
                        Option {i + 1}
                        <select
                          required
                          className={`${field} mt-1`}
                          value={value}
                          onChange={(e) =>
                            setOptions(options.map((x, n) => (n === i ? e.target.value : x)))
                          }
                        >
                          <option value="">Sélectionner</option>
                          {allOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} · {showLines(o.lines)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
            {kind === "hydro" && (
              <p className="rounded-md border border-border p-3 text-sm">
                Commande distincte : {formatMoney(rules.hydro.priceMillimes)} · profil Silver requis
                à la validation.
              </p>
            )}
            {kind === "custom" && (
              <>
                <LinesEditor
                  lines={lines}
                  onChange={setLines}
                  products={products}
                  variants={variants}
                />
                <label className="block text-sm">
                  Prix fixé par l’administration (DT)
                  <input
                    required
                    inputMode="decimal"
                    className={`${field} mt-1`}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0,000"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  S Hydro est vendu uniquement séparément ; PP non défini.
                </p>
              </>
            )}
            <button disabled={busy} className={btn}>
              Créer le brouillon
            </button>
          </form>
          <div className={card}>
            <h3 className="font-serif text-xl">Commandes</h3>
            {orders.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Aucune commande dans ce module.</p>
            )}
            <div className="mt-4 space-y-3">
              {orders.map((o) => (
                <article key={o.id} className="rounded-md border border-border p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>
                      {o.snapshot.pack?.name || (o.kind === "hydro" ? "S Hydro" : "Personnalisée")}{" "}
                      · {directory.find((p) => p.id === o.buyer_id)?.name || "Compte indisponible"}
                    </strong>
                    <span>{o.status}</span>
                  </div>
                  <p className="mt-2 text-muted-foreground">{showLines(o.snapshot.lines)}</p>
                  <p className="mt-2">
                    {formatMoney(o.snapshot.priceMillimes)}
                    {o.snapshot.pp !== null ? ` · ${o.snapshot.pp} PP` : ""} · règles{" "}
                    {o.rules_version}
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
                      className={`${btn} mt-3`}
                      onClick={() => {
                        if (confirm("Valider cette commande et déduire le stock ?"))
                          void action(
                            () => api(`/api/commerce/orders/${o.id}/validate`, "POST"),
                            "Commande validée et stock déduit.",
                          );
                      }}
                    >
                      Valider et déduire le stock
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
