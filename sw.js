/* سرویس‌ورکر پرامپت یار — کش پوستهٔ سایت برای بارگذاری آفلاین */
const CACHE = 'promptyar-v6';
const CORE = [
  './',
  './index.html',
  './prompts.js',
  './app.js',
  './fonts/vazirmatn-arabic.woff2',
  './fonts/vazirmatn-latin.woff2',
  './fonts/lalezar-arabic.woff2',
  './fonts/lalezar-latin.woff2',
  './fonts/ibmplexmono-latin.woff2',
  './favicon.svg',
  './site.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // فقط پاسخ‌های هم‌مبدأ کش می‌شوند
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
