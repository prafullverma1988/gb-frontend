// ── Salary banao — ek sheet (18 Nov 2026) ─────────────────────────────────
// Team & HR ki tay salary aur hazri se bhari aati hai (GET /staff-pay/sheet —
// wahi hisaab jo Create Salary ka preview / finalize chalata hai). Yahan bas:
//   • "Tay mahina" wale ki chhutti katauti haath se ("Hazri se" wale ki apne aap)
//   • head ki rakam — Petrol, Allowance, Bonus, Other, apne head (+ naya head)
// "Salary bana do" = POST /payroll/run/finalize { extras } — har staff ke do due
// bante hain (Salary, Petrol). Ban chuki ho to sheet sirf dikhti hai.
// Bahar-fence punch ka review baaki ho to salary nahi banti (purani rok).

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
const num = (v) => { const n = Number(v); return n > 0 ? Math.round(n * 100) / 100 : 0; };
const monthLabel = (m, y) => new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const prevMonth = () => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth() - 1, 1); return { m: x.getMonth() + 1, y: x.getFullYear() }; };
const shift = (p, n) => { const x = new Date(p.y, p.m - 1 + n, 1); return { m: x.getMonth() + 1, y: x.getFullYear() }; };
const isFuture = (p) => { const d = new Date(); return p.y > d.getFullYear() || (p.y === d.getFullYear() && p.m > d.getMonth() + 1); };

