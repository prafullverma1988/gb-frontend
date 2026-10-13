// ── WAREHOUSE MATERIAL LEDGER ─────────────────────────────────────
// Godown ka khaata — project ke Material Ledger (MaterialLedgerDrawer) jaisa
// hi dikhne wala: upar abhi ka stock, Aaya / Gaya / Stock, neeche har entry
// chalte balance ke saath. Har line batati hai KAUN: kisne diya (vendor +
// challan), godown me kisne liya; kaun le gaya, kisne issue kiya, site par
// pahucha ki nahi.
//
// Data: GET /warehouse/material-ledger?name= (ek material) — api.js chuna hua
// godown khud jod deta hai. 13 Oct 2026 se alag "Ledger" tab nahi — ye khaata
// Stock tab → material drawer → "Movement History" me hai (MaterialLedgerHistory).
//
// Zyadatar purana stock kisi entry se nahi aaya (seed / haath se qty) — server
// use `opening` deta hai; wo "Pehle ka stock" ki pehli line banta hai, taaki
// chalta balance hamesha asli stock par khatam ho.

import { useState, useEffect, useMemo, useRef } from "react";
import api from "../config/api";
import { t } from "../i18n";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF",
  grn: "#059669", grnL: "#ECFDF5",
  red: "#DC2626", redL: "#FEF2F2",
  amb: "#D97706", ambL: "#FFFBEB",
  pur: "#7C3AED", purL: "#F5F3FF",
  cyn: "#0891B2", cynL: "#E0F2FE",
};
const GRID = "58px 1fr 52px 52px 62px";

const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? "—" : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};
const fmtQ = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

// Har tarah ki entry ka rang + naam.
const kindMeta = (k) => ({
  opening:      { c: T.t3,  label: t("warehouse.ledger_k_opening") },
  grn:          { c: T.grn, label: t("warehouse.ledger_k_grn") },
  addstock:     { c: T.grn, label: t("warehouse.ledger_k_addstock") },
  return:       { c: T.cyn, label: t("warehouse.ledger_k_return") },
  transfer_in:  { c: T.pur, label: t("warehouse.ledger_k_tr_in") },
  issue:        { c: T.amb, label: t("warehouse.ledger_k_issue") },
  transfer_out: { c: T.pur, label: t("warehouse.ledger_k_tr_out") },
  // Ginti aur nikasi (3 Oct 2026) — khaata sirf kaam ka (theek) stock ginta hai.
  count:         { c: T.cyn, label: t("warehouse.ledger_k_count") },
  damaged_fixed: { c: T.grn, label: t("warehouse.ledger_k_damaged_fixed") },
  repair_fixed:  { c: T.grn, label: t("warehouse.ledger_k_repair_fixed") },
  // Conversion (11 Oct 2026) — bana (aaya) / ghata (gaya); naam server deta hai ("← TMT se bana (CNV-001)").
  conversion_in:  { c: T.grn, label: t("conversion.ledger_k_in") },
  conversion_out: { c: T.amb, label: t("conversion.ledger_k_out") },
  // Job Work (11 Oct 2026) — vendor ko bheja / wapas aaya (bana ya raw); naam server deta hai ("→ Job Work JW-001 (vendor)").
  jobwork_in:     { c: T.grn, label: t("jobwork.ledger_k_in") },
  jobwork_out:    { c: T.amb, label: t("jobwork.ledger_k_out") },
  before:       { c: T.t3,  label: t("warehouse.ledger_k_before") },
}[k] || { c: T.t3, label: k });

// Ginti ki line ka poora haal: "Kharab 2 · Kabad 1 · Gum 1 · Nasht 0 · Zyada 0".
const countBreakdown = (b) => !b ? "" : [
  t("warehouse.ledger_bd_damaged", { n: fmtQ(b.damaged) }), t("warehouse.ledger_bd_scrap", { n: fmtQ(b.scrap) }),
  t("warehouse.ledger_bd_lost", { n: fmtQ(b.lost) }), t("warehouse.ledger_bd_destroyed", { n: fmtQ(b.destroyed) }),
  t("warehouse.ledger_bd_excess", { n: fmtQ(b.excess) }),
].join(" · ");
// Pehli line — kahan se / kahan ko. Ginti aur nikasi ki koi party nahi, unka naam hi.
const partyLine = (e) => {
  if (e.kind === "count") return t("warehouse.ledger_count_label", { no: e.ref });
  if (e.kind === "damaged_fixed") return t("warehouse.ledger_damaged_fixed_label", { no: e.ref });
  if (e.kind === "repair_fixed") return t("warehouse.ledger_repair_fixed_label", { no: e.ref }) + (e.party ? " · " + e.party : "");
  return e.party || "—";
};

