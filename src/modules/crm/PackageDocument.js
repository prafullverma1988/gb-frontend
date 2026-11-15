// ════════════════════════════════════════════════════════════════
// CRM Packages — package sheet web par, PDF jaisa (14 Nov 2026, Prafull)
//
// Shakl gb-backend utils/salesPackageDoc.js (renderHtml) ki nakal: letterhead,
// title, "Package at a Glance", 1. RATE SCHEDULE (group row, package row par
// scope ka rate), 2. / 2.1 hisse, kv table, group wali table, bullets, note,
// ACCEPTANCE. Wahan badlo to yahan bhi.
//
// editable = Admin ka haath ka edit: har line tap → onEdit(path), har list ke
// neeche "+ add karo" → onAdd(containerPath). Path server wale hi hain.
// Phone (375px) par page bahar nahi khisakta — table apne box me scroll.
// ════════════════════════════════════════════════════════════════
import { useMemo } from "react";
import { t } from "../../i18n";
import { T } from "../shared/tokens";
import { DOC_EN, docTokens, fillTokens, inr, scopeRate } from "./pkgUtil";

const isAccent = (s) => /^#[0-9a-f]{6}$/i.test(s || "");

function styles(A) {
  const cell = { border: "1px solid #c9cde6", padding: "6px 8px", verticalAlign: "top", textAlign: "left" };
  return {
    doc: { fontFamily: 'Georgia,"Noto Serif","DejaVu Serif","Times New Roman",serif', color: "#1d1f2b", fontSize: 14.5, lineHeight: 1.45,
      background: "#fff", maxWidth: 860, margin: "0 auto", padding: "16px 14px 28px", boxSizing: "border-box", overflowWrap: "anywhere" },
    lh: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: "3px double " + A },
    logo: { maxHeight: 60, maxWidth: "40%", objectFit: "contain" },
    co: { textAlign: "right", flex: 1, minWidth: 0 },
    nm: { fontSize: 21, fontWeight: 700, color: A },
    ad: { fontSize: 12.5, color: "#4a4f63" },
    h1: { fontSize: "clamp(15px, 4.4vw, 19px)", letterSpacing: ".14em", color: A, textAlign: "center", margin: "18px 0 2px", fontWeight: 700 },
    sub: { textAlign: "center", fontStyle: "italic", color: "#5b6074", fontSize: 15.5, marginBottom: 10 },
    scroll: { overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" },
    table: { borderCollapse: "collapse", width: "100%" },
    td: cell,
    th: { ...cell, background: A, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" },
    num: { ...cell, textAlign: "right", whiteSpace: "nowrap" },
    lab: { ...cell, color: A, fontWeight: 700, whiteSpace: "nowrap" },
    blank: { color: "#9aa0b4", whiteSpace: "nowrap" },
    grp: { ...cell, background: "#eef0fa", color: A, fontWeight: 700 },
    tot: { ...cell, fontWeight: 700, background: "#eef0fa" },
    h2: { fontSize: 17.5, letterSpacing: ".06em", color: A, borderBottom: "2px solid " + A, paddingBottom: 3, margin: "26px 0 8px", fontWeight: 700 },
    h3: { fontSize: 15.5, color: A, margin: "16px 0 5px", fontWeight: 700 },
    note: { borderLeft: "4px solid " + A, background: "#f2f3fa", padding: "5px 9px", margin: "6px 0" },
    ul: { margin: "4px 0 4px 18px", padding: 0 },
    li: { margin: "2px 0" },
    sign: { display: "flex", flexWrap: "wrap", gap: 28, marginTop: 40 },
    signBox: { flex: "1 1 200px", borderTop: "2px solid " + A, paddingTop: 6 },
    pre: { whiteSpace: "pre-line" },
  };
}

// Edit mode me tap hone wali cheez
const TAP = { cursor: "pointer", background: "rgba(37,99,235,.045)", outline: "1px dashed rgba(37,99,235,.4)", outlineOffset: -2 };
function tapProps(editable, onEdit, path) {
  if (!editable || !onEdit) return {};
  return {
    role: "button", tabIndex: 0, "data-path": path,
    onClick: (e) => { e.stopPropagation(); onEdit(path); },
    onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(path); } },
  };
}

