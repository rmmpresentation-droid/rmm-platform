# Guide d’installation et de test local

## 1. Prérequis

- Git et Docker Desktop avec Docker Compose v2 pour la méthode Docker ; ou Node.js 22 et npm pour la méthode sans Docker.
- Un navigateur moderne. Accès Internet nécessaire lors de l'installation des dépendances et pour les ressources distantes de la template.
- Ce prototype est local, sans base de données ou comptes utilisateurs. N'utilisez que des données fictives.

## 2. Récupérer le projet

```sh
git clone https://github.com/rmmpresentation-droid/rmm-platform.git
cd rmm-platform
git fetch origin arena/bdff8fd2-rmm-platform
git checkout arena/bdff8fd2-rmm-platform
```

Le code de cette branche n'est pas automatiquement intégré à `main`.

## 3. Démarrage avec Docker

```sh
docker compose up --build
```

Ouvrir http://localhost:8080. Arrêter avec Ctrl+C, puis `docker compose down`. Le port est lié à `127.0.0.1` pour limiter l'exposition à l'ordinateur local. Pour reconstruire après une mise à jour : `docker compose up --build`.

Les données de l'espace de travail sont stockées dans le navigateur, pas dans le conteneur. Un autre navigateur ou appareil ne les verra pas. Un nettoyage du stockage du navigateur les supprime ; exportez d'abord un JSON. Docker n'est pas requis pour les conserver.

## 4. Démarrage sans Docker

```sh
npm ci --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 8080
```

L'option `--legacy-peer-deps` est nécessaire pour les dépendances de la template. Ouvrir http://localhost:8080. Ctrl+C arrête le serveur.

## 5. Vérifications automatiques

```sh
npm test
npm run typecheck
npm run build
```

Les tests automatisés actuels vérifient seulement la validation des sauvegardes : JSON correct, sections manquantes, statuts incorrects et identifiants dupliqués. Ils ne constituent pas une recette complète des fonctionnalités ni des tests de sécurité. La compilation valide la construction du projet mais ne met rien en production.

## 6. Scénarios manuels

1. Aller sur `/admin` ; constater l'avertissement de prototype. Choisir un profil de démonstration dans le menu.
2. Dans Prospects, créer un prospect fictif et vérifier son apparition, la recherche, la modification et le passage de « Premier contact » à « Présentation », puis « Closing » ou « Sans commande ».
3. Dans Tâches, créer une tâche fictive avec responsable et échéance, passer son statut à « Terminée » et vérifier après rechargement.
4. Dans Rendez-vous, créer une demande fictive, lui attribuer un responsable et une date, puis changer son statut. Aucun message ou rappel n'est envoyé.
5. Dans Networkers, Formations, Ressources, Commandes et Produits et stock, ajouter une fiche fictive, modifier son statut, la modifier et la supprimer après confirmation. Ces fiches sont des données génériques : elles ne réalisent pas encore les processus métier associés.
6. Exporter le JSON, changer une fiche, importer le JSON exporté et confirmer le remplacement ; vérifier que l'état exporté est restauré. Tester un fichier JSON incorrect : l'import est refusé et les données précédentes restent présentes.
7. Aller sur `/dashboard`, choisir Networker ou Présentateur et observer les sections proposées. Le choix de profil est visuel, pas un contrôle d'accès. La boutique `/boutique` est encore une maquette non reliée à l'espace local.

## 7. Diagnostic

- Port occupé : arrêtez le service qui utilise le port 8080, ou modifiez le port Docker publié dans `compose.yaml`.
- Échec `npm ci` : utiliser Node 22 et la commande exacte avec `--legacy-peer-deps`. Vérifier l'accès au registre npm.
- Données absentes : vérifier que vous utilisez le même navigateur, le même profil et la même origine (localhost/port). Le stockage ne suit pas le dépôt Git.
- Import refusé : ne modifiez pas les sections ni les champs du JSON exporté. L'import remplace tout le contenu existant après confirmation.
