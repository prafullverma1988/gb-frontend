// ── GRN photos — teen tile (10 Oct 2026, E) ───────────────────────────
// Pehle ek hi box tha "challan / material / quality", ek hi Photo Settings
// key (`grn`). Ab har receiving par teen alag tile, har ek ki apni setting
// (Settings → Photo Settings), server contract: gb-backend utils/grnReceive.js
// enforceGrnPhotos / stampSiteReceipt:
//   T1 "Vendor challan"   `grn`           body.photo_urls      + photos_pending
//   T2 "Rec slip" + no.   `grn_rec_slip`  body.rec_slip_url + rec_slip_no
//                                          (upload ka intezaar — pending nahi)
//   T3 "Gadi / material"  `grn_vehicle`   body.site_photo_urls + site_photos_pending
// Andar ka material (store issue / transfer receive): vendor nahi, isliye T1
// nahi; T3 apni purani key se (`material_issue` / `material_transfer`).
//
// GrnPhotoBox (default) = ek tile, sirf dikhana. GrnPhotoTiles = poora set,
// apna state khud rakhta hai; screen ref se bulati hai:
//   await ref.ready({ wait })  — T2 (ya wait=true par teeno) ka upload poora,
//                                phir "Zaroori" tile khaali to rok + laal.
//   ref.body()                 — GRN request me jaane wale saare khaane.
//   ref.done(grnId, {dup,…})   — peeche chadhti T1 / T3 photo isi GRN par
//                                (/photos/attach `grn` / `grn_site`), tile saaf,
//                                dohra rec slip ho to peela hint (text lautata hai).
//   ref.fail(res)              — server ka 400 photo_required → wahi tile laal.
// Site aur godown ke saare GRN form yahi set lagate hain — naya cross-module
// component nahi (GrnReceive pehle se isi folder se tha).
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import api from "../../config/api";
import uploadManager from "../../utils/uploadManager";
import { fileInputProps, loadPhotoPolicy, policyFor } from "../../utils/photoPolicy";
import { T } from "../../modules/shared/tokens";
import { t } from "../../i18n";
import { cld } from "../../utils/cloudinary";

// Tile → Photo Settings key, kitni photo, naam / hint (bhasha render ke waqt).
const TILES = {
  challan: { key: "grn",          max: 6, title: () => t("grn_ph.vendor_challan"), hint: () => t("grn_ph.vendor_challan_hint") },
  rec:     { key: "grn_rec_slip", max: 1, title: () => t("grn_ph.rec_slip"),       hint: () => t("grn_ph.rec_slip_hint") },
  site:    { key: "grn_vehicle",  max: 3, title: () => t("grn_ph.site"),           hint: () => t("grn_ph.site_hint") },
};
const EMPTY = { challan: [], rec: [], site: [] };
// Server ka photo_key → tile (andar ke material par T3 ki key material_issue / material_transfer).
const tileOfKey = (k) => (k === "grn" ? "challan" : k === "grn_rec_slip" ? "rec" : "site");

// Ek-click receive (bina form wale screen): teeno tile Photo Settings me Off
// hon to photo ka sheet kholna bekaar — seedha bhejo, naye khaane khaali (E).
export async function grnPhotosOff() {
  const p = await loadPhotoPolicy();
  return ["grn", "grn_rec_slip", "grn_vehicle"].every(k => policyFor(p, k).mode === "off");
}
export const GRN_NO_PHOTO_BODY = { photo_urls: null, photos_pending: 0, rec_slip_no: null, rec_slip_url: null, site_photo_urls: [], site_photos_pending: 0 };

// Dohra rec slip ka peela hint — screen band ho jaaye to alert me bhi yahi.
export function recSlipDupText(no, dup, receivingIssue) {
  if (!dup) return "";
  const s = t("grn_ph.rec_slip_dup", { no: no || "—", grn: dup.grn_number || "—" });
  return receivingIssue ? s + "\n" + t("grn_ph.receiving_issue") : s;
}

