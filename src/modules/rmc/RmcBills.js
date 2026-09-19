// RMC › Bills — vendor ka concrete, transporter ki gaadi, aur plant ka rent.
//
// Rasta ek hi hai: period + plant + arrangement → PREVIEW (kuch save nahi
// hota) → "Draft banao" → detail me faisle → APPROVE par hi Finance me jaata
// hai. Draft banne ka matlab bill ban gaya NAHI hai.
//
// POST /rmc/bills/preview · POST /rmc/bills · GET /rmc/bills
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, cum, fmtD, fmtN, rupee, rget, rpost, dataOf, inp, inpSm, Field, Grid, Btn, Panel, Row,
  Scroll, Empty, ErrBox, Notice, Modal, Spinner, BillPill, IcAdd, billKindLabel, billStatusLabel,
  lineKindLabel, todayStr, monthStartStr,
} from "./rmcShared";
import BillDrawer from "./RmcBillDetail";

const KINDS = ["concrete", "transport", "rent"];
const STATUSES = ["draft", "approved", "cancelled"];
const LC = "110px 1.6fr 90px 100px 120px";

// ── Naya bill: pehle preview, phir draft ─────────────────────────
function NewBillModal({ open, meta, onClose, onCreated }) {
  const toast = useToast();
  const [v, setV] = useState({ kind: "concrete", plant_id: "", contract_id: "", party_id: "", from: monthStartStr(), to: todayStr(), vendor_bill_no: "", note: "" });
  const [pre, setPre] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setV({ kind: "concrete", plant_id: "", contract_id: "", party_id: "", from: monthStartStr(), to: todayStr(), vendor_bill_no: "", note: "" });
    setPre(null); setErr("");
  }, [open]);

  const upd = (k, val) => { setV((x) => ({ ...x, [k]: val })); setPre(null); };
  const contracts = (meta.contracts || []).filter((c) => !v.plant_id || Number(c.plant_id) === Number(v.plant_id));
  const body = () => ({
    kind: v.kind, plant_id: v.plant_id || null, contract_id: v.contract_id || null,
    party_id: v.party_id || null, from: v.from, to: v.to,
    vendor_bill_no: v.vendor_bill_no || null, note: v.note || null,
  });

  const preview = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/bills/preview", body());
    setBusy(false);
    if (!r || !r.success) { setPre(null); setErr((r && r.message) || t("rmc.save_failed")); return; }
    setPre(dataOf(r, null));
  };

  const makeDraft = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/bills", body());
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onCreated((dataOf(r, {}) || {}).id);
    onClose();
  };

  const lines = (pre && pre.lines) || [];
  const tot = (pre && pre.totals) || null;
  const hasRecovery = lines.some((l) => l.line_kind === "recovery");

  return (
    <Modal open={open} onClose={onClose} width={960} title={t("rmc.new_bill")} sub={t("rmc.new_bill_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn ghost onClick={preview} disabled={busy || (v.kind === "rent" ? !v.contract_id : !v.plant_id)}>
          {busy ? t("rmc.saving") : t("rmc.see_preview")}
        </Btn>
        <Btn onClick={makeDraft} disabled={busy || !pre || lines.length === 0}>{t("rmc.make_draft")}</Btn>
      </>}>
      <Grid cols={3} style={{ marginBottom: 12 }}>
        <Field label={t("rmc.bill_kind")} hint={v.kind === "concrete" ? t("rmc.scope_project") : t("rmc.scope_company")}>
          <select style={inp} value={v.kind} onChange={(e) => upd("kind", e.target.value)}>
            {KINDS.map((k) => <option key={k} value={k}>{billKindLabel(k)}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={v.plant_id} onChange={(e) => { upd("plant_id", e.target.value); setV((x) => ({ ...x, contract_id: "" })); }}>
            <option value="">{t("rmc.select_plant")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.arrangement")} hint={v.kind === "rent" ? t("rmc.rent_needs_arrangement") : ""}>
          <select style={inp} value={v.contract_id} onChange={(e) => upd("contract_id", e.target.value)}>
            <option value="">{t("common.all")}</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.from")}>
          <input type="date" style={inp} value={v.from} onChange={(e) => upd("from", e.target.value)} />
        </Field>
        <Field label={t("common.to")}>
          <input type="date" style={inp} value={v.to} onChange={(e) => upd("to", e.target.value)} />
        </Field>
        <Field label={t("rmc.party")} hint={t("rmc.bill_party_hint")}>
          <select style={inp} value={v.party_id} onChange={(e) => upd("party_id", e.target.value)}>
            <option value="">{t("rmc.party_from_arrangement")}</option>
            {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.vendor_bill_no")}>
          <input style={inp} value={v.vendor_bill_no} onChange={(e) => setV((x) => ({ ...x, vendor_bill_no: e.target.value }))} />
        </Field>
        <Field label={t("rmc.note")} span={2}>
          <input style={inp} value={v.note} onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))} />
        </Field>
      </Grid>

      {!pre ? <Notice>{t("rmc.preview_first")}</Notice> : (<>
        <Notice>{t("rmc.preview_note")}</Notice>
        {hasRecovery && <Notice tone="warn">{t("rmc.preview_recovery_note")}</Notice>}
        <Panel title={t("rmc.bill_lines")}>
          {lines.length === 0 ? <Empty>{t("rmc.no_billable")}</Empty> : (
            <Scroll minWidth={760}>
              <Row cols={LC} head>
                <span>{t("rmc.line_kind")}</span>
                <span>{t("rmc.line_detail")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
              </Row>
              {lines.map((l, i) => (
                <Row key={i} cols={LC} style={l.line_kind === "recovery" ? { background: T.ambL } : undefined}>
                  <span style={{ color: l.line_kind === "recovery" ? T.amb : T.t3, fontWeight: 700, fontSize: 11 }}>{lineKindLabel(l.line_kind)}</span>
                  <span style={{ color: T.t1 }}>{l.label}</span>
                  <span style={{ textAlign: "right" }}>{fmtN(l.qty)} {l.unit || ""}</span>
                  <span style={{ textAlign: "right", color: T.t3 }}>{rupee(l.rate)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(l.amount)}</span>
                </Row>
              ))}
              {tot && (
                <Row cols={LC} style={{ background: T.surfaceB, fontWeight: 700, color: T.t1 }}>
                  <span>{t("rmc.total")}</span>
                  <span style={{ color: T.t3, fontWeight: 400, fontSize: 11.5 }}>
                    {t("rmc.totals_line", { cum: cum(tot.cum_total), recovery: rupee(tot.recovery_amount) })}
                  </span>
                  <span /><span />
                  <span style={{ textAlign: "right" }}>{rupee(tot.total_amount)}</span>
                </Row>
              )}
            </Scroll>
          )}
        </Panel>
      </>)}
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

// ── Tab ──────────────────────────────────────────────────────────
const BC = "120px 110px 1fr 140px 150px 110px 130px 120px";

function RmcBills({ meta, canCreate, canEdit, canApprove, canDelete, refreshKey, onRefresh }) {
  const [fl, setFl] = useState({ status: "", party_id: "", kind: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/bills", fl);
    setRows(dataOf(r, []) || []);
    setLoading(false);
  }, [fl]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const changed = () => { load(); if (onRefresh) onRefresh(); };

  return (
    <div>
      <Notice>{t("rmc.bill_intro")}</Notice>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("rmc.bill_kind")}>
          <select style={{ ...inpSm, width: 160 }} value={fl.kind} onChange={(e) => setFl({ ...fl, kind: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {KINDS.map((k) => <option key={k} value={k}>{billKindLabel(k)}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.party")}>
          <select style={{ ...inpSm, width: 200 }} value={fl.party_id} onChange={(e) => setFl({ ...fl, party_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select style={{ ...inpSm, width: 150 }} value={fl.status} onChange={(e) => setFl({ ...fl, status: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{billStatusLabel(s)}</option>)}
          </select>
        </Field>
        <span style={{ flex: 1 }} />
        {canCreate && <Btn icon={IcAdd} onClick={() => setFormOpen(true)}>{t("rmc.new_bill")}</Btn>}
      </div>

      <Panel title={t("rmc.bill_list", { n: rows.length })}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_bills")}</Empty> : (
            <Scroll minWidth={1000}>
              <Row cols={BC} head>
                <span>{t("rmc.bill_no")}</span>
                <span>{t("rmc.bill_kind")}</span>
                <span>{t("rmc.party")}</span>
                <span>{t("rmc.plant")}</span>
                <span>{t("rmc.period")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.cum")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.bill_total")}</span>
                <span>{t("common.status")}</span>
              </Row>
              {rows.map((x) => (
                <Row key={x.id} cols={BC} onClick={() => setDetailId(x.id)}>
                  <span style={{ fontWeight: 700, color: T.ind }}>{x.bill_no}</span>
                  <span style={{ color: T.t2 }}>{billKindLabel(x.kind)}</span>
                  <span style={{ color: T.t1 }}>{x.party_name || "—"}</span>
                  <span style={{ color: T.t2 }}>{x.plant_name || "—"}</span>
                  <span style={{ color: T.t3, fontSize: 11.5 }}>{fmtD(x.from_date) + " – " + fmtD(x.to_date)}</span>
                  <span style={{ textAlign: "right" }}>{cum(x.cum_total)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>
                    {rupee(x.total_amount)}
                    {N(x.recovery_amount) > 0 && (
                      <div style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>− {rupee(x.recovery_amount)}</div>
                    )}
                  </span>
                  <span><BillPill s={x.status} /></span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>

      <NewBillModal open={formOpen} meta={meta} onClose={() => setFormOpen(false)}
        onCreated={(id) => { if (id) setDetailId(id); changed(); }} />
      {detailId && (
        <BillDrawer id={detailId} canEdit={canEdit} canApprove={canApprove} canDelete={canDelete}
          onClose={() => setDetailId(null)} onChanged={changed} />
      )}
    </div>
  );
}

export default RmcBills;
