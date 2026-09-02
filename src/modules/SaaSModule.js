// SaaS Admin — super-admin platform management.
//
// Split into src/modules/saas/* after the tab merge: the shared primitives,
// the company detail surface and the Customers surface each own a file, and
// this one keeps the shell plus the platform-wide tabs.
import { useState, useEffect, useCallback } from "react";
import { BundleView, TicketBadge, fmtTicketTime } from "./shared/TicketBundle";
import { apiFetch, T, fmtDate, fmtDateTime, fmtNum, fmtMoney,
         IcBuilding, IcUsers, IcTrend, IcPlus, IcX, IcChk,
         IcRefresh, IcLock, IcClip, IcDownload, IcShield, IcSearch, IcActivity,
         IcDollar, IcCog, IcChevR, IcChevL, IcFilter, IcLogin, th, td } from "./saas/tokens";
import { Toast, Toggle, StatCard, Badge, Btn, EmptyState, TableHeader, PageHeader } from "./saas/ui";
import CompanyDetailPage from "./saas/CompanyDetailPage";
import TabCustomers from "./saas/Customers";
import TabCompanies from "./saas/Companies";


// ════════════════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD / STATS
// ════════════════════════════════════════════════════════════════════════
// Platform ops — scheduler, email queue and the auto-email switch. These were
// the only genuinely useful controls on the old CRM & Health tab, so they moved
// onto the Dashboard rather than dying with it.
function PlatformOps({ setOuterToast }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch("/saas-admin/crm-dashboard").then(r => setD(r.success ? r.data : null)).catch(() => setD(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (path, label) => {
    setBusy(true);
    const res = await apiFetch(path, { method: "POST" });
    setBusy(false);
    setOuterToast({ msg: res.success ? (res.message || label + " done") : (res.message || label + " failed"), type: res.success ? "success" : "error" });
    load();
  };

  const toggleAutoEmails = async (next) => {
    await apiFetch("/saas-admin/platform-settings", { method: "PUT", body: { auto_emails_enabled: next } });
    setOuterToast({ msg: next ? "Auto emails ON" : "Auto emails OFF", type: "success" });
    load();
  };

  const em = d?.email_stats || {};
  const autoOn = String(d?.settings?.auto_emails_enabled ?? "1") === "1";

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Platform Ops</span>
        <IcCog size={14} color={T.t4}/>
      </div>
      <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>Auto emails</div>
            <div style={{ fontSize:10.5, color:T.t4 }}>{em.sent || 0} sent · {em.queued || 0} queued · {em.failed || 0} failed</div>
          </div>
          <Toggle value={autoOn} onChange={toggleAutoEmails}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, borderTop:`1px solid ${T.b1}`, paddingTop:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>Scheduler</div>
            <div style={{ fontSize:10.5, color:T.t4 }}>Last run: {d?.last_scheduler_run ? fmtDateTime(d.last_scheduler_run) : "never"}</div>
          </div>
          <div style={{ display:"flex", gap:7 }}>
            <Btn variant="outline" disabled={busy} onClick={() => run("/saas-admin/email-queue/flush", "Flush emails")} style={{ padding:"5px 10px", fontSize:11 }}>Flush Emails</Btn>
            <Btn disabled={busy} onClick={() => run("/saas-admin/scheduler/run", "Scheduler")} style={{ padding:"5px 10px", fontSize:11 }}>{busy ? "..." : "Run Now"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── "IS HAFTE KA KAAM" ────────────────────────────────────────────────
// Ek line, Dashboard ke sabse upar. TabStats ke ANDAR nahi rakha: wo apne
// loading/error par poora return kar deta hai, aur tab ye strip gayab ho jata.
// Jahan ginti 0 hai wo chip dikhta hi nahi — 0 dikhana shor hai, kaam nahi.
function WeeklyWork({ onJump }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    apiFetch("/support-bot/saas/weekly-work")
      .then(r => setItems(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]));
  }, []);

  if (!items) return null;
  const live = items.filter(i => Number(i.n) > 0);
  if (!live.length) return null;

  return (
    <div style={{ padding:"14px 24px 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
        background:T.surface, border:`1px solid ${T.b1}`, borderRadius:9, padding:"9px 14px" }}>
        <span style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>
          Is hafte ka kaam
        </span>
        {live.map(i => (
          <button key={i.key} onClick={() => onJump && onJump(i.tab)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 9px", borderRadius:6,
              border:`1px solid ${i.warn ? T.redM : T.b1}`, background:i.warn ? T.redL : T.surfaceB,
              cursor:"pointer", fontFamily:"inherit" }}>
            <span style={{ fontSize:12.5, fontWeight:700, color:i.warn ? T.red : T.t1 }}>{i.n}</span>
            <span style={{ fontSize:11.5, color:i.warn ? T.red : T.t3 }}>{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TabStats() {
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/saas-admin/stats"),
      apiFetch("/saas-admin/metrics"),
    ]).then(([r1, r2]) => {
      setData(r1.success ? r1.data : null);
      setMetrics(r2.success ? r2.data : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  };
  const daysSince = (dateStr) => {
    if (!dateStr) return "Never";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    return diff === 0 ? "Today" : `${diff}d ago`;
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading platform data...</div>;
  if (!data) return (
    <div style={{ textAlign:"center", padding:60 }}>
      <div style={{ color:T.red, fontSize:14, fontWeight:600, marginBottom:8 }}>Failed to load stats</div>
      <Btn onClick={load} variant="outline" style={{ margin:"0 auto" }}><IcRefresh size={13}/> Retry</Btn>
    </div>
  );

  const actionIcon = a => {
    const map = { LOGIN: IcLogin, CREATE: IcPlus, UPDATE: IcCog, DELETE: IcX, EXPORT: IcDownload, DEACTIVATE: IcX, REACTIVATE: IcChk };
    const C = map[a] || IcActivity;
    return <C size={13}/>;
  };
  const actionColor = a => ({ LOGIN:T.blu, CREATE:T.grn, UPDATE:T.amb, DELETE:T.red, EXPORT:T.pur, DEACTIVATE:T.red, REACTIVATE:T.grn }[a] || T.slt);

  const kpi = metrics?.kpi || {};

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Platform Overview" sub="Revenue, billing gaps and platform health" right={
        <Btn onClick={load} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Money — all of it from real client contracts (utils/saasRevenue.js) */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:12 }}>
        <StatCard label="MRR"          value={"₹" + fmtMoney(kpi.mrr || 0)}         sub={`ARR: ₹${fmtMoney(kpi.arr || 0)} · ${kpi.active_subs || 0} contracts`} color={T.grn} Icon={IcDollar}/>
        <StatCard label="Collected"    value={"₹" + fmtMoney(kpi.collected || 0)}   sub="paid invoices, incl. GST" color={T.cyn} Icon={IcChk}/>
        <StatCard label="Outstanding"  value={"₹" + fmtMoney(kpi.outstanding || 0)}
          sub={kpi.overdue_count > 0 ? `${kpi.overdue_count} overdue · ₹${fmtMoney(kpi.overdue)}` : "nothing overdue"}
          color={kpi.overdue_count > 0 ? T.red : T.amb} Icon={IcActivity}/>
        {/* Replaces the old "Free Trial" card. Trials were counted from the
            legacy plan table that nothing enforces; an unbilled live customer
            is the number that actually costs money. */}
        <StatCard label="Billing Gaps" value={fmtNum(kpi.billing_gap_count || 0)}
          sub={kpi.billing_gap_count > 0 ? "live but not billed" : "every customer is billed"}
          color={kpi.billing_gap_count > 0 ? T.amb : T.grn} Icon={IcClip}/>
      </div>

      {/* Tenancy + health */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        <StatCard label="Companies"     value={fmtNum(kpi.total || data.companies.total)} sub={`${kpi.billed || 0} billed · ${kpi.unbilled || 0} unbilled`} color={T.pur} Icon={IcBuilding}/>
        <StatCard label="Total Users"   value={fmtNum(data.users.total)}          sub={`${data.users.active||0} active`} color={T.cyn} Icon={IcUsers}/>
        <StatCard label="Expiring Soon" value={fmtNum(kpi.expiring_count || 0)}   sub="contracts, next 30 days" color={T.amb} Icon={IcActivity}/>
        <StatCard label="Churn Risk"    value={fmtNum(kpi.churn_risk_count || 0)} sub="no login 15+ days" color={T.red} Icon={IcShield}/>
      </div>

      {/* Retention alerts row */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          {/* Billing gaps — replaces "Trial Ending Soon", which counted rows in
              the legacy plan table. This is the state that actually loses money:
              a customer working normally that nobody is invoicing. */}
          <div style={{ background:T.surface, border:`1px solid ${T.ambM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.ambL, borderBottom:`1px solid ${T.ambM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.amb }}>Billing gaps</span>
              <span style={{ fontSize:10, color:T.amb, fontWeight:600 }}>{(metrics.billing_gaps||[]).length} customers</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.billing_gaps||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>Every live customer is billed</div>}
              {(metrics.billing_gaps||[]).map((c, i) => (
                <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize:10, color:T.t4 }}>{c.company_count} {c.company_count === 1 ? "company" : "companies"}</div>
                  </div>
                  <Badge text={c.sub_status ? c.sub_status.toUpperCase() : "NO SUB"} color={T.amb}/>
                </div>
              ))}
            </div>
          </div>

          {/* Expiring subscriptions */}
          <div style={{ background:T.surface, border:`1px solid ${T.bluM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.bluL, borderBottom:`1px solid ${T.bluM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.blu }}>📅 Expiring Soon (7d)</span>
              <span style={{ fontSize:10, color:T.blu, fontWeight:600 }}>{(metrics.expiring_soon||[]).length} subs</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.expiring_soon||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>None expiring</div>}
              {(metrics.expiring_soon||[]).map((c, i) => {
                const d = daysUntil(c.end_date);
                return (
                  <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      {/* Client contract, not a per-company plan row */}
                      <div style={{ fontSize:10, color:T.t4 }}>
                        ₹{fmtMoney(c.base_annual_value)}/yr · {c.company_count} {c.company_count === 1 ? "company" : "companies"}
                      </div>
                    </div>
                    <Badge text={d <= 0 ? "Today" : `${d}d`} color={d <= 2 ? T.red : T.blu}/>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Churn risk */}
          <div style={{ background:T.surface, border:`1px solid ${T.redM}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:T.redL, borderBottom:`1px solid ${T.redM}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.red }}>⚠️ Churn Risk</span>
              <span style={{ fontSize:10, color:T.red, fontWeight:600 }}>{(metrics.churn_risk||[]).length} at risk</span>
            </div>
            <div style={{ maxHeight:200, overflowY:"auto" }}>
              {(metrics.churn_risk||[]).length === 0 && <div style={{ padding:20, textAlign:"center", color:T.t4, fontSize:11 }}>All customers active ✓</div>}
              {(metrics.churn_risk||[]).map((c, i) => (
                <div key={i} style={{ padding:"9px 14px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize:10, color:T.t4 }}>{c.client_name || "no client"}</div>
                  </div>
                  <span style={{ fontSize:10, color:T.red, fontWeight:600 }}>{daysSince(c.last_login)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MRR trend + Top customers */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:16, marginBottom:20 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>MRR Trend (6 months)</span>
            </div>
            <div style={{ padding:"16px" }}>
              {(metrics.mrr_trend||[]).length === 0 ? (
                <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"30px 0" }}>No subscription revenue data yet</div>
              ) : (
                <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:140 }}>
                  {metrics.mrr_trend.map((g, i) => {
                    const max = Math.max(...metrics.mrr_trend.map(x => parseFloat(x.mrr)||0), 1);
                    const v = parseFloat(g.mrr) || 0;
                    const h = (v / max) * 100;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:T.grn }}>₹{fmtMoney(v)}</div>
                        <div style={{ width:"100%", height:`${Math.max(h, 6)}%`, background:`linear-gradient(180deg, ${T.grn}, ${T.grnM})`, borderRadius:4 }}/>
                        <div style={{ fontSize:9, color:T.t4, whiteSpace:"nowrap" }}>{g.month.split("-")[1]}/{g.month.split("-")[0].slice(2)}</div>
                        <div style={{ fontSize:9, color:T.t4 }}>+{g.new_subs}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Top Customers by Revenue</span>
            </div>
            <div style={{ maxHeight:220, overflowY:"auto" }}>
              {(metrics.top_customers||[]).length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No paid customers yet</div>}
              {(metrics.top_customers||[]).map((c, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 16px", borderBottom:`1px solid ${T.b1}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:T.grnL, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.grn, flexShrink:0 }}>#{i+1}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize:10, color:T.t4 }}>
                        {c.company_count} {c.company_count === 1 ? "company" : "companies"} · {c.user_count} users
                        {parseFloat(c.total_paid) > 0 ? ` · ₹${fmtMoney(c.total_paid)} collected` : " · nothing collected yet"}
                      </div>
                    </div>
                  </div>
                  {/* Contracted annual value — the honest ranking key. "Collected"
                      stays in the subtitle because invoices may not be paid yet. */}
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.grn }}>₹{fmtMoney(c.acv)}</div>
                    <div style={{ fontSize:9.5, color:T.t4 }}>ACV / yr</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        {/* Company breakdown */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Company Overview</span>
            <span style={{ fontSize:11, color:T.t4 }}>{data.company_stats?.length || 0} total</span>
          </div>
          <div style={{ maxHeight:280, overflowY:"auto" }}>
            {(data.company_stats||[]).map((c, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 60px 60px 90px", padding:"9px 16px", borderBottom:`1px solid ${T.b1}`, alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <div style={{ width:30, height:30, borderRadius:7, background: c.is_active ? T.bluL : T.redL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:12, fontWeight:700, color: c.is_active ? T.blu : T.red }}>{c.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:T.t1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:150 }}>{c.name}</div>
                    <Badge text={c.is_active ? "Active" : "Inactive"} color={c.is_active ? T.grn : T.red}/>
                  </div>
                </div>
                <div style={{ fontSize:12, color:T.t2, textAlign:"center" }}>{c.users} <span style={{fontSize:9,color:T.t4}}>users</span></div>
                <div style={{ fontSize:12, color:T.t2, textAlign:"center" }}>{c.projects} <span style={{fontSize:9,color:T.t4}}>proj</span></div>
                <div style={{ fontSize:12, fontWeight:600, color:T.grn, textAlign:"right" }}>{fmtMoney(c.revenue)}</div>
              </div>
            ))}
            {(!data.company_stats || data.company_stats.length === 0) && (
              <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No companies yet</div>
            )}
          </div>
        </div>

        {/* Platform Ops — the useful half of the old CRM & Health tab.
            The rest of that tab (health distribution, at-risk list) duplicated
            the churn-risk card above, so it went with the tab. */}
        <PlatformOps setOuterToast={setToast}/>

        {/* Recent audit activity */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Recent Activity</span>
            <IcActivity size={14} color={T.t4}/>
          </div>
          <div style={{ maxHeight:280, overflowY:"auto" }}>
            {(data.recent_audit||[]).length === 0 && (
              <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No activity yet. Audit logging is active!</div>
            )}
            {(data.recent_audit||[]).map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 16px", borderBottom:`1px solid ${T.b1}` }}>
                <div style={{ width:28, height:28, borderRadius:7, background:actionColor(a.action)+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, color:actionColor(a.action) }}>
                  {actionIcon(a.action)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:T.t1 }}>
                    <strong>{a.user_name || "System"}</strong>{" "}
                    <span style={{ color:actionColor(a.action), fontWeight:600, fontSize:11 }}>{a.action}</span>{" "}
                    <span style={{ color:T.t3 }}>{a.entity_type}</span>
                    {a.entity_id && <span style={{ color:T.t4 }}> #{a.entity_id}</span>}
                  </div>
                  <div style={{ fontSize:10, color:T.t4, marginTop:1 }}>
                    {a.company_name || "Platform"} · {fmtDateTime(a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module usage + growth */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Module usage */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Module Adoption</span>
          </div>
          <div style={{ padding:"12px 16px" }}>
            {(data.module_usage||[]).length === 0 && <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"20px 0" }}>No modules assigned yet</div>}
            {(data.module_usage||[]).map((m, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:90, fontSize:12, color:T.t2, fontWeight:500, textTransform:"capitalize" }}>{m.module_key}</div>
                <div style={{ flex:1, height:6, background:T.b1, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min((m.company_count / Math.max(data.companies.total,1))*100, 100)}%`, background:T.blu, borderRadius:3 }}/>
                </div>
                <div style={{ width:24, fontSize:11, fontWeight:700, color:T.t1, textAlign:"right" }}>{m.company_count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Company growth */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Company Growth (6 months)</span>
          </div>
          <div style={{ padding:"16px" }}>
            {(data.growth||[]).length === 0 ? (
              <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"20px 0" }}>Not enough data yet</div>
            ) : (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                {data.growth.map((g, i) => {
                  const max = Math.max(...data.growth.map(x => x.count), 1);
                  const h = (g.count / max) * 100;
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.blu }}>{g.count}</div>
                      <div style={{ width:"100%", height:`${Math.max(h, 8)}%`, background:`linear-gradient(180deg, ${T.blu}, ${T.bluM})`, borderRadius:4 }}/>
                      <div style={{ fontSize:9, color:T.t4, whiteSpace:"nowrap" }}>{g.month.split("-")[1]}/{g.month.split("-")[0].slice(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// TAB 4: ALL USERS (Enhanced)
// ════════════════════════════════════════════════════════════════════════
function TabUsers() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast]   = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/users").then(res => {
      if (res.success) setUsers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.company_name||"").toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = r => ({ super_admin:T.pur, admin:T.blu, project_manager:T.grn, supervisor:T.amb, viewer:T.slt }[r] || T.slt);

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="All Users" sub={`${users.length} users across all companies`} right={
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company..."
            style={{ width:280, padding:"8px 12px 8px 32px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12.5, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          <IcSearch size={13} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
      }/>

      {loading ? <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading users...</div> : (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <TableHeader columns={["Name","Email","Company","Role","Status","Last Login"]}
            gridCols="1.5fr 2fr 1.5fr 110px 90px 100px"/>
          {filtered.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No users found</div>}
          {filtered.map((u, i) => (
            <div key={u.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 2fr 1.5fr 110px 90px 100px", padding:"10px 16px",
              borderBottom: i < filtered.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.name}</div>
              <div style={{ fontSize:12, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
              <div style={{ fontSize:12, color:T.t2 }}>{u.company_name}</div>
              <div><Badge text={u.role.replace("_"," ")} color={roleColor(u.role)}/></div>
              <div><Badge text={u.is_active ? "Active" : "Inactive"} color={u.is_active ? T.grn : T.red}/></div>
              <div style={{ fontSize:11, color:T.t4 }}>{u.last_login ? fmtDate(u.last_login) : "Never"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB 5: AUDIT LOGS (NEW)
// ════════════════════════════════════════════════════════════════════════
function TabAuditLogs({ companies }) {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ company_id:"", entity_type:"", action:"" });
  // Row par click = poora byora. List me DETAILS kat jaata hai aur "is cheez
  // par aur kya hua" wahan se kabhi pata nahi chalta.
  const [detail, setDetail]     = useState(null);   // {loading} | {log, timeline, same_day_by_user}

  const load = useCallback((p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: p, limit: 30 });
    if (filters.company_id) q.set("company_id", filters.company_id);
    if (filters.entity_type) q.set("entity_type", filters.entity_type);
    if (filters.action) q.set("action", filters.action);

    apiFetch("/saas-admin/audit-logs?" + q.toString()).then(res => {
      if (res.success) { setLogs(res.data); setTotal(res.total); setPage(p); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.ceil(total / 30);

  const actionColor = a => ({ LOGIN:T.blu, CREATE:T.grn, UPDATE:T.amb, DELETE:T.red, EXPORT:T.pur, DEACTIVATE:T.red, REACTIVATE:T.grn }[a] || T.slt);

  const ACTIONS = ["LOGIN","CREATE","UPDATE","DELETE","EXPORT","DEACTIVATE","REACTIVATE"];
  const ENTITIES = ["user","project","transaction","vendor","material_request","purchase_order","grn","company"];

  return (
    <div style={{ padding:"20px 24px" }}>
      <PageHeader title="Audit Logs" sub={`${fmtNum(total)} total events`} right={
        <Btn onClick={() => load(1)} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center" }}>
        <IcFilter size={14} color={T.t4}/>
        <select value={filters.company_id} onChange={e => setFilters(p=>({...p,company_id:e.target.value}))}
          style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.action} onChange={e => setFilters(p=>({...p,action:e.target.value}))}
          style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.entity_type} onChange={e => setFilters(p=>({...p,entity_type:e.target.value}))}
          style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">All Entity Types</option>
          {ENTITIES.map(e => <option key={e} value={e}>{e.replace("_"," ")}</option>)}
        </select>
        {(filters.company_id || filters.action || filters.entity_type) && (
          <button onClick={() => setFilters({ company_id:"", entity_type:"", action:"" })}
            style={{ fontSize:11, color:T.red, background:"none", border:"none", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading audit logs...</div> : (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <TableHeader columns={["Time","User","Action","Entity","Details","Company","IP"]}
            gridCols="130px 1.2fr 90px 1fr 1.5fr 1fr 100px"/>
          {logs.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No audit logs found</div>}
          {logs.map((l, i) => {
            let details = "";
            try { const d = typeof l.details === "string" ? JSON.parse(l.details) : l.details; details = d ? Object.entries(d).map(([k,v])=>`${k}: ${v}`).join(", ") : ""; } catch(_) {}
            return (
              <div key={l.id} title="Poora byora dekhne ke liye click karo"
                onClick={()=>{
                  setDetail({ loading:true });
                  apiFetch("/saas-admin/audit-logs/" + l.id)
                    .then(r=>setDetail(r && r.success ? r.data : null)).catch(()=>setDetail(null));
                }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                style={{ display:"grid", gridTemplateColumns:"130px 1.2fr 90px 1fr 1.5fr 1fr 100px", padding:"9px 16px",
                borderBottom: i < logs.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center", cursor:"pointer" }}>
                <div style={{ fontSize:11, color:T.t3 }}>{fmtDateTime(l.created_at)}</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{l.user_name || "--"}</div>
                <div><Badge text={l.action} color={actionColor(l.action)}/></div>
                <div style={{ fontSize:12, color:T.t2 }}>
                  {l.entity_type.replace("_"," ")}{l.entity_id ? ` #${l.entity_id}` : ""}
                </div>
                <div style={{ fontSize:11, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={details}>
                  {details || "--"}
                </div>
                <div style={{ fontSize:11.5, color:T.t2 }}>{l.company_name || "--"}</div>
                <div style={{ fontSize:10.5, color:T.t4, fontFamily:"monospace" }}>{l.ip_address || "--"}</div>
              </div>
            );
          })}
        </div>
      )}

      {detail && (() => {
        const d = detail.log;
        const when = (v) => { try { return fmtDateTime(v); } catch (e) { return String(v || ""); } };
        // details JSON ko padhne layak jodiyon me
        let pairs = null;
        try {
          let o = d && d.details;
          if (typeof o === "string") o = JSON.parse(o);
          if (o && typeof o === "object" && !Array.isArray(o)) {
            pairs = Object.entries(o).map(([k, v]) => [k, (v && typeof v === "object") ? JSON.stringify(v) : String(v)]);
          }
        } catch (_) {}
        return (
          <>
            <div onClick={()=>setDetail(null)} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.45)", zIndex:998 }}/>
            <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:999,
              width:"min(94vw,680px)", maxHeight:"86vh", overflowY:"auto", background:T.surface,
              border:`1px solid ${T.b1}`, borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,.25)", padding:"16px 18px" }}>
              {detail.loading ? (
                <div style={{ padding:24, fontSize:13, color:T.t3 }}>Load ho raha hai…</div>
              ) : !d ? (
                <div style={{ padding:24, fontSize:13, color:T.t3 }}>Byora nahi mila.</div>
              ) : (<>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.t1 }}>
                      {d.action} — {String(d.entity_type||"").replace("_"," ")}{d.entity_id ? " #" + d.entity_id : ""}
                    </div>
                    <div style={{ fontSize:11.5, color:T.t3, marginTop:2 }}>
                      {(d.user_name || ("User #" + d.user_id))} · {when(d.created_at)}
                    </div>
                  </div>
                  <button onClick={()=>setDetail(null)} style={{ border:"none", background:"none", cursor:"pointer",
                    fontSize:16, color:T.t4, lineHeight:1, padding:2 }}>✕</button>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:14 }}>
                  {[["Company", d.company_name || "--"],
                    ["Kahan se (IP)", String(d.ip_address || "--").replace("::ffff:", "")],
                    ["Log id", "#" + d.id],
                    ["Us din isi aadmi ke kaam", String(detail.same_day_by_user || 0)]].map(([k,v])=>(
                    <div key={k} style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:9, padding:"8px 11px" }}>
                      <div style={{ fontSize:10, color:T.t4, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px" }}>{k}</div>
                      <div style={{ fontSize:12.5, color:T.t1, fontWeight:600, marginTop:2, wordBreak:"break-all" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {pairs && pairs.length ? (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10.5, color:T.t4, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", marginBottom:6 }}>Kya hua</div>
                    <div style={{ border:`1px solid ${T.b1}`, borderRadius:9, overflow:"hidden" }}>
                      {pairs.map(([k,v],i)=>(
                        <div key={k} style={{ display:"grid", gridTemplateColumns:"190px 1fr", gap:10, padding:"7px 11px",
                          borderBottom: i < pairs.length-1 ? `1px solid ${T.b1}` : "none" }}>
                          <span style={{ fontSize:11.5, color:T.t3 }}>{k}</span>
                          <span style={{ fontSize:12, color:T.t1, wordBreak:"break-word" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:T.t3, marginBottom:14 }}>Iske saath koi aur byora darj nahi hua.</div>
                )}

                {detail.timeline && detail.timeline.length > 1 && (
                  <div>
                    <div style={{ fontSize:10.5, color:T.t4, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", marginBottom:6 }}>
                      Isi cheez par aur kya hua ({detail.timeline.length})
                    </div>
                    <div style={{ border:`1px solid ${T.b1}`, borderRadius:9, maxHeight:220, overflowY:"auto" }}>
                      {detail.timeline.map((tl,i)=>(
                        <div key={tl.id} style={{ display:"flex", gap:9, alignItems:"center", padding:"7px 11px",
                          borderBottom: i < detail.timeline.length-1 ? `1px solid ${T.b1}` : "none",
                          background: tl.id === d.id ? T.surfaceB : "transparent" }}>
                          <span style={{ fontSize:11, color:T.t3, width:130, flexShrink:0 }}>{when(tl.created_at)}</span>
                          <Badge text={tl.action} color={actionColor(tl.action)}/>
                          <span style={{ fontSize:11.5, color:T.t2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tl.user_name || "--"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>)}
            </div>
          </>
        );
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:16 }}>
          <button onClick={() => load(page-1)} disabled={page <= 1}
            style={{ width:30, height:30, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surface, cursor: page<=1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <IcChevL size={14} color={page<=1?T.t4:T.t2}/>
          </button>
          <span style={{ fontSize:12, color:T.t3 }}>Page {page} of {totalPages}</span>
          <button onClick={() => load(page+1)} disabled={page >= totalPages}
            style={{ width:30, height:30, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surface, cursor: page>=totalPages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <IcChevR size={14} color={page>=totalPages?T.t4:T.t2}/>
          </button>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// TAB: FEATURE REQUESTS (Phase 3) — Kanban board
// ════════════════════════════════════════════════════════════════════════
function TabFeatureRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [edit, setEdit] = useState(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/feature-requests").then(res => {
      if (res.success) setRows(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const COLUMNS = [
    { id:"new",             label:"New",             color:T.slt, bg:T.sltL },
    { id:"under_review",    label:"Under Review",    color:T.pur, bg:T.purL },
    { id:"planned",         label:"Planned",         color:T.cyn, bg:T.cynL },
    { id:"in_development",  label:"In Development",  color:T.blu, bg:T.bluL },
    { id:"shipped",         label:"Shipped",         color:T.grn, bg:T.grnL },
  ];

  const filtered = rows.filter(r => {
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (r.title||"").toLowerCase().includes(s)
          || (r.company_name||"").toLowerCase().includes(s)
          || (r.user_name||"").toLowerCase().includes(s);
    }
    return true;
  });

  const moveStatus = async (id, newStatus) => {
    const res = await apiFetch("/saas-admin/feature-requests/" + id, { method:"PUT", body:{ status: newStatus } });
    if (res.success) { setToast({ msg:"Status updated", type:"success" }); load(); }
    else setToast({ msg:"Update failed", type:"error" });
  };

  const saveEdit = async () => {
    const res = await apiFetch("/saas-admin/feature-requests/" + edit.id, {
      method:"PUT",
      body: { status: edit.status, priority: edit.priority, admin_notes: edit.admin_notes }
    });
    if (res.success) { setEdit(null); load(); setToast({ msg:"Request updated", type:"success" }); }
    else setToast({ msg:"Update failed", type:"error" });
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading feature requests...</div>;

  const priorityColor = p => ({ critical:T.red, high:T.amb, medium:T.blu, low:T.slt }[p] || T.slt);
  const rejectedCount = rows.filter(r => r.status === "rejected").length;

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <PageHeader title="Feature Requests" sub={`${rows.length} requests from ${new Set(rows.map(r=>r.company_id)).size} companies`} right={
        <Btn onClick={load} variant="outline"><IcRefresh size={13}/> Refresh</Btn>
      }/>

      {/* Filters */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        {["all","critical","high","medium","low"].map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight: priorityFilter===p ? 700 : 500, border:`1px solid ${priorityFilter===p ? T.blu : T.b1}`,
              background: priorityFilter===p ? T.bluL : T.surface, color: priorityFilter===p ? T.blu : T.t3, cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit" }}>
            {p}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..."
            style={{ width:240, padding:"7px 12px 7px 30px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}/>
          <IcSearch size={12} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:10, marginBottom:16 }}>
        {COLUMNS.map(col => {
          const colRows = filtered.filter(r => r.status === col.id);
          return (
            <div key={col.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 280px)" }}>
              <div style={{ padding:"10px 14px", borderBottom:`2px solid ${col.color}`, background:col.bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, fontWeight:700, color:col.color }}>{col.label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:col.color, background:"white", padding:"2px 8px", borderRadius:10 }}>{colRows.length}</span>
              </div>
              <div style={{ padding:"8px", overflowY:"auto", flex:1 }}>
                {colRows.length === 0 && <div style={{ fontSize:11, color:T.t4, textAlign:"center", padding:"20px 0" }}>—</div>}
                {colRows.map(r => (
                  <div key={r.id} onClick={() => setEdit({ ...r })}
                    style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, padding:"10px 12px", marginBottom:7, cursor:"pointer", transition:"all 0.15s", borderLeft:`3px solid ${priorityColor(r.priority)}` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.t1, marginBottom:4, lineHeight:1.3 }}>{r.title}</div>
                    <div style={{ fontSize:10, color:T.t3, marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.company_name}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                      <Badge text={r.priority} color={priorityColor(r.priority)}/>
                      {r.module && <span style={{ fontSize:9, color:T.t4, textTransform:"capitalize" }}>{r.module}</span>}
                    </div>
                    <div style={{ fontSize:9, color:T.t4, marginTop:5 }}>by {r.user_name} · {fmtDate(r.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {rejectedCount > 0 && (
        <div style={{ fontSize:11, color:T.t4, textAlign:"center" }}>+ {rejectedCount} rejected request{rejectedCount !== 1 ? "s" : ""} (use search to filter)</div>
      )}

      {/* Edit modal */}
      {edit && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:560, maxHeight:"85vh", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{edit.title}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:2 }}>
                  from {edit.company_name} · {edit.user_name} · {fmtDateTime(edit.created_at)}
                </div>
              </div>
              <button onClick={() => setEdit(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex" }}><IcX size={16}/></button>
            </div>

            <div style={{ padding:"20px 22px", overflowY:"auto", flex:1 }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Description</div>
                <div style={{ fontSize:12.5, color:T.t1, whiteSpace:"pre-wrap", padding:"10px 12px", background:T.surfaceB, borderRadius:8, border:`1px solid ${T.b1}` }}>
                  {edit.description || <em style={{ color:T.t4 }}>No description</em>}
                </div>
              </div>

              {edit.module && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Module</div>
                  <Badge text={edit.module} color={T.pur}/>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Status</div>
                  <select value={edit.status} onChange={e => setEdit({ ...edit, status:e.target.value })}
                    style={{ width:"100%", padding:"8px 10px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, background:T.surface, color:T.t1, fontFamily:"inherit", outline:"none" }}>
                    <option value="new">New</option>
                    <option value="under_review">Under Review</option>
                    <option value="planned">Planned</option>
                    <option value="in_development">In Development</option>
                    <option value="shipped">Shipped</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Priority</div>
                  <select value={edit.priority} onChange={e => setEdit({ ...edit, priority:e.target.value })}
                    style={{ width:"100%", padding:"8px 10px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, background:T.surface, color:T.t1, fontFamily:"inherit", outline:"none" }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:5 }}>Admin Notes (internal)</div>
                <textarea value={edit.admin_notes || ""} onChange={e => setEdit({ ...edit, admin_notes:e.target.value })}
                  placeholder="Internal notes, ETA, assigned dev, technical considerations..."
                  style={{ width:"100%", minHeight:90, padding:"10px 12px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
              </div>
            </div>

            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setEdit(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={saveEdit} style={{ flex:2 }}>Save Changes</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TAB: SANCHALAN — Internal / Testing companies
// ════════════════════════════════════════════════════════════════════════
function TabSanchalan({ onOpenDetail }) {
  const [data, setData]       = useState({ companies: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [allCompanies, setAllCompanies] = useState([]);
  const [addId, setAddId]     = useState("");
  const [addLabel, setAddLabel] = useState("Sanchalan Construction");
  // ── Demo templates (scenario-based seeders) ─────────────────────
  const [tplTarget, setTplTarget] = useState(null);      // company to apply template to
  const [templates, setTemplates] = useState([]);        // list of available templates
  const [selectedTpl, setSelectedTpl] = useState(null);  // chosen template id
  const [applyingTpl, setApplyingTpl] = useState(false);
  const [tplSearch, setTplSearch] = useState("");        // filter templates

  const openTemplatePicker = async (c) => {
    setTplTarget(c);
    setSelectedTpl(null);
    setTplSearch("");
    try {
      const r = await apiFetch("/saas-admin/sanchalan/templates");
      if (r.success) {
        const list = r.data || [];
        setTemplates(list);
        // Pre-select the recommended flagship so apply is often one click
        const rec = list.find(t => (t.tags || []).includes("flagship") || t.id === "full-flash-showcase");
        if (rec) setSelectedTpl(rec.id);
      }
    } catch(_) { setTemplates([]); }
  };

  const applyTemplate = async (forceId) => {
    // forceId (from double-click) wins; ignore non-string (e.g. a click event from the footer button)
    const tplId = (typeof forceId === "string" ? forceId : null) || selectedTpl;
    if (!tplTarget || !tplId || applyingTpl) return;
    const tpl = templates.find(t => t.id === tplId);
    if (tpl?.status === "stub") {
      setToast({ msg: "This template is coming soon. Pick a full template.", type: "error" });
      return;
    }
    if (!await window.confirmAsync(`Apply "${tpl?.name}" to ${tplTarget.name}?\n\nPrevious DEMO data (if any) will be wiped first. Real data stays.\n\nContinue?`)) return;
    setApplyingTpl(true);
    const r = await apiFetch("/saas-admin/sanchalan/companies/" + tplTarget.id + "/apply-template", {
      method: "POST",
      body: { template_id: tplId, wipe: true },
    });
    setApplyingTpl(false);
    if (r.success) {
      const c = r.data?.result?.counts || {};
      const summary = Object.entries(c).map(([k,v]) => `${v} ${k}`).join(", ");
      setToast({ msg: `Template applied: ${summary || "done"}`, type: "success" });
      setTplTarget(null);
      setSelectedTpl(null);
      load();
    } else {
      setToast({ msg: r.message || "Apply failed", type: "error" });
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/saas-admin/sanchalan").then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = async () => {
    try {
      const r = await apiFetch("/saas-admin/companies");
      if (r.success) setAllCompanies(r.data);
    } catch(_) {}
    setShowAdd(true);
  };

  const handleMark = async (id, label) => {
    const r = await apiFetch("/saas-admin/companies/" + id + "/toggle-internal", {
      method: "PUT",
      body: { is_internal: true, internal_label: label },
    });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      setShowAdd(false);
      setAddId("");
      load();
    } else {
      setToast({ msg: r.message || "Failed", type: "error" });
    }
  };

  const runFactoryReset = async (c) => {
    if (!await window.confirmAsync(`⚠️ FACTORY RESET "${c.name}"?\n\nThis will delete ALL operational data — projects, finance, CRM, procurement, warehouse, payroll, tasks — real and demo both. Company login, users, subscription stay intact.\n\nThis cannot be undone. Continue?`)) return;
    const r = await apiFetch("/saas-admin/sanchalan/" + c.id + "/factory-reset", { method: "POST" });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      load();
    } else {
      setToast({ msg: r.message || "Reset failed", type: "error" });
    }
  };

  const handleUnmark = async (id, name) => {
    if (!await window.confirmAsync(`Move "${name}" back to regular customers list?`)) return;
    const r = await apiFetch("/saas-admin/companies/" + id + "/toggle-internal", {
      method: "PUT",
      body: { is_internal: false },
    });
    if (r.success) {
      setToast({ msg: r.message, type: "success" });
      load();
    } else {
      setToast({ msg: r.message || "Failed", type: "error" });
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:T.t3 }}>Loading Sanchalan data…</div>;

  const stats = data.stats || {};
  const companies = data.companies || [];

  // Group by internal_label
  const grouped = {};
  companies.forEach(c => {
    const k = c.internal_label || "Sanchalan (Internal)";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(c);
  });

  return (
    <div style={{ padding:24 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header banner */}
      <div style={{ background:"linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", borderRadius:12, padding:"20px 24px", color:"white", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.3px", marginBottom:4 }}>Sanchalan — Internal &amp; Testing</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>Our own domains used for feature development and QA. Hidden from all main dashboards, analytics, CRM &amp; metrics.</div>
        </div>
        <Btn onClick={openAdd} color="#FFFFFF" variant="secondary" style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.4)" }}>+ Mark company as internal</Btn>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:20 }}>
        <StatCard label="Internal Companies" value={fmtNum(stats.total)}        sub={`${stats.active || 0} active`}   color={T.pur} Icon={IcBuilding}/>
        <StatCard label="Internal Users"     value={fmtNum(stats.total_users)}  sub="Across all internal"             color={T.blu} Icon={IcUsers}/>
        <StatCard label="Internal Projects"  value={fmtNum(stats.total_projects)} sub="Active only"                   color={T.grn} Icon={IcClip}/>
        <StatCard label="Labels"             value={fmtNum(Object.keys(grouped).length)} sub="Brand groups"           color={T.cyn} Icon={IcShield}/>
      </div>

      {/* Grouped sections */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ padding:"60px 20px", textAlign:"center", background:T.surface, border:`1px dashed ${T.b2}`, borderRadius:10 }}>
          <IcBuilding size={32} color={T.t4}/>
          <div style={{ marginTop:10, fontSize:13, color:T.t3 }}>No internal companies yet.</div>
          <div style={{ fontSize:11, color:T.t4, marginTop:4 }}>Mark any existing company as internal to move it here.</div>
        </div>
      )}

      {Object.entries(grouped).map(([label, list]) => (
        <div key={label} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:16, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", background:T.purL, borderBottom:`1px solid ${T.purM}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.pur }}>{label}</div>
            <div style={{ fontSize:11, color:T.t3 }}>{list.length} {list.length === 1 ? "company" : "companies"}</div>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:T.surfaceB }}>
                <th style={th}>Name</th>
                <th style={th}>Slug</th>
                <th style={th}>Users</th>
                <th style={th}>Projects</th>
                <th style={th}>Last Login</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={{...th, textAlign:"right"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} style={{ borderTop:`1px solid ${T.b1}`, transition:"background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surfaceB}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={td}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:T.purL, color:T.pur, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0 }}>{(c.name || "?").slice(0,1).toUpperCase()}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, color:T.t1 }}>{c.name}</div>
                        <div style={{ fontSize:10.5, color:T.t4 }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}><code style={{ fontSize:11, color:T.t3, background:T.surfaceB, padding:"2px 7px", borderRadius:5 }}>{c.slug}</code></td>
                  <td style={td}><span style={{ fontWeight:700, color:T.t1 }}>{c.user_count}</span></td>
                  <td style={td}><span style={{ fontWeight:700, color:T.t1 }}>{c.project_count}</span></td>
                  <td style={td}>{c.last_login ? fmtDateTime(c.last_login) : <span style={{color:T.t4}}>never</span>}</td>
                  <td style={td}>{c.is_active ? <Badge text="ACTIVE" color={T.grn}/> : <Badge text="DISABLED" color={T.red}/>}</td>
                  <td style={td}>{fmtDate(c.created_at)}</td>
                  <td style={{...td, textAlign:"right"}}>
                    <div style={{ display:"inline-flex", gap:6, alignItems:"center", justifyContent:"flex-end", flexWrap:"wrap" }}>
                      <Btn onClick={() => openTemplatePicker(c)} color="#EC4899" style={{ padding:"6px 13px", fontSize:11, fontWeight:700, boxShadow:"0 2px 6px rgba(236,72,153,0.28)" }}>🎯 Apply Template</Btn>
                      <Btn onClick={() => onOpenDetail(c)} variant="secondary" style={{ padding:"6px 11px", fontSize:11 }}>Details</Btn>
                      <Btn onClick={() => runFactoryReset(c)} variant="secondary" color={T.red} style={{ padding:"6px 11px", fontSize:11 }}>Factory Reset</Btn>
                      <Btn onClick={() => handleUnmark(c.id, c.name)} variant="secondary" color={T.slt} style={{ padding:"6px 11px", fontSize:11 }}>Unmark</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ═══ Apply Template Modal ═══ */}
      {tplTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.65)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => !applyingTpl && setTplTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:12, padding:0, width:640, maxHeight:"88vh", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.35)", display:"flex", flexDirection:"column" }}>
            {/* Header */}
            <div style={{ background:"linear-gradient(135deg,#EC4899,#BE185D)", color:"white", padding:"18px 22px" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.5px", opacity:0.85, marginBottom:3 }}>DEMO TEMPLATES</div>
              <div style={{ fontSize:16, fontWeight:800 }}>🎯 Apply scenario template to {tplTarget.name}</div>
              <div style={{ fontSize:11, opacity:0.9, marginTop:4 }}>Existing demo data will be wiped first. Real data is untouched.</div>
            </div>
            {/* Body */}
            <div style={{ padding:"14px 22px 16px", overflowY:"auto", flex:1 }}>
              {templates.length > 0 && (
                <input value={tplSearch} onChange={e => setTplSearch(e.target.value)}
                  placeholder="🔍 Search templates by name or tag…"
                  style={{ width:"100%", padding:"9px 12px", border:`1px solid ${T.b2}`, borderRadius:8, fontSize:12.5, marginBottom:12, boxSizing:"border-box", outline:"none" }}/>
              )}
              {templates.length === 0 && <div style={{ padding:40, textAlign:"center", color:T.t4, fontSize:12 }}>Loading templates…</div>}
              {(() => {
                const recId = templates.find(t => (t.tags||[]).includes("flagship") || t.id === "full-flash-showcase")?.id;
                const q = tplSearch.trim().toLowerCase();
                const visible = templates.filter(t => !q || (t.name||"").toLowerCase().includes(q) || (t.description||"").toLowerCase().includes(q) || (t.tags||[]).some(tg => tg.toLowerCase().includes(q)));
                if (templates.length > 0 && visible.length === 0) return <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No templates match "{tplSearch}"</div>;
                return visible.map(t => {
                  const isStub = t.status === "stub";
                  const isSelected = selectedTpl === t.id;
                  const isRec = t.id === recId;
                  return (
                    <div key={t.id}
                      onClick={() => !isStub && setSelectedTpl(t.id)}
                      onDoubleClick={() => { if (!isStub) { setSelectedTpl(t.id); applyTemplate(t.id); } }}
                      title={isStub ? "Coming soon" : "Click to select · double-click to apply"}
                      style={{
                        padding:"12px 14px", marginBottom:8, borderRadius:8,
                        border:`2px solid ${isSelected ? "#EC4899" : isRec ? "#F9A8D4" : "#E5E7EB"}`,
                        background:isSelected ? "#FDF2F8" : isStub ? "#F9FAFB" : "white",
                        cursor:isStub ? "not-allowed" : "pointer",
                        opacity:isStub ? 0.55 : 1,
                        transition:"all 0.15s",
                      }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:isSelected ? "#BE185D" : T.t1, marginBottom:3, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            {t.name}
                            {isRec && <span style={{ background:"#FCE7F3", color:"#BE185D", fontSize:8.5, fontWeight:800, padding:"2px 7px", borderRadius:10, letterSpacing:".4px" }}>★ RECOMMENDED</span>}
                            {isStub && <span style={{ background:"#FEF3C7", color:"#92400E", fontSize:8.5, fontWeight:700, padding:"2px 6px", borderRadius:10, letterSpacing:".4px" }}>COMING SOON</span>}
                            {!isStub && <span style={{ background:"#D1FAE5", color:"#065F46", fontSize:8.5, fontWeight:700, padding:"2px 6px", borderRadius:10, letterSpacing:".4px" }}>READY</span>}
                          </div>
                          <div style={{ fontSize:11.5, color:T.t3, lineHeight:1.45, marginBottom:4 }}>{t.description}</div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {(t.tags || []).map(tg => (
                              <span key={tg} style={{ background:"#F3F4F6", color:"#6B7280", fontSize:9.5, fontWeight:600, padding:"2px 7px", borderRadius:4 }}>{tg}</span>
                            ))}
                          </div>
                        </div>
                        {isSelected && <div style={{ color:"#EC4899", fontSize:18 }}>✓</div>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {/* Footer */}
            <div style={{ padding:"14px 22px", borderTop:"1px solid #E5E7EB", background:"#F9FAFB", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:T.t3 }}>
                {selectedTpl ? <span>Selected: <b>{templates.find(t=>t.id===selectedTpl)?.name || ""}</b></span> : "Pick a template · double-click to apply instantly"}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="secondary" onClick={() => setTplTarget(null)} disabled={applyingTpl}>Cancel</Btn>
                <Btn color="#EC4899" onClick={applyTemplate} disabled={!selectedTpl || applyingTpl}>
                  {applyingTpl ? "Applying…" : "🚀 Apply Template"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.surface, borderRadius:12, padding:24, width:460, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.t1, marginBottom:4 }}>Mark company as internal</div>
            <div style={{ fontSize:11, color:T.t3, marginBottom:16 }}>Selected company will be hidden from all customer dashboards and moved to Sanchalan.</div>

            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Company</div>
            <select value={addId} onChange={e => setAddId(e.target.value)}
              style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.b2}`, borderRadius:8, fontSize:13, marginBottom:14 }}>
              <option value="">— Select —</option>
              {allCompanies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
            </select>

            <div style={{ fontSize:11, fontWeight:700, color:T.t2, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>Label / Brand Group</div>
            <input value={addLabel} onChange={e => setAddLabel(e.target.value)}
              placeholder="e.g. Sanchalan Construction"
              style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.b2}`, borderRadius:8, fontSize:13, marginBottom:18, boxSizing:"border-box" }}/>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn disabled={!addId} onClick={() => handleMark(addId, addLabel)} color={T.pur}>Mark as internal</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ════════════════════════════════════════════════════════════════════════
// MAIN SAAS MODULE
// ════════════════════════════════════════════════════════════════════════
// How long an OPEN ticket has been waiting. Null for resolved tickets and for
// anything under the cutoff, so the chip only shows when it means something.
// Kept local to this module (modules stay self-contained).
const BUG_AGE_CUTOFF_DAYS = 2;
function bugOpenAgeDays(t) {
  if (!t || t.status !== "open" || !t.created_at) return null;
  const ms = Date.now() - new Date(t.created_at).getTime();
  if (!(ms > 0)) return null;
  const days = Math.floor(ms / 86400000);
  return days > BUG_AGE_CUTOFF_DAYS ? days : null;
}

// ── KB Gaps — where Sahayak's knowledge base is missing something ──
// Gaps come from the bot's own evidence (query escalations + thumbs-down),
// and each one may carry a DRAFT of the missing KB text. Approving a draft
// does NOT edit any file — the deployed filesystem is ephemeral and Git is the
// truth, so the actual edit happens from a Claude Code session which reads
// /saas/kb-drafts/pending. This screen is only where Prafull says yes or no.
// ── GO-LIVE CHECKLIST ─────────────────────────────────────────────────
// Sab kuch backend se auto-computed aata hai. Yahan manual tick jaan-boojh kar
// nahi hai: tick sirf ye batata hai ki kisi ne tick kiya, ye nahi ki client
// sach me taiyaar hai. Is liye har item ke saath asli ginti bhi dikhti hai.
function TabGoLive({ companies }) {
  const [cid, setCid]  = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr]   = useState("");

  // Sabse kam taiyaar company pehle chunte hain — wahi to dekhni hoti hai.
  useEffect(() => {
    if (cid === null && companies && companies.length) setCid(companies[0].id);
  }, [companies, cid]);

  useEffect(() => {
    if (!cid) return;
    setData(null); setErr("");
    apiFetch(`/support-bot/saas/golive/${cid}`)
      .then(r => { if (r && r.success) setData(r.data); else setErr(r?.message || "Load nahi hua"); })
      .catch(() => setErr("Load nahi hua"));
  }, [cid]);

  const pct = data ? data.readiness : 0;
  const barColor = pct >= 80 ? T.grn : pct >= 50 ? T.amb : T.red;

  return (
    <div style={{ padding:20 }}>
      <PageHeader title="Go-Live Checklist"
        sub="Naya client live hone ke liye taiyaar hai ya nahi — sab auto-computed, koi manual tick nahi"
        right={
          <select value={cid || ""} onChange={e => setCid(Number(e.target.value))}
            style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${T.b2}`, fontSize:12.5, color:T.t2, background:T.surface, fontFamily:"inherit", maxWidth:260 }}>
            {(companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        }/>

      {err && <div style={{ padding:14, background:T.redL, border:`1px solid ${T.redM}`, borderRadius:9, fontSize:12.5, color:T.red }}>{err}</div>}
      {!err && !data && <div style={{ padding:18, fontSize:12.5, color:T.t4 }}>Loading...</div>}

      {data && (
        <>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{data.company.name}</div>
              <div style={{ fontSize:20, fontWeight:800, color:barColor }}>{pct}%</div>
            </div>
            <div style={{ height:7, background:T.sltL, borderRadius:4, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:barColor, transition:"width 0.25s" }}/>
            </div>
            <div style={{ fontSize:11.5, color:T.t3, marginTop:8 }}>
              {data.passed} / {data.total} cheezein ho gayi{pct === 100 ? " — ye client live ke liye taiyaar hai." : ""}
            </div>
          </div>

          {data.items.map(it => {
            // ok === null ka matlab count hi nahi mila — usko pass kabhi nahi
            // dikhana, warna "taiyaar hai" ka jhootha bharosa ban jayega.
            const unknown = it.ok === null || it.ok === undefined;
            const c  = unknown ? T.slt : it.ok ? T.grn : T.amb;
            const bg = unknown ? T.sltL : it.ok ? T.grnL : T.ambL;
            return (
              <div key={it.key} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:22, height:22, borderRadius:6, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                  {unknown ? <span style={{ fontSize:12, color:c, fontWeight:700 }}>?</span>
                    : it.ok ? <IcChk size={13} color={c}/>
                    : <span style={{ width:7, height:7, borderRadius:"50%", background:c }}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{it.label}</span>
                    <span style={{ fontSize:11, color:T.t4 }}>{it.detail}</span>
                  </div>
                  {!it.ok && <div style={{ fontSize:11.5, color:T.t3, marginTop:4, lineHeight:1.5 }}>{it.hint}</div>}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function TabKbGaps() {
  const [rows, setRows]     = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy]     = useState(false);

  const load = useCallback(() => {
    setRows(null);
    apiFetch("/support-bot/saas/kb-gaps?status=open")
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = (id, decision) => {
    setBusy(true);
    apiFetch(`/support-bot/saas/kb-gaps/${id}/decide`, { method:"POST", body:{ decision } })
      .then(r => { setBusy(false); if (r && r.success) { setOpenId(null); load(); } })
      .catch(() => setBusy(false));
  };

  const parseList = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
  const DRAFT_META = {
    proposed: { label:"Draft taiyar",  color:T.blu, bg:T.bluL },
    approved: { label:"Approved — apply hona baaki", color:T.grn, bg:T.grnL },
    rejected: { label:"Rejected",      color:T.red, bg:T.redL },
    applied:  { label:"KB me lag gaya", color:T.grn, bg:T.grnL },
    none:     { label:"Draft nahi bana", color:T.t3, bg:T.sltL },
  };

  return (
    <div>
      <PageHeader title="KB Gaps" sub="Jahan Sahayak ke paas jawab nahi tha — aur uska proposed KB draft"/>

      {rows === null && <div style={{ padding:18, fontSize:12.5, color:T.t4 }}>Loading...</div>}
      {rows && !rows.length && <EmptyState Icon={IcClip} text="Abhi koi khula KB gap nahi."/>}

      {rows && rows.map(g => {
        const expanded = openId === g.id;
        const meta = DRAFT_META[g.draft_status] || DRAFT_META.none;
        const qs = parseList(g.sample_questions);
        return (
          <div key={g.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:8 }}>
            <button onClick={() => setOpenId(expanded ? null : g.id)}
              style={{ width:"100%", textAlign:"left", border:"none", background:"transparent", cursor:"pointer",
                padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start", fontFamily:"inherit" }}>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
                  <TicketBadge text={meta.label} color={meta.color} bg={meta.bg}/>
                  <span style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{g.theme}</span>
                  {g.target_file && <span style={{ fontSize:11, color:T.t3, fontFamily:"monospace" }}>{g.target_file}</span>}
                  <span style={{ fontSize:11, color:T.t4 }}>{g.hit_count} sawaal</span>
                </span>
                <span style={{ display:"block", fontSize:12, color:T.t3, lineHeight:1.45,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>
                  {qs[0] || "—"}
                </span>
              </span>
              <span style={{ fontSize:11.5, color:T.blu, fontWeight:600, whiteSpace:"nowrap" }}>
                {expanded ? "Band karein" : "Draft dekhein"}
              </span>
            </button>

            {expanded && (
              <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                {qs.length > 0 && (
                  <div style={{ fontSize:11.5, color:T.t3 }}>
                    <b>Users ne poocha:</b>
                    <ul style={{ margin:"4px 0 0", paddingLeft:18 }}>
                      {qs.map((q,i) => <li key={i} style={{ marginBottom:2 }}>{q}</li>)}
                    </ul>
                  </div>
                )}

                {g.draft_text ? (
                  <>
                    <div style={{ fontSize:11, color:T.t4 }}>
                      Proposed addition — <span style={{ fontFamily:"monospace" }}>{g.draft_file}</span>
                      {g.draft_rationale ? ` · ${g.draft_rationale}` : ""}
                    </div>
                    <pre style={{ margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word", fontSize:12,
                      lineHeight:1.5, color:T.t1, background:T.surfaceB, border:`1px solid ${T.b1}`,
                      borderRadius:8, padding:"10px 12px", fontFamily:"inherit" }}>{g.draft_text}</pre>
                    <div style={{ fontSize:11, color:T.t4, lineHeight:1.5 }}>
                      Approve karne par file abhi nahi badlegi — draft "apply hona baaki" list me chala jayega.
                      Asli badlav Claude Code session se hoga (KB Git me hi sach hai).
                    </div>
                    {g.draft_status === "proposed" && (
                      <div style={{ display:"flex", gap:7 }}>
                        <Btn onClick={() => decide(g.id, "approved")} color={T.grn} disabled={busy}>Approve</Btn>
                        <Btn onClick={() => decide(g.id, "rejected")} color={T.red} disabled={busy}>Reject</Btn>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize:11.5, color:T.t4 }}>
                    Draft abhi nahi bana{g.draft_rationale ? ` — ${g.draft_rationale}` : " (weekly job banata hai)"}.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Bug Inbox — Phynaxon's cross-company Sahayak tickets ──────────
// Bugs reported through Sahayak used to land on the COMPANY admin's desk,
// where nobody could fix them and Phynaxon never heard about them. This is
// the other half of that routing: every tenant's bugs in one place, with the
// diagnostic bundle the user consented to send.
function TabBugInbox() {
  const [type, setType]     = useState("bug");
  const [status, setStatus] = useState("open");
  const [rows, setRows]     = useState(null);
  const [openId, setOpenId] = useState(null);
  const [note, setNote]     = useState("");
  const [busy, setBusy]     = useState(false);

  const load = useCallback((ty, st) => {
    setRows(null);
    apiFetch(`/support-bot/escalations/saas?type=${ty}&status=${st}`)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => { load(type, status); }, [type, status, load]);

  const resolve = (id) => {
    setBusy(true);
    apiFetch(`/support-bot/escalations/${id}/resolve`, { method:"POST", body:{ resolution: note.trim() || undefined } })
      .then(r => { setBusy(false); if (r && r.success) { setOpenId(null); setNote(""); load(type, status); } })
      .catch(() => setBusy(false));
  };

  const chip = (on) => ({
    border:`1px solid ${on ? T.blu : T.b1}`, cursor:"pointer", borderRadius:7,
    padding:"5px 12px", fontSize:12, fontWeight:600, fontFamily:"inherit",
    background: on ? T.bluL : T.surface, color: on ? T.blu : T.t3,
  });

  return (
    <div>
      <PageHeader title="Bug Inbox" sub="Sahayak se aaye bug — saari companies"/>

      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["bug","Bug"],["query","Sawaal"]].map(([id,label]) => (
          <button key={id} onClick={() => { setType(id); setOpenId(null); }} style={chip(type===id)}>{label}</button>
        ))}
        <span style={{ width:1, background:T.b1, margin:"0 2px" }}/>
        {[["open","Open"],["resolved","Resolved"]].map(([id,label]) => (
          <button key={id} onClick={() => { setStatus(id); setOpenId(null); }} style={chip(status===id)}>{label}</button>
        ))}
      </div>

      {rows === null && <div style={{ padding:18, fontSize:12.5, color:T.t4 }}>Loading...</div>}
      {rows && !rows.length && <EmptyState Icon={IcShield} text="Koi ticket nahi."/>}

      {rows && rows.map(t => {
        const isBug = t.type === "bug";
        const expanded = openId === t.id;
        return (
          <div key={t.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:8 }}>
            <button onClick={() => { setOpenId(expanded ? null : t.id); setNote(""); }}
              style={{ width:"100%", textAlign:"left", border:"none", background:"transparent", cursor:"pointer",
                padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start", fontFamily:"inherit" }}>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
                  <TicketBadge text={isBug ? "Bug" : "Sawaal"} color={isBug ? T.red : T.slt} bg={isBug ? T.redL : T.sltL}/>
                  {/* which tenant reported it — the whole point of this view */}
                  <TicketBadge text={t.company_name || ("Company #" + t.company_id)} color={T.pur} bg={T.purL}/>
                  <span style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{t.ticket_no}</span>
                  <span style={{ fontSize:11.5, color:T.t3 }}>{t.user_name || "—"}</span>
                  <span style={{ fontSize:11, color:T.t4 }}>{fmtTicketTime(t.created_at)}</span>
                  {(() => { const d = bugOpenAgeDays(t); return d ? (
                    <span title="Itne din se ye ticket khula pada hai"
                      style={{ fontSize:10.5, fontWeight:600, color:T.t3, background:T.sltL,
                        border:`1px solid ${T.b1}`, padding:"1px 7px", borderRadius:20, whiteSpace:"nowrap" }}>
                      {d} din se open
                    </span>) : null; })()}
                  {t.bundle_meta && <TicketBadge text="Diagnostics" color={T.blu} bg={T.bluL}/>}
                </span>
                <span style={{ display:"block", fontSize:12.5, color:T.t2, lineHeight:1.45,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>
                  {t.question || "—"}
                </span>
              </span>
            </button>

            {expanded && (
              <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                {t.reason && <div style={{ fontSize:11.5, color:T.t3 }}>Reason: {t.reason}</div>}
                <BundleView meta={t.bundle_meta} url={t.bundle_url}/>
                {t.status === "open" ? (
                  <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="Kya fix kiya / kya jawab diya..."
                      style={{ flex:1, minWidth:0, padding:"7px 10px", borderRadius:7, border:`1px solid ${T.b1}`,
                        fontSize:12, color:T.t1, background:T.surfaceB, outline:"none", fontFamily:"inherit" }}/>
                    <Btn onClick={() => resolve(t.id)} color={T.grn} disabled={busy}>Resolve karein</Btn>
                  </div>
                ) : (
                  t.resolution && <div style={{ fontSize:11.5, color:T.t3, background:T.grnL,
                    border:`1px solid ${T.grnM}`, borderRadius:7, padding:"7px 10px" }}>{t.resolution}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 13 tabs -> 7. Removed:
//   Companies    -> merged into Customers (companies nest under their client)
//   Module Access-> company detail page, where it is already scoped
//   Data Export  -> button on the company detail page
//   Subscriptions-> deleted; it edited the legacy per-company plan table
//   Analytics    -> deleted. Cohort retention, conversion funnel and churn
//                   prediction were computing over a handful of tenants and one
//                   contract; they rendered confident-looking empty charts.
//   CRM & Health -> deleted. Its churn/health lists duplicated the Dashboard;
//                   its genuinely useful half (scheduler, email queue, auto-email
//                   toggle) moved onto the Dashboard as Platform Ops.
const TABS = [
  { id:"stats",     label:"Dashboard",        Icon:IcTrend    },
  { id:"customers", label:"Customers",        Icon:IcDollar   },
  { id:"companies", label:"Companies",        Icon:IcBuilding },
  { id:"users",     label:"All Users",        Icon:IcUsers    },
  { id:"features",  label:"Feature Requests", Icon:IcClip     },
  { id:"audit",     label:"Audit Logs",       Icon:IcShield   },
  { id:"sanchalan", label:"Sanchalan",        Icon:IcLock     },
  { id:"bugs",      label:"Bug Inbox",        Icon:IcShield   },
  { id:"kbgaps",    label:"KB Gaps",          Icon:IcClip     },
  { id:"golive",    label:"Go-Live",          Icon:IcChk      },
];

export default function SaaSModule() {
  const [tab, setTab]               = useState("stats");
  const [companies, setCompanies]   = useState([]);
  const [detailCompanyId, setDetailCompanyId] = useState(null);
  const [loadingCo, setLoadingCo]   = useState(true);

  const loadCompanies = useCallback(() => {
    setLoadingCo(true);
    apiFetch("/saas-admin/companies").then(res => {
      if (res.success) setCompanies(res.data);
      setLoadingCo(false);
    }).catch(() => setLoadingCo(false));
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // The old selCompany/"jump to Module Access tab" plumbing is gone — module
  // access now lives inside the company detail page, so opening a company IS
  // the navigation.
  const handleOpenDetail = (c) => setDetailCompanyId(c.id);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,sans-serif", background:T.bg }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg, #0D1B2A 0%, #1B2D45 100%)", padding:"14px 24px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:"white", letterSpacing:"-0.3px" }}>Sanchalan · SaaS Admin Panel</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Platform management -- super admin only</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{companies.length} companies · {companies.reduce((s,c)=>s+c.user_count,0)} users</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", background:"rgba(124,58,237,0.2)", border:"1px solid rgba(124,58,237,0.4)", borderRadius:20 }}>
            <IcLock size={12} color="#A78BFA"/>
            <span style={{ fontSize:11, fontWeight:600, color:"#A78BFA" }}>SUPER ADMIN</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#FFFFFF", borderBottom:`1px solid ${T.b1}`, display:"flex", padding:"0 20px", flexShrink:0, overflowX:"auto" }}>
        {TABS.map(t => {
          const isA = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setDetailCompanyId(null); }}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 14px", border:"none", background:"none", cursor:"pointer",
                color: isA ? T.blu : T.t3, fontWeight: isA ? 700 : 400, fontSize:12.5,
                borderBottom: isA ? `2.5px solid ${T.blu}` : "2.5px solid transparent",
                transition:"all 0.15s", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              <t.Icon size={14} color={isA ? T.blu : T.t3}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {detailCompanyId ? (
          <CompanyDetailPage companyId={detailCompanyId} onBack={() => { setDetailCompanyId(null); loadCompanies(); }}/>
        ) : (
          <>
            {tab === "stats"     && <><WeeklyWork onJump={setTab}/><TabStats/></>}
            {tab === "customers" && <TabCustomers onOpenCompany={handleOpenDetail}/>}
            {tab === "companies" && <TabCompanies onOpenCompany={handleOpenDetail}/>}
            {tab === "users"     && <TabUsers/>}
            {tab === "features"  && <TabFeatureRequests/>}
            {tab === "audit"     && <TabAuditLogs companies={companies}/>}
            {tab === "sanchalan" && <TabSanchalan onOpenDetail={handleOpenDetail}/>}
            {tab === "bugs"      && <TabBugInbox/>}
            {tab === "kbgaps"    && <TabKbGaps/>}
            {tab === "golive"    && <TabGoLive companies={companies}/>}
          </>
        )}
      </div>
    </div>
  );
}
