// GRN ke liye "ordered" maal — site ho ya godown, ek hi shakal me.
//
// Site:   procurement ki MR (ek MR = ek material). Receive = mark-received.
// Godown: warehouse MR (ek MR me kai item). Receive = /warehouse/mr/:id/grn.
// Form ko is farq se matlab nahi — use sirf "line" chahiye.
import api from "../../config/api";

const dedupe = (rows) => {
  const seen = new Set();
  return rows.filter((r) => { if (!r || seen.has(r.id)) return false; seen.add(r.id); return true; });
};

export async function loadOrderedLines(dest) {
  try {
    if (dest?.type === "warehouse") {
      const [a, b] = await Promise.all([
        api.get("/warehouse/mr?type=warehouse&status=Ordered"),
        api.get("/warehouse/mr?type=warehouse&status=PartialReceived"),
      ]);
      const mrs = dedupe([...(a?.success ? a.data || [] : []), ...(b?.success ? b.data || [] : [])]);
      return mrs.flatMap((mr) => (mr.items || []).map((it) => {
        const ordered = Number(it.qty) || 0;
        const received = Number(it.received_qty) || 0;
        return {
          key: "wh:" + it.id, kind: "wh", whMrId: mr.id, whMrItemId: it.id,
          label: mr.mr_no || "MR-" + mr.id, material: it.material_name || "",
          unit: it.unit || "", ordered, received, pending: Math.max(0, ordered - received),
          vendor: mr.vendor || "", partial: mr.status === "PartialReceived",
          rate: Number(it.rate) || 0,
        };
      }));
    }
    const pid = encodeURIComponent(dest?.projectId || "");
    const [a, b] = await Promise.all([
      api.get("/procurement/mrs?project_id=" + pid + "&stage=Ordered"),
      api.get("/procurement/mrs?project_id=" + pid + "&mat_status=PartialReceived"),
    ]);
    const mrs = dedupe([...(a?.success ? a.data || [] : []), ...(b?.success ? b.data || [] : [])]);
    return mrs.map((m) => {
      const ordered = Number(m.quantity) || 0;
      const received = Number(m.received_qty) || 0;
      return {
        key: "mr:" + m.id, kind: "mr", mrId: m.id,
        label: m.mr_number || "MR-" + m.id, material: m.item_name || "",
        unit: m.unit || "", ordered, received, pending: Math.max(0, ordered - received),
        vendor: m.linked_vendor || "", partial: m.mat_status === "PartialReceived",
        approxAmount: Number(m.approx_amount) || 0,
      };
    });
  } catch (_) { return []; }
}
