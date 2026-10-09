const CACHE='ziwei-reader-v21';
const ASSETS=['./','./index.html','./styles.css','./app.js','./fullbook.js','./fullbook.json','./fullbook-units.json','./fullbook-explanations.json','./chart-ui.js','./chart-match.js','./palace-flight.js','./vendor/iztro-2.6.1.min.js','./content.json','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const asset of ASSETS){try{const response=await fetch(asset,{credentials:'same-origin'});if(response.ok&&new URL(response.url).origin===self.location.origin)await cache.put(asset,response.clone());}catch{}}await self.skipWaiting();})());
});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if(name!==CACHE)await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}catch{const cached=await caches.match(request);if(cached)return cached;if(request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();return Response.error();}})());
});
