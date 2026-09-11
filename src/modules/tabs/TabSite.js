import React, { useState, useEffect, useCallback } from "react";
import api, { API_BASE, getToken } from "../../config/api";
import { T } from "../shared/tokens";
import { Pill } from "../shared/ui";
import DinKaByoraModal from "./DinKaByoraModal";
import { t, getLang } from "../../i18n";
import { todayISO, isoDate } from "../../utils/today";

// ── Site / DPR tab ──────────────────────────────────────────────
// DPR ab bharne wala form nahi hai. Server din jod kar deta hai
// (GET /dpr/day) aur site wala sirf wo bharta hai jo system jaan hi nahi
// sakta — mausam, rukawat, suraksha, note aur kis task par kitne log.
// Web ka kaam wahi rehta hai jo pehle tha: DEKHNA, APPROVE karna aur
// client ko bhejne layak kagaz nikalna. Bharna mobile se hi hota hai.
//
// Pehle ye tab sirf un dinon ko khol sakta tha jinki DPR maujood thi —
// yaani "aaj kuch aaya ya nahi" dekhne ka koi rasta hi nahi tha. Ab koi
// bhi din khulta hai; jis din DPR nahi bheji uspar bhi wo sab dikhta hai
// jo us din site par sach me hua.

// Client ko jaane wala kagaz — token <a href> par nahi jaata, isliye
// fetch se blob. (Wahi tareeka jo AssetsModule/FuelModule me hai.)
const fetchPdf = async (path) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, "X-Lang": getLang() },
  });
  if (!res.ok) {
    let m = "";
    try { m = (await res.json()).message; } catch (_) { /* PDF route ka error HTML bhi ho sakta hai */ }
    throw new Error(m || t("site.pdf_nahi_bani"));
  }
  return await res.blob();
};
// Client copy ke hisse — kram wahi jo server (utils/dprSections.js) ka hai.
const SEC_KEYS = ["hazri", "kaam", "maal", "machine", "photo", "issue", "todo", "rukawat", "mausam", "suraksha", "note"];

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const fq = (n) => {
  const x = Number(n);
  if (!isFinite(x)) return "";
  return String(Math.round(x * 100) / 100);
};
const dayLabel = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
};
const shiftDay = (s, n) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

const STATUS = {
  approved:  () => ({ c: T.ind, bg: T.indL, l: t("site.st_approved") }),
  submitted: () => ({ c: T.grn, bg: T.grnL, l: t("site.st_submitted") }),
  draft:     () => ({ c: T.amb, bg: T.ambL, l: t("site.st_draft") }),
  none:      () => ({ c: T.t4,  bg: T.bg,   l: t("site.st_none") }),
};

