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

La version courante est **0.0.33**. Chaque nouvelle livraison terminée et testée incrémente le dernier nombre (`0.0.34`, `0.0.35`, etc.), met à jour le cache PWA, puis est fusionnée dans `main` et marquée par un tag Git correspondant (`v0.0.XX`).

## Guide de démarrage

Lors de la première ouverture, un guide en huit étapes explique la confidentialité de la collection, l’installation en mode app sur l’écran d’accueil de l’iPhone, la création et la configuration des fiches, le scan, les filtres, la multisélection et la sauvegarde JSON. Une fois fermé, il ne s’affiche plus automatiquement sur cet appareil. Le bouton **Aide** du menu inférieur permet de le revoir à tout moment.

L’installation iPhone suit le parcours Safari **Partager → Sur l’écran d’accueil → Ouvrir comme app web → Ajouter**, conformément au [guide Apple](https://support.apple.com/fr-fr/guide/iphone/iphea86e5236/ios). Les icônes 180, 192 et 512 px sont fournies localement afin que le raccourci utilise l’identité RétroMax.

## Banque locale de titres

Le champ **Titre** propose désormais des jeux issus d'une banque locale de **48 304 références titre/plateforme couvrant les 29 plateformes** du formulaire. La recherche fonctionne hors ligne après l'installation de la PWA, ne transmet pas la saisie et conserve toujours la possibilité d'entrer ou de corriger librement un titre. Choisir une proposition renseigne également le constructeur et la console correspondants.

La banque est générée depuis les données structurées CC0 de Wikidata. Sa provenance, son format et la procédure de mise à jour sont détaillés dans `assets/data/README.md`.

## Scan d’un jeu

Le bouton de scan ouvre la caméra arrière sur iPhone/iPad pour lire le code-barres d’une boîte. L’image reste sur l’appareil. Le numéro est d’abord recherché dans une petite banque locale versionnée, qui couvre notamment les éditions vérifiées de **Forza Horizon 3** sur Xbox One (`889842150032` / `0889842150032`) et **Need for Speed: The Run** sur PlayStation 3 (`5030931103650`). Les formes UPC-A et EAN-13 équivalentes désignent une seule entrée locale.

Si le numéro n’est pas connu localement, il est recherché dans le catalogue spécialisé LevelComplete. Comme ce catalogue n’autorise pas les appels directs d’une page web, le numéro passe au besoin par le relais CORS `corsproxy.io`, compatible avec GitHub Pages. Une image haute définition et la mise au point continue sont demandées lorsque l’iPhone les permet. La fiche préremplie reste entièrement modifiable avant son enregistrement. Une saisie manuelle du code et la création d’une fiche vide restent disponibles si la caméra ou la recherche ne répondent pas. Le lecteur ZXing 0.23.0 est embarqué localement afin que son chargement ne dépende pas d’un CDN. Les photos utilisées pour vérifier une édition ne sont ni copiées dans le dépôt ni envoyées par l’application.
