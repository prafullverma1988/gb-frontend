import { useState } from "react";

// ─── ICONS ───────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcHome       = (p) => <Icon {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />;
const IcProjects   = (p) => <Icon {...p} d="M3 7h18M3 12h18M3 17h18" />;
const IcTask       = (p) => <Icon {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />;
const IcFinance    = (p) => <Icon {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;
const IcDesign     = (p) => <Icon {...p} d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" />;
const IcReport     = (p) => <Icon {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />;
const IcSettings   = (p) => <Icon {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0" />;
const IcWarehouse  = (p) => <Icon {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />;
const IcProcure    = (p) => <Icon {...p} d="M16 11c0 2.21-1.343 4-3 4s-3-1.79-3-4 1.343-4 3-4 3 1.79 3 4z M3 21v-1a8 8 0 0116 0v1" />;
const IcChevron    = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const IcMenu       = (p) => <Icon {...p} d="M4 6h16M4 12h16M4 18h16" />;
const IcBell       = (p) => <Icon {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />;
const IcSearch     = (p) => <Icon {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />;
const IcLocation   = (p) => <Icon {...p} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0" />;
const IcProgress   = (p) => <Icon {...p} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
const IcAdd        = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IcFilter     = (p) => <Icon {...p} d="M3 4h18M7 8h10M11 12h2M12 16h.01" />;
const IcEye        = (p) => <Icon {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" />;
const IcEyeOff     = (p) => <Icon {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />;
const IcTeam       = (p) => <Icon {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 7a4 4 0 100 8 4 4 0 000-8z" />;

// ─── COLORS ──────────────────────────────────────────────────────────
const C = {
  primary:   "#1565C0",
  primary2:  "#1976D2",
  primary3:  "#BBDEFB",
  accent:    "#FF6F00",
  accent2:   "#FFA726",
  sidebar:   "#0D1B2A",
  sidebar2:  "#162032",
  sidebarH:  "#1E2E42",
  white:     "#FFFFFF",
  bg:        "#F1F4F8",
  card:      "#FFFFFF",
  text:      "#1A2332",
  textMid:   "#4A5568",
  textLight: "#8896A6",
  border:    "#E2E8F0",
  green:     "#2E7D32",
  greenL:    "#E8F5E9",
  orange:    "#E65100",
  orangeL:   "#FFF3E0",
  red:       "#C62828",
  redL:      "#FFEBEE",
  blue:      "#1565C0",
  blueL:     "#E3F2FD",
};

// ─── PROJECT DATA ─────────────────────────────────────────────────────
const projects = [];

const statusMeta = {
  "Ongoing":     { bg: C.greenL,  text: C.green,  dot: C.green  },
  "Completed":   { bg: C.blueL,   text: C.blue,   dot: C.blue   },
  "Hold":        { bg: C.orangeL, text: C.orange,  dot: C.accent },
  "Not Started": { bg: C.border,  text: C.textMid, dot: C.textLight },
};

const fmt = (n) => n >= 10000000 ? `${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `${(n/100000).toFixed(1)}L` : `${(n/1000).toFixed(0)}K`;

// ─── LOGIN SCREEN ──────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@gbuildcon.com");
  const [pass, setPass]   = useState("••••••••");
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1200);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.sidebar} 0%, #1B3A5C 50%, ${C.primary} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* BG decorative circles */}
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ position: "absolute", borderRadius: "50%", border: `1px solid rgba(255,255,255,0.05)`, width: `${(i+1)*260}px`, height: `${(i+1)*260}px`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
      ))}
      <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}22, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle, ${C.primary2}33, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "48px 44px", width: 420, boxShadow: "0 32px 80px rgba(0,0,0,0.35)", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, marginBottom: 16, boxShadow: `0 8px 24px ${C.primary}44` }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M12 3v18" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>Construction Manager</div>
          <div style={{ fontSize: 13, color: C.textLight, marginTop: 4, fontWeight: 500 }}>Construction Management Platform</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.6px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Email / Username</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: C.bg, outline: "none", boxSizing: "border-box", transition: "border 0.2s", fontFamily: "inherit" }}
            onFocus={e => e.target.style.borderColor = C.primary}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.6px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
              style={{ width: "100%", padding: "12px 44px 12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: C.bg, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textLight, padding: 4 }}>
              {show ? <IcEyeOff size={18} /> : <IcEye size={18} />}
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: 10, background: loading ? C.textLight : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: "white", fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : `0 6px 20px ${C.primary}55`, transition: "all 0.2s", letterSpacing: "0.3px" }}>
          {loading ? "Logging in..." : "Login to Dashboard"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.textLight }}>
          Forgot password? <span style={{ color: C.primary, cursor: "pointer", fontWeight: 600 }}>Reset here</span>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard",  label: "Dashboard",   Icon: IcHome,      section: null },
  { id: "projects",   label: "Projects",    Icon: IcProjects,  section: null },
  { id: "design",     label: "Design",      Icon: IcDesign,    section: "MODULES" },
  { id: "finance",    label: "Finance",     Icon: IcFinance,   section: null },
  { id: "procurement",label: "Procurement", Icon: IcProcure,   section: null },
  { id: "warehouse",  label: "Warehouse",   Icon: IcWarehouse, section: null },
  { id: "team",       label: "Team Schedule",Icon: IcTeam,     section: null },
  { id: "reports",    label: "Reports",     Icon: IcReport,    section: "REPORTS & MORE" },
  { id: "settings",   label: "Settings",    Icon: IcSettings,  section: null },
];

function Sidebar({ active, setActive, collapsed, setCollapsed }) {
  return (
    <div style={{ width: collapsed ? 64 : 240, minHeight: "100vh", background: C.sidebar, display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(.4,0,.2,1)", overflow: "hidden", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.25)", zIndex: 100, position: "relative" }}>
      {/* Logo area */}
      <div style={{ padding: collapsed ? "20px 0" : "20px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.07)", minHeight: 72, justifyContent: collapsed ? "center" : "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${C.accent}44` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>Construction Manager</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase" }}>Construction</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {navItems.map((item, idx) => {
          const isActive = active === item.id;
          const showSection = item.section && !collapsed;
          return (
            <div key={item.id}>
              {showSection && (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", padding: "16px 20px 6px", marginTop: idx > 0 ? 4 : 0 }}>
                  {item.section}
                </div>
              )}
              <button onClick={() => setActive(item.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "12px 0" : "11px 20px", background: isActive ? `linear-gradient(90deg, ${C.primary}CC, ${C.primary}88)` : "none", border: "none", cursor: "pointer", color: isActive ? "white" : "rgba(255,255,255,0.55)", borderRadius: collapsed ? 0 : 0, transition: "all 0.15s", position: "relative", justifyContent: collapsed ? "center" : "flex-start", borderLeft: isActive && !collapsed ? `3px solid ${C.accent}` : "3px solid transparent" }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = C.sidebarH; e.currentTarget.style.color = "white"; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}}
              >
                <item.Icon size={18} color="currentColor" />
                {!collapsed && <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>}
                {isActive && collapsed && <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 24, background: C.accent, borderRadius: "2px 0 0 2px" }} />}
              </button>
            </div>
          );
        })}
      </nav>

      {/* User area */}
      <div style={{ padding: collapsed ? "12px 0" : "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #FF8F00)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: "white" }}>{(localStorage.getItem("gb_user_name")||"U")[0]}</div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "white", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{localStorage.getItem("gb_user_name")||"User"}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{localStorage.getItem("gb_user_role")||"Admin"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────────
function TopBar({ title, subtitle, collapsed, setCollapsed }) {
  return (
    <div style={{ height: 64, background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
      <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, padding: 8, borderRadius: 8, display: "flex" }}
        onMouseEnter={e => e.currentTarget.style.background = C.bg}
        onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <IcMenu size={20} />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.textLight }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, padding: 8, borderRadius: 8, position: "relative" }}
          onMouseEnter={e => e.currentTarget.style.background = C.bg}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <IcBell size={20} />
          <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: C.accent, border: "2px solid white" }} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #FF8F00)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>P</div>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.primary }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderTop: `3px solid ${color}`, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{value}</div>
      <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── PROJECTS PAGE ────────────────────────────────────────────────────
function ProjectsPage({ onOpenProject }) {
  const [search, setSearch]     = useState("");
  const [filterCity, setFilterCity] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const cities = ["All", ...Array.from(new Set(projects.map(p => p.city)))];
  const statuses = ["All", "Ongoing", "Hold", "Not Started"];

  const filtered = projects.filter(p => {
    if (hideCompleted && p.status === "Completed") return false;
    if (filterCity !== "All" && p.city !== filterCity) return false;
    if (filterStatus !== "All" && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: filtered.length,
    ongoing: filtered.filter(p => p.status === "Ongoing").length,
    hold: filtered.filter(p => p.status === "Hold").length,
    notStarted: filtered.filter(p => p.status === "Not Started").length,
    totalBOQ: filtered.reduce((s, p) => s + p.boq, 0),
  };

  return (
    <div style={{ padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Quick Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Total Projects" value={stats.total} sub={filterCity !== "All" ? `City: ${filterCity}` : "All cities"} color={C.primary} />
        <StatCard label="Ongoing" value={stats.ongoing} sub="Active sites" color={C.green} />
        <StatCard label="On Hold" value={stats.hold} sub="Paused" color={C.accent} />
        <StatCard label="Not Started" value={stats.notStarted} sub="Yet to begin" color={C.textLight} />
        <StatCard label="Total BOQ Value" value={`Rs.${fmt(stats.totalBOQ)}`} sub="Combined" color={C.primary2} />
      </div>

      {/* Toolbar */}
      <div style={{ background: C.white, borderRadius: 12, padding: "14px 18px", marginBottom: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <IcSearch size={16} color={C.textLight} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or clients..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: C.bg, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>

        {/* City Filter */}
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: C.bg, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {cities.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* Status Filter */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: C.bg, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* Hide Completed toggle */}
        <button onClick={() => setHideCompleted(!hideCompleted)}
          style={{ padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${hideCompleted ? C.primary : C.border}`, fontSize: 13, fontWeight: hideCompleted ? 600 : 400, color: hideCompleted ? C.primary : C.textMid, background: hideCompleted ? C.blueL : C.bg, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "inherit" }}>
          {hideCompleted ? "✓" : ""} Hide Completed
        </button>

        {/* Add Project */}
        <button style={{ padding: "9px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 3px 10px ${C.primary}44`, whiteSpace: "nowrap", fontFamily: "inherit" }}>
          <IcAdd size={16} color="white" /> New Project
        </button>
      </div>

      {/* Project Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map(p => {
          const sm = statusMeta[p.status];
          const margin = p.boq - p.expense;
          const marginPct = ((margin / p.boq) * 100).toFixed(0);
          return (
            <div key={p.id}
              style={{ background: C.white, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", border: `1px solid ${C.border}` }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
            >
              {/* Card Header */}
              <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.textLight }}>{p.client}</div>
                  </div>
                  <span style={{ background: sm.bg, color: sm.text, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>{p.status}</span>
                </div>

                <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textMid }}>
                    <IcLocation size={13} color={C.textLight} /> {p.city}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMid }}>{p.type}</div>
                  <div style={{ fontSize: 12, color: C.textMid }}>PM: {p.pm}</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: C.textMid }}>Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.progress === 100 ? C.green : C.text }}>{p.progress}%</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.progress}%`, background: p.progress === 100 ? C.green : p.progress > 60 ? C.primary2 : p.progress > 30 ? C.accent2 : C.accent, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>

                {/* Financial row */}
                <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>BOQ Value</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Rs.{fmt(p.boq)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>Expense</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>Rs.{fmt(p.expense)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>Margin</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: margin > 0 ? C.green : C.red }}>
                      {margin > 0 ? "+" : ""}Rs.{fmt(Math.abs(margin))} ({marginPct}%)
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, color: C.textLight }}>{p.start} → {p.end}</span>
                  <button onClick={() => onOpenProject && onOpenProject({ id: p.id, name: p.name })}
                    style={{ fontSize: 12, fontWeight: 600, color: C.primary, background: C.blueL, border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 6 }}>
                    Open →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.textLight }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.textMid }}>No projects found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try changing filters or search term</div>
        </div>
      )}
    </div>
  );
}

// ─── PLACEHOLDER PAGES ────────────────────────────────────────────────
function PlaceholderPage({ title, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", color: C.textLight }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.textMid }}>{title}</div>
        <div style={{ fontSize: 14, marginTop: 6 }}>Screen coming soon in design phase</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeNav, setActiveNav] = useState("projects");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openedProject, setOpenedProject] = useState(null); // { id, name } when project detail open

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  // When project is open — hide sidebar, show breadcrumb
  const inProjectDetail = !!openedProject;

  const pageMap = {
    dashboard:   { title: "Dashboard",    sub: "Company Overview", icon: "🏠",  el: <PlaceholderPage title="Dashboard" icon="🏠" /> },
    projects:    { title: "Projects",     sub: "All Construction Projects", icon: "🏗️", el: <ProjectsPage onOpenProject={p => setOpenedProject(p)} /> },
    design:      { title: "Design",       sub: "Drawings & Files", icon: "📐", el: <PlaceholderPage title="Design Module" icon="📐" /> },
    finance:     { title: "Finance",      sub: "Cash Book · Challan · Transactions", icon: "💰", el: <PlaceholderPage title="Finance" icon="💰" /> },
    procurement: { title: "Procurement",  sub: "RFQ · Purchase Orders", icon: "📦", el: <PlaceholderPage title="Procurement" icon="📦" /> },
    warehouse:   { title: "Warehouse",    sub: "Central Stock", icon: "🏭", el: <PlaceholderPage title="Warehouse" icon="🏭" /> },
    team:        { title: "Team Schedule",sub: "Gantt · Timesheets", icon: "👥", el: <PlaceholderPage title="Team Schedule" icon="👥" /> },
    reports:     { title: "Reports",      sub: "All Reports", icon: "📊", el: <PlaceholderPage title="Reports" icon="📊" /> },
    settings:    { title: "Settings",     sub: "Roles · Approvals · Config", icon: "⚙️", el: <PlaceholderPage title="Settings" icon="⚙️" /> },
  };

  const page = pageMap[activeNav] || pageMap.projects;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Sidebar — hidden when in project detail */}
      {!inProjectDetail && (
        <Sidebar active={activeNav} setActive={setActiveNav} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {inProjectDetail ? (
          /* Project Detail Breadcrumb TopBar */
          <div style={{ height: 52, background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
            <button onClick={() => { setOpenedProject(null); setActiveNav("projects"); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.primary, fontSize: 13.5, fontWeight: 600, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Construction Manager
            </button>
            <span style={{ color: C.textLight, fontSize: 14 }}>›</span>
            <button onClick={() => { setOpenedProject(null); setActiveNav("projects"); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.primary, fontSize: 13.5, fontWeight: 600, padding: "4px 8px", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              Projects
            </button>
            <span style={{ color: C.textLight, fontSize: 14 }}>›</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{openedProject?.name}</span>
            <div style={{ flex: 1 }} />
            {/* Notification + Avatar */}
            <button style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, padding: 8, borderRadius: 8, position: "relative" }}>
              <IcBell size={18} />
              <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: C.accent, border: "2px solid white" }} />
            </button>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #FF8F00)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{(localStorage.getItem("gb_user_name")||"U")[0]}</div>
          </div>
        ) : (
          <TopBar title={page.title} subtitle={page.sub} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        )}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {inProjectDetail
            ? <ProjectDetailFromApp projectId={openedProject.id} projectName={openedProject.name} onBack={() => setOpenedProject(null)} />
            : page.el}
        </div>
      </div>
    </div>
  );
}

// Wrapper to load ProjectDetailPage with project context
function ProjectDetailFromApp({ projectId, projectName, onBack }) {
  return <ProjectDetailPage projectId={projectId} projectName={projectName} onBack={onBack} />;
}
