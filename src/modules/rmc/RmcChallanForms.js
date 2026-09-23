// RMC › Challan ke do form: "Challan banao" (plant side / site side) aur
// "Site par accept". Dono POST /rmc/dispatches aur /:id/accept par jaate hain.
import { useState, useEffect } from "react";
import SearchSelect from "../../components/SearchSelect";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, cum, rget, rpost, dataOf, inp, Field, Grid, Btn, Modal, ErrBox, Notice, PhotosField,
  contractById, plantById, showsMaterial, showsTransport, defaultSide, nowLocal, supplyLabel, rejectReasonLabel,
  unitOf, isBitumen, designFor, gradesFor, plantUnit, fmtN,
} from "./rmcShared";

const REJECT_REASONS = ["slump_fail", "late", "wrong_grade", "extra", "other"];
// Bitumen me slump nahi hota — thanda maal lautane ki wajah temperature hai.
const REJECT_REASONS_BIT = ["temp_fail", "late", "wrong_grade", "extra", "other"];
const numOrNull = (x) => (x === "" || x == null ? null : Number(x));
// Backend ke do messages ka seedha rasta hai — aadmi warna phansa reh jaata hai.
const wantsLead = (m) => /lead|लीड/i.test(String(m || ""));
const wantsStore = (m) => /store|स्टोर/i.test(String(m || ""));

