// ── ⚖️ DHARAM KATA — gadi ki tolai (web) ─────────────────────────────
// Site aur godown dono ke GRN drawer ka ek tab. Teen kadam:
//   1. Loaded truck ka weight  — slip ki photo se gross, vehicle no. apne
//      aap bhar jaate hain (AI), aadmi check karke save karta hai
//   2. Site par utra           — wahi GRN; ordered row par ⚖️ chip aata hai
//   3. Empty truck ka weight   — tare → net = gross − tare → GRN ka billing
//      weight. Challan se kam aaya to "Short issue" ek tap me.
// Kram sakht nahi: slip baad me bhi daal sakte hain (aksar driver WhatsApp
// par bhejta hai), aur empty weight GRN se pehle bhi ho sakta hai.
//
// ULTA RAASTA (23 Sep 2026): apni gadi bharne ja rahi ho to pehle KHALI
// tulti hai aur bhar kar aane par doosra wazan — "Khali gadi pehle tuli".
// GADI KA PEECHHA: tuli gadi jab tak site par utar kar GRN nahi hoti, uska
// challan aur number "utarna baaki" list me khula rehta hai.
// Backend: routes/weighments.js
import React, { useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import uploadManager from "../../utils/uploadManager";
import { loadPhotoPolicy, policyFor } from "../../utils/photoPolicy";
import { T } from "../../modules/shared/tokens";
import { t } from "../../i18n";
import { challanUnits, fmtKg, kgIn, loadWeighments } from "./weigh";
import { loadOrderedLines, loadPoLines } from "./grnData";

const inp = { width: "100%", padding: "7px 9px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 3 };
const btn = (bg, fg, bd) => ({ padding: "7px 14px", borderRadius: 6, background: bg, color: fg, border: bd ? "1px solid " + bd : "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const STATUS = { InTransit: [T.amb, T.ambL, "weigh.in_transit"], Received: [T.blu, T.bluL, "weigh.unloaded"], Closed: [T.grn, T.grnL, "weigh.closed"] };

// Photo lo → upload → (slip ho to) padho. onRead me padhe hue ankde aate hain.
function PhotoPick({ label, url, onUrl, onRead, reading }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {url ? (
          <div style={{ position: "relative", width: 54, height: 54, borderRadius: 7, overflow: "hidden", border: "1px solid " + T.b1, flexShrink: 0 }}>
            <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></a>
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

export default function WeighbridgePanel({ dest, onChanged }) {
  const [trips, setTrips] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pol, setPol] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [tareFor, setTareFor] = useState(null);     // trip id jiska empty weight bhar rahe hain
  const [result, setResult] = useState(null);       // tare ke baad ka nateeja
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [tr, ls, pl] = await Promise.all([loadWeighments(dest, "all"), loadOrderedLines(dest), loadPoLines(dest)]);
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

  const open = trips.filter(w => w.status === "InTransit" || w.status === "Received");
  // Dono wazan ho chuke par maal site par utra nahi — challan aur gadi ka
  // peechha yahin khula rehta hai, jab tak GRN nahi hota.
  const waiting = trips.filter(w => w.status === "Closed" && w.pending_unload);
  const closed = trips.filter(w => w.status === "Closed" && !w.pending_unload).slice(0, 10);

  // ── Step 1 form ─────────────────────────────────────────────────
  // mode: pehla wazan bhari gadi ka ('gross', aam) ya khali ka ('tare' —
  // apni gadi bharne ja rahi hai, bhar kar aane par doosra wazan).
  const blankNew = { mode: "gross", picked: {}, free: [], freeName: "", freeUnit: "Ton", vendor: "", challan: "", vehicle: "", bridge: "", slipNo: "", gross: "", slipUrl: "", vehUrl: "", read: null, readMsg: "" };
  const [nf, setNf] = useState(blankNew);
  const [reading, setReading] = useState(false);
  const setN = (p) => setNf(f => ({ ...f, ...p }));

  const pickedLines = useMemo(() => lines.filter(l => nf.picked[l.key]), [lines, nf.picked]);
  // Order chuna hai to vendor usi order ka — gadi usi ne bheji hai. Badalne
  // par GRN kisi aur party ke khaate me chala jaata (server bhi rokta hai).
  const lockedVendor = (pickedLines.find(l => l.vendor) || {}).vendor || "";
  const setPick = (key, p) => setNf(f => ({ ...f, picked: { ...f.picked, [key]: { ...f.picked[key], ...p } } }));
  // Tick karte hi order ki poori pending qty bhar dena galat tha (23 Sep 2026):
  // 2 gadi ka order ho aur 1 gadi aaye to entry usi 1 gadi ki hai, aur bhari
  // hui qty waisi hi reh jaati thi — "Short" ka hisaab (challan vs net) jhootha
  // ho jaata tha. Ab khaali; pending sirf naam ke neeche hint me.
  const togglePick = (l) => setNf(f => {
    const picked = { ...f.picked };
    if (picked[l.key]) delete picked[l.key];
    else picked[l.key] = { challanQty: "", challanUnit: l.unit || "Ton" };
    const firstVendor = lines.find(x => picked[x.key] && x.vendor)?.vendor || "";
    return { ...f, picked, vendor: f.vendor || firstVendor };
  });

  const onGrossSlip = async (url) => {
    setReading(true); setN({ readMsg: "" });
    const out = await readSlip(url);
    setReading(false);
    if (!out.ok) { setN({ readMsg: out.message || t("weigh.slip_unread") }); return; }
    const r = out.read || {};
    setNf(f => ({
      ...f, read: r, readMsg: t("weigh.read_ok"),
      gross: f.gross || (r.gross_kg != null ? String(r.gross_kg) : ""),
      slipNo: f.slipNo || r.slip_no || "",
      vehicle: f.vehicle || r.vehicle_no || "",
      bridge: f.bridge || r.weighbridge_name || "",
      vendor: f.vendor || r.party || "",
    }));
  };

  const saveNew = async () => {
    const payloadLines = [
      ...pickedLines.map(l => ({
        mr_id: l.kind === "mr" ? l.mrId : null,
        po_item_id: l.kind === "po" ? l.poItemId : null,
        wh_mr_id: l.kind === "wh" ? l.whMrId : null,
        wh_mr_item_id: l.kind === "wh" ? l.whMrItemId : null,
        material_name: l.material, order_unit: l.unit,
        challan_qty: nf.picked[l.key]?.challanQty || null,
        challan_unit: nf.picked[l.key]?.challanUnit || l.unit || null,
      })),
      ...nf.free.map(x => ({ material_name: x.name, order_unit: x.unit, challan_qty: x.qty || null })),
    ];
    if (!payloadLines.length) { alert(t("weigh.need_material")); return; }
    if (!(Number(nf.gross) > 0)) { alert(t(nf.mode === "gross" ? "weigh.need_gross" : "weigh.need_tare")); return; }
    if (photoMissing("weigh_slip", nf.slipUrl)) { alert(t("weigh.photo_required", { label: t("weigh.slip_photo") })); return; }
    if (photoMissing("weigh_vehicle", nf.vehUrl)) { alert(t("weigh.photo_required", { label: t("weigh.vehicle_photo") })); return; }
    setBusy(true);
    const body = {
      ...(dest.type === "warehouse" ? { warehouse_id: dest.warehouseId } : { project_id: dest.projectId }),
      vendor_name: lockedVendor || nf.vendor || null, challan_no: nf.challan || null,
      vehicle_no: nf.vehicle || null, weighbridge_name: nf.bridge || null,
      ...(nf.mode === "gross"
        ? { gross_kg: Number(nf.gross), gross_slip_no: nf.slipNo || null, gross_slip_url: nf.slipUrl || null }
        : { tare_kg: Number(nf.gross), tare_slip_no: nf.slipNo || null, tare_slip_url: nf.slipUrl || null }),
      vehicle_photo_url: nf.vehUrl || null,
      slip_read: nf.read || null, lines: payloadLines,
    };
    const r = await api.post("/weighments", body).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    setNf(blankNew); setShowNew(false);
    await reload(); onChanged && onChanged();
  };

  // ── Step 3 form ─────────────────────────────────────────────────
  const [tf, setTf] = useState({ tare: "", slipNo: "", slipUrl: "", read: null, readMsg: "" });
  const tareTrip = trips.find(w => w.id === tareFor);
  // Khali pehle tuli thi to yahi form BHARA hua wazan maangta hai.
  const needGross = !!tareTrip && tareTrip.gross_kg == null;
  const netPreview = tareTrip && Number(tf.tare) > 0
    ? (needGross ? Number(tf.tare) - Number(tareTrip.tare_kg) : Number(tareTrip.gross_kg) - Number(tf.tare))
    : null;

  const onTareSlip = async (url) => {
    setReading(true); setTf(f => ({ ...f, readMsg: "" }));
    const out = await readSlip(url);
    setReading(false);
    if (!out.ok) { setTf(f => ({ ...f, readMsg: out.message || t("weigh.slip_unread") })); return; }
    const r = out.read || {};
    setTf(f => ({ ...f, read: r, readMsg: t("weigh.read_ok"),
      tare: f.tare || (r.tare_kg != null ? String(r.tare_kg) : ""),
      slipNo: f.slipNo || r.slip_no || "" }));
  };

  const saveTare = async () => {
    if (!(Number(tf.tare) > 0)) { alert(t(needGross ? "weigh.need_gross" : "weigh.need_tare")); return; }
    if (tareTrip && !needGross && Number(tf.tare) >= Number(tareTrip.gross_kg)) { alert(t("weigh.tare_gt_gross")); return; }
    if (tareTrip && needGross && Number(tf.tare) <= Number(tareTrip.tare_kg)) { alert(t("weigh.tare_gt_gross")); return; }
    if (photoMissing("weigh_slip", tf.slipUrl)) { alert(t("weigh.photo_required", { label: t("weigh.slip_photo") })); return; }
    setBusy(true);
    const r = await api.post(`/weighments/${tareFor}/${needGross ? "gross" : "tare"}`, {
      ...(needGross
        ? { gross_kg: Number(tf.tare), gross_slip_no: tf.slipNo || null, gross_slip_url: tf.slipUrl || null }
        : { tare_kg: Number(tf.tare), tare_slip_no: tf.slipNo || null, tare_slip_url: tf.slipUrl || null }),
      slip_read: tf.read || null,
    }).catch(e => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    setResult({ tripId: tareFor, ...r.data, issued: {} });
    setTareFor(null); setTf({ tare: "", slipNo: "", slipUrl: "", read: null, readMsg: "" });
    await reload(); onChanged && onChanged();
  };

  const shortIssue = async (tripId, lineId) => {
    const r = await api.post(`/weighments/${tripId}/short-issue`, { line_id: lineId }).catch(e => ({ success: false, message: e.message }));
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    setResult(x => x ? { ...x, issued: { ...x.issued, [lineId]: true } } : x);
    reload();
    onChanged && onChanged();
  };

  const cancelTrip = async (id) => {
    if (!(await window.confirmAsync(t("weigh.confirm_cancel")))) return;
    const r = await api.post(`/weighments/${id}/cancel`, {}).catch(e => ({ success: false, message: e.message }));
    if (!r?.success) { alert(r?.message || t("common.something_went_wrong")); return; }
    reload();
  };

  const flagText = (f) => f.type === "dup_slip" ? t("weigh.flag_dup_slip")
    : f.type === "slip_mismatch" ? t("weigh.flag_mismatch")
    : f.type === "short" ? t("weigh.flag_short") : null;

  const TripHead = ({ w }) => {
    const [c, bg, k] = STATUS[w.status] || STATUS.InTransit;
    const flags = (Array.isArray(w.flags) ? w.flags : []).map(flagText).filter(Boolean);
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontFamily: "monospace" }}>{w.vehicle_no || "—"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, background: bg, padding: "1px 8px", borderRadius: 10 }}>{t(k)}</span>
          {w.vendor_name && <span style={{ fontSize: 11, color: T.t3 }}>{w.vendor_name}</span>}
        </div>
        <div style={{ fontSize: 11, color: T.t2, marginTop: 3 }}>
          {(w.lines || []).map(l => l.material_name + (l.challan_qty ? ` (${Number(l.challan_qty)} ${l.challan_unit || l.order_unit || ""})` : "")).join(" · ")}
        </div>
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>
          {t("weigh.gross_short")} {fmtKg(w.gross_kg)}
          {w.tare_kg != null && <> · {t("weigh.tare_short")} {fmtKg(w.tare_kg)} · {t("weigh.net_short")} <b style={{ color: T.grn }}>{fmtKg(w.net_kg)}</b></>}
          {w.gross_slip_no && <> · {t("weigh.slip_no_short")} {w.gross_slip_no}</>}
        </div>
        {flags.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
            {flags.map((f, i) => <span key={i} style={{ fontSize: 9.5, fontWeight: 700, color: T.red, background: T.redL, border: "1px solid " + T.redM, padding: "1px 7px", borderRadius: 8 }}>⚠ {f}</span>)}
          </div>
        )}
      </>
    );
  };

  if (loading) return <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("common.loading")}</div>;

  return (
    <div>
      <div style={{ background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 7, padding: "8px 11px", fontSize: 11.5, color: T.blu, marginBottom: 12, lineHeight: 1.5 }}>
        {t("weigh.intro")}
      </div>

      {/* ── Step 3 ka nateeja ─────────────────────────────── */}
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

      {/* ── Step 1: loaded truck ──────────────────────────── */}
      {!showNew ? (
        <button type="button" onClick={() => { setShowNew(true); setResult(null); }}
          style={{ width: "100%", padding: "11px", borderRadius: 8, border: "1.5px dashed " + T.blu, background: T.bluL, color: T.blu, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 }}>
          {t("weigh.new_loaded")}
        </button>
      ) : (
        <div style={{ background: T.surface, border: "1.5px solid " + T.bluM, borderLeft: "3px solid " + T.blu, borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 7 }}>
            {t(nf.mode === "gross" ? "weigh.step1_title" : "weigh.step1_tare_title")}
          </div>
          {/* Pehla wazan bhari gadi ka hai ya khali ka — kram ulta ho sakta hai */}
          <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
            {[["gross", t("weigh.mode_gross_first")], ["tare", t("weigh.mode_tare_first")]].map(([m, label]) => (
              <button key={m} type="button" onClick={() => setN({ mode: m })}
                style={{ padding: "5px 11px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                  border: "1px solid " + (nf.mode === m ? T.blu : T.b1),
                  background: nf.mode === m ? T.bluL : T.surface, color: nf.mode === m ? T.blu : T.t3 }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, marginBottom: 5 }}>{t("weigh.which_material")}</div>
          {lines.length === 0 && <div style={{ fontSize: 11, color: T.t4, marginBottom: 6 }}>{t("weigh.no_ordered")}</div>}
          <div style={{ maxHeight: 190, overflowY: "auto", border: lines.length ? "1px solid " + T.b1 : "none", borderRadius: 6, marginBottom: 8 }}>
            {lines.map(l => {
              const on = !!nf.picked[l.key];
              return (
                <div key={l.key} style={{ display: "grid", gridTemplateColumns: "22px 1fr 160px", gap: 7, alignItems: "center", padding: "6px 8px", borderBottom: "1px solid " + T.b1, background: on ? T.bluL : T.surface }}>
                  <input type="checkbox" checked={on} onChange={() => togglePick(l)} style={{ width: 15, height: 15, accentColor: T.blu, cursor: "pointer" }} />
                  <div style={{ minWidth: 0, cursor: "pointer" }} onClick={() => togglePick(l)}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.material}</div>
                    <div style={{ fontSize: 10, color: T.t4 }}>{l.label} · {t("weigh.pending_qty", { qty: l.pending, unit: l.unit })}{l.vendor ? " · " + l.vendor : ""}</div>
                  </div>
                  {on ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" value={nf.picked[l.key].challanQty}
                        onChange={e => setPick(l.key, { challanQty: e.target.value })}
                        title={t("weigh.this_truck_qty")} placeholder={t("weigh.challan_par")}
                        style={{ ...inp, padding: "5px 7px", fontSize: 11.5 }} />
                      <select value={nf.picked[l.key].challanUnit}
                        onChange={e => setPick(l.key, { challanUnit: e.target.value })}
                        title={t("weigh.this_truck_qty")}
                        style={{ ...inp, padding: "5px 4px", fontSize: 11, width: 66 }}>
                        {challanUnits(l.unit).map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  ) : <span />}
                </div>
              );
            })}
          </div>
          {nf.free.map((x, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{x.name}</span>
              <span style={{ color: T.t4 }}>{x.qty ? `${x.qty} ${x.unit}` : x.unit}</span>
              <button type="button" onClick={() => setN({ free: nf.free.filter((_, j) => j !== i) })}
                style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 13 }}>×</button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px auto", gap: 6, alignItems: "end", marginBottom: 10 }}>
            <div>
              <label style={lbl}>{t("weigh.free_material")}</label>
              <input list="weigh-lib-mats" value={nf.freeName}
                onChange={e => { const v = e.target.value; setN({ freeName: v, freeUnit: libUnit(v) || nf.freeUnit }); }}
                placeholder={t("weigh.free_material_ph")} style={inp} />
              <datalist id="weigh-lib-mats">
                {(lib || []).map(m => <option key={m.id || m.name} value={m.name} />)}
              </datalist>
            </div>
            <div>
              <label style={lbl}>{t("weigh.challan_qty")}</label>
              <input type="number" value={nf.freeQty || ""} onChange={e => setN({ freeQty: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>{t("common.unit")}</label>
              <select value={nf.freeUnit} onChange={e => setN({ freeUnit: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
                {[...new Set([...(libUnit(nf.freeName) ? [libUnit(nf.freeName)] : []), "Ton", "Kg", "MT", "CFT", "Brass", "Cu.m", "Bags", "Nos"])].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <button type="button" disabled={!nf.freeName.trim()}
              onClick={() => setN({ free: [...nf.free, { name: nf.freeName.trim(), unit: nf.freeUnit, qty: nf.freeQty || "" }], freeName: "", freeQty: "" })}
              style={{ ...btn(T.surface, T.blu, T.bluM), height: 33, opacity: nf.freeName.trim() ? 1 : 0.5 }}>{t("weigh.add_free")}</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <PhotoPick label={t("weigh.slip_photo")} url={nf.slipUrl} onUrl={u => setN({ slipUrl: u })} onRead={onGrossSlip} reading={reading} />
            <PhotoPick label={t("weigh.vehicle_photo")} url={nf.vehUrl} onUrl={u => setN({ vehUrl: u })} />
          </div>
          {nf.readMsg && <div style={{ fontSize: 11, color: nf.read ? T.grn : T.amb, marginBottom: 8 }}>{nf.read ? "✓ " : "⚠ "}{nf.readMsg}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div><label style={lbl}>{t(nf.mode === "gross" ? "weigh.gross_kg" : "weigh.tare_kg")}</label>
              <input type="number" value={nf.gross} onChange={e => setN({ gross: e.target.value })} placeholder={nf.mode === "gross" ? "18450" : "6150"} style={{ ...inp, fontWeight: 700, borderColor: T.bluM }} /></div>
            <div><label style={lbl}>{t("weigh.vehicle_no")}</label>
              <input value={nf.vehicle} onChange={e => setN({ vehicle: e.target.value.toUpperCase() })} placeholder={t("weigh.vehicle_no_ph")} style={inp} /></div>
            <div><label style={lbl}>{t("weigh.slip_no")}</label>
              <input value={nf.slipNo} onChange={e => setN({ slipNo: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>{t("weigh.vendor")}</label>
              <input value={lockedVendor || nf.vendor} readOnly={!!lockedVendor}
                onChange={e => setN({ vendor: e.target.value })}
                title={lockedVendor ? t("weigh.vendor_locked") : ""}
                style={{ ...inp, ...(lockedVendor ? { background: T.surfaceB, color: T.t3 } : null) }} />
              {lockedVendor && <div style={{ fontSize: 9.5, color: T.t4, marginTop: 2 }}>🔒 {t("weigh.vendor_locked")}</div>}</div>
            <div><label style={lbl}>{t("weigh.challan_no")}</label>
              <input value={nf.challan} onChange={e => setN({ challan: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>{t("weigh.weighbridge_name")}</label>
              <input value={nf.bridge} onChange={e => setN({ bridge: e.target.value })} style={inp} /></div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setShowNew(false); setNf(blankNew); }} style={btn(T.surface, T.t3, T.b1)}>{t("common.cancel")}</button>
            <button type="button" onClick={saveNew} disabled={busy} style={btn(busy ? "#9CA3AF" : T.grn, "#fff")}>{busy ? t("common.saving") : t(nf.mode === "gross" ? "weigh.save_loaded" : "weigh.save_tare")}</button>
          </div>
        </div>
      )}

      {/* ── Raste me / utar gaye — empty weight baaki ───────── */}
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 7 }}>
        {t("weigh.open_title")} {open.length > 0 && <span style={{ color: T.amb }}>({open.length})</span>}
      </div>
      {open.length === 0 && <div style={{ fontSize: 11.5, color: T.t4, padding: "8px 0 14px" }}>{t("weigh.none_open")}</div>}
      {open.map(w => (
        <div key={w.id} style={{ background: T.surface, border: "1px solid " + T.b1, borderLeft: "3px solid " + T.amb, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
          <TripHead w={w} />
          {tareFor === w.id ? (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed " + T.b1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 7 }}>{t(needGross ? "weigh.step_gross_title" : "weigh.step3_title")}</div>
              <PhotoPick label={t(needGross ? "weigh.loaded_slip" : "weigh.empty_slip")} url={tf.slipUrl} onUrl={u => setTf(f => ({ ...f, slipUrl: u }))} onRead={onTareSlip} reading={reading} />
              {tf.readMsg && <div style={{ fontSize: 11, color: tf.read ? T.grn : T.amb, margin: "6px 0" }}>{tf.read ? "✓ " : "⚠ "}{tf.readMsg}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div><label style={lbl}>{t(needGross ? "weigh.gross_kg" : "weigh.tare_kg")}</label>
                  <input type="number" value={tf.tare} onChange={e => setTf(f => ({ ...f, tare: e.target.value }))} placeholder={needGross ? "18450" : "6150"} style={{ ...inp, fontWeight: 700, borderColor: T.bluM }} /></div>
                <div><label style={lbl}>{t("weigh.slip_no")}</label>
                  <input value={tf.slipNo} onChange={e => setTf(f => ({ ...f, slipNo: e.target.value }))} style={inp} /></div>
              </div>
              {netPreview != null && (
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: netPreview > 0 ? T.grn : T.red }}>
                  {t("weigh.net_preview", { net: fmtKg(netPreview) })}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setTareFor(null)} style={btn(T.surface, T.t3, T.b1)}>{t("common.cancel")}</button>
                <button type="button" onClick={saveTare} disabled={busy} style={btn(busy ? "#9CA3AF" : T.grn, "#fff")}>{busy ? t("common.saving") : t(needGross ? "weigh.save_loaded" : "weigh.save_tare")}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => { setTareFor(w.id); setResult(null); setTf({ tare: "", slipNo: "", slipUrl: "", read: null, readMsg: "" }); }}
                style={btn(T.blu, "#fff")}>{t(w.gross_kg == null ? "weigh.weigh_loaded" : "weigh.weigh_empty")}</button>
              {!(w.lines || []).some(l => l.grn_item_id) && (
                <button type="button" onClick={() => cancelTrip(w.id)} style={btn(T.surface, T.red, T.redM)}>{t("common.cancel")}</button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ── Tuli gadi, site par abhi khali nahi hui ────────── */}
      {waiting.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", margin: "14px 0 7px" }}>
            {t("weigh.pending_unload_title")} <span style={{ color: T.amb }}>({waiting.length})</span>
          </div>
          {waiting.map(w => (
            <div key={w.id} style={{ background: T.surface, border: "1px solid " + T.b1, borderLeft: "3px solid " + T.amb, borderRadius: 8, padding: "9px 12px", marginBottom: 7 }}>
              <TripHead w={w} />
              <div style={{ fontSize: 10.5, color: T.t3, marginTop: 5 }}>{t("weigh.pending_unload_hint")}</div>
            </div>
          ))}
        </>
      )}

      {/* ── Haal me band hue ──────────────────────────────── */}
      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", margin: "14px 0 7px" }}>{t("weigh.recent_closed")}</div>
          {closed.map(w => (
            <div key={w.id} style={{ background: T.surfaceB, border: "1px solid " + T.b1, borderRadius: 8, padding: "9px 12px", marginBottom: 7 }}>
              <TripHead w={w} />
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
    </div>
  );
}
