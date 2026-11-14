import { createFileRoute, notFound } from "@tanstack/react-router";
import { products, universeLabels } from "@/data/products";
import { ArrowUpRight } from "lucide-react";
export const Route = createFileRoute("/produits/$slug")({
  loader: ({ params }) => {
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Produit"} — RMM` },
      {
        name: "description",
        content: loaderData?.description.fr ?? "Référence de la collection RMM.",
      },
    ],
  }),
  component: Product,
});
function Product() {
  const product = Route.useLoaderData();
  return (
    <div className="maison">
      <div className="maison-wrap maison-breadcrumb">
        <a href="/">Accueil</a> / <a href="/produits">Collection</a> / {product.name}
      </div>
      <section className="maison-wrap maison-detail">
        <div className="maison-detail-art">
          <img src={product.image} alt={`Visuel ${product.name}`} />
        </div>
        <div className="maison-detail-copy">
          <p className="maison-eyebrow">SWISDERM — {universeLabels[product.universe]}</p>
          <h1>{product.name}</h1>
          <p>{product.description.fr}</p>
          <p className="maison-detail-price">Prix sur demande</p>
          <p className="maison-small">
            Le prix, le format et la disponibilité sont à confirmer. Contact WhatsApp à compléter.
          </p>
          <a href="/produits" className="maison-text-link">
            ← Retour à la collection
          </a>
        </div>
      </section>
      <section className="maison-wrap maison-detail-content">
        <div>
          <p className="maison-eyebrow">À DÉCOUVRIR</p>
          <h2>
            Dans le <em>détail.</em>
          </h2>
        </div>
        <div>
          <details open>
            <summary>
              Ingrédients cités dans la brochure <span>−</span>
            </summary>
            <p>
              {product.ingredients.fr || "Informations à compléter."} La liste INCI complète est à
              confirmer.
            </p>
          </details>
          <details>
            <summary>
              Mode d’emploi et précautions <span>+</span>
            </summary>
            <p>Mode d’emploi et précautions officielles à confirmer auprès du fabricant.</p>
          </details>
          <details>
            <summary>
              Caractéristiques et disponibilité <span>+</span>
            </summary>
            <p>Informations à compléter et à valider.</p>
          </details>
          <p className="maison-small">
            Les produits cosmétiques et compléments ne remplacent pas un avis médical. Ne pas
            utiliser en cas d’irritation ; demandez conseil à un professionnel de santé si
            nécessaire.
          </p>
        </div>
      </section>
    </div>
  );
}
