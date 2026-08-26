import React, { useState, useEffect } from "react";
import api from "../../config/api";
import { T } from "./tokens";

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

  const nameOk = String(typed).trim().toLowerCase().replace(/\s+/g, " ")
    === String(prev?.name || name || "").trim().toLowerCase().replace(/\s+/g, " ");

  // ── mit chuka — natija ──
  if (done) {
    return (
      <div style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.grn, marginBottom: 5 }}>✓ {label} hata diya gaya</div>
        <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}>
          Kul <b>{done.total_rows}</b> rows mit gayin. <b>{done.recovery_days} din</b> tak Recycle Bin se wapas laya ja sakta hai.
          {done.truncated?.length > 0 && (
            <div style={{ color: "#B45309", marginTop: 5 }}>
              ⚠ Bahut bade table ka poora backup nahi ban paya: {done.truncated.join(", ")} — inka data wapas nahi aayega.
            </div>
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
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, marginBottom: 4 }}>Archive karo</div>
        <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.55, marginBottom: 10 }}>
          {label} list se hat jayega par <b>data poora bacha rahega</b> — kabhi bhi wapas la sakte ho.
          Junk ya band ho chuke {label.toLowerCase()} ke liye yahi sahi hai.
        </div>
        <button onClick={archive} disabled={!!busy}
          style={{ padding: "7px 16px", borderRadius: 7, background: T.surface, border: `1.5px solid ${T.b2}`,
            color: T.t2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {busy === "archive" ? "…" : "Archive"}
        </button>

        <div style={{ borderTop: `1px solid ${T.redM}`, margin: "14px 0 11px" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 4 }}>Permanent delete</div>
        <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.55, marginBottom: 10 }}>
          {label} <b>aur uska poora data</b> mit jayega. Sirf admin, aur company ka delete-password chahiye.
        </div>
        <button onClick={openPreview} disabled={!!busy}
          style={{ padding: "7px 16px", borderRadius: 7, background: T.surface, border: `1.5px solid ${T.redM}`,
            color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {busy === "preview" ? "Gin raha hu…" : "Dekho kya-kya udega →"}
        </button>
      </>)}

      {/* ── PREVIEW — kya-kya udega ── */}
      {step === "preview" && prev && (<>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 8 }}>
          Ye sab hamesha ke liye mit jayega
        </div>
        {prev.total === 0 ? (
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 11 }}>Is {label.toLowerCase()} par abhi koi data nahi hai — sirf record khud hatega.</div>
        ) : (
          <div style={{ background: "white", border: `1px solid ${T.redM}`, borderRadius: 7, padding: "10px 12px", marginBottom: 11, maxHeight: 190, overflowY: "auto" }}>
            {prev.rows.map((r) => (
              <div key={r.table} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: T.t2 }}>
                <span>{nice(r.table)}</span><b>{r.count.toLocaleString("en-IN")}</b>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingTop: 6, marginTop: 5, borderTop: `1px solid ${T.b1}`, color: T.t1, fontWeight: 700 }}>
              <span>kul rows</span><span>{prev.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {prev.money?.length > 0 && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#92400E", marginBottom: 11, lineHeight: 1.55 }}>
            ⚠ <b>Ispar paisa juda hai</b> — {prev.money.map((m) => `${m.count} ${nice(m.table)}`).join(", ")}
            {prev.money_total > 0 && <> ({fmtAmt(prev.money_total)})</>}. Delete karne se wo hisaab bhi chala jayega.
          </div>
        )}
        {kind === "tender" && prev.frees_projects > 0 && (
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 11 }}>
            {prev.frees_projects} site <b>nahi mitegi</b> — wo sirf is tender se azaad ho jayegi.
          </div>
        )}
        <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 11 }}>
          {prev.recovery_days} din tak Recycle Bin se wapas laya ja sakta hai.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setStep("idle"); setErr(""); }}
            style={{ flex: 1, padding: "8px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Rehne do
          </button>
          <button onClick={() => setStep("typing")} disabled={!prev.has_password}
            title={prev.has_password ? "" : "Company par delete-password set nahi hai"}
            style={{ flex: 2, padding: "8px", borderRadius: 7, border: "none",
              background: prev.has_password ? T.red : T.b1, color: prev.has_password ? "white" : T.t4,
              fontSize: 12, fontWeight: 700, cursor: prev.has_password ? "pointer" : "not-allowed" }}>
            Aage badho →
          </button>
        </div>
        {!prev.has_password && (
          <div style={{ fontSize: 11.5, color: T.red, marginTop: 8, lineHeight: 1.5 }}>
            Is company par delete-password set nahi hai, isliye permanent delete band hai.
            Sanchalan team se set karvao (SaaS Admin → company profile).
          </div>
        )}
      </>)}

      {/* ── DO TAALE — password + poora naam ── */}
      {step === "typing" && prev && (<>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 9 }}>
          Aakhri pushti — {prev.total.toLocaleString("en-IN")} rows mitne ja rahi hain
        </div>
        <div style={{ fontSize: 12, color: T.t3, marginBottom: 5 }}>
          1. {label} ka poora naam hubahu likho:
        </div>
        <div style={{ background: "white", border: `1px solid ${T.b1}`, borderRadius: 6, padding: "5px 9px", fontSize: 12, color: T.t1, fontWeight: 700, marginBottom: 6, wordBreak: "break-word" }}>
          {prev.name}
        </div>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="yahan wahi naam likho"
          style={{ width: "100%", padding: "8px 11px", borderRadius: 7, marginBottom: 11, boxSizing: "border-box",
            border: `1.5px solid ${typed ? (nameOk ? T.grnM : T.redM) : T.b1}`, fontSize: 12.5, color: T.t1,
            background: T.surface, outline: "none", fontFamily: "inherit" }} />

        <div style={{ fontSize: 12, color: T.t3, marginBottom: 5 }}>2. Company ka delete-password:</div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="delete password"
          autoComplete="new-password"
          style={{ width: "100%", padding: "8px 11px", borderRadius: 7, marginBottom: 11, boxSizing: "border-box",
            border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />

        {force && (
          <label style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, color: "#92400E",
            background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 7, padding: "9px 11px", marginBottom: 11, cursor: "pointer", lineHeight: 1.5 }}>
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} style={{ marginTop: 2 }} />
            <span>Haan, paisa juda hone ke bawajood <b>phir bhi hatao</b>. (Ye faisla audit me darj hoga.)</span>
          </label>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setStep("preview"); setErr(""); }}
            style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Peechhe
          </button>
          <button onClick={doDelete} disabled={!!busy || !nameOk || !pw}
            style={{ flex: 2, padding: "9px", borderRadius: 7, border: "none",
              background: (nameOk && pw && !busy) ? T.red : T.b1, color: (nameOk && pw && !busy) ? "white" : T.t4,
              fontSize: 12.5, fontWeight: 700, cursor: (nameOk && pw && !busy) ? "pointer" : "not-allowed" }}>
            {busy === "delete" ? "Mit raha hai…" : "Hamesha ke liye hatao"}
          </button>
        </div>
      </>)}
    </div>
  );
}
