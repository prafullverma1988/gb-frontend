// ── Bank statement ka milaan — passbook uthao, kitaab se milao ─────────
//
// Ye wizard KUCH LIKHTA NAHI. Sirf batata hai ki passbook aur kitaab kahan
// alag hain. Entry banana alag kadam rahega, aadmi ke dekhne ke baad —
// kyunki ±3 din ki chhoot ka matlab hai kabhi galat jodi bhi ban sakti hai,
// aur "bank me hai, kitaab me nahi" wali line kabhi doosre khaate ki entry
// nikal sakti hai.
//
// File browser me hi parse hoti hai aur sirf saaf {date, amount, dir} server
// par jaata hai. Statement me poora account number aur har lena-dena hota
// hai; use server par bhejne ya rakhne ki is feature ko zaroorat hi nahi.
//
// Sabse pehla aankda "Closing balance" wala hai, line-wise milaan nahi. Wo do
// number ek hon to aage ka kaam sirf safai hai; alag hon to farak utna hi hai
// jitni entry kahin gum hai — aur wahi asli sawaal hai.
import React, { useState, useCallback, useEffect, useMemo, useContext, createContext, useRef } from "react";
import { createPortal } from "react-dom";
import PickSelect from "../../components/PickSelect";
import api from "../../config/api";
import SearchSelect from "../../components/SearchSelect";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { BatchModal } from "./StmtBatchPanel";

