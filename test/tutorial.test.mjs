import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const utilitySource=await readFile(resolve(ROOT,'tutorial-utils.js'),'utf8');
const appSource=await readFile(resolve(ROOT,'app.js'),'utf8');
const htmlSource=await readFile(resolve(ROOT,'index.html'),'utf8');
const styleSource=await readFile(resolve(ROOT,'styles.css'),'utf8');
const workerSource=await readFile(resolve(ROOT,'sw.js'),'utf8');
const manifest=JSON.parse(await readFile(resolve(ROOT,'manifest.webmanifest'),'utf8'));
const context={};
context.globalThis=context;
vm.runInNewContext(utilitySource,context);
const tutorial=context.RetroMaxTutorial;

const TOPICS=['privacy','install-ios','create','scan','configure','status','statistics','search','bulk','backup'];

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return{
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    value:key=>values.get(key)
  };
}

function tutorialTags(){
  return[...htmlSource.matchAll(/<article\b[^>]*\bdata-tutorial-step="(\d+)"[^>]*>/g)].map(match=>({
    index:Number(match[1]),
    topic:match[0].match(/\bdata-tutorial-topic="([^"]+)"/)?.[1],
    tag:match[0]
  }));
}

function topicBlock(topic){
  const escaped=topic.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return htmlSource.match(new RegExp(`<article\\b[^>]*data-tutorial-topic="${escaped}"[^>]*>[\\s\\S]*?<\\/article>`))?.[0]||'';
}

function assertOrdered(source,patterns){
  let cursor=-1;
  for(const pattern of patterns){
    const match=source.slice(cursor+1).match(pattern);
    assert.ok(match,`contenu introuvable dans l’ordre attendu : ${pattern}`);
    cursor+=1+match.index;
  }
}

function attribute(tag,name){
  return tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1]||'';
}

function manifestIcon(size){
  return manifest.icons?.find(icon=>String(icon.sizes||'').split(/\s+/).includes(`${size}x${size}`));
}

