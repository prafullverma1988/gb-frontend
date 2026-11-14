// ════════════════════════════════════════════════════════════════
// CRM Packages — haath ka edit box (14 Nov 2026, Prafull)
//
// Document me kisi line par tap → yahi box: label/value, description/unit/
// rate, table ke khaane, bullet ka text, hisse ka title, package rate. "+ add
// karo" par khaali box → nayi line. Badlaav sirf DRAFT (page ki copy) me;
// server par tab jaata hai jab upar "Save karo" dabaya (naya version).
// Path / kind server ke utils/salesPackage.js wale hi (pkgUtil.resolveItem).
// ════════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { t } from "../../i18n";
import PickSelect from "../../components/PickSelect";
import { T, btn, inp, Field, Sheet, ErrBox } from "./pkgUi";
import { clone, inr, resolveContainer, resolveItem, uniqueKey } from "./pkgUtil";

const RATE_KINDS = ["package", "rate", "lump_sum"];
const BLOCK_TYPES = ["kv", "bullets", "table", "note", "para"];
const TOKENS = { company: "{company}", package: "{package}", validity_days: "{validity_days}", rate_full: "{rate_full}" };

const toNum = (v) => {
  const s = String(v == null ? "" : v).replace(/[₹,\s]/g, "");
  if (!s) return { ok: true, n: null };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? { ok: true, n: Math.round(n * 100) / 100 } : { ok: false };
};
const sv = (v) => (v == null ? "" : String(v));

// kind → khaane. need = in me se kam se kam ek bhara ho (warna server line gira deta hai)
function specFor(kind, ctx) {
  const area = (n, l, extra) => ({ n, l, area: true, ...(extra || {}) });
  const line = (n, l, extra) => ({ n, l, ...(extra || {}) });
  switch (kind) {
    case "kv": return { fields: [line("label", t("sales_pkg_ui.f_label")), area("value", t("sales_pkg_ui.f_value"))], need: ["label", "value"] };
    case "text": return { fields: [area("text", t("sales_pkg_ui.f_text"))], need: ["text"] };
    case "scope": return { fields: [line("label", t("sales_pkg_ui.f_label")), line("rate", t("sales_pkg_ui.f_rate_sqft"), { num: true })], need: ["label"] };
    case "rate_row": return {
      fields: [line("description", t("sales_pkg_ui.f_description")), line("unit", t("sales_pkg_ui.f_unit")),
        { n: "kind", l: t("sales_pkg_ui.f_kind"), select: RATE_KINDS },
        line("rate", t("sales_pkg_ui.f_rate"), { num: true })],
      need: ["description"],
    };
    case "rate_group": return { fields: [line("title", t("sales_pkg_ui.f_group_title"))], need: [] };
    case "section": return { fields: [line("title", t("sales_pkg_ui.f_section_title"))], need: ["title"] };
    case "block": {
      const typ = ctx.blockType;
      const fs = [];
      if (ctx.adding) fs.push({ n: "type", l: t("sales_pkg_ui.f_block_type"), select: BLOCK_TYPES });
      fs.push(line("heading", t("sales_pkg_ui.f_heading"), { hint: t("sales_pkg_ui.heading_hint") }));
      if (typ === "note" || typ === "para") fs.push(area("text", t("sales_pkg_ui.f_text")));
      if (ctx.adding && typ === "table") fs.push(line("columns", t("sales_pkg_ui.f_columns"), { hint: t("sales_pkg_ui.columns_hint") }));
      return { fields: fs, need: typ === "note" || typ === "para" ? ["text"] : typ === "table" && ctx.adding ? ["columns"] : [] };
    }
    case "table_row": {
      const cols = (ctx.block && ctx.block.columns) || [];
      return {
        fields: [line("group", t("sales_pkg_ui.f_table_group"), { hint: t("sales_pkg_ui.table_group_hint") }),
          ...cols.map((c) => area("cell:" + c.key, c.label || c.key, { small: true }))],
        need: cols.map((c) => "cell:" + c.key),
      };
    }
    case "meta": return {
      fields: [line("doc_title", t("sales_pkg_ui.f_doc_title")), line("package_name", t("sales_pkg_ui.f_package_name")),
        line("validity_days", t("sales_pkg_ui.f_validity"), { int: true }), line("greeting", t("sales_pkg_ui.f_greeting"))],
      need: ["doc_title"],
    };
    case "acceptance": return {
      fields: [area("text", t("sales_pkg_ui.f_acc_text")), line("client_label", t("sales_pkg_ui.f_client_label")), line("company_label", t("sales_pkg_ui.f_company_label"))],
      need: ["text"],
    };
    case "basis_title": return { fields: [line("basis_title", t("sales_pkg_ui.f_basis_title"))], need: [] };
    default: return { fields: [], need: [] };
  }
}

