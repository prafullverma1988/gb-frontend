// ════════════════════════════════════════════════════════════════
// CRM Packages — web ke chhote helper (14 Nov 2026, Prafull)
//
// Server: gb-backend routes/sales-packages.js. Content ka dhaancha aur path
// (glance.<k> · rate.<g>.<r> · sec.<s>.<b>.<row> …) utils/salesPackage.js se
// bilkul wahi — resolveItem / resolveContainer yahan usi ki nakal hai, taaki
// phone par haath ka edit aur AI ka op ek hi path bolein.
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import api, { API_BASE, getToken } from "../../config/api";
import { getLang, t } from "../../i18n";

export const BASE = "/sales-packages";
// AI wale sync route (brief / ask / compare) 5-20 s lete hain — default 15 s kam hai.
export const AI_TIMEOUT = 90000;

export const inr = (n) => (n == null || n === "" || !Number.isFinite(Number(n)) ? "" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
export const fmtDT = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};
export const fmtD = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
export const clone = (x) => JSON.parse(JSON.stringify(x));

// ── Document ke token ({company} {package} {validity_days} {rate_full}) ──
export function scopeRate(content, scopeKey) {
  const sc = (content && content.scopes) || [];
  const s = sc.find((x) => x.key === scopeKey) || sc.find((x) => x.key === "full") || sc[0];
  return s ? s.rate : null;
}
export function docTokens(content, letterhead) {
  const full = scopeRate(content, "full");
  return {
    company: (letterhead && letterhead.display_name) || "",
    package: (content && content.meta && content.meta.package_name) || "",
    validity_days: String((content && content.meta && content.meta.validity_days) || 60),
    rate_full: full != null ? inr(full) : "",
  };
}
export const fillTokens = (s, tok) => String(s == null ? "" : s).replace(/\{(company|package|validity_days|rate_full)\}/g, (m, k) => (tok[k] != null && tok[k] !== "" ? tok[k] : m));

// ── Key (container me unique) — server ke keyer jaisa ──
export const slug = (s) => {
  const x = String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return x || "k";
};
export function uniqueKey(list, wanted) {
  const used = new Set((list || []).map((x) => x && x.key));
  const base = slug(wanted);
  let k = base, i = 2;
  while (used.has(k)) k = base + "_" + (i++);
  return k;
}

