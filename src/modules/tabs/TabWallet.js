// ════════════════════════════════════════════════════════════════
// TabWallet — "Mera wallet" web par (Finance → Wallet)
// ════════════════════════════════════════════════════════════════
// Mobile ka wallet kharch form (sanchalan-app WalletPayFormScreen) PC ke
// layout me: material ki lines table me, keyboard se (Enter = agli khaana /
// nayi line), bill ki photo file se. Wahi backend (POST /wallets/expense) —
// hisaab ek hi: usi staff ka wallet, wahi approval, wahi photo-niyam.
//
// Baaye poora form, daaye wallet ka haal + meri taaza entries. Kuch bhi
// Finance ke khaate se seedha nahi jaata — sab login kiye user ke wallet se.
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import PickSelect from "../../components/PickSelect";
import api, { getUser } from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { todayISO } from "../../utils/today";
import { canEntry } from "../../utils/perms";
import { cld } from "../../utils/cloudinary";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
const fmtRs = (n) => "₹" + (Math.round(Number(n) || 0)).toLocaleString("en-IN");
const fmtDate = (d) => { if (!d) return ""; const x = new Date(d); return isNaN(x) ? String(d).slice(0, 10) : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); };
const uid = () => (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "k" + Date.now() + Math.random().toString(16).slice(2));
// Line ka total: parchi ka pakka amount, warna qty × rate (mobile walletSlip.lineAmount)
const lineAmount = (l) => (l && l.amt != null ? Number(l.amt) : num(l && l.qty) * num(l && l.rate));
const OTHER_RE = /^(other|others|misc|miscellaneous)(\s+(material|materials|item|items))?$/i;
const CITY_KINDS = ["site_exp"];
const CAT_LABEL = () => ({
  site_exp: t("wallet_web.cat_site_exp"), party_pay: t("wallet_web.cat_party_pay"), salary: t("wallet_web.cat_salary"),
  petrol: t("wallet_web.cat_petrol"), fuel: t("wallet_web.cat_fuel"), service: t("wallet_web.cat_service"), generic: t("wallet_web.cat_generic"),
});
const STATUS = () => ({
  pending: { l: t("wallet_web.st_pending"), c: T.amb, bg: T.ambL },
  clarification_needed: { l: t("wallet_web.st_clar"), c: T.pur, bg: T.purL },
  approved: { l: t("wallet_web.st_approved"), c: T.grn, bg: T.grnL },
  auto: { l: t("wallet_web.st_approved"), c: T.grn, bg: T.grnL },
  rejected: { l: t("wallet_web.st_rejected"), c: T.red, bg: T.redL },
});