const kindHead = (k) => ({
  kv: t("sales_pkg_ui.ek_kv"), text: t("sales_pkg_ui.ek_text"), scope: t("sales_pkg_ui.ek_scope"), rate_row: t("sales_pkg_ui.ek_rate_row"),
  rate_group: t("sales_pkg_ui.ek_rate_group"), section: t("sales_pkg_ui.ek_section"), block: t("sales_pkg_ui.ek_block"),
  table_row: t("sales_pkg_ui.ek_table_row"), meta: t("sales_pkg_ui.ek_meta"), acceptance: t("sales_pkg_ui.ek_acceptance"),
  basis_title: t("sales_pkg_ui.ek_basis_title"), scopes: t("sales_pkg_ui.ek_scopes"),
}[k] || t("sales_pkg_ui.edit_title"));
const kindLabel = (k) => (k === "package" ? t("sales_pkg_ui.kind_package") : k === "lump_sum" ? t("sales_pkg_ui.kind_lump_sum") : k === "rate" ? t("sales_pkg_ui.kind_rate")
  : { kv: t("sales_pkg_ui.bt_kv"), bullets: t("sales_pkg_ui.bt_bullets"), table: t("sales_pkg_ui.bt_table"), note: t("sales_pkg_ui.bt_note"), para: t("sales_pkg_ui.bt_para") }[k] || k);

