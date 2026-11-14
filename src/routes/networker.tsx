import { createFileRoute, redirect } from "@tanstack/react-router";
import { Crown, TrendingUp, Users, GraduationCap, Sparkles, PackageCheck } from "lucide-react";
import { PackCard } from "@/components/product/PackCard";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { packs, networkerTestimonials } from "@/lib/data";

export const Route = createFileRoute("/networker")({
  beforeLoad: () => { throw redirect({ to: "/", hash: "opportunite" }); },
  head: () => ({
    meta: [
      { title: "Devenir Networker RMM — Transformez votre passion en revenus" },
      { name: "description", content: "Rejoignez le réseau RMM. Packs de démarrage, formation, accompagnement, commissions premium." },
    ],
  }),
  component: JoinPage,
});

const reasons = [
  { icon: Sparkles, title: "Produits premium suisses", desc: "Distribuez la gamme SwisDerm, formulée en Suisse, certifiée Bio." },
  { icon: TrendingUp, title: "Prix préférentiels −30 %", desc: "Bénéficiez de tarifs avantageux dès le premier achat." },
  { icon: GraduationCap, title: "Formation gratuite continue", desc: "Masterclass mensuelles, scripts, accompagnement personnalisé." },
  { icon: Users, title: "Communauté soudée", desc: "Événements VIP, voyages incentive, soirées exclusives." },
  { icon: Crown, title: "Revenus évolutifs", desc: "Du complément au revenu principal. Vous fixez vos objectifs." },
  { icon: PackageCheck, title: "Zéro stock obligatoire", desc: "Dropshipping disponible. Lancez-vous sans investir en logistique." },
];

const ranks = ["Bronze", "Business", "Silver", "Gold", "Platinum"];
const currentRankIdx = 2;

