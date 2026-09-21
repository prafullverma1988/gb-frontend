// RMC › Cube — cube ka register aur naya sample.
//
// Faisla ek hi jagah se aata hai: 28 din ka result hi asli hai. 7 din par
// fck ka ~65% expected hota hai — kam aaye to chetavni, fail nahi. Isliye
// row par "fail" tabhi laal hota hai jab server ne failed=1 kiya ho.
//
// Due (7 ya 28 din nikal gaye aur result nahi bhara) bhi server hi batata
// hai — /reports/cube-register me due_7 / due_28 aate hain, screen dobara
// nahi ginti. Isi wajah se list register wale route se aati hai, /cube-samples
// se nahi: wahan ye do jhande nahi hote.
//
// Result bharna aur purane result: RmcCubeDetail.js
//
// Bitumen ka sample Marshall hai (7/28 din nahi — usi din/agle din test).
// Char aankde; sab bhare aur seema me ho tabhi apne aap pass. Seema se bahar
// ya bhara hi nahi → "Approval baaki", PM/Admin note ke saath faisla karte hain.
//
// GET /rmc/reports/cube-register · POST /rmc/cube-samples
import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, fmtD, fmtN, rget, rpost, dataOf, inp, inpSm, Field, Grid, Btn, Panel, Row, Scroll,
  Empty, ErrBox, Notice, Modal, Spinner, Pill, GradePill, CubePill, StatCard, cubeStatusLabel,
  IcAdd, IcBox, todayStr, isBitumen, plantById, MARSHALL, parseMsFlags, ReviewPill,
} from "./rmcShared";
import SampleDrawer, { fckOf, mpa } from "./RmcCubeDetail";

const STATUSES = ["open", "partial", "review", "done"];
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA");

// ── Naya sample: challan se, ya bina challan ke ──────────────────
const blankSample = () => ({
  dispatch_id: "", project_id: "", plant_id: "", grade: "", cast_date: todayStr(),
  cubes_count: "3", element: "", slump_mm: "", note: "", test_kind: "",
});

