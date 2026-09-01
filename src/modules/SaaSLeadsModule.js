// ─────────────────────────────────────────────────────────────────
// SaaS Leads — the platform's OWN sales CRM (super-admin only).
// Captures demo requests from sanchalan.online and runs them through a
// SaaS sales pipeline: New → Contacted → Demo → Trial → Won / Lost.
// Self-contained per house rule (own icons, theme, components).
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import api, { getUser } from "../config/api";

// ── ICONS ───────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcPlus    = p => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX       = p => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcChk     = p => <Ic {...p} d="M20 6L9 17l-5-5" />;
const IcRefresh = p => <Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />;
const IcSearch  = p => <Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />;
const IcPhone   = p => <Ic {...p} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />;
const IcMail    = p => <Ic {...p} d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 7l-10 6L2 7" />;
const IcWa      = p => <Ic {...p} d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1121 11.5z" />;
const IcBuilding= p => <Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />;
const IcUsers   = p => <Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z" />;
const IcGrid    = p => <Ic {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />;
const IcList    = p => <Ic {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />;
const IcCal     = p => <Ic {...p} d="M8 7V3m8 4V3M5 11h14M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />;
const IcTrash   = p => <Ic {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />;
const IcTrend   = p => <Ic {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />;
const IcRupee   = p => <Ic {...p} d="M6 3h12M6 8h12M16 3c0 4-3 6-7 6h-3l7 9" />;
const IcLock    = p => <Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />;

// ── THEME ───────────────────────────────────────────────────────
const T = {
  bg:"#F4F6F9", surface:"#FFFFFF", surfaceB:"#F8F9FB",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  grn:"#059669", grnL:"#ECFDF5", grnM:"#A7F3D0",
  amb:"#D97706", ambL:"#FFFBEB", ambM:"#FDE68A",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
  pur:"#7C3AED", purL:"#F5F3FF", purM:"#DDD6FE",
  cyn:"#0891B2", cynL:"#ECFEFF", cynM:"#A5F3FC",
  slt:"#64748B", sltL:"#F1F5F9",
};

// ── SaaS SALES PIPELINE ─────────────────────────────────────────
const STAGES = [
  { id:"new",       label:"New",       c:T.blu, bg:T.bluL, brd:T.bluM },
  { id:"contacted", label:"Contacted", c:T.pur, bg:T.purL, brd:T.purM },
  { id:"demo",      label:"Demo",      c:T.amb, bg:T.ambL, brd:T.ambM },
  { id:"trial",     label:"Trial",     c:T.cyn, bg:T.cynL, brd:T.cynM },
  { id:"won",       label:"Won",       c:T.grn, bg:T.grnL, brd:T.grnM },
  { id:"lost",      label:"Lost",      c:T.slt, bg:T.sltL, brd:T.b2  },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));
const PRIORITIES = ["High", "Medium", "Low"];
const PRIO_C = { High:T.red, Medium:T.amb, Low:T.slt };
const PLANS = ["Free Trial", "Starter", "Professional", "Enterprise"];

// ── HELPERS ─────────────────────────────────────────────────────
const fmtMoney = n => { const v = parseFloat(n)||0; if(!v) return "—"; return "₹" + (v>=10000000?(v/10000000).toFixed(2)+" Cr":v>=100000?(v/100000).toFixed(2)+" L":v>=1000?(v/1000).toFixed(0)+"K":v.toFixed(0)); };
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{ day:"2-digit", month:"short", year:"2-digit" }) : "—";
const fmtDateTime = d => d ? new Date(d).toLocaleString("en-IN",{ day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit",year:"2-digit" }) : "—";
const timeAgo = d => {
  if(!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime())/1000);
  if(s<60) return "just now"; if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago"; if(s<2592000) return Math.floor(s/86400)+"d ago";
  return fmtDate(d);
};
const initials = n => (n||"?").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
const digits = s => (s||"").replace(/[^\d]/g,"");

// ── MINI COMPONENTS ─────────────────────────────────────────────
function Pill({ s }) {
  const st = STAGE_MAP[s] || STAGE_MAP.new;
  return <span style={{ display:"inline-block", background:st.bg, color:st.c, fontSize:10.5, fontWeight:700, padding:"2px 9px", borderRadius:20, border:`1px solid ${st.brd}`, whiteSpace:"nowrap" }}>{st.label}</span>;
}
function Tag({ text, c }) {
  return <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:20, background:c+"18", color:c, border:`1px solid ${c}33`, whiteSpace:"nowrap" }}>{text}</span>;
}
function Btn({ children, onClick, color=T.blu, variant="primary", disabled, style:sx }) {
  const primary = variant==="primary";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, padding:"8px 14px", borderRadius:8,
        background: disabled ? T.b2 : (primary ? color : "transparent"), color: disabled ? "#fff" : (primary ? "#fff" : color),
        fontSize:12.5, fontWeight:600, border: primary ? "none" : `1px solid ${T.b1}`, cursor: disabled?"not-allowed":"pointer",
        fontFamily:"inherit", transition:"all .15s", ...sx }}>{children}</button>
  );
}
function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div style={{ padding:"14px 16px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, borderTop:`3px solid ${color}`, minWidth:0 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:color+"18", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
        <Icon size={16} color={color}/>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:T.t1, letterSpacing:"-0.5px", lineHeight:1, marginBottom:3 }}>{value}</div>
      <div style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.4px" }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:T.t4, marginTop:2 }}>{sub}</div>}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:600, color:T.t3, marginBottom:5 }}>{label}</div>
      {children}
    </div>
  );
}
const inputStyle = { width:"100%", padding:"8px 11px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, fontFamily:"inherit", outline:"none" };
function TextInput(props){ return <input {...props} style={{ ...inputStyle, ...(props.style||{}) }} />; }
function Select({ value, onChange, children, style:sx }){ return <select value={value||""} onChange={onChange} style={{ ...inputStyle, cursor:"pointer", ...(sx||{}) }}>{children}</select>; }

// ─────────────────────────────────────────────────────────────────
export default function SaaSLeadsModule() {
  const user = getUser();
  const isSuper = user?.role === "super_admin";

  const [leads, setLeads]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState("kanban"); // kanban | list
  const [q, setQ]             = useState("");
  const [sel, setSel]         = useState(null);     // open lead in drawer
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast]     = useState(null);

  const flash = (msg, type="ok") => { setToast({ msg, type }); setTimeout(()=>setToast(null), 2600); };

  const load = useCallback(async () => {
    setLoading(true);
    const [lr, sr, ar] = await Promise.all([
      api.get("/saas-leads"),
      api.get("/saas-leads/stats"),
      api.get("/saas-leads/agents"),
    ]);
    if (lr?.success) setLeads(lr.data || []);
    if (sr?.success) setStats(sr.data || null);
    if (ar?.success) setAgents(ar.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isSuper) load(); }, [isSuper, load]);

  // refresh a single lead in place + keep drawer in sync
  const apply = (lead) => {
    if (!lead) return;
    setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
    setSel(s => (s && s.id === lead.id ? lead : s));
  };

  const patchLead = async (id, body, okMsg) => {
    const r = await api.patch("/saas-leads/" + id, body);
    if (r?.success) { apply(r.data); load(); if (okMsg) flash(okMsg); return r.data; }
    flash(r?.message || "Update failed", "error"); return null;
  };

  const addNote = async (id, note) => {
    const r = await api.post("/saas-leads/" + id + "/note", { note });
    if (r?.success) { apply(r.data); flash("Note added"); return r.data; }
    flash(r?.message || "Failed", "error"); return null;
  };

  const removeLead = async (id) => {
    const r = await api.del("/saas-leads/" + id);
    if (r?.success) { setSel(null); flash("Lead deleted"); load(); }
    else flash(r?.message || "Failed", "error");
  };

  if (!isSuper) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"70vh", color:T.t3, gap:12 }}>
        <div style={{ width:56, height:56, borderRadius:14, background:T.sltL, display:"flex", alignItems:"center", justifyContent:"center" }}><IcLock size={26} color={T.slt}/></div>
        <div style={{ fontSize:16, fontWeight:700, color:T.t1 }}>Super admin only</div>
        <div style={{ fontSize:13 }}>The SaaS sales pipeline is restricted to the Sanchalan platform team.</div>
      </div>
    );
  }

  const filtered = leads.filter(l => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [l.name, l.company, l.phone, l.email].some(v => (v||"").toLowerCase().includes(s));
  });

  return (
    <div style={{ padding:"18px 22px", background:T.bg, minHeight:"100%" }}>
      {toast && (
        <div style={{ position:"fixed", top:20, right:24, zIndex:10000, padding:"11px 18px", borderRadius:9,
          background: toast.type==="error"?T.redL:T.grnL, border:`1px solid ${toast.type==="error"?T.redM:T.grnM}`,
          color: toast.type==="error"?T.red:T.grn, fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,.15)", display:"flex", gap:9, alignItems:"center" }}>
          {toast.type==="error"?<IcX size={14}/>:<IcChk size={14}/>}{toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:19, fontWeight:800, color:T.t1, letterSpacing:"-0.3px" }}>SaaS Sales Pipeline</div>
          <div style={{ fontSize:12.5, color:T.t3, marginTop:2 }}>Demo requests from sanchalan.online → close construction companies as Sanchalan customers</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:10, top:9 }}><IcSearch size={14} color={T.t4}/></span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search leads…"
              style={{ ...inputStyle, width:200, padding:"8px 11px 8px 30px", background:T.surface }}/>
          </div>
          <div style={{ display:"flex", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden" }}>
            <button onClick={()=>setView("kanban")} title="Board" style={{ padding:"8px 10px", border:"none", cursor:"pointer", background: view==="kanban"?T.bluL:"transparent", display:"flex" }}><IcGrid size={15} color={view==="kanban"?T.blu:T.t4}/></button>
            <button onClick={()=>setView("list")} title="List" style={{ padding:"8px 10px", border:"none", cursor:"pointer", background: view==="list"?T.bluL:"transparent", display:"flex" }}><IcList size={15} color={view==="list"?T.blu:T.t4}/></button>
          </div>
          <Btn variant="ghost" color={T.t2} onClick={load}><IcRefresh size={14}/></Btn>
          <Btn color={T.blu} onClick={()=>setShowAdd(true)}><IcPlus size={14}/>Add Lead</Btn>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:18 }}>
        <StatCard label="Total Leads" value={stats?.total ?? "—"} color={T.blu} Icon={IcUsers}/>
        <StatCard label="Pipeline Value" value={fmtMoney(stats?.pipeline_value)} sub="open deals" color={T.amb} Icon={IcTrend}/>
        <StatCard label="Won Value" value={fmtMoney(stats?.won_value)} sub={`${stats?.byStage?.won?.count||0} customers`} color={T.grn} Icon={IcRupee}/>
        <StatCard label="Conversion" value={(stats?.conversion_rate ?? 0)+"%"} sub="won / closed" color={T.pur} Icon={IcChk}/>
        <StatCard label="Needs Action" value={(stats?.byStage?.new?.count||0)} sub="new, untouched" color={T.cyn} Icon={IcCal}/>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:T.t4, fontSize:13 }}>Loading pipeline…</div>
      ) : view === "kanban" ? (
        <KanbanView leads={filtered} onOpen={setSel} onMove={(id,stage)=>patchLead(id,{stage},"Moved to "+STAGE_MAP[stage].label)}/>
      ) : (
        <ListView leads={filtered} onOpen={setSel}/>
      )}

      {sel && (
        <LeadDrawer lead={sel} agents={agents} onClose={()=>setSel(null)}
          onSave={(body)=>patchLead(sel.id, body, "Saved")} onNote={(n)=>addNote(sel.id,n)} onDelete={()=>removeLead(sel.id)}/>
      )}
      {showAdd && (
        <AddLeadModal agents={agents} onClose={()=>setShowAdd(false)} onCreate={async(body)=>{
          const r = await api.post("/saas-leads", body);
          if (r?.success) { setShowAdd(false); flash("Lead added"); load(); }
          else flash(r?.message || "Failed", "error");
        }}/>
      )}
    </div>
  );
}

