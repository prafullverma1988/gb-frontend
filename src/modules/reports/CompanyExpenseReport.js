// ── Reports → Company kharcha (Company Expense H3, 21 Oct 2026) ─────────
// Company ka wo kharcha jo kisi project ka nahi (office, store, poori company):
//   • head / jagah / city × mahina ki table (Excel bhi)
//   • aage kya dena hai — baaki bill + Expense Library ke "aana hai"
//   • chhoote — beete mahinon ke Expense Library kharche jo bane hi nahi
//   • company ka asli munafa — projects ka P&L − company kharcha (shuru se)
// Server: GET /api/company-expenses/report — jod wahi niyam (utils/txnCleared)
// jo khaate / party / P&L lagate hain. Bina project ki material kharid store ka
// stock hai, kharcha nahi — isliye yahan nahi.

import { useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import SearchSelect from "../../components/SearchSelect";
import { t } from "../../i18n";

const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthName = (ym) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }); };
const dm = (d) => { if (!d) return "—"; const [y, m, dd] = String(d).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); };
function monthsIn(from, to) {
  const out = []; let [y, m] = from.slice(0, 7).split("-").map(Number); const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } if (out.length > 36) break; }
  return out;
}
const RANGES = {
  this_month: () => { const d = new Date(); return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(d)]; },
  last6: () => { const d = new Date(); return [iso(new Date(d.getFullYear(), d.getMonth() - 5, 1)), iso(d)]; },
  fy: () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return [`${y}-04-01`, iso(d)]; },
};
const BUCKET = { overdue: "red", week: "amb", month: "blu", later: "slt", no_date: "slt" };

