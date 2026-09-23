// ── GRN row par ⚖️ chip ──────────────────────────────────────────────
// Jis ordered material ki gadi dharam kate par tul chuki hai, GRN karte
// waqt uske saamne ye chhota nishaan: bhari wazan, gadi, aur empty gadi
// bhi tul chuki ho to net. Tap par slip ki photo. GRN save hote hi ye
// tolai us GRN item se jud jaati hai (weighment_line_id).
import React, { useState } from "react";
import { T } from "../../modules/shared/tokens";
import { t } from "../../i18n";
import { fmtKg, kgIn, kgPerUnit } from "./weigh";

export default function WeighChip({ hit, unit, onUseNet }) {
  const [open, setOpen] = useState(false);
  if (!hit) return null;
  const { line, trip } = hit;
  const closed = trip.status === "Closed" && Number(line.net_kg_share) > 0;
  const net = closed ? kgIn(line.net_kg_share, unit) : null;
  const canUseNet = closed && kgPerUnit(unit) && typeof onUseNet === "function";
  // Order gadi/Nos/cft me ho to net seedha "kitna aaya" nahi ban sakta — wahan
  // is gadi ke challan ki qty hi GRN me bharne wali ginti hai (23 Sep 2026).
  const cUnit = String(line.challan_unit || "").trim() || line.order_unit;
  const cQty = Number(line.challan_qty);
  const canUseChallan = !canUseNet && cQty > 0 && String(cUnit || "") === String(unit || "")
    && typeof onUseNet === "function";
  const photos = [
    [trip.gross_slip_url, t("weigh.loaded_slip")],
    [trip.tare_slip_url, t("weigh.empty_slip")],
    [trip.vehicle_photo_url, t("weigh.vehicle_photo")],
  ].filter(([u]) => !!u);

  return (
    <div style={{ gridColumn: "1 / -1", marginTop: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          title={t("weigh.chip_hint")}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 10.5, fontWeight: 700,
            background: closed ? T.grnL : T.ambL, color: closed ? T.grn : T.amb, border: "1px solid " + (closed ? T.grnM : T.ambM) }}>
          ⚖️ {closed
            ? t("weigh.chip_net", { qty: net.qty, unit: net.unit })
            : t("weigh.chip_loaded", { gross: fmtKg(trip.gross_kg) })}
          {trip.vehicle_no ? <span style={{ fontWeight: 500 }}>· {trip.vehicle_no}</span> : null}
        </button>
        {!closed && (
          <span style={{ fontSize: 10, color: T.t4 }}>{t("weigh.chip_tare_pending")}</span>
        )}
        {canUseNet && (
          <button type="button" onClick={() => onUseNet(net.qty)}
            style={{ padding: "2px 8px", borderRadius: 10, border: "1px solid " + T.grnM, background: T.surface, color: T.grn, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {t("weigh.use_net")}
          </button>
        )}
        {canUseChallan && (
          <button type="button" onClick={() => onUseNet(cQty)}
            style={{ padding: "2px 8px", borderRadius: 10, border: "1px solid " + T.bluM, background: T.surface, color: T.blu, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {t("weigh.use_challan", { qty: cQty, unit: cUnit })}
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 6, padding: "7px 9px", background: T.surfaceB, border: "1px solid " + T.b1, borderRadius: 7, fontSize: 10.5, color: T.t3 }}>
          <div>
            {t("weigh.gross_short")} <b style={{ color: T.t1 }}>{fmtKg(trip.gross_kg)}</b>
            {trip.tare_kg != null && <> · {t("weigh.tare_short")} <b style={{ color: T.t1 }}>{fmtKg(trip.tare_kg)}</b></>}
            {closed && <> · {t("weigh.net_short")} <b style={{ color: T.grn }}>{fmtKg(line.net_kg_share)}</b></>}
          </div>
          {cQty > 0 && (
            <div style={{ marginTop: 2 }}>{t("weigh.challan_line", { qty: cQty, unit: cUnit || "" })}</div>
          )}
          {(trip.gross_slip_no || trip.weighbridge_name) && (
            <div style={{ marginTop: 2 }}>
              {trip.weighbridge_name || ""}{trip.gross_slip_no ? ` · ${t("weigh.slip_no_short")} ${trip.gross_slip_no}` : ""}
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {photos.map(([u, lbl]) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" title={lbl}
                  style={{ display: "block", width: 46, height: 46, borderRadius: 6, overflow: "hidden", border: "1px solid " + T.b1 }}>
                  <img src={u} alt={lbl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