// target: { act:'edit', path } | { act:'add', container }
export default function PackageEditModal({ content, target, onApply, onClose }) {
  const c = useMemo(() => clone(content), [content]);
  const adding = target.act === "add";
  const loc = adding ? null : resolveItem(c, target.path);
  const box = adding ? resolveContainer(c, target.container) : null;
  const kind = loc ? loc.kind : box ? box.kind : null;
  const block = (loc && loc.block) || (box && box.block) || null;

  const [vals, setVals] = useState(() => {
    const it = loc ? loc.item : null;
    if (kind === "scopes") {
      const o = { show_structure_rate: !!c.meta.show_structure_rate };
      c.scopes.forEach((s) => { o["label:" + s.key] = sv(s.label); o["rate:" + s.key] = sv(s.rate); });
      return o;
    }
    if (!it) return kind === "rate_row" ? { kind: "rate", unit: "" } : kind === "block" ? { type: "kv" } : {};
    if (kind === "table_row") {
      const o = { group: sv(it.group) };
      ((block && block.columns) || []).forEach((col) => { o["cell:" + col.key] = sv(it.cells && it.cells[col.key]); });
      return o;
    }
    if (kind === "basis_title") return { basis_title: sv(it.basis_title) };
    const o = {};
    Object.keys(it).forEach((k) => { if (typeof it[k] !== "object") o[k] = sv(it[k]); });
    return o;
  });
  const [err, setErr] = useState("");
  const set = (n, v) => setVals((p) => ({ ...p, [n]: v }));

  if (!kind) {
    return (
      <Sheet heading={t("sales_pkg_ui.edit_title")} onClose={onClose}>
        <ErrBox>{t("sales_pkg_ui.edit_not_found")}</ErrBox>
      </Sheet>
    );
  }

  const spec = specFor(kind, { adding, blockType: kind === "block" ? (adding ? vals.type : loc && loc.item.type) : null, block });
  const fullRate = (c.scopes.find((s) => s.key === "full") || c.scopes[0] || {}).rate;

  const save = () => {
    setErr("");
    if (kind === "scopes") {
      for (const s of c.scopes) {
        const r = toNum(vals["rate:" + s.key]);
        if (!r.ok) { setErr(t("sales_pkg_ui.err_rate_number")); return; }
        s.rate = r.n;
        s.label = String(vals["label:" + s.key] || "").trim() || s.label;
      }
      c.meta.show_structure_rate = !!vals.show_structure_rate;
      onApply(c);
      return;
    }
    const out = {};
    for (const f of spec.fields) {
      const raw = vals[f.n];
      if (f.num) {
        const r = toNum(raw);
        if (!r.ok) { setErr(t("sales_pkg_ui.err_rate_number")); return; }
        out[f.n] = r.n;
      } else if (f.int) {
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n) || n < 1 || n > 365) { setErr(t("sales_pkg_ui.err_validity")); return; }
        out[f.n] = n;
      } else out[f.n] = String(raw == null ? "" : raw).trim();
    }
    if (spec.need.length && !spec.need.some((n) => out[n] != null && out[n] !== "")) { setErr(t("sales_pkg_ui.err_fill_something")); return; }

    if (kind === "table_row") {
      const cells = {};
      ((block && block.columns) || []).forEach((col) => { cells[col.key] = out["cell:" + col.key] || ""; });
      if (adding) {
        const first = (block.columns[0] && cells[block.columns[0].key]) || "row";
        box.list.push({ key: uniqueKey(box.list, first), cells, ...(out.group ? { group: out.group } : {}) });
      } else {
        loc.item.cells = cells;
        if (out.group) loc.item.group = out.group; else delete loc.item.group;
      }
      onApply(c);
      return;
    }
    if (kind === "basis_title") { loc.item.basis_title = out.basis_title; onApply(c); return; }

    if (adding) {
      let item;
      if (kind === "block") {
        const typ = BLOCK_TYPES.includes(out.type) ? out.type : "kv";
        item = { type: typ };
        if (out.heading) item.heading = out.heading;
        if (typ === "kv") item.rows = [];
        if (typ === "bullets") item.items = [];
        if (typ === "note" || typ === "para") item.text = out.text;
        if (typ === "table") {
          const names = String(out.columns || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
          const used = [];
          item.columns = names.map((nm) => { const k = uniqueKey(used, nm); used.push({ key: k }); return { key: k, label: nm }; });
          item.rows = [];
        }
        item.key = uniqueKey(box.list, out.heading || typ);
      } else if (kind === "section") {
        item = { key: uniqueKey(box.list, out.title), title: out.title, blocks: [] };
      } else if (kind === "rate_group") {
        item = { key: uniqueKey(box.list, out.title || "group"), title: out.title, rows: [] };
      } else {
        item = { ...out };
        if (kind === "rate_row" && !RATE_KINDS.includes(item.kind)) item.kind = "rate";
        item.key = uniqueKey(box.list, out.label || out.description || out.text || "row");
      }
      // Nayi khaali block / table / section server par girti nahi (blocks / rows khaali chalte hain)
      box.list.push(item);
    } else {
      Object.keys(out).forEach((k) => { loc.item[k] = out[k]; });
      if (kind === "block" && !out.heading) delete loc.item.heading;
    }
    onApply(c);
  };

  const canDelete = !adding && loc && Array.isArray(loc.list);
  const big = ["section", "block", "rate_group"].includes(kind);
  const remove = async () => {
    if (big) {
      const ask = typeof window.confirmAsync === "function" ? window.confirmAsync : (m) => Promise.resolve(window.confirm(m));
      if (!(await ask(t("sales_pkg_ui.confirm_remove_big")))) return;
    }
    loc.list.splice(loc.index, 1);
    onApply(c);
  };

  const head = adding ? t("sales_pkg_ui.add_title", { what: kindHead(kind) }) : kindHead(kind);
  const isPackageRow = kind === "rate_row" && vals.kind === "package";

  return (
    <Sheet heading={head} onClose={onClose}
      footer={<>
        {canDelete ? <button type="button" onClick={remove} style={{ ...btn("danger"), marginRight: "auto" }}>🗑 {t("sales_pkg_ui.remove")}</button> : null}
        <button type="button" onClick={onClose} style={btn()}>{t("sales_pkg_ui.cancel")}</button>
        <button type="button" onClick={save} style={btn("primary")}>{adding ? t("sales_pkg_ui.add_btn") : t("sales_pkg_ui.done_btn")}</button>
      </>}>
      {kind === "scopes" ? (
        <>
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_pkg_ui.scopes_hint")}</div>
          {c.scopes.map((s) => (
            <div key={s.key} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 4 }}>
              <Field label={t("sales_pkg_ui.f_label")} style={{ flex: "2 1 180px" }}>
                <input style={inp} value={vals["label:" + s.key] || ""} onChange={(e) => set("label:" + s.key, e.target.value)} />
              </Field>
              <Field label={t("sales_pkg_ui.f_rate_sqft")} style={{ flex: "1 1 110px" }}>
                <input style={inp} inputMode="decimal" data-scope={s.key} value={vals["rate:" + s.key] || ""} onChange={(e) => set("rate:" + s.key, e.target.value)} />
              </Field>
            </div>
          ))}
          {c.scopes.some((s) => s.key === "structure") ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.t2, cursor: "pointer", minHeight: 36 }}>
              <input type="checkbox" checked={!!vals.show_structure_rate} onChange={(e) => set("show_structure_rate", e.target.checked)} style={{ width: 18, height: 18 }} />
              {t("sales_pkg_ui.show_structure_rate")}
            </label>
          ) : null}
        </>
      ) : spec.fields.map((f) => {
        const v = vals[f.n] == null ? "" : vals[f.n];
        if (f.select) {
          return (
            <Field key={f.n} label={f.l}>
              <PickSelect value={v || f.select[0]} onChange={(e) => set(f.n, e.target.value)} style={inp}>
                {f.select.map((o) => <option key={o} value={o}>{kindLabel(o)}</option>)}
              </PickSelect>
            </Field>
          );
        }
        const disabled = f.n === "rate" && isPackageRow;
        return (
          <Field key={f.n} label={f.l} hint={disabled ? t("sales_pkg_ui.package_row_hint", { rate: fullRate != null ? "₹" + inr(fullRate) : "—" }) : f.hint}>
            {f.area
              ? <textarea style={{ ...inp, minHeight: f.small ? 60 : 96, resize: "vertical", lineHeight: 1.45 }} value={v} onChange={(e) => set(f.n, e.target.value)} name={f.n} />
              : <input style={{ ...inp, ...(disabled ? { background: T.surfaceB, color: T.t4 } : {}) }} value={v} name={f.n} disabled={disabled}
                  inputMode={f.num ? "decimal" : f.int ? "numeric" : undefined} onChange={(e) => set(f.n, e.target.value)} />}
          </Field>
        );
      })}
      {kind !== "scopes" && spec.fields.some((f) => f.area) ? (
        <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.45 }}>{t("sales_pkg_ui.hint_tokens", TOKENS)}</div>
      ) : null}
      <ErrBox>{err}</ErrBox>
    </Sheet>
  );
}
