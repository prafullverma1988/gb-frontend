import { useState, useMemo, useEffect, useCallback } from "react";
import api from "../config/api";

// ── ICONS ──────────────────────────────────────────────────────────
const Ic=({d,size=18,color="currentColor",sw=1.8,fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);
const IcHome =(p)=><Ic {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>;
const IcProj =(p)=><Ic {...p} d="M3 7h18M3 12h18M3 17h18"/>;
const IcFin  =(p)=><Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>;
const IcWH   =(p)=><Ic {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>;
const IcPay  =(p)=><Ic {...p} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>;
const IcSet  =(p)=><Ic {...p} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcProc =(p)=><Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>;
const IcRep  =(p)=><Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>;
const IcTask =(p)=><Ic {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcMenu =(p)=><Ic {...p} d="M4 6h16M4 12h16M4 18h16"/>;
const IcBell =(p)=><Ic {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>;
const IcAdd  =(p)=><Ic {...p} d="M12 5v14M5 12h14"/>;
const IcX    =(p)=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcChk  =(p)=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcEdit =(p)=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcDown =(p)=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcPrint=(p)=><Ic {...p} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>;
const IcTeam =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcCRM  =(p)=><Ic {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a3 3 0 00-3-3M16 3.13a4 4 0 010 7.75"/>;
const IcCal  =(p)=><Ic {...p} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>;
const IcEye  =(p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcEyeX =(p)=><Ic {...p} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>;
const IcAlert=(p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;
const IcSearch=(p)=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;

// ── THEME ─────────────────────────────────────────────────────────
const C={p:"#1565C0",a:"#FF6F00",sb:"#0D1B2A",w:"#FFF"};
const T={
  bg:"#F4F6F9",surface:"#FFFFFF",surfaceB:"#F8F9FB",sb:"#0D1B2A",sbH:"#162032",
  t1:"#111827",t2:"#374151",t3:"#6B7280",t4:"#9CA3AF",
  b1:"#E5E7EB",b2:"#D1D5DB",
  blu:"#2563EB",bluL:"#EFF6FF",bluM:"#BFDBFE",
  grn:"#059669",grnL:"#ECFDF5",grnM:"#A7F3D0",
  amb:"#D97706",ambL:"#FFFBEB",ambM:"#FDE68A",
  red:"#DC2626",redL:"#FEF2F2",redM:"#FECACA",
  slt:"#64748B",sltL:"#F1F5F9",
  pur:"#7C3AED",purL:"#F5F3FF",purM:"#DDD6FE",
};
const fmtN=(n)=>n==null?"—":Number(n).toLocaleString("en-IN");
const fmt=(n)=>n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:n>=1000?`${(n/1000).toFixed(0)}K`:String(n||0);

// ── SPIN CSS ──────────────────────────────────────────────────────
if(!document.getElementById("gb-spin-css")){const s=document.createElement("style");s.id="gb-spin-css";s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";document.head.appendChild(s);}

// ── CSV EXPORT ────────────────────────────────────────────────────
const exportCSV = (headers, rows, filename) => {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── LOADING / ERROR / EMPTY HELPERS ───────────────────────────────
const LoadingSpinner=()=><div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>;
const ErrorRetry=({onRetry})=><div style={{textAlign:"center",padding:"60px 0",color:"#EF4444",fontSize:13}}>Failed to load. <span style={{color:"#3B82F6",cursor:"pointer",textDecoration:"underline"}} onClick={onRetry}>Retry</span></div>;
const EmptyState=({icon,message,sub})=><div style={{textAlign:"center",padding:"50px 0",color:T.t4}}>{icon}<div style={{fontSize:13,marginTop:8}}>{message}</div>{sub&&<div style={{fontSize:11.5,color:T.t4,marginTop:3}}>{sub}</div>}</div>;

// ── NAV ────────────────────────────────────────────────────────────
const NAV=[
  {sec:null,items:[
    {id:"dashboard",l:"Dashboard",I:IcHome},
    {id:"projects",l:"Projects",I:IcProj},
    {id:"crm",l:"CRM",I:IcCRM},
    {id:"tasks",l:"Tasks",I:IcTask},
    {id:"team",l:"Team",I:IcTeam},
  ]},
  {sec:"FINANCE & OPS",items:[
    {id:"finance",l:"Finance",I:IcFin},
    {id:"procurement",l:"Procurement",I:IcProc},
    {id:"warehouse",l:"Warehouse",I:IcWH},
    {id:"payroll",l:"Payroll",I:IcPay},
  ]},
  {sec:"MORE",items:[
    {id:"reports",l:"Reports",I:IcRep},
    {id:"settings",l:"Settings",I:IcSet},
  ]},
];

// ── MONTHS ─────────────────────────────────────────────────────────
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const CUR_MONTH=new Date().getMonth();
const CUR_YEAR=new Date().getFullYear();
const WORKING_DAYS=26; // working days in month
let PROJECTS=[];

// ── EMPLOYEE DATA (loaded from API) ────────────────────────────────
let MONTHLY_STAFF=[];

// ── ATTENDANCE (loaded from API) ─────────────────────────────────────

let DAILY_WORKERS=[];
let ADVANCE_DATA=[];

// ── SHARED COMPONENTS ─────────────────────────────────────────────
const Pill=({label,c,bg,brd})=>(
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);

function Avatar({name,size=32,color=T.blu}){
  const initials=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:700,color:"white",flexShrink:0}}>
      {initials}
    </div>
  );
}


// ── MONTHLY ATTENDANCE GRID ───────────────────────────────────────
function MonthlyAttGrid({staff,att,setAtt,month,year,onAttChange}){
  const daysInMonth=new Date(year,month+1,0).getDate();
  const now=new Date();const today=(now.getMonth()===month&&now.getFullYear()===year)?now.getDate():month<now.getMonth()||year<now.getFullYear()?daysInMonth:0;
  const ATT_COLORS={"P":{bg:"#ECFDF5",c:"#059669",label:"P"},"A":{bg:"#FEF2F2",c:"#DC2626",label:"A"},"H":{bg:"#FFFBEB",c:"#D97706",label:"H"},"L":{bg:"#EFF6FF",c:"#2563EB",label:"L"},null:{bg:T.surfaceB,c:T.t4,label:"·"}};

  const toggleAtt=(empId,day)=>{
    if(day>today) return;
    const cur=att[empId]?.[day];
    const cycle=["P","A","H","L"];
    const next=cur===null||!cycle.includes(cur)?"P":cycle[(cycle.indexOf(cur)+1)%cycle.length];
    setAtt(p=>({...p,[empId]:{...p[empId],[day]:next}}));
    if(onAttChange) onAttChange(empId,day,next);
  };

  const getStats=(empId)=>{
    const days=att[empId]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    const A=Object.values(days).filter(v=>v==="A").length;
    const L=Object.values(days).filter(v=>v==="L").length;
    return{P,H,A,L,effective:P+(H*0.5)};
  };

  return(
    <div style={{overflowX:"auto"}}>
      {/* Days header */}
      <div style={{display:"flex",gap:0,marginBottom:4,paddingLeft:200}}>
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const isToday=d===today;
          const isFuture=d>today;
          const dow=new Date(year,month,d).getDay();
          const isSun=dow===0;
          return(
            <div key={d} style={{width:28,flexShrink:0,textAlign:"center",fontSize:9.5,fontWeight:isToday?800:isSun?600:400,color:isToday?T.blu:isSun?T.red:isFuture?T.b2:T.t4,padding:"3px 0"}}>
              {d}
              {isSun&&<div style={{width:4,height:4,borderRadius:"50%",background:isFuture?T.b2:T.red,margin:"1px auto 0"}}/>}
            </div>
          );
        })}
        <div style={{width:100,textAlign:"center",fontSize:9.5,fontWeight:600,color:T.t4,padding:"3px 6px"}}>Summary</div>
      </div>

      {/* Staff rows */}
      {staff.map((emp,ei)=>{
        const st=getStats(emp.id);
        const deptColor=emp.dept==="Management"?T.pur:emp.dept==="Civil"?T.blu:emp.dept==="Design"?T.grn:emp.dept==="Electrical"?T.amb:T.slt;
        return(
          <div key={emp.id} style={{display:"flex",gap:0,marginBottom:3,alignItems:"center",background:ei%2===0?T.surface:T.surfaceB,borderRadius:6,padding:"4px 0"}}>
            {/* Name cell */}
            <div style={{width:200,flexShrink:0,display:"flex",alignItems:"center",gap:8,padding:"0 10px"}}>
              <Avatar name={emp.name} size={26} color={deptColor}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                <div style={{fontSize:9.5,color:T.t4}}>{emp.role}</div>
              </div>
            </div>
            {/* Day cells */}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const status=att[emp.id]?.[d];
              const sc=ATT_COLORS[status]||ATT_COLORS[null];
              const isFuture=d>today;
              return(
                <div key={d}
                  onClick={()=>!isFuture&&toggleAtt(emp.id,d)}
                  style={{width:28,height:28,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:isFuture?"transparent":sc.bg,borderRadius:4,cursor:isFuture?"default":"pointer",fontSize:9.5,fontWeight:700,color:isFuture?T.b2:sc.c,border:`1px solid ${isFuture?"transparent":sc.bg}`,transition:"all .1s",margin:"0 1px"}}
                  title={`${emp.name} - Day ${d}`}>
                  {isFuture?"":sc.label}
                </div>
              );
            })}
            {/* Summary */}
            <div style={{width:100,flexShrink:0,padding:"0 6px",display:"flex",gap:5,alignItems:"center",justifyContent:"flex-end"}}>
              <span style={{fontSize:10,color:T.grn,fontWeight:700}}>{st.P}P</span>
              {st.H>0&&<span style={{fontSize:10,color:T.amb,fontWeight:700}}>{st.H}H</span>}
              {st.A>0&&<span style={{fontSize:10,color:T.red,fontWeight:700}}>{st.A}A</span>}
              <span style={{fontSize:10,color:T.t4}}>={st.effective}d</span>
            </div>
          </div>
        );
      })}

      {staff.length===0&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No staff for attendance tracking" sub="Add monthly staff members first"/>}

      {/* Legend */}
      <div style={{display:"flex",gap:12,marginTop:10,padding:"6px 10px",background:T.surfaceB,borderRadius:6,width:"fit-content"}}>
        {[["P","Present",T.grn,T.grnL],["H","Half Day",T.amb,T.ambL],["A","Absent",T.red,T.redL],["L","Leave",T.blu,T.bluL]].map(([k,lbl,c,bg])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:18,height:18,borderRadius:4,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:700,color:c}}>{k}</div>
            <span style={{fontSize:10.5,color:T.t3}}>{lbl}</span>
          </div>
        ))}
        <div style={{fontSize:10.5,color:T.t4,borderLeft:`1px solid ${T.b1}`,paddingLeft:10}}>Click cell to toggle</div>
      </div>
    </div>
  );
}

