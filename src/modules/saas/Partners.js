// Partners: who brings clients and who bills them, and the commission /
// settlement ledger that follows every client payment. Blackbox (the owner)
// is a row here too — its name, GSTIN and bank print on bills it issues.
// Lines are created by the server when a client's bill is marked paid; this
// screen settles them ("Phynaxon ko diya" / "Phynaxon se liya").
import { useState, useEffect, useCallback } from "react";
import { apiFetch, API, tok, T, fmtDate, fmtMoney, IcPlus, IcEdit, IcX, IcChevL, IcDownload, IcUsers } from "./tokens";
import { Toast, StatCard, Badge, Btn, InputField, SelectField, PageHeader } from "./ui";
import { todayISO } from "../../utils/today";

const fmtRs = n => "₹" + (parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const COMM_TYPES = [
  { value: "none",      label: "Koi nahi" },
  { value: "recurring", label: "Har bill par" },
  { value: "one_time",  label: "Sirf pehle bill par" },
];
const commText = (type, mode, value) => !type || type === "none" || !parseFloat(value) ? "Koi commission nahi"
  : `${mode === "fixed" ? fmtRs(value) : `${parseFloat(value)}%`} ${type === "one_time" ? "sirf pehle bill par" : "har bill par"}`;

// Server PDF → new tab (needs the auth header, so not a plain link).
async function openPdf(path, setToast) {
  try {
    const res = await fetch(API + path, { headers: { Authorization: "Bearer " + tok() } });
    if (!(res.headers.get("content-type") || "").includes("pdf")) {
      const j = await res.json().catch(() => ({}));
      return setToast({ msg: j.message || "PDF nahi bani", type: "error" });
    }
    const url = URL.createObjectURL(await res.blob());
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    setToast({ msg: "PDF nahi bani — " + e.message, type: "error" });
  }
}

function PartnerFormModal({ initial, onClose, onSaved, setToast }) {
  const [f, setF] = useState({
    name: "", contact_person: "", phone: "", email: "", gstin: "", pan: "", address: "", city: "", state: "",
    bank_name: "", bank_account: "", bank_ifsc: "", upi_id: "", invoice_prefix: "",
    default_commission_type: "none", default_commission_mode: "percent", default_commission_value: 0, notes: "",
    ...(initial || {}),
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    const body = { ...f };
    delete body.id; delete body.is_owner; delete body.created_at; delete body.updated_at;
    const res = await apiFetch(initial?.id ? `/saas-admin/partners/${initial.id}` : "/saas-admin/partners",
      { method: initial?.id ? "PUT" : "POST", body });
    setSaving(false);
    if (res.success) { setToast({ msg: res.message }); onSaved(); onClose(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
  };
  const sec = (t) => <div style={{ fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:4 }}>{t}</div>;
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:400 }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:640, maxWidth:"calc(100vw - 32px)", maxHeight:"92vh", display:"flex", flexDirection:"column", background:T.surface, borderRadius:16, zIndex:401, boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 22px", background:"#0D1B2A", borderRadius:"16px 16px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{initial?.id ? `Edit — ${initial.name}` : "Naya Partner"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Bill par isi ka naam, GSTIN, pata aur bank chhapta hai (jab ye bill karta hai)</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}><IcX size={16}/></button>
        </div>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:11, overflowY:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:10 }}>
            <InputField label="Naam" required value={f.name} onChange={set("name")}/>
            <InputField label="Contact person" value={f.contact_person || ""} onChange={set("contact_person")}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
            <InputField label="Phone" value={f.phone || ""} onChange={set("phone")}/>
            <InputField label="Email" value={f.email || ""} onChange={set("email")}/>
            <InputField label="GSTIN" value={f.gstin || ""} onChange={set("gstin")}/>
            <InputField label="PAN" value={f.pan || ""} onChange={set("pan")}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 }}>
            <InputField label="Pata" value={f.address || ""} onChange={set("address")}/>
            <InputField label="City" value={f.city || ""} onChange={set("city")}/>
            <InputField label="State" value={f.state || ""} onChange={set("state")}/>
          </div>
          {sec("Bank (bill / statement par 'Payment to')")}
          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr", gap:10 }}>
            <InputField label="Bank" value={f.bank_name || ""} onChange={set("bank_name")}/>
            <InputField label="A/c no." value={f.bank_account || ""} onChange={set("bank_account")}/>
            <InputField label="IFSC" value={f.bank_ifsc || ""} onChange={set("bank_ifsc")}/>
            <InputField label="UPI" value={f.upi_id || ""} onChange={set("upi_id")}/>
          </div>
          {!initial?.is_owner && (
            <>
              {sec("Default commission (nayi deal me pehle se bhar jata hai)")}
              <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr", gap:10 }}>
                <SelectField label="Kab" value={f.default_commission_type} onChange={set("default_commission_type")} options={COMM_TYPES}/>
                <SelectField label="Kaise" value={f.default_commission_mode} onChange={set("default_commission_mode")}
                  options={[{ value:"percent", label:"% of bill" }, { value:"fixed", label:"Fixed ₹" }]}/>
                <InputField label={f.default_commission_mode === "fixed" ? "₹" : "%"} type="number" value={f.default_commission_value} onChange={set("default_commission_value")}/>
                <InputField label="Bill no. prefix" value={f.invoice_prefix || ""} onChange={set("invoice_prefix")} placeholder="PHX/INV/"/>
              </div>
            </>
          )}
          <InputField label="Note" value={f.notes || ""} onChange={set("notes")}/>
        </div>
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:9, background:T.surfaceB, borderRadius:"0 0 16px 16px" }}>
          <Btn onClick={onClose} variant="outline" style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={save} disabled={saving} style={{ flex:2 }}>{saving ? "Saving..." : "Save"}</Btn>
        </div>
      </div>
    </>
  );
}

