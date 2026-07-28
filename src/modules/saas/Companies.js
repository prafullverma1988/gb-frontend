// Companies — the SERVICE index for the Sanchalan support team.
//
// Deliberately not a second billing view. Customers answers "who pays and what
// did they buy"; this answers "something is wrong in tenant X — is it alive,
// what is switched on, and does it have open bugs". Different question, so a
// different set of columns; sharing one table with Customers is exactly what
// made the merged list unreadable.
//
// The owning customer stays visible and clickable, so this is not the old
// orphaned Companies tab that carried no client reference at all.
import { useState, useEffect, useCallback } from "react";
import { apiFetch, T, fmtDate, DOMAIN_LABELS,
         IcBuilding, IcSearch, IcRefresh, IcChk } from "./tokens";
import { Toast, Badge, Btn, EmptyState, TableHeader, PageHeader } from "./ui";
import DeleteCompanyModal from "./DeleteCompany";

const daysSince = (d) => {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d)) / 86400000);
};

// Activity is the first thing a support person looks at: a tenant nobody has
// logged into in weeks explains most "it isn't working" reports by itself.
const activityLabel = (d) => {
  const n = daysSince(d);
  if (n === null) return { text: "Never logged in", color: T.red };
  if (n === 0)    return { text: "Today", color: T.grn };
  if (n <= 7)     return { text: `${n}d ago`, color: T.grn };
  if (n <= 30)    return { text: `${n}d ago`, color: T.amb };
  return { text: `${n}d ago`, color: T.red };
};

export default function TabCompanies({ onOpenCompany }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [toggling, setToggling] = useState(null);
  const [toast, setToast]     = useState(null);
  const [delCompany, setDelCompany] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/saas-admin/companies")
      .then(r => { setRows(r.success ? (r.data || []) : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (e, c) => {
    e.stopPropagation();
    setToggling(c.id);
    const res = await apiFetch("/saas-admin/companies/" + c.id + "/toggle", { method: "PUT" });
    setToggling(null);
    setToast({ msg: res.success ? res.message : (res.message || "Failed"), type: res.success ? "success" : "error" });
    if (res.success) load();
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading companies...</div>;

  const q = search.trim().toLowerCase();
  const visible = rows
    .filter(c => filter === "all" || (filter === "active" ? c.is_active : !c.is_active))
    .filter(c => !q || c.name.toLowerCase().includes(q)
              || (c.slug || "").toLowerCase().includes(q)
              || (c.client_name || "").toLowerCase().includes(q));

  const totalBugs = rows.reduce((n, c) => n + (c.open_bugs || 0), 0);
  const GRID = "2fr 1.3fr 0.7fr 0.7fr 0.9fr 1fr 1.1fr";

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      {delCompany && <DeleteCompanyModal company={delCompany} onClose={() => setDelCompany(null)} onDone={load} setToast={setToast}/>}
      <PageHeader title="Companies" sub="Service console — kis tenant me kya chal raha hai"
        right={<Btn variant="outline" onClick={load}><IcRefresh size={13}/></Btn>}/>

      {totalBugs > 0 && (
        <div style={{ padding:"10px 14px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:10, marginBottom:14, fontSize:12, color:T.red, fontWeight:600 }}>
          {totalBugs} open bug{totalBugs > 1 ? "s" : ""} across {rows.filter(c => c.open_bugs > 0).length} compan{rows.filter(c => c.open_bugs > 0).length > 1 ? "ies" : "y"} — company kholo, Bugs tab me detail hai
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        {["all","active","inactive"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight: filter===f ? 700 : 500,
              border:`1px solid ${filter===f ? T.blu : T.b1}`, background: filter===f ? T.bluL : T.surface,
              color: filter===f ? T.blu : T.t3, cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit" }}>
            {f} ({f === "all" ? rows.length : f === "active" ? rows.filter(c=>c.is_active).length : rows.filter(c=>!c.is_active).length})
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Company ya customer dhoondo..."
            style={{ width:250, padding:"7px 12px 7px 30px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}/>
          <IcSearch size={12} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
        <TableHeader gridCols={GRID} columns={["Company", "Customer", "Users", "Projects", "Modules", "Last activity", ""]}/>
        {visible.length === 0 && <EmptyState Icon={IcBuilding} text="Koi company nahi mili"/>}
        {visible.map(c => {
          const act = activityLabel(c.last_login);
          return (
            <div key={c.id} onClick={() => onOpenCompany && onOpenCompany(c)}
              style={{ display:"grid", gridTemplateColumns:GRID, padding:"11px 16px", borderTop:`1px solid ${T.b1}`,
                cursor:"pointer", alignItems:"center", background: c.is_active ? "transparent" : T.redL }}
              onMouseEnter={e => e.currentTarget.style.background = c.is_active ? T.surfaceB : T.redL}
              onMouseLeave={e => e.currentTarget.style.background = c.is_active ? "transparent" : T.redL}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.t1, display:"flex", alignItems:"center", gap:7 }}>
                  {c.name}
                  {!c.is_active && <Badge text="INACTIVE" color={T.red}/>}
                  {c.open_bugs > 0 && <Badge text={`${c.open_bugs} BUG${c.open_bugs > 1 ? "S" : ""}`} color={T.red}/>}
                </div>
                <div style={{ fontSize:10.5, color:T.t4 }}>/{c.slug} · {DOMAIN_LABELS[c.module_type] || c.module_type || "--"}</div>
              </div>
              <div style={{ fontSize:11.5, color:T.t2, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {c.client_name || <span style={{ color:T.red }}>no customer</span>}
                {c.client_sub_status && (
                  <div style={{ fontSize:9.5, color: c.client_sub_status === "active" ? T.grn : T.amb }}>{c.client_sub_status}</div>
                )}
              </div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{c.user_count}</div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{c.project_count}</div>
              <div style={{ fontSize:12, color: c.modules_enabled < c.modules_total ? T.amb : T.t2, fontWeight:600 }}>
                {c.modules_enabled}/{c.modules_total}
              </div>
              <div style={{ fontSize:11.5, color:act.color, fontWeight:600 }}>
                {act.text}
                <div style={{ fontSize:9.5, color:T.t4, fontWeight:400 }}>joined {fmtDate(c.created_at)}</div>
              </div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }} onClick={e => e.stopPropagation()}>
                {/* Turning a company back ON is harmless, so it stays a one-click
                    toggle. Turning it off is a customer-visible outage, so it goes
                    through the same modal as delete, where the choice is explained. */}
                {!c.is_active && (
                  <button onClick={e => toggle(e, c)} disabled={toggling === c.id} title="Wapas chalu karo"
                    style={{ width:28, height:28, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                      border:`1px solid ${T.grnM}`, background:T.grnL }}>
                    <IcChk size={11} color={T.grn}/>
                  </button>
                )}
                <button onClick={e => { e.stopPropagation(); setDelCompany(c); }}
                  title="Company hatao — band karo ya hamesha ke liye delete"
                  style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.redM}`, background:T.redL, color:T.red, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Delete
                </button>
                <button onClick={e => { e.stopPropagation(); onOpenCompany && onOpenCompany(c); }} title="Open company"
                  style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.bluM}`, background:T.bluL, color:T.blu, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Open
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
