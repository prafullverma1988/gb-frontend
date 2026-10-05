// ════════════════════════════════════════════════════════════════
// PickSelect — <select> ki jagah seedha lagne wala (6 Oct 2026, Prafull:
// "web par bhi sab jagah yahi picker").
//
// Wahi likhawat jo <select> ki: value / onChange(e) / disabled / style /
// id / title, aur andar <option> (chahe .map(), fragment ya <optgroup> me).
// Dikhta PickField jaisa — panel me khoj, chuna hua ✓. onChange ko
// { target: { value, name, id } } milta hai, isliye purane handler
// (e.target.value) bina badle chalte hain.
//
// Niyam: value="" wala option = placeholder (disabled ho to list me nahi);
// disabled / hidden option list me nahi (jab tak wahi chuna na ho); value
// na di ho (uncontrolled) to native jaisa — pehla option chuna dikhe;
// wahi option dobara chuno to onChange nahi (native jaisa).
// ════════════════════════════════════════════════════════════════
import { Children, Fragment, isValidElement, useState } from "react";
import PickField from "./PickField";

const textOf = (n) => {
  if (n == null || n === false || n === true) return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  if (isValidElement(n)) return textOf(n.props.children);
  return "";
};

function collect(children, group, out) {
  Children.forEach(children, (ch) => {
    if (!isValidElement(ch)) return;
    if (ch.type === "option") {
      const p = ch.props;
      const label = textOf(p.children).trim();
      const value = p.value !== undefined && p.value !== null ? String(p.value) : label;
      out.push({ value, label: label || value, group: group || null, disabled: !!p.disabled, hidden: !!p.hidden });
    } else if (ch.type === "optgroup") {
      collect(ch.props.children, ch.props.label, out);
    } else if (ch.type === Fragment || (ch.props && ch.props.children)) {
      collect(ch.props.children, group, out);
    }
  });
}

export default function PickSelect({ value, defaultValue, onChange, children, style, disabled, name, id, title, placeholder, onFocus, onBlur, ...rest }) {
  const [inner, setInner] = useState(defaultValue != null ? String(defaultValue) : undefined);
  const controlled = value !== undefined;
  const raw = controlled ? (value == null ? "" : String(value)) : inner;
  const all = [];
  collect(children, null, all);
  const blank = all.find((o) => o.value === "");
  const list = all.filter((o) => ((!o.hidden && !o.disabled) || o.value === raw) && (o.value !== "" || !blank.disabled));
  // Native jaisa: value nahi mili to pehla option dikhta hai.
  const shown = raw !== undefined && all.some((o) => o.value === raw) ? raw : (all.find((o) => !o.hidden) || { value: "" }).value;
  const pick = (v) => {
    if (v === shown) return;
    if (!controlled) setInner(v);
    if (onChange) onChange({ target: { value: v, name, id }, currentTarget: { value: v, name, id }, preventDefault() {}, stopPropagation() {}, persist() {} });
  };
  // Native <select> jitna: width na di ho to sabse lambe option jitni chaudai
  // (chhote toolbar / table ke dropdown poori line na gherein).
  const s = style || {};
  const fit = s.width == null && s.flex == null;
  const longest = all.reduce((m, o) => Math.max(m, o.label.length), 0);
  const triggerStyle = {
    padding: "6px 9px",
    borderRadius: 6,
    border: "1px solid #D1D5DB",
    fontSize: 13,
    ...s,
    ...(fit ? { width: "auto", minWidth: `calc(${Math.min(longest, 34) * 0.55}em + 34px)`, maxWidth: "100%" } : null),
    display: "flex",
    appearance: "none",
    WebkitAppearance: "none",
  };
  const wrapStyle = fit
    ? { display: "inline-block", maxWidth: "100%", verticalAlign: "middle", margin: s.margin, marginTop: s.marginTop, marginBottom: s.marginBottom, marginLeft: s.marginLeft, marginRight: s.marginRight }
    : { width: s.width, flex: s.flex, minWidth: s.minWidth, maxWidth: s.maxWidth, margin: s.margin, marginTop: s.marginTop, marginBottom: s.marginBottom, marginLeft: s.marginLeft, marginRight: s.marginRight };
  const tStyle = { ...triggerStyle, margin: 0, ...(fit ? null : { width: "100%", flex: "none", minWidth: 0, maxWidth: "none" }) };
  return (
    <PickField
      value={shown}
      onChange={pick}
      disabled={disabled}
      options={list.map((o) => ({ key: o.value, label: o.label, group: o.group }))}
      placeholder={(blank && blank.label) || placeholder}
      triggerStyle={tStyle}
      wrapStyle={wrapStyle}
      buttonProps={{ id, title, onFocus, onBlur, "aria-label": rest["aria-label"] }}
    />
  );
}
