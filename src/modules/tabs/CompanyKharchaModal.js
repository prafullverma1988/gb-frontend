// ── Company ke kharche — ek ghar (18 Nov 2026) ────────────────────────────
// Company Expense, Expense Library, salary aur salary wallet pehle se the par
// paanch jagah bikhre the. Ye ek screen unhe jodti hai (GET /staff-pay/home):
//   • tile — is mahine kul / staff ka paisa / office aur baaki / dena baaki
//   • staff ka paisa — us mahine ki salary + petrol + aur head, kitna diya,
//     kitna baaki, "Do" (StaffPayModal). Naam dabao → mahine-wise bani / mili.
//   • har mahine ke kharche — Expense Library ki list, "Bana do"
//   • baaki kharche — head-wise (wahi niyam jo Reports → Company Expense)
// Salary nahi bani to laal patti / "Salary banao" (SalarySheetModal).
// Mahina ‹ › aur city filter (city na ho to Central) sab par lagta hai.

import { useCallback, useEffect, useState } from "react";
import api from "../../config/api";
import PickSelect from "../../components/PickSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { can } from "../../utils/perms";
import CompanyExpenseModal from "./CompanyExpenseModal";
import ExpenseChecklistModal from "./ExpenseChecklistModal";
import SalarySheetModal from "./SalarySheetModal";
import StaffPayModal from "./StaffPayModal";

const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const shift = (p, n) => { const [y, m] = p.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (p) => { const [y, m] = p.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };
const ym = (p) => { const [y, m] = p.split("-").map(Number); return { y, m }; };
const dm = (d) => { if (!d) return ""; const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); };
const STATE = { pending: "red", in_approval: "amb", to_pay: "pur", done: "grn", skipped: "slt" };