function AddBtn({ onClick, label, inTable, colSpan }) {
  const b = (
    <button type="button" onClick={onClick}
      style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 12, fontWeight: 700, color: T.blu, background: T.bluL, border: "1px dashed " + T.bluM,
        borderRadius: 7, padding: "6px 10px", cursor: "pointer", margin: inTable ? 0 : "4px 0", minHeight: 32 }}>
      + {label}
    </button>
  );
  if (inTable) return <tr><td colSpan={colSpan} style={{ padding: "5px 6px", border: "1px solid #c9cde6", background: "#fafbff" }}>{b}</td></tr>;
  return <div>{b}</div>;
}

function EditTag({ onClick, label }) {
  return (
    <button type="button" onClick={onClick}
      style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 11, fontWeight: 700, color: T.t3, background: T.surfaceB, border: "1px solid " + T.b1,
        borderRadius: 6, padding: "3px 8px", cursor: "pointer", marginLeft: 6, verticalAlign: "middle" }}>
      ✎ {label}
    </button>
  );
}

// fill (Round 2, client quote): { header:{quotation_no,date,client_name,contact,site_address,
// plot_area,builtup_area}, scope, computed } — server ke renderHtml fill jaisa: header bhare,
// rate line par rate / qty / amount, TOTAL, aur PAYMENT SCHEDULE hissa. Number sirf computed se.
export default function PackageDocument({ content, letterhead, editable = false, onEdit, onAdd, fill }) {
  const lh = letterhead || {};
  const A = isAccent(lh.accent) ? lh.accent : "#2B3175";
  const S = useMemo(() => styles(A), [A]);
  if (!content || !content.meta) return null;
  const tok = docTokens(content, lh);
  const f = (s) => fillTokens(s, tok);
  const tp = (path) => tapProps(editable, onEdit, path);
  const tapS = (base) => (editable ? { ...base, ...TAP } : base);
  const add = (container, label) => (editable && onAdd ? <AddBtn onClick={() => onAdd(container)} label={label} /> : null);

  const meta = content.meta;
  const full = scopeRate(content, "full");
  const st = (content.scopes || []).find((s) => s.key === "structure");
  const F = fill || null;
  const pkgRate = F ? scopeRate(content, F.scope || "full") : full;
  const C = F && F.computed ? F.computed : null;
  const byKey = C ? Object.fromEntries((C.rows || []).map((x) => [x.key, x])) : {};
  const fsc = F && F.scope && F.scope !== "full" ? (content.scopes || []).find((x) => x.key === F.scope) : null;
  const H = (F && F.header) || {};
  const rs = content.rate_schedule || { groups: [], notes: [], basis: [] };
  const addresses = Array.isArray(lh.address_lines) ? lh.address_lines : String(lh.address_lines || "").split("\n").filter(Boolean);
  const contactLine = [lh.phones ? DOC_EN.mob + " " + lh.phones : "", lh.email || "", lh.gstin ? DOC_EN.gstin + " " + lh.gstin : ""].filter(Boolean).join("  |  ");
  const blank = (suffix) => <span style={S.blank}>_______________{suffix ? " " + suffix : ""}</span>;
  const dmy = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v).split("-").reverse().join("-") : v);
  const hv = (v, suffix) => (v ? <>{dmy(v)}{suffix ? " " + suffix : ""}</> : blank(suffix));

  let secNo = 0;
  const out = [];

  // ── 1. Rate schedule ──
  if (rs.groups.length || editable) {
    secNo = rs.groups.length ? secNo + 1 : secNo;
    const no = secNo;
    let sn = 0;
    out.push(
      <div key="rs" data-sec="rate">
        <div style={S.h2}>{rs.groups.length ? no + ". " : ""}{DOC_EN.rate_schedule}</div>
        {rs.groups.length ? (
          <div style={S.scroll}>
            <table style={{ ...S.table, minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: "6%" }}>{DOC_EN.sno}</th>
                  <th style={S.th}>{DOC_EN.description}</th>
                  <th style={{ ...S.th, width: "12%" }}>{DOC_EN.unit}</th>
                  <th style={{ ...S.th, textAlign: "right", width: "11%" }}>{DOC_EN.rate}</th>
                  <th style={{ ...S.th, textAlign: "right", width: "9%" }}>{DOC_EN.qty}</th>
                  <th style={{ ...S.th, textAlign: "right", width: "14%" }}>{DOC_EN.amount}</th>
                </tr>
              </thead>
              <tbody>
                {rs.groups.map((g) => [
                  (g.title || editable) ? (
                    <tr key={g.key + "_h"} {...tp("rate." + g.key)} style={editable ? { cursor: "pointer" } : undefined}>
                      <td colSpan={6} style={tapS(S.grp)}>{g.title || <span style={S.blank}>{t("sales_pkg_ui.group_no_title")}</span>}</td>
                    </tr>
                  ) : null,
                  ...g.rows.map((r) => {
                    sn++;
                    const q = byKey[g.key + "." + r.key] || null;
                    const rate = q ? q.rate : r.kind === "package" ? pkgRate : r.rate;
                    return (
                      <tr key={g.key + "." + r.key} {...tp("rate." + g.key + "." + r.key)} style={editable ? { cursor: "pointer" } : undefined}>
                        <td style={tapS(S.td)}>{sn}</td>
                        <td style={tapS(S.td)}>{q ? q.description : r.description}
                          {editable && r.kind !== "rate" ? <span style={{ marginLeft: 6, fontFamily: "'Segoe UI',sans-serif", fontSize: 10, fontWeight: 700, color: T.pur, background: T.purL, borderRadius: 999, padding: "1px 6px", whiteSpace: "nowrap" }}>
                            {r.kind === "package" ? t("sales_pkg_ui.kind_package") : t("sales_pkg_ui.kind_lump_sum")}</span> : null}
                        </td>
                        <td style={tapS(S.td)}>{r.unit}</td>
                        <td style={tapS(S.num)}>{rate != null ? inr(rate) : "______"}</td>
                        <td style={tapS(S.num)}>{q && q.qty != null && r.kind !== "lump_sum" ? inr(q.qty) : null}</td>
                        <td style={tapS(S.num)}>{q && q.amount != null ? inr(q.amount) : null}</td>
                      </tr>
                    );
                  }),
                  editable && onAdd ? <AddBtn key={g.key + "_add"} inTable colSpan={6} onClick={() => onAdd("rate." + g.key)} label={t("sales_pkg_ui.add_rate_row")} /> : null,
                ])}
                <tr><td style={S.tot} /><td style={S.tot}>{DOC_EN.total}</td><td style={S.tot} /><td style={S.tot} /><td style={S.tot} />
                  <td style={{ ...S.tot, textAlign: "right", whiteSpace: "nowrap" }} data-doc-total="1">{C && C.total ? inr(C.total) : null}</td></tr>
              </tbody>
            </table>
          </div>
        ) : null}
        {add("rate", t("sales_pkg_ui.add_rate_group"))}
        {rs.groups.length ? (
          <>
            {rs.notes.map((n) => (
              <div key={n.key} {...tp("rate_notes." + n.key)} style={tapS({ ...S.note, ...S.pre })}><b>{DOC_EN.note}</b> {f(n.text)}</div>
            ))}
            {add("rate_notes", t("sales_pkg_ui.add_note"))}
            {(rs.basis.length || editable) ? (
              <>
                <div {...tp("basis_title")} style={tapS(S.h3)}>{rs.basis_title}</div>
                <ul style={S.ul}>
                  {rs.basis.map((b) => <li key={b.key} {...tp("rate_basis." + b.key)} style={tapS({ ...S.li, ...S.pre })}>{f(b.text)}</li>)}
                </ul>
                {add("rate_basis", t("sales_pkg_ui.add_point"))}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  // ── Payment schedule (sirf quote) — har amount wali line ke hisse; bina hisse = "On completion" ──
  const SR = C ? (C.rows || []).filter((x) => x.amount) : [];
  if (SR.length && SR.some((x) => x.schedule && x.schedule.length)) {
    secNo++;
    let n = 0, tot = 0;
    const trs = [];
    for (const x of SR) {
      trs.push(
        <tr key={x.key + "_h"}>
          <td colSpan={3} style={S.grp}>{x.description}{x.qty != null && x.kind !== "lump_sum" ? " — " + inr(x.qty) + " " + String(x.unit || "").replace(/^per\s+/i, "") : ""}</td>
          <td style={{ ...S.grp, textAlign: "right", whiteSpace: "nowrap" }}>{inr(x.amount)}</td>
        </tr>
      );
      let lastGroup = null;
      const parts = x.schedule && x.schedule.length ? x.schedule : [{ name: DOC_EN.on_completion, pct: 100, group: null, amount: x.amount }];
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        n++; tot += Number(p.amount) || 0;
        const grp = p.group && p.group !== lastGroup ? <i style={{ color: "#6b7088" }}>{p.group}: </i> : null;
        lastGroup = p.group || lastGroup;
        trs.push(
          <tr key={x.key + "_" + i}>
            <td style={S.td}>{n}</td><td style={S.td}>{grp}{p.name}</td>
            <td style={S.num}>{inr(p.pct)}%</td><td style={S.num}>{inr(p.amount)}</td>
          </tr>
        );
      }
    }
    const no = secNo;
    out.push(
      <div key="ps" data-sec="payment_schedule">
        <div style={S.h2}>{no}. {DOC_EN.payment_schedule}</div>
        <div style={S.scroll}>
          <table style={{ ...S.table, minWidth: 460 }}>
            <thead><tr>
              <th style={{ ...S.th, width: "6%" }}>{DOC_EN.sno}</th><th style={S.th}>{DOC_EN.stage_of_work}</th>
              <th style={{ ...S.th, textAlign: "right", width: "10%" }}>{DOC_EN.pct}</th><th style={{ ...S.th, textAlign: "right", width: "16%" }}>{DOC_EN.amount}</th>
            </tr></thead>
            <tbody>
              {trs}
              <tr><td style={S.tot} /><td style={S.tot}>{DOC_EN.total_plain}</td><td style={S.tot} /><td style={{ ...S.tot, textAlign: "right", whiteSpace: "nowrap" }}>{inr(tot)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={S.note}><b>{DOC_EN.note}</b> {DOC_EN.ps_note}</div>
      </div>
    );
  }

  // ── Baaki hisse ──
  for (const s of content.sections || []) {
    secNo++;
    const no = secNo;
    let sub = 0;
    const isTerms = /TERMS/i.test(s.title);
    out.push(
      <div key={"sec_" + s.key} data-sec={s.key}>
        <div {...tp("sec." + s.key)} style={tapS(S.h2)}>{no}. {s.title}</div>
        {s.blocks.map((b) => {
          const bp = "sec." + s.key + "." + b.key;
          let head = null;
          if (b.heading) { sub++; head = <div {...tp(bp)} style={tapS(S.h3)}>{no}.{sub}{"  "}{b.heading}</div>; }
          else if (editable && ["kv", "table", "bullets"].includes(b.type)) head = <div style={{ margin: "8px 0 2px" }}><EditTag onClick={() => onEdit(bp)} label={t("sales_pkg_ui.block_tag")} /></div>;
          let body = null;
          if (b.type === "kv") {
            if (isTerms && !b.heading) {
              body = (
                <ol style={S.ul}>
                  {b.rows.map((r) => <li key={r.key} {...tp(bp + "." + r.key)} style={tapS({ margin: "3px 0", ...S.pre })}><b style={{ color: A }}>{r.label}:</b> {f(r.value)}</li>)}
                </ol>
              );
            } else {
              body = (
                <div style={S.scroll}>
                  <table style={S.table}><tbody>
                    {b.rows.map((r) => (
                      <tr key={r.key} {...tp(bp + "." + r.key)} style={editable ? { cursor: "pointer" } : undefined}>
                        <td style={tapS({ ...S.td, fontWeight: 700, width: "28%" })}>{r.label}</td>
                        <td style={tapS({ ...S.td, ...S.pre })}>{f(r.value)}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              );
            }
            body = <>{body}{add(bp, t("sales_pkg_ui.add_row"))}</>;
          } else if (b.type === "table") {
            const cols = b.columns || [];
            let lastGroup = null;
            body = (
              <div style={S.scroll}>
                <table style={{ ...S.table, minWidth: Math.max(320, cols.length * 140) }}>
                  <thead><tr>{cols.map((c) => <th key={c.key} style={c.align === "right" ? { ...S.th, textAlign: "right" } : S.th}>{c.label}</th>)}</tr></thead>
                  <tbody>
                    {b.rows.map((r) => {
                      const rows = [];
                      if (r.group && r.group !== lastGroup) { rows.push(<tr key={r.key + "_g"}><td colSpan={cols.length} style={S.grp}>{r.group}</td></tr>); lastGroup = r.group; }
                      rows.push(
                        <tr key={r.key} {...tp(bp + "." + r.key)} style={editable ? { cursor: "pointer" } : undefined}>
                          {cols.map((c) => <td key={c.key} style={tapS(c.align === "right" ? { ...S.num, whiteSpace: "pre-line" } : { ...S.td, ...S.pre })}>{f(r.cells && r.cells[c.key])}</td>)}
                        </tr>
                      );
                      return rows;
                    })}
                    {editable && onAdd ? <AddBtn inTable colSpan={cols.length || 1} onClick={() => onAdd(bp)} label={t("sales_pkg_ui.add_row")} /> : null}
                  </tbody>
                </table>
              </div>
            );
          } else if (b.type === "bullets") {
            body = (
              <>
                <ul style={S.ul}>{b.items.map((i) => <li key={i.key} {...tp(bp + "." + i.key)} style={tapS({ ...S.li, ...S.pre })}>{f(i.text)}</li>)}</ul>
                {add(bp, t("sales_pkg_ui.add_point"))}
              </>
            );
          } else if (b.type === "note") {
            body = <div {...tp(bp)} style={tapS({ ...S.note, ...S.pre })}><b>{DOC_EN.note}</b> {f(b.text)}</div>;
          } else {
            body = <p {...tp(bp)} style={tapS({ margin: "6px 0", ...S.pre })}>{f(b.text)}</p>;
          }
          return <div key={b.key} data-block={b.key}>{head}{body}</div>;
        })}
        {add("sec." + s.key, t("sales_pkg_ui.add_block"))}
      </div>
    );
  }
  if (editable && onAdd) out.push(<div key="add_sec" style={{ marginTop: 14 }}>{add("sec", t("sales_pkg_ui.add_section"))}</div>);

  // ── Acceptance ──
  secNo++;
  const acc = content.acceptance || {};
  out.push(
    <div key="acc" {...tp("acceptance")} style={editable ? { ...TAP, padding: 4 } : undefined}>
      <div style={S.h2}>{secNo}. {DOC_EN.acceptance}</div>
      <p style={{ margin: "6px 0", ...S.pre }}>{f(acc.text)}</p>
      <div style={S.sign}>
        <div style={S.signBox}><b style={{ color: A }}>{f(acc.client_label)}</b><br />{DOC_EN.sign_name}<br />{DOC_EN.sign_date}<br />{DOC_EN.sign_place}</div>
        <div style={S.signBox}><b style={{ color: A }}>{f(acc.company_label)}</b><br />{DOC_EN.signatory}<br />{DOC_EN.sign_date}<br />{DOC_EN.seal}</div>
      </div>
    </div>
  );

  return (
    <div style={S.doc} data-testid="pkg-doc">
      {/* Letterhead — Letterhead settings se (PDF jaisa) */}
      <div style={S.lh}>
        {lh.logo_url ? <img src={lh.logo_url} alt="" style={S.logo} /> : <div />}
        <div style={S.co}>
          <div style={S.nm}>{lh.display_name}</div>
          {addresses.map((l, i) => <div key={i} style={S.ad}>{l}</div>)}
          {contactLine ? <div style={S.ad}>{contactLine}</div> : null}
        </div>
      </div>
      <div {...tp("meta")} style={tapS(S.h1)}>{f(meta.doc_title)}</div>
      <div {...tp("scopes")} style={tapS(S.sub)}>
        {meta.package_name} {DOC_EN.pkg_word}{full != null ? "  |  ₹" + inr(full) + " " + DOC_EN.per_sqft : ""}
        {meta.show_structure_rate && st && st.rate != null ? "  ·  " + st.label + ": ₹" + inr(st.rate) + " " + DOC_EN.per_sqft : ""}
      </div>
      {fsc ? <div style={{ ...S.sub, fontStyle: "normal", fontWeight: 700, color: A }}>{DOC_EN.scope_word} {fsc.label}{fsc.rate != null ? " — ₹" + inr(fsc.rate) + " " + DOC_EN.per_sqft : ""}</div> : null}
      {/* Quotation header — package sheet me khaane khule (quote me fill.header se bhare) */}
      <div style={S.scroll}>
        <table style={{ ...S.table, minWidth: 540 }}><tbody>
          <tr><td style={{ ...S.lab, width: "18%" }}>{DOC_EN.quotation_no}</td><td style={S.td}>{hv(H.quotation_no)}</td><td style={{ ...S.lab, width: "18%" }}>{DOC_EN.date}</td><td style={S.td}>{hv(H.date)}</td></tr>
          <tr><td style={S.lab}>{DOC_EN.client_name}</td><td style={S.td}>{hv(H.client_name)}</td><td style={S.lab}>{DOC_EN.contact}</td><td style={S.td}>{hv(H.contact)}</td></tr>
          <tr><td style={S.lab}>{DOC_EN.site}</td><td style={S.td}>{hv(H.site_address)}</td><td style={S.lab}>{DOC_EN.plot}</td><td style={S.td}>{hv(H.plot_area, DOC_EN.sqft)}</td></tr>
          <tr><td style={S.lab}>{DOC_EN.builtup}</td><td style={S.td}>{hv(H.builtup_area, DOC_EN.sqft)}</td><td style={S.lab}>{DOC_EN.valid_till}</td>
            <td {...tp("meta")} style={tapS(S.td)}>{meta.validity_days} {DOC_EN.days_from}</td></tr>
        </tbody></table>
      </div>
      {meta.greeting ? <p {...tp("meta")} style={tapS({ margin: "10px 0 6px" })}><i>{meta.greeting}</i></p> : null}
      {(meta.cover || []).map((c) => <p key={c.key} {...tp("meta.cover." + c.key)} style={tapS({ margin: "6px 0", ...S.pre })}>{f(c.text)}</p>)}
      {add("meta.cover", t("sales_pkg_ui.add_para"))}

      {(content.glance.length || editable) ? (
        <>
          <div style={S.h3}>{DOC_EN.glance}</div>
          <div data-sec="glance" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", borderTop: "1px solid #c9cde6", borderLeft: "1px solid #c9cde6" }}>
            {content.glance.map((g) => (
              <div key={g.key} {...tp("glance." + g.key)} style={tapS({ display: "flex", borderRight: "1px solid #c9cde6", borderBottom: "1px solid #c9cde6" })}>
                <div style={{ width: "38%", flexShrink: 0, padding: "6px 8px", color: A, fontWeight: 700, borderRight: "1px solid #c9cde6" }}>{g.label}</div>
                <div style={{ flex: 1, minWidth: 0, padding: "6px 8px", ...S.pre }}>{f(g.value)}</div>
              </div>
            ))}
          </div>
          {add("glance", t("sales_pkg_ui.add_row"))}
        </>
      ) : null}
      {out}
    </div>
  );
}
