import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer-main">
          <div>
            <Link to="/" className="site-footer-logo">
              RMM<span>.</span>
            </Link>
            <p className="site-footer-tagline">
              Rise in Mindset.
              <br />
              Master Your Future.
            </p>
            <p className="site-footer-copy">
              Un collectif tourné vers l’apprentissage, la transmission et les relations humaines.
            </p>
          </div>
          <div>
            <p className="site-footer-label">EXPLORER</p>
            <div className="site-footer-links">
              <Link to="/">Accueil</Link>
              <Link to="/boutique">Notre univers</Link>
              <Link to="/networker">Devenir partenaire</Link>
              <a href="/#approche">Notre approche</a>
            </div>
          </div>
          <div>
            <p className="site-footer-label">NOUS REJOINDRE</p>
            <div className="site-footer-links">
              <Link to="/networker">
                Découvrir le partenariat <ArrowUpRight size={14} />
              </Link>
              <Link to="/dashboard">
                Accéder à mon espace <ArrowUpRight size={14} />
              </Link>
              <span>Tunisie</span>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} Raise Mindset Master</span>
          <span>Une autre façon d’avancer, ensemble.</span>
          <span>Présentation locale · contenus à valider</span>
        </div>
      </div>
    </footer>
  );
}
