import React, { useState, useEffect } from "react";
import api from "../../config/api";
import { T } from "./tokens";
import { t, Rich } from "../../i18n";

/* ────────────────────────────────────────────────────────────────────
   ARCHIVE / PERMANENT DELETE — tender aur project, dono ke liye ek hi

   Prafull ka niyam (2026-08-26):
     • Archive — list se hat jaye, data zinda, kabhi bhi wapas
     • Permanent delete — sab kuch mit jaye; sirf admin; company ka
       delete-password lage (SaaS admin set karta hai)

   Teen cheezein jaan-boojh kar:
     1. Delete se PEHLE "kya-kya udega" ki ginti dikhti hai — aadmi apni
        aankh se dekh kar haan kahe. Bina preview ke 66-table ka delete
        dena khatarnak hai.
     2. Do taale — password (adhikar) + record ka POORA NAAM (sahi record).
        Sirf "DELETE" likhwana kamzor hai; wo har record par ek jaisa hai.
     3. Mitne ke baad bhi 30 din tak Recycle Bin se wapas aa sakta hai.

   Backend: routes/danger-delete.js
   ──────────────────────────────────────────────────────────────────── */

const fmtAmt = (n) => {
  const v = Number(n || 0); if (!v) return "";
  if (v >= 1e7) return "₹" + (v / 1e7).toFixed(2) + " Cr";
  if (v >= 1e5) return "₹" + (v / 1e5).toFixed(2) + " L";
  return "₹" + v.toLocaleString("en-IN");
};
// table ka naam aadmi ki bhasha me
const NICE = {
  project_tasks: "task", transactions: "paisa ki entry", transaction_items: "bill ki line",
  dpr_reports: "DPR", dpr_task_actuals: "din ki entry", grn_entries: "GRN", grn_items: "GRN ki line",
  material_requests: "material request", purchase_orders: "PO", po_items: "PO ki line",
  project_attendance: "hazri", project_files: "file", drawings: "drawing", moms: "MOM",
  tender_boq_items: "BOQ item", tender_work_packages: "work package", tender_alignments: "map line",
  tender_measurements: "MB entry", ra_bills: "RA bill", ra_bill_items: "RA bill ki line",
  customer_invoices: "invoice", customer_payments: "payment", user_project_access: "access",
  project_baselines: "baseline", approval_requests: "approval", task_used_log: "material kharch",
  trips: "trip", fuel_issue: "diesel entry", equipment_usage: "machine ka istemal",
};
const nice = (t) => NICE[t] || t.replace(/_/g, " ");