// ── Budget vs asal (H5b) — har budget line: mahine-dar budget / asal / farak ──
function BudgetSection({ budgets, months, onChanged, card, inr, monthName }) {
  const [form, setForm] = useState(null);
  const [heads, setHeads] = useState([]);
  const [locs, setLocs] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null); // { id, amount }
  const openForm = () => {
    setForm({ head: "", loc: "", amount: "", from: months[months.length - 1] || "" }); setErr("");
    const ok = (r) => (r && r.success ? r.data || [] : []);
    api.get("/library/expense-heads").then((r) => setHeads(ok(r).filter((h) => Number(h.is_active) !== 0))).catch(() => {});
    api.get("/geofences").then((r) => setLocs(ok(r).filter((g) => g.project_id == null && (g.kind === "office" || g.kind === "warehouse")))).catch(() => {});
  };
  const act = async (fn) => { setBusy(true); setErr(""); const r = await fn().catch((e) => ({ message: e.message })); setBusy(false);
    if (r && r.success) { onChanged(); return true; } setErr((r && r.message) || t("cxr.b_fail")); return false; };
  const save = async () => {
    if (!form.head || !(Number(form.amount) > 0)) { setErr(t("cxr.b_need")); return; }
    if (await act(() => api.post("/company-expenses/budgets", { expense_head_id: Number(form.head), location_id: form.loc ? Number(form.loc) : null, amount: Number(form.amount), from_month: form.from }))) setForm(null);
  };
  const I = { height: 30, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };
  const btn = (k, off) => ({ padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer", whiteSpace: "nowrap",
    border: k === "ghost" ? `1px solid ${T.b2}` : "none", background: k === "ghost" ? T.surface : off ? T.b2 : T.blu, color: k === "ghost" ? T.t2 : "#fff" });
  const th = { fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", padding: "7px 10px", textAlign: "right", background: T.surfaceB, whiteSpace: "nowrap" };
  const td = { fontSize: 12, padding: "7px 10px", borderTop: `1px solid ${T.b1}`, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
  return (
    <div style={{ ...card, padding: 0, overflow: "auto" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, flex: 1 }}>{t("cxr.b_title")}</span>
        {!form && <button onClick={openForm} style={btn("primary")}>+ {t("cxr.b_add")}</button>}
      </div>
      {err && <div style={{ padding: "6px 14px", fontSize: 12, color: T.red }}>{err}</div>}
      {form && (
        <div style={{ padding: "8px 14px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: `1px solid ${T.b1}`, background: T.bluL }}>
          <div style={{ width: 200 }}><SearchSelect compact value={form.head} options={heads.map((h) => ({ key: h.id, label: h.name }))} onChange={(k) => setForm({ ...form, head: k })} placeholder={t("cxr.b_head")} theme={T} /></div>
          <div style={{ width: 200 }}><SearchSelect compact value={form.loc} options={[{ key: "", label: t("cxr.b_all_places") }, ...locs.map((g) => ({ key: g.id, label: g.label, sub: g.city_name || "" }))]} onChange={(k) => setForm({ ...form, loc: k })} theme={T} /></div>
          <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={t("cxr.b_amount")} style={{ ...I, width: 130 }} />
          <input type="month" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} title={t("cxr.b_from")} style={{ ...I, width: 150 }} />
          <button onClick={save} disabled={busy} style={btn("primary", busy)}>{t("cxr.b_save")}</button>
          <button onClick={() => setForm(null)} style={btn("ghost")}>{t("cxr.b_cancel")}</button>
        </div>
      )}
      {!budgets.length ? <div style={{ padding: "4px 14px 14px", fontSize: 12.5, color: T.t4 }}>{t("cxr.b_empty")}</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 220 + months.length * 110 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left" }}>{t("cxr.b_line")}</th>
            {months.map((m) => <th key={m} style={th}>{monthName(m)}</th>)}
            <th style={th}>{t("cxr.total")}</th><th style={th} />
          </tr></thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id}>
                <td style={{ ...td, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: T.t1 }}>{b.head}</div>
                  <div style={{ fontSize: 11, color: T.t4 }}>{b.location || t("cxr.b_all_places")} · {edit && edit.id === b.id ? null : t("cxr.b_per_month", { amt: inr(b.amount) })}</div>
                  {edit && edit.id === b.id && (
                    <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                      <input type="number" min="0" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} style={{ ...I, width: 100, height: 26 }} />
                      <button onClick={async () => { if (await act(() => api.put(`/company-expenses/budgets/${b.id}`, { amount: Number(edit.amount) }))) setEdit(null); }} style={btn("primary", busy)}>{t("cxr.b_save")}</button>
                    </div>
                  )}
                </td>
                {months.map((m) => {
                  const x = b.months.find((y) => y.ym === m);
                  if (!x) return <td key={m} style={{ ...td, color: T.t4 }}>—</td>;
                  const over = x.diff < -0.005;
                  return (
                    <td key={m} style={td}>
                      <div style={{ fontWeight: 600, color: over ? T.red : T.t1 }}>{inr(x.actual)}</div>
                      <div style={{ fontSize: 10.5, color: over ? T.red : T.grn }}>{over ? t("cxr.b_over", { amt: inr(-x.diff) }) : t("cxr.b_left", { amt: inr(x.diff) })}</div>
                    </td>
                  );
                })}
                <td style={{ ...td, fontWeight: 700 }}>
                  <div style={{ color: b.total_actual > b.total_budget ? T.red : T.t1 }}>{inr(b.total_actual)}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>/ {inr(b.total_budget)}</div>
                </td>
                <td style={td}>
                  <button onClick={() => setEdit(edit && edit.id === b.id ? null : { id: b.id, amount: String(b.amount) })} style={btn("ghost")}>{t("cxr.b_edit")}</button>{" "}
                  <button onClick={async () => { if (await window.confirmAsync(t("cxr.b_stop_confirm"))) act(() => api.put(`/company-expenses/budgets/${b.id}`, { is_active: 0 })); }} style={btn("ghost")}>{t("cxr.b_stop")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ padding: "8px 14px", fontSize: 11, color: T.t4, borderTop: `1px solid ${T.b1}` }}>{t("cxr.b_note")}</div>
    </div>
  );
}

