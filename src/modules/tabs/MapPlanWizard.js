import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

/* ────────────────────────────────────────────────────────────────────
   MAP SE PLAN — F2

   Prafull ka ask: "ek project me parent task road, pipe line, ugr,
   boundary wall, drain line ho, uske andar ugr1 ugr2, aise hi pipe
   line ke stretch names — hierarchy fill karna easy ho".

   Wo tree map par PEHLE SE pada hai. To yahan PM sirf tick karta hai:

     Pipe line — Rising main        ← type ka parent
      ├─ CH 0-500      1,037 RMT    ← lambai MAP se, khud bhari hui
      └─ CH 900-1400     963 RMT
     UGR                            ← structures ka parent
      ├─ UGR-1  → Excavation, PCC bed, Raft RCC…   ← stages (badal sakte ho)
      └─ UGR-2

   Backend: GET  /tasks/project/:id/map-plan   (preview)
            POST /tasks/project/:id/map-plan   (banao)
   ──────────────────────────────────────────────────────────────────── */

const fmtLen = (m) => Number(m || 0) >= 1000
  ? (Number(m) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " km"
  : Math.round(Number(m || 0)) + " m";

export default function MapPlanWizard({ projectId, onClose, onDone }) {
  const [data, setData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openStage, setOpenStage] = useState(null);   // "gi:ci" — stage list khuli

  const load = useCallback(async () => {
    const r = await api.get(`/tasks/project/${projectId}/map-plan`);
    if (!r?.success) { setErr(r?.message || "Map ka plan nahi mila"); return; }
    setData(r.data);
    // Jo pehle se bane hain wo untick — dobara banane ka matlab nahi.
    setGroups((r.data.groups || []).map((g) => ({
      ...g,
      children: (g.children || []).map((c) => ({ ...c, take: !c.already })),
    })));
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const updChild = (gi, ci, patch) => setGroups((gs) => gs.map((g, i) =>
    i !== gi ? g : { ...g, children: g.children.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }));
  const toggleGroup = (gi, on) => setGroups((gs) => gs.map((g, i) =>
    i !== gi ? g : { ...g, children: g.children.map((c) => ({ ...c, take: on })) }));

  const chosenCount = groups.reduce((s, g) => s + g.children.filter((c) => c.take).length, 0);
  const taskCount = groups.reduce((s, g) => {
    const kids = g.children.filter((c) => c.take);
    if (!kids.length) return s;
    return s + 1 + kids.length + kids.reduce((x, c) => x + (c.stages?.length || 0), 0);
  }, 0);

  const create = async () => {
    setBusy(true); setErr("");
    const payload = groups
      .map((g) => ({ group: g.group, kind: g.kind, atype: g.atype,
        children: g.children.filter((c) => c.take)
          .map((c) => ({ alignment_id: c.alignment_id, name: c.name, stages: c.stages })) }))
      .filter((g) => g.children.length);
    const r = await api.post(`/tasks/project/${projectId}/map-plan`, { groups: payload });
    setBusy(false);
    if (!r?.success) { setErr(r?.message || "Plan nahi bana"); return; }
    onDone?.(r.message);
    onClose?.();
  };

  const th = { padding: "7px 10px", fontSize: 10, fontWeight: 700, color: T.t4,
    textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ background: T.surface, borderRadius: 13, width: "min(880px, 100%)",
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>Map se plan lao</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
            Map par khinchi lines aur structures se seedha task tree — naam aur lambai
            wahi se aati hai, dobara likhna nahi padta.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
          {!data && !err && <div style={{ padding: "26px 0", textAlign: "center", fontSize: 12.5, color: T.t3 }}>Load ho raha hai…</div>}
          {!!err && <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B",
            borderRadius: 8, padding: "9px 12px", fontSize: 12, marginBottom: 10 }}>{err}</div>}

          {data && !groups.length && (
            <div style={{ padding: "22px 12px", textAlign: "center", fontSize: 12.5, color: T.t3, lineHeight: 1.7 }}>
              Is site par abhi koi line ya structure map par nahi hai.<br />
              <span style={{ fontSize: 11.5, color: T.t4 }}>
                Tenders → Map me line draw karo ya KML import karo, phir yahan poora tree ek click me ban jayega.
              </span>
            </div>
          )}

          {groups.map((g, gi) => {
            const on = g.children.filter((c) => c.take).length;
            return (
              <div key={g.key} style={{ border: `1px solid ${T.b1}`, borderRadius: 9, marginBottom: 9, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", background: T.surfaceB }}>
                  <input type="checkbox" checked={on === g.children.length} ref={(el)=>{ if (el) el.indeterminate = on > 0 && on < g.children.length; }}
                    onChange={(e) => toggleGroup(gi, e.target.checked)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{g.group}</div>
                    <div style={{ fontSize: 10.5, color: T.t4 }}>
                      {g.children.length} {g.kind === "line" ? "line" : "structure"} · {on} chune
                    </div>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={{ ...th, width: 34 }}></th>
                    <th style={th}>Task ka naam</th>
                    <th style={{ ...th, textAlign: "right", width: 120 }}>{g.kind === "line" ? "Scope (map se)" : "Stages"}</th>
                  </tr></thead>
                  <tbody>
                    {g.children.map((c, ci) => {
                      const key = gi + ":" + ci;
                      return (
                        <React.Fragment key={c.alignment_id}>
                          <tr style={{ borderTop: `1px solid ${T.b1}`, background: c.take ? "transparent" : T.surfaceB }}>
                            <td style={{ padding: "6px 10px" }}>
                              <input type="checkbox" checked={!!c.take} onChange={(e) => updChild(gi, ci, { take: e.target.checked })} />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input value={c.name} onChange={(e) => updChild(gi, ci, { name: e.target.value })} disabled={!c.take}
                                style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.b1}`,
                                  fontSize: 12, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />
                              {c.already && <span style={{ fontSize: 10, color: "#059669" }}>✓ pehle se bana hua</span>}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>
                              {g.kind === "line" ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>
                                  {fmtLen(c.scope_qty)} <span style={{ fontSize: 10, color: T.t4, fontWeight: 400 }}>{c.unit}</span>
                                </span>
                              ) : (
                                <button onClick={() => setOpenStage(openStage === key ? null : key)} disabled={!c.take}
                                  style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: c.take ? "pointer" : "default",
                                    border: `1px solid ${T.b1}`, background: T.surface, color: T.t2, fontFamily: "inherit" }}>
                                  {c.stages?.length || 0} stage {openStage === key ? "▴" : "▾"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {openStage === key && g.kind !== "line" && (
                            <tr><td colSpan={3} style={{ padding: "0 10px 9px 44px", background: T.surfaceB }}>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", paddingTop: 8 }}>
                                {(c.stages || []).map((s, si) => (
                                  <span key={si} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                                    padding: "3px 8px", borderRadius: 15, border: `1px solid ${T.b1}`, background: T.surface, color: T.t2 }}>
                                    {s}
                                    <button onClick={() => updChild(gi, ci, { stages: c.stages.filter((_, x) => x !== si) })}
                                      style={{ border: "none", background: "none", cursor: "pointer", color: T.t4, fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                                  </span>
                                ))}
                                <input placeholder="+ naya stage, Enter" onKeyDown={(e) => {
                                  if (e.key === "Enter" && e.target.value.trim()) {
                                    updChild(gi, ci, { stages: [...(c.stages || []), e.target.value.trim()] });
                                    e.target.value = "";
                                  }
                                }} style={{ width: 130, padding: "4px 8px", borderRadius: 6, border: `1px dashed ${T.b2}`,
                                  fontSize: 11, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />
                              </div>
                              <div style={{ fontSize: 10, color: T.t4, marginTop: 6 }}>
                                Stage par qty nahi hoti — supervisor % me marks karta hai. Line par qty map ki lambai se aati hai.
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: `1px solid ${T.b1}` }}>
          <div style={{ flex: 1, fontSize: 11.5, color: T.t3 }}>
            {chosenCount ? `${chosenCount} chune · kul ${taskCount} task banenge (parent + stage samet)` : "Kuch nahi chuna"}
          </div>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={create} disabled={busy || !chosenCount}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: chosenCount ? T.ind : T.b2,
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: chosenCount ? "pointer" : "default", fontFamily: "inherit" }}>
            {busy ? "Ban raha hai…" : "Plan banao"}
          </button>
        </div>
      </div>
    </div>
  );
}
