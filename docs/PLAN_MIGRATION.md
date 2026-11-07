# Plan de migration — proposition à valider

**7 novembre 2026 — aucune migration, infrastructure distante, CI ni déploiement n'a été exécuté.** Voir [AUDIT.md](AUDIT.md) pour la mesure initiale. Sans validation explicite de cette phase, ne pas commencer la phase 1. Pas de production sans « GO PROD », pas de données réelles en développement, pas de facturation ni d'essai avec carte.

## Principes transverses

- Conserver TanStack Start/TypeScript et le design ; Supabase local d'abord, Auth et RLS en base, `createServerFn` pour les actions sensibles ; aucune clé privilégiée dans le navigateur. Pas de Prisma, e-commerce public, IA ou calculs de rémunération P1.
- Chaque phase : petits commits conventionnels, tests et lint propres, preuve reproductible, documentation, revue et arrêt pour validation. La branche Arena est fixe ; ne pas en créer d'autre dans cette session. Le seul `bun.lock` a été supprimé dans le commit dédié `c4ce775`, réversible avec `git revert c4ce775` ; npm reste la référence. Ne rien supprimer d'autre sans annoncer et prévoir le retour arrière.
- Avant utilisation ou modification d'une offre, vérifier la documentation officielle des quotas, pause, sauvegardes, usage commercial, MFA, tâches planifiées et éventuels coûts, puis consigner URL et date dans `docs/ADR/`. Aucune offre ou quota n'a été validé pendant l'audit. Si le gratuit ne suffit pas, s'arrêter et proposer des alternatives gratuites.
- Préparer les ADR : compatibilité TanStack/Supabase/Cloudflare et variantes de déploiement ; authentification/RLS ; conflits de rendez-vous par ressource ; notifications/cron ; sauvegardes chiffrées ; versionnement des règles. Documenter les limites et les licences/maintenance avant toute nouvelle dépendance.

## Phase 0 — état et prérequis restant à lever

1. L'audit et ce plan constituent le livrable soumis à approbation. Les quatre commandes demandées ont réussi, mais le lint et l'audit de dépendances sont en échec : voir [AUDIT.md](AUDIT.md).
2. **Non réalisé** : Supabase local via CLI et CI. Docker, Supabase CLI et PostgreSQL ne sont pas disponibles ici ; la CI serait rouge avec le lint existant. Prévoir un environnement disposant de Docker et valider l'approche de correction des vulnérabilités, du lint, des dépendances npm et des variables d'exemple. Ne pas contourner les vérifications en désactivant des règles.
3. Après accord, installer les outils gratuits compatibles et vérifier leurs licences, initialiser uniquement Supabase local avec données fictives ; ajouter une CI sans secrets et couvrant installation, tests, types, lint, scan de secrets et tests SQL lorsque disponibles. Aucun projet Supabase distant n'est nécessaire pour valider le local.

## Phases proposées après approbation

| Phase | Travail et validation observable |
| --- | --- |
| 1 — fondations | Migrations SQL versionnées, profils/rôles, Auth invitation/réinitialisation et suspension, audit, seed fictif, types générés. RLS et tests sur PostgreSQL réel pour les rôles, l'absence d'accès et l'escalade de privilèges. Démontrer chaque rôle et l'isolation ; confirmer compatibilité MFA et minimum de mot de passe. |
| 2 — formation et tâches | Contenus fournis par RMM, progression, quiz paramétrable et blocage côté serveur **et RLS**, y compris URL/API directes. Bibliothèque et tâches ciblées, droits superadmin pour tâches admins, suivi individuel pour groupes dynamiques. Démontrer échec puis réussite du quiz et indépendance des statuts. |
| 3 — CRM et agenda | Historique CRM, prochaines actions et clôture ; disponibilités, fuseau Tunis, participants, `tstzrange`/`timestamptz`, exclusion GiST **par ressource affectée**, présence et comptes rendus. File idempotente, deux rappels configurables, Telegram volontaire et recours interne. Tester deux confirmations concurrentes, changement/annulation, confidentialité et échec Telegram. |
| 4 — catalogue et commandes | Produits/images, options, packs et limites configurables non validées, stock et mouvements, commande interne et événements. Validation en base, transaction et idempotence ; tests de concurrence et restauration unique à l'annulation. Pas de paiement en ligne ; aucune règle financière non validée activée. |
| 5 — présentateur | Bibliothèque et présentation plein écran, six étapes et supports validés, séances et présence. Démonstration de bout en bout par un compte fictif. |
| 6 — vitrine | Catalogue public issu de données validées, contact anti-spam, WhatsApp, légal, SEO, i18n FR/structure AR et EN, accessibilité ; prix masqués par défaut, aucune action d'achat, aucune allégation non validée. Vérifier Lighthouse et parcours public. |
| 7 — réseau | Parrainage sans cycle en base, lien identifié sans création automatique de compte, validation admin, arbre direct et tableaux de bord de base. Tester création, cycle et visibilité selon rôle. |
| 8 — sécurité et exploitation | Recette avec données fictives ou volontaires seulement, vérification de sécurité et accessibilité, quotas et conditions, sauvegarde chiffrée et restauration testée, runbook et supervision. Produire la check-list de préparation et attendre ; pas de GO PROD implicite. |

