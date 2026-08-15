import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utilitySource=await readFile(resolve(ROOT,'tutorial-utils.js'),'utf8');
const appSource=await readFile(resolve(ROOT,'app.js'),'utf8');
const htmlSource=await readFile(resolve(ROOT,'index.html'),'utf8');
const styleSource=await readFile(resolve(ROOT,'styles.css'),'utf8');
const workerSource=await readFile(resolve(ROOT,'sw.js'),'utf8');
const context={};
context.globalThis=context;
vm.runInNewContext(utilitySource,context);
const tutorial=context.RetroMaxTutorial;

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return{
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    value:key=>values.get(key)
  };
}

test('le premier lancement utilise un indicateur dédié sans toucher à la collection',()=>{
  assert.equal(tutorial.KEY,'retromax-tutorial-seen-v1');
  assert.notEqual(tutorial.KEY,'retromax-games-v2-private');
  const storage=memoryStorage({'retromax-games-v2-private':'[{"title":"Sonic"}]'});
  assert.equal(tutorial.hasSeen(storage),false);
  assert.equal(storage.value('retromax-games-v2-private'),'[{"title":"Sonic"}]');
});

test('le guide n’est considéré comme vu qu’après une fermeture mémorisée',()=>{
  const storage=memoryStorage();
  assert.equal(tutorial.hasSeen(storage),false);
  assert.equal(tutorial.markSeen(storage),true);
  assert.equal(storage.value(tutorial.KEY),'1');
  assert.equal(tutorial.hasSeen(storage),true);
  storage.setItem(tutorial.KEY,'0');
  assert.equal(tutorial.hasSeen(storage),false);
});

test('un stockage indisponible ne bloque ni l’ouverture ni la fermeture du guide',()=>{
  const unavailable={
    getItem(){throw new Error('storage unavailable')},
    setItem(){throw new Error('storage unavailable')}
  };
  assert.equal(tutorial.hasSeen(unavailable),false);
  assert.equal(tutorial.markSeen(unavailable),false);
});

test('la navigation reste bornée de la première à la dernière étape',()=>{
  assert.equal(tutorial.clampStep(-10,5),0);
  assert.equal(tutorial.clampStep(0,5),0);
  assert.equal(tutorial.clampStep(2,5),2);
  assert.equal(tutorial.clampStep(4,5),4);
  assert.equal(tutorial.clampStep(99,5),4);
  assert.equal(tutorial.clampStep(Number.NaN,5),0);
  assert.equal(tutorial.clampStep(3,0),0);
});

test('la modale expose cinq étapes, ses commandes et une progression accessible',()=>{
  assert.match(htmlSource,/<dialog id="tutorialDialog"[^>]+aria-labelledby="tutorialTitle"[^>]+aria-describedby="tutorialDescription"/);
  const steps=[...htmlSource.matchAll(/data-tutorial-step="(\d+)"/g)].map(match=>Number(match[1]));
  assert.deepEqual(steps,[0,1,2,3,4]);
  assert.match(htmlSource,/id="tutorialProgressBar"[^>]+role="progressbar"[^>]+aria-valuemin="1"[^>]+aria-valuemax="5"[^>]+aria-valuenow="1"/);
  assert.match(htmlSource,/id="tutorialProgress"[^>]+aria-live="polite"/);
  for(const id of ['tutorialCloseBtn','tutorialSkipBtn','tutorialPrevBtn','tutorialNextBtn']){
    assert.match(htmlSource,new RegExp(`id="${id}"`));
  }
  assert.match(htmlSource,/id="tutorialPrevBtn"[^>]+disabled/);
});

test('les étapes couvrent les fonctions indispensables et expliquent Réinitialiser',()=>{
  for(const content of [
    /collection reste privée/i,
    /Manuellement ou avec la caméra/i,
    /Recherche et filtres en cascade/i,
    /Modifier plusieurs jeux ensemble/i,
    /Sauvegarde régulièrement ta collection/i,
    /Réinitialiser[\s\S]*ne supprime aucun jeu/i
  ])assert.match(htmlSource,content);
});

test('Aide peut rouvrir le guide sans modifier l’onglet actif',()=>{
  const helpButton=htmlSource.match(/<button[^>]+id="tutorialBtn"[^>]*>/)?.[0]||'';
  assert.match(helpButton,/aria-label="Ouvrir le guide d’utilisation"/);
  assert.doesNotMatch(helpButton,/data-nav=/);
  assert.match(appSource,/tutorialBtn/);
  assert.match(appSource,/tutorialDialog/);
  assert.match(appSource,/\.showModal\(\)/);
});

test('les commandes de fermeture, le clavier et la réouverture sont câblés',()=>{
  for(const token of ['tutorialCloseBtn','tutorialSkipBtn','tutorialPrevBtn','tutorialNextBtn']){
    assert.match(appSource,new RegExp(token));
  }
  assert.match(appSource,/tutorialEls\.dialog\.addEventListener\(['"]close['"]/);
  assert.match(appSource,/tutorialEls\.dialog\.addEventListener\(['"]cancel['"]/);
  assert.match(appSource,/closeDialogSafely\(tutorialEls\.dialog/);
  assert.match(appSource,/tutorialEls\.pages\.scrollTop=0/);
  assert.match(appSource,/RetroMaxTutorial/);
  assert.match(appSource,/\.hasSeen\(/);
  assert.match(appSource,/\.markSeen\(/);
});

test('le guide évite les conflits avec les autres dialogues et ne s’ouvre qu’après le rendu initial',()=>{
  assert.match(appSource,/dialog\[open\]/);
  const initialRender=appSource.lastIndexOf('populateFilters();render()');
  const firstRunCheck=Math.max(appSource.lastIndexOf('.hasSeen('),appSource.lastIndexOf('hasSeen('));
  assert.ok(initialRender>=0,'initialisation de la collection introuvable');
  assert.ok(firstRunCheck>initialRender,'le tutoriel doit être vérifié après le rendu initial');
});

test('la PWA 0.0.29 charge et met en cache les ressources du tutoriel',()=>{
  assert.match(htmlSource,/tutorial-utils\.js\?v=0\.0\.29/);
  assert.match(workerSource,/tutorial-utils\.js\?v=\$\{VERSION\}/);
  assert.match(styleSource,/#tutorialDialog/);
});
