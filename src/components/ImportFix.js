// components/ImportFix.js — import ki sudhaar screen, sab import ke liye ek.
//
// Server ka jawab (gb-backend utils/importKit.js) har row ke saath:
//   { row, status: ok|error|skipped, errors[], error_fields[], note, raw{} }
// Ye panel wahi dikhata hai: galat row khuli, Excel ke column jaise box, galat
// box laal aur neeche wajah. User badalta hai → "Dobara check karo" → server
// phir se poori jaanch karta hai. Yahan ki koi jaanch bharose ki nahi — sirf
// dikhane ki.
//
// Istemaal:
//   const fx = useImportFix();
//   fx.take(server.data, server.message, true)      // pehli jaanch ke baad
//   <ImportFixPanel fx={fx} fields={FIELDS} title={(raw) => raw.name} />
//   api.post(url, { rows: fx.payload(), dry_run })
//
// fields: [{ key, col, type: text|number|select|list|date, options?: string[] |
//   (lists, raw) => string[], optionLabel?: (value) => text, same?, wide?, showIf?: (raw) => bool }]
//   col    = template ka column naam (box ka label bhi yahi — user file me wahi dhoondhta hai)
//   select = sirf list me se (list khaali ho to likhne wala box)
//   list   = likh bhi sakte ho, list sirf sujhaati hai
//   date   = date-picker; value YYYY-MM-DD (server padhi hui tareekh isi shakl me lautata hai)
//   optionLabel = option ki value data hai (jaise "owned"), dikhaya bhasha me jaata hai
//   same   = ek row theek karne par baaki rows me bhi lagane ka button
//   clearable = galti hone par box ke neeche "Hata do" (jaise bulk item par likha code)
//
// ImportFixPanel ke marzi wale props:
//   cols        = [{ head, cell(raw) }] — item ke baad apne column (Assets: Qty/Kahan/Kiske paas)
//   rowAction(r)= { label, onClick } — us row par ek chhota link (Assets: example row)
//   skippedHint = Skip wali rows ki apni baat (default: "pehle se app me hain")
import { useState } from "react";
import SearchSelect from "./SearchSelect";
import { t } from "../i18n";

const C = {
  ind: "#4F46E5", indL: "#EEF2FF", indB: "#C7D2FE", red: "#DC2626", redL: "#FEF2F2", redRow: "#FFF8F8",
  grn: "#059669", grnL: "#ECFDF5", amb: "#92400E", ambL: "#FFFBEB", ambB: "#FDE68A",
  slt: "#475569", sltL: "#F1F5F9", t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", card: "#FFFFFF", soft: "#F9FAFB", edit: "#FFFCF7",
};
export const impNorm = (s) => String(s ?? "").toLowerCase().trim().replace(/\s+/g, " ");

