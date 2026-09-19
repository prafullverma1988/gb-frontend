// RMC › Reports › Batch sheet — plant ke software ki CSV/Excel padhkar
// challan se milana, aur design se antar dekhna.
//
// File base64 me jaati hai (repo me multer nahi hai — Assets ka import bhi
// aise hi jaata hai). Pehle dry run: kuch save nahi hota, sirf dikhta hai ki
// kaunsi row kis challan se judi aur har material me kitna antar hai. "Import
// karo" dabane par hi wahi rows database me jaati hain.
//
// Column ke naam server pehchanta hai (utils/rmcBatch.js), isliye har plant
// ki apni file chal jaati hai — screen par koi mapping nahi karni padti.
//
// POST /rmc/batch-import (dry_run true/false) · GET /rmc/batch-imports (+ ?id=)
import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n";
import {
  T, N, cum, fmtD, fmtDT, fmtN, rget, rpost, dataOf, inp, inpSm, Field, KV, Btn, Panel, Row,
  Scroll, Empty, ErrBox, Notice, Spinner, Pill, SubTabs, StatCard, diffColor, GradePill,
  IcBox, IcChk, todayStr,
} from "./rmcShared";

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA");
const matchNoteLabel = (n) => (n === "number" ? t("rmc.match_by_number")
  : n ? t("rmc.match_by_day") : t("rmc.unmatched"));

// File → base64. FileReader data URL deta hai ("data:…;base64,AAA"), server
// comma ke baad wala hissa khud le leta hai, par saaf bhejna behtar hai.
const toBase64 = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => {
    const s = String(fr.result || "");
    resolve(s.includes(",") ? s.slice(s.indexOf(",") + 1) : s);
  };
  fr.onerror = () => reject(new Error(t("rmc.file_read_failed")));
  fr.readAsDataURL(file);
});

// ── Ek row ka material-wise antar ────────────────────────────────
const VarianceTable = ({ rows }) => {
  const list = rows || [];
  if (!list.length) return <div style={{ padding: "10px 14px", fontSize: 11.5, color: T.t4 }}>{t("rmc.no_variance")}</div>;
  return (
    <Scroll minWidth={560}>
      <Row cols="1fr 110px 110px 110px 90px" head>
        <span>{t("rmc.material")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.actual_kg")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.should_kg")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.diff")}</span>
        <span style={{ textAlign: "right" }}>{t("rmc.diff_pct")}</span>
      </Row>
      {list.map((m, i) => (
        <Row key={i} cols="1fr 110px 110px 110px 90px">
          <span style={{ color: T.t1 }}>{m.name}</span>
          <span style={{ textAlign: "right" }}>{fmtN(m.actual_kg)}</span>
          <span style={{ textAlign: "right", color: T.t3 }}>{m.should_kg == null ? "—" : fmtN(m.should_kg)}</span>
          <span style={{ textAlign: "right", fontWeight: 700, color: diffColor(m.diff_kg) }}>
            {m.diff_kg == null ? "—" : (N(m.diff_kg) > 0 ? "+ " : N(m.diff_kg) < 0 ? "− " : "") + fmtN(Math.abs(N(m.diff_kg)))}
          </span>
          <span style={{ textAlign: "right", fontWeight: 700, color: diffColor(m.diff_pct) }}>
            {m.diff_pct == null ? "—" : (N(m.diff_pct) > 0 ? "+" : N(m.diff_pct) < 0 ? "−" : "") + fmtN(Math.abs(N(m.diff_pct))) + "%"}
          </span>
        </Row>
      ))}
    </Scroll>
  );
};

// ── Parsed rows ka table (dry run aur purani import, dono me wahi) ──
const BR = "60px 120px 140px 90px 90px 130px 120px";

