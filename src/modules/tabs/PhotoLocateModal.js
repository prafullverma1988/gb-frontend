import React, { useState } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t, Rich } from "../../i18n";

/* ────────────────────────────────────────────────────────────────────
   PHOTO SE JAGAH — "ye photo kaunsi line ki hai?"

   Prafull (2026-08-19): "ye photo ratna ki existing pipe line ka hai
   jise map me mark kar liya hai. Isme geo location already hai — isko
   seedha pipe line ka location dhoondh ke usame clip kardo."

   Site ki purani photos apni jagah khud bataati hain:
     • EXIF me (camera ne likha), ya
     • "GPS Map Camera" ki chhapi hui patti me (WhatsApp se guzar kar
       bhi ye bachi rehti hai — isliye site par wahi app chalti hai).

   Yahan aadmi se "kaunsi line?" poochha hi nahi jaata. Photo daalo →
   system jagah nikalta hai → paas ki lines dikhata hai → aap chunte ho.
   Chunna aadmi ka hi kaam rehta hai, kyunki GPS 50 m tak jhooth bolta
   hai aur do line paas-paas ho sakti hain.

   Backend: POST /tenders/:id/photo-locate  (kuch likhta nahi)
            POST /tenders/:id/photo-attach  (chuni hui line par lagata hai)
   ──────────────────────────────────────────────────────────────────── */

const CLOUD = "https://api.cloudinary.com/v1_1/dd632nqfm/image/upload";
const PRESET = "gb_buildcon_drawings";

const SRC_LABEL = { exif: "photo ke EXIF se", stamp: "photo par chhapi patti se", "diya hua": "aapke diye hue ankde se" };
const fmtD = (m) => (m >= 1000 ? (m / 1000).toFixed(2) + " km" : m + " m");

