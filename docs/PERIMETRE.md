# Périmètre et architecture

## Fonctionnalités présentes

- Interface locale React/TanStack, thèmes clair et sombre ; API Express et PostgreSQL ; authentification par mot de passe haché et sessions en base. Le superadministrateur crée les comptes et les admins peuvent aussi créer des présentateurs.
- Prospects : étapes et issues du closing, coordonnées et emplacement, membre ayant pris contact lié à un compte, indicateurs et répartition visuelle par étape actuelle. Les admins voient tous les prospects, les networkers les leurs.
- Tâches créées par l'administration pour tous les admins, tous les networkers ou un destinataire spécifique. Le statut est individuel pour les tâches affectées ; les groupes incluent les utilisateurs futurs.
- Rendez-vous de prospection ou networker, type conditionnel, début et fin, networker et administrateur participant ; compte rendu personnel après passage au statut réalisé. L'agenda réseau montre les rendez-vous personnels et les créneaux confirmés des autres sans informations privées. Les admins voient toutes les séances. Un présentateur voit les séances qui lui sont affectées.
- Fiche networker liée à son compte : prospects, tâches, formations, présence, note manuelle et réseau direct (parrain et filleuls). Formation avec présentateur affecté et présences saisies en fin de séance.
- Commandes liées à un pack existant et à un compte ayant passé commande, acheteur et mode de paiement saisis ; fiches produit, pack et option distinguées, image par URL. Les ressources sont désactivées sans effacer les anciennes données.
- Docker Compose local ; aucune CI/CD ni mise en production.

## Limites importantes

Ce n'est pas une application de production : pas de TLS, récupération/changement de mot de passe, audit, MFA ni administration complète des utilisateurs. Les cookies et identifiants PostgreSQL sont configurés pour le développement local uniquement. Pas de sauvegarde automatique.

Les créneaux confirmés sont considérés comme une ressource globale. Le contrôle de chevauchement est applicatif et non transactionnel : deux confirmations simultanées peuvent entrer en conflit ; les anciens rendez-vous sans fin ne bloquent pas. Un rendez-vous est considéré terminé lorsque l'administration passe son statut à « Réalisé », sans vérification automatique de l'heure ou de la présence effective. Les demandes ne bloquent pas les créneaux. Aucune notification ni synchronisation avec un calendrier externe.

Les données anciennes ne sont pas automatiquement enrichies des nouveaux liens. La note de quiz est saisie manuellement, sans quiz automatique, barème ni blocage d'accès. Le réseau affiché est limité aux relations directes ; pas de calcul des rangs, points ou commissions. L'image produit est une URL, pas un fichier téléversé ; la composition des packs et l'acheteur sont en texte libre. Aucun paiement, mouvement de stock, facture ou livraison automatisé ; la boutique de la template n'est pas reliée à la base. Les contenus et règles métier restent à valider avec RMM.

## Architecture

Navigateur → Vite/TanStack (port 8080) → proxy `/api` → API Express (port 3001) → PostgreSQL (5432). Les évolutions du schéma sont additives ; sauvegardez le volume avant mise à jour. Les anciennes fiches du prototype localStorage ne sont pas migrées automatiquement. Les tests API utilisent pg-mem, pas un PostgreSQL réel. Voir le guide d'installation.