function NewSampleModal({ open, meta, onClose, onCreated }) {
  const toast = useToast();
  const [v, setV] = useState(blankSample);
  const [challans, setChallans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setV(blankSample()); setErr("");
    rget("/dispatches", { from: daysAgo(30), to: todayStr() })
      .then((r) => setChallans(dataOf(r, []) || []));
  }, [open]);

  // Challan chun liya to project/plant/grade wahin se — server bhi wahi karta
  // hai, isliye screen par bhi haath se badalne ka mauka nahi dete.
  const pickChallan = (id) => {
    const d = challans.find((x) => String(x.id) === String(id));
    if (!d) { setV((x) => ({ ...x, dispatch_id: "" })); return; }
    setV((x) => ({ ...x, dispatch_id: id, project_id: String(d.project_id || ""),
      plant_id: String(d.plant_id || ""), grade: d.grade || "" }));
  };
  // Test ka prakaar: challan ya plant bitumen ka ho to Marshall, warna cube.
  // Bina challan/plant ke haath se bhi chuna ja sakta hai.
  const pickedChallan = challans.find((x) => String(x.id) === String(v.dispatch_id)) || null;
  const autoKind = pickedChallan ? (isBitumen(pickedChallan) ? "marshall" : "cube")
    : v.plant_id ? (isBitumen(plantById(meta, v.plant_id)) ? "marshall" : "cube") : null;
  const kind = autoKind || v.test_kind || "cube";
  const ms = kind === "marshall";

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost("/cube-samples", {
      dispatch_id: v.dispatch_id || null, project_id: v.project_id || null,
      plant_id: v.plant_id || null, grade: v.grade || null, cast_date: v.cast_date,
      cubes_count: v.cubes_count, element: v.element || null,
      slump_mm: ms ? null : (v.slump_mm || null), note: v.note || null, test_kind: kind,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    toast.success(r.message || t("rmc.done"));
    onCreated(); onClose();
  };

  const fromChallan = !!v.dispatch_id;
  const ready = !!v.grade && (fromChallan || !!v.project_id);
  return (
    <Modal open={open} onClose={onClose} width={720} title={t("rmc.new_sample")} sub={t("rmc.new_sample_sub")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !ready}>{busy ? t("rmc.saving") : t("rmc.save_sample")}</Btn>
      </>}>
      <Grid cols={3} style={{ marginBottom: 12 }}>
        <Field label={t("rmc.challan")} hint={t("rmc.sample_challan_hint")} span={3}>
          <select style={inp} value={v.dispatch_id} onChange={(e) => pickChallan(e.target.value)}>
            <option value="">{t("rmc.sample_no_challan")}</option>
            {challans.map((d) => (
              <option key={d.id} value={d.id}>
                {d.challan_no} · {d.grade} · {d.project_name || "—"}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("common.project")}>
          <select style={inp} value={v.project_id} disabled={fromChallan}
            onChange={(e) => setV((x) => ({ ...x, project_id: e.target.value }))}>
            <option value="">{t("rmc.select_project")}</option>
            {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.plant")}>
          <select style={inp} value={v.plant_id} disabled={fromChallan}
            onChange={(e) => setV((x) => ({ ...x, plant_id: e.target.value }))}>
            <option value="">{t("rmc.select_plant")}</option>
            {(meta.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("rmc.test_kind")} hint={autoKind ? t("rmc.test_kind_auto") : ""}>
          <select style={inp} value={kind} disabled={!!autoKind}
            onChange={(e) => setV((x) => ({ ...x, test_kind: e.target.value }))}>
            <option value="cube">{t("rmc.test_cube")}</option>
            <option value="marshall">{t("rmc.test_marshall")}</option>
          </select>
        </Field>
        <Field label={t("rmc.grade")}
          hint={v.grade && !ms ? t("rmc.fck_is", { n: fckOf(v.grade) == null ? "—" : fckOf(v.grade) }) : ""}>
          <input style={inp} value={v.grade} disabled={fromChallan} placeholder={ms ? t("rmc.grade_bitumen_ph") : "M25"}
            onChange={(e) => setV((x) => ({ ...x, grade: e.target.value }))} />
        </Field>
        <Field label={t("rmc.cast_date")}>
          <input type="date" style={inp} value={v.cast_date}
            onChange={(e) => setV((x) => ({ ...x, cast_date: e.target.value }))} />
        </Field>
        <Field label={ms ? t("rmc.specimens_count") : t("rmc.cubes_count")}>
          <input type="number" min="1" max="12" style={inp} value={v.cubes_count}
            onChange={(e) => setV((x) => ({ ...x, cubes_count: e.target.value }))} />
        </Field>
        {!ms && (
          <Field label={t("rmc.slump_mm")}>
            <input type="number" style={inp} value={v.slump_mm}
              onChange={(e) => setV((x) => ({ ...x, slump_mm: e.target.value }))} />
          </Field>
        )}
        <Field label={t("rmc.element")} hint={t("rmc.element_hint")} span={2}>
          <input style={inp} value={v.element}
            onChange={(e) => setV((x) => ({ ...x, element: e.target.value }))} />
        </Field>
        <Field label={t("rmc.note")}>
          <input style={inp} value={v.note} onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))} />
        </Field>
      </Grid>
      <Notice>{ms ? t("rmc.marshall_sample_note") : t("rmc.sample_note")}</Notice>
      <ErrBox>{err}</ErrBox>
    </Modal>
  );
}

// ── Register ─────────────────────────────────────────────────────
const CC = "110px 110px 80px 100px 1fr 1fr 100px";

