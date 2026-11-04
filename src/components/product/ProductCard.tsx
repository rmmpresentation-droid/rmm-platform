import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Product } from "@/lib/data";
import { formatTND } from "@/lib/data";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/produit/$id"
      params={{ id: product.id }}
      className="group block rounded-lg overflow-hidden bg-card hairline hover-lift"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#101010] to-[#0a0a0a]">
        {product.bestSeller && (
          <span className="absolute top-3 left-3 z-10 text-[10px] tracking-[0.2em] uppercase px-2 py-1 rounded-full bg-gradient-gold text-background font-semibold">
            Best-Seller
          </span>
        )}
        <span className="absolute top-3 right-3 z-10 text-[10px] tracking-wider uppercase px-2 py-1 rounded-full glass text-foreground/80">
          {product.category}
        </span>
        {/* Stylised placeholder visual */}
        <div className="absolute inset-0 grid place-items-center transition-transform duration-700 group-hover:scale-110">
          <div className="relative">
            <div className="absolute -inset-10 rounded-full opacity-40 blur-3xl bg-[var(--gold)]/30" />
            <div className="relative w-40 h-52 rounded-lg border border-[var(--gold)]/20 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] shadow-2xl grid place-items-center">
              <div className="text-center px-2">
                <div className="text-[8px] tracking-[0.3em] text-[var(--gold)]/70 uppercase">SwisDerm</div>
                <div className="font-serif text-lg mt-2 leading-tight">{product.name}</div>
                <div className="mt-2 mx-auto h-px w-8 bg-[var(--gold)]/40" />
                <div className="text-[9px] mt-2 text-muted-foreground">{product.volume}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-serif text-lg leading-tight">{product.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.subtitle}</p>
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-3 w-3 ${i < Math.round(product.rating) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/30"}`} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({product.reviews})</span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-lg font-medium text-[var(--gold)]">{formatTND(product.price)}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{product.pp} PP</span>
        </div>
      </div>
    </Link>
  );
}
