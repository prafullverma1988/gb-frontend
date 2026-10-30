// ════════════════════════════════════════════════════════════════
// Sanchalan web (PC browser) — push ka service worker (30 Oct 2026).
//
// Browser band / tab chhupa ho tab bhi notification. Token src/utils/push.js
// banata hai (Firebase, isi registration par); bhejta backend utils/push.js
// hai — wahi FCM jo phone ko.
//
// Jaan-boojh kar Firebase SDK ke bina, aur `fetch` handler NAHI — web ka
// load / cache pehle jaisa. Purana public/sw.js (cache wala) 21 Aug 2026 se
// register nahi hota; jis browser me wo ab bhi baitha hai, wahan ye usi scope
// par uski jagah le leta hai — uska bacha cache (gb-buildcon-*) yahin saaf.
// ════════════════════════════════════════════════════════════════
/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('gb-buildcon-')).map((k) => caches.delete(k)));
  } catch (_) { /* cache API nahi */ }
  await self.clients.claim();
})()));

const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true });

self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch (_) { p = {}; }
  const n = p.notification || {};
  const d = p.data || {};
  const title = n.title || d.title || 'Sanchalan';
  const body = n.body || d.body || '';
  event.waitUntil((async () => {
    // Khule tab ki ghanti turant taaza. Notification phir bhi dikhao — browser
    // har push par dikhana maangta hai.
    (await windows()).forEach((c) => c.postMessage({ type: 'san-push', data: d }));
    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      tag: d.notification_id ? 'n' + d.notification_id : undefined,
      data: d,
    });
  })());
});

// Dabaya → khula tab ho to usi ko aage lao aur jagah bata do (App.js →
// handleNotifNav, ghanti jaisa); warna web kholo, data URL me.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  event.waitUntil((async () => {
    const list = await windows();
    for (const c of list) {
      if ('focus' in c) {
        await c.focus();
        c.postMessage({ type: 'san-push-open', data: d });
        return;
      }
    }
    const q = new URLSearchParams();
    if (d.notification_id) q.set('pushn', d.notification_id);
    if (d.type) q.set('pusht', d.type);
    if (d.link) q.set('pushl', d.link);
    await self.clients.openWindow('/?' + q.toString());
  })());
});
