import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Image as ImageIcon,
  Lightbulb,
  MessageSquareQuote,
  Play,
  Upload,
  X,
} from "lucide-react";
import { catalogue, catalogueImage } from "@/lib/product-catalogue";

const chapters = [
  {
    eyebrow: "01 / Le contexte",
    name: "L’investissement",
    kicker: "Commençons par une question",
    title: "Et si préparer demain commençait aujourd’hui ?",
    text: "Un temps d’échange pour parler d’objectifs personnels, de choix et de leur horizon. Aucun rendement ni résultat financier n’est promis.",
    prompt: "Qu’aimeriez-vous rendre possible dans les prochaines années ?",
    note: "Invitez la personne à exprimer ses objectifs. Présentez les risques et les conditions réelles avant toute décision ; ne promettez aucun revenu.",
    accent: "Votre futur, vos choix",
    tag: "OUVERTURE",
  },
  {
    eyebrow: "02 / Notre quotidien",
    name: "Santé & bien-être",
    kicker: "Prendre du recul",
    title: "Le bien-être mérite toute notre attention.",
    text: "Parlons des préoccupations de santé et des habitudes quotidiennes, sans généralisation ni diagnostic. Les produits cosmétiques ne remplacent pas un avis médical.",
    prompt: "Quelles habitudes de bien-être comptent le plus pour vous ?",
    note: "Ne présentez aucun produit comme un traitement ou une prévention. Les chiffres de santé devront provenir de sources fiables et datées.",
    accent: "Écouter avant de présenter",
    tag: "CONVERSATION",
  },
  {
    eyebrow: "03 / La marque",
    name: "Swisderm",
    kicker: "Découvrir la marque",
    title: "Une histoire à raconter. Ensemble.",
    text: "Cet espace accueillera l’histoire officielle de Swisderm, ses engagements et les informations vérifiées fournies par l’entreprise.",
    prompt: "Qu’attendez-vous d’une marque que vous choisissez de découvrir ?",
    note: "Remplacez ce texte de démonstration par les documents officiels validés. Aucun pays de fabrication ni certification n’est supposé ici.",
    accent: "La marque en quelques mots",
    tag: "DÉCOUVERTE",
  },
  {
    eyebrow: "04 / La sélection",
    name: "Les produits",
    kicker: "Explorer la collection",
    title: "Des produits à découvrir, pas des promesses à inventer.",
    text: "Une sélection visuelle issue du catalogue provisoire. Les caractéristiques, conseils et éventuelles allégations restent à valider.",
    prompt: "Quel type de produit aimeriez-vous découvrir en premier ?",
    note: "Montrez les fiches officielles. Une démonstration ne prouve pas une efficacité ni un effet sur la santé.",
    accent: "Le détail fait la différence",
    tag: "COLLECTION",
  },
  {
    eyebrow: "05 / La suite",
    name: "Plan marketing",
    kicker: "Construire la suite",
    title: "Une opportunité à comprendre en toute transparence.",
    text: "Un espace réservé à la présentation du plan officiel, des conditions, des coûts et des risques après validation par l’entreprise.",
    prompt: "Quelles informations vous aideraient à prendre une décision éclairée ?",
    note: "Ne montrez pas de commissions, de rangs, de projections ou de revenus non validés. Le plan de compensation doit être approuvé et vérifié juridiquement.",
    accent: "Clarté avant engagement",
    tag: "PERSPECTIVES",
  },
] as const;
type Medium = { url: string; type: "image" | "video"; name: string };

