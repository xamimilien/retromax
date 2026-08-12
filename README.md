# RétroMax

Application web/PWA personnelle pour gérer une collection de jeux vidéo.

## Confidentialité

Le dépôt ne contient aucune donnée de collection. Les jeux importés sont enregistrés uniquement dans le stockage local du navigateur (`localStorage`) de l'appareil.

Utiliser le bouton **Importer** pour charger une sauvegarde JSON privée, puis **Sauvegarde** pour exporter régulièrement une copie vers Fichiers/iCloud Drive.

## Identité des consoles

Les couleurs et badges de remplacement sont centralisés dans `PLATFORM_THEMES` (`app.js`). Chaque badge expose aussi un attribut `data-platform-logo` et la variable CSS `--platform-logo` : de futurs logos locaux pourront donc remplacer les initiales sans modifier les cartes ni les données de collection.

Les futurs fichiers graphiques devront être ajoutés dans `assets/platforms/`, après vérification de leurs droits d’utilisation. Aucun logo tiers n’est actuellement inclus.

## Versions

La version courante est **0.0.02**. Chaque nouvelle livraison terminée et testée incrémente le dernier nombre (`0.0.03`, `0.0.04`, etc.), met à jour le cache PWA, puis est fusionnée dans `main` et marquée par un tag Git correspondant (`v0.0.XX`).