function RowsTable({ rows, openRow, onOpenRow }) {
  return (
    <>
      <Scroll minWidth={800}>
        <Row cols={BR} head>
          <span>#</span>
          <span>{t("rmc.batch_no")}</span>
          <span>{t("rmc.batch_at")}</span>
          <span>{t("rmc.grade")}</span>
          <span style={{ textAlign: "right" }}>{t("rmc.cum")}</span>
          <span>{t("rmc.challan")}</span>
          <span>{t("rmc.match")}</span>
        </Row>
        {rows.map((r, i) => {
          const key = r.id || r.row_no || i;
          const on = String(openRow) === String(key);
          const bad = !r.dispatch_id;
          return (
            <div key={key}>
              <Row cols={BR} onClick={() => onOpenRow(on ? null : key)}
                style={bad ? { background: T.sltL } : undefined}>
                <span style={{ color: T.t4 }}>{r.row_no || i + 1}</span>
                <span style={{ color: T.t1, fontWeight: 600 }}>{r.batch_no || "—"}</span>
                <span style={{ color: T.t3, fontSize: 11.5 }}>{r.batch_at ? fmtDT(r.batch_at) : "—"}</span>
                <span>{r.grade ? <GradePill g={r.grade} /> : "—"}</span>
                <span style={{ textAlign: "right", fontWeight: 700 }}>{cum(r.cum)}</span>
                <span style={{ color: r.dispatch_id ? T.ind : T.t4, fontWeight: 700 }}>{r.challan_no || "—"}</span>
                <span>
                  <Pill label={matchNoteLabel(r.match_note)}
                    c={r.dispatch_id ? T.grn : T.slt} bg={r.dispatch_id ? T.grnL : T.sltL} />
                </span>
              </Row>
              {on && (
                <div style={{ background: T.surfaceB, borderBottom: `1px solid ${T.b1}` }}>
                  <VarianceTable rows={r.variance} />
                </div>
              )}
            </div>
          );
        })}
      </Scroll>
    </>
  );
}

// ── Nayi file: pick → dry run → import ───────────────────────────
function ImportForm({ meta, canCreate, onImported }) {
  const toast = useToast();
  const plants = meta.plants || [];
  const [plantId, setPlantId] = useState(plants.length === 1 ? String(plants[0].id) : "");
  const [range, setRange] = useState({ from: daysAgo(45), to: todayStr() });
  const [file, setFile] = useState(null);
  const [b64, setB64] = useState("");
  const [dry, setDry] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setDry(null); setFile(f);
    try { setB64(await toBase64(f)); }
    catch (ex) { setB64(""); setErr(ex.message || t("rmc.file_read_failed")); }
  };

  const send = async (dryRun) => {
    setErr(""); setBusy(true);
    const r = await rpost("/batch-import", {
      plant_id: plantId, file_name: file ? file.name : null, file_b64: b64,
      from: range.from, to: range.to, dry_run: dryRun,
    });
    setBusy(false);
    if (!r || !r.success) { setErr((r && r.message) || t("rmc.save_failed")); return; }
    if (dryRun) { setDry(dataOf(r, null)); setOpenRow(null); return; }
    toast.success(r.message || t("rmc.done"));
    setFile(null); setB64(""); setDry(null);
    onImported();
  };

  const sum = (dry && dry.summary) || null;
  const rows = (dry && dry.rows) || [];

  return (
    <div>
      <Notice>{t("rmc.batch_intro")}</Notice>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <Field label={t("rmc.plant")}>
          <select style={{ ...inpSm, width: 200 }} value={plantId}
            onChange={(e) => { setPlantId(e.target.value); setDry(null); }}>
            <option value="">{t("rmc.select_plant")}</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.from")} hint={t("rmc.batch_range_hint")}>
          <input type="date" style={{ ...inpSm, width: 145 }} value={range.from}
            onChange={(e) => { setRange({ ...range, from: e.target.value }); setDry(null); }} />
        </Field>
        <Field label={t("common.to")}>
          <input type="date" style={{ ...inpSm, width: 145 }} value={range.to}
            onChange={(e) => { setRange({ ...range, to: e.target.value }); setDry(null); }} />
        </Field>
        <Field label={t("common.file")} hint={t("rmc.file_hint")}>
          <label style={{ ...inp, width: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", color: file ? T.t1 : T.t3, fontWeight: file ? 700 : 400 }}>
            {file ? file.name : t("rmc.pick_file")}
            <input type="file" accept=".csv,.xlsx" onChange={pick} style={{ display: "none" }} />
          </label>
        </Field>
        <span style={{ flex: 1 }} />
        {canCreate && (
          <Btn ghost onClick={() => send(true)} disabled={busy || !plantId || !b64}>
            {busy ? t("rmc.saving") : t("rmc.check_file")}
          </Btn>
        )}
        {canCreate && (
          <Btn icon={IcChk} onClick={() => send(false)} disabled={busy || !dry || rows.length === 0}>
            {t("rmc.do_import")}
          </Btn>
        )}
      </div>

      {!dry ? <Panel><Empty>{t("rmc.batch_pick_first")}</Empty></Panel> : (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14 }}>
          <StatCard label={t("rmc.rows_total")} value={N(sum && sum.total)} color={T.ind} icon={IcBox} />
          <StatCard label={t("rmc.rows_matched")} value={N(sum && sum.matched)} color={T.grn} icon={IcBox} />
          <StatCard label={t("rmc.rows_unmatched")} value={N(sum && sum.unmatched)} sub={t("rmc.unmatched_sub")} color={T.slt} icon={IcBox} />
        </div>
        <Notice tone="warn">{t("rmc.batch_dry_note")}</Notice>
        {(dry.materials || []).length > 0 && (
          <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10 }}>
            {t("rmc.material_columns")}: {(dry.materials || []).join(" · ")}
          </div>
        )}
        <Panel title={t("rmc.batch_rows", { n: rows.length })}>
          {rows.length === 0 ? <Empty>{t("rmc.no_rows")}</Empty>
            : <RowsTable rows={rows} openRow={openRow} onOpenRow={setOpenRow} />}
        </Panel>
      </>)}
      <ErrBox>{err}</ErrBox>
    </div>
  );
}

