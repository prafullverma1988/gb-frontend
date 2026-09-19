// Settings → Roles & Access ki table se rok — frontend wala hissa.
//
// Niyam jaan-boojh kar wahi hain jo backend ka requirePerm middleware maanta
// hai (middleware/auth.js), taaki screen aur server ek jaisa sochein:
//   • admin / super_admin har rok se bahar
//   • jis module ki row hi nahi hai wo KHULA (unconfigured = blocked nahi)
//   • row hai to us action ka bit chahiye
//
// Ye sirf DIKHANE ka faisla karta hai. Asli rok server par hai — yahan chhupana
// isliye hai ki user ko wo button hi na mile jo dabane par 403 dega.

export function currentUser() {
  try { return JSON.parse(localStorage.getItem("gb_user") || "{}") || {}; }
  catch { return {}; }
}

export function can(moduleName, action = "view", user) {
  return canAny(moduleName, action, {}, user);
}

// Kuch route ek se zyada module maante hain — requirePerm(["Site / DPR","Projects"],
// "approve") ka matlab hai "in me se KISI EK me bit ho to chalne do". Aur
// `strict` wahan lagta hai jahan ek bhi row na milne par backend KHOLTA nahi,
// band karta hai (user/role prashasan jaisi jagah).
export function canAny(moduleNames, action = "view", { strict = false } = {}, user) {
  const u = user || currentUser();
  if (["admin", "super_admin"].includes(u?.role)) return true;
  const mods = Array.isArray(moduleNames) ? moduleNames : [moduleNames];
  const rows = mods.map((m) => u?.module_permissions?.[m]).filter((r) => r !== undefined);
  // unconfigured = khula — par Viewer ka matlab hi dekhne wala hai, wahan bina
  // row ke sirf view (server ka requirePerm bhi yahi maanta hai). Aur jo route
  // strict hai wahan bina row ke band, khula nahi.
  if (!rows.length) return !strict && (u?.role !== "viewer" || action === "view");
  return rows.some((r) => !!r[action]);
}

// Paisa ka vishleshan — company/project P&L, KPI patti, project Overview ka
// paisa hissa, Reports ka Progress & Financial, tender ka margin. Rozana ka
// Finance kaam (party payment, bill, receipt) isse alag hai.
export const canSeeFinancials = (user) => can("Financial Reports", "view", user);
