import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

/* ────────────────────────────────────────────────────────────────────
   KAL KA PLAN — "kal kya karna hai?" (Sahayak idea b)

   Raftar (pichhle 7 din), bacha kaam, deadline ka dabav, ruka hua
   kaam, shuru hone layak kaam — sab GANIT se (/tasks/project/:id/
   kal-ka-plan → utils/kalKaPlan, tested). AI sirf upar 2-3 vaakya
   likhta hai. Ye SUJHAV hai — kal kya hoga, PM tay karta hai.
   ──────────────────────────────────────────────────────────────────── */

const fq = (n, u) => `${Math.round(Number(n) * 100) / 100}${u ? " " + u : ""}`;

export default function KalKaPlanModal({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setData(null); setErr("");
    const r = await api.get(`/tasks/project/${projectId}/kal-ka-plan`, { timeoutMs: 60000 });
    if (!r?.success) { setErr(r?.message || "Plan nahi bana"); setData({}); return; }
    setData(r.data);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const Sec = ({ title, color, children }) => (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase",
        letterSpacing: ".5px", marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
  const Row = ({ main, sub, chip, chipC, chipBg }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 11px",
      border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 5, background: T.surface }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{main}</div>
        {sub && <div style={{ fontSize: 10.5, color: T.t3, marginTop: 1 }}>{sub}</div>}
      </div>
      {chip && <span style={{ fontSize: 9.5, fontWeight: 800, color: chipC, background: chipBg,
        padding: "2px 8px", borderRadius: 12, flexShrink: 0 }}>{chip}</span>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ background: T.surface, borderRadius: 13, width: "min(640px,100%)",
        maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "13px 17px", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>🌅 Kal ka plan</div>
          <div style={{ fontSize: 11, color: T.t4, marginTop: 1 }}>
            Raftar + schedule + rukavat, sab ganit se — ye sujhaav hai, faisla aapka
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 17px" }}>
          {data === null && <div style={{ padding: "26px 0", textAlign: "center", fontSize: 12.5, color: T.t3 }}>Hisaab lag raha hai…</div>}
          {!!err && <div style={{ background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
            borderRadius: 8, padding: "9px 12px", fontSize: 12 }}>{err}</div>}

          {data && data.counts && (<>
            {data.ai_note && (
              <div style={{ background: T.indL, border: `1px solid ${T.ind}33`, borderRadius: 9,
                padding: "10px 13px", fontSize: 12.5, color: T.t1, lineHeight: 1.65, marginBottom: 13 }}>
                🤖 {data.ai_note}
              </div>
            )}

            {!!data.stalled?.length && (
              <Sec title={`Ruka hua (${data.stalled.length})`} color="#B91C1C">
                {data.stalled.map((r) => (
                  <Row key={r.task_id} main={r.name}
                    sub={`${r.pace.idle_days} din se koi entry nahi${r.remaining !== null ? ` · ${fq(r.remaining, r.unit)} bacha` : ""}`}
                    chip="RUKA" chipC="#B91C1C" chipBg={T.redL} />
                ))}
              </Sec>
            )}

            {!!data.continue?.length && (
              <Sec title={`Chalu kaam (${data.continue.length})`} color="#1D4ED8">
                {data.continue.map((r) => (
                  <Row key={r.task_id} main={r.name}
                    sub={[
                      r.remaining !== null ? `${fq(r.remaining, r.unit)} bacha` : `${r.progress}%`,
                      r.pace.per_active_day ? `raftar ${fq(r.pace.per_active_day, r.unit)}/din` : null,
                      r.kal_ka_andaza ? `kal ~${fq(r.kal_ka_andaza, r.unit)}` : null,
                      r.at_risk && r.need_per_day ? `chahiye ${fq(r.need_per_day, r.unit)}/din` : null,
                    ].filter(Boolean).join(" · ")}
                    chip={r.late_already ? "DEADLINE NIKLI" : r.at_risk ? "RAFTAR KAM" : "THEEK"}
                    chipC={r.late_already ? "#B91C1C" : r.at_risk ? "#B45309" : "#047857"}
                    chipBg={r.late_already ? T.redL : r.at_risk ? T.ambL : T.grnL} />
                ))}
              </Sec>
            )}

            {!!data.start?.length && (
              <Sec title={`Shuru ho sakta hai (${data.start.length})`} color="#047857">
                {data.start.map((r) => (
                  <Row key={r.task_id} main={r.name}
                    sub={r.scope_qty ? `${fq(r.scope_qty, r.unit)} ka kaam · koi rukavat nahi` : "koi rukavat nahi"}
                    chip="TAIYAAR" chipC="#047857" chipBg={T.grnL} />
                ))}
              </Sec>
            )}

            {!!data.blocked?.length && (
              <Sec title={`Atka hua (${data.blocked.length})`} color="#B45309">
                {data.blocked.map((r) => (
                  <Row key={r.task_id} main={r.name}
                    sub={`pehle "${r.waiting_on[0]?.name}" poora ho (abhi ${r.waiting_on[0]?.progress}%)`}
                    chip="ATKA" chipC="#B45309" chipBg={T.ambL} />
                ))}
              </Sec>
            )}

            {!data.continue?.length && !data.start?.length && !data.stalled?.length && !data.blocked?.length && (
              <div style={{ padding: "22px 0", textAlign: "center", fontSize: 12.5, color: T.t3 }}>
                Koi chalu kaam nahi mila — pehle Tasks me plan banao.
              </div>
            )}

            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>
              Yahi Sahayak se bhi: "{`kal ${data.project?.name || "site"} par kya karna hai`}"
            </div>
          </>)}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 15px",
          borderTop: `1px solid ${T.b1}` }}>
          <button onClick={load} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Dobara</button>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "none",
            background: T.blu, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit" }}>Band</button>
        </div>
      </div>
    </div>
  );
}
