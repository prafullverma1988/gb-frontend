// ── RECEIVINGCONTACTS — order par "site par maal kise dena hai" ────────
// Vendor ke driver ko site ka naam to mil jata tha, par pahunch kar kise
// call kare — iska koi khaana nahi tha. Ye picker PO aur manual (call/
// WhatsApp) order dono par lagta hai, aur jo contacts yahan chunte ho wahi
// vendor ko jaane wale message/PO me chhapte hain.
//
// Dropdown me SIRF wo log aate hain jinhe us project par access diya gaya
// hai (Settings → Roles & Access → Project Access). Team khaali ho to
// "+ Naya contact" se naam+number haath se bhi bhara ja sakta hai — order
// rukta nahi.
//
// Sirf control render hota hai, label nahi — har screen apne style ka label
// upar laga leti hai (Fld / raw <label>).
//
// Usage:
//   <ReceivingContacts projectIds={[12,15]} value={contacts}
//                      onChange={setContacts} theme={T} compact/>
import { useState, useEffect, useMemo } from "react";
import SearchSelect from "./SearchSelect";
import api from "../config/api";

// Backend ke normPhone10 ka jodidaar — dono jagah ek hi niyam, warna screen
// "ho gaya" dikhati aur server mana kar deta.
export const normPhone10 = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  d = d.slice(1);
  return d.length === 10 ? d : "";
};
export const MAX_RECEIVING_CONTACTS = 5;
// Kam se kam ek contact har order par zaroori hai — screen isse button
// disable karti hai taki server ka error dekhna hi na pade.
export const hasReceivingContact = (list) =>
  Array.isArray(list) && list.some(c => c && c.name && normPhone10(c.phone));

const C = {
  surface:"#FFFFFF", surfaceB:"#F8F9FB", t1:"#111827", t2:"#374151",
  t3:"#6B7280", t4:"#9CA3AF", b1:"#E5E7EB",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  amb:"#B45309", ambL:"#FFFBEB", ambM:"#FDE68A",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
};

