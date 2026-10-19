// ── Unit card (19 Oct 2026) — kharch / issue / GRN me doosri unit + pul ──
// Server: gb-backend utils/unitCard.js. Card ke PAKKA pul (Nos = 12 Mtr,
// Mtr = 0.889 kg) se line apne aap stock ki unit me badalti hai; LOT wala
// (1 Bundle = __ Nos, 1 Gadi = __ CFT) har lot alag — number user deta hai,
// card / aakhri lot ka number sirf "lagao" button par.
//
// st = stock-units ki entry: { unit, units, card?, lots? }
import { useState, useEffect } from "react";
import PickSelect from "./PickSelect";
import { t } from "../i18n";
import { stockConv, cardUnits, pathFactor, sameStockUnit, loadUnitCards, convList } from "./grn/weigh";

const fmt = (n) => (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 });

// Card ho to uski saari unit (stock wali pehle), warna [].
export const cardUnitOptions = (st) => (st && st.card ? cardUnits(st.card, st.unit) : []);

// Card me ek se zyada unit → dropdown; warna purana 🔒 stock unit chip.
export function UnitPickOrLock({ st, unit, onChange, style, lockStyle, title }) {
  const opts = cardUnitOptions(st);
  if (opts.length > 1) {
    const cur = opts.includes(unit) ? unit : opts[0];
    return (
      <PickSelect value={cur} onChange={(e) => onChange(e.target.value)} style={style} title={t("unitcard.pick_unit")}>
        {opts.map((u) => <option key={u} value={u}>{u}</option>)}
      </PickSelect>
    );
  }
  return (
    <div title={title || t("unit.stock_unit")} style={lockStyle}>
      <span>🔒</span>{unit || (st && st.unit) || "—"}
    </div>
  );
}

// Unit stock wali na ho to: "= 3.75 Nos" (pakka / wazan), ya
// "1 Bundle = [ 5 ] Nos  = 10 Nos" (lot — number zaroori).
export function StockConvLine({ st, unit, qty, factor, onFactor, compact }) {
  const cv = stockConv(st, unit, qty, factor);
  if (!cv) return null;
  const fs = compact ? 10.5 : 11.5;
  if (cv.weight || cv.card) {
    return <div style={{ fontSize: fs, color: "#64748B", marginTop: 4, fontWeight: 600 }}>{t("unitcard.preview", { qty: fmt(cv.qty), stock: cv.stock })}</div>;
  }
  const hasF = parseFloat(factor) > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 5, fontSize: fs, color: hasF ? "#475569" : "#B45309" }}>
      <span style={{ fontWeight: 600 }}>{t("unitcard.one_unit_eq", { unit })}</span>
      <input type="number" min="0" step="any" value={factor ?? ""} onChange={(e) => onFactor(e.target.value)}
        title={cv.lot ? t("unitcard.lot_hint") : t("unit.need_factor", { unit, stock: cv.stock })}
        style={{ width: 72, padding: "4px 7px", borderRadius: 6, border: `1.5px solid ${hasF ? "#CBD5E1" : "#F59E0B"}`, fontSize: fs + 0.5, outline: "none", fontFamily: "inherit" }} />
      <span style={{ fontWeight: 600 }}>{cv.stock}</span>
      {!hasF && cv.suggest > 0 && (
        <button type="button" onClick={() => onFactor(String(cv.suggest))}
          style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#2563EB", fontSize: fs, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {t("unitcard.use_suggest", { n: fmt(cv.suggest) })}
        </button>
      )}
      {hasF && <span style={{ color: "#64748B", fontWeight: 600 }}>{t("unitcard.preview", { qty: fmt(cv.qty), stock: cv.stock })}</span>}
    </div>
  );
}

// ── Stock doosri unit me dekhna (Hissa D, 19 Oct 2026) ──
// Qty ke paas chhota "⇄" — dabao to "≈ 5.01 Ton · 5,013 kg · ≈ 47 Bundle".
// Sirf dekhne ke liye, kuch save nahi hota. open = bahar se sab khol do.
const fmtView = (n) => { const v = Number(n) || 0; const a = Math.abs(v);
  return v.toLocaleString("en-IN", { maximumFractionDigits: a >= 100 ? 0 : a >= 1 ? 2 : 3 }); };
