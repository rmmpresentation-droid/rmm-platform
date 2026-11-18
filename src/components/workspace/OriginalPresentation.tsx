import { useEffect, useMemo, useRef, useState } from "react";
import { Expand } from "lucide-react";
import original from "@/assets/presentation/partnership-original.html?raw";
import cairo from "@/assets/fonts/Cairo.ttf?inline";
import reem from "@/assets/fonts/ReemKufi.ttf?inline";
import { buildOriginalPresentation } from "@/lib/original-presentation.mjs";
import { useLanguage } from "@/lib/i18n";

export function OriginalPresentation() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setIsFullscreen(window.document.fullscreenElement === stage.current);
    window.document.addEventListener("fullscreenchange", sync);
    return () => window.document.removeEventListener("fullscreenchange", sync);
  }, []);
  const sourceDocument = useMemo(() => {
    try {
      return buildOriginalPresentation(original, window.location.origin, cairo, reem);
    } catch {
      return null;
    }
  }, []);
  async function fullscreen() {
    try {
      if (window.document.fullscreenElement === stage.current)
        await window.document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      /* Browser may deny fullscreen. */
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
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-black"
        >
          {t("Ouvrir le document original pour revue")}
        </button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fullscreen()}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              <Expand className="me-2 inline h-4 w-4" />
              {t("Plein écran")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              {t("Fermer le document")}
            </button>
          </div>
          <div
            ref={stage}
            className="overflow-hidden rounded-2xl border border-border bg-card fullscreen:rounded-none"
          >
            {sourceDocument ? (
              <iframe
                title={t("Présentation originale arabe — document non validé")}
                srcDoc={sourceDocument}
                sandbox="allow-scripts"
                className={`block w-full border-0 ${isFullscreen ? "h-screen" : "h-[min(75vh,850px)] min-h-[500px]"}`}
              />
            ) : (
              <p role="alert" className="p-5 text-red-500">
                {t("Le document original ne peut pas être chargé.")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
