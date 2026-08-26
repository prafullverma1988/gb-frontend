import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "./tokens";

/* ────────────────────────────────────────────────────────────────────
   RECYCLE BIN — permanently hataye hue project/tender, aur wapasi

   Permanent delete se pehle poora data ek snapshot me utar jaata hai.
   Yahan se 30 din tak sab kuch wapas aa sakta hai — rows apni PURANI id
   ke saath, isliye task ka parent/child, BOQ ke naate, sab pehle jaise
   jud jaate hain.

   30 din poore hone se pehle snapshot mitana sirf Super Admin ke haath
   hai — warna "permanent delete" ka matlab hi khatam ho jaata.

   Backend: routes/danger-delete.js → /danger/recycle-bin
   ──────────────────────────────────────────────────────────────────── */

const NICE = {
  project_tasks: "task", transactions: "paisa ki entry", transaction_items: "bill ki line",
  dpr_reports: "DPR", dpr_task_actuals: "din ki entry", grn_entries: "GRN", grn_items: "GRN ki line",
  material_requests: "material request", purchase_orders: "PO", project_attendance: "hazri",
  tender_boq_items: "BOQ item", tender_work_packages: "work package", tender_alignments: "map line",
  tender_measurements: "MB entry", ra_bills: "RA bill", projects: "project", tenders: "tender",
  user_project_access: "access", project_baselines: "baseline", approval_requests: "approval",
};
const nice = (t) => NICE[t] || String(t).replace(/_/g, " ");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const daysLeft = (purgeAfter) => {
  if (!purgeAfter) return null;
  const ms = new Date(purgeAfter) - new Date();
  return Math.ceil(ms / 86400000);
};

