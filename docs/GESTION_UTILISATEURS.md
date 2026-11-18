# Gestion des utilisateurs — préproduction

Le superadministrateur peut modifier le nom, l'e-mail et le rôle des comptes. L'administrateur peut gérer uniquement les comptes présentateur, comme pour leur création. La désactivation bloque la connexion sans supprimer les comptes, fiches, commandes ou historiques ; la réactivation est possible. La désactivation ou la rétrogradation d'un superadministrateur est interdite par sécurité. Le mot de passe n'est pas modifiable depuis cet écran.

Toute modification invalide les sessions précédentes du compte, y compris après réactivation. Une migration additive crée `users.is_active`, `users.auth_version` et `sessions.auth_version` avec des valeurs par défaut compatibles avec les comptes et sessions existants. Les e-mails restent uniques, y compris pour les comptes désactivés. Le choix des rôles peut modifier les droits d'accès aux données existantes ; il ne transfère pas les fiches.

Limites : les anciennes listes et sélecteurs liés peuvent encore afficher un compte désactivé pour préserver les noms historiques ; l'exclusion systématique des nouvelles affectations reste à réaliser. Pas de journal d'audit de ces changements ni d'outil de réinitialisation du mot de passe. Tests exécutés avec pg-mem ; migration, concurrence et sessions restent à vérifier sur PostgreSQL réel et dans un navigateur connecté. Aucun déploiement production.
