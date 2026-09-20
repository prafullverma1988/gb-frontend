// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — road ke kaam ↔ tender ka BOQ item (revenue ka jod).
//
// Screen sirf batati hai "kaunsa item". Rate aur unit server khud tender ke
// BOQ se uthata hai (quoted rate ho to wahi) — yahan se rate bheja hi nahi
// jaata. Sujhaav server ka hai (naam dekh kar); lagana aadmi ka kaam. Barabari
// par server koi sujhaav nahi deta — galat item lagne se accha empty.
//
// API: GET /road/designs/:id/boq-options · PUT /road/designs/:id/boq-map
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import { rget, rput, dataOf, rupee, S, btn, canRoad } from "./roadShared";

export default function RoadBoqMap({ design, onSaved }) {
  const toast = useToast();
  const mayEdit = canRoad("edit");
  const [opt, setOpt] = useState(null);
  const [map, setMap] = useState({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await rget(`/designs/${design.id}/boq-options`);
    const d = dataOf(r, null);
    setOpt(d);
    setMap((d && d.map) || {});
    setDirty(false);
  }, [design.id]);
  useEffect(() => { load(); }, [load]);

  if (!opt) return null;

  if (!opt.tender_id) {
    return (
      <div style={{ ...S.card, padding: "12px 14px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t("road.boq_title")}</div>
        <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6 }}>{t("road.boq_no_tender")}</div>
      </div>
    );
  }

  const items = opt.items || [];
  const byId = {};
  items.forEach((i) => { byId[i.id] = i; });
  const sug = opt.suggestions || {};
  const used = new Set(Object.values(map).map(Number));
  // Sujhaav sirf un kaam ke liye jo abhi empty hain, aur jiska item kahin aur na laga ho
  const pending = (opt.works || []).filter((w) => !map[w.code] && sug[w.code] && !used.has(Number(sug[w.code])));

  const set = (code, id) => { setMap((m) => { const n = { ...m }; if (id) n[code] = Number(id); else delete n[code]; return n; }); setDirty(true); };
  const applySug = () => {
    setMap((m) => {
      const n = { ...m }; const taken = new Set(Object.values(n).map(Number));
      pending.forEach((w) => { const id = Number(sug[w.code]); if (!taken.has(id)) { n[w.code] = id; taken.add(id); } });
      return n;
    });
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    const r = await rput(`/designs/${design.id}/boq-map`, { map });
    setBusy(false);
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(r.message || t("road.boq_saved"));
    setMap((r.data && r.data.map) || {});
    setDirty(false);
    onSaved && onSaved();
  };

  return (
    <div style={{ ...S.card, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.boq_title")}</div>
          <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginTop: 3 }}>{t("road.boq_hint")}</div>
        </div>
        {mayEdit && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pending.length > 0 && (
              <button onClick={applySug} style={btn("ghost", { height: 30, fontSize: 11.5, color: T.ind, borderColor: T.indL })}>
                {t("road.boq_suggest_btn", { n: pending.length })}
              </button>
            )}
            <button onClick={save} disabled={busy || !dirty} style={{ ...btn("primary", { height: 30, fontSize: 11.5 }), opacity: busy || !dirty ? .5 : 1 }}>
              {busy ? t("road.btn_wait") : t("road.boq_save_btn")}
            </button>
          </div>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
          <thead>
            <tr>{[t("road.col_work"), t("road.boq_col_item"), t("common.unit"), t("common.rate")].map((h, i) => (
              <th key={i} style={{ ...S.th, textAlign: i === 3 ? "right" : "left" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(opt.works || []).map((w) => {
              const cur = map[w.code] ? byId[map[w.code]] : null;
              return (
                <tr key={w.code}>
                  <td style={{ ...S.td, fontWeight: 600, color: T.t1, whiteSpace: "nowrap" }}>{w.name}</td>
                  <td style={S.td}>
                    <select value={map[w.code] || ""} disabled={!mayEdit} onChange={(e) => set(w.code, e.target.value)}
                      style={{ ...S.inp, maxWidth: 460 }}>
                      <option value="">{t("road.boq_none")}</option>
                      {items.map((i) => (
                        // ek BOQ item ek hi kaam par — doosre kaam par laga ho to yahan band
                        <option key={i.id} value={i.id} disabled={used.has(Number(i.id)) && Number(map[w.code]) !== Number(i.id)}>
                          {(i.item_no ? i.item_no + " · " : "") + String(i.description || "").slice(0, 90)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...S.td, color: T.t3 }}>{cur ? cur.unit || "—" : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", ...S.num }}>{cur && cur.rate != null ? rupee(cur.rate) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
