// RMC › Cube ka detail — result bharna aur ab tak ke result.
//
// Pass/fail ka faisla server karta hai (routes/rmc.js requiredAt + passed).
// Yahan wahi ganit sirf DIKHANE ke liye dobara hai — form me "kitna chahiye"
// saamne rahe aur strength likhte hi pata chal jaye ki baat ban rahi hai ya
// nahi. Server ka jawab hi aakhri hai; screen uska message hi dikhati hai.
//
// Ek umar ka ek hi result rehta hai — dobara bharo to purana update ho jaata
// hai (server par ON DUPLICATE KEY), nayi line nahi banti.
//
// POST /rmc/cube-samples/:id/result
import { useState } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, fmtD, fmtN, rpost, dataOf, inp, Field, Grid, KV, Btn, Panel, Row, Scroll, Empty,
  ErrBox, Notice, Drawer, Pill, GradePill, CubePill, IcChk, todayStr,
} from "./rmcShared";

// Grade se fck — "M30" → 30. Custom naam ho to null, tab pass/fail haath se.
export const fckOf = (grade) => {
  const m = String(grade || "").toUpperCase().match(/M\s*([0-9]+(?:\.[0-9]+)?)/);
  return m ? Number(m[1]) : null;
};
// 7 din par aam taur par fck ka ~65%, 28 din par poora. Yahi aankda server
// me bhi hai — badle to dono jagah badlega.
export const requiredAt = (fck, age) =>
  (fck == null ? null : (N(age) >= 28 ? N(fck) : Math.round(N(fck) * 0.65 * 100) / 100));
export const mpa = (n) => (n == null || n === "" ? "—" : fmtN(n) + " " + t("rmc.mpa"));
export const fckOfSample = (s) => (s.fck == null ? fckOf(s.grade) : N(s.fck));

// ── Result bharne ka form ────────────────────────────────────────
function ResultForm({ sample, onDone }) {
  const toast = useToast();
  const [age, setAge] = useState("7");
  const [custom, setCustom] = useState("");
  const [v, setV] = useState({ test_date: todayStr(), cubes_tested: "3", strength_mpa: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ageDays = age === "custom" ? N(custom) : N(age);
  const need = requiredAt(fckOfSample(sample), ageDays);
  const got = N(v.strength_mpa);
  const willPass = need == null ? null : got >= need;

  const save = async () => {
    setErr(""); setBusy(true);
    const r = await rpost(`/cube-samples/${sample.id}/result`, {
      age_days: ageDays, test_date: v.test_date, cubes_tested: v.cubes_tested,
      strength_mpa: v.strength_mpa, note: v.note || null,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    // Pass ho ya fail, bolna server ka kaam hai — message seedha dikhta hai.
    const passed = (dataOf(r, {}) || {}).passed;
    if (passed === false) toast.warning(r.message || t("rmc.done"));
    else toast.success(r.message || t("rmc.done"));
    setV({ test_date: todayStr(), cubes_tested: "3", strength_mpa: "", note: "" });
    onDone();
  };

  return (
    <Panel title={t("rmc.add_result")} style={{ marginBottom: 14 }}>
      <div style={{ padding: 14 }}>
        <Grid cols={3} style={{ marginBottom: 12 }}>
          <Field label={t("rmc.age_days")}>
            <select style={inp} value={age} onChange={(e) => setAge(e.target.value)}>
              <option value="7">{t("rmc.age_7")}</option>
              <option value="28">{t("rmc.age_28")}</option>
              <option value="custom">{t("rmc.age_custom")}</option>
            </select>
          </Field>
          {age === "custom" ? (
            <Field label={t("rmc.age_how_many")}>
              <input type="number" min="1" max="365" style={inp} value={custom}
                onChange={(e) => setCustom(e.target.value)} />
            </Field>
          ) : (
            <Field label={t("rmc.required_strength")} hint={need == null ? t("rmc.no_fck_hint") : t("rmc.required_hint")}>
              <div style={{ ...inp, background: T.surfaceB, fontWeight: 700 }}>{mpa(need)}</div>
            </Field>
          )}
          <Field label={t("rmc.test_date")}>
            <input type="date" style={inp} value={v.test_date}
              onChange={(e) => setV((x) => ({ ...x, test_date: e.target.value }))} />
          </Field>
          <Field label={t("rmc.cubes_tested")}>
            <input type="number" min="1" style={inp} value={v.cubes_tested}
              onChange={(e) => setV((x) => ({ ...x, cubes_tested: e.target.value }))} />
          </Field>
          <Field label={t("rmc.strength")} hint={t("rmc.strength_hint")}>
            <input type="number" step="0.01" style={inp} value={v.strength_mpa}
              onChange={(e) => setV((x) => ({ ...x, strength_mpa: e.target.value }))} />
          </Field>
          <Field label={t("rmc.note")}>
            <input style={inp} value={v.note} onChange={(e) => setV((x) => ({ ...x, note: e.target.value }))} />
          </Field>
        </Grid>
        {age === "custom" && need != null && (
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10 }}>
            {t("rmc.required_at", { n: ageDays, s: mpa(need) })}
          </div>
        )}
        {got > 0 && willPass !== null && (
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, color: willPass ? T.grn : T.red }}>
            {willPass ? t("rmc.looks_pass", { s: mpa(need) }) : t("rmc.looks_fail", { s: mpa(need) })}
          </div>
        )}
        {N(ageDays) > 0 && N(ageDays) < 28 && <Notice>{t("rmc.seven_day_note")}</Notice>}
        <Btn icon={IcChk} onClick={save} disabled={busy || !(got > 0) || !(ageDays >= 1)}>
          {busy ? t("rmc.saving") : t("rmc.save_result")}
        </Btn>
        <ErrBox>{err}</ErrBox>
      </div>
    </Panel>
  );
}