function TabSite({ project, isAdmin }) {
  const projectId = project?.id;
  const [date, setDate]       = useState(todayISO());
  const [day, setDay]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [byDate, setByDate]   = useState({});   // "YYYY-MM-DD" → status (chips ka rang)
  const [view, setView]       = useState("overview");
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState(null);
  const [byora, setByora]     = useState(false);

  // Pichhle 60 din ki DPR — sirf isliye ki tareekh ki patti par rang aa sake.
  useEffect(() => {
    if (!projectId) return;
    api.get(`/dpr?project_id=${projectId}&limit=60`).then(r => {
      if (!r?.success) return;
      const m = {};
      (r.data || []).forEach(d => { m[String(d.report_date).slice(0, 10)] = d.status || "draft"; });
      setByDate(m);
    }).catch(() => {});
  }, [projectId]);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true); setErr(null);
    api.get(`/dpr/day?project_id=${projectId}&date=${date}`).then(r => {
      if (r?.success) {
        setDay(r.data);
        setByDate(m => ({ ...m, [date]: r.data.status }));
      } else setErr(r?.message || t("site.din_nahi_khula"));
    }).catch(() => setErr(t("site.din_nahi_khula"))).finally(() => setLoading(false));
  }, [projectId, date]);
  useEffect(load, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  // ── Client copy ke hisse ────────────────────────────────────────
  // Tick project-wise server par hain (utils/dprSections.js). App ki
  // PDF/WhatsApp sheet aur ye panel ek hi jagah likhte hain, isliye dono jagah
  // ek jaisa kagaz banta hai.
  const [secOpen, setSecOpen] = useState(false);
  const [secs, setSecs] = useState(null);
  useEffect(() => { setSecs(day?.share?.client || null); }, [day]);
  const toggleSec = async (k) => {
    const cur = new Set(secs || []);
    if (cur.has(k)) cur.delete(k); else cur.add(k);
    const list = SEC_KEYS.filter((s) => cur.has(s));
    setSecs(list);
    const r = await api.put("/dpr/client-sections", { project_id: projectId, sections: list }).catch(() => null);
    if (!r || !r.success) flash((r && r.message) || t("site.client_copy_save_nahi_hua"));
  };

  const approveDPR = async () => {
    if (!day?.dpr?.id || busy) return;
    setBusy(true);
    const r = await api.patch(`/dpr/${day.dpr.id}/approve`, {}).catch(() => null);
    setBusy(false);
    if (r && r.success) load(); else flash((r && r.message) || t("site.approve_failed"));
  };

  // copy = "client" → sirf wo hisse jo is project ki client copy me tick hain.
  const downloadPdf = async (copy) => {
    if (busy) return;
    setBusy(true);
    try {
      const cq = copy === "client" ? "&copy=client" : "";
      const blob = await fetchPdf(`/dpr/day/pdf?project_id=${projectId}&date=${date}${cq}`);
      const safe = String(project?.name || "DPR").replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "DPR";
      saveBlob(blob, `DPR_${safe}_${date}${copy === "client" ? "_client" : ""}.pdf`);
    } catch (e) { flash(e.message); }
    setBusy(false);
  };

  const a = day?.assembled;
  const st = (STATUS[day?.status] || STATUS.none)();
  const tasks = a?.tasks || [];
  const photos = a?.photos?.items || [];
  const materialUsed = tasks.flatMap(x => x.material_used.map(m => ({ ...m, task: x.task })))
    .concat((a?.unassigned?.material_used || []).map(m => ({ ...m, task: null })));
  const grn = a?.grn || [];

  // Aakhri 14 din ki patti. Pehle chips sirf maujood DPR ki thi, isliye jis
  // din DPR nahi bheji wo din khul hi nahi sakta tha.
  const days = [];
  for (let i = 0; i < 14; i++) days.push(shiftDay(todayISO(), -i));

  const VIEWS = [
    { id: "overview", l: t("common.overview") },
    { id: "work",     l: t("site.work_done"),      n: tasks.length },
    { id: "material", l: t("common.materials"),    n: materialUsed.length + grn.length },
    { id: "photos",   l: t("common.photos"),       n: photos.length },
  ];

  const card = { background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}` };
  const secLbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 };

  return (
    <div style={{ padding: "14px 18px" }}>

      {/* ── Tareekh ki patti ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, overflowX: "auto", flex: 1, minWidth: 260 }}>
          {days.map(d => {
            const isA = d === date;
            const s = byDate[d];
            const dot = s === "approved" ? T.ind : s === "submitted" ? T.grn : s === "draft" ? T.amb : null;
            return (
              <button key={d} onClick={() => { setDate(d); setView("overview"); }}
                style={{ position: "relative", padding: "5px 10px", borderRadius: 6, flexShrink: 0,
                  border: `1.5px solid ${isA ? T.blu : T.b1}`, background: isA ? T.bluL : T.surface,
                  color: isA ? T.blu : T.t3, fontSize: 11.5, fontWeight: isA ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {d === todayISO() ? t("site.aaj") : dayLabel(d)}
                {dot && <span style={{ position: "absolute", top: 3, right: 4, width: 5, height: 5, borderRadius: "50%", background: dot }} />}
              </button>
            );
          })}
        </div>
        <input type="date" value={date} max={todayISO()} onChange={e => e.target.value && setDate(e.target.value)}
          style={{ padding: "5px 9px", borderRadius: 6, border: `1px solid ${T.b1}`, fontSize: 11.5, fontFamily: "inherit", color: T.t1 }} />
        <button onClick={() => setByora(true)}
          style={{ padding: "6px 13px", borderRadius: 7, border: `1.5px solid ${T.ind}`, background: T.indL,
            color: T.ind, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {t("din_ka_byora.din_ka_byora")}
        </button>
      </div>

      {/* ── Haalat + kaam ke button ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Pill label={st.l} c={st.c} bg={st.bg} />
        {day?.dpr?.submitted_by_name && day.status !== "none" && (
          <span style={{ fontSize: 11.5, color: T.t4 }}>
            {t("site.bheja_x_ne", { who: day.dpr.submitted_by_name })}
          </span>
        )}
        {day?.changed_since_submit && day.status !== "none" && (
          <Pill label={t("site.badla_hua")} c={T.amb} bg={T.ambL} border={T.ambM} />
        )}
        {day?.completeness && day.status !== "approved" && (
          <span style={{ fontSize: 11.5, color: T.t4 }}>{t("site.bhara_hua_x", { s: day.completeness.score })}</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={() => downloadPdf("full")} disabled={busy}
            style={{ padding: "6px 13px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface,
              color: T.t2, fontSize: 11.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
            {t("site.pdf")}
          </button>
          {/* Client PDF, aur ▾ se uske hisse — ek jude hue jode me */}
          <div style={{ position: "relative", display: "flex" }}>
            <button onClick={() => downloadPdf("client")} disabled={busy}
              style={{ padding: "6px 11px", borderRadius: "7px 0 0 7px", border: `1px solid ${T.b1}`, borderRight: "none", background: T.surface,
                color: T.t2, fontSize: 11.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
              {t("site.client_pdf")}
            </button>
            <button onClick={() => setSecOpen((v) => !v)} title={t("site.client_copy_me_kya_jaaye")}
              style={{ padding: "6px 8px", borderRadius: "0 7px 7px 0", border: `1px solid ${T.b1}`, background: T.surface,
                color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              ▾
            </button>
            {secOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 30, width: 236, background: T.surface,
                border: `1px solid ${T.b1}`, borderRadius: 9, boxShadow: "0 10px 28px rgba(15,23,42,.14)", padding: "10px 12px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>
                  {t("site.client_copy_me_kya_jaaye")}
                </div>
                {SEC_KEYS.map((k) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.t2, padding: "3px 0", cursor: "pointer" }}>
                    <input type="checkbox" checked={(secs || []).includes(k)} onChange={() => toggleSec(k)} />
                    {t("dpr.sec_" + k)}
                  </label>
                ))}
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6, lineHeight: 1.4 }}>{t("site.client_copy_yaad_rehta")}</div>
              </div>
            )}
          </div>
          {day?.status === "submitted" && isAdmin && (
            <button onClick={approveDPR} disabled={busy}
              style={{ padding: "6px 15px", borderRadius: 7, background: T.grn, color: "white", border: "none",
                fontSize: 11.5, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
              {busy ? t("common.approving") : t("site.approve_dpr")}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ ...card, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12.5, padding: "9px 13px", marginBottom: 12 }}>{msg}</div>
      )}
      {byora && <DinKaByoraModal projectId={projectId} onClose={() => setByora(false)} />}

      {loading && <div style={{ padding: "40px 18px", textAlign: "center", color: T.t4, fontSize: 13 }}>{t("site.loading_dprs")}</div>}
      {err && !loading && <div style={{ ...card, padding: "24px", textAlign: "center", color: T.t4, fontSize: 12.5 }}>{err}</div>}

      {a && !loading && (<>
        {/* ── KPI ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { l: t("common.labour"),        v: fq(a.labour.total), c: T.blu },
            { l: t("site.work_items"),      v: tasks.length, c: T.slt },
            { l: t("common.photos"),        v: a.photos.total, c: T.grn },
            { l: t("site.hindrance_hours"), v: a.hindrance_hours ? fq(a.hindrance_hours) : "—", c: a.hindrance_hours ? T.amb : T.grn },
            { l: t("site.weather"),         v: day.topup.weather_code ? t("dpr.weather_" + day.topup.weather_code) : (day.topup.weather || "—"), c: T.amb },
          ].map((s, i) => (
            <div key={i} style={{ padding: "9px 12px", ...card, borderTop: `3px solid ${s.c}` }}>
              <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── View toggle ── */}
        <div style={{ ...card, padding: "4px", marginBottom: 12, display: "flex", gap: 2 }}>
          {VIEWS.map(v => {
            const isA = view === v.id;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "none", background: isA ? T.blu : "none", color: isA ? "white" : T.t3, fontSize: 12, fontWeight: isA ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap", fontFamily: "inherit" }}>
                {v.l}
                {v.n > 0 && <span style={{ background: isA ? "rgba(255,255,255,0.25)" : T.b1, color: isA ? "white" : T.t3, fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center" }}>{v.n}</span>}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {view === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Baayen: task-wise reedh */}
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "9px 14px", background: T.grnL, borderBottom: `1px solid ${T.grnM}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.grn }}>{t("site.kaam_task_wise")}</span>
                <span style={{ fontSize: 10.5, color: T.grn }}>{t("site.n_task", { n: tasks.length })}</span>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {tasks.length === 0 && <div style={{ fontSize: 12, color: T.t4 }}>{t("site.koi_work_item_nahi")}</div>}
                {tasks.map(x => (
                  <div key={x.task_id} style={{ marginBottom: 10, paddingBottom: 9, borderBottom: `1px solid ${T.b1}` }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>
                      {x.task}
                      {x.geo_flag === "verified" && <span style={{ color: T.grn, marginLeft: 5 }}>✓</span>}
                    </div>
                    {x.stretch && <div style={{ fontSize: 11, color: T.t4 }}>{x.stretch}</div>}
                    <div style={{ fontSize: 11.5, color: T.t2, marginTop: 3 }}>
                      {x.qty > 0 ? <b>{fq(x.qty)} {x.unit || ""}</b> : x.pct != null ? <b>{x.pct}%</b> : <span style={{ color: T.t4 }}>—</span>}
                      {x.to_date_qty != null && (
                        <span style={{ color: T.t4 }}>
                          {"  ·  " + t("site.ab_tak_x", { x: fq(x.to_date_qty) + (x.scope_qty ? " / " + fq(x.scope_qty) : "") })}
                          {x.pct_to_date != null ? ` (${x.pct_to_date}%)` : ""}
                        </span>
                      )}
                      {x.workers != null && <span style={{ color: T.t4 }}>{"  ·  " + t("site.n_log", { n: fq(x.workers) })}</span>}
                    </div>
                    {x.note && <div style={{ fontSize: 11, color: T.t3, fontStyle: "italic", marginTop: 2 }}>“{x.note}”</div>}
                  </div>
                ))}
                {(a.missed_tasks || []).length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: T.t4 }}>
                    {t("site.chhoot_gaye_n", { n: a.missed_tasks.length })}
                  </div>
                )}
              </div>
            </div>

            {/* Daayen: labour, rukawat, note */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, padding: "10px 14px" }}>
                <div style={secLbl}>{t("common.labour")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["skilled", t("site.skilled")], ["semi_skilled", t("site.semi_skilled")],
                    ["unskilled", t("site.unskilled")], ["staff", t("site.staff")]].map(([k, l]) => (
                      <div key={k} style={{ flex: 1, background: T.surfaceB, borderRadius: 7, padding: "8px 10px", border: `1px solid ${T.b1}` }}>
                        <div style={{ fontSize: 9.5, color: T.t4 }}>{l}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{fq(a.labour[k])}</div>
                      </div>
                    ))}
                </div>
                {(a.labour.rows || []).map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, color: T.t3, marginTop: 5 }}>
                    <span style={{ flex: 1 }}>{r.firm || t("site.company_ke_log")}</span>
                    <span>{fq(r.count)}</span>
                  </div>
                ))}
              </div>

              {(a.hindrances || []).length > 0 && (
                <div style={{ ...card, padding: "10px 14px", borderLeft: `3px solid ${T.amb}` }}>
                  <div style={secLbl}>{t("site.hindrance")}</div>
                  {a.hindrances.map(h => (
                    <div key={h.id} style={{ fontSize: 12, color: T.t2, marginBottom: 4 }}>
                      <b style={{ color: T.t1 }}>{t("dpr.reason_" + h.reason)}</b>
                      {h.hours_lost ? " — " + t("site.n_ghante", { n: fq(h.hours_lost) }) : ""}
                      {h.task ? " · " + h.task : ""}
                      {h.note ? <div style={{ fontSize: 11, color: T.t4 }}>{h.note}</div> : null}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ ...card, padding: "10px 14px", flex: 1 }}>
                <div style={secLbl}>{t("common.remarks")}</div>
                <div style={{ fontSize: 12.5, color: day.topup.remarks ? T.t1 : T.t4, lineHeight: 1.5 }}>
                  {day.topup.remarks || t("site.koi_remark_nahi")}
                </div>
                {day.topup.next_day_plan && (
                  <div style={{ fontSize: 12, color: T.t2, marginTop: 7 }}>
                    <b>{t("site.kal_ka_plan")}:</b> {day.topup.next_day_plan}
                  </div>
                )}
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.b1}`, fontSize: 11.5, color: T.t4 }}>
                  {t("site.submitted_by")} <strong style={{ color: T.t1 }}>{day.dpr?.submitted_by_name || "—"}</strong>
                  {day.dpr?.approved_by_name && <> · {t("site.approved_by")} <strong style={{ color: T.t1 }}>{day.dpr.approved_by_name}</strong></>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── WORK DONE ── */}
        {view === "work" && (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px 70px 120px 60px", padding: "8px 14px", background: T.surfaceB, borderBottom: `2px solid ${T.b1}` }}>
              {[t("site.col_task"), t("site.col_stretch"), t("site.col_today"), t("site.col_log"), t("site.col_to_date"), "%"]
                .map((h, i) => <span key={i} style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{h}</span>)}
            </div>
            {tasks.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("site.koi_work_item_nahi")}</div>}
            {tasks.map(x => (
              <div key={x.task_id} style={{ display: "grid", gridTemplateColumns: "1fr 150px 90px 70px 120px 60px", padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: T.t1, fontWeight: 500 }}>{x.task}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{x.stretch || "—"}</span>
                <span style={{ fontSize: 12, color: T.t2 }}>{x.qty > 0 ? `${fq(x.qty)} ${x.unit || ""}` : x.pct != null ? `${x.pct}%` : "—"}</span>
                <span style={{ fontSize: 12, color: T.t2 }}>{x.workers != null ? fq(x.workers) : "—"}</span>
                <span style={{ fontSize: 12, color: T.t2 }}>{x.to_date_qty != null ? `${fq(x.to_date_qty)}${x.scope_qty ? " / " + fq(x.scope_qty) : ""}` : "—"}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.blu }}>{x.pct_to_date != null ? `${x.pct_to_date}%` : "—"}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── MATERIAL ── */}
        {view === "material" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "9px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 700, color: T.t2 }}>
                {t("site.material_in")}
              </div>
              <div style={{ padding: "10px 14px" }}>
                {grn.length === 0 && <div style={{ fontSize: 12, color: T.t4 }}>{t("site.koi_material_nahi_aaya")}</div>}
                {grn.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.t2, marginBottom: 5 }}>
                    <b style={{ color: T.t1 }}>{g.grn_number}</b>{g.vendor ? " — " + g.vendor : ""}
                    <span style={{ color: T.t4 }}>{"  ·  " + t("site.n_item", { n: g.items })}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "9px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 700, color: T.t2 }}>
                {t("site.material_used")}
              </div>
              <div style={{ padding: "10px 14px" }}>
                {materialUsed.length === 0 && <div style={{ fontSize: 12, color: T.t4 }}>{t("site.koi_material_nahi_laga")}</div>}
                {materialUsed.map((m, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.t2, marginBottom: 5 }}>
                    <b style={{ color: T.t1 }}>{m.material_name}</b> {fq(m.qty)} {m.unit || ""}
                    {m.task ? <span style={{ color: T.t4 }}>{"  ·  " + m.task}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PHOTOS ── */}
        {view === "photos" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {photos.length === 0 && <div style={{ gridColumn: "1/-1", padding: "24px", textAlign: "center", color: T.t4, fontSize: 12.5, ...card }}>{t("site.is_dpr_me_photos_nahi_hain")}</div>}
            {photos.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 9, overflow: "hidden", border: `1px solid ${T.b1}`, background: T.surfaceB }}>
                <img src={p.url} alt={p.task || `Site photo ${i + 1}`} loading="lazy" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                {(p.task || p.caption) && (
                  <div style={{ padding: "5px 8px", fontSize: 10.5, color: T.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.task || p.caption}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </>)}
    </div>
  );
}

export default TabSite;
