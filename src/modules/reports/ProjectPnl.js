// ════════════════════════════════════════════════════════════════
// ProjectPnl — Reports → "P&L (project-wise)"
// ════════════════════════════════════════════════════════════════
// Revenue = project invoices (earned billing); Cost = material + subcon +
// site + equipment + transfer-in − material-return − transfer-out.
// Payment/receipt cash flow hain, ginte nahi. Ankde GET /finance/project-pnl
// se — wahi formula jo Sahayak ka `project_pnl` tool chalata hai (backend
// utils/projectPnl.js), isliye screen aur bot alag nahi bol sakte.
// 14 Oct 2026: Finance ke "Reports" tab se yahan laaya gaya.
import React, { useState, useEffect, Fragment } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { todayISO } from "../../utils/today";
import { can } from "../../utils/perms";
import { t, Rich } from "../../i18n";

const downloadCSV=(filename,rows)=>{
  const csv=rows.map(r=>r.map(c=>`"${String(c==null?"":c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
};
const printHTML=(title,bodyHTML)=>{
  const w=window.open("","_blank");
  w.document.write(`<html><head><title>${title}</title><style>
    *{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:0}
    body{padding:20px}h2{color:#1565C0;margin-bottom:6px}p{color:#555;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#E3F2FD;color:#1565C0;padding:8px 10px;text-align:left;border:1px solid #BFDBFE;font-size:11px;text-transform:uppercase;letter-spacing:0.4px}
    td{padding:7px 10px;border:1px solid #E5E7EB;vertical-align:top}
    tr:nth-child(even) td{background:#FAFAFA}
    .cr{color:#059669;font-weight:700}.dr{color:#DC2626;font-weight:700}
    .footer{margin-top:16px;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:8px}
    @media print{button{display:none}}
  </style></head><body>${bodyHTML}</body></html>`);
  w.document.close();setTimeout(()=>w.print(),400);
};
const fmtN=(n)=>Math.abs(n).toLocaleString("en-IN");
const fmtS=(n)=>`${Number(n)<0?"-₹":"₹"}${fmtN(n)}`;
const IcDown=({size=18,color="currentColor",style})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M6 9l6 6 6-6"/></svg>);
export default function ProjectPnlView(){
  const [data,setData]     = useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]       = useState(false);
  const [openId,setOpenId] = useState(null); // project_id whose cost breakup is expanded

  useEffect(()=>{
    let alive=true; setLoading(true); setErr(false);
    api.get("/finance/project-pnl")
      .then(r=>{ if(!alive) return; if(r?.success&&r.data) setData(r.data); else setErr(true); })
      .catch(()=>{ if(alive) setErr(true); })
      .finally(()=>{ if(alive) setLoading(false); });
    return ()=>{ alive=false; };
  },[]);

  const items = data?.items||[];
  const totals = data?.totals||{revenue:0,cost:0,pnl:0};
  const pnlCol=(n)=> Number(n)>=0 ? T.grn : T.red;

  const dlExcel=()=>{
    downloadCSV(`Project_PnL_${todayISO()}.csv`,[
      ["Company — Project-wise P&L (accrual, invoice-basis)"],
      [`Generated: ${new Date().toLocaleDateString("en-IN")}`],[],
      ["Project","Status","Revenue (Invoiced)","Cost","P&L",
       "Material Purchase","Sub-Con","Site Expense","Equipment",t("finance.pnl_machine_oil_store"),"Material Return","Transfer In","Transfer Out"],
      ...items.map(i=>[i.project,i.status||"",i.revenue,i.cost,i.pnl,
        i.cost_breakup.material_purchase,i.cost_breakup.subcon_expense,i.cost_breakup.site_expense,
        i.cost_breakup.equipment,i.cost_breakup.machine_oil_store||0,i.cost_breakup.material_return,i.cost_breakup.transfer_in,i.cost_breakup.transfer_out]),
      [],["TOTAL","",totals.revenue,totals.cost,totals.pnl],
    ]);
  };
  const dlPdf=()=>{
    const rows=items.map(i=>`<tr><td style="font-weight:600">${i.project}</td>`
      +`<td class="r">₹${fmtN(i.revenue)}</td><td class="r">₹${fmtN(i.cost)}</td>`
      +`<td class="r" style="font-weight:700;color:${Number(i.pnl)>=0?"#059669":"#DC2626"}">${fmtS(i.pnl)}</td></tr>`).join("");
    printHTML("Project-wise P&L",
      `<h2>Project-wise P&L</h2><p>Accrual (invoice-basis) · Generated ${new Date().toLocaleDateString("en-IN")}</p>`
      +`<table><thead><tr><th>Project</th><th class="r">Revenue</th><th class="r">Cost</th><th class="r">P&L</th></tr></thead><tbody>${rows}`
      +`<tr style="background:#F0F4FF;font-weight:700"><td>TOTAL</td><td class="r">₹${fmtN(totals.revenue)}</td><td class="r">₹${fmtN(totals.cost)}</td><td class="r" style="color:${Number(totals.pnl)>=0?"#059669":"#DC2626"}">${fmtS(totals.pnl)}</td></tr>`
      +`</tbody></table>`);
  };

  const Tile=({label,val,sub,col})=>(
    <div style={{flex:1,background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,borderTop:`3px solid ${col||T.slt}`,padding:"12px 15px"}}>
      <div style={{fontSize:10.5,color:T.t4,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:20,fontWeight:800,color:col||T.t1,marginTop:5}}>{val}</div>
      {sub&&<div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{sub}</div>}
    </div>
  );

  if(loading) return <div style={{padding:40,textAlign:"center",color:T.t4,fontSize:13}}>{t("finance.loading_project_p_l")}</div>;
  if(err)     return <div style={{padding:40,textAlign:"center",color:T.red,fontSize:13}}>{t("finance.p_l_load_nahi_ho_paaya")}</div>;
  if(!items.length) return <div style={{padding:40,textAlign:"center",color:T.t4,fontSize:13}}>{t("finance.abhi_koi_project_p_l_data")}</div>;

  const cell={padding:"10px 12px",fontSize:12.5,textAlign:"right",whiteSpace:"nowrap"};
  const head={padding:"9px 12px",fontSize:10.5,color:T.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,textAlign:"right",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,position:"sticky",top:0};
  const brk=[
    ["Material Purchase","material_purchase",false],["Sub-Con","subcon_expense",false],
    ["Site Expense","site_expense",false],["Equipment","equipment",false],
    // Store se machine me daala oil (backend utils/projectPnl) — machine kharcha ka hissa
    [t("finance.pnl_machine_oil_store"),"machine_oil_store",false],
    ["Material Return","material_return",true],["Transfer In","transfer_in",false],["Transfer Out","transfer_out",true],
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"auto",gap:12,paddingBottom:14}}>
      {/* summary tiles */}
      <div style={{display:"flex",gap:10}}>
        <Tile label={t("finance.total_revenue")} val={`₹${fmtN(totals.revenue)}`} sub={t("finance.invoiced_earned_billing")} col={T.grn}/>
        <Tile label={t("finance.total_cost")} val={`₹${fmtN(totals.cost)}`} sub={t("finance.material_subcon_site_equip_transfers")} col={T.amb}/>
        <Tile label={t("finance.net_p_l")} val={fmtS(totals.pnl)} sub={Number(totals.pnl)>=0?t("finance.profit_labh"):t("finance.loss_haani")} col={pnlCol(totals.pnl)}/>
        {/* P&L ka Excel / PDF = Financial Reports EXPORT (5 Oct 2026) */}
        {can("Financial Reports","export")&&<div style={{display:"flex",alignItems:"flex-end",gap:7}}>
          <button onClick={dlExcel} style={{padding:"7px 12px",borderRadius:7,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><IcDown size={13} color={T.grn}/> {t("common.excel")}</button>
          <button onClick={dlPdf}   style={{padding:"7px 12px",borderRadius:7,background:T.redL,border:`1px solid ${T.redM}`,color:T.red,fontSize:11.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><IcDown size={13} color={T.red}/> PDF</button>
        </div>}
      </div>

      {/* basis banner */}
      <div style={{background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:8,padding:"9px 13px",fontSize:11.5,color:T.t2,lineHeight:1.5}}><Rich k="finance.t_revenue_project_ki_invoice_jitna" params={{ t: t("finance.accrual_invoice_basis_p_l") }} />{data?.transfers_unvalued && <div style={{marginTop:5,color:T.amb,fontWeight:600}}>{t("finance.kuch_material_transfer_bina_rate_ke")}</div>}
      </div>

      {/* table */}
      <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={{...head,textAlign:"left"}}>{t("common.project")}</th>
            <th style={head}>{t("app.revenue")}</th><th style={head}>{t("finance.cost")}</th><th style={head}>P&L</th>
            <th style={{...head,width:34}}></th>
          </tr></thead>
          <tbody>
            {items.map((i,ix)=>{
              const open=openId===i.project_id;
              return (
                <Fragment key={i.project_id||ix}>
                  <tr onClick={()=>setOpenId(open?null:i.project_id)}
                      style={{cursor:"pointer",background:open?T.surfaceB:"transparent",borderBottom:`1px solid ${T.b1}`}}>
                    <td style={{padding:"10px 12px",fontSize:12.5}}>
                      <span style={{fontWeight:600,color:T.t1}}>{i.project}</span>
                      {i.status&&<span style={{marginLeft:7,fontSize:10,color:T.t4}}>{i.status}</span>}
                      {i.no_activity&&<span style={{marginLeft:7,fontSize:10,color:T.t4,fontStyle:"italic"}}>{t("finance.no_activity")}</span>}
                    </td>
                    <td style={{...cell,color:T.grn}}>₹{fmtN(i.revenue)}</td>
                    <td style={{...cell,color:T.amb}}>₹{fmtN(i.cost)}</td>
                    <td style={{...cell,fontWeight:700,color:pnlCol(i.pnl)}}>{fmtS(i.pnl)}
                      <span style={{marginLeft:6,fontSize:9.5,padding:"1px 6px",borderRadius:20,background:Number(i.pnl)>=0?T.grnL:T.redL,color:pnlCol(i.pnl),fontWeight:700,textTransform:"uppercase"}}>{i.verdict==="profit"?t("finance.labh"):i.verdict==="loss"?t("finance.haani"):"—"}</span>
                    </td>
                    <td style={{...cell,color:T.t4}}>{open?"▲":"▼"}</td>
                  </tr>
                  {open&&(
                    <tr style={{background:T.surfaceB}}>
                      <td colSpan={5} style={{padding:"4px 12px 12px 12px"}}>
                        <div style={{fontSize:10.5,color:T.t4,fontWeight:600,margin:"6px 0 5px",textTransform:"uppercase",letterSpacing:0.4}}>{t("finance.cost_breakup")}</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:7}}>
                          {brk.map(([lbl,key,minus])=>{
                            const v=i.cost_breakup[key]||0;
                            return (
                              <div key={key} style={{display:"flex",justifyContent:"space-between",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:7,padding:"6px 10px"}}>
                                <span style={{fontSize:11,color:T.t3}}>{minus?"− ":""}{lbl}</span>
                                <span style={{fontSize:11.5,fontWeight:600,color:v?(minus?T.grn:T.t2):T.t4}}>{v?`₹${fmtN(v)}`:"—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr style={{background:T.bluL,fontWeight:800}}>
              <td style={{padding:"11px 12px",fontSize:12.5,color:T.t1}}>TOTAL</td>
              <td style={{...cell,color:T.grn,fontWeight:800}}>₹{fmtN(totals.revenue)}</td>
              <td style={{...cell,color:T.amb,fontWeight:800}}>₹{fmtN(totals.cost)}</td>
              <td style={{...cell,color:pnlCol(totals.pnl),fontWeight:800}}>{fmtS(totals.pnl)}</td>
              <td/>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
