// ════════════════════════════════════════════════════════════════
// GRN — site aur godown ka EK form (web)
// ----------------------------------------------------------------
// Pehle site ka GRN (Project → Material → Record GRN) aur godown ka GRN
// (Warehouse → Material In) do alag form the, aur har naya feature ek me
// pahunchta tha doosre me nahi — godown GRN me na photo thi, na billing
// weight, na challan ki rok. Ab dono yahi component chalate hain; farq sirf
// `dest` ka hai:
//   { type: "project",   projectId, projectName }
//   { type: "warehouse", warehouseId, warehouseName }
//
// Sach me alag sirf do cheezein hain, aur wo yahin sambhali gayi hain:
//   • godown me har item par Rate — FIFO ke liye, kyunki godown aage
//     project ko issue karta hai aur usi rate se kharcha lagta hai
//   • "ordered" ka srot — site par procurement ki MR, godown me warehouse
//     MR ke items (components/grn/grnData.js)
//
// Dharam kate ki tolai: jis ordered material ki gadi kaante par tul chuki
// hai, uski row par ⚖️ chip aata hai aur GRN ke saath tolai jud jaati hai.
//
// Parent footer ka "Submit GRN" ref se submitDirect() bulata hai.
// ════════════════════════════════════════════════════════════════
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import api from "../../config/api";
import LibrarySelect from "../LibrarySelect";
import GrnIssueBlock from "../GrnIssueBlock";
import DualUnitToggle from "./DualUnitToggle";
import GrnPhotoBox from "./GrnPhotoBox";
import WeighChip from "./WeighChip";
import { loadOrderedLines } from "./grnData";
import { loadWeighments, indexOpenLines, suggestedQty, fmtKg } from "./weigh";
import { T } from "../../modules/shared/tokens";
import { t, Rich } from "../../i18n";

