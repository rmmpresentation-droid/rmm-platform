import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";
type Aid = {
  id: string;
  title: string;
  kind: "image" | "link" | "testimonial";
  value?: string;
  uploaded_by: string;
};
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
export function PresentationAids({
  mode,
  canUpload,
}: {
  mode: "view" | "manage";
  canUpload: boolean;
}) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Aid[]>([]);
  const [kind, setKind] = useState<"image" | "link" | "testimonial">("image");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/presentation-aids");
    const b = await r.json();
    if (!r.ok) throw new Error(b.error || "Service indisponible");
    setItems(b);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let r: Response;
      if (kind === "image") {
        if (!file) throw new Error(t("Choisissez une image."));
        if (file.size > 10 * 1024 * 1024) throw new Error(t("L’image dépasse 10 Mo."));
        const params = new URLSearchParams({ title });
        r = await fetch(`/api/presentation-aids/image?${params}`, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } else {
        r = await fetch("/api/presentation-aids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, kind, value }),
        });
      }
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || t("Import impossible."));
      setTitle("");
      setValue("");
      setFile(null);
      setFileKey((x) => x + 1);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="font-serif text-2xl">{t("Photos, témoignages et liens")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Supports internes : vérifiez les droits, le consentement et le contenu avant utilisation.",
        )}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {mode === "manage" && canUpload && (
        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            {t("Type de support")}
            <select
              className={`${field} mt-1`}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setValue("");
                setFile(null);
                setFileKey((x) => x + 1);
              }}
            >
              <option value="image">{t("Photo")}</option>
              <option value="testimonial">{t("Témoignage écrit")}</option>
              <option value="link">{t("Lien HTTPS")}</option>
            </select>
          </label>
          <label className="text-sm">
            {t("Titre")}
            <input
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${field} mt-1`}
            />
          </label>
          {kind === "image" ? (
            <label className="text-sm">
              {t("Image JPEG, PNG ou WebP (10 Mo maximum)")}
              <input
                required
                key={fileKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={`${field} mt-1`}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          ) : (
            <label className="text-sm">
              {t(kind === "link" ? "Adresse HTTPS" : "Texte du témoignage")}
              {kind === "link" ? (
                <input
                  required
                  type="url"
                  maxLength={2000}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={`${field} mt-1`}
                />
              ) : (
                <textarea
                  required
                  maxLength={3000}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={`${field} mt-1`}
                />
              )}
            </label>
          )}
          <div className="self-end">
            <button
              disabled={busy}
              className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {t(busy ? "Import en cours…" : "Ajouter le support")}
            </button>
          </div>
        </form>
      )}
      {mode === "view" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-border p-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{item.uploaded_by}</p>
              {item.kind === "image" && (
                <img
                  className="mt-3 max-h-80 w-full object-contain"
                  src={`/api/presentation-aids/${item.id}/image`}
                  alt={item.title}
                />
              )}
              {item.kind === "testimonial" && (
                <p className="mt-3 whitespace-pre-wrap text-sm">{item.value}</p>
              )}
              {item.kind === "link" && (
                <a
                  href={item.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block break-all text-sm text-[var(--gold)] underline"
                >
                  {item.value}
                </a>
              )}
            </article>
          ))}
        </div>
      )}
      {mode === "view" && !items.length && (
        <p className="mt-4 text-sm text-muted-foreground">{t("Aucun support ajouté.")}</p>
      )}
    </section>
  );
}
