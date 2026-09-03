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
import React, { useState, useCallback } from "react";
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

  const onFile = useCallback(async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setErr(""); setResult(null); setBusy(true);
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
  }, []);

  const parsed = grid && hdr ? buildRows(grid, hdr) : { rows: [], skipped: 0 };

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
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFile} />
                <div style={{ fontSize: 14, fontWeight: 600, color: T.blu }}>{busy ? t("stmt.reading") : t("stmt.pick_file")}</div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 5 }}>{t("stmt.pick_file_note")}</div>
              </label>
              <div style={{ marginTop: 14, fontSize: 12, color: T.t3, lineHeight: 1.6 }}>{t("stmt.privacy_note")}</div>
            </div>
          )}

          {/* 2 — column mapping */}
          {step === 2 && hdr && (
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
              <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 7 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
                  <thead><tr>
                    {[t("stmt.c_date"), t("stmt.c_desc"), t("stmt.money_in"), t("stmt.money_out"), t("stmt.c_balance")].map((h, i) => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px", textAlign: i >= 2 ? "right" : "left", padding: "7px 10px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {parsed.rows.slice(0, 6).map((r, i) => (
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
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {tab === "stmt" && <Rows rows={d.only_in_statement} kind="stmt" />}
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
