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

test('les utilitaires de scan 0.0.27 sont chargés et mis en cache par la PWA',()=>{
  assert.match(htmlSource,/barcode-utils\.js\?v=0\.0\.27/);
  assert.match(workerSource,/barcode-utils\.js\?v=\$\{VERSION\}/);
  assert.match(htmlSource,/id="scanRetryBtn"/);
  assert.match(appSource,/scanRetryBtn\.onclick=startScanner/);
});
