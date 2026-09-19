import React, { useState, useEffect, useCallback } from "react";
import api, { API_BASE, getToken } from "../../config/api";
import { T } from "../shared/tokens";
import { Pill } from "../shared/ui";
import { t, getLang } from "../../i18n";
import { todayISO, isoDate } from "../../utils/today";

// ── Company ka din ──────────────────────────────────────────────
// Ek tareekh, poori company. Project ki DPR ek site ka sach hai; ye uska
// malik wala roop hai — kaunsi site chali, kisne DPR nahi bheji, aur wo
// sab jo kisi site se juda hi nahi (office ka paisa, EMI, godam, workshop
// me khadi machine, marammat, atke approval).
//
// Har site ka byora server se banaa-banaaya aata hai — wahi jod jo us site
// ki apni DPR banata hai (GET /api/dpr/company/day). Isliye yahan ginti
// dobara nahi ki jaati, sirf dikhayi jaati hai.
//
// Server sirf admin/super_admin ko deta hai; ye tab bhi wahin dikhta hai
// (ReportsModule), par asli rok wahan hai — yahan chhupana sirf isliye ki
// button dabane par 403 na mile.

const fetchPdf = async (path) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, "X-Lang": getLang() },
  });
  if (!res.ok) {
    let m = "";
    try { m = (await res.json()).message; } catch (_) { /* PDF ka error HTML bhi ho sakta hai */ }
    throw new Error(m || t("coday.pdf_nahi_bani"));
  }
  return await res.blob();
};
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const rs = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");
const nq = (n) => {
  const x = Number(n);
  if (!isFinite(x)) return "";
  return String(Math.round(x * 100) / 100);
};
const dayLabel = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const card = { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 };
const h2St = { fontSize: 12, fontWeight: 700, color: T.t1, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 };
const thSt = { textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", color: T.t3, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap" };
const tdSt = { fontSize: 12, color: T.t2, padding: "6px 8px", borderBottom: `1px solid ${T.b1}` };
const btn = (active) => ({
  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
  border: `1px solid ${active ? T.ind : T.b2}`, background: active ? T.indL : T.surface,
  color: active ? T.ind : T.t2,
});

function Table({ cols, rows, empty }) {
  if (!rows.length) return <div style={{ fontSize: 12, color: T.t4 }}>{empty || t("coday.kuch_nahi")}</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{cols.map((c) => <th key={c.k} style={{ ...thSt, textAlign: c.r ? "right" : "left" }}>{c.l}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map((c) => (
              <td key={c.k} style={{ ...tdSt, textAlign: c.r ? "right" : "left" }}>{r[c.k]}</td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div style={{ flex: "1 1 120px", minWidth: 110, border: `1px solid ${T.b1}`, borderRadius: 9, padding: "8px 11px", background: T.surface }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.t1, letterSpacing: "-.4px" }}>{value}</div>
      <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".6px", color: T.t3, marginTop: 1 }}>{label}</div>
    </div>
  );
}

