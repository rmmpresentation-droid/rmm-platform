import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { PackCard } from "@/components/product/PackCard";
import { Section } from "@/components/layout/Section";
import { products, packs } from "@/lib/data";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Boutique SwisDerm — Collection Exclusive | RMM" },
      { name: "description", content: "Toute la gamme SwisDerm Switzerland disponible en Tunisie." },
    ],
  }),
  component: Shop,
});

const categories = ["Tous", "Soin Visage", "Soin Corps", "Compléments", "Bien-être", "Maquillage"] as const;

function Shop() {
  const [cat, setCat] = useState<(typeof categories)[number]>("Tous");
  const list = cat === "Tous" ? products : products.filter((p) => p.category === cat);

  return (
    <div>
      <section className="relative pt-20 pb-12 border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-[var(--gold)]/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-6">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--gold)]">Collection Exclusive</span>
          </div>
          <h1 className="font-serif text-5xl lg:text-6xl">Boutique <span className="text-gradient-gold">SwisDerm</span></h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">11 références premium, formulées en Suisse, distribuées en Tunisie par RMM.</p>
        </div>
      </section>

      <Section>
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] transition border ${
                cat === c
                  ? "bg-gradient-gold text-background border-transparent"
                  : "border-border text-foreground/70 hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </Section>

      <Section eyebrow="Devenez partenaire" title={<>Packs de <span className="text-gradient-gold">Démarrage</span></>} subtitle="Lancez votre activité RMM avec le pack adapté à vos ambitions. Tous incluent l'accès au catalogue networker et nos formations." className="bg-[#0F0F0F]">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {packs.map((p) => <PackCard key={p.id} pack={p} />)}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Vous êtes déjà networker ?{" "}
            <Link to="/dashboard" className="text-[var(--gold)] hover:underline">Connectez-vous pour voir vos prix</Link>
          </p>
        </div>
      </Section>
    </div>
  );
}
