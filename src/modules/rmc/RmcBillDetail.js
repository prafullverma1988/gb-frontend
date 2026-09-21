// RMC › Bill ka detail — lines, recovery ka faisla, approve aur cancel.
//
// Paisa chupke se nahi badalta: draft sirf hisaab hai, Finance me entry
// APPROVE par banti hai. Recovery line par faisla (charge/reduce/waive) liye
// bina approve ka button band rehta hai — server bhi 409 deta hai.
//
// GET /rmc/bills/:id · PATCH /rmc/bills/:id/lines/:lineId
// POST /rmc/bills/:id/approve · /rmc/bills/:id/cancel
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, cum, fmtD, fmtN, rupee, rget, rpost, rpatch, dataOf, inpSm, Field, Grid, KV, Btn,
  Panel, Row, Scroll, Empty, ErrBox, Notice, Drawer, Spinner, BillPill, billKindLabel,
  lineKindLabel, decisionLabel,
  lineUnit,
} from "./rmcShared";

const ORDER = ["concrete", "transport", "pump", "waiting", "short_load", "rent", "min_guarantee", "recovery"];
const LC = "1.6fr 90px 100px 120px";

// Ek saadhi line — concrete, transport, pump, waiting, short load, rent.
const PlainLines = ({ lines }) => (
  <Scroll minWidth={620}>
    <Row cols={LC} head>
      <span>{t("rmc.line_detail")}</span>
      <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
      <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
      <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
    </Row>
    {lines.map((l) => (
      <Row key={l.id || l.label} cols={LC}>
        <span style={{ color: T.t1 }}>
          {l.label}
          {l.project_name ? <div style={{ fontSize: 10.5, color: T.t4 }}>{l.project_name}</div> : null}
        </span>
        <span style={{ textAlign: "right" }}>{fmtN(l.qty)} {l.unit || ""}</span>
        <span style={{ textAlign: "right", color: T.t3 }}>{rupee(l.rate)}</span>
        <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(l.amount)}</span>
      </Row>
    ))}
  </Scroll>
);

