import { useEffect, useRef, useState } from "react";
import { Expand, Minimize2 } from "lucide-react";
import cairo from "@/assets/fonts/Cairo.ttf?inline";
import reem from "@/assets/fonts/ReemKufi.ttf?inline";
import { buildPartPresentation } from "@/lib/five-part-presentation.mjs";
import { parsePresentationPart, presentationParts } from "@/lib/presentation-parts.mjs";
import { useLanguage } from "@/lib/i18n";

const loadParts = [
  () => import("@/assets/presentation/part-1.html?raw"),
  () => import("@/assets/presentation/part-2.html?raw"),
  () => import("@/assets/presentation/part-3.html?raw"),
  () => import("@/assets/presentation/part-4.html?raw"),
  () => import("@/assets/presentation/part-5.html?raw"),
];

export function OriginalPresentation() {
  const { t } = useLanguage();
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [part, setPart] = useState(1);
  const [sourceDocument, setSourceDocument] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fallback, setFallback] = useState(false);
  const expanded = isFullscreen || fallback;

  useEffect(() => {
    let cancelled = false;
    setSourceDocument(null);
    setLoadError(false);
    loadParts[part - 1]()
      .then(({ default: source }) => {
        const document = buildPartPresentation(source, part, cairo, reem);
        if (!cancelled) setSourceDocument(document);
      })
      .catch((error) => {
        console.error("Impossible de préparer cette partie de la présentation :", error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [part]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "rmm-next-part")
        return;
      const sourcePart = event.data.part;
      setPart((current) => (current === sourcePart && current < 5 ? current + 1 : current));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    document.documentElement.classList.add("rmm-presentation-view");
    return () => document.documentElement.classList.remove("rmm-presentation-view");
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
    <div className="mt-6">
      <div
        ref={stage}
        className={`flex flex-col overflow-hidden border border-border bg-card ${fallback ? "fixed inset-0 z-[100] h-[100dvh] w-screen" : isFullscreen ? "h-[100dvh] w-screen" : "h-[min(75vh,850px)] min-h-[460px] rounded-2xl"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 text-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className="flex min-w-0 items-center gap-2">
              <span className="sr-only">{t("Choisir une présentation")}</span>
              <select
                aria-label={t("Choisir une présentation")}
                value={part}
                onChange={(event) => {
                  const selected = parsePresentationPart(event.target.value);
                  if (selected !== null) setPart(selected);
                }}
                className="max-w-[min(56vw,270px)] rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              >
                {presentationParts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} / 5 · {t(item.label)}
                  </option>
                ))}
              </select>
            </label>
            {part > 1 && (
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs hover:border-[var(--gold)]"
                onClick={() => setPart((current) => Math.max(1, current - 1))}
              >
                {t("Partie précédente")}
              </button>
            )}
          </div>
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
            ref={frame}
            key={part}
            title={`${t("Présentation originale intégrale")} · ${t("Partie")} ${part}`}
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
