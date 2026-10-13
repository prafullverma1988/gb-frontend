// ════════════════════════════════════════════════════════════════
// TabAccountAccess — Finance → "Account Access" (sirf admin)
// ════════════════════════════════════════════════════════════════
// Company ka khaata (bank / cash) kis-kis user ko chalane ke liye diya hai,
// aur us khaate ka hisaab: kisne kitna daala + har entry ke saath "kisne".
// Rok server par hai (gb-backend utils/accountAccess.js) — yahan sirf tick.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { todayISO, daysAgoISO } from "../../utils/today";

const fmtRs = (n) => "₹" + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN");
const fmtDate = (d) => { if (!d) return ""; const x = new Date(d); return isNaN(x) ? String(d).slice(0, 10) : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); };
const roleName = (r) => String(r || "").replace(/_/g, " ");

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function TabAccountAccess() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(null);            // chuna hua khaata id
  const [draft, setDraft] = useState(null);        // Set(user ids) — save se pehle
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [hisab, setHisab] = useState(null);
  const [hLoading, setHLoading] = useState(false);
  const [fUser, setFUser] = useState("all");

  const load = useCallback(() => {
    api.get("/finance/accounts/access").then((r) => {
      if (r && r.success) { setData(r.data); setErr(null); setSel((s) => s || (r.data.accounts[0] && r.data.accounts[0].id) || null); }
      else setErr((r && r.message) || t("acctaccess.load_fail"));
    }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const acc = data && data.accounts.find((a) => a.id === sel);
  useEffect(() => { setDraft(acc ? new Set(acc.user_ids) : null); }, [sel, data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSaved(false); setErr(null); }, [sel]);

  const loadHisab = useCallback(() => {
    if (!sel) return;
    setHLoading(true); setFUser("all");
    api.get(`/finance/accounts/${sel}/by-user?from=${from}&to=${to}`)
      .then((r) => setHisab(r && r.success ? r.data : null)).catch(() => setHisab(null)).finally(() => setHLoading(false));
  }, [sel, from, to]);
  useEffect(() => { loadHisab(); }, [loadHisab]);

  const users = (data && data.users) || [];
  const dirty = useMemo(() => {
    if (!acc || !draft) return false;
    const a = new Set(acc.user_ids);
    return a.size !== draft.size || [...draft].some((x) => !a.has(x));
  }, [acc, draft]);
  const toggle = (uid) => { setSaved(false); setDraft((d) => { const n = new Set(d); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; }); };
  const save = async () => {
    setSaving(true);
    const r = await api.put(`/finance/accounts/${sel}/access`, { user_ids: [...draft] }).catch((e) => ({ success: false, message: e.message }));
    setSaving(false);
    if (r && r.success) { setSaved(true); load(); } else setErr((r && r.message) || t("acctaccess.save_fail"));
  };

  const rows = useMemo(() => {
    const all = (hisab && hisab.rows) || [];
    return fUser === "all" ? all : all.filter((r) => String(r.created_by || 0) === fUser);
  }, [hisab, fUser]);
  const exportCsv = () => {
    downloadCSV(`Account_${(acc && acc.name) || sel}_${from}_${to}.csv`, [
      [t("common.date"), t("common.type"), t("common.party"), t("common.project"), t("common.note"), t("acctaccess.col_in"), t("acctaccess.col_out"), t("acctaccess.col_balance"), t("acctaccess.col_by")],
      ...rows.map((r) => [String(r.date || "").slice(0, 10), r.type, r.party || "", r.project || "", r.note || r.description || "", r.movement > 0 ? r.movement : "", r.movement < 0 ? -r.movement : "", r.balance, r.created_by_name || ""]),
    ]);
  };

  if (err && !data) return <div style={{ padding: 24, fontSize: 13, color: T.red }}>{err}</div>;
  if (!data) return <div style={{ padding: 24, fontSize: 13, color: T.t4 }}>{t("common.loading")}</div>;

  const th = { textAlign: "left", padding: "7px 10px", fontSize: 10.5, color: T.t3, textTransform: "uppercase", fontWeight: 700, background: T.surfaceB, position: "sticky", top: 0 };
  const td = { padding: "6px 10px", fontSize: 12, color: T.t2, borderBottom: `1px solid ${T.b1}` };
  const num = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ display: "flex", gap: 12, flex: 1, overflow: "hidden" }}>
      {/* khaate */}
      <div style={{ width: 250, flexShrink: 0, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, overflowY: "auto" }}>
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("acctaccess.accounts")}</div>
        {data.accounts.map((a) => (
          <div key={a.id} onClick={() => setSel(a.id)}
            style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${T.b1}`, background: a.id === sel ? T.bluL : "transparent", borderLeft: `3px solid ${a.id === sel ? T.blu : "transparent"}` }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{a.name}</div>
            <div style={{ fontSize: 10.5, color: a.user_ids.length ? T.t4 : T.amb, marginTop: 1 }}>
              {a.user_ids.length ? t("acctaccess.n_users", { n: a.user_ids.length }) : t("acctaccess.sirf_admin")}
            </div>
          </div>
        ))}
      </div>

      {acc && draft && (
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          {/* kis-kis ko access */}
          <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, flexShrink: 0 }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("acctaccess.kis_ko", { name: acc.name })}</span>
              <span style={{ fontSize: 11, color: T.t4 }}>{t("acctaccess.hint")}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                {saved && !dirty && <span style={{ fontSize: 11.5, color: T.grn, fontWeight: 600 }}>{t("acctaccess.saved")}</span>}
                {err && <span style={{ fontSize: 11.5, color: T.red }}>{err}</span>}
                <button onClick={save} disabled={!dirty || saving}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: dirty ? T.blu : T.b2, color: "white", fontSize: 12, fontWeight: 700, cursor: dirty ? "pointer" : "default", fontFamily: "inherit" }}>
                  {saving ? t("acctaccess.saving") : t("common.save")}
                </button>
              </div>
            </div>
            <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 132, overflowY: "auto" }}>
              {users.map((u) => {
                const on = u.always || draft.has(u.id);
                return (
                  <label key={u.id} title={u.always ? t("acctaccess.admin_always") : ""}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 16, fontSize: 12,
                      border: `1px solid ${on ? T.bluM : T.b1}`, background: on ? T.bluL : T.surface, color: on ? T.blu : T.t2,
                      cursor: u.always ? "default" : "pointer", opacity: u.always ? .65 : 1 }}>
                    <input type="checkbox" checked={on} disabled={u.always} onChange={() => toggle(u.id)} style={{ margin: 0 }} />
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    <span style={{ fontSize: 10, color: T.t4, textTransform: "capitalize" }}>{roleName(u.role)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* hisaab */}
          <div style={{ flex: 1, minHeight: 0, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("acctaccess.hisaab")}</span>
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ height: 28, padding: "0 6px", borderRadius: 6, border: `1px solid ${T.b2}`, fontSize: 11.5, fontFamily: "inherit" }} />
              <span style={{ color: T.t4 }}>–</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ height: 28, padding: "0 6px", borderRadius: 6, border: `1px solid ${T.b2}`, fontSize: 11.5, fontFamily: "inherit" }} />
              {hisab && <span style={{ fontSize: 11.5, color: T.t3, marginLeft: 6 }}>
                {t("acctaccess.opening")} <b>{fmtRs(hisab.totals.opening)}</b> · {t("acctaccess.col_in")} <b style={{ color: T.grn }}>{fmtRs(hisab.totals.total_in)}</b> · {t("acctaccess.col_out")} <b style={{ color: T.red }}>{fmtRs(hisab.totals.total_out)}</b> · {t("acctaccess.closing")} <b>{fmtRs(hisab.totals.closing)}</b>
              </span>}
              <button onClick={exportCsv} disabled={!rows.length} style={{ marginLeft: "auto", height: 28, padding: "0 10px", borderRadius: 6, border: `1px solid ${T.b2}`, background: T.surface, color: T.t2, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Excel</button>
            </div>
            {hLoading && <div style={{ padding: 16, fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>}
            {!hLoading && hisab && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {/* kisne kitna daala */}
                <div style={{ padding: "10px 14px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: `1px solid ${T.b1}` }}>
                  <UserChip on={fUser === "all"} onClick={() => setFUser("all")} name={t("acctaccess.sab")} sub={t("acctaccess.n_entries", { n: hisab.rows.length })} />
                  {hisab.users.map((u) => (
                    <UserChip key={u.user_id || 0} on={fUser === String(u.user_id || 0)} onClick={() => setFUser(String(u.user_id || 0))}
                      name={u.name || t("acctaccess.system")} sub={t("acctaccess.n_entries", { n: u.count })} inn={u.in} out={u.out} />
                  ))}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={th}>{t("common.date")}</th><th style={th}>{t("common.type")}</th><th style={th}>{t("common.party")}</th>
                    <th style={th}>{t("common.note")}</th><th style={{ ...th, textAlign: "right" }}>{t("acctaccess.col_in")}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t("acctaccess.col_out")}</th><th style={{ ...th, textAlign: "right" }}>{t("acctaccess.col_balance")}</th>
                    <th style={th}>{t("acctaccess.col_by")}</th>
                  </tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={8} style={{ ...td, color: T.t4, padding: 16 }}>{t("acctaccess.koi_entry_nahi")}</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id + ":" + r.account_id + ":" + (r.movement > 0 ? "i" : "o")}>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                        <td style={td}>{String(r.type || "").replace(/_/g, " ")}</td>
                        <td style={td}>{r.party || r.to_account_name || "—"}{r.project ? <span style={{ color: T.t4 }}> · {r.project}</span> : null}</td>
                        <td style={{ ...td, color: T.t3, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.note || r.description || ""}</td>
                        <td style={{ ...num, color: T.grn }}>{r.movement > 0 ? fmtRs(r.movement) : ""}</td>
                        <td style={{ ...num, color: T.red }}>{r.movement < 0 ? fmtRs(-r.movement) : ""}</td>
                        <td style={{ ...num, fontWeight: 600, color: T.t1 }}>{fmtRs(r.balance)}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{r.created_by_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserChip({ on, onClick, name, sub, inn, out }) {
  return (
    <div onClick={onClick} style={{ padding: "6px 11px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? T.blu : T.b1}`, background: on ? T.bluL : T.surface, minWidth: 110 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: on ? T.blu : T.t1 }}>{name}</div>
      <div style={{ fontSize: 10.5, color: T.t4 }}>{sub}</div>
      {inn != null && <div style={{ fontSize: 10.5, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: T.grn }}>+{fmtRs(inn)}</span> <span style={{ color: T.red }}>−{fmtRs(out)}</span>
      </div>}
    </div>
  );
}
