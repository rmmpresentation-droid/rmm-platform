import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n";

type Node = { id: string; name: string; sponsor_id: string | null };
type Tree = { nodes: Node[]; parent?: { name: string } | null; integrity_warning: boolean };
export function NetworkTree({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [data, setData] = useState<Tree | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    fetch("/api/networkers/tree")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Service indisponible");
        if (mounted) setData(body);
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const { rows, integrity } = useMemo(() => {
    const nodes = data?.nodes || [];
    const ids = new Set(nodes.map((n) => n.id));
    const children = new Map<string, Node[]>();
    for (const n of nodes)
      if (n.sponsor_id && ids.has(n.sponsor_id)) {
        const group = children.get(n.sponsor_id) || [];
        group.push(n);
        children.set(n.sponsor_id, group);
      }
    const visited = new Set<string>();
    const rows: { node: Node; depth: number; orphan: boolean }[] = [];
    function append(root: Node, orphan = false) {
      const stack = [{ node: root, depth: 0, orphan }];
      while (stack.length) {
        const item = stack.pop()!;
        if (visited.has(item.node.id)) continue;
        visited.add(item.node.id);
        rows.push(item);
        const descendants = children.get(item.node.id) || [];
        for (let i = descendants.length - 1; i >= 0; i--)
          stack.push({ node: descendants[i], depth: item.depth + 1, orphan: false });
      }
    }
    nodes
      .filter((n) => !n.sponsor_id || !ids.has(n.sponsor_id))
      .forEach((n) => append(n, !!n.sponsor_id));
    const detached = nodes.filter((n) => !visited.has(n.id));
    detached.forEach((n) => {
      if (!visited.has(n.id)) append(n, true);
    });
    return { rows, integrity: !!data?.integrity_warning || detached.length > 0 };
  }, [data]);
  return (
    <section className="rounded-xl bg-card hairline p-6">
      <h2 className="font-serif text-2xl">
        {t(isAdmin ? "Arbres des networkers" : "Mon arbre réseau")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          isAdmin
            ? "Tous les arbres et leurs liens de parrainage."
            : "Votre parrain direct et tous vos descendants.",
        )}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {data?.parent && !isAdmin && (
        <p className="mt-3 text-sm">
          {t("Parrain :")} {data.parent.name}
        </p>
      )}
      {data && !data.parent && !isAdmin && (
        <p className="mt-3 text-sm">
          {t("Parrain :")} {t("Non renseigné")}
        </p>
      )}
      {integrity && (
        <p role="alert" className="mt-3 rounded-md border border-amber-500 p-3 text-sm">
          {t(
            "Anomalie de parrainage détectée : un lien ou un cycle nécessite une vérification par l’administration.",
          )}
        </p>
      )}
      {!data && !error && <p className="mt-3 text-sm">{t("Chargement…")}</p>}
      {data && !rows.length && <p className="mt-3 text-sm">{t("Aucun networker trouvé.")}</p>}
      <ul className="mt-4 space-y-1" aria-label={t("Hiérarchie de parrainage")}>
        {rows.map(({ node, depth, orphan }) => (
          <li
            key={node.id}
            className="border-s border-border py-2 text-sm"
            style={{
              marginInlineStart: `${Math.min(depth, 10) * 1.25}rem`,
              paddingInlineStart: "0.75rem",
            }}
          >
            {depth > 0 && <span aria-hidden="true">↳ </span>}
            <span className={depth === 0 ? "font-semibold" : ""}>{node.name}</span>
            {depth > 0 && (
              <span className={depth > 10 ? "text-xs text-muted-foreground" : "sr-only"}>
                {" "}
                {t("Niveau")} {depth + 1}
              </span>
            )}
            {orphan && (
              <span className="text-xs text-muted-foreground"> · {t("Lien à vérifier")}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
