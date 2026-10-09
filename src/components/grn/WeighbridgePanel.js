// ── ⚖️ DHARAM KATA — gadi ki tolai (web) ─────────────────────────────
// Site aur godown dono ke GRN drawer ka ek tab. Do raaste:
//
// A. BHARI GADI PEHLE (aam): vendor se bhar kar aayi.
//   1. Loaded truck ka weight  — material tick, slip ki photo se gross,
//      vehicle no. apne aap (AI); vendor order se 🔒
//   2. Site par utra           — wahi GRN; ordered row par ⚖️ chip aata hai
//   3. Empty truck ka weight   — tare → net = gross − tare → GRN ka billing
//      weight. Challan se kam aaya to "Short issue" ek tap me.
//
// B. KHALI GADI PEHLE (24 Sep 2026): apni gadi khali hi khadan/vendor ke
//    paas ja rahi hai. Khali tolte waqt MATERIAL PATA HI NAHI HOTA — us
//    entry me sirf gadi ka number (zaroori), khali wazan, slip, photo, samay.
//    Bhar kar aane par usi entry par bhara wazan + material + vendor +
//    challan; net = bhara − khali. Khali wala byora (kab, kisne, slip,
//    photo) badalta nahi aur bhare wazan ke saath saamne rehta hai.
//
// GADI KA PEECHHA: tuli gadi jab tak site par utar kar GRN nahi hoti, uska
// challan aur number "utarna baaki" list me khula rehta hai.
// App me isi ka jodidaar: sanchalan-app src/components/WeighPanel.js
// Backend: routes/weighments.js
import React, { useEffect, useState } from "react";
import PickSelect from "../PickSelect";
import api from "../../config/api";
import uploadManager from "../../utils/uploadManager";
import { loadPhotoPolicy, policyFor } from "../../utils/photoPolicy";
import { T } from "../../modules/shared/tokens";
import { t } from "../../i18n";
import { challanUnits, destParam, fmtKg, kgIn, kgPerUnit, loadWeighments } from "./weigh";
import { loadOrderedLines, loadPoLines } from "./grnData";
import { cld } from "../../utils/cloudinary";