// ── SALARY SLIP MODAL ─────────────────────────────────────────────
function SalarySlipModal({emp,att,month,year,onClose,paymentType,workingDays}){
  const WD=workingDays||26;
  const days=att[emp.id]||{};
  const P=Object.values(days).filter(v=>v==="P").length;
  const H=Object.values(days).filter(v=>v==="H").length;
  const A=Object.values(days).filter(v=>v==="A").length;
  const effective=P+(H*0.5);
  const fullGross=emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone;
  const pType=paymentType||emp.paymentType||"fixed";
  const grossEarned=pType==="fixed"
    ? fullGross
    : Math.round((fullGross/WD)*effective);
  const pf=Math.round(emp.basicSalary*0.12);
  const esi=emp.basicSalary<=21000?Math.round(grossEarned*0.0075):0;
  const tds=grossEarned>15000?Math.round(grossEarned*0.05):0;
  const advDed=ADVANCE_DATA.find(a=>a.empId===emp.id&&a.status==="Pending deduction");
  const advDeduction=advDed?.amount||0;
  const totalDed=pf+esi+tds+advDeduction;
  const netPay=grossEarned-totalDed;
  const isAttBased=pType==="attendance";

  const printSlip=()=>{
    const w=window.open("","_blank","width=600,height=700");
    const calcRow = isAttBased
      ? "<tr><td>Calculation</td><td>\u20b9" + fmtN(fullGross) + " \u00f7 " + WD + " \u00d7 " + effective + " = \u20b9" + fmtN(grossEarned) + "</td></tr>"
      : "<tr><td>Calculation</td><td>Full monthly salary (attendance not deducted)</td></tr>";
    const salaryTypeColor = isAttBased ? "#7C3AED" : "#059669";
    const salaryTypeLabel = isAttBased ? "Attendance Based (Pro-rata)" : "Fixed Monthly Salary";
    const esiRow = esi > 0 ? "<tr><td>ESI (0.75%)</td><td>\u20b9" + fmtN(esi) + "</td></tr>" : "";
    const tdsRow = tds > 0 ? "<tr><td>TDS</td><td>\u20b9" + fmtN(tds) + "</td></tr>" : "";
    const advRow = advDeduction > 0 ? "<tr><td>Advance Recovery</td><td>\u20b9" + fmtN(advDeduction) + "</td></tr>" : "";
    w.document.write(`<html><head><title>Salary Slip</title>
    <style>*{font-family:Arial,sans-serif;font-size:12px}body{padding:20px}
    .header{background:#1565C0;color:white;padding:14px;border-radius:6px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}td,th{padding:7px 10px;border:1px solid #E5E7EB}
    th{background:#F8F9FB;font-weight:600}
    .net{background:#ECFDF5;font-size:15px;font-weight:800;color:#059669}
    </style></head><body>
    <div class="header"><h2 style="margin:0">Salary Slip</h2><p style="margin:4px 0 0">Month: ${MONTHS[month]} ${year}</p></div>
    <table><tr><th colspan="2">Employee Details</th></tr>
    <tr><td>Name</td><td><b>${emp.name}</b></td></tr>
    <tr><td>Employee ID</td><td>${emp.id}</td></tr>
    <tr><td>Designation</td><td>${emp.role}</td></tr>
    <tr><td>Department</td><td>${emp.dept}</td></tr>
    <tr><td>Bank A/C</td><td>${emp.bankAcc}</td></tr>
    <tr><td>IFSC</td><td>${emp.ifsc}</td></tr>
    <tr><th colspan="2">Attendance</th></tr>
    <tr><td>Salary Type</td><td><b style="color:${salaryTypeColor}">${salaryTypeLabel}</b></td></tr>
    <tr><td>Working Days</td><td>${WD}</td></tr>
    <tr><td>Present</td><td>${P} days (+ ${H} Half days)</td></tr>
    <tr><td>Effective Days</td><td>${effective}</td></tr>
    ${calcRow}
    <tr><th colspan="2">Earnings</th></tr>
    <tr><td>Basic Salary</td><td>&#8377;${fmtN(emp.basicSalary)}</td></tr>
    <tr><td>HRA</td><td>&#8377;${fmtN(emp.hra)}</td></tr>
    <tr><td>Conveyance</td><td>&#8377;${fmtN(emp.conveyance)}</td></tr>
    <tr><td>Medical Allowance</td><td>&#8377;${fmtN(emp.medical)}</td></tr>
    <tr><td>Phone Allowance</td><td>&#8377;${fmtN(emp.phone)}</td></tr>
    <tr><td><b>Gross Earned</b></td><td><b>&#8377;${fmtN(grossEarned)}</b></td></tr>
    <tr><th colspan="2">Deductions</th></tr>
    <tr><td>PF (12%)</td><td>&#8377;${fmtN(pf)}</td></tr>
    ${esiRow}${tdsRow}${advRow}
    <tr><td><b>Total Deductions</b></td><td><b>&#8377;${fmtN(totalDed)}</b></td></tr>
    <tr><td class="net"><b>NET PAY</b></td><td class="net"><b>&#8377;${fmtN(netPay)}</b></td></tr>
    </table><p style="margin-top:20px;font-size:10px;color:#6B7280">Generated by Payroll System &middot; ${new Date().toLocaleDateString("en-IN")}</p>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };

  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(1px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:14,width:"min(520px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#0D1B2A",padding:"13px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <Avatar name={emp.name} size={38} color={T.blu}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>{emp.name}</div>
          <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)"}}>{emp.id} · {emp.role} · {MONTHS[month]} {year}</div>
        </div>
        <button onClick={printSlip} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:6,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
          <IcPrint size={13} color="white"/> Print Slip
        </button>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={14}/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        {/* Attendance summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[{l:"Present",v:P,c:T.grn},{l:"Half Day",v:H,c:T.amb},{l:"Absent",v:A,c:T.red},{l:"Effective",v:effective,c:T.blu}].map((s,i)=>(
            <div key={i} style={{padding:"9px 10px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,borderTop:`3px solid ${s.c}`,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Salary type info bar */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:isAttBased?T.purL:T.grnL,border:`1px solid ${isAttBased?T.purM:T.grnM}`,borderRadius:8,marginBottom:12}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:700,color:isAttBased?T.pur:T.grn}}>
              {isAttBased?"Attendance Based (Pro-rata)":"Fixed Monthly Salary"}
            </span>
            {isAttBased
              ?<span style={{fontSize:11,color:T.pur,marginLeft:8}}>
                ₹{fmtN(fullGross)} ÷ {WD} days × {effective} eff. days = ₹{fmtN(grossEarned)}
              </span>
              :<span style={{fontSize:11,color:T.grn,marginLeft:8}}>
                Full gross paid regardless of attendance ({P}P {H>0?`${H}H `:""}{A>0?`${A}A`:""})
              </span>
            }
          </div>
        </div>

        {/* Two column layout: Earnings | Deductions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          {/* Earnings */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:T.grnL,borderBottom:`1px solid ${T.grnM}`}}>
              <span style={{fontSize:11,fontWeight:700,color:T.grn,textTransform:"uppercase",letterSpacing:".4px"}}>Earnings</span>
            </div>
            {[["Basic",emp.basicSalary],["HRA",emp.hra],["Conveyance",emp.conveyance],["Medical",emp.medical],emp.phone?["Phone",emp.phone]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{fontSize:12,color:T.t2}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.t1}}>₹{fmtN(v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:T.grnL}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.grn}}>Gross</span>
              <span style={{fontSize:13,fontWeight:800,color:T.grn}}>₹{fmtN(grossEarned)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:T.redL,borderBottom:`1px solid ${T.redM}`}}>
              <span style={{fontSize:11,fontWeight:700,color:T.red,textTransform:"uppercase",letterSpacing:".4px"}}>Deductions</span>
            </div>
            {[[`PF (12%)`,pf],esi>0?[`ESI (0.75%)`,esi]:null,tds>0?[`TDS`,tds]:null,advDeduction>0?[`Advance`,advDeduction]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderBottom:`1px solid ${T.b1}`}}>
                <span style={{fontSize:12,color:T.t2}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500,color:T.red}}>-₹{fmtN(v)}</span>
              </div>
            ))}
            {totalDed===0&&<div style={{padding:"7px 12px",fontSize:12,color:T.t4}}>No deductions</div>}
            <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:T.redL}}>
              <span style={{fontSize:12.5,fontWeight:700,color:T.red}}>Total Deductions</span>
              <span style={{fontSize:13,fontWeight:800,color:T.red}}>-₹{fmtN(totalDed)}</span>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:`linear-gradient(135deg,${T.grn}18,${T.grn}08)`,border:`2px solid ${T.grnM}`,borderRadius:10}}>
          <div>
            <div style={{fontSize:11,color:T.grn,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>Net Pay — {MONTHS[month]} {year}</div>
            <div style={{fontSize:11,color:T.t4}}>Bank: {emp.bankAcc} · IFSC: {emp.ifsc}</div>
          </div>
          <div style={{fontSize:26,fontWeight:800,color:T.grn}}>₹{fmtN(netPay)}</div>
        </div>
      </div>

      <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,background:T.surfaceB,display:"flex",gap:7,flexShrink:0}}>
        <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Close</button>
        <button onClick={printSlip} style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <IcPrint size={14} color="white"/> Print / Download Slip
        </button>
      </div>
    </div>
  </>);
}

// ── DAILY WAGES SECTION ───────────────────────────────────────────
function DailyWagesTab({workers,att,setAtt,selProject,setSelProject,month,year,onDailyAttChange,isAdmin}){
  const [selWorker,setSelWorker]=useState(null);
  const [view,setView]=useState("grid");
  const now=new Date();const today=(now.getMonth()===month&&now.getFullYear()===year)?now.getDate():month<now.getMonth()||year<now.getFullYear()?new Date(year,month+1,0).getDate():0;

  const filteredWorkers=selProject==="All"?workers:workers.filter(w=>w.project===selProject||w.project==="Multiple"||w.project===null);

  const calcWorkerPay=(w)=>{
    const days=att[w.id]||{};
    let total=0,presentDays=0,otHours=0;
    Object.entries(days).forEach(([d,v])=>{
      if(!v) return;
      if(v.status==="P"){total+=w.ratePerDay+(v.ot||0)*w.rateOT;presentDays++;otHours+=v.ot||0;}
      else if(v.status==="H"){total+=w.ratePerDay/2;presentDays+=0.5;}
    });
    return{total,presentDays,otHours};
  };

  const toggleDailyAtt=(wId,day,field,val)=>{
    setAtt(p=>{
      const cur=p[wId]?.[day]||{status:"A",ot:0};
      const updated={...cur,[field]:val};
      if(onDailyAttChange) onDailyAttChange(wId,day,updated.status,updated.ot||0);
      return{...p,[wId]:{...p[wId],[day]:updated}};
    });
  };

  const cycleDayStatus=(wId,day)=>{
    if(day>today) return;
    const cur=(att[wId]?.[day]?.status)||"A";
    const cycle=["P","H","A"];
    const next=cycle[(cycle.indexOf(cur)+1)%cycle.length];
    toggleDailyAtt(wId,day,"status",next);
  };

  const ATT_C={"P":{bg:T.grnL,c:T.grn},"H":{bg:T.ambL,c:T.amb},"A":{bg:T.redL,c:T.red}};

  const totalPayable=filteredWorkers.reduce((s,w)=>s+calcWorkerPay(w).total,0);

  return(
    <div>
      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <select value={selProject} onChange={e=>setSelProject(e.target.value)}
          style={{height:32,padding:"0 10px",borderRadius:7,border:`1.5px solid ${selProject!=="All"?T.blu:T.b1}`,background:selProject!=="All"?T.bluL:T.surface,fontSize:12,color:selProject!=="All"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
          <option value="All">All Projects</option>
          {PROJECTS.map(p=><option key={p}>{p}</option>)}
        </select>
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3}}>
          {[["grid","List View"],["worker","Worker View"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{padding:"4px 10px",borderRadius:5,border:"none",background:view===id?T.blu:"none",color:view===id?"white":T.t3,fontSize:11.5,fontWeight:view===id?700:400,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>{
            const headers=["Worker","Trade","Project","Rate/Day","Rate OT","Days Present","OT Hours","Total Pay"];
            const rows=filteredWorkers.map(w=>{const c=calcWorkerPay(w);return[w.name,w.trade,w.project,w.ratePerDay,w.rateOT,c.presentDays,c.otHours,c.total];});
            exportCSV(headers,rows,`Daily_Wages_${MONTHS[month]}_${year}.csv`);
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> Export
          </button>
          <div style={{padding:"6px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.grn,fontWeight:600}}>Total Payable (till today): </span>
            <span style={{fontSize:14,fontWeight:800,color:T.grn}}>₹{fmtN(totalPayable)}</span>
          </div>
        </div>
      </div>

      {filteredWorkers.length===0&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No daily workers found" sub={selProject!=="All"?`No workers for project "${selProject}"`:"Add daily wage workers to track attendance"}/>}

      {/* GRID VIEW — calendar grid for each worker */}
      {view==="grid"&&(
        <div style={{overflowX:"auto"}}>
          {/* Days header */}
          <div style={{display:"flex",marginBottom:3,paddingLeft:180}}>
            {Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1).map(d=>(
              <div key={d} style={{width:32,flexShrink:0,textAlign:"center",fontSize:9.5,fontWeight:400,color:d===today?T.blu:T.t4}}>{d}</div>
            ))}
            <div style={{width:70,textAlign:"center",fontSize:9.5,color:T.t4,paddingLeft:4}}>Days</div>
            <div style={{width:50,textAlign:"center",fontSize:9.5,color:T.t4}}>OT Hrs</div>
            <div style={{width:80,textAlign:"right",fontSize:9.5,color:T.t4,paddingRight:4}}>Pay (₹)</div>
          </div>

          {filteredWorkers.map((w,wi)=>{
            const {total,presentDays,otHours}=calcWorkerPay(w);
            return(
              <div key={w.id} style={{display:"flex",alignItems:"center",marginBottom:3,background:wi%2===0?T.surface:T.surfaceB,borderRadius:6,padding:"3px 0"}}>
                {/* Name */}
                <div style={{width:180,flexShrink:0,padding:"0 9px",cursor:"pointer"}} onClick={()=>setSelWorker(selWorker?.id===w.id?null:w)}>
                  <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.name}</div>
                  <div style={{fontSize:9.5,color:T.t4}}>{w.trade} · ₹{fmtN(w.ratePerDay)}/day</div>
                </div>

                {/* Day cells */}
                {Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1).map(d=>{
                  const dayAtt=att[w.id]?.[d];
                  const status=dayAtt?.status||"A";
                  const sc=ATT_C[status]||ATT_C["A"];
                  return(
                    <div key={d}
                      onClick={()=>cycleDayStatus(w.id,d)}
                      style={{width:32,height:28,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:sc.bg,borderRadius:4,cursor:"pointer",fontSize:9.5,fontWeight:700,color:sc.c,border:`1px solid transparent`,margin:"0 0.5px",transition:"all .1s"}}
                      title={`${w.name} Day ${d}: ${status}`}>
                      {status}
                    </div>
                  );
                })}

                {/* Stats */}
                <div style={{width:70,flexShrink:0,textAlign:"center",fontSize:11.5,fontWeight:600,color:T.grn}}>{presentDays}</div>
                <div style={{width:50,flexShrink:0,textAlign:"center"}}>
                  {otHours>0?<span style={{fontSize:11,color:T.pur,fontWeight:600}}>{otHours}h</span>:<span style={{fontSize:11,color:T.t4}}>—</span>}
                </div>
                <div style={{width:80,flexShrink:0,textAlign:"right",paddingRight:8,fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(total)}</div>
              </div>
            );
          })}

          {/* OT Editor hint */}
          <div style={{marginTop:8,fontSize:10.5,color:T.t4,padding:"5px 10px",background:T.surfaceB,borderRadius:5,display:"inline-block"}}>
            Click cell to toggle P/H/A · To add OT hours → click worker name → expand OT
          </div>
        </div>
      )}

      {/* WORKER VIEW — detailed per worker */}
      {view==="worker"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
          {filteredWorkers.map(w=>{
            const {total,presentDays,otHours}=calcWorkerPay(w);
            const isSelected=selWorker?.id===w.id;
            return(
              <div key={w.id}
                onClick={()=>setSelWorker(isSelected?null:w)}
                style={{background:T.surface,borderRadius:9,border:`1.5px solid ${isSelected?T.blu:T.b1}`,padding:"12px 14px",cursor:"pointer",transition:"all .15s",boxShadow:isSelected?"0 0 0 3px rgba(37,99,235,0.1)":"0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{w.name}</div>
                    <div style={{fontSize:11,color:T.t4}}>{w.trade} · {w.project}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9.5,color:T.t4}}>Rate/Day</div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmtN(w.ratePerDay)}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                  {[{l:"Days",v:presentDays,c:T.grn},{l:"OT Hrs",v:otHours||"—",c:T.pur},{l:"Payable",v:`₹${fmtN(total)}`,c:T.blu}].map((s,i)=>(
                    <div key={i} style={{padding:"6px 8px",background:T.surfaceB,borderRadius:5,textAlign:"center"}}>
                      <div style={{fontSize:11.5,fontWeight:700,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,color:T.t4,marginTop:1}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Mini attendance strip */}
                <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                  {Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1).map(d=>{
                    const status=att[w.id]?.[d]?.status||"A";
                    const c=status==="P"?T.grn:status==="H"?T.amb:T.red;
                    return<div key={d} style={{width:14,height:14,borderRadius:3,background:c+"33",border:`1px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:c}}>{d}</div>;
                  })}
                </div>

                {/* Expanded OT editor */}
                {isSelected&&(
                  <div style={{marginTop:10,padding:"10px 11px",background:T.purL,border:`1px solid ${T.purM}`,borderRadius:7}} onClick={e=>e.stopPropagation()}>
                    <div style={{fontSize:10.5,fontWeight:700,color:T.pur,marginBottom:7}}>OT Hours per day (rate: ₹{w.rateOT}/hr)</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>i+1).map(d=>{
                        const dayAtt=att[w.id]?.[d];
                        if(!dayAtt||dayAtt.status!=="P") return null;
                        return(
                          <div key={d} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                            <div style={{fontSize:9,color:T.pur}}>D{d}</div>
                            <input type="number" min={0} max={4} value={dayAtt.ot||0}
                              onChange={e=>toggleDailyAtt(w.id,d,"ot",Number(e.target.value))}
                              style={{width:30,height:22,borderRadius:4,border:`1px solid ${T.purM}`,background:"white",textAlign:"center",fontSize:10.5,outline:"none",fontFamily:"inherit"}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MONTHLY SALARY TAB ────────────────────────────────────────────
function MonthlySalaryTab({staff,att,month,year,onViewSlip,advances,workingDays,isAdmin}){
  const [search,setSearch]=useState("");
  const [payStatus,setPayStatus]=useState({});
  // local paymentType overrides — can be toggled per employee
  const [paymentTypes,setPaymentTypes]=useState(()=>{
    const m={};
    staff.forEach(e=>{m[e.id]=e.paymentType||"fixed";});
    return m;
  });

  // ─── Salary Edit Approval (Phase 2) ──────────────────────
  const [editReqs,setEditReqs]=useState([]);      // all requests for current month
  const [editModalEmp,setEditModalEmp]=useState(null);
  const [editNewAmt,setEditNewAmt]=useState("");
  const [editReason,setEditReason]=useState("");
  const [editSubmitting,setEditSubmitting]=useState(false);
  const [reqErr,setReqErr]=useState("");

  const loadRequests=async()=>{
    try{
      const r=await api.get(`/payroll/salary-edit-requests?month=${month}&year=${year}`);
      if(r.success) setEditReqs(r.data||[]);
    }catch(e){ /* table might not exist yet — silent */ }
  };
  useEffect(()=>{ loadRequests(); /* eslint-disable-next-line */ },[month,year]);

  // Get latest request for a staff member (approved takes priority, else pending, else rejected)
  const reqFor=(sid)=>{
    const list=editReqs.filter(r=>r.staff_id===sid);
    return list.find(r=>r.status==="approved")||list.find(r=>r.status==="pending")||list[0]||null;
  };

  const openEdit=(emp,currentNet)=>{
    setEditModalEmp(emp);
    setEditNewAmt(String(currentNet));
    setEditReason("");
    setReqErr("");
  };
  const submitEdit=async()=>{
    if(!editModalEmp) return;
    const newAmt=Number(editNewAmt);
    if(isNaN(newAmt)||newAmt<0){ setReqErr("Invalid amount"); return; }
    setEditSubmitting(true);setReqErr("");
    try{
      const oldAmt=calcNet(editModalEmp).net;
      const r=await api.post("/payroll/salary-edit-requests",{
        staff_id:editModalEmp.id,
        month_num:month,
        year_num:year,
        old_amount:oldAmt,
        new_amount:newAmt,
        reason:editReason||null,
      });
      if(r.success){
        setEditModalEmp(null);
        await loadRequests();
      }else{ setReqErr(r.message||"Failed"); }
    }catch(e){ setReqErr(e.message||"Network error"); }
    setEditSubmitting(false);
  };
  const approveReq=async(id,status)=>{
    try{
      const r=await api.patch(`/payroll/salary-edit-requests/${id}`,{status});
      if(r.success) await loadRequests();
    }catch(e){ alert(e.message); }
  };

  const togglePayType=(empId)=>{
    setPaymentTypes(p=>({...p,[empId]:p[empId]==="fixed"?"attendance":"fixed"}));
  };

  const filtered=staff.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||e.role.toLowerCase().includes(search.toLowerCase()));

  const WD=workingDays||26;
  const calcNet=(emp)=>{
    const days=att[emp.id]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    const A=Object.values(days).filter(v=>v==="A").length;
    const effective=P+(H*0.5);
    const fullGross=emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone;
    const pType=paymentTypes[emp.id]||emp.paymentType||"fixed";
    const gross=pType==="fixed"
      ? fullGross
      : Math.round((fullGross/WD)*effective);
    const pf=Math.round(emp.basicSalary*0.12);
    const esi=emp.basicSalary<=21000?Math.round(gross*0.0075):0;
    const adv=(advances||[]).find(a=>a.empId===emp.id&&a.status==="Pending deduction")?.amount||0;
    return{gross,net:gross-pf-esi-adv,effective,pf,esi,pType,P,H,A,fullGross};
  };

  const totalNet=filtered.reduce((s,e)=>s+calcNet(e).net,0);
  const paidCount=filtered.filter(e=>payStatus[e.id]==="Paid").length;

  const markAllPaid=()=>{
    const upd={};
    filtered.forEach(e=>{upd[e.id]="Paid";});
    setPayStatus(p=>({...p,...upd}));
  };

  return(
    <div>
      {/* Summary bar */}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",minWidth:200}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee..."
            style={{height:32,padding:"0 8px 0 26px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{padding:"6px 13px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.blu}}>Total Net Payroll: </span>
            <span style={{fontSize:14,fontWeight:800,color:T.blu}}>₹{fmtN(totalNet)}</span>
          </div>
          <div style={{padding:"6px 13px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.grn}}>{paidCount}/{filtered.length} Paid</span>
          </div>
          {isAdmin&&<button onClick={markAllPaid}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcChk size={13} color="white"/> Mark All Paid
          </button>}
          <button onClick={()=>{
            const headers=["Employee","ID","Dept","Pay Type","Basic","Gross","PF","ESI","Net Pay"];
            const rows=filtered.map(emp=>{const c=calcNet(emp);return[emp.name,emp.id,emp.dept,c.pType,emp.basicSalary,c.gross,c.pf,c.esi,c.net];});
            exportCSV(headers,rows,`Monthly_Salary_${MONTHS[month]}_${year}.csv`);
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> Export
          </button>
        </div>
      </div>

      {/* Pending Edit Approvals Banner (admin-only) */}
      {isAdmin && editReqs.filter(r=>r.status==="pending").length>0 && (
        <div style={{background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:9,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.amb,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <IcAlert size={14} color={T.amb}/> {editReqs.filter(r=>r.status==="pending").length} Salary Edit Request(s) — Pending Your Approval
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {editReqs.filter(r=>r.status==="pending").map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,background:T.surface,padding:"7px 10px",borderRadius:7,border:`1px solid ${T.ambM}`}}>
                <div style={{flex:1,fontSize:11.5,color:T.t2}}>
                  <b style={{color:T.t1}}>{r.staff_name||`Staff #${r.staff_id}`}</b>
                  &nbsp;— &nbsp;₹{fmtN(Number(r.old_amount))} → <b style={{color:T.grn}}>₹{fmtN(Number(r.new_amount))}</b>
                  {r.reason&&<span style={{color:T.t4,fontStyle:"italic"}}> &nbsp;({r.reason})</span>}
                </div>
                <button onClick={()=>approveReq(r.id,"approved")}
                  style={{padding:"4px 12px",borderRadius:6,background:T.grn,color:"white",fontSize:11,fontWeight:700,border:"none",cursor:"pointer"}}>
                  ✓ Approve
                </button>
                <button onClick={()=>approveReq(r.id,"rejected")}
                  style={{padding:"4px 12px",borderRadius:6,background:T.redL,color:T.red,fontSize:11,fontWeight:700,border:`1px solid ${T.redM}`,cursor:"pointer"}}>
                  ✕ Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length===0&&!search&&<EmptyState icon={<IcTeam size={32} color={T.b2}/>} message="No staff members added yet" sub="Add monthly staff to see salary data"/>}
      {filtered.length===0&&search&&<EmptyState icon={<IcSearch size={32} color={T.b2}/>} message={`No results for "${search}"`}/>}

      {/* Table */}
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"210px 100px 90px 110px 80px 80px 100px 120px 100px",padding:"7px 14px",background:"#0D1B2A"}}>
          {["Employee","Pay Type","Basic","Gross","PF","ESI","Net Pay","Status","Actions"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {filtered.map((emp,ei)=>{
          const {gross,net,effective,pf,esi,pType,P,H,A,fullGross}=calcNet(emp);
          const isPaid=payStatus[emp.id]==="Paid";
          const hasAdv=(advances||[]).find(a=>a.empId===emp.id&&a.status==="Pending deduction");
          const deptColor=emp.dept==="Management"?T.pur:emp.dept==="Civil"?T.blu:emp.dept==="Design"?T.grn:emp.dept==="Electrical"?T.amb:T.slt;
          const isAttBased=pType==="attendance";
          return(
            <div key={emp.id} style={{display:"grid",gridTemplateColumns:"210px 100px 90px 110px 80px 80px 100px 120px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:ei%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${isAttBased?T.pur:T.grn}33`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"55"}
              onMouseLeave={e=>e.currentTarget.style.background=ei%2===0?"transparent":T.surfaceB}>

              {/* Employee */}
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <Avatar name={emp.name} size={30} color={deptColor}/>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{emp.name}</div>
                  <div style={{fontSize:10,color:T.t4}}>
                    {emp.id}
                    {isAttBased
                      ?<span style={{marginLeft:5,color:T.pur}}>{P}P {H>0?`${H}H `:""}{A>0?`${A}A `:""} = {effective}d</span>
                      :<span style={{marginLeft:5,color:T.grn}}>Full month</span>
                    }
                  </div>
                </div>
              </div>

              {/* Pay Type toggle */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {isAdmin?<button
                  onClick={()=>togglePayType(emp.id)}
                  title={isAttBased?"Switch to Fixed Monthly":"Switch to Attendance Based"}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:20,border:`1.5px solid ${isAttBased?T.pur:T.grn}`,background:isAttBased?T.purL:T.grnL,color:isAttBased?T.pur:T.grn,fontSize:10.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>
                  {isAttBased?"Attendance":"Fixed"}
                </button>:<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:20,border:`1.5px solid ${isAttBased?T.pur:T.grn}`,background:isAttBased?T.purL:T.grnL,color:isAttBased?T.pur:T.grn,fontSize:10.5,fontWeight:700,whiteSpace:"nowrap"}}><div style={{width:7,height:7,borderRadius:"50%",background:isAttBased?T.pur:T.grn,flexShrink:0}}/>{isAttBased?"Attendance":"Fixed"}</span>}
                {isAttBased&&(
                  <div style={{fontSize:9,color:T.t4,textAlign:"center"}}>
                    ₹{fmtN(Math.round(fullGross/WD))}/day
                  </div>
                )}
              </div>

              <span style={{fontSize:12.5,color:T.t2}}>₹{fmt(emp.basicSalary)}</span>

              {/* Gross — show diff if attendance cuts */}
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>₹{fmt(gross)}</div>
                {isAttBased&&gross<fullGross&&(
                  <div style={{fontSize:9.5,color:T.red}}>-₹{fmtN(fullGross-gross)} cut</div>
                )}
              </div>

              <span style={{fontSize:12,color:T.red}}>-₹{fmtN(pf)}</span>
              <span style={{fontSize:12,color:esi>0?T.red:T.t4}}>{esi>0?`-₹${fmtN(esi)}`:"—"}</span>

              <div>
                {(() => {
                  const req = reqFor(emp.id);
                  const approvedOverride = req && req.status === "approved" ? Number(req.new_amount) : null;
                  const displayNet = approvedOverride !== null ? approvedOverride : net;
                  return (
                    <>
                      <div style={{fontSize:13,fontWeight:800,color:approvedOverride!==null?T.blu:T.grn}}>
                        ₹{fmtN(displayNet)}
                      </div>
                      {approvedOverride!==null && (
                        <div style={{fontSize:9,color:T.blu}} title="Approved edit">
                          edited (was ₹{fmtN(net)})
                        </div>
                      )}
                      {req && req.status === "pending" && (
                        <div style={{fontSize:9,color:T.amb}}>edit pending</div>
                      )}
                      {hasAdv && approvedOverride === null && (
                        <div style={{fontSize:9.5,color:T.amb}}>-₹{fmtN(hasAdv.amount)} adv.</div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                {isPaid
                  ?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:T.grnL,color:T.grn,fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:20,border:`1px solid ${T.grnM}`}}><IcChk size={10} color={T.grn}/>Paid</span>
                  :<button onClick={()=>setPayStatus(p=>({...p,[emp.id]:"Paid"}))}
                    style={{padding:"4px 11px",borderRadius:20,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    Pay Now
                  </button>
                }
              </div>

              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>onViewSlip(emp,pType,paymentTypes)}
                  style={{display:"flex",alignItems:"center",gap:3,padding:"4px 9px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  <IcEye size={11} color={T.blu}/> Slip
                </button>
                {isAdmin && (
                  <button onClick={()=>openEdit(emp,net)} title="Request salary edit (needs approval)"
                    style={{display:"flex",alignItems:"center",gap:3,padding:"4px 7px",borderRadius:6,background:T.ambL,border:`1px solid ${T.ambM}`,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcEdit size={11} color={T.amb}/>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Salary Edit Request Modal ─── */}
      {editModalEmp && (
        <div onClick={()=>!editSubmitting&&setEditModalEmp(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:12,padding:20,width:440,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:T.t1}}>Request Salary Edit</div>
                <div style={{fontSize:11,color:T.t4,marginTop:2}}>{editModalEmp.name} — {MONTHS[month]} {year}</div>
              </div>
              <button onClick={()=>!editSubmitting&&setEditModalEmp(null)}
                style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
                <IcX size={18}/>
              </button>
            </div>

            <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:T.blu}}>
              ⓘ Edit will be submitted for approval. Admin/Super-admin must approve before it takes effect.
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
                Current Calculated Net
              </label>
              <div style={{fontSize:14,fontWeight:700,color:T.t2,padding:"8px 12px",background:T.b1,borderRadius:7}}>
                ₹ {fmtN(calcNet(editModalEmp).net)}
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
                New Final Salary Amount <span style={{color:T.red}}>*</span>
              </label>
              <input type="number" value={editNewAmt} onChange={e=>setEditNewAmt(e.target.value)}
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:700,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>
                Reason for Edit
              </label>
              <textarea value={editReason} onChange={e=>setEditReason(e.target.value)} rows={3}
                placeholder="e.g. Bonus for overtime, late mark waiver, etc."
                style={{width:"100%",padding:"9px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>

            {reqErr && <div style={{background:T.redL,color:T.red,padding:"7px 10px",borderRadius:6,fontSize:11,marginBottom:10,border:`1px solid ${T.redM}`}}>{reqErr}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>!editSubmitting&&setEditModalEmp(null)} disabled={editSubmitting}
                style={{padding:"8px 16px",borderRadius:7,background:"none",border:`1.5px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={submitEdit} disabled={editSubmitting}
                style={{padding:"8px 18px",borderRadius:7,background:editSubmitting?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:editSubmitting?"not-allowed":"pointer"}}>
                {editSubmitting?"Submitting...":"Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADVANCES TAB ──────────────────────────────────────────────────
function AdvancesTab({advances,setAdvances,isAdmin}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",amount:"",date:new Date().toISOString().split("T")[0],reason:""});

  const addAdvance=async()=>{
    if(!form.name||!form.amount) return;
    try{
      const res=await api.post("/payroll/advances",{name:form.name,amount:Number(form.amount),date:form.date,reason:form.reason});
      const d=res.data?.data;
      if(d) setAdvances(p=>[{id:d.id,empId:d.emp_id,name:d.name,amount:Number(d.amount),date:d.date?d.date.split("T")[0]:"",reason:d.reason,status:d.status},...p]);
    }catch(err){console.error("Add advance:",err);}
    setForm({name:"",amount:"",date:new Date().toISOString().split("T")[0],reason:""});setShowAdd(false);
  };

  const totalPending=advances.filter(a=>a.status==="Pending deduction").reduce((s,a)=>s+a.amount,0);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:10}}>
          <div style={{padding:"6px 13px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:7}}>
            <span style={{fontSize:11,color:T.amb}}>Pending Recovery: </span>
            <span style={{fontSize:14,fontWeight:800,color:T.amb}}>₹{fmtN(totalPending)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            const headers=["Adv ID","Employee","Amount","Date","Reason","Status"];
            const rows=advances.map(a=>[a.id,a.name,a.amount,a.date,a.reason,a.status]);
            exportCSV(headers,rows,"Advances_Export.csv");
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,background:T.sltL,border:`1px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            <IcDown size={12} color={T.t2}/> Export
          </button>
          {isAdmin&&<button onClick={()=>setShowAdd(!showAdd)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> New Advance
          </button>}
        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{background:T.surface,borderRadius:8,border:`1px solid ${T.b1}`,padding:"13px 14px",marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:"Name",k:"name",ph:"Employee name"},{l:"Amount (₹)",k:"amount",ph:"Amount",type:"number"},{l:"Date",k:"date",type:"date"},{l:"Reason",k:"reason",ph:"Medical, personal..."}].map(f=>(
              <div key={f.k}><label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                <input type={f.type||"text"} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/></div>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setShowAdd(false)} style={{padding:"7px 14px",borderRadius:6,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            <button onClick={addAdvance} style={{padding:"7px 14px",borderRadius:6,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Save Advance</button>
          </div>
        </div>
      )}

      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 120px 1fr 120px",padding:"7px 14px",background:T.sb}}>
          {["Adv ID","Employee","Amount","Date","Reason","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {advances.length===0&&<EmptyState icon={<IcFin size={32} color={T.b2}/>} message="No advance records" sub="No salary advances have been recorded yet"/>}
        {advances.map((adv,i)=>{
          const isPending=adv.status==="Pending deduction";
          return(
            <div key={adv.id} style={{display:"grid",gridTemplateColumns:"90px 1fr 100px 120px 1fr 120px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",borderLeft:`3px solid ${isPending?T.amb:T.grn}44`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11,fontFamily:"monospace",color:T.t4}}>{adv.id}</span>
              <span style={{fontSize:12.5,fontWeight:500,color:T.t1}}>{adv.name}</span>
              <span style={{fontSize:13,fontWeight:700,color:isPending?T.amb:T.grn}}>₹{fmtN(adv.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{adv.date}</span>
              <span style={{fontSize:12,color:T.t2,fontStyle:"italic"}}>{adv.reason}</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Pill label={adv.status==="Deducted"?"Deducted":"Pending"} c={isPending?T.amb:T.grn} bg={isPending?T.ambL:T.grnL} brd={isPending?T.ambM:T.grnM}/>
                {isPending&&isAdmin&&<button onClick={async()=>{try{await api.patch("/payroll/advances/"+adv.id,{status:"Deducted"});}catch(err){console.error(err);}setAdvances(p=>p.map(a=>a.id===adv.id?{...a,status:"Deducted"}:a));}}
                  style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:600}}>
                  Deduct
                </button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEW ADDITIONS — Manual Salary, Ledger, Mobile Punch, Settings
// ═══════════════════════════════════════════════════════════

// Extra icons needed
const IcGPS   =(p)=><Ic {...p} d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zm0 4a3 3 0 100 6 3 3 0 000-6z"/>;
const IcClockIn=(p)=><Ic {...p} d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v5l3.5 2"/>;
const IcBank  =(p)=><Ic {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10"/>;
const IcSlip  =(p)=><Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcFinLink=(p)=><Ic {...p} d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>;

const TODAY=new Date().toISOString().split("T")[0];
const addDays=(dateStr,n)=>{
  const d=new Date(dateStr);d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
};
const daysDiff2=(dateStr)=>{
  if(!dateStr) return null;
  return Math.round((new Date(dateStr)-new Date(TODAY))/(1000*86400));
};

// ── MANUAL SALARY TAB ──────────────────────────────────────
function ManualSalaryTab({salaryRecords,setSalaryRecords,defaultDueDays,month,year}){
  const blank={
    name:"",designation:"",phone:"",
    bankName:"",accountNo:"",ifsc:"",
    daysPresent:"NA",totalDays:26,
    amount:"",salaryDate:TODAY,
    dueDate:addDays(TODAY,defaultDueDays),
    notes:"",category:"Other"
  };
  const [form,setForm]=useState(blank);
  const [showForm,setShowForm]=useState(false);
  const [search,setSearch]=useState("");
  const upd=(k)=>e=>setForm(p=>{
    const updated={...p,[k]:e.target.value};
    // auto recalc dueDate when salaryDate changes
    if(k==="salaryDate") updated.dueDate=addDays(e.target.value,defaultDueDays);
    return updated;
  });

  // Existing people from monthly staff + daily workers as quick-fill
  const QUICK_FILL=[
    ...MONTHLY_STAFF.map(e=>({name:e.name,designation:e.role,bankName:e.bankAcc?.split(" ")[0]||"",accountNo:e.bankAcc||"",ifsc:e.ifsc||"",category:"Monthly Staff"})),
    ...DAILY_WORKERS.map(w=>({name:w.name,designation:w.trade,bankName:"",accountNo:"",ifsc:"",category:"Daily Worker"})),
    {name:"Sunny",designation:"Contract Worker",bankName:"",accountNo:"",ifsc:"",category:"Other"},
  ];
  const filteredQF=search?QUICK_FILL.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())):QUICK_FILL;

  const fillFrom=(person)=>{
    setForm(p=>({...p,name:person.name,designation:person.designation,bankName:person.bankName,accountNo:person.accountNo,ifsc:person.ifsc,category:person.category}));
    setSearch("");
  };

  const handleCreate=async()=>{
    if(!form.name.trim()||!form.amount) return;
    try{
      const res=await api.post("/payroll/salary-records",{
        name:form.name,designation:form.designation,phone:form.phone,
        bank_name:form.bankName,account_no:form.accountNo,ifsc:form.ifsc,
        days_present:form.daysPresent,total_days:form.totalDays,
        amount:Number(form.amount),salary_date:form.salaryDate,
        due_date:form.dueDate,notes:form.notes,category:form.category,
        month_num:month,year_num:year,
      });
      const d=res.data?.data;
      if(d){
        const rec={
          id:d.id,name:d.name,designation:d.designation,phone:d.phone,
          bankName:d.bank_name,accountNo:d.account_no,ifsc:d.ifsc,
          daysPresent:d.days_present,totalDays:d.total_days,
          amount:Number(d.amount),salaryDate:d.salary_date?d.salary_date.split("T")[0]:"",
          dueDate:d.due_date?d.due_date.split("T")[0]:"",notes:d.notes,category:d.category,
          month:d.month_num,year:d.year_num,status:d.status,
          createdAt:d.created_at,paidDate:d.paid_date,paidBy:d.paid_by,txRef:d.tx_ref,
        };
        setSalaryRecords(p=>[rec,...p]);
      }
    }catch(err){console.error("Create salary:",err);}
    setForm(blank);setShowForm(false);
  };

  const monthRecords=salaryRecords.filter(r=>r.month===month&&r.year===year);
  const totalCreated=monthRecords.reduce((s,r)=>s+r.amount,0);
  const totalPaid=monthRecords.filter(r=>r.status==="Paid").reduce((s,r)=>s+r.amount,0);
  const totalPending=monthRecords.filter(r=>r.status==="Pending").reduce((s,r)=>s+r.amount,0);

  return(
    <div>
      {/* Summary bar */}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        {[{l:"Total Created",v:`₹${fmtN(totalCreated)}`,c:T.blu},{l:"Paid",v:`₹${fmtN(totalPaid)}`,c:T.grn},{l:"Pending",v:`₹${fmtN(totalPending)}`,c:totalPending>0?T.amb:T.grn}].map((s,i)=>(
          <div key={i} style={{padding:"6px 14px",background:T.surface,border:`1.5px solid ${s.c}33`,borderRadius:8,borderLeft:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px"}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        ))}
        <div style={{marginLeft:"auto"}}>
          <button onClick={()=>setShowForm(s=>!s)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",boxShadow:`0 3px 10px ${T.blu}44`}}>
            <IcAdd size={14} color="white"/> Create Salary
          </button>
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm&&(
        <div style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.bluM}`,padding:"16px 18px",marginBottom:14,boxShadow:`0 2px 12px ${T.blu}11`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.t1,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <IcSlip size={15} color={T.blu}/> Create Salary Entry
          </div>

          {/* Quick fill search */}
          <div style={{marginBottom:12,padding:"10px 12px",background:T.bluL,borderRadius:7,border:`1px solid ${T.bluM}`}}>
            <div style={{fontSize:10,color:T.blu,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Quick Fill from Existing Person</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type name to search..."
                style={{width:"100%",height:30,padding:"0 8px 0 26px",borderRadius:6,border:`1px solid ${T.bluM}`,fontSize:12,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {search&&(
              <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:5}}>
                {filteredQF.map((p,i)=>(
                  <button key={i} onClick={()=>fillFrom(p)}
                    style={{padding:"4px 10px",borderRadius:20,background:"white",border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>
                    {p.name} <span style={{opacity:.6,fontSize:10}}>({p.category})</span>
                  </button>
                ))}
                {filteredQF.length===0&&<span style={{fontSize:11,color:T.t4}}>No match — fill manually below</span>}
              </div>
            )}
          </div>

          {/* Form grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {[{l:"Full Name *",k:"name",ph:"Employee / Worker name",col:1},{l:"Designation",k:"designation",ph:"Role / Trade",col:1},{l:"Phone",k:"phone",ph:"Mobile number",col:1}].map(f=>(
              <div key={f.k}>
                <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                <input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                  style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
              </div>
            ))}
          </div>

          {/* Bank details */}
          <div style={{padding:"10px 12px",background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,marginBottom:10}}>
            <div style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7,display:"flex",alignItems:"center",gap:6}}>
              <IcBank size={12} color={T.t3}/> Bank Details
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
              {[{l:"Bank Name",k:"bankName",ph:"SBI, HDFC..."},{l:"Account No",k:"accountNo",ph:"Account number"},{l:"IFSC Code",k:"ifsc",ph:"SBIN0001234"}].map(f=>(
                <div key={f.k}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                  <input value={form[f.k]} onChange={upd(f.k)} placeholder={f.ph}
                    style={{width:"100%",padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              ))}
            </div>
          </div>

          {/* Salary calculation */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {/* Days Present */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Days Present</label>
              <div style={{display:"flex",gap:5}}>
                <input value={form.daysPresent} onChange={upd("daysPresent")} placeholder="e.g. 22 or NA"
                  style={{flex:1,padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <button onClick={()=>setForm(p=>({...p,daysPresent:"NA"}))}
                  style={{padding:"0 9px",borderRadius:7,background:form.daysPresent==="NA"?T.slt:T.sltL,color:form.daysPresent==="NA"?"white":T.slt,border:`1px solid ${T.b2}`,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  NA
                </button>
              </div>
              {form.daysPresent==="NA"&&<div style={{fontSize:10,color:T.slt,marginTop:3}}>Fixed salary — no deduction</div>}
            </div>
            {/* Total / Working days */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Working Days</label>
              <input type="number" value={form.totalDays} onChange={upd("totalDays")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {/* Amount */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Net Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={upd("amount")} placeholder="Total salary to pay"
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${form.amount?T.grn:T.b1}`,fontSize:13,fontWeight:form.amount?700:400,color:form.amount?T.grn:T.t1,background:form.amount?T.grnL:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>{if(!form.amount)e.target.style.borderColor=T.b1;}}/>
              {form.amount&&<div style={{fontSize:10.5,color:T.grn,marginTop:2,fontWeight:600}}>₹ {fmtN(Number(form.amount))}</div>}
            </div>
            {/* Category */}
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Category</label>
              <select value={form.category} onChange={upd("category")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
                {["Monthly Staff","Daily Worker","Contractor","Consultant","Other"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Salary Date</label>
              <input type="date" value={form.salaryDate} onChange={upd("salaryDate")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>
                Due Date
                <span style={{marginLeft:5,color:T.blu,fontSize:9,fontWeight:400}}>← Editable (default +{defaultDueDays}d)</span>
              </label>
              <input type="date" value={form.dueDate} onChange={upd("dueDate")}
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.amb}`,fontSize:12.5,color:T.amb,background:T.ambL,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              {form.dueDate&&<div style={{fontSize:10,color:T.amb,marginTop:2}}>
                {daysDiff2(form.dueDate)>0?`Due in ${daysDiff2(form.dueDate)} days`:daysDiff2(form.dueDate)===0?"Due today!":"Overdue!"}
              </div>}
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>Notes</label>
              <input value={form.notes} onChange={upd("notes")} placeholder="March salary, contract etc."
                style={{width:"100%",padding:"8px 9px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
          </div>

          {/* Finance link info */}
          <div style={{padding:"9px 12px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:7,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
            <IcFinLink size={13} color={T.grn}/>
            <span style={{fontSize:11.5,color:T.grn}}>
              This salary will automatically appear in <strong>Finance → Pending Payments</strong> on due date (warning 7 days before)
            </span>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setShowForm(false);setForm(blank);}}
              style={{flex:1,padding:"10px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={!form.name.trim()||!form.amount}
              style={{flex:2,padding:"10px",borderRadius:7,background:form.name.trim()&&form.amount?T.grn:T.b1,color:form.name.trim()&&form.amount?"white":T.t4,fontSize:13,fontWeight:700,border:"none",cursor:form.name.trim()&&form.amount?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              <IcChk size={14} color={form.name.trim()&&form.amount?"white":T.t4}/> Create Salary Entry
            </button>
          </div>
        </div>
      )}

      {/* SALARY LIST for this month */}
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 120px 120px 120px 100px",padding:"7px 14px",background:T.sb}}>
          {["Sal ID","Name / Role","Category","Amount","Salary Date","Due Date","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {monthRecords.length===0&&(
          <div style={{padding:"40px",textAlign:"center",color:T.t4}}>
            <IcSlip size={32} color={T.b2}/>
            <div style={{fontSize:13,marginTop:8}}>No salary entries for {MONTHS[month]} {year}</div>
            <div style={{fontSize:11.5,color:T.t4,marginTop:3}}>Click "Create Salary" to add entries</div>
          </div>
        )}
        {monthRecords.map((rec,i)=>{
          const diff=daysDiff2(rec.dueDate);
          const isOverdue=diff!==null&&diff<0&&rec.status==="Pending";
          const isDueSoon=diff!==null&&diff>=0&&diff<=7&&rec.status==="Pending";
          const statusC=rec.status==="Paid"?{c:T.grn,bg:T.grnL,brd:T.grnM}:isOverdue?{c:T.red,bg:T.redL,brd:T.redM}:isDueSoon?{c:T.amb,bg:T.ambL,brd:T.ambM}:{c:T.slt,bg:T.sltL,brd:T.b2};
          return(
            <div key={rec.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 120px 120px 120px 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${statusC.c}44`,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
              <span style={{fontSize:10.5,fontFamily:"monospace",color:T.t4}}>{rec.id.slice(-6)}</span>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{rec.name}</div>
                <div style={{fontSize:10.5,color:T.t4}}>{rec.designation} {rec.daysPresent!=="NA"?`· ${rec.daysPresent}/${rec.totalDays} days`:"· Fixed"}</div>
              </div>
              <span style={{fontSize:11,color:T.t3}}>{rec.category}</span>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(rec.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.salaryDate}</span>
              <div>
                <div style={{fontSize:11.5,fontWeight:600,color:isOverdue?T.red:isDueSoon?T.amb:T.t3}}>{rec.dueDate}</div>
                {isOverdue&&<div style={{fontSize:9.5,color:T.red}}>Overdue {Math.abs(diff)}d</div>}
                {isDueSoon&&<div style={{fontSize:9.5,color:T.amb}}>Due in {diff}d ⚠</div>}
              </div>
              <Pill label={rec.status} c={statusC.c} bg={statusC.bg} brd={statusC.brd}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── SALARY LEDGER TAB ──────────────────────────────────────────────
function SalaryLedgerTab({salaryRecords,setSalaryRecords,month,year}){
  const [filterStatus,setFilterStatus]=useState("All");
  const [filterMonth,setFilterMonth]=useState("current"); // current | all
  const [markPayModal,setMarkPayModal]=useState(null);
  const [payForm,setPayForm]=useState({paidDate:TODAY,paidBy:localStorage.getItem("gb_user_name")||"",txRef:""});

  const records=salaryRecords.filter(r=>{
    if(filterMonth==="current"&&(r.month!==month||r.year!==year)) return false;
    if(filterStatus!=="All"&&r.status!==filterStatus) return false;
    return true;
  });

  // Summary
  const allRecs=filterMonth==="current"?salaryRecords.filter(r=>r.month===month&&r.year===year):salaryRecords;
  const totalCreated=allRecs.reduce((s,r)=>s+r.amount,0);
  const totalPaid=allRecs.filter(r=>r.status==="Paid").reduce((s,r)=>s+r.amount,0);
  const totalPending=allRecs.filter(r=>r.status==="Pending").reduce((s,r)=>s+r.amount,0);
  const overdue=allRecs.filter(r=>r.status==="Pending"&&daysDiff2(r.dueDate)<0).length;
  const dueSoon=allRecs.filter(r=>r.status==="Pending"&&daysDiff2(r.dueDate)>=0&&daysDiff2(r.dueDate)<=7).length;

  const markPaid=async(rec)=>{
    try{
      await api.patch("/payroll/salary-records/"+rec.id,{status:"Paid",paid_date:payForm.paidDate,paid_by:payForm.paidBy,tx_ref:payForm.txRef});
    }catch(err){console.error("Mark paid:",err);}
    setSalaryRecords(p=>p.map(r=>r.id===rec.id?{...r,status:"Paid",paidDate:payForm.paidDate,paidBy:payForm.paidBy,txRef:payForm.txRef}:r));
    setMarkPayModal(null);
  };

  return(
    <div>
      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Total Salary",v:`₹${fmt(totalCreated)}`,c:T.blu},
          {l:"Paid",v:`₹${fmt(totalPaid)}`,c:T.grn},
          {l:"Pending",v:`₹${fmt(totalPending)}`,c:totalPending>0?T.amb:T.grn},
          {l:"Overdue",v:overdue,c:overdue>0?T.red:T.grn,isBig:true},
          {l:"Due in 7 days",v:dueSoon,c:dueSoon>0?T.amb:T.grn,isBig:true},
        ].map((s,i)=>(
          <div key={i} style={{padding:"10px 13px",background:T.surface,border:`1.5px solid ${s.c}22`,borderRadius:8,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:s.isBig?22:16,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Finance link notice */}
      {(overdue>0||dueSoon>0)&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 13px",background:overdue>0?T.redL:T.ambL,border:`1px solid ${overdue>0?T.redM:T.ambM}`,borderRadius:7,marginBottom:10}}>
          <IcAlert size={13} color={overdue>0?T.red:T.amb}/>
          <span style={{fontSize:12,fontWeight:600,color:overdue>0?T.red:T.amb}}>
            {overdue>0?`${overdue} salary payments overdue!`:""} {dueSoon>0?`${dueSoon} payments due within 7 days — check Finance module`:""}
          </span>
          <span style={{marginLeft:"auto",fontSize:10.5,color:T.t4,display:"flex",alignItems:"center",gap:4}}>
            <IcFinLink size={11} color={T.t4}/> Visible in Finance → Pending Payments
          </span>
        </div>
      )}

      {/* Controls */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        {["All","Pending","Paid"].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${filterStatus===s?T.blu:T.b1}`,background:filterStatus===s?T.bluL:"none",color:filterStatus===s?T.blu:T.t3,fontSize:11.5,fontWeight:filterStatus===s?700:400,cursor:"pointer"}}>
            {s} {s!=="All"&&<span style={{fontWeight:800}}>{allRecs.filter(r=>r.status===s).length}</span>}
          </button>
        ))}
        <div style={{display:"flex",gap:2,background:T.surfaceB,borderRadius:7,border:`1px solid ${T.b1}`,padding:3,marginLeft:8}}>
          {[["current","This Month"],["all","All Time"]].map(([id,l])=>(
            <button key={id} onClick={()=>setFilterMonth(id)}
              style={{padding:"4px 10px",borderRadius:5,border:"none",background:filterMonth===id?T.blu:"none",color:filterMonth===id?"white":T.t3,fontSize:11.5,fontWeight:filterMonth===id?700:400,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
        <span style={{fontSize:11,color:T.t4,marginLeft:4}}>{records.length} records · ₹{fmtN(records.reduce((s,r)=>s+r.amount,0))} total</span>
      </div>

      {/* Table */}
      <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 90px 110px 110px 110px 120px 90px",padding:"7px 14px",background:T.sb}}>
          {["Name / Role","Amount","Salary Date","Due Date","Days","Bank","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
          ))}
        </div>
        {records.map((rec,i)=>{
          const diff=daysDiff2(rec.dueDate);
          const isOverdue=diff!==null&&diff<0&&rec.status==="Pending";
          const isDueSoon=diff!==null&&diff>=0&&diff<=7&&rec.status==="Pending";
          const statusC=rec.status==="Paid"?{c:T.grn,bg:T.grnL,brd:T.grnM}:isOverdue?{c:T.red,bg:T.redL,brd:T.redM}:isDueSoon?{c:T.amb,bg:T.ambL,brd:T.ambM}:{c:T.slt,bg:T.sltL,brd:T.b2};
          return(
            <div key={rec.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 110px 110px 110px 120px 90px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB,borderLeft:`3px solid ${statusC.c}55`}}
              onMouseEnter={e=>e.currentTarget.style.background=T.sltL}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.surfaceB}>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{rec.name}</div>
                <div style={{fontSize:10,color:T.t4}}>{rec.designation} · {rec.category} · {MONTHS[rec.month]} {rec.year}</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>₹{fmtN(rec.amount)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.salaryDate}</span>
              <div>
                <div style={{fontSize:11.5,fontWeight:600,color:isOverdue?T.red:isDueSoon?T.amb:T.t3}}>{rec.dueDate}</div>
                {isOverdue&&<div style={{fontSize:9,color:T.red,fontWeight:700}}>OVERDUE {Math.abs(diff)}d</div>}
                {isDueSoon&&<div style={{fontSize:9,color:T.amb,fontWeight:700}}>DUE IN {diff}d</div>}
              </div>
              <span style={{fontSize:11.5,color:T.t3}}>{rec.daysPresent==="NA"?"Fixed":`${rec.daysPresent}/${rec.totalDays}`}</span>
              <div>
                <div style={{fontSize:11,color:T.t2}}>{rec.bankName||"—"}</div>
                <div style={{fontSize:9.5,color:T.t4}}>{rec.accountNo?rec.accountNo.slice(-6)+"...":"—"}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <Pill label={rec.status} c={statusC.c} bg={statusC.bg} brd={statusC.brd}/>
                {rec.status==="Pending"&&(
                  <button onClick={()=>setMarkPayModal(rec)}
                    style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,cursor:"pointer",fontWeight:700}}>
                    Mark Paid
                  </button>
                )}
                {rec.status==="Paid"&&rec.paidDate&&(
                  <div style={{fontSize:9,color:T.t4}}>Paid {rec.paidDate}</div>
                )}
              </div>
            </div>
          );
        })}
        {records.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4,fontSize:13}}>No records match</div>}
      </div>

      {/* Mark Paid Modal */}
      {markPayModal&&(<>
        <div onClick={()=>setMarkPayModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,backdropFilter:"blur(1px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,width:"min(420px,95vw)",boxShadow:"0 24px 64px rgba(0,0,0,0.25)",zIndex:401,overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
          <div style={{background:T.sb,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>Mark as Paid</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.45)"}}>{markPayModal.name} · ₹{fmtN(markPayModal.amount)}</div>
            </div>
            <button onClick={()=>setMarkPayModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}><IcX size={13}/></button>
          </div>
          <div style={{padding:"14px 16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
              {[{l:"Paid Date",k:"paidDate",type:"date"},{l:"Paid By",k:"paidBy",ph:"Who processed"},{l:"Tx Reference",k:"txRef",ph:"UTR / Cheque no",col:2}].map(f=>(
                <div key={f.k} style={{gridColumn:f.col===2?"span 2":"span 1"}}>
                  <label style={{fontSize:9.5,fontWeight:600,color:T.t4,textTransform:"uppercase",letterSpacing:".3px",display:"block",marginBottom:3}}>{f.l}</label>
                  <input type={f.type||"text"} value={payForm[f.k]} onChange={e=>setPayForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor=T.grn} onBlur={e=>e.target.style.borderColor=T.b1}/>
                </div>
              ))}
            </div>
            {/* Finance sync note */}
            <div style={{padding:"7px 10px",background:T.grnL,border:`1px solid ${T.grnM}`,borderRadius:6,marginBottom:12,fontSize:11.5,color:T.grn}}>
              <IcFinLink size={11} color={T.grn} style={{marginRight:5}}/> Payment will sync to Finance module automatically
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setMarkPayModal(null)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>markPaid(markPayModal)}
                style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <IcChk size={14} color="white"/> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}


// ── MOBILE PUNCH IN/OUT ───────────────────────────────────────────
function MobilePunchTab(){
  const [punchState,setPunchState]=useState("out");
  const [selProject,setSelProject]=useState("");
  const [location,setLocation]=useState(null);
  const [locLoading,setLocLoading]=useState(false);
  const [punchLog,setPunchLog]=useState([]);
  const [workerName,setWorkerName]=useState("");
  const [punchTime,setPunchTime]=useState(null);

  useEffect(()=>{
    (async()=>{
      try{
        const res=await api.get("/payroll/punch-logs");
        setPunchLog((res.data?.data||[]).map(p=>{
          const t=p.punch_time?new Date(p.punch_time):new Date();
          return{id:p.id,name:p.name,action:p.action,project:p.project||"",
            time:t.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}),
            date:t.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
            lat:p.lat,lng:p.lng,location:p.location||""};
        }));
      }catch(err){console.error(err);}
    })();
  },[]);

  useEffect(()=>{
    const allW=[...MONTHLY_STAFF.map(e=>e.name),...DAILY_WORKERS.map(w=>w.name)];
    if(allW.length>0&&!workerName) setWorkerName(allW[0]);
  },[workerName]);

  const getLocation=()=>{
    setLocLoading(true);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos=>{setLocation({lat:pos.coords.latitude,lng:pos.coords.longitude,address:`${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`});setLocLoading(false);},
        ()=>{setLocation({lat:0,lng:0,address:"Location permission denied"});setLocLoading(false);},
        {timeout:10000}
      );
    }else{setLocation({lat:0,lng:0,address:"GPS not available"});setLocLoading(false);}
  };

  const doPunch=async(action)=>{
    const now=new Date();
    const timeStr=now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const entry={
      id:Date.now(),name:workerName,action,project:selProject||"Unknown",
      time:timeStr,date:now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
      lat:location?.lat||0,lng:location?.lng||0,
      location:location?.address||"Location not captured",
    };
    setPunchLog(p=>[entry,...p]);
    setPunchState(action==="IN"?"in":"out");
    setPunchTime(timeStr);
    try{
      await api.post("/payroll/punch-logs",{name:workerName,action,project:selProject||null,punch_time:now.toISOString(),lat:location?.lat||null,lng:location?.lng||null,location:location?.address||null});
    }catch(err){console.error("Punch:",err);}
  };

  const ALL_WORKERS=[...MONTHLY_STAFF.map(e=>e.name),...DAILY_WORKERS.map(w=>w.name)];

  return(
    <div style={{maxWidth:480,margin:"0 auto"}}>
      {/* Mobile-style header */}
      <div style={{background:T.sb,borderRadius:12,padding:"16px 20px",marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Site Attendance</div>
        <div style={{fontSize:28,fontWeight:800,color:"white",letterSpacing:"-1px"}}>
          {new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
      </div>

      {/* Worker select */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"13px 16px",marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6}}>Worker / Employee</label>
        <select value={workerName} onChange={e=>setWorkerName(e.target.value)}
          style={{width:"100%",padding:"11px 12px",borderRadius:8,border:`1.5px solid ${T.blu}`,background:T.bluL,fontSize:14,fontWeight:600,color:T.blu,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
          {ALL_WORKERS.map(n=><option key={n}>{n}</option>)}
        </select>
      </div>

      {/* Project select */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,padding:"13px 16px",marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6}}>Project / Site</label>
        <select value={selProject} onChange={e=>setSelProject(e.target.value)}
          style={{width:"100%",padding:"11px 12px",borderRadius:8,border:`1.5px solid ${T.b1}`,background:T.surface,fontSize:13.5,color:T.t1,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
          <option value="">Select project...</option>
          {PROJECTS.map(p=><option key={p}>{p}</option>)}
        </select>
      </div>

      {/* GPS Location */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${location?T.grnM:T.b1}`,padding:"13px 16px",marginBottom:14,transition:"border .2s"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:location?T.grnL:T.sltL,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <IcGPS size={15} color={location?T.grn:T.slt}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:location?T.grn:T.t2}}>
                {location?"Location Captured":"GPS Location"}
              </div>
              <div style={{fontSize:10.5,color:T.t4}}>{location?location.address:"Not captured yet"}</div>
            </div>
          </div>
          <button onClick={getLocation} disabled={locLoading}
            style={{padding:"7px 13px",borderRadius:7,background:location?T.grnL:T.blu,color:location?T.grn:"white",border:`1px solid ${location?T.grnM:"transparent"}`,fontSize:12,fontWeight:700,cursor:locLoading?"wait":"pointer"}}>
            {locLoading?"Detecting...":(location?"Re-capture":"Capture GPS")}
          </button>
        </div>
        {location&&<div style={{marginTop:6,fontSize:10,color:T.t4,fontFamily:"monospace"}}>
          {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
        </div>}
      </div>

      {/* PUNCH BUTTONS — big mobile-friendly */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {/* PUNCH IN */}
        <button
          onClick={()=>{if(!selProject){alert("Please select a project first");return;}doPunch("IN");}}
          disabled={punchState==="in"}
          style={{
            padding:"24px 16px",borderRadius:14,
            background:punchState==="in"?T.grnL:`linear-gradient(135deg,${T.grn},#047857)`,
            color:punchState==="in"?T.grn:"white",
            border:punchState==="in"?`2px solid ${T.grnM}`:"none",
            cursor:punchState==="in"?"default":"pointer",
            fontSize:15,fontWeight:800,
            boxShadow:punchState==="in"?"none":"0 8px 24px rgba(5,150,105,0.4)",
            transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:8
          }}>
          <IcClockIn size={28} color={punchState==="in"?T.grn:"white"}/>
          {punchState==="in"?"PUNCHED IN":"PUNCH IN"}
          {punchState==="in"&&punchTime&&<span style={{fontSize:11,fontWeight:400}}>at {punchTime}</span>}
        </button>
        {/* PUNCH OUT */}
        <button
          onClick={()=>{if(!selProject){alert("Please select a project first");return;}doPunch("OUT");}}
          disabled={punchState==="out"}
          style={{
            padding:"24px 16px",borderRadius:14,
            background:punchState==="out"?T.sltL:`linear-gradient(135deg,${T.red},#b91c1c)`,
            color:punchState==="out"?T.slt:"white",
            border:punchState==="out"?`2px solid ${T.b2}`:"none",
            cursor:punchState==="out"?"default":"pointer",
            fontSize:15,fontWeight:800,
            boxShadow:punchState==="out"?"none":"0 8px 24px rgba(220,38,38,0.4)",
            transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:8
          }}>
          <IcClockIn size={28} color={punchState==="out"?T.slt:"white"}/>
          {punchState==="out"?"NOT PUNCHED":"PUNCH OUT"}
        </button>
      </div>

      {/* Today's punch log */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,fontWeight:700,color:T.t1}}>Today's Punch Log</span>
          <span style={{fontSize:10.5,color:T.t4}}>{punchLog.length} entries</span>
        </div>
        {punchLog.slice(0,6).map((p,i)=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderBottom:i<punchLog.length-1?`1px solid ${T.b1}`:"none"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:p.action==="IN"?T.grnL:T.redL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <IcClockIn size={13} color={p.action==="IN"?T.grn:T.red}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{p.name}</span>
                <span style={{fontSize:10.5,fontWeight:700,color:p.action==="IN"?T.grn:T.red}}>{p.action}</span>
                <span style={{fontSize:10.5,color:T.t4}}>{p.time}</span>
              </div>
              <div style={{fontSize:10.5,color:T.t4,display:"flex",alignItems:"center",gap:4,marginTop:1}}>
                <IcGPS size={9} color={T.t4}/>{p.location}
              </div>
            </div>
            <div style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>
              <div>{p.project.slice(0,15)}{p.project.length>15?"…":""}</div>
              <div>{p.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PAYROLL SETTINGS SECTION ──────────────────────────────────────
function PayrollSettingsTab({defaultDueDays,setDefaultDueDays,workingDays,setWorkingDays}){
  const [saved,setSaved]=useState(false);
  const [localDays,setLocalDays]=useState(defaultDueDays);
  const [localWorkDays,setLocalWorkDays]=useState(workingDays);

  const save=async()=>{
    setDefaultDueDays(Number(localDays));
    if(setWorkingDays) setWorkingDays(Number(localWorkDays));
    try{await api.put("/payroll/settings",{default_due_days:Number(localDays),working_days:Number(localWorkDays)});}catch(err){console.error("Save settings:",err);}
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  return(
    <div style={{maxWidth:600}}>
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"12px 16px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:8}}>
          <IcPay size={14} color={T.blu}/>
          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Salary Payment Settings</span>
        </div>
        <div style={{padding:"16px"}}>
          {/* Default due days */}
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:T.t1,display:"block",marginBottom:4}}>
              Default Payment Due Days
            </label>
            <div style={{fontSize:12,color:T.t3,marginBottom:8,lineHeight:1.6}}>
              After salary creation date, how many days later should payment be due?
              <br/>Example: Salary created on 30 March + <strong>{localDays} days</strong> = Due on {addDays("2026-03-30",Number(localDays))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <input type="range" min={1} max={30} value={localDays} onChange={e=>setLocalDays(e.target.value)}
                style={{flex:1,accentColor:T.blu}}/>
              <div style={{display:"flex",alignItems:"center",gap:6,background:T.bluL,border:`1.5px solid ${T.bluM}`,borderRadius:8,padding:"6px 12px"}}>
                <input type="number" min={1} max={30} value={localDays} onChange={e=>setLocalDays(e.target.value)}
                  style={{width:40,border:"none",background:"transparent",fontSize:18,fontWeight:800,color:T.blu,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                <span style={{fontSize:12,color:T.blu,fontWeight:600}}>days</span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{display:"flex",gap:7,marginTop:8,flexWrap:"wrap"}}>
              {[[5,"5 Days"],[7,"1 Week"],[10,"10 Days"],[15,"15 Days"],[30,"Month End"]].map(([d,l])=>(
                <button key={d} onClick={()=>setLocalDays(d)}
                  style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${Number(localDays)===d?T.blu:T.b1}`,background:Number(localDays)===d?T.bluL:"none",color:Number(localDays)===d?T.blu:T.t3,fontSize:11.5,fontWeight:Number(localDays)===d?700:400,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Warning period */}
          <div style={{padding:"12px 14px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8,marginBottom:16}}>
            <div style={{fontSize:11.5,fontWeight:700,color:T.amb,marginBottom:4}}>Finance Alert Settings</div>
            <div style={{fontSize:12,color:"#92400E",lineHeight:1.6}}>
              Salary payments appear in Finance → Pending Payments when due date is within
              <strong style={{color:T.amb,margin:"0 4px"}}>7 days</strong>
              (fixed). Overdue payments are highlighted in red immediately.
            </div>
          </div>

          {/* Working days */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:T.t1,display:"block",marginBottom:4}}>Working Days Per Month</label>
            <div style={{fontSize:12,color:T.t3,marginBottom:6}}>Used to calculate pro-rata attendance-based salaries</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min={20} max={31} value={localWorkDays} onChange={e=>setLocalWorkDays(e.target.value)}
                style={{width:70,padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:14,fontWeight:600,color:T.t1,outline:"none",textAlign:"center",fontFamily:"inherit"}}/>
              <span style={{fontSize:12,color:T.t3}}>days (current: {workingDays} days)</span>
            </div>
          </div>

          <button onClick={save}
            style={{padding:"10px 24px",borderRadius:8,background:saved?T.grn:T.blu,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"background .2s"}}>
            {saved?<><IcChk size={14} color="white"/> Settings Saved!</>:<><IcChk size={14} color="white"/> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Finance pending payments preview */}
      <div style={{background:T.surface,borderRadius:10,border:`1.5px solid ${T.ambM}`,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",background:T.ambL,borderBottom:`1px solid ${T.ambM}`,display:"flex",alignItems:"center",gap:8}}>
          <IcFinLink size={14} color={T.amb}/>
          <span style={{fontSize:13,fontWeight:700,color:T.amb}}>How Finance Integration Works</span>
        </div>
        <div style={{padding:"14px 16px"}}>
          {[
            {step:"1",title:"Salary Create karo",desc:"Payroll → Manual Salary tab mein entry banao — name, amount, due date set karo",c:T.blu},
            {step:"2",title:"Auto Finance Queue",desc:"Due date 7 days se kam bacha → Finance → Pending Payments mein amber warning",c:T.amb},
            {step:"3",title:"Due Date pe Red Alert",desc:"Due date aa gayi → Finance mein red urgent highlight",c:T.red},
            {step:"4",title:"Finance Mark Paid",desc:"Finance team payment kare → Salary Ledger mein Paid update ho jaata hai",c:T.grn},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:12,marginBottom:i<3?12:0}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:s.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:"white"}}>{s.step}</div>
              <div><div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{s.title}</div><div style={{fontSize:11.5,color:T.t3,marginTop:2}}>{s.desc}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DAILY WAGES LABOUR: Workers CRUD Tab (Phase 3) ───────────────
// ══════════════════════════════════════════════════════════════════
function DailyWorkersTab({workers,setWorkers,isAdmin}){
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null); // {mode:"add"|"edit", data:{}}
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  const SKILLS=["Mason","Helper","Electrician","Plumber","Painter","Carpenter","Steel Fixer","Welder","Supervisor","Other"];

  const open=(mode,data)=>{
    setModal({mode,data: data || {name:"",skill:"",rate_per_day:"",rate_ot:"",phone:"",contractor:"",project:""}});
    setErr("");
  };
  const close=()=>{ if(!saving){ setModal(null); setErr(""); } };

  const save=async()=>{
    const d=modal.data;
    if(!d.name || !d.name.trim()){ setErr("Name is required"); return; }
    if(!d.rate_per_day || Number(d.rate_per_day)<=0){ setErr("Rate per day required"); return; }
    setSaving(true);setErr("");
    try{
      const payload={
        name:d.name.trim(),
        skill:d.skill||null,
        trade:d.skill||null,
        rate_per_day:Number(d.rate_per_day)||0,
        rate_ot:Number(d.rate_ot)||0,
        phone:d.phone||null,
        contractor:d.contractor||null,
        project:d.project||null,
      };
      let res;
      if(modal.mode==="add"){
        res=await api.post("/payroll/workers",payload);
      }else{
        res=await api.patch(`/payroll/workers/${d.id}`,payload);
      }
      if(res.success){
        // Reload workers list
        const r=await api.get("/payroll/workers");
        if(r.success){
          setWorkers((r.data?.data||r.data||[]).map(w=>({
            id:w.id,name:w.name,trade:w.trade||w.skill||"",skill:w.skill||w.trade||"",
            ratePerDay:Number(w.rate_per_day)||0,rateOT:Number(w.rate_ot)||0,
            rate_per_day:Number(w.rate_per_day)||0,rate_ot:Number(w.rate_ot)||0,
            project:w.project||"",contractor:w.contractor||"Self",phone:w.phone||"",
          })));
        }
        setModal(null);
      }else{ setErr(res.message||"Save failed"); }
    }catch(e){ setErr(e.message||"Network error"); }
    setSaving(false);
  };

  const remove=async(w)=>{
    if(!window.confirm(`Remove worker "${w.name}"?`)) return;
    try{
      const res=await api.delete(`/payroll/workers/${w.id}`);
      if(res.success) setWorkers(p=>p.filter(x=>x.id!==w.id));
    }catch(e){ alert(e.message); }
  };

  const filtered=workers.filter(w=>!search||
    (w.name||"").toLowerCase().includes(search.toLowerCase())||
    (w.skill||w.trade||"").toLowerCase().includes(search.toLowerCase()));

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",minWidth:240}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={12} color={T.t4}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or skill..."
            style={{height:32,padding:"0 8px 0 26px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11.5,color:T.t3}}>Total: <b style={{color:T.t1}}>{workers.length}</b></span>
          {isAdmin&&<button onClick={()=>open("add")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
            <IcAdd size={13} color="white"/> Add Worker
          </button>}
        </div>
      </div>

      {filtered.length===0&&<EmptyState icon={<div style={{fontSize:40}}>👷</div>} message={search?"No matching workers":"No workers yet"} sub={search?"":"Add workers to start tracking attendance"}/>}

      {/* Table */}
      {filtered.length>0&&(
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1.3fr 1fr 100px",padding:"8px 14px",background:"#0D1B2A"}}>
            {["Worker","Skill","Rate/Day","OT Rate","Contractor","Phone","Actions"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {filtered.map((w,i)=>(
            <div key={w.id} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1.3fr 1fr 100px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <Avatar name={w.name} size={28} color={T.amb}/>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{w.name}</div>
              </div>
              <span style={{fontSize:11.5,color:T.t2}}>{w.skill||w.trade||"—"}</span>
              <span style={{fontSize:12,fontWeight:600,color:T.t1}}>₹{fmtN(w.ratePerDay||w.rate_per_day||0)}</span>
              <span style={{fontSize:12,color:T.t3}}>₹{fmtN(w.rateOT||w.rate_ot||0)}</span>
              <span style={{fontSize:11.5,color:T.t3}}>{w.contractor||"Self"}</span>
              <span style={{fontSize:11,color:T.t4}}>{w.phone||"—"}</span>
              <div style={{display:"flex",gap:5}}>
                {isAdmin&&<>
                  <button onClick={()=>open("edit",{...w,rate_per_day:w.ratePerDay||w.rate_per_day,rate_ot:w.rateOT||w.rate_ot,skill:w.skill||w.trade})}
                    style={{padding:"4px 8px",borderRadius:6,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcEdit size={11} color={T.blu}/>
                  </button>
                  <button onClick={()=>remove(w)}
                    style={{padding:"4px 8px",borderRadius:6,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    <IcX size={11} color={T.red}/>
                  </button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div onClick={close} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:12,padding:22,width:480,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800,color:T.t1}}>
                {modal.mode==="add"?"Add Worker":"Edit Worker"}
              </div>
              <button onClick={close} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.t4}}>
                <IcX size={18}/>
              </button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{gridColumn:"span 2"}}>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Name *</label>
                <input value={modal.data.name} onChange={e=>setModal({...modal,data:{...modal.data,name:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Skill</label>
                <select value={modal.data.skill||""} onChange={e=>setModal({...modal,data:{...modal.data,skill:e.target.value}})}
                  style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                  <option value="">— Select —</option>
                  {SKILLS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Phone</label>
                <input value={modal.data.phone||""} onChange={e=>setModal({...modal,data:{...modal.data,phone:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Rate per Day *</label>
                <input type="number" value={modal.data.rate_per_day} onChange={e=>setModal({...modal,data:{...modal.data,rate_per_day:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>OT Rate (per hour)</label>
                <input type="number" value={modal.data.rate_ot||""} onChange={e=>setModal({...modal,data:{...modal.data,rate_ot:e.target.value}})}
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Contractor</label>
                <input value={modal.data.contractor||""} onChange={e=>setModal({...modal,data:{...modal.data,contractor:e.target.value}})} placeholder="Self"
                  style={{width:"100%",padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>

              <div>
                <label style={{fontSize:11,fontWeight:700,color:T.t3,display:"block",marginBottom:4}}>Project</label>
                <select value={modal.data.project||""} onChange={e=>setModal({...modal,data:{...modal.data,project:e.target.value}})}
                  style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}>
                  <option value="">— Any —</option>
                  {(PROJECTS||[]).map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {err && <div style={{background:T.redL,color:T.red,padding:"7px 10px",borderRadius:6,fontSize:11,marginTop:12,border:`1px solid ${T.redM}`}}>{err}</div>}

            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={close} disabled={saving}
                style={{padding:"8px 16px",borderRadius:7,background:"none",border:`1.5px solid ${T.b1}`,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{padding:"8px 18px",borderRadius:7,background:saving?T.b1:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Saving...":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DAILY WAGES LABOUR: Payments Tab (Phase 3) ───────────────────
// ══════════════════════════════════════════════════════════════════
function DailyPaymentsTab({workers,isAdmin}){
  // Cycle presets
  const today=new Date();
  const iso=(d)=>d.toISOString().split("T")[0];
  const startOfWeek=(d)=>{const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-((day+6)%7)); return x;};
  const startOfMonth=(d)=>new Date(d.getFullYear(),d.getMonth(),1);
  const endOfMonth=(d)=>new Date(d.getFullYear(),d.getMonth()+1,0);

  const [cycle,setCycle]=useState("weekly"); // weekly | monthly | custom
  const [from,setFrom]=useState(iso(startOfWeek(today)));
  const [to,setTo]=useState(iso(today));
  const [payments,setPayments]=useState([]);
  const [loading,setLoading]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [err,setErr]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");

  const applyCycle=(c)=>{
    setCycle(c);
    if(c==="weekly"){ setFrom(iso(startOfWeek(today))); setTo(iso(today)); }
    else if(c==="monthly"){ setFrom(iso(startOfMonth(today))); setTo(iso(endOfMonth(today))); }
  };

  const load=useCallback(async()=>{
    setLoading(true);setErr("");
    try{
      const r=await api.get(`/payroll/daily-labour/payments?from=${from}&to=${to}${statusFilter!=="all"?"&status="+statusFilter:""}`);
      if(r.success) setPayments(r.data||[]);
    }catch(e){ setErr(e.message||"Load failed"); }
    setLoading(false);
  },[from,to,statusFilter]);
  useEffect(()=>{load();},[load]);

  const generate=async()=>{
    if(!window.confirm(`Generate payments from ${from} to ${to}?\n\nThis will compute payable amount per worker based on attendance in this period.`)) return;
    setGenerating(true);setErr("");
    try{
      const r=await api.post("/payroll/daily-labour/payments/generate",{
        period_start:from, period_end:to, cycle_type:cycle,
      });
      if(r.success){
        alert(`Generated ${r.count} payment records`);
        load();
      }else{ setErr(r.message||"Generation failed"); }
    }catch(e){ setErr(e.message||"Network error"); }
    setGenerating(false);
  };

  const markPaid=async(p,method)=>{
    try{
      const r=await api.patch(`/payroll/daily-labour/payments/${p.id}`,{status:"paid",payment_method:method});
      if(r.success) load();
    }catch(e){ alert(e.message); }
  };
  const cancel=async(p)=>{
    if(!window.confirm("Cancel this payment record?")) return;
    try{
      const r=await api.patch(`/payroll/daily-labour/payments/${p.id}`,{status:"cancelled"});
      if(r.success) load();
    }catch(e){ alert(e.message); }
  };

  const totalPayable=payments.filter(p=>p.status==="pending").reduce((s,p)=>s+Number(p.net_amount||0),0);
  const totalPaid=payments.filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.net_amount||0),0);

  return(
    <div>
      {/* Cycle presets + date range */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,padding:12,marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:4,background:T.b1,padding:3,borderRadius:7}}>
            {["weekly","monthly","custom"].map(c=>(
              <button key={c} onClick={()=>applyCycle(c)}
                style={{padding:"6px 14px",border:"none",background:cycle===c?T.surface:"transparent",color:cycle===c?T.blu:T.t3,borderRadius:5,fontSize:11.5,fontWeight:700,cursor:"pointer",textTransform:"capitalize",boxShadow:cycle===c?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>
                {c}
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <label style={{fontSize:11,color:T.t3}}>From:</label>
            <input type="date" value={from} onChange={e=>{setFrom(e.target.value);setCycle("custom");}}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
            <label style={{fontSize:11,color:T.t3}}>To:</label>
            <input type="date" value={to} onChange={e=>{setTo(e.target.value);setCycle("custom");}}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}/>
          </div>

          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
              style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:11.5,color:T.t1,background:T.surface,outline:"none",fontFamily:"inherit"}}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {isAdmin&&<button onClick={generate} disabled={generating}
              style={{padding:"7px 16px",borderRadius:7,background:generating?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:generating?"not-allowed":"pointer"}}>
              {generating?"Generating...":"⚡ Generate Payments"}
            </button>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.amb}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Pending Payable</div>
          <div style={{fontSize:18,fontWeight:700,color:T.amb,marginTop:3}}>₹{fmtN(totalPayable)}</div>
        </div>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.grn}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Paid</div>
          <div style={{fontSize:18,fontWeight:700,color:T.grn,marginTop:3}}>₹{fmtN(totalPaid)}</div>
        </div>
        <div style={{padding:"11px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderLeft:`3px solid ${T.blu}`}}>
          <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>Records</div>
          <div style={{fontSize:18,fontWeight:700,color:T.blu,marginTop:3}}>{payments.length}</div>
        </div>
      </div>

      {err && <div style={{background:T.redL,color:T.red,padding:"8px 12px",borderRadius:7,fontSize:12,marginBottom:10,border:`1px solid ${T.redM}`}}>{err}</div>}

      {/* Payments table */}
      {loading ? <LoadingSpinner/> :
        payments.length===0 ? <EmptyState icon={<div style={{fontSize:40}}>💰</div>} message="No payments in this period" sub="Click Generate Payments to create from attendance"/> :
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.3fr 0.8fr 0.8fr 1.1fr 1.1fr 1fr 140px",padding:"8px 14px",background:"#0D1B2A"}}>
            {["Worker","Period","Days","OT hrs","Gross","Net","Status","Actions"].map((h,i)=>(
              <span key={i} style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>
            ))}
          </div>
          {payments.map((p,i)=>{
            const st=p.status;
            const stColor=st==="paid"?T.grn:st==="cancelled"?T.slt:T.amb;
            const stBg=st==="paid"?T.grnL:st==="cancelled"?T.sltL:T.ambL;
            return(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1.3fr 0.8fr 0.8fr 1.1fr 1.1fr 1fr 140px",padding:"10px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",background:i%2===0?"transparent":T.surfaceB}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Avatar name={p.worker_name||"?"} size={28} color={T.amb}/>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{p.worker_name}</div>
                    {p.project&&<div style={{fontSize:10,color:T.t4}}>{p.project}</div>}
                  </div>
                </div>
                <span style={{fontSize:10.5,color:T.t3}}>
                  {p.period_start?.split("T")[0]}<br/>{p.period_end?.split("T")[0]}
                </span>
                <span style={{fontSize:12,color:T.t2}}>{Number(p.days_worked||0)}</span>
                <span style={{fontSize:12,color:T.t3}}>{Number(p.ot_hours||0)}</span>
                <span style={{fontSize:12,color:T.t2}}>₹{fmtN(p.gross_amount)}</span>
                <span style={{fontSize:13,fontWeight:800,color:st==="paid"?T.grn:T.t1}}>₹{fmtN(p.net_amount)}</span>
                <span style={{display:"inline-flex",padding:"3px 9px",borderRadius:12,background:stBg,color:stColor,fontSize:10.5,fontWeight:700,border:`1px solid ${stColor}44`,textTransform:"capitalize",alignSelf:"flex-start"}}>{st}</span>
                <div style={{display:"flex",gap:5}}>
                  {st==="pending"&&isAdmin&&<>
                    <button onClick={()=>markPaid(p,"cash")} title="Mark Paid (Cash)"
                      style={{padding:"4px 9px",borderRadius:6,background:T.grn,color:"white",fontSize:10.5,fontWeight:700,border:"none",cursor:"pointer"}}>
                      ✓ Paid
                    </button>
                    <button onClick={()=>cancel(p)} title="Cancel"
                      style={{padding:"4px 7px",borderRadius:6,background:T.redL,color:T.red,fontSize:10.5,fontWeight:700,border:`1px solid ${T.redM}`,cursor:"pointer"}}>
                      <IcX size={10} color={T.red}/>
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── DAILY WAGES LABOUR: Settings Tab (Phase 3) ───────────────────
// ══════════════════════════════════════════════════════════════════
function DailyWagesSettingsTab(){
  // Sync with Library → Labour Rate Card (single source of truth)
  const [rates,setRates]=useState([]);  // Array of {id, role, rate, ot_rate, category, description}
  const [loading,setLoading]=useState(true);
  const [cycle,setCycle]=useState(()=>localStorage.getItem("gb_daily_wages_cycle")||"weekly");
  const [savedMsg,setSavedMsg]=useState("");
  const [savingRow,setSavingRow]=useState(null);

  const loadRates=async()=>{
    setLoading(true);
    try{
      const res=await api.get("/library/labour-rates");
      if(res.success) setRates(res.data||[]);
    }catch(e){}
    setLoading(false);
  };
  useEffect(()=>{ loadRates(); },[]);

  const updateRate=async(item,newRate)=>{
    if(Number(newRate)===Number(item.rate)) return;
    const reason=window.prompt("Base rate change reason (optional):", "Quarterly review");
    if(reason===null) { return; } // user cancelled
    setSavingRow(item.id);
    try{
      const res=await api.post("/library/labour-rates/"+item.id+"/request-change",{
        requested_rate:Number(newRate)||0,
        reason: reason || "Base rate update",
      });
      if(res.success){
        setSavedMsg("Approval submitted: "+item.role+" → ₹"+newRate+" (Pending admin)");
        setTimeout(()=>setSavedMsg(""),3000);
      } else {
        alert(res.message || "Failed to submit");
        loadRates(); // reset displayed value
      }
    }catch(e){ alert("Error: "+e.message); loadRates(); }
    setSavingRow(null);
  };

  const dedupe=async()=>{
    if(!window.confirm("Duplicate skills hata du? (Same role+category waale rakhe ek)")) return;
    const res=await api.post("/library/labour-rates/dedupe");
    if(res.success){
      setSavedMsg(`✓ Cleaned up — kept ${res.data.kept}, removed ${res.data.deduped} duplicates`);
      setTimeout(()=>setSavedMsg(""),3000);
      loadRates();
    }
  };

  const saveCycle=()=>{
    localStorage.setItem("gb_daily_wages_cycle",cycle);
    setSavedMsg("Payment cycle saved ✓");
    setTimeout(()=>setSavedMsg(""),2000);
  };

  return(
    <div style={{maxWidth:760}}>
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:18,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14,fontWeight:800,color:T.t1}}>Default Rates by Skill</div>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700,border:`1px solid ${T.bluM}`}}>📋 Synced with Library</span>
        </div>
        <div style={{fontSize:11,color:T.amb,marginBottom:14,padding:"6px 10px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:6}}>
          ⚠️ Base rates hain ye — change karne ke liye <b>admin approval</b> chahiye. Approvals drawer → Finance tab pe approve karna padega.
        </div>
        {loading
          ? <div style={{padding:"20px 0",textAlign:"center",color:T.t4,fontSize:12}}>Loading rates from library…</div>
          : rates.length===0
            ? <div style={{padding:"20px 0",textAlign:"center",color:T.t4,fontSize:12.5}}>
                Library mein koi labour rate nahi hai. <b>Library → Labour Rate Card</b> mein jaake "Add Labour Rate" se add karo.
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {rates.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px dashed ${T.b1}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5,color:T.t1,fontWeight:600}}>{r.role}</div>
                      {r.category&&<div style={{fontSize:10,color:T.t4}}>{r.category}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:12,color:T.t4}}>₹</span>
                      <input type="number" defaultValue={r.rate||""}
                        onBlur={e=>{ if(Number(e.target.value)!==Number(r.rate)) updateRate(r,e.target.value); }}
                        placeholder="0" disabled={savingRow===r.id}
                        style={{width:90,padding:"6px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",textAlign:"right",opacity:savingRow===r.id?.5:1}}/>
                      <span style={{fontSize:10.5,color:T.t4}}>/day</span>
                    </div>
                  </div>
                ))}
              </div>
        }
        {savedMsg&&<div style={{marginTop:10,fontSize:11.5,color:T.grn,fontWeight:600}}>✓ {savedMsg}</div>}
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:18,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:T.t1,marginBottom:4}}>Default Payment Cycle</div>
        <div style={{fontSize:11,color:T.t4,marginBottom:12}}>Default date range when opening the Payments tab.</div>
        <div style={{display:"flex",gap:10}}>
          {[
            {v:"weekly",l:"Weekly",d:"Pay every week (Mon-Sun)"},
            {v:"monthly",l:"Monthly",d:"Pay every month (1st-last day)"},
            {v:"custom",l:"Custom",d:"Manual date range"},
          ].map(o=>(
            <label key={o.v} style={{flex:1,cursor:"pointer",padding:"12px 14px",border:`2px solid ${cycle===o.v?T.blu:T.b1}`,background:cycle===o.v?T.bluL:"transparent",borderRadius:9,transition:"all .15s"}}>
              <input type="radio" name="cycle" value={o.v} checked={cycle===o.v} onChange={()=>setCycle(o.v)} style={{marginRight:8}}/>
              <span style={{fontSize:12.5,fontWeight:700,color:cycle===o.v?T.blu:T.t1}}>{o.l}</span>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3,marginLeft:19}}>{o.d}</div>
            </label>
          ))}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <button onClick={saveCycle}
          style={{padding:"9px 22px",borderRadius:7,background:T.blu,color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:"pointer"}}>
          Save Payment Cycle
        </button>
        <span style={{fontSize:11,color:T.t4}}>Rates auto-save on edit (synced with Library)</span>
      </div>
    </div>
  );
}

// ── MAIN PAYROLL MODULE ───────────────────────────────────────────
function PayrollModule(){
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes(currentUser.role);

  // Mode: "office" (permanent staff) | "daily" (daily wages labour)
  const [mode,setMode]=useState(()=>localStorage.getItem("gb_payroll_mode")||"office");
  const setModeAndTab=(m)=>{
    setMode(m);
    localStorage.setItem("gb_payroll_mode",m);
    // Reset to first tab of the new mode
    setTab(m==="office"?"office-att":"daily-workers");
  };
  const [tab,setTab]=useState(()=>
    (localStorage.getItem("gb_payroll_mode")||"office")==="office"?"office-att":"daily-workers"
  );
  const [month,setMonth]=useState(CUR_MONTH);
  const [year,setYear]=useState(CUR_YEAR);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [staff,setStaff]=useState([]);
  const [workers,setWorkers]=useState([]);
  const [advances,setAdvances]=useState([]);
  const [monthlyAtt,setMonthlyAtt]=useState({});
  const [dailyAtt,setDailyAtt]=useState({});
  const [selSlipEmp,setSelSlipEmp]=useState(null);
  const [selSlipPayType,setSelSlipPayType]=useState("fixed");
  const [selProject,setSelProject]=useState("All");
  const [salaryRecords,setSalaryRecords]=useState([]);
  const [defaultDueDays,setDefaultDueDays]=useState(10);
  const [workingDays,setWorkingDays]=useState(26);

  // Map API staff row to frontend format
  const mapStaff=s=>({
    id:s.id,name:s.name,role:s.role||"",dept:s.dept||"",
    paymentType:s.payment_type||"fixed",
    basicSalary:Number(s.basic_salary)||0,hra:Number(s.hra)||0,
    conveyance:Number(s.conveyance)||0,medical:Number(s.medical)||0,
    phone:Number(s.phone_allowance)||0,
    bankAcc:s.bank_acc||"",ifsc:s.ifsc||"",pan:s.pan||"",
    joinDate:s.join_date?s.join_date.split("T")[0]:"",project:s.project||"",photo:s.photo||"",
  });
  const mapWorker=w=>({
    id:w.id,name:w.name,trade:w.trade||"",
    ratePerDay:Number(w.rate_per_day)||0,rateOT:Number(w.rate_ot)||0,
    project:w.project||"",contractor:w.contractor||"Self",phone:w.phone||"",
  });
  const mapSalaryRec=d=>({
    id:d.id,name:d.name,designation:d.designation,phone:d.phone,
    bankName:d.bank_name,accountNo:d.account_no,ifsc:d.ifsc,
    daysPresent:d.days_present,totalDays:d.total_days,
    amount:Number(d.amount),
    salaryDate:d.salary_date?d.salary_date.split("T")[0]:"",
    dueDate:d.due_date?d.due_date.split("T")[0]:"",
    notes:d.notes,category:d.category,
    month:d.month_num,year:d.year_num,status:d.status,
    createdAt:d.created_at,paidDate:d.paid_date?d.paid_date.split("T")[0]:null,
    paidBy:d.paid_by,txRef:d.tx_ref,
  });
  const mapAdvance=a=>({
    id:a.id,empId:a.emp_id,name:a.name,
    amount:Number(a.amount),
    date:a.date?a.date.split("T")[0]:"",
    reason:a.reason,status:a.status,
  });

  const loadAll=useCallback(async()=>{
    setError(null);setLoading(true);
    try{
      const [staffRes,workerRes,advRes,salRes,settRes,projRes]=await Promise.all([
        api.get("/payroll/staff"),
        api.get("/payroll/workers"),
        api.get("/payroll/advances"),
        api.get("/payroll/salary-records"),
        api.get("/payroll/settings"),
        api.get("/team-schedule/sites"),
      ]);
      const staffData=(staffRes.data?.data||staffRes.data||[]).map(mapStaff);
      const workerData=(workerRes.data?.data||workerRes.data||[]).map(mapWorker);
      MONTHLY_STAFF=staffData;setStaff(staffData);
      DAILY_WORKERS=workerData;setWorkers(workerData);
      ADVANCE_DATA=(advRes.data?.data||advRes.data||[]).map(mapAdvance);
      setAdvances(ADVANCE_DATA);
      setSalaryRecords((salRes.data?.data||salRes.data||[]).map(mapSalaryRec));
      const sett=settRes.data?.data||settRes.data||{};
      setDefaultDueDays(sett.default_due_days||10);
      setWorkingDays(sett.working_days||26);
      PROJECTS=(projRes.data?.data||projRes.data||[]).map(p=>p.name);
    }catch(err){console.error("Load payroll:",err);setError(err.message||"Failed to load payroll data");}
    finally{setLoading(false);}
  },[]);

  // Load attendance when month/year changes
  const loadAttendance=useCallback(async()=>{
    try{
      const [mRes,dRes]=await Promise.all([
        api.get("/payroll/attendance/monthly?month="+month+"&year="+year),
        api.get("/payroll/attendance/daily?month="+month+"&year="+year),
      ]);
      setMonthlyAtt(mRes.data||{});
      setDailyAtt(dRes.data||{});
    }catch(err){console.error("Load attendance:",err);}
  },[month,year]);

  useEffect(()=>{loadAll();},[loadAll]);
  useEffect(()=>{loadAttendance();},[loadAttendance]);

  // Attendance API callbacks
  const onMonthlyAttChange=(empId,day,status)=>{
    const m=month+1;const dateStr=`${year}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    api.post("/payroll/attendance/monthly",{staff_id:empId,date:dateStr,status}).catch(err=>console.error(err));
  };
  const onDailyAttChange=(wId,day,status,ot)=>{
    const m=month+1;const dateStr=`${year}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    api.post("/payroll/attendance/daily",{worker_id:wId,date:dateStr,status,ot_hours:ot||0}).catch(err=>console.error(err));
  };

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:T.bg}}>
      <LoadingSpinner/>
    </div>
  );

  if(error) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:T.bg}}>
      <ErrorRetry onRetry={loadAll}/>
    </div>
  );

  // Summary KPIs
  const WORKING_DAYS=workingDays;
  const totalMonthlyNet=staff.reduce((s,emp)=>{
    const days=monthlyAtt[emp.id]||{};
    const P=Object.values(days).filter(v=>v==="P").length;
    const H=Object.values(days).filter(v=>v==="H").length;
    const eff=P+(H*0.5);
    const perDay=(emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone)/(WORKING_DAYS||26);
    const gross=Math.round(perDay*eff);
    const pf=Math.round(emp.basicSalary*0.12);
    return s+(gross-pf);
  },0);

  const totalDailyPayable=workers.reduce((s,w)=>{
    let total=0;
    Object.entries(dailyAtt[w.id]||{}).forEach(([d,v])=>{
      if(!v) return;
      if(v.status==="P") total+=w.ratePerDay+(v.ot||0)*w.rateOT;
      else if(v.status==="H") total+=w.ratePerDay/2;
    });
    return s+total;
  },0);

  const pendingAdvances=advances.filter(a=>a.status==="Pending deduction").reduce((s,a)=>s+a.amount,0);

  // Office Staff mode — 5 tabs
  const TABS_OFFICE=[
    {id:"office-att",      l:"Attendance",        sub:"From Mobile Punch"},
    {id:"office-salary",   l:"Monthly Salary",    sub:"Auto-calculated"},
    {id:"office-ledger",   l:"Salary Ledger",     sub:"Payment history"},
    {id:"office-advances", l:"Advances",          sub:"Advance tracking"},
    {id:"office-settings", l:"Settings",          sub:"Payroll config"},
  ];
  // Daily Wages Labour mode — 4 tabs
  const TABS_DAILY=[
    {id:"daily-workers",   l:"Workers",           sub:"Labour master"},
    {id:"daily-att",       l:"Daily Attendance",  sub:"Project-wise"},
    {id:"daily-payments",  l:"Payments",          sub:"Weekly / monthly"},
    {id:"daily-settings",  l:"Settings",          sub:"Rates & cycle"},
  ];
  const TABS = mode==="office" ? TABS_OFFICE : TABS_DAILY;

  const manualPending=salaryRecords.filter(r=>r.status==="Pending").reduce((s,r)=>s+r.amount,0);

  const TILES_OFFICE=[
    {l:"Office Staff",         v:staff.length,        sub:"Permanent employees",               c:T.blu},
    {l:"Monthly Net Payroll",  v:`₹${fmt(totalMonthlyNet)}`,  sub:`${MONTHS[month]} ${year}`,          c:T.grn},
    {l:"Pending Advances",     v:`₹${fmt(pendingAdvances)}`,  sub:`${advances.filter(a=>a.status==="Pending deduction").length} to deduct`, c:T.pur},
    {l:"Salary Pending",       v:`₹${fmt(manualPending)}`,    sub:`${salaryRecords.filter(r=>r.status==="Pending").length} entries unpaid`, c:manualPending>0?T.amb:T.grn},
  ];
  const TILES_DAILY=[
    {l:"Daily Workers",        v:workers.length,              sub:"Active labour",                     c:T.blu},
    {l:"Payable This Month",   v:`₹${fmt(totalDailyPayable)}`,sub:`${MONTHS[month]} ${year}`,          c:T.grn},
    {l:"Projects Covered",     v:(PROJECTS||[]).length,       sub:"Active project sites",              c:T.pur},
    {l:"Pending Advances",     v:`₹${fmt(pendingAdvances)}`,  sub:`${advances.filter(a=>a.status==="Pending deduction").length} to deduct`, c:T.amb},
  ];
  const TILES = mode==="office" ? TILES_OFFICE : TILES_DAILY;

  return(
    <div style={{background:T.bg,height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* Mode Toggle — Office Staff / Daily Wages Labour */}
      <div style={{padding:"12px 18px 0",flexShrink:0}}>
        <div style={{display:"inline-flex",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:3,boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
          <button onClick={()=>setModeAndTab("office")}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",border:"none",background:mode==="office"?T.blu:"transparent",color:mode==="office"?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:14}}>👔</span> Office Staff
          </button>
          <button onClick={()=>setModeAndTab("daily")}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",border:"none",background:mode==="daily"?T.amb:"transparent",color:mode==="daily"?"#fff":T.t3,borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:14}}>👷</span> Daily Wages Labour
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div style={{padding:"10px 18px 8px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {TILES.map((s,i)=>(
            <div key={i} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${s.c}`}}>
              <div style={{fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:T.t1,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10.5,color:T.t4,marginTop:3}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark tab bar with month picker */}
      <div style={{margin:"0 18px",flexShrink:0}}>
        <div style={{background:"#0D1B2A",borderRadius:10,padding:"0 10px",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",flex:1,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"11px 13px",border:"none",background:"none",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"white":"rgba(255,255,255,0.45)",cursor:"pointer",borderBottom:tab===t.id?"2px solid #2563EB":"2px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>
                {t.l}
                {t.badge>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:10}}>{t.badge}</span>}
              </button>
            ))}
          </div>
          {/* Export */}
          <button onClick={()=>{
            if(tab==="office-salary"){
              const WD=workingDays||26;
              exportCSV(["Name","Role","Dept","Basic","HRA","Conv","Medical","Phone","Days Present","Gross","PF","Net"],
                staff.map(emp=>{const days=monthlyAtt[emp.id]||{};const P=Object.values(days).filter(v=>v==="P").length;const H=Object.values(days).filter(v=>v==="H").length;const eff=P+(H*0.5);const perDay=(emp.basicSalary+emp.hra+emp.conveyance+emp.medical+emp.phone)/(WD);const gross=Math.round(perDay*eff);const pf=Math.round(emp.basicSalary*0.12);return[emp.name,emp.role,emp.dept,emp.basicSalary,emp.hra,emp.conveyance,emp.medical,emp.phone,eff,gross,pf,gross-pf];}),
                `monthly_salary_${MONTHS[month]}_${year}.csv`);
            }else if(tab==="daily-att"){
              exportCSV(["Name","Trade","Rate/Day","OT Rate","Project","Days","OT Hours","Total"],
                workers.map(w=>{let days=0,ot=0,total=0;Object.entries(dailyAtt[w.id]||{}).forEach(([d,v])=>{if(v?.status==="P"){days++;total+=w.ratePerDay+(v.ot||0)*w.rateOT;ot+=(v.ot||0);}else if(v?.status==="H"){days+=0.5;total+=w.ratePerDay/2;}});return[w.name,w.trade,w.ratePerDay,w.rateOT,w.project,days,ot,total];}),
                `daily_wages_${MONTHS[month]}_${year}.csv`);
            }else if(tab==="office-advances"){
              exportCSV(["Name","Amount","Date","Reason","Status"],advances.map(a=>[a.name,a.amount,a.date,a.reason,a.status]),`advances_${MONTHS[month]}_${year}.csv`);
            }else if(tab==="office-ledger"){
              exportCSV(["Name","Designation","Amount","Status","Salary Date","Due Date","Paid Date","Notes"],
                salaryRecords.filter(r=>r.month===month&&r.year===year).map(r=>[r.name,r.designation,r.amount,r.status,r.salaryDate,r.dueDate,r.paidDate||"",r.notes||""]),
                `salary_ledger_${MONTHS[month]}_${year}.csv`);
            }
          }} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.7)",fontSize:11.5,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
            <IcDown size={12} color="currentColor"/> Export
          </button>

          {/* Month + Year picker */}
          <div style={{display:"flex",gap:5,padding:"6px 0",alignItems:"center"}}>
            <IcCal size={13} color="rgba(255,255,255,0.5)"/>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}
              style={{height:28,padding:"0 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {MONTHS.map((m,i)=><option key={i} value={i} style={{color:T.t1,background:T.surface}}>{m}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}
              style={{height:28,padding:"0 8px",borderRadius:6,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:11.5,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {[2025,2026,2027].map(y=><option key={y} style={{color:T.t1,background:T.surface}}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 18px 16px"}}>
        {/* ─── OFFICE STAFF MODE ─── */}
        {mode==="office" && tab==="office-att" && (
          <MonthlyAttGrid staff={staff} att={monthlyAtt} setAtt={setMonthlyAtt} month={month} year={year} onAttChange={onMonthlyAttChange}/>
        )}
        {mode==="office" && tab==="office-salary" && (
          <MonthlySalaryTab staff={staff} att={monthlyAtt} month={month} year={year} advances={advances} workingDays={WORKING_DAYS} onViewSlip={(emp,pType)=>{setSelSlipEmp(emp);setSelSlipPayType(pType||emp.paymentType||"fixed");}} isAdmin={isAdmin}/>
        )}
        {mode==="office" && tab==="office-ledger" && (
          <SalaryLedgerTab salaryRecords={salaryRecords} setSalaryRecords={setSalaryRecords} month={month} year={year}/>
        )}
        {mode==="office" && tab==="office-advances" && (
          <AdvancesTab advances={advances} setAdvances={setAdvances} isAdmin={isAdmin}/>
        )}
        {mode==="office" && tab==="office-settings" && (
          isAdmin
            ? <PayrollSettingsTab defaultDueDays={defaultDueDays} setDefaultDueDays={setDefaultDueDays} workingDays={workingDays} setWorkingDays={setWorkingDays}/>
            : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Settings are only accessible to admins.</div>
        )}

        {/* ─── DAILY WAGES MODE ─── */}
        {mode==="daily" && tab==="daily-workers" && (
          <DailyWorkersTab workers={workers} setWorkers={setWorkers} isAdmin={isAdmin}/>
        )}
        {mode==="daily" && tab==="daily-att" && (
          <DailyWagesTab workers={workers} att={dailyAtt} setAtt={setDailyAtt} selProject={selProject} setSelProject={setSelProject} month={month} year={year} onDailyAttChange={onDailyAttChange} isAdmin={isAdmin}/>
        )}
        {mode==="daily" && tab==="daily-payments" && (
          <DailyPaymentsTab workers={workers} isAdmin={isAdmin}/>
        )}
        {mode==="daily" && tab==="daily-settings" && (
          isAdmin
            ? <DailyWagesSettingsTab/>
            : <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:13}}>Settings are only accessible to admins.</div>
        )}
      </div>

      {/* Salary slip modal */}
      {selSlipEmp&&<SalarySlipModal emp={selSlipEmp} att={monthlyAtt} month={month} year={year} onClose={()=>setSelSlipEmp(null)} paymentType={selSlipPayType} workingDays={workingDays}/>}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:10px}
        select,input{font-family:'Segoe UI',system-ui,sans-serif}
      `}</style>
    </div>
  );
}

export default PayrollModule;
