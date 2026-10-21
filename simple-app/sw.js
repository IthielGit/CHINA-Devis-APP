/* Hygo — cache hors ligne. Réseau d’abord (les mises à jour arrivent tout de suite), cache en secours.
   Seuls les fichiers du site sont mis en cache : les appels à Supabase (données privées) ne le sont jamais. */
const CACHE='hygo-v5';
const ASSETS=['./','./index.html','./js/theme-init.js','./js/config.js','./js/auth.js','./js/vendor/supabase.umd.min.js','./js/engine.js','./js/pdf.js','./js/app.js','./manifest.webmanifest','./favicon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
