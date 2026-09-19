// RMC › Reports — production register, vehicle-wise summary, plant ka store,
// aur Phase 2 ke teen view (match, vendor ke paas hamara stock, cost per cum).
// GET /rmc/reports/production · /rmc/reports/vehicles · /rmc/plants/:id/stock
import { useState, useEffect, useCallback } from "react";
import { t } from "../../i18n";
import {
  T, N, cum, fmtN, fmtD, rupee, rget, dataOf, inpSm, Field, Panel, Row, Scroll, Empty,
  Spinner, SubTabs, RangeBar, KV, Notice, todayStr, monthStartStr, supplyLabel, ownerLabel,
} from "./rmcShared";
import { ReconReport, VendorStockReport, CostPerCumReport } from "./RmcRecon";
import RmcBatchSheet from "./RmcBatchSheet";
import RmcTurnaround from "./RmcTurnaround";

const GROUPS = ["day", "plant", "project", "grade"];
const groupLabel = (g) => ({ day: t("rmc.g_day"), plant: t("rmc.g_plant"), project: t("rmc.g_project"), grade: t("rmc.g_grade") }[g] || g);

function ProductionReport() {
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  const [group, setGroup] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/reports/production", { ...range, group });
    setRows((dataOf(r, {}) || {}).rows || []);
    setLoading(false);
  }, [range, group]);
  useEffect(() => { load(); }, [load]);

  const tot = rows.reduce((a, r) => ({
    trips: a.trips + N(r.trips), cum: a.cum + N(r.cum), accepted: a.accepted + N(r.accepted_cum),
    rejected: a.rejected + N(r.rejected_cum), mat: a.mat + N(r.material_amount),
    conc: a.conc + N(r.concrete_amount), trans: a.trans + N(r.transport_amount),
  }), { trips: 0, cum: 0, accepted: 0, rejected: 0, mat: 0, conc: 0, trans: 0 });

  const COLS = "1fr 80px 100px 100px 100px 110px 110px 110px";
  return (
    <div>
      <RangeBar value={range} onChange={setRange} right={
        <Field label={t("rmc.group_by")}>
          <select style={{ ...inpSm, width: 150 }} value={group} onChange={(e) => setGroup(e.target.value)}>
            {GROUPS.map((g) => <option key={g} value={g}>{groupLabel(g)}</option>)}
          </select>
        </Field>
      } />
      <Panel title={t("rmc.rep_production")}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty> : (
            <Scroll minWidth={920}>
              <Row cols={COLS} head>
                <span>{groupLabel(group)}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.trips")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.cum")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.taken_short")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.returned_short")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.material_amount")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.concrete_amount")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.transport_amount")}</span>
              </Row>
              {rows.map((r, i) => (
                <Row key={i} cols={COLS}>
                  <span style={{ color: T.t1, fontWeight: 600 }}>{group === "day" ? fmtD(r.label) : (r.label || "—")}</span>
                  <span style={{ textAlign: "right" }}>{N(r.trips)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(r.cum)}</span>
                  <span style={{ textAlign: "right" }}>{cum(r.accepted_cum)}</span>
                  <span style={{ textAlign: "right", color: N(r.rejected_cum) > 0 ? T.red : T.t3 }}>{cum(r.rejected_cum)}</span>
                  <span style={{ textAlign: "right" }}>{rupee(r.material_amount)}</span>
                  <span style={{ textAlign: "right" }}>{rupee(r.concrete_amount)}</span>
                  <span style={{ textAlign: "right" }}>{rupee(r.transport_amount)}</span>
                </Row>
              ))}
              <Row cols={COLS} style={{ background: T.surfaceB, fontWeight: 700, color: T.t1 }}>
                <span>{t("rmc.total")}</span>
                <span style={{ textAlign: "right" }}>{tot.trips}</span>
                <span style={{ textAlign: "right" }}>{cum(tot.cum)}</span>
                <span style={{ textAlign: "right" }}>{cum(tot.accepted)}</span>
                <span style={{ textAlign: "right" }}>{cum(tot.rejected)}</span>
                <span style={{ textAlign: "right" }}>{rupee(tot.mat)}</span>
                <span style={{ textAlign: "right" }}>{rupee(tot.conc)}</span>
                <span style={{ textAlign: "right" }}>{rupee(tot.trans)}</span>
              </Row>
            </Scroll>
          )}
      </Panel>
    </div>
  );
}

