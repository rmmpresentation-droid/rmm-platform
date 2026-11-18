import { useEffect, useRef, useState } from "react";
import { Expand, Lightbulb } from "lucide-react";
import { catalogueImage } from "@/lib/product-catalogue";
import {
  partnershipProducts,
  partnershipSlides,
  productCategories,
  verificationTopics,
  type PartnershipProduct,
} from "@/lib/partnership-presentation.mjs";

const pill =
  "rounded-full border border-white/20 px-4 py-2 text-sm transition hover:border-[#d6bc87] aria-pressed:bg-[#d6bc87] aria-pressed:text-black disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6bc87]";
export function PartnershipPresentation() {
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState(false);
  const [category, setCategory] = useState(productCategories[0]);
  const [topic, setTopic] = useState(0);
  const [comparison, setComparison] = useState<"care" | "warning">("care");
  const [product, setProduct] = useState<PartnershipProduct | null>(null);
  const stage = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const slide = partnershipSlides[index];
  function go(i: number) {
    setIndex(Math.max(0, Math.min(partnershipSlides.length - 1, i)));
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const node = e.target as HTMLElement | null;
      if (
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.defaultPrevented ||
        dialog.current?.open ||
        node?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(node?.tagName || "")
      )
        return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) =>
          Math.max(0, Math.min(partnershipSlides.length - 1, i + (e.key === "ArrowLeft" ? 1 : -1))),
        );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (product && !dialog.current?.open) dialog.current?.showModal();
  }, [product]);
  function close() {
    dialog.current?.close();
    setProduct(null);
    trigger.current?.focus();
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement === stage.current) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      /* Browser may disallow fullscreen. */
    }
  }
  return (
    <div dir="rtl" lang="ar" className="mt-6 space-y-4 text-right">
      <div
        role="note"
        className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm leading-7"
      >
        <strong>مسودة داخلية غير معتمدة للنشر أو للاستخدام التجاري.</strong> حُجبت الأرقام والوعود
        والادعاءات غير المتحققة من الملف الأصلي. راجع وثائق الشركة والجهات المختصة والمراجعة
        القانونية التونسية قبل العرض.
      </div>
      <nav aria-label="شرائح العرض" className="flex gap-2 overflow-x-auto pb-1">
        {partnershipSlides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            aria-current={i === index ? "step" : undefined}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs ${i === index ? "border-[var(--gold)] bg-[var(--gold)] text-black" : "border-border bg-card"}`}
          >
            {String(i + 1).padStart(2, "0")} · {s.title}
          </button>
        ))}
      </nav>
      <section
        ref={stage}
        aria-label={`العرض: ${slide.title}`}
        className="presentation-stage relative overflow-y-auto rounded-3xl border border-[#b9a477]/30 bg-[#11110f] text-white shadow-2xl fullscreen:rounded-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <p className="text-xs text-[#d6bc87]">RMM × Swisderm · مسودة داخلية غير معتمدة للنشر</p>
          <div className="flex gap-2">
            <button className={pill} aria-pressed={notes} onClick={() => setNotes(!notes)}>
              <Lightbulb className="ms-1 inline h-4 w-4" />
              {notes ? "إخفاء ملاحظات المقدّم" : "ملاحظات المقدّم"}
            </button>
            <button
              className={pill}
              onClick={() => void fullscreen()}
              aria-label="ملء الشاشة أو الخروج منها"
            >
              <Expand size={16} />
            </button>
          </div>
        </div>
        <div key={slide.id} className="studio-motion p-6 sm:p-10">
          <p className="text-xs text-[#d6bc87]">
            {String(index + 1).padStart(2, "0")} / {partnershipSlides.length}
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-relaxed sm:text-4xl">{slide.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-white/75 sm:text-base">
            {slide.lead}
          </p>
          {slide.id === "intro" && (
            <button
              className="mt-7 rounded-full bg-[#d6bc87] px-6 py-3 text-sm font-semibold text-black"
              onClick={() => go(1)}
            >
              لنبدأ
            </button>
          )}
          {slide.id === "context" && (
            <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5 text-sm leading-8">
              أسئلة للنقاش: ما أهدافك؟ كيف تؤثر تغيرات الأسعار في ميزانيتك؟ ما المعلومات التي تحتاج
              إليها قبل اتخاذ قرار مالي؟
              <p className="mt-2 text-white/60">
                لا تُستخدم أرقام البطالة والتضخم أو المحاكاة الواردة في الملف قبل توثيقها وتحديثها.
              </p>
            </div>
          )}
          {slide.id === "direct" && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  className={pill}
                  aria-pressed={comparison === "care"}
                  onClick={() => setComparison("care")}
                >
                  نقاط للفحص
                </button>
                <button
                  className={pill}
                  aria-pressed={comparison === "warning"}
                  onClick={() => setComparison("warning")}
                >
                  مؤشرات تحذيرية
                </button>
              </div>
              <ul className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-7">
                {(comparison === "care"
                  ? [
                      "وجود منتج حقيقي ومعلومات واضحة عنه",
                      "التركيز على المستهلك والشروط الموثقة",
                      "شفافية التكاليف وحق الاطلاع على سياسة الإرجاع",
                    ]
                  : [
                      "الضغط للانضمام أو التجنيد دون فهم الشروط",
                      "وعود الثراء السريع أو الدخل المضمون",
                      "ادعاءات غير موثقة عن المنتجات أو الأرباح",
                    ]
                ).map((x) => (
                  <li key={x}>◦ {x}</li>
                ))}
              </ul>
              <p className="text-xs text-white/60">
                هذا إطار للنقاش وليس حكماً قانونياً على أي شركة. قد تكون النتائج ضعيفة أو سلبية.
              </p>
            </div>
          )}
          {slide.id === "brand" && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {verificationTopics.map((v, i) => (
                  <button
                    key={v.title}
                    className={pill}
                    aria-pressed={topic === i}
                    onClick={() => setTopic(i)}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
              <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-8">
                {verificationTopics[topic].text}
              </p>
            </div>
          )}
          {slide.id === "products" && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="فئات المنتجات">
                {productCategories.map((c) => (
                  <button
                    key={c}
                    className={pill}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {partnershipProducts
                  .filter((p) => p.category === category)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        trigger.current = e.currentTarget;
                        setProduct(p);
                      }}
                      className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 text-right transition hover:border-[#d6bc87] aria-pressed:bg-[#d6bc87] aria-pressed:text-black disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#d6bc87]"
                    >
                      <img
                        src={catalogueImage(p.id)}
                        alt={`صورة ${p.name}`}
                        className="h-40 w-full bg-[#e9e5da] object-contain p-3"
                        loading="lazy"
                      />
                      <span className="block p-4">
                        <strong dir="auto" className="text-[#e8d3a4]">
                          {p.name}
                        </strong>
                        <span className="mt-1 block text-sm text-white/70">{p.definition}</span>
                        <span className="mt-2 block text-xs text-[#d6bc87]">
                          فتح بطاقة المنتج ←
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
              <p className="text-xs leading-6 text-white/65">
                المعلومات مسودة غير معتمدة. استشر مختصاً صحياً عند وجود مرض أو حمل أو استخدام أدوية؛
                لا تستبدل العلاج بالمنتجات.
              </p>
            </div>
          )}
          {slide.id === "plan" && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {["Bronze", "Business", "Silver", "Gold", "Platinum"].map((p) => (
                  <span
                    key={p}
                    dir="ltr"
                    className="rounded-full border border-[#d6bc87]/40 px-4 py-2 text-sm"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-8">
                الأسعار والعمولات والشروط غير معروضة هنا. راجع وثائق الشركة وخطة التعويض المعتمدة،
                ولا تعد بدخل أو نمو فريق.
              </p>
            </div>
          )}
          {slide.id === "decision" && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "اقرأ العقد وسياسة الاسترجاع.",
                "تحقق من الوثائق والتراخيص الحالية.",
                "اسأل عن التكاليف والمخاطر والنتائج المحتملة.",
                "خذ وقتك؛ لا دخل مضمون ولا ضغط على القرار.",
              ].map((x) => (
                <p
                  key={x}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-7"
                >
                  {x}
                </p>
              ))}
              <button className={pill} onClick={() => go(0)}>
                العودة إلى البداية
              </button>
            </div>
          )}
          {notes && (
            <aside className="mt-7 rounded-xl border border-[#d6bc87]/30 bg-[#d6bc87]/10 p-4 text-sm leading-8">
              <strong>ملاحظات المقدّم:</strong> {slide.note}
            </aside>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <button className={pill} disabled={index === 0} onClick={() => go(index - 1)}>
            السابق
          </button>
          <span aria-live="polite" className="text-xs text-white/60">
            {index + 1} / {partnershipSlides.length}
          </span>
          <button
            className={pill}
            disabled={index === partnershipSlides.length - 1}
            onClick={() => go(index + 1)}
          >
            التالي
          </button>
        </div>
        <dialog
          ref={dialog}
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          onClick={(e) => {
            if (e.target === dialog.current) close();
          }}
          onClose={() => {
            setProduct(null);
            trigger.current?.focus();
          }}
          aria-labelledby="partnership-product-title"
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[#d6bc87]/30 bg-[#171714] p-0 text-white shadow-2xl backdrop:bg-black/75"
        >
          {product && (
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <h3
                  id="partnership-product-title"
                  dir="auto"
                  className="text-2xl font-semibold text-[#e8d3a4]"
                >
                  {product.name}
                </h3>
                <button
                  type="button"
                  onClick={close}
                  aria-label="إغلاق بطاقة المنتج"
                  className={pill}
                >
                  ×
                </button>
              </div>
              <img
                src={catalogueImage(product.id)}
                alt={`صورة ${product.name}`}
                className="mt-4 h-56 w-full rounded-xl bg-[#e9e5da] object-contain p-4"
              />
              <h4 className="mt-5 font-semibold">تعريف المنتج</h4>
              <p className="mt-2 text-sm leading-8 text-white/80">{product.definition}</p>
              <h4 className="mt-4 font-semibold">مكوّنات ومواصفات مذكورة في المسودة</h4>
              <p className="mt-2 text-sm leading-8 text-white/80">{product.ingredients}</p>
              <p className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-7">
                هذه المعلومات بحاجة للتحقق من الملصق والوثائق الرسمية. لا تُستخدم كادعاء صحي أو
                توصية علاجية.
              </p>
            </div>
          )}
        </dialog>
      </section>
    </div>
  );
}
