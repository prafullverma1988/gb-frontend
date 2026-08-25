import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

/* ────────────────────────────────────────────────────────────────────
   AI PLAN — tender ki workbook se site/task plan, AI ke saath

   Flow: file do → browser saari sheets padh kar compact DIGEST banata
   hai (poori file LLM ko kabhi nahi jaati) → AI draft deta hai:
   village/area-wise SITES → har site ke MAIN KAAM → kaam ke andar
   EXECUTION STAGES apni qty/₹ ke saath → neeche chat me AI se bahas
   karke plan sudharo → "Execute" par projects + task tree + budget.

   Puraana niyam "tender kabhi task nahi banata" yahan jaan-boojh kar
   badla gaya (Prafull, 2026-08-25) — project wala "Tender se plan lao"
   bhi zinda hai. AI numbers kabhi khud nahi banata — file ke #REF!
   wale cell "err" ban kar jaate hain aur AI unhe chhoo nahi sakta.

   Backend: routes/tender-ai-plan.js (analyze/discuss/PUT/execute)
   ──────────────────────────────────────────────────────────────────── */

const WTYPE_LABEL = { road: "Road", drain: "Drain", pipeline: "Pipeline", water: "Water", sewer: "Sewer", electrical: "Electrical", structure: "Structure", other: "Anya" };
const WTYPE_COLOR = { road: "#B45309", drain: "#0E7490", pipeline: "#1565C0", water: "#0284C7", sewer: "#7C3AED", electrical: "#D97706", structure: "#475569", other: "#64748B" };
const fmtAmt = (n) => { const v = Number(n || 0); if (!v) return "—"; if (v >= 1e7) return "₹" + (v / 1e7).toFixed(2) + " Cr"; if (v >= 1e5) return "₹" + (v / 1e5).toFixed(2) + " L"; return "₹" + v.toLocaleString("en-IN"); };
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

/* ── DIGEST BUILDER — poori workbook ka compact saar ──────────────────
   Har sheet: naam + size + pehli 2 heading (inhi me village/road likha
   hota hai) + tooti (#REF!/error) cells ki ginti. BOQ-jaisi sheet ke
   items ki list, aur ABSTRACT/LENGTH jaisi summary sheets poori
   (values only). Error cell ka number KABHI nahi jaata — "#ERR" jaata. */