export default function PhotoLocateModal({ tenderId, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);      // {lat,lng,source,place,matches[]}
  const [pick, setPick] = useState(null);    // chuna hua match

  const run = async () => {
    setErr(""); setRes(null); setPick(null);
    let photoUrl = url.trim();
    try {
      if (file) {
        setBusy("Photo upload ho rahi hai…");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", PRESET);
        const cr = await (await fetch(CLOUD, { method: "POST", body: fd })).json();
        if (!cr.secure_url) throw new Error("Upload nahi hui");
        photoUrl = cr.secure_url;
        setUrl(photoUrl);
      }
      if (!photoUrl) { setErr(t("photo_locate.photo_chuno_ya_uska_link_daalo")); setBusy(""); return; }
      setBusy("Jagah dhoondi ja rahi hai…");
      const r = await api.post(`/tenders/${tenderId}/photo-locate`, { photo_url: photoUrl }, { timeoutMs: 90000 });
      setBusy("");
      if (!r?.success) { setErr(r?.message || "Jagah nahi mili"); return; }
      if (!r.data.found) { setErr(r.data.reason || "Is photo me location nahi mili"); return; }
      setRes(r.data);
      // Pehle se SIRF tab chunte hain jab sabse paas wali line par HI task ho.
      // Pehle "jis par bhi task ho" wali chun leti thi — 19 Aug ko isi wajah se
      // 6 m wali line chhod kar photo 201 m door wali line par chipak gayi thi.
      const nearest = (r.data.matches || [])[0];
      if (nearest && nearest.task) setPick(nearest);
    } catch (e) { setBusy(""); setErr(e.message || "Kuch galat hua"); }
  };

  const attach = async () => {
    if (!pick?.task) return;
    setBusy("Photo lagayi ja rahi hai…"); setErr("");
    const r = await api.post(`/tenders/${tenderId}/photo-attach`, {
      photo_url: url, task_id: pick.task.id, lat: res.lat, lng: res.lng,
      caption: res.place || "",
    });
    setBusy("");
    if (!r?.success) { setErr(r?.message || "Photo nahi lagi"); return; }
    onDone?.(r.message);
    onClose?.();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ background: T.surface, borderRadius: 13, width: "min(640px, 100%)",
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("photo_locate.photo_se_jagah")}</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
           {t("photo_locate.site_ki_photo_daalo_usme_chhapi")}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
          <label style={{ display: "block", padding: "14px", borderRadius: 9, cursor: "pointer",
            border: `1.5px dashed ${file ? "#059669" : T.b2}`, background: file ? "#ECFDF5" : T.surfaceB,
            textAlign: "center", fontSize: 12.5, color: file ? "#065F46" : T.t3 }}>
            {file ? `✓ ${file.name}` : t("photo_locate.photo_chuno_jpg")}
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { setFile(e.target.files?.[0] || null); setRes(null); setErr(""); }} />
          </label>

          <div style={{ fontSize: 11, color: T.t4, textAlign: "center", margin: "9px 0" }}>{t("photo_locate.ya_photo_ka_link")}</div>
          <input value={url} onChange={(e) => { setUrl(e.target.value); setRes(null); }}
            placeholder="https://res.cloudinary.com/..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", borderRadius: 7,
              border: `1px solid ${T.b1}`, fontSize: 12, color: T.t1, background: T.surface,
              outline: "none", fontFamily: "inherit" }} />

          {!!err && <div style={{ marginTop: 11, background: "#FEF2F2", border: "1px solid #FCA5A5",
            color: "#991B1B", borderRadius: 8, padding: "9px 12px", fontSize: 11.5, lineHeight: 1.5 }}>{err}</div>}

          {!!busy && <div style={{ marginTop: 11, fontSize: 12, color: T.ind, textAlign: "center" }}>{busy}</div>}

          {res && (
            <div style={{ marginTop: 14 }}>
              <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 9,
                padding: "9px 12px", fontSize: 12, color: "#065F46", lineHeight: 1.6 }}>
                📍 <b>{res.lat}, {res.lng}</b>
                <span style={{ color: "#047857" }}> — {SRC_LABEL[res.source] || res.source}</span>
                {res.place && <div style={{ fontSize: 11.5, marginTop: 2 }}>{res.place}</div>}
                {res.taken_at && <div style={{ fontSize: 11, color: "#047857" }}>{t("photo_locate.photo_ki_date_taken_at", { taken_at: res.taken_at })}</div>}
              </div>

              <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase",
                letterSpacing: ".4px", margin: "12px 0 5px" }}>{t("photo_locate.sabse_paas")}</div>

              {(res.matches || []).map((m, i) => {
                const on = pick?.alignment_id === m.alignment_id;
                return (
                  <button key={m.alignment_id} onClick={() => m.task && setPick(m)} disabled={!m.task}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                      padding: "9px 11px", marginBottom: 6, borderRadius: 8, fontFamily: "inherit",
                      border: `1px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : (m.task ? T.surface : T.surfaceB),
                      cursor: m.task ? "pointer" : "default", opacity: m.task ? 1 : 0.65 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: m.distance_m <= 200 ? "#059669" : T.t3,
                      minWidth: 58, fontVariantNumeric: "tabular-nums" }}>
                      {fmtD(m.distance_m)}
                      {i === 0 && <span style={{ display: "block", fontSize: 8.5, fontWeight: 700,
                        color: "#059669", letterSpacing: ".3px" }}>{t("photo_locate.sabse_paas_2")}</span>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, color: T.t1, fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                      <span style={{ display: "block", fontSize: 10.5, color: T.t4, marginTop: 1 }}>
                        {m.project_name}{m.kind === "point" ? t("photo_locate.structure") : ""}
                        {m.task ? ` · task: ${m.task.name}` : t("photo_locate.is_line_par_abhi_task_nahi")}
                      </span>
                    </span>
                  </button>
                );
              })}

              {pick && (res.matches || [])[0] && pick.alignment_id !== res.matches[0].alignment_id && (
                <div style={{ marginTop: 4, background: "#FFFBEB", border: "1px solid #FCD34D",
                  color: "#92400E", borderRadius: 8, padding: "9px 12px", fontSize: 11.5, lineHeight: 1.6 }}><Rich k="photo_locate.ye_sabse_paas_wali_line_nahi" params={{ fmtD: fmtD(pick.distance_m), name: res.matches[0].name, fmtD2: fmtD(res.matches[0].distance_m), res: res.matches[0].task
                    ? "."
                    : ", par us par abhi koi task nahi — pehle Tasks tab me “Map se plan lao” chalao." }} /></div>
              )}

              {!(res.matches || []).some((m) => m.task) && (
                <div style={{ fontSize: 11.5, color: T.amb, lineHeight: 1.6, marginTop: 4 }}>
                 {t("photo_locate.in_lines_par_abhi_koi_task")} <b>{t("photo_locate.map_se_plan_lao")}</b> {t("photo_locate.se_plan_bana_lo")}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: `1px solid ${T.b1}` }}>
          <div style={{ flex: 1, fontSize: 11, color: T.t4 }}>
            {res ? t("photo_locate.line_chuno_photo_usi_ke_task") : t("photo_locate.exif_ya_chhapi_patti_dono_padhi")}
          </div>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
          {!res ? (
            <button onClick={run} disabled={!!busy || (!file && !url.trim())}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none",
                background: (file || url.trim()) ? T.ind : T.b2, color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: (file || url.trim()) ? "pointer" : "default", fontFamily: "inherit" }}>
              {busy ? "…" : t("photo_locate.jagah_dhoondo")}
            </button>
          ) : (
            <button onClick={attach} disabled={!!busy || !pick?.task}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none",
                background: pick?.task ? T.ind : T.b2, color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: pick?.task ? "pointer" : "default", fontFamily: "inherit" }}>
              {busy ? "…" : t("photo_locate.yahan_lagao")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
