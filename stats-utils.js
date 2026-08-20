(function attachRetroMaxStats(scope){
  'use strict';

  const KEY='retromax-stats-preferences-v1';
  const METRICS=Object.freeze([
    Object.freeze({id:'games',label:'jeux au total'}),
    Object.freeze({id:'copies',label:'exemplaires acquis'}),
    Object.freeze({id:'platforms',label:'plateformes'}),
    Object.freeze({id:'manufacturers',label:'constructeurs'}),
    Object.freeze({id:'ordered',label:'commandés'}),
    Object.freeze({id:'wanted',label:'recherchés'})
  ]);
  const VIEWS=Object.freeze(['overview','pie','frieze']);
  const GROUPS=Object.freeze(['console','manufacturer','status','region','format']);
  const MEASURES=Object.freeze(['games','copies']);
  const SCOPES=Object.freeze(['all','Acquis','Commandé','Recherché']);
  const DEFAULTS=Object.freeze({cards:Object.freeze(['copies','platforms','wanted']),view:'overview',groupBy:'console',measure:'games',scope:'all'});
  const metricIds=new Set(METRICS.map(metric=>metric.id));

  function resolveStorage(storage){
    if(storage!==undefined)return storage;
    try{return scope.localStorage}catch{return null}
  }

  function normalizePreferences(value={}){
    const cards=[...new Set(Array.isArray(value?.cards)?value.cards.filter(id=>metricIds.has(id)):[])];
    return{
      cards:cards.length?cards:[...DEFAULTS.cards],
      view:VIEWS.includes(value?.view)?value.view:DEFAULTS.view,
      groupBy:GROUPS.includes(value?.groupBy)?value.groupBy:DEFAULTS.groupBy,
      measure:MEASURES.includes(value?.measure)?value.measure:DEFAULTS.measure,
      scope:SCOPES.includes(value?.scope)?value.scope:DEFAULTS.scope
    };
  }

  function loadPreferences(storage){
    try{
      const raw=resolveStorage(storage)?.getItem(KEY);
      return normalizePreferences(raw?JSON.parse(raw):{});
    }catch{return normalizePreferences()}
  }

  function savePreferences(value,storage){
    const normalized=normalizePreferences(value);
    try{resolveStorage(storage)?.setItem(KEY,JSON.stringify(normalized))}catch{}
    return normalized;
  }

  function records(games){return Array.isArray(games)?games.filter(game=>game&&typeof game==='object'):[]}
  function quantity(game){return Math.max(1,Number(game?.quantity)||1)}
  function distinct(items){return new Set(items.filter(Boolean)).size}

  function summary(games){
    const list=records(games);
    return{
      games:list.length,
      copies:list.filter(game=>game.status==='Acquis').reduce((total,game)=>total+quantity(game),0),
      platforms:distinct(list.map(game=>String(game.console||'').trim())),
      manufacturers:distinct(list.map(game=>String(game.manufacturer||'').trim())),
      ordered:list.filter(game=>game.status==='Commandé').length,
      wanted:list.filter(game=>game.status==='Recherché').length
    };
  }

  function groupLabel(game,groupBy){
    const key=groupBy==='console'?'console':groupBy==='manufacturer'?'manufacturer':groupBy;
    const value=String(game?.[key]||'').trim();
    return value||'Non renseigné';
  }

  function distribution(games,preferences={}){
    const settings=normalizePreferences(preferences),totals=new Map();
    const list=records(games).filter(game=>settings.scope==='all'||game.status===settings.scope);
    for(const game of list){
      const label=groupLabel(game,settings.groupBy),value=settings.measure==='copies'?quantity(game):1;
      totals.set(label,(totals.get(label)||0)+value);
    }
    return[...totals].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'fr'));
  }

  scope.RetroMaxStats=Object.freeze({KEY,METRICS,DEFAULTS,normalizePreferences,loadPreferences,savePreferences,summary,distribution});
})(globalThis);