async function buildDigest(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellFormula: false, cellNF: false });
  const enc = XLSX.utils.encode_cell;
  const sheets = []; const keyNames = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]; if (!ws || !ws["!ref"]) { sheets.push({ name, rows: 0, cols: 0, heads: [], err: 0 }); continue; }
    const R = XLSX.utils.decode_range(ws["!ref"]);
    let err = 0; const heads = [];
    for (let r = 0; r <= Math.min(R.e.r, 6) && heads.length < 2; r++) {
      for (let c = 0; c <= Math.min(R.e.c, 12); c++) {
        const cell = ws[enc({ r, c })];
        if (cell && typeof cell.v === "string" && cell.v.trim().length > 10) { heads.push(cell.v.trim().slice(0, 110)); break; }
      }
    }
    let seen = 0;
    for (const k in ws) { if (k[0] === "!") continue; if (++seen > 3000) break; if (ws[k].t === "e") err++; }
    sheets.push({ name, rows: R.e.r + 1, cols: R.e.c + 1, heads, err });
    if (/abstract|length|lenght|summary/i.test(name)) keyNames.push(name);
  }

  // BOQ master ke items — naam se, warna sabse badi chaudi sheet
  let boq_master = null;
  const bname = wb.SheetNames.find((n) => /^boq/i.test(n))
    || wb.SheetNames.reduce((best, n) => {
      const ws = wb.Sheets[n]; if (!ws || !ws["!ref"]) return best;
      const R = XLSX.utils.decode_range(ws["!ref"]);
      const score = (R.e.r + 1) * (R.e.c + 1 > 20 ? 2 : 1);
      return !best || score > best.score ? { n, score } : best;
    }, null)?.n;
  const bws = bname && wb.Sheets[bname];
  if (bws && bws["!ref"]) {
    const R = XLSX.utils.decode_range(bws["!ref"]);
    let hr = -1, colMap = {};
    for (let r = 0; r <= Math.min(R.e.r, 12) && hr < 0; r++) {
      const cells = {};
      for (let c = 0; c <= R.e.c; c++) { const cl = bws[enc({ r, c })]; if (cl && typeof cl.v === "string") cells[c] = cl.v.toLowerCase(); }
      const find = (re) => { for (const c in cells) if (re.test(cells[c])) return Number(c); return -1; };
      const d = find(/desc/), u = find(/^unit/), q = find(/^quantity|^qty/), rt = find(/^rate/), am = find(/^amount/);
      if (d >= 0 && (u >= 0 || q >= 0)) { hr = r; colMap = { no: find(/^s\.?\s*no/), ref: find(/ref/), desc: d, unit: u, qty: q, rate: rt, amount: am }; }
    }
    if (hr >= 0) {
      const items = [];
      const val = (r, c) => { if (c < 0) return null; const cl = bws[enc({ r, c })]; if (!cl) return null; if (cl.t === "e") return "#ERR"; return cl.v; };
      for (let r = hr + 1; r <= R.e.r && items.length < 420; r++) {
        const desc = val(r, colMap.desc); if (desc == null || String(desc).trim() === "") continue;
        const it = {
          no: val(r, colMap.no), ref: String(val(r, colMap.ref) || "").slice(0, 30),
          desc: String(desc).replace(/\s+/g, " ").slice(0, 95),
          unit: val(r, colMap.unit), qty: val(r, colMap.qty), rate: val(r, colMap.rate), amount: val(r, colMap.amount),
        };
        it.err = it.qty === "#ERR" || it.rate === "#ERR" || it.amount === "#ERR";
        items.push(it);
      }
      boq_master = { sheet: bname, header_row: hr + 1, items };
    }
  }

  // summary sheets poori (values; error → "#ERR")
  const key_sheets = [];
  for (const name of keyNames.slice(0, 8)) {
    const ws = wb.Sheets[name]; if (!ws || !ws["!ref"]) continue;
    const R = XLSX.utils.decode_range(ws["!ref"]);
    const rows = [];
    for (let r = 0; r <= Math.min(R.e.r, 59); r++) {
      const row = [];
      for (let c = 0; c <= Math.min(R.e.c, 16); c++) {
        const cl = ws[enc({ r, c })];
        row.push(!cl ? null : cl.t === "e" ? "#ERR" : (typeof cl.v === "string" ? cl.v.slice(0, 60) : cl.v));
      }
      if (row.some((v) => v !== null && v !== "")) rows.push(row);
    }
    key_sheets.push({ name, rows });
  }

  const digest = { file_name: file.name, sheet_count: wb.SheetNames.length, sheets, boq_master, key_sheets };
  let s = JSON.stringify(digest);
  while (s.length > 650000 && (digest.key_sheets.length || (digest.boq_master && digest.boq_master.items.length > 150))) {
    if (digest.key_sheets.length) digest.key_sheets.pop();
    else digest.boq_master.items = digest.boq_master.items.slice(0, digest.boq_master.items.length - 50);
    s = JSON.stringify(digest);
  }
  return digest;
}

