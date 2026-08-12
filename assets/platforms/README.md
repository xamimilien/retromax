# Logos des plateformes

Ce dossier accueillera les futurs logos SVG ou PNG dont les droits d’utilisation auront été vérifiés.

Le composant `.platform-mark` affiche actuellement une abréviation de secours. Pour ajouter un logo, associer son sélecteur `data-platform-logo` à la variable CSS `--platform-logo`, par exemple :

```css
[data-platform-logo="gamecube"] {
  --platform-logo: url("assets/platforms/gamecube.svg");
}
```

Le fond, la bordure et l’abréviation restent disponibles comme repli si l’image ne charge pas.
