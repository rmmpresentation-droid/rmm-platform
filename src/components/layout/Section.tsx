import type { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`py-20 lg:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-6">
        {(eyebrow || title || subtitle) && (
          <div className="max-w-2xl mb-12 animate-fade-up">
            {eyebrow && (
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mb-3">{eyebrow}</div>
            )}
            {title && <h2 className="font-serif text-4xl lg:text-5xl leading-[1.05]">{title}</h2>}
            {subtitle && <p className="mt-4 text-muted-foreground leading-relaxed">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
