// ════════════════════════════════════════════════════════════════
// AccountStatement — Reports → "Khaate ka hisaab" (sirf admin)
// ════════════════════════════════════════════════════════════════
// Company ke ek khaate (bank / cash) ka poora hisaab, "kisne daali" ke saath:
// upar Shuru / Aaya / Gaya / Ant, phir har user ka jod, phir har entry.
// Jis accountant / PM ko khaata diya hai uska hisaab yahin se liya jaata hai.
// Data: GET /finance/accounts/:id/by-user (backend utils/accountLedger.js —
// wahi ledger jo Khaata Ledger dikhata hai, isliye balance kabhi alag nahi).
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PickSelect from "../../components/PickSelect";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { companyName } from "../../utils/companyName";
import { todayISO, daysAgoISO } from "../../utils/today";

const fmtRs = (n) => (Number(n) < 0 ? "-₹" : "₹") + Math.abs(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN");
const fmtDate = (d) => { if (!d) return ""; const x = new Date(d); return isNaN(x) ? String(d).slice(0, 10) : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); };
const TYPE_KEY = { receipt: "ty_receipt", payment: "ty_payment", party_payment: "ty_party_payment", site_expense: "ty_site_expense",
  wallet_topup: "ty_wallet_topup", wallet_payment: "ty_wallet_payment", bank_transfer: "ty_bank_transfer", settle_in: "ty_settle", settle_out: "ty_settle" };
