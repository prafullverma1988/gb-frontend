// ── CONVERSION — Store (20 Oct 2026, Conversion v2) ─────────────────
// Prafull: store raw (8mm TMT) banane wale ko deta hai, wo item (Ring 7×10)
// banata hai. Teen tarah ke banane wale — ek hi flow:
//   • Apni labour  — koi bill nahi, sirf "kiske haath" (naam)
//   • Subcontractor — banwai ka rate uske RA bill me; yahan koi bill nahi
//   • Bahar ka vendor — delivery challan, banwai ka bill, ITC-04 (GST Sec 143)
// Dropdown ki aakhri pasand store-wise yaad (ek project me aksar ek hi tarah).
//
//   "Conversion ke liye do" — kaun banayega, Library ke item + kitne (kitna raw
//     lagega: lagta + wastage, store ki unit me sujhaav, "Ye do"), raw lines
//     store ke stock se (FIFO, stock ghata). JW-001.
//   Detail — kya banana tha vs bana, paas me kitna, timeline (diya → aur diya →
//     bana → wapas / kabad → site par laga → band), "Ginti / Wapas", "Aur do",
//     "Band karo" (bacha = zyada wastage, sirf flag), vendor ho to banwai +
//     challan, Admin cancel.
//   "Kiske paas" — banane wale ke hisaab se khula maal; "ITC-04" — sirf vendor.
//
// Data: gb-backend routes/job-works.js (/api/job-works) + routes/conversion-items.js
// (/api/conversion-items). Purana ek-step Conversion + alag Job Work tab isi me
// mil gaye. Module apne aap me poora — kisi doosre module ka component nahi.

