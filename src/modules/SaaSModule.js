import { useState, useEffect } from "react";

const API = "https://gb-backend-production-7bd2.up.railway.app/api";
const tok = () => localStorage.getItem("token");
const apiFetch = (path, opts = {}) =>
  fetch(API + path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok(), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(r => r.json());

// ── ICONS ──────────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcBuilding  = p => <Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />;
const IcUsers     = p => <Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />;
const IcPuzzle    = p => <Ic {...p} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />;
const IcTrend     = p => <Ic {...p} d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />;
const IcPlus      = p => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX         = p => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcChk       = p => <Ic {...p} d="M20 6L9 17l-5-5" />;
const IcEye       = p => <Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />;
const IcEyeX      = p => <Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />;
const IcRefresh   = p => <Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />;
const IcLock      = p => <Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />;

// ── THEME ──────────────────────────────────────────────────────────────
const T = {
  bg:"#F4F6F9", surface:"#FFFFFF", surfaceB:"#F8F9FB",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  grn:"#059669", grnL:"#ECFDF5", grnM:"#A7F3D0",
  amb:"#D97706", ambL:"#FFFBEB", ambM:"#FDE68A",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
  pur:"#7C3AED", purL:"#F5F3FF", purM:"#DDD6FE",
  slt:"#64748B", sltL:"#F1F5F9",
};

const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// ── SHARED ─────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", top:20, right:24, zIndex:9999, padding:"11px 18px", borderRadius:9,
      background: type==="error" ? T.redL : T.grnL,
      border: `1px solid ${type==="error" ? T.redM : T.grnM}`,
      color: type==="error" ? T.red : T.grn,
      fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", gap:10 }}>
      {type==="error" ? <IcX size={14}/> : <IcChk size={14}/>}
      {msg}
      <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", display:"flex", marginLeft:6 }}><IcX size={12}/></button>
    </div>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <div onClick={() => !disabled && onChange(!value)}
      style={{ width:44, height:24, borderRadius:24, background: disabled ? T.grn : (value ? T.grn : T.b2),
        cursor: disabled ? "not-allowed" : "pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:"50%", background:"white", position:"absolute",
        top:3, left: (disabled || value) ? 23 : 3, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
    </div>
  );
}

function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div style={{ padding:"16px 18px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, borderTop:`3px solid ${color}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={17} color={color}/>
        </div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:T.t1, letterSpacing:"-0.5px", lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10.5, color:T.t4 }}>{sub}</div>}
    </div>
  );
}

