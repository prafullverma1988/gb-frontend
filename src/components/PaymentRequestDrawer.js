// ── PAYMENT REQUEST DRAWER ──────────────────────────────────────────
// Site team raises a payment request for subcon / site labour / expense.
// Posts to /finance/payment-requests for admin approval.
//
// Usage:
//   <PaymentRequestDrawer
//     open={show}
//     onClose={()=>setShow(false)}
//     project={{ id, name }}              // auto-filled
//     prefillType="subcon"                 // optional: subcon | labour | expense | other
//     prefillParty={{ id, name }}          // optional: pre-select beneficiary
//     onSaved={()=>refresh()}
//   />

import { useState, useEffect } from "react";
import api from "../config/api";
import SearchSelect from "./SearchSelect";

const T = {
  bg: "#F4F6F9",
  surface: "#FFFFFF",
  surfaceB: "#F8F9FB",
  t1: "#111827",
  t2: "#374151",
  t3: "#6B7280",
  t4: "#9CA3AF",
  b1: "#E5E7EB",
  b2: "#D1D5DB",
  blu: "#2563EB",
  bluL: "#EFF6FF",
  bluM: "#BFDBFE",
  grn: "#059669",
  grnL: "#ECFDF5",
  grnM: "#A7F3D0",
  amb: "#D97706",
  ambL: "#FFFBEB",
  ambM: "#FDE68A",
  red: "#DC2626",
  redL: "#FEF2F2",
  redM: "#FECACA",
  pur: "#7C3AED",
  purL: "#F5F3FF",
  purM: "#DDD6FE",
};

