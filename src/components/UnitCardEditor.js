// ── Library → Material → "Unit card" (19 Oct 2026) ─────────────────────
// Ek material alag-alag unit me order / receive / kharch hota hai (gitti Gadi
// me order, kaante ka Ton bill, CFT me kharch; TMT Bundle me order, Nos me
// aata, Mtr me lagta). Yahan uska pul likhte hain — server (utils/unitCard.js)
// isi se badalta hai:
//   Pakka         — har jagah apne aap (1 Nos = 12 Mtr, 1 Mtr = 0.889 kg, 1 Bag = 50 kg)
//   Har lot alag  — 1 Bundle = __ Nos (brand), 1 Gadi = __ CFT (har gadi): number
//                   receive / kharch par hi likha jaata hai; yahan ka number sirf sujhaav
// value = { stock_unit, puls: [{ a, n, b, kind }] }
import { t } from "../i18n";
import PickSelect from "./PickSelect";

const box = { padding: "6px 8px", borderRadius: 6, border: "1.5px solid #E2E8F0", fontSize: 12.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

const pulText = (p) => `1 ${p.a} = ${p.n != null && p.n !== "" ? p.n : "__"} ${p.b}`;

export default function UnitCardEditor({ value, onChange, unitList, suggested, baseUnit }) {
  const v = value || { stock_unit: "", puls: [] };
  const puls = v.puls || [];
  const set = (patch) => onChange({ ...v, ...patch });
  const setPul = (i, patch) => set({ puls: puls.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const listId = "uc-units";
  return (
    <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "10px 12px", background: "#F8FAFC" }}>
      <datalist id={listId}>{(unitList || []).map((u) => <option key={u} value={u} />)}</datalist>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>{t("unitcard.title")}</div>
      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, lineHeight: 1.45 }}>{t("unitcard.hint")}</div>

      {suggested && !puls.length && (
        <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 7, background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 11.5, color: "#1D4ED8", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{t("unitcard.suggest_line", { list: (suggested.puls || []).map(pulText).join(" · ") })}</span>
          <button type="button" onClick={() => onChange({ stock_unit: suggested.stock_unit || v.stock_unit || baseUnit || "", puls: (suggested.puls || []).map((p) => ({ ...p, n: p.n == null ? "" : p.n })) })}
            style={{ padding: "3px 9px", borderRadius: 6, border: "1px solid #93C5FD", background: "#fff", color: "#1D4ED8", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {t("unitcard.use_suggestion")}
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>{t("unitcard.stock_unit_label")}</span>
        <input list={listId} value={v.stock_unit || ""} placeholder={baseUnit || ""} onChange={(e) => set({ stock_unit: e.target.value })} style={{ ...box, width: 110 }} />
        <span style={{ fontSize: 10.5, color: "#94A3B8" }}>{t("unitcard.stock_unit_hint")}</span>
      </div>

      {puls.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>1</span>
          <input list={listId} value={p.a || ""} onChange={(e) => setPul(i, { a: e.target.value })} placeholder={t("common.unit")} style={{ ...box, width: 90 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>=</span>
          <input type="number" min="0" step="any" value={p.n ?? ""} onChange={(e) => setPul(i, { n: e.target.value })}
            placeholder={p.kind === "lot" ? t("unitcard.lot_blank") : ""} style={{ ...box, width: 100 }} />
          <input list={listId} value={p.b || ""} onChange={(e) => setPul(i, { b: e.target.value })} placeholder={t("common.unit")} style={{ ...box, width: 90 }} />
          <PickSelect value={p.kind === "lot" ? "lot" : "pakka"} onChange={(e) => setPul(i, { kind: e.target.value })} style={{ ...box, width: 150 }}>
            <option value="pakka">{t("unitcard.kind_pakka")}</option>
            <option value="lot">{t("unitcard.kind_lot")}</option>
          </PickSelect>
          <button type="button" onClick={() => set({ puls: puls.filter((_, k) => k !== i) })} title={t("common.remove")}
            style={{ border: "none", background: "none", color: "#DC2626", fontSize: 15, cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => set({ puls: [...puls, { a: "", n: "", b: v.stock_unit || baseUnit || "", kind: "pakka" }] })}
        style={{ marginTop: 8, padding: "5px 11px", borderRadius: 7, border: "1.5px dashed #94A3B8", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        {t("unitcard.add_pul")}
      </button>
      <div style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 6, lineHeight: 1.45 }}>{t("unitcard.kind_help")}</div>
    </div>
  );
}

// Save se pehle jaanch: pakka pul me number zaroori, dono unit alag.
export function unitCardProblem(card) {
  for (const p of (card && card.puls) || []) {
    const a = String(p.a || "").trim(), b = String(p.b || "").trim();
    if (!a && !b && (p.n === "" || p.n == null)) continue;   // khaali row — chhod do
    if (!a || !b || a.toLowerCase() === b.toLowerCase()) return t("unitcard.err_units");
    if (p.kind !== "lot" && !(Number(p.n) > 0)) return t("unitcard.err_number", { a, b });
  }
  return null;
}
// Server ko bhejne layak (khaali row hata kar).
export const cleanCard = (card) => ({
  stock_unit: String((card && card.stock_unit) || "").trim(),
  puls: ((card && card.puls) || [])
    .filter((p) => String(p.a || "").trim() && String(p.b || "").trim())
    .map((p) => ({ a: String(p.a).trim(), b: String(p.b).trim(), n: p.n === "" || p.n == null ? null : Number(p.n), kind: p.kind === "lot" ? "lot" : "pakka" })),
});
