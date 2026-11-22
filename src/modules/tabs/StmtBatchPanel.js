// ════════════════════════════════════════════════════════════════
// StmtBatchPanel — Khaata Ledger me "Bank milaan" table + batch ki khidki
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

// ── Bank milaan (22 Nov 2026) ──────────────────────────────────────────
// Khaata Ledger par statement ka saara kaam EK table me — pehle chaar alag
// patti thi (har khaate ka passbook-farak, laal "line nahi bani", baingani
// "Statement approval", aur "Statement milao" button Accounts ke kone me).
// Har khaate ki ek line: aakhri statement kab tak · Passbook vs Kitaab ·
// kya kaam baaki (dabao to wahi batch khule) · "Statement milao".
// "Itihaas" me saare batch (pehle ek dropdown me the).
export default function StmtBatchPanel({ onChanged, accounts, onImport }) {
  const [list, setList] = useState([]);
  const [marks, setMarks] = useState([]);
  const [open, setOpen] = useState(null);       // batch id
  const [hist, setHist] = useState(false);
  const [all, setAll] = useState(false);
  const load = useCallback(() => {
    api.get("/finance/statement/batches?status=all").then((r) => { if (r && r.success) setList(r.data || []); }).catch(() => {});
    api.get("/finance/statement/balance-marks").then((r) => { if (r && r.success) setMarks(r.data || []); }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  const st = ST();
  const mk = new Map(marks.map((m) => [Number(m.account_id), m]));
  const of = (id) => list.filter((b) => Number(b.account_id) === Number(id));
  // Statement bank ka hota hai — cash khaata tabhi jab uspar pehle kuch hua ho
  const rows = (accounts || []).filter((a) => a.type !== "cash" || mk.has(Number(a.id)) || of(a.id).length)
    .map((a) => {
      const bs = of(a.id);
      const work = [
        ["pending", bs.filter((b) => b.status === "pending"), T.pur, T.purL],
        ["skip", bs.filter((b) => Number(b.skipped_open) > 0), T.red, T.redL],
        ["change", bs.filter((b) => Number(b.pending_changes) > 0), T.amb, T.ambL],
        ["rejected", bs.filter((b) => b.status === "rejected"), T.red, T.redL],
        ["draft", bs.filter((b) => b.status === "draft"), T.slt, T.sltL],
      ].filter((w) => w[1].length);
      return { a, m: mk.get(Number(a.id)) || null, work, busy: work.length > 0 };
    })
    .sort((x, y) => (y.busy - x.busy) || (!!y.m - !!x.m));
  const shown = all ? rows : rows.slice(0, 6);
  const wLabel = (k, bs) => (k === "skip" ? t("bm.w_skip", { n: bs.reduce((s, b) => s + (Number(b.skipped_open) || 0), 0) }) : t("bm.w_" + k, { n: bs.length }));
  const cell = { padding: "9px 13px", borderTop: `1px solid ${T.b1}`, fontSize: 12.5, color: T.t2, verticalAlign: "middle" };
  const th = { padding: "7px 13px", fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px", textAlign: "left", background: T.surfaceB };
  if (!rows.length) return null;
  return (
    <>
      <div style={{ marginBottom: 10, border: `1px solid ${T.b1}`, borderRadius: 10, background: T.surface, overflow: "hidden" }}>
        <div style={{ padding: "10px 13px", display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ fontSize: 13.5, color: T.t1 }}>{t("bm.title")}</b>
          <span style={{ fontSize: 11.5, color: T.t3, flex: 1, minWidth: 0 }}>{t("bm.sub")}</span>
          {list.length > 0 && (
            <button onClick={() => setHist((v) => !v)} aria-expanded={hist}
              style={{ border: "none", background: "none", color: T.blu, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {hist ? t("bm.hist_hide") : t("bm.hist", { n: list.length })}
            </button>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead><tr>
              <th style={th}>{t("bm.c_acc")}</th><th style={th}>{t("bm.c_bal")}</th><th style={th}>{t("bm.c_work")}</th><th style={{ ...th, width: 1 }} />
            </tr></thead>
            <tbody>
              {shown.map(({ a, m, work }) => {
                const bad = m && m.difference != null && Math.abs(m.difference) >= 1;
                return (
                  <tr key={a.id}>
                    <td style={cell}>
                      <b style={{ color: T.t1 }}>{a.name}</b>
                      <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{m ? t("bm.till", { date: dmy(m.as_on) }) : t("bm.never")}</div>
                    </td>
                    <td style={cell}>
                      {m ? (
                        <>
                          <div>{t("stb.bm_passbook")} <b>{inr(m.statement_balance)}</b> <span style={{ color: T.t4 }}>· {t("stb.bm_book")} {m.book_now == null ? "—" : inr(m.book_now)}</span></div>
                          <div title={t("stb.bm_tip")} style={{ fontSize: 12, fontWeight: 700, marginTop: 1, color: bad ? T.red : T.grn }}>
                            {bad ? t("bm.diff", { amt: inr(Math.abs(m.difference)) }) : t("stb.bm_ok")}
                          </div>
                        </>
                      ) : <span style={{ color: T.t4 }}>—</span>}
                    </td>
                    <td style={cell}>
                      {work.length ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {work.map(([k, bs, c, bg]) => (
                            <button key={k} onClick={() => setOpen(bs[0].id)} title={bs.map((b) => "#" + b.id).join(", ")}
                              style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${c}55`, background: bg, color: c, whiteSpace: "nowrap" }}>
                              {wLabel(k, bs)}
                            </button>
                          ))}
                        </div>
                      ) : <span style={{ color: T.t4 }}>{t("bm.no_work")}</span>}
                    </td>
                    <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>
                      {onImport && (
                        <button onClick={() => onImport(a.id)}
                          style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.blu}`, background: T.surface, color: T.blu }}>
                          {t("stmt.button")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 6 && (
          <button onClick={() => setAll((v) => !v)} style={{ width: "100%", padding: "7px 13px", border: "none", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, color: T.blu, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {all ? t("bm.less") : t("bm.more", { n: rows.length - 6 })}
          </button>
        )}
        {hist && (
          <div style={{ borderTop: `1px solid ${T.b1}`, maxHeight: 260, overflowY: "auto" }}>
            {list.map((b) => (
              <button key={b.id} onClick={() => setOpen(b.id)}
                style={{ width: "100%", display: "flex", gap: 10, alignItems: "center", padding: "7px 13px", border: "none", borderBottom: `1px solid ${T.b1}`, background: T.surface, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: T.t2, textAlign: "left" }}>
                <b style={{ color: T.t1, width: 44 }}>#{b.id}</b>
                <span style={{ width: 62, color: T.t3 }}>{dmy(b.created_at)}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.account_name} · {b.line_count} {t("stb.lines")}{b.batch_note ? ` · “${b.batch_note}”` : ""}</span>
                <span style={{ color: T.t3, whiteSpace: "nowrap" }}>{inr(Number(b.total_in) + Number(b.total_out))}</span>
                {st[b.status] && <span style={{ fontSize: 11, fontWeight: 700, color: st[b.status][0], background: st[b.status][1], padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>{st[b.status][2]}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && <BatchModal id={open} onClose={(changed) => { setOpen(null); load(); if (changed && onChanged) onChanged(); }} />}
    </>
  );
}

export function BatchModal({ id, onClose }) {
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [changed, setChanged] = useState(false);
  // Approve hue batch me badlaav: { [txnId]: { action: 'party'|'remove', party_id } }
  const [edits, setEdits] = useState({});
  const [cnote, setCnote] = useState("");
  const [parties, setParties] = useState([]);
  // Khidki ke tab (22 Nov 2026): sum Saransh · lines Line · skip Nahi bani · change Badlaav.
  // null = abhi tay nahi — batch aate hi wahi tab jahan kaam baaki hai.
  const [tab, setTab] = useState(null);
  // Approval me ho to kiski baari: { mine } ya { name, more }
  const [turn, setTurn] = useState(null);
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

  const skAll = b && b.status === "approved" && b.results && Array.isArray(b.results.results)
    ? b.results.results.filter((x) => x.outcome === "duplicate_suspect" || x.outcome === "invalid") : [];
  const skOpen = skAll.filter((x) => !x.followup).length;
  const chgPend = b ? (b.changes || []).filter((c) => c.status === "pending").length : 0;
  const hasChange = !!b && ((b.status === "approved" && (b.created || []).length > 0) || (b.changes || []).length > 0);
  const bStatus = b ? b.status : null;
  const bReq = b ? b.approval_request_id : null;
  // Pehli baar: jahan kaam baaki hai wahi tab
  useEffect(() => {
    if (!b || tab) return;
    setTab(skOpen ? "skip" : chgPend ? "change" : "sum");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b]);
  // Approval me: meri baari hai ya kiski — approvals ki apni list se
  useEffect(() => {
    if (bStatus !== "pending" || !bReq) { setTurn(null); return undefined; }
    let dead = false;
    const find = (x) => ((x && x.success && Array.isArray(x.data)) ? x.data : []).find((it) => Number(it.id) === Number(bReq) || Number(it._request_id) === Number(bReq));
    (async () => {
      try {
        if (find(await api.get("/approvals/pending?scope=my"))) { if (!dead) setTurn({ mine: true }); return; }
        const it = find(await api.get("/approvals/pending?scope=all"));
        if (!dead) setTurn(it ? { name: it._waitingOnName || it._waitingOn || it.pending_role || "", more: Number(it._waitingOnMore) || 0 } : null);
      } catch (_) { if (!dead) setTurn(null); }
    })();
    return () => { dead = true; };
  }, [bStatus, bReq]);

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
              {/* Sthiti: Bana → Approval me → faisla. Ek nazar me batch kahan hai aur ab kya karna hai. */}
              {(() => {
                const fin = ["approved", "rejected", "failed", "undone"].includes(b.status);
                const steps = [
                  [t("bk.s_made"), `${b.created_by_name || "—"} · ${dmy(b.created_at)}`, true, T.blu],
                  [t("bk.s_appr"), b.submitted_at ? dmy(b.submitted_at) : (b.status === "draft" ? t("bk.s_not_sent") : ""), b.status !== "draft", b.status === "pending" ? T.pur : T.blu],
                  [fin ? st[b.status][2] : t("bk.s_final"), fin ? `${b.decided_by_name || ""}${b.decided_at ? " · " + dmy(b.decided_at) : ""}` : "", fin, fin ? st[b.status][0] : T.t4],
                ];
                const msg = b.status === "draft" ? [t("bk.m_draft"), T.t2]
                  : b.status === "pending" ? [turn ? (turn.mine ? t("bm.turn_mine") : t("bm.turn_other", { name: turn.name + (turn.more ? " +" + turn.more : "") })) : t("stb.pending_help"), turn && turn.mine ? T.grn : T.t2]
                  : b.status === "rejected" ? [t("stb.rejected_why", { name: b.decided_by_name || "—", why: b.decision_note || "—" }), T.red]
                  : b.status === "approved" && res ? [t("stb.approved_res", { c: res.created, d: res.duplicate_suspect, a: res.already_imported }), T.grn]
                  : b.status === "failed" ? [(b.results && b.results.error) || t("stb.fail"), T.red] : null;
                return (
                  <div style={{ marginBottom: 12, padding: "11px 13px", borderRadius: 8, border: `1px solid ${T.b1}`, background: T.surfaceB }}>
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      {steps.map(([label, sub, on, c], i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <div style={{ flex: 1, height: 2, margin: "9px 8px 0", background: on ? c : T.b2, borderRadius: 1 }} />}
                          <div style={{ display: "flex", gap: 7, alignItems: "flex-start", minWidth: 0 }}>
                            <span style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                              background: on ? c : T.surface, color: on ? "#fff" : T.t4, border: `1.5px solid ${on ? c : T.b2}` }}>{i + 1}</span>
                            <span style={{ minWidth: 0 }}>
                              <b style={{ display: "block", fontSize: 12.5, color: on ? T.t1 : T.t4 }}>{label}</b>
                              {sub ? <span style={{ fontSize: 11, color: T.t3 }}>{sub}</span> : null}
                            </span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                    {msg && (
                      <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 600, color: msg[1] }}>
                        {msg[0]}
                        {skOpen > 0 && <button onClick={() => setTab("skip")} style={{ marginLeft: 8, border: "none", background: "none", padding: 0, color: T.red, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>{t("bk.m_skip", { n: skOpen })}</button>}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div role="tablist" style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
                {[["sum", t("bk.t_sum"), 0, T.t1], ["lines", t("bk.t_lines", { n: b.entries.length }), 0, T.t1],
                  ...(skAll.length ? [["skip", t("bk.t_skip", { n: skAll.length }), skOpen, T.red]] : []),
                  ...(hasChange ? [["change", t("bk.t_change"), chgPend, T.amb]] : [])].map(([k, label, dot, c]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    style={{ fontSize: 12.5, fontWeight: tab === k ? 700 : 500, padding: "8px 13px", marginBottom: -1, cursor: "pointer", fontFamily: "inherit", border: "none",
                      borderBottom: `2px solid ${tab === k ? T.blu : "transparent"}`, background: "none", color: tab === k ? T.t1 : T.t3, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {label}
                    {dot > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, background: c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{dot}</span>}
                  </button>
                ))}
              </div>
              {tab === "sum" && (<>
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
                      <td style={{ ...td, fontWeight: 600, color: x.kind === "n" ? T.amb : T.t1 }}>{x.kind === "n" ? t("stmt.pv_noparty") : x.name}{x.kind === "a" ? <span style={{ color: T.t4, fontWeight: 400 }}> · {t("stmt.sub_transfer")}</span> : x.kind === "x" ? <span style={{ color: T.t4, fontWeight: 400 }}> · {t("stmt.exp_sub")}</span> : null}</td>
                      <td style={num}>{x.n}</td>
                      <td style={{ ...num, color: x.in ? T.grn : T.t4 }}>{x.in ? inr(x.in) : "—"}</td>
                      <td style={{ ...num, color: x.out ? T.red : T.t4 }}>{x.out ? inr(x.out) : "—"}</td>
                      <td style={{ ...num, color: T.t3 }}>{x.kind === "p" ? balTxt(x.old_balance) : "—"}</td>
                      <td style={{ ...num, fontWeight: 700 }}>{x.kind === "p" && b.status !== "approved" ? balTxt(x.new_balance) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {b.batch_note && b.status !== "draft" && b.status !== "rejected" && <div style={{ fontSize: 12.5, color: T.t2 }}><b>{t("stb.note")}:</b> {b.batch_note}</div>}
              </>)}
              {tab === "lines" && (
                <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
                  {b.entries.map((e, i) => {
                    // Approve ke baad har line ka nateeja saamne
                    const o = b.results && Array.isArray(b.results.results) ? b.results.results[i] : null;
                    const oc = !o ? null : o.outcome === "created" ? [T.grn, T.grnL, t("bk.o_made", { id: o.txn_id })]
                      : o.outcome === "already_imported" ? [T.slt, T.sltL, t("bk.o_already")]
                      : [T.red, T.redL, o.followup ? (o.followup.kind === "resend" ? t("stb.skip_resent", { id: o.followup.batch_id }) : t("stb.skip_acked")) : t("bk.o_not")];
                    return (
                      <div key={i} style={{ padding: "7px 10px", borderTop: i ? `1px solid ${T.b1}` : "none", display: "flex", gap: 10, fontSize: 12, alignItems: "baseline" }}>
                        <span style={{ width: 62, color: T.t3, flexShrink: 0 }}>{dmy(e.date)}</span>
                        <span style={{ flex: 1, minWidth: 0, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.description || ""}>{e.description || "—"}{e.note ? ` · “${e.note}”` : ""}</span>
                        {e.project_id && <span style={{ color: T.blu, fontSize: 11.5, whiteSpace: "nowrap" }}>{(b.project_names && b.project_names[e.project_id]) || "#" + e.project_id}</span>}
                        {oc && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, color: oc[0], background: oc[1], whiteSpace: "nowrap" }}>{oc[2]}</span>}
                        <b style={{ color: e.dir === "in" ? T.grn : T.red, whiteSpace: "nowrap", width: 96, textAlign: "right" }}>{e.dir === "in" ? "+" : "−"}{inr(e.amount)}</b>
                      </div>
                    );
                  })}
                </div>
              )}
              {tab === "skip" && b.status === "approved" && b.results && Array.isArray(b.results.results) && (() => {
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
              {tab === "change" && b.status === "approved" && Array.isArray(b.created) && b.created.length > 0 && (() => {
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
              {tab === "change" && Array.isArray(b.changes) && b.changes.length > 0 && (
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
            </>
          )}
        </div>
        {b && (
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            {b.status === "pending" && (
              <span style={{ fontSize: 12, fontWeight: 600, color: turn && turn.mine ? T.grn : T.t3, flex: 1 }}>
                {turn ? (turn.mine ? t("bm.turn_mine") : t("bm.turn_other", { name: turn.name + (turn.more ? " +" + turn.more : "") })) : t("stb.pending_help")}
              </span>
            )}
            {(b.status === "draft" || b.status === "rejected") && (
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("stmt.batch_note_ph")} aria-label={t("stmt.batch_note_ph")}
                style={{ flex: 1, minWidth: 160, fontSize: 12.5, padding: "7px 10px", borderRadius: 6, border: `1.5px solid ${note.trim().length >= 3 ? T.grnM : T.ambM}`, fontFamily: "inherit", background: T.surface, color: T.t1 }} />
            )}
            {!["pending", "draft", "rejected"].includes(b.status) && <button onClick={() => onClose(changed)} style={btn(T.t3, false)}>{t("bk.close")}</button>}
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
