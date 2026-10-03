// ── STORE KI GINTI + KHARAB / KABAD / REPAIR NIKASI (3 Oct 2026) ──────
// Store ka stock ab tak sirf GRN / issue / transfer / return se badalta tha —
// gin kar mila farak, geela cement, jang khaya patra, gayab pipe likhne ka
// koi raasta nahi tha. "Edit Material" me qty ka khaana jaan-boojh kar nahi
// hai: stock sirf document se badalta hai. Ye file wahi do document deti hai:
//
//   • Ginti (GNT-…) — store keeper gin kar bharta hai (Theek mila · Kharab ·
//     Kabad · Gum · Nasht), approval me bhejta hai; approve par hi stock badalta
//     hai. Kami ka har dana Gum ya Nasht me, aur farak par note — server bhi
//     yahi jaanchta hai (gb-backend utils/whGinti.js checkCountLine), yahan
//     sirf pehle se dikhane ke liye.
//   • Kharab / Kabad nikasi (KBD-…) — kharab / kabad maal becho, phenko, theek
//     karo, kabad me daalo, repair me vendor ko bhejo; repair se lauta maal.
//     Ye bhi approval se.
//   • Nuksan report — tareekh ke beech kya kharab / kabad bana, gum / nasht
//     hua, kitne ₹ ka.
//
// Data: /warehouse/counts*, /warehouse/disposals*, /warehouse/repairs,
// /warehouse/loss-report (gb-backend routes/warehouse-ginti.js) — api.js
// chuna hua store khud jod deta hai. Module ke bahar se kuch nahi liya.

import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../config/api";
import { t } from "../i18n";
import { BackClose } from "../utils/backNav";

