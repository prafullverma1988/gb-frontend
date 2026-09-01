import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t, Rich } from "../../i18n";

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
const TOT_RE = /total\s*amount|cost\s*per\s*(meter|metre|mtr|rmt)|total\s*length|grand\s*total|total\s*qty|total\s*quantity/i;

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
    // Har detail sheet ke NEECHE ka jod: "Total amount (INR)" + "Cost per
    // Meter in INR". Prafull: inhi do se us kaam ki lambai nikal aati hai
    // (1,80,017 / 4,856 = 37.08 m). Iske bina AI ko lambai kahin se milti
    // hi nahi thi aur wo qty 0 chhod deta tha.
    const tot = [];
    for (let r = 0; r <= R.e.r && tot.length < 4; r++) {
      let label = null;
      for (let c = 0; c <= Math.min(R.e.c, 20); c++) {
        const cl = ws[enc({ r, c })];
        if (cl && typeof cl.v === "string" && TOT_RE.test(cl.v)) { label = cl.v.trim().slice(0, 42); break; }
      }
      if (!label) continue;
      const nums = [];
      for (let c = 0; c <= Math.min(R.e.c, 25); c++) {
        const cl = ws[enc({ r, c })];
        if (cl && cl.t === "n") nums.push(Math.round(cl.v * 100) / 100);
        else if (cl && cl.t === "e") nums.push("#ERR");
      }
      if (nums.length) tot.push([label, ...nums.slice(-2)]);
    }
    sheets.push({ name, rows: R.e.r + 1, cols: R.e.c + 1, heads, err, tot });
    if (/abstract|length|lenght|summary/i.test(name)) keyNames.push(name);
  }

  // BOQ master ke items — pehle "BOQ" se shuru, phir naam me kahin bhi BOQ
  // ("Modified BOQ" jaisi sheets isi se pakdi jaati hain), warna sabse badi
  let boq_master = null;
  const bname = wb.SheetNames.find((n) => /^boq/i.test(n))
    || wb.SheetNames.find((n) => /boq/i.test(n))
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
      if (d >= 0 && (u >= 0 || q >= 0)) { hr = r; colMap = { no: find(/^s\.?\s*no|^item\s*no/), ref: find(/ref|sor/), desc: d, unit: u, qty: q, rate: rt, amount: am }; }
    }
    if (hr >= 0) {
      const items = [];
      const val = (r, c) => { if (c < 0) return null; const cl = bws[enc({ r, c })]; if (!cl) return null; if (cl.t === "e") return t("tender_ai_plan.err"); return cl.v; };
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

// BOQ se juda hai? — chhota chip. Ek id = pakka link (execute par task
// boq_item_id se jud jayega, MB/RA ki kadi); kai id = sirf yaad ke liye.
const boqChip = (ids) => (Array.isArray(ids) && ids.length > 0)
  ? <span title={t("tender_ai_plan.boq_item_id", { ids: ids.join(", ") }) + (ids.length === 1 ? t("tender_ai_plan.task_isse_judega_mb_ra") : t("tender_ai_plan.kai_items_link_nahi_hoga"))}
      style={{ fontSize: 9, fontWeight: 700, borderRadius: 9, padding: "1px 7px", whiteSpace: "nowrap",
        color: ids.length === 1 ? "#065F46" : "#92400E",
        background: ids.length === 1 ? "#D1FAE5" : "#FEF3C7",
        border: "1px solid " + (ids.length === 1 ? "#A7F3D0" : "#FDE68A") }}>
      BOQ{ids.length === 1 ? " #" + ids[0] : " ×" + ids.length}
    </span>
  : null;

// Kai files ka EK digest — sarkari BOQ aksar 2-3 alag files me aata hai
// (civil/electrical/water alag-alag). Sheet-naam ke aage file ka chhota naam
// lagta hai taaki AI bata sake kaunsi baat kis file se aayi. boq_master
// items sab files ke jud jaate hain (420 par kat-ta hai — tab server ki
// digest-wali money-jaanch khud band ho jaati hai, imported BOQ wali chalti
// rehti hai).
async function mergeDigests(files) {
  if (files.length === 1) return buildDigest(files[0]);
  const short = (nm) => String(nm || "").replace(/\.(xlsx|xls|xlsm)$/i, "").slice(0, 16);
  const merged = { file_name: files.map((f) => f.name).join(" + "), sheet_count: 0, sheets: [], boq_master: null, key_sheets: [] };
  const bmItems = []; let bmSheet = null; let extra = 0;
  for (const f of files) {
    const d = await buildDigest(f);
    merged.sheet_count += d.sheet_count || 0;
    for (const s of d.sheets || []) merged.sheets.push({ ...s, name: short(f.name) + "\u25B8" + s.name });
    for (const k of d.key_sheets || []) if (merged.key_sheets.length < 8) merged.key_sheets.push({ ...k, name: short(f.name) + "\u25B8" + k.name });
    if (d.boq_master && d.boq_master.items && d.boq_master.items.length) {
      if (!bmSheet) bmSheet = short(f.name) + "\u25B8" + d.boq_master.sheet; else extra++;
      for (const it of d.boq_master.items) bmItems.push(it);
    }
  }
  if (bmItems.length) merged.boq_master = { sheet: bmSheet + (extra ? " +" + extra + " files" : ""), header_row: 0, items: bmItems.slice(0, 420) };
  let s = JSON.stringify(merged);
  while (s.length > 650000 && (merged.key_sheets.length || (merged.boq_master && merged.boq_master.items.length > 150))) {
    if (merged.key_sheets.length) merged.key_sheets.pop();
    else merged.boq_master.items = merged.boq_master.items.slice(0, merged.boq_master.items.length - 50);
    s = JSON.stringify(merged);
  }
  return merged;
}

export default function TenderAiPlan({ tenderId, onOpenProject, initialFile }) {
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
  const [job, setJob] = useState(null);        // {status,kind,error} — peechhe chal raha kaam
  const [dinfo, setDinfo] = useState(null);    // digest ka saar — screen par dikhta hai
  const [boqCount, setBoqCount] = useState(0); // tender me imported BOQ items
  const [err, setErr] = useState("");
  const fileRef = useRef(null); const chatBoxRef = useRef(null); const prevMsgCount = useRef(0);
  const initialUsed = useRef(null);

  // silent=true → polling ke liye; spinner nahi dikhana (warna har 5 second
  // poori screen "Loading…" par chali jaati).
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    let draft = null;
    try {
      const r = await api.get(`/tenders/${tenderId}/ai-plan`);
      if (r?.success) {
        setPlan(r.data.draft?.plan || null);
        setDraftMeta(r.data.draft || null);
        setExecResult(r.data.draft?.execute_result || null);
        setMsgs(r.data.messages || []);
        setLlmReady(r.data.llm_ready !== false);
        setCanExec(!!r.data.can_execute);
        setJob(r.data.draft ? { status: r.data.draft.job_status, kind: r.data.draft.job_kind, error: r.data.draft.job_error } : null);
        setBoqCount(Number(r.data.imported_boq_count) || 0);
        draft = r.data.draft;
      }
    } catch (_) {}
    setLoading(false);
    return draft;
  }, [tenderId]);
  useEffect(() => { load(); }, [load]);

  // BOQ Import se seedha aaye ho (Prafull ka idea 1): wahi file yahan
  // pahunchti hai aur analyze apne aap chal jaata hai — dobara chunna nahi.
  useEffect(() => {
    if (initialFile && initialUsed.current !== initialFile) {
      initialUsed.current = initialFile;
      onFile(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  // ── peechhe chal rahe kaam par nazar ────────────────────────────
  // Bada workbook ka plan 5 minute se zyada le sakta hai, aur Railway ka
  // proxy utni lambi request kaat deta hai (live: 502 @300s). Isliye server
  // turant lauta deta hai aur asli kaam peechhe chalta hai — screen har 5
  // second poochhti rehti hai ki hua ya nahi.
  useEffect(() => {
    if (job?.status !== "running") return;
    let alive = true;
    const id = setInterval(async () => {
      if (!alive) return;
      const d = await load(true);
      if (d && d.job_status !== "running") {
        clearInterval(id);
        if (d.job_status === "failed") setErr(d.job_error || "AI ka kaam poora nahi hua");
        setBusy("");
      }
    }, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [job?.status, load]);
  useEffect(() => {
    // scrollIntoView POORE page ko chat tak kheench deta tha — 5s ka poll msgs
    // dobara set karta hai to screen har 5 second khud neeche bhaag rahi thi
    // (live pakda). Ab sirf chat ka DIBBA scroll hota hai, aur sirf tab jab
    // message sach me naya ho.
    if (msgs.length !== prevMsgCount.current) {
      prevMsgCount.current = msgs.length;
      const el = chatBoxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [msgs]);

  const onFile = async (input) => {
    const files = (Array.isArray(input) ? input : [input]).filter(Boolean);
    if (!files.length) return;
    setErr(""); setBusy("analyze");
    try {
      const digest = await mergeDigests(files);
      // Kya-kya nikla — user ko dikhta hai, aur "purana bundle to nahi chal
      // raha" ye do second me pata chal jaata hai (bina jod wali file par
      // "0 sheets me jod" aayega).
      const withTot = digest.sheets.filter((s) => s.tot && s.tot.length).length;
      const errSheets = digest.sheets.filter((s) => s.err > 0).length;
      setDinfo({ kb: Math.round(JSON.stringify(digest).length / 1024), sheets: digest.sheet_count,
        withTot, errSheets, items: digest.boq_master ? digest.boq_master.items.length : 0, files: files.length });
      const r = await api.post(`/tenders/${tenderId}/ai-plan/analyze`, { digest }, { timeoutMs: 120000 });
      if (r?.success) {
        // Server ne kaam pakad liya; ab plan polling se aayega.
        setPlan(null); setDirty(false); setExecResult(null); setMsgs([]);
        setJob({ status: "running", kind: "analyze" });
        return;   // busy chalta rahe — polling khatam hone par hatega
      }
      setErr(r?.message || "Analyze fail");
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
      const r = await api.post(`/tenders/${tenderId}/ai-plan/discuss`, { text }, { timeoutMs: 120000 });
      if (r?.success) { setJob({ status: "running", kind: "discuss" }); return; }
      setMsgs((m) => [...m, { role: "ai", text: "⚠ " + (r?.message || "AI se baat nahi ho payi") }]);
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

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.t4, fontSize: 13 }}>{t("tender_ai_plan.loading")}</div>;

  // ── Map par kya markna hai — faisla YAHIN, planning me ──────────
  // Site par khada supervisor andaza na lagaye; admin/PM yahan BOQ saamne
  // rakh kar tay karta hai. AI pehle se tick laga deta hai (line-kaam aur
  // ginti wale structure par), PM hata/badal sakta hai.
  //
  // Tick KAAM par lagti hai, uski parat (stage) par nahi — ek 1,941 m ki
  // sadak ke neeche khudai/GSB/PCC teen parat hain par SADAK EK hai. Teen
  // tick hoti to site wala usi sadak par teen lakeerein kheench deta.
  // Phir bhi stage par tick ka raasta khula hai: kisi dhandhe me ek kaam
  // ke andar sach me do alag cheezein hoti hain.
  const LINE_W = ["road", "drain", "pipeline", "water", "sewer"];
  const autoMark = (w) => {
    if (LINE_W.includes(w.wtype)) return "line";
    if (w.wtype === "structure" && /^(nos?|no|each|pcs|ls)$/i.test(String(w.unit || "").trim())) return "point";
    return null;
  };
  const markOn = (w) => (w.map === undefined ? !!autoMark(w) : !!w.map);
  const markKind = (w) => w.map_kind || autoMark(w) || "line";

  // Do bhai-bhai par ek hi lambai ki tick = aksar galti (ek hi jagah ki do
  // parat). Rokte nahi — sirf poochh lete hain, kyunki kabhi-kabhi wo sach
  // me do alag cheezein hoti hain.
  const sameLenWarn = (w) => {
    const on = (w.stages || []).filter((st) => st.map);
    if (on.length < 2) return null;
    const qs = on.map((st) => Number(st.qty) || Number(w.qty) || 0).filter((q) => q > 0);
    if (qs.length < 2) return null;
    const mx = Math.max.apply(null, qs), mn = Math.min.apply(null, qs);
    return (mx - mn <= mx * 0.005) ? Math.round(mx) : null;
  };

  // Har row par ek chhoti 📍 tick — kaam, stage aur step teeno par. Kaun
  // sa star markna hai ye kaam par nirbhar karta hai: aam taur par upar
  // wala kaam, par kabhi 15 traffic light bhi alag-alag markne hote hain.
  const pinTick = (on, onToggle, hint) => (
    <label title={hint} style={{ display: "flex", alignItems: "center", gap: 2, cursor: "pointer",
      userSelect: "none", opacity: on ? 1 : 0.35 }}>
      <input type="checkbox" checked={!!on} onChange={onToggle} style={{ width: 12, height: 12, cursor: "pointer" }} />
      <span style={{ fontSize: 11 }}>📍</span>
    </label>
  );

  // Roz ka kaam qty me likha jaye ya % me — ye hum data se hi nikal lete
  // hain, PM ko har row par chunna nahi padta. Wo sirf wahan haath lagayega
  // jahan use lage ki galat hai.
  //   lambai wali unit (m/rm/km)  → qty   (aaj 120 m pada)
  //   ginti 1 se zyada            → qty   (15 traffic light — 3 aaj, 7 kal)
  //   baaki (qty 1, LS, khali)    → %     (ek UGR mahino me banta hai;
  //                                        1 likhte hi "poora" ho jaata)
  const RUN_U = /^(m|rm|rmt|mtr|metre|meter|km)$/i;
  const autoPM = (row) => {
    if (RUN_U.test(String(row.unit || "").trim())) return "qty";
    return Number(row.qty) > 1 ? "qty" : "percent";
  };
  const pmSel = (row, onPick) => (
    <select value={row.progress_mode || autoPM(row)} onChange={onPick} title={t("tender_ai_plan.pm_hint")}
      style={inp({ width: 62, fontSize: 10, padding: "2px 3px",
        color: row.progress_mode ? T.t1 : T.t3 })}>
      <option value="qty">{t("tender_ai_plan.pm_qty")}</option>
      <option value="percent">%</option>
    </select>
  );

  const totalMarks = plan ? plan.sites.reduce((a, s) => a + s.works.filter((w) => w.take !== false)
    .reduce((b, w) => b + (markOn(w) ? 1 : 0) + (w.stages || []).filter((st) => st.map).length, 0), 0) : 0;

  const totalWorks = plan ? plan.sites.reduce((a, s) => a + s.works.filter((w) => w.take !== false).length, 0) : 0;
  const totalAmt = plan ? plan.sites.reduce((a, s) => a + s.works.filter((w) => w.take !== false).reduce((b, w) => b + (Number(w.amount) || 0), 0), 0) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* header strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{t("tender_ai_plan.ai_plan")}</div>
        <div style={{ fontSize: 11, color: T.t4 }}>{t("tender_ai_plan.workbook_do_ai_se_site_task")}</div>
        <div style={{ flex: 1 }} />
        {plan && <>
          {dirty && <button onClick={save} disabled={!!busy} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: T.amb, color: "white", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{busy === "save" ? "…" : t("tender_ai_plan.save_edits")}</button>}
          <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, fontSize: 11.5, cursor: "pointer" }}>{t("tender_ai_plan.nayi_file_se_dobara")}</button>
          <button onClick={openExec} disabled={!!busy || !canExec} title={canExec ? "" : t("tender_ai_plan.sites_sirf_execution_stage_ke_aage")}
            style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: canExec ? T.grn : T.b1, color: canExec ? "white" : T.t4, fontSize: 12, fontWeight: 700, cursor: canExec ? "pointer" : "not-allowed" }}>{t("tender_ai_plan.execute")}</button>
        </>}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" multiple style={{ display: "none" }} onChange={(e) => { onFile([...(e.target.files || [])]); e.target.value = ""; }} />
      {err && <div style={{ padding: "8px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, fontSize: 12, color: T.red }}>{err}</div>}
      {!llmReady && <div style={{ padding: "8px 12px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#92400E" }}>{t("tender_ai_plan.ai_abhi_uplabdh_nahi_server_par")}</div>}
      {dinfo && (
        <div style={{ padding: "7px 12px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, fontSize: 11.5, color: T.t3 }}>{dinfo.files > 1 && <b style={{ color: T.t1 }}>{t("tender_ai_plan.files_files", { files: dinfo.files })}</b>}<Rich k="tender_ai_plan.file_padh_li_sheets_sheets_items" params={{ sheets: dinfo.sheets, items: dinfo.items, withTot: dinfo.withTot }} />{dinfo.errSheets > 0 && <> · <span style={{ color: "#B45309" }}>{t("tender_ai_plan.errsheets_sheets_me_tooti_ref_cells", { errSheets: dinfo.errSheets })}</span></>}{t("tender_ai_plan.saar_kb", { kb: dinfo.kb })}
        </div>
      )}
      {job?.status === "running" && (
        <div style={{ padding: "10px 14px", background: T.bluL, border: `1px solid ${T.bluM}`, borderRadius: 8, fontSize: 12.5, color: T.blu, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            {t("tender_ai_plan.ai_job_bade_workbook_par_2", { job: job.kind === "discuss" ? t("tender_ai_plan.plan_sudhaar_raha_hai") : t("tender_ai_plan.workbook_padh_raha_hai") })}
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 400, marginTop: 3 }}>{t("tender_ai_plan.ye_tab_band_karke_doosra_kaam")}</div>
          </div>
          <button onClick={async () => {
            await api.post(`/tenders/${tenderId}/ai-plan/job-cancel`, {}).catch(() => null);
            setBusy(""); await load(true);
          }}
            style={{ padding: "7px 13px", borderRadius: 8, border: "1.5px solid #FCA5A5", background: "#FEF2F2", color: "#B91C1C", fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t("tender_ai_plan.rok_do")}
          </button>
        </div>
      )}

      {/* empty state */}
      {!plan && (<>
        <div onClick={() => !busy && fileRef.current?.click()}
          style={{ border: `2px dashed ${T.b2}`, borderRadius: 12, padding: "44px 20px", textAlign: "center", cursor: busy ? "default" : "pointer", background: T.surfaceB }}>
          {busy === "analyze" || job?.status === "running"
            ? <><div style={{ fontSize: 14, fontWeight: 700, color: T.blu }}>{t("tender_ai_plan.ai_workbook_padh_raha_hai")}</div>
              <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6 }}>{t("tender_ai_plan.badi_file_100_sheets_par_2")}</div></>
            : <><div style={{ fontSize: 15, fontWeight: 700, color: T.t2 }}>{t("tender_ai_plan.boq_estimate_workbook_yahan_do")}</div>
              <div style={{ fontSize: 12, color: T.t4, marginTop: 6 }}>{t("tender_ai_plan.ai_saari_sheets_padh_kar_propose")}<br />{t("tender_ai_plan.phir_neeche_chat_me_ai_se")}</div></>}
        </div>
        {/* Idea 2 (Prafull): file na ho to imported BOQ se hi — imandaar seema
            ke saath, kyunki BOQ me sirf item/qty/rate hota hai. */}
        {boqCount > 0 && !(busy === "analyze" || job?.status === "running") && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={async () => {
              setErr(""); setBusy("analyze"); setDinfo(null);
              const r = await api.post(`/tenders/${tenderId}/ai-plan/analyze`, { from_boq: true }, { timeoutMs: 120000 }).catch((e) => ({ success: false, message: e?.message }));
              if (r?.success) { setPlan(null); setDirty(false); setExecResult(null); setMsgs([]); setJob({ status: "running", kind: "analyze" }); return; }
              setErr(r?.message || "Analyze fail"); setBusy("");
            }}
              style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${T.bluM}`, background: T.bluL, color: T.blu, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {t("tender_ai_plan.imported_boq_se_banao", { boqCount })}
            </button>
            <span style={{ fontSize: 11, color: T.t4 }}>{t("tender_ai_plan.seema_boq_me_sirf_item_qty_rate")}</span>
          </div>
        )}
      </>)}

      {/* PLAN TREE */}
      {plan && <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: T.t3 }}>
          <span style={{ background: T.bluL, border: `1px solid ${T.bluM}`, borderRadius: 20, padding: "3px 12px", fontWeight: 700, color: T.blu }}>{plan.sites.length} sites</span>
          <span style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 20, padding: "3px 12px" }}>{totalWorks} kaam</span>
          <span style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 20, padding: "3px 12px", color: T.grn, fontWeight: 700 }}>{fmtAmt(totalAmt)}</span>
          {draftMeta?.status === "executed" && <span style={{ background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 20, padding: "3px 12px", color: T.grn }}>{t("tender_ai_plan.execute_ho_chuka_dobara_chalana_surakshit")}</span>}
        </div>

        {(plan.warnings?.length > 0 || plan.unmapped?.length > 0) && (
          <div style={{ padding: "9px 12px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
            {plan.warnings?.map((w, i) => <div key={"w" + i}>⚠ {w}</div>)}
            {plan.unmapped?.map((w, i) => <div key={"u" + i}>{t("tender_ai_plan.kisi_site_me_nahi_w", { w })}</div>)}
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
                    {w.needs_review && <span title={t("tender_ai_plan.ai_ko_number_pakka_nahi_mila")} style={{ fontSize: 10, color: "#B45309", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>{t("tender_ai_plan.jaanch_lo")}</span>}
                    {boqChip(w.boq_item_ids)}
                    {/* Map ki tick — kaam ke star par. Site wale ko yahi
                        list milegi, isliye jo yahan nahi lagi wo wahan
                        dikhegi hi nahi. */}
                    <label title={t("tender_ai_plan.map_tick_hint")}
                      style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", userSelect: "none",
                        opacity: markOn(w) ? 1 : 0.4 }}>
                      <input type="checkbox" checked={markOn(w)}
                        onChange={() => upd((p) => {
                          const nx = !markOn(w);
                          p.sites[si].works[wi].map = nx;
                          p.sites[si].works[wi].map_kind = nx ? markKind(w) : null;
                        })}
                        style={{ width: 14, height: 14, cursor: "pointer" }} />
                      <span style={{ fontSize: 13 }}>📍</span>
                    </label>
                    {markOn(w) && (
                      <select value={markKind(w)}
                        onChange={(e) => upd((p) => { p.sites[si].works[wi].map_kind = e.target.value; })}
                        style={inp({ width: 104, fontSize: 10.5, padding: "2px 4px" })}>
                        <option value="line">{t("tender_ai_plan.mk_line")}</option>
                        <option value="point">{t("tender_ai_plan.mk_point")}</option>
                        <option value="area">{t("tender_ai_plan.mk_area")}</option>
                        {/* Chhota rakba naksha zoom-out par gum ho jaata hai —
                            beech me ek pin rehne se wo dhoondhne par mil
                            jaata hai. Pin apne aap banta hai, alag se
                            markna nahi padta. */}
                        <option value="area+pin">{t("tender_ai_plan.mk_area_pin")}</option>
                      </select>
                    )}
                    {!w.stages.length && pmSel(w,
                      (e) => upd((p) => { p.sites[si].works[wi].progress_mode = e.target.value; }))}
                    <button onClick={() => setOpen((o) => ({ ...o, [key]: !exp }))} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11, color: T.blu, fontWeight: 700 }}>
                      {w.stages.length ? `${w.stages.length} stages ${exp ? "▴" : "▾"}` : (exp ? t("tender_ai_plan.stages") : t("tender_ai_plan.stages_2"))}
                    </button>
                  </div>
                  {w.source && <div style={{ padding: "0 12px 6px 35px", fontSize: 10, color: T.t4 }}>{t("tender_ai_plan.src_source", { source: w.source })}</div>}
                  {sameLenWarn(w) && (
                    <div style={{ margin: "0 12px 8px 35px", padding: "6px 10px", background: T.ambL,
                      border: "1px solid " + T.ambM, borderRadius: 8, fontSize: 11, color: "#92400E" }}>
                      {t("tender_ai_plan.same_len_warn", { n: sameLenWarn(w) })}
                    </div>
                  )}
                  {exp && (
                    <div style={{ padding: "4px 12px 10px 35px", display: "flex", flexDirection: "column", gap: 5 }}>
                      {w.stages.map((st, ti) => (
                        <div key={ti}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: T.t4, width: 18 }}>{ti + 1}.</span>
                            <input value={st.name} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].name = e.target.value; })} style={inp({ flex: "1 1 180px" })} />
                            <input type="number" value={st.qty || ""} placeholder={w.qty ? String(w.qty) : "qty"} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].qty = Number(e.target.value) || 0; })} style={inp({ width: 80, textAlign: "right" })} />
                            <input value={st.unit || ""} placeholder={w.unit || "unit"} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].unit = e.target.value; })} style={inp({ width: 52 })} />
                            <input type="number" value={st.amount || ""} placeholder="₹" onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].amount = Number(e.target.value) || 0; })} style={inp({ width: 100, textAlign: "right", color: T.grn })} />
                            {boqChip(st.boq_item_ids)}
                            {/* Stage par tick — aam taur par ZAROORAT NAHI
                                (parat hai, jagah nahi). Par kabhi ek kaam ke
                                andar sach me do alag cheezein hoti hain,
                                isliye raasta khula hai. */}
                            {pinTick(st.map, () => upd((p) => {
                              const nx = !st.map;
                              p.sites[si].works[wi].stages[ti].map = nx;
                              p.sites[si].works[wi].stages[ti].map_kind = nx ? markKind(w) : null;
                            }), t("tender_ai_plan.stage_tick_hint"))}
                            {!(st.steps || []).length && pmSel(
                              { unit: st.unit || w.unit, qty: st.qty || w.qty, progress_mode: st.progress_mode },
                              (e) => upd((p) => { p.sites[si].works[wi].stages[ti].progress_mode = e.target.value; }))}
                            <button onClick={() => upd((p) => { p.sites[si].works[wi].stages.splice(ti, 1); })} style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 13 }}>×</button>
                          </div>
                          {/* ── TEESRA LEVEL (steps) — Prafull ka case-3: stretch →
                              road/structure → asli kaam (GSB, WMM, RCC…). Yahi
                              leaf hai jahan roz qty likhi jayegi aur jo BOQ item
                              se judti hai. ── */}
                          {(st.steps || []).map((x, xi) => (
                            <div key={xi} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, marginLeft: 26 }}>
                              <span style={{ fontSize: 9.5, color: T.t4, width: 26 }}>{ti + 1}.{xi + 1}</span>
                              <input value={x.name} onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].steps[xi].name = e.target.value; })} style={inp({ flex: "1 1 150px", fontSize: 11.5 })} />
                              <input type="number" value={x.qty || ""} placeholder="qty" onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].steps[xi].qty = Number(e.target.value) || 0; })} style={inp({ width: 74, textAlign: "right", fontSize: 11.5 })} />
                              <input value={x.unit || ""} placeholder="unit" onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].steps[xi].unit = e.target.value; })} style={inp({ width: 48, fontSize: 11.5 })} />
                              <input type="number" value={x.amount || ""} placeholder="₹" onChange={(e) => upd((p) => { p.sites[si].works[wi].stages[ti].steps[xi].amount = Number(e.target.value) || 0; })} style={inp({ width: 94, textAlign: "right", color: T.grn, fontSize: 11.5 })} />
                              {boqChip(x.boq_item_ids)}
                              {/* Step par bhi tick — 15 traffic light jaise
                                  kaam alag-alag markne ho sakte hain. */}
                              {pinTick(x.map, () => upd((p) => {
                                const nx = !x.map;
                                p.sites[si].works[wi].stages[ti].steps[xi].map = nx;
                                p.sites[si].works[wi].stages[ti].steps[xi].map_kind = nx
                                  ? (/^(nos?|no|each|pcs)$/i.test(String(x.unit || "").trim()) ? "point" : markKind(w))
                                  : null;
                              }), t("tender_ai_plan.step_tick_hint"))}
                              {pmSel(
                                { unit: x.unit || st.unit, qty: x.qty, progress_mode: x.progress_mode },
                                (e) => upd((p) => { p.sites[si].works[wi].stages[ti].steps[xi].progress_mode = e.target.value; }))}
                              <button onClick={() => upd((p) => { p.sites[si].works[wi].stages[ti].steps.splice(xi, 1); })} style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 12 }}>×</button>
                            </div>
                          ))}
                          <button onClick={() => upd((p) => { const stg = p.sites[si].works[wi].stages[ti]; stg.steps = stg.steps || []; stg.steps.push({ name: "", qty: 0, unit: "", amount: 0, boq_item_ids: [] }); })}
                            style={{ marginLeft: 26, marginTop: 3, border: `1px dashed ${T.b2}`, background: "none", borderRadius: 5, padding: "1px 8px", fontSize: 10, color: T.t4, cursor: "pointer" }}>{t("tender_ai_plan.step")}</button>
                        </div>
                      ))}
                      <button onClick={() => upd((p) => { p.sites[si].works[wi].stages.push({ name: "", qty: 0, unit: w.unit || "", amount: 0, boq_item_ids: [], steps: [] }); })}
                        style={{ alignSelf: "flex-start", border: `1px dashed ${T.b2}`, background: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: T.t3, cursor: "pointer" }}>{t("tender_ai_plan.stage")}</button>
                      <div style={{ fontSize: 10, color: T.t4, lineHeight: 1.5 }}>{t("tender_ai_plan.line_kaam_road_drain_pipe_me", { fmtQty: fmtQty(w.qty), unit: w.unit })}</div>
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
            <div style={{ fontWeight: 700, color: T.grn, marginBottom: 6 }}>{t("tender_ai_plan.execute_ho_chuka")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {execResult.projects?.map((p) => (
                <button key={p.id} onClick={() => onOpenProject && onOpenProject(p.id)}
                  style={{ border: `1px solid ${T.grnM}`, background: "white", borderRadius: 7, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: T.t1, cursor: onOpenProject ? "pointer" : "default" }}>
                  🏘 {p.name} {p.created ? t("tender_ai_plan.nayi_bani") : t("tender_ai_plan.pehle_se_thi")} →
                </button>
              ))}
            </div>
            <div>
              {t("tender_ai_plan.works_created_kaam_stages_created_stages", { works_created: execResult.works_created, stages_created: execResult.stages_created, steps: execResult.steps_created ? ` + ${execResult.steps_created} steps` : "" })}
              {execResult.boq_linked ? <> · <b style={{ color: T.grn }}>{t("tender_ai_plan.boq_linked_task_boq_se_jude", { boq_linked: execResult.boq_linked })}</b> {t("tender_ai_plan.inki_qty_mb_draft_tak_jayegi")}</> : ""}
              {execResult.skipped?.length ? t("tender_ai_plan.skipped_pehle_se_the", { skipped: execResult.skipped.length }) : ""}
            </div>
            {execResult.skipped?.length > 0 && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{execResult.skipped.join(" · ")}</div>}
          </div>
        )}

        {/* CHAT */}
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 11.5, fontWeight: 700, color: T.t2 }}>{t("tender_ai_plan.ai_se_charcha_plan_yahi_se")}</div>
          <div ref={chatBoxRef} style={{ maxHeight: 260, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.length === 0 && <div style={{ fontSize: 11.5, color: T.t4 }}>{t("tender_ai_plan.jaise_drain_ko_road_ke_saath")}</div>}
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "7px 11px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? T.blu : T.surfaceB, color: m.role === "user" ? "white" : T.t1, border: m.role === "user" ? "none" : `1px solid ${T.b1}` }}>{m.text}</div>
            ))}
            {busy === "chat" && <div style={{ alignSelf: "flex-start", fontSize: 11.5, color: T.t4 }}>{t("tender_ai_plan.ai_soch_raha_hai")}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, padding: "9px 12px", borderTop: `1px solid ${T.b1}` }}>
            <input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={t("tender_ai_plan.plan_me_kya_badlu_likho")} disabled={!!busy || !llmReady}
              style={inp({ flex: 1, padding: "8px 11px", fontSize: 12.5 })} />
            <button onClick={send} disabled={!!busy || !chat.trim() || !llmReady}
              style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: chat.trim() && !busy ? T.blu : T.b1, color: "white", fontSize: 12, fontWeight: 700, cursor: chat.trim() && !busy ? "pointer" : "default" }}>{t("tender_ai_plan.bhejo")}</button>
          </div>
        </div>
      </>}

      {/* EXECUTE CONFIRM */}
      {execOpen && plan && (<>
        <div onClick={() => setExecOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400 }} />
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: T.surface, borderRadius: 12, width: "min(440px,94vw)", zIndex: 401, padding: "18px 20px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t("tender_ai_plan.plan_execute_karein")}</div>
          <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.6, marginBottom: 12 }}><Rich k="tender_ai_plan.plan_sites_plan2_totalworks_kaam_budget" params={{ plan: plan.sites.length, plan2: plan.sites.map((s) => s.name).join(", "), totalWorks, fmtAmt: fmtAmt(totalAmt) }} /><br />
            <Rich k="tender_ai_plan.dobara_nahi_banega" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{t("tender_ai_plan.city_nayi_site_ke_liye")}</label>
              <select value={cityId} onChange={(e) => setCityId(e.target.value)} style={inp({ width: "100%", marginTop: 3 })}>
                <option value="">{t("tender_ai_plan.chuno")}</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{t("tender_ai_plan.construction_type")}</label>
              <select value={ctypeId} onChange={(e) => setCtypeId(e.target.value)} style={inp({ width: "100%", marginTop: 3 })}>
                <option value="">{t("tender_ai_plan.chuno")}</option>{ctypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setExecOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surfaceB, border: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer" }}>{t("tender_ai_plan.cancel")}</button>
            <button onClick={doExecute} disabled={busy === "exec"} style={{ flex: 2, padding: "9px", borderRadius: 7, border: "none", background: T.grn, color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{busy === "exec" ? t("tender_ai_plan.ban_raha_hai") : t("tender_ai_plan.haan_banao")}</button>
          </div>
        </div>
      </>)}
    </div>
  );
}