## Stratégie de migration réversible des données fictives

1. Inventorier le schéma et les valeurs historiques avant toute modification : `users`, `sessions`, `entries`, `task_progress`, `appointment_reports`, `training_attendance`, valeurs de `extra`, `assigned_to`, parrain et sauvegardes localStorage éventuelles. Exporter un instantané de test chiffré avec un procédé autorisé ; vérifier la restauration sur une base de test séparée. Aucune donnée réelle ne sera migrée à cette étape.
2. Créer les tables typées et conserver une table de correspondance d'identifiants et un rapport d'anomalies **sans recopier les données sensibles dans les logs**. Ne jamais effacer/écraser la source. Les données fictives incohérentes sont mises en quarantaine, non corrigées silencieusement ; une réconciliation par section et par statut précède toute bascule.
3. Pour l'identité, définir un chemin d'invitation/activation et de correspondance contrôlée ; ne pas importer les sessions ni supposer la compatibilité des empreintes bcrypt. Ne pas créer de comptes réels. Conserver temporairement le prototype isolé pour retour arrière.
4. Préserver les statuts sources en parallèle d'un mapping versionné. Exemples à arbitrer et tester : `Présentation` → présentation (ne pas inventer si un rendez-vous a eu lieu), `Closing` → closing en cours, `Consommateur`/`Candidat networker`/`Sans commande` → issues correspondantes ; les nouvelles étapes, prochaines actions, pack et motifs absents restent à compléter, jamais déduits. Conserver `À faire`, `En cours`, `Terminée` et les statuts de rendez-vous et commandes existants ; les nouveaux statuts n'impliquent pas un historique rétroactif.
5. Interpréter `assigned_to` selon `section` : contact prospect ou présentateur de rendez-vous ; `extra` peut référencer prospect, networker ou admin ; le champ `owner` et certains participants sont des noms libres et ne deviennent pas des liens fiables automatiquement. Garder champs non mappés et anomalies consultables côté administrateur de test.
6. Convertir les dates locales explicites en `timestamptz` via `Africa/Tunis` après validation ; conserver les dates d'origine. Signaler dates invalides, absentes et rendez-vous sans fin sans inventer de durée. Anciennes notes manuelles ne deviennent pas des tentatives de quiz réussies. Les anciennes quantités indicatives ne constituent pas un historique de mouvements.
7. Vérifier RLS, comptes, comptages, statuts, liens et accès par rôle avec données fictives ; exécuter les tests de non-régression et de restauration. Basculer par module uniquement après approbation. Retour arrière : désactiver la nouvelle voie, revenir au commit applicatif précédent et restaurer le snapshot de test validé ; ne pas tenter de fusion inverse silencieuse.

## Questions pour lancer la suite

La liste métier de la section 8 du référentiel est reproduite dans [AUDIT.md](AUDIT.md). Confirmer notamment contenus et règles du quiz, permissions exactes, règles et limites des packs, textes et données personnelles, responsables exploitation/sauvegardes et conditions gratuites. La règle de conflit **par ressource**, l'absence de vente en ligne et la limitation stricte aux previews fictives sont déjà imposées par la demande actuelle ; elles ne sont pas à remettre en cause par défaut.