// ── Path → jagah (server ka resolveItem / resolveContainer) ──
const findKey = (list, k) => (Array.isArray(list) ? list.findIndex((x) => x && x.key === k) : -1);
export function resolveItem(c, path) {
  const [h, ...r] = String(path || "").split(".").filter(Boolean);
  const pick = (list, k, kind, extra) => { const i = findKey(list, k); return i < 0 ? null : { list, index: i, item: list[i], kind, ...extra }; };
  if (!c) return null;
  if (h === "meta" && r.length === 0) return { item: c.meta, kind: "meta" };
  if (h === "meta" && r[0] === "cover" && r.length === 2) return pick(c.meta.cover, r[1], "text");
  if (h === "acceptance" && r.length === 0) return { item: c.acceptance, kind: "acceptance" };
  if (h === "basis_title" && r.length === 0) return { item: c.rate_schedule, kind: "basis_title" };
  if (h === "scopes" && r.length === 0) return { item: c, kind: "scopes" };
  if (h === "scopes" && r.length === 1) return pick(c.scopes, r[0], "scope");
  if (h === "glance" && r.length === 1) return pick(c.glance, r[0], "kv");
  if (h === "rate" && r.length === 1) return pick(c.rate_schedule.groups, r[0], "rate_group");
  if (h === "rate" && r.length === 2) { const g = c.rate_schedule.groups.find((x) => x.key === r[0]); return g ? pick(g.rows, r[1], "rate_row", { group: g }) : null; }
  if (h === "rate_notes" && r.length === 1) return pick(c.rate_schedule.notes, r[0], "text");
  if (h === "rate_basis" && r.length === 1) return pick(c.rate_schedule.basis, r[0], "text");
  if (h === "sec" && r.length === 1) return pick(c.sections, r[0], "section");
  if (h === "sec" && r.length >= 2) {
    const s = c.sections.find((x) => x.key === r[0]); if (!s) return null;
    if (r.length === 2) return pick(s.blocks, r[1], "block", { section: s });
    const b = s.blocks.find((x) => x.key === r[1]); if (!b) return null;
    if (r.length === 3) {
      if (b.type === "kv") return pick(b.rows, r[2], "kv", { block: b, section: s });
      if (b.type === "table") return pick(b.rows, r[2], "table_row", { block: b, section: s });
      if (b.type === "bullets") return pick(b.items, r[2], "text", { block: b, section: s });
    }
  }
  return null;
}
export function resolveContainer(c, path) {
  const [h, ...r] = String(path || "").split(".").filter(Boolean);
  if (!c) return null;
  if (h === "glance" && !r.length) return { list: c.glance, kind: "kv" };
  if (h === "scopes" && !r.length) return { list: c.scopes, kind: "scope" };
  if (h === "meta" && r[0] === "cover" && r.length === 1) return { list: c.meta.cover, kind: "text" };
  if (h === "rate" && !r.length) return { list: c.rate_schedule.groups, kind: "rate_group" };
  if (h === "rate" && r.length === 1) { const g = c.rate_schedule.groups.find((x) => x.key === r[0]); return g ? { list: g.rows, kind: "rate_row", group: g } : null; }
  if (h === "rate_notes" && !r.length) return { list: c.rate_schedule.notes, kind: "text" };
  if (h === "rate_basis" && !r.length) return { list: c.rate_schedule.basis, kind: "text" };
  if (h === "sec" && !r.length) return { list: c.sections, kind: "section" };
  if (h === "sec" && r.length === 1) { const s = c.sections.find((x) => x.key === r[0]); return s ? { list: s.blocks, kind: "block", section: s } : null; }
  if (h === "sec" && r.length === 2) {
    const s = c.sections.find((x) => x.key === r[0]); const b = s && s.blocks.find((x) => x.key === r[1]); if (!b) return null;
    if (b.type === "kv") return { list: b.rows, kind: "kv", block: b, section: s };
    if (b.type === "table") return { list: b.rows, kind: "table_row", block: b, section: s };
    if (b.type === "bullets") return { list: b.items, kind: "text", block: b, section: s };
  }
  return null;
}

// ── Document ki apni chhapi likhawat ──
// Ye PDF (utils/salesPackageDoc.js) ke fixed shabd hain — client ka document
// hamesha English me chhapta hai, isliye web preview bhi wahi dikhata hai jo
// client ko jaata hai. Ye UI text nahi, document ka hissa hai (t() nahi).
// Compare / AI op ke "area" naam bhi server English me hi deta hai.
export const DOC_EN = {
  glance: "Package at a Glance",
  rate_schedule: "RATE SCHEDULE",
  acceptance: "ACCEPTANCE",
  pkg_word: "Package",
  per_sqft: "per sq.ft.",
  sno: "S.No.",
  description: "Description",
  unit: "Unit",
  rate: "Rate (₹)",
  qty: "Qty",
  amount: "Amount (₹)",
  total: "TOTAL (inclusive of GST)",
  note: "Note:",
  quotation_no: "Quotation No.",
  date: "Date",
  client_name: "Client Name",
  contact: "Contact No.",
  site: "Site Address",
  plot: "Plot Area",
  builtup: "Built-up Area",
  valid_till: "Valid Till",
  days_from: "days from date",
  sqft: "sq.ft.",
  sign_name: "Name:",
  sign_date: "Date:",
  sign_place: "Place:",
  signatory: "Authorised Signatory",
  seal: "Seal:",
  mob: "Mob.",
  gstin: "GSTIN:",
  area_doc: "Document",
  area_rate: "Package rate",
  area_rs: "Rate Schedule",
  area_acc: "Acceptance",
};

