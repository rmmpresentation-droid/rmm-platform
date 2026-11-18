# ADR 004 — Suivi comptable interne en préproduction

## Décision

Le périmètre validé est un **suivi interne**, pas une comptabilité réglementaire tunisienne. Administrateurs et superadministrateurs peuvent saisir manuellement une facture client, une facture fournisseur ou une charge, puis des règlements partiels ou totaux ; les montants sont enregistrés en millimes entiers et les dates en ISO. Chaque saisie est indépendante des commandes et du stock : aucune facture ou écriture n'est créée automatiquement. Ne pas enregistrer deux fois une charge et sa facture fournisseur. Aucun service, abonnement ou dépendance supplémentaire n'est utilisé.

L'écran fournit des filtres, indicateurs sur les documents filtrés, exports CSV séparés et historique des règlements. Les montants facturés, encaissés et décaissés sont distincts : il ne s'agit ni d'un bénéfice ni d'un solde bancaire. L'annulation conserve le document ; les modifications et annulations conservent une version précédente. Un document ayant un règlement est verrouillé, et les règlements sont immuables dans ce prototype. Pas de suppression, compensation ni correction automatisée : en cas d'erreur sur un règlement, ne pas utiliser pour l'exploitation.

## Sécurité et limites

L'API est réservée aux administrateurs ; les mutations sont interdites en production. Les règlements sont contrôlés contre le solde sous verrou SQL ; concurrence, rollback et migrations restent à tester sur PostgreSQL réel (pg-mem ne les prouve pas). Pas de pièce jointe, numérotation légale, taxe/TVA, comptabilité en partie double, rapprochement bancaire, devises multiples, paiements en ligne ou déclaration fiscale. Les règles fiscales, le plan comptable, les mentions de factures et les périodes doivent être validés par un professionnel tunisien avant tout usage légal.

Les tables `accounting_documents`, `accounting_payments` et `accounting_document_history` ne sont **pas incluses** dans l'ancien mécanisme de sauvegarde applicatif ; sauvegarde/restauration complète non vérifiée. Ne pas utiliser de données réelles. Le parcours connecté et le rendu mobile restent à tester dans un navigateur. Aucun déploiement sans GO PROD.