const inp = { width: "100%", padding: "7px 9px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 3 };
const btn = (bg, fg, bd) => ({ padding: "7px 14px", borderRadius: 6, background: bg, color: fg, border: bd ? "1px solid " + bd : "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const secH = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", margin: "14px 0 7px" };
const STATUS = { InTransit: [T.amb, T.ambL, "weigh.in_transit"], Received: [T.blu, T.bluL, "weigh.unloaded"], Closed: [T.grn, T.grnL, "weigh.closed"], Cancelled: [T.red, T.redL, "weigh.cancelled"] };
// Cancel ki jaldi wali wajah — tap se bhar jaati hai, phir badal bhi sakte ho.
// Har chip ki kism (9 Oct 2026): galat entry / gadi wapas bheji / order cancel — server ko jaati hai.
const CANCEL_CHIPS = [
  { k: "weigh.cancel_r1", kind: "wrong_entry" }, { k: "weigh.cancel_r2", kind: "wrong_entry" },
  { k: "weigh.cancel_r3", kind: "wrong_entry" }, { k: "weigh.cancel_r4", kind: "wrong_entry" },
  { k: "weigh.cancel_r5", kind: "returned" },    { k: "weigh.cancel_r6", kind: "order_cancel" },
];
const CANCEL_REASONS = CANCEL_CHIPS.map(c => c.k);
// Khali wazan itna purana ho to ⚠ (server ka STALE_TARE_HOURS bhi yahi).
// Default hai — company ka apna ghanta settings.stale_tare_hours me aata hai.
const STALE_H = 12;

// adding/pm/swapFor sirf picker ki UI ke liye: adder khula hai, kaunsa
// material chuna ja raha hai ("__free__" = bina order ka), kis line ka order
// badla ja raha hai.
const blankPick = { picked: {}, free: [], freeName: "", freeQty: "", freeUnit: "Ton", adding: false, pm: null, swapFor: null };
const nameKeyOf = (s) => String(s || "").trim().toLowerCase();
const FREE_UNITS = ["Ton", "Kg", "MT", "CFT", "Brass", "Cu.m", "Bags", "Nos"];
const blankNew = { ...blankPick, vendor: "", challan: "", vehicle: "", bridge: "", slipNo: "", kg: "", slipUrl: "", vehUrl: "", read: null, readMsg: "" };
const blankSecond = { ...blankPick, kg: "", slipNo: "", slipUrl: "", vehUrl: "", vendor: "", challan: "", read: null, readMsg: "" };

const fmtWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const hoursSince = (iso) => (iso ? Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5) : null);
const agoText = (iso) => {
  const h = hoursSince(iso);
  if (h == null) return "";
  return h < 1 ? t("weigh.ago_m", { m: Math.max(1, Math.round(h * 60)) }) : t("weigh.ago_h", { h: Math.round(h) });
};

// Photo lo → upload → (slip ho to) padho. onRead me padhe hue ankde aate hain.
function PhotoPick({ label, url, onUrl, onRead, reading }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {url ? (
          <div style={{ position: "relative", width: 54, height: 54, borderRadius: 7, overflow: "hidden", border: "1px solid " + T.b1, flexShrink: 0 }}>
            <a href={url} target="_blank" rel="noreferrer"><img src={cld(url, "thumb")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></a>
            <button type="button" onClick={() => onUrl("")}
              style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,.65)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ) : (
          <label style={{ width: 54, height: 54, borderRadius: 7, border: "1.5px dashed " + T.b2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>
            📷
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={e => {
                const file = (e.target.files || [])[0];
                if (file) uploadManager.add({
                  file, folder: "gb_buildcon/weighbridge", label: label + ": " + file.name,
                  onDone: (u) => { onUrl(u); if (onRead) onRead(u); },
                });
                e.target.value = "";
              }} />
          </label>
        )}
        {reading && <span style={{ fontSize: 10.5, color: T.blu }}>{t("weigh.reading_slip")}</span>}
      </div>
    </div>
  );
}

async function readSlip(url) {
  try {
    const r = await api.post("/weighments/read-slip", { photo_url: url });
    return r && r.success ? { ok: true, ...r.data } : { ok: false, message: r?.message };
  } catch (e) { return { ok: false, message: e.message }; }
}

const Thumbs = ({ list }) => {
  const ph = list.filter(([u]) => !!u);
  if (!ph.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
      {ph.map(([u, cap]) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" title={cap}
          style={{ display: "block", width: 46, height: 46, borderRadius: 6, overflow: "hidden", border: "1px solid " + T.b1 }}>
          <img src={cld(u, "thumb")} alt={cap} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </a>
      ))}
    </div>
  );
};

export default function WeighbridgePanel({ dest, onChanged }) {
  const [trips, setTrips] = useState([]);
  // Company ki weighbridge settings (Settings → "Weighbridge (Kaanta)") —
  // GET /weighments list ke saath aati hain. Purana server na bheje to default.
  const [settings, setSettings] = useState({ challan_qty: "optional", stale_tare_hours: STALE_H });
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pol, setPol] = useState(null);
  const [newMode, setNewMode] = useState(null);     // null | "gross" | "tare"
  const [secondFor, setSecondFor] = useState(null); // trip id jiska doosra wazan bhar rahe hain
  const [result, setResult] = useState(null);       // doosre wazan ke baad ka nateeja
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [nf, setNf] = useState(blankNew);
  const [sf, setSf] = useState(blankSecond);
  const setN = (p) => setNf(f => ({ ...f, ...p }));
  const setS = (p) => setSf(f => ({ ...f, ...p }));
  // Cancel sirf wajah ke saath (24 Sep 2026) — tolai cancel karna chori
  // chhupane ka sabse aasaan raasta hai. Cancel hui entry neeche log me.
  const [cancelFor, setCancelFor] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelErr, setCancelErr] = useState("");
  const [cancelled, setCancelled] = useState([]);
  const [showCancelled, setShowCancelled] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [all, ls, pl, gone] = await Promise.all([
      api.get(`/weighments?status=all&${destParam(dest)}`).catch(() => null),
      loadOrderedLines(dest), loadPoLines(dest), loadWeighments(dest, "cancelled")]);
    const tr = all && all.success ? (all.data || []) : [];
    if (all && all.settings) setSettings(s => ({ ...s, ...all.settings }));
    // Purana server ?status=cancelled nahi jaanta aur sab entry lauta deta hai —
    // deploy ke beech bhi log me sirf sach me cancel hui entry aaye.
    setCancelled(gone.filter(w => w.status === "Cancelled"));
    // PO ki jo line kisi dikh rahi MR se bani hai, wo MR ki row hi hai — dobara
    // nahi. Do taraf se dekhte hain, kyunki koi bhi ek jod chhoot sakti hai:
    // (1) line ka apna linked_mr_id, (2) MR ka linked_po_id + wahi naam. 23 Sep
    // 2026 ko live par PO-2 ki line par link NULL tha aur wahi "gitti" do baar
    // dikh rahi thi (MR-8 aur PO-2).
    const nameKey = (s) => String(s || "").trim().toLowerCase();
    const mrIds = new Set(ls.filter((l) => l.kind === "mr").map((l) => l.mrId));
    const mrPo = new Set(ls.filter((l) => l.kind === "mr" && l.linkedPoId).map((l) => l.linkedPoId + "|" + nameKey(l.material)));
    setTrips(tr);
    setLines([...ls, ...pl.filter((l) => !(l.linkedMrId && mrIds.has(l.linkedMrId)) && !mrPo.has(l.poId + "|" + nameKey(l.material)))]);
    setLoading(false);
  };
  // "Doosra material" ka naam library se — haath se type kiya naam stock
  // aur rate dono jagah alag item ban jaata tha.
  const [lib, setLib] = useState([]);
  useEffect(() => { reload(); loadPhotoPolicy().then(setPol); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dest?.type, dest?.projectId, dest?.warehouseId]);
  useEffect(() => { api.get("/library/materials").then(r => { if (r?.success) setLib(r.data || []); }).catch(() => {}); }, []);
  const libUnit = (name) => {
    const f = (lib || []).find(m => (m.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase());
    return f && f.unit ? f.unit : null;
  };

  const photoMissing = (key, url) => policyFor(pol, key).mode === "required" && !url;
  // "Challan par likha" qty (2 Oct 2026, company setting): Band = khaana hi
  // nahi (net barabar baanta jaata hai, Short % nahi), Marzi = aaj jaisa, Zaroori =
  // har material par qty bina Save nahi (server bhi rokta hai).
  const cqOff = settings.challan_qty === "off";
  const cqReq = settings.challan_qty === "required";
  const staleH = Number(settings.stale_tare_hours) > 0 ? Number(settings.stale_tare_hours) : STALE_H;
  const noQtyMsg = (payloadLines) => {
    const miss = cqReq ? payloadLines.find(l => !(Number(l.challan_qty) > 0)) : null;
    return miss ? t("weigh.need_challan_qty", { material: miss.material_name }) : null;
  };

  // Order chuna hai to vendor usi order ka — gadi usi ne bheji hai. Badalne
  // par GRN kisi aur party ke khaate me chala jaata (server bhi rokta hai).
  const lockedVendorOf = (st) => (lines.find(l => st.picked[l.key] && l.vendor) || {}).vendor || "";
  const payloadLinesOf = (st) => [
    ...lines.filter(l => st.picked[l.key]).map(l => ({
      mr_id: l.kind === "mr" ? l.mrId : null,
      po_item_id: l.kind === "po" ? l.poItemId : null,
      wh_mr_id: l.kind === "wh" ? l.whMrId : null,
      wh_mr_item_id: l.kind === "wh" ? l.whMrItemId : null,
      material_name: l.material, order_unit: l.unit,
      challan_qty: cqOff ? null : (st.picked[l.key]?.challanQty || null),
      challan_unit: cqOff ? null : (st.picked[l.key]?.challanUnit || l.unit || null),
    })),
    ...st.free.map(x => ({ material_name: x.name, order_unit: x.unit, challan_qty: cqOff ? null : (x.qty || null) })),
  ];
  // Ek material + ek vendor ke order, kram me: jisme baaki hai wo pehle, phir
  // sabse purana (MR/godown MR pehle, phir PO). Pehla = apne aap juda hua order.
  const ordOf = (l) => Number(l.kind === "mr" ? l.mrId : l.kind === "po" ? l.poItemId : l.whMrItemId) || 0;
  const lineOrder = (a, b) => ((a.kind === "po") === (b.kind === "po") ? ordOf(a) - ordOf(b) : a.kind === "po" ? 1 : -1);
  const candidates = (matKey, vendor, exceptKey) => lines
    .filter(l => nameKeyOf(l.material) === matKey && nameKeyOf(l.vendor) === nameKeyOf(vendor) && l.key !== exceptKey)
    .sort((a, b) => (Number(b.pending > 0) - Number(a.pending > 0)) || lineOrder(a, b));

  // Challan ki qty aur kaante ka wazan do alag cheezein hain — aadmi kaante ka
  // wazan challan wale khaane me daal de to yahin pakdo (28 Sep 2026).
  const challanKgOf = (st) => {
    if (cqOff) return null;   // Band: challan ki qty li hi nahi jaati
    let sum = 0, any = false;
    for (const key of Object.keys(st.picked)) {
      const p = st.picked[key]; const k = kgPerUnit(p.challanUnit); const q = Number(p.challanQty);
      if (k && q > 0) { sum += q * k; any = true; }
    }
    for (const x of st.free) { const k = kgPerUnit(x.unit); const q = Number(x.qty); if (k && q > 0) { sum += q * k; any = true; } }
    return any ? sum : null;
  };
  const challanWarn = (st, grossKg) => {
    const c = challanKgOf(st); const g = Number(grossKg);
    if (c == null || !(g > 0) || c < g) return null;
    return t("weigh.challan_over_gross", { challan: fmtKg(c), gross: fmtKg(g) });
  };
  const blockH = (title, hint) => (
    <div style={{ margin: "2px 0 7px" }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: T.blu }}>{title}</div>
      {hint && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
  const warnBox = (msg) => msg ? (
    <div style={{ margin: "6px 0 8px", padding: "7px 10px", borderRadius: 6, background: T.redL, border: "1px solid " + T.redM, color: T.red, fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>⚠ {msg}</div>
  ) : null;
  const chip = (color) => ({ padding: "5px 10px", borderRadius: 14, border: "1.5px solid " + (color || T.b1), background: T.surface, color: color || T.t1, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left" });
  const linkBtn = { border: "none", background: "none", color: T.blu, fontWeight: 700, fontSize: 10.5, cursor: "pointer", padding: 0, fontFamily: "inherit" };

  // ── Pehla wazan ────────────────────────────────────────────────
  const openNew = (mode) => { setNewMode(mode); setNf(blankNew); setResult(null); setSecondFor(null); setCancelFor(null); };
  const onFirstSlip = async (url) => {
    setReading(true); setN({ readMsg: "" });
    const out = await readSlip(url);
    setReading(false);
    if (!out.ok) { setN({ readMsg: out.message || t("weigh.slip_unread") }); return; }
    const r = out.read || {};
    setNf(f => ({
      ...f, read: r, readMsg: t("weigh.read_ok"),
      kg: f.kg || (newMode === "tare"
        ? (r.tare_kg != null ? String(r.tare_kg) : "")
        : (r.gross_kg != null ? String(r.gross_kg) : "")),
      slipNo: f.slipNo || r.slip_no || "",
      vehicle: f.vehicle || r.vehicle_no || "",
      bridge: f.bridge || r.weighbridge_name || "",
      vendor: f.vendor || r.party || "",
    }));
  };

  const saveNew = async () => {
    const isG = newMode === "gross";
    const payloadLines = isG ? payloadLinesOf(nf) : [];
    if (isG && !payloadLines.length) { alert(t("weigh.need_material")); return; }
    const qtyMsg = noQtyMsg(payloadLines);
    if (qtyMsg) { alert(qtyMsg); return; }
    if (!(Number(nf.kg) > 0)) { alert(t(isG ? "weigh.need_gross" : "weigh.need_tare")); return; }
    // Khali gadi ki pehchaan sirf number hai — bina number bhari gadi is
    // entry se kabhi nahi milegi.
    if (!isG && !nf.vehicle.trim()) { alert(t("weigh.vehicle_required")); return; }
    if (photoMissing("weigh_slip", nf.slipUrl)) { alert(t("weigh.photo_required", { label: t("weigh.slip_photo") })); return; }
    if (photoMissing("weigh_vehicle", nf.vehUrl)) { alert(t("weigh.photo_required", { label: t("weigh.vehicle_photo") })); return; }
    setBusy(true);
    const lockedVendor = lockedVendorOf(nf);
    const body = {
      ...(dest.type === "warehouse" ? { warehouse_id: dest.warehouseId } : { project_id: dest.projectId }),
      vehicle_no: nf.vehicle || null, weighbridge_name: nf.bridge || null,
      ...(isG
        ? { gross_kg: Number(nf.kg), gross_slip_no: nf.slipNo || null, gross_slip_url: nf.slipUrl || null,
            vendor_name: lockedVendor || nf.vendor || null, challan_no: nf.challan || null, lines: payloadLines }
        : { tare_kg: Number(nf.kg), tare_slip_no: nf.slipNo || null, tare_slip_url: nf.slipUrl || null, lines: [] }),
      vehicle_photo_url: nf.vehUrl || null,
      slip_read: nf.read || null,
    };
    const r = await api.post("/weighments", body).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    setNf(blankNew); setNewMode(null);
    await reload(); onChanged && onChanged();
  };

  // ── Doosra wazan ───────────────────────────────────────────────
  const secondTrip = trips.find(w => w.id === secondFor);
  // Khali pehle tuli thi to doosra wazan BHARA hai; bhari pehle to KHALI.
  const needGross = !!secondTrip && secondTrip.gross_kg == null;
  const netPreview = secondTrip && Number(sf.kg) > 0
    ? (needGross ? Number(sf.kg) - Number(secondTrip.tare_kg) : Number(secondTrip.gross_kg) - Number(sf.kg))
    : null;
  const openSecond = (id) => { setSecondFor(id); setSf(blankSecond); setResult(null); setNewMode(null); setCancelFor(null); };

  const onSecondSlip = async (url) => {
    setReading(true); setS({ readMsg: "" });
    const out = await readSlip(url);
    setReading(false);
    if (!out.ok) { setS({ readMsg: out.message || t("weigh.slip_unread") }); return; }
    const r = out.read || {};
    const kg = needGross ? (r.gross_kg ?? r.tare_kg) : (r.tare_kg ?? r.gross_kg);
    setSf(f => ({ ...f, read: r, readMsg: t("weigh.read_ok"),
      kg: f.kg || (kg != null ? String(kg) : ""),
      slipNo: f.slipNo || r.slip_no || "" }));
  };

  const saveSecond = async () => {
    if (!secondTrip) return;
    const payloadLines = needGross ? payloadLinesOf(sf) : [];
    if (needGross && !(secondTrip.lines || []).length && !payloadLines.length) { alert(t("weigh.need_material")); return; }
    const qtyMsg = noQtyMsg(payloadLines);
    if (qtyMsg) { alert(qtyMsg); return; }
    if (!(Number(sf.kg) > 0)) { alert(t(needGross ? "weigh.need_gross" : "weigh.need_tare")); return; }
    if (!needGross && Number(sf.kg) >= Number(secondTrip.gross_kg)) { alert(t("weigh.tare_gt_gross")); return; }
    if (needGross && Number(sf.kg) <= Number(secondTrip.tare_kg)) { alert(t("weigh.tare_gt_gross")); return; }
    if (photoMissing("weigh_slip", sf.slipUrl)) { alert(t("weigh.photo_required", { label: t("weigh.slip_photo") })); return; }
    if (needGross && photoMissing("weigh_vehicle", sf.vehUrl)) { alert(t("weigh.photo_required", { label: t("weigh.vehicle_photo") })); return; }
    setBusy(true);
    const lockedVendor = lockedVendorOf(sf);
    const r = await api.post(`/weighments/${secondFor}/${needGross ? "gross" : "tare"}`, {
      ...(needGross
        ? { gross_kg: Number(sf.kg), gross_slip_no: sf.slipNo || null, gross_slip_url: sf.slipUrl || null,
            vehicle_photo_url: sf.vehUrl || null, lines: payloadLines,
            vendor_name: lockedVendor || sf.vendor || null, challan_no: sf.challan || null }
        : { tare_kg: Number(sf.kg), tare_slip_no: sf.slipNo || null, tare_slip_url: sf.slipUrl || null }),
      slip_read: sf.read || null,
    }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    setResult({ tripId: secondFor, ...r.data, issued: {} });
    setSecondFor(null); setSf(blankSecond);
    await reload(); onChanged && onChanged();
  };

  const shortIssue = async (tripId, lineId) => {
    const r = await api.post(`/weighments/${tripId}/short-issue`, { line_id: lineId }).catch(e => ({ success: false, message: e.message }));
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    setResult(x => x ? { ...x, issued: { ...x.issued, [lineId]: true } } : x);
    reload();
    onChanged && onChanged();
  };

  const openCancel = (id) => { setCancelFor(id); setCancelReason(""); setCancelErr(""); setSecondFor(null); setNewMode(null); };
  const pickReason = (v) => { setCancelReason(v); setCancelErr(""); };
  const doCancel = async () => {
    const reason = cancelReason.trim();
    if (reason.length < 3) { setCancelErr(t("weigh.cancel_reason_required")); return; }
    setBusy(true); setCancelErr("");
    const kind = (CANCEL_CHIPS.find(c => t(c.k) === reason) || {}).kind || "wrong_entry";
    const r = await api.post(`/weighments/${cancelFor}/cancel`, { reason, kind }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setCancelErr(r?.message || t("common.something_went_wrong")); return; }
    setCancelFor(null); setCancelReason("");
    await reload(); onChanged && onChanged();
  };
  // Cancel ka box — card ke button ki jagah khulta hai. Wajah ke bina aage nahi.
  const cancelBox = () => (
    <div style={{ marginTop: 8, padding: "9px 11px", borderRadius: 7, background: T.redL, border: "1px solid " + T.redM }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 6 }}>{t("weigh.cancel_why")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 7 }}>
        {CANCEL_REASONS.map(k => {
          const on = cancelReason === t(k);
          return (
            <button key={k} type="button" onClick={() => pickReason(t(k))}
              style={{ padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                border: "1px solid " + (on ? T.red : T.b1), background: T.surface, color: on ? T.red : T.t2 }}>{t(k)}</button>
          );
        })}
      </div>
      <input value={cancelReason} onChange={e => pickReason(e.target.value)} placeholder={t("weigh.cancel_reason_ph")} style={{ ...inp, marginBottom: 7 }} />
      {cancelErr && <div style={{ fontSize: 11.5, color: T.red, fontWeight: 600, marginBottom: 7 }}>{cancelErr}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => { setCancelFor(null); setCancelReason(""); setCancelErr(""); }} style={btn(T.surface, T.t3, T.b1)}>{t("weigh.cancel_back")}</button>
        <button type="button" onClick={doCancel} disabled={busy} style={btn(busy ? "#9CA3AF" : T.red, "#fff")}>{busy ? t("common.saving") : t("weigh.cancel_do")}</button>
      </div>
    </div>
  );

  const flagText = (f) => f.type === "dup_slip" ? t("weigh.flag_dup_slip")
    : f.type === "slip_mismatch" ? t("weigh.flag_mismatch")
    : f.type === "open_trip" ? t("weigh.flag_open_trip", { what: f.same === "challan" ? t("weigh.challan_no") : t("weigh.vehicle_no") })
    : f.type === "stale_tare" ? t("weigh.flag_stale_tare", { h: f.hours })
    // App ke photo-pehle form (29 Sep 2026) se aane wale nishaan — office ko bhi dikhein.
    : f.type === "stored_tare" ? t("weigh.flag_stored_tare", { slip: f.slip_tare_kg != null ? f.slip_tare_kg : "—", ours: f.our_tare_kg != null ? f.our_tare_kg : "—" })
    : f.type === "plate_mismatch" ? t("weigh.flag_plate_mismatch", { plate: f.plate || "—", vehicle: f.vehicle_no || "—" })
    // Site ki rec slip (app ka gadi-wise GRN, 29 Sep 2026) — wahi number doosri gadi par.
    : f.type === "dup_rec_slip" ? t("weigh.flag_dup_rec_slip", { no: f.rec_slip_no || "—", grn: f.other_grn || "—" })
    : f.type === "short" ? t("weigh.flag_short")
    // AI kabhi nahi rokta (9 Oct 2026) — jo pehle rok tha ya sirf app par dikhta
    // tha, ab nishaan hai, aur GRN par "Weighbridge" issue ban kar bill tak jaata hai.
    : f.type === "plate_missing" ? t("weigh.flag_plate_missing")
    : f.type === "vehicle_changed" ? t("weigh.flag_vehicle_changed", { from: f.from || "—", to: f.to || "—" })
    : f.type === "ai_edited" ? t("weigh.flag_ai_edited", { list: aiItems(f) })
    : f.type === "site_plate_missing" ? t("weigh.flag_site_plate_missing")
    : f.type === "site_plate_differs" ? t("weigh.flag_site_plate_differs", { plate: f.plate || "—", vehicle: f.vehicle_no || "—" })
    : f.type === "rec_wrong_paper" ? t("weigh.flag_rec_wrong_paper", { paper: t(f.paper === "challan" ? "weigh.flag_paper_challan" : "weigh.flag_paper_kaanta"), no: f.no || "—" })
    : f.type === "rec_vehicle_differs" ? t("weigh.flag_rec_vehicle_differs", { vehicle: f.vehicle_no || "—" })
    : null;
  // ai_edited ki har line: "Vehicle no.: CG04AB1234 → CG04AB1284"
  const AI_FIELD = { vehicle_no: "weigh.flag_f_vehicle_no", slip_no: "weigh.flag_f_slip_no", challan_no: "weigh.flag_f_challan_no", challan_qty: "weigh.flag_f_challan_qty", rec_slip_no: "weigh.flag_f_rec_slip_no" };
  const aiItems = (f) => (Array.isArray(f.items) ? f.items : []).map(it => t("weigh.flag_ai_item", {
    what: AI_FIELD[it.field] ? t(AI_FIELD[it.field], { material: it.material || "—" }) : it.field,
    read: (it.read ?? "—") + (it.read_unit ? " " + it.read_unit : ""),
    saved: (it.saved ?? "—") + (it.saved != null && it.saved_unit ? " " + it.saved_unit : ""),
  })).join("; ");

  const tripHead = (w) => {
    const [c, bg, k] = STATUS[w.status] || STATUS.InTransit;
    const flags = (Array.isArray(w.flags) ? w.flags : []).map(flagText).filter(Boolean);
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontFamily: "monospace" }}>{w.vehicle_no || "—"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, background: bg, padding: "1px 8px", borderRadius: 10 }}>{t(k)}</span>
          {w.vendor_name && <span style={{ fontSize: 11, color: T.t3 }}>{w.vendor_name}</span>}
        </div>
        {(w.lines || []).length > 0 && (
          <div style={{ fontSize: 11, color: T.t2, marginTop: 3 }}>
            {(w.lines || []).map(l => l.material_name + (l.challan_qty ? ` (${Number(l.challan_qty)} ${l.challan_unit || l.order_unit || ""})` : "")).join(" · ")}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>
          {w.gross_kg != null && <>{t("weigh.gross_short")} {fmtKg(w.gross_kg)}</>}
          {w.tare_kg != null && <>{w.gross_kg != null ? " · " : ""}{t("weigh.tare_short")} {fmtKg(w.tare_kg)}</>}
          {w.net_kg != null && <> · {t("weigh.net_short")} <b style={{ color: T.grn }}>{fmtKg(w.net_kg)}</b></>}
          {w.rst_no
            ? <> · {t("weigh.rst_no")} {w.rst_no}</>
            : (w.gross_slip_no || w.tare_slip_no) && <> · {t("weigh.slip_no_short")} {w.gross_slip_no || w.tare_slip_no}</>}
          {w.challan_no && <> · {t("weigh.challan_no")} {w.challan_no}</>}
          {w.driver_name && <> · {t("weigh.driver")}: {w.driver_name}</>}
          {w.pending_unload && w.open_hours > 0 && <> · <span style={{ color: T.amb, fontWeight: 600 }}>{t("weigh.open_since", { h: w.open_hours })}</span></>}
        </div>
        {flags.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
            {flags.map((f, i) => <span key={i} style={{ fontSize: 9.5, fontWeight: 700, color: T.red, background: T.redL, border: "1px solid " + T.redM, padding: "1px 7px", borderRadius: 8 }}>⚠ {f}</span>)}
          </div>
        )}
      </>
    );
  };

  // Khali tul chuki gadi ka poora byora — bhar kar aane par isi se milaana
  // hai: kab tuli, kisne toli, slip, photo. Ye entry ab badalti nahi.
  const tareSummary = (w, withPhotos) => {
    const stale = hoursSince(w.tare_at) > staleH;
    return (
      <div style={{ marginTop: 7, padding: "8px 10px", borderRadius: 7, background: stale ? T.ambL : T.surfaceB, border: "1px solid " + (stale ? T.ambM : T.b1) }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>
          {t("weigh.tare_summary", { kg: fmtKg(w.tare_kg), when: fmtWhen(w.tare_at) })}
          <span style={{ fontWeight: 500, color: stale ? T.amb : T.t3 }}> · {agoText(w.tare_at)}</span>
        </div>
        <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>
          {w.tare_slip_no ? t("weigh.slip_no_short") + " " + w.tare_slip_no : ""}
          {w.tare_slip_no && w.tare_by_name ? " · " : ""}
          {w.tare_by_name ? t("weigh.weighed_by", { name: w.tare_by_name }) : ""}
          {w.weighbridge_name ? " · " + w.weighbridge_name : ""}
        </div>
        {stale && <div style={{ fontSize: 10.5, color: T.amb, fontWeight: 600, marginTop: 3 }}>⚠ {t("weigh.stale_tare_note", { h: Math.round(hoursSince(w.tare_at)) })}</div>}
        {withPhotos && <Thumbs list={[[w.tare_slip_url, t("weigh.empty_slip")], [w.vehicle_photo_url, t("weigh.vehicle_photo")]]} />}
      </div>
    );
  };

  // ── Material picker (28 Sep 2026) ───────────────────────────────
  // Pehle har order ki line ek checkbox thi — ek material ke 7 order, sab ek
  // vendor ke, list lambi aur vendor chhota sa. Ab: MATERIAL chuno → (ek se
  // zyada vendor ho to) VENDOR chuno → order apne aap jud jaata hai (sabse
  // purana jisme baaki hai), "badlo" se doosra. Vendor tay hote hi aage sirf
  // usi vendor ka material dikhta hai — ek gadi me ek hi vendor ka maal.
  // Pehle wazan (nf) aur doosre wazan (sf) dono me wahi.
  const picker = (st, upd) => {
    const setPick = (key, p) => upd({ picked: { ...st.picked, [key]: { ...st.picked[key], ...p } } });
    const locked = lockedVendorOf(st);
    const pickedKeys = Object.keys(st.picked);
    // Tick karte hi order ki poori pending qty bhar dena galat tha (23 Sep
    // 2026): 2 gadi ka order ho aur 1 gadi aaye to entry usi 1 gadi ki hai.
    const addLine = (l) => upd({ picked: { ...st.picked, [l.key]: { challanQty: "", challanUnit: l.unit || "Ton" } }, pm: null, adding: false, swapFor: null });
    const swapLine = (fromKey, l) => {
      const p = { ...st.picked }; const old = p[fromKey] || {}; delete p[fromKey];
      const unitOk = challanUnits(l.unit).includes(old.challanUnit);
      p[l.key] = { challanQty: old.challanQty || "", challanUnit: unitOk ? old.challanUnit : (l.unit || "Ton") };
      upd({ picked: p, swapFor: null });
    };
    const removeLine = (key) => { const p = { ...st.picked }; delete p[key]; upd({ picked: p, swapFor: null }); };
    const avail = lines.filter(l => !st.picked[l.key] && (!locked || nameKeyOf(l.vendor) === nameKeyOf(locked)));
    const mats = [];
    for (const l of avail) {
      const k = nameKeyOf(l.material);
      let m = mats.find(x => x.k === k);
      if (!m) { m = { k, name: l.material, n: 0, vendors: [] }; mats.push(m); }
      m.n++;
      if (!m.vendors.some(v => nameKeyOf(v) === nameKeyOf(l.vendor))) m.vendors.push(l.vendor || "");
    }
    const chooseMat = (m) => {
      if (m.vendors.length <= 1) { const c = candidates(m.k, m.vendors[0] || "", null).filter(l => !st.picked[l.key]); if (c.length) addLine(c[0]); return; }
      upd({ pm: m.k });
    };
    const chooseVendor = (mk, v) => { const c = candidates(mk, v, null).filter(l => !st.picked[l.key]); if (c.length) addLine(c[0]); };
    const vendorSub = (mk, v) => {
      const ls = candidates(mk, v, null).filter(l => !st.picked[l.key]);
      const units = [...new Set(ls.map(l => l.unit))];
      const sum = Math.round(ls.reduce((a, l) => a + Number(l.pending || 0), 0) * 1000) / 1000;
      return t("weigh.n_orders", { n: ls.length }) + (units.length === 1 && sum > 0 ? " · " + t("weigh.pending_sum", { qty: sum, unit: units[0] }) : "");
    };
    const adding = st.adding || (!pickedKeys.length && !st.free.length);
    const pmMat = st.pm && st.pm !== "__free__" ? mats.find(x => x.k === st.pm) : null;

    return (
      <>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, marginBottom: 5 }}>{t("weigh.which_material")}</div>

        {/* Chune hue material — har ek par uska order, aur challan ki qty */}
        {pickedKeys.map(key => {
          const l = lines.find(x => x.key === key);
          if (!l) return null;
          const p = st.picked[key] || {};
          const alts = candidates(nameKeyOf(l.material), l.vendor, key).filter(x => !st.picked[x.key]);
          return (
            <div key={key} style={{ border: "1px solid " + T.bluM, background: T.bluL, borderRadius: 7, padding: "7px 10px", marginBottom: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 20px", gap: 8, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>✓ {l.material} <span style={{ fontWeight: 500, color: T.t3 }}>· {l.vendor || t("weigh.no_vendor")}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, fontSize: 10.5, color: T.t3, flexWrap: "wrap" }}>
                    <span>{t("weigh.order_line", { label: l.label, qty: l.pending, unit: l.unit })}</span>
                    {alts.length > 0 && (
                      <button type="button" onClick={() => upd({ swapFor: st.swapFor === key ? null : key })} style={linkBtn}>{t("weigh.change_order")} ▾</button>
                    )}
                  </div>
                </div>
                {cqOff ? <span /> : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: T.t3, whiteSpace: "nowrap" }}>{t("weigh.challan_written")}{cqReq ? " *" : ""}</span>
                    <input type="number" value={p.challanQty || ""} placeholder="0"
                      onChange={e => setPick(key, { challanQty: e.target.value })}
                      style={{ ...inp, width: 80, padding: "5px 7px", fontSize: 11.5 }} />
                    <PickSelect value={p.challanUnit || l.unit || "Ton"}
                      onChange={e => setPick(key, { challanUnit: e.target.value })}
                      style={{ ...inp, padding: "5px 4px", fontSize: 11, width: 66 }}>
                      {challanUnits(l.unit).map(u => <option key={u} value={u}>{u}</option>)}
                    </PickSelect>
                  </div>
                )}
                <button type="button" onClick={() => removeLine(key)} style={{ border: "none", background: "none", color: T.red, fontSize: 16, lineHeight: 1, cursor: "pointer", padding: 0 }}>×</button>
              </div>
              {st.swapFor === key && alts.length > 0 && (
                <div style={{ marginTop: 5, border: "1px solid " + T.b1, borderRadius: 6, background: T.surface, overflow: "hidden" }}>
                  <div style={{ fontSize: 10, color: T.t4, padding: "4px 8px", borderBottom: "1px solid " + T.b1 }}>{t("weigh.change_order_title")}</div>
                  {alts.map(a => (
                    <div key={a.key} onClick={() => swapLine(key, a)} style={{ padding: "5px 8px", fontSize: 11.5, color: T.t1, borderBottom: "1px solid " + T.surfaceB, cursor: "pointer" }}>
                      <b>{a.label}</b> · {t("weigh.pending_qty", { qty: a.pending, unit: a.unit })}
                    </div>
                  ))}
                </div>
              )}
              {!cqOff && kgPerUnit(p.challanUnit) && !kgPerUnit(l.unit) && (
                <div style={{ fontSize: 10, color: T.t4, marginTop: 3 }}>{t("weigh.unit_note", { unit: l.unit })}</div>
              )}
            </div>
          );
        })}

        {/* Bina order ka material */}
        {st.free.map((x, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid " + T.ambM, background: T.ambL, borderRadius: 7, padding: "6px 10px", marginBottom: 6, fontSize: 11.5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>✓ {x.name}</b> <span style={{ color: T.t3 }}>· {t("weigh.free_material")}{cqOff ? "" : ` · ${t("weigh.challan_written")}: ${x.qty ? `${x.qty} ${x.unit}` : "—"}`}</span>
            </div>
            <button type="button" onClick={() => upd({ free: st.free.filter((_, j) => j !== i) })}
              style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}

        {/* Adder: material → (vendor) → order apne aap */}
        {adding ? (
          <div style={{ border: "1.5px dashed " + T.b2, borderRadius: 7, padding: "8px 10px", marginBottom: 8, background: T.surface }}>
            {st.pm == null ? (
              <>
                <div style={{ fontSize: 10.5, color: T.t4, marginBottom: 6, lineHeight: 1.4 }}>
                  {locked ? t("weigh.pick_material_locked", { vendor: locked }) : t("weigh.pick_material_hint")}
                </div>
                {mats.length === 0 && <div style={{ fontSize: 11, color: T.t4, marginBottom: 6 }}>{locked ? t("weigh.no_more_for_vendor") : t("weigh.no_ordered")}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {mats.map(m => (
                    <button key={m.k} type="button" onClick={() => chooseMat(m)} style={chip()}>
                      {m.name}
                      <span style={{ fontWeight: 500, color: T.t4 }}> · {t("weigh.n_orders", { n: m.n })}{m.vendors.length > 1 ? " · " + t("weigh.n_vendors", { n: m.vendors.length }) : ""}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => upd({ pm: "__free__" })} style={chip(T.amb)}>{t("weigh.free_chip")}</button>
                </div>
                {(pickedKeys.length > 0 || st.free.length > 0) && (
                  <button type="button" onClick={() => upd({ adding: false, pm: null })} style={{ ...linkBtn, color: T.t3, marginTop: 7 }}>{t("weigh.cancel_back")}</button>
                )}
              </>
            ) : st.pm === "__free__" ? (
              <div style={{ display: "grid", gridTemplateColumns: cqOff ? "1fr 80px auto auto" : "1fr 80px 80px auto auto", gap: 6, alignItems: "end" }}>
                {/* Naam material library se — unit uske saath apne aap. */}
                <div>
                  <label style={lbl}>{t("weigh.free_material")}</label>
                  <input list="weigh-lib-mats" value={st.freeName}
                    onChange={e => { const v = e.target.value; upd({ freeName: v, freeUnit: libUnit(v) || st.freeUnit }); }}
                    placeholder={t("weigh.free_material_ph")} style={inp} />
                  <datalist id="weigh-lib-mats">
                    {(lib || []).map(m => <option key={m.id || m.name} value={m.name} />)}
                  </datalist>
                </div>
                {/* Band me qty ka khaana nahi — unit wahi rehti hai, wo material ki apni unit hai. */}
                {!cqOff && (
                  <div>
                    <label style={lbl}>{t("weigh.challan_written")}{cqReq ? " *" : ""}</label>
                    <input type="number" value={st.freeQty || ""} onChange={e => upd({ freeQty: e.target.value })} style={inp} />
                  </div>
                )}
                <div>
                  <label style={lbl}>{t("common.unit")}</label>
                  <PickSelect value={st.freeUnit} onChange={e => upd({ freeUnit: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                    {[...new Set([...(libUnit(st.freeName) ? [libUnit(st.freeName)] : []), ...FREE_UNITS])].map(u => <option key={u}>{u}</option>)}
                  </PickSelect>
                </div>
                <button type="button" onClick={() => upd({ pm: null })} style={{ ...btn(T.surface, T.t3, T.b1), height: 33 }}>{t("weigh.cancel_back")}</button>
                {/* Zaroori me qty ke bina jodna hi nahi — jud jaane ke baad qty badalne ka khaana nahi hai. */}
                <button type="button" disabled={!st.freeName.trim() || (cqReq && !(Number(st.freeQty) > 0))}
                  onClick={() => upd({ free: [...st.free, { name: st.freeName.trim(), unit: st.freeUnit, qty: cqOff ? "" : (st.freeQty || "") }], freeName: "", freeQty: "", pm: null, adding: false })}
                  style={{ ...btn(T.blu, "#fff"), height: 33, opacity: st.freeName.trim() && !(cqReq && !(Number(st.freeQty) > 0)) ? 1 : 0.5 }}>{t("weigh.add_free")}</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{pmMat ? pmMat.name : ""} <span style={{ fontWeight: 500, color: T.t4, fontSize: 10.5 }}>— {t("weigh.pick_vendor")}</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {(pmMat ? pmMat.vendors : []).map(v => (
                    <button key={v || "-"} type="button" onClick={() => chooseVendor(st.pm, v)} style={chip()}>
                      {v || t("weigh.no_vendor")}
                      <span style={{ fontWeight: 500, color: T.t4 }}> · {vendorSub(st.pm, v)}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => upd({ pm: null })} style={{ ...linkBtn, color: T.t3, marginTop: 7 }}>{t("weigh.cancel_back")}</button>
              </>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => upd({ adding: true, pm: null, swapFor: null })}
            style={{ padding: "6px 12px", borderRadius: 7, border: "1.5px dashed " + T.bluM, background: T.surface, color: T.blu, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
            {t("weigh.add_more")}
          </button>
        )}
      </>
    );
  };

  const vendorField = (st, upd) => {
    const locked = lockedVendorOf(st);
    return (
      <div><label style={lbl}>{t("weigh.vendor")}</label>
        <input value={locked || st.vendor} readOnly={!!locked}
          onChange={e => upd({ vendor: e.target.value })}
          title={locked ? t("weigh.vendor_locked") : ""}
          style={{ ...inp, ...(locked ? { background: T.surfaceB, color: T.t3 } : null) }} />
        {locked && <div style={{ fontSize: 9.5, color: T.t4, marginTop: 2 }}>🔒 {t("weigh.vendor_locked")}</div>}</div>
    );
  };

  if (loading) return <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("common.loading")}</div>;

  const live = trips.filter(w => w.status !== "Cancelled");
  // Khali tul chuki, bhar kar aana baaki — pehchaan sirf gadi ka number.
  const toLoad = live.filter(w => w.gross_kg == null && w.status === "InTransit");
  // Bhari tul chuki (utri ya nahi), khali wazan baaki.
  const open = live.filter(w => w.gross_kg != null && (w.status === "InTransit" || w.status === "Received"));
  // Dono wazan ho chuke par maal site par utra nahi — challan aur gadi ka
  // peechha yahin khula rehta hai, jab tak GRN nahi hota.
  const waiting = live.filter(w => w.status === "Closed" && w.pending_unload);
  const closed = live.filter(w => w.status === "Closed" && !w.pending_unload).slice(0, 10);

  const secondForm = (w) => {
    const warn = needGross ? challanWarn(sf, sf.kg) : null;
    return (
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed " + T.b1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t(needGross ? "weigh.step_gross_title" : "weigh.step3_title")}</div>
        {needGross && (
          <>
            <div style={{ fontSize: 11, color: T.t3, margin: "4px 0 8px" }}>{t("weigh.same_vehicle_check")}</div>
            {blockH(t("weigh.block_challan"), cqOff ? null : t("weigh.block_challan_hint"))}
            {/* Purani (23 Sep wali) khali-pehle entry me material pehle se ho
                sakta hai — tab dobara chunna nahi, bas dikhao. */}
            {(w.lines || []).length
              ? <div style={{ fontSize: 11.5, color: T.t2, marginBottom: 8 }}>{(w.lines || []).map(l => l.material_name).join(" · ")}</div>
              : picker(sf, setS)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {!(w.lines || []).length && vendorField(sf, setS)}
              <div><label style={lbl}>{t("weigh.challan_no")}</label>
                <input value={sf.challan} onChange={e => setS({ challan: e.target.value })} style={inp} /></div>
            </div>
            {blockH(t("weigh.block_scale"), t("weigh.block_scale_hint"))}
          </>
        )}
        <div style={{ display: "grid", gridTemplateColumns: needGross ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 8 }}>
          <PhotoPick label={t(needGross ? "weigh.loaded_slip" : "weigh.empty_slip")} url={sf.slipUrl} onUrl={u => setS({ slipUrl: u })} onRead={onSecondSlip} reading={reading} />
          {needGross && <PhotoPick label={t("weigh.vehicle_photo")} url={sf.vehUrl} onUrl={u => setS({ vehUrl: u })} />}
        </div>
        {sf.readMsg && <div style={{ fontSize: 11, color: sf.read ? T.grn : T.amb, margin: "6px 0" }}>{sf.read ? "✓ " : "⚠ "}{sf.readMsg}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div><label style={lbl}>{t(needGross ? "weigh.scale_gross_kg" : "weigh.tare_kg")}</label>
            <input type="number" value={sf.kg} onChange={e => setS({ kg: e.target.value })} placeholder={needGross ? "18450" : "6150"} style={{ ...inp, fontWeight: 700, borderColor: T.bluM }} /></div>
          <div><label style={lbl}>{t("weigh.slip_no")}</label>
            <input value={sf.slipNo} onChange={e => setS({ slipNo: e.target.value })} style={inp} /></div>
        </div>
        {warnBox(warn)}
        {netPreview != null && (
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: netPreview > 0 ? T.grn : T.red }}>
            {t("weigh.net_preview", { net: fmtKg(netPreview) })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={() => { setSecondFor(null); setSf(blankSecond); }} style={btn(T.surface, T.t3, T.b1)}>{t("common.cancel")}</button>
          <button type="button" onClick={saveSecond} disabled={busy} style={btn(busy ? "#9CA3AF" : T.grn, "#fff")}>{busy ? t("common.saving") : t(needGross ? "weigh.save_loaded" : "weigh.save_tare")}</button>
        </div>
      </div>
    );
  };
  const newWarn = newMode === "gross" ? challanWarn(nf, nf.kg) : null;

  return (
    <div>
      <div style={{ background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 7, padding: "8px 11px", fontSize: 11.5, color: T.blu, marginBottom: 12, lineHeight: 1.5 }}>
        {t("weigh.intro")}
      </div>

      {/* ── Doosre wazan ka nateeja ───────────────────────── */}
      {result && (
        <div style={{ background: T.grnL, border: "1px solid " + T.grnM, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.grn }}>✓ {t("weigh.net_done", { net: fmtKg(result.net_kg) })}</div>
          {(result.short || []).map(s => {
            const cu = s.challan_unit || s.order_unit;
            const q = kgIn(s.net_kg, cu);
            return (
              <div key={s.line_id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: T.red, fontWeight: 700 }}>⚠ {t("weigh.short_line", { material: s.material_name, pct: s.short_pct })}</span>
                <span style={{ fontSize: 10.5, color: T.t3 }}>{t("weigh.short_detail", { challan: s.challan_qty, net: q.qty, unit: cu || q.unit })}</span>
                {s.grn_id
                  ? (result.issued[s.line_id]
                    ? <span style={{ fontSize: 10.5, color: T.grn, fontWeight: 700 }}>✓ {t("weigh.short_issue_done")}</span>
                    : <button type="button" onClick={() => shortIssue(result.tripId, s.line_id)} style={btn(T.red, "#fff")}>{t("weigh.make_short_issue")}</button>)
                  : <span style={{ fontSize: 10.5, color: T.t4 }}>{t("weigh.short_after_grn")}</span>}
              </div>
            );
          })}
          <button type="button" onClick={() => setResult(null)} style={{ ...btn(T.surface, T.t3, T.b1), marginTop: 8 }}>{t("common.close")}</button>
        </div>
      )}

      {/* ── Nayi entry: bhari gadi ya khali gadi ─────────────── */}
      {!newMode ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button type="button" onClick={() => openNew("gross")}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px dashed " + T.blu, background: T.bluL, color: T.blu, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            {t("weigh.new_loaded")}
            <div style={{ fontSize: 10.5, fontWeight: 500, color: T.t3, marginTop: 2 }}>{t("weigh.new_loaded_sub")}</div>
          </button>
          <button type="button" onClick={() => openNew("tare")}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px dashed " + T.amb, background: T.ambL, color: T.amb, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            {t("weigh.new_tare_first")}
            <div style={{ fontSize: 10.5, fontWeight: 500, color: T.t3, marginTop: 2 }}>{t("weigh.new_tare_first_sub")}</div>
          </button>
        </div>
      ) : newMode === "gross" ? (
        <div style={{ background: T.surface, border: "1.5px solid " + T.bluM, borderLeft: "3px solid " + T.blu, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 8 }}>{t("weigh.step1_title")}</div>
          {blockH(t("weigh.block_challan"), cqOff ? null : t("weigh.block_challan_hint"))}
          {picker(nf, setN)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {vendorField(nf, setN)}
            <div><label style={lbl}>{t("weigh.challan_no")}</label>
              <input value={nf.challan} onChange={e => setN({ challan: e.target.value })} style={inp} /></div>
          </div>
          {blockH(t("weigh.block_scale"), t("weigh.block_scale_hint"))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <PhotoPick label={t("weigh.slip_photo")} url={nf.slipUrl} onUrl={u => setN({ slipUrl: u })} onRead={onFirstSlip} reading={reading} />
            <PhotoPick label={t("weigh.vehicle_photo")} url={nf.vehUrl} onUrl={u => setN({ vehUrl: u })} />
          </div>
          {nf.readMsg && <div style={{ fontSize: 11, color: nf.read ? T.grn : T.amb, marginBottom: 8 }}>{nf.read ? "✓ " : "⚠ "}{nf.readMsg}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div><label style={lbl}>{t("weigh.scale_gross_kg")}</label>
              <input type="number" value={nf.kg} onChange={e => setN({ kg: e.target.value })} placeholder="18450" style={{ ...inp, fontWeight: 700, borderColor: T.bluM }} /></div>
            <div><label style={lbl}>{t("weigh.vehicle_no")}</label>
              <input value={nf.vehicle} onChange={e => setN({ vehicle: e.target.value.toUpperCase() })} placeholder={t("weigh.vehicle_no_ph")} style={inp} /></div>
            <div><label style={lbl}>{t("weigh.slip_no")}</label>
              <input value={nf.slipNo} onChange={e => setN({ slipNo: e.target.value })} style={inp} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>{t("weigh.weighbridge_name")}</label>
              <input value={nf.bridge} onChange={e => setN({ bridge: e.target.value })} style={inp} /></div>
          </div>
          {warnBox(newWarn)}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setNewMode(null); setNf(blankNew); }} style={btn(T.surface, T.t3, T.b1)}>{t("common.cancel")}</button>
            <button type="button" onClick={saveNew} disabled={busy} style={btn(busy ? "#9CA3AF" : T.grn, "#fff")}>{busy ? t("common.saving") : t("weigh.save_loaded")}</button>
          </div>
        </div>
      ) : (
        <div style={{ background: T.surface, border: "1.5px solid " + T.ambM, borderLeft: "3px solid " + T.amb, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 5 }}>{t("weigh.step1_tare_title")}</div>
          {/* Material abhi nahi — wo bhar kar aane par. Abhi bas gadi ki pehchaan. */}
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10, lineHeight: 1.5 }}>{t("weigh.tare_first_note")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <PhotoPick label={t("weigh.empty_slip")} url={nf.slipUrl} onUrl={u => setN({ slipUrl: u })} onRead={onFirstSlip} reading={reading} />
            <PhotoPick label={t("weigh.vehicle_photo")} url={nf.vehUrl} onUrl={u => setN({ vehUrl: u })} />
          </div>
          {nf.readMsg && <div style={{ fontSize: 11, color: nf.read ? T.grn : T.amb, marginBottom: 8 }}>{nf.read ? "✓ " : "⚠ "}{nf.readMsg}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div><label style={lbl}>{t("weigh.vehicle_no")} *</label>
              <input value={nf.vehicle} onChange={e => setN({ vehicle: e.target.value.toUpperCase() })} placeholder={t("weigh.vehicle_no_ph")} style={{ ...inp, fontWeight: 700, borderColor: T.ambM }} /></div>
            <div><label style={lbl}>{t("weigh.tare_kg")}</label>
              <input type="number" value={nf.kg} onChange={e => setN({ kg: e.target.value })} placeholder="6150" style={{ ...inp, fontWeight: 700, borderColor: T.ambM }} /></div>
            <div><label style={lbl}>{t("weigh.slip_no")}</label>
              <input value={nf.slipNo} onChange={e => setN({ slipNo: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>{t("weigh.weighbridge_name")}</label>
              <input value={nf.bridge} onChange={e => setN({ bridge: e.target.value })} style={inp} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setNewMode(null); setNf(blankNew); }} style={btn(T.surface, T.t3, T.b1)}>{t("common.cancel")}</button>
            <button type="button" onClick={saveNew} disabled={busy} style={btn(busy ? "#9CA3AF" : T.grn, "#fff")}>{busy ? t("common.saving") : t("weigh.save_tare")}</button>
          </div>
        </div>
      )}

      {/* ── Khali tul chuki — bhar kar aana baaki ─────────── */}
      {toLoad.length > 0 && (
        <>
          <div style={{ ...secH, marginTop: 0 }}>{t("weigh.to_load_title")} <span style={{ color: T.amb }}>({toLoad.length})</span></div>
          {toLoad.map(w => (
            <div key={w.id} style={{ background: T.surface, border: "1px solid " + T.b1, borderLeft: "3px solid " + T.amb, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.t1, fontFamily: "monospace" }}>{w.vehicle_no || "—"}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.amb, background: T.ambL, padding: "1px 8px", borderRadius: 10 }}>{t("weigh.gone_to_load")}</span>
              </div>
              {tareSummary(w, true)}
              {secondFor === w.id ? secondForm(w) : cancelFor === w.id ? cancelBox() : (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => openSecond(w.id)} style={btn(T.blu, "#fff")}>{t("weigh.loaded_arrived")}</button>
                  <button type="button" onClick={() => openCancel(w.id)} style={btn(T.surface, T.red, T.redM)}>{t("common.cancel")}</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── Raste me / utar gaye — empty weight baaki ───────── */}
      <div style={{ ...secH, marginTop: toLoad.length ? 14 : 0 }}>
        {t("weigh.open_title")} {open.length > 0 && <span style={{ color: T.amb }}>({open.length})</span>}
      </div>
      {open.length === 0 && <div style={{ fontSize: 11.5, color: T.t4, padding: "8px 0 14px" }}>{t("weigh.none_open")}</div>}
      {open.map(w => (
        <div key={w.id} style={{ background: T.surface, border: "1px solid " + T.b1, borderLeft: "3px solid " + T.amb, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
          {tripHead(w)}
          {secondFor === w.id ? secondForm(w) : cancelFor === w.id ? cancelBox() : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => openSecond(w.id)} style={btn(T.blu, "#fff")}>{t("weigh.weigh_empty")}</button>
              {!(w.lines || []).some(l => l.grn_item_id) && (
                <button type="button" onClick={() => openCancel(w.id)} style={btn(T.surface, T.red, T.redM)}>{t("common.cancel")}</button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ── Tuli gadi, site par abhi khali nahi hui ────────── */}
      {waiting.length > 0 && (
        <>
          <div style={secH}>
            {t("weigh.pending_unload_title")} <span style={{ color: T.amb }}>({waiting.length})</span>
          </div>
          {waiting.map(w => (
            <div key={w.id} style={{ background: T.surface, border: "1px solid " + T.b1, borderLeft: "3px solid " + T.amb, borderRadius: 8, padding: "9px 12px", marginBottom: 7 }}>
              {tripHead(w)}
              <div style={{ fontSize: 10.5, color: T.t3, marginTop: 5 }}>{t("weigh.pending_unload_hint")}</div>
            </div>
          ))}
        </>
      )}

      {/* ── Haal me band hue ──────────────────────────────── */}
      {closed.length > 0 && (
        <>
          <div style={secH}>{t("weigh.recent_closed")}</div>
          {closed.map(w => (
            <div key={w.id} style={{ background: T.surfaceB, border: "1px solid " + T.b1, borderRadius: 8, padding: "9px 12px", marginBottom: 7 }}>
              {tripHead(w)}
              {(w.lines || []).filter(l => l.is_short).map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>⚠ {t("weigh.short_line", { material: l.material_name, pct: l.short_pct })}</span>
                  {l.grn_id
                    ? <button type="button" onClick={() => shortIssue(w.id, l.id)} style={btn(T.surface, T.red, T.redM)}>{t("weigh.make_short_issue")}</button>
                    : <span style={{ fontSize: 10.5, color: T.t4 }}>{t("weigh.short_after_grn")}</span>}
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* ── Cancel hui entries — wajah, kisne, kab ─────────── */}
      {cancelled.length > 0 && (
        <>
          <button type="button" onClick={() => setShowCancelled(v => !v)}
            style={{ ...secH, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            {t("weigh.cancelled_title")} <span style={{ color: T.red }}>({cancelled.length})</span> <span>{showCancelled ? "▴" : "▾"}</span>
          </button>
          {showCancelled && cancelled.map(w => (
            <div key={w.id} style={{ background: T.surfaceB, border: "1px solid " + T.b1, borderLeft: "3px solid " + T.red, borderRadius: 8, padding: "9px 12px", marginBottom: 7 }}>
              {tripHead(w)}
              {w.cancel_kind && (
                <div style={{ marginTop: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                    background: w.cancel_kind === "returned" ? T.ambL : w.cancel_kind === "order_cancel" ? T.bluL : T.redL,
                    color: w.cancel_kind === "returned" ? T.amb : w.cancel_kind === "order_cancel" ? T.blu : T.red }}>
                    {t("weigh.kind_" + w.cancel_kind)}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 11, color: T.red, fontWeight: 600, marginTop: 5 }}>{t("weigh.cancelled_reason", { reason: w.cancel_reason || "—" })}</div>
              <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{t("weigh.cancelled_by", { name: w.cancelled_by_name || "—", when: fmtWhen(w.cancelled_at || w.updated_at) })}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
