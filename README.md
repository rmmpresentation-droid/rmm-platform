# RMM — application locale

Application de démonstration locale issue de la template `rmmpresentation-droid/rmm` : React, TanStack Start, API Express et PostgreSQL. Elle comprend connexion par session, rôles, fiches persistantes, tableaux de bord, analytics et thèmes clair/sombre. Aucune CI/CD ni configuration de production n'est fournie.

## Démarrage rapide avec Docker

```sh
git fetch origin
git switch arena/74d803db-rmm-platform
git pull origin arena/74d803db-rmm-platform
cp .env.example .env
# Modifier l'e-mail et le mot de passe initial dans .env
# Le mot de passe doit contenir au moins 12 caractères.
docker compose up --build
```

Ouvrir http://localhost:8081/dashboard et se connecter avec les identifiants définis dans `.env`. Le premier compte est créé uniquement si la base est vide. Le superadministrateur crée ensuite les autres comptes depuis « Utilisateurs ».

**[Guide détaillé d'installation et de test](docs/INSTALLATION_ET_TESTS.md)** · **[Périmètre et limites](docs/PERIMETRE.md)**

Cette application reste un prototype local, non prêt pour la production. Ne pas utiliser de données réelles ni l'exposer sur Internet. Les fiches génériques ne couvrent pas encore l'ensemble des processus métier du référentiel Notion. La boutique est une maquette non reliée aux commandes. Aucun paiement ni notification n'est envoyé.


### Espaces présentateur et networker

Le superadministrateur crée chaque compte depuis **Utilisateurs**. Le networker peut suivre ses prospects et demander un rendez-vous ; l'administration peut le confirmer et affecter un présentateur, qui retrouve la séance et les formations. Aucun compte de démonstration n'est créé automatiquement. Voir le [guide de test](docs/INSTALLATION_ET_TESTS.md#tester-les-espaces-métiers) et les [limites fonctionnelles](docs/PERIMETRE.md).

En cas de refus de connexion après modification de `.env`, voir [Identifiants et comptes fictifs](docs/INSTALLATION_ET_TESTS.md#identifiants-et-comptes-fictifs--prototype-express-local) : le premier compte n’est initialisé que sur une base vide.

## Refonte de la vitrine — première étape locale

La nouvelle direction ivoire, bordeaux et champagne concerne l'accueil `/`, le catalogue `/produits` et la fiche `/produits/3s-capsule` (ainsi que les autres références). La navigation et le pied de page sont partagés. Les anciennes URL `/boutique` et `/produit/$id` restent disponibles ; `/networker` redirige vers la section opportunité de l'accueil car son ancien contenu comprenait des chiffres, avantages et promesses non validés. Cette redirection est réversible dans Git. L'espace interne `/dashboard` est conservé.

Les données d'affichage de la nouvelle collection sont typées dans `src/data/products.ts` et s'appuient sur la source existante `src/lib/product-catalogue.json`, également utilisée par le stock. Les prix sont absents, les bénéfices et les modes d'emploi restent non publiés en attente de validation. Les images sont issues des documents transmis ou de l'image 3S fournie ; l'image de linge et de pierre est une illustration générée. Les polices de cette étape sont locales : voir `docs/ADR/002-polices-vitrine.md`.

### À compléter avant toute publication

- Traductions anglaises et arabes, sélecteur de langue, RTL et polices arabes : non implémentés ; `react-i18next` n'est pas installé dans le dépôt actuel.
- Pages dédiées rituels, accompagnement, opportunité, communauté, journal, à-propos, règlement et contact ; six articles du journal ; sitemap et Open Graph complets.
- Numéro WhatsApp, adresse e-mail et réseaux vérifiés ; newsletter non connectée. Le formulaire de rendez-vous existant est désactivé par défaut et interdit en production.
- Prix, formats, teintes, caractéristiques, usages, précautions, compositions INCI, visuels officiels, témoignages autorisés, conditions de livraison, plan marketing et statut de partenariat : à confirmer par l'entreprise et à soumettre à la revue juridique nécessaire. Les données de la brochure ne prouvent pas les effets annoncés.
- Accessibilité réelle, tests navigateur mobile/desktop et mesures Lighthouse : non vérifiés. Le lint global échoue encore sur du code préexistant. Aucun déploiement ni usage de données réelles sans « GO PROD ».
