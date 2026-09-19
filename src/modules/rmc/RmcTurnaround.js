// RMC › Reports › TM ka chakkar — ek gaadi ka poora round: batch se nikalna,
// site pahunchna, khadi rehna, utarna.
//
// Samay ke sab tukde server se aaye hue minute hain (TIMESTAMPDIFF), screen
// dobara nahi ginti — warna timezone ke chakkar me site aur plant ke ankde
// alag dikhne lagte hain. Jo challan limit se zyada leta hai use server hi
// stale mark karta hai; limit bhi wahi wapas bhejta hai.
//
// GET /rmc/reports/turnaround?from&to&stale_min
import { useState, useEffect, useCallback } from "react";
import { t } from "../../i18n";
import {
  T, N, cum, fmtN, fmtDT, rget, dataOf, inpSm, Field, Panel, Row, Scroll, Empty, Spinner,
  Notice, Pill, StatCard, GradePill, RangeBar, IcClock, IcRoad, IcTruck, todayStr,
} from "./rmcShared";

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA");
// Minute ka cell — na aaya (challan par wo waqt bhara hi nahi) to dash.
const Mins = ({ v, warn }) => (
  <span style={{ textAlign: "right", display: "block", fontWeight: warn ? 700 : 400, color: warn ? T.red : T.t2 }}>
    {v == null || N(v) <= 0 ? "—" : fmtN(v)}
  </span>
);

const TC = "110px 1fr 120px 80px 80px 90px 90px 90px 95px";

function RmcTurnaround() {
  const [range, setRange] = useState({ from: daysAgo(30), to: todayStr() });
  const [limit, setLimit] = useState("90");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setData(dataOf(await rget("/reports/turnaround", { ...range, stale_min: limit }), null));
    setLoading(false);
  }, [range, limit]);
  useEffect(() => { load(); }, [load]);

  const rows = (data && data.rows) || [];
  const s = (data && data.summary) || null;

  return (
    <div>
      <Notice>{t("rmc.turnaround_intro")}</Notice>

      <RangeBar value={range} onChange={setRange} right={
        <Field label={t("rmc.stale_limit")} hint={t("rmc.stale_limit_hint")}>
          <input type="number" min="10" step="5" style={{ ...inpSm, width: 110 }} value={limit}
            onChange={(e) => setLimit(e.target.value)} />
        </Field>
      } />

      {s && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 12, marginBottom: 14 }}>
          <StatCard label={t("rmc.trips")} value={N(s.trips)} color={T.ind} icon={IcTruck} />
          <StatCard label={t("rmc.avg_road")} value={fmtN(s.avg_road_min)} sub={t("rmc.minutes")} color={T.blu} icon={IcRoad} />
          <StatCard label={t("rmc.avg_wait")} value={fmtN(s.avg_wait_min)} sub={t("rmc.minutes")} color={T.amb} icon={IcClock} />
          <StatCard label={t("rmc.avg_unload")} value={fmtN(s.avg_unload_min)} sub={t("rmc.minutes")} color={T.slt} icon={IcClock} />
          <StatCard label={t("rmc.avg_total")} value={fmtN(s.avg_total_min)} sub={t("rmc.minutes")} color={T.grn} icon={IcClock} />
          <StatCard label={t("rmc.stale_trips")} value={N(s.stale_trips)}
            sub={t("rmc.over_limit", { n: N(s.stale_limit_min) })} color={T.red} icon={IcClock} />
        </div>
      )}

      <Panel title={t("rmc.rep_turnaround")}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_trips")}</Empty> : (
            <Scroll minWidth={1000}>
              <Row cols={TC} head>
                <span>{t("rmc.challan")}</span>
                <span>{t("common.project")}</span>
                <span>{t("rmc.vehicle")}</span>
                <span>{t("rmc.grade")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.cum")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.road_min")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.wait_min")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.unload_min")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.total_min")}</span>
              </Row>
              {rows.map((r) => (
                <Row key={r.id} cols={TC} style={r.stale ? { background: T.redL } : undefined}>
                  <span style={{ fontWeight: 700, color: T.ind }}>
                    {r.challan_no}
                    {r.stale ? <div><Pill label={t("rmc.stale")} c={T.red} bg={T.redL} /></div> : null}
                  </span>
                  <span style={{ color: T.t1 }}>
                    {r.project_name || "—"}
                    <div style={{ fontSize: 10, color: T.t4 }}>{r.dispatch_at ? fmtDT(r.dispatch_at) : "—"}</div>
                  </span>
                  <span style={{ color: T.t2 }}>{r.vehicle || r.vehicle_no || "—"}</span>
                  <span><GradePill g={r.grade} /></span>
                  <span style={{ textAlign: "right" }}>{cum(r.qty_cum)}</span>
                  <Mins v={r.road_min} />
                  <Mins v={r.wait_min} warn={N(r.wait_min) > 30} />
                  <Mins v={r.unload_min} />
                  <Mins v={r.total_min} warn={!!r.stale} />
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>
    </div>
  );
}

export default RmcTurnaround;
