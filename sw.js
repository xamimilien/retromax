const CACHE='retromax-public-v0.0.07';
const ASSETS=['./','./index.html','./styles.css?v=0.0.07','./app.js?v=0.0.07','./manifest.webmanifest','./assets/platforms/playstation.svg','./assets/platforms/playstation-classic.svg','./assets/platforms/playstation2.svg','./assets/platforms/playstation3.svg','./assets/platforms/playstation4.svg','./assets/platforms/playstation5.svg','./assets/platforms/psp.svg','./assets/platforms/psvita.svg','./assets/platforms/super-nintendo.svg','./assets/platforms/nintendo64.svg','./assets/platforms/master-system.svg','./assets/platforms/mega-drive.svg','./assets/platforms/sega-saturn.svg','./assets/platforms/sega.svg','./assets/platforms/xbox.svg','./assets/platforms/nintendo-switch.svg','./assets/platforms/nintendo-wii.svg','./assets/platforms/nintendo-wiiu.svg','./assets/platforms/nintendo-game-boy.svg','./assets/platforms/gamecube.svg','./assets/platforms/dreamcast.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

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
  if(e.request.method==='GET')e.respondWith(networkFirst(e.request));
});
