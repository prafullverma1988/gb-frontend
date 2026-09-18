// RMC › Setup › Arrangements — "kiska kya" matrix, grade rate, transport ka
// tareeka aur per-material override. GET/POST/PATCH /rmc/contracts.
// Nested (rates/slabs/materials) hamesha poora jaata hai — backend purane hata
// kar naye likhta hai.
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, rupee, fmtN, rget, rpost, rpatch, dataOf, inp, inpSm, Field, Grid, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Notice, Modal, Spinner, Pill, IcAdd, IcX, supplyLabel, transportModeLabel,
} from "./rmcShared";

const SLAB_MODES = ["slab_cum", "slab_trip"];
const BLANK = {
  name: "", plant_id: "", party_id: "", direction: "buy",
  supply_plant: "own", supply_staff: "own", supply_material: "own", supply_fuel: "own",
  supply_vehicle: "own", supply_pump: "none", transporter_party_id: "",
  transport_mode: "included", transport_free_km: "", transport_rate: "", transport_round_trip: 0,
  min_load_cum: "", short_load_charge: "", free_wait_min: "", wait_rate_hr: "",
  pump_rate_cum: "", pump_min_charge: "", rent_monthly: "", rent_rate_cum: "", rent_min_cum: "",
  wastage_pct: "", valid_from: "", valid_to: "",
  rates: [], slabs: [], materials: [],
};
const numOrNull = (x) => (x === "" || x == null ? null : Number(x));

// Ek chhoti si repeat-row list — grade rate, slab aur material override
// teeno ek jaisi dikhein.
const Rows = ({ title, onAdd, addLabel, children, empty }) => (
  <Panel title={title} action={<Btn size="sm" ghost icon={IcAdd} onClick={onAdd}>{addLabel}</Btn>} style={{ marginBottom: 14 }}>
    <div style={{ padding: 12 }}>
      {children}
      {empty && <div style={{ fontSize: 11.5, color: T.t4, padding: "6px 2px" }}>{empty}</div>}
    </div>
  </Panel>
);
const DelBtn = ({ onClick }) => (
  <button type="button" onClick={onClick}
    style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, display: "flex", padding: 4 }}>
    <IcX size={13} color="currentColor" />
  </button>
);

// Matrix ka ek dropdown. Top level par hai taaki har keystroke par remount na ho.
const MatrixSel = ({ label, hint, value, list, onChange }) => (
  <Field label={label} hint={hint}>
    <select style={inp} value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((o) => <option key={o} value={o}>{supplyLabel(o)}</option>)}
    </select>
  </Field>
);

