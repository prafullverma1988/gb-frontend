// ════════════════════════════════════════════════════════════════
// Estimate banate waqt naya line item (18 Nov 2026, Prafull)
//
// Package, CRM Quote, Library — kahin se bhi pick karo, usi estimate me naya
// item jod sakte ho. Sirf is estimate me judta hai: master package, quote aur
// Library waise hi rehte hain. PackageEstimateModal aur EstimateBuilderModal
// dono yahi form use karte hain.
// ════════════════════════════════════════════════════════════════
import { t } from "../../i18n";
import { T, btn, inp } from "./pkgUi";

const MAX_ITEMS = 30, MAX_QTY = 10000000, MAX_RATE = 9999999999;
const UNITS = ["Sq.Ft", "Nos", "Rft", "Cum", "Kg", "LS"];
const n = (v) => { const s = String(v == null ? "" : v).replace(/[₹,\s]/g, ""); return s === "" ? NaN : Number(s); };

export const isBlankItem = (it) => !String(it.description || "").trim() && !String(it.qty || "").trim() && !String(it.rate || "").trim();
export const itemProblem = (it) => {
  if (!String(it.description || "").trim()) return true;
  const q = n(it.qty), r = n(it.rate);
  return !(q > 0 && q <= MAX_QTY && r > 0 && r <= MAX_RATE);
};
// Khaali row chhod kar: jo bhari hai wahi estimate me jaati hai
export const filledItems = (items) => (items || []).filter((it) => !isBlankItem(it));
export const validItems = (items) => filledItems(items).filter((it) => !itemProblem(it));
export const hasBadItem = (items) => filledItems(items).some(itemProblem);
export const itemAmount = (it) => (itemProblem(it) ? 0 : Math.round(n(it.qty) * n(it.rate) * 100) / 100);
export const itemsTotal = (items) => validItems(items).reduce((a, it) => a + itemAmount(it), 0);
export const cleanItem = (it) => ({ key: it.key, description: String(it.description).trim().slice(0, 300), unit: String(it.unit || "").trim().slice(0, 40), qty: n(it.qty), rate: n(it.rate) });

// BOQ ka fold: har naya item apne naam ke fold me (server ka catOf bhi yahi karta hai)
export function newItemLine(it) {
  const c = cleanItem(it);
  let cat = c.description.split(/[(,]/)[0].replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
  if (cat.length > 40) cat = cat.slice(0, 40).replace(/\s+\S*$/, "");
  return { description: "[" + (cat || "OTHER").toUpperCase() + "] " + c.description, unit: c.unit, qty: c.qty, rate: c.rate };
}

const nextKey = (items) => "n" + (items.reduce((m, it) => Math.max(m, Number(String(it.key).slice(1)) || 0), 0) + 1);
const small = { ...inp, minHeight: 36, padding: "6px 8px", fontSize: 13 };

export default function EstimateNewItems({ items, onChange }) {
  const list = items || [];
  const set = (key, patch) => onChange(list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const add = () => onChange([...list, { key: nextKey(list), description: "", unit: "Sq.Ft", qty: "", rate: "" }]);
  const total = itemsTotal(list);
  return (
    <div data-testid="est-new-items" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, border: "1px dashed " + T.bluM, background: T.bluL }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.t1 }}>{t("pkg_est.new_title")}</div>
      <div style={{ fontSize: 11.5, color: T.t3, margin: "2px 0 8px", lineHeight: 1.45 }}>{t("pkg_est.new_hint")}</div>
      <datalist id="est-new-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      {list.map((it) => {
        const bad = !isBlankItem(it) && itemProblem(it);
        const b = bad ? { borderColor: T.redM, background: T.redL } : {};
        return (
          <div key={it.key} data-new-item={it.key} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <input value={it.description} onChange={(e) => set(it.key, { description: e.target.value })} maxLength={300} data-new-field="description"
              placeholder={t("pkg_est.new_desc")} aria-label={t("pkg_est.new_desc")} style={{ ...small, ...b, flex: "1 1 200px", width: "auto", minWidth: 0 }} />
            <input value={it.unit} onChange={(e) => set(it.key, { unit: e.target.value })} maxLength={40} list="est-new-units" data-new-field="unit"
              placeholder={t("pkg_est.new_unit")} aria-label={t("pkg_est.new_unit")} style={{ ...small, flex: "0 1 76px", width: 76 }} />
            <input value={it.qty} onChange={(e) => set(it.key, { qty: e.target.value })} inputMode="decimal" data-new-field="qty"
              placeholder={t("pkg_est.new_qty")} aria-label={t("pkg_est.new_qty")} style={{ ...small, ...b, flex: "0 1 84px", width: 84, textAlign: "right" }} />
            <input value={it.rate} onChange={(e) => set(it.key, { rate: e.target.value })} inputMode="decimal" data-new-field="rate"
              placeholder={t("pkg_est.new_rate")} aria-label={t("pkg_est.new_rate")} style={{ ...small, ...b, flex: "0 1 92px", width: 92, textAlign: "right" }} />
            <b data-new-amount={it.key} style={{ flex: "0 1 92px", textAlign: "right", fontSize: 13, color: T.t1, whiteSpace: "nowrap" }}>{itemProblem(it) ? "—" : "₹" + itemAmount(it).toLocaleString("en-IN")}</b>
            <button type="button" onClick={() => onChange(list.filter((x) => x.key !== it.key))} aria-label={t("pkg_est.new_remove")} title={t("pkg_est.new_remove")} data-new-remove={it.key}
              style={{ ...btn("danger"), minHeight: 32, padding: "2px 9px" }}>✕</button>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={add} disabled={list.length >= MAX_ITEMS} data-testid="est-new-add" style={btn("soft", list.length >= MAX_ITEMS)}>+ {t("pkg_est.new_add")}</button>
        {total > 0 ? <span data-testid="est-new-total" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: T.t1 }}>{t("pkg_est.new_total", { total: "₹" + total.toLocaleString("en-IN") })}</span> : null}
      </div>
    </div>
  );
}
