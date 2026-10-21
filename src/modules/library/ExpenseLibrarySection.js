// ── Library → Expense Library (Company Expense H2, 21 Oct 2026) ──────────
// Har mahine / teen mahine / saal me dohrane wale company kharchon ke khaake:
// Raipur office bijli, Durg office kiraya, internet … Har khaake se har period
// ka ek "aana hai" banta hai — Finance → "Mahine ke kharche" me dikhta hai, aur
// zimmedaar ko checklist tareekh (default 25) par popup + bell, dene ki
// tareekh se pehle / nikalne par yaad.
// Server: /api/company-expenses/templates (+ /settings). Banana / badalna:
// Finance → Create wale; zimmedaar bhi Finance → Create wala hi.

import { useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const isAdminUser = () => { try { const u = JSON.parse(localStorage.getItem("gb_user") || "{}"); return ["admin", "super_admin"].includes(String(u.role || "").toLowerCase()); } catch (_) { return false; } };

const BLANK = {
  id: null, name: "", expense_head_id: "", where: "loc", location_id: "", project_id: "", expense_mode: "paid",
  account_id: "", party_id: "", payee_text: "", amount_type: "variable", amount: "", frequency: "monthly",
  start_month: thisPeriod(), end_month: "", due_day: "", remind_days: "3", responsible_user_id: "", ref_no: "", note: "",
};

function TemplateForm({ init, lists, onClose, onSaved }) {
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(""); };
  const opt = (arr, lab = (x) => x.name, sub) => arr.map((x) => ({ key: x.id, label: lab(x), sub: sub ? sub(x) : undefined }));

  const missing = f.name.trim().length < 2 ? t("elib.need_name")
    : !f.expense_head_id ? t("elib.need_head")
    : f.where === "loc" && !f.location_id ? t("elib.need_loc")
    : f.where === "project" && !f.project_id ? t("elib.need_project")
    : f.expense_mode !== "paid" && !f.party_id ? t("elib.need_party")
    : f.amount_type === "fixed" && !(Number(f.amount) > 0) ? t("elib.need_amount")
    : !f.responsible_user_id ? t("elib.need_resp") : "";

  const save = async () => {
    if (missing) { setErr(missing); return; }
    setBusy(true);
    const body = {
      name: f.name.trim(), expense_head_id: Number(f.expense_head_id),
      location_id: f.where === "loc" ? Number(f.location_id) : null, project_id: f.where === "project" ? Number(f.project_id) : null,
      expense_mode: f.expense_mode, account_id: f.expense_mode === "paid" && f.account_id ? Number(f.account_id) : null,
      party_id: f.expense_mode !== "paid" ? Number(f.party_id) : null, payee_text: f.expense_mode === "paid" ? f.payee_text : null,
      amount_type: f.amount_type, amount: f.amount === "" ? null : Number(f.amount), frequency: f.frequency,
      start_month: f.start_month, end_month: f.end_month || null, due_day: f.due_day === "" ? null : Number(f.due_day),
      remind_days: f.remind_days === "" ? 0 : Number(f.remind_days), responsible_user_id: Number(f.responsible_user_id),
      ref_no: f.ref_no, note: f.note,
    };
    const r = await (f.id ? api.put("/company-expenses/templates/" + f.id, body) : api.post("/company-expenses/templates", body)).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) onSaved(); else setErr((r && r.message) || t("elib.save_fail"));
  };

  const L = { display: "block", fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 4 };
  const I = { width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 13, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" };
  const row = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 12 };
  const seg = (on) => ({ flex: "1 1 120px", padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
    border: `1.5px solid ${on ? T.blu : T.b1}`, background: on ? T.bluL : T.surface, color: on ? T.blu : T.t2 });
  const btn = (kind, off) => ({ padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(760px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{f.id ? t("elib.edit_title") : t("elib.new_title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("elib.form_sub")}</div>
          </div>
          <button onClick={onClose} aria-label={t("elib.close")} style={{ border: "none", background: "none", fontSize: 20, color: T.t4, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
          <div style={row}>
            <div><label style={L}>{t("elib.name")} *</label><input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={160} placeholder={t("elib.name_ph")} style={I} /></div>
            <div><label style={L}>{t("elib.head")} *</label><SearchSelect value={sv(f.expense_head_id)} options={opt(lists.heads)} onChange={(k) => set("expense_head_id", k)} placeholder={t("elib.head_ph")} theme={T} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={L}>{t("elib.where")} *</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {[["loc", t("elib.where_loc")], ["project", t("elib.where_project")], ["company", t("elib.where_company")]].map(([v, l]) => (
                <button key={v} onClick={() => set("where", v)} style={seg(f.where === v)}>{l}</button>
              ))}
            </div>
            {f.where === "loc" && <SearchSelect value={sv(f.location_id)} options={lists.locs.map((g) => ({ key: g.id, label: g.label, sub: g.city_name || t("elib.no_city"), group: g.kind === "office" ? t("elib.grp_office") : t("elib.grp_store") }))} onChange={(k) => set("location_id", k)} placeholder={t("elib.loc_ph")} theme={T} />}
            {f.where === "project" && <SearchSelect value={sv(f.project_id)} options={opt(lists.projects)} onChange={(k) => set("project_id", k)} placeholder={t("elib.project_ph")} theme={T} />}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={L}>{t("elib.mode")} *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["paid", "payable", "party_paid"].map((m) => <button key={m} onClick={() => set("expense_mode", m)} style={seg(f.expense_mode === m)}>{t("elib.mode_" + m)}</button>)}
            </div>
          </div>
          {f.expense_mode === "paid" ? (
            <div style={row}>
              <div><label style={L}>{t("elib.account")}</label><SearchSelect value={sv(f.account_id)} options={[{ key: "", label: t("elib.account_any") }, ...opt(lists.accounts)]} onChange={(k) => set("account_id", k)} theme={T} /></div>
              <div><label style={L}>{t("elib.payee")}</label><input value={f.payee_text || ""} onChange={(e) => set("payee_text", e.target.value)} maxLength={160} placeholder={t("elib.payee_ph")} style={I} /></div>
            </div>
          ) : (
            <div style={row}>
              <div><label style={L}>{f.expense_mode === "payable" ? t("elib.party_payable") : t("elib.party_paid")} *</label>
                <SearchSelect value={sv(f.party_id)} options={opt(lists.parties, (p) => p.name, (p) => p.type || "")} onChange={(k) => set("party_id", k)} placeholder={t("elib.party_ph")} theme={T} /></div>
            </div>
          )}
          <div style={row}>
            <div><label style={L}>{t("elib.amount_type")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["variable", t("elib.variable")], ["fixed", t("elib.fixed")]].map(([v, l]) => <button key={v} onClick={() => set("amount_type", v)} style={seg(f.amount_type === v)}>{l}</button>)}
              </div></div>
            <div><label style={L}>{f.amount_type === "fixed" ? t("elib.amount") + " *" : t("elib.estimate")}</label>
              <input type="number" min="0" step="0.01" value={f.amount === null ? "" : f.amount} onChange={(e) => set("amount", e.target.value)} placeholder={f.amount_type === "fixed" ? "0" : t("elib.estimate_ph")} style={I} /></div>
          </div>
          <div style={row}>
            <div><label style={L}>{t("elib.frequency")}</label>
              <SearchSelect value={f.frequency} options={["monthly", "quarterly", "yearly"].map((v) => ({ key: v, label: t("elib.freq_" + v) }))} onChange={(k) => set("frequency", k)} theme={T} /></div>
            <div><label style={L} title={t("elib.start_tip")}>{t("elib.start")}</label><input type="month" value={f.start_month} onChange={(e) => set("start_month", e.target.value)} style={I} /></div>
            <div><label style={L}>{t("elib.end")}</label><input type="month" value={f.end_month || ""} onChange={(e) => set("end_month", e.target.value)} style={I} /></div>
          </div>
          <div style={row}>
            <div><label style={L}>{t("elib.due_day")}</label><input type="number" min="1" max="31" value={f.due_day === null ? "" : f.due_day} onChange={(e) => set("due_day", e.target.value)} placeholder={t("elib.due_day_ph")} style={I} /></div>
            <div><label style={L}>{t("elib.remind")}</label><input type="number" min="0" max="30" value={f.remind_days === null ? "" : f.remind_days} onChange={(e) => set("remind_days", e.target.value)} style={I} /></div>
            <div><label style={L}>{t("elib.resp")} *</label>
              <SearchSelect value={sv(f.responsible_user_id)} options={opt(lists.users, (u) => u.name, (u) => u.role || "")} onChange={(k) => set("responsible_user_id", k)} placeholder={t("elib.resp_ph")} theme={T} /></div>
          </div>
          <div style={row}>
            <div><label style={L}>{t("elib.ref_no")}</label><input value={f.ref_no || ""} onChange={(e) => set("ref_no", e.target.value)} maxLength={80} placeholder={t("elib.ref_no_ph")} style={I} /></div>
            <div><label style={L}>{t("elib.note")}</label><input value={f.note || ""} onChange={(e) => set("note", e.target.value)} maxLength={500} style={I} /></div>
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 9, alignItems: "center", background: T.surfaceB, flexWrap: "wrap" }}>
          <button onClick={onClose} disabled={busy} style={{ ...btn("ghost", busy), marginRight: "auto" }}>{t("elib.cancel")}</button>
          {(err || missing) && <span style={{ fontSize: 12, color: err ? T.red : T.t3, fontWeight: err ? 600 : 400 }}>{err || missing}</span>}
          <button onClick={save} disabled={busy || !!missing} style={btn("primary", busy || !!missing)}>{busy ? t("elib.saving") : t("elib.save")}</button>
        </div>
      </div>
    </div>
  );
}
const sv = (v) => (v == null ? "" : String(v));

export default function ExpenseLibrarySection() {
  const [rows, setRows] = useState([]);
  const [day, setDay] = useState(25);
  const [dayEdit, setDayEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(null);
  const [showOff, setShowOff] = useState(false);
  const [lists, setLists] = useState({ heads: [], locs: [], projects: [], accounts: [], parties: [], users: [] });
  const admin = isAdminUser();

  const load = () => {
    setLoading(true);
    api.get("/company-expenses/templates?all=1").then((r) => {
      if (r && r.success) { setRows(r.data || []); setDay(r.checklist_day || 25); setErr(""); }
      else setErr((r && r.message) || t("elib.load_fail"));
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const ok = (r) => (r && r.success ? r.data || [] : []);
    Promise.all([
      api.get("/library/expense-heads").catch(() => null), api.get("/geofences").catch(() => null), api.get("/projects").catch(() => null),
      api.get("/finance/accounts").catch(() => null), api.get("/finance/parties").catch(() => null), api.get("/projects/team-members").catch(() => null),
    ]).then(([h, g, p, a, pa, u]) => setLists({
      heads: ok(h).filter((x) => Number(x.is_active) !== 0),
      locs: ok(g).filter((x) => x.project_id == null && (x.kind === "office" || x.kind === "warehouse")),
      projects: ok(p), accounts: ok(a), parties: ok(pa).filter((x) => !Number(x.is_staff)), users: ok(u),
    }));
  }, []);

  const shown = useMemo(() => rows.filter((r) => showOff || Number(r.is_active) === 1), [rows, showOff]);
  const offCount = rows.filter((r) => Number(r.is_active) !== 1).length;

  const toggle = async (r) => {
    const res = await api.put("/company-expenses/templates/" + r.id, { is_active: Number(r.is_active) === 1 ? 0 : 1 }).catch((e) => ({ message: e.message }));
    if (res && res.success) load(); else setErr((res && res.message) || t("elib.save_fail"));
  };
  const saveDay = async () => {
    const res = await api.put("/company-expenses/settings", { checklist_day: Number(dayEdit) }).catch((e) => ({ message: e.message }));
    if (res && res.success) { setDay(res.data.checklist_day); setDayEdit(null); } else setErr((res && res.message) || t("elib.save_fail"));
  };
  const edit = (r) => setForm({
    ...BLANK, ...r, where: r.location_id ? "loc" : r.project_id ? "project" : "company",
    amount: r.amount == null ? "" : String(Number(r.amount)), due_day: r.due_day == null ? "" : String(r.due_day),
    remind_days: r.remind_days == null ? "" : String(r.remind_days), end_month: r.end_month || "",
  });

  const th = { fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: 0.4, padding: "8px 12px", textAlign: "left", whiteSpace: "nowrap" };
  const td = { fontSize: 12.5, color: T.t2, padding: "9px 12px", borderTop: `1px solid ${T.b1}`, verticalAlign: "top" };
  const btn = (kind) => ({ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.6 }}>{t("elib.desc")}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {dayEdit === null ? (<>
              <span>{t("elib.day_line", { day })}</span>
              {admin && <button onClick={() => setDayEdit(String(day))} style={{ border: "none", background: "none", color: T.blu, fontWeight: 600, cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "inherit" }}>{t("elib.day_change")}</button>}
            </>) : (<>
              <span>{t("elib.day_label")}</span>
              <input type="number" min="1" max="28" value={dayEdit} onChange={(e) => setDayEdit(e.target.value)} style={{ width: 60, height: 28, padding: "0 6px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontFamily: "inherit" }} />
              <button onClick={saveDay} style={btn("primary")}>{t("elib.save_short")}</button>
              <button onClick={() => setDayEdit(null)} style={btn("ghost")}>{t("elib.cancel")}</button>
            </>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {offCount > 0 && (
            <label style={{ fontSize: 12, color: T.t3, display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} /> {t("elib.show_off", { n: offCount })}
            </label>
          )}
          <button onClick={() => setForm({ ...BLANK })} style={btn("primary")}>+ {t("elib.new")}</button>
        </div>
      </div>
      {err && <div style={{ padding: "8px 12px", fontSize: 12, color: T.red, background: T.redL, borderRadius: 7, marginBottom: 10 }}>{err}</div>}
      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 9, overflow: "auto", background: T.surface }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead style={{ background: T.surfaceB }}>
            <tr>
              <th style={th}>{t("elib.col_name")}</th><th style={th}>{t("elib.col_where")}</th><th style={th}>{t("elib.col_who")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("elib.col_amount")}</th><th style={th}>{t("elib.col_when")}</th><th style={th}>{t("elib.col_resp")}</th><th style={th} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: T.t4 }}>{t("elib.loading")}</td></tr>}
            {!loading && !shown.length && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: T.t4, padding: 26 }}>{t("elib.empty")}</td></tr>}
            {!loading && shown.map((r) => (
              <tr key={r.id} style={{ opacity: Number(r.is_active) === 1 ? 1 : 0.55 }}>
                <td style={td}><div style={{ fontWeight: 700, color: T.t1 }}>{r.name}</div><div style={{ fontSize: 11, color: T.t4 }}>{r.head_name}{r.ref_no ? " · " + r.ref_no : ""}</div></td>
                <td style={td}>{r.location_name || r.project_name || t("elib.company")}{r.city_name ? <div style={{ fontSize: 11, color: T.t4 }}>{r.city_name}</div> : null}</td>
                <td style={td}>{t("elib.mode_" + r.expense_mode)}<div style={{ fontSize: 11, color: T.t4 }}>{r.expense_mode === "paid" ? [r.account_name, r.payee_text].filter(Boolean).join(" · ") : r.party_name}</div></td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{r.amount ? (r.amount_type === "fixed" ? inr(r.amount) : "~" + inr(r.amount)) : "—"}<div style={{ fontSize: 11, color: T.t4 }}>{r.amount_type === "fixed" ? t("elib.fixed") : t("elib.variable")}</div></td>
                <td style={td}>{t("elib.freq_" + r.frequency)}<div style={{ fontSize: 11, color: T.t4 }}>{r.due_day ? t("elib.due_on", { d: r.due_day }) : t("elib.no_due")}</div></td>
                <td style={td}>{r.responsible_name || "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                  <button onClick={() => edit(r)} style={btn("ghost")}>{t("elib.edit")}</button>{" "}
                  <button onClick={() => toggle(r)} style={btn("ghost")}>{Number(r.is_active) === 1 ? t("elib.turn_off") : t("elib.turn_on")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: T.t4, marginTop: 8 }}>{t("elib.foot")}</div>
      {form && <TemplateForm init={form} lists={lists} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
