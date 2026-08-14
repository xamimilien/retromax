import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_PLATFORMS, CATALOG_REVISION, WIKIDATA_ENDPOINT } from './game-catalog-platforms.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = resolve(ROOT, 'assets/data/game-catalog.json');
const raw = await readFile(PATH, 'utf8');
const data = JSON.parse(raw);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

if (data.schema !== 1) throw new Error('Schéma de catalogue invalide');
if (data.revision !== CATALOG_REVISION) throw new Error('Révision de catalogue inattendue');
if (data.source !== WIKIDATA_ENDPOINT || data.license !== 'CC0-1.0') throw new Error('Provenance de catalogue invalide');
if (!Array.isArray(data.platforms) || data.platforms.length !== CATALOG_PLATFORMS.length) throw new Error('Nombre de plateformes invalide');

let count = 0;
for (let index = 0; index < CATALOG_PLATFORMS.length; index += 1) {
  const expected = CATALOG_PLATFORMS[index];
  const platform = data.platforms[index];
  if (!Array.isArray(platform) || platform.length !== 4) throw new Error(`Plateforme ${index} invalide`);
  if (platform.slice(0, 3).join('|') !== expected.join('|')) throw new Error(`Mapping inattendu pour ${expected[1]}`);
  const titles = platform[3];
  if (!Array.isArray(titles) || !titles.length) throw new Error(`Aucun titre pour ${expected[1]}`);
  const seen = new Set();
  let previous = '';
  for (const entry of titles) {
    const title = Array.isArray(entry) ? entry[0] : entry;
    const alias = Array.isArray(entry) ? entry[1] : '';
    if (typeof title !== 'string' || !title.trim() || title !== title.normalize('NFC')) throw new Error(`Titre invalide pour ${expected[1]}`);
    if (/[\u0000-\u001f\u007f]/.test(title) || (alias && /[\u0000-\u001f\u007f]/.test(alias))) throw new Error(`Caractère de contrôle pour ${expected[1]}`);
    const key = normalize(title);
    if (!key || seen.has(key)) throw new Error(`Doublon de titre pour ${expected[1]} : ${title}`);
    if (previous && previous.localeCompare(key, 'fr') > 0) throw new Error(`Tri invalide pour ${expected[1]}`);
    seen.add(key);
    previous = key;
  }
  count += titles.length;
}

if (count !== data.count) throw new Error(`Compte invalide : ${data.count} au lieu de ${count}`);
const gzipBytes = gzipSync(raw).byteLength;
if (Buffer.byteLength(raw) > 4_000_000 || gzipBytes > 1_200_000) throw new Error('Le catalogue dépasse le budget de taille');
console.log(`Catalogue valide : ${count} titres, ${Buffer.byteLength(raw)} octets (${gzipBytes} gzip).`);