import { useState, useEffect, useMemo, useCallback } from "react";
import PickSelect from "../components/PickSelect";
import api from "../config/api";
import { t } from "../i18n";
import { BackClose } from "../utils/backNav";
import uploadManager from "../utils/uploadManager";
import { cld } from "../utils/cloudinary";
import { loadPhotoPolicy, policyFor, fileInputProps } from "../utils/photoPolicy";
import { UnitPickOrLock, StockConvLine, useUnitCards, factorOf, needsFactor } from "../components/UnitConv";

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
const KG = "Kg", PCS = "Pcs";   // unit ke chinh — anuvaad nahi
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
const lockSt = { ...inp, background: T.surfaceB, color: T.t3, display: "flex", alignItems: "center", gap: 4, fontSize: 12 };
const btn = (bg, c = "#fff", brd) => ({ padding: "8px 14px", borderRadius: 7, border: brd ? `1.5px solid ${brd}` : "none", background: bg, color: c, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const lbl = { fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3, display: "block" };
const secT = { fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 };
const box = { border: `1px solid ${T.b1}`, borderRadius: 9, padding: "11px 14px" };
const CHALLAN_FOLDER = "gb_buildcon/job_work";
const BILL_FOLDER = "gb_buildcon/job_work_bill";
const STATUSES = ["Open", "PartReceived", "Closed", "Cancelled"];
const statusChip = (s) => ({
  Open: { l: t("jobwork.st_open"), c: T.ind, bg: T.indL },
  PartReceived: { l: t("jobwork.st_part2"), c: T.amb, bg: T.ambL },
  Closed: { l: t("jobwork.st_closed2"), c: T.grn, bg: T.grnL },
  Cancelled: { l: t("jobwork.st_cancelled"), c: T.t4, bg: T.sltL },
}[s] || { l: s, c: T.t3, bg: T.sltL });
const Chip = ({ s }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: s.c, background: s.bg, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>{s.l}</span>
);
// Kaun banayega — dropdown me apni labour pehle (aksar wahi).
const MAKERS = ["own", "subcon", "vendor"];
const makerL = (k) => t(k === "own" ? "jobwork.mk_own" : k === "subcon" ? "jobwork.mk_subcon" : "jobwork.mk_vendor");
const makerHint = (k) => t(k === "own" ? "jobwork.mk_own_hint" : k === "subcon" ? "jobwork.mk_subcon_hint" : "jobwork.mk_vendor_hint");
const MakerChip = ({ k }) => <Chip s={{ l: makerL(k), c: k === "vendor" ? T.ind : T.t2, bg: k === "vendor" ? T.indL : T.sltL }} />;
// Aakhri pasand — store-wise (browser me; na mile to kuch nahi).
const memKey = (whId) => `conv_maker_${whId}`;
const readMem = (whId) => {
  try { const v = JSON.parse(window.localStorage.getItem(memKey(whId)) || "null"); return v && typeof v === "object" ? v : {}; } catch (_) { return {}; }
};
const writeMem = (whId, v) => { try { window.localStorage.setItem(memKey(whId), JSON.stringify(v)); } catch (_) { /* private window */ } };
// 300+ din peela, 365+ laal — sirf bahar ke vendor par (GST ka 1 saal).
const ageColor = (f) => (f === "red" ? T.red : f === "yellow" ? T.amb : T.t3);
const srcLabel = (s) => (s === "bill" ? t("conversion.src_bill") : s === "grn" ? t("conversion.src_grn") : t("conversion.src_none"));
const uploading = (folder) => uploadManager.getQueue().some((q) => q.folder === folder && (q.status === "queued" || q.status === "uploading"));
const lineText = (l, f) => `${l.material_name} ${fmtQ(f(l))} ${l.unit || ""}`.trim();
const itemLabel = (it) => (it ? it.name + (it.size_spec ? ` · ${it.size_spec}` : "") : "");
// "1 Pcs: 8mm TMT 0.3 + 0.1 wastage = 0.4 Mtr"
const recipeText = (it) => (it ? t("jobwork.recipe_one", { unit: it.out_unit || PCS, list: (it.inputs || []).map((i) => (num(i.waste_qty) > 0
  ? t("jobwork.recipe_part", { name: i.material_name, net: fmtQ(i.qty_net), waste: fmtQ(i.waste_qty), total: fmtQ(i.per_piece), unit: i.unit })
  : t("jobwork.recipe_part_nw", { name: i.material_name, total: fmtQ(i.per_piece), unit: i.unit }))).join(" · ") }) : "");
const planText = (j) => (j.plan || []).map((p) => (p.planned_qty != null
  ? t("jobwork.plan_made", { name: p.item_name, planned: fmtQ(p.planned_qty), made: fmtQ(p.made_qty), unit: p.unit || "" })
  : t("jobwork.plan_extra", { name: p.item_name, made: fmtQ(p.made_qty), unit: p.unit || "" }))).join(", ");

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

// Banwai — sirf bahar ke vendor ka (basis / rate / bill no. / Cash-Udhaar).
function MakingFields({ mk, setMk, amount, basisQty, basisUnit, vendor }) {
  const F = (k, v) => setMk((x) => ({ ...x, [k]: v }));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <span style={lbl}>{t("conversion.making_basis")}</span>
          <PickSelect value={mk.basis} onChange={(e) => F("basis", e.target.value)} style={{ ...inp, width: "100%" }}>
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
// Kya banana hai — Library ke item + kitne → kitna raw (server ganit)
// ════════════════════════════════════════════════════════════════
const blankPlan = () => ({ item_id: "", qty: "" });

function PlanBox({ whId, items, plan, setPlan, onUse, title }) {
  const byId = useMemo(() => new Map((items || []).map((i) => [String(i.id), i])), [items]);
  const sig = JSON.stringify(plan.filter((p) => p.item_id && num(p.qty) > 0).map((p) => [Number(p.item_id), Number(p.qty)]));
  const [calc, setCalc] = useState(null);
  const [cErr, setCErr] = useState("");
  // Rukne ke 400ms baad server se (kuch save nahi hota).
  useEffect(() => {
    const want = JSON.parse(sig);
    if (!want.length) { setCalc(null); setCErr(""); return undefined; }
    let alive = true;
    const tm = setTimeout(() => {
      api.post("/conversion-items/calc", { warehouse_id: Number(whId), items: want.map(([id, qty]) => ({ item_id: id, qty })) })
        .then((r) => {
          if (!alive) return;
          if (r && r.success) { setCalc(r.data); setCErr(""); } else { setCalc(null); setCErr((r && r.message) || ""); }
        }).catch(() => {});
    }, 400);
    return () => { alive = false; clearTimeout(tm); };
  }, [sig, whId]);
  const setRow = (i, patch) => setPlan((x) => x.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const raws = (calc && calc.raws) || [];
  const usable = raws.filter((r) => r.material_id && (r.suggest != null || r.need_stock != null));
  const G = "1.4fr 1fr 1.3fr 0.9fr 0.8fr";

  return (
    <div style={{ ...box, marginBottom: 14 }}>
      <div style={secT}>{title}</div>
      {!(items || []).length && <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{t("jobwork.lib_empty")}</div>}
      {(items || []).length > 0 && plan.map((p, i) => {
        const it = byId.get(String(p.item_id));
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 50px 28px", gap: 8, alignItems: "center" }}>
              <PickSelect value={p.item_id} onChange={(e) => setRow(i, { item_id: e.target.value })} style={{ ...inp, width: "100%" }}>
                <option value="">{t("jobwork.pick_item")}</option>
                {(items || []).map((x) => <option key={x.id} value={x.id}>{itemLabel(x)}</option>)}
              </PickSelect>
              <input type="number" min="0" value={p.qty} placeholder={t("jobwork.how_many")} onChange={(e) => setRow(i, { qty: e.target.value })} style={inp} />
              <span style={{ fontSize: 12, color: T.t3 }}>{it ? it.out_unit || PCS : ""}</span>
              <button onClick={() => setPlan((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankPlan()]))} aria-label="remove"
                style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            {it && <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>{recipeText(it)}</div>}
          </div>
        );
      })}
      {(items || []).length > 0 && <button onClick={() => setPlan((x) => [...x, blankPlan()])} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5 }}>{t("jobwork.add_item")}</button>}

      {(raws.length > 0 || cErr) && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${T.b1}`, paddingTop: 10 }}>
          <div style={{ ...secT, marginBottom: 6 }}>{t("jobwork.calc_title")}</div>
          {cErr && <div style={{ fontSize: 12, color: T.red }}>{cErr}</div>}
          {raws.length > 0 && <>
            <div style={{ display: "grid", gridTemplateColumns: G, gap: 8, fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", paddingBottom: 4 }}>
              <span>{t("jobwork.calc_raw")}</span><span>{t("jobwork.calc_need")}</span><span>{t("jobwork.calc_stock_unit")}</span>
              <span style={{ textAlign: "right" }}>{t("jobwork.calc_in_store")}</span><span style={{ textAlign: "right" }}>{t("jobwork.calc_give")}</span>
            </div>
            {raws.map((r, i) => {
              const kgShow = r.kg != null && key(r.stock_unit || r.unit) !== "kg";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: G, gap: 8, fontSize: 12, padding: "6px 0", borderTop: `1px solid ${T.b1}`, alignItems: "baseline" }}>
                  <b style={{ color: T.t1 }}>{r.material_name}</b>
                  <span>
                    {fmtQ(r.need)} {r.unit}
                    {num(r.waste) > 0 && <span style={{ display: "block", fontSize: 10.5, color: T.t4 }}>{t("jobwork.calc_net_waste", { net: fmtQ(r.net), waste: fmtQ(r.waste), unit: r.unit })}</span>}
                  </span>
                  <span>
                    {r.need_stock != null ? `${fmtQ(r.need_stock)} ${r.stock_unit}` : !r.material_id ? <span style={{ color: T.amb }}>{t("jobwork.calc_not_in_store")}</span>
                      : <span style={{ color: T.amb }}>{t("jobwork.calc_no_path", { from: r.unit, to: r.stock_unit })}</span>}
                    {kgShow && <span style={{ display: "block", fontSize: 10.5, color: T.t4 }}>≈ {fmtQ(r.kg)} {KG}</span>}
                  </span>
                  <span style={{ textAlign: "right", color: r.short ? T.red : T.t2, fontWeight: r.short ? 700 : 400 }}>
                    {r.in_store != null ? `${fmtQ(r.in_store)} ${r.stock_unit}` : "—"}
                    {r.short && <span style={{ display: "block", fontSize: 10.5 }}>{t("jobwork.calc_short")}</span>}
                  </span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: T.ind }}>
                    {r.suggest != null ? `${fmtQ(r.suggest)} ${r.stock_unit}` : r.need_stock != null ? `${fmtQ(r.need_stock)} ${r.stock_unit}` : "—"}
                  </span>
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ flex: 1, fontSize: 10.5, color: T.t4 }}>{t("jobwork.calc_basis")}</span>
              {onUse && <button onClick={() => onUse(usable)} disabled={!usable.length}
                style={{ ...btn(T.indL, T.ind, T.ind), padding: "5px 12px", fontSize: 12, opacity: usable.length ? 1 : 0.5 }}>{t("jobwork.calc_use")}</button>}
            </div>
          </>}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Kya de rahe ho — store ke stock se (unit card ho to doosri unit bhi)
// ════════════════════════════════════════════════════════════════
const blankLine = () => ({ id: "", qty: "", unit: "", factor: "" });

function LinesBox({ stock, lines, setLines, prevLines, title }) {
  const avail = useMemo(() => (stock || []).filter((m) => num(m.qty) > 0).sort((a, b) => String(a.name).localeCompare(String(b.name))), [stock]);
  const byId = useMemo(() => new Map((stock || []).map((m) => [String(m.id), m])), [stock]);
  const cards = useUnitCards(lines.map((l) => (byId.get(String(l.id)) || {}).name));
  const setRow = (i, patch) => setLines((x) => x.map((y, j) => (j === i ? { ...y, ...patch } : y)));
  return (
    <div style={{ ...box, marginBottom: 14 }}>
      <div style={secT}>{title}</div>
      {lines.map((l, i) => {
        const m = byId.get(String(l.id));
        const st = m ? { unit: m.unit, units: [m.unit], card: cards[key(m.name)] || null } : null;
        const p = m && prevLines ? prevLines.find((x) => String(x.material_id) === String(m.id)) : null;
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 92px 160px 28px", gap: 8, alignItems: "center" }}>
              <PickSelect value={l.id} onChange={(e) => setRow(i, { id: e.target.value, unit: "", factor: "" })} style={{ ...inp, width: "100%" }}>
                <option value="">{t("conversion.pick_material")}</option>
                {avail.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmtQ(s.qty)} {s.unit}</option>)}
              </PickSelect>
              <input type="number" min="0" value={l.qty} placeholder={t("conversion.qty")} onChange={(e) => setRow(i, { qty: e.target.value })} style={inp} />
              {st ? <UnitPickOrLock st={st} unit={l.unit || m.unit} onChange={(u) => setRow(i, { unit: u === m.unit ? "" : u, factor: "" })} style={{ ...inp, width: "100%" }} lockStyle={lockSt} />
                : <span />}
              <span style={{ fontSize: 11, color: p && p.rate_source === "none" ? T.amb : T.t3 }}>
                {p ? <>{p.rate_source === "none" ? t("conversion.rate_later") : `${inr(p.amount)} · ${t("conversion.rate_per", { rate: fmtQ(p.rate), unit: p.unit })}`}
                  <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: p.rate_source === "bill" ? T.grn : p.rate_source === "grn" ? T.t3 : T.amb }}>{srcLabel(p.rate_source)}</span></>
                  : (m ? t("conversion.in_stock", { qty: fmtQ(m.qty), unit: m.unit }) : "")}
              </span>
              <button onClick={() => setLines((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankLine()]))} aria-label="remove"
                style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            {st && l.unit && <StockConvLine st={st} unit={l.unit} qty={l.qty} factor={l.factor} onFactor={(f) => setRow(i, { factor: f })} compact />}
          </div>
        );
      })}
      <button onClick={() => setLines((x) => [...x, blankLine()])} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5 }}>{t("conversion.add_line")}</button>
    </div>
  );
}
// Lines → server body. Lot wali unit ka number na diya ho → null (save rokta hai).
function linesBody(lines, stock, cards) {
  const byId = new Map((stock || []).map((m) => [String(m.id), m]));
  const out = [];
  for (const l of lines) {
    const m = byId.get(String(l.id));
    if (!m || !(num(l.qty) > 0)) continue;
    const unit = l.unit || m.unit;
    const st = { unit: m.unit, units: [m.unit], card: cards[key(m.name)] || null };
    if (needsFactor(st, unit, l.qty, l.factor)) return null;
    out.push({ material_id: Number(l.id), qty: Number(l.qty), unit, stock_factor: factorOf(st, unit, l.qty, l.factor) });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
// Conversion ke liye do (naya order) / Aur do (usi order par)
// ════════════════════════════════════════════════════════════════
function SendForm({ whId, whName, stock, items, jw, onClose, onSaved }) {
  const more = !!jw;
  const mem = useMemo(() => readMem(whId), [whId]);
  const [kind, setKind] = useState(more ? jw.maker_kind : (MAKERS.includes(mem.kind) ? mem.kind : ""));
  const [party, setParty] = useState(more ? String(jw.vendor_party_id || "") : (mem.kind && mem[mem.kind] ? String(mem[mem.kind]) : ""));
  const [holder, setHolder] = useState(more ? jw.holder_name || "" : mem.holder || "");
  const [lists, setLists] = useState({});           // { vendor: [...], subcon: [...] }
  const [plan, setPlan] = useState([blankPlan()]);
  const [lines, setLines] = useState([blankLine()]);
  const [date, setDate] = useState(istToday());
  const [vehicle, setVehicle] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [pol, setPol] = useState(null);
  const [prev, setPrev] = useState(null);
  const [prevErr, setPrevErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { loadPhotoPolicy().then(setPol).catch(() => {}); }, []);
  // Party list — vendor = sab party, subcon = subcontractor wali. Yaad wali party
  // list me na mile to hata do.
  useEffect(() => {
    if (more || (kind !== "vendor" && kind !== "subcon") || lists[kind]) return;
    api.get(kind === "subcon" ? "/finance/parties?type=subcontractor" : "/finance/parties").then((r) => {
      const arr = r && r.success && Array.isArray(r.data) ? r.data : [];
      setLists((x) => ({ ...x, [kind]: arr }));
      setParty((p) => (p && !arr.some((x) => String(x.id) === String(p)) ? "" : p));
    }).catch(() => {});
  }, [kind, more, lists]);
  const pickKind = (k) => { setKind(k); setParty(k && mem[k] ? String(mem[k]) : ""); };

  const byId = useMemo(() => new Map((stock || []).map((m) => [String(m.id), m])), [stock]);
  const cards = useUnitCards(lines.map((l) => (byId.get(String(l.id)) || {}).name));
  const lb = linesBody(lines, stock, cards);
  const planBody = plan.filter((p) => p.item_id && num(p.qty) > 0).map((p) => ({ item_id: Number(p.item_id), qty: Number(p.qty) }));
  const makerBody = more
    ? { maker_kind: jw.maker_kind, vendor_party_id: jw.vendor_party_id || undefined, holder_name: jw.holder_name || undefined }
    : { maker_kind: kind, vendor_party_id: kind !== "own" && party ? Number(party) : undefined, holder_name: kind === "own" ? holder.trim() || null : undefined };
  const makerOk = more || kind === "own" || ((kind === "vendor" || kind === "subcon") && !!party);
  const pvBody = makerOk && lb && lb.length ? { warehouse_id: Number(whId), ...makerBody, date, lines: lb } : null;
  const pvSig = JSON.stringify(pvBody);

  // Value — rukne ke 450ms baad server se (kuch save nahi hota).
  useEffect(() => {
    const b = JSON.parse(pvSig);
    if (!b) { setPrev(null); setPrevErr(""); return undefined; }
    let alive = true;
    const tm = setTimeout(() => {
      api.post("/job-works/preview", b).then((r) => {
        if (!alive) return;
        if (r && r.success) { setPrev(r.data); setPrevErr(""); } else { setPrev(null); setPrevErr((r && r.message) || ""); }
      }).catch(() => {});
    }, 450);
    return () => { alive = false; clearTimeout(tm); };
  }, [pvSig]);

  // "Ye do" — calc ka sujhaav (store ki unit me) lines me; wahi material pehle se ho to badal do.
  const use = (raws) => setLines((cur) => {
    const ids = new Set(raws.map((r) => String(r.material_id)));
    const keep = cur.filter((l) => l.id && !ids.has(String(l.id)));
    const add = raws.map((r) => ({ id: String(r.material_id), qty: String(r.suggest != null ? r.suggest : r.need_stock), unit: "", factor: "" }));
    return [...keep, ...add].length ? [...keep, ...add] : [blankLine()];
  });

  const save = async () => {
    setErr("");
    if (!more && !kind) { setErr(t("jobwork.need_maker")); return; }
    if (!makerOk) { setErr(kind === "subcon" ? t("jobwork.need_subcon") : t("jobwork.need_vendor")); return; }
    if (lb === null) { setErr(t("jobwork.need_factor")); return; }
    if (!lb.length) { setErr(t("jobwork.need_lines")); return; }
    if (plan.some((p) => (p.item_id && !(num(p.qty) > 0)) || (!p.item_id && num(p.qty) > 0))) { setErr(t("jobwork.need_plan_qty")); return; }
    if (uploading(CHALLAN_FOLDER)) { setErr(t("jobwork.photo_uploading")); return; }
    setBusy(true);
    const common = { date, note: note.trim() || null, lines: lb, plan: planBody, photo_urls: photos };
    const r = await (more
      ? api.post(`/job-works/${jw.id}/lines`, common)
      : api.post("/job-works", { ...common, warehouse_id: Number(whId), ...makerBody, vehicle_no: vehicle.trim() || null })
    ).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    if (!more) writeMem(whId, { ...mem, kind, ...(kind === "own" ? { holder: holder.trim() } : { [kind]: Number(party) }) });
    window.alert(r.message || "");
    onSaved && onSaved(r.data);
  };

  const plist = lists[kind] || [];
  return (
    <Drawer width={820} title={more ? t("jobwork.more_title", { no: jw.jw_no }) : t("jobwork.send_title2", { name: whName || "" })}
      sub={more ? t("jobwork.more_sub", { who: jw.vendor_name || makerL(jw.maker_kind) }) : t("jobwork.send_sub2")} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} style={{ ...btn(T.ind), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("jobwork.send_save2")}</button>
      </>}>
      {!more && (
        <div style={{ ...box, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 150px", gap: 12 }}>
            <div>
              <span style={lbl}>{t("jobwork.maker")}</span>
              <PickSelect value={kind} onChange={(e) => pickKind(e.target.value)} style={{ ...inp, width: "100%" }}>
                <option value="">{t("jobwork.maker_pick")}</option>
                {MAKERS.map((k) => <option key={k} value={k}>{makerL(k)}</option>)}
              </PickSelect>
            </div>
            <div>
              {kind === "own" && <>
                <span style={lbl}>{t("jobwork.holder")}</span>
                <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder={t("jobwork.holder_ph")} style={inp} />
              </>}
              {(kind === "vendor" || kind === "subcon") && <>
                <span style={lbl}>{kind === "subcon" ? t("jobwork.subcon") : t("jobwork.vendor")}</span>
                <PickSelect value={party} onChange={(e) => setParty(e.target.value)} style={{ ...inp, width: "100%" }}>
                  <option value="">{kind === "subcon" ? t("jobwork.subcon_pick") : t("jobwork.vendor_pick")}</option>
                  {plist.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </PickSelect>
              </>}
            </div>
            <div>
              <span style={lbl}>{t("common.date")}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
            </div>
          </div>
          {kind && <div style={{ fontSize: 11, color: T.t3, marginTop: 7 }}>{makerHint(kind)}</div>}
        </div>
      )}
      {more && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <MakerChip k={jw.maker_kind} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{jw.vendor_name}</span>
          <span style={{ flex: 1 }} />
          <div style={{ width: 150 }}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></div>
        </div>
      )}

      <PlanBox whId={whId} items={items} plan={plan} setPlan={setPlan} onUse={use}
        title={more ? t("jobwork.plan_title_more") : t("jobwork.plan_title")} />
      <LinesBox stock={stock} lines={lines} setLines={setLines} prevLines={prev ? prev.lines : null}
        title={more ? t("jobwork.give_title_more") : t("jobwork.give_title")} />

      <div style={{ display: "grid", gridTemplateColumns: more ? "1fr" : "1fr 2fr", gap: 12 }}>
        {!more && <div>
          <span style={lbl}>{t("jobwork.vehicle")}</span>
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} style={inp} />
        </div>}
        <div>
          <span style={lbl}>{t("conversion.note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <PhotoPick pol={policyFor(pol, "job_work")} folder={CHALLAN_FOLDER} photos={photos} setPhotos={setPhotos} label={t("jobwork.give_photo")} />
      </div>

      <div style={{ marginTop: 16, padding: "11px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9 }}>
        <div style={secT}>{t("jobwork.value_title")}</div>
        {prev ? <div style={{ fontSize: 16, fontWeight: 800, color: T.ind }}>{inr(prev.value)}</div>
          : <div style={{ fontSize: 12, color: prevErr ? T.red : T.t4 }}>{prevErr || t("jobwork.preview_wait2")}</div>}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("jobwork.value_basis")}</div>
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Ginti / Wapas — kitne bane (Library item) + bacha raw / kabad
// ════════════════════════════════════════════════════════════════
const blankBack = () => ({ raw: "", rawUnit: "", rawF: "", scrap: "", scrapUnit: "", scrapF: "", mode: "back" });

function GintiForm({ jw, items, onClose, onSaved }) {
  const isVendor = jw.maker_kind === "vendor";
  const sent = useMemo(() => (jw.lines || []).filter((l) => num(l.balance && l.balance.pending) > 0), [jw]);
  const itemIds = useMemo(() => new Set((items || []).map((i) => String(i.id))), [items]);
  const [made, setMade] = useState(() => {
    const p = (jw.plan || []).filter((x) => x.item_id && x.planned_qty != null && itemIds.has(String(x.item_id)));
    return p.length ? p.map((x) => ({ item_id: String(x.item_id), qty: "" })) : [{ item_id: "", qty: "" }];
  });
  const [back, setBack] = useState(() => Object.fromEntries(sent.map((l) => [l.id, blankBack()])));
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
  const cards = useUnitCards(sent.map((l) => l.material_name));
  const stOf = (l) => ({ unit: l.unit, units: [l.unit], card: cards[key(l.material_name)] || null });
  const planOf = (id) => (jw.plan || []).find((p) => String(p.item_id) === String(id));
  const byItem = useMemo(() => new Map((items || []).map((i) => [String(i.id), i])), [items]);
  const setB = (id, patch) => setBack((x) => ({ ...x, [id]: { ...(x[id] || blankBack()), ...patch } }));

  const madeF = made.filter((m) => m.item_id && num(m.qty) > 0);
  let needF = false;
  const lines = [];
  for (const l of sent) {
    const b = back[l.id] || blankBack();
    const st = stOf(l);
    for (const [k, q, u, f] of [["raw", b.raw, b.rawUnit, b.rawF], ["scrap", b.scrap, b.scrapUnit, b.scrapF]]) {
      if (!(num(q) > 0)) continue;
      const unit = u || l.unit;
      if (needsFactor(st, unit, q, f)) needF = true;
      lines.push({ kind: k, jw_line_id: l.id, qty: Number(q), unit, stock_factor: factorOf(st, unit, q, f), ...(k === "scrap" ? { scrap_mode: b.mode } : {}) });
    }
  }
  const body = !madeF.length && !lines.length ? null
    : { date, note: note.trim() || null, made: madeF.map((m) => ({ item_id: Number(m.item_id), qty: Number(m.qty) })), lines, making: isVendor ? makingBody(mk) : null };
  const sig = JSON.stringify(needF ? null : body);

  useEffect(() => {
    const b = JSON.parse(sig);
    if (!b) { setPrev(null); setPrevErr(""); return undefined; }
    let alive = true;
    const tm = setTimeout(() => {
      api.post(`/job-works/${jw.id}/receipts/preview`, b).then((r) => {
        if (!alive) return;
        if (r && r.success) { setPrev(r.data); setPrevErr(""); } else { setPrev(null); setPrevErr((r && r.message) || ""); }
      }).catch(() => {});
    }, 450);
    return () => { alive = false; clearTimeout(tm); };
  }, [sig, jw.id]);

  const save = async () => {
    setErr("");
    if (made.some((m) => !m.item_id && num(m.qty) > 0)) { setErr(t("jobwork.need_made_item")); return; }
    if (!body) { setErr(t("jobwork.need_recv_lines2")); return; }
    if (needF) { setErr(t("jobwork.need_factor")); return; }
    if (body.making && uploading(BILL_FOLDER)) { setErr(t("jobwork.photo_uploading")); return; }
    setBusy(true);
    const r = await api.post(`/job-works/${jw.id}/receipts`, body.making ? { ...body, photo_urls: photos } : body).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    const warn = (r.warnings || []).length ? "\n⚠ " + r.warnings.join("\n⚠ ") : "";
    window.alert((r.message || "") + warn);
    onSaved && onSaved(r.data);
  };
  const after = (lineId) => (prev ? (prev.balance_after || []).find((b) => String(b.jw_line_id) === String(lineId)) : null);
  const pMade = (i) => (prev && prev.made ? prev.made[madeF.indexOf(made[i])] : null);
  // Qty + unit (card ho to doosri unit — "4 Mtr" bacha TMT, "3 Kg" kabad).
  const unitBox = (l, q, u, f, setQ, setU, setF) => {
    const st = stOf(l);
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 6 }}>
          <input type="number" min="0" value={q} onChange={(e) => setQ(e.target.value)} style={inp} />
          <UnitPickOrLock st={st} unit={u || l.unit} onChange={(x) => setU(x === l.unit ? "" : x)} style={{ ...inp, width: "100%" }} lockStyle={lockSt} />
        </div>
        {u && <StockConvLine st={st} unit={u} qty={q} factor={f} onFactor={setF} compact />}
      </>
    );
  };

  return (
    <Drawer width={820} title={t("jobwork.ginti_title", { no: jw.jw_no })} sub={t("jobwork.ginti_sub", { who: jw.vendor_name || makerL(jw.maker_kind) })} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} style={{ ...btn(T.grn), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("jobwork.recv_save")}</button>
      </>}>
      <div style={{ ...box, marginBottom: 14 }}>
        <div style={secT}>{t("jobwork.made_title")}</div>
        {!(items || []).length && <div style={{ fontSize: 12, color: T.t3, marginBottom: 6 }}>{t("jobwork.lib_empty")}</div>}
        {(items || []).length > 0 && made.map((m, i) => {
          const it = byItem.get(String(m.item_id));
          const pl = planOf(m.item_id);
          const pm = pMade(i);
          return (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 50px 28px", gap: 8, alignItems: "center" }}>
                <PickSelect value={m.item_id} onChange={(e) => setMade((x) => x.map((y, j) => (j === i ? { ...y, item_id: e.target.value } : y)))} style={{ ...inp, width: "100%" }}>
                  <option value="">{t("jobwork.pick_item")}</option>
                  {(items || []).map((x) => <option key={x.id} value={x.id}>{itemLabel(x)}</option>)}
                </PickSelect>
                <input type="number" min="0" value={m.qty} placeholder={t("jobwork.how_many_made")} onChange={(e) => setMade((x) => x.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)))} style={inp} />
                <span style={{ fontSize: 12, color: T.t3 }}>{it ? it.out_unit || PCS : ""}</span>
                <button onClick={() => setMade((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [{ item_id: "", qty: "" }]))} aria-label="remove"
                  style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {pl && pl.planned_qty != null && <span>{t("jobwork.made_so_far", { planned: fmtQ(pl.planned_qty), made: fmtQ(pl.made_qty), unit: pl.unit || "" })}</span>}
                {pm && <span style={{ color: T.t1, fontWeight: 600 }}>{t("jobwork.made_uses", { list: (pm.uses || []).map((u) => `${u.name} ${fmtQ(u.qty)} ${u.unit}`).join(", ") })}
                  {" · "}{t("jobwork.made_rate", { rate: fmtQ(pm.rate), unit: pm.unit })}</span>}
              </div>
            </div>
          );
        })}
        {(items || []).length > 0 && <button onClick={() => setMade((x) => [...x, { item_id: "", qty: "" }])} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5 }}>{t("jobwork.add_item")}</button>}
      </div>

      {sent.length > 0 && (
        <div style={{ ...box, marginBottom: 14 }}>
          <div style={secT}>{t("jobwork.back_title")}</div>
          {sent.map((l) => {
            const b = back[l.id] || blankBack();
            const a = after(l.id);
            return (
              <div key={l.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.b1}` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("jobwork.with_them", { name: l.material_name, qty: fmtQ(l.balance.pending), unit: l.unit || "" })}</div>
                  {a && <div style={{ fontSize: 11, color: a.pending < 0 ? T.red : T.t3 }}>{t("jobwork.after2", { qty: fmtQ(a.pending), unit: a.unit || "" })}</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={lbl}>{t("jobwork.raw_back2")}</span>
                    {unitBox(l, b.raw, b.rawUnit, b.rawF, (v) => setB(l.id, { raw: v }), (v) => setB(l.id, { rawUnit: v, rawF: "" }), (v) => setB(l.id, { rawF: v }))}
                  </div>
                  <div>
                    <span style={lbl}>{t("jobwork.scrap2")}</span>
                    {unitBox(l, b.scrap, b.scrapUnit, b.scrapF, (v) => setB(l.id, { scrap: v }), (v) => setB(l.id, { scrapUnit: v, scrapF: "" }), (v) => setB(l.id, { scrapF: v }))}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {[["back", t("jobwork.scrap_to_store")], ["kept", t("jobwork.scrap_left")]].map(([k, tx]) => (
                        <button key={k} type="button" onClick={() => setB(l.id, { mode: k })}
                          style={{ ...btn(b.mode === k ? T.indL : T.surface, b.mode === k ? T.ind : T.t3, b.mode === k ? T.ind : T.b1), padding: "4px 9px", fontSize: 11 }}>{tx}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("jobwork.back_hint")}</div>
        </div>
      )}

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

      {isVendor && (
        <div style={{ ...box, marginBottom: 14 }}>
          <div style={secT}>{t("jobwork.making_title")}</div>
          <MakingFields mk={mk} setMk={setMk} vendor={jw.vendor_name}
            amount={prev && prev.making ? prev.making.amount : null}
            basisQty={prev && prev.making ? prev.making.basis_qty : null} basisUnit={prev && prev.making ? prev.making.basis_unit : ""} />
          {makingBody(mk) && <div style={{ marginTop: 10 }}>
            <PhotoPick pol={policyFor(pol, "job_work_bill")} folder={BILL_FOLDER} photos={photos} setPhotos={setPhotos} label={t("conversion.bill_photo")} />
          </div>}
        </div>
      )}

      <div style={{ padding: "11px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9 }}>
        <div style={secT}>{t("conversion.cost_title")}</div>
        {prev ? (
          <div style={{ fontSize: 12, color: T.t2, display: "grid", gap: 4 }}>
            {(prev.made || []).map((x, i) => <div key={"m" + i}>{t("jobwork.made_cost", { name: x.name, qty: fmtQ(x.qty), unit: x.unit, amount: inr(x.amount) })}</div>)}
            {(prev.raw_back || []).map((x, i) => <div key={i}>{t("jobwork.raw_back_cost", { name: x.name, qty: fmtQ(x.qty), unit: x.unit, amount: inr(x.amount) })}</div>)}
            {num(prev.scrap_cost) > 0 && <div>{t("jobwork.scrap_cost", { amount: inr(prev.scrap_cost) })}</div>}
            {(prev.warnings || []).map((w, i) => <div key={"w" + i} style={{ color: T.amb }}>⚠ {w}</div>)}
          </div>
        ) : <div style={{ fontSize: 12, color: prevErr ? T.red : T.t4 }}>{prevErr || t("jobwork.recv_wait2")}</div>}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("jobwork.ginti_basis")}</div>
      </div>
      {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Banwai baad me (sirf vendor)
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
    <Drawer width={600} title={t("jobwork.charge_title2", { no: jw.jw_no })} sub={t("jobwork.charge_sub")} onClose={onClose}
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
// Delivery Challan (Job Work) — print (sirf web, sirf vendor)
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
// Band karo — jo paas me baaki = zyada wastage (sirf flag)
// ════════════════════════════════════════════════════════════════
function CloseBox({ jw, onDone, onClose }) {
  const left = (jw.lines || []).filter((l) => num(l.balance && l.balance.pending) > 0);
  const value = left.reduce((s, l) => s + (num(l.qty) > 0 ? num(l.amount) * num(l.balance.pending) / num(l.qty) : 0), 0);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(""); setBusy(true);
    const r = await api.post(`/job-works/${jw.id}/close`, { note: note.trim() || null, date: istToday() }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    window.alert(r.message || "");
    onDone && onDone();
  };
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: T.ambL, border: `1.5px solid ${T.ambM}`, borderRadius: 9 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.amb }}>{t("jobwork.close_title", { no: jw.jw_no })}</div>
      {left.length > 0 ? <>
        <div style={{ fontSize: 12, color: T.t2, margin: "6px 0 2px" }}>{t("jobwork.close_left", { list: qtyList(left.map((l) => ({ name: l.material_name, unit: l.unit, qty: l.balance.pending }))), value: inr(value) })}</div>
        <div style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>{t("jobwork.close_hint")}</div>
      </> : <div style={{ fontSize: 12, color: T.t2, margin: "6px 0 8px" }}>{t("jobwork.close_nothing")}</div>}
      <span style={lbl}>{t("conversion.note")}</span>
      <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
      {err && <div style={{ fontSize: 11.5, color: T.red, fontWeight: 600, marginTop: 7 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.close")}</button>
        <button onClick={go} disabled={busy} style={{ ...btn(T.amb), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("jobwork.close_confirm")}</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Timeline — diya → aur diya → bana → wapas / kabad → site par laga → band
// ════════════════════════════════════════════════════════════════
// Ek material ki kai line (pehla diya + "Aur do") — naam + unit se ek jod.
const agg = (arr) => {
  const m = new Map();
  for (const x of arr || []) {
    const k = key(x.name) + "|" + key(x.unit);
    const e = m.get(k) || { name: x.name, unit: x.unit, qty: 0, value: 0 };
    e.qty += num(x.qty); e.value += num(x.value);
    m.set(k, e);
  }
  return [...m.values()];
};
const qtyList = (arr) => agg(arr).map((x) => `${x.name} ${fmtQ(x.qty)} ${x.unit || ""}`.trim()).join(", ");
const EV = {
  sent: { c: T.ind, k: "jobwork.ev_sent" }, sent_more: { c: T.ind, k: "jobwork.ev_sent_more" },
  made: { c: T.grn, k: "jobwork.ev_made" }, returned: { c: T.slt, k: "jobwork.ev_returned" },
  charge: { c: T.ind, k: "jobwork.ev_charge" }, used: { c: T.t2, k: "jobwork.ev_used" }, closed: { c: T.amb, k: "jobwork.ev_closed" },
};
function Timeline({ events, receipts, isAdmin, cancel, setCancel, onChanged }) {
  const recOf = (no) => (receipts || []).find((r) => r.receipt_no === no);
  if (!(events || []).length) return <div style={{ fontSize: 12, color: T.t4 }}>{t("jobwork.tl_empty")}</div>;
  return (
    <div style={{ position: "relative", paddingLeft: 18 }}>
      <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 1.5, background: T.b1 }} />
      {events.map((e, i) => {
        const m = EV[e.type] || { c: T.t3, k: e.type };
        const r = e.receipt_no ? recOf(e.receipt_no) : null;
        const rows = [];
        if (e.lines) rows.push(qtyList(e.lines));
        for (const x of e.made || []) {
          rows.push(t("jobwork.tl_made_row", { name: x.name, qty: fmtQ(x.qty), unit: x.unit || "", uses: qtyList(x.uses) || "—" }));
        }
        if ((e.raw_back || []).length) rows.push(t("jobwork.tl_raw_back", { list: qtyList(e.raw_back) }));
        if ((e.scrap_back || []).length) rows.push(t("jobwork.tl_scrap_back", { list: qtyList(e.scrap_back) }));
        if ((e.scrap_kept || []).length) rows.push(t("jobwork.tl_scrap_kept", { list: qtyList(e.scrap_kept) }));
        if ((e.loss || []).length) rows.push(t("jobwork.tl_loss", { list: qtyList(e.loss) }));
        if (num(e.making_amount) > 0) rows.push(t("jobwork.tl_making", { amount: inr(e.making_amount) }));
        if (e.type === "used") rows.push(t("jobwork.tl_used_row", { name: e.name, qty: fmtQ(e.qty), unit: e.unit || "", project: e.project_name || "—", no: e.issue_no || "" }));
        if (e.type === "closed" && !(e.loss || []).length) rows.push(t("jobwork.tl_closed_ok"));
        return (
          <div key={i} style={{ position: "relative", paddingBottom: 12, opacity: e.cancelled ? 0.5 : 1 }}>
            <span style={{ position: "absolute", left: -17, top: 4, width: 9, height: 9, borderRadius: "50%", background: e.cancelled ? T.b2 : m.c, border: "2px solid #fff" }} />
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: e.cancelled ? T.t3 : m.c, textDecoration: e.cancelled ? "line-through" : "none" }}>{t(m.k)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtDate(e.date)}</span>
              {e.receipt_no && <span style={{ fontSize: 11, color: T.t4, fontFamily: "monospace" }}>{e.receipt_no}</span>}
              {e.by && <span style={{ fontSize: 11, color: T.t4 }}>· {e.by}</span>}
              {e.cancelled && <Chip s={statusChip("Cancelled")} />}
              <span style={{ flex: 1 }} />
              {isAdmin && r && r.status !== "Cancelled" && cancel == null && (
                <button onClick={() => setCancel(r.id)} style={{ ...btn(T.surface, T.red, T.b1), padding: "2px 9px", fontSize: 10.5 }}>{t("jobwork.cancel_r_btn")}</button>
              )}
            </div>
            {rows.filter(Boolean).map((x, j) => <div key={j} style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{x}</div>)}
            {e.note && <div style={{ fontSize: 11.5, color: T.t3, fontStyle: "italic", marginTop: 2 }}>"{e.note}"</div>}
            {r && cancel === r.id && <CancelBox title={t("conversion.cancel_title", { no: r.receipt_no })} hint={t("jobwork.cancel_r_hint2")}
              url={`/job-works/receipts/${r.id}/cancel`} onClose={() => setCancel(null)} onDone={() => { setCancel(null); onChanged(); }} />}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Order ka detail
// ════════════════════════════════════════════════════════════════
function JwDetail({ id, whId, stock, items, canEntry, isAdmin, onClose, onChanged }) {
  const [jw, setJw] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(null);       // "ginti" | "more" | "charge"
  const [closing, setClosing] = useState(false);
  const [cancel, setCancel] = useState(null);   // "jw" | receipt id
  const load = useCallback(() => {
    api.get(`/job-works/${id}`).then((r) => { if (r && r.success) { setJw(r.data); setErr(""); } else setErr((r && r.message) || ""); }).catch(() => {});
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const changed = () => { load(); onChanged && onChanged(); };
  if (!jw) {
    return <Drawer width={760} title={t("jobwork.tab2")} onClose={onClose}><div style={{ fontSize: 12.5, color: err ? T.red : T.t4 }}>{err || t("common.loading")}</div></Drawer>;
  }
  const live = (jw.receipts || []).filter((r) => r.status !== "Cancelled");
  const open = jw.status === "Open" || jw.status === "PartReceived";
  const isVendor = jw.maker_kind === "vendor";
  const boxOpen = closing || cancel != null;
  // Band / cancel order par koi button na bache to footer hi nahi (khaali patti nahi).
  const actions = [
    isVendor && <button key="ch" onClick={() => printChallan(jw.id)} style={btn(T.surface, T.t2, T.b2)}>{t("jobwork.btn_challan2")}</button>,
    isVendor && canEntry && jw.status !== "Cancelled" && <button key="mk" onClick={() => setForm("charge")} style={btn(T.surface, T.ind, T.b1)}>{t("jobwork.btn_charge2")}</button>,
    isAdmin && jw.status !== "Cancelled" && live.length === 0 && !boxOpen && <button key="cx" onClick={() => setCancel("jw")} style={btn(T.surface, T.red, T.b1)}>{t("conversion.cancel_btn")}</button>,
    canEntry && open && !boxOpen && <button key="cl" onClick={() => setClosing(true)} style={btn(T.surface, T.amb, T.ambM)}>{t("jobwork.btn_close")}</button>,
    canEntry && open && <button key="mo" onClick={() => setForm("more")} style={btn(T.surface, T.ind, T.ind)}>{t("jobwork.btn_more")}</button>,
    canEntry && open && <button key="gi" onClick={() => setForm("ginti")} style={btn(T.grn)}>{t("jobwork.btn_ginti")}</button>,
  ].filter(Boolean);
  return (
    <Drawer width={780} title={jw.jw_no} sub={t("jobwork.detail_sub2", { date: fmtDate(jw.date), maker: makerL(jw.maker_kind), who: jw.vendor_name || "—" })} onClose={onClose}
      footer={actions.length ? <>{actions}</> : null}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <Chip s={statusChip(jw.status)} />
        <MakerChip k={jw.maker_kind} />
        {open && <span style={{ fontSize: 12, fontWeight: 700, color: isVendor ? ageColor(jw.age_flag) : T.t3 }}>{t("jobwork.days_n", { n: jw.days })}</span>}
        {jw.vehicle_no && <span style={{ fontSize: 12, color: T.t3 }}>{t("jobwork.vehicle_show", { no: jw.vehicle_no })}</span>}
        <span style={{ fontSize: 12, color: T.t3 }}>{t("jobwork.value_show", { amount: inr(jw.sent_value) })}</span>
      </div>
      {jw.flag_wastage && (
        <div style={{ padding: "9px 12px", borderRadius: 8, marginBottom: 12, background: T.ambL, border: `1px solid ${T.ambM}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.amb }}>{t("jobwork.flag_title", { amount: inr(jw.excess_value) })}</div>
          <div style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{agg(jw.excess).map((x) => `${x.name} ${fmtQ(x.qty)} ${x.unit || ""} (${inr(x.value)})`).join(", ")}</div>
          <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>{t("jobwork.flag_hint")}</div>
          {jw.close_note && <div style={{ fontSize: 11.5, color: T.t2, fontStyle: "italic", marginTop: 3 }}>"{jw.close_note}"</div>}
        </div>
      )}
      {isVendor && jw.age_msg && (
        <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12,
          background: jw.age_flag === "red" ? T.redL : T.ambL, color: jw.age_flag === "red" ? T.red : T.amb, border: `1px solid ${jw.age_flag === "red" ? T.red + "44" : T.ambM}` }}>⚠ {jw.age_msg}</div>
      )}

      {(jw.plan || []).length > 0 && (
        <div style={{ ...box, marginBottom: 12 }}>
          <div style={secT}>{t("jobwork.plan_box")}</div>
          {jw.plan.map((p, i) => {
            const pct = p.planned_qty > 0 ? Math.min(100, (num(p.made_qty) / num(p.planned_qty)) * 100) : 100;
            return (
              <div key={i} style={{ padding: "5px 0" }}>
                <div style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
                  <b style={{ flex: 1, color: T.t1 }}>{p.item_name}</b>
                  <span style={{ color: T.t2 }}>{p.planned_qty != null
                    ? t("jobwork.plan_progress", { made: fmtQ(p.made_qty), planned: fmtQ(p.planned_qty), unit: p.unit || "" })
                    : t("jobwork.plan_extra_made", { made: fmtQ(p.made_qty), unit: p.unit || "" })}</span>
                </div>
                {p.planned_qty != null && <div style={{ height: 4, borderRadius: 2, background: T.sltL, marginTop: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: pct >= 100 ? T.grn : T.ind }} />
                </div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...box, marginBottom: 12 }}>
        <div style={secT}>{t("jobwork.paas_title", { who: jw.vendor_name || makerL(jw.maker_kind) })}</div>
        {(jw.lines || []).map((l) => (
          <div key={l.id} style={{ padding: "6px 0", borderTop: `1px solid ${T.b1}` }}>
            <div style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "baseline" }}>
              <b style={{ flex: 1, color: T.t1 }}>{l.material_name}{Number(l.send_no) > 1 && <span style={{ fontSize: 10.5, color: T.t4, fontWeight: 600 }}> · {t("jobwork.more_no", { n: Number(l.send_no) - 1 })}</span>}</b>
              <span style={{ fontWeight: 700, color: l.balance.pending > 0 ? T.t1 : T.grn }}>{t("jobwork.paas_left", { qty: fmtQ(l.balance.pending), unit: l.unit || "" })}</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
              {t("jobwork.bal_line2", { sent: fmtQ(l.qty), used: fmtQ(l.balance.used), raw: fmtQ(l.balance.raw_back), scrap: fmtQ(l.balance.scrap_kept + l.balance.scrap_back), loss: fmtQ(l.balance.loss), unit: l.unit || "" })}
              {" · "}{inr(l.amount)} · {srcLabel(l.rate_source)}
            </div>
          </div>
        ))}
      </div>
      {jw.note && <div style={{ marginBottom: 10, fontSize: 12, color: T.t2, fontStyle: "italic" }}>"{jw.note}"</div>}
      {jw.status === "Cancelled" && <div style={{ marginBottom: 10, fontSize: 12, color: T.t3 }}>{t("jobwork.cancelled_reason", { reason: jw.cancel_reason || "" })}</div>}

      <div style={secT}>{t("jobwork.tl_title")}</div>
      <Timeline events={jw.timeline} receipts={jw.receipts} isAdmin={isAdmin} cancel={cancel} setCancel={setCancel} onChanged={changed} />

      {closing && <CloseBox jw={jw} onClose={() => setClosing(false)} onDone={() => { setClosing(false); changed(); }} />}
      {cancel === "jw" && <CancelBox title={t("conversion.cancel_title", { no: jw.jw_no })} hint={t("jobwork.cancel_jw_hint")}
        url={`/job-works/${jw.id}/cancel`} onClose={() => setCancel(null)} onDone={() => { setCancel(null); changed(); }} />}

      {form === "ginti" && <GintiForm jw={jw} items={items} onClose={() => setForm(null)} onSaved={() => { setForm(null); changed(); }} />}
      {form === "more" && <SendForm whId={whId} stock={stock} items={items} jw={jw} onClose={() => setForm(null)} onSaved={() => { setForm(null); changed(); }} />}
      {form === "charge" && <ChargeForm jw={jw} onClose={() => setForm(null)} onSaved={() => { setForm(null); changed(); }} />}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Kiske paas — banane wale ke hisaab se khula maal
// ════════════════════════════════════════════════════════════════
function HoldersPanel({ whId, seq, onOpen }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/job-works/holders?warehouse_id=${encodeURIComponent(whId)}`).then((r) => setData(r && r.success ? r.data || [] : [])).catch(() => setData([]));
  }, [whId, seq]);
  if (data === null) return <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>;
  if (!data.length) return <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("jobwork.holders_empty")}</div>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((g, gi) => (
        <div key={gi} style={{ background: T.surface, border: `1.5px solid ${g.age_flag === "red" ? T.red + "66" : g.age_flag === "yellow" ? T.ambM : T.b1}`, borderRadius: 10, padding: "11px 14px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <MakerChip k={g.maker_kind} />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.t1 }}>{g.name || makerL(g.maker_kind)}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ind }}>{t("jobwork.v_value", { amount: inr(g.value_pending) })}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: g.maker_kind === "vendor" ? ageColor(g.age_flag) : T.t3 }}>{t("jobwork.v_days", { n: g.max_days })}</div>
          </div>
          <div style={{ fontSize: 12.5, color: T.t2, marginTop: 6 }}>
            {(g.materials || []).map((m) => `${m.name} ${fmtQ(m.pending)} ${m.unit || ""}`).join(" · ")}
          </div>
          {(g.orders || []).map((o) => (
            <div key={o.id} onClick={() => onOpen(o.id)} style={{ display: "grid", gridTemplateColumns: "90px 80px 1fr 90px 70px", gap: 8, fontSize: 12, padding: "6px 0", borderTop: `1px solid ${T.b1}`, marginTop: 6, cursor: "pointer" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{o.jw_no}</span>
              <span style={{ color: T.t3 }}>{fmtDate(o.date)}</span>
              <span style={{ color: T.t2 }}>{planText(o) || "—"}</span>
              <span style={{ textAlign: "right" }}>{inr(o.value_pending)}</span>
              <span style={{ textAlign: "right", fontWeight: 700, color: T.t3 }}>{t("jobwork.days_n", { n: o.days })}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ITC-04 (sirf web, sirf bahar ka vendor)
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
      <div style={{ fontSize: 11, color: T.t4, marginBottom: 8 }}>{t("jobwork.itc_hint2")}</div>
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
// Tab — "Conversion"
// ════════════════════════════════════════════════════════════════
export function ConversionTab({ whId, whName, stock, canEntry, isAdmin, onStockChanged }) {
  const [view, setView] = useState("list");
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("");
  const [mFilter, setMFilter] = useState("");
  const [items, setItems] = useState([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [seq, setSeq] = useState(0);
  const load = useCallback(() => {
    if (!whId) return;
    api.get(`/job-works?warehouse_id=${encodeURIComponent(whId)}`).then((r) => setList(r && r.success ? r.data || [] : [])).catch(() => setList([]));
  }, [whId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/conversion-items").then((r) => setItems(r && r.success ? r.data || [] : [])).catch(() => {}); }, []);
  const changed = () => { load(); setSeq((n) => n + 1); onStockChanged && onStockChanged(); };
  const shown = (list || []).filter((j) => (!filter || j.status === filter) && (!mFilter || j.maker_kind === mFilter));
  const VIEWS = [["list", t("jobwork.view_orders")], ["holders", t("jobwork.view_holders")], ["itc04", t("jobwork.view_itc04_2")]];
  const GRID = "84px 76px 1.2fr 1.4fr 1.3fr 54px 120px";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, fontSize: 12, color: T.t3 }}>{t("jobwork.subtitle2")}</div>
        {canEntry && <button onClick={() => setSendOpen(true)} style={btn(T.ind)}>{t("jobwork.btn_send2")}</button>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {VIEWS.map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            style={{ ...btn(view === k ? T.indL : T.surface, view === k ? T.ind : T.t3, view === k ? T.ind : T.b1), padding: "6px 12px", fontSize: 12 }}>{l}</button>
        ))}
        {view === "list" && <>
          <span style={{ flex: 1 }} />
          <PickSelect value={mFilter} onChange={(e) => setMFilter(e.target.value)} style={{ ...inp, width: 170 }}>
            <option value="">{t("jobwork.f_all_makers")}</option>
            {MAKERS.map((k) => <option key={k} value={k}>{makerL(k)}</option>)}
          </PickSelect>
          <PickSelect value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inp, width: 170 }}>
            <option value="">{t("jobwork.f_all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusChip(s).l}</option>)}
          </PickSelect>
        </>}
      </div>

      {view === "list" && (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflowX: "auto" }}>
          <div style={{ minWidth: 860 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "9px 14px", background: T.surfaceB, fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>
              <span>{t("conversion.col_no")}</span><span>{t("common.date")}</span><span>{t("jobwork.col_maker")}</span>
              <span>{t("jobwork.col_plan")}</span><span>{t("jobwork.col_with")}</span><span>{t("jobwork.col_days")}</span><span />
            </div>
            {list === null && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>}
            {list && shown.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("jobwork.list_empty2")}</div>}
            {shown.map((j) => {
              const open = j.status === "Open" || j.status === "PartReceived";
              const vendor = j.maker_kind === "vendor";
              return (
                <div key={j.id} onClick={() => setDetail(j.id)}
                  style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "10px 14px", borderTop: `1px solid ${T.b1}`, fontSize: 12.5, cursor: "pointer", opacity: j.status === "Cancelled" ? 0.55 : 1, alignItems: "center" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{j.jw_no}</span>
                  <span>{fmtDate(j.date)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.vendor_name || makerL(j.maker_kind)}</span>
                    <span style={{ fontSize: 10.5, color: T.t4 }}>{makerL(j.maker_kind)}</span>
                  </span>
                  <span style={{ color: T.t2 }}>{planText(j) || <span style={{ color: T.t4 }}>{(j.lines || []).map((l) => lineText(l, (x) => x.qty)).join(", ")}</span>}</span>
                  <span style={{ color: T.t1, fontWeight: 600 }}>{open ? qtyList((j.lines || []).filter((l) => l.balance.pending > 0).map((l) => ({ name: l.material_name, unit: l.unit, qty: l.balance.pending }))) || "—" : "—"}</span>
                  <span style={{ fontWeight: 700, color: open ? (vendor ? ageColor(j.age_flag) : T.t2) : T.t4 }}>{open ? j.days : "—"}</span>
                  <span style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {j.flag_wastage && <Chip s={{ l: t("jobwork.flag_chip"), c: T.amb, bg: T.ambL }} />}
                    <Chip s={statusChip(j.status)} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view === "holders" && <HoldersPanel whId={whId} seq={seq} onOpen={setDetail} />}
      {view === "itc04" && <Itc04Panel whId={whId} />}

      {sendOpen && <SendForm whId={whId} whName={whName} stock={stock} items={items} onClose={() => setSendOpen(false)}
        onSaved={() => { setSendOpen(false); changed(); }} />}
      {detail && <JwDetail id={detail} whId={whId} stock={stock} items={items} canEntry={canEntry} isAdmin={isAdmin}
        onClose={() => setDetail(null)} onChanged={changed} />}
    </div>
  );
}
