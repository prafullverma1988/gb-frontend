// ════════════════════════════════════════════════════════════════
// Estimate ki line ka unit (18 Nov 2026, Prafull)
//
// Har estimate form me qty ka unit badal sakte ho: default Sq.Ft, Library ki
// UOM list, aur Lump Sum. Lump Sum = qty 1, rate hi poori rakam. Unit badalne
// par line ki rakam wahi rehti hai (100 Sq.Ft × ₹500 → Lump Sum ₹50,000).
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import api from "../../config/api";
import PickSelect from "../../components/PickSelect";
import { t } from "../../i18n";

export const DEFAULT_UNIT = "Sq.Ft";
export const LUMP_UNIT = "Lump Sum";
export const isLumpUnit = (u) => /^(lump\s*-?\s*sum|ls|l\.s\.?)$/i.test(String(u == null ? "" : u).trim());
const isSqft = (u) => /^(sq\.?\s*f(ee|oo)?t\.?|square\s*f(ee|oo)t|sft)$/i.test(String(u == null ? "" : u).trim());
// Package ki line ka unit ("per sq.ft.") form ke unit me
export const baseUnit = (u) => {
  const s = String(u == null ? "" : u).replace(/^per\s+/i, "").trim();
  if (!s) return DEFAULT_UNIT;
  if (isSqft(s)) return DEFAULT_UNIT;
  return isLumpUnit(s) ? LUMP_UNIT : s;
};
const num = (v) => { const n = Number(String(v == null ? "" : v).replace(/[₹,\s]/g, "")); return Number.isFinite(n) ? n : 0; };

// { unit, qty, rate } par naya unit — Lump Sum me jaate waqt rakam rate me aa jaati hai
export function withUnit(row, unit) {
  const was = isLumpUnit(row.unit), lump = isLumpUnit(unit);
  if (lump && !was) {
    const amount = Math.round(num(row.qty) * num(row.rate) * 100) / 100;
    return { ...row, unit, qty: 1, rate: amount > 0 ? amount : row.rate };
  }
  if (!lump && was) return { ...row, unit, qty: "" };
  return { ...row, unit };
}

let uomCache = null;
const loadUoms = () => {
  if (!uomCache) {
    uomCache = Promise.resolve(api.get("/library/uom")).then((r) => {
      if (r && r.success) return (r.data || []).map((u) => u.name).filter(Boolean);
      uomCache = null;
      return [];
    }).catch(() => { uomCache = null; return []; });
  }
  return uomCache;
};

export default function UnitSelect({ value, onChange, style, dataKey, disabled }) {
  const [uoms, setUoms] = useState([]);
  useEffect(() => { let on = true; loadUoms().then((l) => { if (on) setUoms(l); }); return () => { on = false; }; }, []);
  const seen = new Set();
  const options = [DEFAULT_UNIT, ...uoms.filter((u) => !isSqft(u) && !isLumpUnit(u)), LUMP_UNIT, ...(value ? [value] : [])].filter((u) => {
    const k = String(u).trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return (
    <PickSelect value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} title={t("common.unit")}
      style={{ minHeight: 32, padding: "4px 6px", fontSize: 12, borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit", ...style }}
      {...(dataKey != null ? { "data-unit": dataKey } : {})}>
      {!value ? <option value="">—</option> : null}
      {options.map((u) => <option key={u} value={u}>{u === LUMP_UNIT ? t("pkg_est.unit_lump") : u}</option>)}
    </PickSelect>
  );
}