// Entry ki doosri line — "kaun" wali baat.
const whoLine = (e) => {
  const bits = [];
  if (e.kind === "count") {
    bits.push(countBreakdown(e.breakdown));
    if (e.by) bits.push(t("warehouse.ledger_approved_by", { name: e.by }));
    return bits.join(" · ");
  }
  if (e.kind === "damaged_fixed" || e.kind === "repair_fixed") {
    if (e.by) bits.push(t("warehouse.ledger_approved_by", { name: e.by }));
    return bits.join(" · ");
  }
  if (e.challan) bits.push(t("warehouse.ledger_challan", { no: e.challan }));
  if (e.po_no) bits.push(t("warehouse.ledger_po", { no: e.po_no }));
  if (e.kind === "issue") {
    if (e.to) bits.push(t("warehouse.ledger_taken_by", { name: e.to }));
    if (e.by) bits.push(t("warehouse.ledger_issued_by", { name: e.by }));
  } else if (e.kind === "transfer_out") {
    if (e.by) bits.push(t("warehouse.ledger_sent_by", { name: e.by }));
    if (e.recv_by) bits.push(t("warehouse.ledger_recv_by", { name: e.recv_by }));
  } else {
    if (e.sent_by) bits.push(t("warehouse.ledger_sent_by", { name: e.sent_by }));
    if (e.by) bits.push(t("warehouse.ledger_recv_by", { name: e.by }));
  }
  return bits.join(" · ");
};
// Gaya maal pahucha ki nahi.
const reachLine = (e) => {
  if (e.kind === "issue") {
    if (e.site_recv_by || e.status === "Received") return { txt: t("warehouse.ledger_site_got", { name: e.site_recv_by || "—" }), c: T.grn };
    return { txt: t("warehouse.ledger_site_pending"), c: T.amb };
  }
  if (e.kind === "transfer_out") {
    if (e.status === "Completed" || e.status === "Partial") return null;
    return { txt: t("warehouse.ledger_on_way"), c: T.amb };
  }
  return null;
};

