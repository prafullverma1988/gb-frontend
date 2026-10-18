// SaaS Admin → AI Models
//
// Har kaam (Tender AI Plan / Sahayak / slip-bill padhna) kis LLM par chalega:
// provider + model + API key. Do jagah dikhta hai:
//   - "AI Models" tab      → sab company ka default (platform)
//   - company kholo → "AI Models" → sirf us company ka
// Kram (backend utils/llmConfig.js): company → platform → Railway env.
// Key kabhi poori wapas nahi aati — sirf ••••abcd.
//
// Module-owned (module independence): SaaS ke apne tokens/ui hi.
import { useState, useEffect, useCallback } from "react";
import { apiFetch, T, fmtDateTime, fmtNum, IcRefresh } from "./tokens";
import { Btn, InputField, SelectField, Badge, Toast } from "./ui";

const PROVIDER_OPTS = [
  { value: "google",    label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "openai",    label: "OpenAI GPT" },
];
const PROVIDER_LABEL = Object.fromEntries(PROVIDER_OPTS.map((o) => [o.value, o.label]));
const MODEL_EG = { google: "gemini-3.5-flash", anthropic: "claude-sonnet-5", openai: "gpt-4o-mini" };

const SOURCE_LABEL = {
  company:  { text: "Is company ki apni", color: T.pur },
  platform: { text: "Sab company ka default", color: T.blu },
  env:      { text: "Railway env", color: T.slt },
};

