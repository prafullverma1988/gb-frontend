// ════════════════════════════════════════════════════════════════
// FLAG CENTER (28 Oct 2026) — saare flag ek jagah.
// Trip · Kaanta · GPS · Fuel · Attendance · Progress ghata · AI photo jaanch.
// Yahan sirf DEKHNA aur "Dekha" tick — faisla (approve / Theek hai / Finance dekhe)
// har flag ke apne module me hota hai ("Kholo" wahin le jaata hai).
// Data: GET /api/flags (services/flagCenter.js), tick: POST /api/flags/seen.
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../config/api";
import { T } from "./shared/tokens";
import { t } from "../i18n";
import { can } from "../utils/perms";

const SOURCES = ["trip", "kaanta", "gps", "fuel", "attendance", "progress_drop", "ai_check"];
const STATUS_CHIPS = ["new", "seen", "done", "all"];
const DAYS = [7, 30, 90];

const lbl = (key, fallback) => { const v = t(key); return v === key ? fallback : v; };
const kindLabel = (src, k) => lbl(`flagc.k_${src}_${k}`, String(k || "").replace(/_/g, " "));
const srcLabel = (src) => lbl(`flagc.src_${src}`, src);

const fmtWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
const ageText = (h) => {
  if (h == null) return "";
  if (h < 1) return t("flagc.ago_abhi");
  if (h < 48) return t("flagc.ago_h", { n: h });
  return t("flagc.ago_d", { n: Math.round(h / 24) });
};

// Ek line ka byora — source ke hisaab se (kaccha data server se, likhawat yahan)
function detailLine(it) {
  const d = it.data || {};
  const bits = [];
  switch (it.source) {
    case "trip":
      bits.push(t("flagc.d_trip", { n: d.trip_no != null ? d.trip_no : "—" }));
      if (d.vehicle) bits.push(d.vehicle);
      break;
    case "kaanta":
      if (d.vehicle) bits.push(d.vehicle);
      if (d.rst_no) bits.push(t("flagc.d_rst", { n: d.rst_no }));
      if (d.challan_no) bits.push(t("flagc.d_challan", { n: d.challan_no }));
      if (d.vendor) bits.push(d.vendor);
      if (it.state === "open" && d.total > 1) bits.push(t("flagc.d_pending", { p: d.pending, n: d.total }));
      break;
    case "gps":
      if (d.day) bits.push(d.day);
      if (d.vehicle) bits.push(d.vehicle);
      break;
    case "fuel":
      if (d.litres != null) bits.push(`${d.litres} L`);
      if (d.vendor) bits.push(d.vendor);
      if (d.where) bits.push(d.where);
      break;
    case "attendance":
      if (d.reason) bits.push(d.reason);
      break;
    case "progress_drop":
      if (d.task) bits.push(d.task);
      if (d.from != null && d.to != null) bits.push(`${d.from}${d.unit || ""} → ${d.to}${d.unit || ""}`);
      break;
    case "ai_check":
      if (d.task) bits.push(d.task);
      break;
    default: break;
  }
  return bits.join(" · ");
}
const extraLine = (it) => {
  const d = it.data || {};
  if (it.source === "fuel" && d.note) return d.note;
  if (it.source === "progress_drop" && d.note) return d.note;
  if (it.source === "ai_check" && d.summary) return d.summary;
  return "";
};

const VERDICT = {
  ok:       { k: "flagc.v_ok",       c: "grn", },
  rejected: { k: "flagc.v_rejected", c: "red" },
  finance:  { k: "flagc.v_finance",  c: "amb" },
  sahi:     { k: "flagc.v_sahi",     c: "red" },
};
const TONE = {
  grn: { c: T.grn, bg: T.grnL }, red: { c: T.red, bg: T.redL }, amb: { c: T.amb, bg: T.ambL },
  ind: { c: T.ind, bg: T.indL }, slt: { c: T.t3, bg: T.surfaceB },
};
const Chip = ({ label, tone = "slt", title }) => (
  <span title={title} style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
    color: TONE[tone].c, background: TONE[tone].bg, whiteSpace: "nowrap" }}>{label}</span>
);

