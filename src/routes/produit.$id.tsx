import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { catalogue } from "@/lib/product-catalogue";

export const Route = createFileRoute("/produit/$id")({
  loader: ({ params }) => {
    const product = catalogue.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Produit"} — RMM` },
      { name: "description", content: "Référence du catalogue RMM." },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-7xl px-6 py-24">
      <h1 className="font-serif text-3xl">Référence introuvable</h1>
      <Link to="/boutique" className="mt-5 inline-block text-[var(--gold)] underline">
        Retour au catalogue
      </Link>
    </div>
  ),
});
function ProductPage() {
  const product = Route.useLoaderData();
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <Link
        to="/boutique"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--gold)]"
      >
        <ArrowLeft size={16} /> Retour au catalogue
      </Link>
      <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
        <div className="grid aspect-[4/3] place-items-center rounded-xl border border-border bg-gradient-to-br from-[var(--gold)]/10 via-card to-card">
          <img
            src={`/products/${product.id}.jpg`}
            alt={`Visuel de ${product.name}, extrait de la brochure`}
            className="h-full max-h-96 w-full object-contain p-6"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Catalogue RMM</p>
          <h1 className="mt-4 font-serif text-4xl lg:text-5xl">{product.name}</h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          {product.ingredients && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.ingredients} Cette liste n’est pas une composition complète.
            </p>
          )}
          <div className="mt-6 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            Informations et visuel extraits de la brochure ; caractéristiques et disponibilité à
            confirmer. Le tarif sera communiqué ultérieurement.
          </div>
          <Link
            to="/demande-rendez-vous"
            className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--gold)] underline"
          >
            Demander un rendez-vous <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
