// Subcon Work Order — "line jodo" ke 3 picker (23 Nov 2026, Prafull):
//   estimate  : project ke estimate ki line, group (category) ke saath; qty = BOQ ka baaki
//   rate_card : Work Category ka basic rate (project ki city ka, warna default)
//   item      : material library + installation rate
// (4th tareeka "Manual" = khaali line — NewWOModal khud jodta hai.)
//
// onAdd(groups) — groups = [{ title, items:[{ description, unit, qty, rate, source,
//   work_category_id?, material_id?, estimate_item_id?, card_rate?, balance? }] }]
// Rate card se zyada rate / BOQ se zyada qty par server approval maangta hai
// (gb-backend utils/subconRates.js) — yahan sirf dikhate hain.

import React, { useState, useEffect, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { BackClose } from "../../utils/backNav";

const num = (v) => Number(v) || 0;
const r3 = (n) => Math.round(num(n) * 1000) / 1000;
const inr = (n) => "₹" + num(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const unitKey = (u) => String(u || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const inp = { width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.b2}`, fontSize: 12.5, fontFamily: "inherit", background: T.surface, color: T.t1 };
const th = { fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, padding: "6px 8px", textAlign: "left", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, position: "sticky", top: 0 };
const td = { padding: "7px 8px", fontSize: 12.5, borderBottom: `1px solid ${T.b1}`, verticalAlign: "middle" };

function CityLine({ city }) {
  if (!city) return null;
  return (
    <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}>
      {city.city_name ? t("subcon.pick_city_rate", { city: city.city_name }) : t("subcon.pick_city_none")}
    </div>
  );
}

// ── Estimate se ────────────────────────────────────────────────────────
function EstimatePick({ projectId, catRates, onAdd }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState({});      // line id → qty (string)
  const [open, setOpen] = useState({});
  useEffect(() => {
    api.get(`/subcon/wo-pick/estimate?project_id=${projectId}`)
      .then((r) => (r.success ? setData(r.data) : setErr(r.message || t("subcon.pick_load_fail"))))
      .catch(() => setErr(t("subcon.pick_load_fail")));
  }, [projectId]);
  if (err) return <div style={{ color: T.red, fontSize: 12.5, padding: 12 }}>{err}</div>;
  if (!data) return <div style={{ color: T.t4, fontSize: 12.5, padding: 12 }}>{t("common.loading")}</div>;
  if (!data.estimates.length) return <div style={{ color: T.t3, fontSize: 12.5, padding: 12 }}>{t("subcon.pick_est_none")}</div>;

  const toggle = (l) => setPick((p) => {
    const n = { ...p };
    if (n[l.id] !== undefined) delete n[l.id]; else n[l.id] = String(l.balance);
    return n;
  });
  const toggleGroup = (g) => setPick((p) => {
    const avail = g.lines.filter((l) => l.balance > 0);
    const allOn = avail.length && avail.every((l) => p[l.id] !== undefined);
    const n = { ...p };
    for (const l of avail) { if (allOn) delete n[l.id]; else n[l.id] = String(l.balance); }
    return n;
  });
  const chosen = Object.keys(pick).length;
  const add = () => {
    const groups = [];
    for (const e of data.estimates) for (const g of e.groups) {
      const items = g.lines.filter((l) => pick[l.id] !== undefined).map((l) => {
        const cr = g.work_category_id ? catRates.get(g.work_category_id) : null;
        const sameUnit = cr && unitKey(cr.unit) === unitKey(l.unit);
        return {
          description: l.name, unit: l.unit, qty: pick[l.id], rate: sameUnit && cr.rate != null ? String(cr.rate) : "",
          source: "estimate", estimate_item_id: l.id, work_category_id: g.work_category_id || null,
          card_rate: sameUnit && cr.rate != null ? cr.rate : null, balance: l.balance,
        };
      });
      if (items.length) groups.push({ title: g.name || t("subcon.pick_sec_estimate"), items });
    }
    onAdd(groups);
  };
  return (
    <>
      <CityLine city={data.city} />
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}>{t("subcon.pick_est_help")}</div>
      {data.estimates.map((e) => (
        <div key={e.id} style={{ marginBottom: 12 }}>
          {data.estimates.length > 1 && <div style={{ fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 6 }}>{e.estimate_no || ("#" + e.id)} · {e.customer_name || ""}</div>}
          {e.groups.map((g, gi) => {
            const key = e.id + ":" + gi;
            const avail = g.lines.filter((l) => l.balance > 0);
            const on = avail.filter((l) => pick[l.id] !== undefined).length;
            return (
              <div key={key} style={{ border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.surfaceB }}>
                  <input type="checkbox" checked={avail.length > 0 && on === avail.length} disabled={!avail.length}
                    onChange={() => toggleGroup(g)} aria-label={t("subcon.pick_group_all")} />
                  <button onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                    style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: T.t1, padding: 0 }}>
                    {open[key] ? "▾" : "▸"} {g.name || "—"} <span style={{ fontWeight: 400, color: T.t3 }}>· {t("subcon.pick_lines_n", { n: g.lines.length })}{on ? ` · ${t("subcon.pick_chosen_n", { n: on })}` : ""}</span>
                  </button>
                  {g.work_category_id && catRates.get(g.work_category_id)?.rate != null
                    ? <span style={{ fontSize: 11, color: T.t3 }}>{catRates.get(g.work_category_id).unit
                        ? t("subcon.pick_card_rate", { rate: inr(catRates.get(g.work_category_id).rate), unit: catRates.get(g.work_category_id).unit })
                        : t("subcon.line_card_rate", { rate: inr(catRates.get(g.work_category_id).rate) })}</span>
                    : null}
                </div>
                {open[key] && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={{ ...th, width: 28 }}></th><th style={th}>{t("subcon.pick_col_work")}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t("subcon.pick_col_boq")}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t("subcon.pick_col_given")}</th>
                      <th style={{ ...th, width: 110 }}>{t("subcon.pick_col_qty")}</th>
                    </tr></thead>
                    <tbody>
                      {g.lines.map((l) => {
                        const sel = pick[l.id] !== undefined;
                        const over = sel && num(pick[l.id]) > l.balance + 0.0005;
                        return (
                          <tr key={l.id} style={{ opacity: l.balance > 0 || sel ? 1 : 0.55 }}>
                            <td style={td}><input type="checkbox" checked={sel} onChange={() => toggle(l)} aria-label={l.name} /></td>
                            <td style={td}>
                              {l.name}
                              {l.extra ? <span style={{ marginLeft: 6, fontSize: 10.5, color: T.amb }}>{t("subcon.pick_extra")}</span> : null}
                              {l.parts_given ? <div style={{ fontSize: 10.5, color: T.t4 }}>{t("subcon.pick_parts_given")}</div> : null}
                            </td>
                            <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{r3(l.qty)} {l.unit}</td>
                            <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", color: l.given > 0 ? T.t2 : T.t4 }}>{l.given > 0 ? r3(l.given) : "—"}</td>
                            <td style={td}>
                              {sel
                                ? <input type="number" value={pick[l.id]} onChange={(ev) => setPick((p) => ({ ...p, [l.id]: ev.target.value }))} style={{ ...inp, borderColor: over ? T.amb : T.b2 }} aria-label={t("subcon.pick_col_qty")} />
                                : <span style={{ fontSize: 12, color: l.balance > 0 ? T.t3 : T.t4 }}>{l.balance > 0 ? t("subcon.pick_balance", { n: r3(l.balance) }) : t("subcon.pick_full_given")}</span>}
                              {over ? <div style={{ fontSize: 10.5, color: T.amb, marginTop: 2 }}>{t("subcon.pick_over_boq", { n: r3(l.balance) })}</div> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <PickFooter n={chosen} onAdd={add} />
    </>
  );
}

// ── Rate card se ───────────────────────────────────────────────────────
function RateCardPick({ projectId, onAdd }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState({});      // category id → qty
  useEffect(() => {
    api.get(`/subcon/wo-pick/categories?project_id=${projectId}`)
      .then((r) => (r.success ? setData(r.data) : setErr(r.message || t("subcon.pick_load_fail"))))
      .catch(() => setErr(t("subcon.pick_load_fail")));
  }, [projectId]);
  const rows = useMemo(() => (data ? data.categories.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())) : []), [data, q]);
  if (err) return <div style={{ color: T.red, fontSize: 12.5, padding: 12 }}>{err}</div>;
  if (!data) return <div style={{ color: T.t4, fontSize: 12.5, padding: 12 }}>{t("common.loading")}</div>;
  const chosen = Object.keys(pick).length;
  const add = () => {
    const groups = [];
    for (const c of data.categories) {
      if (pick[c.id] === undefined) continue;
      groups.push({ title: c.name, items: [{
        description: c.name, unit: c.unit || "", qty: pick[c.id], rate: c.rate != null ? String(c.rate) : "",
        source: "rate_card", work_category_id: c.id, card_rate: c.rate,
      }] });
    }
    onAdd(groups);
  };
  return (
    <>
      <CityLine city={data.city} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("subcon.pick_search_cat")} style={{ ...inp, marginBottom: 8 }} />
      {!data.categories.length && <div style={{ color: T.t3, fontSize: 12.5, padding: 12 }}>{t("subcon.pick_cat_none")}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th style={{ ...th, width: 28 }}></th><th style={th}>{t("subcon.pick_col_category")}</th>
          <th style={th}>{t("subcon.pick_col_unit")}</th><th style={{ ...th, textAlign: "right" }}>{t("subcon.pick_col_rate")}</th>
          <th style={{ ...th, width: 110 }}>{t("subcon.pick_col_qty")}</th>
        </tr></thead>
        <tbody>
          {rows.map((c) => {
            const sel = pick[c.id] !== undefined;
            return (
              <tr key={c.id}>
                <td style={td}><input type="checkbox" checked={sel} aria-label={c.name}
                  onChange={() => setPick((p) => { const n = { ...p }; if (sel) delete n[c.id]; else n[c.id] = ""; return n; })} /></td>
                <td style={td}>{c.name}</td>
                <td style={{ ...td, color: T.t3 }}>{c.unit || "—"}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {c.rate != null ? <>{inr(c.rate)}{c.city_specific ? <span style={{ fontSize: 10.5, color: T.t4 }}> · {t("subcon.pick_city_tag")}</span> : null}</> : <span style={{ color: T.t4 }}>{t("subcon.pick_no_rate")}</span>}
                </td>
                <td style={td}>{sel ? <input type="number" value={pick[c.id]} autoFocus onChange={(e) => setPick((p) => ({ ...p, [c.id]: e.target.value }))} style={inp} aria-label={t("subcon.pick_col_qty")} /> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <PickFooter n={chosen} onAdd={add} />
    </>
  );
}

// ── Item-wise (material + installation rate) ───────────────────────────
function ItemPick({ projectId, onAdd }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [onlySet, setOnlySet] = useState(true);
  const [pick, setPick] = useState({});      // material id → { qty, row }
  useEffect(() => {
    const h = setTimeout(() => {
      api.get(`/subcon/wo-pick/materials?project_id=${projectId}&q=${encodeURIComponent(q)}&only_set=${onlySet ? 1 : 0}&limit=60`)
        .then((r) => (r.success ? setData(r.data) : setErr(r.message || t("subcon.pick_load_fail"))))
        .catch(() => setErr(t("subcon.pick_load_fail")));
    }, 250);
    return () => clearTimeout(h);
  }, [projectId, q, onlySet]);
  if (err) return <div style={{ color: T.red, fontSize: 12.5, padding: 12 }}>{err}</div>;
  const chosen = Object.keys(pick).length;
  const add = () => {
    const items = Object.values(pick).map(({ qty, row }) => ({
      description: row.name, unit: row.unit || "", qty, rate: row.rate != null ? String(row.rate) : "",
      source: "item", material_id: row.id, card_rate: row.rate,
    }));
    if (items.length) onAdd([{ title: t("subcon.pick_sec_items"), items }]);
  };
  return (
    <>
      {data && <CityLine city={data.city} />}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("subcon.pick_search_mat")} style={{ ...inp, flex: 1 }} />
        <label style={{ fontSize: 12, color: T.t2, whiteSpace: "nowrap", display: "flex", gap: 5, alignItems: "center" }}>
          <input type="checkbox" checked={onlySet} onChange={(e) => setOnlySet(e.target.checked)} /> {t("subcon.pick_only_rated")}
        </label>
      </div>
      {!data ? <div style={{ color: T.t4, fontSize: 12.5, padding: 12 }}>{t("common.loading")}</div> : (
        <>
          {!data.materials.length && <div style={{ color: T.t3, fontSize: 12.5, padding: 12 }}>{onlySet ? t("subcon.pick_mat_none_rated") : t("subcon.pick_mat_none")}</div>}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...th, width: 28 }}></th><th style={th}>{t("subcon.pick_col_material")}</th>
              <th style={th}>{t("subcon.pick_col_unit")}</th><th style={{ ...th, textAlign: "right" }}>{t("subcon.pick_col_install")}</th>
              <th style={{ ...th, width: 110 }}>{t("subcon.pick_col_qty")}</th>
            </tr></thead>
            <tbody>
              {data.materials.map((m) => {
                const sel = !!pick[m.id];
                return (
                  <tr key={m.id}>
                    <td style={td}><input type="checkbox" checked={sel} aria-label={m.name}
                      onChange={() => setPick((p) => { const n = { ...p }; if (sel) delete n[m.id]; else n[m.id] = { qty: "", row: m }; return n; })} /></td>
                    <td style={td}>{m.name}</td>
                    <td style={{ ...td, color: T.t3 }}>{m.unit || "—"}{m.material_unit && unitKey(m.material_unit) !== unitKey(m.unit) ? <span style={{ fontSize: 10.5, color: T.t4 }}> · {t("subcon.pick_mat_unit", { unit: m.material_unit })}</span> : null}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{m.rate != null ? inr(m.rate) : <span style={{ color: T.t4 }}>{t("subcon.pick_no_rate")}</span>}</td>
                    <td style={td}>{sel ? <input type="number" value={pick[m.id].qty} autoFocus aria-label={t("subcon.pick_col_qty")}
                      onChange={(e) => setPick((p) => ({ ...p, [m.id]: { ...p[m.id], qty: e.target.value } }))} style={inp} /> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      <PickFooter n={chosen} onAdd={add} />
    </>
  );
}

function PickFooter({ n, onAdd }) {
  return (
    <div style={{ position: "sticky", bottom: 0, background: T.surface, borderTop: `1px solid ${T.b1}`, padding: "10px 0 12px", marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: T.t3 }}>{t("subcon.pick_chosen_n", { n })}</span>
      <button onClick={onAdd} disabled={!n}
        style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: n ? T.ind : T.b2, color: "white", fontSize: 12.5, fontWeight: 600, cursor: n ? "pointer" : "not-allowed" }}>
        {t("subcon.pick_add")}
      </button>
    </div>
  );
}

export default function WoLinePicker({ mode, projectId, onAdd, onClose }) {
  // Estimate ki line par rate card ka rate bhi chahiye (group = work category).
  const [catRates, setCatRates] = useState(new Map());
  useEffect(() => {
    if (mode !== "estimate") return;
    api.get(`/subcon/wo-pick/categories?project_id=${projectId}`)
      .then((r) => { if (r.success) setCatRates(new Map(r.data.categories.map((c) => [c.id, c]))); })
      .catch(() => {});
  }, [mode, projectId]);
  const title = { estimate: t("subcon.way_estimate"), rate_card: t("subcon.way_rate_card"), item: t("subcon.way_item") }[mode];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 650, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <BackClose onClose={onClose} />
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}
        style={{ background: T.surface, borderRadius: 10, width: "min(720px,94vw)", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>{title}</div>
          <button onClick={onClose} aria-label={t("common.close")} style={{ background: "none", border: "none", fontSize: 20, color: T.t3, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "12px 16px 0", overflowY: "auto", flex: 1 }}>
          {mode === "estimate" && <EstimatePick projectId={projectId} catRates={catRates} onAdd={onAdd} />}
          {mode === "rate_card" && <RateCardPick projectId={projectId} onAdd={onAdd} />}
          {mode === "item" && <ItemPick projectId={projectId} onAdd={onAdd} />}
        </div>
      </div>
    </div>
  );
}
