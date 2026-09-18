// RMC › Setup › Mix designs — ek cum me kitna material. draft → active →
// locked (challan ban gaya to). Locked read-only hai; badalna ho to naya version.
// GET/POST/PATCH /rmc/mix-designs · POST /:id/activate · /:id/new-version
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, fmtN, rget, rpost, rpatch, dataOf, inp, inpSm, Field, Grid, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Notice, Modal, Spinner, Pill, IcAdd, IcX,
} from "./rmcShared";

const statusLabel = (s) => ({ draft: t("rmc.dsg_draft"), active: t("rmc.dsg_active"), locked: t("rmc.dsg_locked") }[s] || s);
const statusTone = (s) =>
  s === "active" ? { c: T.grn, bg: T.grnL } : s === "locked" ? { c: T.slt, bg: T.sltL } : { c: T.amb, bg: T.ambL };

function DesignForm({ open, meta, design, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ grade: "", name: "", wc_ratio: "", slump_mm: "", items: [] });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(design ? {
      grade: design.grade || "", name: design.name || "",
      wc_ratio: design.wc_ratio == null ? "" : String(design.wc_ratio),
      slump_mm: design.slump_mm == null ? "" : String(design.slump_mm),
      items: (design.items || []).map((i) => ({
        material_id: i.material_id || "", material_name: i.material_name || "",
        qty_kg: i.qty_kg, unit: i.unit || "", kg_per_unit: i.kg_per_unit,
      })),
    } : { grade: "", name: "", wc_ratio: "", slump_mm: "", items: [] });
    setErr("");
  }, [open, design]);

  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const updItem = (i, patch) => setV((x) => ({ ...x, items: x.items.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const delItem = (i) => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }));
  const addItem = () => setV((x) => ({ ...x, items: [...x.items, { material_id: "", material_name: "", qty_kg: "", unit: "", kg_per_unit: "" }] }));

  const save = async () => {
    setErr(""); setBusy(true);
    const body = {
      grade: v.grade, name: v.name || null,
      wc_ratio: v.wc_ratio === "" ? null : Number(v.wc_ratio),
      slump_mm: v.slump_mm === "" ? null : Number(v.slump_mm),
      items: v.items.filter((i) => i.material_name || i.material_id).map((i) => ({
        material_id: i.material_id || null, material_name: i.material_name,
        qty_kg: Number(i.qty_kg) || 0, unit: i.unit || null, kg_per_unit: Number(i.kg_per_unit) || 1,
      })),
    };
    const r = design ? await rpatch(`/mix-designs/${design.id}`, body) : await rpost("/mix-designs", body);
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={780}
      title={design ? t("rmc.edit_design") : t("rmc.new_design")} sub={t("rmc.design_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !v.grade || v.items.length === 0}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
      </>}>
      <Grid style={{ marginBottom: 14 }}>
        <Field label={t("rmc.grade")}>
          <input style={inp} value={v.grade} onChange={(e) => upd("grade", e.target.value)} placeholder="M25" />
        </Field>
        <Field label={t("rmc.design_name")}>
          <input style={inp} value={v.name} onChange={(e) => upd("name", e.target.value)} />
        </Field>
        <Field label={t("rmc.wc_ratio")}>
          <input style={inp} type="number" step="0.01" value={v.wc_ratio} onChange={(e) => upd("wc_ratio", e.target.value)} placeholder="0.45" />
        </Field>
        <Field label={t("rmc.slump_mm")}>
          <input style={inp} type="number" value={v.slump_mm} onChange={(e) => upd("slump_mm", e.target.value)} placeholder="110" />
        </Field>
      </Grid>

      <Panel title={t("rmc.per_cum_items")} action={<Btn size="sm" ghost icon={IcAdd} onClick={addItem}>{t("rmc.add_item")}</Btn>}>
        <div style={{ padding: 12 }}>
          <Notice>{t("rmc.kg_per_unit_note")}</Notice>
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
              <input style={{ ...inpSm, width: 110 }} type="number" step="0.001" placeholder={t("rmc.qty_kg")} value={it.qty_kg}
                onChange={(e) => updItem(i, { qty_kg: e.target.value })} />
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
        <Pill label={statusLabel(d.status)} c={tone.c} bg={tone.bg} />
        {canEdit && !locked && <Btn size="sm" ghost onClick={() => onEdit(d)}>{t("common.edit")}</Btn>}
        {canEdit && d.status !== "active" && <Btn size="sm" onClick={() => call("activate")} disabled={busy === "activate"}>{t("rmc.activate")}</Btn>}
        {canCreate && locked && <Btn size="sm" ghost onClick={() => call("new-version")} disabled={busy === "new-version"}>{t("rmc.new_version")}</Btn>}
      </div>}>
      {locked && <div style={{ padding: "10px 14px 0" }}><Notice tone="warn">{t("rmc.locked_note")}</Notice></div>}
      <Scroll minWidth={520}>
        <Row cols="1fr 110px 90px 130px 110px" head>
          <span>{t("rmc.material")}</span>
          <span style={{ textAlign: "right" }}>{t("rmc.qty_kg")}</span>
          <span>{t("rmc.unit")}</span>
          <span style={{ textAlign: "right" }}>{t("rmc.kg_per_unit")}</span>
          <span style={{ textAlign: "right" }}>{t("rmc.qty_in_unit")}</span>
        </Row>
        {(d.items || []).length === 0 ? <Empty>{t("rmc.no_items_yet")}</Empty> : (d.items || []).map((i) => (
          <Row key={i.id} cols="1fr 110px 90px 130px 110px">
            <span style={{ color: T.t1, fontWeight: 600 }}>{i.material_name}</span>
            <span style={{ textAlign: "right" }}>{fmtN(i.qty_kg)}</span>
            <span style={{ color: T.t3 }}>{i.unit || "—"}</span>
            <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(i.kg_per_unit)}</span>
            <span style={{ textAlign: "right", fontWeight: 700 }}>
              {N(i.kg_per_unit) > 0 ? fmtN(N(i.qty_kg) / N(i.kg_per_unit)) : "—"}
            </span>
          </Row>
        ))}
      </Scroll>
      <div style={{ padding: "8px 14px", fontSize: 11, color: T.t4, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {d.wc_ratio != null && <span>{t("rmc.wc_ratio")}: {fmtN(d.wc_ratio)}</span>}
        {d.slump_mm != null && <span>{t("rmc.slump_mm")}: {d.slump_mm}</span>}
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
