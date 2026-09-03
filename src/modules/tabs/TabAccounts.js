// ── Accounts tab — har khaate ka poora ledger, alag aur milakar ────────
//
// Cash Book saare khaate ek saath dikhata hai; ye tab wo cheez deta hai jo
// wahan nahi thi — KAUNSA khaata, kis din, kitne par khada tha. Do running
// balance saath chalte hain: chune hue khaate ka apna (`balance`) aur sab
// chune hue khaaton ka jod (`combined_balance`).
//
// Dono ek saath dikhane ki wajah asli hai: greenbox bhilai me PNB akela
// −₹9.6 L tak girta hai, par PNB + Cash on Hand milakar ek din bhi minus me
// nahi jaata. Paisa tha, bas galat khaane me likha gaya — bank se rokad
// nikaalne ki entry kabhi bani hi nahi. Ye do alag screen par dekhne se
// kabhi pakad me nahi aata, isliye khaate yahan checkbox se jodte hain.
//
// Balance kabhi chhanni se nahi badalta. Search/type/date filter sirf ye tay
// karte hain ki KAUNSI rows dikhein; `balance` aur `combined_balance` poore
// ledger par bante hain (backend me — GET /finance/accounts/ledger ka header
// comment dekho). Aadha-chhana running balance ek galat number hai jo sahi
// lagta hai, aur ye screen galat number pakadne ke liye hi bani hai.
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../../config/api";
import { T, fmtN } from "../shared/tokens";
import { Panel, PHead, Pill } from "../shared/ui";
import { t } from "../../i18n";

const PAGE = 150;