// ── Challan banao ─────────────────────────────────────────────────
export function ChallanForm({ open, meta, preset, onClose, onSaved, onGoSetup }) {
  const toast = useToast();
  const blank = { order_id: "", project_id: "", plant_id: "", contract_id: "", grade: "", qty_cum: "",
    design_id: "", equipment_id: "", vehicle_no: "", driver_name: "", entered_side: "plant",
    vendor_challan_no: "", batch_at: "", remark: "", photo_urls: [], temp_dispatch_c: "" };
  const [v, setV] = useState(blank);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setV({ ...blank, batch_at: nowLocal(), ...(preset || {}) });
    setErr("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Us project ke khule order — challan unhi me se kisi se juda hota hai.
  useEffect(() => {
    if (!open || !v.project_id) { setOrders([]); return; }
    let alive = true;
    rget("/orders", { project_id: v.project_id, status: "approved" }).then((r) => { if (alive) setOrders(dataOf(r, [])); });
    return () => { alive = false; };
  }, [open, v.project_id]);

  const plant = plantById(meta, v.plant_id);
  const contract = contractById(meta, v.contract_id);
  const matShown = showsMaterial(contract);
  const transportShown = showsTransport(contract);
  const isSite = v.entered_side === "site";
  const contracts = (meta.contracts || []).filter((c) => !v.plant_id || Number(c.plant_id) === Number(v.plant_id));
  const designs = (meta.designs || []).filter((d) => !v.grade || String(d.grade).toUpperCase() === String(v.grade).toUpperCase());
  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));
  // Bitumen plant: unit aur temperature ki seema grade ke design se.
  const bit = isBitumen(plant);
  const gDesign = designFor(meta, v.grade);
  const unit = gDesign ? unitOf(gDesign) : plantUnit(meta, plant);
  const gradeList = gradesFor(meta, plant ? (bit ? "bitumen" : "concrete") : null);
  const tempNum = v.temp_dispatch_c === "" ? null : N(v.temp_dispatch_c);

  // Plant chunte hi side apne aap tay — vendor ka plant = site wali screen.
  const pickPlant = (id) => {
    const p = plantById(meta, id);
    setV((x) => ({ ...x, plant_id: id, contract_id: "", entered_side: defaultSide(p) }));
  };
  const pickOrder = (id) => {
    const o = orders.find((x) => Number(x.id) === Number(id));
    if (!o) { upd("order_id", id); return; }
    setV((x) => ({ ...x, order_id: id, grade: o.grade || x.grade,
      plant_id: o.plant_id ? String(o.plant_id) : x.plant_id,
      contract_id: o.contract_id ? String(o.contract_id) : x.contract_id,
      entered_side: o.plant_id ? defaultSide(plantById(meta, o.plant_id)) : x.entered_side }));
  };

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/dispatches", {
      order_id: v.order_id || null, project_id: v.project_id || null, plant_id: v.plant_id || null,
      contract_id: v.contract_id || null, grade: v.grade, qty_cum: v.qty_cum,
      design_id: v.design_id || null, equipment_id: v.equipment_id || null,
      vehicle_no: v.vehicle_no || null, driver_name: v.driver_name || null,
      entered_side: v.entered_side, vendor_challan_no: isSite ? (v.vendor_challan_no || null) : null,
      batch_at: v.batch_at || null, photo_urls: v.photo_urls, remark: v.remark || null,
      temp_dispatch_c: bit ? numOrNull(v.temp_dispatch_c) : null,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.challan_made", { no: (r.data && r.data.challan_no) || "" }));
    onSaved(); onClose();
  };

  const ready = v.project_id && v.plant_id && v.grade && N(v.qty_cum) > 0 && (!isSite || v.vendor_challan_no);

  return (
    <Modal open={open} onClose={onClose} width={720}
      title={isSite ? t("rmc.enter_vendor_challan") : t("rmc.make_challan")}
      sub={isSite ? t("rmc.enter_vendor_challan_sub") : t("rmc.make_challan_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !ready}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
      </>}>
      <Grid>
        <Field label={t("common.project")} span={2}>
          <SearchSelect value={v.project_id} onChange={(k) => setV((x) => ({ ...x, project_id: k, order_id: "" }))} accent={T.ind}
            options={(meta.projects || []).map((p) => ({ id: p.id, name: p.name }))} placeholder={t("rmc.select_project")} />
        </Field>
        <Field label={t("rmc.order")} hint={t("rmc.order_optional")}>
          <select style={inp} value={v.order_id} onChange={(e) => pickOrder(e.target.value)}>
            <option value="">{t("rmc.no_order")}</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.order_no} · {o.grade} · {cum(o.qty_cum)} {unitOf(o)}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={v.plant_id} onChange={(e) => pickPlant(e.target.value)}>
            <option value="">{t("rmc.select_plant")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.arrangement")} hint={contract ? t("rmc.matrix_line", { mat: supplyLabel(contract.supply_material), veh: supplyLabel(contract.supply_vehicle) }) : ""}>
          <select style={inp} value={v.contract_id} onChange={(e) => upd("contract_id", e.target.value)}>
            <option value="">{t("rmc.no_arrangement")}</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.entered_side")} hint={plant ? t("rmc.side_hint") : ""}>
          <select style={inp} value={v.entered_side} onChange={(e) => upd("entered_side", e.target.value)}>
            <option value="plant">{t("rmc.side_plant")}</option>
            <option value="site">{t("rmc.side_site")}</option>
          </select>
        </Field>
        <Field label={t("rmc.grade")}>
          <input style={inp} list="rmc-challan-grades" value={v.grade}
            onChange={(e) => setV((x) => ({ ...x, grade: e.target.value, design_id: "" }))}
            placeholder={bit ? t("rmc.grade_bitumen_ph") : "M25"} />
          <datalist id="rmc-challan-grades">
            {gradeList.map((g) => <option key={g.grade} value={g.grade}>{g.unit}</option>)}
          </datalist>
        </Field>
        <Field label={t("rmc.qty_in", { unit })}>
          <input style={inp} type="number" step="0.01" value={v.qty_cum} onChange={(e) => upd("qty_cum", e.target.value)} placeholder={bit ? "10" : "6"} />
        </Field>
        {bit && (
          <Field label={t("rmc.temp_dispatch")} span={2}
            hint={gDesign && (gDesign.temp_min_c != null || gDesign.temp_max_c != null)
              ? t("rmc.temp_dispatch_hint", { min: fmtN(gDesign.temp_min_c), max: fmtN(gDesign.temp_max_c) })
              : t("rmc.temp_blank_hint")}>
            <input style={inp} type="number" step="0.1" value={v.temp_dispatch_c} placeholder="155"
              onChange={(e) => upd("temp_dispatch_c", e.target.value)} />
          </Field>
        )}
        {matShown && (
          <Field label={t("rmc.mix_design")} hint={t("rmc.design_auto_hint")}>
            <select style={inp} value={v.design_id} onChange={(e) => upd("design_id", e.target.value)}>
              <option value="">{t("rmc.design_active")}</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.grade} · v{d.version}</option>)}
            </select>
          </Field>
        )}
        <Field label={bit ? t("rmc.vehicle_tipper") : t("rmc.tm")}>
          <select style={inp} value={v.equipment_id}
            onChange={(e) => {
              const eq = (meta.vehicles || []).find((x) => String(x.id) === e.target.value);
              setV((x) => ({ ...x, equipment_id: e.target.value, vehicle_no: eq && eq.registration_no ? eq.registration_no : x.vehicle_no }));
            }}>
            <option value="">{t("rmc.select_tm")}</option>
            {(meta.vehicles || []).map((e) => <option key={e.id} value={e.id}>{e.name}{e.capacity ? ` · ${e.capacity}` : ""}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.vehicle_no")}>
          <input style={inp} value={v.vehicle_no} onChange={(e) => upd("vehicle_no", e.target.value)} placeholder={t("rmc.vehicle_no_ph")} />
        </Field>
        <Field label={t("rmc.driver")}>
          <input style={inp} value={v.driver_name} onChange={(e) => upd("driver_name", e.target.value)} />
        </Field>
        <Field label={t("rmc.batch_at")}>
          <input style={inp} type="datetime-local" value={v.batch_at} onChange={(e) => upd("batch_at", e.target.value)} />
        </Field>
        {isSite && (
          <Field label={t("rmc.vendor_challan_no")} hint={t("rmc.vendor_challan_hint")}>
            <input style={inp} value={v.vendor_challan_no} onChange={(e) => upd("vendor_challan_no", e.target.value)} />
          </Field>
        )}
        <Field label={t("rmc.remark")} span={2}>
          <input style={inp} value={v.remark} onChange={(e) => upd("remark", e.target.value)} />
        </Field>
        <PhotosField value={v.photo_urls} onChange={(u) => upd("photo_urls", u)} label={t("rmc.challan_photos")} />
      </Grid>

      {matShown
        ? <div style={{ marginTop: 14 }}><Notice>{t("rmc.stock_will_drop")}</Notice></div>
        : <div style={{ marginTop: 14 }}><Notice tone="warn">{t("rmc.material_not_ours")}</Notice></div>}
      {!transportShown && contract && <Notice tone="warn">{t("rmc.transport_customer")}</Notice>}
      {/* Temperature na bhara ya seema se bahar — challan banega, par PM/Admin
          ke paas jaayega. Pehle hi bata do taaki aadmi jaan-boojh kar bhare. */}
      {bit && (tempNum == null
        ? <Notice tone="warn">{t("rmc.temp_blank_review")}</Notice>
        : gDesign && ((gDesign.temp_min_c != null && tempNum < N(gDesign.temp_min_c)) || (gDesign.temp_max_c != null && tempNum > N(gDesign.temp_max_c)))
          ? <Notice tone="warn">{t("rmc.temp_out_review")}</Notice> : null)}

      <ErrBox>{err}</ErrBox>
      {err && (wantsLead(err) || wantsStore(err)) && (
        <div style={{ marginTop: 8 }}>
          <Btn size="sm" ghost onClick={() => { onClose(); onGoSetup(wantsLead(err) ? "leads" : "plants"); }}>
            {wantsLead(err) ? t("rmc.go_add_lead") : t("rmc.go_plant_store")}
          </Btn>
        </div>
      )}
    </Modal>
  );
}

