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
import React, { useState, useCallback, useEffect } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

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
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
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
        ? num(c[hdr.map.balance]) : null,
    });
  }
  return { rows, skipped };
}

const STEPS = ["file", "map", "result"];

// Dono raaste (CSV/Excel aur PDF) ki preview ek jaisi dikhni chahiye — jo
// screen par aata hai wahi server par jaayega, chahe file kis roop me aayi ho.
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

export default function StatementImportWizard({ accounts, defaultAccountId, onClose }) {
  const [step, setStep] = useState(1);
  const [acctId, setAcctId] = useState(defaultAccountId || (accounts[0] && accounts[0].id) || "");
  const [fileName, setFileName] = useState("");
  const [grid, setGrid] = useState(null);
  const [hdr, setHdr] = useState(null);
  const [tol, setTol] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("stmt");
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
        `/finance/accounts/${acctId}/statement/parse-pdf`,
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
      const wb = isCsv
        ? XLSX.read(await f.text(), { type: "string", raw: false })
        : XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: "array", raw: false, cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const g = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true });
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
      setTab(r.data.only_in_statement.length ? "stmt" : "books");
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(980px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("stmt.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("stmt.subtitle")}</div>
          </div>
          {STEPS.map((s, i) => (
            <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
              color: step === i + 1 ? "#fff" : step > i + 1 ? T.blu : T.t4,
              background: step === i + 1 ? T.blu : step > i + 1 ? T.bluL : "transparent" }}>
              {i + 1}. {t(`stmt.step_${s}`)}
            </span>
          ))}
          <button onClick={onClose} aria-label={t("stmt.close")} style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: T.t4, cursor: "pointer", padding: "0 2px" }}>×</button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          {err && <div style={{ marginBottom: 12, padding: "9px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, fontSize: 12.5, color: T.red }}>{err}</div>}

          {/* 1 — file */}
          {step === 1 && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 5 }}>{t("stmt.which_account")}</label>
              <select value={acctId} onChange={(e) => setAcctId(e.target.value)} style={{ ...box, width: "100%", maxWidth: 400, marginBottom: 16 }}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.account_number ? ` · ${a.account_number}` : ""}</option>)}
              </select>
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
                <select value={tol} onChange={(e) => setTol(Number(e.target.value))} style={box}>
                  {[0, 1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n === 0 ? t("stmt.tol_exact") : t("stmt.tol_days", { n })}</option>)}
                </select>
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
                    <select value={hdr.map[k] >= 0 ? hdr.map[k] : ""} onChange={(e) => setCol(k, e.target.value)} style={{ ...box, width: "100%" }}>
                      <option value="">{t("stmt.col_none")}</option>
                      {hdr.headings.map((h, i) => <option key={i} value={i}>{h || `(${t("stmt.col_n", { n: i + 1 })})`}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: T.t2 }}>{t("stmt.tolerance")}</label>
                <select value={tol} onChange={(e) => setTol(Number(e.target.value))} style={box}>
                  {[0, 1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n === 0 ? t("stmt.tol_exact") : t("stmt.tol_days", { n })}</option>)}
                </select>
                <span style={{ fontSize: 11.5, color: T.t4 }}>{t("stmt.tolerance_why")}</span>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>{t("stmt.preview")}</div>
              <PreviewTable rows={parsed.rows} />
              {!parsed.rows.length && <div style={{ marginTop: 10, fontSize: 12.5, color: T.red }}>{t("stmt.no_rows")}</div>}
            </div>
          )}

          {/* 3 — milaan */}
          {step === 3 && result && <ResultView result={result} tab={tab} setTab={setTab} />}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 9, justifyContent: "flex-end", background: T.surfaceB }}>
          {step > 1 && <button onClick={() => { setStep(step - 1); setErr(""); }} style={btn("ghost")}>{t("stmt.back")}</button>}
          {step === 2 && (
            <button onClick={run} disabled={busy || !parsed.rows.length}
              style={{ ...btn("primary"), opacity: busy || !parsed.rows.length ? 0.5 : 1 }}>
              {busy ? t("stmt.matching") : t("stmt.match_now")}
            </button>
          )}
          {step === 3 && <button onClick={onClose} style={btn("primary")}>{t("stmt.done")}</button>}
        </div>
      </div>
    </div>
  );
}

