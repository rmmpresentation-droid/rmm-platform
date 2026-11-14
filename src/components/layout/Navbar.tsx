import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/data/products";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/produits", label: "Collection" },
  { href: "/#rituel", label: "Le rituel" },
  { href: "/#methode", label: "Accompagnement" },
  { href: "/#opportunite", label: "Notre communauté" },
];
export function Navbar() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="maison-nav">
      <div className="maison-nav-inner">
        <Link to="/" className="maison-logo" aria-label={`${BRAND} — Accueil`}>
          <span>RMM</span>
          <small>
            RISE MINDSET
            <br />
            MASTER
          </small>
        </Link>
        <nav className="maison-desktop" aria-label="Navigation principale">
          {links.map((x) => (
            <a href={x.href} key={x.href}>
              {x.label}
            </a>
          ))}
        </nav>
        <div className="maison-nav-actions">
          <Link to="/dashboard" className="maison-login">
            Espace membre <span>↗</span>
          </Link>
          <button
            className="maison-menu-button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="maison-mobile-nav"
          >
            {open ? <X size={23} strokeWidth={1} /> : <Menu size={23} strokeWidth={1} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="maison-mobile-nav" className="maison-mobile" aria-label="Navigation mobile">
          {links.map((x, i) => (
            <a key={x.href} href={x.href} onClick={() => setOpen(false)}>
              <small>0{i + 1}</small>
              {x.label}
              <span>↗</span>
            </a>
          ))}
          <Link to="/dashboard" onClick={() => setOpen(false)}>
            Espace membre <span>↗</span>
          </Link>
        </nav>
      )}
    </header>
  );
}
