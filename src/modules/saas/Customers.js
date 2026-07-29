// Customers: paying clients with their companies nested, the client detail
// page, and every modal that creates or edits a customer, contract or invoice.
import { useState, useEffect, useCallback } from "react";
import { apiFetch, T, fmtDate, fmtNum, fmtMoney, fmtAmt, DOMAIN_LABELS,
         limitStr, limitColor, SUB_COLORS, INV_COLORS, CYCLE_LABELS,
         IcUsers, IcX, IcChk, IcPlus, IcEdit, IcSearch, IcActivity,
         IcDollar, IcTrend, IcRefresh, IcChevL, th, td } from "./tokens";
import { Toast, StatCard, Badge, Btn, InputField, SelectField, EmptyState, TableHeader, PageHeader } from "./ui";
import DeleteCompanyModal from "./DeleteCompany";

// Customer buckets. The backend derives these (utils/clientLifecycle.js) and
// may also carry a human override; this only holds how they LOOK.
// Note "active" deliberately still covers a customer with an overdue invoice —
// a live contract is a live contract, and the money is shouted about by the
// overdue strip and the row's own OVERDUE badge instead.
const LIFECYCLE = {
  active:    { label: "Active",        color: T.grn, blurb: "contract chalu hai" },
  attention: { label: "Dhyan chahiye", color: T.amb, blurb: "renewal ya billing pending" },
  dormant:   { label: "Dormant",       color: T.slt, blurb: "na company na contract — sirf record" },
  archived:  { label: "Archived",      color: T.t4,  blurb: "file kar diya, finance ke liye rakha hai" },
};
const BUCKET_ORDER = ["active", "attention", "dormant", "archived"];



