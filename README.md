# RétroMax

Application web/PWA personnelle pour gérer une collection de jeux vidéo.

## Confidentialité

Le dépôt ne contient aucune donnée de collection. Les jeux importés sont enregistrés uniquement dans le stockage local du navigateur (`localStorage`) de l'appareil.

Utiliser le bouton **Importer** pour charger une sauvegarde JSON privée, puis **Sauvegarde** pour exporter régulièrement une copie vers Fichiers/iCloud Drive.

## Identité des consoles

Les couleurs et logos sont centralisés dans `PLATFORM_THEMES` (`app.js`). Chaque badge utilise un SVG local lorsque celui-ci est disponible, avec une abréviation de secours pour les autres plateformes.

Le formulaire d'ajout s'appuie sur `CONSOLE_CATALOG` : les principales consoles Sony, Nintendo, Sega et Microsoft restent proposées même lorsqu'aucun jeu de cette plateforme n'est encore présent dans la collection locale.

Les fichiers et leurs attributions sont documentés dans `assets/platforms/README.md`. Les logos servent uniquement à identifier les plateformes et restent des marques de leurs propriétaires respectifs.

## Versions

La version courante est **0.0.17**. Chaque nouvelle livraison terminée et testée incrémente le dernier nombre (`0.0.18`, `0.0.19`, etc.), met à jour le cache PWA, puis est fusionnée dans `main` et marquée par un tag Git correspondant (`v0.0.XX`).

## Scan d’un jeu

Le bouton de scan ouvre la caméra arrière sur iPhone/iPad pour lire le code-barres d’une boîte. L’image reste sur l’appareil : seul le numéro du code-barres est utilisé pour rechercher le titre, la console et la région dans le catalogue spécialisé LevelComplete, via le relais CORS corsproxy.io requis par cette PWA statique. La fiche préremplie reste entièrement modifiable avant son enregistrement. Une saisie manuelle du code et la création d’une fiche vide restent disponibles si la caméra ou la recherche ne répondent pas.
