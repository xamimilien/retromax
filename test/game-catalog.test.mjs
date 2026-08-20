import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogRaw = await readFile(resolve(ROOT, 'assets/data/game-catalog.json'));
const catalogCanonicalRaw = Buffer.from(catalogRaw.toString('utf8').replace(/\r\n/g, '\n'));
const catalog = JSON.parse(catalogRaw.toString('utf8'));
const catalogReadme = await readFile(resolve(ROOT, 'assets/data/README.md'), 'utf8');
const appSource = await readFile(resolve(ROOT, 'app.js'), 'utf8');
const htmlSource = await readFile(resolve(ROOT, 'index.html'), 'utf8');
const workerSource = await readFile(resolve(ROOT, 'sw.js'), 'utf8');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const titlesFor = consoleName => catalog.platforms.find(platform => platform[1] === consoleName)?.[3].map(entry => Array.isArray(entry) ? entry[0] : entry) || [];

test('le catalogue couvre toutes les plateformes RétroMax', () => {
  assert.equal(catalog.platforms.length, 29);
  assert.deepEqual(new Set(catalog.platforms.map(platform => platform[0])), new Set(['Sony', 'Nintendo', 'Sega', 'Microsoft']));
});

test('des titres emblématiques sont présents sur leur plateforme', () => {
  const fixtures = [
    ['NES', 'Super Mario Bros.'],
    ['PlayStation 1', 'Final Fantasy VII'],
    ['Mega Drive', 'Sonic the Hedgehog'],
    ['Xbox', 'Fable']
  ];
  for (const [consoleName, expected] of fixtures) {
    assert.ok(titlesFor(consoleName).some(title => normalize(title) === normalize(expected)), `${expected} absent de ${consoleName}`);
  }
});

test('le compte public correspond à la somme des plateformes', () => {
  assert.equal(catalog.count, catalog.platforms.reduce((sum, platform) => sum + platform[3].length, 0));
  assert.match(catalogReadme, new RegExp(createHash('sha256').update(catalogCanonicalRaw).digest('hex'), 'i'));
});

test('la fiche utilise un combobox libre relié à la banque locale', () => {
  assert.match(htmlSource, /id="title"[^>]+role="combobox"[^>]+aria-controls="titleSuggestions"/);
  assert.match(appSource, /assets\/data\/game-catalog\.json\?v=\$\{APP_VERSION\}/);
  assert.match(appSource, /function chooseTitleSuggestion/);
  assert.doesNotMatch(htmlSource, /<datalist/i);
});

test('la version 0.0.34 met en cache la banque sans supprimer les caches étrangers', () => {
  assert.match(appSource, /APP_VERSION='0\.0\.34'/);
  assert.match(workerSource, /VERSION='0\.0\.34'/);
  assert.match(workerSource, /CATALOG_URL/);
  assert.match(workerSource, /k\.startsWith\('retromax-public-v'\)/);
});
