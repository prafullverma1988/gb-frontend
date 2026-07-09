import { useState, useEffect, useRef } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import LibrarySelect from "../components/LibrarySelect";
import MRDetailDrawer from "../components/MRDetailDrawer";
import CompanyTransfersTab from "../components/CompanyTransfersTab";

// ── ICONS ─────────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcPO    =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcRFQ   =(p)=><Ic {...p} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>;
const IcMR    =(p)=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>;
const IcAdd   =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX     =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk   =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcDown  =(p)=><Ic {...p} d="M6 9l6 6 6-6"/>;
const IcSrch  =(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcTruck =(p)=><Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>;
const IcShare =(p)=><Ic {...p} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>;
const IcLock  =(p)=><Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/>;
const IcWA    =(p)=><Ic {...p} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>;
const IcMail  =(p)=><Ic {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/>;
const IcEdit  =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcApprv =(p)=><Ic {...p} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>;
const IcGRN   =(p)=><Ic {...p} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>;
const IcPen   =(p)=><Ic {...p} d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>;
const IcCopy  =(p)=><Ic {...p} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>;
const IcGrid  =(p)=><Ic {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>;
const IcList  =(p)=><Ic {...p} d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"/>;
const IcBan   =(p)=><Ic {...p} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>;
const IcHalf  =(p)=><Ic {...p} d="M12 2a10 10 0 010 20V2z" fill="currentColor" sw={0}/>;
const IcFlow  =(p)=><Ic {...p} d="M5 12h14M12 5l7 7-7 7"/>;
const IcAlert =(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcSMS   =(p)=><Ic {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>;

// ── THEME ─────────────────────────────────────────────────────────────
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE",
};
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;

// ── DATA ─────────────────────────────────────────────────────────────
const PROJECTS=[];
const VENDORS=[];
const UNITS=["Bags","MT","Nos","Loads","Sqft","Mtrs","Kg","Sheets","Ltrs","Cu.m","Ton","RFT"];

const MR_DATA=[];

const PO_DATA=[];

const RFQ_DATA=[];

// ── STATUS META ───────────────────────────────────────────────────────
const PO_STATUS={
  Open:    {c:T.blu, bg:T.bluL, brd:T.bluM},
  Closed:  {c:T.grn, bg:T.grnL, brd:T.grnM},
  Cancelled:{c:T.red,bg:T.redL, brd:T.redM},
};
const APPR_STATUS={
  Approved:           {c:T.grn,bg:T.grnL,brd:T.grnM},
  Draft:              {c:T.amb,bg:T.ambL,brd:T.ambM},
  Revision:           {c:"#1D4ED8",bg:"#DBEAFE",brd:"#93C5FD"},
  Rejected:           {c:T.red,bg:T.redL,brd:T.redM},
  Ordered:            {c:"#7C3AED",bg:"#F5F3FF",brd:"#DDD6FE"},
  PartiallyReceived:  {c:"#0891B2",bg:"#ECFEFF",brd:"#A5F3FC"},
  Received:           {c:T.grn,bg:T.grnL,brd:T.grnM},
};
const PO_PILL_LABEL={ PartiallyReceived:"Partial Rcvd" };
// Combine approval + order status into single display label
const displayPOStatus = (po) => {
  if (po.approval !== "Approved") return po.approval;
  if (po.orderStatus === "Ordered") return "Ordered";
  if (po.orderStatus === "PartiallyReceived") return "PartiallyReceived";
  if (po.orderStatus === "Received") return "Received";
  return "Approved";
};
const RFQ_STATUS={
  Published:{c:T.blu,bg:T.bluL,brd:T.bluM},
  Draft:    {c:T.slt,bg:T.sltL,brd:T.b2},
};

const MR_TAB_META={
  Pending: {label:"Pending",   c:T.amb, bg:T.ambL, brd:T.ambM},
  Approved:{label:"Approved",  c:T.blu, bg:T.bluL, brd:T.bluM},
  Ordered: {label:"Ordered",   c:T.pur, bg:T.purL, brd:T.purM},
  Received:{label:"Received",  c:T.grn, bg:T.grnL, brd:T.grnM},
  Rejected:{label:"Rejected",  c:T.red, bg:T.redL, brd:T.redM},
  Closed:  {label:"Closed",    c:T.t3,  bg:"#F1F5F9", brd:"#CBD5E0"},
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);

// ── MODAL SHELL ───────────────────────────────────────────────────────
function Modal({onClose,width=480,children}){
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:300,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",zIndex:301,width,fontFamily:"'Segoe UI',sans-serif",overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      {children}
    </div>
  </>);
}
const MHead=({title,sub,onClose})=>(
  <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
    <div><div style={{fontSize:14,fontWeight:700,color:"white"}}>{title}</div>{sub&&<div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>{sub}</div>}</div>
    <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
  </div>
);
const MBody=({children})=>(<div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>{children}</div>);
const MFoot=({children})=>(<div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>{children}</div>);
const Btn=({onClick,disabled,color=T.blu,outline,children,icon,full,small})=>{
  const base={display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:small?"5px 12px":"9px 16px",borderRadius:7,fontSize:small?11:12.5,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,border:"none",transition:"all 0.15s",width:full?"100%":undefined};
  if(outline)return<button onClick={onClick} disabled={disabled} style={{...base,background:color+"14",color,border:`1px solid ${color}44`}}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
  return<button onClick={onClick} disabled={disabled} style={{...base,background:disabled?T.b1:color,color:"white"}}>{icon&&<span style={{display:"flex"}}>{icon}</span>}{children}</button>;
};
const Fld=({label,children,required})=>(
  <div><label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>{label}{required&&<span style={{color:T.red}}> *</span>}</label>{children}</div>
);
const Inp=({value,onChange,placeholder,type="text",min,max})=>(
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
    style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
);
const Sel=({value,onChange,children})=>(
  <select value={value} onChange={onChange} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>{children}</select>
);

// Vertical date rail — "16 Apr" stacked, used in MR cards
const DateRail=({date})=>{
  // date may be "16 Apr 2026" / "16/04/2026" / ISO; extract day + month
  let day="", mon="";
  if(date){
    const parsed = new Date(date);
    if(!isNaN(parsed)){
      day = String(parsed.getDate()).padStart(2,"0");
      mon = parsed.toLocaleString("en-IN",{month:"short"});
    } else {
      // fallback: split on space (e.g. "16 Apr 2026")
      const parts = String(date).split(" ");
      day = parts[0]||"";
      mon = parts[1]||"";
    }
  }
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",lineHeight:1.1}}>
      <span style={{fontSize:14,fontWeight:800,color:T.t1,letterSpacing:"-.3px"}}>{day||"--"}</span>
      <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",marginTop:1}}>{mon||""}</span>
    </div>
  );
};

// ── APPROVE MR MODAL (with qty edit) ─────────────────────────────────
function ApproveMRModal({mr,onSave,onClose}){
  const [qty,setQty]=useState(String(mr.qty));
  const [note,setNote]=useState("");
  return(
    <Modal onClose={onClose} width={400}>
      <MHead title="Approve Material Request" sub={`${mr.id} · ${mr.item}`} onClose={onClose}/>
      <MBody>
        <div style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:T.t3}}>Requested by</span>
            <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{mr.requestedBy}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:T.t3}}>Project</span>
            <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{mr.project}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:T.t3}}>Requested Qty</span>
            <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{mr.qty} {mr.unit}</span>
          </div>
          {mr.inStock>0&&(
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:`1px solid ${T.b1}`,marginTop:4}}>
              <span style={{fontSize:11,color:T.t3}}>In Stock</span>
              <span style={{fontSize:12,fontWeight:600,color:T.grn}}>{mr.inStock} {mr.unit}</span>
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Fld label="Approved Quantity" required>
            <Inp type="number" value={qty} onChange={e=>setQty(e.target.value)} min="0" max={String(mr.qty)} placeholder={String(mr.qty)}/>
            {qty&&Number(qty)<mr.qty&&(
              <div style={{marginTop:4,fontSize:10.5,color:T.amb,padding:"3px 8px",background:T.ambL,borderRadius:5,border:`1px solid ${T.ambM}`}}>
                Quantity reduced from {mr.qty} to {qty} {mr.unit}
              </div>
            )}
          </Fld>
          <Fld label="Note (Optional)">
            <Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="Any remarks for site team..."/>
          </Fld>
        </div>
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(mr.id,Number(qty)||mr.qty,note)} disabled={!qty||Number(qty)<=0} color={T.grn} full icon={<IcChk size={14} color="white"/>}>Approve MR</Btn>
      </MFoot>
    </Modal>
  );
}

// ── REJECT MR MODAL ───────────────────────────────────────────────────
function RejectMRModal({mr,onSave,onClose}){
  const [reason,setReason]=useState("");
  return(
    <Modal onClose={onClose} width={380}>
      <MHead title="Reject Material Request" sub={`${mr.id} · ${mr.item}`} onClose={onClose}/>
      <MBody>
        <div style={{background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.red}}>
          This MR will be rejected. Site team will be notified.
        </div>
        <Fld label="Reason for Rejection" required>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="e.g. Item not in BOQ, use alternate material..."
            style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
        </Fld>
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(mr.id,reason)} disabled={!reason.trim()} color={T.red} full icon={<IcBan size={14} color="white"/>}>Reject MR</Btn>
      </MFoot>
    </Modal>
  );
}