export default function RecycleBin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [confirmPurge, setConfirmPurge] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get("/danger/recycle-bin").catch((e) => ({ success: false, message: e?.message }));
    if (r?.success) setRows(r.data || []); else setErr(r?.message || "Nahi khul paya");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const restore = async (row) => {
    setBusy(row.id); setErr(""); setMsg("");
    const r = await api.post(`/danger/recycle-bin/${row.id}/restore`, {}, { timeoutMs: 180000 })
      .catch((e) => ({ success: false, message: e?.message }));
    setBusy(null);
    if (!r?.success) return setErr(r?.message || "Wapas nahi aaya");
    setMsg(r.message);
    window.toast?.success?.(r.message);
    load();
  };

  const purge = async (row) => {
    setBusy(row.id); setErr(""); setMsg("");
    const r = await api.del(`/danger/recycle-bin/${row.id}`).catch((e) => ({ success: false, message: e?.message }));
    setBusy(null); setConfirmPurge(null);
    if (!r?.success) return setErr(r?.message || "Nahi mit paya");
    setMsg(r.message); load();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.t4 || "#9CA3AF", fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12.5, color: T.t3 || "#6B7280", lineHeight: 1.6 }}>
        Permanently hataye gaye project/tender yahan <b>30 din</b> tak rehte hain. "Wapas laao" par
        unka poora data — task, entries, links — apni purani jagah par laut aata hai.
        30 din baad ye apne aap bekaar ho jaate hain.
      </div>

      {err && <div style={{ padding: "9px 12px", background: T.redL || "#FEF2F2", border: `1px solid ${T.redM || "#FECACA"}`, borderRadius: 8, fontSize: 12, color: T.red || "#DC2626" }}>{err}</div>}
      {msg && <div style={{ padding: "9px 12px", background: T.grnL || "#ECFDF5", border: `1px solid ${T.grnM || "#A7F3D0"}`, borderRadius: 8, fontSize: 12, color: T.grn || "#059669" }}>{msg}</div>}

      {rows.length === 0 && (
        <div style={{ padding: "44px 20px", textAlign: "center", background: T.surfaceB || "#F8F9FB", border: `1px dashed ${T.b2 || "#D1D5DB"}`, borderRadius: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t2 || "#374151" }}>Bin khali hai</div>
          <div style={{ fontSize: 12, color: T.t4 || "#9CA3AF", marginTop: 5 }}>Abhi tak kuch permanently hataya nahi gaya.</div>
        </div>
      )}

      {rows.map((r) => {
        const left = daysLeft(r.purge_after);
        const gone = r.restored_at;
        const expired = r.expired;
        return (
          <div key={r.id} style={{ background: T.surface || "#fff", border: `1px solid ${T.b1 || "#E5E7EB"}`, borderRadius: 10, padding: "12px 14px", opacity: gone ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "white", background: r.entity_type === "tender" ? "#7C3AED" : "#1565C0", padding: "2px 8px", borderRadius: 10, textTransform: "uppercase" }}>
                    {r.entity_type}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 || "#111827" }}>{r.entity_name}</span>
                </div>
                <div style={{ fontSize: 11, color: T.t4 || "#9CA3AF", marginTop: 4 }}>
                  {r.deleted_by_name || "kisi ne"} ne {fmtDate(r.deleted_at)} ko hataya · <b>{(r.total_rows || 0).toLocaleString("en-IN")}</b> rows
                  {r.truncated?.length > 0 && <span style={{ color: "#B45309" }}> · ⚠ {r.truncated.join(", ")} ka poora backup nahi</span>}
                </div>
                <div style={{ fontSize: 11, marginTop: 3, color: gone ? (T.grn || "#059669") : expired ? (T.red || "#DC2626") : (T.t3 || "#6B7280") }}>
                  {gone ? `✓ ${fmtDate(r.restored_at)} ko wapas laya ja chuka hai`
                    : expired ? "30 din poore ho chuke — ab kabhi bhi mit sakta hai"
                    : `${left} din aur wapas laya ja sakta hai`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setOpen(open === r.id ? null : r.id)}
                  style={{ padding: "6px 11px", borderRadius: 7, background: T.surface || "#fff", border: `1px solid ${T.b1 || "#E5E7EB"}`, color: T.t3 || "#6B7280", fontSize: 11.5, cursor: "pointer" }}>
                  {open === r.id ? "Chhupao" : "Kya-kya tha"}
                </button>
                {!gone && (
                  <button onClick={() => restore(r)} disabled={busy === r.id}
                    style={{ padding: "6px 13px", borderRadius: 7, border: "none", background: T.grn || "#059669", color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                    {busy === r.id ? "…" : "↩ Wapas laao"}
                  </button>
                )}
                <button onClick={() => setConfirmPurge(r.id)} disabled={busy === r.id}
                  title="Snapshot bhi mita do — phir kabhi wapas nahi aayega"
                  style={{ padding: "6px 11px", borderRadius: 7, background: T.surface || "#fff", border: `1px solid ${T.redM || "#FECACA"}`, color: T.red || "#DC2626", fontSize: 11.5, cursor: "pointer" }}>
                  Mita do
                </button>
              </div>
            </div>

            {open === r.id && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.b1 || "#E5E7EB"}`, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                {Object.entries(r.row_counts || {}).filter(([k]) => !k.startsWith("~")).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                  <span key={t} style={{ fontSize: 11.5, color: T.t3 || "#6B7280" }}>{nice(t)} <b style={{ color: T.t1 || "#111827" }}>{n}</b></span>
                ))}
              </div>
            )}

            {confirmPurge === r.id && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: T.redL || "#FEF2F2", border: `1px solid ${T.redM || "#FECACA"}`, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: T.red || "#DC2626", marginBottom: 8, lineHeight: 1.5 }}>
                  Snapshot bhi mit jayega — <b>uske baad ye kabhi wapas nahi aa sakta</b>. Pakka?
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setConfirmPurge(null)}
                    style={{ padding: "6px 12px", borderRadius: 7, background: T.surface || "#fff", border: `1px solid ${T.b1 || "#E5E7EB"}`, color: T.t3 || "#6B7280", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Rehne do</button>
                  <button onClick={() => purge(r)}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: T.red || "#DC2626", color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Haan, mita do</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
