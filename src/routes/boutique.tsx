import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/product/ProductCard";
import { catalogue } from "@/lib/product-catalogue";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Catalogue produits — RMM" },
      { name: "description", content: "Découvrez les références du catalogue RMM." },
    ],
  }),
  component: Shop,
});
function Shop() {
  return (
    <div>
      <section className="border-b border-border px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">Notre sélection</p>
        <h1 className="mt-4 font-serif text-5xl">
          Catalogue <span className="text-gradient-gold">produits</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Découvrez les références issues des documents transmis. Les noms, caractéristiques et
          disponibilités restent à valider par l’entreprise.
        </p>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Les références</h2>
          <span className="text-sm text-muted-foreground">
            {catalogue.length} documents produits
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalogue.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
