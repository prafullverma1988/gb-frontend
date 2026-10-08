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
  // Project: kaunse linked group "Hatao" chune (baaki rakhe jaate), kaunsa khula, taaza-kaam ki haan
  const [delGroups, setDelGroups] = useState([]);
  const [openG, setOpenG] = useState("");
  const [ackRecent, setAckRecent] = useState(false);

  useEffect(() => { setStep("idle"); setPrev(null); setPw(""); setTyped(""); setForce(false); setErr(""); setDone(null); setDelGroups([]); setOpenG(""); setAckRecent(false); }, [kind, id]);
  const groups = prev?.groups || null;
  const recentOthers = prev?.recent?.others || 0;
  const keepsSome = !!groups && groups.some((g) => g.locked || !delGroups.includes(g.key));
  // Sach me kitni rows mitengi — apni + jo linked group Hatao chune (band wale nahi)
  const goingRows = !groups ? (prev?.total || 0)
    : (prev.own || []).reduce((a, r) => a + r.count, 0) + groups.filter((g) => !g.locked && delGroups.includes(g.key)).reduce((a, g) => a + g.count, 0);

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
      { password: pw, confirm_name: typed,
        // Paise wala group khud "Hatao" chuna = wahi "phir bhi hatao" wali haan
        force: force || delGroups.includes("money"),
        delete_groups: delGroups, ack_recent: ackRecent }, { timeoutMs: 180000 })
      .catch((e) => ({ success: false, message: e?.message }));
    setBusy("");
    if (!r?.success) {
      if (r?.code === "money_linked") setForce(true);   // "phir bhi hatao" ka option khol do
      if (r?.code === "recent_activity") setAckRecent(false);
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
          {done.tombstone && <div style={{ marginTop: 5 }}>{t("danger_delete.done_kept")}</div>}
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
         {groups ? null : t("danger_delete.ye_sab_hamesha_ke_liye_mit")}
        </div>
        {groups ? <GroupPreview prev={prev} delGroups={delGroups} setDelGroups={setDelGroups} openG={openG} setOpenG={setOpenG} keepsSome={keepsSome} />
        : prev.total === 0 ? (
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

        {!groups && prev.money?.length > 0 && (
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
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 9 }}>{t("danger_delete.aakhri_pushti_prev_rows_mitne_ja", { prev: goingRows.toLocaleString("en-IN") })}</div>
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

        {recentOthers > 0 && (
          <label style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: "#92400E",
            background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "9px 11px", marginBottom: 11, cursor: "pointer", lineHeight: 1.5 }}>
            <input type="checkbox" checked={ackRecent} onChange={(e) => setAckRecent(e.target.checked)} style={{ marginTop: 2 }} />
            <span><b>{t("danger_delete.recent_title", { n: recentOthers, days: prev.recent.days })}</b> — {t("danger_delete.recent_ack")}</span>
          </label>
        )}
        {force && !groups && (
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
          <button onClick={doDelete} disabled={!!busy || !nameOk || !pw || (recentOthers > 0 && !ackRecent)}
            style={{ flex: 2, padding: "9px", borderRadius: 7, border: "none",
              background: (nameOk && pw && !busy && (!recentOthers || ackRecent)) ? T.red : T.b1, color: (nameOk && pw && !busy && (!recentOthers || ackRecent)) ? "white" : T.t4,
              fontSize: 12.5, fontWeight: 700, cursor: (nameOk && pw && !busy && (!recentOthers || ackRecent)) ? "pointer" : "not-allowed" }}>
            {busy === "delete" ? t("danger_delete.mit_raha_hai") : t("danger_delete.hamesha_ke_liye_hatao")}
          </button>
        </div>
      </>)}
    </div>
  );
}

