import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Video = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  uploaded_by: string;
};
const categories = [
  ["marketing", "Marketing de réseau"],
  ["produit", "Produit"],
  ["temoignage", "Témoignage"],
] as const;
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

export function TrainingVideos({ canUpload }: { canUpload: boolean }) {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("marketing");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch("/api/training-videos");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Service indisponible");
    setVideos(data);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error(t("La vidéo dépasse 100 Mo."));
      const type =
        file.type || (file.name.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4");
      const params = new URLSearchParams({ title, category });
      const response = await fetch(`/api/training-videos?${params}`, {
        method: "POST",
        headers: { "Content-Type": type },
        body: file,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("Import impossible."));
      setTitle("");
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
      <h2 className="font-serif text-2xl">{t("Vidéothèque de formation")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Vidéos internes ; vérifiez les droits, le consentement et les allégations avant de les ajouter.",
        )}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {canUpload && (
        <form onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            {t("Titre")}
            <input
              className={`${field} mt-1`}
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t("Type de vidéo")}
            <select
              className={`${field} mt-1`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(([id, label]) => (
                <option key={id} value={id}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t("Fichier MP4 ou WebM (100 Mo maximum)")}
            <input
              key={fileKey}
              className={`${field} mt-1`}
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="self-end">
            <button
              disabled={busy}
              className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {t(busy ? "Import en cours…" : "Ajouter la vidéo")}
            </button>
          </div>
        </form>
      )}
      <label className="mt-6 block max-w-xs text-sm">
        {t("Filtrer par type")}
        <select
          className={`${field} mt-1`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("Tous les types")}</option>
          {categories.map(([id, label]) => (
            <option key={id} value={id}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {videos
          .filter((v) => filter === "all" || v.category === filter)
          .map((v) => (
            <article key={v.id} className="rounded-lg border border-border p-3">
              <h3 className="font-semibold">{v.title}</h3>
              <p className="my-2 text-xs text-muted-foreground">
                {t(categories.find(([id]) => id === v.category)?.[1] || v.category)} ·{" "}
                {v.uploaded_by}
              </p>
              <video
                className="w-full"
                controls
                preload="metadata"
                src={`/api/training-videos/${v.id}/content`}
              />
            </article>
          ))}
      </div>
      {!videos.some((v) => filter === "all" || v.category === filter) && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("Aucune vidéo dans cette catégorie.")}
        </p>
      )}
    </section>
  );
}