// AI op / compare row ka path → kis hisse ka hai (section › heading), dikhane ke liye
export function areaOfPath(c, path) {
  if (!c) return "";
  const [h, a, b] = String(path || "").split(".");
  if (h === "glance") return DOC_EN.glance;
  if (h === "scopes") return DOC_EN.area_rate;
  if (h === "meta") return DOC_EN.area_doc;
  if (h === "acceptance") return DOC_EN.area_acc;
  if (h === "rate_notes" || h === "rate_basis") return DOC_EN.area_rs;
  if (h === "rate") { const g = c.rate_schedule.groups.find((x) => x.key === a); return (g && g.title) || DOC_EN.area_rs; }
  if (h === "sec") {
    const s = c.sections.find((x) => x.key === a); if (!s) return "";
    const bl = b && s.blocks.find((x) => x.key === b);
    return s.title + (bl && bl.heading ? " › " + bl.heading : "");
  }
  return "";
}

// Op ka purana / naya (object ho to uske kaam ke field) — ek line me
export function showVal(v) {
  if (v == null || v === "") return "";
  if (typeof v !== "object") return String(v);
  if (v.cells && typeof v.cells === "object") return [v.group, ...Object.values(v.cells)].filter((x) => x != null && x !== "").join(" · ");
  const parts = ["title", "heading", "label", "description", "value", "text", "unit", "rate"].map((k) => v[k]).filter((x) => x != null && x !== "");
  if (parts.length) return parts.join(" · ");
  return JSON.stringify(v);
}

// ── PDF (route ko JWT chahiye) → naya tab ──
export async function openPkgPdf(id, versionId) {
  // Popup blocker: click ke andar hi khaali tab kholo, phir blob daalo.
  let w = null;
  try { w = window.open("", "_blank"); } catch (_) { w = null; }
  try {
    const res = await fetch(`${API_BASE}${BASE}/${id}/pdf${versionId ? "?version=" + versionId : ""}`, {
      headers: { ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}), "X-Lang": getLang() },
    });
    if (!res.ok) {
      let msg = "";
      try { msg = (await res.json()).message || ""; } catch (_) { msg = ""; }
      throw new Error(msg || String(res.status));
    }
    const url = URL.createObjectURL(await res.blob());
    if (w && !w.closed) w.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (e) {
    if (w && !w.closed) { try { w.close(); } catch (_) {} }
    throw e;
  }
}

// WhatsApp — system khud nahi bhejta, wa.me khulta hai
export const waUrl = (text, phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const to = digits.length === 10 ? "91" + digits : digits.length >= 11 ? digits : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text || "")}`;
};

export async function copyText(s) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(s); return true; }
  } catch (_) { /* neeche wala tareeka */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = s; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand && document.execCommand("copy");
    ta.remove();
    return !!ok;
  } catch (_) { return false; }
}

export function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || "").replace(/^data:[^,]*,/, ""));
    fr.onerror = () => reject(fr.error || new Error("read"));
    fr.readAsDataURL(file);
  });
}

// ── Lamba AI kaam — GET /ai/jobs/:jid har 2.5 s, jab tak status 'running' ──
export function useJobPoll(jobId, interval = 2500) {
  const [job, setJob] = useState(null);
  const [fail, setFail] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const t0 = useRef(0);
  useEffect(() => {
    setJob(null); setFail(""); setElapsed(0);
    if (!jobId) return undefined;
    let alive = true, timer = null, misses = 0;
    t0.current = Date.now();
    const clock = setInterval(() => { if (alive) setElapsed(Math.round((Date.now() - t0.current) / 1000)); }, 1000);
    const tick = async () => {
      const r = await api.get(`${BASE}/ai/jobs/${jobId}`);
      if (!alive) return;
      if (r && r.success && r.data) {
        misses = 0;
        setJob(r.data);
        if (r.data.status === "running") timer = setTimeout(tick, interval);
        else clearInterval(clock);
        return;
      }
      // Network ki ek-do chook par ruko mat — kaam server par chal raha hai
      if (r && r._networkError && misses < 5) { misses++; timer = setTimeout(tick, interval * 2); return; }
      clearInterval(clock);
      setFail((r && r.message) || t("sales_pkg_ui.ai_failed"));
    };
    tick();
    return () => { alive = false; clearTimeout(timer); clearInterval(clock); };
  }, [jobId, interval]);
  return { job, fail, elapsed, setJob };
}
