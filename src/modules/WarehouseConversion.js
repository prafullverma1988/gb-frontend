// ── 🔄 MATERIAL CONVERSION — Store (11 Oct 2026, Conversion) ──────────
// TMT se Ring jaisa: store ka ek ya zyada material ghata (input, FIFO se),
// ek ya zyada bana (output, store me naya batch), wastage Kabad me. Output ka
// rate = input ka FIFO cost + banwai (labour / making) ÷ output qty — form par
// live (server ka /conversions/preview, kuch likhta nahi).
//
// Nuskha (BOM): "1 Nos Ring 8mm = 0.347 Kg TMT 8mm" — output qty bharte hi
// input sujhata hai, zyada wastage par peela warning. Nuskha banana / badalna /
// hatana yahin ("📋 Nuskha"), Store Entry ki ijazat se.
//
// Cancel sirf Admin — wajah + company ka delete-password; bana hua item aage
// nikal chuka ho to server rok deta hai.
//
// Data: gb-backend routes/conversions.js (/api/conversions). Project ke Material
// tab ki apni copy alag hai (tabs/TabMaterialConversion.js) — module independence.

import { useState, useEffect, useMemo, useCallback } from "react";
import PickSelect from "../components/PickSelect";
import api from "../config/api";
import { t } from "../i18n";
import { BackClose } from "../utils/backNav";

