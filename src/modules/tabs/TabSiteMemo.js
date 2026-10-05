import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { Pill } from "../shared/ui";
import { t } from "../../i18n";
import { daysAgoISO } from "../../utils/today";
import { can, canEntry, currentUser } from "../../utils/perms";

// ── Site memo — ek module, do hisse (28 Sep 2026) ──────────────────
// Memo: site ki poori kahani — har din ka note, kal ka plan, client/PMC ki
//   baat, suraksha, aur RUKAWAT wajah-wise ghante ke jod ke saath. Review ke
//   waqt yahi batata hai site kin wajah se late hui. Sab DPR ke apne record
//   se (GET /dpr/memo) — yahan kuch naya darj nahi hota.
// Notes: yaad rakhne ki list — "client ne bola chhat par ek light point aur".
//   Kisko dena hai, andar ke note, aur jisne kiya wo Work done. Roz ki To-do
//   me nahi dikhta, koi timeline nahi.
// Prafull: "web me ek hi module me de dena".

// Roles & Access (5 Oct 2026) — server routes/site-notes.js ke hi niyam:
// naya note / andar ka note = Site / DPR ENTRY (transition: Create bhi);
// done / dobara kholna = Entry ya Edit; hatana = apna (Entry), Admin/PM, ya
// Site / DPR → DELETE.
const NOTE_MOD = "Site / DPR";
const NOTE_BOSS = ["admin", "super_admin", "project_manager", "pm"];
const canNoteEntry = () => canEntry(NOTE_MOD);
const canNoteStatus = () => canEntry(NOTE_MOD) || can(NOTE_MOD, "edit");
const canNoteDelete = (n) => {
  const me = currentUser();
  if (n?.created_by?.id != null && String(n.created_by.id) === String(me.id)) return canEntry(NOTE_MOD) || can(NOTE_MOD, "delete");
  return (NOTE_BOSS.includes(me.role) && canEntry(NOTE_MOD)) || can(NOTE_MOD, "delete");
};

const REASON_KEYS = ["rain", "material", "machine", "labour", "power", "drawing", "permission", "client", "other"];
const reasonLabel = (k) => (REASON_KEYS.includes(k) ? t("dpr.reason_" + k) : k);
const KIND = {
  rukawat:   { c: "#B45309", k: "sitememo.k_rukawat" },
  note:      { c: "#2563EB", k: "sitememo.k_note" },
  plan:      { c: "#475569", k: "sitememo.k_plan" },
  client:    { c: "#4B45C4", k: "sitememo.k_client" },
  safety:    { c: "#DC2626", k: "sitememo.k_safety" },
  band:      { c: "#B45309", k: "sitememo.k_band" },
  reject:    { c: "#DC2626", k: "sitememo.k_reject" },
  task_note: { c: "#0F766E", k: "sitememo.k_task_note" },
};
const fq = (n) => { const x = Number(n); return isFinite(x) ? String(Math.round(x * 10) / 10) : ""; };
const dayTxt = (s) => {
  if (!s) return "";
  const d = new Date(String(s).slice(0, 10) + "T00:00:00");
  return isNaN(d) ? s : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};
const whenTxt = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};

const card = { background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}`, padding: "12px 14px", marginBottom: 12 };
const secLbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 };
const inp = { width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.b2}`, fontSize: 12.5, fontFamily: "inherit", color: T.t1, boxSizing: "border-box" };
const seg = (on) => ({
  padding: "6px 14px", borderRadius: 7, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
  background: on ? T.surface : "transparent", color: on ? T.t1 : T.t3, boxShadow: on ? "0 1px 3px rgba(0,0,0,.08)" : "none",
});
const btn = (kind) => ({
  padding: "7px 14px", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: kind === "ghost" ? `1px solid ${T.b2}` : "none",
  background: kind === "ghost" ? T.surface : kind === "grn" ? T.grn : kind === "red" ? T.redL : T.ind,
  color: kind === "ghost" ? T.t2 : kind === "red" ? T.red : "white",
});

