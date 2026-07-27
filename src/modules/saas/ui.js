// Shared UI primitives for the SaaS Admin module (module-owned — see tokens.js).
import { useEffect } from "react";
// IcX / IcChk are used as JSX tags inside Toast. Base ESLint's no-undef does
// NOT treat <Foo/> as a reference to Foo, so these went missing in the file
// split, compiled clean, and threw the moment the first toast rendered.
import { T, IcX, IcChk } from "./tokens";


// ── SHARED COMPONENTS ──────────────────────────────────────────────────
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

function Badge({ text, color }) {
  return (
    <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 9px", borderRadius:20, background:color+"18", color, border:`1px solid ${color}30`, whiteSpace:"nowrap" }}>
      {text}
    </span>
  );
}

function Btn({ children, onClick, color = T.blu, variant = "primary", disabled, style: sx, ...rest }) {
  const bg = variant === "primary" ? color : "transparent";
  const fg = variant === "primary" ? "#fff" : color;
  const bdr = variant === "primary" ? "none" : `1px solid ${T.b1}`;
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:8, background: disabled ? T.t4 : bg,
        color: disabled ? "#fff" : fg, fontSize:12.5, fontWeight:600, border:bdr, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily:"inherit", transition:"all 0.15s", ...sx }}>
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", required, endIcon, style: sx }) {
  return (
    <div style={sx}>
      {label && <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>{label}{required && " *"}</label>}
      <div style={{ position:"relative" }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width:"100%", padding:"9px 12px", paddingRight: endIcon ? 36 : 12, borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
        {endIcon && <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", display:"flex" }}>{endIcon}</div>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      {label && <label style={{ fontSize:10.5, fontWeight:600, color:T.t3, textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:13, color:T.t1, background:T.surfaceB, outline:"none", boxSizing:"border-box", fontFamily:"inherit", cursor:"pointer" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EmptyState({ Icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 0", color:T.t3, fontSize:13 }}>
      <Icon size={40} color={T.b2}/><div style={{ marginTop:12 }}>{text}</div>
    </div>
  );
}

function TableHeader({ columns, gridCols }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:gridCols, padding:"9px 16px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}` }}>
      {columns.map((h,i) => (
        <div key={i} style={{ fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
      ))}
    </div>
  );
}

function PageHeader({ title, sub, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:T.t1 }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:T.t3, marginTop:2 }}>{sub}</div>}
      </div>
      {right && <div style={{ display:"flex", gap:8, alignItems:"center" }}>{right}</div>}
    </div>
  );
}

export { Toast, Toggle, StatCard, Badge, Btn, InputField, SelectField, EmptyState, TableHeader, PageHeader };
