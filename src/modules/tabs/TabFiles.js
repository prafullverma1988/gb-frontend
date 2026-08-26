import React, { useState, useEffect } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

function TabFiles({ projectId }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selFolder, setSelFolder] = useState("all");

  useEffect(() => {
    setLoading(true);
    api.get("/solar/projects/" + projectId + "/all-files").then(r => {
      if (r.success) { setFiles(r.data || []); setFolders(r.folders || []); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const typeS = { PDF:{c:T.red,bg:T.redL,icon:"📄"}, IMG:{c:T.grn,bg:T.grnL,icon:"🖼"}, VID:{c:T.pur,bg:T.purL,icon:"🎥"} };
  const folderIcons = {"KYC Documents":"📁","Site Photos":"📷","Stage Documents":"📋","Quotations":"💰","Installation Photos":"🔧","Videos":"🎥"};
  const folderColors = {
    "KYC Documents":{c:"#7C3AED",bg:"#F5F3FF",bdr:"#C084FC"},
    "Site Photos":{c:"#2563EB",bg:"#EFF6FF",bdr:"#93C5FD"},
    "Stage Documents":{c:"#059669",bg:"#ECFDF5",bdr:"#6EE7B7"},
    "Quotations":{c:"#D97706",bg:"#FFFBEB",bdr:"#FDE68A"},
    "Installation Photos":{c:"#EA580C",bg:"#FFF7ED",bdr:"#FDBA74"},
    "Videos":{c:"#7C3AED",bg:"#F5F3FF",bdr:"#C084FC"},
  };

  const uploadedCount = files.filter(f=>f.uploaded).length;
  const pendingCount = files.filter(f=>!f.uploaded).length;
  const filtered = selFolder==="all"?files:files.filter(f=>f.folder===selFolder);

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:T.t4}}>{t("files.loading_files")}</div>;

  return (
    <div style={{padding:"16px 0"}}>
      {/* Summary row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div onClick={()=>setSelFolder("all")} style={{padding:"12px 14px",borderRadius:9,border:`1.5px solid ${selFolder==="all"?T.blu:T.b1}`,background:selFolder==="all"?T.bluL:T.surface,cursor:"pointer"}}>
          <div style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>{t("files.total_files")}</div>
          <div style={{fontSize:22,fontWeight:700,color:T.t1}}>{files.length}</div>
        </div>
        <div style={{padding:"12px 14px",borderRadius:9,border:`1px solid ${T.b1}`,background:T.surface}}>
          <div style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>{t("files.uploaded")}</div>
          <div style={{fontSize:22,fontWeight:700,color:T.grn}}>{uploadedCount}</div>
        </div>
        <div style={{padding:"12px 14px",borderRadius:9,border:`1px solid ${T.b1}`,background:T.surface}}>
          <div style={{fontSize:10,fontWeight:600,color:T.t4,textTransform:"uppercase"}}>{t("common.pending")}</div>
          <div style={{fontSize:22,fontWeight:700,color:pendingCount?T.red:T.grn}}>{pendingCount}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:14}}>
        {/* ── Folder sidebar ── */}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {folders.map(fol=>{
            const fc=folderColors[fol.name]||{c:T.slt,bg:T.sltL,bdr:T.b1};
            const active=selFolder===fol.name;
            const pct=fol.total?Math.round(fol.uploaded/fol.total*100):0;
            return(
              <button key={fol.name} onClick={()=>setSelFolder(active?"all":fol.name)}
                style={{padding:"10px 12px",border:`1.5px solid ${active?fc.c:T.b1}`,borderRadius:8,background:active?fc.bg:T.surface,cursor:"pointer",textAlign:"left",borderLeft:`4px solid ${active?fc.c:T.b1}`,transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:14}}>{folderIcons[fol.name]||"📁"}</span>
                  <span style={{fontSize:11.5,fontWeight:700,color:active?fc.c:T.t1,flex:1}}>{fol.name}</span>
                  <span style={{fontSize:10,color:T.t4,background:T.surfaceB,padding:"1px 7px",borderRadius:20,border:`1px solid ${T.b1}`}}>{fol.uploaded}/{fol.total}</span>
                </div>
                <div style={{height:3,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.grn:fc.c,borderRadius:3,transition:"width .3s"}}/>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── File list ── */}
        <div style={{background:T.surface,borderRadius:9,border:`1px solid ${T.b1}`,overflow:"hidden",alignSelf:"start"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 130px 50px 90px",padding:"8px 14px",background:T.surfaceB,borderBottom:`1px solid ${T.b1}`,fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px"}}>
            <span>#</span><span>{t("files.file_name")}</span><span>{t("files.used_in")}</span><span>{t("common.type")}</span><span>{t("common.actions")}</span>
          </div>
          {filtered.length===0&&(
            <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12}}>{selFolder==="all"?t("files.no_files_found"):t("files.no_files_in_this_folder")}</div>
          )}
          {filtered.map((f,i)=>{
            const ft=typeS[f.type]||{c:T.slt,bg:T.sltL,icon:"📎"};
            return(
              <div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 130px 50px 90px",padding:"8px 14px",borderBottom:`1px solid ${T.b1}`,alignItems:"center",
                background:f.uploaded?"white":"#FEF2F2",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=f.uploaded?T.surfaceB:"#FEE2E2"}
                onMouseLeave={e=>e.currentTarget.style.background=f.uploaded?"white":"#FEF2F2"}>
                <span style={{fontSize:11,color:T.t4,fontWeight:600}}>{i+1}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:f.uploaded?T.t1:T.red,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {f.uploaded?"":"⚠ "}{f.name}
                  </div>
                  {f.uploaded_at&&<div style={{fontSize:9.5,color:T.t4,marginTop:1}}>{new Date(f.uploaded_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>}
                </div>
                <div style={{fontSize:10,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={f.used_in||""}>
                  {f.used_in||"—"}
                </div>
                <span style={{fontSize:10,fontWeight:700,color:ft.c,background:ft.bg,padding:"2px 6px",borderRadius:8,textAlign:"center"}}>
                  {f.type||"—"}
                </span>
                <div style={{display:"flex",gap:4}}>
                  {f.uploaded&&f.file_url?(
                    <>
                      <a href={f.file_url} target="_blank" rel="noreferrer"
                        style={{padding:"3px 8px",borderRadius:5,background:T.bluL,border:`1px solid ${T.bluM}`,color:T.blu,fontSize:10,fontWeight:600,textDecoration:"none"}}>
                       {t("common.view_2")}
                      </a>
                      <a href={f.file_url} download target="_blank" rel="noreferrer"
                        style={{padding:"3px 8px",borderRadius:5,background:T.grnL,border:`1px solid ${T.grnM}`,color:T.grn,fontSize:10,fontWeight:600,textDecoration:"none"}}>
                        ⬇
                      </a>
                    </>
                  ):(
                    <span style={{fontSize:10,color:T.red,fontWeight:600}}>{t("common.pending")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TabFiles;
