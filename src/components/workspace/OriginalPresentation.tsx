import { useEffect, useRef, useState } from "react";
import { Expand, Minimize2 } from "lucide-react";
import original from "@/assets/presentation/partnership-new.html?raw";
import cairo from "@/assets/fonts/Cairo.ttf?inline";
import reem from "@/assets/fonts/ReemKufi.ttf?inline";
import { buildNewPresentation } from "@/lib/new-presentation.mjs";
import { useLanguage } from "@/lib/i18n";

export function OriginalPresentation() {
  const { t } = useLanguage();
  const stage = useRef<HTMLDivElement>(null);
  const [sourceDocument, setSourceDocument] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallback, setFallback] = useState(false);
  const expanded = isFullscreen || fallback;

  useEffect(() => {
    try {
      setSourceDocument(buildNewPresentation(original, cairo, reem));
    } catch (error) {
      console.error("Impossible de préparer la présentation originale :", error);
      setLoadError(true);
    }
  }, []);
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!fallback) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFallback(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", escape);
    };
  }, [fallback]);
  async function fullscreen() {
    if (fallback) {
      setFallback(false);
      return;
    }
    try {
      if (document.fullscreenElement === stage.current) await document.exitFullscreen();
      else if (stage.current?.requestFullscreen) await stage.current.requestFullscreen();
      else setFallback(true);
    } catch {
      // Embedded previews and some mobile browsers disallow the native API.
      if (!document.fullscreenElement) setFallback(true);
    }
  }
  return (
    <div className="mt-6 space-y-4">
      <div
        role="note"
        className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm leading-7"
      >
        <strong>{t("Document original non vérifié — consultation interne uniquement.")}</strong>{" "}
        {t(
          "Il conserve les chiffres, affirmations médicales et financières et simulations fournis ; ils ne constituent pas des faits validés ni des promesses. Vérification et revue juridique nécessaires avant toute utilisation publique ou commerciale.",
        )}
      </div>
      <div
        ref={stage}
        className={`flex flex-col overflow-hidden border border-border bg-card ${fallback ? "fixed inset-0 z-[100] h-[100dvh] w-screen" : isFullscreen ? "h-[100dvh] w-screen" : "h-[min(75vh,850px)] min-h-[460px] rounded-2xl"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">{t("Présentation originale intégrale")}</span>
          <button
            type="button"
            onClick={() => void fullscreen()}
            aria-pressed={expanded}
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm hover:border-[var(--gold)]"
          >
            {expanded ? (
              <Minimize2 className="me-2 inline h-4 w-4" />
            ) : (
              <Expand className="me-2 inline h-4 w-4" />
            )}
            {t(expanded ? "Quitter le plein écran" : "Plein écran")}
          </button>
        </div>
        {sourceDocument ? (
          <iframe
            title={t("Présentation originale arabe — document non validé")}
            srcDoc={sourceDocument}
            sandbox="allow-scripts"
            className="block min-h-0 w-full flex-1 border-0"
          />
        ) : loadError ? (
          <p role="alert" className="p-5 text-red-500">
            {t("Le document original ne peut pas être chargé.")}
          </p>
        ) : (
          <p className="p-5 text-muted-foreground">{t("Chargement…")}</p>
        )}
      </div>
    </div>
  );
}
