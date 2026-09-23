// RMC › Bills › bikri ka invoice — bahar becha hua concrete, GST ke saath.
//
// Rasta wahi hai jo vendor bill ka hai: customer + plant + arrangement +
// period → PREVIEW (kuch save nahi hota) → "Draft banao" → APPROVE. Customer
// ke ledger me sales entry APPROVE par banti hai, draft banne par NAHI.
//
// Kis state ko maal ja raha hai (place of supply) customer ke GSTIN ke pehle
// do number se apne aap aata hai — GSTIN na ho to state haath se select karni
// padti hai, aur usi se tay hota hai CGST+SGST lagega ya IGST.
//
// Invoice ka detail, approve aur cancel: RmcSalesDetail.js
//
// POST /rmc/sales/preview · POST /rmc/sales · GET /rmc/sales
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, cum, fmtD, fmtN, rupee, rget, rpost, dataOf, inp, inpSm, Field, Grid, Btn, Panel,
  Row, Scroll, Empty, ErrBox, Notice, Modal, Spinner, BillPill, billStatusLabel,
  lineKindLabel, todayStr, monthStartStr,
  lineUnit,
} from "./rmcShared";
import InvoiceDrawer, { TaxBox } from "./RmcSalesDetail";

const STATUSES = ["draft", "approved", "cancelled"];

// GST ka state code — GSTIN ke pehle do number. Wahi list backend me bhi hai
// (utils/rmcGst.js STATE_NAMES); yahan sirf tab chahiye jab customer ka GSTIN
// hi na ho aur state haath se select karni pade.
const STATES = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  10: "Bihar", 11: "Sikkim", 12: "Arunachal Pradesh", 13: "Nagaland", 14: "Manipur",
  15: "Mizoram", 16: "Tripura", 17: "Meghalaya", 18: "Assam", 19: "West Bengal",
  20: "Jharkhand", 21: "Odisha", 22: "Chhattisgarh", 23: "Madhya Pradesh", 24: "Gujarat",
  26: "Dadra & Nagar Haveli and Daman & Diu", 27: "Maharashtra", 29: "Karnataka",
  30: "Goa", 31: "Lakshadweep", 32: "Kerala", 33: "Tamil Nadu", 34: "Puducherry",
  35: "Andaman & Nicobar Islands", 36: "Telangana", 37: "Andhra Pradesh", 38: "Ladakh",
  97: "Other Territory",
};
const STATE_CODES = Object.keys(STATES);

// ── Naya invoice: pehle preview, phir draft ──────────────────────
const PL = "100px 1.5fr 90px 100px 70px 110px";
const blankInvoice = () => ({
  customer_party_id: "", plant_id: "", contract_id: "", from: monthStartStr(),
  to: todayStr(), invoice_date: todayStr(), place_of_supply_code: "", note: "",
});

function NewInvoiceModal({ open, meta, onClose, onCreated }) {
  const toast = useToast();
  const [v, setV] = useState(blankInvoice);
  const [pre, setPre] = useState(null);
  // Customer ka GSTIN na ho to state ka picker chahiye. Ye baat sirf preview
  // se pata chalti hai, isliye alag se yaad rakhte hain — warna state select
  // karte hi preview saaf hota hai aur picker screen se gayab ho jaata hai.
  const [needState, setNeedState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setV(blankInvoice()); setPre(null); setNeedState(false); setErr("");
  }, [open]);

  const upd = (k, val) => { setV((x) => ({ ...x, [k]: val })); setPre(null); };
  const pickCustomer = (val) => { upd("customer_party_id", val); setNeedState(false); };
  // Bikri wali arrangement hi invoice bana sakti hai (direction = sell).
  const contracts = (meta.contracts || []).filter((c) =>
    c.direction === "sell" && (!v.plant_id || Number(c.plant_id) === Number(v.plant_id)));
  const body = () => ({
    customer_party_id: v.customer_party_id || null, plant_id: v.plant_id || null,
    contract_id: v.contract_id || null, from: v.from, to: v.to,
    invoice_date: v.invoice_date, place_of_supply_code: v.place_of_supply_code || null,
    note: v.note || null,
  });

  const preview = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/sales/preview", body());
    setBusy(false);
    if (!r || !r.success) { setPre(null); setErr((r && r.message) || t("rmc.save_failed")); return; }
    const d = dataOf(r, null);
    setPre(d);
    setNeedState(!!d && !(d.party && d.party.gstin));
  };

  const makeDraft = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/sales", body());
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onCreated((dataOf(r, {}) || {}).id);
    onClose();
  };

  const lines = (pre && pre.lines) || [];
  const tot = pre && pre.totals;
  const pos = (pre && pre.place_of_supply) || null;
  const posMissing = needState && !v.place_of_supply_code;

  return (
    <Modal open={open} onClose={onClose} width={980} title={t("rmc.new_invoice")} sub={t("rmc.new_invoice_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn ghost onClick={preview} disabled={busy || !v.customer_party_id}>
          {busy ? t("rmc.saving") : t("rmc.see_preview")}
        </Btn>
        <Btn onClick={makeDraft} disabled={busy || !pre || lines.length === 0 || posMissing}>
          {t("rmc.make_draft")}
        </Btn>
      </>}>
      <Grid cols={3} style={{ marginBottom: 12 }}>
        <Field label={t("rmc.customer")}>
          <select style={inp} value={v.customer_party_id} onChange={(e) => pickCustomer(e.target.value)}>
            <option value="">{t("rmc.select_customer")}</option>
            {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={v.plant_id} onChange={(e) => { upd("plant_id", e.target.value); setV((x) => ({ ...x, contract_id: "" })); }}>
            <option value="">{t("common.all")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.arrangement")} hint={t("rmc.sell_arrangement_hint")}>
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
        <Field label={t("rmc.invoice_date")}>
          <input type="date" style={inp} value={v.invoice_date}
            onChange={(e) => setV((x) => ({ ...x, invoice_date: e.target.value }))} />
        </Field>
        {needState && (
          <Field label={t("rmc.place_of_supply")} hint={t("rmc.pos_hint")} span={2}>
            <select style={inp} value={v.place_of_supply_code}
              onChange={(e) => upd("place_of_supply_code", e.target.value)}>
              <option value="">{t("rmc.select_state")}</option>
              {STATE_CODES.map((c) => <option key={c} value={c}>{STATES[c]}</option>)}
            </select>
          </Field>
        )}
        <Field label={t("rmc.note")} span={needState ? 1 : 3}>
          <input style={inp} value={v.note} onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))} />
        </Field>
      </Grid>

      {posMissing && <Notice tone="warn">{t("rmc.pos_needed")}</Notice>}
      {!pre ? <Notice>{t("rmc.preview_first")}</Notice> : (<>
        <Notice>{t("rmc.sales_preview_note")}</Notice>
        <Panel title={t("rmc.invoice_lines")}>
          {lines.length === 0 ? <Empty>{t("rmc.no_sellable")}</Empty> : (
            <Scroll minWidth={780}>
              <Row cols={PL} head>
                <span>{t("rmc.line_kind")}</span>
                <span>{t("rmc.line_detail")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.gst_pct")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
              </Row>
              {lines.map((l, i) => (
                <Row key={i} cols={PL}>
                  <span style={{ color: T.t3, fontWeight: 700, fontSize: 11 }}>{lineKindLabel(l.line_kind)}</span>
                  <span style={{ color: T.t1 }}>{l.label}</span>
                  <span style={{ textAlign: "right" }}>{fmtN(l.qty)} {l.unit || ""}</span>
                  <span style={{ textAlign: "right", color: T.t3 }}>{rupee(l.rate)}</span>
                  <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(l.gst_pct)}%</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(l.amount)}</span>
                </Row>
              ))}
            </Scroll>
          )}
        </Panel>
        {tot && lines.length > 0 && (
          <TaxBox tot={tot} intra={!!(pos && pos.intra_state)} posName={pos && (pos.name || pos.code)} />
        )}
        {lines.length > 0 && (
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 8 }}>
            {t("rmc.sale_cum_line", { cum: cum(pre.cum_total), unit: lineUnit(lines) })}
          </div>
        )}
      </>)}
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

