import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { products, universeLabels, type Universe } from "@/data/products";
import { ArrowUpRight } from "lucide-react";
export const Route = createFileRoute("/produits/")({
  head: () => ({
    meta: [
      { title: "La collection — RMM" },
      { name: "description", content: "Découvrez les références de la collection SWISDERM." },
      { property: "og:title", content: "La collection — RMM" },
    ],
  }),
  component: Products,
});
function Products() {
  const [filter, setFilter] = useState<Universe | "tout">("tout");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("univers");
    if (q && q in universeLabels) setFilter(q as Universe);
  }, []);
  const filtered = products.filter((p) => filter === "tout" || p.universe === filter);
  return (
    <div className="maison">
      <section className="maison-wrap maison-collection-head">
        <p className="maison-eyebrow">LA COLLECTION — SWISDERM</p>
        <h1>
          Des gestes qui
          <br />
          <em>vous ressemblent.</em>
        </h1>
        <p>
          Des références à découvrir selon vos envies. Les informations des brochures restent à
          confirmer auprès de la marque.
        </p>
      </section>
      <section className="maison-wrap maison-collection">
        <div className="maison-filters" aria-label="Filtrer par univers">
          {(["tout", "visage", "teint", "corps", "interieur"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setFilter(u)}
              aria-pressed={filter === u}
              className={filter === u ? "selected" : ""}
            >
              {u === "tout" ? "Toute la collection" : universeLabels[u]}
            </button>
          ))}
        </div>
        <p className="maison-count" aria-live="polite">
          {filtered.length} référence{filtered.length > 1 ? "s" : ""}
        </p>
        <div className="maison-product-grid">
          {filtered.map((p, i) => (
            <a key={p.slug} href={`/produits/${p.slug}`} className="maison-product">
              <div className={`maison-product-art shade-${i % 4}`}>
                <img src={p.image} alt={`Visuel ${p.name}`} loading="lazy" />
              </div>
              <div className="maison-product-caption">
                <div>
                  <small>{universeLabels[p.universe]}</small>
                  <h2>{p.name}</h2>
                  <p>Format à confirmer · Prix sur demande</p>
                </div>
                <ArrowUpRight size={22} strokeWidth={1} />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