// ── Milaan ka nateeja ──────────────────────────────────────────────────
function ResultView({ result, tab, setTab }) {
  const d = result;
  const bc = d.balance_check;
  const tabs = [
    { id: "stmt", label: t("stmt.tab_missing", { n: d.only_in_statement.length }), c: T.red },
    { id: "books", label: t("stmt.tab_extra", { n: d.only_in_books.length }), c: T.amb },
    { id: "ok", label: t("stmt.tab_matched", { n: d.matched.length }), c: T.grn },
  ];
  return (
    <div>
      {/* Sabse pehle wahi sawaal jiske liye ye feature hai */}
      {bc ? (
        <div style={{ padding: "14px 16px", borderRadius: 9, marginBottom: 14,
          background: bc.matches ? T.grnL : T.redL, border: `1px solid ${bc.matches ? T.grnM : T.redM}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: bc.matches ? T.grn : T.red, marginBottom: 6 }}>
            {bc.matches ? t("stmt.bal_ok") : t("stmt.bal_diff", { amt: inr2(Math.abs(bc.difference)) })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 22px", fontSize: 12.5, color: T.t2 }}>
            <span>{t("stmt.bal_as_on", { date: dmy(bc.as_on) })}</span>
            <span>{t("stmt.bal_passbook")}: <b>{inr2(bc.statement_balance)}</b></span>
            <span>{t("stmt.bal_books")}: <b>{inr2(bc.book_balance)}</b></span>
          </div>
        </div>
      ) : (
        <div style={{ padding: "11px 14px", borderRadius: 8, marginBottom: 14, background: T.ambL, border: `1px solid ${T.ambM}`, fontSize: 12.5, color: T.t2 }}>
          {t("stmt.no_balance_col")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 14 }}>
        {[
          [t("stmt.s_lines"), d.totals.statement_rows, T.slt],
          [t("stmt.s_matched"), d.totals.matched, T.grn],
          [t("stmt.s_missing"), d.totals.only_in_statement, T.red],
          [t("stmt.s_extra"), d.totals.only_in_books, T.amb],
        ].map(([l, v, c]) => (
          <div key={l} style={{ padding: "10px 13px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, borderTop: `3px solid ${c}` }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".6px" }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.t1, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)}
            style={{ fontSize: 12, fontWeight: 600, padding: "6px 13px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${tab === x.id ? x.c : T.b1}`,
              background: tab === x.id ? x.c : T.surface, color: tab === x.id ? "#fff" : T.t2 }}>
            {x.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, lineHeight: 1.6 }}>
        {tab === "stmt" && t("stmt.help_missing")}
        {tab === "books" && t("stmt.help_extra")}
        {tab === "ok" && t("stmt.help_matched", { tol: d.tolerance_days })}
      </div>

      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {tab === "stmt" && <ReviewCreate accountId={d.account.id} rows={d.only_in_statement} />}
          {tab === "books" && <Rows rows={d.only_in_books} kind="books" />}
          {tab === "ok" && <Rows rows={d.matched} kind="ok" />}
        </div>
      </div>

      {d.totals.book_rows_outside_window > 0 && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: T.t4 }}>
          {t("stmt.outside_window", { n: d.totals.book_rows_outside_window })}
        </div>
      )}
      <div style={{ marginTop: 12, padding: "10px 13px", background: T.bluL, border: `1px solid ${T.bluM}`, borderRadius: 8, fontSize: 12, color: T.t2, lineHeight: 1.6 }}>
        {t("stmt.readonly_note")}
      </div>
    </div>
  );
}