export function PresentationStudio() {
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState(false);
  const [media, setMedia] = useState<Partial<Record<number, Medium>>>({});
  const stageRef = useRef<HTMLElement>(null);
  const mediaRef = useRef(media);
  mediaRef.current = media;
  useEffect(
    () => () =>
      Object.values(mediaRef.current).forEach((m) => {
        if (m) URL.revokeObjectURL(m.url);
      }),
    [],
  );
  const step = (delta: number) =>
    setIndex((i) => Math.min(chapters.length - 1, Math.max(0, i + delta)));
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes((event.target as HTMLElement)?.tagName) ||
        (event.target as HTMLElement)?.isContentEditable
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function chooseMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      event.target.value = "";
      return;
    }
    const item: Medium = {
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
      name: file.name,
    };
    setMedia((current) => {
      if (current[index]) URL.revokeObjectURL(current[index]!.url);
      return { ...current, [index]: item };
    });
    event.target.value = "";
  }
  function clearMedia() {
    setMedia((current) => {
      if (current[index]) URL.revokeObjectURL(current[index]!.url);
      const next = { ...current };
      delete next[index];
      return next;
    });
  }
  const chapter = chapters[index];
  const activeMedia = media[index];
  async function fullscreen() {
    try {
      if (document.fullscreenElement === stageRef.current) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      /* Fullscreen availability depends on browser permissions. */
    }
  }
  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.22em] text-[var(--gold)]">
            <span className="h-2 w-2 rounded-full bg-[var(--gold)]" /> Studio de présentation{" "}
            <span className="rounded-full border border-[var(--gold)]/30 px-2 py-1 text-[9px]">
              Démo
            </span>
          </div>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
            Une conversation, pas un diaporama.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Un parcours interactif à personnaliser avec vos contenus validés. Les médias ajoutés
            restent uniquement dans cet onglet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNotes(!notes)}
            aria-pressed={notes}
            className="rounded-full border border-border px-4 py-2 text-xs hover:border-[var(--gold)]"
          >
            <Lightbulb className="mr-2 inline h-4 w-4" />{" "}
            {notes ? "Masquer les notes" : "Notes présentateur"}
          </button>
          <button
            type="button"
            onClick={() => void fullscreen()}
            className="rounded-full border border-border px-4 py-2 text-xs hover:border-[var(--gold)]"
          >
            <Expand className="mr-2 inline h-4 w-4" /> Plein écran
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Chapitres de la présentation">
        {chapters.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setIndex(i)}
            aria-current={i === index ? "step" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${i === index ? "border-[var(--gold)] bg-[var(--gold)] text-black" : "border-border text-muted-foreground hover:border-[var(--gold)]"}`}
          >
            <span className="mr-2 opacity-60">0{i + 1}</span>
            {c.name}
          </button>
        ))}
      </div>
      <section
        ref={stageRef}
        aria-label={`Présentation : ${chapter.name}`}
        className="relative overflow-y-auto rounded-2xl border border-[#c8aa72]/20 bg-[#0d0e0e] text-white shadow-2xl fullscreen:rounded-none"
      >
        <div className="relative grid min-h-[560px] lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative z-10 flex flex-col p-7 sm:p-10 lg:p-12">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-[.25em] text-[#d6bc87]">
                RMM / PRÉSENTATION · DÉMO
              </span>
              <span className="text-[10px] tracking-[.2em] text-white/40">{chapter.eyebrow}</span>
            </div>
            <div className="my-auto py-14">
              <div className="mb-6 inline-flex items-center gap-2 text-xs text-[#d6bc87]">
                <span className="h-px w-7 bg-[#d6bc87]" />
                {chapter.kicker}
              </div>
              <h3 className="max-w-xl font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
                {chapter.title}
              </h3>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/65 sm:text-base">
                {chapter.text}
              </p>
              <div className="mt-8 flex max-w-lg gap-4 rounded-xl border border-white/10 bg-white/[.04] p-5">
                <MessageSquareQuote className="h-5 w-5 shrink-0 text-[#d6bc87]" />
                <div>
                  <p className="text-[10px] uppercase tracking-[.2em] text-white/40">
                    Question à votre audience
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">{chapter.prompt}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] tracking-[.18em] text-white/40">
              <span>0{index + 1}</span>
              <div className="h-px w-20 bg-white/20">
                <div
                  className="h-px bg-[#d6bc87] transition-all"
                  style={{ width: `${((index + 1) / chapters.length) * 100}%` }}
                />
              </div>
              <span>0{chapters.length}</span>
            </div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden bg-[#171715] lg:min-h-full">
            {activeMedia ? (
              activeMedia.type === "video" ? (
                <video
                  key={activeMedia.url}
                  src={activeMedia.url}
                  controls
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={`Média ajouté : ${activeMedia.name}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )
            ) : index === 3 ? (
              <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-br from-[#302a20] via-[#141412] to-[#080908] p-6">
                {catalogue.slice(0, 3).map((p, i) => (
                  <div
                    key={p.id}
                    className={`w-1/3 max-w-40 overflow-hidden rounded-xl border border-white/15 bg-[#faf9f6] shadow-2xl ${i === 1 ? "translate-y-6" : ""}`}
                  >
                    <img
                      src={catalogueImage(p.id)}
                      alt={p.name}
                      className="aspect-[3/4] w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <img
                  src="/presentation/vision.jpg"
                  alt="Illustration abstraite d’un horizon lumineux"
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
              </>
            )}
            {!activeMedia && (
              <div className="absolute bottom-7 left-7 right-7">
                <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[9px] uppercase tracking-[.18em]">
                  {chapter.tag} · Illustration
                </span>
                <p className="mt-3 font-serif text-2xl">{chapter.accent}</p>
              </div>
            )}
          </div>
        </div>
        {notes && (
          <aside className="border-t border-white/10 bg-[#1b1a16] px-7 py-4 text-sm text-white/70 sm:px-10">
            <strong className="mr-2 text-[#d6bc87]">Note présentateur ·</strong>
            {chapter.note}
          </aside>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-7 py-4 sm:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-xs text-white/80 hover:border-[#d6bc87]">
              <Upload className="mr-2 inline h-3.5 w-3.5" /> Ajouter image / vidéo
              <input
                type="file"
                accept="image/*,video/*"
                onChange={chooseMedia}
                className="sr-only"
              />
            </label>
            {activeMedia && (
              <button
                type="button"
                onClick={clearMedia}
                className="text-xs text-white/60 hover:text-white"
              >
                <X className="mr-1 inline h-3 w-3" /> Retirer {activeMedia.name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={index === 0}
              aria-label="Chapitre précédent"
              className="rounded-full border border-white/20 p-2.5 disabled:opacity-25"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={index === chapters.length - 1}
              className="rounded-full bg-[#d6bc87] px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-30"
            >
              Suivant <ChevronRight className="ml-1 inline h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <ImageIcon className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="mt-4 font-medium">Votre médiathèque</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Ajoutez une image ou une vidéo par chapitre pour cette session. Aucun fichier n’est
            enregistré sur le serveur.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <MessageSquareQuote className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="mt-4 font-medium">Témoignages</h3>
          <p className="mt-2 text-xs uppercase tracking-wider text-[var(--gold)]">
            Exemple fictif · démonstration
          </p>
          <blockquote className="mt-2 font-serif text-base">
            « J’ai apprécié le temps pris pour répondre à mes questions. »
          </blockquote>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            À remplacer par des témoignages authentiques, autorisés et vérifiés.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Play className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="mt-4 font-medium">À vous de jouer</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Naviguez au clavier avec les flèches ou utilisez les chapitres. Présentation et médias
            sont provisoires.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Démonstration locale uniquement · Pas de conseils médicaux ou financiers, ni de promesse
        d’efficacité ou de revenus.
      </p>
    </div>
  );
}
