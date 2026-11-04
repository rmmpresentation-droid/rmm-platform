# Périmètre et architecture

## Fonctionnalités présentes

- Interface issue de la template React/TanStack Start, avec thèmes clair et sombre mémorisés par navigateur.
- API Express + PostgreSQL. Initialisation de la base et d'un superadministrateur depuis `.env` lorsque la table utilisateurs est vide. Mots de passe hachés avec bcrypt ; session opaque conservée en base et cookie HttpOnly SameSite=Lax ; déconnexion et expiration après 12 heures.
- Le superadministrateur peut créer des comptes superadmin, admin, présentateur et networker. Chaque rôle reçoit son tableau de bord et ses sections autorisées. Les admins voient les fiches de tous ; présentateurs et networkers voient leurs propres fiches, avec lecture partagée des formations et ressources. Les champs « responsable » restent du texte libre, pas une affectation réelle.
- Création, modification, suppression et statuts de fiches génériques. Interface analytique réservée aux admins : nombre de fiches par statut et de comptes par rôle.
- Docker Compose avec PostgreSQL persistant, API et serveur web. Aucun CI/CD ni déploiement n'est configuré.

## Limites importantes

Ce n'est pas une application de production : pas de TLS, de récupération/changement de mot de passe, de révocation administrative, d'audit, de MFA ni d'administration complète des utilisateurs. Les tentatives de connexion sont limitées en mémoire par processus. Les cookies et identifiants PostgreSQL sont configurés pour le développement local uniquement. Pas de sauvegarde automatique : le volume doit être sauvegardé séparément.

Les fiches ne sont pas des processus métier complets. Les fonctions suivantes restent à implémenter : formation Days 1–3 avec quiz et accès bloquant ; calculs de points, commissions, rangs et arbre de parrainage ; affectation des tâches et disponibilités ; calendrier avec détection de conflits et présences ; notifications Telegram et rappels ; catalogue et stocks transactionnels ; panier, factures, paiement et livraison ; analytics financières. Les règles métier, contenus et conditions juridiques restent à valider avec RMM. La boutique de la template et ses valeurs sont des exemples non vérifiés, non reliés à la base.

## Architecture

Navigateur → Vite/TanStack (port 8080) → proxy `/api` → API Express (port 3001) → PostgreSQL (5432). Le navigateur ne contacte pas directement PostgreSQL. L'API impose les rôles et la visibilité, et vérifie les données. Les données anciennes du prototype localStorage ne sont pas migrées automatiquement. Consultez le guide d'installation pour plus de détails.
