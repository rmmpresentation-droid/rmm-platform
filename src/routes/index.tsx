import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Compass,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RMM — Grandir ensemble, construire autrement" },
      {
        name: "description",
        content:
          "Découvrez Raise Mindset Master, une communauté en Tunisie qui place l’humain, la formation et le partage au cœur du marketing de réseau.",
      },
    ],
  }),
  component: Home,
});
const values = [
  {
    number: "01",
    icon: Compass,
    title: "Une vision claire",
    text: "Avancer avec intention, comprendre le modèle et construire son parcours à son rythme.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Apprendre en continu",
    text: "Développer ses compétences, partager ses connaissances et progresser à chaque étape.",
  },
  {
    number: "03",
    icon: HeartHandshake,
    title: "L’humain d’abord",
    text: "Créer des liens de confiance et faire grandir une communauté fondée sur le respect.",
  },
];
function Home() {
  return (
    <>
      <section className="site-hero">
        <div className="site-container site-hero-grid">
          <div className="site-hero-copy">
            <div className="site-eyebrow">
              <span className="site-eyebrow-dot" /> RAISE MINDSET MASTER{" "}
              <span className="site-eyebrow-line" /> TUNISIE
            </div>
            <h1>
              Tout commence
              <br />
              par une <em>rencontre.</em>
            </h1>
            <p className="site-hero-lead">
              Une idée, une conversation, une communauté. Chez RMM, nous croyons que l’on va plus
              loin quand on avance ensemble.
            </p>
            <div className="site-hero-actions">
              <Link to="/networker" className="site-button site-button-primary">
                Découvrir RMM <ArrowUpRight size={18} />
              </Link>
              <a href="#approche" className="site-text-link">
                Notre philosophie <ArrowDown size={16} />
              </a>
            </div>
            <div className="site-hero-note">
              <span className="site-avatar-stack" aria-hidden="true">
                <i>R</i>
                <i>M</i>
                <i>M</i>
              </span>
              <span>
                Une communauté.
                <br />
                <strong>Des possibilités à construire.</strong>
              </span>
            </div>
          </div>
          <div className="site-hero-visual">
            <img
              src="/images/rmm-hero.jpg"
              alt="Des personnes échangent dans un espace de travail lumineux"
              fetchPriority="high"
            />
            <div className="site-hero-image-label">
              <span>LE COLLECTIF RMM</span>
              <span>↗</span>
            </div>
            <div className="site-image-caption">
              <span>01 / 03</span>
              <span>ENSEMBLE, PLUS LOIN</span>
            </div>
          </div>
        </div>
        <div className="site-hero-bottom site-container">
          <span>LE MOUVEMENT RMM</span>
          <span>RISE IN MINDSET. MASTER YOUR FUTURE.</span>
          <a href="#approche">
            DÉFILER <ArrowDown size={13} />
          </a>
        </div>
      </section>
      <section id="approche" className="site-intro site-section">
        <div className="site-container">
          <div className="site-section-heading">
            <div>
              <p className="site-kicker">01 / NOTRE PHILOSOPHIE</p>
              <h2>
                Plus qu’un réseau.
                <br />
                <em>Un état d’esprit.</em>
              </h2>
            </div>
            <p>
              Nous réunissons des personnes qui partagent une même envie : apprendre, créer des
              liens et construire une activité avec sens et transparence.
            </p>
          </div>
          <div className="site-values">
            {values.map((v) => (
              <article className="site-value" key={v.number}>
                <div className="site-value-top">
                  <span>{v.number} /</span>
                  <v.icon size={21} strokeWidth={1.4} />
                </div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="site-story site-section">
        <div className="site-container site-story-grid">
          <div className="site-story-photo">
            <img
              src="/images/rmm-vision.jpg"
              alt="Composition illustrative autour du soin et du bien-être"
              loading="lazy"
            />
            <div className="site-photo-note">
              UNE VISION
              <br />
              <strong>à partager.</strong>
            </div>
          </div>
          <div className="site-story-copy">
            <p className="site-kicker">02 / NOTRE UNIVERS</p>
            <h2>
              L’attention
              <br />
              aux <em>détails.</em>
              <br />
              Le goût du <em>lien.</em>
            </h2>
            <p>
              Notre approche commence par l’écoute et une information claire, pour laisser à chacun
              le temps de découvrir notre univers et de choisir.
            </p>
            <p>
              Notre rôle : présenter les produits et l’activité avec responsabilité, à partir des
              informations officielles disponibles.
            </p>
            <Link to="/boutique" className="site-button site-button-outline">
              Explorer notre univers <ArrowUpRight size={18} />
            </Link>
            <div className="site-story-signature">
              <span>
                RMM <i>×</i> PARTAGE
              </span>
              <span>UNE HISTOIRE DE PARTAGE</span>
            </div>
          </div>
        </div>
      </section>
      <section className="site-journey site-section">
        <div className="site-container">
          <div className="site-section-heading">
            <div>
              <p className="site-kicker">03 / LE CHEMIN ENSEMBLE</p>
              <h2>
                À votre rythme.
                <br />
                <em>Avec les bonnes clés.</em>
              </h2>
            </div>
            <p>
              Découvrir, apprendre, partager : un chemin simple pour comprendre notre démarche et
              imaginer la suite.
            </p>
          </div>
          <div className="site-journey-grid">
            <div>
              <span>01</span>
              <h3>Découvrir</h3>
              <p>Rencontrez notre univers et posez toutes vos questions, librement.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Apprendre</h3>
              <p>Explorez les produits, l’activité et les principes d’un partage responsable.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Avancer</h3>
              <p>Construisez votre parcours avec la communauté, selon vos objectifs.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="site-cta-wrap">
        <div className="site-container">
          <div className="site-cta">
            <div>
              <p className="site-kicker">L’AVENTURE COMMENCE ICI</p>
              <h2>
                Et si on avançait
                <br />
                <em>ensemble ?</em>
              </h2>
              <p>Découvrez ce qui nous anime et ce que signifie rejoindre la communauté RMM.</p>
              <Link to="/networker" className="site-button site-button-inverse">
                Découvrir le partenariat <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="site-cta-mark" aria-hidden="true">
              R<span>.</span>
            </div>
          </div>
        </div>
      </section>
      <div className="site-disclaimer site-container">
        Le partenariat est une activité indépendante. Les résultats ne sont pas garantis. Les
        conditions applicables doivent être communiquées avant tout engagement.{" "}
        <ArrowRight size={14} />
      </div>
    </>
  );
}
