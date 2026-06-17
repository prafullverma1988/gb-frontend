import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import LibrarySelect from "../components/LibrarySelect";

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
const today=()=>new Date().toLocaleDateString('en-CA');
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
  // Lazy-load the library list when the parent's `library` prop is empty
  // (e.g. the initial /library/materials call failed during a backend
  // restart). Without this the dropdown shows "No options yet" until the
  // user reloads the whole page.
  const [localLib,setLocalLib]=useState([]);
  useEffect(()=>{
    if (editing) return;
    if (library.length > 0) return;
    let cancelled = false;
    api.get("/library/materials").then(r=>{
      if (cancelled) return;
      if (r?.success && Array.isArray(r.data)) {
        setLocalLib(r.data.map(m=>({
          id: m.id,
          name: m.name,
          unit: m.unit || "Nos",
          category: m.category_name || "",
          rate: Number(m.last_rate || m.base_rate || 0),
        })));
      }
    }).catch(()=>{});
    return () => { cancelled = true; };
  }, [editing, library.length]);
  const effectiveLib = library.length > 0 ? library : localLib;
  const [libPick,setLibPick]=useState(null);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const onLibPick=(v)=>{
    setLibPick(v);
    // SearchSelect normalizes keys to strings; library id is number — compare loosely
    const m=effectiveLib.find(l=>String(l.id)===String(v));
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

  const libOpts=effectiveLib.map(m=>({id:m.id,name:`${m.name} · ${m.unit||"Nos"}`}));
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
          {effectiveLib.length===0&&<div style={{fontSize:10.5,color:T.amb,marginTop:3}}>⚠ Library khali hai — Library → Materials me pehle add karein</div>}
          {fromLibrary&&(
            <div style={{marginTop:6,padding:"6px 10px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:6,fontSize:11.5,color:T.grn,display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:11}}>🔒</span>
              <span style={{fontWeight:700}}>{f.name}</span>
              <span style={{color:T.t4,fontWeight:500,marginLeft:"auto"}}>· name + unit locked from library</span>
            </div>
          )}
        </Field>
      )}
      {/* Edit mode: name is fixed (came from existing wh_materials row) */}
      {editing&&(
        <Field label="Material name" style={{marginBottom:11}}>
          <Input value={f.name} disabled
            style={{background:T.surfaceB,color:T.t2,cursor:"not-allowed"}}/>
        </Field>
      )}
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
function LineItemRow({row,idx,stock,onChange,onRemove,mode,canRemove,lockMaterial}){
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
      {lockMaterial?(
        // MR-driven flow: material is decided by the parent MR — no change allowed.
        // Show as a non-interactive locked chip so the user sees what's being issued.
        <div title="MR me yahi material approve hua hai — change nahi ho sakta"
          style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",borderRadius:6,background:T.surfaceB,border:`1.5px solid ${T.b1}`,fontFamily:"inherit",minHeight:32}}>
          <span style={{fontSize:11,opacity:.55}}>🔒</span>
          <span style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {row.name||"—"}
          </span>
          {matSel&&<span style={{fontSize:10,color:T.t4,marginLeft:"auto",whiteSpace:"nowrap"}}>{matSel.qty} avail</span>}
        </div>
      ):mode==="issue"?(
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
// New GRN modal — TABBED:
//   Tab 1: "Requested by Procurement" → list of warehouse Ordered MRs to receive
//   Tab 2: "Return from Project"      → record material wapas aaya project se
function NewGRNModal({stock,projects,users,library,onClose,onSaved,onPickMR}){
  const [tab,setTab]=useState("procurement");
  // Tab 1: ordered warehouse MRs
  const [orderedMRs,setOrderedMRs]=useState([]);
  const [loadingMRs,setLoadingMRs]=useState(true);
  // Inline GRN drafts per MR — { [mr.id]: { challan, date, items: { [item.id]: { received_qty, rate } } } }
  const [drafts,setDrafts]=useState({});
  const [savingMR,setSavingMR]=useState({}); // { [mr.id]: bool }
  useEffect(()=>{
    api.get("/warehouse/mr?type=warehouse&status=Ordered").then(r=>{
      if(r.success) setOrderedMRs(r.data||[]);
      setLoadingMRs(false);
    }).catch(()=>setLoadingMRs(false));
    // Also pull PartialReceived MRs (top up flow)
    api.get("/warehouse/mr?type=warehouse&status=PartialReceived").then(r=>{
      if(r.success) setOrderedMRs(prev=>{
        const ids=new Set(prev.map(x=>x.id));
        return [...prev,...(r.data||[]).filter(x=>!ids.has(x.id))];
      });
    }).catch(()=>{});
  },[]);

  // Get-or-init draft for an MR. Pending qty + existing rate pre-filled.
  const getDraft=(mr)=>{
    if(drafts[mr.id]) return drafts[mr.id];
    const items={};
    (mr.items||[]).forEach(it=>{
      const pending=Math.max(0,Number(it.qty||0)-Number(it.received_qty||0));
      items[it.id]={received_qty:pending,rate:Number(it.rate||0)};
    });
    return {challan:"",date:today(),items};
  };
  const updDraft=(mr,patch)=>setDrafts(p=>({...p,[mr.id]:{...getDraft(mr),...patch}}));
  const updItem=(mr,itemId,patch)=>{
    const d=getDraft(mr);
    setDrafts(p=>({...p,[mr.id]:{...d,items:{...d.items,[itemId]:{...d.items[itemId],...patch}}}}));
  };
  const submitMR=async(mr)=>{
    const d=getDraft(mr);
    if(!d.challan.trim()){alert("Challan number required");return;}
    const items=(mr.items||[]).map(it=>{
      const dit=d.items[it.id]||{};
      return {id:it.id,name:it.material_name,unit:it.unit,
              received_qty:Number(dit.received_qty)||0,rate:Number(dit.rate)||0};
    }).filter(x=>x.received_qty>0);
    if(items.length===0){alert("Kam se kam ek item ka received qty fill karo");return;}
    setSavingMR(p=>({...p,[mr.id]:true}));
    const res=await api.post(`/warehouse/mr/${mr.id}/grn`,{
      challan:d.challan.trim(),vendor:mr.vendor||null,items,
    });
    setSavingMR(p=>({...p,[mr.id]:false}));
    if(res.success){
      setOrderedMRs(prev=>prev.filter(x=>x.id!==mr.id));
      onSaved&&onSaved(res.data);
    } else alert(res.message||"Failed");
  };

  // Tab 2: return from project state
  const [retF,setRetF]=useState({date:today(),from_project_id:null,remark:""});
  const [retInv,setRetInv]=useState([]);
  const [retInvLoading,setRetInvLoading]=useState(false);
  const [retItems,setRetItems]=useState([{lib_id:null,material_id:null,name:"",unit:"",qty:"",rate:""}]);
  const [retSaving,setRetSaving]=useState(false);

  // Load source project's available inventory when picked
  useEffect(()=>{
    if(!retF.from_project_id){ setRetInv([]); return; }
    setRetInvLoading(true);
    setRetItems([{lib_id:null,material_id:null,name:"",unit:"",qty:"",rate:""}]);
    api.get(`/tasks/project/${retF.from_project_id}/material-ledger`).then(r=>{
      if(r.success){
        const inv=(r.data||[])
          .filter(m=>Number(m.balance||0)>0)
          .map(m=>{
            const whMat=stock.find(s=>s.name?.toLowerCase().trim()===m.material_name?.toLowerCase().trim());
            return {
              id: whMat?.id ?? `name:${(m.material_name||"").toLowerCase().trim()}`,
              name: m.material_name,
              qty: Number(m.balance)||0,
              unit: m.unit||"Nos",
              rate: whMat ? Number(whMat.rate)||0 : 0,
              material_id: whMat?.id || null,
            };
          });
        setRetInv(inv);
      } else setRetInv([]);
      setRetInvLoading(false);
    }).catch(()=>{ setRetInv([]); setRetInvLoading(false); });
  },[retF.from_project_id,stock]);

  const updRetItem=(i,patch)=>{
    setRetItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
    const pickedName = patch.name && String(patch.name).trim();
    if(pickedName && !patch.rate){
      api.get(`/warehouse/last-rate?name=${encodeURIComponent(pickedName)}`).then(r=>{
        if(r.success && Number(r.data?.rate) > 0){
          setRetItems(p=>p.map((row,j)=>j===i&&!Number(row.rate)?{...row,rate:r.data.rate}:row));
        }
      }).catch(()=>{});
    }
  };
  const remRetItem=(i)=>setRetItems(p=>p.filter((_,j)=>j!==i));
  const addRetItem=()=>setRetItems(p=>[...p,{lib_id:null,material_id:null,name:"",unit:"",qty:"",rate:""}]);

  const overstockRow=retItems.find(it=>{
    if(!it.qty)return false;
    const inv=retInv.find(s=>String(s.id)===String(it.material_id)||s.name===it.name);
    return inv && Number(it.qty)>Number(inv.qty);
  });
  const retValid=retF.from_project_id && !overstockRow && retItems.some(it=>(it.name||it.material_id)&&Number(it.qty)>0);
  const retTotal=retItems.reduce((s,it)=>s+Number(it.qty||0)*Number(it.rate||0),0);
  const fromName=projects.find(p=>p.id===retF.from_project_id)?.name;

  const submitReturn=async()=>{
    setRetSaving(true);
    const cleanItems=retItems.filter(it=>(it.name||it.material_id)&&Number(it.qty)>0).map(it=>({
      material_id:it.material_id||null,
      name:it.name||(retInv.find(s=>String(s.id)===String(it.material_id))?.name)||"Item",
      unit:it.unit||"Nos",
      qty:Number(it.qty),
      rate:Number(it.rate)||0,
    }));
    const res=await api.post("/warehouse/returns",{
      date:retF.date,
      from_project_id:retF.from_project_id,
      items:cleanItems,
      remark:retF.remark||null,
    });
    setRetSaving(false);
    if(res.success){onSaved&&onSaved(res.data);onClose();}
    else alert(res.message||"Return save failed");
  };

  // Tab 3: Direct GRN state (no prior MR) — material from Library, challan required
  const [dirF,setDirF]=useState({date:today(),vendor:"",po_no:"",challan:"",remark:""});
  const [dirItems,setDirItems]=useState([{lib_id:null,name:"",unit:"",qty:"",rate:""}]);
  const [dirSaving,setDirSaving]=useState(false);
  const dirLibOpts=library.map(m=>({id:m.id,name:`${m.name}${m.unit?` · ${m.unit}`:""}`}));
  const findDirLib=(id)=>library.find(l=>String(l.id)===String(id));
  const updDirItem=(i,patch)=>{
    setDirItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
    const pickedName=patch.name&&String(patch.name).trim();
    if(pickedName&&!patch.rate){
      api.get(`/warehouse/last-rate?name=${encodeURIComponent(pickedName)}`).then(r=>{
        if(r.success&&Number(r.data?.rate)>0){
          setDirItems(p=>p.map((row,j)=>j===i&&!Number(row.rate)?{...row,rate:r.data.rate}:row));
        }
      }).catch(()=>{});
    }
  };
  const remDirItem=(i)=>setDirItems(p=>p.filter((_,j)=>j!==i));
  // Auto-focus the SearchSelect on the newly-added row so the user can
  // type the next material name immediately without grabbing the mouse.
  const dirRowRefs=useRef([]);
  const addDirItem=()=>{
    setDirItems(p=>{
      const next=[...p,{lib_id:null,name:"",unit:"",qty:"",rate:""}];
      // Defer focus until React paints the new row
      setTimeout(()=>{
        const el=dirRowRefs.current[next.length-1];
        if(el&&typeof el.focus==="function") el.focus();
      },0);
      return next;
    });
  };
  const dirValid=dirF.vendor.trim()&&dirF.challan.trim()&&dirItems.some(it=>it.lib_id&&Number(it.qty)>0);
  const dirTotal=dirItems.reduce((s,it)=>s+Number(it.qty||0)*Number(it.rate||0),0);
  const submitDirectRef=useRef(false);
  const submitDirect=async()=>{
    if(submitDirectRef.current) return; // hard guard against double-fire
    if(!dirF.challan.trim()){alert("Challan No required");return;}
    submitDirectRef.current=true;
    setDirSaving(true);
    const cleanItems=dirItems.filter(it=>it.lib_id&&Number(it.qty)>0).map(it=>{
      const lib=findDirLib(it.lib_id);
      return {
        material_id:null, // Library entries are master_material — wh_materials auto-create on backend by name
        name:lib?.name||"Material",
        unit:lib?.unit||"Nos",
        qty:Number(it.qty),
        rate:Number(it.rate)||0,
      };
    });
    const res=await api.post("/warehouse/grn-direct",{
      date:dirF.date,
      vendor:dirF.vendor.trim(),
      po_no:dirF.po_no.trim()||null,
      challan:dirF.challan.trim(),
      remark:dirF.remark.trim()||null,
      items:cleanItems,
    });
    setDirSaving(false);
    submitDirectRef.current=false;
    if(res.success){onSaved&&onSaved(res.data);onClose();}
    else alert(res.message||"Direct GRN save failed");
  };

  const tabs=[
    {id:"procurement",l:"Requested by Procurement",c:T.pur,count:orderedMRs.length},
    {id:"direct",     l:"Direct GRN",              c:T.blu,count:null},
    {id:"return",     l:"Return from Project",     c:T.cyn,count:null},
  ];

  return (
    <ModalShell title="New GRN — Material In"
      sub={tab==="procurement"?"Procurement-ordered material ko receive karein":tab==="direct"?"Vendor walk-in delivery — bina prior MR/PO ke":"Project se wapas aaya material log karein"}
      onClose={onClose} width={820}
      footer={
        tab==="return"?<>
          <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total Value: <b style={{color:T.cyn}}>₹{fmtN(retTotal)}</b></span>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <Btn onClick={submitReturn} disabled={!retValid||retSaving} c={T.cyn} icon={IcIn}>{retSaving?"Saving...":"Save Return"}</Btn>
        </>:tab==="direct"?<>
          <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total: <b style={{color:T.blu}}>₹{fmtN(dirTotal)}</b></span>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <Btn onClick={submitDirect} disabled={!dirValid||dirSaving} c={T.grn} icon={IcChk}>{dirSaving?"Saving...":"Save Direct GRN"}</Btn>
        </>:<GhostBtn onClick={onClose}>Close</GhostBtn>
      }>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:6,padding:3,background:T.surfaceB,borderRadius:9,border:`1px solid ${T.b1}`,width:"fit-content",marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"7px 16px",borderRadius:6,border:"none",background:tab===t.id?t.c:"none",color:tab===t.id?"white":T.t3,fontSize:12,fontWeight:tab===t.id?700:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            {t.l}
            {t.count>0&&<span style={{background:tab===t.id?"rgba(255,255,255,0.25)":T.b1,color:tab===t.id?"white":T.t3,fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:10}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* TAB 1: Requested by Procurement */}
      {tab==="procurement"&&(
        <div>
          {loadingMRs&&<div style={{textAlign:"center",padding:"30px",color:T.t4,fontSize:12.5}}>Loading...</div>}
          {!loadingMRs&&orderedMRs.length===0&&(
            <div style={{padding:"24px 14px",textAlign:"center",background:T.surfaceB,borderRadius:8,border:`1.5px dashed ${T.b1}`,color:T.t4,fontSize:12.5}}>
              <div style={{fontSize:28,opacity:.4,marginBottom:6}}>📋</div>
              <div style={{fontSize:13,fontWeight:600,color:T.t3,marginBottom:3}}>Koi ordered MR nahi</div>
              <div>Pehle Warehouse MR banao → admin approve karega → Place Order karo → vendor delivery par yahan receive karo</div>
            </div>
          )}
          {!loadingMRs&&orderedMRs.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{padding:"8px 11px",background:T.purL,border:`1px solid ${T.purM}`,borderRadius:7,fontSize:11.5,color:T.pur,fontWeight:600,marginBottom:4}}>
                💡 Niche dikhi MR ke against vendor delivery aayi — challan + actual qty + rate fill karke "Record GRN" click karein, stock auto-update hoga.
              </div>
              {orderedMRs.map(mr=>{
                const totalQty=(mr.items||[]).reduce((s,it)=>s+Number(it.qty||0),0);
                const alreadyRecv=(mr.items||[]).reduce((s,it)=>s+Number(it.received_qty||0),0);
                const isPartial=mr.status==="PartialReceived";
                const d=getDraft(mr);
                const draftTotal=(mr.items||[]).reduce((s,it)=>{
                  const dit=d.items[it.id]||{};
                  return s+Number(dit.received_qty||0)*Number(dit.rate||0);
                },0);
                const isSaving=savingMR[mr.id];
                return (
                  <div key={mr.id} style={{background:T.surface,border:`1px solid ${T.purM}`,borderRadius:8,borderLeft:`3px solid ${isPartial?T.blu:T.pur}`,overflow:"hidden"}}>
                    {/* Header */}
                    <div style={{padding:"11px 13px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:12.5,fontWeight:700,color:T.pur,fontFamily:"monospace"}}>{mr.mr_no}</span>
                        <Pill label={mr.status} c={isPartial?T.blu:T.pur} bg={isPartial?T.bluL:T.purL} brd={isPartial?T.bluM:T.purM}/>
                        {mr.priority&&<Pill label={mr.priority} c={T.amb} bg={T.ambL}/>}
                      </div>
                      <div style={{fontSize:11.5,color:T.t3}}>
                        {mr.vendor&&<span>vendor: <b style={{color:T.t1}}>{mr.vendor}</b></span>}
                        {mr.po_no&&<span style={{marginLeft:8,color:T.t4,fontFamily:"monospace"}}>{mr.po_no}</span>}
                        {mr.expected_date&&<span style={{marginLeft:8,color:T.t4}}>· exp {fmtDate(mr.expected_date)}</span>}
                      </div>
                      {alreadyRecv>0&&<div style={{fontSize:10.5,color:T.blu,fontWeight:600,marginTop:2}}>{fmtN(alreadyRecv)} of {fmtN(totalQty)} already received</div>}
                    </div>
                    {/* Inline GRN form — challan + date + per-item qty/rate */}
                    <div style={{padding:"10px 13px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:10,marginBottom:9}}>
                        <Field label="Challan No *">
                          <Input value={d.challan} onChange={e=>updDraft(mr,{challan:e.target.value})} placeholder="CH-2026-..."/>
                        </Field>
                        <Field label="Date">
                          <Input type="date" value={d.date} onChange={e=>updDraft(mr,{date:e.target.value})}/>
                        </Field>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"2fr 50px 60px 60px 95px 85px 80px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 2px"}}>
                        <span>Material</span><span>Unit</span><span style={{textAlign:"right"}}>Ord</span><span style={{textAlign:"right"}}>Already</span><span style={{textAlign:"center",color:T.grn,fontSize:10,fontWeight:800}}>RECEIVE QTY *</span><span style={{textAlign:"right"}}>Rate ₹</span><span style={{textAlign:"right"}}>Value</span>
                      </div>
                      {(mr.items||[]).map(it=>{
                        const dit=d.items[it.id]||{received_qty:0,rate:0};
                        const pending=Math.max(0,Number(it.qty||0)-Number(it.received_qty||0));
                        const empty=!Number(dit.received_qty);
                        const short=!empty&&Number(dit.received_qty)<pending;
                        return (
                          <div key={it.id} style={{display:"grid",gridTemplateColumns:"2fr 50px 60px 60px 95px 85px 80px",gap:6,alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:11.5,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.material_name}</span>
                            <span style={{fontSize:10.5,color:T.t3}}>{it.unit}</span>
                            <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>{fmtN(it.qty)}</span>
                            <span style={{fontSize:11,color:Number(it.received_qty)>0?T.blu:T.t4,textAlign:"right",fontWeight:Number(it.received_qty)>0?700:400}}>{fmtN(it.received_qty||0)}</span>
                            <input type="number" value={dit.received_qty} max={pending} placeholder="Qty *"
                              onChange={e=>updItem(mr,it.id,{received_qty:e.target.value})}
                              style={{height:34,padding:"0 8px",borderRadius:6,border:`2px solid ${empty?T.amb:short?T.blu:T.grn}`,fontSize:13,fontWeight:700,outline:"none",fontFamily:"inherit",textAlign:"right",background:empty?T.ambL:short?T.bluL:T.grnL,color:empty?T.amb:T.t1}}/>
                            <input type="number" value={dit.rate} placeholder="Rate"
                              onChange={e=>updItem(mr,it.id,{rate:e.target.value})}
                              style={{height:34,padding:"0 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",textAlign:"right"}}/>
                            <span style={{fontSize:11.5,fontWeight:700,color:T.grn,textAlign:"right"}}>₹{fmt(Number(dit.received_qty||0)*Number(dit.rate||0))}</span>
                          </div>
                        );
                      })}
                      <div style={{fontSize:10.5,color:T.amb,fontWeight:600,marginTop:6,padding:"5px 8px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:5}}>
                        ⚠️ Receive Qty mandatory hai — vendor ne kitna actual diya wo fill karo (full delivery par ordered qty pre-filled hai)
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:9,borderTop:`1px dashed ${T.b1}`}}>
                        <span style={{fontSize:12,color:T.t3}}>Total: <b style={{color:T.grn,fontSize:13}}>₹{fmtN(draftTotal)}</b></span>
                        <Btn onClick={()=>submitMR(mr)} disabled={isSaving} c={T.grn} icon={IcIn} size="sm">{isSaving?"Saving...":"Record GRN & Update Stock"}</Btn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Direct GRN — vendor walk-in, no prior MR */}
      {tab==="direct"&&(
        <div>
          <div style={{padding:"9px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:11.5,color:T.blu,marginBottom:13,lineHeight:1.5}}>
            🚚 <b>Direct GRN:</b> bina prior MR/PO ke vendor delivery aayi hai. Save par warehouse stock me add hoga + Finance → Unbilled Materials me dikhega billing ke liye (project ke same flow).
          </div>
          <div style={{display:"grid",gridTemplateColumns:"140px 2fr 1fr 1fr",gap:11,marginBottom:11}}>
            <Field label="Date"><Input type="date" value={dirF.date} onChange={e=>setDirF(p=>({...p,date:e.target.value}))}/></Field>
            <Field label="Vendor *">
              <LibrarySelect type="supplier" value={dirF.vendor}
                onChange={v=>setDirF(p=>({...p,vendor:v||""}))}
                placeholder="Vendor library se pick karein"/>
            </Field>
            <Field label="PO No"><Input value={dirF.po_no} onChange={e=>setDirF(p=>({...p,po_no:e.target.value}))} placeholder="Optional"/></Field>
            <Field label="Challan No *">
              <Input value={dirF.challan} onChange={e=>setDirF(p=>({...p,challan:e.target.value}))} placeholder="CH-..."
                style={{borderColor:dirF.challan.trim()?T.b1:T.amb}}/>
            </Field>
          </div>
          <Field label="Remark" style={{marginBottom:13}}>
            <Input value={dirF.remark} onChange={e=>setDirF(p=>({...p,remark:e.target.value}))} placeholder="Optional note"/>
          </Field>

          {library.length===0&&(
            <div style={{padding:"10px 13px",borderRadius:7,background:T.ambL,border:`1px solid ${T.ambM}`,fontSize:12,color:T.amb,fontWeight:600,marginBottom:11}}>
              ⚠ Material Library khali hai — pehle Library → Materials me items add karein
            </div>
          )}

          <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>
            Items <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· library se pick karein</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 70px 1fr 100px 90px 24px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
            <span>Material (from library)</span><span>Unit</span><span>Qty</span><span>Rate ₹/u</span><span style={{textAlign:"right"}}>Value</span><span/>
          </div>
          {dirItems.map((row,i)=>{
            const lib=findDirLib(row.lib_id);
            const value=Number(row.qty||0)*Number(row.rate||0);
            return (
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 70px 1fr 100px 90px 24px",gap:6,alignItems:"center",marginBottom:6}}>
                <SearchSelect compact value={row.lib_id} options={dirLibOpts}
                  inputRef={el=>{ dirRowRefs.current[i]=el; }}
                  onChange={v=>{const m=findDirLib(v);updDirItem(i,{lib_id:v,name:m?.name||"",unit:m?.unit||"",rate:m?.rate?Number(m.rate):row.rate});}}
                  placeholder="Library se material pick karein"/>
                <UnitLock unit={lib?.unit||row.unit||"—"} locked={true} compact/>
                <input type="number" value={row.qty||""} onChange={e=>updDirItem(i,{qty:e.target.value})} placeholder="Qty"
                  style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input type="number" value={row.rate||""} onChange={e=>updDirItem(i,{rate:e.target.value})} placeholder="Rate (auto)"
                  title="Last purchase rate auto-fills on material pick"
                  style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",background:row.rate?T.bluL+"66":T.surface}}/>
                <span style={{fontSize:11,color:T.blu,fontWeight:700,textAlign:"right"}}>₹{fmt(value)}</span>
                {dirItems.length>1?(
                  <button onClick={()=>remDirItem(i)}
                    style={{width:24,height:24,border:"none",background:"none",cursor:"pointer",color:T.red,padding:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5}}>
                    <IcTrash size={12}/>
                  </button>
                ):<span/>}
              </div>
            );
          })}
          <button onClick={addDirItem} disabled={library.length===0}
            style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:library.length===0?T.t4:T.t3,fontSize:11.5,fontWeight:600,cursor:library.length===0?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
            <IcAdd size={11}/> Add row
          </button>
          <div style={{marginTop:8,fontSize:10.5,color:T.t4,fontStyle:"italic"}}>
            💡 Material library se aata hai aur unit locked rahega — change karne ke liye Library → Materials me edit karein. Rate auto-fill last purchase se.
          </div>
        </div>
      )}

      {/* TAB 2: Return from Project */}
      {tab==="return"&&(
        <div>
          <div style={{padding:"9px 12px",background:T.cynL,border:`1px solid ${T.cynM}`,borderRadius:7,fontSize:11.5,color:T.cyn,marginBottom:13,lineHeight:1.5}}>
            🔄 <b>Return flow:</b> kisi project me extra/unused material bach gaya hai aur warehouse me wapas la rahe hain. Project ke material ledger me debit + warehouse stock me credit.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:11,marginBottom:11}}>
            <Field label="Date"><Input type="date" value={retF.date} onChange={e=>setRetF(p=>({...p,date:e.target.value}))}/></Field>
            <Field label="From project *">
              <SearchSelect compact value={retF.from_project_id} options={projects}
                onChange={v=>setRetF(p=>({...p,from_project_id:v}))} placeholder="Project pick karein"/>
            </Field>
          </div>
          <Field label="Remark" style={{marginBottom:13}}>
            <Input value={retF.remark} onChange={e=>setRetF(p=>({...p,remark:e.target.value}))} placeholder="e.g. Surplus from foundation work, project closed"/>
          </Field>

          {!retF.from_project_id&&(
            <div style={{padding:"24px 14px",textAlign:"center",background:T.surfaceB,borderRadius:8,border:`1.5px dashed ${T.b1}`,color:T.t4,fontSize:12,marginBottom:8}}>
              From project select karo — uska available material yahan dikhega
            </div>
          )}
          {retF.from_project_id&&retInvLoading&&(
            <div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>Loading inventory...</div>
          )}
          {retF.from_project_id&&!retInvLoading&&retInv.length===0&&(
            <div style={{padding:"24px 14px",textAlign:"center",background:T.ambL,borderRadius:8,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:12,marginBottom:8,fontWeight:600}}>
              ⚠ {fromName} me koi available material nahi (sab use ho gaya ya issue nahi hua)
            </div>
          )}
          {retF.from_project_id&&retInv.length>0&&(
            <>
              <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>
                Items returning <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· {fromName} ke ledger se</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 100px 90px 24px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
                <span>Material (avail)</span><span>Unit</span><span>Qty</span><span>Rate ₹/u</span><span style={{textAlign:"right"}}>Value</span><span/>
              </div>
              {retItems.map((row,i)=>(
                <LineItemRow key={i} row={row} idx={i} stock={retInv} onChange={updRetItem} onRemove={remRetItem} mode="transfer" canRemove={retItems.length>1}/>
              ))}
              <button onClick={addRetItem}
                style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
                <IcAdd size={11}/> Add row
              </button>
              {overstockRow&&(
                <div style={{marginTop:8,padding:"7px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,fontSize:11.5,color:T.red,fontWeight:600}}>
                  ⚠ Project me itna available nahi hai — qty kam karo
                </div>
              )}
              <div style={{marginTop:8,fontSize:10.5,color:T.t4,fontStyle:"italic"}}>
                💡 Save par: project ledger me debit ("Returned to warehouse") + warehouse stock me credit + master rate refresh.
              </div>
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// ── NEW ISSUE MODAL ───────────────────────────────────────────────
// NewIssueModal mirrors the Transfer modal:
//   FROM = Warehouse (locked)
//   TO   = Project (picker)
//   Issued To = person (preserved)
// Source debit immediate, dest pending until site Receive (creates GRN at project)
function NewIssueModal({stock,projects,users,onClose,onSaved,prefill,fromMR}){
  const [f,setF]=useState({date:today(),project_id:prefill?.project_id||null,issued_to:null,remarks:prefill?.remarks||""});
  const initial=()=> (prefill?.items&&prefill.items.length>0)
    ?prefill.items.map(it=>{
      const m=stock.find(s=>s.name?.toLowerCase()===String(it.material_name||it.name||"").toLowerCase());
      return {material_id:m?.id||null,name:m?.name||it.name||it.material_name,unit:m?.unit||it.unit||"Nos",qty:Number(it.qty)||0,rate:m?.rate||0,selected_batches:null,_rateDirty:false};
    })
    :[{material_id:null,name:"",unit:"Nos",qty:"",rate:"",selected_batches:null,_rateDirty:false}];
  const [items,setItems]=useState(initial);
  const [saving,setSaving]=useState(false);
  // Batch picker — when user clicks "Choose batches" under rate field
  const [batchPickerIdx,setBatchPickerIdx]=useState(null);
  const [batchData,setBatchData]=useState(null); // {batches, fifo_rate, unit}
  // Per-row cached batch data + master fallback for weighted-rate breakdown.
  // Shape: { [rowIdx]: { batches:[...], fifo_rate, master_rate, unit } }
  const [batchesByIdx,setBatchesByIdx]=useState({});

  // Greedy FIFO consumption preview from cached batches.
  // Walks `selected` order if provided, else FIFO. Falls back to master
  // rate for any shortfall. Returns breakdown lines + weighted rate.
  const computeFifoPreview=(rowIdx,qty)=>{
    const want=Number(qty)||0;
    const cache=batchesByIdx[rowIdx];
    if(want<=0||!cache) return null;
    const selected=items[rowIdx]?.selected_batches;
    const orderedBatches = Array.isArray(selected) && selected.length>0
      ? selected.map(id=>cache.batches.find(b=>b.batch_id===id)).filter(Boolean)
      : [...cache.batches]; // already FIFO-ordered from backend
    let remaining=want, totalCost=0;
    const breakdown=[];
    for(const b of orderedBatches){
      if(remaining<=0.0001) break;
      const take=Math.min(remaining,Number(b.available_qty));
      if(take<=0) continue;
      totalCost += take * Number(b.rate||0);
      breakdown.push({grn_no:b.grn_no,take,rate:Number(b.rate||0),cost:take*Number(b.rate||0)});
      remaining -= take;
    }
    let shortfall=0;
    if(remaining>0.0001){
      shortfall=remaining;
      const fb=Number(cache.master_rate||0);
      totalCost += remaining * fb;
      breakdown.push({grn_no:"FALLBACK",take:remaining,rate:fb,cost:remaining*fb});
    }
    return { breakdown, totalCost, weightedRate: want>0?totalCost/want:0, shortfall };
  };

  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>{
    // If user typed in the rate field manually, mark _rateDirty so the
    // auto-recomputation doesn't overwrite their value.
    if(Object.prototype.hasOwnProperty.call(patch,"rate")) patch._rateDirty=true;
    setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
    // Material picked? Fetch all batches into cache so weighted-rate
    // preview works without further round-trips on qty changes.
    const pickedName=patch.name&&String(patch.name).trim();
    if(pickedName){
      api.get(`/warehouse/material-batches?name=${encodeURIComponent(pickedName)}`).then(r=>{
        if(r.success){
          setBatchesByIdx(p=>({...p,[i]:r.data}));
          // Auto-fill rate from oldest batch if user hasn't typed one
          if(Number(r.data?.fifo_rate)>0){
            setItems(p=>p.map((row,j)=>j===i&&!row._rateDirty?{...row,rate:r.data.fifo_rate}:row));
          }
        }
      }).catch(()=>{
        // Fallback to last-purchase if batches endpoint fails
        api.get(`/warehouse/last-rate?name=${encodeURIComponent(pickedName)}`).then(r=>{
          if(r.success&&Number(r.data?.rate)>0){
            setItems(p=>p.map((row,j)=>j===i&&!row._rateDirty?{...row,rate:r.data.rate}:row));
          }
        }).catch(()=>{});
      });
    }
  };

  // Prefetch batch data for any row that already has a name but no
  // cached batches yet (covers prefill flows — Issue-against-MR opens
  // with material already populated, but updItem(.name) is never called,
  // so batchesByIdx stays empty and weighted-rate recompute can't run).
  useEffect(()=>{
    items.forEach((row,i)=>{
      const n=String(row.name||"").trim();
      if(!n) return;
      if(batchesByIdx[i]) return;
      api.get(`/warehouse/material-batches?name=${encodeURIComponent(n)}`).then(r=>{
        if(r.success) setBatchesByIdx(p=>({...p,[i]:r.data}));
      }).catch(()=>{});
    });
    // intentionally watching only the material names — fetching once per
    // (idx,name) is enough; further qty edits don't need re-fetches.
  },[items.map(r=>String(r.name||"").trim()).join("~")]);

  // Auto-recompute weighted rate whenever qty or batch-cache changes for
  // any row (unless user has manually overridden the rate field).
  // Prefill rows arrive with rate=master_rate from stock; we clear that
  // and let FIFO compute take over UNLESS the user has touched the field.
  useEffect(()=>{
    setItems(prev=>{
      let changed=false;
      const next=prev.map((row,i)=>{
        if(row._rateDirty) return row;
        const cache=batchesByIdx[i];
        if(!cache||!Number(row.qty)) return row;
        const preview=computeFifoPreview(i,row.qty);
        if(!preview||preview.weightedRate<=0) return row;
        if(Math.abs(Number(row.rate||0)-preview.weightedRate)<0.01) return row;
        changed=true;
        return {...row,rate:Number(preview.weightedRate.toFixed(2))};
      });
      return changed?next:prev;
    });
    // deps are derived from items[] + batchesByIdx — using a serialized
    // signature keeps the effect simple without referencing computeFifoPreview
    // (which itself closes over items + batchesByIdx, would loop forever).
  },[items.map(r=>`${r.material_id}|${r.qty}|${(r.selected_batches||[]).join(",")}`).join("~"),batchesByIdx]);

  // Open batch picker for row idx
  const openBatchPicker=async(idx)=>{
    const row=items[idx];
    if(!row?.name) return;
    setBatchPickerIdx(idx);
    setBatchData({loading:true});
    try{
      const r=await api.get(`/warehouse/material-batches?name=${encodeURIComponent(row.name)}`);
      if(r.success) setBatchData({...r.data,loading:false,selected:row.selected_batches||[]});
      else setBatchData({error:r.message||"Failed",loading:false});
    }catch(e){setBatchData({error:e.message,loading:false});}
  };
  const closeBatchPicker=()=>{setBatchPickerIdx(null);setBatchData(null);};
  const applyBatchSelection=(selectedIds,weightedRate)=>{
    if(batchPickerIdx==null) return;
    setItems(p=>p.map((row,j)=>j===batchPickerIdx?{
      ...row,
      selected_batches:selectedIds.length>0?selectedIds:null,
      rate:weightedRate>0?weightedRate:row.rate,
    }:row));
    closeBatchPicker();
  };
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{material_id:null,name:"",unit:"Nos",qty:"",rate:""}]);

  const stockErr=items.find(it=>{
    if(!it.material_id||!it.qty)return false;
    const m=stock.find(s=>s.id===it.material_id);
    return m&&Number(it.qty)>Number(m.qty);
  });
  const valid=!stockErr&&f.project_id&&items.some(it=>it.material_id&&Number(it.qty)>0);
  const total=items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.rate)||0),0);
  const toName=projects.find(p=>p.id===f.project_id)?.name;

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items.filter(it=>it.material_id&&Number(it.qty)>0).map(it=>({
        material_id:it.material_id,
        qty:Number(it.qty),
        rate:Number(it.rate)||0,
        // selected_batches: if user manually picked specific batches via
        // the batch picker, send them so backend consumes in that order
        // instead of strict FIFO. null/undefined = default FIFO.
        selected_batches:Array.isArray(it.selected_batches)&&it.selected_batches.length>0?it.selected_batches:undefined,
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
      sub="Warehouse → Project · Source debit turant, dest pe site team Receive karegi"
      onClose={onClose} width={780}
      footer={<>
        <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total Value: <b style={{color:T.amb}}>₹{fmtN(total)}</b></span>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.amb} icon={IcOut}>{saving?"Saving...":fromMR?"Issue Material":"Save Issue (Pending)"}</Btn>
      </>}>
      {/* Route card — From locked, To picker */}
      <div style={{padding:"12px 14px",background:`linear-gradient(135deg, ${T.ambL} 0%, ${T.bluL} 100%)`,borderRadius:9,border:`1px solid ${T.ambM}`,marginBottom:13}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:14,alignItems:"center"}}>
          <div>
            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>From</div>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",borderRadius:6,background:T.surfaceB,border:`1.5px solid ${T.b1}`,fontFamily:"inherit"}}>
              <span style={{fontSize:11,opacity:.55}}>🔒</span>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Warehouse</span>
              <span style={{fontSize:10,color:T.t4,marginLeft:"auto"}}>(central stock)</span>
            </div>
            <div style={{fontSize:10.5,color:T.red,marginTop:3,fontWeight:600}}>− DEBIT (immediate)</div>
          </div>
          <div style={{color:T.amb,fontSize:24,fontWeight:800}}>→</div>
          <div>
            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>To Project *</div>
            {fromMR?(
              // MR-driven flow: project is fixed by the parent MR
              <div title="MR me yahi project decide ho chuka hai — change nahi ho sakta"
                style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",borderRadius:6,background:T.surfaceB,border:`1.5px solid ${T.b1}`,fontFamily:"inherit"}}>
                <span style={{fontSize:11,opacity:.55}}>🔒</span>
                <span style={{fontSize:13,fontWeight:700,color:T.t1}}>
                  {projects.find(p=>String(p.id)===String(f.project_id))?.name||"—"}
                </span>
                <span style={{fontSize:10,color:T.t4,marginLeft:"auto"}}>(from MR)</span>
              </div>
            ):(
              <SearchSelect compact value={f.project_id} options={projects}
                onChange={v=>upd("project_id",v)} placeholder="Project select karo"/>
            )}
            <div style={{fontSize:10.5,color:T.amb,marginTop:3,fontWeight:600}}>⏳ PENDING RECEIVE</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"140px 1fr 1fr",gap:11,marginBottom:13}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="Issued To">
          <SearchSelect compact value={f.issued_to} options={users} onChange={v=>upd("issued_to",v)} placeholder="Person who collected"/>
        </Field>
        <Field label="Remarks">
          <Input value={f.remarks} onChange={e=>upd("remarks",e.target.value)} placeholder="e.g. GF slab casting"/>
        </Field>
      </div>
      {toName&&(
        <div style={{padding:"7px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,fontSize:11.5,color:T.blu,marginBottom:13,lineHeight:1.5}}>
          Warehouse stock turant minus hoga. <b>{toName}</b> me material physically pohonchne par site wala "Receive" karega — tab tak Pending dikhega aur dest inventory me add nahi hoga.
        </div>
      )}

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Items <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· warehouse stock se</span></div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 100px 90px 24px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material (from stock)</span><span>Unit</span><span>Qty</span><span>Rate ₹/u</span><span style={{textAlign:"right"}}>Value</span><span/>
      </div>
      {items.map((row,i)=>{
        const preview=row.name&&Number(row.qty)>0?computeFifoPreview(i,row.qty):null;
        const usingFifo=preview&&preview.breakdown.length>1;
        return (
        <div key={i}>
          <LineItemRow row={row} idx={i} stock={stock} onChange={updItem} onRemove={remItem}
            mode="transfer"
            canRemove={!fromMR && items.length>1}
            lockMaterial={!!fromMR}/>
          {row.name && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:-2,marginBottom:preview?2:6,paddingLeft:"calc(40% + 60px + 1fr + 6px)",fontSize:10.5,flexWrap:"wrap"}}>
              <button onClick={()=>openBatchPicker(i)}
                title="Manual stock-batch selection (override FIFO)"
                style={{background:row.selected_batches?T.purL:"none",color:row.selected_batches?T.pur:T.blu,border:`1px solid ${row.selected_batches?T.pur+"66":T.bluM}`,padding:"2px 9px",borderRadius:14,fontSize:10.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}>
                🗂 {row.selected_batches?`${row.selected_batches.length} batch picked`:"Choose batches"}
              </button>
              {row.selected_batches&&(
                <button onClick={()=>updItem(i,{selected_batches:null})}
                  style={{background:"none",color:T.t4,border:"none",fontSize:10,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>
                  reset to FIFO
                </button>
              )}
              {row._rateDirty&&preview&&(
                <button onClick={()=>setItems(p=>p.map((r,j)=>j===i?{...r,_rateDirty:false,rate:Number(preview.weightedRate.toFixed(2))}:r))}
                  title="User-edited rate ko clear karke FIFO weighted rate par wapas le aao"
                  style={{background:"none",color:T.amb,border:`1px solid ${T.ambM}`,padding:"2px 8px",borderRadius:14,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                  ↻ Reset to FIFO rate
                </button>
              )}
            </div>
          )}
          {/* FIFO breakdown — surfaces when qty spans multiple batches so
              the user sees exactly how the weighted rate was derived. */}
          {usingFifo&&(
            <div style={{margin:"2px 0 8px",marginLeft:"calc(40% + 60px + 1fr + 6px)",padding:"7px 10px",borderRadius:6,background:T.cynL+"55",border:`1px solid ${T.cynM||"#A7F3D0"}`,fontSize:10.5,color:T.t2,lineHeight:1.6}}>
              <div style={{fontWeight:700,color:T.cyn,marginBottom:3}}>
                ⓘ FIFO breakdown — qty {row.qty} {row.unit} spans {preview.breakdown.length} batch{preview.breakdown.length>1?"es":""}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:3}}>
                {preview.breakdown.map((b,k)=>(
                  <span key={k} style={{background:"white",border:`1px solid ${b.grn_no==="FALLBACK"?T.ambM:T.b1}`,borderRadius:14,padding:"2px 9px",fontSize:10.5,fontWeight:600,color:b.grn_no==="FALLBACK"?T.amb:T.t2}}>
                    {b.grn_no==="FALLBACK"?"⚠ Master fallback":<span style={{color:T.blu,fontFamily:"monospace"}}>{b.grn_no}</span>} · {b.take} @ ₹{fmtN(b.rate)} = ₹{fmtN(b.cost)}
                  </span>
                ))}
              </div>
              <div style={{fontSize:10.5,color:T.t3}}>
                Weighted avg: <b style={{color:T.cyn}}>₹{fmtN(preview.weightedRate)}/{row.unit}</b>
                {" · "}Total cost: <b style={{color:T.cyn}}>₹{fmtN(preview.totalCost)}</b>
                {preview.shortfall>0&&<span style={{color:T.amb,marginLeft:8,fontWeight:600}}>⚠ {preview.shortfall} {row.unit} master rate se cover (batches kam pad gaye)</span>}
              </div>
            </div>
          )}
        </div>
        );
      })}
      {stockErr&&<div style={{marginTop:5,padding:"7px 11px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,fontSize:11.5,color:T.red,fontWeight:600}}>⚠ Stock se zyada qty kisi item me hai — kam karo</div>}
      {!fromMR&&(
        <button onClick={addItem}
          style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
          <IcAdd size={11}/> Add row
        </button>
      )}
      <div style={{marginTop:8,fontSize:10.5,color:T.t4,fontStyle:"italic"}}>
        {fromMR
          ? "💡 Project + Material MR me decide ho chuka hai (locked). Sirf Qty (stock/quality ke hisaab se) aur Rate (auto-fill, editable) badal sakte ho."
          : "💡 Rate auto-fill FIFO (oldest batch ka rate). Custom batch select karne ke liye row me 🗂 Choose batches click karein."}
      </div>
      {batchPickerIdx!=null&&(
        <BatchPickerPanel data={batchData} onClose={closeBatchPicker} onApply={applyBatchSelection}
          requestedQty={Number(items[batchPickerIdx]?.qty)||0}
          materialName={items[batchPickerIdx]?.name||""}/>
      )}
    </ModalShell>
  );
}

// ── BATCH PICKER PANEL ────────────────────────────────────────────
// Manual override of FIFO — shows all available wh_grn_items batches
// for a material, lets the user tick which ones to consume (and in
// what order). Computes weighted rate based on selection.
function BatchPickerPanel({data,onClose,onApply,requestedQty,materialName}){
  const [selected,setSelected]=useState([]); // ordered list of batch_ids
  useEffect(()=>{
    if(data&&!data.loading&&!data.error&&data.selected) setSelected(data.selected);
  },[data]);

  if(!data) return null;
  const batches=data.batches||[];

  const toggle=(batchId)=>{
    setSelected(p=>p.includes(batchId)?p.filter(id=>id!==batchId):[...p,batchId]);
  };

  // Compute the active consumption plan:
  //   - selected.length > 0 → manual order (whatever user ticked)
  //   - else                → default FIFO (already date-sorted from backend)
  // Walk the order, greedily take min(remaining, avail) from each batch.
  const isManual = selected.length > 0;
  const consumeOrder = isManual
    ? selected.map(id => batches.find(b => b.batch_id === id)).filter(Boolean)
    : [...batches]; // FIFO default
  let remaining = requestedQty, totalCost = 0;
  const planMap = {}; // batch_id → { take, rate, cost, order }
  let posCounter = 0;
  for (const b of consumeOrder) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, b.available_qty);
    if (take <= 0) continue;
    posCounter += 1;
    planMap[b.batch_id] = { take, rate: b.rate, cost: take * b.rate, order: posCounter };
    totalCost += take * b.rate;
    remaining -= take;
  }
  const weightedRate = requestedQty > 0 ? totalCost / requestedQty : 0;
  const totalConsumed = requestedQty - Math.max(remaining, 0);
  const insufficient = requestedQty > 0 && remaining > 0.0001;

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:600,backdropFilter:"blur(2px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:11,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",zIndex:601,width:680,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"inherit"}}>
        <div style={{padding:"12px 16px",background:T.sb,color:"white",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13.5,fontWeight:700}}>Choose Stock Batches — {materialName}</div>
            <div style={{fontSize:10.5,opacity:.7,marginTop:1}}>Manual override of FIFO. Tick in the order you want consumed.</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.6)",fontSize:20,lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
          {data.loading?<div style={{textAlign:"center",padding:30,color:T.t4,fontSize:13}}>Loading batches...</div>
          :data.error?<div style={{padding:"9px 12px",background:T.redL,color:T.red,borderRadius:6,fontSize:12}}>{data.error}</div>
          :batches.length===0?<div style={{textAlign:"center",padding:30,color:T.t4,fontSize:12.5}}>Koi batch nahi mila — material legacy (add-stock without GRN) ho sakta hai. FIFO master rate use karega.</div>
          :(
            <>
              <div style={{display:"grid",gridTemplateColumns:"30px 90px 100px 1fr 70px 75px 75px 100px",gap:6,padding:"6px 10px",background:T.surfaceB,borderRadius:6,border:`1px solid ${T.b1}`,marginBottom:6}}>
                {["#","GRN","Date","Vendor / Source","Avail","Rate","Order","FIFO Take"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>)}
              </div>
              {batches.map(b=>{
                const manualOrder=selected.indexOf(b.batch_id);
                const isManualPicked=manualOrder>=0;
                const plan=planMap[b.batch_id]; // active plan (manual or FIFO default)
                const isInPlan=!!plan;
                // Visual states:
                //   isManualPicked → bold purple border (user explicitly ticked)
                //   isInPlan + !isManual → cyan tint (default FIFO will use this)
                //   neither → plain
                const borderC=isManualPicked?T.pur:(isInPlan?T.cyn:T.b1);
                const bgC=isManualPicked?T.purL+"66":(isInPlan?T.cynL+"55":T.surface);
                return(
                  <label key={b.batch_id}
                    style={{display:"grid",gridTemplateColumns:"30px 90px 100px 1fr 70px 75px 75px 100px",gap:6,padding:"8px 10px",borderRadius:6,border:`1.5px solid ${borderC}`,background:bgC,marginBottom:5,alignItems:"center",cursor:"pointer",transition:"background .1s"}}>
                    <input type="checkbox" checked={isManualPicked} onChange={()=>toggle(b.batch_id)}
                      style={{width:14,height:14,cursor:"pointer",accentColor:T.pur}}/>
                    <span style={{fontSize:11,color:T.blu,fontWeight:700,fontFamily:"monospace"}}>{b.grn_no}</span>
                    <span style={{fontSize:11,color:T.t3}}>{b.date?new Date(b.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11.5,color:T.t1,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.vendor}</div>
                      <div style={{fontSize:10,color:T.t4}}>{b.source}{b.remark?" · "+b.remark.substring(0,30):""}</div>
                    </div>
                    <span style={{fontSize:12,color:T.t1,fontWeight:600,textAlign:"right"}}>{b.available_qty} {b.unit}</span>
                    <span style={{fontSize:12,color:T.cyn,fontWeight:700,textAlign:"right"}}>₹{fmtN(b.rate)}</span>
                    {isManualPicked
                      ? <span style={{fontSize:11,fontWeight:700,color:T.pur,background:"white",border:`1px solid ${T.pur}55`,borderRadius:20,padding:"2px 6px",textAlign:"center"}}>#{manualOrder+1}</span>
                      : <span/>}
                    {isInPlan
                      ? <span style={{fontSize:11,fontWeight:700,color:isManualPicked?T.pur:T.cyn,textAlign:"right"}}>{plan.take} {b.unit} <span style={{fontSize:9.5,color:T.t4,fontWeight:500}}>= ₹{fmtN(plan.cost)}</span></span>
                      : <span style={{fontSize:10.5,color:T.t4,textAlign:"right",fontStyle:"italic"}}>{requestedQty>0?"not used":"—"}</span>}
                  </label>
                );
              })}
            </>
          )}
        </div>
        {/* Summary footer */}
        <div style={{padding:"11px 16px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontSize:11.5}}>
            <div style={{color:T.t2}}>
              <span style={{padding:"1px 8px",borderRadius:10,background:isManual?T.purL:T.cynL,color:isManual?T.pur:T.cyn,fontSize:10,fontWeight:700,marginRight:6}}>
                {isManual?"MANUAL ORDER":"DEFAULT FIFO"}
              </span>
              Req: <b>{requestedQty||"—"}</b> · Will consume: <b>{totalConsumed} {data.unit||""}</b> · Cost: <b>₹{fmtN(totalCost)}</b>
            </div>
            <div style={{color:weightedRate>0?T.cyn:T.t4,fontSize:11,marginTop:3}}>
              Weighted rate: <b>₹{fmtN(weightedRate)}/{data.unit||""}</b>
              {insufficient?<span style={{color:T.amb,marginLeft:8,fontWeight:600}}>⚠ {(requestedQty-totalConsumed).toFixed(2)} {data.unit||""} short — backend master rate se cover hoga</span>:null}
            </div>
          </div>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <Btn onClick={()=>onApply(selected,weightedRate)} c={T.pur}>
            {isManual?"Apply Selection":"Use Default FIFO"}
          </Btn>
        </div>
      </div>
    </>
  );
}

// ── NEW MR MODAL ──────────────────────────────────────────────────
// Warehouse → Material Request: warehouse apne liye material maangta hai
// Project = "Warehouse" (locked, not selectable)
// Material picker = Material Library only
// Unit = library se aata hai, locked (sirf Library me change ho sakta hai)
function NewMRModal({library,onClose,onSaved,prefill}){
  const [f,setF]=useState({date:today(),priority:"Medium"});
  // When opened from a stock row, pre-select that material by matching the library on name.
  const [items,setItems]=useState(()=>{
    if(prefill?.name){
      const lib=library.find(l=>String(l.name||"").trim().toLowerCase()===String(prefill.name).trim().toLowerCase());
      return [{lib_id:lib?.id||null,name:lib?.name||prefill.name,unit:lib?.unit||prefill.unit||"",qty:"",note:""}];
    }
    return [{lib_id:null,name:"",unit:"",qty:"",note:""}];
  });
  const [saving,setSaving]=useState(false);
  // pipelineByIdx[i] = { entries:[], total_pending_qty, unit } | null
  const [pipelineByIdx,setPipelineByIdx]=useState({});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
  const remItem=(i)=>{
    setItems(p=>p.filter((_,j)=>j!==i));
    setPipelineByIdx(p=>{const n={...p};delete n[i];return n;});
  };
  const addItem=()=>setItems(p=>[...p,{lib_id:null,name:"",unit:"",qty:"",note:""}]);

  const valid=items.some(it=>it.lib_id&&Number(it.qty)>0);
  const libOpts=library.map(m=>({id:m.id,name:`${m.name}${m.unit?` · ${m.unit}`:""}`}));
  // SearchSelect normalizes keys to strings, so compare loosely
  const findLib=(id)=>library.find(l=>String(l.id)===String(id));

  // Pipeline check — warn if same material already in-flight for warehouse
  const checkPipeline=async(idx,matName)=>{
    if(!matName){setPipelineByIdx(p=>{const n={...p};delete n[idx];return n;});return;}
    try{
      const r=await api.get(`/warehouse/mr-pipeline-check?type=warehouse&name=${encodeURIComponent(matName)}`);
      if(r.success&&r.data?.in_pipeline){
        setPipelineByIdx(p=>({...p,[idx]:r.data}));
      }else{
        setPipelineByIdx(p=>{const n={...p};delete n[idx];return n;});
      }
    }catch(_){}
  };

  // Prefilled-from-stock: run the duplicate-pipeline check once on open.
  useEffect(()=>{
    if(prefill?.name) checkPipeline(0,items[0]?.name||prefill.name);
  },[]); // run once on mount

  const submit=async()=>{
    // If any picked material is already in pipeline, require explicit confirm
    const hits=Object.values(pipelineByIdx).filter(p=>p&&p.in_pipeline);
    if(hits.length>0){
      const lines=hits.flatMap(h=>h.entries.map(e=>`  • ${e.mr_no} — ${e.status} — ${e.pending_qty} ${e.unit||""}`));
      const ok=await window.confirmAsync(
        `⚠ Ye material(s) already pipeline me hai:\n\n${lines.join("\n")}\n\nFir bhi naya MR raise karna hai? (Continue = force, Cancel = wait)`
      );
      if(!ok) return;
    }
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
    <ModalShell title={prefill?.name?"Quick Request — Procurement":"New Material Request"}
      sub={prefill?.name?`"${prefill.name}" ke liye procurement ko request bhejein — qty daalein`:"Warehouse ke liye material maango — Library se pick karein"}
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
        const pipe=pipelineByIdx[i];
        return (
          <div key={i} style={{marginBottom:6}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 70px 1fr 1.5fr 30px",gap:6,alignItems:"center"}}>
              <SearchSelect compact value={row.lib_id} options={libOpts}
                onChange={v=>{
                  const m=findLib(v);
                  updItem(i,{lib_id:v,name:m?.name||"",unit:m?.unit||""});
                  checkPipeline(i,m?.name||"");
                }}
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
            {pipe&&pipe.in_pipeline&&(
              <div style={{marginTop:5,padding:"7px 11px",borderRadius:6,background:T.ambL,border:`1.5px solid ${T.ambM}`,fontSize:11.5,color:T.amb,lineHeight:1.5}}>
                <div style={{fontWeight:700,marginBottom:3,display:"flex",alignItems:"center",gap:5}}>
                  ⚠ Ye material already pipeline me hai · Total pending: <b>{pipe.total_pending_qty} {pipe.unit||""}</b>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:3}}>
                  {pipe.entries.map((e,k)=>(
                    <span key={k} style={{background:"white",border:`1px solid ${T.ambM}`,borderRadius:20,padding:"2px 9px",fontSize:10.5,color:T.t2,fontWeight:600}}>
                      <span style={{color:T.pur,fontFamily:"monospace"}}>{e.mr_no}</span>
                      <span style={{color:T.t4,margin:"0 4px"}}>·</span>
                      <span>{e.status}</span>
                      <span style={{color:T.t4,margin:"0 4px"}}>·</span>
                      <b>{e.pending_qty} {e.unit||""}</b>
                    </span>
                  ))}
                </div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:4,fontStyle:"italic"}}>
                  Force karoge to Submit ke samay confirm dialog aayega. Stock receive hone tak wait karna behtar hai.
                </div>
              </div>
            )}
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

// ── ORDER MODAL — assign vendor + expected date + per-item rates ──
function OrderModal({mr,onClose,onSaved}){
  const [vendor,setVendor]=useState(mr?.vendor||"");
  const [poNo,setPoNo]=useState(mr?.po_no||"");
  const [expDate,setExpDate]=useState(mr?.expected_date||today());
  const [items,setItems]=useState(()=>(mr?.items||[]).map(it=>({id:it.id,name:it.material_name,unit:it.unit,qty:it.qty,rate:Number(it.rate)||0})));
  const [saving,setSaving]=useState(false);
  const total=items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.rate||0),0);
  const valid=vendor.trim()&&items.every(it=>Number(it.rate)>=0);

  const submit=async()=>{
    setSaving(true);
    const res=await api.patch(`/warehouse/mr/${mr.dbId}/order`,{
      vendor:vendor.trim(),
      po_no:poNo.trim()||null,
      expected_date:expDate||null,
      items:items.map(it=>({id:it.id,rate:Number(it.rate)||0})),
    });
    setSaving(false);
    if(res.success){onSaved&&onSaved();onClose();}
    else alert(res.message||"Failed");
  };

  return (
    <ModalShell title="Place Order" sub={`${mr?.id} · ${mr?.items?.length||0} items`}
      onClose={onClose} width={620}
      footer={<>
        <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total Value: <b style={{color:T.pur}}>₹{fmtN(total)}</b></span>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.pur} icon={IcChk}>{saving?"Saving...":"Mark Ordered"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:12}}>
        <Field label="Vendor *">
          <Input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Supplier name"/>
        </Field>
        <Field label="PO No">
          <Input value={poNo} onChange={e=>setPoNo(e.target.value)} placeholder="PO-2026-..."/>
        </Field>
        <Field label="Expected Delivery">
          <Input type="date" value={expDate} onChange={e=>setExpDate(e.target.value)}/>
        </Field>
      </div>
      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Item rates</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 80px 100px 100px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material</span><span>Unit</span><span style={{textAlign:"right"}}>Qty</span><span style={{textAlign:"right"}}>Rate ₹/u</span><span style={{textAlign:"right"}}>Value</span>
      </div>
      {items.map((it,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 60px 80px 100px 100px",gap:6,alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.name}</span>
          <UnitLock unit={it.unit} locked={true} compact/>
          <span style={{fontSize:12,fontWeight:600,color:T.t2,textAlign:"right"}}>{fmtN(it.qty)}</span>
          <input type="number" value={it.rate} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,rate:e.target.value}:x))}
            style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",textAlign:"right"}}/>
          <span style={{fontSize:12,fontWeight:700,color:T.pur,textAlign:"right"}}>₹{fmt(Number(it.qty)*Number(it.rate||0))}</span>
        </div>
      ))}
    </ModalShell>
  );
}

// ── RECEIVE GRN MODAL — record material received against MR; updates stock ──
function ReceiveGRNModal({mr,onClose,onSaved}){
  const [challan,setChallan]=useState("");
  const [vendor,setVendor]=useState(mr?.vendor||"");
  const [items,setItems]=useState(()=>(mr?.items||[]).map(it=>{
    const pendingQty=Math.max(0,Number(it.qty||0)-Number(it.received_qty||0));
    return {id:it.id,name:it.material_name,unit:it.unit,qty:Number(it.qty||0),
            already:Number(it.received_qty||0),pending:pendingQty,
            received_qty:pendingQty,rate:Number(it.rate||0)};
  }));
  const [saving,setSaving]=useState(false);
  const total=items.reduce((s,it)=>s+Number(it.received_qty||0)*Number(it.rate||0),0);
  const valid=challan.trim()&&items.some(it=>Number(it.received_qty)>0);

  const submit=async()=>{
    setSaving(true);
    const res=await api.post(`/warehouse/mr/${mr.dbId}/grn`,{
      challan:challan.trim(),
      vendor:vendor.trim()||null,
      items:items.map(it=>({id:it.id,received_qty:Number(it.received_qty)||0,rate:Number(it.rate)||0,name:it.name,unit:it.unit})),
    });
    setSaving(false);
    if(res.success){onSaved&&onSaved(res.data);onClose();}
    else alert(res.message||"Failed");
  };

  return (
    <ModalShell title="Record GRN — Material Received"
      sub={`${mr?.id}${mr?.vendor?` · ${mr.vendor}`:""}${mr?.po_no?` · ${mr.po_no}`:""}`}
      onClose={onClose} width={680}
      footer={<>
        <span style={{fontSize:12,color:T.t3,marginRight:"auto"}}>Total: <b style={{color:T.grn}}>₹{fmtN(total)}</b></span>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.grn} icon={IcIn}>{saving?"Saving...":"Record GRN & Update Stock"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:14}}>
        <Field label="Challan No *">
          <Input value={challan} onChange={e=>setChallan(e.target.value)} placeholder="CH-2026-..."/>
        </Field>
        <Field label="Vendor">
          {mr?.vendor ? (
            // Locked — vendor was set by procurement when ordering. Receiving
            // team can't reassign; would break the PO → GRN audit chain.
            <div style={{display:"flex",alignItems:"center",gap:8,height:32,padding:"0 11px",borderRadius:6,border:`1.5px solid ${T.grnM}`,background:T.grnL}}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span style={{flex:1,fontSize:12.5,fontWeight:700,color:T.grn,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{vendor}</span>
              <span style={{fontSize:9.5,color:T.grn,fontWeight:600,letterSpacing:".3px"}}>FROM ORDER</span>
            </div>
          ) : (
            <Input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Supplier (auto from MR)"/>
          )}
        </Field>
      </div>
      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>
        Items received
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 70px 70px 90px 90px 100px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material</span><span>Unit</span><span style={{textAlign:"right"}}>Ord.</span><span style={{textAlign:"right"}}>Already</span><span style={{textAlign:"right"}}>Receive</span><span style={{textAlign:"right"}}>Rate ₹</span><span style={{textAlign:"right"}}>Value</span>
      </div>
      {items.map((it,i)=>{
        const short=Number(it.received_qty)<it.pending;
        return(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 60px 70px 70px 90px 90px 100px",gap:6,alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.name}</span>
            <UnitLock unit={it.unit} locked={true} compact/>
            <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>{fmtN(it.qty)}</span>
            <span style={{fontSize:11,color:it.already>0?T.blu:T.t4,textAlign:"right",fontWeight:it.already>0?700:400}}>{fmtN(it.already)}</span>
            <input type="number" value={it.received_qty} max={it.pending}
              onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,received_qty:e.target.value}:x))}
              style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${short?T.amb:T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",textAlign:"right",background:short?T.ambL:T.surface}}/>
            <input type="number" value={it.rate} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,rate:e.target.value}:x))}
              style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",textAlign:"right"}}/>
            <span style={{fontSize:12,fontWeight:700,color:T.grn,textAlign:"right"}}>₹{fmt(Number(it.received_qty||0)*Number(it.rate||0))}</span>
          </div>
        );
      })}
      <div style={{marginTop:10,padding:"9px 11px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:11,color:T.blu}}>
        💡 GRN record karne par warehouse stock me automatic add ho jayega. Agar kam aaya to MR "PartialReceived" rahegi — baki baad me receive kar sakte ho.
      </div>
    </ModalShell>
  );
}

// ── NEW TRANSFER MODAL ────────────────────────────────────────────
export function NewTransferModal({stock,projects,onClose,onSaved}){
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
function StockTab({stock,grns,issues,onSelect,onAddMaterial,onAddStock,onIssue,onQuickRequest}){
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("All");
  const [showLow,setShowLow]=useState(false);
  const [view,setView]=useState("group");
  const [sort,setSort]=useState("name");
  const [collapsed,setCollapsed]=useState({});

  // ── Movement velocity per material (from grns + issues transaction history) ──
  const velMap=useMemo(()=>{
    const m={};
    (grns||[]).forEach(g=>(g.items||[]).forEach(it=>{
      if(!it.matId) return;
      if(!m[it.matId]) m[it.matId]={inCount:0,outCount:0};
      m[it.matId].inCount++;
    }));
    (issues||[]).forEach(i=>(i.items||[]).forEach(it=>{
      if(!it.matId) return;
      if(!m[it.matId]) m[it.matId]={inCount:0,outCount:0};
      m[it.matId].outCount++;
    }));
    return m;
  },[grns,issues]);

  const getVel=(m)=>{
    const v=velMap[m.id]||{outCount:0};
    if(v.outCount>=5) return{label:"Fast Moving",icon:"🔥",c:"#DC2626",bg:"#FEF2F2"};
    if(v.outCount>=2) return{label:"Active",icon:"⚡",c:T.blu,bg:T.bluL};
    return{label:"Slow",icon:"",c:T.t4,bg:T.surfaceB};
  };

  const getHealth=(m)=>{
    if(m.qty===0)              return{label:"Out",      c:"#EF4444",bg:"#FEF2F2",brd:"#FECACA",pri:0};
    if(m.qty<m.minQty)         return{label:"Low",      c:T.amb,    bg:T.ambL,  brd:T.ambM,   pri:1};
    if(m.maxQty&&m.qty>m.maxQty*0.95) return{label:"High",c:"#7C3AED",bg:"#F5F3FF",brd:"#DDD6FE",pri:3};
    return                            {label:"OK",       c:T.grn,    bg:T.grnL,  brd:T.grnM,   pri:2};
  };

  // Stock bar: shows fill vs max (or 3×min as proxy). Amber tick marks min threshold.
  const getBar=(m)=>{
    const cap=m.maxQty||(m.minQty*3)||(m.qty*2)||100;
    const pct=Math.min(100,(m.qty/cap)*100);
    const minPct=m.minQty?Math.min(100,(m.minQty/cap)*100):0;
    const color=m.qty===0?"#EF4444":m.qty<m.minQty?T.amb:T.grn;
    return{pct,minPct,color,cap};
  };

  const filtered=stock
    .filter(m=>{
      if(cat!=="All"&&m.category!==cat) return false;
      if(showLow&&m.qty>=m.minQty) return false;
      if(search&&!m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a,b)=>{
      if(sort==="qty")   return a.qty-b.qty;
      if(sort==="value") return (b.qty*b.rate)-(a.qty*a.rate);
      if(sort==="low"){
        const [ah,bh]=[getHealth(a).pri,getHealth(b).pri];
        if(ah!==bh) return ah-bh;
      }
      return a.name.localeCompare(b.name);
    });

  // Category groups for group view (cheap — plain compute each render)
  const groups={};
  filtered.forEach(m=>{
    const k=m.category||"Uncategorized";
    if(!groups[k]) groups[k]=[];
    groups[k].push(m);
  });

  const toggleGroup=k=>setCollapsed(p=>({...p,[k]:!p[k]}));

  // Summary totals
  const totalVal=filtered.reduce((s,m)=>s+m.qty*m.rate,0);
  const lowCount=filtered.filter(m=>m.qty>0&&m.qty<m.minQty).length;
  const outCount=filtered.filter(m=>m.qty===0).length;

  // ── Mini stock bar (used in group rows) ──
  const MiniBar=({m})=>{
    const {pct,minPct,color}=getBar(m);
    return(
      <div style={{position:"relative",height:4,background:T.b1,borderRadius:2,width:80,flexShrink:0}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:pct+"%",background:color,borderRadius:2}}/>
        {minPct>0&&<div style={{position:"absolute",left:minPct+"%",top:-2,height:8,width:2,background:"#94A3B8",borderRadius:1}} title={"Min: "+m.minQty}/>}
      </div>
    );
  };

  return(
    <div>
      {/* ── Toolbar ── */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material..."
            style={{width:"100%",height:33,padding:"0 9px 0 28px",borderRadius:7,border:`1.5px solid ${search?T.blu:T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)}
          style={{height:33,padding:"0 10px",borderRadius:7,border:`1.5px solid ${cat!=="All"?T.blu:T.b1}`,background:cat!=="All"?T.bluL:T.surface,fontSize:12,color:cat!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {CATEGORIES_ALL.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={()=>setShowLow(s=>!s)}
          style={{height:33,padding:"0 11px",borderRadius:7,border:`1.5px solid ${showLow?"#EF4444":T.b1}`,background:showLow?"#FEF2F2":T.surface,color:showLow?"#EF4444":T.t3,fontSize:12,fontWeight:showLow?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <IcAlert size={12} color={showLow?"#EF4444":T.t4}/> Low Stock
        </button>
        <select value={sort} onChange={e=>setSort(e.target.value)}
          style={{height:33,padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12,color:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          <option value="name">Sort: Name</option>
          <option value="qty">Sort: Qty ↑</option>
          <option value="value">Sort: Value ↓</option>
          <option value="low">Sort: Alerts first</option>
        </select>
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["group","≡≡","Grouped by category"],["grid","⊞","Card grid"],["list","☰","Compact list"]].map(([id,ico,ttl])=>(
            <button key={id} onClick={()=>setView(id)} title={ttl}
              style={{width:30,height:27,borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {ico}
            </button>
          ))}
        </div>
        <Btn onClick={onAddMaterial} c={T.blu} icon={IcAdd} size="sm">New Material</Btn>
      </div>

      {/* ── Summary strip ── */}
      <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",fontSize:11.5,color:T.t3,flexWrap:"wrap"}}>
        <span style={{fontWeight:600,color:T.t2}}>{filtered.length} item{filtered.length!==1?"s":""}</span>
        <span style={{color:T.b2}}>·</span>
        <span>₹{fmt(totalVal)} total value</span>
        {outCount>0&&<><span style={{color:T.b2}}>·</span><span style={{color:"#EF4444",fontWeight:700,background:"#FEF2F2",padding:"2px 9px",borderRadius:20,border:"1px solid #FECACA",fontSize:11}}>🔴 {outCount} Out of Stock</span></>}
        {lowCount>0&&<><span style={{color:T.b2}}>·</span><span style={{color:T.amb,fontWeight:700,background:T.ambL,padding:"2px 9px",borderRadius:20,border:`1px solid ${T.ambM}`,fontSize:11}}>⚠ {lowCount} Low Stock</span></>}
        {cat!=="All"&&<span style={{background:T.bluL,color:T.blu,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${T.bluM}`}}>{cat}</span>}
      </div>

      {filtered.length===0&&(
        <Empty label={stock.length===0?"Stock me kuch nahi":"Filter ke andar koi item nahi"}
          sub={stock.length===0?"\"New Material\" se SKU add karke shuru karein":""}/>
      )}

      {/* ══════════════════════════════════════════════
          GROUP VIEW — default, grouped by category
          ══════════════════════════════════════════════ */}
      {view==="group"&&filtered.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {Object.entries(groups).map(([gKey,items])=>{
            const isCol=collapsed[gKey];
            const gVal=items.reduce((s,m)=>s+m.qty*m.rate,0);
            const gLow=items.filter(m=>m.qty<m.minQty).length;
            const gOut=items.filter(m=>m.qty===0).length;
            return(
              <div key={gKey} style={{background:T.surface,borderRadius:10,border:`1px solid ${gOut>0?"#FECACA":gLow>0?T.ambM:T.b1}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>

                {/* Group header */}
                <div onClick={()=>toggleGroup(gKey)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:T.surfaceB,cursor:"pointer",borderBottom:isCol?"none":`1px solid ${T.b1}`,userSelect:"none"}}>
                  <span style={{fontSize:17}}>{getCategoryEmoji(gKey)}</span>
                  <span style={{fontSize:12.5,fontWeight:700,color:T.t1,flex:1,letterSpacing:"-.2px"}}>{gKey}</span>
                  <span style={{fontSize:11,color:T.t4}}>{items.length} item{items.length!==1?"s":""}</span>
                  <span style={{color:T.b2,fontSize:10}}>·</span>
                  <span style={{fontSize:11,fontWeight:600,color:T.blu}}>₹{fmt(gVal)}</span>
                  {gOut>0&&<span style={{fontSize:10,color:"#EF4444",fontWeight:700,background:"#FEF2F2",padding:"2px 7px",borderRadius:10,border:"1px solid #FECACA"}}>🔴 {gOut} out</span>}
                  {gLow>0&&<span style={{fontSize:10,color:T.amb,fontWeight:700,background:T.ambL,padding:"2px 7px",borderRadius:10,border:`1px solid ${T.ambM}`}}>⚠ {gLow} low</span>}
                  <span style={{fontSize:13,color:T.t4,transform:isCol?"rotate(-90deg)":"rotate(0)",transition:"transform .2s",display:"inline-block"}}>▾</span>
                </div>

                {/* Material rows */}
                {!isCol&&items.map((m,idx)=>{
                  const h=getHealth(m);
                  const v=getVel(m);
                  const val=m.qty*m.rate;
                  return(
                    <div key={m.id}
                      style={{display:"grid",gridTemplateColumns:"4px 40px 1fr 96px 86px auto 112px",alignItems:"center",borderBottom:idx<items.length-1?`1px solid ${T.b1}`:"none",cursor:"pointer",minHeight:50,transition:"background .1s"}}
                      onClick={()=>onSelect(m)}
                      onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF55"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                      {/* Health strip */}
                      <div style={{alignSelf:"stretch",background:h.label==="OK"?T.grn+"40":h.c+"BB"}}/>

                      {/* Emoji */}
                      <div style={{textAlign:"center",fontSize:17,paddingLeft:2}}>{getCategoryEmoji(m.category)}</div>

                      {/* Name + mini bar */}
                      <div style={{padding:"8px 10px 8px 6px",minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                        <div style={{marginTop:5,display:"flex",alignItems:"center",gap:7}}>
                          <MiniBar m={m}/>
                          <span style={{fontSize:9,color:T.t4,whiteSpace:"nowrap"}}>
                            {m.minQty?`min ${fmtN(m.minQty)}`:"—"}
                            {m.maxQty?` / ${fmtN(m.maxQty)}`:""}
                          </span>
                        </div>
                      </div>

                      {/* Qty */}
                      <div style={{textAlign:"right",paddingRight:14}}>
                        <span style={{fontSize:16,fontWeight:600,color:h.label==="Out"?"#EF4444":h.label==="Low"?T.amb:T.t1,letterSpacing:"-0.1px",lineHeight:1}}>{fmtN(m.qty)}</span>
                        <span style={{fontSize:10,color:T.t4,marginLeft:3}}>{m.unit}</span>
                        {h.label!=="OK"&&<div style={{fontSize:8.5,color:h.c,fontWeight:700,marginTop:2,textTransform:"uppercase",letterSpacing:".3px"}}>{h.label==="Out"?"Out of stock":h.label==="Low"?"Below min":h.label}</div>}
                      </div>

                      {/* Value */}
                      <div style={{textAlign:"right",paddingRight:14}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.blu}}>₹{fmt(val)}</div>
                        <div style={{fontSize:9.5,color:T.t4}}>@₹{fmtN(m.rate)}/{m.unit}</div>
                      </div>

                      {/* Velocity (only fast/active) */}
                      <div style={{paddingRight:10,minWidth:70}}>
                        {v.label!=="Slow"&&(
                          <span style={{fontSize:9.5,fontWeight:700,color:v.c,background:v.bg,padding:"2px 7px",borderRadius:10,border:`1px solid ${v.c}33`,whiteSpace:"nowrap"}}>
                            {v.icon} {v.label}
                          </span>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div style={{display:"flex",gap:5,paddingRight:12,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
                        {onAddStock&&(
                          <button onClick={()=>onAddStock(m)} title="Add Stock"
                            style={{width:28,height:28,borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:T.grn,fontWeight:700}}>+</button>
                        )}
                        {onIssue&&(
                          <button onClick={()=>onIssue(m)} title="Issue to project"
                            style={{width:28,height:28,borderRadius:7,background:T.ambL,border:`1px solid ${T.ambM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.amb}}>↓</button>
                        )}
                        {onQuickRequest&&(
                          <button onClick={()=>onQuickRequest(m)} title="Request to procurement"
                            style={{width:28,height:28,borderRadius:7,background:T.purL,border:`1px solid ${T.purM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.pur}}>
                            <IcMR size={13} color={T.pur}/>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          GRID VIEW — compact cards, grouped by category
          ══════════════════════════════════════════ */}
      {view==="grid"&&filtered.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {Object.entries(groups).map(([gKey,items])=>{
            const isCol=collapsed[gKey];
            const gVal=items.reduce((s,m)=>s+m.qty*m.rate,0);
            const gLow=items.filter(m=>m.qty<m.minQty).length;
            const gOut=items.filter(m=>m.qty===0).length;
            return(
              <div key={gKey}>
                {/* Category header */}
                <div onClick={()=>toggleGroup(gKey)}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"6px 4px 8px",cursor:"pointer",userSelect:"none",borderBottom:`1px solid ${T.b1}`,marginBottom:isCol?0:10}}>
                  <span style={{fontSize:15}}>{getCategoryEmoji(gKey)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.t1,letterSpacing:"-.2px"}}>{gKey}</span>
                  <span style={{fontSize:10.5,color:T.t4}}>{items.length}</span>
                  <span style={{color:T.b2,fontSize:9}}>·</span>
                  <span style={{fontSize:10.5,fontWeight:600,color:T.blu}}>₹{fmt(gVal)}</span>
                  {gOut>0&&<span style={{fontSize:9.5,color:"#EF4444",fontWeight:700,background:"#FEF2F2",padding:"1px 6px",borderRadius:9,border:"1px solid #FECACA"}}>🔴 {gOut}</span>}
                  {gLow>0&&<span style={{fontSize:9.5,color:T.amb,fontWeight:700,background:T.ambL,padding:"1px 6px",borderRadius:9,border:`1px solid ${T.ambM}`}}>⚠ {gLow}</span>}
                  <span style={{flex:1}}/>
                  <span style={{fontSize:12,color:T.t4,transform:isCol?"rotate(-90deg)":"rotate(0)",transition:"transform .2s",display:"inline-block"}}>▾</span>
                </div>

                {/* Compact card grid */}
                {!isCol&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(178px,1fr))",gap:9}}>
                    {items.map(m=>{
                      const h=getHealth(m);
                      const v=getVel(m);
                      const val=m.qty*m.rate;
                      const {pct,minPct,color:barColor}=getBar(m);
                      return(
                        <div key={m.id} onClick={()=>onSelect(m)}
                          style={{background:T.surface,borderRadius:9,border:`1px solid ${h.label!=="OK"?h.brd:T.b1}`,borderLeft:`3px solid ${h.c}`,padding:"10px 11px",cursor:"pointer",transition:"all .15s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",position:"relative"}}
                          onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,0.09)";e.currentTarget.style.transform="translateY(-1px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";e.currentTarget.style.transform="";}}>

                          {/* name row */}
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,minWidth:0}}>
                            <span style={{fontSize:15,flexShrink:0}}>{getCategoryEmoji(m.category)}</span>
                            <div style={{fontSize:11.5,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{m.name}</div>
                            {v.label!=="Slow"&&<span title={v.label} style={{fontSize:11,flexShrink:0}}>{v.icon}</span>}
                          </div>

                          {/* qty — clean, not heavy */}
                          <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:7}}>
                            <span style={{fontSize:19,fontWeight:700,color:h.label==="Out"?"#EF4444":h.label==="Low"?T.amb:T.t1,letterSpacing:"-.3px",lineHeight:1}}>{fmtN(m.qty)}</span>
                            <span style={{fontSize:10.5,color:T.t4}}>{m.unit}</span>
                            {h.label!=="OK"&&<span style={{fontSize:8.5,color:h.c,fontWeight:700,background:h.bg,padding:"1px 5px",borderRadius:5,marginLeft:"auto"}}>{h.label==="Out"?"OUT":h.label.toUpperCase()}</span>}
                          </div>

                          {/* stock bar */}
                          <div style={{position:"relative",height:4,background:T.b1,borderRadius:2,marginBottom:8}}>
                            <div style={{position:"absolute",left:0,top:0,height:"100%",width:pct+"%",background:barColor,borderRadius:2}}/>
                            {minPct>0&&<div style={{position:"absolute",left:minPct+"%",top:-2.5,height:9,width:2,background:"#94A3B8",borderRadius:1}} title={"Min: "+m.minQty}/>}
                          </div>

                          {/* footer: value + quick actions */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:7,borderTop:`1px solid ${T.b1}`}}>
                            <span style={{fontSize:11.5,fontWeight:600,color:T.blu}}>₹{fmt(val)}</span>
                            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                              {onAddStock&&(
                                <button onClick={()=>onAddStock(m)} title="Add Stock"
                                  style={{width:23,height:23,borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.grn,fontWeight:700}}>+</button>
                              )}
                              {onIssue&&(
                                <button onClick={()=>onIssue(m)} title="Issue to project"
                                  style={{width:23,height:23,borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.amb}}>↓</button>
                              )}
                              {onQuickRequest&&(
                                <button onClick={()=>onQuickRequest(m)} title="Request to procurement"
                                  style={{width:23,height:23,borderRadius:6,background:T.purL,border:`1px solid ${T.purM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.pur}}>
                                  <IcMR size={11} color={T.pur}/>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          LIST VIEW — compact table
          ══════════════════════════════════════════ */}
      {view==="list"&&filtered.length>0&&(
        <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"4px 50px 1fr 120px 100px 100px 90px",padding:"8px 14px",background:T.sb,gap:8,alignItems:"center"}}>
            {["","Code","Material","Category","Stock","Value","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {filtered.map(m=>{
            const h=getHealth(m);
            const v=getVel(m);
            return(
              <div key={m.id} onClick={()=>onSelect(m)}
                style={{display:"grid",gridTemplateColumns:"4px 50px 1fr 120px 100px 100px 90px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",gap:8}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{alignSelf:"stretch",background:h.label==="OK"?T.grn+"44":h.c+"99",borderRadius:0}}/>
                <span style={{fontSize:10.5,color:T.t4,fontFamily:"monospace"}}>#{m.id}</span>
                <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                  <span style={{fontSize:15}}>{getCategoryEmoji(m.category)}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:500,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                    {v.label!=="Slow"&&<span style={{fontSize:9,color:v.c,fontWeight:700}}>{v.icon} {v.label}</span>}
                  </div>
                </div>
                <span style={{fontSize:11,color:T.t3}}>{m.category}</span>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:h.label==="Out"?"#EF4444":h.label==="Low"?T.amb:T.t1}}>{fmtN(m.qty)}</span>
                  <span style={{fontSize:10,color:T.t4,marginLeft:3}}>{m.unit}</span>
                </div>
                <span style={{fontSize:12.5,fontWeight:600,color:T.blu}}>₹{fmt(m.qty*m.rate)}</span>
                {h.label!=="OK"
                  ?<Pill label={h.label==="Out"?"Out of Stock":"Low"} c={h.c} bg={h.bg} brd={h.brd}/>
                  :<span style={{fontSize:10,color:T.t4}}>—</span>
                }
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
    <div>
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
            const isReturn=g.source==="Return";
            return(
              <div key={g.id} onClick={()=>setSel(g)}
                style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 110px 100px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",borderLeft:isReturn?`3px solid ${T.cyn}`:"3px solid transparent",gap:8}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"77"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:11.5,fontWeight:700,color:isReturn?T.cyn:T.blu,fontFamily:"monospace"}}>{g.id}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{g.date}</span>
                <div style={{minWidth:0,display:"flex",alignItems:"center",gap:6}}>
                  {isReturn&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.cynL,color:T.cyn,fontWeight:600,border:`1px solid ${T.cynM}`,whiteSpace:"nowrap"}}>Return</span>}
                  <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.vendor}</span>
                </div>
                <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{g.poNo}</span>
                <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(g.total)}</span>
                <Pill label={g.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
            );
          })}
        </div>
      )}
      {sel&&<GRNDetailDrawer grn={sel} onClose={()=>setSel(null)} onVerify={onVerify}/>}
    </div>
  );
}

// ── GRN DETAIL DRAWER ─────────────────────────────────────────────
function GRNDetailDrawer({grn,onClose,onVerify}){
  const STATUS_S={"Verified":{c:T.grn,bg:T.grnL,brd:T.grnM},"Partial":{c:T.amb,bg:T.ambL,brd:T.ambM},"Pending":{c:T.slt,bg:T.sltL,brd:T.b2}};
  const ss=STATUS_S[grn.status]||STATUS_S["Pending"];
  const isReturn=grn.source==="Return";
  const totalOrd=(grn.items||[]).reduce((s,it)=>s+Number(it.ordQty||0),0);
  const totalRecv=(grn.items||[]).reduce((s,it)=>s+Number(it.recQty||0),0);
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(540px,96vw)",background:T.surface,zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease-out"}}>
        <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:(isReturn?T.cyn:T.grn)+"33",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IcIn size={15} color="#fff"/>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14,fontWeight:700,color:"white",fontFamily:"monospace"}}>{grn.id}</span>
                {isReturn&&<span style={{fontSize:10,padding:"1px 8px",borderRadius:10,background:"rgba(255,255,255,0.15)",color:"#fff",fontWeight:600}}>Return</span>}
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{grn.vendor} · {grn.date}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
          {/* Status banner */}
          <div style={{padding:"11px 14px",background:ss.bg,border:`1.5px solid ${ss.brd}`,borderRadius:8,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>{grn.status==="Verified"?"✓":grn.status==="Partial"?"⚠":"⏳"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12.5,fontWeight:700,color:ss.c}}>Status: {grn.status}</div>
              <div style={{fontSize:11,color:ss.c,marginTop:2}}>
                {isReturn?`Return GRN — material project se warehouse me wapas aaya`:`Vendor receipt — material warehouse stock me add ho gaya`}
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{isReturn?"From Project":"Vendor"}</div>
              <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{grn.vendor||"—"}</div>
            </div>
            <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{isReturn?"Date":"PO No"}</div>
              <div style={{fontSize:12,fontWeight:600,color:T.t1,fontFamily:isReturn?"inherit":"monospace"}}>{isReturn?grn.date:(grn.poNo||"—")}</div>
            </div>
            <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Received By</div>
              <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{grn.by||"—"}</div>
            </div>
            <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Total Value</div>
              <div style={{fontSize:13,fontWeight:700,color:isReturn?T.cyn:T.blu}}>₹{fmtN(grn.total)}</div>
            </div>
          </div>

          {/* Remark */}
          {grn.remark&&(
            <div style={{padding:"9px 12px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:7,marginBottom:13}}>
              <div style={{fontSize:9.5,color:T.t4,marginBottom:2,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Remark</div>
              <div style={{fontSize:12,color:T.t2,fontStyle:"italic"}}>"{grn.remark}"</div>
            </div>
          )}

          {/* Items table */}
          <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",justifyContent:"space-between"}}>
            <span>Items Received ({(grn.items||[]).length})</span>
            <span style={{textTransform:"none",letterSpacing:0,color:T.t1,fontWeight:700}}>
              {totalOrd>0?`Ord: ${fmtN(totalOrd)} · `:""}Recv: {fmtN(totalRecv)}
            </span>
          </div>
          <div style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 80px 90px",padding:"7px 11px",background:T.sb,gap:8}}>
              {["Material","Unit",isReturn?"Qty":"Ordered",isReturn?"Rate":"Received","Amount"].map((h,i)=>(
                <span key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".3px",textAlign:i>=2?"right":"left"}}>{h}</span>
              ))}
            </div>
            {(grn.items||[]).map((it,i)=>{
              const short=Number(it.recQty)<Number(it.ordQty);
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 80px 90px",padding:"9px 11px",gap:8,borderBottom:i<(grn.items||[]).length-1?`1px solid ${T.b1}`:"none",background:i%2?"#fff":T.surfaceB,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.name}</span>
                  <span style={{fontSize:11,color:T.t3}}>{it.unit||"—"}</span>
                  {isReturn?(
                    <>
                      <span style={{fontSize:12,fontWeight:600,color:T.cyn,textAlign:"right"}}>{fmtN(it.recQty||it.ordQty)}</span>
                      <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>₹{fmtN(it.rate||0)}</span>
                    </>
                  ):(
                    <>
                      <span style={{fontSize:12,color:T.t2,textAlign:"right"}}>{fmtN(it.ordQty)}</span>
                      <span style={{fontSize:12,fontWeight:700,color:short?T.amb:T.grn,textAlign:"right"}}>{fmtN(it.recQty)}</span>
                    </>
                  )}
                  <span style={{fontSize:12,fontWeight:700,color:isReturn?T.cyn:T.blu,textAlign:"right"}}>₹{fmt(it.amount||Number(it.recQty||it.ordQty||0)*Number(it.rate||0))}</span>
                </div>
              );
            })}
          </div>

          {/* Short notice for partial */}
          {(grn.items||[]).some(it=>Number(it.recQty)<Number(it.ordQty))&&!isReturn&&(
            <div style={{padding:"8px 11px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,fontSize:11.5,color:T.amb}}>
              ⚠ Kuch items ordered se kam aaye hain. PartialReceived status reflect karta hai.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <span style={{fontSize:10.5,color:T.t4}}>{isReturn?"Project se return":"Vendor delivery"}</span>
          <div style={{display:"flex",gap:8}}>
            <GhostBtn onClick={onClose}>Close</GhostBtn>
            {grn.status!=="Verified"&&!isReturn&&(
              <Btn onClick={()=>{onVerify(grn.dbId);onClose();}} c={T.grn} icon={IcChk} size="sm">Verify & Accept</Btn>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── ISSUE TAB ──────────────────────────────────────────────────────
function IssueTab({issues,projects,onNew,onSelect}){
  const [fStatus,setFStatus]=useState("All");
  const [fProj,setFProj]=useState(null);
  const STATUS_S={
    "Pending":{c:T.amb,bg:T.ambL,brd:T.ambM},
    "Partial":{c:T.blu,bg:T.bluL,brd:T.bluM},
    "Received":{c:T.grn,bg:T.grnL,brd:T.grnM},
  };
  let filtered=issues;
  if (fProj) filtered=filtered.filter(i=>i.project_id===fProj);
  if (fStatus!=="All") filtered=filtered.filter(i=>(i.status||"Pending")===fStatus);
  const pendingCount=issues.filter(i=>(i.status||"Pending")==="Pending").length;
  const partialCount=issues.filter(i=>i.status==="Partial").length;

  return(
    <div>
      {pendingCount>0&&(
        <div style={{padding:"10px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,marginBottom:11,display:"flex",alignItems:"center",gap:10}}>
          <IcAlert size={14} color={T.amb}/>
          <span style={{fontSize:12,color:T.amb,fontWeight:700}}>
            {pendingCount} issue{pendingCount>1?"s":""} pending receive — destination project se acknowledge hona baki hai
          </span>
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:11,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{minWidth:200,maxWidth:240,flex:1}}>
          <SearchSelect compact value={fProj} options={[{id:null,name:"All projects"},...projects]} onChange={v=>setFProj(v)} placeholder="Filter by project"/>
        </div>
        {["All","Pending","Partial","Received"].map(s=>{
          const count = s==="All" ? issues.length : issues.filter(i=>(i.status||"Pending")===s).length;
          return (
            <button key={s} onClick={()=>setFStatus(s)}
              style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${fStatus===s?(STATUS_S[s]?.brd||T.blu):T.b1}`,background:fStatus===s?(STATUS_S[s]?.bg||T.bluL):"none",color:fStatus===s?(STATUS_S[s]?.c||T.blu):T.t3,fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer",fontFamily:"inherit"}}>
              {s} {s!=="All"&&<span style={{marginLeft:3,fontWeight:800}}>{count}</span>}
            </button>
          );
        })}
        <div style={{flex:1}}/>
        <Btn onClick={onNew} c={T.amb} icon={IcOut} size="sm">Issue Material</Btn>
      </div>
      {filtered.length===0?<Empty label="Koi issue nahi" sub="Stock se material project ko bhejne ke liye Issue Material click karein"/>:(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"100px 80px 1fr 110px 100px 95px 95px",padding:"7px 14px",background:T.sb,gap:8}}>
            {["Issue No","Date","To Project","Issued To","Value","By","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px",textAlign:i===4?"right":"left"}}>{h}</span>
            ))}
          </div>
          {filtered.map(iss=>{
            const status=iss.status||"Pending";
            const ss=STATUS_S[status]||STATUS_S["Pending"];
            return (
              <div key={iss.id} onClick={()=>onSelect(iss)}
                style={{display:"grid",gridTemplateColumns:"100px 80px 1fr 110px 100px 95px 95px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",gap:8,borderLeft:`3px solid ${ss.c}`}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"77"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:11.5,fontWeight:700,color:T.amb,fontFamily:"monospace"}}>{iss.id}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{iss.date}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{iss.project}</div>
                  <div style={{fontSize:10,color:T.t4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{(iss.items||[]).map(it=>`${it.name||it.material_name} ×${fmtN(it.qty)} ${it.unit||""}`).slice(0,2).join(", ")}</div>
                </div>
                <span style={{fontSize:11.5,color:T.t2}}>{iss.issuedTo}</span>
                <span style={{fontSize:12,fontWeight:700,color:T.amb,textAlign:"right"}}>₹{fmt(iss.total)}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{iss.by}</span>
                <Pill label={status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ISSUE DETAIL DRAWER ──────────────────────────────────────────
function IssueDetailDrawer({issue,onClose,canDelete,canReceive,onDeleted,onReceived}){
  const [detail,setDetail]=useState(issue);
  const [loading,setLoading]=useState(true);
  const [deleting,setDeleting]=useState(false);
  const [receiveOpen,setReceiveOpen]=useState(false);
  const [receiveItems,setReceiveItems]=useState([]);
  const [receiving,setReceiving]=useState(false);

  useEffect(()=>{
    if(!issue?.dbId)return;
    setLoading(true);
    api.get(`/warehouse/issues/${issue.dbId}`).then(r=>{
      if(r.success){
        const d={...r.data,id:r.data.issue_no,dbId:r.data.id,date:fmtDate(r.data.date),project:r.data.project_name,issuedTo:r.data.issued_to_name,by:r.data.issued_by_name};
        setDetail(d);
        setReceiveItems((r.data.items||[]).map(it=>({id:it.id,name:it.name||it.material_name,unit:it.unit,qty:Number(it.qty),received_qty:Number(it.qty)})));
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[issue?.dbId]);

  const handleDelete=async()=>{
    if(!await window.confirmAsync(`${detail?.id} ko delete karein? Source warehouse stock restore hoga${detail?.status==="Received"||detail?.status==="Partial"?" + dest project ka GRN bhi hatega":""}. Yeh undo nahi ho sakta.`)) return;
    setDeleting(true);
    const r=await api.del(`/warehouse/issues/${detail.dbId}`);
    setDeleting(false);
    if(r.success){onDeleted&&onDeleted();onClose();}
    else alert(r.message||"Delete failed");
  };

  const handleReceive=async()=>{
    setReceiving(true);
    const items=receiveItems.map(it=>({id:it.id,received_qty:Number(it.received_qty||0)}));
    const r=await api.post(`/warehouse/issues/${detail.dbId}/receive`,{items});
    setReceiving(false);
    if(r.success){
      onReceived&&onReceived();
      api.get(`/warehouse/issues/${detail.dbId}`).then(rr=>{
        if(rr.success){
          const d={...rr.data,id:rr.data.issue_no,dbId:rr.data.id,date:fmtDate(rr.data.date),project:rr.data.project_name,issuedTo:rr.data.issued_to_name,by:rr.data.issued_by_name};
          setDetail(d);
          setReceiveOpen(false);
        }
      });
    } else alert(r.message||"Receive failed");
  };

  const items=detail?.items||[];
  const totalQty=items.reduce((s,i)=>s+Number(i.qty||0),0);
  const totalValue=items.reduce((s,i)=>s+Number(i.qty||0)*Number(i.rate||0),0);
  const status=detail?.status||"Pending";
  const isPending=status==="Pending";
  const isPartial=status==="Partial";
  const isReceived=status==="Received";
  const STATUS_S={"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM},"Partial":{c:T.blu,bg:T.bluL,brd:T.bluM},"Received":{c:T.grn,bg:T.grnL,brd:T.grnM}};
  const ss=STATUS_S[status]||STATUS_S["Pending"];

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
      <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,96vw)",background:T.surface,zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideIn .2s ease-out"}}>
        <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:T.amb+"33",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IcOut size={15} color="#fff"/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"white",fontFamily:"monospace"}}>{detail?.id||issue?.id}</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>Material Out · Warehouse → {detail?.project||"—"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
        </div>

        {loading?(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.t4,fontSize:13}}>Loading...</div>
        ):(
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
            {isPending&&(
              <div style={{padding:"11px 14px",background:T.ambL,border:`1.5px solid ${T.ambM}`,borderRadius:8,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⏳</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:T.amb}}>Pending receive at {detail.project}</div>
                  <div style={{fontSize:11,color:T.amb,marginTop:2}}>Warehouse stock minus ho chuka hai. Site team physically receive karke "Receive" click karegi tab dest project me GRN banega.</div>
                </div>
              </div>
            )}
            {isPartial&&(
              <div style={{padding:"11px 14px",background:T.bluL,border:`1.5px solid ${T.bluM}`,borderRadius:8,marginBottom:12}}>
                <div style={{fontSize:12.5,fontWeight:700,color:T.blu}}>📦 Partially received</div>
              </div>
            )}

            <div style={{padding:"14px 16px",background:`linear-gradient(135deg, ${T.ambL} 0%, ${T.bluL} 100%)`,borderRadius:10,border:`1px solid ${T.ambM}`,marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:14,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>From</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:10,opacity:.6}}>🔒</span>Warehouse
                  </div>
                  <div style={{fontSize:10.5,color:T.red,marginTop:3,fontWeight:600}}>− DEBIT (immediate)</div>
                </div>
                <div style={{color:T.amb,fontSize:24,fontWeight:800}}>→</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>To Project</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{detail?.project||"—"}</div>
                  <div style={{fontSize:10.5,color:isReceived?T.grn:isPartial?T.blu:T.amb,marginTop:3,fontWeight:600}}>
                    {isReceived?"+ CREDITED":isPartial?"⚠ PARTIAL":"⏳ PENDING RECEIVE"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Status</div>
                <Pill label={status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
              <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>Issued To</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{detail?.issuedTo||"—"}</div>
                <div style={{fontSize:9.5,color:T.t4,marginTop:1}}>by {detail?.by||"—"}</div>
              </div>
              <div style={{padding:"9px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
                <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{detail?.received_at?"Received":"Created"}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1}}>
                  {detail?.received_at?(<>{detail.received_by_name||"—"}<div style={{fontSize:10,color:T.t4,fontWeight:400}}>{fmtDate(detail.received_at)}</div></>):fmtDate(detail?.created_at||detail?.date)}
                </div>
              </div>
            </div>

            <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",justifyContent:"space-between"}}>
              <span>Items ({items.length})</span>
              <span style={{textTransform:"none",letterSpacing:0,color:T.t1,fontWeight:700}}>Qty: {fmtN(totalQty)} · Value: ₹{fmtN(totalValue)}</span>
            </div>
            <div style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
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
                  <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.name||it.material_name}</span>
                  <span style={{fontSize:11,color:T.t3}}>{it.unit||"—"}</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.amb,textAlign:"right"}}>{fmtN(it.qty)}</span>
                  <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>₹{fmtN(it.rate||0)}</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.amb,textAlign:"right"}}>₹{fmt(Number(it.qty||0)*Number(it.rate||0))}</span>
                  <span style={{fontSize:12,fontWeight:700,color:recvD==null?T.t4:short?T.amb:T.grn,textAlign:"right"}}>
                    {recvD==null?"—":short?`${fmtN(recvD)}/${fmtN(it.qty)}`:`✓ ${fmtN(recvD)}`}
                  </span>
                </div>
                );
              })}
            </div>

            {receiveOpen&&isPending&&(
              <div style={{padding:"12px 14px",background:T.grnL,border:`2px solid ${T.grnM}`,borderRadius:9,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:T.grn,marginBottom:8}}>📥 Receive at {detail.project}</div>
                <div style={{fontSize:11,color:T.t3,marginBottom:10}}>Actual received qty edit kar sakte ho (kam aaya to "Partial")</div>
                {receiveItems.map((it,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:8,marginBottom:7,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.name}</div>
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

            {detail?.remarks&&(
              <div style={{padding:"9px 12px",background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:7,marginBottom:8}}>
                <div style={{fontSize:9.5,color:T.t4,marginBottom:2,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Remarks</div>
                <div style={{fontSize:12,color:T.t2,fontStyle:"italic"}}>"{detail.remarks}"</div>
              </div>
            )}
          </div>
        )}

        <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <span style={{fontSize:10.5,color:T.t4}}>{isPending?"Site receive baki":isReceived?"All received":""}</span>
          <div style={{display:"flex",gap:8}}>
            <GhostBtn onClick={onClose}>Close</GhostBtn>
            {isPending&&canReceive&&!receiveOpen&&detail?.project_id&&(
              <Btn onClick={()=>setReceiveOpen(true)} c={T.grn} icon={IcIn} size="sm">Receive at {detail.project}</Btn>
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

// ── MR TAB ────────────────────────────────────────────────────────
// MRTab supports two modes via `mode` prop:
//   "warehouse": Tab 1 — internal MRs (project_id NULL). Lifecycle: Pending →
//                Approved → Ordered (vendor) → Received (GRN, stock+).
//   "project":   Tab 2 — procurement-driven MRs for projects. Lifecycle:
//                Pending → Approved → Issued (from existing stock).
function MRTab({mrs,onNew,onIssue,onApprove,onReject,onClose,onOrder,onGrn,onSendToProc,onPassToProc,onCheckStock,mode="project",procMode="direct"}){
  const [fStatus,setFStatus]=useState("All");
  const STATUS_S={
    "Pending":        {c:T.amb,bg:T.ambL,brd:T.ambM},
    "Approved":       {c:T.blu,bg:T.bluL,brd:T.bluM},
    "Ordered":        {c:T.pur,bg:T.purL,brd:T.purM},
    "Received":       {c:T.grn,bg:T.grnL,brd:T.grnM},
    "PartialReceived":{c:T.blu,bg:T.bluL,brd:T.bluM},
    "Issued":         {c:T.grn,bg:T.grnL,brd:T.grnM},
    "Partial":        {c:T.blu,bg:T.bluL,brd:T.bluM},
    "Rejected":       {c:T.red,bg:T.redL,brd:T.redM},
    "Closed":         {c:T.slt||T.t3,bg:T.sltL||"#F3F4F6",brd:T.b2},
  };
  const PRIO_S={"High":{c:T.red,bg:T.redL},"Medium":{c:T.amb,bg:T.ambL},"Low":{c:T.slt,bg:T.sltL}};
  const statusFilters = mode==="warehouse"
    ? ["All","Pending","Approved","Ordered","Received","Rejected","Closed"]
    : ["All","Pending","Approved","Issued","Rejected","Closed"];
  const filtered=mrs.filter(m=>fStatus==="All"||m.status===fStatus||(fStatus==="Received"&&m.status==="PartialReceived"));
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        {statusFilters.map(s=>{
          const count = s==="All"
            ? mrs.length
            : s==="Received"
              ? mrs.filter(m=>m.status==="Received"||m.status==="PartialReceived").length
              : mrs.filter(m=>m.status===s).length;
          return (
            <button key={s} onClick={()=>setFStatus(s)}
              style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${fStatus===s?(STATUS_S[s]?.brd||T.blu):T.b1}`,background:fStatus===s?(STATUS_S[s]?.bg||T.bluL):"none",color:fStatus===s?(STATUS_S[s]?.c||T.blu):T.t3,fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer",fontFamily:"inherit"}}>
              {s} {s!=="All"&&<span style={{marginLeft:3,fontWeight:800}}>{count}</span>}
            </button>
          );
        })}
        <div style={{flex:1}}/>
        {mode==="warehouse"&&onNew&&<Btn onClick={onNew} c={T.pur} icon={IcMR} size="sm">New MR</Btn>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0&&<Empty
          label={mode==="warehouse"?"Warehouse ke liye koi MR nahi":"Project ke liye koi request nahi"}
          sub={mode==="warehouse"
            ?"Apne stock ko replenish karne ke liye New MR click karein"
            :"Procurement team \"Issue from Warehouse\" choose karegi to yahan request aayegi"}/>}
        {filtered.map(mr=>{
          const ss=STATUS_S[mr.status]||STATUS_S["Pending"];
          const ps=PRIO_S[mr.priority]||PRIO_S["Medium"];
          const totalValue = (mr.items||[]).reduce((s,it)=>s+Number(it.qty||0)*Number(it.rate||0),0);
          return(
            <div key={mr.id} style={{background:T.surface,borderRadius:9,border:`1px solid ${mr.status==="Pending"?T.ambM:T.b1}`,overflow:"hidden",boxShadow:mr.status==="Pending"?"0 2px 8px rgba(217,119,6,0.08)":"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"flex-start",gap:12,borderLeft:`4px solid ${ss.c}`,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{mr.id}</span>
                    <Pill label={mr.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                    <Pill label={mr.priority} c={ps.c} bg={ps.bg}/>
                    <span style={{fontSize:10.5,color:T.t4}}>{mr.date}</span>
                    {mr.linked_procurement_mr_id&&<Pill label="From Procurement" c={T.cyn} bg={T.cynL} brd={T.cynM}/>}
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1,marginBottom:3}}>{mr.project}</div>
                  <div style={{fontSize:11,color:T.t4}}>
                    by {mr.requestedBy}
                    {mr.vendor&&<span style={{marginLeft:8,color:T.t3}}>· vendor: <b>{mr.vendor}</b></span>}
                    {mr.po_no&&<span style={{marginLeft:6,color:T.t3,fontFamily:"monospace"}}>· {mr.po_no}</span>}
                  </div>
                </div>
                <div style={{minWidth:200,maxWidth:280,flex:1}}>
                  {mr.items.slice(0,4).map((it,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{it.material_name||it.name}</span>
                      <span style={{fontSize:11.5,fontWeight:600,color:T.t1,flexShrink:0,marginLeft:6}}>{fmtN(it.qty)} {it.unit}{Number(it.rate)>0?<span style={{color:T.t4,marginLeft:4}}>· ₹{Number(it.rate)}</span>:""}</span>
                    </div>
                  ))}
                  {mr.items.length>4&&<div style={{fontSize:10.5,color:T.t4}}>+{mr.items.length-4} more</div>}
                  {totalValue>0&&<div style={{fontSize:11,fontWeight:700,color:T.blu,marginTop:3}}>Total: ₹{fmtN(totalValue)}</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
                  {/* PENDING — admin/super_admin can act inline; everyone else
                      sees the "approval pending" badge as before. */}
                  {mr.status==="Pending"&&onApprove&&onReject&&(
                    <>
                      <Btn onClick={()=>onApprove(mr)} c={T.grn} size="sm" icon={IcChk}>Approve</Btn>
                      <button onClick={()=>onReject(mr)}
                        style={{padding:"6px 11px",borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {mr.status==="Pending"&&!(onApprove&&onReject)&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:7,background:T.ambL,border:`1px solid ${T.ambM}`,whiteSpace:"nowrap"}}>
                      <span style={{fontSize:13}}>⏳</span>
                      <span style={{fontSize:11,color:T.amb,fontWeight:600}}>Admin approval pending</span>
                    </div>
                  )}

                  {/* WAREHOUSE MODE — only Order + GRN after approval */}
                  {mode==="warehouse"&&mr.status==="Approved"&&procMode==="direct"&&onOrder&&(
                    <Btn onClick={()=>onOrder(mr)} c={T.pur} size="sm" icon={IcMR}>Place Order</Btn>
                  )}
                  {mode==="warehouse"&&mr.status==="Approved"&&procMode==="via_procurement"&&onSendToProc&&(
                    <Btn onClick={()=>onSendToProc(mr)} c={T.pur} size="sm" icon={IcOut}>Send to Procurement</Btn>
                  )}
                  {mode==="warehouse"&&mr.status==="Ordered"&&!mr.sent_to_procurement_at&&onGrn&&(
                    <Btn onClick={()=>onGrn(mr)} c={T.grn} size="sm" icon={IcIn}>Receive (GRN)</Btn>
                  )}
                  {mode==="warehouse"&&mr.status==="Ordered"&&mr.sent_to_procurement_at&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:7,background:T.purL,border:`1px solid ${T.purM}`,whiteSpace:"nowrap"}}>
                      <span style={{fontSize:13}}>📦</span>
                      <span style={{fontSize:11,color:T.pur,fontWeight:600}}>With Procurement Team</span>
                    </div>
                  )}
                  {mode==="warehouse"&&mr.status==="PartialReceived"&&onGrn&&(
                    <Btn onClick={()=>onGrn(mr)} c={T.grn} size="sm" icon={IcIn}>Receive Rest</Btn>
                  )}
                  {mode==="warehouse"&&mr.status==="Received"&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`}}>
                      <IcChk size={12} color={T.grn}/>
                      <span style={{fontSize:11.5,color:T.grn,fontWeight:600}}>Received</span>
                    </div>
                  )}

                  {/* PROJECT MODE — Approved row gets 3 actions + a
                      passive stock-check probe so warehouse staff can
                      make an informed decision:
                        1. Issue from Stock — fulfill directly
                        2. Send to Procurement — escape hatch, wapas
                           vendor PO route khol do
                        3. Stock check (🔍) — small probe, shows current
                           warehouse availability for this material */}
                  {mode==="project"&&mr.status==="Approved"&&(
                    <>
                      {onCheckStock&&(
                        <button onClick={()=>onCheckStock(mr)}
                          title="Warehouse me is material ka current stock dekho"
                          style={{padding:"5px 9px",borderRadius:7,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
                          🔍 Stock
                        </button>
                      )}
                      <Btn onClick={()=>onIssue(mr)} c={T.amb} size="sm" icon={IcOut}>Issue from Stock</Btn>
                      {onPassToProc&&(
                        <button onClick={()=>onPassToProc(mr)}
                          title="Stock kam hai / fulfill nahi ho sakta — wapas procurement ko bhejo (vendor PO route)"
                          style={{padding:"6px 11px",borderRadius:7,background:T.surface,border:`1.5px solid ${T.purM||"#DDD6FE"}`,color:T.pur,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                          ↩ Send to Procurement
                        </button>
                      )}
                    </>
                  )}
                  {mode==="project"&&mr.status==="Issued"&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`}}>
                      <IcChk size={12} color={T.grn}/>
                      <span style={{fontSize:11.5,color:T.grn,fontWeight:600}}>Issued</span>
                    </div>
                  )}

                  {mr.status==="Rejected"&&(
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`}}>
                      <span style={{fontSize:11.5,color:T.red,fontWeight:600}}>Rejected by Admin</span>
                    </div>
                  )}
                  {mr.status==="Closed"&&(
                    <div title={mr.remark||""}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b2}`}}>
                      <span style={{fontSize:13}}>🔒</span>
                      <span style={{fontSize:11.5,color:T.t3,fontWeight:600}}>Closed</span>
                    </div>
                  )}

                  {/* Manual close — visible on any non-terminal state.
                      Useful when site doesn't need the material anymore
                      (project on hold, design change, etc.). Requires a
                      mandatory closure reason. */}
                  {onClose && ["Pending","Approved","Ordered","PartialReceived"].includes(mr.status) && (
                    <button onClick={()=>onClose(mr)}
                      title="Manually close this MR (compulsory reason)"
                      style={{padding:"5px 10px",borderRadius:7,background:"none",border:`1px dashed ${T.b2}`,color:T.t3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=T.surfaceB;e.currentTarget.style.color=T.red;e.currentTarget.style.borderColor=T.redM;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=T.t3;e.currentTarget.style.borderColor=T.b2;}}>
                      🔒 Close
                    </button>
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

// ── REQUESTS WRAPPER — splits Tab 1 (Warehouse MR) and Tab 2 (Project) ─
// ── REQUESTS TAB ────────────────────────────────────────────────────
// Standalone Requests mother tab — gives a unified view of all pending
// MRs in one place. Same data is ALSO accessible inside Material In
// (Warehouse MR sub-tab) + Material Out (Project Requests sub-tab) for
// lifecycle-grouped browsing. Two access paths, same source of truth.
function RequestsTab({mrs,projects,users,library,procMode="direct",onSubMR,onApprove,onReject,onClose,onCheckStock}){
  const [sub,setSub]=useState("warehouse");
  const whMrs   = mrs.filter(m=>!m.project_id);
  const projMrs = mrs.filter(m=>!!m.project_id);
  return (
    <div>
      <SubTabBar active={sub} onSelect={setSub} tabs={[
        {id:"warehouse",l:"Warehouse MR",     count:whMrs.length,  c:T.pur},
        {id:"project",  l:"Project Requests", count:projMrs.length,c:T.cyn},
      ]}/>
      <div style={{padding:"9px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:11.5,color:T.blu,marginBottom:12,lineHeight:1.55}}>
        <b>Flow:</b> Request {sub==="warehouse"?"(yahin se ya site se)":"(procurement se aati)"} → Admin <b>Material Approvals</b> drawer me approve karega → {sub==="warehouse"
          ?(procMode==="via_procurement"
            ?<><b>Send to Procurement</b> button click karein → procurement queue me MR jaayegi → vendor receive par stock auto-update.</>
            :<>"Place Order" + "Receive (GRN)" buttons milenge.</>)
          :<>"Issue Now" button milega.</>}
        {sub==="warehouse"&&<span style={{marginLeft:8,padding:"1px 8px",background:procMode==="via_procurement"?T.purL:T.grnL,color:procMode==="via_procurement"?T.pur:T.grn,borderRadius:10,fontSize:10,fontWeight:700}}>Mode: {procMode==="via_procurement"?"Via Procurement":"Direct"}</span>}
      </div>
      {sub==="warehouse"
        ? <MRTab mrs={whMrs} mode="warehouse" procMode={procMode}
            onNew={()=>onSubMR.openNew()}
            onOrder={onSubMR.openOrder} onGrn={onSubMR.openGrn}
            onSendToProc={onSubMR.sendToProcurement}
            onApprove={onApprove} onReject={onReject} onClose={onClose}/>
        : <MRTab mrs={projMrs} mode="project" onIssue={onSubMR.openIssue}
            onPassToProc={onSubMR.passToProcurement}
            onApprove={onApprove} onReject={onReject} onClose={onClose}
            onCheckStock={onCheckStock}/>
      }
    </div>
  );
}

// ── SubTab bar — reused by Material In + Material Out + Requests ────
function SubTabBar({tabs,active,onSelect}){
  return (
    <div style={{display:"flex",gap:8,marginBottom:12,padding:3,background:T.surfaceB,borderRadius:9,border:`1px solid ${T.b1}`,width:"fit-content"}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onSelect(t.id)}
          style={{padding:"7px 16px",borderRadius:6,border:"none",background:active===t.id?t.c:"none",color:active===t.id?"white":T.t3,fontSize:12,fontWeight:active===t.id?700:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          {t.l}
          <span style={{background:active===t.id?"rgba(255,255,255,0.25)":T.b1,color:active===t.id?"white":T.t3,fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:10}}>{t.count}</span>
        </button>
      ))}
    </div>
  );
}

// ── MATERIAL IN TAB ─────────────────────────────────────────────────
// Lifecycle view of incoming material:
//   - Received: confirmed GRNs (history)
//   - Warehouse MR: requests warehouse raised that will become GRNs
function MaterialInTab({grns,mrs,projects,users,library,procMode="direct",onNewGRN,onVerifyGRN,onSubMR,onApprove,onReject,onClose}){
  const [sub,setSub]=useState("received");
  const whMrs = mrs.filter(m=>!m.project_id);
  const pendingCount = whMrs.filter(m=>["Pending","Approved","Ordered"].includes(m.status)).length;
  return (
    <div>
      <SubTabBar active={sub} onSelect={setSub} tabs={[
        {id:"received",l:"Received GRN",  count:grns.length,c:T.grn},
        {id:"requests",l:"Warehouse MR",  count:whMrs.length,c:T.pur},
      ]}/>
      {sub==="requests"&&(
        <div style={{padding:"9px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:11.5,color:T.blu,marginBottom:12,lineHeight:1.55}}>
          <b>Flow:</b> Request (yahin se ya site se) → Admin <b>Material Approvals</b> drawer me approve karega → {procMode==="via_procurement"
            ?<><b>Send to Procurement</b> button click karein → procurement queue me MR jaayegi → vendor receive par stock auto-update.</>
            :<>"Place Order" + "Receive (GRN)" buttons milenge.</>}
          <span style={{marginLeft:8,padding:"1px 8px",background:procMode==="via_procurement"?T.purL:T.grnL,color:procMode==="via_procurement"?T.pur:T.grn,borderRadius:10,fontSize:10,fontWeight:700}}>Mode: {procMode==="via_procurement"?"Via Procurement":"Direct"}</span>
        </div>
      )}
      {sub==="received"
        ? <GrnTab grns={grns} onNew={onNewGRN} onVerify={onVerifyGRN}/>
        : <MRTab mrs={whMrs} mode="warehouse" procMode={procMode}
            onNew={()=>onSubMR.openNew()}
            onOrder={onSubMR.openOrder} onGrn={onSubMR.openGrn}
            onSendToProc={onSubMR.sendToProcurement}
            onApprove={onApprove} onReject={onReject} onClose={onClose}/>
      }
    </div>
  );
}

// ── MATERIAL OUT TAB ────────────────────────────────────────────────
// Lifecycle view of outgoing material:
//   - Issued: physical Issue events (history)
//   - Project Requests: requests projects raised that will become Issues
function MaterialOutTab({issues,mrs,projects,onNewIssue,onSelectIssue,onSubMR,onApprove,onReject,onClose,onCheckStock}){
  const [sub,setSub]=useState("issued");
  const projMrs = mrs.filter(m=>!!m.project_id);
  return (
    <div>
      <SubTabBar active={sub} onSelect={setSub} tabs={[
        {id:"issued",  l:"Issued",          count:issues.length,c:T.amb},
        {id:"requests",l:"Project Requests",count:projMrs.length,c:T.cyn},
      ]}/>
      {sub==="requests"&&(
        <div style={{padding:"9px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:11.5,color:T.blu,marginBottom:12,lineHeight:1.55}}>
          <b>Flow:</b> Request procurement se aati → Admin <b>Material Approvals</b> drawer me approve karega → "Issue from Stock" button. Warehouse-driven MRs me alternate "Pass to Procurement" bhi available.
        </div>
      )}
      {sub==="issued"
        ? <IssueTab issues={issues} projects={projects} onNew={onNewIssue} onSelect={onSelectIssue}/>
        : <MRTab mrs={projMrs} mode="project" onIssue={onSubMR.openIssue}
            onPassToProc={onSubMR.passToProcurement}
            onApprove={onApprove} onReject={onReject} onClose={onClose}
            onCheckStock={onCheckStock}/>
      }
    </div>
  );
}

// ── TRANSFERS TAB ──────────────────────────────────────────────────
export function TransfersTab({transfers,onNew,onSelect}){
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
export function TransferDetailDrawer({transfer,onClose,canDelete,canReceive,onDeleted,onReceived}){
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
    if(!await window.confirmAsync(`${detail.id} ko delete karein?\n\nSource project ka debit reverse hoga.${detail.status!=="Pending"?" Dest project ka GRN bhi hatega.":""}\nYeh undo nahi ho sakta.`)) return;
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
  const [procMode,setProcMode]=useState("direct"); // direct | via_procurement
  const [loading,setLoading]=useState(true);

  // Modal state
  const [matModalOpen,setMatModalOpen]=useState(null); // { material? } or {} to create
  const [addStockTarget,setAddStockTarget]=useState(null);
  const [issueTarget,setIssueTarget]=useState(null);    // single material quick issue
  const [grnNewOpen,setGrnNewOpen]=useState(false);
  const [issueNewOpen,setIssueNewOpen]=useState(false);
  const [mrNewOpen,setMrNewOpen]=useState(false);
  const [mrPrefill,setMrPrefill]=useState(null);  // {name,unit} when MR raised from a stock row
  const [transferNewOpen,setTransferNewOpen]=useState(false);
  const [issueFromMR,setIssueFromMR]=useState(null);    // {mr} when issuing against MR
  const [matDetail,setMatDetail]=useState(null);
  const [transferDetail,setTransferDetail]=useState(null);
  const [orderMR,setOrderMR]=useState(null);       // Tab 1: place order modal target
  const [grnMR,setGrnMR]=useState(null);           // Tab 1: receive GRN modal target
  const [issueDetail,setIssueDetail]=useState(null);

  // Current user (for admin-only actions)
  const meUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes((meUser?.role || "").toLowerCase());
  // Only super_admin / admin can approve MRs (PM excluded from approval-grant authority)
  const canApproveMR = ["admin","super_admin"].includes((meUser?.role || "").toLowerCase());

  // Approve / Reject — inline buttons on Pending MR rows (shown when canApproveMR).
  // BOTH warehouse-internal (project_id=NULL) AND procurement-linked (project_id
  // is set) wh_material_requests rows live in wh_material_requests — their id
  // is mr.dbId. The procurement MR (when linked) was already approved by admin
  // earlier; what we're approving here is the warehouse-side dispatch.
  // → use PATCH /warehouse/mr/:id with status field in BOTH cases.
  const approveMR = async (mr) => {
    if (!mr?.dbId) return;
    try {
      const res = await api.patch(`/warehouse/mr/${mr.dbId}`, { status: "Approved" });
      if (res.success) await loadAll();
      else alert(res.message || "Approve failed");
    } catch (e) { alert(e.message); }
  };
  const rejectMR = async (mr) => {
    if (!mr?.dbId) return;
    const reason = await window.promptAsync("Reject reason (optional):", "");
    if (reason === null) return; // user cancelled
    try {
      const res = await api.patch(`/warehouse/mr/${mr.dbId}`, {
        status: "Rejected",
        rejected_reason: reason || "Rejected by admin",
      });
      if (res.success) await loadAll();
      else alert(res.message || "Reject failed");
    } catch (e) { alert(e.message); }
  };
  // Stock check probe — quick lookup so warehouse staff can decide
  // whether to issue from stock OR pass back to procurement BEFORE
  // committing. Shows current available qty (master) + pending pipeline.
  const checkStockMR = async (mr) => {
    const matName = mr.items?.[0]?.material_name || mr.items?.[0]?.name || mr.item_name;
    if (!matName) { alert("Material name nahi mila"); return; }
    const need = Number(mr.items?.[0]?.qty || mr.quantity || 0);
    try {
      const [stockRes, pipeRes] = await Promise.all([
        api.get(`/warehouse/check-stock?name=${encodeURIComponent(matName)}&qty=${need}`),
        api.get(`/warehouse/mr-pipeline-check?type=warehouse&name=${encodeURIComponent(matName)}`),
      ]);
      const s = stockRes?.data || {};
      const p = pipeRes?.data || {};
      const lines = [];
      lines.push(`📦 ${matName} — stock check`);
      lines.push("");
      lines.push(`   This MR needs:    ${need} ${s.unit || mr.items?.[0]?.unit || ""}`);
      lines.push(`   Warehouse stock:  ${s.available || 0} ${s.unit || ""}`);
      if (Number(s.rate) > 0) lines.push(`   Master rate:      ₹${Number(s.rate).toFixed(2)} / ${s.unit || ""}`);
      lines.push("");
      if (p.in_pipeline && p.entries?.length > 0) {
        lines.push(`⚠ Pending pipeline (other wh_mrs not yet issued):`);
        p.entries.forEach(e => lines.push(`     • ${e.mr_no} — ${e.status} — ${e.pending_qty} ${e.unit || ""}`));
        lines.push(`   Total pending: ${p.total_pending_qty} ${p.unit || ""}`);
        const free = Math.max(0, Number(s.available || 0) - Number(p.total_pending_qty || 0));
        lines.push(`   Net free to allocate: ${free} ${s.unit || ""}`);
      } else {
        lines.push(`✓ No other pending wh_mrs — full stock is free.`);
      }
      lines.push("");
      lines.push(s.sufficient
        ? "✅ Stock sufficient — Issue from Stock pe click karo."
        : "❌ Stock insufficient — Send to Procurement consider karo.");
      alert(lines.join("\n"));
    } catch (e) { alert("Stock check failed: " + e.message); }
  };

  // Manual close — any non-terminal MR (Pending / Approved / Ordered).
  // Reason is mandatory. Linked procurement MR also gets closed by backend.
  const closeMR = async (mr) => {
    if (!mr?.dbId) return;
    const reason = await window.promptAsync(
      `${mr.id || `MR-${mr.dbId}`} close karne ka reason (mandatory):\n` +
      "(e.g. site need cancel, design change, project on hold)",
      ""
    );
    if (reason === null) return; // user cancelled
    if (!reason.trim()) { alert("Closure reason zaroori hai"); return; }
    try {
      const res = await api.patch(`/warehouse/mr/${mr.dbId}`, {
        status: "Closed",
        closure_reason: reason.trim(),
      });
      if (res.success) await loadAll();
      else alert(res.message || "Close failed");
    } catch (e) { alert(e.message); }
  };

  const loadAll=useCallback(async()=>{
    try{
      const [sRes,gRes,iRes,mRes,tRes,pRes,uRes,libRes,settRes]=await Promise.all([
        api.get("/warehouse/materials"),
        api.get("/warehouse/grn"),
        api.get("/warehouse/issues"),
        api.get("/warehouse/mr"),
        api.get("/warehouse/transfers"),
        api.get("/projects").catch(()=>({success:false})),
        api.get("/projects/team-members").catch(()=>({success:false})),
        api.get("/library/materials").catch(()=>({success:false})),
        api.get("/settings/company").catch(()=>({success:false})),
      ]);
      if(settRes.success&&settRes.data) setProcMode(settRes.data.warehouse_procurement_mode||"direct");
      if(sRes.success) setStock((sRes.data||[]).map(m=>({...m,qty:Number(m.qty)||0,min_qty:Number(m.min_qty)||0,max_qty:Number(m.max_qty)||0,rate:Number(m.rate)||0,minQty:Number(m.min_qty)||0,maxQty:Number(m.max_qty)||0})));
      if(gRes.success) setGrns((gRes.data||[]).map(g=>({...g,id:g.grn_no||`GRN-${g.id}`,dbId:g.id,date:fmtDate(g.date),poNo:g.po_no||"—",vendor:g.vendor||"—",by:g.received_by_name||"—",total:Number(g.total)||0,items:(g.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,ordQty:Number(it.ordered_qty)||0,recQty:Number(it.received_qty)||0,rate:Number(it.rate)||0,amount:Number(it.amount)||0,unit:it.unit||""}))})));
      if(iRes.success) setIssues((iRes.data||[]).map(i=>({...i,id:i.issue_no||`ISS-${i.id}`,dbId:i.id,date:fmtDate(i.date),project:i.project_name||"—",issuedTo:i.issued_to_name||"—",by:i.issued_by_name||"—",total:Number(i.total)||0,remarks:i.remarks||"",status:i.status||"Pending",items:(i.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,qty:Number(it.qty)||0,rate:Number(it.rate)||0,unit:it.unit||""}))})));
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
    if(!await window.confirmAsync("Yeh MR reject kar dein?")) return;
    const res=await api.patch(`/warehouse/mr/${dbId}`,{status:"Rejected"});
    if(res.success) loadAll();
    else alert(res.message||"Reject failed");
  };
  const handleDeleteMaterial=async(m)=>{
    if(!await window.confirmAsync(`"${m.name}" ko delete karein? Movements hue hain to backend block karega.`)) return;
    const res=await api.del(`/warehouse/materials/${m.id}`);
    if(res.success){setMatDetail(null);loadAll();}
    else alert(res.message||"Delete failed");
  };

  const lowStock=stock.filter(m=>m.qty<m.minQty);
  const outOfStock=stock.filter(m=>m.qty===0);
  const totalValue=stock.reduce((s,m)=>s+m.qty*m.rate,0);
  const totalItems=stock.length;
  const pendingMRs=mrs.filter(m=>m.status==="Pending").length;
  // Per-tab pending counts so the badge sits on the right mother tab
  const pendingInMRs = mrs.filter(m=>!m.project_id && ["Pending","Approved","Ordered"].includes(m.status)).length;
  const pendingOutMRs= mrs.filter(m=>!!m.project_id && ["Pending","Approved"].includes(m.status)).length;

  const TABS=[
    {id:"stock",  l:"Stock",         I:IcBox,  badge:lowStock.length>0?lowStock.length:null, bc:T.red},
    {id:"grn",    l:"Material In",   I:IcIn,   badge:pendingInMRs>0?pendingInMRs:null, bc:T.pur},
    {id:"issue",  l:"Material Out",  I:IcOut,  badge:pendingOutMRs>0?pendingOutMRs:null, bc:T.cyn},
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
        {tab==="stock"&&<StockTab stock={stock} grns={grns} issues={issues} onSelect={m=>setMatDetail(m)} onAddMaterial={()=>setMatModalOpen({})} onAddStock={m=>setAddStockTarget(m)} onIssue={m=>setIssueTarget(m)} onQuickRequest={m=>{setMrPrefill({name:m.name,unit:m.unit});setMrNewOpen(true);}}/>}
        {tab==="grn"&&<MaterialInTab grns={grns} mrs={mrs} projects={projects} users={users} library={library}
          procMode={procMode}
          onNewGRN={()=>setGrnNewOpen(true)} onVerifyGRN={handleVerifyGRN}
          onApprove={canApproveMR?approveMR:undefined} onReject={canApproveMR?rejectMR:undefined} onClose={closeMR}
          onSubMR={{
            openNew:()=>setMrNewOpen(true),
            openOrder:(mr)=>setOrderMR(mr),
            openGrn:(mr)=>setGrnMR(mr),
            sendToProcurement:async(mr)=>{
              if(!await window.confirmAsync(`${mr.id} ko procurement team ke paas bhejna hai? Vendor PO place karne ke baad warehouse stock auto-update hoga.`)) return;
              const r=await api.post(`/warehouse/mr/${mr.dbId}/send-to-procurement`);
              if(r.success){ alert(r.message||"Sent to procurement"); loadAll(); }
              else alert(r.message||"Failed");
            },
            passToProcurement:async(mr)=>{
              const reason = await window.promptAsync(`${mr.id}: ye MR procurement ko wapas bhejne ka reason (optional):`, "Stock kam hai / fulfill nahi ho sakta");
              if(reason===null) return;
              const r=await api.post(`/warehouse/mr/${mr.dbId}/pass-to-procurement`, {reason});
              if(r.success){ alert(r.message||"Wapas procurement ke paas bhej diya"); loadAll(); }
              else alert(r.message||"Pass-to-procurement failed");
            },
          }}/>}
        {tab==="issue"&&<MaterialOutTab issues={issues} mrs={mrs} projects={projects}
          onNewIssue={()=>setIssueNewOpen(true)} onSelectIssue={iss=>setIssueDetail(iss)}
          onApprove={canApproveMR?approveMR:undefined} onReject={canApproveMR?rejectMR:undefined} onClose={closeMR}
          onCheckStock={checkStockMR}
          onSubMR={{
            openIssue:(mr)=>setIssueFromMR(mr),
            passToProcurement:async(mr)=>{
              const reason = await window.promptAsync(`${mr.id}: ye MR procurement ko wapas bhejne ka reason (optional):`, "Stock kam hai / fulfill nahi ho sakta");
              if(reason===null) return;
              const r=await api.post(`/warehouse/mr/${mr.dbId}/pass-to-procurement`, {reason});
              if(r.success){ alert(r.message||"Wapas procurement ke paas bhej diya"); loadAll(); }
              else alert(r.message||"Pass-to-procurement failed");
            },
          }}/>}
        {tab==="mr"&&<RequestsTab mrs={mrs} projects={projects} users={users} library={library}
          procMode={procMode}
          onApprove={canApproveMR?approveMR:undefined} onReject={canApproveMR?rejectMR:undefined} onClose={closeMR}
          onCheckStock={checkStockMR}
          onSubMR={{
            openNew:()=>setMrNewOpen(true),
            openIssue:(mr)=>setIssueFromMR(mr),
            openOrder:(mr)=>setOrderMR(mr),
            openGrn:(mr)=>setGrnMR(mr),
            sendToProcurement:async(mr)=>{
              if(!await window.confirmAsync(`${mr.id} ko procurement team ke paas bhejna hai? Vendor PO place karne ke baad warehouse stock auto-update hoga.`)) return;
              const r=await api.post(`/warehouse/mr/${mr.dbId}/send-to-procurement`);
              if(r.success){ alert(r.message||"Sent to procurement"); loadAll(); }
              else alert(r.message||"Failed");
            },
            passToProcurement:async(mr)=>{
              const reason = await window.promptAsync(`${mr.id}: ye MR procurement ko wapas bhejne ka reason (optional):`, "Stock kam hai / fulfill nahi ho sakta");
              if(reason===null) return;
              const r=await api.post(`/warehouse/mr/${mr.dbId}/pass-to-procurement`, {reason});
              if(r.success){ alert(r.message||"Wapas procurement ke paas bhej diya"); loadAll(); }
              else alert(r.message||"Pass-to-procurement failed");
            },
          }}/>}
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
        <NewGRNModal stock={stock} projects={projects} users={users} library={library}
          onClose={()=>setGrnNewOpen(false)}
          onSaved={()=>loadAll()}
          onPickMR={(mr)=>setGrnMR(mr)}/>
      )}
      {issueNewOpen&&(
        <NewIssueModal stock={stock} projects={projects} users={users}
          onClose={()=>setIssueNewOpen(false)} onSaved={()=>loadAll()}/>
      )}
      {mrNewOpen&&(
        <NewMRModal library={library} prefill={mrPrefill}
          onClose={()=>{setMrNewOpen(false);setMrPrefill(null);}} onSaved={()=>loadAll()}/>
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
      {issueDetail&&(
        <IssueDetailDrawer issue={issueDetail}
          canDelete={isAdmin} canReceive={true}
          onClose={()=>setIssueDetail(null)}
          onDeleted={()=>loadAll()}
          onReceived={()=>loadAll()}/>
      )}
      {issueFromMR&&(
        <NewIssueModal stock={stock} projects={projects} users={users}
          fromMR={issueFromMR.dbId}
          prefill={{project_id:issueFromMR.project_id,remarks:`Against ${issueFromMR.id}`,items:issueFromMR.items}}
          onClose={()=>setIssueFromMR(null)} onSaved={()=>loadAll()}/>
      )}
      {orderMR&&(
        <OrderModal mr={orderMR} onClose={()=>setOrderMR(null)} onSaved={()=>loadAll()}/>
      )}
      {grnMR&&(
        <ReceiveGRNModal mr={grnMR} onClose={()=>setGrnMR(null)} onSaved={()=>loadAll()}/>
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