// ── KANBAN ──────────────────────────────────────────────────────
function KanbanView({ leads, onOpen, onMove }) {
  return (
    <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, alignItems:"flex-start" }}>
      {STAGES.map(stage => {
        const items = leads.filter(l => l.stage === stage.id);
        const value = items.reduce((s,l)=>s+(l.deal_value||0),0);
        return (
          <div key={stage.id} style={{ minWidth:268, width:268, flexShrink:0, background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:12, padding:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, paddingLeft:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:stage.c }}/>
                <span style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>{stage.label}</span>
                <span style={{ fontSize:11, fontWeight:600, color:T.t4 }}>{items.length}</span>
              </div>
              {value>0 && <span style={{ fontSize:10.5, fontWeight:700, color:stage.c }}>{fmtMoney(value)}</span>}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:"calc(100vh - 320px)", overflowY:"auto" }}>
              {items.length===0 && <div style={{ fontSize:11, color:T.t4, textAlign:"center", padding:"16px 0" }}>No leads</div>}
              {items.map(l => <KCard key={l.id} l={l} stage={stage} onOpen={()=>onOpen(l)} onMove={onMove}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function KCard({ l, stage, onOpen, onMove }) {
  const idx = STAGES.findIndex(s=>s.id===stage.id);
  const next = STAGES[idx+1] && STAGES[idx+1].id !== "lost" ? STAGES[idx+1] : null;
  return (
    <div onClick={onOpen} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:11, cursor:"pointer", boxShadow:"0 1px 2px rgba(0,0,0,.04)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.t1, lineHeight:1.3 }}>{l.name}</div>
        {l.priority && l.priority!=="Medium" && <Tag text={l.priority} c={PRIO_C[l.priority]}/>}
      </div>
      {l.company && <div style={{ fontSize:11.5, color:T.t3, marginTop:2, display:"flex", alignItems:"center", gap:4 }}><IcBuilding size={11} color={T.t4}/>{l.company}</div>}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
        {l.plan_interest && <Tag text={l.plan_interest} c={T.pur}/>}
        {l.deal_value>0 && <Tag text={fmtMoney(l.deal_value)} c={T.grn}/>}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:9 }}>
        <span style={{ fontSize:10, color:T.t4 }}>{timeAgo(l.created_at)}</span>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {l.assigned_to_name && <span title={l.assigned_to_name} style={{ width:20, height:20, borderRadius:"50%", background:T.bluL, color:T.blu, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{initials(l.assigned_to_name)}</span>}
          {next && <button title={"Move to "+next.label} onClick={e=>{e.stopPropagation();onMove(l.id,next.id);}}
            style={{ border:"none", background:next.bg, color:next.c, fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:6, cursor:"pointer" }}>→ {next.label}</button>}
        </div>
      </div>
    </div>
  );
}

// ── LIST ────────────────────────────────────────────────────────
function ListView({ leads, onOpen }) {
  if (!leads.length) return <div style={{ padding:50, textAlign:"center", color:T.t4, fontSize:13, background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12 }}>No leads yet. They'll appear here as the demo form is submitted.</div>;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ background:T.surfaceB, color:T.t3, textAlign:"left" }}>
              {["Lead","Stage","Plan","Value","Assigned","Demo","Created"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.3px", borderBottom:`1px solid ${T.b1}`, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} onClick={()=>onOpen(l)} style={{ cursor:"pointer", borderBottom:`1px solid ${T.b1}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"10px 14px" }}>
                  <div style={{ fontWeight:700, color:T.t1 }}>{l.name}</div>
                  <div style={{ fontSize:11, color:T.t3 }}>{l.company || l.phone || "—"}</div>
                </td>
                <td style={{ padding:"10px 14px" }}><Pill s={l.stage}/></td>
                <td style={{ padding:"10px 14px", color:T.t2 }}>{l.plan_interest || "—"}</td>
                <td style={{ padding:"10px 14px", fontWeight:700, color:l.deal_value>0?T.grn:T.t4 }}>{fmtMoney(l.deal_value)}</td>
                <td style={{ padding:"10px 14px", color:T.t2 }}>{l.assigned_to_name || <span style={{ color:T.t4 }}>Unassigned</span>}</td>
                <td style={{ padding:"10px 14px", color:T.t2, whiteSpace:"nowrap" }}>{l.demo_date ? fmtDate(l.demo_date) : "—"}</td>
                <td style={{ padding:"10px 14px", color:T.t3, whiteSpace:"nowrap" }}>{timeAgo(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DETAIL DRAWER ───────────────────────────────────────────────
function LeadDrawer({ lead, agents, onClose, onSave, onNote, onDelete }) {
  const [f, setF] = useState({});
  const [note, setNote] = useState("");
  useEffect(() => {
    setF({
      stage: lead.stage, priority: lead.priority || "Medium", plan_interest: lead.plan_interest || "",
      deal_value: lead.deal_value || "", assigned_to: lead.assigned_to || "",
      demo_date: lead.demo_date || "", demo_time: lead.demo_time || "", next_followup: lead.next_followup || "",
      lost_reason: lead.lost_reason || "",
    });
  }, [lead]);
  const upd = (k,v) => setF(p=>({ ...p, [k]:v }));
  const wa = digits(lead.phone);

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.4)", zIndex:1000 }}/>
      <div style={{ position:"fixed", top:0, right:0, width:"min(440px,100%)", height:"100vh", background:T.surface, zIndex:1001, boxShadow:"-8px 0 30px rgba(0,0,0,.12)", display:"flex", flexDirection:"column" }}>
        {/* header */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:T.t1 }}>{lead.name}</div>
            {lead.company && <div style={{ fontSize:12.5, color:T.t3, marginTop:2, display:"flex", alignItems:"center", gap:5 }}><IcBuilding size={12}/>{lead.company}</div>}
            <div style={{ marginTop:8 }}><Pill s={f.stage}/></div>
          </div>
          <button onClick={onClose} style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:8, padding:6, cursor:"pointer", display:"flex" }}><IcX size={16} color={T.t3}/></button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {/* contact actions */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {lead.phone && <a href={"tel:"+lead.phone} style={{ textDecoration:"none" }}><Btn variant="ghost" color={T.blu}><IcPhone size={13}/>Call</Btn></a>}
            {wa && <a href={"https://wa.me/"+(wa.length===10?"91"+wa:wa)} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}><Btn variant="ghost" color={T.grn}><IcWa size={13}/>WhatsApp</Btn></a>}
            {lead.email && <a href={"mailto:"+lead.email} style={{ textDecoration:"none" }}><Btn variant="ghost" color={T.t2}><IcMail size={13}/>Email</Btn></a>}
          </div>

          {/* editable pipeline fields */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Stage"><Select value={f.stage} onChange={e=>upd("stage",e.target.value)}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
            <Field label="Priority"><Select value={f.priority} onChange={e=>upd("priority",e.target.value)}>{PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}</Select></Field>
            <Field label="Plan interest"><Select value={f.plan_interest} onChange={e=>upd("plan_interest",e.target.value)}><option value="">—</option>{PLANS.map(p=><option key={p} value={p}>{p}</option>)}</Select></Field>
            <Field label="Deal value (₹/yr)"><TextInput type="number" value={f.deal_value} onChange={e=>upd("deal_value",e.target.value)} placeholder="0"/></Field>
            <Field label="Assign to"><Select value={f.assigned_to} onChange={e=>upd("assigned_to",e.target.value)}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Next follow-up"><TextInput type="date" value={f.next_followup || ""} onChange={e=>upd("next_followup",e.target.value)}/></Field>
            <Field label="Demo date"><TextInput type="date" value={f.demo_date || ""} onChange={e=>upd("demo_date",e.target.value)}/></Field>
            <Field label="Demo time"><TextInput value={f.demo_time} onChange={e=>upd("demo_time",e.target.value)} placeholder="e.g. Morning"/></Field>
          </div>
          {f.stage==="lost" && <Field label="Lost reason"><TextInput value={f.lost_reason} onChange={e=>upd("lost_reason",e.target.value)} placeholder="Why did we lose this?"/></Field>}

          <Btn color={T.blu} onClick={()=>onSave(f)} style={{ width:"100%", marginTop:4, marginBottom:18 }}>Save changes</Btn>

          {/* captured details */}
          <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"12px 14px", marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:10 }}>Lead details</div>
            {[["Phone",lead.phone],["Email",lead.email],["Project type",lead.project_type],["Company size",lead.employees],["Turnover",lead.turnover],["Source",lead.source],["Captured",fmtDateTime(lead.created_at)]].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"4px 0", fontSize:12.5 }}>
                <span style={{ color:T.t4 }}>{k}</span><span style={{ color:T.t1, fontWeight:600, textAlign:"right", wordBreak:"break-word" }}>{v || "—"}</span>
              </div>
            ))}
            {lead.message && <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${T.b1}`, fontSize:12.5, color:T.t2, fontStyle:"italic" }}>"{lead.message}"</div>}
          </div>

          {/* activity */}
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:10 }}>Activity</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <TextInput value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" onKeyDown={e=>{ if(e.key==="Enter"&&note.trim()){ onNote(note.trim()); setNote(""); } }}/>
            <Btn color={T.t2} disabled={!note.trim()} onClick={()=>{ onNote(note.trim()); setNote(""); }}>Add</Btn>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {[...(lead.activity||[])].reverse().map((a,i)=>(
              <div key={i} style={{ display:"flex", gap:10, paddingBottom:12, position:"relative" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background: a.type==="stage"?T.blu:a.type==="note"?T.amb:T.t4, marginTop:4 }}/>
                  {i < (lead.activity||[]).length-1 && <span style={{ width:1, flex:1, background:T.b1, marginTop:2 }}/>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12.5, color:T.t1 }}>{a.note}</div>
                  <div style={{ fontSize:10.5, color:T.t4, marginTop:1 }}>{a.by} · {timeAgo(a.at)}</div>
                </div>
              </div>
            ))}
            {!(lead.activity||[]).length && <div style={{ fontSize:12, color:T.t4 }}>No activity yet.</div>}
          </div>
        </div>

        {/* footer */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:8, justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:8 }}>
            <Btn color={T.grn} onClick={()=>onSave({ ...f, stage:"won" })}><IcChk size={13}/>Won</Btn>
            <Btn variant="ghost" color={T.slt} onClick={()=>onSave({ ...f, stage:"lost" })}>Lost</Btn>
          </div>
          <Btn variant="ghost" color={T.red} onClick={async()=>{ if(await window.confirmAsync("Delete this lead?")) onDelete(); }}><IcTrash size={13}/></Btn>
        </div>
      </div>
    </>
  );
}

// ── ADD LEAD MODAL ──────────────────────────────────────────────
function AddLeadModal({ agents, onClose, onCreate }) {
  const [f, setF] = useState({ name:"", company:"", phone:"", email:"", plan_interest:"", deal_value:"", assigned_to:"", stage:"new", priority:"Medium", source:"manual" });
  const upd = (k,v) => setF(p=>({ ...p, [k]:v }));
  const submit = () => { if(!f.name.trim()) return; onCreate(f); };
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.45)", zIndex:1100 }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(460px,94vw)", maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:14, zIndex:1101, boxShadow:"0 20px 50px rgba(0,0,0,.25)" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:16, fontWeight:800, color:T.t1 }}>Add Lead</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", display:"flex" }}><IcX size={18} color={T.t3}/></button>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <Field label="Name *"><TextInput value={f.name} onChange={e=>upd("name",e.target.value)} placeholder="Contact name"/></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Company"><TextInput value={f.company} onChange={e=>upd("company",e.target.value)}/></Field>
            <Field label="Phone"><TextInput value={f.phone} onChange={e=>upd("phone",e.target.value)}/></Field>
            <Field label="Email"><TextInput value={f.email} onChange={e=>upd("email",e.target.value)}/></Field>
            <Field label="Plan interest"><Select value={f.plan_interest} onChange={e=>upd("plan_interest",e.target.value)}><option value="">—</option>{PLANS.map(p=><option key={p} value={p}>{p}</option>)}</Select></Field>
            <Field label="Deal value (₹/yr)"><TextInput type="number" value={f.deal_value} onChange={e=>upd("deal_value",e.target.value)}/></Field>
            <Field label="Assign to"><Select value={f.assigned_to} onChange={e=>upd("assigned_to",e.target.value)}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          </div>
        </div>
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.b1}`, display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="ghost" color={T.t2} onClick={onClose}>Cancel</Btn>
          <Btn color={T.blu} disabled={!f.name.trim()} onClick={submit}><IcPlus size={13}/>Create</Btn>
        </div>
      </div>
    </>
  );
}
