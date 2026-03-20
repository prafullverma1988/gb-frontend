import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../config/api";

// ── ICONS ─────────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none",style})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}><path d={d}/></svg>
);
const IcHome  =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcFin   =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcWH    =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcProc  =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcSrch  =(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcPO    =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcRFQ   =(p)=><Ic {...p} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>;
const IcMR    =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>;
const IcTruck =(p)=><Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>;
const IcShare =(p)=><Ic {...p} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>;
const IcLock  =(p)=><Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/>;
const IcWA    =(p)=><Ic {...p} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>;
const IcMail  =(p)=><Ic {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/>;
const IcSMS   =(p)=><Ic {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcFlow  =(p)=><Ic {...p} d="M5 12h14M12 5l7 7-7 7"/>;
const IcApprv =(p)=><Ic {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>;
const IcGRN   =(p)=><Ic {...p} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>;
const IcPen   =(p)=><Ic {...p} d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>;
const IcCopy  =(p)=><Ic {...p} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>;
const IcGrid  =(p)=><Ic {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>;
const IcListV =(p)=><Ic {...p} d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcDirect=(p)=><Ic {...p} d="M12 2v10m0 0l-3-3m3 3l3-3M3 17a9 9 0 0018 0"/>;
const IcHist  =(p)=><Ic {...p} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>;
const IcBarcode=(p)=><Ic {...p} d="M3 9V5a2 2 0 012-2h2M3 15v4a2 2 0 002 2h2M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4M7 8v8M10 8v8M13 8v8M16 8v8"/>;

// ── THEME ─────────────────────────────────────────────────────────────
const T={bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",b1:"#E5E7EB",b2:"#D1D5DB",blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",slt:"#64748B",sltL:"#F1F5F9",pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE"};
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");

// ── STATUS CONFIG ─────────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(<span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>);
const StatTile=({label,value,sub,color,onClick,active})=>(
  <div onClick={onClick} style={{padding:"13px 15px",background:active?color+"10":T.surface,border:`1.5px solid ${active?color+"44":T.b1}`,borderRadius:8,borderTop:`3px solid ${color}`,cursor:onClick?"pointer":"default",transition:"all 0.15s"}}>
    <div style={{fontSize:10,color:active?color:T.t3,fontWeight:600,letterSpacing:".5px",textTransform:"uppercase",marginBottom:5}}>{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:active?color:T.t1,letterSpacing:"-.5px",lineHeight:1}}>{value}</div>
    <div style={{fontSize:11,color:active?color:T.t4,marginTop:4,opacity:active?1:0.8}}>{sub}</div>
    {active&&<div style={{height:2,background:color,borderRadius:2,marginTop:8}}/>}
  </div>
);

const PO_STATUS={Open:{c:T.blu,bg:T.bluL,brd:T.bluM},Closed:{c:T.grn,bg:T.grnL,brd:T.grnM},partial:{c:T.pur,bg:T.purL,brd:T.purM},cancelled:{c:T.slt,bg:T.sltL,brd:T.b2}};
const APPR_STATUS={Approved:{c:T.grn,bg:T.grnL,brd:T.grnM},Draft:{c:T.amb,bg:T.ambL,brd:T.ambM},approved:{c:T.grn,bg:T.grnL,brd:T.grnM},pending:{c:T.amb,bg:T.ambL,brd:T.ambM}};
const RFQ_STATUS={Published:{c:T.blu,bg:T.bluL,brd:T.bluM},Draft:{c:T.slt,bg:T.sltL,brd:T.b2}};
const MAT_STATUS={Pending:{c:T.slt,bg:T.sltL,brd:T.b2},Ordered:{c:T.blu,bg:T.bluL,brd:T.bluM},Received:{c:T.grn,bg:T.grnL,brd:T.grnM},pending:{c:T.slt,bg:T.sltL,brd:T.b2},approved:{c:T.grn,bg:T.grnL,brd:T.grnM}};

const UNITS=["Bag","MT","KG","CFT","CuM","Sqft","Nos","Ltr","RFt","Set","Box","Day"];
const HEADS=["Civil","Structural","Electrical","Plumbing","Finishing","Mechanical","Safety","General"];

// ── SEARCHSELECT ──────────────────────────────────────────────────────
function SearchSelect({options=[],value,onChange,placeholder="Select...",accent=T.blu}){
  const [open,setOpen]=useState(false);const [q,setQ]=useState("");
  const [pos,setPos]=useState({top:0,left:0,width:200});
  const ref=useRef();const listRef=useRef();
  const filtered=options.filter(o=>(typeof o==="string"?o:o.label).toLowerCase().includes(q.toLowerCase()));
  const openDrop=()=>{const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+2,left:r.left,width:Math.max(r.width,180)});setOpen(true);setQ("");};
  useEffect(()=>{
    if(!open) return;
    const close=(e)=>{if(!ref.current?.contains(e.target)&&!listRef.current?.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);
  },[open]);
  const sel=(v)=>{onChange(v);setOpen(false);setQ("");};
  return(
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={open?()=>setOpen(false):openDrop} style={{height:32,padding:"0 26px 0 9px",borderRadius:7,border:`1.5px solid ${open?accent:T.b1}`,fontSize:12,background:T.surface,cursor:"pointer",display:"flex",alignItems:"center",color:value?T.t1:T.t4,boxSizing:"border-box",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        {value||placeholder}
      </div>
      <span style={{position:"absolute",right:6,top:"50%",transform:`translateY(-50%) rotate(${open?180:0}deg)`,pointerEvents:"none",transition:"transform 0.18s",color:T.t4,display:"flex"}}><IcDown size={12}/></span>
      {open&&createPortal(
        <div ref={listRef} style={{position:"fixed",top:pos.top,left:pos.left,minWidth:pos.width,background:T.surface,borderRadius:8,border:`1.5px solid ${accent}`,boxShadow:"0 8px 28px rgba(0,0,0,0.18)",zIndex:99999,maxHeight:220,overflowY:"auto"}}>
          <div style={{padding:"5px 7px",borderBottom:`1px solid ${T.b1}`}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." autoFocus style={{width:"100%",height:27,padding:"0 8px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",boxSizing:"border-box"}}/>
          </div>
          {filtered.length===0&&<div style={{padding:"10px",fontSize:11,color:T.t4,textAlign:"center"}}>No results</div>}
          {filtered.map((o,i)=>{
            const label=typeof o==="string"?o:o.label;const val=typeof o==="string"?o:o.value;
            return(<div key={i} onMouseDown={()=>sel(val)} style={{padding:"7px 10px",fontSize:12,cursor:"pointer",color:val===value?accent:T.t1,fontWeight:val===value?700:400,background:val===value?accent+"14":"transparent",borderBottom:i<filtered.length-1?`1px solid ${T.b1}`:"none"}}>{label}</div>);
          })}
        </div>,document.body
      )}
    </div>
  );
}

// ── MANUAL ORDER MODAL ────────────────────────────────────────────────
function ManualOrderModal({mr,vendors,onSave,onClose}){
  const [vendor,setVendor]=useState(mr.vendor_name||mr.vendor||"");
  const [delivery,setDelivery]=useState(mr.expectedDelivery||"");
  const [custom,setCustom]=useState("");
  const vendorOptions=[...(vendors.map(v=>v.name)||["Abhay Traders","Vaibhav Traders"]),"Other (type below)"];
  const finalVendor=vendor==="Other (type below)"?custom:vendor;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:420,overflow:"hidden"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Mark as Ordered</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{mr.mr_number||mr.id} · {mr.item_name||mr.item}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
          <IcMR size={14} color={T.amb} style={{flexShrink:0,marginTop:1}}/>
          <div style={{fontSize:11.5,color:T.amb}}><strong>No PO created.</strong> Manually marking as ordered. Enter vendor details below.</div>
        </div>
        <div style={{marginBottom:13}}>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Select Vendor</label>
          <select value={vendor} onChange={e=>setVendor(e.target.value)} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
            <option value="">-- Select vendor --</option>
            {vendorOptions.map(v=><option key={v}>{v}</option>)}
          </select>
        </div>
        {vendor==="Other (type below)"&&(
          <div style={{marginBottom:13}}>
            <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Vendor Name</label>
            <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Enter vendor name..." style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
        )}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Expected Delivery Date</label>
          <input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(mr.id||mr.mr_number,finalVendor,delivery)} disabled={!finalVendor||!delivery}
            style={{flex:2,padding:"9px",borderRadius:7,background:finalVendor&&delivery?T.blu:T.b1,color:finalVendor&&delivery?"white":T.t4,fontSize:12.5,fontWeight:700,border:"none",cursor:finalVendor&&delivery?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <IcTruck size={14} color="currentColor"/> Mark as Ordered
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ── SHARE MODAL ───────────────────────────────────────────────────────
function ShareModal({rfq,onClose}){
  const [copied,setCopied]=useState(null);
  const fakeLink=`https://gbuildcon.in/rfq/${rfq.id}?token=xK9mP`;
  const copyLink=(v)=>{setCopied(v);setTimeout(()=>setCopied(null),2000);};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:440,overflow:"hidden"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Share Vendor Link</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{rfq.id} · {rfq.project}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.blu}}>Each vendor gets a unique link to fill rates. No login required.</div>
        {(rfq.vendors||[]).map((v,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:8,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{v.name}</span>
              <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
            </div>
            <div style={{fontSize:10.5,color:T.t4,background:T.surface,borderRadius:5,padding:"6px 9px",fontFamily:"monospace",marginBottom:8,wordBreak:"break-all"}}>{fakeLink}&vendor={i+1}</div>
            <div style={{display:"flex",gap:6}}>
              {[{Icon:IcWA,label:"WhatsApp",c:"#25D366",bg:"#E8FDF1"},{Icon:IcMail,label:"Email",c:T.blu,bg:T.bluL},{Icon:IcSMS,label:"SMS",c:T.pur,bg:T.purL},{Icon:IcCopy,label:copied===i?"Copied!":"Copy",c:T.slt,bg:T.sltL}].map((btn,j)=>(
                <button key={j} onClick={()=>copyLink(i)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:btn.bg,border:`1px solid ${btn.c}22`,color:btn.c,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                  <btn.Icon size={12} color="currentColor"/> {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{width:"100%",marginTop:4,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>Done</button>
      </div>
    </div>
  </>);
}

// ── PUNCH QUOTATION MODAL ─────────────────────────────────────────────
function PunchQuoteModal({rfq,vendorIndex,onSave,onClose}){
  const vendor=rfq.vendors[vendorIndex];
  const [rates,setRates]=useState(rfq.items.map((_,i)=>({rate:vendor?.rates[i]?.rate||"",remark:vendor?.rates[i]?.remarks||""})));
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:480,overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Punch Quotation</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>On behalf of: <strong style={{color:"white"}}>{vendor?.name}</strong></div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11.5,color:T.amb}}>Admin is entering rates on vendor's behalf.</div>
        {rfq.items.map((item,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:2}}>{item.desc}</div>
            <div style={{fontSize:10.5,color:T.t4,marginBottom:10}}>HSN: {item.hsn} · {item.qty} {item.unit} · Delivery: {item.deliveryDate}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Rate per {item.unit} (₹)</label>
                <input type="number" value={rates[i].rate} onChange={e=>{const r=[...rates];r[i]={...r[i],rate:e.target.value};setRates(r);}} placeholder="Enter rate..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                {rates[i].rate&&<div style={{fontSize:10.5,color:T.grn,marginTop:3}}>Total: ₹{fmtN(Number(rates[i].rate)*item.qty)}</div>}
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Remarks</label>
                <input value={rates[i].remark} onChange={e=>{const r=[...rates];r[i]={...r[i],remark:e.target.value};setRates(r);}} placeholder="Optional..." style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(vendorIndex,rates)} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcChk size={14} color="white"/> Save Quotation
        </button>
      </div>
    </div>
  </>);
}

// ── PO DETAIL DRAWER ──────────────────────────────────────────────────
function PODetailDrawer({po,onClose,onApprove,onShare}){
  const apSm=APPR_STATUS[po.approval]||APPR_STATUS[po.status]||APPR_STATUS.pending;
  const poSm=PO_STATUS[po.poStatus]||PO_STATUS[po.status]||PO_STATUS.Open;
  const items=po.items||[];
  const total=items.reduce((s,i)=>s+(i.qty||0)*(i.rate||i.amount/i.qty||0),0)||parseFloat(po.po_value||po.amount)||0;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:480,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{po.po_number||po.id}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{po.vendor_name||po.vendor} · {po.project_name||po.project} · {po.created_at?.slice(0,10)||po.date}</div>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Pill label={po.status||po.poStatus||"Open"} c={poSm.c} bg={poSm.bg} brd={poSm.brd}/>
          <Pill label={po.approval||po.status||"pending"} c={apSm.c} bg={apSm.bg} brd={apSm.brd}/>
          <span style={{background:"rgba(255,255,255,0.1)",color:"white",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>₹{fmtN(total)}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Purchase Order Details</div>
          {[["Vendor",po.vendor_name||po.vendor],["Project",po.project_name||po.project],["Delivery Date",po.expected_delivery||po.delivery||"—"],["Linked MR",po.mr_id?"MR-"+po.mr_id:po.linkedMR||"—"],["PO Date",po.created_at?.slice(0,10)||po.date]].map(([k,v])=>(
            <div key={k} style={{display:"flex",padding:"6px 0",borderBottom:`1px solid ${T.b1}`}}>
              <span style={{width:130,fontSize:11.5,color:T.t4,flexShrink:0}}>{k}</span>
              <span style={{fontSize:12,fontWeight:500,color:T.t1}}>{v}</span>
            </div>
          ))}
        </div>
        {items.length>0&&(
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 100px",padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
              {["Description","Qty","Unit","Rate","Amount"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
            </div>
            {items.map((it,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 100px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
                <div><div style={{fontSize:12.5,color:T.t1}}>{it.desc||it.item_name}</div><div style={{fontSize:10,color:T.t4}}>HSN: {it.hsn||it.hsn_code||"—"}</div></div>
                <span style={{fontSize:12,color:T.t2}}>{it.qty}</span>
                <span style={{fontSize:12,color:T.t3}}>{it.unit}</span>
                <span style={{fontSize:12,color:T.t2}}>₹{fmtN(it.rate)}</span>
                <span style={{fontSize:13,fontWeight:600,color:T.t1}}>₹{fmtN(it.amount||it.qty*it.rate)}</span>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 50px 60px 70px 100px",padding:"8px 14px",background:T.surfaceB,borderTop:`2px solid ${T.b2}`}}>
              <span style={{fontSize:12,fontWeight:700,color:T.t1}}>Total</span><span/><span/><span/>
              <span style={{fontSize:14,fontWeight:700,color:T.blu}}>₹{fmtN(total)}</span>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        {(po.status==="pending"||po.approval==="Draft")&&<button onClick={()=>onApprove(po.id||po.po_number)} style={{flex:1,padding:"8px",borderRadius:7,background:T.grnL,color:T.grn,border:`1px solid ${T.grnM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcApprv size={13} color={T.grn}/> Approve PO</button>}
        <button onClick={()=>onShare(po)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcShare size={13} color={T.blu}/> Share PO</button>
        <button style={{flex:1,padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Print / PDF</button>
      </div>
    </div>
  </>);
}

// ── RFQ DETAIL DRAWER ─────────────────────────────────────────────────
function RFQDetailDrawer({rfq,onClose,onPunch,onLock,onPublish}){
  const getMinMax=(itemIdx)=>{const submitted=rfq.vendors.filter(v=>v.status==="Submitted"&&v.rates[itemIdx]?.rate!=null);if(!submitted.length)return{min:null,max:null};const rates=submitted.map(v=>v.rates[itemIdx].rate);return{min:Math.min(...rates),max:Math.max(...rates)};};
  const totalByVendor=(v)=>rfq.items.reduce((s,item,i)=>s+(v.rates[i]?.rate||0)*item.qty,0);
  const allTotals=rfq.vendors.filter(v=>v.status==="Submitted").map(v=>totalByVendor(v));
  const minTotal=Math.min(...allTotals);const maxTotal=Math.max(...allTotals);
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:680,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{rfq.id} · {rfq.project}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Pill label={rfq.status} c={RFQ_STATUS[rfq.status]?.c||T.slt} bg={RFQ_STATUS[rfq.status]?.bg||T.sltL} brd={RFQ_STATUS[rfq.status]?.brd||T.b2}/>
          {rfq.bidEnd&&<span style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</span>}
          {rfq.locked&&<span style={{background:"rgba(5,150,105,0.25)",color:"#6EE7B7",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>Locked: {rfq.locked}</span>}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {/* Items */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items Requested</span></div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 80px 60px 70px 110px",padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            {["Description","HSN","Qty","Unit","Delivery"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {rfq.items.map((it,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 80px 60px 70px 110px",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center"}}>
              <span style={{fontSize:12.5,color:T.t1}}>{it.desc}</span>
              <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{it.hsn}</span>
              <span style={{fontSize:12,color:T.t2,fontWeight:600}}>{it.qty}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{it.unit}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{it.deliveryDate}</span>
            </div>
          ))}
        </div>
        {/* Vendor Rate Comparison */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Vendor Rate Comparison</span>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.grn}}><span style={{width:8,height:8,borderRadius:2,background:T.grn,display:"inline-block"}}/>Cheapest</span>
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.red}}><span style={{width:8,height:8,borderRadius:2,background:T.red,display:"inline-block"}}/>Expensive</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Vendor</span>
            {rfq.items.map((it,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc.split(" ").slice(0,2).join(" ")}</span>)}
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:"right"}}>Total</span>
          </div>
          {rfq.vendors.map((v,vi)=>{
            const vTotal=totalByVendor(v);
            const isBest=v.status==="Submitted"&&vTotal===minTotal&&allTotals.length>0;
            const isWorst=v.status==="Submitted"&&vTotal===maxTotal&&allTotals.length>1;
            const isLocked=rfq.locked===v.name;
            return(
              <div key={vi} style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:isLocked?"rgba(5,150,105,0.06)":"none",borderLeft:isLocked?`3px solid ${T.grn}`:"3px solid transparent"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:isLocked?T.grn:T.t1}}>{v.name}{isLocked&&<span style={{background:T.grn,color:"white",fontSize:8,fontWeight:700,padding:"1px 5px",borderRadius:3,marginLeft:5}}>LOCKED</span>}</div>
                  <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
                </div>
                {rfq.items.map((item,ii)=>{const {min,max}=getMinMax(ii);const rate=v.rates[ii]?.rate;const remark=v.rates[ii]?.remarks;const isCheap=rate!=null&&rate===min&&min!==max;const isExp=rate!=null&&rate===max&&min!==max;return(
                  <div key={ii} style={{padding:"2px 4px"}}>
                    {rate!=null?<div style={{fontSize:13,fontWeight:700,color:isCheap?T.grn:isExp?T.red:T.t1,background:isCheap?T.grnL:isExp?T.redL:"none",borderRadius:5,padding:"2px 6px",display:"inline-block"}}>₹{fmtN(rate)}</div>:<span style={{fontSize:11,color:T.t4}}>—</span>}
                    {remark&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{remark}</div>}
                  </div>
                );})}
                <div style={{textAlign:"right"}}>{v.status==="Submitted"?<span style={{fontSize:13,fontWeight:700,color:isBest?T.grn:isWorst?T.red:T.t1,background:isBest?T.grnL:isWorst?T.redL:"none",padding:"2px 7px",borderRadius:5,display:"inline-block"}}>₹{fmtN(vTotal)}</span>:<span style={{fontSize:11,color:T.t4}}>Pending</span>}</div>
              </div>
            );
          })}
        </div>
        {/* Vendor Actions */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Vendor Actions</span></div>
          {rfq.vendors.map((v,vi)=>(
            <div key={vi} style={{padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
              <span style={{flex:1,fontSize:12.5,fontWeight:500,color:T.t1}}>{v.name}</span>
              <button onClick={()=>onPunch(vi)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcPen size={12} color={T.pur}/> Punch Quote</button>
              {!rfq.locked&&v.status==="Submitted"&&<button onClick={()=>onLock(v.name)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcLock size={12} color={T.grn}/> Lock Best Quote</button>}
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        {rfq.status==="Draft"&&<button onClick={()=>onPublish(rfq.id)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Publish RFQ</button>}
        {rfq.locked&&<button style={{flex:1,padding:"8px",borderRadius:7,background:`linear-gradient(135deg,${T.grn},#047857)`,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcPO size={13} color="white"/> Create PO from Locked Quote</button>}
        <button onClick={onClose} style={{flex:1,padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </>);
}

// ── FLOW DRAWER ───────────────────────────────────────────────────────
function FlowDrawer({onClose}){
  const steps=[
    {n:1,action:"Material Request raised from site",who:"Site Team",Icon:IcMR,c:T.blu},
    {n:2,action:"Admin approves MR",who:"Admin",Icon:IcApprv,c:T.grn},
    {n:3,action:"Create RFQ — send links to vendors",who:"Procurement",Icon:IcRFQ,c:T.pur},
    {n:4,action:"Vendors fill rates via unique link",who:"Vendors",Icon:IcWA,c:"#25D366"},
    {n:5,action:"Best rate selected → Lock → PO created",who:"Procurement",Icon:IcLock,c:T.grn},
    {n:6,action:"Admin approves PO",who:"Admin",Icon:IcApprv,c:T.grn},
    {n:7,action:"Share PO (WhatsApp / Email)",who:"Procurement",Icon:IcShare,c:T.blu},
    {n:8,action:"Material delivered → GRN entry",who:"Site Team",Icon:IcGRN,c:T.amb},
    {n:9,action:"Vendor bill → Finance unbilled → enter invoice",who:"Accountant",Icon:IcPO,c:T.amb},
    {n:10,action:"Payment → Cash Book entry",who:"Admin",Icon:IcFin,c:T.grn},
  ];
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:420,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>Procurement Flow</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)",marginTop:2}}>End-to-end process</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {steps.map((s,i)=>(
          <div key={s.n} style={{display:"flex",gap:12,marginBottom:8}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:s.c+"18",border:`2px solid ${s.c}44`,display:"flex",alignItems:"center",justifyContent:"center"}}><s.Icon size={15} color={s.c}/></div>
              {i<steps.length-1&&<div style={{width:2,flex:1,background:T.b2,margin:"4px 0",minHeight:16}}/>}
            </div>
            <div style={{paddingTop:5,paddingBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                <span style={{fontSize:9.5,fontWeight:700,color:"white",background:s.c,width:18,height:18,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.n}</span>
                <span style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{s.action}</span>
              </div>
              <span style={{fontSize:10.5,color:T.t4,marginLeft:25}}>→ {s.who}</span>
            </div>
          </div>
        ))}
        <div style={{marginTop:4,padding:"12px 14px",background:T.redL,borderRadius:8,border:`1px solid ${T.redM}`,borderLeft:`3px solid ${T.red}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <span style={{fontSize:9.5,fontWeight:700,color:"white",background:T.red,padding:"1px 7px",borderRadius:10}}>ALT</span>
            <span style={{fontSize:12,fontWeight:600,color:T.red}}>Direct Receipt (No MR/PO)</span>
          </div>
          <div style={{fontSize:11.5,color:T.red,lineHeight:1.5}}>Site receives material without MR/PO → Log direct receipt → Auto-appears in Finance unbilled</div>
        </div>
      </div>
    </div>
  </>);
}

// ── GRN MODAL ─────────────────────────────────────────────────────────
function GRNModal({po,onClose,onSave}){
  const [received,setReceived]=useState((po.items||[{qty:1,quality:"Good",remark:""}]).map(it=>({qty:it.qty||1,quality:"Good",remark:""})));
  const [challan,setChallan]=useState("");const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [saving,setSaving]=useState(false);
  const save=async()=>{
    setSaving(true);
    try{
      const items=(po.items||[]).map((it,i)=>({item_name:it.desc||it.item_name,unit:it.unit||"",qty_ordered:it.qty||0,qty_received:parseFloat(received[i]?.qty)||0,rate:it.rate||0,po_item_id:it.id||null,po_rate:it.rate||0}));
      const res=await api.post("/procurement/grn",{po_id:po.id,project_id:po.project_id,party_id:po.party_id,party_name:po.vendor_name||po.vendor,challan_no:challan||null,received_date:date,is_partial:received.some((r,i)=>parseFloat(r.qty)<(po.items?.[i]?.qty||0)),items});
      if(res?.success!==false){onSave(po.id||po.po_number);}
    }catch(e){alert(e.message);}
    setSaving(false);
  };
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:560,overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#00695C",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Record GRN — Goods Received</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.6)",marginTop:2}}>{po.po_number||po.id} · {po.vendor_name||po.vendor}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Challan No.</label><input value={challan} onChange={e=>setChallan(e.target.value)} placeholder="Vendor challan / DN number" style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
          <div><label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Received Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Items Received</div>
        {(po.items||[]).map((it,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"10px 13px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div><div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{it.desc||it.item_name}</div><div style={{fontSize:10.5,color:T.t4}}>PO Qty: {it.qty} {it.unit}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:10.5,color:T.t4}}>Rate: ₹{fmtN(it.rate||0)}/{it.unit}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Qty Received</label>
                <input type="number" value={received[i]?.qty} onChange={e=>{const r=[...received];r[i]={...r[i],qty:e.target.value};setReceived(r);}} placeholder="Enter qty..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${parseFloat(received[i]?.qty)<it.qty?T.amb:T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                {parseFloat(received[i]?.qty)<it.qty&&<div style={{fontSize:10,color:T.amb,marginTop:2}}>⚠ Partial delivery</div>}
              </div>
              <div><label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:4}}>Quality</label>
                <select value={received[i]?.quality} onChange={e=>{const r=[...received];r[i]={...r[i],quality:e.target.value};setReceived(r);}} style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                  <option>Good</option><option>Acceptable</option><option>Damaged — Partial accept</option><option>Rejected</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={save} disabled={saving} style={{flex:2,padding:"9px",borderRadius:7,background:saving?T.b1:"#00695C",color:saving?T.t4:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcGRN size={14} color="currentColor"/> {saving?"Saving...":"Record GRN"}
        </button>
      </div>
    </div>
  </>);
}

// ── CREATE PO MODAL (Direct) ──────────────────────────────────────────
function CreatePOModal({onClose,onSave,projects,vendors}){
  const blank=()=>({desc:"",hsn:"",unit:UNITS[0],qty:"",rate:""});
  const [project,setProject]=useState("");const [vendor,setVendor]=useState("");
  const [note,setNote]=useState("");const [delivery,setDelivery]=useState("");
  const [rows,setRows]=useState([blank()]);
  const [saving,setSaving]=useState(false);const [err,setErr]=useState("");
  const total=rows.reduce((s,r)=>s+(parseFloat(r.qty)||0)*(parseFloat(r.rate)||0),0);
  const save=async()=>{
    if(!project||!vendor||rows.every(r=>!r.desc)){setErr("Project, vendor & items required");return;}
    setSaving(true);setErr("");
    try{
      const proj=projects.find(p=>p.name===project);const party=vendors.find(v=>v.name===vendor);
      const res=await api.post("/procurement/purchase-orders",{project_id:proj?.id,party_id:party?.id,items:rows.filter(r=>r.desc).map(r=>({item_name:r.desc,hsn_code:r.hsn,unit:r.unit,qty:parseFloat(r.qty)||0,rate:parseFloat(r.rate)||0})),note,expected_delivery:delivery||null});
      if(res?.success===false){setErr(res.message||"Failed");setSaving(false);return;}
      onSave(res.data||{});onClose();
    }catch(e){setErr(e.message||"Error");setSaving(false);}
  };
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.28)",zIndex:301,width:700,maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:T.blu,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>Create Purchase Order</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.7)",marginTop:2}}>Auto payable on approval</div></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,cursor:"pointer",color:"white",padding:"4px 10px",fontSize:14}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:5}}>Project *</label><SearchSelect options={projects.map(p=>p.name)} value={project} onChange={setProject} placeholder="Select project..."/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:5}}>Vendor *</label><SearchSelect options={vendors.map(v=>v.name)} value={vendor} onChange={setVendor} placeholder="Select vendor..."/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:5}}>Delivery Date</label><input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)} style={{height:32,width:"100%",padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,color:T.t1}}/></div>
        </div>
        <div style={{marginBottom:14}}><label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:5}}>Note / Terms</label><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Payment terms, delivery instructions..." style={{height:32,width:"100%",padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,color:T.t1}}/></div>
        <div style={{background:T.surfaceB,borderRadius:8,padding:"8px 10px",border:`1px solid ${T.b1}`}}>
          <div style={{display:"grid",gridTemplateColumns:"24px 1fr 70px 60px 65px 70px 80px 24px",gap:5,marginBottom:5}}>
            {["#","Item Description","HSN","Unit","Qty","Rate","Amount",""].map((h,i)=><span key={i} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {rows.map((r,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr 70px 60px 65px 70px 80px 24px",gap:5,alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.b1}`}}>
              <span style={{fontSize:11,color:T.t4,textAlign:"center"}}>{i+1}</span>
              <input value={r.desc} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,desc:e.target.value}:x))} placeholder="Item name..." style={{height:29,padding:"0 7px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",boxSizing:"border-box",background:T.surface,color:T.t1}}/>
              <input value={r.hsn} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,hsn:e.target.value}:x))} placeholder="HSN" style={{height:29,padding:"0 6px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",boxSizing:"border-box",background:T.surface,color:T.t1}}/>
              <select value={r.unit} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,unit:e.target.value}:x))} style={{height:29,padding:"0 4px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",cursor:"pointer",background:T.surface,color:T.t1}}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
              <input type="number" value={r.qty} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,qty:e.target.value}:x))} placeholder="0" style={{height:29,padding:"0 6px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",textAlign:"right",boxSizing:"border-box",background:T.surface,color:T.t1}}/>
              <input type="number" value={r.rate} onChange={e=>setRows(p=>p.map((x,j)=>j===i?{...x,rate:e.target.value}:x))} placeholder="₹" style={{height:29,padding:"0 6px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11.5,outline:"none",textAlign:"right",boxSizing:"border-box",background:T.surface,color:T.t1}}/>
              <span style={{fontSize:11,fontWeight:600,color:T.grn,textAlign:"right"}}>{r.qty&&r.rate?`₹${fmtN((parseFloat(r.qty)||0)*(parseFloat(r.rate)||0))}`:"—"}</span>
              <button onClick={()=>rows.length>1&&setRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:T.red,display:"flex",justifyContent:"center"}}><IcX size={13}/></button>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,alignItems:"center"}}>
            <button onClick={()=>setRows(p=>[...p,blank()])} style={{padding:"5px 12px",borderRadius:6,border:`1px dashed ${T.b2}`,background:"none",color:T.t3,fontSize:11.5,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><IcAdd size={13}/> Add Item</button>
            <div style={{fontSize:14,fontWeight:800,color:T.blu}}>TOTAL: ₹{fmtN(total)}</div>
          </div>
        </div>
        {err&&<div style={{marginTop:10,padding:"8px 12px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:7,color:T.red,fontSize:12}}>{err}</div>}
      </div>
      <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,justifyContent:"flex-end",background:T.surfaceB,flexShrink:0}}>
        <button onClick={onClose} style={{padding:"8px 18px",borderRadius:7,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
        <button onClick={save} disabled={saving} style={{padding:"8px 22px",borderRadius:7,background:saving?T.b1:T.blu,color:saving?T.t4:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
          {saving?"Creating...":total>0?`Create PO — ₹${fmtN(total)}`:"Create PO"}
        </button>
      </div>
    </div>
  </>);
}

// ── CHALLAN CHECK MODAL ───────────────────────────────────────────────
function ChallanCheckModal({onClose}){
  const [challan,setChallan]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);
  const check=async()=>{if(!challan.trim())return;setLoading(true);try{const res=await api.get(`/procurement/challan-check?challan_no=${encodeURIComponent(challan)}`);setResult(res.data);}catch{setResult(null);}setLoading(false);};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:500,overflow:"hidden"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Challan Search</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Check if challan already received or billed</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input value={challan} onChange={e=>setChallan(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()} placeholder="Enter challan number..." style={{flex:1,height:34,padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,color:T.t1}}/>
          <button onClick={check} style={{height:34,padding:"0 16px",borderRadius:7,background:T.blu,color:"white",border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700}}>{loading?"...":"Search"}</button>
        </div>
        {result&&(!result.grn_exists
          ?<div style={{color:T.grn,fontWeight:600,display:"flex",gap:8,alignItems:"center",padding:"12px",background:T.grnL,borderRadius:8,border:`1px solid ${T.grnM}`}}><IcChk size={16} color={T.grn}/>Challan not found — safe to enter</div>
          :<div style={{background:result.billed?T.grnL:T.ambL,border:`1px solid ${result.billed?T.grnM:T.ambM}`,borderRadius:8,padding:"12px"}}>
            <div style={{color:result.billed?T.grn:T.amb,fontWeight:700,marginBottom:8}}>{result.billed?"✓ Already billed":"⚠ Received but NOT yet billed"}</div>
            {result.grns.map((g,i)=><div key={i} style={{fontSize:12,color:T.t1,marginBottom:4}}>{g.grn_number} · {g.vendor_name} · {g.received_date?.slice(0,10)}</div>)}
          </div>
        )}
        <button onClick={onClose} style={{width:"100%",marginTop:12,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </>);
}

// ── RATE HISTORY MODAL ────────────────────────────────────────────────
function RateHistoryModal({onClose}){
  const [item,setItem]=useState("");const [data,setData]=useState([]);const [loading,setLoading]=useState(false);
  const search=async()=>{if(!item.trim())return;setLoading(true);try{const res=await api.get(`/procurement/rate-history?item_name=${encodeURIComponent(item)}`);setData(res.data||[]);}catch{}setLoading(false);};
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",zIndex:301,width:600,maxHeight:"80vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{background:T.pur,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Material Rate History</div><div style={{fontSize:10.5,color:"rgba(255,255,255,0.7)",marginTop:2}}>Track price trends across vendors</div></div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,cursor:"pointer",color:"white",padding:"4px 10px",fontSize:14}}>✕</button>
      </div>
      <div style={{padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",gap:8}}>
          <input value={item} onChange={e=>setItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Search item... e.g. Cement, TMT Steel" style={{flex:1,height:34,padding:"0 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface,color:T.t1}}/>
          <button onClick={search} style={{height:34,padding:"0 18px",borderRadius:7,background:T.pur,color:"white",border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700}}>{loading?"...":"Search"}</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 18px 14px"}}>
        {data.length>0&&(
          <div style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 120px 90px",padding:"7px 12px",background:T.purL,borderBottom:`1px solid ${T.b1}`}}>
              {["Item","Rate/Unit","Qty","Vendor","Date"].map((h,i)=><span key={i} style={{fontSize:9,fontWeight:700,color:T.pur,textTransform:"uppercase"}}>{h}</span>)}
            </div>
            {data.map((d,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 120px 90px",padding:"8px 12px",borderBottom:`1px solid ${T.b1}`,background:i%2===0?T.surface:T.surfaceB,alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:500,color:T.t1}}>{d.item_name}</span>
                <span style={{fontSize:13,fontWeight:700,color:T.grn}}>₹{fmtN(d.rate)}</span>
                <span style={{fontSize:11.5,color:T.t3}}>{d.received_qty} {d.unit}</span>
                <span style={{fontSize:11,color:T.t2}}>{d.vendor_name}</span>
                <span style={{fontSize:11,color:T.t4}}>{d.received_date?.slice(0,10)}</span>
              </div>
            ))}
          </div>
        )}
        {data.length===0&&item&&!loading&&<div style={{textAlign:"center",padding:30,color:T.t4}}>No rate history found for "{item}"</div>}
      </div>
      <div style={{padding:"10px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,flexShrink:0}}>
        <button onClick={onClose} style={{width:"100%",padding:"8px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </>);
}

// ════════════════════════════════════════════════════════════════
// MAIN PROCUREMENT MODULE — MERGED
// ════════════════════════════════════════════════════════════════
export default function ProcurementModule(){
  const [tab,setTab]=useState("po");
  const [viewMode,setViewMode]=useState("tile");

  // API data
  const [apiPOs,setApiPOs]=useState([]);
  const [apiMRs,setApiMRs]=useState([]);
  const [apiGRNs,setApiGRNs]=useState([]);
  const [rateAlerts,setRateAlerts]=useState([]);
  const [projects,setProjects]=useState([]);
  const [parties,setParties]=useState([]);
  const [loading,setLoading]=useState(false);

  // Local RFQ state (UI only — backend optional later)
  const [rfqs,setRFQs]=useState([
    {id:"RFQ-012",date:"13 Mar",project:"Amarendra Villa",status:"Published",bidStart:"13 Mar",bidEnd:"17 Mar",
     items:[{desc:"Cement OPC 50kg",hsn:"25232",qty:200,unit:"Bags",deliveryDate:"22 Mar"},{desc:"Fine Sand",hsn:"25051",qty:10,unit:"Loads",deliveryDate:"22 Mar"}],
     vendors:[{name:"Abhay Traders",status:"Submitted",rates:[{rate:385,remarks:"Stock ready"},{rate:3600,remarks:""}]},{name:"Ganesh Cement",status:"Submitted",rates:[{rate:378,remarks:"Best price"},{rate:3750,remarks:""}]},{name:"Vaibhav Traders",status:"Pending",rates:[{rate:null,remarks:""},{rate:null,remarks:""}]}],locked:null},
    {id:"RFQ-011",date:"10 Mar",project:"Tikendra Residence",status:"Draft",bidStart:"",bidEnd:"",
     items:[{desc:"TMT Steel Fe500 12mm",hsn:"72142",qty:3,unit:"MT",deliveryDate:"19 Mar"}],
     vendors:[{name:"Rajesh Steel Mart",status:"Pending",rates:[{rate:null,remarks:""}]},{name:"Abhay Traders",status:"Pending",rates:[{rate:null,remarks:""}]}],locked:null},
  ]);

  // Filters
  const [poSearch,setPoSearch]=useState("");const [poStatus,setPoStatus]=useState("All");const [poApproval,setPoApproval]=useState("All");
  const [mrProject,setMrProject]=useState("All");const [mrStatus,setMrStatus]=useState("All");const [mrMaterial,setMrMaterial]=useState("");
  const [grSearch,setGrSearch]=useState("");

  // Modal states
  const [selPO,setSelPO]=useState(null);const [shareTarget,setShareTarget]=useState(null);const [grnTarget,setGrnTarget]=useState(null);
  const [selRFQ,setSelRFQ]=useState(null);const [shareRFQ,setShareRFQ]=useState(null);const [punchTarget,setPunchTarget]=useState(null);const [punchVendorIdx,setPunchVendorIdx]=useState(null);
  const [manualOrderTarget,setManualOrderTarget]=useState(null);
  const [showFlow,setShowFlow]=useState(false);const [showCreatePO,setShowCreatePO]=useState(false);
  const [showChallan,setShowChallan]=useState(false);const [showRateHistory,setShowRateHistory]=useState(false);

  const refreshAll=async()=>{
    setLoading(true);
    try{
      const [poRes,mrRes,grnRes,alertRes,projRes,partyRes]=await Promise.allSettled([
        api.get("/procurement/purchase-orders"),
        api.get("/procurement/material-requests"),
        api.get("/procurement/grn"),
        api.get("/procurement/rate-alerts"),
        api.get("/projects"),
        api.get("/finance/parties"),
      ]);
      if(poRes.value?.success) setApiPOs(poRes.value.data||[]);
      if(mrRes.value?.success) setApiMRs(mrRes.value.data||[]);
      if(grnRes.value?.success) setApiGRNs(grnRes.value.data||[]);
      if(alertRes.value?.success) setRateAlerts(alertRes.value.data||[]);
      if(projRes.value?.success) setProjects(projRes.value.data||[]);
      if(partyRes.value?.success) setParties(partyRes.value.data||[]);
    }catch(e){console.error(e);}
    setLoading(false);
  };
  useEffect(()=>{refreshAll();},[]);

  // Actions
  const approvePO=async(id)=>{
    const res=await api.put(`/procurement/purchase-orders/${id}/approve`,{}).catch(()=>null);
    if(res?.success!==false){setApiPOs(p=>p.map(x=>x.id===id?{...x,status:"approved"}:x));if(res?.message)alert(res.message);}
    refreshAll();
  };
  const approveMR=async(id)=>{
    await api.put(`/procurement/material-requests/${id}/approve`,{}).catch(()=>{});
    setApiMRs(p=>p.map(x=>x.id===id?{...x,status:"approved"}:x));
  };
  const approveAlert=async(id)=>{await api.put(`/procurement/rate-alerts/${id}/approve`,{}).catch(()=>{});setRateAlerts(p=>p.filter(a=>a.id!==id));};
  const lockRFQ=(rfqId,vendorName)=>setRFQs(p=>p.map(r=>r.id===rfqId?{...r,locked:vendorName}:r));
  const publishRFQ=(rfqId)=>setRFQs(p=>p.map(r=>r.id===rfqId?{...r,status:"Published",bidStart:"Today",bidEnd:"+5 days"}:r));
  const savePunch=(rfqId,vendorIdx,rates)=>{
    setRFQs(p=>p.map(r=>{if(r.id!==rfqId)return r;const nv=[...r.vendors];nv[vendorIdx]={...nv[vendorIdx],status:"Submitted",rates:rates.map(rt=>({rate:Number(rt.rate)||null,remarks:rt.remark}))};return{...r,vendors:nv};}));
    setPunchTarget(null);setPunchVendorIdx(null);
  };
  const saveManualOrder=async(mrId,vendor,delivery)=>{
    await api.post("/procurement/manual-orders",{party_name:vendor,expected_delivery:delivery,note:"Manual order from MR"}).catch(()=>{});
    setApiMRs(p=>p.map(m=>m.id===mrId?{...m,status:"ordered",vendor_name:vendor,expectedDelivery:delivery}:m));
    setManualOrderTarget(null);
  };
  const whatsappPO=async(po)=>{
    try{const res=await api.post("/procurement/whatsapp-template",{vendor_name:po.vendor_name||po.vendor,items:[{item_name:"As per PO "+po.po_number,qty:"",unit:""}],project_name:po.project_name||po.project,delivery_date:po.expected_delivery||"ASAP",sender_name:"Prafull"});if(res?.data?.whatsapp_link)window.open(res.data.whatsapp_link,"_blank");}catch{}
  };

  const pendingMRs=apiMRs.filter(m=>m.status==="pending").length;
  const pendingPOs=apiPOs.filter(p=>p.status==="pending").length;
  const poValue=apiPOs.filter(p=>["approved","partial","received"].includes(p.status)).reduce((s,p)=>s+parseFloat(p.po_value||0),0);

  const filteredPOs=apiPOs.filter(p=>{
    if(poSearch&&!p.po_number?.toLowerCase().includes(poSearch.toLowerCase())&&!(p.vendor_name||"").toLowerCase().includes(poSearch.toLowerCase())&&!(p.project_name||"").toLowerCase().includes(poSearch.toLowerCase())) return false;
    if(poStatus!=="All"&&p.status!==poStatus.toLowerCase()) return false;
    return true;
  });
  const filteredMRs=apiMRs.filter(m=>{
    if(mrProject!=="All"&&m.project_name!==mrProject) return false;
    if(mrStatus!=="All"&&m.status!==mrStatus.toLowerCase()) return false;
    if(mrMaterial&&!m.item_count) return true;
    return true;
  });
  const filteredGRNs=apiGRNs.filter(g=>!grSearch||(g.grn_number||"").toLowerCase().includes(grSearch.toLowerCase())||(g.vendor_name||g.party_name||"").toLowerCase().includes(grSearch.toLowerCase()));

  const TILE_SETS={
    po:[{l:"Total POs",v:apiPOs.length,sub:`${apiPOs.filter(p=>p.status==="Open"||p.status==="approved").length} active`,c:T.blu},{l:"Pending Approval",v:pendingPOs,sub:"Need your sign-off",c:T.amb},{l:"Total PO Value",v:`₹${fmt(apiPOs.reduce((s,p)=>s+parseFloat(p.po_value||0),0))}`,sub:"All orders",c:T.grn},{l:"Open MR Requests",v:pendingMRs,sub:"Awaiting procurement",c:T.red}],
    rfq:[{l:"Active RFQs",v:rfqs.filter(r=>r.status==="Published").length,sub:"Live bidding",c:T.blu},{l:"Draft RFQs",v:rfqs.filter(r=>r.status==="Draft").length,sub:"Not published yet",c:T.slt},{l:"Locked Quotes",v:rfqs.filter(r=>r.locked).length,sub:"Ready for PO",c:T.grn},{l:"Pending Responses",v:rfqs.flatMap(r=>r.vendors).filter(v=>v.status==="Pending").length,sub:"Awaiting rates",c:T.amb}],
    mr:[{l:"Total MRs",v:apiMRs.length,sub:"All requests",c:T.blu},{l:"Pending",v:apiMRs.filter(m=>m.status==="pending").length,sub:"Need to be ordered",c:T.amb},{l:"Approved",v:apiMRs.filter(m=>m.status==="approved").length,sub:"Ready for PO",c:T.blu},{l:"Ordered/Received",v:apiMRs.filter(m=>["ordered","received"].includes(m.status)).length,sub:"In progress",c:T.grn}],
    grn:[{l:"Total GRNs",v:apiGRNs.length,sub:"All receipts",c:T.grn},{l:"Direct Receipts",v:apiGRNs.filter(g=>g.receipt_type==="direct").length,sub:"No PO",c:T.amb},{l:"Partial",v:apiGRNs.filter(g=>g.is_partial).length,sub:"Partial deliveries",c:T.pur},{l:"Rate Alerts",v:rateAlerts.length,sub:rateAlerts.length>0?"Needs approval":"All clear",c:rateAlerts.length>0?T.red:T.t4}],
  };
  const curTiles=TILE_SETS[tab]||TILE_SETS.po;

  const TABS=[
    {id:"po",l:`Purchase Orders${pendingPOs>0?` · ${pendingPOs} Pending`:""`},
    {id:"rfq",l:`RFQ${rfqs.filter(r=>r.status==="Published").length>0?` · ${rfqs.filter(r=>r.status==="Published").length} Active`:""`},
    {id:"mr",l:`Material Requests${pendingMRs>0?` · ${pendingMRs} Pending`:""`},
    {id:"grn",l:"GRN / Receipts"},
  ];
  const COL_HDR={fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.3px"};

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* ── Stat Tiles ── */}
      <div style={{padding:"12px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {curTiles.map((s,i)=><StatTile key={i} label={s.l} value={s.v} sub={s.sub} color={s.c}/>)}
        </div>
      </div>

      {/* ── Dark Tab Bar ── */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"11px 15px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,padding:"6px 0",alignItems:"center"}}>
            {/* Tile/List toggle */}
            <div style={{display:"flex",background:"rgba(255,255,255,0.07)",borderRadius:6,border:"1px solid rgba(255,255,255,0.15)",overflow:"hidden"}}>
              <button onClick={()=>setViewMode("tile")} style={{display:"flex",alignItems:"center",padding:"5px 8px",border:"none",background:viewMode==="tile"?"rgba(37,99,235,0.55)":"none",cursor:"pointer"}}><IcGrid size={14} color={viewMode==="tile"?"white":"rgba(255,255,255,0.45)"}/></button>
              <button onClick={()=>setViewMode("list")} style={{display:"flex",alignItems:"center",padding:"5px 8px",border:"none",background:viewMode==="list"?"rgba(37,99,235,0.55)":"none",cursor:"pointer"}}><IcListV size={14} color={viewMode==="list"?"white":"rgba(255,255,255,0.45)"}/></button>
            </div>
            <button onClick={()=>setShowChallan(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.8)",cursor:"pointer"}}><IcBarcode size={13}/> Challan</button>
            <button onClick={()=>setShowRateHistory(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.8)",cursor:"pointer"}}><IcHist size={13}/> Rates</button>
            <button onClick={()=>setShowFlow(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.8)",cursor:"pointer"}}><IcFlow size={13} color="currentColor"/> Flow</button>
            {tab==="po"&&<button onClick={()=>setShowCreatePO(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13}/> Create PO</button>}
            {tab==="rfq"&&<button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13}/> New RFQ</button>}
            {tab==="mr"&&<button onClick={()=>approveMR(-1)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:"#0277BD",color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}} title="Refresh"><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" style={{animation:loading?"spin 1s linear infinite":"none"}}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Refresh</button>}
            {tab==="grn"&&<button onClick={()=>refreshAll()} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:"#00695C",color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcGRN size={13}/> New GRN</button>}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",padding:"10px 18px 14px"}}>

        {/* ── PO TAB ── */}
        {tab==="po"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={poSearch} onChange={e=>setPoSearch(e.target.value)} placeholder="Search PO#, vendor, project..." style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${poSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:poSearch?T.bluL:T.surface}}/>
              </div>
              <select value={poStatus} onChange={e=>setPoStatus(e.target.value)} style={{height:31,padding:"0 10px",borderRadius:6,border:`1.5px solid ${poStatus!=="All"?T.blu:T.b1}`,background:poStatus!=="All"?T.bluL:T.surface,fontSize:11.5,color:poStatus!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                {["All","Open","approved","partial","received","cancelled"].map(o=><option key={o} value={o}>{o==="All"?"All Status":o}</option>)}
              </select>
              <button onClick={refreshAll} style={{height:31,padding:"0 10px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surface,fontSize:11,color:T.slt,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" style={{animation:loading?"spin 1s linear infinite":"none"}}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                Refresh
              </button>
              <span style={{fontSize:11,color:T.t4}}>{filteredPOs.length} POs</span>
            </div>

            {viewMode==="list"&&(
              <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
                <div style={{display:"grid",gridTemplateColumns:"100px 160px 1fr 130px 90px 100px 90px 140px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,gap:6,flexShrink:0}}>
                  {["PO#","Vendor","Project","Delivery","Items","Value","Status","Actions"].map((h,i)=><span key={i} style={COL_HDR}>{h}</span>)}
                </div>
                <div style={{flex:1,overflowY:"auto"}}>
                  {filteredPOs.map((po,i)=>{
                    const ps=PO_STATUS[po.status]||PO_STATUS.Open;
                    return(
                      <div key={po.id} style={{display:"grid",gridTemplateColumns:"100px 160px 1fr 130px 90px 100px 90px 140px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:6,cursor:"pointer",borderLeft:po.status==="pending"?`3px solid ${T.amb}`:"3px solid transparent",transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <button onClick={()=>setSelPO(po)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,color:T.blu,textAlign:"left",padding:0,fontFamily:"monospace"}}>{po.po_number}</button>
                        <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.vendor_name}</span>
                        <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.project_name}</span>
                        <span style={{fontSize:11.5,color:T.t3}}>{po.expected_delivery||"—"}</span>
                        <span style={{fontSize:12,color:T.t3,textAlign:"right"}}>{po.item_count||"—"}</span>
                        <span style={{fontSize:13,fontWeight:600,color:T.t1,textAlign:"right"}}>₹{fmtN(po.po_value||0)}</span>
                        <Pill label={po.status||"Open"} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                        <div style={{display:"flex",gap:4}}>
                          {po.status==="pending"&&<button onClick={()=>approvePO(po.id)} title="Approve" style={{width:26,height:26,borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={13} color={T.grn}/></button>}
                          <button onClick={()=>setShareTarget(po)} title="Share" style={{width:26,height:26,borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcShare size={13} color={T.blu}/></button>
                          {["Open","approved","partial"].includes(po.status)&&<button onClick={()=>setGrnTarget(po)} title="GRN" style={{width:26,height:26,borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcGRN size={13} color={T.amb}/></button>}
                          <button onClick={()=>whatsappPO(po)} title="WhatsApp" style={{width:26,height:26,borderRadius:6,background:"#E8FDF1",border:"1px solid #86EFAC",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcWA size={13} color="#16A34A"/></button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No POs found</div></div>}
                </div>
              </div>
            )}

            {viewMode==="tile"&&(
              <div style={{flex:1,overflowY:"auto"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
                  {filteredPOs.map(po=>{
                    const ps=PO_STATUS[po.status]||PO_STATUS.Open;
                    const accentColor=po.status==="pending"?T.amb:po.status==="received"?T.grn:T.blu;
                    return(
                      <div key={po.id} onClick={()=>setSelPO(po)} style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.15s",borderLeft:`4px solid ${accentColor}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}>
                        <div style={{padding:"11px 13px 9px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                            <span style={{fontSize:12,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{po.po_number}</span>
                            <Pill label={po.status||"Open"} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                          </div>
                          <div style={{fontSize:13.5,fontWeight:600,color:T.t1,marginBottom:3}}>{po.vendor_name}</div>
                          <div style={{fontSize:11.5,color:T.t3,marginBottom:8}}>{po.project_name}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div><div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600}}>PO Value</div><div style={{fontSize:18,fontWeight:700,color:T.t1,letterSpacing:"-0.5px"}}>₹{fmtN(po.po_value||0)}</div></div>
                            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:T.t4,textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600}}>Delivery</div><div style={{fontSize:12.5,fontWeight:600,color:T.t2}}>{po.expected_delivery||"—"}</div></div>
                          </div>
                        </div>
                        <div style={{padding:"7px 13px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:6}}>
                          {po.status==="pending"&&<button onClick={e=>{e.stopPropagation();approvePO(po.id);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcChk size={12} color={T.grn}/> Approve</button>}
                          <button onClick={e=>{e.stopPropagation();setShareTarget(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcShare size={12} color={T.blu}/> Share</button>
                          {["Open","approved","partial"].includes(po.status)&&<button onClick={e=>{e.stopPropagation();setGrnTarget(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcGRN size={12} color={T.amb}/> GRN</button>}
                          <button onClick={e=>{e.stopPropagation();whatsappPO(po);}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px",borderRadius:6,background:"#E8FDF1",border:"1px solid #86EFAC",color:"#16A34A",fontSize:11,fontWeight:600,cursor:"pointer"}}><IcWA size={12} color="#16A34A"/> WA</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,color:T.t4}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No POs found. Create one above.</div></div>}
              </div>
            )}
          </div>
        )}

        {/* ── RFQ TAB ── */}
        {tab==="rfq"&&(
          <div style={{flex:1,overflowY:"auto"}}>
            {viewMode==="list"&&(
              <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 90px 100px 80px 80px 100px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                  {["RFQ#","Project","Items","Status","Bid End","Vendors","Submitted","Actions"].map((h,i)=><span key={i} style={COL_HDR}>{h}</span>)}
                </div>
                {rfqs.map(rfq=>{
                  const rs=RFQ_STATUS[rfq.status]||{c:T.slt,bg:T.sltL,brd:T.b2};
                  const submitted=rfq.vendors.filter(v=>v.status==="Submitted").length;
                  return(
                    <div key={rfq.id} onClick={()=>setSelRFQ(rfq)} style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 90px 100px 80px 80px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",transition:"background 0.1s",borderLeft:rfq.locked?`3px solid ${T.grn}`:"3px solid transparent"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <span style={{fontSize:12,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{rfq.id}</span>
                      <span style={{fontSize:12,color:T.t1}}>{rfq.project}</span>
                      <span style={{fontSize:11.5,color:T.t3}}>{rfq.items.map(i=>i.desc.split(" ").slice(0,2).join(" ")).join(", ")}</span>
                      <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
                      <span style={{fontSize:11.5,color:T.t4}}>{rfq.bidEnd||"—"}</span>
                      <span style={{fontSize:12,color:T.t2}}>{rfq.vendors.length}</span>
                      <span style={{fontSize:12,color:T.t2}}>{submitted}/{rfq.vendors.length}</span>
                      <div style={{display:"flex",gap:5}}>
                        {rfq.status==="Draft"&&<button onClick={e=>{e.stopPropagation();publishRFQ(rfq.id);}} style={{padding:"4px 9px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Publish</button>}
                        {rfq.locked&&<button onClick={e=>e.stopPropagation()} style={{padding:"4px 9px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>→ PO</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {viewMode==="tile"&&rfqs.map(rfq=>{
              const rs=RFQ_STATUS[rfq.status]||{c:T.slt,bg:T.sltL,brd:T.b2};
              const submitted=rfq.vendors.filter(v=>v.status==="Submitted").length;
              const total=rfq.vendors.length;
              return(
                <div key={rfq.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${rfq.locked?T.grnM:T.b1}`,marginBottom:8,overflow:"hidden",boxShadow:rfq.locked?"0 2px 8px rgba(5,150,105,0.1)":"0 1px 3px rgba(0,0,0,0.04)"}}>
                  <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",borderLeft:rfq.locked?`3px solid ${T.grn}`:"3px solid transparent"}} onClick={()=>setSelRFQ(rfq)}>
                    <div style={{width:40,height:40,borderRadius:9,background:rs.bg,border:`1px solid ${rs.brd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IcRFQ size={18} color={rs.c}/></div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{rfq.id}</span>
                        <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
                        {rfq.locked&&<span style={{background:T.grnL,color:T.grn,fontSize:9.5,fontWeight:700,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.grnM}`}}>Locked: {rfq.locked}</span>}
                      </div>
                      <div style={{fontSize:11.5,color:T.t3}}>{rfq.project} · {rfq.items.length} item{rfq.items.length>1?"s":""}</div>
                      {rfq.bidEnd&&<div style={{fontSize:10.5,color:T.t4}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11.5,color:T.t3}}>{submitted}/{total} vendors responded</div>
                      <div style={{height:4,background:T.b1,borderRadius:2,width:80,marginTop:5,overflow:"hidden"}}><div style={{height:"100%",width:total>0?`${(submitted/total)*100}%`:"0%",background:submitted===total?T.grn:T.blu,borderRadius:2}}/></div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      {rfq.status==="Draft"&&<button onClick={e=>{e.stopPropagation();publishRFQ(rfq.id);}} style={{padding:"5px 11px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>Publish</button>}
                      {rfq.status==="Published"&&<button onClick={e=>{e.stopPropagation();setShareRFQ(rfq);}} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcShare size={12} color={T.grn}/> Share Links</button>}
                      {rfq.locked&&<button onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:`linear-gradient(135deg,${T.grn},#047857)`,color:"white",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}><IcPO size={12} color="white"/> Create PO</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MR TAB ── */}
        {tab==="mr"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={mrMaterial} onChange={e=>setMrMaterial(e.target.value)} placeholder="Search material or project..." style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
              </div>
              <select value={mrStatus} onChange={e=>setMrStatus(e.target.value)} style={{height:31,padding:"0 10px",borderRadius:6,border:`1.5px solid ${mrStatus!=="All"?T.blu:T.b1}`,background:mrStatus!=="All"?T.bluL:T.surface,fontSize:11.5,color:mrStatus!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                {["All","pending","approved","ordered","received"].map(s=><option key={s} value={s}>{s==="All"?"All Status":s}</option>)}
              </select>
              <span style={{fontSize:11,color:T.t4}}>{filteredMRs.length} requests</span>
            </div>

            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{display:"grid",gridTemplateColumns:"90px 80px 1fr 1fr 100px 90px 150px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,flexShrink:0,gap:6}}>
                {["MR No.","Date","Project","Items","Req By","Status","Action"].map((h,i)=><span key={i} style={COL_HDR}>{h}</span>)}
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {filteredMRs.map((mr,i)=>{
                  const ms=MAT_STATUS[mr.status]||MAT_STATUS.pending;
                  return(
                    <div key={mr.id} style={{display:"grid",gridTemplateColumns:"90px 80px 1fr 1fr 100px 90px 150px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:6,background:i%2===0?T.surface:T.surfaceB,transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"55"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.surfaceB}>
                      <span style={{fontSize:11,fontWeight:700,color:"#0277BD",background:"#E1F5FE",padding:"2px 6px",borderRadius:5,display:"inline-block"}}>{mr.mr_number}</span>
                      <span style={{fontSize:11.5,color:T.t3}}>{mr.created_at?.slice(0,10)}</span>
                      <span style={{fontSize:12,color:T.t1,fontWeight:500}}>{mr.project_name||"—"}</span>
                      <span style={{fontSize:11.5,color:T.t3}}>{mr.item_count||0} items</span>
                      <span style={{fontSize:11.5,color:T.t2}}>{mr.requested_by_name||"—"}</span>
                      <Pill label={mr.status} c={ms.c} bg={ms.bg} brd={ms.brd}/>
                      <div style={{display:"flex",gap:5}}>
                        {mr.status==="pending"&&<>
                          <button onClick={()=>approveMR(mr.id)} style={{padding:"4px 9px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>✓ Approve</button>
                          <button onClick={()=>{setManualOrderTarget({...mr,item_name:"As per MR "+mr.mr_number});}} style={{padding:"4px 8px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Order</button>
                        </>}
                        {mr.status==="approved"&&<button onClick={()=>setShowCreatePO(true)} style={{padding:"4px 9px",borderRadius:6,background:T.blu,color:"white",border:"none",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>Create PO</button>}
                      </div>
                    </div>
                  );
                })}
                {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}>No material requests found.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── GRN TAB ── */}
        {tab==="grn"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={grSearch} onChange={e=>setGrSearch(e.target.value)} placeholder="Search GRN#, vendor..." style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:T.surface}}/>
              </div>
              {rateAlerts.length>0&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:6,fontSize:11.5,color:T.red,fontWeight:600}}><IcAlert size={13} color={T.red}/>{rateAlerts.length} rate alert{rateAlerts.length>1?"s":""}</div>}
              <span style={{fontSize:11,color:T.t4}}>{filteredGRNs.length} entries</span>
            </div>

            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{display:"grid",gridTemplateColumns:"100px 80px 1fr 150px 110px 70px 80px 90px",padding:"7px 14px",background:T.surfaceB,borderBottom:`2px solid ${T.b1}`,flexShrink:0,gap:6}}>
                {["GRN No.","Date","Project","Vendor","Challan No.","Items","Type","Status"].map((h,i)=><span key={i} style={COL_HDR}>{h}</span>)}
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {rateAlerts.length>0&&(
                  <div style={{padding:"8px 14px",background:T.redL,borderBottom:`1px solid ${T.redM}`,display:"flex",gap:10,alignItems:"center"}}>
                    <IcAlert size={15} color={T.red}/>
                    <span style={{fontSize:12,color:T.red,fontWeight:600}}>Rate Variance Alerts: </span>
                    {rateAlerts.map(a=>(
                      <div key={a.id} style={{display:"flex",gap:6,alignItems:"center",background:"white",padding:"4px 10px",borderRadius:6,border:`1px solid ${T.redM}`}}>
                        <span style={{fontSize:11.5,color:T.t1}}>{a.item_name}</span>
                        <span style={{fontSize:11,color:T.red,fontWeight:700}}>+{a.variance_pct}%</span>
                        <button onClick={()=>approveAlert(a.id)} style={{padding:"2px 7px",borderRadius:4,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10,fontWeight:700,cursor:"pointer"}}>Accept</button>
                      </div>
                    ))}
                  </div>
                )}
                {filteredGRNs.map((grn,i)=>(
                  <div key={grn.id} style={{display:"grid",gridTemplateColumns:"100px 80px 1fr 150px 110px 70px 80px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:6,background:i%2===0?T.surface:T.surfaceB}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#00695C",background:"#E0F2F1",padding:"2px 6px",borderRadius:5,display:"inline-block"}}>{grn.grn_number}</span>
                    <span style={{fontSize:11.5,color:T.t3}}>{grn.received_date}</span>
                    <span style={{fontSize:12,color:T.t1,fontWeight:500}}>{grn.project_name||"—"}</span>
                    <span style={{fontSize:11.5,color:T.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{grn.vendor_name||grn.party_name}</span>
                    <span style={{fontSize:11.5,color:grn.challan_no?T.t1:T.t4,fontFamily:"monospace"}}>{grn.challan_no||"—"}</span>
                    <span style={{fontSize:12,color:T.t3,textAlign:"right"}}>{grn.item_count||0}</span>
                    <span style={{fontSize:10,fontWeight:600,color:grn.receipt_type==="direct"?T.amb:grn.is_partial?T.pur:T.grn,background:grn.receipt_type==="direct"?T.ambL:grn.is_partial?T.purL:T.grnL,padding:"2px 6px",borderRadius:10,whiteSpace:"nowrap",display:"inline-block"}}>
                      {grn.receipt_type==="direct"?"Direct":grn.is_partial?"Partial":"Full"}
                    </span>
                    <Pill label={grn.status||"received"} c={MAT_STATUS[grn.status]?.c||T.grn} bg={MAT_STATUS[grn.status]?.bg||T.grnL} brd={MAT_STATUS[grn.status]?.brd||T.grnM}/>
                  </div>
                ))}
                {filteredGRNs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}>No GRN entries yet.</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS & DRAWERS ── */}
      {selPO&&<PODetailDrawer po={selPO} onClose={()=>setSelPO(null)} onApprove={(id)=>{approvePO(id);setSelPO(null);}} onShare={(po)=>{setShareTarget(po);setSelPO(null);}}/>}
      {shareTarget&&<ShareModal rfq={{id:shareTarget.po_number||shareTarget.id,project:shareTarget.project_name||shareTarget.project,vendors:parties.slice(0,3).map(p=>({name:p.name,status:"Pending",rates:[]}))}} onClose={()=>setShareTarget(null)}/>}
      {grnTarget&&<GRNModal po={grnTarget} onClose={()=>setGrnTarget(null)} onSave={(id)=>{setApiPOs(p=>p.map(x=>x.id===id?{...x,status:"partial"}:x));setGrnTarget(null);refreshAll();}}/>}
      {selRFQ&&<RFQDetailDrawer rfq={selRFQ} onClose={()=>setSelRFQ(null)}
        onPunch={(vi)=>{setPunchTarget(selRFQ);setPunchVendorIdx(vi);setSelRFQ(null);}}
        onLock={(vName)=>{lockRFQ(selRFQ.id,vName);setSelRFQ(r=>r?{...r,locked:vName}:r);}}
        onPublish={(id)=>{publishRFQ(id);setSelRFQ(r=>r?{...r,status:"Published",bidStart:"Today",bidEnd:"+5 days"}:r);}}/>}
      {shareRFQ&&<ShareModal rfq={shareRFQ} onClose={()=>setShareRFQ(null)}/>}
      {punchTarget&&punchVendorIdx!=null&&<PunchQuoteModal rfq={punchTarget} vendorIndex={punchVendorIdx} onSave={(vi,rates)=>savePunch(punchTarget.id,vi,rates)} onClose={()=>{setPunchTarget(null);setPunchVendorIdx(null);}}/>}
      {manualOrderTarget&&<ManualOrderModal mr={manualOrderTarget} vendors={parties} onSave={saveManualOrder} onClose={()=>setManualOrderTarget(null)}/>}
      {showFlow&&<FlowDrawer onClose={()=>setShowFlow(false)}/>}
      {showCreatePO&&<CreatePOModal onClose={()=>setShowCreatePO(false)} onSave={(newPO)=>{setApiPOs(p=>[newPO,...p]);setShowCreatePO(false);refreshAll();}} projects={projects} vendors={parties}/>}
      {showChallan&&<ChallanCheckModal onClose={()=>setShowChallan(false)}/>}
      {showRateHistory&&<RateHistoryModal onClose={()=>setShowRateHistory(false)}/>}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
