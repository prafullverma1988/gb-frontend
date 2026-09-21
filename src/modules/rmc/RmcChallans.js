// RMC › Challan — ek TM = ek challan. List, detail, site par accept, cancel.
// GET /rmc/dispatches · /rmc/dispatches/:id · POST /:id/accept · /:id/cancel
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, cum, fmtD, fmtDT, rupee, fmtN, rget, rpost, dataOf, inp, inpSm, Field, Grid, KV, Btn, Panel,
  Row, Scroll, Empty, ErrBox, Notice, Drawer, Spinner, DispatchPill, GradePill, IcAdd, IcTruck,
  contractById, showsMaterial, showsTransport, dispatchStatusLabel, rejectReasonLabel, sideLabel,
  supplyLabel, transportModeLabel, unitOf, isBitumen, TempFlags, tempTokens, KindPill,
} from "./rmcShared";
import { ChallanForm, AcceptForm } from "./RmcChallanForms";

const STATUSES = ["in_transit", "accepted", "partial", "rejected", "cancelled"];

// ── Challan ka detail ─────────────────────────────────────────────
function ChallanDrawer({ id, meta, canCreate, canDelete, onClose, onChanged, onAccept }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelMode, setCancelMode] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget(`/dispatches/${id}`);
    setD(dataOf(r, null));
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const contract = d ? contractById(meta, d.contract_id) : null;
  const matShown = d ? showsMaterial(contract) : false;
  const transportShown = d ? showsTransport(contract) : false;
  const ownLines = ((d && d.materials) || []).filter((m) => m.supplied_by === "own");
  const bit = isBitumen(d);
  const unit = unitOf(d);
  const [note, setNote] = useState("");
  const [rvBusy, setRvBusy] = useState(false);
  const [rvErr, setRvErr] = useState("");
  // Temperature ki gadbad PM/Admin note likh kar band karte hain.
  const clearTemp = async () => {
    if (!note.trim()) { setRvErr(t("rmc.review_note_needed")); return; }
    setRvErr(""); setRvBusy(true);
    const r = await rpost(`/dispatches/${d.id}/temp-review`, { note: note.trim() });
    setRvBusy(false);
    if (!r || !r.success) { setRvErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    setNote(""); load(); onChanged();
  };

  const doCancel = async () => {
    if (!reason.trim()) { setErr(t("rmc.reason_needed")); return; }
    setErr(""); setBusy(true);
    const r = await rpost(`/dispatches/${d.id}/cancel`, { reason: reason.trim() });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onChanged(); onClose();
  };

  return (
    <Drawer open onClose={onClose} width={720}
      title={(d && d.challan_no) || t("rmc.challan")}
      head={d ? <DispatchPill s={d.status} /> : null}
      sub={d ? [d.project_name, d.plant_name, d.grade].filter(Boolean).join(" · ") : ""}
      footer={d && d.status === "in_transit" ? (
        cancelMode ? (<>
          <Btn ghost onClick={() => { setCancelMode(false); setErr(""); }}>{t("common.back")}</Btn>
          <Btn c={T.red} onClick={doCancel} disabled={busy}>{busy ? t("rmc.saving") : t("rmc.cancel_challan")}</Btn>
        </>) : (<>
          {canDelete && <Btn ghost c={T.red} onClick={() => setCancelMode(true)}>{t("rmc.cancel_challan")}</Btn>}
          {canCreate && <Btn c={T.grn} onClick={() => onAccept(d)}>{t("rmc.accept_btn")}</Btn>}
        </>)
      ) : null}>
      {loading ? <Spinner label={t("common.loading")} />
        : !d ? <Empty>{t("rmc.challan_not_found")}</Empty> : (<>
          {bit && <div style={{ marginBottom: 10 }}><KindPill k="bitumen" /></div>}
          <Grid cols={3} style={{ marginBottom: 14 }}>
            <KV k={t("common.project")} v={d.project_name} />
            <KV k={t("rmc.plant")} v={d.plant_name} />
            <KV k={t("rmc.order")} v={d.order_no} />
            <KV k={t("rmc.grade")} v={d.grade} />
            <KV k={t("rmc.qty_in", { unit })} v={cum(d.qty_cum)} />
            <KV k={t("rmc.accepted_in", { unit })} v={d.accepted_cum == null ? "—" : cum(d.accepted_cum)} />
            <KV k={t("rmc.returned_in", { unit })} v={cum(d.rejected_cum)} />
            <KV k={t("rmc.entered_side")} v={sideLabel(d.entered_side)} />
            <KV k={t("rmc.vendor_challan_no")} v={d.vendor_challan_no} />
            <KV k={bit ? t("rmc.vehicle_tipper") : t("rmc.tm")} v={d.vehicle_no} />
            <KV k={t("rmc.driver")} v={d.driver_name} />
            <KV k={t("rmc.lead_km")} v={d.lead_km_snap == null ? "—" : fmtN(d.lead_km_snap) + " km"} />
            <KV k={t("rmc.batch_at")} v={fmtDT(d.batch_at)} />
            <KV k={t("rmc.arrived_at")} v={fmtDT(d.arrived_at)} />
            <KV k={t("rmc.unload_end")} v={fmtDT(d.unload_end_at)} />
            {bit ? <KV k={t("rmc.temp_dispatch")} v={d.temp_dispatch_c == null ? "—" : fmtN(d.temp_dispatch_c) + " °C"} />
              : <KV k={t("rmc.slump_mm")} v={d.slump_mm} />}
            {bit && <KV k={t("rmc.temp_lay")} v={d.temp_lay_c == null ? "—" : fmtN(d.temp_lay_c) + " °C"} />}
            <KV k={bit ? t("rmc.samples_taken") : t("rmc.cubes_taken")} v={d.cubes_taken} />
            <KV k={t("common.status")} v={dispatchStatusLabel(d.status)} />
          </Grid>

          {d.reject_reason && (
            <Notice tone="warn">{t("rmc.returned_line", { cum: cum(d.rejected_cum), unit, reason: rejectReasonLabel(d.reject_reason) })}
              {d.reject_note ? " — " + d.reject_note : ""}</Notice>
          )}
          {d.remark && <div style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{d.remark}</div>}

          {/* Bitumen: temperature ki gadbad (na bhara bhi gadbad hai). Challan
              nahi rukta — PM/Admin note ke saath band karte hain. */}
          {bit && (tempTokens(d).length > 0 || d.temp_review) && (
            <Panel title={t("rmc.temp_check")} style={{ marginBottom: 14 }}>
              <div style={{ padding: 14 }}>
                <div style={{ marginBottom: 8 }}><TempFlags d={d} /></div>
                <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}>
                  {t("rmc.temp_limits_line", {
                    min: d.temp_min_c == null ? "—" : fmtN(d.temp_min_c),
                    max: d.temp_max_c == null ? "—" : fmtN(d.temp_max_c),
                    lay: d.lay_temp_min_c == null ? "—" : fmtN(d.lay_temp_min_c),
                  })}
                </div>
                {d.temp_review === "cleared" && (
                  <Notice>{t("rmc.review_done_by", { by: d.temp_reviewed_by_name || "—", at: fmtDT(d.temp_reviewed_at) })}
                    {d.temp_review_note ? " — " + d.temp_review_note : ""}</Notice>
                )}
                {d.temp_review === "pending" && (meta.can_review ? (
                  <>
                    <Field label={t("rmc.review_note")}>
                      <input style={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("rmc.review_note_ph_temp")} />
                    </Field>
                    <div style={{ marginTop: 10 }}>
                      <Btn c={T.grn} onClick={clearTemp} disabled={rvBusy || !note.trim()}>{rvBusy ? t("rmc.saving") : t("rmc.review_clear_btn")}</Btn>
                    </div>
                    <ErrBox>{rvErr}</ErrBox>
                  </>
                ) : <Notice tone="warn">{t("rmc.review_waiting_pm")}</Notice>)}
              </div>
            </Panel>
          )}

          {/* Paisa. Vendor ka rate/transport sirf jama hota hai — bill Phase 2. */}
          <Panel title={t("rmc.money")} style={{ marginBottom: 14 }}>
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              {matShown && <KV k={t("rmc.material_amount")} v={rupee(d.material_amount)} />}
              <KV k={t("rmc.concrete_amount")} v={rupee(d.concrete_amount)} />
              {transportShown && <KV k={t("rmc.transport_amount")} v={rupee(d.transport_amount)} />}
              {transportShown && <KV k={t("rmc.transport_mode")} v={transportModeLabel(d.transport_mode_snap)} />}
            </div>
            <div style={{ padding: "0 14px 12px" }}>
              <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.55 }}>{t("rmc.bill_note")}</div>
            </div>
          </Panel>

          {matShown && (
            <Panel title={t("rmc.material_used")}>
              {ownLines.length === 0 && (d.materials || []).length === 0 ? <Empty>{t("rmc.no_material_lines")}</Empty> : (
                <Scroll minWidth={560}>
                  <Row cols="1fr 100px 90px 90px 100px 100px" head>
                    <span>{t("rmc.material")}</span>
                    <span>{t("rmc.whose")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.kg")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
                  </Row>
                  {(d.materials || []).map((m) => (
                    <Row key={m.id} cols="1fr 100px 90px 90px 100px 100px">
                      <span style={{ color: T.t1, fontWeight: 600 }}>{m.material_name}</span>
                      <span style={{ color: T.t3 }}>{supplyLabel(m.supplied_by)}</span>
                      <span style={{ textAlign: "right" }}>{fmtN(m.qty)} {m.unit || ""}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(m.qty_kg)}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{m.supplied_by === "own" ? rupee(m.rate) : "—"}</span>
                      <span style={{ textAlign: "right", fontWeight: 700 }}>{m.supplied_by === "own" ? rupee(m.amount) : "—"}</span>
                    </Row>
                  ))}
                </Scroll>
              )}
            </Panel>
          )}
          {!matShown && <Notice tone="warn">{t("rmc.material_not_ours")}</Notice>}

          {((d.photos || []).length > 0 || (d.accept_photos || []).length > 0) && (
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[...(d.photos || []), ...(d.accept_photos || [])].map((u, i) => (
                <a key={u + i} href={u} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11.5, color: T.ind, fontWeight: 700, textDecoration: "none", border: `1.5px solid ${T.b1}`, borderRadius: 8, padding: "5px 9px" }}>
                  {t("rmc.photo_n", { n: i + 1 })}
                </a>
              ))}
            </div>
          )}

          {cancelMode && (
            <Panel title={t("rmc.cancel_challan")} style={{ marginTop: 14 }}>
              <div style={{ padding: 14 }}>
                <Notice tone="warn">{t("rmc.cancel_note")}</Notice>
                <Field label={t("rmc.reason")}>
                  <input style={inp} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rmc.reason_ph")} />
                </Field>
                <ErrBox>{err}</ErrBox>
              </div>
            </Panel>
          )}
        </>)}
    </Drawer>
  );
}

