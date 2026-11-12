import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/networker")({
  head: () => ({
    meta: [
      { title: "Devenir partenaire — RMM" },
      {
        name: "description",
        content:
          "Comprendre l’approche RMM, la formation et le partenariat indépendant en toute transparence.",
      },
    ],
  }),
  component: JoinPage,
});
const steps = [
  [
    "01",
    "Faire connaissance",
    "Découvrir le collectif, les produits et poser vos questions en toute liberté.",
  ],
  [
    "02",
    "Comprendre l’activité",
    "Prendre connaissance des responsabilités, conditions et coûts applicables avant de décider.",
  ],
  [
    "03",
    "Apprendre et partager",
    "Développer ses compétences de communication et avancer avec une communauté.",
  ],
];
function JoinPage() {
  return (
    <>
      <section className="site-page-hero site-partner-hero">
        <div className="site-container site-partner-grid">
          <div>
            <p className="site-kicker">FAIRE PARTIE DU MOUVEMENT</p>
            <h1>
              Votre chemin.
              <br />
              <em>Notre collectif.</em>
            </h1>
            <p className="site-page-lead">
              Une aventure humaine autour de l’apprentissage, de la confiance et de l’envie
              d’avancer. Ensemble, à votre manière.
            </p>
            <a href="#parcours" className="site-button site-button-primary">
              Comprendre le parcours <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="site-partner-visual">
            <img src="/images/rmm-hero.jpg" alt="Des personnes échangent au sein d’un collectif" />
            <div className="site-partner-caption">
              LA FORCE DU COLLECTIF <span>↗</span>
            </div>
          </div>
        </div>
      </section>
      <section id="parcours" className="site-section">
        <div className="site-container">
          <div className="site-section-heading">
            <div>
              <p className="site-kicker">UNE DÉMARCHE, PAS À PAS</p>
              <h2>
                Un parcours qui
                <br />
                <em>vous ressemble.</em>
              </h2>
            </div>
            <p>
              Le partenariat est une activité indépendante. Prenez le temps de comprendre son
              fonctionnement avant tout engagement.
            </p>
          </div>
          <div className="site-journey-grid">
            {steps.map(([n, title, text]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="site-partner-principles site-section">
        <div className="site-container site-partner-principles-grid">
          <div>
            <p className="site-kicker">NOS ENGAGEMENTS</p>
            <h2>
              Construire avec
              <br />
              <em>responsabilité.</em>
            </h2>
            <p className="site-body">
              La confiance commence par des échanges honnêtes et des décisions prises en toute
              connaissance de cause.
            </p>
          </div>
          <div className="site-principle-list">
            {[
              "Une information claire sur le fonctionnement de l’activité",
              "Le respect du choix et de la confidentialité de chacun",
              "Des informations produits issues de documents approuvés",
              "Aucune promesse de revenu ou de résultat garanti",
            ].map((text) => (
              <div key={text}>
                <span>
                  <Check size={16} />
                </span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="contact" className="site-mini-cta">
        <div className="site-container">
          <div>
            <p className="site-kicker">PRENDRE LE TEMPS D’ÉCHANGER</p>
            <h2>
              Une question ?<br />
              <em>Parlons-en.</em>
            </h2>
            <p className="site-body">
              Le canal de contact officiel sera ajouté après validation par RMM. Aucun formulaire
              n’envoie de données pour le moment.
            </p>
          </div>
          <div className="site-contact-status">
            <MessageCircle size={22} />
            <span>
              Contact en cours
              <br />
              de configuration
            </span>
          </div>
        </div>
      </section>
      <div className="site-disclaimer site-container">
        Les conditions, frais éventuels et règles de rémunération doivent être présentés avant toute
        décision. Aucun revenu n’est garanti.
      </div>
      <div className="site-container site-bottom-link">
        <Link to="/boutique" className="site-text-link">
          Explorer notre univers <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
