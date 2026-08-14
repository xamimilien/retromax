(function attachRetroMaxBarcode(scope){
  'use strict';

  function normalize(raw){
    const text=String(raw??'').trim();
    if(/[A-Za-z]/.test(text))return'';
    const digits=text.replace(/\D/g,'');
    return /^\d{8,14}$/.test(digits)?digits:'';
  }

  function checksum(raw){
    const code=normalize(raw);
    if(![8,12,13,14].includes(code.length))return null;
    const body=code.slice(0,-1);
    const sum=[...body].reduce((total,digit,index)=>{
      const positionFromRight=body.length-index;
      return total+Number(digit)*(positionFromRight%2?3:1);
    },0);
    return(10-sum%10)%10;
  }

  function canonicalGtin(raw){
    const code=normalize(raw),expected=checksum(code);
    if(expected===null||Number(code.at(-1))!==expected)return'';
    return code.padStart(14,'0');
  }

  function lookupCandidates(raw){
    const code=normalize(raw);
    if(!code)return[];
    const candidates=[code];
    if(code.length===12)candidates.push(`0${code}`);
    let equivalent=code;
    while(equivalent.length>12&&equivalent.startsWith('0')){
      equivalent=equivalent.slice(1);
      candidates.push(equivalent);
    }
    return [...new Set(candidates)];
  }

  function firstUsableItem(payload,isSupported=()=>true){
    if(!Array.isArray(payload))return null;
    return payload.find(item=>item&&typeof item==='object'&&String(item.name||'').trim()&&isSupported(item))||null;
  }

  function validateLocalBarcodeCatalog(catalog){
    if(!catalog||catalog.schema!==1||typeof catalog.version!=='string'||!catalog.version||!/^\d{4}-\d{2}-\d{2}$/.test(String(catalog.updatedAt||''))||!String(catalog.license||'').trim()||!Array.isArray(catalog.entries)||!catalog.entries.length)return false;
    const seen=new Set();
    return catalog.entries.every(entry=>{
      if(!entry||typeof entry!=='object')return false;
      const key=canonicalGtin(entry.gtin14);
      if(!key||key!==entry.gtin14||seen.has(key))return false;
      if(!String(entry.title||'').trim()||!String(entry.manufacturer||'').trim()||!String(entry.console||'').trim())return false;
      if(!Array.isArray(entry.observedCodes)||!entry.observedCodes.length||new Set(entry.observedCodes).size!==entry.observedCodes.length||!entry.observedCodes.every(code=>canonicalGtin(code)===key))return false;
      const source=entry.source;
      if(!source||!String(source.kind||'').trim()||!String(source.reference||'').trim()||!/^\d{4}-\d{2}-\d{2}$/.test(String(source.checkedAt||'')))return false;
      seen.add(key);
      return true;
    });
  }

  function findLocalBarcodeEntry(catalog,raw){
    const key=canonicalGtin(raw);
    if(!key||!validateLocalBarcodeCatalog(catalog))return null;
    return catalog.entries.find(entry=>entry.gtin14===key)||null;
  }

  function withAbortSignal(promise,signal){
    if(!signal)return Promise.resolve(promise);
    const aborted=()=>{const error=new Error('aborted');error.name='AbortError';return error};
    if(signal.aborted)return Promise.reject(aborted());
    return new Promise((resolve,reject)=>{
      const onAbort=()=>{signal.removeEventListener('abort',onAbort);reject(aborted())};
      signal.addEventListener('abort',onAbort,{once:true});
      Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',onAbort);resolve(value)},error=>{signal.removeEventListener('abort',onAbort);reject(error)});
    });
  }

  async function optimizeStream(stream){
    const track=stream?.getVideoTracks?.()[0];
    if(!track?.getCapabilities||!track?.applyConstraints)return false;
    try{
      const capabilities=track.getCapabilities()||{};
      const focusModes=Array.isArray(capabilities.focusMode)?capabilities.focusMode:[];
      if(!focusModes.includes('continuous'))return false;
      await track.applyConstraints({advanced:[{focusMode:'continuous'}]});
      return true;
    }catch{
      return false;
    }
  }

  scope.RetroMaxBarcode=Object.freeze({normalize,checksum,canonicalGtin,lookupCandidates,firstUsableItem,validateLocalBarcodeCatalog,findLocalBarcodeEntry,withAbortSignal,optimizeStream});
})(globalThis);