// Ek staff ka mahine-wise: kitni bani, kab kitna mila, kitna baaki — Salary aur Petrol alag.
function StaffHistory({ partyId }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let live = true;
    api.get(`/wallets/salary/summary?staff_party_id=${partyId}`).then((r) => { if (live) setD(r && r.success ? r.data : {}); }).catch(() => { if (live) setD({}); });
    return () => { live = false; };
  }, [partyId]);
  if (!d) return <div style={{ padding: "10px 14px", fontSize: 12, color: T.t4 }}>{t("ckh.loading")}</div>;
  const Col = ({ title, months }) => (
    <div style={{ flex: "1 1 280px", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{title}</div>
      {!(months && months.length) && <div style={{ fontSize: 12, color: T.t4 }}>{t("ckh.hist_none")}</div>}
      {(months || []).slice(0, 12).map((m) => (
        <div key={m.year + "-" + m.month} style={{ padding: "6px 0", borderTop: `1px solid ${T.b1}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
            <b style={{ color: T.t1 }}>{monthLabel(`${m.year}-${String(m.month).padStart(2, "0")}`)}</b>
            <span style={{ color: m.balance > 0.5 ? T.red : T.grn, fontWeight: 600 }}>{m.balance > 0.5 ? t("ckh.hist_due", { amt: inr(m.balance) }) : t("ckh.paid_full")}</span>
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>
            {t("ckh.hist_made", { amt: inr(m.due) })}
            {(m.lines || []).length > 0 && " · " + m.lines.map((l) => `${l.name} ${inr(l.amount)}`).join(" + ")}
            {m.leave_cut > 0 && " · " + t("ckh.hist_cut", { amt: inr(m.leave_cut) })}
          </div>
          {(m.payments || []).map((p, i) => (
            <div key={i} style={{ fontSize: 11.5, color: T.t3 }}>{dm(p.date || p.at)} · {inr(p.amount)}{p.method ? " · " + p.method : ""}</div>
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "10px 14px 12px", background: T.surfaceB }}>
      <Col title={t("ckh.c_salary")} months={d.months} />
      <Col title={t("ckh.c_petrol")} months={d.petrol && d.petrol.months} />
    </div>
  );
}

export default function CompanyKharchaModal({ accounts, onClose, onChanged }) {
  const [period, setPeriod] = useState(thisPeriod());
  const [city, setCity] = useState("");
  const [data, setData] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(null);     // { m, y } → SalarySheetModal
  const [payFor, setPayFor] = useState(null);   // staff row → StaffPayModal
  const [openStaff, setOpenStaff] = useState(null);
  const [addExp, setAddExp] = useState(null);   // true | checklist row (preset)
  const [showList, setShowList] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr("");
    Promise.all([
      api.get(`/staff-pay/home?period=${period}${city ? "&city=" + city : ""}`),
      api.get(`/company-expenses/checklist?period=${period}`).catch(() => null),
    ]).then(([h, c]) => {
      if (h && h.success) setData(h.data); else setErr((h && h.message) || t("ckh.load_fail"));
      setList(c && c.success ? (c.data.rows || []) : []);
    }).catch((e) => setErr(e.message || t("ckh.load_fail"))).finally(() => setLoading(false));
  }, [period, city]);
  useEffect(load, [load]);
  const changed = () => { load(); if (onChanged) onChanged(); };

  const tiles = (data && data.tiles) || {};
  const sal = (data && data.salary) || {};
  const staff = (data && data.staff) || [];
  const tot = (data && data.staff_totals) || {};
  const others = (data && data.others) || [];
  const canAdd = can("Finance", "create");
  const future = period > thisPeriod();

  const card = { border: `1px solid ${T.b1}`, borderRadius: 10, background: T.surface, overflow: "hidden", flexShrink: 0 };
  const secHead = { padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${T.b1}` };
  const th = { fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", padding: "7px 12px", textAlign: "right", background: T.surfaceB, whiteSpace: "nowrap" };
  const td = { fontSize: 12.5, padding: "8px 12px", borderTop: `1px solid ${T.b1}`, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: T.t1 };
  const btn = (kind, off) => ({ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer", whiteSpace: "nowrap",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });
  const dash = (n) => (n > 0 ? inr(n) : "—");

  if (addExp) {
    return <CompanyExpenseModal preset={addExp === true ? undefined : addExp} onClose={() => { setAddExp(null); changed(); }} onSaved={() => {}} />;
  }
  if (showList) return <ExpenseChecklistModal initialMine={false} onClose={() => { setShowList(false); changed(); }} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.bg || T.surfaceB, borderRadius: 12, width: "min(1100px,100%)", maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, background: T.surface, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("ckh.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("ckh.sub")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setPeriod(shift(period, -1))} aria-label={t("ckh.prev")} style={{ ...btn("ghost"), padding: "4px 9px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, minWidth: 120, textAlign: "center" }}>{monthLabel(period)}</span>
            <button onClick={() => setPeriod(shift(period, 1))} disabled={period >= thisPeriod()} aria-label={t("ckh.next")} style={{ ...btn("ghost", period >= thisPeriod()), padding: "4px 9px" }}>›</button>
          </div>
          {data && data.cities && data.cities.length > 0 && (
            <PickSelect value={city} onChange={(e) => setCity(e.target.value)}
              style={{ height: 32, padding: "0 8px", borderRadius: 6, border: `1px solid ${T.b2}`, fontSize: 12, background: T.surface, color: T.t1, fontFamily: "inherit" }}>
              <option value="">{t("ckh.all_cities")}</option>
              {data.cities.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              <option value="central">{t("ckh.central")}</option>
            </PickSelect>
          )}
          {canAdd && <button onClick={() => setAddExp(true)} style={btn("primary")}>+ {t("ckh.add")}</button>}
          <button onClick={onClose} aria-label={t("ckh.close")} style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: T.t4, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <div style={{ padding: "8px 12px", fontSize: 12, color: T.red, background: T.redL, borderRadius: 8 }}>{err}</div>}
          {loading && !data && <div style={{ padding: 28, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("ckh.loading")}</div>}

          {data && (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, flexShrink: 0 }}>
              {[[t("ckh.t_month"), tiles.month_total, T.t1, null],
                [t("ckh.t_staff"), tiles.staff_total, T.t1, null],
                [t("ckh.t_other"), tiles.other_total, T.t1, null],
                [t("ckh.t_open"), tiles.open_total, tiles.open_total > 0 ? T.red : T.grn, t("ckh.t_open_sub", { a: inr(tiles.staff_open), b: inr(tiles.bills_open) })]].map(([l, v, c, sub]) => (
                <div key={l} style={{ ...card, padding: "11px 14px" }}>
                  <div style={{ fontSize: 11.5, color: T.t3 }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{inr(v)}</div>
                  {sub && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{sub}</div>}
                </div>
              ))}
            </div>

            {sal.pending && (
              <div style={{ padding: "9px 14px", borderRadius: 9, background: T.redL, border: `1px solid ${T.redM}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: T.red }}>
                  {t("ckh.pending", { month: monthLabel(sal.pending.period) })}
                  <span style={{ fontWeight: 400 }}> · {t("ckh.pending_est", { n: sal.pending.staff_count, amt: inr(sal.pending.estimate) })}</span>
                </span>
                <button onClick={() => setSheet(ym(sal.pending.period))} style={btn("primary")}>{t("ckh.make_salary")}</button>
              </div>
            )}

            {/* Staff ka paisa */}
            <div style={card}>
              <div style={secHead}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("ckh.sec_staff", { month: monthLabel(period) })}</span>
                {sal.made && <button onClick={() => setSheet(ym(period))} style={btn("ghost")}>{t("ckh.view_sheet")}</button>}
              </div>
              {!sal.made && (
                <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: T.t3 }}>
                    {sal.estimate ? t("ckh.not_made_est", { n: sal.estimate.staff_count, amt: inr(sal.estimate.estimate) }) : future ? t("ckh.future") : t("ckh.not_made")}
                  </span>
                  {sal.estimate && !future && <button onClick={() => setSheet(ym(period))} style={btn("primary")}>{t("ckh.make_salary")}</button>}
                </div>
              )}
              {sal.made && !staff.length && <div style={{ padding: 14, fontSize: 12.5, color: T.t4 }}>{t("ckh.no_staff_city")}</div>}
              {staff.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                    <thead><tr>
                      <th style={{ ...th, textAlign: "left" }}>{t("ckh.c_staff")}</th>
                      <th style={th}>{t("ckh.c_salary")}</th><th style={th}>{t("ckh.c_petrol")}</th><th style={th}>{t("ckh.c_extra")}</th>
                      <th style={th}>{t("ckh.c_paid")}</th><th style={th}>{t("ckh.c_due")}</th><th style={th} />
                    </tr></thead>
                    <tbody>
                      {staff.map((s) => (<StaffRow key={s.party_id} s={s} td={td} btn={btn} dash={dash} open={openStaff === s.party_id}
                        onToggle={() => setOpenStaff(openStaff === s.party_id ? null : s.party_id)} canPay={!!data.can_pay} onPay={() => setPayFor(s)} />))}
                      <tr>
                        <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{t("ckh.total")}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{dash(tot.salary)}</td><td style={{ ...td, fontWeight: 700 }}>{dash(tot.petrol)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{dash(tot.extras)}</td><td style={{ ...td, fontWeight: 700 }}>{dash(tot.paid)}</td>
                        <td style={{ ...td, fontWeight: 700, color: tot.remaining > 0.5 ? T.red : T.grn }}>{tot.remaining > 0.5 ? inr(tot.remaining) : t("ckh.paid_full")}</td>
                        <td style={td} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Har mahine ke kharche */}
            <div style={card}>
              <div style={secHead}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("ckh.sec_monthly")}</span>
                {list.length > 0 && <button onClick={() => setShowList(true)} style={btn("ghost")}>{t("ckh.monthly_all")}</button>}
              </div>
              {!list.length && <div style={{ padding: 14, fontSize: 12.5, color: T.t4, lineHeight: 1.6 }}>{t("ckh.monthly_empty")}</div>}
              {list.map((r, i) => {
                const sk = STATE[r.state] ? r.state : "pending";
                const c = STATE[sk];
                const amount = (r.state === "done" || r.state === "in_approval" || r.state === "to_pay") && r.t_amount != null ? inr(r.t_amount)
                  : r.amount ? (r.amount_type === "fixed" ? "" : "~") + inr(r.amount) : "—";
                return (
                  <div key={r.id} style={{ padding: "9px 14px", borderTop: i ? `1px solid ${T.b1}` : "none", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.name}</span>
                      <span style={{ fontSize: 11.5, color: T.t3 }}> · {r.location_name || r.project_name || t("ckh.central")}{r.due_date ? " · " + dm(r.due_date) : ""}</span>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{amount}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: T[c + "L"] || T.surfaceB, color: T[c] }}>{t("ckh.st_" + sk)}</span>
                    {r.state === "pending" && canAdd && <button onClick={() => setAddExp(r)} style={btn("primary")}>{t("ckh.make_it")}</button>}
                  </div>
                );
              })}
            </div>

            {/* Baaki kharche — head-wise */}
            <div style={card}>
              <div style={secHead}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("ckh.sec_other")}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{inr(tiles.other_total)}</span>
              </div>
              {!others.length && <div style={{ padding: 14, fontSize: 12.5, color: T.t4 }}>{t("ckh.other_empty")}</div>}
              {others.map((o, i) => (
                <div key={(o.head_id || 0) + "-" + i} style={{ padding: "8px 14px", borderTop: i ? `1px solid ${T.b1}` : "none", display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                  <span style={{ color: T.t1 }}>{o.head || t("ckh.no_head")} <span style={{ color: T.t4, fontSize: 11.5 }}>· {t("ckh.entries", { n: o.n })}</span></span>
                  <b style={{ color: T.t1, fontVariantNumeric: "tabular-nums" }}>{inr(o.amount)}</b>
                </div>
              ))}
            </div>
          </>)}
        </div>
      </div>
      {sheet && <SalarySheetModal month={sheet.m} year={sheet.y} onClose={() => { setSheet(null); changed(); }} onDone={changed} />}
      {payFor && <StaffPayModal staff={{ id: payFor.party_id, name: payFor.name }} accounts={accounts}
        initialPurpose={payFor.salary_remaining > 0.5 ? "salary" : payFor.petrol_remaining > 0.5 ? "petrol" : undefined}
        onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); changed(); }} />}
    </div>
  );
}

function StaffRow({ s, td, btn, dash, open, onToggle, canPay, onPay }) {
  return (<>
    <tr>
      <td style={{ ...td, textAlign: "left" }}>
        <button type="button" onClick={onToggle} aria-expanded={open}
          style={{ border: "none", background: "none", padding: 0, font: "inherit", fontWeight: 600, color: T.blu, cursor: "pointer", textAlign: "left" }}>{s.name}</button>
        {s.leave_cut > 0 && <div style={{ fontSize: 10.5, color: T.t4 }}>{t("ckh.hist_cut", { amt: inr(s.leave_cut) })}</div>}
      </td>
      <td style={td}>{dash(s.salary)}</td><td style={td}>{dash(s.petrol)}</td><td style={td}>{dash(s.extras)}</td><td style={td}>{dash(s.paid)}</td>
      <td style={{ ...td, fontWeight: 600, color: s.remaining > 0.5 ? T.red : T.grn }}>
        {s.remaining > 0.5 ? inr(s.remaining) : t("ckh.paid_full")}
        {s.hold && s.remaining > 0.5 && <div style={{ fontSize: 10.5, fontWeight: 400, color: T.amb }}>{t("ckh.hold")}</div>}
      </td>
      <td style={td}>{canPay && s.remaining > 0.5 && <button onClick={onPay} style={btn("primary")}>{t("ckh.pay")}</button>}</td>
    </tr>
    {open && <tr><td colSpan={7} style={{ padding: 0, borderTop: `1px solid ${T.b1}` }}><StaffHistory partyId={s.party_id} /></td></tr>}
  </>);
}