const TYPES = [
  { id: "subcon",  label: "Subcontractor", icon: "M2 18h20M4 18v-6a8 8 0 0116 0v6", c: T.amb,  bg: T.ambL,  brd: T.ambM,  desc: "Pay a subcon for completed work" },
  { id: "labour",  label: "Site Labour",   icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z", c: T.blu, bg: T.bluL, brd: T.bluM, desc: "Daily wage / weekly worker payment" },
  { id: "expense", label: "Site Expense",  icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", c: T.grn, bg: T.grnL, brd: T.grnM, desc: "Material, transport, misc cash expense" },
  { id: "other",   label: "Other",         icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", c: T.pur, bg: T.purL, brd: T.purM, desc: "Other payment need" },
];

const PRIORITIES = [
  { id: "Low",    c: T.t3,  bg: T.surfaceB, brd: T.b1 },
  { id: "Medium", c: T.amb, bg: T.ambL,     brd: T.ambM },
  { id: "High",   c: T.red, bg: T.redL,     brd: T.redM },
  { id: "Urgent", c: T.pur, bg: T.purL,     brd: T.purM },
];

export default function PaymentRequestDrawer({
  open,
  onClose,
  project,
  prefillType,
  prefillParty,
  onSaved,
}) {
  const [type, setType] = useState(prefillType || "subcon");
  const [partyName, setPartyName] = useState(prefillParty?.name || "");
  const [partyId, setPartyId] = useState(prefillParty?.id || null);
  const [parties, setParties] = useState([]);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setType(prefillType || "subcon");
      setPartyName(prefillParty?.name || "");
      setPartyId(prefillParty?.id || null);
      setAmount("");
      setPurpose("");
      setNote("");
      setPriority("Medium");
      setErr("");
    }
  }, [open, prefillType, prefillParty]);

  // Load parties (filtered by type)
  useEffect(() => {
    if (!open) return;
    api.get("/parties").then(r => {
      if (r.success && Array.isArray(r.data)) setParties(r.data);
    }).catch(()=>{});
  }, [open]);

  const partyOptions = (() => {
    const filterMap = {
      subcon: (p) => /subcon|contractor/i.test(p.type || ""),
      labour: () => false, // labour: free-text or different source
      expense: () => true, // any party
      other: () => true,
    };
    const filtered = parties.filter(filterMap[type] || (() => true));
    return filtered.map(p => ({ value: String(p.id), label: p.name + (p.type ? ` (${p.type})` : "") }));
  })();

  const handleSave = async () => {
    if (!partyName.trim() && !partyId) { setErr("Please specify the beneficiary"); return; }
    if (!purpose.trim()) { setErr("Purpose is required"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr("Enter a valid amount"); return; }

    setSaving(true);
    setErr("");
    try {
      const typeMeta = TYPES.find(t => t.id === type);
      const res = await api.post("/finance/payment-requests", {
        party_id: partyId,
        party_name: partyName,
        project_id: project?.id || null,
        project_name: project?.name || "",
        amount: amt,
        purpose: `[${typeMeta?.label || type}] ${purpose}`,
        description: purpose + (note ? " — " + note : ""),
        priority,
        note: note || null,
        request_type: type,
      });
      if (res?.success === false) {
        setErr(res.message || "Save failed");
        setSaving(false);
        return;
      }
      if (window.toast) window.toast.success("Payment request sent for approval");
      onSaved && onSaved();
      onClose && onClose();
    } catch (e) {
      setErr(e?.message || "Network error");
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes gbPRSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 540, maxWidth: "95vw",
        background: T.surface, boxShadow: "-8px 0 30px rgba(0,0,0,0.18)", zIndex: 201,
        display: "flex", flexDirection: "column", animation: "gbPRSlide .25s ease-out",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "13px 16px", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "white" }}>Request Payment</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              {project?.name ? `${project.name} · ` : ""}Sent for admin approval
            </div>
          </div>
          <button onClick={onClose} title="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .12s" }}
            onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={el => el.currentTarget.style.background = "none"}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {/* Type — visual chip cards */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>What is this for? *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TYPES.map(t => {
                const active = type === t.id;
                return (
                  <button key={t.id} onClick={() => setType(t.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${active ? t.c : T.b1}`,
                      background: active ? t.bg : T.surface,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: "inherit",
                      transition: "all .12s",
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = T.b2; e.currentTarget.style.background = T.surfaceB; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = T.b1; e.currentTarget.style.background = T.surface; } }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: active ? t.c + "22" : T.surfaceB,
                      border: `1px solid ${active ? t.c + "44" : T.b1}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={active ? t.c : T.t3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d={t.icon} />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? t.c : T.t1 }}>{t.label}</div>
                      <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Beneficiary */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>{type === "subcon" ? "Subcontractor *" : type === "labour" ? "Worker / Group *" : type === "expense" ? "Vendor / Recipient *" : "Beneficiary *"}</label>
            {(type === "subcon" || type === "expense") && partyOptions.length > 0 ? (
              <SearchSelect
                value={partyId ? String(partyId) : ""}
                options={partyOptions}
                onChange={(v) => {
                  setPartyId(v);
                  const p = parties.find(x => String(x.id) === String(v));
                  setPartyName(p?.name || "");
                }}
                placeholder={type === "subcon" ? "Select subcontractor..." : "Select vendor..."}
              />
            ) : (
              <input value={partyName} onChange={e => setPartyName(e.target.value)}
                placeholder={type === "labour" ? "e.g. Mason group, Saturday wages" : "Type beneficiary name..."}
                style={inp} onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            )}
          </div>

          {/* Amount + Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Amount (₹) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 25000"
                style={{ ...inp, fontSize: 14, fontWeight: 600 }}
                onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            </div>
            <div>
              <label style={lbl}>Priority</label>
              <div style={{ display: "flex", gap: 4, padding: 2, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 7 }}>
                {PRIORITIES.map(p => {
                  const active = priority === p.id;
                  return (
                    <button key={p.id} onClick={() => setPriority(p.id)}
                      style={{
                        flex: 1, padding: "5px 0", borderRadius: 5, border: "none",
                        background: active ? p.c : "transparent",
                        color: active ? "#fff" : p.c,
                        fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        transition: "all .12s",
                      }}>{p.id}</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Purpose / Reason *</label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)}
              placeholder={type === "subcon" ? "e.g. Brickwork bill — Block A" : type === "labour" ? "e.g. Mason wages — week of 21 Apr" : "e.g. Cement transport"}
              style={inp} onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
          </div>

          {/* Note */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Additional Notes (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Any context for the approver..."
              style={{ ...inp, padding: "9px 11px", height: "auto", resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
          </div>

          {err && (
            <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, background: T.surfaceB }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: "9px 16px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b2}`, color: T.t2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: "9px 22px", borderRadius: 7,
              background: T.blu, border: "none", color: "white",
              fontSize: 12.5, fontWeight: 700, cursor: saving ? "wait" : "pointer",
              boxShadow: `0 2px 8px ${T.blu}40`, fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── styles ──
const lbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 };
const inp = { width: "100%", height: 36, padding: "0 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .12s" };
