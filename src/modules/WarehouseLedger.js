// ── WAREHOUSE MATERIAL LEDGER ─────────────────────────────────────
// Godown ka khaata — project ke Material Ledger (MaterialLedgerDrawer) jaisa
// hi dikhne wala: upar abhi ka stock, Aaya / Gaya / Stock, neeche har entry
// chalte balance ke saath. Har line batati hai KAUN: kisne diya (vendor +
// challan), godown me kisne liya; kaun le gaya, kisne issue kiya, site par
// pahucha ki nahi.
//
// Data: GET /warehouse/material-ledger (list) aur ?name= (ek material) —
// api.js chuna hua godown khud jod deta hai.
//
// Zyadatar purana stock kisi entry se nahi aaya (seed / haath se qty) — server
// use `opening` deta hai; wo "Pehle ka stock" ki pehli line banta hai, taaki
// chalta balance hamesha asli stock par khatam ho.

import { useState, useEffect, useMemo } from "react";
import api from "../config/api";
import { t } from "../i18n";
import { BackClose } from "../utils/backNav";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF",
  grn: "#059669", grnL: "#ECFDF5",
  red: "#DC2626", redL: "#FEF2F2",
  amb: "#D97706", ambL: "#FFFBEB",
  pur: "#7C3AED", purL: "#F5F3FF",
  cyn: "#0891B2", cynL: "#E0F2FE",
};
const GRID = "58px 1fr 52px 52px 62px";

const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? "—" : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};
const fmtQ = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const ts = (d) => { const x = d ? new Date(d).getTime() : 0; return isNaN(x) ? 0 : x; };

// Har tarah ki entry ka rang + naam.
const kindMeta = (k) => ({
  opening:      { c: T.t3,  label: t("warehouse.ledger_k_opening") },
  grn:          { c: T.grn, label: t("warehouse.ledger_k_grn") },
  addstock:     { c: T.grn, label: t("warehouse.ledger_k_addstock") },
  return:       { c: T.cyn, label: t("warehouse.ledger_k_return") },
  transfer_in:  { c: T.pur, label: t("warehouse.ledger_k_tr_in") },
  issue:        { c: T.amb, label: t("warehouse.ledger_k_issue") },
  transfer_out: { c: T.pur, label: t("warehouse.ledger_k_tr_out") },
  before:       { c: T.t3,  label: t("warehouse.ledger_k_before") },
}[k] || { c: T.t3, label: k });

// Entry ki doosri line — "kaun" wali baat.
const whoLine = (e) => {
  const bits = [];
  if (e.challan) bits.push(t("warehouse.ledger_challan", { no: e.challan }));
  if (e.po_no) bits.push(t("warehouse.ledger_po", { no: e.po_no }));
  if (e.kind === "issue") {
    if (e.to) bits.push(t("warehouse.ledger_taken_by", { name: e.to }));
    if (e.by) bits.push(t("warehouse.ledger_issued_by", { name: e.by }));
  } else if (e.kind === "transfer_out") {
    if (e.by) bits.push(t("warehouse.ledger_sent_by", { name: e.by }));
    if (e.recv_by) bits.push(t("warehouse.ledger_recv_by", { name: e.recv_by }));
  } else {
    if (e.sent_by) bits.push(t("warehouse.ledger_sent_by", { name: e.sent_by }));
    if (e.by) bits.push(t("warehouse.ledger_recv_by", { name: e.by }));
  }
  return bits.join(" · ");
};
// Gaya maal pahucha ki nahi.
const reachLine = (e) => {
  if (e.kind === "issue") {
    if (e.site_recv_by || e.status === "Received") return { txt: t("warehouse.ledger_site_got", { name: e.site_recv_by || "—" }), c: T.grn };
    return { txt: t("warehouse.ledger_site_pending"), c: T.amb };
  }
  if (e.kind === "transfer_out") {
    if (e.status === "Completed" || e.status === "Partial") return null;
    return { txt: t("warehouse.ledger_on_way"), c: T.amb };
  }
  return null;
};

