// ── Company Expense (H1, 21 Oct 2026) ───────────────────────────────────
// Finance → Create Transaction → "Company Expense".
//
// Company ka kharcha — bijli, kiraya, internet, office ka saaman — teen sawaal:
//   1. Kis HEAD me      Library → Expense Heads (yahin se naya bhi)
//   2. Kahan ka         office / store (Settings → Locations) · project · poori company
//   3. Paisa kisne diya humne abhi bhara · baad me dena · party ne bhara
// Server: POST /api/company-expenses (routes/companyExpenses.js). Har entry
// Multi-Level Approval "Company Expense" se — approve hone tak kisi balance me
// nahi. Staff ne apne wallet se bhara ho to entry "Mera wallet" se hoti hai.

import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Bill photo / PDF — Cloudinary (wallet jaisa). PDF "auto" se.
async function uploadBill(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/expense");
  const kind = /^image\//.test(file.type) ? "image" : "auto";
  const r = await fetch(`https://api.cloudinary.com/v1_1/dd632nqfm/${kind}/upload`, { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.secure_url) throw new Error((d.error && d.error.message) || t("cexp.upload_fail"));
  return d.secure_url;
}

// Label t("cexp.mode_" + v), neeche ki line t(`cexp.mode_${v}_sub`) — template
// hi rakho: "a" + v + "_sub" ko core pack (scripts/i18n/core.js) prefix nahi
// samajhta, aur ye form login popup ke raste entry chunk me hai.
const MODES = [
  { v: "paid", c: "red" },
  { v: "payable", c: "amb" },
  { v: "party_paid", c: "pur" },
];
const MOPS = ["cash", "upi", "neft", "cheque"];

// preset = Expense Library checklist ki row ("Bana do") — khaake se pehle se bhara,
// aur server ko instance_id jaata hai taaki checklist me "ho gaya" lage.
export default function CompanyExpenseModal({ onClose, onSaved, preset }) {
  const [heads, setHeads] = useState([]);
  const [locs, setLocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [parties, setParties] = useState([]);
  const P = preset || null;
  const sv = (v) => (v == null ? "" : String(v));
  const [f, setF] = useState({
    head: sv(P && P.expense_head_id), where: P ? (P.location_id ? "loc" : P.project_id ? "project" : "company") : "loc",
    loc: sv(P && P.location_id), project: sv(P && P.project_id), date: todayLocal(),
    period: (P && P.period) || todayLocal().slice(0, 7),
    amount: P && P.amount_type === "fixed" && P.amount ? String(Number(P.amount)) : "",
    mode: (P && P.expense_mode) || "paid", account: sv(P && P.account_id), mop: "cash", payee: (P && P.payee_text) || "",
    party: sv(P && P.party_id), due: P && P.expense_mode === "payable" && P.due_date ? String(P.due_date).slice(0, 10) : "",
    bill_no: "", photo: "", gst: "", itc: false, tds: "",
    note: P ? [P.name, P.ref_no].filter(Boolean).join(" · ") : "",
  });
  const [newHead, setNewHead] = useState(null); // null = band, "" = likh rahe
  const [showTax, setShowTax] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dup, setDup] = useState(null);        // 409 — { message }
  const [force, setForce] = useState(false);
  const [forceWhy, setForceWhy] = useState("");
  const [done, setDone] = useState(null);
  // Dohri entry ka sawaal neeche banta hai — dikhte hi saamne lao
  const dupRef = useRef(null);
  useEffect(() => { if (dup && dupRef.current) dupRef.current.scrollIntoView({ block: "center", behavior: "smooth" }); }, [dup]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(""); setDup(null); };

  useEffect(() => {
    const ok = (r) => (r && r.success ? r.data || [] : []);
    api.get("/library/expense-heads").then((r) => setHeads(ok(r).filter((h) => Number(h.is_active) !== 0))).catch(() => {});
    api.get("/geofences").then((r) => setLocs(ok(r).filter((g) => g.project_id == null && (g.kind === "office" || g.kind === "warehouse")))).catch(() => {});
    api.get("/projects").then((r) => setProjects(ok(r))).catch(() => {});
    api.get("/finance/accounts").then((r) => setAccounts(ok(r))).catch(() => {});
    api.get("/finance/parties").then((r) => setParties(ok(r).filter((p) => !Number(p.is_staff)))).catch(() => {});
  }, []);

  const headOpts = useMemo(() => heads.map((h) => ({ key: h.id, label: h.name, sub: h.type || "" })), [heads]);
  const locOpts = useMemo(() => locs.map((g) => ({
    key: g.id, label: g.label, sub: g.city_name || t("cexp.no_city"),
    group: g.kind === "office" ? t("cexp.grp_office") : t("cexp.grp_store"),
  })), [locs]);
  const projOpts = useMemo(() => projects.map((p) => ({ key: p.id, label: p.name })), [projects]);
  const accOpts = useMemo(() => accounts.map((a) => ({ key: a.id, label: a.name, search: a.account_number || "" })), [accounts]);
  const partyOpts = useMemo(() => parties.map((p) => ({ key: p.id, label: p.name, sub: p.type || "", search: p.phone || "" })), [parties]);

  const amt = Number(f.amount) || 0;
  const accName = (accounts.find((a) => String(a.id) === String(f.account)) || {}).name;
  const party = parties.find((p) => String(p.id) === String(f.party));
  const loc = locs.find((g) => String(g.id) === String(f.loc));
  const missing = !f.head ? t("cexp.need_head")
    : !(amt > 0) ? t("cexp.need_amount")
    : !f.date ? t("cexp.need_date")
    : f.where === "loc" && !f.loc ? t("cexp.need_loc")
    : f.where === "project" && !f.project ? t("cexp.need_project")
    : f.mode === "paid" && !f.account ? t("cexp.need_account")
    : f.mode !== "paid" && !f.party ? t("cexp.need_party")
    : dup && force && forceWhy.trim().length < 3 ? t("cexp.need_force_why")
    : dup && !force ? t("cexp.need_force")
    : "";

  const addHead = async () => {
    const name = String(newHead || "").trim();
    if (name.length < 2) return;
    setBusy(true);
    try {
      const r = await api.post("/library/expense-heads", { name, type: "Overhead" });
      if (!r || r.success === false) throw new Error((r && r.message) || t("cexp.head_add_fail"));
      const h = r.data || {};
      const id = h.id || h.insertId;
      setHeads((x) => [...x, { id, name, type: "Overhead", is_active: 1 }]);
      set("head", String(id));
      setNewHead(null);
    } catch (e) { setErr(e.message || t("cexp.head_add_fail")); }
    setBusy(false);
  };

  const onFile = async (file) => {
    if (!file) return;
    setUpBusy(true); setErr("");
    try { set("photo", await uploadBill(file)); } catch (e) { setErr(e.message); }
    setUpBusy(false);
  };

  const save = async () => {
    if (missing) { setErr(missing); return; }
    setBusy(true); setErr("");
    const body = {
      expense_head_id: Number(f.head), amount: amt, date: f.date, expense_period: f.period || f.date.slice(0, 7),
      expense_mode: f.mode, note: f.note.trim() || null, bill_no: f.bill_no.trim() || null, photo_url: f.photo || null,
      ...(f.where === "loc" ? { location_id: Number(f.loc) } : f.where === "project" ? { project_id: Number(f.project) } : {}),
      ...(f.mode === "paid" ? { account_id: Number(f.account), mop: f.mop, payee_text: f.payee.trim() || null } : { party_id: Number(f.party) }),
      ...(f.mode === "payable" && f.due ? { due_date: f.due } : {}),
      ...(f.gst !== "" ? { gst_amount: Number(f.gst) || 0, itc_eligible: !!f.itc } : {}),
      ...(f.tds !== "" ? { tds_amount: Number(f.tds) || 0 } : {}),
      ...(dup && force ? { force: true, force_reason: forceWhy.trim() } : {}),
      ...(P ? { instance_id: P.id } : {}),
    };
    try {
      const r = await api.post("/company-expenses", body);
      if (r && r.success) {
        setDone(r.data);
        if (onSaved) onSaved(r.data);
      } else if (r && (r.code === "DUP_PERIOD" || r.code === "DUP_BILL")) {
        setDup({ message: r.message }); setForce(false);
      } else {
        setErr((r && r.message) || t("cexp.save_fail"));
      }
    } catch (e) { setErr(e.message || t("cexp.save_fail")); }
    setBusy(false);
  };

  // Is entry ka asar — approve hone ke baad
  const effect = !(amt > 0) ? "" : f.mode === "paid"
    ? t("cexp.eff_paid", { amt: inr(amt), acc: accName || "—" })
    : f.mode === "payable"
      ? t("cexp.eff_payable", { amt: inr(amt), party: (party && party.name) || "—" }) + (f.due ? " " + t("cexp.eff_due", { date: f.due.split("-").reverse().join("/") }) : "")
      : t("cexp.eff_party_paid", { amt: inr(amt), party: (party && party.name) || "—" });

  const L = { display: "block", fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 4 };
  const I = { width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 13, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" };
  const row = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 12 };
  const seg = (on, c) => ({ flex: 1, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    border: `1.5px solid ${on ? c : T.b1}`, background: on ? T.surfaceB : T.surface, color: on ? c : T.t2 });
  const btn = (kind, off) => ({ padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(760px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("cexp.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("cexp.subtitle")}</div>
          </div>
          <button onClick={onClose} aria-label={t("cexp.close")} style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: T.t4, cursor: "pointer" }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: "26px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.grn, marginBottom: 6 }}>
              {done.approval_status === "pending" ? t("cexp.done_pending", { id: done.id }) : t("cexp.done_ok", { id: done.id })}
            </div>
            <div style={{ fontSize: 12.5, color: T.t3 }}>{done.approval_status === "pending" ? t("cexp.done_pending_sub") : t("cexp.done_ok_sub")}</div>
            <div style={{ display: "flex", gap: 9, justifyContent: "center", marginTop: 18 }}>
              <button onClick={() => { setDone(null); setF((x) => ({ ...x, amount: "", bill_no: "", photo: "", note: "", gst: "", tds: "", itc: false })); }} style={btn("ghost")}>{t("cexp.add_another")}</button>
              <button onClick={onClose} style={btn("primary")}>{t("cexp.close")}</button>
            </div>
          </div>
        ) : (<>
          <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
            {P && (
              <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: T.bluL, border: "1px solid " + T.bluM, fontSize: 12, color: T.t2 }}>
                {t("cexp.from_library", { name: P.name, period: (() => { const [y, m] = String(P.period).split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); })() })}
                {P.amount_type !== "fixed" && P.amount ? " · " + t("cexp.estimate", { amt: inr(P.amount) }) : ""}
              </div>
            )}
            {/* 1. Head */}
            <div style={{ marginBottom: 12 }}>
              <label style={L}>{t("cexp.head")} *</label>
              {newHead === null ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}><SearchSelect value={f.head} options={headOpts} onChange={(k) => set("head", k)} placeholder={t("cexp.head_ph")} theme={T} /></div>
                  <button onClick={() => setNewHead("")} style={{ ...btn("ghost"), padding: "0 12px", height: 34 }}>+ {t("cexp.head_new")}</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input autoFocus value={newHead} onChange={(e) => setNewHead(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addHead(); }} placeholder={t("cexp.head_new_ph")} style={I} />
                  <button onClick={addHead} disabled={busy || String(newHead).trim().length < 2} style={{ ...btn("primary", busy || String(newHead).trim().length < 2), height: 34, padding: "0 14px" }}>{t("cexp.head_add")}</button>
                  <button onClick={() => setNewHead(null)} style={{ ...btn("ghost"), height: 34, padding: "0 12px" }}>{t("cexp.cancel")}</button>
                </div>
              )}
            </div>

            {/* 2. Kahan */}
            <div style={{ marginBottom: 12 }}>
              <label style={L}>{t("cexp.where")} *</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {[["loc", t("cexp.where_loc")], ["project", t("cexp.where_project")], ["company", t("cexp.where_company")]].map(([v, l]) => (
                  <button key={v} onClick={() => set("where", v)} style={{ ...seg(f.where === v, T.blu), flex: "1 1 150px", textAlign: "center", fontSize: 12.5, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
              {f.where === "loc" && (locOpts.length
                ? <SearchSelect value={f.loc} options={locOpts} onChange={(k) => set("loc", k)} placeholder={t("cexp.loc_ph")} theme={T} />
                : <div style={{ fontSize: 12, color: T.amb, padding: "8px 10px", background: T.ambL, borderRadius: 7 }}>{t("cexp.no_locs")}</div>)}
              {f.where === "loc" && loc && !loc.city_name && <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("cexp.loc_no_city_hint")}</div>}
              {f.where === "project" && <SearchSelect value={f.project} options={projOpts} onChange={(k) => set("project", k)} placeholder={t("cexp.project_ph")} theme={T} />}
              {f.where === "company" && <div style={{ fontSize: 11.5, color: T.t3 }}>{t("cexp.company_hint")}</div>}
            </div>

            {/* Date / mahina / rakam */}
            <div style={row}>
              <div><label style={L}>{t("cexp.date")} *</label><input type="date" value={f.date} onChange={(e) => { set("date", e.target.value); if (e.target.value) setF((x) => ({ ...x, date: e.target.value, period: e.target.value.slice(0, 7) })); }} style={I} /></div>
              <div><label style={L} title={t("cexp.period_tip")}>{t("cexp.period")}</label><input type="month" value={f.period} onChange={(e) => set("period", e.target.value)} style={I} /></div>
              <div><label style={L}>{t("cexp.amount")} *</label><input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" style={{ ...I, fontWeight: 700 }} /></div>
            </div>

            {/* 3. Kisne diya */}
            <div style={{ marginBottom: 12 }}>
              <label style={L}>{t("cexp.who_paid")} *</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MODES.map((m) => (
                  <button key={m.v} onClick={() => set("mode", m.v)} style={{ ...seg(f.mode === m.v, T[m.c]), flex: "1 1 190px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t("cexp.mode_" + m.v)}</div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t(`cexp.mode_${m.v}_sub`)}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{t("cexp.staff_hint")}</div>
            </div>
            {f.mode === "paid" && (
              <div style={row}>
                <div><label style={L}>{t("cexp.account")} *</label><SearchSelect value={f.account} options={accOpts} onChange={(k) => set("account", k)} placeholder={t("cexp.account_ph")} theme={T} /></div>
                <div><label style={L}>{t("cexp.mop")}</label>
                  <SearchSelect value={f.mop} options={MOPS.map((m) => ({ key: m, label: t("cexp.mop_" + m) }))} onChange={(k) => set("mop", k)} theme={T} /></div>
                <div><label style={L}>{t("cexp.payee")}</label><input value={f.payee} onChange={(e) => set("payee", e.target.value)} placeholder={t("cexp.payee_ph")} maxLength={160} style={I} /></div>
              </div>
            )}
            {f.mode !== "paid" && (
              <div style={row}>
                <div><label style={L}>{f.mode === "payable" ? t("cexp.party_payable") : t("cexp.party_paid_by")} *</label>
                  <SearchSelect value={f.party} options={partyOpts} onChange={(k) => set("party", k)} placeholder={t("cexp.party_ph")} theme={T} /></div>
                {f.mode === "payable" && <div><label style={L}>{t("cexp.due")}</label><input type="date" value={f.due} min={f.date || undefined} onChange={(e) => set("due", e.target.value)} style={I} /></div>}
              </div>
            )}

            {/* Bill */}
            <div style={row}>
              <div><label style={L}>{t("cexp.bill_no")}</label><input value={f.bill_no} onChange={(e) => set("bill_no", e.target.value)} maxLength={60} placeholder={t("cexp.bill_no_ph")} style={I} /></div>
              <div><label style={L}>{t("cexp.bill_file")}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: 34 }}>
                  <label style={{ ...btn("ghost"), padding: "6px 12px", fontSize: 12, display: "inline-block" }}>
                    {upBusy ? t("cexp.uploading") : f.photo ? t("cexp.file_change") : t("cexp.file_pick")}
                    <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => onFile(e.target.files && e.target.files[0])} />
                  </label>
                  {f.photo && <a href={f.photo} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.blu, fontWeight: 600 }}>{t("cexp.file_view")}</a>}
                </div>
              </div>
            </div>

            {/* GST / TDS — zaroori nahi */}
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setShowTax((v) => !v)} style={{ border: "none", background: "none", padding: 0, color: T.blu, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {showTax ? "▾" : "▸"} {t("cexp.tax_toggle")}
              </button>
              {showTax && (
                <div style={{ ...row, marginTop: 8, marginBottom: 0 }}>
                  <div><label style={L}>{t("cexp.gst")}</label><input type="number" min="0" step="0.01" value={f.gst} onChange={(e) => set("gst", e.target.value)} placeholder={t("cexp.tax_blank")} style={I} /></div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
                    <label style={{ fontSize: 12.5, color: T.t2, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                      <input type="checkbox" checked={f.itc} onChange={(e) => set("itc", e.target.checked)} /> {t("cexp.itc")}
                    </label>
                  </div>
                  <div><label style={L}>{t("cexp.tds")}</label><input type="number" min="0" step="0.01" value={f.tds} onChange={(e) => set("tds", e.target.value)} placeholder={t("cexp.tax_blank")} style={I} /></div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={L}>{t("cexp.note")}</label>
              <input value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={1000} placeholder={t("cexp.note_ph")} style={I} />
            </div>

            {effect && (
              <div style={{ padding: "10px 13px", borderRadius: 8, background: T.surfaceB, border: `1px solid ${T.b1}`, borderLeft: `4px solid ${T[(MODES.find((m) => m.v === f.mode) || MODES[0]).c]}`, fontSize: 12.5, color: T.t2, lineHeight: 1.55 }}>
                {effect}
                <div style={{ fontSize: 11.5, color: T.t4, marginTop: 2 }}>{t("cexp.eff_after_approval")}</div>
              </div>
            )}

            {dup && (
              <div ref={dupRef} style={{ marginTop: 12, padding: "10px 13px", borderRadius: 8, background: T.ambL, border: `1px solid ${T.ambM}`, fontSize: 12.5, color: T.t2 }}>
                <div style={{ fontWeight: 600, color: T.amb, marginBottom: 6 }}>{dup.message}</div>
                <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> {t("cexp.not_dup")}
                </label>
                {force && <input value={forceWhy} onChange={(e) => setForceWhy(e.target.value)} maxLength={250} placeholder={t("cexp.not_dup_why")} style={{ ...I, marginTop: 6 }} />}
              </div>
            )}
          </div>

          <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 9, alignItems: "center", background: T.surfaceB, flexWrap: "wrap" }}>
            <button onClick={onClose} disabled={busy} style={{ ...btn("ghost", busy), marginRight: "auto" }}>{t("cexp.cancel")}</button>
            {(err || missing) && <span style={{ fontSize: 12, color: err ? T.red : T.t3, fontWeight: err ? 600 : 400 }}>{err || missing}</span>}
            <button onClick={save} disabled={busy || upBusy || !!missing} style={btn("primary", busy || upBusy || !!missing)}>
              {busy ? t("cexp.saving") : t("cexp.save")}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}
