import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { products } from "@/lib/data";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Notre univers — RMM" },
      {
        name: "description",
        content:
          "Explorez l’univers RMM et découvrez une sélection illustrative de références SwisDerm.",
      },
    ],
  }),
  component: Catalogue,
});
const categories = [
  "Tous",
  "Soin Visage",
  "Soin Corps",
  "Compléments",
  "Bien-être",
  "Maquillage",
] as const;
function Catalogue() {
  const [category, setCategory] = useState<(typeof categories)[number]>("Tous");
  const shown = category === "Tous" ? products : products.filter((p) => p.category === category);
  return (
    <>
      <section className="site-page-hero">
        <div className="site-container">
          <p className="site-kicker">L’UNIVERS RMM / SWISDERM</p>
          <div className="site-page-title-row">
            <h1>
              La curiosité est
              <br />
              <em>un beau début.</em>
            </h1>
            <p>
              Une invitation à découvrir un univers de produits et à poser vos questions, sans
              engagement.
            </p>
          </div>
        </div>
      </section>
      <section className="site-section site-catalogue">
        <div className="site-container">
          <div className="site-catalogue-head">
            <div>
              <p className="site-kicker">EXPLORER LA COLLECTION</p>
              <h2>
                Une sélection <em>à découvrir.</em>
              </h2>
            </div>
            <p>
              Catalogue illustratif issu de la maquette. Les disponibilités et informations
              officielles restent à confirmer par RMM.
            </p>
          </div>
          <div className="site-filters" aria-label="Catégories de produits">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                aria-pressed={category === c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="site-product-grid">
            {shown.map((p, i) => (
              <Link key={p.id} to="/produit/$id" params={{ id: p.id }} className="site-product">
                <div className={`site-product-art tone-${i % 4}`}>
                  <span className="site-product-index">{String(i + 1).padStart(2, "0")} / RMM</span>
                  <div className="site-product-placeholder">
                    <small>SWISDERM</small>
                    <strong>{p.name}</strong>
                    <span>VISUEL ILLUSTRATIF</span>
                  </div>
                  <span className="site-product-arrow">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
                <div className="site-product-info">
                  <div>
                    <span>{p.category}</span>
                    <h3>{p.name}</h3>
                  </div>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            ))}
          </div>
          {!shown.length && <p className="site-body">Aucune référence dans cette catégorie.</p>}
        </div>
      </section>
      <section className="site-mini-cta">
        <div className="site-container">
          <div>
            <p className="site-kicker">UNE QUESTION ?</p>
            <h2>
              La bonne information
              <br />
              <em>fait la différence.</em>
            </h2>
          </div>
          <Link to="/networker" className="site-button site-button-outline">
            Découvrir RMM <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