function cssValues(selector,property){
  const escapedSelector=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const escapedProperty=property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const values=[];
  for(const rule of styleSource.matchAll(new RegExp(`${escapedSelector}\\{([^}]*)\\}`,'g'))){
    for(const declaration of rule[1].matchAll(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;}]+)`,'g'))){
      values.push(declaration[1].trim());
    }
  }
  return values;
}

test('le nouveau guide utilise un indicateur v3 sans toucher à la collection',()=>{
  assert.equal(tutorial.KEY,'retromax-tutorial-seen-v3');
  assert.notEqual(tutorial.KEY,'retromax-games-v2-private');
  const storage=memoryStorage({
    'retromax-tutorial-seen-v1':'1',
    'retromax-tutorial-seen-v2':'1',
    'retromax-games-v2-private':'[{"title":"Sonic"}]'
  });
  assert.equal(tutorial.hasSeen(storage),false,'le guide enrichi doit apparaître même si les versions précédentes ont été vues');
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

test('la détection du mode app couvre iOS et le standard display-mode',()=>{
  const detector=appSource.match(/function appModeIsStandalone\(\)\{[^}]+\}/)?.[0];
  assert.ok(detector,'détecteur du mode app introuvable');
  const detect=(matches,iosStandalone)=>{
    const detectorContext={window:{matchMedia:query=>({matches:matches&&query==='(display-mode: standalone)'})},navigator:{standalone:iosStandalone}};
    vm.runInNewContext(`${detector};result=appModeIsStandalone()`,detectorContext);
    return detectorContext.result;
  };
  assert.equal(detect(true,false),true);
  assert.equal(detect(false,true),true);
  assert.equal(detect(false,false),false);
});

test('la navigation reste bornée de la première à la dernière des dix étapes',()=>{
  assert.equal(tutorial.clampStep(-10,TOPICS.length),0);
  assert.equal(tutorial.clampStep(0,TOPICS.length),0);
  assert.equal(tutorial.clampStep(4,TOPICS.length),4);
  assert.equal(tutorial.clampStep(9,TOPICS.length),9);
  assert.equal(tutorial.clampStep(99,TOPICS.length),9);
  assert.equal(tutorial.clampStep(Number.NaN,TOPICS.length),0);
  assert.equal(tutorial.clampStep(3,0),0);
});

test('la modale expose dix thèmes ordonnés et une progression accessible',()=>{
  assert.match(htmlSource,/<dialog id="tutorialDialog"[^>]+aria-labelledby="tutorialTitle"[^>]+aria-describedby="tutorialDescription"/);
  const steps=tutorialTags();
  assert.deepEqual(steps.map(step=>step.index),TOPICS.map((_,index)=>index));
  assert.deepEqual(steps.map(step=>step.topic),TOPICS);
  assert.equal(new Set(steps.map(step=>step.topic)).size,TOPICS.length);
  assert.doesNotMatch(steps[0].tag,/\bhidden\b/);
  for(const step of steps.slice(1))assert.match(step.tag,/\bhidden\b/);
  for(const topic of TOPICS)assert.match(topicBlock(topic),/<h3\b[^>]*tabindex="-1"/);

  const progressTag=htmlSource.match(/<div\b[^>]*id="tutorialProgressBar"[^>]*>/)?.[0]||'';
  assert.equal(attribute(progressTag,'role'),'progressbar');
  assert.equal(attribute(progressTag,'aria-valuemin'),'1');
  assert.equal(attribute(progressTag,'aria-valuemax'),String(TOPICS.length));
  assert.equal(attribute(progressTag,'aria-valuenow'),'1');
  assert.match(htmlSource,new RegExp(`id="tutorialProgress"[^>]+aria-live="polite"[^>]*>Étape 1 sur ${TOPICS.length}`));

  const dots=htmlSource.match(/<span\b[^>]*class="tutorial-dots"[^>]*>([\s\S]*?)<\/span>/)?.[1]||'';
  assert.equal((dots.match(/<i\b/g)||[]).length,TOPICS.length);
  for(const id of ['tutorialCloseBtn','tutorialSkipBtn','tutorialPrevBtn','tutorialNextBtn']){
    assert.match(htmlSource,new RegExp(`id="${id}"`));
  }
  assert.match(htmlSource,/id="tutorialPrevBtn"[^>]+disabled/);
});

test('l’installation iOS décrit dans l’ordre le raccourci et son ouverture comme app',()=>{
  const block=topicBlock('install-ios');
  assert.match(block,/<ol\b[\s\S]*<\/ol>/i);
  const instructions=block.match(/<ol\b[\s\S]*?<\/ol>/i)?.[0]||'';
  assertOrdered(instructions,[
    /Safari/i,
    /Partager/i,
    /Sur l[’']écran d[’']accueil/i,
    /Ouvrir comme app web/i,
    /Ajouter/i
  ]);
  assert.match(block,/id="tutorialInstallState"[^>]*role="status"[^>]*hidden/);
  assert.match(block,/Mode app actif/i);
  assert.match(appSource,/installState\.hidden=!appModeIsStandalone\(\)/);
});

test('chaque fonction clé possède une slide dédiée et compréhensible',()=>{
  const expectations={
    privacy:[/sur cet appareil/i,/pas de synchronisation automatique/i],
    create:[/ajoute un jeu manuellement/i,/titre/i,/constructeur/i,/console/i,/statut/i,/quantité/i,/Enregistrer/i],
    scan:[/code-barres/i,/caméra/i,/corrig/i,/toi-même|manuell/i],
    configure:[/région/i,/format/i,/statut/i,/quantité/i,/tags/i,/notes/i],
    status:[/Acquis/i,/Commandé/i,/Recherché/i,/exemplaires acquis/i,/filtre/i,/Statut/i,/multisélection/i],
    statistics:[/Détails/i,/Aperçu/i,/Camembert/i,/Frise/i,/remplacent[\s\S]*accueil/i,/plateforme/i,/constructeur/i,/statut/i,/région/i,/format/i,/jeux/i,/exemplaires/i,/fais défiler/i],
    search:[/recherche/i,/filtres en cascade/i,/Réinitialiser[\s\S]*ne supprime aucun jeu/i],
    bulk:[/multisélection/i,/Modifier/i,/région/i,/format/i,/statut/i,/tags/i],
    backup:[/Sauvegarde/i,/JSON/i,/Importer/i,/remplace la collection locale/i,/Aide/i]
  };
  for(const [topic,patterns] of Object.entries(expectations)){
    const block=topicBlock(topic);
    assert.ok(block,`slide ${topic} introuvable`);
    for(const pattern of patterns)assert.match(block,pattern,`contenu manquant dans la slide ${topic} : ${pattern}`);
  }
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

test('la progression visuelle est dynamique et la modale reste adaptée aux petits écrans',()=>{
  assert.match(styleSource,/\.tutorial-dots i\.current/);
  assert.match(styleSource,/\.tutorial-dots i\.complete/);
  assert.doesNotMatch(styleSource,/\.tutorial-progress\[aria-valuenow=/,'la progression ne doit pas être limitée à un nombre fixe de slides');
  assert.match(styleSource,/\.tutorial-pages[^}]*overflow-y:auto/);
  assert.match(styleSource,/\.tutorial-actions button[^}]*min-height:44px/);
  assert.match(styleSource,/@media\(max-width:320px\)/);
  assert.match(styleSource,/env\(safe-area-inset-bottom\)/);
  assert.match(styleSource,/@media\(prefers-reduced-motion:reduce\)/);
});

test('la hauteur du guide est portée par le dialogue sans cycle WebKit',()=>{
  const dialogHeights=cssValues('#tutorialDialog','height');
  const fallbackIndex=dialogHeights.findIndex(value=>/100vh\b/i.test(value));
  const stableIndex=dialogHeights.findIndex(value=>/100svh\b/i.test(value));
  assert.ok(fallbackIndex>=0,'le dialogue doit avoir une hauteur vh explicite');
  assert.ok(stableIndex>fallbackIndex,'la petite hauteur stable doit améliorer le repli vh');
  assert.ok(cssValues('#tutorialDialog','max-height').includes('680px'),'le dialogue doit rester plafonné');

  const shellHeights=cssValues('.tutorial-shell','height');
  assert.ok(shellHeights.some(value=>/100vh\b/i.test(value)),'le shell doit conserver le repli vh');
  assert.ok(shellHeights.some(value=>/100svh\b/i.test(value)),'le shell doit suivre la hauteur stable du dialogue');
  assert.ok(cssValues('.tutorial-shell','max-height').includes('680px'),'le shell doit partager le plafond du dialogue');
  assert.ok(cssValues('.tutorial-shell','min-height').includes('0'),'le shell flex doit pouvoir rétrécir');
  assert.doesNotMatch([...shellHeights,...cssValues('.tutorial-shell','max-height')].join(';'),/100%/,'le shell ne doit plus dépendre d’une hauteur circulaire');
  assert.match(styleSource,/\.tutorial-pages[^}]*min-height:0[^}]*overflow-y:auto/);
  assert.match(styleSource,/\.tutorial-head[^}]*flex:none/);
  assert.match(styleSource,/\.tutorial-actions[^}]*flex:none/);
});

test('le focus du guide ne fait plus défiler le dialogue effondré',()=>{
  const focusFunction=appSource.split(/\r?\n/).find(line=>line.startsWith('function focusTutorialHeading('))||'';
  assert.match(focusFunction,/dialog\.scrollTop=0/);
  assert.match(focusFunction,/pages\.scrollTop=0/);
  assert.match(focusFunction,/focus\(\{preventScroll:true\}\)/);
  const openTutorial=appSource.split(/\r?\n/).find(line=>line.startsWith('function openTutorial('))||'';
  assert.ok(openTutorial.indexOf('.showModal()')>=0);
  assert.ok(openTutorial.indexOf('.showModal()')<openTutorial.indexOf('focusTutorialHeading(0)'),'le focus doit suivre showModal');
  const renderTutorial=appSource.split(/\r?\n/).find(line=>line.startsWith('function renderTutorialStep('))||'';
  assert.match(renderTutorial,/if\(focus\)focusTutorialHeading\(\)/);
});

test('la PWA possède les métadonnées et icônes nécessaires à l’ajout sur l’accueil',async()=>{
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.start_url);
  assert.ok(manifest.scope);
  assert.match(htmlSource,/<meta name="apple-mobile-web-app-capable" content="yes"/);

  const touchTag=htmlSource.match(/<link\b[^>]*rel="apple-touch-icon"[^>]*>/)?.[0]||'';
  assert.equal(attribute(touchTag,'sizes'),'180x180');
  const touchHref=attribute(touchTag,'href');
  assert.ok(touchHref,'apple-touch-icon sans href');
  const touchPath=touchHref.split(/[?#]/,1)[0];
  await access(resolve(ROOT,touchPath.replace(/^\.\//,'')));
  assert.match(workerSource,new RegExp(touchPath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

  for(const size of [192,512]){
    const icon=manifestIcon(size);
    assert.ok(icon,`icône manifest ${size}x${size} introuvable`);
    assert.match(icon.type||'',/^image\/(?:png|webp)$/);
    await access(resolve(ROOT,String(icon.src).replace(/^\.\//,'')));
    assert.match(workerSource,new RegExp(String(icon.src).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
});

test('les ressources du tutoriel utilisent la version active et sont mises en cache',()=>{
  const workerVersion=workerSource.match(/const VERSION=['"]([^'"]+)['"]/)?.[1];
  const appVersion=appSource.match(/const APP_VERSION=['"]([^'"]+)['"]/)?.[1];
  assert.ok(workerVersion,'version du service worker introuvable');
  assert.equal(appVersion,workerVersion);
  assert.match(htmlSource,new RegExp(`tutorial-utils\\.js\\?v=${workerVersion.replaceAll('.','\\.')}`));
  assert.match(workerSource,/tutorial-utils\.js\?v=\$\{VERSION\}/);
  assert.match(styleSource,/#tutorialDialog/);
});
