// SaaS Admin → company kholo → GPS / Telematics
//
// Company ka GPS vendor + API token yahin se — us company me login kiye bina.
// Backend: /api/saas-admin/companies/:id/telematics/* jo routes/telematics.js
// ke HI handler chalata hai (wahi validation, token band, test). Isliye form
// vendor ke `fields` se banta hai, kisi ek vendor par hardcode nahi.
//
// ⚠️ Naya account banate waqt `create: true` bhejna zaroori hai — warna
// backend company ka PEHLA account hi update kar deta (accountForWrite).
import { useState, useEffect, useCallback } from "react";
import { apiFetch, T, fmtDateTime, IcRefresh, IcPlus, IcX } from "./tokens";
import { Btn, InputField, SelectField, Badge, Toast } from "./ui";

const FIELD_LABEL = {
  base_url: "Base URL", api_token: "API token", resource_id: "Resource ID", report_id: "Report ID",
};
const AUTO_OPTS = [0, 5, 10, 15, 30, 60].map((m) => ({ value: String(m), label: m ? `Har ${m} min` : "Band" }));

const blank = (vendorKey) => ({
  account_id: null, vendor: vendorKey || "technoton", name: "", base_url: "", api_token: "",
  resource_id: "", report_id: "2", auto_sync_min: "15", groups: [{ objectId: "", label: "" }],
});

function AccountForm({ companyId, vendors, initial, onDone, toast }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState("");
  const [test, setTest] = useState(null);
  const up = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const vendor = vendors.find((v) => v.key === f.vendor) || vendors[0] || { fields: [] };
  const has = (k) => (vendor.fields || []).includes(k);
  const editing = !!f.account_id;
  const base = `/saas-admin/companies/${companyId}/telematics`;

  const payload = () => ({
    ...(editing ? { account_id: f.account_id } : { create: true, vendor: f.vendor }),
    name: f.name.trim() || null,
    base_url: f.base_url.trim(),
    resource_id: f.resource_id.trim(),
    report_id: Number(f.report_id) || 2,
    auto_sync_min: Number(f.auto_sync_min),
    // Khaali = purana token rakho (edit me). Backend "••••" wale ko bhi purana maanta hai.
    api_token: f.api_token.trim() || undefined,
    groups: f.groups.map((g) => ({ objectId: g.objectId.trim(), label: g.label.trim() })).filter((g) => g.objectId),
  });

  const runTest = async () => {
    setBusy("test"); setTest(null);
    try {
      const r = await apiFetch(base + "/config/test", { method: "POST", body: payload() });
      setTest(r && r.success ? { ok: true, ...r.data } : { ok: false, error: (r && r.message) || "Test nahi chala" });
    } catch (e) { setTest({ ok: false, error: e.message }); }
    setBusy("");
  };
  const save = async () => {
    setBusy("save");
    try {
      const r = await apiFetch(base + "/config", { method: "POST", body: payload() });
      if (r && r.success) { toast(editing ? "Account update ho gaya" : "Account jud gaya", "ok"); onDone(true); }
      else toast((r && r.message) || "Save nahi hua", "error");
    } catch (e) { toast(e.message, "error"); }
    setBusy("");
  };

  return (
    <div style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1, marginBottom: 12 }}>
        {editing ? "Account badlo" : "Naya GPS account"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {editing
          // Vendor badalna = naya account (backend existing ka vendor hi maanta hai).
          ? <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Vendor</div>
              <div style={{ padding: "9px 12px", fontSize: 13, color: T.t2 }}>{vendor.label || f.vendor}</div>
            </div>
          : <SelectField label="Vendor" value={f.vendor} onChange={(v) => up("vendor", v)}
              options={vendors.map((v) => ({ value: v.key, label: v.label }))}/>}
        <InputField label="Naam (apni pehchaan ke liye)" value={f.name} onChange={(v) => up("name", v)} placeholder="jaise Raipur fleet"/>
        {has("base_url") && <InputField label={FIELD_LABEL.base_url} value={f.base_url} onChange={(v) => up("base_url", v)} placeholder="https://…" required/>}
        {has("api_token") && <InputField label={FIELD_LABEL.api_token} type="password" value={f.api_token} onChange={(v) => up("api_token", v)}
          placeholder={editing ? (initial.token_mask ? `Saved ${initial.token_mask} — khaali = wahi rakho` : "Token khul nahi raha — dobara daalo") : "Vendor ka token"} required={!editing}/>}
        {has("resource_id") && <InputField label={FIELD_LABEL.resource_id} value={f.resource_id} onChange={(v) => up("resource_id", v)} required/>}
        {has("report_id") && <InputField label={FIELD_LABEL.report_id} value={f.report_id} onChange={(v) => up("report_id", v.replace(/\D/g, ""))}/>}
        <SelectField label="Auto sync" value={f.auto_sync_min} onChange={(v) => up("auto_sync_min", v)} options={AUTO_OPTS}/>
      </div>

      {has("groups") && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
            Groups (vendor ka object ID) *
          </div>
          {f.groups.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <InputField value={g.objectId} placeholder="Object ID" style={{ flex: 1 }}
                onChange={(v) => up("groups", f.groups.map((x, j) => (j === i ? { ...x, objectId: v } : x)))}/>
              <InputField value={g.label} placeholder="Label (jaise Dumper)" style={{ flex: 1.4 }}
                onChange={(v) => up("groups", f.groups.map((x, j) => (j === i ? { ...x, label: v } : x)))}/>
              <button onClick={() => up("groups", f.groups.filter((_, j) => j !== i))} disabled={f.groups.length === 1} title="Hatao"
                style={{ background: "none", border: "none", cursor: f.groups.length === 1 ? "not-allowed" : "pointer", color: T.t3, display: "flex" }}>
                <IcX size={14}/>
              </button>
            </div>
          ))}
          <button onClick={() => up("groups", [...f.groups, { objectId: "", label: "" }])}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.blu, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            <IcPlus size={13}/> Group jodo
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={runTest} disabled={!!busy}>{busy === "test" ? "Vendor se pooch rahe…" : "Test (kal ka data)"}</Btn>
        <Btn onClick={save} disabled={!!busy}>{busy === "save" ? "Save ho raha…" : "Save"}</Btn>
        <Btn variant="ghost" onClick={() => onDone(false)} disabled={!!busy}>Radd karo</Btn>
      </div>

      {test && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 7, fontSize: 12.5,
          background: test.ok ? T.grnL : T.redL, color: test.ok ? T.grn : T.red, border: `1px solid ${test.ok ? T.grnM : T.redM}` }}>
          {test.ok
            ? <>Vendor se data mila ({test.day}): {(test.groups || []).map((g) => `${g.group} — ${g.units.length} gaadi`).join(", ") || "koi group nahi"}</>
            : <>Nahi chala: {test.error}</>}
        </div>
      )}
    </div>
  );
}

