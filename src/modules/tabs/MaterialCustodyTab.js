// ════════════════════════════════════════════════════════════════
// MaterialCustodyTab — Project → Material → "Material Zimmedari" (14 Oct 2026)
//
// Store se is site par gaye issue jinka Zimmedar hai: kiske paas kitna,
// kab se, kya haal. Row kholo → har line ka Diya / Lag gaya / Wapas /
// Kami-Kharab / Baaki, aur:
//   • zimmedar: "Mil gaya" (accept), "Wapas karo", "Kami / Kharab" (photo zaroori)
//   • Lag gaya = task / Material se likhi used entry (kisi ne bhi) — zimmedar
//     sirf dekhta hai; galat lage to "Flag" ya "Poochho" (likhne wale ko ghanti)
//   • pending: store wala "Store me mila", Admin / Warehouse approve wala Kami approve
// Sab faisle server ke can_* se (GET /material-custody/issue/:id).
// Sirf Projects module ka — doosre module ke saath share nahi (module independence).
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import uploadManager from "../../utils/uploadManager";
import { T, fmtN } from "../shared/tokens";
import { Pill } from "../shared/ui";
import { t } from "../../i18n";

const n3 = (v) => fmtN(Math.round((Number(v) || 0) * 1000) / 1000);
const ST = {
  accept_pending: { k: "custody.st_accept_pending", c: T.amb, bg: T.ambL },
  open:           { k: "custody.st_open",           c: T.blu, bg: T.bluL },
  closed:         { k: "custody.st_closed",         c: T.slt, bg: T.sltL },
};
const MV = { pending: "custody.mv_pending", done: "custody.mv_done", approved: "custody.mv_approved", rejected: "custody.mv_rejected" };
const btn = (c, solid) => ({ padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${c}`, background: solid ? c : "white", color: solid ? "white" : c });
const inp = { padding: "6px 9px", borderRadius: 6, border: `1px solid ${T.b2}`, fontSize: 12, fontFamily: "inherit" };

function MoveForm({ line, kind, onDone, onCancel }) {
  const [qty, setQty] = useState("");
  const [to, setTo] = useState("site");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const pick = (e) => {
    Array.from(e.target.files || []).forEach((file) => {
      setBusy((b) => b + 1);
      uploadManager.add({ file, folder: "gb_buildcon/custody", label: t("custody.title") + ": " + file.name,
        onDone: (url) => { setPhotos((p) => [...p, url]); setBusy((b) => b - 1); },
        onError: () => setBusy((b) => b - 1) });
    });
    e.target.value = "";
  };
  const save = async () => {
    setSaving(true); setErr("");
    const body = { qty: Number(qty), note, photo_urls: photos, ...(kind === "return" ? { to } : {}) };
    const r = await api.post(`/material-custody/line/${line.id}/${kind}`, body).catch((e) => ({ message: e.message }));
    setSaving(false);
    if (r && r.success) onDone(r.message); else setErr((r && r.message) || t("custody.save_fail"));
  };
  const ok = Number(qty) > 0 && photos.length > 0 && !busy && (kind === "return" || note.trim());
  return (
    <div style={{ padding: 10, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, marginTop: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 6 }}>
        {t(kind === "return" ? "custody.btn_return" : "custody.btn_short")} — {line.material_name} ({t("custody.khula_n", { n: n3(line.khula), unit: line.unit || "" })})
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t("custody.qty")} style={{ ...inp, width: 90 }} />
        {kind === "return" && (
          <select value={to} onChange={(e) => setTo(e.target.value)} style={inp}>
            <option value="site">{t("custody.to_site")}</option>
            <option value="store">{t("custody.to_store")}</option>
          </select>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t(kind === "return" ? "custody.note_ph" : "custody.reason_ph")} style={{ ...inp, flex: 1, minWidth: 160 }} />
        <label style={{ ...btn(T.blu), display: "inline-flex", alignItems: "center", gap: 4 }}>
          📷 {photos.length ? t("custody.n_photos", { n: photos.length }) : t("custody.photo")}{busy ? " …" : ""}
          <input type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={pick} />
        </label>
      </div>
      {err && <div style={{ color: T.red, fontSize: 11.5, marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={btn(T.ind, true)} disabled={!ok || saving} onClick={save}>{saving ? t("common.saving") : t("common.save")}</button>
        <button style={btn(T.slt)} onClick={onCancel}>{t("common.cancel")}</button>
        {!photos.length && <span style={{ fontSize: 11, color: T.t4, alignSelf: "center" }}>{t("custody.photo_required")}</span>}
      </div>
    </div>
  );
}

// "Used mark karo" (15 Oct 2026) — isi line se task me used. Wahi task used-log
// endpoint (task_used_log me custody_line_id ke saath); qty Baaki (khula) tak,
// unit line ki. Zimmedar hamesha; baaki Material Entry wale (server tay karta hai).
function UsedForm({ line, projectId, onDone, onCancel }) {
  const [tasks, setTasks] = useState(null);
  const [taskId, setTaskId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/tasks?project_id=" + projectId).then((r) => setTasks(r.success ? r.data || [] : [])).catch(() => setTasks([]));
  }, [projectId]);
  const pick = (e) => {
    Array.from(e.target.files || []).forEach((file) => {
      setBusy((b) => b + 1);
      uploadManager.add({ file, folder: "gb_buildcon/tasks", label: t("custody.title") + ": " + file.name,
        onDone: (url) => { setPhotos((p) => [...p, url]); setBusy((b) => b - 1); },
        onError: () => setBusy((b) => b - 1) });
    });
    e.target.value = "";
  };
  const over = Number(qty) > Number(line.khula) + 0.0005;
  const save = async () => {
    setSaving(true); setErr("");
    const body = { material_name: line.material_name, used_qty: Number(qty), unit: line.unit,
      remark: note, project_id: projectId, custody_line_id: line.id, photo_urls: photos };
    const r = await api.post(`/tasks/${taskId}/used-log`, body).catch((e) => ({ message: e.message }));
    if (r && r.success) { setSaving(false); onDone(t("custody.used_saved")); return; }
    // Hissa B: line kisi aur task ki — manzoori maango (zimmedar / Admin).
    const asked = await askCustodyApproval(r, { task_id: Number(taskId), qty: Number(qty), unit: line.unit, remark: note, photo_urls: photos, via: "task" });
    setSaving(false);
    if (asked && asked.asked) { if (asked.ok) onDone(asked.message); else setErr(asked.message); return; }
    if (!asked) setErr((r && r.message) || t("custody.save_fail"));
  };
  const ok = taskId && Number(qty) > 0 && !over && !busy;
  return (
    <div style={{ padding: 10, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, marginTop: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 6 }}>
        {t("custody.btn_mark_used")} — {line.material_name} ({t("custody.khula_n", { n: n3(line.khula), unit: line.unit || "" })})
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)} style={{ ...inp, minWidth: 200, flex: 1 }}>
          <option value="">{tasks === null ? t("common.loading") : t("custody.task_pick")}</option>
          {(tasks || []).map((tk) => <option key={tk.id} value={tk.id}>{[tk.task_no, tk.name].filter(Boolean).join(" · ")}</option>)}
        </select>
        <input type="number" min="0" max={line.khula} value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t("custody.qty")} style={{ ...inp, width: 90, borderColor: over ? T.red : T.b2 }} />
        <span style={{ fontSize: 12, color: T.t3, fontWeight: 700 }}>🔒 {line.unit}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("custody.used_note_ph")} style={{ ...inp, flex: 1, minWidth: 160 }} />
        <label style={{ ...btn(T.blu), display: "inline-flex", alignItems: "center", gap: 4 }}>
          📷 {photos.length ? t("custody.n_photos", { n: photos.length }) : t("custody.photo")}{busy ? " …" : ""}
          <input type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={pick} />
        </label>
      </div>
      {over && <div style={{ color: T.red, fontSize: 11.5, marginTop: 6 }}>{t("custody.qty_exceeds_left", { n: n3(line.khula), unit: line.unit || "" })}</div>}
      {err && <div style={{ color: T.red, fontSize: 11.5, marginTop: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={btn(T.ind, true)} disabled={!ok || saving} onClick={save}>{saving ? t("common.saving") : t("common.save")}</button>
        <button style={btn(T.slt)} onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

function UsedRow({ u, canFlag, onChanged }) {
  const [mode, setMode] = useState(null);     // flag | ask | reply:<id>
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const send = async () => {
    const [kind, pid] = mode.split(":");
    const r = await api.post(`/material-custody/used/${u.id}/notes`, { kind, note, parent_id: pid ? Number(pid) : undefined }).catch((e) => ({ message: e.message }));
    if (r && r.success) { setMode(null); setNote(""); setErr(""); onChanged(); } else setErr((r && r.message) || t("custody.save_fail"));
  };
  const resolve = async (id) => { const r = await api.post(`/material-custody/notes/${id}/resolve`, {}); if (r.success) onChanged(); else setErr(r.message); };
  const threads = (u.notes || []).filter((n) => !n.parent_id);
  return (
    <div style={{ padding: "8px 0", borderTop: `1px solid ${T.b1}` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
        <b style={{ color: T.t1 }}>{n3(u.used_qty)} {u.unit}</b>
        <span style={{ color: T.t3 }}>{u.task_name || "—"}</span>
        <span style={{ color: T.t4 }}>{t("custody.by_on", { by: u.by_name || "—", date: String(u.used_date || "").slice(0, 10) })}</span>
        {u.remark && <span style={{ color: T.t4 }}>· {u.remark}</span>}
        {canFlag && (
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button style={btn(T.red)} onClick={() => setMode("flag")}>{t("custody.btn_flag")}</button>
            <button style={btn(T.blu)} onClick={() => setMode("ask")}>{t("custody.btn_ask")}</button>
          </span>
        )}
      </div>
      {threads.map((th) => (
        <div key={th.id} style={{ marginTop: 6, marginLeft: 12, padding: "6px 9px", borderLeft: `3px solid ${th.kind === "flag" ? T.red : T.blu}`, background: T.surfaceB, fontSize: 11.5 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <b style={{ color: th.kind === "flag" ? T.red : T.blu }}>{t(th.kind === "flag" ? "custody.flag_tag" : "custody.ask_tag")}</b>
            <span style={{ color: T.t2 }}>{th.by_name}: {th.note}</span>
            <span style={{ marginLeft: "auto", color: th.status === "resolved" ? T.grn : T.amb, fontWeight: 700 }}>
              {t(th.status === "resolved" ? "custody.resolved_tag" : "custody.open_tag")}
            </span>
          </div>
          {(u.notes || []).filter((r) => Number(r.parent_id) === Number(th.id)).map((r) => (
            <div key={r.id} style={{ color: T.t3, marginTop: 3 }}>↳ {r.by_name}: {r.note}</div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button style={btn(T.slt)} onClick={() => setMode("reply:" + th.id)}>{t("custody.btn_reply")}</button>
            {canFlag && th.status !== "resolved" && <button style={btn(T.grn)} onClick={() => resolve(th.id)}>{t("custody.btn_resolve")}</button>}
          </div>
        </div>
      ))}
      {mode && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, marginLeft: 12 }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inp, flex: 1 }}
            placeholder={t(mode === "flag" ? "custody.flag_ph" : mode === "ask" ? "custody.ask_ph" : "custody.reply_ph")} />
          <button style={btn(T.ind, true)} disabled={!note.trim()} onClick={send}>{t("custody.btn_send")}</button>
          <button style={btn(T.slt)} onClick={() => { setMode(null); setNote(""); }}>{t("common.cancel")}</button>
        </div>
      )}
      {err && <div style={{ color: T.red, fontSize: 11.5, marginTop: 4 }}>{err}</div>}
    </div>
  );
}

// v2 (24 Oct 2026, Prafull): "Mil gaya" = site par receive. Button Material tab
// ka Record GRN (Ordered → "Issues from Store" card) kholta hai — wahi photo /
// rec slip ke saath receive; receive hote hi zimmedari Chalu.
function CustodyDrawer({ issueId, onClose, onChanged, onReceive }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(null);      // { line, kind }
  const [rejectId, setRejectId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const load = useCallback(() => {
    api.get("/material-custody/issue/" + issueId).then((r) => { if (r.success) { setD(r.data); setErr(""); } else setErr(r.message); })
      .catch((e) => setErr(e.message));
  }, [issueId]);
  useEffect(() => { load(); }, [load]);
  const after = (m) => { setMsg(m || ""); setForm(null); setRejectId(null); setRejectNote(""); load(); onChanged(); };
  const post = async (url, body) => {
    const r = await api.post(url, body || {}).catch((e) => ({ message: e.message }));
    if (r && r.success) after(r.message); else setErr((r && r.message) || t("custody.save_fail"));
  };
  const st = d ? ST[d.custody_status] || ST.open : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,.35)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ width: "min(760px, 100%)", height: "100%", background: "white", overflowY: "auto", padding: "16px 18px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{t("custody.title")} {d ? "· " + d.issue_no : ""}</div>
          {st && <Pill label={t(st.k)} c={st.c} bg={st.bg} />}
          <button style={{ ...btn(T.slt), marginLeft: "auto" }} onClick={onClose}>✕</button>
        </div>
        {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
        {msg && <div style={{ color: T.grn, fontSize: 12, marginBottom: 8 }}>{msg}</div>}
        {!d && !err && <div style={{ color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>}
        {d && (<>
          <div style={{ fontSize: 12, color: T.t2, marginBottom: 10, lineHeight: 1.6 }}>
            {t("custody.zimmedar")}: <b>{d.custodian_name}</b>{d.party_name ? " · " + d.party_name : ""} ·{" "}
            {t("custody.since_days", { n: d.days })} · {d.warehouse_name || ""}
            {d.task_name && <> · <b>{t("custody.use_task", { task: d.task_name })}</b></>}
            {d.custody_accepted_at && <> · {t("custody.accepted_on", { date: String(d.custody_accepted_at).slice(0, 10) })}</>}
          </div>
          {d.can_accept && (
            <div style={{ padding: 10, background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 8, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: T.t2, flex: 1 }}>{t("custody.accept_hint")}</span>
              {onReceive
                ? <button style={btn(T.grn, true)} onClick={() => { onClose(); onReceive(d); }}>{t("custody.btn_receive")}</button>
                : <button style={btn(T.grn, true)} onClick={() => post(`/material-custody/issue/${d.id}/accept`)}>{t("custody.btn_accept")}</button>}
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ color: T.t4, textAlign: "right" }}>
              <th style={{ textAlign: "left", padding: "4px 0" }}>{t("common.material")}</th>
              {["custody.col_diya", "custody.col_lag", "custody.col_wapas", "custody.col_kami", "custody.col_baaki"].map((k) => <th key={k} style={{ padding: 4 }}>{t(k)}</th>)}
              <th />
            </tr></thead>
            <tbody>{d.lines.map((l) => (
              <React.Fragment key={l.id}>
                <tr style={{ borderTop: `1px solid ${T.b1}`, textAlign: "right" }}>
                  <td style={{ textAlign: "left", padding: "6px 0", fontWeight: 700, color: T.t1 }}>{l.material_name} <span style={{ color: T.t4, fontWeight: 400 }}>{l.unit}</span></td>
                  <td style={{ padding: 4 }}>{n3(l.diya)}</td><td style={{ padding: 4 }}>{n3(l.lag_gaya)}</td>
                  <td style={{ padding: 4 }}>{n3(l.wapas)}</td><td style={{ padding: 4 }}>{n3(l.kami)}</td>
                  <td style={{ padding: 4, fontWeight: 800, color: l.baaki > 0 ? T.amb : T.t3 }}>{n3(l.baaki)}
                    {l.pending > 0 && <div style={{ fontSize: 10, color: T.t4, fontWeight: 500 }}>{t("custody.pending_n", { n: n3(l.pending) })}</div>}</td>
                  <td style={{ padding: 4, whiteSpace: "nowrap" }}>
                    {d.can_mark_used && l.khula > 0 && (<>
                      <button style={btn(T.grn)} onClick={() => setForm({ line: l, kind: "used" })}>{t("custody.btn_mark_used")}</button>{" "}
                    </>)}
                    {d.can_act && l.khula > 0 && (<>
                      <button style={btn(T.blu)} onClick={() => setForm({ line: l, kind: "return" })}>{t("custody.btn_return")}</button>{" "}
                      <button style={btn(T.red)} onClick={() => setForm({ line: l, kind: "short" })}>{t("custody.btn_short")}</button>
                    </>)}
                  </td>
                </tr>
                {form && form.line.id === l.id && (
                  <tr><td colSpan={7}>{form.kind === "used"
                    ? <UsedForm line={l} projectId={d.project_id} onDone={after} onCancel={() => setForm(null)} />
                    : <MoveForm line={l} kind={form.kind} onDone={after} onCancel={() => setForm(null)} />}</td></tr>
                )}
              </React.Fragment>
            ))}</tbody>
          </table>
          {d.party_name && (
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6 }}>{t("custody.value_line", { baaki: fmtN(d.baaki_value), kami: fmtN(d.kami_value) })}</div>
          )}

          {d.moves.length > 0 && (<>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", margin: "16px 0 6px" }}>{t("custody.moves_title")}</div>
            {d.moves.map((m) => {
              const canDecide = m.status === "pending" && (m.kind === "short" ? d.can_approve_short : d.can_receive_return);
              return (
                <div key={m.id} style={{ padding: "7px 0", borderTop: `1px solid ${T.b1}`, fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b>{t(m.kind === "short" ? "custody.kind_short" : m.to_place === "store" ? "custody.kind_return_store" : "custody.kind_return_site")}</b>
                    <span>{m.material_name} {n3(m.qty)} {m.unit}</span>
                    <span style={{ color: T.t4 }}>{m.by_name}{m.note ? " · " + m.note : ""}</span>
                    {(m.photos || []).map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.blu }}>📷{i + 1}</a>)}
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: m.status === "pending" ? T.amb : m.status === "rejected" ? T.red : T.grn }}>{t(MV[m.status] || "custody.mv_pending")}</span>
                  </div>
                  {m.decide_note && <div style={{ color: T.t4, fontSize: 11 }}>{m.decided_by_name}: {m.decide_note}</div>}
                  {canDecide && (
                    <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                      <button style={btn(T.grn, true)} onClick={() => post(`/material-custody/move/${m.id}/approve`)}>{t(m.kind === "short" ? "custody.btn_approve" : "custody.btn_store_received")}</button>
                      {rejectId === m.id ? (<>
                        <input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("custody.reject_ph")} style={{ ...inp, flex: 1 }} />
                        <button style={btn(T.red, true)} disabled={!rejectNote.trim()} onClick={() => post(`/material-custody/move/${m.id}/reject`, { note: rejectNote })}>{t("custody.btn_reject")}</button>
                      </>) : <button style={btn(T.red)} onClick={() => setRejectId(m.id)}>{t("custody.btn_reject")}</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </>)}

          {(d.use_requests || []).length > 0 && (<>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", margin: "16px 0 6px" }}>{t("custody.use_title")}</div>
            {d.use_requests.map((u) => (
              <div key={u.id} style={{ padding: "7px 0", borderTop: `1px solid ${T.b1}`, fontSize: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b>{u.material_name} {n3(u.qty)} {u.unit}</b>
                  <span>{u.task_name ? t("custody.use_task", { task: u.task_name }) : t("custody.use_notask")}</span>
                  <span style={{ color: T.t4 }}>{u.by_name}{u.remark ? " · " + u.remark : ""}</span>
                  {(u.photos || []).map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.blu }}>📷{i + 1}</a>)}
                  <span style={{ marginLeft: "auto", fontWeight: 700, color: u.status === "pending" ? T.amb : u.status === "approved" ? T.grn : T.red }}>{t("custody.use_st_" + u.status)}</span>
                </div>
                {u.decide_note && <div style={{ color: T.t4, fontSize: 11 }}>{u.decided_by_name}: {u.decide_note}</div>}
                {u.status === "pending" && d.can_decide_use && (
                  <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                    <button style={btn(T.grn, true)} onClick={() => post(`/material-custody/use-requests/${u.id}/approve`)}>{t("custody.btn_use_yes")}</button>
                    {rejectId === "u" + u.id ? (<>
                      <input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t("custody.reject_ph")} style={{ ...inp, flex: 1 }} />
                      <button style={btn(T.red, true)} disabled={!rejectNote.trim()} onClick={() => post(`/material-custody/use-requests/${u.id}/reject`, { note: rejectNote })}>{t("custody.btn_use_no")}</button>
                    </>) : <button style={btn(T.red)} onClick={() => setRejectId("u" + u.id)}>{t("custody.btn_use_no")}</button>}
                  </div>
                )}
              </div>
            ))}
          </>)}

          <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", margin: "16px 0 4px" }}>{t("custody.used_title")}</div>
          <div style={{ fontSize: 11, color: T.t4, marginBottom: 4 }}>{t("custody.used_hint")}</div>
          {d.used.length === 0 && <div style={{ fontSize: 12, color: T.t4 }}>{t("custody.used_empty")}</div>}
          {d.used.map((u) => <UsedRow key={u.id} u={u} canFlag={d.can_flag} onChanged={load} />)}
        </>)}
      </div>
    </div>
  );
}

export default function MaterialCustodyTab({ projectId, onReceive }) {
  const [rows, setRows] = useState(null);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    if (!projectId) return;
    api.get(`/material-custody?project_id=${projectId}${all ? "&status=all" : ""}`)
      .then((r) => { if (r.success) { setRows(r.data || []); setErr(""); } else { setRows([]); setErr(r.message); } })
      .catch((e) => { setRows([]); setErr(e.message); });
  }, [projectId, all]);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: T.t3, flex: 1 }}>{t("custody.tab_hint")}</div>
        <label style={{ fontSize: 12, color: T.t2, display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />{t("custody.show_closed")}
        </label>
      </div>
      {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
      {rows === null && <div style={{ color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>}
      {rows && rows.length === 0 && !err && <div style={{ color: T.t4, fontSize: 12, padding: "20px 0", textAlign: "center" }}>{t("custody.empty")}</div>}
      {rows && rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ color: T.t4, textAlign: "left", borderBottom: `1px solid ${T.b1}` }}>
            {["custody.col_issue", "custody.zimmedar", "custody.col_baaki", "custody.col_since", "common.status"].map((k) => <th key={k} style={{ padding: "6px 4px" }}>{t(k)}</th>)}
          </tr></thead>
          <tbody>{rows.map((r) => {
            const st = ST[r.custody_status] || ST.open;
            const left = r.lines.filter((l) => l.baaki > 0).map((l) => `${l.material_name} ${n3(l.baaki)} ${l.unit || ""}`).join(", ");
            return (
              <tr key={r.id} onClick={() => setOpen(r.id)} style={{ borderBottom: `1px solid ${T.b1}`, cursor: "pointer" }}>
                <td style={{ padding: "7px 4px", fontWeight: 700, color: T.t1 }}>{r.issue_no}<div style={{ fontSize: 10.5, color: T.t4, fontWeight: 400 }}>{String(r.date || "").slice(0, 10)}</div></td>
                <td style={{ padding: "7px 4px" }}>{r.custodian_name}{r.party_name && <div style={{ fontSize: 10.5, color: T.t3 }}>{r.party_name}</div>}</td>
                <td style={{ padding: "7px 4px", color: T.t2 }}>{left || "—"}{r.party_name && r.baaki_value > 0 && <div style={{ fontSize: 10.5, color: T.amb }}>₹{fmtN(r.baaki_value)}</div>}</td>
                <td style={{ padding: "7px 4px", color: r.days > 7 && r.custody_status !== "closed" ? T.red : T.t3 }}>{t("custody.days_n", { n: r.days })}</td>
                <td style={{ padding: "7px 4px" }}><Pill label={t(st.k)} c={st.c} bg={st.bg} />{r.pending_moves && <div style={{ fontSize: 10, color: T.amb, marginTop: 2 }}>{t("custody.has_pending")}</div>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
      {open && <CustodyDrawer issueId={open} onClose={() => setOpen(null)} onChanged={load} onReceive={onReceive} />}
    </div>
  );
}

// ── Doosre task ki manzoori (Hissa B, 24 Oct 2026, Prafull D3) ─────────
// Used entry par server 409 CUSTODY_TASK_APPROVAL (khud chuni line kisi aur task
// ki) / CUSTODY_RESERVED (apne aap wala kram rakhi zimmedari tak pahuncha) de
// to: sandesh + "Manzoori maangein?" → haan par wahi entry manzoori ke liye.
// Lautata null (ye 409 nahi — caller apna error dikhaye), { asked:false }
// (mana kiya) ya { asked:true, ok, message }.
export async function askCustodyApproval(res, payload) {
  if (!res || !["CUSTODY_TASK_APPROVAL", "CUSTODY_RESERVED"].includes(res.code)) return null;
  const line = res.data && (res.data.lines || [])[0];
  if (!line) return null;
  if (!window.confirm((res.message || "") + "\n\n" + t("custody.ask_approval_q", { who: line.zimmedar || "" }))) return { asked: false };
  const r = await api.post("/material-custody/use-requests", {
    ...payload, line_id: line.line_id, need_qty: res.data.need_qty,
    pick_line: res.code === "CUSTODY_TASK_APPROVAL" ? 1 : 0,
  }).catch((e) => ({ message: e.message }));
  return { asked: true, ok: !!(r && r.success), message: (r && r.message) || t("custody.save_fail") };
}

// Used entry ke form ka picker (TabTasks used-log, Material → mark used):
// is site + material ki khuli zimmedari lines. v2 (24 Oct 2026, Prafull):
// default "Apne aap" (undefined) — server pehle site ka AAM stock, phir
// zimmedari (subcon wali kabhi apne aap nahi). Line chuno to wahi; "Zimmedari
// se nahi" (null) = link nahi. Koi line nahi to picker nahi dikhta.
export function CustodyLinePick({ projectId, material, value, onChange }) {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    let live = true;
    const m = String(material || "").trim();
    if (!projectId || !m) { setLines([]); return undefined; }
    api.get(`/material-custody/open-lines?project_id=${projectId}&material=${encodeURIComponent(m)}`)
      .then((r) => {
        if (!live) return;
        const ls = (r && r.success && r.data) || [];
        setLines(ls);
        onChange(undefined);
      }).catch(() => { if (live) setLines([]); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, material]);
  if (!lines.length) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <label style={{ fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{t("custody.pick_label")}</label>
      <select value={value === undefined ? "auto" : value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "auto" ? undefined : e.target.value ? Number(e.target.value) : null)}
        style={{ ...inp, width: "100%" }}>
        <option value="auto">{t("custody.pick_auto")}</option>
        {lines.map((l) => (
          <option key={l.id} value={String(l.id)}>
            {t("custody.pick_opt", { no: l.issue_no, who: l.custodian_name + (l.party_name ? " · " + l.party_name : ""), n: n3(l.khula), unit: l.unit || "" })}
          </option>
        ))}
        <option value="">{t("custody.pick_none")}</option>
      </select>
    </div>
  );
}