const typeLabel = (ty) => (TYPE_KEY[ty] ? t("acctstmt." + TYPE_KEY[ty]) : String(ty || "").replace(/_/g, " "));
const monthRange = (off) => { const d = new Date(); const a = new Date(d.getFullYear(), d.getMonth() + off, 1); const b = new Date(d.getFullYear(), d.getMonth() + off + 1, 0);
  const iso = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); return [iso(a), iso(b)]; };

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function AccountStatement() {
  const [accounts, setAccounts] = useState(null);
  const [userNames, setUserNames] = useState({});
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState("");
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fUser, setFUser] = useState("all");
  const [fType, setFType] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/finance/accounts/access").then((r) => {
      if (!r || !r.success) { setErr((r && r.message) || t("acctstmt.load_fail")); return; }
      setAccounts(r.data.accounts);
      setUserNames(Object.fromEntries(r.data.users.map((u) => [u.id, u.name])));
      if (r.data.accounts[0]) setSel(String(r.data.accounts[0].id));
    }).catch((e) => setErr(e.message));
  }, []);

  const load = useCallback(() => {
    if (!sel) return;
    setLoading(true); setFUser("all"); setFType("all");
    api.get(`/finance/accounts/${sel}/by-user?from=${from}&to=${to}`)
      .then((r) => setD(r && r.success ? r.data : null)).catch(() => setD(null)).finally(() => setLoading(false));
  }, [sel, from, to]);
  useEffect(() => { load(); }, [load]);

  const acc = (accounts || []).find((a) => String(a.id) === sel);
  const types = useMemo(() => [...new Set(((d && d.rows) || []).map((r) => r.type))], [d]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ((d && d.rows) || []).filter((r) => {
      if (fUser !== "all" && String(r.created_by || 0) !== fUser) return false;
      if (fType !== "all" && r.type !== fType) return false;
      if (s && ![r.party, r.project, r.note, r.description, r.to_account_name, r.created_by_name, String(Math.abs(r.movement))].some((x) => String(x || "").toLowerCase().includes(s))) return false;
      return true;
    });
  }, [d, fUser, fType, q]);
  const fIn = rows.reduce((s, r) => s + Math.max(0, r.movement), 0);
  const fOut = rows.reduce((s, r) => s + Math.max(0, -r.movement), 0);
  const filtered = fUser !== "all" || fType !== "all" || q.trim() !== "";

  const exportCsv = () => downloadCSV(`Khaata_${(acc && acc.name) || sel}_${from}_${to}.csv`, [
    [companyName() + " — " + t("acctstmt.title") + " — " + ((acc && acc.name) || "")],
    [`${from} → ${to}`], [],
    [t("common.date"), t("common.type"), t("common.party"), t("common.project"), t("common.note"), t("acctstmt.col_in"), t("acctstmt.col_out"), t("acctstmt.col_balance"), t("acctstmt.col_by")],
    ...rows.map((r) => [String(r.date || "").slice(0, 10), typeLabel(r.type), r.party || r.to_account_name || "", r.project || "", r.note || r.description || "",
      r.movement > 0 ? r.movement : "", r.movement < 0 ? -r.movement : "", r.balance, r.created_by_name || ""]),
    [], ["", "", "", "", t("acctstmt.total"), fIn, fOut, "", ""],
  ]);

  if (err) return <div style={{ padding: 24, fontSize: 13, color: T.red }}>{err}</div>;
  if (!accounts) return <div style={{ padding: 24, fontSize: 13, color: T.t4 }}>{t("common.loading")}</div>;

  const sel2 = { height: 30, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, background: T.surface, fontSize: 12, color: T.t2, outline: "none", fontFamily: "inherit", cursor: "pointer" };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 10.5, color: T.t3, textTransform: "uppercase", fontWeight: 700, background: T.surfaceB, borderBottom: `1px solid ${T.b1}` };
  const td = { padding: "7px 10px", fontSize: 12, color: T.t2, borderBottom: `1px solid ${T.b1}` };
  const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const quick = (label, a, b) => <button key={label} onClick={() => { setFrom(a); setTo(b); }}
    style={{ height: 28, padding: "0 10px", borderRadius: 14, border: `1px solid ${from === a && to === b ? T.blu : T.b1}`, background: from === a && to === b ? T.bluL : T.surface, color: from === a && to === b ? T.blu : T.t3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>;
  const [m0a, m0b] = monthRange(0), [m1a, m1b] = monthRange(-1);
  const tot = (d && d.totals) || {};
  const holders = acc ? acc.user_ids.map((id) => userNames[id]).filter(Boolean) : [];

  return (
    <div>
      {/* khaata + tareekh */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <PickSelect value={sel} onChange={(e) => setSel(e.target.value)} style={{ ...sel2, minWidth: 220, fontWeight: 700, color: T.t1 }}>
          {accounts.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
        </PickSelect>
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={sel2} />
        <span style={{ color: T.t4 }}>–</span>
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={sel2} />
        {quick(t("acctstmt.q_30"), daysAgoISO(30), todayISO())}
        {quick(t("acctstmt.q_month"), m0a, m0b > todayISO() ? todayISO() : m0b)}
        {quick(t("acctstmt.q_last_month"), m1a, m1b)}
        <button onClick={exportCsv} disabled={!rows.length} style={{ ...sel2, marginLeft: "auto", fontWeight: 700, color: rows.length ? T.grn : T.t4, borderColor: rows.length ? T.grnM : T.b1 }}>{t("acctstmt.excel")}</button>
      </div>
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10 }}>
        {t("acctstmt.chalane_wale")}: <b style={{ color: T.t1 }}>{holders.length ? holders.join(", ") : t("acctstmt.sirf_admin")}</b>
      </div>

      {/* tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {[{ l: t("acctstmt.opening"), v: tot.opening, c: T.slt }, { l: t("acctstmt.col_in"), v: tot.total_in, c: T.grn },
          { l: t("acctstmt.col_out"), v: tot.total_out, c: T.red }, { l: t("acctstmt.closing"), v: tot.closing, c: Number(tot.closing) < 0 ? T.red : T.blu }].map((s, i) => (
          <div key={i} style={{ padding: "11px 14px", background: T.surface, borderRadius: 8, border: `1px solid ${T.b1}`, borderTop: `3px solid ${s.c}` }}>
            <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>{s.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.c, marginTop: 2 }}>{loading ? "…" : fmtRs(s.v)}</div>
          </div>
        ))}
      </div>

      {/* kisne kitna daala */}
      {d && d.users.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 12px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("acctstmt.kisne_kitna")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>{t("acctstmt.col_by")}</th><th style={{ ...th, textAlign: "right" }}>{t("acctstmt.entries")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("acctstmt.col_in")}</th><th style={{ ...th, textAlign: "right" }}>{t("acctstmt.col_out")}</th><th style={{ ...th, width: 90 }} /></tr></thead>
            <tbody>
              {d.users.map((u) => {
                const k = String(u.user_id || 0), on = fUser === k;
                return (
                  <tr key={k} style={{ background: on ? T.bluL : "transparent" }}>
                    <td style={{ ...td, fontWeight: 600, color: T.t1 }}>{u.name || t("acctstmt.system")}</td>
                    <td style={num}>{u.count}</td>
                    <td style={{ ...num, color: T.grn }}>{u.in ? fmtRs(u.in) : "—"}</td>
                    <td style={{ ...num, color: T.red }}>{u.out ? fmtRs(u.out) : "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button onClick={() => setFUser(on ? "all" : k)} style={{ border: "none", background: "none", color: T.blu, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {on ? t("acctstmt.sab_dikhao") : t("acctstmt.sirf_inki")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* entries */}
      <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "9px 12px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("acctstmt.entries")} · {rows.length}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("acctstmt.search")} style={{ ...sel2, cursor: "text", width: 220 }} />
          <PickSelect value={fType} onChange={(e) => setFType(e.target.value)} style={sel2}>
            <option value="all">{t("acctstmt.all_types")}</option>
            {types.map((x) => <option key={x} value={x}>{typeLabel(x)}</option>)}
          </PickSelect>
          {filtered && <button onClick={() => { setFUser("all"); setFType("all"); setQ(""); }} style={{ border: "none", background: "none", color: T.red, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("acctstmt.clear")}</button>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>{t("common.date")}</th><th style={th}>{t("common.type")}</th><th style={th}>{t("common.party")}</th><th style={th}>{t("common.note")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("acctstmt.col_in")}</th><th style={{ ...th, textAlign: "right" }}>{t("acctstmt.col_out")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("acctstmt.col_balance")}</th><th style={th}>{t("acctstmt.col_by")}</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ ...td, color: T.t4, padding: 16 }}>{t("common.loading")}</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} style={{ ...td, color: T.t4, padding: 16 }}>{t("acctstmt.koi_entry_nahi")}</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id + ":" + r.account_id + ":" + (r.movement > 0 ? "i" : "o")}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                <td style={td}>{typeLabel(r.type)}</td>
                <td style={td}><span style={{ fontWeight: 600, color: T.t1 }}>{r.party || r.to_account_name || "—"}</span>{r.project ? <span style={{ color: T.t4 }}> · {r.project}</span> : null}</td>
                <td style={{ ...td, color: T.t3, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.note || r.description || ""}>{r.note || r.description || ""}</td>
                <td style={{ ...num, color: T.grn }}>{r.movement > 0 ? fmtRs(r.movement) : ""}</td>
                <td style={{ ...num, color: T.red }}>{r.movement < 0 ? fmtRs(-r.movement) : ""}</td>
                <td style={{ ...num, fontWeight: 600, color: Number(r.balance) < 0 ? T.red : T.t1 }}>{fmtRs(r.balance)}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.created_by_name || "—"}</td>
              </tr>
            ))}
            {!loading && rows.length > 0 && (
              <tr style={{ background: T.surfaceB }}>
                <td colSpan={4} style={{ ...td, textAlign: "right", fontWeight: 700, color: T.t1 }}>{filtered ? t("acctstmt.total_filtered") : t("acctstmt.total")}</td>
                <td style={{ ...num, fontWeight: 800, color: T.grn }}>{fmtRs(fIn)}</td>
                <td style={{ ...num, fontWeight: 800, color: T.red }}>{fmtRs(fOut)}</td>
                <td style={td} /><td style={td} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