export function CompanyGpsPanel({ companyId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (msg, type) => setToastMsg({ msg, type });
  const base = `/saas-admin/companies/${companyId}/telematics`;

  const load = useCallback(() => {
    setErr("");
    apiFetch(base + "/accounts")
      .then((r) => { if (r && r.success) setData(r.data); else setErr((r && r.message) || "Load nahi hua"); })
      .catch((e) => setErr(e.message));
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const vendors = (data && data.vendors) || [];
  const accounts = (data && data.accounts) || [];

  const setActive = async (a) => {
    const r = await apiFetch(`${base}/accounts/${a.id}/active`, { method: "POST", body: { active: !a.is_active } });
    if (r && r.success) load(); else toast((r && r.message) || "Nahi badla", "error");
  };
  const syncNow = async (a) => {
    const r = await apiFetch(base + "/sync", { method: "POST", body: { account_id: a.id } });
    if (r && r.success) toast("Sync shuru — 1-2 minute me data aayega", "ok");
    else toast((r && r.message) || "Sync nahi chala", "error");
  };
  const edit = (a) => setForm({
    ...blank(a.vendor), account_id: a.id, vendor: a.vendor, name: a.name || "", base_url: a.base_url || "",
    resource_id: a.resource_id || "", report_id: String(a.report_id || 2),
    auto_sync_min: String(a.auto_sync_min != null ? a.auto_sync_min : 15),
    groups: (a.groups && a.groups.length ? a.groups : [{ objectId: "", label: "" }]).map((g) => ({ objectId: g.objectId || "", label: g.label || "" })),
    token_mask: a.api_token_ok ? a.api_token_masked : null,
  });

  return (
    <div>
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)}/>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: T.t2, maxWidth: 720, lineHeight: 1.6 }}>
          Is company ka GPS vendor aur token. Company ka admin bhi apni Settings → Integrations se yahi dekhta/badalta hai — dono ek hi jagah likhte hain.
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={load} title="Dobara" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: T.t3 }}><IcRefresh size={14}/></button>
          {!form && vendors.length > 0 && <Btn onClick={() => setForm(blank(vendors[0].key))}><IcPlus size={13}/> Account jodo</Btn>}
        </div>
      </div>
      {err && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {!data && !err && <div style={{ color: T.t3, fontSize: 13 }}>Load ho raha…</div>}

      {form && <AccountForm key={form.account_id || "new"} companyId={companyId} vendors={vendors} initial={form} toast={toast}
        onDone={(changed) => { setForm(null); if (changed) load(); }}/>}

      {data && !accounts.length && !form && <div style={{ color: T.t3, fontSize: 13 }}>Is company me abhi koi GPS account nahi.</div>}
      {accounts.map((a) => (
        <div key={a.id} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "12px 16px", marginBottom: 10,
          display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", opacity: a.is_active ? 1 : 0.65 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{a.name || a.vendor_label}</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
              {a.vendor_label} · {a.base_url} · resource {a.resource_id} · token {a.api_token_masked || "—"}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {a.is_active ? <Badge text="Chalu" color={T.grn}/> : <Badge text="Band" color={T.slt}/>}
              {!a.api_token_ok && a.api_token_set && <Badge text="Token khul nahi raha — dobara daalo" color={T.red}/>}
              {a.last_sync_status && <Badge text={"Sync: " + a.last_sync_status} color={a.last_sync_status === "ok" ? T.grn : T.amb}/>}
              <Badge text={`${a.units} gaadi · ${a.linked} judi · ${a.pending} baaki`} color={T.blu}/>
            </div>
            {a.last_error && <div style={{ fontSize: 11.5, color: T.red, marginTop: 4 }}>{a.last_error}</div>}
            <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>Aakhri sync: {a.last_sync_at ? fmtDateTime(a.last_sync_at) : "kabhi nahi"}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" onClick={() => syncNow(a)} disabled={!a.is_active}>Sync karo</Btn>
            <Btn variant="ghost" onClick={() => edit(a)} disabled={!!form}>Badlo</Btn>
            <Btn variant="ghost" color={a.is_active ? T.red : T.grn} onClick={() => setActive(a)}>{a.is_active ? "Band karo" : "Chalu karo"}</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