function VehicleReport() {
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/reports/vehicles", range);
    setRows((dataOf(r, {}) || {}).rows || []);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const COLS = "1fr 110px 150px 80px 100px 110px 120px";
  return (
    <div>
      <RangeBar value={range} onChange={setRange} />
      <Panel title={t("rmc.rep_vehicles")}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty> : (
            <Scroll minWidth={840}>
              <Row cols={COLS} head>
                <span>{t("rmc.vehicle")}</span>
                <span>{t("rmc.owner")}</span>
                <span>{t("rmc.transporter")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.trips")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.cum")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.avg_lead")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.transport_amount")}</span>
              </Row>
              {rows.map((r, i) => (
                <Row key={i} cols={COLS}>
                  <span style={{ color: T.t1, fontWeight: 600 }}>{r.vehicle || "—"}</span>
                  <span style={{ color: T.t3 }}>{r.vehicle_owner ? supplyLabel(r.vehicle_owner) : "—"}</span>
                  <span style={{ color: T.t3 }}>{r.transporter_name || "—"}</span>
                  <span style={{ textAlign: "right" }}>{N(r.trips)}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(r.cum)}</span>
                  <span style={{ textAlign: "right" }}>{fmtN(r.avg_lead_km)} km</span>
                  <span style={{ textAlign: "right" }}>{rupee(r.transport_amount)}</span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>
    </div>
  );
}

function StockReport({ meta }) {
  const plants = meta.plants || [];
  const [plantId, setPlantId] = useState(plants.length ? String(plants[0].id) : "");
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!plantId) { setData(null); return; }
    setLoading(true);
    setData(dataOf(await rget(`/plants/${plantId}/stock`, range), null));
    setLoading(false);
  }, [plantId, range]);
  useEffect(() => { load(); }, [load]);

  const plant = (data && data.plant) || null;
  const stock = (data && data.stock) || [];
  const used = (data && data.used) || [];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("rmc.plant")}>
          <select style={{ ...inpSm, width: 200 }} value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            <option value="">{t("rmc.select_plant")}</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.from")}>
          <input type="date" style={{ ...inpSm, width: 150 }} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label={t("common.to")}>
          <input type="date" style={{ ...inpSm, width: 150 }} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
      </div>

      {!plantId ? <Panel><Empty>{t("rmc.pick_plant_first")}</Empty></Panel>
        : loading ? <Spinner label={t("common.loading")} />
          : !data ? <Panel><Empty>{t("rmc.no_rows")}</Empty></Panel> : (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 14, padding: 14, background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12 }}>
              <KV k={t("rmc.plant")} v={plant && plant.name} />
              <KV k={t("rmc.owner")} v={plant ? ownerLabel(plant.owner) : "—"} />
              <KV k={t("rmc.produced_cum")} v={cum(data.produced_cum)} />
            </div>
            {plant && !plant.warehouse_id && <Notice tone="warn">{t("rmc.no_store_note")}</Notice>}

            <Panel title={t("rmc.stock_now")} style={{ marginBottom: 14 }}>
              {stock.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty> : (
                <Scroll minWidth={520}>
                  <Row cols="1fr 90px 120px 120px" head>
                    <span>{t("rmc.material")}</span>
                    <span>{t("rmc.unit")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.rate")}</span>
                  </Row>
                  {stock.map((s) => (
                    <Row key={s.id} cols="1fr 90px 120px 120px">
                      <span style={{ color: T.t1, fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: T.t3 }}>{s.unit || "—"}</span>
                      <span style={{ textAlign: "right", fontWeight: 700 }}>{fmtN(s.qty)}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{rupee(s.rate)}</span>
                    </Row>
                  ))}
                </Scroll>
              )}
            </Panel>

            <Panel title={t("rmc.used_in_period")}>
              {used.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty> : (
                <Scroll minWidth={620}>
                  <Row cols="1fr 110px 110px 110px 120px" head>
                    <span>{t("rmc.material")}</span>
                    <span>{t("rmc.whose")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.qty")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.kg")}</span>
                    <span style={{ textAlign: "right" }}>{t("rmc.amount")}</span>
                  </Row>
                  {used.map((u, i) => (
                    <Row key={i} cols="1fr 110px 110px 110px 120px">
                      <span style={{ color: T.t1, fontWeight: 600 }}>{u.material_name}</span>
                      <span style={{ color: T.t3 }}>{supplyLabel(u.supplied_by)}</span>
                      <span style={{ textAlign: "right" }}>{fmtN(u.qty)} {u.unit || ""}</span>
                      <span style={{ textAlign: "right", color: T.t3 }}>{fmtN(u.qty_kg)}</span>
                      <span style={{ textAlign: "right", fontWeight: 700 }}>{u.supplied_by === "own" ? rupee(u.amount) : "—"}</span>
                    </Row>
                  ))}
                </Scroll>
              )}
            </Panel>
          </>)}
    </div>
  );
}

function RmcReports({ meta, sub, onSub, canCreate }) {
  const tabs = [
    { id: "production", l: t("rmc.rep_production") },
    { id: "vehicles", l: t("rmc.rep_vehicles") },
    { id: "stock", l: t("rmc.rep_stock") },
    { id: "recon", l: t("rmc.rep_recon") },
    { id: "vendor_stock", l: t("rmc.rep_vendor_stock") },
    { id: "cost_cum", l: t("rmc.rep_cost_cum") },
    { id: "turnaround", l: t("rmc.rep_turnaround") },
    { id: "batch", l: t("rmc.rep_batch") },
  ];
  return (
    <div>
      <SubTabs tabs={tabs} value={sub} onChange={onSub} />
      {sub === "production" && <ProductionReport />}
      {sub === "vehicles" && <VehicleReport />}
      {sub === "stock" && <StockReport meta={meta} />}
      {sub === "recon" && <ReconReport meta={meta} />}
      {sub === "vendor_stock" && <VendorStockReport meta={meta} />}
      {sub === "cost_cum" && <CostPerCumReport meta={meta} />}
      {sub === "turnaround" && <RmcTurnaround />}
      {sub === "batch" && <RmcBatchSheet meta={meta} canCreate={canCreate} />}
    </div>
  );
}

export default RmcReports;