// Recovery line — yahan paisa kat'ta hai, isliye faisla likhna padta hai.
function RecoveryLine({ billId, line, canEdit, editable, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState("");          // "" | charge | reduce | waive
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async (decision) => {
    setErr(""); setBusy(true);
    const r = await rpatch(`/bills/${billId}/lines/${line.id}`, {
      decision, amount: decision === "reduce" ? amount : undefined, note: note.trim() || undefined,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    setMode(""); setAmount(""); setNote("");
    onDone();
  };

  const done = !!line.decision;
  return (
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.b1}`, background: done ? T.surface : T.ambL }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600 }}>{line.label}</div>
          <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>
            {fmtN(line.qty)} {line.unit || ""} · {rupee(line.rate)}
          </div>
          {done && (
            <div style={{ fontSize: 11, color: T.grn, fontWeight: 700, marginTop: 4 }}>
              {decisionLabel(line.decision)}{line.decision_note ? " — " + line.decision_note : ""}
            </div>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: done ? T.t1 : T.amb }}>{rupee(line.amount)}</div>
      </div>

      {!done && editable && canEdit && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Btn size="sm" ghost={mode !== "charge"} onClick={() => setMode("charge")}>{t("rmc.dec_charge")}</Btn>
            <Btn size="sm" ghost={mode !== "reduce"} onClick={() => setMode("reduce")}>{t("rmc.dec_reduce")}</Btn>
            <Btn size="sm" ghost={mode !== "waive"} onClick={() => setMode("waive")}>{t("rmc.dec_waive")}</Btn>
          </div>
          {mode && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
              {mode === "reduce" && (
                <Field label={t("rmc.charge_how_much")} hint={t("rmc.reduce_hint", { max: rupee(line.amount) })}>
                  <input style={{ ...inpSm, width: 140 }} type="number" step="0.01" value={amount}
                    onChange={(e) => setAmount(e.target.value)} />
                </Field>
              )}
              {mode !== "charge" && (
                <Field label={t("rmc.reason")}>
                  <input style={{ ...inpSm, width: 260 }} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={t("rmc.reason_ph")} />
                </Field>
              )}
              <Btn size="sm" onClick={() => send(mode)} disabled={busy}>
                {busy ? t("rmc.saving") : t("rmc.save_decision")}
              </Btn>
            </div>
          )}
          <ErrBox>{err}</ErrBox>
        </div>
      )}
      {!done && (!editable || !canEdit) && (
        <div style={{ fontSize: 11, color: T.amb, fontWeight: 700, marginTop: 6 }}>{t("rmc.decision_left")}</div>
      )}
    </div>
  );
}

function BillDrawer({ id, canEdit, canApprove, canDelete, onClose, onChanged }) {
  const toast = useToast();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("");        // "" | cancel
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setB(dataOf(await rget(`/bills/${id}`), null));
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const lines = (b && b.lines) || [];
  const txns = (b && b.txns) || [];
  const pending = b ? N(b.pending_decisions) : 0;
  const isDraft = !!b && b.status === "draft";

  const approve = async () => {
    setErr(""); setBusy(true);
    const r = await rpost(`/bills/${id}/approve`, {});
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.bill_went_finance"));
    await load(); onChanged();
  };

  const cancel = async () => {
    setErr(""); setBusy(true);
    const r = await rpost(`/bills/${id}/cancel`, {});
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onChanged(); onClose();
  };

  const groups = ORDER.map((k) => ({ k, rows: lines.filter((l) => l.line_kind === k) })).filter((g) => g.rows.length);

  return (
    <Drawer open onClose={onClose} width={860}
      title={(b && b.bill_no) || t("rmc.bill")}
      head={b ? <BillPill s={b.status} /> : null}
      sub={b ? [billKindLabel(b.kind), b.party_name, b.plant_name].filter(Boolean).join(" · ") : ""}
      footer={!b ? null : (
        mode === "cancel" ? (<>
          <Btn ghost onClick={() => { setMode(""); setErr(""); }}>{t("common.back")}</Btn>
          <Btn c={T.red} onClick={cancel} disabled={busy}>{busy ? t("rmc.saving") : t("rmc.cancel_bill")}</Btn>
        </>) : isDraft ? (<>
          {canDelete && <Btn ghost c={T.red} onClick={() => setMode("cancel")}>{t("rmc.cancel_bill")}</Btn>}
          {canApprove && (
            <Btn c={T.grn} onClick={approve} disabled={busy || pending > 0}
              title={pending > 0 ? t("rmc.decision_needed", { n: pending }) : ""}>
              {busy ? t("rmc.saving") : t("rmc.approve_send_finance")}
            </Btn>
          )}
        </>) : null
      )}>
      {loading ? <Spinner label={t("common.loading")} />
        : !b ? <Empty>{t("rmc.bill_not_found")}</Empty> : (<>
          <Grid cols={4} style={{ marginBottom: 14 }}>
            <KV k={t("rmc.bill_kind")} v={billKindLabel(b.kind)} />
            <KV k={t("rmc.party")} v={b.party_name} />
            <KV k={t("rmc.plant")} v={b.plant_name} />
            <KV k={t("rmc.period")} v={fmtD(b.from_date) + " – " + fmtD(b.to_date)} />
            <KV k={t("rmc.qty_short")} v={cum(b.cum_total) + " " + lineUnit(lines)} />
            <KV k={t("rmc.concrete_amount")} v={rupee(b.concrete_amount)} />
            <KV k={t("rmc.transport_amount")} v={rupee(b.transport_amount)} />
            <KV k={t("rmc.extra_amount")} v={rupee(b.extra_amount)} />
            <KV k={t("rmc.recovery_amount")} v={<span style={{ color: T.red }}>− {rupee(b.recovery_amount)}</span>} />
            <KV k={t("rmc.bill_total")} v={<span style={{ fontSize: 15, color: T.ind }}>{rupee(b.total_amount)}</span>} />
            <KV k={t("rmc.vendor_bill_no")} v={b.vendor_bill_no} />
            <KV k={t("rmc.bill_scope")} v={b.scope === "project" ? t("rmc.scope_project") : t("rmc.scope_company")} />
          </Grid>

          {isDraft && <Notice tone="warn">{t("rmc.bill_draft_note")}</Notice>}
          {isDraft && pending > 0 && <Notice tone="warn">{t("rmc.decision_needed", { n: pending })}</Notice>}
          {b.status === "approved" && <Notice>{t("rmc.bill_approved_note")}</Notice>}
          {b.note && <div style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{b.note}</div>}

          {groups.map((g) => (
            <Panel key={g.k} title={lineKindLabel(g.k) + " · " + rupee(g.rows.reduce((s, l) => s + N(l.amount), 0))} style={{ marginBottom: 12 }}>
              {g.k === "recovery" ? (<>
                <div style={{ padding: "10px 14px", fontSize: 11.5, color: T.t3, lineHeight: 1.55, borderBottom: `1px solid ${T.b1}` }}>
                  {t("rmc.recovery_note")}
                </div>
                {g.rows.map((l) => (
                  <RecoveryLine key={l.id} billId={b.id} line={l} canEdit={canEdit} editable={isDraft} onDone={() => { load(); onChanged(); }} />
                ))}
              </>) : (<>
                {g.k === "min_guarantee" && (
                  <div style={{ padding: "10px 14px", fontSize: 11.5, color: T.t3, lineHeight: 1.55, borderBottom: `1px solid ${T.b1}` }}>
                    {t("rmc.min_guarantee_note")}
                  </div>
                )}
                <PlainLines lines={g.rows} />
              </>)}
            </Panel>
          ))}
          {groups.length === 0 && <Panel><Empty>{t("rmc.no_bill_lines")}</Empty></Panel>}

          {txns.length > 0 && (
            <Panel title={t("rmc.finance_entries")} style={{ marginTop: 6 }}>
              <Scroll minWidth={520}>
                <Row cols="1fr 140px 140px" head>
                  <span>{t("common.project")}</span>
                  <span>{t("rmc.txn_id")}</span>
                  <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
                </Row>
                {txns.map((x) => (
                  <Row key={x.id} cols="1fr 140px 140px">
                    <span style={{ color: T.t1 }}>{x.project_id ? "#" + x.project_id : t("rmc.scope_company")}</span>
                    <span style={{ color: T.t3 }}>{"#" + x.transaction_id}</span>
                    <span style={{ textAlign: "right", fontWeight: 700 }}>{rupee(x.amount)}</span>
                  </Row>
                ))}
              </Scroll>
            </Panel>
          )}

          {isDraft && canApprove && pending === 0 && (
            <div style={{ fontSize: 11, color: T.t4, marginTop: 10, lineHeight: 1.55 }}>{t("rmc.approve_bill_note")}</div>
          )}
          {mode === "cancel" && (
            <Panel title={t("rmc.cancel_bill")} style={{ marginTop: 14 }}>
              <div style={{ padding: 14 }}><Notice tone="warn">{t("rmc.cancel_bill_note")}</Notice></div>
            </Panel>
          )}
          <ErrBox>{err}</ErrBox>
        </>)}
    </Drawer>
  );
}

export { BillDrawer, PlainLines };
export default BillDrawer;
