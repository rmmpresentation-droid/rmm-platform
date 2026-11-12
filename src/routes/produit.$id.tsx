import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { products } from "@/lib/data";

export const Route = createFileRoute("/produit/$id")({
  loader: ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { id: product.id, name: product.name, category: product.category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Produit"} — RMM` },
      { name: "description", content: "Découvrez une référence illustrative de l’univers RMM." },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="site-container site-section">
      <h1 className="site-simple-title">Produit introuvable</h1>
      <Link to="/boutique" className="site-text-link">
        Retour à notre univers <ArrowUpRight size={16} />
      </Link>
    </div>
  ),
});
function ProductPage() {
  const product = Route.useLoaderData();
  return (
    <section className="site-section">
      <div className="site-container">
        <Link to="/boutique" className="site-back">
          <ArrowLeft size={15} /> Retour à notre univers
        </Link>
        <div className="site-detail-grid">
          <div className="site-detail-art">
            <div className="site-product-placeholder">
              <small>SWISDERM</small>
              <strong>{product.name}</strong>
              <span>VISUEL ILLUSTRATIF</span>
            </div>
          </div>
          <div className="site-detail-copy">
            <p className="site-kicker">{product.category.toUpperCase()} / NOTRE UNIVERS</p>
            <h1>{product.name}</h1>
            <p>Une référence présentée à titre illustratif dans l’univers RMM.</p>
            <div className="site-detail-note">
              <strong>Informations en cours de validation</strong>
              <p>
                Les caractéristiques, les conseils d’utilisation, les prix et la disponibilité
                doivent être confirmés à partir des documents officiels de l’entreprise.
              </p>
            </div>
            <Link to="/networker" className="site-button site-button-primary">
              Découvrir notre approche <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
