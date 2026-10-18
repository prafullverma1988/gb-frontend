// SaaS Admin → AI Billing
//
// Company-wise LLM ka bill. Hisaab sirf backend (utils/aiBilling.js) karta
// hai — ye screen kabhi khud rupaye nahi jodti, sirf dikhati hai.
//
// Niyam (Prafull, 2026-10-19): Sanchalan ki key → asli kharch × (1 + markup);
// company ki apni key → service fee ₹/1M token; ₹ me mahine ka free quota;
// alag mahine ka AI invoice; limit par AI band nahi, sirf alert.
//
// Module-owned: sirf saas/ ke tokens + ui (SelectField = PickSelect).
import { useState, useEffect, useCallback } from "react";
import { apiFetch, T, fmtNum, fmtDate, IcRefresh, IcChevL, IcX } from "./tokens";
import { Btn, InputField, SelectField, Badge, Toast } from "./ui";

const rs = (v) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PROVIDER_LABEL = { google: "Google Gemini", anthropic: "Anthropic Claude", openai: "OpenAI GPT" };
const STATUS = {
  draft: { text: "Draft", color: T.slt }, issued: { text: "Issued", color: T.blu },
  paid: { text: "Paid", color: T.grn }, cancelled: { text: "Cancelled", color: T.red },
};
const FEATURE_NAME = {
  sahayak: "Sahayak AI", tender_plan: "Tender AI Plan", slip_read: "Slip / bill padhna",
  wallet_slip_read: "Wallet material slip", wallet_slip_match: "Wallet slip milaan",
  road_drawing: "Road drawing", road_columns: "Road columns", road_review: "Road review", road_whatif: "Road what-if", other: "Baaki",
};

// Pichhle 12 mahine (IST) — raw <select>/<input type=month> nahi, PickSelect.
function monthOptions() {
  const out = [];
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const v = d.toISOString().slice(0, 7);
    out.push({ value: v, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }) + (i === 0 ? " (chalu)" : "") });
  }
  return out;
}

