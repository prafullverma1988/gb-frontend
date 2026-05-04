// ── LIBRARY SELECT — system-wide library picker with inline Add-New ──
// Anywhere in the app where a value comes from a library (party,
// supplier, vendor, subcon, material, labour), use this component
// instead of a free-text input. It enforces "library-only" picking
// AND provides an inline "+ Add New" form so the user can add a
// missing entry without leaving the current screen.
//
// Props:
//   type      — one of:
//                 "supplier"   — Material Supplier (parties)
//                 "subcon"     — Sub-Con / contractor (parties)
//                 "client"     — Client (parties)
//                 "labour"     — Labour Contractor (parties)
//                 "any-party"  — any party type (parties)
//                 "material"   — material master (library/materials)
//   value     — current selected name (string)
//   onChange  — (name) => void
//   onAdded   — optional: (newItem) => void  (caller can refresh its own cache)
//   placeholder
//   compact
//   accent    — override accent color
//   inputRef  — caller can attach a ref
//   disabled
//   filter    — optional fn(items) => items  (extra client-side filter)

import { useState, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "./SearchSelect";

// Module-level cache so multiple instances on the same page reuse the result
const _cache = {
  supplier: { items: null, loading: false, listeners: new Set() },
  subcon:   { items: null, loading: false, listeners: new Set() },
  client:   { items: null, loading: false, listeners: new Set() },
  labour:   { items: null, loading: false, listeners: new Set() },
  "any-party": { items: null, loading: false, listeners: new Set() },
  material: { items: null, loading: false, listeners: new Set() },
};

const TYPE_CONFIG = {
  supplier: {
    label: "vendor",
    addTitle: "Add new vendor (saved to Party Master)",
    fields: [
      { key: "name",  label: "Vendor name *", flex: 2, autoFocus: true, required: true },
      { key: "phone", label: "Phone",         flex: 1 },
      { key: "city",  label: "City",          flex: 1 },
    ],
    fetch: async () => {
      const r = await api.get("/finance/parties");
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data
        .filter(p => p.type === "Material Supplier" || p.type === "material_supplier" || p.type === "Other Vendor")
        .map(p => ({ id: p.id, name: p.name, city: p.city, phone: p.phone }));
    },
    save: async (form) => {
      const r = await api.post("/finance/parties", {
        name: form.name, type: "Material Supplier",
        phone: form.phone || null, city: form.city || null,
        credit_days: 7,
      });
      // Best-effort: also push to procurement vendor list
      api.post("/procurement/vendors", {
        name: form.name, phone: form.phone || null, city: form.city || null,
        category: "Material",
      }).catch(() => {});
      return r;
    },
  },
  subcon: {
    label: "subcontractor",
    addTitle: "Add new subcontractor (saved to Party Master)",
    fields: [
      { key: "name",  label: "Subcon name *",  flex: 2, autoFocus: true, required: true },
      { key: "phone", label: "Phone",          flex: 1 },
      { key: "city",  label: "City",           flex: 1 },
    ],
    fetch: async () => {
      const r = await api.get("/finance/parties");
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data
        .filter(p => p.type === "Sub-Con" || p.type === "contractor" || p.type === "subcontractor")
        .map(p => ({ id: p.id, name: p.name, city: p.city, phone: p.phone }));
    },
    save: async (form) => {
      return await api.post("/finance/parties", {
        name: form.name, type: "Sub-Con",
        phone: form.phone || null, city: form.city || null,
        credit_days: 7,
      });
    },
  },
  client: {
    label: "client",
    addTitle: "Add new client (saved to Party Master)",
    fields: [
      { key: "name",  label: "Client name *", flex: 2, autoFocus: true, required: true },
      { key: "phone", label: "Phone",         flex: 1 },
      { key: "city",  label: "City",          flex: 1 },
    ],
    fetch: async () => {
      const r = await api.get("/finance/parties");
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data
        .filter(p => p.type === "Client")
        .map(p => ({ id: p.id, name: p.name, city: p.city, phone: p.phone }));
    },
    save: async (form) => {
      return await api.post("/finance/parties", {
        name: form.name, type: "Client",
        phone: form.phone || null, city: form.city || null,
        credit_days: 30,
      });
    },
  },
  labour: {
    label: "labour contractor",
    addTitle: "Add new labour contractor (saved to Party Master)",
    fields: [
      { key: "name",  label: "Contractor name *", flex: 2, autoFocus: true, required: true },
      { key: "phone", label: "Phone",             flex: 1 },
      { key: "city",  label: "City",              flex: 1 },
    ],
    fetch: async () => {
      const r = await api.get("/finance/parties");
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data
        .filter(p => p.type === "Labour" || p.type === "Labour Contractor" || p.type === "Labour Vendor")
        .map(p => ({ id: p.id, name: p.name, city: p.city, phone: p.phone }));
    },
    save: async (form) => {
      return await api.post("/finance/parties", {
        name: form.name, type: "Labour Contractor",
        phone: form.phone || null, city: form.city || null,
      });
    },
  },
  "any-party": {
    label: "party",
    addTitle: "Add new party (saved to Party Master)",
    fields: [
      { key: "name",  label: "Party name *", flex: 2, autoFocus: true, required: true },
      { key: "type",  label: "Type",         flex: 1, type: "select",
        options: ["Client", "Material Supplier", "Sub-Con", "Labour Contractor", "Other Vendor"] },
      { key: "phone", label: "Phone",        flex: 1 },
    ],
    fetch: async () => {
      const r = await api.get("/finance/parties");
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data.map(p => ({ id: p.id, name: p.name, city: p.city, type: p.type }));
    },
    save: async (form) => {
      return await api.post("/finance/parties", {
        name: form.name, type: form.type || "Other Vendor",
        phone: form.phone || null,
      });
    },
  },
  material: {
    label: "material",
    addTitle: "Add new material (saved to Library)",
    fields: [
      { key: "name", label: "Material name *", flex: 2, autoFocus: true, required: true },
      { key: "unit", label: "Unit",            flex: 1, type: "select",
        options: ["Bags", "MT", "Nos", "Sqft", "Mtrs", "Kg", "Sheets", "Ltrs", "Cu.m", "Ton", "RFT", "Brass", "CFT"] },
    ],
    fetch: async () => {
      const r = await api.get("/library/materials");
      if (!r.success || !Array.isArray(r.data)) return [];
      return r.data.map(m => ({ id: m.id, name: m.name, unit: m.unit }));
    },
    save: async (form) => {
      return await api.post("/library/materials", {
        name: form.name, unit: form.unit || "Nos",
      });
    },
  },
};

export default function LibrarySelect({
  type = "supplier",
  value,
  onChange,
  onAdded,
  placeholder,
  compact = false,
  accent,
  inputRef,
  disabled = false,
  filter,
  style = {},
}) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.supplier;
  const cacheEntry = _cache[type] || (_cache[type] = { items: null, loading: false, listeners: new Set() });
  const [items, setItems] = useState(cacheEntry.items || []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Subscribe to cache updates so all instances refresh together
  useEffect(() => {
    const refresh = () => setItems(cacheEntry.items || []);
    cacheEntry.listeners.add(refresh);
    if (cacheEntry.items == null && !cacheEntry.loading) {
      cacheEntry.loading = true;
      cfg.fetch().then((data) => {
        cacheEntry.items = data;
        cacheEntry.loading = false;
        cacheEntry.listeners.forEach((fn) => fn());
      }).catch(() => {
        cacheEntry.items = [];
        cacheEntry.loading = false;
        cacheEntry.listeners.forEach((fn) => fn());
      });
    } else {
      refresh();
    }
    return () => cacheEntry.listeners.delete(refresh);
    // eslint-disable-next-line
  }, [type]);

  const visibleItems = filter ? filter(items) : items;
  const options = visibleItems.map((it) => ({
    key: it.name,
    label: it.city ? `${it.name} — ${it.city}` : (it.unit ? `${it.name} (${it.unit})` : it.name),
    _raw: it,
  }));
  // If the current value isn't represented in the library yet (legacy data
  // entered before this component existed, or library still loading), surface
  // it as a synthetic option so the field shows the saved value instead of
  // looking blank. The user can re-pick or just keep it.
  if (value && !options.some((o) => (o.key || "").toLowerCase() === String(value).toLowerCase())) {
    options.unshift({ key: value, label: value, _raw: { name: value, _ghost: true } });
  }

  const handleAdd = async () => {
    const name = (form.name || "").trim();
    if (!name) return;
    if (items.some((it) => (it.name || "").toLowerCase() === name.toLowerCase())) {
      alert(`This ${cfg.label} already exists in library`);
      return;
    }
    setSaving(true);
    try {
      const res = await cfg.save({ ...form, name });
      if (res?.success === false) {
        alert(res.message || "Save failed");
        setSaving(false);
        return;
      }
      const newItem = res?.data || { name, ...form };
      // Update cache + notify all subscribers
      cacheEntry.items = [...(cacheEntry.items || []), newItem]
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      cacheEntry.listeners.forEach((fn) => fn());
      // Auto-select the new item
      onChange && onChange(name);
      onAdded && onAdded(newItem);
      // Reset form
      setShowAdd(false);
      setForm({});
    } catch (e) {
      alert("Network error: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div style={style}>
      <SearchSelect
        value={value}
        options={options}
        onChange={(v) => onChange && onChange(v || "")}
        placeholder={placeholder || `Search ${cfg.label}...`}
        compact={compact}
        accent={accent}
        inputRef={inputRef}
        disabled={disabled}
      />
      {!showAdd ? (
        <button
          type="button"
          onClick={() => { setShowAdd(true); setForm({}); }}
          disabled={disabled}
          style={{
            marginTop: 5,
            padding: "3px 10px",
            borderRadius: 5,
            background: "transparent",
            border: "1px dashed #D1D5DB",
            color: "#6B7280",
            fontSize: 10.5,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          + Add New {cfg.label.replace(/^\w/, (c) => c.toUpperCase())} to Library
        </button>
      ) : (
        <div
          style={{
            marginTop: 6,
            padding: "10px 11px",
            borderRadius: 7,
            border: "1px solid #BFDBFE",
            background: "#EFF6FF",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#2563EB", marginBottom: 7 }}>
            🆕 {cfg.addTitle}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cfg.fields.map((f) => `${f.flex || 1}fr`).join(" "),
              gap: 6,
              marginBottom: 7,
            }}
          >
            {cfg.fields.map((f) => (
              <div key={f.key}>
                {f.type === "select" ? (
                  <select
                    value={form[f.key] || ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    style={fldStyle}
                  >
                    <option value="">{f.label}</option>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    autoFocus={f.autoFocus}
                    value={form[f.key] || ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.label}
                    style={fldStyle}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setForm({}); }}
              style={btnCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !(form.name || "").trim()}
              onClick={handleAdd}
              style={{
                ...btnPrimary,
                background: saving || !(form.name || "").trim() ? "#94A3B8" : "#2563EB",
                cursor: saving || !(form.name || "").trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save & use"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const fldStyle = {
  width: "100%",
  padding: "5px 8px",
  borderRadius: 5,
  border: "1.5px solid #E5E7EB",
  fontSize: 11.5,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  background: "#FFFFFF",
};
const btnCancel = {
  padding: "5px 10px",
  borderRadius: 5,
  border: "1px solid #E5E7EB",
  background: "white",
  color: "#6B7280",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
};
const btnPrimary = {
  flex: 1,
  padding: "5px 10px",
  borderRadius: 5,
  border: "none",
  color: "white",
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "inherit",
};

// Helper: imperatively invalidate / refetch a cache entry (e.g. after external add)
LibrarySelect.refresh = async (type) => {
  const e = _cache[type];
  if (!e) return;
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return;
  e.loading = true;
  try {
    e.items = await cfg.fetch();
  } catch { e.items = e.items || []; }
  e.loading = false;
  e.listeners.forEach((fn) => fn());
};
