# Banque locale de titres RétroMax

`game-catalog.json` contient les libellés anglais et, lorsqu'il diffère, le libellé français de jeux vidéo déclarés dans Wikidata pour les 29 plateformes proposées par RétroMax.

- Source : [Wikidata Query Service](https://query.wikidata.org/)
- Propriété de plateforme : [P400](https://www.wikidata.org/wiki/Property:P400)
- Type : jeu vidéo ([Q7889](https://www.wikidata.org/wiki/Q7889)), y compris ses sous-classes
- Révision de la banque : `wikidata-2026-08-14`
- Licence des données structurées : [Creative Commons CC0](https://www.wikidata.org/wiki/Wikidata:Licensing)
- Contenu : 48 304 associations titre/plateforme sur 29 plateformes
- SHA-256 : `BE0E4D42B09F052D04ACCB5A4E29E76E753EDE8A87956885E93BD3FC492D11B5`

Le fichier ne contient aucune donnée de collection, aucun statut personnel et aucun code-barres. Il est chargé uniquement lors de la saisie d'un titre puis conservé dans le cache public de la PWA.

## Mise à jour

Depuis la racine du dépôt :

```powershell
npm run build:catalog
npm run check:catalog
npm test
```

Avant une nouvelle génération, mettre à jour `CATALOG_REVISION` dans `scripts/game-catalog-platforms.mjs`. Le générateur interroge chaque plateforme séparément, normalise les libellés en NFC, déduplique les titres d'une même plateforme et produit un JSON compact déterministe pour les réponses reçues.
