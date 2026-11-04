# Périmètre et architecture du prototype

## Existant

- Template TanStack Start / React / Vite : accueil, catalogue, fiches produits et page réseau, avec contenu de démonstration.
- Espace local `/admin` et `/dashboard` : sélection de profil de démonstration, création, modification, recherche, changement de statut et suppression de fiches génériques pour prospects, tâches, rendez-vous, networkers, formations, ressources, commandes et stock.
- Persistance dans `localStorage`, export et import JSON validé, tests unitaires du format de sauvegarde.
- Docker Compose démarre le serveur de développement local ; pas de CI/CD ou de configuration de production.

## Ce qui reste à réaliser

Le référentiel Notion contient beaucoup plus que les fiches génériques du prototype. Les cas d'utilisation suivants ne sont **pas implémentés** :

- Authentification réelle, création de comptes, isolation des données par rôle et réseau, audit et base de données partagée.
- Formation Days 1–3 avec contenus fournis par RMM, quiz configurable, score et restriction effective d'accès.
- Arbre de parrainage, gestion complète des packs, règles de rangs, PP, gains et commissions, retours et historiques financiers. Les règles doivent être approuvées par RMM.
- Disponibilités, détection de conflits, affectation et présence aux rendez-vous, tâches individuelles/groupées et notifications Telegram avec deux rappels.
- Boutique reliée au panier, commande effective, stock transactionnel, factures, paiement et suivi de livraison ; statistiques fiables, modération et rapports.
- Gestion structurée des supports/événements, téléchargements sécurisés, droits des présentateurs, contrôle d'accès aux prospects et prise en compte des obligations légales de conservation.
- Tests fonctionnels et d'intégration couvrant les parcours et la sécurité ; sauvegarde serveur et restauration partagée.

Les fiches génériques ne calculent rien et ne constituent pas la réalisation des processus ci-dessus. Les valeurs, tarifs et allégations dans la template sont à confirmer. Aucun cas d'utilisation IA n'est prévu.

## Flux technique actuel

Navigateur → serveur local Vite/TanStack → interface React. Les fiches sont enregistrées dans le localStorage du navigateur, et non dans le conteneur Docker. Les fichiers JSON exportés sont sous la responsabilité de l'utilisateur. L'import remplace l'ensemble des données locales, sans fusion.

Pour la suite, consulter le référentiel Notion approuvé et définir les règles métier manquantes ; prévoir une base de données locale, une authentification et des autorisations vérifiées côté serveur avant de manipuler des données sensibles.
