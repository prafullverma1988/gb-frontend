// ── Staff ko paisa do (18 Nov 2026) ───────────────────────────────────────
// Sabse pehle "Kis liye" — usi se tay hota hai paisa kahan lage:
//   Salary  → salary ka baaki katta hai (POST /staff-pay/pay)
//   Petrol  → petrol ka baaki katta hai; baaki bana hi na ho to wallet me
//             petrol ke naam se (POST /wallets/send-to-staff bucket 'petrol')
//   Wallet  → staff ke wallet me kharche ke liye (send-to-staff 'imprest')
// Salary / Petrol company ke account se ya dene wale ke apne wallet se ja sakta
// hai — dono me staff ka kharche wala wallet nahi badhta. Paisa sabse purane
// baaki me pehle lagta hai. Finance → Staff Wallets ka "Send ₹" aur Company ke
// kharche ka "Do" dono yahi kholte hain.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../config/api";
import PickSelect from "../../components/PickSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthLabel = (m, y) => new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const MY_WALLET = "my_wallet";

export default function StaffPayModal({ staff, accounts, onClose, onDone, initialPurpose }) {
  const accts = accounts || [];
  const canTopup = staff.canTopup !== false;
  const [dues, setDues] = useState(null);
  const [purpose, setPurpose] = useState(initialPurpose || "salary");
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(accts.length === 1 ? String(accts[0].id) : "");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("bank_transfer");
  const [txRef, setTxRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const idem = useRef("sp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10));
  const touched = useRef(false);

  const salDue = Number(dues && dues.salary.payable) || 0;
  const petDue = Number(dues && dues.petrol.payable) || 0;
  const dueOf = (p) => (p === "salary" ? salDue : p === "petrol" ? petDue : 0);

  useEffect(() => {
    let live = true;
    api.get(`/staff-pay/dues/${staff.id}`).then((r) => {
      if (!live) return;
      const d = r && r.success ? r.data : { salary: { payable: 0, months: [] }, petrol: { payable: 0, months: [] } };
      setDues(d);
      // Pehli baar: jiska baaki ho wahi chuna ho, rakam bhari ho
      if (!initialPurpose) {
        const p = d.salary.payable > 0 ? "salary" : d.petrol.payable > 0 ? "petrol" : canTopup ? "wallet" : "salary";
        setPurpose(p);
        if (!touched.current) setAmount(p === "wallet" ? "" : String(p === "salary" ? d.salary.payable : d.petrol.payable));
      } else if (!touched.current) {
        const x = initialPurpose === "salary" ? d.salary.payable : initialPurpose === "petrol" ? d.petrol.payable : 0;
        setAmount(x > 0 ? String(x) : "");
      }
    }).catch(() => { if (live) setDues({ salary: { payable: 0, months: [] }, petrol: { payable: 0, months: [] } }); });
    return () => { live = false; };
  }, [staff.id, initialPurpose, canTopup]);

  const pick = (p) => {
    setPurpose(p); setErr("");
    const d = dueOf(p);
    setAmount(d > 0 ? String(d) : "");
    touched.current = false;
    if (p === "wallet" && from === MY_WALLET) setFrom("");
  };

  // Petrol ka baaki bana hi nahi → paisa wallet me petrol ke naam se (purana tareeka)
  const petrolToWallet = purpose === "petrol" && !(petDue > 0);
  const toWallet = purpose === "wallet" || petrolToWallet;
  const fromWallet = from === MY_WALLET;
  const acct = accts.find((a) => String(a.id) === String(from));
  const amt = Number(amount) || 0;

  const send = async () => {
    setErr("");
    if (!(amt > 0)) { setErr(t("spm.need_amount")); return; }
    if (purpose === "salary" && !(salDue > 0)) { setErr(t("spm.salary_no_due_note")); return; }
    if (!toWallet && amt > dueOf(purpose) + 0.005) { setErr(t("spm.over_due", { amt: fmt(dueOf(purpose)) })); return; }
    if (!from || (toWallet && fromWallet)) { setErr(t("spm.need_account")); return; }
    setBusy(true);
    try {
      const head = { headers: { "Idempotency-Key": idem.current } };
      const r = toWallet
        ? await api.post("/wallets/send-to-staff", { staff_party_id: staff.id, amount: amt, bucket: purpose === "petrol" ? "petrol" : "imprest",
            payment_method: method, tx_ref: txRef || undefined, note: note || undefined, account_id: Number(from) }, head)
        : await api.post("/staff-pay/pay", { staff_party_id: staff.id, amount: amt, purpose, source: fromWallet ? "wallet" : "account",
            account_id: fromWallet ? undefined : Number(from), date, payment_method: fromWallet ? undefined : method,
            tx_ref: txRef || undefined, note: note || undefined }, head);
      if (r && r.success) { window.alert(r.message || t("spm.done")); onDone(); return; }
      setErr((r && r.message) || t("spm.failed"));
    } catch (e) { setErr((e && e.message) || t("spm.failed")); }
    setBusy(false);
  };

  const L = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 0.4 };
  const I = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${T.b2}`, fontSize: 12.5, boxSizing: "border-box", margin: "4px 0 10px", background: T.surface, color: T.t1, fontFamily: "inherit" };
  const P = [
    { id: "salary", l: t("spm.p_salary"), sub: dues == null ? "…" : salDue > 0 ? t("spm.due_amt", { amt: fmt(salDue) }) : t("spm.no_due"), c: T.red, off: false },
    { id: "petrol", l: t("spm.p_petrol"), sub: dues == null ? "…" : petDue > 0 ? t("spm.due_amt", { amt: fmt(petDue) }) : t("spm.no_due"), c: T.amb, off: !(petDue > 0) && !canTopup },
    { id: "wallet", l: t("spm.p_wallet"), sub: t("spm.wallet_sub"), c: T.blu, off: !canTopup },
  ];
  const months = dues && !toWallet ? (purpose === "salary" ? dues.salary.months : dues.petrol.months) : [];

  return createPortal(
    // Portal body par lagta hai — wahan app ka font nahi pahunchta (Times ban jaata tha), isliye yahin do.
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 320, display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
      fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, padding: "16px 18px", width: 420, maxWidth: "100%", maxHeight: "94vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{t("spm.title", { name: staff.name })}</span>
          <button onClick={onClose} aria-label={t("spm.cancel")} style={{ background: "none", border: "none", fontSize: 20, color: T.t4, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={L}>{t("spm.kis_liye")}</div>
        <div style={{ display: "flex", gap: 6, margin: "5px 0 10px" }}>
          {P.map((b) => (
            <button key={b.id} type="button" disabled={b.off} onClick={() => pick(b.id)}
              style={{ flex: 1, padding: "9px 7px", borderRadius: 8, border: `1.5px solid ${purpose === b.id ? b.c : T.b1}`, background: purpose === b.id ? b.c + "11" : T.surface,
                cursor: b.off ? "not-allowed" : "pointer", opacity: b.off ? 0.45 : 1, textAlign: "left", fontFamily: "inherit" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: purpose === b.id ? b.c : T.t2 }}>{b.l}</div>
              <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{b.sub}</div>
            </button>
          ))}
        </div>
        {!canTopup && <div style={{ fontSize: 11, color: T.amb, background: T.ambL, padding: "7px 10px", borderRadius: 7, marginBottom: 10 }}>{t("spm.topup_off")}</div>}
        {purpose === "salary" && dues && !(salDue > 0) && <div style={{ fontSize: 11.5, color: T.amb, background: T.ambL, padding: "7px 10px", borderRadius: 7, marginBottom: 10 }}>{t("spm.salary_no_due_note")}</div>}
        {petrolToWallet && dues && <div style={{ fontSize: 11.5, color: T.t3, background: T.surfaceB, padding: "7px 10px", borderRadius: 7, marginBottom: 10 }}>{t("spm.petrol_no_due_note", { name: staff.name })}</div>}
        {months.length > 0 && (
          <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 10 }}>
            {months.map((m, i) => (
              <div key={m.year + "-" + m.month} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", fontSize: 12, color: T.t2, borderTop: i ? `1px solid ${T.b1}` : "none" }}>
                <span>{purpose === "salary" ? t("spm.p_salary") : t("spm.p_petrol")} · {monthLabel(m.month, m.year)}</span>
                <b style={{ color: T.red, fontVariantNumeric: "tabular-nums" }}>{t("spm.due_amt", { amt: fmt(m.remaining) })}</b>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={L}>{t("spm.amount")}</label>
            <input type="number" min="0" value={amount} onChange={(e) => { touched.current = true; setAmount(e.target.value); }} style={{ ...I, fontSize: 14, fontWeight: 700 }} />
          </div>
          {!toWallet && (
            <div style={{ flex: 1 }}>
              <label style={L}>{t("spm.date")}</label>
              <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} style={I} />
            </div>
          )}
        </div>

        <label style={L}>{t("spm.from")}</label>
        <PickSelect value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...I, borderColor: from ? T.b2 : T.amb }}>
          <option value="">{t("spm.from_ph")}</option>
          {accts.map((a) => <option key={a.id} value={String(a.id)}>{a.name}{a.no ? ` ${a.no}` : ""}</option>)}
          {!toWallet && <option value={MY_WALLET}>{t("spm.from_my_wallet")}</option>}
        </PickSelect>

        {!fromWallet && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={L}>{t("spm.method")}</label>
              <PickSelect value={method} onChange={(e) => setMethod(e.target.value)} style={I}>
                <option value="bank_transfer">{t("spm.m_bank")}</option>
                <option value="upi">UPI</option>
                <option value="cash">{t("spm.m_cash")}</option>
                <option value="cheque">{t("spm.m_cheque")}</option>
              </PickSelect>
            </div>
            <div style={{ flex: 1 }}>
              <label style={L}>{t("spm.ref")}</label>
              <input value={txRef} onChange={(e) => setTxRef(e.target.value)} maxLength={100} style={I} />
            </div>
          </div>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={250} placeholder={t("spm.note")} style={{ ...I, margin: "0 0 10px" }} />

        {amt > 0 && from && (
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10, lineHeight: 1.5 }}>
            {toWallet ? t("spm.info_wallet", { account: (acct && acct.name) || "", amt: fmt(amt), name: staff.name })
              : fromWallet ? t("spm.info_my_wallet", { amt: fmt(amt) })
              : t("spm.info_account", { account: (acct && acct.name) || "", amt: fmt(amt) })}
          </div>
        )}
        {err && <div style={{ fontSize: 12, color: T.red, background: T.redL, padding: "7px 10px", borderRadius: 7, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("spm.cancel")}</button>
          <button type="button" onClick={send} disabled={busy}
            style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: busy ? T.t4 : T.blu, color: "#fff", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
            {busy ? t("spm.sending") : t("spm.send", { amt: fmt(amt) })}
          </button>
        </div>
      </div>
    </div>, document.body);
}