const prettyRole = (r) => String(r || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function ReceivingContacts({
  projectIds = [], value = [], onChange, theme, compact = false, disabled = false,
}) {
  const T = { ...C, ...(theme || {}) };
  const [team, setTeam]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [pick, setPick]       = useState("");
  const [showNew, setShowNew] = useState(false);
  const [nw, setNw]           = useState({ name:"", phone:"" });
  const [err, setErr]         = useState("");

  // ids ko string bana kar depend karte hain — array har render par nayi
  // banti hai, warna effect fetch loop me chala jata.
  const idKey = useMemo(
    () => [...new Set((projectIds || []).map(Number).filter(Boolean))].sort((a,b)=>a-b).join(","),
    [projectIds]
  );

  useEffect(() => {
    if (!idKey) { setTeam([]); return; }
    let dead = false;
    setLoading(true);
    api.get("/procurement/receiving-contacts?project_id=" + idKey)
      .then(r => { if (!dead && r?.success) setTeam(r.data || []); })
      .catch(() => {})
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [idKey]);

  const picked  = Array.isArray(value) ? value : [];
  const full    = picked.length >= MAX_RECEIVING_CONTACTS;
  const usedPh  = new Set(picked.map(c => normPhone10(c.phone)).filter(Boolean));
  const withPh  = team.filter(u => u.phone_ok && !usedPh.has(normPhone10(u.phone)));
  const noPhone = team.filter(u => !u.phone_ok);

  const add = (c) => {
    setErr("");
    if (full) { setErr("Zyada se zyada " + MAX_RECEIVING_CONTACTS + " contact bhej sakte ho."); return; }
    const phone = normPhone10(c.phone);
    if (!String(c.name || "").trim()) { setErr("Naam bharo."); return; }
    if (!phone) { setErr("10 ank ka mobile number bharo."); return; }
    if (usedPh.has(phone)) { setErr("Yeh number pehle hi list me hai."); return; }
    onChange([...picked, { ...c, name: String(c.name).trim(), phone }]);
  };
  const remove = (i) => { setErr(""); onChange(picked.filter((_, j) => j !== i)); };

  const addFromTeam = (uid) => {
    setPick("");
    const u = team.find(x => String(x.id) === String(uid));
    if (u) add({ user_id:u.id, name:u.name, phone:u.phone, role:u.role, designation:u.designation });
  };
  const addManual = () => {
    add({ user_id:null, name:nw.name, phone:nw.phone, role:null, designation:null });
    if (normPhone10(nw.phone) && String(nw.name || "").trim()) {
      setNw({ name:"", phone:"" });
      setShowNew(false);
    }
  };

  const inpS = {
    padding: compact ? "5px 8px" : "7px 10px", borderRadius:6, border:"1.5px solid " + T.b1,
    fontSize: compact ? 11.5 : 12.5, color:T.t1, background:T.surface, outline:"none",
    boxSizing:"border-box", fontFamily:"inherit", width:"100%",
  };

  return (
    <div>
      {/* Chuni hui list */}
      {picked.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:7}}>
          {picked.map((c, i) => (
            <span key={i} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"4px 8px 4px 10px",
              borderRadius:14,background:T.bluL,border:"1px solid " + T.bluM,fontSize:11.5,color:T.blu}}>
              <span style={{fontWeight:700}}>{c.name}</span>
              <span style={{opacity:.8,fontVariantNumeric:"tabular-nums"}}>{c.phone}</span>
              {(c.designation || c.role) && (
                <span style={{fontSize:10,opacity:.7}}>· {c.designation || prettyRole(c.role)}</span>
              )}
              {!disabled && (
                <button type="button" onClick={() => remove(i)} title="Hatao"
                  style={{border:"none",background:"none",cursor:"pointer",color:T.blu,fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && !full && (
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6,alignItems:"center"}}>
          <SearchSelect
            value={pick}
            options={withPh.map(u => ({
              key: String(u.id),
              label: u.name + " · " + (u.designation || prettyRole(u.role)) + " · " + normPhone10(u.phone),
            }))}
            onChange={addFromTeam}
            placeholder={loading ? "Team load ho rahi hai…" : (withPh.length ? "Project team se chuno…" : "Team list khaali")}
            disabled={loading || withPh.length === 0}
            compact={compact}
            theme={T}
          />
          <button type="button" onClick={() => { setShowNew(s => !s); setErr(""); }}
            style={{padding: compact ? "5px 10px" : "7px 12px",borderRadius:6,background:showNew?T.b1:T.surfaceB,
              border:"1.5px solid " + T.b1,color:T.t2,fontSize:compact?11:11.5,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {showNew ? "Cancel" : "+ Naya contact"}
          </button>
        </div>
      )}

      {/* Haath se naam+number — jab receiving wala system ka user hi na ho */}
      {!disabled && showNew && !full && (
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr auto",gap:6,marginTop:6}}>
          <input value={nw.name} onChange={e => setNw(p => ({...p, name:e.target.value}))}
            placeholder="Naam" autoFocus style={inpS}/>
          <input value={nw.phone} onChange={e => setNw(p => ({...p, phone:e.target.value}))}
            placeholder="10 ank mobile" inputMode="numeric" style={inpS}
            onKeyDown={e => { if (e.key === "Enter") addManual(); }}/>
          <button type="button" onClick={addManual}
            style={{padding:compact?"5px 12px":"7px 14px",borderRadius:6,background:T.blu,border:"none",
              color:"white",fontSize:compact?11:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add</button>
        </div>
      )}

      {err && (
        <div style={{marginTop:6,padding:"5px 9px",background:T.redL,border:"1px solid " + T.redM,
          borderRadius:6,fontSize:11,color:T.red}}>{err}</div>
      )}

      {/* Kyun list khaali hai — user ko dhoondhna na pade */}
      {!loading && !!idKey && team.length === 0 && (
        <div style={{marginTop:6,padding:"6px 10px",background:T.ambL,border:"1px solid " + T.ambM,
          borderRadius:6,fontSize:10.5,color:T.amb,lineHeight:1.45}}>
          Is project par abhi kisi ko access nahi diya gaya, isliye dropdown khaali hai.
          Settings → Roles &amp; Access → Project Access me team add karo — ya abhi
          "+ Naya contact" se naam aur number bhar do.
        </div>
      )}
      {!loading && noPhone.length > 0 && (
        <div style={{marginTop:6,fontSize:10,color:T.t4,lineHeight:1.45}}>
          Bina mobile number ke (isliye list me nahi): {noPhone.map(u => u.name).join(", ")} — Settings → Users me number bharo.
        </div>
      )}
      {full && (
        <div style={{marginTop:6,fontSize:10,color:T.t4}}>
          {MAX_RECEIVING_CONTACTS} contact ho gaye — aur jodne ke liye pehle kisi ko hatao.
        </div>
      )}
    </div>
  );
}
