// Company delete — the one place both the Customers page and the Companies
// service tab go through when a company is no longer needed.
//
// Why this exists: the old flow called /purge with only `confirm_name`. The
// endpoint refuses any company that is still active or inside its retention
// window unless it also gets `force` + `reason`, and nothing in the UI could
// send those — so "Purge" was a dead end for every live company, and the error
// it showed leaked API parameter names at a human.
//
// Two genuinely different actions, kept visibly apart:
//   Deactivate — reversible, data stays. The right answer almost every time.
//   Delete     — irreversible. Only for test/mistake companies.
//
// The recovery file is downloaded BEFORE anything is deleted, not after. The
// endpoint does return its own export in the purge response, but that arrives
// once the rows are already gone: if that download fails there is no second
// chance (binlog is off — see docs/diagnostics/pre-deploy-block-check.md).
import { useState } from "react";
import { apiFetch, T, IcX, IcChk, IcDownload, IcUsers, IcFolder } from "./tokens";
import { Btn } from "./ui";

// Throws instead of swallowing — the caller gates the delete button on this
// having actually succeeded, so a silent failure here would be dangerous.
function download(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function Shell({ children, tone }) {
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, backdropFilter:"blur(3px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:500, maxHeight:"88vh",
        background:T.surface, borderRadius:16, zIndex:601, boxShadow:"0 24px 64px rgba(0,0,0,0.35)",
        overflow:"hidden", display:"flex", flexDirection:"column", borderTop:`4px solid ${tone}` }}>
        {children}
      </div>
    </>
  );
}

function Row({ Icon, label, value }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      <Icon size={12} color={T.t4}/>
      <span style={{ fontSize:11.5, color:T.t3 }}>{label}</span>
      <span style={{ fontSize:12.5, fontWeight:700, color:T.t1 }}>{value}</span>
    </div>
  );
}

