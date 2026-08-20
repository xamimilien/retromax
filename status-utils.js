(function attachRetroMaxStatus(scope){
  'use strict';

  const VALUES=Object.freeze(['Acquis','Commandé','Recherché']);
  const BY_KEY=Object.freeze(Object.fromEntries(VALUES.map(value=>[value.toLocaleLowerCase('fr-FR'),value])));

  function normalize(value){
    const key=String(value??'').trim().toLocaleLowerCase('fr-FR');
    return BY_KEY[key]||'Acquis';
  }

  function className(value){
    const normalized=BY_KEY[String(value??'').trim().toLocaleLowerCase('fr-FR')];
    return normalized==='Acquis'?'good':normalized==='Commandé'?'ordered':normalized==='Recherché'?'wanted':'';
  }

  scope.RetroMaxStatus=Object.freeze({VALUES,normalize,className});
})(globalThis);
