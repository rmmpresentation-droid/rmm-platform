import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Expand,
  ImagePlus,
  Lightbulb,
  MessageCircle,
  X,
} from "lucide-react";
import { presenterJourney, journeyGroups } from "@/lib/presenter-journey.mjs";

type Medium = { url: string; type: "image" | "video"; name: string };

/** A presenter-led local draft. No audience answers or media leave the browser. */
export function ArabicJourney() {
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState(false);
  const [question, setQuestion] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [media, setMedia] = useState<Partial<Record<number, Medium>>>({});
  const mediaRef = useRef(media);
  const stage = useRef<HTMLElement>(null);
  mediaRef.current = media;
  const current = presenterJourney[index];
  const currentMedia = media[current.id];
  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(presenterJourney.length - 1, next)));
    setQuestion(false);
    setSelected(null);
  };
  useEffect(
    () => () =>
      Object.values(mediaRef.current).forEach((item) => item && URL.revokeObjectURL(item.url)),
    [],
  );
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.defaultPrevented ||
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "VIDEO", "BUTTON", "A"].includes(target?.tagName || "")
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        go(index + (event.key === "ArrowLeft" ? 1 : -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);
  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) return;
    const next = {
      name: file.name,
      type: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
      url: URL.createObjectURL(file),
    };
    setMedia((previous) => {
      if (previous[current.id]) URL.revokeObjectURL(previous[current.id]!.url);
      return { ...previous, [current.id]: next };
    });
  }
  function removeMedia() {
    setMedia((previous) => {
      if (previous[current.id]) URL.revokeObjectURL(previous[current.id]!.url);
      const next = { ...previous };
      delete next[current.id];
      return next;
    });
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === stage.current) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      /* Browser permissions may prevent fullscreen. */
    }
  }
  return (
    <div lang="ar" dir="rtl" className="mt-6 space-y-5 text-right">
      <div
        className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm leading-7 text-foreground"
        role="note"
      >
        <strong>مسودة داخلية للتجربة فقط، غير معتمدة للنشر.</strong> تحتاج المعلومات والادعاءات
        والوثائق إلى مراجعة الشركة ومراجعة قانونية تونسية. لا وعود طبية أو مالية.
      </div>
      <nav aria-label="مراحل الرحلة" className="flex gap-2 overflow-x-auto pb-1">
        {journeyGroups.map((group, i) => (
          <button
            key={group}
            type="button"
            onClick={() => go(presenterJourney.findIndex((step) => step.group === i))}
            aria-current={current.group === i ? "step" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${current.group === i ? "border-[var(--gold)] bg-[var(--gold)] text-black" : "border-border bg-card text-foreground hover:border-[var(--gold)]"}`}
          >
            <span className="ms-2 opacity-60">0{i + 1}</span>
            {group}
          </button>
        ))}
      </nav>
      <section
        ref={stage}
        aria-label={`العرض: ${current.title}`}
        className="presentation-stage relative overflow-y-auto rounded-3xl border border-[#b9a477]/30 bg-[#11110f] text-white shadow-2xl fullscreen:rounded-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3 text-xs text-[#d6bc87]">
            <span className="h-2 w-2 rounded-full bg-[#d6bc87]" /> RMM / رحلة تفاعلية{" "}
            <span className="text-white/40">· مسودة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotes(!notes)}
              aria-pressed={notes}
              className="rounded-full border border-white/20 px-3 py-2 text-xs hover:border-[#d6bc87]"
            >
              <Lightbulb className="ms-1 inline h-4 w-4" />
              {notes ? "إخفاء ملاحظات المقدّم" : "ملاحظات المقدّم"}
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label="ملء الشاشة أو الخروج منها"
              className="rounded-full border border-white/20 p-2 hover:border-[#d6bc87]"
            >
              <Expand size={16} />
            </button>
          </div>
        </div>
        <div className="grid lg:grid-cols-[1.1fr_.9fr]">
          <div key={current.id} className="studio-motion min-w-0 p-6 sm:p-10 lg:p-12">
            <div className="studio-copy">
              <p className="text-xs text-[#d6bc87]">
                {String(current.id).padStart(2, "0")} / {presenterJourney.length} · {current.label}
              </p>
              <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-relaxed sm:text-4xl">
                {current.title}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/75 sm:text-base">
                {current.lead}
              </p>
              {current.cards && (
                <div className="mt-7 grid gap-2 sm:grid-cols-2" aria-label="محاور النقاش">
                  {current.cards.map((card, i) => (
                    <button
                      key={card}
                      type="button"
                      onClick={() => setSelected(selected === i ? null : i)}
                      aria-pressed={selected === i}
                      className={`rounded-xl border p-4 text-right text-sm leading-7 transition ${selected === i ? "border-[#d6bc87] bg-[#d6bc87]/15 text-white" : "border-white/10 bg-white/[.04] text-white/80 hover:border-[#d6bc87]/60"}`}
                    >
                      <span className="ms-2 text-[#d6bc87]">{String(i + 1).padStart(2, "0")}</span>
                      {card}
                    </button>
                  ))}
                </div>
              )}
              {current.question && (
                <div className="mt-7 rounded-xl border border-[#d6bc87]/30 bg-[#d6bc87]/[.08] p-4">
                  <button
                    type="button"
                    onClick={() => setQuestion(!question)}
                    aria-expanded={question}
                    aria-controls="journey-question"
                    className="flex w-full items-center gap-2 text-sm text-[#e8d3a4]"
                  >
                    <MessageCircle size={18} />
                    {question ? "إخفاء سؤال الحوار" : "اكشف سؤال الحوار"}
                    <span className="me-auto">{question ? "−" : "+"}</span>
                  </button>
                  {question && (
                    <p id="journey-question" className="mt-4 text-base leading-8">
                      {current.question}
                    </p>
                  )}
                </div>
              )}
              {current.health && (
                <p className="mt-6 rounded-lg border border-white/10 p-3 text-xs leading-6 text-white/65">
                  المنتجات لا تعوّض استشارة طبية. استشر طبيبك في حالة وجود مرض أو حمل أو استخدام
                  أدوية. النتائج الفردية تختلف.
                </p>
              )}
            </div>
          </div>
          <div className="relative min-h-64 overflow-hidden bg-[#1d1d18] lg:min-h-full">
            {currentMedia?.type === "video" ? (
              <video
                src={currentMedia.url}
                controls
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : currentMedia || current.image ? (
              <img
                src={currentMedia?.url || current.image}
                alt={
                  currentMedia
                    ? `وسائط مضافة: ${currentMedia.name}`
                    : `صورة توضيحية: ${current.label}`
                }
                className={`absolute inset-0 h-full w-full ${current.id === 1 && !currentMedia ? "object-cover" : "object-contain p-5"}`}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#343023] to-[#11110f]">
                <div className="grid h-44 w-44 place-items-center rounded-full border border-[#d6bc87]/30">
                  <div className="grid h-32 w-32 place-items-center rounded-full border border-dashed border-[#d6bc87]/40 text-center">
                    <span className="text-5xl font-light text-[#d6bc87]/80">
                      {String(current.id).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-14">
              <p className="text-xs text-[#e8d3a4]">
                {journeyGroups[current.group]} / {current.label}
              </p>
              <p className="mt-2 text-xs text-white/65">
                {current.id === 1 && !currentMedia
                  ? "صورة توضيحية مولّدة"
                  : currentMedia
                    ? "وسائط محلية لهذه الجلسة"
                    : "المحتوى قيد المراجعة"}
              </p>
            </div>
          </div>
        </div>
        {notes && (
          <aside className="border-t border-[#d6bc87]/20 bg-[#242116] px-6 py-5 text-sm leading-7 text-white/80">
            <strong className="text-[#e8d3a4]">ملاحظة للمقدّم · </strong>
            {current.note}
          </aside>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-xs hover:border-[#d6bc87]">
              <ImagePlus className="ms-1 inline h-4 w-4" /> إضافة صورة أو فيديو
              <input type="file" accept="image/*,video/*" onChange={upload} className="sr-only" />
            </label>
            {currentMedia && (
              <button type="button" onClick={removeMedia} className="text-xs text-white/70">
                <X className="ms-1 inline h-3 w-3" />
                إزالة {currentMedia.name}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-30"
            >
              <ArrowRight className="ms-1 inline h-4 w-4" />
              السابق
            </button>
            <button
              type="button"
              disabled={index === presenterJourney.length - 1}
              onClick={() => go(index + 1)}
              className="rounded-full bg-[#d6bc87] px-4 py-2 text-sm font-semibold text-black disabled:opacity-30"
            >
              التالي <ArrowLeft className="me-1 inline h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-white/10" aria-hidden="true">
          <div
            className="h-full bg-[#d6bc87] transition-[width] motion-reduce:transition-none"
            style={{ width: `${((index + 1) / presenterJourney.length) * 100}%` }}
          />
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--gold)]" />
          <label htmlFor="journey-step">انتقل مباشرة إلى محور</label>
        </div>
        <select
          id="journey-step"
          value={index}
          onChange={(e) => go(Number(e.target.value))}
          className="max-w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
        >
          {presenterJourney.map((step, i) => (
            <option key={step.id} value={i}>
              {String(step.id).padStart(2, "0")} · {step.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        استخدم الأزرار أو أسهم لوحة المفاتيح للتنقل. الوسائط محلية ومؤقتة وتُزال عند مغادرة العرض؛
        لا تُحفظ على الخادم.
      </p>
    </div>
  );
}
