const CACHE='retromax-public-v0.0.02';
const ASSETS=['./','./index.html','./styles.css?v=0.0.02','./app.js?v=0.0.02','./manifest.webmanifest'];
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