// ════════════════════════════════════════════════════════════════
// Tab — har material ka Aaya / Gaya / Stock
// ════════════════════════════════════════════════════════════════
export function WarehouseLedgerTab({ onOpen }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/warehouse/material-ledger").then(r => {
      if (!alive) return;
      if (r.success) setList(r.data || []); else { setErr(r.message || ""); setList([]); }
    }).catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, []);

  const ql = q.trim().toLowerCase();
  const rows = (list || []).filter(m => !ql || String(m.material_name || "").toLowerCase().includes(ql));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("warehouse.ledger_search")}
          style={{ flex: "1 1 240px", maxWidth: 360, padding: "8px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit" }}/>
        <span style={{ fontSize: 11.5, color: T.t3 }}>{t("warehouse.ledger_list_hint")}</span>
      </div>
      {err && <div style={{ padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 10 }}>{err}</div>}
      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", background: T.surface }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 90px 90px 100px 110px", gap: 8, padding: "9px 14px", background: "#1E293B" }}>
          {[[t("warehouse.ledger_col_material"), 0], [t("warehouse.ledger_in"), 1], [t("warehouse.ledger_out"), 1], [t("warehouse.ledger_stock"), 1], [t("warehouse.ledger_last"), 1]].map(([h, r], i) => (
            <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: r ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {list === null && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("warehouse.ledger_loading")}</div>}
        {list && rows.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("warehouse.ledger_empty")}</div>}
        {rows.map((m, i) => {
          const last = [m.last_in, m.last_out].filter(Boolean).sort((a, b) => ts(b) - ts(a))[0];
          const low = m.stock <= 0 || (m.min_qty > 0 && m.stock < m.min_qty);
          return (
            <div key={m.material_name + i} onClick={() => onOpen(m)}
              style={{ display: "grid", gridTemplateColumns: "1.6fr 90px 90px 100px 110px", gap: 8, padding: "10px 14px", borderTop: `1px solid ${T.b1}`, cursor: "pointer", alignItems: "center", background: i % 2 ? T.surfaceB : T.surface }}
              onMouseEnter={ev => { ev.currentTarget.style.background = T.bluL; }}
              onMouseLeave={ev => { ev.currentTarget.style.background = i % 2 ? T.surfaceB : T.surface; }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.material_name}</div>
                <div style={{ fontSize: 10.5, color: T.t4 }}>
                  {m.unit}{m.entries ? " · " + t("warehouse.ledger_entries", { n: m.entries }) : " · " + t("warehouse.ledger_no_entry")}
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: m.total_in ? T.grn : T.b2, textAlign: "right" }}>{m.total_in ? "+" + fmtQ(m.total_in) : "—"}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: m.total_out ? T.red : T.b2, textAlign: "right" }}>{m.total_out ? "−" + fmtQ(m.total_out) : "—"}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: low ? T.red : T.t1, textAlign: "right" }}>{fmtQ(m.stock)}</div>
              <div style={{ fontSize: 11, color: T.t3, textAlign: "right" }}>{fmtDate(last)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Drawer — ek material ka poora khaata
// ════════════════════════════════════════════════════════════════
export function WarehouseLedgerDrawer({ material, godownName, onClose }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("all");        // all | in | out
  const [sortNew, setSortNew] = useState(true);

  useEffect(() => {
    let alive = true;
    setD(null); setTab("all"); setSortNew(true);
    api.get("/warehouse/material-ledger?name=" + encodeURIComponent(material.material_name)).then(r => {
      if (alive) setD(r.success && r.data ? r.data : { _err: r.message || "", rows: [] });
    }).catch(() => { if (alive) setD({ _err: "", rows: [] }); });
    return () => { alive = false; };
  }, [material]);

  // Chalta balance hamesha purane se naye ki taraf, "pehle ka" se shuru.
  const rows = useMemo(() => {
    if (!d || !d.rows) return [];
    const out = [];
    let bal = Number(d.opening) || 0;
    if (bal !== 0) out.push({ kind: "before", type: bal > 0 ? "in" : "out", qty: Math.abs(bal), date: null, ref: "", party: t("warehouse.ledger_opening"), bal, _before: true });
    for (const e of d.rows) {
      bal += e.type === "in" ? e.qty : -e.qty;
      out.push({ ...e, bal });
    }
    return sortNew ? out.slice().reverse() : out;
  }, [d, sortNew]);

  const visible = tab === "all" ? rows : rows.filter(e => e.type === tab && !e._before);
  const stock = d ? d.stock : material.stock;
  // Min se neeche ya khatam = laal (mobile aur Stock tab jaisa hi niyam).
  const stockColor = stock <= 0 || (material.min_qty > 0 && stock < material.min_qty) ? T.red : T.grn;
  const TABS = [
    { id: "all", l: t("warehouse.ledger_all"), n: rows.length },
    { id: "in",  l: t("warehouse.ledger_in"),  n: rows.filter(e => e.type === "in" && !e._before).length },
    { id: "out", l: t("warehouse.ledger_out"), n: rows.filter(e => e.type === "out" && !e._before).length },
  ];

  return (
    <>
      <BackClose onClose={onClose}/>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1400, backdropFilter: "blur(2px)" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(640px,100vw)",
        background: T.surface, zIndex: 1401, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{ background: "#0D1B2A", padding: "14px 20px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{material.material_name}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", marginTop: 2 }}>
              {t("warehouse.ledger_title_unit", { unit: material.unit || "" })}{godownName ? " · " + godownName : ""}
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ height: 3, background: T.pur, flexShrink: 0 }}/>

        <div style={{ padding: "18px 20px 12px", textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 10.5, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px" }}>{t("warehouse.ledger_stock_now")}</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: stockColor, lineHeight: 1.05, marginTop: 3 }}>
            {fmtQ(stock)}<span style={{ fontSize: 15, fontWeight: 600, color: T.t4, marginLeft: 5 }}>{material.unit}</span>
          </div>
        </div>
        <div style={{ margin: "0 20px 14px", display: "flex", border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          {[[t("warehouse.ledger_in"), d ? d.total_in : material.total_in, T.grn],
            [t("warehouse.ledger_out"), d ? d.total_out : material.total_out, T.red],
            [t("warehouse.ledger_stock"), stock, stockColor]].map(([l, v, c], i) => (
            <div key={i} style={{ flex: 1, padding: "10px 8px", textAlign: "center", borderLeft: i ? `1px solid ${T.b1}` : "none", background: T.surfaceB }}>
              <div style={{ fontSize: 9.5, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c, marginTop: 2 }}>{fmtQ(v)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, flexShrink: 0 }}>
          {TABS.map(x => (
            <button key={x.id} onClick={() => setTab(x.id)}
              style={{ padding: "6px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: tab === x.id ? T.blu : "transparent", color: tab === x.id ? "#fff" : T.t3 }}>
              {x.l} <span style={{ opacity: 0.7, fontSize: 10.5 }}>{x.n}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}/>
          <button onClick={() => setSortNew(s => !s)}
            style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surfaceB, color: T.t2, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
            {sortNew ? t("material_ledger.newest") : t("material_ledger.oldest")}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "7px 16px", background: "#1E293B", position: "sticky", top: 0, zIndex: 1 }}>
            {[[t("warehouse.ledger_col_date"), 0], [t("warehouse.ledger_col_details"), 0], [t("warehouse.ledger_in"), 1], [t("warehouse.ledger_out"), 1], [t("warehouse.ledger_col_bal"), 1]].map(([h, r], i) => (
              <div key={i} style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: r ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {!d && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("warehouse.ledger_loading")}</div>}
          {d && d._err && <div style={{ margin: 14, padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12 }}>{d._err || t("warehouse.ledger_load_fail")}</div>}
          {d && visible.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t3 }}>{t("warehouse.ledger_no_entry")}</div>}
          {visible.map((e, i) => {
            const km = kindMeta(e.kind);
            const isIn = e.type === "in";
            const who = e._before ? t("warehouse.ledger_opening_hint") : whoLine(e);
            const reach = reachLine(e);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "8px 16px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", borderLeft: `3px solid ${km.c}`, background: i % 2 ? T.surfaceB : T.surface }}>
                <div style={{ fontSize: 10.5, color: T.t3 }}>{e._before ? "—" : fmtDate(e.date)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.party || "—"}</div>
                  <div style={{ fontSize: 9.5, color: T.t4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {!e._before && <span style={{ fontFamily: "monospace", color: km.c, fontWeight: 700 }}>{e.ref}</span>}
                    {!e._before && <span style={{ color: km.c }}> · {km.label}</span>}
                    {who ? (e._before ? who : " · " + who) : ""}
                  </div>
                  {reach && <div style={{ fontSize: 9.5, color: reach.c, fontWeight: 600 }}>{reach.txt}</div>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isIn ? T.grn : T.b2, textAlign: "right" }}>{isIn ? fmtQ(e.qty) : "—"}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: !isIn ? T.red : T.b2, textAlign: "right" }}>{!isIn ? fmtQ(e.qty) : "—"}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: e.bal < 0 ? T.red : T.t1, textAlign: "right" }}>{fmtQ(e.bal)}</div>
              </div>
            );
          })}
          {d && !d._err && rows.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "9px 16px", background: "#0F172A" }}>
              <div style={{ gridColumn: "1 / 3", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("common.total")}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#4ADE80", textAlign: "right" }}>{fmtQ(d.total_in)}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#F87171", textAlign: "right" }}>{fmtQ(d.total_out)}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textAlign: "right" }}>{fmtQ(d.stock)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