// ════════════════════════════════════════════════════════════════
function Memo({ projectId }) {
  const [range, setRange] = useState("30");
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(() => {
    setD(null); setErr(null);
    const from = range === "all" ? "" : `&from=${daysAgoISO(Number(range))}`;
    api.get(`/dpr/memo?project_id=${projectId}${from}`).then((r) => {
      if (r?.success) setD(r.data); else setErr(r?.message || t("sitememo.nahi_aaya"));
    }).catch(() => setErr(t("sitememo.nahi_aaya")));
  }, [projectId, range]);
  useEffect(load, [load]);

  const s = d?.summary;
  const maxH = s && s.by_reason.length ? Math.max(...s.by_reason.map((b) => b.hours || 0), 1) : 1;
  const byDay = [];
  for (const it of d?.timeline || []) {
    const last = byDay[byDay.length - 1];
    if (last && last.date === it.date) last.items.push(it); else byDay.push({ date: it.date, items: [it] });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 3, padding: 3, background: T.sltL, borderRadius: 9, width: "fit-content", marginBottom: 12 }}>
        {[["30", t("sitememo.r_30")], ["90", t("sitememo.r_90")], ["all", t("sitememo.r_all")]].map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)} style={seg(range === k)}>{l}</button>
        ))}
      </div>
      {err && <div style={{ ...card, background: T.redL, color: T.red, fontSize: 12.5 }}>{err}</div>}
      {!d && !err && <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 13 }}>{t("sitememo.aa_raha_hai")}</div>}
      {d && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 14, alignItems: "start" }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <div style={{ ...secLbl, marginBottom: 0, flex: 1 }}>{t("sitememo.rukawat_kyun")}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.hindrance_hours ? T.amb : T.t3 }}>
                {t("sitememo.n_ghante_n_din", { h: fq(s.hindrance_hours), d: s.hindrance_days })}
              </div>
            </div>
            {s.by_reason.length === 0 && <div style={{ fontSize: 12, color: T.t4, fontStyle: "italic" }}>{t("sitememo.koi_rukawat_nahi")}</div>}
            {s.by_reason.map((b) => (
              <div key={b.reason} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", fontSize: 12, color: T.t2, marginBottom: 3 }}>
                  <span style={{ flex: 1, fontWeight: 600 }}>{reasonLabel(b.reason)}</span>
                  <span style={{ color: T.t3 }}>{t("sitememo.n_ghante_n_din", { h: fq(b.hours), d: b.days })}</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: T.sltL, overflow: "hidden" }}>
                  <div style={{ width: Math.max(3, Math.round(((b.hours || 0) / maxH) * 100)) + "%", height: "100%", background: T.amb, borderRadius: 4 }} />
                </div>
                {(b.items || []).map((m) => (
                  <div key={m.material} style={{ display: "flex", fontSize: 11.5, color: T.t3, padding: "3px 0 0 12px" }}>
                    <span style={{ flex: 1 }}>• {m.material}</span>
                    <span>{t("sitememo.n_ghante_n_din", { h: fq(m.hours), d: m.days })}</span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6, paddingTop: 8, borderTop: `1px dashed ${T.b1}` }}>
              {t("sitememo.dpr_din_notes", { n: s.dpr_days, o: s.site_notes.open || 0, dn: s.site_notes.done || 0 })}
            </div>
          </div>

          <div>
            <div style={secLbl}>{t("sitememo.din_ba_din")}</div>
            {byDay.length === 0 && <div style={{ ...card, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("sitememo.kuch_nahi")}</div>}
            {byDay.map((g) => (
              <div key={g.date} style={{ ...card, padding: "10px 14px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 6 }}>{dayTxt(g.date)}</div>
                {g.items.map((it, i) => {
                  const k = KIND[it.kind] || KIND.note;
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderTop: i ? `1px solid ${T.b1}` : "none" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: k.c, background: k.c + "14", borderRadius: 5, padding: "2px 7px", height: "fit-content", whiteSpace: "nowrap", minWidth: 84, textAlign: "center" }}>{t(k.k)}</span>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.t2 }}>
                        {it.kind === "rukawat" && <b style={{ color: T.t1 }}>{reasonLabel(it.reason)}{it.material ? " (" + it.material + ")" : ""}{it.hours ? " — " + t("sitememo.n_ghante", { n: fq(it.hours) }) : ""}</b>}
                        {it.kind === "safety" && it.incidents > 0 && <b style={{ color: T.red }}>{t("sitememo.n_haadse", { n: it.incidents })} </b>}
                        {it.task && <span style={{ color: T.t3 }}>{it.kind === "rukawat" ? " · " : ""}{it.task}{it.text ? ": " : ""}</span>}
                        {it.text ? (it.kind === "rukawat" ? <div style={{ fontSize: 11.5, color: T.t3 }}>{it.text}</div> : it.text) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
function Notes({ projectId }) {
  const [status, setStatus] = useState("open");
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [people, setPeople] = useState(null);
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);
  const [cmt, setCmt] = useState("");
  const [doneNote, setDoneNote] = useState("");
  const [busy, setBusy] = useState(false);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };
  const load = useCallback(() => {
    setList(null); setErr(null);
    api.get(`/site-notes?project_id=${projectId}&status=${status}`).then((r) => {
      if (r?.success) setList(r.data || []); else setErr(r?.message || t("sitememo.nahi_aaya"));
    }).catch(() => setErr(t("sitememo.nahi_aaya")));
  }, [projectId, status]);
  useEffect(load, [load]);

  const loadPeople = () => {
    if (people) return;
    api.get("/projects/team-members").then((r) => setPeople(r?.success ? (r.data || []).filter((u) => u.role !== "client") : []))
      .catch(() => setPeople([]));
  };
  const openNote = (id) => {
    setCmt(""); setDoneNote("");
    api.get(`/site-notes/${id}`).then((r) => { if (r?.success) setOpen(r.data); else flash(r?.message); });
  };
  const run = async (fn) => { setBusy(true); const r = await fn().catch(() => null); setBusy(false); return r; };

  const save = async () => {
    if (!form.title.trim()) return;
    const r = await run(() => api.post("/site-notes", { project_id: projectId, title: form.title.trim(), detail: form.detail.trim(), source: form.source, assignees: form.assignees }));
    if (r?.success) { setForm(null); flash(r.message); if (status !== "open") setStatus("open"); else load(); } else flash(r?.message || t("sitememo.nahi_aaya"));
  };
  const markDone = async (done) => {
    const r = await run(() => api.patch(`/site-notes/${open.id}`, done ? { status: "done", done_note: doneNote.trim() } : { status: "open" }));
    if (r?.success) { flash(r.message); setOpen(null); load(); } else flash(r?.message || t("sitememo.nahi_aaya"));
  };
  const addComment = async () => {
    if (!cmt.trim()) return;
    const r = await run(() => api.post(`/site-notes/${open.id}/comments`, { text: cmt.trim() }));
    if (r?.success) { setCmt(""); openNote(open.id); load(); } else flash(r?.message || t("sitememo.nahi_aaya"));
  };
  const remove = async () => {
    const r = await run(() => api.del(`/site-notes/${open.id}`));
    if (r?.success) { flash(r.message); setOpen(null); load(); } else flash(r?.message || t("sitememo.nahi_aaya"));
  };
  const toggleA = (id) => setForm((f) => ({ ...f, assignees: f.assignees.includes(id) ? f.assignees.filter((x) => x !== id) : [...f.assignees, id] }));
  const srcPill = (src) => src === "client"
    ? <Pill label={t("sitememo.client_ne_bola")} c={T.ind} bg={T.indL} />
    : <Pill label={t("sitememo.andar_ka")} c={T.slt} bg={T.sltL} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: open || form ? "1fr 380px" : "1fr", gap: 14, alignItems: "start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 3, padding: 3, background: T.sltL, borderRadius: 9 }}>
            <button onClick={() => setStatus("open")} style={seg(status === "open")}>{t("sitememo.khule")}</button>
            <button onClick={() => setStatus("done")} style={seg(status === "done")}>{t("sitememo.ho_gaye")}</button>
          </div>
          <div style={{ fontSize: 11.5, color: T.t4, flex: 1 }}>{t("sitememo.notes_hint")}</div>
          {canNoteEntry() && <button onClick={() => { setOpen(null); setForm({ title: "", detail: "", source: "internal", assignees: [] }); loadPeople(); }} style={btn()}>
            {t("sitememo.naya_note")}
          </button>}
        </div>
        {msg && <div style={{ ...card, background: T.bluL, borderColor: T.bluM, color: T.t2, fontSize: 12.5, padding: "8px 12px" }}>{msg}</div>}
        {err && <div style={{ ...card, background: T.redL, color: T.red, fontSize: 12.5 }}>{err}</div>}
        {!list && !err && <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 13 }}>{t("sitememo.aa_raha_hai")}</div>}
        {list && list.length === 0 && <div style={{ ...card, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("sitememo.koi_note_nahi")}</div>}
        {(list || []).map((n) => (
          <button key={n.id} onClick={() => { setForm(null); openNote(n.id); }}
            style={{ ...card, display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              borderLeft: `3px solid ${n.status === "done" ? T.grn : T.ind}`, background: open && open.id === n.id ? T.indL : T.surface }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: T.t1, textDecoration: n.status === "done" ? "line-through" : "none" }}>{n.title}</div>
              {srcPill(n.source)}
            </div>
            {n.assignees.length > 0 && <div style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>→ {n.assignees.map((a) => a.name || "#" + a.id).join(", ")}</div>}
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 3 }}>
              {n.status === "done"
                ? t("sitememo.done_by", { who: n.done_by?.name || "", when: whenTxt(n.done_at) })
                : t("sitememo.likha_x", { who: n.created_by?.name || "", when: whenTxt(n.created_at) })}
              {n.comments ? "  ·  " + t("sitememo.n_note", { n: n.comments }) : ""}
            </div>
          </button>
        ))}
      </div>

      {form && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{t("sitememo.naya_note")}</div>
          <label style={{ fontSize: 11.5, color: T.t3 }}>{t("sitememo.kya_yaad")}
            <input value={form.title} autoFocus onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("sitememo.kya_yaad_hint")} style={{ ...inp, marginTop: 4 }} />
          </label>
          <label style={{ display: "block", fontSize: 11.5, color: T.t3, marginTop: 10 }}>{t("sitememo.detail")}
            <textarea value={form.detail} rows={3} onChange={(e) => setForm({ ...form, detail: e.target.value })} style={{ ...inp, marginTop: 4, resize: "vertical" }} />
          </label>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[["client", t("sitememo.client_ne_bola")], ["internal", t("sitememo.andar_ka")]].map(([k, l]) => (
              <button key={k} onClick={() => setForm({ ...form, source: k })}
                style={{ ...btn("ghost"), flex: 1, borderColor: form.source === k ? T.ind : T.b2, background: form.source === k ? T.indL : T.surface, color: form.source === k ? T.ind : T.t2 }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, margin: "12px 0 6px" }}>{t("sitememo.kisko_dena")}</div>
          {people === null && <div style={{ fontSize: 12, color: T.t4 }}>{t("sitememo.aa_raha_hai")}</div>}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxHeight: 180, overflowY: "auto" }}>
            {(people || []).map((u) => {
              const on = form.assignees.includes(u.id);
              return (
                <button key={u.id} onClick={() => toggleA(u.id)}
                  style={{ padding: "5px 10px", borderRadius: 999, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${on ? T.ind : T.b2}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t2 }}>
                  {on ? "✓ " : ""}{u.name}{u.designation ? " · " + u.designation : ""}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => setForm(null)} style={btn("ghost")}>{t("sitememo.band_karo")}</button>
            <button onClick={save} disabled={busy || !form.title.trim()} style={{ ...btn(), flex: 1, opacity: form.title.trim() ? 1 : .5 }}>{t("sitememo.save")}</button>
          </div>
        </div>
      )}

      {open && (
        <div style={card}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.t1 }}>{open.title}</div>
            {srcPill(open.source)}
            <button onClick={() => setOpen(null)} aria-label={t("sitememo.band_karo")} style={{ border: "none", background: "none", fontSize: 16, color: T.t4, cursor: "pointer" }}>×</button>
          </div>
          {open.detail && <div style={{ fontSize: 12.5, color: T.t2, marginTop: 6, whiteSpace: "pre-wrap" }}>{open.detail}</div>}
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 8 }}>{t("sitememo.likha_x", { who: open.created_by?.name || "", when: whenTxt(open.created_at) })}</div>
          {open.assignees.length > 0 && <div style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>→ {open.assignees.map((a) => a.name || "#" + a.id).join(", ")}</div>}
          {open.status === "done" && (
            <div style={{ fontSize: 12, color: T.grn, marginTop: 8, fontWeight: 600 }}>
              ✓ {t("sitememo.done_by", { who: open.done_by?.name || "", when: whenTxt(open.done_at) })}
              {open.done_note ? <div style={{ color: T.t2, fontWeight: 400 }}>{open.done_note}</div> : null}
            </div>
          )}
          <div style={{ ...secLbl, marginTop: 14 }}>{t("sitememo.andar_ke_note")}</div>
          {(open.comment_list || []).length === 0 && <div style={{ fontSize: 12, color: T.t4, fontStyle: "italic" }}>{t("sitememo.abhi_koi_note_nahi")}</div>}
          {(open.comment_list || []).map((c) => (
            <div key={c.id} style={{ padding: "6px 0", borderBottom: `1px solid ${T.b1}` }}>
              <div style={{ fontSize: 12.5, color: T.t1 }}>{c.text}</div>
              <div style={{ fontSize: 10.5, color: T.t4 }}>{c.user_name || ""} · {whenTxt(c.created_at)}</div>
            </div>
          ))}
          {canNoteEntry() && <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={cmt} onChange={(e) => setCmt(e.target.value)} placeholder={t("sitememo.apna_note")} style={{ ...inp, flex: 1 }} />
            <button onClick={addComment} disabled={busy || !cmt.trim()} style={{ ...btn(), opacity: cmt.trim() ? 1 : .5 }}>{t("sitememo.add")}</button>
          </div>}
          {!canNoteStatus() ? null : open.status !== "done" ? (
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <input value={doneNote} onChange={(e) => setDoneNote(e.target.value)} placeholder={t("sitememo.done_note_hint")} style={{ ...inp, flex: 1 }} />
              <button onClick={() => markDone(true)} disabled={busy} style={btn("grn")}>{t("sitememo.work_done")}</button>
            </div>
          ) : (
            <button onClick={() => markDone(false)} disabled={busy} style={{ ...btn("ghost"), marginTop: 14 }}>{t("sitememo.dobara_kholo")}</button>
          )}
          {canNoteDelete(open) && <button onClick={remove} disabled={busy} style={{ ...btn("red"), marginTop: 10 }}>{t("sitememo.hatao")}</button>}
        </div>
      )}
    </div>
  );
}

export default function TabSiteMemo({ project }) {
  const [part, setPart] = useState("memo");
  if (!project?.id) return null;
  return (
    <div style={{ padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 3, padding: 3, background: T.sltL, borderRadius: 9 }}>
          <button onClick={() => setPart("memo")} style={seg(part === "memo")}>{t("sitememo.memo")}</button>
          <button onClick={() => setPart("notes")} style={seg(part === "notes")}>{t("sitememo.notes")}</button>
        </div>
        <div style={{ fontSize: 12, color: T.t4 }}>{part === "memo" ? t("sitememo.memo_sub") : t("sitememo.notes_sub")}</div>
      </div>
      {part === "memo" ? <Memo projectId={project.id} /> : <Notes projectId={project.id} />}
    </div>
  );
}
