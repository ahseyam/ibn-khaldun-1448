/* sw.js — يفكّ تعمية صفحات الحقائب في الطريق.
   الصفحة تطلب «حقائب/pack-001.pdf» كما تطلبها على الجهاز المحلي تماماً —
   ولا يوجد على الخادم إلا «حقائب/pack-001.enc». هذا العامل يعترض الطلب،
   ينزّل المُعمّى، يفكّه بالمفتاح الذي في ذاكرته، ويردّ PDF سليماً.
   ⚠️ المفتاح **في الذاكرة فقط**: لا Cache ولا IndexedDB ولا قرص. فإذا أوقف
   المتصفّح العامل وأعاد تشغيله، طلبه من الصفحة المفتوحة فأعادت إرساله. */
let KEY = null, waiters = [];
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('message', e => {
  if (e.data && e.data.key) {
    KEY = e.data.key;
    waiters.splice(0).forEach(fn => fn(KEY));
  }
});
async function key() {
  if (KEY) return KEY;
  const cs = await self.clients.matchAll({ includeUncontrolled: true });
  cs.forEach(c => c.postMessage({ need: 'key' }));
  return new Promise(res => {
    waiters.push(res);
    setTimeout(() => res(KEY), 4000);
  });
}
self.addEventListener('fetch', event => {
  const u = new URL(event.request.url);
  if (u.origin !== self.location.origin || !/\.pdf$/i.test(u.pathname)) return;
  event.respondWith((async () => {
    const raw = await key();
    if (!raw) return new Response('لم يُسلَّم المفتاح بعد', { status: 503 });
    const r = await fetch(u.pathname.replace(/\.pdf$/i, '.enc'), { cache: 'force-cache' });
    if (!r.ok) return new Response('غير موجود', { status: 404 });
    const buf = await r.arrayBuffer();
    const k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const out = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, k, new Uint8Array(buf, 12));
    return new Response(out, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline' } });
  })());
});
