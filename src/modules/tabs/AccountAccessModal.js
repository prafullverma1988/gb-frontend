// ════════════════════════════════════════════════════════════════
// AccountAccessModal — "Kis user ko kaun sa khaata" (sirf admin)
// ════════════════════════════════════════════════════════════════
// Ek baar ka kaam, isliye Finance ke Accounts menu se khulne wala chhota
// popup: har user ek line, har khaata ek khaana, tick = wo user us khaate ko
// chala sakta hai. List me sirf wo users jinke role par Finance → CREATE hai;
// admin ke paas hamesha saare khaate (unki line nahi banti).
// Rok server par hai (gb-backend utils/accountAccess.js).
import React, { useState, useEffect, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const roleName = (r) => String(r || "").replace(/_/g, " ");
const key = (u, a) => u + ":" + a;

export default function AccountAccessModal({ onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [on, setOn] = useState(new Set());       // "user:account"
  const [base, setBase] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/finance/accounts/access").then((r) => {
      if (!r || !r.success) { setErr((r && r.message) || t("acctaccess.load_fail")); return; }
      const s = new Set();
      r.data.accounts.forEach((a) => a.user_ids.forEach((u) => s.add(key(u, a.id))));
      setData(r.data); setOn(s); setBase(new Set(s));
    }).catch((e) => setErr(e.message));
  }, []);

  const users = useMemo(() => ((data && data.users) || []).filter((u) => !u.always), [data]);
  const admins = useMemo(() => ((data && data.users) || []).filter((u) => u.always), [data]);
  const accounts = (data && data.accounts) || [];
  const dirty = useMemo(() => on.size !== base.size || [...on].some((k) => !base.has(k)), [on, base]);

  const flip = (u, a) => { setSaved(false); setOn((p) => { const n = new Set(p); const k = key(u, a); if (n.has(k)) n.delete(k); else n.add(k); return n; }); };
  // Poori line / poora khaana ek saath
  const flipRow = (u) => { setSaved(false); setOn((p) => { const n = new Set(p); const all = accounts.every((a) => n.has(key(u, a.id))); accounts.forEach((a) => (all ? n.delete(key(u, a.id)) : n.add(key(u, a.id)))); return n; }); };
  const flipCol = (a) => { setSaved(false); setOn((p) => { const n = new Set(p); const all = users.every((u) => n.has(key(u.id, a))); users.forEach((u) => (all ? n.delete(key(u.id, a)) : n.add(key(u.id, a)))); return n; }); };

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      for (const a of accounts) {
        const now = users.filter((u) => on.has(key(u.id, a.id))).map((u) => u.id);
        const was = users.filter((u) => base.has(key(u.id, a.id))).map((u) => u.id);
        if (now.length === was.length && now.every((x) => was.includes(x))) continue;
        const r = await api.put(`/finance/accounts/${a.id}/access`, { user_ids: now });
        if (!r || !r.success) throw new Error((r && r.message) || t("acctaccess.save_fail"));
      }
      setBase(new Set(on)); setSaved(true);
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const th = { padding: "8px 10px", fontSize: 11, fontWeight: 700, color: T.t2, background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, position: "sticky", top: 0, whiteSpace: "nowrap" };
  const td = { padding: "7px 10px", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 12, width: "min(880px, 100%)", maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("acctaccess.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("acctaccess.sub")}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, color: T.t4, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {!data && !err && <div style={{ padding: 24, fontSize: 13, color: T.t4 }}>{t("common.loading")}</div>}
          {data && users.length === 0 && <div style={{ padding: 24, fontSize: 13, color: T.t3, lineHeight: 1.5 }}>{t("acctaccess.no_users")}</div>}
          {data && users.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...th, textAlign: "left", left: 0, zIndex: 2 }}>{t("acctaccess.user")}</th>
                {accounts.map((a) => (
                  <th key={a.id} style={{ ...th, textAlign: "center", cursor: "pointer" }} onClick={() => flipCol(a.id)} title={t("acctaccess.col_tip")}>
                    {a.name}
                    <div style={{ fontSize: 9.5, fontWeight: 500, color: T.t4, textTransform: "capitalize" }}>{a.type || ""}</div>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {users.map((u) => {
                  const n = accounts.filter((a) => on.has(key(u.id, a.id))).length;
                  return (
                    <tr key={u.id}>
                      <td style={{ ...td, cursor: "pointer", position: "sticky", left: 0, background: T.surface }} onClick={() => flipRow(u.id)} title={t("acctaccess.row_tip")}>
                        <div style={{ fontWeight: 600, color: T.t1 }}>{u.name}</div>
                        <div style={{ fontSize: 10.5, color: n ? T.t4 : T.amb }}>
                          <span style={{ textTransform: "capitalize" }}>{roleName(u.role)}</span> · {n ? t("acctaccess.n_khaate", { n }) : t("acctaccess.koi_khaata_nahi")}
                        </div>
                      </td>
                      {accounts.map((a) => {
                        const c = on.has(key(u.id, a.id));
                        return (
                          <td key={a.id} style={{ ...td, textAlign: "center", background: c ? T.bluL : "transparent", cursor: "pointer" }} onClick={() => flip(u.id, a.id)}>
                            <input type="checkbox" checked={c} readOnly style={{ width: 16, height: 16, cursor: "pointer", accentColor: T.blu }} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: T.t4, flex: 1, lineHeight: 1.4 }}>
            {admins.length > 0 && t("acctaccess.admins_all", { names: admins.map((a) => a.name).join(", ") })}
          </span>
          {err && <span style={{ fontSize: 12, color: T.red }}>{err}</span>}
          {saved && !dirty && <span style={{ fontSize: 12, color: T.grn, fontWeight: 600 }}>{t("acctaccess.saved")}</span>}
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b2}`, background: T.surface, color: T.t2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("acctaccess.close")}</button>
          <button onClick={save} disabled={!dirty || saving}
            style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: dirty ? T.blu : T.b2, color: "white", fontSize: 12.5, fontWeight: 700, cursor: dirty ? "pointer" : "default", fontFamily: "inherit" }}>
            {saving ? t("acctaccess.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
