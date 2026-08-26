import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

/* ────────────────────────────────────────────────────────────────────
   DIN KA BYORA — "aaj site par kya hua?" ek jagah (Sahayak idea a)

   Din ke nishaan paanch tab me bikhre hote hain — qty entries, photos,
   naye issues, material (GRN), haaziri. PM shaam ko sab jodta phirta
   tha. Ye modal /projects/:id/daily-digest se sab EK saath laata hai:
   ankde SQL se (kabhi AI se nahi), upar ka para AI se (mile to).
   Wahi byora Sahayak chat me bhi milta hai: "aaj banjari site par kya
   hua?" — dono ek hi queries chalate hain, alag jawab ho hi nahi sakta.
   ──────────────────────────────────────────────────────────────────── */

const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function DinKaByoraModal({ projectId, onClose }) {
  const [date, setDate] = useState(todayYMD());
  const [data, setData] = useState(null);     // null = load ho raha
  const [err, setErr] = useState("");

  const load = useCallback(async (d) => {
    setData(null); setErr("");
    const r = await api.get(`/projects/${projectId}/daily-digest?date=${d}`, { timeoutMs: 60000 });
    if (!r?.success) { setErr(r?.message || "Byora nahi bana"); setData({}); return; }
    setData(r.data);
  }, [projectId]);
  useEffect(() => { load(date); }, [load, date]);

  const chip = (label, n, c, bg) => n > 0 && (
    <span key={label} style={{ fontSize: 11, fontWeight: 700, color: c, background: bg,
      padding: "3px 10px", borderRadius: 14 }}>{label}: {n}</span>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ background: T.surface, borderRadius: 13, width: "min(620px,100%)",
        maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 17px",
          borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("din_ka_byora.din_ka_byora")}</div>
            <div style={{ fontSize: 11, color: T.t4, marginTop: 1 }}>
             {t("din_ka_byora.ankde_entries_photos_grn_haaziri_se")}
            </div>
          </div>
          <input type="date" value={date} max={todayYMD()} onChange={(e) => setDate(e.target.value)}
            style={{ padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.b1}`, fontSize: 12,
              color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 17px" }}>
          {data === null && <div style={{ padding: "26px 0", textAlign: "center", fontSize: 12.5, color: T.t3 }}>{t("din_ka_byora.byora_ban_raha_hai")}</div>}
          {!!err && <div style={{ background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
            borderRadius: 8, padding: "9px 12px", fontSize: 12 }}>{err}</div>}

          {data && data.text && (<>
            {data.ai_note && (
              <div style={{ background: T.indL, border: `1px solid ${T.ind}33`, borderRadius: 9,
                padding: "10px 13px", fontSize: 12.5, color: T.t1, lineHeight: 1.65, marginBottom: 12 }}>
                🤖 {data.ai_note}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {chip("Qty entries", data.qty_entries?.length || 0, "#1D4ED8", T.bluL)}
              {chip("Photos", data.photos?.total || 0, "#047857", T.grnL)}
              {chip("Naye issues", data.new_issues?.length || 0, "#B91C1C", T.redL)}
              {chip("Material aaya", data.grn?.length || 0, "#B45309", T.ambL)}
              {chip("Haaziri", data.headcount || 0, "#6D28D9", T.purL)}
            </div>
            <div style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9,
              padding: "11px 13px", fontSize: 12.5, color: T.t1, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {data.text}
            </div>
            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 8 }}>{t("din_ka_byora.yahi_byora_sahayak_se_bhi_milta", { aaj: `aaj ${data.project?.name || "site"} par kya hua` })}</div>
          </>)}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 15px",
          borderTop: `1px solid ${T.b1}` }}>
          <button onClick={() => load(date)} style={{ padding: "7px 14px", borderRadius: 7,
            border: `1px solid ${T.b1}`, background: T.surface, color: T.t2, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit" }}>{t("din_ka_byora.dobara")}</button>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "none",
            background: T.blu, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit" }}>{t("common.band")}</button>
        </div>
      </div>
    </div>
  );
}
