const CACHE='ability-front-web-0.8.0-beta.2';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/ability-front-icon.svg','./assets/ability-front-icon-192.png','./assets/ability-front-icon-512.png','./src/base.css','./src/lan.css','./src/mobile.css','./src/arena.css','./src/app.js','./src/arena-lobby.js','./src/arena-data.js','./src/arena-engine.js','./src/arena-skills.js','./src/arena-controls.js','./src/arena-view.js','./src/arena-peer.js','./src/profile.js','./src/agents.js','./src/unlock-config.js','./src/audio.js','./src/platform.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).pathname.startsWith('/api/'))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok&&new URL(event.request.url).origin===location.origin)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
    return response;
  }).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
