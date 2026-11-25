const CACHE_NAME='bawabet-static-v4';
const STATIC_ASSETS=['/','/assets/images/logo.png','/assets/images/favicon.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET') return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin || request.mode==='navigate') return;
 if(!/\.(?:css|js|png|jpe?g|webp|svg|woff2?)$/i.test(url.pathname)) return;
 event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
   return response;
 }).catch(()=>caches.match(request)));
});