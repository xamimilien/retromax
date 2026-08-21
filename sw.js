const VERSION='0.0.35';
const CACHE=`retromax-public-v${VERSION}`;
const CATALOG_URL=`./assets/data/game-catalog.json?v=${VERSION}`;
const BARCODE_BANK_URL=`./assets/data/barcode-overrides.json?v=${VERSION}`;
const ASSETS=['./','./index.html',`./styles.css?v=${VERSION}`,`./tutorial-utils.js?v=${VERSION}`,`./barcode-utils.js?v=${VERSION}`,`./status-utils.js?v=${VERSION}`,`./stats-utils.js?v=${VERSION}`,`./app.js?v=${VERSION}`,`./assets/vendor/zxing-library-0.23.0.min.js?v=${VERSION}`,CATALOG_URL,BARCODE_BANK_URL,'./manifest.webmanifest','./assets/icons/retromax-180.png','./assets/icons/retromax-192.png','./assets/icons/retromax-512.png','./assets/platforms/playstation.svg','./assets/platforms/playstation-classic.svg','./assets/platforms/playstation2.svg','./assets/platforms/playstation3.svg','./assets/platforms/playstation4.svg','./assets/platforms/playstation5.svg','./assets/platforms/psp.svg','./assets/platforms/psvita.svg','./assets/platforms/super-nintendo.svg','./assets/platforms/nintendo64.svg','./assets/platforms/nintendo-mark.svg','./assets/platforms/nintendo-nes.svg','./assets/platforms/game-boy.svg','./assets/platforms/game-boy-color.svg','./assets/platforms/game-boy-advance.svg','./assets/platforms/nintendo-ds.svg','./assets/platforms/nintendo-3ds.svg','./assets/platforms/nintendo-switch-2.svg','./assets/platforms/master-system.svg','./assets/platforms/mega-drive.svg','./assets/platforms/sega-saturn.svg','./assets/platforms/sega.svg','./assets/platforms/xbox.svg','./assets/platforms/xbox-original.svg','./assets/platforms/xbox-360.svg','./assets/platforms/xbox-one.svg','./assets/platforms/xbox-series.svg','./assets/platforms/nintendo-switch.svg','./assets/platforms/nintendo-wii.svg','./assets/platforms/nintendo-wiiu.svg','./assets/platforms/nintendo-game-boy.svg','./assets/platforms/gamecube.svg','./assets/platforms/dreamcast.svg'].map(path=>path.startsWith('./assets/platforms/')?`${path}?v=${VERSION}`:path);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('retromax-public-v')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

async function cacheFirst(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok)await cache.put(request,response.clone());
  return response;
}

async function networkFirst(request){
  try{
    const response=await fetch(request);
    if(response.ok&&new URL(request.url).origin===self.location.origin){
      const cache=await caches.open(CACHE);
      await cache.put(request.mode==='navigate'?'./':request,response.clone());
    }
    return response;
  }catch(error){
    const cached=await caches.match(request.mode==='navigate'?'./':request);
    if(cached)return cached;
    throw error;
  }
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const localData=url.pathname.endsWith('/assets/data/game-catalog.json')||url.pathname.endsWith('/assets/data/barcode-overrides.json');
  e.respondWith(url.origin===self.location.origin&&localData?cacheFirst(e.request):networkFirst(e.request));
});
