import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";

// ── ICONS ──────────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj  =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcTask  =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcFin   =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcDes   =(p)=><Ic {...p} d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcWH    =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcSet   =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcRep   =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcTeam  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcMenu  =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell  =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcIn    =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcOut   =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>;
const IcTx    =(p)=><Ic {...p} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/>;
const IcBox   =(p)=><Ic {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>;
const IcTrns  =(p)=><Ic {...p} d="M17 3l4 4-4 4M7 21l-4-4 4-4M21 7H3M21 17H3"/>;
const IcMR    =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcFilter=(p)=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
const IcEye   =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcEyeX  =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcPay   =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcLib   =(p)=><Ic {...p} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>;

// ── THEME ─────────────────────────────────────────────────────────
const C={p:"#1565C0",a:"#FF6F00",sb:"#0D1B2A",sbH:"#1E2E42",w:"#FFFFFF",bg:"#F1F4F8",t:"#1A2332",tm:"#4A5568",tl:"#8896A6",b:"#E2E8F0"};
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
const fmtN=(n)=>n==null?"-":Number(n).toLocaleString("en-IN");
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:String(n||0);

// ── NAV ───────────────────────────────────────────────────────────
const NAV=[
  {sec:null,items:[
    {id:"dashboard",l:"Dashboard",I:IcHome},
    {id:"projects",l:"Projects",I:IcProj},
    {id:"tasks",l:"Tasks",I:IcTask},
    {id:"team",l:"Team Schedule",I:IcTeam},
    {id:"design",l:"Design",I:IcDes},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",l:"Finance",I:IcFin},
    {id:"procurement",l:"Procurement",I:IcProc},
    {id:"warehouse",l:"Warehouse",I:IcWH,badge:3},
    {id:"payroll",l:"Payroll",I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"reports",l:"Reports",I:IcRep},
    {id:"library",l:"Library",I:IcLib},
    {id:"settings",l:"Settings",I:IcSet},
  ]},
];

// ── WAREHOUSE DATA ─────────────────────────────────────────────────
const CATEGORIES=["All","Cement & Concrete","Steel & Iron","Bricks & Blocks","Sand & Aggregate","Tiles & Flooring","Electrical","Plumbing","Paint & Finishing","Wood & Carpentry","Safety & Tools"];
const PROJECTS=[];
const UNITS=["Bags","MT","CuM","SqM","SqFt","Nos","Ltrs","Rft","KG","Box","Set"];

// Data loaded from API — no hardcoded data
const getCategoryEmoji=(cat)=>{
  const map={"Cement & Concrete":"🏗️","Steel & Iron":"🔩","Bricks & Blocks":"🧱","Sand & Aggregate":"⛏️","Tiles & Flooring":"🟦","Electrical":"⚡","Plumbing":"🔧","Paint & Finishing":"🖌️","Wood & Carpentry":"🪵","Safety & Tools":"⛑️"};
  return map[cat]||"📦";
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────
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


// ── STOCK TAB ─────────────────────────────────────────────────────
function StockTab({stock,onIssue,onAddStock}){
  const [search,setSearch]=useState("");
  const [cat,setCat]=useState("All");
  const [showLow,setShowLow]=useState(false);
  const [view,setView]=useState("grid"); // grid | list
  const [selItem,setSelItem]=useState(null);

  const filtered=stock.filter(m=>{
    if(cat!=="All"&&m.category!==cat) return false;
    if(showLow&&m.qty>m.minQty) return false;
    if(search&&!m.name.toLowerCase().includes(search.toLowerCase())&&!String(m.id).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStockStatus=(m)=>{
    if(m.qty===0) return{label:"Out of Stock",c:T.red,bg:T.redL,brd:T.redM};
    if(m.qty<m.minQty) return{label:"Low Stock",c:T.amb,bg:T.ambL,brd:T.ambM};
    if(m.qty>m.maxQty*0.8) return{label:"Well Stocked",c:T.grn,bg:T.grnL,brd:T.grnM};
    return{label:"Normal",c:T.blu,bg:T.bluL,brd:T.bluM};
  };

  return(
    <div>
      {/* Toolbar */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:180}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material or code..."
            style={{width:"100%",height:32,padding:"0 9px 0 28px",borderRadius:7,border:`1.5px solid ${search?T.blu:T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)}
          style={{height:32,padding:"0 10px",borderRadius:7,border:`1.5px solid ${cat!=="All"?T.blu:T.b1}`,background:cat!=="All"?T.bluL:T.surface,fontSize:12,color:cat!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={()=>setShowLow(s=>!s)}
          style={{height:32,padding:"0 11px",borderRadius:7,border:`1.5px solid ${showLow?T.red:T.b1}`,background:showLow?T.redL:T.surface,color:showLow?T.red:T.t3,fontSize:12,fontWeight:showLow?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <IcAlert size={12} color={showLow?T.red:T.t4}/> Low Stock Only
        </button>
        {/* View toggle */}
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["grid","⊞"],["list","☰"]].map(([id,ico])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{width:26,height:26,borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {ico}
            </button>
          ))}
        </div>
        <button onClick={onAddStock}
          style={{height:32,padding:"0 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <IcAdd size={13} color="white"/> Add Stock
        </button>
      </div>

      {/* Count badge */}
      <div style={{fontSize:11,color:T.t4,marginBottom:10}}>
        {filtered.length} items · {filtered.filter(m=>m.qty<m.minQty).length} below minimum
        {cat!=="All"&&<span style={{marginLeft:6,background:T.bluL,color:T.blu,fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.bluM}`}}>{cat}</span>}
      </div>

      {/* GRID VIEW */}
      {view==="grid"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {filtered.map(m=>{
            const ss=getStockStatus(m);
            const pct=Math.min(100,(m.qty/m.maxQty)*100);
            const barColor=m.qty===0?T.red:m.qty<m.minQty?T.amb:T.grn;
            const val=m.qty*m.rate;
            return(
              <div key={m.id}
                onClick={()=>setSelItem(selItem?.id===m.id?null:m)}
                style={{background:T.surface,borderRadius:10,border:`1.5px solid ${selItem?.id===m.id?T.blu:m.qty<m.minQty?T.ambM:T.b1}`,padding:"13px 14px",cursor:"pointer",transition:"all .15s",boxShadow:selItem?.id===m.id?"0 0 0 3px rgba(37,99,235,0.12)":"0 1px 3px rgba(0,0,0,0.05)"}}
                onMouseEnter={e=>{if(selItem?.id!==m.id)e.currentTarget.style.borderColor=T.bluM;}}
                onMouseLeave={e=>{if(selItem?.id!==m.id)e.currentTarget.style.borderColor=m.qty<m.minQty?T.ambM:T.b1;}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:20}}>{m.img}</span>
                    <div>
                      <div style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{m.id}</div>
                      <div style={{fontSize:12.5,fontWeight:600,color:T.t1,lineHeight:1.3,marginTop:1}}>{m.name}</div>
                    </div>
                  </div>
                  <Pill label={ss.label} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                </div>

                {/* Stock qty big */}
                <div style={{margin:"10px 0 6px",display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:26,fontWeight:800,color:m.qty<m.minQty?T.red:T.t1,letterSpacing:"-1px"}}>{fmtN(m.qty)}</span>
                  <span style={{fontSize:12,color:T.t4,fontWeight:500}}>{m.unit}</span>
                </div>

                {/* Progress bar */}
                <PBar pct={pct} color={barColor} h={5}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{fontSize:9.5,color:T.t4}}>Min: {fmtN(m.minQty)}</span>
                  <span style={{fontSize:9.5,color:T.t4}}>Max: {fmtN(m.maxQty)}</span>
                </div>

                {/* Footer */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:9,borderTop:`1px solid ${T.b1}`}}>
                  <div>
                    <div style={{fontSize:9.5,color:T.t4,marginBottom:1}}>Value</div>
                    <div style={{fontSize:12.5,fontWeight:700,color:T.blu}}>₹{fmt(val)}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9.5,color:T.t4,marginBottom:1}}>{m.location}</div>
                    <div style={{fontSize:10,color:T.t3}}>@₹{fmtN(m.rate)}/{m.unit}</div>
                  </div>
                </div>

                {/* Quick actions on select */}
                {selItem?.id===m.id&&(
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <button onClick={e=>{e.stopPropagation();onIssue(m);}}
                      style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      <IcOut size={11} color={T.amb}/> Issue
                    </button>
                    <button onClick={e=>{e.stopPropagation();onAddStock(m);}}
                      style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      <IcIn size={11} color={T.grn}/> Add Stock
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view==="list"&&(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"70px 1fr 130px 90px 90px 90px 100px 80px",padding:"7px 14px",background:T.sb}}>
            {["Code","Material","Category","Stock","Unit","Min Qty","Value","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {filtered.map(m=>{
            const ss=getStockStatus(m);
            return(
              <div key={m.id}
                style={{display:"grid",gridTemplateColumns:"70px 1fr 130px 90px 90px 90px 100px 80px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",borderLeft:`3px solid ${ss.c}44`}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={()=>onIssue(m)}>
                <span style={{fontSize:10.5,color:T.t4,fontFamily:"monospace"}}>{m.id}</span>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:15}}>{m.img}</span>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{m.name}</div>
                    <div style={{fontSize:10,color:T.t4}}>{m.location}</div>
                  </div>
                </div>
                <span style={{fontSize:11,color:T.t3}}>{m.category.split(" ")[0]}</span>
                <span style={{fontSize:13,fontWeight:700,color:m.qty<m.minQty?T.red:T.t1}}>{fmtN(m.qty)}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{m.unit}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{fmtN(m.minQty)}</span>
                <span style={{fontSize:12.5,fontWeight:600,color:T.blu}}>₹{fmt(m.qty*m.rate)}</span>
                <Pill label={ss.label} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
            );
          })}
          {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>No materials found</div>}
        </div>
      )}
    </div>
  );
}

// ── GRN TAB (Material IN) ─────────────────────────────────────────
function GrnTab({grns}){
  const [sel,setSel]=useState(null);
  const STATUS_S={"Verified":{c:T.grn,bg:T.grnL,brd:T.grnM},"Partial":{c:T.amb,bg:T.ambL,brd:T.ambM},"Pending":{c:T.slt,bg:T.sltL,brd:T.b2}};
  return(
    <div style={{display:"flex",gap:12,height:"100%"}}>
      {/* GRN List */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:600,color:T.t2}}>{grns.length} Receipts</span>
          <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> New GRN
          </button>
        </div>
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"100px 1fr 1fr 120px 90px 80px",padding:"7px 14px",background:T.sb}}>
            {["GRN No","Date","Vendor","PO No","Total","Status"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {grns.map(g=>{
            const ss=STATUS_S[g.status]||STATUS_S["Pending"];
            const isS=sel?.id===g.id;
            return(
              <div key={g.id} onClick={()=>setSel(isS?null:g)}
                style={{display:"grid",gridTemplateColumns:"100px 1fr 1fr 120px 90px 80px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",background:isS?T.bluL:"transparent",borderLeft:isS?`3px solid ${T.blu}`:"3px solid transparent"}}
                onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="transparent";}}>
                <span style={{fontSize:11.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{g.id}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{g.date.split(" ").slice(0,2).join(" ")}</span>
                <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.vendor}</span>
                <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{g.poNo}</span>
                <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(g.total)}</span>
                <Pill label={g.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRN Detail panel */}
      {sel&&(
        <div style={{width:340,flexShrink:0,background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 220px)"}}>
          <div style={{background:T.sb,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>{sel.id}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{sel.vendor} · {sel.date}</div>
            </div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          {/* Meta */}
          <div style={{padding:"11px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,flexShrink:0}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["PO Number",sel.poNo],["Received By",sel.by],["Total Value",`₹${fmtN(sel.total)}`],["Status",sel.status]].map(([l,v],i)=>(
                <div key={i}><div style={{fontSize:9,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{v}</div></div>
              ))}
            </div>
          </div>
          {/* Items */}
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
            <button style={{flex:1,padding:"7px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>Verify & Accept</button>
            <button style={{flex:1,padding:"7px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,color:T.t3,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Print GRN</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ISSUE TAB (Material OUT) ──────────────────────────────────────
function IssueTab({issues}){
  const [sel,setSel]=useState(null);
  const [fProj,setFProj]=useState("All");
  const filtered=issues.filter(i=>fProj==="All"||i.project===fProj);
  return(
    <div style={{display:"flex",gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <select value={fProj} onChange={e=>setFProj(e.target.value)}
            style={{height:32,padding:"0 10px",borderRadius:7,border:`1.5px solid ${fProj!=="All"?T.blu:T.b1}`,background:fProj!=="All"?T.bluL:T.surface,fontSize:12,color:fProj!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="All">All Projects</option>
            {PROJECTS.map(p=><option key={p}>{p}</option>)}
          </select>
          <span style={{fontSize:11,color:T.t4}}>{filtered.length} issues</span>
          <div style={{flex:1}}/>
          <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.amb,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcOut size={13} color="white"/> Issue Material
          </button>
        </div>
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 140px 110px 90px",padding:"7px 14px",background:T.sb}}>
            {["Issue No","Date","Project","Issued To","Total","By"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {filtered.map(iss=>{
            const isS=sel?.id===iss.id;
            return(
              <div key={iss.id} onClick={()=>setSel(isS?null:iss)}
                style={{display:"grid",gridTemplateColumns:"100px 90px 1fr 140px 110px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background .1s",background:isS?T.ambL:"transparent",borderLeft:`3px solid ${isS?T.amb:T.amb+"33"}`}}
                onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}}
                onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="transparent";}}>
                <span style={{fontSize:11.5,fontWeight:700,color:T.amb,fontFamily:"monospace"}}>{iss.id}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{iss.date.split(" ").slice(0,2).join(" ")}</span>
                <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{iss.project}</span>
                <span style={{fontSize:11.5,color:T.t2}}>{iss.issuedTo}</span>
                <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(iss.total)}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{iss.by}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issue Detail */}
      {sel&&(
        <div style={{width:320,flexShrink:0,background:T.surface,borderRadius:9,border:`1px solid ${T.ambM}`,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 220px)"}}>
          <div style={{background:T.sb,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div><div style={{fontSize:13,fontWeight:700,color:"white"}}>{sel.id}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{sel.project} · {sel.date}</div></div>
            <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"11px 14px"}}>
            <div style={{marginBottom:10,padding:"8px 11px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:9.5,color:T.t4,marginBottom:2}}>Remarks</div>
              <div style={{fontSize:12.5,color:T.t2,fontStyle:"italic"}}>"{sel.remarks}"</div>
            </div>
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

// ── MR TAB (Material Requests) ────────────────────────────────────
function MRTab({mrs,onIssueFromMR}){
  const [fStatus,setFStatus]=useState("All");
  const STATUS_S={"Pending":{c:T.amb,bg:T.ambL,brd:T.ambM},"Issued":{c:T.grn,bg:T.grnL,brd:T.grnM},"Partial":{c:T.blu,bg:T.bluL,brd:T.bluM},"Rejected":{c:T.red,bg:T.redL,brd:T.redM}};
  const PRIO_S={"High":{c:T.red,bg:T.redL},"Medium":{c:T.amb,bg:T.ambL},"Low":{c:T.slt,bg:T.sltL}};
  const filtered=mrs.filter(m=>fStatus==="All"||m.status===fStatus);
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        {["All","Pending","Issued","Partial","Rejected"].map(s=>(
          <button key={s} onClick={()=>setFStatus(s)}
            style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${fStatus===s?(STATUS_S[s]?.brd||T.blu):T.b1}`,background:fStatus===s?(STATUS_S[s]?.bg||T.bluL):"none",color:fStatus===s?(STATUS_S[s]?.c||T.blu):T.t3,fontSize:11.5,fontWeight:fStatus===s?700:400,cursor:"pointer"}}>
            {s} {s!=="All"&&<span style={{marginLeft:3,fontWeight:800}}>{mrs.filter(m=>m.status===s).length}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.pur||"#7C3AED",color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
          <IcMR size={13} color="white"/> New MR
        </button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(mr=>{
          const ss=STATUS_S[mr.status]||STATUS_S["Pending"];
          const ps=PRIO_S[mr.priority]||PRIO_S["Medium"];
          return(
            <div key={mr.id} style={{background:T.surface,borderRadius:9,border:`1px solid ${mr.status==="Pending"?T.ambM:T.b1}`,overflow:"hidden",boxShadow:mr.status==="Pending"?"0 2px 8px rgba(217,119,6,0.08)":"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${ss.c}`}}>
                {/* MR info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{mr.id}</span>
                    <Pill label={mr.status} c={ss.c} bg={ss.bg} brd={ss.brd}/>
                    <Pill label={mr.priority} c={ps.c} bg={ps.bg}/>
                    <span style={{fontSize:10.5,color:T.t4}}>{mr.date.split(" ").slice(0,2).join(" ")}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1,marginBottom:3}}>{mr.project}</div>
                  <div style={{fontSize:11,color:T.t4}}>Requested by {mr.requestedBy}</div>
                </div>

                {/* Items summary */}
                <div style={{minWidth:200}}>
                  {mr.items.map((it,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{it.name}</span>
                      <span style={{fontSize:11.5,fontWeight:600,color:T.t1,flexShrink:0,marginLeft:6}}>{fmtN(it.qty)} {it.unit}</span>
                    </div>
                  ))}
                  {mr.items[0]?.note&&<div style={{fontSize:10.5,color:T.t4,fontStyle:"italic",marginTop:2}}>"{mr.items[0].note}"</div>}
                </div>

                {/* Action */}
                {mr.status==="Pending"&&(
                  <button onClick={()=>onIssueFromMR(mr)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.amb,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",flexShrink:0,boxShadow:"0 2px 6px rgba(217,119,6,0.3)"}}>
                    <IcOut size={13} color="white"/> Issue Now
                  </button>
                )}
                {mr.status==="Issued"&&(
                  <div style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,flexShrink:0}}>
                    <IcChk size={12} color={T.grn}/>
                    <span style={{fontSize:11.5,color:T.grn,fontWeight:600}}>Issued</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>No material requests found</div>}
      </div>
    </div>
  );
}

// ── TRANSFERS TAB ──────────────────────────────────────────────────
function TransfersTab({transfers}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.cyn||"#0891B2",color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
          <IcTrns size={13} color="white"/> New Transfer
        </button>
      </div>
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"110px 90px 1fr 1fr 120px 90px",padding:"7px 14px",background:T.sb}}>
          {["Transfer No","Date","From","To","By","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {transfers.map(t=>(
          <div key={t.id}
            style={{display:"grid",gridTemplateColumns:"110px 90px 1fr 1fr 120px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background .1s",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:11.5,fontWeight:700,color:T.cyn||"#0891B2",fontFamily:"monospace"}}>{t.id}</span>
            <span style={{fontSize:11.5,color:T.t3}}>{t.date.split(" ").slice(0,2).join(" ")}</span>
            <div>
              <div style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.from}</div>
              <div style={{fontSize:10,color:T.t4}}>{t.items.map(i=>`${i.name} ×${i.qty}`).join(", ").slice(0,40)}</div>
            </div>
            <span style={{fontSize:12,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.to}</span>
            <span style={{fontSize:11.5,color:T.t3}}>{t.by}</span>
            <Pill label={t.status} c={T.grn} bg={T.grnL} brd={T.grnM}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ISSUE MODAL ───────────────────────────────────────────────────
function IssueModal({material,onClose}){
  const [form,setForm]=useState({project:PROJECTS[0],issuedTo:"",qty:"",remarks:""});
  const [saving,setSaving]=useState(false);
  const maxQty=material?.qty||0;
  const upd=(k)=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const team=[];

  const handleSubmit=async()=>{
    if(!form.qty||Number(form.qty)<=0||Number(form.qty)>maxQty) return;
    setSaving(true);
    try{
      const res=await api.post("/warehouse/issues",{
        items:[{material_id:material.id,qty:Number(form.qty),rate:material.rate}],
        remarks:form.remarks||null,
      });
      if(res.success) onClose();
      else alert(res.message||"Issue failed");
    }catch(e){alert(e.response?.data?.message||e.message||"Error issuing material");}
    setSaving(false);
  };
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(460px,95vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>Issue Material</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{material?.name} · Available: {fmtN(maxQty)} {material?.unit}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        {/* Material info bar */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:14}}>
          <span style={{fontSize:22}}>{material?.img}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{material?.name}</div>
            <div style={{fontSize:10.5,color:T.t4}}>{material?.id} · {material?.location} · ₹{fmtN(material?.rate)}/{material?.unit}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9.5,color:T.t4,marginBottom:1}}>Available</div>
            <div style={{fontSize:18,fontWeight:800,color:T.grn}}>{fmtN(maxQty)} <span style={{fontSize:11,fontWeight:400}}>{material?.unit}</span></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[{l:"Project",k:"project",type:"select",opts:PROJECTS},{l:"Issued To",k:"issuedTo",type:"select",opts:team}].map(f=>(
            <div key={f.k}><label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              <SearchSelect value={form[f.k]} options={f.opts}
                onChange={v=>setForm(p=>({...p,[f.k]:v}))} placeholder={`Select ${f.l.toLowerCase()}...`}/>
            </div>
          ))}
        </div>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Quantity ({material?.unit}) *</label>
          <input type="number" value={form.qty} onChange={upd("qty")} placeholder={`Max ${maxQty}`} min={1} max={maxQty}
            style={{width:"100%",padding:"9px 11px",borderRadius:7,border:`1.5px solid ${Number(form.qty)>maxQty?T.red:T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          {Number(form.qty)>0&&<div style={{fontSize:11,color:T.blu,marginTop:3}}>Value: ₹{fmtN(Number(form.qty)*(material?.rate||0))}</div>}
          {Number(form.qty)>maxQty&&<div style={{fontSize:11,color:T.red,marginTop:3}}>⚠ Exceeds available stock</div>}
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Remarks</label>
          <input value={form.remarks} onChange={upd("remarks")} placeholder="e.g. GF slab casting..."
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSubmit} disabled={!form.qty||Number(form.qty)>maxQty||saving}
            style={{flex:2,padding:"10px",borderRadius:7,background:form.qty&&Number(form.qty)<=maxQty?T.amb:T.b1,color:form.qty&&Number(form.qty)<=maxQty?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:form.qty?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IcOut size={14} color={form.qty?"white":T.t4}/> {saving?"Issuing...":"Confirm Issue"}
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ── ADD STOCK MODAL ───────────────────────────────────────────────
function AddStockModal({material,onClose}){
  const [form,setForm]=useState({qty:"",vendor:"",poNo:"",rate:material?.rate||"",remarks:""});
  const [saving,setSaving]=useState(false);
  const upd=(k)=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const handleSubmit=async()=>{
    if(!form.qty||Number(form.qty)<=0) return;
    setSaving(true);
    try{
      const res=await api.post(`/warehouse/materials/${material.id}/add-stock`,{
        qty:Number(form.qty),
        rate:Number(form.rate)||material?.rate||0,
      });
      if(res.success) onClose();
      else alert(res.message||"Failed to add stock");
    }catch(e){alert(e.response?.data?.message||e.message||"Error adding stock");}
    setSaving(false);
  };
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(440px,95vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:T.sb,padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>Add Stock</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{material?`${material.name} · Current: ${fmtN(material.qty)} ${material.unit}`:"Add new material receipt"}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        {material&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:8,marginBottom:14}}>
          <span style={{fontSize:20}}>{material.img}</span>
          <div><div style={{fontSize:13,fontWeight:700,color:T.grn}}>{material.name}</div>
            <div style={{fontSize:10.5,color:T.grn}}>Current: {fmtN(material.qty)} {material.unit} · {material.location}</div></div>
        </div>}
        <div style={{marginBottom:10}}>
          <label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Quantity ({material?.unit||"Units"}) *</label>
          <input type="number" value={form.qty} onChange={upd("qty")} placeholder="Enter quantity received"
            style={{width:"100%",padding:"9px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
          {material&&form.qty&&<div style={{fontSize:11,color:T.grn,marginTop:3}}>New total: {fmtN(material.qty+Number(form.qty))} {material.unit}</div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[{l:"Vendor",k:"vendor",ph:"Supplier name"},{l:"PO No",k:"poNo",ph:"PO-2026-XXX"},{l:"Rate (₹)",k:"rate",ph:"Per unit rate"},{l:"Remarks",k:"remarks",ph:"Optional note"}].map(f=>(
            <div key={f.k}><label style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>{f.l}</label>
              <input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/></div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSubmit} disabled={!form.qty||saving}
            style={{flex:2,padding:"10px",borderRadius:7,background:form.qty?T.grn:T.b1,color:form.qty?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:form.qty?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IcIn size={14} color={form.qty?"white":T.t4}/> {saving?"Adding...":"Add to Warehouse"}
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ── WAREHOUSE MODULE ──────────────────────────────────────────────
function WarehouseModule(){
  const [tab,setTab]=useState("stock");
  const [stock,setStock]=useState([]);
  const [grns,setGrns]=useState([]);
  const [issues,setIssues]=useState([]);
  const [mrs,setMrs]=useState([]);
  const [transfers,setTransfers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [issueTarget,setIssueTarget]=useState(null);
  const [addStockTarget,setAddStockTarget]=useState(null);

  // Load all warehouse data
  const loadAll=useCallback(async()=>{
    setLoading(true);
    try{
      const [sRes,gRes,iRes,mRes,tRes]=await Promise.all([
        api.get("/warehouse/materials"),
        api.get("/warehouse/grn"),
        api.get("/warehouse/issues"),
        api.get("/warehouse/mr"),
        api.get("/warehouse/transfers"),
      ]);
      if(sRes.success) setStock(sRes.data.map(m=>({...m,qty:Number(m.qty)||0,min_qty:Number(m.min_qty)||0,max_qty:Number(m.max_qty)||0,rate:Number(m.rate)||0,minQty:Number(m.min_qty)||0,maxQty:Number(m.max_qty)||0,img:getCategoryEmoji(m.category)})));
      const fmtDate=(d)=>{if(!d)return"—";const dt=new Date(d);return isNaN(dt)?"—":dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});};
      if(gRes.success) setGrns(gRes.data.map(g=>({...g,id:g.grn_no||`GRN-${g.id}`,dbId:g.id,date:fmtDate(g.date),poNo:g.po_no||"—",vendor:g.vendor||"—",by:g.received_by_name||"—",total:Number(g.total)||0,items:(g.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,ordQty:Number(it.ordered_qty)||0,recQty:Number(it.received_qty)||0,rate:Number(it.rate)||0,amount:Number(it.amount)||0,unit:it.unit||""}))})));
      if(iRes.success) setIssues(iRes.data.map(i=>({...i,id:i.issue_no||`ISS-${i.id}`,dbId:i.id,date:fmtDate(i.date),project:i.project_name||"—",issuedTo:i.issued_to_name||"—",by:i.issued_by_name||"—",total:Number(i.total)||0,remarks:i.remarks||"",items:(i.items||[]).map(it=>({...it,name:it.material_name||it.name||"—",matId:it.material_id,qty:Number(it.qty)||0,rate:Number(it.rate)||0,unit:it.unit||""}))})));
      if(mRes.success) setMrs(mRes.data.map(m=>({...m,project:m.project_name||"—",requestedBy:m.requested_by_name||"—",id:m.mr_no||`MR-${m.id}`,date:fmtDate(m.date),items:m.items||[]})));
      if(tRes.success) setTransfers(tRes.data.map(t=>({...t,from:t.from_location||"—",to:t.to_location||"—",by:t.transferred_by_name||"—",id:t.transfer_no||`TRF-${t.id}`,date:fmtDate(t.date),items:t.items||[]})));
    }catch(e){console.error("Warehouse load error:",e);}
    setLoading(false);
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

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
    {l:"Total Items",    v:totalItems,       sub:`${CATEGORIES.length-1} categories`,      c:T.blu, I:IcBox},
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

      {/* KPI Tiles */}
      <div style={{padding:"12px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILE_DATA.map((s,i)=><StatCard key={i} label={s.l} value={s.v} sub={s.sub} color={s.c} icon={s.I}/>)}
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStock.length>0&&(
        <div style={{margin:"0 18px 6px",padding:"8px 13px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}>
          <IcAlert size={13} color={T.red}/>
          <span style={{fontSize:12,fontWeight:700,color:T.red}}>Low Stock Alert:</span>
          <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
            {lowStock.map(m=>(
              <button key={m.id} onClick={()=>{setTab("stock");}}
                style={{background:T.red,color:"white",fontSize:10.5,fontWeight:600,padding:"2px 9px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
                {m.name} ({fmtN(m.qty)} {m.unit})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dark Tab Bar */}
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

      {/* Tab Content */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 18px 16px"}}>
        {tab==="stock"&&<StockTab stock={stock} onIssue={m=>setIssueTarget(m)} onAddStock={m=>setAddStockTarget(m||null)}/>}
        {tab==="grn"&&<GrnTab grns={grns}/>}
        {tab==="issue"&&<IssueTab issues={issues}/>}
        {tab==="mr"&&<MRTab mrs={mrs} onIssueFromMR={mr=>{setTab("issue");}}/>}
        {tab==="transfer"&&<TransfersTab transfers={transfers}/>}
      </div>

      {/* Modals */}
      {issueTarget&&<IssueModal material={issueTarget} onClose={()=>{setIssueTarget(null);loadAll();}}/>}
      {addStockTarget!==null&&<AddStockModal material={addStockTarget} onClose={()=>{setAddStockTarget(null);loadAll();}}/>}

      <style>{`
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

export default WarehouseModule;
