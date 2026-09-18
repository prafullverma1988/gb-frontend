// RMC › Setup — Plants, Arrangements, Leads, Mix designs (sub-tabs).
// Plant aur Lead yahin hain; Arrangement aur Mix design apni file me.
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, fmtN, fmtD, rget, rpost, rpatch, dataOf, inp, inpSm, Field, Grid, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Notice, Modal, Spinner, Pill, SubTabs, IcAdd, ownerLabel,
} from "./rmcShared";
import RmcArrangements from "./RmcArrangement";
import RmcMixDesigns from "./RmcMixDesigns";

// ── Plant ka form ─────────────────────────────────────────────────
function PlantForm({ open, meta, plant, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(plant ? {
      name: plant.name || "", owner: plant.owner || "own", plant_type: plant.plant_type || "stationary",
      capacity_cum_hr: plant.capacity_cum_hr == null ? "" : String(plant.capacity_cum_hr),
      vendor_party_id: plant.vendor_party_id || "", warehouse_id: plant.warehouse_id || "",
      equipment_id: plant.equipment_id || "",
      project_id: plant.project_id || "", address: plant.address || "", is_active: plant.is_active,
    } : { name: "", owner: "own", plant_type: "stationary", capacity_cum_hr: "", vendor_party_id: "", warehouse_id: "", equipment_id: "", project_id: "", address: "" });
    setErr("");
  }, [open, plant]);

  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const save = async () => {
    setErr(""); setBusy(true);
    const body = {
      name: v.name, owner: v.owner, plant_type: v.plant_type,
      capacity_cum_hr: v.capacity_cum_hr === "" ? null : Number(v.capacity_cum_hr),
      vendor_party_id: v.owner === "vendor" ? v.vendor_party_id || null : null,
      warehouse_id: v.warehouse_id || null, equipment_id: v.equipment_id || null,
      project_id: v.project_id || null, address: v.address || null,
    };
    const r = plant ? await rpatch(`/plants/${plant.id}`, body) : await rpost("/plants", body);
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={plant ? t("rmc.edit_plant") : t("rmc.new_plant")}
      sub={t("rmc.plant_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !v.name}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
      </>}>
      <Grid>
        <Field label={t("rmc.plant_name")} span={2}>
          <input style={inp} value={v.name || ""} onChange={(e) => upd("name", e.target.value)} />
        </Field>
        <Field label={t("rmc.owner")}>
          <select style={inp} value={v.owner || "own"} onChange={(e) => upd("owner", e.target.value)}>
            <option value="own">{ownerLabel("own")}</option>
            <option value="hired">{ownerLabel("hired")}</option>
            <option value="vendor">{ownerLabel("vendor")}</option>
          </select>
        </Field>
        <Field label={t("rmc.plant_type")}>
          <select style={inp} value={v.plant_type || "stationary"} onChange={(e) => upd("plant_type", e.target.value)}>
            <option value="stationary">{t("rmc.type_stationary")}</option>
            <option value="mobile">{t("rmc.type_mobile")}</option>
          </select>
        </Field>
        <Field label={t("rmc.capacity_cum_hr")}>
          <input style={inp} type="number" step="0.01" value={v.capacity_cum_hr || ""} onChange={(e) => upd("capacity_cum_hr", e.target.value)} />
        </Field>
        {v.owner === "vendor" && (
          <Field label={t("rmc.vendor_party")}>
            <select style={inp} value={v.vendor_party_id || ""} onChange={(e) => upd("vendor_party_id", e.target.value)}>
              <option value="">{t("rmc.select_party")}</option>
              {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={t("rmc.store")} hint={t("rmc.plant_store_hint")}>
          <select style={inp} value={v.warehouse_id || ""} onChange={(e) => upd("warehouse_id", e.target.value)}>
            <option value="">{t("rmc.no_store")}</option>
            {(meta.warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        {/* Machine Machinery me bani hai — yahan sirf plant se link hoti hai.
            Khaali chhodna theek hai; "Koi machine nahi" se hata bhi sakte ho. */}
        <Field label={t("rmc.plant_machine")} hint={t("rmc.plant_machine_hint")}>
          <select style={inp} value={v.equipment_id || ""} onChange={(e) => upd("equipment_id", e.target.value)}>
            <option value="">{t("rmc.no_machine")}</option>
            {(meta.machines || []).map((mc) => (
              <option key={mc.id} value={mc.id}>
                {mc.name}{mc.machine_type ? ` · ${mc.machine_type}` : mc.category ? ` · ${mc.category}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("rmc.project_optional")}>
          <select style={inp} value={v.project_id || ""} onChange={(e) => upd("project_id", e.target.value)}>
            <option value="">{t("common.all")}</option>
            {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.address")} span={2}>
          <input style={inp} value={v.address || ""} onChange={(e) => upd("address", e.target.value)} />
        </Field>
      </Grid>
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

// ── Plants ────────────────────────────────────────────────────────
function PlantsTab({ meta, canCreate, canEdit, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOn, setFormOn] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(dataOf(await rget("/plants"), []));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const saved = () => { load(); if (onChanged) onChanged(); };

  return (
    <div>
      <Notice>{t("rmc.plants_note")}</Notice>
      <Panel title={t("rmc.plants")}
        action={canCreate ? <Btn size="sm" icon={IcAdd} onClick={() => { setEditing(null); setFormOn(true); }}>{t("rmc.new_plant")}</Btn> : null}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_plants")}</Empty> : (
            <Scroll minWidth={820}>
              <Row cols="1fr 110px 110px 100px 160px 90px" head>
                <span>{t("rmc.plant_name")}</span>
                <span>{t("rmc.owner")}</span>
                <span>{t("rmc.plant_type")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.capacity_short")}</span>
                <span>{t("rmc.store")}</span>
                <span />
              </Row>
              {rows.map((p) => (
                <Row key={p.id} cols="1fr 110px 110px 100px 160px 90px">
                  <span style={{ color: T.t1, fontWeight: 600 }}>
                    {p.name}
                    {(p.vendor_name || p.equipment_name)
                      ? <div style={{ fontSize: 10.5, color: T.t4 }}>{[p.vendor_name, p.equipment_name].filter(Boolean).join(" · ")}</div>
                      : null}
                  </span>
                  <span><Pill label={ownerLabel(p.owner)} c={p.owner === "vendor" ? T.amb : T.ind} bg={p.owner === "vendor" ? T.ambL : T.indL} /></span>
                  <span style={{ color: T.t3 }}>{p.plant_type === "mobile" ? t("rmc.type_mobile") : t("rmc.type_stationary")}</span>
                  <span style={{ textAlign: "right", color: T.t2 }}>{p.capacity_cum_hr ? fmtN(p.capacity_cum_hr) : "—"}</span>
                  <span style={{ color: p.warehouse_name ? T.t2 : T.red }}>{p.warehouse_name || t("rmc.no_store")}</span>
                  <span style={{ textAlign: "right" }}>
                    {canEdit && <Btn size="sm" ghost onClick={() => { setEditing(p); setFormOn(true); }}>{t("common.edit")}</Btn>}
                  </span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>
      <PlantForm open={formOn} meta={meta} plant={editing} onClose={() => setFormOn(false)} onSaved={saved} />
    </div>
  );
}

// ── Leads ─────────────────────────────────────────────────────────
function LeadsTab({ meta, canEdit, onChanged }) {
  const toast = useToast();
  const [fl, setFl] = useState({ plant_id: "", project_id: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOn, setFormOn] = useState(false);
  const [v, setV] = useState({ plant_id: "", project_id: "", lead_km: "", effective_from: "", note: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(dataOf(await rget("/leads", fl), []));
    setLoading(false);
  }, [fl]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/leads", {
      plant_id: v.plant_id || null, project_id: v.project_id || null, lead_km: v.lead_km,
      effective_from: v.effective_from || null, note: v.note || null,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    setFormOn(false); load(); if (onChanged) onChanged();
  };

  return (
    <div>
      <Notice>{t("rmc.lead_note")}</Notice>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("rmc.plant")}>
          <select style={{ ...inpSm, width: 170 }} value={fl.plant_id} onChange={(e) => setFl({ ...fl, plant_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.project")}>
          <select style={{ ...inpSm, width: 190 }} value={fl.project_id} onChange={(e) => setFl({ ...fl, project_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <span style={{ flex: 1 }} />
        {canEdit && (
          <Btn icon={IcAdd} onClick={() => {
            setV({ plant_id: fl.plant_id || "", project_id: fl.project_id || "", lead_km: "", effective_from: "", note: "" });
            setErr(""); setFormOn(true);
          }}>{t("rmc.new_lead")}</Btn>
        )}
      </div>

      <Panel title={t("rmc.leads")}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_leads")}</Empty> : (
            <Scroll minWidth={620}>
              <Row cols="1fr 1fr 110px 120px" head>
                <span>{t("rmc.plant")}</span>
                <span>{t("common.project")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.lead_km")}</span>
                <span>{t("rmc.effective_from")}</span>
              </Row>
              {rows.map((l) => (
                <Row key={l.id} cols="1fr 1fr 110px 120px">
                  <span style={{ color: T.t1, fontWeight: 600 }}>{l.plant_name}</span>
                  <span style={{ color: T.t2 }}>{l.project_name}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{fmtN(l.lead_km)} km</span>
                  <span style={{ color: T.t3 }}>{l.effective_from ? fmtD(l.effective_from) : "—"}</span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>

      <Modal open={formOn} onClose={() => setFormOn(false)} title={t("rmc.new_lead")} sub={t("rmc.lead_one_way")}
        footer={<>
          <Btn ghost onClick={() => setFormOn(false)}>{t("common.cancel")}</Btn>
          <Btn onClick={save} disabled={busy || !v.plant_id || !v.project_id || !v.lead_km}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
        </>}>
        <Grid>
          <Field label={t("rmc.plant")}>
            <select style={inp} value={v.plant_id} onChange={(e) => setV({ ...v, plant_id: e.target.value })}>
              <option value="">{t("rmc.select_plant")}</option>
              {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("common.project")}>
            <select style={inp} value={v.project_id} onChange={(e) => setV({ ...v, project_id: e.target.value })}>
              <option value="">{t("rmc.select_project")}</option>
              {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("rmc.lead_km")} hint={t("rmc.lead_one_way")}>
            <input style={inp} type="number" step="0.1" value={v.lead_km} onChange={(e) => setV({ ...v, lead_km: e.target.value })} />
          </Field>
          <Field label={t("rmc.effective_from")}>
            <input style={inp} type="date" value={v.effective_from} onChange={(e) => setV({ ...v, effective_from: e.target.value })} />
          </Field>
          <Field label={t("rmc.note")} span={2}>
            <input style={inp} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
          </Field>
        </Grid>
        <ErrBox>{err}</ErrBox>
      </Modal>
    </div>
  );
}

// ── Setup shell ───────────────────────────────────────────────────
function RmcSetup({ meta, canCreate, canEdit, onChanged, sub, onSub }) {
  const tabs = [
    { id: "plants", l: t("rmc.plants") },
    { id: "arrangements", l: t("rmc.arrangements") },
    { id: "leads", l: t("rmc.leads") },
    { id: "designs", l: t("rmc.mix_designs") },
  ];
  return (
    <div>
      <SubTabs tabs={tabs} value={sub} onChange={onSub} />
      {sub === "plants" && <PlantsTab meta={meta} canCreate={canCreate} canEdit={canEdit} onChanged={onChanged} />}
      {sub === "arrangements" && <RmcArrangements meta={meta} canCreate={canCreate} canEdit={canEdit} onChanged={onChanged} />}
      {sub === "leads" && <LeadsTab meta={meta} canEdit={canEdit} onChanged={onChanged} />}
      {sub === "designs" && <RmcMixDesigns meta={meta} canCreate={canCreate} canEdit={canEdit} onChanged={onChanged} />}
    </div>
  );
}

export default RmcSetup;
