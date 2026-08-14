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

La version courante est **0.0.26**. Chaque nouvelle livraison terminée et testée incrémente le dernier nombre (`0.0.27`, `0.0.28`, etc.), met à jour le cache PWA, puis est fusionnée dans `main` et marquée par un tag Git correspondant (`v0.0.XX`).

## Banque locale de titres

Le champ **Titre** propose désormais des jeux issus d'une banque locale de **48 304 références titre/plateforme couvrant les 29 plateformes** du formulaire. La recherche fonctionne hors ligne après l'installation de la PWA, ne transmet pas la saisie et conserve toujours la possibilité d'entrer ou de corriger librement un titre. Choisir une proposition renseigne également le constructeur et la console correspondants.

La banque est générée depuis les données structurées CC0 de Wikidata. Sa provenance, son format et la procédure de mise à jour sont détaillés dans `assets/data/README.md`.

## Scan d’un jeu

Le bouton de scan ouvre la caméra arrière sur iPhone/iPad pour lire le code-barres d’une boîte. L’image reste sur l’appareil : seul le numéro du code-barres est utilisé pour rechercher le titre, la console et la région dans le catalogue spécialisé LevelComplete. La recherche interroge automatiquement les formes UPC-A et EAN-13 équivalentes, notamment utilisées sur les jeux Xbox One. Une image haute définition et la mise au point continue sont demandées lorsque l’iPhone les permet. La fiche préremplie reste entièrement modifiable avant son enregistrement. Une saisie manuelle du code et la création d’une fiche vide restent disponibles si la caméra ou la recherche ne répondent pas. Le lecteur ZXing 0.23.0 est embarqué localement afin que son chargement ne dépende pas d’un CDN.
