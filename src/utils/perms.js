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
  const u = user || currentUser();
  if (["admin", "super_admin"].includes(u?.role)) return true;
  const row = u?.module_permissions?.[moduleName];
  if (row === undefined) return true;          // unconfigured = khula
  return !!row[action];
}

// Paisa ka vishleshan — company/project P&L, KPI patti, project Overview ka
// paisa hissa, Reports ka Progress & Financial, tender ka margin. Rozana ka
// Finance kaam (party payment, bill, receipt) isse alag hai.
export const canSeeFinancials = (user) => can("Financial Reports", "view", user);
