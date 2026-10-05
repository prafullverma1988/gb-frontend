// ── Dual-unit billing toggle (GRN item) ────────────────────────────────
// Some materials are received by count (TMT = bundle) but billed by weight
// from the weighbridge parchi (kg). This per-item switch captures that second
// billing-basis measurement. Zero config: it learns the unit + conversion
// ratio from this material's last GRN (tenant-scoped) and prefills a *~kg*
// suggestion the site person can correct. Photo proof reuses the existing GRN
// photo attachment. Switch OFF = normal single-unit GRN, no behaviour change.
//
// Pehle TabMaterial ke andar tha; ab site aur godown dono ka GRN ek hi
// component (components/grn/GrnReceive.js) se banta hai, isliye yahan.
import React from "react";
import PickSelect from "../PickSelect";
import api from "../../config/api";
import { T } from "../../modules/shared/tokens";
import { t } from "../../i18n";

export default function DualUnitToggle({ units, primaryUnit, itemName, qty, value, onChange }) {
  const [learned, setLearned] = React.useState(null);   // {unit, alt_unit, ratio}
  const on = !!value?.altOn;
  const nameKey = (itemName || "").trim();
  const sameUnit = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  React.useEffect(() => {
    if (!nameKey) { setLearned(null); return; }
    let alive = true;
    // Aaj ki receiving unit bhi bhejo — ratio sirf usi unit ki pichhli line ka (MAT-28)
    api.get("/procurement/grns/last-alt?name=" + encodeURIComponent(nameKey) + "&unit=" + encodeURIComponent(primaryUnit || ""))
      .then(r => { if (alive && r && r.success) setLearned(r.data || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [nameKey, primaryUnit]);

  const altUnitOptions = units.filter(u => u !== primaryUnit);
  // Pichhli line alag unit ki ho (Bundle→Kg) ya billing unit hi aaj ki unit ho
  // (Kg→Kg) to ratio ka koi matlab nahi — 5 Kg par "506 Kg" bhar deta tha (MAT-28).
  const learnedOk = !!learned && sameUnit(learned.unit, primaryUnit) && !sameUnit(learned.alt_unit, primaryUnit);
  const learnedRatio = learnedOk ? learned.ratio : null;
  const ratio = value?.ratio ?? learnedRatio ?? null;
  const suggestQty = (on && ratio && Number(qty) > 0)
    ? Math.round(Number(qty) * ratio * 100) / 100 : null;

  const toggle = () => {
    if (on) { onChange({ altOn: false, alt_unit: "", alt_qty: "", ratio: null }); return; }
    // Turning ON: default the billing unit to the learned one (else kg), carry
    // the learned ratio so the qty box can prefill, but leave alt_qty editable.
    const defUnit = (learnedOk && learned.alt_unit) || (altUnitOptions.includes("Kg") ? "Kg" : altUnitOptions[0]);
    onChange({
      altOn: true,
      alt_unit: value?.alt_unit || defUnit,
      alt_qty: value?.alt_qty || (learnedRatio && Number(qty) > 0 ? String(Math.round(Number(qty) * learnedRatio * 100) / 100) : ""),
      ratio: learnedRatio || null,
    });
  };

  return (
    <div style={{ gridColumn: "1 / -1", paddingTop: on ? 6 : 2 }}>
      <button type="button" onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
        <span style={{ width: 30, height: 17, borderRadius: 9, background: on ? T.blu : T.b2, position: "relative", transition: "background .15s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: on ? 15 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: on ? T.blu : T.t3 }}>{t("finance.billing_unit_alag")}</span>
        {!on && learned?.alt_unit && (
          <span style={{ fontSize: 10, color: T.t4 }}>{t("material.pichhli_baar_alt_unit_me_bill", { alt_unit: learned.alt_unit })}</span>
        )}
      </button>
      {on && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, color: T.t3 }}>{t("material.billing_basis")}</span>
          <input type="number" value={value?.alt_qty || ""}
            onChange={e => onChange({ ...value, altOn: true, alt_qty: e.target.value })}
            placeholder={suggestQty != null ? String(suggestQty) : t("material.weighbridge_weight")}
            title={t("material.weighbridge_parchi_ka_actual_weight_editable")}
            style={{ width: 110, padding: "6px 9px", borderRadius: 6, border: "1.5px solid " + T.bluM, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: T.bluL }} />
          <PickSelect value={value?.alt_unit || ""}
            onChange={e => onChange({ ...value, altOn: true, alt_unit: e.target.value })}
            style={{ padding: "6px 9px", borderRadius: 6, border: "1.5px solid " + T.bluM, fontSize: 12.5, outline: "none", fontFamily: "inherit", cursor: "pointer", background: T.surface }}>
            {altUnitOptions.map(u => <option key={u}>{u}</option>)}
          </PickSelect>
          {suggestQty != null && !value?.alt_qty && (
            <span style={{ fontSize: 10.5, color: T.t4 }}>{t("material.suggestqty_alt_unit_suggested_ratio", { suggestQty, alt_unit: value?.alt_unit, ratio })}</span>
          )}
          <span style={{ fontSize: 10.5, color: T.t4 }}>{t("material.parchi_photo_neeche_attach_karein")}</span>
        </div>
      )}
    </div>
  );
}