function JoinPage() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--gold)]/15 blur-[120px] animate-glow-pulse" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-6">
              <Crown className="h-3 w-3 text-[var(--gold)]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/80">Opportunité Premium</span>
            </div>
            <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05]">
              Transformez votre <span className="text-gradient-gold">passion</span> en <span className="text-gradient-gold">revenus.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Rejoignez RMM et bâtissez une activité indépendante en distribuant les soins SwisDerm Switzerland en Tunisie.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-gold text-background hover:opacity-90 font-medium">
                Voir les packs
              </Button>
              <Button size="lg" variant="outline" className="border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:text-[var(--gold-light)]">
                Réserver un appel
              </Button>
            </div>
          </div>
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden hairline bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] grid place-items-center">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-2/3 h-2/3 rounded-full bg-[var(--gold)]/20 blur-3xl" />
            </div>
            <div className="relative text-center px-8">
              <Crown className="h-20 w-20 mx-auto text-[var(--gold)]" />
              <div className="font-serif text-3xl mt-6">Votre futur commence ici</div>
              <div className="text-sm text-muted-foreground mt-3">Diamond Rank · Tunis</div>
            </div>
          </div>
        </div>
      </section>

      {/* REASONS */}
      <Section eyebrow="6 raisons" title={<>Pourquoi rejoindre <span className="text-gradient-gold">RMM</span> ?</>} className="bg-[#0F0F0F]">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reasons.map((r) => (
            <div key={r.title} className="p-7 rounded-xl bg-card hairline hover-lift">
              <div className="w-12 h-12 rounded-full grid place-items-center bg-[var(--gold)]/10 border border-[var(--gold)]/30">
                <r.icon className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <h3 className="font-serif text-xl mt-5">{r.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* PACKS */}
      <Section eyebrow="5 niveaux" title={<>Nos Packs de <span className="text-gradient-gold">Démarrage</span></>} subtitle="Choisissez le pack qui correspond à votre ambition. Chaque pack est un tremplin vers le rang supérieur.">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {packs.map((p) => <PackCard key={p.id} pack={p} large />)}
        </div>
      </Section>

      {/* RANK PROGRESSION */}
      <Section eyebrow="Système de récompenses" title={<>Progression de <span className="text-gradient-gold">Rang</span></>} subtitle="Chaque produit vendu = des PP. Plus vous accumulez, plus vous montez en rang et débloquez de nouvelles commissions." className="bg-[#0F0F0F]">
        <div className="relative p-8 rounded-xl bg-card hairline">
          <div className="relative h-2 bg-secondary rounded-full">
            <div className="absolute inset-y-0 left-0 bg-gradient-gold rounded-full" style={{ width: `${(currentRankIdx / (ranks.length - 1)) * 100}%` }} />
            {ranks.map((r, i) => (
              <div key={r} className="absolute -top-1.5" style={{ left: `${(i / (ranks.length - 1)) * 100}%` }}>
                <div className={`w-5 h-5 rounded-full border-2 -translate-x-1/2 ${i <= currentRankIdx ? "bg-[var(--gold)] border-[var(--gold)]" : "bg-background border-border"}`} />
                <div className="absolute top-7 -translate-x-1/2 text-center w-20">
                  <div className={`text-xs ${i === currentRankIdx ? "text-[var(--gold)] font-semibold" : "text-muted-foreground"}`}>{r}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-20 grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">Commission</div>
              <div className="font-serif text-3xl mt-2">de 15 % à 35 %</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">Bonus de rang</div>
              <div className="font-serif text-3xl mt-2">jusqu'à 5 000 TND</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">Voyages incentive</div>
              <div className="font-serif text-3xl mt-2">dès le rang Gold</div>
            </div>
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section eyebrow="Transformations réelles" title="Avant / Après leur vie professionnelle">
        <div className="grid md:grid-cols-3 gap-6">
          {networkerTestimonials.map((t) => (
            <div key={t.name} className="p-7 rounded-xl bg-card hairline hover-lift">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">{t.rank} · {t.location}</div>
              <div className="font-serif text-2xl mt-2">{t.name}</div>
              <div className="mt-3 text-3xl text-gradient-gold font-serif">{t.income}</div>
              <p className="mt-5 text-sm italic text-foreground/80">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="Questions fréquentes" title={<>FAQ <span className="text-gradient-gold">Rejoindre RMM</span></>} className="bg-[#0F0F0F]">
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="space-y-3">
            {[
              ["Faut-il un capital de départ ?", "Non, vous choisissez librement votre pack selon votre budget. Le pack Bronze à 750 TND suffit pour démarrer."],
              ["Faut-il stocker des produits ?", "Non, nous gérons toute la logistique. Le dropshipping est disponible pour vos commandes clients."],
              ["Combien de temps avant le premier revenu ?", "Dès votre première vente. Certains networkers atteignent leur premier 1 000 TND en moins de 30 jours."],
              ["Y a-t-il des frais cachés ?", "Aucun. Tout est transparent : prix du pack + prix d'achat préférentiel. Pas d'abonnement caché."],
              ["Puis-je cumuler avec mon emploi ?", "Oui, 100 % flexible. La majorité de nos networkers démarrent en parallèle de leur activité."],
            ].map(([q, a]) => (
              <AccordionItem key={q} value={q} className="bg-card hairline rounded-xl px-6 border">
                <AccordionTrigger className="hover:no-underline hover:text-[var(--gold)] py-5">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section>
        <div className="relative rounded-2xl overflow-hidden p-10 lg:p-16 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] hairline">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[var(--gold)]/20 blur-3xl animate-glow-pulse" />
          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-4xl lg:text-5xl">Prêt à <span className="text-gradient-gold">changer de vie</span> ?</h2>
            <p className="mt-4 text-muted-foreground">Recevez une présentation personnalisée de l'opportunité RMM. Notre équipe vous recontacte sous 24h.</p>
            <form className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
              <Input placeholder="Nom complet" className="bg-card border-border h-12" />
              <Input placeholder="Email" type="email" className="bg-card border-border h-12" />
              <Input placeholder="Téléphone" className="bg-card border-border h-12" />
              <select className="h-12 rounded-md bg-card border border-border px-3 text-sm text-foreground/80">
                <option>Pack souhaité (optionnel)</option>
                {packs.map((p) => <option key={p.id}>{p.name} — {p.price} TND</option>)}
              </select>
              <Button size="lg" type="submit" className="sm:col-span-2 bg-gradient-gold text-background hover:opacity-90 font-medium h-12">
                Recevoir ma présentation personnalisée
              </Button>
            </form>
          </div>
        </div>
      </Section>
    </div>
  );
}
