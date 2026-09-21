// RMC › Dashboard — GET /rmc/dashboard ka seedha chehra.
// Aaj ka cum + trips, is mahine ka cum, grade-wise, raste me TM, pending orders.
import { t } from "../../i18n";
import {
  T, N, cum, fmtDT, fmtD, StatCard, Panel, Row, Scroll, Empty, Notice, GradePill, Btn,
  IcBox, IcTruck, IcChart, IcClock, IcChk, unitOf,
} from "./rmcShared";

// cum aur MT ko jodna bematlab — har unit ka apna jod. Purana server
// (bina *_by_unit) ho to sirf cum.
const unitText = (list, cumOnly) => {
  const xs = (list || []).filter((x) => N(x.qty) > 0);
  if (!xs.length) return { value: cum(cumOnly), sub: t("rmc.cum_unit") };
  if (xs.length === 1) return { value: cum(xs[0].qty), sub: xs[0].unit };
  return { value: xs.map((x) => cum(x.qty) + " " + x.unit).join(" · "), sub: "" };
};

function RmcDashboard({ dash, onGo, onOpenChallan, onOpenOrder }) {
  const d = dash || {};
  const inTransit = d.in_transit || [];
  const byGrade = d.by_grade || [];
  const pending = d.pending_orders || [];
  // Hissa (%) apni unit ke andar hi.
  const unitTotal = byGrade.reduce((m, g) => { const u = unitOf(g); m[u] = (m[u] || 0) + N(g.cum); return m; }, {});
  const today = unitText(d.today_by_unit, d.today_cum);
  const month = unitText(d.month_by_unit, d.month_cum);
  const rv = d.review_pending || {};
  const rvTotal = N(rv.marshall) + N(rv.temp);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label={t("rmc.today_cum")} value={today.value} sub={today.sub} color={T.ind} icon={IcBox} />
        <StatCard label={t("rmc.today_trips")} value={N(d.today_trips)} sub={t("rmc.trips_sub")} color={T.blu} icon={IcTruck} />
        <StatCard label={t("rmc.month_cum")} value={month.value} sub={month.sub} color={T.grn} icon={IcChart} />
        <StatCard label={t("rmc.on_road")} value={inTransit.length} sub={t("rmc.on_road_sub")} color={T.amb} icon={IcClock}
          onClick={inTransit.length ? () => onGo("challans") : undefined} />
        {rvTotal > 0 && (
          <StatCard label={t("rmc.review_pending")} value={rvTotal}
            sub={t("rmc.review_split", { m: N(rv.marshall), t: N(rv.temp) })} color={T.red} icon={IcChk}
            onClick={() => onGo(N(rv.marshall) > 0 ? "cube" : "challans")} />
        )}
      </div>

      {/* Phase 1 me sirf jama hota hai — screen par kahin bill ka waada nahi. */}
      <Notice>{t("rmc.bill_note")}</Notice>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        <Panel title={t("rmc.by_grade")}>
          {byGrade.length === 0 ? <Empty>{t("rmc.no_grade_data")}</Empty> : (
            <>
              <Row cols="1fr 110px 90px" head>
                <span>{t("rmc.grade")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty_short")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.share")}</span>
              </Row>
              {byGrade.map((g) => (
                <Row key={g.grade + "|" + unitOf(g)} cols="1fr 110px 90px">
                  <span><GradePill g={g.grade} /></span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: T.t1 }}>{cum(g.cum)} <span style={{ fontSize: 10, color: T.t4 }}>{unitOf(g)}</span></span>
                  <span style={{ textAlign: "right", color: T.t3 }}>
                    {unitTotal[unitOf(g)] > 0 ? Math.round((N(g.cum) / unitTotal[unitOf(g)]) * 100) + "%" : "—"}
                  </span>
                </Row>
              ))}
            </>
          )}
        </Panel>

        <Panel title={t("rmc.pending_orders")}
          action={<Btn size="sm" ghost onClick={() => onGo("orders")}>{t("rmc.see_orders")}</Btn>}>
          {pending.length === 0 ? <Empty>{t("rmc.no_pending_orders")}</Empty> : (
            <Scroll minWidth={380}>
              <Row cols="90px 1fr 70px 80px 110px" head>
                <span>{t("rmc.order_no")}</span>
                <span>{t("common.project")}</span>
                <span>{t("rmc.grade")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.qty_short")}</span>
                <span>{t("rmc.pour_at")}</span>
              </Row>
              {pending.slice(0, 12).map((o) => (
                <Row key={o.id} cols="90px 1fr 70px 80px 110px" onClick={() => onOpenOrder(o.id)}>
                  <span style={{ fontWeight: 700, color: T.ind }}>{o.order_no}</span>
                  <span style={{ color: T.t1 }}>{o.project_name || "—"}</span>
                  <span>{o.grade}</span>
                  <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(o.qty_cum)} <span style={{ fontSize: 10, color: T.t4 }}>{unitOf(o)}</span></span>
                  <span style={{ color: T.t3 }}>{o.pour_at ? fmtD(o.pour_at) : "—"}</span>
                </Row>
              ))}
            </Scroll>
          )}
        </Panel>
      </div>

      <Panel title={t("rmc.on_road_list")} style={{ marginTop: 14 }}
        action={<Btn size="sm" ghost onClick={() => onGo("challans")}>{t("rmc.see_challans")}</Btn>}>
        {inTransit.length === 0 ? <Empty>{t("rmc.no_in_transit")}</Empty> : (
          <Scroll minWidth={620}>
            <Row cols="110px 1fr 70px 80px 120px 150px" head>
              <span>{t("rmc.challan_no")}</span>
              <span>{t("common.project")}</span>
              <span>{t("rmc.grade")}</span>
              <span style={{ textAlign: "right" }}>{t("rmc.qty_short")}</span>
              <span>{t("rmc.vehicle")}</span>
              <span>{t("rmc.dispatched_at")}</span>
            </Row>
            {inTransit.map((x) => (
              <Row key={x.id} cols="110px 1fr 70px 80px 120px 150px" onClick={() => onOpenChallan(x.id)}>
                <span style={{ fontWeight: 700, color: T.ind }}>{x.challan_no}</span>
                <span style={{ color: T.t1 }}>{x.project_name || "—"}</span>
                <span>{x.grade}</span>
                <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(x.qty_cum)} <span style={{ fontSize: 10, color: T.t4 }}>{unitOf(x)}</span></span>
                <span style={{ color: T.t2 }}>{x.vehicle_no || "—"}</span>
                <span style={{ color: T.t3 }}>{fmtDT(x.dispatch_at)}</span>
              </Row>
            ))}
          </Scroll>
        )}
      </Panel>
    </div>
  );
}

export default RmcDashboard;
