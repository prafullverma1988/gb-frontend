// ── "Salary banani hai" popup (18 Nov 2026) ───────────────────────────────
// App khulte hi (thodi der baad) server se poochta hai (GET /staff-pay/nudge):
// Team & HR → Settings ki "Salary banane ki tareekh" aa gayi aur pichhle mahine
// ki salary abhi nahi bani? Haan → chhota popup, JAB TAK salary ban na jaye.
// "Baad me" = aaj dobara nahi (isi browser me). Sirf Admin / Accountant ko;
// tareekh na lagi ho ya purana backend ho to kuch nahi dikhta.

import { useEffect, useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import SalarySheetModal from "./SalarySheetModal";

const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const userId = () => { try { return JSON.parse(localStorage.getItem("gb_user") || "{}").id || 0; } catch (_) { return 0; } };
const KEY = () => `gb_salnudge_${userId()}`;
const monthLabel = (p) => { const [y, m] = String(p).split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

export default function SalaryNudge() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let dismissed = null;
    try { dismissed = localStorage.getItem(KEY()); } catch (_) {}
    if (dismissed === todayKey()) return undefined;
    const tm = setTimeout(() => {
      api.get("/staff-pay/nudge")
        .then((r) => { if (r && r.success && r.data && r.data.show) setData(r.data); })
        .catch(() => {});
    }, 6000);
    return () => clearTimeout(tm);
  }, []);
  const later = () => { try { localStorage.setItem(KEY(), todayKey()); } catch (_) {} setData(null); };

  if (!data) return null;
  if (open) {
    const [y, m] = String(data.period).split("-").map(Number);
    return <SalarySheetModal month={m} year={y} onClose={() => { setOpen(false); later(); }} onDone={() => {}} />;
  }
  return (
    <div role="dialog" aria-label={t("snudge.title", { month: monthLabel(data.period) })}
      style={{ position: "fixed", right: 20, bottom: 250, zIndex: 260, width: "min(360px, calc(100vw - 32px))", background: T.surface,
        border: `1px solid ${T.b1}`, borderLeft: `4px solid ${T.red}`, borderRadius: 10, boxShadow: "0 12px 34px rgba(0,0,0,.18)", padding: "13px 15px" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{t("snudge.title", { month: monthLabel(data.period) })}</div>
      <div style={{ fontSize: 12, color: T.t2, marginTop: 3, lineHeight: 1.5 }}>
        {t("snudge.body", { n: data.staff_count, amt: inr(data.estimate) })}
      </div>
      {!data.can_make && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4 }}>{t("snudge.admin_only")}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <button onClick={later} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: `1px solid ${T.b2}`, background: T.surface, color: T.t2, cursor: "pointer", fontFamily: "inherit" }}>{t("snudge.later")}</button>
        <button onClick={() => setOpen(true)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", background: T.blu, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{data.can_make ? t("snudge.open") : t("snudge.view")}</button>
      </div>
    </div>
  );
}
