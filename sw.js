/* sw.js — يجعل «تعمل بلا إنترنت» دعوى صادقة.

⚠️ كان في هذا الملفّ عاملٌ يفكّ التعمية في الطريق — ولم يُنشَر ولا يُسجَّل
   قطّ: شيفرةٌ ميتة. والفكّ يتولّاه سكربت الصفحة وقد ثبت. أمّا الناقص فعلاً
   فهو أن **إعادة التحميل بلا شبكة تقتل الصفحة**: يطلب السيناريو فصلَ
   الاتصال وإعادةَ التحميل ليُظهر أنها تعمل — فقِيس فخرجت شاشةُ خطأ
   المتصفّح. فصار هذا العامل يخزّن البوّابة والمنصّة.
   ⚠️ ولا تُذكَر هنا أسماءُ مدارسَ ولا مفرداتُ محتوىً: حارسُ التسرُّب في
   protect.py يفحص نصَّ هذا الملفّ ويردّه إن وجد شيئاً منها.

السياسة **الشبكة أوّلاً ثم المخزَّن**: من كان متصلاً أخذ الأحدث دائماً (فلا
تعلق مدرسةٌ على نسخةٍ قديمة بعد كل نشر)، ومن انقطع أخذ ما خُزّن. ولا يُخزَّن
مفتاحٌ ولا محتوىً مفكوك — المخزَّن مُعمّىً كما هو على الخادم.
*/
const CACHE = 'ik-app-v1';
const KEEP  = ['./', 'index.html', 'app.enc', 'app.full.enc'];

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(n => n !== CACHE && n.startsWith('ik-app-'))
                         .map(n => caches.delete(n)));
  await self.clients.claim();
})()));

function wanted(u, req) {
  if (u.origin !== self.location.origin) return false;
  if (req.mode === 'navigate') return true;
  const f = u.pathname.split('/').pop();
  return KEEP.includes(f);
}

self.addEventListener('fetch', event => {
  const u = new URL(event.request.url);
  if (event.request.method !== 'GET' || !wanted(u, event.request)) return;
  event.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(event.request);
      if (r && r.ok) { try { c.put(event.request, r.clone()); } catch (_) {} }
      return r;
    } catch (err) {
      const hit = await c.match(event.request, { ignoreSearch: true })
               || await c.match(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
      if (hit) return hit;
      throw err;
    }
  })());
});
