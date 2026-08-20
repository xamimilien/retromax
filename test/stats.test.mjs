import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utilitySource=await readFile(resolve(ROOT,'stats-utils.js'),'utf8');
const appSource=await readFile(resolve(ROOT,'app.js'),'utf8');
const htmlSource=await readFile(resolve(ROOT,'index.html'),'utf8');
const styleSource=await readFile(resolve(ROOT,'styles.css'),'utf8');
const workerSource=await readFile(resolve(ROOT,'sw.js'),'utf8');
const context={};
context.globalThis=context;
vm.runInNewContext(utilitySource,context);
const stats=context.RetroMaxStats;

const games=[
  {title:'Gran Turismo 4',manufacturer:'Sony',console:'PlayStation 2',status:'Acquis',quantity:2,region:'PAL',format:'Boîte'},
  {title:'God of War',manufacturer:'Sony',console:'PlayStation 2',status:'Acquis',quantity:1,region:'PAL',format:'Boîte'},
  {title:'Forza Horizon 3',manufacturer:'Microsoft',console:'Xbox One',status:'Commandé',quantity:1,region:'PAL',format:'Boîte'},
  {title:'Shenmue',manufacturer:'Sega',console:'Dreamcast',status:'Recherché',quantity:1,region:'JAP',format:'Loose'}
];

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),value:key=>values.get(key)};
}

test('le résumé distingue jeux, exemplaires, plateformes et statuts',()=>{
  assert.deepEqual({...stats.summary(games)},{games:4,copies:3,platforms:3,manufacturers:3,ordered:1,wanted:1});
});

test('les préférences restent bornées et conservent au moins un indicateur',()=>{
  const normalized=stats.normalizePreferences({cards:['games','games','invalid'],view:'pie',groupBy:'region',measure:'copies',scope:'Commandé'});
  assert.deepEqual([...normalized.cards],['games']);
  assert.equal(normalized.view,'pie');
  assert.equal(normalized.groupBy,'region');
  assert.equal(normalized.measure,'copies');
  assert.equal(normalized.scope,'Commandé');
  assert.deepEqual([...stats.normalizePreferences({cards:[]}).cards],['copies','platforms','wanted']);
});

test('les choix statistiques sont mémorisés séparément de la collection',()=>{
  const storage=memoryStorage({'retromax-games-v2-private':'collection-intacte'});
  const saved=stats.savePreferences({cards:['games','ordered'],view:'frieze',groupBy:'status'},storage);
  assert.equal(saved.view,'frieze');
  assert.equal(storage.value('retromax-games-v2-private'),'collection-intacte');
  assert.deepEqual(stats.loadPreferences(storage),saved);
});

test('la répartition calcule les jeux par plateforme',()=>{
  assert.deepEqual([...stats.distribution(games,{groupBy:'console',measure:'games',scope:'all'})].map(item=>({...item})),[
    {label:'PlayStation 2',value:2},
    {label:'Dreamcast',value:1},
    {label:'Xbox One',value:1}
  ]);
});

test('la répartition accepte les exemplaires et un périmètre de statut',()=>{
  assert.deepEqual([...stats.distribution(games,{groupBy:'manufacturer',measure:'copies',scope:'Acquis'})].map(item=>({...item})),[
    {label:'Sony',value:3}
  ]);
  assert.deepEqual([...stats.distribution(games,{groupBy:'status',measure:'games',scope:'all'})].map(item=>({...item})),[
    {label:'Acquis',value:2},
    {label:'Commandé',value:1},
    {label:'Recherché',value:1}
  ]);
});

test('la modale propose aperçu, camembert, frise et sélection des indicateurs',()=>{
  assert.match(htmlSource,/id="statsDialog"[^>]*aria-labelledby="statsDialogTitle"/);
  assert.match(htmlSource,/data-stats-view="overview"/);
  assert.match(htmlSource,/data-stats-view="pie"[^>]*>[\s\S]*?Camembert/);
  assert.match(htmlSource,/data-stats-view="frieze"[^>]*>[\s\S]*?Frise/);
  for(const metric of ['games','copies','platforms','manufacturers','ordered','wanted'])assert.match(htmlSource,new RegExp(`data-stats-card value="${metric}"`));
  for(const group of ['console','manufacturer','status','region','format'])assert.match(htmlSource,new RegExp(`<option value="${group}"`));
});

test('les graphiques sont natifs, accessibles et adaptés au mobile',()=>{
  assert.match(appSource,/role="img" aria-label=/);
  assert.match(appSource,/conic-gradient\(\$\{slices\}\)/);
  assert.match(styleSource,/\.stats-pie\{[^}]*background:var\(--stats-pie\)/);
  assert.match(styleSource,/\.stats-frieze-strip\{[^}]*display:flex/);
  assert.match(styleSource,/@media\(max-width:560px\)/);
  assert.doesNotMatch(htmlSource,/chart\.js|highcharts|d3\.js/i);
});

test('le résumé et le détail utilisent la même source sans muter les jeux',()=>{
  assert.match(appSource,/STATS\.summary\(games\)/);
  assert.match(appSource,/STATS\.distribution\(games,statsPreferences\)/);
  assert.match(appSource,/STATS\.savePreferences\(\{\.\.\.statsPreferences,\.\.\.patch\}\)/);
  assert.doesNotMatch(utilitySource,/setItem\(['"]retromax-games-v2-private/);
});

test('l’utilitaire statistique 0.0.32 est chargé avant l’app et disponible hors ligne',()=>{
  const utilityIndex=htmlSource.indexOf('stats-utils.js?v=0.0.32');
  const appIndex=htmlSource.indexOf('app.js?v=0.0.32');
  assert.ok(utilityIndex>=0&&utilityIndex<appIndex);
  assert.match(workerSource,/stats-utils\.js\?v=\$\{VERSION\}/);
});
