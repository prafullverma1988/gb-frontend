// Library → Subcon Rate Card → "Category rate" / "Installation rate" (23 Nov 2026, Prafull).
// City-wise: "Default" column sab city ke liye; kisi city ka alag rate ho to us
// city ke column me. Project ki city ka rate WO me pehle aata hai, warna Default.
//   kind 'category' — Work Category ka basic rate (WO: "Rate card se")
//   kind 'material' — material ka installation rate (WO: "Item-wise"); unit khaali
//                     = material ka unit
// Ek khaana badlo → blur par save (PUT /subcon/rate-card). Khaali / 0 = rate hatao.
// WO me rate card se ZYADA rate approval maangta hai (gb-backend utils/subconRates).

import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { t } from "../../i18n";

const C = {
  text: "#111827", mid: "#4B5563", light: "#9CA3AF", border: "#E5E7EB", soft: "#F8F9FB",
  acc: "#4B45C4", accSoft: "#EEF0FB", red: "#DC2626", green: "#059669",
};
const cellInp = { width: "100%", boxSizing: "border-box", padding: "5px 7px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 12.5, textAlign: "right", fontFamily: "inherit" };
const th = { fontSize: 10.5, color: C.light, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, padding: "7px 8px", textAlign: "left", background: C.soft, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" };
const td = { padding: "5px 8px", fontSize: 12.5, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" };

export default function SubconStdRates({ kind, canEdit }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [onlySet, setOnlySet] = useState(kind === "material");
  const [edits, setEdits] = useState({});       // `${id}:${city}` → string
  const [units, setUnits] = useState({});       // id → string
  const [state, setState] = useState({});       // key → "saving" | "ok" | "err"

  const load = useCallback(() => {
    const qs = `kind=${kind}&q=${encodeURIComponent(q)}&only_set=${onlySet ? 1 : 0}&limit=200`;
    api.get(`/subcon/rate-card?${qs}`)
      .then((r) => { if (r.success) { setData(r.data); setErr(""); } else setErr(r.message || t("master_library.rc_load_fail")); })
      .catch(() => setErr(t("master_library.rc_load_fail")));
  }, [kind, q, onlySet]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setEdits({}); setUnits({}); setState({}); }, [kind]);

  const unitOf = (row) => (units[row.id] !== undefined ? units[row.id]
    : (Object.values(row.rates).find((x) => x.unit) || {}).unit || "");
  const save = async (row, cityId, value, unitOverride) => {
    const key = `${row.id}:${cityId}`;
    setState((s) => ({ ...s, [key]: "saving" }));
    const unit = unitOverride !== undefined ? unitOverride : unitOf(row);
    const r = await api.put("/subcon/rate-card", { kind, ref_id: row.id, city_id: cityId, unit: unit || null, rate: value === "" ? null : value })
      .catch((e) => ({ success: false, message: e && e.message }));
    setState((s) => ({ ...s, [key]: r.success ? "ok" : "err" }));
    if (r.success) {
      setData((d) => d && ({ ...d, rows: d.rows.map((x) => {
        if (x.id !== row.id) return x;
        const rates = { ...x.rates };
        if (r.data.removed) delete rates[cityId]; else rates[cityId] = { unit: r.data.unit, rate: r.data.rate };
        return { ...x, rates };
      }) }));
      setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
    } else if (r.message) alert(r.message);
  };
  // Unit badla → is row ke har bhare rate par wahi unit.
  const saveUnit = async (row, unit) => {
    for (const [cityId, x] of Object.entries(row.rates)) {
      if ((x.unit || "") !== unit) await save(row, Number(cityId), String(x.rate), unit);
    }
  };

  if (err) return <div style={{ color: C.red, fontSize: 13, padding: 14 }}>{err}</div>;
  if (!data) return <div style={{ color: C.light, fontSize: 13, padding: 14 }}>{t("common.loading")}</div>;
  const cols = [{ id: 0, name: t("master_library.rc_default") }, ...data.cities];

  return (
    <div style={{ background: "white", borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
      <div style={{ fontSize: 12.5, color: C.mid, marginBottom: 10, lineHeight: 1.5 }}>
        {kind === "category" ? t("master_library.rc_cat_help") : t("master_library.rc_mat_help")}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === "category" ? t("master_library.rc_search_cat") : t("master_library.rc_search_mat")}
          style={{ ...cellInp, textAlign: "left", width: 260, padding: "7px 10px" }} />
        {kind === "material" && (
          <label style={{ fontSize: 12.5, color: C.mid, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={onlySet} onChange={(e) => setOnlySet(e.target.checked)} /> {t("master_library.rc_only_set")}
          </label>
        )}
        {!data.cities.length && <span style={{ fontSize: 12, color: C.light }}>{t("master_library.rc_no_city")}</span>}
      </div>
      {!data.rows.length ? (
        <div style={{ color: C.light, fontSize: 13, padding: 14 }}>
          {kind === "category" ? t("master_library.rc_cat_empty") : onlySet ? t("master_library.rc_mat_empty_set") : t("master_library.rc_mat_empty")}
        </div>
      ) : (
        <div style={{ overflow: "auto", maxHeight: "60vh", border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...th, minWidth: 200 }}>{kind === "category" ? t("master_library.rc_col_cat") : t("master_library.rc_col_mat")}</th>
              <th style={{ ...th, width: 110 }}>{t("master_library.rc_col_unit")}</th>
              {cols.map((c) => <th key={c.id} style={{ ...th, textAlign: "right", width: 110 }}>{c.name}</th>)}
            </tr></thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td style={td}>{row.name}</td>
                  <td style={td}>
                    <input value={unitOf(row)} disabled={!canEdit} placeholder={row.unit || "—"} aria-label={t("master_library.rc_col_unit")}
                      onChange={(e) => setUnits((u) => ({ ...u, [row.id]: e.target.value }))}
                      onBlur={(e) => { if (units[row.id] !== undefined) saveUnit(row, e.target.value.trim()); }}
                      style={{ ...cellInp, textAlign: "left" }} />
                  </td>
                  {cols.map((c) => {
                    const key = `${row.id}:${c.id}`;
                    const cur = row.rates[c.id];
                    const val = edits[key] !== undefined ? edits[key] : cur ? String(cur.rate) : "";
                    const st = state[key];
                    return (
                      <td key={c.id} style={td}>
                        <input type="number" min="0" value={val} disabled={!canEdit} aria-label={`${row.name} · ${c.name}`}
                          placeholder={c.id !== 0 && row.rates[0] ? String(row.rates[0].rate) : ""}
                          onChange={(e) => setEdits((x) => ({ ...x, [key]: e.target.value }))}
                          onBlur={() => { if (edits[key] !== undefined && edits[key] !== (cur ? String(cur.rate) : "")) save(row, c.id, edits[key].trim()); }}
                          style={{ ...cellInp, borderColor: st === "err" ? C.red : st === "ok" ? C.green : C.border, background: c.id === 0 ? "white" : cur ? C.accSoft : "white" }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: C.light, marginTop: 8 }}>{t("master_library.rc_foot")}</div>
    </div>
  );
}