function useNarrow() {
  const [n, setN] = useState(typeof window !== "undefined" && window.innerWidth < 900);
  useEffect(() => {
    const on = () => setN(window.innerWidth < 900);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}

export default function FlagCenterModule({ onNavigate }) {
  const canTick = can("Flags", "edit");
  const narrow = useNarrow();
  const [status, setStatus] = useState("new");
  const [source, setSource] = useState("");
  const [project, setProject] = useState("");
  const [days, setDays] = useState(30);
  const [qIn, setQIn] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => { const h = setTimeout(() => setQ(qIn.trim()), 350); return () => clearTimeout(h); }, [qIn]);

  const load = useCallback(() => {
    const my = ++seq.current;
    const qs = new URLSearchParams({ status, days: String(days), limit: "300" });
    if (source) qs.set("source", source);
    if (project) qs.set("project_id", project);
    if (q) qs.set("q", q);
    api.get("/flags?" + qs.toString())
      .then((r) => {
        if (my !== seq.current) return;
        if (r && r.success) { setData(r.data); setErr(""); }
        else setErr((r && r.message) || t("flagc.load_fail"));
      })
      .catch(() => { if (my === seq.current) setErr(t("flagc.load_fail")); });
  }, [status, source, project, days, q]);
  useEffect(() => { load(); }, [load, tick]);
  // Chhanni badli → chuni hui row chhodo
  useEffect(() => { setSel(new Set()); }, [status, source, project, days, q]);

  const items = (data && data.items) || [];
  const counts = (data && data.counts) || { new: 0, seen: 0, done: 0, all: 0, by_source: {} };
  const shownSources = (data && data.sources) || SOURCES;

  const toggle = (uid) => setSel((s) => { const n = new Set(s); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const selectable = items.filter((it) => it.state !== "done");
  const allOn = selectable.length > 0 && selectable.every((it) => sel.has(it.uid));
  const toggleAll = () => setSel(allOn ? new Set() : new Set(selectable.map((it) => it.uid)));

  const doSeen = async (on) => {
    const picked = items.filter((it) => sel.has(it.uid)).map((it) => ({ source: it.source, ref_id: it.ref_id }));
    if (!picked.length || busy) return;
    setBusy(true);
    const r = await api.post("/flags/seen", { items: picked, on }).catch(() => null);
    setBusy(false);
    if (!r || r.success === false) { setErr((r && r.message) || t("flagc.load_fail")); return; }
    setSel(new Set());
    setTick((x) => x + 1);
    try { window.dispatchEvent(new Event("flags:changed")); } catch (_) { /* purane browser */ }
  };

  const open = (it) => {
    if (!onNavigate) return;
    const pid = it.project_id;
    if (pid && ["trip", "kaanta", "progress_drop", "ai_check"].includes(it.source)) {
      const tab = it.source === "trip" ? "equipment" : it.source === "kaanta" ? "material" : "task";
      onNavigate("projects", `/projects/${pid}/${tab}`);
      return;
    }
    const mod = { trip: "machinery", kaanta: "warehouse", gps: "machinery", fuel: "fuel", attendance: "payroll" }[it.source];
    if (mod) onNavigate(mod, "/" + mod);
  };

  // ── pieces ──
  const statusCell = (it) => {
    if (it.state === "done") {
      const v = VERDICT[it.verdict] || VERDICT.ok;
      const dec = it.decided || {};
      return (
        <div>
          <Chip label={t(v.k)} tone={v.c} />
          <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>
            {[dec.by_name, dec.at ? fmtWhen(dec.at) : null].filter(Boolean).join(" · ")}
          </div>
          {dec.note ? <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>{dec.note}</div> : null}
        </div>
      );
    }
    if (it.seen && it.seen.length) {
      const names = it.seen.map((s) => `${s.name || "—"} (${fmtWhen(s.at)})`).join("\n");
      return (
        <div title={names}>
          <Chip label={t("flagc.st_seen")} tone="ind" />
          <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>
            {it.seen.map((s) => s.name || "—").slice(0, 2).join(", ")}{it.seen.length > 2 ? ` +${it.seen.length - 2}` : ""}
          </div>
          <div style={{ fontSize: 10.5, color: T.t4 }}>{t("flagc.faisla_baaki")}</div>
        </div>
      );
    }
    const old = (it.age_h || 0) >= 48;
    return <Chip label={old ? t("flagc.st_new_old") : t("flagc.st_new")} tone={old ? "red" : "amb"} />;
  };

  const kindChips = (it) => (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {(it.kinds || []).slice(0, 3).map((k) => (
        <Chip key={k} label={kindLabel(it.source, k)} tone={it.severity === "red" ? "red" : "amb"} />
      ))}
      {(it.kinds || []).length > 3 ? <Chip label={`+${it.kinds.length - 3}`} tone="slt" /> : null}
    </span>
  );

  const tileBtn = (src) => {
    const c = (counts.by_source && counts.by_source[src]) || { new: 0, seen: 0, done: 0 };
    const on = source === src;
    const openN = c.new + c.seen;
    return (
      <button key={src} type="button" onClick={() => setSource(on ? "" : src)}
        style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: "10px 12px", borderRadius: 10, minWidth: 0,
          background: on ? T.indL : T.surface, border: `1.5px solid ${on ? T.ind : T.b1}` }}>
        <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{srcLabel(src)}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: c.new > 0 ? T.red : T.t1 }}>{openN}</span>
          <span style={{ fontSize: 10.5, color: c.new > 0 ? T.red : T.t4, fontWeight: 600 }}>
            {c.new > 0 ? t("flagc.tile_new", { n: c.new }) : t("flagc.tile_clear")}
          </span>
        </div>
      </button>
    );
  };

  const chipBtn = (id, label, n) => {
    const on = status === id;
    return (
      <button key={id} type="button" onClick={() => setStatus(id)}
        style={{ padding: "6px 13px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
          border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.ind : T.surface, color: on ? "#fff" : T.t2 }}>
        {label} <span style={{ opacity: .8, fontWeight: 600 }}>({n})</span>
      </button>
    );
  };

  const inp = { padding: "8px 11px", borderRadius: 8, border: `1.5px solid ${T.b1}`, fontSize: 12.5, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" };

  const rowCols = "30px 150px minmax(0,2.4fr) minmax(0,1.3fr) 118px minmax(0,1.5fr) 74px";

  return (
    <div style={{ padding: narrow ? "14px 12px 90px" : "20px 24px 40px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>{t("flagc.title")}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 3, maxWidth: 640, lineHeight: 1.5 }}>{t("flagc.sub")}</div>
        </div>
        <button type="button" onClick={() => setTick((x) => x + 1)}
          style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${T.b1}`, background: T.surface, color: T.t2, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {t("flagc.refresh")}
        </button>
      </div>

      {/* source tiles */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${narrow ? 140 : 150}px, 1fr))`, gap: 8, marginBottom: 14 }}>
        {SOURCES.filter((s) => shownSources.includes(s)).map(tileBtn)}
      </div>

      {/* filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {STATUS_CHIPS.map((id) => chipBtn(id, t(`flagc.st_${id}`), id === "all" ? counts.all : counts[id]))}
        <span style={{ flex: 1 }} />
        <select value={project} onChange={(e) => setProject(e.target.value)} style={{ ...inp, maxWidth: 210 }}>
          <option value="">{t("flagc.all_projects")}</option>
          {((data && data.projects) || []).map((p) => <option key={p.id} value={String(p.id)}>{p.name} ({p.n})</option>)}
        </select>
        <select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} style={inp}>
          {DAYS.map((d) => <option key={d} value={String(d)}>{t("flagc.days", { n: d })}</option>)}
        </select>
        <input value={qIn} onChange={(e) => setQIn(e.target.value)} placeholder={t("flagc.search_ph")} style={{ ...inp, minWidth: narrow ? 0 : 190, flex: narrow ? "1 1 100%" : "0 0 auto" }} />
      </div>

      {/* bulk bar */}
      {canTick && sel.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: T.indL, border: `1px solid ${T.ind}33`, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ind }}>{t("flagc.n_chune", { n: sel.size })}</span>
          <button type="button" disabled={busy} onClick={() => doSeen(true)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: T.ind, color: "#fff", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{t("flagc.mark_seen")}</button>
          <button type="button" disabled={busy} onClick={() => doSeen(false)}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.b1}`, background: T.surface, color: T.t2, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{t("flagc.unmark_seen")}</button>
          <button type="button" onClick={() => setSel(new Set())} style={{ background: "none", border: "none", color: T.t3, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>{t("flagc.clear_sel")}</button>
        </div>
      )}

      {err && <div style={{ padding: "9px 12px", borderRadius: 8, background: T.redL, color: T.red, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{err}</div>}
      {data && data.failed && data.failed.length > 0 && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: T.ambL, color: T.amb, fontSize: 11.5, fontWeight: 600, marginBottom: 10 }}>
          {t("flagc.partial", { list: data.failed.map(srcLabel).join(", ") })}
        </div>
      )}

      {/* list */}
      <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden" }}>
        {!narrow && (
          <div style={{ display: "grid", gridTemplateColumns: rowCols, gap: 10, padding: "9px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`,
            fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", alignItems: "center" }}>
            <span>{canTick && <input type="checkbox" checked={allOn} onChange={toggleAll} disabled={!selectable.length} />}</span>
            <span>{t("flagc.col_kya")}</span><span>{t("flagc.col_byora")}</span><span>{t("flagc.col_kiska")}</span>
            <span>{t("flagc.col_kab")}</span><span>{t("flagc.col_haal")}</span><span />
          </div>
        )}
        {data == null && !err && <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 12.5 }}>{t("flagc.loading")}</div>}
        {data != null && items.length === 0 && (
          <div style={{ padding: 34, textAlign: "center", color: T.t3, fontSize: 13 }}>{status === "new" ? t("flagc.empty_new") : t("flagc.empty")}</div>
        )}
        {items.map((it) => {
          const redOld = it.state === "open" && !it.seen.length && (it.age_h || 0) >= 48;
          const selected = sel.has(it.uid);
          const base = { padding: narrow ? "12px 12px" : "11px 14px", borderBottom: `1px solid ${T.b1}`,
            borderLeft: `3px solid ${redOld ? T.red : it.state === "done" ? T.b1 : it.severity === "red" ? T.amb : T.b2}`,
            background: selected ? T.indL : T.surface };
          const who = [it.who, it.project_name].filter(Boolean).join(" · ") || "—";
          const openBtn = (
            <button type="button" onClick={() => open(it)}
              style={{ padding: "5px 11px", borderRadius: 7, border: `1.5px solid ${T.ind}`, background: T.surface, color: T.ind, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t("flagc.open")}
            </button>
          );
          if (narrow) {
            return (
              <div key={it.uid} style={base}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {canTick && it.state !== "done" && <input type="checkbox" checked={selected} onChange={() => toggle(it.uid)} style={{ marginTop: 3 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <Chip label={srcLabel(it.source)} tone="ind" />{kindChips(it)}
                    </div>
                    <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600, marginTop: 5 }}>{detailLine(it) || "—"}</div>
                    {extraLine(it) ? <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{extraLine(it)}</div> : null}
                    <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4 }}>{who}</div>
                    <div style={{ fontSize: 11, color: T.t4, marginTop: 2 }} title={fmtWhen(it.at)}>{fmtWhen(it.at)} · {ageText(it.age_h)}</div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
                      {statusCell(it)}{openBtn}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={it.uid} style={{ ...base, display: "grid", gridTemplateColumns: rowCols, gap: 10, alignItems: "start" }}>
              <span style={{ paddingTop: 2 }}>{canTick && it.state !== "done" && <input type="checkbox" checked={selected} onChange={() => toggle(it.uid)} />}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <Chip label={srcLabel(it.source)} tone="ind" />{kindChips(it)}
              </span>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600, overflowWrap: "anywhere" }}>{detailLine(it) || "—"}</div>
                {extraLine(it) ? <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2, overflowWrap: "anywhere" }}>{extraLine(it)}</div> : null}
              </span>
              <span style={{ fontSize: 12, color: T.t2, minWidth: 0, overflowWrap: "anywhere" }}>{who}</span>
              <span title={fmtWhen(it.at)} style={{ fontSize: 11.5, color: T.t3 }}>
                {fmtWhen(it.at)}
                <div style={{ fontSize: 10.5, color: redOld ? T.red : T.t4, fontWeight: redOld ? 700 : 400 }}>{ageText(it.age_h)}</div>
              </span>
              <span>{statusCell(it)}</span>
              <span style={{ textAlign: "right" }}>{openBtn}</span>
            </div>
          );
        })}
      </div>
      {data && data.total_shown > items.length && (
        <div style={{ textAlign: "center", fontSize: 11.5, color: T.t4, marginTop: 10 }}>{t("flagc.more_hidden", { n: data.total_shown - items.length })}</div>
      )}
    </div>
  );
}