// ── Bill ki photo: 1600 px tak chhoti karke Cloudinary (mobile PHOTO-02 jaisa) ──
async function shrinkImage(file) {
  if (!/^image\//.test(file.type) || file.size < 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (s >= 1) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    return blob || file;
  } catch (_) { return file; }
}
async function uploadPhoto(file) {
  const fd = new FormData();
  fd.append("file", await shrinkImage(file));
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/wallet");
  const r = await fetch("https://api.cloudinary.com/v1_1/dd632nqfm/image/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.secure_url) throw new Error((d.error && d.error.message) || t("wallet_web.photo_upload_fail"));
  return d.secure_url;
}

const inp = (extra = {}) => ({
  width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.b2}`, background: T.surface,
  fontSize: 13, color: T.t1, outline: "none", fontFamily: "inherit", boxSizing: "border-box", ...extra,
});
const Label = ({ children, req }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
    {children}{req && <span style={{ color: T.red }}> *</span>}
  </div>
);

export default function TabWallet() {
  const user = getUser();
  const cEntry = canEntry("Finance");
  const today = todayISO();

  // ── Wallet ka haal + meri entries (daaya panel) ───────────────
  const [wallet, setWallet] = useState(null);
  const [wLoading, setWLoading] = useState(true);
  const loadWallet = useCallback(() => {
    setWLoading(true);
    api.get("/wallets/my?include_settle=1").then((r) => { if (r && r.success) setWallet(r.data); }).catch(() => {}).finally(() => setWLoading(false));
  }, []);
  useEffect(() => { loadWallet(); }, [loadWallet]);

  // ── Form ─────────────────────────────────────────────────────
  const [kind, setKind] = useState("site_exp");       // site_exp | party_pay
  const [sub, setSub] = useState("material");          // site_exp: quick | material — PC par material hi asli kaam
  const isParty = kind === "party_pay";
  const isMaterial = !isParty && sub === "material";
  const isQuick = !isParty && sub === "quick";
  const [date, setDate] = useState(today);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [cities, setCities] = useState([]);
  const [cityChoice, setCityChoice] = useState("");
  const [heads, setHeads] = useState([]);
  const [headId, setHeadId] = useState("");
  const [party, setParty] = useState(null);            // library se chuni party
  const [partyText, setPartyText] = useState("");      // ya seedha naam
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [override, setOverride] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [slip, setSlip] = useState({ busy: false, url: null, result: null, err: null });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);                // {ok, text}
  const [materials, setMaterials] = useState([]);
  const [photoSettings, setPhotoSettings] = useState(null);
  const idemKey = useRef(uid());

  useEffect(() => {
    api.get("/projects").then((r) => { if (r && r.success) setProjects((r.data || []).filter((p) => p && p.id)); }).catch(() => {});
    api.get("/library/expense-heads").then((r) => { if (r && r.success && Array.isArray(r.data)) setHeads(r.data); }).catch(() => {});
    api.get("/library/materials").then((r) => { if (r && r.success && Array.isArray(r.data)) setMaterials(r.data); }).catch(() => {});
    api.get("/settings/photo").then((r) => { if (r && r.success && r.data && r.data.settings) setPhotoSettings(r.data.settings); }).catch(() => {});
  }, []);
  // Company office ka kharcha kis city ka (project na ho to) — mobile jaisa
  const wantsCity = !projectId && !isParty && CITY_KINDS.includes(kind);
  useEffect(() => {
    if (!wantsCity) return;
    let alive = true;
    api.get("/library/cities/my-default").then((r) => {
      if (!alive || !r || !r.success || !r.data) return;
      setCities(r.data.cities || []);
      if (r.data.default_city_id) setCityChoice((cur) => cur || String(r.data.default_city_id));
    }).catch(() => {});
    return () => { alive = false; };
  }, [wantsCity]);
  const showCity = wantsCity && cities.length > 0;

  // Photo-niyam: Settings → Photo Settings → "Paisa" (wahi key jo server dekhta hai)
  const photoKey = isParty
    ? (party && Number(party.is_staff) === 1 && party.user_id != null ? "wallet_transfer" : "wallet_party_pay")
    : "wallet_site_exp";
  const pol = { mode: "optional", source: "both", ...((photoSettings && photoSettings[photoKey]) || {}) };
  const photoRequired = pol.mode === "required";
  const photoOff = pol.mode === "off";
  // "Sirf camera" PC par pura nahi ho sakta — file hi chadhti hai. Niyam todte
  // nahi: aisi category me PC se photo nahi lagti, phone se lagegi.
  const cameraOnly = pol.source === "camera";

  const linesTotal = lines.reduce((s, l) => s + lineAmount(l), 0);
  const slipActive = isMaterial && lines.some((l) => l.slip);
  const slipTotal = slip.result && slip.result.totals ? slip.result.totals.final_total : null;

  // ── Lines ────────────────────────────────────────────────────
  const refs = useRef({});                 // _k → {mat, qty, rate}
  const reg = (k, f) => (el) => { (refs.current[k] ||= {})[f] = el; };
  const focus = (k, f) => setTimeout(() => { const e = refs.current[k] && refs.current[k][f]; if (e) { e.focus(); if (e.select) e.select(); } }, 0);
  const newLine = () => ({ _k: uid(), material_id: null, item_name: "", unit: "Nos", qty: "1", rate: "", amt: null, text: "" });
  const addLine = () => { const l = newLine(); setLines((p) => [...p, l]); focus(l._k, "mat"); };
  const patch = (k, p) => setLines((prev) => prev.map((l) => (l._k === k ? { ...l, ...p } : l)));
  const delLine = (k) => setLines((prev) => prev.filter((l) => l._k !== k));
  const pickMat = (k, m) => {
    setLines((prev) => prev.map((l) => {
      if (l._k !== k) return l;
      const rate = l.rate || String(m.last_rate || m.base_rate || "");
      return { ...l, material_id: m.id, item_name: m.name, unit: m.unit || "Nos", rate, text: m.name,
        slip: l.slip ? { ...l.slip, checked: true, confidence: "user" } : l.slip };
    }));
    focus(k, "qty");
  };
  // Qty badli aur parchi ka amount pakka ho to rate usi se (mobile qtyPatch)
  const qtyPatch = (l, v) => { const q = parseFloat(v); return l.amt != null && q > 0 ? { qty: v, rate: String(r4(Number(l.amt) / q)) } : { qty: v }; };
  const ratePatch = (v) => ({ rate: v, amt: null });
  useEffect(() => { if (isMaterial && lines.length === 0) setLines([newLine()]); }, [isMaterial]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slip ki photo se bharo (POST /wallets/read-slip, mobile jaisa) ──
  const readSlip = async (file) => {
    setSlip({ busy: true, url: null, result: null, err: null });
    try {
      const url = await uploadPhoto(file);
      const r = await api.post("/wallets/read-slip", { photo_url: url });
      if (!r || !r.success) { setSlip({ busy: false, url, result: null, err: (r && r.message) || t("wallet_web.slip_unread") }); return; }
      const d = r.data || {};
      const fresh = (d.items || []).map((it) => {
        const m = it.match || {};
        const matched = !!m.material_id;
        return {
          _k: uid(), material_id: matched ? m.material_id : null, item_name: matched ? m.material_name : "",
          text: matched ? m.material_name : (it.text || it.name || ""),
          unit: matched ? (m.unit || "Nos") : (it.unit_raw || it.unit_on_slip || "Nos"),
          qty: it.qty != null ? String(it.qty) : "", rate: it.rate != null ? String(it.rate) : "",
          amt: it.amount != null ? Number(it.amount) : null,
          slip: { text: it.text || it.name || "", confidence: matched ? (m.confidence || "low") : "none",
            alternatives: Array.isArray(m.alternatives) ? m.alternatives : [], checked: false },
        };
      });
      setLines((prev) => [...prev.filter((l) => !l.slip && (l.item_name || num(l.rate))), ...fresh]);
      const shop = d.read && d.read.shop_name;
      if (shop && !party && !partyText.trim()) setPartyText(shop);
      if (d.read && d.read.date && /^\d{4}-\d{2}-\d{2}$/.test(d.read.date) && d.read.date <= today) setDate(d.read.date);
      setSlip({ busy: false, url, result: d, err: null });
      // Slip ki photo hi entry ki bill photo (mobile jaisa)
      if (!photoOff) setPhotoUrl(url);
    } catch (e) { setSlip({ busy: false, url: null, result: null, err: e.message || t("wallet_web.slip_unread") }); }
  };

  const reset = () => {
    setAmount(""); setNote(""); setLines(isMaterial ? [newLine()] : []); setOverride(""); setPhotoUrl(null);
    setSlip({ busy: false, url: null, result: null, err: null }); setParty(null); setPartyText(""); setHeadId("");
    idemKey.current = uid();
  };

  // ── Save ─────────────────────────────────────────────────────
  const submit = async () => {
    setMsg(null);
    let amt;
    let useLines = [];
    if (isMaterial) {
      useLines = lines.filter((l) => l.item_name || num(l.qty) || num(l.rate) || (l.slip && l.slip.text));
      if (!useLines.length) { setMsg({ ok: false, text: t("wallet_web.kam_se_kam_ek_material") }); return; }
      const unmatched = useLines.filter((l) => !l.material_id).length;
      if (unmatched && !window.confirm(t("wallet_web.unmatched_other_confirm", { n: unmatched }))) return;
      const bad = useLines.find((l) => !(num(l.qty) > 0) || !(num(l.rate) > 0));
      if (bad) { setMsg({ ok: false, text: t("wallet_web.har_line_qty_rate") }); focus(bad._k, num(bad.qty) > 0 ? "rate" : "qty"); return; }
      if (slipActive && !override.trim()) { setMsg({ ok: false, text: t("wallet_web.slip_paid_required", { total: fmtRs(slipTotal != null ? slipTotal : linesTotal) }) }); return; }
      amt = override.trim() ? num(override) : useLines.reduce((s, l) => s + lineAmount(l), 0);
    } else amt = num(amount);
    if (!(amt > 0)) { setMsg({ ok: false, text: t("wallet_web.sahi_amount") }); return; }
    if (isParty && !party && !partyText.trim()) { setMsg({ ok: false, text: t("wallet_web.party_required") }); return; }
    if (isQuick && !headId) { setMsg({ ok: false, text: t("wallet_web.category_required") }); return; }
    if (photoRequired && !photoUrl) { setMsg({ ok: false, text: cameraOnly ? t("wallet_web.photo_camera_only_pc") : t("wallet_web.photo_required") }); return; }
    if (showCity && !cityChoice) { setMsg({ ok: false, text: t("wallet_web.city_required") }); return; }
    setBusy(true);
    try {
      // Overdraft ki chetavni (rok nahi — server tay karta hai, mobile jaisa)
      const fresh = await api.get("/wallets/my").catch(() => null);
      if (fresh && fresh.success) {
        const live = num(fresh.data.available_to_spend);
        const odRaw = fresh.data.od_limit != null ? fresh.data.od_limit : fresh.data.negative_limit;
        const cap = Math.max(0, num(odRaw));
        if (amt > live + cap && !window.confirm(t("wallet_web.over_limit_confirm", { avail: fmtRs(live), limit: fmtRs(cap), over: fmtRs(amt - live - cap) }))) { setBusy(false); return; }
      }
      const payload = {
        wallet_category: kind, party_id: party ? party.id : null, party_name: party ? null : (partyText.trim() || null),
        amount: amt, project_id: projectId ? Number(projectId) : null, note: note.trim() || null,
        photo_pending: 0, client_created_at: new Date().toISOString(), date,
      };
      if (photoUrl && !photoOff) payload.photo_url = photoUrl;
      if (headId && (isQuick || isParty)) payload.expense_head_id = Number(headId);
      if (showCity && cityChoice && cityChoice !== "central") payload.city_id = Number(cityChoice);
      if (isMaterial) {
        // Library me na mili line → "Other material", likha naam note me (mobile asOtherMaterial)
        const lib = materials.find((m) => OTHER_RE.test(String(m.name || "").trim())) || null;
        const texts = [];
        payload.items = useLines.map((l) => {
          let name = l.item_name, mid = l.material_id;
          if (!mid) { const txt = String((l.slip && l.slip.text) || l.text || l.item_name || "").trim(); if (txt) texts.push(txt); name = lib ? lib.name : "Other material"; mid = lib ? lib.id : null; }
          return { item_name: name, material_id: mid, qty: num(l.qty), unit: l.unit || "Nos", rate: num(l.rate), amount: lineAmount(l) };
        });
        if (texts.length) payload.note = [payload.note, t("wallet_web.other_note", { list: texts.join(", ") })].filter(Boolean).join(" · ");
      }
      const r = await api.post("/wallets/expense", payload, { headers: { "Idempotency-Key": idemKey.current } });
      if (!r || r.success === false) { setMsg({ ok: false, text: (r && r.message) || t("wallet_web.save_fail") }); setBusy(false); return; }
      const st = r.data && (r.data.approval_status || r.data.status);
      setMsg({ ok: true, text: st === "pending" ? t("wallet_web.saved_pending", { amt: fmtRs(amt) }) : t("wallet_web.saved_auto", { amt: fmtRs(amt) }) });
      reset(); loadWallet();
    } catch (e) { setMsg({ ok: false, text: e.message || t("wallet_web.save_fail") }); }
    setBusy(false);
  };

  const onPhotoFile = async (f) => {
    if (!f) return;
    setPhotoBusy(true);
    try { setPhotoUrl(await uploadPhoto(f)); } catch (e) { setMsg({ ok: false, text: e.message }); }
    setPhotoBusy(false);
  };

  if (wallet && wallet.no_wallet) {
    return <div style={{ padding: 24, color: T.t3, fontSize: 13 }}>{t("wallet_web.no_wallet")}</div>;
  }

  const sm = STATUS();
  const catL = CAT_LABEL();
  const recent = (wallet && wallet.recent) || [];
  const tabBtn = (on) => ({ padding: "6px 14px", borderRadius: 7, border: `1px solid ${on ? T.blu : T.b2}`, background: on ? T.bluL : T.surface, color: on ? T.blu : T.t2, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

  return (
    <div style={{ display: "flex", gap: 14, flex: 1, overflow: "hidden" }}>
      {/* ── Form ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8 }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("wallet_web.nayi_entry")}</span>
          <span style={{ fontSize: 11, color: T.t4 }}>· {t("wallet_web.mere_wallet_se", { name: (user && user.name) || "" })}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={() => { setKind("site_exp"); setMsg(null); }} style={tabBtn(!isParty)}>{t("wallet_web.site_kharch")}</button>
            <button onClick={() => { setKind("party_pay"); setMsg(null); }} style={tabBtn(isParty)}>{t("wallet_web.party_payment")}</button>
          </div>
        </div>
        {!cEntry && (
          <div style={{ margin: 14, padding: "10px 12px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 7, fontSize: 12, color: T.amb }}>{t("wallet_web.no_entry_perm")}</div>
        )}
        <div style={{ padding: 16, opacity: cEntry ? 1 : 0.5, pointerEvents: cEntry ? "auto" : "none" }}>
          {!isParty && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <button onClick={() => setSub("material")} style={tabBtn(isMaterial)}>{t("wallet_web.material_tab")}</button>
              <button onClick={() => setSub("quick")} style={tabBtn(isQuick)}>{t("wallet_web.quick_tab")}</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><Label>{t("common.date")}</Label>
              <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} style={inp()} /></div>
            <div><Label>{t("common.project")}</Label>
              <PickSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inp({ cursor: "pointer" })}>
                <option value="">{t("wallet_web.company_office")}</option>
                {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </PickSelect></div>
            {showCity ? (
              <div><Label req>{t("wallet_web.city")}</Label>
                <PickSelect value={cityChoice} onChange={(e) => setCityChoice(e.target.value)} style={inp({ cursor: "pointer" })}>
                  <option value="">{t("wallet_web.city_placeholder")}</option>
                  {cities.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  <option value="central">{t("wallet_web.city_central")}</option>
                </PickSelect></div>
            ) : (isQuick || isParty) ? (
              <div><Label req={isQuick}>{t("common.category")}</Label>
                <PickSelect value={headId} onChange={(e) => setHeadId(e.target.value)} style={inp({ cursor: "pointer" })}>
                  <option value="">{isParty ? t("wallet_web.category_party_opt") : t("wallet_web.category_chunein")}</option>
                  {heads.map((h) => <option key={h.id} value={String(h.id)}>{h.name}</option>)}
                </PickSelect>
                {heads.length === 0 && isQuick && <div style={{ fontSize: 10.5, color: T.amb, marginTop: 3 }}>{t("wallet_web.koi_category_nahi")}</div>}
              </div>
            ) : <div />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMaterial ? "1fr" : "1fr 220px", gap: 12, marginBottom: 12 }}>
            <div><Label req={isParty}>{isParty ? t("wallet_web.party") : t("wallet_web.party_shop_optional")}</Label>
              <PartyInput party={party} text={partyText} onParty={(p) => { setParty(p); setPartyText(""); }} onText={(v) => { setParty(null); setPartyText(v); }} />
            </div>
            {!isMaterial && (
              <div><Label req>{t("common.amount")}</Label>
                <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" inputMode="decimal"
                  style={inp({ fontSize: 17, fontWeight: 700, textAlign: "right" })} /></div>
            )}
          </div>
          {showCity && (isQuick || isParty) && (
            <div style={{ marginBottom: 12, width: 300 }}><Label req={isQuick}>{t("common.category")}</Label>
              <PickSelect value={headId} onChange={(e) => setHeadId(e.target.value)} style={inp({ cursor: "pointer" })}>
                <option value="">{t("wallet_web.category_chunein")}</option>
                {heads.map((h) => <option key={h.id} value={String(h.id)}>{h.name}</option>)}
              </PickSelect></div>
          )}

          {isMaterial && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Label>{t("wallet_web.material_lines")}</Label>
                <span style={{ fontSize: 10.5, color: T.t4, marginBottom: 4 }}>{t("wallet_web.keyboard_hint")}</span>
                {!photoOff && !cameraOnly && (
                  <label style={{ marginLeft: "auto", marginBottom: 4, fontSize: 11.5, fontWeight: 700, color: T.blu, cursor: slip.busy ? "wait" : "pointer" }}>
                    {slip.busy ? t("wallet_web.slip_padh_rahe") : t("wallet_web.slip_se_bharo")}
                    <input type="file" accept="image/*" disabled={slip.busy} style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) readSlip(f); }} />
                  </label>
                )}
              </div>
              {slip.err && <div style={{ fontSize: 11.5, color: T.red, marginBottom: 6 }}>{slip.err}</div>}
              {slip.result && <div style={{ fontSize: 11.5, color: T.grn, marginBottom: 6 }}>{t("wallet_web.slip_read_ok", { n: (slip.result.items || []).length })}</div>}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead><tr style={{ background: T.surfaceB, color: T.t3, fontSize: 10.5, textTransform: "uppercase" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 26 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>{t("wallet_web.col_material")}</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", width: 90 }}>{t("common.qty")}</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 60 }}>{t("common.unit")}</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", width: 100 }}>{t("common.rate")}</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", width: 110 }}>{t("common.amount")}</th>
                  <th style={{ width: 30 }} />
                </tr></thead>
                <tbody>
                  {lines.map((l, i) => {
                    const unmatched = !l.material_id && (l.item_name || (l.slip && l.slip.text));
                    const guess = l.slip && l.material_id && !l.slip.checked && l.slip.confidence !== "high";
                    return (
                      <tr key={l._k} style={{ borderBottom: `1px solid ${T.b1}`, background: unmatched ? T.redL : guess ? T.ambL : "transparent" }}>
                        <td style={{ padding: "4px 8px", color: T.t4 }}>{i + 1}</td>
                        <td style={{ padding: "4px 6px" }}>
                          <MatCell line={l} materials={materials} inputRef={reg(l._k, "mat")}
                            onText={(v) => patch(l._k, { text: v, item_name: "", material_id: null })}
                            onPick={(m) => pickMat(l._k, m)}
                            onFree={(v) => { patch(l._k, { text: v, item_name: v, material_id: null }); focus(l._k, "qty"); }} />
                          {unmatched && <div style={{ fontSize: 10, color: T.red, marginTop: 2 }}>{t("wallet_web.library_me_nahi")}</div>}
                          {guess && <div style={{ fontSize: 10, color: T.amb, marginTop: 2 }}>{t("wallet_web.andaza_check", { text: l.slip.text })}</div>}
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input ref={reg(l._k, "qty")} value={l.qty} inputMode="decimal"
                            onChange={(e) => patch(l._k, qtyPatch(l, e.target.value.replace(/[^0-9.]/g, "")))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focus(l._k, "rate"); } }}
                            style={inp({ textAlign: "right", padding: "6px 8px" })} />
                        </td>
                        <td style={{ padding: "4px 6px", color: T.t3 }}>{l.unit}</td>
                        <td style={{ padding: "4px 6px" }}>
                          <input ref={reg(l._k, "rate")} value={l.rate} inputMode="decimal" placeholder="0"
                            onChange={(e) => patch(l._k, ratePatch(e.target.value.replace(/[^0-9.]/g, "")))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (i === lines.length - 1) addLine(); else focus(lines[i + 1]._k, "mat"); } }}
                            style={inp({ textAlign: "right", padding: "6px 8px", borderStyle: l.amt != null ? "dashed" : "solid" })} />
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{fmtRs(lineAmount(l))}</td>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <button tabIndex={-1} onClick={() => delLine(l._k)} title={t("common.hatao")} style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 14 }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <button onClick={addLine} style={{ padding: "6px 12px", borderRadius: 7, border: `1px dashed ${T.blu}`, background: T.bluL, color: T.blu, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("wallet_web.line_jodo")}</button>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: T.t3 }}>{t("wallet_web.n_lines_total", { n: lines.filter((l) => l.item_name || num(l.rate)).length })}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{fmtRs(linesTotal)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <div style={{ width: 220 }}>
                  <Label req={slipActive}>{slipActive ? t("wallet_web.kitna_diya") : t("wallet_web.asli_diya_optional")}</Label>
                  <input value={override} inputMode="decimal" onChange={(e) => setOverride(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder={slipActive && slipTotal != null ? String(slipTotal) : (linesTotal ? String(Math.round(linesTotal)) : "0")}
                    style={inp({ textAlign: "right", fontWeight: 700 })} />
                </div>
                {override.trim() !== "" && num(override) !== linesTotal && (
                  <span style={{ fontSize: 11.5, color: T.amb, marginTop: 14 }}>{t("wallet_web.actual_diff", { actual: fmtRs(num(override)), diff: fmtRs(Math.abs(num(override) - linesTotal)) })}</span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, marginBottom: 14 }}>
            <div><Label>{t("common.note")}</Label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("wallet_web.note_placeholder")} style={inp({ resize: "vertical" })} /></div>
            {!photoOff && (
              <div><Label req={photoRequired}>{photoRequired ? t("wallet_web.photo_zaroori") : t("wallet_web.photo_optional")}</Label>
                {cameraOnly ? (
                  <div style={{ fontSize: 11.5, color: T.amb, lineHeight: 1.45 }}>{t("wallet_web.photo_camera_only_pc")}</div>
                ) : photoUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <a href={photoUrl} target="_blank" rel="noreferrer"><img src={cld(photoUrl, "thumb")} alt="bill" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}` }} /></a>
                    <span style={{ fontSize: 11.5, color: T.grn, fontWeight: 600 }}>{t("wallet_web.photo_lagi")}</span>
                    <button onClick={() => setPhotoUrl(null)} style={{ border: "none", background: "none", color: T.red, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>{t("common.hatao")}</button>
                  </div>
                ) : (
                  <label style={{ display: "inline-block", padding: "8px 12px", borderRadius: 7, border: `1px dashed ${T.b2}`, fontSize: 12, color: photoBusy ? T.t4 : T.blu, fontWeight: 600, cursor: photoBusy ? "wait" : "pointer" }}>
                    {photoBusy ? t("wallet_web.photo_lag_rahi") : t("wallet_web.photo_file_chuno")}
                    <input type="file" accept="image/*" disabled={photoBusy} style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; onPhotoFile(f); }} />
                  </label>
                )}
              </div>
            )}
          </div>

          {msg && <div style={{ marginBottom: 10, padding: "9px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: msg.ok ? T.grnL : T.redL, color: msg.ok ? T.grn : T.red, border: `1px solid ${msg.ok ? T.grnM : T.redM}` }}>{msg.text}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={submit} disabled={busy || photoBusy || slip.busy}
              style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: busy ? T.t4 : T.blu, color: "white", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>
              {busy ? t("wallet_web.save_ho_raha") : t("wallet_web.save_entry")}
            </button>
            <span style={{ fontSize: 11, color: T.t4 }}>{t("wallet_web.approval_note")}</span>
          </div>
        </div>
      </div>

      {/* ── Wallet ka haal + meri entries ── */}
      <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ background: T.ind, borderRadius: 8, padding: "14px 16px", color: "white" }}>
          <div style={{ fontSize: 10.5, opacity: .75, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("wallet_web.kharch_layak")}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>{wLoading && !wallet ? "…" : fmtRs(wallet ? wallet.available_to_spend : 0)}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 11.5 }}>
            <span><span style={{ opacity: .7 }}>{t("wallet_web.holding")} </span><b>{fmtRs(wallet ? wallet.cash_with_staff : 0)}</b></span>
            <span><span style={{ opacity: .7 }}>{t("wallet_web.pending")} </span><b>{fmtRs(wallet ? wallet.pending_amount : 0)}</b></span>
          </div>
        </div>
        <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "9px 12px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("wallet_web.meri_entries")}</span>
            <button onClick={loadWallet} style={{ marginLeft: "auto", border: "none", background: "none", color: T.blu, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("common.refresh")}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {recent.length === 0 && <div style={{ padding: 16, fontSize: 12, color: T.t4 }}>{wLoading ? t("common.loading") : t("wallet_web.koi_entry_nahi")}</div>}
            {recent.map((r) => {
              const credit = r.direction === "in";
              const s = sm[r.approval_status] || null;
              const photo = r.reference_no && /^https?:\/\//.test(r.reference_no) ? r.reference_no : null;
              return (
                <div key={r.id} style={{ padding: "8px 12px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {credit ? (r.sender_name || t("wallet_web.paisa_aaya")) : (r.party_name || catL[r.wallet_category] || r.type)}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {fmtDate(r.date || r.created_at)}{r.project_name ? " · " + r.project_name : ""}{!credit && catL[r.wallet_category] ? " · " + catL[r.wallet_category] : ""}
                      {photo && <> · <a href={photo} target="_blank" rel="noreferrer" style={{ color: T.blu }}>{t("wallet_web.bill")}</a></>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: credit ? T.grn : T.t1, fontVariantNumeric: "tabular-nums" }}>{credit ? "+" : "−"}{fmtRs(r.amount)}</div>
                    {s && !credit && <span style={{ fontSize: 9.5, fontWeight: 700, color: s.c, background: s.bg, padding: "1px 6px", borderRadius: 8 }}>{s.l}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Party / dukaan: library se khoj (wallets/party-options) ya seedha naam ──
function PartyInput({ party, text, onParty, onText }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const [hi, setHi] = useState(0);
  const q = party ? party.name : text;
  useEffect(() => {
    if (party || !open) return;
    const h = setTimeout(() => {
      api.get("/wallets/party-options?q=" + encodeURIComponent(text || "")).then((r) => { if (r && r.success) setOpts((r.data || []).slice(0, 8)); }).catch(() => {});
    }, 200);
    return () => clearTimeout(h);
  }, [text, open, party]);
  const pick = (p) => { onParty(p); setOpen(false); };
  return (
    <div style={{ position: "relative" }}>
      <input value={q} placeholder={t("wallet_web.party_placeholder")}
        onChange={(e) => { onText(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !opts.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, opts.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); pick(opts[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        style={inp({ fontWeight: party ? 700 : 400, borderColor: party ? T.grnM : T.b2, background: party ? T.grnL : T.surface })} />
      {party && <button onMouseDown={(e) => e.preventDefault()} onClick={() => onText("")} style={{ position: "absolute", right: 6, top: 7, border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 13 }}>×</button>}
      {open && !party && opts.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: T.surface, border: `1px solid ${T.b2}`, borderRadius: 7, boxShadow: "0 6px 18px rgba(0,0,0,.08)", maxHeight: 240, overflowY: "auto" }}>
          {opts.map((p, i) => (
            <div key={p.id} onMouseDown={(e) => { e.preventDefault(); pick(p); }} onMouseEnter={() => setHi(i)}
              style={{ padding: "7px 10px", fontSize: 12.5, cursor: "pointer", background: i === hi ? T.bluL : "transparent", display: "flex", gap: 8 }}>
              <span style={{ flex: 1, fontWeight: 600, color: T.t1 }}>{p.name}</span>
              <span style={{ fontSize: 10.5, color: T.t4 }}>{p.is_staff ? t("wallet_web.staff") : (p.type || "")}{p.balance != null ? " · " + fmtRs(p.balance) : ""}</span>
            </div>
          ))}
          {text.trim() && <div style={{ padding: "6px 10px", fontSize: 10.5, color: T.t4, borderTop: `1px solid ${T.b1}` }}>{t("wallet_web.ya_naam_waisa_hi", { name: text.trim() })}</div>}
        </div>
      )}
    </div>
  );
}

// ── Material ka khaana: Library se khoj; Enter = chuno, ↑↓ = ghoomo ──
function MatCell({ line, materials, inputRef, onText, onPick, onFree }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const q = String(line.text || line.item_name || "");
  const opts = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return materials.slice(0, 8);
    const starts = [], has = [];
    for (const m of materials) {
      const n = String(m.name || "").toLowerCase();
      if (n.startsWith(s)) starts.push(m); else if (n.includes(s)) has.push(m);
      if (starts.length >= 8) break;
    }
    return [...starts, ...has].slice(0, 8);
  }, [q, materials]);
  const chosen = !!line.material_id;
  return (
    <div style={{ position: "relative" }}>
      <input ref={inputRef} value={q} placeholder={t("wallet_web.material_khojo")}
        onChange={(e) => { onText(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, opts.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && opts.length) { onPick(opts[hi]); setOpen(false); } else if (q.trim()) onFree(q.trim()); }
          else if (e.key === "Escape") setOpen(false);
        }}
        style={inp({ padding: "6px 8px", fontWeight: chosen ? 600 : 400, borderColor: chosen ? T.b2 : (q ? T.redM : T.b2) })} />
      {open && opts.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, minWidth: "100%", zIndex: 20, background: T.surface, border: `1px solid ${T.b2}`, borderRadius: 7, boxShadow: "0 6px 18px rgba(0,0,0,.08)", maxHeight: 260, overflowY: "auto" }}>
          {opts.map((m, i) => (
            <div key={m.id} onMouseDown={(e) => { e.preventDefault(); onPick(m); setOpen(false); }} onMouseEnter={() => setHi(i)}
              style={{ padding: "6px 10px", fontSize: 12.5, cursor: "pointer", background: i === hi ? T.bluL : "transparent", display: "flex", gap: 10, whiteSpace: "nowrap" }}>
              <span style={{ flex: 1, fontWeight: 600, color: T.t1 }}>{m.name}</span>
              <span style={{ fontSize: 10.5, color: T.t4 }}>{m.category_name || ""}{m.unit ? " · " + m.unit : ""}{(m.last_rate || m.base_rate) ? " · ₹" + (m.last_rate || m.base_rate) : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