function ArrangementForm({ open, meta, row, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState(BLANK);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (!row) { setV(BLANK); setErr(""); return; }
    const pick = {};
    Object.keys(BLANK).forEach((k) => { pick[k] = row[k] == null ? BLANK[k] : row[k]; });
    pick.valid_from = row.valid_from ? String(row.valid_from).slice(0, 10) : "";
    pick.valid_to = row.valid_to ? String(row.valid_to).slice(0, 10) : "";
    pick.rates = (row.rates || []).map((r) => ({ grade: r.grade, rate_per_cum: r.rate_per_cum }));
    pick.slabs = (row.slabs || []).map((s) => ({ from_km: s.from_km, to_km: s.to_km == null ? "" : s.to_km, rate: s.rate }));
    pick.materials = (row.materials || []).map((m) => ({ material_id: m.material_id, material_name: m.material_name, supplied_by: m.supplied_by, wastage_pct: m.wastage_pct == null ? "" : m.wastage_pct }));
    setV(pick); setErr("");
  }, [open, row]);

  const opt = (meta.options || {});
  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const updList = (key, i, patch) => setV((x) => ({ ...x, [key]: x[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const delList = (key, i) => setV((x) => ({ ...x, [key]: x[key].filter((_, j) => j !== i) }));
  const slabNeeded = SLAB_MODES.includes(v.transport_mode);

  const save = async () => {
    if (slabNeeded && v.slabs.length === 0) { setErr(t("rmc.slabs_needed")); return; }
    setErr(""); setBusy(true);
    const body = {
      name: v.name, plant_id: v.plant_id || null, party_id: v.party_id || null, direction: v.direction,
      supply_plant: v.supply_plant, supply_staff: v.supply_staff, supply_material: v.supply_material,
      supply_fuel: v.supply_fuel, supply_vehicle: v.supply_vehicle, supply_pump: v.supply_pump,
      transporter_party_id: v.transporter_party_id || null,
      transport_mode: v.transport_mode, transport_free_km: numOrNull(v.transport_free_km) || 0,
      transport_rate: numOrNull(v.transport_rate) || 0, transport_round_trip: v.transport_round_trip ? 1 : 0,
      min_load_cum: numOrNull(v.min_load_cum), short_load_charge: numOrNull(v.short_load_charge),
      free_wait_min: numOrNull(v.free_wait_min), wait_rate_hr: numOrNull(v.wait_rate_hr),
      pump_rate_cum: numOrNull(v.pump_rate_cum), pump_min_charge: numOrNull(v.pump_min_charge),
      rent_monthly: numOrNull(v.rent_monthly), rent_rate_cum: numOrNull(v.rent_rate_cum),
      rent_min_cum: numOrNull(v.rent_min_cum), wastage_pct: numOrNull(v.wastage_pct) || 0,
      valid_from: v.valid_from || null, valid_to: v.valid_to || null,
      rates: v.rates.filter((r) => r.grade).map((r) => ({ grade: r.grade, rate_per_cum: numOrNull(r.rate_per_cum) || 0 })),
      slabs: slabNeeded ? v.slabs.map((s) => ({ from_km: numOrNull(s.from_km) || 0, to_km: s.to_km === "" ? null : Number(s.to_km), rate: numOrNull(s.rate) || 0 })) : [],
      materials: v.materials.filter((m) => m.material_id).map((m) => ({
        material_id: Number(m.material_id), material_name: m.material_name || null,
        supplied_by: m.supplied_by || "own", wastage_pct: numOrNull(m.wastage_pct),
      })),
    };
    const r = row ? await rpatch(`/contracts/${row.id}`, body) : await rpost("/contracts", body);
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={860}
      title={row ? t("rmc.edit_arrangement") : t("rmc.new_arrangement")} sub={t("rmc.arr_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !v.name || !v.plant_id}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
      </>}>
      <Grid style={{ marginBottom: 14 }}>
        <Field label={t("rmc.arr_name")} span={2}>
          <input style={inp} value={v.name} onChange={(e) => upd("name", e.target.value)} placeholder={t("rmc.arr_name_ph")} />
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={v.plant_id} onChange={(e) => upd("plant_id", e.target.value)}>
            <option value="">{t("rmc.select_plant")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.party")}>
          <select style={inp} value={v.party_id} onChange={(e) => upd("party_id", e.target.value)}>
            <option value="">{t("rmc.select_party")}</option>
            {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.direction")}>
          <select style={inp} value={v.direction} onChange={(e) => upd("direction", e.target.value)}>
            <option value="buy">{t("rmc.dir_buy")}</option>
            <option value="sell">{t("rmc.dir_sell")}</option>
          </select>
        </Field>
        <Field label={t("rmc.wastage")}>
          <input style={inp} type="number" step="0.01" value={v.wastage_pct} onChange={(e) => upd("wastage_pct", e.target.value)} />
        </Field>
      </Grid>

      <Panel title={t("rmc.whose_what")} style={{ marginBottom: 14 }}>
        <div style={{ padding: 14 }}>
          <Grid cols={3}>
            <MatrixSel label={t("rmc.sup_plant_l")} value={v.supply_plant} list={opt.owner || ["own", "hired", "vendor"]} onChange={(x) => upd("supply_plant", x)} />
            <MatrixSel label={t("rmc.sup_staff_l")} value={v.supply_staff} list={["own", "vendor"]} onChange={(x) => upd("supply_staff", x)} />
            <MatrixSel label={t("rmc.sup_material_l")} value={v.supply_material} list={opt.supply || ["own", "vendor", "customer"]}
              hint={v.supply_material === "own" ? t("rmc.mat_own_hint") : t("rmc.mat_not_own_hint")} onChange={(x) => upd("supply_material", x)} />
            <MatrixSel label={t("rmc.sup_fuel_l")} value={v.supply_fuel} list={["own", "vendor"]} onChange={(x) => upd("supply_fuel", x)} />
            <MatrixSel label={t("rmc.sup_vehicle_l")} value={v.supply_vehicle} list={opt.vehicle_owner || ["own", "hired", "vendor", "customer"]}
              hint={v.supply_vehicle === "customer" ? t("rmc.veh_customer_hint") : ""} onChange={(x) => upd("supply_vehicle", x)} />
            <MatrixSel label={t("rmc.sup_pump_l")} value={v.supply_pump} list={opt.pump || ["own", "hired", "vendor", "none"]} onChange={(x) => upd("supply_pump", x)} />
          </Grid>
        </div>
      </Panel>

      <Panel title={t("rmc.transport")} style={{ marginBottom: 14 }}>
        <div style={{ padding: 14 }}>
          {v.supply_vehicle === "customer" && <Notice tone="warn">{t("rmc.transport_customer")}</Notice>}
          <Grid cols={3}>
            <Field label={t("rmc.transport_mode")}>
              <select style={inp} value={v.transport_mode} onChange={(e) => upd("transport_mode", e.target.value)}>
                {(opt.transport_mode || ["included", "per_cum_km", "slab_cum", "slab_trip", "per_km_trip", "monthly"])
                  .map((m) => <option key={m} value={m}>{transportModeLabel(m)}</option>)}
              </select>
            </Field>
            <Field label={t("rmc.free_km")}>
              <input style={inp} type="number" step="0.1" value={v.transport_free_km} onChange={(e) => upd("transport_free_km", e.target.value)} />
            </Field>
            <Field label={t("rmc.transport_rate")}>
              <input style={inp} type="number" step="0.01" value={v.transport_rate} onChange={(e) => upd("transport_rate", e.target.value)} />
            </Field>
            <Field label={t("rmc.transporter")}>
              <select style={inp} value={v.transporter_party_id} onChange={(e) => upd("transporter_party_id", e.target.value)}>
                <option value="">{t("rmc.select_party")}</option>
                {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t("rmc.round_trip")}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.t2, cursor: "pointer", paddingTop: 8 }}>
                <input type="checkbox" checked={!!v.transport_round_trip} onChange={(e) => upd("transport_round_trip", e.target.checked ? 1 : 0)} />
                {t("rmc.round_trip_yes")}
              </label>
            </Field>
            <Field label={t("rmc.min_load")}>
              <input style={inp} type="number" step="0.01" value={v.min_load_cum} onChange={(e) => upd("min_load_cum", e.target.value)} />
            </Field>
            <Field label={t("rmc.short_load_charge")}>
              <input style={inp} type="number" step="1" value={v.short_load_charge} onChange={(e) => upd("short_load_charge", e.target.value)} />
            </Field>
            <Field label={t("rmc.free_wait")}>
              <input style={inp} type="number" value={v.free_wait_min} onChange={(e) => upd("free_wait_min", e.target.value)} />
            </Field>
            <Field label={t("rmc.wait_rate")}>
              <input style={inp} type="number" step="1" value={v.wait_rate_hr} onChange={(e) => upd("wait_rate_hr", e.target.value)} />
            </Field>
          </Grid>
        </div>
      </Panel>

      {slabNeeded && (
        <Rows title={t("rmc.slabs")} addLabel={t("rmc.add_slab")}
          onAdd={() => setV((x) => ({ ...x, slabs: [...x.slabs, { from_km: "", to_km: "", rate: "" }] }))}
          empty={v.slabs.length === 0 ? t("rmc.slabs_needed") : ""}>
          {v.slabs.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input style={{ ...inpSm, width: 110 }} type="number" placeholder={t("rmc.from_km")} value={s.from_km} onChange={(e) => updList("slabs", i, { from_km: e.target.value })} />
              <input style={{ ...inpSm, width: 110 }} type="number" placeholder={t("rmc.to_km")} value={s.to_km} onChange={(e) => updList("slabs", i, { to_km: e.target.value })} />
              <input style={{ ...inpSm, width: 130 }} type="number" placeholder={t("rmc.slab_rate")} value={s.rate} onChange={(e) => updList("slabs", i, { rate: e.target.value })} />
              <DelBtn onClick={() => delList("slabs", i)} />
            </div>
          ))}
        </Rows>
      )}

      <Rows title={t("rmc.grade_rates")} addLabel={t("rmc.add_grade")}
        onAdd={() => setV((x) => ({ ...x, rates: [...x.rates, { grade: "", rate_per_cum: "" }] }))}
        empty={v.rates.length === 0 ? t("rmc.no_grade_rates") : ""}>
        {v.rates.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input style={{ ...inpSm, width: 110 }} placeholder="M25" value={r.grade} onChange={(e) => updList("rates", i, { grade: e.target.value })} />
            <input style={{ ...inpSm, width: 150 }} type="number" placeholder={t("rmc.rate_per_cum")} value={r.rate_per_cum} onChange={(e) => updList("rates", i, { rate_per_cum: e.target.value })} />
            <DelBtn onClick={() => delList("rates", i)} />
          </div>
        ))}
      </Rows>

      <Rows title={t("rmc.material_overrides")} addLabel={t("rmc.add_material")}
        onAdd={() => setV((x) => ({ ...x, materials: [...x.materials, { material_id: "", material_name: "", supplied_by: "own", wastage_pct: "" }] }))}
        empty={v.materials.length === 0 ? t("rmc.material_override_hint") : ""}>
        {v.materials.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <select style={{ ...inpSm, width: 180 }} value={m.material_id}
              onChange={(e) => {
                const hit = (meta.materials || []).find((x) => String(x.id) === e.target.value);
                updList("materials", i, { material_id: e.target.value, material_name: hit ? hit.name : "" });
              }}>
              <option value="">{t("rmc.select_material")}</option>
              {(meta.materials || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select style={{ ...inpSm, width: 130 }} value={m.supplied_by} onChange={(e) => updList("materials", i, { supplied_by: e.target.value })}>
              {(opt.supply || ["own", "vendor", "customer"]).map((s) => <option key={s} value={s}>{supplyLabel(s)}</option>)}
            </select>
            <input style={{ ...inpSm, width: 110 }} type="number" step="0.01" placeholder={t("rmc.wastage")} value={m.wastage_pct} onChange={(e) => updList("materials", i, { wastage_pct: e.target.value })} />
            <DelBtn onClick={() => delList("materials", i)} />
          </div>
        ))}
      </Rows>

      <Panel title={t("rmc.pump_and_rent")}>
        <div style={{ padding: 14 }}>
          <Grid cols={3}>
            <Field label={t("rmc.pump_rate")}><input style={inp} type="number" step="1" value={v.pump_rate_cum} onChange={(e) => upd("pump_rate_cum", e.target.value)} /></Field>
            <Field label={t("rmc.pump_min")}><input style={inp} type="number" step="1" value={v.pump_min_charge} onChange={(e) => upd("pump_min_charge", e.target.value)} /></Field>
            <Field label={t("rmc.rent_monthly")}><input style={inp} type="number" step="1" value={v.rent_monthly} onChange={(e) => upd("rent_monthly", e.target.value)} /></Field>
            <Field label={t("rmc.rent_rate_cum")}><input style={inp} type="number" step="1" value={v.rent_rate_cum} onChange={(e) => upd("rent_rate_cum", e.target.value)} /></Field>
            <Field label={t("rmc.rent_min_cum")}><input style={inp} type="number" step="0.01" value={v.rent_min_cum} onChange={(e) => upd("rent_min_cum", e.target.value)} /></Field>
            <Field label={t("rmc.valid_from")}><input style={inp} type="date" value={v.valid_from} onChange={(e) => upd("valid_from", e.target.value)} /></Field>
            <Field label={t("rmc.valid_to")}><input style={inp} type="date" value={v.valid_to} onChange={(e) => upd("valid_to", e.target.value)} /></Field>
          </Grid>
        </div>
      </Panel>
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

function RmcArrangements({ meta, canCreate, canEdit, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOn, setFormOn] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(dataOf(await rget("/contracts"), []));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const saved = () => { load(); if (onChanged) onChanged(); };

  return (
    <div>
      <Notice>{t("rmc.arr_note")}</Notice>
      <Panel title={t("rmc.arrangements")}
        action={canCreate ? <Btn size="sm" icon={IcAdd} onClick={() => { setEditing(null); setFormOn(true); }}>{t("rmc.new_arrangement")}</Btn> : null}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_arrangements")}</Empty> : (
            <Scroll minWidth={900}>
              <Row cols="1fr 140px 150px 130px 150px 80px" head>
                <span>{t("rmc.arr_name")}</span>
                <span>{t("rmc.plant")}</span>
                <span>{t("rmc.party")}</span>
                <span>{t("rmc.sup_material_l")}</span>
                <span>{t("rmc.transport_mode")}</span>
                <span />
              </Row>
              {rows.map((c) => (
                <Row key={c.id} cols="1fr 140px 150px 130px 150px 80px">
                  <span style={{ color: T.t1, fontWeight: 600 }}>
                    {c.name}
                    <div style={{ fontSize: 10.5, color: T.t4 }}>
                      {(c.rates || []).length
                        ? (c.rates || []).map((r) => `${r.grade} ${rupee(r.rate_per_cum)}`).join(" · ")
                        : t("rmc.no_grade_rates")}
                    </div>
                  </span>
                  <span style={{ color: T.t2 }}>{c.plant_name || "—"}</span>
                  <span style={{ color: T.t2 }}>{c.party_name || "—"}</span>
                  <span><Pill label={supplyLabel(c.supply_material)} c={c.supply_material === "own" ? T.grn : T.slt} bg={c.supply_material === "own" ? T.grnL : T.sltL} /></span>
                  <span style={{ color: T.t3 }}>
                    {transportModeLabel(c.transport_mode)}
                    {c.transport_rate ? <div style={{ fontSize: 10.5, color: T.t4 }}>{fmtN(c.transport_rate)}</div> : null}
                  </span>
                  <span style={{ textAlign: "right" }}>
                    {canEdit && <Btn size="sm" ghost onClick={() => { setEditing(c); setFormOn(true); }}>{t("common.edit")}</Btn>}
                  </span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>
      <ArrangementForm open={formOn} meta={meta} row={editing} onClose={() => setFormOn(false)} onSaved={saved} />
    </div>
  );
}

export default RmcArrangements;