// ── ONBOARD A NEW PAYING CUSTOMER ─────────────────────────────────────
// Client + subscription + first company in ONE submit. Previously these were
// two actions in two tabs, and forgetting the subscription silently produced a
// live-but-unbilled tenant. Deliberately NOT a step wizard — three fieldsets in
// one scrolling form, so nothing is hidden behind a "Next".
function NewCustomerModal({ onClose, onCreated, setToast }) {
  const [c, setC] = useState({ name:"", contact_person:"", phone:"", email:"", gstin:"", city:"", state:"",
                               max_companies:1, max_users:0, max_projects:0 });
  const [s, setS] = useState({ committed_users:30, base_annual_value:"", gst_rate:18,
                               billing_cycle:"quarterly", term_months:12, start_date:"",
                               order_ref:"", quotation_ref:"" });
  // Standard published rate card as the starting point — edit per deal
  const [slabs, setSlabs] = useState([
    { from_users:31,  to_users:50,  annual_rate_per_user:10000 },
    { from_users:51,  to_users:100, annual_rate_per_user:7000 },
    { from_users:101, to_users:"",  annual_rate_per_user:5000 },
  ]);
  const [co, setCo] = useState({ name:"", module_type:"construction_company",
                                 admin_name:"", admin_email:"", phone:"", city:"", state:"" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);   // success payload → credentials view

  const setSlab = (i, k, v) => setSlabs(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const submit = async () => {
    if (!c.name.trim())        return setToast({ msg:"Client (paying customer) ka naam zaroori hai", type:"error" });
    if (!co.name.trim())       return setToast({ msg:"Company ka naam zaroori hai", type:"error" });
    if (!co.admin_name.trim() || !co.admin_email.trim() || !co.phone.trim())
      return setToast({ msg:"Admin ka naam, email aur mobile zaroori hai", type:"error" });
    if (!/^[6-9]\d{9}$/.test(co.phone.trim()))
      return setToast({ msg:"Admin mobile 10-digit hona chahiye — yahi login id hai", type:"error" });
    if (!s.base_annual_value)
      return setToast({ msg:"Annual value daalo — warna customer bill nahi hoga (BILLING GAP)", type:"error" });

    setSaving(true);
    const body = {
      client: c,
      subscription: { ...s, slabs: slabs.filter(x => x.from_users && x.annual_rate_per_user) },
      company: { ...co, admin_email: co.admin_email.trim() },
    };
    if (!body.subscription.start_date) delete body.subscription.start_date;
    const res = await apiFetch("/saas-admin/customers", { method:"POST", body });
    setSaving(false);
    // Deliberately do NOT refresh the list here. The parent's reload flips it to
    // a "Loading clients..." early-return, which unmounts this modal — and the
    // password is shown exactly once, so that would lose it. Refresh on close.
    if (res.success) setDone(res.data);
    else setToast({ msg: res.message || "Customer create nahi hua", type:"error" });
  };

  const finish = () => { onCreated(); onClose(); };

  // ── Success view: hand over the credentials once ──
  if (done) {
    return (
      <>
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:460, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
          <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
              <IcChk size={24} color="white"/>
            </div>
            <div style={{ fontSize:17, fontWeight:800, color:"white" }}>Customer Ready</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:4 }}>
              {done.name} · subscription {done.subscription_status}
              {done.invoices_generated > 0 ? ` · ${done.invoices_generated} invoices scheduled` : ""}
            </div>
          </div>
          <div style={{ padding:"22px" }}>
            {done.subscription_status !== "active" && (
              <div style={{ padding:"10px 13px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb, marginBottom:14 }}>
                Subscription <strong>{done.subscription_status}</strong> hai — jab tak active nahi hoti, ye customer BILLING GAP me dikhega.
              </div>
            )}
            <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
                <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace", letterSpacing:"0.5px" }}>{done.credentials.mobile}</div>
                <div style={{ fontSize:10.5, color:T.t4, marginTop:3 }}>Email (reference only): {done.credentials.email}</div>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Password</div>
                <div style={{ fontSize:18, fontWeight:800, color:T.t1, fontFamily:"monospace", letterSpacing:"1px", background:T.ambL, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{done.credentials.password}</div>
                <div style={{ fontSize:10.5, color:T.t4, marginTop:5 }}>Pehli login par badalna padega.</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:9 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                navigator.clipboard.writeText(`Login Mobile: ${done.credentials.mobile}\nPassword: ${done.credentials.password}\nLogin with mobile + password.`);
                setToast({ msg:"Credentials copied" });
              }}>Copy</Btn>
              <Btn style={{ flex:2 }} onClick={finish}>Done</Btn>
            </div>
          </div>
        </div>
      </>
    );
  }

  const Section = ({ title, hint }) => (
    <div style={{ display:"flex", alignItems:"baseline", gap:8, marginTop:4 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>{title}</div>
      {hint && <div style={{ fontSize:10.5, color:T.t4 }}>{hint}</div>}
    </div>
  );

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:640, maxHeight:"92vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A", position:"sticky", top:0, zIndex:2 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>New Customer</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Client + subscription + pehli company — sab ek saath</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>

        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          {/* 1. CLIENT */}
          <Section title="1 · Client" hint="paying customer — limits aur billing yahin lagti hai"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Client Name" required value={c.name} onChange={v => setC(p=>({...p,name:v}))} placeholder="e.g. Ratna Khanij Pvt Ltd"/>
            <InputField label="Contact Person" value={c.contact_person} onChange={v => setC(p=>({...p,contact_person:v}))} placeholder="Owner / decision maker"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Mobile" value={c.phone} onChange={v => setC(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
            <InputField label="Email" value={c.email} onChange={v => setC(p=>({...p,email:v}))} placeholder="contact@client.com"/>
            <InputField label="GSTIN" value={c.gstin} onChange={v => setC(p=>({...p,gstin:v.toUpperCase().slice(0,15)}))} placeholder="22AAAAA0000A1Z5"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blu, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Plan Limits — creation par hard-block (0 = unlimited)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <InputField label="Max Companies" type="number" value={c.max_companies} onChange={v => setC(p=>({...p,max_companies:v}))}/>
              <InputField label="Max Users" type="number" value={c.max_users} onChange={v => setC(p=>({...p,max_users:v}))}/>
              <InputField label="Max Projects" type="number" value={c.max_projects} onChange={v => setC(p=>({...p,max_projects:v}))}/>
            </div>
          </div>

          {/* 2. SUBSCRIPTION */}
          <Section title="2 · Subscription" hint="start date do to turant active + invoice schedule ban jayega"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Committed Users" type="number" value={s.committed_users} onChange={v => setS(p=>({...p,committed_users:v}))}/>
            <InputField label="Annual Value (₹, excl. GST)" required type="number" value={s.base_annual_value} onChange={v => setS(p=>({...p,base_annual_value:v}))} placeholder="330000"/>
            <InputField label="GST %" type="number" value={s.gst_rate} onChange={v => setS(p=>({...p,gst_rate:v}))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <SelectField label="Billing Cycle" value={s.billing_cycle} onChange={v => setS(p=>({...p,billing_cycle:v}))}
              options={Object.entries(CYCLE_LABELS).map(([value, label]) => ({ value, label }))}/>
            <InputField label="Term (months)" type="number" value={s.term_months} onChange={v => setS(p=>({...p,term_months:v}))}/>
            <InputField label="Start Date (blank = pending)" type="date" value={s.start_date} onChange={v => setS(p=>({...p,start_date:v}))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Order Ref" value={s.order_ref} onChange={v => setS(p=>({...p,order_ref:v}))} placeholder="PHX/SAN/SOC/2026-27/001"/>
            <InputField label="Quotation Ref" value={s.quotation_ref} onChange={v => setS(p=>({...p,quotation_ref:v}))} placeholder="PHX/SAN/2026-27/001"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.purL, border:`1px solid ${T.purM}`, borderRadius:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.pur, textTransform:"uppercase", letterSpacing:"0.5px" }}>Additional-User Slabs (annual ₹/user beyond committed)</div>
              <Btn variant="outline" color={T.pur} onClick={() => setSlabs(p => [...p, { from_users:"", to_users:"", annual_rate_per_user:"" }])} style={{ padding:"3px 9px", fontSize:11 }}><IcPlus size={11}/> Slab</Btn>
            </div>
            {slabs.map((x, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 32px", gap:8, marginBottom:6, alignItems:"end" }}>
                <InputField label={i === 0 ? "From user #" : ""} type="number" value={x.from_users} onChange={v => setSlab(i,"from_users",v)}/>
                <InputField label={i === 0 ? "To user # (blank = ∞)" : ""} type="number" value={x.to_users} onChange={v => setSlab(i,"to_users",v)}/>
                <InputField label={i === 0 ? "Annual ₹ / user" : ""} type="number" value={x.annual_rate_per_user} onChange={v => setSlab(i,"annual_rate_per_user",v)}/>
                <button onClick={() => setSlabs(p => p.filter((_, j) => j !== i))} style={{ background:"none", border:"none", cursor:"pointer", color:T.red, display:"flex", paddingBottom:9 }}><IcX size={14}/></button>
              </div>
            ))}
          </div>

          {/* 3. FIRST COMPANY */}
          <Section title="3 · Pehli Company" hint="isi client ke neeche banegi; aur companies baad me add kar sakte ho"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Company Name" required value={co.name} onChange={v => setCo(p=>({...p,name:v}))} placeholder="e.g. Ratna Khanij"/>
            <SelectField label="Business Type" value={co.module_type} onChange={v => setCo(p=>({...p,module_type:v}))}
              options={Object.entries(DOMAIN_LABELS).map(([k,v]) => ({ value:k, label:v }))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Admin Name" required value={co.admin_name} onChange={v => setCo(p=>({...p,admin_name:v}))} placeholder="Full name"/>
            <InputField label="Admin Email" required value={co.admin_email} onChange={v => setCo(p=>({...p,admin_email:v}))} placeholder="admin@company.com"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Admin Mobile (login id)" required value={co.phone} onChange={v => setCo(p=>({...p,phone:v.replace(/\D/g,"").slice(0,10)}))} placeholder="9876543210"/>
            <InputField label="City" value={co.city} onChange={v => setCo(p=>({...p,city:v}))} placeholder="Raipur"/>
            <InputField label="State" value={co.state} onChange={v => setCo(p=>({...p,state:v}))} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
            <strong>Admin Mobile hi login id hai.</strong> Password auto-set hoke create ke baad ek baar dikhega — mobile + password admin ko de dena. Pehli login par unhe badalna padega.
          </div>
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB, position:"sticky", bottom:0 }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving} style={{ flex:2 }}>{saving ? "Creating..." : "Create Customer"}</Btn>
        </div>
      </div>
    </>
  );
}

function ClientFormModal({ initial, onClose, onSaved, setToast }) {
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    name: initial?.name || "", contact_person: initial?.contact_person || "",
    phone: initial?.phone || "", email: initial?.email || "", gstin: initial?.gstin || "",
    address: initial?.address || "", city: initial?.city || "", state: initial?.state || "",
    max_companies: initial?.max_companies ?? 1, max_users: initial?.max_users ?? 0, max_projects: initial?.max_projects ?? 0,
    notes: initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) return setToast({ msg: "Client name required", type: "error" });
    setSaving(true);
    const res = isEdit
      ? await apiFetch(`/saas-admin/clients/${initial.id}`, { method: "PUT", body: f })
      : await apiFetch("/saas-admin/clients", { method: "POST", body: f });
    setSaving(false);
    if (res.success) { setToast({ msg: isEdit ? "Client updated" : "Client created" }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:560, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{isEdit ? "Edit Client" : "New Client"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Paying customer — limits & billing live at this level</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Client Name" required value={f.name} onChange={set("name")} placeholder="e.g. Ratna Khanij"/>
            <InputField label="Contact Person" value={f.contact_person} onChange={set("contact_person")} placeholder="Owner / decision maker"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Mobile" value={f.phone} onChange={v => set("phone")(v.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210"/>
            <InputField label="Email" value={f.email} onChange={set("email")} placeholder="contact@client.com"/>
            <InputField label="GSTIN" value={f.gstin} onChange={v => set("gstin")(v.toUpperCase().slice(0, 15))} placeholder="22AAAAA0000A1Z5"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 }}>
            <InputField label="Address" value={f.address} onChange={set("address")} placeholder="Street / area"/>
            <InputField label="City" value={f.city} onChange={set("city")} placeholder="Raipur"/>
            <InputField label="State" value={f.state} onChange={set("state")} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.bluL, border:`1px solid ${T.bluM}`, borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blu, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Plan Limits — hard-blocked at creation (0 = unlimited)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <InputField label="Max Companies" type="number" value={f.max_companies} onChange={set("max_companies")}/>
              <InputField label="Max Users" type="number" value={f.max_users} onChange={set("max_users")}/>
              <InputField label="Max Projects" type="number" value={f.max_projects} onChange={set("max_projects")}/>
            </div>
          </div>
          <InputField label="Notes" value={f.notes} onChange={set("notes")} placeholder="Internal notes"/>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : (isEdit ? "Save Changes" : "Create Client")}</Btn>
        </div>
      </div>
    </>
  );
}

