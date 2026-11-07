# ADR 001 — Configuration Supabase locale initiale

- Date : 7 novembre 2026
- Statut : configuration initiale uniquement ; validation phase 1 bloquée.

## Contexte

Le plan approuvé prévoit Supabase Auth et PostgreSQL avec RLS, d'abord sur un environnement local fictif. Aucun projet distant ne doit être créé ni relié à des données réelles pendant cette étape. L'environnement ne dispose ni de Docker ni de Podman.

## Décision

Initialiser `supabase/config.toml` au moyen de `npx --yes supabase@3.0.0 init`, sans ajouter de dépendance applicative et sans créer de projet distant. La configuration locale désactive les inscriptions publiques, limite les mots de passe à 12 caractères minimum, active les confirmations par courriel, n'expose pas automatiquement les nouvelles tables et désactive le seed tant qu'il n'existe pas. Les fonctionnalités vectorielles et la configuration d'API de modèle fournie dans le modèle généré ne sont pas activées. Ces paramètres doivent être vérifiés en fonctionnement, notamment le parcours d'invitation.

Le registre npm interrogé le 7 novembre 2026 indique la licence MIT et le dépôt https://github.com/supabase/cli pour la version 3.0.0 ; la date de modification du paquet indiquée par le registre est le 6 novembre 2026. Cela ne remplace pas une revue complète de sécurité ou de maintenance.

## Vérification et conséquences

`npx --yes supabase@3.0.0 --version` et `npx --yes supabase@3.0.0 init` ont réussi. `npx --yes supabase@3.0.0 start` a échoué : aucun exécutable Docker ou Podman. Aucune base, Auth, migration, politique RLS ou invitation n'a été testée. La phase 1 ne peut pas être validée sans un environnement de conteneurs fonctionnel, des tests PostgreSQL réels et un lint vert.

Aucun quota ou condition d'une offre hébergée n'a été adopté ou vérifié ici. Avant tout choix distant, consulter les pages officielles à jour et consigner la date et les conditions dans un ADR distinct. Aucun plan payant, essai ni facturation n'a été activé.
