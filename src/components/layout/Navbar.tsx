import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/boutique", label: "Boutique" },
  { to: "/networker", label: "Devenir Networker" },
  { to: "/demande-rendez-vous", label: "Demander un rendez-vous" },
  { to: "/dashboard", label: "Espace Membre" },
  { to: "/admin", label: "Admin" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center"><Logo /></Link>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm tracking-wide transition-colors ${active ? "text-[var(--gold)]" : "text-foreground/80 hover:text-[var(--gold)]"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:text-[var(--gold-light)]"><Link to="/dashboard">
            <User className="h-3.5 w-3.5 mr-1.5" /> Connexion</Link>
          </Button>
          <button onClick={() => setOpen((v) => !v)} className="lg:hidden p-2 text-foreground" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col px-6 py-4 gap-2">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-sm text-foreground/80 hover:text-[var(--gold)]">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
