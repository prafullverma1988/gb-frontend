// ════════════════════════════════════════════════════════════════
// StmtBatchPanel — Khaata Ledger me "Statement batch" ki patti
// ════════════════════════════════════════════════════════════════
// Bank statement ki entry ab seedhe khaate me nahi jaati: wizard ka save ek
// batch banata hai jo Multi-Level Approval ("Bank Statement Import") se guzarta
// hai — daalne wala khud approver ho tab bhi. Ye patti batata hai kitne batch
// approval me / draft / reject hain; kholo to party-wise asar, lines aur
// Approve / Reject (engine: PATCH /approvals/:id/action — jiski baari, wahi).
import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const inr = (n) => (Number(n) < 0 ? "-₹" : "₹") + Math.abs(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN");
const dmy = (s) => { const d = String(s || "").slice(0, 10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0].slice(2)}` : ""; };
const balTxt = (v) => (v == null ? "—" : Number(v) === 0 ? "₹0" : `${inr(Math.abs(v))} ${v > 0 ? t("stmt.bal_receive") : t("stmt.bal_pay")}`);
const ST = () => ({
  pending: [T.pur, T.purL, t("stb.st_pending")], draft: [T.slt, T.sltL, t("stb.st_draft")],
  rejected: [T.red, T.redL, t("stb.st_rejected")], approved: [T.grn, T.grnL, t("stb.st_approved")], failed: [T.red, T.redL, t("stb.st_failed")],
});

export default function StmtBatchPanel({ onChanged }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);       // batch id
  const load = useCallback(() => {
    api.get("/finance/statement/batches?status=open").then((r) => { if (r && r.success) setList(r.data || []); }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!list.length && !open) return null;
  const n = (s) => list.filter((b) => b.status === s).length;
  const st = ST();
  return (
    <>
      <div style={{ marginBottom: 10, padding: "9px 13px", borderRadius: 8, background: T.purL, border: `1px solid ${T.pur}44`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 12.5, color: T.pur }}>{t("stb.title")}</b>
        {["pending", "draft", "rejected"].filter((s) => n(s)).map((s) => (
          <span key={s} style={{ fontSize: 11.5, fontWeight: 700, color: st[s][0], background: T.surface, border: `1px solid ${st[s][0]}55`, padding: "2px 9px", borderRadius: 12 }}>{n(s)} {st[s][2]}</span>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
          {list.slice(0, 6).map((b) => (
            <button key={b.id} onClick={() => setOpen(b.id)} style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              border: `1px solid ${st[b.status] ? st[b.status][0] : T.b2}`, background: T.surface, color: T.t1 }}>
              #{b.id} · {b.account_name} · {inr(Number(b.total_in) + Number(b.total_out))}
            </button>
          ))}
        </div>
      </div>
      {open && <BatchModal id={open} onClose={(changed) => { setOpen(null); load(); if (changed && onChanged) onChanged(); }} />}
    </>
  );
}

function BatchModal({ id, onClose }) {
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [changed, setChanged] = useState(false);
  const load = useCallback(() => {
    api.get(`/finance/statement/batches/${id}`).then((r) => {
      if (r && r.success) { setB(r.data); setNote(r.data.batch_note || ""); } else setErr((r && r.message) || t("stb.load_fail"));
    }).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => { setBusy(true); setErr(""); try { const r = await fn(); if (!r || r.success === false) throw new Error((r && r.message) || t("stb.fail")); setChanged(true); load(); } catch (e) { setErr(e.message); } setBusy(false); };
  const approve = () => act(() => api.patch(`/approvals/${b.approval_request_id}/action`, { action: "approve", remarks: "" }));
  const reject = () => { const why = (window.prompt(t("stb.reject_why")) || "").trim(); if (why.length < 3) return; act(() => api.patch(`/approvals/${b.approval_request_id}/action`, { action: "reject", remarks: why })); };
  const submit = () => act(() => api.put(`/finance/statement/batches/${id}`, { batch_note: note, submit: true }));
  const drop = () => { if (!window.confirm(t("stb.cancel_confirm"))) return; act(() => api.del ? api.del(`/finance/statement/batches/${id}`) : api(`/finance/statement/batches/${id}`, { method: "DELETE" })); };

  const st = ST();
  const th = { fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", padding: "6px 10px", textAlign: "left", background: T.surfaceB };
  const td = { fontSize: 12.5, color: T.t2, padding: "6px 10px", borderTop: `1px solid ${T.b1}` };
  const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const btn = (c, fill) => ({ fontSize: 12.5, fontWeight: 700, padding: "7px 16px", borderRadius: 7, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", border: `1px solid ${c}`, background: fill ? c : T.surface, color: fill ? "#fff" : c });
  const res = b && b.results && b.results.summary ? b.results.summary : null;

  return (
    <div onClick={() => onClose(changed)} style={{ position: "fixed", inset: 0, zIndex: 420, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 12, width: "min(920px,100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stb.batch_n", { id })}{b ? " · " + b.account_name : ""}</div>
            {b && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{t("stb.by_on", { name: b.created_by_name || "—", date: dmy(b.created_at) })} · {b.line_count} {t("stb.lines")}</div>}
          </div>
          {b && st[b.status] && <span style={{ fontSize: 11.5, fontWeight: 700, color: st[b.status][0], background: st[b.status][1], padding: "3px 10px", borderRadius: 12 }}>{st[b.status][2]}</span>}
          <button onClick={() => onClose(changed)} style={{ border: "none", background: "none", fontSize: 20, color: T.t4, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {err && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 12.5 }}>{err}</div>}
          {!b && !err && <div style={{ color: T.t4, fontSize: 13 }}>{t("common.loading")}</div>}
          {b && (
            <>
              {b.status === "rejected" && b.decision_note && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 7, background: T.redL, color: T.red, fontSize: 12.5 }}>{t("stb.rejected_why", { name: b.decided_by_name || "—", why: b.decision_note })}</div>}
              {b.status === "approved" && res && <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 7, background: T.grnL, color: T.grn, fontSize: 12.5, fontWeight: 600 }}>{t("stb.approved_res", { c: res.created, d: res.duplicate_suspect, a: res.already_imported })}</div>}
              <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: T.bluL, border: `1px solid ${T.bluM}`, fontSize: 12.5, color: T.t2, display: "flex", gap: 18, flexWrap: "wrap" }}>
                <b style={{ color: T.t1 }}>{b.account_name}</b>
                {b.account_now != null && <span>{t("stmt.pv_acc_now")}: <b>{inr(b.account_now)}</b></span>}
                <span style={{ color: T.grn }}>+{inr(b.total_in)}</span>
                <span style={{ color: T.red }}>−{inr(b.total_out)}</span>
                {b.account_after != null && b.status !== "approved" && <span>{t("stmt.pv_acc_after")}: <b>{inr(b.account_after)}</b></span>}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 12 }}>
                <thead><tr><th style={th}>{t("stmt.pv_party")}</th><th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_count")}</th>
                  <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_in")}</th><th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_out")}</th>
                  <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_old")}</th><th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_new")}</th></tr></thead>
                <tbody>
                  {b.impact.map((x) => (
                    <tr key={x.key}>
                      <td style={{ ...td, fontWeight: 600, color: x.kind === "n" ? T.amb : T.t1 }}>{x.kind === "n" ? t("stmt.pv_noparty") : x.name}{x.kind === "a" ? <span style={{ color: T.t4, fontWeight: 400 }}> · {t("stmt.sub_transfer")}</span> : null}</td>
                      <td style={num}>{x.n}</td>
                      <td style={{ ...num, color: x.in ? T.grn : T.t4 }}>{x.in ? inr(x.in) : "—"}</td>
                      <td style={{ ...num, color: x.out ? T.red : T.t4 }}>{x.out ? inr(x.out) : "—"}</td>
                      <td style={{ ...num, color: T.t3 }}>{x.kind === "p" ? balTxt(x.old_balance) : "—"}</td>
                      <td style={{ ...num, fontWeight: 700 }}>{x.kind === "p" && b.status !== "approved" ? balTxt(x.new_balance) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <details style={{ marginBottom: 12 }}>
                <summary style={{ fontSize: 12, fontWeight: 700, color: T.t2, cursor: "pointer" }}>{t("stb.all_lines", { n: b.entries.length })}</summary>
                <div style={{ marginTop: 6, border: `1px solid ${T.b1}`, borderRadius: 8, maxHeight: 280, overflow: "auto" }}>
                  {b.entries.map((e, i) => (
                    <div key={i} style={{ padding: "5px 10px", borderTop: i ? `1px solid ${T.b1}` : "none", display: "flex", gap: 10, fontSize: 12 }}>
                      <span style={{ width: 62, color: T.t3 }}>{dmy(e.date)}</span>
                      <span style={{ flex: 1, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.description || ""}>{e.description || "—"}{e.note ? ` · “${e.note}”` : ""}</span>
                      <b style={{ color: e.dir === "in" ? T.grn : T.red }}>{e.dir === "in" ? "+" : "−"}{inr(e.amount)}</b>
                    </div>
                  ))}
                </div>
              </details>
              {(b.status === "draft" || b.status === "rejected") ? (
                <div><label style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>{t("stmt.batch_note_ph")}</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} style={{ width: "100%", boxSizing: "border-box", marginTop: 4, fontSize: 12.5, padding: "7px 10px", borderRadius: 6, border: `1.5px solid ${note.trim().length >= 3 ? T.grnM : T.ambM}`, fontFamily: "inherit" }} /></div>
              ) : (b.batch_note && <div style={{ fontSize: 12.5, color: T.t2 }}><b>{t("stb.note")}:</b> {b.batch_note}</div>)}
            </>
          )}
        </div>
        {b && (
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            {b.status === "pending" && <span style={{ fontSize: 11.5, color: T.t3, flex: 1 }}>{t("stb.pending_help")}</span>}
            {b.status === "pending" && b.approval_request_id && <button disabled={busy} onClick={reject} style={btn(T.red, false)}>{t("stb.reject")}</button>}
            {b.status === "pending" && b.approval_request_id && <button disabled={busy} onClick={approve} style={btn(T.grn, true)}>{t("stb.approve")}</button>}
            {(b.status === "draft" || b.status === "rejected") && <button disabled={busy} onClick={drop} style={btn(T.red, false)}>{t("stb.cancel")}</button>}
            {(b.status === "draft" || b.status === "rejected") && <button disabled={busy || note.trim().length < 3} onClick={submit} style={btn(T.blu, true)}>{t("stb.submit")}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