const card = { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "16px 18px", marginBottom: 16 };
const h2 = { fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 4 };
const sub = { fontSize: 12, color: T.t3, marginBottom: 12, lineHeight: 1.55 };
const th = { textAlign: "left", fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.4px", padding: "8px 10px", borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap" };
const td = { fontSize: 12.5, color: T.t1, padding: "8px 10px", borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap" };
const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const numTh = { ...th, textAlign: "right" };

// ── Settings ─────────────────────────────────────────────────────
function SettingsCard({ s, onSaved, toast }) {
  const [f, setF] = useState(null);
  useEffect(() => {
    if (s) setF({
      usd_inr: s.usd_inr == null ? "" : String(Number(s.usd_inr)), markup_pct: String(Number(s.markup_pct)),
      free_quota_inr: String(Number(s.free_quota_inr)), byok_fee_enabled: Number(s.byok_fee_enabled) ? "1" : "0",
      byok_fee_per_m_inr: String(Number(s.byok_fee_per_m_inr)), gst_rate: String(Number(s.gst_rate)),
    });
  }, [s]);
  const [busy, setBusy] = useState(false);
  if (!f) return null;
  const up = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await apiFetch("/saas-admin/ai-billing/settings", { method: "PUT", body: { ...f, byok_fee_enabled: f.byok_fee_enabled === "1" } });
      if (r && r.success) { toast("Settings save", "ok"); onSaved(); } else toast((r && r.message) || "Save nahi hua", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy(false);
  };
  return (
    <div style={card}>
      <div style={h2}>Sab client ke default</div>
      <div style={sub}>Har client par yahi lagta hai jab tak us client ke liye alag na rakha ho. USD→INR khaali ho to koi invoice nahi banta.</div>
      {!f.usd_inr && <div style={{ fontSize: 12.5, color: T.red, marginBottom: 10 }}>USD→INR rate abhi khaali hai — iske bina bill ban hi nahi sakta.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        <InputField label="USD → INR" value={f.usd_inr} onChange={(v) => up("usd_inr", v)} placeholder="jaise 84.20"/>
        <InputField label="Markup % (Sanchalan key)" value={f.markup_pct} onChange={(v) => up("markup_pct", v)}/>
        <InputField label="Free quota ₹ / mahina" value={f.free_quota_inr} onChange={(v) => up("free_quota_inr", v)}/>
        <SelectField label="Apni key par service fee" value={f.byok_fee_enabled} onChange={(v) => up("byok_fee_enabled", v)}
          options={[{ value: "1", label: "Chalu" }, { value: "0", label: "Band" }]}/>
        <InputField label="Service fee ₹ / 1M token" value={f.byok_fee_per_m_inr} onChange={(v) => up("byok_fee_per_m_inr", v)}/>
        <InputField label="GST %" value={f.gst_rate} onChange={(v) => up("gst_rate", v)}/>
      </div>
      <div style={{ marginTop: 12 }}><Btn onClick={save} disabled={busy}>{busy ? "Save ho raha…" : "Save"}</Btn></div>
    </div>
  );
}

// ── Rate card ────────────────────────────────────────────────────
function RatesCard({ rates, missing, onSaved, toast }) {
  const blank = { provider: "google", model: "", in_usd_per_m: "", out_usd_per_m: "", cached_usd_per_m: "", effective_from: new Date(Date.now() + 19800000).toISOString().slice(0, 10), note: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const up = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await apiFetch("/saas-admin/ai-billing/rates", { method: "POST", body: f });
      if (r && r.success) { toast("Rate save", "ok"); setF(blank); onSaved(); } else toast((r && r.message) || "Save nahi hua", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy(false);
  };
  const del = async (r) => {
    if (!window.confirm(`${r.provider}/${r.model} (${fmtDate(r.effective_from)} se) ka rate hatayein? Bane hue invoice par asar nahi.`)) return;
    const x = await apiFetch(`/saas-admin/ai-billing/rates/${r.id}`, { method: "DELETE" });
    if (x && x.success) onSaved(); else toast((x && x.message) || "Nahi hata", "error");
  };
  return (
    <div style={card}>
      <div style={h2}>Rate card — provider ka asli rate (USD per 1M token)</div>
      <div style={sub}>
        Provider ki website se daalo, andaze se nahi. Rate badla to nayi tareekh se naya version daalo — purani calls apne din ke rate par hi bill hongi.
        Model ke aage ki tareekh (jaise -20251001) apne aap hat jaati hai.
      </div>
      {missing.length > 0 && (
        <div style={{ background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red, marginBottom: 6 }}>In model ka rate nahi hai — inke rehte invoice nahi banega</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {missing.map((m) => (
              <button key={m.provider + m.model} onClick={() => setF({ ...blank, provider: m.provider, model: m.model })}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.redM}`, background: T.surface, color: T.red, cursor: "pointer", fontFamily: "inherit" }}>
                {m.provider}/{m.model} · {fmtNum(m.calls)} call — rate daalo
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "150px minmax(180px,1.5fr) repeat(3, minmax(90px,1fr)) 140px", gap: 10, alignItems: "end" }}>
        <SelectField label="Provider" value={f.provider} onChange={(v) => up("provider", v)}
          options={Object.entries(PROVIDER_LABEL).map(([value, label]) => ({ value, label }))}/>
        <InputField label="Model" value={f.model} onChange={(v) => up("model", v)} placeholder="gemini-2.5-flash"/>
        <InputField label="Input $" value={f.in_usd_per_m} onChange={(v) => up("in_usd_per_m", v)} placeholder="0.30"/>
        <InputField label="Output $" value={f.out_usd_per_m} onChange={(v) => up("out_usd_per_m", v)} placeholder="2.50"/>
        <InputField label="Cached $" value={f.cached_usd_per_m} onChange={(v) => up("cached_usd_per_m", v)} placeholder="khaali = input"/>
        <InputField label="Kab se" value={f.effective_from} onChange={(v) => up("effective_from", v)} placeholder="YYYY-MM-DD"/>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "end" }}>
        <InputField label="Note (kahan se liya)" value={f.note} onChange={(v) => up("note", v)} placeholder="jaise ai.google.dev/pricing, 19 Oct" style={{ flex: 1 }}/>
        <Btn onClick={save} disabled={busy}>{busy ? "Save…" : "Rate save"}</Btn>
      </div>
      {rates.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 14, border: `1px solid ${T.b1}`, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Model</th><th style={numTh}>Input $</th><th style={numTh}>Output $</th><th style={numTh}>Cached $</th><th style={th}>Kab se</th><th style={th}>Note</th><th style={th}></th></tr></thead>
            <tbody>{rates.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{r.provider} · {r.model}</td>
                <td style={num}>{Number(r.in_usd_per_m)}</td><td style={num}>{Number(r.out_usd_per_m)}</td>
                <td style={{ ...num, color: r.cached_usd_per_m == null ? T.t4 : T.t1 }}>{r.cached_usd_per_m == null ? "= input" : Number(r.cached_usd_per_m)}</td>
                <td style={td}>{fmtDate(r.effective_from)}</td>
                <td style={{ ...td, color: T.t3, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{r.note || "—"}</td>
                <td style={td}><button onClick={() => del(r)} title="Hatao" style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, display: "flex" }}><IcX size={13}/></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Ek client ────────────────────────────────────────────────────
function InvoiceRow({ inv, onChanged, toast }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ invoice_no: inv.invoice_no || "", due_date: inv.due_date || "", adjustment: "0" });
  const act = async (path, body, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const r = await apiFetch(`/saas-admin/ai-invoices/${inv.id}/${path}`, { method: "POST", body });
    if (r && r.success) { toast("Ho gaya", "ok"); onChanged(); } else toast((r && r.message) || "Nahi hua", "error");
  };
  const saveEdit = async () => {
    const r = await apiFetch(`/saas-admin/ai-invoices/${inv.id}`, { method: "PUT", body: { invoice_no: f.invoice_no, due_date: f.due_date || null, adjustment: Number(f.adjustment) || 0 } });
    if (r && r.success) { toast("Invoice update", "ok"); setEdit(false); onChanged(); } else toast((r && r.message) || "Nahi hua", "error");
  };
  const st = STATUS[inv.status] || STATUS.draft;
  const live = inv.status === "draft" || inv.status === "issued";
  return (
    <>
      <tr>
        <td style={td}>{inv.period_month}</td>
        <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{inv.invoice_no || <span style={{ color: T.t4 }}>— no. nahi —</span>}</td>
        <td style={num}>{rs(inv.gross_amount)}</td>
        <td style={{ ...num, color: T.t3 }}>{rs(inv.free_used)}</td>
        <td style={{ ...num, fontWeight: 700 }}>{rs(inv.total_amount)}</td>
        <td style={td}><Badge text={st.text} color={st.color}/></td>
        <td style={td}>{inv.due_date ? fmtDate(inv.due_date) : "—"}</td>
        <td style={{ ...td, display: "flex", gap: 6 }}>
          {live && <Btn variant="ghost" onClick={() => setEdit((x) => !x)} style={{ padding: "4px 10px" }}>Badlo</Btn>}
          {inv.status === "draft" && <Btn variant="ghost" onClick={() => act("issue")} style={{ padding: "4px 10px" }}>Issue</Btn>}
          {live && <Btn variant="ghost" color={T.grn} style={{ padding: "4px 10px" }}
            onClick={() => { const ref = window.prompt("Payment ref (UTR / cheque no.)", ""); if (ref !== null) act("mark-paid", { payment_ref: ref }); }}>Paid</Btn>}
          {inv.status === "paid" && <Btn variant="ghost" style={{ padding: "4px 10px" }} onClick={() => act("revert-paid", null, "Payment wapas lein? Invoice phir 'Issued' ho jayega.")}>Paid wapas</Btn>}
          {live && <Btn variant="ghost" color={T.red} style={{ padding: "4px 10px" }}
            onClick={() => act("cancel", null, "Invoice cancel karein? Iski calls dobara bill ho sakengi.")}>Cancel</Btn>}
        </td>
      </tr>
      {edit && (
        <tr><td colSpan={8} style={{ ...td, background: T.surfaceB }}>
          <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <InputField label="Invoice no." value={f.invoice_no} onChange={(v) => setF((p) => ({ ...p, invoice_no: v }))} placeholder="aapki GST series se"/>
            <InputField label="Due date" value={f.due_date} onChange={(v) => setF((p) => ({ ...p, due_date: v }))} placeholder="YYYY-MM-DD"/>
            <InputField label="Adjustment ₹ (− = chhoot)" value={f.adjustment} onChange={(v) => setF((p) => ({ ...p, adjustment: v }))}/>
            <Btn onClick={saveEdit}>Save</Btn>
            <div style={{ fontSize: 11.5, color: T.t3 }}>Total usi invoice par jami sharton (quota, GST) se dobara banega — aaj ki setting se nahi.</div>
          </div>
        </td></tr>
      )}
    </>
  );
}

// Export — company ke page (CompanyDetailPage → "AI Billing") par bhi yahi.
// Wahan `defaults` nahi milte to khud la leta hai; `onBack` na ho to "Sab
// client" button nahi; `companyName` ho to upar batata hai ki bill CLIENT par
// banta hai (us client ki sab company ka jod), sirf is company par nahi.
export function ClientBilling({ clientId, defaults: defaultsProp, onBack, companyName }) {
  const [fetchedDefaults, setFetchedDefaults] = useState(null);
  const defaults = defaultsProp || fetchedDefaults;
  useEffect(() => {
    if (defaultsProp) return;
    apiFetch("/saas-admin/ai-billing/settings")
      .then((r) => { if (r && r.success) setFetchedDefaults(r.data.settings); })
      .catch(() => {});
  }, [defaultsProp]);
  const [month, setMonth] = useState(monthOptions()[1].value);   // pichhla (khatam) mahina
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [terms, setTerms] = useState(null);
  const [busy, setBusy] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (msg, type) => setToastMsg({ msg, type });

  const load = useCallback(() => {
    setErr("");
    apiFetch(`/saas-admin/clients/${clientId}/ai-billing?month=${month}`)
      .then((r) => {
        if (!(r && r.success)) { setErr((r && r.message) || "Load nahi hua"); return; }
        setD(r.data);
        const t = r.data.terms;
        setTerms({
          ai_markup_pct: t.own.markup ? String(t.markupPct) : "", ai_free_quota_inr: t.own.quota ? String(t.freeQuotaInr) : "",
          ai_byok_fee_enabled: t.own.byokEnabled ? (t.byokEnabled ? "1" : "0") : "",
          ai_byok_fee_per_m_inr: t.own.byokFee ? String(t.byokFeePerM) : "", ai_gst_rate: t.own.gst ? String(t.gstRate) : "",
          ai_monthly_cap_inr: t.capInr == null ? "" : String(t.capInr),
        });
      })
      .catch((e) => setErr(e.message));
  }, [clientId, month]);
  useEffect(() => { load(); }, [load]);

  const saveTerms = async () => {
    setBusy("terms");
    const body = {};
    for (const [k, v] of Object.entries(terms)) body[k] = v === "" ? null : (k === "ai_byok_fee_enabled" ? v === "1" : v);
    try {
      const r = await apiFetch(`/saas-admin/clients/${clientId}/ai-terms`, { method: "PUT", body });
      if (r && r.success) { toast("Client ki sharten save", "ok"); load(); } else toast((r && r.message) || "Save nahi hua", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy("");
  };
  const makeInvoice = async () => {
    if (!window.confirm(`${month} ka AI invoice (draft) banayein? Is mahine ki bina-bill calls is invoice se jud jayengi.`)) return;
    setBusy("inv");
    try {
      const r = await apiFetch(`/saas-admin/clients/${clientId}/ai-invoices`, { method: "POST", body: { month } });
      if (r && r.success) { toast("Draft invoice ban gaya — " + rs(r.data.total_amount), "ok"); load(); } else toast((r && r.message) || "Nahi bana", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy("");
  };

  const ph = (v, suffix = "") => "default: " + v + suffix;
  const t = d && d.totals;
  const existing = d && d.invoices.find((i) => i.period_month === month && i.status !== "cancelled");
  const block = !d ? "" : !d.month_ended ? "Mahina abhi khatam nahi hua" : d.usd_inr_missing ? "USD→INR rate khaali hai"
    : d.missing.length ? "Kuch model ka rate nahi" : existing ? "Is mahine ka invoice pehle se hai" : !d.calls ? "Is mahine koi AI call nahi" : d.calls === d.legacy_calls ? "Sirf purani call — bill karne ko kuch nahi" : "";

  return (
    <div>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)}/>}
      {onBack && (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: T.blu, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12, fontFamily: "inherit" }}>
          <IcChevL size={13}/> Sab client
        </button>
      )}
      {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {(!d || !defaults) && !err && <div style={{ color: T.t3, fontSize: 13 }}>Load ho raha…</div>}
      {d && defaults && (<>
        {companyName ? (
          <div style={{ fontSize: 12.5, color: T.t2, marginBottom: 14, lineHeight: 1.6, maxWidth: 860 }}>
            AI ka bill <b>client</b> ko jaata hai, company ko nahi. <b>{companyName}</b> client <b>{d.terms.client.name}</b> ki company hai —
            neeche ki sharten aur bill us client ki <b>sab company</b> par lagte hain.
          </div>
        ) : (
          <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 14 }}>{d.terms.client.name}</div>
        )}

        <div style={card}>
          <div style={h2}>Is client ki sharten</div>
          <div style={sub}>Khaali chhodo = sab client ka default. Limit sirf alert ke liye hai — AI kabhi band nahi hoti.</div>
          {terms && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <InputField label="Markup %" value={terms.ai_markup_pct} onChange={(v) => setTerms((p) => ({ ...p, ai_markup_pct: v }))} placeholder={ph(Number(defaults.markup_pct), "%")}/>
              <InputField label="Free quota ₹" value={terms.ai_free_quota_inr} onChange={(v) => setTerms((p) => ({ ...p, ai_free_quota_inr: v }))} placeholder={ph(Number(defaults.free_quota_inr))}/>
              <SelectField label="Apni key par fee" value={terms.ai_byok_fee_enabled} onChange={(v) => setTerms((p) => ({ ...p, ai_byok_fee_enabled: v }))}
                options={[{ value: "", label: "Default (" + (Number(defaults.byok_fee_enabled) ? "chalu" : "band") + ")" }, { value: "1", label: "Chalu" }, { value: "0", label: "Band" }]}/>
              <InputField label="Fee ₹ / 1M token" value={terms.ai_byok_fee_per_m_inr} onChange={(v) => setTerms((p) => ({ ...p, ai_byok_fee_per_m_inr: v }))} placeholder={ph(Number(defaults.byok_fee_per_m_inr))}/>
              <InputField label="GST %" value={terms.ai_gst_rate} onChange={(v) => setTerms((p) => ({ ...p, ai_gst_rate: v }))} placeholder={ph(Number(defaults.gst_rate), "%")}/>
              <InputField label="Mahine ki limit ₹ (alert)" value={terms.ai_monthly_cap_inr} onChange={(v) => setTerms((p) => ({ ...p, ai_monthly_cap_inr: v }))} placeholder="khaali = koi alert nahi"/>
            </div>
          )}
          <div style={{ marginTop: 12 }}><Btn onClick={saveTerms} disabled={busy === "terms"}>{busy === "terms" ? "Save…" : "Sharten save"}</Btn></div>
        </div>

        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ ...h2, marginBottom: 0 }}>Hisaab</div>
            <div style={{ width: 220 }}><SelectField value={month} onChange={setMonth} options={monthOptions()}/></div>
            <button onClick={load} title="Dobara" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: T.t3 }}><IcRefresh size={14}/></button>
          </div>
          {d.legacy_calls > 0 && <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>
            {fmtNum(d.legacy_calls)} purani call (18 Oct 2026 ke central meter se pehle) me model darj nahi hua — unka asli rate pata nahi, isliye bill nahi hoti aur invoice ko rokti bhi nahi.
          </div>}
          {d.missing.length > 0 && <div style={{ fontSize: 12.5, color: T.red, marginBottom: 8 }}>Rate nahi: {d.missing.map((m) => `${m.provider}/${m.model} (${m.calls} call)`).join(", ")} — inka ₹ neeche shaamil NAHI hai.</div>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            {[["Sanchalan ki key — kharch", rs(t.platform_cost_inr), T.t3], ["Sanchalan ki key — bill", rs(t.platform_amount), T.amb], ["Apni key — service fee", rs(t.byok_amount), T.grn],
              ["Gross", rs(t.gross_amount), T.t1], ["Free quota laga", "− " + rs(t.free_used), T.t3], ["GST " + t.gst_rate + "%", rs(t.gst_amount), T.t3], ["Kul", rs(t.total_amount), T.blu]]
              .map(([l, v, c]) => (
                <div key={l} style={{ border: `1px solid ${T.b1}`, borderRadius: 8, padding: "8px 12px", minWidth: 120 }}>
                  <div style={{ fontSize: 10.5, color: T.t3, fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                </div>
              ))}
          </div>
          {d.lines.length > 0 && (
            <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Company</th><th style={th}>Kaam</th><th style={th}>Model</th><th style={th}>Key</th>
                  <th style={numTh}>Call</th><th style={numTh}>In</th><th style={numTh}>Out</th><th style={numTh}>Cache</th>
                  <th style={numTh}>Kharch</th><th style={numTh}>Bill</th>
                </tr></thead>
                <tbody>{d.lines.map((l, i) => (
                  <tr key={i} style={{ background: l.missing_rate ? T.redL : undefined }}>
                    <td style={td}>{l.company_name}</td>
                    <td style={td}>{FEATURE_NAME[l.feature] || l.feature}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{l.provider ? l.provider + " · " : ""}{l.model || "—"}</td>
                    <td style={td}>{l.key_source === "company" ? <Badge text="Apni" color={T.grn}/> : <Badge text="Sanchalan" color={T.amb}/>}</td>
                    <td style={num}>{fmtNum(l.calls)}</td><td style={num}>{fmtNum(l.in_tokens)}</td><td style={num}>{fmtNum(l.out_tokens)}</td>
                    <td style={{ ...num, color: T.t3 }}>{fmtNum(l.cached_tokens)}</td>
                    <td style={{ ...num, color: T.t3 }}>{l.legacy ? "purani" : l.missing_rate ? "rate nahi" : rs(l.cost_inr)}</td>
                    <td style={{ ...num, fontWeight: 600, color: l.legacy ? T.t4 : undefined }}>{l.legacy ? "bill nahi" : l.missing_rate ? "—" : rs(l.bill_inr)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {!d.lines.length && <div style={{ color: T.t3, fontSize: 13 }}>Is mahine koi AI call nahi.</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <Btn onClick={makeInvoice} disabled={!!block || busy === "inv"}>{busy === "inv" ? "Ban raha…" : "Is mahine ka invoice banao"}</Btn>
            {block && <div style={{ fontSize: 12, color: T.t3 }}>{block}</div>}
          </div>
        </div>

        <div style={card}>
          <div style={h2}>AI invoice</div>
          {!d.invoices.length ? <div style={{ color: T.t3, fontSize: 13 }}>Abhi koi invoice nahi.</div> : (
            <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Mahina</th><th style={th}>No.</th><th style={numTh}>Gross</th><th style={numTh}>Free</th><th style={numTh}>Kul</th><th style={th}>Status</th><th style={th}>Due</th><th style={th}></th></tr></thead>
                <tbody>{d.invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} onChanged={load} toast={toast}/>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}

// ── Tab ──────────────────────────────────────────────────────────
export default function TabAiBilling() {
  const [cfg, setCfg] = useState(null);
  const [month, setMonth] = useState(monthOptions()[0].value);
  const [ov, setOv] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [err, setErr] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (msg, type) => setToastMsg({ msg, type });

  const loadCfg = useCallback(() => {
    apiFetch("/saas-admin/ai-billing/settings").then((r) => { if (r && r.success) setCfg(r.data); else setErr((r && r.message) || "Load nahi hua"); })
      .catch((e) => setErr(e.message));
  }, []);
  const loadOv = useCallback(() => {
    setOv(null);
    apiFetch(`/saas-admin/ai-billing/overview?month=${month}`).then((r) => { if (r && r.success) setOv(r.data); else setErr((r && r.message) || "Load nahi hua"); })
      .catch((e) => setErr(e.message));
  }, [month]);
  useEffect(() => { loadCfg(); }, [loadCfg]);
  useEffect(() => { loadOv(); }, [loadOv]);

  if (clientId && cfg) {
    return <div style={{ padding: "20px 24px", maxWidth: 1200 }}><ClientBilling clientId={clientId} defaults={cfg.settings} onBack={() => { setClientId(null); loadOv(); }}/></div>;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200 }}>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)}/>}
      <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 4 }}>AI Billing</div>
      <div style={{ fontSize: 12.5, color: T.t2, marginBottom: 16, lineHeight: 1.6, maxWidth: 860 }}>
        Sanchalan ki key par chali AI ka bill = asli provider kharch × (1 + markup). Company ki <b>apni key</b> par = service fee per 1M token.
        Har client ka free quota, alag mahine ka invoice. Limit par AI <b>band nahi</b> hoti — sirf 80% / 100% par khabar.
      </div>
      {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ ...h2, marginBottom: 0 }}>Client ka hisaab</div>
          <div style={{ width: 220 }}><SelectField value={month} onChange={setMonth} options={monthOptions()}/></div>
          <button onClick={loadOv} title="Dobara" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: T.t3 }}><IcRefresh size={14}/></button>
          {ov && !ov.month_ended && <div style={{ fontSize: 11.5, color: T.t3, marginLeft: "auto" }}>Chalu mahina — abhi tak ka; invoice mahina khatam hone ke baad</div>}
        </div>
        {!ov && <div style={{ color: T.t3, fontSize: 13 }}>Load ho raha…</div>}
        {ov && !ov.clients.length && <div style={{ color: T.t3, fontSize: 13 }}>Abhi koi client nahi.</div>}
        {ov && ov.clients.length > 0 && <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}>Sab client dikhte hain — jiski abhi call nahi hui uske bhi markup / quota / limit pehle se set kar sakte ho (client par click karo).</div>}
        {ov && ov.clients.length > 0 && (
          <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Client</th><th style={numTh}>Call</th><th style={numTh}>Sanchalan key</th><th style={numTh}>Apni key fee</th>
                <th style={numTh}>Gross</th><th style={numTh}>Kul (GST ke saath)</th><th style={th}>Limit</th><th style={th}>Invoice</th>
              </tr></thead>
              <tbody>{ov.clients.map((c) => (
                <tr key={c.client_id} onClick={() => setClientId(c.client_id)} style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceB)} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td style={{ ...td, fontWeight: 600, color: T.blu }}>{c.name}{c.is_internal && <span style={{ marginLeft: 6 }}><Badge text="internal" color={T.slt}/></span>}{c.missing_rates > 0 && <span style={{ marginLeft: 6 }}><Badge text={c.missing_rates + " rate nahi"} color={T.red}/></span>}</td>
                  <td style={num}>{fmtNum(c.calls)}</td>
                  <td style={num}>{rs(c.platform_amount)}</td>
                  <td style={num}>{rs(c.byok_amount)}</td>
                  <td style={{ ...num, fontWeight: 600 }}>{rs(c.gross_amount)}</td>
                  <td style={num}>{rs(c.total_amount)}</td>
                  <td style={td}>{c.cap_inr ? <Badge text={c.cap_pct + "% of " + rs(c.cap_inr)} color={c.cap_pct >= 100 ? T.red : c.cap_pct >= 80 ? T.amb : T.slt}/> : <span style={{ color: T.t4 }}>—</span>}</td>
                  <td style={td}>{c.invoice ? <Badge text={(STATUS[c.invoice.status] || STATUS.draft).text + " · " + rs(c.invoice.total_amount)} color={(STATUS[c.invoice.status] || STATUS.draft).color}/> : <span style={{ color: T.t4 }}>—</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {cfg && <SettingsCard s={cfg.settings} onSaved={() => { loadCfg(); loadOv(); }} toast={toast}/>}
      {cfg && <RatesCard rates={cfg.rates} missing={cfg.missing} onSaved={() => { loadCfg(); loadOv(); }} toast={toast}/>}
    </div>
  );
}
