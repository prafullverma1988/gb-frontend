import React from "react";
import { T } from "./tokens";

// Pill badge — slightly rounded, colored border
export const Pill = ({label, c, bg, border}) => (
  <span style={{display:"inline-block", background:bg, color:c, fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20, border:`1px solid ${border||c+"44"}`, whiteSpace:"nowrap"}}>{label}</span>
);

// Progress bar
export const PBar = ({pct, color, h=4}) => (
  <div style={{height:h, background:T.b1, borderRadius:h, overflow:"hidden"}}>
    <div style={{height:"100%", width:`${Math.min(pct,100)}%`, background:color||T.blu, borderRadius:h, transition:"width .5s"}}/>
  </div>
);

// Stat card — white card with top color accent
export const Stat = ({label, value, note, color}) => (
  <div style={{padding:"13px 15px", background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, borderTop:`3px solid ${color||T.blu}`}}>
    <div style={{fontSize:10, color:T.t3, fontWeight:600, letterSpacing:".5px", textTransform:"uppercase", marginBottom:5}}>{label}</div>
    <div style={{fontSize:21, fontWeight:700, color:T.t1, letterSpacing:"-.5px", lineHeight:1}}>{value}</div>
    {note&&<div style={{fontSize:11, color:T.t4, marginTop:4}}>{note}</div>}
  </div>
);

// Panel card
export const Panel = ({children, style}) => (
  <div style={{background:T.surface, border:`1px solid ${T.b1}`, borderRadius:8, overflow:"hidden", ...style}}>{children}</div>
);

// Panel header
export const PHead = ({title, action}) => (
  <div style={{padding:"10px 15px", borderBottom:`1px solid ${T.b1}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:T.surfaceB}}>
    <span style={{fontSize:12.5, fontWeight:700, color:T.t1, letterSpacing:"-.1px"}}>{title}</span>
    {action}
  </div>
);

// Table header row
export const THead = ({cols, headers}) => (
  <div style={{display:"grid", gridTemplateColumns:cols, padding:"7px 15px", background:T.surfaceB, borderBottom:`1px solid ${T.b1}`}}>
    {headers.map((h,i)=>(
      <span key={i} style={{fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".6px"}}>{h}</span>
    ))}
  </div>
);

// Add button
export const AddBtn = ({label, onClick}) => (
  <button onClick={onClick} style={{display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", border:`1px solid ${T.blu}`, borderRadius:6, background:T.bluL, color:T.blu, fontSize:11.5, fontWeight:600, cursor:"pointer", transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background=T.blu;e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.color=T.blu;}}>
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
    {label}
  </button>
);

// Secondary button
export const SecBtn = ({label, onClick}) => (
  <button onClick={onClick} style={{display:"inline-flex", alignItems:"center", gap:4, padding:"5px 11px", border:`1px solid ${T.b2}`, borderRadius:6, background:T.surface, color:T.t2, fontSize:11.5, fontWeight:500, cursor:"pointer"}}>{label}</button>
);

// Filter tabs
export const FilterTabs = ({options, active, onChange}) => (
  <div style={{display:"flex", gap:2, background:T.bg, borderRadius:7, padding:3, border:`1px solid ${T.b1}`}}>
    {options.map(o=>{
      const isA = active===o.id;
      return <button key={o.id} onClick={()=>onChange(o.id)} style={{padding:"4px 11px", borderRadius:5, border:"none", background:isA?T.surface:"none", color:isA?T.blu:T.t3, fontSize:11.5, fontWeight:isA?700:400, cursor:"pointer", boxShadow:isA?"0 1px 3px rgba(0,0,0,.08)":"none", transition:"all .15s", whiteSpace:"nowrap"}}>{o.label}{o.count!=null&&<span style={{marginLeft:4, background:isA?T.blu:T.b2, color:isA?"#fff":T.t3, fontSize:9, fontWeight:700, padding:"0 5px", borderRadius:10}}>{o.count}</span>}</button>;
    })}
  </div>
);

// Tab icon (inline SVG, single path)
export const TabIc = ({d, size=16, color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