export const UNITS_MR = ["Bags", "MT", "Nos", "Loads", "Sqft", "Mtrs", "Kg", "Sheets", "Ltrs", "Cu.m", "Ton", "RFT", "Brass"];
const today = () => new Date().toLocaleDateString("en-CA");
const inpS = { width: "100%", padding: "6px 9px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lblS = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 3 };
const altOf = (d) => ({
  alt_qty: d?.altOn && Number(d.alt_qty) > 0 ? parseFloat(d.alt_qty) : null,
  alt_unit: d?.altOn && Number(d.alt_qty) > 0 && d.alt_unit ? d.alt_unit : null,
});

const GrnReceive = forwardRef(function GrnReceive({
  dest, mode, photos, setPhotos, photoRequired, photoBadgeRequired, photoCameraOnly, meUser,
  hasOtherPending, onReceived, onSavingChange, onDoneCount, onOrderedCount,
}, ref) {
  const isWh = dest?.type === "warehouse";
  const [lines, setLines] = useState([]);
  const [weigh, setWeigh] = useState({ byMr: {}, byWhItem: {}, byName: {}, trucks: [] });
  // Gadi-wise GRN (28 Sep 2026): jo gadi kaante par tul chuki par yahan utri
  // nahi, uski list — "Is gadi ka GRN karo" par sirf USI gadi ka material
  // neeche rehta hai, challan aur qty bhare aate hain, kaante par jo "challan
  // se kam" dikha tha uska Short issue tick ke saath GRN par bhi banta hai.
  const [showTrucks, setShowTrucks] = useState(false);
  const [truckFor, setTruckFor] = useState(null);     // grn_weighments.id
  const [shortTick, setShortTick] = useState({});     // { [weighment line id]: true }
  const [lib, setLib] = useState([]);
  const [grnRows, setGrnRows] = useState({});         // { lineKey: { received_qty, rate, dual } }
  const [vendorMeta, setVendorMeta] = useState({});   // { vendor: { challan, date, received_by } }
  const [rowIssues, setRowIssues] = useState({});     // { lineKey: [...] }
  const [done, setDone] = useState([]);                // received line keys (this session)
  const [saving, setSaving] = useState(false);
  const blankRow = () => ({ id: Date.now() + Math.random(), item_name: "", qty: "", unit: "Bags", rate: "" });
  const [dGlobal, setDGlobal] = useState({ vendor: "", challan: "", date: today(), received_by: "" });
  const [dRows, setDRows] = useState([blankRow()]);
  const [dIssues, setDIssues] = useState([]);

  const setBusy = (v) => { setSaving(v); onSavingChange && onSavingChange(v); };
  const destKey = isWh ? "wh:" + dest?.warehouseId : "p:" + dest?.projectId;

  const reloadLines = async () => {
    const ls = await loadOrderedLines(dest);
    setLines(ls);
    onOrderedCount && onOrderedCount(ls.length);
  };
  const reloadWeigh = async () => setWeigh(indexOpenLines(await loadWeighments(dest, "all")));

  useEffect(() => {
    reloadLines(); reloadWeigh();
    api.get("/library/materials").then(r => { if (r?.success) setLib(r.data || []); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey]);
  useEffect(() => { onDoneCount && onDoneCount(done.length); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [done.length]);

  const trucks = weigh.trucks || [];
  const truck = truckFor ? trucks.find(x => x.trip.id === truckFor) || null : null;
  // Gadi-wise mode me chip aur GRN ka jod USI gadi ki line se — pehli gadi se nahi.
  const truckLineFor = (l) => (truck ? truck.lines.find(x => (l.kind === "mr" ? x.mr_id === l.mrId : x.wh_mr_item_id === l.whMrItemId)) || null : null);
  const hitFor = (l) => { const tl = truckLineFor(l); return tl ? { line: tl, trip: truck.trip } : ((l.kind === "mr" ? weigh.byMr[l.mrId] : weigh.byWhItem[l.whMrItemId]) || null); };
  const moreFor = (l) => Math.max(0, ((l.kind === "mr" ? (weigh.allByMr || {})[l.mrId] : (weigh.allByWhItem || {})[l.whMrItemId]) || []).length - 1);
  const inTruck = (l) => !truck || !!truckLineFor(l);
  // Gadi ki jo line yahan kisi row se nahi milti (order list me nahi, ya bina
  // order ka maal) — wo Direct tab se utarti hai.
  const orphanLines = () => (truck ? truck.lines.filter(x => !lines.some(l => (l.kind === "mr" ? x.mr_id === l.mrId : x.wh_mr_item_id === l.whMrItemId))) : []);
  const pickTruck = (tr) => {
    setTruckFor(tr.trip.id); setShowTrucks(false);
    const q = {}; const tick = {}; const vendors = new Set();
    for (const x of tr.lines) {
      const l = lines.find(y => (y.kind === "mr" ? x.mr_id === y.mrId : x.wh_mr_item_id === y.whMrItemId));
      if (l) { vendors.add(l.vendor || t("grn.unassigned")); const v = suggestedQty({ line: x, trip: tr.trip }, l.unit); if (v != null) q[l.key] = { received_qty: String(v) }; }
      if (x.is_short) tick[x.id] = true;
    }
    setGrnRows(r => { const n = { ...r }; for (const k of Object.keys(q)) n[k] = { ...(n[k] || {}), ...q[k] }; return n; });
    if (tr.trip.challan_no) setVendorMeta(m => { const n = { ...m }; for (const v of vendors) if (!(n[v] && n[v].challan)) n[v] = { ...(n[v] || {}), challan: tr.trip.challan_no }; return n; });
    setShortTick(tick);
  };
  const leaveTruck = () => { setTruckFor(null); setShortTick({}); };
  // Gadi-wise GRN ke baad: kaante par jo "challan se kam" dikha tha, uska Short
  // issue GRN par bhi — jab tak aadmi ne tick nahi hataya (server wahi note
  // likhta hai jo tolai ke screen ka "Short issue banao" likhta hai).
  const shortIssuesForTruck = async () => {
    if (!truck) return;
    for (const x of truck.lines) {
      if (shortTick[x.id]) await api.post(`/weighments/${truck.trip.id}/short-issue`, { line_id: x.id }).catch(() => null);
    }
    leaveTruck();
  };
  const truckCard = (tr) => {
    const w = tr.trip; const closed = w.status === "Closed";
    return (
      <div key={w.id} style={{ background: T.surface, border: "1px solid " + T.b1, borderLeft: "3px solid " + (closed ? T.grn : T.amb), borderRadius: 8, padding: "9px 12px", marginTop: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.t1, fontFamily: "monospace" }}>{w.vehicle_no || "—"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: closed ? T.grn : T.amb, background: closed ? T.grnL : T.ambL, padding: "1px 8px", borderRadius: 10 }}>{t(closed ? "weigh.closed" : "weigh.in_transit")}</span>
          {w.vendor_name && <span style={{ fontSize: 11, color: T.t3 }}>{w.vendor_name}</span>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => pickTruck(tr)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: T.blu, color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("weigh.truck_grn")}</button>
        </div>
        {tr.lines.map(x => (
          <div key={x.id} style={{ fontSize: 11, color: T.t2, marginTop: 3 }}>
            <b style={{ color: T.t1 }}>{x.material_name}</b>
            {x.challan_qty ? " · " + t("weigh.challan_line", { qty: Number(x.challan_qty), unit: x.challan_unit || x.order_unit || "" }) : ""}
            {closed && Number(x.net_kg_share) > 0 ? " · " + t("weigh.net_short") + " " + fmtKg(x.net_kg_share) : ""}
            {x.is_short && <span style={{ color: T.red, fontWeight: 700 }}> · {t("weigh.chip_short", { pct: x.short_pct })}</span>}
          </div>
        ))}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>
          {(w.gross_slip_no || w.tare_slip_no) ? t("weigh.slip_no_short") + " " + (w.gross_slip_no || w.tare_slip_no) : ""}
          {w.challan_no ? ((w.gross_slip_no || w.tare_slip_no) ? " · " : "") + t("weigh.challan_no") + " " + w.challan_no : ""}
          {w.pending_unload && w.open_hours > 0 ? " · " + t("weigh.open_since", { h: w.open_hours }) : ""}
        </div>
      </div>
    );
  };
  const libFind = (name) => lib.find(m => (m.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase());
  const photoMissing = () => {
    if (photoRequired && !(photos || []).length) {
      alert(t("material.company_setting_label_ke_saath_kam", { label: t("grn.receive_label") }));
      return true;
    }
    return false;
  };
  const afterSave = (info) => { reloadLines(); reloadWeigh(); onReceived && onReceived(info); };

  // ── ORDERED: vendor ke hisaab se ek delivery ─────────────────────
  const groups = useMemo(() => {
    const g = {};
    for (const l of lines) {
      if (done.includes(l.key)) continue;
      if (!inTruck(l)) continue;
      const v = l.vendor || t("grn.unassigned");
      (g[v] ||= []).push(l);
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, done, truckFor, weigh]);
  const vendorKeys = Object.keys(groups).sort();

  const receiveVendor = async (vendor) => {
    const meta = vendorMeta[vendor] || {};
    if (!meta.challan || !meta.challan.trim()) { alert(t("common.challan_number_required")); return; }
    if (photoMissing()) return;
    const target = (groups[vendor] || []).filter(l => Number((grnRows[l.key] || {}).received_qty || 0) > 0);
    if (!target.length) { alert(t("material.kam_se_kam_ek_material_ka")); return; }
    // Site: pending se zyada qty sirf "Zyada maal aaya" tick + wajah ke saath —
    // server bhi yahi maangta hai (MAT-08). Godown ka MR baaki se zyada leta hi nahi.
    const overNoReason = !isWh && target.find(l => {
      const row = grnRows[l.key] || {};
      return (parseFloat(row.received_qty) || 0) > l.pending + 0.0005 && !(row.excess && String(row.excessReason || "").trim());
    });
    if (overNoReason) { alert(t("material.zyada_maal_tick_ya_qty_theek_karo", { item: overNoReason.material })); return; }
    const receivedBy = meta.received_by !== undefined ? meta.received_by : (meUser?.name || "");
    const date = meta.date || today();
    setBusy(true);
    let ok = 0; const fails = [];
    if (!isWh) {
      // Site: har MR ka apna GRN (mark-received) — pehle jaisa hi.
      for (const l of target) {
        const row = grnRows[l.key] || {};
        const hit = hitFor(l);
        const isOver = (parseFloat(row.received_qty) || 0) > l.pending + 0.0005;
        try {
          const res = await api.patch("/procurement/mrs/" + l.mrId + "/mark-received", {
            challan_no: meta.challan.trim(),
            received_qty: parseFloat(row.received_qty) || 0,
            allow_excess: isOver || undefined,
            excess_reason: isOver ? String(row.excessReason || "").trim() : undefined,
            received_date: date,
            received_by: receivedBy || undefined,
            photo_urls: (photos || []).length ? photos : null,
            ...altOf(row.dual),
            issues: (rowIssues[l.key] || []).length ? rowIssues[l.key] : null,
            weighment_line_id: hit ? hit.line.id : null,
          });
          if (res.success) { ok++; setDone(p => [...p, l.key]); }
          else fails.push(`${l.material}: ${res.message || "—"}`);
        } catch (e) { fails.push(`${l.material}: ${e.message}`); }
      }
    } else {
      // Godown: ek warehouse MR ke saare item ek GRN me.
      const byMr = {};
      for (const l of target) (byMr[l.whMrId] ||= []).push(l);
      for (const mrId of Object.keys(byMr)) {
        const ls = byMr[mrId];
        const issues = ls.flatMap(l => rowIssues[l.key] || []);
        try {
          const res = await api.post(`/warehouse/mr/${mrId}/grn`, {
            challan: meta.challan.trim(), vendor: ls[0].vendor || null, date,
            received_by: receivedBy || null,
            photo_urls: (photos || []).length ? photos : null,
            issues: issues.length ? issues : null,
            items: ls.map(l => {
              const row = grnRows[l.key] || {};
              const hit = hitFor(l);
              return {
                id: l.whMrItemId, name: l.material, unit: l.unit,
                received_qty: parseFloat(row.received_qty) || 0,
                rate: row.rate !== undefined && row.rate !== "" ? Number(row.rate) || 0 : l.rate,
                ...altOf(row.dual),
                weighment_line_id: hit ? hit.line.id : null,
              };
            }),
          });
          if (res.success) { ok += ls.length; setDone(p => [...p, ...ls.map(l => l.key)]); }
          else fails.push(`${ls[0].label}: ${res.message || "—"}`);
        } catch (e) { fails.push(`${ls[0].label}: ${e.message}`); }
      }
    }
    setRowIssues(p => { const n = { ...p }; target.forEach(l => { delete n[l.key]; }); return n; });
    if (ok > 0) await shortIssuesForTruck();
    setBusy(false);
    afterSave({ mode: "ordered", ok });
    if (fails.length) alert(t("grn.partial_errors", { ok, total: target.length, errors: fails.join("\n") }));
  };

  // ── DIRECT: bina order ke, ek vendor, ek challan ─────────────────
  const submitDirect = async () => {
    if (saving) return;
    if (!dGlobal.vendor) { alert(t("material.vendor_select_karo")); return; }
    if (!dGlobal.challan) { alert(t("material.challan_number_daalo")); return; }
    const valid = dRows.filter(r => r.item_name && Number(r.qty) > 0);
    if (!valid.length) { alert(t("material.kam_se_kam_ek_material_qty")); return; }
    if (photoMissing()) return;
    const receivedBy = dGlobal.received_by || meUser?.name || null;
    const weighFor = (r) => weigh.byName[String(r.item_name || "").trim().toLowerCase()] || null;
    setBusy(true);
    let res;
    try {
      if (!isWh) {
        res = await api.post("/procurement/grns", {
          po_id: null, vendor_name: dGlobal.vendor,
          project_id: dest.projectId, project_name: dest.projectName,
          challan_no: dGlobal.challan, received_by: receivedBy,
          received_date: dGlobal.date || today(),
          photo_urls: (photos || []).length ? photos : null,
          issues: dIssues.length ? dIssues : null,
          items: valid.map(r => {
            const lm = libFind(r.item_name);
            const hit = weighFor(r);
            return {
              po_item_id: null, description: r.item_name,
              ordered_qty: parseFloat(r.qty), received_qty: parseFloat(r.qty),
              unit: lm?.unit || r.unit || "Bags", ...altOf(r.dual),
              weighment_line_id: hit ? hit.line.id : null,
            };
          }),
        });
      } else {
        res = await api.post("/warehouse/grn-direct", {
          date: dGlobal.date || today(), vendor: dGlobal.vendor, challan: dGlobal.challan,
          received_by: receivedBy,
          photo_urls: (photos || []).length ? photos : null,
          issues: dIssues.length ? dIssues : null,
          items: valid.map(r => {
            const lm = libFind(r.item_name);
            const hit = weighFor(r);
            return {
              name: r.item_name.trim(), unit: lm?.unit || r.unit || "Nos",
              qty: Number(r.qty), rate: Number(r.rate) || 0, ...altOf(r.dual),
              weighment_line_id: hit ? hit.line.id : null,
            };
          }),
        });
      }
    } catch (e) { res = { success: false, message: e.message }; }
    setBusy(false);
    if (!res?.success) { alert(res?.message || t("grn.save_failed")); return false; }
    setDRows([blankRow()]); setDGlobal({ vendor: "", challan: "", date: today(), received_by: "" });
    setDIssues([]); setPhotos && setPhotos([]);
    const no = res.grn_number || res.data?.finance_grn_no || res.data?.grn_no || "";
    alert(t("grn.created", { no }));
    afterSave({ mode: "direct", grn: no });
    return true;
  };

  useImperativeHandle(ref, () => ({ submitDirect, saving }), [submitDirect, saving]);

  // Godown ka rate: pichhli kharid se (pehle bhi Material In me yahi hota tha).
  const fetchLastRate = (rowId, name) => {
    if (!isWh || !name) return;
    api.get(`/warehouse/last-rate?name=${encodeURIComponent(name)}`).then(r => {
      if (r?.success && Number(r.data?.rate) > 0) {
        setDRows(p => p.map(x => x.id === rowId && !Number(x.rate) ? { ...x, rate: r.data.rate } : x));
      }
    }).catch(() => {});
  };

  // ════════════════════════════════════════════════════════════════
  if (mode === "ordered") {
    const doneLines = lines.filter(l => done.includes(l.key));
    const cols = isWh ? "100px 1fr 80px 100px 50px 90px" : "100px 1fr 90px 110px 70px";
    return (
      <div>
        {lines.length === 0 && !hasOtherPending && (
          <div style={{ textAlign: "center", padding: "40px", color: T.t4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 4 }}>
              {isWh ? t("grn.no_ordered_wh") : t("material.koi_ordered_material_transfer_ya_warehouse")}
            </div>
          </div>
        )}
        {/* Gadi-wise GRN — kaante par tuli gadiyan jo yahan abhi utri nahi */}
        {truck ? (
          <div style={{ background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.blu }}>{t("weigh.truck_mode_banner", { vehicle: truck.trip.vehicle_no || "—" })}</div>
                <div style={{ fontSize: 10.5, color: T.t3, marginTop: 1 }}>{truck.trip.vendor_name || ""}{truck.trip.challan_no ? (truck.trip.vendor_name ? " · " : "") + t("weigh.challan_no") + " " + truck.trip.challan_no : ""}</div>
              </div>
              <button type="button" onClick={leaveTruck} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid " + T.b1, background: T.surface, color: T.t2, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("weigh.show_all")}</button>
            </div>
            {truck.lines.filter(x => x.is_short).map(x => (
              <label key={x.id} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11.5, fontWeight: 600, color: T.red, cursor: "pointer" }}>
                <input type="checkbox" checked={!!shortTick[x.id]} onChange={e => setShortTick(p => ({ ...p, [x.id]: e.target.checked }))} />
                {t("weigh.short_tick", { material: x.material_name, pct: x.short_pct })}
              </label>
            ))}
            {orphanLines().map(x => (
              <div key={"n" + x.id} style={{ fontSize: 10.5, color: T.amb, marginTop: 5 }}>{t("weigh.truck_no_order_row", { material: x.material_name })}</div>
            ))}
          </div>
        ) : trucks.length > 0 ? (
          <div style={{ marginBottom: 10 }}>
            <button type="button" onClick={() => setShowTrucks(v => !v)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px dashed " + T.bluM, background: T.bluL, color: T.blu, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{t("weigh.trucks_btn", { n: trucks.length })}</span><span>{showTrucks ? "▴" : "▾"}</span>
            </button>
            {showTrucks && trucks.map(truckCard)}
          </div>
        ) : null}
        {vendorKeys.map(vendor => {
          const ls = groups[vendor];
          const meta = vendorMeta[vendor] || {};
          const filled = ls.filter(l => Number((grnRows[l.key] || {}).received_qty || 0) > 0).length;
          const setMeta = (p) => setVendorMeta(m => ({ ...m, [vendor]: { ...m[vendor], ...p } }));
          return (
            <div key={vendor} style={{ background: T.surface, border: "1px solid " + T.b1, borderRadius: 8, marginBottom: 10, borderLeft: "3px solid " + T.blu, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: T.bluL + "66", borderBottom: "1px solid " + T.b1, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>🏭</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{vendor}</div>
                  <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{t("material.mrs_pending_materialmrs2", { mrs: ls.length, mrs2: ls.length > 1 ? "s" : "" })}</div>
                </div>
                {filled > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.grn, background: T.grnL, border: "1px solid " + T.grnM, padding: "2px 9px", borderRadius: 20 }}>{t("material.filledcount_qty_filled", { filledCount: filled })}</span>}
              </div>
              <div style={{ padding: "10px 14px", background: T.surfaceB, borderBottom: "1px solid " + T.b1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lblS}>{t("material.challan_no")}</label>
                  <input value={meta.challan || ""} onChange={e => setMeta({ challan: e.target.value })} placeholder={t("material.e_g_ch_445")} style={inpS} />
                </div>
                <div>
                  <label style={lblS}>{t("material.delivery_date")}</label>
                  <input type="date" value={meta.date || today()} onChange={e => setMeta({ date: e.target.value })} style={inpS} />
                </div>
                <div>
                  <label style={lblS}>{t("common.received_by")}</label>
                  <input value={meta.received_by !== undefined ? meta.received_by : (meUser?.name || "")}
                    onChange={e => setMeta({ received_by: e.target.value })}
                    placeholder={meUser?.name || t("material.site_person")}
                    title={t("material.default_logged_in_user_override_karne")} style={inpS} />
                </div>
              </div>
              <div style={{ padding: "4px 14px 10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: cols, gap: 7, padding: "6px 0", fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px" }}>
                  <span>{t("material.mr_no")}</span><span>{t("common.material")}</span>
                  <span style={{ textAlign: "right" }}>{t("common.pending")}</span>
                  <span style={{ textAlign: "right" }}>{t("material.receive_qty")}</span><span></span>
                  {isWh && <span style={{ textAlign: "right" }}>{t("common.rate")}</span>}
                </div>
                {ls.map(l => {
                  const row = grnRows[l.key] || {};
                  const recv = Number(row.received_qty || 0);
                  const over = recv > l.pending + 0.0005;
                  const setRow = (p) => setGrnRows(r => ({ ...r, [l.key]: { ...r[l.key], ...p } }));
                  const hit = hitFor(l);
                  return (
                    <div key={l.key} style={{ display: "grid", gridTemplateColumns: cols, gap: 7, padding: "7px 0", borderTop: "1px dashed " + T.b1, alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 11, color: T.amb, fontWeight: 700, fontFamily: "monospace" }}>{l.label}</span>
                        {l.partial && <div style={{ fontSize: 9, color: T.amb, fontWeight: 700, background: T.ambL, border: "1px solid " + T.ambM, borderRadius: 4, padding: "1px 5px", marginTop: 2, display: "inline-block" }}>{t("common.partial")}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.material}</div>
                        {l.partial
                          ? <div style={{ fontSize: 10, color: T.amb }}><Rich k="material.ordered_orderedqty_received_alreadyreceived_pending_pendingqty" params={{ orderedQty: l.ordered, alreadyReceived: l.received, pendingQty: l.pending }} /></div>
                          : !isWh && l.approxAmount > 0 && <div style={{ fontSize: 10, color: T.t4 }}>@ ₹{Math.round(l.approxAmount / (l.ordered || 1)).toLocaleString("en-IN")}/{l.unit}</div>}
                      </div>
                      <span style={{ fontSize: 11.5, color: l.partial ? T.amb : T.t2, fontWeight: 700, textAlign: "right" }}>{l.pending} {l.unit}</span>
                      <input type="number" value={row.received_qty || ""} onChange={e => setRow({ received_qty: e.target.value })}
                        placeholder={String(l.pending)}
                        style={{ padding: "6px 8px", borderRadius: 5, border: "1.5px solid " + (over ? T.red : T.b1), fontSize: 11.5, textAlign: "right", fontFamily: "inherit", outline: "none", background: over ? T.redL : T.surface, color: over ? T.red : T.t1 }} />
                      <span style={{ fontSize: 10.5, color: T.t4 }}>{l.unit}</span>
                      {isWh && (
                        <input type="number" value={row.rate !== undefined ? row.rate : (l.rate || "")} onChange={e => setRow({ rate: e.target.value })}
                          placeholder={t("common.rate")} title={t("grn.rate_fifo_hint")}
                          style={{ padding: "6px 8px", borderRadius: 5, border: "1px solid " + T.b1, fontSize: 11.5, textAlign: "right", fontFamily: "inherit", outline: "none" }} />
                      )}
                      {hit && <WeighChip hit={hit} unit={l.unit} more={truck ? 0 : moreFor(l)} onMore={() => setShowTrucks(true)} onUseNet={(q) => setRow({ received_qty: String(q) })} />}
                      {/* Pending se zyada: sirf jaan-boojh kar — tick + wajah (server bhi maangta hai, MAT-08) */}
                      {over && !isWh && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 8px", background: T.redL, border: "1px solid " + T.redM, borderRadius: 6 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: T.red, cursor: "pointer" }}>
                            <input type="checkbox" checked={!!row.excess} onChange={e => setRow({ excess: e.target.checked })} />
                            {t("material.zyada_maal_aaya")}
                          </label>
                          {row.excess && (
                            <input value={row.excessReason || ""} onChange={e => setRow({ excessReason: e.target.value })}
                              placeholder={t("material.zyada_maal_wajah_placeholder")}
                              style={{ flex: "1 1 180px", padding: "5px 8px", borderRadius: 5, border: "1.5px solid " + T.redM, fontSize: 11.5, outline: "none", fontFamily: "inherit" }} />
                          )}
                        </div>
                      )}
                      {recv > 0 && (
                        <DualUnitToggle units={UNITS_MR} primaryUnit={l.unit} itemName={l.material} qty={row.received_qty}
                          value={row.dual} onChange={d => setRow({ dual: d })} />
                      )}
                      {recv > 0 && (
                        <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
                          <GrnIssueBlock compact title={t("grn.row_problem_title", { material: l.material || t("common.material") })}
                            value={rowIssues[l.key] || []}
                            onChange={v => setRowIssues(p => ({ ...p, [l.key]: v }))} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 8, borderTop: "1.5px solid " + T.b1 }}>
                  <button type="button" onClick={() => receiveVendor(vendor)} disabled={saving || !meta.challan || filled === 0}
                    title={!meta.challan ? t("material.challan_no_daalo") : filled === 0 ? t("material.kam_se_kam_ek_material_ka_2") : ""}
                    style={{ padding: "8px 18px", borderRadius: 6, background: (meta.challan && filled > 0) ? T.grn : T.b1, border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: (meta.challan && filled > 0) ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                    {saving ? "…" : t("grn.receive_n", { n: filled })}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {doneLines.length > 0 && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: T.grnL, border: "1px solid " + T.grnM, borderRadius: 7, fontSize: 11.5, color: T.grn, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13 }}>✓</span>
            <span>{t("material.donemrs_materialdonemrs2_received_this_session_donemrs3", { doneMRs: doneLines.length, doneMRs2: doneLines.length > 1 ? "s" : "", doneMRs3: doneLines.map(l => l.material).join(", ") })}</span>
          </div>
        )}
        <GrnPhotoBox photos={photos} setPhotos={setPhotos} required={photoBadgeRequired ?? photoRequired} cameraOnly={photoCameraOnly} />
      </div>
    );
  }

  // ── DIRECT ─────────────────────────────────────────────────────
  const dCols = isWh ? "1fr 70px 80px 80px 28px" : "1fr 80px 90px 28px";
  const setDRow = (id, p) => setDRows(rs => rs.map(r => r.id === id ? { ...r, ...p } : r));
  return (
    <div>
      <div style={{ background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 7, padding: "8px 11px", fontSize: 11.5, color: T.blu, marginBottom: 12 }}>
        {isWh ? t("grn.direct_banner_wh") : t("material.bina_po_ke_directly_site_pe")}
      </div>
      <div style={{ background: T.surface, border: "1.5px solid " + T.bluM, borderRadius: 8, padding: "12px", marginBottom: 12, borderLeft: "3px solid " + T.blu }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.blu, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>{t("material.delivery_details_single_vendor_one_challan")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 8 }}>
          <div>
            <label style={lblS}>{t("common.vendor_2")}</label>
            <LibrarySelect type="supplier" value={dGlobal.vendor} onChange={v => setDGlobal(p => ({ ...p, vendor: v || "" }))} />
          </div>
          <div>
            <label style={lblS}>{t("material.challan_no")}</label>
            <input value={dGlobal.challan} onChange={e => setDGlobal(p => ({ ...p, challan: e.target.value }))} placeholder={t("material.e_g_ch_445")} style={inpS} />
          </div>
          <div>
            <label style={lblS}>{t("common.date")}</label>
            <input type="date" value={dGlobal.date} onChange={e => setDGlobal(p => ({ ...p, date: e.target.value }))} style={inpS} />
          </div>
          <div>
            <label style={lblS}>{t("common.received_by")}</label>
            <input value={dGlobal.received_by !== "" ? dGlobal.received_by : (meUser?.name || "")}
              onChange={e => setDGlobal(p => ({ ...p, received_by: e.target.value }))}
              placeholder={meUser?.name || t("material.site_person")}
              title={t("material.default_logged_in_user_override_karne")} style={inpS} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 7 }}>
        {t("material.items_received_2")} <span style={{ textTransform: "none", letterSpacing: 0, color: T.t4, fontWeight: 500 }}>{t("material.same_vendor_same_challan")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: dCols, gap: 7, padding: "5px 8px", background: T.surfaceB, borderRadius: 6, border: "1px solid " + T.b1, marginBottom: 5 }}>
        {[t("grn.col_material"), t("grn.col_qty"), t("common.unit"), ...(isWh ? [t("common.rate")] : []), ""].map((h, i) => (
          <span key={i} style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px" }}>{h}</span>
        ))}
      </div>
      {dRows.map((row, i) => {
        const lm = libFind(row.item_name);
        const locked = !!lm;
        const unit = lm?.unit || row.unit || "Bags";
        const hit = weigh.byName[String(row.item_name || "").trim().toLowerCase()] || null;
        return (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: dCols, gap: 7, padding: "6px 8px", alignItems: "center", borderBottom: i < dRows.length - 1 ? "1px dashed " + T.b1 : "none" }}>
            <div>
              <input value={row.item_name}
                onChange={e => { const v = e.target.value; const m = libFind(v); setDRow(row.id, { item_name: v, unit: m?.unit || row.unit }); }}
                onBlur={e => fetchLastRate(row.id, e.target.value.trim())}
                placeholder={t("material.e_g_cement_opc_53")} list={"grn_lib_" + i} style={{ ...inpS, fontSize: 12.5, padding: "7px 9px" }} />
              <datalist id={"grn_lib_" + i}>{lib.map(m => <option key={m.id || m.name} value={m.name} />)}</datalist>
            </div>
            <input type="number" value={row.qty} onChange={e => setDRow(row.id, { qty: e.target.value })} placeholder="0" style={{ ...inpS, fontSize: 12.5, padding: "7px 9px" }} />
            {locked ? (
              <div title={t("material.library_me_change_karein")} style={{ padding: "7px 9px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12.5, color: T.t2, background: T.surfaceB, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, height: 33, boxSizing: "border-box", justifyContent: "center" }}>
                <span style={{ fontSize: 9 }}>🔒</span>{unit}
              </div>
            ) : (
              <select value={row.unit} onChange={e => setDRow(row.id, { unit: e.target.value })} style={{ ...inpS, fontSize: 12.5, padding: "7px 9px", cursor: "pointer" }}>
                {UNITS_MR.map(u => <option key={u}>{u}</option>)}
              </select>
            )}
            {isWh && (
              <input type="number" value={row.rate} onChange={e => setDRow(row.id, { rate: e.target.value })}
                placeholder={t("common.rate")} title={t("grn.rate_fifo_hint")} style={{ ...inpS, fontSize: 12.5, padding: "7px 9px" }} />
            )}
            {dRows.length > 1 ? (
              <button type="button" onClick={() => setDRows(p => p.filter(r => r.id !== row.id))} title={t("procurement.remove_row")}
                style={{ width: 26, height: 26, borderRadius: 6, background: T.redL, border: "1px solid " + T.redM, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            ) : <span />}
            {hit && <WeighChip hit={hit} unit={unit} onUseNet={(q) => setDRow(row.id, { qty: String(q) })} />}
            <DualUnitToggle units={UNITS_MR} primaryUnit={unit} itemName={row.item_name} qty={row.qty}
              value={row.dual} onChange={d => setDRow(row.id, { dual: d })} />
          </div>
        );
      })}
      <button type="button" onClick={() => setDRows(p => [...p, blankRow()])}
        style={{ width: "100%", padding: "9px", borderRadius: 7, border: "1.5px dashed " + T.bluM, background: "transparent", color: T.blu, fontSize: 12, cursor: "pointer", marginTop: 6, fontWeight: 600, fontFamily: "inherit" }}>
        {t("material.add_another_item_2")}
      </button>
      <div style={{ marginTop: 12 }}>
        <GrnIssueBlock value={dIssues} onChange={setDIssues} />
      </div>
      <GrnPhotoBox photos={photos} setPhotos={setPhotos} required={photoBadgeRequired ?? photoRequired} cameraOnly={photoCameraOnly} />
    </div>
  );
});

export default GrnReceive;