// Ek umar ka cell — result hai to strength, warna due ya khaali dash.
const AgeCell = ({ res, due, age }) => {
  if (res) {
    const low = !res.passed;
    const bad = low && age >= 28;
    return (
      <span style={{ color: bad ? T.red : low ? T.amb : T.t1, fontWeight: 700 }}>
        {mpa(res.strength_mpa)}
        <span style={{ fontSize: 10, color: T.t4, fontWeight: 400, marginLeft: 5 }}>
          {res.required_mpa == null ? "" : "/ " + fmtN(res.required_mpa)}
        </span>
      </span>
    );
  }
  if (due) return <Pill label={t("rmc.due_now")} c={T.amb} bg={T.ambL} />;
  return <span style={{ color: T.t4 }}>—</span>;
};

// Marshall row ka chhota saar — char aankde, seema se bahar laal, na bhara "—".
const MarshallCell = ({ r }) => {
  const res = r.marshall;
  if (!res) return r.due_marshall ? <Pill label={t("rmc.due_now")} c={T.amb} bg={T.ambL} /> : <span style={{ color: T.t4 }}>—</span>;
  const f = parseMsFlags(res.flags);
  return (
    <span style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5 }}>
      {MARSHALL.map((m) => (
        <span key={m.key} style={{ color: f.out.has(m.key) ? T.red : f.missing.has(m.key) ? T.t4 : T.t1, fontWeight: 700 }}>
          {res[m.key] == null ? "—" : fmtN(res[m.key])}<span style={{ fontWeight: 400, color: T.t4 }}> {m.unit}</span>
        </span>
      ))}
    </span>
  );
};

