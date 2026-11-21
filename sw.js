const V='testmaster-v2',SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const put=(req,r)=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(V).then(c=>c.put(req,cp))}return r};
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const same=new URL(req.url).origin===location.origin;
  if(same){ // propios: red primero (así se ven las actualizaciones), caché si no hay conexión
    e.respondWith(fetch(req).then(r=>put(req,r)).catch(()=>caches.match(req).then(h=>h||caches.match('./index.html'))));
  }else{ // pdf.js / tesseract: caché primero, se guardan la primera vez
    e.respondWith(caches.match(req).then(h=>h||fetch(req).then(r=>put(req,r))));
  }
});
