import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utilitySource=await readFile(resolve(ROOT,'status-utils.js'),'utf8');
const appSource=await readFile(resolve(ROOT,'app.js'),'utf8');
const htmlSource=await readFile(resolve(ROOT,'index.html'),'utf8');
const styleSource=await readFile(resolve(ROOT,'styles.css'),'utf8');
const workerSource=await readFile(resolve(ROOT,'sw.js'),'utf8');
const context={};
context.globalThis=context;
vm.runInNewContext(utilitySource,context);
const status=context.RetroMaxStatus;

function optionValues(selectId){
  const block=htmlSource.match(new RegExp(`<select\\b[^>]*id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`))?.[1]||'';
  return[...block.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(([,attributes,label])=>attributes.match(/\bvalue="([^"]*)"/)?.[1]??label.trim());
}

test('les trois statuts canoniques sont stables et Commandé est normalisé',()=>{
  assert.deepEqual([...status.VALUES],['Acquis','Commandé','Recherché']);
  assert.equal(status.normalize('Commandé'),'Commandé');
  assert.equal(status.normalize(' commandé '),'Commandé');
  assert.equal(status.normalize('RECHERCHÉ'),'Recherché');
  assert.equal(status.normalize('valeur inconnue'),'Acquis');
  assert.equal(status.normalize(null),'Acquis');
});

test('Commandé possède un badge visuel distinct',()=>{
  assert.equal(status.className('Acquis'),'good');
  assert.equal(status.className('Commandé'),'ordered');
  assert.equal(status.className('Recherché'),'wanted');
  assert.equal(status.className('statut futur'),'');
  assert.match(styleSource,/\.pill\.ordered\{[^}]*background:[^;}]+;color:[^;}]+\}/);
  assert.match(appSource,/STATUS\.className\(g\.status\)/);
});

test('le filtre, la fiche et la modification groupée proposent Commandé',()=>{
  assert.deepEqual(optionValues('statusFilter'),['','Acquis','Commandé','Recherché']);
  assert.deepEqual(optionValues('status'),['Acquis','Commandé','Recherché']);
  assert.deepEqual(optionValues('bulkStatus'),['Acquis','Commandé','Recherché']);
});

test('le filtre et les formulaires conservent la valeur choisie',()=>{
  assert.match(appSource,/\(!sf\|\|g\.status===sf\)/);
  assert.match(appSource,/status:\$\('#status'\)\.value/);
  assert.match(appSource,/updated\.status=\$\('#bulkStatus'\)\.value/);
  assert.match(appSource,/status:STATUS\.normalize\(g\.status\)/);
  assert.match(appSource,/status:'Acquis'/,'un scan physique reste acquis par défaut');
});

test('Commandé est exporté sans être ajouté à l’onglet Recherchés',()=>{
  assert.match(appSource,/const payload=\{app:'RétroMax',version:2,exportedAt:new Date\(\)\.toISOString\(\),games\}/);
  assert.match(appSource,/b\.dataset\.nav==='wanted'\?'Recherché':''/);
});

test('l’utilitaire de statut 0.0.32 est chargé avant l’application et mis en cache',()=>{
  const utilityIndex=htmlSource.indexOf('status-utils.js?v=0.0.32');
  const appIndex=htmlSource.indexOf('app.js?v=0.0.32');
  assert.ok(utilityIndex>=0&&utilityIndex<appIndex);
  assert.match(workerSource,/status-utils\.js\?v=\$\{VERSION\}/);
});