// ── Project ka bantwara: taaza kaam · mitega (apna) · linked (Rakho / Hatao) ──
const fmtDay = (d) => { if (!d) return ""; const x = new Date(d); return isNaN(x) ? String(d).slice(0, 10) : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); };
function GroupPreview({ prev, delGroups, setDelGroups, openG, setOpenG, keepsSome }) {
  const rec = prev.recent || {};
  const others = (rec.by_user || []).filter((u) => !u.me);
  const toggle = (k, del) => setDelGroups((cur) => (del ? [...new Set([...cur, k])] : cur.filter((x) => x !== k)));
  const pill = (on, color) => ({ padding: "4px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
    border: `1.5px solid ${on ? color : T.b1}`, background: on ? color : T.surface, color: on ? "white" : T.t3 });
  return (<>
    {rec.others > 0 && (
      <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "9px 12px", marginBottom: 11, fontSize: 12, color: "#92400E", lineHeight: 1.55 }}>
        ⚠ <b>{t("danger_delete.recent_title", { n: rec.others, days: rec.days })}</b>
        {others.slice(0, 5).map((u) => (
          <div key={String(u.user_id)}>• {u.name || t("danger_delete.unknown_user")} — {u.count} · {fmtDay(u.last_at)}</div>
        ))}
      </div>
    )}

    <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 5 }}>🔴 {t("danger_delete.mitega_heading")}</div>
    <div style={{ background: "white", border: `1px solid ${T.redM}`, borderRadius: 7, padding: "8px 12px", marginBottom: 12, maxHeight: 150, overflowY: "auto" }}>
      {(prev.own || []).length === 0
        ? <div style={{ fontSize: 12, color: T.t4 }}>—</div>
        : prev.own.map((r) => (
          <div key={r.table} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: T.t2 }}>
            <span>{nice(r.table)}</span><b>{r.count.toLocaleString("en-IN")}</b>
          </div>))}
    </div>

    {prev.groups.length > 0 && (<>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 3 }}>🟡 {t("danger_delete.judi_heading")}</div>
      <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.5, marginBottom: 7 }}>{t("danger_delete.judi_help")}</div>
      {prev.groups.map((g) => {
        const del = !g.locked && delGroups.includes(g.key);
        const rows = g.tables.flatMap((tb) => tb.rows.map((r) => ({ ...r, table: tb.table })));
        const more = g.count - rows.length;
        return (
          <div key={g.key} style={{ background: "white", border: `1px solid ${del ? T.redM : T.b1}`, borderRadius: 7, padding: "9px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("danger_delete.group_" + g.key)}</div>
                <div style={{ fontSize: 11.5, color: T.t3 }}>{g.tables.map((tb) => `${tb.count} ${nice(tb.table)}`).join(" · ")}{g.amount ? " · " + fmtAmt(g.amount) : ""}</div>
              </div>
              {g.locked ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", background: "#FEF3C7", borderRadius: 6, padding: "4px 9px" }}>
                  ⛔ {t("danger_delete.band_rakhi_jayegi")}
                </span>
              ) : (
                <div style={{ display: "flex", gap: 5 }}>
                  <button type="button" onClick={() => toggle(g.key, false)} style={pill(!del, T.grn)}>{t("danger_delete.rakho")}</button>
                  <button type="button" onClick={() => toggle(g.key, true)} style={pill(del, T.red)}>{t("danger_delete.mitao")}</button>
                </div>
              )}
            </div>
            {g.locked && g.lock_why?.length > 0 && (
              <div style={{ fontSize: 11.5, color: "#92400E", marginTop: 4 }}>{g.lock_why.map((w) => t("danger_delete.lock_" + w)).join(" · ")}</div>
            )}
            <button type="button" onClick={() => setOpenG(openG === g.key ? "" : g.key)}
              style={{ marginTop: 5, border: "none", background: "none", padding: 0, fontSize: 11.5, fontWeight: 600, color: T.blu || "#2563EB", cursor: "pointer" }}>
              {openG === g.key ? t("danger_delete.chhupao") : t("danger_delete.entries_dikhao", { n: g.count })}
            </button>
            {openG === g.key && (
              <div style={{ marginTop: 5, maxHeight: 200, overflowY: "auto", borderTop: `1px solid ${T.b1}` }}>
                {rows.map((r) => (
                  <div key={r.table + r.id} style={{ display: "flex", gap: 8, fontSize: 11.5, padding: "4px 0", borderBottom: `1px solid ${T.b1}`, color: T.t2 }}>
                    <span style={{ width: 68, flexShrink: 0, color: T.t3 }}>{fmtDay(r.date || r.created_at)}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nice(r.table)}{r.label ? " · " + r.label : ""}</span>
                    {r.amount != null && <b style={{ whiteSpace: "nowrap" }}>{r.amount.toLocaleString("en-IN")}</b>}
                    <span style={{ width: 90, flexShrink: 0, textAlign: "right", color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.by_name || ""}</span>
                  </div>
                ))}
                {more > 0 && <div style={{ fontSize: 11.5, color: T.t4, paddingTop: 4 }}>{t("danger_delete.aur_n", { n: more })}</div>}
              </div>
            )}
          </div>
        );
      })}
      {keepsSome && <div style={{ fontSize: 11.5, color: T.t2, background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 7, padding: "7px 11px", marginBottom: 11, lineHeight: 1.5 }}>{t("danger_delete.kept_note")}</div>}
    </>)}
  </>);
}
