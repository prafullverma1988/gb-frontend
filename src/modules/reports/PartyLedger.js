import React, { useState, useEffect, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { companyName } from "../../utils/companyName";
import { downloadLedgerExcel, downloadLedgerPdf, fromApiRow, statusText } from "../../utils/partyLedgerDownload";
import { can, canAny } from "../../utils/perms";

// ── Reports → Party Ledger ──────────────────────────────────────
// Kisi bhi party ka statement file me — party dhoondho, tareekh do, Excel ya
// PDF. Ledger screen par dekhna ho to wo Finance → Parties me hai; yahan uski
// doosri copy jaan-boojh kar nahi banayi, sirf download. Dono jagah ki file
// ek hi util se banti hai (utils/partyLedgerDownload), to Finance aur yahan ki
// file me kabhi farak nahi aata.
//
// Tab sirf unhe dikhta hai jinke paas Finance view hai (ReportsModule) — server
// ka ledger aur ledger.pdf bhi wahi rok lagate hain.

const inp = { height: 32, padding: "0 9px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: T.surface };
const btn = (c, bg, br) => ({ height: 32, padding: "0 14px", borderRadius: 7, border: `1px solid ${br}`, background: bg, color: c, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const money = (v) => "₹" + Math.abs(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PartyLedger() {
  const [parties, setParties] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let off = false;
    api.get("/finance/parties")
      .then((r) => { if (!off) setParties(r && r.success && Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!off) { setParties([]); setLoadErr(t("reports.pl_load_failed")); } });
    return () => { off = true; };
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = (parties || []).filter((p) => !s || String(p.name || "").toLowerCase().includes(s));
    return list.slice(0, 60);
  }, [parties, q]);

  const party = sel && {
    id: sel.id, name: sel.name, type: sel.type,
    opening_balance: parseFloat(sel.opening_balance) || 0,
  };
  const bal = sel ? parseFloat(sel.live_balance) || 0 : 0;

  const run = async (kind) => {
    if (!party || busy) return;
    setBusy(kind);
    try {
      const range = { from: from || null, to: to || null };
      if (kind === "pdf") await downloadLedgerPdf({ party, ...range });
      else {
        const r = await api.get(`/finance/parties/${party.id}/ledger`);
        if (!r || !r.success || !Array.isArray(r.data)) throw new Error((r && r.message) || t("finance.ledger_dl_failed"));
        await downloadLedgerExcel({ party, rows: r.data.map(fromApiRow), ...range, company: companyName() });
      }
    } catch (e) {
      window.alert((e && e.message) || t("finance.ledger_dl_failed"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 320px", maxWidth: 440, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("reports.pl_search")} style={{ ...inp, width: "100%", marginBottom: 8 }} />
        {parties === null && <div style={{ fontSize: 12, color: T.t4, padding: 8 }}>{t("reports.pl_loading")}</div>}
        {loadErr && <div style={{ fontSize: 12, color: T.red, padding: 8 }}>{loadErr}</div>}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {shown.map((p) => {
            const b = parseFloat(p.live_balance) || 0;
            const on = sel && sel.id === p.id;
            return (
              <div key={p.id} onClick={() => setSel(p)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", background: on ? T.bluL : "none", border: `1px solid ${on ? T.bluM : "transparent"}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{p.type}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{money(b)}</div>
                  <div style={{ fontSize: 10, color: T.t4 }}>{statusText(p.type, b)}</div>
                </div>
              </div>
            );
          })}
          {parties && !shown.length && !loadErr && <div style={{ fontSize: 12, color: T.t4, padding: 8 }}>{t("reports.pl_no_match")}</div>}
        </div>
      </div>

      <div style={{ flex: "1 1 320px", background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: 14 }}>
        {!sel && <div style={{ fontSize: 12.5, color: T.t3 }}>{t("reports.pl_pick_party")}</div>}
        {sel && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{sel.type} · {money(bal)} · {statusText(sel.type, bal)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <label style={{ fontSize: 11.5, color: T.t3 }}>{t("reports.pl_from")}</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
              <label style={{ fontSize: 11.5, color: T.t3 }}>{t("reports.pl_to")}</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
            </div>
            {/* Statement = EXPORT (5 Oct 2026): Reports EXPORT + server ka Party YA
                Finance EXPORT (GET /finance/parties/:id/ledger.pdf). Na ho to batao kyon. */}
            {can("Reports", "export") && canAny(["Party", "Finance"], "export") ? (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => run("excel")} disabled={!!busy} style={btn(T.grn, T.grnL, T.grnM)}>
                {busy === "excel" ? t("finance.ledger_dl_working") : t("finance.ledger_dl_excel")}
              </button>
              <button onClick={() => run("pdf")} disabled={!!busy} style={btn(T.red, T.redL, T.redM)}>
                {busy === "pdf" ? t("finance.ledger_dl_working") : t("finance.ledger_dl_pdf")}
              </button>
            </div>
            ) : (
              <div style={{ fontSize: 12, color: T.t3, marginTop: 14 }}>{t("reports.pl_no_export")}</div>
            )}
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 12, lineHeight: 1.5 }}>{t("reports.pl_hint")}</div>
          </>
        )}
      </div>
    </div>
  );
}
