# RétroMax

Application web/PWA personnelle pour gérer une collection de jeux vidéo.

## Confidentialité

Le dépôt ne contient aucune donnée de collection. Les jeux importés sont enregistrés uniquement dans le stockage local du navigateur (`localStorage`) de l'appareil.

Utiliser le bouton **Importer** pour charger une sauvegarde JSON privée, puis **Sauvegarde** pour exporter régulièrement une copie vers Fichiers/iCloud Drive.

## Identité des consoles

Les couleurs et logos sont centralisés dans `PLATFORM_THEMES` (`app.js`). Chaque badge utilise un SVG local lorsque celui-ci est disponible, avec une abréviation de secours pour les autres plateformes.

Les fichiers et leurs attributions sont documentés dans `assets/platforms/README.md`. Les logos servent uniquement à identifier les plateformes et restent des marques de leurs propriétaires respectifs.

## Versions

La version courante est **0.0.07**. Chaque nouvelle livraison terminée et testée incrémente le dernier nombre (`0.0.08`, `0.0.09`, etc.), met à jour le cache PWA, puis est fusionnée dans `main` et marquée par un tag Git correspondant (`v0.0.XX`).
