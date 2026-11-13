# Installation et tests locaux

## Prérequis et récupération

Installer Git, Docker Desktop et Docker Compose v2. La machine doit avoir accès à Internet pour télécharger les images et dépendances.

```sh
git clone https://github.com/rmmpresentation-droid/rmm-platform.git
cd rmm-platform
git switch --track origin/arena/74d803db-rmm-platform
cp .env.example .env
```

Sous Windows, copier `.env.example` vers `.env` avec l'explorateur ou `copy .env.example .env`. Modifier dans `.env` l'adresse et le mot de passe initial (`RMM_ADMIN_EMAIL`, `RMM_ADMIN_PASSWORD` ; 12 caractères minimum). Ne pas partager ni committer ce fichier. Si le mot de passe contient des caractères spéciaux, l'entourer de guillemets simples dans `.env`.

## Démarrage Docker

```sh
docker compose up --build
```

Ouvrir http://localhost:8081/dashboard. Le navigateur utilise le port 8081 ; l'API et la base ne sont pas publiées directement. PostgreSQL conserve les données dans le volume Docker `rmm_db`. Le serveur initialise les tables et le premier superadministrateur uniquement lorsque la table des utilisateurs est vide. Changer `.env` par la suite ne modifie pas un compte déjà créé.

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
npm run dev -- --host 127.0.0.1 --port 8081
```

La base et son utilisateur doivent être créés au préalable ; adapter `DATABASE_URL` à votre installation. L'API utilise le port 3001, et Vite redirige `/api` vers elle. Sous Windows, utiliser la syntaxe de variables d'environnement adaptée à votre terminal. `--legacy-peer-deps` est nécessaire aux dépendances de la template.

## Identifiants et comptes fictifs — prototype Express local

Ces commandes concernent **uniquement le prototype local**, pas Supabase. Avant toute modification, sauvegardez le volume PostgreSQL. Ne partagez jamais vos identifiants dans un message et n'utilisez pas ces comptes avec des données réelles.

Le superadministrateur défini dans `.env` est créé **une seule fois si la table `users` est vide**. Modifier `.env` ne change pas un compte existant. Un 401 sur `/api/me` avant connexion signifie seulement qu'il n'y a pas de session ; le 401 sur `/api/login` signifie que la connexion a été refusée, sans identifier la cause précise. Les 404 de favicon et le message React DevTools ne sont pas la cause de l'échec de connexion.

1. Remplissez les deux variables dans `.env`, puis actualisez le code et les services depuis la branche courante :

```sh
git pull origin arena/74d803db-rmm-platform
docker compose up -d --build
```

2. Pour examiner les comptes **sans afficher de mot de passe** :

```sh
docker compose run --rm --no-deps -e RMM_LOCAL_ACCOUNT_TOOL=1 api node server/local-accounts.mjs list
```

Si l'adresse du superadmin dans la liste correspond à `RMM_ADMIN_EMAIL`, mais que le mot de passe ne fonctionne pas, exécutez explicitement :

```sh
docker compose run --rm --no-deps -e RMM_LOCAL_ACCOUNT_TOOL=1 api node server/local-accounts.mjs reset-superadmin
```

La commande remplace le mot de passe du superadmin correspondant par celui de `.env` et **expire ses sessions existantes** ; elle ne supprime ni les fiches ni les comptes. Le mot de passe précédent ne peut être récupéré ; la sauvegarde est le moyen de revenir à l'état précédent. Si l'adresse `.env` est différente de celle du compte initial et qu'il existe exactement un superadmin, l'option explicite ci-dessous modifie également son adresse. Si plusieurs superadmins existent, ou si l'adresse est déjà attribuée, elle refuse la modification :

```sh
docker compose run --rm --no-deps -e RMM_LOCAL_ACCOUNT_TOOL=1 api node server/local-accounts.mjs reset-superadmin --replace-single-superadmin
```

3. Pour créer **à la demande** trois admins, un présentateur et trois networkers fictifs :

```sh
docker compose run --rm --no-deps -e RMM_LOCAL_ACCOUNT_TOOL=1 api node server/local-accounts.mjs create-demo
```

Les adresses sont `admin1@example.test` à `admin3@example.test`, `presentateur1@example.test` et `networker1@example.test` à `networker3@example.test`. Chaque mot de passe aléatoire est affiché **une seule fois dans votre terminal** après création ; conservez-le en lieu sûr, ne le publiez pas et ne le copiez pas dans le dépôt. Les comptes préexistants sont conservés sans changement de mot de passe ; une collision avec un rôle différent bloque l'opération. L'outil ne supprime pas les comptes supplémentaires : s'ils existent déjà, le nombre total peut dépasser le nombre demandé. Le superadmin reste celui de `.env` et n'est pas créé par `create-demo`.

Sans Docker, utilisez la même commande avec Node 22 en chargeant vos variables depuis `.env` et en définissant `DATABASE_URL` vers PostgreSQL local, par exemple `node --env-file=.env server/local-accounts.mjs list` après avoir défini `RMM_LOCAL_ACCOUNT_TOOL=1`. La commande refuse le mode production et les hôtes autres que `localhost`, `127.0.0.1`, `::1` et le service Compose `db`.

## Parcours manuels

1. Ouvrir `/dashboard` : sans session, le formulaire de connexion s'affiche. Tester un mot de passe incorrect, puis les identifiants initiaux.
2. Depuis le superadministrateur, ouvrir Utilisateurs et créer au moins un administrateur, un présentateur et deux networkers avec des mots de passe de 12 caractères minimum. Se déconnecter.
3. En administrateur, créer une tâche pour tous les networkers. Se connecter comme networker : créer un prospect et modifier son avancement ainsi que celui de la tâche. Recharger la page et vérifier leur persistance.
4. Se connecter comme deuxième networker : vérifier que les prospects du premier ne sont pas visibles. Le présentateur voit ses rendez-vous affectés et les formations ; les ressources sont désactivées.
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
- Si le port 8081 est occupé, changer le port hôte dans `compose.yaml` puis redémarrer.
- Les pages publiques restent des maquettes ; les données PostgreSQL ne remplissent pas automatiquement la boutique.


## Tester les espaces métiers

1. Connectez-vous avec le superadministrateur configuré dans `.env`. Dans **Utilisateurs**, créez séparément un compte « présentateur » et un compte « networker » avec leurs propres adresses et mots de passe. Aucun compte de démonstration n'est créé automatiquement ; l’outil local ci-dessous peut en créer à la demande.
2. Connectez-vous en networker : créez un prospect (téléphone et centre d'intérêt obligatoires), puis une demande de rendez-vous avec son sujet et son type. La date saisie est une préférence.
3. En administrateur, ouvrez le rendez-vous, choisissez l'admin participant et, si nécessaire, affectez un présentateur, puis confirmez-le. Un rendez-vous de prospection est lié à une fiche prospect.
4. Connectez-vous en présentateur : il voit les rendez-vous qui lui sont affectés et les formations. Un autre présentateur ne voit pas ce rendez-vous.
5. Les anciens enregistrements sont conservés lors du démarrage de l'API ; les nouveaux champs restent vides jusqu'à modification. Sauvegardez le volume PostgreSQL avant toute mise à jour. Les tests automatisés utilisent pg-mem et ne remplacent pas un test sur PostgreSQL réel.

Un networker ne peut pas confirmer lui-même une demande ni modifier une séance confirmée. Après passage au statut réalisé, les participants affectés peuvent ajouter leur compte rendu. Les notifications restent à développer.

### Agenda des rendez-vous

Dans **Rendez-vous**, naviguez entre les semaines avec les flèches ou revenez à la semaine courante. Le planning affiche les séances de 08:00 à 22:00 inclus, avec leur heure exacte et leur statut. Les fiches datées sans heure ou hors de cette plage figurent séparément sous le planning. L'agenda montre toutes les demandes et séances non annulées accessibles au compte connecté ; une demande n'est pas une réservation confirmée. Les fiches sans date et les rendez-vous annulés restent consultables dans la liste mais n'apparaissent pas sur l'agenda. Les dates sont affichées telles qu'elles ont été saisies, sans conversion de fuseau horaire. L'agenda indique aux networkers les créneaux confirmés des autres sans leurs détails. Les confirmations font l'objet d'un contrôle applicatif de chevauchement, sans garantie contre des écritures simultanées.

## Parcours métiers (version locale)

- **Prospects** : un networker crée ses propres fiches ; un administrateur sélectionne le membre existant qui a pris contact. Le statut permet d'indiquer la présentation, le closing en cours ou son issue. Les graphiques comptent l'étape actuelle des fiches visibles, sans historique de conversion. Les anciennes fiches sans contact lié restent visibles par leur créateur ; un administrateur peut les affecter en les modifiant.
- **Tâches** : l'administration choisit un groupe ou une personne ; les groupes incluent les comptes correspondants actuels et futurs. Chaque destinataire met à jour son propre avancement. Pour changer les destinataires d'une tâche déjà affectée, créez une nouvelle tâche. Les anciennes tâches restent visibles mais ne bénéficient pas automatiquement du suivi individuel.
- **Rendez-vous** : sélectionner catégorie, type, début et fin le même jour ; l'administration indique un networker et un administrateur participant avant confirmation. Les rendez-vous confirmés bloquent globalement le créneau pour les nouvelles confirmations. Les networkers voient leurs rendez-vous et, sans détails, les créneaux confirmés des autres. L'administration marque la séance réalisée ; les participants affectés peuvent alors enregistrer leur propre compte rendu. Les anciens rendez-vous sans heure de fin ne bloquent pas l'agenda et doivent être complétés manuellement. Cette vérification n'est pas une garantie transactionnelle contre des confirmations simultanées.
- **Networkers et formations** : la fiche d'un compte networker réunit prospects, tâches, présences et notes saisies manuellement. L'administration peut renseigner le parrain et voir les filleuls directs. Après avoir marqué une formation terminée, un admin ou le présentateur affecté renseigne les présences ; seul un admin saisit la note. Un admin peut créer un présentateur dans Utilisateurs. Aucun quiz automatique n'est exécuté.
- **Commandes et catalogue** : créez d'abord une fiche de type pack dans Produits et stock ; choisissez-la ensuite dans une commande, avec l'acheteur, la méthode de paiement et le compte ayant passé la commande. Produits, packs et options sont distingués par type ; l'image est un lien HTTP(S), pas un téléchargement de fichier. Les compositions et l'acheteur sont du texte libre ; aucun paiement ni mouvement de stock automatique n'est effectué.
- **Ressources** : l'interface et l'accès API de cette section sont désactivés, mais ses anciennes fiches sont conservées en base.

Sauvegardez le volume PostgreSQL avant la mise à jour : le démarrage applique des modifications additives au schéma. Les tests automatisés utilisent pg-mem et ne remplacent pas un test sur PostgreSQL réel ou Docker.

### Notes des prospects

Chaque fiche prospect permet d'ajouter des notes de suivi datées avec leur auteur. Elles sont enregistrées dans la table PostgreSQL `prospect_notes`, créée automatiquement au démarrage de l'API. Les administrateurs et le networker ayant accès à la fiche peuvent les consulter et en ajouter. Les notes existantes du champ « Notes et résultat de prospection » restent inchangées ; elles ne sont pas transférées automatiquement dans l'historique.

Par précaution, un prospect possédant des notes ne peut pas être supprimé depuis l'application. Il n'existe pas encore d'interface de modification ou de suppression des notes. Inclure la table `prospect_notes` dans les sauvegardes de la base, en plus des autres tables. Redémarrer l'API après mise à jour pour créer la table ; aucune donnée existante n'est effacée.

Les nouveaux prospects sont créés sans étape de prospection (« Non commencé »). Le Kanban permet de changer de phase depuis la vue Prospects ou la fiche individuelle ; les modifications et la suppression autorisée restent dans la fiche, accessible via « Voir la fiche ». Les statuts des prospects déjà enregistrés ne sont pas modifiés.

### Kanban de prospection

Dans Prospects, basculez entre « Liste des prospects » et « Suivi de prospection ». Dans la vue de suivi et dans chaque fiche, le Kanban présente les phases « Non commencé », « Premier contact », « Prise de rendez-vous », « Présentation », « Closing », « Rejoint » et « Ne rejoint pas ». Déplacez la fiche par glisser-déposer ou avec le sélecteur « Déplacer vers » et le bouton « Déplacer ». Les deux issues demandent respectivement le type de participation ou un motif de refus. Les phases restent modifiables librement ; elles ne créent pas automatiquement de compte networker ou de rendez-vous.

L'ancien statut « Présentation », qui regroupait deux phases, reste inchangé et apparaît dans « Présentation historique » jusqu'à repositionnement manuel. Les anciennes fiches « Sans commande » sans motif restent consultables et modifiables ; un nouveau refus exige un motif. Aucun historique automatique des changements de phase n'est encore enregistré.

### Navigation de l’espace de travail

Les sections accessibles selon le rôle sont dans la barre latérale gauche. Sur petit écran, ouvrez ou fermez la navigation avec le bouton menu dans l’en-tête ; choisir une section referme le menu.

### Demandes de rendez-vous (préproduction locale)

L'espace **Rendez-vous** comporte deux vues : « Demandes » (statuts Demandé et Proposé) et « Planning et rendez-vous » (autres statuts et agenda). Un networker peut créer une demande interne de type **Prospection** (Premier contact, Présentation, Closing) ou **Réseau** (Suivi, Demande du networker). Pour une prospection interne, il choisit un prospect auquel il a accès. L'administration traite la demande, ajuste le créneau, affecte l'administrateur participant et confirme ; le présentateur peut être affecté si nécessaire. Les préférences ne constituent pas une réservation.

Le formulaire `/demande-rendez-vous` est **désactivé par défaut** et n’accepte les envois que si `NODE_ENV` vaut explicitement `development` ou `test` ; il reste interdit en production. Pour un lancement de l’API hors Docker, définir `NODE_ENV=development` localement avant son démarrage. Pour un test local avec données fictives uniquement :

1. Démarrer l'application et créer ou identifier l'administrateur local responsable. Pour afficher les identifiants des comptes locaux avec Docker :
   ```bash
   docker compose exec db psql -U rmm -d rmm -c "SELECT id, name, role FROM users WHERE role IN ('admin','superadmin');"
   ```
2. Ajouter dans le fichier local ignoré `.env` `RMM_PUBLIC_REQUEST_ADMIN_ID=<UUID de l'administrateur local choisi>` puis redémarrer/recréer le service API (`docker compose up -d --build`). Ne pas committer `.env`.
3. Sur `/demande-rendez-vous`, saisir un nom, téléphone et e-mail fictifs, choisir un type de prospection et un début et une fin souhaités. Un prospect et une demande sont créés ensemble, affectés à l'administrateur désigné. Aucun compte ou rendez-vous confirmé n'est créé. Aucun e-mail ni notification n'est envoyé.
4. En administrateur, ouvrir Rendez-vous → Demandes → Traiter, ajuster si nécessaire, affecter l'administrateur participant puis confirmer. Les demandes du site sont identifiées et liées à la fiche prospect.