// ════════════════════════════════════════════════════════════════
// Material ka poora khaata — Stock tab → material drawer → "Movement History"
// (13 Oct 2026, Prafull: "Ledger tab aur Movement History ek hi cheez dikhate
// hain — Ledger tab hatao, sab Stock me"). Data /warehouse/material-ledger?name=
// — wahi jo pehle Ledger tab ka drawer padhta tha: chalta balance, Sab / Aaya /
// Gaya, Newest / Oldest, jod; har line par click → LedgerRowDrawer (GRN hatao,
// Admin qty theek, issue / transfer / ginti ki wajah).
//   material  { name, unit, min_qty }
//   focusGrnId  ghanti se aaye (GRN hatane ki request) — wo line upar laao,
//               chamkao aur uska detail khol do
//   onData(d)   drawer upar Aaya / Gaya isi se dikhata hai
// ════════════════════════════════════════════════════════════════
export function MaterialLedgerHistory({ material, isAdmin, focusGrnId, onData, onChanged }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("all");        // all | in | out
  const [sortNew, setSortNew] = useState(true);
  const [selKey, setSelKey] = useState(null);   // khuli line — rowKey
  const [reload, setReload] = useState(0);      // save / GRN hatane ke baad khaata dobara
  const [hot, setHot] = useState(null);         // ghanti wali line (rowKey) — chamakti hai
  const focusDone = useRef(false);
  const rowRefs = useRef({});

  useEffect(() => { setD(null); setTab("all"); setSortNew(true); setSelKey(null); focusDone.current = false; }, [material.name]);
  useEffect(() => {
    let alive = true;
    api.get("/warehouse/material-ledger?name=" + encodeURIComponent(material.name)).then(r => {
      const x = r.success && r.data ? r.data : { _err: r.message || "", rows: [] };
      if (alive) { setD(x); onData && onData(x); }
    }).catch(() => { if (alive) setD({ _err: "", rows: [] }); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.name, reload]);

  // Chalta balance hamesha purane se naye ki taraf, "pehle ka" se shuru.
  const rows = useMemo(() => {
    if (!d || !d.rows) return [];
    const out = [];
    let bal = Number(d.opening) || 0;
    if (bal !== 0) out.push({ kind: "before", type: bal > 0 ? "in" : "out", qty: Math.abs(bal), date: null, ref: "", party: t("warehouse.ledger_opening"), bal, _before: true });
    for (const e of d.rows) {
      // Hatayi gayi GRN (12 Oct 2026) — line dikhti hai, balance nahi badalti.
      if (!e.cancelled) bal += e.type === "in" ? e.qty : -e.qty;
      out.push({ ...e, bal });
    }
    return sortNew ? out.slice().reverse() : out;
  }, [d, sortNew]);

  // Ghanti se aaye: us GRN ki line dikhao + detail kholo (ek hi baar).
  useEffect(() => {
    if (!d || focusDone.current || !focusGrnId) return;
    const e = rows.find(x => Number(x.grn_id) === Number(focusGrnId));
    focusDone.current = true;
    if (!e) return;
    const k = rowKey(e);
    setHot(k); setSelKey(k);
    setTimeout(() => { const el = rowRefs.current[k]; if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" }); }, 50);
  }, [d, rows, focusGrnId]);

  const visible = tab === "all" ? rows : rows.filter(e => e.type === tab && !e._before);
  // Khuli line naye data se — save ke baad wahi line taaza dikhe.
  const sel = selKey ? rows.find(e => rowKey(e) === selKey) : null;
  const TABS = [
    { id: "all", l: t("warehouse.ledger_all"), n: rows.length },
    { id: "in",  l: t("warehouse.ledger_in"),  n: rows.filter(e => e.type === "in" && !e._before).length },
    { id: "out", l: t("warehouse.ledger_out"), n: rows.filter(e => e.type === "out" && !e._before).length },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 0 8px", flexWrap: "wrap" }}>
        {TABS.map(x => (
          <button key={x.id} onClick={() => setTab(x.id)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700,
              background: tab === x.id ? T.blu : T.surfaceB, color: tab === x.id ? "#fff" : T.t3 }}>
            {x.l} <span style={{ opacity: 0.7, fontSize: 10.5 }}>{x.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <button onClick={() => setSortNew(s => !s)}
          style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surfaceB, color: T.t2, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
          {sortNew ? t("material_ledger.newest") : t("material_ledger.oldest")}
        </button>
      </div>

      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "7px 12px", background: "#1E293B", position: "sticky", top: -12, zIndex: 1, borderRadius: "8px 8px 0 0" }}>
          {[[t("warehouse.ledger_col_date"), 0], [t("warehouse.ledger_col_details"), 0], [t("warehouse.ledger_in"), 1], [t("warehouse.ledger_out"), 1], [t("warehouse.ledger_col_bal"), 1]].map(([h, r], i) => (
            <div key={i} style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: r ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {!d && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("warehouse.ledger_loading")}</div>}
        {d && d._err && <div style={{ margin: 12, padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12 }}>{d._err || t("warehouse.ledger_load_fail")}</div>}
        {d && !d._err && visible.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t3 }}>{t("warehouse.ledger_no_entry")}</div>}
        {visible.map((e, i) => {
          const km = kindMeta(e.kind);
          const isIn = e.type === "in";
          const who = e._before ? t("warehouse.ledger_opening_hint") : whoLine(e);
          const reach = reachLine(e);
          const k = rowKey(e);
          const bg = hot === k ? T.ambL : i % 2 ? T.surfaceB : T.surface;
          return (
            <div key={k + ":" + i} ref={el => { rowRefs.current[k] = el; }} onClick={() => setSelKey(k)}
              onMouseEnter={ev => { ev.currentTarget.style.background = T.bluL; }}
              onMouseLeave={ev => { ev.currentTarget.style.background = bg; }}
              style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "8px 12px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", borderLeft: `3px solid ${km.c}`, background: bg, cursor: "pointer" }}>
              <div style={{ fontSize: 10.5, color: T.t3 }}>{e._before ? "—" : fmtDate(e.date)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e._before ? (e.party || "—") : partyLine(e)}</div>
                <div style={{ fontSize: 9.5, color: T.t4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {!e._before && <span style={{ fontFamily: "monospace", color: km.c, fontWeight: 700 }}>{e.ref}</span>}
                  {!e._before && <span style={{ color: km.c }}> · {km.label}</span>}
                  {who ? (e._before ? who : " · " + who) : ""}
                </div>
                {reach && <div style={{ fontSize: 9.5, color: reach.c, fontWeight: 600 }}>{reach.txt}</div>}
                {/* GRN hatana (12 Oct 2026) — hatayi gayi / request approval me */}
                {e.cancelled && <div title={e.cancel_reason} style={{ fontSize: 9.5, color: T.red, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("warehouse.grnc_cancelled_tag")} · {t("warehouse.grnc_cancelled_line", { reason: e.cancel_reason || "—" })}</div>}
                {!e.cancelled && e.cancel_req && e.cancel_req.status === "pending" && <div title={e.cancel_req.reason} style={{ fontSize: 9.5, color: T.amb, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("warehouse.grnc_pending_tag")} · {e.cancel_req.reason}</div>}
                {/* Issue ka note (11 Oct 2026, O) */}
                {e.kind === "issue" && e.note && <div title={e.note} style={{ fontSize: 9.5, color: T.t4, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("material.issue_note", { note: e.note })}</div>}
                {/* Qty badli thi — aakhri badlav line par hi (11 Oct 2026, AA) */}
                {(e.edits || []).length > 0 && (() => { const x = e.edits[e.edits.length - 1]; return (
                  <div title={x.note} style={{ fontSize: 9.5, color: T.pur, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    ✎ {t("warehouse.ledger_row_edited", { old: fmtQ(x.old_qty), new: fmtQ(x.new_qty), note: x.note })}
                  </div>); })()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: e.cancelled ? T.t4 : isIn ? T.grn : T.b2, textAlign: "right", textDecoration: e.cancelled ? "line-through" : "none" }}>{isIn ? fmtQ(e.qty) : "—"}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: !isIn ? T.red : T.b2, textAlign: "right" }}>{!isIn ? fmtQ(e.qty) : "—"}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: e.bal < 0 ? T.red : T.t1, textAlign: "right" }}>{fmtQ(e.bal)}</div>
            </div>
          );
        })}
        {d && !d._err && rows.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "9px 12px", background: "#0F172A", borderRadius: "0 0 8px 8px" }}>
            <div style={{ gridColumn: "1 / 3", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("common.total")}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#4ADE80", textAlign: "right" }}>{fmtQ(d.total_in)}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#F87171", textAlign: "right" }}>{fmtQ(d.total_out)}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textAlign: "right" }}>{fmtQ(d.stock)}</div>
          </div>
        )}
      </div>
      {sel && <LedgerRowDrawer e={sel} unit={material.unit} isAdmin={isAdmin} grnCancel={(d && d.grn_cancel) || {}}
        onClose={() => { setSelKey(null); setHot(null); }} onSaved={() => { setReload(x => x + 1); onChanged && onChanged(); }}/>}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// GRN hatana (12 Oct 2026) — vendor se aayi store GRN. "GRN hatao" → wajah ke
// saath request (stock nahi hilta); Admin / Warehouse Approve tick wala Admin
// password se approve kare tabhi stock ghatta hai. Bhejne wala request wapas le
// sakta hai. Button server ke flag (grn_cancel, cancel_req.mine) se.
// ════════════════════════════════════════════════════════════════
function GrnCancelBox({ e, perms, onDone }) {
  const rq = e.cancel_req && e.cancel_req.status === "pending" ? e.cancel_req : null;
  const last = e.cancel_req && !rq ? e.cancel_req : null;
  const [open, setOpen] = useState(false);       // request ka modal
  const [reason, setReason] = useState("");
  const [pw, setPw] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);          // { ok, txt }
  useEffect(() => { setOpen(false); setReason(""); setPw(""); setNote(""); setMsg(null); }, [e.grn_id]);

  const run = async (url, body) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = await api.post(url, body).catch(() => ({ success: false }));
    setBusy(false);
    if (r && r.success) { setOpen(false); setReason(""); setPw(""); setNote(""); setMsg({ ok: true, txt: r.message || "" }); onDone && onDone(); }
    else setMsg({ ok: false, txt: (r && r.message) || t("warehouse.ledger_row_fail") });
  };
  const send = () => {
    if (!reason.trim()) { setMsg({ ok: false, txt: t("warehouse.grnc_need_reason") }); return; }
    run(`/warehouse/grn/${e.grn_id}/cancel-request`, { reason: reason.trim() });
  };
  const approve = () => {
    if (!pw) { setMsg({ ok: false, txt: t("warehouse.ledger_row_need_pw") }); return; }
    run(`/warehouse/grn-cancel-requests/${rq.id}/approve`, { password: pw });
  };
  const reject = () => {
    if (!note.trim()) { setMsg({ ok: false, txt: t("warehouse.grnc_need_note") }); return; }
    run(`/warehouse/grn-cancel-requests/${rq.id}/reject`, { note: note.trim() });
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit" };
  const lbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", margin: "10px 0 4px" };
  const btn = (bg, fg, bd) => ({ padding: "8px 14px", borderRadius: 7, border: bd ? `1.5px solid ${bd}` : "none", background: bg, color: fg || "#fff", fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 });
  const Msg = () => msg ? <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 600, color: msg.ok ? T.grn : T.red }}>{msg.txt}</div> : null;

  if (e.cancelled) {
    return (
      <div style={{ marginTop: 14, padding: "10px 12px", background: T.redL, borderRadius: 8, borderLeft: `3px solid ${T.red}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>{t("warehouse.grnc_cancelled_tag")} · {t("warehouse.grnc_cancelled_box")}</div>
        <div style={{ fontSize: 11.5, color: T.t2, marginTop: 4 }}>{t("warehouse.grnc_cancelled_line", { reason: e.cancel_reason || "—" })}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("warehouse.grnc_cancelled_by", { name: e.cancelled_by || "—", date: fmtDate(e.cancelled_at) })}</div>
      </div>
    );
  }
  if (rq) {
    return (
      <div style={{ marginTop: 14, padding: "10px 12px", background: T.ambL, borderRadius: 8, borderLeft: `3px solid ${T.amb}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.amb }}>{t("warehouse.grnc_pending_tag")}</div>
        <div style={{ fontSize: 11.5, color: T.t2, marginTop: 4 }}>{t("warehouse.grnc_req_reason", { reason: rq.reason })}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("warehouse.grnc_req_by", { name: rq.by || "—", date: fmtDate(rq.at) })}</div>
        {perms.can_approve && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.b2}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("warehouse.grnc_approve_title")}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>{t("warehouse.grnc_hint")}</div>
            <div style={lbl}>{t("warehouse.ledger_row_pw")}</div>
            <input type="password" autoComplete="new-password" aria-label={t("warehouse.ledger_row_pw")} value={pw} onChange={ev => setPw(ev.target.value)} style={inp}/>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
              <button onClick={approve} disabled={busy} style={btn(T.red)}>{t("warehouse.grnc_approve_btn")}</button>
            </div>
            <div style={lbl}>{t("warehouse.grnc_reject_note")}</div>
            <textarea rows={2} value={note} onChange={ev => setNote(ev.target.value)} style={{ ...inp, resize: "vertical" }}/>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
              <button onClick={reject} disabled={busy} style={btn(T.surface, T.t2, T.b2)}>{t("warehouse.grnc_reject_btn")}</button>
            </div>
          </div>
        )}
        {rq.mine && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => run(`/warehouse/grn-cancel-requests/${rq.id}/withdraw`, {})} disabled={busy} style={btn(T.surface, T.amb, T.amb)}>{t("warehouse.grnc_withdraw")}</button>
          </div>
        )}
        <Msg/>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 14 }}>
      {last && last.status === "rejected" && (
        <div style={{ fontSize: 11.5, color: T.t3, padding: "8px 10px", background: T.surfaceB, borderRadius: 7, marginBottom: 8 }}>
          {t("warehouse.grnc_rejected_line", { note: last.note || "—", name: last.decided_by || "—" })}
        </div>
      )}
      {perms.can_request && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => { setOpen(true); setMsg(null); }} style={btn(T.surface, T.red, T.red)}>{t("warehouse.grnc_btn")}</button>
        </div>
      )}
      {!open && <Msg/>}
      {open && (
        <>
          <div onClick={() => !busy && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1404 }}/>
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(420px,92vw)", background: T.surface, borderRadius: 12, zIndex: 1405, padding: "16px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{t("warehouse.grnc_title", { no: e.ref })}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 5 }}>{t("warehouse.grnc_hint")}</div>
            <div style={lbl}>{t("warehouse.grnc_reason")}</div>
            <textarea rows={3} autoFocus value={reason} onChange={ev => setReason(ev.target.value)} placeholder={t("warehouse.grnc_reason_ph")} style={{ ...inp, resize: "vertical" }}/>
            <Msg/>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} disabled={busy} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
              <button onClick={send} disabled={busy} style={btn(T.red)}>{t("warehouse.grnc_send")}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Line ki pehchaan — kind + row_id (server deta hai); "Pehle ka" ki apni.
