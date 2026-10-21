// ── Mahine ke kharche — checklist (Company Expense H2, 21 Oct 2026) ──────
// Expense Library (Library → Expense Library) ke khaakon se is mahine kya
// "aana hai" — har line ki haalat server batata hai (GET /company-expenses/
// checklist): baaki · approval me · dena baaki · ho gaya · chhoda.
//   "Bana do"        → Company Expense form, khaake se pehle se bhara
//   "Is mahine nahi" → wajah ke saath chhodo (zimmedaar / admin)
//   "Wapas lao"      → chhoda hua phir baaki
// Finance ke "Mahine ke kharche" button aur login wale popup (ExpenseNudge)
// dono yahi kholte hain.

import { useCallback, useEffect, useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import CompanyExpenseModal from "./CompanyExpenseModal";

const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const shift = (p, n) => { const [y, m] = p.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (p) => { const [y, m] = p.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };
const dm = (d) => { if (!d) return ""; const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); };

const STATE = {
  pending:     { c: "red", k: "ecl.st_pending" },
  in_approval: { c: "amb", k: "ecl.st_in_approval" },
  to_pay:      { c: "pur", k: "ecl.st_to_pay" },
  done:        { c: "grn", k: "ecl.st_done" },
  skipped:     { c: "slt", k: "ecl.st_skipped" },
};

export default function ExpenseChecklistModal({ onClose, initialMine = true }) {
  const [period, setPeriod] = useState(thisPeriod());
  const [mine, setMine] = useState(initialMine);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [make, setMake] = useState(null);     // row → CompanyExpenseModal
  const [skipFor, setSkipFor] = useState(null); // row id
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr("");
    api.get(`/company-expenses/checklist?period=${period}${mine ? "&mine=1" : ""}`)
      .then((r) => { if (r && r.success) setData(r.data); else setErr((r && r.message) || t("ecl.load_fail")); })
      .catch((e) => setErr(e.message || t("ecl.load_fail")))
      .finally(() => setLoading(false));
  }, [period, mine]);
  useEffect(load, [load]);

  const skip = async (row) => {
    if (why.trim().length < 3) { setErr(t("ecl.skip_why_req")); return; }
    setBusy(true);
    const r = await api.post(`/company-expenses/instances/${row.id}/skip`, { reason: why.trim() }).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) { setSkipFor(null); setWhy(""); load(); } else setErr((r && r.message) || t("ecl.action_fail"));
  };
  const unskip = async (row) => {
    setBusy(true);
    const r = await api.post(`/company-expenses/instances/${row.id}/unskip`, {}).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) load(); else setErr((r && r.message) || t("ecl.action_fail"));
  };

  const rows = (data && data.rows) || [];
  const s = (data && data.summary) || {};
  const future = period > thisPeriod();
  const btn = (kind, off) => ({ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer", whiteSpace: "nowrap",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });

  if (make) {
    return <CompanyExpenseModal preset={make} onClose={() => { setMake(null); load(); }} onSaved={() => {}} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(860px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("ecl.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("ecl.subtitle")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setPeriod(shift(period, -1))} aria-label={t("ecl.prev")} style={{ ...btn("ghost"), padding: "4px 9px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, minWidth: 120, textAlign: "center" }}>{monthLabel(period)}</span>
            <button onClick={() => setPeriod(shift(period, 1))} disabled={period >= thisPeriod()} aria-label={t("ecl.next")} style={{ ...btn("ghost", period >= thisPeriod()), padding: "4px 9px" }}>›</button>
          </div>
          <div style={{ display: "flex", border: `1px solid ${T.b1}`, borderRadius: 7, overflow: "hidden" }}>
            {[[true, t("ecl.mine")], [false, t("ecl.all")]].map(([v, l]) => (
              <button key={l} onClick={() => setMine(v)} style={{ padding: "5px 11px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: mine === v ? T.bluL : T.surface, color: mine === v ? T.blu : T.t3 }}>{l}</button>
            ))}
          </div>
          <button onClick={onClose} aria-label={t("ecl.close")} style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: T.t4, cursor: "pointer" }}>×</button>
        </div>

        {/* Ginti */}
        {!loading && rows.length > 0 && (
          <div style={{ padding: "10px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: T.t3 }}>
            <span><b style={{ color: T.t1 }}>{s.total}</b> {t("ecl.sum_total")}</span>
            <span><b style={{ color: T.red }}>{s.pending}</b> {t("ecl.st_pending")}</span>
            {s.overdue > 0 && <span><b style={{ color: T.red }}>{s.overdue}</b> {t("ecl.sum_overdue")}</span>}
            <span><b style={{ color: T.amb }}>{s.in_approval}</b> {t("ecl.st_in_approval")}</span>
            {s.to_pay > 0 && <span><b style={{ color: T.pur }}>{s.to_pay}</b> {t("ecl.st_to_pay")}</span>}
            <span><b style={{ color: T.grn }}>{s.done}</b> {t("ecl.st_done")}</span>
            {s.skipped > 0 && <span><b style={{ color: T.slt }}>{s.skipped}</b> {t("ecl.st_skipped")}</span>}
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {err && <div style={{ padding: "8px 18px", fontSize: 12, color: T.red, background: T.redL }}>{err}</div>}
          {loading && <div style={{ padding: 28, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("ecl.loading")}</div>}
          {!loading && !rows.length && (
            <div style={{ padding: "30px 22px", textAlign: "center", fontSize: 12.5, color: T.t3, lineHeight: 1.6 }}>
              {future ? t("ecl.future") : mine ? t("ecl.empty_mine") : t("ecl.empty_all")}
              <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6 }}>{t("ecl.empty_hint")}</div>
            </div>
          )}
          {!loading && rows.map((r) => {
            const st = STATE[r.state] || STATE.pending;
            const where = r.location_name || r.project_name || t("ecl.company");
            const who = r.expense_mode === "paid" ? (r.payee_text || "") : (r.party_name || "");
            return (
              <div key={r.id} style={{ padding: "11px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{r.name}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: T[st.c + "L"] || T.surfaceB, color: T[st.c] }}>{t(st.k)}</span>
                    {r.overdue && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.red }}>{t("ecl.overdue_tag")}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>
                    {r.head_name} · {where}{who ? " · " + who : ""} · {t("ecl.mode_" + r.expense_mode)}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
                    {r.due_date ? <b style={{ color: r.overdue ? T.red : T.t2 }}>{t("ecl.due", { date: dm(r.due_date) })}</b> : t("ecl.no_due")}
                    {r.state === "to_pay" && r.remaining != null ? " · " + t("ecl.to_pay_amt", { amt: inr(r.remaining) }) : ""}
                    {(r.state === "done" || r.state === "in_approval") && r.t_amount != null ? " · " + inr(r.t_amount) + (r.txn_id ? ` (#${r.txn_id})` : "") : ""}
                    {r.state === "skipped" && r.skip_reason ? " · “" + r.skip_reason + "”" : ""}
                    {!mine && r.responsible_name ? " · " + t("ecl.resp", { name: r.responsible_name }) : ""}
                  </div>
                  {skipFor === r.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                      <input autoFocus value={why} onChange={(e) => setWhy(e.target.value)} maxLength={250} placeholder={t("ecl.skip_why_ph")}
                        onKeyDown={(e) => { if (e.key === "Enter") skip(r); }}
                        style={{ flex: 1, height: 30, padding: "0 9px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                      <button onClick={() => skip(r)} disabled={busy} style={btn("primary", busy)}>{t("ecl.skip_ok")}</button>
                      <button onClick={() => { setSkipFor(null); setWhy(""); }} style={btn("ghost")}>{t("ecl.cancel")}</button>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", minWidth: 90 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                    {r.amount_type === "fixed" && r.amount ? inr(r.amount) : r.amount ? "~" + inr(r.amount) : "—"}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{r.amount_type === "fixed" ? t("ecl.fixed") : t("ecl.variable")}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {r.state === "pending" && skipFor !== r.id && (<>
                    <button onClick={() => { setSkipFor(r.id); setWhy(""); setErr(""); }} style={btn("ghost")}>{t("ecl.skip")}</button>
                    <button onClick={() => setMake(r)} style={btn("primary")}>{t("ecl.make")}</button>
                  </>)}
                  {r.state === "skipped" && <button onClick={() => unskip(r)} disabled={busy} style={btn("ghost", busy)}>{t("ecl.unskip")}</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