function FeatureCard({ f, companyId, onSaved, toast }) {
  const s = f.saved;
  const [provider, setProvider] = useState(s ? s.provider : "");
  const [model, setModel] = useState(s ? s.model : "");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState("");
  const [test, setTest] = useState(null);

  // Server se naya aaya (save/hatao ke baad) to form usi par.
  useEffect(() => {
    setProvider(s ? s.provider : ""); setModel(s ? s.model : "");
    setApiKey(""); setClearKey(false);
  }, [s && s.provider, s && s.model, s && s.key_mask]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = companyId ? `/saas-admin/companies/${companyId}/llm-config/${f.feature}` : `/saas-admin/llm-config/${f.feature}`;
  const providerChanged = s && provider && provider !== s.provider;

  const runTest = async () => {
    if (!provider || !model.trim()) { toast("Provider aur model dono chahiye", "error"); return; }
    setBusy("test"); setTest(null);
    try {
      const r = await apiFetch("/saas-admin/llm-config/test", { method: "POST", body: {
        provider, model: model.trim(), api_key: apiKey.trim() || undefined,
        company_id: companyId || 0, feature: f.feature,
      }});
      setTest(r && r.success ? r.data : { ok: false, error: (r && r.message) || "Test nahi chala" });
    } catch (e) { setTest({ ok: false, error: e.message }); }
    setBusy("");
  };

  const save = async () => {
    if (!provider || !model.trim()) { toast("Provider aur model dono chahiye", "error"); return; }
    setBusy("save");
    try {
      const r = await apiFetch(base, { method: "PUT", body: {
        provider, model: model.trim(), api_key: apiKey.trim() || undefined, clear_key: clearKey || undefined,
      }});
      if (r && r.success) { toast("Save ho gaya — 1 minute me dono server par lagu", "ok"); setTest(null); onSaved(); }
      else toast((r && r.message) || "Save nahi hua", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy("");
  };

  const remove = async () => {
    const msg = companyId
      ? "Is company ki setting hata dein? Phir ye kaam sab company wale default par chalega."
      : "Default hata dein? Jin company ki apni setting nahi hai, wo Railway env par chalengi.";
    if (!window.confirm(msg)) return;
    setBusy("del");
    try {
      const r = await apiFetch(base, { method: "DELETE" });
      if (r && r.success) { toast("Hata diya", "ok"); setTest(null); onSaved(); }
      else toast((r && r.message) || "Nahi hata", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy("");
  };

  const eff = f.effective || {};
  const src = SOURCE_LABEL[eff.source] || SOURCE_LABEL.env;
  const keyHint = s && s.key_set && !providerChanged
    ? (s.key_ok ? `Saved: ${s.key_mask} — badalni ho to nayi daalo` : "Saved key khul nahi rahi — dobara daalo")
    : (companyId ? "Khaali = default ki key (provider wahi ho) ya Railway env" : "Khaali = Railway env ki key");

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{f.label}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{f.hint}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: T.t3 }}>Abhi chal raha</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontFamily: "monospace" }}>
            {PROVIDER_LABEL[eff.provider] || eff.provider} · {eff.model || "—"}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 5, flexWrap: "wrap" }}>
            <Badge text={src.text} color={src.color}/>
            {eff.key_source === "company"
              ? <Badge text="Company ki key — bill nahi" color={T.grn}/>
              : <Badge text="Sanchalan ki key — billable" color={T.amb}/>}
            {!eff.ready && <Badge text="Key nahi — kaam band" color={T.red}/>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,1fr) minmax(200px,1.4fr) minmax(220px,1.6fr)", gap: 12, marginTop: 14 }}>
        <SelectField label="Provider" value={provider} onChange={setProvider} options={PROVIDER_OPTS} placeholder="— chuno —"/>
        <InputField label="Model" value={model} onChange={setModel} placeholder={"jaise " + (MODEL_EG[provider] || "gemini-3.5-flash")}/>
        <InputField label="API key" type="password" value={apiKey} onChange={(v) => { setApiKey(v); if (v) setClearKey(false); }} placeholder={keyHint}/>
      </div>
      {providerChanged && s.key_set && (
        <div style={{ fontSize: 11.5, color: T.amb, marginTop: 6 }}>
          Provider badla hai — purani {PROVIDER_LABEL[s.provider]} key is provider par nahi chalegi, save par hat jayegi. Nayi key daalo ya khaali chhodo.
        </div>
      )}
      {s && s.key_set && !providerChanged && !apiKey && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, marginTop: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={clearKey} onChange={(e) => setClearKey(e.target.checked)}/>
          Saved key hata do (upar wali key lagegi)
        </label>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={runTest} disabled={!!busy}>{busy === "test" ? "Test ho raha…" : "Test"}</Btn>
        <Btn onClick={save} disabled={!!busy}>{busy === "save" ? "Save ho raha…" : "Save"}</Btn>
        {s && <Btn variant="ghost" color={T.red} onClick={remove} disabled={!!busy}>{companyId ? "Company setting hatao" : "Default hatao"}</Btn>}
        <div style={{ fontSize: 11.5, color: T.t3, marginLeft: "auto" }}>
          {/* Company ke liye khaali = PLATFORM default (env nahi). Server batata hai. */}
          {(() => { const fb = f.fallback || { ...f.env_default, source: "env" }; return (<>
            Kuch na bharo to: <span style={{ fontFamily: "monospace" }}>{(PROVIDER_LABEL[fb.provider] || fb.provider)} · {fb.model || "—"}</span> ({fb.source === "platform" ? "sab company ka default" : "Railway env"})
          </>); })()}
          {s && s.updated_at && <> · badla {fmtDateTime(s.updated_at)}</>}
        </div>
      </div>

      {test && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 7, fontSize: 12.5,
          background: test.ok ? T.grnL : T.redL, color: test.ok ? T.grn : T.red, border: `1px solid ${test.ok ? T.grnM : T.redM}` }}>
          {test.ok
            ? <>Chal gaya — {test.ms} ms, key: {test.key_from}. Jawab: “{test.sample}”</>
            : <>Nahi chala{test.key_from ? ` (key: ${test.key_from})` : ""}: {test.error}</>}
        </div>
      )}
    </div>
  );
}

export function AiModelsPanel({ companyId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (msg, type) => setToastMsg({ msg, type });

  const load = useCallback(() => {
    setErr("");
    apiFetch(companyId ? `/saas-admin/companies/${companyId}/llm-config` : "/saas-admin/llm-config")
      .then((r) => { if (r && r.success) setData(r.data); else setErr((r && r.message) || "Load nahi hua"); })
      .catch((e) => setErr(e.message));
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)}/>}
      <div style={{ fontSize: 12.5, color: T.t2, lineHeight: 1.6, marginBottom: 14, maxWidth: 820 }}>
        {companyId
          ? <>Sirf <b>is company</b> ke liye. Jo kaam yahan khaali hai wo <b>sab company ke default</b> (AI Models tab) par chalega, aur wo bhi khaali ho to Railway env par.
             Is company ki <b>apni key</b> daalne par uska kharch company ka — Sanchalan bill nahi karega.</>
          : <>Ye <b>sab company</b> ka default hai. Kisi ek company ke liye alag chahiye to Companies → company kholo → <b>AI Models</b>.
             Yahan kuch na bhara ho to bilkul wahi chalta hai jo aaj Railway env se chal raha hai.</>}
      </div>
      {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {!data && !err && <div style={{ color: T.t3, fontSize: 13 }}>Load ho raha…</div>}
      {data && data.features.map((f) => (
        <FeatureCard key={f.feature} f={f} companyId={companyId} onSaved={load} toast={toast}/>
      ))}
    </div>
  );
}

