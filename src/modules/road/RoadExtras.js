// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — Nateeja tab ke do saathi:
//
//   RoadWhatIf    — "agar is hisse ki mitti kharab nikli to?" Wahi ganit,
//                   diye gaye case/factor par. KUCH SAVE NAHI HOTA — na zone,
//                   na factor, na Rev. AI se poochho to AI sirf zone/factor
//                   sujhata hai; ankde phir bhi server ka ganit nikalta hai.
//   RoadMrSuggest — murum kitna mangwana hai (sub-grade / embankment alag),
//                   pehle se bane MR ghata kar. "MR banao" maujooda Procurement
//                   ka hi MR banata hai (photo policy, approval sab wahin ke).
//
// API: POST /road/designs/:id/what-if · POST …/ai/what-if
//      GET  /road/designs/:id/mr-suggestion · POST /procurement/mrs
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import { rget, rpost, dataOf, n2, rupee, S, btn, aiUnavailable, canRoad } from "./roadShared";

// Label render ke waqt — module load par t() chalta to bhasha badalne par purana label atka rehta.
const ROWS = [
  ["cut_cum", () => t("road.wi_row_cut")], ["from_cut_cum", () => t("road.wi_row_from_cut")],
  ["buy_loose_cum", () => t("road.wi_row_buy")], ["disposal_cum", () => t("road.wi_row_disposal")],
];

