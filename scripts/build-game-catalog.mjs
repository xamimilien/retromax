import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_PLATFORMS, CATALOG_REVISION, WIKIDATA_ENDPOINT } from './game-catalog-platforms.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'assets/data/game-catalog.json');
const USER_AGENT = 'RetroMaxCatalogBuilder/0.0.25 (https://github.com/xamimilien/retromax)';

const wait = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
const clean = value => String(value || '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
const keyOf = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function platformQuery(qid) {
  return `SELECT DISTINCT ?game ?label WHERE {
  ?game wdt:P400 wd:${qid};
        wdt:P31/wdt:P279* wd:Q7889;
        rdfs:label ?label.
  FILTER(LANG(?label) IN ("en", "fr"))
}`;
}

async function requestPlatform(qid) {
  const query = platformQuery(qid);
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(90000)
      });
      if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 4) await wait(attempt * 1500);
    }
  }
  throw lastError;
}

function titlesFromBindings(bindings) {
  const games = new Map();
  for (const binding of bindings) {
    const qid = binding.game?.value?.split('/').pop();
    const title = clean(binding.label?.value);
    const language = binding.label?.['xml:lang'];
    if (!qid || !title || !['en', 'fr'].includes(language)) continue;
    const labels = games.get(qid) || {};
    labels[language] = title;
    games.set(qid, labels);
  }

  const unique = new Map();
  for (const labels of games.values()) {
    const title = labels.en || labels.fr;
    if (!title) continue;
    const alias = labels.fr && keyOf(labels.fr) !== keyOf(title) ? labels.fr : '';
    const key = keyOf(title);
    const candidate = alias ? [title, alias] : title;
    const existing = unique.get(key);
    if (!existing || JSON.stringify(candidate).localeCompare(JSON.stringify(existing), 'fr') < 0) unique.set(key, candidate);
  }

  return [...unique.values()].sort((left, right) => {
    const a = Array.isArray(left) ? left[0] : left;
    const b = Array.isArray(right) ? right[0] : right;
    return keyOf(a).localeCompare(keyOf(b), 'fr') || a.localeCompare(b, 'fr');
  });
}

const platforms = [];
let count = 0;
for (const [manufacturer, consoleName, qid] of CATALOG_PLATFORMS) {
  process.stdout.write(`Wikidata ${consoleName} (${qid})... `);
  const payload = await requestPlatform(qid);
  const titles = titlesFromBindings(payload.results?.bindings || []);
  if (!titles.length) throw new Error(`Aucun titre reçu pour ${consoleName} (${qid})`);
  platforms.push([manufacturer, consoleName, qid, titles]);
  count += titles.length;
  console.log(`${titles.length} titres`);
}

const catalog = {
  schema: 1,
  revision: CATALOG_REVISION,
  source: WIKIDATA_ENDPOINT,
  license: 'CC0-1.0',
  count,
  platforms
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(catalog)}\n`, 'utf8');
console.log(`Catalogue écrit : ${count} titres et ${platforms.length} plateformes.`);