const rowKey = (e) => (e._before ? "before" : e.kind + ":" + (e.row_id ?? e.ref));

// ════════════════════════════════════════════════════════════════
// Line ka detail — side drawer (11 Oct 2026, AA). Prafull: "ledger me opening
// stock ya kisi bhi row me click → detail side me khulega → qty edit, note,
// save with admin password → qty change aur note usme hamesha dikhega."
// Qty sirf store me bani "aaya" line (Opening / Stock add / Site se wapas) ki,
// sirf Admin, company ke delete-password ke saath. Baaki line par wajah.
// ════════════════════════════════════════════════════════════════
function LedgerRowDrawer({ e, unit, isAdmin, grnCancel, onClose, onSaved }) {
  const km = kindMeta(e.kind);
  const [qty, setQty] = useState(String(e.qty ?? ""));
  const [note, setNote] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);         // { ok, txt }
  // Doosri line khuli to form saaf.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setQty(String(e.qty ?? "")); setNote(""); setPw(""); setMsg(null); }, [e.kind, e.row_id, e._before]);

  const canEdit = !e._before && e.editable && isAdmin;
  const why = e._before ? t("warehouse.ledger_row_before_why")
    : !e.editable ? (e.edit_why || t("warehouse.ledger_row_no_edit"))
    : !isAdmin ? t("warehouse.ledger_row_admin_only") : "";
  const who = e._before ? t("warehouse.ledger_opening_hint") : whoLine(e);

  const save = async () => {
    if (busy) return;
    if (!note.trim()) { setMsg({ ok: false, txt: t("warehouse.ledger_row_need_note") }); return; }
    if (!pw) { setMsg({ ok: false, txt: t("warehouse.ledger_row_need_pw") }); return; }
    setBusy(true); setMsg(null);
    const r = await api.patch(`/warehouse/material-ledger/rows/${encodeURIComponent(e.kind)}/${e.row_id}/qty`,
      { new_qty: qty, note: note.trim(), password: pw }).catch(() => ({ success: false }));
    setBusy(false);
    if (r && r.success) { setPw(""); setNote(""); setMsg({ ok: true, txt: r.message || "" }); onSaved && onSaved(); }
    else setMsg({ ok: false, txt: (r && r.message) || t("warehouse.ledger_row_fail") });
  };

  const Row = ({ l, v }) => (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, padding: "7px 0", borderBottom: `1px solid ${T.b1}` }}>
      <div style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{l}</div>
      <div style={{ fontSize: 12, color: T.t1, fontWeight: 600, wordBreak: "break-word" }}>{v || "—"}</div>
    </div>
  );
  const inp = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit" };
  const lbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", margin: "10px 0 4px" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 1402 }}/>
      <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "min(420px,100vw)", background: T.surface, zIndex: 1403,
        display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.22)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background: "#0D1B2A", padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{e._before ? t("warehouse.ledger_opening") : (e.ref || km.label)}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{t("warehouse.ledger_row_title")}</div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ height: 3, background: km.c, flexShrink: 0 }}/>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 18px" }}>
          <Row l={t("warehouse.ledger_col_date")} v={e._before ? "—" : fmtDate(e.date)}/>
          <Row l={t("warehouse.ledger_row_type")} v={<span style={{ color: km.c }}>{km.label} · {e.type === "in" ? t("warehouse.ledger_in") : t("warehouse.ledger_out")}</span>}/>
          <Row l={t("warehouse.ledger_row_qty")} v={<span style={{ color: e.type === "in" ? T.grn : T.red, fontSize: 14 }}>{e.type === "in" ? "+" : "−"}{fmtQ(e.qty)} {e.unit || unit || ""}</span>}/>
          {!e._before && <Row l={t("warehouse.ledger_row_rate")} v={e.rate ? "₹" + fmtQ(e.rate) : "—"}/>}
          {!e._before && <Row l={t("warehouse.ledger_row_amount")} v={e.amount ? "₹" + Number(e.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}/>}
          {!e._before && <Row l={t("warehouse.ledger_row_ref")} v={e.ref}/>}
          <Row l={t("warehouse.ledger_row_party")} v={e._before ? "—" : partyLine(e)}/>
          <Row l={t("warehouse.ledger_row_by")} v={who}/>
          {!e._before && <Row l={t("warehouse.ledger_row_note")} v={e.note}/>}

          {/* Qty badlav ka itihaas — hamesha dikhe */}
          {(e.edits || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={lbl}>{t("warehouse.ledger_row_history")}</div>
              {e.edits.map((x, k) => (
                <div key={k} style={{ fontSize: 11.5, color: T.t2, padding: "7px 10px", background: T.purL, borderRadius: 7, marginBottom: 5, borderLeft: `3px solid ${T.pur}` }}>
                  {t("warehouse.ledger_row_history_line", { old: fmtQ(x.old_qty), new: fmtQ(x.new_qty), note: x.note, name: x.by || "—", date: fmtDate(x.at) })}
                </div>
              ))}
            </div>
          )}

          {why && !e.cancelled && <div style={{ marginTop: 14, padding: "9px 11px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 7, fontSize: 11.5, color: T.t3 }}>{why}</div>}

          {(e.cancellable || e.cancelled) && <GrnCancelBox e={e} perms={grnCancel} onDone={onSaved}/>}

          {canEdit && (
            <div style={{ marginTop: 16, padding: "12px 14px", border: `1.5px solid ${T.b2}`, borderRadius: 9, background: T.surfaceB }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("warehouse.ledger_row_edit_title")}</div>
              {e.consumed > 0 && <div style={{ fontSize: 11, color: T.amb, marginTop: 4 }}>{t("warehouse.ledger_row_consumed", { n: fmtQ(e.consumed), unit: e.unit || unit || "" })}</div>}
              <div style={lbl}>{t("warehouse.ledger_row_qty")}</div>
              <input type="number" min={e.consumed || 0} step="any" value={qty} onChange={ev => setQty(ev.target.value)} style={inp}/>
              <div style={lbl}>{t("warehouse.ledger_row_note_label")}</div>
              <textarea rows={2} value={note} onChange={ev => setNote(ev.target.value)} placeholder={t("warehouse.ledger_row_note_ph")} style={{ ...inp, resize: "vertical" }}/>
              <div style={lbl}>{t("warehouse.ledger_row_pw")}</div>
              <input type="password" autoComplete="new-password" value={pw} onChange={ev => setPw(ev.target.value)} style={inp}/>
              {msg && <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 600, color: msg.ok ? T.grn : T.red }}>{msg.txt}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 11 }}>
                <button onClick={save} disabled={busy}
                  style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: T.blu, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                  {busy ? t("common.saving") : t("warehouse.ledger_row_save")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
