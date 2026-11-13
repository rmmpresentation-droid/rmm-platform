import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { CatalogueProduct } from "@/lib/product-catalogue";

export function ProductCard({ product }: { product: CatalogueProduct }) {
  return (
    <Link
      to="/produit/$id"
      params={{ id: product.id }}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-[var(--gold)]/50"
    >
      <div className="relative grid aspect-[4/3] place-items-center bg-gradient-to-br from-[var(--gold)]/10 via-transparent to-[var(--gold)]/5 p-6">
        <span className="absolute left-4 top-4 text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          Référence RMM
        </span>
        <img
          src={`/products/${product.id}.jpg`}
          alt={`Visuel de ${product.name}, extrait de la brochure`}
          className="h-full max-h-64 w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <h3 className="font-serif text-lg">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Informations à valider</p>
        </div>
        <ArrowUpRight size={18} className="shrink-0 text-[var(--gold)]" aria-hidden="true" />
      </div>
    </Link>
  );
}
