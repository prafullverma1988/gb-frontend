import React, { useState, useEffect } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { Pill, FilterTabs } from "../shared/ui";
import DinKaByoraModal from "./DinKaByoraModal";
import { t } from "../../i18n";

// ── Site / DPR tab — read-only viewer for mobile-submitted DPRs ──
// DPRs are submitted from the mobile app (with photos/GPS); the web
// tab lists + renders them and lets an admin approve.
function TabSite({ project, isAdmin }) {
  const projectId = project?.id;
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selId, setSelId]       = useState(null);
  const [view, setView]         = useState("overview");
  const [approving, setApproving] = useState(false);
  // Din ka byora (Sahayak a) — DPR ho ya na ho, din ke nishaan (qty,
  // photo, issue, GRN, haaziri) to hote hi hain; isliye button khali
  // haalat me bhi dikhta hai.
  const [byora, setByora] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/dpr?project_id=${projectId}&limit=60`).then(r => {
      if (r.success) {
        setReports(r.data || []);
        if ((r.data || []).length) setSelId(prev => prev && r.data.find(d => d.id === prev) ? prev : r.data[0].id);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [projectId]); // eslint-disable-line

  const selDPR = reports.find(d => d.id === selId) || null;

  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "2-digit" });
  };

  const approveDPR = async () => {
    if (!selDPR || approving) return;
    setApproving(true);
    try {
      const r = await api.patch(`/dpr/${selDPR.id}/approve`, {});
      if (r && r.success !== false) load();
      else window.alert((r && r.message) || "Approve failed");
    } catch (e) { window.alert(e.message || "Approve failed"); }
    setApproving(false);
  };

  const VIEWS = [
    { id: "overview", l: t("common.overview") },
    { id: "work",     l: t("site.work_done") },
    { id: "material", l: t("common.materials") },
    { id: "photos",   l: t("common.photos") },
  ];

  if (loading) return (
    <div style={{ padding: "40px 18px", textAlign: "center", color: T.t4, fontSize: 13 }}>{t("site.loading_dprs")}</div>
  );

  if (!reports.length) return (
    <div style={{ padding: "48px 18px", textAlign: "center" }}>
      <div style={{ fontSize: 34, opacity: .35, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.t2, marginBottom: 5 }}>{t("site.abhi_koi_dpr_nahi")}</div>
      <div style={{ fontSize: 12.5, color: T.t4, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
       {t("site.daily_progress_report_site_se")} <b>{t("site.mobile_app")}</b> {t("site.se_submit_hota_hai_photos_labour")}
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
      <button onClick={() => setByora(true)}
        style={{ padding: "7px 14px", borderRadius: 7, border: `1.5px solid ${T.ind}`, background: T.indL,
          color: T.ind, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
       {t("din_ka_byora.din_ka_byora")}
      </button>
      </div>
      {byora && <DinKaByoraModal projectId={projectId} onClose={() => setByora(false)} />}
    </div>
  );

  const work = selDPR?.activities || [];
  const materials = selDPR?.materials || [];
  const photos = selDPR?.photo_urls || [];
  const labourTotal = (selDPR?.labour?.skilled || 0) + (selDPR?.labour?.unskilled || 0) + (selDPR?.labour?.supervisor || 0);

  return (
    <div style={{ padding: "14px 18px" }}>

      {/* Header: date switcher + approve */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <FilterTabs
          options={reports.map(e => ({ id: e.id, label: fmtDate(e.report_date) }))}
          active={selId}
          onChange={id => { setSelId(id); setView("overview"); }} />
      <button onClick={() => setByora(true)}
        style={{ padding: "7px 14px", borderRadius: 7, border: `1.5px solid ${T.ind}`, background: T.indL,
          color: T.ind, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
       {t("din_ka_byora.din_ka_byora")}
      </button>
        {selDPR && (
          selDPR.approved_at
            ? <Pill label={`✓ Approved${selDPR.approved_by_name ? " — " + selDPR.approved_by_name : ""}`} c={T.grn} bg={T.grnL} border={T.grnM} />
            : isAdmin
              ? <button onClick={approveDPR} disabled={approving}
                  style={{ padding: "7px 16px", borderRadius: 7, background: T.grn, color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {approving ? t("common.approving") : t("site.approve_dpr")}
                </button>
              : <Pill label={t("equipment.approval_pending")} c={T.amb} bg={T.ambL} border={T.ambM} />
        )}
      </div>

      {byora && <DinKaByoraModal projectId={projectId} onClose={() => setByora(false)} />}

      {!selDPR ? null : (<>
      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 12 }}>
        {[
          { l: t("common.labour"),    v: labourTotal, c: T.blu },
          { l: t("site.work_items"),v: work.length, c: T.slt },
          { l: t("common.photos"),    v: photos.length, c: T.grn },
          { l: t("common.issues"),    v: selDPR.issues_count || 0, c: (selDPR.issues_count || 0) > 0 ? T.red : T.grn },
          { l: t("site.weather"),   v: selDPR.weather || "—", c: T.amb },
        ].map((s, i) => (
          <div key={i} style={{ padding: "9px 12px", background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, borderTop: `3px solid ${s.c}` }}>
            <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, padding: "4px", marginBottom: 12, display: "flex", gap: 2 }}>
        {VIEWS.map(v => {
          const isA = view === v.id;
          const badge = v.id === "work" ? work.length : v.id === "material" ? materials.length : v.id === "photos" ? photos.length : null;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "none", background: isA ? T.blu : "none", color: isA ? "white" : T.t3, fontSize: 12, fontWeight: isA ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}>
              {v.l}
              {badge != null && badge > 0 && <span style={{ background: isA ? "rgba(255,255,255,0.25)" : T.b1, color: isA ? "white" : T.t3, fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center" }}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {view === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}`, overflow: "hidden" }}>
            <div style={{ padding: "9px 14px", background: T.grnL, borderBottom: `1px solid ${T.grnM}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.grn }}>{t("site.work_done_today")}</span>
              <span style={{ fontSize: 10.5, color: T.grn }}>{work.length} items</span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              {work.length === 0 && <div style={{ fontSize: 12, color: T.t4 }}>{t("site.koi_work_item_nahi")}</div>}
              {work.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                  <div style={{ width: 15, height: 15, borderRadius: 4, background: T.grnL, border: `1px solid ${T.grnM}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <svg width={8} height={8} viewBox="0 0 10 10" fill="none" stroke={T.grn} strokeWidth={2.2}><path d="M2 5l2.5 2.5L8 3" /></svg>
                  </div>
                  <span style={{ fontSize: 12, color: T.t1, lineHeight: 1.4 }}>
                    {w.activity}{w.qty ? ` — ${w.qty} ${w.unit || ""}` : ""}{w.pct != null && w.pct !== "" ? ` (${w.pct}%)` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Labour breakdown */}
            <div style={{ background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}`, padding: "10px 14px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>{t("common.labour")}</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[["Skilled", selDPR.labour?.skilled || 0], ["Unskilled", selDPR.labour?.unskilled || 0], ["Supervisor", selDPR.labour?.supervisor || 0]].map(([l, v]) => (
                  <div key={l} style={{ flex: 1, background: T.surfaceB, borderRadius: 7, padding: "8px 10px", border: `1px solid ${T.b1}` }}>
                    <div style={{ fontSize: 9.5, color: T.t4 }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Remarks + submitted-by */}
            <div style={{ background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}`, padding: "10px 14px", flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{t("common.remarks")}</div>
              <div style={{ fontSize: 12.5, color: selDPR.remarks ? T.t1 : T.t4, lineHeight: 1.5 }}>{selDPR.remarks || t("site.koi_remark_nahi")}</div>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.b1}`, fontSize: 11.5, color: T.t4 }}>
               {t("site.submitted_by")} <strong style={{ color: T.t1 }}>{selDPR.submitted_by_name || "—"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORK DONE ── */}
      {view === "work" && (
        <div style={{ background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 90px", padding: "8px 14px", background: T.surfaceB, borderBottom: `2px solid ${T.b1}` }}>
            {["Activity", "Qty", "Workers", "Progress"].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{h}</span>)}
          </div>
          {work.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("site.koi_work_item_nahi")}</div>}
          {work.map((w, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 90px", padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: T.t1, fontWeight: 500 }}>{w.activity}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{w.qty ? `${w.qty} ${w.unit || ""}` : "—"}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{w.workers || "—"}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.blu }}>{w.pct != null && w.pct !== "" ? `${w.pct}%` : "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── MATERIALS ── */}
      {view === "material" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {materials.length === 0 && <div style={{ gridColumn: "1/-1", padding: "24px", textAlign: "center", color: T.t4, fontSize: 12.5, background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}` }}>{t("site.koi_material_entry_nahi")}</div>}
          {materials.map((m, i) => (
            <div key={i} style={{ background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}`, padding: "10px 13px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{m.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.blu, marginTop: 3 }}>
                {m.qty} <span style={{ fontSize: 10.5, fontWeight: 400, color: T.t4 }}>{m.unit || ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PHOTOS ── */}
      {view === "photos" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {photos.length === 0 && <div style={{ gridColumn: "1/-1", padding: "24px", textAlign: "center", color: T.t4, fontSize: 12.5, background: T.surface, borderRadius: 9, border: `1px solid ${T.b1}` }}>{t("site.is_dpr_me_photos_nahi_hain")}</div>}
          {photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 9, overflow: "hidden", border: `1px solid ${T.b1}`, background: T.surfaceB }}>
              <img src={url} alt={`Site photo ${i + 1}`} loading="lazy" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
            </a>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}

export default TabSite;
