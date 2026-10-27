// GRN ke liye "ordered" maal — site ho ya godown, ek hi shakal me.
//
// Site:   procurement ki MR (ek MR = ek material). Receive = mark-received.
// Godown: warehouse MR (ek MR me kai item). Receive = /warehouse/mr/:id/grn.
// Form ko is farq se matlab nahi — use sirf "line" chahiye.
import api from "../../config/api";
import { dayOf } from "./grnOrdered";

// day = kab aana tha (expected delivery, "YYYY-MM-DD") aur by = kisne maanga —
// Ordered ke vendor card / chip ke liye (27 Oct 2026, grnOrdered.js).

const dedupe = (rows) => {
  const seen = new Set();
  return rows.filter((r) => { if (!r || seen.has(r.id)) return false; seen.add(r.id); return true; });
};

// Site ki PO wali pending line (jo kisi MR se nahi bani, ya jiska MR is list me
// nahi) — sirf weighbridge ke "Is truck me kaunsa material hai?" ke liye. GRN
// ka form inhe nahi dikhata; PO ka GRN Procurement → PO se hota hai.
export async function loadPoLines(dest) {
  if (dest?.type !== "project" || !dest.projectId) return [];
  try {
    const r = await api.get("/tasks/project/" + encodeURIComponent(dest.projectId) + "/inbound");
    return ((r && r.success && r.data && r.data.po) || []).map((l) => ({
      key: "po:" + l.item_id, kind: "po", poId: l.po_id, poItemId: l.item_id, linkedMrId: l.linked_mr_id || null,
      label: l.po_number || "", material: l.material_name || "", unit: l.unit || "",
      ordered: Number(l.ordered_qty) || 0, received: Number(l.received_qty) || 0,
      pending: Math.max(0, Number(l.pending_qty) || 0), vendor: l.vendor_name || "",
    }));
  } catch (_) { return []; }
}

export async function loadOrderedLines(dest) {
  try {
    if (dest?.type === "warehouse") {
      // Store saaf bhejo — api.js wala "chalu godown" doosri screen se khula ho to galat ho sakta hai.
      const wq = dest.warehouseId ? "&warehouse_id=" + encodeURIComponent(dest.warehouseId) : "";
      const [a, b, inb] = await Promise.all([
        api.get("/warehouse/mr?type=warehouse&status=Ordered" + wq),
        api.get("/warehouse/mr?type=warehouse&status=PartialReceived" + wq),
        api.get("/warehouse/inbound?" + wq.slice(1)).catch(() => null),
      ]);
      const mrs = dedupe([...(a?.success ? a.data || [] : []), ...(b?.success ? b.data || [] : [])]);
      // Store ke PO ki baaki lines (9 Oct 2026) — "PO-12" ke naam se, rate PO ka.
      // Godown MR ki jo line ab store PO par hai (on_store_po) wo yahan PO ki line
      // ban kar aati hai — dobara nahi dikhti.
      const poLines = ((inb && inb.success && inb.data && inb.data.po) || []).map((l) => ({
        key: "po:" + l.item_id, kind: "po", poId: l.po_id, poItemId: l.item_id,
        label: l.po_number || "PO-" + l.po_id, material: l.material_name || "", unit: l.unit || "",
        ordered: Number(l.ordered_qty) || 0, received: Number(l.received_qty) || 0,
        pending: Math.max(0, Number(l.pending_qty) || 0), vendor: l.vendor_name || "",
        partial: Number(l.received_qty) > 0, rate: Number(l.rate) || 0,
        day: dayOf(l.expected_delivery), by: "",
      }));
      return [...poLines, ...mrs.flatMap((mr) => (mr.items || []).filter((it) => !it.on_store_po).map((it) => {
        const ordered = Number(it.qty) || 0;
        const received = Number(it.received_qty) || 0;
        return {
          key: "wh:" + it.id, kind: "wh", whMrId: mr.id, whMrItemId: it.id,
          label: mr.mr_no || "MR-" + mr.id, material: it.material_name || "",
          unit: it.unit || "", ordered, received, pending: Math.max(0, ordered - received),
          vendor: mr.vendor || "", partial: mr.status === "PartialReceived",
          rate: Number(it.rate) || 0,
          day: dayOf(mr.expected_date) || dayOf(mr.proc_expected_delivery), by: mr.requested_by_name || "",
        };
      }))];
    }
    const pid = encodeURIComponent(dest?.projectId || "");
    const [a, b] = await Promise.all([
      api.get("/procurement/mrs?project_id=" + pid + "&stage=Ordered"),
      api.get("/procurement/mrs?project_id=" + pid + "&mat_status=PartialReceived"),
    ]);
    const mrs = dedupe([...(a?.success ? a.data || [] : []), ...(b?.success ? b.data || [] : [])]);
    // Pending server ka pending_qty (MR qty − godown wala hissa − isi MR ke GRN) — wahi jo
    // "Maal aa gaya" server par maanta hai; purane server par ordered − received (MAT-22).
    const pendingOf = (m) => {
      const ordered = Number(m.quantity) || 0, received = Number(m.received_qty) || 0;
      const n = m.pending_qty != null ? Number(m.pending_qty) : ordered - received;
      return Math.max(0, Math.round((Number.isFinite(n) ? n : 0) * 1000) / 1000);
    };
    // Jis MR ka poora baaki maal godown se aa raha hai wo yahan nahi — wo "Issues from
    // Warehouse" me receive hota hai (server bhi yahan se rokta hai).
    return mrs.filter((m) => !(Number(m.warehouse_routed_qty) > 0 && pendingOf(m) <= 0)).map((m) => {
      const ordered = Number(m.quantity) || 0;
      const received = Number(m.received_qty) || 0;
      return {
        key: "mr:" + m.id, kind: "mr", mrId: m.id, linkedPoId: m.linked_po_id || null,
        label: m.mr_number || "MR-" + m.id, material: m.item_name || "",
        unit: m.unit || "", ordered, received, pending: pendingOf(m),
        vendor: m.linked_vendor || "", partial: m.mat_status === "PartialReceived",
        approxAmount: Number(m.approx_amount) || 0,
        day: dayOf(m.expected_delivery) || dayOf(m.po_expected_delivery), by: m.requested_by || "",
      };
    });
  } catch (_) { return []; }
}