export default function DangerDelete({ kind, id, name, onArchived, onDeleted }) {
  const label = kind === "tender" ? "Tender" : "Project";
  const [step, setStep] = useState("idle");      // idle | preview | typing
  const [prev, setPrev] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [pw, setPw] = useState("");
  const [typed, setTyped] = useState("");
  const [force, setForce] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { setStep("idle"); setPrev(null); setPw(""); setTyped(""); setForce(false); setErr(""); setDone(null); }, [kind, id]);

  const archive = async () => {
    setBusy("archive"); setErr("");
    const r = await api.patch(`/danger/${kind}/${id}/archive`, { archived: true }).catch((e) => ({ success: false, message: e?.message }));
    setBusy("");
    if (!r?.success) return setErr(r?.message || "Archive nahi hua");
    window.toast?.success?.(r.message);
    onArchived && onArchived();
  };

  const openPreview = async () => {
    setBusy("preview"); setErr("");
    const r = await api.get(`/danger/${kind}/${id}/delete-preview`).catch((e) => ({ success: false, message: e?.message }));
    setBusy("");
    if (!r?.success) return setErr(r?.message || "Preview nahi mila");
    setPrev(r.data); setStep("preview");
  };

  const doDelete = async () => {
    setBusy("delete"); setErr("");
    const r = await api.post(`/danger/${kind}/${id}/permanent-delete`,
      { password: pw, confirm_name: typed, force }, { timeoutMs: 180000 })
      .catch((e) => ({ success: false, message: e?.message }));
    setBusy("");
    if (!r?.success) {
      if (r?.code === "money_linked") setForce(true);   // "phir bhi hatao" ka option khol do
      return setErr(r?.message || "Delete nahi hua");
    }
    setDone(r.data);
    window.toast?.success?.(r.message);
    onDeleted && onDeleted();
  };

  // Naam ka milaan — chhoti-badi, jagah aur DASH ka farak maaf. Tender ka
  // naam "NIT-99 — Sendh road" jaisa banta hai jisme EM-DASH hai, jo aam
  // keyboard se type hi nahi hota; taala "sahi record hai" jaanchne ke liye
  // hai, "sahi dash type kar sakte ho" ke liye nahi. Backend ka nameMatches
  // bhi bilkul yahi karta hai — dono ek jaise rehne chahiye.
  const normName = (s) => String(s || "")
    .replace(/[‐-―−⁃]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .trim().toLowerCase();
  const nameOk = normName(typed) === normName(prev?.name || name);

  // ── mit chuka — natija ──
  if (done) {
    return (
      <div style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.grn, marginBottom: 5 }}>{t("danger_delete.label_hata_diya_gaya", { label })}</div>
        <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}><Rich k="danger_delete.kul_total_rows_rows_mit_gayin" params={{ total_rows: done.total_rows, recovery_days: done.recovery_days }} />{done.truncated?.length > 0 && (
            <div style={{ color: "#B45309", marginTop: 5 }}>{t("danger_delete.bahut_bade_table_ka_poora_backup", { done: done.truncated.join(", ") })}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, padding: "14px 16px" }}>
      {err && <div style={{ background: "white", border: `1px solid ${T.redM}`, borderRadius: 6, padding: "8px 11px", fontSize: 12, color: T.red, marginBottom: 11, lineHeight: 1.5 }}>{err}</div>}

      {/* ── ARCHIVE — pehla aur aam raasta ── */}
      {step === "idle" && (<>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, marginBottom: 4 }}>{t("danger_delete.archive_karo")}</div>
        <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.55, marginBottom: 10 }}><Rich k="danger_delete.label_list_se_hat_jayega_par" params={{ label, t: t("danger_delete.data_poora_bacha_rahega"), label2: label.toLowerCase() }} /></div>
        <button onClick={archive} disabled={!!busy}
          style={{ padding: "7px 16px", borderRadius: 7, background: T.surface, border: `1.5px solid ${T.b2}`,
            color: T.t2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {busy === "archive" ? "…" : t("danger_delete.archive")}
        </button>

        <div style={{ borderTop: `1px solid ${T.redM}`, margin: "14px 0 11px" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 4 }}>{t("danger_delete.permanent_delete")}</div>
        <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.55, marginBottom: 10 }}><Rich k="danger_delete.label_t_mit_jayega_sirf_admin" params={{ label, t: t("danger_delete.aur_uska_poora_data") }} /></div>
        <button onClick={openPreview} disabled={!!busy}
          style={{ padding: "7px 16px", borderRadius: 7, background: T.surface, border: `1.5px solid ${T.redM}`,
            color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {busy === "preview" ? t("danger_delete.gin_raha_hu") : t("danger_delete.dekho_kya_kya_udega")}
        </button>
      </>)}

      {/* ── PREVIEW — kya-kya udega ── */}
      {step === "preview" && prev && (<>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 8 }}>
         {t("danger_delete.ye_sab_hamesha_ke_liye_mit")}
        </div>
        {prev.total === 0 ? (
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 11 }}>{t("danger_delete.is_label_par_abhi_koi_data", { label: label.toLowerCase() })}</div>
        ) : (
          <div style={{ background: "white", border: `1px solid ${T.redM}`, borderRadius: 7, padding: "10px 12px", marginBottom: 11, maxHeight: 190, overflowY: "auto" }}>
            {prev.rows.map((r) => (
              <div key={r.table} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: T.t2 }}>
                <span>{nice(r.table)}</span><b>{r.count.toLocaleString("en-IN")}</b>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingTop: 6, marginTop: 5, borderTop: `1px solid ${T.b1}`, color: T.t1, fontWeight: 700 }}>
              <span>{t("danger_delete.kul_rows")}</span><span>{prev.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {prev.money?.length > 0 && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#92400E", marginBottom: 11, lineHeight: 1.55 }}>
            ⚠ <b>{t("danger_delete.ispar_paisa_juda_hai")}</b> — {prev.money.map((m) => `${m.count} ${nice(m.table)}`).join(", ")}
            {prev.money_total > 0 && <> ({fmtAmt(prev.money_total)})</>}{t("danger_delete.delete_se_hisaab_bhi_jayega")}
          </div>
        )}
        {kind === "tender" && prev.frees_projects > 0 && (
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 11 }}><Rich k="danger_delete.frees_projects_site_t_wo_sirf" params={{ frees_projects: prev.frees_projects, t: t("danger_delete.nahi_mitegi") }} /></div>
        )}
        <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 11 }}>{t("danger_delete.recovery_days_din_tak_recycle_bin", { recovery_days: prev.recovery_days })}</div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setStep("idle"); setErr(""); }}
            style={{ flex: 1, padding: "8px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
           {t("danger_delete.rehne_do")}
          </button>
          <button onClick={() => setStep("typing")} disabled={!prev.has_password}
            title={prev.has_password ? "" : t("danger_delete.company_par_delete_password_set_nahi")}
            style={{ flex: 2, padding: "8px", borderRadius: 7, border: "none",
              background: prev.has_password ? T.red : T.b1, color: prev.has_password ? "white" : T.t4,
              fontSize: 12, fontWeight: 700, cursor: prev.has_password ? "pointer" : "not-allowed" }}>
           {t("danger_delete.aage_badho")}
          </button>
        </div>
        {!prev.has_password && (
          <div style={{ fontSize: 11.5, color: T.red, marginTop: 8, lineHeight: 1.5 }}>
           {t("danger_delete.is_company_par_delete_password_set")}
          </div>
        )}
      </>)}

      {/* ── DO TAALE — password + poora naam ── */}
      {step === "typing" && prev && (<>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 9 }}>{t("danger_delete.aakhri_pushti_prev_rows_mitne_ja", { prev: prev.total.toLocaleString("en-IN") })}</div>
        <div style={{ fontSize: 12, color: T.t3, marginBottom: 5 }}>{t("danger_delete.1_label_ka_poora_naam_likho", { label })}<span style={{ color: T.t4 }}>{t("danger_delete.dash_aur_chhoti_badi_ka_farak")}</span>:
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch", marginBottom: 6 }}>
          <div style={{ flex: 1, background: "white", border: `1px solid ${T.b1}`, borderRadius: 6, padding: "5px 9px", fontSize: 12, color: T.t1, fontWeight: 700, wordBreak: "break-word" }}>
            {prev.name}
          </div>
          {/* Naam me em-dash jaise akshar hote hain jo keyboard se type nahi
              hote — copy ka raasta rakhna hi theek hai. */}
          <button type="button" onClick={() => setTyped(prev.name)} title={t("danger_delete.naam_neeche_bhar_do")}
            style={{ border: `1px solid ${T.b2}`, background: T.surface, borderRadius: 6, padding: "0 10px",
              fontSize: 11, fontWeight: 700, color: T.t3, cursor: "pointer", whiteSpace: "nowrap" }}>
           {t("danger_delete.bhar_do")}
          </button>
        </div>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("danger_delete.yahan_wahi_naam_likho")}
          style={{ width: "100%", padding: "8px 11px", borderRadius: 7, marginBottom: 11, boxSizing: "border-box",
            border: `1.5px solid ${typed ? (nameOk ? T.grnM : T.redM) : T.b1}`, fontSize: 12.5, color: T.t1,
            background: T.surface, outline: "none", fontFamily: "inherit" }} />

        <div style={{ fontSize: 12, color: T.t3, marginBottom: 5 }}>{t("danger_delete.2_company_ka_delete_password")}</div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("danger_delete.delete_password")}
          autoComplete="new-password"
          style={{ width: "100%", padding: "8px 11px", borderRadius: 7, marginBottom: 11, boxSizing: "border-box",
            border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />

        {force && (
          <label style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: "#92400E",
            background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "9px 11px", marginBottom: 11, cursor: "pointer", lineHeight: 1.5 }}>
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} style={{ marginTop: 2 }} />
            <span>{t("danger_delete.haan_paisa_juda_hone_ke_bawajood")} <b>{t("danger_delete.phir_bhi_hatao")}</b>{t("danger_delete.ye_faisla_audit_me_darj_hoga")}</span>
          </label>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setStep("preview"); setErr(""); }}
            style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
           {t("danger_delete.peechhe")}
          </button>
          <button onClick={doDelete} disabled={!!busy || !nameOk || !pw}
            style={{ flex: 2, padding: "9px", borderRadius: 7, border: "none",
              background: (nameOk && pw && !busy) ? T.red : T.b1, color: (nameOk && pw && !busy) ? "white" : T.t4,
              fontSize: 12.5, fontWeight: 700, cursor: (nameOk && pw && !busy) ? "pointer" : "not-allowed" }}>
            {busy === "delete" ? t("danger_delete.mit_raha_hai") : t("danger_delete.hamesha_ke_liye_hatao")}
          </button>
        </div>
      </>)}
    </div>
  );
}
