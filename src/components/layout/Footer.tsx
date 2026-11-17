import { useLanguage } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Instagram, Facebook, Mail, MapPin } from "lucide-react";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-[#080808]">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            L'excellence suisse au service de votre bien-être. Franchise officielle SwisDerm en
            Tunisie.
          </p>
          <div className="mt-5 flex gap-3">
            <a
              href="#"
              className="p-2 rounded-full hairline hover:border-[var(--gold)]/40 hover:text-[var(--gold)] transition"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-full hairline hover:border-[var(--gold)]/40 hover:text-[var(--gold)] transition"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-4">
            {t("Navigation")}
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="text-foreground/70 hover:text-[var(--gold)]">
                {t("Accueil")}
              </Link>
            </li>
            <li>
              <Link to="/boutique" className="text-foreground/70 hover:text-[var(--gold)]">
                {t("Boutique")}
              </Link>
            </li>
            <li>
              <Link to="/networker" className="text-foreground/70 hover:text-[var(--gold)]">
                {t("Devenir Networker")}
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="text-foreground/70 hover:text-[var(--gold)]">
                {t("Espace Membre")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-4">
            {t("Catégories")}
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="text-foreground/70">{t("Soin Visage")}</li>
            <li className="text-foreground/70">{t("Soin Corps")}</li>
            <li className="text-foreground/70">{t("Compléments")}</li>
            <li className="text-foreground/70">{t("Bien-être")}</li>
            <li className="text-foreground/70">{t("Maquillage")}</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-4">
            {t("Contact")}
          </h4>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-[var(--gold)]" />
              {t("Tunis, Tunisie")}
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-[var(--gold)]" />
              contact@rmm-tunisia.com
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2024 Raise Mindset Master. Franchise officielle SwisDerm Switzerland.
      </div>
    </footer>
  );
}
