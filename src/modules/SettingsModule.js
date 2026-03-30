import { useState, useEffect } from "react";
import api from "../config/api";

// ─── ICON COMPONENT ──────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ─── SVG ICONS ───────────────────────────────────────────────────────
const IcBuilding   = (p) => <Icon {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M12 3v18" />;
const IcShield     = (p) => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcLayers     = (p) => <Icon {...p} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
const IcCalendar   = (p) => <Icon {...p} d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" />;
const IcBank       = (p) => <Icon {...p} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />;
const IcBox        = (p) => <Icon {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />;
const IcDollar     = (p) => <Icon {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;
const IcBell       = (p) => <Icon {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />;
const IcHash       = (p) => <Icon {...p} d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />;
const IcClipboard  = (p) => <Icon {...p} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />;
const IcCheck      = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />;
const IcChevR      = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const IcEdit       = (p) => <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IcTrash      = (p) => <Icon {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />;
const IcPlus       = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IcUsers      = (p) => <Icon {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" />;
const IcLock       = (p) => <Icon {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />;
const IcGlobe      = (p) => <Icon {...p} d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />;
const IcTool       = (p) => <Icon {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />;
const IcSave       = (p) => <Icon {...p} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" />;
const IcX          = (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
const IcPhone      = (p) => <Icon {...p} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const IcMail       = (p) => <Icon {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />;
const IcFolder     = (p) => <Icon {...p} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />;

// ─── BALANCED THEME TOKENS ───────────────────────────────────────────
const T = {
  bg: "#F4F6F9",
  card: "#FFFFFF",
  cardHover: "#FAFBFC",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  blueMid: "#3B82F6",
  green: "#059669",
  greenSoft: "#ECFDF5",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  red: "#DC2626",
  redSoft: "#FEF2F2",
  purple: "#7C3AED",
  purpleSoft: "#F5F3FF",
  teal: "#0D9488",
  tealSoft: "#F0FDFA",
  text: "#111827",
  textMid: "#4B5563",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.1)",
  shadowLg: "0 12px 40px rgba(0,0,0,0.18)",
  radius: 10,
  radiusSm: 6,
  font: "'Segoe UI', system-ui, -apple-system, sans-serif",
  whatsapp: "#25D366",
  whatsappSoft: "#E8FFF0",
};

// ─── PROJECTS DATA (for project access) ──────────────────────────────
const allProjects = [
  { id: 1, name: "Shubham & Nand Kishor 623", city: "Raipur", status: "Ongoing" },
  { id: 2, name: "Tikendra Banchhor Residence", city: "Raipur", status: "Ongoing" },
  { id: 3, name: "Esther Risali Commercial", city: "Bilaspur", status: "Ongoing" },
  { id: 4, name: "Amarendra Shrivastava Villa", city: "Raipur", status: "Ongoing" },
  { id: 5, name: "Shyam Ji Township Phase 1", city: "Bhilai", status: "Completed" },
  { id: 6, name: "Simran Kaur Bungalow", city: "Raipur", status: "Not Started" },
  { id: 7, name: "Neha Sagar Office Complex", city: "Durg", status: "Hold" },
  { id: 8, name: "Bablu Mehta Farmhouse", city: "Raipur", status: "Ongoing" },
];

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────

function Toggle({ value, onChange, disabled = false }) {
  return (
    <button onClick={() => !disabled && onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: value ? T.blue : "#D1D5DB", position: "relative", cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.2s", opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

function ToggleRow({ icon, label, desc, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: T.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SectionCard({ title, desc, children, action }) {
  return (
    <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 20 }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
          {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: "10px 22px 18px" }}>{children}</div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", half = false, disabled = false }) {
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 200 : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: disabled ? T.borderLight : "white", outline: "none", boxSizing: "border-box", fontFamily: T.font, transition: "border 0.2s" }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = T.blue; }}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, half = false }) {
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 200 : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", cursor: "pointer", fontFamily: T.font, boxSizing: "border-box" }}>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

function Badge({ text, color = T.blue, bg = T.blueSoft }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;
}

function SaveBtn({ onClick, label = "Save Changes" }) {
  return (
    <button onClick={onClick}
      style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 3px 10px ${T.blue}33`, transition: "transform 0.1s" }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
      <IcSave size={15} color="white" /> {label}
    </button>
  );
}

// ─── MODAL OVERLAY ───────────────────────────────────────────────────
function Modal({ open, onClose, title, desc, width = 560, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}
      onClick={onClose}>
      {/* backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      {/* panel */}
      <div style={{ position: "relative", width, maxWidth: "92vw", maxHeight: "88vh", background: T.card, borderRadius: 14, boxShadow: T.shadowLg, display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
          </div>
          <button onClick={onClose} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}>
            <IcX size={18} color={T.textMid} />
          </button>
        </div>
        {/* body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPANY SETTINGS (unchanged from before)
// ═══════════════════════════════════════════════════════════════════════
function CompanySettings() {
  const [company, setCompany] = useState({
    name: "GB Buildcon Pvt. Ltd.", legalName: "Greenbox Buildcon Private Limited",
    gstin: "22AABCG1234F1Z5", pan: "AABCG1234F",
    address: "123, Civil Lines, Shankar Nagar", city: "Raipur", state: "Chhattisgarh", pincode: "492001",
    phone: "+91 98765 43210", email: "info@gbbuildcon.com", website: "www.gbbuildcon.com",
  });
  const upd = (k, v) => setCompany(p => ({ ...p, [k]: v }));

  return (
    <div>
      <SectionCard title="Company Profile" desc="Basic company information visible on invoices and reports" action={<SaveBtn />}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", padding: "14px 0 20px", borderBottom: `1px solid ${T.borderLight}`, marginBottom: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 14, background: "linear-gradient(135deg, #1565C0, #FF6F00)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(21,101,192,0.3)" }}>
            <span style={{ color: "white", fontSize: 28, fontWeight: 800 }}>GB</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Company Logo</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2, marginBottom: 10 }}>PNG, JPG up to 2MB. Recommended 200x200px.</div>
            <button style={{ padding: "6px 16px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Upload New Logo</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Company Name (Display)" value={company.name} onChange={v => upd("name", v)} half />
          <FormField label="Legal Name" value={company.legalName} onChange={v => upd("legalName", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="GSTIN" value={company.gstin} onChange={v => upd("gstin", v)} half />
          <FormField label="PAN" value={company.pan} onChange={v => upd("pan", v)} half />
        </div>
        <FormField label="Address" value={company.address} onChange={v => upd("address", v)} />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="City" value={company.city} onChange={v => upd("city", v)} half />
          <FormField label="State" value={company.state} onChange={v => upd("state", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Pincode" value={company.pincode} onChange={v => upd("pincode", v)} half />
          <FormField label="Phone" value={company.phone} onChange={v => upd("phone", v)} half />
        </div>
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Email" value={company.email} onChange={v => upd("email", v)} half />
          <FormField label="Website" value={company.website} onChange={v => upd("website", v)} half />
        </div>
      </SectionCard>
      <SectionCard title="Regional Settings" desc="Currency, date format, and locale preferences">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingTop: 8 }}>
          <FormSelect label="Currency" value="INR" onChange={() => {}} options={[{ value: "INR", label: "INR (Rs.)" }, { value: "USD", label: "USD ($)" }]} half />
          <FormSelect label="Date Format" value="DD/MM/YYYY" onChange={() => {}} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} half />
        </div>
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormSelect label="Financial Year Start" value="April" onChange={() => {}} options={["January", "April"]} half />
          <FormSelect label="Timezone" value="IST" onChange={() => {}} options={[{ value: "IST", label: "IST (UTC+5:30)" }, { value: "UTC", label: "UTC" }]} half />
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROLES & ACCESS — Full rewrite with modals, custom roles, project access
// ═══════════════════════════════════════════════════════════════════════
function RolesAccess() {
  const [roles, setRoles] = useState([
    { id: "admin", name: "Admin", desc: "Full access to everything", color: T.red, colorBg: T.redSoft, isSystem: true },
    { id: "project_manager", name: "Project Manager", desc: "Manage assigned projects", color: T.blue, colorBg: T.blueSoft, isSystem: true },
    { id: "supervisor", name: "Site Supervisor", desc: "On-site task management", color: T.green, colorBg: T.greenSoft, isSystem: true },
    { id: "accountant", name: "Accountant", desc: "Finance & billing access", color: T.amber, colorBg: T.amberSoft, isSystem: true },
    { id: "viewer", name: "Viewer", desc: "Read-only access", color: T.purple, colorBg: T.purpleSoft, isSystem: true },
  ]);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/settings/users");
      if (res.success) setUsers(res.data || []);
    } catch(e) {}
    setUsersLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const [selectedRole, setSelectedRole] = useState("project_manager");
  const [tab, setTab] = useState("permissions"); // permissions | users | projects
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Role form
  const [roleForm, setRoleForm] = useState({ name: "", desc: "", color: T.teal });
  const roleColors = [T.red, T.blue, T.green, T.amber, T.purple, T.teal, "#E11D48", "#7C3AED", "#0891B2", "#CA8A04"];

  const openCreateRole = () => { setEditingRole(null); setRoleForm({ name: "", desc: "", color: T.teal }); setShowRoleModal(true); };
  const openEditRole = (r) => { setEditingRole(r); setRoleForm({ name: r.name, desc: r.desc, color: r.color }); setShowRoleModal(true); };
  const saveRole = () => {
    if (!roleForm.name.trim()) return;
    if (editingRole) {
      setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, name: roleForm.name, desc: roleForm.desc, color: roleForm.color, colorBg: roleForm.color + "15" } : r));
    } else {
      const id = roleForm.name.toLowerCase().replace(/\s+/g, "_");
      setRoles(prev => [...prev, { id, name: roleForm.name, desc: roleForm.desc, color: roleForm.color, colorBg: roleForm.color + "15", isSystem: false }]);
    }
    setShowRoleModal(false);
  };

  // User form
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", role: "viewer", designation: "", password: "", projects: [] });
  const openCreateUser = () => { setEditingUser(null); setUserForm({ name: "", email: "", phone: "", role: selectedRole, designation: "", password: "Welcome@123", projects: [] }); setShowUserModal(true); };
  const openEditUser = (u) => { setEditingUser(u); setUserForm({ name: u.name, email: u.email, phone: u.phone || "", role: u.role, designation: u.designation || "", password: "", projects: u.projects || [] }); setShowUserModal(true); };
  const [userSaving, setUserSaving] = useState(false);
  const saveUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return alert("Name and email required");
    setUserSaving(true);
    let res;
    if (editingUser) {
      res = await api.put("/settings/users/" + editingUser.id, {
        name: userForm.name, email: userForm.email,
        phone: userForm.phone, role: userForm.role,
        designation: userForm.designation || "",
        is_active: userForm.status === "Active" ? 1 : 0,
      });
    } else {
      res = await api.post("/settings/users", {
        name: userForm.name, email: userForm.email,
        phone: userForm.phone, role: userForm.role,
        designation: userForm.designation || "",
        password: userForm.password || "Welcome@123",
      });
    }
    setUserSaving(false);
    if (res.success) { await loadUsers(); setShowUserModal(false); }
    else alert(res.message || "Save failed");
  };
  const toggleUserProject = (pid) => {
    setUserForm(p => ({ ...p, projects: (p.projects||[]).includes(pid) ? (p.projects||[]).filter(x => x !== pid) : [...(p.projects||[]), pid] }));
  };

  // Permission matrix
  const modules = [
    { name: "Projects" }, { name: "Design" }, { name: "Finance" }, { name: "Procurement" },
    { name: "Warehouse" }, { name: "Team & HR" }, { name: "Reports" }, { name: "Settings" },
  ];
  const allPerms = ["view", "create", "edit", "delete", "approve", "export"];
  const permColors = {
    view: { bg: T.blueSoft, text: T.blue }, create: { bg: T.greenSoft, text: T.green },
    edit: { bg: T.amberSoft, text: T.amber }, delete: { bg: T.redSoft, text: T.red },
    approve: { bg: T.purpleSoft, text: T.purple }, export: { bg: "#F0FDF4", text: "#166534" },
  };

  const [permMatrix, setPermMatrix] = useState({
    admin: { Projects: allPerms, Design: allPerms, Finance: allPerms, Procurement: allPerms, Warehouse: allPerms, "Team & HR": allPerms, Reports: ["view","export"], Settings: ["view","create","edit","delete"] },
    project_manager: { Projects: ["view","create","edit"], Design: ["view","create","edit"], Finance: ["view","create"], Procurement: ["view","create","edit"], Warehouse: ["view","create","edit"], "Team & HR": ["view"], Reports: ["view","export"], Settings: [] },
    supervisor: { Projects: ["view"], Design: ["view"], Finance: ["view"], Procurement: ["view","create"], Warehouse: ["view","create","edit"], "Team & HR": ["view"], Reports: ["view"], Settings: [] },
    accountant: { Projects: ["view"], Design: [], Finance: ["view","create","edit","approve"], Procurement: ["view"], Warehouse: ["view"], "Team & HR": ["view","create","edit"], Reports: ["view","export"], Settings: [] },
    viewer: { Projects: ["view"], Design: ["view"], Finance: ["view"], Procurement: ["view"], Warehouse: ["view"], "Team & HR": [], Reports: ["view"], Settings: [] },
  });

  const togglePerm = (mod, perm) => {
    if (selectedRole === "admin") return;
    setPermMatrix(prev => {
      const cur = prev[selectedRole]?.[mod] || [];
      const has = cur.includes(perm);
      return { ...prev, [selectedRole]: { ...prev[selectedRole], [mod]: has ? cur.filter(p => p !== perm) : [...cur, perm] } };
    });
  };

  const activeRole = roles.find(r => r.id === selectedRole);
  const roleUsers = users.filter(u => u.role === selectedRole);

  const tabs = [
    { id: "permissions", label: "Permissions" },
    { id: "users", label: `Users (${roleUsers.length})` },
    { id: "projects", label: "Project Access" },
  ];

  return (
    <div>
      {/* ── Role cards ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {roles.map(r => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)}
            style={{
              flex: "1 1 140px", maxWidth: 200, padding: "12px 14px", borderRadius: T.radius,
              background: selectedRole === r.id ? r.colorBg : T.card,
              border: `2px solid ${selectedRole === r.id ? r.color : T.border}`,
              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              boxShadow: selectedRole === r.id ? T.shadowMd : T.shadow, position: "relative",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedRole === r.id ? r.color : T.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{users.filter(u => u.role === r.id).length} users</div>
              </div>
              {!r.isSystem && (
                <button onClick={(e) => { e.stopPropagation(); openEditRole(r); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <IcEdit size={13} color={T.textLight} />
                </button>
              )}
              {r.isSystem && selectedRole === r.id && (
                <button onClick={(e) => { e.stopPropagation(); openEditRole(r); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <IcEdit size={13} color={T.textLight} />
                </button>
              )}
            </div>
            {!r.isSystem && <div style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: r.color }} />}
          </button>
        ))}
        <button onClick={openCreateRole}
          style={{ flex: "0 0 56px", padding: "12px", borderRadius: T.radius, background: T.card, border: `2px dashed ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
          <IcPlus size={18} color={T.textLight} />
          <span style={{ fontSize: 10, color: T.textLight, fontWeight: 600 }}>New</span>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "12px 16px", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? T.blue : T.textMid,
              background: tab === t.id ? T.blueSoft : "transparent",
              border: "none", cursor: "pointer", borderBottom: tab === t.id ? `2.5px solid ${T.blue}` : "2.5px solid transparent",
              transition: "all 0.15s",
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: Permissions ── */}
      {tab === "permissions" && (
        <SectionCard title={`Module Permissions — ${activeRole?.name || ""}`} desc={activeRole?.desc}
          action={<SaveBtn label="Update Permissions" />}>
          {selectedRole === "admin" && (
            <div style={{ background: T.amberSoft, borderRadius: 8, padding: "10px 14px", marginTop: 8, marginBottom: 12, fontSize: 12, color: T.amber, display: "flex", gap: 8, alignItems: "center" }}>
              <IcShield size={15} color={T.amber} /> Admin role has full access. Permissions cannot be modified.
            </div>
          )}
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: T.textLight, borderBottom: `2px solid ${T.border}`, minWidth: 130 }}>Module</th>
                  {allPerms.map(p => (
                    <th key={p} style={{ textAlign: "center", padding: "10px 6px", fontSize: 10.5, fontWeight: 700, color: T.textMid, borderBottom: `2px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 60 }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map(m => {
                  const perms = permMatrix[selectedRole]?.[m.name] || [];
                  return (
                    <tr key={m.name} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: "12px", fontWeight: 600, color: T.text }}>{m.name}</td>
                      {allPerms.map(p => {
                        const has = perms.includes(p);
                        return (
                          <td key={p} style={{ textAlign: "center", padding: "8px 6px" }}>
                            <button onClick={() => togglePerm(m.name, p)}
                              style={{ width: 28, height: 28, borderRadius: 6, background: has ? permColors[p].bg : T.borderLight, border: `1.5px solid ${has ? permColors[p].text + "44" : "transparent"}`, cursor: selectedRole === "admin" ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                              {has && <IcCheck size={14} color={permColors[p].text} strokeWidth={2.5} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── TAB: Users ── */}
      {tab === "users" && (
        <SectionCard title={`Users — ${activeRole?.name || ""}`} desc={`${roleUsers.length} members in this role`}
          action={
            <button onClick={openCreateUser} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <IcPlus size={15} color="white" /> Add User
            </button>
          }>
          {usersLoading && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: T.textLight }}>Loading...</div>}
          {!usersLoading && roleUsers.length === 0 && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: T.textLight }}>No users in this role yet</div>}
          {roleUsers.map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: i < roleUsers.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${activeRole?.color || T.blue}, ${activeRole?.color || T.blue}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>
                {u.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{u.name}</div>
                <div style={{ fontSize: 12, color: T.textLight, display: "flex", gap: 12 }}>
                  <span>{u.email}</span>
                  <span>{u.phone}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Badge text={`${(u.projects||[]).length} projects`} color={T.textMid} bg={T.borderLight} />
                <Badge text={u.is_active===0?"Inactive":"Active"} color={u.is_active===0?T.amber:T.green} bg={u.is_active===0?T.amberSoft:T.greenSoft} />
                <button onClick={() => openEditUser(u)} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                  <IcEdit size={14} color={T.textMid} />
                </button>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {/* ── TAB: Project Access ── */}
      {tab === "projects" && (
        <SectionCard title="Project Access Matrix" desc="Which user can access which project"
          action={<SaveBtn label="Save Access" />}>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, minWidth: 140, position: "sticky", left: 0, background: T.card, zIndex: 1 }}>User / Project</th>
                  {allProjects.map(p => (
                    <th key={p.id} style={{ textAlign: "center", padding: "10px 6px", fontSize: 10.5, fontWeight: 600, color: T.textMid, borderBottom: `2px solid ${T.border}`, minWidth: 90, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 100 }}>
                      {p.name.length > 22 ? p.name.substring(0, 22) + ".." : p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roleUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "10px 8px", fontWeight: 600, color: T.text, position: "sticky", left: 0, background: T.card, zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${activeRole?.color || T.blue}, ${activeRole?.color || T.blue}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>{u.name.charAt(0)}</div>
                        <span style={{ fontSize: 12 }}>{u.name}</span>
                      </div>
                    </td>
                    {allProjects.map(p => {
                      const has = (u.projects||[]).includes(p.id);
                      return (
                        <td key={p.id} style={{ textAlign: "center", padding: "8px 6px" }}>
                          <button onClick={() => {
                            setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, projects: has ? (usr.projects||[]).filter(x => x !== p.id) : [...(usr.projects||[]), p.id] } : usr));
                          }}
                            style={{ width: 26, height: 26, borderRadius: 6, background: has ? T.greenSoft : T.borderLight, border: `1.5px solid ${has ? T.green + "55" : "transparent"}`, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                            {has && <IcCheck size={13} color={T.green} strokeWidth={2.5} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {roleUsers.length === 0 && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: T.textLight }}>No users in this role</div>}
        </SectionCard>
      )}

      {/* ── Modal: Create / Edit Role ── */}
      <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? "Edit Role" : "Create Custom Role"} desc="Define role name, description, and color" width={480}>
        <FormField label="Role Name" value={roleForm.name} onChange={v => setRoleForm(p => ({ ...p, name: v }))} placeholder="e.g. Site Engineer" />
        <div style={{ height: 14 }} />
        <FormField label="Description" value={roleForm.desc} onChange={v => setRoleForm(p => ({ ...p, desc: v }))} placeholder="What can this role do?" />
        <div style={{ height: 16 }} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 8 }}>Role Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {roleColors.map(c => (
              <button key={c} onClick={() => setRoleForm(p => ({ ...p, color: c }))}
                style={{ width: 32, height: 32, borderRadius: 8, background: c, border: roleForm.color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer", transition: "all 0.15s" }} />
            ))}
          </div>
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowRoleModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveRole} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {editingRole ? "Update Role" : "Create Role"}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Create / Edit User ── */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? "Edit User" : "Add New User"} desc="User details and project access" width={600}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Full Name" value={userForm.name} onChange={v => setUserForm(p => ({ ...p, name: v }))} placeholder="Full name" half />
          <FormField label="Email" value={userForm.email} onChange={v => setUserForm(p => ({ ...p, email: v }))} placeholder="email@company.com" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Phone" value={userForm.phone} onChange={v => setUserForm(p => ({ ...p, phone: v }))} placeholder="+91 XXXXX XXXXX" half />
          <FormSelect label="Role" value={userForm.role} onChange={v => setUserForm(p => ({ ...p, role: v }))} options={roles.map(r => ({ value: r.id, label: r.name }))} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Designation" value={userForm.designation||""} onChange={v => setUserForm(p => ({ ...p, designation: v }))} placeholder="e.g. Site Engineer, PM" half />
          {!editingUser && <FormField label="Password" value={userForm.password||""} onChange={v => setUserForm(p => ({ ...p, password: v }))} placeholder="Default: Welcome@123" half />}
        </div>

        {/* Project access */}
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 10 }}>Project Access</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button onClick={() => setUserForm(p => ({ ...p, projects: allProjects.map(pr => pr.id) }))}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${T.blue}`, background: T.blueSoft, fontSize: 11, fontWeight: 600, color: T.blue, cursor: "pointer" }}>Select All</button>
            <button onClick={() => setUserForm(p => ({ ...p, projects: [] }))}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "white", fontSize: 11, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Clear All</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {allProjects.map(p => {
              const sel = userForm.projects.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggleUserProject(p.id)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${sel ? T.green : T.border}`, background: sel ? T.greenSoft : "white", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: sel ? T.green : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {sel && <IcCheck size={12} color="white" strokeWidth={3} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{p.name.length > 28 ? p.name.substring(0, 28) + ".." : p.name}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{p.city} — {p.status}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 20 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowUserModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveUser} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {userSaving ? "Saving..." : editingUser ? "Update User" : "Add User"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MULTI-LEVEL APPROVAL — Expanded with all 12 transaction types + edit/create
// ═══════════════════════════════════════════════════════════════════════
function ApprovalSettings() {
  const allRoles = ["Site Supervisor", "Project Manager", "Accountant", "Admin"];

  const [approvals, setApprovals] = useState([
    { id: 1,  module: "Design Approval",       cat: "DESIGN",       enabled: true,  levels: [{ role: "Project Manager", limit: null }] },
    { id: 2,  module: "Site Expense",           cat: "FINANCE",      enabled: true,  levels: [{ role: "Site Supervisor", limit: 25000 }, { role: "Project Manager", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 3,  module: "Purchase Order (PO)",    cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Site Supervisor", limit: 50000 }, { role: "Project Manager", limit: 200000 }, { role: "Admin", limit: null }] },
    { id: 4,  module: "RFQ",                    cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Project Manager", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 5,  module: "Material Purchase",      cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Site Supervisor", limit: 30000 }, { role: "Project Manager", limit: null }] },
    { id: 6,  module: "GRN (Goods Received)",   cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Site Supervisor", limit: null }] },
    { id: 7,  module: "Subcontractor Bill",     cat: "FINANCE",      enabled: true,  levels: [{ role: "Project Manager", limit: 300000 }, { role: "Admin", limit: null }] },
    { id: 8,  module: "Customer Invoice",       cat: "FINANCE",      enabled: true,  levels: [{ role: "Accountant", limit: 500000 }, { role: "Admin", limit: null }] },
    { id: 9,  module: "Retention Release",      cat: "FINANCE",      enabled: true,  levels: [{ role: "Accountant", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 10, module: "Detention Charges",      cat: "FINANCE",      enabled: false, levels: [{ role: "Project Manager", limit: null }] },
    { id: 11, module: "Payment Entry",          cat: "PAYMENTS",     enabled: true,  levels: [{ role: "Accountant", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 12, module: "Payment Request",        cat: "PAYMENTS",     enabled: true,  levels: [{ role: "Project Manager", limit: 200000 }, { role: "Admin", limit: null }] },
  ]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editLevels, setEditLevels] = useState([]);

  const categories = ["DESIGN", "PROCUREMENT", "FINANCE", "PAYMENTS"];
  const catColors = { DESIGN: T.purple, PROCUREMENT: T.teal, FINANCE: T.amber, PAYMENTS: T.green };

  const openEdit = (a) => {
    setEditItem(a);
    setEditLevels(a.levels.map(l => ({ ...l })));
    setShowEditModal(true);
  };

  const saveEdit = () => {
    setApprovals(prev => prev.map(a => a.id === editItem.id ? { ...a, levels: editLevels } : a));
    setShowEditModal(false);
  };

  const addLevel = () => setEditLevels(p => [...p, { role: "Site Supervisor", limit: null }]);
  const removeLevel = (i) => setEditLevels(p => p.filter((_, idx) => idx !== i));
  const updateLevel = (i, k, v) => setEditLevels(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const toggleApproval = (id) => setApprovals(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: T.blueSoft, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start", boxShadow: T.shadow }}>
        <IcShield size={20} color={T.blue} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: T.blue, lineHeight: 1.6 }}>
          Configure multi-level approval chains for each transaction type. Transactions exceeding the set amount limit will require approval from the next level. Click edit to customize approval levels for any workflow.
        </div>
      </div>

      {categories.map(cat => {
        const catApprovals = approvals.filter(a => a.cat === cat);
        return (
          <SectionCard key={cat} title={cat.charAt(0) + cat.slice(1).toLowerCase() + " Approvals"}
            desc={`${catApprovals.filter(a => a.enabled).length} of ${catApprovals.length} workflows active`}
            action={<SaveBtn />}>

            {catApprovals.map((a, ai) => (
              <div key={a.id} style={{ borderBottom: ai < catApprovals.length - 1 ? `1px solid ${T.borderLight}` : "none", padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: a.enabled ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: a.enabled ? catColors[cat] + "18" : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IcLayers size={17} color={a.enabled ? catColors[cat] : T.textLight} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{a.module}</div>
                      <div style={{ fontSize: 11.5, color: T.textLight }}>{a.levels.length} level{a.levels.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => openEdit(a)}
                      style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <IcEdit size={13} color={T.textMid} /> Edit
                    </button>
                    <Toggle value={a.enabled} onChange={() => toggleApproval(a.id)} />
                  </div>
                </div>

                {a.enabled && (
                  <div style={{ marginLeft: 48, display: "flex", flexDirection: "column" }}>
                    {a.levels.map((l, li) => (
                      <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", paddingLeft: 24, paddingBottom: li < a.levels.length - 1 ? 10 : 0 }}>
                        {li < a.levels.length - 1 && <div style={{ position: "absolute", left: 10, top: 10, bottom: -2, width: 2, background: T.border }} />}
                        <div style={{ position: "absolute", left: 4, top: 4, width: 14, height: 14, borderRadius: "50%", background: T.card, border: `2.5px solid ${catColors[cat]}`, zIndex: 1 }} />
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: T.borderLight }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>L{li + 1}:</span>
                          <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{l.role}</span>
                          <Badge text={l.limit ? `Up to Rs.${l.limit >= 100000 ? (l.limit / 100000).toFixed(0) + "L" : (l.limit / 1000).toFixed(0) + "K"}` : "Unlimited"} color={l.limit ? T.amber : T.green} bg={l.limit ? T.amberSoft : T.greenSoft} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </SectionCard>
        );
      })}

      {/* Escalation Rules */}
      <SectionCard title="Escalation Rules" desc="Auto-escalate if approval pending beyond time limit">
        <div style={{ paddingTop: 8 }}>
          <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Auto-Escalation" desc="Escalate to next level if not approved within the set hours" value={true} onChange={() => {}} />
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            <FormSelect label="Escalation After" value="24" onChange={() => {}} options={[{ value: "12", label: "12 hours" }, { value: "24", label: "24 hours" }, { value: "48", label: "48 hours" }, { value: "72", label: "72 hours" }]} half />
            <FormSelect label="Notify Via" value="all" onChange={() => {}} options={[{ value: "email", label: "Email only" }, { value: "push", label: "Push only" }, { value: "whatsapp", label: "WhatsApp only" }, { value: "all", label: "Email + Push + WhatsApp" }]} half />
          </div>
        </div>
      </SectionCard>

      {/* ── Edit Approval Levels Modal ── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}
        title={`Edit Approval — ${editItem?.module || ""}`}
        desc="Add, remove, or modify approval levels and their limits" width={560}>

        {editLevels.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14, padding: "14px", borderRadius: 10, background: T.borderLight, border: `1px solid ${T.border}` }}>
            <div style={{ width: 32, textAlign: "center", paddingBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.blue }}>L{i + 1}</div>
            </div>
            <FormSelect label="Approver Role" value={l.role} onChange={v => updateLevel(i, "role", v)} options={allRoles.map(r => ({ value: r, label: r }))} half />
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Amount Limit (Rs.)</label>
              <input type="number" value={l.limit || ""} onChange={e => updateLevel(i, "limit", e.target.value ? parseInt(e.target.value) : null)} placeholder="No limit"
                style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", boxSizing: "border-box", fontFamily: T.font }}
                onFocus={e => e.target.style.borderColor = T.blue}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <button onClick={() => removeLevel(i)} disabled={editLevels.length <= 1}
              style={{ padding: 8, borderRadius: 6, border: "none", background: editLevels.length <= 1 ? T.borderLight : T.redSoft, cursor: editLevels.length <= 1 ? "not-allowed" : "pointer", display: "flex", marginBottom: 2 }}>
              <IcTrash size={15} color={editLevels.length <= 1 ? T.textLight : T.red} />
            </button>
          </div>
        ))}

        <button onClick={addLevel}
          style={{ width: "100%", padding: "10px", borderRadius: 8, border: `2px dashed ${T.border}`, background: "transparent", fontSize: 13, fontWeight: 600, color: T.textLight, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <IcPlus size={16} color={T.textLight} /> Add Approval Level
        </button>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowEditModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveEdit} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>Save Levels</button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BACK DATE CONTROL (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function BackDateControl() {
  const [settings, setSettings] = useState({
    globalRestrict: true, lockAfterApproval: true, requireReason: true, adminOverride: true, monthEndLock: true, lockDay: 5,
    modules: { expenses: { restrict: true, days: 7 }, materialIssue: { restrict: true, days: 3 }, attendance: { restrict: true, days: 2 }, purchaseOrder: { restrict: false, days: 15 }, invoice: { restrict: true, days: 7 }, cashbook: { restrict: true, days: 5 } }
  });
  const upd = (k, v) => setSettings(p => ({ ...p, [k]: v }));
  const updMod = (mod, k, v) => setSettings(p => ({ ...p, modules: { ...p.modules, [mod]: { ...p.modules[mod], [k]: v } } }));
  const moduleLabels = { expenses: "Expense Entry", materialIssue: "Material Issue / Transfer", attendance: "Attendance Marking", purchaseOrder: "Purchase Orders", invoice: "Invoice / Challan", cashbook: "Cash Book Entry" };

  return (
    <div>
      <SectionCard title="Global Back-Date Controls" desc="Prevent users from entering data for past dates beyond allowed window" action={<SaveBtn />}>
        <ToggleRow icon={<IcCalendar size={17} color={T.blue} />} label="Restrict Back-Date Entry" desc="Limit how far back users can enter transactions" value={settings.globalRestrict} onChange={v => upd("globalRestrict", v)} />
        <ToggleRow icon={<IcLock size={17} color={T.blue} />} label="Lock After Approval" desc="Approved transactions cannot have date modified" value={settings.lockAfterApproval} onChange={v => upd("lockAfterApproval", v)} />
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Require Reason for Back-Dated Entry" desc="Force reason when entering back-dated transactions" value={settings.requireReason} onChange={v => upd("requireReason", v)} />
        <ToggleRow icon={<IcShield size={17} color={T.blue} />} label="Admin Override" desc="Allow Admin to bypass restrictions" value={settings.adminOverride} onChange={v => upd("adminOverride", v)} />
      </SectionCard>
      <SectionCard title="Module-wise Back-Date Limits" desc="Different back-date windows for each module">
        <div style={{ marginTop: 8 }}>
          {Object.entries(settings.modules).map(([key, mod], i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < Object.keys(settings.modules).length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{moduleLabels[key]}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select value={mod.days} onChange={e => updMod(key, "days", parseInt(e.target.value))} disabled={!mod.restrict}
                  style={{ padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${T.border}`, fontSize: 12.5, color: T.text, background: "white", cursor: "pointer", fontFamily: T.font, opacity: mod.restrict ? 1 : 0.4 }}>
                  {[1,2,3,5,7,10,15,30].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
                <Toggle value={mod.restrict} onChange={v => updMod(key, "restrict", v)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Month-End Lock" desc="Auto-lock entries after month-end closing period">
        <ToggleRow icon={<IcLock size={17} color={T.blue} />} label="Auto-Lock Previous Month" desc={`Lock all entries after the ${settings.lockDay}th of current month`} value={settings.monthEndLock} onChange={v => upd("monthEndLock", v)} />
        {settings.monthEndLock && (
          <div style={{ marginTop: 8, marginLeft: 50 }}>
            <FormSelect label="Lock entries after day" value={String(settings.lockDay)} onChange={v => upd("lockDay", parseInt(v))} options={[{ value: "3", label: "3rd of next month" }, { value: "5", label: "5th of next month" }, { value: "7", label: "7th of next month" }, { value: "10", label: "10th of next month" }]} half />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BANK DETAILS — With edit modal
// ═══════════════════════════════════════════════════════════════════════
function BankDetails() {
  const [banks, setBanks] = useState([
    { id: 1, bankName: "HDFC Bank", label: "HDFC Bank - Current Account", accNo: "50100XXXXXX789", accHolder: "Greenbox Buildcon Pvt Ltd", ifsc: "HDFC0001234", branch: "Shankar Nagar, Raipur", type: "Current", isPrimary: true, upi: "gbbuildcon@hdfcbank", swiftCode: "" },
    { id: 2, bankName: "SBI", label: "SBI - Savings Account", accNo: "3876XXXXXXX456", accHolder: "Greenbox Buildcon Pvt Ltd", ifsc: "SBIN0005678", branch: "Civil Lines, Raipur", type: "Savings", isPrimary: false, upi: "", swiftCode: "" },
    { id: 3, bankName: "ICICI", label: "ICICI - Project Escrow", accNo: "1234XXXXXXX012", accHolder: "Greenbox Buildcon Pvt Ltd", ifsc: "ICIC0009012", branch: "Telibandha, Raipur", type: "Escrow", isPrimary: false, upi: "", swiftCode: "" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editBank, setEditBank] = useState(null);
  const emptyBank = { bankName: "", label: "", accNo: "", accHolder: "Greenbox Buildcon Pvt Ltd", ifsc: "", branch: "", type: "Current", isPrimary: false, upi: "", swiftCode: "" };
  const [bankForm, setBankForm] = useState(emptyBank);

  const openCreate = () => { setEditBank(null); setBankForm(emptyBank); setShowModal(true); };
  const openEdit = (b) => { setEditBank(b); setBankForm({ ...b }); setShowModal(true); };
  const saveBank = () => {
    if (!bankForm.bankName.trim() || !bankForm.accNo.trim()) return;
    const label = `${bankForm.bankName} - ${bankForm.type} Account`;
    if (editBank) {
      setBanks(prev => prev.map(b => b.id === editBank.id ? { ...bankForm, id: b.id, label } : (bankForm.isPrimary ? { ...b, isPrimary: false } : b)));
    } else {
      setBanks(prev => {
        const updated = bankForm.isPrimary ? prev.map(b => ({ ...b, isPrimary: false })) : prev;
        return [...updated, { ...bankForm, id: Date.now(), label }];
      });
    }
    setShowModal(false);
  };
  const deleteBank = (id) => setBanks(prev => prev.filter(b => b.id !== id));
  const updF = (k, v) => setBankForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <SectionCard title="Bank Accounts" desc="Manage company bank accounts for payments and receipts"
        action={
          <button onClick={openCreate} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IcPlus size={15} color="white" /> Add Bank Account
          </button>
        }>
        {banks.map((b, i) => (
          <div key={b.id} style={{ padding: "16px", borderRadius: 10, border: `1.5px solid ${b.isPrimary ? T.blue + "33" : T.border}`, background: b.isPrimary ? T.blueSoft + "66" : T.card, marginTop: i > 0 ? 12 : 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: b.isPrimary ? T.blue : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IcBank size={19} color={b.isPrimary ? "white" : T.textMid} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.label}</div>
                  <div style={{ fontSize: 12, color: T.textLight, marginTop: 1 }}>{b.branch}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {b.isPrimary && <Badge text="Primary" color={T.blue} bg={T.blueSoft} />}
                <Badge text={b.type} color={T.textMid} bg={T.borderLight} />
                <button onClick={() => openEdit(b)} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                  <IcEdit size={14} color={T.textMid} />
                </button>
                {!b.isPrimary && (
                  <button onClick={() => deleteBank(b.id)} style={{ background: T.redSoft, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                    <IcTrash size={14} color={T.red} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[{ label: "Account Holder", value: b.accHolder }, { label: "Account No.", value: b.accNo }, { label: "IFSC Code", value: b.ifsc }, { label: "UPI ID", value: b.upi || "—" }].map((f, fi) => (
                <div key={fi}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: f.label !== "Account Holder" ? "monospace" : T.font }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Payment Methods" desc="Configure accepted payment methods">
        <div style={{ paddingTop: 8 }}>
          <ToggleRow icon={<IcBank size={17} color={T.blue} />} label="Bank Transfer (NEFT/RTGS/IMPS)" desc="Accept direct bank transfers" value={true} onChange={() => {}} />
          <ToggleRow icon={<IcGlobe size={17} color={T.blue} />} label="UPI Payments" desc="Accept UPI-based payments" value={true} onChange={() => {}} />
          <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="Cheque Payments" desc="Accept cheque with clearance tracking" value={true} onChange={() => {}} />
          <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="Cash Payments" desc="Accept cash with mandatory receipt generation" value={false} onChange={() => {}} />
        </div>
      </SectionCard>

      {/* ── Edit / Create Bank Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editBank ? "Edit Bank Account" : "Add Bank Account"} desc="Enter bank account details" width={580}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Bank Name" value={bankForm.bankName} onChange={v => updF("bankName", v)} placeholder="e.g. HDFC Bank" half />
          <FormSelect label="Account Type" value={bankForm.type} onChange={v => updF("type", v)} options={["Current", "Savings", "Escrow", "OD (Overdraft)", "CC (Cash Credit)"]} half />
        </div>
        <FormField label="Account Holder Name" value={bankForm.accHolder} onChange={v => updF("accHolder", v)} placeholder="As per bank records" />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Account Number" value={bankForm.accNo} onChange={v => updF("accNo", v)} placeholder="Account number" half />
          <FormField label="IFSC Code" value={bankForm.ifsc} onChange={v => updF("ifsc", v)} placeholder="e.g. HDFC0001234" half />
        </div>
        <FormField label="Branch" value={bankForm.branch} onChange={v => updF("branch", v)} placeholder="Branch name and city" />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="UPI ID (optional)" value={bankForm.upi} onChange={v => updF("upi", v)} placeholder="e.g. company@upi" half />
          <FormField label="SWIFT Code (optional)" value={bankForm.swiftCode} onChange={v => updF("swiftCode", v)} placeholder="For international" half />
        </div>
        <div style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={bankForm.isPrimary} onChange={v => updF("isPrimary", v)} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Set as Primary Account</div>
            <div style={{ fontSize: 11.5, color: T.textLight }}>Used as default for payments and receipts</div>
          </div>
        </div>
        <div style={{ height: 16 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveBank} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {editBank ? "Update Account" : "Add Account"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MATERIAL SETTINGS (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function MaterialSettings() {
  const [m, setM] = useState({ restrictUsage: true, restrictSubcontractor: true, restrictTransfer: true, restrictProduction: false, mrRestriction: false, poRestriction: false, lowStockAlert: true, lowStockThreshold: 10, requireGRN: true, trackBatches: true, wasteTracking: true, wasteThreshold: 5 });
  const upd = (k, v) => setM(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Negative Stock Restrictions" desc="Prevent using materials beyond available stock" action={<SaveBtn />}>
        <ToggleRow icon={<IcBox size={17} color={T.blue} />} label="Restrict Material Usage" desc="Cannot issue materials exceeding current stock" value={m.restrictUsage} onChange={v => upd("restrictUsage", v)} />
        <ToggleRow icon={<IcUsers size={17} color={T.blue} />} label="Restrict Subcontractor Material Issue" desc="Cannot issue to subcontractors beyond stock" value={m.restrictSubcontractor} onChange={v => upd("restrictSubcontractor", v)} />
        <ToggleRow icon={<IcLayers size={17} color={T.blue} />} label="Restrict Material Transfer" desc="Cannot transfer between sites if stock insufficient" value={m.restrictTransfer} onChange={v => upd("restrictTransfer", v)} />
        <ToggleRow icon={<IcTool size={17} color={T.blue} />} label="Restrict Production Material" desc="Cannot use in production beyond stock" value={m.restrictProduction} onChange={v => upd("restrictProduction", v)} />
      </SectionCard>
      <SectionCard title="Request & PO Restrictions" desc="Prevent exceeding estimated quantities">
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Material Request Restriction" desc="Cannot request more than BOQ estimated quantity" value={m.mrRestriction} onChange={v => upd("mrRestriction", v)} />
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Material PO Restriction" desc="Cannot create PO exceeding approved request quantity" value={m.poRestriction} onChange={v => upd("poRestriction", v)} />
      </SectionCard>
      <SectionCard title="Inventory Alerts & Tracking" desc="Smart stock management features">
        <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Low Stock Alerts" desc="Get notified when material stock falls below threshold" value={m.lowStockAlert} onChange={v => upd("lowStockAlert", v)} />
        {m.lowStockAlert && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Alert threshold" value={String(m.lowStockThreshold)} onChange={v => upd("lowStockThreshold", parseInt(v))} options={[{value:"5",label:"5%"},{value:"10",label:"10%"},{value:"15",label:"15%"},{value:"20",label:"20%"}]} half /></div>}
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Require GRN" desc="Mandatory GRN before stock update" value={m.requireGRN} onChange={v => upd("requireGRN", v)} />
        <ToggleRow icon={<IcHash size={17} color={T.blue} />} label="Batch/Lot Tracking" desc="Track materials by batch numbers" value={m.trackBatches} onChange={v => upd("trackBatches", v)} />
      </SectionCard>
      <SectionCard title="Waste Tracking" desc="Monitor material wastage against estimates">
        <ToggleRow icon={<IcTrash size={17} color={T.blue} />} label="Enable Waste Tracking" desc="Track and categorize material wastage" value={m.wasteTracking} onChange={v => upd("wasteTracking", v)} />
        {m.wasteTracking && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Flag when waste exceeds" value={String(m.wasteThreshold)} onChange={v => upd("wasteThreshold", parseInt(v))} options={[{value:"3",label:"3%"},{value:"5",label:"5%"},{value:"8",label:"8%"},{value:"10",label:"10%"}]} half /></div>}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FINANCE SETTINGS (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function FinanceSettings() {
  const [f, setF] = useState({ gstEnabled: true, gstRate: "18", tdsEnabled: true, tdsRate: "2", autoInvoiceNum: true, invoicePrefix: "GB-INV", retentionEnabled: true, retentionPct: "5", advanceTracking: true, budgetWarning: true, budgetThreshold: 90, duplicateCheck: true, cashLimit: 10000 });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Tax Configuration" desc="GST, TDS settings" action={<SaveBtn />}>
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="GST Enabled" desc="Apply GST on invoices and POs" value={f.gstEnabled} onChange={v => upd("gstEnabled", v)} />
        {f.gstEnabled && <div style={{ marginLeft: 50, marginBottom: 12, display: "flex", gap: 16 }}><FormSelect label="Default GST Rate" value={f.gstRate} onChange={v => upd("gstRate", v)} options={[{value:"5",label:"5%"},{value:"12",label:"12%"},{value:"18",label:"18%"},{value:"28",label:"28%"}]} half /></div>}
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="TDS Deduction" desc="Auto-calculate TDS on payments" value={f.tdsEnabled} onChange={v => upd("tdsEnabled", v)} />
        {f.tdsEnabled && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Default TDS Rate" value={f.tdsRate} onChange={v => upd("tdsRate", v)} options={[{value:"1",label:"1% (194C - Ind)"},{value:"2",label:"2% (194C - Others)"},{value:"10",label:"10% (194J - Prof)"}]} half /></div>}
      </SectionCard>
      <SectionCard title="Invoice & Billing" desc="Auto-numbering and billing preferences">
        <ToggleRow icon={<IcHash size={17} color={T.blue} />} label="Auto Invoice Numbering" desc="System-generated sequential numbers" value={f.autoInvoiceNum} onChange={v => upd("autoInvoiceNum", v)} />
        {f.autoInvoiceNum && <div style={{ marginLeft: 50, marginBottom: 12 }}><FormField label="Invoice Prefix" value={f.invoicePrefix} onChange={v => upd("invoicePrefix", v)} half /><div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Preview: {f.invoicePrefix}-2026-0001</div></div>}
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="Retention Money Tracking" desc="Auto-hold retention from running bills" value={f.retentionEnabled} onChange={v => upd("retentionEnabled", v)} />
        {f.retentionEnabled && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Retention %" value={f.retentionPct} onChange={v => upd("retentionPct", v)} options={[{value:"3",label:"3%"},{value:"5",label:"5%"},{value:"10",label:"10%"}]} half /></div>}
      </SectionCard>
      <SectionCard title="Budget & Controls" desc="Financial safeguards">
        <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Budget Overrun Warning" desc="Alert when spending approaches budget" value={f.budgetWarning} onChange={v => upd("budgetWarning", v)} />
        {f.budgetWarning && <div style={{ marginLeft: 50, marginBottom: 12 }}><FormSelect label="Warn at" value={String(f.budgetThreshold)} onChange={v => upd("budgetThreshold", parseInt(v))} options={[{value:"80",label:"80%"},{value:"85",label:"85%"},{value:"90",label:"90%"},{value:"95",label:"95%"}]} half /></div>}
        <ToggleRow icon={<IcCheck size={17} color={T.blue} />} label="Advance Payment Tracking" desc="Track advances to suppliers/contractors" value={f.advanceTracking} onChange={v => upd("advanceTracking", v)} />
        <ToggleRow icon={<IcShield size={17} color={T.blue} />} label="Duplicate Entry Detection" desc="Warn if similar transaction exists within 24h" value={f.duplicateCheck} onChange={v => upd("duplicateCheck", v)} />
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — With WhatsApp for DPR + all events
// ═══════════════════════════════════════════════════════════════════════
function NotificationSettings() {
  const [notifs, setNotifs] = useState({
    emailNotif: true, pushNotif: true, whatsappNotif: true, dailyDigest: false,
    whatsappApiKey: "",
    channels: {
      approvalPending:    { email: true,  push: true,  whatsapp: true  },
      taskAssigned:       { email: true,  push: true,  whatsapp: false },
      budgetAlert:        { email: true,  push: false, whatsapp: true  },
      materialLow:        { email: false, push: true,  whatsapp: true  },
      paymentDue:         { email: true,  push: true,  whatsapp: true  },
      projectMilestone:   { email: true,  push: false, whatsapp: false },
      attendanceAbsent:   { email: false, push: true,  whatsapp: true  },
      dprReport:          { email: true,  push: false, whatsapp: true  },
      siteExpense:        { email: false, push: true,  whatsapp: true  },
      poCreated:          { email: true,  push: false, whatsapp: false },
      grnReceived:        { email: false, push: true,  whatsapp: false },
      subconBill:         { email: true,  push: false, whatsapp: true  },
    }
  });
  const channelLabels = {
    approvalPending: "Approval Pending", taskAssigned: "Task Assigned / Updated", budgetAlert: "Budget Overrun Alert",
    materialLow: "Low Stock Alert", paymentDue: "Payment Due / Overdue", projectMilestone: "Project Milestone",
    attendanceAbsent: "Attendance — Absent Alert", dprReport: "DPR (Daily Progress Report)",
    siteExpense: "Site Expense Added", poCreated: "Purchase Order Created", grnReceived: "GRN Received",
    subconBill: "Subcontractor Bill",
  };
  const channelCats = {
    "DAILY OPERATIONS": ["dprReport", "taskAssigned", "attendanceAbsent", "siteExpense"],
    "PROCUREMENT": ["approvalPending", "poCreated", "grnReceived", "materialLow"],
    "FINANCE": ["budgetAlert", "paymentDue", "subconBill", "projectMilestone"],
  };
  const updChannel = (ch, type, val) => setNotifs(p => ({ ...p, channels: { ...p.channels, [ch]: { ...p.channels[ch], [type]: val } } }));

  // WhatsApp icon SVG
  const WaIcon = ({ size = 17 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={T.whatsapp}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  return (
    <div>
      <SectionCard title="Notification Channels" desc="Enable/disable notification delivery methods" action={<SaveBtn />}>
        <ToggleRow icon={<IcMail size={17} color={T.blue} />} label="Email Notifications" desc="Receive notifications via email" value={notifs.emailNotif} onChange={v => setNotifs(p => ({ ...p, emailNotif: v }))} />
        <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Push Notifications" desc="In-app and mobile push notifications" value={notifs.pushNotif} onChange={v => setNotifs(p => ({ ...p, pushNotif: v }))} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: `1px solid ${T.borderLight}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: T.whatsappSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <WaIcon size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>WhatsApp Notifications</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>Send alerts via WhatsApp (DPR, approvals, site updates)</div>
          </div>
          <Toggle value={notifs.whatsappNotif} onChange={v => setNotifs(p => ({ ...p, whatsappNotif: v }))} />
        </div>
        {notifs.whatsappNotif && (
          <div style={{ marginLeft: 50, marginTop: 8, marginBottom: 4 }}>
            <FormField label="WhatsApp Business API Key" value={notifs.whatsappApiKey} onChange={v => setNotifs(p => ({ ...p, whatsappApiKey: v }))} placeholder="Enter API key from WhatsApp Business" />
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Required for automated WhatsApp messages. Get it from your WhatsApp Business provider.</div>
          </div>
        )}
        <ToggleRow icon={<IcCalendar size={17} color={T.blue} />} label="Daily Digest" desc="Daily summary email at 8 AM" value={notifs.dailyDigest} onChange={v => setNotifs(p => ({ ...p, dailyDigest: v }))} />
      </SectionCard>

      {/* Per-event channel matrix */}
      {Object.entries(channelCats).map(([catName, keys]) => (
        <SectionCard key={catName} title={catName.charAt(0) + catName.slice(1).toLowerCase()} desc={`${keys.length} event types`}>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: T.textLight, borderBottom: `2px solid ${T.border}` }}>Event</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, width: 70 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><IcMail size={14} color={T.textLight} /></div>
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, width: 70 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><IcBell size={14} color={T.textLight} /></div>
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, width: 70 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><WaIcon size={14} /></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map(key => {
                  const ch = notifs.channels[key];
                  return (
                    <tr key={key} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: "12px", fontWeight: 500, color: T.text }}>
                        {channelLabels[key]}
                        {key === "dprReport" && <Badge text="Recommended" color={T.whatsapp} bg={T.whatsappSoft} />}
                      </td>
                      <td style={{ textAlign: "center", padding: "10px" }}><Toggle value={ch.email} onChange={v => updChannel(key, "email", v)} /></td>
                      <td style={{ textAlign: "center", padding: "10px" }}><Toggle value={ch.push} onChange={v => updChannel(key, "push", v)} /></td>
                      <td style={{ textAlign: "center", padding: "10px" }}><Toggle value={ch.whatsapp} onChange={v => updChannel(key, "whatsapp", v)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ))}

      {/* WhatsApp DPR template */}
      <SectionCard title="WhatsApp DPR Template" desc="Configure the daily progress report message sent via WhatsApp">
        <div style={{ background: T.whatsappSoft, borderRadius: 10, padding: "16px", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <WaIcon size={20} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>DPR Message Preview</span>
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", fontSize: 12.5, color: T.textMid, lineHeight: 1.7, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, color: T.text, marginBottom: 4 }}>GB Buildcon — Daily Progress Report</div>
            <div>Date: {"{{date}}"}</div>
            <div>Project: {"{{project_name}}"}</div>
            <div style={{ marginTop: 6, fontWeight: 600, color: T.text }}>Today's Progress:</div>
            <div>- Workers present: {"{{workers_count}}"}</div>
            <div>- Tasks completed: {"{{tasks_done}}"}</div>
            <div>- Material used: {"{{material_summary}}"}</div>
            <div>- Site expense: Rs.{"{{expense_total}}"}</div>
            <div style={{ marginTop: 6, fontWeight: 600, color: T.text }}>Issues / Remarks:</div>
            <div>{"{{remarks}}"}</div>
            <div style={{ marginTop: 8, fontSize: 11, color: T.textLight }}>Sent from GB Buildcon App</div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <FormSelect label="Send DPR At" value="18:00" onChange={() => {}} options={[{value:"17:00",label:"5:00 PM"},{value:"18:00",label:"6:00 PM"},{value:"19:00",label:"7:00 PM"},{value:"20:00",label:"8:00 PM"}]} half />
            <FormSelect label="Send To" value="all_pm" onChange={() => {}} options={[{value:"all_pm",label:"All Project Managers"},{value:"admin",label:"Admin Only"},{value:"all",label:"All Team Members"},{value:"custom",label:"Custom List"}]} half />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NUMBER SEQUENCES (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function NumberSequences() {
  const sequences = [
    { module: "Purchase Order", prefix: "GB-PO", year: true, digits: 4, next: "GB-PO-2026-0047", reset: "Yearly" },
    { module: "Material Request", prefix: "GB-MR", year: true, digits: 4, next: "GB-MR-2026-0112", reset: "Yearly" },
    { module: "Invoice", prefix: "GB-INV", year: true, digits: 4, next: "GB-INV-2026-0023", reset: "Yearly" },
    { module: "RFQ", prefix: "GB-RFQ", year: false, digits: 5, next: "GB-RFQ-00089", reset: "Never" },
    { module: "Expense Voucher", prefix: "GB-EXP", year: true, digits: 4, next: "GB-EXP-2026-0201", reset: "Yearly" },
    { module: "Challan", prefix: "GB-CH", year: true, digits: 4, next: "GB-CH-2026-0034", reset: "Yearly" },
    { module: "Payment Receipt", prefix: "GB-REC", year: true, digits: 4, next: "GB-REC-2026-0015", reset: "Yearly" },
  ];
  return (
    <SectionCard title="Auto Number Sequences" desc="Configure automatic numbering for all transaction types" action={<SaveBtn />}>
      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            {["Module","Prefix","Year","Digits","Reset","Next"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}
            <th style={{ width: 40, borderBottom: `2px solid ${T.border}` }} />
          </tr></thead>
          <tbody>{sequences.map((s, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
              <td style={{ padding: "12px", fontWeight: 600, color: T.text }}>{s.module}</td>
              <td style={{ padding: "12px" }}><code style={{ fontSize: 12, background: T.borderLight, padding: "3px 8px", borderRadius: 4, color: T.blue, fontWeight: 600 }}>{s.prefix}</code></td>
              <td style={{ padding: "12px", textAlign: "center" }}>{s.year ? <IcCheck size={16} color={T.green} /> : <span style={{ color: T.textLight }}>—</span>}</td>
              <td style={{ padding: "12px", color: T.textMid }}>{s.digits}</td>
              <td style={{ padding: "12px" }}><Badge text={s.reset} color={s.reset === "Yearly" ? T.blue : T.textMid} bg={s.reset === "Yearly" ? T.blueSoft : T.borderLight} /></td>
              <td style={{ padding: "12px" }}><code style={{ fontSize: 12.5, fontWeight: 600, color: T.green, fontFamily: "monospace" }}>{s.next}</code></td>
              <td style={{ padding: "12px" }}><button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><IcEdit size={14} color={T.textLight} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT SETTINGS (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function AuditSettings() {
  return (
    <div>
      <SectionCard title="Audit Trail Configuration" desc="Track who did what and when" action={<SaveBtn />}>
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Enable Audit Logging" desc="Record all create, update, delete actions" value={true} onChange={() => {}} />
        <ToggleRow icon={<IcLock size={17} color={T.blue} />} label="Log Login/Logout Events" desc="Track sessions, IP, device info" value={true} onChange={() => {}} />
        <ToggleRow icon={<IcEdit size={17} color={T.blue} />} label="Track Field-Level Changes" desc="Record old→new value for every field" value={true} onChange={() => {}} />
        <ToggleRow icon={<IcTrash size={17} color={T.blue} />} label="Soft Delete Only" desc="Never permanently delete; mark deleted" value={true} onChange={() => {}} />
      </SectionCard>
      <SectionCard title="Data Retention" desc="How long to keep audit logs">
        <div style={{ paddingTop: 8 }}><FormSelect label="Retain Audit Logs For" value="365" onChange={() => {}} options={[{value:"90",label:"90 days"},{value:"180",label:"6 months"},{value:"365",label:"1 year"},{value:"730",label:"2 years"},{value:"0",label:"Forever"}]} half /></div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SETTINGS MODULE
// ═══════════════════════════════════════════════════════════════════════
const settingsSections = [
  { id: "company",       label: "Company Profile",      Icon: IcBuilding,  Comp: CompanySettings,      section: "GENERAL" },
  { id: "roles",         label: "Roles & Access",       Icon: IcShield,    Comp: RolesAccess,          section: null },
  { id: "approval",      label: "Multi-Level Approval", Icon: IcLayers,    Comp: ApprovalSettings,     section: null },
  { id: "backdate",      label: "Back-Date Control",    Icon: IcCalendar,  Comp: BackDateControl,      section: null },
  { id: "bank",          label: "Bank Details",         Icon: IcBank,      Comp: BankDetails,          section: "FINANCE & MATERIAL" },
  { id: "material",      label: "Material Settings",    Icon: IcBox,       Comp: MaterialSettings,     section: null },
  { id: "finance",       label: "Finance Settings",     Icon: IcDollar,    Comp: FinanceSettings,      section: null },
  { id: "notifications", label: "Notifications",        Icon: IcBell,      Comp: NotificationSettings, section: "SYSTEM" },
  { id: "sequences",     label: "Number Sequences",     Icon: IcHash,      Comp: NumberSequences,      section: null },
  { id: "audit",         label: "Audit Trail",          Icon: IcClipboard, Comp: AuditSettings,        section: null },
];

export default function SettingsModule() {
  const [activeSection, setActiveSection] = useState("company");
  const ActiveComp = settingsSections.find(s => s.id === activeSection)?.Comp || CompanySettings;
  const activeLabel = settingsSections.find(s => s.id === activeSection)?.label || "Settings";
  const descMap = {
    company: "Manage your company profile and regional settings", roles: "Configure user roles, permissions and project access",
    approval: "Set up multi-level approval workflows", backdate: "Control back-dated entry permissions",
    bank: "Manage bank accounts and payment methods", material: "Configure material stock and inventory rules",
    finance: "Tax, invoicing, and financial controls", notifications: "Email, Push & WhatsApp notification settings",
    sequences: "Configure auto-numbering for transactions", audit: "Audit trail and data retention settings",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      {/* Settings Sidebar */}
      <div style={{ width: 260, background: T.card, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>Settings</div>
          <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>Company Configuration</div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {settingsSections.map(item => {
            const isActive = activeSection === item.id;
            return (
              <div key={item.id}>
                {item.section && <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, letterSpacing: "1.2px", textTransform: "uppercase", padding: "16px 20px 6px" }}>{item.section}</div>}
                <button onClick={() => setActiveSection(item.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", border: "none", cursor: "pointer", background: isActive ? T.blueSoft : "transparent", borderRight: isActive ? `3px solid ${T.blue}` : "3px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.borderLight; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? T.blue + "15" : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <item.Icon size={16} color={isActive ? T.blue : T.textLight} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: isActive ? 650 : 450, color: isActive ? T.blue : T.textMid }}>{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight }}>GB Buildcon v2.1</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 28px", background: T.card, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{activeLabel}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{descMap[activeSection]}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textLight }}>
            <span>Settings</span><IcChevR size={12} color={T.textLight} /><span style={{ color: T.blue, fontWeight: 600 }}>{activeLabel}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <ActiveComp />
        </div>
      </div>
    </div>
  );
}