function SubscriptionFormModal({ clientId, initial, onClose, onSaved, setToast }) {
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    committed_users: initial?.committed_users ?? 30,
    base_annual_value: initial?.base_annual_value ?? "",
    gst_rate: initial?.gst_rate ?? 18,
    billing_cycle: initial?.billing_cycle || "quarterly",
    term_months: initial?.term_months ?? 12,
    order_ref: initial?.order_ref || "", quotation_ref: initial?.quotation_ref || "",
    notes: initial?.notes || "", start_date: "",
  });
  // Standard published rate card as the starting point — edit per deal
  const [slabs, setSlabs] = useState(initial?.slabs?.length
    ? initial.slabs.map(s => ({ from_users: s.from_users, to_users: s.to_users ?? "", annual_rate_per_user: s.annual_rate_per_user }))
    : [{ from_users: 31, to_users: 50, annual_rate_per_user: 10000 },
       { from_users: 51, to_users: 100, annual_rate_per_user: 7000 },
       { from_users: 101, to_users: "", annual_rate_per_user: 5000 }]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));
  const setSlab = (i, k, v) => setSlabs(p => p.map((s, j) => j === i ? { ...s, [k]: v } : s));

  const save = async () => {
    if (!f.base_annual_value) return setToast({ msg: "Annual value required", type: "error" });
    setSaving(true);
    const body = { ...f, slabs: slabs.filter(s => s.from_users && s.annual_rate_per_user) };
    if (!body.start_date) delete body.start_date;
    const res = isEdit
      ? await apiFetch(`/saas-admin/client-subscriptions/${initial.id}`, { method: "PUT", body })
      : await apiFetch(`/saas-admin/clients/${clientId}/subscriptions`, { method: "POST", body });
    setSaving(false);
    if (res.success) { setToast({ msg: isEdit ? "Subscription updated" : "Subscription created" }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{isEdit ? "Edit Subscription" : "New Subscription"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Invoice schedule auto-generates on activation — everything stays editable</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Committed Users" type="number" value={f.committed_users} onChange={set("committed_users")}/>
            <InputField label="Annual Value (₹, excl. GST)" required type="number" value={f.base_annual_value} onChange={set("base_annual_value")} placeholder="330000"/>
            <InputField label="GST %" type="number" value={f.gst_rate} onChange={set("gst_rate")}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <SelectField label="Billing Cycle" value={f.billing_cycle} onChange={set("billing_cycle")}
              options={Object.entries(CYCLE_LABELS).map(([value, label]) => ({ value, label }))}/>
            <InputField label="Term (months)" type="number" value={f.term_months} onChange={set("term_months")}/>
            {!isEdit && <InputField label="Start Date (blank = pending)" type="date" value={f.start_date} onChange={set("start_date")}/>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Order Ref" value={f.order_ref} onChange={set("order_ref")} placeholder="PHX/SAN/SOC/2026-27/001"/>
            <InputField label="Quotation Ref" value={f.quotation_ref} onChange={set("quotation_ref")} placeholder="PHX/SAN/2026-27/001"/>
          </div>
          <div style={{ padding:"12px 14px", background:T.purL, border:`1px solid ${T.purM}`, borderRadius:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.pur, textTransform:"uppercase", letterSpacing:"0.5px" }}>Additional-User Slabs (annual ₹/user beyond committed)</div>
              <Btn variant="outline" color={T.pur} onClick={() => setSlabs(p => [...p, { from_users: "", to_users: "", annual_rate_per_user: "" }])} style={{ padding:"3px 9px", fontSize:11 }}><IcPlus size={11}/> Slab</Btn>
            </div>
            {slabs.map((s, i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 32px", gap:8, marginBottom:6, alignItems:"end" }}>
                <InputField label={i === 0 ? "From user #" : ""} type="number" value={s.from_users} onChange={v => setSlab(i, "from_users", v)}/>
                <InputField label={i === 0 ? "To user # (blank = ∞)" : ""} type="number" value={s.to_users} onChange={v => setSlab(i, "to_users", v)}/>
                <InputField label={i === 0 ? "Annual ₹ / user" : ""} type="number" value={s.annual_rate_per_user} onChange={v => setSlab(i, "annual_rate_per_user", v)}/>
                <button onClick={() => setSlabs(p => p.filter((_, j) => j !== i))} style={{ background:"none", border:"none", cursor:"pointer", color:T.red, display:"flex", paddingBottom:9 }}><IcX size={14}/></button>
              </div>
            ))}
          </div>
          <InputField label="Notes" value={f.notes} onChange={set("notes")} placeholder="e.g. includes 2–3 UI/UX + 2–3 dashboard customizations"/>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : (isEdit ? "Save Changes" : "Create Subscription")}</Btn>
        </div>
      </div>
    </>
  );
}

function InvoiceEditModal({ invoice, onClose, onSaved, setToast }) {
  const [f, setF] = useState({
    invoice_no: invoice.invoice_no || "", period_label: invoice.period_label || "",
    base_amount: invoice.base_amount, addl_users: invoice.addl_users || 0,
    addl_amount: invoice.addl_amount, adjustment: invoice.adjustment || 0,
    gst_rate: invoice.gst_rate, due_date: invoice.due_date ? String(invoice.due_date).slice(0, 10) : "",
    notes: invoice.notes || "",
  });
  const [addlDirty, setAddlDirty] = useState(false); // manual ₹ override vs slab recompute
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const body = { ...f };
    if (!addlDirty) delete body.addl_amount; // let backend recompute from slabs
    const res = await apiFetch(`/saas-admin/client-invoices/${invoice.id}`, { method: "PUT", body });
    setSaving(false);
    if (res.success) { setToast({ msg: "Invoice updated" }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:540, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Edit Invoice</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{invoice.period_label}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Invoice No." value={f.invoice_no} onChange={set("invoice_no")} placeholder="PHX/INV/2026-27/001"/>
            <InputField label="Period Label" value={f.period_label} onChange={set("period_label")}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Base Amount (₹)" type="number" value={f.base_amount} onChange={set("base_amount")}/>
            <InputField label="Addl. Users" type="number" value={f.addl_users} onChange={set("addl_users")}/>
            <InputField label="Addl. Amount (₹)" type="number" value={f.addl_amount} onChange={v => { setAddlDirty(true); set("addl_amount")(v); }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Adjustment ± (₹)" type="number" value={f.adjustment} onChange={set("adjustment")}/>
            <InputField label="GST %" type="number" value={f.gst_rate} onChange={set("gst_rate")}/>
            <InputField label="Due Date" type="date" value={f.due_date} onChange={set("due_date")}/>
          </div>
          <InputField label="Notes" value={f.notes} onChange={set("notes")}/>
          <div style={{ fontSize:11, color:T.t4 }}>Addl. Amount blank chhodne par slabs se auto-calculate hota hai; type karne par manual override.</div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : "Save Invoice"}</Btn>
        </div>
      </div>
    </>
  );
}

// Add a company to an EXISTING client. The client is fixed by context, so
// there is no client picker to get wrong — that ambiguity is exactly what the
// old standalone Companies tab had. For a brand-new paying customer use
// NewCustomerModal, which also creates the client and its contract.
function AddCompanyModal({ client, onClose, onSaved, setToast }) {
  const [f, setF] = useState({ name:"", module_type:"construction_company",
                               admin_name:"", admin_email:"", phone:"", city:"", state:"" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim() || !f.admin_name.trim() || !f.admin_email.trim() || !f.phone.trim())
      return setToast({ msg:"Company naam, admin naam, email aur mobile zaroori hai", type:"error" });
    if (!/^[6-9]\d{9}$/.test(f.phone.trim()))
      return setToast({ msg:"Admin mobile 10-digit hona chahiye — yahi login id hai", type:"error" });
    setSaving(true);
    const res = await apiFetch("/saas-admin/companies", { method:"POST", body: { ...f, client_id: client.id } });
    setSaving(false);
    // Same reason as NewCustomerModal: do NOT refresh the parent yet, or its
    // loading state unmounts this modal before the one-time password is read.
    if (res.success) setDone(res.data);
    else setToast({ msg: res.message || "Company create nahi hui", type:"error" });
  };

  const finish = () => { onSaved(); onClose(); };

  if (done) {
    return (
      <>
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, backdropFilter:"blur(3px)" }}/>
        <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:430, background:T.surface, borderRadius:16, zIndex:501, boxShadow:"0 24px 64px rgba(0,0,0,0.3)", overflow:"hidden" }}>
          <div style={{ padding:"20px 22px", background:"linear-gradient(135deg, #059669, #10B981)", textAlign:"center" }}>
            <div style={{ fontSize:17, fontWeight:800, color:"white" }}>{done.name} ban gayi</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:3 }}>{client.name} ke neeche</div>
          </div>
          <div style={{ padding:"22px" }}>
            <div style={{ background:T.surfaceB, border:`1px solid ${T.b1}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", marginBottom:4 }}>Login Mobile</div>
              <div style={{ fontSize:16, fontWeight:800, color:T.blu, fontFamily:"monospace" }}>{done.credentials.mobile}</div>
              <div style={{ fontSize:10, fontWeight:600, color:T.t4, textTransform:"uppercase", margin:"12px 0 4px" }}>Password</div>
              <div style={{ fontSize:17, fontWeight:800, color:T.t1, fontFamily:"monospace", background:T.ambL, padding:"7px 11px", borderRadius:6, border:`1px solid ${T.ambM}` }}>{done.credentials.password}</div>
              <div style={{ fontSize:10.5, color:T.t4, marginTop:5 }}>Pehli login par badalna padega.</div>
            </div>
            <div style={{ display:"flex", gap:9 }}>
              <Btn variant="outline" style={{ flex:1 }} onClick={() => {
                navigator.clipboard.writeText(`Login Mobile: ${done.credentials.mobile}\nPassword: ${done.credentials.password}`);
                setToast({ msg:"Credentials copied" });
              }}>Copy</Btn>
              <Btn style={{ flex:2 }} onClick={finish}>Done</Btn>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:540, maxHeight:"90vh", overflowY:"auto", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0D1B2A" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>New Company</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{client.name} ke neeche · billing isi client par lagti hai</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Company Name" required value={f.name} onChange={set("name")} placeholder="e.g. Ratna Unit 2"/>
            <SelectField label="Business Type" value={f.module_type} onChange={set("module_type")}
              options={Object.entries(DOMAIN_LABELS).map(([k,v]) => ({ value:k, label:v }))}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <InputField label="Admin Name" required value={f.admin_name} onChange={set("admin_name")} placeholder="Full name"/>
            <InputField label="Admin Email" required value={f.admin_email} onChange={set("admin_email")} placeholder="admin@company.com"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <InputField label="Admin Mobile (login id)" required value={f.phone} onChange={v => set("phone")(v.replace(/\D/g,"").slice(0,10))} placeholder="9876543210"/>
            <InputField label="City" value={f.city} onChange={set("city")} placeholder="Raipur"/>
            <InputField label="State" value={f.state} onChange={set("state")} placeholder="Chhattisgarh"/>
          </div>
          <div style={{ padding:"10px 14px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:8, fontSize:11.5, color:T.amb }}>
            <strong>Admin Mobile hi login id hai.</strong> Password create ke baad ek baar dikhega.
          </div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Creating..." : "Create Company"}</Btn>
        </div>
      </div>
    </>
  );
}

// ── PIN A CUSTOMER TO A BUCKET ────────────────────────────────────────
// The bucket is normally derived. This is for what the data cannot know —
// "they told us they're not renewing" — so a note is the point, not a detail.
function LifecycleModal({ client, onClose, onSaved, setToast }) {
  const [pick, setPick] = useState(client.lifecycle_override || "");
  const [note, setNote] = useState(client.lifecycle_note || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await apiFetch(`/saas-admin/clients/${client.id}/lifecycle`, {
      method:"PUT", body: { override: pick || null, note },
    });
    setSaving(false);
    if (!res.success) return setToast({ msg: res.message || "Save nahi hua", type:"error" });
    setToast({ msg: res.message });
    onSaved(); onClose();
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:440, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.b1}` }}>
          <div style={{ fontSize:14.5, fontWeight:700, color:T.t1 }}>{client.name} — bucket</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>
            Apne aap: <strong>{LIFECYCLE[client.lifecycle_auto]?.label || client.lifecycle_auto}</strong>
          </div>
        </div>

        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={() => setPick("")}
            style={{ textAlign:"left", padding:"10px 13px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
              border:`1.5px solid ${!pick ? T.blu : T.b1}`, background: !pick ? T.bluL : T.surface }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Apne aap tay karo</div>
            <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>
              Data se nikalta rahega — renewal, company, subscription badalne par apne aap sahi rahega.
            </div>
          </button>
          {BUCKET_ORDER.map(b => (
            <button key={b} onClick={() => setPick(b)}
              style={{ textAlign:"left", padding:"10px 13px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                border:`1.5px solid ${pick === b ? LIFECYCLE[b].color : T.b1}`,
                background: pick === b ? LIFECYCLE[b].color + "14" : T.surface }}>
              <div style={{ fontSize:12.5, fontWeight:700, color: pick === b ? LIFECYCLE[b].color : T.t1 }}>{LIFECYCLE[b].label}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{LIFECYCLE[b].blurb}</div>
            </button>
          ))}

          {pick && (
            <div style={{ marginTop:4 }}>
              <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>
                Kyun? (baad me kaam aayega)
              </label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="jaise: renewal se mana kar diya"
                style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:12.5, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
            </div>
          )}
        </div>

        <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.b1}`, display:"flex", justifyContent:"flex-end", gap:9 }}>
          <Btn variant="outline" onClick={onClose} disabled={saving}>Rehne do</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Ruko..." : "Save"}</Btn>
        </div>
      </div>
    </>
  );
}

function ClientDetail({ clientId, onBack, onOpenCompany }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editClient, setEditClient] = useState(false);
  const [showSub, setShowSub] = useState(null);        // "new" | subscription object
  const [activateSub, setActivateSub] = useState(null); // subscription object
  const [activateDate, setActivateDate] = useState("");
  const [editInv, setEditInv] = useState(null);
  const [payInv, setPayInv] = useState(null);
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [allCompanies, setAllCompanies] = useState([]);
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [delCompany, setDelCompany] = useState(null);
  const [showLifecycle, setShowLifecycle] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch(`/saas-admin/clients/${clientId}`).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [clientId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch("/saas-admin/companies").then(res => { if (res.success) setAllCompanies(res.data); }).catch(() => {});
  }, []);

  const act = async (path, body, okMsg) => {
    setBusy(true);
    const res = await apiFetch(path, { method: "POST", body: body || {} });
    setBusy(false);
    if (res.success) { setToast({ msg: okMsg || res.message || "Done" }); load(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
    return res.success;
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading client...</div>;
  if (!data) return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Failed to load.<br/><Btn onClick={onBack} variant="outline" style={{ marginTop:12 }}>← Back</Btn></div>;

  const { client, companies, usage, subscriptions, invoices } = data;
  const currentSub = subscriptions.find(s => ["active", "pending", "suspended"].includes(s.status)) || subscriptions[0] || null;
  const unassigned = allCompanies.filter(c => !companies.some(m => m.id === c.id));

  const toggleSuspend = async () => {
    const next = client.status === "suspended" ? "active" : "suspended";
    if (next === "suspended" && !window.confirm(`Suspend ${client.name}? New companies/users/projects will be blocked immediately.`)) return;
    const res = await apiFetch(`/saas-admin/clients/${client.id}`, { method: "PUT", body: { status: next } });
    if (res.success) { setToast({ msg: next === "suspended" ? "Client suspended" : "Client reactivated" }); load(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };

  const limitCard = (label, used, max) => (
    <div style={{ flex:1, padding:"12px 16px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10 }}>
      <div style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color:limitColor(used, max) }}>{limitStr(used, max)}</div>
      {max > 0 && used >= max && <div style={{ fontSize:10, color:T.red, fontWeight:600, marginTop:2 }}>LIMIT REACHED — creation blocked</div>}
    </div>
  );

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <button onClick={onBack} style={{ padding:"7px 12px", border:`1px solid ${T.b1}`, background:T.surface, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.t2, fontFamily:"inherit" }}>
          <IcChevL size={14}/> Back
        </button>
        <div style={{ width:48, height:48, borderRadius:10, background:client.is_internal ? T.purL : T.bluL, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:20, fontWeight:800, color:client.is_internal ? T.pur : T.blu }}>{(client.name || "?")[0]}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.t1, display:"flex", alignItems:"center", gap:10 }}>
            {client.name}
            {client.is_internal ? <Badge text="INTERNAL" color={T.pur}/> : null}
            <Badge text={client.status === "suspended" ? "SUSPENDED" : "Active"} color={client.status === "suspended" ? T.red : T.grn}/>
          </div>
          <div style={{ fontSize:11, color:T.t4 }}>
            {[client.contact_person, client.phone, client.email, client.gstin && `GSTIN ${client.gstin}`, [client.city, client.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No contact details"}
          </div>
        </div>
        <Btn variant="outline" onClick={() => setEditClient(true)}><IcEdit size={13}/> Edit</Btn>
        <Btn color={client.status === "suspended" ? T.grn : T.red} variant="outline" onClick={toggleSuspend}>
          {client.status === "suspended" ? "Reactivate" : "Suspend"}
        </Btn>
      </div>

      {/* Which bucket, and why. The reason line matters more than the badge:
          without it a customer silently sitting in "Dhyan chahiye" tells you
          nothing about what to actually do. */}
      {client.lifecycle && LIFECYCLE[client.lifecycle] && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"9px 14px",
          background: LIFECYCLE[client.lifecycle].color + "10", border:`1px solid ${LIFECYCLE[client.lifecycle].color}33`, borderRadius:9 }}>
          <Badge text={LIFECYCLE[client.lifecycle].label} color={LIFECYCLE[client.lifecycle].color}/>
          <span style={{ fontSize:11.5, color:T.t2 }}>{client.lifecycle_reason}</span>
          {client.lifecycle_override && (
            <span style={{ fontSize:10, color:T.t4, fontWeight:600 }}>
              (manually set — apne aap: {LIFECYCLE[client.lifecycle_auto]?.label})
            </span>
          )}
          <button onClick={() => setShowLifecycle(true)}
            style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:6, border:`1px solid ${T.b1}`,
              background:T.surface, color:T.t2, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Badlo
          </button>
        </div>
      )}

      {/* Limits vs usage */}
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        {limitCard("Companies", usage.companies, client.max_companies)}
        {limitCard("Users (billable seats)", usage.users, client.max_users)}
        {limitCard("Projects", usage.projects, client.max_projects)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:16, alignItems:"start" }}>
        {/* Companies */}
        <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <span style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Companies ({companies.length})</span>
            {/* Adding a company lives here now — it is a client-scoped action,
                and doing it from here means the client is never ambiguous. */}
            <Btn onClick={() => setShowAddCompany(true)} style={{ padding:"4px 10px", fontSize:11 }}
              disabled={client.max_companies > 0 && companies.length >= client.max_companies}>
              <IcPlus size={11}/> Company
            </Btn>
          </div>
          {client.max_companies > 0 && companies.length >= client.max_companies && (
            <div style={{ padding:"8px 16px", fontSize:11, color:T.red, background:T.redL, borderBottom:`1px solid ${T.b1}` }}>
              Company limit poora ho gaya ({companies.length}/{client.max_companies}) — limit badhao tabhi nayi company banegi.
            </div>
          )}
          {companies.length === 0 && <div style={{ padding:"20px 16px", fontSize:12, color:T.t4 }}>No company linked yet — company banane ke baad yaha assign karo.</div>}
          {companies.map(c => {
            const dl = (obj, fname) => { try { const b = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fname; a.click(); URL.revokeObjectURL(a.href); } catch(_){} };
            const doExport = async (e) => {
              e.stopPropagation();
              const res = await apiFetch(`/saas-admin/companies/${c.id}/export-data`, { method:"POST" });
              if (res.success) { dl(res.data, `${c.slug || c.id}-export.json`); setToast({ msg:`Export downloaded — ${res.data.meta.total_rows} rows` }); }
              else setToast({ msg: res.message || "Export failed", type:"error" });
            };
            return (
            <div key={c.id} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <div style={{ minWidth:0, cursor: onOpenCompany ? "pointer" : "default" }}
                onClick={() => onOpenCompany && onOpenCompany(c)}
                title={onOpenCompany ? "Open company details" : undefined}>
                <div style={{ fontSize:12.5, fontWeight:600, color: onOpenCompany ? T.blu : T.t1 }}>{c.name}</div>
                {/* Modules are per COMPANY, so the summary lives on each company
                    row rather than pretending the client has one entitlement. */}
                <div style={{ fontSize:10.5, color:T.t4 }}>
                  /{c.slug} · {c.user_count} users · {c.project_count} projects
                  {c.modules_total ? ` · ${c.modules_enabled}/${c.modules_total} modules` : ""}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <Badge text={c.is_active ? "Active" : "Inactive"} color={c.is_active ? T.grn : T.red}/>
                <button title="Export all data (recovery file)" onClick={doExport}
                  style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${T.b1}`, background:T.surfaceB, color:T.t3, fontSize:10.5, fontWeight:600, cursor:"pointer" }}>⬇ Export</button>
                <button title="Company hatao — band karo ya hamesha ke liye delete"
                  onClick={e => { e.stopPropagation(); setDelCompany(c); }}
                  style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${T.redM}`, background:T.redL, color:T.red, fontSize:10.5, fontWeight:700, cursor:"pointer" }}>Delete</button>
              </div>
            </div>
            );
          })}
          <div style={{ padding:"12px 16px", display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <SelectField value={assignCompanyId} onChange={setAssignCompanyId} placeholder="Assign existing company..."
                options={unassigned.map(c => ({ value: c.id, label: c.name }))}/>
            </div>
            <Btn variant="outline" disabled={!assignCompanyId || busy} onClick={async () => {
              setBusy(true);
              const res = await apiFetch(`/saas-admin/clients/${client.id}/assign-company`, { method: "PUT", body: { company_id: assignCompanyId } });
              setBusy(false);
              if (res.success) { setToast({ msg: res.message }); setAssignCompanyId(""); load(); }
              else setToast({ msg: res.message || "Failed", type: "error" });
            }}>Assign</Btn>
          </div>
        </div>

        {/* Subscription + invoices */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Subscription</div>
              <div style={{ display:"flex", gap:8 }}>
                {currentSub && <Btn variant="outline" onClick={() => setShowSub(currentSub)} style={{ padding:"5px 10px", fontSize:11.5 }}><IcEdit size={12}/> Edit</Btn>}
                {!currentSub && <Btn onClick={() => setShowSub("new")} style={{ padding:"5px 10px", fontSize:11.5 }}><IcPlus size={12}/> New Subscription</Btn>}
              </div>
            </div>
            {!currentSub ? (
              <div style={{ padding:"20px 16px", fontSize:12, color:T.t4 }}>No subscription yet.</div>
            ) : (
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <Badge text={currentSub.status.toUpperCase()} color={SUB_COLORS[currentSub.status] || T.slt}/>
                  <span style={{ fontSize:12, color:T.t3 }}>{CYCLE_LABELS[currentSub.billing_cycle]} · {currentSub.term_months} months{currentSub.order_ref ? ` · ${currentSub.order_ref}` : ""}</span>
                  {currentSub.status === "pending" && (
                    <Btn color={T.grn} onClick={() => { setActivateSub(currentSub); setActivateDate(new Date().toISOString().slice(0, 10)); }} style={{ padding:"5px 12px", fontSize:11.5, marginLeft:"auto" }}>Activate →</Btn>
                  )}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Annual Value</div><div style={{ fontSize:15, fontWeight:800, color:T.t1 }}>{fmtAmt(currentSub.base_annual_value)}</div><div style={{ fontSize:10, color:T.t4 }}>+ GST {parseFloat(currentSub.gst_rate)}%</div></div>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Committed Users</div><div style={{ fontSize:15, fontWeight:800, color:T.t1 }}>{currentSub.committed_users}</div></div>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>Start</div><div style={{ fontSize:13, fontWeight:700, color:T.t2 }}>{fmtDate(currentSub.start_date)}</div></div>
                  <div><div style={{ fontSize:10, color:T.t4, textTransform:"uppercase", fontWeight:600 }}>End</div><div style={{ fontSize:13, fontWeight:700, color:T.t2 }}>{fmtDate(currentSub.end_date)}</div></div>
                </div>
                {currentSub.slabs?.length > 0 && (
                  <div style={{ marginTop:10, fontSize:11, color:T.t3 }}>
                    Slabs: {currentSub.slabs.map(s => `${s.from_users}–${s.to_users || "∞"} @ ${fmtAmt(s.annual_rate_per_user)}/user`).join(" · ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Invoices ({invoices.filter(i => i.status !== "cancelled").length})</div>
              {currentSub && (
                <Btn variant="outline" onClick={async () => {
                  const label = window.prompt("Invoice label (e.g. 'Pro-rata 5 users Aug–Oct')");
                  if (label === null) return;
                  const amt = window.prompt("Base amount ₹ (excl. GST)", "0");
                  if (amt === null) return;
                  await act(`/saas-admin/client-subscriptions/${currentSub.id}/invoices`, { period_label: label || "Manual invoice", base_amount: parseFloat(amt) || 0 }, "Manual invoice added");
                }} style={{ padding:"5px 10px", fontSize:11.5 }}><IcPlus size={12}/> Manual Invoice</Btn>
              )}
            </div>
            {invoices.length === 0 ? (
              <div style={{ padding:"20px 16px", fontSize:12, color:T.t4 }}>Koi invoice nahi — subscription activate hone par schedule auto-ban jayega.</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:T.surfaceB }}>
                    {["Period", "Base", "Addl.", "GST", "Total", "Status", "Due", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderTop:`1px solid ${T.b1}`, opacity: inv.status === "cancelled" ? 0.45 : 1 }}>
                        <td style={td}>
                          <div style={{ fontWeight:600, color:T.t1 }}>{inv.period_label}</div>
                          {inv.invoice_no && <div style={{ fontSize:10, color:T.t4 }}>{inv.invoice_no}</div>}
                        </td>
                        <td style={td}>{fmtAmt(inv.base_amount)}</td>
                        <td style={td}>{inv.addl_users > 0 ? `${inv.addl_users}u · ${fmtAmt(inv.addl_amount)}` : "--"}{parseFloat(inv.adjustment) ? <div style={{ fontSize:10, color:T.amb }}>adj {fmtAmt(inv.adjustment)}</div> : null}</td>
                        <td style={td}>{fmtAmt(inv.gst_amount)}</td>
                        <td style={{ ...td, fontWeight:700, color:T.t1 }}>{fmtAmt(inv.total_amount)}</td>
                        <td style={td}>
                          <Badge text={inv.is_overdue ? "OVERDUE" : inv.status.toUpperCase()} color={inv.is_overdue ? T.red : (INV_COLORS[inv.status] || T.slt)}/>
                          {inv.status === "paid" && inv.paid_at && <div style={{ fontSize:10, color:T.t4, marginTop:2 }}>{fmtDate(inv.paid_at)}{inv.payment_ref ? ` · ${inv.payment_ref}` : ""}</div>}
                        </td>
                        <td style={td}>{fmtDate(inv.due_date)}</td>
                        <td style={td}>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {inv.status === "scheduled" && <Btn variant="outline" onClick={() => act(`/saas-admin/client-invoices/${inv.id}/issue`, {}, "Invoice issued")} style={{ padding:"3px 8px", fontSize:10.5 }}>Issue</Btn>}
                            {["scheduled", "issued"].includes(inv.status) && <Btn color={T.grn} onClick={() => { setPayInv(inv); setPayRef(""); setPayDate(new Date().toISOString().slice(0, 10)); }} style={{ padding:"3px 8px", fontSize:10.5 }}>Mark Paid</Btn>}
                            {["scheduled", "issued"].includes(inv.status) && <Btn variant="outline" onClick={() => setEditInv(inv)} style={{ padding:"3px 8px", fontSize:10.5 }}><IcEdit size={10}/></Btn>}
                            {["scheduled", "issued"].includes(inv.status) && <Btn variant="outline" color={T.red} onClick={() => window.confirm("Cancel this invoice?") && act(`/saas-admin/client-invoices/${inv.id}/cancel`, {}, "Invoice cancelled")} style={{ padding:"3px 8px", fontSize:10.5 }}><IcX size={10}/></Btn>}
                            {inv.status === "paid" && <Btn variant="outline" color={T.amb} onClick={() => window.confirm("Revert this payment?") && act(`/saas-admin/client-invoices/${inv.id}/revert-paid`, {}, "Payment reverted")} style={{ padding:"3px 8px", fontSize:10.5 }}>Revert</Btn>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editClient && <ClientFormModal initial={client} onClose={() => setEditClient(false)} onSaved={load} setToast={setToast}/>}
      {showAddCompany && <AddCompanyModal client={client} onClose={() => setShowAddCompany(false)} onSaved={load} setToast={setToast}/>}
      {delCompany && <DeleteCompanyModal company={delCompany} onClose={() => setDelCompany(null)} onDone={load} setToast={setToast}/>}
      {showLifecycle && <LifecycleModal client={client} onClose={() => setShowLifecycle(false)} onSaved={load} setToast={setToast}/>}
      {showSub && <SubscriptionFormModal clientId={client.id} initial={showSub === "new" ? null : showSub} onClose={() => setShowSub(null)} onSaved={load} setToast={setToast}/>}
      {activateSub && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:420, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, background:"#0D1B2A" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Activate Subscription</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Start date se {activateSub.term_months}-month term + invoice schedule generate hoga</div>
            </div>
            <div style={{ padding:"20px 22px" }}>
              <InputField label="Subscription Start Date" type="date" required value={activateDate} onChange={setActivateDate}/>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setActivateSub(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn color={T.grn} disabled={!activateDate || busy} onClick={async () => {
                const ok = await act(`/saas-admin/client-subscriptions/${activateSub.id}/activate`, { start_date: activateDate });
                if (ok) setActivateSub(null);
              }} style={{ flex:2 }}>{busy ? "Activating..." : "Activate & Generate Invoices"}</Btn>
            </div>
          </div>
        </>
      )}
      {payInv && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400, backdropFilter:"blur(2px)" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:420, background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}`, background:"#0D1B2A" }}>
              <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Record Payment</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{payInv.period_label} · {fmtAmt(payInv.total_amount)}</div>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:13 }}>
              <InputField label="Payment Date" type="date" value={payDate} onChange={setPayDate}/>
              <InputField label="Payment Reference (UTR / cheque no.)" value={payRef} onChange={setPayRef} placeholder="Optional"/>
            </div>
            <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB }}>
              <Btn onClick={() => setPayInv(null)} variant="outline" style={{ flex:1 }}>Cancel</Btn>
              <Btn color={T.grn} disabled={busy} onClick={async () => {
                const ok = await act(`/saas-admin/client-invoices/${payInv.id}/mark-paid`, { payment_ref: payRef, paid_date: payDate }, "Payment recorded");
                if (ok) setPayInv(null);
              }} style={{ flex:2 }}>{busy ? "Saving..." : "Record Payment"}</Btn>
            </div>
          </div>
        </>
      )}
      {editInv && <InvoiceEditModal invoice={editInv} onClose={() => setEditInv(null)} onSaved={load} setToast={setToast}/>}
    </div>
  );
}

