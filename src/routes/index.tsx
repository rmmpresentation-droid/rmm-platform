import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Crown, Eye, Zap, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/Section";
import { ProductCard } from "@/components/product/ProductCard";
import { expertReviews, networkerTestimonials } from "@/lib/data";
import { catalogue } from "@/lib/product-catalogue";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RMM — L'excellence suisse, l'ascension tunisienne" },
      { name: "description", content: "Découvrez SwisDerm Switzerland en Tunisie. Soins premium, opportunité network marketing." },
    ],
  }),
  component: Home,
});

const pillars = [
  { icon: Crown, title: "Leadership", subtitle: "Soin Visage", desc: "Une routine signature pour révéler l'éclat naturel et structurer la peau." },
  { icon: Sparkles, title: "Mastery", subtitle: "Soin Corps", desc: "Sculpter, raffermir, sublimer chaque zone avec précision et élégance." },
  { icon: Eye, title: "Vision", subtitle: "Compléments", desc: "Nourrir la beauté de l'intérieur via des actifs cellulaires d'excellence." },
  { icon: Zap, title: "Action", subtitle: "Bien-être", desc: "Des innovations comme l'eau hydrogénée pour une vitalité durable." },
];

function Home() {
  const productSelection = catalogue.slice(0, 4);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-[var(--gold)]/15 blur-[120px] animate-glow-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--gold)]/10 blur-[100px] animate-glow-pulse" style={{ animationDelay: "2s" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pt-28 pb-24 lg:pt-40 lg:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-8 animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/80">Franchise officielle SwisDerm Switzerland</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Rise in <span className="text-gradient-gold">Mindset.</span><br />
            Master Your <span className="text-gradient-gold">Future.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base lg:text-lg text-muted-foreground leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
            L'excellence suisse au service de votre bien-être. Franchise officielle SwisDerm en Tunisie.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button asChild size="lg" className="bg-gradient-gold text-background hover:opacity-90 font-medium px-8">
              <Link to="/boutique">Découvrir la boutique <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:text-[var(--gold-light)] px-8">
              <Link to="/networker">Rejoindre le réseau</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <Section eyebrow="Sélection signature" title={<>Nos <span className="text-gradient-gold">références</span></>} subtitle="Une sélection issue des documents transmis, dont les informations restent à valider.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {productSelection.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </Section>

      {/* FOUR PILLARS */}
      <Section eyebrow="Notre philosophie" title={<>The <span className="text-gradient-gold">Four Pillars</span></>} subtitle="Quatre piliers fondateurs qui structurent l'expérience RMM, de l'extérieur à l'intérieur.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <div key={p.title} className="relative p-7 rounded-xl bg-card hairline hover-lift animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="w-12 h-12 rounded-full grid place-items-center bg-[var(--gold)]/10 border border-[var(--gold)]/30">
                <p.icon className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <h3 className="font-serif text-2xl mt-5">{p.title}</h3>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)] mt-1">{p.subtitle}</div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* EXPERT REVIEWS */}
      <Section eyebrow="Validé par les experts" title={<>Avis d'<span className="text-gradient-gold">Experts</span></>} className="bg-[#0F0F0F]">
        <div className="grid lg:grid-cols-3 gap-6">
          {expertReviews.map((e) => (
            <div key={e.name} className="p-7 rounded-xl bg-card hairline">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gold)]/30 to-[#1a1a1a] border-2 border-[var(--gold)]/40 grid place-items-center font-serif text-lg text-[var(--gold)]">
                  {e.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.specialty} · {e.institution}</div>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--gold)] px-2 py-0.5 rounded-full border border-[var(--gold)]/30">
                <BadgeCheck className="h-3 w-3" /> Expert vérifié
              </div>
              <p className="mt-4 text-sm text-foreground/80 italic leading-relaxed">"{e.quote}"</p>
            </div>
          ))}
        </div>
      </Section>

      {/* NETWORKER TESTIMONIALS */}
      <Section eyebrow="Témoignages" title={<>Nos <span className="text-gradient-gold">Networkers</span> témoignent</>}>
        <div className="grid lg:grid-cols-3 gap-6">
          {networkerTestimonials.map((t) => (
            <div key={t.name} className="relative p-7 rounded-xl bg-card hairline hover-lift">
              <div className="absolute top-5 right-5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-gradient-gold text-background font-semibold">{t.rank}</div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gold)]/30 to-[#1a1a1a] border-2 border-[var(--gold)]/40 grid place-items-center font-serif text-lg text-[var(--gold)]">
                {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="mt-4">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.location}</div>
              </div>
              <p className="mt-4 text-sm text-foreground/80 italic leading-relaxed">"{t.quote}"</p>
              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />)}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
