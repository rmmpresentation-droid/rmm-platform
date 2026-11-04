# RMM — prototype local

Prototype local basé sur la template `rmmpresentation-droid/rmm` (React, TanStack Start et Vite). Son objectif est de faciliter les essais avant la réalisation complète du projet RMM. Aucun pipeline CI/CD ni déploiement n'est configuré.

## Démarrage rapide

Avec Docker et Docker Compose :

```sh
docker compose up --build
```

Puis ouvrir http://localhost:8080. Sans Docker : `npm ci --legacy-peer-deps` puis `npm run dev -- --host 127.0.0.1 --port 8080`.

**[Guide complet d'installation et de tests](docs/INSTALLATION_ET_TESTS.md)** · **[Périmètre, architecture et travaux restants](docs/PERIMETRE.md)**

## Avertissement

Il s'agit d'un prototype incomplet, pas d'une application exploitable en entreprise. Les données sont dans le navigateur, non chiffrées et non partagées. Le sélecteur de rôle n'est pas une authentification ; n'utilisez aucune donnée réelle. La boutique et certaines actions de la template sont des maquettes. Aucun paiement ni notification n'est envoyé. Les informations et allégations de la template sont à vérifier avant toute utilisation.
