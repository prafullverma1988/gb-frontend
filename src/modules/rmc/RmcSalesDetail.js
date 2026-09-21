// RMC › bikri ke invoice ka detail — lines, GST ka jod, approve aur cancel.
//
// Paisa chupke se nahi chalta: draft sirf hisaab-kitaab hai, customer ke
// ledger me sales entry APPROVE par banti hai. Usi waqt jude hue challan par
// nishaan lag jaata hai taaki wahi challan dobara kisi invoice me na aaye.
//
// Tax ka box aur slab table yahan se export hote hain — preview (RmcSales)
// aur saved invoice, dono ek hi shakl me dikhne chahiye.
//
// GET /rmc/sales/:id · POST /rmc/sales/:id/approve · /rmc/sales/:id/cancel
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, cum, fmtD, fmtN, rupee, rget, rpost, dataOf, KV, Grid, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Notice, Drawer, Spinner, BillPill, lineKindLabel,
  lineUnit,
} from "./rmcShared";

// ── Tax ka jod ───────────────────────────────────────────────────
// Ek hi state ho to CGST + SGST, alag ho to IGST — poore desh ka tareeka
// yahi hai, isliye dono ek saath kabhi nahi dikhte.
export const TaxBox = ({ tot, intra, posName }) => (
  <div style={{ border: `1.5px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", marginTop: 12 }}>
    {[
      [t("rmc.taxable"), rupee(tot.taxable_amount), false],
      ...(intra
        ? [[t("rmc.cgst"), rupee(tot.cgst_amount), false], [t("rmc.sgst"), rupee(tot.sgst_amount), false]]
        : [[t("rmc.igst"), rupee(tot.igst_amount), false]]),
      [t("rmc.round_off"), (N(tot.round_off) < 0 ? "− " : "+ ") + rupee(Math.abs(N(tot.round_off))), false],
      [t("rmc.invoice_total"), rupee(tot.total_amount), true],
    ].map(([k, v, big], i) => (
      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: big ? "11px 14px" : "8px 14px", borderTop: i ? `1px solid ${T.b1}` : "none", background: big ? T.indL : T.surface }}>
        <span style={{ fontSize: big ? 12.5 : 11.5, color: big ? T.ind : T.t3, fontWeight: big ? 800 : 600 }}>{k}</span>
        <span style={{ fontSize: big ? 15 : 12.5, color: big ? T.ind : T.t1, fontWeight: big ? 800 : 700 }}>{v}</span>
      </div>
    ))}
    <div style={{ padding: "8px 14px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, fontSize: 11, color: T.t3 }}>
      {t("rmc.pos_is", { s: posName || "—" })} · {intra ? t("rmc.intra_note") : t("rmc.inter_note")}
    </div>
  </div>
);

export const SlabTable = ({ slabs }) => (
  <Scroll minWidth={420}>
    <Row cols="100px 1fr 1fr" head>
      <span>{t("rmc.gst_pct")}</span>
      <span style={{ textAlign: "right" }}>{t("rmc.taxable")}</span>
      <span style={{ textAlign: "right" }}>{t("rmc.tax")}</span>
    </Row>
    {(slabs || []).map((s) => (
      <Row key={s.gst_pct} cols="100px 1fr 1fr">
        <span style={{ fontWeight: 700, color: T.t1 }}>{fmtN(s.gst_pct)}%</span>
        <span style={{ textAlign: "right" }}>{rupee(s.taxable)}</span>
        <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(s.tax)}</span>
      </Row>
    ))}
  </Scroll>
);

// ── Invoice ka drawer ────────────────────────────────────────────
const DL = "100px 1.5fr 110px 80px 90px 70px 110px";

function InvoiceDrawer({ id, canApprove, canDelete, onClose, onChanged }) {
  const toast = useToast();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("");        // "" | cancel
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setInv(dataOf(await rget(`/sales/${id}`), null));
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const lines = (inv && inv.lines) || [];
  const isDraft = !!inv && inv.status === "draft";

  const approve = async () => {
    setErr(""); setBusy(true);
    const r = await rpost(`/sales/${id}/approve`, {});
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.went_to_ledger"));
    await load(); onChanged();
  };
  const cancel = async () => {
    setErr(""); setBusy(true);
    const r = await rpost(`/sales/${id}/cancel`, {});
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onChanged(); onClose();
  };

  const tot = inv ? {
    taxable_amount: inv.taxable_amount, cgst_amount: inv.cgst_amount, sgst_amount: inv.sgst_amount,
    igst_amount: inv.igst_amount, round_off: inv.round_off, total_amount: inv.total_amount,
  } : null;

  return (
    <Drawer open onClose={onClose} width={900}
      title={(inv && inv.invoice_no) || t("rmc.invoice")}
      head={inv ? <BillPill s={inv.status} /> : null}
      sub={inv ? [inv.customer_name, inv.plant_name].filter(Boolean).join(" · ") : ""}
      footer={!inv ? null : (
        mode === "cancel" ? (<>
          <Btn ghost onClick={() => { setMode(""); setErr(""); }}>{t("common.back")}</Btn>
          <Btn c={T.red} onClick={cancel} disabled={busy}>{busy ? t("rmc.saving") : t("rmc.cancel_invoice")}</Btn>
        </>) : isDraft ? (<>
          {canDelete && <Btn ghost c={T.red} onClick={() => setMode("cancel")}>{t("rmc.cancel_invoice")}</Btn>}
          {canApprove && (
            <Btn c={T.grn} onClick={approve} disabled={busy}>
              {busy ? t("rmc.saving") : t("rmc.approve_invoice")}
            </Btn>
          )}
        </>) : null
      )}>
      {loading ? <Spinner label={t("common.loading")} />
        : !inv ? <Empty>{t("rmc.invoice_not_found")}</Empty> : (<>
          <Grid cols={4} style={{ marginBottom: 14 }}>
            <KV k={t("rmc.customer")} v={inv.customer_name} />
            <KV k={t("rmc.plant")} v={inv.plant_name} />
            <KV k={t("rmc.invoice_date")} v={fmtD(inv.invoice_date)} />
            <KV k={t("rmc.period")} v={fmtD(inv.from_date) + " – " + fmtD(inv.to_date)} />
            <KV k={t("rmc.buyer_gstin")} v={inv.buyer_gstin || t("rmc.no_gstin")} />
            <KV k={t("rmc.seller_gstin")} v={inv.seller_gstin} />
            <KV k={t("rmc.place_of_supply")} v={inv.place_of_supply || inv.place_of_supply_code} />
            <KV k={t("rmc.qty_short")} v={cum(inv.cum_total) + " " + lineUnit(lines)} />
          </Grid>

          {isDraft && <Notice tone="warn">{t("rmc.invoice_draft_note")}</Notice>}
          {inv.status === "approved" && <Notice>{t("rmc.invoice_approved_note")}</Notice>}
          {inv.note && <div style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{inv.note}</div>}

          <Panel title={t("rmc.invoice_lines")}>
            {lines.length === 0 ? <Empty>{t("rmc.no_invoice_lines")}</Empty> : (
              <Scroll minWidth={840}>
                <Row cols={DL} head>
                  <span>{t("rmc.line_kind")}</span>
                  <span>{t("rmc.line_detail")}</span>
                  <span>{t("rmc.hsn")}</span>
                  <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
                  <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
                  <span style={{ textAlign: "right" }}>{t("rmc.gst_pct")}</span>
                  <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
                </Row>
                {lines.map((l) => (
                  <Row key={l.id} cols={DL}>
                    <span style={{ color: T.t3, fontWeight: 700, fontSize: 11 }}>{lineKindLabel(l.line_kind)}</span>
                    <span style={{ color: T.t1 }}>{l.label}</span>
                    <span style={{ color: T.t3 }}>{l.hsn || "—"}</span>
                    <span style={{ textAlign: "right" }}>{fmtN(l.qty)} {l.unit || ""}</span>
                    <span style={{ textAlign: "right", color: T.t3 }}>{rupee(l.rate)}</span>
                    <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(l.gst_pct)}%</span>
                    <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(l.amount)}</span>
                  </Row>
                ))}
              </Scroll>
            )}
          </Panel>

          {tot && <TaxBox tot={tot} intra={!!inv.intra_state} posName={inv.place_of_supply || inv.place_of_supply_code} />}

          {(inv.slabs || []).length > 0 && (
            <Panel title={t("rmc.tax_summary")} style={{ marginTop: 14 }}>
              <SlabTable slabs={inv.slabs} />
            </Panel>
          )}

          {inv.status === "approved" && inv.transaction_id && (
            <Panel title={t("rmc.finance_entries")} style={{ marginTop: 14 }}>
              <Row cols="1fr 140px 140px">
                <span style={{ color: T.t1 }}>{inv.customer_name}</span>
                <span style={{ color: T.t3 }}>{"#" + inv.transaction_id}</span>
                <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(inv.total_amount)}</span>
              </Row>
            </Panel>
          )}

          {mode === "cancel" && (
            <Panel title={t("rmc.cancel_invoice")} style={{ marginTop: 14 }}>
              <div style={{ padding: 14 }}><Notice tone="warn">{t("rmc.cancel_invoice_note")}</Notice></div>
            </Panel>
          )}
          <ErrBox>{err}</ErrBox>
        </>)}
    </Drawer>
  );
}

export { InvoiceDrawer };
export default InvoiceDrawer;