const box = {
  width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 12, borderRadius: 7,
  border: `1.5px solid ${C.b1}`, outline: "none", fontFamily: "inherit", color: C.t1, background: C.card,
};
const linkBtn = {
  display: "block", marginTop: 4, padding: 0, border: "none", background: "none", color: C.ind,
  fontSize: 10.5, fontWeight: 700, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
};
const smallBtn = (primary) => ({
  padding: "4px 9px", fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
  border: primary ? "none" : `1.5px solid ${C.b1}`, background: primary ? C.ind : C.card,
  color: primary ? "#fff" : C.t2, whiteSpace: "nowrap",
});
const pill = (c, bg) => ({
  display: "inline-block", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
  color: c, background: bg, whiteSpace: "nowrap",
});
// Beech ke column module apne hisaab se deta hai — Assets ki screen par Qty,
// Kahan aur Kiske paas bhi dikhte hain, baaki import me sirf item aur dikkat.
const gridOf = (cols) => ({
  display: "grid",
  gridTemplateColumns: `46px 84px minmax(170px, 1.4fr) ${cols.map(() => "minmax(84px, 0.8fr)").join(" ")} minmax(210px, 2fr) 118px`,
  gap: 8, alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${C.b1}`,
});
const optsOf = (f, lists, raw) => (typeof f.options === "function" ? f.options(lists || {}, raw || {}) : f.options) || [];

export function useImportFix() {
  const [rows, setRows] = useState([]);
  const [lists, setLists] = useState({});
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [stale, setStale] = useState(false);

  const reset = () => { setRows([]); setLists({}); setMessage(""); setFilter("all"); setStale(false); };

  // Server ka jawab screen ki rows me. orig = jo server ne dekha — "yahi galti aur
  // rows me" usi se judta hai. Hatayi rows server tak jaati hi nahi, isliye wo
  // apni pichhli haalat me rehti hain. fresh = nayi file (purani sab bhool jao).
  const take = (data, msg, fresh) => {
    const got = (data.rows || []).map((r) => ({
      ...r, raw: r.raw || {}, orig: r.raw || {}, errors: r.errors || [], error_fields: r.error_fields || [],
      removed: false, dirty: false, open: r.status === "error",
    }));
    const seen = new Set(got.map((r) => r.row));
    setRows((prev) => [...got, ...(fresh ? [] : prev.filter((x) => x.removed && !seen.has(x.row)))]
      .sort((a, b) => a.row - b.row));
    if (data.lists) setLists(data.lists);
    setMessage(msg || "");
    setStale(false);
    const s = data.summary || {};
    setFilter(Number(s.error) > 0 ? "error" : "all");
  };

  // adjust(raw, key, value, lists) → raw: ek column badalne par judi hui values
  // theek karni hon (jaise jagah ka type badla to purana naam hatao).
  const setRaw = (rowNo, k, value, adjust) => {
    setRows((p) => p.map((x) => {
      if (x.row !== rowNo) return x;
      let raw = { ...x.raw, [k]: value };
      if (adjust) raw = adjust(raw, k, value, lists) || raw;
      return { ...x, raw, dirty: true };
    }));
    setStale(true);
  };
  const applySame = (k, value, rowNos) => {
    const set = new Set(rowNos);
    setRows((p) => p.map((x) => (set.has(x.row) ? { ...x, raw: { ...x.raw, [k]: value }, dirty: true } : x)));
    setStale(true);
  };
  const toggleOpen = (rowNo) => setRows((p) => p.map((x) => (x.row === rowNo ? { ...x, open: !x.open } : x)));
  const toggleRemove = (rowNo) => {
    setRows((p) => p.map((x) => (x.row === rowNo ? { ...x, removed: !x.removed, open: false } : x)));
    setStale(true);
  };

  const live = rows.filter((x) => !x.removed);
  const counts = {
    total: rows.length,
    ok: live.filter((x) => x.status === "ok").length,
    error: live.filter((x) => x.status === "error").length,
    skipped: live.filter((x) => x.status === "skipped").length,
    removed: rows.length - live.length,
  };
  const payload = () => live.map((x) => ({ row: x.row, raw: x.raw }));
  const canImport = !stale && counts.error === 0 && counts.ok > 0;

  return { rows, lists, message, filter, setFilter, stale, counts, canImport, take, setRaw, applySame, toggleOpen, toggleRemove, payload, reset };
}

function RowEditor({ r, rows, lists, fields, onSet, onSame }) {
  const v = r.raw || {};
  const ef = r.error_fields || [];
  const known = new Set(fields.map((f) => f.key));
  const msgOf = (k) => (r.errors || []).filter((_, i) => ef[i] === k).join(" · ");
  const loose = (r.errors || []).filter((_, i) => !ef[i] || !known.has(ef[i]));
  const filled = (k) => String(v[k] ?? "").trim() !== "";
  const style = (k) => ({ ...box, borderColor: msgOf(k) ? C.red : C.b1 });

  // Isi galat value wali baaki rows — jinme wahi galti thi aur abhi badli nahi.
  const sameRows = (f) => {
    if (!f.same || !ef.includes(f.key)) return [];
    const was = impNorm((r.orig || {})[f.key]);
    const now = impNorm(v[f.key]);
    if (!now || now === was) return [];
    return rows.filter((x) => x.row !== r.row && !x.removed && (x.error_fields || []).includes(f.key)
      && impNorm((x.orig || {})[f.key]) === was && impNorm((x.raw || {})[f.key]) !== now);
  };

  const control = (f) => {
    const k = f.key;
    const val = v[k] ?? "";
    if (f.type === "select") {
      const opts = optsOf(f, lists, v);
      if (!opts.length) return <input value={val} onChange={(e) => onSet(k, e.target.value)} style={style(k)} />;
      const hit = opts.find((o) => impNorm(o) === impNorm(val));
      const odd = filled(k) && !hit;
      // File wali value list me nahi: galti ho to "ye nahi chalega", warna (server
      // ne purana naam maan liya, jaise "Supplier") waisi hi dikhao.
      const oddText = msgOf(k) ? t("import_fix.bad_value", { value: val }) : val;
      if (opts.length > 12) {
        const list = opts.map((o) => ({ id: o, name: f.optionLabel ? f.optionLabel(o) : o }));
        const all = odd ? [{ id: val, name: oddText }, ...list] : list;
        return (
          <div style={{ borderRadius: 8, boxShadow: msgOf(k) ? `0 0 0 1.5px ${C.red}` : "none" }}>
            <SearchSelect value={hit || val} onChange={(id) => onSet(k, id)} options={all} accent={C.ind} compact placeholder={t("import_fix.select")} />
          </div>
        );
      }
      return (
        <select value={hit || (odd ? "__odd" : "")} onChange={(e) => { if (e.target.value !== "__odd") onSet(k, e.target.value); }} style={style(k)}>
          <option value="">{t("import_fix.select")}</option>
          {odd && <option value="__odd">{oddText}</option>}
          {opts.map((o) => <option key={o} value={o}>{f.optionLabel ? f.optionLabel(o) : o}</option>)}
        </select>
      );
    }
    if (f.type === "date") {
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(val)) ? val : "";
      return (
        <>
          <input type="date" value={iso} onChange={(e) => onSet(k, e.target.value)} style={style(k)} />
          {filled(k) && !iso && <div style={{ fontSize: 10.5, color: C.t4, marginTop: 3 }}>{t("import_fix.bad_value", { value: val })}</div>}
        </>
      );
    }
    if (f.type === "list") {
      return <input value={val} onChange={(e) => onSet(k, e.target.value)} style={style(k)} list={"imp-" + k} />;
    }
    return <input value={val} inputMode={f.type === "number" ? "decimal" : undefined} onChange={(e) => onSet(k, e.target.value)} style={style(k)} />;
  };

  const cells = fields
    .filter((f) => !f.showIf || f.showIf(v) || msgOf(f.key))
    .map((f) => {
      const msg = msgOf(f.key);
      const same = sameRows(f);
      return (
        <div key={f.key} style={{ minWidth: 0, gridColumn: f.wide ? "span 2" : undefined }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: msg ? C.red : C.t3, marginBottom: 4 }}>{f.col}</div>
          {control(f)}
          {msg && <div style={{ fontSize: 10.5, color: C.red, marginTop: 3, lineHeight: 1.4 }}>{msg}</div>}
          {f.clearable && msg && filled(f.key) && (
            <button type="button" style={linkBtn} onClick={() => onSet(f.key, "")}>{t("import_fix.clear_field")}</button>
          )}
          {same.length > 0 && (
            <button type="button" style={linkBtn} onClick={() => onSame(f.key, v[f.key], same.map((x) => x.row))}>
              {t("import_fix.apply_same", { n: same.length, value: v[f.key] })}
            </button>
          )}
        </div>
      );
    });

  return (
    <>
      {loose.length > 0 && <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>{loose.join(" · ")}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>{cells}</div>
    </>
  );
}

// title(raw) / sub(raw): row ki pehchaan (jaise naam, aur neeche code/category).
// adjust: useImportFix().setRaw ko jaata hai — judi hui values theek karne ke liye.
export default function ImportFixPanel({ fx, fields, title, sub, adjust, cols = [], rowAction, skippedHint }) {
  const { rows, lists, message, filter, setFilter, stale, counts } = fx;
  const shown = rows.filter((x) => (filter === "all" ? true : filter === "removed" ? x.removed : !x.removed && x.status === filter));
  const tone = (s) => (s === "ok" ? [C.grn, C.grnL] : s === "error" ? [C.red, C.redL] : [C.slt, C.sltL]);
  const warn = stale || counts.error > 0;
  const chips = [
    ["all", t("import_fix.filter_all", { n: counts.total })],
    ["error", t("import_fix.filter_error", { n: counts.error })],
    ["skipped", t("import_fix.filter_skipped", { n: counts.skipped })],
    ["removed", t("import_fix.filter_removed", { n: counts.removed })],
  ];

  return (
    <div>
      <div style={{
        border: `1px solid ${warn ? C.ambB : C.indB}`, background: warn ? C.ambL : C.indL, borderRadius: 10,
        padding: "10px 13px", fontSize: 11.5, color: warn ? C.amb : "#3730A3", lineHeight: 1.55, marginBottom: 12,
      }}>
        {stale
          ? <div style={{ fontWeight: 700 }}>{t("import_fix.dirty_hint")}</div>
          : message && <div style={{ fontWeight: 700 }}>{message}</div>}
        <div style={{ marginTop: 3 }}>{t("import_fix.summary", { ok: counts.ok, error: counts.error, skipped: counts.skipped, removed: counts.removed })}</div>
        {!stale && counts.error > 0 && <div style={{ marginTop: 4 }}>{t("import_fix.fix_hint")}</div>}
        {counts.skipped > 0 && <div style={{ marginTop: 4 }}>{skippedHint || t("import_fix.skipped_hint")}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ display: "inline-flex", border: `1.5px solid ${C.b1}`, borderRadius: 9, overflow: "hidden", background: C.card }}>
          {chips.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              style={{ padding: "6px 12px", fontSize: 11.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: filter === k ? C.indL : "transparent", color: filter === k ? C.ind : C.t3 }}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: C.t4 }}>{t("import_fix.file_note")}</span>
      </div>

      <div style={{ border: `1.5px solid ${C.b1}`, borderRadius: 12, overflow: "hidden", background: C.card }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 700 + cols.length * 120 }}>
            <div style={{ ...gridOf(cols), fontSize: 10.5, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".4px", background: C.soft }}>
              <span>{t("import_fix.col_row")}</span>
              <span>{t("import_fix.col_status")}</span>
              <span>{t("import_fix.col_item")}</span>
              {cols.map((c, i) => <span key={i}>{c.head}</span>)}
              <span>{t("import_fix.col_problem")}</span>
              <span />
            </div>
            {shown.length === 0 && (
              <div style={{ padding: "26px 16px", textAlign: "center", color: C.t4, fontSize: 12 }}>{t("import_fix.filter_empty")}</div>
            )}
            {shown.map((r) => {
              const v = r.raw || {};
              const redRow = r.status === "error" && !r.dirty && !r.removed;
              const [pc, pbg] = r.removed ? [C.slt, C.sltL] : r.dirty ? [C.amb, C.ambL] : tone(r.status);
              const pillText = r.removed ? t("import_fix.status_removed") : r.dirty ? t("import_fix.status_changed") : t("import_fix.status_" + r.status);
              const problem = r.removed ? t("import_fix.removed_hint")
                : r.dirty ? t("import_fix.changed_hint")
                : (r.errors || []).join(" · ") || r.note || "";
              const head = (title && title(v)) || "—";
              const subText = sub ? sub(v) : "";
              const act = !r.removed && !r.dirty && rowAction ? rowAction(r) : null;
              return (
                <div key={r.row}>
                  <div style={{ ...gridOf(cols), background: r.removed ? C.soft : redRow ? C.redRow : "transparent", opacity: r.removed ? 0.65 : 1 }}>
                    <span style={{ color: C.t3, fontSize: 12 }}>{r.row}</span>
                    <span><span style={pill(pc, pbg)}>{pillText}</span></span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.t1, fontSize: 12.5, textDecoration: r.removed ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{head}</div>
                      {subText && <div style={{ fontSize: 10.5, color: C.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subText}</div>}
                    </div>
                    {cols.map((c, i) => (
                      <div key={i} style={{ fontSize: 11.5, color: C.t2, minWidth: 0, lineHeight: 1.4 }}>{c.cell(v, r)}</div>
                    ))}
                    <div style={{ fontSize: 11.5, color: redRow ? C.red : C.t3, minWidth: 0, lineHeight: 1.45 }}>
                      {problem}
                      {act && <button type="button" style={linkBtn} onClick={act.onClick}>{act.label}</button>}
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {r.removed ? (
                        <button type="button" style={smallBtn(false)} onClick={() => fx.toggleRemove(r.row)}>{t("import_fix.restore")}</button>
                      ) : (
                        <>
                          <button type="button" style={smallBtn(redRow && !r.open)} onClick={() => fx.toggleOpen(r.row)}>
                            {r.open ? t("import_fix.close") : redRow ? t("import_fix.fix") : t("import_fix.edit")}
                          </button>
                          <button type="button" style={{ ...smallBtn(false), color: C.red }} title={t("import_fix.remove")} aria-label={t("import_fix.remove")} onClick={() => fx.toggleRemove(r.row)}>✕</button>
                        </>
                      )}
                    </div>
                  </div>
                  {r.open && !r.removed && (
                    <div style={{ padding: "12px 14px 14px", background: C.edit, borderBottom: `1px solid ${C.b1}` }}>
                      <RowEditor r={r} rows={rows} lists={lists} fields={fields}
                        onSet={(k, val) => fx.setRaw(r.row, k, val, adjust)} onSame={fx.applySame} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {fields.filter((f) => f.type === "list").map((f) => (
        <datalist key={f.key} id={"imp-" + f.key}>
          {optsOf(f, lists, {}).map((o) => <option key={o} value={o} />)}
        </datalist>
      ))}
    </div>
  );
}
