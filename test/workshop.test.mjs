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
    {id:'n64',manufacturer:'Nintendo',console:'Nintendo 64',variant:'Funtastic',status:'Commandé',completeness:'Boite',accessories:{controller:true,powerSupply:true,videoCable:false,expansionPak:false,memoryCard:true,unknown:true},condition:'semi hs',quantity:2,issue:'Port cartouche'},
    {id:'dc',manufacturer:'Sega',console:'Dreamcast',status:'Recherché',completeness:'Incomplete',condition:'HS',quantity:1,issue:'Lecteur GD-ROM'}
  ],
  parts:[
    {id:'laser',manufacturer:'Sega',name:'Bloc optique',console:'Dreamcast',variant:'VA1',quantity:3,location:'Bac A2'},
    {id:'pad',manufacturer:'Nintendo',name:'Membrane manette',console:'Nintendo 64',quantity:0}
  ]
};

test('les états et quantités de restauration sont normalisés',()=>{
  assert.deepEqual([...workshop.CONDITIONS],['OK','Semi-HS','HS']);
  assert.deepEqual([...workshop.STATUSES],['Acquis','Commandé','Recherché']);
  assert.deepEqual([...workshop.COMPLETENESS],['Loose','Boîte','Complet','Incomplet']);
  const normalized=workshop.normalize(sample);
  assert.equal(normalized.consoles[0].condition,'Semi-HS');
  assert.equal(normalized.consoles[0].variant,'Funtastic');
  assert.equal(normalized.consoles[0].status,'Commandé');
  assert.equal(normalized.consoles[0].completeness,'Boîte');
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.consoles[0].accessories)),{controller:true,powerSupply:true,videoCable:false,expansionPak:false,memoryCard:true});
  assert.equal(normalized.consoles[1].completeness,'Incomplet');
  assert.equal(normalized.consoles[0].quantity,2);
  assert.equal(normalized.consoles[1].condition,'HS');
  assert.equal(normalized.parts[1].quantity,0,'une référence épuisée reste dans le stock');
  assert.equal(normalized.parts[0].variant,'VA1');
  const legacy=workshop.normalize({consoles:[{}],parts:[{}]}).consoles[0];
  assert.equal(legacy.variant,'','les anciennes fiches restent compatibles');
  assert.equal(legacy.status,'Acquis','une ancienne console présente dans l’atelier reste acquise');
  assert.equal(legacy.completeness,'','le contenu inconnu d’une ancienne fiche n’est pas inventé');
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.accessories)),{},'les anciennes fiches restent valides sans checklist');
  assert.equal(workshop.condition('état inconnu'),'OK');
});

test('la checklist d’une console incomplète suit le modèle et son alimentation',()=>{
  const ids=(consoleName,variant='')=>Array.from(workshop.accessoryOptions(consoleName,variant),item=>item.id);
  assert.deepEqual(ids('Nintendo 64'),['controller','powerSupply','videoCable','expansionPak','memoryCard']);
  assert.deepEqual(ids('Wii U'),['controller','powerSupply','videoCable','sensorCamera','gamepad']);
  assert.deepEqual(ids('Switch','OLED'),['controller','powerSupply','videoCable','dock']);
  assert.deepEqual(ids('Switch','Lite'),['powerSupply']);
  assert.deepEqual(ids('PlayStation 5'),['controller','powerCable','videoCable']);
  assert.deepEqual(ids('Dreamcast'),['controller','powerCable','videoCable','memoryCard']);
  assert.deepEqual(ids('Xbox One','Fat'),['controller','powerSupply','videoCable']);
  assert.deepEqual(ids('Xbox One','S'),['controller','powerCable','videoCable']);
  assert.ok(ids('PlayStation VR').includes('sensorCamera'));
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
  assert.deepEqual(workshop.filter(sample,{status:'Commandé'}).consoles.map(item=>item.id),['n64']);
  assert.deepEqual(workshop.filter(sample,{completeness:'Incomplet'}).consoles.map(item=>item.id),['dc']);
  assert.equal(workshop.filter(sample,{status:'Recherché'}).parts.length,0,'un filtre propre aux consoles masque le stock de pièces');
  const groups=workshop.groupByManufacturer(sample);
  assert.deepEqual(Array.from(groups,group=>group.manufacturer),['Nintendo','Sega']);
});

test('les suggestions sont tolérantes aux accents, dédupliquées et classées',()=>{
  assert.deepEqual(Array.from(workshop.suggest(['Écran','Bloc optique','Ecran','Câble vidéo'],'ecr')),['Écran']);
  assert.deepEqual(Array.from(workshop.suggest(['Mega Drive','Game Boy','Game Boy Color'],'ga')),['Game Boy','Game Boy Color','Mega Drive']);
  assert.deepEqual(Array.from(workshop.suggest(['A','B','C'],'',2)),['A','B']);
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
  for(const id of ['workshopSummary','workshopSearch','workshopManufacturerFilter','workshopStatusFilter','workshopCompletenessFilter','workshopBrands','workshopConsoleDialog','workshopPartDialog'])assert.match(htmlSource,new RegExp(`id="${id}"`));
  assert.match(htmlSource,/id="workshopConsoleCondition"[\s\S]*?<option>OK<\/option><option>Semi-HS<\/option><option>HS<\/option>/);
  for(const id of ['workshopConsoleVariant','workshopConsoleStatus','workshopConsoleCompleteness','workshopConsoleAccessories','workshopConsoleAccessoryList','workshopConsoleIssue','workshopConsoleNotes','workshopPartConsole','workshopPartVariant','workshopPartQuantity','workshopPartLocation','workshopPartNotes'])assert.match(htmlSource,new RegExp(`id="${id}"`));
  assert.match(htmlSource,/id="workshopConsoleStatus"[\s\S]*?<option>Acquis<\/option><option>Commandé<\/option><option>Recherché<\/option>/);
  assert.match(htmlSource,/id="workshopConsoleCompleteness"[\s\S]*?<option>Loose<\/option><option>Boîte<\/option><option>Complet<\/option><option>Incomplet<\/option>/);
});

