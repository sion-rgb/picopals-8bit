const VERSION="picopals-v3.0.0";
const base=new URL(self.registration.scope).pathname;
const shell=[base,`${base}index.html`,`${base}manifest.webmanifest`,`${base}offline.html`,`${base}pixel-icon-sheet.svg`,`${base}icons/icon-192.png`,`${base}icons/icon-512.png`];
const cacheShell=()=>caches.open(VERSION).then(cache=>cache.addAll(shell));
self.addEventListener("install",event=>event.waitUntil(cacheShell()));
self.addEventListener("activate",event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("picopals-")&&k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();if(event.data?.type==="CACHE_OFFLINE")event.waitUntil(cacheShell())});
self.addEventListener("fetch",event=>{const req=event.request,url=new URL(req.url);if(req.method!=="GET"||url.origin!==location.origin)return;if(req.mode==="navigate"){event.respondWith(fetch(req).then(res=>{if(res.ok)caches.open(VERSION).then(c=>c.put(req,res.clone()));return res}).catch(async()=>await caches.match(req,{ignoreVary:true})||await caches.match(base,{ignoreVary:true})||await caches.match(`${base}offline.html`,{ignoreVary:true})));return}event.respondWith(caches.match(req,{ignoreVary:true}).then(hit=>hit||fetch(req).then(res=>{if(res.ok&&res.status!==404)caches.open(VERSION).then(c=>c.put(req,res.clone()));return res}).catch(()=>new Response("Offline",{status:503,statusText:"Offline"}))))});