const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB", sb: "#0D1B2A",
  ind: "#4B45C4", indL: "#EEEDFB",
  grn: "#059669", grnL: "#ECFDF5",
  red: "#DC2626", redL: "#FEF2F2",
  amb: "#B45309", ambL: "#FFFBEB", ambM: "#FDE68A",
  slt: "#64748B", sltL: "#F1F5F9",
};
const UNITS = ["Nos", "Kg", "Ton", "Mtr", "Rmt", "Bag", "Cum", "Sqm", "Sqft", "Cft", "Ltr", "Pcs", "Set", "Bundle"];
const key = (s) => String(s || "").trim().toLowerCase();
const num = (v) => Number(v) || 0;
const fmtQ = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x) ? "—" : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};
const istToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const inp = { width: "100%", padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: T.surface, color: T.t1 };
const btn = (bg, c = "#fff", brd) => ({ padding: "8px 14px", borderRadius: 7, border: brd ? `1.5px solid ${brd}` : "none", background: bg, color: c, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const lbl = { fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3, display: "block" };
const statusChip = (s) => (s === "Cancelled"
  ? { l: t("conversion.status_cancelled"), c: T.t4, bg: T.sltL }
  : { l: t("conversion.status_done"), c: T.grn, bg: T.grnL });
const Chip = ({ s }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: s.c, background: s.bg, borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>{s.l}</span>
);
// Nuskha se: is output qty ke liye kitna input (bina wastage).
const suggestIn = (r, outQty) => (r && num(r.out_qty) > 0 ? Math.round((num(outQty) / num(r.out_qty)) * num(r.in_qty) * 1000) / 1000 : null);
const recipeLine = (r) => t("conversion.recipe_line", { out_qty: fmtQ(r.out_qty), out_unit: r.out_unit, out: r.out_material_name, in_qty: fmtQ(r.in_qty), in_unit: r.in_unit, in: r.in_material_name });

function Drawer({ title, sub, width = 760, onClose, children, footer }) {
  return (
    <>
      <BackClose onClose={onClose} />
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1400 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: `min(${width}px,100vw)`, background: T.surface, zIndex: 1401,
        display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ background: T.sb, padding: "13px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="close" style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>{children}</div>
        {footer && <div style={{ borderTop: `1px solid ${T.b1}`, padding: "12px 20px", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>{footer}</div>}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// Naya Conversion — form
// ════════════════════════════════════════════════════════════════
const blankIn = () => ({ id: "", qty: "" });
const blankOut = () => ({ name: "", qty: "", unit: "", share: "" });

function ConversionForm({ whId, whName, stock, library, recipes, onClose, onSaved }) {
  const avail = useMemo(() => (stock || []).filter((m) => num(m.qty) > 0).sort((a, b) => String(a.name).localeCompare(String(b.name))), [stock]);
  const byId = useMemo(() => new Map((stock || []).map((m) => [String(m.id), m])), [stock]);
  const stockByName = useMemo(() => new Map((stock || []).map((m) => [key(m.name), m])), [stock]);
  const libByName = useMemo(() => new Map((library || []).map((m) => [key(m.name), m])), [library]);
  const names = useMemo(() => [...new Set([...(stock || []).map((m) => m.name), ...(library || []).map((m) => m.name)].filter(Boolean))].sort(), [stock, library]);

  const [recipeId, setRecipeId] = useState("");
  const [ins, setIns] = useState([blankIn()]);
  const [outs, setOuts] = useState([blankOut()]);
  const [waste, setWaste] = useState({ qty: "", of: "" });
  const [labour, setLabour] = useState("");
  const [date, setDate] = useState(istToday());
  const [note, setNote] = useState("");
  const [prev, setPrev] = useState(null);
  const [prevErr, setPrevErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const recipe = (recipes || []).find((r) => String(r.id) === String(recipeId)) || null;

  // Output ki unit: store me pehle se hai to wahi (taala), Library me hai to uski, warna jo likho.
  const outUnit = (o) => {
    const s = stockByName.get(key(o.name));
    if (s) return { unit: s.unit, locked: true, existing: true };
    const l = libByName.get(key(o.name));
    return { unit: o.unit || (l && l.unit) || "Nos", locked: false, existing: false };
  };
  const inLines = ins.filter((l) => l.id && num(l.qty) > 0);
  const outLines = outs.filter((o) => o.name.trim() && num(o.qty) > 0);
  const anyShare = outs.length > 1 && outs.some((o) => o.share !== "");

  const body = useMemo(() => {
    if (!inLines.length || !outLines.length) return null;
    const wOf = waste.of || (inLines[0] && inLines[0].id);
    const wMat = byId.get(String(wOf));
    return {
      warehouse_id: Number(whId), date, note, labour_cost: labour === "" ? 0 : Number(labour), recipe_id: recipe ? recipe.id : null,
      inputs: inLines.map((l) => ({ material_id: Number(l.id), qty: Number(l.qty), unit: (byId.get(String(l.id)) || {}).unit })),
      outputs: outLines.map((o) => {
        const s = stockByName.get(key(o.name));
        return { material_id: s ? s.id : null, name: o.name.trim(), qty: Number(o.qty), unit: outUnit(o).unit,
          ...(anyShare ? { share_pct: o.share === "" ? null : Number(o.share) } : {}) };
      }),
      wastage: num(waste.qty) > 0 && wMat ? { qty: Number(waste.qty), unit: wMat.unit, material_id: wMat.id } : null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([ins, outs, waste, labour, date, note, recipeId, whId])]);

  // Live hisaab — rukne ke 450ms baad server se (kuch save nahi hota).
  useEffect(() => {
    if (!body) { setPrev(null); setPrevErr(""); return undefined; }
    let alive = true;
    const tm = setTimeout(() => {
      api.post("/conversions/preview", body).then((r) => {
        if (!alive) return;
        if (r && r.success) { setPrev(r.data); setPrevErr(""); } else { setPrev(null); setPrevErr((r && r.message) || ""); }
      }).catch(() => {});
    }, 450);
    return () => { alive = false; clearTimeout(tm); };
  }, [body]);

  // Nuskha chuna — output me nuskha ka item, input me us naam ka store item.
  const pickRecipe = (id) => {
    setRecipeId(id);
    const r = (recipes || []).find((x) => String(x.id) === String(id));
    if (!r) return;
    const m = stockByName.get(key(r.in_material_name));
    setOuts((o) => [{ ...(o[0] || blankOut()), name: r.out_material_name, unit: r.out_unit }, ...o.slice(1)]);
    if (m) setIns((l) => [{ ...(l[0] || blankIn()), id: String(m.id) }, ...l.slice(1)]);
  };
  const recOut = recipe ? outs.find((o) => key(o.name) === key(recipe.out_material_name) && num(o.qty) > 0) : null;
  const sugg = recOut ? suggestIn(recipe, recOut.qty) : null;
  const applySugg = () => {
    const m = stockByName.get(key(recipe.in_material_name));
    if (!m || sugg == null) return;
    setIns((l) => {
      const i = l.findIndex((x) => String(x.id) === String(m.id));
      if (i >= 0) return l.map((x, j) => (j === i ? { ...x, qty: String(sugg) } : x));
      return [...l.filter((x) => x.id), { id: String(m.id), qty: String(sugg) }];
    });
  };

  const save = async () => {
    setErr("");
    if (!body) { setErr(t("conversion.need_lines")); return; }
    setBusy(true);
    const r = await api.post("/conversions", body).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    const warn = (r.warnings || []).length ? "\n⚠ " + r.warnings.join("\n⚠ ") : "";
    window.alert((r.message || "") + warn);
    onSaved && onSaved(r.data);
  };

  const pv = (i, k) => (prev && prev[k] && prev[k][i]) || null;
  const nus = prev && prev.nuskha;

  return (
    <Drawer title={t("conversion.title_store", { name: whName || "" })} sub={t("conversion.subtitle")} onClose={onClose}
      footer={<>
        <button onClick={onClose} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} style={{ ...btn(T.ind), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.saving") : t("conversion.save")}</button>
      </>}>

      {/* Nuskha */}
      <div style={{ marginBottom: 14 }}>
        <span style={lbl}>{t("conversion.recipe")}</span>
        <PickSelect value={recipeId} onChange={(e) => pickRecipe(e.target.value)} style={inp}>
          <option value="">{t("conversion.recipe_none")}</option>
          {(recipes || []).map((r) => <option key={r.id} value={r.id}>{r.name} — {recipeLine(r)}</option>)}
        </PickSelect>
        {sugg != null && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: T.ind, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{t("conversion.recipe_hint", { qty: fmtQ(sugg), unit: recipe.in_unit, material: recipe.in_material_name })}</span>
            <button onClick={applySugg} style={{ ...btn(T.indL, T.ind), padding: "3px 10px", fontSize: 11 }}>{t("conversion.recipe_apply")}</button>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 6 }}>{t("conversion.inputs")}</div>
      {ins.map((l, i) => {
        const m = byId.get(String(l.id));
        const p = pv(i, "inputs");
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 70px 120px 28px", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <PickSelect value={l.id} onChange={(e) => setIns((x) => x.map((y, j) => (j === i ? { ...y, id: e.target.value } : y)))} style={inp}>
              <option value="">{t("conversion.pick_material")}</option>
              {avail.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmtQ(s.qty)} {s.unit}</option>)}
            </PickSelect>
            <input type="number" min="0" value={l.qty} placeholder={t("conversion.qty")} onChange={(e) => setIns((x) => x.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)))} style={inp} />
            <span style={{ fontSize: 12, color: T.t3 }}>{m ? m.unit : ""}</span>
            <span style={{ fontSize: 11, color: T.t3 }}>{p ? t("conversion.rate_per", { rate: fmtQ(p.rate), unit: p.unit }) : (m ? t("conversion.in_stock", { qty: fmtQ(m.qty), unit: m.unit }) : "")}</span>
            <button onClick={() => setIns((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankIn()]))} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        );
      })}
      <button onClick={() => setIns((x) => [...x, blankIn()])} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5, marginBottom: 14 }}>{t("conversion.add_line")}</button>

      {/* Output */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 6 }}>{t("conversion.outputs")}</div>
      <datalist id="cnv-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id="cnv-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      {outs.map((o, i) => {
        const u = outUnit(o);
        const p = pv(i, "outputs");
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: outs.length > 1 ? "1fr 100px 90px 80px 28px" : "1fr 100px 90px 28px", gap: 8, alignItems: "center" }}>
              <input list="cnv-names" value={o.name} placeholder={t("conversion.output_name_ph")} onChange={(e) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} style={inp} />
              <input type="number" min="0" value={o.qty} placeholder={t("conversion.qty")} onChange={(e) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)))} style={inp} />
              {u.locked
                ? <span style={{ fontSize: 12, color: T.t3 }}>{u.unit}</span>
                : <input list="cnv-units" value={o.unit || u.unit} onChange={(e) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, unit: e.target.value } : y)))} style={inp} />}
              {outs.length > 1 && <input type="number" min="0" max="100" value={o.share} placeholder={t("conversion.share")} onChange={(e) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, share: e.target.value } : y)))} style={inp} />}
              <button onClick={() => setOuts((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blankOut()]))} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {o.name.trim() && !u.existing && <span style={{ color: T.ind, fontWeight: 600 }}>{t("conversion.new_item")}</span>}
              {p && <span style={{ color: T.t1, fontWeight: 700 }}>{t("conversion.out_rate", { amount: inr(p.amount), rate: fmtQ(p.rate), unit: p.unit, pct: fmtQ(p.share_pct) })}</span>}
            </div>
          </div>
        );
      })}
      <button onClick={() => setOuts((x) => [...x, blankOut()])} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5 }}>{t("conversion.add_line")}</button>
      {outs.length > 1 && <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("conversion.share_hint")}</div>}

      {/* Wastage + banwai */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div>
          <span style={lbl}>{t("conversion.wastage")}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" min="0" value={waste.qty} onChange={(e) => setWaste((w) => ({ ...w, qty: e.target.value }))} style={{ ...inp, width: 110 }} />
            {inLines.length > 1
              ? <PickSelect value={waste.of || inLines[0].id} onChange={(e) => setWaste((w) => ({ ...w, of: e.target.value }))} style={inp}>
                  {inLines.map((l) => { const m = byId.get(String(l.id)); return <option key={l.id} value={l.id}>{m ? `${m.name} (${m.unit})` : l.id}</option>; })}
                </PickSelect>
              : <span style={{ fontSize: 12, color: T.t3, alignSelf: "center" }}>{inLines[0] ? (byId.get(String(inLines[0].id)) || {}).unit : ""}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{t("conversion.wastage_hint_store")}</div>
        </div>
        <div>
          <span style={lbl}>{t("conversion.labour")}</span>
          <input type="number" min="0" value={labour} onChange={(e) => setLabour(e.target.value)} style={inp} />
        </div>
        <div>
          <span style={lbl}>{t("common.date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </div>
        <div>
          <span style={lbl}>{t("conversion.note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={inp} />
        </div>
      </div>

      {/* Cost */}
      <div style={{ marginTop: 16, padding: "11px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{t("conversion.cost_title")}</div>
        {prev ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, fontSize: 12.5 }}>
            <div><div style={{ color: T.t4, fontSize: 10.5 }}>{t("conversion.cost_input")}</div><b>{inr(prev.input_cost)}</b></div>
            <div><div style={{ color: T.t4, fontSize: 10.5 }}>{t("conversion.cost_labour")}</div><b>{inr(prev.labour_cost)}</b></div>
            <div><div style={{ color: T.t4, fontSize: 10.5 }}>{t("conversion.cost_total")}</div><b style={{ color: T.ind }}>{inr(prev.total_cost)}</b></div>
          </div>
        ) : <div style={{ fontSize: 12, color: prevErr ? T.red : T.t4 }}>{prevErr || t("conversion.preview_wait")}</div>}
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("conversion.cost_basis_store")}</div>
      </div>
      {nus && (
        <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 8, fontSize: 12,
          background: nus.over ? T.ambL : T.grnL, border: `1px solid ${nus.over ? T.ambM : "#A7F3D0"}`, color: nus.over ? T.amb : T.grn }}>
          {nus.over
            ? "⚠ " + t("conversion.nuskha_over", { pct: fmtQ(nus.actual_pct), allowed: fmtQ(nus.allowed_pct), expected: fmtQ(nus.expected_in), unit: nus.unit })
            : t("conversion.nuskha_ok", { pct: fmtQ(nus.actual_pct), allowed: fmtQ(nus.allowed_pct), expected: fmtQ(nus.expected_in), unit: nus.unit })}
        </div>
      )}
      {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Detail + Cancel (Admin)
// ════════════════════════════════════════════════════════════════
function ConversionDetail({ conv, isAdmin, onClose, onCancelled }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const c = conv;
  const kindL = { in: t("conversion.kind_in"), out: t("conversion.kind_out"), waste: t("conversion.kind_waste") };
  const doCancel = async () => {
    setErr("");
    if (reason.trim().length < 3) { setErr(t("conversion.cancel_reason_short")); return; }
    setBusy(true);
    const r = await api.post(`/conversions/${c.id}/cancel`, { reason: reason.trim(), password: pw }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    window.alert(r.message || "");
    onCancelled && onCancelled();
  };
  return (
    <Drawer width={560} title={c.conversion_no} sub={[fmtDate(c.date), c.created_by_name ? t("conversion.created_by", { name: c.created_by_name }) : ""].filter(Boolean).join(" · ")} onClose={onClose}
      footer={isAdmin && c.status !== "Cancelled" && !open ? <button onClick={() => setOpen(true)} style={btn(T.red)}>{t("conversion.cancel_btn")}</button> : null}>
      <div style={{ marginBottom: 10 }}><Chip s={statusChip(c.status)} /></div>
      {(c.lines || []).map((l) => (
        <div key={l.id} style={{ display: "grid", gridTemplateColumns: "70px 1fr 110px 110px", gap: 8, padding: "7px 0", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 }}>
          <span style={{ fontWeight: 700, color: l.kind === "out" ? T.grn : l.kind === "waste" ? T.amb : T.red }}>{kindL[l.kind] || l.kind}</span>
          <span>{l.material_name}{Number(l.is_new) ? <span style={{ marginLeft: 6, fontSize: 10, color: T.ind, fontWeight: 700 }}>{t("conversion.new_badge")}</span> : null}</span>
          <span style={{ textAlign: "right" }}>{fmtQ(l.qty)} {l.unit}</span>
          <span style={{ textAlign: "right", color: T.t3 }}>{l.kind === "waste" ? "—" : t("conversion.rate_per", { rate: fmtQ(l.rate), unit: l.unit })}</span>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 12, fontSize: 12.5 }}>
        <div><div style={{ color: T.t4, fontSize: 10.5 }}>{t("conversion.cost_input")}</div><b>{inr(c.input_cost)}</b></div>
        <div><div style={{ color: T.t4, fontSize: 10.5 }}>{t("conversion.cost_labour")}</div><b>{inr(c.labour_cost)}</b></div>
        <div><div style={{ color: T.t4, fontSize: 10.5 }}>{t("conversion.cost_total")}</div><b>{inr(c.total_cost)}</b></div>
      </div>
      {c.note && <div style={{ marginTop: 10, fontSize: 12, color: T.t2, fontStyle: "italic" }}>"{c.note}"</div>}
      {c.status === "Cancelled" && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.t3 }}>{t("conversion.cancelled_by", { name: c.cancelled_by_name || "—", reason: c.cancel_reason || "" })}</div>
      )}
      {open && (
        <div style={{ marginTop: 14, padding: "12px 14px", background: T.redL, border: `1.5px solid ${T.red}44`, borderRadius: 9 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>{t("conversion.cancel_title", { no: c.conversion_no })}</div>
          <div style={{ fontSize: 11, color: T.t3, margin: "3px 0 9px" }}>{t("conversion.cancel_hint")}</div>
          <span style={lbl}>{t("conversion.cancel_reason")}</span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inp, resize: "vertical", marginBottom: 8 }} />
          <span style={lbl}>{t("conversion.cancel_pw")}</span>
          <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
          {err && <div style={{ fontSize: 11.5, color: T.red, fontWeight: 600, marginTop: 7 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setOpen(false); setErr(""); setPw(""); }} style={btn(T.surface, T.t2, T.b2)}>{t("common.close")}</button>
            <button onClick={doCancel} disabled={busy} style={{ ...btn(T.red), opacity: busy ? 0.6 : 1 }}>{busy ? t("conversion.cancelling") : t("conversion.cancel_confirm")}</button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Nuskha (BOM) — banana / badalna / hatana
// ════════════════════════════════════════════════════════════════
const blankRecipe = () => ({ id: null, name: "", out_material_name: "", out_qty: "1", out_unit: "Nos", in_material_name: "", in_qty: "", in_unit: "Kg", wastage_pct: "3" });

function RecipesPanel({ recipes, names, canEdit, onClose, onChanged }) {
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(""); setBusy(true);
    const b = { ...edit };
    const r = await (edit.id ? api.put(`/conversions/recipes/${edit.id}`, b) : api.post("/conversions/recipes", b)).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("conversion.save_failed")); return; }
    setEdit(null); onChanged && onChanged();
  };
  const remove = async (r) => {
    if (!(await window.confirmAsync(t("conversion.recipe_delete_confirm", { name: r.name })))) return;
    const x = await api.del(`/conversions/recipes/${r.id}`).catch((e) => ({ success: false, message: e.message }));
    if (!x || !x.success) { window.alert((x && x.message) || t("conversion.save_failed")); return; }
    onChanged && onChanged();
  };
  const F = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  return (
    <Drawer width={620} title={t("conversion.recipes_title")} sub={t("conversion.recipes_hint")} onClose={onClose}
      footer={canEdit && !edit ? <button onClick={() => setEdit(blankRecipe())} style={btn(T.ind)}>{t("conversion.recipe_new")}</button> : null}>
      <datalist id="cnv-rnames">{(names || []).map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id="cnv-runits">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      {edit && (
        <div style={{ padding: "12px 14px", border: `1.5px solid ${T.ind}55`, borderRadius: 9, marginBottom: 14, background: T.indL }}>
          <span style={lbl}>{t("conversion.recipe_name")}</span>
          <input value={edit.name} onChange={(e) => F("name", e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <span style={lbl}>{t("conversion.recipe_out")}</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 6, marginBottom: 8 }}>
            <input list="cnv-rnames" value={edit.out_material_name} onChange={(e) => F("out_material_name", e.target.value)} style={inp} />
            <input type="number" value={edit.out_qty} onChange={(e) => F("out_qty", e.target.value)} style={inp} />
            <input list="cnv-runits" value={edit.out_unit} onChange={(e) => F("out_unit", e.target.value)} style={inp} />
          </div>
          <span style={lbl}>{t("conversion.recipe_in")}</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 6, marginBottom: 8 }}>
            <input list="cnv-rnames" value={edit.in_material_name} onChange={(e) => F("in_material_name", e.target.value)} style={inp} />
            <input type="number" value={edit.in_qty} onChange={(e) => F("in_qty", e.target.value)} style={inp} />
            <input list="cnv-runits" value={edit.in_unit} onChange={(e) => F("in_unit", e.target.value)} style={inp} />
          </div>
          <span style={lbl}>{t("conversion.recipe_waste")}</span>
          <input type="number" value={edit.wastage_pct} onChange={(e) => F("wastage_pct", e.target.value)} style={{ ...inp, width: 120 }} />
          {err && <div style={{ fontSize: 11.5, color: T.red, fontWeight: 600, marginTop: 7 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setEdit(null); setErr(""); }} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
            <button onClick={save} disabled={busy} style={{ ...btn(T.ind), opacity: busy ? 0.6 : 1 }}>{t("common.save")}</button>
          </div>
        </div>
      )}
      {(recipes || []).length === 0 && !edit && <div style={{ fontSize: 12.5, color: T.t4, padding: "20px 0", textAlign: "center" }}>{t("conversion.recipes_empty")}</div>}
      {(recipes || []).map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: T.t3 }}>{recipeLine(r)} · {t("conversion.recipe_waste_short", { pct: fmtQ(r.wastage_pct) })}</div>
          </div>
          {canEdit && <button onClick={() => setEdit({ ...r, out_qty: String(r.out_qty), in_qty: String(r.in_qty), wastage_pct: String(r.wastage_pct) })} style={{ ...btn(T.surface, T.ind, T.b1), padding: "4px 10px", fontSize: 11.5 }}>{t("common.edit")}</button>}
          {canEdit && <button onClick={() => remove(r)} style={{ ...btn(T.surface, T.red, T.b1), padding: "4px 10px", fontSize: 11.5 }}>{t("common.delete")}</button>}
        </div>
      ))}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab — store ke Conversion ki list + "🔄 Conversion" + "📋 Nuskha"
// ════════════════════════════════════════════════════════════════
export function ConversionTab({ whId, whName, stock, library, canEntry, isAdmin, onStockChanged }) {
  const [list, setList] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const load = useCallback(() => {
    if (!whId) return;
    api.get(`/conversions?warehouse_id=${encodeURIComponent(whId)}`).then((r) => setList(r && r.success ? r.data || [] : [])).catch(() => setList([]));
    api.get("/conversions/recipes").then((r) => setRecipes(r && r.success ? r.data || [] : [])).catch(() => {});
  }, [whId]);
  useEffect(() => { load(); }, [load]);
  const names = useMemo(() => [...new Set([...(stock || []).map((m) => m.name), ...(library || []).map((m) => m.name)].filter(Boolean))].sort(), [stock, library]);
  const sum = (c, kind) => (c.lines || []).filter((l) => l.kind === kind).map((l) => `${l.material_name} ${fmtQ(l.qty)} ${l.unit || ""}`).join(", ");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, fontSize: 12, color: T.t3 }}>{t("conversion.subtitle")}</div>
        <button onClick={() => setRecOpen(true)} style={btn(T.surface, T.ind, T.b1)}>{t("conversion.recipes_btn")}</button>
        {canEntry && <button onClick={() => setFormOpen(true)} style={btn(T.ind)}>{t("conversion.btn")}</button>}
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 90px 1fr 1fr 110px 90px", gap: 8, padding: "9px 14px", background: T.surfaceB, fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>
          <span>{t("conversion.col_no")}</span><span>{t("common.date")}</span><span>{t("conversion.kind_in")}</span><span>{t("conversion.kind_out")}</span><span style={{ textAlign: "right" }}>{t("conversion.cost_total")}</span><span />
        </div>
        {list === null && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading")}</div>}
        {list && list.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("conversion.list_empty")}</div>}
        {(list || []).map((c) => (
          <div key={c.id} onClick={() => setDetail(c)} style={{ display: "grid", gridTemplateColumns: "100px 90px 1fr 1fr 110px 90px", gap: 8, padding: "10px 14px", borderTop: `1px solid ${T.b1}`, fontSize: 12.5, cursor: "pointer", opacity: c.status === "Cancelled" ? 0.55 : 1 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{c.conversion_no}</span>
            <span>{fmtDate(c.date)}</span>
            <span style={{ color: T.t2 }}>{sum(c, "in")}</span>
            <span style={{ color: T.t1, fontWeight: 600 }}>{sum(c, "out")}</span>
            <span style={{ textAlign: "right", fontWeight: 700 }}>{inr(c.total_cost)}</span>
            <span style={{ textAlign: "right" }}><Chip s={statusChip(c.status)} /></span>
          </div>
        ))}
      </div>
      {formOpen && <ConversionForm whId={whId} whName={whName} stock={stock} library={library} recipes={recipes}
        onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); onStockChanged && onStockChanged(); }} />}
      {recOpen && <RecipesPanel recipes={recipes} names={names} canEdit={canEntry} onClose={() => setRecOpen(false)} onChanged={load} />}
      {detail && <ConversionDetail conv={detail} isAdmin={isAdmin} onClose={() => setDetail(null)}
        onCancelled={() => { setDetail(null); load(); onStockChanged && onStockChanged(); }} />}
    </div>
  );
}
