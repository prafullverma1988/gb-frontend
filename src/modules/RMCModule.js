// ══════════════════════════════════════════════════════════════════════
// RMC PLANT — concrete ka poora hisaab: order, challan, site par accept.
//
// Ye sirf shell hai — tab bar, permission, /rmc/meta aur /rmc/dashboard ka
// ek load. Har screen apni file me hai (src/modules/rmc/…), kyunki arrangement
// ka form aur challan ka detail dono apne aap me bade hain.
//
// Screen ka niyam ek hi jagah se aata hai — arrangement ki "kiska kya" matrix:
//   supply_material !== "own"  → challan par maal ka koi hisaab nahi
//   supply_vehicle === "customer" → transport ka paisa nahi
//   plant.owner === "vendor"   → challan site par darj hota hai
//
// Phase 2 me ginti (plant ka asli stock) aur bill jud gaye — stock sirf ginti
// ke APPROVE par sudhrta hai aur Finance me entry bill ke APPROVE par banti
// hai. API contract: gb-backend/docs/plans/rmc-api-phase1.md aur -phase2.md
//
// Phase 3 me cube ka register (7/28 din), bahar bechne ka GST invoice, aur
// plant ki batch sheet ka import aaya. Bikri Bills tab ke andar doosre section
// me hai (tab bar aur lambi na ho), batch sheet aur TM ka chakkar Reports me.
// Contract: gb-backend routes/rmc.js ka "PHASE 3" hissa.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from "react";
import { getUser } from "../config/api";
import { t } from "../i18n";
import { T, SubTabs, rget, dataOf, IcChart, IcDoc, IcTruck, IcSet, IcList, IcRefresh, IcBox, IcRupee, IcChk } from "./rmc/rmcShared";
import RmcDashboard from "./rmc/RmcDashboard";
import RmcOrders from "./rmc/RmcOrders";
import RmcChallans from "./rmc/RmcChallans";
import RmcSetup from "./rmc/RmcSetup";
import RmcReports from "./rmc/RmcReports";
import RmcCounts from "./rmc/RmcCounts";
import RmcBills from "./rmc/RmcBills";
import RmcSales from "./rmc/RmcSales";
import RmcCubes from "./rmc/RmcCubes";