function PartnerDetail({ partnerId, onBack, setToast }) {
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState({});
  const [settleDate, setSettleDate] = useState(todayISO());
  const [settleRef, setSettleRef] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch(`/saas-admin/partners/${partnerId}`).then(res => { setData(res.success ? res.data : false); setSel({}); });
  }, [partnerId]);
  useEffect(() => { load(); }, [load]);

  const post = async (path, body, okMsg) => {
    setBusy(true);
    const res = await apiFetch(path, { method: "POST", body: body || {} });
    setBusy(false);
    if (res.success) { setToast({ msg: res.message || okMsg }); load(); }
    else setToast({ msg: res.message || "Failed", type: "error" });
    return res.success;
  };

  if (data === null) return <div style={{ padding:60, textAlign:"center", color:T.t3, fontSize:13 }}>Loading...</div>;
  if (!data) return <div style={{ padding:60, textAlign:"center", color:T.red, fontSize:13 }}>Load nahi hua. <Btn variant="outline" onClick={onBack}>← Back</Btn></div>;

  const { partner: p, deals, lines } = data;
  const due = lines.filter(l => l.status === "due");
  const payDue = due.filter(l => l.direction === "pay_partner");
  const colDue = due.filter(l => l.direction === "collect_from_partner");
  const total = (arr) => arr.reduce((a, l) => a + (parseFloat(l.settle_amount) || 0), 0);
  const picked = due.filter(l => sel[l.id]);
  const pickedNet = picked.reduce((a, l) => a + (l.direction === "collect_from_partner" ? 1 : -1) * (parseFloat(l.settle_amount) || 0), 0);

  return (
    <div style={{ padding:"18px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <button onClick={onBack} style={{ padding:"7px 12px", border:`1px solid ${T.b1}`, background:T.surface, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.t2, fontFamily:"inherit" }}>
          <IcChevL size={14}/> Back
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.t1, display:"flex", alignItems:"center", gap:10 }}>
            {p.name} {p.is_owner ? <Badge text="OWNER" color={T.pur}/> : null}
          </div>
          <div style={{ fontSize:11, color:T.t4 }}>
            {[p.contact_person, p.phone, p.email, p.gstin && `GSTIN ${p.gstin}`, p.bank_account && `A/c ${p.bank_account}`].filter(Boolean).join(" · ") || "Details nahi bhari — Edit se bharo (bill par chhapti hain)"}
          </div>
        </div>
        {!p.is_owner && <Btn variant="outline" onClick={() => openPdf(`/saas-admin/partners/${p.id}/statement.pdf`, setToast)}><IcDownload size={13}/> Statement PDF</Btn>}
        <Btn variant="outline" onClick={() => setEdit(true)}><IcEdit size={13}/> Edit</Btn>
      </div>

      {!p.is_owner && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
          <StatCard label={`${p.name} se lena`} value={fmtRs(total(colDue))} sub={`${colDue.length} line · bill ${p.name} ne liya, Blackbox ka hissa`} color={T.grn} Icon={IcUsers}/>
          <StatCard label={`${p.name} ko dena`} value={fmtRs(total(payDue))} sub={`${payDue.length} line · commission`} color={T.amb} Icon={IcUsers}/>
          <StatCard label="Default commission" value={commText(p.default_commission_type, p.default_commission_mode, p.default_commission_value)} sub="nayi deal me pehle se" color={T.blu} Icon={IcUsers}/>
        </div>
      )}

      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, fontSize:12.5, fontWeight:700, color:T.t1 }}>Deals ({deals.length})</div>
        {deals.length === 0 && <div style={{ padding:"16px", fontSize:12, color:T.t4 }}>Abhi koi contract is partner se juda nahi — Customers → client → Subscription → Deal.</div>}
        {deals.map(d => (
          <div key={d.id} style={{ padding:"10px 16px", borderBottom:`1px solid ${T.b1}`, display:"flex", gap:14, alignItems:"center", fontSize:12 }}>
            <div style={{ flex:1, fontWeight:600, color:T.t1 }}>{d.client_name}</div>
            <div style={{ color:T.t3 }}>{Number(d.sourced_by_partner_id) === p.id ? "Laya" : ""}{Number(d.sourced_by_partner_id) === p.id && Number(d.billed_by_partner_id) === p.id ? " + " : ""}{Number(d.billed_by_partner_id) === p.id ? "Bill karta hai" : ""}</div>
            <div style={{ color:T.t2 }}>{Number(d.sourced_by_partner_id) === p.id ? commText(d.commission_type, d.commission_mode, d.commission_value) : "—"}</div>
            <div style={{ color:T.t4 }}>{fmtDate(d.start_date)} – {fmtDate(d.end_date)}</div>
            <Badge text={d.status} color={d.status === "active" ? T.grn : T.slt}/>
          </div>
        ))}
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}` }}>
          <div style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>Len-den lines ({lines.length})</div>
          <div style={{ fontSize:10.5, color:T.t4 }}>Client ka bill paid hote hi line banti hai · rakam GST chhod kar · tick karke settle karo</div>
        </div>
        {lines.length === 0 && <div style={{ padding:"16px", fontSize:12, color:T.t4 }}>Abhi koi line nahi.</div>}
        {lines.length > 0 && (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:T.surfaceB }}>
                {["", "Client paid", "Client / bill", "Bill (GST se pehle)", "Commission", "Kis taraf", "Rakam", "Status", ""].map((h, i) =>
                  <th key={i} style={{ padding:"9px 12px", textAlign:"left", fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {lines.map(l => {
                  const off = l.status === "cancelled";
                  return (
                    <tr key={l.id} style={{ borderTop:`1px solid ${T.b1}`, opacity: off ? 0.45 : 1, background: l.needs_review ? T.redL : "transparent" }}>
                      <td style={{ padding:"9px 12px" }}>{l.status === "due" && <input type="checkbox" checked={!!sel[l.id]} onChange={e => setSel(s => ({ ...s, [l.id]: e.target.checked }))}/>}</td>
                      <td style={{ padding:"9px 12px", color:T.t2 }}>{fmtDate(l.paid_at)}</td>
                      <td style={{ padding:"9px 12px" }}><div style={{ fontWeight:600, color:T.t1 }}>{l.client_name}</div><div style={{ fontSize:10.5, color:T.t4 }}>{l.period_label}{l.invoice_no ? ` · ${l.invoice_no}` : ""}</div></td>
                      <td style={{ padding:"9px 12px" }}>{fmtRs(l.invoice_net)}</td>
                      <td style={{ padding:"9px 12px" }}>{parseFloat(l.commission_amount) ? <>{fmtRs(l.commission_amount)}<div style={{ fontSize:10.5, color:T.t4 }}>{commText(l.commission_type, l.commission_mode, l.commission_value)}</div></> : "—"}</td>
                      <td style={{ padding:"9px 12px", color:T.t2 }}>{l.direction === "pay_partner" ? `${p.name} ko dena` : `${p.name} se lena`}</td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:T.t1 }}>{fmtRs(l.settle_amount)}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <Badge text={l.status === "due" ? "BAAKI" : l.status === "settled" ? "SETTLED" : "CANCEL"} color={l.status === "due" ? T.amb : l.status === "settled" ? T.grn : T.slt}/>
                        {l.status === "settled" && <div style={{ fontSize:10, color:T.t4, marginTop:2 }}>{fmtDate(l.settled_at)}{l.settle_ref ? ` · ${l.settle_ref}` : ""}</div>}
                        {l.cancel_reason && <div style={{ fontSize:10, color:T.t4, marginTop:2 }}>{l.cancel_reason}</div>}
                        {l.needs_review ? <div style={{ fontSize:10, color:T.red, marginTop:2, maxWidth:220 }}>{l.review_note}</div> : null}
                      </td>
                      <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                        {l.needs_review ? <Btn variant="outline" color={T.red} disabled={busy} style={{ padding:"3px 8px", fontSize:10.5 }} onClick={() => {
                          const note = window.prompt("Partner ke saath kya tay hua? (nishaan hatega)");
                          if (note !== null) post(`/saas-admin/partner-lines/${l.id}/clear-review`, { note });
                        }}>Theek kiya</Btn> : null}
                        {l.status === "settled" && !l.needs_review && <Btn variant="outline" color={T.amb} disabled={busy} style={{ padding:"3px 8px", fontSize:10.5 }}
                          onClick={() => window.confirm("Ye line wapas 'baaki' me karni hai?") && post(`/saas-admin/partner-lines/${l.id}/unsettle`)}>Wapas</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {picked.length > 0 && (
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", alignItems:"flex-end", gap:10, flexWrap:"wrap" }}>
            <div style={{ fontSize:12, color:T.t2, flex:1, minWidth:220, paddingBottom:9 }}>
              {picked.length} line chuni · {pickedNet >= 0 ? `${p.name} se lena` : `${p.name} ko dena`} <strong>{fmtRs(Math.abs(pickedNet))}</strong>
            </div>
            <div style={{ width:160 }}><InputField label="Date" type="date" value={settleDate} onChange={setSettleDate}/></div>
            <div style={{ width:220 }}><InputField label="Reference (UTR / cheque)" value={settleRef} onChange={setSettleRef}/></div>
            <Btn color={T.grn} disabled={busy} onClick={async () => {
              const okd = await post(`/saas-admin/partners/${p.id}/settle`, { line_ids: picked.map(l => l.id), settled_at: settleDate, settle_ref: settleRef });
              if (okd) setSettleRef("");
            }}>Settle karo</Btn>
          </div>
        )}
      </div>

      {edit && <PartnerFormModal initial={p} onClose={() => setEdit(false)} onSaved={load} setToast={setToast}/>}
    </div>
  );
}

function TabPartners() {
  const [rows, setRows] = useState(null);
  const [selId, setSelId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    apiFetch("/saas-admin/partners").then(res => setRows(res.success ? res.data : []));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (selId) return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PartnerDetail partnerId={selId} onBack={() => { setSelId(null); load(); }} setToast={setToast}/>
    </>
  );

  const list = rows || [];
  const sum = (k) => list.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0);
  return (
    <div style={{ padding:"18px 24px" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <PageHeader title="Partners" sub="Kaun client laya, kaun bill karta hai, commission — client ka paisa aane par line banti hai"
        right={<Btn onClick={() => setShowNew(true)}><IcPlus size={13}/> Partner</Btn>}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, margin:"14px 0 16px" }}>
        <StatCard label="Partners se lena (baaki)" value={"₹" + fmtMoney(sum("collect_due"))} sub="jo bill partner ne liya, Blackbox ka hissa" color={T.grn} Icon={IcUsers}/>
        <StatCard label="Partners ko dena (baaki)" value={"₹" + fmtMoney(sum("pay_due"))} sub="commission, jahan Blackbox ne bill liya" color={T.amb} Icon={IcUsers}/>
        <StatCard label="Commission (kul)" value={"₹" + fmtMoney(sum("commission_total"))} sub="client ke paid bills par" color={T.blu} Icon={IcUsers}/>
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:12, overflow:"hidden" }}>
        {rows === null && <div style={{ padding:24, fontSize:12, color:T.t4 }}>Loading...</div>}
        {list.map(r => (
          <div key={r.id} onClick={() => setSelId(r.id)}
            style={{ padding:"12px 16px", borderBottom:`1px solid ${T.b1}`, display:"grid", gridTemplateColumns:"1.6fr 0.8fr 1fr 1fr 1fr", gap:12, alignItems:"center", cursor:"pointer", opacity: r.is_active ? 1 : 0.5 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.blu, display:"flex", alignItems:"center", gap:8 }}>
                {r.name} {r.is_owner ? <Badge text="OWNER" color={T.pur}/> : null}
                {Number(r.review_count) > 0 && <Badge text={`${r.review_count} DHYAN`} color={T.red}/>}
              </div>
              <div style={{ fontSize:10.5, color:T.t4 }}>{r.is_owner ? "Direct deal aur Blackbox ke naam ke bill" : commText(r.default_commission_type, r.default_commission_mode, r.default_commission_value)}</div>
            </div>
            <div style={{ fontSize:12, color:T.t2 }}>{r.client_count} client</div>
            <div style={{ fontSize:12, color:T.t2 }}>Commission {fmtRs(r.commission_total)}</div>
            <div style={{ fontSize:12, color: parseFloat(r.collect_due) ? T.grn : T.t4 }}>Lena {fmtRs(r.collect_due)}</div>
            <div style={{ fontSize:12, color: parseFloat(r.pay_due) ? T.amb : T.t4 }}>Dena {fmtRs(r.pay_due)}</div>
          </div>
        ))}
      </div>
      {showNew && <PartnerFormModal onClose={() => setShowNew(false)} onSaved={load} setToast={setToast}/>}
    </div>
  );
}

export { openPdf, COMM_TYPES, commText };
export default TabPartners;