// ── Purani import ────────────────────────────────────────────────
const IL = "90px 1fr 160px 150px 100px 100px 150px";

function PastImports({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [openRow, setOpenRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(dataOf(await rget("/batch-imports"), []) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    let dead = false;
    setDetail(null); setOpenRow(null);
    rget("/batch-imports", { id: openId }).then((r) => { if (!dead) setDetail(dataOf(r, null)); });
    return () => { dead = true; };
  }, [openId]);

  if (openId) {
    return (
      <div>
        <Btn ghost onClick={() => setOpenId(null)} style={{ marginBottom: 12 }}>{t("rmc.back_to_list")}</Btn>
        {!detail ? <Spinner label={t("common.loading")} /> : (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14, padding: 14, background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12 }}>
            <KV k={t("rmc.file_name")} v={detail.file_name} />
            <KV k={t("rmc.period")} v={fmtD(detail.from_date) + " – " + fmtD(detail.to_date)} />
            <KV k={t("rmc.rows_total")} v={fmtN(detail.rows_total)} />
            <KV k={t("rmc.rows_matched")} v={fmtN(detail.rows_matched)} />
            <KV k={t("rmc.imported_at")} v={fmtDT(detail.created_at)} />
          </div>
          <Panel title={t("rmc.batch_rows", { n: (detail.rows || []).length })}>
            {(detail.rows || []).length === 0 ? <Empty>{t("rmc.no_rows")}</Empty>
              : <RowsTable rows={detail.rows} openRow={openRow} onOpenRow={setOpenRow} />}
          </Panel>
        </>)}
      </div>
    );
  }

  return (
    <Panel title={t("rmc.imports_list", { n: rows.length })}>
      {loading ? <Spinner label={t("common.loading")} />
        : rows.length === 0 ? <Empty>{t("rmc.no_imports")}</Empty> : (
          <Scroll minWidth={900}>
            <Row cols={IL} head>
              <span>#</span>
              <span>{t("rmc.file_name")}</span>
              <span>{t("rmc.plant")}</span>
              <span>{t("rmc.period")}</span>
              <span style={{ textAlign: "right" }}>{t("rmc.rows_total")}</span>
              <span style={{ textAlign: "right" }}>{t("rmc.rows_matched")}</span>
              <span>{t("rmc.imported_by")}</span>
            </Row>
            {rows.map((x) => (
              <Row key={x.id} cols={IL} onClick={() => setOpenId(x.id)}>
                <span style={{ fontWeight: 700, color: T.ind }}>{"#" + x.id}</span>
                <span style={{ color: T.t1 }}>{x.file_name || "—"}</span>
                <span style={{ color: T.t2 }}>{x.plant_name || "—"}</span>
                <span style={{ color: T.t3, fontSize: 11.5 }}>{fmtD(x.from_date) + " – " + fmtD(x.to_date)}</span>
                <span style={{ textAlign: "right" }}>{fmtN(x.rows_total)}</span>
                <span style={{ textAlign: "right", fontWeight: 700, color: N(x.rows_matched) < N(x.rows_total) ? T.amb : T.grn }}>
                  {fmtN(x.rows_matched)}
                </span>
                <span style={{ color: T.t3, fontSize: 11.5 }}>
                  {x.imported_by_name || "—"}
                  <div style={{ fontSize: 10, color: T.t4 }}>{fmtDT(x.created_at)}</div>
                </span>
              </Row>
            ))}
          </Scroll>
        )}
    </Panel>
  );
}

function RmcBatchSheet({ meta, canCreate }) {
  const [sub, setSub] = useState("new");
  const [refreshKey, setRefreshKey] = useState(0);
  const tabs = [{ id: "new", l: t("rmc.batch_new") }, { id: "past", l: t("rmc.batch_past") }];
  return (
    <div>
      <SubTabs tabs={tabs} value={sub} onChange={setSub} />
      {sub === "new" ? (
        <ImportForm meta={meta} canCreate={canCreate}
          onImported={() => { setRefreshKey((k) => k + 1); setSub("past"); }} />
      ) : <PastImports refreshKey={refreshKey} />}
    </div>
  );
}

export default RmcBatchSheet;