// ── Tab ───────────────────────────────────────────────────────────
function RmcChallans({ meta, canCreate, canDelete, refreshKey, onRefresh, openId, onOpenDone, onGoSetup }) {
  const [fl, setFl] = useState({ project_id: "", plant_id: "", status: "", from: "", to: "", temp_review: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [preset, setPreset] = useState(null);
  const [acceptOn, setAcceptOn] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/dispatches", fl);
    setRows(dataOf(r, []));
    setLoading(false);
  }, [fl]);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { if (openId) { setDetailId(Number(openId)); if (onOpenDone) onOpenDone(); } }, [openId, onOpenDone]);

  const changed = () => { load(); if (onRefresh) onRefresh(); };
  const openForm = (side) => {
    setPreset(side === "site" ? { entered_side: "site" } : null);
    setFormOpen(true);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("common.project")}>
          <select style={{ ...inpSm, width: 180 }} value={fl.project_id} onChange={(e) => setFl({ ...fl, project_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={{ ...inpSm, width: 160 }} value={fl.plant_id} onChange={(e) => setFl({ ...fl, plant_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select style={{ ...inpSm, width: 140 }} value={fl.status} onChange={(e) => setFl({ ...fl, status: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{dispatchStatusLabel(s)}</option>)}
          </select>
        </Field>
        <Field label={t("common.from")}>
          <input type="date" style={{ ...inpSm, width: 140 }} value={fl.from} onChange={(e) => setFl({ ...fl, from: e.target.value })} />
        </Field>
        <Field label={t("common.to")}>
          <input type="date" style={{ ...inpSm, width: 140 }} value={fl.to} onChange={(e) => setFl({ ...fl, to: e.target.value })} />
        </Field>
        {(meta.plants || []).some(isBitumen) && (
          <Field label={t("rmc.temp_check")}>
            <select style={{ ...inpSm, width: 150 }} value={fl.temp_review} onChange={(e) => setFl({ ...fl, temp_review: e.target.value })}>
              <option value="">{t("common.all")}</option>
              <option value="pending">{t("rmc.rv_pending")}</option>
              <option value="cleared">{t("rmc.rv_cleared")}</option>
            </select>
          </Field>
        )}
        <span style={{ flex: 1 }} />
        {canCreate && <Btn ghost icon={IcTruck} onClick={() => openForm("site")}>{t("rmc.enter_vendor_challan")}</Btn>}
        {canCreate && <Btn icon={IcAdd} onClick={() => openForm("plant")}>{t("rmc.make_challan")}</Btn>}
      </div>

      <Panel title={t("rmc.challan_list", { n: rows.length })}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_challans")}</Empty> : (
            <Scroll minWidth={980}>
              <Row cols="120px 1fr 140px 70px 80px 80px 110px 110px" head>
                <span>{t("rmc.challan_no")}</span>
                <span>{t("common.project")}</span>
                <span>{t("rmc.plant")}</span>
                <span>{t("rmc.grade")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty_short")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.taken_short")}</span>
                <span>{t("rmc.dispatched_at")}</span>
                <span>{t("common.status")}</span>
              </Row>
              {rows.map((x) => (
                <Row key={x.id} cols="120px 1fr 140px 70px 80px 80px 110px 110px" onClick={() => setDetailId(x.id)}>
                  <span style={{ fontWeight: 700, color: T.ind }}>
                    {x.challan_no}
                    {x.vendor_challan_no ? <div style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{x.vendor_challan_no}</div> : null}
                  </span>
                  <span style={{ color: T.t1 }}>{x.project_name || "—"}</span>
                  <span style={{ color: T.t2 }}>{x.plant_name || "—"}</span>
                  <span><GradePill g={x.grade} /></span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(x.qty_cum)} <span style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{unitOf(x)}</span></span>
                  <span style={{ textAlign: "right", color: N(x.rejected_cum) > 0 ? T.red : T.t3 }}>
                    {x.accepted_cum == null ? "—" : cum(x.accepted_cum)}
                  </span>
                  <span style={{ color: T.t3 }}>{x.dispatch_at ? fmtD(x.dispatch_at) : "—"}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                    <DispatchPill s={x.status} />
                    {x.temp_review === "pending" && <span style={{ fontSize: 9.5, fontWeight: 700, color: T.amb }}>{t("rmc.temp_needs_pm")}</span>}
                  </span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>

      {detailId && (
        <ChallanDrawer id={detailId} meta={meta} canCreate={canCreate} canDelete={canDelete}
          onClose={() => setDetailId(null)} onChanged={changed}
          onAccept={(d) => { setAcceptOn(d); }} />
      )}
      <ChallanForm open={formOpen} meta={meta} preset={preset} onGoSetup={onGoSetup}
        onClose={() => setFormOpen(false)} onSaved={changed} />
      <AcceptForm open={!!acceptOn} dispatch={acceptOn} onClose={() => setAcceptOn(null)}
        onDone={() => { setDetailId(null); changed(); }} />
    </div>
  );
}

export default RmcChallans;