export function RoadWhatIf({ design, fromCh, toCh }) {
  const toast = useToast();
  const [f, setF] = useState({ from_ch: fromCh == null ? "" : fromCh, to_ch: toCh == null ? "" : toCh, soil_case: "C", reuse_pct: 0, loose: "" });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState(null);

  const run = async (path, body, which) => {
    setBusy(which);
    const r = await rpost(`/designs/${design.id}${path}`, body);
    setBusy("");
    if (aiUnavailable(r)) { toast.info(r.message); return; }
    if (!r || !r.success) { toast.error((r && r.message) || t("road.plan_failed")); return; }
    setOut(r.data);
  };
  const go = () => {
    const body = { override: { from_ch: Number(f.from_ch), to_ch: Number(f.to_ch), soil_case: f.soil_case, reuse_pct: Number(f.reuse_pct) } };
    if (f.loose !== "" && f.loose != null) body.factors = { compacted_to_loose: Number(f.loose) };
    run("/what-if", body, "go");
  };

  return (
    <div style={{ ...S.card, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.wi_title")}</span>
        <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.wi_hint")}</span>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={S.lbl}>{t("road.wi_from")}</label><input type="number" value={f.from_ch} onChange={(e) => setF((p) => ({ ...p, from_ch: e.target.value }))} style={{ ...S.inp, width: 96 }} /></div>
          <div><label style={S.lbl}>{t("road.wi_to")}</label><input type="number" value={f.to_ch} onChange={(e) => setF((p) => ({ ...p, to_ch: e.target.value }))} style={{ ...S.inp, width: 96 }} /></div>
          <div>
            <label style={S.lbl}>{t("road.wi_case")}</label>
            <select value={f.soil_case} onChange={(e) => setF((p) => ({ ...p, soil_case: e.target.value }))} style={{ ...S.inp, width: 250 }}>
              <option value="A">{t("road.wi_case_a")}</option>
              <option value="B">{t("road.wi_case_b")}</option>
              <option value="C">{t("road.wi_case_c")}</option>
            </select>
          </div>
          <div><label style={S.lbl}>{t("road.wi_reuse")}</label><input type="number" min="0" max="100" value={f.reuse_pct} onChange={(e) => setF((p) => ({ ...p, reuse_pct: e.target.value }))} style={{ ...S.inp, width: 90 }} /></div>
          <div><label style={S.lbl}>{t("road.wi_loose")}</label><input type="number" step="0.05" value={f.loose} placeholder="1.25" onChange={(e) => setF((p) => ({ ...p, loose: e.target.value }))} style={{ ...S.inp, width: 90 }} /></div>
          <button onClick={go} disabled={!!busy} style={{ ...btn("primary"), opacity: busy ? .6 : 1 }}>{busy === "go" ? t("road.btn_wait") : t("road.wi_go")}</button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("road.wi_ai_ph")} style={{ ...S.inp, flex: "1 1 320px" }}
            onKeyDown={(e) => { if (e.key === "Enter" && q.trim() && !busy) run("/ai/what-if", { question: q }, "ai"); }} />
          <button onClick={() => run("/ai/what-if", { question: q }, "ai")} disabled={!!busy || !q.trim()}
            style={{ ...btn("ghost", { color: T.ind, borderColor: T.indL }), opacity: busy || !q.trim() ? .5 : 1 }}>
            {busy === "ai" ? t("road.btn_wait") : t("road.wi_ai_btn")}
          </button>
        </div>

        {out && out.understood && (
          <div style={{ marginTop: 12, fontSize: 11.5, color: T.t2, lineHeight: 1.6 }}>
            <b>{t("road.wi_ai_understood")}</b> {out.understood}
            {out.scenario === null && <div style={{ color: T.amb, marginTop: 3 }}>{out.reason}</div>}
          </div>
        )}

        {out && out.base && (
          <>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
                <thead><tr>{["", t("road.wi_col_now"), t("road.wi_col_if"), t("road.wi_col_diff")].map((h, i) => (
                  <th key={i} style={{ ...S.th, textAlign: i ? "right" : "left" }}>{h}</th>))}</tr></thead>
                <tbody>
                  {ROWS.map(([k, label]) => {
                    const d = Number(out.diff[k]) || 0;
                    return (
                      <tr key={k}>
                        <td style={{ ...S.td, fontWeight: 600, color: T.t1 }}>{label()}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.num }}>{n2(out.base.totals[k])}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...S.num }}>{n2(out.alt.totals[k])}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: d > 0 ? T.red : d < 0 ? T.grn : T.t4, ...S.num }}>{d === 0 ? "—" : (d > 0 ? "+" : "") + n2(d)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: T.surfaceB }}>
                    <td style={{ ...S.td, fontWeight: 700, color: T.t1 }}>{t("road.wi_row_cost")}</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.num }}>{rupee(out.base.est_cost)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...S.num }}>{rupee(out.alt.est_cost)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: out.diff.est_cost > 0 ? T.red : out.diff.est_cost < 0 ? T.grn : T.t4, ...S.num }}>
                      {out.diff.est_cost ? (out.diff.est_cost > 0 ? "+" : "−") + rupee(Math.abs(out.diff.est_cost)) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.6, marginTop: 8 }}>
              {t("road.wi_not_saved")}{out.lines_without_rate > 0 ? " " + t("road.wi_rate_missing", { n: out.lines_without_rate }) : ""}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function RoadMrSuggest({ design }) {
  const toast = useToast();
  const mayMr = canRoad("view");
  const [data, setData] = useState(null);
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await rget(`/designs/${design.id}/mr-suggestion`);
    const d = dataOf(r, null);
    setData(d);
    const q = {};
    ((d && d.items) || []).forEach((it) => { q[it.key] = it.remaining; });
    setQty(q);
  }, [design.id]);
  useEffect(() => { load(); }, [load]);

  if (!data || !(data.items || []).length) return null;

  const make = async (it) => {
    const n = Number(qty[it.key]);
    if (!(n > 0)) { toast.error(t("road.mr_qty_required")); return; }
    setBusy(it.key);
    let r = null;
    try {
      r = await api.post("/procurement/mrs", {
        project_id: data.project_id, item_name: it.item_name || t("road.mr_item_default"), quantity: n, unit: it.unit,
        approx_amount: it.rate != null ? Math.round(n * it.rate) : null,
        task_id: it.task_id || null, task_name: it.task_name || null,
        notes: t("road.mr_note", { design: design.name }),
      });
    } catch (e) { r = { success: false, message: e && e.message }; }
    setBusy("");
    if (!r || !r.success) { toast.error((r && r.message) || t("road.save_failed")); return; }
    toast.success(t("road.mr_created", { no: (r.data && r.data.mr_number) || "" }));
    load();
  };

  return (
    <div style={{ ...S.card, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("road.mr_title")}</span>
        <span style={{ fontSize: 11, color: T.t4, marginLeft: 8 }}>{t("road.mr_hint")}</span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {!data.project_id && <div style={{ fontSize: 12, color: T.amb }}>{t("road.mr_project_needed")}</div>}
        {data.library_missing && <div style={{ fontSize: 12, color: T.amb }}>{t("road.mr_library_missing")}</div>}
        {data.items.map((it) => (
          <div key={it.key} style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", paddingBottom: 12, borderBottom: `1px solid ${T.b1}` }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{it.key === "subgrade" ? t("road.mr_for_subgrade") : t("road.mr_for_embankment")}</div>
              <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.6, marginTop: 2 }}>
                {t("road.mr_need_line", { loose: n2(it.qty_loose), compacted: n2(it.qty_compacted) })}
                {it.task_name ? " · " + t("road.mr_task_line", { task: it.task_name }) : " · " + t("road.mr_no_task")}
              </div>
              {it.existing.length > 0 && (
                <div style={{ fontSize: 11.5, color: T.amb, marginTop: 3 }}>
                  {t("road.mr_existing", { n: it.existing.length, qty: n2(it.already_requested), nos: it.existing.map((m) => m.mr_number).join(", ") })}
                </div>
              )}
            </div>
            <div>
              <label style={S.lbl}>{t("road.mr_qty", { unit: it.unit })}</label>
              <input type="number" value={qty[it.key] == null ? "" : qty[it.key]} onChange={(e) => setQty((p) => ({ ...p, [it.key]: e.target.value }))}
                style={{ ...S.inp, width: 120, textAlign: "right" }} />
            </div>
            {mayMr && data.project_id && (
              <button onClick={() => make(it)} disabled={!!busy} style={{ ...btn("primary"), opacity: busy ? .6 : 1 }}>
                {busy === it.key ? t("road.btn_wait") : t("road.mr_make_btn")}
              </button>
            )}
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.6 }}>{t("road.mr_footer")}</div>
      </div>
    </div>
  );
}
