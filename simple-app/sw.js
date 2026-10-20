/* Hygo — cache hors ligne. Réseau d’abord (les mises à jour arrivent tout de suite), cache en secours.
   Seuls les fichiers du site sont mis en cache : les appels à Supabase (données privées) ne le sont jamais. */
const CACHE='hygo-v5';
const ASSETS=['./','./index.html','./js/theme-init.js','./js/config.js','./js/auth.js','./js/vendor/supabase.umd.min.js','./js/engine.js','./js/app.js','./manifest.webmanifest','./favicon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',e=>{
  // cache:'reload' : on ignore le cache HTTP pour ne pas enregistrer une ancienne version.
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(
    // no-cache : vérification auprès du serveur à chaque chargement (304 si rien n’a changé).
    fetch(e.request,{cache:'no-cache'}).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
