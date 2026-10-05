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

// module_permissions ki row — naam ka milaan case-insensitive, jaise server
// karta hai (Admin ki kuch purani rows lowercase me hain). null = row hi nahi.
export function permRow(user, moduleName) {
  const mp = (user && user.module_permissions) || {};
  if (mp[moduleName] != null) return mp[moduleName];
  const want = String(moduleName).toLowerCase();
  const key = Object.keys(mp).find((k) => k.toLowerCase() === want);
  return key != null && mp[key] != null ? mp[key] : null;
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
  const rows = mods.map((m) => permRow(u, m)).filter((r) => r != null);
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

// Roz ki entry (5 Oct 2026, Roles & Access plan): server transition me
// "entry YA create" dono maanta hai (middleware/auth.js entryOrCreate) —
// screen bhi wahi maane, warna button chhup jaata jo server allow karta hai.
export const canEntry = (moduleNames, user) =>
  canAny(moduleNames, "entry", {}, user) || canAny(moduleNames, "create", {}, user);