const inr = (n, dec) => {
  const v = Number(n) || 0;
  const s = dec ? Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : fmtN(Math.round(Math.abs(v)));
  return (v < 0 ? "−₹" : "₹") + s;
};
const shortInr = (n) => {
  const a = Math.abs(Number(n) || 0), s = n < 0 ? "−" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${Math.round(a / 1e3)}k`;
  return `${s}₹${a}`;
};
const dmy = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
// Per-account line colour on the chart. Combined always uses T.blu, so these
// stay clear of blue — a stray blue line would read as the total.
const LINE_C = [T.amb, T.grn, T.pur, T.ind, T.red, T.slt];

// ── Mahine ka closing balance — jod, aur har khaate ki apni line ──────
function BalanceChart({ months, accounts, selected }) {
  if (!months || months.length < 2) {
    return <div style={{ padding: "36px 16px", textAlign: "center", fontSize: 12, color: T.t4 }}>
      {t("acctledger.chart_needs_more")}
    </div>;
  }
  const W = 900, H = 250, L = 76, R = 14, TP = 14, B = 30;
  const series = [{ key: "closing", c: T.blu, w: 2.2, dash: null, label: t("acctledger.combined") }];
  if (selected.length > 1) {
    selected.forEach((id, i) => {
      const a = accounts.find((x) => x.id === id);
      if (a) series.push({ key: id, c: LINE_C[i % LINE_C.length], w: 1.4, dash: "4 3", label: a.name });
    });
  }
  const valOf = (m, key) => (key === "closing" ? m.closing : (m.per_account ? m.per_account[key] : 0)) || 0;

  const vals = [0];
  months.forEach((m) => series.forEach((s) => vals.push(valOf(m, s.key))));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  const x = (i) => L + (months.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (months.length - 1));
  const y = (v) => TP + (hi - v) / (hi - lo) * (H - TP - B);

  const mag = Math.max(Math.abs(hi), Math.abs(lo)) || 1;
  let step = Math.pow(10, Math.floor(Math.log10(mag)));
  if ((hi - lo) / step > 6) step *= 2;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  if (lo < 0 && hi > 0 && !ticks.includes(0)) ticks.push(0);

  const path = (key) => months.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(valOf(m, key)).toFixed(1)}`).join(" ");
  const zeroY = Math.max(TP, Math.min(H - B, y(0)));
  const area = `${path("closing")} L${x(months.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L${x(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;
  const every = Math.ceil(months.length / 9);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "0 16px 8px", fontSize: 11, color: T.t3 }}>
        {series.map((s) => (
          <span key={String(s.key)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 14, height: 3, borderRadius: 2, background: s.c, display: "block", opacity: s.dash ? 0.75 : 1 }} />
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", minWidth: 560, height: "auto" }}
             role="img" aria-label={t("acctledger.month_end_balance")}>
          <defs>
            <linearGradient id="acctArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={T.blu} stopOpacity=".18" />
              <stop offset="1" stopColor={T.blu} stopOpacity=".02" />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? T.t4 : T.b1}
                    strokeWidth={1} strokeDasharray={v === 0 ? undefined : "2 4"} />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fill={T.t4} fontSize={10.5}>{shortInr(v)}</text>
            </g>
          ))}
          <path d={area} fill="url(#acctArea)" />
          {series.map((s) => (
            <path key={String(s.key)} d={path(s.key)} fill="none" stroke={s.c} strokeWidth={s.w}
                  strokeDasharray={s.dash || undefined} strokeLinejoin="round" />
          ))}
          {months.map((m, i) => (i % every === 0 || i === months.length - 1) ? (
            <text key={m.month} x={x(i)} y={H - 8} textAnchor="middle" fill={T.t4} fontSize={10.5}>
              {m.month.slice(2).replace("-", "/")}
            </text>
          ) : null)}
          {months.map((m, i) => (
            <circle key={m.month} cx={x(i)} cy={y(m.closing)} r={2.5} fill={T.blu}>
              <title>{`${m.month} — ${inr(m.closing)} (${t("acctledger.came_in")} ${inr(m.in)}, ${t("acctledger.went_out")} ${inr(m.out)})`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Khaate ki sehat — wo gadbad jo balance dekhkar pata nahi chalti ────
function HealthPanel({ health }) {
  const [open, setOpen] = useState(true);
  if (!health) return null;
  const { transfer_legs: legs, unbacked_spend: un, duplicates: dup, zero_opening: zo, went_negative: neg } = health;
  const items = [];
  if (legs && legs.in_legs > 0 && legs.out_legs === 0) items.push({
    sev: "high", title: t("acctledger.h_one_sided"),
    detail: t("acctledger.h_one_sided_d", { legs: legs.in_legs }),
  });
  if (neg && neg.length) items.push({
    sev: "high", title: t("acctledger.h_negative"),
    detail: neg.map((a) => `${a.name} ${inr(a.min_balance)} (${dmy(a.at)})`).join(" · "),
  });
  if (un && un.count) items.push({
    sev: "med", title: t("acctledger.h_unbacked"),
    detail: t("acctledger.h_unbacked_d", { n: un.count, amt: inr(un.amount) }),
  });
  if (dup && dup.groups && dup.groups.length) items.push({
    sev: "med", title: t("acctledger.h_dups"),
    detail: t("acctledger.h_dups_d", { n: dup.groups.length, amt: inr(dup.extra_in + dup.extra_out) }),
  });
  if (zo && zo.length) items.push({
    sev: "low", title: t("acctledger.h_zero_opening"),
    detail: `${zo.map((a) => a.name).join(", ")} — ${t("acctledger.h_zero_opening_d")}`,
  });

  const C = { high: { c: T.red, bg: T.redL }, med: { c: T.amb, bg: T.ambL }, low: { c: T.slt, bg: T.sltL } };
  return (
    <Panel style={{ marginBottom: 10 }}>
      <PHead title={`${t("acctledger.health_title")}${items.length ? ` (${items.length})` : ""}`}
        action={items.length ? (
          <button onClick={() => setOpen(!open)} style={{ border: "none", background: "none", color: T.blu, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
            {open ? t("acctledger.hide") : t("acctledger.show")}
          </button>
        ) : null} />
      {!items.length ? (
        <div style={{ padding: "13px 16px", fontSize: 12.5, color: T.grn, display: "flex", alignItems: "center", gap: 7 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.4} strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          {t("acctledger.health_clean")}
        </div>
      ) : open && (
        <div>
          {items.map((it, i) => (
            <div key={it.title} style={{ display: "flex", gap: 11, padding: "11px 16px", borderTop: i ? `1px solid ${T.b1}` : "none" }}>
              <span style={{ width: 3, borderRadius: 2, background: C[it.sev].c, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 2 }}>{it.title}</div>
                <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.5 }}>{it.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── Ek row ki saari jaankari ───────────────────────────────────────────
const DETAIL_FIELDS = [
  ["id", "acctledger.f_txn_id"], ["account_name", "acctledger.account"],
  ["party", "common.party"], ["project", "common.project"],
  ["head", "acctledger.f_head"], ["description", "common.description"],
  ["note", "common.note"], ["reference_no", "acctledger.f_reference"],
  ["challan_no", "acctledger.f_challan"], ["mop", "common.mode"],
  ["wallet_category", "acctledger.f_wallet_cat"], ["via_staff", "acctledger.f_via_staff"],
  ["status", "common.status"], ["approval_status", "acctledger.f_approval"],
  ["created_by_name", "acctledger.f_created_by"], ["approved_by_name", "acctledger.f_approved_by"],
  ["grn_id", "acctledger.f_grn"], ["settlement_ref", "acctledger.f_settlement"],
];
function RowDetail({ row, showCombined }) {
  const shown = DETAIL_FIELDS.filter(([k]) => row[k] !== null && row[k] !== undefined && row[k] !== "");
  return (
    <div style={{ background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, padding: "11px 16px 14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "10px 22px" }}>
        {shown.map(([k, key]) => (
          <div key={k} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px" }}>{t(key)}</div>
            <div style={{ fontSize: 12.5, color: T.t1, wordBreak: "break-word", marginTop: 1 }}>{String(row[k])}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px" }}>{t("acctledger.f_bal_after")}</div>
          <div style={{ fontSize: 12.5, color: T.t1, marginTop: 1 }}>{inr(row.balance, true)}</div>
        </div>
        {showCombined && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px" }}>{t("acctledger.f_combined_after")}</div>
            <div style={{ fontSize: 12.5, color: T.t1, marginTop: 1 }}>{inr(row.combined_balance, true)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TabAccounts() {
  const [meta, setMeta] = useState(null);        // accounts + months + totals
  const [rows, setRows] = useState([]);
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);
  const [sel, setSel] = useState(null);          // null = sab (pehli baar)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");              // debounced
  const [type, setType] = useState("");
  const [dir, setDir] = useState("");
  const [big, setBig] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState(null);
  const qTimer = useRef(null);

  useEffect(() => {
    qTimer.current = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(qTimer.current);
  }, [q]);

  const idsKey = sel ? sel.slice().sort((a, b) => a - b).join(",") : "";

  const load = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      const p = new URLSearchParams();
      if (idsKey) p.set("ids", idsKey);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      if (dq) p.set("q", dq);
      if (type) p.set("type", type);
      if (dir) p.set("dir", dir);
      if (big) p.set("min", "100000");
      p.set("limit", "1000");
      const r = await api.get(`/finance/accounts/ledger?${p.toString()}`);
      if (!r.success) throw new Error(r.message || t("acctledger.load_failed"));
      setMeta(r.data);
      setRows(r.data.rows || []);
      setShown(PAGE);
    } catch (e) {
      setErr(e.message || t("acctledger.load_failed"));
    } finally {
      setBusy(false);
    }
  }, [idsKey, from, to, dq, type, dir, big]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let dead = false;
    api.get("/finance/accounts/health")
      .then((r) => { if (!dead && r.success) setHealth(r.data); })
      .catch(() => { /* sehat panel na aaye to ledger phir bhi chalta rahe */ });
    return () => { dead = true; };
  }, []);

  // Card list POORI hoti hai, chune hue khaaton ki nahi. /ledger sirf chune
  // hue khaate lauta ta hai, to usse card banate to ek khaata hatane par uska
  // card hi gayab ho jaata aur wapas chunne ka koi raasta nahi bachta.
  // /health hamesha sab khaate deta hai, isliye selection ki duniya wahi hai.
  const allAcc = (health && health.accounts) || (meta ? meta.accounts : []);
  const allIds = useMemo(() => allAcc.map((a) => a.id).join(","), [allAcc]);
  const accounts = meta ? meta.accounts : [];
  const selected = useMemo(
    () => (sel && sel.length ? sel : (allIds ? allIds.split(",").map(Number) : [])),
    [sel, allIds]);
  const multi = selected.length > 1;
  const types = useMemo(() => {
    const s = new Set(rows.map((r) => r.type));
    return Array.from(s).sort();
  }, [rows]);

  // Functional setState — do card jaldi-jaldi daboge to doosra click pehle ke
  // baad ki state par lagega, purani `sel` par nahi.
  const toggle = (id) => setSel((cur) => {
    const base = cur && cur.length ? cur : (allIds ? allIds.split(",").map(Number) : []);
    const next = base.includes(id) ? base.filter((x) => x !== id) : base.concat([id]);
    return next.length ? next : null;
  });

  const exportCsv = () => {
    const head = ["date", "account", "type", "party", "project", "in", "out", "balance",
      "combined_balance", "description", "note", "reference_no", "mop", "status", "created_by"];
    const cell = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/\r?\n/g, " ");
      return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.slice().reverse().map((r) => [r.date, r.account_name, r.type, r.party, r.project,
      r.movement > 0 ? r.movement : "", r.movement < 0 ? -r.movement : "", r.balance, r.combined_balance,
      r.description, r.note, r.reference_no, r.mop, r.status, r.created_by_name].map(cell).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `account-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const GRID = multi
    ? "74px 108px 118px 1.5fr 110px 110px 118px 122px"
    : "74px 118px 1.7fr 118px 118px 130px";
  const heads = multi
    ? [t("common.date"), t("acctledger.account"), t("acctledger.type"), t("acctledger.particulars"),
       t("acctledger.came_in"), t("acctledger.went_out"), t("common.balance"), t("acctledger.combined")]
    : [t("common.date"), t("acctledger.type"), t("acctledger.particulars"),
       t("acctledger.came_in"), t("acctledger.went_out"), t("common.balance")];

  const pooled = accounts.filter((a) => selected.includes(a.id));
  const sumSel = (k) => pooled.reduce((s, a) => s + (Number(a[k]) || 0), 0);
  const worst = pooled.filter((a) => a.min_balance < 0)
    .sort((a, b) => a.min_balance - b.min_balance)[0];

  const stats = meta ? [
    { l: t("common.opening_balance"), v: inr(meta.totals.opening), c: T.slt },
    { l: t("acctledger.came_in"), v: inr(sumSel("total_in")), c: T.grn },
    { l: t("acctledger.went_out"), v: inr(sumSel("total_out")), c: T.red },
    { l: t("acctledger.today_balance"), v: inr(meta.totals.closing), c: meta.totals.closing < 0 ? T.red : T.blu },
    {
      l: multi ? t("acctledger.lowest_combined") : t("acctledger.lowest"),
      v: multi ? inr(meta.totals.min_combined) : inr(worst ? worst.min_balance : 0),
      note: multi
        ? (meta.totals.min_combined_at ? dmy(meta.totals.min_combined_at) : t("acctledger.never_negative"))
        : (worst ? dmy(worst.min_balance_at) : t("acctledger.never_negative")),
      c: (multi ? meta.totals.min_combined : (worst ? worst.min_balance : 0)) < 0 ? T.red : T.grn,
    },
  ] : [];

  const inputS = { fontSize: 12, padding: "6px 9px", border: `1px solid ${T.b1}`, borderRadius: 6, background: T.surface, color: T.t1 };
  const chipS = (on) => ({
    fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
    border: `1px solid ${on ? T.blu : T.b1}`, background: on ? T.blu : T.surface, color: on ? "#fff" : T.t2,
  });

  return (
    // Block, flex-column NAHI. Parent flex column hai; agar ye bhi flex column
    // hota to upar ke chaar panel flex item ban jaate aur chhoti screen par
    // apni content-height se neeche sikud jaate — cards, sehat aur graph teeno
    // ek-ek line me dab gaye the. `flex:1` phir bhi lagta hai (wo parent ke
    // liye hai), to scroll isi ke andar rehta hai.
    <div style={{ flex: 1, overflow: "auto", paddingBottom: 20 }}>
      {/* Khaate chuno — ek se zyada chuno to wo ek hi timeline par chalte hain */}
      <Panel style={{ marginBottom: 10 }}>
        <PHead title={t("finance.accounts")} action={
          <span style={{ fontSize: 11.5, color: T.t3 }}>
            {t("acctledger.chosen_n", { n: selected.length, total: allAcc.length })}
            {allAcc.length > 1 && (
              <button onClick={() => setSel(null)} style={{ marginLeft: 9, border: "none", background: "none", color: T.blu, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                {t("acctledger.select_all")}
              </button>
            )}
          </span>} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(212px,1fr))", gap: 8, padding: 12 }}>
          {allAcc.map((a) => {
            const on = selected.includes(a.id);
            return (
              <button key={a.id} onClick={() => toggle(a.id)} aria-pressed={on}
                style={{
                  textAlign: "left", cursor: "pointer", padding: "11px 13px", borderRadius: 8,
                  background: on ? T.surface : T.surfaceB, color: "inherit", font: "inherit",
                  border: `1px solid ${on ? T.blu : T.b1}`,
                  boxShadow: on ? `inset 3px 0 0 ${multi ? LINE_C[selected.indexOf(a.id) % LINE_C.length] : T.blu}` : "none",
                  opacity: on ? 1 : 0.62,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  {a.is_primary && <Pill label={t("acctledger.primary")} c={T.blu} bg={T.bluL} />}
                </div>
                <div style={{ fontSize: 10.5, color: T.t4 }}>
                  {a.type === "cash" ? t("acctledger.cash_box") : (a.bank_name || t("acctledger.bank"))}
                  {a.account_number ? ` · ${a.account_number}` : ""} · {a.entries} {t("acctledger.entries_short")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: a.closing < 0 ? T.red : T.t1, marginTop: 7, letterSpacing: "-.3px" }}>{inr(a.closing)}</div>
                <div style={{ fontSize: 10.5, color: a.min_balance < 0 ? T.red : T.t4, marginTop: 1 }}>
                  {a.min_balance < 0
                    ? t("acctledger.dipped_to", { amt: inr(a.min_balance), date: dmy(a.min_balance_at) })
                    : (a.idle_days != null && a.idle_days >= 90
                      ? t("acctledger.idle_days", { n: a.idle_days })
                      : t("acctledger.never_negative"))}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <HealthPanel health={health} />

      {/* Graph */}
      <Panel style={{ marginBottom: 10 }}>
        <PHead title={t("acctledger.month_end_balance")} action={
          meta && <span style={{ fontSize: 11.5, color: T.t3 }}>{t("acctledger.months_n", { n: meta.months.length })}</span>} />
        <div style={{ paddingTop: 12 }}>
          {meta && <BalanceChart months={meta.months} accounts={accounts} selected={selected} />}
        </div>
      </Panel>

      {/* Stat strip */}
      {!!stats.length && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))", gap: 8, marginBottom: 10 }}>
          {stats.map((s) => (
            <div key={s.l} style={{ padding: "12px 14px", background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, borderTop: `3px solid ${s.c}` }}>
              <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: T.t1, lineHeight: 1, letterSpacing: "-.4px" }}>{s.v}</div>
              {s.note && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{s.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Ledger */}
      <Panel>
        <PHead title={t("acctledger.full_ledger")} action={
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 11.5, color: T.t3 }}>
              {meta ? t("acctledger.entries_n", { n: meta.filtered.count }) : ""}
            </span>
            <button onClick={exportCsv} disabled={!rows.length}
              style={{ border: `1px solid ${T.b2}`, background: T.surface, color: rows.length ? T.t2 : T.t4, fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: rows.length ? "pointer" : "default" }}>
              {t("acctledger.export_csv")}
            </button>
            <button onClick={load} style={{ border: "none", background: "none", color: T.blu, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
              {t("common.refresh")}
            </button>
          </div>} />

        {/* Chhanni */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("acctledger.search_ph")}
            aria-label={t("acctledger.search_ph")} style={{ ...inputS, flex: "1 1 230px", minWidth: 170 }} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("acctledger.from_date")} style={inputS} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("acctledger.to_date")} style={inputS} />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label={t("acctledger.type")} style={inputS}>
            <option value="">{t("acctledger.all_types")}</option>
            {types.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
          </select>
          <button onClick={() => setDir(dir === "in" ? "" : "in")} style={chipS(dir === "in")}>{t("acctledger.only_in")}</button>
          <button onClick={() => setDir(dir === "out" ? "" : "out")} style={chipS(dir === "out")}>{t("acctledger.only_out")}</button>
          <button onClick={() => setBig(!big)} style={chipS(big)}>{t("acctledger.big_only")}</button>
        </div>

        <div style={{ padding: "7px 16px", fontSize: 11, color: T.t4, borderBottom: `1px solid ${T.b1}` }}>
          {t("acctledger.row_hint")}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: multi ? 900 : 720 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, padding: "7px 16px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}` }}>
              {heads.map((h, i) => (
                <span key={h} style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".6px", textAlign: i >= (multi ? 4 : 3) ? "right" : "left" }}>{h}</span>
              ))}
            </div>

            {err && <div style={{ padding: "16px", fontSize: 12.5, color: T.red }}>{err}</div>}
            {busy && !rows.length && <div style={{ padding: "34px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("common.loading")}</div>}
            {!busy && !rows.length && !err && <div style={{ padding: "34px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("acctledger.no_rows")}</div>}

            {rows.slice(0, shown).map((r) => {
              const isOpen = openId === r.id;
              const sub = [r.description, (r.note && r.note !== r.description) ? r.note : null, r.project].filter(Boolean).join(" · ");
              return (
                <div key={r.id}>
                  <div onClick={() => setOpenId(isOpen ? null : r.id)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenId(isOpen ? null : r.id); } }}
                    style={{
                      display: "grid", gridTemplateColumns: GRID, padding: "8px 16px", cursor: "pointer",
                      borderBottom: `1px solid ${T.b1}`, background: isOpen ? T.surfaceB : T.surface,
                      boxShadow: Math.abs(r.movement) >= 100000 ? `inset 3px 0 0 ${T.amb}` : "none",
                      alignItems: "start",
                    }}>
                    <span style={{ fontSize: 11.5, color: T.t3, whiteSpace: "nowrap" }}>{dmy(r.date)}</span>
                    {multi && <span style={{ fontSize: 10.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }}>{r.account_name}</span>}
                    <span><Pill label={r.type.replace(/_/g, " ")}
                      c={r.movement > 0 ? T.grn : T.red} bg={r.movement > 0 ? T.grnL : T.redL} /></span>
                    <span style={{ minWidth: 0, paddingRight: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.party || "—"}</span>
                      {r.is_staff_party ? <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: T.pur }}>{" "}{t("acctledger.staff")}</span> : null}
                      {sub && <span style={{ display: "block", fontSize: 11, color: T.t4, lineHeight: 1.4, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.grn, textAlign: "right", whiteSpace: "nowrap" }}>{r.movement > 0 ? inr(r.movement) : ""}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.red, textAlign: "right", whiteSpace: "nowrap" }}>{r.movement < 0 ? inr(-r.movement) : ""}</span>
                    <span style={{ fontSize: 12, color: r.balance < 0 ? T.red : T.t2, fontWeight: r.balance < 0 ? 700 : 500, textAlign: "right", whiteSpace: "nowrap" }}>{inr(r.balance)}</span>
                    {multi && <span style={{ fontSize: 12.5, color: r.combined_balance < 0 ? T.red : T.t1, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{inr(r.combined_balance)}</span>}
                  </div>
                  {isOpen && <RowDetail row={r} showCombined={multi} />}
                </div>
              );
            })}
          </div>
        </div>

        {rows.length > shown && (
          <button onClick={() => setShown(shown + PAGE)}
            style={{ display: "block", width: "100%", padding: "11px", border: "none", borderTop: `1px solid ${T.b1}`, background: T.surface, color: T.blu, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            {t("acctledger.load_more", { n: Math.min(PAGE, rows.length - shown), left: rows.length - shown })}
          </button>
        )}
        {meta && meta.has_more && rows.length <= shown && (
          <div style={{ padding: "10px 16px", fontSize: 11.5, color: T.amb, background: T.ambL, borderTop: `1px solid ${T.b1}` }}>
            {t("acctledger.capped")}
          </div>
        )}
      </Panel>
    </div>
  );
}
