// ── Mahine ke kharche ka popup (Company Expense H2, 21 Oct 2026) ─────────
// App khulte hi (thodi der baad) server se poochta hai: is user ke zimmedaari
// wale kharche is mahine baaki hain aur checklist tareekh (default 25) aa gayi
// — ya koi tareekh nikal chuki? (GET /company-expenses/checklist/nudge)
// Haan → chhota popup: "Checklist kholo" / "Baad me". "Baad me" = aaj nahi
// dikhega (din ke hisaab se, isi browser me). Server ka jawab na aaye (purana
// backend) to kuch nahi dikhta.

import { useEffect, useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import ExpenseChecklistModal from "./ExpenseChecklistModal";

const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const userId = () => { try { return JSON.parse(localStorage.getItem("gb_user") || "{}").id || 0; } catch (_) { return 0; } };
const KEY = () => `gb_expnudge_${userId()}`;
const dm = (d) => { if (!d) return ""; const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); };

export default function ExpenseNudge() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let dismissed = null;
    try { dismissed = localStorage.getItem(KEY()); } catch (_) {}
    if (dismissed === todayKey()) return undefined;
    const tm = setTimeout(() => {
      api.get("/company-expenses/checklist/nudge")
        .then((r) => { if (r && r.success && r.data && r.data.show) setData(r.data); })
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(tm);
  }, []);
  const later = () => { try { localStorage.setItem(KEY(), todayKey()); } catch (_) {} setData(null); };

  if (open) return <ExpenseChecklistModal initialMine onClose={() => { setOpen(false); later(); }} />;
  if (!data) return null;
  return (
    <div role="dialog" aria-label={t("enudge.title")}
      style={{ position: "fixed", right: 20, bottom: 90, zIndex: 260, width: "min(360px, calc(100vw - 32px))", background: T.surface,
        border: `1px solid ${T.b1}`, borderLeft: `4px solid ${data.overdue ? T.red : T.amb}`, borderRadius: 10, boxShadow: "0 12px 34px rgba(0,0,0,.18)", padding: "13px 15px" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{t("enudge.title")}</div>
      <div style={{ fontSize: 12, color: T.t2, marginTop: 3, lineHeight: 1.5 }}>
        {t("enudge.body", { n: data.pending })}{data.overdue ? " " + t("enudge.overdue", { n: data.overdue }) : ""}
      </div>
      <div style={{ marginTop: 7, fontSize: 11.5, color: T.t3, lineHeight: 1.6 }}>
        {(data.items || []).slice(0, 4).map((i) => (
          <div key={i.id} style={{ color: i.overdue ? T.red : T.t3 }}>• {i.name}{i.due_date ? " — " + dm(i.due_date) : ""}</div>
        ))}
        {data.pending > 4 && <div>{t("enudge.more", { n: data.pending - 4 })}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <button onClick={later} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: `1px solid ${T.b2}`, background: T.surface, color: T.t2, cursor: "pointer", fontFamily: "inherit" }}>{t("enudge.later")}</button>
        <button onClick={() => setOpen(true)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", background: T.blu, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{t("enudge.open")}</button>
      </div>
    </div>
  );
}
