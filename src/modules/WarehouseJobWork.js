// ── 🚚 JOB WORK — Store (11 Oct 2026, Job Work) ─────────────────────
// Store ka material vendor ke yard par banwane jaata hai (TMT → bending yard),
// wahan bana item (Ring), bacha raw aur kabad wapas aata hai; vendor sirf
// banwai ka bill deta hai. Material poore waqt HAMARA (GST Sec 143 — delivery
// challan, 1 saal me wapas, ITC-04).
//
//   "🚚 Job Work par bhejo" — vendor (party), lines store ke stock se, gaadi,
//     note, challan photo (policy job_work). Stock FIFO se ghatta hai, line par
//     FIFO cost (bill → GRN → ₹0, Conversion wala niyam). JW-001 Open.
//   JW ka detail — bheja / baaki, "📥 Wapas aaya" (bana + raw laga, raw wapas,
//     kabad: vendor ne rakha / wapas aaya), banwai (per Kg / per piece / kul ₹,
//     bill no., bill photo job_work_bill, Cash / Udhaar), "💰 Banwai darj karo"
//     (bill baad me), "🖨 Challan print", cancel (Admin + wajah + password).
//   "🏭 Vendor ke paas" — vendor-wise baaki, 300 din par peela, 365 par laal.
//   "🧾 ITC-04" — tareekh ke beech bheja + wapas, table + CSV.
//
// Data: gb-backend routes/job-works.js (/api/job-works). Module apne aap me
// poora — kisi doosre module ka component nahi (WarehouseConversion jaisa).

import { useState, useEffect, useMemo, useCallback } from "react";
import PickSelect from "../components/PickSelect";
import api from "../config/api";
import { t } from "../i18n";
import { BackClose } from "../utils/backNav";
import uploadManager from "../utils/uploadManager";
import { cld } from "../utils/cloudinary";
import { loadPhotoPolicy, policyFor, fileInputProps } from "../utils/photoPolicy";

