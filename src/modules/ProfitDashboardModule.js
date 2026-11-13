// ════════════════════════════════════════════════════════════════
// Profit Dashboard (13 Nov 2026, Prafull) — site-wise aur poori company ka
// munafa ₹/sqft me. Do view (upar toggle):
//   • Munafa — BOQ / Budget / Plan ka margin / Invoice / Kaam hua / Kharcha /
//     Margin / Advance, sab ₹/sqft (ya kul ₹) me
//   • Lakshya — structure aur finishing par ₹/sqft munafe ka lakshya: poore
//     stage par mila kitna, aage ya peeche
// Site dabao = detail (area ki category, budget, stage ki tareekh, kharche ka
// bantwara, paisa, 12 mahine). Hisaab server par: gb-backend
// routes/profit-dashboard.js + utils/profitDashboard.js.
// Module apne me poora (CLAUDE.md: modules kuch share nahi karte).
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import api from "../config/api";
import { t } from "../i18n";
import { can } from "../utils/perms";
import { useConfirm } from "../components/ConfirmDialog";

const EChart = lazy(() => import("../components/EChart"));

// ── THEME — sober: ek indigo accent, grey, hairline ───────────────
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", soft: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  acc: "#4B45C4", accL: "#EEEDFB",
  grn: "#047857", grnL: "#ECFDF5",
  red: "#B91C1C", redL: "#FEF2F2",
  amb: "#B45309", ambL: "#FFFBEB",
};
const card = { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8 };

