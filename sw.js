/* ذُرى — عامل الخدمة: العمل دون إنترنت + استقبال الإشعارات */
const CACHE = 'dhura-v85';
const CACHE_PREFIX = 'dhura-v';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './quran.json',
  './mdn_h.json',
  './mdn_c.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// الشبكة أولًا للصفحة حتى تصل التحديثات، ثم النسخة المحفوظة عند انقطاع الإنترنت
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return; // الصوت والخطوط من مصادرها مباشرة
  const nav = e.request.mode === 'navigate'; // صفحة التطبيق تُراجَع مع الخادم دائمًا فلا تعلق نسخة قديمة في كاش الجوال
  e.respondWith(
    fetch(e.request, nav ? { cache: 'no-cache' } : undefined)
      .then(async r => {
        if (r.ok) {
          try {
            const cache = await caches.open(CACHE);
            await cache.put(e.request, r.clone());
          } catch (error) {
            console.warn('تعذّر تحديث ملف في ذاكرة ذُرى دون اتصال:', error);
          }
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(r => {
        if (r) return r;
        return nav ? caches.match('./index.html') : Response.error();
      }))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