function RmcCubes({ meta, canCreate, refreshKey, onRefresh }) {
  const [range, setRange] = useState({ from: daysAgo(60), to: todayStr() });
  const [fl, setFl] = useState({ project_id: "", status: "", failed: false, kind: "", review: false });
  const hasBit = (meta.plants || []).some(isBitumen) || (meta.designs || []).some(isBitumen);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await rget("/reports/cube-register", range);
    setRows((dataOf(r, {}) || {}).rows || []);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Server date-range par poora register deta hai; project/status/failed yahin
  // chhaante hain taaki filter badalne par dobara load na karna pade.
  const shown = useMemo(() => rows.filter((r) =>
    (!fl.project_id || String(r.project_id) === String(fl.project_id)) &&
    (!fl.status || r.status === fl.status) &&
    (!fl.kind || (r.test_kind || "cube") === fl.kind) &&
    (!fl.review || r.review_status === "pending") &&
    (!fl.failed || !!r.failed)), [rows, fl]);

  const stat = useMemo(() => ({
    total: shown.length,
    due: shown.filter((r) => r.due_7 || r.due_28 || r.due_marshall).length,
    failed: shown.filter((r) => r.failed).length,
    review: shown.filter((r) => r.review_status === "pending").length,
  }), [shown]);

  const open = shown.find((r) => String(r.id) === String(openId)) || null;
  const changed = () => { load(); if (onRefresh) onRefresh(); };

  return (
    <div>
      <Notice>{t("rmc.cube_intro")}{hasBit ? " " + t("rmc.marshall_intro") : ""}</Notice>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
        <StatCard label={t("rmc.cube_total")} value={stat.total} color={T.ind} icon={IcBox} />
        <StatCard label={t("rmc.cube_due")} value={stat.due} sub={t("rmc.cube_due_sub")} color={T.amb} icon={IcBox} />
        <StatCard label={t("rmc.cube_failed")} value={stat.failed} sub={t("rmc.cube_failed_sub")} color={T.red} icon={IcBox} />
        {hasBit && (
          <StatCard label={t("rmc.review_pending")} value={stat.review} sub={t("rmc.review_pending_sub")} color={T.amb} icon={IcBox}
            onClick={() => setFl((x) => ({ ...x, review: !x.review }))} />
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("common.project")}>
          <select style={{ ...inpSm, width: 190 }} value={fl.project_id}
            onChange={(e) => setFl({ ...fl, project_id: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {(meta.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select style={{ ...inpSm, width: 150 }} value={fl.status}
            onChange={(e) => setFl({ ...fl, status: e.target.value })}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{cubeStatusLabel(s)}</option>)}
          </select>
        </Field>
        <Field label={t("common.from")}>
          <input type="date" style={{ ...inpSm, width: 145 }} value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label={t("common.to")}>
          <input type="date" style={{ ...inpSm, width: 145 }} value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
        {hasBit && (
          <Field label={t("rmc.test_kind")}>
            <select style={{ ...inpSm, width: 130 }} value={fl.kind} onChange={(e) => setFl({ ...fl, kind: e.target.value })}>
              <option value="">{t("common.all")}</option>
              <option value="cube">{t("rmc.test_cube")}</option>
              <option value="marshall">{t("rmc.test_marshall")}</option>
            </select>
          </Field>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, fontWeight: 600, paddingBottom: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={fl.failed} onChange={(e) => setFl({ ...fl, failed: e.target.checked })} />
          {t("rmc.only_failed")}
        </label>
        {hasBit && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, fontWeight: 600, paddingBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={fl.review} onChange={(e) => setFl({ ...fl, review: e.target.checked })} />
            {t("rmc.only_review")}
          </label>
        )}
        <span style={{ flex: 1 }} />
        {canCreate && <Btn icon={IcAdd} onClick={() => setFormOpen(true)}>{t("rmc.new_sample")}</Btn>}
      </div>

      <Panel title={t("rmc.cube_register", { n: shown.length })}>
        {loading ? <Spinner label={t("common.loading")} />
          : shown.length === 0 ? <Empty>{t("rmc.no_samples")}</Empty> : (
            <Scroll minWidth={900}>
              <Row cols={CC} head>
                <span>{t("rmc.sample_no")}</span>
                <span>{t("rmc.challan")}</span>
                <span>{t("rmc.grade")}</span>
                <span>{t("rmc.cast_date")}</span>
                <span>{t("rmc.d7")}</span>
                <span>{t("rmc.d28")}</span>
                <span>{t("common.status")}</span>
              </Row>
              {shown.map((r) => {
                const due = r.due_7 || r.due_28 || r.due_marshall;
                const ms = r.test_kind === "marshall";
                return (
                  <Row key={r.id} cols={CC} onClick={() => setOpenId(r.id)}
                    style={r.failed ? { background: T.redL } : (due || r.review_status === "pending") ? { background: T.ambL } : undefined}>
                    <span style={{ fontWeight: 700, color: T.ind }}>{r.sample_no}</span>
                    <span style={{ color: T.t2 }}>{r.challan_no || "—"}</span>
                    <span><GradePill g={r.grade} /></span>
                    <span style={{ color: T.t3 }}>
                      {fmtD(r.cast_date)}
                      <div style={{ fontSize: 10, color: T.t4 }}>{t("rmc.n_days", { n: N(r.age_now) })}</div>
                    </span>
                    {ms ? (
                      <span style={{ gridColumn: "span 2" }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, marginRight: 6 }}>{t("rmc.test_marshall")}</span>
                        <MarshallCell r={r} />
                      </span>
                    ) : (<>
                      <span><AgeCell res={r.d7} due={r.due_7} age={7} /></span>
                      <span><AgeCell res={r.d28} due={r.due_28} age={28} /></span>
                    </>)}
                    <span style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                      {r.failed ? <Pill label={t("rmc.fail")} c={T.red} bg={T.redL} /> : <CubePill s={r.status} />}
                      {ms && r.review_status && r.review_status !== "pending" ? <ReviewPill s={r.review_status} /> : null}
                    </span>
                  </Row>
                );
              })}
            </Scroll>
          )}
      </Panel>

      <NewSampleModal open={formOpen} meta={meta} onClose={() => setFormOpen(false)} onCreated={changed} />
      {open && (
        <SampleDrawer sample={open} canCreate={canCreate} meta={meta}
          onClose={() => setOpenId(null)} onChanged={changed} />
      )}
    </div>
  );
}

export default RmcCubes;
