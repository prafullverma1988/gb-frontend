import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

/* ────────────────────────────────────────────────────────────────────
   TENDER SE PLAN — package ko is site par utaaro

   Tender ka BOQ work packages me bant chuka hai (Tenders → BOQ tab).
   Yahan PM ek package chunta hai aur uske BOQ items site ke task tree
   me utar jaate hain: package ka naam parent task, har item ek child
   task apne unit aur qty ke saath, BOQ se juda hua.

   ⚠️ SEEMA: tender kabhi task nahi banata — task project ka hissa hai.
   Isiliye ye wizard project ke Tasks tab me hai, tender ke andar nahi.

   Backend: GET  /tasks/project/:id/tender-packages
            POST /tasks/project/:id/tender-plan
   ──────────────────────────────────────────────────────────────────── */

const WTYPE_LABEL = {
  pipeline: "Pipeline", structure: "Structure", road: "Road",
  drain: "Drain", electrical: "Electrical", other: "Anya",
};
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

// BOQ ki lambi description se task ka pehla naam. Sheet me poora spec
// hota hai jo task list me padha hi nahi jaata — pehla tukda kaafi hai,
// aur PM waise bhi edit kar sakta hai.
const shortName = (d) => {
  const s = String(d || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > 70 ? s.slice(0, 70).replace(/\s+\S*$/, "") + "…" : s;
};

export default function TenderPlanWizard({ projectId, onClose, onDone }) {
  const [data, setData] = useState(null);
  const [pkgId, setPkgId] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [aligns, setAligns] = useState([]);

  const load = useCallback(async () => {
    const r = await api.get(`/tasks/project/${projectId}/tender-packages`);
    if (!r?.success) { setErr(r?.message || "Packages nahi mile"); return; }
    setData(r.data);
    if (r.data.tender_id) {
      // Pipeline/road/drain package me stretch chun sakte hain — is site ki.
      const a = await api.get(`/tenders/by-project/${projectId}/alignments`);
      if (a?.success) setAligns(Array.isArray(a.data) ? a.data : (a.data?.lines || []));
    }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const pkg = (data?.packages || []).find((p) => p.id === pkgId) || null;

  // Package chunte hi rows taiyaar — jo pehle se plan me hain wo untick,
  // taaki dobara chalane par duplicate na bane.
  const pick = (p) => {
    setPkgId(p.id);
    setRows((p.items || []).map((it) => ({
      ...it,
      take: !it.already,
      name: shortName(it.description) || it.item_no || "Item",
      qty: Math.max(0, it.qty - it.planned_elsewhere),
      alignment_id: "",
    })));
  };

  const upd = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.take && Number(r.qty) > 0);

  const create = async () => {
    if (!chosen.length) { setErr("Kam se kam ek item chuno"); return; }
    setBusy(true); setErr("");
    const r = await api.post(`/tasks/project/${projectId}/tender-plan`, {
      package_id: pkgId,
      rows: chosen.map((c) => ({
        boq_item_id: c.boq_item_id, name: c.name, qty: c.qty,
        alignment_id: c.alignment_id || null,
      })),
    });
    setBusy(false);
    if (!r?.success) { setErr(r?.message || "Plan nahi bana"); return; }
    onDone?.(r.message);
    onClose?.();
  };

  const wrap = { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 90,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const card = { background: T.surface, borderRadius: 13, width: "min(980px, 96vw)",
    maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" };
  const th = { fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase",
    letterSpacing: ".4px", textAlign: "left", padding: "7px 9px", borderBottom: `1px solid ${T.b1}` };
  const td = { fontSize: 11.5, color: T.t2, padding: "6px 9px", borderBottom: `1px solid ${T.b1}`, verticalAlign: "top" };

  return (
    <div style={wrap} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={card}>
        <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>Tender se plan lao</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
            {pkg ? `"${pkg.name}" — jo items is site par karne hain wo chuno`
                 : "Package chuno — uske BOQ items is site ke task tree me utar jayenge"}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {!data && !err && <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12.5, color: T.t3 }}>Load ho raha hai…</div>}

          {data && !data.tender_id && (
            <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12.5, color: T.t3, lineHeight: 1.6 }}>
              Ye site kisi tender se judi nahi hai.<br />
              <span style={{ fontSize: 11.5, color: T.t4 }}>Tender ke Sites tab se jodo, phir yahan package aa jayenge.</span>
            </div>
          )}

          {data?.tender_id && !data.packages.length && (
            <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12.5, color: T.t3, lineHeight: 1.6 }}>
              Is tender me abhi koi work package nahi bana.<br />
              <span style={{ fontSize: 11.5, color: T.t4 }}>Tenders → BOQ tab me "Packages banao" dabao — BOQ apne aap bant jayegi.</span>
            </div>
          )}

          {/* Step 1 — package chuno */}
          {data?.packages?.length > 0 && !pkg && (
            <div>
              {data.packages.map((p) => (
                <button key={p.id} onClick={() => pick(p)} disabled={!p.pending_items}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    padding: "10px 12px", marginBottom: 7, borderRadius: 9, fontFamily: "inherit",
                    border: `1px solid ${T.b1}`, background: p.pending_items ? T.surface : T.surfaceB,
                    cursor: p.pending_items ? "pointer" : "default", opacity: p.pending_items ? 1 : 0.6 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, padding: "3px 7px", borderRadius: 5,
                    background: T.surfaceB, color: T.t3, whiteSpace: "nowrap" }}>
                    {WTYPE_LABEL[p.wtype] || p.wtype}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.t1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: T.t4, marginTop: 1 }}>
                      {p.total_items} item · {p.pending_items ? `${p.pending_items} abhi plan me nahi` : "sab pehle se plan me hain"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — items */}
          {pkg && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 30 }}></th>
                  <th style={{ ...th, width: 52 }}>Item</th>
                  <th style={th}>Task ka naam</th>
                  <th style={{ ...th, width: 120, textAlign: "right" }}>Is site ka scope</th>
                  {!!aligns.length && <th style={{ ...th, width: 150 }}>Stretch</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.boq_item_id} style={{ background: r.take ? "transparent" : T.surfaceB }}>
                    <td style={td}>
                      <input type="checkbox" checked={r.take} onChange={(e) => upd(i, { take: e.target.checked })} />
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: T.t4 }}>{r.item_no || "—"}</td>
                    <td style={td}>
                      <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} disabled={!r.take}
                        style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", borderRadius: 6,
                          border: `1px solid ${T.b1}`, fontSize: 11.5, color: T.t1, background: T.surface,
                          outline: "none", fontFamily: "inherit" }} />
                      <div style={{ fontSize: 10, color: T.t4, marginTop: 2, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.description}>{r.description}</div>
                      {r.already && <div style={{ fontSize: 10, color: T.amb, marginTop: 1 }}>Is site par pehle se plan me hai</div>}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <input type="number" value={r.qty} onChange={(e) => upd(i, { qty: e.target.value })} disabled={!r.take}
                        style={{ width: 92, textAlign: "right", padding: "5px 7px", borderRadius: 6,
                          border: `1px solid ${T.b1}`, fontSize: 11.5, color: T.t1, background: T.surface,
                          outline: "none", fontFamily: "inherit" }} />
                      <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>
                        BOQ {fmtQty(r.qty_total ?? r.qty + r.planned_elsewhere)} {r.unit}
                        {r.planned_elsewhere > 0 && ` · ${fmtQty(r.planned_elsewhere)} kahin aur`}
                      </div>
                    </td>
                    {!!aligns.length && (
                      <td style={td}>
                        <select value={r.alignment_id} onChange={(e) => upd(i, { alignment_id: e.target.value })} disabled={!r.take}
                          style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${T.b1}`,
                            fontSize: 11, color: T.t2, background: T.surface, outline: "none", fontFamily: "inherit" }}>
                          <option value="">— koi nahi —</option>
                          {aligns.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {err && <div style={{ marginTop: 10, fontSize: 11.5, color: "#991B1B" }}>{err}</div>}
        </div>

        <div style={{ padding: "11px 16px", borderTop: `1px solid ${T.b1}`, display: "flex",
          alignItems: "center", gap: 9, justifyContent: "flex-end" }}>
          {pkg && <span style={{ marginRight: "auto", fontSize: 11.5, color: T.t4 }}>
            {chosen.length} item chune — "{pkg.name.slice(0, 34)}" ke neeche banenge
          </span>}
          {pkg && <button onClick={() => { setPkgId(null); setRows([]); }}
            style={{ padding: "7px 13px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface,
              fontSize: 12, color: T.t2, cursor: "pointer", fontFamily: "inherit" }}>Peeche</button>}
          <button onClick={onClose}
            style={{ padding: "7px 13px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface,
              fontSize: 12, color: T.t2, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          {pkg && <button onClick={create} disabled={busy || !chosen.length}
            style={{ padding: "7px 15px", borderRadius: 7, border: "none", background: T.ind, color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: busy || !chosen.length ? "default" : "pointer",
              opacity: busy || !chosen.length ? 0.6 : 1, fontFamily: "inherit" }}>
            {busy ? "Ban raha hai…" : `${chosen.length} task banao`}
          </button>}
        </div>
      </div>
    </div>
  );
}
