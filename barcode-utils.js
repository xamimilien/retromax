(function attachRetroMaxBarcode(scope){
  'use strict';

  function normalize(raw){
    const text=String(raw??'').trim();
    if(/[A-Za-z]/.test(text))return'';
    const digits=text.replace(/\D/g,'');
    return /^\d{8,14}$/.test(digits)?digits:'';
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

  scope.RetroMaxBarcode=Object.freeze({normalize,lookupCandidates,firstUsableItem,optimizeStream});
})(globalThis);
