import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Share2, Minus, Plus, Check, Star, Camera, Play, BadgeCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/Section";
import { products, formatTND, expertReviews, networkerTestimonials, type Product } from "@/lib/data";

export const Route = createFileRoute("/produit/$id")({
  loader: ({ params }): Product => {
    const p = products.find((x) => x.id === params.id);
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Produit"} — SwisDerm | RMM` },
      { name: "description", content: loaderData?.subtitle ?? "" },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-[60vh] grid place-items-center px-6 text-center">
      <div>
        <h1 className="font-serif text-3xl">Produit introuvable</h1>
        <Link to="/boutique" className="mt-4 inline-block text-[var(--gold)] hover:underline">Retour à la boutique</Link>
      </div>
    </div>
  ),
});

function ProductPage() {
  const product = Route.useLoaderData() as Product;
  const [qty, setQty] = useState(1);
  const [sliderPos, setSliderPos] = useState(50);

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-6 pt-8 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-[var(--gold)]">Accueil</Link>
        <span className="mx-2">›</span>
        <Link to="/boutique" className="hover:text-[var(--gold)]">Boutique</Link>
        <span className="mx-2">›</span>
        <span className="text-[var(--gold)]">{product.category}</span>
        <span className="mx-2">›</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      {/* Gallery & Info */}
      <section className="mx-auto max-w-7xl px-6 py-12 grid lg:grid-cols-2 gap-12">
        <div>
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#101010] to-[#0a0a0a] hairline grid place-items-center">
            <div className="absolute -inset-20 rounded-full opacity-40 blur-3xl bg-[var(--gold)]/30" />
            <div className="relative w-60 h-80 rounded-xl border border-[var(--gold)]/20 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] shadow-2xl grid place-items-center">
              <div className="text-center px-4">
                <div className="text-[10px] tracking-[0.3em] text-[var(--gold)]/70 uppercase">SwisDerm Switzerland</div>
                <div className="font-serif text-3xl mt-4">{product.name}</div>
                <div className="mt-4 mx-auto h-px w-12 bg-[var(--gold)]/40" />
                <div className="text-xs mt-3 text-muted-foreground">{product.volume}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-md hairline bg-card grid place-items-center text-[10px] text-muted-foreground hover:border-[var(--gold)]/40 cursor-pointer transition">
                Vue {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">{product.category}</div>
          <h1 className="font-serif text-4xl lg:text-5xl mt-3">{product.name}</h1>
          <p className="mt-2 text-muted-foreground italic">{product.subtitle}</p>

          <div className="mt-4 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/30"}`} />
            ))}
            <span className="text-sm text-muted-foreground ml-2">{product.rating} ({product.reviews} avis)</span>
          </div>

          <div className="mt-6 flex items-end gap-4">
            <span className="font-serif text-4xl text-gradient-gold">{formatTND(product.price)}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {product.volume}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {product.badges.map((b) => (
              <span key={b} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-[var(--gold)]/30 text-[var(--gold)]">{b}</span>
            ))}
          </div>

          <ul className="mt-6 space-y-2">
            {product.shortBenefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground/90">
                <Check className="h-4 w-4 text-[var(--gold)] mt-0.5 shrink-0" />{b}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center hairline rounded-full">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:text-[var(--gold)]"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-3 hover:text-[var(--gold)]"><Plus className="h-4 w-4" /></button>
            </div>
            <Button size="lg" className="flex-1 bg-gradient-gold text-background hover:opacity-90 font-medium">
              Ajouter au panier
            </Button>
            <button className="p-3 rounded-full hairline hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"><Heart className="h-4 w-4" /></button>
            <button className="p-3 rounded-full hairline hover:border-[var(--gold)]/40 hover:text-[var(--gold)]"><Share2 className="h-4 w-4" /></button>
          </div>

          <div className="mt-6 p-4 rounded-lg glass border border-[var(--gold)]/20">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">Avantage Networker</div>
            <p className="text-sm mt-1">Ce produit vous rapporte <span className="text-[var(--gold)] font-semibold">{product.pp} PP</span> pour votre qualification de rang.</p>
          </div>
        </div>
      </section>

      {/* TABS */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <Tabs defaultValue="description">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-6 overflow-x-auto">
            {[
              ["description", "Description"],
              ["benefits", "Bénéfices"],
              ["ingredients", "Ingrédients Actifs"],
              ["usage", "Mode d'Emploi"],
              ["video", "Vidéo"],
              ["reviews", "Avis Clients"],
              ["experts", "Avis Experts"],
            ].map(([v, l]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="px-0 pb-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-[var(--gold)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--gold)] text-sm whitespace-nowrap"
              >
                {l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="description" className="pt-8 max-w-3xl">
            <p className="text-foreground/85 leading-relaxed text-lg">{product.description}</p>
          </TabsContent>

          <TabsContent value="benefits" className="pt-8">
            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
              {product.shortBenefits.map((b) => (
                <div key={b} className="flex items-start gap-3 p-5 rounded-lg bg-card hairline">
                  <Check className="h-5 w-5 text-[var(--gold)] mt-0.5 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ingredients" className="pt-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {product.ingredients.map((ing) => (
                <div key={ing.name} className="p-6 rounded-xl glass hover-lift">
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/20 to-transparent grid place-items-center text-[var(--gold)] font-serif text-xl">
                    {ing.name[0]}
                  </div>
                  <h4 className="font-serif text-xl mt-4">{ing.name}</h4>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)] mt-1 italic">{ing.scientific}</div>
                  <ul className="mt-4 space-y-1.5">
                    {ing.benefits.map((b) => (
                      <li key={b} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="text-[var(--gold)]">•</span>{b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="pt-8 max-w-3xl">
            <ol className="space-y-6">
              {product.howToUse.map((step, i) => (
                <li key={i} className="flex gap-5">
                  <div className="shrink-0 w-10 h-10 rounded-full border-2 border-[var(--gold)]/40 grid place-items-center font-serif text-[var(--gold)]">{i + 1}</div>
                  <p className="pt-2 text-foreground/85 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </TabsContent>

          <TabsContent value="video" className="pt-8">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[var(--gold)]/20 via-[#0F0F0F] to-[#0A0A0A] hairline grid place-items-center">
              <button className="group">
                <div className="w-20 h-20 rounded-full bg-gradient-gold grid place-items-center transition-transform group-hover:scale-110">
                  <Play className="h-8 w-8 text-background ml-1 fill-background" />
                </div>
              </button>
              <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-muted-foreground">Vidéo descriptive à venir</div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="pt-8">
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { initial: "S", name: "Sarra M.", rating: 5, text: "Résultats visibles en 3 semaines. Texture sublime.", date: "il y a 12 jours" },
                { initial: "N", name: "Nadia B.", rating: 5, text: "Mes pores se sont vraiment resserrés. J'adore !", date: "il y a 1 mois" },
                { initial: "R", name: "Rim K.", rating: 4, text: "Très bon produit, parfum subtil et efficacité réelle.", date: "il y a 2 mois" },
                { initial: "I", name: "Inès D.", rating: 5, text: "Je rachète sans hésiter. Vraiment premium.", date: "il y a 3 mois" },
              ].map((r) => (
                <div key={r.name} className="p-5 rounded-xl bg-card hairline">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 grid place-items-center text-[var(--gold)] font-medium">{r.initial}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--gold)]">Achat vérifié · {r.date}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/30"}`} />)}
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">{r.text}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="experts" className="pt-8">
            <div className="grid md:grid-cols-3 gap-5">
              {expertReviews.map((e) => (
                <div key={e.name} className="p-6 rounded-xl bg-[#0F0F0F] hairline">
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--gold)] grid place-items-center font-serif text-lg text-[var(--gold)] bg-[var(--gold)]/10">
                    {e.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="mt-4 font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.specialty} · {e.institution}</div>
                  <p className="mt-4 text-sm text-foreground/85 italic"><span className="text-[var(--gold)] text-xl">"</span>{e.quote}<span className="text-[var(--gold)] text-xl">"</span></p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--gold)]">
                    <BadgeCheck className="h-3 w-3" /> Avis Expert Vérifié — RMM
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* BEFORE / AFTER */}
      <Section eyebrow="Crédibilité scientifique" title={<><Camera className="inline h-6 w-6 mr-2 text-[var(--gold)]" />Résultats <span className="text-gradient-gold">Réels</span></>} className="bg-[#0F0F0F]">
        <div className="max-w-3xl mx-auto">
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden hairline select-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] grid place-items-center text-muted-foreground">
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Après — Semaine 6</div>
                <div className="font-serif text-5xl mt-2 opacity-30">After</div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] grid place-items-center text-muted-foreground" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Avant — Semaine 0</div>
                <div className="font-serif text-5xl mt-2 opacity-30">Before</div>
              </div>
            </div>
            <div className="absolute top-0 bottom-0 w-px bg-[var(--gold)]" style={{ left: `${sliderPos}%` }}>
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-gold grid place-items-center cursor-ew-resize shadow-lg">
                <div className="text-background text-xs">↔</div>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize"
            />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Résultats réels — Testé sous contrôle dermatologique. <br className="sm:hidden" />
            <span className="opacity-70">Les résultats individuels peuvent varier selon la peau et l'assiduité d'utilisation.</span>
          </p>
        </div>
      </Section>

      {/* RELATED */}
      {related.length > 0 && (
        <Section eyebrow="Routine complète" title={<>Complétez votre <span className="text-gradient-gold">Routine</span></>}>
          <div className="grid sm:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link to="/produit/$id" params={{ id: p.id }} key={p.id} className="group flex gap-4 p-4 rounded-xl bg-card hairline hover-lift">
                <div className="w-20 h-24 shrink-0 rounded-md bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-[var(--gold)]/20 grid place-items-center">
                  <div className="text-[8px] tracking-wider text-[var(--gold)]/70 uppercase text-center px-1">{p.name}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-base group-hover:text-[var(--gold)] transition">{p.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.subtitle}</div>
                  <div className="text-sm text-[var(--gold)] mt-2">{formatTND(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* NETWORKER STORIES */}
      <Section eyebrow="Vécu communauté" title="Ils l'utilisent au quotidien" className="bg-[#0F0F0F]">
        <div className="grid md:grid-cols-3 gap-5">
          {networkerTestimonials.map((t) => (
            <div key={t.name} className="p-6 rounded-xl bg-card hairline">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/40 grid place-items-center text-[var(--gold)] font-medium">
                  {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--gold)]">{t.rank}</div>
                </div>
              </div>
              <p className="mt-4 text-sm italic text-foreground/80">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