// ── Site par accept ───────────────────────────────────────────────
export function AcceptForm({ open, dispatch, onClose, onDone }) {
  const toast = useToast();
  const [v, setV] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [lim, setLim] = useState(null);
  const bit = isBitumen(dispatch);
  useEffect(() => {
    if (!open || !dispatch) return;
    setV({ accepted_cum: String(N(dispatch.qty_cum)), reject_reason: "", reject_note: "", slump_mm: "",
      cubes_taken: "", arrived_at: "", unload_start_at: "", unload_end_at: "", photo_urls: [], temp_lay_c: "" });
    setErr("");
    setLim(null);
    // Bichhane ki seema design par hai — list me nahi aati, detail se lo.
    if (dispatch.product_kind === "bitumen") {
      let alive = true;
      rget(`/dispatches/${dispatch.id}`).then((r) => { if (alive) setLim(dataOf(r, null)); });
      return () => { alive = false; };
    }
    return undefined;
  }, [open, dispatch]);
  if (!dispatch) return null;
  const unit = unitOf(dispatch);
  const layMin = lim && lim.lay_temp_min_c != null ? N(lim.lay_temp_min_c) : null;
  const layNum = v.temp_lay_c === "" || v.temp_lay_c == null ? null : N(v.temp_lay_c);

  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const sent = N(dispatch.qty_cum);
  const taken = N(v.accepted_cum);
  const short = taken < sent - 0.0001;
  const over = taken > sent + 0.0001;
  const needsReason = short && !v.reject_reason;

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost(`/dispatches/${dispatch.id}/accept`, {
      accepted_cum: v.accepted_cum === "" ? null : Number(v.accepted_cum),
      reject_reason: short ? v.reject_reason || null : null,
      reject_note: short ? v.reject_note || null : null,
      slump_mm: v.slump_mm === "" ? null : Number(v.slump_mm),
      cubes_taken: v.cubes_taken === "" ? null : Number(v.cubes_taken),
      arrived_at: v.arrived_at || null, unload_start_at: v.unload_start_at || null,
      unload_end_at: v.unload_end_at || null, photo_urls: v.photo_urls,
      temp_lay_c: bit ? numOrNull(v.temp_lay_c) : null,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.accept_done"));
    onDone(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={700}
      title={t("rmc.accept_title", { no: dispatch.challan_no })}
      sub={[dispatch.project_name, dispatch.grade, cum(sent) + " " + unit].filter(Boolean).join(" · ")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn c={T.grn} onClick={save} disabled={busy || over || needsReason}>{busy ? t("rmc.saving") : t("rmc.accept_btn")}</Btn>
      </>}>
      <Grid>
        <Field label={t("rmc.accepted_in", { unit })} hint={t("rmc.accepted_hint", { sent: cum(sent), unit })}>
          <input style={inp} type="number" step="0.01" value={v.accepted_cum} onChange={(e) => upd("accepted_cum", e.target.value)} />
        </Field>
        <Field label={t("rmc.returned_cum")}>
          <div style={{ ...inp, background: T.surfaceB, color: short ? T.red : T.t3, fontWeight: 700 }}>
            {cum(Math.max(0, sent - taken))}
          </div>
        </Field>
        {short && (<>
          <Field label={t("rmc.reject_reason")}>
            <select style={inp} value={v.reject_reason} onChange={(e) => upd("reject_reason", e.target.value)}>
              <option value="">{t("rmc.pick_reason")}</option>
              {(bit ? REJECT_REASONS_BIT : REJECT_REASONS).map((r) => <option key={r} value={r}>{rejectReasonLabel(r)}</option>)}
            </select>
          </Field>
          <Field label={t("rmc.reject_note")}>
            <input style={inp} value={v.reject_note} onChange={(e) => upd("reject_note", e.target.value)} />
          </Field>
        </>)}
        {bit ? (
          <Field label={t("rmc.temp_lay")} hint={layMin != null ? t("rmc.temp_lay_hint", { min: fmtN(layMin) }) : t("rmc.temp_blank_hint")}>
            <input style={inp} type="number" step="0.1" value={v.temp_lay_c} onChange={(e) => upd("temp_lay_c", e.target.value)} placeholder="145" />
          </Field>
        ) : (
          <Field label={t("rmc.slump_mm")}>
            <input style={inp} type="number" value={v.slump_mm} onChange={(e) => upd("slump_mm", e.target.value)} placeholder="110" />
          </Field>
        )}
        <Field label={bit ? t("rmc.samples_taken") : t("rmc.cubes_taken")}>
          <input style={inp} type="number" value={v.cubes_taken} onChange={(e) => upd("cubes_taken", e.target.value)} placeholder="3" />
        </Field>
        <Field label={t("rmc.arrived_at")}>
          <input style={inp} type="datetime-local" value={v.arrived_at} onChange={(e) => upd("arrived_at", e.target.value)} />
        </Field>
        <Field label={t("rmc.unload_start")}>
          <input style={inp} type="datetime-local" value={v.unload_start_at} onChange={(e) => upd("unload_start_at", e.target.value)} />
        </Field>
        <Field label={t("rmc.unload_end")}>
          <input style={inp} type="datetime-local" value={v.unload_end_at} onChange={(e) => upd("unload_end_at", e.target.value)} />
        </Field>
        <PhotosField value={v.photo_urls} onChange={(u) => upd("photo_urls", u)} label={t("rmc.accept_photos")} />
      </Grid>
      {over && <div style={{ marginTop: 12 }}><Notice tone="warn">{t("rmc.over_sent")}</Notice></div>}
      {needsReason && <div style={{ marginTop: 12 }}><Notice tone="warn">{t("rmc.short_needs_reason")}</Notice></div>}
      {bit && taken > 0.0001 && (layNum == null
        ? <div style={{ marginTop: 12 }}><Notice tone="warn">{t("rmc.temp_blank_review")}</Notice></div>
        : layMin != null && layNum < layMin
          ? <div style={{ marginTop: 12 }}><Notice tone="warn">{t("rmc.temp_out_review")}</Notice></div> : null)}
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}
