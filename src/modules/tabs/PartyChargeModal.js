// ── Party par charge (Company Expense H4, 21 Oct 2026) ───────────────────
// Finance → Create Transaction → Adjustments → "Party par charge". Do tarah:
//   1. Charge  — company ki doosri aamdani party par: byaaj (udhaar diya tha),
//                kiraya (jagah di hai), ya aur. Cash nahi hilta — party ka
//                baaki badhta hai (wo humein denge). POST /company-expenses/charge
//   2. Kharcha = kiraya — party ne hamara kharcha bhara (jaise office ka bijli
//                bill) aur wahi uska kiraya hai: kharcha + utna hi kiraya ek
//                saath, party ka balance nahi hilta, P&L me dono. POST /swap
// Dono Multi-Level Approval "Company Expense" se; approve tak kahin nahi gine.

import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
async function uploadBill(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/expense");
  const r = await fetch(`https://api.cloudinary.com/v1_1/dd632nqfm/${/^image\//.test(file.type) ? "image" : "auto"}/upload`, { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.secure_url) throw new Error((d.error && d.error.message) || t("pch.upload_fail"));
  return d.secure_url;
}

export default function PartyChargeModal({ onClose, onSaved, initialMode = "charge" }) {
  const [mode, setMode] = useState(initialMode);
  const [parties, setParties] = useState([]);
  const [heads, setHeads] = useState([]);
  const [locs, setLocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [f, setF] = useState({ party: "", kind: "interest", amount: "", date: todayLocal(), period: todayLocal().slice(0, 7), bill_no: "", gst: "",
    photo: "", note: "", head: "", where: "loc", loc: "", project: "" });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState("");
  const [dup, setDup] = useState(null);
  const [force, setForce] = useState(false);
  const [why, setWhy] = useState("");
  const [done, setDone] = useState(null);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(""); setDup(null); };
  const dupRef = useRef(null);
  useEffect(() => { if (dup && dupRef.current) dupRef.current.scrollIntoView({ block: "center", behavior: "smooth" }); }, [dup]);

  useEffect(() => {
    const ok = (r) => (r && r.success ? r.data || [] : []);
    api.get("/finance/parties").then((r) => setParties(ok(r).filter((p) => !Number(p.is_staff)))).catch(() => {});
    api.get("/library/expense-heads").then((r) => setHeads(ok(r).filter((h) => Number(h.is_active) !== 0))).catch(() => {});
    api.get("/geofences").then((r) => setLocs(ok(r).filter((g) => g.project_id == null && (g.kind === "office" || g.kind === "warehouse")))).catch(() => {});
    api.get("/projects").then((r) => setProjects(ok(r))).catch(() => {});
  }, []);
  const partyOpts = useMemo(() => parties.map((p) => ({ key: p.id, label: p.name, sub: p.type || "", search: p.phone || "" })), [parties]);
  const party = parties.find((p) => String(p.id) === String(f.party));
  const amt = Number(f.amount) || 0;
  const swap = mode === "swap";
  const missing = !f.party ? t("pch.need_party") : !(amt > 0) ? t("pch.need_amount") : !f.date ? t("pch.need_date")
    : swap && !f.head ? t("pch.need_head") : swap && f.where === "loc" && !f.loc ? t("pch.need_loc") : swap && f.where === "project" && !f.project ? t("pch.need_project")
    : dup && !force ? t("pch.need_force") : dup && force && why.trim().length < 3 ? t("pch.need_force_why") : "";

  const save = async () => {
    if (missing) { setErr(missing); return; }
    setBusy(true); setErr("");
    const common = { party_id: Number(f.party), amount: amt, date: f.date, expense_period: f.period || f.date.slice(0, 7), note: f.note.trim() || null,
      photo_url: f.photo || null, ...(dup && force ? { force: true, force_reason: why.trim() } : {}) };
    const body = swap
      ? { ...common, expense_head_id: Number(f.head), ...(f.where === "loc" ? { location_id: Number(f.loc) } : f.where === "project" ? { project_id: Number(f.project) } : {}) }
      : { ...common, income_kind: f.kind, bill_no: f.bill_no.trim() || null, ...(f.gst !== "" ? { gst_amount: Number(f.gst) || 0 } : {}) };
    try {
      const r = await api.post(swap ? "/company-expenses/swap" : "/company-expenses/charge", body);
      if (r && r.success) { setDone(r.data); if (onSaved) onSaved(r.data); }
      else if (r && r.code === "DUP_PERIOD") { setDup({ message: r.message }); setForce(false); }
      else setErr((r && r.message) || t("pch.save_fail"));
    } catch (e) { setErr(e.message || t("pch.save_fail")); }
    setBusy(false);
  };

  const L = { display: "block", fontSize: 11, fontWeight: 700, color: T.t3, marginBottom: 4 };
  const I = { width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 13, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" };
  const row = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 12 };
  const seg = (on, c = T.blu) => ({ flex: "1 1 150px", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    border: `1.5px solid ${on ? c : T.b1}`, background: on ? T.surfaceB : T.surface, color: on ? c : T.t2 });
  const btn = (kind, off) => ({ padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: off ? "default" : "pointer",
    border: kind === "ghost" ? `1px solid ${T.b2}` : "none", background: kind === "ghost" ? T.surface : off ? T.b2 : T.blu, color: kind === "ghost" ? T.t2 : "#fff" });
  const effect = !(amt > 0) || !party ? "" : swap
    ? t("pch.eff_swap", { party: party.name, amt: inr(amt) })
    : t("pch.eff_charge", { party: party.name, amt: inr(amt), kind: t("pch.kind_" + f.kind) });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(720px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("pch.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("pch.subtitle")}</div>
          </div>
          <button onClick={onClose} aria-label={t("pch.close")} style={{ border: "none", background: "none", fontSize: 20, color: T.t4, cursor: "pointer" }}>×</button>
        </div>
        {done ? (
          <div style={{ padding: "26px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.grn }}>{done.approval_status === "pending" ? t("pch.done_pending", { id: done.id }) : t("pch.done_ok", { id: done.id })}</div>
            <div style={{ fontSize: 12.5, color: T.t3, marginTop: 6 }}>{done.approval_status === "pending" ? t("pch.done_pending_sub") : t("pch.done_ok_sub")}</div>
            <button onClick={onClose} style={{ ...btn("primary"), marginTop: 18 }}>{t("pch.close")}</button>
          </div>
        ) : (<>
          <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {[["charge", T.grn], ["swap", T.pur]].map(([m, c]) => (
                <button key={m} onClick={() => { setMode(m); setErr(""); setDup(null); }} style={seg(mode === m, c)}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t("pch.mode_" + m)}</div>
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("pch.mode_" + m + "_sub")}</div>
                </button>
              ))}
            </div>
            <div style={row}>
              <div><label style={L}>{swap ? t("pch.party_swap") : t("pch.party")} *</label>
                <SearchSelect value={f.party} options={partyOpts} onChange={(k) => set("party", k)} placeholder={t("pch.party_ph")} theme={T} /></div>
              {!swap && (
                <div><label style={L}>{t("pch.kind")} *</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["interest", "rent", "other"].map((k) => (
                      <button key={k} onClick={() => set("kind", k)} style={{ ...seg(f.kind === k), flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, padding: "7px 6px" }}>{t("pch.kind_" + k)}</button>
                    ))}
                  </div></div>
              )}
            </div>
            {swap && (<>
              <div style={row}>
                <div><label style={L}>{t("pch.head")} *</label>
                  <SearchSelect value={f.head} options={heads.map((h) => ({ key: h.id, label: h.name, sub: h.type || "" }))} onChange={(k) => set("head", k)} placeholder={t("pch.head_ph")} theme={T} /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={L}>{t("pch.where")} *</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {[["loc", t("pch.where_loc")], ["project", t("pch.where_project")], ["company", t("pch.where_company")]].map(([v, l]) => (
                    <button key={v} onClick={() => set("where", v)} style={{ ...seg(f.where === v), textAlign: "center", fontSize: 12.5, fontWeight: 600 }}>{l}</button>
                  ))}
                </div>
                {f.where === "loc" && <SearchSelect value={f.loc} options={locs.map((g) => ({ key: g.id, label: g.label, sub: g.city_name || "", group: g.kind === "office" ? t("pch.grp_office") : t("pch.grp_store") }))} onChange={(k) => set("loc", k)} placeholder={t("pch.loc_ph")} theme={T} />}
                {f.where === "project" && <SearchSelect value={f.project} options={projects.map((p) => ({ key: p.id, label: p.name }))} onChange={(k) => set("project", k)} placeholder={t("pch.project_ph")} theme={T} />}
              </div>
            </>)}
            <div style={row}>
              <div><label style={L}>{t("pch.date")} *</label><input type="date" value={f.date} onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, date: v, period: v ? v.slice(0, 7) : x.period })); setErr(""); setDup(null); }} style={I} /></div>
              <div><label style={L}>{t("pch.period")}</label><input type="month" value={f.period} onChange={(e) => set("period", e.target.value)} style={I} /></div>
              <div><label style={L}>{t("pch.amount")} *</label><input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" style={{ ...I, fontWeight: 700 }} /></div>
            </div>
            <div style={row}>
              {!swap && <div><label style={L}>{t("pch.bill_no")}</label><input value={f.bill_no} onChange={(e) => set("bill_no", e.target.value)} maxLength={60} style={I} /></div>}
              {!swap && <div><label style={L}>{t("pch.gst")}</label><input type="number" min="0" step="0.01" value={f.gst} onChange={(e) => set("gst", e.target.value)} placeholder={t("pch.gst_ph")} style={I} /></div>}
              <div><label style={L}>{t("pch.file")}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", height: 34 }}>
                  <label style={{ ...btn("ghost"), padding: "6px 12px", fontSize: 12, display: "inline-block" }}>
                    {up ? t("pch.uploading") : f.photo ? t("pch.file_change") : t("pch.file_pick")}
                    <input type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                      onChange={async (e) => { const file = e.target.files && e.target.files[0]; if (!file) return; setUp(true); try { set("photo", await uploadBill(file)); } catch (x) { setErr(x.message); } setUp(false); }} />
                  </label>
                  {f.photo && <a href={f.photo} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.blu, fontWeight: 600 }}>{t("pch.file_view")}</a>}
                </div></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={L}>{t("pch.note")}</label><input value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={1000} placeholder={swap ? t("pch.note_ph_swap") : t("pch.note_ph")} style={I} /></div>
            {effect && (
              <div style={{ padding: "10px 13px", borderRadius: 8, background: T.surfaceB, border: `1px solid ${T.b1}`, borderLeft: `4px solid ${swap ? T.pur : T.grn}`, fontSize: 12.5, color: T.t2, lineHeight: 1.55 }}>
                {effect}<div style={{ fontSize: 11.5, color: T.t4, marginTop: 2 }}>{t("pch.after_approval")}</div>
              </div>
            )}
            {dup && (
              <div ref={dupRef} style={{ marginTop: 12, padding: "10px 13px", borderRadius: 8, background: T.ambL, border: `1px solid ${T.ambM}`, fontSize: 12.5, color: T.t2 }}>
                <div style={{ fontWeight: 600, color: T.amb, marginBottom: 6 }}>{dup.message}</div>
                <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> {t("pch.not_dup")}</label>
                {force && <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={250} placeholder={t("pch.not_dup_why")} style={{ ...I, marginTop: 6 }} />}
              </div>
            )}
          </div>
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 9, alignItems: "center", background: T.surfaceB, flexWrap: "wrap" }}>
            <button onClick={onClose} disabled={busy} style={{ ...btn("ghost", busy), marginRight: "auto" }}>{t("pch.cancel")}</button>
            {(err || missing) && <span style={{ fontSize: 12, color: err ? T.red : T.t3, fontWeight: err ? 600 : 400 }}>{err || missing}</span>}
            <button onClick={save} disabled={busy || up || !!missing} style={btn("primary", busy || up || !!missing)}>{busy ? t("pch.saving") : t("pch.save")}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}
