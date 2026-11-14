// ════════════════════════════════════════════════════════════════
// CRM Packages — do package ka difference (14 Nov 2026, Prafull)
//
// Difference CODE nikalta hai (GET /compare — keys par, line-by-line); AI sirf
// samjhata hai ("AI se samjhao": client se baat ke points, upgrade kyun,
// WhatsApp ka message). Paisa wali line rangeen; jo line sirf ek me hai wo
// "Sirf A me" / "Sirf B me".
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import PickSelect from "../../components/PickSelect";
import { T, btn, inp, chip, card, ErrBox, Loading, Spinner } from "./pkgUi";
import { AI_TIMEOUT, BASE, copyText, inr, waUrl } from "./pkgUtil";

const cellS = { padding: "8px 9px", borderTop: "1px solid " + T.b1, verticalAlign: "top", fontSize: 12.5, lineHeight: 1.45, overflowWrap: "anywhere" };
const fmtCell = (row, v) => (v == null || v === "" ? "—" : /\.rate$/.test(row.path) && Number.isFinite(Number(v)) ? "₹" + inr(v) : String(v));

function CopyBox({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <textarea readOnly value={text} style={{ ...inp, minHeight: 110, fontSize: 13, lineHeight: 1.5, resize: "vertical" }} data-testid="cmp-wa-text" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <a href={waUrl(text)} target="_blank" rel="noopener noreferrer" style={{ ...btn("wa", false, true), textDecoration: "none", flex: "1 1 160px" }}>💬 {t("sales_pkg_ui.wa_send")}</a>
        <button type="button" onClick={async () => { const ok = await copyText(text); setCopied(ok); if (ok) setTimeout(() => setCopied(false), 2000); }}
          style={{ ...btn("plain", false, true), flex: "1 1 120px" }}>{copied ? "✓ " + t("sales_pkg_ui.copied") : "⧉ " + t("sales_pkg_ui.copy")}</button>
      </div>
    </div>
  );
}