const inp = (extra = {}) => ({ padding: "5px 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...extra });

export default function TenderAiPlan({ tenderId, onOpenProject }) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [draftMeta, setDraftMeta] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [llmReady, setLlmReady] = useState(true);
  const [canExec, setCanExec] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");        // "analyze" | "chat" | "save" | "exec"
  const [chat, setChat] = useState("");
  const [open, setOpen] = useState({});
  const [execOpen, setExecOpen] = useState(false);
  const [cities, setCities] = useState([]); const [ctypes, setCtypes] = useState([]);
  const [cityId, setCityId] = useState(""); const [ctypeId, setCtypeId] = useState("");
  const [execResult, setExecResult] = useState(null);
  const [err, setErr] = useState("");
  const fileRef = useRef(null); const chatEndRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/tenders/${tenderId}/ai-plan`);
      if (r?.success) {
        setPlan(r.data.draft?.plan || null);
        setDraftMeta(r.data.draft || null);
        setExecResult(r.data.draft?.execute_result || null);
        setMsgs(r.data.messages || []);
        setLlmReady(r.data.llm_ready !== false);
        setCanExec(!!r.data.can_execute);
      }
    } catch (_) {}
    setLoading(false);
  }, [tenderId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const onFile = async (f) => {
    if (!f) return;
    setErr(""); setBusy("analyze");
    try {
      const digest = await buildDigest(f);
      const r = await api.post(`/tenders/${tenderId}/ai-plan/analyze`, { digest }, { timeoutMs: 300000 });
      if (r?.success) { setPlan(r.data.plan); setDirty(false); setExecResult(null); setMsgs([{ role: "ai", text: r.data.reply }]); }
      else setErr(r?.message || "Analyze fail");
    } catch (e) { setErr("File padhne me dikkat: " + (e?.message || "error")); }
    setBusy("");
  };

  const send = async () => {
    const text = chat.trim(); if (!text || busy) return;
    setChat(""); setBusy("chat");
    setMsgs((m) => [...m, { role: "user", text }]);
    try {
      // Haath ke edit pehle save — warna AI purane plan par baat karega
      if (dirty && plan) { await api.put(`/tenders/${tenderId}/ai-plan`, { plan }); setDirty(false); }
      const r = await api.post(`/tenders/${tenderId}/ai-plan/discuss`, { text }, { timeoutMs: 300000 });
      if (r?.success) { if (r.data.plan) { setPlan(r.data.plan); setDirty(false); } setMsgs((m) => [...m, { role: "ai", text: r.data.reply }]); }
      else setMsgs((m) => [...m, { role: "ai", text: "⚠ " + (r?.message || "AI se baat nahi ho payi") }]);
    } catch (e) { setMsgs((m) => [...m, { role: "ai", text: "⚠ " + (e?.message || "error") }]); }
    setBusy("");
  };

  const save = async () => {
    if (!plan) return; setBusy("save");
    const r = await api.put(`/tenders/${tenderId}/ai-plan`, { plan }).catch(() => null);
    if (r?.success) setDirty(false); else setErr(r?.message || "Save fail");
    setBusy("");
  };

  const openExec = async () => {
    setExecOpen(true);
    if (!cities.length) {
      const [cr, tr] = await Promise.all([api.get("/library/cities").catch(() => null), api.get("/library/construction-types").catch(() => null)]);
      if (cr?.success) setCities(cr.data || []);
      if (tr?.success) setCtypes(tr.data || []);
    }
  };

  const doExecute = async () => {
    setBusy("exec"); setErr("");
    try {
      if (dirty && plan) { await api.put(`/tenders/${tenderId}/ai-plan`, { plan }); setDirty(false); }
      const r = await api.post(`/tenders/${tenderId}/ai-plan/execute`, { city_id: cityId || null, construction_type_id: ctypeId || null }, { timeoutMs: 120000 });
      if (r?.success) { setExecResult(r.data); setExecOpen(false); window.toast?.success?.("Plan execute ho gaya — " + r.data.projects.length + " site, " + r.data.works_created + " kaam"); }
      else setErr(r?.message || "Execute fail");
    } catch (e) { setErr(e?.message || "error"); }
    setBusy("");
  };

  const upd = (fn) => { setPlan((p) => { const n = JSON.parse(JSON.stringify(p)); fn(n); return n; }); setDirty(true); };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.t4, fontSize: 13 }}>Loading…</div>;

  const totalWorks = plan ? plan.sites.reduce((a, s) => a + s.works.filter((w) => w.take !== false).length, 0) : 0;
  const totalAmt = plan ? plan.sites.reduce((a, s) => a + s.works.filter((w) => w.take !== false).reduce((b, w) => b + (Number(w.amount) || 0), 0), 0) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* header strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>✨ AI Plan</div>
        <div style={{ fontSize: 11, color: T.t4 }}>workbook do → AI se site/task plan par charcha → final hone par execute</div>
        <div style={{ flex: 1 }} />
        {plan && <>
          {dirty && <button onClick={save} disabled={!!busy} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: T.amb, color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{busy === "save" ? "…" : "Save edits"}</button>}
          <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, fontSize: 11.5, cursor: "pointer" }}>↻ Nayi file se dobara</button>
          <button onClick={openExec} disabled={!!busy || !canExec} title={canExec ? "" : "Sites sirf Execution stage ke aage banti hain"}
            style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: canExec ? T.grn : T.b1, color: canExec ? "white" : T.t4, fontSize: 12, fontWeight: 700, cursor: canExec ? "pointer" : "not-allowed" }}>▶ Execute</button>
        </>}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" style={{ display: "none" }} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <div style={{ padding: "8px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, fontSize: 12, color: T.red }}>{err}</div>}
      {!llmReady && <div style={{ padding: "8px 12px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#92400E" }}>AI abhi uplabdh nahi (server par LLM key nahi lagi) — plan haath se edit/execute phir bhi chalega.</div>}

      {/* empty state */}
      {!plan && (
        <div onClick={() => !busy && fileRef.current?.click()}
          style={{ border: `2px dashed ${T.b2}`, borderRadius: 12, padding: "44px 20px", textAlign: "center", cursor: busy ? "default" : "pointer", background: T.surfaceB }}>
          {busy === "analyze"
            ? <><div style={{ fontSize: 14, fontWeight: 700, color: T.blu }}>AI workbook padh raha hai…</div>
              <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6 }}>Badi file (100+ sheets) par 1–3 minute lag sakte hain — browser sirf saar bhejta hai, poori file nahi.</div></>
            : <><div style={{ fontSize: 15, fontWeight: 700, color: T.t2 }}>📄 BOQ / estimate workbook yahan do</div>
              <div style={{ fontSize: 12, color: T.t4, marginTop: 6 }}>AI saari sheets padh kar propose karega: village/area-wise <b>sites</b> → main <b>kaam</b> → execution <b>stages</b> qty ke saath.<br />Phir neeche chat me AI se bahas karke plan final karo.</div></>}
        </div>
      )}

      {/* PLAN TREE */}
      {plan && <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: T.t3 }}>
          <span style={{ background: T.bluL, border: `1px solid ${T.bluM}`, borderRadius: 20, padding: "3px 12px", fontWeight: 700, color: T.blu }}>{plan.sites.length} sites</span>
          <span style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 20, padding: "3px 12px" }}>{totalWorks} kaam</span>
          <span style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 20, padding: "3px 12px", color: T.grn, fontWeight: 700 }}>{fmtAmt(totalAmt)}</span>
          {draftMeta?.status === "executed" && <span style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 20, padding: "3px 12px", color: T.grn }}>✓ execute ho chuka — dobara chalana surakshit</span>}
        </div>

        {(plan.warnings?.length > 0 || plan.unmapped?.length > 0) && (
          <div style={{ padding: "9px 12px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
            {plan.warnings?.map((w, i) => <div key={"w" + i}>⚠ {w}</div>)}
            {plan.unmapped?.map((w, i) => <div key={"u" + i}>◌ Kisi site me nahi: {w}</div>)}
          </div>
        )}

        {plan.sites.map((site, si) => (
          <div key={si} style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "#0D1B2A", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>🏘 {site.name}</span>
              {site.note && <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)" }}>{site.note}</span>}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{fmtAmt(site.works.filter((w) => w.take !== false).reduce((a, w) => a + (Number(w.amount) || 0), 0))}</span>
            </div>
            {site.works.map((w, wi) => {
              const on = w.take !== false; const key = si + ":" + wi; const exp = !!open[key];
              return (
                <div key={wi} style={{ borderTop: `1px solid ${T.b1}`, opacity: on ? 1 : 0.45 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexWrap: "wrap" }}>
                    <input type="checkbox" checked={on} onChange={() => upd((p) => { p.sites[si].works[wi].take = !on; })} style={{ width: 15, height: 15, cursor: "pointer" }} />
                    <input value={w.name} onChange={(e) => upd((p) => { p.sites[si].works[wi].name = e.target.value; })} style={inp({ flex: "1 1 220px", fontWeight: 700, fontSize: 12.5 })} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "white", background: WTYPE_COLOR[w.wtype] || WTYPE_COLOR.other, padding: "2px 8px", borderRadius: 10, textTransform: "uppercase" }}>{WTYPE_LABEL[w.wtype] || w.wtype}</span>
                    <input type="number" value={w.qty || ""} placeholder="qty" onChange={(e) => upd((p) => { p.sites[si].works[wi].qty = Number(e.target.value) || 0; })} style={inp({ width: 88, textAlign: "right", fontWeight: 700 })} />
                    <input value={w.unit || ""} placeholder="unit" onChange={(e) => upd((p) => { p.sites[si].works[wi].unit = e.target.value; })} style={inp({ width: 58 })} />
                    <input type="number" value={w.amount || ""} placeholder="₹" onChange={(e) => upd((p) => { p.sites[si].works[wi].amount = Number(e.target.value) || 0; })} style={inp({ width: 110, textAlign: "right", color: T.grn, fontWeight: 700 })} />
                    {w.needs_review && <span title="AI ko number pakka nahi mila — jaanch lo" style={{ fontSize: 10, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>jaanch lo</span>}
                    <button onClick={() => setOpen((o) => ({ ...o, [key]: !exp }))} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11, color: T.blu, fontWeight: 700 }}>
                      {w.stages.length ? `${w.stages.length} stages ${exp ? "▴" : "▾"}` : (exp ? "stages ▴" : "+ stages")}
                    </button>
                  </div>
                  {w.source && <div style={{ padding: "0 12px 6px 35px", fontSize: 10, color: T.t4 }}>src: {w.source}</div>}
                  {exp && (
                    <div style={{ padding: "4px 12px 10px 35px", display: "flex", flexDirection: "column", gap: 5 }}>
                      {w.stages.map((st, ti) => (
                        <div key={ti} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: T.t4, width: 18 }}>{ti + 1}.</span>
                          <input value={st.name} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].name = e.target.value; })} style={inp({ flex: "1 1 180px" })} />
                          <input type="number" value={st.qty || ""} placeholder={w.qty ? String(w.qty) : "qty"} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].qty = Number(e.target.value) || 0; })} style={inp({ width: 80, textAlign: "right" })} />
                          <input value={st.unit || ""} placeholder={w.unit || "unit"} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].unit = e.target.value; })} style={inp({ width: 52 })} />
                          <input type="number" value={st.amount || ""} placeholder="₹" onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].amount = Number(e.target.value) || 0; })} style={inp({ width: 100, textAlign: "right", color: T.grn })} />
                          <button onClick={() => upd((p) => { p.sites[si].works[wi].stages.splice(ti, 1); })} style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 13 }}>×</button>
                        </div>
                      ))}
                      <button onClick={() => upd((p) => { p.sites[si].works[wi].stages.push({ name: "", qty: 0, unit: w.unit || "", amount: 0 }); })}
                        style={{ alignSelf: "flex-start", border: `1px dashed ${T.b2}`, background: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: T.t3, cursor: "pointer" }}>＋ stage</button>
                      <div style={{ fontSize: 10, color: T.t4, lineHeight: 1.5 }}>
                        Line-kaam (road/drain/pipe) me stage ki qty khali chhodo to har stage par kaam ki poori lambai jayegi ({fmtQty(w.qty)} {w.unit}); structure ke stage % me chalte hain. ₹ na baanto to poora paisa pehle stage par jayega.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* EXECUTE RESULT */}
        {execResult && (
          <div style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: T.t2 }}>
            <div style={{ fontWeight: 700, color: T.grn, marginBottom: 6 }}>✓ Execute ho chuka</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {execResult.projects?.map((p) => (
                <button key={p.id} onClick={() => onOpenProject && onOpenProject(p.id)}
                  style={{ border: `1px solid ${T.grnM}`, background: "white", borderRadius: 7, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: T.t1, cursor: onOpenProject ? "pointer" : "default" }}>
                  🏘 {p.name} {p.created ? "(nayi bani)" : "(pehle se thi)"} →
                </button>
              ))}
            </div>
            <div>{execResult.works_created} kaam + {execResult.stages_created} stages bane{execResult.skipped?.length ? ` · ${execResult.skipped.length} pehle se the (skip)` : ""}</div>
            {execResult.skipped?.length > 0 && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{execResult.skipped.join(" · ")}</div>}
          </div>
        )}

        {/* CHAT */}
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 11.5, fontWeight: 700, color: T.t2 }}>💬 AI se charcha — plan yahi se sudharta hai</div>
          <div style={{ maxHeight: 260, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.length === 0 && <div style={{ fontSize: 11.5, color: T.t4 }}>Jaise: "drain ko road ke saath mat jodo, alag kaam rakho" · "Sendh ko do site me baanto" · "har road me WMM stage bhi daalo"</div>}
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "7px 11px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? T.blu : T.surfaceB, color: m.role === "user" ? "white" : T.t1, border: m.role === "user" ? "none" : `1px solid ${T.b1}` }}>{m.text}</div>
            ))}
            {busy === "chat" && <div style={{ alignSelf: "flex-start", fontSize: 11.5, color: T.t4 }}>AI soch raha hai…</div>}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: "9px 12px", borderTop: `1px solid ${T.b1}` }}>
            <input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Plan me kya badlu? likho…" disabled={!!busy || !llmReady}
              style={inp({ flex: 1, padding: "8px 11px", fontSize: 12.5 })} />
            <button onClick={send} disabled={!!busy || !chat.trim() || !llmReady}
              style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: chat.trim() && !busy ? T.blu : T.b1, color: "white", fontSize: 12, fontWeight: 700, cursor: chat.trim() && !busy ? "pointer" : "default" }}>Bhejo</button>
          </div>
        </div>
      </>}

      {/* EXECUTE CONFIRM */}
      {execOpen && plan && (<>
        <div onClick={() => setExecOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400 }} />
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: T.surface, borderRadius: 12, width: "min(440px,94vw)", zIndex: 401, padding: "18px 20px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 4 }}>Plan execute karein?</div>
          <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.6, marginBottom: 12 }}>
            <b>{plan.sites.length} sites</b> ({plan.sites.map((s) => s.name).join(", ")}) — {totalWorks} kaam, budget {fmtAmt(totalAmt)}.<br />
            Jo site/kaam pehle se hai wo dobara <b>nahi</b> banega. Task banne ke baad edit/delete aam task jaisa hai.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>City (nayi site ke liye)</label>
              <select value={cityId} onChange={(e) => setCityId(e.target.value)} style={inp({ width: "100%", marginTop: 3 })}>
                <option value="">— chuno —</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>Construction type</label>
              <select value={ctypeId} onChange={(e) => setCtypeId(e.target.value)} style={inp({ width: "100%", marginTop: 3 })}>
                <option value="">— chuno —</option>{ctypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setExecOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surfaceB, border: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer" }}>Cancel</button>
            <button onClick={doExecute} disabled={busy === "exec"} style={{ flex: 2, padding: "9px", borderRadius: 7, border: "none", background: T.grn, color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{busy === "exec" ? "Ban raha hai…" : "▶ Haan, banao"}</button>
          </div>
        </div>
      </>)}
    </div>
  );
}