export const viewText = (list) => list.map((x) => (x.approx ? "≈ " : "") + fmtView(x.qty) + " " + x.unit).join(" · ");
export function UnitViewChip({ card, lots, qty, unit, open: forceOpen, dark, align = "right" }) {
  const [own, setOwn] = useState(false);
  const list = convList(card, lots, qty, unit);
  if (!list.length) return null;
  const open = own || !!forceOpen;
  return (
    <div style={{ marginTop: 3, textAlign: align }} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOwn((o) => !o); }} title={t("unitcard.view_other")}
        style={{ padding: "0 6px", height: 17, borderRadius: 9, border: "1px solid " + (dark ? "rgba(255,255,255,0.35)" : "#CBD5E1"),
          background: open ? (dark ? "rgba(255,255,255,0.15)" : "#EFF6FF") : "transparent", color: dark ? "#E2E8F0" : "#2563EB",
          fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", lineHeight: "15px" }}>⇄</button>
      {open && <div style={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.75)" : "#475569", fontWeight: 600, marginTop: 2, whiteSpace: "normal" }}>{viewText(list)}</div>}
    </div>
  );
}

// Save se pehle: is line ko number chahiye par diya nahi → true.
export const needsFactor = (st, unit, qty, factor) => { const cv = stockConv(st, unit, qty, factor); return !!(cv && cv.need); };
// Payload me jaane wala stock_factor (sirf jab user ne diya).
export const factorOf = (st, unit, qty, factor) => { const cv = stockConv(st, unit, qty, factor); return cv && cv.factor ? cv.factor : undefined; };

// Stock ki unit me qty (balance jaanch ke liye) — badal na sake to null.
export const stockQtyOf = (st, unit, qty, factor) => {
  const cv = stockConv(st, unit, qty, factor);
  if (!cv) return parseFloat(qty) || 0;
  return cv.need ? null : cv.qty;
};

// Chhote Mark used form (ledger / inventory / drawer) ke liye: card ho tabhi
// "Unit [Nos ▾]" + pul ki line; bina card ke kuch nahi (pehle jaisa).
export function UsedUnitRow({ st, unit, qty, factor, onUnit, onFactor, selectStyle }) {
  const opts = cardUnitOptions(st);
  if (opts.length < 2) return null;
  const cur = opts.includes(unit) ? unit : opts[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{t("common.unit")}</span>
      <PickSelect value={cur} onChange={(e) => onUnit(e.target.value)}
        style={selectStyle || { padding: "4px 8px", borderRadius: 5, border: "1.5px solid #CBD5E1", fontSize: 12, outline: "none", fontFamily: "inherit" }}>
        {opts.map((u) => <option key={u} value={u}>{u}</option>)}
      </PickSelect>
      <StockConvLine st={st} unit={cur} qty={qty} factor={factor} onFactor={onFactor} compact />
    </div>
  );
}

// ── GRN ki order wali line (MR / PO) — order ki unit stock se alag ho ──
// "Is site par stock CFT me" / pehli receipt par "Stock kis unit me [CFT ▾]",
// aur pakka pul na ho to "Stock me [ 830 ] CFT" — kaante ke wazan (net ÷ card
// ka kg) ya pichhle lot se andaza button. value = { stock_unit, stock_qty }.
const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
function grnStockInfo(st, card, orderUnit, qty, value) {
  const v = value || {};
  const c = (st && st.card) || card || null;
  const hasStock = !!(st && st.unit);
  let choices = [];
  if (!hasStock) {
    choices = cardUnits(c, (c && c.stock_unit) || orderUnit);
    if (orderUnit && !choices.some((u) => sameStockUnit(u, orderUnit))) choices.push(orderUnit);
  }
  const stockUnit = hasStock ? st.unit : (v.stock_unit || (c && c.stock_unit) || orderUnit);
  const same = !stockUnit || !orderUnit || sameStockUnit(stockUnit, orderUnit);
  const cv = same ? null : stockConv({ unit: stockUnit, card: c, lots: st && st.lots }, orderUnit, qty, null);
  return { c, hasStock, choices, stockUnit, same, cv, v };
}
export function grnStockPayload(st, card, orderUnit, qty, value) {
  const g = grnStockInfo(st, card, orderUnit, qty, value);
  if (g.same) return {};
  const out = {};
  if (!g.hasStock) out.stock_unit = g.stockUnit;
  if (g.cv && g.cv.need && parseFloat(g.v.stock_qty) > 0) out.stock_qty = parseFloat(g.v.stock_qty);
  return out;
}
export const grnStockMissing = (st, card, orderUnit, qty, value) => {
  const g = grnStockInfo(st, card, orderUnit, qty, value);
  return !!(g.cv && g.cv.need && !(parseFloat(g.v.stock_qty) > 0) && Number(qty) > 0);
};
export function GrnStockRow({ st, card, orderUnit, qty, value, onChange, netKg }) {
  const g = grnStockInfo(st, card, orderUnit, qty, value);
  if (!g.hasStock && g.choices.length < 2) return null;            // card nahi — pehle jaisa
  if (g.hasStock && g.same) return null;
  const set = (p) => onChange({ ...g.v, ...p });
  let fromNet = null;
  if (!g.same && Number(netKg) > 0 && g.c) { const pk = pathFactor(g.c, g.stockUnit, "kg"); if (pk && pk.mult > 0) fromNet = r3(Number(netKg) / pk.mult); }
  const fromLot = g.cv && g.cv.need && g.cv.suggest > 0 && Number(qty) > 0 ? r3(Number(qty) * g.cv.suggest) : null;
  const btn = { padding: "3px 8px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const missing = g.cv && g.cv.need && !(parseFloat(g.v.stock_qty) > 0);
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", padding: "6px 8px", marginTop: 4, borderRadius: 6,
      background: missing ? "#FFFBEB" : "#F8FAFC", border: "1px solid " + (missing ? "#FCD34D" : "#E2E8F0"), fontSize: 11.5, color: "#334155" }}>
      {!g.hasStock ? (
        <>
          <span style={{ fontWeight: 700 }}>{t("unitcard.stock_in_unit")}</span>
          <PickSelect value={g.stockUnit} onChange={(e) => set({ stock_unit: e.target.value, stock_qty: "" })}
            style={{ padding: "3px 8px", borderRadius: 5, border: "1.5px solid #CBD5E1", fontSize: 11.5, outline: "none", fontFamily: "inherit" }}>
            {g.choices.map((u) => <option key={u} value={u}>{u}</option>)}
          </PickSelect>
        </>
      ) : <span style={{ fontWeight: 700 }}>{t("unitcard.site_stock_in", { stock: g.stockUnit })}</span>}
      {g.cv && (g.cv.weight || g.cv.card) && <span style={{ fontWeight: 600, color: "#64748B" }}>{t("unitcard.preview", { qty: fmt(g.cv.qty), stock: g.stockUnit })}</span>}
      {g.cv && g.cv.need && (
        <>
          <span style={{ fontWeight: 700 }}>{t("unitcard.stock_qty_label")}</span>
          <input type="number" min="0" step="any" value={g.v.stock_qty ?? ""} onChange={(e) => set({ stock_qty: e.target.value })}
            style={{ width: 86, padding: "4px 7px", borderRadius: 6, border: "1.5px solid " + (missing ? "#F59E0B" : "#CBD5E1"), fontSize: 12, outline: "none", fontFamily: "inherit" }} />
          <span style={{ fontWeight: 700 }}>{g.stockUnit}</span>
          {fromNet != null && <button type="button" style={btn} onClick={() => set({ stock_qty: String(fromNet) })}>{t("unitcard.from_kaanta", { n: fmt(fromNet) })}</button>}
          {fromLot != null && <button type="button" style={btn} onClick={() => set({ stock_qty: String(fromLot) })}>{t("unitcard.from_lot", { n: fmt(fromLot) })}</button>}
        </>
      )}
    </div>
  );
}

// ── Naam → card (godown ke Issue / Transfer / Return form) ──
// Ek baar laaya card poore page me yaad (Library me save par dropUnitCardCache).
const cardCache = new Map();
export const dropUnitCardCache = () => cardCache.clear();
export function useUnitCards(names) {
  const key = [...new Set((names || []).map((n) => String(n || "").trim().toLowerCase()).filter(Boolean))].sort().join("|");
  const [, bump] = useState(0);
  useEffect(() => {
    const miss = key ? key.split("|").filter((k) => !cardCache.has(k)) : [];
    if (!miss.length) return undefined;
    let alive = true;
    loadUnitCards(miss).then((r) => {
      for (const k of miss) cardCache.set(k, ((r || {})[k] || {}).card || null);
      if (alive) bump((x) => x + 1);
    });
    return () => { alive = false; };
  }, [key]);
  const out = {};
  for (const k of key ? key.split("|") : []) out[k] = cardCache.get(k) || null;
  return out;
}