// ── BULK ORDER MODAL (Checkbox selection → order medium) ──────────────
function BulkOrderModal({items,onSave,onClose,dbVendors=[],onWarehouseIssued}){
  const [medium,setMedium]=useState(""); // 'po' | 'rfq' | 'manual'
  const [vendor,setVendor]=useState("");
  const [delivery,setDelivery]=useState("");
  const [waMsg,setWaMsg]=useState("");

  // Company fulfillment mode — when set to 'warehouse_driven' the
  // procurement side should NOT suggest warehouse routing here: every
  // approved MR auto-routes to warehouse on approval, and warehouse
  // staff (not procurement) decides Issue-from-Stock vs Pass-to-Procurement.
  const [companyMode, setCompanyMode] = useState("procurement_driven");
  useEffect(() => {
    api.get("/settings/company").then(r => {
      if (r?.success && r.data?.mr_fulfillment_mode) setCompanyMode(r.data.mr_fulfillment_mode);
    }).catch(()=>{});
  }, []);
  const showWarehouseStep = companyMode !== "warehouse_driven";

  // Warehouse availability per item — checked on mount
  const [whCheck,setWhCheck]=useState({});  // {itemId: {available, sufficient, found, material_id, unit, rate}}
  const [whTake,setWhTake]=useState({});    // {itemId: qty user wants from warehouse}
  const [issuingFromWH,setIssuingFromWH]=useState(false);
  // Sync ref guard — useState lags one render so a fast double-click on
  // "Issue from Warehouse" was firing the POST twice and creating two
  // wh_material_requests for the same procurement row. Ref flips before
  // React sees it, so the second click bails immediately.
  const issuingRef = useRef(false);

  useEffect(()=>{
    // In warehouse-driven mode, MRs auto-route to warehouse on approval
    // — procurement doesn't decide. Skip the entire stock-check probe so
    // the "Warehouse stock available" recommended block stays hidden.
    if (!showWarehouseStep) return;
    items.forEach(it=>{
      // Skip the stock check for warehouse-restock MRs too — even if
      // wh_materials shows some stock, the warehouse asked for MORE.
      if (it.isWarehouseRestock) return;
      const reqQty = Number(it.approvedQty||it.qty)||0;
      api.get(`/warehouse/check-stock?name=${encodeURIComponent(it.item||"")}&qty=${reqQty}`).then(r=>{
        if(r.success){
          setWhCheck(p=>({...p,[it.id]:r.data}));
          const def = Math.min(reqQty, Number(r.data?.available||0));
          if(def>0) setWhTake(p=>({...p,[it.id]:def}));
        }
      }).catch(()=>{});
    });
  },[showWarehouseStep]); // refetch if mode flips mid-session

  // In warehouse-driven mode procurement doesn't decide stock routing —
  // the whole "Warehouse stock available" section is suppressed. We still
  // compute itemsWithWH for the procurement-driven flow, but force-empty
  // it here so the recommendation card + Issue-from-Warehouse button
  // disappear regardless of any earlier whCheck populates that may have
  // happened due to the mount-time race with the mode fetch.
  const itemsWithWH = showWarehouseStep
    ? items.filter(it=>{
        if (it.isWarehouseRestock) return false; // warehouse can't fulfill itself
        const c = whCheck[it.id];
        return c?.found && Number(c.available)>0;
      })
    : [];
  const totalWHTake = showWarehouseStep
    ? items.reduce((s,it)=>s+Number(whTake[it.id]||0),0)
    : 0;
  const anyWHTake = totalWHTake>0;

  const handleIssueFromWarehouse = async () => {
    if (!anyWHTake) return;
    if (issuingRef.current) return; // hard double-click guard
    issuingRef.current = true;
    setIssuingFromWH(true);
    let createdMRs = [];
    let dedupedMRs = []; // backend returned existing MR for items already requested
    let errors = [];
    for (const it of items) {
      const qty = Number(whTake[it.id]||0);
      if (qty <= 0) continue;
      try {
        const res = await api.post("/warehouse/issue-from-procurement", {
          procurement_mr_id: it.id,
          qty,
        });
        if (res.success) {
          if (res.duplicate) dedupedMRs.push(res.data?.wh_mr_no);
          else createdMRs.push(res.data?.wh_mr_no);
        } else errors.push(`${it.item}: ${res.message||"failed"}`);
      } catch(e) { errors.push(`${it.item}: ${e.message}`); }
    }
    setIssuingFromWH(false);
    issuingRef.current = false;
    if (errors.length) {
      alert("Kuch errors:\n"+errors.join("\n"));
    }
    if (createdMRs.length || dedupedMRs.length) {
      onWarehouseIssued && onWarehouseIssued([...createdMRs, ...dedupedMRs]);
      onClose();
    }
  };

  // Build WA message when manual selected
  const buildWA=()=>{
    const lines=items.map(i=>{
      const taken = Number(whTake[i.id]||0);
      const remaining = Math.max(0, Number(i.approvedQty||i.qty) - taken);
      return remaining>0 ? `• ${i.item} — ${remaining} ${i.unit} (${i.project})` : null;
    }).filter(Boolean).join("\n");
    return `Order\n${lines}\nDelivery by: ${delivery||"TBD"}\nPlease confirm. — Admin`;
  };

  // Items still needing a vendor order — i.e. requested qty exceeds what
  // the user is taking from warehouse. When zero, the vendor section is
  // hidden entirely (single-step flow: just Issue from Warehouse).
  const remainingForVendor = items.filter(m => {
    const taken = Number(whTake[m.id]||0);
    const req   = Number(m.approvedQty||m.qty)||0;
    return req - taken > 0;
  });
  const allCoveredByWarehouse = remainingForVendor.length === 0 && itemsWithWH.length > 0;

  return(
    <Modal onClose={onClose} width={560}>
      <MHead title={`Order ${items.length} item${items.length>1?"s":""}`}
        sub={itemsWithWH.length > 0
          ? (allCoveredByWarehouse ? "Sab warehouse se issue ho jayenge" : "Step 1: warehouse · Step 2: vendor")
          : "Select order medium"}
        onClose={onClose}/>
      <MBody>
        {/* ── STEP 1 — Warehouse issue (highlighted primary action) ── */}
        {itemsWithWH.length>0&&(
          <div style={{background:`linear-gradient(135deg, ${T.grnL}, ${T.cynL})`,border:`2px solid ${T.grn}`,borderRadius:10,padding:"12px 14px",marginBottom:14,boxShadow:`0 4px 14px ${T.grn}22`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:9}}>
              <span style={{fontSize:22,lineHeight:1}}>🏬</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span style={{fontSize:9.5,fontWeight:800,color:"white",background:T.grn,padding:"2px 8px",borderRadius:4,letterSpacing:".5px",textTransform:"uppercase"}}>Recommended</span>
                  <span style={{fontSize:13,fontWeight:800,color:T.grn}}>Warehouse stock available</span>
                </div>
                <div style={{fontSize:11.5,color:T.t2,marginTop:3,lineHeight:1.4}}>
                  {itemsWithWH.length} item{itemsWithWH.length>1?"s":""} warehouse se issue ho sakte hain — PO bachao, faster delivery, no vendor wait.
                </div>
              </div>
            </div>
            <div style={{background:"white",borderRadius:7,padding:"6px 10px",border:`1px solid ${T.cynM}`}}>
              {items.map((it,i)=>{
                const c=whCheck[it.id];
                const reqQty=Number(it.approvedQty||it.qty)||0;
                const avail=Number(c?.available||0);
                const taken=Number(whTake[it.id]||0);
                const fromVendor=Math.max(0, reqQty-taken);
                if (!c?.found || avail<=0) return null;
                return (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 110px 90px 90px",gap:6,alignItems:"center",padding:"5px 0",borderBottom:i<itemsWithWH.length-1?`1px solid ${T.b1}`:"none"}}>
                    <div style={{fontSize:11.5,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.item}</div>
                    <div style={{fontSize:10.5,color:T.t3}}>Avail: <b style={{color:avail>=reqQty?T.grn:T.amb}}>{avail}</b> {it.unit}</div>
                    <input type="number" value={whTake[it.id]||0} max={Math.min(reqQty,avail)} min={0}
                      onChange={e=>setWhTake(p=>({...p,[it.id]:e.target.value}))}
                      title="Warehouse se kitna lena hai"
                      style={{height:26,padding:"0 7px",borderRadius:5,border:`1px solid ${T.cynM}`,fontSize:11,outline:"none",fontFamily:"inherit",textAlign:"right",background:"white"}}/>
                    <div style={{fontSize:10,color:T.t4,textAlign:"right"}}>{fromVendor>0?`+ vendor: ${fromVendor} ${it.unit}`:<span style={{color:T.grn,fontWeight:700}}>✓ full</span>}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={handleIssueFromWarehouse} disabled={!anyWHTake||issuingFromWH}
              style={{marginTop:11,width:"100%",padding:"11px",borderRadius:8,
                background:anyWHTake?`linear-gradient(135deg, ${T.grn}, #047857)`:T.b1,
                color:anyWHTake?"white":T.t4,border:"none",
                fontSize:13.5,fontWeight:800,cursor:anyWHTake?"pointer":"not-allowed",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                boxShadow:anyWHTake?`0 4px 12px ${T.grn}55`:"none",
                letterSpacing:".3px"}}>
              {issuingFromWH?"Creating warehouse MRs...":
                <><span style={{fontSize:16}}>📦</span> Issue from Warehouse{totalWHTake>0?` · ${totalWHTake.toFixed(2)} units`:""}{allCoveredByWarehouse?" — Done":""}</>}
            </button>
            <div style={{fontSize:10.5,color:T.t3,marginTop:7,textAlign:"center",lineHeight:1.4}}>
              Click → Warehouse Requests me MR generate · procurement MR <b style={{color:T.grn}}>"Ordered"</b> tab me move{!allCoveredByWarehouse?` · ${remainingForVendor.length} bachay item ke liye neeche vendor order karo`:""}
            </div>
          </div>
        )}

        {/* If everything is being issued from warehouse, vendor section
            is hidden — single-step flow. Otherwise show remaining items
            + vendor order picker as Step 2. */}
        {!allCoveredByWarehouse && (<>
        {/* Items summary */}
        <div style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:16,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",background:T.b1,display:"flex",alignItems:"center",gap:7}}>
            {itemsWithWH.length>0 && (
              <span style={{fontSize:9,fontWeight:800,color:"white",background:T.blu,padding:"2px 7px",borderRadius:4,letterSpacing:".4px",textTransform:"uppercase"}}>Step 2</span>
            )}
            <span style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px"}}>{anyWHTake?"Remaining for vendor":"Selected Items"}</span>
          </div>
          {items.map((m,i)=>{
            const taken=Number(whTake[m.id]||0);
            const reqQty=Number(m.approvedQty||m.qty)||0;
            const remaining=Math.max(0,reqQty-taken);
            if (anyWHTake && remaining<=0) return null;
            return (
            <div key={i} style={{padding:"8px 12px",borderBottom:`1px solid ${T.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,display:"flex",alignItems:"center",gap:7}}>
                  {m.item}
                  {m.isWarehouseRestock && (
                    <span title="Warehouse team ne yeh stock restock ke liye request kiya — warehouse se issue nahi ho sakta, vendor se hi order karna hoga"
                      style={{fontSize:9,fontWeight:800,color:T.amb,background:T.ambL,border:`1px solid ${T.ambM}`,padding:"1px 7px",borderRadius:10,textTransform:"uppercase",letterSpacing:".3px"}}>
                      🏬 Warehouse Restock
                    </span>
                  )}
                </div>
                <div style={{fontSize:11,color:T.t3}}>{m.project} · {m.id}{taken>0?<span style={{color:T.cyn,marginLeft:6}}>· {taken} {m.unit} from warehouse</span>:""}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{remaining} <span style={{fontSize:10,color:T.t4}}>{m.unit}</span></div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Medium selector */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10.5,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:8}}>Order Via</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {key:"po",   label:"Create PO",      sub:"Formal order",    icon:IcPO,    c:T.blu},
              {key:"rfq",  label:"Create RFQ",     sub:"Compare quotes",  icon:IcRFQ,   c:T.pur},
              {key:"manual",label:"Manual Order",  sub:"Call / WhatsApp", icon:IcWA,    c:T.grn},
            ].map(opt=>(
              <button key={opt.key} onClick={()=>setMedium(opt.key)}
                style={{padding:"12px 10px",borderRadius:8,border:`2px solid ${medium===opt.key?opt.c:T.b1}`,background:medium===opt.key?opt.c+"12":T.surface,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <opt.icon size={20} color={medium===opt.key?opt.c:T.t3}/>
                <div style={{fontSize:12,fontWeight:600,color:medium===opt.key?opt.c:T.t2,marginTop:5}}>{opt.label}</div>
                <div style={{fontSize:10,color:T.t4,marginTop:2}}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info banners — minimal, no inline fields. Vendor + delivery
            fill hone ka step next modal me hota hai. */}
        {medium==="po"&&(
          <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,padding:"9px 12px",fontSize:11.5,color:T.blu}}>
            Next step: vendor, delivery date aur items rate Create PO modal me bharo.
          </div>
        )}
        {medium==="rfq"&&(
          <div style={{background:T.purL,border:`1px solid ${T.purM}`,borderRadius:7,padding:"9px 12px",fontSize:11.5,color:T.pur}}>
            RFQ will be created as Draft. Add vendors and publish to collect quotes.
          </div>
        )}
        {medium==="manual"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Fld label="Vendor" required>
              <SearchSelect value={vendor}
                options={(dbVendors.length>0?dbVendors.map(v=>v.name||v):VENDORS)}
                onChange={v=>setVendor(v)} placeholder="Select vendor..."/>
            </Fld>
            <Fld label="Expected Delivery" required>
              <Inp type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}/>
            </Fld>
            {vendor&&delivery&&(
              <div style={{background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,padding:"10px 12px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:600,color:T.grn}}>WhatsApp Template</span>
                  <button onClick={()=>{const num=prompt("Vendor phone (10 digits):");if(num)window.open(`https://wa.me/91${num.replace(/\D/g,"")}?text=${encodeURIComponent(buildWA())}`);}}
                    style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:5,background:"#25D366",border:"none",color:"white",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                    <IcWA size={11} color="white"/> Send
                  </button>
                </div>
                <div style={{fontSize:10.5,color:T.grn,whiteSpace:"pre-line",lineHeight:1.6}}>{buildWA()}</div>
              </div>
            )}
          </div>
        )}
        </>)}
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        {allCoveredByWarehouse ? (
          // Single-step flow — Issue from Warehouse button up top is the
          // entire submit. Hide the duplicate vendor CTA.
          <span style={{flex:1}}/>
        ) : (
          <Btn
            onClick={()=>onSave(medium,vendor,delivery,items)}
            disabled={!medium||(medium==="manual"&&(!vendor||!delivery))}
            color={medium==="po"?T.blu:medium==="rfq"?T.pur:T.grn}
            full
            icon={medium==="po"?<IcPO size={14} color="white"/>:medium==="rfq"?<IcRFQ size={14} color="white"/>:<IcWA size={14} color="white"/>}>
            {medium==="po"?"Create PO":medium==="rfq"?"Create RFQ":"Mark as Ordered"}
          </Btn>
        )}
      </MFoot>
    </Modal>
  );
}

// ── MARK RECEIVED MODAL ───────────────────────────────────────────────
function MarkReceivedModal({mr,onSave,onClose}){
  const [challan,setChallan]=useState("");
  const [rQty,setRQty]=useState(String(mr.approvedQty||mr.qty));
  const isPartial=parseFloat(rQty)<(mr.approvedQty||mr.qty);
  return(
    <Modal onClose={onClose} width={400}>
      <MHead title="Mark as Received" sub={`${mr.id} · ${mr.item}`} onClose={onClose}/>
      <MBody>
        <div style={{background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,padding:"9px 12px",marginBottom:14}}>
          <div style={{fontSize:11,color:T.grn}}>Ordered: <strong>{mr.approvedQty||mr.qty} {mr.unit}</strong>{mr.vendor?` from ${mr.vendor}`:""}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Fld label="Quantity Received" required>
            <Inp type="number" value={rQty} onChange={e=>setRQty(e.target.value)} max={String(mr.approvedQty||mr.qty)}/>
            {isPartial&&parseFloat(rQty)>0&&(
              <div style={{marginTop:4,fontSize:10.5,color:T.amb,padding:"3px 8px",background:T.ambL,borderRadius:5,border:`1px solid ${T.ambM}`}}>
                Partial — {(mr.approvedQty||mr.qty)-parseFloat(rQty)} {mr.unit} still pending
              </div>
            )}
          </Fld>
          <Fld label="Challan / DC No." required>
            <Inp value={challan} onChange={e=>setChallan(e.target.value)} placeholder="Supplier delivery challan number"/>
          </Fld>
        </div>
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(mr.id,parseFloat(rQty),challan)} disabled={!rQty||!challan} color={T.grn} full icon={<IcChk size={14} color="white"/>}>
          {isPartial?"Mark Partial Received":"Mark Fully Received"}
        </Btn>
      </MFoot>
    </Modal>
  );
}

// ── GRN MODAL ─────────────────────────────────────────────────────────
function GRNModal({po,onClose,onSave}){
  const [challan,setChallan]=useState("");
  const [vendorOverride,setVendorOverride]=useState(po.vendor||"");
  const [rows,setRows]=useState(po.items.map(it=>({qty:String(it.qty),quality:"Good",remark:""})));
  const isPartial=rows.some((r,i)=>parseFloat(r.qty)<po.items[i].qty);
  const effectiveVendor = (po.vendor && String(po.vendor).trim()) || vendorOverride.trim();
  const canSubmit = !!challan.trim() && !!effectiveVendor;
  return(
    <Modal onClose={onClose} width={500}>
      <MHead title="Goods Receipt Note" sub={`${po.id} · ${po.vendor||"— vendor missing —"}`} onClose={onClose}/>
      <MBody>
        {!po.vendor&&(
          <div style={{marginBottom:12,padding:"9px 11px",background:T.redL,border:`1px solid ${T.redM}`,borderRadius:7,fontSize:11.5,color:T.red}}>
            ⚠ Source PO has no vendor set. Type vendor name below to continue.
          </div>
        )}
        {!po.vendor&&(
          <div style={{marginBottom:12}}>
            <Fld label="Vendor *" required>
              <Inp value={vendorOverride} onChange={e=>setVendorOverride(e.target.value)} placeholder="Vendor name"/>
            </Fld>
          </div>
        )}
        <div style={{marginBottom:12}}>
          <Fld label="Challan / DC Number" required>
            <Inp value={challan} onChange={e=>setChallan(e.target.value)} placeholder="Supplier challan number"/>
          </Fld>
        </div>
        {po.items.map((it,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:10}}>{it.desc} <span style={{fontSize:11,color:T.t4,fontWeight:400}}>({it.qty} {it.unit} ordered)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Qty Received</label>
                <input type="number" value={rows[i].qty} onChange={e=>{const r=[...rows];r[i]={...r[i],qty:e.target.value};setRows(r);}} max={it.qty}
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                {parseFloat(rows[i].qty)<it.qty&&parseFloat(rows[i].qty)>0&&<div style={{fontSize:9.5,color:T.amb,marginTop:3}}>Partial — {it.qty-parseFloat(rows[i].qty)} pending</div>}
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Quality</label>
                <SearchSelect value={rows[i].quality} options={["Good","Partial","Rejected"]}
                  onChange={v=>{const r=[...rows];r[i]={...r[i],quality:v};setRows(r);}} placeholder="Quality"/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Remark</label>
                <input value={rows[i].remark} onChange={e=>{const r=[...rows];r[i]={...r[i],remark:e.target.value};setRows(r);}} placeholder="Optional..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
        {isPartial&&<div style={{padding:"9px 12px",background:T.ambL,borderRadius:7,border:`1px solid ${T.ambM}`,display:"flex",alignItems:"center",gap:8}}>
          <IcAlert size={14} color={T.amb}/>
          <span style={{fontSize:11.5,color:T.amb,fontWeight:500}}>Partial GRN — PO stays open for remaining delivery</span>
        </div>}
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(po.id,challan,rows,effectiveVendor)} disabled={!canSubmit} color={T.grn} full icon={<IcGRN size={14} color="white"/>}>
          {isPartial?"Confirm Partial GRN":"Confirm Full GRN"}
        </Btn>
      </MFoot>
    </Modal>
  );
}

// ── PO DETAIL DRAWER ──────────────────────────────────────────────────
function PODetailDrawer({po,onClose,onApprove,onShare,onGRN,onEdit,onCancel,onSendToVendor}){
  const [detail, setDetail] = useState(po);
  const [fetching, setFetching] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Fetch fresh PO with items from backend
  useEffect(()=>{
    if(!po.id) return;
    api.get("/procurement/pos")
      .then(res=>{
        if(res.success){
          const fresh=res.data.find(p=>String(p.id)===String(po.id));
          if(fresh){
            const mapped={
              ...po,
              poNum:   fresh.po_number||po.poNum,
              vendor:  fresh.vendor_name||po.vendor,
              project: fresh.project_name||po.project,
              deliverySite: fresh.delivery_site||po.deliverySite,
              delivery: fresh.expected_delivery||po.delivery,
              deliveryRaw: fresh.expected_delivery?String(fresh.expected_delivery).split("T")[0]:po.deliveryRaw,
              amount:  parseFloat(fresh.total_amount)||0,
              poStatus:fresh.po_status||po.poStatus,
              approval:fresh.approval_status||po.approval,
              orderStatus:fresh.order_status||po.orderStatus||"NotOrdered",
              sentAt:fresh.sent_to_vendor_at||po.sentAt,
              sentVia:fresh.sent_via||po.sentVia,
              date: fresh.created_at?new Date(fresh.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):po.date,
              items:(fresh.items||[]).map(it=>({
                id:it.id, desc:it.description, hsn:it.hsn_code||"—",
                qty:parseFloat(it.quantity)||0, unit:it.unit,
                rate:parseFloat(it.rate)||0,
                amount:(parseFloat(it.quantity)||0)*(parseFloat(it.rate)||0),
                receivedQty:parseFloat(it.received_qty)||0,
              })),
            };
            setDetail(mapped);
          }
        }
      })
      .catch(()=>{})
      .finally(()=>setFetching(false));
  },[po.id]);

  const d=detail;
  // Distinct project_names across line items — used to render "Multiple
  // (N sites)" in the header when the PO spans more than one project.
  const uniqueProjects = Array.from(new Set((d.items||[])
    .map(it => (it.delivery_site || it.project_name || "").trim())
    .filter(Boolean)));
  const ps=PO_STATUS[d.poStatus]||PO_STATUS.Open;
  const dispLbl=displayPOStatus(d);
  const as=APPR_STATUS[dispLbl]||APPR_STATUS.Draft;
  const totalAmt=d.items?.reduce((s,it)=>s+(it.amount||0),0)||d.amount||0;

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:520,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"16px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"white",letterSpacing:"-.3px"}}>{d.poNum||("PO-"+d.id)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:3}}>{d.date}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex",padding:4}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Pill label={d.poStatus} c={ps.c} bg={ps.bg} brd={ps.brd}/>
          <Pill label={PO_PILL_LABEL[dispLbl]||dispLbl} c={as.c} bg={as.bg} brd={as.brd}/>
          <span style={{background:"rgba(255,255,255,0.12)",color:"white",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>₹{fmtN(totalAmt)}</span>
          {fetching&&<span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>loading...</span>}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:12}}>

        {/* Compact PO details — 2-column grid (saves vertical space for items)
            Multi-site POs show "Multiple (N sites)" since project_name on
            the PO row reflects only the first MR's project. */}
        <div style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {[
              ["Project",     uniqueProjects.length > 1 ? `Multiple (${uniqueProjects.length} sites)` : d.project],
              ["Vendor",      d.vendor],
              ["Site",        uniqueProjects.length > 1 ? uniqueProjects.join(" · ") : (d.deliverySite||d.project||"—")],
              ["Exp. Delivery",d.delivery||"—"],
            ].map(([k,v],i)=>(
              <div key={k} style={{padding:"7px 11px",borderBottom:i<2?"1px solid "+T.b1:"none",borderRight:i%2===0?"1px solid "+T.b1:"none",minWidth:0}}>
                <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>{k}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.t1,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={v||"—"}>{v||"—"}</div>
              </div>
            ))}
          </div>
          {d.reviewNote&&(d.approval==="Revision"||d.approval==="Rejected")&&(
            <div style={{padding:"7px 11px",borderTop:"1px solid "+T.b1,background:d.approval==="Rejected"?T.redL:"#EFF6FF"}}>
              <span style={{fontSize:9.5,fontWeight:700,color:d.approval==="Rejected"?T.red:"#1D4ED8",textTransform:"uppercase",letterSpacing:".3px"}}>{d.approval==="Rejected"?"❌ Rejected":"↻ Revision requested"}</span>
              <div style={{fontSize:11.5,color:T.t2,fontStyle:"italic",marginTop:2}}>"{d.reviewNote}"</div>
            </div>
          )}
        </div>

        {/* Items table */}
        <div style={{background:T.surface,borderRadius:8,border:"1px solid "+T.b1,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".5px"}}>Items ({d.items?.length||0})</span>
            <span style={{fontSize:11,color:T.t4}}>Qty · Rate · Amount</span>
          </div>
          {(!d.items||d.items.length===0)&&(
            <div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:12}}>
              {fetching?"Loading items...":"No items found — enter rate while creating PO"}
            </div>
          )}
          {(d.items||[]).map((it,i)=>{
            // Surface per-item site only when it differs from PO header or
            // when the PO spans multiple projects — keeps single-site POs
            // visually unchanged.
            const lineSite = it.delivery_site || it.project_name || "";
            const showLineSite = lineSite && (uniqueProjects.length > 1 || lineSite !== d.project);
            return (
            <div key={i} style={{padding:"12px 14px",borderBottom:"1px solid "+T.b1,background:i%2===0?T.surface:T.surfaceB}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.t1}}>{it.desc}</div>
                  {showLineSite && (
                    <div style={{fontSize:10.5,fontWeight:600,color:T.blu,marginTop:3,display:"inline-flex",alignItems:"center",gap:4,background:T.bluL,padding:"2px 8px",borderRadius:10,border:`1px solid ${T.bluM}`}}>
                      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {lineSite}
                    </div>
                  )}
                  {it.hsn&&it.hsn!=="—"&&<div style={{fontSize:10.5,color:T.t4,marginTop:2}}>HSN: {it.hsn}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{fontSize:15,fontWeight:700,color:it.amount>0?T.t1:T.t4}}>
                    {it.amount>0?"₹"+fmtN(it.amount):"Rate pending"}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                <div style={{background:T.bg,borderRadius:5,padding:"4px 10px",display:"inline-flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:10,color:T.t4,fontWeight:500}}>QTY</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.qty} {it.unit}</span>
                </div>
                <div style={{background:T.bg,borderRadius:5,padding:"4px 10px",display:"inline-flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:10,color:T.t4,fontWeight:500}}>RATE</span>
                  <span style={{fontSize:12,fontWeight:600,color:it.rate>0?T.t1:T.amb}}>{it.rate>0?"₹"+fmtN(it.rate):"—"}</span>
                </div>
                {it.receivedQty>0&&(
                  <div style={{background:T.grnL,borderRadius:5,padding:"4px 10px",display:"inline-flex",gap:6,alignItems:"center",border:"1px solid "+T.grnM}}>
                    <span style={{fontSize:10,color:T.grn,fontWeight:500}}>RECEIVED</span>
                    <span style={{fontSize:12,fontWeight:600,color:T.grn}}>{it.receivedQty} {it.unit}</span>
                  </div>
                )}
              </div>
            </div>
            );
          })}
          {/* Total row */}
          <div style={{padding:"12px 14px",background:"#0D1B2A",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.6)"}}>PO Total</span>
            <span style={{fontSize:18,fontWeight:700,color:"white",letterSpacing:"-.5px"}}>₹{fmtN(totalAmt)}</span>
          </div>
        </div>

        {/* Rate notice if ₹0 */}
        {totalAmt===0&&!fetching&&(
          <div style={{background:T.ambL,border:"1px solid "+T.ambM,borderRadius:7,padding:"10px 13px",fontSize:12,color:T.amb}}>
            Rate enter nahi ki gayi thi PO bante waqt. GRN ke baad Finance mein invoice entry pe rate add karo.
          </div>
        )}
      </div>

      {/* Action footer — context-aware: Approve / Edit / SendToVendor / GRN / Close */}
      <div style={{padding:"10px 14px",borderTop:"1px solid "+T.b1,background:T.surface,display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
        {d.approval==="Draft"&&<button onClick={()=>onApprove(d.id)} style={{flex:"1 1 100px",padding:"8px",borderRadius:7,background:T.grnL,color:T.grn,border:"1px solid "+T.grnM,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><IcApprv size={12} color={T.grn}/> Approve</button>}
        {/* Edit — for Draft / Revision / Rejected (not after sent) */}
        {d.poStatus!=="Cancelled"&&d.orderStatus!=="Ordered"&&d.orderStatus!=="Received"&&onEdit&&(
          <button onClick={()=>onEdit(d)} title="Edit PO — change vendor, items, rates"
            style={{flex:"1 1 100px",padding:"8px",borderRadius:7,background:d.approval==="Revision"?"#DBEAFE":T.surfaceB,color:d.approval==="Revision"?"#1D4ED8":T.t2,border:`1px solid ${d.approval==="Revision"?"#93C5FD":T.b1}`,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            ✏️ {d.approval==="Revision"?"Edit & Resubmit":"Edit"}
          </button>
        )}
        {/* Send to Vendor — Approved & not yet ordered */}
        {d.approval==="Approved"&&d.orderStatus==="NotOrdered"&&d.poStatus!=="Cancelled"&&onSendToVendor&&(
          <button onClick={()=>onSendToVendor(d)} style={{flex:"1 1 130px",padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:"1.5px solid "+T.blu,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            📤 Send to Vendor
          </button>
        )}
        {/* Record GRN — only after ordered */}
        {d.poStatus==="Open"&&d.approval==="Approved"&&d.orderStatus==="Ordered"&&(
          <button onClick={()=>onGRN(d)} style={{flex:"1 1 110px",padding:"8px",borderRadius:7,background:T.ambL,color:T.amb,border:"1.5px solid "+T.amb,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            <IcGRN size={12} color={T.amb}/> Record GRN
          </button>
        )}
        {/* Share — secondary, available anytime for sharing PO copy */}
        <button onClick={()=>onShare(d)} title="Share PO link" style={{flex:"0 0 38px",padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:"1px solid "+T.b1,fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcShare size={13} color={T.t3}/></button>
        {/* Close PO — cancel for any non-cancelled status */}
        {d.poStatus!=="Cancelled"&&onCancel&&(
          <button onClick={async()=>{
              if(cancelling) return;
              if(!await window.confirmAsync(`Close PO ${d.poNum||d.id}? This cancels the PO and cannot be undone.`)) return;
              setCancelling(true);
              await onCancel(d);
              setCancelling(false);
            }}
            disabled={cancelling}
            style={{flex:"0 0 38px",padding:"8px",borderRadius:7,background:T.redL,color:T.red,border:"1px solid "+T.redM,fontSize:11.5,fontWeight:700,cursor:cancelling?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:cancelling?.6:1}} title="Close (Cancel) PO">
            ✕
          </button>
        )}
      </div>
    </div>
  </>);
}

// ── RFQ DETAIL DRAWER ─────────────────────────────────────────────────
function RFQDetailDrawer({rfq,onClose,onPunch,onLock,onPublish}){
  const getMinMax=(idx)=>{const s=rfq.vendors.filter(v=>v.status==="Submitted"&&v.rates[idx]?.rate!=null);if(!s.length)return{min:null,max:null};const r=s.map(v=>v.rates[idx].rate);return{min:Math.min(...r),max:Math.max(...r)};};
  const totalByVendor=(v)=>rfq.items.reduce((s,it,i)=>s+(v.rates[i]?.rate||0)*it.qty,0);
  const allTotals=rfq.vendors.filter(v=>v.status==="Submitted").map(v=>totalByVendor(v));
  const minTotal=Math.min(...allTotals);const maxTotal=Math.max(...allTotals);
  const rs=RFQ_STATUS[rfq.status]||RFQ_STATUS.Draft;
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:680,background:T.bg,zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#0D1B2A",padding:"14px 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:15,fontWeight:700,color:"white"}}>{rfq.id} · {rfq.project}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={15}/></button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
          {rfq.bidEnd&&<span style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</span>}
          {rfq.locked&&<span style={{background:"rgba(5,150,105,0.25)",color:"#6EE7B7",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20}}>Locked: {rfq.locked}</span>}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {/* Items */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Items Requested</span></div>
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
        {/* Rate comparison */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Rate Comparison</span>
            <div style={{display:"flex",gap:8}}>
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:T.grn}}><span style={{width:8,height:8,borderRadius:2,background:T.grn,display:"inline-block"}}/>Cheapest</span>
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:T.red}}><span style={{width:8,height:8,borderRadius:2,background:T.red,display:"inline-block"}}/>Expensive</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"6px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Vendor</span>
            {rfq.items.map((it,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{it.desc.split(" ").slice(0,2).join(" ")}</span>)}
            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:"right"}}>Total</span>
          </div>
          {rfq.vendors.map((v,vi)=>{
            const vTotal=totalByVendor(v);
            const isBest=v.status==="Submitted"&&vTotal===minTotal&&allTotals.length>0;
            const isWorst=v.status==="Submitted"&&vTotal===maxTotal&&allTotals.length>1;
            const isLocked=rfq.locked===v.name;
            return(<div key={vi} style={{display:"grid",gridTemplateColumns:`140px repeat(${rfq.items.length},1fr) 100px`,padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:isLocked?"rgba(5,150,105,0.06)":"none",borderLeft:isLocked?`3px solid ${T.grn}`:"3px solid transparent"}}>
              <div><div style={{fontSize:12,fontWeight:600,color:isLocked?T.grn:T.t1}}>{v.name}{isLocked&&<span style={{background:T.grn,color:"white",fontSize:8,padding:"1px 5px",borderRadius:3,marginLeft:5}}>LOCKED</span>}</div>
                <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
              </div>
              {rfq.items.map((item,ii)=>{
                const {min,max}=getMinMax(ii);const rate=v.rates[ii]?.rate;const remark=v.rates[ii]?.remarks;
                const isCheap=rate!=null&&rate===min&&min!==max;const isExp=rate!=null&&rate===max&&min!==max;
                return(<div key={ii} style={{padding:"2px 4px"}}>
                  {rate!=null?<div style={{fontSize:13,fontWeight:700,color:isCheap?T.grn:isExp?T.red:T.t1,background:isCheap?T.grnL:isExp?T.redL:"none",borderRadius:5,padding:"2px 6px",display:"inline-block"}}>₹{fmtN(rate)}</div>:<span style={{fontSize:11,color:T.t4}}>—</span>}
                  {remark&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{remark}</div>}
                </div>);
              })}
              <div style={{textAlign:"right"}}>{v.status==="Submitted"?<span style={{fontSize:13,fontWeight:700,color:isBest?T.grn:isWorst?T.red:T.t1,background:isBest?T.grnL:isWorst?T.redL:"none",padding:"2px 7px",borderRadius:5,display:"inline-block"}}>₹{fmtN(vTotal)}</span>:<span style={{fontSize:11,color:T.t4}}>Pending</span>}</div>
            </div>);
          })}
        </div>
        {/* Vendor actions */}
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}><span style={{fontSize:11,fontWeight:700,color:T.t1}}>Vendor Actions</span></div>
          {rfq.vendors.map((v,vi)=>(
            <div key={vi} style={{padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
              <span style={{flex:1,fontSize:12.5,fontWeight:500,color:T.t1}}>{v.name}</span>
              <button onClick={()=>onPunch(vi)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.purL,border:`1px solid ${T.purM}`,color:T.pur,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcPen size={12} color={T.pur}/> Punch Quote</button>
              {!rfq.locked&&v.status==="Submitted"&&<button onClick={()=>onLock(v.name)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}><IcLock size={12} color={T.grn}/> Lock Quote</button>}
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:7,flexShrink:0}}>
        {rfq.status==="Draft"&&<button onClick={()=>onPublish(rfq.id)} style={{flex:1,padding:"8px",borderRadius:7,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Publish RFQ</button>}
        {rfq.locked&&<button style={{flex:1,padding:"8px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IcPO size={13} color="white"/> Create PO</button>}
        <button onClick={onClose} style={{flex:1,padding:"8px",borderRadius:7,background:T.surfaceB,color:T.t3,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  </>);
}

// ── PUNCH QUOTE MODAL ─────────────────────────────────────────────────
function PunchQuoteModal({rfq,vendorIndex,onSave,onClose}){
  const vendor=rfq.vendors[vendorIndex];
  const [rates,setRates]=useState(rfq.items.map((_,i)=>({rate:vendor?.rates[i]?.rate||"",remark:vendor?.rates[i]?.remarks||""})));
  return(
    <Modal onClose={onClose} width={460}>
      <MHead title="Punch Quotation" sub={`On behalf of: ${vendor?.name}`} onClose={onClose}/>
      <MBody>
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11.5,color:T.amb}}>Admin entering rates on vendor's behalf.</div>
        {rfq.items.map((item,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:12.5,fontWeight:600,color:T.t1,marginBottom:2}}>{item.desc}</div>
            <div style={{fontSize:10.5,color:T.t4,marginBottom:10}}>HSN: {item.hsn} · {item.qty} {item.unit}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Rate per {item.unit} (₹)</label>
                <input type="number" value={rates[i].rate} onChange={e=>{const r=[...rates];r[i]={...r[i],rate:e.target.value};setRates(r);}} placeholder="Enter rate..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:13,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                {rates[i].rate&&<div style={{fontSize:10.5,color:T.grn,marginTop:3}}>Total: ₹{fmtN(Number(rates[i].rate)*item.qty)}</div>}
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Remarks</label>
                <input value={rates[i].remark} onChange={e=>{const r=[...rates];r[i]={...r[i],remark:e.target.value};setRates(r);}} placeholder="Optional..."
                  style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={()=>onSave(vendorIndex,rates)} color={T.blu} full icon={<IcChk size={14} color="white"/>}>Save Quotation</Btn>
      </MFoot>
    </Modal>
  );
}

// ── CREATE PO MODAL — full layout, library-driven, polished ────────────
function CreatePOModal({onClose,onSave,prefillItems,editPo,dbProjects,dbVendors=[]}){
  // Edit-mode prefill from existing PO
  const isEdit = !!editPo;
  // Auto-fill project from first MR item OR edit PO
  const firstMR = prefillItems?.[0];
  const autoProjectId   = editPo?.project_id || firstMR?.project_id   || "";
  const autoProjectName = editPo?.project    || firstMR?.project       || "";
  const autoSite        = editPo?.deliverySite || firstMR?.site || firstMR?.project || "";
  const fromMR          = !!prefillItems && !!autoProjectName;
  // Guard against double-submit (network delay → user double-click → duplicate PO)
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [form,setForm]=useState({
    vendor:      editPo?.vendor || "",
    projectId:   String(autoProjectId),
    project:     autoProjectName,
    deliverySite:autoSite,
    delivery:    editPo?.deliveryRaw || (editPo?.delivery && /^\d{4}-\d{2}-\d{2}/.test(String(editPo.delivery)) ? String(editPo.delivery).split("T")[0] : ""),
    notes:       editPo?.notes || "",
    items: editPo?.items?.length
      ? editPo.items.map(it=>({
          desc:it.desc||it.description||"",hsn:it.hsn||"",qty:String(it.qty||it.quantity||""),
          unit:it.unit||"",rate:String(it.rate||""),
          // preserve per-item project info round-trip
          project_id: it.project_id||null, project_name: it.project_name||"",
          delivery_site: it.delivery_site||"", linked_mr_id: it.linked_mr_id||null,
        }))
      : prefillItems
        ?prefillItems.map(m=>({
            desc:m.item,hsn:"",qty:String(m.approvedQty||m.qty),unit:m.unit,rate:"",
            // Each prefill row is a source MR — carry its project so the
            // PO can render per-line site even when items span multiple
            // projects (multi-site bulk order).
            project_id: m.project_id||null,
            project_name: m.project||m.project_name||"",
            delivery_site: m.delivery_site||m.project||"",
            linked_mr_id: m.id||null,
          }))
        :[{desc:"",hsn:"",qty:"",unit:"",rate:"",project_id:null,project_name:"",delivery_site:"",linked_mr_id:null}]
  });
  const [matLib,setMatLib]=useState([]);
  const reloadMatLib=()=>api.get("/library/materials").then(r=>{ if(r.success) setMatLib(r.data||[]); }).catch(()=>{});
  useEffect(()=>{ reloadMatLib(); },[]);

  // Inline "Add new material to library" form (collapsible)
  const [showAddMat,setShowAddMat]=useState(false);
  const [newMat,setNewMat]=useState({name:"",unit:"",hsn:""});
  const [savingMat,setSavingMat]=useState(false);
  const saveNewMaterial=async()=>{
    const name=(newMat.name||"").trim();
    if(!name) return;
    if(matLib.some(m=>(m.name||"").trim().toLowerCase()===name.toLowerCase())){
      alert("Yeh material library me already hai");
      return;
    }
    setSavingMat(true);
    const res=await api.post("/library/materials",{
      name, unit:(newMat.unit||"Nos").trim()||"Nos",
      hsn_code:(newMat.hsn||"").trim()||null,
    });
    setSavingMat(false);
    if(res.success){
      await reloadMatLib();
      setShowAddMat(false);
      setNewMat({name:"",unit:"",hsn:""});
    } else {
      alert(res.message||"Save failed");
    }
  };

  // Inline "Add new material vendor to library" form (collapsible, top-right)
  const [showAddVendor,setShowAddVendor]=useState(false);
  const [newVendor,setNewVendor]=useState({name:"",phone:"",city:""});
  const [savingVendor,setSavingVendor]=useState(false);
  const saveNewVendor=async()=>{
    const name=(newVendor.name||"").trim();
    if(!name) return;
    setSavingVendor(true);
    const res=await api.post("/finance/parties",{
      name, type:"Material Vendor",
      phone:(newVendor.phone||"").trim()||null,
      city:(newVendor.city||"").trim()||null,
      credit_days:7,
    });
    // Best-effort: also push to procurement vendor list (legacy)
    api.post("/procurement/vendors",{
      name, phone:(newVendor.phone||"").trim()||null,
      city:(newVendor.city||"").trim()||null,
      category:"Material",
    }).catch(()=>{});
    setSavingVendor(false);
    if(res?.success===false){ alert(res.message||"Save failed"); return; }
    // Refresh the LibrarySelect supplier cache so the new vendor appears in
    // the dropdown immediately (not just as a synthetic ghost of the value).
    try { await LibrarySelect.refresh("supplier"); } catch(_){}
    setForm(p=>({...p,vendor:name}));
    setShowAddVendor(false);
    setNewVendor({name:"",phone:"",city:""});
  };

  // Focus management: after "Add row" → cursor jumps to new row's material picker
  const matRefs = useRef({});
  const [pendingFocus, setPendingFocus] = useState(null);
  useEffect(() => {
    if (pendingFocus != null && matRefs.current[pendingFocus]) {
      matRefs.current[pendingFocus].focus();
      setPendingFocus(null);
    }
  }, [pendingFocus, form.items.length]);

  const upd=(k,v)=>setForm(p=>({...p,[k]:v}));
  const updItem=(i,k,v)=>{
    const its=[...form.items];
    its[i]={...its[i],[k]:v};
    if(k==="desc"){
      const m=matLib.find(x=>(x.name||"").trim().toLowerCase()===String(v||"").trim().toLowerCase());
      if(m){
        if(m.unit) its[i].unit=m.unit;
        if(m.hsn_code && !its[i].hsn) its[i].hsn=m.hsn_code;
      }
    }
    setForm(p=>({...p,items:its}));
    if(k==="desc" && v && !its[i].rate){
      api.get(`/warehouse/last-rate?name=${encodeURIComponent(v)}`).then(r=>{
        if(r.success && Number(r.data?.rate)>0){
          setForm(p=>({...p,items:p.items.map((row,j)=>j===i&&!Number(row.rate)?{...row,rate:r.data.rate}:row)}));
        }
      }).catch(()=>{});
    }
  };
  const addItem=()=>{
    const newIdx = form.items.length;
    setForm(p=>({...p,items:[...p.items,{desc:"",hsn:"",qty:"",unit:"",rate:""}]}));
    setPendingFocus(newIdx);
  };
  const removeItem=(i)=>{if(form.items.length===1)return;const its=[...form.items];its.splice(i,1);setForm(p=>({...p,items:its}));};
  const total=form.items.reduce((s,it)=>s+(Number(it.qty)||0)*(Number(it.rate)||0),0);

  // Project picker handler (only used when no prefillItems)
  const handleProjectChange=(v)=>{
    const proj=dbProjects.find(p=>String(p.id)===String(v));
    upd("projectId",v);
    upd("project",proj?.name||v);
    if(!form.deliverySite||form.deliverySite===autoSite){
      upd("deliverySite",proj?.name||"");
    }
  };

  return(
    <Modal onClose={onClose} width={680}>
      <MHead title={isEdit?`Edit PO ${editPo?.poNum||""}`:"Create Purchase Order"}
        sub={isEdit?`${editPo?.approval==="Revision"?"Revision requested — change & resubmit":"Edit PO details"}`:(fromMR?`Direct PO · ${autoProjectName}`:"Direct PO — vendor library + material library")}
        onClose={onClose}/>
      <MBody>
        {/* ── Top-right: Add new material vendor to Library ───────── */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
          <button onClick={()=>{ setShowAddVendor(s=>!s); if(!showAddVendor) setNewVendor({name:"",phone:"",city:""}); }}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.purL,border:`1.5px solid ${T.purM}`,color:T.pur,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.purM+"66"}
            onMouseLeave={e=>e.currentTarget.style.background=T.purL}>
            <IcAdd size={12} color={T.pur}/> {showAddVendor?"Cancel":"Add new material vendor to Library"}
          </button>
        </div>
        {showAddVendor&&(
          <div style={{padding:"11px 12px",background:T.purL,border:`1.5px solid ${T.purM}`,borderRadius:8,marginBottom:11}}>
            <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:8,letterSpacing:".3px"}}>🆕 Add new material vendor to Library</div>
            <div style={{display:"grid",gridTemplateColumns:"2.5fr 110px 110px auto",gap:7,alignItems:"center"}}>
              <input value={newVendor.name} onChange={e=>setNewVendor(p=>({...p,name:e.target.value}))} placeholder="Vendor name *" autoFocus
                style={{padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              <input value={newVendor.phone} onChange={e=>setNewVendor(p=>({...p,phone:e.target.value}))} placeholder="Phone"
                style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              <input value={newVendor.city} onChange={e=>setNewVendor(p=>({...p,city:e.target.value}))} placeholder="City"
                style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              <button onClick={saveNewVendor} disabled={!newVendor.name.trim()||savingVendor}
                style={{padding:"7px 14px",borderRadius:6,background:newVendor.name.trim()?T.pur:T.b1,color:newVendor.name.trim()?"white":T.t4,border:"none",fontSize:12,fontWeight:700,cursor:newVendor.name.trim()?"pointer":"not-allowed",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {savingVendor?"...":"Save"}
              </button>
            </div>
            <div style={{fontSize:10,color:T.pur,marginTop:6,opacity:.75}}>Save par Vendor field me auto-select ho jayega.</div>
          </div>
        )}

        {/* ── Section 1: Vendor + Project ─────────────────────────── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Fld label="Vendor *">
            <LibrarySelect type="supplier" value={form.vendor}
              onChange={v=>upd("vendor",v||"")}
              placeholder="Vendor library se pick"
              hideAddNew/>
          </Fld>
          <Fld label="Project *">
            {fromMR
              ? <div style={{padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.grnM}`,background:T.grnL,fontSize:12.5,color:T.grn,fontWeight:600,display:"flex",alignItems:"center",gap:6,height:36,boxSizing:"border-box"}}>
                  <span style={{fontSize:11,opacity:.7}}>🔒</span>
                  <span>{autoProjectName}</span>
                  <span style={{fontSize:10,fontWeight:500,color:T.grn,opacity:.7,marginLeft:"auto"}}>from MR</span>
                </div>
              : <SearchSelect value={form.projectId}
                  options={(dbProjects.length>0?dbProjects:[]).map(p=>({key:String(p.id),label:p.name}))}
                  onChange={handleProjectChange} placeholder="Select project..."/>
            }
          </Fld>
        </div>

        {/* ── Section 2: Delivery Site + Expected Delivery ───────── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <Fld label={<>Delivery Site <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500,marginLeft:4}}>(auto-filled)</span></>}>
            <Inp value={form.deliverySite} onChange={e=>upd("deliverySite",e.target.value)} placeholder="Delivery site name"/>
          </Fld>
          <Fld label="Expected Delivery">
            <Inp type="date" value={form.delivery} onChange={e=>upd("delivery",e.target.value)}/>
          </Fld>
        </div>

        {/* ── Section 3: Items ──────────────────────────────────────── */}
        <div style={{padding:"11px 13px",background:T.surfaceB,borderRadius:9,border:`1px solid ${T.b1}`,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".5px"}}>Items</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:1}}>Material library se pick karein · unit auto-locked</div>
            </div>
            <button onClick={()=>{ setShowAddMat(s=>!s); if(!showAddMat) setNewMat({name:"",unit:"",hsn:""}); }}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:showAddMat?T.purL:T.purL,border:`1.5px solid ${T.purM}`,color:T.pur,fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.purM+"66"}
              onMouseLeave={e=>e.currentTarget.style.background=T.purL}>
              <IcAdd size={12} color={T.pur}/> {showAddMat?"Cancel":"Add new material to Library"}
            </button>
          </div>

          {/* Inline Add-new-material form */}
          {showAddMat&&(
            <div style={{padding:"11px 12px",background:T.purL,border:`1.5px solid ${T.purM}`,borderRadius:8,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:8,letterSpacing:".3px"}}>🆕 Add new material to Library</div>
              <div style={{display:"grid",gridTemplateColumns:"2.5fr 90px 110px auto",gap:7,alignItems:"center"}}>
                <input value={newMat.name} onChange={e=>setNewMat(p=>({...p,name:e.target.value}))} placeholder="Material name *" autoFocus
                  style={{padding:"7px 10px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                <select value={newMat.unit} onChange={e=>setNewMat(p=>({...p,unit:e.target.value}))}
                  style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
                  <option value="">Unit</option>
                  {UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
                <input value={newMat.hsn} onChange={e=>setNewMat(p=>({...p,hsn:e.target.value}))} placeholder="HSN (optional)"
                  style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                <button onClick={saveNewMaterial} disabled={!newMat.name.trim()||savingMat}
                  style={{padding:"7px 14px",borderRadius:6,background:newMat.name.trim()?T.pur:T.b1,color:newMat.name.trim()?"white":T.t4,border:"none",fontSize:12,fontWeight:700,cursor:newMat.name.trim()?"pointer":"not-allowed",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                  {savingMat?"...":"Save"}
                </button>
              </div>
              <div style={{fontSize:10,color:T.pur,marginTop:6,opacity:.75}}>Save par item rows me bhi available hoga.</div>
            </div>
          )}

          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"2.2fr 80px 70px 80px 80px 90px 28px",gap:7,padding:"6px 8px",background:T.sb,borderRadius:6,marginBottom:5}}>
            {["Material (Library)","HSN","Qty","Unit","Rate ₹","Amount",""].map((h,i)=>(
              <span key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:".4px",textAlign:i>=2&&i<=5?"left":"left"}}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {form.items.map((it,i)=>{
            const lib = matLib.find(m=>(m.name||"").trim().toLowerCase()===(it.desc||"").trim().toLowerCase());
            const isLocked = !!it.desc;
            const u = lib?.unit || it.unit || "—";
            const lineAmt = (Number(it.qty)||0)*(Number(it.rate)||0);
            return (
              <div key={i} style={{display:"grid",gridTemplateColumns:"2.2fr 80px 70px 80px 80px 90px 28px",gap:7,padding:"6px 8px",alignItems:"center",borderBottom:i<form.items.length-1?`1px dashed ${T.b1}`:"none"}}>
                <LibrarySelect type="material" value={it.desc}
                  inputRef={el=>{ if(el) matRefs.current[i]=el; }}
                  onChange={v=>updItem(i,"desc",v||"")}
                  placeholder="Pick material..."
                  compact hideAddNew/>
                <input value={it.hsn} onChange={e=>updItem(i,"hsn",e.target.value)} placeholder="HSN"
                  style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                <input type="number" value={it.qty} onChange={e=>updItem(i,"qty",e.target.value)} placeholder="Qty"
                  style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                {isLocked
                  ? <div title="Unit Material Library se aata hai — change karne ke liye Library → Materials me edit karein"
                      style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surfaceB,fontFamily:"inherit",fontWeight:700,display:"flex",alignItems:"center",gap:5,justifyContent:"center",cursor:"not-allowed",boxSizing:"border-box"}}>
                      <span style={{fontSize:9,opacity:.55}}>🔒</span>{u}
                    </div>
                  : <SearchSelect value={it.unit} options={UNITS} compact onChange={v=>updItem(i,"unit",v)} placeholder="Unit"/>
                }
                <input type="number" value={it.rate} onChange={e=>updItem(i,"rate",e.target.value)} placeholder="Rate"
                  style={{padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                <div style={{padding:"7px 9px",borderRadius:6,background:lineAmt>0?T.bluL:"transparent",fontSize:12,fontWeight:700,color:lineAmt>0?T.blu:T.t4,textAlign:"right",fontFamily:"inherit",boxSizing:"border-box"}}>
                  {lineAmt>0?`₹${lineAmt.toLocaleString("en-IN")}`:"—"}
                </div>
                <button onClick={()=>removeItem(i)} disabled={form.items.length===1}
                  title={form.items.length===1?"At least one item required":"Remove row"}
                  style={{width:26,height:26,borderRadius:6,background:form.items.length===1?"transparent":T.redL,border:`1px solid ${form.items.length===1?T.b1:T.redM}`,cursor:form.items.length===1?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:form.items.length===1?.4:1}}>
                  <IcX size={12} color={T.red}/>
                </button>
              </div>
            );
          })}

          {/* Add row — below items list, full-width tab-friendly */}
          <button onClick={addItem}
            style={{marginTop:9,width:"100%",padding:"9px 12px",borderRadius:7,background:"transparent",border:`1.5px dashed ${T.bluM}`,color:T.blu,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .12s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.borderStyle="solid";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderStyle="dashed";}}>
            <IcAdd size={13} color={T.blu}/> Add row
          </button>
        </div>

        {/* ── Total chip ─────────────────────────────────────────── */}
        {total>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:`linear-gradient(90deg, ${T.bluL} 0%, ${T.surface} 100%)`,borderRadius:9,border:`1.5px solid ${T.bluM}`,marginBottom:12}}>
            <div>
              <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>PO Total</div>
              <div style={{fontSize:10.5,color:T.t3,marginTop:1}}>{form.items.filter(it=>Number(it.qty)>0&&Number(it.rate)>0).length} items priced</div>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:T.blu,letterSpacing:"-0.3px"}}>
              ₹{total.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* ── Section 4: Notes ─────────────────────────────────────── */}
        <Fld label={<>Notes <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500,marginLeft:4}}>(optional)</span></>}>
          <textarea value={form.notes} onChange={e=>upd("notes",e.target.value)} rows={2}
            placeholder="Special instructions, delivery preferences..."
            style={{width:"100%",padding:"9px 11px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.45}}
            onFocus={e=>e.target.style.borderColor=T.blu}
            onBlur={e=>e.target.style.borderColor=T.b1}/>
        </Fld>
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={async()=>{
          if(!form.vendor||!form.project)return;
          // Hard guard — prevents double-fire even before re-render
          if(submittingRef.current) return;
          submittingRef.current = true;
          setSubmitting(true);
          const newPO={
            id: isEdit ? editPo.id : "PO-new",
            editPoId: isEdit ? editPo.id : null,
            date:"Today",
            vendor:form.vendor,
            project:form.project,
            projectId:form.projectId,
            deliverySite:form.deliverySite||form.project,
            poStatus:"Open",approval:"Draft",amount:total,
            items:form.items.filter(it=>it.desc).map(it=>({
              desc:it.desc,hsn:it.hsn||"—",
              qty:Number(it.qty)||0,unit:it.unit,
              rate:Number(it.rate)||0,
              amount:(Number(it.qty)||0)*(Number(it.rate)||0)
            })),
            linkedMR:"—",delivery:form.delivery||"TBD",
            notes:form.notes||"",
          };
          try { await onSave(newPO); }
          finally { submittingRef.current = false; setSubmitting(false); }
        }} disabled={!form.vendor||!form.project||submitting} color={T.blu} full icon={<IcPO size={14} color="white"/>}>{submitting?(isEdit?"Saving…":"Creating…"):(isEdit?"💾 Save & Resubmit":"Create PO (Draft)")}</Btn>
      </MFoot>
    </Modal>
  );
}

// ── SHARE MODAL ───────────────────────────────────────────────────────
// ── SEND TO VENDOR MODAL ─────────────────────────────────────────────
// PO ko vendor tak bhejne ke options (PDF / WhatsApp / Email / Copy)
// Confirm karne par PO order_status='Ordered' ban jata hai
function SendToVendorModal({po,onClose,onSent}){
  const [copied,setCopied]=useState(false);
  const [sending,setSending]=useState(false);
  const [sentVia,setSentVia]=useState(null);
  const sendingRef = useRef(false);
  // Public PO link (vendor view)
  const baseUrl = (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
    ? "http://localhost:3000" : "https://gbuildcon.in";
  const poLink = `${baseUrl}/po-view/${po.id}`;
  const itemSummary = (po.items||[]).map(it=>`${it.desc||"Item"} - ${it.qty}${it.unit?` ${it.unit}`:""} @ ₹${it.rate}`).join("\n");
  const waMsg = `*Purchase Order ${po.poNum||"PO-"+po.id}*\nFrom: GB Buildcon\nProject: ${po.project}\nDelivery: ${po.deliverySite||po.project}\nExp Date: ${po.delivery||"TBD"}\n\nItems:\n${itemSummary}\n\nTotal: ₹${(po.amount||0).toLocaleString("en-IN")}\n\nView/confirm: ${poLink}`;
  const emailSubj = `Purchase Order ${po.poNum||"PO-"+po.id} — GB Buildcon`;
  const emailBody = waMsg.replace(/\*/g,"");

  const open = (url, via) => { window.open(url, "_blank", "noopener"); setSentVia(via); };
  const copyLink = () => { navigator.clipboard?.writeText(poLink); setCopied(true); setSentVia("copy_link"); setTimeout(()=>setCopied(false),1800); };

  const markSent = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const r = await api.patch(`/procurement/pos/${po.id}/mark-ordered`, { sent_via: sentVia || "manual" });
      if (r.success) { onSent?.(); onClose(); }
      else alert(r.message || "Mark as sent failed");
    } catch(e) { alert(e.message); }
    sendingRef.current = false;
    setSending(false);
  };

  const channels = [
    {label:"WhatsApp",  via:"whatsapp", c:"#25D366", bg:"#E8FDF1", Icon:IcWA,
      action:()=>open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`,"whatsapp")},
    {label:"Email",     via:"email",    c:T.blu, bg:T.bluL, Icon:IcMail,
      action:()=>open(`mailto:?subject=${encodeURIComponent(emailSubj)}&body=${encodeURIComponent(emailBody)}`,"email")},
    {label:"Print/PDF", via:"pdf",      c:T.pur, bg:T.purL, Icon:IcShare,
      action:()=>{ window.print(); setSentVia("pdf"); }},
    {label:copied?"Copied!":"Copy Link", via:"copy_link", c:T.slt, bg:T.sltL, Icon:IcCopy, action:copyLink},
  ];

  return(
    <Modal onClose={onClose} width={460}>
      <MHead title="Send PO to Vendor" sub={`${po.poNum||"PO-"+po.id} · ${po.vendor||"Vendor"}`} onClose={onClose}/>
      <MBody>
        <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,padding:"9px 12px",marginBottom:12,fontSize:11.5,color:T.blu,lineHeight:1.5}}>
          PO ko WhatsApp / Email / PDF se vendor tak bhejo. Send hone ke baad <b>"Mark as Sent"</b> click karo — PO Order Stage me chala jaayega aur GRN record kar sakte ho.
        </div>
        {/* PO summary card */}
        <div style={{background:T.surfaceB,border:`1px solid ${T.b1}`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
          <div style={{fontSize:11,color:T.t4,fontWeight:600,marginBottom:3}}>VENDOR</div>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:8}}>{po.vendor||"—"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
            <div><span style={{color:T.t4}}>Items: </span><b style={{color:T.t1}}>{(po.items||[]).length}</b></div>
            <div><span style={{color:T.t4}}>Total: </span><b style={{color:T.t1}}>₹{(po.amount||0).toLocaleString("en-IN")}</b></div>
            <div style={{gridColumn:"1 / 3"}}><span style={{color:T.t4}}>Delivery: </span><b style={{color:T.t1}}>{po.deliverySite}</b> · <span style={{color:T.t4}}>by</span> <b style={{color:T.t1}}>{po.delivery||"TBD"}</b></div>
          </div>
        </div>
        {/* Channel buttons */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          {channels.map((c,i)=>{
            const isSelected = sentVia===c.via;
            return(
              <button key={i} onClick={c.action}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 12px",borderRadius:7,background:isSelected?c.c:c.bg,border:`1.5px solid ${c.c}`,color:isSelected?"white":c.c,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <c.Icon size={13} color={isSelected?"white":c.c}/> {c.label}
              </button>
            );
          })}
        </div>
        {sentVia&&(
          <div style={{padding:"7px 11px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:6,fontSize:11.5,color:T.grn,marginBottom:10}}>
            ✓ Sent via <b>{channels.find(c=>c.via===sentVia)?.label}</b> — ab "Mark as Sent" click karo
          </div>
        )}
      </MBody>
      <MFoot>
        <Btn onClick={onClose} outline color={T.slt} full>Cancel</Btn>
        <Btn onClick={markSent} disabled={sending} color={T.grn} full icon={<IcApprv size={14} color="white"/>}>
          {sending?"Marking…":"Mark as Sent → Order Stage"}
        </Btn>
      </MFoot>
    </Modal>
  );
}

function ShareModal({rfq,onClose}){
  const [copied,setCopied]=useState(null);
  const fakeLink=`https://gbuildcon.in/rfq/${rfq.id}?token=xK9mP`;
  return(
    <Modal onClose={onClose} width={440}>
      <MHead title="Share Vendor Link" sub={`${rfq.id} · ${rfq.project}`} onClose={onClose}/>
      <MBody>
        <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,padding:"9px 12px",marginBottom:14,fontSize:11.5,color:T.blu}}>Each vendor gets a unique link. No login required.</div>
        {rfq.vendors.length===0&&<div style={{fontSize:12,color:T.t4,textAlign:"center",padding:"20px"}}>No vendors added yet.</div>}
        {rfq.vendors.map((v,i)=>(
          <div key={i} style={{background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`,marginBottom:8,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{v.name}</span>
              <Pill label={v.status} c={v.status==="Submitted"?T.grn:T.amb} bg={v.status==="Submitted"?T.grnL:T.ambL} brd={v.status==="Submitted"?T.grnM:T.ambM}/>
            </div>
            <div style={{fontSize:10.5,color:T.t4,background:T.surface,borderRadius:5,padding:"6px 9px",fontFamily:"monospace",marginBottom:8,wordBreak:"break-all"}}>{fakeLink}&v={i+1}</div>
            <div style={{display:"flex",gap:6}}>
              {[{Icon:IcWA,label:"WhatsApp",c:"#25D366",bg:"#E8FDF1"},{Icon:IcMail,label:"Email",c:T.blu,bg:T.bluL},{Icon:IcSMS,label:"SMS",c:T.pur,bg:T.purL},{Icon:IcCopy,label:copied===i?"Copied!":"Copy",c:T.slt,bg:T.sltL}].map((btn,j)=>(
                <button key={j} onClick={()=>setCopied(i)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,background:btn.bg,border:`1px solid ${btn.c}22`,color:btn.c,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                  <btn.Icon size={12} color="currentColor"/> {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Btn onClick={onClose} color={T.blu} full>Done</Btn>
      </MBody>
    </Modal>
  );
}

// ── MAIN MODULE ───────────────────────────────────────────────────────
function ProcurementModule(){
  const [tab,setTab]=useState("mr");
  const [pos,setPOs]=useState([]);
  const [rfqs,setRFQs]=useState([]);
  const [mrs,setMRs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState("");

  // ── Map backend fields to frontend shape ──────────────────────
  const fmtDate=d=>{try{return d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—"}catch{return d||"—"}};
  const mapMR=m=>({
    // Keep all backend snake_case fields available too — needed by MRDetailDrawer
    ...m,
    id:m.id, mrNum:m.mr_number,
    date:fmtDate(m.created_at),
    project:m.project_name||"—", site:m.project_name||"—",
    project_id:m.project_id||null,
    item:m.item_name, qty:parseFloat(m.quantity)||0, approvedQty:parseFloat(m.quantity)||0,
    unit:m.unit, requestedBy:m.requested_by||"—",
    mrStatus:m.mr_status, matStatus:m.mat_status, stage:m.stage||"Requested",
    // Vendor display priority:
    //   1. PO vendor (when MR is linked to a vendor PO — most accurate)
    //   2. linked_vendor (legacy column, set on some Direct-PO flows)
    //   3. "Warehouse" — only when warehouse_mr_id IS set AND no PO is
    //      linked (i.e. fulfilled from warehouse stock, not via vendor)
    //   4. null → "—"
    // Note: when a warehouse PR is sent to procurement and procurement
    // places a PO with a vendor, BOTH warehouse_mr_id and po_id are set.
    // In that case we want the PO vendor, NOT "Warehouse".
    vendor: m.po_vendor_name
            || m.linked_vendor
            || (m.warehouse_mr_id && !m.po_id ? "Warehouse" : null),
    isFromWarehouse: !!m.warehouse_mr_id && !m.po_id,
    // True when the MR was *originated* by the warehouse team to restock
    // their own stock (project_id NULL + warehouse_mr_id set). The bulk-
    // order modal must NOT suggest "Issue from Warehouse" for these —
    // warehouse asked for the stock, can't fulfill itself.
    isWarehouseRestock: (!m.project_id && !!m.warehouse_mr_id)
      || (m.project_name === "Warehouse (internal)"),
    expectedDelivery: m.po_expected_delivery
            ? fmtDate(m.po_expected_delivery)
            : (m.expected_delivery ? fmtDate(m.expected_delivery) : null),
    etaRaw: m.po_expected_delivery
            ? String(m.po_expected_delivery).split("T")[0]
            : (m.expected_delivery ? String(m.expected_delivery).split("T")[0] : null),
    challan:m.challan_no||null, rejectedReason:m.rejected_reason||null, closed_reason:m.closed_reason||null,
    receivedQty:parseFloat(m.received_qty)||null, inStock:0, approxAmount:m.approx_amount||0,
  });
  const mapPO=p=>({
    id:p.id, poNum:p.po_number,
    date:fmtDate(p.created_at),
    vendor:p.vendor_name||"—", project:p.project_name||"—",
    project_id:p.project_id||null,
    deliverySite:p.delivery_site||p.project_name||"—",
    poStatus:p.po_status, approval:p.approval_status,
    orderStatus:p.order_status||"NotOrdered",
    sentAt:p.sent_to_vendor_at||null,
    sentVia:p.sent_via||null,
    reviewNote:p.review_note||null,
    reviewedBy:p.reviewed_by||null,
    amount:parseFloat(p.total_amount)||0,
    delivery:p.expected_delivery?fmtDate(p.expected_delivery):"—",
    deliveryRaw:p.expected_delivery?String(p.expected_delivery).split("T")[0]:"",
    linked_mr_ids:p.linked_mr_ids?JSON.parse(p.linked_mr_ids||"[]"):[],
    items:(p.items||[]).map(it=>({
      id:it.id, desc:it.description, hsn:it.hsn_code||"—",
      qty:parseFloat(it.quantity)||0, unit:it.unit,
      rate:parseFloat(it.rate)||0,
      amount:(parseFloat(it.quantity)||0)*(parseFloat(it.rate)||0),
      receivedQty:parseFloat(it.received_qty)||0,
      // Per-line project info for multi-site POs (added in po_items migration)
      project_id:    it.project_id   || null,
      project_name:  it.project_name || "",
      delivery_site: it.delivery_site|| "",
      linked_mr_id:  it.linked_mr_id || null,
    })),
  });
  const mapRFQ=r=>({
    id:r.id, rfqNum:r.rfq_number,
    date:r.created_at?new Date(r.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"—",
    project:r.project_name||"—", status:r.status,
    bidEnd:r.bid_end_date?new Date(r.bid_end_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}):"—",
    locked:r.locked_vendor||null,
    items:(r.items||[]).map(it=>({desc:it.description,hsn:it.hsn_code||"",qty:parseFloat(it.quantity)||0,unit:it.unit,deliveryDate:"—"})),
    vendors:(r.vendors||[]).map(v=>({name:v.vendor_name,status:v.status,rates:(v.rates||[]).map(rt=>({rate:rt.rate,remarks:rt.remarks||""}))})),
  });

  // Vendors from backend (for dropdowns).
  // Case-insensitive substring match — DB has mixed-case types like
  // "Supplier", "supplier", "Material Supplier", "Other Vendor", "vendor",
  // "Labour Vendor". The earlier strict whitelist missed all the
  // common "Supplier" / "Vendor" variants, leaving only EqVendor rows
  // visible in the manual-order dropdown.
  const [dbVendors, setDbVendors] = useState([]);
  useEffect(()=>{
    api.get("/finance/parties").then(res=>{
      if(res.success&&res.data){
        const isVendorType = (p) => {
          // Multi-role aware: check the roles field (comma-separated
          // canonical keys) first, then fall back to legacy `type`.
          // A party that is ALSO a material vendor shows here even if its
          // primary type is something else.
          const roleStr = String(p?.roles || "").toLowerCase();
          if (roleStr) {
            if (/(^|,)\s*(material_vendor|transporter)\s*(,|$)/.test(roleStr)) return true;
          }
          const t = String(p?.type || "").toLowerCase().trim();
          if (!t) return false;
          if (t === "client" || t === "staff" || t.includes("sub-con") || t.includes("subcon")) return false;
          return t.includes("vendor") || t.includes("supplier");
        };
        const vendors = res.data.filter(isVendorType);
        // If filter still returns empty (very edge case), fall back to
        // all non-client / non-staff rows rather than the entire list
        // — keeps the dropdown useful but not polluted.
        const fallback = res.data.filter(p => {
          const t = String(p?.type || "").toLowerCase().trim();
          return t !== "client" && t !== "staff";
        });
        setDbVendors(vendors.length > 0 ? vendors : fallback);
      }
    }).catch(()=>{});
  },[]);

  // ── Load all data from backend ─────────────────────────────────
  const loadAll=async()=>{
    setLoading(true); setApiError("");
    try{
      const [mRes,pRes,rRes]=await Promise.all([
        api.get("/procurement/mrs"),
        api.get("/procurement/pos"),
        api.get("/procurement/rfqs"),
      ]);
      if(mRes.success)setMRs(mRes.data.map(mapMR));
      if(pRes.success)setPOs(pRes.data.map(mapPO));
      if(rRes.success)setRFQs(rRes.data.map(mapRFQ));
    }catch(e){setApiError("Load failed: "+e.message);}
    finally{setLoading(false);}
  };
  // Projects from API (for dropdowns)
  const [dbProjects, setDbProjects] = useState([]);
  const projLoaded = useRef(false);
  useEffect(()=>{
    if(!projLoaded.current){
      projLoaded.current=true;
      api.get("/projects").then(res=>{ if(res.success&&res.data) setDbProjects(res.data); }).catch(()=>{});
    }
  });

  // Load on mount
  const didLoad = useRef(false);
  useEffect(()=>{
    if(!didLoad.current){ didLoad.current=true; loadAll(); }
  });

  // PO state
  const [poSearch,setPoSearch]=useState("");
  const [poStatusF,setPoStatusF]=useState("All");
  const [poApprovalF,setPoApprovalF]=useState("All");
  const [selPO,setSelPO]=useState(null);
  const [shareTarget,setShareTarget]=useState(null);
  const [sendToVendorTarget,setSendToVendorTarget]=useState(null);
  const [grnTarget,setGrnTarget]=useState(null);
  const [showCreatePO,setShowCreatePO]=useState(false);
  const [createPOPrefill,setCreatePOPrefill]=useState(null);
  const [editPo,setEditPo]=useState(null);

  // RFQ state
  const [selRFQ,setSelRFQ]=useState(null);
  const [punchTarget,setPunchTarget]=useState(null);
  const [punchVendorIdx,setPunchVendorIdx]=useState(null);

  // MR state
  const [mrTab,setMrTab]=useState("Pending");
  const [selMR,setSelMR]=useState(null);     // clicked MR for detail drawer
  const [mrProject,setMrProject]=useState("All");
  const [mrMaterial,setMrMaterial]=useState("All");
  const [mrSearch,setMrSearch]=useState("");
  const [selected,setSelected]=useState({});        // {mrId: bool}
  const [approveTgt,setApproveTgt]=useState(null);
  const [rejectTgt,setRejectTgt]=useState(null);
  const [markRecvTgt,setMarkRecvTgt]=useState(null);
  const [rowMenu,setRowMenu]=useState(null);   // ordered-row 3-dot menu open id
  const [showBulkOrder,setShowBulkOrder]=useState(false);
  const [etaChip,setEtaChip]=useState("All");   // Ordered-tab delivery-followup filter

  // ETA bucket in days from today: <0 overdue, 0 today, >0 upcoming, null if no ETA.
  const _etaDays=(raw)=>{ if(!raw) return null; const d=new Date(raw); if(isNaN(d.getTime())) return null; d.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return Math.round((d-t)/86400000); };
  const _etaMatch=(raw,chip)=>{ const dd=_etaDays(raw);
    if(chip==="Overdue") return dd!=null&&dd<0;
    if(chip==="Today")   return dd===0;
    if(chip==="3d")      return dd!=null&&dd>=0&&dd<=3;
    if(chip==="7d")      return dd!=null&&dd>=0&&dd<=7;
    return true; };

  // ── Counts ── (Closed MRs are excluded from all active tabs)
  const isClosed = m => m.mrStatus === "Closed";
  const mrTabCounts={
    Pending: mrs.filter(m=>!isClosed(m) && m.mrStatus==="Pending").length,
    Approved:mrs.filter(m=>!isClosed(m) && m.mrStatus==="Approved"&&m.matStatus==="Pending").length,
    Ordered: mrs.filter(m=>!isClosed(m) && m.matStatus==="Ordered").length,
    Received:mrs.filter(m=>!isClosed(m) && (m.matStatus==="Received"||m.matStatus==="PartialReceived")).length,
    Rejected:mrs.filter(m=>!isClosed(m) && m.mrStatus==="Rejected").length,
    Closed:  mrs.filter(isClosed).length,
  };
  const pendingMRs=mrTabCounts.Approved;

  // ── Filtered MRs ──
  const filteredMRs=mrs.filter(m=>{
    // Closed MRs only show in the Closed tab; everywhere else they're hidden
    if(mrTab!=="Closed" && isClosed(m)) return false;
    if(mrTab==="Closed"   &&!isClosed(m)) return false;
    if(mrTab==="Pending"  &&m.mrStatus!=="Pending") return false;
    if(mrTab==="Approved" &&!(m.mrStatus==="Approved"&&m.matStatus==="Pending")) return false;
    if(mrTab==="Ordered"  &&m.matStatus!=="Ordered") return false;
    if(mrTab==="Received" &&!(m.matStatus==="Received"||m.matStatus==="PartialReceived")) return false;
    if(mrTab==="Rejected" &&m.mrStatus!=="Rejected") return false;
    if(mrProject!=="All"){
      // Match by id (string) or by name
      const matchById = dbProjects.length>0 && m.project_id && String(m.project_id)===mrProject;
      const matchByName = m.project===mrProject;
      if(!matchById&&!matchByName) return false;
    }
    if(mrMaterial!=="All" && (m.item||"").trim().toLowerCase()!==mrMaterial.toLowerCase()) return false;
    if(mrTab==="Ordered" && etaChip!=="All" && !_etaMatch(m.etaRaw,etaChip)) return false;
    if(mrSearch){
      const q = mrSearch.toLowerCase();
      const hay = `${m.item||""} ${m.project||""} ${m.id||""} ${m.requestedBy||""}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  // Distinct material names from currently visible tab (for the Material filter dropdown)
  const materialOptions = Array.from(new Set(
    mrs
      .filter(m=>{
        if(mrTab!=="Closed" && m.mrStatus==="Closed") return false;
        if(mrTab==="Closed"   &&m.mrStatus!=="Closed") return false;
        if(mrTab==="Pending"  &&m.mrStatus!=="Pending") return false;
        if(mrTab==="Approved" &&!(m.mrStatus==="Approved"&&m.matStatus==="Pending")) return false;
        if(mrTab==="Ordered"  &&m.matStatus!=="Ordered") return false;
        if(mrTab==="Received" &&!(m.matStatus==="Received"||m.matStatus==="PartialReceived")) return false;
        if(mrTab==="Rejected" &&m.mrStatus!=="Rejected") return false;
        return true;
      })
      .map(m=>(m.item||"").trim()).filter(Boolean)
  )).sort();

  // Group by project for approved tab
  const groupedMRs=filteredMRs.reduce((acc,m)=>{
    const key=m.project;
    if(!acc[key])acc[key]=[];
    acc[key].push(m);
    return acc;
  },{});

  const selectedItems=Object.entries(selected).filter(([,v])=>v).map(([id])=>mrs.find(m=>String(m.id)===String(id))).filter(Boolean);

  // ── Actions — API connected ──────────────────────────────────
  const approvePO=async(id)=>{
    const res = await api.patch("/procurement/pos/"+id+"/approve",{approved_by:"Admin"});
    if(res.success){
      // Update PO to Approved on frontend
      setPOs(p=>p.map(x=>x.id===id?{...x,approval:"Approved"}:x));
      // Now fetch fresh MR list — backend already updated linked MRs to Ordered
      const mRes = await api.get("/procurement/mrs");
      if(mRes.success) setMRs(mRes.data.map(mapMR));
    }
  };
  const resubmitPO=async(po)=>{
    if(!await window.confirmAsync(`PO ${po.poNum} ko revise karke fir approval ke liye bhejein?`)) return;
    const res = await api.patch("/procurement/pos/"+po.id+"/resubmit",{});
    if(res.success){
      setPOs(p=>p.map(x=>x.id===po.id?{...x,approval:"Draft",reviewNote:null,reviewedBy:null}:x));
      // Re-create centralized approval entry so admin sees it again
      try{
        await api.post("/approvals/submit",{
          module:"Purchase Order",
          ref_id:po.id,
          ref_no:po.poNum||"",
          title:po.vendor+" - "+(po.items||[]).length+" items (revised)",
          amount:po.amount||0,
          project_id:po.project_id||null,
          project_name:po.project||"",
        });
      }catch(_){}
    } else {
      alert(res.message||"Resubmit failed");
    }
  };
  const lockRFQ=async(rfqId,vendorName)=>{
    await api.patch("/procurement/rfqs/"+rfqId+"/lock",{vendor_name:vendorName});
    setRFQs(p=>p.map(r=>r.id===rfqId?{...r,locked:vendorName}:r));
  };
  const publishRFQ=async(rfqId)=>{
    await api.patch("/procurement/rfqs/"+rfqId+"/publish",{});
    setRFQs(p=>p.map(r=>r.id===rfqId?{...r,status:"Published"}:r));
  };
  const savePunch=async(rfqId,vi,rates)=>{
    const rfq=rfqs.find(r=>r.id===rfqId);
    const vendor=rfq?.vendors[vi];
    if(vendor){
      const items=rfq.items.map((it,i)=>({rfq_item_id:i+1,rate:Number(rates[i]?.rate)||null,remarks:rates[i]?.remark||""}));
      await api.post("/procurement/rfqs/"+rfqId+"/punch-quote",{vendor_name:vendor.name,rates:items});
    }
    setRFQs(prev=>prev.map(r=>{if(r.id!==rfqId)return r;const nv=[...r.vendors];nv[vi]={...nv[vi],status:"Submitted",rates:rates.map(rt=>({rate:Number(rt.rate)||null,remarks:rt.remark}))};return{...r,vendors:nv};}));
    setPunchTarget(null);setPunchVendorIdx(null);
  };
  const saveApproveMR=async(id,qty,note)=>{
    await api.patch("/procurement/mrs/"+id+"/approve",{action:"Approved",approved_qty:qty});
    setMRs(p=>p.map(m=>m.id===id?{...m,mrStatus:"Approved",approvedQty:qty}:m));
    setApproveTgt(null);
    setMrTab("Approved");
  };
  const saveRejectMR=async(id,reason)=>{
    await api.patch("/procurement/mrs/"+id+"/approve",{action:"Rejected",rejected_reason:reason});
    setMRs(p=>p.map(m=>m.id===id?{...m,mrStatus:"Rejected",rejectedReason:reason}:m));
    setRejectTgt(null);
  };
  const saveMarkReceived=async(id,rQty,challan)=>{
    const res=await api.patch("/procurement/mrs/"+id+"/mark-received",{challan_no:challan,received_qty:rQty});
    const newStatus=res.is_partial?"PartialReceived":"Received";
    setMRs(p=>p.map(m=>m.id===id?{...m,matStatus:newStatus,receivedQty:rQty,challan}:m));
    setMarkRecvTgt(null);
    setMrTab("Received");
  };
  // Close an ordered MR with a reason → moves to the Closed tab.
  const closeMR=async(m)=>{
    setRowMenu(null);
    const reason=await window.promptAsync(`Close ${m.id} — ${m.item}?\n\nKis reason se order cancel kar rahe ho? (compulsory)`);
    if(reason===null) return;
    if(!reason.trim()){ window.alert("Reason zaroori hai"); return; }
    try{
      const r=await api.put("/procurement/mrs/"+m.id,{mr_status:"Closed",closed_reason:reason.trim()});
      if(r?.success===false){ window.alert(r.message||"Close failed"); return; }
      setMRs(p=>p.map(x=>x.id===m.id?{...x,mrStatus:"Closed",closed_reason:reason.trim()}:x));
    }catch(e){ window.alert(e?.message||"Network error"); }
  };
  const saveGRN=async(poId,challan,rows,vendorOverride)=>{
    const po=pos.find(p=>p.id===poId);
    const vendor = (vendorOverride && vendorOverride.trim()) || po?.vendor || "";
    if(!vendor){alert("Vendor name compulsory hai");return;}
    try{
      const grnPayload={
        po_id:       poId,
        vendor_name: vendor,
        project_id:  po?.project_id|| po?._raw?.project_id || null,
        project_name:po?.project   || "",
        challan_no:  challan,
        received_date: new Date().toISOString().split("T")[0],
        items: rows.map((r,i)=>({
          po_item_id:   po?.items?.[i]?.id       || null,
          description:  r.desc || po?.items?.[i]?.desc || r.material || ("Item "+(i+1)),
          ordered_qty:  po?.items?.[i]?.qty      || parseFloat(r.qty)||0,
          received_qty: parseFloat(r.qty)        || 0,
          unit:         r.unit || po?.items?.[i]?.unit || "",
        })).filter(it=>it.received_qty>0),
      };
      const res = await api.post("/procurement/grns", grnPayload);
      if(!res.success) { alert("GRN save failed: "+(res.message||"Unknown error")); return; }
      const isPartial=rows.some((r,i)=>parseFloat(r.qty)<(po?.items?.[i]?.qty||0));
      if(!isPartial) setPOs(p=>p.map(x=>x.id===poId?{...x,poStatus:"Closed"}:x));
    }catch(e){ alert("GRN error: "+e.message); return; }
    setGrnTarget(null);
  };
  const saveBulkOrder=async(medium,vendor,delivery,items)=>{
    if(medium==="manual"){
      await Promise.all(items.map(m=>api.patch("/procurement/mrs/"+m.id+"/mark-ordered",{vendor,expected_delivery:delivery,order_type:"Manual"})));
      setMRs(p=>p.map(m=>items.find(i=>i.id===m.id)?{...m,matStatus:"Ordered",vendor,expectedDelivery:delivery}:m));
      setMrTab("Ordered");
    } else if(medium==="po"){
      setCreatePOPrefill(items);
      setShowCreatePO(true);
    }
    setSelected({});
    setShowBulkOrder(false);
  };
  const toggleSelect=(id)=>setSelected(p=>({...p,[String(id)]:!p[String(id)]}));
  const toggleSelectAll=()=>{
    const allSelected=filteredMRs.every(m=>selected[m.id]);
    const next={};
    if(!allSelected)filteredMRs.forEach(m=>next[m.id]=true);
    setSelected(next);
  };

  const filteredPOs=pos.filter(p=>{
    if(poSearch&&!p.id.toLowerCase().includes(poSearch.toLowerCase())&&!p.vendor.toLowerCase().includes(poSearch.toLowerCase())&&!p.project.toLowerCase().includes(poSearch.toLowerCase()))return false;
    if(poStatusF!=="All"&&p.poStatus!==poStatusF)return false;
    if(poApprovalF!=="All"&&p.approval!==poApprovalF)return false;
    return true;
  });

  // ── Stat tiles ──
  const TILES={
    mr:[
      {l:"Pending Approval",v:mrTabCounts.Pending,sub:"Awaiting admin",c:T.amb},
      {l:"Ready to Order",  v:mrTabCounts.Approved,sub:"Approved MRs",c:T.blu},
      {l:"In Transit",      v:mrTabCounts.Ordered,sub:"Ordered",c:T.pur},
      {l:"Received",        v:mrTabCounts.Received,sub:"At site",c:T.grn},
    ],
    po:[
      {l:"Total POs",    v:pos.length,sub:`${pos.filter(p=>p.poStatus==="Open").length} open`,c:T.blu},
      {l:"Pending Appr.",v:pos.filter(p=>p.approval==="Draft"||p.approval==="Revision").length,sub:"Need sign-off / revise",c:T.amb},
      {l:"PO Value",     v:`₹${fmt(pos.reduce((s,p)=>s+p.amount,0))}`,sub:"Combined",c:T.grn},
      {l:"Open MRs",     v:pendingMRs,sub:"Need ordering",c:T.red},
    ],
    rfq:[
      {l:"Active RFQs",    v:rfqs.filter(r=>r.status==="Published").length,sub:"Live bidding",c:T.blu},
      {l:"Draft RFQs",     v:rfqs.filter(r=>r.status==="Draft").length,sub:"Not published",c:T.slt},
      {l:"Locked Quotes",  v:rfqs.filter(r=>r.locked).length,sub:"Ready for PO",c:T.grn},
      {l:"Pending Response",v:rfqs.flatMap(r=>r.vendors).filter(v=>v.status==="Pending").length,sub:"Awaiting rates",c:T.amb},
    ],
  };
  const curTiles=TILES[tab]||TILES.mr;

  const MAIN_TABS=[
    {id:"mr", label:`Material Requests${pendingMRs>0?` (${pendingMRs})`:""}` },
    {id:"po", label:`Purchase Orders${pos.filter(p=>p.approval==="Draft").length>0?` (${pos.filter(p=>p.approval==="Draft").length})`:""}`},
    {id:"rfq",label:`RFQ${rfqs.filter(r=>r.status==="Published").length>0?` (${rfqs.filter(r=>r.status==="Published").length})`:""}`},
    {id:"transfer",label:"Transfers"},
  ];

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>
      {apiError&&<div style={{margin:"12px 18px",padding:"10px 14px",background:T.redL,border:"1px solid "+T.redM,borderRadius:7,fontSize:12,color:T.red}}>{apiError}</div>}

      {/* Stat tiles — compact single-row strip */}
      <div style={{padding:"10px 18px 6px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {curTiles.map((s,i)=>(
            <div key={i} style={{padding:"8px 12px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,borderLeft:`3px solid ${s.c}`,display:"flex",alignItems:"center",gap:10,minHeight:0}}>
              <div style={{flex:1,minWidth:0,display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap"}}>
                <span style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",whiteSpace:"nowrap"}}>{s.l}</span>
                <span style={{fontSize:17,fontWeight:800,color:T.t1,lineHeight:1,letterSpacing:"-.3px"}}>{s.v}</span>
                <span style={{fontSize:10,color:T.t4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main tab bar */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex"}}>
            {MAIN_TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setSelected({});}}
                style={{padding:"12px 16px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            {tab==="po"&&<button onClick={()=>{setCreatePOPrefill(null);setShowCreatePO(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> Create PO</button>}
            {tab==="rfq"&&<button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:6,background:T.blu,color:"white",fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer"}}><IcAdd size={13} color="white"/> New RFQ</button>}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",padding:"10px 18px 14px"}}>

        {loading&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,color:T.t4,fontSize:13}}>Loading...</div>}

        {/* ═══════════ MR TAB ═══════════ */}
        {!loading&&tab==="mr"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>

            {/* 5-tab status bar */}
            <div style={{display:"flex",gap:0,marginBottom:10,flexShrink:0,background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
              {Object.entries(MR_TAB_META).map(([key,meta])=>{
                const cnt=mrTabCounts[key];
                const isAct=mrTab===key;
                return(
                  <button key={key} onClick={()=>{setMrTab(key);setSelected({});setEtaChip("All");}}
                    style={{flex:1,padding:"10px 8px",border:"none",background:isAct?meta.bg:"none",color:isAct?meta.c:T.t3,fontSize:12,fontWeight:isAct?700:400,cursor:"pointer",borderBottom:isAct?`2px solid ${meta.c}`:"2px solid transparent",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:isAct?meta.c:T.b2,flexShrink:0}}/>
                    {meta.label}
                    {cnt>0&&<span style={{background:isAct?meta.c:T.b1,color:isAct?"white":T.t3,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,minWidth:20,textAlign:"center"}}>{cnt}</span>}
                  </button>
                );
              })}
            </div>

            {/* Filter row — search + Project + Material */}
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8,flexShrink:0,flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:200}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={mrSearch} onChange={e=>setMrSearch(e.target.value)} placeholder="Search material, project, MR# or requester..."
                  style={{width:"100%",height:32,padding:"0 8px 0 30px",borderRadius:6,border:`1.5px solid ${mrSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:mrSearch?T.bluL:T.surface}}/>
              </div>
              <div style={{minWidth:160}}>
                <SearchSelect value={mrProject} compact
                  options={[{key:"All",label:"All Projects"},
                    ...(dbProjects.length>0
                      ?dbProjects.map(p=>({key:String(p.id),label:p.name}))
                      :[...new Set(mrs.map(m=>m.project).filter(Boolean))].map(n=>({key:n,label:n})))]}
                  onChange={v=>setMrProject(v||"All")} placeholder="All Projects"/>
              </div>
              <div style={{minWidth:160}}>
                <SearchSelect value={mrMaterial} compact
                  options={[{key:"All",label:"All Materials"},
                    ...materialOptions.map(n=>({key:n,label:n}))]}
                  onChange={v=>setMrMaterial(v||"All")} placeholder="All Materials"/>
              </div>
              <span style={{fontSize:11,color:T.t4,whiteSpace:"nowrap"}}>{filteredMRs.length} items</span>
              {(mrProject!=="All"||mrMaterial!=="All"||mrSearch)&&(
                <button onClick={()=>{setMrProject("All");setMrMaterial("All");setMrSearch("");}}
                  style={{padding:"5px 10px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,color:T.t3,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  Clear
                </button>
              )}
              {/* Bulk order button */}
              {selectedItems.length>0&&(
                <button onClick={()=>setShowBulkOrder(true)}
                  style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",boxShadow:`0 2px 8px ${T.blu}44`}}>
                  <IcFlow size={13} color="white"/> Order {selectedItems.length} item{selectedItems.length>1?"s":""}
                </button>
              )}
            </div>

            {/* Ordered tab — delivery (ETA) followup chips: Overdue / Today / 3d / 7d */}
            {mrTab==="Ordered"&&(()=>{
              const ordered=mrs.filter(m=>!isClosed(m)&&m.matStatus==="Ordered");
              const cnt=chip=>ordered.filter(m=>_etaMatch(m.etaRaw,chip)).length;
              const chips=[
                {k:"All",     l:"All",         c:T.t3},
                {k:"Overdue", l:"Overdue",     c:T.red},
                {k:"Today",   l:"Today",       c:T.amb},
                {k:"3d",      l:"Next 3 days", c:T.blu},
                {k:"7d",      l:"Next 7 days", c:T.pur},
              ];
              return(
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:10,flexWrap:"wrap",flexShrink:0}}>
                  <span style={{fontSize:10.5,color:T.t4,fontWeight:600,marginRight:2}}>Delivery</span>
                  {chips.map(ch=>{
                    const act=etaChip===ch.k; const n=ch.k==="All"?ordered.length:cnt(ch.k);
                    return(
                      <button key={ch.k} onClick={()=>setEtaChip(ch.k)}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:16,fontSize:11.5,fontWeight:act?700:500,cursor:"pointer",border:`1px solid ${act?ch.c:T.b1}`,background:act?ch.c+"14":T.surface,color:act?ch.c:T.t3,transition:"all .15s"}}>
                        {ch.l}
                        <span style={{fontSize:10,fontWeight:700,minWidth:14,textAlign:"center",color:act?ch.c:T.t4}}>{n}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* MR List — clean like screenshot */}
            <div style={{flex:1,overflowY:"auto",overflowX:"hidden",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>

              {/* Pending tab: simple list with approve/reject */}
              {mrTab==="Pending"&&(
                <>
                  {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcMR size={30} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No pending requests</div></div>}
                  {filteredMRs.map((m,idx)=>(
                    <div key={m.id} style={{display:"grid",gridTemplateColumns:"54px 1fr 110px 130px 110px",padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:12,transition:"background 0.1s",cursor:"pointer"}}
                      onClick={e=>{if(e.target.closest("button,input"))return;setSelMR(m);}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      {/* Left date rail */}
                      <DateRail date={m.date}/>
                      {/* Material + MR# + project */}
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.item}</div>
                        <div style={{fontSize:10.5,color:T.t4,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{m.id}</span>
                          <span>· {m.project}</span>
                          {m.requestedBy&&<span>· {m.requestedBy}</span>}
                        </div>
                      </div>
                      {/* Total */}
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9.5,color:T.t4,fontWeight:600,letterSpacing:".3px",textTransform:"uppercase"}}>Total</div>
                        <div style={{fontSize:15,fontWeight:800,color:T.t1,letterSpacing:"-.3px",lineHeight:1.1}}>{m.qty}<span style={{fontSize:10,color:T.t4,fontWeight:600,marginLeft:3}}>{m.unit}</span></div>
                      </div>
                      {/* Stock pill */}
                      <div style={{textAlign:"center"}}>
                        {m.inStock>0
                          ?<span style={{fontSize:10.5,fontWeight:600,color:T.grn,background:T.grnL,padding:"3px 9px",borderRadius:10,border:`1px solid ${T.grnM}`}}>In Stock: {m.inStock}</span>
                          :<span style={{fontSize:10.5,color:T.t4}}>No stock</span>}
                      </div>
                      <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                        <button onClick={()=>setApproveTgt(m)} title="Approve"
                          style={{width:28,height:28,borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <IcChk size={13} color={T.grn}/>
                        </button>
                        <button onClick={()=>setRejectTgt(m)} title="Reject"
                          style={{width:28,height:28,borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <IcX size={13} color={T.red}/>
                        </button>
                      </div>
                      <div/>
                    </div>
                  ))}
                </>
              )}

              {/* Approved tab: grouped by project, with checkboxes + Create PO button */}
              {mrTab==="Approved"&&(
                <>
                  {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcMR size={30} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No approved MRs pending order</div></div>}
                  {filteredMRs.length>0&&(
                    // Select all header
                    <div style={{display:"flex",alignItems:"center",padding:"9px 14px",borderBottom:`1px solid ${T.b1}`,background:T.surfaceB}}>
                      <input type="checkbox" checked={filteredMRs.length>0&&filteredMRs.every(m=>selected[m.id])} onChange={toggleSelectAll}
                        style={{width:15,height:15,cursor:"pointer",marginRight:10,accentColor:T.blu}}/>
                      <span style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:"0.5px"}}>Select All ({filteredMRs.length} items)</span>
                      {selectedItems.length>0&&<span style={{marginLeft:"auto",fontSize:11,color:T.blu,fontWeight:600}}>{selectedItems.length} selected</span>}
                    </div>
                  )}
                  {/* Grouped by project */}
                  {Object.entries(groupedMRs).map(([project,items])=>(
                    <div key={project}>
                      {/* Project group header — subtle */}
                      <div style={{padding:"8px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:10}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:T.blu,flexShrink:0}}/>
                        <span style={{fontSize:12,fontWeight:700,color:T.t1}}>{project}</span>
                        <span style={{fontSize:10,color:T.t4,background:T.surface,padding:"1px 7px",borderRadius:10,border:`1px solid ${T.b1}`}}>{items.length} item{items.length>1?"s":""}</span>
                        <button onClick={()=>{setCreatePOPrefill(items);setShowCreatePO(true);}} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                          <IcPO size={11} color={T.blu}/> Create PO
                        </button>
                      </div>
                      {items.map((m,idx)=>(
                        <div key={m.id} style={{display:"grid",gridTemplateColumns:"30px 54px 1fr 110px 130px 110px",padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",gap:12,background:selected[m.id]?"#EFF6FF":"none",transition:"background 0.1s",cursor:"pointer"}}
                          onClick={e=>{if(e.target.closest("button,input"))return;setSelMR(m);}}
                          onMouseEnter={e=>{if(!selected[m.id])e.currentTarget.style.background=T.surfaceB;}} onMouseLeave={e=>{if(!selected[m.id])e.currentTarget.style.background="none";}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <input type="checkbox" checked={!!selected[m.id]} onChange={()=>toggleSelect(m.id)}
                              style={{width:15,height:15,cursor:"pointer",accentColor:T.blu}}/>
                          </div>
                          <DateRail date={m.date}/>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.item}</div>
                            <div style={{fontSize:10.5,color:T.t4,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                              <span style={{fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{m.id}</span>
                              {m.requestedBy&&<span>· {m.requestedBy}</span>}
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,letterSpacing:".3px",textTransform:"uppercase"}}>Total</div>
                            <div style={{fontSize:15,fontWeight:800,color:T.t1,letterSpacing:"-.3px",lineHeight:1.1}}>{m.approvedQty||m.qty}<span style={{fontSize:10,color:T.t4,fontWeight:600,marginLeft:3}}>{m.unit}</span></div>
                            {m.approvedQty&&m.approvedQty<m.qty&&<div style={{fontSize:9.5,color:T.amb}}>req: {m.qty}</div>}
                          </div>
                          <div style={{textAlign:"center"}}>
                            {m.inStock>0?<span style={{fontSize:10.5,fontWeight:600,color:T.grn,background:T.grnL,padding:"3px 9px",borderRadius:10,border:`1px solid ${T.grnM}`}}>Stock: {m.inStock}</span>:<span style={{fontSize:10.5,color:T.t4}}>No stock</span>}
                          </div>
                          <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                            <button onClick={()=>{setSelected({[String(m.id)]:true});setShowBulkOrder(true);}} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:5,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                              <IcTruck size={11} color={T.amb}/> Order
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {/* Ordered tab */}
              {mrTab==="Ordered"&&(
                <>
                  {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcTruck size={30} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No ordered items</div></div>}
                  <div style={{display:"grid",gridTemplateColumns:"70px 1fr 90px 80px 1fr 120px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
                    {["MR#","Material","Qty","Unit","Vendor · ETA","Action"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                  </div>
                  {filteredMRs.map(m=>(
                    <div key={m.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 90px 80px 1fr 120px",padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",transition:"background 0.1s",cursor:"pointer"}}
                      onClick={e=>{if(e.target.closest("button,input"))return;setSelMR(m);}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <div>
                        <div style={{fontSize:10,color:T.t4}}>{m.date}</div>
                        <div style={{fontSize:10.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{m.id}</div>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.t1}}>{m.item}</div>
                        <div style={{fontSize:11,color:T.t3}}>{m.project}</div>
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{m.approvedQty||m.qty}</div>
                      <div style={{fontSize:12,color:T.t3}}>{m.unit}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:500,color:m.isFromWarehouse?T.cyn:T.pur,display:"flex",alignItems:"center",gap:4}}>
                          {m.isFromWarehouse&&<span style={{fontSize:10}}>🏭</span>}{m.vendor||"—"}
                        </div>
                        <div style={{fontSize:10.5,color:T.t4}}>{m.isFromWarehouse?"From warehouse stock":`ETA: ${m.expectedDelivery||"TBD"}`}</div>
                      </div>
                      <div style={{position:"relative",display:"flex",justifyContent:"flex-end"}}>
                        <button onClick={(e)=>{e.stopPropagation();setRowMenu(rowMenu===m.id?null:m.id);}} title="Actions"
                          style={{width:30,height:30,borderRadius:6,background:rowMenu===m.id?T.surfaceB:"none",border:`1px solid ${rowMenu===m.id?T.b1:"transparent"}`,color:T.t3,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,lineHeight:1,fontWeight:700}}>⋮</button>
                        {rowMenu===m.id&&(<>
                          <div onClick={(e)=>{e.stopPropagation();setRowMenu(null);}} style={{position:"fixed",inset:0,zIndex:50}}/>
                          <div style={{position:"absolute",right:0,top:34,background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.14)",zIndex:51,width:200,overflow:"hidden"}}>
                            <button onClick={(e)=>{e.stopPropagation();setRowMenu(null);setMarkRecvTgt(m);}}
                              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 13px",border:"none",background:"none",color:T.grn,fontSize:12.5,fontWeight:600,cursor:"pointer",textAlign:"left"}}
                              onMouseEnter={e=>e.currentTarget.style.background=T.grnL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                              <IcChk size={14} color={T.grn}/> Mark Received
                            </button>
                            <div style={{height:1,background:T.b1}}/>
                            <button onClick={(e)=>{e.stopPropagation();closeMR(m);}}
                              style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 13px",border:"none",background:"none",color:T.red,fontSize:12.5,fontWeight:600,cursor:"pointer",textAlign:"left"}}
                              onMouseEnter={e=>e.currentTarget.style.background=T.redL} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                              <IcX size={13} color={T.red}/> Close with reason
                            </button>
                          </div>
                        </>)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Received tab — with partial color coding */}
              {mrTab==="Received"&&(
                <>
                  {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcChk size={30} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No received items</div></div>}
                  <div style={{display:"grid",gridTemplateColumns:"70px 1fr 90px 1fr 140px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`}}>
                    {["MR#","Material","Qty","Project","Status"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                  </div>
                  {filteredMRs.map(m=>{
                    const isPartial=m.matStatus==="PartialReceived";
                    // For partial: percent of approved qty actually received.
                    // For full: 100. Guard against divide-by-zero + null receivedQty.
                    const recd = isPartial ? (m.receivedQty || 0) : (m.qty || 0);
                    const pct = (m.qty && recd) ? Math.min(100, Math.round((recd/m.qty)*100)) : (isPartial ? 0 : 100);
                    const accentColor=isPartial?T.amb:T.grn;
                    return(
                      <div key={m.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 90px 1fr 140px",padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${accentColor}`,transition:"background 0.1s",cursor:"pointer"}}
                        onClick={e=>{if(e.target.closest("button,input"))return;setSelMR(m);}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <div>
                          <div style={{fontSize:10,color:T.t4}}>{m.date}</div>
                          <div style={{fontSize:10.5,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{m.id}</div>
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:T.t1}}>{m.item}</div>
                          {m.vendor&&<div style={{fontSize:11,color:T.t3}}>{m.vendor}</div>}
                        </div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:isPartial?T.amb:T.grn}}>{isPartial ? recd : (m.receivedQty||m.qty)}</div>
                          <div style={{fontSize:10,color:T.t4}}>{m.unit}</div>
                          {isPartial&&<div style={{fontSize:9.5,color:T.amb}}>of {m.qty}</div>}
                        </div>
                        <div>
                          <div style={{fontSize:12,color:T.t2}}>{m.project}</div>
                          {isPartial&&(
                            <div style={{marginTop:4}}>
                              <div style={{height:4,background:T.b1,borderRadius:2,width:100,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${pct}%`,background:T.amb,borderRadius:2}}/>
                              </div>
                              <div style={{fontSize:9.5,color:T.amb,marginTop:2}}>{pct}% received</div>
                            </div>
                          )}
                        </div>
                        <div>
                          {isPartial?(
                            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:T.ambL,border:`1px solid ${T.ambM}`,fontSize:11,fontWeight:600,color:T.amb}}>
                              <IcHalf size={11} color={T.amb}/> Partial {pct}%
                            </span>
                          ):(
                            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:T.grnL,border:`1px solid ${T.grnM}`,fontSize:11,fontWeight:600,color:T.grn}}>
                              <IcChk size={11} color={T.grn}/> Received
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Rejected tab */}
              {mrTab==="Rejected"&&(
                <>
                  {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcBan size={30} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No rejected requests</div></div>}
                  {filteredMRs.map(m=>(
                    <div key={m.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 90px 1fr",padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${T.red}`,transition:"background 0.1s",cursor:"pointer"}}
                      onClick={e=>{if(e.target.closest("button,input"))return;setSelMR(m);}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <div>
                        <div style={{fontSize:10,color:T.t4}}>{m.date}</div>
                        <div style={{fontSize:10.5,fontWeight:700,color:T.red,fontFamily:"monospace"}}>{m.id}</div>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.t1}}>{m.item}</div>
                        <div style={{fontSize:11,color:T.t3}}>{m.project} · {m.requestedBy}</div>
                      </div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:T.t2}}>{m.qty}</div>
                        <div style={{fontSize:10,color:T.t4}}>{m.unit}</div>
                      </div>
                      <div style={{padding:"5px 10px",background:T.redL,borderRadius:6,border:`1px solid ${T.redM}`}}>
                        <div style={{fontSize:11,color:T.red}}>{m.rejectedReason||"Rejected"}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {mrTab==="Closed"&&(
                <>
                  {filteredMRs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><div style={{fontSize:28,marginBottom:6}}>⊘</div><div style={{marginTop:6,fontSize:13,color:T.t3}}>No closed requests</div><div style={{fontSize:11,color:T.t4,marginTop:4}}>MRs that were manually closed before being received will appear here with the reason.</div></div>}
                  {filteredMRs.map(m=>(
                    <div key={m.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 90px 1.5fr 90px",padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${T.t3}`,transition:"background 0.1s",cursor:"pointer",gap:8}}
                      onClick={e=>{if(e.target.closest("button,input"))return;setSelMR(m);}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <div>
                        <div style={{fontSize:10,color:T.t4}}>{m.date}</div>
                        <div style={{fontSize:10.5,fontWeight:700,color:T.t3,fontFamily:"monospace"}}>{m.id}</div>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.t1}}>{m.item}</div>
                        <div style={{fontSize:11,color:T.t3}}>{m.project} · {m.requestedBy}</div>
                      </div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:T.t2}}>{m.qty}</div>
                        <div style={{fontSize:10,color:T.t4}}>{m.unit}</div>
                      </div>
                      <div style={{padding:"6px 10px",background:"#FEF3C7",borderRadius:6,border:"1px solid #FDE68A"}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>Reason</div>
                        <div style={{fontSize:11,color:"#92400E",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.closed_reason || "—"}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        {m.closed_at && <div style={{fontSize:10,color:T.t4}}>Closed</div>}
                        {m.closed_at && <div style={{fontSize:11,color:T.t3,fontWeight:500}}>{new Date(m.closed_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ PO TAB ═══════════ */}
        {!loading&&tab==="po"&&(
          <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
            {/* Filter bar */}
            <div style={{background:T.surface,borderRadius:8,padding:"7px 10px",marginBottom:8,border:`1px solid ${T.b1}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
              <div style={{position:"relative",flex:1,minWidth:160}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",lineHeight:0,pointerEvents:"none"}}><IcSrch size={13} color={T.t4}/></span>
                <input value={poSearch} onChange={e=>setPoSearch(e.target.value)} placeholder="Search PO#, vendor, project..."
                  style={{width:"100%",height:31,padding:"0 8px 0 27px",borderRadius:6,border:`1.5px solid ${poSearch?T.blu:T.b1}`,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:poSearch?T.bluL:T.surface}}/>
              </div>
              {[{val:poStatusF,set:setPoStatusF,opts:["All","Open","Closed"],def:"Status"},{val:poApprovalF,set:setPoApprovalF,opts:["All","Draft","Approved"],def:"Approval"}].map(({val,set,opts,def},i)=>(
                <div key={i} style={{position:"relative"}}>
                  <select value={val} onChange={e=>set(e.target.value)} style={{height:31,padding:"0 22px 0 9px",borderRadius:6,border:`1.5px solid ${val!=="All"?T.blu:T.b1}`,background:val!=="All"?T.bluL:T.surface,fontSize:11.5,color:val!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit",minWidth:100,appearance:"none",WebkitAppearance:"none"}}>
                    {opts.map(o=><option key={o} value={o}>{o==="All"?`All ${def}`:o}</option>)}
                  </select>
                  <IcDown size={10} color={T.t4} style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
                </div>
              ))}
              <span style={{fontSize:11,color:T.t4}}>{filteredPOs.length} POs</span>
            </div>
            {/* PO list */}
            <div style={{flex:1,overflowY:"auto",overflowX:"hidden",background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 130px 90px 100px 110px 80px",padding:"7px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0,zIndex:10}}>
                {["PO#","Vendor","Project","Site","Status","Approval","Amount","Actions"].map((h,i)=><span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
              </div>
              {filteredPOs.map(po=>{
                const ps=PO_STATUS[po.poStatus]||PO_STATUS.Open;
                const dispLbl=displayPOStatus(po);
                const as=APPR_STATUS[dispLbl]||APPR_STATUS.Draft;
                const borderC=po.approval==="Revision"?"#1D4ED8":po.approval==="Rejected"?T.red:po.approval==="Draft"?T.amb:dispLbl==="Ordered"?"#7C3AED":dispLbl==="PartiallyReceived"?"#0891B2":dispLbl==="Received"?T.grn:"transparent";
                return(<div key={po.id}>
                  <div onClick={()=>setSelPO(po)} style={{display:"grid",gridTemplateColumns:"90px 160px 1fr 130px 90px 100px 110px 80px",padding:"10px 14px",borderBottom:po.reviewNote?"none":`1px solid ${T.b1}`,alignItems:"center",cursor:"pointer",borderLeft:`3px solid ${borderC}`,transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{fontSize:12,fontWeight:700,color:T.blu,fontFamily:"monospace"}}>{po.poNum||("PO-"+po.id)}</span>
                    <span style={{fontSize:12,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.vendor}</span>
                    <span style={{fontSize:11.5,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{po.project}</span>
                    <span style={{fontSize:11.5,color:T.t3}}>{po.deliverySite}</span>
                    <Pill label={po.poStatus} c={ps.c} bg={ps.bg} brd={ps.brd}/>
                    <Pill label={PO_PILL_LABEL[dispLbl]||dispLbl} c={as.c} bg={as.bg} brd={as.brd}/>
                    <span style={{fontSize:13,fontWeight:600,color:T.t1}}>₹{fmtN(po.amount)}</span>
                    <div style={{display:"flex",gap:4}}>
                      {po.approval==="Draft"&&<button onClick={e=>{e.stopPropagation();approvePO(po.id);}} title="Approve PO" style={{width:26,height:26,borderRadius:6,background:T.grnL,border:`1px solid ${T.grnM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcChk size={13} color={T.grn}/></button>}
                      {po.approval==="Revision"&&<button onClick={e=>{e.stopPropagation();setEditPo(po);setShowCreatePO(true);}} title="Edit PO and Resubmit for Approval" style={{height:26,padding:"0 9px",borderRadius:6,background:"#DBEAFE",border:"1px solid #93C5FD",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:3,color:"#1D4ED8",fontSize:10.5,fontWeight:700}}>✏️ Edit & Resubmit</button>}
                      {po.poStatus==="Open"&&po.approval==="Approved"&&<button onClick={e=>{e.stopPropagation();setGrnTarget(po);}} title="GRN" style={{width:26,height:26,borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcGRN size={13} color={T.amb}/></button>}
                    </div>
                  </div>
                  {po.reviewNote&&(po.approval==="Revision"||po.approval==="Rejected")&&(
                    <div style={{padding:"6px 14px 10px",borderBottom:`1px solid ${T.b1}`,borderLeft:`3px solid ${borderC}`,background:po.approval==="Rejected"?T.redL:"#EFF6FF"}}>
                      <span style={{fontSize:9.5,fontWeight:700,color:po.approval==="Rejected"?T.red:"#1D4ED8",textTransform:"uppercase",letterSpacing:".3px",marginRight:6}}>{po.approval==="Rejected"?"❌ Rejected":"↻ Revision requested"}</span>
                      <span style={{fontSize:11,color:T.t2,fontStyle:"italic"}}>"{po.reviewNote}"</span>
                      {po.reviewedBy&&<span style={{fontSize:10,color:T.t4,marginLeft:6}}>— by {po.reviewedBy}</span>}
                    </div>
                  )}
                </div>);
              })}
              {filteredPOs.length===0&&<div style={{textAlign:"center",padding:"48px",color:T.t4}}><IcPO size={32} color={T.b2}/><div style={{marginTop:10,fontSize:13,color:T.t3}}>No POs match filters</div></div>}
            </div>
          </div>
        )}

        {/* ═══════════ RFQ TAB ═══════════ */}
        {!loading&&tab==="rfq"&&(
          <div style={{flex:1,overflowY:"auto"}}>
            {rfqs.map(rfq=>{
              const rs=RFQ_STATUS[rfq.status]||RFQ_STATUS.Draft;
              const submitted=rfq.vendors.filter(v=>v.status==="Submitted").length;
              return(<div key={rfq.id} style={{background:T.surface,borderRadius:8,border:`1px solid ${rfq.locked?T.grnM:T.b1}`,marginBottom:8,overflow:"hidden",boxShadow:rfq.locked?"0 2px 8px rgba(5,150,105,0.1)":"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",borderLeft:rfq.locked?`3px solid ${T.grn}`:"3px solid transparent"}} onClick={()=>setSelRFQ(rfq)}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{rfq.id}</span>
                      <Pill label={rfq.status} c={rs.c} bg={rs.bg} brd={rs.brd}/>
                      {rfq.locked&&<span style={{background:T.grnL,color:T.grn,fontSize:9.5,fontWeight:700,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.grnM}`}}>Locked: {rfq.locked}</span>}
                    </div>
                    <div style={{fontSize:11.5,color:T.t3}}>{rfq.project} · {rfq.items.length} item{rfq.items.length>1?"s":""}</div>
                    {rfq.bidEnd&&<div style={{fontSize:10.5,color:T.t4}}>Bidding: {rfq.bidStart} → {rfq.bidEnd}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11.5,color:T.t3}}>{submitted}/{rfq.vendors.length} responded</div>
                    <div style={{height:4,background:T.b1,borderRadius:2,width:80,marginTop:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:rfq.vendors.length?`${(submitted/rfq.vendors.length)*100}%`:"0%",background:T.blu,borderRadius:2}}/>
                    </div>
                    <div style={{display:"flex",gap:5,marginTop:6,justifyContent:"flex-end"}}>
                      {rfq.status==="Draft"&&<button onClick={e=>{e.stopPropagation();publishRFQ(rfq.id);}} style={{padding:"3px 10px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>Publish</button>}
                      {rfq.locked&&<button onClick={e=>e.stopPropagation()} style={{padding:"3px 10px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10.5,fontWeight:600,cursor:"pointer"}}>→ Create PO</button>}
                    </div>
                  </div>
                </div>
              </div>);
            })}
          </div>
        )}

        {/* ═══════════ TRANSFERS TAB (same as Warehouse) ═══════════ */}
        {!loading&&tab==="transfer"&&<CompanyTransfersTab/>}
      </div>

      {/* ═══ MODALS ═══ */}
      {selPO&&<PODetailDrawer po={selPO} onClose={()=>setSelPO(null)} onApprove={(id)=>{approvePO(id);setSelPO(p=>p?{...p,approval:"Approved"}:p);}} onShare={(po)=>{setShareTarget(po);setSelPO(null);}} onGRN={(po)=>{setGrnTarget(po);setSelPO(null);}}
        onSendToVendor={(po)=>{setSendToVendorTarget(po);}}
        onEdit={(po)=>{setEditPo(po);setShowCreatePO(true);setSelPO(null);}}
        onCancel={async(po)=>{
          const res=await api.patch("/procurement/pos/"+po.id+"/cancel",{});
          if(res.success){
            setPOs(p=>p.map(x=>x.id===po.id?{...x,poStatus:"Cancelled"}:x));
            setSelPO(p=>p?{...p,poStatus:"Cancelled"}:p);
          } else alert(res.message||"Cancel failed");
        }}/>}
      {shareTarget&&<ShareModal rfq={{id:shareTarget.id,project:shareTarget.project,vendors:VENDORS.slice(0,3).map(n=>({name:n,status:"Pending",rates:[]}))}} onClose={()=>setShareTarget(null)}/>}
      {sendToVendorTarget&&<SendToVendorModal po={sendToVendorTarget}
        onClose={()=>setSendToVendorTarget(null)}
        onSent={()=>{
          // Update local state — flip orderStatus to Ordered
          setPOs(p=>p.map(x=>x.id===sendToVendorTarget.id?{...x,orderStatus:"Ordered",sentAt:new Date().toISOString()}:x));
          setSelPO(p=>p&&p.id===sendToVendorTarget.id?{...p,orderStatus:"Ordered"}:p);
        }}/>}
      {grnTarget&&<GRNModal po={grnTarget} onClose={()=>setGrnTarget(null)} onSave={saveGRN}/>}
      {selRFQ&&<RFQDetailDrawer rfq={selRFQ} onClose={()=>setSelRFQ(null)} onPunch={(vi)=>{setPunchTarget(selRFQ);setPunchVendorIdx(vi);setSelRFQ(null);}} onLock={(vName)=>{lockRFQ(selRFQ.id,vName);setSelRFQ(r=>r?{...r,locked:vName}:r);}} onPublish={(id)=>{publishRFQ(id);setSelRFQ(r=>r?{...r,status:"Published",bidStart:"Today",bidEnd:"+5 days"}:r);}}/>}
      {punchTarget&&punchVendorIdx!=null&&<PunchQuoteModal rfq={punchTarget} vendorIndex={punchVendorIdx} onSave={(vi,rates)=>savePunch(punchTarget.id,vi,rates)} onClose={()=>{setPunchTarget(null);setPunchVendorIdx(null);}}/>}
      {approveTgt&&<ApproveMRModal mr={approveTgt} onSave={saveApproveMR} onClose={()=>setApproveTgt(null)}/>}
      {rejectTgt&&<RejectMRModal mr={rejectTgt} onSave={saveRejectMR} onClose={()=>setRejectTgt(null)}/>}
      {markRecvTgt&&<MarkReceivedModal mr={markRecvTgt} onSave={saveMarkReceived} onClose={()=>setMarkRecvTgt(null)}/>}
      {/* MR detail drawer — opens on row click in any MR tab. Admin can edit/delete. */}
      <MRDetailDrawer
        mr={selMR}
        onClose={()=>setSelMR(null)}
        onChanged={async()=>{
          // Reload MRs from server so the row reflects changes
          try{
            const r=await api.get("/procurement/mrs");
            if(r.success) setMRs(r.data.map(mapMR));
          }catch(e){}
        }}
      />
      {showBulkOrder&&selectedItems.length>0&&<BulkOrderModal items={selectedItems} onSave={saveBulkOrder} onClose={()=>setShowBulkOrder(false)} dbVendors={dbVendors}
        onWarehouseIssued={async(mrNos)=>{
          alert(`${mrNos.length} warehouse MR(s) created — Warehouse → Requests tab me approve+issue karein:\n${mrNos.join(", ")}`);
          setShowBulkOrder(false);
          // Selection state is `selected` (object map), not `selectedIds` —
          // earlier reference threw: "setSelectedIds is not defined".
          setSelected({});
          const mRes = await api.get("/procurement/mrs");
          if (mRes.success) setMRs(mRes.data.map(mapMR));
        }}/>}
      {showCreatePO&&<CreatePOModal dbProjects={dbProjects} dbVendors={dbVendors} editPo={editPo} onClose={()=>{setShowCreatePO(false);setCreatePOPrefill(null);setEditPo(null);}} onSave={async(newPO)=>{
        // EDIT mode — PUT existing PO + flip back to Draft + create fresh approval entry
        // Sanitize date: only valid YYYY-MM-DD reaches backend (no "TBD" / empty / formatted strings)
        const validDate = (d) => d && /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? d : null;
        if (newPO.editPoId) {
          const res = await api.put("/procurement/pos/"+newPO.editPoId,{
            vendor_name: newPO.vendor,
            project_id: newPO.projectId || 1,
            project_name: newPO.project,
            delivery_site: newPO.deliverySite,
            expected_delivery: validDate(newPO.delivery),
            items: newPO.items.map(it=>({
              description:it.desc, hsn_code:it.hsn,
              quantity:it.qty, unit:it.unit, rate:it.rate,
              project_id: it.project_id||null,
              project_name: it.project_name||null,
              delivery_site: it.delivery_site||null,
              linked_mr_id: it.linked_mr_id||null,
            })),
            notes: newPO.notes||"",
          });
          if (!res.success) { alert(res.message||"Update failed"); return; }
          // If was in Revision, flip to Draft + re-submit for approval
          const wasRevision = editPo?.approval === "Revision";
          if (wasRevision) {
            await api.patch("/procurement/pos/"+newPO.editPoId+"/resubmit",{});
            try {
              await api.post("/approvals/submit",{
                module:"Purchase Order",
                ref_id: newPO.editPoId,
                ref_no: editPo?.poNum||"",
                title: newPO.vendor + " - " + (newPO.items||[]).length + " items (revised)",
                amount: res.data.total_amount || 0,
                project_id: newPO.projectId || 1,
                project_name: newPO.project || "",
              });
            } catch(_){}
          }
          setPOs(prev=>prev.map(x=>x.id===newPO.editPoId?{...mapPO(res.data),approval: wasRevision?"Draft":x.approval}:x));
          setShowCreatePO(false);
          setEditPo(null);
          return;
        }
        // CREATE mode — POST new PO
        const linked_mr_ids = (createPOPrefill||[]).map(m=>m.id).filter(Boolean);
        const res = await api.post("/procurement/pos",{
          vendor_name: newPO.vendor,
          project_id: newPO.projectId || (createPOPrefill||[])[0]?.project_id || 1,
          project_name: newPO.project,
          delivery_site: newPO.deliverySite,
          expected_delivery: validDate(newPO.delivery),
          linked_mr_ids,
          items: newPO.items.map(it=>({description:it.desc,hsn_code:it.hsn,quantity:it.qty,unit:it.unit,rate:it.rate})),
          notes: newPO.notes||"",
        });
        if(res.success){
          // Submit for approval
          api.post("/approvals/submit", {
            module: "Purchase Order",
            ref_id: res.data.id,
            ref_no: res.data.po_number || "",
            title: newPO.vendor + " - " + (newPO.items||[]).length + " items",
            amount: res.data.total_amount || newPO.items.reduce((s,it)=>(s+(it.qty||0)*(it.rate||0)),0),
            project_id: newPO.projectId || (createPOPrefill||[])[0]?.project_id || 1,
            project_name: newPO.project || "",
          }).catch(e => console.error("Approval submit:", e));
          // PO created as Draft — MRs stay in Approved tab until admin approves PO
          setPOs(prev=>[mapPO(res.data),...prev]);
        } else {
          setPOs(prev=>[newPO,...prev]);
        }
        setShowCreatePO(false);
        setCreatePOPrefill(null);
        setSelected({});
        setMrTab("Ordered");
      }} prefillItems={createPOPrefill}/>}
    </div>
  );
}

export default ProcurementModule;
