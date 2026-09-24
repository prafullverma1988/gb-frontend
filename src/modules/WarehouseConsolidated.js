// ── SAB GODOWN MILAKAR — material-wise stock ──────────────────────
// "Store" tab ka doosra roop. Har material ka KUL stock (sab chalu godown
// ka jod); click karo to kaunse godown me kitna — share ki patti ke saath,
// aur "Is godown me jao" se seedha us godown ka Stock.
//
// Data: GET /warehouse/warehouses/stock — company-level (api.js is raaste
// par warehouse_id nahi jodta). Naam + unit dono se milaan: Bags aur Kg kabhi
// ek line me nahi judte.

import { useState, useEffect } from "react";
import api from "../config/api";
import { t } from "../i18n";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF",
  grn: "#059669", grnL: "#ECFDF5",
  red: "#DC2626", redL: "#FEF2F2",
  slt: "#64748B", sltL: "#F1F5F9",
};
const fmtQ = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return "₹" + (v / 1e7).toFixed(2).replace(/\.?0+$/, "") + " Cr";
  if (v >= 1e5) return "₹" + (v / 1e5).toFixed(2).replace(/\.?0+$/, "") + " L";
  return "₹" + Math.round(v).toLocaleString("en-IN");
};
const COLS = "1.7fr 130px 90px 110px 90px";

// Store tab: Godown-wise (purana) | Material-wise (naya)
export function AllGodownsView({ godownsView, activeId, onGoto }) {
  const [view, setView] = useState("godowns");
  return (
    <div>
      <div style={{ display: "inline-flex", gap: 3, background: T.sltL, borderRadius: 9, padding: 3, marginBottom: 14 }}>
        {[["godowns", t("warehouse.all_view_godowns")], ["materials", t("warehouse.all_view_materials")]].map(([id, l]) => (
          <button key={id} onClick={() => setView(id)}
            style={{ padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
              fontWeight: view === id ? 700 : 500, background: view === id ? T.surface : "transparent",
              boxShadow: view === id ? "0 1px 2px rgba(15,23,42,.12)" : "none", color: view === id ? T.t1 : T.t3 }}>
            {l}
          </button>
        ))}
      </div>
      {view === "godowns" ? godownsView : <ConsolidatedStock activeId={activeId} onGoto={onGoto}/>}
    </div>
  );
}

function ConsolidatedStock({ activeId, onGoto }) {
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState(null);   // khula hua material key

  useEffect(() => {
    let alive = true;
    api.get("/warehouse/warehouses/stock").then(r => {
      if (alive) setD(r.success ? r.data : { materials: [], godowns: 0, total_value: 0, _err: r.message || "" });
    }).catch(() => { if (alive) setD({ materials: [], godowns: 0, total_value: 0 }); });
    return () => { alive = false; };
  }, []);

  if (!d) return <div style={{ padding: 40, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("warehouse.all_loading")}</div>;
  const ql = q.trim().toLowerCase();
  const list = d.materials.filter(m => (!lowOnly || m.low_godowns > 0) && (!ql || m.material_name.toLowerCase().includes(ql)));
  const keyOf = (m) => m.material_name + "|" + m.unit;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("warehouse.all_search")}
          style={{ flex: "1 1 220px", maxWidth: 320, padding: "8px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit" }}/>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, cursor: "pointer" }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)}/> {t("warehouse.all_low_only")}
        </label>
        <span style={{ flex: 1 }}/>
        <span style={{ fontSize: 12, color: T.t3 }}>
          {t("warehouse.all_summary", { m: d.materials.length, g: d.godowns, v: fmtMoney(d.total_value) })}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 10 }}>{t("warehouse.all_hint")}</div>
      {d._err && <div style={{ padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 10 }}>{d._err}</div>}

      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", background: T.surface }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "9px 14px", background: "#1E293B" }}>
          {[[t("warehouse.all_col_material"), 0], [t("warehouse.all_col_total"), 1], [t("warehouse.all_col_godowns"), 1], [t("warehouse.all_col_value"), 1], [t("warehouse.all_col_low"), 1]].map(([h, r], i) => (
            <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: r ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {list.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("warehouse.all_empty")}</div>}
        {list.map((m, i) => {
          const k = keyOf(m);
          const isOpen = open === k;
          return (
            <div key={k} style={{ borderTop: `1px solid ${T.b1}` }}>
              <div onClick={() => setOpen(isOpen ? null : k)}
                style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "10px 14px", cursor: "pointer", alignItems: "center",
                  background: isOpen ? T.bluL : (i % 2 ? T.surfaceB : T.surface) }}>
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: T.t4, width: 10 }}>{isOpen ? "▾" : "▸"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.material_name}</div>
                    {m.category && <div style={{ fontSize: 10.5, color: T.t4 }}>{m.category}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 14, fontWeight: 800, color: T.t1 }}>
                  {fmtQ(m.total_qty)} <span style={{ fontSize: 11, fontWeight: 600, color: T.t4 }}>{m.unit}</span>
                </div>
                <div style={{ textAlign: "right", fontSize: 12.5, color: T.t2 }}>{m.godown_count}</div>
                <div style={{ textAlign: "right", fontSize: 12.5, color: T.t2 }}>{m.total_value ? fmtMoney(m.total_value) : "—"}</div>
                <div style={{ textAlign: "right" }}>
                  {m.low_godowns > 0
                    ? <span style={{ fontSize: 10.5, fontWeight: 700, color: T.red, background: T.redL, borderRadius: 10, padding: "2px 8px" }}>{m.low_godowns}</span>
                    : <span style={{ fontSize: 12, color: T.b2 }}>—</span>}
                </div>
              </div>
              {isOpen && (
                <div style={{ background: T.surfaceB, padding: "6px 14px 12px 36px" }}>
                  {m.godowns.map(g => {
                    const share = m.total_qty > 0 ? Math.max(0, Math.min(100, (g.qty / m.total_qty) * 100)) : 0;
                    const here = String(g.warehouse_id) === String(activeId);
                    return (
                      <div key={g.warehouse_id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 120px 100px 150px", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px dashed ${T.b1}` }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{g.warehouse_name}</div>
                          <div style={{ fontSize: 10.5, color: T.t4 }}>{g.incharge_name ? t("warehouse.all_incharge", { name: g.incharge_name }) : t("warehouse.all_no_incharge")}</div>
                        </div>
                        <div style={{ height: 6, background: T.b1, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: share + "%", height: "100%", background: g.low ? T.red : T.grn }}/>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800, color: g.low ? T.red : T.t1 }}>
                          {fmtQ(g.qty)} <span style={{ fontSize: 10.5, fontWeight: 600, color: T.t4 }}>{m.unit}</span>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 12, color: T.t3 }}>{g.value ? fmtMoney(g.value) : "—"}</div>
                        <div style={{ textAlign: "right" }}>
                          {here
                            ? <span style={{ fontSize: 11, color: T.t4 }}>{t("warehouse.all_you_are_here")}</span>
                            : <button onClick={() => onGoto(g.warehouse_id)}
                                style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surface, color: T.blu, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                {t("warehouse.all_goto")}
                              </button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