// ── NUMBERS — ₹, Lakh, Crore ──────────────────────────────────────
const isNum = (n) => n !== null && n !== undefined && Number.isFinite(Number(n));
const inr = (n) => (isNum(n) ? (Number(n) < 0 ? "−₹" : "₹") + Math.round(Math.abs(Number(n))).toLocaleString("en-IN") : "—");
const lakh = (n) => {
  if (!isNum(n)) return "—";
  const v = Number(n), a = Math.abs(v), s = v < 0 ? "−₹" : "₹";
  if (a >= 1e7) return `${s}${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}${(a / 1e5).toFixed(2)} L`;
  return s + Math.round(a).toLocaleString("en-IN");
};
const sqft = (n) => (isNum(n) ? Math.round(Number(n)).toLocaleString("en-IN") : "—");
const signed = (n, f = inr) => (isNum(n) ? (Number(n) > 0 ? "+" : "") + f(n) : "—");
const tone = (n) => (!isNum(n) || Number(n) === 0 ? T.t2 : Number(n) > 0 ? T.grn : T.red);
// Margin ka rang sirf jab invoice bana ho — bina invoice "invoice − kharch" = sirf kharch, ghaata nahi.
const marginTone = (billed, n) => (Number(billed) > 0 ? tone(n) : T.t4);
const fmtDate = (s) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// ── Chhote hisse ─────────────────────────────────────────────────
function useNarrow(px = 820) {
  const [n, setN] = useState(typeof window !== "undefined" && window.innerWidth < px);
  useEffect(() => {
    const on = () => setN(window.innerWidth < px);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [px]);
  return n;
}

function Seg({ value, options, onChange }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${T.b2}`, borderRadius: 7, overflow: "hidden", background: T.surface }}>
      {options.map((o, i) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{ border: "none", borderLeft: i ? `1px solid ${T.b2}` : "none", padding: "6px 12px", fontSize: 12.5, cursor: "pointer",
                   fontWeight: value === o.v ? 600 : 500, background: value === o.v ? T.accL : "transparent", color: value === o.v ? T.acc : T.t2 }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ ...card, padding: "11px 13px", minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub ? <div style={{ fontSize: 11.5, color: T.t4, marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}

function Chip({ children, kind = "grey", title }) {
  const k = { grey: [T.soft, T.t3], acc: [T.accL, T.acc], grn: [T.grnL, T.grn], red: [T.redL, T.red], amb: [T.ambL, T.amb] }[kind];
  return <span title={title} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: k[0], color: k[1], whiteSpace: "nowrap", fontWeight: 500 }}>{children}</span>;
}

// Patti: bhara hissa + khadi lakeer (lakshya)
function Bar({ value, mark, max, color }) {
  const m = Math.max(Number(max) || 0, Number(value) || 0, Number(mark) || 0, 1);
  const w = Math.max(0, Math.min(100, (Number(value) || 0) / m * 100));
  return (
    <div style={{ position: "relative", height: 8, background: T.bg, borderRadius: 4, margin: "10px 0 6px" }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: `${w}%`, borderRadius: 4, background: color || T.acc }} />
      {isNum(mark) ? <div style={{ position: "absolute", top: -4, left: `calc(${Math.min(100, Number(mark) / m * 100)}% - 1px)`, width: 2, height: 16, background: T.t1 }} /> : null}
    </div>
  );
}

const FLAG_KIND = { loss: "red", over_budget: "red", behind_target: "red", due_60: "amb", no_estimate: "amb", no_area: "amb", stage_no_date: "amb" };
const flagLabel = (f) => t(`profit.flag_${f}`);
const statusLabel = (s) => ({ ongoing: t("profit.st_ongoing"), not_started: t("profit.st_not_started"), completed: t("profit.st_completed"), hold: t("profit.st_hold"), cancelled: t("profit.st_cancelled") }[s] || s || "—");

// Stage ki halat ek chip me
function StageChip({ st }) {
  if (!st || !(st.boq > 0)) return <Chip>{t("profit.stage_na")}</Chip>;
  if (st.complete) return <Chip kind="grn">{t("profit.stage_done")}</Chip>;
  if (st.done_pct > 0) return <Chip kind="acc">{t("profit.stage_running_pct", { pct: Math.round(st.done_pct) })}</Chip>;
  return <Chip>{t("profit.stage_not_started")}</Chip>;
}

// ════════════════════════════════════════════════════════════════
export default function ProfitDashboardModule() {
  const narrow = useNarrow();
  const [view, setView] = useState("profit");
  const [scope, setScope] = useState("running");
  const [unit, setUnit] = useState("psf");
  const [q, setQ] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sort, setSort] = useState({ k: "cost_psf", d: -1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [targetOpen, setTargetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const r = await api.get(`/profit-dashboard?scope=${scope}`, { timeoutMs: 60000 });
    if (r && r.success) setData(r.data); else setErr((r && r.message) || t("profit.load_failed"));
    setLoading(false);
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const all = (data && data.projects) || [];
    const s = q.trim().toLowerCase();
    let list = all.filter((r) => (!hideEmpty || r.activity) && (!s || `${r.name} ${r.client || ""} ${r.city || ""}`.toLowerCase().includes(s)));
    const val = (r) => {
      const v = sort.k === "name" ? r.name : sort.k.split(".").reduce((o, k) => (o == null ? null : o[k]), r);
      return v == null ? -Infinity : v;
    };
    list = [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      if (typeof x === "string" || typeof y === "string") return String(x).localeCompare(String(y)) * sort.d;
      return (x - y) * sort.d;
    });
    return list;
  }, [data, q, hideEmpty, sort]);

  // ₹/sq ft ↔ kul ₹ badle to sort bhi usi column par (warna dikhta ek, sort doosra).
  const changeUnit = (u) => {
    setUnit(u);
    setSort((o) => {
      const base = o.k.endsWith("_psf") ? o.k.slice(0, -4) : o.k;
      if (!PSF_KEYS.includes(base)) return o;
      return { ...o, k: u === "psf" ? `${base}_psf` : base };
    });
  };
  const ov = data && data.overall;
  const attention = rows.filter((r) => r.flags.length);
  // Reports wala hi niyam: Excel = Reports EXPORT + Financial Reports EXPORT.
  const canExport = can("Reports", "export") && can("Financial Reports", "export");

  const exportXlsx = async () => {
    try {
      const XLSX = await import("xlsx");
      const head = [t("profit.col_site"), t("profit.col_status"), t("profit.col_area"), t("profit.col_boq"), t("profit.col_boq_psf"),
        t("profit.col_budget"), t("profit.col_budget_psf"), t("profit.col_plan_psf"), t("profit.col_billed"), t("profit.col_done"),
        t("profit.col_cost"), t("profit.cost_material"), t("profit.cost_labour"), t("profit.cost_site"), t("profit.cost_machine"),
        t("profit.col_margin"), t("profit.col_margin_psf"), t("profit.col_received"), t("profit.col_advance"),
        t("profit.target_structure"), t("profit.got_structure_psf"), t("profit.target_finishing"), t("profit.got_finishing_psf"), t("profit.col_flags")];
      const aoa = [head, ...rows.map((r) => [r.name, statusLabel(r.status), r.area || "", r.boq, r.boq_psf ?? "", r.budget ?? "", r.budget_psf ?? "",
        r.plan_margin_psf ?? "", r.billed, r.done ?? "", r.cost, r.cost_breakup.material, r.cost_breakup.labour, r.cost_breakup.site,
        r.cost_breakup.machine, r.margin, r.margin_psf ?? "", r.received, r.advance, r.target.structure ?? "", r.stages.structure.profit_psf ?? "",
        r.target.finishing ?? "", r.stages.finishing.profit_psf ?? "", r.flags.map(flagLabel).join(", ")])];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = head.map((h, i) => ({ wch: i === 0 ? 28 : 13 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Profit");
      XLSX.writeFile(wb, `profit-dashboard-${(data && data.today) || ""}.xlsx`);
    } catch (e) { setErr(t("profit.export_failed")); }
  };

  return (
    <div style={{ padding: narrow ? "12px 12px 80px" : "18px 22px 40px", background: T.bg, minHeight: "100%", color: T.t1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ marginRight: "auto", fontSize: 12.5, color: T.t3, minWidth: 200 }}>{t("profit.subtitle")}</div>
        <Seg value={view} onChange={setView} options={[{ v: "profit", l: t("profit.view_profit") }, { v: "target", l: t("profit.view_target") }]} />
        <Seg value={scope} onChange={setScope} options={[{ v: "running", l: t("profit.scope_running") }, { v: "completed", l: t("profit.scope_completed") }, { v: "all", l: t("profit.scope_all") }]} />
        <button type="button" onClick={load} style={btn()}>{t("profit.refresh")}</button>
        {canExport && data ? <button type="button" onClick={exportXlsx} style={btn()}>{t("profit.excel")}</button> : null}
      </div>

      {err ? <div style={{ ...card, padding: 12, borderColor: "#FECACA", background: T.redL, color: T.red, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
      {loading && !data ? <div style={{ ...card, padding: 40, textAlign: "center", color: T.t3, fontSize: 13 }}>{t("profit.loading")}</div> : null}

      {data && view === "profit" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${narrow ? 150 : 170}px, 1fr))`, gap: 10, marginBottom: 12 }}>
            <Stat label={t("profit.k_area")} value={`${sqft(ov.area)} ${t("profit.sqft")}`} sub={t("profit.k_area_sub", { n: ov.sites_with_area, total: ov.sites })} />
            <Stat label={t("profit.k_boq_psf")} value={inr(ov.boq_psf)} sub={t("profit.k_boq_sub", { amt: lakh(ov.boq) })} />
            <Stat label={t("profit.k_plan_psf")} value={inr(ov.plan_margin_psf)} color={tone(ov.plan_margin_psf)}
              sub={ov.budget_sites ? t("profit.k_plan_sub", { budget: inr(ov.budget_psf), n: ov.budget_sites }) : t("profit.k_plan_none")} />
            <Stat label={t("profit.k_billed_psf")} value={inr(ov.billed_psf)} sub={t("profit.k_billed_sub", { amt: lakh(ov.billed) })} />
            <Stat label={t("profit.k_cost_psf")} value={inr(ov.cost_psf)} sub={t("profit.k_cost_sub", { amt: lakh(ov.cost) })} />
            <Stat label={t("profit.k_margin")} value={ov.billed > 0 ? lakh(ov.margin) : "—"} color={marginTone(ov.billed, ov.margin)}
              sub={!(ov.billed > 0) ? t("profit.k_margin_no_invoice") : isNum(ov.margin_pct) ? t("profit.k_margin_sub", { psf: inr(ov.margin_psf), pct: ov.margin_pct }) : t("profit.k_margin_sub_nopct", { psf: inr(ov.margin_psf) })} />
            <Stat label={t("profit.k_advance")} value={lakh(ov.advance)} color={tone(ov.advance)}
              sub={t("profit.k_advance_sub", { plus: lakh(ov.advance_plus), minus: lakh(ov.advance_minus) })} />
          </div>

          <CostStrip ov={ov} />

          {attention.length ? (
            <div style={{ ...card, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 7 }}>{t("profit.attention", { n: attention.length })}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {attention.slice(0, 24).map((r) => (
                  <button key={r.id} type="button" onClick={() => setOpenId(r.id)}
                    style={{ border: `1px solid ${T.b1}`, background: T.soft, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: T.t2, display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    {r.flags.slice(0, 2).map((f) => <Chip key={f} kind={FLAG_KIND[f]}>{flagLabel(f)}</Chip>)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Toolbar q={q} setQ={setQ} hideEmpty={hideEmpty} setHideEmpty={setHideEmpty} unit={unit} setUnit={changeUnit} showUnit />
          <ProfitTable rows={rows} unit={unit} sort={sort} setSort={setSort} onOpen={setOpenId} narrow={narrow} />
          <Notes data={data} />
        </>
      ) : null}

      {data && view === "target" ? (
        <TargetView data={data} rows={rows} narrow={narrow} q={q} setQ={setQ} hideEmpty={hideEmpty} setHideEmpty={setHideEmpty}
          sort={sort} setSort={setSort} onOpen={setOpenId} onTargets={() => setTargetOpen(true)} />
      ) : null}

      {openId ? <Detail id={openId} onClose={() => setOpenId(null)} onSaved={load} narrow={narrow} /> : null}
      {targetOpen && data ? <TargetModal data={data} onClose={() => setTargetOpen(false)} onSaved={load} /> : null}
    </div>
  );
}

// Jin column ka ₹/sq ft roop bhi hai (row me "<k>" aur "<k>_psf").
const PSF_KEYS = ["boq", "budget", "plan_margin", "billed", "done", "cost", "margin"];

const btn = (primary) => ({
  border: `1px solid ${primary ? T.acc : T.b2}`, background: primary ? T.acc : T.surface, color: primary ? "#fff" : T.t2,
  borderRadius: 7, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontWeight: 500,
});
const inp = { border: `1px solid ${T.b2}`, borderRadius: 6, padding: "6px 8px", fontSize: 13, color: T.t1, background: T.surface, width: "100%", boxSizing: "border-box" };

function CostStrip({ ov }) {
  const parts = [
    ["material", t("profit.cost_material"), T.acc],
    ["labour", t("profit.cost_labour"), "#7C78D8"],
    ["site", t("profit.cost_site"), "#A9A6E6"],
    ["machine", t("profit.cost_machine"), T.t4],
  ];
  const total = parts.reduce((s, p) => s + Math.max(0, Number(ov.cost_breakup[p[0]]) || 0), 0);
  if (!(total > 0)) return null;
  return (
    <div style={{ ...card, padding: "10px 12px", marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{t("profit.cost_split")}</div>
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: T.bg }}>
        {parts.map(([k, , c]) => {
          const v = Math.max(0, Number(ov.cost_breakup[k]) || 0);
          return v > 0 ? <div key={k} style={{ width: `${v / total * 100}%`, background: c }} /> : null;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 7, fontSize: 12, color: T.t3 }}>
        {parts.map(([k, l, c]) => (
          <span key={k}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c, marginRight: 5 }} />
            {l} <b style={{ color: T.t2, fontWeight: 600 }}>{lakh(ov.cost_breakup[k])}</b> ({Math.round((Math.max(0, Number(ov.cost_breakup[k]) || 0)) / total * 100)}%)</span>
        ))}
      </div>
    </div>
  );
}

function Toolbar({ q, setQ, hideEmpty, setHideEmpty, unit, setUnit, showUnit }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("profit.search")} style={{ ...inp, width: 220 }} />
      <label style={{ fontSize: 12.5, color: T.t2, display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
        <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> {t("profit.hide_empty")}
      </label>
      {showUnit ? <div style={{ marginLeft: "auto" }}><Seg value={unit} onChange={setUnit} options={[{ v: "psf", l: t("profit.unit_psf") }, { v: "total", l: t("profit.unit_total") }]} /></div> : null}
    </div>
  );
}

function Th({ k, label, sort, setSort, align = "right", w }) {
  const on = sort.k === k;
  return (
    <th onClick={k ? () => setSort({ k, d: on ? -sort.d : -1 }) : undefined}
      style={{ textAlign: align, padding: "8px 10px", fontSize: 11.5, fontWeight: 600, color: on ? T.acc : T.t3, whiteSpace: "nowrap",
               cursor: k ? "pointer" : "default", borderBottom: `1px solid ${T.b1}`, background: T.soft, position: "sticky", top: 0, width: w }}>
      {label}{on ? (sort.d > 0 ? " ↑" : " ↓") : ""}
    </th>
  );
}
const td = (align = "right", extra) => ({ padding: "8px 10px", fontSize: 12.5, textAlign: align, borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap", ...(extra || {}) });

function ProfitTable({ rows, unit, sort, setSort, onOpen, narrow }) {
  const P = unit === "psf";
  const cell = (r, amt, per) => (P ? (r.area > 0 ? inr(per) : <span style={{ color: T.t4 }}>{lakh(amt)}</span>) : lakh(amt));
  if (!rows.length) return <div style={{ ...card, padding: 30, textAlign: "center", color: T.t3, fontSize: 13 }}>{t("profit.no_sites")}</div>;
  return (
    <div style={{ ...card, overflow: "auto", maxHeight: narrow ? "none" : "62vh" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
        <thead>
          <tr>
            <Th k="name" label={t("profit.col_site")} sort={sort} setSort={setSort} align="left" />
            <Th k="area" label={t("profit.col_area")} sort={sort} setSort={setSort} />
            <Th k={P ? "boq_psf" : "boq"} label={t("profit.col_boq")} sort={sort} setSort={setSort} />
            <Th k={P ? "budget_psf" : "budget"} label={t("profit.col_budget")} sort={sort} setSort={setSort} />
            <Th k={P ? "plan_margin_psf" : "plan_margin"} label={t("profit.col_plan")} sort={sort} setSort={setSort} />
            <Th k={P ? "billed_psf" : "billed"} label={t("profit.col_billed")} sort={sort} setSort={setSort} />
            <Th k={P ? "done_psf" : "done"} label={t("profit.col_done")} sort={sort} setSort={setSort} />
            <Th k={P ? "cost_psf" : "cost"} label={t("profit.col_cost")} sort={sort} setSort={setSort} />
            <Th k={P ? "margin_psf" : "margin"} label={t("profit.col_margin")} sort={sort} setSort={setSort} />
            <Th k="advance" label={t("profit.col_advance")} sort={sort} setSort={setSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r.id)} style={{ cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.soft; }} onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
              <td style={td("left", { maxWidth: 240, whiteSpace: "normal" })}>
                <div style={{ fontWeight: 500, color: T.t1 }}>{r.name}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: T.t4 }}>{statusLabel(r.status)}</span>
                  {r.flags.slice(0, 2).map((f) => <Chip key={f} kind={FLAG_KIND[f]}>{flagLabel(f)}</Chip>)}
                </div>
              </td>
              <td style={td()}>{r.area > 0 ? sqft(r.area) : <span style={{ color: T.t4 }}>—</span>}</td>
              <td style={td()}>{r.boq > 0 ? cell(r, r.boq, r.boq_psf) : "—"}</td>
              <td style={td()}>{r.budget != null ? cell(r, r.budget, r.budget_psf) : <span style={{ color: T.t4 }}>—</span>}</td>
              <td style={td("right", { color: tone(P ? r.plan_margin_psf : r.plan_margin) })}>{r.plan_margin != null ? cell(r, r.plan_margin, r.plan_margin_psf) : "—"}</td>
              <td style={td()}>{cell(r, r.billed, r.billed_psf)}</td>
              <td style={td()}>{r.done != null ? cell(r, r.done, r.done_psf) : <span style={{ color: T.t4 }}>—</span>}</td>
              <td style={td()}>{cell(r, r.cost, r.cost_psf)}</td>
              <td style={td("right", { color: marginTone(r.billed, r.margin), fontWeight: r.billed > 0 ? 600 : 400 })}>{cell(r, r.margin, r.margin_psf)}</td>
              <td style={td("right", { color: tone(r.advance) })}>{lakh(r.advance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Notes({ data }) {
  return (
    <div style={{ fontSize: 11.5, color: T.t3, marginTop: 10, lineHeight: 1.6 }}>
      <div>{t("profit.note_psf")}</div>
      <div>{t("profit.note_margin")}</div>
      {data.transfers_unvalued ? <div style={{ color: T.amb }}>{t("profit.note_transfer")}</div> : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// LAKSHYA (Target) VIEW
// ════════════════════════════════════════════════════════════════
function TargetView({ data, rows, narrow, q, setQ, hideEmpty, setHideEmpty, sort, setSort, onOpen, onTargets }) {
  const ov = data.overall;
  const cur = data.targets.current;
  const withArea = rows.filter((r) => r.area > 0 && (r.stages.structure.boq > 0 || r.stages.finishing.boq > 0));
  if (!data.targets.ready || !cur) {
    return (
      <div style={{ ...card, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{t("profit.no_target_title")}</div>
        <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 12 }}>{data.targets.ready ? t("profit.no_target_body") : t("profit.db_pending")}</div>
        {data.can.target && data.targets.ready ? <button type="button" style={btn(true)} onClick={onTargets}>{t("profit.set_target")}</button> : null}
        {!data.can.target && data.targets.ready ? <div style={{ fontSize: 12, color: T.t4 }}>{t("profit.target_admin_only")}</div> : null}
      </div>
    );
  }
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${narrow ? 150 : 170}px, 1fr))`, gap: 10, marginBottom: 12 }}>
        <Stat label={t("profit.k_running")} value={t("profit.k_running_val", { n: withArea.length })} sub={`${sqft(withArea.reduce((s, r) => s + r.area, 0))} ${t("profit.sqft")}`} />
        <Stat label={t("profit.k_target_rate")} value={inr(Number(cur.structure_psf) + Number(cur.finishing_psf))}
          sub={t("profit.k_target_rate_sub", { s: inr(cur.structure_psf), f: inr(cur.finishing_psf) })} />
        <Stat label={t("profit.k_target_plan")} value={lakh(ov.target.plan_amt)} sub={t("profit.k_target_plan_sub")} />
        <Stat label={t("profit.k_target_got")} value={lakh(num(ov.target.structure.profit) + num(ov.target.finishing.profit))}
          color={tone(num(ov.target.structure.vs_target_amt) + num(ov.target.finishing.vs_target_amt))}
          sub={t("profit.k_target_got_sub", { v: signed(num(ov.target.structure.vs_target_amt) + num(ov.target.finishing.vs_target_amt), lakh) })} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <StageBox name={t("profit.stage_structure")} s={ov.target.structure} />
        <StageBox name={t("profit.stage_finishing")} s={ov.target.finishing} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: T.t3, marginRight: "auto" }}>
          {t("profit.target_since", { s: inr(cur.structure_psf), f: inr(cur.finishing_psf), d: fmtDate(cur.effective_from) })}
        </div>
        {data.can.target ? <button type="button" style={btn()} onClick={onTargets}>{t("profit.change_target")}</button> : null}
      </div>

      <Toolbar q={q} setQ={setQ} hideEmpty={hideEmpty} setHideEmpty={setHideEmpty} />
      <TargetTable rows={rows} sort={sort} setSort={setSort} onOpen={onOpen} narrow={narrow} />
      <div style={{ fontSize: 11.5, color: T.t3, marginTop: 10, lineHeight: 1.6 }}>
        <div>{t("profit.note_target_1")}</div>
        <div>{t("profit.note_target_2")}</div>
      </div>
    </>
  );
}
const num = (n) => Number(n) || 0;

function StageBox({ name, s }) {
  const got = s.profit_psf, tgt = s.target_psf;
  const ahead = isNum(s.vs_target_psf) ? s.vs_target_psf >= 0 : null;
  return (
    <div style={{ ...card, padding: "13px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 12, color: T.t3 }}>{isNum(tgt) ? t("profit.target_psf_label", { v: inr(tgt) }) : t("profit.no_done_stage")}</span>
      </div>
      <Bar value={got} mark={tgt} color={ahead == null ? T.acc : ahead ? T.grn : T.red} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
        <span>{t("profit.got_psf")} <b>{inr(got)}</b> {t("profit.per_sqft")}</span>
        {ahead == null ? null : <span style={{ color: ahead ? T.grn : T.red, fontWeight: 600 }}>
          {ahead ? t("profit.ahead", { v: inr(Math.abs(s.vs_target_psf)) }) : t("profit.behind", { v: inr(Math.abs(s.vs_target_psf)) })}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: T.t4, marginTop: 4 }}>
        {t("profit.stage_box_sub", { area: sqft(s.area_done), n: s.sites_done, got: lakh(s.profit), tgt: lakh(s.target_amt) })}
      </div>
      <div style={{ fontSize: 11.5, color: T.t4 }}>
        {t("profit.stage_box_running", { n: s.sites_running, area: sqft(s.area_running) })}
        {s.needs_date ? <span style={{ color: T.amb }}> · {t("profit.stage_box_needs_date", { n: s.needs_date })}</span> : null}
      </div>
    </div>
  );
}

function stageCell(r, k) {
  const st = r.stages[k];
  if (!(st.boq > 0)) return <span style={{ color: T.t4 }}>—</span>;
  if (!st.complete) {
    return <span style={{ color: T.t3 }}>{t("profit.cell_running", { pct: Math.round(st.done_pct) })}{isNum(st.plan_psf) ? ` · ${t("profit.cell_plan", { v: inr(st.plan_psf) })}` : ""}</span>;
  }
  if (!isNum(st.profit_psf)) return <span style={{ color: T.amb }}>{t("profit.cell_needs_date")}</span>;
  return (
    <span>{inr(st.profit_psf)}{isNum(st.vs_target_psf) ? <span style={{ color: tone(st.vs_target_psf), marginLeft: 6, fontWeight: 600 }}>{signed(st.vs_target_psf)}</span> : null}</span>
  );
}

function TargetTable({ rows, sort, setSort, onOpen, narrow }) {
  const list = rows.filter((r) => r.stages.structure.boq > 0 || r.stages.finishing.boq > 0);
  if (!list.length) return <div style={{ ...card, padding: 30, textAlign: "center", color: T.t3, fontSize: 13 }}>{t("profit.no_stage_sites")}</div>;
  const total = (r) => num(r.stages.structure.vs_target_amt) + num(r.stages.finishing.vs_target_amt);
  const anyDone = (r) => r.stages.structure.vs_target_amt != null || r.stages.finishing.vs_target_amt != null;
  return (
    <div style={{ ...card, overflow: "auto", maxHeight: narrow ? "none" : "60vh" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr>
            <Th k="name" label={t("profit.col_site")} sort={sort} setSort={setSort} align="left" />
            <Th k="area" label={t("profit.col_area")} sort={sort} setSort={setSort} />
            <Th label={t("profit.col_stage")} sort={sort} setSort={setSort} align="left" />
            <Th k="stages.structure.profit_psf" label={t("profit.col_structure")} sort={sort} setSort={setSort} />
            <Th k="stages.finishing.profit_psf" label={t("profit.col_finishing")} sort={sort} setSort={setSort} />
            <Th label={t("profit.col_vs_target")} sort={sort} setSort={setSort} />
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r.id)} style={{ cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.soft; }} onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
              <td style={td("left", { maxWidth: 240, whiteSpace: "normal" })}>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: T.t4 }}>
                  {isNum(r.target.structure) ? t("profit.row_target", { s: inr(r.target.structure), f: inr(r.target.finishing) }) : t("profit.row_no_target")}
                  {r.target.source === "site" ? ` · ${t("profit.row_target_site")}` : ""}
                </div>
              </td>
              <td style={td()}>{r.area > 0 ? sqft(r.area) : <Chip kind="amb">{t("profit.flag_no_area")}</Chip>}</td>
              <td style={td("left")}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: T.t4 }}>{t("profit.short_s")}</span><StageChip st={r.stages.structure} />
                  <span style={{ fontSize: 11, color: T.t4, marginLeft: 4 }}>{t("profit.short_f")}</span><StageChip st={r.stages.finishing} />
                </div>
              </td>
              <td style={td()}>{stageCell(r, "structure")}</td>
              <td style={td()}>{stageCell(r, "finishing")}</td>
              <td style={td("right", { color: tone(total(r)), fontWeight: 600 })}>{anyDone(r) ? signed(total(r), lakh) : <span style={{ color: T.t4, fontWeight: 400 }}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// LAKSHYA badlo (admin) — history ke saath
// ════════════════════════════════════════════════════════════════
function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.35)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginRight: "auto" }}>{title}</div>
          <button type="button" onClick={onClose} style={{ ...btn(), padding: "3px 9px" }} aria-label={t("profit.close")}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TargetModal({ data, onClose, onSaved }) {
  const cur = data.targets.current;
  const [f, setF] = useState({ effective_from: data.today, structure_psf: cur ? cur.structure_psf : "", finishing_psf: cur ? cur.finishing_psf : "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const confirm = useConfirm();
  const save = async () => {
    if (f.structure_psf === "" || f.finishing_psf === "" || Number(f.structure_psf) < 0 || Number(f.finishing_psf) < 0) { setMsg(t("profit.fill_both")); return; }
    setBusy(true); setMsg("");
    const r = await api.post("/profit-dashboard/targets", f);
    setBusy(false);
    if (r && r.success) { onSaved(); onClose(); } else setMsg((r && r.message) || t("profit.save_failed"));
  };
  const remove = async (id) => {
    if (!(await confirm(t("profit.confirm_remove_target")))) return;
    const r = await api.del(`/profit-dashboard/targets/${id}`);
    if (r && r.success) { onSaved(); onClose(); } else setMsg((r && r.message) || t("profit.save_failed"));
  };
  return (
    <Modal title={t("profit.target_modal_title")} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 12, lineHeight: 1.55 }}>{t("profit.target_modal_help")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <label style={lbl}>{t("profit.f_from")}<input type="date" max={data.today} value={f.effective_from} onChange={(e) => setF({ ...f, effective_from: e.target.value })} style={inp} /></label>
        <label style={lbl}>{t("profit.f_structure_psf")}<input type="number" min="0" value={f.structure_psf} onChange={(e) => setF({ ...f, structure_psf: e.target.value })} style={inp} /></label>
        <label style={lbl}>{t("profit.f_finishing_psf")}<input type="number" min="0" value={f.finishing_psf} onChange={(e) => setF({ ...f, finishing_psf: e.target.value })} style={inp} /></label>
      </div>
      <label style={lbl}>{t("profit.f_note")}<input value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} style={inp} /></label>
      {msg ? <div style={{ color: T.red, fontSize: 12.5, marginTop: 8 }}>{msg}</div> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button type="button" style={btn()} onClick={onClose}>{t("profit.cancel")}</button>
        <button type="button" style={btn(true)} disabled={busy} onClick={save}>{busy ? t("profit.saving") : t("profit.save")}</button>
      </div>
      {data.targets.history.length ? (
        <div style={{ marginTop: 16, borderTop: `1px solid ${T.b1}`, paddingTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t("profit.target_history")}</div>
          {[...data.targets.history].reverse().map((h) => (
            <div key={h.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${T.b1}` }}>
              <span style={{ width: 96, color: T.t3 }}>{fmtDate(h.effective_from)}</span>
              <span style={{ marginRight: "auto" }}>{t("profit.row_target", { s: inr(h.structure_psf), f: inr(h.finishing_psf) })}
                {h.note ? <span style={{ color: T.t4 }}> · {h.note}</span> : null}</span>
              <button type="button" style={{ ...btn(), padding: "2px 8px", fontSize: 11.5 }} onClick={() => remove(h.id)}>{t("profit.remove")}</button>
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
const lbl = { fontSize: 11.5, color: T.t3, display: "flex", flexDirection: "column", gap: 4 };

// ════════════════════════════════════════════════════════════════
// SITE DETAIL (drawer)
// ════════════════════════════════════════════════════════════════
function Section({ title, children, right }) {
  return (
    <div style={{ borderTop: `1px solid ${T.b1}`, padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginRight: "auto" }}>{title}</div>{right}
      </div>
      {children}
    </div>
  );
}
function KV({ k, v, color, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ color: T.t3 }}>{k}</span><span style={{ color: color || T.t1, fontWeight: strong ? 600 : 500, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Detail({ id, onClose, onSaved, narrow }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(null);   // settings ka draft
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const r = await api.get(`/profit-dashboard/project/${id}`, { timeoutMs: 60000 });
    if (r && r.success) setD(r.data); else setErr((r && r.message) || t("profit.load_failed"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const p = d && d.project;
  const startEdit = () => {
    const s = p.settings;
    setEdit({
      inc: new Set(p.area_parts.filter((c) => c.included).map((c) => c.key)),
      area_manual: s.area_manual ?? "", budget_mode: s.budget_mode || "",
      budget_structure_psf: s.budget_structure_psf ?? "", budget_finishing_psf: s.budget_finishing_psf ?? "",
      structure_done_on: s.structure_done_on || "", finishing_done_on: s.finishing_done_on || "",
      target_structure_psf: s.target_structure_psf ?? "", target_finishing_psf: s.target_finishing_psf ?? "",
    });
    setMsg("");
  };
  const save = async () => {
    setBusy(true); setMsg("");
    // Area: jo apne aap wale se alag hai wahi inc / exc me (aage amendment me
    // nayi category aaye to wo apne aap wale niyam se chale).
    const inc = [], exc = [];
    for (const c of p.area_parts) {
      const on = edit.inc.has(c.key);
      if (on && !c.auto) inc.push(c.key);
      if (!on && c.auto) exc.push(c.key);
    }
    const body = {
      area_pick: inc.length || exc.length ? { inc, exc } : null,
      area_manual: edit.area_manual, budget_mode: edit.budget_mode,
      budget_structure_psf: edit.budget_structure_psf, budget_finishing_psf: edit.budget_finishing_psf,
      structure_done_on: edit.structure_done_on, finishing_done_on: edit.finishing_done_on,
    };
    if (d.can.target) { body.target_structure_psf = edit.target_structure_psf; body.target_finishing_psf = edit.target_finishing_psf; }
    const r = await api.put(`/profit-dashboard/project/${id}/settings`, body);
    setBusy(false);
    if (r && r.success) { setEdit(null); await load(); onSaved(); } else setMsg((r && r.message) || t("profit.save_failed"));
  };

  const panel = {
    position: "fixed", top: 0, right: 0, bottom: 0, width: narrow ? "100%" : 620, background: T.surface, zIndex: 1100,
    borderLeft: `1px solid ${T.b1}`, overflow: "auto", padding: "14px 18px 40px", boxSizing: "border-box",
  };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.25)", zIndex: 1099 }} />
      <div style={panel}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <div style={{ marginRight: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{p ? p.name : t("profit.loading")}</div>
            {p ? <div style={{ fontSize: 12, color: T.t3 }}>{[p.client, p.city, statusLabel(p.status), p.pm].filter(Boolean).join(" · ")}</div> : null}
          </div>
          {p && d.can.edit && !edit ? <button type="button" style={btn()} onClick={startEdit}>{t("profit.edit_settings")}</button> : null}
          <button type="button" onClick={onClose} style={{ ...btn(), padding: "5px 10px" }} aria-label={t("profit.close")}>✕</button>
        </div>
        {err ? <div style={{ color: T.red, fontSize: 13 }}>{err}</div> : null}
        {!p && !err ? <div style={{ color: T.t3, fontSize: 13, padding: 20 }}>{t("profit.loading")}</div> : null}
        {p ? (
          <>
            {p.flags.length ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>{p.flags.map((f) => <Chip key={f} kind={FLAG_KIND[f]}>{flagLabel(f)}</Chip>)}</div> : null}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 6 }}>
              <Stat label={t("profit.col_boq_psf")} value={inr(p.boq_psf)} />
              <Stat label={t("profit.col_budget_psf")} value={inr(p.budget_psf)} />
              <Stat label={t("profit.col_plan_psf")} value={inr(p.plan_margin_psf)} color={tone(p.plan_margin_psf)} />
              <Stat label={t("profit.col_billed_psf")} value={inr(p.billed_psf)} />
              <Stat label={t("profit.col_cost_psf")} value={inr(p.cost_psf)} />
              <Stat label={t("profit.col_margin_psf")} value={inr(p.margin_psf)} color={marginTone(p.billed, p.margin_psf)} />
            </div>

            {edit ? <SettingsForm p={p} d={d} edit={edit} setEdit={setEdit} busy={busy} msg={msg} onSave={save} onCancel={() => setEdit(null)} /> : (
              <>
                <Section title={t("profit.sec_area")}>
                  <KV k={t("profit.area_total")} v={p.area > 0 ? `${sqft(p.area)} ${t("profit.sqft")}` : t("profit.area_none")} strong />
                  {p.area_source === "estimate" && isNum(p.area_original) && Math.round(p.area_original) !== Math.round(p.area)
                    ? <KV k={t("profit.area_original")} v={`${sqft(p.area_original)} ${t("profit.sqft")}`} /> : null}
                  {p.area_source === "manual" ? <KV k={t("profit.area_source")} v={t("profit.area_manual")} /> : null}
                  {p.area_parts.map((c) => (
                    <div key={c.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: c.included ? T.t2 : T.t4 }}>
                      <span>{c.included ? "✓ " : "· "}{c.category} <span style={{ color: T.t4 }}>({c.estimate_no})</span></span>
                      <span>{sqft(c.qty)}</span>
                    </div>
                  ))}
                  {!p.area_parts.length && !p.estimates ? <div style={{ fontSize: 12, color: T.t3 }}>{t("profit.area_no_estimate")}</div> : null}
                </Section>

                <Section title={t("profit.sec_plan")}>
                  <KV k={t("profit.col_boq")} v={`${lakh(p.boq)}${p.extra > 0 ? ` (${t("profit.incl_extra", { v: lakh(p.extra) })})` : ""}`} />
                  {isNum(p.boq_original) && Math.round(p.boq_original) !== Math.round(p.boq - p.extra)
                    ? <KV k={t("profit.boq_original")} v={lakh(p.boq_original)} /> : null}
                  <KV k={t("profit.col_budget")} v={p.budget != null ? `${lakh(p.budget)} · ${t(`profit.bsrc_${p.budget_source}`)}` : t(p.budget_source === "sqft_no_area" ? "profit.bsrc_sqft_no_area" : "profit.budget_none")} />
                  {p.task_budget > 0 && p.budget_source !== "task"
                    ? <div style={{ fontSize: 11.5, color: T.amb, marginTop: 2 }}>{t("profit.task_budget_hint", { v: lakh(p.task_budget), st: p.task_budget_status })}</div> : null}
                  <KV k={t("profit.col_plan")} v={p.plan_margin != null ? `${lakh(p.plan_margin)} · ${inr(p.plan_margin_psf)}/${t("profit.sqft")}` : "—"} color={tone(p.plan_margin)} strong />
                  {d.amendments ? <div style={{ fontSize: 11.5, color: T.t4, marginTop: 2 }}>{t("profit.amendments", { n: d.amendments })}</div> : null}
                </Section>

                <Section title={t("profit.sec_stages")}>
                  <StageTable p={p} />
                  <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6 }}>{t("profit.stage_rule")}</div>
                </Section>

                <Section title={t("profit.sec_money")}>
                  <KV k={t("profit.col_billed")} v={lakh(p.billed)} />
                  {p.done != null ? <KV k={t("profit.col_done")} v={`${lakh(p.done)}${isNum(p.done_pct) ? ` (${p.done_pct}%)` : ""}`} /> : null}
                  <KV k={t("profit.col_received")} v={lakh(p.received)} />
                  <KV k={p.advance >= 0 ? t("profit.advance_plus") : t("profit.advance_minus")} v={lakh(Math.abs(p.advance))} color={tone(p.advance)} strong />
                  <KV k={t("profit.col_margin")} v={lakh(p.margin)} color={marginTone(p.billed, p.margin)} strong />
                  {p.done_margin != null ? <KV k={t("profit.done_margin")} v={lakh(p.done_margin)} color={tone(p.done_margin)} /> : null}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                    <MiniBox l={t("profit.age_30")} v={lakh(p.ageing.d30)} />
                    <MiniBox l={t("profit.age_60")} v={lakh(p.ageing.d60)} />
                    <MiniBox l={t("profit.age_90")} v={lakh(p.ageing.d90)} warn={p.ageing.d90 > 0} />
                  </div>
                </Section>

                <Section title={t("profit.sec_cost")}>
                  {[["material", t("profit.cost_material")], ["labour", t("profit.cost_labour")], ["site", t("profit.cost_site")], ["machine", t("profit.cost_machine")]].map(([k, l]) => (
                    <div key={k} style={{ marginBottom: 6 }}>
                      <KV k={l} v={`${lakh(p.cost_breakup[k])}${p.area > 0 ? ` · ${inr(p.cost_breakup[k] / p.area)}/${t("profit.sqft")}` : ""}`} />
                      <div style={{ height: 5, background: T.bg, borderRadius: 3 }}>
                        <div style={{ height: 5, borderRadius: 3, background: T.acc, width: `${p.cost > 0 ? Math.max(0, Math.min(100, p.cost_breakup[k] / p.cost * 100)) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                  <KV k={t("profit.col_cost")} v={lakh(p.cost)} strong />
                </Section>

                <Section title={t("profit.sec_cash")}>
                  <KV k={t("profit.col_received")} v={lakh(d.cash.received)} />
                  <KV k={t("profit.paid_out")} v={lakh(d.cash.paid_out)} />
                  <KV k={t("profit.cash_net")} v={lakh(d.cash.net)} color={tone(d.cash.net)} strong />
                  <KV k={t("profit.payables", { n: d.payables.bills })} v={lakh(d.payables.unpaid)} />
                  {d.payables.overdue > 0 ? <KV k={t("profit.payables_overdue")} v={lakh(d.payables.overdue)} color={T.red} /> : null}
                </Section>

                <Section title={t("profit.sec_trend")}>
                  <Trend trend={d.trend} />
                </Section>

                {d.estimates.length ? (
                  <Section title={t("profit.sec_estimates")}>
                    {d.estimates.map((e) => <KV key={e.id} k={`${e.estimate_no} · ${e.customer_name || ""}`} v={lakh(e.total_value)} />)}
                  </Section>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}

function MiniBox({ l, v, warn }) {
  return (
    <div style={{ background: warn ? T.ambL : T.soft, borderRadius: 6, padding: "6px 8px" }}>
      <div style={{ fontSize: 11, color: T.t3 }}>{l}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: warn ? T.amb : T.t1 }}>{v}</div>
    </div>
  );
}

function StageTable({ p }) {
  const rowsDef = [["structure", t("profit.stage_structure")], ["finishing", t("profit.stage_finishing")]];
  const c = { padding: "6px 6px", fontSize: 12, textAlign: "right", borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 470 }}>
        <thead>
          <tr style={{ color: T.t3 }}>
            <th style={{ ...c, textAlign: "left", fontWeight: 600 }}>{t("profit.col_stage")}</th>
            <th style={{ ...c, fontWeight: 600 }}>{t("profit.col_boq_psf")}</th>
            <th style={{ ...c, fontWeight: 600 }}>{t("profit.col_budget_psf")}</th>
            <th style={{ ...c, fontWeight: 600 }}>{t("profit.col_plan_psf")}</th>
            <th style={{ ...c, fontWeight: 600 }}>{t("profit.col_target_psf")}</th>
            <th style={{ ...c, fontWeight: 600 }}>{t("profit.col_got_psf")}</th>
          </tr>
        </thead>
        <tbody>
          {rowsDef.map(([k, l]) => {
            const s = p.stages[k];
            return (
              <tr key={k}>
                <td style={{ ...c, textAlign: "left" }}>
                  <div style={{ fontWeight: 500 }}>{l}</div>
                  <div style={{ marginTop: 2 }}><StageChip st={s} /></div>
                  {s.complete ? <div style={{ fontSize: 11, color: T.t4, marginTop: 2 }}>
                    {s.done_on ? t(s.done_on_source === "manual" ? "profit.done_on_manual" : "profit.done_on_auto", { d: fmtDate(s.done_on) }) : t("profit.cell_needs_date")}
                  </div> : null}
                </td>
                <td style={c}>{inr(s.boq_psf)}</td>
                <td style={c}>{inr(s.budget_psf)}</td>
                <td style={{ ...c, color: tone(s.plan_psf) }}>{inr(s.plan_psf)}</td>
                <td style={c}>{inr(s.target_psf)}</td>
                <td style={{ ...c, fontWeight: 600 }}>
                  {isNum(s.profit_psf) ? <>{inr(s.profit_psf)}<div style={{ color: tone(s.vs_target_psf), fontSize: 11 }}>{isNum(s.vs_target_psf) ? signed(s.vs_target_psf) : ""}</div></> : <span style={{ color: T.t4, fontWeight: 400 }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {p.stages.other.boq > 0 ? <div style={{ fontSize: 11.5, color: T.t4, marginTop: 4 }}>{t("profit.other_boq", { v: lakh(p.stages.other.boq) })}</div> : null}
      {isNum(p.stages.structure.cost) || isNum(p.stages.finishing.cost) ? (
        <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4 }}>
          {isNum(p.stages.structure.cost) ? <div>{t("profit.stage_cost_line", { st: t("profit.stage_structure"), boq: lakh(p.stages.structure.boq), cost: lakh(p.stages.structure.cost), profit: lakh(p.stages.structure.profit) })}</div> : null}
          {isNum(p.stages.finishing.cost) ? <div>{t("profit.stage_cost_line", { st: t("profit.stage_finishing"), boq: lakh(p.stages.finishing.boq), cost: lakh(p.stages.finishing.cost), profit: lakh(p.stages.finishing.profit) })}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function Trend({ trend }) {
  const has = (trend || []).some((m) => m.cost || m.in);
  if (!has) return <div style={{ fontSize: 12, color: T.t3 }}>{t("profit.trend_empty")}</div>;
  const option = {
    grid: { left: 48, right: 10, top: 26, bottom: 24 },
    tooltip: { trigger: "axis", valueFormatter: (v) => inr(v) },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 11, color: T.t3 } },
    xAxis: { type: "category", data: trend.map((m) => m.month), axisLabel: { fontSize: 10.5, color: T.t3 }, axisLine: { lineStyle: { color: T.b1 } } },
    yAxis: { type: "value", axisLabel: { fontSize: 10.5, color: T.t3, formatter: (v) => lakh(v) }, splitLine: { lineStyle: { color: T.b1 } } },
    series: [
      { name: t("profit.trend_cost"), type: "bar", data: trend.map((m) => m.cost), itemStyle: { color: T.acc }, barMaxWidth: 14 },
      { name: t("profit.trend_in"), type: "bar", data: trend.map((m) => m.in), itemStyle: { color: T.b2 }, barMaxWidth: 14 },
    ],
  };
  return <Suspense fallback={<div style={{ height: 200 }} />}><EChart option={option} height={200} /></Suspense>;
}

function SettingsForm({ p, d, edit, setEdit, busy, msg, onSave, onCancel }) {
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const toggle = (key) => { const s = new Set(edit.inc); if (s.has(key)) s.delete(key); else s.add(key); setEdit({ ...edit, inc: s }); };
  return (
    <div style={{ borderTop: `1px solid ${T.b1}`, paddingTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t("profit.sec_area")}</div>
      {p.area_parts.length ? (
        <>
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 6 }}>{t("profit.area_pick_help")}</div>
          {p.area_parts.map((c) => (
            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={edit.inc.has(c.key)} onChange={() => toggle(c.key)} />
              <span style={{ marginRight: "auto" }}>{c.category} <span style={{ color: T.t4 }}>({c.estimate_no})</span>{c.auto ? <span style={{ color: T.t4 }}> · {t("profit.auto")}</span> : null}</span>
              <span>{sqft(c.qty)}</span>
            </label>
          ))}
        </>
      ) : <div style={{ fontSize: 11.5, color: T.t3 }}>{t("profit.area_manual_help")}</div>}
      <label style={{ ...lbl, marginTop: 8 }}>{t("profit.f_area_manual")}
        <input type="number" min="0" value={edit.area_manual} onChange={(e) => set("area_manual", e.target.value)} style={inp} /></label>

      <div style={{ fontSize: 13, fontWeight: 600, margin: "14px 0 6px" }}>{t("profit.sec_budget")}</div>
      <label style={lbl}>{t("profit.f_budget_mode")}
        <select value={edit.budget_mode} onChange={(e) => set("budget_mode", e.target.value)} style={inp}>
          <option value="">{t("profit.bmode_auto")}</option>
          <option value="task">{t("profit.bmode_task", { v: lakh(p.task_budget) })}</option>
          <option value="sqft">{t("profit.bmode_sqft")}</option>
        </select></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label style={lbl}>{t("profit.f_budget_structure")}<input type="number" min="0" value={edit.budget_structure_psf} onChange={(e) => set("budget_structure_psf", e.target.value)} style={inp} /></label>
        <label style={lbl}>{t("profit.f_budget_finishing")}<input type="number" min="0" value={edit.budget_finishing_psf} onChange={(e) => set("budget_finishing_psf", e.target.value)} style={inp} /></label>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: "14px 0 6px" }}>{t("profit.sec_stage_dates")}</div>
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 6 }}>{t("profit.stage_dates_help")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={lbl}>{t("profit.f_structure_done")}<input type="date" max={d.today} value={edit.structure_done_on} onChange={(e) => set("structure_done_on", e.target.value)} style={inp} />
          {p.stages.structure.done_on_source === "auto" ? <span style={{ color: T.t4 }}>{t("profit.auto_date", { d: fmtDate(p.stages.structure.done_on) })}</span> : null}</label>
        <label style={lbl}>{t("profit.f_finishing_done")}<input type="date" max={d.today} value={edit.finishing_done_on} onChange={(e) => set("finishing_done_on", e.target.value)} style={inp} />
          {p.stages.finishing.done_on_source === "auto" ? <span style={{ color: T.t4 }}>{t("profit.auto_date", { d: fmtDate(p.stages.finishing.done_on) })}</span> : null}</label>
      </div>

      {d.can.target ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, margin: "14px 0 6px" }}>{t("profit.sec_site_target")}</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 6 }}>{t("profit.site_target_help")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={lbl}>{t("profit.f_structure_psf")}<input type="number" min="0" value={edit.target_structure_psf} onChange={(e) => set("target_structure_psf", e.target.value)} style={inp} /></label>
            <label style={lbl}>{t("profit.f_finishing_psf")}<input type="number" min="0" value={edit.target_finishing_psf} onChange={(e) => set("target_finishing_psf", e.target.value)} style={inp} /></label>
          </div>
        </>
      ) : null}

      {msg ? <div style={{ color: T.red, fontSize: 12.5, marginTop: 10 }}>{msg}</div> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button type="button" style={btn()} onClick={onCancel}>{t("profit.cancel")}</button>
        <button type="button" style={btn(true)} disabled={busy} onClick={onSave}>{busy ? t("profit.saving") : t("profit.save")}</button>
      </div>
    </div>
  );
}
