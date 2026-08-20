(function attachRetroMaxTutorial(scope){
  'use strict';

  const KEY='retromax-tutorial-seen-v2';

  function resolveStorage(storage){
    if(storage!==undefined)return storage;
    try{return scope.localStorage}catch{return null}
  }

  function hasSeen(storage){
    try{return resolveStorage(storage)?.getItem(KEY)==='1'}catch{return false}
  }

  function markSeen(storage){
    try{const target=resolveStorage(storage);if(!target)return false;target.setItem(KEY,'1');return true}catch{return false}
  }

  function clampStep(index,count){
    const last=Math.max(0,Math.trunc(Number(count)||0)-1);
    return Math.min(last,Math.max(0,Math.trunc(Number(index)||0)));
  }

  scope.RetroMaxTutorial=Object.freeze({KEY,hasSeen,markSeen,clampStep});
})(globalThis);
