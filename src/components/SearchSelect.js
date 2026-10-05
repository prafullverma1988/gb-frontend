// ── SEARCHSELECT — options + onChange(key) wala dropdown ─────────
// 6 Oct 2026 se andar PickField (app jaisa picker: field button, panel me
// upar khoj, chuna hua ✓). Bahar ka API wahi — koi caller nahi badla.
//
// Usage:
//   <SearchSelect
//     value={selectedKey}
//     options={["A","B","C"]}                       // strings → key=label
//     options={[{key:1,label:"One"},...]}            // or objects
//     options={[{value:1,label:"One"},...]}          // value/label also OK
//     options={[{id:1,name:"One"},...]}              // id/name also OK
//     options={[{key:"a:1",label:"SBI",group:"Khaate",sub:"transfer",search:"0123"}]}
//                           // group → heading jab group badle; sub → chhota grey text;
//                           // search → sirf khoj ke liye (phone, khaata no.), dikhta nahi
//     onChange={(key) => setSelected(key)}
//     placeholder="Select a project..."
//     accent="#2563EB"      // optional border / highlight color
//     compact               // smaller height (28px) for tables
//     onAfterSelect={fn}    // optional callback after select (e.g. focus next field)
//     inputRef={ref}        // optional — caller focus() karta hai (field button)
//     disabled
//     theme={{...}}         // optional color overrides
//   />
// Focus aate hi (Tab / ref.focus()) panel khulta hai — table me tez entry
// ke liye; akshar dabao to wahi khoj me.

import PickField, { PICK_C } from "./PickField";

export const normalizeOptions = (options) =>
  (Array.isArray(options) ? options : []).map((o) => {
    if (typeof o === "string" || typeof o === "number") {
      return { key: String(o), label: String(o) };
    }
    const extra = { group: o.group || null, sub: o.sub || null, search: o.search || null };
    if (o.key !== undefined) return { key: String(o.key), label: String(o.label ?? o.key), ...extra };
    return {
      key: String(o.value ?? o.id ?? o.name ?? ""),
      label: String(o.label ?? o.name ?? o.value ?? o.id ?? ""),
      ...extra,
    };
  });

export default function SearchSelect({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  style = {},
  disabled = false,
  theme,
  accent,
  compact = false,
  onAfterSelect,
  inputRef,
}) {
  const T = { ...PICK_C, ...(theme || {}) };
  return (
    <PickField
      value={value}
      options={normalizeOptions(options)}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      theme={T}
      accent={accent}
      openOnFocus
      onAfterSelect={onAfterSelect}
      triggerRef={inputRef}
      wrapStyle={style}
      triggerStyle={{
        height: compact ? 28 : 34,
        padding: "0 9px 0 11px",
        borderRadius: 7,
        border: `1.5px solid ${T.b1}`,
        fontSize: compact ? 11 : 13,
        color: T.t1,
        background: disabled ? T.surfaceB : T.surface,
        outline: "none",
        transition: "border-color .12s, box-shadow .12s",
      }}
    />
  );
}
