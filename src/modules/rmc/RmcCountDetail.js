// RMC › Ginti — nayi ginti ka form aur ek ginti ka poora detail.
//
// Do niyam jo screen par dikhne chahiye (API contract Phase 2, section 1):
//   • Bhejne par stock nahi badalta — sirf APPROVE par sudhrta hai.
//   • Jis line me antar hai wahan wajah zaroori hai, warna submit 400 deta hai.
//
// GET /rmc/stock-checks/new?plant_id · POST /rmc/stock-checks
// PATCH /rmc/stock-checks/:id · POST /:id/submit · /:id/approve · /:id/reject
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, fmtN, fmtDT, rupee, rget, rpost, rpatch, dataOf, inp, inpSm, Field, Grid, KV, Btn,
  Panel, Row, Scroll, Empty, ErrBox, Notice, Modal, Drawer, Spinner, CountPill, diffColor,
  nowLocal, countStatusLabel,
} from "./rmcShared";

// Ek line ka antar — server bhi yahi ganit karta hai (book − counted), isliye
// user ko wahi number pehle se dikhta hai jo save hone par banega.
export const rowDiff = (it) => {
  const raw = it.counted_qty;
  const counted = raw === "" || raw == null ? null : Number(raw);
  if (counted == null || !Number.isFinite(counted)) return { counted: null, diff: null, amount: 0 };
  const diff = Math.round((N(it.book_qty) - counted) * 1000) / 1000;
  return { counted, diff, amount: Math.round(diff * N(it.rate) * 100) / 100 };
};
const hasDiff = (d) => d != null && Math.abs(d) > 0.0001;

const COLS = "1.2fr 60px 95px 105px 95px 110px 1.3fr";

// Ginti ki table. Nayi ginti aur draft — dono jagah yahi, taaki bharte waqt
// aur baad me dekhne par ek hi shakl rahe.
function CountRows({ items, editable, onChange }) {
  const totalDiff = items.reduce((s, it) => s + rowDiff(it).amount, 0);
  return (
    <Scroll minWidth={880}>
      <Row cols={COLS} head>
        <span>{t("rmc.material")}</span>
        <span>{t("rmc.unit")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.book_qty")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.counted_qty")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.diff_qty")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.diff_amount")}</span>
        <span>{t("rmc.reason")}</span>
      </Row>
      {items.map((it, i) => {
        const d = rowDiff(it);
        const need = hasDiff(d.diff) && !String(it.reason || "").trim();
        return (
          <Row key={it.id || it.material_id || i} cols={COLS}>
            <span style={{ color: T.t1, fontWeight: 600 }}>{it.material_name}</span>
            <span style={{ color: T.t3 }}>{it.unit || "—"}</span>
            <span style={{ textAlign: "right" }}>{fmtN(it.book_qty)}</span>
            <span style={{ textAlign: "right" }}>
              {editable ? (
                <input style={{ ...inpSm, textAlign: "right" }} type="number" step="0.001"
                  value={it.counted_qty == null ? "" : it.counted_qty}
                  onChange={(e) => onChange(i, { counted_qty: e.target.value })} />
              ) : (it.counted_qty == null ? <span style={{ color: T.t4 }}>{t("rmc.not_counted")}</span> : fmtN(it.counted_qty))}
            </span>
            <span style={{ textAlign: "right", fontWeight: 700, color: diffColor(d.diff) }}>
              {d.diff == null ? "—" : fmtN(d.diff)}
            </span>
            <span style={{ textAlign: "right", color: diffColor(d.diff) }}>
              {d.diff == null ? "—" : rupee(d.amount)}
            </span>
            <span>
              {editable ? (
                <input style={{ ...inpSm, borderColor: need ? T.red : T.b1, background: need ? T.redL : T.surface }}
                  value={it.reason || ""} placeholder={need ? t("rmc.reason_needed_row") : t("rmc.reason_ph")}
                  onChange={(e) => onChange(i, { reason: e.target.value })} />
              ) : (
                <span style={{ color: need ? T.red : T.t3 }}>{it.reason || (need ? t("rmc.reason_needed_row") : "—")}</span>
              )}
            </span>
          </Row>
        );
      })}
      <Row cols={COLS} style={{ background: T.surfaceB, fontWeight: 700, color: T.t1 }}>
        <span>{t("rmc.total")}</span>
        <span /><span /><span /><span />
        <span style={{ textAlign: "right", color: diffColor(totalDiff) }}>{rupee(totalDiff)}</span>
        <span />
      </Row>
    </Scroll>
  );
}

