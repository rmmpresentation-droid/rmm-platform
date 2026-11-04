# Installation et tests locaux

## Prérequis et récupération

Installer Git, Docker Desktop et Docker Compose v2. La machine doit avoir accès à Internet pour télécharger les images et dépendances.

```sh
git clone https://github.com/rmmpresentation-droid/rmm-platform.git
cd rmm-platform
git switch --track origin/arena/bdff8fd2-rmm-platform
cp .env.example .env
```

Sous Windows, copier `.env.example` vers `.env` avec l'explorateur ou `copy .env.example .env`. Modifier dans `.env` l'adresse et le mot de passe initial (`RMM_ADMIN_EMAIL`, `RMM_ADMIN_PASSWORD` ; 12 caractères minimum). Ne pas partager ni committer ce fichier. Si le mot de passe contient des caractères spéciaux, l'entourer de guillemets simples dans `.env`.

## Démarrage Docker

```sh
docker compose up --build
```

Ouvrir http://localhost:8080/dashboard. Le navigateur utilise le port 8080 ; l'API et la base ne sont pas publiées directement. PostgreSQL conserve les données dans le volume Docker `rmm_db`. Le serveur initialise les tables et le premier superadministrateur uniquement lorsque la table des utilisateurs est vide. Changer `.env` par la suite ne modifie pas un compte déjà créé.

Arrêter avec Ctrl+C puis `docker compose down`. Ne pas utiliser `docker compose down -v` si les données doivent être conservées : cette commande supprime le volume de la base. Pour reconstruire après un pull, relancer `docker compose up --build`.

## Sans Docker

Prérequis : Node.js 22, npm et PostgreSQL 16 disponible localement avec une base et un utilisateur. Utiliser deux terminaux :

```sh
npm ci --legacy-peer-deps
export DATABASE_URL='postgres://rmm:rmm_local@localhost:5432/rmm'
export RMM_ADMIN_EMAIL='admin@example.test'
export RMM_ADMIN_PASSWORD='un-mot-de-passe-local-long'
npm run api
```

Dans le second terminal :

```sh
npm run dev -- --host 127.0.0.1 --port 8080
```

La base et son utilisateur doivent être créés au préalable ; adapter `DATABASE_URL` à votre installation. L'API utilise le port 3001, et Vite redirige `/api` vers elle. Sous Windows, utiliser la syntaxe de variables d'environnement adaptée à votre terminal. `--legacy-peer-deps` est nécessaire aux dépendances de la template.

## Parcours manuels

1. Ouvrir `/dashboard` : sans session, le formulaire de connexion s'affiche. Tester un mot de passe incorrect, puis les identifiants initiaux.
2. Depuis le superadministrateur, ouvrir Utilisateurs et créer au moins un administrateur, un présentateur et deux networkers avec des mots de passe de 12 caractères minimum. Se déconnecter.
3. Se connecter comme networker : créer un prospect et une tâche, modifier leur statut, recharger la page et vérifier leur persistance. Le tableau de bord affiche les nombres des fiches accessibles.
4. Se connecter comme deuxième networker : vérifier que les prospects du premier ne sont pas visibles. Le rôle présentateur ne voit que rendez-vous, formations et ressources. Ces deux rôles ont un accès en lecture seule aux formations et ressources.
5. Se connecter comme administrateur : vérifier l'accès aux fiches et au menu Analytique ; les comptes et les fiches sont comptés par rôle ou statut. Il ne s'agit pas de chiffres d'affaires.
6. Utiliser le bouton Clair/Sombre et recharger ; le choix est conservé dans le navigateur. Tester les interfaces sur petit et grand écran.
7. Se déconnecter : `/api/me` doit répondre 401. L'accès direct à `/api/analytics` avec un compte networker doit répondre 403.
8. Arrêter et redémarrer Compose sans supprimer le volume : les comptes et les fiches restent présents.

## Vérifications automatiques

```sh
npm ci --legacy-peer-deps
npm test
npm run typecheck
npm run build
```

Les tests d'API utilisent PostgreSQL simulé en mémoire (`pg-mem`) : ils couvrent connexion, déconnexion, rôles, isolation des fiches et accès analytique. Ils ne remplacent pas un test sur PostgreSQL réel ni une recette de sécurité complète.

## Migration de l'ancien prototype navigateur

Les anciennes fiches `localStorage` ne sont pas automatiquement transférées dans PostgreSQL. L'ancien stockage sous la clé `rmm-local-workspace-v1` reste dans le navigateur ; conservez-en une copie avant de l'effacer. L'import/export JSON de l'ancien prototype n'est pas disponible dans la nouvelle interface ; migration manuelle ou script à développer.

## Diagnostic

- Si la connexion échoue, vérifier les logs `docker compose logs api db` ; l'initialisation exige un mot de passe d'au moins 12 caractères et une base vide pour créer le compte initial.
- Si le port 8080 est occupé, changer le port hôte dans `compose.yaml` puis redémarrer.
- Les pages publiques restent des maquettes ; les données PostgreSQL ne remplissent pas automatiquement la boutique.


## Tester les espaces métiers

1. Connectez-vous avec le superadministrateur configuré dans `.env`. Dans **Utilisateurs**, créez séparément un compte « présentateur » et un compte « networker » avec leurs propres adresses et mots de passe. Aucun compte de démonstration ni mot de passe fixe n'est créé automatiquement.
2. Connectez-vous en networker : créez un prospect (téléphone et centre d'intérêt obligatoires), puis une demande de rendez-vous avec son sujet et son type. La date saisie est une préférence.
3. En administrateur, ouvrez le rendez-vous, affectez le présentateur et fixez son statut et sa date. Le participant est actuellement un nom libre, pas un lien vers le prospect.
4. Connectez-vous en présentateur : il voit les rendez-vous qui lui sont affectés et les ressources/formations partagées, en lecture seule. Un autre présentateur ne voit pas ce rendez-vous.
5. Les anciens enregistrements sont conservés lors du démarrage de l'API ; les nouveaux champs restent vides jusqu'à modification. Sauvegardez le volume PostgreSQL avant toute mise à jour. Les tests automatisés utilisent pg-mem et ne remplacent pas un test sur PostgreSQL réel.

Un networker ne peut pas confirmer lui-même une demande ni modifier une séance confirmée ; l'administration renseigne le compte rendu et les changements ultérieurs. Le suivi de présence structuré, les notifications et la gestion des disponibilités restent à développer.

### Agenda des rendez-vous

Dans **Rendez-vous**, naviguez entre les semaines avec les flèches ou revenez à la semaine courante. La grille affiche les séances dans leur créneau horaire, avec leur heure exacte et leur statut ; les fiches datées sans heure figurent sur la ligne « Sans heure ». L'agenda montre toutes les demandes et séances non annulées accessibles au compte connecté ; une demande n'est pas une réservation confirmée. Les fiches sans date et les rendez-vous annulés restent consultables dans la liste mais n'apparaissent pas sur l'agenda. Les dates sont affichées telles qu'elles ont été saisies, sans conversion de fuseau horaire. L'agenda ne détecte pas les conflits et ne gère pas les disponibilités.
