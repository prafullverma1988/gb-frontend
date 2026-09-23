// RMC › Ginti — plant ka asli stock kitna hai, aur uska approve ka rasta.
//
// Stock sirf approve par sudhrta hai (API contract Phase 2, section 1) —
// isliye list me bhi "bheja hua" aur "approve hua" alag dikhte hain.
// GET /rmc/stock-checks
import { useState, useEffect, useCallback } from "react";
import { t } from "../../i18n";
import {
  T, fmtDT, rupee, rget, dataOf, inpSm, Field, Btn, Panel, Row, Scroll, Empty, Spinner,
  CountPill, diffColor, countStatusLabel, IcAdd, Notice,
} from "./rmcShared";
import { NewCountModal, CountDrawer } from "./RmcCountDetail";

const STATUSES = ["draft", "pending", "approved"];
const COLS = "120px 1fr 150px 130px 130px 120px";

function RmcCounts({ meta, canCreate, canApprove, refreshKey, onRefresh }) {
  const [fl, setFl] = useState({ plant_id: "", status: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/stock-checks", fl);
    setRows(dataOf(r, []) || []);
    setLoading(false);
  }, [fl]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const changed = () => { load(); if (onRefresh) onRefresh(); };

  return (
    <div>
      <Notice>{t("rmc.count_intro")}</Notice>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("rmc.plant")}>
          <select style={{ ...inpSm, width: 180 }} value={fl.plant_id} onChange={(e) => setFl({ ...fl, plant_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select style={{ ...inpSm, width: 180 }} value={fl.status} onChange={(e) => setFl({ ...fl, status: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{countStatusLabel(s)}</option>)}
          </select>
        </Field>
        <span style={{ flex: 1 }} />
        {canCreate && <Btn icon={IcAdd} onClick={() => setFormOpen(true)}>{t("rmc.new_count")}</Btn>}
      </div>

      <Panel title={t("rmc.count_list", { n: rows.length })}>
        {loading ? <Spinner label={t("common.loading")} />
          : rows.length === 0 ? <Empty>{t("rmc.no_counts")}</Empty> : (
            <Scroll minWidth={800}>
              <Row cols={COLS} head>
                <span>{t("rmc.count_no")}</span>
                <span>{t("rmc.plant")}</span>
                <span>{t("rmc.counted_at")}</span>
                <span style={{ textAlign: "right" }}>{t("rmc.total_diff")}</span>
                <span>{t("rmc.made_by")}</span>
                <span>{t("common.status")}</span>
              </Row>
              {rows.map((x) => (
                <Row key={x.id} cols={COLS} onClick={() => setDetailId(x.id)}>
                  <span style={{ fontWeight: 700, color: T.ind }}>{x.check_no}</span>
                  <span style={{ color: T.t1 }}>{x.plant_name || "—"}</span>
                  <span style={{ color: T.t3 }}>{x.counted_at ? fmtDT(x.counted_at) : "—"}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: diffColor(x.diff_value) }}>{rupee(x.diff_value)}</span>
                  <span style={{ color: T.t3 }}>{x.created_by_name || "—"}</span>
                  <span><CountPill s={x.status} /></span>
                </Row>
              ))}
            </Scroll>
          )}
      </Panel>

      <NewCountModal open={formOpen} meta={meta} onClose={() => setFormOpen(false)}
        onCreated={(id) => { if (id) setDetailId(id); changed(); }} />
      {detailId && (
        <CountDrawer id={detailId} canCreate={canCreate} canApprove={canApprove}
          onClose={() => setDetailId(null)} onChanged={changed} />
      )}
    </div>
  );
}

export default RmcCounts;