const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB", sb: "#0D1B2A",
  ind: "#4B45C4", indL: "#EEEDFB",
  grn: "#059669", grnL: "#ECFDF5",
  red: "#DC2626", redL: "#FEF2F2",
  amb: "#B45309", ambL: "#FFFBEB", ambM: "#FDE68A",
  slt: "#64748B", sltL: "#F1F5F9",
};
const UNITS = ["Nos", "Kg", "Ton", "Mtr", "Rmt", "Bag", "Cum", "Sqm", "Sqft", "Cft", "Ltr", "Pcs", "Set", "Bundle"];
const key = (s) => String(s || "").trim().toLowerCase();
const num = (v) => Number(v) || 0;
const fmtQ = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? "—" : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};
const day10 = (d) => (d ? String(d).slice(0, 10) : "");
const istToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const inp = { width: "100%", padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: T.surface, color: T.t1 };
const btn = (bg, c = "#fff", brd) => ({ padding: "8px 14px", borderRadius: 7, border: brd ? `1.5px solid ${brd}` : "none", background: bg, color: c, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const lbl = { fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3, display: "block" };
const secT = { fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 };
const CHALLAN_FOLDER = "gb_buildcon/job_work";
const BILL_FOLDER = "gb_buildcon/job_work_bill";
const STATUSES = ["Open", "PartReceived", "Closed", "Cancelled"];
const statusChip = (s) => ({
  Open: { l: t("jobwork.st_open"), c: T.ind, bg: T.indL },
  PartReceived: { l: t("jobwork.st_part"), c: T.amb, bg: T.ambL },
  Closed: { l: t("jobwork.st_closed"), c: T.grn, bg: T.grnL },
  Cancelled: { l: t("jobwork.st_cancelled"), c: T.t4, bg: T.sltL },
}[s] || { l: s, c: T.t3, bg: T.sltL });
const Chip = ({ s }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: s.c, background: s.bg, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>{s.l}</span>
);
// 300+ din peela, 365+ laal (server ka age_flag).
const ageColor = (f) => (f === "red" ? T.red : f === "yellow" ? T.amb : T.t3);
const ageMsg = (f, days) => (f === "red" ? t("jobwork.age_red") : f === "yellow" ? t("jobwork.age_yellow", { days }) : "");
const srcLabel = (s) => (s === "bill" ? t("conversion.src_bill") : s === "grn" ? t("conversion.src_grn") : t("conversion.src_none"));
const uploading = (folder) => uploadManager.getQueue().some((q) => q.folder === folder && (q.status === "queued" || q.status === "uploading"));
const lineText = (l, f) => `${l.material_name} ${fmtQ(f(l))} ${l.unit || ""}`.trim();

function Drawer({ title, sub, width = 760, onClose, children, footer }) {
  return (
    <>
      <BackClose onClose={onClose} />
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1400 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: `min(${width}px,100vw)`, background: T.surface, zIndex: 1401,
        display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background: T.sb, padding: "13px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="close" style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>{children}</div>
        {footer && <div style={{ borderTop: `1px solid ${T.b1}`, padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </>
  );
}

// Photo — upload chalu ho to save rokta hai (folder se pehchaan).
function PhotoPick({ pol, folder, photos, setPhotos, label }) {
  if (!pol || pol.mode === "off") return null;
  return (
    <div>
      <span style={lbl}>{label}{pol.mode === "required" ? " *" : ""}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {photos.map((u, i) => (
          <div key={i} style={{ position: "relative", width: 52, height: 52, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.b1}` }}>
            <img src={cld(u, "thumb")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))}
              style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", padding: 0 }}>×</button>
          </div>
        ))}
        <label style={{ width: 52, height: 52, borderRadius: 6, border: `1.5px dashed ${T.b2}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>
          📷
          <input {...fileInputProps({ source: pol.source === "camera" ? "camera" : "both" }, { multiple: true })} style={{ display: "none" }}
            onChange={(e) => {
              Array.from(e.target.files || []).forEach((file) => uploadManager.add({
                file, folder, label: t("jobwork.photo_upload", { name: file.name }),
                onDone: (url) => setPhotos((x) => [...x, url]),
              }));
              e.target.value = "";
            }} />
        </label>
      </div>
    </div>
  );
}

// Banwai — basis / rate / bill no. / Cash-Udhaar (vendor = JW ka vendor).
function MakingFields({ mk, setMk, amount, basisQty, basisUnit, vendor }) {
  const F = (k, v) => setMk((x) => ({ ...x, [k]: v }));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <span style={lbl}>{t("conversion.making_basis")}</span>
          <PickSelect value={mk.basis} onChange={(e) => F("basis", e.target.value)} style={inp}>
            <option value="per_kg">{t("conversion.basis_per_kg")}</option>
            <option value="per_piece">{t("conversion.basis_per_piece")}</option>
            <option value="lumpsum">{t("conversion.basis_lumpsum")}</option>
          </PickSelect>
        </div>
        <div>
          <span style={lbl}>{mk.basis === "lumpsum" ? t("conversion.making_amount") : t("conversion.making_rate")}</span>
          <input type="number" min="0" value={mk.rate} onChange={(e) => F("rate", e.target.value)} style={inp} />
        </div>
        <div>
          <span style={lbl}>{t("conversion.making_total")}</span>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, paddingTop: 7 }}>
            {amount != null ? inr(amount) : "—"}
            {basisQty != null && <span style={{ fontSize: 10.5, color: T.t4, fontWeight: 500 }}> · {fmtQ(basisQty)} {basisUnit}</span>}
          </div>
        </div>
        <div>
          <span style={lbl}>{t("conversion.bill_no")}</span>
          <input value={mk.bill} onChange={(e) => F("bill", e.target.value)} style={inp} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <span style={lbl}>{t("conversion.pay_mode")}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[["cash", t("conversion.pay_cash")], ["credit", t("conversion.pay_credit")]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => F("pay", k)}
                style={{ ...btn(mk.pay === k ? T.indL : T.surface, mk.pay === k ? T.ind : T.t3, mk.pay === k ? T.ind : T.b1), padding: "6px 12px", fontSize: 12 }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("jobwork.making_hint", { vendor: vendor || "—" })}</div>
    </>
  );
}
const makingBody = (mk) => (mk.rate === "" || !(num(mk.rate) > 0) ? null
  : { basis: mk.basis, rate: Number(mk.rate), bill_no: mk.bill.trim() || null, payment_mode: mk.pay });
const blankMk = () => ({ basis: "per_kg", rate: "", bill: "", pay: "credit" });

// Admin cancel — wajah + company ka delete-password.
function CancelBox({ title, hint, url, onDone, onClose }) {
  const [reason, setReason] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr("");
    if (reason.trim().length < 3) { setErr(t("conversion.cancel_reason_short")); return; }
    setBusy(true);
    const r = await api.post(url, { reason: reason.trim(), password: pw }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    window.alert(r.message || "");
    onDone && onDone();
  };
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: T.redL, border: `1.5px solid ${T.red}44`, borderRadius: 9 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>{title}</div>
      <div style={{ fontSize: 11, color: T.t3, margin: "3px 0 9px" }}>{hint}</div>
      <span style={lbl}>{t("conversion.cancel_reason")}</span>
      <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inp, resize: "vertical", marginBottom: 8 }} />
      <span style={lbl}>{t("conversion.cancel_pw")}</span>
      <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
      {err && <div style={{ fontSize: 11.5, color: T.red, fontWeight: 600, marginTop: 7 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.close")}</button>
        <button onClick={go} disabled={busy} style={{ ...btn(T.red), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.cancelling") : t("conversion.cancel_confirm")}</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Bhejo — form
// ════════════════════════════════════════════════════════════════
const blankLine = () => ({ id: "", qty: "" });

function SendForm({ whId, whName, stock, onClose, onSaved }) {
  const avail = useMemo(() => (stock || []).filter((m) => num(m.qty) > 0).sort((a, b) => String(a.name).localeCompare(String(b.name))), [stock]);
  const byId = useMemo(() => new Map((stock || []).map((m) => [String(m.id), m])), [stock]);
  const [parties, setParties] = useState([]);
  const [pol, setPol] = useState(null);
  const [vendor, setVendor] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const [date, setDate] = useState(istToday());
  const [vehicle, setVehicle] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [prev, setPrev] = useState(null);
  const [prevErr, setPrevErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    api.get("/finance/parties").then((r) => setParties(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => {});
    loadPhotoPolicy().then(setPol).catch(() => {});
  }, []);
  const filled = lines.filter((l) => l.id && num(l.qty) > 0);
  const body = useMemo(() => (!vendor || !filled.length ? null : {
    warehouse_id: Number(whId), vendor_party_id: Number(vendor), date, vehicle_no: vehicle.trim() || null, note: note.trim() || null,
    lines: filled.map((l) => ({ material_id: Number(l.id), qty: Number(l.qty), unit: (byId.get(String(l.id)) || {}).unit })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [JSON.stringify([vendor, lines, date, vehicle, note, whId])]);

  // Value — rukne ke 450ms baad server se (kuch save nahi hota).
  useEffect(() => {
    if (!body) { setPrev(null); setPrevErr(""); return undefined; }
    let alive = true;
    const tm = setTimeout(() => {
      api.post("/job-works/preview", body).then((r) => {
        if (!alive) return;
        if (r && r.success) { setPrev(r.data); setPrevErr(""); } else { setPrev(null); setPrevErr((r && r.message) || ""); }
      }).catch(() => {});
    }, 450);
    return () => { alive = false; clearTimeout(tm); };
  }, [body]);

  const save = async () => {
    setErr("");
    if (!vendor) { setErr(t("jobwork.need_vendor")); return; }
    if (!body) { setErr(t("jobwork.need_lines")); return; }
    if (uploading(CHALLAN_FOLDER)) { setErr(t("jobwork.photo_uploading")); return; }
    setBusy(true);
    const r = await api.post("/job-works", { ...body, photo_urls: photos }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    window.alert(r.message || "");
    onSaved && onSaved(r.data);
  };
  const pv = (i) => {
    const l = filled[i] ? filled[i] : null;
    return l && prev ? (prev.lines || []).find((x) => String(x.material_id) === String(l.id)) : null;
  };

  return (
    <Drawer title={t("jobwork.send_title", { name: whName || "" })} sub={t("jobwork.send_sub")} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} style={{ ...btn(T.ind), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("jobwork.send_save")}</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <span style={lbl}>{t("jobwork.vendor")}</span>
          <PickSelect value={vendor} onChange={(e) => setVendor(e.target.value)} style={inp}>
            <option value="">{t("jobwork.vendor_pick")}</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </PickSelect>
        </div>
        <div>
          <span style={lbl}>{t("common.date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 6 }}>{t("jobwork.lines")}</div>
      {lines.map((l, i) => {
        const m = byId.get(String(l.id));
        const fi = filled.indexOf(l);
        const p = fi >= 0 ? pv(fi) : null;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 150px 28px", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <PickSelect value={l.id} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, id: e.target.value } : y)))} style={inp}>
              <option value="">{t("conversion.pick_material")}</option>
              {avail.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmtQ(s.qty)} {s.unit}</option>)}
            </PickSelect>
            <input type="number" min="0" value={l.qty} placeholder={t("conversion.qty")} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)))} style={inp} />
            <span style={{ fontSize: 12, color: T.t3 }}>{m ? m.unit : ""}</span>
            <span style={{ fontSize: 11, color: p && p.rate_source === "none" ? T.amb : T.t3 }}>
              {p ? <>{p.rate_source === "none" ? t("conversion.rate_later") : `${inr(p.amount)} · ${t("conversion.rate_per", { rate: fmtQ(p.rate), unit: p.unit })}`}
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: p.rate_source === "bill" ? T.grn : p.rate_source === "grn" ? T.t3 : T.amb }}>{srcLabel(p.rate_source)}</span></>
                : (m ? t("conversion.in_stock", { qty: fmtQ(m.qty), unit: m.unit }) : "")}
            </span>
            <button onClick={() => setLines((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankLine()]))} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        );
      })}
      <button onClick={() => setLines((x) => [...x, blankLine()])} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5, marginBottom: 14 }}>{t("conversion.add_line")}</button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <div>
          <span style={lbl}>{t("jobwork.vehicle")}</span>
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} style={inp} />
        </div>
        <div>
          <span style={lbl}>{t("conversion.note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <PhotoPick pol={policyFor(pol, "job_work")} folder={CHALLAN_FOLDER} photos={photos} setPhotos={setPhotos} label={t("jobwork.challan_photo")} />
      </div>

      <div style={{ marginTop: 16, padding: "11px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9 }}>
        <div style={secT}>{t("jobwork.value_title")}</div>
        {prev ? <div style={{ fontSize: 16, fontWeight: 800, color: T.ind }}>{inr(prev.value)}</div>
          : <div style={{ fontSize: 12, color: prevErr ? T.red : T.t4 }}>{prevErr || t("jobwork.preview_wait")}</div>}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("jobwork.value_basis")}</div>
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Wapas aaya — receipt form
// ════════════════════════════════════════════════════════════════
const blankOut = () => ({ name: "", qty: "", unit: "", raw: "", rawTouched: false });
const blankRow = () => ({ outs: [blankOut()], raw: "", scrap: "", mode: "kept" });

function ReceiptForm({ jw, stock, library, recipes, onClose, onSaved }) {
  const sent = useMemo(() => (jw.lines || []).filter((l) => num(l.balance && l.balance.pending) > 0), [jw]);
  const stockByName = useMemo(() => new Map((stock || []).map((m) => [key(m.name), m])), [stock]);
  const libByName = useMemo(() => new Map((library || []).map((m) => [key(m.name), m])), [library]);
  const names = useMemo(() => [...new Set([...(stock || []).map((m) => m.name), ...(library || []).map((m) => m.name)].filter(Boolean))].sort(), [stock, library]);
  const [rows, setRows] = useState(() => Object.fromEntries(sent.map((l) => [l.id, blankRow()])));
  const [mk, setMk] = useState(blankMk());
  const [photos, setPhotos] = useState([]);
  const [pol, setPol] = useState(null);
  const [date, setDate] = useState(istToday());
  const [note, setNote] = useState("");
  const [prev, setPrev] = useState(null);
  const [prevErr, setPrevErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { loadPhotoPolicy().then(setPol).catch(() => {}); }, []);

  const outUnit = (o) => {
    const s = stockByName.get(key(o.name));
    if (s) return { unit: s.unit, locked: true, existing: true, id: s.id };
    const l = libByName.get(key(o.name));
    return { unit: o.unit || (l && l.unit) || "Nos", locked: false, existing: false, id: null };
  };
  // Nuskha se raw: output ka naam + bheja material mile, unit bhi mile.
  const suggRaw = (line, o) => {
    const r = (recipes || []).find((x) => key(x.out_material_name) === key(o.name) && key(x.in_material_name) === key(line.material_name));
    if (!r || !(num(r.out_qty) > 0) || !(num(o.qty) > 0)) return null;
    if (key(r.out_unit) !== key(outUnit(o).unit) || key(r.in_unit) !== key(line.unit)) return null;
    return Math.round((num(o.qty) / num(r.out_qty)) * num(r.in_qty) * 1000) / 1000;
  };
  const effRaw = (line, o) => (o.rawTouched ? o.raw : (suggRaw(line, o) != null ? String(suggRaw(line, o)) : o.raw));
  const setRow = (id, f) => setRows((x) => ({ ...x, [id]: f(x[id] || blankRow()) }));
  const setOut = (id, i, patch) => setRow(id, (r) => ({ ...r, outs: r.outs.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  const body = useMemo(() => {
    const out = [];
    for (const l of sent) {
      const r = rows[l.id] || blankRow();
      for (const o of r.outs) {
        if (!o.name.trim() || !(num(o.qty) > 0)) continue;
        const u = outUnit(o);
        const raw = effRaw(l, o);
        out.push({ kind: "out", jw_line_id: l.id, name: o.name.trim(), material_id: u.id, qty: Number(o.qty), unit: u.unit, raw_qty: raw === "" ? null : Number(raw) });
      }
      if (num(r.raw) > 0) out.push({ kind: "raw", jw_line_id: l.id, qty: Number(r.raw), unit: l.unit });
      if (num(r.scrap) > 0) out.push({ kind: "scrap", jw_line_id: l.id, qty: Number(r.scrap), unit: l.unit, scrap_mode: r.mode });
    }
    if (!out.length) return null;
    return { date, note: note.trim() || null, lines: out, making: makingBody(mk) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([rows, mk, date, note])]);

  useEffect(() => {
    if (!body) { setPrev(null); setPrevErr(""); return undefined; }
    let alive = true;
    const tm = setTimeout(() => {
      api.post(`/job-works/${jw.id}/receipts/preview`, body).then((r) => {
        if (!alive) return;
        if (r && r.success) { setPrev(r.data); setPrevErr(""); } else { setPrev(null); setPrevErr((r && r.message) || ""); }
      }).catch(() => {});
    }, 450);
    return () => { alive = false; clearTimeout(tm); };
  }, [body, jw.id]);

  const save = async () => {
    setErr("");
    if (!body) { setErr(t("jobwork.need_recv_lines")); return; }
    if (body.making && uploading(BILL_FOLDER)) { setErr(t("jobwork.photo_uploading")); return; }
    setBusy(true);
    const r = await api.post(`/job-works/${jw.id}/receipts`, body.making ? { ...body, photo_urls: photos } : body).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    const warn = (r.warnings || []).length ? "\n⚠ " + r.warnings.join("\n⚠ ") : "";
    window.alert((r.message || "") + warn);
    onSaved && onSaved(r.data);
  };
  const pOut = (lineId, name) => (prev ? (prev.outputs || []).find((o) => String(o.jw_line_id) === String(lineId) && key(o.name) === key(name)) : null);
  const after = (lineId) => (prev ? (prev.balance_after || []).find((b) => String(b.jw_line_id) === String(lineId)) : null);

  return (
    <Drawer width={820} title={t("jobwork.recv_title", { no: jw.jw_no })} sub={t("jobwork.recv_sub")} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} style={{ ...btn(T.grn), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("jobwork.recv_save")}</button>
      </>}>
      <datalist id="jw-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id="jw-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      {sent.map((l) => {
        const r = rows[l.id] || blankRow();
        const a = after(l.id);
        return (
          <div key={l.id} style={{ border: `1px solid ${T.b1}`, borderRadius: 9, padding: "11px 14px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("jobwork.recv_against", { name: l.material_name, pending: fmtQ(l.balance.pending), unit: l.unit || "" })}</div>
              {a && <div style={{ fontSize: 11, color: a.pending < 0 ? T.red : T.t3 }}>{t("jobwork.after", { qty: fmtQ(a.pending), unit: a.unit || "" })}</div>}
            </div>
            <div style={secT}>{t("jobwork.out_title")}</div>
            {r.outs.map((o, i) => {
              const u = outUnit(o);
              const sg = suggRaw(l, o);
              const p = pOut(l.id, o.name);
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 120px 28px", gap: 8, alignItems: "center" }}>
                    <input list="jw-names" value={o.name} placeholder={t("conversion.output_name_ph")} onChange={(e) => setOut(l.id, i, { name: e.target.value })} style={inp} />
                    <input type="number" min="0" value={o.qty} placeholder={t("conversion.qty")} onChange={(e) => setOut(l.id, i, { qty: e.target.value })} style={inp} />
                    {u.locked
                      ? <span style={{ fontSize: 12, color: T.t3 }}>{u.unit}</span>
                      : <input list="jw-units" value={o.unit || u.unit} onChange={(e) => setOut(l.id, i, { unit: e.target.value })} style={inp} />}
                    <input type="number" min="0" value={effRaw(l, o)} placeholder={t("jobwork.raw_used", { unit: l.unit || "" })} title={t("jobwork.raw_used", { unit: l.unit || "" })}
                      onChange={(e) => setOut(l.id, i, { raw: e.target.value, rawTouched: true })} style={inp} />
                    <button onClick={() => setRow(l.id, (x) => ({ ...x, outs: x.outs.length > 1 ? x.outs.filter((_, j) => j !== i) : [blankOut()] }))} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>{t("jobwork.raw_used", { unit: l.unit || "" })}</span>
                    {sg != null && <span style={{ color: T.ind }}>{t("jobwork.raw_from_recipe", { qty: fmtQ(sg), unit: l.unit || "" })}
                      {o.rawTouched && <button onClick={() => setOut(l.id, i, { raw: String(sg), rawTouched: false })} style={{ ...btn(T.indL, T.ind), padding: "1px 8px", fontSize: 10.5, marginLeft: 6 }}>{t("conversion.recipe_apply")}</button>}</span>}
                    {o.name.trim() && !u.existing && <span style={{ color: T.ind, fontWeight: 600 }}>{t("conversion.new_item")}</span>}
                    {p && <span style={{ color: T.t1, fontWeight: 700 }}>{t("jobwork.out_cost", { amount: inr(p.amount), rate: fmtQ(p.rate), unit: p.unit, raw: inr(p.raw_cost), extra: inr(p.extra) })}</span>}
                  </div>
                  {p && p.nuskha && (
                    <div style={{ marginTop: 4, fontSize: 11.5, color: p.nuskha.over ? T.amb : T.grn }}>
                      {p.nuskha.over
                        ? "⚠ " + t("conversion.nuskha_over", { pct: fmtQ(p.nuskha.actual_pct), allowed: fmtQ(p.nuskha.allowed_pct), expected: fmtQ(p.nuskha.expected_in), unit: p.nuskha.unit })
                        : t("conversion.nuskha_ok", { pct: fmtQ(p.nuskha.actual_pct), allowed: fmtQ(p.nuskha.allowed_pct), expected: fmtQ(p.nuskha.expected_in), unit: p.nuskha.unit })}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => setRow(l.id, (x) => ({ ...x, outs: [...x.outs, blankOut()] }))} style={{ ...btn(T.surface, T.ind, T.b1), padding: "3px 10px", fontSize: 11 }}>{t("jobwork.add_out")}</button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div>
                <span style={lbl}>{t("jobwork.raw_back", { unit: l.unit || "" })}</span>
                <input type="number" min="0" value={r.raw} onChange={(e) => setRow(l.id, (x) => ({ ...x, raw: e.target.value }))} style={inp} />
              </div>
              <div>
                <span style={lbl}>{t("jobwork.scrap", { unit: l.unit || "" })}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" min="0" value={r.scrap} onChange={(e) => setRow(l.id, (x) => ({ ...x, scrap: e.target.value }))} style={{ ...inp, width: 100 }} />
                  {[["kept", t("jobwork.scrap_kept")], ["back", t("jobwork.scrap_back")]].map(([k, lb]) => (
                    <button key={k} type="button" onClick={() => setRow(l.id, (x) => ({ ...x, mode: k }))}
                      style={{ ...btn(r.mode === k ? T.indL : T.surface, r.mode === k ? T.ind : T.t3, r.mode === k ? T.ind : T.b1), padding: "5px 9px", fontSize: 11 }}>{lb}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
        <div>
          <span style={lbl}>{t("common.date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </div>
        <div>
          <span style={lbl}>{t("conversion.note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={{ padding: "11px 14px", border: `1px solid ${T.b1}`, borderRadius: 9 }}>
        <div style={secT}>{t("jobwork.making_title")}</div>
        <MakingFields mk={mk} setMk={setMk} vendor={jw.vendor_name}
          amount={prev && prev.making ? prev.making.amount : null}
          basisQty={prev && prev.making ? prev.making.basis_qty : null} basisUnit={prev && prev.making ? prev.making.basis_unit : ""} />
        {makingBody(mk) && <div style={{ marginTop: 10 }}>
          <PhotoPick pol={policyFor(pol, "job_work_bill")} folder={BILL_FOLDER} photos={photos} setPhotos={setPhotos} label={t("conversion.bill_photo")} />
        </div>}
      </div>

      <div style={{ marginTop: 14, padding: "11px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9 }}>
        <div style={secT}>{t("conversion.cost_title")}</div>
        {prev ? (
          <div style={{ fontSize: 12, color: T.t2, display: "grid", gap: 4 }}>
            {(prev.raw_back || []).map((x, i) => <div key={i}>{t("jobwork.raw_back_cost", { name: x.name, qty: fmtQ(x.qty), unit: x.unit, amount: inr(x.amount) })}</div>)}
            {num(prev.scrap_cost) > 0 && <div>{t("jobwork.scrap_cost", { amount: inr(prev.scrap_cost) })}</div>}
            {(prev.warnings || []).map((w, i) => <div key={"w" + i} style={{ color: T.amb }}>⚠ {w}</div>)}
          </div>
        ) : <div style={{ fontSize: 12, color: prevErr ? T.red : T.t4 }}>{prevErr || t("jobwork.recv_wait")}</div>}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("jobwork.recv_basis")}</div>
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Banwai baad me
// ════════════════════════════════════════════════════════════════
function ChargeForm({ jw, onClose, onSaved }) {
  const [mk, setMk] = useState(blankMk());
  const [photos, setPhotos] = useState([]);
  const [pol, setPol] = useState(null);
  const [date, setDate] = useState(istToday());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { loadPhotoPolicy().then(setPol).catch(() => {}); }, []);
  const save = async () => {
    setErr("");
    const m = makingBody(mk);
    if (!m) { setErr(t("jobwork.need_rate")); return; }
    if (uploading(BILL_FOLDER)) { setErr(t("jobwork.photo_uploading")); return; }
    setBusy(true);
    const r = await api.post(`/job-works/${jw.id}/charge`, { making: m, date, note: note.trim() || null, photo_urls: photos }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    window.alert(r.message || "");
    onSaved && onSaved();
  };
  return (
    <Drawer width={600} title={t("jobwork.charge_title", { no: jw.jw_no })} sub={t("jobwork.charge_sub")} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} style={{ ...btn(T.ind), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("common.save")}</button>
      </>}>
      <MakingFields mk={mk} setMk={setMk} vendor={jw.vendor_name}
        amount={mk.basis === "lumpsum" && num(mk.rate) > 0 ? num(mk.rate) : null} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginTop: 12 }}>
        <div>
          <span style={lbl}>{t("common.date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </div>
        <div>
          <span style={lbl}>{t("conversion.note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <PhotoPick pol={policyFor(pol, "job_work_bill")} folder={BILL_FOLDER} photos={photos} setPhotos={setPhotos} label={t("conversion.bill_photo")} />
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Delivery Challan (Job Work) — print (sirf web)
// ════════════════════════════════════════════════════════════════
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
async function printChallan(id) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { window.alert(t("jobwork.print_blocked")); return; }
  const r = await api.get(`/job-works/${id}/challan`).catch((e) => ({ success: false, message: e.message }));
  if (!r || !r.success) { w.close(); window.alert((r && r.message) || t("conversion.save_failed")); return; }
  const d = r.data;
  const co = d.company || {}, v = d.vendor || {};
  const party = (x) => [x.name ? `<b>${esc(x.name)}</b>` : "", x.address ? esc(x.address) : "", x.gstin ? "GSTIN: " + esc(x.gstin) : "", x.phone ? esc(x.phone) : ""].filter(Boolean).join("<br>");
  const money = (n) => "&#8377;" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const rows = (d.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.name)}</td><td>${esc(it.hsn || "")}</td>
    <td class="r">${esc(fmtQ(it.qty))} ${esc(it.unit || "")}</td><td class="r">${money(it.rate)}</td><td class="r">${money(it.value)}</td></tr>`).join("");
  w.document.write(`<html><head><title>${esc(d.title)} ${esc(d.jw_no)}</title>
  <style>*{font-family:Arial,sans-serif;font-size:12px}body{padding:24px;color:#111}
  h1{font-size:18px;margin:0 0 4px}.note{border:1.5px solid #111;padding:6px 10px;font-weight:700;margin:10px 0;display:inline-block}
  table{width:100%;border-collapse:collapse;margin-top:10px}td,th{padding:6px 8px;border:1px solid #9CA3AF;vertical-align:top}
  th{background:#F3F4F6;text-align:left}.r{text-align:right}.grid{display:flex;gap:16px}.grid>div{flex:1;border:1px solid #9CA3AF;padding:8px}
  .sign{display:flex;justify-content:space-between;margin-top:60px}.sign div{border-top:1px solid #111;padding-top:4px;width:40%;text-align:center}
  </style></head><body>
  <h1>${esc(d.title)}</h1>
  <div class="note">${esc(d.note)}</div>
  <table><tr><th>${esc(t("jobwork.challan_no"))}</th><td>${esc(d.jw_no)}</td><th>${esc(t("common.date"))}</th><td>${esc(fmtDate(d.date))}</td></tr>
  <tr><th>${esc(t("jobwork.challan_vehicle"))}</th><td>${esc(d.vehicle_no || "—")}</td><th>${esc(t("jobwork.challan_store"))}</th><td>${esc(d.store || "—")}</td></tr></table>
  <div class="grid" style="margin-top:10px"><div><div style="color:#6B7280;font-size:10px;text-transform:uppercase">${esc(t("jobwork.challan_from"))}</div>${party(co)}</div>
  <div><div style="color:#6B7280;font-size:10px;text-transform:uppercase">${esc(t("jobwork.challan_vendor"))}</div>${party(v)}</div></div>
  <table><tr><th>#</th><th>${esc(t("jobwork.col_item"))}</th><th>${esc(t("jobwork.itc_hsn"))}</th><th class="r">${esc(t("conversion.qty"))}</th><th class="r">${esc(t("jobwork.col_rate"))}</th><th class="r">${esc(t("jobwork.col_value"))}</th></tr>
  ${rows}<tr><th colspan="5" class="r">${esc(t("jobwork.total"))}</th><th class="r">${money(d.total)}</th></tr></table>
  <div class="sign"><div>${esc(t("jobwork.sign_sender"))}</div><div>${esc(t("jobwork.sign_recv"))}</div></div>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  w.document.close();
}

// ════════════════════════════════════════════════════════════════
// JW ka detail
// ════════════════════════════════════════════════════════════════
function JwDetail({ id, stock, library, recipes, canEntry, isAdmin, onClose, onChanged }) {
  const [jw, setJw] = useState(null);
  const [err, setErr] = useState("");
  const [recv, setRecv] = useState(false);
  const [charge, setCharge] = useState(false);
  const [cancel, setCancel] = useState(null);   // "jw" | receipt id
  const load = useCallback(() => {
    api.get(`/job-works/${id}`).then((r) => { if (r && r.success) { setJw(r.data); setErr(""); } else setErr((r && r.message) || ""); }).catch(() => {});
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const changed = () => { load(); onChanged && onChanged(); };
  if (!jw) {
    return <Drawer width={720} title={t("jobwork.tab")} onClose={onClose}><div style={{ fontSize: 12.5, color: err ? T.red : T.t4 }}>{err || t("common.loading")}</div></Drawer>;
  }
  const live = (jw.receipts || []).filter((r) => r.status !== "Cancelled");
  const open = jw.status === "Open" || jw.status === "PartReceived";
  const kindL = (l) => (l.kind === "out" ? t("jobwork.k_out") : l.kind === "raw" ? t("jobwork.k_raw")
    : l.scrap_mode === "back" ? t("jobwork.k_scrap_back") : t("jobwork.k_scrap_kept"));
  const kindC = (l) => (l.kind === "out" ? T.grn : l.kind === "raw" ? T.ind : T.amb);
  return (
    <Drawer width={760} title={jw.jw_no} sub={t("jobwork.detail_sub", { date: fmtDate(jw.date), vendor: jw.vendor_name || "—" })} onClose={onClose}
      footer={<>
        <button onClick={() => printChallan(jw.id)} style={btn(T.surface, T.t2, T.b2)}>{t("jobwork.btn_challan")}</button>
        {canEntry && jw.status !== "Cancelled" && <button onClick={() => setCharge(true)} style={btn(T.surface, T.ind, T.b1)}>{t("jobwork.btn_charge")}</button>}
        {canEntry && open && <button onClick={() => setRecv(true)} style={btn(T.grn)}>{t("jobwork.btn_receive")}</button>}
        {isAdmin && jw.status !== "Cancelled" && live.length === 0 && cancel == null && <button onClick={() => setCancel("jw")} style={btn(T.red)}>{t("conversion.cancel_btn")}</button>}
      </>}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <Chip s={statusChip(jw.status)} />
        {open && <span style={{ fontSize: 12, fontWeight: 700, color: ageColor(jw.age_flag) }}>{t("jobwork.days_n", { n: jw.days })}</span>}
        {jw.vehicle_no && <span style={{ fontSize: 12, color: T.t3 }}>{t("jobwork.vehicle_show", { no: jw.vehicle_no })}</span>}
        <span style={{ fontSize: 12, color: T.t3 }}>{t("jobwork.value_show", { amount: inr(jw.sent_value) })}</span>
      </div>
      {jw.age_msg && (
        <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 10,
          background: jw.age_flag === "red" ? T.redL : T.ambL, color: jw.age_flag === "red" ? T.red : T.amb, border: `1px solid ${jw.age_flag === "red" ? T.red + "44" : T.ambM}` }}>⚠ {jw.age_msg}</div>
      )}
      <div style={secT}>{t("jobwork.detail_lines")}</div>
      {(jw.lines || []).map((l) => (
        <div key={l.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
            <b style={{ flex: 1 }}>{l.material_name}</b>
            <span>{fmtQ(l.qty)} {l.unit}</span>
            <span style={{ color: T.t3, width: 160, textAlign: "right" }}>{inr(l.amount)} · {srcLabel(l.rate_source)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
            {t("jobwork.bal_line", { used: fmtQ(l.balance.used), raw: fmtQ(l.balance.raw_back), scrap: fmtQ(l.balance.scrap_kept + l.balance.scrap_back), pending: fmtQ(l.balance.pending), unit: l.unit || "" })}
          </div>
        </div>
      ))}
      {jw.note && <div style={{ marginTop: 8, fontSize: 12, color: T.t2, fontStyle: "italic" }}>"{jw.note}"</div>}
      {jw.status === "Cancelled" && <div style={{ marginTop: 8, fontSize: 12, color: T.t3 }}>{t("jobwork.cancelled_reason", { reason: jw.cancel_reason || "" })}</div>}

      <div style={{ ...secT, marginTop: 16 }}>{t("jobwork.receipts")}</div>
      {(jw.receipts || []).length === 0 && <div style={{ fontSize: 12, color: T.t4 }}>{t("jobwork.receipts_empty")}</div>}
      {(jw.receipts || []).map((r) => (
        <div key={r.id} style={{ border: `1px solid ${T.b1}`, borderRadius: 8, padding: "9px 12px", marginBottom: 8, opacity: r.status === "Cancelled" ? 0.6 : 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
            <b style={{ fontFamily: "monospace" }}>{r.receipt_no}</b>
            <span style={{ color: T.t3 }}>{fmtDate(r.date)}</span>
            {r.status === "Cancelled" && <Chip s={statusChip("Cancelled")} />}
            {(r.lines || []).length === 0 && <span style={{ fontSize: 11, color: T.ind }}>{t("jobwork.charge_only")}</span>}
            <span style={{ flex: 1 }} />
            {isAdmin && r.status !== "Cancelled" && cancel == null && <button onClick={() => setCancel(r.id)} style={{ ...btn(T.surface, T.red, T.b1), padding: "3px 10px", fontSize: 11 }}>{t("jobwork.cancel_r_btn")}</button>}
          </div>
          {(r.lines || []).map((l) => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 110px 120px", gap: 8, fontSize: 12, padding: "3px 0" }}>
              <span style={{ color: kindC(l), fontWeight: 700 }}>{kindL(l)}</span>
              <span>{l.material_name}{Number(l.is_new) ? <span style={{ marginLeft: 6, fontSize: 10, color: T.ind, fontWeight: 700 }}>{t("conversion.new_badge")}</span> : null}
                {l.kind === "out" && <span style={{ color: T.t4 }}> · {t("jobwork.raw_used_show", { qty: fmtQ(l.raw_qty) })}</span>}</span>
              <span style={{ textAlign: "right" }}>{fmtQ(l.qty)} {l.unit}</span>
              <span style={{ textAlign: "right", color: T.t3 }}>{l.kind === "scrap" ? "—" : t("conversion.rate_per", { rate: fmtQ(l.rate), unit: l.unit })}</span>
            </div>
          ))}
          {num(r.making_amount) > 0 && (
            <div style={{ fontSize: 11.5, color: T.t2, marginTop: 4 }}>
              {t("jobwork.r_making", { amount: inr(r.making_amount), bill: r.bill_no || "—", pay: r.payment_mode === "credit" ? t("conversion.pay_credit") : t("conversion.pay_cash") })}
              {r.payment_mode === "credit" && r.settlement_status === "paid" ? " · " + t("conversion.detail_paid") : ""}
            </div>
          )}
          {r.status === "Cancelled" && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4 }}>{t("jobwork.cancelled_reason", { reason: r.cancel_reason || "" })}</div>}
          {cancel === r.id && <CancelBox title={t("conversion.cancel_title", { no: r.receipt_no })} hint={t("jobwork.cancel_r_hint")}
            url={`/job-works/receipts/${r.id}/cancel`} onClose={() => setCancel(null)} onDone={() => { setCancel(null); changed(); }} />}
        </div>
      ))}
      {cancel === "jw" && <CancelBox title={t("conversion.cancel_title", { no: jw.jw_no })} hint={t("jobwork.cancel_jw_hint")}
        url={`/job-works/${jw.id}/cancel`} onClose={() => setCancel(null)} onDone={() => { setCancel(null); changed(); }} />}

      {recv && <ReceiptForm jw={jw} stock={stock} library={library} recipes={recipes} onClose={() => setRecv(false)} onSaved={() => { setRecv(false); changed(); }} />}
      {charge && <ChargeForm jw={jw} onClose={() => setCharge(false)} onSaved={() => { setCharge(false); changed(); }} />}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Vendor ke paas
// ════════════════════════════════════════════════════════════════
function VendorPanel({ whId, seq, onOpen }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/job-works/vendor-balance?warehouse_id=${encodeURIComponent(whId)}`).then((r) => setData(r && r.success ? r.data || [] : [])).catch(() => setData([]));
  }, [whId, seq]);
  if (data === null) return <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>;
  if (!data.length) return <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("jobwork.vendors_empty")}</div>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((v) => (
        <div key={v.vendor_party_id} style={{ background: T.surface, border: `1.5px solid ${v.age_flag === "red" ? T.red + "66" : v.age_flag === "yellow" ? T.ambM : T.b1}`, borderRadius: 10, padding: "11px 14px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.t1 }}>{v.vendor_name}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ind }}>{t("jobwork.v_value", { amount: inr(v.value_pending) })}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ageColor(v.age_flag) }}>{t("jobwork.v_days", { n: v.max_days })}</div>
          </div>
          {v.age_msg && <div style={{ fontSize: 11.5, fontWeight: 600, color: ageColor(v.age_flag), marginTop: 4 }}>⚠ {v.age_msg}</div>}
          {(v.job_works || []).map((j) => (
            <div key={j.id} onClick={() => onOpen(j.id)} style={{ display: "grid", gridTemplateColumns: "90px 80px 1fr 90px", gap: 8, fontSize: 12, padding: "6px 0", borderTop: `1px solid ${T.b1}`, marginTop: 6, cursor: "pointer" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{j.jw_no}</span>
              <span style={{ color: T.t3 }}>{fmtDate(j.date)}</span>
              <span>{(j.lines || []).filter((l) => l.pending > 0).map((l) => `${l.material_name} ${fmtQ(l.pending)} ${l.unit || ""}`).join(", ")}</span>
              <span style={{ textAlign: "right", fontWeight: 700, color: ageColor(j.age_flag) }}>{t("jobwork.days_n", { n: j.days })}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ITC-04 (sirf web)
// ════════════════════════════════════════════════════════════════
const ITC_TYPES = { sent: "jobwork.itc_t_sent", output: "jobwork.itc_t_output", raw_back: "jobwork.itc_t_raw_back", scrap_back: "jobwork.itc_t_scrap_back", scrap_kept: "jobwork.itc_t_scrap_kept" };
function Itc04Panel({ whId }) {
  const [from, setFrom] = useState(istToday().slice(0, 8) + "01");
  const [to, setTo] = useState(istToday());
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    setRows(null);
    api.get(`/job-works/itc04?warehouse_id=${encodeURIComponent(whId)}&from=${from}&to=${to}`)
      .then((r) => { if (r && r.success) { setRows(r.data.rows || []); setErr(""); } else { setRows([]); setErr((r && r.message) || ""); } })
      .catch(() => setRows([]));
  }, [whId, from, to]);
  useEffect(() => { load(); }, [load]);
  const COLS = [
    { l: t("jobwork.itc_type"), v: (x) => t(ITC_TYPES[x.type] || x.type) },
    { l: t("jobwork.itc_jw"), v: (x) => x.jw_no },
    { l: t("jobwork.itc_receipt"), v: (x) => x.receipt_no || "" },
    { l: t("common.date"), v: (x) => day10(x.date) },
    { l: t("jobwork.itc_vendor"), v: (x) => x.vendor || "" },
    { l: t("jobwork.itc_gstin"), v: (x) => x.gstin || "" },
    { l: t("jobwork.col_item"), v: (x) => x.item || "" },
    { l: t("jobwork.itc_hsn"), v: (x) => x.hsn || "" },
    { l: t("conversion.qty"), v: (x) => x.qty },
    { l: t("jobwork.itc_unit"), v: (x) => x.unit || "" },
    { l: t("jobwork.col_value"), v: (x) => x.value },
  ];
  const csv = () => {
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const text = [COLS.map((c) => q(c.l)).join(","), ...(rows || []).map((x) => COLS.map((c) => q(c.v(x))).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `ITC-04-${from}-to-${to}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const GRID = "100px 80px 80px 80px 1fr 130px 1fr 70px 80px 50px 90px";
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div><span style={lbl}>{t("jobwork.itc_from")}</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inp, width: 150 }} /></div>
        <div><span style={lbl}>{t("jobwork.itc_to")}</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inp, width: 150 }} /></div>
        <span style={{ flex: 1 }} />
        <button onClick={csv} disabled={!rows || !rows.length} style={{ ...btn(T.surface, T.ind, T.b1), opacity: rows && rows.length ? 1 : 0.5 }}>{t("jobwork.itc_csv")}</button>
      </div>
      <div style={{ fontSize: 11, color: T.t4, marginBottom: 8 }}>{t("jobwork.itc_hint")}</div>
      <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflowX: "auto" }}>
        <div style={{ minWidth: 1100 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "8px 12px", background: T.surfaceB, fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>
            {COLS.map((c, i) => <span key={i} style={i >= 8 ? { textAlign: i === 9 ? "left" : "right" } : null}>{c.l}</span>)}
          </div>
          {rows === null && <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>}
          {rows && !rows.length && <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: err ? T.red : T.t4 }}>{err || t("jobwork.itc_empty")}</div>}
          {(rows || []).map((x, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: GRID, gap: 6, padding: "7px 12px", borderTop: `1px solid ${T.b1}`, fontSize: 11.5,
              color: x.type === "sent" ? T.t1 : T.t2 }}>
              <span style={{ fontWeight: 700, color: x.type === "sent" ? T.ind : x.type === "output" ? T.grn : T.amb }}>{t(ITC_TYPES[x.type] || x.type)}</span>
              <span style={{ fontFamily: "monospace" }}>{x.jw_no}</span>
              <span style={{ fontFamily: "monospace" }}>{x.receipt_no || ""}</span>
              <span>{fmtDate(x.date)}</span>
              <span>{x.vendor}</span>
              <span style={{ color: x.gstin ? T.t2 : T.amb }}>{x.gstin || "—"}</span>
              <span>{x.item}</span>
              <span style={{ color: x.hsn ? T.t2 : T.amb }}>{x.hsn || "—"}</span>
              <span style={{ textAlign: "right" }}>{fmtQ(x.qty)}</span>
              <span>{x.unit}</span>
              <span style={{ textAlign: "right", fontWeight: 600 }}>{inr(x.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab — "🚚 Job Work"
// ════════════════════════════════════════════════════════════════
export function JobWorkTab({ whId, whName, stock, library, canEntry, isAdmin, onStockChanged }) {
  const [view, setView] = useState("list");
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [seq, setSeq] = useState(0);
  const load = useCallback(() => {
    if (!whId) return;
    api.get(`/job-works?warehouse_id=${encodeURIComponent(whId)}`).then((r) => setList(r && r.success ? r.data || [] : [])).catch(() => setList([]));
    api.get("/conversions/recipes").then((r) => setRecipes(r && r.success ? r.data || [] : [])).catch(() => {});
  }, [whId]);
  useEffect(() => { load(); }, [load]);
  const changed = () => { load(); setSeq((n) => n + 1); onStockChanged && onStockChanged(); };
  const shown = (list || []).filter((j) => !filter || j.status === filter);
  const VIEWS = [["list", t("jobwork.view_list")], ["vendors", t("jobwork.view_vendors")], ["itc04", t("jobwork.view_itc04")]];
  const GRID = "90px 80px 1fr 1.3fr 1.3fr 70px 110px";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, fontSize: 12, color: T.t3 }}>{t("jobwork.subtitle")}</div>
        {canEntry && <button onClick={() => setSendOpen(true)} style={btn(T.ind)}>{t("jobwork.btn_send")}</button>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {VIEWS.map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ ...btn(view === k ? T.indL : T.surface, view === k ? T.ind : T.t3, view === k ? T.ind : T.b1), padding: "6px 12px", fontSize: 12 }}>{l}</button>
        ))}
        {view === "list" && <>
          <span style={{ flex: 1 }} />
          <PickSelect value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inp, width: 180 }}>
            <option value="">{t("jobwork.f_all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusChip(s).l}</option>)}
          </PickSelect>
        </>}
      </div>

      {view === "list" && (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "9px 14px", background: T.surfaceB, fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>
            <span>{t("conversion.col_no")}</span><span>{t("common.date")}</span><span>{t("jobwork.itc_vendor")}</span>
            <span>{t("jobwork.col_sent")}</span><span>{t("jobwork.col_pending")}</span><span>{t("jobwork.col_days")}</span><span />
          </div>
          {list === null && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>}
          {list && shown.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("jobwork.list_empty")}</div>}
          {shown.map((j) => {
            const open = j.status === "Open" || j.status === "PartReceived";
            return (
              <div key={j.id} onClick={() => setDetail(j.id)} title={ageMsg(j.age_flag, j.days)}
                style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "10px 14px", borderTop: `1px solid ${T.b1}`, fontSize: 12.5, cursor: "pointer", opacity: j.status === "Cancelled" ? 0.55 : 1 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{j.jw_no}</span>
                <span>{fmtDate(j.date)}</span>
                <span style={{ fontWeight: 600 }}>{j.vendor_name}</span>
                <span style={{ color: T.t2 }}>{(j.lines || []).map((l) => lineText(l, (x) => x.qty)).join(", ")}</span>
                <span style={{ color: T.t1, fontWeight: 600 }}>{open ? (j.lines || []).filter((l) => l.balance.pending > 0).map((l) => lineText(l, (x) => x.balance.pending)).join(", ") : "—"}</span>
                <span style={{ fontWeight: 700, color: open ? ageColor(j.age_flag) : T.t4 }}>{open ? j.days : "—"}</span>
                <span style={{ textAlign: "right" }}><Chip s={statusChip(j.status)} /></span>
              </div>
            );
          })}
        </div>
      )}
      {view === "vendors" && <VendorPanel whId={whId} seq={seq} onOpen={setDetail} />}
      {view === "itc04" && <Itc04Panel whId={whId} />}

      {sendOpen && <SendForm whId={whId} whName={whName} stock={stock} onClose={() => setSendOpen(false)}
        onSaved={() => { setSendOpen(false); changed(); }} />}
      {detail && <JwDetail id={detail} stock={stock} library={library} recipes={recipes} canEntry={canEntry} isAdmin={isAdmin}
        onClose={() => setDetail(null)} onChanged={changed} />}
    </div>
  );
}
