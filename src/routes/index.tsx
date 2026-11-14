import { createFileRoute, Link } from "@tanstack/react-router";
import { products } from "@/data/products";
import { ArrowDown, ArrowUpRight } from "lucide-react";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RMM — Le soin comme un rituel" },
      {
        name: "description",
        content: "Découvrez les références SWISDERM et l’univers Rise Mindset Master.",
      },
      { property: "og:title", content: "RMM — Le soin comme un rituel" },
      {
        property: "og:description",
        content: "Découvrez les références SWISDERM et l’univers Rise Mindset Master.",
      },
    ],
  }),
  component: Home,
});
const universes = [
  { name: "Visage", sub: "L’art du soin", image: "/products/b-cream.jpg", filter: "visage" },
  {
    name: "Teint & protection",
    sub: "Les essentiels",
    image: "/products/sun-protector.jpg",
    filter: "teint",
  },
  { name: "Corps", sub: "Un moment pour soi", image: "/products/s-fem-serum.jpg", filter: "corps" },
  {
    name: "Bien-être intérieur",
    sub: "Au quotidien",
    image: "/products/s-factor.jpg",
    filter: "interieur",
  },
];
const steps = ["Mindset", "Apprentissage", "Action", "Croissance", "Leadership", "Succès"];
function Home() {
  const signature = products.find((p) => p.slug === "3s-capsule")!;
  return (
    <div className="maison">
      <section className="maison-hero maison-wrap">
        <div className="maison-hero-copy">
          <p className="maison-eyebrow">
            <span>01</span> — RISE MINDSET MASTER
          </p>
          <h1>
            L’élégance <em>suisse</em>,
            <br />
            vécue au quotidien.
          </h1>
          <p className="maison-hero-intro">
            Des soins, des rituels et une communauté pour prendre le temps de vous retrouver.
            Découvrez l’univers SWISDERM à votre rythme.
          </p>
          <div className="maison-actions">
            <a className="maison-btn" href="/produits">
              Découvrir la collection <ArrowUpRight size={16} />
            </a>
            <a className="maison-text-link" href="#opportunite">
              Notre communauté <span>↗</span>
            </a>
          </div>
          <div className="maison-hero-bottom">
            <span>UNE AUTRE IDÉE DU QUOTIDIEN</span>
            <a href="#manifeste" aria-label="Découvrir la suite">
              <ArrowDown size={18} strokeWidth={1} />
            </a>
          </div>
        </div>
        <div className="maison-hero-art">
          <div className="maison-arch">
            <img src="/editorial/3s.webp" alt="Boîte de 3S Capsule SWISDERM" fetchPriority="high" />
          </div>
          <span className="maison-vertical">SOIN & BIEN-ÊTRE — COLLECTION SWISDERM</span>
          <div className="maison-art-label">
            <span>LA SÉLECTION</span>
            <strong>3S Capsule</strong>
            <a href="/produits/3s-capsule">Découvrir ↗</a>
          </div>
        </div>
      </section>
      <section id="manifeste" className="maison-manifest maison-wrap">
        <p className="maison-eyebrow">02 — NOTRE REGARD</p>
        <h2>
          Le bien-être n’est pas un luxe.
          <br />
          <em>C’est un rituel.</em>
        </h2>
        <p>
          Un geste choisi. Une pause dans la journée.
          <br />
          Une attention que l’on s’accorde, simplement.
        </p>
        <span className="maison-rule" />
      </section>
      <section className="maison-wrap maison-section">
        <div className="maison-section-head">
          <div>
            <p className="maison-eyebrow">03 — LA COLLECTION</p>
            <h2>
              À chacun
              <br />
              <em>son essentiel.</em>
            </h2>
          </div>
          <p>
            Explorez les références issues des documents de la marque. Caractéristiques et
            disponibilités restent à confirmer.
          </p>
        </div>
        <div className="maison-bento">
          {universes.map((u, i) => (
            <a
              className={`maison-universe u-${i}`}
              href={`/produits?univers=${u.filter}`}
              key={u.name}
            >
              <div className="maison-universe-img">
                <img src={u.image} alt="" loading="lazy" />
              </div>
              <div className="maison-universe-title">
                <div>
                  <small>
                    0{i + 1} — {u.sub}
                  </small>
                  <h3>{u.name}</h3>
                </div>
                <ArrowUpRight strokeWidth={1} size={26} />
              </div>
            </a>
          ))}
        </div>
        <a className="maison-text-link maison-all" href="/produits">
          Voir toute la collection <span>↗</span>
        </a>
      </section>
      <section className="maison-signature">
        <div className="maison-wrap maison-signature-grid">
          <div className="maison-signature-img">
            <img src="/products/3s-capsule.png" alt="SWISDERM 3S Capsule" loading="lazy" />
          </div>
          <div>
            <p className="maison-eyebrow">04 — LE SOIN SIGNATURE</p>
            <h2>
              Un geste.
              <br />
              <em>Un moment à soi.</em>
            </h2>
            <p>{signature.description.fr}</p>
            <div className="maison-ingredients">
              <div>
                <small>01</small>
                <span>Pomme</span>
              </div>
              <div>
                <small>02</small>
                <span>Rose & orange</span>
              </div>
              <div>
                <small>03</small>
                <span>Huile de jojoba</span>
              </div>
            </div>
            <a className="maison-btn maison-btn-light" href="/produits/3s-capsule">
              Découvrir 3S Capsule <ArrowUpRight size={16} />
            </a>
            <p className="maison-small">
              Ingrédients cités par la brochure. Composition et caractéristiques à confirmer.
            </p>
          </div>
        </div>
      </section>
      <section id="rituel" className="maison-wrap maison-ritual maison-section">
        <div>
          <p className="maison-eyebrow">05 — LE RITUEL</p>
          <h2>
            Du temps
            <br />
            <em>pour vous.</em>
          </h2>
          <p>
            Chaque routine se construit selon vos besoins. Les conseils d’utilisation officiels sont
            à confirmer.
          </p>
          <a href="/produits" className="maison-text-link">
            Explorer la collection ↗
          </a>
        </div>
        <div className="maison-ritual-photo">
          <img
            src="/editorial/rituel.webp"
            alt="Composition décorative de linge et pierre claire"
            loading="lazy"
          />
        </div>
        <div className="maison-ritual-list">
          {["Nettoyer", "Traiter", "Protéger"].map((x, i) => (
            <div key={x}>
              <span>0{i + 1}</span>
              <h3>{x}</h3>
              <ArrowUpRight size={20} strokeWidth={1} />
            </div>
          ))}
          <p>
            Le bon geste se choisit avec les informations et précautions officielles de chaque
            produit.
          </p>
        </div>
      </section>
      <div className="maison-marquee" aria-label="Ingrédients cités dans les brochures">
        <div>
          <span>
            Pomme · Rose des Alpes · Orange · Jojoba · Tournesol · Lierre · Guarana · Myrtille ·
            Aloès · Camomille · Thé vert · Papaye · Cassis ·{" "}
          </span>
          <span aria-hidden="true">
            Pomme · Rose des Alpes · Orange · Jojoba · Tournesol · Lierre · Guarana · Myrtille ·
            Aloès · Camomille · Thé vert · Papaye · Cassis ·{" "}
          </span>
        </div>
      </div>
      <section id="methode" className="maison-wrap maison-method maison-section">
        <div>
          <p className="maison-eyebrow">06 — L’ACCOMPAGNEMENT</p>
          <h2>
            Avancer,
            <br />
            <em>à votre rythme.</em>
          </h2>
          <p>
            Un cheminement autour de l’apprentissage, du partage et de la confiance. Pour découvrir,
            poser vos questions et construire votre propre expérience.
          </p>
        </div>
        <div className="maison-method-list">
          {steps.map((x, i) => (
            <div key={x}>
              <small>0{i + 1}</small>
              <span>{x}</span>
              <span>↗</span>
            </div>
          ))}
        </div>
      </section>
      <section id="opportunite" className="maison-opportunity">
        <div className="maison-wrap maison-op-grid">
          <div>
            <p className="maison-eyebrow">07 — ENSEMBLE</p>
            <h2>
              Partager ce que
              <br />
              <em>vous aimez.</em>
            </h2>
            <p>
              Découvrir une marque, se former, puis partager à son rythme. Une activité indépendante
              dont les conditions restent à valider.
            </p>
            <p className="maison-small">
              Les résultats dépendent de l’effort et de la situation de chacun. Aucun revenu n’est
              garanti.
            </p>
            <Link to="/demande-rendez-vous" className="maison-btn maison-btn-light">
              Échanger avec nous <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="maison-op-stages">
            {["Découvrir", "Se former", "Partager"].map((x, i) => (
              <div key={x}>
                <small>0{i + 1}</small>
                <span>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="maison-wrap maison-stories maison-section">
        <p className="maison-eyebrow">08 — LA COMMUNAUTÉ</p>
        <h2>
          Bientôt, les histoires
          <br />
          <em>de notre communauté.</em>
        </h2>
        <p>Les témoignages authentiques et autorisés trouveront leur place ici.</p>
      </section>
      <section className="maison-wrap maison-faq maison-section">
        <div>
          <p className="maison-eyebrow">09 — EN TOUTE SIMPLICITÉ</p>
          <h2>
            Vos questions,
            <br />
            <em>nos réponses.</em>
          </h2>
        </div>
        <div>
          {[
            [
              "À qui s’adressent les produits ?",
              "Les informations officielles sur les types de peau et les précautions sont à confirmer.",
            ],
            [
              "Comment obtenir des informations sur une référence ?",
              "Consultez la fiche du produit. Les coordonnées de contact seront ajoutées après validation.",
            ],
            [
              "Comment fonctionne l’activité indépendante ?",
              "Les conditions et le plan officiel sont en cours de validation. Aucun revenu n’est garanti.",
            ],
            [
              "Comment passer commande ?",
              "Les conditions de commande et de livraison seront communiquées après validation.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="maison-final">
        <div className="maison-wrap">
          <p className="maison-eyebrow">UNE RENCONTRE, UN PREMIER PAS</p>
          <h2>
            Votre prochain rituel
            <br />
            <em>commence ici.</em>
          </h2>
          <p>La beauté des petits gestes, le plaisir de partager.</p>
          <a href="/produits" className="maison-btn maison-btn-light">
            Découvrir la collection <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
