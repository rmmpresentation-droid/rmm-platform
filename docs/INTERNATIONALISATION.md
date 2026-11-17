# Internationalisation (préproduction, en cours)

Un sélecteur FR / EN / AR est disponible dans la navigation publique et l'espace connecté, y compris la fiche prospect. La préférence est conservée dans le navigateur (`localStorage`, clé `rmm-language`) ; elle n'est pas synchronisée entre appareils. L'arabe active `dir="rtl"` sur le document après chargement. Le rendu initial est en français et les textes sans traduction restent en français.

## Inventaire et limites après la passe arabe

- Navigation, boutique et fiches produits : traductions partielles ; les noms propres restent inchangés.
- Accueil et page réseau : titres, nombreuses descriptions, questions et cartes de packs traduits. Certains contenus dynamiques de témoignages et avis restent en français. La vitrine ancienne contient des prix, témoignages et allégations non vérifiés : leur traduction ne constitue pas une validation, et elle ne doit pas être publiée avant revue.
- Demande de rendez-vous : libellés et options principales traduits ; les valeurs envoyées restent en français pour préserver les règles serveur. Certains messages d'erreur restent en français.
- Administration : navigation, nombreuses étiquettes métier, agenda, Kanban, fiche prospect, commerce et chapitres du studio partiellement traduits ; certains messages conditionnels, détails des enregistrements, messages serveur et attributs accessibles restent en français. Les données saisies par les utilisateurs ne sont pas automatiquement traduites.
- Les métadonnées restent en français. La mise en page RTL, la persistance et les parcours doivent encore être vérifiés dans un navigateur, notamment sur mobile et dans l'espace connecté. Une revue linguistique et fonctionnelle est nécessaire avant toute publication.

Les valeurs métier et données utilisateur restent inchangées : seules les chaînes d'affichage connues sont traduites. Aucun service de traduction automatique n'est utilisé.
