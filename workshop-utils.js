(function attachRetroMaxWorkshop(scope){
  'use strict';

  const KEY='retromax-workshop-v1-private';
  const CONDITIONS=Object.freeze(['OK','Semi-HS','HS']);
  const STATUSES=Object.freeze(['Acquis','Commandé','Recherché']);
  const COMPLETENESS=Object.freeze(['Loose','Boîte','Complet','Incomplet']);
  const ACCESSORIES=Object.freeze([
    Object.freeze({id:'controller',label:'Manette'}),
    Object.freeze({id:'powerSupply',label:'Alimentation externe'}),
    Object.freeze({id:'powerCable',label:'Câble d’alimentation'}),
    Object.freeze({id:'videoCable',label:'Câble vidéo'}),
    Object.freeze({id:'sensorCamera',label:'Capteur / caméra'}),
    Object.freeze({id:'gamepad',label:'GamePad'}),
    Object.freeze({id:'dock',label:'Dock'}),
    Object.freeze({id:'expansionPak',label:'Jumper Pak / Expansion Pak'}),
    Object.freeze({id:'memoryCard',label:'VMU / carte mémoire'})
  ]);

  function resolveStorage(storage){
    if(storage!==undefined)return storage;
    try{return scope.localStorage}catch{return null}
  }

  function text(value,fallback=''){return String(value??fallback).trim()}
  function lookup(value=''){return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g,' ').trim()}
  function consoleQuantity(value){return Math.max(1,Math.round(Number(value)||1))}
  function partQuantity(value){return Math.max(0,Math.round(Number(value)||0))}
  function price(value){const numeric=Number(String(value??'').replace(',','.'));return Number.isFinite(numeric)&&numeric>0?Math.round(numeric*100)/100:0}
  function condition(value){
    const normalized=text(value).toLocaleLowerCase('fr').replace(/[\s_]+/g,'-');
    if(normalized==='hs')return'HS';
    if(normalized==='semi-hs'||normalized==='semihs')return'Semi-HS';
    return'OK';
  }
  function status(value){
    const normalized=lookup(value);
    return STATUSES.find(item=>lookup(item)===normalized)||'Acquis';
  }
  function completeness(value){
    const normalized=lookup(value);
    const aliases={complete:'Complet',incomplete:'Incomplet',icomplete:'Incomplet',box:'Boîte',boxed:'Boîte'};
    return COMPLETENESS.find(item=>lookup(item)===normalized)||aliases[normalized]||'';
  }
  function accessories(value){
    const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    return ACCESSORIES.reduce((result,item)=>{
      if(Object.prototype.hasOwnProperty.call(source,item.id))result[item.id]=Boolean(source[item.id]);
      return result;
    },{});
  }
  function accessoryOptions(consoleName='',variant=''){
    const consoleKey=lookup(consoleName),variantKey=lookup(variant);
    const handheld=/game boy|game gear|nintendo ds|nintendo 3ds|\bpsp\b|ps vita/.test(consoleKey);
    const switchLite=/\bswitch\b/.test(consoleKey)&&/\blite\b/.test(variantKey);
    const xboxOneInternal=/xbox one/.test(consoleKey)&&/^(s|s all digital|x)$/.test(variantKey);
    const internalPower=(/playstation 1/.test(consoleKey)&&!/ps one/.test(variantKey))
      ||/playstation (3|4|5)|saturn|dreamcast|^xbox$|xbox series/.test(consoleKey)
      ||(/playstation 2/.test(consoleKey)&&!/slim/.test(variantKey))
      ||xboxOneInternal;
    const ids=[];
    if(!handheld&&!switchLite)ids.push('controller');
    ids.push(internalPower?'powerCable':'powerSupply');
    if(!handheld&&!switchLite)ids.push('videoCable');
    if(/\bwii\b|wii u|\bvr\b/.test(consoleKey))ids.push('sensorCamera');
    if(/wii u/.test(consoleKey))ids.push('gamepad');
    if(/nintendo switch 2|\bswitch\b/.test(consoleKey)&&!switchLite)ids.push('dock');
    if(/nintendo 64|\bn64\b/.test(consoleKey))ids.push('expansionPak');
    if(/playstation (1|2)|dreamcast|gamecube|nintendo 64|\bn64\b|saturn/.test(consoleKey))ids.push('memoryCard');
    return ids.map(id=>ACCESSORIES.find(item=>item.id===id)).filter(Boolean);
  }
  function repairHistory(value){
    return(Array.isArray(value)?value:[]).filter(entry=>entry&&typeof entry==='object').map((entry,index)=>({
      id:text(entry.id,`repair-${index}`),
      date:/^\d{4}-\d{2}-\d{2}$/.test(text(entry.date))?text(entry.date):'',
      description:text(entry.description||entry.intervention),
      cost:price(entry.cost??entry.price)
    })).filter(entry=>entry.date||entry.description||entry.cost);
  }
  function repairTotal(value){return Math.round(repairHistory(value).reduce((sum,entry)=>sum+entry.cost,0)*100)/100}

  function normalizeConsole(entry={},index=0){
    return{
      id:text(entry.id,`console-${index}`),
      manufacturer:text(entry.manufacturer,'Autre'),
      console:text(entry.console,'Console non précisée'),
      variant:text(entry.variant),
      status:status(entry.status),
      completeness:completeness(entry.completeness),
      accessories:accessories(entry.accessories),
      purchasePrice:price(entry.purchasePrice),
      repairs:repairHistory(entry.repairs||entry.repairHistory),
      condition:condition(entry.condition),
      quantity:consoleQuantity(entry.quantity),
      issue:text(entry.issue),
      notes:text(entry.notes)
    };
  }

  function normalizePart(entry={},index=0){
    return{
      id:text(entry.id,`part-${index}`),
      manufacturer:text(entry.manufacturer,'Autre'),
      name:text(entry.name,'Pièce non précisée'),
      console:text(entry.console),
      variant:text(entry.variant),
      quantity:partQuantity(entry.quantity),
      location:text(entry.location),
      notes:text(entry.notes)
    };
  }

  function normalize(value={}){
    const source=value&&typeof value==='object'?value:{};
    return{
      consoles:(Array.isArray(source.consoles)?source.consoles:[]).filter(item=>item&&typeof item==='object').map(normalizeConsole),
      parts:(Array.isArray(source.parts)?source.parts:[]).filter(item=>item&&typeof item==='object').map(normalizePart)
    };
  }

  function load(storage){
    try{
      const raw=resolveStorage(storage)?.getItem(KEY);
      return normalize(raw?JSON.parse(raw):{});
    }catch{return normalize()}
  }

  function save(value,storage){
    const normalized=normalize(value);
    try{resolveStorage(storage)?.setItem(KEY,JSON.stringify(normalized))}catch{}
    return normalized;
  }

  function summary(value){
    const state=normalize(value),result={consoles:0,ok:0,semiHs:0,hs:0,parts:0,partReferences:state.parts.length};
    for(const item of state.consoles){
      result.consoles+=item.quantity;
      if(item.condition==='OK')result.ok+=item.quantity;
      else if(item.condition==='Semi-HS')result.semiHs+=item.quantity;
      else result.hs+=item.quantity;
    }
    for(const item of state.parts)result.parts+=item.quantity;
    return result;
  }

  function filter(value,criteria={}){
    const state=normalize(value),manufacturer=text(criteria.manufacturer),statusFilter=text(criteria.status),completenessFilter=text(criteria.completeness),query=text(criteria.query).toLocaleLowerCase('fr');
    const matches=item=>(!manufacturer||item.manufacturer===manufacturer)&&(!query||JSON.stringify(item).toLocaleLowerCase('fr').includes(query));
    return{
      consoles:state.consoles.filter(item=>matches(item)&&(!statusFilter||item.status===statusFilter)&&(!completenessFilter||item.completeness===completenessFilter)),
      parts:statusFilter||completenessFilter?[]:state.parts.filter(matches)
    };
  }

  function groupByManufacturer(value){
    const state=normalize(value),groups=new Map();
    const ensure=manufacturer=>{if(!groups.has(manufacturer))groups.set(manufacturer,{manufacturer,consoles:[],parts:[]});return groups.get(manufacturer)};
    state.consoles.forEach(item=>ensure(item.manufacturer).consoles.push(item));
    state.parts.forEach(item=>ensure(item.manufacturer).parts.push(item));
    return[...groups.values()].sort((a,b)=>a.manufacturer.localeCompare(b.manufacturer,'fr')).map(group=>({
      ...group,
      consoles:group.consoles.sort((a,b)=>a.console.localeCompare(b.console,'fr')),
      parts:group.parts.sort((a,b)=>a.name.localeCompare(b.name,'fr'))
    }));
  }

  function suggest(values,query='',limit=8){
    const needle=lookup(query),seen=new Set(),entries=[];
    for(const value of Array.isArray(values)?values:[]){
      const label=text(value),key=lookup(label);
      if(!label||seen.has(key)||needle&&!key.includes(needle))continue;
      seen.add(key);entries.push({label,key,prefix:needle&&key.startsWith(needle)?0:1});
    }
    const ranked=needle?entries.sort((a,b)=>a.prefix-b.prefix||a.label.localeCompare(b.label,'fr')):entries;
    return ranked.slice(0,Math.max(1,Number(limit)||8)).map(entry=>entry.label);
  }

  scope.RetroMaxWorkshop=Object.freeze({KEY,CONDITIONS,STATUSES,COMPLETENESS,ACCESSORIES,condition,status,completeness,accessories,accessoryOptions,price,repairHistory,repairTotal,normalize,load,save,summary,filter,groupByManufacturer,suggest});
})(globalThis);