export default function DeleteCompanyModal({ company, onClose, onDone, setToast }) {
  const [step, setStep] = useState("choose");   // choose | delete
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(null); // row count once saved
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  const c = company;
  const nameOk = name.trim() === String(c.name).trim();

  const deactivate = async () => {
    setBusy(true);
    const res = await apiFetch(`/saas-admin/companies/${c.id}/toggle`, { method:"PUT" });
    setBusy(false);
    if (!res.success) return setToast({ msg: res.message || "Deactivate nahi hua", type:"error" });
    setToast({ msg:`"${c.name}" band kar di gayi — data safe hai, kabhi bhi wapas chalu kar sakte ho` });
    onDone(); onClose();
  };

  const takeExport = async () => {
    setBusy(true);
    const res = await apiFetch(`/saas-admin/companies/${c.id}/export-data`, { method:"POST" });
    setBusy(false);
    if (!res.success) return setToast({ msg: res.message || "Export fail hua — delete rok diya", type:"error" });
    try {
      download(res.data, `${c.slug || c.id}-recovery.json`);
      setExported(res.data.meta.total_rows);
      setToast({ msg:`Recovery file download ho gayi — ${res.data.meta.total_rows} rows` });
    } catch (e) {
      setToast({ msg:"Recovery file save nahi hui — delete rok diya", type:"error" });
    }
  };

  const purge = async () => {
    setBusy(true);
    // force is deliberate here: the operator has typed the name and written a
    // reason, and both land in the audit row alongside force:true.
    const res = await apiFetch(`/saas-admin/companies/${c.id}/purge`, {
      method:"DELETE",
      body: { confirm_name: name.trim(), reason: reason.trim(), force: true },
    });
    setBusy(false);
    if (!res.success) return setToast({ msg: res.message || "Delete fail hua", type:"error" });
    // Second copy — the server takes its own dump right before deleting.
    if (res.export) { try { download(res.export, `${c.slug || c.id}-recovery-final.json`); } catch (_) {} }
    setToast({ msg: res.message });
    onDone(); onClose();
  };

  // ── STEP 1: what is this company, and which of the two do you want ──
  if (step === "choose") {
    return (
      <Shell tone={T.amb}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.b1}` }}>
          <div style={{ fontSize:15.5, fontWeight:800, color:T.t1 }}>{c.name} hatani hai?</div>
          <div style={{ fontSize:11.5, color:T.t3, marginTop:2 }}>/{c.slug}</div>
        </div>

        <div style={{ padding:"16px 22px", display:"flex", gap:18, flexWrap:"wrap",
          background:T.surfaceB, borderBottom:`1px solid ${T.b1}` }}>
          <Row Icon={IcUsers} label="Users" value={c.user_count ?? "—"}/>
          <Row Icon={IcFolder} label="Projects" value={c.project_count ?? "—"}/>
          <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20,
            background:(c.is_active ? T.grn : T.red) + "18", color: c.is_active ? T.grn : T.red }}>
            {c.is_active ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:12 }}>
          <button onClick={deactivate} disabled={busy || !c.is_active}
            style={{ textAlign:"left", padding:"13px 15px", borderRadius:10, cursor: c.is_active ? "pointer" : "not-allowed",
              border:`1.5px solid ${T.b1}`, background:T.surface, opacity: c.is_active ? 1 : 0.5, fontFamily:"inherit" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1, marginBottom:3 }}>
              Band kar do {c.is_active && <span style={{ fontSize:10, color:T.grn }}>— recommended</span>}
            </div>
            <div style={{ fontSize:11.5, color:T.t3, lineHeight:1.45 }}>
              {c.is_active
                ? "Login turant band. Saara data waise ka waisa rehta hai aur kabhi bhi wapas chalu kar sakte ho."
                : "Ye company pehle se band hai."}
            </div>
          </button>

          <button onClick={() => setStep("delete")} disabled={busy}
            style={{ textAlign:"left", padding:"13px 15px", borderRadius:10, cursor:"pointer",
              border:`1.5px solid ${T.redM}`, background:T.redL, fontFamily:"inherit" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.red, marginBottom:3 }}>Hamesha ke liye delete karo</div>
            <div style={{ fontSize:11.5, color:T.t3, lineHeight:1.45 }}>
              Poora data mit jayega — wapas nahi aayega. Sirf test ya galti se bani company ke liye.
            </div>
          </button>
        </div>

        <div style={{ padding:"12px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", justifyContent:"flex-end" }}>
          <Btn variant="outline" onClick={onClose}>Rehne do</Btn>
        </div>
      </Shell>
    );
  }

  // ── STEP 2: three locks, in order ──────────────────────────────────
  const canDelete = !!exported && nameOk && reason.trim().length >= 3 && !busy;

  return (
    <Shell tone={T.red}>
      <div style={{ padding:"18px 22px", background:T.redL, borderBottom:`1px solid ${T.redM}` }}>
        <div style={{ fontSize:15.5, fontWeight:800, color:T.red }}>"{c.name}" hamesha ke liye delete</div>
        <div style={{ fontSize:11.5, color:T.t2, marginTop:3, lineHeight:1.45 }}>
          {c.user_count ?? 0} users aur {c.project_count ?? 0} projects ka saara data mit jayega. Ye wapas nahi aata.
        </div>
      </div>

      <div style={{ padding:"18px 22px", overflowY:"auto", display:"flex", flexDirection:"column", gap:16 }}>
        {/* 1 — recovery file, before anything is destroyed */}
        <div>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.t1, marginBottom:6 }}>1. Recovery file apne paas rakho</div>
          {exported ? (
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px", borderRadius:8,
              background:T.grnL, border:`1px solid ${T.grnM}` }}>
              <IcChk size={13} color={T.grn}/>
              <span style={{ fontSize:11.5, color:T.grn, fontWeight:600 }}>
                Download ho gayi — {exported} rows. Delete karne se pehle isko safe jagah rakh lo.
              </span>
            </div>
          ) : (
            <>
              <Btn variant="outline" onClick={takeExport} disabled={busy}>
                <IcDownload size={12}/> {busy ? "Ban rahi hai…" : "Recovery file download karo"}
              </Btn>
              <div style={{ fontSize:10.5, color:T.t4, marginTop:5 }}>
                Delete tabhi khulega jab ye file save ho jaye — wapas laane ka yahi ekmatra raasta hai.
              </div>
            </>
          )}
        </div>

        {/* 2 — exact name */}
        <div>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.t1, marginBottom:6 }}>
            2. Company ka naam bilkul waisa hi likho — <span style={{ fontFamily:"monospace", color:T.red }}>{c.name}</span>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={c.name} disabled={!exported}
            style={{ width:"100%", padding:"9px 12px", borderRadius:7, fontSize:13, fontFamily:"monospace",
              border:`1.5px solid ${name ? (nameOk ? T.grnM : T.redM) : T.b1}`, background: exported ? T.surfaceB : T.b1+"40",
              color:T.t1, outline:"none", boxSizing:"border-box" }}/>
        </div>

        {/* 3 — reason: mandatory server-side with force, and it lands in audit_logs */}
        <div>
          <div style={{ fontSize:11.5, fontWeight:700, color:T.t1, marginBottom:6 }}>3. Kyun delete kar rahe ho?</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} disabled={!exported}
            placeholder="jaise: test company thi, galti se bani"
            style={{ width:"100%", padding:"9px 12px", borderRadius:7, fontSize:12.5, fontFamily:"inherit", resize:"vertical",
              border:`1.5px solid ${T.b1}`, background: exported ? T.surfaceB : T.b1+"40", color:T.t1, outline:"none", boxSizing:"border-box" }}/>
          <div style={{ fontSize:10.5, color:T.t4, marginTop:5 }}>Audit log me aapke naam ke saath save hoga.</div>
        </div>
      </div>

      <div style={{ padding:"13px 22px", borderTop:`1px solid ${T.b1}`, display:"flex", justifyContent:"space-between", gap:9 }}>
        <Btn variant="outline" onClick={() => setStep("choose")} disabled={busy}>Peeche</Btn>
        <div style={{ display:"flex", gap:9 }}>
          <Btn variant="outline" onClick={onClose} disabled={busy}>Rehne do</Btn>
          <button onClick={purge} disabled={!canDelete}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:8, border:"none",
              background: canDelete ? T.red : T.t4, color:"#fff", fontSize:12.5, fontWeight:700,
              cursor: canDelete ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
            <IcX size={12}/> {busy ? "Delete ho raha…" : "Hamesha ke liye delete karo"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
