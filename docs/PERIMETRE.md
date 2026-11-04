# Périmètre et architecture

## Fonctionnalités présentes

- Interface issue de la template React/TanStack Start, avec thèmes clair et sombre mémorisés par navigateur.
- API Express + PostgreSQL. Initialisation de la base et d'un superadministrateur depuis `.env` lorsque la table utilisateurs est vide. Mots de passe hachés avec bcrypt ; session opaque conservée en base et cookie HttpOnly SameSite=Lax ; déconnexion et expiration après 12 heures.
- Le superadministrateur peut créer des comptes superadmin, admin, présentateur et networker. Chaque rôle reçoit son tableau de bord et ses sections autorisées. Les admins voient toutes les fiches. Les networkers voient leurs propres fiches et les ressources/formations partagées. Les présentateurs voient les ressources/formations partagées et les rendez-vous que l'administration leur affecte. Le champ « responsable » reste indicatif et ne donne aucun droit.
- Formulaires adaptés : coordonnées et intérêt des prospects ; type, participant, lieu et compte rendu des rendez-vous ; catégorie et lien des supports ; champs dédiés pour les autres sections. Le networker demande ou annule un rendez-vous non confirmé ; l'administration le propose/confirme et peut affecter un présentateur. Les prospects et rendez-vous ne sont supprimables que par un administrateur. La date et les participants sont indicatifs, sans gestion de disponibilité ni liaison à une fiche prospect. Les anciens enregistrements restent disponibles : leurs nouveaux champs sont vides tant qu'ils ne sont pas renseignés.
- Création, modification et statuts de fiches. Interface analytique réservée aux admins : nombre de fiches par statut et de comptes par rôle.
- Docker Compose avec PostgreSQL persistant, API et serveur web. Aucun CI/CD ni déploiement n'est configuré.

## Limites importantes

Ce n'est pas une application de production : pas de TLS, de récupération/changement de mot de passe, de révocation administrative, d'audit, de MFA ni d'administration complète des utilisateurs. Les tentatives de connexion sont limitées en mémoire par processus. Les cookies et identifiants PostgreSQL sont configurés pour le développement local uniquement. Pas de sauvegarde automatique : le volume doit être sauvegardé séparément.

Les fiches ne sont pas des processus métier complets. Les fonctions suivantes restent à implémenter : formation Days 1–3 avec quiz et accès bloquant ; calculs de points, commissions, rangs et arbre de parrainage ; affectation des tâches et disponibilités ; liaison des prospects et des participants à des comptes/fiches ; calendrier avec détection de conflits et suivi structuré des présences ; notifications Telegram et rappels ; catalogue et stocks transactionnels ; panier, factures, paiement et livraison ; analytics financières. Les règles métier, contenus et conditions juridiques restent à valider avec RMM. La boutique de la template et ses valeurs sont des exemples non vérifiés, non reliés à la base.

## Architecture

Navigateur → Vite/TanStack (port 8080) → proxy `/api` → API Express (port 3001) → PostgreSQL (5432). Le navigateur ne contacte pas directement PostgreSQL. L'API impose les rôles et la visibilité, et vérifie les données. Les données anciennes du prototype localStorage ne sont pas migrées automatiquement. Consultez le guide d'installation pour plus de détails.
