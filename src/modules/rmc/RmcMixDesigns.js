// RMC › Setup › Mix designs — ek unit maal me kitna material. draft → active →
// locked (challan ban gaya to). Locked read-only hai; badalna ho to naya version.
// GET/POST/PATCH /rmc/mix-designs · POST /:id/activate · /:id/new-version
//
// Do prakaar:
//   concrete — har material ki ek cum me kitne kg (jaisa pehle se tha)
//   bitumen  — product Library item se (unit wahin se, aksar MT), recipe %
//              me, aur temperature + Marshall ki seema. Seema MORTH (VG-30) ke
//              aam aankdon se pehle se bhari aati hai, har design par badal sakte.
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, fmtN, rget, rpost, rpatch, dataOf, inp, inpSm, Field, Grid, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Notice, Modal, Spinner, Pill, IcAdd, IcX, KindPill, MARSHALL, limitText,
} from "./rmcShared";

const statusLabel = (s) => ({ draft: t("rmc.dsg_draft"), active: t("rmc.dsg_active"), locked: t("rmc.dsg_locked") }[s] || s);
const statusTone = (s) =>
  s === "active" ? { c: T.grn, bg: T.grnL } : s === "locked" ? { c: T.slt, bg: T.sltL } : { c: T.amb, bg: T.ambL };

const LIMIT_KEYS = ["temp_min_c", "temp_max_c", "lay_temp_min_c", "ms_stability_min", "ms_flow_min", "ms_flow_max",
  "ms_voids_min", "ms_voids_max", "ms_binder_min", "ms_binder_max"];
// MT/Ton par ek unit = 1000 kg; baaki (cum…) par density user likhta hai.
const knownUnitKg = (u) => {
  const k = String(u || "").trim().toUpperCase().replace(/[.\s]/g, "");
  if (["MT", "TON", "TONS", "TONNE", "TONNES", "T", "MTS"].includes(k)) return 1000;
  if (["QUINTAL", "QTL", "QT"].includes(k)) return 100;
  if (["KG", "KGS"].includes(k)) return 1;
  return null;
};
// Recipe me bitumen wali line — binder ki seema ka sujhaav isi se.
const BINDER_RX = /bitumen|vg\s*-?\s*\d|crmb|pmb|emulsion/i;
const str = (v) => (v == null ? "" : String(v));
const BLANK = { product_kind: "concrete", grade: "", name: "", wc_ratio: "", slump_mm: "", product_material_id: "", unit_kg: "", items: [] };

