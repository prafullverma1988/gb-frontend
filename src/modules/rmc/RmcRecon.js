// RMC › Reports — Phase 2 ke teen view:
//   • Material ka match   GET /rmc/reports/reconciliation
//   • Vendor ke paas hamara stock  GET /rmc/reports/vendor-stock
//   • Ek cum ka cost      GET /rmc/reports/cost-per-cum
//
// Sabse zaroori baat jo screen par saaf honi chahiye: jis material ki ginti
// nahi hui uska antar 0 hi rahega — isse "sab theek hai" nahi samajhna.
import { useState, useEffect, useCallback } from "react";
import { t } from "../../i18n";
import {
  T, N, cum, fmtN, fmtD, rupee, rget, dataOf, inpSm, Field, Panel, Row, Scroll, Empty,
  Spinner, KV, Notice, Pill, diffColor, todayStr, monthStartStr,
  plantUnit,
} from "./rmcShared";

// Teeno report ek hi tarah se chuni jaati hain: plant + daur.
function PlantRange({ meta, plantId, onPlant, range, onRange }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
      <Field label={t("rmc.plant")}>
        <select style={{ ...inpSm, width: 200 }} value={plantId} onChange={(e) => onPlant(e.target.value)}>
          <option value="">{t("rmc.select_plant")}</option>
          {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label={t("common.from")}>
        <input type="date" style={{ ...inpSm, width: 150 }} value={range.from} onChange={(e) => onRange({ ...range, from: e.target.value })} />
      </Field>
      <Field label={t("common.to")}>
        <input type="date" style={{ ...inpSm, width: 150 }} value={range.to} onChange={(e) => onRange({ ...range, to: e.target.value })} />
      </Field>
    </div>
  );
}

// Plant chuno → report load karo. Teeno report ka ek hi dhaancha.
function usePlantReport(path, plantId, range) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    if (!plantId) { setData(null); setMsg(""); return; }
    setLoading(true);
    const r = await rget(path, { plant_id: plantId, ...range });
    setLoading(false);
    setMsg(r && r.success ? "" : (r && r.message) || "");
    setData(dataOf(r, null));
  }, [path, plantId, range]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, msg };
}

// ── Material ka match ────────────────────────────────────────────
const RC = "1.2fr 60px 100px 110px 110px 120px 110px 80px";

export function ReconReport({ meta }) {
  const plants = meta.plants || [];
  const [plantId, setPlantId] = useState(plants.length ? String(plants[0].id) : "");
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  const { data, loading, msg } = usePlantReport("/reports/reconciliation", plantId, range);

  const items = (data && data.items) || [];
  const anyMissing = items.some((i) => !i.counted_done);

  return (
    <div>
      <PlantRange meta={meta} plantId={plantId} onPlant={setPlantId} range={range} onRange={setRange} />
      {!plantId ? <Panel><Empty>{t("rmc.pick_plant_first")}</Empty></Panel>
        : loading ? <Spinner label={t("common.loading")} />
          : !data ? <Panel><Empty>{msg || t("rmc.no_rows")}</Empty></Panel> : (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14, padding: 14, background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12 }}>
              <KV k={t("rmc.plant")} v={data.plant && data.plant.name} />
              <KV k={t("rmc.produced_in", { unit: plantUnit(meta, data.plant) })} v={cum(data.produced_cum)} />
              <KV k={t("rmc.last_count")} v={data.last_check ? fmtD(data.last_check.counted_at) : t("rmc.not_counted")} />
              <KV k={t("rmc.total_diff")} v={<span style={{ color: diffColor(data.total_diff_amount) }}>{rupee(data.total_diff_amount)}</span>} />
            </div>

            {!data.last_check && <Notice tone="warn">{t("rmc.no_count_in_period")}</Notice>}
            {data.last_check && anyMissing && <Notice tone="warn">{t("rmc.some_not_counted")}</Notice>}

            <Panel title={t("rmc.rep_recon")}>
              {items.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty> : (
                <Scroll minWidth={940}>
                  <Row cols={RC} head>
                    <span>{t("rmc.material")}</span>
                    <span>{t("rmc.unit")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.received_qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.should_use")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.in_stock_now")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.counted_qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.diff_qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.diff_pct")}</span>
                  </Row>
                  {items.map((it, i) => (
                    <Row key={i} cols={RC}>
                      <span style={{ color: T.t1, fontWeight: 600 }}>
                        {it.material_name}
                        <div style={{ fontSize: 10.5, color: diffColor(it.diff_amount) }}>{rupee(it.diff_amount)}</div>
                      </span>
                      <span style={{ color: T.t3 }}>{it.unit || "—"}</span>
                      <span style={{ textAlign: "right" }}>{fmtN(it.received)}</span>
                      <span style={{ textAlign: "right" }}>{fmtN(it.should_use)}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(it.in_stock)}</span>
                      <span style={{ textAlign: "right" }}>
                        {it.counted_done ? fmtN(it.counted)
                          : <Pill label={t("rmc.not_counted")} c={T.amb} bg={T.ambL} />}
                      </span>
                      <span style={{ textAlign: "right", fontWeight: 700, color: diffColor(it.diff_qty) }}>
                        {it.counted_done ? fmtN(it.diff_qty) : "—"}
                      </span>
                      <span style={{ textAlign: "right", color: T.t3 }}>
                        {it.counted_done && it.diff_pct != null ? fmtN(it.diff_pct) + "%" : "—"}
                      </span>
                    </Row>
                  ))}
                </Scroll>
              )}
            </Panel>
            <div style={{ fontSize: 11, color: T.t4, margin: "8px 2px 0", lineHeight: 1.55 }}>{t("rmc.recon_note")}</div>
          </>)}
    </div>
  );
}

