/* ScholarFlow v2026.11 static shell offline cache. Private research records and WorkBuddy Cloud APIs are never cached. */
const CACHE='scholarflow-app-shell-2026-11-15-otp-context';
const SHELL=['./','./index.html','./styles.css','./research-suite.css','./app.js','./research-suite.js','./pdf-intelligence.js','./pwa.js','./manifest.webmanifest','./assets/graduate-bear.svg','./assets/icon-192.png','./assets/icon-512.png','./online.css','./cloud.css','./cloud-config.js','./cloud-sync.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of SHELL){try{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}catch(_){}}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('scholarflow-app-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const u=new URL(req.url);if(u.origin!==self.location.origin)return;
 if(u.pathname.includes('/api/')||u.pathname.includes('/auth/')||u.pathname.includes('/rest/')||req.headers.has('authorization'))return;
 const scopePath=new URL(self.registration?.scope||self.location.origin+'/',self.location.origin).pathname;
 if(!u.pathname.startsWith(scopePath))return;
 const rel=u.pathname.slice(scopePath.length);
 const allowed=new Set(['','index.html','styles.css','research-suite.css','app.js','research-suite.js','pdf-intelligence.js','pwa.js','manifest.webmanifest','online.css','cloud.css','cloud-config.js','cloud-sync.js','assets/graduate-bear.svg','assets/icon-192.png','assets/icon-512.png']);
 if(!allowed.has(rel))return;
 event.respondWith((async()=>{
  // Deploy updates should not be stuck behind a stale cached index/config.
  // No private cloud API responses are ever cached by this service worker.
  const netFirst=req.mode==='navigate'||u.pathname.endsWith('/cloud-config.js');
  const cached=await caches.match(req,{ignoreSearch:true});
  if(cached&&!netFirst)return cached;
  try{const fresh=await fetch(req);if(fresh.ok&&fresh.type==='basic'){const copy=fresh.clone();const cache=await caches.open(CACHE);await cache.put(req,copy)}return fresh}
  catch(_){if(cached)return cached;if(req.mode==='navigate'){return (await caches.match('./index.html'))||Response.error()}return Response.error()}
 })());
});
