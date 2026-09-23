// "Approve ka button dikhana bhi chahiye ya nahi" — jawab server se.
//
// Rok do jagah se aati hai aur DONO alag hain:
//   • module_permissions (Settings → Roles & Access) — utils/perms.js ka can()
//   • approval workflow ke level ki allowed_roles — Settings → Approval Flow
// Approve/Reject ka asli faisla DOOSRI wali karti hai (backend:
// utils/checkWorkflowRole.js aur engine ka applyApprovalAction). Screen ke
// paas ye jaankari thi hi nahi, isliye button sabko dikhta tha aur dabane par
// 403 "approve karne ki permission nahi" aata tha.
//
// GET /approvals/my-authority wahi niyam chala kar module-wise jawab deta hai.
// Yahan use cache karke rakhte hain taaki render ke waqt turant mil jaaye.
//
// FAIL-CLOSED: jawab aane tak button CHHUPA rehta hai. Galti se ek pal ko
// chhupa dikhe ye theek hai; galti se aise aadmi ko dikhe jo daba nahi sakta,
// wo bug hai — wahi thik kar rahe hain. admin / super_admin pehle hi nikal
// jaate hain, unke liye intezaar hai hi nahi.
import { useState, useEffect } from "react";
import api from "../config/api";
import { currentUser, canAny } from "./perms";

const LS_KEY = "gb_appr_authority";
let cache = readLS();
let inflight = null;
const subs = new Set();

function readLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function writeLS(v) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (_) {}
}
const isAdmin = (u) => ["admin", "super_admin"].includes(u?.role);
const normRole = (r) => (r || "").toLowerCase().replace(/[\s-]+/g, "_");
// Role badalne par purana jawab kaam ka nahi (role live DB se badal sakta hai).
const fresh = (u) => (cache && cache.role === u?.role ? cache : null);

/** Server se authority laao (login ke baad aur permissions refresh par). */
export async function loadApprovalAuthority(force = false) {
  const u = currentUser();
  if (!force && fresh(u)) return cache;
  if (inflight) return inflight;
  inflight = api.get("/approvals/my-authority")
    .then((r) => {
      const d = r?.data?.data || r?.data;
      if (d && d.modules) { cache = d; writeLS(d); subs.forEach((f) => { try { f(); } catch (_) {} }); }
      return cache;
    })
    .catch(() => cache)
    .finally(() => { inflight = null; });
  return inflight;
}

/** Logout / company switch par purana jawab phenk do. */
export function clearApprovalAuthority() {
  cache = null;
  try { localStorage.removeItem(LS_KEY); } catch (_) {}
}

/**
 * Kya ye user is module me approve/reject kar sakta hai?
 * @param workflowModule approval_workflows.module ka naam ("Material Request")
 */
export function canApproveModule(workflowModule, user) {
  const u = user || currentUser();
  if (isAdmin(u)) return true;
  const c = fresh(u);
  if (!c) { loadApprovalAuthority(); return false; }   // jawab aane tak chhupa
  const row = c.modules?.[workflowModule];
  if (!row) return false;      // workflow hi nahi → backend admin-only par girta hai
  return !!row.can;
}

/**
 * Ek hi sawal, har approve button ke liye: "ye button dikhana chahiye?"
 * Jaanch bilkul wahi lagti hai jo US route par server lagata hai — na kam,
 * na zyada. Zyada lagayenge to jo sach me approve kar sakta hai uska button
 * gayab ho jayega; kam lagayenge to wahi 403 wala bug wapas aa jayega.
 *
 *   workflow — approval_workflows ka module            (backend: checkWorkflowRole / engine)
 *   perm     — [module(s), action, opts?]              (backend: requirePerm)
 *              module ek naam ya list; list = "kisi ek me bit ho to chalega".
 *              opts.strict wahi hai jo requirePerm ka strict.
 *   roles    — role slugs ki list                      (backend: requireRole)
 */
export function canApproveAction({ workflow, perm, roles } = {}, user) {
  const u = user || currentUser();
  if (isAdmin(u)) return true;
  const mine = normRole(u?.role);
  if (roles && !roles.map(normRole).includes(mine)) return false;
  if (perm && !canAny(perm[0], perm[1] || "approve", perm[2] || {}, u)) return false;
  if (workflow && !canApproveModule(workflow, u)) return false;
  return true;
}

/** "Project Manager / Admin" — kiska intezaar hai, ye batane ke liye. */
export function approverRolesFor(workflowModule, user) {
  const c = fresh(user || currentUser());
  const row = c?.modules?.[workflowModule];
  return row && row.roles?.length ? row.roles.join(" / ") : "";
}

/** Jawab aate hi component dobara render ho jaye. */
export function useApprovalAuthority() {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    subs.add(f);
    loadApprovalAuthority();
    return () => subs.delete(f);
  }, []);
  return cache;
}
