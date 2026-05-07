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
function MaterialFormModal({material,onClose,onSaved}){
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
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
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
  return(
    <ModalShell title={editing?"Edit Material":"New Material"}
      sub={editing?material.id||material.name:"Master me naya SKU add karein"}
      onClose={onClose} width={500}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!f.name.trim()||saving} c={editing?T.blu:T.grn} icon={IcChk}>{saving?"Saving...":editing?"Save Changes":"Add Material"}</Btn>
      </>}>
      <Field label="Material name *" style={{marginBottom:11}}>
        <Input value={f.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. OPC 53 Grade Cement"/>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
        <Field label="Category">
          <select value={f.category} onChange={e=>upd("category",e.target.value)}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Unit">
          <select value={f.unit} onChange={e=>upd("unit",e.target.value)}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
            {UNITS.map(u=><option key={u}>{u}</option>)}
          </select>
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
  // mode: "grn" | "issue" | "mr" | "transfer"
  // grn:  picks from stock OR free-text + ord/rec qty + rate
  // issue: picks from stock (must be material_id) + qty validates against stock
  // mr:    free-text or stock pick + qty (no validation)
  // transfer: free-text or stock pick + qty
  const matSel=stock.find(m=>m.id===row.material_id);
  const avail=matSel?Number(matSel.qty)||0:0;
  const overStock=mode==="issue"&&row.qty&&Number(row.qty)>avail;

  // Material picker — uses SearchSelect with id/name objects
  const stockOpts=stock.map(m=>({id:m.id,name:`${m.name} (${m.qty} ${m.unit} avail)`}));

  return (
    <div style={{display:"grid",gridTemplateColumns:mode==="grn"?"2fr 60px 1fr 1fr 1fr 90px 24px":mode==="issue"?"2fr 60px 1fr 100px 30px":"2fr 60px 1fr 30px",gap:6,alignItems:"center",marginBottom:6}}>
      {mode==="issue"?(
        <SearchSelect compact value={row.material_id} options={stockOpts}
          onChange={(v)=>{
            const m=stock.find(x=>x.id===v);
            onChange(idx,{material_id:v,name:m?.name||"",unit:m?.unit||"",rate:m?.rate||0});
          }}
          placeholder="Pick material from stock..."/>
      ):(
        <SearchSelect compact value={row.material_id||row.name} options={stockOpts}
          onChange={(v)=>{
            const m=stock.find(x=>x.id===v);
            onChange(idx,{material_id:m?.id||null,name:m?.name||v,unit:m?.unit||row.unit||"Nos",rate:m?.rate||row.rate||0});
          }}
          placeholder="Material name (pick or type)"/>
      )}
      <select value={row.unit||"Nos"} onChange={e=>onChange(idx,{unit:e.target.value})}
        style={{height:32,padding:"0 6px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,background:T.surface,fontFamily:"inherit",outline:"none"}}>
        {UNITS.map(u=><option key={u}>{u}</option>)}
      </select>
      {mode==="grn"&&(
        <input type="number" value={row.ordered_qty||""} onChange={e=>onChange(idx,{ordered_qty:e.target.value})} placeholder="Ord"
          style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
      )}
      <input type="number" value={row.qty||row.received_qty||""} onChange={e=>onChange(idx,mode==="grn"?{received_qty:e.target.value}:{qty:e.target.value})}
        placeholder={mode==="grn"?"Rcvd":"Qty"}
        style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${overStock?T.red:T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit",color:overStock?T.red:T.t1,background:overStock?T.redL:T.surface}}/>
      {mode==="grn"&&(
        <input type="number" value={row.rate||""} onChange={e=>onChange(idx,{rate:e.target.value})} placeholder="Rate"
          style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
      )}
      {mode==="grn"&&(
        <span style={{fontSize:11,color:T.blu,fontWeight:700,textAlign:"right"}}>₹{fmt(Number(row.received_qty||0)*Number(row.rate||0))}</span>
      )}
      {mode==="issue"&&(
        <input type="number" value={row.rate||""} onChange={e=>onChange(idx,{rate:e.target.value})} placeholder="Rate"
          style={{height:32,padding:"0 8px",borderRadius:6,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
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
function NewMRModal({stock,projects,onClose,onSaved}){
  const [f,setF]=useState({date:today(),project_id:null,priority:"Medium"});
  const [items,setItems]=useState([{material_id:null,name:"",unit:"Nos",qty:"",note:""}]);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{material_id:null,name:"",unit:"Nos",qty:"",note:""}]);

  const valid=items.some(it=>(it.name||it.material_id)&&Number(it.qty)>0);

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items.filter(it=>(it.name||it.material_id)&&Number(it.qty)>0).map(it=>({
        name:it.name||(stock.find(s=>s.id===it.material_id)?.name)||"Item",
        unit:it.unit||"Nos",
        qty:Number(it.qty),
        note:it.note||null,
      }));
      const res=await api.post("/warehouse/mr",{...f,items:cleanItems});
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"MR save failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  return (
    <ModalShell title="New Material Request" sub="Project ke liye stock se material maango"
      onClose={onClose} width={720}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.pur} icon={IcChk}>{saving?"Saving...":"Submit MR"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:14}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="Project">
          <SearchSelect compact value={f.project_id} options={projects} onChange={v=>upd("project_id",v)} placeholder="Select project"/>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={e=>upd("priority",e.target.value)}
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Items</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 30px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material</span><span>Unit</span><span>Qty</span><span/>
      </div>
      {items.map((row,i)=>(
        <LineItemRow key={i} row={row} idx={i} stock={stock} onChange={updItem} onRemove={remItem} mode="mr" canRemove={items.length>1}/>
      ))}
      <button onClick={addItem}
        style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        <IcAdd size={11}/> Add row
      </button>
    </ModalShell>
  );
}

// ── NEW TRANSFER MODAL ────────────────────────────────────────────
function NewTransferModal({stock,onClose,onSaved}){
  const [f,setF]=useState({date:today(),from_location:"Main Godown",to_location:""});
  const [items,setItems]=useState([{material_id:null,name:"",unit:"Nos",qty:""}]);
  const [saving,setSaving]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updItem=(i,patch)=>setItems(p=>p.map((r,j)=>j===i?{...r,...patch}:r));
  const remItem=(i)=>setItems(p=>p.filter((_,j)=>j!==i));
  const addItem=()=>setItems(p=>[...p,{material_id:null,name:"",unit:"Nos",qty:""}]);

  const valid=f.from_location.trim()&&f.to_location.trim()&&items.some(it=>(it.name||it.material_id)&&Number(it.qty)>0);

  const submit=async()=>{
    setSaving(true);
    try{
      const cleanItems=items.filter(it=>(it.name||it.material_id)&&Number(it.qty)>0).map(it=>({
        name:it.name||(stock.find(s=>s.id===it.material_id)?.name)||"Item",
        unit:it.unit||"Nos",
        qty:Number(it.qty),
      }));
      const res=await api.post("/warehouse/transfers",{...f,items:cleanItems});
      if(res.success){onSaved&&onSaved(res.data);onClose();}
      else alert(res.message||"Transfer save failed");
    }catch(e){alert(e.message);}
    setSaving(false);
  };

  return (
    <ModalShell title="New Transfer" sub="Site se site ya godown se godown me material bhejo"
      onClose={onClose} width={680}
      footer={<>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <Btn onClick={submit} disabled={!valid||saving} c={T.cyn} icon={IcTrns}>{saving?"Saving...":"Save Transfer"}</Btn>
      </>}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:14}}>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>upd("date",e.target.value)}/></Field>
        <Field label="From location *"><Input value={f.from_location} onChange={e=>upd("from_location",e.target.value)} placeholder="Main Godown"/></Field>
        <Field label="To location *"><Input value={f.to_location} onChange={e=>upd("to_location",e.target.value)} placeholder="Site A / Sub-warehouse"/></Field>
      </div>

      <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>Items</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 60px 1fr 30px",gap:6,marginBottom:5,fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",padding:"0 4px"}}>
        <span>Material</span><span>Unit</span><span>Qty</span><span/>
      </div>
      {items.map((row,i)=>(
        <LineItemRow key={i} row={row} idx={i} stock={stock} onChange={updItem} onRemove={remItem} mode="transfer" canRemove={items.length>1}/>
      ))}
      <button onClick={addItem}
        style={{marginTop:6,padding:"7px 12px",borderRadius:6,border:`1.5px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
        <IcAdd size={11}/> Add row
      </button>
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
function TransfersTab({transfers,onNew}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:12,fontWeight:600,color:T.t2}}>{transfers.length} Transfers</span>
        <Btn onClick={onNew} c={T.cyn} icon={IcTrns} size="sm">New Transfer</Btn>
      </div>
      {transfers.length===0?<Empty label="Koi transfer nahi" sub="Site se site material bhejne ke liye New Transfer click karein"/>:(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"110px 90px 1fr 1fr 110px 90px",padding:"7px 14px",background:T.sb,gap:8}}>
            {["Transfer No","Date","From","To","By","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {transfers.map(t=>(
            <div key={t.id}
              style={{display:"grid",gridTemplateColumns:"110px 90px 1fr 1fr 110px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s",cursor:"pointer",gap:8}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11.5,fontWeight:700,color:T.cyn,fontFamily:"monospace"}}>{t.id}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{t.date}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.from}</div>
                <div style={{fontSize:10,color:T.t4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{(t.items||[]).map(i=>`${i.material_name||i.name} ×${fmtN(i.qty)}`).join(", ")}</div>
              </div>
              <span style={{fontSize:12,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.to}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{t.by}</span>
              <Pill label={t.status} c={T.grn} bg={T.grnL} brd={T.grnM}/>
            </div>
          ))}
        </div>
      )}
    </div>
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

  const loadAll=useCallback(async()=>{
    try{
      const [sRes,gRes,iRes,mRes,tRes,pRes,uRes]=await Promise.all([
        api.get("/warehouse/materials"),
        api.get("/warehouse/grn"),
        api.get("/warehouse/issues"),
        api.get("/warehouse/mr"),
        api.get("/warehouse/transfers"),
        api.get("/projects").catch(()=>({success:false})),
        api.get("/projects/team-members").catch(()=>({success:false})),
      ]);
      if(sRes.success) setStock((sRes.data||[]).map(m=>({...m,qty:Number(m.qty)||0,min_qty:Number(m.min_qty)||0,max_qty:Number(m.max_qty)||0,rate:Number(m.rate)||0,minQty:Number(m.min_qty)||0,maxQty:Number(m.max_qty)||0})));
      if(gRes.success) setGrns((gRes.data||[]).map(g=>({...g,id:g.grn_no||`GRN-${g.id}`,dbId:g.id,date:fmtDate(g.date),poNo:g.po_no||"—",vendor:g.vendor||"—",by:g.received_by_name||"—",total:Number(g.total)||0,items:(g.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,ordQty:Number(it.ordered_qty)||0,recQty:Number(it.received_qty)||0,rate:Number(it.rate)||0,amount:Number(it.amount)||0,unit:it.unit||""}))})));
      if(iRes.success) setIssues((iRes.data||[]).map(i=>({...i,id:i.issue_no||`ISS-${i.id}`,dbId:i.id,date:fmtDate(i.date),project:i.project_name||"—",issuedTo:i.issued_to_name||"—",by:i.issued_by_name||"—",total:Number(i.total)||0,remarks:i.remarks||"",items:(i.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,qty:Number(it.qty)||0,rate:Number(it.rate)||0,unit:it.unit||""}))})));
      if(mRes.success) setMrs((mRes.data||[]).map(m=>({...m,project:m.project_name||"—",requestedBy:m.requested_by_name||"—",id:m.mr_no||`MR-${m.id}`,dbId:m.id,date:fmtDate(m.date),items:m.items||[]})));
      if(tRes.success) setTransfers((tRes.data||[]).map(t=>({...t,from:t.from_location||"—",to:t.to_location||"—",by:t.transferred_by_name||"—",id:t.transfer_no||`TRF-${t.id}`,dbId:t.id,date:fmtDate(t.date),items:t.items||[]})));
      if(pRes.success) setProjects((pRes.data||[]).map(p=>({id:p.id,name:p.name})));
      if(uRes.success) setUsers((uRes.data||[]).map(u=>({id:u.id,name:u.name})));
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
        {tab==="transfer"&&<TransfersTab transfers={transfers} onNew={()=>setTransferNewOpen(true)}/>}
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
        <MaterialFormModal material={matModalOpen.material} onClose={()=>setMatModalOpen(null)} onSaved={()=>loadAll()}/>
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
        <NewMRModal stock={stock} projects={projects}
          onClose={()=>setMrNewOpen(false)} onSaved={()=>loadAll()}/>
      )}
      {transferNewOpen&&(
        <NewTransferModal stock={stock}
          onClose={()=>setTransferNewOpen(false)} onSaved={()=>loadAll()}/>
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
