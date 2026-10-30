// ════════════════════════════════════════════════════════════════
// Push notification — PC browser (sanchalanapp.com), 30 Oct 2026.
//
// Wahi Firebase Cloud Messaging jo phone app ka (sanchalan-app
// src/utils/push.js) — backend (gb-backend utils/push.js) ek hi raaste se
// bhejta hai, user ki bhasha me; Role-wise aur "Meri settings" wahan pehle
// hi lag chuke hote hain. Service worker: public/sw-push.js.
//
// Browser ijazat sirf button dabane par maangne deta hai (NotificationBell ki
// line, Settings → Notifications) — enableWebPush. Pehle se Allow ho to login
// par chupchaap token. Logout par server se hatao + browser subscription
// khatam: ek computer par kai log login karte hain.
// ════════════════════════════════════════════════════════════════
import api, { getToken } from "../config/api";

const SENT_KEY = "gb_push_token";       // jo token server par gaya — logout par hatane ke liye

// Firebase project sanchalan-2a57c ka WEB config aur web push (VAPID) ki
// public key. Ye chaabi nahi — har web app ke code me khule hote hain; server
// ki chaabi (service account) sirf Railway me hai.
const FIREBASE_WEB = {
  apiKey: "AIzaSyCt0dt6I9kKzJOg71U_Qm5zFzWT-a1EjzU",
  authDomain: "sanchalan-2a57c.firebaseapp.com",
  projectId: "sanchalan-2a57c",
  storageBucket: "sanchalan-2a57c.firebasestorage.app",
  messagingSenderId: "545385069012",
  appId: "1:545385069012:web:be81a2f12ae249f3193e41",
};
const VAPID_KEY = "BHDvb01nRraabZ_5ig15VKThjV2nujq-sFoZsRpIg8qJrW-42IminY2T9FTXrqV17dFgJ6x94qZhv3TUQe6trn0";
const SW_URL = "/sw-push.js";

export const webPushSupported = () => typeof window !== "undefined" && typeof navigator !== "undefined"
  && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// 'default' (abhi poochha nahi) | 'granted' | 'denied' | 'unsupported'
export const webPushPermission = () => (webPushSupported() ? window.Notification.permission : "unsupported");

// true = server ne token rakh liya (support mode me chhodta hai — wo true nahi).
async function register(token) {
  if (!token) return false;
  const r = await api.post("/notifications/push-token", { token, platform: "web", app_version: "web" });
  if (r && r.success && !r.skipped) {
    try { localStorage.setItem(SENT_KEY, token); } catch (_) { /* storage band */ }
    return true;
  }
  return false;
}

// Firebase JS SDK (bhaari) sirf zaroorat par — alag chunk me.
let _web = null;
async function webMessaging() {
  if (_web) return _web;
  const [{ initializeApp, getApps }, m] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  if (!(await m.isSupported())) return null;
  const app = getApps()[0] || initializeApp(FIREBASE_WEB);
  _web = { m, messaging: m.getMessaging(app) };
  return _web;
}
// Worker ACTIVE hone tak ruko — Firebase di hui registration par ye intezaar
// nahi karta (messaging ka updateSwReg), aur browser install ho rahe worker par
// subscribe mana kar deta hai. 20 s me na ho to galti (button atka na rahe).
async function activeRegistration() {
  await navigator.serviceWorker.register(SW_URL);
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error("sw-push not active in 20 s")), 20000)),
  ]);
}
async function webToken() {
  const reg = await activeRegistration();
  const w = await webMessaging();
  if (!w) return null;
  return w.m.getToken(w.messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
}
// Subscription hi khatam — token apne aap bekaar (FCM backend ko UNREGISTERED
// bolta hai, wo token hata deta hai).
async function dropSub() {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch (_) { /* pehle se nahi */ }
}

// "Chalu karo" — ijazat sabse pehle, button dabate hi. Lautata hai:
// 'granted' | 'denied' | 'default' | 'failed' | 'unsupported'.
export async function enableWebPush() {
  if (!webPushSupported()) return "unsupported";
  const perm = await window.Notification.requestPermission();
  if (perm !== "granted") return perm;
  try {
    const token = await webToken();
    if (!token) return "failed";
    return (await register(token)) ? "granted" : "failed";
  } catch (e) {
    console.error("[push] web token nahi bana:", e && (e.code || e.name), e && e.message);
    return "failed";
  }
}

// Login ke baad — pehle se Allow ho tabhi (bina button ke ijazat nahi maang sakte).
export async function startPush() {
  if (!webPushSupported() || window.Notification.permission !== "granted") return;
  try { await register(await webToken()); } catch (e) {
    console.error("[push] web token nahi bana:", e && (e.code || e.name), e && e.message);
  }
}

// Logout se pehle (App.js handleLogout) — token abhi bhi hai, server ko bata sakte hain.
export async function stopPush() {
  let token = null;
  try { token = localStorage.getItem(SENT_KEY); localStorage.removeItem(SENT_KEY); } catch (_) { /* storage band */ }
  if (token && getToken()) { try { await api.post("/notifications/push-token/remove", { token }); } catch (_) { /* net nahi */ } }
  if (webPushSupported()) await dropSub();
}

// Koi login nahi (session khatam) par browser me pichhla token pada hai — mita do.
export async function dropStalePush() {
  let had = null;
  try { had = localStorage.getItem(SENT_KEY); } catch (_) { return; }
  if (!had) return;
  try { localStorage.removeItem(SENT_KEY); } catch (_) { /* storage band */ }
  if (webPushSupported()) await dropSub();
}

const toItem = (d) => ({
  id: Number(d.notification_id) || null,
  type: d.type || "",
  link: d.link || null,
});

// Band browser ko notification ne khola — sw-push.js data URL me deta hai.
// Ek baar padh kar URL saaf, taaki refresh par dobara na khule.
function takeOpened() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (!q.get("pushn") && !q.get("pusht")) return null;
    const d = { notification_id: q.get("pushn"), type: q.get("pusht"), link: q.get("pushl") };
    ["pushn", "pusht", "pushl"].forEach((k) => q.delete(k));
    const rest = q.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
    return d;
  } catch (_) { return null; }
}

// App mount par ek baar. onOpen(item) — notification dabaayi;
// onForeground() — tab khula tha aur push aaya (ghanti taaza karo).
export function listenPush(onOpen, onForeground) {
  if (!webPushSupported()) return () => {};
  const onMsg = (e) => {
    const m = (e && e.data) || {};
    if (m.type === "san-push-open") onOpen(toItem(m.data || {}));
    else if (m.type === "san-push" && onForeground) onForeground();
  };
  navigator.serviceWorker.addEventListener("message", onMsg);
  const opened = takeOpened();
  if (opened) setTimeout(() => onOpen(toItem(opened)), 0);
  return () => navigator.serviceWorker.removeEventListener("message", onMsg);
}