export default function SalarySheetModal({ month, year, onClose, onDone }) {
  const [per, setPer] = useState(month && year ? { m: Number(month), y: Number(year) } : prevMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cuts, setCuts] = useState({});       // staff_id → rakam (string)
  const [cutNotes, setCutNotes] = useState({});
  const [vals, setVals] = useState({});       // staff_id → { head_id: rakam (string) }
  const [cols, setCols] = useState([]);       // dikhne wale head_id
  const [heads, setHeads] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newHead, setNewHead] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr("");
    api.get(`/staff-pay/sheet?month=${per.m}&year=${per.y}`).then((r) => {
      if (!(r && r.success)) { setErr((r && r.message) || t("sps.load_fail")); setData(null); return; }
      const d = r.data;
      setData(d); setHeads(d.heads || []);
      const v = {}; const used = new Set();
      for (const it of d.items) {
        v[it.staff_id] = {};
        for (const h of it.heads || []) { if (h.head_id) { v[it.staff_id][h.head_id] = String(h.amount); used.add(Number(h.head_id)); } }
      }
      const petrol = (d.heads || []).find((h) => h.code === "petrol");
      if (petrol && !d.locked) used.add(Number(petrol.id));
      setVals(v); setCuts({}); setCutNotes({});
      setCols((d.heads || []).filter((h) => used.has(Number(h.id))).map((h) => Number(h.id)));
    }).catch((e) => setErr(e.message || t("sps.load_fail"))).finally(() => setLoading(false));
  }, [per]);
  useEffect(load, [load]);

  const locked = !!(data && data.locked);
  const items = (data && data.items) || [];
  const headOf = (id) => heads.find((h) => Number(h.id) === Number(id));
  const colHeads = cols.map(headOf).filter(Boolean);
  const hidden = heads.filter((h) => !cols.includes(Number(h.id)));

  const calc = useCallback((it) => {
    if (locked) return { cut: it.leave_cut, net: it.net_amount, petrol: it.petrol_amount, total: it.net_amount + it.petrol_amount };
    const cut = it.payment_type === "fixed" ? num(cuts[it.staff_id]) : 0;
    let hs = 0, petrol = 0;
    for (const h of colHeads) {
      const a = num((vals[it.staff_id] || {})[h.id]);
      if (h.bucket === "petrol") petrol += a; else hs += a;
    }
    const net = Math.max(0, it.base_net - cut + hs);
    return { cut, net, petrol, total: net + petrol };
  }, [locked, cuts, vals, colHeads]);
  const totals = useMemo(() => items.reduce((s, it) => { const c = calc(it); return { net: s.net + c.net, petrol: s.petrol + c.petrol, total: s.total + c.total }; }, { net: 0, petrol: 0, total: 0 }), [items, calc]);

  const setVal = (sid, hid, v) => setVals((p) => ({ ...p, [sid]: { ...(p[sid] || {}), [hid]: v } }));
  const addHead = async () => {
    const name = newHead.trim();
    if (name.length < 2) return;
    setBusy(true); setErr("");
    const r = await api.post("/staff-pay/heads", { name }).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) {
      setHeads((p) => [...p, { id: r.data.id, name: r.data.name, bucket: "salary", code: null }]);
      setCols((p) => [...p, Number(r.data.id)]);
      setNewHead(""); setAddOpen(false);
    } else setErr((r && r.message) || t("sps.fail"));
  };

  const make = async () => {
    const label = monthLabel(per.m, per.y);
    if (!(await window.confirmAsync(t("sps.confirm", { month: label, n: items.length, amt: fmt(totals.total) })))) return;
    setBusy(true); setErr("");
    const extras = items.map((it) => ({
      staff_id: it.staff_id,
      cut: it.payment_type === "fixed" ? num(cuts[it.staff_id]) : 0,
      cut_note: (cutNotes[it.staff_id] || "").trim() || undefined,
      heads: colHeads.map((h) => ({ head_id: h.id, amount: num((vals[it.staff_id] || {})[h.id]) })),
    }));
    const r = await api.post("/payroll/run/finalize", { month: per.m, year: per.y, extras }).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) { window.alert(t("sps.made")); if (onDone) onDone(); load(); return; }
    setErr((r && r.message) || t("sps.fail"));
  };

  const th = { fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", padding: "8px 10px", textAlign: "right", background: T.surfaceB, whiteSpace: "nowrap", position: "sticky", top: 0 };
  const td = { fontSize: 12.5, padding: "8px 10px", borderTop: `1px solid ${T.b1}`, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", verticalAlign: "top", color: T.t1 };
  const inp = { width: 84, height: 30, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, fontFamily: "inherit", textAlign: "right", color: T.t1, background: T.surface, boxSizing: "border-box" };
  const btn = (kind, off) => ({ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer", whiteSpace: "nowrap",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });
  const reviews = Number(data && data.pending_reviews) || 0;
  const canMake = !!(data && data.can_make);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 310, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(1080px,100%)", maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("sps.title", { month: monthLabel(per.m, per.y) })}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{locked ? t("sps.locked") : t("sps.sub")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setPer(shift(per, -1))} aria-label={t("sps.prev")} style={{ ...btn("ghost"), padding: "4px 9px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, minWidth: 120, textAlign: "center" }}>{monthLabel(per.m, per.y)}</span>
            <button onClick={() => setPer(shift(per, 1))} disabled={isFuture(shift(per, 1))} aria-label={t("sps.next")} style={{ ...btn("ghost", isFuture(shift(per, 1))), padding: "4px 9px" }}>›</button>
          </div>
          {!locked && !loading && items.length > 0 && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setAddOpen(!addOpen)} style={btn("ghost")}>+ {t("sps.add_head")}</button>
              {addOpen && (
                <div style={{ position: "absolute", right: 0, top: 36, zIndex: 5, width: 250, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 9, boxShadow: "0 12px 30px rgba(0,0,0,.18)", padding: 8 }}>
                  {hidden.map((h) => (
                    <button key={h.id} onClick={() => { setCols((p) => [...p, Number(h.id)]); setAddOpen(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 9px", border: "none", background: "none", fontSize: 12.5, color: T.t1, cursor: "pointer", fontFamily: "inherit", borderRadius: 6 }}>{h.name}</button>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: hidden.length ? 6 : 0, paddingTop: hidden.length ? 8 : 0, borderTop: hidden.length ? `1px solid ${T.b1}` : "none" }}>
                    <input value={newHead} onChange={(e) => setNewHead(e.target.value)} maxLength={40} placeholder={t("sps.new_head_ph")}
                      onKeyDown={(e) => { if (e.key === "Enter") addHead(); }} style={{ ...inp, flex: 1, width: "auto", textAlign: "left" }} />
                    <button onClick={addHead} disabled={busy || newHead.trim().length < 2} style={btn("primary", busy || newHead.trim().length < 2)}>{t("sps.new_head_btn")}</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={onClose} aria-label={t("sps.close")} style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: T.t4, cursor: "pointer" }}>×</button>
        </div>

        {err && <div style={{ padding: "8px 18px", fontSize: 12, color: T.red, background: T.redL }}>{err}</div>}
        {!locked && reviews > 0 && <div style={{ padding: "8px 18px", fontSize: 12, color: T.amb, background: T.ambL }}>{t("sps.reviews", { n: reviews })}</div>}

        <div style={{ overflow: "auto", flex: 1 }}>
          {loading && <div style={{ padding: 28, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("sps.loading")}</div>}
          {!loading && !items.length && !err && <div style={{ padding: "30px 22px", textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("sps.empty")}</div>}
          {!loading && items.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 + colHeads.length * 100 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: "left" }}>{t("sps.col_staff")}</th>
                <th style={th}>{t("sps.col_fixed")}</th>
                <th style={th}>{t("sps.col_att")}</th>
                <th style={th}>{t("sps.col_cut")}</th>
                {colHeads.map((h) => <th key={h.id} style={th}>{h.name}</th>)}
                <th style={th}>{t("sps.col_total")}</th>
                {locked && <><th style={th}>{t("sps.col_paid")}</th><th style={th}>{t("sps.col_due")}</th></>}
              </tr></thead>
              <tbody>
                {items.map((it) => {
                  const c = calc(it);
                  const fixed = it.payment_type === "fixed";
                  const autoCut = !fixed ? Math.max(0, it.full_gross - it.gross_earned) : 0;
                  const missed = (Number(it.days_absent) || 0) + (Number(it.days_unpaid_leave) || 0);
                  const suggest = fixed && missed > 0 && data.wd ? Math.round((it.full_gross / data.wd) * missed) : 0;
                  const paid = (it.settled_salary || 0) + (it.settled_petrol || 0);
                  return (
                    <tr key={it.staff_id}>
                      <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                        <div style={{ fontWeight: 600 }}>{it.staff_name}</div>
                        <div style={{ fontSize: 10.5, color: T.t4 }}>{fixed ? t("sps.type_fixed") : t("sps.type_att")}{it.designation ? " · " + it.designation : ""}</div>
                      </td>
                      <td style={td}>
                        {fmt(it.full_gross)}
                        {it.deductions > 0 && <div style={{ fontSize: 10.5, color: T.t4 }}>{t("sps.ded", { amt: fmt(it.deductions) })}</div>}
                      </td>
                      <td style={td}>
                        {fixed ? t("sps.days", { n: (Number(it.days_present) || 0) + (Number(it.days_half) || 0) * 0.5 }) : `${it.payable_days}/${data.wd}`}
                        {missed > 0 && <div style={{ fontSize: 10.5, color: T.red }}>{t("sps.absent", { n: missed })}</div>}
                      </td>
                      <td style={td}>
                        {locked ? (c.cut > 0 ? fmt(c.cut) : "—") : fixed ? (<>
                          <input type="number" min="0" value={cuts[it.staff_id] || ""} placeholder="0" aria-label={t("sps.col_cut") + " — " + it.staff_name}
                            onChange={(e) => setCuts((p) => ({ ...p, [it.staff_id]: e.target.value }))} style={inp} />
                          {num(cuts[it.staff_id]) > 0 && (
                            <div><input value={cutNotes[it.staff_id] || ""} maxLength={80} placeholder={t("sps.cut_note_ph")}
                              onChange={(e) => setCutNotes((p) => ({ ...p, [it.staff_id]: e.target.value }))} style={{ ...inp, marginTop: 4, textAlign: "left", fontSize: 11.5, height: 26 }} /></div>
                          )}
                          {suggest > 0 && !num(cuts[it.staff_id]) && (
                            <div><button type="button" onClick={() => setCuts((p) => ({ ...p, [it.staff_id]: String(suggest) }))}
                              style={{ border: "none", background: "none", padding: 0, marginTop: 3, fontSize: 10.5, color: T.blu, cursor: "pointer", fontFamily: "inherit" }}>{t("sps.suggest", { days: missed, amt: fmt(suggest) })}</button></div>
                          )}
                        </>) : <span style={{ color: T.t3 }}>{autoCut > 0 ? t("sps.auto", { amt: fmt(autoCut) }) : "—"}</span>}
                      </td>
                      {colHeads.map((h) => {
                        const lockedAmt = locked ? ((it.heads || []).find((x) => Number(x.head_id) === Number(h.id)) || {}).amount : 0;
                        return (
                          <td key={h.id} style={td}>
                            {locked ? (lockedAmt > 0 ? fmt(lockedAmt) : "—") : (
                              <input type="number" min="0" value={(vals[it.staff_id] || {})[h.id] || ""} placeholder="0" aria-label={h.name + " — " + it.staff_name}
                                onChange={(e) => setVal(it.staff_id, h.id, e.target.value)} style={inp} />
                            )}
                          </td>
                        );
                      })}
                      <td style={{ ...td, fontWeight: 700 }}>
                        {fmt(c.total)}
                        {c.petrol > 0 && <div style={{ fontSize: 10.5, fontWeight: 400, color: T.t4 }}>{t("sps.split", { sal: fmt(c.net), pet: fmt(c.petrol) })}</div>}
                      </td>
                      {locked && <>
                        <td style={td}>{fmt(paid)}</td>
                        <td style={{ ...td, color: c.total - paid > 0.5 ? T.red : T.grn, fontWeight: 600 }}>{c.total - paid > 0.5 ? fmt(c.total - paid) : t("sps.all_paid")}</td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && items.length > 0 && (
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: T.surfaceB }}>
            <span style={{ flex: 1, fontSize: 12.5, color: T.t2 }}>
              {t("sps.total_line", { n: items.length, amt: fmt(totals.total) })}
              {totals.petrol > 0 && <span style={{ color: T.t4 }}> · {t("sps.split", { sal: fmt(totals.net), pet: fmt(totals.petrol) })}</span>}
            </span>
            {!locked && !canMake && <span style={{ fontSize: 11.5, color: T.amb }}>{t("sps.only_admin")}</span>}
            <button onClick={onClose} style={btn("ghost")}>{t("sps.close")}</button>
            {!locked && <button onClick={make} disabled={busy || !canMake || reviews > 0} style={btn("primary", busy || !canMake || reviews > 0)}>{busy ? t("sps.making") : t("sps.make")}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