// ── Ek tile ────────────────────────────────────────────────────────────
export default function GrnPhotoBox({ title, hint, photos, pending = 0, required, cameraOnly, max = 6, error, onPick, onRemove, children }) {
  const list = Array.isArray(photos) ? photos : [];
  const have = list.length + pending;
  const full = have >= max;
  return (
    <div style={{ border: "1px solid " + (error ? T.red : T.b1), background: error ? T.redL : T.surface, borderRadius: 8, padding: "9px 10px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: error ? T.red : T.t1 }}>{title}</span>
        {required && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: have === 0 ? T.red : T.grn, background: have === 0 ? T.redL : T.grnL, padding: "1px 7px", borderRadius: 10, border: `1px solid ${have === 0 ? T.redM : T.grnM}` }}>
            {have === 0 ? t("material.required") : t("material.attached")}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{hint}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
        {list.map((url, idx) => (
          <div key={url + idx} style={{ position: "relative", width: 56, height: 56, borderRadius: 7, overflow: "hidden", border: "1px solid " + T.b1 }}>
            <img src={cld(url, "thumb")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => onRemove && onRemove(idx)}
              style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "white", border: "none", fontSize: 10, cursor: "pointer", lineHeight: 1, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ))}
        {Array.from({ length: pending }).map((_, i) => (
          <div key={"p" + i} style={{ width: 56, height: 56, borderRadius: 7, border: "1px dashed " + T.ambM, background: T.ambL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.amb }}>…</div>
        ))}
        {!full && (
          <label style={{ width: 56, height: 56, borderRadius: 7, border: "1.5px dashed " + T.b2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 16 }}>📷</span>
            <span style={{ fontSize: 9.5, color: T.t4, fontWeight: 600 }}>{t("common.add")}</span>
            <input {...fileInputProps({ source: cameraOnly ? "camera" : "both" }, { multiple: max > 1 })}
              style={{ display: "none" }}
              onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; onPick && onPick(files); }} />
          </label>
        )}
      </div>
      {pending > 0 && <div style={{ marginTop: 4, fontSize: 10, color: T.amb }}>{t("grn_ph.uploading", { n: pending })}</div>}
      {cameraOnly && <div style={{ marginTop: 4, fontSize: 9.5, color: T.t4 }}>{t("material.company_setting_sirf_live_camera_mobile")}</div>}
      {children}
      {error && typeof error === "string" && <div style={{ marginTop: 5, fontSize: 10.5, color: T.red, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

// ── Poora set (T1 · T2 · T3, ya andar ke material par T2 · T3) ─────────
// inbound: null (vendor ka GRN) | "material_issue" | "material_transfer"
// dest: { projectId } | { warehouseId } — "Rec slip no." ka dohra yahin dekhte hain.
// vendor / challan: ek hi delivery ke doosre GRN par dohra nahi (server bhi yahi).
export const GrnPhotoTiles = forwardRef(function GrnPhotoTiles({ inbound = null, dest = null, vendor = "", challan = "", folder = "gb_buildcon/grn" }, ref) {
  const ids = inbound ? ["rec", "site"] : ["challan", "rec", "site"];
  const keyOf = (id) => (id === "site" && inbound ? inbound : TILES[id].key);
  const titleOf = (id) => (id === "site" && inbound ? t("grn_ph.material") : TILES[id].title());
  const hintOf = (id) => (id === "site" && inbound ? t("grn_ph.material_hint") : TILES[id].hint());
  const [pol, setPol] = useState(null);
  useEffect(() => { let on = true; loadPhotoPolicy().then(p => { if (on) setPol(p); }); return () => { on = false; }; }, []);
  const polOf = (id) => policyFor(pol, keyOf(id));
  const shown = ids.filter(id => polOf(id).mode !== "off");

  // URL ref me bhi — upload ke intezaar ke baad submit purane render ka state na padhe.
  const urlsRef = useRef(EMPTY);
  const [urls, setUrlsState] = useState(EMPTY);
  const setUrls = (id, fn) => { urlsRef.current = { ...urlsRef.current, [id]: fn(urlsRef.current[id]) }; setUrlsState(urlsRef.current); };
  const recRef = useRef("");
  const [recNo, setRecNoState] = useState("");
  const setRecNo = (v) => { recRef.current = v; setRecNoState(v); };
  const [err, setErr] = useState(null);     // { id, msg }
  const [dupMsg, setDupMsg] = useState("");

  // Chadhti photo: har file ka ek slot { uid, target }. uploadManager ki queue
  // se milate hain — cancel / fail par bhi slot hatta hai (cancel koi callback
  // nahi deta), isliye intezaar kabhi atakta nahi.
  const slots = useRef({ challan: new Set(), rec: new Set(), site: new Set() });
  // body() ne jo slot "pending" gine — GRN ki request ke beech upload poora ho
  // jaaye to bhi done() unhe isi GRN par jodta hai (warna row ka pending atka rehta).
  const sentRef = useRef({ challan: [], site: [] });
  const [pend, setPend] = useState({ challan: 0, rec: 0, site: 0 });
  const waiters = useRef([]);
  const sync = () => {
    const live = new Set(uploadManager.getQueue().filter(q => q.status === "queued" || q.status === "uploading").map(q => q.id));
    for (const id of Object.keys(slots.current)) for (const s of [...slots.current[id]]) if (!live.has(s.uid)) slots.current[id].delete(s);
    const n = { challan: slots.current.challan.size, rec: slots.current.rec.size, site: slots.current.site.size };
    setPend(p => (p.challan === n.challan && p.rec === n.rec && p.site === n.site ? p : n));
    waiters.current = waiters.current.filter(w => {
      if (w.ids.some(id => slots.current[id].size)) return true;
      w.res(); return false;
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => uploadManager.subscribe(sync), []);
  const waitFor = (list) => new Promise(res => { waiters.current.push({ ids: list, res }); sync(); });

  const pick = (id, files) => {
    setErr(e => (e && e.id === id ? null : e));
    const max = TILES[id].max;
    // Rec slip ek hi — nayi chuni to purani (chadh rahi ho to bhi) hat jaati hai.
    if (id === "rec") { for (const s of slots.current.rec) s.dropped = true; slots.current.rec.clear(); }
    const room = id === "rec" ? 1 : max - urlsRef.current[id].length - slots.current[id].size;
    files.slice(0, Math.max(0, room)).forEach(file => {
      const s = { uid: null, target: null, dropped: false, url: null };
      s.uid = uploadManager.add({
        file, folder,
        label: t("grn.photo_upload_label", { name: file.name }),
        onDone: (url) => {
          s.url = url;
          // GRN ban chuka — photo seedha usi par (row ka photos_pending ghatta hai).
          if (s.target) { api.post("/photos/attach", { ...s.target, url }).catch(() => {}); return; }
          if (s.dropped) return;
          setUrls(id, l => (id === "rec" ? [url] : l.length >= max ? l : [...l, url]));
        },
      });
      slots.current[id].add(s);
    });
    sync();
  };
  const remove = (id, idx) => setUrls(id, l => l.filter((_, i) => i !== idx));

  const checkDup = async () => {
    const no = recRef.current.trim();
    if (!no || !dest || !(dest.projectId || dest.warehouseId)) { setDupMsg(""); return; }
    const qs = new URLSearchParams({ no });
    if (dest.projectId) qs.set("project_id", dest.projectId); else qs.set("warehouse_id", dest.warehouseId);
    if (String(vendor || "").trim()) qs.set("vendor_name", String(vendor).trim());
    if (String(challan || "").trim()) qs.set("challan_no", String(challan).trim());
    const r = await api.get("/weighments/rec-slip-check?" + qs.toString()).catch(() => null);
    // Jawab aane tak number badal gaya ho to purana hint mat dikhao.
    if (recRef.current.trim() !== no) return;
    const d = r && r.success && r.data ? r.data.dup : null;
    setDupMsg(d ? recSlipDupText(no, d) : "");
  };

  const reset = () => {
    urlsRef.current = EMPTY; setUrlsState(EMPTY); setRecNo(""); setErr(null);
    for (const s of slots.current.rec) s.dropped = true;
    slots.current.rec.clear(); sync();
  };

  useImperativeHandle(ref, () => ({
    // true = submit karo. wait=true: teeno ka upload poora (ek photo kai GRN par).
    ready: async ({ wait = false } = {}) => {
      await waitFor(wait ? ids : ["rec"]);
      for (const id of shown) {
        if (polOf(id).mode !== "required") continue;
        const have = urlsRef.current[id].length + (id === "rec" ? 0 : slots.current[id].size);
        if (!have) {
          const msg = t("material.company_setting_label_ke_saath_kam", { label: titleOf(id) });
          setErr({ id, msg });
          alert(msg);
          return false;
        }
      }
      return true;
    },
    body: () => {
      const u = urlsRef.current;
      sentRef.current = { challan: [...slots.current.challan], site: [...slots.current.site] };
      return {
        ...(inbound ? {} : { photo_urls: u.challan.length ? u.challan : null, photos_pending: sentRef.current.challan.length }),
        rec_slip_no: recRef.current.trim().slice(0, 60) || null,
        rec_slip_url: u.rec[0] || null,
        site_photo_urls: u.site,
        site_photos_pending: sentRef.current.site.length,
      };
    },
    // grnId null (ordered — sab upload ho chuke the): beech me chuni nayi photo
    // tile me hi aayegi, agli delivery ke liye.
    done: (grnId, { dup = null, receivingIssue = false } = {}) => {
      if (grnId) {
        for (const [id, entity] of [["challan", "grn"], ["site", "grn_site"]]) {
          const target = { entity_type: entity, entity_id: grnId };
          for (const s of new Set([...sentRef.current[id], ...slots.current[id]])) {
            if (s.url) api.post("/photos/attach", { ...target, url: s.url }).catch(() => {});
            else s.target = target;
          }
          slots.current[id].clear();
        }
      }
      sentRef.current = { challan: [], site: [] };
      const text = recSlipDupText(recRef.current.trim(), dup, receivingIssue);
      reset();
      setDupMsg(text);
      return text;
    },
    fail: (res) => {
      if (!res || res.code !== "photo_required") return false;
      setErr({ id: res.photo_key ? tileOfKey(res.photo_key) : (inbound ? "site" : "challan"), msg: res.message || "" });
      return true;
    },
  }));

  if (!shown.length) return null;
  const inpS = { width: "100%", padding: "6px 9px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: T.surface };
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid " + T.b1, paddingTop: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{t("material.grn_photos")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
        {shown.map(id => {
          const p = polOf(id);
          return (
            <GrnPhotoBox key={id} title={titleOf(id)} hint={hintOf(id)}
              photos={urls[id]} pending={pend[id]} max={TILES[id].max}
              required={p.mode === "required"} cameraOnly={p.source === "camera"}
              error={err && err.id === id ? (err.msg || true) : null}
              onPick={files => pick(id, files)} onRemove={idx => remove(id, idx)}>
              {id === "rec" && (
                <div style={{ marginTop: 7 }}>
                  <label style={{ fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{t("grn_ph.rec_slip_no")}</label>
                  <input value={recNo} maxLength={60}
                    onChange={e => { setRecNo(e.target.value); if (dupMsg) setDupMsg(""); }}
                    onBlur={checkDup}
                    placeholder={t("grn_ph.rec_slip_no_ph")} style={inpS} />
                </div>
              )}
              {id === "rec" && dupMsg && (
                <div style={{ marginTop: 6, padding: "5px 8px", borderRadius: 6, background: T.ambL, border: "1px solid " + T.ambM, fontSize: 10.5, color: T.amb, fontWeight: 600, whiteSpace: "pre-line" }}>{dupMsg}</div>
              )}
            </GrnPhotoBox>
          );
        })}
      </div>
      <div style={{ marginTop: 5, fontSize: 10, color: T.t4 }}>{t("material.camera_opens_on_mobile_multi_select_2")}</div>
    </div>
  );
});
