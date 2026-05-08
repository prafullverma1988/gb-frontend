import { useState, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";

// ── ICONS ──────────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcIn    =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcOut   =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>;
const IcBox   =(p)=><Ic {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>;
const IcTrns  =(p)=><Ic {...p} d="M17 3l4 4-4 4M7 21l-4-4 4-4M21 7H3M21 17H3"/>;
const IcMR    =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcTrash =(p)=><Ic {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/>;
const IcHist  =(p)=><Ic {...p} d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l3 3"/>;
const IcXc    =(p)=><Ic {...p} d="M15 9l-6 6M9 9l6 6M12 22a10 10 0 110-20 10 10 0 010 20z"/>;

// ── THEME ─────────────────────────────────────────────────────────
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",sb:"#0D1B2A",sbH:"#162032",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE",
  cyn:"#0891B2",cynL:"#E0F2FE",cynM:"#BAE6FD",
};
const fmtN=(n)=>n==null?"-":Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:String(n||0);
const today=()=>new Date().toISOString().split("T")[0];
const fmtDate=(d)=>{if(!d)return"—";const dt=new Date(d);return isNaN(dt)?"—":dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"});};

// ── CATALOG ───────────────────────────────────────────────────────
const CATEGORIES=["Cement & Concrete","Steel & Iron","Bricks & Blocks","Sand & Aggregate","Tiles & Flooring","Electrical","Plumbing","Paint & Finishing","Wood & Carpentry","Safety & Tools","Other"];
const CATEGORIES_ALL=["All",...CATEGORIES];
const UNITS=["Bags","MT","CuM","SqM","SqFt","Nos","Ltrs","Rft","Kg","Box","Set","Bundle","Roll","Pcs"];
const PRIORITIES=["Low","Medium","High"];

const getCategoryEmoji=(cat)=>{
  const map={"Cement & Concrete":"🏗️","Steel & Iron":"🔩","Bricks & Blocks":"🧱","Sand & Aggregate":"⛏️","Tiles & Flooring":"🟦","Electrical":"⚡","Plumbing":"🔧","Paint & Finishing":"🖌️","Wood & Carpentry":"🪵","Safety & Tools":"⛑️"};
  return map[cat]||"📦";
};

// ── UNIT LOCK ─────────────────────────────────────────────────────
// Unit is locked (read-only chip) when material comes from library/master.
// Unit name CLEARLY visible — only change is disabled. Only Material Library
// can change a material's unit (same material has only one unit, prevents hazzy).
const UnitLock=({unit,locked,onChange,fallbackUnits=UNITS,compact})=>{
  if(locked){
    return (
      <div title="Unit Material Library se aata hai — change karne ke liye Library → Materials me edit karein"
        style={{height:compact?32:38,padding:"0 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,background:T.surfaceB,display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontSize:12.5,fontWeight:700,color:T.t1,fontFamily:"inherit",cursor:"not-allowed",boxSizing:"border-box"}}>
        <span style={{fontSize:9,opacity:.55}}>🔒</span>
        <span>{unit||"—"}</span>
      </div>
    );
  }
  return (
    <select value={unit||"Nos"} onChange={e=>onChange(e.target.value)}
      style={{height:compact?32:38,padding:"0 6px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,background:T.surface,fontFamily:"inherit",outline:"none"}}>
      {fallbackUnits.map(u=><option key={u}>{u}</option>)}
    </select>
  );
};

// ── PRIMITIVES ────────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);
const PBar=({pct,color,h=5})=>(
  <div style={{height:h,background:T.b1,borderRadius:h,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,Math.max(0,pct))}%`,background:color,borderRadius:h,transition:"width .5s"}}/>
  </div>
);
const StatCard=({label,value,sub,color,icon:Icon})=>(
  <div style={{padding:"13px 15px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${color}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",display:"flex",alignItems:"flex-start",gap:12}}>
    <div style={{width:36,height:36,borderRadius:8,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <Icon size={16} color={color}/>
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color:T.t1,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{sub}</div>}
    </div>
  </div>
);
const Btn=({children,onClick,c=T.blu,bg,disabled,icon:Icon,size="md",style={}})=>{
  const padY=size==="sm"?6:9;const padX=size==="sm"?12:14;
  const fs=size==="sm"?11.5:12.5;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:`${padY}px ${padX}px`,borderRadius:7,background:disabled?T.b1:(bg||c),color:disabled?T.t4:"white",fontSize:fs,fontWeight:700,border:"none",cursor:disabled?"not-allowed":"pointer",transition:"opacity .12s",fontFamily:"inherit",...style}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.opacity=".88";}}
      onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
      {Icon&&<Icon size={size==="sm"?12:13} color={disabled?T.t4:"white"}/>}
      {children}
    </button>
  );
};
const GhostBtn=({children,onClick,c=T.t3,icon:Icon,style={}})=>(
  <button onClick={onClick}
    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px 11px",borderRadius:7,background:T.surface,border:`1.5px solid ${T.b1}`,color:c,fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",...style}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=c;e.currentTarget.style.background=c+"08";}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.background=T.surface;}}>
    {Icon&&<Icon size={12} color={c}/>}{children}
  </button>
);
const Field=({label,children,style={}})=>(
  <div style={style}>
    <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{label}</label>
    {children}
  </div>
);
const Input=({value,onChange,placeholder,type="text",accent=T.blu,style={},...rest})=>(
  <input value={value??""} type={type} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...style}}
    onFocus={e=>e.target.style.borderColor=accent}
    onBlur={e=>e.target.style.borderColor=T.b1}
    {...rest}/>
);
const Empty=({label,sub})=>(
  <div style={{padding:"40px 20px",textAlign:"center",color:T.t4}}>
    <div style={{fontSize:30,marginBottom:6,opacity:.4}}>📦</div>
    <div style={{fontSize:13,color:T.t3,fontWeight:600}}>{label}</div>
    {sub&&<div style={{fontSize:11,marginTop:3}}>{sub}</div>}
  </div>
);

// ── MODAL SHELL ───────────────────────────────────────────────────
const ModalShell=({title,sub,onClose,children,width=520,footer})=>(
  <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:`min(${width}px,95vw)`,maxHeight:"92vh",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>{title}</div>
          {sub&&<div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{sub}</div>}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>{children}</div>
      {footer&&<div style={{borderTop:`1px solid ${T.b1}`,padding:"10px 18px",background:T.surfaceB,flexShrink:0,display:"flex",gap:8,justifyContent:"flex-end"}}>{footer}</div>}
    </div>
  </>
);

// ── ADD / EDIT MATERIAL MODAL ─────────────────────────────────────
// Naya material → Library se pick karke add karein (unit auto-locked).
// Edit → unit locked (Library me change karein).
function MaterialFormModal({material,library=[],onClose,onSaved}){
  const editing=!!material?.id;
  const [f,setF]=useState({
    name:material?.name||"",
    category:material?.category||"Other",
    unit:material?.unit||"Nos",
    qty:material?.qty??0,
    min_qty:material?.minQty??material?.min_qty??0,
    max_qty:material?.maxQty??material?.max_qty??0,
    rate:material?.rate??0,
    location:material?.location||"Main Godown",
  });
  const [libPick,setLibPick]=useState(null);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const onLibPick=(v)=>{
    setLibPick(v);
    const m=library.find(l=>l.id===v);
    if(m) setF(p=>({...p,name:m.name,unit:m.unit||"Nos",rate:m.rate||p.rate,category:m.category||p.category}));
  };
  const submit=async()=>{
    if(!f.name.trim()){alert("Material ka naam dalna padega");return;}
    setSaving(true);
    try{
      const body={...f,qty:Number(f.qty)||0,min_qty:Number(f.min_qty)||0,max_qty:Number(f.max_qty)||0,rate:Number(f.rate)||0};
      const res=editing
        ?await api.patch(`/warehouse/materials/${material.id}`,body)
        :await api.post("/warehouse/materials",body);
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"Save failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  const libOpts=library.map(m=>({id:m.id,name:`${m.name} · ${m.unit||"Nos"}`}));
  const fromLibrary=editing||!!libPick;

  return(
    <ModalShell title={editing?"Edit Material":"New Material"}
      sub={editing?material.id||material.name:"Library se pick karein — unit auto-locked"}
      onClose={onClose} width={500}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!f.name.trim()||saving} c={editing?T.blu:T.grn} icon={IcChk}>{saving?"Saving...":editing?"Save Changes":"Add Material"}</Btn>
      </>}>
      {!editing&&(
        <Field label="Pick from Material Library *" style={{marginBottom:11}}>
          <SearchSelect value={libPick} options={libOpts} onChange={onLibPick} placeholder="Library se material chunein"/>
          {library.length===0&&<div style={{fontSize:10.5,color:T.amb,marginTop:3}}>⚠ Library khali hai — Library → Materials me pehle add karein</div>}
        </Field>
      )}
      <Field label="Material name *" style={{marginBottom:11}}>
        <Input value={f.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. OPC 53 Grade Cement"
          disabled={fromLibrary}
          style={{background:fromLibrary?T.surfaceB:T.surface,color:fromLibrary?T.t2:T.t1,cursor:fromLibrary?"not-allowed":"text"}}/>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
        <Field label="Category">
          <select value={f.category} onChange={e=>upd("category",e.target.value)} disabled={fromLibrary}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:fromLibrary?T.t2:T.t1,background:fromLibrary?T.surfaceB:T.surface,outline:"none",fontFamily:"inherit",cursor:fromLibrary?"not-allowed":"pointer"}}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            {fromLibrary&&!CATEGORIES.includes(f.category)&&<option>{f.category}</option>}
          </select>
        </Field>
        <Field label={<span>Unit {fromLibrary?<span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· locked from library</span>:""}</span>}>
          <UnitLock unit={f.unit} locked={fromLibrary} onChange={u=>upd("unit",u)}/>
        </Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:11}}>
        <Field label="Min qty"><Input value={f.min_qty} type="number" onChange={e=>upd("min_qty",e.target.value)}/></Field>
        <Field label="Max qty"><Input value={f.max_qty} type="number" onChange={e=>upd("max_qty",e.target.value)}/></Field>
        <Field label="Rate (₹/unit)"><Input value={f.rate} type="number" onChange={e=>upd("rate",e.target.value)}/></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:editing?"1fr":"1fr 1fr",gap:11}}>
        {!editing&&(
          <Field label="Opening qty"><Input value={f.qty} type="number" onChange={e=>upd("qty",e.target.value)}/></Field>
        )}
        <Field label="Location">
          <Input value={f.location} onChange={e=>upd("location",e.target.value)} placeholder="Main Godown"/>
        </Field>
      </div>
    </ModalShell>
  );
}

// ── LINE-ITEM ROW (used by GRN, Issue, MR, Transfer modals) ───────
function LineItemRow({row,idx,stock,onChange,onRemove,mode,canRemove}){
  // SearchSelect returns string keys; stock may have number ids — compare loosely
  const findStock=(id)=>stock.find(m=>String(m.id)===String(id));
  const matSel=findStock(row.material_id);
  const avail=matSel?Number(matSel.qty)||0:0;
  const overStock=mode==="issue"&&row.qty&&Number(row.qty)>avail;
  const stockOpts=stock.map(m=>({id:m.id,name:`${m.name} (${m.qty} ${m.unit} avail)`}));

  // Pick material — auto-fills unit + rate
  const onPickMaterial=(v)=>{
    const m=findStock(v);
    // material_id should only be a real wh_materials.id (number).
    // If srcInv item explicitly has material_id field, prefer that (handles unmatched names).
    const matId = m && Object.prototype.hasOwnProperty.call(m,'material_id')
      ? m.material_id
      : (typeof m?.id === 'number' ? m.id : null);
    onChange(idx,{material_id:matId,name:m?.name||v,unit:m?.unit||row.unit||"Nos",rate:m?.rate||row.rate||0});
  };

  // Column templates per mode
  const cols = mode==="grn"     ? "2fr 60px 1fr 1fr 1fr 90px 24px"
             : mode==="issue"    ? "2fr 60px 1fr 100px 30px"
             : mode==="transfer" ? "2fr 60px 1fr 100px 90px 24px"
             :                     "2fr 60px 1fr 30px";

  return (
    <div style={{display:"grid",gridTemplateColumns:cols,gap:6,alignItems:"center",marginBottom:6}}>
      {mode==="issue"?(
        <SearchSelect compact value={row.material_id} options={stockOpts}
          onChange={onPickMaterial} placeholder="Pick material from stock..."/>
      ):(
        <SearchSelect compact value={row.material_id||row.name} options={stockOpts}
          onChange={onPickMaterial} placeholder="Material name (pick or type)"/>
      )}
      <UnitLock unit={row.unit||"Nos"} compact
        locked={!!(row.material_id || row._unitLocked)}
        onChange={u=>onChange(idx,{unit:u})}/>
      {mode==="grn"&&(
        <input type="number" value={row.ordered_qty||""} onChange={e=>onChange(idx,{ordered_qty:e.target.value})} placeholder="Ord"
          style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
      )}
      <input type="number" value={row.qty||row.received_qty||""} onChange={e=>onChange(idx,mode==="grn"?{received_qty:e.target.value}:{qty:e.target.value})}
        placeholder={mode==="grn"?"Rcvd":"Qty"}
        style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${overStock?T.red:T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",color:overStock?T.red:T.t1,background:overStock?T.redL:T.surface}}/>
      {(mode==="grn"||mode==="issue"||mode==="transfer")&&(
        <input type="number" value={row.rate||""} onChange={e=>onChange(idx,{rate:e.target.value})}
          placeholder={mode==="transfer"?"Rate (auto)":"Rate"}
          title={mode==="transfer"?"Last purchase rate auto-filled. Edit if needed.":""}
          style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",background:mode==="transfer"&&row.rate?T.cynL+"66":T.surface}}/>
      )}
      {(mode==="grn"||mode==="transfer")&&(
        <span style={{fontSize:11,color:mode==="transfer"?T.cyn:T.blu,fontWeight:700,textAlign:"right"}}>₹{fmt(Number(row.qty||row.received_qty||0)*Number(row.rate||0))}</span>
      )}
      {canRemove?(
        <button onClick={()=>onRemove(idx)}
          style={{width:24,height:24,border:"none",background:"none",cursor:"pointer",color:T.red,padding:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5}}
          onMouseEnter={e=>e.currentTarget.style.background=T.redL}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <IcTrash size={12}/>
        </button>
      ):<span/>}
    </div>
  );
}

// ── NEW GRN MODAL ─────────────────────────────────────────────────
function NewGRNModal({stock,projects,users,onClose,onSaved}){
  const [f,setF]=useState({date:today(),vendor:"",po_no:"",project_id:null,received_by:null});
  const [items,setItems]=useState([{material_id:null,name:"",unit:"Nos",ordered_qty:"",received_qty:"",rate:""}]);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{material_id:null,name:"",unit:"Nos",ordered_qty:"",received_qty:"",rate:""}]);

  const valid=items.some(it=>(it.name||it.material_id)&&Number(it.received_qty)>0);
  const total=items.reduce((s,it)=>s+(Number(it.received_qty)||0)*(Number(it.rate)||0),0);

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items
        .filter(it=>(it.name||it.material_id)&&Number(it.received_qty)>0)
        .map(it=>({
          material_id:it.material_id||null,
          name:it.name,
          unit:it.unit,
          ordered_qty:Number(it.ordered_qty)||Number(it.received_qty)||0,
          received_qty:Number(it.received_qty)||0,
          rate:Number(it.rate)||0,
        }));
      const res=await api.post("/warehouse/grn",{...f,items:cleanItems});
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"GRN save failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  return (
    <ModalShell title="New GRN — Material In" sub="Vendor se aaye material ko receive karein"
      onClose={onClose} width={780}
      footer={<>
        <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total: <b style={{color:T.blu}}>₹{fmtN(total)}</b></span>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.grn} icon={IcChk}>{saving?"Saving...":"Save GRN"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:11,marginBottom:14}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="Vendor"><Input value={f.vendor} onChange={e=>upd("vendor",e.target.value)} placeholder="Supplier name"/></Field>
        <Field label="PO No"><Input value={f.po_no} onChange={e=>upd("po_no",e.target.value)} placeholder="Optional"/></Field>
        <Field label="Project">
          <SearchSelect compact value={f.project_id} options={projects} onChange={v=>upd("project_id",v)} placeholder="Select project"/>
        </Field>
      </div>
      <Field label="Received By" style={{marginBottom:14}}>
        <SearchSelect compact value={f.received_by} options={users} onChange={v=>upd("received_by",v)} placeholder="Site engineer / store-keeper"/>
      </Field>

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",justifyContent:"space-between"}}>
        <span>Items</span>
        <span style={{color:T.t4,textTransform:"none",letterSpacing:0,fontWeight:500}}>Stock me hai to pick karo, nahi to naam type karo</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 1fr 1fr 90px 24px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material</span><span>Unit</span><span>Ordered</span><span>Received</span><span>Rate ₹</span><span style={{textAlign:"right"}}>Amount</span><span/>
      </div>
      {items.map((row,i)=>(
        <LineItemRow key={i} row={row} idx={i} stock={stock} onChange={updItem} onRemove={remItem} mode="grn" canRemove={items.length>1}/>
      ))}
      <button onClick={addItem}
        style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        <IcAdd size={11}/> Add row
      </button>
    </ModalShell>
  );
}

// ── NEW ISSUE MODAL ───────────────────────────────────────────────
function NewIssueModal({stock,projects,users,onClose,onSaved,prefill,fromMR}){
  const [f,setF]=useState({date:today(),project_id:prefill?.project_id||null,issued_to:null,remarks:prefill?.remarks||""});
  const initial=()=> (prefill?.items&&prefill.items.length>0)
    ?prefill.items.map(it=>{
      const m=stock.find(s=>s.name?.toLowerCase()===String(it.material_name||it.name||"").toLowerCase());
      return {material_id:m?.id||null,name:m?.name||it.name||it.material_name,unit:m?.unit||it.unit||"Nos",qty:Number(it.qty)||0,rate:m?.rate||0};
    })
    :[{material_id:null,name:"",unit:"Nos",qty:"",rate:""}];
  const [items,setItems]=useState(initial);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{material_id:null,name:"",unit:"Nos",qty:"",rate:""}]);

  const stockErr=items.find(it=>{
    if(!it.material_id||!it.qty)return false;
    const m=stock.find(s=>s.id===it.material_id);
    return m&&Number(it.qty)>Number(m.qty);
  });
  const valid=!stockErr&&items.some(it=>it.material_id&&Number(it.qty)>0);
  const total=items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.rate)||0),0);

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items.filter(it=>it.material_id&&Number(it.qty)>0).map(it=>({
        material_id:it.material_id,
        qty:Number(it.qty),
        rate:Number(it.rate)||0,
      }));
      const url=fromMR?`/warehouse/mr/${fromMR}/issue`:"/warehouse/issues";
      const res=await api.post(url,{...f,items:cleanItems});
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"Issue failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  return (
    <ModalShell title={fromMR?`Issue against MR ${fromMR}`:"New Issue — Material Out"}
      sub="Stock se material project ko de rahe hain"
      onClose={onClose} width={760}
      footer={<>
        <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total: <b style={{color:T.amb}}>₹{fmtN(total)}</b></span>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.amb} icon={IcOut}>{saving?"Saving...":"Issue Material"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:14}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="Project">
          <SearchSelect compact value={f.project_id} options={projects} onChange={v=>upd("project_id",v)} placeholder="Select project"/>
        </Field>
        <Field label="Issued To">
          <SearchSelect compact value={f.issued_to} options={users} onChange={v=>upd("issued_to",v)} placeholder="Person on site"/>
        </Field>
      </div>
      <Field label="Remarks" style={{marginBottom:14}}>
        <Input value={f.remarks} onChange={e=>upd("remarks",e.target.value)} placeholder="e.g. GF slab casting, Tower-A column shuttering..."/>
      </Field>

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Items</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 100px 30px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material (from stock)</span><span>Unit</span><span>Qty</span><span>Rate ₹</span><span/>
      </div>
      {items.map((row,i)=>(
        <LineItemRow key={i} row={row} idx={i} stock={stock} onChange={updItem} onRemove={remItem} mode="issue" canRemove={items.length>1}/>
      ))}
      {stockErr&&<div style={{marginTop:5,padding:"7px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,fontSize:11.5,color:T.red,fontWeight:600}}>⚠ Stock se zyada qty kisi item me hai — kam karo</div>}
      <button onClick={addItem}
        style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        <IcAdd size={11}/> Add row
      </button>
    </ModalShell>
  );
}

// ── NEW MR MODAL ──────────────────────────────────────────────────
// Warehouse → Material Request: warehouse apne liye material maangta hai
// Project = "Warehouse" (locked, not selectable)
// Material picker = Material Library only
// Unit = library se aata hai, locked (sirf Library me change ho sakta hai)
function NewMRModal({library,onClose,onSaved}){
  const [f,setF]=useState({date:today(),priority:"Medium"});
  const [items,setItems]=useState([{lib_id:null,name:"",unit:"",qty:"",note:""}]);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{lib_id:null,name:"",unit:"",qty:"",note:""}]);

  const valid=items.some(it=>it.lib_id&&Number(it.qty)>0);
  const libOpts=library.map(m=>({id:m.id,name:`${m.name}${m.unit?` · ${m.unit}`:""}`}));
  // SearchSelect normalizes keys to strings, so compare loosely
  const findLib=(id)=>library.find(l=>String(l.id)===String(id));

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items.filter(it=>it.lib_id&&Number(it.qty)>0).map(it=>{
        const lib=findLib(it.lib_id);
        return {
          name:lib?.name||it.name||"Item",
          unit:lib?.unit||it.unit||"Nos",
          qty:Number(it.qty),
          note:it.note||null,
        };
      });
      const res=await api.post("/warehouse/mr",{
        date:f.date,
        priority:f.priority,
        project_id:null, // Warehouse-internal request
        items:cleanItems,
      });
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"MR save failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  return (
    <ModalShell title="New Material Request" sub="Warehouse ke liye material maango — Library se pick karein"
      onClose={onClose} width={720}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.pur} icon={IcChk}>{saving?"Saving...":"Submit MR"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:14}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="Project">
          <div style={{padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surfaceB,fontSize:12.5,color:T.t2,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,height:38,boxSizing:"border-box"}}>
            <span style={{fontSize:10,opacity:.6}}>🔒</span>
            <span style={{fontWeight:600,color:T.t1}}>Warehouse</span>
            <span style={{fontSize:10,color:T.t4}}>(internal request)</span>
          </div>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={e=>upd("priority",e.target.value)}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>

      {library.length===0&&(
        <div style={{padding:"10px 13px",borderRadius:7,background:T.ambL,border:`1px solid ${T.ambM}`,fontSize:12,color:T.amb,fontWeight:600,marginBottom:11}}>
          ⚠ Material Library khali hai — pehle Library → Materials me items add karein
        </div>
      )}

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>
        Items <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· library se pick karein</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 70px 1fr 1.5fr 30px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material (from library)</span><span>Unit</span><span>Qty</span><span>Note</span><span/>
      </div>
      {items.map((row,i)=>{
        const lib=findLib(row.lib_id);
        return (
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 70px 1fr 1.5fr 30px",gap:6,alignItems:"center",marginBottom:6}}>
            <SearchSelect compact value={row.lib_id} options={libOpts}
              onChange={v=>{const m=findLib(v);updItem(i,{lib_id:v,name:m?.name||"",unit:m?.unit||""});}}
              placeholder="Library se material pick karein"/>
            <UnitLock unit={lib?.unit||row.unit||"—"} locked={true} compact/>
            <input type="number" value={row.qty||""} onChange={e=>updItem(i,{qty:e.target.value})} placeholder="Qty"
              style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
            <input value={row.note||""} onChange={e=>updItem(i,{note:e.target.value})} placeholder="Optional remark"
              style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
            {items.length>1?(
              <button onClick={()=>remItem(i)}
                style={{width:24,height:24,border:"none",background:"none",cursor:"pointer",color:T.red,padding:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5}}>
                <IcTrash size={12}/>
              </button>
            ):<span/>}
          </div>
        );
      })}
      <button onClick={addItem} disabled={library.length===0}
        style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:library.length===0?T.t4:T.t3,fontSize:11.5,fontWeight:600,cursor:library.length===0?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        <IcAdd size={11}/> Add row
      </button>
      <div style={{marginTop:8,fontSize:10.5,color:T.t4,fontStyle:"italic"}}>
        💡 Unit Material Library se aata hai aur locked rahega — change karne ke liye Library → Materials me edit karein.
      </div>
    </ModalShell>
  );
}

// ── NEW TRANSFER MODAL ────────────────────────────────────────────
function NewTransferModal({stock,projects,onClose,onSaved}){
  const [f,setF]=useState({date:today(),from_project_id:null,to_project_id:null});
  const [items,setItems]=useState([{material_id:null,name:"",unit:"Nos",qty:"",rate:""}]);
  const [saving,setSaving]=useState(false);
  const [srcInv,setSrcInv]=useState([]);   // Source project's inventory (from material-ledger)
  const [srcLoading,setSrcLoading]=useState(false);

  // Load source project's inventory when from_project_id changes
  useEffect(()=>{
    if(!f.from_project_id){ setSrcInv([]); return; }
    setSrcLoading(true);
    setItems([{material_id:null,name:"",unit:"Nos",qty:"",rate:""}]); // reset items
    api.get(`/tasks/project/${f.from_project_id}/material-ledger`).then(r=>{
      if(r.success){
        const inv=(r.data||[])
          .filter(m=>Number(m.balance||0)>0) // only items with available qty
          .map(m=>{
            const whMat=stock.find(s=>s.name?.toLowerCase().trim()===m.material_name?.toLowerCase().trim());
            return {
              id: whMat?.id ?? `name:${(m.material_name||"").toLowerCase().trim()}`,
              name: m.material_name,
              qty: Number(m.balance)||0,
              unit: m.unit||"Nos",
              rate: whMat ? Number(whMat.rate)||0 : 0,
              material_id: whMat?.id || null,
              category: whMat?.category || "Other",
            };
          });
        setSrcInv(inv);
      } else setSrcInv([]);
      setSrcLoading(false);
    }).catch(()=>{ setSrcInv([]); setSrcLoading(false); });
  },[f.from_project_id,stock]);

  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>{
    setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
    // After material pick, fetch last-rate by name (works for procurement-only
    // materials that don't exist in wh_materials master).
    const pickedName = patch.name && String(patch.name).trim();
    if(pickedName){
      const url = `/warehouse/last-rate?name=${encodeURIComponent(pickedName)}`;
      api.get(url).then(r=>{
        if(r.success && Number(r.data?.rate) > 0){
          setItems(p=>p.map((row,j)=>j===i&&!Number(row.rate)?{...row,rate:r.data.rate}:row));
        }
      }).catch(()=>{});
    }
  };
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{material_id:null,name:"",unit:"Nos",qty:"",rate:""}]);

  const sameProj=f.from_project_id&&f.to_project_id&&Number(f.from_project_id)===Number(f.to_project_id);
  // Over-stock warning: any item qty > source's available qty for that material
  const overStockRow=items.find(it=>{
    if(!it.qty)return false;
    const inv=srcInv.find(s=>String(s.id)===String(it.material_id)||s.name===it.name);
    return inv && Number(it.qty)>Number(inv.qty);
  });
  const valid=f.from_project_id&&f.to_project_id&&!sameProj&&!overStockRow&&items.some(it=>(it.name||it.material_id)&&Number(it.qty)>0);

  const totalValue=items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.rate||0),0);
  const fromName=projects.find(p=>p.id===f.from_project_id)?.name;
  const toName=projects.find(p=>p.id===f.to_project_id)?.name;

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items.filter(it=>(it.name||it.material_id)&&Number(it.qty)>0).map(it=>({
        material_id:it.material_id||null,
        name:it.name||(stock.find(s=>s.id===it.material_id)?.name)||"Item",
        unit:it.unit||"Nos",
        qty:Number(it.qty),
        rate:Number(it.rate||0),
      }));
      const res=await api.post("/warehouse/transfers",{
        date:f.date,
        from_project_id:f.from_project_id,
        to_project_id:f.to_project_id,
        items:cleanItems,
      });
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"Transfer save failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  return (
    <ModalShell title="New Project-to-Project Transfer" sub="Source me debit + Dest pending receive (site wala GRN dalega)"
      onClose={onClose} width={780}
      footer={<>
        <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total Value: <b style={{color:T.cyn}}>₹{fmtN(totalValue)}</b></span>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.cyn} icon={IcTrns}>{saving?"Saving...":"Save Transfer (Pending)"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"120px 1fr 1fr",gap:11,marginBottom:11}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="From project *">
          <SearchSelect compact value={f.from_project_id} options={projects}
            onChange={v=>upd("from_project_id",v)} placeholder="Source project select karo"/>
        </Field>
        <Field label="To project *">
          <SearchSelect compact value={f.to_project_id} options={projects}
            onChange={v=>upd("to_project_id",v)} placeholder="Destination project select karo"/>
        </Field>
      </div>
      {sameProj&&(
        <div style={{padding:"7px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,fontSize:11.5,color:T.red,fontWeight:600,marginBottom:11}}>
          ⚠ From aur To project alag hone chahiye
        </div>
      )}
      {projects.length===0&&(
        <div style={{padding:"7px 11px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,fontSize:11.5,color:T.amb,fontWeight:600,marginBottom:11}}>
          ⚠ Koi project nahi mila — pehle Projects me ja ke ek project banao
        </div>
      )}
      {fromName&&toName&&!sameProj&&(
        <div style={{padding:"8px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,fontSize:11.5,color:T.blu,marginBottom:11,lineHeight:1.5}}>
          <b>{fromName}</b> ka stock & expense turant minus hoga. <b>{toName}</b> me material physically pohonchne par
          site wala "Receive" karega — tab tak Pending dikhega aur dest inventory me add nahi hoga.
        </div>
      )}

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>Items {f.from_project_id?<span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· from <b style={{color:T.cyn}}>{fromName}</b> inventory</span>:""}</span>
        {srcLoading&&<span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontSize:10.5}}>Loading inventory...</span>}
      </div>

      {!f.from_project_id&&(
        <div style={{padding:"24px 14px",textAlign:"center",background:T.surfaceB,borderRadius:8,border:`1.5px dashed ${T.b1}`,color:T.t4,fontSize:12,marginBottom:8}}>
          Source project select karo — uske available materials yahan dikhenge
        </div>
      )}

      {f.from_project_id&&!srcLoading&&srcInv.length===0&&(
        <div style={{padding:"24px 14px",textAlign:"center",background:T.ambL,borderRadius:8,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:12,marginBottom:8,fontWeight:600}}>
          ⚠ {fromName} me koi available material nahi hai (sab use ho gaya hai ya GRN nahi mila)
        </div>
      )}

      {f.from_project_id&&srcInv.length>0&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 100px 90px 24px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
            <span>Material (avail in {fromName})</span><span>Unit</span><span>Qty</span><span>Rate ₹/u</span><span style={{textAlign:"right"}}>Value</span><span/>
          </div>
          {items.map((row,i)=>(
            <LineItemRow key={i} row={row} idx={i} stock={srcInv} onChange={updItem} onRemove={remItem} mode="transfer" canRemove={items.length>1}/>
          ))}
          <button onClick={addItem}
            style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
            <IcAdd size={11}/> Add row
          </button>
          {overStockRow&&(
            <div style={{marginTop:8,padding:"7px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,fontSize:11.5,color:T.red,fontWeight:600}}>
              ⚠ Kisi item ki qty source me available stock se zyada hai — kam karo
            </div>
          )}
          <div style={{marginTop:8,fontSize:10.5,color:T.t4,fontStyle:"italic"}}>
            💡 Material pick karte hi rate auto-fill ho jayega. Edit kar sakte ho. Source me jitna available hai utna hi transfer karein.
          </div>
        </>
      )}
    </ModalShell>
  );
}

// ── ADD STOCK MODAL (existing item top-up) ────────────────────────
function AddStockModal({material,onClose,onSaved}){
  const [f,setF]=useState({qty:"",rate:material?.rate||"",vendor:"",remarks:""});
  const [saving,setSaving]=useState(false);
  const upd=(k)=>e=>setF(p=>({...p,[k]:e.target.value}));
  const submit=async()=>{
    if(!f.qty||Number(f.qty)<=0) return;
    setSaving(true);
    try{
      const res=await api.post(`/warehouse/materials/${material.id}/add-stock`,{
        qty:Number(f.qty),
        rate:Number(f.rate)||material?.rate||0,
      });
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"Failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };
  return (
    <ModalShell title="Add Stock" sub={material?`${material.name} · Current: ${fmtN(material.qty)} ${material.unit}`:""}
      onClose={onClose} width={460}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!f.qty||saving} c={T.grn} icon={IcIn}>{saving?"Adding...":"Add to Warehouse"}</Btn>
      </>}>
      {material&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:8,marginBottom:14}}>
        <span style={{fontSize:20}}>{getCategoryEmoji(material.category)}</span>
        <div><div style={{fontSize:13,fontWeight:700,color:T.grn}}>{material.name}</div>
          <div style={{fontSize:10.5,color:T.grn}}>Current: {fmtN(material.qty)} {material.unit} · {material.location}</div></div>
      </div>}
      <Field label={`Quantity (${material?.unit||"Units"}) *`} style={{marginBottom:11}}>
        <Input type="number" value={f.qty} onChange={upd("qty")} placeholder="Enter quantity received"/>
        {material&&f.qty&&<div style={{fontSize:11,color:T.grn,marginTop:3}}>New total: {fmtN(Number(material.qty)+Number(f.qty))} {material.unit}</div>}
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
        <Field label="Rate (₹)"><Input type="number" value={f.rate} onChange={upd("rate")} placeholder="Per unit rate"/></Field>
        <Field label="Vendor"><Input value={f.vendor} onChange={upd("vendor")} placeholder="Optional"/></Field>
      </div>
      <Field label="Remarks">
        <Input value={f.remarks} onChange={upd("remarks")} placeholder="Optional note"/>
      </Field>
    </ModalShell>
  );
}

// ── QUICK ISSUE MODAL (single material from stock) ────────────────
function QuickIssueModal({material,projects,users,onClose,onSaved}){
  const [f,setF]=useState({project_id:null,issued_to:null,qty:"",remarks:""});
  const [saving,setSaving]=useState(false);
  const max=Number(material?.qty)||0;
  const overStock=Number(f.qty)>max;
  const submit=async()=>{
    if(!f.qty||Number(f.qty)<=0||overStock) return;
    setSaving(true);
    try{
      const res=await api.post("/warehouse/issues",{
        date:today(),
        project_id:f.project_id||null,
        issued_to:f.issued_to||null,
        items:[{material_id:material.id,qty:Number(f.qty),rate:material.rate}],
        remarks:f.remarks||null,
      });
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"Issue failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };
  return (
    <ModalShell title="Quick Issue" sub={`${material?.name} · Available: ${fmtN(max)} ${material?.unit}`}
      onClose={onClose} width={500}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!f.qty||overStock||saving} c={T.amb} icon={IcOut}>{saving?"Issuing...":"Confirm Issue"}</Btn>
      </>}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:14}}>
        <span style={{fontSize:22}}>{getCategoryEmoji(material?.category)}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{material?.name}</div>
          <div style={{fontSize:10.5,color:T.t4}}>{material?.location} · ₹{fmtN(material?.rate)}/{material?.unit}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9.5,color:T.t4,marginBottom:1}}>Available</div>
          <div style={{fontSize:18,fontWeight:800,color:T.grn}}>{fmtN(max)} <span style={{fontSize:11,fontWeight:400}}>{material?.unit}</span></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
        <Field label="Project">
          <SearchSelect compact value={f.project_id} options={projects} onChange={v=>setF(p=>({...p,project_id:v}))} placeholder="Select project"/>
        </Field>
        <Field label="Issued To">
          <SearchSelect compact value={f.issued_to} options={users} onChange={v=>setF(p=>({...p,issued_to:v}))} placeholder="Person on site"/>
        </Field>
      </div>
      <Field label={`Quantity (${material?.unit}) *`} style={{marginBottom:11}}>
        <Input type="number" value={f.qty} onChange={e=>setF(p=>({...p,qty:e.target.value}))} placeholder={`Max ${max}`} max={max}
          accent={overStock?T.red:T.amb}
          style={{borderColor:overStock?T.red:T.b1,color:overStock?T.red:T.t1}}/>
        {Number(f.qty)>0&&!overStock&&<div style={{fontSize:11,color:T.amb,marginTop:3}}>Value: ₹{fmtN(Number(f.qty)*(material?.rate||0))}</div>}
        {overStock&&<div style={{fontSize:11,color:T.red,marginTop:3}}>⚠ Exceeds available stock</div>}
      </Field>
      <Field label="Remarks">
        <Input value={f.remarks} onChange={e=>setF(p=>({...p,remarks:e.target.value}))} placeholder="e.g. GF slab casting..."/>
      </Field>
    </ModalShell>
  );
}

// ── MATERIAL DETAIL DRAWER (movement history) ─────────────────────
function MaterialDetailDrawer({material,onClose,onEdit,onDelete,onIssue,onAddStock}){
  const [history,setHistory]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!material)return;
    setLoading(true);
    api.get(`/warehouse/materials/${material.id}/history`).then(r=>{
      if(r.success) setHistory(r.data||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[material]);
  const totalIn=history.filter(h=>h.type==="in").reduce((s,h)=>s+Number(h.qty||0),0);
  const totalOut=history.filter(h=>h.type==="out").reduce((s,h)=>s+Number(h.qty||0),0);
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,96vw)",background:T.surface,zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease-out"}}>
        <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>{getCategoryEmoji(material.category)}</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"white"}}>{material.name}</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{material.category} · {material.location}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>

        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,flexShrink:0,background:T.surfaceB}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            <div><div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Stock</div>
              <div style={{fontSize:18,fontWeight:800,color:material.qty<=0?T.red:material.qty<material.minQty?T.amb:T.t1}}>{fmtN(material.qty)} <span style={{fontSize:10.5,fontWeight:400,color:T.t4}}>{material.unit}</span></div></div>
            <div><div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Total In</div>
              <div style={{fontSize:18,fontWeight:700,color:T.grn}}>{fmtN(totalIn)}</div></div>
            <div><div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Total Out</div>
              <div style={{fontSize:18,fontWeight:700,color:T.amb}}>{fmtN(totalOut)}</div></div>
            <div><div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Value</div>
              <div style={{fontSize:18,fontWeight:700,color:T.blu}}>₹{fmt(material.qty*material.rate)}</div></div>
          </div>
        </div>

        <div style={{padding:"10px 18px",borderBottom:`1px solid ${T.b1}`,flexShrink:0,display:"flex",gap:7,flexWrap:"wrap"}}>
          <Btn onClick={()=>onIssue(material)} c={T.amb} icon={IcOut} size="sm">Issue</Btn>
          <Btn onClick={()=>onAddStock(material)} c={T.grn} icon={IcIn} size="sm">Add Stock</Btn>
          <GhostBtn onClick={()=>onEdit(material)} icon={IcEdit} c={T.blu}>Edit</GhostBtn>
          <GhostBtn onClick={()=>onDelete(material)} icon={IcTrash} c={T.red}>Delete</GhostBtn>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"12px 18px"}}>
          <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <IcHist size={12} color={T.t3}/> Movement history ({history.length})
          </div>
          {loading&&<div style={{textAlign:"center",padding:"30px 0",color:T.t4,fontSize:12}}>Loading...</div>}
          {!loading&&history.length===0&&<Empty label="Koi movement nahi" sub="Iss material par GRN ya issue nahi hua"/>}
          {!loading&&history.map((h,i)=>(
            <div key={i} style={{padding:"10px 13px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:7,borderLeft:`3px solid ${h.type==="in"?T.grn:T.amb}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Pill label={h.type==="in"?"GRN":"Issue"} c={h.type==="in"?T.grn:T.amb} bg={h.type==="in"?T.grnL:T.ambL} brd={h.type==="in"?T.grnM:T.ambM}/>
                  <span style={{fontSize:11,fontWeight:700,color:h.type==="in"?T.grn:T.amb,fontFamily:"monospace"}}>{h.doc_no}</span>
                  <span style={{fontSize:10.5,color:T.t4}}>{fmtDate(h.date)}</span>
                </div>
                <span style={{fontSize:14,fontWeight:800,color:h.type==="in"?T.grn:T.amb}}>{h.type==="in"?"+":"-"}{fmtN(h.qty)} {material.unit}</span>
              </div>
              <div style={{fontSize:11,color:T.t3,display:"flex",gap:10,flexWrap:"wrap"}}>
                {h.project_name&&<span>📁 {h.project_name}</span>}
                {h.vendor&&<span>🏢 {h.vendor}</span>}
                {h.po_no&&<span>PO: {h.po_no}</span>}
                {h.to_name&&<span>➡ {h.to_name}</span>}
                {h.by_name&&<span>by {h.by_name}</span>}
                {h.rate>0&&<span>@ ₹{fmtN(h.rate)}</span>}
              </div>
              {h.remarks&&<div style={{marginTop:4,fontSize:11,color:T.t4,fontStyle:"italic"}}>"{h.remarks}"</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── STOCK TAB ─────────────────────────────────────────────────────
function StockTab({stock,onSelect,onAddMaterial}){
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("All");
  const [showLow,setShowLow]=useState(false);
  const [view,setView]=useState("grid");

  const filtered=stock.filter(m=>{
    if(cat!=="All"&&m.category!==cat) return false;
    if(showLow&&m.qty>=m.minQty) return false;
    if(search&&!m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStockStatus=(m)=>{
    if(m.qty===0) return{label:"Out",c:T.red,bg:T.redL,brd:T.redM};
    if(m.qty<m.minQty) return{label:"Low",c:T.amb,bg:T.ambL,brd:T.ambM};
    if(m.maxQty&&m.qty>m.maxQty*0.8) return{label:"High",c:T.grn,bg:T.grnL,brd:T.grnM};
    return{label:"Normal",c:T.blu,bg:T.bluL,brd:T.bluM};
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material..."
            style={{width:"100%",height:32,padding:"0 9px 0 28px",borderRadius:7,border:`1.5px solid ${search?T.blu:T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)}
          style={{height:32,padding:"0 10px",borderRadius:7,border:`1.5px solid ${cat!=="All"?T.blu:T.b1}`,background:cat!=="All"?T.bluL:T.surface,fontSize:12,color:cat!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {CATEGORIES_ALL.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={()=>setShowLow(s=>!s)}
          style={{height:32,padding:"0 11px",borderRadius:7,border:`1.5px solid ${showLow?T.red:T.b1}`,background:showLow?T.redL:T.surface,color:showLow?T.red:T.t3,fontSize:12,fontWeight:showLow?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <IcAlert size={12} color={showLow?T.red:T.t4}/> Low Only
        </button>
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["grid","⊞"],["list","☰"]].map(([id,ico])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{width:26,height:26,borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {ico}
            </button>
          ))}
        </div>
        <Btn onClick={onAddMaterial} c={T.blu} icon={IcAdd} size="sm">New Material</Btn>
      </div>

      <div style={{fontSize:11,color:T.t4,marginBottom:10}}>
        {filtered.length} items · {filtered.filter(m=>m.qty<m.minQty).length} below minimum
        {cat!=="All"&&<span style={{marginLeft:6,background:T.bluL,color:T.blu,fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.bluM}`}}>{cat}</span>}
      </div>

      {filtered.length===0&&(
        <Empty label={stock.length===0?"Stock me kuch nahi":"Filter ke andar koi item nahi"}
          sub={stock.length===0?"\"New Material\" se SKU add karke shuru karein":""}/>
      )}

      {view==="grid"&&filtered.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {filtered.map(m=>{
            const ss=getStockStatus(m);
            const pct=m.maxQty?Math.min(100,(m.qty/m.maxQty)*100):0;
            const barColor=m.qty===0?T.red:m.qty<m.minQty?T.amb:T.grn;
            const val=m.qty*m.rate;
            return(
              <div key={m.id} onClick={()=>onSelect(m)}
                style={{background:T.surface,borderRadius:10,border:`1.5px solid ${m.qty<m.minQty?T.ambM:T.b1}`,padding:"13px 14px",cursor:"pointer",transition:"all .15s",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.bluM;e.currentTarget.style.boxShadow="0 0 0 3px rgba(37,99,235,0.08)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=m.qty<m.minQty?T.ambM:T.b1;e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.05)";}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",minWidth:0,flex:1}}>
                    <span style={{fontSize:20}}>{getCategoryEmoji(m.category)}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:9.5,color:T.t4,fontFamily:"monospace"}}>#{m.id}</div>
                      <div style={{fontSize:12.5,fontWeight:600,color:T.t1,lineHeight:1.3,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                    </div>
                  </div>
                  <Pill label={ss.label} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                </div>
                <div style={{margin:"10px 0 6px",display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:26,fontWeight:800,color:m.qty<m.minQty?T.red:T.t1,letterSpacing:"-1px"}}>{fmtN(m.qty)}</span>
                  <span style={{fontSize:12,color:T.t4,fontWeight:500}}>{m.unit}</span>
                </div>
                <PBar pct={pct} color={barColor} h={5}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{fontSize:9.5,color:T.t4}}>Min: {fmtN(m.minQty)}</span>
                  <span style={{fontSize:9.5,color:T.t4}}>Max: {fmtN(m.maxQty)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:9,borderTop:`1px solid ${T.b1}`}}>
                  <div>
                    <div style={{fontSize:9.5,color:T.t4,marginBottom:1}}>Value</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:T.blu}}>₹{fmt(val)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9.5,color:T.t4,marginBottom:1}}>{m.location||"—"}</div>
                    <div style={{fontSize:10,color:T.t3}}>@₹{fmtN(m.rate)}/{m.unit}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view==="list"&&filtered.length>0&&(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"60px 1fr 130px 90px 80px 90px 100px 70px",padding:"7px 14px",background:T.sb,gap:8}}>
            {["Code","Material","Category","Stock","Unit","Min","Value","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {filtered.map(m=>{
            const ss=getStockStatus(m);
            return(
              <div key={m.id} onClick={()=>onSelect(m)}
                style={{display:"grid",gridTemplateColumns:"60px 1fr 130px 90px 80px 90px 100px 70px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",borderLeft:`3px solid ${ss.c}44`,gap:8}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:10.5,color:T.t4,fontFamily:"monospace"}}>#{m.id}</span>
                <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                  <span style={{fontSize:15}}>{getCategoryEmoji(m.category)}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                    <div style={{fontSize:10,color:T.t4}}>{m.location||"—"}</div>
                  </div>
                </div>
                <span style={{fontSize:11,color:T.t3}}>{m.category}</span>
                <span style={{fontSize:13,fontWeight:700,color:m.qty<m.minQty?T.red:T.t1}}>{fmtN(m.qty)}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{m.unit}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{fmtN(m.minQty)}</span>
                <span style={{fontSize:12.5,fontWeight:600,color:T.blu}}>₹{fmt(m.qty*m.rate)}</span>
                <Pill label={ss.label} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── GRN TAB ────────────────────────────────────────────────────────
function GrnTab({grns,onNew,onVerify}){
  const [sel,setSel]=useState(null);
  const STATUS_S={"Verified":{c:T.grn,bg:T.grnL,brd:T.grnM},"Partial":{c:T.amb,bg:T.ambL,brd:T.ambM},"Pending":{c:T.slt,bg:T.sltL,brd:T.b2}};
  return(
    <div style={{display:"flex",gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:600,color:T.t2}}>{grns.length} Receipts</span>
          <Btn onClick={onNew} c={T.blu} icon={IcAdd} size="sm">New GRN</Btn>
        </div>
        {grns.length===0?<Empty label="Koi GRN nahi" sub="Naya GRN bana ke material receive karein"/>:(
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 110px 100px 90px",padding:"7px 14px",background:T.sb,gap:8}}>
              {["GRN No","Date","Vendor","PO No","Total","Status"].map((h,i)=>(
                <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
              ))}
            </div>
            {grns.map(g=>{
              const ss=STATUS_S[g.status]||STATUS_S["Pending"];
              const isS=sel?.id===g.id;
              return(
                <div key={g.id} onClick={()=>setSel(isS?null:g)}
                  style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 110px 100px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",background:isS?T.bluL:"transparent",borderLeft:isS?`3px solid ${T.blu}`:"3px solid transparent",gap:8}}
                  onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                  onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="transparent";}}>
                  <span style={{fontSize:11.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{g.id}</span>
                  <span style={{fontSize:11.5,color:T.t3}}>{g.date}</span>
                  <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.vendor}</span>
                  <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{g.poNo}</span>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(g.total)}</span>
                  <Pill label={g.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {sel&&(
        <div style={{width:340,flexShrink:0,background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 220px)"}}>
          <div style={{background:T.sb,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>{sel.id}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{sel.vendor} · {sel.date}</div>
            </div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          <div style={{padding:"11px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,flexShrink:0}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["PO Number",sel.poNo],["Received By",sel.by],["Total",`₹${fmtN(sel.total)}`],["Status",sel.status]].map(([l,v],i)=>(
                <div key={i}><div style={{fontSize:9,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
            <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Items Received</div>
            {sel.items.map((it,i)=>(
              <div key={i} style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,marginBottom:7}}>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:5}}>{it.name}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                  {[["Ordered",`${fmtN(it.ordQty)} ${it.unit}`],["Received",`${fmtN(it.recQty)} ${it.unit}`],["Amount",`₹${fmtN(it.amount)}`]].map(([l,v],j)=>(
                    <div key={j}><div style={{fontSize:9,color:T.t4,marginBottom:1}}>{l}</div>
                      <div style={{fontSize:11.5,fontWeight:600,color:j===1&&it.recQty<it.ordQty?T.amb:T.t1}}>{v}</div></div>
                  ))}
                </div>
                {it.recQty<it.ordQty&&<div style={{marginTop:5,fontSize:10,color:T.amb,fontWeight:600}}>⚠ Short by {fmtN(it.ordQty-it.recQty)} {it.unit}</div>}
              </div>
            ))}
          </div>
          <div style={{padding:"10px 14px",borderTop:`1px solid ${T.b1}`,flexShrink:0,display:"flex",gap:7}}>
            {sel.status!=="Verified"&&(
              <Btn onClick={()=>{onVerify(sel.dbId);setSel(null);}} c={T.grn} icon={IcChk} size="sm" style={{flex:1}}>Verify & Accept</Btn>
            )}
            {sel.status==="Verified"&&(
              <div style={{flex:1,padding:"7px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:700,textAlign:"center"}}>✓ Verified</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ISSUE TAB ──────────────────────────────────────────────────────
function IssueTab({issues,projects,onNew}){
  const [sel,setSel]=useState(null);
  const [fProj,setFProj]=useState(null);
  const filtered=fProj?issues.filter(i=>i.project_id===fProj):issues;
  return(
    <div style={{display:"flex",gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <div style={{minWidth:200,maxWidth:260,flex:1}}>
            <SearchSelect compact value={fProj} options={[{id:null,name:"All projects"},...projects]} onChange={v=>setFProj(v)} placeholder="Filter by project"/>
          </div>
          <span style={{fontSize:11,color:T.t4}}>{filtered.length} issues</span>
          <div style={{flex:1}}/>
          <Btn onClick={onNew} c={T.amb} icon={IcOut} size="sm">Issue Material</Btn>
        </div>
        {filtered.length===0?<Empty label="Koi issue nahi" sub="Stock se material project ko bhejne ke liye Issue Material click karein"/>:(
          <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 130px 110px 90px",padding:"7px 14px",background:T.sb,gap:8}}>
              {["Issue No","Date","Project","Issued To","Total","By"].map((h,i)=>(
                <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
              ))}
            </div>
            {filtered.map(iss=>{
              const isS=sel?.id===iss.id;
              return(
                <div key={iss.id} onClick={()=>setSel(isS?null:iss)}
                  style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 130px 110px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",background:isS?T.ambL:"transparent",borderLeft:`3px solid ${isS?T.amb:T.amb+"33"}`,gap:8}}
                  onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                  onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="transparent";}}>
                  <span style={{fontSize:11.5,fontWeight:700,color:T.amb,fontFamily:"monospace"}}>{iss.id}</span>
                  <span style={{fontSize:11.5,color:T.t3}}>{iss.date}</span>
                  <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{iss.project}</span>
                  <span style={{fontSize:11.5,color:T.t2}}>{iss.issuedTo}</span>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(iss.total)}</span>
                  <span style={{fontSize:11.5,color:T.t3}}>{iss.by}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {sel&&(
        <div style={{width:320,flexShrink:0,background:T.surface,borderRadius:9,border:`1px solid ${T.ambM}`,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 220px)"}}>
          <div style={{background:T.sb,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div><div style={{fontSize:13,fontWeight:700,color:"white"}}>{sel.id}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{sel.project} · {sel.date}</div></div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"11px 14px"}}>
            {sel.remarks&&<div style={{marginBottom:10,padding:"8px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>Remarks</div>
              <div style={{fontSize:12,color:T.t2,fontStyle:"italic"}}>"{sel.remarks}"</div>
            </div>}
            <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Items Issued</div>
            {sel.items.map((it,i)=>(
              <div key={i} style={{padding:"8px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.name}</div>
                  <div style={{fontSize:10.5,color:T.t4}}>{fmtN(it.qty)} {it.unit} @ ₹{fmtN(it.rate)}</div></div>
                <div style={{fontSize:13,fontWeight:700,color:T.amb}}>₹{fmt(it.qty*it.rate)}</div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 11px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,marginTop:8}}>
              <span style={{fontSize:12,fontWeight:700,color:T.amb}}>Total Issued</span>
              <span style={{fontSize:14,fontWeight:800,color:T.amb}}>₹{fmtN(sel.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MR TAB ────────────────────────────────────────────────────────
function MRTab({mrs,onNew,onIssue,onApprove,onReject}){
  const [fStatus,setFStatus]=useState("All");
  const STATUS_S={"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM},"Approved":{c:T.blu,bg:T.bluL,brd:T.bluM},"Issued":{c:T.grn,bg:T.grnL,brd:T.grnM},"Partial":{c:T.blu,bg:T.bluL,brd:T.bluM},"Rejected":{c:T.red,bg:T.redL,brd:T.redM}};
  const PRIO_S={"High":{c:T.red,bg:T.redL},"Medium":{c:T.amb,bg:T.ambL},"Low":{c:T.slt,bg:T.sltL}};
  const filtered=mrs.filter(m=>fStatus==="All"||m.status===fStatus);
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        {["All","Pending","Approved","Issued","Rejected"].map(s=>(
          <button key={s} onClick={()=>setFStatus(s)}
            style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${fStatus===s?(STATUS_S[s]?.brd||T.blu):T.b1}`,background:fStatus===s?(STATUS_S[s]?.bg||T.bluL):"none",color:fStatus===s?(STATUS_S[s]?.c||T.blu):T.t3,fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {s} {s!=="All"&&<span style={{marginLeft:3,fontWeight:800}}>{mrs.filter(m=>m.status===s).length}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <Btn onClick={onNew} c={T.pur} icon={IcMR} size="sm">New MR</Btn>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0&&<Empty label="Koi material request nahi" sub="Project ke liye material maange ke liye New MR click karein"/>}
        {filtered.map(mr=>{
          const ss=STATUS_S[mr.status]||STATUS_S["Pending"];
          const ps=PRIO_S[mr.priority]||PRIO_S["Medium"];
          return(
            <div key={mr.id} style={{background:T.surface,borderRadius:9,border:`1px solid ${mr.status==="Pending"?T.ambM:T.b1}`,overflow:"hidden",boxShadow:mr.status==="Pending"?"0 2px 8px rgba(217,119,6,0.08)":"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"flex-start",gap:12,borderLeft:`4px solid ${ss.c}`,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{mr.id}</span>
                    <Pill label={mr.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                    <Pill label={mr.priority} c={ps.c} bg={ps.bg}/>
                    <span style={{fontSize:10.5,color:T.t4}}>{mr.date}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1,marginBottom:3}}>{mr.project}</div>
                  <div style={{fontSize:11,color:T.t4}}>by {mr.requestedBy}</div>
                </div>
                <div style={{minWidth:200,maxWidth:280,flex:1}}>
                  {mr.items.slice(0,4).map((it,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{it.material_name||it.name}</span>
                      <span style={{fontSize:11.5,fontWeight:600,color:T.t1,flexShrink:0,marginLeft:6}}>{fmtN(it.qty)} {it.unit}</span>
                    </div>
                  ))}
                  {mr.items.length>4&&<div style={{fontSize:10.5,color:T.t4}}>+{mr.items.length-4} more</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                  {mr.status==="Pending"&&(
                    <>
                      <Btn onClick={()=>onApprove(mr.dbId)} c={T.blu} size="sm" icon={IcChk}>Approve</Btn>
                      <Btn onClick={()=>onIssue(mr)} c={T.amb} size="sm" icon={IcOut}>Issue</Btn>
                      <GhostBtn onClick={()=>onReject(mr.dbId)} c={T.red} icon={IcXc}>Reject</GhostBtn>
                    </>
                  )}
                  {mr.status==="Approved"&&(
                    <Btn onClick={()=>onIssue(mr)} c={T.amb} size="sm" icon={IcOut}>Issue Now</Btn>
                  )}
                  {mr.status==="Issued"&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`}}>
                      <IcChk size={12} color={T.grn}/>
                      <span style={{fontSize:11.5,color:T.grn,fontWeight:600}}>Issued</span>
                    </div>
                  )}
                  {mr.status==="Rejected"&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`}}>
                      <span style={{fontSize:11.5,color:T.red,fontWeight:600}}>Rejected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TRANSFERS TAB ──────────────────────────────────────────────────
function TransfersTab({transfers,onNew,onSelect}){
  const [fStatus,setFStatus]=useState("All");
  const STATUS_S={
    "Pending":  {c:T.amb,bg:T.ambL,brd:T.ambM},
    "Partial":  {c:T.blu,bg:T.bluL,brd:T.bluM},
    "Completed":{c:T.grn,bg:T.grnL,brd:T.grnM},
  };
  const filtered=fStatus==="All"?transfers:transfers.filter(t=>t.status===fStatus);
  const pendingCount=transfers.filter(t=>t.status==="Pending").length;
  const partialCount=transfers.filter(t=>t.status==="Partial").length;

  return(
    <div>
      {pendingCount>0&&(
        <div style={{padding:"10px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,marginBottom:11,display:"flex",alignItems:"center",gap:10}}>
          <IcAlert size={14} color={T.amb}/>
          <span style={{fontSize:12,color:T.amb,fontWeight:700}}>
            {pendingCount} transfer{pendingCount>1?"s":""} pending receive — destination site se acknowledge hona baki hai
          </span>
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:600,color:T.t2}}>{filtered.length} Transfers</span>
        {["All","Pending","Partial","Completed"].map(s=>(
          <button key={s} onClick={()=>setFStatus(s)}
            style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${fStatus===s?(STATUS_S[s]?.brd||T.blu):T.b1}`,background:fStatus===s?(STATUS_S[s]?.bg||T.bluL):"none",color:fStatus===s?(STATUS_S[s]?.c||T.blu):T.t3,fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {s} {s!=="All"&&<span style={{marginLeft:3,fontWeight:800}}>{transfers.filter(t=>t.status===s).length}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <Btn onClick={onNew} c={T.cyn} icon={IcTrns} size="sm">New Transfer</Btn>
      </div>
      {filtered.length===0?<Empty label="Koi transfer nahi" sub="Ek project se dusre project me material bhejne ke liye New Transfer click karein"/>:(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"100px 80px 1fr 1fr 100px 95px 100px",padding:"7px 14px",background:T.sb,gap:8}}>
            {["Transfer No","Date","From Project","To Project","Value","By","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px",textAlign:i===4?"right":"left"}}>{h}</span>
            ))}
          </div>
          {filtered.map(t=>{
            const ss=STATUS_S[t.status]||STATUS_S["Pending"];
            return(
            <div key={t.id} onClick={()=>onSelect(t)}
              style={{display:"grid",gridTemplateColumns:"100px 80px 1fr 1fr 100px 95px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s",cursor:"pointer",gap:8,borderLeft:`3px solid ${ss.c}`}}
              onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"77"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11.5,fontWeight:700,color:T.cyn,fontFamily:"monospace"}}>{t.id}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{t.date}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.from}</div>
                <div style={{fontSize:10,color:T.t4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{(t.items||[]).map(i=>`${i.material_name||i.name} ×${fmtN(i.qty)} ${i.unit||""}`).join(", ")}</div>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.to}</span>
              <span style={{fontSize:12,fontWeight:700,color:T.cyn,textAlign:"right"}}>₹{fmt(t.total_value||0)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{t.by}</span>
              <Pill label={t.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TRANSFER DETAIL DRAWER ────────────────────────────────────────
function TransferDetailDrawer({transfer,onClose,canDelete,canReceive,onDeleted,onReceived}){
  const [detail,setDetail]=useState(transfer);
  const [loading,setLoading]=useState(true);
  const [deleting,setDeleting]=useState(false);
  const [receiveOpen,setReceiveOpen]=useState(false);
  const [receiveItems,setReceiveItems]=useState([]);
  const [receiving,setReceiving]=useState(false);

  useEffect(()=>{
    if(!transfer?.dbId)return;
    setLoading(true);
    api.get(`/warehouse/transfers/${transfer.dbId}`).then(r=>{
      if(r.success){
        const d={...r.data,id:r.data.transfer_no,dbId:r.data.id,date:fmtDate(r.data.date),from:r.data.from_project_name||r.data.from_location,to:r.data.to_project_name||r.data.to_location,by:r.data.transferred_by_name};
        setDetail(d);
        setReceiveItems((r.data.items||[]).map(it=>({id:it.id,material_name:it.material_name,unit:it.unit,qty:Number(it.qty),received_qty:Number(it.qty)})));
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[transfer?.dbId]);

  const handleDelete=async()=>{
    if(!window.confirm(`${detail.id} ko delete karein?\n\nSource project ka debit reverse hoga.${detail.status!=="Pending"?" Dest project ka GRN bhi hatega.":""}\nYeh undo nahi ho sakta.`)) return;
    setDeleting(true);
    const r=await api.del(`/warehouse/transfers/${detail.dbId}`);
    setDeleting(false);
    if(r.success){onDeleted&&onDeleted();onClose();}
    else alert(r.message||"Delete failed");
  };

  const handleReceive=async()=>{
    setReceiving(true);
    const items=receiveItems.map(it=>({id:it.id,received_qty:Number(it.received_qty||0)}));
    const r=await api.post(`/warehouse/transfers/${detail.dbId}/receive`,{items});
    setReceiving(false);
    if(r.success){
      onReceived&&onReceived();
      // refresh detail
      api.get(`/warehouse/transfers/${detail.dbId}`).then(rr=>{
        if(rr.success){
          const d={...rr.data,id:rr.data.transfer_no,dbId:rr.data.id,date:fmtDate(rr.data.date),from:rr.data.from_project_name||rr.data.from_location,to:rr.data.to_project_name||rr.data.to_location,by:rr.data.transferred_by_name};
          setDetail(d);
          setReceiveOpen(false);
        }
      });
    }
    else alert(r.message||"Receive failed");
  };

  const items=detail?.items||[];
  const totalQty=items.reduce((s,i)=>s+Number(i.qty||0),0);
  const totalValue=items.reduce((s,i)=>s+Number(i.qty||0)*Number(i.rate||0),0);
  const isPending=detail?.status==="Pending";
  const isPartial=detail?.status==="Partial";
  const isCompleted=detail?.status==="Completed";
  const STATUS_S={"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM},"Partial":{c:T.blu,bg:T.bluL,brd:T.bluM},"Completed":{c:T.grn,bg:T.grnL,brd:T.grnM}};
  const ss=STATUS_S[detail?.status]||STATUS_S["Pending"];

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,96vw)",background:T.surface,zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease-out"}}>
        <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:T.cyn+"33",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IcTrns size={15} color="#fff"/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"white",fontFamily:"monospace"}}>{detail?.id||transfer?.id}</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>Project-to-Project Transfer · {detail?.date||transfer?.date}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>

        {loading?(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.t4,fontSize:13}}>Loading...</div>
        ):(
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
            {/* Status banner — pending dominant */}
            {isPending&&(
              <div style={{padding:"11px 14px",background:T.ambL,border:`1.5px solid ${T.ambM}`,borderRadius:8,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⏳</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:T.amb}}>Pending receive at {detail.to}</div>
                  <div style={{fontSize:11,color:T.amb,marginTop:2}}>Source ({detail.from}) ka debit ho chuka hai. Site wala physically receive karke "Receive" click karega tab dest inventory me add hoga.</div>
                </div>
              </div>
            )}
            {isPartial&&(
              <div style={{padding:"11px 14px",background:T.bluL,border:`1.5px solid ${T.bluM}`,borderRadius:8,marginBottom:12}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.blu}}>📦 Partially received</div>
                <div style={{fontSize:11,color:T.blu,marginTop:2}}>Kuch items kam aaye. Received_qty per item neeche dekho.</div>
              </div>
            )}

            {/* Route card */}
            <div style={{padding:"14px 16px",background:`linear-gradient(135deg, ${T.bluL} 0%, ${T.cynL} 100%)`,borderRadius:10,border:`1px solid ${T.cynM}`,marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:14,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>From Project</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{detail?.from||"—"}</div>
                  <div style={{fontSize:10.5,color:T.red,marginTop:3,fontWeight:600}}>− DEBIT (immediate)</div>
                </div>
                <div style={{color:T.cyn,fontSize:24,fontWeight:800}}>→</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>To Project</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{detail?.to||"—"}</div>
                  <div style={{fontSize:10.5,color:isCompleted?T.grn:isPartial?T.blu:T.amb,marginTop:3,fontWeight:600}}>
                    {isCompleted?"+ CREDITED":isPartial?"⚠ PARTIAL":"⏳ PENDING RECEIVE"}
                  </div>
                </div>
              </div>
            </div>

            {/* Meta grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Status</div>
                <Pill label={detail?.status||"Pending"} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
              <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Transferred By</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{detail?.by||"—"}</div>
              </div>
              <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{detail?.received_at?"Received":"Created"}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1}}>
                  {detail?.received_at?(<>{detail.received_by_name||"—"}<div style={{fontSize:10,color:T.t4,fontWeight:400}}>{fmtDate(detail.received_at)}</div></>):fmtDate(detail?.created_at)}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",justifyContent:"space-between"}}>
              <span>Items ({items.length})</span>
              <span style={{textTransform:"none",letterSpacing:0,color:T.t1,fontWeight:700}}>Qty: {fmtN(totalQty)} · Value: ₹{fmtN(totalValue)}</span>
            </div>
            <div style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 50px 70px 70px 80px 80px",padding:"7px 11px",background:T.sb,gap:8}}>
                {["Material","Unit","Qty","Rate","Value","Received"].map((h,i)=>(
                  <span key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".3px",textAlign:i>=2?"right":"left"}}>{h}</span>
                ))}
              </div>
              {items.map((it,i)=>{
                const recvD=it.received_qty!=null?Number(it.received_qty):null;
                const short=recvD!=null&&recvD<Number(it.qty);
                return(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 50px 70px 70px 80px 80px",padding:"9px 11px",gap:8,borderBottom:i<items.length-1?`1px solid ${T.b1}`:"none",background:i%2?"#fff":T.surfaceB,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.material_name||it.name}</span>
                  <span style={{fontSize:11,color:T.t3}}>{it.unit||"—"}</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.cyn,textAlign:"right"}}>{fmtN(it.qty)}</span>
                  <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>₹{fmtN(it.rate||0)}</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.cyn,textAlign:"right"}}>₹{fmt(Number(it.qty||0)*Number(it.rate||0))}</span>
                  <span style={{fontSize:12,fontWeight:700,color:recvD==null?T.t4:short?T.amb:T.grn,textAlign:"right"}}>
                    {recvD==null?"—":short?`${fmtN(recvD)}/${fmtN(it.qty)}`:`✓ ${fmtN(recvD)}`}
                  </span>
                </div>
                );
              })}
            </div>

            {/* Receive editor */}
            {receiveOpen&&isPending&&(
              <div style={{padding:"12px 14px",background:T.grnL,border:`2px solid ${T.grnM}`,borderRadius:9,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:T.grn,marginBottom:8}}>📥 Receive at {detail.to}</div>
                <div style={{fontSize:11,color:T.t3,marginBottom:10}}>Actual received qty edit kar sakte ho (kam aaya to "Partial" status milega)</div>
                {receiveItems.map((it,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:8,marginBottom:7,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.material_name}</div>
                      <div style={{fontSize:10.5,color:T.t4}}>Sent: {fmtN(it.qty)} {it.unit}</div>
                    </div>
                    <input type="number" value={it.received_qty} max={it.qty}
                      onChange={e=>{const v=e.target.value;setReceiveItems(p=>p.map((x,j)=>j===i?{...x,received_qty:v}:x));}}
                      style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"right"}}/>
                  </div>
                ))}
                <div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>
                  <GhostBtn onClick={()=>setReceiveOpen(false)}>Cancel</GhostBtn>
                  <Btn onClick={handleReceive} disabled={receiving} c={T.grn} icon={IcChk} size="sm">
                    {receiving?"Saving...":"Confirm Receive (creates GRN)"}
                  </Btn>
                </div>
              </div>
            )}

            {/* Ledger note */}
            {detail?.from_project_id&&detail?.to_project_id&&(
              <div style={{padding:"10px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:11.5,color:T.blu}}>
                <div style={{fontWeight:700,marginBottom:3}}>📊 Material Ledger pe asar:</div>
                <div style={{fontSize:11,lineHeight:1.5}}>
                  • <b>{detail.from}</b> ke ledger me ye items "Used" me dikh chuke hain (debit, with rate &amp; value in remark)<br/>
                  • <b>{detail.to}</b> me {isPending?<span><b>abhi nahi</b> dikh raha — receive karne par GRN banega</span>:<span><b>{detail.id}</b> ek GRN ki tarah dikh raha hai (credit)</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <span style={{fontSize:10.5,color:T.t4}}>
            {isPending?"Site receive baki":isCompleted?"All received":""}
          </span>
          <div style={{display:"flex",gap:8}}>
            <GhostBtn onClick={onClose}>Close</GhostBtn>
            {isPending&&canReceive&&!receiveOpen&&(
              <Btn onClick={()=>setReceiveOpen(true)} c={T.grn} icon={IcIn} size="sm">Receive at {detail?.to}</Btn>
            )}
            {canDelete&&(
              <Btn onClick={handleDelete} disabled={deleting} c={T.red} icon={IcTrash} size="sm">
                {deleting?"Deleting...":"Delete & Reverse"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── WAREHOUSE MODULE ──────────────────────────────────────────────
function WarehouseModule(){
  const [tab,setTab]=useState("stock");
  const [stock,setStock]=useState([]);
  const [grns,setGrns]=useState([]);
  const [issues,setIssues]=useState([]);
  const [mrs,setMrs]=useState([]);
  const [transfers,setTransfers]=useState([]);
  const [projects,setProjects]=useState([]);
  const [users,setUsers]=useState([]);
  const [library,setLibrary]=useState([]);
  const [loading,setLoading]=useState(true);

  // Modal state
  const [matModalOpen,setMatModalOpen]=useState(null); // { material? } or {} to create
  const [addStockTarget,setAddStockTarget]=useState(null);
  const [issueTarget,setIssueTarget]=useState(null);    // single material quick issue
  const [grnNewOpen,setGrnNewOpen]=useState(false);
  const [issueNewOpen,setIssueNewOpen]=useState(false);
  const [mrNewOpen,setMrNewOpen]=useState(false);
  const [transferNewOpen,setTransferNewOpen]=useState(false);
  const [issueFromMR,setIssueFromMR]=useState(null);    // {mr} when issuing against MR
  const [matDetail,setMatDetail]=useState(null);
  const [transferDetail,setTransferDetail]=useState(null);

  // Current user (for admin-only actions)
  const meUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes((meUser?.role || "").toLowerCase());

  const loadAll=useCallback(async()=>{
    try{
      const [sRes,gRes,iRes,mRes,tRes,pRes,uRes,libRes]=await Promise.all([
        api.get("/warehouse/materials"),
        api.get("/warehouse/grn"),
        api.get("/warehouse/issues"),
        api.get("/warehouse/mr"),
        api.get("/warehouse/transfers"),
        api.get("/projects").catch(()=>({success:false})),
        api.get("/projects/team-members").catch(()=>({success:false})),
        api.get("/library/materials").catch(()=>({success:false})),
      ]);
      if(sRes.success) setStock((sRes.data||[]).map(m=>({...m,qty:Number(m.qty)||0,min_qty:Number(m.min_qty)||0,max_qty:Number(m.max_qty)||0,rate:Number(m.rate)||0,minQty:Number(m.min_qty)||0,maxQty:Number(m.max_qty)||0})));
      if(gRes.success) setGrns((gRes.data||[]).map(g=>({...g,id:g.grn_no||`GRN-${g.id}`,dbId:g.id,date:fmtDate(g.date),poNo:g.po_no||"—",vendor:g.vendor||"—",by:g.received_by_name||"—",total:Number(g.total)||0,items:(g.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,ordQty:Number(it.ordered_qty)||0,recQty:Number(it.received_qty)||0,rate:Number(it.rate)||0,amount:Number(it.amount)||0,unit:it.unit||""}))})));
      if(iRes.success) setIssues((iRes.data||[]).map(i=>({...i,id:i.issue_no||`ISS-${i.id}`,dbId:i.id,date:fmtDate(i.date),project:i.project_name||"—",issuedTo:i.issued_to_name||"—",by:i.issued_by_name||"—",total:Number(i.total)||0,remarks:i.remarks||"",items:(i.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,qty:Number(it.qty)||0,rate:Number(it.rate)||0,unit:it.unit||""}))})));
      if(mRes.success) setMrs((mRes.data||[]).map(m=>({...m,project:m.project_name||(m.project_id?"—":"Warehouse (internal)"),requestedBy:m.requested_by_name||"—",id:m.mr_no||`MR-${m.id}`,dbId:m.id,date:fmtDate(m.date),items:m.items||[]})));
      if(tRes.success) setTransfers((tRes.data||[]).map(t=>({...t,from:t.from_project_name||t.from_location||"—",to:t.to_project_name||t.to_location||"—",by:t.transferred_by_name||"—",id:t.transfer_no||`TRF-${t.id}`,dbId:t.id,date:fmtDate(t.date),items:t.items||[],total_value:Number(t.total_value)||0})));
      if(pRes.success) setProjects((pRes.data||[]).map(p=>({id:p.id,name:p.name})));
      if(uRes.success) setUsers((uRes.data||[]).map(u=>({id:u.id,name:u.name})));
      if(libRes.success) setLibrary((libRes.data||[]).map(m=>({id:m.id,name:m.name,unit:m.unit||"Nos",category:m.category_name||"",rate:Number(m.last_rate||m.base_rate||0)})));
    }catch(e){console.error("Warehouse load error:",e);}
    setLoading(false);
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

  const handleVerifyGRN=async(dbId)=>{
    const res=await api.patch(`/warehouse/grn/${dbId}`,{status:"Verified"});
    if(res.success) loadAll();
    else alert(res.message||"Verify failed");
  };
  const handleApproveMR=async(dbId)=>{
    const res=await api.patch(`/warehouse/mr/${dbId}`,{status:"Approved"});
    if(res.success) loadAll();
    else alert(res.message||"Approve failed");
  };
  const handleRejectMR=async(dbId)=>{
    if(!window.confirm("Yeh MR reject kar dein?")) return;
    const res=await api.patch(`/warehouse/mr/${dbId}`,{status:"Rejected"});
    if(res.success) loadAll();
    else alert(res.message||"Reject failed");
  };
  const handleDeleteMaterial=async(m)=>{
    if(!window.confirm(`"${m.name}" ko delete karein? Movements hue hain to backend block karega.`)) return;
    const res=await api.del(`/warehouse/materials/${m.id}`);
    if(res.success){setMatDetail(null);loadAll();}
    else alert(res.message||"Delete failed");
  };

  const lowStock=stock.filter(m=>m.qty<m.minQty);
  const outOfStock=stock.filter(m=>m.qty===0);
  const totalValue=stock.reduce((s,m)=>s+m.qty*m.rate,0);
  const totalItems=stock.length;
  const pendingMRs=mrs.filter(m=>m.status==="Pending").length;

  const TABS=[
    {id:"stock",  l:"Stock",         I:IcBox,  badge:lowStock.length>0?lowStock.length:null, bc:T.red},
    {id:"grn",    l:"Material In",   I:IcIn,   badge:null},
    {id:"issue",  l:"Material Out",  I:IcOut,  badge:null},
    {id:"mr",     l:"Requests",      I:IcMR,   badge:pendingMRs>0?pendingMRs:null, bc:T.amb},
    {id:"transfer",l:"Transfers",    I:IcTrns, badge:null},
  ];

  const TILE_DATA=[
    {l:"Total Items",    v:totalItems,       sub:`${[...new Set(stock.map(s=>s.category))].length} categories`,      c:T.blu, I:IcBox},
    {l:"Total Value",    v:`₹${fmt(totalValue)}`,  sub:"Current stock value",         c:T.grn, I:IcIn},
    {l:"Low Stock",      v:lowStock.length,  sub:`${outOfStock.length} out of stock`, c:lowStock.length>0?T.red:T.grn, I:IcAlert},
    {l:"Pending MRs",    v:pendingMRs, sub:"Need to be issued", c:pendingMRs>0?T.amb:T.grn, I:IcMR},
  ];

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:14}}>
      <div style={{width:36,height:36,border:"3px solid #E2E8F0",borderTopColor:"#1565C0",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:13,color:"#8896A6"}}>Loading Warehouse...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      <div style={{padding:"12px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILE_DATA.map((s,i)=><StatCard key={i} label={s.l} value={s.v} sub={s.sub} color={s.c} icon={s.I}/>)}
        </div>
      </div>

      {lowStock.length>0&&(
        <div style={{margin:"0 18px 6px",padding:"8px 13px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}>
          <IcAlert size={13} color={T.red}/>
          <span style={{fontSize:12,fontWeight:700,color:T.red}}>Low Stock:</span>
          <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
            {lowStock.slice(0,10).map(m=>(
              <button key={m.id} onClick={()=>{setTab("stock");setMatDetail(m);}}
                style={{background:T.red,color:"white",fontSize:10.5,fontWeight:600,padding:"2px 9px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
                {m.name} ({fmtN(m.qty)} {m.unit})
              </button>
            ))}
            {lowStock.length>10&&<span style={{fontSize:10.5,color:T.red,fontWeight:600}}>+{lowStock.length-10} more</span>}
          </div>
        </div>
      )}

      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:T.sb,borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"11px 13px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>
              <t.I size={13} color="currentColor"/>{t.l}
              {t.badge>0&&<span style={{background:t.bc||T.red,color:"white",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,minWidth:16,textAlign:"center"}}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 18px 16px"}}>
        {tab==="stock"&&<StockTab stock={stock} onSelect={m=>setMatDetail(m)} onAddMaterial={()=>setMatModalOpen({})}/>}
        {tab==="grn"&&<GrnTab grns={grns} onNew={()=>setGrnNewOpen(true)} onVerify={handleVerifyGRN}/>}
        {tab==="issue"&&<IssueTab issues={issues} projects={projects} onNew={()=>setIssueNewOpen(true)}/>}
        {tab==="mr"&&<MRTab mrs={mrs} onNew={()=>setMrNewOpen(true)} onIssue={mr=>setIssueFromMR(mr)} onApprove={handleApproveMR} onReject={handleRejectMR}/>}
        {tab==="transfer"&&<TransfersTab transfers={transfers} onNew={()=>setTransferNewOpen(true)} onSelect={t=>setTransferDetail(t)}/>}
      </div>

      {matDetail&&(
        <MaterialDetailDrawer material={matDetail}
          onClose={()=>setMatDetail(null)}
          onEdit={(m)=>{setMatDetail(null);setMatModalOpen({material:m});}}
          onDelete={handleDeleteMaterial}
          onIssue={(m)=>{setMatDetail(null);setIssueTarget(m);}}
          onAddStock={(m)=>{setMatDetail(null);setAddStockTarget(m);}}/>
      )}
      {matModalOpen&&(
        <MaterialFormModal material={matModalOpen.material} library={library} onClose={()=>setMatModalOpen(null)} onSaved={()=>loadAll()}/>
      )}
      {addStockTarget&&(
        <AddStockModal material={addStockTarget} onClose={()=>setAddStockTarget(null)} onSaved={()=>loadAll()}/>
      )}
      {issueTarget&&(
        <QuickIssueModal material={issueTarget} projects={projects} users={users}
          onClose={()=>setIssueTarget(null)} onSaved={()=>loadAll()}/>
      )}
      {grnNewOpen&&(
        <NewGRNModal stock={stock} projects={projects} users={users}
          onClose={()=>setGrnNewOpen(false)} onSaved={()=>loadAll()}/>
      )}
      {issueNewOpen&&(
        <NewIssueModal stock={stock} projects={projects} users={users}
          onClose={()=>setIssueNewOpen(false)} onSaved={()=>loadAll()}/>
      )}
      {mrNewOpen&&(
        <NewMRModal library={library}
          onClose={()=>setMrNewOpen(false)} onSaved={()=>loadAll()}/>
      )}
      {transferNewOpen&&(
        <NewTransferModal stock={stock} projects={projects}
          onClose={()=>setTransferNewOpen(false)} onSaved={()=>loadAll()}/>
      )}
      {transferDetail&&(
        <TransferDetailDrawer transfer={transferDetail}
          canDelete={isAdmin} canReceive={true}
          onClose={()=>setTransferDetail(null)}
          onDeleted={()=>loadAll()}
          onReceived={()=>loadAll()}/>
      )}
      {issueFromMR&&(
        <NewIssueModal stock={stock} projects={projects} users={users}
          fromMR={issueFromMR.dbId}
          prefill={{project_id:issueFromMR.project_id,remarks:`Against ${issueFromMR.id}`,items:issueFromMR.items}}
          onClose={()=>setIssueFromMR(null)} onSaved={()=>loadAll()}/>
      )}

      <style>{`
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

export default WarehouseModule;
