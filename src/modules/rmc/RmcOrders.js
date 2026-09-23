// RMC › Orders — site ki maang: banao, dekho, approve/reject karo.
// GET /rmc/orders · POST /rmc/orders · POST /rmc/orders/:id/decide
import { useState, useEffect, useCallback } from "react";
import SearchSelect from "../../components/SearchSelect";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, cum, fmtD, fmtDT, rget, rpost, dataOf, inp, inpSm, Field, Grid, KV, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Modal, Drawer, Spinner, OrderPill, GradePill, IcAdd, Notice, orderStatusLabel,
  unitOf, gradeUnit, gradesFor,
} from "./rmcShared";

const STATUSES = ["requested", "approved", "dispatching", "done", "cancelled"];

// ── Naya order ────────────────────────────────────────────────────
function OrderForm({ open, meta, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState({ project_id: "", grade: "", qty_cum: "", pour_at: "", plant_id: "", contract_id: "", pump_needed: false, element: "", note: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV({ project_id: "", grade: "", qty_cum: "", pour_at: "", plant_id: "", contract_id: "", pump_needed: false, element: "", note: "" }); setErr(""); } }, [open]);

  const grades = Array.from(new Set((meta.designs || []).map((d) => d.grade))).sort();
  const contracts = (meta.contracts || []).filter((c) => !v.plant_id || Number(c.plant_id) === Number(v.plant_id));
  const upd = (k, val) => setV((x) => ({ ...x, [k]: val }));

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/orders", {
      project_id: v.project_id || null, plant_id: v.plant_id || null, contract_id: v.contract_id || null,
      grade: v.grade, qty_cum: v.qty_cum, pour_at: v.pour_at || null,
      pump_needed: v.pump_needed ? 1 : 0, element: v.element || null, note: v.note || null,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.order_placed"));
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("rmc.ask_concrete")} sub={t("rmc.ask_concrete_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !v.project_id || !v.grade || !v.qty_cum}>{busy ? t("rmc.saving") : t("common.save")}</Btn>
      </>}>
      <Grid>
        <Field label={t("common.project")} span={2}>
          <SearchSelect value={v.project_id} onChange={(k) => upd("project_id", k)} accent={T.ind}
            options={(meta.projects || []).map((p) => ({ id: p.id, name: p.name }))} placeholder={t("rmc.select_project")} />
        </Field>
        <Field label={t("rmc.grade")} hint={grades.length ? t("rmc.grade_hint", { list: grades.join(", ") }) : t("rmc.no_design_yet")}>
          <input style={inp} list="rmc-order-grades" value={v.grade} onChange={(e) => upd("grade", e.target.value)} placeholder="M25" />
          <datalist id="rmc-order-grades">
            {gradesFor(meta).map((g) => <option key={g.grade} value={g.grade}>{g.unit}</option>)}
          </datalist>
        </Field>
        <Field label={t("rmc.qty_in", { unit: gradeUnit(meta, v.grade) })}>
          <input style={inp} type="number" step="0.01" value={v.qty_cum} onChange={(e) => upd("qty_cum", e.target.value)} placeholder="6" />
        </Field>
        <Field label={t("rmc.pour_at")}>
          <input style={inp} type="datetime-local" value={v.pour_at} onChange={(e) => upd("pour_at", e.target.value)} />
        </Field>
        <Field label={t("rmc.element")} hint={t("rmc.element_hint")}>
          <input style={inp} value={v.element} onChange={(e) => upd("element", e.target.value)} />
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={v.plant_id} onChange={(e) => setV((x) => ({ ...x, plant_id: e.target.value, contract_id: "" }))}>
            <option value="">{t("rmc.plant_later")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.arrangement")}>
          <select style={inp} value={v.contract_id} onChange={(e) => upd("contract_id", e.target.value)}>
            <option value="">{t("rmc.arrangement_later")}</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.pump")} span={2}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.t2, cursor: "pointer" }}>
            <input type="checkbox" checked={!!v.pump_needed} onChange={(e) => upd("pump_needed", e.target.checked)} />
            {t("rmc.pump_needed")}
          </label>
        </Field>
        <Field label={t("rmc.note")} span={2}>
          <input style={inp} value={v.note} onChange={(e) => upd("note", e.target.value)} />
        </Field>
      </Grid>
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

// ── Order ka detail + faisla ──────────────────────────────────────
function OrderDrawer({ order, meta, canApprove, onClose, onChanged }) {
  const toast = useToast();
  const [mode, setMode] = useState("");     // "" | approve | reject
  const [note, setNote] = useState("");
  const [plantId, setPlantId] = useState("");
  const [contractId, setContractId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setMode(""); setNote(""); setErr("");
    setPlantId(order && order.plant_id ? String(order.plant_id) : "");
    setContractId(order && order.contract_id ? String(order.contract_id) : "");
  }, [order]);
  if (!order) return null;

  const contracts = (meta.contracts || []).filter((c) => !plantId || Number(c.plant_id) === Number(plantId));
  const decide = async (action) => {
    if (action === "reject" && !note.trim()) { setErr(t("rmc.reason_needed")); return; }
    setErr(""); setBusy(true);
    const r = await rpost(`/orders/${order.id}/decide`, {
      action, note: note.trim() || null,
      plant_id: action === "approve" && plantId ? Number(plantId) : null,
      contract_id: action === "approve" && contractId ? Number(contractId) : null,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onChanged(); onClose();
  };

  return (
    <Drawer open onClose={onClose} title={order.order_no} head={<OrderPill s={order.status} />}
      sub={[order.project_name, order.grade, cum(order.qty_cum) + " " + unitOf(order)].filter(Boolean).join(" · ")}
      footer={order.status === "requested" && canApprove ? (
        mode ? (<>
          <Btn ghost onClick={() => { setMode(""); setErr(""); }}>{t("common.back")}</Btn>
          <Btn c={mode === "approve" ? T.grn : T.red} onClick={() => decide(mode)} disabled={busy}>
            {busy ? t("rmc.saving") : mode === "approve" ? t("common.approve") : t("common.reject")}
          </Btn>
        </>) : (<>
          <Btn ghost c={T.red} onClick={() => setMode("reject")}>{t("common.reject")}</Btn>
          <Btn c={T.grn} onClick={() => setMode("approve")}>{t("common.approve")}</Btn>
        </>)
      ) : null}>
      <Grid cols={2} style={{ marginBottom: 16 }}>
        <KV k={t("common.project")} v={order.project_name} />
        <KV k={t("rmc.task")} v={order.task_name} />
        <KV k={t("rmc.grade")} v={order.grade} />
        <KV k={t("rmc.qty_in", { unit: unitOf(order) })} v={cum(order.qty_cum)} />
        <KV k={t("rmc.supplied_in", { unit: unitOf(order) })} v={cum(order.supplied_cum)} />
        <KV k={t("rmc.pour_at")} v={order.pour_at ? fmtDT(order.pour_at) : "—"} />
        <KV k={t("rmc.plant")} v={order.plant_name} />
        <KV k={t("rmc.pump")} v={order.pump_needed ? t("rmc.pump_yes") : t("rmc.pump_no")} />
        <KV k={t("rmc.element")} v={order.element} />
        <KV k={t("rmc.asked_by")} v={order.requested_by_name} />
        <KV k={t("rmc.note")} v={order.note} />
        <KV k={t("common.status")} v={orderStatusLabel(order.status)} />
      </Grid>
      {order.decision_note && <Notice tone="warn">{t("rmc.decision_note", { note: order.decision_note })}</Notice>}

      {mode && (
        <Panel title={mode === "approve" ? t("rmc.approve_order") : t("rmc.reject_order")} style={{ marginTop: 6 }}>
          <div style={{ padding: 14 }}>
            {mode === "approve" && (
              <Grid style={{ marginBottom: 12 }}>
                <Field label={t("rmc.plant")} hint={t("rmc.approve_plant_hint")}>
                  <select style={inp} value={plantId} onChange={(e) => { setPlantId(e.target.value); setContractId(""); }}>
                    <option value="">{t("rmc.plant_later")}</option>
                    {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label={t("rmc.arrangement")}>
                  <select style={inp} value={contractId} onChange={(e) => setContractId(e.target.value)}>
                    <option value="">{t("rmc.arrangement_later")}</option>
                    {contracts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </Grid>
            )}
            <Field label={mode === "reject" ? t("rmc.reason") : t("rmc.note")}>
              <input style={inp} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={mode === "reject" ? t("rmc.reason_ph") : ""} />
            </Field>
            <ErrBox>{err}</ErrBox>
          </div>
        </Panel>
      )}
    </Drawer>
  );
}

// ── Tab ───────────────────────────────────────────────────────────
function RmcOrders({ meta, canCreate, canApprove, refreshKey, onRefresh, openId, onOpenDone }) {
  const [fl, setFl] = useState({ project_id: "", status: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/orders", fl);
    setRows(dataOf(r, []));
    setLoading(false);
  }, [fl]);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Dashboard se "ye order kholo" — list aane ke baad usi row ko khol do.
  useEffect(() => {
    if (!openId || !rows.length) return;
    const hit = rows.find((o) => Number(o.id) === Number(openId));
    if (hit) { setOpen(hit); if (onOpenDone) onOpenDone(); }
  }, [openId, rows, onOpenDone]);

  const changed = () => { load(); if (onRefresh) onRefresh(); };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("common.project")}>
          <select style={{ ...inpSm, width: 190 }} value={fl.project_id} onChange={(e) => setFl({ ...fl, project_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select style={{ ...inpSm, width: 150 }} value={fl.status} onChange={(e) => setFl({ ...fl, status: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
          </select>
        </Field>
        <Field label={t("common.from")}>
          <input type="date" style={{ ...inpSm, width: 145 }} value={fl.from} onChange={(e) => setFl({ ...fl, from: e.target.value })} />
        </Field>
        <Field label={t("common.to")}>
          <input type="date" style={{ ...inpSm, width: 145 }} value={fl.to} onChange={(e) => setFl({ ...fl, to: e.target.value })} />
        </Field>
        <span style={{ flex: 1 }} />
        {canCreate && <Btn icon={IcAdd} onClick={() => setAddOpen(true)}>{t("rmc.ask_concrete")}</Btn>}
      </div>

      <Panel title={t("rmc.orders_list", { n: rows.length })}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_orders")}</Empty> : (
            <Scroll minWidth={840}>
              <Row cols="100px 1fr 80px 90px 90px 130px 110px" head>
                <span>{t("rmc.order_no")}</span>
                <span>{t("common.project")}</span>
                <span>{t("rmc.grade")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty_short")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.sent_short")}</span>
                <span>{t("rmc.pour_at")}</span>
                <span>{t("common.status")}</span>
              </Row>
              {rows.map((o) => (
                <Row key={o.id} cols="100px 1fr 80px 90px 90px 130px 110px" onClick={() => setOpen(o)}>
                  <span style={{ fontWeight: 700, color: T.ind }}>{o.order_no}</span>
                  <span style={{ color: T.t1 }}>
                    {o.project_name || "—"}
                    {o.element ? <div style={{ fontSize: 10.5, color: T.t4 }}>{o.element}</div> : null}
                  </span>
                  <span><GradePill g={o.grade} /></span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(o.qty_cum)} <span style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{unitOf(o)}</span></span>
                  <span style={{ textAlign: "right", color: T.t3 }}>{cum(o.supplied_cum)}</span>
                  <span style={{ color: T.t3 }}>{o.pour_at ? fmtD(o.pour_at) : "—"}</span>
                  <span><OrderPill s={o.status} /></span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>

      <OrderForm open={addOpen} meta={meta} onClose={() => setAddOpen(false)} onSaved={changed} />
      <OrderDrawer order={open} meta={meta} canApprove={canApprove} onClose={() => setOpen(null)} onChanged={changed} />
    </div>
  );
}

export default RmcOrders;