test('les champs de l’atelier proposent une autocomplétion accessible sur iPhone',()=>{
  for(const [input,list] of [['workshopConsoleManufacturer','workshopConsoleManufacturerSuggestions'],['workshopConsoleName','workshopConsoleNameSuggestions'],['workshopConsoleVariant','workshopConsoleVariantSuggestions'],['workshopPartManufacturer','workshopPartManufacturerSuggestions'],['workshopPartConsole','workshopPartConsoleSuggestions'],['workshopPartVariant','workshopPartVariantSuggestions'],['workshopPartName','workshopPartNameSuggestions']]){
    assert.match(htmlSource,new RegExp(`id="${input}"[^>]+role="combobox"[^>]+aria-autocomplete="list"[^>]+aria-controls="${list}"`));
    assert.match(htmlSource,new RegExp(`id="${list}"[^>]+role="listbox"[^>]+hidden`));
  }
  assert.doesNotMatch(htmlSource,/<datalist\b[^>]*id="workshop/i);
  assert.match(styleSource,/\.workshop-autocomplete-list\{[^}]*position:absolute[^}]*max-height:190px[^}]*overflow-y:auto/);
  assert.match(styleSource,/\.workshop-autocomplete-list button\{[^}]*min-height:40px/);
});

test('les suggestions suivent la marque et complètent automatiquement la fiche',()=>{
  assert.match(appSource,/function workshopConsoleChoices\(manufacturerValue=''/);
  assert.match(appSource,/CONSOLE_CATALOG\[manufacturer\]/);
  assert.match(appSource,/function workshopManufacturerForConsole/);
  assert.match(appSource,/const CONSOLE_VARIANT_CATALOG=/);
  assert.match(appSource,/['"]PlayStation 3['"]:\[['"]Fat['"],['"]Slim['"],['"]Super Slim['"]\]/);
  assert.match(appSource,/function workshopVariantChoices/);
  assert.match(appSource,/manufacturerInput\.value=inferred/);
  assert.match(appSource,/WORKSHOP_PART_CATALOG/);
  assert.match(appSource,/function workshopPartChoices/);
  assert.match(appSource,/workshop\.parts\.filter/,'les pièces déjà saisies doivent enrichir les propositions');
  assert.match(appSource,/event\.key==='ArrowDown'/);
  assert.match(appSource,/event\.key==='Enter'/);
  assert.match(appSource,/event\.key==='Escape'/);
  assert.match(appSource,/aria-activedescendant/);
  assert.match(appSource,/setupWorkshopAutocomplete\('#workshopPartName'/);
  assert.match(appSource,/setupWorkshopAutocomplete\('#workshopConsoleVariant'/);
  assert.match(appSource,/setupWorkshopAutocomplete\('#workshopPartVariant'/);
});

test('les fiches sont créées, modifiées, supprimées et sauvegardées',()=>{
  assert.match(appSource,/let workshop=WORKSHOP\.load\(\)/);
  assert.match(appSource,/function renderWorkshop\(\)/);
  assert.match(appSource,/workshopEls\.consoleForm\.addEventListener\(['"]submit['"]/);
  assert.match(appSource,/workshopEls\.partForm\.addEventListener\(['"]submit['"]/);
  assert.match(appSource,/variant:\$\('#workshopConsoleVariant'\)\.value/);
  assert.match(appSource,/status:\$\('#workshopConsoleStatus'\)\.value/);
  assert.match(appSource,/completeness=\$\('#workshopConsoleCompleteness'\)\.value/);
  assert.match(appSource,/accessories:completeness==='Incomplet'\?currentWorkshopAccessories\(\):\{\}/);
  assert.match(appSource,/WORKSHOP\.accessoryOptions/);
  assert.match(appSource,/data-workshop-accessory/);
  assert.match(appSource,/STATUS\.className\(item\.status\)/);
  assert.match(appSource,/workshopEls\.statusFilter\.value/);
  assert.match(appSource,/workshopEls\.completenessFilter\.value/);
  assert.match(appSource,/variant:\$\('#workshopPartVariant'\)\.value/);
  assert.match(appSource,/workshop-variant/);
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
  const utilityIndex=htmlSource.indexOf('workshop-utils.js?v=0.0.40');
  const appIndex=htmlSource.indexOf('app.js?v=0.0.40');
  assert.ok(utilityIndex>=0&&utilityIndex<appIndex);
});
