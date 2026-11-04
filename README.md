# RMM — application locale

Application de démonstration locale issue de la template `rmmpresentation-droid/rmm` : React, TanStack Start, API Express et PostgreSQL. Elle comprend connexion par session, rôles, fiches persistantes, tableaux de bord, analytics et thèmes clair/sombre. Aucune CI/CD ni configuration de production n'est fournie.

## Démarrage rapide avec Docker

```sh
git fetch origin
git switch arena/bdff8fd2-rmm-platform
git pull origin arena/bdff8fd2-rmm-platform
cp .env.example .env
# Modifier l'e-mail et le mot de passe initial dans .env
# Le mot de passe doit contenir au moins 12 caractères.
docker compose up --build
```

Ouvrir http://localhost:8080/dashboard et se connecter avec les identifiants définis dans `.env`. Le premier compte est créé uniquement si la base est vide. Le superadministrateur crée ensuite les autres comptes depuis « Utilisateurs ».

**[Guide détaillé d'installation et de test](docs/INSTALLATION_ET_TESTS.md)** · **[Périmètre et limites](docs/PERIMETRE.md)**

Cette application reste un prototype local, non prêt pour la production. Ne pas utiliser de données réelles ni l'exposer sur Internet. Les fiches génériques ne couvrent pas encore l'ensemble des processus métier du référentiel Notion. La boutique est une maquette non reliée aux commandes. Aucun paiement ni notification n'est envoyé.


### Espaces présentateur et networker

Le superadministrateur crée chaque compte depuis **Utilisateurs**. Le networker peut suivre ses prospects et demander un rendez-vous ; l'administration peut le confirmer et affecter un présentateur, qui retrouve la séance et les formations. Aucun compte de démonstration n'est créé automatiquement. Voir le [guide de test](docs/INSTALLATION_ET_TESTS.md#tester-les-espaces-métiers) et les [limites fonctionnelles](docs/PERIMETRE.md).