// ── CUSTOMERS — the merged Clients + Companies surface ────────────────
// Was two tabs that showed the same tenants from two angles and never agreed.
// Now one list: paying client on top, its companies nested underneath.
function TabCustomers({ onOpenCompany }) {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/saas-admin/clients"),
      apiFetch("/saas-admin/billing/overview"),
      // Companies are shown nested under their client, so this tab owns both
      // levels now — the separate Companies tab is gone.
      apiFetch("/saas-admin/companies"),
    ]).then(([r1, r2, r3]) => {
      if (r1.success) setClients(r1.data);
      if (r2.success) setOverview(r2.data);
      if (r3.success) setCompanies(r3.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (selId) return <ClientDetail clientId={selId} onBack={() => { setSelId(null); load(); }} onOpenCompany={onOpenCompany}/>;
  if (loading) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading customers...</div>;

  const kpi = overview?.kpi || {};
  const overdueInvoices = (overview?.upcoming || []).filter(i => i.is_overdue);
  // Live customers with no usable subscription — they work fine but are billed
  // for nothing. Backend derives the flag (saas-clients.js GET /clients).
  const billingGaps = clients.filter(c => c.billing_gap);

  // Companies grouped under their owning client.
  const byClient = {};
  for (const co of companies) {
    if (co.client_id == null) continue;
    (byClient[co.client_id] = byClient[co.client_id] || []).push(co);
  }

  const q = search.trim().toLowerCase();
  const matched = clients
    .filter(c => showInternal || !c.is_internal)
    .filter(c => !q
      || c.name.toLowerCase().includes(q)
      || (byClient[c.id] || []).some(co =>
           co.name.toLowerCase().includes(q) || (co.slug || "").toLowerCase().includes(q)));

  // Counts reflect what the current search would show, so the chips never
  // promise rows that a live search filter has already removed.
  const counts = BUCKET_ORDER.reduce((a, b) => ({ ...a, [b]: matched.filter(c => c.lifecycle === b).length }), {});
  // "All" deliberately leaves out archived — filing a customer away is the one
  // deliberate act that should get it out of the way. Everything else stays.
  counts.all = matched.filter(c => c.lifecycle !== "archived").length;

  const visible = bucket === "all"
    ? matched.filter(c => c.lifecycle !== "archived")
    : matched.filter(c => c.lifecycle === bucket);

  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Customers" sub="Paying clients, unki companies, limits aur billing — sab ek jagah"
        right={<>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:T.t3, cursor:"pointer" }}>
            <input type="checkbox" checked={showInternal} onChange={e => setShowInternal(e.target.checked)}/> Internal bhi dikhao
          </label>
          <Btn variant="outline" onClick={async () => {
            const cfg = await apiFetch("/saas-admin/lifecycle-config");
            const cur = cfg.success ? cfg.data : { grace_days:7, retention_days:90 };
            const g = await window.promptAsync(`Grace period — subscription expire hone ke baad kitne din tak full access rahe (phir login block). Abhi: ${cur.grace_days} din`);
            if (g === null) return;
            const r = await window.promptAsync(`Retention window — suspend hone ke baad kitne din data rakhein (phir purge-eligible). Abhi: ${cur.retention_days} din`);
            if (r === null) return;
            const res = await apiFetch("/saas-admin/lifecycle-config", { method:"PUT", body:{ grace_days: parseInt(g, 10), retention_days: parseInt(r, 10) } });
            setToast({ msg: res.success ? res.message : (res.message || "Failed"), type: res.success ? undefined : "error" });
          }}>⚙ Lifecycle</Btn>
          <Btn variant="outline" onClick={load}><IcRefresh size={13}/></Btn>
          {/* "New Client" makes a client with no contract and no company — kept as
              an escape hatch, but New Customer is the path that can't leave gaps. */}
          <Btn variant="outline" onClick={() => setShowNew(true)}>New Client only</Btn>
          <Btn onClick={() => setShowNewCustomer(true)}><IcPlus size={14}/> New Customer</Btn>
        </>}/>

      {/* Billing KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:16 }}>
        <StatCard label="Active Subscriptions" value={fmtNum(kpi.active_subs)} sub={`${fmtNum(kpi.pending_subs)} pending activation`} color={T.grn} Icon={IcDollar}/>
        <StatCard label="Annual Contract Value" value={"₹" + fmtMoney(kpi.active_acv)} sub="active subs, excl. GST" color={T.blu} Icon={IcTrend}/>
        <StatCard label="Collected" value={"₹" + fmtMoney(kpi.collected)} sub="all-time, incl. GST" color={T.cyn} Icon={IcChk}/>
        <StatCard label="Outstanding" value={"₹" + fmtMoney(kpi.outstanding)} sub={kpi.overdue_count > 0 ? `${kpi.overdue_count} overdue · ₹${fmtMoney(kpi.overdue_amount)}` : "nothing overdue"} color={kpi.overdue_count > 0 ? T.red : T.amb} Icon={IcActivity}/>
      </div>

      {/* Billing-gap strip — customer live but nothing to bill against.
          Deliberately ABOVE the overdue strip: an unbilled customer is worse
          than a late-paying one (we aren't even asking them for money). */}
      {billingGaps.length > 0 && (
        <div style={{ padding:"12px 16px", background:T.ambL, border:`1px solid ${T.ambM}`, borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.amb, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            <IcActivity size={13} color={T.amb}/> BILLING GAP — {billingGaps.length} customer{billingGaps.length > 1 ? "s" : ""} chalu {billingGaps.length > 1 ? "hain" : "hai"} par bill nahi ho {billingGaps.length > 1 ? "rahe" : "raha"}
          </div>
          {billingGaps.map(c => (
            <div key={c.id} onClick={() => setSelId(c.id)}
              style={{ fontSize:12, color:T.t2, padding:"3px 0", cursor:"pointer" }}>
              <strong>{c.name}</strong> · {c.company_count} {c.company_count > 1 ? "companies" : "company"} · {c.user_count} users · <span style={{ color:T.amb, fontWeight:600 }}>{c.billing_gap_reason}</span> — subscription banao
            </div>
          ))}
        </div>
      )}

      {/* Overdue strip */}
      {overdueInvoices.length > 0 && (
        <div style={{ padding:"12px 16px", background:T.redL, border:`1px solid ${T.redM}`, borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.red, marginBottom:6 }}>⚠ OVERDUE — follow up needed</div>
          {overdueInvoices.slice(0, 5).map(i => (
            <div key={i.id} style={{ fontSize:12, color:T.t2, padding:"3px 0" }}>
              <strong>{i.client_name}</strong> · {i.period_label} · {fmtAmt(i.total_amount)} · due {fmtDate(i.due_date)}
            </div>
          ))}
        </div>
      )}

      {/* Search + bucket chips, same chip pattern the Companies tab uses */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or company..."
            style={{ width:280, padding:"7px 12px 7px 30px", borderRadius:8, border:`1px solid ${T.b1}`, fontSize:12, color:T.t1, background:T.surface, outline:"none", fontFamily:"inherit" }}/>
          <IcSearch size={12} color={T.t4} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["all", ...BUCKET_ORDER].map(b => {
            const on = bucket === b;
            const meta = LIFECYCLE[b];
            const col = on ? (meta ? meta.color : T.blu) : T.t3;
            return (
              <button key={b} onClick={() => setBucket(b)}
                title={meta ? meta.blurb : "archived ke alawa sab"}
                style={{ padding:"5px 11px", borderRadius:7, fontSize:11.5, fontWeight:on ? 700 : 600, cursor:"pointer",
                  fontFamily:"inherit", color:col, background: on ? col + "18" : T.surface,
                  border:`1px solid ${on ? col + "55" : T.b1}` }}>
                {meta ? meta.label : "All"} <span style={{ opacity:0.65 }}>{counts[b] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize:11.5, color:T.t4 }}>{visible.length} customers · {visible.reduce((n, c) => n + (byClient[c.id]?.length || 0), 0)} companies</div>
      </div>

      {/* ── Customers: ONE row shape, all of it client-level ────────────────
          Companies used to be nested inside this table, which meant company
          rows rendering into a grid built for clients — three columns blank and
          two carrying the wrong thing ("Registered <date>" under Subscription).
          Companies now have their own tab; here a client shows only what it
          bought and whether it is inside it. Depth is one click away, on the
          client page. */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
        <TableHeader gridCols="2.2fr 1fr 1fr 1fr 1.6fr 1fr" columns={["Customer", "Companies", "Users", "Projects", "Subscription", "Next Due"]}/>
        {visible.length === 0 && <EmptyState Icon={IcUsers} text="Koi customer nahi — New Customer se shuru karo"/>}
        {visible.map(c => (
          <div key={c.id} onClick={() => setSelId(c.id)}
            style={{ display:"grid", gridTemplateColumns:"2.2fr 1fr 1fr 1fr 1.6fr 1fr", padding:"12px 16px", borderTop:`1px solid ${T.b1}`, cursor:"pointer", alignItems:"center", background: c.status === "suspended" ? T.redL : "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = c.status === "suspended" ? T.redL : T.surfaceB}
            onMouseLeave={e => e.currentTarget.style.background = c.status === "suspended" ? T.redL : "transparent"}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {c.name}
                {c.is_internal ? <Badge text="INT" color={T.pur}/> : null}
                {c.status === "suspended" && <Badge text="SUSPENDED" color={T.red}/>}
                {/* Only the exceptional buckets get a badge. Stamping "Active"
                    on every healthy customer is noise, and the chips already
                    say which bucket you are looking at. The old NO BILLING
                    badge is gone — "Dhyan chahiye" plus the reason line below
                    says the same thing and says why. */}
                {c.lifecycle && c.lifecycle !== "active" && LIFECYCLE[c.lifecycle] && (
                  <Badge text={LIFECYCLE[c.lifecycle].label} color={LIFECYCLE[c.lifecycle].color}/>
                )}
                {c.lifecycle_override && (
                  <span title={`Manually set${c.lifecycle_note ? " — " + c.lifecycle_note : ""}`} style={{ display:"flex" }}>
                    <IcEdit size={10} color={T.t4}/>
                  </span>
                )}
              </div>
              <div style={{ fontSize:10.5, color:T.t4 }}>
                {c.lifecycle && c.lifecycle !== "active"
                  ? c.lifecycle_reason
                  : ([c.city, c.state].filter(Boolean).join(", ") || "--")}
              </div>
            </div>
            {/* used / licensed — limitColor goes amber at 80%, red at the cap */}
            <div style={{ fontSize:12.5, fontWeight:700, color:limitColor(c.company_count, c.max_companies) }}>{limitStr(c.company_count, c.max_companies)}</div>
            <div style={{ fontSize:12.5, fontWeight:700, color:limitColor(c.user_count, c.max_users) }}>{limitStr(c.user_count, c.max_users)}</div>
            <div style={{ fontSize:12.5, fontWeight:700, color:limitColor(c.project_count, c.max_projects) }}>{limitStr(c.project_count, c.max_projects)}</div>
            <div>
              {c.sub_status
                ? <>
                    <Badge text={c.sub_status.toUpperCase()} color={SUB_COLORS[c.sub_status] || T.slt}/>
                    {/* the whole billing period, not just when it runs out */}
                    {(c.sub_start || c.sub_end) && (
                      <div style={{ fontSize:10, color:T.t4, marginTop:3 }}>
                        {c.sub_start ? fmtDate(c.sub_start) : "?"} → {c.sub_end ? fmtDate(c.sub_end) : "open-ended"}
                      </div>
                    )}
                  </>
                : <span style={{ fontSize:11, color:T.t4 }}>--</span>}
              {/* access_state, not lifecycle. c.lifecycle is the commercial
                  bucket (a string); this is the can-they-log-in state (an
                  object). They used to share the key, so whichever the backend
                  assigned last won and the other silently rendered nothing. */}
              {c.access_state && c.access_state.state === "grace" && <div style={{ marginTop:3 }}><Badge text={`GRACE · ${c.access_state.graceDaysLeft}d`} color={T.amb}/></div>}
              {c.access_state && c.access_state.state === "suspended" && <div style={{ marginTop:3 }}><Badge text={c.access_state.archived ? "SUSPENDED · PURGE-ELIGIBLE" : "SUSPENDED"} color={T.red}/></div>}
            </div>
            <div style={{ fontSize:11.5, color: c.overdue_count > 0 ? T.red : T.t3, fontWeight: c.overdue_count > 0 ? 700 : 400 }}>
              {c.overdue_count > 0 ? `${c.overdue_count} OVERDUE` : (c.next_due ? fmtDate(c.next_due) : "--")}
            </div>
          </div>
        ))}
      </div>

      {showNew && <ClientFormModal onClose={() => setShowNew(false)} onSaved={load} setToast={setToast}/>}
      {showNewCustomer && <NewCustomerModal onClose={() => setShowNewCustomer(false)} onCreated={load} setToast={setToast}/>}
    </div>
  );
}

export default TabCustomers;
