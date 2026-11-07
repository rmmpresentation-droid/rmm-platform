# Audit du dépôt — phase 0, 7 novembre 2026

**Statut : plan à valider ; prototype local seulement, non utilisable en production.** Audit du commit `131c506fe8e71752c9ac3728658061ad265f0a7a`, branche `arena/74d803db-rmm-platform`. Aucun projet distant, déploiement, migration de données ou compte réel n'a été créé. Les versions du référentiel Notion sont des documents de travail ; les instructions explicites les plus récentes excluent l'e-commerce, Next.js, Prisma et l'IA.

## Suite après validation du plan

Le propriétaire a approuvé le plan et confirmé que le programme arabe fourni remplacera Days 1–3. La configuration Supabase locale a été initialisée après l’audit ; son démarrage a échoué faute de Docker/Podman. Elle ne constitue ni une migration ni une preuve de fonctionnement RLS. Voir le plan actualisé.

## Commandes réellement exécutées

Environnement : Node `v22.22.3`, npm `10.9.8`. Aucun exécutable `docker`, `supabase` ou `psql` trouvé dans le PATH.

| Commande | Résultat |
| --- | --- |
| `npm ci --legacy-peer-deps` | Succès : 607 paquets installés ; npm signale 15 vulnérabilités (9 modérées, 4 élevées, 2 critiques) et plusieurs dépendances dépréciées. |
| `npm test` | Succès : 9 tests Node, dont API avec `pg-mem` et `supertest`. Ce n'est pas un test PostgreSQL réel, RLS, concurrence ou navigateur. |
| `npm run typecheck` | Succès (`tsc --noEmit`). |
| `npm run build` | Succès Vite client et SSR avec avertissements d'imports inutilisés. Le plugin indique que Nitro est ignoré faute de contexte Lovable : ce n'est pas une preuve de build Cloudflare. |
| `npm run lint` | Échec : 795 erreurs et 6 avertissements, essentiellement Prettier. Pas de correction automatique appliquée. |
| `npm audit --json` | Rapport consulté : 15 vulnérabilités (9 modérées, 4 élevées, 2 critiques). Parmi les critiques : `@tanstack/react-start` et `@tanstack/start-server-core`, dont [GHSA-qx66-fv34-fjm8](https://github.com/advisories/GHSA-qx66-fv34-fjm8). `zod` est signalé élevé. Impact réel et versions compatibles restent à analyser ; aucune correction automatique appliquée. |

Les résultats de l'audit de dépendances sont une photographie, pas une certification de sécurité. `npm ci` utilise `--legacy-peer-deps` à cause du conflit de pairs existant. Des avertissements concernent notamment `tsconfck`, Recharts 2 et ESLint. Docker Compose, Supabase local, PostgreSQL réel, navigateurs, sauvegarde/restauration et Cloudflare n'ont pas été exécutés.

## Inventaire et destination envisagée

| Fichiers / éléments | État et traitement prévu après validation |
| --- | --- |
| `src/routes/{__root,index,boutique,produit.$id,networker}.tsx`, `src/components/{brand,layout,product,theme,ui}`, `src/styles.css` | Réutiliser TanStack Start/React, le design et les composants ; transformer la boutique en vitrine et auditer accessibilité, SEO, traductions et contenus. Retirer les éléments d'achat public et le lien Admin public, dans des changements réversibles. |
| `src/lib/data.ts` | Conserver comme source de seed **fictif/non validé**, jamais comme source d'autorité pour prix, PP, revenus ou allégations. Actuellement valeurs codées en dur, textes santé/revenus et avis non validés sont visibles dans l'interface publique : blocage avant toute publication. |
| `src/components/workspace/LocalWorkspace.tsx`, `src/routes/{admin,dashboard}.tsx`, `src/lib/{agenda,business-fields,local-workspace}.mjs` | Réutiliser les parcours, écrans et tests comme référence ; décomposer le monolithe et migrer les règles vers modules typés, validations serveur et base. Les statuts historiques doivent rester récupérables. |
| `server/app.mjs`, `server/index.mjs` | Remplacement progressif d'Express, `pg`, sessions et auth maison par Supabase Auth et fonctions serveur ; conserver temporairement l'ancienne implémentation comme référence et voie de retour jusqu'à validation de chaque remplacement. |
| `tests/*.test.mjs` | Conserver comme base d'acceptation ; compléter puis adapter vers Vitest, tests RLS PostgreSQL réels, concurrence et Playwright. Aucun de ces nouveaux tests n'existe encore. |
| `package.json`, `package-lock.json`, `bun.lock`, `bunfig.toml`, `Dockerfile` | npm est le choix cible. Deux lockfiles étaient suivis : `bun.lock` a été supprimé dans le commit dédié `c4ce775` (retour arrière : `git revert c4ce775`) ; vérifier séparément si `bunfig.toml` est encore utile avant toute suppression. Examiner licences/maintenance avant ajout ou mise à niveau de dépendances. |
| `.env.example`, `.gitignore`, `.dockerignore`, `compose.yaml` | `.env*` est ignoré sauf `.env.example` ; l'exemple actuel contient des valeurs de démonstration, et Compose contient des identifiants PostgreSQL locaux fixes. À remplacer par des variables sans valeurs/exemples secrets et documenter les réglages locaux, sans recopier de secrets. Aucun scan complet d'historique n'a été exécuté. |
| `vite.config.ts`, `src/server.ts`, `src/lib/config.server.ts` | Garder TanStack Start et vérifier un build Cloudflare explicite avec les versions corrigées. Vite proxy `/api` vise actuellement Express ; ne pas supposer que le build observé utilise Nitro. |
| `docs/INSTALLATION_ET_TESTS.md`, `docs/PERIMETRE.md`, `README.md` | Conserver et adapter progressivement ; la documentation actuelle décrit l'ancien prototype. |
| `.github/workflows`, `supabase/` | Aucun fichier suivi trouvé. Supabase local, migrations, CI, RLS et ADR de services restent à créer après validation et disponibilité des outils ; aucune CI n'a été configurée pendant cet audit. |

## Écarts et risques majeurs

1. **Sécurité bloquante** : vulnérabilités critiques signalées, lint rouge, authentification/sessions maison sans RLS, absence de MFA, suspension, audit, tests de sécurité/RLS et qualification de formation imposée côté serveur. Les tests existants ne prouvent pas la conformité cible.
2. **Données et intégrité** : table générique `entries` avec `extra` en texte JSON et dates texte ; historique CRM et transitions incomplets ; quiz non automatique ; pas de stock transactionnel ; conflit de rendez-vous vérifié dans l'application mais pas atomique ; pas de rappel ni file Telegram. Les mots de passe/sessions maison ne doivent pas être réutilisés ou importés aveuglément dans Supabase Auth.
3. **Contenus publics** : panier visuel et bouton « Ajouter au panier », lien Admin, prix/PP, exemples d'allégations santé, revenus et témoignages ; aucune validation administrateur de ces contenus. Pas de démonstration publique avant neutralisation et validation.
4. **Confidentialité et migration** : l'ancien `assigned_to` a plusieurs significations, des liens sont du texte libre, certains rendez-vous n'ont pas de fin ou de fuseau explicite, et d'anciens prospects n'ont pas de contact lié. Une conversion automatique peut perdre du sens ou exposer des données ; conserver source et anomalies, en environnement fictif uniquement.
5. **Offres gratuites et exploitation** : quotas, usage commercial, MFA, pg_cron/Edge, stockage des sauvegardes, fréquence des crons et rétention d'artefacts n'ont pas été vérifiés sur les sources officielles ; ne pas les présumer. Sauvegardes, restauration et monitoring inexistants. Le coût zéro ne peut être garanti sans vérifier leurs conditions et limitations.
6. **Outillage et phasage** : CLI Supabase et Docker indisponibles ; initialisation locale et tests réels bloqués dans cet environnement. CI non créée : le lint est déjà en échec. La branche de session est imposée ; une branche séparée par phase n'est pas possible dans cette session, mais des commits/PR distincts restent envisageables sur la branche autorisée.

## Questions ouvertes — référentiel Notion § 8

[Référentiel RMM, section 8](https://app.notion.com/p/R-f-rentiel-projet-RMM-architecture-et-planning-valider-40e409c2cd7881328a1cc057fbbccf48), version de travail du 4 novembre 2026 :

- Qui fournit les contenus Days 1–3, les questions, le score, le nombre de tentatives et les exceptions ? Les valeurs restent configurables et non inventées.
- Quels périmètres exacts pour admins et présentateurs, quelles règles de tâches, d'engagement et quels indicateurs ? Les règles explicites du nouveau cahier des charges sont prioritaires.
- Les rappels proposés J−1 et H−1 doivent-ils être validés comme valeurs initiales configurables ?
- Quels packs, limites d'options, prix, PP, rangs, commissions, réductions et retours sont approuvés ? Bronze 1 / Silver 3 sont des hypothèses à confirmer. Aucune rémunération P1 ne sera activée sans validation.
- Quelles obligations de protection des données, conservation, suppression, modèle commercial et textes légaux le conseil local valide-t-il ? Facturation et fiscalité restent P1 et ne sont pas à implémenter maintenant.
- Qui est responsable produit et responsable des sauvegardes, avec quels objectifs de restauration, capacité d'équipe et critères de sortie du gratuit ?
- Les anciennes mentions de panier, Konnect, Next.js et Prisma sont dépassées par la demande actuelle et ne constituent pas des décisions ouvertes à réintroduire.