const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB", sb: "#0D1B2A",
  ind: "#4B45C4", indL: "#EEEDFB",
  blu: "#2563EB", bluL: "#EFF6FF",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  slt: "#64748B", sltL: "#F1F5F9",
};
const EPS = 0.0005;
const n3 = (v) => Math.round((Number(v) || 0) * 1000) / 1000;
const fmtQ = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? "—" : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};
const istToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const blank = (v) => v === "" || v == null;
const inp = { width: "100%", padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: T.surface, color: T.t1 };
const btn = (bg, c = "#fff", brd) => ({ padding: "8px 14px", borderRadius: 7, border: brd ? `1.5px solid ${brd}` : "none", background: bg, color: c, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

// ── Status chip ─────────────────────────────────────────────────
const countSt = (c) => {
  if (c.status === "draft" && c.sent_back) return { l: t("warehouse.gt_st_sent_back"), c: T.amb, bg: T.ambL };
  return ({
    draft:     { l: t("warehouse.gt_st_draft"),     c: T.slt, bg: T.sltL },
    pending:   { l: t("warehouse.gt_st_pending"),   c: T.amb, bg: T.ambL },
    approved:  { l: t("warehouse.gt_st_approved"),  c: T.grn, bg: T.grnL },
    rejected:  { l: t("warehouse.gt_st_rejected"),  c: T.red, bg: T.redL },
    cancelled: { l: t("warehouse.gt_st_cancelled"), c: T.t4,  bg: T.sltL },
  })[c.status] || { l: c.status, c: T.t3, bg: T.sltL };
};
const Chip = ({ s }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: s.c, background: s.bg, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>{s.l}</span>
);
const scopeLabel = (c) => (c.scope === "category" ? t("warehouse.gt_scope_cat_x", { name: c.scope_value || "—" })
  : c.scope === "items" ? t("warehouse.gt_scope_items_n", { n: c.line_count || 0 }) : t("warehouse.gt_scope_all"));

// ── Line ka live hisaab — server ke checkCountLine jaisa ─────────────
// e = { g, d, s, lost, nasht, note } (input ki string). Khaali = gina nahi.
function lineState(sys, e) {
  const raw = [e.g, e.d, e.s, e.lost, e.nasht];
  if (raw.every(blank)) return { counted: false };
  const v = raw.map((x) => (blank(x) ? 0 : Number(x)));
  if (v.some((x) => !Number.isFinite(x) || x < 0)) return { counted: true, err: { k: "bad" } };
  const [cg, cd, cs, lost, nasht] = v.map(n3);
  const sysT = n3(sys.g + sys.d + sys.s), cntT = n3(cg + cd + cs);
  const short = n3(sysT - cntT), expl = n3(lost + nasht);
  const excess = Math.max(0, n3(cntT - sysT));
  let err = null;
  if (short > EPS) {
    if (expl + EPS < short) err = { k: "unexplained", n: n3(short - expl) };
    else if (expl > short + EPS) err = { k: "over", n: expl, short };
  } else if (expl > EPS) err = { k: "no_short" };
  const differs = Math.abs(cg - sys.g) > EPS || Math.abs(cd - sys.d) > EPS || Math.abs(cs - sys.s) > EPS
    || lost > EPS || nasht > EPS || excess > EPS;
  if (!err && differs && !String(e.note || "").trim()) err = { k: "note" };
  return { counted: true, err, net: n3(cntT - sysT), differs };
}
const errText = (er, unit) => !er ? "" : ({
  bad: t("warehouse.gt_hint_bad"),
  unexplained: t("warehouse.gt_hint_unexplained", { n: fmtQ(er.n), unit: unit || "" }),
  over: t("warehouse.gt_hint_over", { n: fmtQ(er.n), short: fmtQ(er.short), unit: unit || "" }),
  no_short: t("warehouse.gt_hint_no_short"),
  note: t("warehouse.gt_hint_note"),
})[er.k] || "";

// ════════════════════════════════════════════════════════════════
// Ginti tab — list, Nayi ginti, Nuksan report
// ════════════════════════════════════════════════════════════════
export function WarehouseGintiTab({ stock, canCreate, canApprove, onStockChanged }) {
  const [view, setView] = useState("counts");      // counts | report
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    api.get("/warehouse/counts").then((r) => {
      if (r.success) { setList(r.data || []); setErr(""); } else { setList([]); setErr(r.message || ""); }
    }).catch(() => setList([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = () => { load(); onStockChanged && onStockChanged(); };
  const pending = (list || []).filter((c) => c.status === "pending").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: T.sltL, borderRadius: 8, padding: 3 }}>
          {[["counts", t("warehouse.gt_view_counts")], ["report", t("warehouse.gt_view_report")]].map(([id, l]) => (
            <button key={id} onClick={() => setView(id)}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: view === id ? 700 : 500,
                background: view === id ? T.surface : "transparent", color: view === id ? T.t1 : T.t3, boxShadow: view === id ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
              {l}{id === "counts" && pending > 0 ? <span style={{ marginLeft: 6, fontSize: 10, color: T.amb }}>{pending}</span> : null}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {view === "counts" && canCreate && (
          <button onClick={() => setNewOpen(true)} style={btn(T.ind)}>{t("warehouse.gt_new")}</button>
        )}
      </div>

      {view === "report" ? <LossReport /> : (
        <>
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10 }}>{t("warehouse.gt_list_hint")}</div>
          {err && <div style={{ padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", background: T.surface }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID_LIST, gap: 8, padding: "9px 14px", background: "#1E293B" }}>
              {[t("warehouse.gt_col_no"), t("warehouse.gt_col_date"), t("warehouse.gt_col_scope"), t("warehouse.gt_col_status"),
                t("warehouse.gt_col_counted"), t("warehouse.gt_col_diff"), t("warehouse.gt_col_loss")].map((h, i) => (
                <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: i >= 4 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
            {list === null && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("warehouse.gt_loading")}</div>}
            {list && list.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("warehouse.gt_empty")}</div>}
            {(list || []).map((c, i) => (
              <div key={c.id} onClick={() => setOpenId(c.id)}
                style={{ display: "grid", gridTemplateColumns: GRID_LIST, gap: 8, padding: "10px 14px", borderTop: `1px solid ${T.b1}`, cursor: "pointer", alignItems: "center", background: i % 2 ? T.surfaceB : T.surface }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontFamily: "monospace" }}>{c.count_no}</div>
                <div style={{ fontSize: 11.5, color: T.t2 }}>{fmtDate(c.date)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scopeLabel(c)}</div>
                  <div style={{ fontSize: 10, color: T.t4 }}>{c.created_by_name || ""}</div>
                </div>
                <div><Chip s={countSt(c)} /></div>
                <div style={{ fontSize: 12, color: T.t2, textAlign: "right" }}>{c.counted_count}/{c.line_count}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: Number(c.diff_count) > 0 ? T.amb : T.t4, textAlign: "right" }}>{Number(c.diff_count) || "—"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: Number(c.loss_value) > 0 ? T.red : T.t4, textAlign: "right" }}>
                  {c.status === "approved" ? inr(c.loss_value) : "—"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {newOpen && <NewCountModal stock={stock} onClose={() => setNewOpen(false)}
        onCreated={(c) => { setNewOpen(false); load(); setOpenId(c.id); }}
        onOpenExisting={(id) => { setNewOpen(false); setOpenId(id); }} />}
      {openId && <CountSheet id={openId} canApprove={canApprove} onClose={() => setOpenId(null)} onChanged={changed} />}
    </div>
  );
}
const GRID_LIST = "96px 82px 1.4fr 112px 80px 64px 96px";

// ── Nayi ginti ───────────────────────────────────────────────────
function NewCountModal({ stock, onClose, onCreated, onOpenExisting }) {
  const [scope, setScope] = useState("all");
  const [cat, setCat] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);       // { text, openId? }
  const cats = useMemo(() => [...new Set((stock || []).map((m) => m.category).filter(Boolean))].sort(), [stock]);
  const ql = q.trim().toLowerCase();
  const shown = (stock || []).filter((m) => !ql || String(m.name || "").toLowerCase().includes(ql));
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const valid = scope === "all" || (scope === "category" && cat) || (scope === "items" && picked.size > 0);

  const create = async () => {
    if (!valid || saving) return;
    setSaving(true); setMsg(null);
    const r = await api.post("/warehouse/counts", {
      scope, scope_value: scope === "category" ? cat : null,
      material_ids: scope === "items" ? [...picked] : undefined, remarks: remarks.trim() || null,
    });
    setSaving(false);
    if (r.success && r.data) return onCreated(r.data);
    setMsg({ text: r.message || t("warehouse.gt_fail"), openId: r.code === "count_open" && r.data ? r.data.id : null });
  };

  const opt = (id, l, sub) => (
    <label key={id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, cursor: "pointer",
      border: `1.5px solid ${scope === id ? T.ind : T.b1}`, background: scope === id ? T.indL : T.surface, marginBottom: 7 }}>
      <input type="radio" checked={scope === id} onChange={() => setScope(id)} style={{ marginTop: 2 }} />
      <div><div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{l}</div><div style={{ fontSize: 11, color: T.t3 }}>{sub}</div></div>
    </label>
  );
  return (
    <Modal title={t("warehouse.gt_new")} sub={t("warehouse.gt_new_sub")} onClose={onClose} width={560}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b1)}>{t("warehouse.gt_close")}</button>
        <button onClick={create} disabled={!valid || saving} style={{ ...btn(valid ? T.ind : T.b2), cursor: valid ? "pointer" : "not-allowed" }}>
          {saving ? t("warehouse.gt_saving") : t("warehouse.gt_start")}
        </button>
      </>}>
      {opt("all", t("warehouse.gt_scope_all"), t("warehouse.gt_scope_all_sub"))}
      {opt("category", t("warehouse.gt_scope_cat"), t("warehouse.gt_scope_cat_sub"))}
      {scope === "category" && (
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inp, marginBottom: 10 }}>
          <option value="">{t("warehouse.gt_pick_cat")}</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {opt("items", t("warehouse.gt_scope_items"), t("warehouse.gt_scope_items_sub"))}
      {scope === "items" && (
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("warehouse.gt_search")} style={{ ...inp, flex: 1 }} />
            <span style={{ fontSize: 11, color: T.t3, whiteSpace: "nowrap" }}>{t("warehouse.gt_picked_n", { n: picked.size })}</span>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {shown.map((m) => (
              <label key={m.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 10px", borderTop: `1px solid ${T.b1}`, cursor: "pointer", fontSize: 12 }}>
                <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
                <span style={{ flex: 1, color: T.t1 }}>{m.name}</span>
                <span style={{ color: T.t4 }}>{fmtQ(m.qty)} {m.unit}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 600, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", margin: "6px 0 4px" }}>{t("warehouse.gt_remarks")}</div>
      <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t("warehouse.gt_remarks_ph")} style={inp} />
      {msg && (
        <div style={{ marginTop: 10, padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12 }}>
          {msg.text}
          {msg.openId && <button onClick={() => onOpenExisting(msg.openId)} style={{ ...btn(T.surface, T.ind, T.ind), marginLeft: 8, padding: "3px 9px", fontSize: 11 }}>{t("warehouse.gt_open_existing")}</button>}
        </div>
      )}
    </Modal>
  );
}

// ── Ginti ki sheet ───────────────────────────────────────────────
const GRID_SHEET = "1.5fr 118px 78px 70px 70px 70px 70px 74px 1.3fr";
function CountSheet({ id, canApprove, onClose, onChanged }) {
  const [c, setC] = useState(null);
  const [vals, setVals] = useState({});         // material_id → { g,d,s,lost,nasht,note }
  const [dirty, setDirty] = useState(() => new Set());
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);         // { bad, text, mid? }

  const apply = (d) => {
    setC(d);
    const o = {};
    for (const i of d.items || []) {
      const cnt = i.cnt_good != null;
      o[i.material_id] = {
        g: cnt ? fmtNum(i.cnt_good) : "", d: cnt ? fmtNum(i.cnt_damaged) : "", s: cnt ? fmtNum(i.cnt_scrap) : "",
        lost: cnt && Number(i.lost_qty) ? fmtNum(i.lost_qty) : "", nasht: cnt && Number(i.destroyed_qty) ? fmtNum(i.destroyed_qty) : "",
        note: i.note || "",
      };
    }
    setVals(o); setDirty(new Set()); setNote(d.remarks || "");
  };
  const load = useCallback(async () => {
    const r = await api.get(`/warehouse/counts/${id}`);
    if (r.success && r.data) apply(r.data); else setMsg({ bad: true, text: r.message || t("warehouse.gt_fail") });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const editable = !!c && c.status === "draft" && !!c.can_edit;
  // Server ka faisla (taaza role + Warehouse Approve, strict) pehle; purana server ho to screen ka.
  const deciding = !!c && c.status === "pending" && (c.can_approve != null ? !!c.can_approve : canApprove);
  // System kisse milao: save ho chuki line ka system (save ke waqt ka); bina
  // gini / abhi badli line ka store ka ABHI ka — save par server wahi likhta hai.
  const sysOf = (i) => {
    const useCur = c && c.status === "draft" && (dirty.has(String(i.material_id)) || i.cnt_good == null) && i.cur_good != null;
    return useCur
      ? { g: n3(i.cur_good), d: n3(i.cur_damaged), s: n3(i.cur_scrap) }
      : { g: n3(i.sys_good), d: n3(i.sys_damaged), s: n3(i.sys_scrap) };
  };
  const set = (mid, k, v) => {
    setVals((o) => ({ ...o, [mid]: { ...(o[mid] || {}), [k]: v } }));
    setDirty((s) => new Set(s).add(String(mid)));
  };

  const items = useMemo(() => (c ? c.items || [] : []), [c]);
  const states = useMemo(() => {
    const m = {};
    for (const i of items) m[i.material_id] = lineState(sysOf(i), vals[i.material_id] || {});
    return m;
  }, [items, vals, dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  const counted = items.filter((i) => states[i.material_id] && states[i.material_id].counted).length;
  const diffs = items.filter((i) => states[i.material_id] && states[i.material_id].differs).length;
  const errs = items.filter((i) => states[i.material_id] && states[i.material_id].err).length;
  const ql = q.trim().toLowerCase();
  const shown = items.filter((i) => (!ql || String(i.material_name || "").toLowerCase().includes(ql))
    && (!onlyDiff || (states[i.material_id] && states[i.material_id].differs)));

  const body = () => [...dirty].map((mid) => {
    const e = vals[mid] || {};
    const none = [e.g, e.d, e.s, e.lost, e.nasht].every(blank);
    const nv = (x) => (none ? null : blank(x) ? 0 : Number(x));
    return { material_id: Number(mid), cnt_good: nv(e.g), cnt_damaged: nv(e.d), cnt_scrap: nv(e.s),
      lost_qty: nv(e.lost), destroyed_qty: nv(e.nasht), note: (e.note || "").trim() || null };
  });
  const save = async (quiet) => {
    if (!dirty.size && note === (c.remarks || "")) { if (!quiet) setMsg({ text: t("warehouse.gt_nothing_changed") }); return true; }
    setBusy(true); setMsg(null);
    const r = await api.put(`/warehouse/counts/${c.id}/items`, { items: body(), remarks: note });
    setBusy(false);
    if (!r.success || !r.data) { setMsg({ bad: true, text: r.message || t("warehouse.gt_fail"), mid: r.data && r.data.material_id }); return false; }
    apply(r.data);
    if (!quiet) setMsg({ text: r.message || t("warehouse.gt_saved") });
    return true;
  };
  const act = async (path, bodyObj, confirmText) => {
    if (confirmText && !(await window.confirmAsync(confirmText))) return;
    setBusy(true); setMsg(null);
    const r = await api.post(`/warehouse/counts/${c.id}/${path}`, bodyObj || {});
    setBusy(false);
    if (!r.success) return setMsg({ bad: true, text: r.message || t("warehouse.gt_fail") });
    if (r.data) apply(r.data);
    setMsg({ text: r.message || "" });
    onChanged && onChanged();
  };
  const submit = async () => {
    if (!(await window.confirmAsync(t("warehouse.gt_submit_confirm", { n: items.length - counted })))) return;
    if (!(await save(true))) return;
    await act("submit", { remarks: note });
  };
  const askReason = async (label) => {
    const reason = await window.promptAsync(label, "");
    if (reason == null) return null;
    if (!String(reason).trim()) { setMsg({ bad: true, text: t("warehouse.gt_reason_needed") }); return null; }
    return String(reason).trim();
  };

  const money = c && (c.status === "approved"
    ? { out: c.value_out, loss: c.loss_value, est: false }
    : c && c.est_value_out != null ? { out: c.est_value_out, loss: c.est_loss_value, est: true } : null);

  return (
    <>
      <BackClose onClose={onClose} />
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1400 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "min(1180px,100vw)", background: T.surface, zIndex: 1401,
        display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background: T.sb, padding: "13px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{c ? c.count_no : "…"}</span>
              {c && <Chip s={countSt(c)} />}
            </div>
            {c && <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 2 }}>
              {[c.warehouse_name, fmtDate(c.date), scopeLabel(c), c.created_by_name ? t("warehouse.gt_by", { name: c.created_by_name }) : ""].filter(Boolean).join(" · ")}
            </div>}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer" }}>×</button>
        </div>

        {!c ? <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 12 }}>{msg ? msg.text : t("warehouse.gt_loading")}</div> : (<>
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("warehouse.gt_search")} style={{ ...inp, width: 240 }} />
            <label style={{ fontSize: 12, color: T.t2, display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> {t("warehouse.gt_only_diff")}
            </label>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: T.t3 }}>{t("warehouse.gt_counter", { done: counted, total: items.length })}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: diffs ? T.amb : T.t4 }}>{t("warehouse.gt_diff_n", { n: diffs })}</span>
          </div>

          {c.status === "draft" && c.reject_reason && <Banner tone="amb">{t("warehouse.gt_sent_back_banner", { reason: c.reject_reason })}</Banner>}
          {c.status === "rejected" && <Banner tone="red">{t("warehouse.gt_rejected_banner", { reason: c.reject_reason || "—" })}</Banner>}
          {c.status === "pending" && <Banner tone="blu">{t("warehouse.gt_pending_banner", { by: c.submitted_by_name || "—" })}</Banner>}
          {editable && <div style={{ padding: "6px 20px 0", fontSize: 11, color: T.t3 }}>{t("warehouse.gt_blank_hint")}</div>}

          <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ minWidth: 1020 }}>
              <div style={{ display: "grid", gridTemplateColumns: GRID_SHEET, gap: 6, padding: "8px 20px", background: "#1E293B", position: "sticky", top: 0, zIndex: 1 }}>
                {[t("warehouse.gt_h_material"), t("warehouse.gt_h_system"), t("warehouse.gt_h_good"), t("warehouse.gt_h_damaged"), t("warehouse.gt_h_scrap"),
                  t("warehouse.gt_h_lost"), t("warehouse.gt_h_destroyed"), t("warehouse.gt_h_diff"), t("warehouse.gt_h_note")].map((h, i) => (
                  <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: ".3px", textAlign: i >= 2 && i <= 7 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {shown.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("warehouse.gt_no_match")}</div>}
              {shown.map((i, idx) => {
                const e = vals[i.material_id] || {};
                const s = states[i.material_id] || { counted: false };
                const sys = sysOf(i);
                const hl = msg && msg.bad && Number(msg.mid) === Number(i.material_id);
                const cell = (k) => (
                  <input type="number" min="0" inputMode="decimal" value={e[k] ?? ""} disabled={!editable} placeholder="—"
                    onChange={(ev) => set(i.material_id, k, ev.target.value)}
                    style={{ ...inp, padding: "6px 7px", textAlign: "right", background: editable ? T.surface : T.surfaceB }} />
                );
                const netC = !s.counted ? T.t4 : s.net < -EPS ? T.red : s.net > EPS ? T.blu : s.differs ? T.amb : T.grn;
                return (
                  <div key={i.id} style={{ display: "grid", gridTemplateColumns: GRID_SHEET, gap: 6, padding: "8px 20px", alignItems: "start",
                    borderBottom: `1px solid ${T.b1}`, background: hl ? T.redL : idx % 2 ? T.surfaceB : T.surface,
                    borderLeft: `3px solid ${!s.counted ? "transparent" : s.err ? T.red : s.differs ? T.amb : T.grn}` }}>
                    <div style={{ minWidth: 0, paddingTop: 4 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{i.material_name}</div>
                      <div style={{ fontSize: 10, color: T.t4 }}>{i.unit || ""}{i.category ? " · " + i.category : ""}</div>
                      {Number(i.cur_repair) > 0 && <div style={{ fontSize: 10, color: T.slt, marginTop: 2 }}>{t("warehouse.gt_repair_ro", { n: fmtQ(i.cur_repair) })}</div>}
                      {!s.counted && editable && <span style={{ fontSize: 9.5, fontWeight: 700, color: T.amb }}>{t("warehouse.gt_not_counted")}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.t2, paddingTop: 6 }}>
                      {fmtQ(sys.g)} · <span style={{ color: T.amb }}>{fmtQ(sys.d)}</span> · <span style={{ color: T.slt }}>{fmtQ(sys.s)}</span>
                    </div>
                    {cell("g")}{cell("d")}{cell("s")}{cell("lost")}{cell("nasht")}
                    <div style={{ textAlign: "right", paddingTop: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: netC }}>{!s.counted ? "—" : s.net > EPS ? "+" + fmtQ(s.net) : fmtQ(s.net)}</div>
                      {c.status !== "draft" && Number(i.value_out ?? i.est_value_out) > 0 && <div style={{ fontSize: 9.5, color: T.t4 }}>{inr(i.value_out ?? i.est_value_out)}</div>}
                    </div>
                    <div>
                      <input value={e.note ?? ""} disabled={!editable} onChange={(ev) => set(i.material_id, "note", ev.target.value)}
                        placeholder={s.differs ? t("warehouse.gt_note_ph_diff") : t("warehouse.gt_note_ph")}
                        style={{ ...inp, padding: "6px 8px", background: editable ? T.surface : T.surfaceB, borderColor: s.err && s.err.k === "note" ? T.red : T.b1 }} />
                      {s.err && editable && <div style={{ fontSize: 10.5, color: T.red, marginTop: 3 }}>{errText(s.err, i.unit)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${T.b1}`, padding: "10px 20px", background: T.surfaceB, flexShrink: 0 }}>
            {editable && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, whiteSpace: "nowrap" }}>{t("warehouse.gt_count_note")}</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("warehouse.gt_count_note_ph")} style={inp} />
              </div>
            )}
            {msg && <div style={{ marginBottom: 8, padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: msg.bad ? T.redL : T.grnL, color: msg.bad ? T.red : T.grn }}>{msg.text}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {money && (
                <span style={{ fontSize: 12, color: T.t2 }}>
                  {t(money.est ? "warehouse.gt_money_est" : "warehouse.gt_money", { out: inr(money.out), loss: inr(money.loss) })}
                </span>
              )}
              <div style={{ flex: 1 }} />
              {c.can_cancel && (
                <button disabled={busy} onClick={() => act("cancel", null, t("warehouse.gt_cancel_confirm", { no: c.count_no }))}
                  style={btn(T.surface, T.t3, T.b1)}>{t("warehouse.gt_cancel")}</button>
              )}
              {editable && <button disabled={busy || !dirty.size && note === (c.remarks || "")} onClick={() => save(false)} style={btn(T.surface, T.ind, T.ind)}>{busy ? t("warehouse.gt_saving") : t("warehouse.gt_save")}</button>}
              {editable && <button disabled={busy || errs > 0} onClick={submit} style={{ ...btn(errs ? T.b2 : T.ind), cursor: errs ? "not-allowed" : "pointer" }}>{t("warehouse.gt_submit")}</button>}
              {deciding && <button disabled={busy} onClick={async () => { const r = await askReason(t("warehouse.gt_reject_reason")); if (r) act("reject", { reason: r }); }}
                style={btn(T.surface, T.red, T.red)}>{t("warehouse.gt_reject")}</button>}
              {deciding && <button disabled={busy} onClick={async () => { const r = await askReason(t("warehouse.gt_send_back_reason")); if (r) act("send-back", { reason: r }); }}
                style={btn(T.surface, T.amb, T.amb)}>{t("warehouse.gt_send_back")}</button>}
              {deciding && <button disabled={busy} onClick={() => act("approve", null, t("warehouse.gt_approve_confirm", { no: c.count_no }))}
                style={btn(T.grn)}>{t("warehouse.gt_approve")}</button>}
            </div>
          </div>
        </>)}
      </div>
    </>
  );
}
const fmtNum = (v) => String(n3(v));
const Banner = ({ tone, children }) => {
  const m = { amb: [T.ambL, T.amb], red: [T.redL, T.red], blu: [T.bluL, T.blu] }[tone];
  return <div style={{ margin: "8px 20px 0", padding: "8px 11px", borderRadius: 7, background: m[0], color: m[1], fontSize: 12, fontWeight: 600 }}>{children}</div>;
};

// ── Nuksan report ────────────────────────────────────────────────
function LossReport() {
  const [to, setTo] = useState(istToday());
  const [from, setFrom] = useState(() => new Date(Date.now() + 5.5 * 3600000 - 30 * 86400000).toISOString().slice(0, 10));
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    setD(null);
    api.get(`/warehouse/loss-report?from=${from}&to=${to}`).then((r) => {
      if (alive) setD(r.success && r.data ? r.data : { rows: [], totals: {}, _err: r.message || t("warehouse.gt_fail") });
    });
    return () => { alive = false; };
  }, [from, to]);
  const COLS = [
    ["kharab_added", t("warehouse.gt_r_kharab")], ["kabad_added", t("warehouse.gt_r_kabad")], ["gum", t("warehouse.gt_h_lost")],
    ["nasht", t("warehouse.gt_h_destroyed")], ["excess", t("warehouse.gt_r_excess")], ["value_out", t("warehouse.gt_r_value_out"), 1],
    ["loss_value", t("warehouse.gt_r_loss"), 1], ["sold_qty", t("warehouse.gt_r_sold")], ["sale_amount", t("warehouse.gt_r_sale"), 1],
    ["discarded_qty", t("warehouse.gt_r_discarded")], ["repaired_qty", t("warehouse.gt_r_repaired")],
    ["repair_out_qty", t("warehouse.gt_r_repair_out")], ["repair_cost", t("warehouse.gt_r_repair_cost"), 1],
  ];
  const grid = `1.4fr repeat(${COLS.length}, minmax(62px, 1fr))`;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap", fontSize: 12, color: T.t2 }}>
        {t("warehouse.gt_from")} <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inp, width: 150 }} />
        {t("warehouse.gt_to")} <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inp, width: 150 }} />
        <span style={{ fontSize: 11, color: T.t3 }}>{t("warehouse.gt_report_hint")}</span>
      </div>
      {d && d._err && <div style={{ padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 10 }}>{d._err}</div>}
      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "auto", background: T.surface }}>
        <div style={{ minWidth: 1080 }}>
          <div style={{ display: "grid", gridTemplateColumns: grid, gap: 6, padding: "9px 14px", background: "#1E293B" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase" }}>{t("warehouse.gt_h_material")}</div>
            {COLS.map(([k, l]) => <div key={k} style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase", textAlign: "right" }}>{l}</div>)}
          </div>
          {!d && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("warehouse.gt_loading")}</div>}
          {d && !d._err && d.rows.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("warehouse.gt_report_empty")}</div>}
          {d && d.rows.map((r, i) => (
            <div key={r.material_id} style={{ display: "grid", gridTemplateColumns: grid, gap: 6, padding: "8px 14px", borderTop: `1px solid ${T.b1}`, background: i % 2 ? T.surfaceB : T.surface }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{r.material_name} <span style={{ color: T.t4, fontWeight: 400 }}>{r.unit}</span></div>
              {COLS.map(([k, , money]) => (
                <div key={k} style={{ fontSize: 12, textAlign: "right", color: Number(r[k]) ? (k === "loss_value" ? T.red : T.t1) : T.b2, fontWeight: money ? 700 : 500 }}>
                  {Number(r[k]) ? (money ? inr(r[k]) : fmtQ(r[k])) : "—"}
                </div>
              ))}
            </div>
          ))}
          {d && d.rows.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: grid, gap: 6, padding: "9px 14px", background: "#0F172A" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase" }}>{t("warehouse.gt_total")}</div>
              {COLS.map(([k, , money]) => (
                <div key={k} style={{ fontSize: 12, fontWeight: 800, color: "#fff", textAlign: "right" }}>{money ? inr(d.totals[k]) : ""}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Kharab / Kabad nikalo — form
// ════════════════════════════════════════════════════════════════
const BUCKETS = ["damaged", "scrap", "repair"];
const bucketQty = (m, b) => Number(b === "damaged" ? m.qty_damaged : b === "scrap" ? m.qty_scrap : m.qty_repair) || 0;
const bucketName = (b) => (b === "damaged" ? t("warehouse.gt_b_damaged") : b === "scrap" ? t("warehouse.gt_b_scrap") : t("warehouse.gt_b_repair"));
const ACTIONS = { damaged: ["sold", "discarded", "repaired", "to_scrap", "repair_out"], scrap: ["sold", "discarded"], repair: ["repaired", "to_scrap", "discarded"] };
const actionName = (b, a) => ({
  sold: t("warehouse.gt_a_sold"), discarded: t("warehouse.gt_a_discarded"),
  repaired: b === "repair" ? t("warehouse.gt_a_repair_back") : t("warehouse.gt_a_repaired"),
  to_scrap: t("warehouse.gt_a_to_scrap"), repair_out: t("warehouse.gt_a_repair_out"),
})[a] || a;
let _uid = 0;
const newLine = () => ({ uid: ++_uid, mid: "", bucket: "", action: "", qty: "", sale: "", party_id: "", party_name: "", ret: "", cost: "", note: "" });

export function DisposalModal({ stock, onClose, onSaved }) {
  const [lines, setLines] = useState(() => [newLine()]);
  const [remarks, setRemarks] = useState("");
  const [parties, setParties] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const mats = useMemo(() => (stock || []).filter((m) => BUCKETS.some((b) => bucketQty(m, b) > EPS)), [stock]);
  const byId = useMemo(() => new Map(mats.map((m) => [String(m.id), m])), [mats]);
  const needParties = lines.some((l) => l.action === "repair_out");
  useEffect(() => {
    if (!needParties || parties) return;
    api.get("/warehouse/disposal-parties").then((r) => setParties(r.success ? r.data || [] : []));
  }, [needParties, parties]);
  const upd = (uid, patch) => setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));

  // Ek material ki do line ek hi bucket se — dono ka jod bucket se zyada na ho.
  const used = {};
  for (const l of lines) if (l.mid && l.bucket) used[l.mid + "|" + l.bucket] = (used[l.mid + "|" + l.bucket] || 0) + (Number(l.qty) || 0);
  const lineErr = (l) => {
    const m = byId.get(String(l.mid));
    if (!m || !l.bucket || !l.action || !(Number(l.qty) > 0)) return t("warehouse.gt_d_incomplete");
    if (used[l.mid + "|" + l.bucket] > bucketQty(m, l.bucket) + EPS) return t("warehouse.gt_d_over", { have: fmtQ(bucketQty(m, l.bucket)), unit: m.unit || "" });
    if (l.action === "repair_out" && !l.party_id && !l.party_name.trim()) return t("warehouse.gt_d_vendor");
    return "";
  };
  const allOk = lines.length > 0 && lines.every((l) => !lineErr(l));

  const save = async () => {
    if (!allOk || saving) return;
    setSaving(true); setMsg("");
    const r = await api.post("/warehouse/disposals", {
      remarks: remarks.trim() || null,
      items: lines.map((l) => ({
        material_id: Number(l.mid), from_bucket: l.bucket, action: l.action, qty: Number(l.qty),
        sale_amount: l.action === "sold" && !blank(l.sale) ? Number(l.sale) : null,
        party_id: l.action === "repair_out" ? Number(l.party_id) || null : null,
        party_name: l.action === "sold" || (l.action === "repair_out" && !l.party_id) ? l.party_name.trim() || null : null,
        expected_return_date: l.action === "repair_out" ? l.ret || null : null,
        repair_cost: l.bucket === "repair" && !blank(l.cost) ? Number(l.cost) : null,
        note: l.note.trim() || null,
      })),
    });
    setSaving(false);
    if (!r.success) return setMsg(r.message || t("warehouse.gt_fail"));
    onSaved && onSaved(r.message);
    onClose();
  };

  const lbl = (x) => <div style={{ fontSize: 10, fontWeight: 600, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{x}</div>;
  return (
    <Modal title={t("warehouse.gt_d_title")} sub={t("warehouse.gt_d_sub")} onClose={onClose} width={720}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b1)}>{t("warehouse.gt_close")}</button>
        <button onClick={save} disabled={!allOk || saving} style={{ ...btn(allOk ? T.ind : T.b2), cursor: allOk ? "pointer" : "not-allowed" }}>
          {saving ? t("warehouse.gt_saving") : t("warehouse.gt_d_send")}
        </button>
      </>}>
      {mats.length === 0 && <div style={{ padding: 14, textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("warehouse.gt_d_none")}</div>}
      {mats.length > 0 && lines.map((l, idx) => {
        const m = byId.get(String(l.mid));
        const er = lineErr(l);
        return (
          <div key={l.uid} style={{ border: `1px solid ${T.b1}`, borderRadius: 9, padding: 11, marginBottom: 10, background: T.surfaceB }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1.3fr 90px 26px", gap: 8, alignItems: "end" }}>
              <div>{lbl(t("warehouse.gt_h_material"))}
                <select value={l.mid} onChange={(e) => upd(l.uid, { mid: e.target.value, bucket: "", action: "" })} style={inp}>
                  <option value="">{t("warehouse.gt_d_pick_mat")}</option>
                  {mats.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — {BUCKETS.filter((b) => bucketQty(x, b) > EPS).map((b) => bucketName(b) + " " + fmtQ(bucketQty(x, b))).join(" · ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>{lbl(t("warehouse.gt_d_from"))}
                <select value={l.bucket} disabled={!m} onChange={(e) => upd(l.uid, { bucket: e.target.value, action: "" })} style={inp}>
                  <option value="">—</option>
                  {m && BUCKETS.filter((b) => bucketQty(m, b) > EPS).map((b) => <option key={b} value={b}>{bucketName(b)} ({fmtQ(bucketQty(m, b))})</option>)}
                </select>
              </div>
              <div>{lbl(t("warehouse.gt_d_action"))}
                <select value={l.action} disabled={!l.bucket} onChange={(e) => upd(l.uid, { action: e.target.value })} style={inp}>
                  <option value="">—</option>
                  {(ACTIONS[l.bucket] || []).map((a) => <option key={a} value={a}>{actionName(l.bucket, a)}</option>)}
                </select>
              </div>
              <div>{lbl(t("warehouse.gt_d_qty") + (m ? " (" + (m.unit || "") + ")" : ""))}
                <input type="number" min="0" value={l.qty} onChange={(e) => upd(l.uid, { qty: e.target.value })} style={{ ...inp, textAlign: "right" }} />
              </div>
              <button onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.uid !== l.uid) : ls))} title={t("warehouse.gt_d_remove")}
                style={{ height: 32, border: "none", background: "none", color: T.t4, fontSize: 17, cursor: lines.length > 1 ? "pointer" : "default" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
              {l.action === "sold" && <div>{lbl(t("warehouse.gt_d_sale"))}<input type="number" min="0" value={l.sale} onChange={(e) => upd(l.uid, { sale: e.target.value })} placeholder="₹" style={inp} /></div>}
              {l.action === "sold" && <div>{lbl(t("warehouse.gt_d_buyer"))}<input value={l.party_name} onChange={(e) => upd(l.uid, { party_name: e.target.value })} placeholder={t("warehouse.gt_optional")} style={inp} /></div>}
              {l.action === "repair_out" && <div>{lbl(t("warehouse.gt_d_vendor_l"))}
                {/* Party list khaali ho (nayi company) to naam likh do — server dono maanta hai. */}
                {parties && parties.length === 0
                  ? <input value={l.party_name} onChange={(e) => upd(l.uid, { party_name: e.target.value })} placeholder={t("warehouse.gt_d_vendor_name")} style={inp} />
                  : <select value={l.party_id} onChange={(e) => upd(l.uid, { party_id: e.target.value })} style={inp}>
                      <option value="">{parties ? t("warehouse.gt_d_pick_vendor") : t("warehouse.gt_loading")}</option>
                      {(parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>}</div>}
              {l.action === "repair_out" && <div>{lbl(t("warehouse.gt_d_return"))}<input type="date" value={l.ret} onChange={(e) => upd(l.uid, { ret: e.target.value })} style={inp} /></div>}
              {l.bucket === "repair" && l.action && <div>{lbl(t("warehouse.gt_d_cost"))}<input type="number" min="0" value={l.cost} onChange={(e) => upd(l.uid, { cost: e.target.value })} placeholder="₹" style={inp} /></div>}
              <div style={{ gridColumn: l.action === "sold" || l.action === "repair_out" ? "auto" : "1 / -1" }}>{lbl(t("warehouse.gt_h_note"))}
                <input value={l.note} onChange={(e) => upd(l.uid, { note: e.target.value })} placeholder={t("warehouse.gt_optional")} style={inp} /></div>
            </div>
            {er && (l.mid || l.qty) && <div style={{ fontSize: 11, color: T.red, marginTop: 6 }}>{t("warehouse.gt_d_line_n", { n: idx + 1 })}: {er}</div>}
          </div>
        );
      })}
      {mats.length > 0 && <button onClick={() => setLines((ls) => [...ls, newLine()])} style={{ ...btn(T.surface, T.ind, T.ind), marginBottom: 10 }}>{t("warehouse.gt_d_add_line")}</button>}
      {mats.length > 0 && <>
        {lbl(t("warehouse.gt_remarks"))}
        <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t("warehouse.gt_optional")} style={inp} />
        <div style={{ fontSize: 11, color: T.t3, marginTop: 8 }}>{t("warehouse.gt_d_hint")}</div>
      </>}
      {msg && <div style={{ marginTop: 10, padding: "8px 11px", background: T.redL, borderRadius: 6, color: T.red, fontSize: 12 }}>{msg}</div>}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// Stock tab ke neeche — nikasi ki list (approve yahin) aur "Repair me"
// ════════════════════════════════════════════════════════════════
const dispSt = (s) => ({
  pending:   { l: t("warehouse.gt_st_pending"),   c: T.amb, bg: T.ambL },
  approved:  { l: t("warehouse.gt_st_approved"),  c: T.grn, bg: T.grnL },
  rejected:  { l: t("warehouse.gt_st_rejected"),  c: T.red, bg: T.redL },
  cancelled: { l: t("warehouse.gt_st_cancelled"), c: T.t4,  bg: T.sltL },
})[s] || { l: s, c: T.t3, bg: T.sltL };

export function DisposalsPanel({ canApprove, meId, isAdmin, refreshKey, onChanged }) {
  const [list, setList] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const load = useCallback(() => {
    api.get("/warehouse/disposals").then((r) => setList(r.success ? r.data || [] : []));
    api.get("/warehouse/repairs").then((r) => setRepairs(r.success ? r.data || [] : []));
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const act = async (d, path, body, confirmText) => {
    if (confirmText && !(await window.confirmAsync(confirmText))) return;
    setBusy(true); setMsg(null);
    const r = await api.post(`/warehouse/disposals/${d.id}/${path}`, body || {});
    setBusy(false);
    setMsg({ bad: !r.success, text: r.message || (r.success ? "" : t("warehouse.gt_fail")) });
    if (r.success) { load(); onChanged && onChanged(); }
  };
  const reject = async (d) => {
    const reason = await window.promptAsync(t("warehouse.gt_reject_reason"), "");
    if (reason == null) return;
    if (!String(reason).trim()) return setMsg({ bad: true, text: t("warehouse.gt_reason_needed") });
    act(d, "reject", { reason: String(reason).trim() });
  };

  if (!list || (list.length === 0 && repairs.length === 0)) return null;
  const pending = list.filter((d) => d.status === "pending");
  const rest = list.filter((d) => d.status !== "pending");
  const shown = [...pending, ...(showAll ? rest : rest.slice(0, 5))];
  const today = istToday();
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>
        {t("warehouse.gt_d_list")} {pending.length > 0 && <span style={{ color: T.amb }}>· {t("warehouse.gt_d_pending_n", { n: pending.length })}</span>}
      </div>
      {msg && msg.text && <div style={{ marginBottom: 8, padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: msg.bad ? T.redL : T.grnL, color: msg.bad ? T.red : T.grn }}>{msg.text}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 10 }}>
        {shown.map((d) => {
          const s = dispSt(d.status);
          const mine = Number(d.created_by) === Number(meId) || isAdmin;
          return (
            <div key={d.id} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${s.c}`, borderRadius: 9, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "monospace", color: T.t1 }}>{d.disposal_no}</span>
                <Chip s={s} />
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10.5, color: T.t4 }}>{fmtDate(d.date)}{d.created_by_name ? " · " + d.created_by_name : ""}</span>
              </div>
              {(d.items || []).map((i, k) => (
                <div key={k} style={{ fontSize: 11.5, color: T.t2, padding: "2px 0" }}>
                  <b>{i.material_name}</b> {fmtQ(i.qty)} {i.unit || ""} · {bucketName(i.from_bucket)} → {actionName(i.from_bucket, i.action)}
                  {i.party_name ? " · " + i.party_name : ""}
                  {i.sale_amount != null ? " · " + inr(i.sale_amount) : ""}
                  {i.repair_cost != null ? " · " + t("warehouse.gt_d_cost_x", { amt: inr(i.repair_cost) }) : ""}
                </div>
              ))}
              {d.reject_reason && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{t("warehouse.gt_reason_x", { reason: d.reject_reason })}</div>}
              {d.status === "pending" && (canApprove || mine) && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                  {mine && <button disabled={busy} onClick={() => act(d, "cancel", null, t("warehouse.gt_cancel_confirm", { no: d.disposal_no }))} style={{ ...btn(T.surface, T.t3, T.b1), padding: "5px 10px", fontSize: 11.5 }}>{t("warehouse.gt_cancel")}</button>}
                  {canApprove && <button disabled={busy} onClick={() => reject(d)} style={{ ...btn(T.surface, T.red, T.red), padding: "5px 10px", fontSize: 11.5 }}>{t("warehouse.gt_reject")}</button>}
                  {canApprove && <button disabled={busy} onClick={() => act(d, "approve", null, t("warehouse.gt_approve_confirm", { no: d.disposal_no }))} style={{ ...btn(T.grn), padding: "5px 12px", fontSize: 11.5 }}>{t("warehouse.gt_approve")}</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {rest.length > 5 && <button onClick={() => setShowAll((x) => !x)} style={{ ...btn(T.surface, T.t3, T.b1), marginTop: 8, fontSize: 11.5 }}>{showAll ? t("warehouse.gt_show_less") : t("warehouse.gt_show_all", { n: rest.length })}</button>}

      {repairs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>{t("warehouse.gt_repair_list")}</div>
          <div style={{ border: `1px solid ${T.b1}`, borderRadius: 9, overflow: "hidden", background: T.surface }}>
            {repairs.flatMap((m) => (m.lines.length ? m.lines : [{ id: "x" + m.material_id, qty_outstanding: m.qty_repair }]).map((l) => ({ m, l }))).map(({ m, l }, i) => {
              const late = l.expected_return_date && String(l.expected_return_date).slice(0, 10) < today;
              return (
                <div key={m.material_id + "-" + l.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 90px 100px 120px", gap: 8, padding: "8px 12px", borderTop: i ? `1px solid ${T.b1}` : "none", fontSize: 12, alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: T.t1 }}>{m.material_name}</div>
                  <div style={{ color: T.t2 }}>{l.party_name || "—"}</div>
                  <div style={{ textAlign: "right", fontWeight: 700 }}>{fmtQ(l.qty_outstanding)} {m.unit || ""}</div>
                  <div style={{ color: T.t3 }}>{l.sent_at ? t("warehouse.gt_sent_on", { d: fmtDate(l.sent_at) }) : "—"}</div>
                  <div style={{ color: late ? T.amb : T.t3, fontWeight: late ? 700 : 400 }}>
                    {l.expected_return_date ? (late ? t("warehouse.gt_overdue", { d: fmtDate(l.expected_return_date) }) : t("warehouse.gt_due_on", { d: fmtDate(l.expected_return_date) })) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal shell (is file ka apna) ─────────────────────────────────
function Modal({ title, sub, onClose, children, width = 520, footer }) {
  return (
    <>
      <BackClose onClose={onClose} />
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1500 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: T.surface, borderRadius: 14, width: `min(${width}px,95vw)`,
        maxHeight: "92vh", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", zIndex: 1501, overflow: "hidden", fontFamily: "'Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
        <div style={{ background: T.sb, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{title}</div>
            {sub && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 18 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>{children}</div>
        {footer && <div style={{ borderTop: `1px solid ${T.b1}`, padding: "10px 18px", background: T.surfaceB, flexShrink: 0, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </>
  );
}
