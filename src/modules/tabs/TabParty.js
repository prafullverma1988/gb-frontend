import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "../../config/api";
import { CreateTransactionModal } from "../FinanceModule";
import { T, fmtN } from "../shared/tokens";
import { Pill, Panel, PHead, THead, AddBtn, SecBtn } from "../shared/ui";

function AddPartyModal({ open, onClose, onSaved }) {
  // Sirf name + type compulsory; baki sabhi optional. Backend
  // /finance/parties POST handles full payload (phone, email, gstin,
  // pan, address, city, bank fields, opening_balance, credit_days).
  const blank = {
    name: "", type: "Supplier",
    phone: "", email: "", gstin: "", pan: "",
    address: "", city: "",
    bank_name: "", bank_account: "", ifsc: "",
    opening_balance: "", credit_days: "",
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (open) { setForm(blank); setErr(""); setSaving(false); setShowOptional(false); }
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}));

  const submit = async () => {
    if (!form.name.trim()) { setErr("Party name zaroori hai"); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        // Optional fields — null when blank so backend keeps defaults
        phone:        form.phone.trim()        || null,
        email:        form.email.trim()        || null,
        gstin:        form.gstin.trim()        || null,
        pan:          form.pan.trim()          || null,
        address:      form.address.trim()      || null,
        city:         form.city.trim()         || null,
        bank_name:    form.bank_name.trim()    || null,
        bank_account: form.bank_account.trim() || null,
        ifsc:         form.ifsc.trim()         || null,
        opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
        credit_days:     form.credit_days     ? parseInt(form.credit_days)       : 7,
      };
      const r = await api.post("/finance/parties", payload);
      if (!r?.success) { setErr(r?.message || "Save failed"); setSaving(false); return; }
      onSaved && onSaved();
      onClose();
    } catch (e) { setErr(e?.message || "Save failed"); setSaving(false); }
  };

  const lbl = (txt) => (
    <label style={{fontSize:10.5, fontWeight:600, color:T.t4, textTransform:"uppercase", letterSpacing:.4, display:"block", marginBottom:4}}>{txt}</label>
  );
  const ip = {width:"100%", padding:"8px 10px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:12.5, outline:"none", boxSizing:"border-box", fontFamily:"inherit"};

  return (
    <div onClick={onClose}
      style={{position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", zIndex:300,
        display:"flex", alignItems:"center", justifyContent:"center", padding:14}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface, borderRadius:12, padding:"18px 20px", width:560, maxWidth:"96vw",
          maxHeight:"90vh", overflowY:"auto",
          boxShadow:"0 12px 40px rgba(0,0,0,0.25)", borderTop:`4px solid ${T.blu}`}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14}}>
          <div>
            <div style={{fontSize:15, fontWeight:700, color:T.t1}}>Add New Party</div>
            <div style={{fontSize:11, color:T.t4, marginTop:2}}>Sirf Name + Type compulsory · baki sab optional</div>
          </div>
          <button onClick={onClose} style={{background:"none", border:"none", cursor:"pointer", fontSize:20, color:T.t4, lineHeight:1}}>×</button>
        </div>

        {/* Required basics */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
          <div>
            {lbl("Party Name *")}
            <input value={form.name} onChange={set("name")} placeholder="e.g. abhay traders" autoFocus style={ip}/>
          </div>
          <div>
            {lbl("Type *")}
            <select value={form.type} onChange={set("type")} style={{...ip, background:T.surface}}>
              {["Client","Supplier","Material Supplier","Sub-Con","Labour Vendor","Other Vendor"].map(t =>
                <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Toggle optional sections */}
        <button onClick={()=>setShowOptional(s=>!s)}
          style={{width:"100%", padding:"7px 10px", marginBottom:12, borderRadius:7, border:`1px dashed ${T.b1}`, background:T.surfaceB, color:T.blu, fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}>
          {showOptional ? "− Hide optional details" : "+ Add optional details (contact, GST, bank, etc)"}
        </button>

        {showOptional && (
          <>
            <div style={{fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:.5, marginBottom:6}}>Contact & Tax</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8}}>
              <div>{lbl("Phone")}<input value={form.phone} onChange={set("phone")} placeholder="10-digit" style={ip}/></div>
              <div>{lbl("Email")}<input value={form.email} onChange={set("email")} placeholder="optional" style={ip}/></div>
              <div>{lbl("GSTIN")}<input value={form.gstin} onChange={set("gstin")} placeholder="15-char GSTIN" style={ip}/></div>
              <div>{lbl("PAN")}<input value={form.pan} onChange={set("pan")} placeholder="optional" style={ip}/></div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:14}}>
              <div>{lbl("Address")}<input value={form.address} onChange={set("address")} placeholder="street / locality" style={ip}/></div>
              <div>{lbl("City")}<input value={form.city} onChange={set("city")} placeholder="optional" style={ip}/></div>
            </div>

            <div style={{fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:.5, marginBottom:6}}>Bank (optional)</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14}}>
              <div>{lbl("Bank Name")}<input value={form.bank_name} onChange={set("bank_name")} placeholder="e.g. HDFC" style={ip}/></div>
              <div>{lbl("Account No.")}<input value={form.bank_account} onChange={set("bank_account")} placeholder="account" style={ip}/></div>
              <div>{lbl("IFSC")}<input value={form.ifsc} onChange={set("ifsc")} placeholder="branch IFSC" style={ip}/></div>
            </div>

            <div style={{fontSize:10.5, fontWeight:700, color:T.t3, textTransform:"uppercase", letterSpacing:.5, marginBottom:6}}>Finance (optional)</div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
              <div>
                {lbl("Opening Balance (₹)")}
                <input type="number" value={form.opening_balance} onChange={set("opening_balance")} placeholder="0" style={ip}/>
                <div style={{fontSize:10, color:T.t4, marginTop:3}}>Pichla owed amount — backend ise live_balance me jod deta hai</div>
              </div>
              <div>
                {lbl("Credit Days")}
                <input type="number" value={form.credit_days} onChange={set("credit_days")} placeholder="7" style={ip}/>
                <div style={{fontSize:10, color:T.t4, marginTop:3}}>Default 7 din — bill ka due-date is se calculate hota hai</div>
              </div>
            </div>
          </>
        )}

        <div style={{fontSize:10.5, color:T.t4, background:T.surfaceB, padding:"7px 10px", borderRadius:6, border:`1px solid ${T.b1}`, marginBottom:12}}>
          Party banane ke baad iss tab me appear hone ke liye iske saath at-least ek transaction (Receipt / Payment / Bill) is project pe karna padega.
        </div>

        {err && <div style={{marginBottom:10, padding:"8px 10px", borderRadius:6, background:T.redL, border:`1px solid ${T.redM}`, color:T.red, fontSize:11.5}}>{err}</div>}

        <div style={{display:"flex", gap:8}}>
          <button onClick={onClose} disabled={saving}
            style={{flex:1, padding:"9px", border:`1px solid ${T.b2}`, borderRadius:7, background:T.surface, color:T.t3, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit"}}>Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{flex:2, padding:"9px", border:"none", borderRadius:7, background:T.blu, color:"#fff", fontSize:12.5, fontWeight:700, cursor:saving?"wait":"pointer", fontFamily:"inherit", opacity:saving?0.7:1}}>
            {saving ? "Saving..." : "Add Party"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabParty({ projectId, projectName }) {
  // ── Live data: parties + this-project's transactions ─────────
  // Party tab on a project detail page shows only parties that have
  // activity (any txn) on this project. Balance + ledger entries are
  // computed from project-scoped transactions, not the party's
  // company-wide balance.
  const [selP, setSelP] = useState(null);
  const [allParties, setAllParties] = useState([]);
  const [projTxns, setProjTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  // Two distinct modals:
  //  - txnModal {type, partyName}  → full CreateTransactionModal with
  //                                  party + project locked
  //  - showAddParty (bool)         → inline AddPartyModal
  const [txnModal, setTxnModal] = useState(null);
  const [showAddParty, setShowAddParty] = useState(false);
  const typeS = {
    "Client":{c:T.grn,bg:T.grnL},
    "client":{c:T.grn,bg:T.grnL},
    "Material Supplier":{c:T.blu,bg:T.bluL},
    "Supplier":{c:T.blu,bg:T.bluL},
    "supplier":{c:T.blu,bg:T.bluL},
    "Sub-Contractor":{c:T.slt,bg:T.sltL},
    "Sub-Con":{c:T.slt,bg:T.sltL},
    "Subcon":{c:T.slt,bg:T.sltL},
    "subcon":{c:T.slt,bg:T.sltL},
    "Labour Vendor":{c:T.pur,bg:T.purL},
    "staff":{c:T.amb,bg:T.ambL},
  };

  const reload = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      api.get("/finance/parties"),
      api.get("/finance/transactions?project_id=" + projectId + "&limit=2000"),
      api.get("/finance/accounts"),
      api.get("/projects"),
    ]).then(([pRes, tRes, aRes, prRes]) => {
      if (pRes?.success && Array.isArray(pRes.data)) setAllParties(pRes.data);
      if (tRes?.success && Array.isArray(tRes.data)) setProjTxns(tRes.data);
      if (aRes?.success && Array.isArray(aRes.data)) setAccounts(aRes.data);
      if (prRes?.success && Array.isArray(prRes.data)) setProjectsList(prRes.data.map(p=>p.name));
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  // Classify txn impact on party balance — vendor side (we owe them
  // when bill is raised, owe less when we pay) vs client side (they
  // owe us when we invoice, owe less when they pay).
  const isVendorType = (t) => {
    const x = String(t||"").toLowerCase();
    return x.includes("vendor") || x.includes("supplier") || x.includes("sub-con") || x.includes("subcon") || x.includes("staff");
  };

  // Per-party project-scoped data
  const partyRows = useMemo(() => {
    return allParties.map(p => {
      const myTxns = projTxns.filter(t => Number(t.party_id) === Number(p.id));
      if (myTxns.length === 0) return null; // skip parties with no activity on this project
      const isVendor = isVendorType(p.type);
      // Sort chronologically OLDEST first so running balance accumulates
      // naturally top-down (proper ledger view).
      const sortedTxns = [...myTxns].sort((a,b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (da !== db) return da - db;
        return (a.id||0) - (b.id||0);
      });
      // Direction convention:
      //   Vendor side  → CR = bill / purchase (we owe more)
      //                  DR = payment (we paid)
      //                  running balance = Σ CR − Σ DR  (positive = To Pay)
      //   Client side  → DR = invoice raised (they owe)
      //                  CR = receipt received (they paid)
      //                  running balance = Σ DR − Σ CR  (positive = To Receive)
      let credit = 0, debit = 0;
      let running = 0;
      const txnRows = [];
      for (const t of sortedTxns) {
        const amt = parseFloat(t.amount) || 0;
        const type = t.type || "";
        let isCR;
        if (isVendor) {
          // payment / party_payment = DR (we paid); bills = CR (we owe)
          if (type === "payment" || type === "party_payment") isCR = false;
          else if (type === "material_purchase" || type === "subcon_expense" || type === "site_expense") isCR = true;
          else if (type === "receipt") isCR = true; // money in from staff/vendor reimbursement
          else isCR = true; // default bill-like
        } else {
          // Client: receipt = CR, sales_invoice = DR
          if (type === "receipt") isCR = true;
          else if (type === "sales_invoice") isCR = false;
          else isCR = false;
        }
        if (isCR) credit += amt; else debit += amt;
        // Running balance — accumulates in the party's natural direction
        if (isVendor) running += isCR ? amt : -amt;
        else          running += isCR ? -amt : amt;
        txnRows.push({
          id: t.id,
          date: t.date ? new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "",
          project: t.project_name || "",         // project tag for ledger column
          // Only show the USER-typed note. `description` is auto-generated
          // ("Payment Made — party — project") which would duplicate the
          // Type / Project / (party-already-selected) columns. Empty → "—".
          note: (t.note || "").trim(),
          type: type.replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase()),
          amount: amt,
          cr: isCR,
          runBal: running,    // signed: positive = To Pay (vendor) / To Receive (client)
        });
      }
      const net = running;
      const balance = Math.abs(net);
      const balPositive = isVendor ? net <= 0 : net >= 0;
      const balLabel = isVendor
        ? (net > 0 ? "To Pay" : net < 0 ? "Advance Paid" : "Settled")
        : (net > 0 ? "To Receive" : net < 0 ? "Advance Received" : "Settled");
      return {
        id: p.id,
        name: p.name,
        type: p.type || "Other",
        isVendor,
        balance, balPositive, balLabel,
        txnRows,   // already chronological — oldest first for ledger
      };
    }).filter(Boolean).sort((a,b)=>b.balance-a.balance);
  }, [allParties, projTxns]);

  // Keep selection in sync when partyRows recompute. Dep on partyRows
  // (not just .length) so the ledger refreshes after a new txn is added
  // to an EXISTING party — otherwise selP.txnRows would stay stale.
  useEffect(() => {
    if (!selP) return;
    const match = partyRows.find(p => p.id === selP.id);
    if (!match) setSelP(null);
    else if (match !== selP) setSelP(match);
  }, [partyRows]);

  // Small HTML-entity escaper for safe template-literal injection
  // (party names, types, descriptions can contain quotes / brackets).
  const escapeHTML = (s) => String(s||"").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  // ── PDF export: open print window with project-party ledger ─────
  // Self-contained — no Reports module dependency. Sender / receiver
  // direction (CR / DR) already computed on selP.txnRows.
  const exportPartyLedgerPDF = (party, project) => {
    if (!party) return;
    const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    const isVendor = !!party.isVendor;
    // Per-row CR / DR / Running Balance — sign convention matches the UI.
    const rows = party.txnRows.map(t => {
      const balAbs = Math.abs(t.runBal||0);
      const balGood= isVendor ? (t.runBal<=0) : (t.runBal>=0);
      const balSfx = (t.runBal||0)===0 ? "" :
                     isVendor ? (t.runBal>0 ? "Cr" : "Dr")
                              : (t.runBal>0 ? "Dr" : "Cr");
      const proj   = t.project || project || "";
      const hasNote= !!(t.note && t.note.trim());
      return `
      <tr>
        <td>${t.date}</td>
        <td style="color:#6B7280">${escapeHTML(proj) || "—"}</td>
        <td style="${hasNote ? "" : "color:#9CA3AF;font-style:italic"}">${hasNote ? escapeHTML(t.note) : "—"}</td>
        <td><span style="font-size:9.5px;padding:2px 7px;border-radius:10px;background:#F8F9FB;color:#4B5563">${escapeHTML(t.type)}</span></td>
        <td style="text-align:right;font-weight:600;color:${t.cr ? "#059669" : "#CBD5E1"};font-variant-numeric:tabular-nums">
          ${t.cr ? `₹${(t.amount||0).toLocaleString("en-IN")}` : "—"}
        </td>
        <td style="text-align:right;font-weight:600;color:${!t.cr ? "#DC2626" : "#CBD5E1"};font-variant-numeric:tabular-nums">
          ${!t.cr ? `₹${(t.amount||0).toLocaleString("en-IN")}` : "—"}
        </td>
        <td style="text-align:right;font-weight:700;color:${balAbs===0?"#9CA3AF":(balGood?"#059669":"#DC2626")};font-variant-numeric:tabular-nums">
          ${balAbs===0 ? "₹0.00" : `₹${balAbs.toLocaleString("en-IN")} ${balSfx}`}
        </td>
      </tr>`;
    }).join("");
    const totalCR = party.txnRows.filter(t=>t.cr).reduce((s,t)=>s+(t.amount||0),0);
    const totalDR = party.txnRows.filter(t=>!t.cr).reduce((s,t)=>s+(t.amount||0),0);
    const lastBal = party.txnRows.length ? (party.txnRows[party.txnRows.length-1].runBal||0) : 0;
    const closeAbs= Math.abs(lastBal);
    const closeGood= isVendor ? (lastBal<=0) : (lastBal>=0);
    const closeSfx = lastBal===0 ? "" :
                     isVendor ? (lastBal>0 ? "Cr" : "Dr")
                              : (lastBal>0 ? "Dr" : "Cr");
    const w = window.open("", "_blank");
    if (!w) { window.alert("Print window blocked — allow pop-ups for this site."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>${escapeHTML(party.name)} — ${escapeHTML(project||"Project")}</title>
      <style>
        body{font-family:'Segoe UI',system-ui,sans-serif;color:#111827;margin:24px;font-size:13px}
        h1{font-size:18px;margin:0 0 4px}
        .sub{font-size:11px;color:#6B7280;margin-bottom:16px}
        .meta{display:flex;gap:24px;margin-bottom:14px;padding:10px 14px;background:#F8F9FB;border-radius:6px;border:1px solid #E5E7EB}
        .meta div{display:flex;gap:5px;align-items:center}
        .meta .l{font-size:10.5px;color:#6B7280;text-transform:uppercase;letter-spacing:.3px}
        .meta .v{font-size:12.5px;font-weight:600}
        table{width:100%;border-collapse:collapse;font-size:11.5px}
        th{background:#F8F9FB;color:#374151;font-weight:600;text-align:left;padding:8px 10px;border-bottom:2px solid #E5E7EB;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px}
        td{padding:8px 10px;border-bottom:1px solid #F3F4F6}
        tr:last-child td{border-bottom:none}
        .totals{margin-top:14px;display:flex;justify-content:flex-end;gap:30px;font-size:11.5px;padding:10px 14px;background:#F8F9FB;border-radius:6px;border:1px solid #E5E7EB}
        .totals .cr{color:#059669;font-weight:700}
        .totals .dr{color:#DC2626;font-weight:700}
        .totals .net{color:${party.balPositive?"#059669":"#DC2626"};font-weight:800}
        .footer{margin-top:24px;font-size:10px;color:#9CA3AF;text-align:center}
        @media print { body{margin:12mm} }
      </style></head><body>
        <h1>${escapeHTML(party.name)}</h1>
        <div class="sub">Party Ledger — ${escapeHTML(project||"Project")} · Generated ${today}</div>
        <div class="meta">
          <div><span class="l">Type:</span> <span class="v">${escapeHTML(party.type)}</span></div>
          <div><span class="l">Status:</span> <span class="v">${escapeHTML(party.balLabel)}</span></div>
          <div><span class="l">Balance:</span> <span class="v" style="color:${party.balPositive?"#059669":"#DC2626"}">₹${(party.balance||0).toLocaleString("en-IN")}</span></div>
          <div><span class="l">Entries:</span> <span class="v">${party.txnRows.length}</span></div>
        </div>
        <table>
          <tr>
            <th style="width:70px">Date</th>
            <th style="width:110px">Project</th>
            <th>Note</th>
            <th style="width:100px">Type</th>
            <th style="text-align:right;width:85px">CR ₹</th>
            <th style="text-align:right;width:85px">DR ₹</th>
            <th style="text-align:right;width:115px">Balance</th>
          </tr>
          ${party.txnRows.length ? `<tr style="background:#F8F9FB"><td colspan="6" style="font-style:italic;color:#6B7280">Opening Balance</td><td style="text-align:right;font-weight:600;color:#6B7280">₹0.00</td></tr>` : ""}
          ${rows || `<tr><td colspan="7" style="text-align:center;padding:30px;color:#9CA3AF">No transactions</td></tr>`}
          ${party.txnRows.length ? `<tr style="background:#F8F9FB;border-top:2px solid #D1D5DB">
            <td colspan="4" style="font-weight:700;text-transform:uppercase;letter-spacing:.3px;font-size:10.5px">Closing Balance</td>
            <td style="text-align:right;font-weight:700;color:#059669">₹${totalCR.toLocaleString("en-IN")}</td>
            <td style="text-align:right;font-weight:700;color:#DC2626">₹${totalDR.toLocaleString("en-IN")}</td>
            <td style="text-align:right;font-weight:800;color:${closeAbs===0?"#9CA3AF":(closeGood?"#059669":"#DC2626")}">
              ${closeAbs===0 ? "₹0.00" : `₹${closeAbs.toLocaleString("en-IN")} ${closeSfx}`}
            </td>
          </tr>` : ""}
        </table>
        <div class="totals">
          <div>Total Credits: <span class="cr">₹${totalCR.toLocaleString("en-IN")}</span></div>
          <div>Total Debits: <span class="dr">₹${totalDR.toLocaleString("en-IN")}</span></div>
          <div>Net Balance: <span class="net">${party.balPositive?"":"−"}₹${party.balance.toLocaleString("en-IN")} (${escapeHTML(party.balLabel)})</span></div>
        </div>
        <div class="footer">Generated by GB Buildcon · Project-scoped ledger</div>
      </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(), 400);
  };

  // Map button kind → the actual transaction "type" string that
  // CreateTransactionModal expects. Vendor / client direction is
  // resolved INSIDE the modal based on the party's library type,
  // so we just need the right top-level type per button kind.
  const txnTypeFor = (kind, party) => {
    const isVendor = String(party?.type||"").toLowerCase();
    const isSupplier = isVendor.includes("supplier") || (isVendor.includes("material") && !isVendor.includes("subcon"));
    const isSubcon = isVendor.includes("subcon") || isVendor.includes("sub-con");
    if (kind === "receipt") return "Payment Received";
    if (kind === "payment") return "Payment Made";
    // bill kind → choose between Material Purchase Bill / Sub-Con Bill / Sales Invoice
    if (kind === "bill") {
      if (isSubcon) return "Sub-Con Bill";
      if (isSupplier) return "Material Purchase Bill";
      return "Sales Invoice";  // client → invoice
    }
    return "Payment Made";
  };

  return (
    <div style={{padding:"16px 18px", display:"flex", gap:14, height:"100%"}}>
      {/* + Add Party modal */}
      <AddPartyModal open={showAddParty} onClose={()=>setShowAddParty(false)} onSaved={reload}/>
      {/* Full Create Transaction modal — same one Finance tab uses,
          with party + project pinned to the current context. */}
      {txnModal && (
        <CreateTransactionModal
          type={txnModal.type}
          preParty={txnModal.partyName}
          preProject={projectName}
          lockParty={true}
          lockProject={true}
          onClose={()=>setTxnModal(null)}
          dbParties={allParties}
          dbAccounts={accounts}
          dbProjects={projectsList}
          onSaved={()=>{ setTxnModal(null); reload(); }}
        />
      )}
      <div style={{width:290, flexShrink:0}}>
        <Panel style={{overflow:"hidden"}}>
          <PHead title={`Parties (${partyRows.length})`} action={<AddBtn label="Add Party" onClick={()=>setShowAddParty(true)}/>}/>
          {loading && (
            <div style={{padding:"30px 16px", textAlign:"center", color:T.t4, fontSize:12}}>Loading parties...</div>
          )}
          {!loading && partyRows.length === 0 && (
            <div style={{padding:"30px 16px", textAlign:"center", color:T.t4, fontSize:12}}>
              No parties with activity on this project yet.
              <div style={{fontSize:10.5, marginTop:4}}>Create a transaction tagged to this project to add a party here.</div>
            </div>
          )}
          {partyRows.map(p=>{
            const ts = typeS[p.type]||{c:T.slt,bg:T.sltL};
            const isS = selP?.id===p.id;
            return (
              <div key={p.id} onClick={()=>setSelP(p)}
                style={{padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${T.b1}`, background:isS?T.bluL:"transparent", borderLeft:isS?`3px solid ${T.blu}`:"3px solid transparent", transition:"all .12s"}}
                onMouseEnter={e=>{if(!isS)e.currentTarget.style.background=T.surfaceB;}} onMouseLeave={e=>{if(!isS)e.currentTarget.style.background="transparent";}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5}}>
                  <span style={{fontSize:12.5, fontWeight:isS?700:500, color:isS?T.blu:T.t1, flex:1, paddingRight:6, lineHeight:1.3}}>{p.name}</span>
                  <span style={{fontSize:13, fontWeight:700, color:p.balPositive?T.grn:T.red, flexShrink:0, fontVariantNumeric:"tabular-nums"}}>₹{fmt(p.balance)}</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <Pill label={p.type} c={ts.c} bg={ts.bg}/>
                  <span style={{fontSize:10.5, color:T.t4}}>{p.balLabel}</span>
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      <div style={{flex:1}}>
        <Panel style={{height:"100%", overflow:"hidden", display:"flex", flexDirection:"column"}}>
          {selP?(
            <>
              <PHead title={`${selP.name}  ·  ${projectName||"Project"}`} action={<SecBtn label="Export PDF" onClick={()=>exportPartyLedgerPDF(selP, projectName)}/>}/>
              <div style={{padding:"8px 15px", borderBottom:`1px solid ${T.b1}`, background:T.surfaceB, display:"flex", gap:20}}>
                {[["Type",selP.type],["Balance",`₹${fmtN(selP.balance)}`],["Status",selP.balLabel]].map(([l,v])=>(
                  <div key={l} style={{display:"flex", gap:6, alignItems:"center"}}>
                    <span style={{fontSize:11, color:T.t4}}>{l}:</span>
                    <span style={{fontSize:12.5, fontWeight:600, color:T.t1}}>{v}</span>
                  </div>
                ))}
                <div style={{marginLeft:"auto", fontSize:10.5, color:T.t4, fontStyle:"italic"}}>
                  Ledger for this project only · {selP.txnRows.length} txn(s)
                </div>
              </div>
              <div style={{flex:1, overflowY:"auto"}}>
                {(() => {
                  // 7-column grid: Date | Project | Note | Type | CR | DR | Balance
                  const COLS = "72px 110px 1fr 105px 92px 92px 118px";
                  return (
                    <>
                      <THead cols={COLS} headers={["Date","Project","Note","Type","CR ₹","DR ₹","Balance"]}/>
                      {/* Opening balance row — project-scoped ledger always starts at 0 */}
                      {selP.txnRows.length>0 && (
                        <div style={{display:"grid", gridTemplateColumns:COLS, padding:"7px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", background:T.surfaceB}}>
                          <span style={{fontSize:11, color:T.t4, fontStyle:"italic"}}>—</span>
                          <span style={{fontSize:11, color:T.t4, fontStyle:"italic"}}>—</span>
                          <span style={{fontSize:12, color:T.t3, fontStyle:"italic", fontWeight:500}}>Opening Balance</span>
                          <span style={{fontSize:10.5, color:T.t4, fontStyle:"italic"}}>—</span>
                          <span style={{fontSize:12, color:T.t4, textAlign:"right"}}>—</span>
                          <span style={{fontSize:12, color:T.t4, textAlign:"right"}}>—</span>
                          <span style={{fontSize:12, fontWeight:600, color:T.t4, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>₹0.00</span>
                        </div>
                      )}
                      {selP.txnRows.map((txn,i)=>{
                        // Ledger sign convention (party-side):
                        //   vendor: runBal > 0 → "Cr" (we owe them)        → red
                        //   vendor: runBal < 0 → "Dr" (advance paid)        → green
                        //   client: runBal > 0 → "Dr" (they owe us)         → green
                        //   client: runBal < 0 → "Cr" (advance received)    → red
                        const balAbs = Math.abs(txn.runBal||0);
                        const balGood = selP.isVendor ? (txn.runBal<=0) : (txn.runBal>=0);
                        const balSfx  = txn.runBal===0 ? "" :
                                        selP.isVendor
                                          ? (txn.runBal>0 ? "Cr" : "Dr")
                                          : (txn.runBal>0 ? "Dr" : "Cr");
                        const proj = txn.project || projectName || "";
                        const hasNote = !!txn.note;
                        return (
                          <div key={i} style={{display:"grid", gridTemplateColumns:COLS, padding:"9px 15px", borderBottom:`1px solid ${T.b1}`, alignItems:"center", borderLeft:`3px solid ${txn.cr?T.grn:T.red}33`, transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <span style={{fontSize:11.5, color:T.t4}}>{txn.date}</span>
                            <span style={{fontSize:11.5, color:T.t3, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={proj}>{proj || "—"}</span>
                            <span style={{fontSize:12.5, color:hasNote?T.t1:T.t4, fontWeight:hasNote?500:400, fontStyle:hasNote?"normal":"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={txn.note}>
                              {hasNote ? txn.note : "—"}
                            </span>
                            <Pill label={txn.type} c={T.slt} bg={T.sltL}/>
                            <span style={{fontSize:12.5, fontWeight:600, color:txn.cr?T.grn:T.b2, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {txn.cr ? `₹${fmtN(txn.amount)}` : "—"}
                            </span>
                            <span style={{fontSize:12.5, fontWeight:600, color:!txn.cr?T.red:T.b2, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {!txn.cr ? `₹${fmtN(txn.amount)}` : "—"}
                            </span>
                            <span style={{fontSize:12.5, fontWeight:700, color:balAbs===0?T.t4:(balGood?T.grn:T.red), fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {balAbs===0 ? "₹0.00" : `₹${fmtN(balAbs)} ${balSfx}`}
                            </span>
                          </div>
                        );
                      })}
                      {/* Closing total row */}
                      {selP.txnRows.length>0 && (()=>{
                        const lastBal = selP.txnRows[selP.txnRows.length-1].runBal||0;
                        const totalCR = selP.txnRows.filter(t=>t.cr).reduce((s,t)=>s+(t.amount||0),0);
                        const totalDR = selP.txnRows.filter(t=>!t.cr).reduce((s,t)=>s+(t.amount||0),0);
                        const closeAbs = Math.abs(lastBal);
                        const closeGood = selP.isVendor ? (lastBal<=0) : (lastBal>=0);
                        const closeSfx  = lastBal===0 ? "" :
                                          selP.isVendor
                                            ? (lastBal>0 ? "Cr" : "Dr")
                                            : (lastBal>0 ? "Dr" : "Cr");
                        return (
                          <div style={{display:"grid", gridTemplateColumns:COLS, padding:"10px 15px", borderTop:`2px solid ${T.b2}`, alignItems:"center", background:T.surfaceB, fontWeight:700}}>
                            <span/>
                            <span/>
                            <span style={{fontSize:12, color:T.t2, fontWeight:700, textTransform:"uppercase", letterSpacing:.3}}>Closing Balance</span>
                            <span/>
                            <span style={{fontSize:12.5, color:T.grn, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>₹{fmtN(totalCR)}</span>
                            <span style={{fontSize:12.5, color:T.red, fontVariantNumeric:"tabular-nums", textAlign:"right"}}>₹{fmtN(totalDR)}</span>
                            <span style={{fontSize:13, fontWeight:800, color:closeAbs===0?T.t4:(closeGood?T.grn:T.red), fontVariantNumeric:"tabular-nums", textAlign:"right"}}>
                              {closeAbs===0 ? "₹0.00" : `₹${fmtN(closeAbs)} ${closeSfx}`}
                            </span>
                          </div>
                        );
                      })()}
                      {selP.txnRows.length===0&&<div style={{padding:"40px 20px", textAlign:"center", color:T.t4, fontSize:13}}>No transactions on this project</div>}
                    </>
                  );
                })()}
              </div>
              <div style={{padding:"9px 15px", borderTop:`1px solid ${T.b1}`, display:"flex", gap:8}}>
                <button onClick={()=>setTxnModal({type:txnTypeFor("receipt", selP), partyName:selP.name})}
                  style={{flex:1, padding:"7px", border:`1px solid ${T.grnM}`, borderRadius:6, background:T.grnL, color:T.grn, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Receipt</button>
                <button onClick={()=>setTxnModal({type:txnTypeFor("payment", selP), partyName:selP.name})}
                  style={{flex:1, padding:"7px", border:`1px solid ${T.redM}`, borderRadius:6, background:T.redL, color:T.red, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Payment</button>
                <button onClick={()=>setTxnModal({type:txnTypeFor("bill", selP), partyName:selP.name})}
                  style={{flex:1, padding:"7px", border:`1px solid ${T.b2}`, borderRadius:6, background:T.surface, color:T.t2, fontSize:12, fontWeight:600, cursor:"pointer"}}>+ Bill</button>
              </div>
            </>
          ):(
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:T.t4, fontSize:13}}>
              {partyRows.length === 0 ? "Add a party to start" : "Select a party to view its project-scoped ledger"}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default TabParty;