// Ek site ka poora byora — wahi hisse jo uski DPR me hain.
function SiteDetail({ line }) {
  const a = line.day;
  if (!a) return null;
  const lab = a.labour || {};
  const tasks = a.tasks || [];
  const photos = (a.photos && a.photos.items) || [];
  return (
    <div style={{ borderTop: `1px solid ${T.b1}`, marginTop: 10, paddingTop: 10 }}>
      {lab.total > 0 && (
        <div style={{ fontSize: 12, color: T.t2, marginBottom: 8 }}>
          <b>{t("coday.c_hazri")}:</b> {nq(lab.total)}
          {lab.skilled ? ` · ${t("coday.skilled")} ${nq(lab.skilled)}` : ""}
          {lab.semi_skilled ? ` · ${t("coday.semi_skilled")} ${nq(lab.semi_skilled)}` : ""}
          {lab.unskilled ? ` · ${t("coday.unskilled")} ${nq(lab.unskilled)}` : ""}
          {lab.staff ? ` · ${t("coday.staff")} ${nq(lab.staff)}` : ""}
        </div>
      )}

      {!!tasks.length && (
        <div style={{ marginBottom: 10 }}>
          <div style={h2St}>{t("coday.kaam")}</div>
          <Table
            cols={[
              { k: "task", l: t("coday.c_kaam") },
              { k: "qty", l: t("coday.c_qty"), r: true },
              { k: "workers", l: t("coday.c_log"), r: true },
              { k: "todate", l: t("coday.c_kul_ab_tak"), r: true },
              { k: "extra", l: t("coday.c_saath_me") },
            ]}
            rows={tasks.map((x) => ({
              task: x.task + (x.stretch ? ` · ${x.stretch}` : ""),
              qty: x.qty ? `${nq(x.qty)} ${x.unit || ""}`.trim() : (x.pct != null ? `${x.pct}%` : "—"),
              workers: x.workers == null ? "—" : nq(x.workers),
              todate: x.to_date_qty == null ? "—" : `${nq(x.to_date_qty)}${x.pct_to_date != null ? ` (${x.pct_to_date}%)` : ""}`,
              extra: [
                (x.material_used || []).map((m) => `${m.material_name} ${nq(m.qty)}${m.unit ? " " + m.unit : ""}`).join(", "),
                (x.machines || []).map((m) => m.name + (m.work_qty ? ` ${nq(m.work_qty)}${m.work_unit ? " " + m.work_unit : ""}` : "")).join(", "),
                (x.trips || []).length ? `${t("coday.gaadi")} ${x.trips.length}` : "",
                (x.issues || []).map((i) => "⚠ " + i.title).join(", "),
                x.note || "",
              ].filter(Boolean).join(" · "),
            }))}
          />
        </div>
      )}

      {!!(a.machines || []).length && (
        <div style={{ marginBottom: 10 }}>
          <div style={h2St}>{t("coday.machine")}</div>
          <Table
            cols={[
              { k: "name", l: t("coday.c_machine_name") },
              { k: "hours", l: t("coday.c_ghante"), r: true },
              { k: "work", l: t("coday.c_kaam") },
              { k: "diesel", l: t("coday.c_diesel"), r: true },
              { k: "status", l: t("coday.c_haalat") },
            ]}
            rows={a.machines.map((m) => ({
              name: m.name + (m.reg_no ? ` (${m.reg_no})` : ""),
              hours: m.hours == null ? "—" : nq(m.hours),
              work: [m.task, m.work_qty ? `${nq(m.work_qty)} ${m.work_unit || ""}`.trim() : ""].filter(Boolean).join(" · ") || "—",
              diesel: m.fuel_qty == null ? "—" : nq(m.fuel_qty),
              status: m.run_status && m.run_status !== "ran"
                ? <Pill label={`${m.run_status}${m.idle_reason ? " · " + m.idle_reason : ""}`} c={T.amb} bg={T.ambL} />
                : "—",
            }))}
          />
        </div>
      )}

      {!!(a.hindrances || []).length && (
        <div style={{ fontSize: 12, color: T.amb, marginBottom: 8 }}>
          <b>{t("coday.rukawat")}:</b> {a.hindrances.map((h) => `${h.reason}${h.hours_lost ? ` (${nq(h.hours_lost)}h)` : ""}${h.note ? " — " + h.note : ""}`).join(" · ")}
        </div>
      )}

      {!!photos.length && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {photos.slice(0, 12).map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noreferrer">
              <img src={p.url} alt="" style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}` }} />
            </a>
          ))}
          {photos.length > 12 && <span style={{ fontSize: 11, color: T.t3, alignSelf: "center" }}>+{photos.length - 12}</span>}
        </div>
      )}
    </div>
  );
}

export default function CompanyDay() {
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shut, setShut] = useState({});      // site id -> band kiya hua
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    setBusy(true); setErr("");
    api.get(`/dpr/company/day?date=${date}`).then((r) => {
      if (r?.success) setData(r.data);
      else { setData(null); setErr(r?.message || t("coday.nahi_aaya")); }
    }).finally(() => setBusy(false));
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const shift = (days) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    const nd = isoDate(d);
    if (nd > todayISO()) return;
    setDate(nd);
  };

  const onPdf = async () => {
    setNote("");
    try {
      const blob = await fetchPdf(`/dpr/company/day/pdf?date=${date}`);
      saveBlob(blob, `Din_${date}.pdf`);
    } catch (e) { setNote(e.message); }
  };
  const onText = async () => {
    setNote("");
    const r = await api.get(`/dpr/company/day/text?date=${date}`);
    if (!r?.success) { setNote(r?.message || t("coday.nahi_aaya")); return; }
    try {
      await navigator.clipboard.writeText(r.data.text);
      setNote(t("coday.copy_ho_gaya"));
    } catch (_) { setNote(r.data.text); }
  };

  const tot = (data && data.totals) || {};
  const off = (data && data.offsite) || {};
  const money = off.money || {};
  const stPill = (l) => {
    if (!l.dpr) return <Pill label={t("coday.dpr_nahi")} c={T.amb} bg={T.ambL} />;
    if (l.dpr.status === "approved") return <Pill label={t("coday.approved")} c={T.ind} bg={T.indL} />;
    if (l.dpr.status === "draft") return <Pill label={t("coday.draft")} c={T.amb} bg={T.ambL} />;
    return <Pill label={t("coday.bheja")} c={T.grn} bg={T.grnL} />;
  };

  return (
    <div>
      {/* Upar: tareekh aur kagaz */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => shift(-1)} style={btn(false)}>&#8249;</button>
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)}
          style={{ padding: "6px 10px", border: `1px solid ${T.b2}`, borderRadius: 7, fontSize: 12.5, color: T.t1 }} />
        <button onClick={() => shift(1)} disabled={date >= todayISO()} style={{ ...btn(false), opacity: date >= todayISO() ? .4 : 1 }}>&#8250;</button>
        <span style={{ fontSize: 12.5, color: T.t3 }}>{dayLabel(date)}</span>
        <div style={{ flex: 1 }} />
        <button onClick={onText} style={btn(false)}>{t("coday.whatsapp")}</button>
        <button onClick={onPdf} style={btn(true)}>{t("coday.pdf")}</button>
      </div>

      {note && <div style={{ ...card, background: T.bluL, borderColor: T.bluM, color: T.t2, fontSize: 12, whiteSpace: "pre-wrap" }}>{note}</div>}
      {err && <div style={{ ...card, background: T.redL, borderColor: T.redM, color: T.red, fontSize: 12.5 }}>{err}</div>}
      {/* Purana din tab tak dikhta rehta hai jab tak naya na aaye — par chup-chaap nahi. */}
      {busy && <div style={{ ...card, fontSize: 12.5, color: T.t3 }}>{t("coday.aa_raha_hai")}</div>}

      {data && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Tile label={t("coday.t_site")} value={`${data.projects_active} / ${data.projects_total}`} />
            <Tile label={t("coday.t_dpr")} value={`${(tot.dpr?.submitted || 0) + (tot.dpr?.approved || 0)} / ${data.projects_active || 0}`} />
            {!!tot.hazri && <Tile label={t("coday.t_hazri")} value={nq(tot.hazri)} />}
            {!!tot.machine && <Tile label={t("coday.t_machine")} value={tot.machine} />}
            {!!tot.diesel_l && <Tile label={t("coday.t_diesel")} value={nq(tot.diesel_l)} />}
            {!!tot.photo && <Tile label={t("coday.t_photo")} value={tot.photo} />}
            {!!tot.money?.project?.amount && <Tile label={t("coday.t_project_paisa")} value={rs(tot.money.project.amount)} />}
            {!!money.cash_out && <Tile label={t("coday.t_cash_out")} value={rs(money.cash_out)} />}
          </div>

          {/* Site-wise */}
          <div style={card}>
            <div style={h2St}>{t("coday.site")} <span style={{ color: T.t4, fontWeight: 400 }}>{(data.projects || []).length}</span></div>
            {!(data.projects || []).length && <div style={{ fontSize: 12, color: T.t4 }}>{t("coday.nothing")}</div>}
            {(data.projects || []).map((l) => (
              <div key={l.id} style={{ border: `1px solid ${T.b1}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 13, color: T.t1 }}>{l.name}</b>
                  {stPill(l)}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11.5, color: T.t3 }}>
                    {[
                      l.summary.hazri ? `${t("coday.c_hazri")} ${nq(l.summary.hazri)}` : "",
                      l.summary.kaam_tasks ? `${t("coday.c_kaam")} ${l.summary.kaam_tasks}` : "",
                      l.summary.machine ? `${t("coday.c_machine")} ${l.summary.machine}` : "",
                      (l.summary.maal_laga || l.summary.maal_aaya) ? `${t("coday.c_maal")} ${l.summary.maal_laga}/${l.summary.maal_aaya}` : "",
                      l.summary.photo ? `${t("coday.c_photo")} ${l.summary.photo}` : "",
                      l.summary.issue ? `${t("coday.c_issue")} ${l.summary.issue}` : "",
                      l.summary.paisa_n ? rs(l.summary.paisa_amount) : "",
                    ].filter(Boolean).join(" · ")}
                  </span>
                  {l.day && (
                    <button onClick={() => setShut((s) => ({ ...s, [l.id]: !s[l.id] }))}
                      style={{ ...btn(false), padding: "4px 9px", fontSize: 11 }}>
                      {shut[l.id] ? t("coday.dikhao") : t("coday.chhupao")}
                    </button>
                  )}
                </div>
                {l.day && !shut[l.id] && <SiteDetail line={l} />}
              </div>
            ))}
            {!!data.detail_capped && (
              <div style={{ fontSize: 11.5, color: T.t3 }}>{t("coday.capped", { n: data.detail_capped })}</div>
            )}
          </div>

          {/* Chup rahi */}
          {!!(data.quiet_projects || []).length && (
            <div style={card}>
              <div style={h2St}>{t("coday.chup_rahi")} <span style={{ color: T.t4, fontWeight: 400 }}>{data.quiet_projects.length}</span></div>
              <div style={{ fontSize: 12, color: T.t3 }}>{data.quiet_projects.map((x) => x.name).join(" · ")}</div>
            </div>
          )}

          {/* Bina project */}
          <div style={{ ...card, borderColor: T.indL, borderLeft: `3px solid ${T.ind}` }}>
            <div style={{ ...h2St, color: T.ind }}>{t("coday.bina_project")}</div>

            <div style={{ marginBottom: 12 }}>
              <div style={h2St}>
                {t("coday.paisa")}
                {!!money.n && (
                  <span style={{ fontWeight: 400, color: T.t3, fontSize: 11.5 }}>
                    {t("coday.nakad_gaya")} <b style={{ color: T.t1 }}>{rs(money.cash_out)}</b>
                    {" · "}{t("coday.nakad_aaya")} <b style={{ color: T.t1 }}>{rs(money.cash_in)}</b>
                    {money.bills ? ` · ${t("coday.bill")} ${rs(money.bills)}` : ""}
                  </span>
                )}
              </div>
              <Table
                cols={[
                  { k: "type", l: t("coday.c_type") }, { k: "party", l: t("coday.c_party") },
                  { k: "head", l: t("coday.c_head") }, { k: "note", l: t("coday.c_byora") },
                  { k: "mop", l: t("coday.c_mop") }, { k: "amount", l: t("coday.c_amount"), r: true },
                ]}
                rows={(money.rows || []).map((r) => ({
                  type: r.type, party: r.party || "—", head: r.head || "—",
                  note: r.note || "", mop: r.mop || "—", amount: rs(r.amount),
                }))}
              />
            </div>

            {!!(off.fuel || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.diesel_khareed")}</div>
                <Table
                  cols={[{ k: "machine", l: t("coday.c_machine_name") }, { k: "vendor", l: t("coday.c_vendor") },
                    { k: "litres", l: t("coday.c_litre"), r: true }, { k: "amount", l: t("coday.c_amount"), r: true }]}
                  rows={off.fuel.map((f) => ({
                    machine: f.machine || f.destination || "—", vendor: f.vendor || "—",
                    litres: nq(f.litres), amount: rs(f.amount),
                  }))}
                />
              </div>
            )}

            {!!(off.machines || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.workshop")}</div>
                <Table
                  cols={[{ k: "name", l: t("coday.c_machine_name") }, { k: "status", l: t("coday.c_haalat") },
                    { k: "hours", l: t("coday.c_ghante"), r: true }, { k: "note", l: t("coday.c_byora") }]}
                  rows={off.machines.map((m) => ({
                    name: m.name + (m.reg_no ? ` (${m.reg_no})` : ""), status: m.run_status || "—",
                    hours: m.hours == null ? "—" : nq(m.hours),
                    note: [m.idle_reason, m.remark].filter(Boolean).join(" · "),
                  }))}
                />
              </div>
            )}

            {!!(off.service || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.service")}</div>
                <Table
                  cols={[{ k: "machine", l: t("coday.c_machine_name") }, { k: "type", l: t("coday.c_type") },
                    { k: "vendor", l: t("coday.c_vendor") }, { k: "down", l: t("coday.c_downtime"), r: true },
                    { k: "cost", l: t("coday.c_amount"), r: true }]}
                  rows={off.service.map((s) => ({
                    machine: (s.machine || "—") + (s.reg_no ? ` (${s.reg_no})` : ""),
                    type: s.service_type || "—", vendor: s.vendor || "—",
                    down: s.downtime_hours == null ? "—" : nq(s.downtime_hours), cost: rs(s.cost),
                  }))}
                />
              </div>
            )}

            {!!(off.warehouse || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.godam")}</div>
                <Table
                  cols={[{ k: "no", l: t("coday.c_challan") }, { k: "wh", l: t("coday.c_godam") },
                    { k: "to", l: t("coday.c_kisko") }, { k: "total", l: t("coday.c_amount"), r: true }]}
                  rows={off.warehouse.map((w) => ({
                    no: w.issue_no, wh: w.warehouse || "—", to: w.issued_to || "—", total: rs(w.total),
                  }))}
                />
              </div>
            )}

            {!!(off.material_requests || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.maang")}</div>
                <Table
                  cols={[{ k: "no", l: t("coday.c_challan") }, { k: "item", l: t("coday.c_maal") },
                    { k: "qty", l: t("coday.c_qty"), r: true }, { k: "by", l: t("coday.c_by") },
                    { k: "status", l: t("coday.c_haalat") }]}
                  rows={off.material_requests.map((x) => ({
                    no: x.mr_number, item: x.item, qty: `${nq(x.qty)} ${x.unit || ""}`.trim(),
                    by: x.by || "—", status: x.status || "—",
                  }))}
                />
              </div>
            )}

            {!!(off.approvals || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.approval")}</div>
                <Table
                  cols={[{ k: "module", l: t("coday.c_module") }, { k: "title", l: t("coday.c_title") },
                    { k: "by", l: t("coday.c_by") }, { k: "amount", l: t("coday.c_amount"), r: true },
                    { k: "status", l: t("coday.c_haalat") }]}
                  rows={off.approvals.map((a) => ({
                    module: a.module, title: a.title || a.ref_no || "—", by: a.by || "—",
                    amount: a.amount == null ? "—" : rs(a.amount),
                    status: a.status + (a.max_level > 1 ? ` (${a.level}/${a.max_level})` : ""),
                  }))}
                />
              </div>
            )}

            {(!!(off.meetings || []).length || !!(off.moms || []).length) && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.meeting")}</div>
                <div style={{ fontSize: 12, color: T.t2 }}>
                  {[...(off.meetings || []).map((m) => m.title || "—"),
                    ...(off.moms || []).map((m) => `${m.mom_no || ""} ${m.title || ""}`.trim())].join(" · ")}
                </div>
              </div>
            )}

            {!!(off.todos || []).length && (
              <div style={{ marginBottom: 12 }}>
                <div style={h2St}>{t("coday.todo")}</div>
                <div style={{ fontSize: 12, color: T.t2 }}>
                  {off.todos.map((x) => `${x.title}${x.is_done ? " ✓" : ""}`).join(" · ")}
                </div>
              </div>
            )}

            {!!(off.staff && (off.staff.present || off.staff.punched_in)) && (
              <div style={{ fontSize: 12, color: T.t2 }}>
                <b>{t("coday.office_hazri")}:</b>
                {off.staff.present ? ` ${t("coday.aaye")} ${off.staff.present}` : ""}
                {off.staff.half ? ` · ${t("coday.aadha_din")} ${off.staff.half}` : ""}
                {off.staff.punched_in ? ` · ${t("coday.punch_in")} ${off.staff.punched_in}` : ""}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
