// The company detail page and everything scoped to a single company:
// profile/admin editing, module access, data export, users, activity, CRM.
import { useState, useEffect, useCallback } from "react";
import { API, tok, apiFetch, T, fmtDate, fmtDateTime, fmtNum, fmtMoney, DOMAIN_LABELS,
         IcBuilding, IcUsers, IcPuzzle, IcX, IcChk, IcDownload, IcShield,
         IcActivity, IcDollar, IcEdit, IcClip, IcChevL, IcFolder, IcLock, IcPlus } from "./tokens";
import { Toast, Toggle, StatCard, Badge, Btn, InputField, SelectField, EmptyState, TableHeader } from "./ui";
import { BundleView, TicketBadge, fmtTicketTime } from "../shared/TicketBundle";

// ── Bugs raised by THIS company ────────────────────────────────────────
// The cross-tenant Bug Inbox answers "what is broken anywhere". A support
// person working one tenant needs the opposite cut, so this reuses the same
// ticket rendering against GET /escalations/saas?company_id=…, which also
// drops the inbox's open-bugs-only default: here you want the whole history,
// questions included, because a resolved ticket is often the answer.
function CompanyBugsTab({ companyId }) {
  const [rows, setRows] = useState(null);
  const [type, setType] = useState("bug");
  const [status, setStatus] = useState("open");
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    apiFetch(`/support-bot/escalations/saas?company_id=${companyId}&type=${type}&status=${status}`)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]));
  }, [companyId, type, status]);
  useEffect(() => { load(); }, [load]);

  const resolve = (id) => {
    setBusy(true);
    apiFetch(`/support-bot/escalations/${id}/resolve`, { method:"POST", body:{ resolution: note.trim() || undefined } })
      .then(r => { setBusy(false); if (r && r.success) { setOpenId(null); setNote(""); load(); } })
      .catch(() => setBusy(false));
  };

  const chip = (on) => ({
    border:`1px solid ${on ? T.blu : T.b1}`, cursor:"pointer", borderRadius:7,
    padding:"4px 11px", fontSize:11.5, fontWeight:600, fontFamily:"inherit",
    background: on ? T.bluL : T.surface, color: on ? T.blu : T.t3,
  });

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {[["bug","Bug"],["query","Sawaal"],["all","Sab"]].map(([id,label]) => (
          <button key={id} onClick={() => { setType(id); setOpenId(null); }} style={chip(type===id)}>{label}</button>
        ))}
        <span style={{ width:1, height:18, background:T.b1, margin:"0 4px" }}/>
        {[["open","Open"],["resolved","Resolved"],["all","Sab"]].map(([id,label]) => (
          <button key={id} onClick={() => { setStatus(id); setOpenId(null); }} style={chip(status===id)}>{label}</button>
        ))}
      </div>

      {rows === null && <div style={{ padding:18, fontSize:12.5, color:T.t4 }}>Loading...</div>}
      {rows && !rows.length && <EmptyState Icon={IcShield} text="Is company se koi ticket nahi aaya."/>}

      {rows && rows.map(t => {
        const isBug = t.type === "bug";
        const expanded = openId === t.id;
        return (
          <div key={t.id} style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:8 }}>
            <button onClick={() => { setOpenId(expanded ? null : t.id); setNote(""); }}
              style={{ width:"100%", textAlign:"left", border:"none", background:"transparent", cursor:"pointer",
                padding:"11px 14px", display:"flex", gap:10, alignItems:"flex-start", fontFamily:"inherit" }}>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
                  <TicketBadge text={isBug ? "Bug" : "Sawaal"} color={isBug ? T.red : T.slt} bg={isBug ? T.redL : T.sltL}/>
                  {t.status === "resolved" && <TicketBadge text="Resolved" color={T.grn} bg={T.grnL}/>}
                  <span style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{t.ticket_no}</span>
                  <span style={{ fontSize:11.5, color:T.t3 }}>{t.user_name || "—"}{t.user_phone ? ` · ${t.user_phone}` : ""}</span>
                  <span style={{ fontSize:11, color:T.t4 }}>{fmtTicketTime(t.created_at)}</span>
                  {t.bundle_meta && <TicketBadge text="Diagnostics" color={T.blu} bg={T.bluL}/>}
                </span>
                <span style={{ display:"block", fontSize:12.5, color:T.t2, lineHeight:1.45,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>
                  {t.question}
                </span>
              </span>
            </button>
            {expanded && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${T.b1}` }}>
                {t.reason && <div style={{ fontSize:11, color:T.t4, margin:"10px 0" }}>Reason: {t.reason}</div>}
                {t.context && <div style={{ fontSize:11, color:T.t3, marginBottom:8 }}>Context: {t.context}</div>}
                <BundleView meta={t.bundle_meta} url={t.bundle_url}/>
                {t.status === "resolved"
                  ? <div style={{ fontSize:11.5, color:T.grn, marginTop:10 }}>Resolved: {t.resolution || "—"}</div>
                  : (
                    <div style={{ display:"flex", gap:8, marginTop:12 }}>
                      <InputField label="" value={note} onChange={setNote} placeholder="Kya fix kiya? (optional)" style={{ flex:1 }}/>
                      <Btn color={T.grn} disabled={busy} onClick={() => resolve(t.id)} style={{ alignSelf:"flex-end" }}>
                        {busy ? "..." : "Resolve"}
                      </Btn>
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


// ════════════════════════════════════════════════════════════════════════
// TAB 2: COMPANIES (Enhanced)
// ════════════════════════════════════════════════════════════════════════
// ── EDIT COMPANY ──────────────────────────────────────────────────────
// Two things live behind one "Edit": the COMPANY record (its own name /
// contact) and the ADMIN's LOGIN identity (name / email / mobile on the
// users row). They are separate tables and separate endpoints, so the
// modal keeps them visually separate too — changing the company phone
// must never look like it changed the login.
function EditCompanyModal({ company, onClose, onSaved, setToast }) {
  const [co, setCo] = useState({
    name: company.name || "", email: company.email || "", phone: company.phone || "",
    city: company.city || "", state: company.state || "",
  });
  const [admin, setAdmin]     = useState(null);   // {id,name,email,phone} — primary admin
  const [admins, setAdmins]   = useState([]);     // all admin users, for the picker
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Admin identity lives on the users row — pull it from the existing
  // full-details endpoint rather than adding a new one.
  useEffect(() => {
    let alive = true;
    apiFetch("/saas-admin/companies/" + company.id + "/full-details").then(res => {
      if (!alive) return;
      const list = ((res.success && res.data?.users) || []).filter(u => u.role === "admin" && u.is_active);
      setAdmins(list);
      const primary = list[0];
      if (primary) setAdmin({ id: primary.id, name: primary.name || "", email: primary.email || "", phone: primary.phone || "" });
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [company.id]);

  const save = async () => {
    if (!co.name.trim()) return setToast({ msg: "Company name zaroori hai", type: "error" });
    if (admin && !admin.name.trim()) return setToast({ msg: "Admin ka naam zaroori hai", type: "error" });
    if (admin && admin.phone && !/^[6-9]\d{9}$/.test(admin.phone.trim())) {
      return setToast({ msg: "Admin mobile 10-digit hona chahiye — yahi login id hai", type: "error" });
    }
    setSaving(true);

    const r1 = await apiFetch("/saas-admin/companies/" + company.id, { method: "PUT", body: co });
    if (!r1.success) { setSaving(false); return setToast({ msg: r1.message || "Company update failed", type: "error" }); }

    // Admin row is a separate call — report it distinctly so a half-save is obvious.
    if (admin) {
      const r2 = await apiFetch("/saas-admin/companies/" + company.id + "/users/" + admin.id, {
        method: "PATCH", body: { name: admin.name, email: admin.email, phone: admin.phone },
      });
      if (!r2.success) {
        setSaving(false);
        return setToast({ msg: "Company save ho gayi, par admin login update nahi hua: " + (r2.message || "failed"), type: "error" });
      }
    }
    setSaving(false);
    setToast({ msg: "Company updated", type: "success" });
    onSaved();
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:560, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Edit Company</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{company.name} · /{company.slug}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>

        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>Company details</div>
          <InputField label="Company Name" required value={co.name} onChange={v => setCo(p=>({...p,name:v}))} placeholder="Company ka naam"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Company Email" value={co.email} onChange={v => setCo(p=>({...p,email:v}))} placeholder="office@company.com"/>
            <InputField label="Company Phone" value={co.phone} onChange={v => setCo(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="City" value={co.city} onChange={v => setCo(p=>({...p,city:v}))} placeholder="Raipur"/>
            <InputField label="State" value={co.state} onChange={v => setCo(p=>({...p,state:v}))} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ fontSize:10.5, color:T.t4 }}>URL (/{company.slug}) rename par nahi badalta — purane links kaam karte rehte hain.</div>

          <div style={{ borderTop:`1px solid ${T.b1}`, paddingTop:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>Admin login</div>
            {admins.length > 1 && (
              <select value={admin?.id || ""} onChange={e => {
                  const a = admins.find(x => String(x.id) === e.target.value);
                  if (a) setAdmin({ id:a.id, name:a.name||"", email:a.email||"", phone:a.phone||"" });
                }}
                style={{ padding:"5px 9px", borderRadius:6, border:`1px solid ${T.b1}`, fontSize:11.5, color:T.t1, background:T.surfaceB, fontFamily:"inherit", cursor:"pointer" }}>
                {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          {loading && <div style={{ fontSize:12, color:T.t4 }}>Admin load ho raha hai...</div>}
          {!loading && !admin && (
            <div style={{ padding:"10px 14px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, fontSize:11.5, color:T.red }}>
              Is company me koi active admin user nahi hai — Reset Admin Login se admin set karo.
            </div>
          )}
          {admin && (
            <>
              <InputField label="Admin Name" required value={admin.name} onChange={v => setAdmin(p=>({...p,name:v}))} placeholder="Full name"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <InputField label="Admin Email" value={admin.email} onChange={v => setAdmin(p=>({...p,email:v}))} placeholder="admin@company.com"/>
                <InputField label="Admin Mobile (login id)" value={admin.phone} onChange={v => setAdmin(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
              </div>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                <strong>Admin Mobile hi login id hai</strong> — badalne par admin ko naye number se login karna hoga. Password yahan se nahi badalta; uske liye "Reset Admin Login".
              </div>
            </>
          )}
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving || loading} style={{ flex:2 }}>{saving ? "Saving..." : "Save Changes"}</Btn>
        </div>
      </div>
    </>
  );
}

function CompanyModulesTab({ companyId }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // NOTE: /companies/:id/modules (not full-details.modules) — this endpoint
    // returns the full catalogue with label/tier/canDisable, which the toggle
    // rows need. full-details only carries raw company_modules rows.
    apiFetch("/saas-admin/companies/" + companyId + "/modules").then(res => {
      if (!alive) return;
      if (res.success) setModules(res.data || []);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [companyId]);

  const toggle = async (key, newVal) => {
    setSaving(key);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/modules/" + key, {
      method: "PUT", body: { is_enabled: newVal },
    });
    if (res.success) {
      setModules(prev => prev.map(m => m.key === key ? { ...m, is_enabled: newVal } : m));
      setToast({ msg: res.message, type: "success" });
    } else {
      setToast({ msg: res.message, type: "error" });
    }
    setSaving(null);
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:T.t3, fontSize:13 }}>Loading modules...</div>;
  if (!modules.length) return <EmptyState Icon={IcPuzzle} text="No modules configured for this company"/>;

  const core = modules.filter(m => !m.canDisable);
  const std  = modules.filter(m => m.canDisable);

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Module Access</div>
        <div style={{ padding:"6px 12px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8, fontSize:11.5, color:T.blu, fontWeight:600 }}>
          {modules.filter(m => m.is_enabled).length} / {modules.length} enabled
        </div>
      </div>
      <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
        Core Modules <div style={{ flex:1, height:1, background:T.b1 }}/> <Badge text="Always included" color={T.grn}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20 }}>
        {core.map(m => <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>)}
      </div>
      <div style={{ marginBottom:6, fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"1px", display:"flex", alignItems:"center", gap:8 }}>
        Standard Modules <div style={{ flex:1, height:1, background:T.b1 }}/> <Badge text="Toggleable" color={T.amb}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {std.map(m => <ModAccessRow key={m.key} m={m} saving={saving} onToggle={toggle}/>)}
      </div>
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
          <Badge text={m.tier} color={isCore ? T.grn : T.amb}/>
          {isCore && <span style={{ fontSize:10, color:T.t4 }}>-- locked</span>}
        </div>
      </div>
      <Badge text={m.is_enabled ? "ON" : "OFF"} color={m.is_enabled ? T.grn : T.slt}/>
      <Toggle value={m.is_enabled} disabled={isCore} onChange={v => onToggle(m.key, v)}/>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// TAB 6: DATA EXPORT (NEW)
// ════════════════════════════════════════════════════════════════════════
const ADD_USER_ROLES = [
  { value: "admin",           label: "Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "supervisor",      label: "Supervisor" },
  { value: "accountant",      label: "Accountant" },
  { value: "viewer",          label: "Viewer" },
];

// ── ADD A USER TO THIS COMPANY ────────────────────────────────────────
// The starter password is fixed (Welcome@123 + must_change_password), the same
// handshake company creation uses, so it is shown once here and never again.
function AddUserModal({ companyId, companyName, onClose, onSaved, setToast }) {
  const [f, setF] = useState({ name:"", phone:"", email:"", role:"supervisor" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) return setToast({ msg:"Naam zaroori hai", type:"error" });
    if (!/^[6-9]\d{9}$/.test(f.phone.trim()))
      return setToast({ msg:"Mobile 10-digit hona chahiye — yahi login id hai", type:"error" });
    setSaving(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/users", { method:"POST", body: f });
    setSaving(false);
    // Do NOT refresh the parent yet: its loading state would unmount this
    // modal before the one-time password could be read. Same trap as company
    // creation — the refresh moves to the Done button.
    if (res.success) setDone(res.data);
    else setToast({ msg: res.message || "User add nahi hua", type:"error" });
  };

  if (done) {
    return (
      <>
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:420, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
          <div style={{ padding:"18px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
            <div style={{ fontSize:16.5, fontWeight:800, color:"white" }}>{done.name} add ho gaya</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.75)", marginTop:3 }}>{companyName}</div>
          </div>
          <div style={{ padding:"20px 22px" }}>
            <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"15px 17px", marginBottom:15 }}>
              <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
              <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace" }}>{done.credentials.mobile}</div>
              <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", margin:"12px 0 4px" }}>Password</div>
              <div style={{ fontSize:17, fontWeight:800, color:T.t1, fontFamily:"monospace", background:T.ambL, padding:"7px 11px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{done.credentials.password}</div>
              <div style={{ fontSize:10.5, color:T.t4, marginTop:6 }}>Pehli login par badalna padega.</div>
            </div>
            <Btn style={{ width:"100%", justifyContent:"center" }} onClick={() => { onSaved(); onClose(); }}>Done</Btn>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:430, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${T.b1}` }}>
          <div style={{ fontSize:14.5, fontWeight:700, color:T.t1 }}>Naya user</div>
          <div style={{ fontSize:11.5, color:T.t3, marginTop:2 }}>{companyName}</div>
        </div>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <InputField label="Naam" value={f.name} onChange={set("name")} placeholder="jaise: Ramesh Kumar" required/>
          <InputField label="Mobile (login id)" value={f.phone} onChange={set("phone")} placeholder="10 digit" required/>
          <InputField label="Email (optional)" value={f.email} onChange={set("email")} placeholder="name@company.com"/>
          <SelectField label="Role" value={f.role} onChange={set("role")} options={ADD_USER_ROLES}/>
          <div style={{ fontSize:10.5, color:T.t4, lineHeight:1.45 }}>
            Password apne aap banega aur next screen par ek baar dikhega. Ye seat customer ke licence me se jayegi.
          </div>
        </div>
        <div style={{ padding:"13px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", justifyContent:"flex-end", gap:9 }}>
          <Btn variant="outline" onClick={onClose} disabled={saving}>Rehne do</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Ruko..." : "Add karo"}</Btn>
        </div>
      </div>
    </>
  );
}

function CompanyDetailPage({ companyId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [savingNote, setSavingNote] = useState(false);
  const [editUser, setEditUser] = useState(null);       // user row being edited
  const [showAddUser, setShowAddUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [newCreds, setNewCreds] = useState(null);       // {name,mobile,email,password} after reset
  const [resettingId, setResettingId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);        // Edit Company modal
  const [showResetAdmin, setShowResetAdmin] = useState(false);
  const [resetMobile, setResetMobile] = useState("");
  const [resettingAdmin, setResettingAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/saas-admin/companies/" + companyId + "/full-details").then(res => {
      if (res.success) setData(res.data); else setData(null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/crm-notes", {
      method:"POST", body:{ type: noteType, content: noteText }
    });
    setSavingNote(false);
    if (res.success) { setNoteText(""); load(); setToast({ msg:"Note added", type:"success" }); }
    else setToast({ msg:"Failed to add note", type:"error" });
  };

  const deleteNote = async (nid) => {
    if (!await window.confirmAsync("Delete this note?")) return;
    await apiFetch("/saas-admin/crm-notes/" + nid, { method:"DELETE" });
    load();
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSavingUser(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/users/" + editUser.id, {
      method:"PATCH",
      body:{ name: editUser.name, email: editUser.email, phone: editUser.phone, role: editUser.role, is_active: editUser.is_active ? 1 : 0 },
    });
    setSavingUser(false);
    if (res.success) { setEditUser(null); load(); setToast({ msg:"User updated", type:"success" }); }
    else setToast({ msg: res.message || "Update failed", type:"error" });
  };

  const resetUserPassword = async (u) => {
    if (!await window.confirmAsync(`Reset password for ${u.name}? A new password will be generated and shown once.`)) return;
    setResettingId(u.id);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/users/" + u.id + "/reset-password", { method:"POST" });
    setResettingId(null);
    if (res.success && res.data) { setNewCreds(res.data.credentials); load(); }
    else setToast({ msg: res.message || "Reset failed", type:"error" });
  };

  // Regenerate the primary admin's login (and optionally set their mobile).
  // Moved here from the Companies tab — it is a company-scoped action.
  const resetAdminLogin = async () => {
    const m = (resetMobile || "").trim();
    if (m && !/^[6-9]\d{9}$/.test(m)) return setToast({ msg:"Enter a valid 10-digit mobile number", type:"error" });
    setResettingAdmin(true);
    const res = await apiFetch("/saas-admin/companies/" + companyId + "/reset-admin-login", {
      method:"POST", body: m ? { mobile: m } : {},
    });
    setResettingAdmin(false);
    if (res.success) { setShowResetAdmin(false); setResetMobile(""); setNewCreds(res.data?.credentials || null); load(); }
    else setToast({ msg: res.message || "Reset failed", type:"error" });
  };

  // Complete tenant export (information_schema-driven, same artifact the purge
  // flow uses for recovery). Was a top-level tab with a company picker.
  const doExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(API + "/saas-admin/companies/" + companyId + "/export-data", {
        method: "POST",
        headers: { Authorization: "Bearer " + tok(), "Content-Type": "application/json" },
      });
      const out = await res.json();
      if (out.success) {
        const blob = new Blob([JSON.stringify(out.data, null, 2)], { type:"application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export_${out.data.company?.slug || companyId}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ msg: `Exported ${out.data.meta.table_count} tables · ${out.data.meta.total_rows} rows`, type:"success" });
      } else setToast({ msg: out.message || "Export failed", type:"error" });
    } catch (e) {
      setToast({ msg:"Export failed: " + e.message, type:"error" });
    }
    setExporting(false);
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading company details...</div>;
  if (!data)   return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Failed to load.<br/><Btn onClick={onBack} variant="outline" style={{ marginTop:12 }}>← Back</Btn></div>;

  const { company, current_sub, subscriptions, users, modules, audit_logs, feature_requests, crm_notes, usage, health } = data;
  const healthColor = health.score >= 75 ? T.grn : health.score >= 50 ? T.amb : T.red;

  const TABS_DET = [
    { id:"overview",    label:"Overview",            Icon:IcBuilding },
    { id:"subscription",label:"Subscription",        Icon:IcDollar   },
    { id:"users",       label:`Users (${users.length})`, Icon:IcUsers },
    { id:"modules",     label:"Module Access",       Icon:IcPuzzle   },
    { id:"bugs",        label:"Bugs",                Icon:IcShield   },
    { id:"audit",       label:"Activity",            Icon:IcActivity },
    { id:"features",    label:`Requests (${feature_requests.length})`, Icon:IcClip },
    { id:"crm",         label:`Notes/CRM (${crm_notes.length})`, Icon:IcShield },
  ];

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      {/* Back + company header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <button onClick={onBack} style={{ padding:"7px 12px", border:`1px solid ${T.b1}`, background:T.surface, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.t2, fontFamily:"inherit" }}>
          <IcChevL size={14}/> Back
        </button>
        <div style={{ width:48, height:48, borderRadius:10, background:T.bluL, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:20, fontWeight:800, color:T.blu }}>{(company.name||"?")[0]}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.t1 }}>{company.name}</div>
          <div style={{ fontSize:11, color:T.t4 }}>/{company.slug} · {DOMAIN_LABELS[company.module_type] || company.module_type || "--"} · Registered {fmtDate(company.created_at)}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Badge text={company.is_active ? "Active" : "Inactive"} color={company.is_active ? T.grn : T.red}/>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Health Score</div>
            <div style={{ fontSize:20, fontWeight:800, color:healthColor }}>{health.score}/100</div>
          </div>
        </div>
      </div>

      {/* Company-scoped actions — all of these used to live in the Companies tab
          or as their own top-level tab with a company picker. */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <Btn variant="outline" onClick={() => setShowEdit(true)}><IcEdit size={13}/> Edit</Btn>
        <Btn variant="outline" onClick={() => { setShowResetAdmin(true); setResetMobile(""); }}>Reset Admin Login</Btn>
        <Btn variant="outline" onClick={doExport} disabled={exporting}>
          <IcDownload size={13}/> {exporting ? "Exporting..." : "Export Data"}
        </Btn>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:4, background:T.surface, padding:4, border:`1px solid ${T.b1}`, borderRadius:10, marginBottom:16, overflowX:"auto" }}>
        {TABS_DET.map(t => {
          const isA = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", border:"none", borderRadius:7, cursor:"pointer",
                color: isA ? "white" : T.t3, fontWeight: isA ? 700 : 500, fontSize:12,
                background: isA ? T.blu : "transparent", whiteSpace:"nowrap", fontFamily:"inherit" }}>
              <t.Icon size={13} color={isA ? "white" : T.t3}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview */}
      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Company Info</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { l:"Email", v: company.email || "--" },
                { l:"Phone", v: company.phone || "--" },
                { l:"City", v: company.city || "--" },
                { l:"State", v: company.state || "--" },
                { l:"Business Type", v: DOMAIN_LABELS[company.module_type] || company.module_type || "--" },
                { l:"Registered", v: fmtDate(company.created_at) },
                { l:"Users", v: company.user_count },
                { l:"Projects", v: company.project_count },
              ].map((x,i) => (
                <div key={i}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:3 }}>{x.l}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:T.t1 }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Health Breakdown</div>
            {Object.entries(health.breakdown).map(([k, v]) => {
              const max = { login:30, features:25, payment:20, support:15, growth:10 }[k] || 20;
              const pct = (v / max) * 100;
              return (
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:T.t2, textTransform:"capitalize", fontWeight:500 }}>{k}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:T.t1 }}>{Math.round(v)}/{max}</span>
                  </div>
                  <div style={{ height:6, background:T.b1, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background: pct >= 70 ? T.grn : pct >= 40 ? T.amb : T.red, borderRadius:3 }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:14, padding:10, background:T.surfaceB, borderRadius:8, fontSize:11, color:T.t3 }}>
              Last login: <strong style={{ color:T.t1 }}>{health.days_since_login == null ? "Never" : health.days_since_login + "d ago"}</strong>
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Usage Stats</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <StatCard label="Projects" value={fmtNum(usage.projects)} color={T.blu} Icon={IcFolder}/>
              <StatCard label="Transactions" value={fmtNum(usage.transactions)} color={T.grn} Icon={IcActivity}/>
              <StatCard label="Revenue" value={"₹" + fmtMoney(usage.revenue)} color={T.amb} Icon={IcDollar}/>
            </div>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            {/* The CLIENT's contract — a company has no subscription of its own */}
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:14 }}>Client Contract</div>
            {current_sub ? (
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:T.blu }}>₹{fmtMoney(current_sub.base_annual_value)}<span style={{ fontSize:11, fontWeight:500, color:T.t4 }}> / yr</span></div>
                <div style={{ fontSize:11, color:T.t4, marginBottom:10 }}>{current_sub.billing_cycle} · <Badge text={current_sub.status} color={current_sub.status === "active" ? T.grn : T.amb}/></div>
                <div style={{ fontSize:11, color:T.t3 }}>Valid till <strong style={{ color:T.t1 }}>{fmtDate(current_sub.end_date)}</strong></div>
                <div style={{ fontSize:11, color:T.t3 }}>{current_sub.committed_users} committed users</div>
                <div style={{ fontSize:10.5, color:T.t4, marginTop:6 }}>{current_sub.client_name} · invoices under Customers</div>
              </div>
            ) : <div style={{ fontSize:12, color:T.t4 }}>No contract on this company's client</div>}
          </div>
        </div>
      )}

      {/* TAB 2: Subscription */}
      {tab === "subscription" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>
            Client Contract History
            <span style={{ fontSize:10.5, fontWeight:400, color:T.t4, marginLeft:8 }}>billing is client-level — edit under Customers</span>
          </div>
          {subscriptions.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No contract on this company's client</div>}
          {subscriptions.map((s, i) => (
            <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"grid", gridTemplateColumns:"1.5fr 1fr 1.2fr 1fr 1fr", gap:10, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>₹{fmtMoney(s.base_annual_value)}/yr</div>
                <div style={{ fontSize:10, color:T.t4 }}>{s.billing_cycle} · {s.term_months}mo term</div>
              </div>
              <div><Badge text={s.status} color={s.status === "active" ? T.grn : s.status === "pending" ? T.amb : T.slt}/></div>
              <div style={{ fontSize:11, color:T.t3 }}>{fmtDate(s.start_date)} → {fmtDate(s.end_date)}</div>
              <div style={{ fontSize:12, color:T.t2 }}>{s.committed_users} users</div>
              <div style={{ fontSize:11, color:T.t4 }}>{s.order_ref || "--"}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Users — edit / reset-password per user */}
      {tab === "users" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          {/* Adding a user lives here so support can do it without asking the
              company admin — previously a user could only be born with its
              company, and the workaround was handing out the admin login. */}
          <div style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Users ({users.length})</span>
            <Btn onClick={() => setShowAddUser(true)} style={{ padding:"5px 11px", fontSize:11.5 }}>
              <IcPlus size={11}/> Add User
            </Btn>
          </div>
          <TableHeader columns={["Name / Mobile","Email","Role","Last Login","Status","Actions"]} gridCols="1.5fr 1.7fr 1fr 0.9fr 84px 88px"/>
          {users.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No users</div>}
          {users.map((u, i) => (
            <div key={u.id || i} style={{ display:"grid", gridTemplateColumns:"1.5fr 1.7fr 1fr 0.9fr 84px 88px", padding:"11px 16px", borderBottom: i < users.length-1 ? `1px solid ${T.b1}` : "none", alignItems:"center" }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.name}</div>
                <div style={{ fontSize:10.5, color:T.t4, fontFamily:"monospace" }}>{u.phone || "no mobile"}</div>
              </div>
              <div style={{ fontSize:11, color:T.t3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email || "--"}</div>
              <div><Badge text={(u.role||"").replace(/_/g," ")} color={T.pur}/></div>
              <div style={{ fontSize:10.5, color:T.t4 }}>{u.last_login ? fmtDateTime(u.last_login) : "Never"}</div>
              <div><Badge text={u.is_active ? "Active" : "Inactive"} color={u.is_active ? T.grn : T.red}/></div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                <button onClick={() => setEditUser({ id:u.id, name:u.name||"", email:u.email||"", phone:u.phone||"", role:u.role||"", is_active: !!u.is_active })} title="Edit user"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.bluM}`, background:T.bluL, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcEdit size={12} color={T.blu}/>
                </button>
                <button onClick={() => resetUserPassword(u)} disabled={resettingId === u.id} title="Reset password"
                  style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.ambM}`, background:T.ambL, cursor: resettingId===u.id ? "wait" : "pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <IcLock size={12} color={T.amb}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Module Access — editable, was a separate top-level tab */}
      {tab === "modules" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
          <CompanyModulesTab companyId={companyId}/>
        </div>
      )}

      {/* TAB: Bugs raised by this company */}
      {tab === "bugs" && <CompanyBugsTab companyId={companyId}/>}

      {/* TAB 5: Activity / Audit */}
      {tab === "audit" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden", maxHeight:500, overflowY:"auto" }}>
          {audit_logs.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No activity logged</div>}
          {audit_logs.map((a, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 16px", borderBottom:`1px solid ${T.b1}` }}>
              <div style={{ width:26, height:26, borderRadius:6, background:T.bluL, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <IcActivity size={12} color={T.blu}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:T.t1 }}>
                  <strong>{a.user_name || "System"}</strong> <span style={{ color:T.blu, fontWeight:600 }}>{a.action}</span> <span style={{ color:T.t3 }}>{a.entity_type}</span>{a.entity_id && <span style={{ color:T.t4 }}> #{a.entity_id}</span>}
                </div>
                <div style={{ fontSize:10, color:T.t4, marginTop:1 }}>{fmtDateTime(a.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: Feature Requests */}
      {tab === "features" && (
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>Feature Requests from {company.name}</div>
          {feature_requests.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No feature requests yet</div>}
          {feature_requests.map((f, i) => (
            <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{f.title}</div>
                <div style={{ display:"flex", gap:6 }}>
                  <Badge text={f.priority} color={f.priority === "critical" ? T.red : f.priority === "high" ? T.amb : T.slt}/>
                  <Badge text={f.status} color={f.status === "shipped" ? T.grn : f.status === "in_development" ? T.blu : T.pur}/>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.t3, marginBottom:4 }}>{f.description}</div>
              <div style={{ fontSize:10, color:T.t4 }}>Requested by {f.user_name} · {fmtDateTime(f.created_at)} {f.module && `· ${f.module}`}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: CRM / Notes */}
      {tab === "crm" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:12 }}>Add Note / Log Activity</div>
            <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
              {["note","call","email","whatsapp","meeting"].map(t => (
                <button key={t} onClick={() => setNoteType(t)}
                  style={{ padding:"5px 12px", borderRadius:18, fontSize:11, fontWeight: noteType===t ? 700 : 500,
                    border:`1px solid ${noteType===t ? T.blu : T.b1}`,
                    background: noteType===t ? T.bluL : T.surface, color: noteType===t ? T.blu : T.t3,
                    cursor:"pointer", textTransform:"capitalize", fontFamily:"inherit" }}>{t}</button>
              ))}
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write your note here..."
              style={{ width:"100%", minHeight:100, padding:"10px 12px", border:`1px solid ${T.b1}`, borderRadius:8, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
            <Btn onClick={addNote} disabled={savingNote || !noteText.trim()} style={{ marginTop:10, width:"100%" }}>
              {savingNote ? "Saving..." : "Add Note"}
            </Btn>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, fontSize:13, fontWeight:700, color:T.t1 }}>Activity Timeline</div>
            <div style={{ maxHeight:450, overflowY:"auto" }}>
              {crm_notes.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.t4, fontSize:12 }}>No notes yet. Start tracking customer interactions!</div>}
              {crm_notes.map((n, i) => {
                const typeColor = { note:T.slt, call:T.blu, email:T.pur, whatsapp:T.grn, meeting:T.amb }[n.type] || T.slt;
                return (
                  <div key={i} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}` }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <Badge text={n.type} color={typeColor}/>
                        <span style={{ fontSize:11, fontWeight:600, color:T.t2 }}>{n.author_name}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:10, color:T.t4 }}>{fmtDateTime(n.created_at)}</span>
                        <button onClick={() => deleteNote(n.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.t4, display:"flex", padding:2 }}><IcX size={12}/></button>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:T.t1, whiteSpace:"pre-wrap" }}>{n.content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Company — profile + the admin's login identity */}
      {showEdit && (
        <EditCompanyModal company={company}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
          setToast={setToast}/>
      )}

      {/* Reset Admin Login */}
      {showResetAdmin && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Reset Admin Login</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{company.name}</div>
              </div>
              <button onClick={() => setShowResetAdmin(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Login Mobile (leave blank to keep current)" value={resetMobile} onChange={v => setResetMobile(v.replace(/\D/g,"").slice(0,10))} placeholder="Set / change 10-digit mobile"/>
              <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
                A new password will be generated and shown once. Share the <strong>mobile + password</strong> with the admin. (OTP login also works as a fallback.)
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setShowResetAdmin(false)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={resetAdminLogin} disabled={resettingAdmin} style={{ flex:2 }}>{resettingAdmin ? "Resetting..." : "Generate New Password"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {showAddUser && <AddUserModal companyId={companyId} companyName={company.name} onClose={() => setShowAddUser(false)} onSaved={load} setToast={setToast}/>}
      {editUser && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:460, maxWidth:"94vw", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Edit User</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{company.name}</div>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Name" value={editUser.name} onChange={v => setEditUser({ ...editUser, name:v })} placeholder="Full name"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <InputField label="Login Mobile" value={editUser.phone} onChange={v => setEditUser({ ...editUser, phone:v.replace(/\D/g,"").slice(0,10) })} placeholder="10-digit mobile"/>
                <SelectField label="Role" value={editUser.role} onChange={v => setEditUser({ ...editUser, role:v })}
                  options={(() => {
                    const base = [
                      { value:"admin", label:"Admin" },
                      { value:"project_manager", label:"Project Manager" },
                      { value:"supervisor", label:"Site Supervisor" },
                      { value:"accountant", label:"Accountant" },
                      { value:"viewer", label:"Viewer" },
                    ];
                    return base.some(o => o.value === editUser.role) ? base : [{ value:editUser.role, label:(editUser.role||"—")+" (current)" }, ...base];
                  })()}/>
              </div>
              <InputField label="Email (reference)" value={editUser.email} onChange={v => setEditUser({ ...editUser, email:v })} placeholder="name@example.com"/>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 2px" }}>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>Account Active</div>
                  <div style={{ fontSize:10.5, color:T.t4 }}>Inactive users can't log in</div>
                </div>
                <Toggle value={editUser.is_active} onChange={v => setEditUser({ ...editUser, is_active:v })}/>
              </div>
              <div style={{ padding:"9px 13px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11, color:T.amb }}>
                Login is <strong>mobile + password</strong>. To hand a fresh password, use <strong>Reset password</strong> (🔒) on the user row.
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setEditUser(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={saveUser} disabled={savingUser} style={{ flex:2 }}>{savingUser ? "Saving..." : "Save Changes"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* New-credentials Modal (after a user password reset) */}
      {newCreds && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, maxWidth:"94vw", background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
            <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <IcChk size={24} color="white"/>
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:"white" }}>New Password</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:4 }}>Share these with {newCreds.name || "the user"}</div>
            </div>
            <div style={{ padding:"24px 22px" }}>
              <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace", letterSpacing:"0.5px" }}>{newCreds.mobile || "— (set a mobile via Edit)"}</div>
                  {newCreds.email && <div style={{ fontSize:10.5, color:T.t4, marginTop:3 }}>Email (reference): {newCreds.email}</div>}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>New Password</div>
                  <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"monospace", letterSpacing:"1px", background:T.ambL, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{newCreds.password}</div>
                </div>
              </div>
              <div style={{ padding:"10px 14px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:8, fontSize:11, color:T.red, marginBottom:16 }}>
                <strong>Shown once!</strong> Copy it now. The user must change it after first login.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                  navigator.clipboard.writeText(`Login Mobile: ${newCreds.mobile || ""}\nPassword: ${newCreds.password}\nLogin with mobile + password.`);
                  setToast({ msg:"Credentials copied!", type:"success" });
                }}><IcClip size={13}/> Copy</Btn>
                <Btn style={{ flex:1 }} onClick={() => setNewCreds(null)}>Done</Btn>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CompanyDetailPage;
export { EditCompanyModal };