// ── Vendor ke paas hamara stock ──────────────────────────────────
const VC = "1.2fr 70px 110px 120px 110px 110px 110px";

export function VendorStockReport({ meta }) {
  const plants = meta.plants || [];
  const [plantId, setPlantId] = useState(plants.length ? String(plants[0].id) : "");
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  const { data, loading, msg } = usePlantReport("/reports/vendor-stock", plantId, range);
  const items = (data && data.items) || [];

  return (
    <div>
      <PlantRange meta={meta} plantId={plantId} onPlant={setPlantId} range={range} onRange={setRange} />
      {!plantId ? <Panel><Empty>{t("rmc.pick_plant_first")}</Empty></Panel>
        : loading ? <Spinner label={t("common.loading")} />
          : !data ? <Panel><Empty>{msg || t("rmc.no_rows")}</Empty></Panel> : (<>
            <Notice>{t("rmc.vendor_stock_note")}</Notice>
            {data.no_store && <Notice tone="warn">{t("rmc.no_store_note")}</Notice>}
            <Panel title={t("rmc.rep_vendor_stock")}>
              {items.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty> : (
                <Scroll minWidth={820}>
                  <Row cols={VC} head>
                    <span>{t("rmc.material")}</span>
                    <span>{t("rmc.unit")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.sent_qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.sent_value")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.used_qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.balance_qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
                  </Row>
                  {items.map((it, i) => (
                    <Row key={i} cols={VC}>
                      <span style={{ color: T.t1, fontWeight: 600 }}>{it.material_name}</span>
                      <span style={{ color: T.t3 }}>{it.unit || "—"}</span>
                      <span style={{ textAlign: "right" }}>{fmtN(it.sent)}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{rupee(it.sent_amount)}</span>
                      <span style={{ textAlign: "right" }}>{fmtN(it.used)}</span>
                      <span style={{ textAlign: "right", fontWeight: 700 }}>{fmtN(it.balance)}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{rupee(it.rate)}</span>
                    </Row>
                  ))}
                </Scroll>
              )}
            </Panel>
          </>)}
    </div>
  );
}

// ── Ek cum ka cost ───────────────────────────────────────────────
const CostCard = ({ label, per, sub }) => (
  <div style={{ padding: "13px 15px", background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12 }}>
    <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, marginTop: 4, lineHeight: 1 }}>{rupee(per)}</div>
    <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{sub}</div>
  </div>
);

export function CostPerCumReport({ meta }) {
  const plants = meta.plants || [];
  const [plantId, setPlantId] = useState(plants.length ? String(plants[0].id) : "");
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  const { data, loading, msg } = usePlantReport("/reports/cost-per-cum", plantId, range);
  const amt = (x) => t("rmc.of_total", { amount: rupee(x) });
  const unit = (data && data.unit) || plantUnit(meta, (meta.plants || []).find((p) => String(p.id) === String(plantId)));

  return (
    <div>
      <PlantRange meta={meta} plantId={plantId} onPlant={setPlantId} range={range} onRange={setRange} />
      {!plantId ? <Panel><Empty>{t("rmc.pick_plant_first")}</Empty></Panel>
        : loading ? <Spinner label={t("common.loading")} />
          : !data ? <Panel><Empty>{msg || t("rmc.no_rows")}</Empty></Panel>
            : N(data.cum) === 0 ? <Panel><Empty>{t("rmc.no_cum_in_period")}</Empty></Panel> : (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14 }}>
                <CostCard label={t("rmc.material")} per={data.material.per_cum} sub={amt(data.material.amount)} />
                <CostCard label={t("rmc.diesel")} per={data.diesel.per_cum}
                  sub={t("rmc.litre_per_cum", { n: fmtN(data.diesel.litre_per_cum), unit })} />
                <CostCard label={t("rmc.vendor_concrete")} per={data.vendor_concrete.per_cum} sub={amt(data.vendor_concrete.amount)} />
                <CostCard label={t("rmc.transport")} per={data.transport.per_cum} sub={amt(data.transport.amount)} />
                <CostCard label={t("rmc.plant_rent")} per={data.rent.per_cum} sub={amt(data.rent.amount)} />
              </div>
              <Panel title={t("rmc.cost_per_x", { unit })}>
                <div style={{ padding: 16, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: T.ind }}>{rupee(data.total_per_cum)}</span>
                  <span style={{ fontSize: 12.5, color: T.t3 }}>{t("rmc.per_x", { unit })}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 12.5, color: T.t3 }}>{t("rmc.made_cum", { cum: cum(data.cum), unit })}</span>
                </div>
                <div style={{ padding: "0 16px 14px", fontSize: 11, color: T.t4, lineHeight: 1.55 }}>{t("rmc.cost_note")}</div>
              </Panel>
            </>)}
    </div>
  );
}
