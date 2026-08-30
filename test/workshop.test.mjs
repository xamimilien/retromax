import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utilitySource=await readFile(resolve(ROOT,'workshop-utils.js'),'utf8');
const appSource=await readFile(resolve(ROOT,'app.js'),'utf8');
const htmlSource=await readFile(resolve(ROOT,'index.html'),'utf8');
const styleSource=await readFile(resolve(ROOT,'styles.css'),'utf8');
const workerSource=await readFile(resolve(ROOT,'sw.js'),'utf8');
const context={};
context.globalThis=context;
vm.runInNewContext(utilitySource,context);
const workshop=context.RetroMaxWorkshop;

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),value:key=>values.get(key)};
}

const sample={
  consoles:[
    {id:'n64',manufacturer:'Nintendo',console:'Nintendo 64',condition:'semi hs',quantity:2,issue:'Port cartouche'},
    {id:'dc',manufacturer:'Sega',console:'Dreamcast',condition:'HS',quantity:1,issue:'Lecteur GD-ROM'}
  ],
  parts:[
    {id:'laser',manufacturer:'Sega',name:'Bloc optique',console:'Dreamcast',quantity:3,location:'Bac A2'},
    {id:'pad',manufacturer:'Nintendo',name:'Membrane manette',console:'Nintendo 64',quantity:0}
  ]
};

test('les états et quantités de restauration sont normalisés',()=>{
  assert.deepEqual([...workshop.CONDITIONS],['OK','Semi-HS','HS']);
  const normalized=workshop.normalize(sample);
  assert.equal(normalized.consoles[0].condition,'Semi-HS');
  assert.equal(normalized.consoles[0].quantity,2);
  assert.equal(normalized.consoles[1].condition,'HS');
  assert.equal(normalized.parts[1].quantity,0,'une référence épuisée reste dans le stock');
  assert.equal(workshop.condition('état inconnu'),'OK');
});

test('le résumé compte les machines et les pièces sans mélanger les jeux',()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(workshop.summary(sample))),{consoles:3,ok:0,semiHs:2,hs:1,parts:3,partReferences:2});
  assert.equal(workshop.KEY,'retromax-workshop-v1-private');
  assert.notEqual(workshop.KEY,'retromax-games-v2-private');
});

test('la recherche, le filtre et les sections par marque fonctionnent ensemble',()=>{
  const nintendo=workshop.filter(sample,{manufacturer:'Nintendo'});
  assert.deepEqual(nintendo.consoles.map(item=>item.id),['n64']);
  assert.deepEqual(nintendo.parts.map(item=>item.id),['pad']);
  const search=workshop.filter(sample,{query:'gd-rom'});
  assert.deepEqual(search.consoles.map(item=>item.id),['dc']);
  const groups=workshop.groupByManufacturer(sample);
  assert.deepEqual(Array.from(groups,group=>group.manufacturer),['Nintendo','Sega']);
});

test('le stockage de l’atelier est local, séparé et résiste à un JSON invalide',()=>{
  const storage=memoryStorage({'retromax-games-v2-private':'[{"title":"Sonic"}]'});
  workshop.save(sample,storage);
  assert.equal(storage.value('retromax-games-v2-private'),'[{"title":"Sonic"}]');
  assert.equal(workshop.load(storage).parts.length,2);
  const broken=memoryStorage({[workshop.KEY]:'{'});
  assert.equal(workshop.load(broken).consoles.length,0);
});

test('l’interface propose un volet Atelier et deux fiches complètes',()=>{
  assert.match(htmlSource,/data-nav="workshop"[^>]*>[\s\S]*?Atelier/);
  assert.match(htmlSource,/id="workshopPane"[^>]+hidden/);
  for(const id of ['workshopSummary','workshopSearch','workshopManufacturerFilter','workshopBrands','workshopConsoleDialog','workshopPartDialog'])assert.match(htmlSource,new RegExp(`id="${id}"`));
  assert.match(htmlSource,/id="workshopConsoleCondition"[\s\S]*?<option>OK<\/option><option>Semi-HS<\/option><option>HS<\/option>/);
  for(const id of ['workshopConsoleIssue','workshopConsoleNotes','workshopPartConsole','workshopPartQuantity','workshopPartLocation','workshopPartNotes'])assert.match(htmlSource,new RegExp(`id="${id}"`));
});

test('les fiches sont créées, modifiées, supprimées et sauvegardées',()=>{
  assert.match(appSource,/let workshop=WORKSHOP\.load\(\)/);
  assert.match(appSource,/function renderWorkshop\(\)/);
  assert.match(appSource,/workshopEls\.consoleForm\.addEventListener\(['"]submit['"]/);
  assert.match(appSource,/workshopEls\.partForm\.addEventListener\(['"]submit['"]/);
  assert.match(appSource,/workshop\.consoles=workshop\.consoles\.filter/);
  assert.match(appSource,/workshop\.parts=workshop\.parts\.filter/);
  assert.match(appSource,/function saveWorkshop\(\)\{workshop=WORKSHOP\.save\(workshop\)\}/);
});

test('la sauvegarde JSON v3 inclut l’atelier et reste compatible avec les anciennes collections',()=>{
  assert.match(appSource,/version:3,exportedAt:new Date\(\)\.toISOString\(\),games,workshop/);
  assert.match(appSource,/hasWorkshop=/);
  assert.match(appSource,/WORKSHOP\.normalize\(parsed\.workshop\)/);
  assert.match(appSource,/if\(importedWorkshop\)\{workshop=importedWorkshop;saveWorkshop\(\)\}/);
  assert.match(appSource,/const arr=Array\.isArray\(data\)\?data:/,'les anciens exports sous forme de tableau restent acceptés');
});

test('le volet est responsive, accessible hors ligne et n’encombre pas les actions de jeu',()=>{
  assert.match(styleSource,/\.bottom-nav\{display:grid;grid-template-columns:repeat\(6/);
  assert.match(styleSource,/body\[data-pane="workshop"\] #scanBtn/);
  assert.match(styleSource,/\.workshop-columns\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(styleSource,/@media\(max-width:720px\)[\s\S]*?\.workshop-columns\{grid-template-columns:1fr\}/);
  assert.match(workerSource,/workshop-utils\.js\?v=\$\{VERSION\}/);
  const utilityIndex=htmlSource.indexOf('workshop-utils.js?v=0.0.36');
  const appIndex=htmlSource.indexOf('app.js?v=0.0.36');
  assert.ok(utilityIndex>=0&&utilityIndex<appIndex);
});
