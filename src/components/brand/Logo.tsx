export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="font-serif text-2xl tracking-tight leading-none">
        <span className="text-foreground">R</span>
        <span className="text-gradient-gold">M</span>
        <span className="text-foreground">M</span>
      </div>
      {!compact && (
        <span className="hidden sm:block text-[10px] tracking-[0.25em] uppercase text-muted-foreground border-l border-border pl-2">
          Raise Mindset<br />Master
        </span>
      )}
    </div>
  );
}
