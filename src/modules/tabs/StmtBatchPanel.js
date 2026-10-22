// ════════════════════════════════════════════════════════════════
// StmtBatchPanel — Khaata Ledger me "Statement batch" ki patti
// ════════════════════════════════════════════════════════════════
// Bank statement ki entry ab seedhe khaate me nahi jaati: wizard ka save ek
// batch banata hai jo Multi-Level Approval ("Bank Statement Import") se guzarta
// hai — daalne wala khud approver ho tab bhi. Ye patti batata hai kitne batch
// approval me / draft / reject hain; kholo to party-wise asar, lines aur
// Approve / Reject (engine: PATCH /approvals/:id/action — jiski baari, wahi).
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import PickSelect from "../../components/PickSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const inr = (n) => (Number(n) < 0 ? "-₹" : "₹") + Math.abs(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN");
const dmy = (s) => { const d = String(s || "").slice(0, 10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0].slice(2)}` : ""; };
const balTxt = (v) => (v == null ? "—" : Number(v) === 0 ? "₹0" : `${inr(Math.abs(v))} ${v > 0 ? t("stmt.bal_receive") : t("stmt.bal_pay")}`);
const ST = () => ({
  pending: [T.pur, T.purL, t("stb.st_pending")], draft: [T.slt, T.sltL, t("stb.st_draft")],
  rejected: [T.red, T.redL, t("stb.st_rejected")], approved: [T.grn, T.grnL, t("stb.st_approved")], failed: [T.red, T.redL, t("stb.st_failed")],
  undone: [T.slt, T.sltL, t("stb.st_undone")],
});

// Passbook vs Kitaab (23 Oct 2026) — statement milaate waqt passbook ka aakhri
// balance yaad rehta hai; yahan kitaab ka USI din ka balance ABHI dikhta hai.
// Farak ≠ 0 = kahin koi payment chhooti / dohri hai — bharose ki pakki jaanch.
function BalanceMarks({ accountIds, accounts }) {
  const [marks, setMarks] = useState([]);
  const key = (accountIds || []).slice(0, 8).join(",");
  useEffect(() => {
    if (!key) { setMarks([]); return; }
    let alive = true;
    Promise.all(key.split(",").map((id) => api.get(`/finance/accounts/${id}/statement/balance-mark`)
      .then((r) => (r && r.success && r.data ? { ...r.data, account_id: Number(id) } : null)).catch(() => null)))
      .then((xs) => { if (alive) setMarks(xs.filter(Boolean)); });
    return () => { alive = false; };
  }, [key]);
  if (!marks.length) return null;
  const nm = (id) => ((accounts || []).find((a) => Number(a.id) === id) || {}).name || "#" + id;
  return (
    <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      {marks.map((m) => {
        const bad = m.difference != null && Math.abs(m.difference) >= 1;
        return (
          <div key={m.account_id} title={t("stb.bm_tip")} style={{ padding: "8px 13px", borderRadius: 8, fontSize: 12.5, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
            background: bad ? T.redL : T.grnL, border: `1px solid ${bad ? T.red : T.grn}44`, color: T.t2 }}>
            <b style={{ color: T.t1 }}>{nm(m.account_id)}</b>
            <span>{t("stb.bm_on", { date: dmy(m.as_on) })}</span>
            <span>{t("stb.bm_passbook")}: <b>{inr(m.statement_balance)}</b></span>
            <span>{t("stb.bm_book")}: <b>{m.book_now == null ? "—" : inr(m.book_now)}</b></span>
            <b style={{ color: bad ? T.red : T.grn, marginLeft: "auto" }}>{bad ? t("stb.bm_diff", { amt: inr(m.difference) }) : t("stb.bm_ok")}</b>
          </div>
        );
      })}
    </div>
  );
}

// Keyboard (23 Oct 2026): khidki ke andar hi Tab ghoome — aakhri se pehle par,
// Shift+Tab pehle se aakhri par. PickField ka khula panel Tab khud sambhalta hai.
function trapTab(e, root) {
  if (e.key !== "Tab" || e.defaultPrevented || !root) return;
  const f = [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
}

// Button kaam ke waqt disabled hota hai to focus chupchaap <body> par gir jaata
// hai — tab khidki ka onKeyDown kuch nahi sunta. Us haalat me bhi Esc = band,
// Tab = wapas khidki me.
function useStrayKeys(dlgRef, onEsc) {
  const escRef = useRef(onEsc);
  escRef.current = onEsc;
  useEffect(() => {
    const h = (e) => {
      if (e.defaultPrevented || document.activeElement !== document.body || !dlgRef.current) return;
      if (e.key === "Escape") { e.preventDefault(); escRef.current(); }
      else if (e.key === "Tab") { e.preventDefault(); dlgRef.current.focus(); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [dlgRef]);
}

export default function StmtBatchPanel({ onChanged, accountIds, accounts }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);       // batch id
  const load = useCallback(() => {
    api.get("/finance/statement/batches?status=all").then((r) => { if (r && r.success) setList(r.data || []); }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  // Koi batch na ho to bhi chhota button — "Statement approval (0)" (16 Oct 2026)
  if (!list.length && !open) {
    return (
      <>
      <BalanceMarks accountIds={accountIds} accounts={accounts} />
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
        <span title={t("stb.none_tip")} style={{ fontSize: 11.5, fontWeight: 600, color: T.t3, padding: "4px 10px", borderRadius: 14, border: `1px solid ${T.b1}`, background: T.surface }}>
          {t("stb.btn_count", { n: 0 })}
        </span>
      </div>
      </>
    );
  }
  // Approve ke baad bhi jo line nahi bani (dohri ka shaq) — faisla hone tak khula
  const isOpen = (b) => ["draft", "pending", "rejected"].includes(b.status) || Number(b.pending_changes) > 0 || Number(b.skipped_open) > 0;
  const skipN = list.reduce((a, b) => a + (Number(b.skipped_open) || 0), 0);
  const openList = list.filter(isOpen), oldList = list.filter((b) => !isOpen(b));
  const n = (s) => list.filter((b) => b.status === s).length;
  const nChg = list.filter((b) => Number(b.pending_changes) > 0).length;
  const st = ST();
  return (
    <>
      <BalanceMarks accountIds={accountIds} accounts={accounts} />
      {skipN > 0 && (
        <div style={{ marginBottom: 10, padding: "9px 13px", borderRadius: 8, background: T.redL, border: `1px solid ${T.red}55`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontSize: 12.5, color: T.red }}>{t("stb.skip_banner", { n: skipN })}</b>
          <span style={{ fontSize: 12, color: T.t2, flex: 1, minWidth: 200 }}>{t("stb.skip_banner_sub")}</span>
          {list.filter((b) => Number(b.skipped_open) > 0).slice(0, 6).map((b) => (
            <button key={b.id} onClick={() => setOpen(b.id)} style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.red}`, background: T.surface, color: T.red }}>
              #{b.id} · {t("stb.skip_n", { n: b.skipped_open })}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 10, padding: "9px 13px", borderRadius: 8, background: T.purL, border: `1px solid ${T.pur}44`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 12.5, color: T.pur }}>{t("stb.btn_count", { n: n("pending") + nChg })}</b>
        {["pending", "draft", "rejected"].filter((s) => n(s)).map((s) => (
          <span key={s} style={{ fontSize: 11.5, fontWeight: 700, color: st[s][0], background: T.surface, border: `1px solid ${st[s][0]}55`, padding: "2px 9px", borderRadius: 12 }}>{n(s)} {st[s][2]}</span>
        ))}
        {nChg > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: T.amb, background: T.surface, border: `1px solid ${T.amb}55`, padding: "2px 9px", borderRadius: 12 }}>{t("stb.n_change_pending", { n: nChg })}</span>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
          {oldList.length > 0 && (
            <PickSelect value="" onChange={(e) => e.target.value && setOpen(Number(e.target.value))} style={{ fontSize: 11.5, padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.b2}`, background: T.surface, minWidth: 170 }}>
              <option value="">{t("stb.old_batches", { n: oldList.length })}</option>
              {oldList.map((b) => <option key={b.id} value={String(b.id)}>#{b.id} · {b.account_name} · {(st[b.status] || [0, 0, b.status])[2]}</option>)}
            </PickSelect>
          )}
          {openList.slice(0, 6).map((b) => (
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
  // Approve hue batch me badlaav: { [txnId]: { action: 'party'|'remove', party_id } }
  const [edits, setEdits] = useState({});
  const [cnote, setCnote] = useState("");
  const [parties, setParties] = useState([]);
  // Chhooti line: chuni hui idx + wajah
  const [skSel, setSkSel] = useState({});
  const [skNote, setSkNote] = useState("");
  // Keyboard: khulte hi focus khidki me, Esc = band, Tab andar hi; band par focus wapas
  const dlgRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    if (dlgRef.current) dlgRef.current.focus();
    return () => { if (prev && prev.focus && document.contains(prev)) prev.focus(); };
  }, []);
  useStrayKeys(dlgRef, () => onClose(changed));
  const skipDo = (action) => {
    const idx = Object.keys(skSel).filter((k) => skSel[k]).map(Number);
    if (!idx.length) { setErr(t("stb.skip_pick")); return; }
    if (skNote.trim().length < 3) { setErr(t("stmt.batch_note_req")); return; }
    act(() => api.post(`/finance/statement/batches/${id}/skipped`, { action, idx, note: skNote })).then(() => { setSkSel({}); setSkNote(""); }).catch(() => {});
  };
  useEffect(() => { api.get("/finance/parties").then((r) => { if (r && r.success) setParties(r.data || []); }).catch(() => {}); }, []);
  const setEdit = (id, v) => setEdits((p) => { const n = { ...p }; if (!v) delete n[id]; else n[id] = v; return n; });
  const sendChange = (kind) => {
    if (cnote.trim().length < 3) { setErr(t("stmt.batch_note_req")); return; }
    if (kind === "undo" && !window.confirm(t("stb.undo_confirm"))) return;
    const changes = Object.entries(edits).map(([id, v]) => ({ txn_id: Number(id), action: v.action, party_id: v.party_id || null }));
    if (kind === "change" && changes.some((c) => c.action === "party" && !c.party_id)) { setErr(t("stb.pick_party")); return; }
    act(() => api.post(`/finance/statement/batches/${id}/changes`, { kind, changes, note: cnote })).then(() => { setEdits({}); setCnote(""); }).catch(() => {});
  };
  const decideChange = (c, action) => {
    let remarks = "";
    if (action === "reject") { remarks = (window.prompt(t("stb.reject_why")) || "").trim(); if (remarks.length < 3) return; }
    act(() => api.patch(`/approvals/${c.approval_request_id}/action`, { action, remarks })).catch(() => {});
  };
  const load = useCallback(() => {
    api.get(`/finance/statement/batches/${id}`).then((r) => {
      if (r && r.success) { setB(r.data); setNote(r.data.batch_note || ""); } else setErr((r && r.message) || t("stb.load_fail"));
    }).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => { setBusy(true); setErr(""); let okk = false; try { const r = await fn(); if (!r || r.success === false) throw new Error((r && r.message) || t("stb.fail")); setChanged(true); okk = true; load(); } catch (e) { setErr(e.message); } setBusy(false); if (!okk) throw new Error("x"); };
  const approve = () => act(() => api.patch(`/approvals/${b.approval_request_id}/action`, { action: "approve", remarks: "" })).catch(() => {});
  const reject = () => { const why = (window.prompt(t("stb.reject_why")) || "").trim(); if (why.length < 3) return; act(() => api.patch(`/approvals/${b.approval_request_id}/action`, { action: "reject", remarks: why })).catch(() => {}); };
  const submit = () => act(() => api.put(`/finance/statement/batches/${id}`, { batch_note: note, submit: true })).catch(() => {});
  const drop = () => { if (!window.confirm(t("stb.cancel_confirm"))) return; act(() => api.del ? api.del(`/finance/statement/batches/${id}`) : api(`/finance/statement/batches/${id}`, { method: "DELETE" })).catch(() => {}); };

  const st = ST();
  const th = { fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", padding: "6px 10px", textAlign: "left", background: T.surfaceB };
  const td = { fontSize: 12.5, color: T.t2, padding: "6px 10px", borderTop: `1px solid ${T.b1}` };
  const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const btn = (c, fill) => ({ fontSize: 12.5, fontWeight: 700, padding: "7px 16px", borderRadius: 7, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", border: `1px solid ${c}`, background: fill ? c : T.surface, color: fill ? "#fff" : c });
  const res = b && b.results && b.results.summary ? b.results.summary : null;

  return (
    <div onClick={() => onClose(changed)} style={{ position: "fixed", inset: 0, zIndex: 420, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div ref={dlgRef} role="dialog" aria-modal="true" aria-label={t("stb.batch_n", { id })} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); onClose(changed); return; }
          trapTab(e, dlgRef.current);
        }}
        style={{ background: T.surface, borderRadius: 12, width: "min(920px,100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)", outline: "none" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stb.batch_n", { id })}{b ? " · " + b.account_name : ""}</div>
            {b && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{t("stb.by_on", { name: b.created_by_name || "—", date: dmy(b.created_at) })} · {b.line_count} {t("stb.lines")}</div>}
          </div>
          {b && st[b.status] && <span style={{ fontSize: 11.5, fontWeight: 700, color: st[b.status][0], background: st[b.status][1], padding: "3px 10px", borderRadius: 12 }}>{st[b.status][2]}</span>}
          <button onClick={() => onClose(changed)} aria-label={t("stb.close")} title={t("stb.close")} style={{ border: "none", background: "none", fontSize: 20, color: T.t4, cursor: "pointer" }}>×</button>
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
                      {e.project_id && <span style={{ color: T.blu, fontSize: 11.5, whiteSpace: "nowrap" }}>{(b.project_names && b.project_names[e.project_id]) || "#" + e.project_id}</span>}
                      <b style={{ color: e.dir === "in" ? T.grn : T.red }}>{e.dir === "in" ? "+" : "−"}{inr(e.amount)}</b>
                    </div>
                  ))}
                </div>
              </details>
              {b.status === "approved" && b.results && Array.isArray(b.results.results) && (() => {
                // Approve par jo line nahi bani — har ek dikhe, kabhi chupchaap nahi (23 Oct 2026)
                const sk = b.results.results.map((x, i) => ({ ...x, idx: i, e: b.entries[i] || {} }))
                  .filter((x) => x.outcome === "duplicate_suspect" || x.outcome === "invalid");
                if (!sk.length) return null;
                const openN = sk.filter((x) => !x.followup).length;
                return (
                  <div style={{ marginBottom: 12, border: `1px solid ${openN ? T.red : T.b1}`, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ padding: "8px 10px", background: openN ? T.redL : T.surfaceB, fontSize: 12, fontWeight: 700, color: openN ? T.red : T.t1 }}>
                      {openN > 1 && (() => {
                        const all = sk.filter((x) => !x.followup).every((x) => skSel[x.idx]);
                        return (
                          <button type="button" onClick={() => setSkSel(all ? {} : Object.fromEntries(sk.filter((x) => !x.followup).map((x) => [x.idx, true])))}
                            style={{ float: "right", fontSize: 11.5, fontWeight: 700, padding: "2px 9px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.red}`, background: T.surface, color: T.red }}>
                            {all ? t("stb.skip_none_btn") : t("stb.skip_all_btn")}
                          </button>
                        );
                      })()}
                      {t("stb.skip_title", { n: sk.length, o: openN })}
                      <div style={{ fontSize: 11.5, fontWeight: 400, color: T.t2, marginTop: 2 }}>{t("stb.skip_help")}</div>
                    </div>
                    {sk.map((x) => {
                      const fu = x.followup;
                      return (
                        <label key={x.idx} style={{ padding: "6px 10px", borderTop: `1px solid ${T.b1}`, display: "grid", gridTemplateColumns: "22px 70px minmax(0,1fr) 110px", gap: 8, alignItems: "center", fontSize: 12, cursor: fu ? "default" : "pointer", opacity: fu ? 0.6 : 1 }}>
                          {fu ? <span /> : <input type="checkbox" checked={!!skSel[x.idx]} onChange={(ev) => setSkSel((s) => ({ ...s, [x.idx]: ev.target.checked }))} />}
                          <span style={{ color: T.t3 }}>{dmy(x.e.date)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.t1 }} title={x.e.description || ""}>{x.e.description || "—"}</span>
                            <span style={{ color: T.t3 }}>
                              {x.outcome === "invalid" ? t("stb.skip_invalid")
                                : t("stb.skip_dup", { id: x.txn_id, desc: x.existing_description || "—" }) + (x.other_account ? " · " + x.other_account : "")}
                              {fu ? " · " + (fu.kind === "resend" ? t("stb.skip_resent", { id: fu.batch_id }) : t("stb.skip_acked")) + ` — “${fu.note}” (${fu.by_name || "—"})` : ""}
                            </span>
                          </span>
                          <b style={{ textAlign: "right", color: x.e.dir === "in" ? T.grn : T.red }}>{x.e.dir === "in" ? "+" : "−"}{inr(x.e.amount)}</b>
                        </label>
                      );
                    })}
                    {openN > 0 && (
                      <div style={{ padding: "9px 10px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input value={skNote} onChange={(ev) => setSkNote(ev.target.value)} maxLength={500} placeholder={t("stb.skip_note_ph")} aria-label={t("stb.skip_note_ph")}
                          style={{ flex: "1 1 240px", fontSize: 12.5, padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${skNote.trim().length >= 3 ? T.grnM : T.ambM}`, fontFamily: "inherit" }} />
                        <button disabled={busy} onClick={() => skipDo("ack")} style={btn(T.slt, false)}>{t("stb.skip_ack")}</button>
                        <button disabled={busy} onClick={() => skipDo("resend")} style={btn(T.blu, true)}>{t("stb.skip_resend")}</button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {b.status === "approved" && Array.isArray(b.created) && b.created.length > 0 && (() => {
                const pend = (b.changes || []).some((c) => c.status === "pending");
                const live = b.created.filter((x) => Number(x.is_active) !== 0);
                // Party pehle, phir Staff (16 Oct 2026: staff chhupe the — Priya jaise naam nahi milte the).
                // Ek jaisa naam do baar ho to aage phone / #id — galat party na chun lo.
                const nm = (p) => String(p.name || "").trim().toLowerCase();
                const dup = (p) => parties.filter((q) => nm(q) === nm(p)).length > 1;
                const po = (p) => ({ key: p.id, label: p.name, group: p.is_staff ? t("stmt.grp_staff") : t("stmt.grp_parties"),
                  sub: dup(p) ? (p.phone || "#" + p.id) : null, search: p.phone || "" });
                const pOpts = [...parties.filter((p) => !p.is_staff).map(po), ...parties.filter((p) => p.is_staff).map(po)];
                return (
                  <div style={{ marginBottom: 12, border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ padding: "8px 10px", background: T.surfaceB, fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("stb.made_entries", { n: live.length })}</div>
                    {b.created.map((x) => {
                      const gone = Number(x.is_active) === 0, e = edits[x.id];
                      const canParty = ["payment", "receipt"].includes(x.type) && !x.paid_via_staff_id;
                      return (
                        <div key={x.id} style={{ padding: "6px 10px", borderTop: `1px solid ${T.b1}`, display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 110px 260px", gap: 8, alignItems: "center", fontSize: 12, opacity: gone ? 0.45 : 1 }}>
                          <span style={{ color: T.t3 }}>{dmy(x.date)}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={x.description || ""}>
                            <b style={{ color: T.t1 }}>{x.party || (x.type === "bank_transfer" ? t("stmt.sub_transfer") : t("stmt.pv_noparty"))}</b> <span style={{ color: T.t4 }}>#{x.id} · {x.description || ""}</span>
                          </span>
                          <b style={{ textAlign: "right", color: T.t1 }}>{inr(x.amount)}</b>
                          {gone ? <span style={{ color: T.t4 }}>{t("stb.gone")}</span> : pend ? <span /> : (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <PickSelect value={e ? e.action : ""} onChange={(ev) => setEdit(x.id, ev.target.value ? { action: ev.target.value, party_id: null } : null)}
                                style={{ fontSize: 11.5, padding: "4px 6px", borderRadius: 6, border: `1px solid ${e ? T.amb : T.b2}`, background: T.surface, width: 105 }}>
                                <option value="">{t("stb.no_change")}</option>
                                {canParty && <option value="party">{t("stb.act_party")}</option>}
                                <option value="remove">{t("stb.act_remove")}</option>
                              </PickSelect>
                              {e && e.action === "party" && (
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <SearchSelect value={e.party_id || ""} options={pOpts} placeholder={t("stb.pick_party")} onChange={(k) => setEdit(x.id, { action: "party", party_id: Number(k) || null })} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!pend && live.length > 0 && (
                      <div style={{ padding: "9px 10px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input value={cnote} onChange={(ev) => setCnote(ev.target.value)} maxLength={500} placeholder={t("stb.change_note_ph")}
                          style={{ flex: "1 1 240px", fontSize: 12.5, padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${cnote.trim().length >= 3 ? T.grnM : T.ambM}`, fontFamily: "inherit" }} />
                        <button disabled={busy} onClick={() => sendChange("undo")} style={btn(T.red, false)}>{t("stb.undo_all")}</button>
                        <button disabled={busy || !Object.keys(edits).length} onClick={() => sendChange("change")} style={{ ...btn(T.amb, true), opacity: Object.keys(edits).length ? 1 : 0.5 }}>{t("stb.send_change", { n: Object.keys(edits).length })}</button>
                      </div>
                    )}
                    {pend && <div style={{ padding: "8px 10px", borderTop: `1px solid ${T.b1}`, fontSize: 12, color: T.amb, background: T.ambL }}>{t("stb.change_wait")}</div>}
                  </div>
                );
              })()}
              {Array.isArray(b.changes) && b.changes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", marginBottom: 5 }}>{t("stb.change_log")}</div>
                  {b.changes.map((c) => (
                    <div key={c.id} style={{ padding: "8px 10px", marginBottom: 6, borderRadius: 7, border: `1px solid ${T.b1}`, fontSize: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {st[c.status] && <span style={{ fontSize: 11, fontWeight: 700, color: st[c.status][0], background: st[c.status][1], padding: "2px 8px", borderRadius: 10 }}>{st[c.status][2]}</span>}
                      <b style={{ color: T.t1 }}>{c.kind === "undo" ? t("stb.undo_all") : t("stb.n_changes", { n: (c.changes || []).length })}</b>
                      <span style={{ color: T.t2, flex: 1, minWidth: 160 }}>“{c.note}” · {c.created_by_name || "—"}{c.decision_note ? " · " + t("stb.rejected_why", { name: c.decided_by_name || "—", why: c.decision_note }) : ""}</span>
                      {c.status === "pending" && c.approval_request_id && (
                        <>
                          <button disabled={busy} onClick={() => decideChange(c, "reject")} style={btn(T.red, false)}>{t("stb.reject")}</button>
                          <button disabled={busy} onClick={() => decideChange(c, "approve")} style={btn(T.grn, true)}>{t("stb.approve_change")}</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