// ── Sample ka drawer ─────────────────────────────────────────────
const RC = "90px 110px 110px 130px 1fr 90px";

// Ek result ka nishaan. 28 din se pehle kam aana "kam" hai, "fail" nahi —
// server bhi failed sirf 28+ par lagata hai.
const ResultPill = ({ r }) => {
  if (r.required_mpa == null) return <Pill label={t("rmc.no_fck")} c={T.slt} bg={T.sltL} />;
  if (r.passed) return <Pill label={t("rmc.pass")} c={T.grn} bg={T.grnL} />;
  const hard = N(r.age_days) >= 28;
  return <Pill label={hard ? t("rmc.fail") : t("rmc.low")} c={hard ? T.red : T.amb} bg={hard ? T.redL : T.ambL} />;
};

function SampleDrawer({ sample, canCreate, onClose, onChanged }) {
  const results = (sample.results || []).slice().sort((a, b) => N(a.age_days) - N(b.age_days));
  return (
    <Drawer open onClose={onClose} width={840}
      title={sample.sample_no || t("rmc.cube_sample")}
      head={<>
        <CubePill s={sample.status} />
        {sample.failed ? <Pill label={t("rmc.fail")} c={T.red} bg={T.redL} /> : null}
      </>}
      sub={[sample.project_name, sample.grade, sample.challan_no].filter(Boolean).join(" · ")}>
      <Grid cols={4} style={{ marginBottom: 14 }}>
        <KV k={t("common.project")} v={sample.project_name} />
        <KV k={t("rmc.plant")} v={sample.plant_name} />
        <KV k={t("rmc.challan")} v={sample.challan_no} />
        <KV k={t("rmc.grade")} v={<GradePill g={sample.grade} />} />
        <KV k={t("rmc.cast_date")} v={fmtD(sample.cast_date)} />
        <KV k={t("rmc.age_now")} v={sample.age_now == null ? "—" : t("rmc.n_days", { n: N(sample.age_now) })} />
        <KV k={t("rmc.cubes_count")} v={fmtN(sample.cubes_count)} />
        <KV k={t("rmc.slump_mm")} v={sample.slump_mm == null ? "—" : fmtN(sample.slump_mm)} />
        <KV k={t("rmc.element")} v={sample.element} />
        <KV k={t("rmc.fck")} v={sample.fck == null ? "—" : mpa(sample.fck)} />
        <KV k={t("rmc.required_28")} v={mpa(requiredAt(fckOfSample(sample), 28))} />
        <KV k={t("rmc.note")} v={sample.note} />
      </Grid>

      {fckOfSample(sample) == null && <Notice tone="warn">{t("rmc.no_fck_note")}</Notice>}
      {sample.failed ? <Notice tone="warn">{t("rmc.failed_note")}</Notice> : null}
      {(sample.due_7 || sample.due_28) && <Notice tone="warn">{t("rmc.due_note")}</Notice>}

      {canCreate && <ResultForm sample={sample} onDone={onChanged} />}

      <Panel title={t("rmc.result_history")}>
        {results.length === 0 ? <Empty>{t("rmc.no_results")}</Empty> : (
          <Scroll minWidth={660}>
            <Row cols={RC} head>
              <span>{t("rmc.age_days")}</span>
              <span>{t("rmc.test_date")}</span>
              <span style={{ textAlign: "right" }}>{t("rmc.cubes_tested")}</span>
              <span style={{ textAlign: "right" }}>{t("rmc.strength")}</span>
              <span>{t("rmc.note")}</span>
              <span>{t("common.status")}</span>
            </Row>
            {results.map((x) => (
              <Row key={x.id} cols={RC}>
                <span style={{ fontWeight: 700, color: T.t1 }}>{t("rmc.n_days", { n: N(x.age_days) })}</span>
                <span style={{ color: T.t3 }}>{fmtD(x.test_date)}</span>
                <span style={{ textAlign: "right" }}>{fmtN(x.cubes_tested)}</span>
                <span style={{ textAlign: "right", fontWeight: 700 }}>
                  {mpa(x.strength_mpa)}
                  <div style={{ fontSize: 10, color: T.t4, fontWeight: 400 }}>
                    {t("rmc.need_short", { s: mpa(x.required_mpa) })}
                  </div>
                </span>
                <span style={{ color: T.t3, fontSize: 11.5 }}>{x.note || "—"}</span>
                <span><ResultPill r={x} /></span>
              </Row>
            ))}
          </Scroll>
        )}
      </Panel>
    </Drawer>
  );
}

export { SampleDrawer };
export default SampleDrawer;