// ── Bikri ki list ────────────────────────────────────────────────
const SC = "120px 1fr 130px 150px 100px 130px 110px";

function RmcSales({ meta, canCreate, canApprove, canDelete, refreshKey, onRefresh }) {
  const [fl, setFl] = useState({ status: "", customer_party_id: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(dataOf(await rget("/sales", fl), []) || []);
    setLoading(false);
  }, [fl]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const changed = () => { load(); if (onRefresh) onRefresh(); };

  return (
    <div>
      <Notice>{t("rmc.sales_intro")}</Notice>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("rmc.customer")}>
          <select style={{ ...inpSm, width: 200 }} value={fl.customer_party_id}
            onChange={(e) => setFl({ ...fl, customer_party_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select style={{ ...inpSm, width: 150 }} value={fl.status}
            onChange={(e) => setFl({ ...fl, status: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{billStatusLabel(s)}</option>)}
          </select>
        </Field>
        <span style={{ flex: 1 }} />
        {canCreate && <Btn onClick={() => setFormOpen(true)}>{t("rmc.new_invoice")}</Btn>}
      </div>

      <Panel title={t("rmc.invoice_list", { n: rows.length })}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_invoices")}</Empty> : (
            <Scroll minWidth={980}>
              <Row cols={SC} head>
                <span>{t("rmc.invoice_no")}</span>
                <span>{t("rmc.customer")}</span>
                <span>{t("rmc.plant")}</span>
                <span>{t("rmc.period")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty_short")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.invoice_total")}</span>
                <span>{t("common.status")}</span>
              </Row>
              {rows.map((x) => (
                <Row key={x.id} cols={SC} onClick={() => setDetailId(x.id)}>
                  <span style={{ fontWeight: 700, color: T.ind }}>{x.invoice_no}</span>
                  <span style={{ color: T.t1 }}>{x.customer_name || "—"}</span>
                  <span style={{ color: T.t2 }}>{x.plant_name || "—"}</span>
                  <span style={{ color: T.t3, fontSize: 11.5 }}>{fmtD(x.from_date) + " – " + fmtD(x.to_date)}</span>
                  <span style={{ textAlign: "right" }}>{cum(x.cum_total)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>
                    {rupee(x.total_amount)}
                    <div style={{ fontSize: 10, color: T.t4, fontWeight: 400 }}>
                      {x.intra_state ? t("rmc.cgst_sgst_short") : t("rmc.igst_short")}
                    </div>
                  </span>
                  <span><BillPill s={x.status} /></span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>

      <NewInvoiceModal open={formOpen} meta={meta} onClose={() => setFormOpen(false)}
        onCreated={(id) => { if (id) setDetailId(id); changed(); }} />
      {detailId && (
        <InvoiceDrawer id={detailId} canApprove={canApprove} canDelete={canDelete}
          onClose={() => setDetailId(null)} onChanged={changed} />
      )}
    </div>
  );
}

export default RmcSales;
