import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utilitySource=await readFile(resolve(ROOT,'barcode-utils.js'),'utf8');
const appSource=await readFile(resolve(ROOT,'app.js'),'utf8');
const htmlSource=await readFile(resolve(ROOT,'index.html'),'utf8');
const workerSource=await readFile(resolve(ROOT,'sw.js'),'utf8');
const localBarcodeCatalog=JSON.parse(await readFile(resolve(ROOT,'assets/data/barcode-overrides.json'),'utf8'));
const context={};
context.globalThis=context;
vm.runInNewContext(utilitySource,context);
const barcode=context.RetroMaxBarcode;

test('les variantes UPC-A et EAN-13 Xbox One sont recherchées ensemble',()=>{
  assert.deepEqual([...barcode.lookupCandidates('885370929591')],['885370929591','0885370929591']);
  assert.deepEqual([...barcode.lookupCandidates('0885370929591')],['0885370929591','885370929591']);
  assert.deepEqual([...barcode.lookupCandidates('00885370929591')],['00885370929591','0885370929591','885370929591']);
  assert.deepEqual([...barcode.lookupCandidates('5030917257285')],['5030917257285']);
});

test('un résultat Xbox One exploitable n’est pas masqué par une entrée incomplète',()=>{
  const items=[{platform:'Microsoft Xbox One'},{name:'Halo 5: Guardians',platform:'Microsoft Xbox One'}];
  const selected=barcode.firstUsableItem(items,item=>/xbox one/i.test(item.platform));
  assert.equal(selected.name,'Halo 5: Guardians');
});

test('la normalisation refuse les codes alphanumériques et conserve la saisie lisible',()=>{
  assert.equal(barcode.normalize('8853 7092-9591'),'885370929591');
  assert.equal(barcode.normalize('XBOX-885370929591'),'');
  assert.equal(barcode.normalize('1234'),'');
});

test('les GTIN valides sont contrôlés et ramenés à une clé canonique sur 14 chiffres',()=>{
  assert.equal(barcode.checksum('889842150032'),2);
  assert.equal(barcode.checksum('5030931103650'),0);
  assert.equal(barcode.canonicalGtin('889842150032'),'00889842150032');
  assert.equal(barcode.canonicalGtin('0889842150032'),'00889842150032');
  assert.equal(barcode.canonicalGtin('5030931103650'),'05030931103650');
  assert.equal(barcode.canonicalGtin('889842150033'),'');
  assert.equal(barcode.canonicalGtin('123456789'),'');
});

test('la banque locale versionnée est valide et conserve la provenance',()=>{
  assert.equal(barcode.validateLocalBarcodeCatalog(localBarcodeCatalog),true);
  assert.equal(localBarcodeCatalog.schema,1);
  assert.match(localBarcodeCatalog.version,/^\d{4}-\d{2}-\d{2}\.\d+$/);
  assert.equal(localBarcodeCatalog.license,'CC0-1.0');
  assert.ok(localBarcodeCatalog.entries.every(entry=>entry.source.kind&&entry.source.reference&&entry.source.checkedAt));
  const invalidCatalog=JSON.parse(JSON.stringify(localBarcodeCatalog));
  invalidCatalog.entries[0].gtin14='00889842150033';
  assert.equal(barcode.validateLocalBarcodeCatalog(invalidCatalog),false);
  const duplicateCatalog=JSON.parse(JSON.stringify(localBarcodeCatalog));
  duplicateCatalog.entries.push(JSON.parse(JSON.stringify(duplicateCatalog.entries[0])));
  assert.equal(barcode.validateLocalBarcodeCatalog(duplicateCatalog),false);
});

test('Forza Horizon 3 est résolu localement avec son UPC-A ou son EAN-13',()=>{
  const fromUpc=barcode.findLocalBarcodeEntry(localBarcodeCatalog,'889842150032');
  const fromEan=barcode.findLocalBarcodeEntry(localBarcodeCatalog,'0889842150032');
  assert.equal(fromUpc,fromEan);
  assert.equal(fromUpc.title,'Forza Horizon 3');
  assert.equal(fromUpc.manufacturer,'Microsoft');
  assert.equal(fromUpc.console,'Xbox One');
});

test('Need for Speed: The Run est résolu localement sur PlayStation 3 sans réseau',()=>{
  const entry=barcode.findLocalBarcodeEntry(localBarcodeCatalog,'5030931103650');
  assert.equal(entry.title,'Need for Speed: The Run');
  assert.equal(entry.manufacturer,'Sony');
  assert.equal(entry.console,'PlayStation 3');
  assert.equal(barcode.findLocalBarcodeEntry(localBarcodeCatalog,'4006381333931'),null);
});

test('la banque locale est consultée avant tout appel au catalogue distant',()=>{
  const localLookup=appSource.indexOf('findLocalBarcodeEntry(overrides,barcode)');
  const remoteLookup=appSource.indexOf('https://levelcomplete.de/api/public/search.php?${candidate}');
  assert.ok(localLookup>=0);
  assert.ok(remoteLookup>localLookup);
  assert.match(appSource,/if\(localItem\)return\{item:localItem,source:'local'\}/);
});

test('l’annulation interrompt aussi l’attente de la banque locale partagée',async()=>{
  let release;
  const pending=new Promise(resolvePromise=>{release=resolvePromise});
  const controller=new AbortController();
  const waiting=barcode.withAbortSignal(pending,controller.signal);
  controller.abort();
  await assert.rejects(waiting,error=>error?.name==='AbortError');
  release({schema:1});
  assert.equal(await barcode.withAbortSignal(Promise.resolve('ok'),new AbortController().signal),'ok');
  assert.match(appSource,/withAbortSignal\(loadBarcodeOverrides\(\),signal\)/);
});

test('la caméra active la mise au point continue lorsqu’elle est disponible',async()=>{
  let constraints=null;
  const track={getCapabilities:()=>({focusMode:['manual','continuous']}),applyConstraints:async value=>{constraints=value}};
  assert.equal(await barcode.optimizeStream({getVideoTracks:()=>[track]}),true);
  assert.deepEqual(JSON.parse(JSON.stringify(constraints)),{advanced:[{focusMode:'continuous'}]});
  assert.equal(await barcode.optimizeStream({getVideoTracks:()=>[{getCapabilities:()=>({})}]}),false);
});

test('le lecteur privilégie la caméra haute définition et un relais compatible GitHub Pages',()=>{
  assert.match(appSource,/width:\{ideal:1920\}/);
  assert.match(appSource,/focusMode:\{ideal:'continuous'\}/);
  assert.match(appSource,/RetroMaxBarcode/);
  assert.doesNotMatch(appSource,/DecodeHintType\.TRY_HARDER/);
  assert.match(appSource,/https:\/\/corsproxy\.io\/\?url=\$\{encodeURIComponent\(target\)\}/);
});

test('les utilitaires de scan 0.0.28 et la banque locale sont mis en cache par la PWA',()=>{
  assert.match(htmlSource,/barcode-utils\.js\?v=0\.0\.28/);
  assert.match(workerSource,/barcode-utils\.js\?v=\$\{VERSION\}/);
  assert.match(workerSource,/BARCODE_BANK_URL/);
  assert.match(workerSource,/barcode-overrides\.json/);
  assert.match(htmlSource,/id="scanRetryBtn"/);
  assert.match(appSource,/scanRetryBtn\.onclick=startScanner/);
});
