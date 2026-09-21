// City ka dropdown + "+ New" — Library → City ki list se.
//
// Naya project city ke bina banta hi nahi, aur ye dropdown pehle sirf wahi
// city dikhata tha jo Library me pehle se ho. Jis company ki list khaali ho
// (greenbox bhilai me thi), wahan naya project banana hi atak jaata tha —
// aur city jodne ka raasta Client BOQ Rate ke andar chhupa tha. Ab wahin
// "+ New": naam likho, Library me jud jaati hai aur turant chun li jaati hai.
//
// List parent ke paas rehti hai (`cities` / `setCities`), taaki nayi city
// usi form ke doosre hisson ko bhi turant dikhe.
import { useState } from "react";
import api from "../config/api";
import { t } from "../i18n";

export default function CityPicker({ value, onChange, cities = [], setCities, placeholder, selectStyle = {}, disabled = false }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const byId = (id) => cities.find((c) => String(c.id) === String(id)) || null;

  const save = async () => {
    const nm = name.trim();
    if (!nm || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await api.post("/library/cities", { name: nm });
      if (r.success && r.data) {
        if (setCities) setCities((prev) => [...prev, r.data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
        onChange(String(r.data.id), r.data);
        setAdding(false);
      } else {
        // Wahi naam pehle se ho to bas use chun lo (chhote-bade akshar dekhe bina).
        const hit = cities.find((c) => String(c.name).trim().toLowerCase() === nm.toLowerCase());
        if (hit) { onChange(String(hit.id), hit); setAdding(false); }
        else setErr(r.message || t("common.something_went_wrong"));
      }
    } catch (e) {
      setErr(t("common.something_went_wrong"));
    }
    setBusy(false);
  };

  const btn = (primary) => ({
    padding: "0 11px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
    whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0,
    border: primary ? "none" : "1.5px dashed #D1D5DB",
    background: primary ? "#2563EB" : "#FFFFFF", color: primary ? "#FFFFFF" : "#6B7280",
  });

  if (adding) {
    return (
      <div>
        <div style={{ display: "flex", gap: 6 }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t("master_library.e_g_raipur")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") setAdding(false); }}
            style={{ ...selectStyle, flex: 1, minWidth: 0, borderColor: "#2563EB" }} />
          <button type="button" onClick={save} disabled={busy} style={btn(true)}>{t("common.add")}</button>
          <button type="button" onClick={() => { setAdding(false); setErr(""); }} style={btn(false)}>{t("common.cancel")}</button>
        </div>
        {!!err && <div style={{ fontSize: 11.5, color: "#DC2626", marginTop: 4 }}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <select value={value || ""} disabled={disabled}
        onChange={(e) => onChange(e.target.value, byId(e.target.value))}
        style={{ ...selectStyle, flex: 1, minWidth: 0, cursor: disabled ? "not-allowed" : "pointer" }}>
        <option value="">{placeholder || t("crm.select_city")}</option>
        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {!disabled && (
        <button type="button" onClick={() => { setName(""); setErr(""); setAdding(true); }} style={btn(false)}>
          + {t("common.new")}
        </button>
      )}
    </div>
  );
}