export default function CompanyExpenseReport() {
  const [[from, to], setRange] = useState(RANGES.last6());
  const [group, setGroup] = useState("head");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr("");
    api.get(`/company-expenses/report?from=${from}&to=${to}`)
      .then((r) => { if (!alive) return; if (r && r.success) setData(r.data); else setErr((r && r.message) || t("cxr.load_fail")); })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from, to, reload]);

  const months = useMemo(() => monthsIn(from, to), [from, to]);
  const keyOf = (r) => group === "head" ? (r.head || t("cxr.no_head"))
    : group === "place" ? (r.location || (r.city ? t("cxr.city_only", { city: r.city }) : t("cxr.central")))
    : (r.city || t("cxr.central"));
  const pivot = useMemo(() => {
    const rows = (data && data.rows) || [];
    const map = new Map();
    for (const r of rows) {
      const k = keyOf(r);
      if (!map.has(k)) map.set(k, { key: k, by: {}, total: 0 });
      const g = map.get(k);
      g.by[r.ym] = (g.by[r.ym] || 0) + r.amount;
      g.total += r.amount;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, group]);
  const colTotal = (ym) => pivot.reduce((s, g) => s + (g.by[ym] || 0), 0);
  const grand = pivot.reduce((s, g) => s + g.total, 0);
  const src = useMemo(() => {
    const o = { cexp: 0, wallet: 0, other: 0 };
    for (const r of (data && data.rows) || []) o[r.is_cexp ? "cexp" : r.is_wallet ? "wallet" : "other"] += r.amount;
    return o;
  }, [data]);
  const dues = (data && data.dues) || [];
  const dueKnown = dues.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const missed = (data && data.missed) || [];
  const pnl = data && data.pnl;
  // Range ki doosri aamdani (Party par charge — byaaj / kiraya / aur)
  const incomeSum = ((data && data.income) || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const thisYm = iso(new Date()).slice(0, 7);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const head = [t("cxr.group_" + group), ...months.map(monthName), t("cxr.total")];
    const aoa = [head, ...pivot.map((g) => [g.key, ...months.map((m) => Math.round(g.by[m] || 0)), Math.round(g.total)]),
      [t("cxr.total"), ...months.map((m) => Math.round(colTotal(m))), Math.round(grand)]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), t("cxr.sheet_exp").slice(0, 31));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      [t("cxr.col_due"), t("cxr.col_what"), t("cxr.col_party"), t("cxr.col_place"), t("cxr.col_amount"), t("cxr.col_kind")],
      ...dues.map((d) => [d.due_date || "", d.name, d.party || "", d.location || "", d.amount == null ? "" : d.amount, d.kind === "bill" ? t("cxr.kind_bill") : t("cxr.kind_expected")]),
    ]), t("cxr.sheet_dues").slice(0, 31));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      [t("cxr.col_month"), t("cxr.col_what"), t("cxr.col_due"), t("cxr.col_amount"), t("cxr.col_resp")],
      ...missed.map((m) => [m.period, m.name, m.due_date || "", m.amount == null ? "" : m.amount, m.responsible || ""]),
    ]), t("cxr.sheet_missed").slice(0, 31));
    XLSX.writeFile(wb, `company-kharcha_${from}_${to}.xlsx`);
  };

  const card = { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "12px 14px" };
  const th = { fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: 0.4, padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap", background: T.surfaceB };
  const td = { fontSize: 12.5, color: T.t2, padding: "8px 10px", borderTop: `1px solid ${T.b1}`, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
  const seg = (on) => ({ padding: "5px 11px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: on ? T.bluL : T.surface, color: on ? T.blu : T.t3 });
  const inp = { height: 30, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, fontFamily: "inherit", color: T.t1, background: T.surface };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 14 }}>
      {/* Chhanni */}
      <div style={{ ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setRange([e.target.value, to])} style={inp} aria-label={t("cxr.from")} />
        <span style={{ color: T.t4 }}>—</span>
        <input type="date" value={to} min={from} onChange={(e) => e.target.value && setRange([from, e.target.value])} style={inp} aria-label={t("cxr.to")} />
        <div style={{ display: "flex", border: `1px solid ${T.b1}`, borderRadius: 7, overflow: "hidden" }}>
          {Object.keys(RANGES).map((k) => <button key={k} onClick={() => setRange(RANGES[k]())} style={seg(false)}>{t("cxr.r_" + k)}</button>)}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: T.t3 }}>{t("cxr.group_by")}</span>
        <div style={{ display: "flex", border: `1px solid ${T.b1}`, borderRadius: 7, overflow: "hidden" }}>
          {["head", "place", "city"].map((g) => <button key={g} onClick={() => setGroup(g)} style={seg(group === g)}>{t("cxr.group_" + g)}</button>)}
        </div>
        <button onClick={exportXlsx} disabled={!data} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: `1px solid ${T.grnM}`, background: T.grnL, color: T.grn, cursor: data ? "pointer" : "default", fontFamily: "inherit" }}>Excel</button>
      </div>

      {err && <div style={{ ...card, color: T.red, background: T.redL, fontSize: 12.5 }}>{err}</div>}
      {loading && <div style={{ ...card, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("cxr.loading")}</div>}

      {!loading && data && (<>
        {/* Ginti */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
          <div style={{ ...card, borderTop: `3px solid ${T.red}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{t("cxr.c_total")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.t1, marginTop: 3 }}>{inr(grand)}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("cxr.c_total_sub", { a: inr(src.cexp), b: inr(src.wallet), c: inr(src.other) })}</div>
          </div>
          <div style={{ ...card, borderTop: `3px solid ${T.amb}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{t("cxr.c_month")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.t1, marginTop: 3 }}>{inr(colTotal(thisYm))}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{monthName(thisYm)}</div>
          </div>
          <div style={{ ...card, borderTop: `3px solid ${T.pur}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{t("cxr.c_dues")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.t1, marginTop: 3 }}>{inr(dueKnown)}</div>
            <div style={{ fontSize: 11, color: dues.some((d) => d.bucket === "overdue") ? T.red : T.t3, marginTop: 2 }}>
              {t("cxr.c_dues_sub", { n: dues.length, o: dues.filter((d) => d.bucket === "overdue").length })}
            </div>
          </div>
          <div style={{ ...card, borderTop: `3px solid ${missed.length ? T.red : T.grn}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{t("cxr.c_missed")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: missed.length ? T.red : T.grn, marginTop: 3 }}>{missed.length}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("cxr.c_missed_sub")}</div>
          </div>
        </div>

        {/* Mahine-dar table */}
        <div style={{ ...card, padding: 0, overflow: "auto" }}>
          <div style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("cxr.t_title", { g: t("cxr.group_" + group) })}</div>
          {!pivot.length ? <div style={{ padding: "16px 14px", fontSize: 12.5, color: T.t4 }}>{t("cxr.t_empty")}</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 120 + months.length * 90 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: "left", position: "sticky", left: 0 }}>{t("cxr.group_" + group)}</th>
                {months.map((m) => <th key={m} style={th}>{monthName(m)}</th>)}
                <th style={th}>{t("cxr.total")}</th>
              </tr></thead>
              <tbody>
                {pivot.map((g) => (
                  <tr key={g.key}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600, color: T.t1, position: "sticky", left: 0, background: T.surface }}>{g.key}</td>
                    {months.map((m) => <td key={m} style={{ ...td, color: g.by[m] ? T.t2 : T.t4 }}>{g.by[m] ? inr(g.by[m]) : "—"}</td>)}
                    <td style={{ ...td, fontWeight: 700, color: T.t1 }}>{inr(g.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, textAlign: "left", fontWeight: 700, color: T.t1, background: T.surfaceB, position: "sticky", left: 0 }}>{t("cxr.total")}</td>
                  {months.map((m) => <td key={m} style={{ ...td, fontWeight: 700, background: T.surfaceB }}>{inr(colTotal(m))}</td>)}
                  <td style={{ ...td, fontWeight: 800, color: T.t1, background: T.surfaceB }}>{inr(grand)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <div style={{ padding: "8px 14px", fontSize: 11, color: T.t4, borderTop: `1px solid ${T.b1}` }}>{t("cxr.t_note")}</div>
        </div>

        <BudgetSection budgets={(data && data.budgets) || []} months={months} onChanged={() => setReload((n) => n + 1)} card={card} inr={inr} monthName={monthName} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 12 }}>
          {/* Aage kya dena */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("cxr.d_title")}</div>
            {!dues.length ? <div style={{ padding: "6px 14px 14px", fontSize: 12.5, color: T.t4 }}>{t("cxr.d_empty")}</div> : dues.map((d) => (
              <div key={d.kind + d.id} style={{ padding: "8px 14px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap", background: T[BUCKET[d.bucket] + "L"], color: T[BUCKET[d.bucket]] }}>
                  {d.due_date ? dm(d.due_date) : t("cxr.no_date")}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: T.t4 }}>{[d.kind === "bill" ? t("cxr.kind_bill") : t("cxr.kind_expected"), d.party, d.location].filter(Boolean).join(" · ")}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, whiteSpace: "nowrap" }}>{d.amount == null ? "—" : (d.estimate ? "~" : "") + inr(d.amount)}</div>
              </div>
            ))}
          </div>

          {/* Chhoote + Company P&L */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pnl && (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 8 }}>{t("cxr.p_title")}</div>
                {[[t("cxr.p_rev"), pnl.project_revenue, T.t2], [t("cxr.p_cost"), -pnl.project_cost, T.t2], [t("cxr.p_proj"), pnl.project_pnl, pnl.project_pnl < 0 ? T.red : T.grn],
                  ...(pnl.other_income != null ? [[t("cxr.p_oi"), pnl.other_income, T.grn]] : []),
                  [t("cxr.p_oh"), -pnl.overhead, T.red]].map(([l, v, c]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", color: T.t3 }}>
                    <span>{l}</span><b style={{ color: c, fontVariantNumeric: "tabular-nums" }}>{v < 0 ? "−" : ""}{inr(Math.abs(v))}</b>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0 0", marginTop: 4, borderTop: `1px solid ${T.b1}` }}>
                  <b style={{ color: T.t1 }}>{t("cxr.p_net")}</b>
                  <b style={{ color: pnl.net < 0 ? T.red : T.grn, fontVariantNumeric: "tabular-nums" }}>{pnl.net < 0 ? "−" : ""}{inr(Math.abs(pnl.net))}</b>
                </div>
                {incomeSum > 0 && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6 }}>{t("cxr.p_oi_range", { amt: inr(incomeSum) })}</div>}
                <div style={{ fontSize: 11, color: T.t4, marginTop: 6, lineHeight: 1.5 }}>{t("cxr.p_note")}</div>
              </div>
            )}
            <div style={{ ...card, padding: 0 }}>
              <div style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("cxr.m_title")}</div>
              {!missed.length ? <div style={{ padding: "6px 14px 14px", fontSize: 12.5, color: T.grn }}>{t("cxr.m_empty")}</div> : missed.map((m) => (
                <div key={m.id} style={{ padding: "8px 14px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red, minWidth: 54 }}>{monthName(m.period)}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: T.t1 }}>{m.name}<span style={{ color: T.t4, fontSize: 11 }}>{m.responsible ? " · " + m.responsible : ""}</span></span>
                  <span style={{ fontSize: 12.5, color: T.t2 }}>{m.amount == null ? "—" : inr(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}
