// "Is computer par bhi notification" (30 Oct 2026) — PC browser push ka button.
// Do jagah: NotificationBell ke dropdown me ek line (sirf jab ijazat abhi
// poochhi nahi gayi; "Baad me" = 7 din chup), aur Settings → Notifications →
// Meri settings me is browser ki haalat (chalu / band / chalu karo).
// Browser ijazat sirf button dabane par maangne deta hai — utils/push.js.
import { useState } from "react";
import { t } from "../i18n";
import { webPushPermission, enableWebPush } from "../utils/push";

const SNOOZE_KEY = "gb_push_hint_snooze_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const snoozed = () => { try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; } };

const C = { t1: "#0F172A", t2: "#475569", pri: "#2563EB", green: "#059669", amber: "#D97706", b1: "#E2E8F0", soft: "#EFF6FF" };
const btn = (primary) => ({
  padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  border: `1px solid ${primary ? C.pri : C.b1}`, background: primary ? C.pri : "#FFFFFF", color: primary ? "#FFFFFF" : C.t1,
});

export default function BrowserPush({ variant = "bell" }) {
  const [perm, setPerm] = useState(() => webPushPermission());
  const [result, setResult] = useState(null);     // is baar button ka nateeja
  const [hidden, setHidden] = useState(() => variant === "bell" && snoozed());
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    const r = await enableWebPush();
    setBusy(false);
    if (r === "granted" || r === "denied") setPerm(r);
    setResult(r === "default" ? null : r);
  };
  const msgOf = (r) => (r === "granted" ? t("web_push.done") : r === "denied" ? t("web_push.denied") : t("web_push.failed"));

  if (variant === "bell") {
    if (hidden) return null;
    if (result) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${C.b1}`, background: C.soft }}>
          <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.45, color: result === "granted" ? C.green : C.amber }}>{msgOf(result)}</div>
          <button onClick={() => setHidden(true)} style={btn(false)}>{t("web_push.ok")}</button>
        </div>
      );
    }
    if (perm !== "default") return null;
    const later = () => {
      try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* private mode */ }
      setHidden(true);
    };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${C.b1}`, background: C.soft }}>
        <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.45, color: C.t2 }}>{t("web_push.bell_hint")}</div>
        <button onClick={later} disabled={busy} style={btn(false)}>{t("web_push.later")}</button>
        <button onClick={enable} disabled={busy} style={btn(true)}>{busy ? "…" : t("web_push.enable")}</button>
      </div>
    );
  }

  // Settings — is browser ki haalat hamesha.
  const state = perm === "unsupported" ? t("web_push.unsupported")
    : perm === "granted" ? t("web_push.on")
    : perm === "denied" ? t("web_push.denied") : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>{t("web_push.label")}:</div>
      {state && <div style={{ fontSize: 12.5, color: perm === "granted" ? C.green : C.amber }}>{state}</div>}
      {perm === "default" && (
        <button onClick={enable} disabled={busy} style={btn(true)}>{busy ? "…" : t("web_push.enable")}</button>
      )}
      {result && result !== "granted" && result !== "denied" && (
        <div style={{ fontSize: 12.5, color: C.amber }}>{msgOf(result)}</div>
      )}
    </div>
  );
}