export default function PackageCompare({ packages, initialA, initialB, onBack, onOpen }) {
  const [a, setA] = useState(String(initialA || (packages[0] && packages[0].id) || ""));
  const [b, setB] = useState(String(initialB || (packages[1] && packages[1].id) || ""));
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [priceOnly, setPriceOnly] = useState(false);
  const [ai, setAi] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  useEffect(() => {
    setData(null); setAi(null); setAiErr(""); setErr("");
    if (!a || !b || a === b) return undefined;
    let alive = true;
    setLoading(true);
    api.get(`${BASE}/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`).then((r) => {
      if (!alive) return;
      setLoading(false);
      if (r && r.success) setData(r.data); else setErr((r && r.message) || t("sales_pkg_ui.load_failed"));
    });
    return () => { alive = false; };
  }, [a, b]);

  const groups = useMemo(() => {
    const rows = ((data && data.rows) || []).filter((r) => !priceOnly || r.is_price);
    const out = [];
    const at = new Map();
    for (const r of rows) {
      const k = r.area || "—";
      if (!at.has(k)) { at.set(k, out.length); out.push({ area: k, rows: [] }); }
      out[at.get(k)].rows.push(r);
    }
    return out;
  }, [data, priceOnly]);

  const explain = async () => {
    setAiBusy(true); setAiErr("");
    const r = await api.post(`${BASE}/ai/compare`, { a: Number(a), b: Number(b) }, { timeoutMs: AI_TIMEOUT });
    setAiBusy(false);
    if (r && r.success) setAi(r.data); else setAiErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };

  const pa = data && data.a, pb = data && data.b;
  const nPrice = ((data && data.rows) || []).filter((r) => r.is_price).length;

  return (
    <div data-testid="pkg-compare">
      <button type="button" onClick={onBack} style={btn()}>← {t("sales_pkg_ui.back_list")}</button>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, margin: "10px 0 4px" }}>{t("sales_pkg_ui.compare_title")}</div>
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_pkg_ui.compare_sub")}</div>

      <div style={{ ...card, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.blu, marginBottom: 4 }}>A</div>
          <PickSelect value={a} onChange={(e) => setA(e.target.value)} style={inp}>
            {packages.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </PickSelect>
        </div>
        <button type="button" onClick={() => { setA(b); setB(a); }} aria-label={t("sales_pkg_ui.swap")} style={{ ...btn(), minWidth: 40 }}>⇄</button>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.pur, marginBottom: 4 }}>B</div>
          <PickSelect value={b} onChange={(e) => setB(e.target.value)} style={inp}>
            {packages.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </PickSelect>
        </div>
      </div>

      {a && b && a === b ? <ErrBox tone="amber">{t("sales_pkg_ui.compare_same")}</ErrBox> : null}
      <ErrBox>{err}</ErrBox>
      {loading ? <Loading /> : null}

      {data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10, marginBottom: 12 }}>
            {[[pa, "A", T.blu], [pb, "B", T.pur]].map(([p, tag, col]) => (
              <button key={tag} type="button" onClick={() => onOpen && onOpen(p.id)} style={{ ...card, textAlign: "left", cursor: "pointer", fontFamily: "inherit", borderTop: "3px solid " + col }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: col }}>{tag}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, overflowWrap: "anywhere" }}>{p.name}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: col, marginTop: 3 }}>{p.rate_full != null ? t("sales_pkg_ui.rate_per_unit", { rate: inr(p.rate_full), unit: p.unit || "sq.ft." }) : t("sales_pkg_ui.no_rate")}</div>
                {p.rate_structure != null ? <div style={{ fontSize: 12, color: T.t3 }}>{t("sales_pkg_ui.structure_only", { rate: inr(p.rate_structure) })}</div> : null}
              </button>
            ))}
          </div>

          {/* ── AI se samjhao ── */}
          <div style={{ ...card, marginBottom: 12, borderColor: "#DDD6FE" }}>
            {!ai ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px", fontSize: 12.5, color: T.t3, lineHeight: 1.45 }}>{t("sales_pkg_ui.compare_ai_intro")}</div>
                <button type="button" onClick={explain} disabled={aiBusy} style={btn("ai", aiBusy, true)}>{aiBusy ? <Spinner size={13} color={T.pur} /> : "✨"} {aiBusy ? t("sales_pkg_ui.ai_thinking") : t("sales_pkg_ui.compare_ai_btn")}</button>
              </div>
            ) : (
              <div data-testid="cmp-ai" style={{ fontSize: 13.5, color: T.t1, lineHeight: 1.55 }}>
                {(ai.talking_points || []).length ? (
                  <>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.pur, marginBottom: 3 }}>{t("sales_pkg_ui.talking_points")}</div>
                    <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>{ai.talking_points.map((x, i) => <li key={i} style={{ margin: "2px 0" }}>{x}</li>)}</ul>
                  </>
                ) : null}
                {ai.why_upgrade ? (
                  <>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.grn, marginBottom: 3 }}>{t("sales_pkg_ui.why_upgrade")}</div>
                    <div style={{ marginBottom: 10, whiteSpace: "pre-line" }}>{ai.why_upgrade}</div>
                  </>
                ) : null}
                {ai.whatsapp_text ? (
                  <>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#128C7E", marginBottom: 4 }}>{t("sales_pkg_ui.wa_text")}</div>
                    <CopyBox text={ai.whatsapp_text} />
                  </>
                ) : null}
                <div style={{ marginTop: 8 }}><button type="button" onClick={explain} disabled={aiBusy} style={btn("ai", aiBusy)}>{aiBusy ? <Spinner size={13} color={T.pur} /> : "↻"} {t("sales_pkg_ui.brief_again")}</button></div>
              </div>
            )}
            <ErrBox>{aiErr}</ErrBox>
          </div>

          {/* ── Table ── */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, flex: 1 }}>{t("sales_pkg_ui.compare_n", { n: (data.rows || []).length, p: nPrice })}</div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: T.t2, cursor: "pointer", minHeight: 34 }}>
              <input type="checkbox" checked={priceOnly} onChange={(e) => setPriceOnly(e.target.checked)} style={{ width: 18, height: 18 }} /> ₹ {t("sales_pkg_ui.price_only")}
            </label>
          </div>
          {!(data.rows || []).length ? <div style={{ ...card, fontSize: 13, color: T.t3 }}>{t("sales_pkg_ui.compare_none")}</div> : (
            <div style={{ background: T.surface, border: "1px solid " + T.b1, borderRadius: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }} data-testid="cmp-table">
                <thead>
                  <tr style={{ background: T.surfaceB }}>
                    <th style={{ ...cellS, borderTop: "none", textAlign: "left", width: "34%", fontSize: 11, color: T.t3, textTransform: "uppercase" }}>{t("sales_pkg_ui.cmp_item")}</th>
                    <th style={{ ...cellS, borderTop: "none", textAlign: "left", width: "33%", fontSize: 11, color: T.blu }}>A · {pa.name}</th>
                    <th style={{ ...cellS, borderTop: "none", textAlign: "left", width: "33%", fontSize: 11, color: T.pur }}>B · {pb.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => [
                    <tr key={"g_" + g.area}><td colSpan={3} style={{ ...cellS, background: "#eef0fa", color: "#2B3175", fontWeight: 800 }}>{g.area}</td></tr>,
                    ...g.rows.map((r, i) => (
                      <tr key={g.area + "_" + r.path + "_" + i} data-change={r.change} data-price={r.is_price ? "1" : "0"} style={{ background: r.is_price ? T.ambL : T.surface }}>
                        <td style={cellS}>
                          <div style={{ fontWeight: 700, color: T.t1 }}>{r.label}</div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                            {r.is_price ? <span style={chip(T.amb, "white")}>₹</span> : null}
                            {r.change === "only_a" ? <span style={chip(T.bluL, T.blu)}>{t("sales_pkg_ui.only_a")}</span> : null}
                            {r.change === "only_b" ? <span style={chip(T.purL, T.pur)}>{t("sales_pkg_ui.only_b")}</span> : null}
                          </div>
                        </td>
                        <td style={{ ...cellS, color: r.change === "only_b" ? T.t4 : T.t1, whiteSpace: "pre-line" }}>{fmtCell(r, r.a)}</td>
                        <td style={{ ...cellS, color: r.change === "only_a" ? T.t4 : T.t1, whiteSpace: "pre-line", fontWeight: r.change === "changed" ? 600 : 400 }}>{fmtCell(r, r.b)}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
