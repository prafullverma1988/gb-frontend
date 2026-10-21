// ── Udhaar register (Company Expense H5a, 21 Oct 2026) ───────────────────
// Finance → Accounts panel → "Udhaar register". Company ne kisi party ko diya
// udhaar: mool, byaaj ka rate (mahina / saal %), kis mahine se byaaj. Har mahine
// ki tareekh ko pichhle mahine ka byaaj apne aap "Party par charge" (byaaj)
// ban kar approval me jaata hai (din ke hisaab se — beech mahine mool aaya to bhi
// sahi). Mool wapas aaya / aur diya yahan likho — asli paisa Finance ki Payment
// Received / Made se hi. Server: /api/company-expenses/loans.

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import PickSelect from "../../components/PickSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dm = (d) => { if (!d) return "—"; const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); };
const mon = (p) => { const [y, m] = String(p).split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" }); };
const addM = (p, n) => { const [y, m] = p.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export default function LoanRegisterModal({ onClose }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const [parties, setParties] = useState([]);
  const [busy, setBusy] = useState(false);
  const [move, setMove] = useState({ kind: "repay", amount: "", date: today(), note: "" });
  const [chargeP, setChargeP] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/company-expenses/loans").then((r) => { if (r && r.success) { setLoans(r.data || []); setErr(""); } else setErr((r && r.message) || t("loan.load_fail")); })
      .catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    api.get("/finance/parties").then((r) => { if (r && r.success) setParties((r.data || []).filter((p) => !Number(p.is_staff))); }).catch(() => {});
  }, [load]);
  const partyOpts = useMemo(() => parties.map((p) => ({ key: p.id, label: p.name, sub: p.type || "" })), [parties]);

  const run = async (fn) => { setBusy(true); setErr(""); const r = await fn().catch((e) => ({ message: e.message })); setBusy(false);
    if (r && r.success) { load(); return true; } setErr((r && r.message) || t("loan.fail")); return false; };
  const saveNew = async () => {
    const f = form;
    if (!f.party || !(Number(f.principal) > 0) || !f.start_date) { setErr(t("loan.need_basic")); return; }
    if (await run(() => api.post("/company-expenses/loans", { party_id: Number(f.party), principal: Number(f.principal), rate_pct: Number(f.rate) || 0,
      rate_per: f.per, start_date: f.start_date, charge_from: f.charge_from, interest_day: Number(f.day) || 1, auto_charge: f.auto, note: f.note }))) setForm(null);
  };
  const saveMove = async (l) => {
    if (!(Number(move.amount) > 0)) { setErr(t("loan.need_amount")); return; }
    if (await run(() => api.post(`/company-expenses/loans/${l.id}/moves`, { kind: move.kind, amount: Number(move.amount), date: move.date, note: move.note })))
      setMove({ kind: "repay", amount: "", date: today(), note: "" });
  };

  const L = { display: "block", fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 4 };
  const I = { width: "100%", boxSizing: "border-box", height: 32, padding: "0 9px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" };
  const btn = (kind, off) => ({ padding: "6px 13px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer", whiteSpace: "nowrap",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });
  const thisP = today().slice(0, 7);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(880px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("loan.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("loan.subtitle")}</div>
          </div>
          {!form && <button onClick={() => setForm({ party: "", principal: "", rate: "", per: "month", start_date: today(), charge_from: thisP, day: "1", auto: true, note: "" })} style={btn("primary")}>+ {t("loan.new")}</button>}
          <button onClick={onClose} aria-label={t("loan.close")} style={{ border: "none", background: "none", fontSize: 20, color: T.t4, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 18px" }}>
          {err && <div style={{ padding: "8px 12px", fontSize: 12, color: T.red, background: T.redL, borderRadius: 7, marginBottom: 10 }}>{err}</div>}

          {form && (
            <div style={{ border: `1px solid ${T.bluM}`, background: T.bluL, borderRadius: 9, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{t("loan.new")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: "span 2" }}><label style={L}>{t("loan.party")} *</label><SearchSelect value={form.party} options={partyOpts} onChange={(k) => setForm({ ...form, party: k })} placeholder={t("loan.party_ph")} theme={T} /></div>
                <div><label style={L}>{t("loan.principal")} *</label><input type="number" min="0" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} style={I} /></div>
                <div><label style={L}>{t("loan.date")} *</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, charge_from: e.target.value.slice(0, 7) > form.charge_from ? e.target.value.slice(0, 7) : form.charge_from })} style={I} /></div>
                <div><label style={L}>{t("loan.rate")}</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="1.5" style={{ ...I, width: 80 }} />
                    <PickSelect value={form.per} onChange={(e) => setForm({ ...form, per: e.target.value })} style={{ ...I, width: "auto" }} aria-label={t("loan.rate")}>
                      <option value="month">{t("loan.per_month")}</option><option value="year">{t("loan.per_year")}</option>
                    </PickSelect>
                  </div></div>
                <div><label style={L} title={t("loan.from_tip")}>{t("loan.from")}</label><input type="month" value={form.charge_from} min={form.start_date.slice(0, 7)} onChange={(e) => setForm({ ...form, charge_from: e.target.value })} style={I} /></div>
                <div><label style={L}>{t("loan.day")}</label><input type="number" min="1" max="28" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} style={I} /></div>
              </div>
              <label style={{ fontSize: 12, color: T.t2, display: "flex", gap: 6, alignItems: "center", marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.auto} onChange={(e) => setForm({ ...form, auto: e.target.checked })} /> {t("loan.auto")}
              </label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t("loan.note_ph")} style={{ ...I, marginBottom: 8 }} />
              <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10 }}>{t("loan.new_hint")}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setForm(null)} style={btn("ghost")}>{t("loan.cancel")}</button>
                <button onClick={saveNew} disabled={busy} style={btn("primary", busy)}>{t("loan.save")}</button>
              </div>
            </div>
          )}

          {loading && <div style={{ padding: 24, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("loan.loading")}</div>}
          {!loading && !loans.length && !form && <div style={{ padding: 28, textAlign: "center", color: T.t3, fontSize: 12.5 }}>{t("loan.empty")}</div>}
          {!loading && loans.map((l) => {
            const isOpen = open === l.id;
            const live = (l.charges || []).filter((c) => !["rejected", "cancelled"].includes(c.status || "") && c.approval_status !== "rejected");
            const months = []; for (let p = l.charge_from; p < thisP && months.length < 36; p = addM(p, 1)) if (!live.some((c) => c.expense_period === p)) months.push(p);
            return (
              <div key={l.id} style={{ border: `1px solid ${T.b1}`, borderRadius: 9, marginBottom: 10, opacity: l.status === "active" ? 1 : 0.6 }}>
                <div onClick={() => setOpen(isOpen ? null : l.id)} style={{ padding: "11px 14px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 220px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{l.party_name} {l.status !== "active" && <span style={{ fontSize: 10.5, color: T.slt }}>· {t("loan.closed")}</span>}</div>
                    <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
                      {t("loan.line", { amt: inr(l.principal), date: dm(l.start_date), rate: Number(l.rate_pct), per: l.rate_per === "year" ? t("loan.per_year") : t("loan.per_month") })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>{t("loan.outstanding")}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{inr(l.outstanding)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>{t("loan.charged")}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.grn }}>{inr(l.interest_charged)}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.t3, minWidth: 140 }}>
                    {l.status === "active" ? (l.auto_charge ? t("loan.next", { date: dm(l.next_charge), amt: inr(l.monthly_interest_now) }) : t("loan.manual_only")) : ""}
                    {l.pending_charges > 0 && <div style={{ color: T.amb, fontWeight: 600 }}>{t("loan.pending", { n: l.pending_charges })}</div>}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.b1}`, padding: "10px 14px", background: T.surfaceB }}>
                    {l.note && <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>“{l.note}”</div>}
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", marginBottom: 4 }}>{t("loan.moves")}</div>
                    <div style={{ fontSize: 12, color: T.t2, marginBottom: 6 }}>
                      {dm(l.start_date)} · {t("loan.given")} {inr(l.principal)}
                      {(l.moves || []).map((m) => <div key={m.id}>{dm(m.date)} · {m.kind === "repay" ? t("loan.repay") : t("loan.topup")} {inr(m.amount)}{m.note ? " · " + m.note : ""}</div>)}
                    </div>
                    {l.status === "active" && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                        <PickSelect value={move.kind} onChange={(e) => setMove({ ...move, kind: e.target.value })} style={{ ...I, width: "auto" }} aria-label={t("loan.moves")}>
                          <option value="repay">{t("loan.repay")}</option><option value="topup">{t("loan.topup")}</option>
                        </PickSelect>
                        <input type="number" min="0" value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} placeholder={t("loan.amount")} style={{ ...I, width: 120 }} />
                        <input type="date" value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value })} style={{ ...I, width: 140 }} />
                        <input value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} placeholder={t("loan.move_note")} style={{ ...I, flex: 1, minWidth: 120 }} />
                        <button onClick={() => saveMove(l)} disabled={busy} style={btn("primary", busy)}>{t("loan.add_move")}</button>
                      </div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", marginBottom: 4 }}>{t("loan.charges")}</div>
                    {!(l.charges || []).length ? <div style={{ fontSize: 12, color: T.t4, marginBottom: 8 }}>{t("loan.no_charges")}</div> : (
                      <div style={{ fontSize: 12, color: T.t2, marginBottom: 8 }}>
                        {l.charges.map((c) => (
                          <div key={c.id}>{mon(c.expense_period)} · {inr(c.amount)} · <span style={{ color: c.approval_status === "pending" ? T.amb : c.approval_status === "rejected" ? T.red : T.grn }}>
                            {c.approval_status === "pending" ? t("loan.st_pending") : c.approval_status === "rejected" ? t("loan.st_rejected") : t("loan.st_done")}</span> (#{c.id})</div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {l.status === "active" && months.length > 0 && (<>
                        <PickSelect value={chargeP} onChange={(e) => setChargeP(e.target.value)} style={{ ...I, width: "auto" }} aria-label={t("loan.charge_now")}>
                          <option value="">{t("loan.pick_month")}</option>
                          {months.map((p) => <option key={p} value={p}>{mon(p)}</option>)}
                        </PickSelect>
                        <button onClick={() => chargeP && run(() => api.post(`/company-expenses/loans/${l.id}/charge`, { period: chargeP }))} disabled={busy || !chargeP} style={btn("primary", busy || !chargeP)}>{t("loan.charge_now")}</button>
                      </>)}
                      <span style={{ flex: 1 }} />
                      {l.status === "active" && <button onClick={() => run(() => api.put(`/company-expenses/loans/${l.id}`, { auto_charge: l.auto_charge ? 0 : 1 }))} style={btn("ghost")}>{l.auto_charge ? t("loan.auto_off") : t("loan.auto_on")}</button>}
                      <button onClick={async () => { if (l.status === "active" && !(await window.confirmAsync(t("loan.close_confirm")))) return; run(() => api.put(`/company-expenses/loans/${l.id}`, { status: l.status === "active" ? "closed" : "active" })); }} style={btn("ghost")}>
                        {l.status === "active" ? t("loan.close_loan") : t("loan.reopen")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6, lineHeight: 1.5 }}>{t("loan.foot")}</div>
        </div>
      </div>
    </div>
  );
}