// ── TAB: STATS ─────────────────────────────────────────────────────────
function TabStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/stats").then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading stats...</div>;
  if (!data) return <div style={{ textAlign:"center", padding:60, color:T.red, fontSize:13 }}>Failed to load</div>;

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ fontSize:16, fontWeight:700, color:T.t1 }}>Platform Overview</div>
        <button onClick={load} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:7, border:`1px solid ${T.b1}`, background:T.surface, fontSize:12, color:T.t3, cursor:"pointer", fontWeight:500 }}>
          <IcRefresh size={13}/> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <StatCard label="Total Companies"  value={data.companies.total}  sub={`${data.companies.active} active`}   color={T.blu} Icon={IcBuilding}/>
        <StatCard label="Total Users"      value={data.users.total}      sub="Across all companies"                 color={T.pur} Icon={IcUsers}/>
        <StatCard label="Modules Enabled"  value={data.modules.enabled}  sub="Module-company pairs"                 color={T.grn} Icon={IcPuzzle}/>
        <StatCard label="New Today"        value={data.new_today}         sub="Companies registered today"           color={T.amb} Icon={IcTrend}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Module usage */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Module Usage</span>
          </div>
          <div style={{ padding:"12px 16px" }}>
            {data.module_usage.length === 0 && <div style={{ fontSize:12, color:T.t4, textAlign:"center", padding:"20px 0" }}>No data yet</div>}
            {data.module_usage.map((m, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:90, fontSize:12, color:T.t2, fontWeight:500 }}>{m.module_key}</div>
                <div style={{ flex:1, height:6, background:T.b1, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min((m.company_count / Math.max(data.companies.total,1))*100, 100)}%`, background:T.blu, borderRadius:3 }}/>
                </div>
                <div style={{ width:24, fontSize:11, fontWeight:700, color:T.t1, textAlign:"right" }}>{m.company_count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent companies */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB }}>
            <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Recent Companies</span>
          </div>
          <div>
            {data.recent_companies.map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderBottom: i < data.recent_companies.length-1 ? `1px solid ${T.b1}` : "none" }}>
                <div style={{ width:32, height:32, borderRadius:8, background:T.bluL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:T.blu }}>{c.name[0].toUpperCase()}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:T.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                  <div style={{ fontSize:10.5, color:T.t4 }}>{c.user_count} users · {fmtDate(c.created_at)}</div>
                </div>
                <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:20,
                  background: c.is_active ? T.grnL : T.redL,
                  color: c.is_active ? T.grn : T.red,
                  border:`1px solid ${c.is_active ? T.grnM : T.redM}` }}>
                  {c.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: COMPANIES ─────────────────────────────────────────────────────
function TabCompanies({ onSelectCompany }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState(null);
  const [form, setForm]           = useState({ name:"", admin_name:"", admin_email:"", admin_password:"", phone:"", city:"", state:"" });
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch("/saas-admin/companies").then(res => {
      if (res.success) setCompanies(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const createCompany = async () => {
    if (!form.name || !form.admin_name || !form.admin_email || !form.admin_password) {
      setToast({ msg:"All required fields must be filled", type:"error" }); return;
    }
    setSaving(true);
    const res = await apiFetch("/saas-admin/companies", { method:"POST", body: form });
    setSaving(false);
    if (res.success) {
      setToast({ msg: res.message, type:"success" });
      setShowModal(false);
      setForm({ name:"", admin_name:"", admin_email:"", admin_password:"", phone:"", city:"", state:"" });
      load();
    } else {
      setToast({ msg: res.message, type:"error" });
    }
  };

  const toggleCompany = async (id) => {
    setToggling(id);
    const res = await apiFetch("/saas-admin/companies/" + id + "/toggle", { method:"PUT" });
    if (res.success) {
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_active: res.is_active } : c));
      setToast({ msg: res.message, type:"success" });
    }
    setToggling(null);
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:T.t1 }}>Companies</div>
          <div style={{ fontSize:12, color:T.t3, marginTop:2 }}>{companies.length} companies registered</div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:8, background:T.blu, color:"white", fontSize:13, fontWeight:600, border:"none", cursor:"pointer" }}>
          <IcPlus size={15} color="white"/> New Company
        </button>
      </div>

      {loading ? <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading...</div> : (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 80px 100px 110px 48px", padding:"9px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}` }}>
            {["Company","City","Users","Projects","Created","Status",""].map((h,i) => (
              <div key={i} style={{ fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
            ))}
          </div>
          {companies.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No companies yet. Create one!</div>
          )}
          {companies.map((c, i) => (
            <div key={c.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 80px 80px 100px 110px 48px", padding:"11px 16px", borderBottom: i < companies.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{c.name}</div>
                <div style={{ fontSize:10.5, color:T.t4 }}>/{c.slug}</div>
              </div>
              <div style={{ fontSize:12.5, color:T.t2 }}>{c.city || "—"}</div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{c.user_count}</div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{c.project_count}</div>
              <div style={{ fontSize:11.5, color:T.t3 }}>{fmtDate(c.created_at)}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20,
                  background: c.is_active ? T.grnL : T.redL,
                  color: c.is_active ? T.grn : T.red,
                  border:`1px solid ${c.is_active ? T.grnM : T.redM}` }}>
                  {c.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                <button onClick={() => onSelectCompany(c)} title="Manage modules"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.b1}`, background:T.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcPuzzle size={13} color={T.t3}/>
                </button>
                <button onClick={() => toggleCompany(c.id)} disabled={toggling === c.id} title={c.is_active ? "Deactivate" : "Activate"}
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${c.is_active ? T.redM : T.grnM}`, background: c.is_active ? T.redL : T.grnL, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {c.is_active ? <IcX size={12} color={T.red}/> : <IcChk size={12} color={T.grn}/>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Company Modal */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:480, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Create New Company</div>
              <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              {/* Company Name */}
              <div>
                <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Company Name *</label>
                <input value={form.name} onChange={upd("name")} placeholder="e.g. Blackbox Constructions"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
              {/* Admin details */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Admin Name *</label>
                  <input value={form.admin_name} onChange={upd("admin_name")} placeholder="Full name"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Admin Email *</label>
                  <input value={form.admin_email} onChange={upd("admin_email")} placeholder="admin@company.com"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              </div>
              {/* Password */}
              <div>
                <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Admin Password *</label>
                <div style={{ position:"relative" }}>
                  <input type={showPass ? "text" : "password"} value={form.admin_password} onChange={upd("admin_password")} placeholder="Min 8 characters"
                    style={{ width:"100%", padding:"9px 38px 9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                  <button onClick={() => setShowPass(s=>!s)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.t4, display:"flex" }}>
                    {showPass ? <IcEyeX size={15}/> : <IcEye size={15}/>}
                  </button>
                </div>
              </div>
              {/* City + State */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>City</label>
                  <input value={form.city} onChange={upd("city")} placeholder="e.g. Raipur"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
                <div>
                  <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>State</label>
                  <input value={form.state} onChange={upd("state")} placeholder="e.g. Chhattisgarh"
                    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <button onClick={() => setShowModal(false)} style={{ flex:1, padding:"10px", borderRadius:7, background:T.surface, border:`1px solid ${T.b1}`, fontSize:13, fontWeight:600, color:T.t3, cursor:"pointer" }}>Cancel</button>
              <button onClick={createCompany} disabled={saving}
                style={{ flex:2, padding:"10px", borderRadius:7, background: saving ? T.t4 : T.blu, color:"white", fontSize:13, fontWeight:700, border:"none", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Creating..." : "Create Company"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB: MODULE ACCESS (per company) ───────────────────────────────────
function TabModuleAccess({ selectedCompany, onBack, companies }) {
  const [company, setCompany]   = useState(selectedCompany || null);
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(null);
  const [toast, setToast]       = useState(null);

  const loadModules = (cid) => {
    setLoading(true);
    apiFetch("/saas-admin/companies/" + cid + "/modules").then(res => {
      if (res.success) setModules(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (company) loadModules(company.id); }, [company?.id]);

  const toggle = async (key, newVal) => {
    setSaving(key);
    const res = await apiFetch("/saas-admin/companies/" + company.id + "/modules/" + key, {
      method:"PUT", body: { is_enabled: newVal }
    });
    if (res.success) {
      setModules(prev => prev.map(m => m.key === key ? { ...m, is_enabled: newVal } : m));
      setToast({ msg: res.message, type:"success" });
    } else {
      setToast({ msg: res.message, type:"error" });
    }
    setSaving(null);
  };

  return (
    <div style={{ padding:"20px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.t1, marginBottom:6 }}>Module Access</div>
          {/* Company selector */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:12, color:T.t3 }}>Company:</span>
            <select value={company?.id || ""} onChange={e => {
              const c = companies.find(x => x.id === Number(e.target.value));
              setCompany(c || null);
            }} style={{ padding:"6px 10px", borderRadius:7, border:`1px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
              <option value="">-- Select company --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {company && (
          <div style={{ padding:"8px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8, fontSize:12, color:T.blu, fontWeight:600 }}>
            {modules.filter(m => m.is_enabled).length} / {modules.length} modules enabled
          </div>
        )}
      </div>

      {!company && (
        <div style={{ textAlign:"center", padding:"60px 0", color:T.t3, fontSize:13 }}>
          <IcBuilding size={40} color={T.b2}/>
          <div style={{ marginTop:12 }}>Select a company to manage its module access</div>
        </div>
      )}

      {company && loading && <div style={{ textAlign:"center", padding:40, color:T.t3, fontSize:13 }}>Loading modules...</div>}

      {company && !loading && modules.length > 0 && (
        <div>
          {/* Core */}
          <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
            Core Modules
            <div style={{ flex:1, height:1, background:T.b1 }}/>
            <span style={{ fontSize:10, color:T.grn, fontWeight:600, background:T.grnL, padding:"1px 8px", borderRadius:20 }}>Always included</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20 }}>
            {modules.filter(m => !m.canDisable).map(m => (
              <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>
            ))}
          </div>

          {/* Standard */}
          <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
            Standard Modules
            <div style={{ flex:1, height:1, background:T.b1 }}/>
            <span style={{ fontSize:10, color:T.amb, fontWeight:600, background:T.ambL, padding:"1px 8px", borderRadius:20 }}>Toggleable</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {modules.filter(m => m.canDisable).map(m => (
              <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModAccessRow({ m, saving, onToggle }) {
  const isCore = !m.canDisable;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 16px", background:T.surface, borderRadius:8, border:`1px solid ${T.b1}`, opacity: isCore ? 1 : (m.is_enabled ? 1 : 0.65) }}>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ fontSize:13, fontWeight:600, color: m.is_enabled ? T.t1 : T.t3 }}>{m.label}</span>
          <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:20, textTransform:"uppercase",
            background: isCore ? T.grnL : T.ambL, color: isCore ? T.grn : T.amb,
            border:`1px solid ${isCore ? T.grnM : T.ambM}` }}>{m.tier}</span>
          {isCore && <span style={{ fontSize:10, color:T.t4 }}>— locked</span>}
        </div>
      </div>
      <span style={{ fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:20,
        background: m.is_enabled ? T.grnL : T.sltL,
        color: m.is_enabled ? T.grn : T.slt }}>
        {m.is_enabled ? "ON" : "OFF"}
      </span>
      <Toggle value={m.is_enabled} disabled={isCore} onChange={v => onToggle(m.key, v)}/>
    </div>
  );
}

// ── TAB: ALL USERS ─────────────────────────────────────────────────────
function TabUsers() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/saas-admin/users").then(res => {
      if (res.success) setUsers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = r => ({ super_admin:T.pur, admin:T.blu, project_manager:T.grn, supervisor:T.amb, viewer:T.slt }[r] || T.slt);

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.t1 }}>All Users</div>
          <div style={{ fontSize:12, color:T.t3, marginTop:2 }}>{users.length} users across all companies</div>
        </div>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company..."
            style={{ width:260, padding:"8px 12px 8px 32px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12.5, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
        </div>
      </div>

      {loading ? <div style={{ textAlign:"center", padding:60, color:T.t3, fontSize:13 }}>Loading users...</div> : (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1.5fr 110px 100px 100px", padding:"9px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}` }}>
            {["Name","Email","Company","Role","Status","Last Login"].map((h,i) => (
              <div key={i} style={{ fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
            ))}
          </div>
          {filtered.length === 0 && <div style={{ textAlign:"center", padding:"40px 0", color:T.t3, fontSize:13 }}>No users found</div>}
          {filtered.map((u, i) => (
            <div key={u.id} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1.5fr 110px 100px 100px", padding:"10px 16px", borderBottom: i < filtered.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.name}</div>
              <div style={{ fontSize:12, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
              <div style={{ fontSize:12, color:T.t2 }}>{u.company_name}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:roleColor(u.role)+"18", color:roleColor(u.role), textTransform:"capitalize" }}>
                  {u.role.replace("_"," ")}
                </span>
              </div>
              <div>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                  background: u.is_active ? T.grnL : T.redL, color: u.is_active ? T.grn : T.red }}>
                  {u.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div style={{ fontSize:11, color:T.t4 }}>{u.last_login ? fmtDate(u.last_login) : "Never"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN SAAS MODULE ───────────────────────────────────────────────────
const TABS = [
  { id:"stats",    label:"Platform Stats", Icon:IcTrend   },
  { id:"companies",label:"Companies",      Icon:IcBuilding },
  { id:"modules",  label:"Module Access",  Icon:IcPuzzle  },
  { id:"users",    label:"All Users",      Icon:IcUsers   },
];

export default function SaaSModule() {
  const [tab, setTab]               = useState("stats");
  const [companies, setCompanies]   = useState([]);
  const [selCompany, setSelCompany] = useState(null);

  // Load companies for module access tab
  useEffect(() => {
    apiFetch("/saas-admin/companies").then(res => {
      if (res.success) setCompanies(res.data);
    }).catch(() => {});
  }, []);

  const handleSelectCompany = (c) => {
    setSelCompany(c);
    setTab("modules");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#F4F6F9" }}>
      {/* Header */}
      <div style={{ background:"#0D1B2A", padding:"14px 24px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:"white", letterSpacing:"-0.3px" }}>SaaS Admin Panel</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Platform management — super admin only</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", background:"rgba(124,58,237,0.2)", border:"1px solid rgba(124,58,237,0.4)", borderRadius:20 }}>
          <IcLock size={12} color="#A78BFA"/>
          <span style={{ fontSize:11, fontWeight:600, color:"#A78BFA" }}>SUPER ADMIN</span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#FFFFFF", borderBottom:`1px solid ${T.b1}`, display:"flex", padding:"0 20px", flexShrink:0 }}>
        {TABS.map(t => {
          const isA = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 16px", border:"none", background:"none", cursor:"pointer",
                color: isA ? T.blu : T.t3, fontWeight: isA ? 700 : 400, fontSize:13,
                borderBottom: isA ? `2.5px solid ${T.blu}` : "2.5px solid transparent",
                transition:"all 0.15s", fontFamily:"inherit" }}>
              <t.Icon size={15} color={isA ? T.blu : T.t3}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {tab === "stats"     && <TabStats/>}
        {tab === "companies" && <TabCompanies onSelectCompany={handleSelectCompany}/>}
        {tab === "modules"   && <TabModuleAccess selectedCompany={selCompany} companies={companies}/>}
        {tab === "users"     && <TabUsers/>}
      </div>
    </div>
  );
}
