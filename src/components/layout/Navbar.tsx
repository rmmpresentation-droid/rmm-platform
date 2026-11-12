import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/boutique", label: "Notre univers" },
  { to: "/networker", label: "Devenir partenaire" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="site-header">
      <div className="site-nav site-container">
        <Link to="/" className="site-logo" aria-label="RMM, accueil">
          <span>
            RMM<span className="site-logo-dot">.</span>
          </span>
          <small>
            RISE MINDSET
            <br />
            MASTER
          </small>
        </Link>
        <nav className="site-desktop-nav" aria-label="Navigation principale">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={pathname === link.to ? "site-nav-link active" : "site-nav-link"}
              activeProps={{ "aria-current": "page" }}
            >
              {link.label}
            </Link>
          ))}
          <a className="site-nav-link" href="/#approche">
            Notre approche
          </a>
        </nav>
        <div className="site-nav-actions">
          <ThemeToggle />
          <Link to="/dashboard" className="site-nav-cta">
            Espace membre <ArrowUpRight size={15} />
          </Link>
          <button
            type="button"
            className="site-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="site-mobile-nav" aria-label="Navigation mobile">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a href="/#approche" onClick={() => setOpen(false)}>
            Notre approche
          </a>
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            Espace membre ↗
          </Link>
        </nav>
      )}
    </header>
  );
}
