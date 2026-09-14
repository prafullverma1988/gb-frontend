// Team & HR → Salary: Monthly Salary table, "Slip" aur Overview tiles ek hi
// server hisaab se — GET /payroll/run/salary-sheet (mahina finalize ho to frozen
// run items, warna Create Salary preview wala computeRun). Yahan koi salary
// formula NAHI hai: sirf server ke item se screen ki line/rakam chunni hai, taaki
// slip = table = run hamesha ek rahe. (Pehle teeno jagah alag formula tha —
// HR-03, HR-10, HR-24.)

const n = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Server ka mahina 1-12; screen ka month picker JS wala 0-11.
export const apiMonth = (jsMonth) => Number(jsMonth) + 1;

// Ek staff ki table wali line.
export function rowOf(item) {
  const b = (item && item.breakdown) || {};
  const e = b.earnings || {};
  return {
    staffId: item.staff_id,
    payType: item.payment_type === "attendance" ? "attendance" : "fixed",
    basic: n(e.basic),
    fullGross: n(item.full_gross),
    gross: n(item.gross_earned),
    ot: n(item.ot_amount),
    otHours: n(item.ot_hours),
    pf: n(item.pf),
    esi: n(item.esi),
    tds: n(item.tds),
    advance: n(item.advance_deducted),
    advanceLeft: n(item.advance_remaining),
    adjustment: n(item.adjustment),
    edited: !!item.salary_edit,
    computedNet: item.salary_edit ? n(item.salary_edit.computed_net) : n(item.net_amount),
    net: n(item.net_amount),
    P: n(item.days_present), H: n(item.days_half), A: n(item.days_absent),
    paidLeave: n(item.days_paid_leave), holidays: n((b.attendance || {}).holidays),
    payable: n(item.payable_days),
  };
}

// Paid / Partial / Pending sirf finalize hue mahine me (run item + settlement);
// khule mahine me abhi kuch dena banta hi nahi → "open".
export function payStateOf(item, locked) {
  if (!locked || !item || !item.run_item_id) return "open";
  const net = n(item.net_amount), settled = n(item.settled);
  if (item.pay_status === "hold") return "hold";
  if (item.pay_status === "paid" || (net > 0 && settled >= net)) return "paid";
  if (item.pay_status === "partial" || settled > 0) return "partial";
  return net > 0 ? "pending" : "paid";
}

// Slip ki lines — earnings/deductions sirf jo rakam hai; gross − katauti ± adjustment = net.
export function slipOf(item) {
  const r = rowOf(item);
  const e = ((item && item.breakdown) || {}).earnings || {};
  const earnings = [
    ["basic", e.basic], ["hra", e.hra], ["conveyance", e.conveyance], ["medical", e.medical],
    ["phone", e.phone], ["petrol", e.petrol], ["special", e.special],
  ].filter(([, v]) => n(v) > 0).map(([k, v]) => [k, n(v)]);
  const deductions = [["pf", r.pf], ["esi", r.esi], ["tds", r.tds], ["advance", r.advance]].filter(([, v]) => v > 0);
  const totalDeductions = n(r.pf + r.esi + r.tds + r.advance);
  return {
    ...r,
    earnings,
    deductions,
    totalDeductions,
    grossWithOt: n(r.gross + r.ot),
    // server ne net 0 par roka ho (katauti > kamai) to bhi slip wahi net dikhaye
    net: r.net,
  };
}

// Overview tiles: "Monthly Net Payroll" aur "Salary Pending".
export function tilesOf(sheet) {
  const tot = (sheet && sheet.totals) || {};
  return {
    net: n(tot.total_net),
    pendingNet: n(tot.pending_net),
    pendingCount: Number(tot.pending_count) || 0,
    paidCount: Number(tot.paid_count) || 0,
    locked: !!(sheet && sheet.locked),
  };
}
