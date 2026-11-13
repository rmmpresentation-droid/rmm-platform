import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductCard } from "@/components/product/ProductCard";
import { catalogue, catalogueImage } from "@/lib/product-catalogue";

export const Route = createFileRoute("/produit/$id")({
  loader: ({ params }) => {
    const product = catalogue.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Produit"} — SwisDerm | RMM` },
      { name: "description", content: loaderData?.description ?? "Référence du catalogue RMM." },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-[60vh] grid place-items-center px-6 text-center">
      <div>
        <h1 className="font-serif text-3xl">Produit introuvable</h1>
        <Link to="/boutique" className="mt-4 inline-block text-[var(--gold)] hover:underline">
          Retour à la boutique
        </Link>
      </div>
    </div>
  ),
});

function ProductPage() {
  const product = Route.useLoaderData();
  const is3s = product.id === "3s-capsule";
  const related = catalogue.filter((p) => p.id !== product.id).slice(0, 3);
  const points = is3s
    ? ["Format capsule", "Extraits végétaux de pomme, d’orange et de rose", "Huile de jojoba"]
    : [];
  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 pt-8 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-[var(--gold)]">
          Accueil
        </Link>
        <span className="mx-2">›</span>
        <Link to="/boutique" className="hover:text-[var(--gold)]">
          Boutique
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{product.name}</span>
      </div>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-2">
        <div
          className={`relative grid aspect-[4/5] place-items-center overflow-hidden rounded-xl hairline ${is3s ? "bg-black" : "bg-[#faf9f6]"}`}
        >
          <img
            src={catalogueImage(product.id)}
            alt={`Visuel de ${product.name}`}
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
            Catalogue RMM · SwisDerm
          </div>
          <h1 className="mt-3 font-serif text-4xl lg:text-5xl">
            {is3s ? "SWISDERM 3S Capsule" : product.name}
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">{product.description}</p>
          {points.length > 0 && (
            <ul className="mt-6 space-y-2">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                  {point}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 rounded-lg border border-[var(--gold)]/20 p-4 text-sm text-muted-foreground">
            Informations issues de la brochure, à confirmer. Tarif communiqué ultérieurement.
          </div>
          <Link
            to="/demande-rendez-vous"
            className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--gold)] underline"
          >
            Demander un rendez-vous <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12">
        <Tabs defaultValue="description">
          <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
            {[
              ["description", "Description"],
              ["benefits", "Bénéfices"],
              ["ingredients", "Ingrédients Actifs"],
              ["usage", "Mode d’Emploi"],
              ["video", "Vidéo"],
              ["reviews", "Avis Clients"],
              ["experts", "Avis Experts"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="whitespace-nowrap rounded-none px-0 pb-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-[var(--gold)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--gold)]"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="description" className="max-w-3xl pt-8">
            <p className="text-lg leading-relaxed text-foreground/85">{product.description}</p>
          </TabsContent>
          <TabsContent value="benefits" className="max-w-3xl pt-8">
            <p className="text-muted-foreground">
              Les bénéfices mentionnés dans la brochure sont en cours de vérification et ne sont pas
              encore publiés.
            </p>
          </TabsContent>
          <TabsContent value="ingredients" className="max-w-3xl pt-8">
            <p className="leading-relaxed">
              {product.ingredients || "Informations sur les ingrédients à compléter."}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Ces indications ne constituent pas une liste INCI complète. Composition officielle à
              confirmer.
            </p>
          </TabsContent>
          <TabsContent value="usage" className="max-w-3xl pt-8">
            <p className="text-muted-foreground">
              Mode d’emploi et précautions à confirmer auprès du fabricant.
            </p>
          </TabsContent>
          <TabsContent value="video" className="pt-8">
            <p className="text-muted-foreground">Aucune vidéo disponible pour le moment.</p>
          </TabsContent>
          <TabsContent value="reviews" className="pt-8">
            <p className="text-muted-foreground">
              Aucun avis client vérifié disponible pour le moment.
            </p>
          </TabsContent>
          <TabsContent value="experts" className="pt-8">
            <p className="text-muted-foreground">
              Aucun avis expert vérifié disponible pour le moment.
            </p>
          </TabsContent>
        </Tabs>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="font-serif text-3xl">Découvrir d’autres références</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