function DesignForm({ open, meta, design, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState(BLANK);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (design) {
      const x = {
        product_kind: design.product_kind || "concrete",
        grade: design.grade || "", name: design.name || "",
        wc_ratio: str(design.wc_ratio), slump_mm: str(design.slump_mm),
        product_material_id: design.product_material_id || "", unit_kg: str(design.unit_kg),
        items: (design.items || []).map((i) => ({
          material_id: i.material_id || "", material_name: i.material_name || "",
          qty_kg: i.qty_kg, pct: str(i.pct), unit: i.unit || "", kg_per_unit: i.kg_per_unit,
        })),
      };
      LIMIT_KEYS.forEach((k) => { x[k] = str(design[k]); });
      setV(x);
    } else {
      setV(BLANK);
    }
    setErr("");
  }, [open, design]);

  const bit = v.product_kind === "bitumen";
  const product = (meta.materials || []).find((m) => String(m.id) === String(v.product_material_id)) || null;
  const pUnit = product && product.unit ? product.unit : "";
  const autoKg = knownUnitKg(pUnit);

  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));
  // Bitumen chunne par MORTH ke aam aankde bhar do (sirf jo khaane abhi bhare nahi).
  const setKind = (k) => setV((x) => {
    const n = { ...x, product_kind: k };
    if (k === "bitumen") {
      const d = meta.bitumen_defaults || {};
      LIMIT_KEYS.forEach((key) => { if ((n[key] == null || n[key] === "") && d[key] != null) n[key] = String(d[key]); });
    }
    return n;
  });
  const updItem = (i, patch) => setV((x) => ({ ...x, items: x.items.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const delItem = (i) => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }));
  const addItem = () => setV((x) => ({ ...x, items: [...x.items, { material_id: "", material_name: "", qty_kg: "", pct: "", unit: "", kg_per_unit: "" }] }));

  const pctTotal = v.items.reduce((s2, i) => s2 + N(i.pct), 0);
  const binderLine = bit ? v.items.find((i) => BINDER_RX.test(i.material_name || "") && N(i.pct) > 0) : null;

  const save = async () => {
    setErr(""); setBusy(true);
    const body = {
      product_kind: v.product_kind,
      grade: v.grade, name: v.name || null,
      wc_ratio: !bit && v.wc_ratio !== "" ? Number(v.wc_ratio) : null,
      slump_mm: !bit && v.slump_mm !== "" ? Number(v.slump_mm) : null,
      items: v.items.filter((i) => i.material_name || i.material_id).map((i) => ({
        material_id: i.material_id || null, material_name: i.material_name,
        qty_kg: bit ? 0 : Number(i.qty_kg) || 0, pct: bit ? (i.pct === "" ? null : Number(i.pct)) : null,
        unit: i.unit || null, kg_per_unit: Number(i.kg_per_unit) || 1,
      })),
    };
    if (bit) {
      body.product_material_id = v.product_material_id || null;
      body.unit_kg = v.unit_kg === "" ? null : Number(v.unit_kg);
      LIMIT_KEYS.forEach((k) => { body[k] = v[k] === "" ? null : Number(v[k]); });
    }
    // Kind banne ke baad nahi badalta — edit par bhejna hi mat.
    if (design) delete body.product_kind;
    const r = design ? await rpatch(`/mix-designs/${design.id}`, body) : await rpost("/mix-designs", body);
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onSaved(); onClose();
  };

  const canSave = v.items.length > 0 && (bit ? !!v.product_material_id : !!v.grade);
  const lim = (k, ph) => (
    <input style={{ ...inpSm, width: 90 }} type="number" step="0.1" value={v[k] || ""} placeholder={ph}
      onChange={(e) => upd(k, e.target.value)} />
  );
  const limRow = { display: "flex", gap: 6, alignItems: "center" };

  return (
    <Modal open={open} onClose={onClose} width={820}
      title={design ? t("rmc.edit_design") : t("rmc.new_design")} sub={bit ? t("rmc.design_sub_bitumen") : t("rmc.design_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !canSave}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
      </>}>
      <Grid style={{ marginBottom: 14 }}>
        <Field label={t("rmc.kind")} hint={design ? t("rmc.kind_fixed_hint") : null}>
          <select style={inp} value={v.product_kind} disabled={!!design} onChange={(e) => setKind(e.target.value)}>
            <option value="concrete">{t("rmc.kind_concrete")}</option>
            <option value="bitumen">{t("rmc.kind_bitumen")}</option>
          </select>
        </Field>
        {bit ? (
          <Field label={t("rmc.product")} hint={pUnit ? t("rmc.unit_from_product", { unit: pUnit }) : t("rmc.product_hint")}>
            <select style={inp} value={v.product_material_id || ""} onChange={(e) => upd("product_material_id", e.target.value)}>
              <option value="">{t("rmc.select_product")}</option>
              {(meta.materials || []).map((m) => <option key={m.id} value={m.id}>{m.name}{m.unit ? ` (${m.unit})` : ""}</option>)}
            </select>
          </Field>
        ) : <div />}
        <Field label={t("rmc.grade")} hint={bit ? t("rmc.grade_bitumen_hint") : null}>
          <input style={inp} value={v.grade} disabled={!!design} onChange={(e) => upd("grade", e.target.value)}
            placeholder={bit ? t("rmc.grade_bitumen_ph") : "M25"} />
        </Field>
        <Field label={t("rmc.design_name")}>
          <input style={inp} value={v.name} onChange={(e) => upd("name", e.target.value)} />
        </Field>
        {bit ? (
          <Field label={t("rmc.unit_kg", { unit: pUnit || t("rmc.unit_generic") })} hint={t("rmc.unit_kg_hint")}>
            <input style={inp} type="number" step="0.001" value={v.unit_kg}
              placeholder={autoKg ? String(autoKg) : "2350"} onChange={(e) => upd("unit_kg", e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label={t("rmc.wc_ratio")}>
              <input style={inp} type="number" step="0.01" value={v.wc_ratio} onChange={(e) => upd("wc_ratio", e.target.value)} placeholder="0.45" />
            </Field>
            <Field label={t("rmc.slump_mm")}>
              <input style={inp} type="number" value={v.slump_mm} onChange={(e) => upd("slump_mm", e.target.value)} placeholder="110" />
            </Field>
          </>
        )}
      </Grid>

      {bit && (
        <Panel title={t("rmc.qc_limits")} style={{ marginBottom: 14 }}>
          <div style={{ padding: 12 }}>
            <Notice>{t("rmc.defaults_note")}</Notice>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px 14px", alignItems: "center", fontSize: 12, color: T.t2 }}>
              <span>{t("rmc.temp_dispatch_range")}</span>
              <span style={limRow}>{lim("temp_min_c", "150")} – {lim("temp_max_c", "165")} °C</span>
              <span>{t("rmc.temp_lay_min")}</span>
              <span style={limRow}>{lim("lay_temp_min_c", "140")} °C</span>
              <span>{t("rmc.ms_stability_min")}</span>
              <span style={limRow}>{lim("ms_stability_min", "9")} {MARSHALL[0].unit}</span>
              <span>{t("rmc.ms_flow")}</span>
              <span style={limRow}>{lim("ms_flow_min", "2")} – {lim("ms_flow_max", "4")} mm</span>
              <span>{t("rmc.ms_voids")}</span>
              <span style={limRow}>{lim("ms_voids_min", "3")} – {lim("ms_voids_max", "5")} %</span>
              <span>
                {t("rmc.ms_binder")}
                {binderLine && <div style={{ fontSize: 10.5, color: T.t4 }}>{t("rmc.ms_binder_hint", { pct: fmtN(binderLine.pct) })}</div>}
              </span>
              <span style={limRow}>
                {lim("ms_binder_min", binderLine ? String(Math.round((N(binderLine.pct) - 0.3) * 10) / 10) : "")} –{" "}
                {lim("ms_binder_max", binderLine ? String(Math.round((N(binderLine.pct) + 0.3) * 10) / 10) : "")} %
              </span>
            </div>
          </div>
        </Panel>
      )}

      <Panel title={bit ? t("rmc.recipe_pct") : t("rmc.per_cum_items")}
        action={<Btn size="sm" ghost icon={IcAdd} onClick={addItem}>{t("rmc.add_item")}</Btn>}>
        <div style={{ padding: 12 }}>
          <Notice>{bit ? t("rmc.pct_note") : t("rmc.kg_per_unit_note")}</Notice>
          {v.items.length === 0 && <div style={{ fontSize: 11.5, color: T.t4 }}>{t("rmc.no_items_yet")}</div>}
          {v.items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <select style={{ ...inpSm, width: 170 }} value={it.material_id || ""}
                onChange={(e) => {
                  const hit = (meta.materials || []).find((x) => String(x.id) === e.target.value);
                  updItem(i, { material_id: e.target.value, material_name: hit ? hit.name : it.material_name, unit: hit && hit.unit ? hit.unit : it.unit });
                }}>
                <option value="">{t("rmc.select_material")}</option>
                {(meta.materials || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <input style={{ ...inpSm, width: 140 }} placeholder={t("rmc.material_name")} value={it.material_name}
                onChange={(e) => updItem(i, { material_name: e.target.value })} />
              {bit ? (
                <input style={{ ...inpSm, width: 90 }} type="number" step="0.01" placeholder={t("rmc.pct_ph")} value={it.pct}
                  onChange={(e) => updItem(i, { pct: e.target.value })} />
              ) : (
                <input style={{ ...inpSm, width: 110 }} type="number" step="0.001" placeholder={t("rmc.qty_kg")} value={it.qty_kg}
                  onChange={(e) => updItem(i, { qty_kg: e.target.value })} />
              )}
              <input style={{ ...inpSm, width: 80 }} placeholder={t("rmc.unit")} value={it.unit}
                onChange={(e) => updItem(i, { unit: e.target.value })} />
              <input style={{ ...inpSm, width: 130 }} type="number" step="0.0001" value={it.kg_per_unit}
                placeholder={t("rmc.kg_per_unit_ph", { unit: it.unit || t("rmc.unit") })}
                onChange={(e) => updItem(i, { kg_per_unit: e.target.value })} />
              <button type="button" onClick={() => delItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, display: "flex", padding: 4 }}>
                <IcX size={13} color="currentColor" />
              </button>
            </div>
          ))}
          {bit && v.items.length > 0 && (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: Math.abs(pctTotal - 100) > 0.5 ? T.amb : T.grn, marginTop: 4 }}>
              {t("rmc.pct_total", { n: fmtN(pctTotal) })}{Math.abs(pctTotal - 100) > 0.5 ? " · " + t("rmc.pct_total_warn") : ""}
            </div>
          )}
        </div>
      </Panel>
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

function DesignCard({ d, canEdit, canCreate, onEdit, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const locked = d.status === "locked";
  const bit = d.product_kind === "bitumen";
  const unit = d.unit || "cum";
  const call = async (what) => {
    setErr(""); setBusy(what);
    const r = await rpost(`/mix-designs/${d.id}/${what}`, {});
    setBusy("");
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onChanged();
  };
  const tone = statusTone(d.status);

  return (
    <Panel style={{ marginBottom: 14 }}
      title={`${d.grade} · v${d.version}${d.name ? " · " + d.name : ""}`}
      action={<div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <KindPill k={d.product_kind} />
        <Pill label={statusLabel(d.status)} c={tone.c} bg={tone.bg} />
        {canEdit && !locked && <Btn size="sm" ghost onClick={() => onEdit(d)}>{t("common.edit")}</Btn>}
        {canEdit && d.status !== "active" && <Btn size="sm" onClick={() => call("activate")} disabled={busy === "activate"}>{t("rmc.activate")}</Btn>}
        {canCreate && locked && <Btn size="sm" ghost onClick={() => call("new-version")} disabled={busy === "new-version"}>{t("rmc.new_version")}</Btn>}
      </div>}>
      {locked && <div style={{ padding: "10px 14px 0" }}><Notice tone="warn">{t("rmc.locked_note")}</Notice></div>}
      {bit && (
        <div style={{ padding: "10px 14px 0", fontSize: 11.5, color: T.t3, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span>{t("rmc.product")}: <b style={{ color: T.t1 }}>{d.product_name || "—"}</b> ({unit})</span>
          <span>{t("rmc.unit_kg", { unit })}: <b style={{ color: T.t1 }}>{fmtN(d.unit_kg)}</b></span>
        </div>
      )}
      <Scroll minWidth={520}>
        <Row cols="1fr 110px 90px 130px 110px" head>
          <span>{t("rmc.material")}</span>
          <span style={{ textAlign: "right" }}>{bit ? t("rmc.pct_col") : t("rmc.qty_kg")}</span>
          <span>{t("rmc.unit")}</span>
          <span style={{ textAlign: "right" }}>{t("rmc.kg_per_unit")}</span>
          <span style={{ textAlign: "right" }}>{bit ? t("rmc.per_unit_qty", { unit }) : t("rmc.qty_in_unit")}</span>
        </Row>
        {(d.items || []).length === 0 ? <Empty>{t("rmc.no_items_yet")}</Empty> : (d.items || []).map((i) => (
          <Row key={i.id} cols="1fr 110px 90px 130px 110px">
            <span style={{ color: T.t1, fontWeight: 600 }}>{i.material_name}</span>
            <span style={{ textAlign: "right" }}>{bit ? (i.pct == null ? "—" : fmtN(i.pct) + "%") : fmtN(i.qty_kg)}</span>
            <span style={{ color: T.t3 }}>{i.unit || "—"}</span>
            <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(i.kg_per_unit)}</span>
            <span style={{ textAlign: "right", fontWeight: 700 }}>
              {N(i.kg_per_unit) > 0 ? fmtN(N(i.qty_kg) / N(i.kg_per_unit)) : "—"}
            </span>
          </Row>
        ))}
      </Scroll>
      <div style={{ padding: "8px 14px", fontSize: 11, color: T.t4, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {!bit && d.wc_ratio != null && <span>{t("rmc.wc_ratio")}: {fmtN(d.wc_ratio)}</span>}
        {!bit && d.slump_mm != null && <span>{t("rmc.slump_mm")}: {d.slump_mm}</span>}
        {bit && <span>{t("rmc.temp_dispatch_range")}: {d.temp_min_c != null || d.temp_max_c != null ? `${fmtN(d.temp_min_c)} – ${fmtN(d.temp_max_c)} °C` : "—"}</span>}
        {bit && <span>{t("rmc.temp_lay_min")}: {d.lay_temp_min_c != null ? `${fmtN(d.lay_temp_min_c)} °C` : "—"}</span>}
        {bit && MARSHALL.map((f) => <span key={f.key}>{f.label()}: {limitText(d, f)} {f.unit}</span>)}
      </div>
      <ErrBox>{err}</ErrBox>
    </Panel>
  );
}

function RmcMixDesigns({ meta, canCreate, canEdit, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOn, setFormOn] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(dataOf(await rget("/mix-designs"), []));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const saved = () => { load(); if (onChanged) onChanged(); };

  return (
    <div>
      <Notice>{t("rmc.design_note")}</Notice>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        {canCreate && <Btn icon={IcAdd} onClick={() => { setEditing(null); setFormOn(true); }}>{t("rmc.new_design")}</Btn>}
      </div>
      {loading ? <Spinner label={t("common.loading")} />
        : rows.length === 0 ? <Panel><Empty>{t("rmc.no_designs")}</Empty></Panel>
          : rows.map((d) => (
            <DesignCard key={d.id} d={d} canEdit={canEdit} canCreate={canCreate}
              onEdit={(x) => { setEditing(x); setFormOn(true); }} onChanged={saved} />
          ))}
      <DesignForm open={formOn} meta={meta} design={editing} onClose={() => setFormOn(false)} onSaved={saved} />
    </div>
  );
}

export default RmcMixDesigns;
