import { Link } from "@tanstack/react-router";
import { BRAND } from "@/data/products";
export function Footer() {
  return (
    <footer className="maison-footer">
      <div className="maison-wrap maison-footer-grid">
        <div>
          <div className="maison-footer-logo">
            RMM<span>.</span>
          </div>
          <p>
            Le soin, comme un rendez-vous
            <br />
            avec soi-même.
          </p>
          <small>{BRAND}</small>
        </div>
        <div>
          <h3>Collection</h3>
          <a href="/produits">Tous les produits</a>
          <a href="/produits?univers=visage">Visage</a>
          <a href="/produits?univers=corps">Corps</a>
          <a href="/produits?univers=interieur">Bien-être intérieur</a>
        </div>
        <div>
          <h3>La maison</h3>
          <a href="/#rituel">Nos rituels</a>
          <a href="/#methode">Accompagnement</a>
          <a href="/#opportunite">La communauté</a>
          <Link to="/dashboard">Espace membre</Link>
        </div>
        <div>
          <h3>Nous contacter</h3>
          <p>
            Coordonnées à confirmer.
            <br />
            Nous préparons un espace pour vous répondre.
          </p>
          <Link to="/demande-rendez-vous">Demander un rendez-vous ↗</Link>
        </div>
      </div>
      <div className="maison-wrap maison-footer-bottom">
        <span>
          © {new Date().getFullYear()} {BRAND}
        </span>
        <span>Les produits cosmétiques et compléments ne remplacent pas un avis médical.</span>
        <span>Vitrine de démonstration · Non destinée à la production</span>
      </div>
    </footer>
  );
}