const inr = (n) => {
  const v = Number(n) || 0;
  return (v < 0 ? "−₹" : "₹") + Math.abs(Math.round(v)).toLocaleString("en-IN");
};
const inr2 = (n) => {
  const v = Number(n) || 0;
  return (v < 0 ? "−₹" : "₹") + Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const dmy = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

// Har bank ka header alag likhta hai, aur upar 3-6 line ka kachra hota hai
// (account no, period, branch). Isliye row GIN kar nahi, heading DHOONDH kar
// pakadte hain — pehli aisi line jisme date-jaisa aur debit/credit-jaisa
// dono ho.
const HINTS = {
  date: /^(txn|transaction|value|tran|post|posting)?\s*[.\-_ ]*date$/i,
  desc: /desc|narration|particular|remark|detail/i,
  ref: /ref|cheque|chq|instrument|utr/i,
  debit: /^(debit|withdrawal|dr\.?|paid out|withdrawal amt)/i,
  credit: /^(credit|deposit|cr\.?|paid in|deposit amt)/i,
  balance: /balance/i,
  amount: /^(amount|amt)$/i,
  drcr: /^(dr\s*\/\s*cr|type|txn type|cr\s*\/\s*dr)$/i,
};
function detect(grid) {
  for (let i = 0; i < Math.min(grid.length, 25); i++) {
    const cells = (grid[i] || []).map((c) => String(c === undefined || c === null ? "" : c).trim());
    const hit = (re) => cells.findIndex((c) => c && re.test(c));
    const date = hit(HINTS.date);
    const debit = hit(HINTS.debit);
    const credit = hit(HINTS.credit);
    const amount = hit(HINTS.amount);
    // Do roop chalte hain: alag Debit/Credit column, ya ek Amount + Dr/Cr.
    if (date >= 0 && (debit >= 0 || credit >= 0 || amount >= 0)) {
      return {
        row: i, headings: cells,
        map: { date, desc: hit(HINTS.desc), ref: hit(HINTS.ref), debit, credit,
               amount, drcr: hit(HINTS.drcr), balance: hit(HINTS.balance) },
      };
    }
  }
  return null;
}

// Indian bank hamesha day-first deta hai — 03/04/2026 ka matlab 3 April hai,
// 4 March nahi. Isliye ambiguity me day-first hi maana jaata hai.
function toIso(v) {
  // Local din (toISOString UTC deta hai — IST me aadhi raat ki date pichhla din)
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  const s = String(v === undefined || v === null ? "" : v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2,4})/.exec(s);
  if (m) {
    const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // "03-Apr-2026" — kuch bank aise dete hain
  m = /^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})/.exec(s);
  if (m) {
    const MON = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const mm = MON[m[2].slice(0, 3).toLowerCase()];
    if (mm) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${mm}-${m[1].padStart(2, "0")}`;
  }
  return null;
}
const num = (v) => {
  let s = String(v === undefined || v === null ? "" : v).replace(/[₹,\s]/g, "").trim();
  if (!s) return 0;
  // Kuch statement "1,234.00 Dr" ya "(1,234.00)" likhte hain
  s = s.replace(/\((.*)\)/, "-$1").replace(/(dr|cr)\.?$/i, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
};
// FIN-28: Balance ka sign rehna chahiye — OD / CC khaate ka balance minus hota
// hai. num() rakam ke liye abs karta hai (direction alag column se aati hai),
// balance par wahi lagne se −₹25,000 wala closing +₹25,000 se milta aur check
// hamesha fail hota. "-45,000.00", "(45,000.00)", "45,000.00 Dr" → −45000;
// "45,000.00 Cr" → +45000.
const numSigned = (v) => {
  let s = String(v === undefined || v === null ? "" : v).replace(/[₹,\s]/g, "").trim();
  if (!s) return 0;
  let neg = false, pos = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  const tag = /(dr|cr)\.?$/i.exec(s);
  if (tag) { if (tag[1].toLowerCase() === "dr") neg = true; else pos = true; s = s.slice(0, tag.index); }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : pos ? Math.abs(n) : n;
};

// FIN-28: Excel ki ASLI date cell ka text SheetJS apne default format (m/d/yy)
// me deta hai — "4/3/26" = 3 April, par statement Indian hai isliye toIso
// day-first padhta hai → 4 March; "4/15/26" → mahina 15 (kabhi milta hi nahi).
// Isliye date cell ka ISO seedha uske Excel serial se (SSF.parse_date_code —
// timezone ka koi chakkar nahi; cellDates wale Date object IST me 10 second
// peeche aakar pichhla din ban jaate). Text me likhi date jaisi thi waisi rehti hai.
function excelDatesToIso(XLSX, ws, grid) {
  if (!ws || !ws["!ref"]) return;
  const rg = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = rg.s.r; r <= rg.e.r; r++) {
    const row = grid[r - rg.s.r];
    if (!row) continue;
    for (let c = rg.s.c; c <= rg.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.t !== "n" || !cell.z || !XLSX.SSF.is_date(cell.z)) continue;
      const d = XLSX.SSF.parse_date_code(cell.v);
      if (d && d.y) row[c - rg.s.c] = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
}

function buildRows(grid, hdr) {
  const rows = [];
  let skipped = 0;
  for (let i = hdr.row + 1; i < grid.length; i++) {
    const c = grid[i] || [];
    const date = toIso(c[hdr.map.date]);
    let amount = 0, dir = null;
    if (hdr.map.debit >= 0 || hdr.map.credit >= 0) {
      const d = hdr.map.debit >= 0 ? num(c[hdr.map.debit]) : 0;
      const cr = hdr.map.credit >= 0 ? num(c[hdr.map.credit]) : 0;
      if (d) { amount = d; dir = "out"; } else if (cr) { amount = cr; dir = "in"; }
    } else if (hdr.map.amount >= 0) {
      amount = num(c[hdr.map.amount]);
      const tag = hdr.map.drcr >= 0 ? String(c[hdr.map.drcr] || "") : "";
      dir = /^\s*(cr|credit|c)\b/i.test(tag) ? "in" : "out";
    }
    if (!date || !amount || !dir) { skipped++; continue; }
    rows.push({
      date, amount, dir,
      description: hdr.map.desc >= 0 ? String(c[hdr.map.desc] || "").trim() : null,
      ref: hdr.map.ref >= 0 ? String(c[hdr.map.ref] || "").trim() : null,
      balance: hdr.map.balance >= 0 && String(c[hdr.map.balance] || "").trim() !== ""
        ? numSigned(c[hdr.map.balance]) : null,
    });
  }
  return { rows, skipped };
}


// Dono raaste (CSV/Excel aur PDF) ki preview ek jaisi dikhni chahiye — jo
// screen par aata hai wahi server par jaayega, chahe file kis roop me aayi ho.
// Match step ke kaam ke button (Preview dekho / Approval ke liye bhejo) wizard ke
// NEECHE wali patti me dikhte hain (16 Oct 2026) — andar ka component unhe
// portal se wahan rakhta hai, state wahi ki wahi rehti hai.
const FootCtx = createContext(null);
const footBtn = (kind, off) => ({
  padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
  cursor: off ? "default" : "pointer",
  border: kind === "ghost" ? `1px solid ${T.b2}` : "none",
  background: kind === "ghost" ? T.surface : off ? T.b2 : kind === "send" ? T.grn : T.blu,
  color: kind === "ghost" ? T.t2 : "#fff",
});

// Keyboard (23 Oct 2026): khidki ke andar hi Tab ghoome — aakhri se pehle par,
// Shift+Tab pehle se aakhri par. PickField ka khula panel Tab khud sambhalta hai.
function trapTab(e, root) {
  if (e.key !== "Tab" || e.defaultPrevented || !root) return;
  const f = [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
}

// Button kaam ke waqt disabled hota hai to focus chupchaap <body> par gir jaata
// hai — tab khidki ka onKeyDown kuch nahi sunta. Us haalat me bhi Esc = band,
// Tab = wapas khidki me.
function useStrayKeys(dlgRef, onEsc) {
  const escRef = useRef(onEsc);
  escRef.current = onEsc;
  useEffect(() => {
    const h = (e) => {
      if (e.defaultPrevented || document.activeElement !== document.body || !dlgRef.current) return;
      if (e.key === "Escape") { e.preventDefault(); escRef.current(); }
      else if (e.key === "Tab") { e.preventDefault(); dlgRef.current.focus(); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [dlgRef]);
}

function PreviewTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 7 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
        <thead><tr>
          {[t("stmt.c_date"), t("stmt.c_desc"), t("stmt.money_in"), t("stmt.money_out"), t("stmt.c_balance")].map((h, i) => (
            <th key={h} style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px", textAlign: i >= 2 ? "right" : "left", padding: "7px 10px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.slice(0, 6).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.b1}` }}>
              <td style={{ fontSize: 12, padding: "6px 10px", whiteSpace: "nowrap" }}>{dmy(r.date)}</td>
              <td style={{ fontSize: 12, padding: "6px 10px", color: T.t3, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description || "—"}</td>
              <td style={{ fontSize: 12, padding: "6px 10px", textAlign: "right", color: T.grn }}>{r.dir === "in" ? inr(r.amount) : ""}</td>
              <td style={{ fontSize: 12, padding: "6px 10px", textAlign: "right", color: T.red }}>{r.dir === "out" ? inr(r.amount) : ""}</td>
              <td style={{ fontSize: 12, padding: "6px 10px", textAlign: "right", color: T.t3 }}>{r.balance == null ? "—" : inr(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Statement kis khaate ka — account number ke aakhri 4 ank file ke naam ya
// statement ke upar ke hisse me dikhe to wahi khaata. Ek se zyada / koi nahi = null.
function guessAccount(accounts, text) {
  const runs = (String(text || "").match(/\d{4,}/g) || []);
  if (!runs.length) return null;
  const hits = (accounts || []).filter((a) => {
    const d = String(a.account_number || "").replace(/\D/g, "");
    return d.length >= 4 && runs.some((r) => r.endsWith(d.slice(-4)));
  });
  return hits.length === 1 ? hits[0] : null;
}

export default function StatementImportWizard({ accounts, onClose, initialAccountId }) {
  const [footSlot, setFootSlot] = useState(null);
  const [hideBack, setHideBack] = useState(false);
  const footCtx = useMemo(() => ({ slot: footSlot, setHideBack }), [footSlot]);
  const [step, setStep] = useState(1);
  // Keyboard: Esc = band (file chun li ho to pehle poochho — kaam na jaaye),
  // focus khidki me, band hone par wahin wapas jahan se khula tha.
  const dlgRef = useRef(null);
  const askClose = useCallback(() => {
    if (step > 1 && !window.confirm(t("stmt.close_confirm"))) return;
    onClose();
  }, [step, onClose]);
  useStrayKeys(dlgRef, askClose);
  useEffect(() => {
    const prev = document.activeElement;
    if (dlgRef.current) dlgRef.current.focus();
    return () => { if (prev && prev.focus && document.contains(prev)) prev.focus(); };
  }, []);
  // Pehle se koi khaata nahi (15 Oct 2026) — pehle Khaata Ledger ka pehla
  // chuna khaata (aksar Cash on Hand) apne aap lag jaata tha aur PNB ka
  // statement galat khaate par chal jaata. File ke baad user khud chunta hai.
  // Bank milaan table ke "Statement milao" se aaye to wahi khaata pehle se chuna
  const [acctId, setAcctId] = useState(initialAccountId ? String(initialAccountId) : "");
  const [fileName, setFileName] = useState("");
  const [grid, setGrid] = useState(null);
  const [hdr, setHdr] = useState(null);
  const [tol, setTol] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  // PDF ka raasta alag hai: usme column mapping nahi hoti (server pehle hi
  // saaf rows bhej deta hai), balki parse ki quality dikhti hai.
  const [pdf, setPdf] = useState(null);        // { rows, num_pages, … }
  const [pdfFile, setPdfFile] = useState(null);
  const [pw, setPw] = useState("");
  const [needsPw, setNeedsPw] = useState(false);
  const isPdf = !!pdf;

  // PDF ko server bhejo. Yahi ek jagah hai jahan statement server par jaata
  // hai — aur wo sirf memory me parse hokar chhoot jaata hai, kahin likha
  // nahi jaata. Wajah utils/pdfStatement aur route ke comment me hai.
  const sendPdf = useCallback(async (file, password) => {
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await api.postRaw(
        `/finance/accounts/${acctId || (accounts[0] && accounts[0].id)}/statement/parse-pdf`,
        await file.arrayBuffer(),
        { "Content-Type": "application/pdf", ...(password ? { "X-Statement-Password": password } : {}) });
      if (!r || !r.success) {
        if (r && r.needs_password) { setNeedsPw(true); setErr(r.message || t("stmt.pdf_password")); return; }
        throw new Error((r && r.message) || t("stmt.failed"));
      }
      setPdf(r.data); setNeedsPw(false); setHdr(null); setGrid(null);
      setFileName(file.name); setStep(2);
    } catch (e2) {
      setErr(e2.message || t("stmt.failed"));
    } finally { setBusy(false); }
  }, [acctId]);

  const onFile = useCallback(async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setErr(""); setResult(null); setPdf(null); setNeedsPw(false); setPw("");
    if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
      setPdfFile(f);
      e.target.value = "";
      await sendPdf(f, "");
      return;
    }
    setPdfFile(null);
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      // CSV ko TEXT ki tarah padho, bytes ki tarah nahi. Bytes wale raaste par
      // SheetJS encoding ka andaza lagata hai aur UTF-8 ko Latin-1 samajh
      // leta hai — "TOP-UP — PARAM" ka em-dash "â" ban jaata tha. Narration
      // hi wo cheez hai jisse aadmi pehchanta hai ki ye entry kis ki hai,
      // isliye uska bigadna sirf badsurat nahi, kaam-kharab hai.
      // .xlsx binary hai, wahan bytes hi sahi raasta hai.
      const isCsv = /\.csv$/i.test(f.name) || /csv|text\/plain/i.test(f.type || "");
      // FIN-28: CSV me raw:true — SheetJS "16-Apr-2026" / "03/04/2026" jaisi text
      // date ko khud month-first date bana kar "4/16/26" likh deta tha. Excel me
      // cellNF: date cell pehchaan kar ISO banate hain (excelDatesToIso).
      const wb = isCsv
        ? XLSX.read(await f.text(), { type: "string", raw: true })
        : XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: "array", raw: false, cellNF: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const g = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true });
      if (!isCsv) excelDatesToIso(XLSX, ws, g);
      const h = detect(g);
      setGrid(g); setHdr(h); setFileName(f.name);
      if (!h) setErr(t("stmt.no_header"));
      else setStep(2);
    } catch (e2) {
      setErr(e2.message || t("stmt.read_failed"));
    } finally {
      setBusy(false);
      e.target.value = "";   // wahi file dobara chun sakein
    }
  }, [sendPdf]);

  const parsed = isPdf
    ? { rows: pdf.rows, skipped: pdf.unparsed_count || 0 }
    : (grid && hdr ? buildRows(grid, hdr) : { rows: [], skipped: 0 });

  const run = useCallback(async () => {
    if (!parsed.rows.length || !acctId) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await api.post(`/finance/accounts/${acctId}/statement/reconcile`,
        { rows: parsed.rows, tolerance_days: tol });
      if (!r || !r.success) throw new Error((r && r.message) || t("stmt.failed"));
      setResult(r.data); setStep(3);
    } catch (e2) {
      setErr(e2.message || t("stmt.failed"));
    } finally { setBusy(false); }
  }, [parsed.rows, acctId, tol]);

  const setCol = (k, v) => setHdr((h) => ({ ...h, map: { ...h.map, [k]: v === "" ? -1 : Number(v) } }));

  const btn = (kind) => ({
    padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: kind === "primary" ? "none" : `1px solid ${T.b2}`,
    background: kind === "primary" ? T.blu : T.surface,
    color: kind === "primary" ? "#fff" : T.t2,
  });
  const box = { fontSize: 12.5, padding: "6px 9px", border: `1px solid ${T.b1}`, borderRadius: 6, background: T.surface, color: T.t1 };

  const COLS = [
    ["date", t("stmt.c_date"), true], ["desc", t("stmt.c_desc"), false],
    ["ref", t("stmt.c_ref"), false], ["debit", t("stmt.c_debit"), false],
    ["credit", t("stmt.c_credit"), false], ["amount", t("stmt.c_amount"), false],
    ["drcr", t("stmt.c_drcr"), false], ["balance", t("stmt.c_balance"), false],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) askClose(); }}>
      <div ref={dlgRef} role="dialog" aria-modal="true" aria-label={t("stmt.title")} tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); askClose(); return; }
          trapTab(e, dlgRef.current);
        }}
        style={{ background: T.surface, borderRadius: 12, width: "min(980px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)", outline: "none" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stmt.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("stmt.subtitle")}</div>
          </div>
          {(() => {
            // File (chuno + column) → Jaanch → Bhejo (preview). hideBack = preview khula hai.
            const ph = step < 3 ? 1 : hideBack ? 3 : 2;
            return ["file", "jaanch", "bhejo"].map((k, i) => (
              <span key={k} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                color: ph === i + 1 ? "#fff" : ph > i + 1 ? T.blu : T.t4,
                background: ph === i + 1 ? T.blu : ph > i + 1 ? T.bluL : "transparent" }}>
                {i + 1}. {t(`jz.step_${k}`)}
              </span>
            ));
          })()}
          <button onClick={onClose} aria-label={t("stmt.close")} style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: T.t4, cursor: "pointer", padding: "0 2px" }}>×</button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          {err && <div style={{ marginBottom: 12, padding: "9px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, fontSize: 12.5, color: T.red }}>{err}</div>}

          {/* 1 — file */}
          {step === 1 && (
            <div>
              <label style={{ display: "block", border: `2px dashed ${T.b2}`, borderRadius: 10, padding: "34px 18px", textAlign: "center", cursor: "pointer", background: T.surfaceB }}>
                <input type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: "none" }} onChange={onFile} />
                <div style={{ fontSize: 14, fontWeight: 600, color: T.blu }}>{busy ? t("stmt.reading") : t("stmt.pick_file")}</div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 5 }}>{t("stmt.pick_file_note")}</div>
              </label>

              {/* Password wali PDF — bank aksar aise hi bhejta hai */}
              {needsPw && pdfFile && (
                <div style={{ marginTop: 14, padding: "12px 14px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, marginBottom: 7 }}>{t("stmt.pdf_password")}</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && pw) sendPdf(pdfFile, pw); }}
                      placeholder={t("stmt.pdf_password_ph")} aria-label={t("stmt.pdf_password")}
                      style={{ ...box, flex: "1 1 200px", minWidth: 160 }} />
                    <button onClick={() => sendPdf(pdfFile, pw)} disabled={busy || !pw}
                      style={{ ...btn("primary"), opacity: busy || !pw ? 0.5 : 1, padding: "7px 15px" }}>
                      {busy ? t("stmt.reading") : t("stmt.pdf_open")}
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.t3, marginTop: 7 }}>{t("stmt.pdf_password_note")}</div>
                </div>
              )}

              <div style={{ marginTop: 14, fontSize: 12, color: T.t3, lineHeight: 1.6 }}>{t("stmt.privacy_note")}</div>
              <div style={{ marginTop: 7, fontSize: 12, color: T.t3, lineHeight: 1.6 }}>{t("stmt.pdf_server_note")}</div>
            </div>
          )}

          {/* 2 — PDF ka nateeja (column mapping nahi — server saaf rows deta hai) */}
          {step === 2 && (() => {
            const head = [fileName, ...((grid || []).slice(0, 25).map((r) => (r || []).join(" ")))].join(" ");
            const g = guessAccount(accounts, head);
            const chosen = accounts.find((a) => String(a.id) === String(acctId));
            const clash = g && chosen && String(g.id) !== String(chosen.id);
            return (
              <div style={{ marginBottom: 14, padding: "11px 13px", borderRadius: 8, border: `1.5px solid ${acctId ? (clash ? T.amb : T.grnM) : T.redM}`, background: acctId ? (clash ? T.ambL : T.surface) : T.redL }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 5 }}>{t("stmt.which_account")} <span style={{ color: T.red }}>*</span></label>
                <PickSelect value={acctId} onChange={(e) => setAcctId(e.target.value)} placeholder={t("stmt.account_choose")} style={{ ...box, width: "100%", maxWidth: 400 }}>
                  <option value="">{t("stmt.account_choose")}</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.account_number ? ` · ${a.account_number}` : ""}</option>)}
                </PickSelect>
                {g && !acctId && (
                  <div style={{ marginTop: 7, fontSize: 12, color: T.t2 }}>
                    {t("stmt.account_guess", { name: g.name, no: String(g.account_number).slice(-4) })}{" "}
                    <button onClick={() => setAcctId(String(g.id))} style={{ border: "none", background: "none", color: T.blu, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "inherit" }}>{t("stmt.account_use")}</button>
                  </div>
                )}
                {clash && <div style={{ marginTop: 7, fontSize: 12, color: T.amb, fontWeight: 600 }}>{t("stmt.account_clash", { name: g.name, no: String(g.account_number).slice(-4) })}</div>}
                {!acctId && !g && <div style={{ marginTop: 6, fontSize: 11.5, color: T.red }}>{t("stmt.account_required")}</div>}
              </div>
            );
          })()}
          {step === 2 && isPdf && (
            <div>
              <div style={{ fontSize: 12.5, color: T.t2, marginBottom: 10 }}>
                {t("stmt.pdf_read", { file: fileName, pages: pdf.num_pages, n: pdf.rows.length })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 14 }}>
                {[
                  [t("stmt.pdf_rows"), pdf.rows.length, T.blu],
                  [t("stmt.pdf_cols"), pdf.columns_found ? t("stmt.yes") : t("stmt.no"), pdf.columns_found ? T.grn : T.amb],
                  [t("stmt.pdf_weak_n"), pdf.weak_count, pdf.weak_count ? T.amb : T.grn],
                  [t("stmt.pdf_unparsed_n"), pdf.unparsed_count, pdf.unparsed_count ? T.amb : T.grn],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ padding: "10px 13px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, borderTop: `3px solid ${c}` }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".6px" }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginTop: 3 }}>{v}</div>
                  </div>
                ))}
              </div>
              {(pdf.weak_count > 0 || pdf.unparsed_count > 0) && (
                <div style={{ padding: "10px 13px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 8, fontSize: 12, color: T.t2, marginBottom: 14, lineHeight: 1.6 }}>
                  {t("stmt.pdf_warn")}
                  {pdf.unparsed_lines && pdf.unparsed_lines.length > 0 && (
                    <div style={{ marginTop: 7, fontFamily: "ui-monospace,monospace", fontSize: 11, color: T.t3, maxHeight: 90, overflowY: "auto" }}>
                      {pdf.unparsed_lines.slice(0, 6).map((u, i) => <div key={i}>p{u.page}: {u.text}</div>)}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: T.t2 }}>{t("stmt.tolerance")}</label>
                <PickSelect value={tol} onChange={(e) => setTol(Number(e.target.value))} style={box}>
                  {[0, 1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n === 0 ? t("stmt.tol_exact") : t("stmt.tol_days", { n })}</option>)}
                </PickSelect>
                <span style={{ fontSize: 11.5, color: T.t4 }}>{t("stmt.tolerance_why")}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>{t("stmt.preview")}</div>
              <PreviewTable rows={parsed.rows} />
            </div>
          )}

          {/* 2 — column mapping (CSV / Excel) */}
          {step === 2 && !isPdf && hdr && (
            <div>
              <div style={{ fontSize: 12.5, color: T.t2, marginBottom: 12 }}>
                {t("stmt.detected", { file: fileName, row: hdr.row + 1, n: parsed.rows.length })}
                {parsed.skipped > 0 && <span style={{ color: T.t4 }}> · {t("stmt.skipped_n", { n: parsed.skipped })}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginBottom: 16 }}>
                {COLS.map(([k, label, req]) => (
                  <div key={k}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: req ? T.t1 : T.t3, marginBottom: 3 }}>
                      {label}{req ? " *" : ""}
                    </label>
                    <PickSelect value={hdr.map[k] >= 0 ? hdr.map[k] : ""} onChange={(e) => setCol(k, e.target.value)} style={{ ...box, width: "100%" }}>
                      <option value="">{t("stmt.col_none")}</option>
                      {hdr.headings.map((h, i) => <option key={i} value={i}>{h || `(${t("stmt.col_n", { n: i + 1 })})`}</option>)}
                    </PickSelect>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: T.t2 }}>{t("stmt.tolerance")}</label>
                <PickSelect value={tol} onChange={(e) => setTol(Number(e.target.value))} style={box}>
                  {[0, 1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n === 0 ? t("stmt.tol_exact") : t("stmt.tol_days", { n })}</option>)}
                </PickSelect>
                <span style={{ fontSize: 11.5, color: T.t4 }}>{t("stmt.tolerance_why")}</span>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>{t("stmt.preview")}</div>
              <PreviewTable rows={parsed.rows} />
              {!parsed.rows.length && <div style={{ marginTop: 10, fontSize: 12.5, color: T.red }}>{t("stmt.no_rows")}</div>}
            </div>
          )}

          {/* 3 — milaan */}
          {step === 3 && result && (
            <FootCtx.Provider value={footCtx}>
              <JaanchView result={result} accounts={accounts} />
            </FootCtx.Provider>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", background: T.surfaceB }}>
          {step > 1 && !(step === 3 && hideBack) && <button onClick={() => { setStep(step - 1); setErr(""); }} style={btn("ghost")}>{t("stmt.back")}</button>}
          <div ref={setFootSlot} style={{ flex: 1, minWidth: 0, display: "flex", gap: 9, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }} />
          {step === 2 && (
            <button onClick={run} disabled={busy || !parsed.rows.length || !acctId}
              style={{ ...btn("primary"), opacity: busy || !parsed.rows.length || !acctId ? 0.5 : 1 }}>
              {busy ? t("stmt.matching") : t("stmt.match_now")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Jaanch (22 Nov 2026) ───────────────────────────────────────────────
// Milaan ke baad ki EK hi list (pehle: 4 ginti ke dabbe + 3-4 tab + andar do
// aur tab, line party chunte hi ek tab se doosre me kood jaati thi).
//   • Statement ki har line apni jagah rehti hai; sirf uski sthiti badalti hai:
//     Faisla baaki → Taiyaar / Pehle se hai / Chhodi → Bheji.
//   • Har line par ek sawaal — "Ye paisa kya tha?" — aur jawab ke hisaab se
//     sirf wahi dabbe: Party · Kharcha (Head) · Doosra khaata · Kitaab me
//     pehle se hai (khud jodi) · Abhi chhodo.
//   • Server ka andaza (utils/partySuggest) pehle se bhara aata hai par
//     "Sahi hai" dabane tak Taiyaar nahi — ya upar "N pakke andaze maan lo".
//   • Jo line milaan me khud jud gayi wo "Pehle se mili" me, "Jodi todo" ke saath.
//   • Doosre khaate me mili line (dohri ka shaq) usi line par peela dabba.
// Likhne ka raasta wahi: Bhejo (preview) → batch → Multi-Level Approval.
const pickKey = (s) => (s.kind === "account" ? `a:${s.account_id}` : `p:${s.party_id}`);

// Andaza kyun — server why_codes bhejta hai, yahan har bhasha me. Purana
// server sirf `why` (Hinglish) bhejta tha — tab wahi.
function whyText(s) {
  const id = s.id_label || "";
  const W = {
    name_full: () => t("stmt.why_name_full"),
    name_words: () => t("stmt.why_name_words"),
    history: () => t("stmt.why_history"),
    id_matched: () => t("stmt.why_id_matched", { id }),
    id_party_master: () => t("stmt.why_id_party_master", { id }),
    id_account_master: () => t("stmt.why_id_account_master", { id }),
    id_history: () => t("stmt.why_id_history", { id }),
    id_mixed: () => t("stmt.why_id_mixed"),
  };
  const parts = (s.why_codes || []).map((c) => W[c] && W[c]()).filter(Boolean);
  const txt = parts.length ? parts.join(", ") : (s.why || "");
  const ex = s.id_example || s.example;
  return ex ? `${txt} — "${ex}"` : txt;
}

// Line ki sthiti — poori screen (ginti, filter, bhejna) isi ek jagah se.
//   auto  milaan me khud judi · sent batch me ja chuki · todo faisla baaki
//   ready bhejne ko taiyaar · have kitaab me pehle se · skip abhi chhodi
function rowStatus(r) {
  if (r.auto && !r.unmatched) return "auto";
  if (r.outcome === "queued" || r.outcome === "created" || r.outcome === "already_imported") return "sent";
  if (r.elsewhere && !r.els) return "todo";
  if (r.els && r.els.kind !== "create") return "have";
  if (r.kind === "skip") return "skip";
  if (r.kind === "have") return r.haveTxn ? "have" : "todo";
  const pk = r.pick || "";
  const valid = (r.kind === "party" && pk.startsWith("p:")) || (r.kind === "xfer" && pk.startsWith("a:"))
    || (r.kind === "exp" && !!r.head) || r.kind === "bare";
  return valid && (r.touched || r.ok) ? "ready" : "todo";
}

function JaanchView({ result, accounts }) {
  const d = result;
  const bc = d.balance_check;
  const accountId = d.account.id;
  const tol = d.tolerance_days;
  const [filter, setFilter] = useState("all");
  const [parties, setParties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [heads, setHeads] = useState([]);
  const [draft, setDraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [preview, setPreview] = useState(false);
  const [openBatch, setOpenBatch] = useState(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        // Mili lines ki party server txn_id se khud padhta hai — yahan sirf jodi
        const learn = (d.matched || [])
          .filter((m) => m && m.txn_id && m.statement && m.statement.description)
          .map((m) => ({ description: m.statement.description, txn_id: m.txn_id }));
        api.get("/library/expense-heads").then((h) => {
          if (!dead && h && h.success) setHeads((h.data || []).filter((x) => Number(x.is_active) !== 0));
        }).catch(() => {});
        const [pr, sg] = await Promise.all([
          api.get("/finance/parties"),
          d.only_in_statement.length
            ? api.post(`/finance/accounts/${accountId}/statement/suggest`, { rows: d.only_in_statement, learn, include_accounts: true })
            : Promise.resolve({ success: true, data: [] }),
        ]);
        if (dead) return;
        const sugg = (sg && sg.success && Array.isArray(sg.data)) ? sg.data : [];
        setParties((pr && pr.success && Array.isArray(pr.data)) ? pr.data : []);
        const blank = { kind: "", pick: "", head: "", proj: "", proj_why: null, proj_touched: false, note: "",
          haveTxn: "", ok: false, touched: false, edit: false, els: null, outcome: null };
        const fresh = d.only_in_statement.map((r, i) => {
          const s = sugg[i] || { suggestions: [], confidence: "none", bank_own: null };
          const top = s.suggestions[0];
          // Sirf "pakka" andaza pehle se bharta hai — par Taiyaar tabhi jab user
          // "Sahi hai" dabaye. Galat party par entry do ledger ek saath bigaadti hai.
          const pre = !r.elsewhere && !s.bank_own && top && s.confidence === "strong";
          return { ...r, ...blank, bank_own: s.bank_own, confidence: s.confidence, suggestions: s.suggestions,
            kind: pre ? (top.kind === "account" ? "xfer" : "party") : "", pick: pre ? pickKey(top) : "" };
        });
        // Milaan me judi line bhi list me (alag filter) — "Jodi todo" par aam line ban jaati hai
        const auto = (d.matched || []).map((m) => ({ ...m.statement, ...blank, suggestions: [], confidence: "none", bank_own: null, auto: m }));
        setDraft([...fresh, ...auto]);
      } catch (e) {
        if (!dead) setErr(e.message || t("stmt.failed"));
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [d, accountId]);

  const upd = useCallback((i, patch) => setDraft((dd) => dd.map((x, j) => (j === i ? { ...x, ...patch } : x))), []);

  // Party badli to project ka andaza dobara — sirf un line ka jinka project user ne khud nahi chuna
  const pickSig = draft.map((x) => x.pick || "").join("|");
  useEffect(() => {
    if (!draft.length) return undefined;
    let dead = false;
    const tm = setTimeout(async () => {
      try {
        const lines = draft.map((x) => ({ party_id: x.pick && x.pick.startsWith("p:") ? Number(x.pick.slice(2)) : null, description: x.description, dir: x.dir }));
        const r = await api.post(`/finance/accounts/${accountId}/statement/project-suggest`, { lines });
        if (dead || !r || !r.success) return;
        setProjects(r.data.projects || []);
        const sg = r.data.lines || [];
        setDraft((dd) => dd.map((x, i) => (x.proj_touched || !sg[i] ? x
          : { ...x, proj: sg[i].project_id ? String(sg[i].project_id) : "", proj_why: sg[i].why ? sg[i] : null })));
      } catch (_) { /* andaza na aaye to Company — user khud chun sakta hai */ }
    }, 400);
    return () => { dead = true; clearTimeout(tm); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickSig, accountId]);

  // Dabbon ki list — ek baar banti hai, har line apna Andaza upar jodti hai
  const partyOpts = useMemo(() => {
    const nm = (p) => String(p.name || "").trim().toLowerCase();
    const cnt = {};
    parties.forEach((p) => { cnt[nm(p)] = (cnt[nm(p)] || 0) + 1; });
    const po = (p, group) => ({ key: `p:${p.id}`, label: p.name, group, search: p.phone || "",
      ...(cnt[nm(p)] > 1 ? { sub: p.phone || "#" + p.id } : {}) });
    return [...parties.filter((p) => !p.is_staff).map((p) => po(p, t("stmt.grp_parties"))),
      ...parties.filter((p) => p.is_staff).map((p) => po(p, t("stmt.grp_staff")))];
  }, [parties]);
  const accOpts = useMemo(() => (accounts || []).filter((a) => String(a.id) !== String(accountId))
    .map((a) => ({ key: `a:${a.id}`, label: a.name, search: a.account_number || "" })), [accounts, accountId]);
  const projOpts = useMemo(() => [{ key: "", label: t("stmt.proj_company") },
    ...projects.map((p) => ({ key: String(p.id), label: p.name, group: t("stmt.proj_grp") }))], [projects]);
  const headOpts = useMemo(() => heads.map((h) => ({ key: String(h.id), label: h.name, sub: h.type || null })), [heads]);
  const projName = useCallback((k) => (k ? ((projects.find((p) => String(p.id) === String(k)) || {}).name || "#" + k) : t("stmt.proj_company")), [projects]);
  const headName = useCallback((k) => ((heads.find((h) => String(h.id) === String(k)) || {}).name || t("stmt.exp_head_missing")), [heads]);
  const nameOf = useCallback((k) => {
    if (!k) return "";
    const o = partyOpts.find((x) => x.key === k) || accOpts.find((x) => x.key === k);
    if (o) return o.label;
    for (const r of draft) {
      const sg = (r.suggestions || []).find((x) => pickKey(x) === k);
      if (sg) return sg.party_name;
    }
    return k;
  }, [partyOpts, accOpts, draft]);

  // Kitaab ki wo entry jo statement se nahi judi: milaan ki bachi + todi hui jodi − khud jodi
  const used = useMemo(() => new Set(draft.filter((r) => r.kind === "have" && r.haveTxn).map((r) => String(r.haveTxn))), [draft]);
  const books = useMemo(() => [
    ...(d.only_in_books || []),
    ...draft.filter((r) => r.auto && r.unmatched).map((r) => ({ txn_id: r.auto.txn_id, party: r.auto.txn_party, description: r.description,
      amount: r.amount, dir: r.dir, date: r.date, type: "" })),
  ], [d, draft]);
  const usedKey = [...used].join(",");

  const st = draft.map(rowStatus);
  const cnt = (k) => st.filter((x) => x === k).length;
  const total = draft.length - cnt("auto");
  const nTodo = cnt("todo"), nReady = cnt("ready"), nSkip = cnt("skip"), nSent = cnt("sent");
  const nHave = cnt("have") + cnt("auto");
  const extra = books.filter((b) => !used.has(String(b.txn_id)));
  const readyRows = draft.filter((r, i) => st[i] === "ready");
  const preOk = draft.map((r, i) => (st[i] === "todo" && !r.touched && !r.ok && !r.elsewhere && r.pick && (r.kind === "party" || r.kind === "xfer") ? i : -1)).filter((i) => i >= 0);
  const acceptAll = () => setDraft((dd) => dd.map((x, i) => (preOk.includes(i) ? { ...x, ok: true } : x)));
  // Bhejne ke baad farak: passbook − (kitaab + taiyaar line ka asar)
  const after = bc ? Math.round((Number(bc.difference) - readyRows.reduce((a, r) => a + (r.dir === "in" ? 1 : -1) * (Number(r.amount) || 0), 0)) * 100) / 100 : null;

  // Save = batch. Seedhe khaate me nahi — Multi-Level Approval ("Bank Statement
  // Import") se; daalne wala approver ho tab bhi pending. submit=false = draft.
  const create = async (batchNote, submit = true) => {
    const pick = readyRows;
    if (!pick.length) return;
    setBusy(true); setErr("");
    try {
      const CH = 500;   // server ek batch me 500 line tak leta hai
      const parts = [];
      for (let i = 0; i < pick.length; i += CH) parts.push(pick.slice(i, i + CH));
      const made = [];
      let r = null;
      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi];
        r = await api.post(`/finance/accounts/${accountId}/statement/batches`, {
          submit,
          entries: part.map((x) => {
            const mk = x.els && x.els.kind === "create";
            return {
              date: x.date, amount: x.amount, dir: x.dir, description: x.description, ref: x.ref || null,
              party_id: x.kind === "party" ? Number(x.pick.slice(2)) : null,
              transfer_account_id: x.kind === "xfer" ? Number(x.pick.slice(2)) : null,
              project_id: x.kind !== "xfer" && x.proj ? Number(x.proj) : null,
              ...(x.kind === "exp" ? { expense: true, expense_head_id: Number(x.head) } : {}),
              note: x.note.trim() || (mk ? t("stmt.force_note", { why: x.els.reason, acc: x.elsewhere.account_name }) : null),
              force: mk,
            };
          }),
          // Milaan me judi (aur khud jodi) kitaab ki entry — approve par inhe dohri nahi maana jaata
          claimed_txn_ids: [...draft.filter((x) => x.auto && !x.unmatched).map((x) => x.auto.txn_id),
            ...draft.filter((x) => x.kind === "have" && x.haveTxn).map((x) => Number(x.haveTxn))].filter(Boolean),
          batch_note: ((batchNote || "").trim() + (parts.length > 1 ? ` (${pi + 1}/${parts.length})` : "")) || null,
          // FIN-24: server ka duplicate-guard milaan wali hi ±din ki chhoot lagaye
          ...(Number.isFinite(Number(tol)) ? { tolerance_days: Number(tol) } : {}),
        });
        if (!r || !r.success) {
          if (made.length) setDraft((dd) => dd.map((x) => (made.some((m) => m.rows.includes(x)) ? { ...x, outcome: "queued" } : x)));
          throw new Error((r && r.message) || t("stmt.failed"));
        }
        made.push({ id: r.data.id, rows: part });
      }
      setDraft((dd) => dd.map((x) => (pick.includes(x) ? { ...x, outcome: "queued", edit: false } : x)));
      setDone({ batch: made.map((m, k) => (k ? "#" : "") + m.id).join(", "), status: r.data.status, n: pick.length, id: made[0].id, turn: null });
      setPreview(false);
      // Ab kiski baari — approvals ki apni list se (meri baari ho to wahin se approve)
      const rid = r.data.approval_request_id;
      if (submit && rid) {
        const find = (x) => ((x && x.success && Array.isArray(x.data)) ? x.data : []).find((it) => Number(it.id) === Number(rid) || Number(it._request_id) === Number(rid));
        try {
          let turn = null;
          if (find(await api.get("/approvals/pending?scope=my"))) turn = { mine: true };
          else {
            const it = find(await api.get("/approvals/pending?scope=all"));
            if (it) turn = { name: it._waitingOnName || it._waitingOn || it.pending_role || "", more: Number(it._waitingOnMore) || 0 };
          }
          if (turn) setDone((dn) => (dn ? { ...dn, turn } : dn));
        } catch (_) { /* naam na mile to bhi batch ka button hai */ }
      }
    } catch (e) {
      setErr(e.message || t("stmt.failed"));
    } finally { setBusy(false); }
  };

  // Bhejo (preview) khula ho to neeche ka "Peeche" chhupao aur upar ka kadam "3 Bhejo"
  const foot = useContext(FootCtx);
  const slot = foot ? foot.slot : null;
  const setHideBack = foot && foot.setHideBack;
  useEffect(() => {
    if (!setHideBack) return undefined;
    setHideBack(!!preview);
    return () => setHideBack(false);
  }, [preview, setHideBack]);

  if (loading) return <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("stmt.suggest_loading")}</div>;

  if (preview) {
    return (
      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
        {err && <div style={{ padding: "8px 13px", fontSize: 12, color: T.red, background: T.redL }}>{err}</div>}
        <PreviewCreate slot={slot} rows={readyRows} nameOf={nameOf} force={false} busy={busy}
          parties={parties} acctName={d.account.name} acctClosing={d.closing} projName={projName} headName={headName}
          onBack={() => { setPreview(false); setErr(""); }}
          onConfirm={(note) => create(note, true)}
          onDraft={(note) => create(note, false)} />
      </div>
    );
  }

  const F = [
    ["all", t("jz.f_all", { n: total }), T.t1], ["todo", t("jz.f_todo", { n: nTodo }), T.amb], ["ready", t("jz.f_ready", { n: nReady }), T.grn],
    ["have", t("jz.f_have", { n: nHave }), T.blu], ["extra", t("jz.f_extra", { n: extra.length }), T.amb],
    ...(nSkip ? [["skip", t("jz.f_skip", { n: nSkip }), T.slt]] : []), ...(nSent ? [["sent", t("jz.f_sent", { n: nSent }), T.slt]] : []),
  ];
  const showIn = { all: ["todo", "ready", "have", "skip", "sent"], todo: ["todo"], ready: ["ready"], have: ["have", "auto"], skip: ["skip"], sent: ["sent"] };
  const list = filter === "extra" ? [] : draft.map((r, i) => [r, i]).filter(([, i]) => showIn[filter].includes(st[i]));
  const decided = total - nTodo;
  const chip = (on, c) => ({ fontSize: 12, fontWeight: on ? 700 : 500, padding: "5px 12px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${on ? c : T.b1}`, background: on ? T.surfaceB : T.surface, color: on ? c : T.t3, whiteSpace: "nowrap" });

  return (
    <div>
      {slot && createPortal(
        <>
          <span style={{ fontSize: 12, color: nTodo ? T.amb : T.grn, fontWeight: 600, marginRight: "auto" }}>
            {nTodo ? t("jz.foot_todo", { n: nTodo }) : t("jz.foot_done")}
          </span>
          <button onClick={() => { setErr(""); setPreview(true); }} disabled={busy || !nReady} style={footBtn("primary", busy || !nReady)}>
            {t("jz.next_send", { n: nReady })}
          </button>
        </>, slot)}

      {/* Ek patti: passbook vs kitaab + kitna kaam hua */}
      <div style={{ padding: "11px 14px", borderRadius: 8, marginBottom: 10, background: T.surface, border: `1px solid ${T.b1}` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 12.5, color: T.t2, alignItems: "baseline" }}>
          <b style={{ fontSize: 13.5, color: T.t1 }}>{t("jz.progress", { a: decided, b: total })}</b>
          {bc ? (
            <>
              <span>{t("stmt.bal_passbook")}: <b>{inr2(bc.statement_balance)}</b></span>
              <span>{t("stmt.bal_books")}: <b>{inr2(bc.book_balance)}</b></span>
              <b style={{ color: Math.abs(after) < 1 ? T.grn : T.red, marginLeft: "auto" }}>
                {Math.abs(after) < 1 ? t("jz.after_ok") : t("jz.after_diff", { amt: inr2(Math.abs(after)) })}
              </b>
            </>
          ) : <span style={{ color: T.t3 }}>{t("stmt.no_balance_col")}</span>}
        </div>
        <div style={{ height: 6, background: T.surfaceB, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${total ? Math.round((decided / total) * 100) : 100}%`, height: 6, background: nTodo ? T.blu : T.grn }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        {F.map(([k, label, c]) => <button key={k} onClick={() => setFilter(k)} style={chip(filter === k, c)}>{label}</button>)}
        {preOk.length > 0 && (
          <button onClick={acceptAll} style={{ ...chip(true, T.grn), marginLeft: "auto", background: T.grnL }}>{t("jz.accept_all", { n: preOk.length })}</button>
        )}
      </div>

      {err && <div style={{ padding: "8px 13px", fontSize: 12, color: T.red, background: T.redL, borderRadius: 7, marginBottom: 8 }}>{err}</div>}
      {done && (
        <div style={{ padding: "9px 13px", fontSize: 12.5, color: T.t2, background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 7, marginBottom: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 220 }}>
            {done.status === "draft" ? t("bm.sent_draft", { id: done.batch, n: done.n }) : t("bm.sent", { id: done.batch, n: done.n })}
            {done.status !== "draft" && done.turn && (
              <b style={{ display: "block", marginTop: 2, color: done.turn.mine ? T.grn : T.t1 }}>
                {done.turn.mine ? t("bm.turn_mine") : t("bm.turn_other", { name: done.turn.name + (done.turn.more ? " +" + done.turn.more : "") })}
              </b>
            )}
          </span>
          <button onClick={() => setOpenBatch(done.id)}
            style={{ fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              border: `1px solid ${T.grn}`, background: done.turn && done.turn.mine ? T.grn : T.surface, color: done.turn && done.turn.mine ? "#fff" : T.grn }}>
            {done.status === "draft" ? t("bm.open_draft") : done.turn && done.turn.mine ? t("bm.approve_now") : t("bm.open_batch")}
          </button>
        </div>
      )}

      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ maxHeight: "min(62vh, 620px)", overflowY: "auto" }}>
          {filter === "extra" ? <BookRows rows={extra} /> : (
            <>
              {filter === "have" && nHave > 0 && <div style={{ padding: "8px 13px", fontSize: 12, color: T.t3, borderBottom: `1px solid ${T.b1}` }}>{t("jz.have_help", { tol })}</div>}
              {list.length === 0 && <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("jz.empty_" + (filter === "all" ? "all" : "f"))}</div>}
              {list.map(([r, i]) => (
                <JaanchRow key={i} r={r} i={i} status={st[i]} upd={upd} partyOpts={partyOpts} accOpts={accOpts} projOpts={projOpts} headOpts={headOpts}
                  books={books} usedKey={usedKey} nameOf={nameOf} projName={projName} headName={headName}
                  accountId={accountId} accountName={d.account.name} />
              ))}
            </>
          )}
        </div>
      </div>

      {d.totals.book_rows_outside_window > 0 && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: T.t4 }}>{t("stmt.outside_window", { n: d.totals.book_rows_outside_window })}</div>
      )}
      {openBatch && <BatchModal id={openBatch} onClose={() => { setOpenBatch(null); setDone((dn) => (dn ? { ...dn, turn: null } : dn)); }} />}
    </div>
  );
}

// ── Save se pehle ek nazar ──────────────────────────────────────────────
// Prafull: "sabhi party select and notes dalne ke bad ek preview screen ana
// chahiye sab sahi dala hai ki nahi preview ke bad jab user ok save kare tab
// fr payment data party and account wise db me save ho". Isliye "entry banao"
// ab seedha save nahi karta — pehle ye dikhata hai ki KIS party ke khaate me
// kitna jayega, kaunsi line doosre khaate me transfer banegi, aur kaunsi bina
// party ke (sirf bank khaate me) — phir hi save.
function PreviewCreate({ slot, rows, nameOf, force, busy, onBack, onConfirm, onDraft, parties = [], acctName, acctClosing, projName, headName }) {
  const [note, setNote] = useState("");
  const noteOk = note.trim().length >= 3;
  // Party ka balance: >0 = party hume degi, <0 = hum denge. Khaate se paisa gaya
  // (payment) = party ki taraf +, aaya (receipt) = − — utils/moneyRules jaisa.
  const balOf = (k) => { const p = parties.find((x) => "p:" + x.id === k); return p ? Number(p.live_balance != null ? p.live_balance : p.balance) || 0 : null; };
  const balTxt = (v) => (v == null ? "—" : v === 0 ? "₹0" : `${inr(Math.abs(v))} ${v > 0 ? t("stmt.bal_receive") : t("stmt.bal_pay")}`);
  const tot = { in: 0, out: 0 };
  const grp = { p: {}, a: {}, x: {} };
  const none = { n: 0, in: 0, out: 0 };
  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    tot[r.dir === "in" ? "in" : "out"] += amt;
    // Kharcha Head-wise (x:<head>)
    const k = r.pick === "x:" ? "x:" + (r.head || "") : (r.pick || "");
    const kind = k.startsWith("p:") ? "p" : k.startsWith("a:") ? "a" : k.startsWith("x:") ? "x" : null;
    const bucket = kind ? (grp[kind][k] = grp[kind][k] || { key: k, name: kind === "x" ? (headName ? headName(r.head) : r.head) : nameOf(k), n: 0, in: 0, out: 0 }) : none;
    bucket.n += 1;
    bucket[r.dir === "in" ? "in" : "out"] += amt;
  }
  const byName = (o) => Object.values(o).sort((x, y) => (y.in + y.out) - (x.in + x.out));
  // Project-wise (transfer ke bina) — kitna paisa kis project / company par
  const pj = {};
  for (const r of rows) {
    if ((r.pick || "").startsWith("a:")) continue;
    const k = "j:" + (r.proj || "");
    const g = (pj[k] = pj[k] || { key: k, name: projName ? projName(r.proj) : (r.proj || ""), n: 0, in: 0, out: 0 });
    g.n += 1; g[r.dir === "in" ? "in" : "out"] += Number(r.amount) || 0;
  }
  const projList = byName(pj);
  const partyList = byName(grp.p);
  const transfers = byName(grp.a);
  const expenses = byName(grp.x);

  const th = { fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 13px", textAlign: "left" };
  const td = { fontSize: 12.5, color: T.t1, padding: "6px 13px", borderTop: `1px solid ${T.b1}` };
  const num = { ...td, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
  const Group = ({ title, list, withBal }) => !list.length ? null : (
    <div style={{ marginBottom: 12, border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: T.surfaceB }}>
          <tr>
            <th style={th}>{title}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_count")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_in")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_out")}</th>
            {withBal && <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_old")}</th>}
            {withBal && <th style={{ ...th, textAlign: "right" }}>{t("stmt.pv_col_new")}</th>}
          </tr>
        </thead>
        <tbody>
          {list.map((g) => (
            <tr key={g.key}>
              <td style={{ ...td, fontWeight: 600 }}>{g.name}</td>
              <td style={num}>{g.n}</td>
              <td style={{ ...num, color: g.in ? T.grn : T.t4 }}>{g.in ? inr(g.in) : "—"}</td>
              <td style={{ ...num, color: g.out ? T.red : T.t4 }}>{g.out ? inr(g.out) : "—"}</td>
              {withBal && (() => { const o = balOf(g.key); const nw = o == null ? null : Math.round((o + g.out - g.in) * 100) / 100;
                return (<>
                  <td style={{ ...num, color: T.t3 }}>{balTxt(o)}</td>
                  <td style={{ ...num, fontWeight: 700, color: nw == null ? T.t4 : nw > 0 ? T.grn : nw < 0 ? T.red : T.t2 }}>{balTxt(nw)}</td>
                </>); })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Keyboard: Esc = "Wapas, theek karo"; Ctrl/Cmd+Enter = approval ke liye bhejo
  const onPvKey = (e) => {
    if (e.defaultPrevented || busy) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onBack(); }
    else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (noteOk && rows.length) onConfirm(note);
    }
  };
  return (
    <div onKeyDown={onPvKey}>
      <div style={{ position: "sticky", top: 0, zIndex: 2, padding: "11px 13px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}` }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{t("stmt.preview_title")}</div>
        <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
          {t("stmt.preview_sub", { n: rows.length, in: inr(tot.in), out: inr(tot.out) })}
        </div>
        {force && <div style={{ fontSize: 11.5, color: T.amb, marginTop: 4 }}>{t("stmt.pv_force_note")}</div>}
        <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("stmt.pv_keys")}</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("stmt.batch_note_ph")} maxLength={500} autoFocus aria-label={t("stmt.batch_note_ph")}
          style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 9, fontSize: 13, padding: "8px 11px", borderRadius: 7, border: `1.5px solid ${noteOk ? T.grnM : T.b2}`, outline: "none", fontFamily: "inherit", background: T.surface, color: T.t1 }} />
      </div>
      {(() => {
        const btns = (
          <>
            <button onClick={onBack} disabled={busy} style={{ ...footBtn("ghost", busy), marginRight: "auto" }}>{t("stmt.pv_back")}</button>
            {!noteOk && <span style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>{t("stmt.batch_note_req")}</span>}
            {rows.length > 500 && <span style={{ fontSize: 12, color: T.t3 }}>{t("stmt.split_note", { n: Math.ceil(rows.length / 500) })}</span>}
            {onDraft && (
              <button onClick={() => onDraft(note)} disabled={busy || !rows.length} style={footBtn("ghost", busy || !rows.length)}>{t("stmt.save_draft")}</button>
            )}
            <button onClick={() => onConfirm(note)} disabled={busy || !rows.length || !noteOk} title={noteOk ? "" : t("stmt.batch_note_req")}
              style={footBtn("send", busy || !rows.length || !noteOk)}>
              {busy ? t("stmt.creating") : t("stmt.send_approval", { n: rows.length })}
            </button>
          </>
        );
        return slot ? createPortal(btns, slot) : <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "9px 13px" }}>{btns}</div>;
      })()}

      <div style={{ padding: "12px 13px" }}>
        {acctName && acctClosing != null && (
          <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: T.bluL, border: `1px solid ${T.bluM}`, fontSize: 12.5, color: T.t2, display: "flex", gap: 18, flexWrap: "wrap" }}>
            <b style={{ color: T.t1 }}>{acctName}</b>
            <span>{t("stmt.pv_acc_now")}: <b>{inr(acctClosing)}</b></span>
            <span style={{ color: T.grn }}>+{inr(tot.in)}</span>
            <span style={{ color: T.red }}>−{inr(tot.out)}</span>
            <span>{t("stmt.pv_acc_after")}: <b>{inr(Number(acctClosing) + tot.in - tot.out)}</b></span>
          </div>
        )}
        <Group title={t("stmt.pv_party")} list={partyList} withBal />
        <Group title={t("stmt.pv_expense")} list={expenses} />
        <Group title={t("stmt.pv_project")} list={projList} />
        <Group title={t("stmt.pv_transfer")} list={transfers} />
        {none.n > 0 && (
          <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: T.ambL, border: `1px solid ${T.amb}55`, fontSize: 12, color: T.t2, lineHeight: 1.5 }}>
            <b style={{ color: T.amb }}>{t("stmt.pv_noparty")}: {none.n}</b>
            {" · "}{none.in ? `+${inr(none.in)} ` : ""}{none.out ? `−${inr(none.out)}` : ""}
            <div style={{ marginTop: 3 }}>{t("stmt.pv_noparty_warn", { n: none.n })}</div>
          </div>
        )}

        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: 0.4, margin: "4px 0 6px" }}>
          {t("stmt.pv_all_lines")}
        </div>
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
          {rows.map((r, i) => {
            const k = r.pick || "";
            return (
              <div key={i} style={{ padding: "7px 12px", borderTop: i ? `1px solid ${T.b1}` : "none" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: T.t3, width: 62, flexShrink: 0 }}>{dmy(r.date)}</span>
                  <span style={{ flex: 1, minWidth: 140, fontSize: 12, color: T.t2, wordBreak: "break-word" }}>{r.description || "—"}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: r.dir === "in" ? T.grn : T.red }}>
                    {r.dir === "in" ? "+" : "−"}{inr(r.amount)}
                  </span>
                </div>
                <div style={{ paddingLeft: 72, marginTop: 2, fontSize: 11.5, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {k
                    ? <span style={{ color: T.blu, fontWeight: 600 }}>→ {nameOf(k)}{k.startsWith("a:") ? ` · ${t("stmt.sub_transfer")}` : ""}</span>
                    : <span style={{ color: T.amb, fontWeight: 600 }}>→ {t("stmt.pv_noparty")}</span>}
                  {r.note && r.note.trim() && <span style={{ color: T.t3 }}>“{r.note.trim()}”</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// Project andaze ka "kyun"
function projWhy(s) {
  if (!s) return "";
  if (s.why === "narration") return t("stmt.proj_why_narration", { word: s.word || "" });
  if (s.why === "client") return t("stmt.proj_why_client");
  if (s.why === "history") return t("stmt.proj_why_history", { m: s.m, n: s.n });
  if (s.why === "history_company") return t("stmt.proj_why_history_company", { m: s.m, n: s.n });
  return "";
}

// Ek line — memo, taaki ek line ka remark likhte waqt baaki 499 dobara na banein.
// Band (ek line me saransh + "Badlo") ya khuli (sawaal + jawab ke dabbe).
const JaanchRow = React.memo(function JaanchRow({ r, i, status, upd, partyOpts, accOpts, projOpts, headOpts, books, usedKey, nameOf, projName, headName, accountId, accountName }) {
  const [moving, setMoving] = useState(false);
  const [rowErr, setRowErr] = useState("");
  const top = r.suggestions && r.suggestions[0];
  const pOpts = useMemo(() => [
    ...(r.suggestions || []).filter((s) => s.kind !== "account").map((s) => ({ key: pickKey(s), label: s.party_name, group: t("stmt.party_suggested"),
      sub: `${Math.min(100, Math.round(s.score * 100))}%` })),
    ...partyOpts,
  ], [r.suggestions, partyOpts]);
  // Kitaab ki bachi entry, isi disha ki — rakam aur tareekh me sabse paas wali upar
  const bOpts = useMemo(() => {
    if (r.kind !== "have") return [];
    const usedSet = new Set(usedKey ? usedKey.split(",") : []);
    const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 864e5) || 0;
    return books.filter((b) => b.dir === r.dir && (!usedSet.has(String(b.txn_id)) || String(b.txn_id) === String(r.haveTxn)))
      .sort((a, b) => (Math.abs(a.amount - r.amount) - Math.abs(b.amount - r.amount)) || (days(a.date, r.date) - days(b.date, r.date)))
      .slice(0, 200)
      .map((b) => ({ key: String(b.txn_id), label: `${dmy(b.date)} · ${b.party || b.description || "—"} · ${inr2(b.amount)}`,
        sub: "#" + b.txn_id + (Math.abs(b.amount - r.amount) < 0.005 ? "" : " · " + t("jz.amt_differs")) }));
  }, [r.kind, r.dir, r.amount, r.date, r.haveTxn, books, usedKey]);

  const BANK_OWN = { bank_charge: t("stmt.bank_own_charge"), bank_interest: t("stmt.bank_own_interest"), cash_withdrawal: t("stmt.bank_own_withdrawal") };
  const ST = { todo: [T.amb, T.ambL, t("jz.st_todo")], ready: [T.grn, T.grnL, t("jz.st_ready")], have: [T.blu, T.bluL, t("jz.st_have")],
    auto: [T.blu, T.bluL, t("jz.st_auto")], skip: [T.slt, T.sltL, t("jz.st_skip")], sent: [T.slt, T.sltL, t("jz.st_sent")] };
  const tag = (c, bg) => ({ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: bg, color: c, whiteSpace: "nowrap" });
  const sm = (c, fill) => ({ fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${c}`, background: fill ? c : T.surface, color: fill ? "#fff" : c, whiteSpace: "nowrap" });
  const lbl = { fontSize: 11, fontWeight: 600, color: T.t3 };

  const setKind = (k) => upd(i, { kind: k, edit: k !== "skip", touched: true, ok: false,
    pick: k === "party" && (r.pick || "").startsWith("p:") ? r.pick : k === "xfer" && (r.pick || "").startsWith("a:") ? r.pick : "",
    ...(k !== "have" ? { haveTxn: "" } : {}) });
  const kinds = r.dir === "in" ? ["party", "xfer", "bare", "have", "skip"] : ["party", "exp", "xfer", "have", "skip"];
  const kLabel = (k) => t(`jz.k_${k}${k === "party" || k === "xfer" ? "_" + r.dir : ""}`);

  // Doosre khaate me mili line — wahi purani entry is khaate par le aao
  const move = async () => {
    const e = r.elsewhere;
    if (!window.confirm(t("stmt.move_confirm", { from: e.account_name, to: accountName, amt: inr2(r.amount) }))) return;
    setMoving(true); setRowErr("");
    const x = await api.post(`/finance/accounts/${accountId}/statement/move-entry`, { txn_id: e.txn_id }).catch((er) => ({ success: false, message: er.message }));
    setMoving(false);
    if (x && x.success) upd(i, { els: { kind: "moved" } }); else setRowErr((x && x.message) || t("stmt.failed"));
  };
  const alag = () => {
    const why = (window.prompt(t("stmt.create_reason")) || "").trim();
    if (why.length < 3) return;
    upd(i, { els: { kind: "create", reason: why }, edit: true });
  };

  const locked = status === "sent";
  const pre = status === "todo" && !r.touched && !r.ok && !r.edit && !!r.pick && (r.kind === "party" || r.kind === "xfer");
  const needElse = !!r.elsewhere && !r.els;
  const closed = !r.edit && !pre && !needElse && (status === "ready" || status === "have" || status === "skip");
  const summary = () => {
    if (r.els && r.els.kind === "skip") return t("jz.sum_else_skip", { acc: r.elsewhere.account_name });
    if (r.els && r.els.kind === "moved") return t("jz.sum_else_moved");
    if (r.kind === "skip") return t("jz.sum_skip");
    if (r.kind === "have") return t("jz.sum_have", { id: r.haveTxn });
    if (r.kind === "xfer") return t("jz.sum_xfer", { acc: nameOf(r.pick) });
    const pj = projName(r.proj);
    if (r.kind === "exp") return t("jz.sum_exp", { head: headName(r.head), proj: pj });
    if (r.kind === "bare") return t("jz.sum_bare", { proj: pj });
    return t("jz.sum_party", { party: nameOf(r.pick), proj: pj });
  };

  return (
    <div style={{ padding: "10px 13px", borderBottom: `1px solid ${T.b1}`, background: locked || status === "auto" ? T.surfaceB : T.surface }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <span style={{ fontSize: 11.5, color: T.t3, width: 62, flexShrink: 0 }}>{dmy(r.date)}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.t1, wordBreak: "break-word" }}>{r.description || "—"}</span>
        {r.bank_own && <span style={tag(T.slt, T.sltL)}>{BANK_OWN[r.bank_own] || r.bank_own}</span>}
        <span style={tag(ST[status][0], ST[status][1])}>{ST[status][2]}</span>
        <b style={{ fontSize: 13, whiteSpace: "nowrap", width: 104, textAlign: "right", color: r.dir === "in" ? T.grn : T.red }}>{r.dir === "in" ? "+" : "−"}{inr2(r.amount)}</b>
      </div>

      {rowErr && <div style={{ marginTop: 6, fontSize: 12, color: T.red }}>{rowErr}</div>}

      {/* Milaan me khud judi — kitaab ki entry saamne, galat ho to todo */}
      {status === "auto" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, paddingLeft: 72, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.t3 }}>
            {t("stmt.matched_with", { id: r.auto.txn_id, party: r.auto.txn_party || "—" })}{r.auto.day_gap > 0 ? ` · ${t("stmt.gap_days", { n: r.auto.day_gap })}` : ""}
          </span>
          <button onClick={() => upd(i, { unmatched: true, edit: true })} style={{ ...sm(T.t3, false), border: "none", textDecoration: "underline", padding: "2px 4px" }}>{t("jz.unmatch")}</button>
        </div>
      )}

      {/* Doosre khaate me wahi rakam mili — pehle iska faisla */}
      {needElse && !locked && (
        <div style={{ marginTop: 8, marginLeft: 72, padding: "9px 11px", borderRadius: 7, background: T.ambL, border: `1px solid ${T.ambM}` }}>
          <div style={{ fontSize: 12, color: T.t2 }}>
            {t("jz.else_found", { acc: r.elsewhere.account_name })} <b>{r.elsewhere.party || r.elsewhere.note || r.elsewhere.type}</b>
            <span style={{ color: T.t3 }}> · {dmy(r.elsewhere.date)} · #{r.elsewhere.txn_id}{r.elsewhere.created_by_name ? " · " + t("stmt.by_whom", { name: r.elsewhere.created_by_name }) : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
            <button onClick={() => upd(i, { els: { kind: "skip" } })} style={sm(T.grn, false)}>{t("stmt.dec_skip_btn")}</button>
            <button onClick={move} disabled={!r.elsewhere.can_move || moving} title={r.elsewhere.can_move ? "" : t("stmt.move_no_access")}
              style={{ ...sm(T.blu, false), opacity: r.elsewhere.can_move ? 1 : 0.45, cursor: r.elsewhere.can_move ? "pointer" : "not-allowed" }}>{moving ? "…" : t("stmt.dec_move_btn")}</button>
            <button onClick={alag} style={sm(T.amb, false)}>{t("stmt.dec_create_btn")}</button>
          </div>
        </div>
      )}

      {/* Pakka andaza — ek click me maan lo */}
      {pre && !locked && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7, paddingLeft: 72, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.t2 }}>
            {t("jz.guess")} <b style={{ color: T.t1 }}>{nameOf(r.pick)}</b>{r.kind === "xfer" ? ` · ${t("stmt.sub_transfer")}` : ` · ${projName(r.proj)}`}
            {top ? <span style={{ color: T.t4 }}> — {whyText(top)}</span> : null}
          </span>
          <button onClick={() => upd(i, { ok: true })} style={sm(T.grn, true)}>{t("jz.yes")}</button>
          <button onClick={() => upd(i, { edit: true })} style={sm(T.t3, false)}>{t("jz.change")}</button>
        </div>
      )}

      {/* Faisla ho chuka — ek line me, badalna ho to kholo */}
      {closed && !locked && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, paddingLeft: 72, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.t2 }}>{summary()}{r.note ? <span style={{ color: T.t4 }}> · “{r.note}”</span> : null}</span>
          {!(r.els && r.els.kind === "moved") && (
            <button onClick={() => (r.els && r.els.kind === "skip" ? upd(i, { els: null }) : upd(i, { edit: true }))}
              style={{ ...sm(T.t3, false), border: "none", textDecoration: "underline", padding: "2px 4px" }}>{t("jz.change")}</button>
          )}
        </div>
      )}

      {/* Sawaal + jawab */}
      {!closed && !pre && !needElse && !locked && status !== "auto" && (
        <div style={{ marginTop: 8, paddingLeft: 72 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...lbl, marginRight: 2 }}>{t("jz.ask")}</span>
            {kinds.map((k) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={r.kind === k}
                style={{ fontSize: 12, fontWeight: r.kind === k ? 700 : 500, padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  border: `1px solid ${r.kind === k ? T.blu : T.b2}`, background: r.kind === k ? T.bluL : T.surface, color: r.kind === k ? T.blu : k === "skip" ? T.t3 : T.t2 }}>
                {kLabel(k)}
              </button>
            ))}
            {!r.kind && !r.bank_own && top && r.confidence !== "strong" && top.kind !== "account" && (
              <button onClick={() => upd(i, { kind: "party", pick: pickKey(top), edit: true, touched: true })} title={whyText(top)}
                style={{ fontSize: 11.5, padding: "4px 9px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", border: `1px dashed ${T.amb}`, background: T.surface, color: T.amb }}>
                {t("jz.maybe", { name: top.party_name })}
              </button>
            )}
          </div>

          {r.kind && r.kind !== "skip" && (
            <div style={{ display: "flex", gap: "8px 12px", flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
              {r.kind === "party" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...lbl, color: (r.pick || "").startsWith("p:") ? T.t3 : T.red }}>{t("jz.l_party")}</span>
                  <div style={{ width: 240, borderRadius: 7, boxShadow: (r.pick || "").startsWith("p:") ? "none" : `0 0 0 1.5px ${T.red}` }}>
                    <SearchSelect compact value={(r.pick || "").startsWith("p:") ? r.pick : ""} options={pOpts} theme={T}
                      onChange={(k) => upd(i, { pick: k || "", touched: true })} placeholder={t("stmt.party_search_ph")} />
                  </div>
                </div>
              )}
              {r.kind === "xfer" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...lbl, color: (r.pick || "").startsWith("a:") ? T.t3 : T.red }}>{t("jz.l_acc")}</span>
                  <div style={{ width: 240, borderRadius: 7, boxShadow: (r.pick || "").startsWith("a:") ? "none" : `0 0 0 1.5px ${T.red}` }}>
                    <SearchSelect compact value={(r.pick || "").startsWith("a:") ? r.pick : ""} options={accOpts} theme={T}
                      onChange={(k) => upd(i, { pick: k || "", touched: true })} placeholder={t("jz.acc_ph")} />
                  </div>
                </div>
              )}
              {r.kind === "exp" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...lbl, color: r.head ? T.t3 : T.red }}>{t("stmt.exp_head_label")}</span>
                  <div style={{ width: 200, borderRadius: 7, boxShadow: r.head ? "none" : `0 0 0 1.5px ${T.red}` }}>
                    <SearchSelect compact value={r.head || ""} options={headOpts} theme={T}
                      onChange={(k) => upd(i, { head: k || "", touched: true })} placeholder={t("stmt.exp_head_ph")} />
                  </div>
                </div>
              )}
              {r.kind === "have" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 360px" }}>
                  <span style={{ ...lbl, color: r.haveTxn ? T.t3 : T.red }}>{t("jz.l_have")}</span>
                  <div style={{ flex: 1, minWidth: 260, borderRadius: 7, boxShadow: r.haveTxn ? "none" : `0 0 0 1.5px ${T.red}` }}>
                    <SearchSelect compact value={r.haveTxn || ""} options={bOpts} theme={T}
                      onChange={(k) => upd(i, { haveTxn: k || "", touched: true })} placeholder={bOpts.length ? t("jz.have_ph") : t("jz.have_none")} />
                  </div>
                </div>
              )}
              {(r.kind === "party" || r.kind === "exp" || r.kind === "bare") && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={lbl}>{t("stmt.proj_label")}</span>
                  <div style={{ width: 200 }}>
                    <SearchSelect compact value={r.proj || ""} options={projOpts} theme={T}
                      onChange={(k) => upd(i, { proj: k || "", proj_touched: true, touched: true })} placeholder={t("stmt.proj_company")} />
                  </div>
                  {!r.proj_touched && r.proj_why && (
                    <span title={t("stmt.proj_why_tip")} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: T.bluL, color: T.blu, whiteSpace: "nowrap" }}>{projWhy(r.proj_why)}</span>
                  )}
                </div>
              )}
              {r.kind !== "have" && (
                <input value={r.note} maxLength={500} onChange={(e) => upd(i, { note: e.target.value })}
                  placeholder={t("stmt.remark_ph")} aria-label={t("stmt.remark_ph")}
                  style={{ flex: "1 1 200px", maxWidth: 340, height: 28, fontSize: 11.5, padding: "0 9px", border: `1px solid ${T.b1}`, borderRadius: 6, background: T.surface, color: T.t1, boxSizing: "border-box", fontFamily: "inherit" }} />
              )}
              {(status === "ready" || status === "have") && (
                <button onClick={() => upd(i, { edit: false })} style={sm(T.grn, false)}>{t("jz.done")}</button>
              )}
            </div>
          )}
          {r.kind === "have" && <div style={{ marginTop: 5, fontSize: 11, color: T.t4 }}>{t("jz.have_note")}</div>}
          {r.els && r.els.kind === "create" && <div style={{ marginTop: 5, fontSize: 11, color: T.amb }}>{t("jz.else_alag", { why: r.els.reason })}</div>}
        </div>
      )}
    </div>
  );
});

// Kitaab me hai, statement me nahi — ya doosre khaate ki entry, ya rakam / tareekh galat, ya dohri
function BookRows({ rows }) {
  if (!rows.length) return <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("stmt.nothing_here")}</div>;
  return (
    <>
      <div style={{ padding: "8px 13px", fontSize: 12, color: T.t3, borderBottom: `1px solid ${T.b1}`, lineHeight: 1.5 }}>{t("jz.extra_help")}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "9px 13px", borderBottom: i < rows.length - 1 ? `1px solid ${T.b1}` : "none", alignItems: "baseline" }}>
          <span style={{ fontSize: 11.5, color: T.t3, width: 62, flexShrink: 0 }}>{dmy(r.date)}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, color: T.t1 }}>{r.party || r.description || "—"}</span>
            <span style={{ display: "block", fontSize: 11, color: T.t4, marginTop: 1 }}>#{r.txn_id}{r.type ? " · " + r.type : ""}</span>
          </span>
          <b style={{ fontSize: 12.5, whiteSpace: "nowrap", color: r.dir === "in" ? T.grn : T.red }}>{r.dir === "in" ? "+" : "−"}{inr2(r.amount)}</b>
        </div>
      ))}
    </>
  );
}