// ── Kitna AI khaya — billing ki neenv (rate/bill abhi nahi) ─────
const FEATURE_NAME = {
  sahayak: "Sahayak AI", tender_plan: "Tender AI Plan", slip_read: "Slip / bill padhna",
  wallet_slip_read: "Wallet material slip", wallet_slip_match: "Wallet slip milaan",
  road_drawing: "Road drawing", road_columns: "Road columns", road_review: "Road review", road_whatif: "Road what-if",
  llm_test: "Test (SaaS)", other: "Baaki",
};

export function AiUsagePanel({ companyId }) {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    setErr(""); setRows(null);
    apiFetch(`/saas-admin/companies/${companyId}/llm-usage?days=${days}`)
      .then((r) => { if (r && r.success) setRows(r.data.rows || []); else setErr((r && r.message) || "Load nahi hua"); })
      .catch((e) => setErr(e.message));
  }, [companyId, days]);
  useEffect(() => { load(); }, [load]);

  const sum = (list, k) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const plat = (rows || []).filter((r) => r.key_source !== "company");
  const own = (rows || []).filter((r) => r.key_source === "company");

  const th = { textAlign: "left", fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.4px", padding: "8px 10px", borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap" };
  const td = { fontSize: 12.5, color: T.t1, padding: "8px 10px", borderBottom: `1px solid ${T.b1}`, whiteSpace: "nowrap" };
  const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Kitna AI khaya</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${days === d ? T.blu : T.b1}`, background: days === d ? T.bluL : T.surface, color: days === d ? T.blu : T.t2 }}>
              {d} din
            </button>
          ))}
        </div>
        <button onClick={load} title="Dobara" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: T.t3 }}><IcRefresh size={14}/></button>
        <div style={{ fontSize: 11.5, color: T.t3, marginLeft: "auto" }}>Abhi sirf ginti — rate aur bill baad me</div>
      </div>
      {err && <div style={{ color: T.red, fontSize: 13 }}>{err}</div>}
      {rows && !rows.length && <div style={{ color: T.t3, fontSize: 13 }}>Is dauraan koi AI call nahi.</div>}
      {rows && rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
            {[["Sanchalan ki key (billable)", plat, T.amb], ["Company ki apni key", own, T.grn]].map(([lbl, list, c]) => (
              <div key={lbl} style={{ border: `1px solid ${T.b1}`, borderRadius: 8, padding: "8px 14px", background: T.surface, minWidth: 220 }}>
                <div style={{ fontSize: 11, color: c, fontWeight: 700 }}>{lbl}</div>
                <div style={{ fontSize: 13, color: T.t1, marginTop: 2 }}>
                  {fmtNum(sum(list, "calls"))} call · in {fmtNum(sum(list, "in_tokens"))} · out {fmtNum(sum(list, "out_tokens"))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 8, background: T.surface }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Kaam</th><th style={th}>Model</th><th style={th}>Key</th>
                <th style={{ ...th, textAlign: "right" }}>Call</th><th style={{ ...th, textAlign: "right" }}>Fail</th>
                <th style={{ ...th, textAlign: "right" }}>In token</th><th style={{ ...th, textAlign: "right" }}>Out token</th>
                <th style={{ ...th, textAlign: "right" }}>usme soch</th><th style={{ ...th, textAlign: "right" }}>Cache</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{FEATURE_NAME[r.feature] || r.feature}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{r.provider ? r.provider + " · " : ""}{r.model || "—"}</td>
                    <td style={td}>{r.key_source === "company" ? <Badge text="Company" color={T.grn}/> : <Badge text="Sanchalan" color={T.amb}/>}</td>
                    <td style={num}>{fmtNum(Number(r.calls))}</td>
                    <td style={{ ...num, color: Number(r.fails) ? T.red : T.t3 }}>{fmtNum(Number(r.fails))}</td>
                    <td style={num}>{fmtNum(Number(r.in_tokens))}</td>
                    <td style={num}>{fmtNum(Number(r.out_tokens))}</td>
                    <td style={{ ...num, color: T.t3 }}>{fmtNum(Number(r.think_tokens))}</td>
                    <td style={{ ...num, color: T.t3 }}>{fmtNum(Number(r.cached_tokens))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6 }}>
            Out token me Gemini ki "soch" shaamil hai (Google use output rate par leta hai). 18 Oct se pehle ki entries me soch nahi gini gayi thi.
          </div>
        </>
      )}
    </div>
  );
}
