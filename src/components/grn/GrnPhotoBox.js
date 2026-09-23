// ── GRN photos ────────────────────────────────────────────────────────
// Challan / utre hue maal ki photo. Site aur godown dono ke GRN me ek hi
// box — pehle godown GRN me photo lagane ki jagah hi nahi thi, jabki
// company ki photo policy dono par barabar lagti hai.
import React from "react";
import uploadManager from "../../utils/uploadManager";
import { fileInputProps } from "../../utils/photoPolicy";
import { T } from "../../modules/shared/tokens";
import { t } from "../../i18n";

export default function GrnPhotoBox({ photos, setPhotos, required, cameraOnly, folder = "gb_buildcon/grn" }) {
  const list = Array.isArray(photos) ? photos : [];
  return (
    <div style={{ marginTop: 18, borderTop: "1px solid " + T.b1, paddingTop: 14 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: required && list.length === 0 ? T.amb : T.t3, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        {t("material.grn_photos")}
        <span style={{ textTransform: "none", fontSize: 10, fontWeight: 500, color: T.t4 }}>{t("material.challan_material_quality")}</span>
        {required && (
          <span style={{ textTransform: "none", fontSize: 9.5, fontWeight: 700, color: list.length === 0 ? T.red : T.grn, background: list.length === 0 ? T.redL : T.grnL, padding: "2px 8px", borderRadius: 10, border: `1px solid ${list.length === 0 ? T.redM : T.grnM}` }}>
            {list.length === 0 ? t("material.required") : t("material.attached")}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {list.map((url, idx) => (
          <div key={idx} style={{ position: "relative", width: 64, height: 64, borderRadius: 7, overflow: "hidden", border: "1px solid " + T.b1, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => setPhotos(p => p.filter((_, i) => i !== idx))}
              style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "white", border: "none", fontSize: 10, cursor: "pointer", lineHeight: 1, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ))}
        <label style={{ width: 64, height: 64, borderRadius: 7, border: "1.5px dashed " + T.b2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 2, transition: "border-color .15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.blu}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.b2}>
          <span style={{ fontSize: 18 }}>📷</span>
          <span style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{t("common.add")}</span>
          <input {...fileInputProps({ source: cameraOnly ? "camera" : "both" }, { multiple: true })}
            style={{ display: "none" }}
            onChange={e => {
              const files = Array.from(e.target.files || []);
              files.forEach(file => {
                uploadManager.add({
                  file, folder,
                  label: t("grn.photo_upload_label", { name: file.name }),
                  onDone: (url) => setPhotos(p => [...p, url]),
                });
              });
              e.target.value = "";
            }} />
        </label>
      </div>
      <div style={{ marginTop: 5, fontSize: 10, color: T.t4 }}>
        {cameraOnly
          ? t("material.company_setting_sirf_live_camera_mobile")
          : t("material.camera_opens_on_mobile_multi_select_2")}
      </div>
    </div>
  );
}
