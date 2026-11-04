import { Check, Sparkles } from "lucide-react";
import type { Pack } from "@/lib/data";
import { formatTND } from "@/lib/data";
import { Button } from "@/components/ui/button";

export function PackCard({ pack, large = false }: { pack: Pack; large?: boolean }) {
  return (
    <div
      className={`relative rounded-xl p-6 bg-card border transition-all duration-500 hover-lift overflow-hidden
        ${pack.popular ? "border-[var(--gold)]/40 shadow-[0_0_40px_-10px_var(--gold)]" : "border-border"}
        ${pack.premium ? "border-[var(--gold)]/30" : ""}
        ${large ? "p-8" : ""}`}
    >
      {pack.premium && (
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[var(--gold)]/20 blur-3xl animate-glow-pulse" />
        </div>
      )}
      {pack.popular && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-md bg-gradient-gold text-background text-[10px] font-semibold tracking-[0.2em] uppercase">
          {pack.highlight}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2">
          {pack.premium && <Sparkles className="h-4 w-4 text-[var(--gold)]" />}
          <h3 className="font-serif text-3xl">{pack.name}</h3>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-serif text-4xl text-gradient-gold">{formatTND(pack.price)}</span>
        </div>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{pack.pp} Points Produit</p>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />

        <ul className="space-y-3">
          {pack.benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-foreground/90">
              <Check className="h-4 w-4 text-[var(--gold)] mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Button className="mt-6 w-full bg-gradient-gold text-background hover:opacity-90 font-medium">
          Choisir ce pack
        </Button>
      </div>
    </div>
  );
}
