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

test('le résumé sépare la collection de la wishlist',()=>{
  assert.deepEqual({...stats.summary(games)},{games:3,copies:3,platforms:2,manufacturers:2,ordered:1,wanted:1});
});

test('les préférences restent bornées et conservent au moins un indicateur',()=>{
  const normalized=stats.normalizePreferences({cards:['games','games','invalid'],view:'pie',groupBy:'region',measure:'copies',scope:'Commandé'});
  assert.deepEqual([...normalized.cards],['games']);
  assert.equal(normalized.view,'pie');
  assert.equal(normalized.groupBy,'region');
  assert.equal(normalized.measure,'copies');
  assert.equal(normalized.scope,'Commandé');
  assert.equal(stats.normalizePreferences({scope:'all'}).scope,'collection','les anciennes préférences sont migrées hors wishlist');
  assert.deepEqual([...stats.normalizePreferences({cards:[]}).cards],['copies','platforms','wanted']);
});

test('les choix statistiques sont mémorisés séparément de la collection',()=>{
  const storage=memoryStorage({'retromax-games-v2-private':'collection-intacte'});
  const saved=stats.savePreferences({cards:['games','ordered'],view:'frieze',groupBy:'status'},storage);
  assert.equal(saved.view,'frieze');
  assert.equal(storage.value('retromax-games-v2-private'),'collection-intacte');
  assert.deepEqual(stats.loadPreferences(storage),saved);
});

test('la répartition de collection exclut la wishlist',()=>{
  assert.deepEqual([...stats.distribution(games,{groupBy:'console',measure:'games',scope:'collection'})].map(item=>({...item})),[
    {label:'PlayStation 2',value:2},
    {label:'Xbox One',value:1}
  ]);
  assert.deepEqual([...stats.distribution(games,{groupBy:'console',measure:'games',scope:'Recherché'})].map(item=>({...item})),[
    {label:'Dreamcast',value:1}
  ]);
});

test('la répartition accepte les exemplaires et un périmètre de statut',()=>{
  assert.deepEqual([...stats.distribution(games,{groupBy:'manufacturer',measure:'copies',scope:'Acquis'})].map(item=>({...item})),[
    {label:'Sony',value:3}
  ]);
  assert.deepEqual([...stats.distribution(games,{groupBy:'status',measure:'games',scope:'collection'})].map(item=>({...item})),[
    {label:'Acquis',value:2},
    {label:'Commandé',value:1}
  ]);
});

test('la modale propose aperçu, camembert, frise et sélection des indicateurs',()=>{
  assert.match(htmlSource,/id="statsDialog"[^>]*aria-labelledby="statsDialogTitle"/);
  assert.match(htmlSource,/data-stats-view="overview"/);
  assert.match(htmlSource,/data-stats-view="pie"[^>]*>[\s\S]*?Camembert/);
  assert.match(htmlSource,/data-stats-view="frieze"[^>]*>[\s\S]*?Frise/);
  for(const metric of ['games','copies','platforms','manufacturers','ordered','wanted'])assert.match(htmlSource,new RegExp(`data-stats-card value="${metric}"`));
  for(const group of ['console','manufacturer','status','region','format'])assert.match(htmlSource,new RegExp(`<option value="${group}"`));
  assert.match(htmlSource,/<option value="collection">Collection \(hors wishlist\)<\/option>/);
});

test('le type choisi remplace réellement les statistiques de l’accueil',()=>{
  assert.match(appSource,/els\.stats\.dataset\.statsView=view/);
  assert.match(appSource,/els\.stats\.classList\.toggle\('stats-home-chart',chartView\)/);
  assert.match(appSource,/els\.stats\.innerHTML=`<div class="stats-home-visual">\$\{statsChartMarkup\(view,true\)\}<\/div>`/);
  assert.match(appSource,/else\{els\.stats\.style\.setProperty\('--stats-columns'/);
  assert.match(appSource,/statsEls\.cardOptions\.classList\.toggle\('hidden',view!=='overview'\)/);
  assert.match(styleSource,/\.stats\.stats-home-chart\{display:block\}/);
  assert.match(styleSource,/\.stats-home-visual \.stats-pie-layout/);
});

test('la vue d’accueil conserve chaque plateforme sans catégorie Autres',()=>{
  assert.doesNotMatch(appSource,/label:'Autres'/);
  assert.doesNotMatch(appSource,/rawData\.slice\(/);
  assert.match(appSource,/const data=STATS\.distribution\(games,statsPreferences\)/);
  assert.match(appSource,/statsLegendMarkup\(data,total,hint\)/);
  assert.match(appSource,/Détail complet de la répartition/);
  assert.match(appSource,/fais défiler la liste/);
  assert.match(styleSource,/\.stats-home-visual \.stats-legend\{[^}]*overflow-y:auto/);
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

test('l’utilitaire statistique 0.0.35 est chargé avant l’app et disponible hors ligne',()=>{
  const utilityIndex=htmlSource.indexOf('stats-utils.js?v=0.0.35');
  const appIndex=htmlSource.indexOf('app.js?v=0.0.35');
  assert.ok(utilityIndex>=0&&utilityIndex<appIndex);
  assert.match(workerSource,/stats-utils\.js\?v=\$\{VERSION\}/);
});