// ── Nayi ginti ───────────────────────────────────────────────────
export function NewCountModal({ open, meta, onClose, onCreated }) {
  const toast = useToast();
  const [plantId, setPlantId] = useState("");
  const [countedAt, setCountedAt] = useState(nowLocal());
  const [note, setNote] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlantId(""); setCountedAt(nowLocal()); setNote(""); setItems([]); setErr("");
  }, [open]);

  useEffect(() => {
    let dead = false;
    if (!plantId) { setItems([]); return undefined; }
    setLoading(true); setErr("");
    rget("/stock-checks/new", { plant_id: plantId }).then((r) => {
      if (dead) return;
      setLoading(false);
      if (!r || !r.success) { setItems([]); setErr((r && r.message) || t("rmc.save_failed")); return; }
      setItems(((dataOf(r, {}) || {}).items || []).map((x) => ({ ...x, counted_qty: "", reason: "" })));
    });
    return () => { dead = true; };
  }, [plantId]);

  const upd = (i, patch) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const filled = items.filter((x) => String(x.counted_qty || "") !== "");

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/stock-checks", {
      plant_id: Number(plantId), counted_at: countedAt || null, note: note || null,
      items: filled.map((x) => ({ material_id: x.material_id, counted_qty: x.counted_qty, reason: x.reason || null })),
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onCreated((dataOf(r, {}) || {}).id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={1000} title={t("rmc.new_count")} sub={t("rmc.new_count_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !plantId || filled.length === 0}>
          {busy ? t("rmc.saving") : t("common.save")}
        </Btn>
      </>}>
      <Notice>{t("rmc.count_stock_note")}</Notice>
      <Grid cols={3} style={{ marginBottom: 14 }}>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            <option value="">{t("rmc.select_plant")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.counted_at")}>
          <input style={inp} type="datetime-local" value={countedAt} onChange={(e) => setCountedAt(e.target.value)} />
        </Field>
        <Field label={t("rmc.note")}>
          <input style={inp} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Grid>

      {!plantId ? <Empty>{t("rmc.pick_plant_first")}</Empty>
        : loading ? <Spinner label={t("common.loading")} />
          : items.length === 0 ? <Empty>{t("rmc.store_no_material")}</Empty> : (<>
            <Notice tone="warn">{t("rmc.count_blank_hint")}</Notice>
            <Panel title={t("rmc.count_rows", { n: filled.length, total: items.length })}>
              <CountRows items={items} editable onChange={upd} />
            </Panel>
          </>)}
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

// ── Ek ginti ka detail ───────────────────────────────────────────
export function CountDrawer({ id, canCreate, canApprove, onClose, onChanged }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [items, setItems] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("");        // "" | reject
  const [rejectReason, setRejectReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget(`/stock-checks/${id}`);
    const data = dataOf(r, null);
    setD(data);
    setItems(((data && data.items) || []).map((x) => ({ ...x, counted_qty: x.counted_qty == null ? "" : x.counted_qty })));
    setNote((data && data.note) || "");
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const editable = !!d && d.status === "draft" && canCreate;
  const upd = (i, patch) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const payload = () => ({
    note, items: items.map((x) => ({ id: x.id, counted_qty: x.counted_qty === "" ? null : x.counted_qty, reason: x.reason || null })),
  });

  const saveDraft = async (silent) => {
    const r = await rpatch(`/stock-checks/${id}`, payload());
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return false; }
    if (!silent) toast.success(r.message || t("rmc.done"));
    return true;
  };

  const act = async (fn) => { setErr(""); setBusy(true); await fn(); setBusy(false); };

  const onSave = () => act(async () => { if (await saveDraft()) { await load(); onChanged(); } });

  // Bhejne se pehle jo screen par bhara hai wahi save hota hai — warna user
  // ko "wajah to likhi thi" wala error milta hai.
  const onSubmit = () => act(async () => {
    if (!(await saveDraft(true))) return;
    const r = await rpost(`/stock-checks/${id}/submit`, {});
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); await load(); return; }
    toast.success(r.message || t("rmc.done"));
    await load(); onChanged();
  });

  const onApprove = () => act(async () => {
    const r = await rpost(`/stock-checks/${id}/approve`, {});
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    await load(); onChanged();
  });

  const onReject = () => act(async () => {
    if (!rejectReason.trim()) { setErr(t("rmc.reason_needed")); return; }
    const r = await rpost(`/stock-checks/${id}/reject`, { reason: rejectReason.trim() });
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    setMode(""); setRejectReason("");
    await load(); onChanged();
  });

  const logLabel = (a) => ({ submit: t("rmc.log_submit"), approve: t("rmc.log_approve"), reject: t("rmc.log_reject") }[a] || a);
  const totalDiff = items.reduce((s, it) => s + rowDiff(it).amount, 0);

  return (
    <Drawer open onClose={onClose} width={1040}
      title={(d && d.check_no) || t("rmc.count")}
      head={d ? <CountPill s={d.status} /> : null}
      sub={d ? [d.plant_name, d.counted_at ? fmtDT(d.counted_at) : ""].filter(Boolean).join(" · ") : ""}
      footer={!d ? null : (
        mode === "reject" ? (<>
          <Btn ghost onClick={() => { setMode(""); setErr(""); }}>{t("common.back")}</Btn>
          <Btn c={T.red} onClick={onReject} disabled={busy}>{busy ? t("rmc.saving") : t("rmc.send_back")}</Btn>
        </>) : (<>
          {editable && <Btn ghost onClick={onSave} disabled={busy}>{busy ? t("rmc.saving") : t("common.save")}</Btn>}
          {editable && <Btn onClick={onSubmit} disabled={busy}>{t("rmc.send_for_approve")}</Btn>}
          {d.status === "pending" && canApprove && <Btn ghost c={T.red} onClick={() => setMode("reject")}>{t("rmc.send_back")}</Btn>}
          {d.status === "pending" && canApprove && <Btn c={T.grn} onClick={onApprove} disabled={busy}>{t("common.approve")}</Btn>}
        </>)
      )}>
      {loading ? <Spinner label={t("common.loading")} />
        : !d ? <Empty>{t("rmc.count_not_found")}</Empty> : (<>
          <Grid cols={4} style={{ marginBottom: 14 }}>
            <KV k={t("rmc.plant")} v={d.plant_name} />
            <KV k={t("rmc.counted_at")} v={d.counted_at ? fmtDT(d.counted_at) : "—"} />
            <KV k={t("common.status")} v={countStatusLabel(d.status)} />
            <KV k={t("rmc.total_diff")} v={<span style={{ color: diffColor(totalDiff) }}>{rupee(totalDiff)}</span>} />
          </Grid>

          {d.status === "draft" && <Notice>{t("rmc.count_stock_note")}</Notice>}
          {d.status === "pending" && <Notice tone="warn">{t("rmc.count_pending_note")}</Notice>}
          {d.status === "approved" && <Notice>{t("rmc.count_approved_note")}</Notice>}
          {d.reject_reason && d.status === "draft" && <Notice tone="warn">{t("rmc.count_sent_back", { reason: d.reject_reason })}</Notice>}
          {!editable && d.status === "draft" && <Notice tone="warn">{t("rmc.count_read_only")}</Notice>}

          {editable && (
            <Field label={t("rmc.note")} span={2}>
              <input style={inp} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
          {!editable && d.note && <div style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{d.note}</div>}

          <Panel title={t("rmc.count_rows_title")} style={{ marginTop: 12 }}>
            <CountRows items={items} editable={editable} onChange={upd} />
          </Panel>
          <div style={{ fontSize: 11, color: T.t4, margin: "8px 2px 14px", lineHeight: 1.55 }}>{t("rmc.count_diff_note")}</div>

          <Panel title={t("rmc.count_log")}>
            {(d.log || []).length === 0 ? <Empty>{t("rmc.count_no_log")}</Empty> : (
              <Scroll minWidth={520}>
                <Row cols="140px 160px 1fr" head>
                  <span>{t("common.status")}</span>
                  <span>{t("rmc.by_whom")}</span>
                  <span>{t("rmc.note")}</span>
                </Row>
                {(d.log || []).map((l, i) => (
                  <Row key={i} cols="140px 160px 1fr">
                    <span style={{ color: T.t1, fontWeight: 600 }}>{logLabel(l.action)}</span>
                    <span style={{ color: T.t3 }}>{(l.by_name || "—") + " · " + fmtDT(l.at_time)}</span>
                    <span style={{ color: T.t3 }}>{l.note || "—"}</span>
                  </Row>
                ))}
              </Scroll>
            )}
          </Panel>

          {mode === "reject" && (
            <Panel title={t("rmc.send_back")} style={{ marginTop: 14 }}>
              <div style={{ padding: 14 }}>
                <Notice tone="warn">{t("rmc.send_back_note")}</Notice>
                <Field label={t("rmc.reason")}>
                  <input style={inp} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t("rmc.reason_ph")} />
                </Field>
              </div>
            </Panel>
          )}
          <ErrBox>{err}</ErrBox>
        </>)}
    </Drawer>
  );
}