// ── "Bank me hai, kitaab me nahi" — dekho, party chuno, entry banao ─────
//
// Yahi poore feature ka akela LIKHNE wala kadam hai, aur wo teen baaton par
// khada hai:
//   1. Party ka andaza server lagata hai (utils/partySuggest) — par lagata
//      hi hai, chunta nahi. Dropdown me pehle se bhara aata hai, badal sakte
//      ho, aur "maybe" par wo peela dikhta hai taaki bina dekhe na dab jaye.
//   2. Bank ke apne charges/byaaj/ATM par party hoti hi nahi — un par
//      "bank ka apna" ka tag hai aur party dropdown khaali rehta hai.
//   3. Duplicate ke do guard server par hain. Screen unka nateeja dikhati
//      hai: "pehle se bani hai" par kuch nahi hota; "shaq hai" par ek button
//      hai "Phir bhi banao", kyunki do baar ₹1,000 ek hi din sach bhi ho
//      sakta hai — aur wo faisla aadmi ka hai, code ka nahi.
function ReviewCreate({ accountId, rows }) {
  const [parties, setParties] = useState([]);
  const [draft, setDraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [pr, sg] = await Promise.all([
          api.get("/finance/parties"),
          api.post(`/finance/accounts/${accountId}/statement/suggest`, { rows }),
        ]);
        if (dead) return;
        const plist = (pr && pr.success && Array.isArray(pr.data)) ? pr.data : [];
        const sugg = (sg && sg.success && Array.isArray(sg.data)) ? sg.data : [];
        setParties(plist);
        setDraft(rows.map((r, i) => {
          const s = sugg[i] || { suggestions: [], confidence: "none", bank_own: null };
          const top = s.suggestions[0];
          return {
            ...r, include: true, force: false, outcome: null, txn_id: null,
            bank_own: s.bank_own, confidence: s.confidence, suggestions: s.suggestions,
            // Sirf "strong" pehle se bharta hai. "maybe" dikhata hai par
            // chunta nahi — galat party par entry do ledger ek saath bigaadti hai.
            party_id: (!s.bank_own && top && s.confidence === "strong") ? String(top.party_id) : "",
          };
        }));
      } catch (e) {
        if (!dead) setErr(e.message || t("stmt.failed"));
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [accountId, rows]);

  const upd = (i, patch) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pending = draft.filter((x) => x.include && x.outcome !== "created" && x.outcome !== "already_imported");

  const create = async (onlyForce) => {
    const pick = onlyForce
      ? draft.filter((x) => x.outcome === "duplicate_suspect" && x.force)
      : pending.filter((x) => x.outcome !== "duplicate_suspect");
    if (!pick.length) return;
    setBusy(true); setErr("");
    try {
      const r = await api.post(`/finance/accounts/${accountId}/statement/create-entries`, {
        entries: pick.map((x) => ({
          date: x.date, amount: x.amount, dir: x.dir, description: x.description, ref: x.ref || null,
          party_id: x.party_id ? Number(x.party_id) : null, force: !!x.force,
        })),
      });
      if (!r || !r.success) throw new Error((r && r.message) || t("stmt.failed"));
      // Nateeja wapas usi row par — fingerprint nahi, kram se, kyunki server
      // usi kram me lauta ta hai jis kram me bheja gaya tha.
      const res = r.data.results;
      let k = 0;
      setDraft((d) => d.map((x) => {
        if (!pick.includes(x)) return x;
        const o = res[k++] || {};
        return { ...x, outcome: o.outcome || "invalid", txn_id: o.txn_id || null, existing: o.existing_description || null };
      }));
      setDone(r.data.summary);
    } catch (e) {
      setErr(e.message || t("stmt.failed"));
    } finally { setBusy(false); }
  };

  if (loading) return <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("stmt.suggest_loading")}</div>;
  if (!draft.length) return <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("stmt.nothing_here")}</div>;

  const BANK_OWN = { bank_charge: t("stmt.bank_own_charge"), bank_interest: t("stmt.bank_own_interest"), cash_withdrawal: t("stmt.bank_own_withdrawal") };
  const CONF = { strong: [T.grn, T.grnL, t("stmt.sugg_strong")], maybe: [T.amb, T.ambL, t("stmt.sugg_maybe")], weak: [T.slt, T.sltL, t("stmt.sugg_weak")] };
  const OUT = {
    created: [T.grn, T.grnL, t("stmt.out_created")], already_imported: [T.slt, T.sltL, t("stmt.out_already")],
    duplicate_suspect: [T.amb, T.ambL, t("stmt.out_dup")], invalid: [T.red, T.redL, t("stmt.out_invalid")],
  };
  const sel = { fontSize: 12, padding: "5px 8px", border: `1px solid ${T.b1}`, borderRadius: 6, background: T.surface, color: T.t1, maxWidth: 240 };
  const toCreate = pending.filter((x) => x.outcome !== "duplicate_suspect").length;
  const toForce = draft.filter((x) => x.outcome === "duplicate_suspect" && x.force).length;

  return (
    <div>
      <div style={{ padding: "9px 13px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.t2, flex: 1, minWidth: 200 }}>{t("stmt.review_help")}</span>
        {toForce > 0 && (
          <button onClick={() => create(true)} disabled={busy}
            style={{ fontSize: 12, fontWeight: 600, padding: "6px 13px", borderRadius: 6, cursor: "pointer", border: `1px solid ${T.amb}`, background: T.ambL, color: T.amb }}>
            {t("stmt.force_create_n", { n: toForce })}
          </button>
        )}
        <button onClick={() => create(false)} disabled={busy || !toCreate}
          style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 15px", borderRadius: 6, cursor: busy || !toCreate ? "default" : "pointer", border: "none", background: busy || !toCreate ? T.b2 : T.blu, color: "#fff" }}>
          {busy ? t("stmt.creating") : t("stmt.create_n", { n: toCreate })}
        </button>
      </div>
      {err && <div style={{ padding: "8px 13px", fontSize: 12, color: T.red, background: T.redL }}>{err}</div>}
      {done && (
        <div style={{ padding: "8px 13px", fontSize: 12, color: T.t2, background: T.grnL, borderBottom: `1px solid ${T.grnM}` }}>
          {t("stmt.created_done", { c: done.created, a: done.already_imported, d: done.duplicate_suspect })}
        </div>
      )}
      {draft.map((r, i) => {
        const locked = r.outcome === "created" || r.outcome === "already_imported";
        const top = r.suggestions && r.suggestions[0];
        const conf = !r.bank_own && top ? CONF[r.confidence] : null;
        return (
          <div key={i} style={{ padding: "9px 13px", borderBottom: `1px solid ${T.b1}`, opacity: r.include || locked ? 1 : 0.5, background: locked ? T.surfaceB : T.surface }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="checkbox" checked={r.include} disabled={locked} onChange={(e) => upd(i, { include: e.target.checked })} aria-label={t("stmt.include")} />
              <span style={{ fontSize: 11.5, color: T.t3, width: 62, flexShrink: 0 }}>{dmy(r.date)}</span>
              <span style={{ flex: 1, minWidth: 160, fontSize: 12.5, color: T.t1 }}>{r.description || "—"}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: r.dir === "in" ? T.grn : T.red }}>
                {r.dir === "in" ? "+" : "−"}{inr(r.amount)}
              </span>
              {r.bank_own ? (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: T.sltL, color: T.slt, whiteSpace: "nowrap" }}>{BANK_OWN[r.bank_own] || r.bank_own}</span>
              ) : (
                <select value={r.party_id} disabled={locked} onChange={(e) => upd(i, { party_id: e.target.value })} style={{ ...sel, borderColor: conf && !r.party_id && r.confidence !== "strong" ? T.amb : T.b1 }} aria-label={t("stmt.party_pick")}>
                  <option value="">{t("stmt.party_none")}</option>
                  {r.suggestions && r.suggestions.length > 0 && (
                    <optgroup label={t("stmt.party_suggested")}>
                      {/* Score 1 se upar ja sakta hai (naam + history dono
                          poore milen) — "120%" dikhana galat hai, 100 par rok do. */}
                      {r.suggestions.map((s) => <option key={"s" + s.party_id} value={s.party_id}>{s.party_name} · {Math.min(100, Math.round(s.score * 100))}%</option>)}
                    </optgroup>
                  )}
                  <optgroup label={t("stmt.party_all")}>
                    {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                </select>
              )}
              {conf && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: conf[1], color: conf[0], whiteSpace: "nowrap" }}>{conf[2]}</span>}
              {r.outcome && OUT[r.outcome] && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: OUT[r.outcome][1], color: OUT[r.outcome][0], whiteSpace: "nowrap" }}>
                  {OUT[r.outcome][2]}{r.txn_id ? ` #${r.txn_id}` : ""}
                </span>
              )}
              {r.outcome === "duplicate_suspect" && (
                <label style={{ fontSize: 11.5, color: T.amb, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={r.force} onChange={(e) => upd(i, { force: e.target.checked })} /> {t("stmt.force_create")}
                </label>
              )}
            </div>
            {(top && !r.bank_own && r.confidence !== "none") && (
              <div style={{ fontSize: 11, color: T.t4, marginTop: 3, paddingLeft: 26 }}>
                {t("stmt.why_prefix")} {top.why}{top.example ? ` — "${top.example}"` : ""}
              </div>
            )}
            {r.outcome === "duplicate_suspect" && r.existing && (
              <div style={{ fontSize: 11, color: T.amb, marginTop: 3, paddingLeft: 26 }}>{t("stmt.dup_existing", { desc: r.existing })}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Rows({ rows, kind }) {
  if (!rows.length) {
    return <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("stmt.nothing_here")}</div>;
  }
  return rows.map((r, i) => {
    const s = kind === "ok" ? r.statement : r;
    const amt = kind === "ok" ? r.statement.amount : r.amount;
    const dir = kind === "ok" ? r.statement.dir : r.dir;
    return (
      <div key={i} style={{ display: "flex", gap: 12, padding: "9px 13px", borderBottom: i < rows.length - 1 ? `1px solid ${T.b1}` : "none", alignItems: "baseline" }}>
        <span style={{ fontSize: 11.5, color: T.t3, whiteSpace: "nowrap", width: 62, flexShrink: 0 }}>{dmy(s.date)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: T.t1 }}>
            {kind === "books" ? (r.party || r.description || "—") : (s.description || "—")}
          </span>
          {kind === "ok" && (
            <span style={{ display: "block", fontSize: 11, color: T.t4, marginTop: 1 }}>
              {t("stmt.matched_with", { id: r.txn_id, party: r.txn_party || "—" })}
              {r.day_gap > 0 ? ` · ${t("stmt.gap_days", { n: r.day_gap })}` : ""}
            </span>
          )}
          {kind === "books" && r.txn_id && (
            <span style={{ display: "block", fontSize: 11, color: T.t4, marginTop: 1 }}>#{r.txn_id} · {r.type}</span>
          )}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: dir === "in" ? T.grn : T.red }}>
          {dir === "in" ? "+" : "−"}{inr(amt)}
        </span>
      </div>
    );
  });
}