function RMCModule() {
  const me = useMemo(() => getUser() || {}, []);
  const isAdmin = ["admin", "super_admin"].includes(String(me.role || "").toLowerCase());
  // Permission row na ho (Settings me abhi RMC ki row nahi bani) to khula —
  // backend bhi yahi karta hai (requirePerm fail-open).
  const permRow = (me.module_permissions || {}).RMC;
  const can = (k) => isAdmin || permRow === undefined || !!(permRow && permRow[k]);
  const canCreate = can("create"), canEdit = can("edit"), canApprove = can("approve"), canDelete = can("delete");

  const [tab, setTab] = useState("dashboard");
  const [setupSub, setSetupSub] = useState("plants");
  const [reportSub, setReportSub] = useState("production");
  const [billSub, setBillSub] = useState("vendor");
  const [meta, setMeta] = useState(null);
  const [dash, setDash] = useState(null);
  const [todo, setTodo] = useState({ counts: 0, bills: 0, cubeDue: 0, cubeFailed: 0, review: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [openChallanId, setOpenChallanId] = useState(null);

  // Tab par jo ginti banaye baithi hai, jo bill/invoice abhi Finance me nahi
  // gaya, aur jis cube ka result baaki hai — teeno dashboard se nahi aate,
  // isliye yahin chhoti list gin lete hain. Cube ka due/failed server hi
  // ginta hai (cube-register ka summary), screen dobara nahi ginti.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [m, d, c, b, s, q] = await Promise.all([
      rget("/meta"), rget("/dashboard"),
      rget("/stock-checks", { status: "pending" }), rget("/bills", { status: "draft" }),
      rget("/sales", { status: "draft" }), rget("/reports/cube-register"),
    ]);
    setMeta(dataOf(m, { plants: [], contracts: [], designs: [], vehicles: [], machines: [], materials: [], projects: [], parties: [], warehouses: [], options: {} }));
    setDash(dataOf(d, null));
    const cubeSum = (dataOf(q, {}) || {}).summary || {};
    setTodo({
      counts: (dataOf(c, []) || []).length,
      bills: (dataOf(b, []) || []).length + (dataOf(s, []) || []).length,
      cubeDue: Number(cubeSum.due) || 0,
      cubeFailed: Number(cubeSum.failed) || 0,
      review: Number(cubeSum.review_pending) || 0,
    });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = useCallback(() => { load(true); setRefreshKey((k) => k + 1); }, [load]);

  const goSetup = useCallback((sub) => { setSetupSub(sub); setTab("setup"); }, []);
  const openChallan = useCallback((id) => { setOpenChallanId(id); setTab("challans"); }, []);
  const openOrder = useCallback((id) => { setOpenOrderId(id); setTab("orders"); }, []);

  const pendingOrders = dash && dash.pending_orders ? dash.pending_orders.length : 0;
  const onRoad = dash && dash.in_transit ? dash.in_transit.length : 0;
  const TABS = [
    { id: "dashboard", l: t("rmc.tab_dashboard"), I: IcChart },
    { id: "orders", l: t("rmc.tab_orders"), I: IcDoc, badge: pendingOrders || null },
    { id: "challans", l: t("rmc.tab_challans"), I: IcTruck, badge: onRoad || null },
    { id: "counts", l: t("rmc.tab_counts"), I: IcBox, badge: todo.counts || null },
    // Bitumen ho to isi tab me Marshall bhi — naam dono bolta hai.
    { id: "cube", l: (meta && ((meta.plants || []).some((p) => p.product_kind === "bitumen"))) ? t("rmc.tab_qc") : t("rmc.tab_cube"),
      I: IcChk, badge: (todo.cubeDue + todo.review) || null, red: todo.cubeFailed || null },
    { id: "bills", l: t("rmc.tab_bills"), I: IcRupee, badge: todo.bills || null },
    { id: "setup", l: t("rmc.tab_setup"), I: IcSet },
    { id: "reports", l: t("rmc.tab_reports"), I: IcList },
  ];
  const BILL_SUBS = [
    { id: "vendor", l: t("rmc.bills_vendor") },
    { id: "sales", l: t("rmc.bills_sales") },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "rmc-spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#8896A6" }}>{t("rmc.loading")}</div>
      <style>{`@keyframes rmc-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const m = meta || {};
  return (
    <div style={{ background: T.bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 20px" }}>
        <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16, overflowX: "auto" }}>
          {TABS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTab(x.id)}
              style={{ padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", color: tab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${tab === x.id ? T.ind : "transparent"}` }}>
              <x.I size={13} color="currentColor" />{x.l}
              {x.badge > 0 && <span style={{ fontSize: 10, background: T.ambL, color: T.amb, borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>{x.badge}</span>}
              {/* Fail hua cube amber me chhup jaata hai — isliye uska apna laal nishaan. */}
              {x.red > 0 && <span style={{ fontSize: 10, background: T.redL, color: T.red, borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>{x.red}</span>}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={refresh} title={t("common.refresh")}
            style={{ border: "none", background: "none", cursor: "pointer", color: T.t3, fontFamily: "inherit", fontSize: 11.5, padding: "9px 6px", display: "flex", alignItems: "center", gap: 5 }}>
            <IcRefresh size={12} color="currentColor" />{t("common.refresh")}
          </button>
        </div>

        {tab === "dashboard" && (
          <RmcDashboard dash={dash} onGo={setTab} onOpenChallan={openChallan} onOpenOrder={openOrder} />
        )}
        {tab === "orders" && (
          <RmcOrders meta={m} canCreate={canCreate} canApprove={canApprove} refreshKey={refreshKey}
            onRefresh={refresh} openId={openOrderId} onOpenDone={() => setOpenOrderId(null)} />
        )}
        {tab === "challans" && (
          <RmcChallans meta={m} canCreate={canCreate} canDelete={canDelete} refreshKey={refreshKey}
            onRefresh={refresh} openId={openChallanId} onOpenDone={() => setOpenChallanId(null)} onGoSetup={goSetup} />
        )}
        {tab === "counts" && (
          <RmcCounts meta={m} canCreate={canCreate} canApprove={canApprove}
            refreshKey={refreshKey} onRefresh={refresh} />
        )}
        {tab === "cube" && (
          <RmcCubes meta={m} canCreate={canCreate} refreshKey={refreshKey} onRefresh={refresh} />
        )}
        {tab === "bills" && (<>
          <SubTabs tabs={BILL_SUBS} value={billSub} onChange={setBillSub} />
          {billSub === "vendor" ? (
            <RmcBills meta={m} canCreate={canCreate} canEdit={canEdit} canApprove={canApprove}
              canDelete={canDelete} refreshKey={refreshKey} onRefresh={refresh} />
          ) : (
            <RmcSales meta={m} canCreate={canCreate} canApprove={canApprove}
              canDelete={canDelete} refreshKey={refreshKey} onRefresh={refresh} />
          )}
        </>)}
        {tab === "setup" && (
          <RmcSetup meta={m} canCreate={canCreate} canEdit={canEdit} onChanged={refresh}
            sub={setupSub} onSub={setSetupSub} />
        )}
        {tab === "reports" && <RmcReports meta={m} sub={reportSub} onSub={setReportSub} canCreate={canCreate} />}
      </div>
    </div>
  );
}

export default RMCModule;