Chaque envoi crée un nouveau prospect, sans détection des doublons. Le formulaire est limité en mémoire à cinq tentatives par minute et par adresse IP ; ce dispositif local ne suffit pas pour une exposition publique. Aucun historique de consentement complet, politique de confidentialité, procédure de conservation/suppression ou protection anti-abus de production n'est en place : validation juridique et sécurité indispensables avant toute mise en ligne. Les données de test ne doivent pas être des données réelles. Le contrôle actuel de conflit reste global et applicatif, non transactionnel, et ne démontre pas l'exclusion par ressource prévue dans la cible Supabase. Les tests utilisent pg-mem ; le comportement transactionnel PostgreSQL réel reste à vérifier.

### Catalogue issu des documents produits

La boutique locale et la rubrique administrative « Produits et stock » affichent 11 références dans `src/lib/product-catalogue.ts`. Le nom de chaque référence correspond au nom du fichier PDF sans son extension, selon la consigne. Les visuels sont des recadrages de ces brochures dans `public/products/`. Les descriptions factuelles et quelques ingrédients mentionnés proviennent des brochures ; ils ne remplacent pas les étiquettes ou les compositions complètes validées. Aucun prix, quantité de stock ou bénéfice non validé n'a été importé.

La liste administrative est en lecture seule et distincte des fiches de stock persistées ; elle ne crée ni inventaire ni articles de commande. Les données existantes ne sont pas modifiées. Les brochures contiennent des allégations non validées ; elles ne sont pas publiées. Les autres pages de la vitrine contiennent encore des informations anciennes non validées : ne pas publier en production.

Démonstration locale : ouvrir `/boutique`, une fiche produit puis l'espace administrateur, rubrique « Produits et stock ». Vérifier les visuels, descriptions et l’absence de prix. Les caractéristiques, images et usages doivent être vérifiés avant publication.
