import React, { useState, useEffect, useCallback, useMemo } from "react";
import PickSelect from "../../components/PickSelect";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { cld } from "../../utils/cloudinary";
import { canEntry, currentUser } from "../../utils/perms";

/* ────────────────────────────────────────────────────────────────────
   FILES — construction site ka kaagaz-ghar

   Prafull (2026-08-19): "files solar wala lag raha hai. Construction me
   alag-alag photos ka — site photo, issues — aur bhi documents rahna
   chahiye. Aur photo gallery se delete ya archive ka option."

   Purana Files tab solar ka checklist (Aadhaar, PAN, ITR, Electricity
   Bill) dikha raha tha, kyunki wo /solar/.../all-files padhta tha. Site
   ke asli kaagaz `project_files` me pade the — jahan mobile ka FAB unhe
   daalta hai — aur web unhe kabhi dikhata hi nahi tha.

   Ab ek hi call (/projects/:id/file-hub) teeno jagah se laata hai:
     • documents  — folder ke hisaab se (purane naam bhi sudhar kar)
     • site photos — Overview se li gayi + task ke andar li gayi
     • issue photos — jo issue ke saath lagi thi

   Folder + tag (27 Oct 2026, Prafull): "project me kuch folder auto created
   aur create folder ka option web me; interior ke photo ek screen me bhi
   aur apne folder me bhi." Har project me apne aap 10 document folder
   (wahi purani shreni) + 5 photo folder (Site progress, Interior, Exterior,
   Material, Client visit); "+ Naya folder" se apne. "Sab photos" me sab,
   folder me sirf uski. Tag se chhanto; "📁 Folder / tag" se jagah badlo.
   Server par folder abhi na bane hon (deploy ke turant baad) to purani
   shreni wali rail.

   "Hatana" yahan mitana nahi, ARCHIVE hai. Site ka kaagaz saboot hota
   hai; galti se daba hua button use hamesha ke liye nahi le ja sakta.
   Archive khol kar wapas laya ja sakta hai.
   ──────────────────────────────────────────────────────────────────── */

const CLOUD = "https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload";
const PRESET = "gb_buildcon_drawings";

const CAT_STYLE = {
  agreement: { c: "#7C3AED", bg: "#F5F3FF", ic: "📜" },
  design:    { c: "#2563EB", bg: "#EFF6FF", ic: "📐" },
  boq:       { c: "#059669", bg: "#ECFDF5", ic: "🧾" },
  permit:    { c: "#D97706", bg: "#FFFBEB", ic: "🛡" },
  contract:  { c: "#0891B2", bg: "#ECFEFF", ic: "🤝" },
  quality:   { c: "#DB2777", bg: "#FDF2F8", ic: "🔬" },
  billing:   { c: "#CA8A04", bg: "#FEFCE8", ic: "💰" },
  safety:    { c: "#EA580C", bg: "#FFF7ED", ic: "⛑" },
  survey:    { c: "#0D9488", bg: "#F0FDFA", ic: "🗺" },
  other:     { c: "#64748B", bg: "#F1F5F9", ic: "📎" },
};
const cs = (id) => CAT_STYLE[id] || CAT_STYLE.other;
const PHOTO_IC = { photo_progress: "🏗", photo_interior: "🛋", photo_exterior: "🏠", photo_material: "🧱", photo_client: "🤝" };
const CUSTOM = { c: "#475569", bg: "#F1F5F9", ic: "📁" };
const folderStyle = (f) => (!f ? CAT_STYLE.other : f.custom ? CUSTOM
  : f.kind === "photo" ? { c: T.grn, bg: T.grnL, ic: PHOTO_IC[f.sys_key] || "📷" } : cs(f.sys_key));

const extOf = (url) => {
  const m = String(url || "").split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toUpperCase() : "FILE";
};
const dt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
const fileId = (item) => (item.id != null ? item.id : String(item.ref || "").slice(1));
const hasTag = (item, tag) => (item.tags || []).some((x) => x.toLowerCase() === tag.toLowerCase());

export default function TabProjectFiles({ projectId }) {
  const [hub, setHub] = useState(null);     // null = load ho raha hai
  // "docs" | "d:<folder>" | "photos" | "p:<folder>" | "pnone" | "issues"
  const [sel, setSel] = useState("docs");
  const [tag, setTag] = useState("");
  const [arch, setArch] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [up, setUp] = useState(null);       // upload modal
  const [view, setView] = useState(-1);     // photo viewer ka index
  const [mv, setMv] = useState(null);       // folder / tag badalne wala
  const [nf, setNf] = useState(null);       // naya folder { kind, name }
  const [ren, setRen] = useState(null);     // naam badlo { id, name }

  const load = useCallback(() => {
    setErr("");
    api.get(`/projects/${projectId}/file-hub${arch ? "?archived=1" : ""}`)
      .then((r) => setHub(r?.success ? r.data : { documents: [], photos: [], issue_photos: [], cats: [] }))
      .catch(() => setHub({ documents: [], photos: [], issue_photos: [], cats: [] }));
  }, [projectId, arch]);

  useEffect(() => { setHub(null); load(); }, [load]);

  const docs = useMemo(() => hub?.documents || [], [hub]);
  const photos = useMemo(() => hub?.photos || [], [hub]);
  const issues = hub?.issue_photos || [];
  const hasFolders = !!(hub?.folders || []).length;
  // Folder na hon (server par migration abhi nahi chali) to purani shreni hi folder.
  const docFolders = useMemo(() => {
    const f = (hub?.folders || []).filter((x) => x.kind === "document");
    return f.length ? f : (hub?.cats || []).map((c) => ({ id: "c_" + c.id, kind: "document", sys_key: c.id, name: c.label, custom: false }));
  }, [hub]);
  const photoFolders = useMemo(() => (hub?.folders || []).filter((x) => x.kind === "photo"), [hub]);
  const inDoc = (d, f) => (typeof f.id === "number" ? d.folder_id === f.id : d.category === f.sys_key);
  const folderById = (id) => [...docFolders, ...photoFolders].find((f) => f.id === id) || null;

  // Roles & Access (5 Oct 2026) — server tay karta hai: hub.can_remove = Files →
  // Delete (kisi ki bhi file/photo), item.can_remove = apni aaj ki daali (Files Entry).
  // Design ki drawing (source "design", 27 Oct 2026) Design module ki hai — yahan se nahi hatti.
  const canRemove = (item) => item?.source !== "design" && (!!hub?.can_remove || !!item?.can_remove);
  const canUpload = canEntry("Files");
  // Jagah / tag badalna: Files Edit, ya apni daali file. Task / issue ki photo nahi.
  const me = currentUser();
  const canMove = (item) => hasFolders && !arch && (!item.source || item.source === "project")
    && (!!hub?.can_move || (canUpload && Number(item.uploaded_by) === Number(me.id)));

  const pick = (s) => { setSel(s); setTag(""); setRen(null); };
  const selFolder = sel.startsWith("d:") ? docFolders.find((f) => "d:" + f.id === sel)
    : sel.startsWith("p:") ? photoFolders.find((f) => "p:" + f.id === sel) : null;
  const isPhotoView = sel === "photos" || sel === "issues" || sel === "pnone" || sel.startsWith("p:");

  const baseDocs = sel === "docs" || !selFolder ? docs : docs.filter((d) => inDoc(d, selFolder));
  const basePhotos = sel === "issues" ? issues
    : sel === "pnone" ? photos.filter((p) => p.source === "project" && !p.folder_id)
    : selFolder && isPhotoView ? photos.filter((p) => p.folder_id === selFolder.id) : photos;
  const base = isPhotoView ? basePhotos : baseDocs;
  const tagCounts = useMemo(() => {
    const m = new Map();
    base.forEach((x) => (x.tags || []).forEach((tg) => {
      const k = tg.toLowerCase();
      const cur = m.get(k) || { tag: tg, n: 0 };
      cur.n += 1; m.set(k, cur);
    }));
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [base]);
  const shownDocs = tag ? baseDocs.filter((d) => hasTag(d, tag)) : baseDocs;
  const shownPhotos = tag ? basePhotos.filter((p) => hasTag(p, tag)) : basePhotos;

  const remove = async (ref) => {
    setBusy(ref); setErr("");
    const r = await api.del(`/projects/${projectId}/media/${ref}`);
    setBusy("");
    if (!r?.success) { setErr(r?.message || "Hataya nahi ja saka"); return; }
    setView(-1);
    load();
  };
  const restore = async (ref) => {
    setBusy(ref); setErr("");
    const r = await api.post(`/projects/${projectId}/media/${ref}/restore`, {});
    setBusy("");
    if (!r?.success) { setErr(r?.message || "Wapas nahi aayi"); return; }
    load();
  };

  const createFolder = async () => {
    const name = String(nf?.name || "").trim();
    if (!name) return;
    setBusy("nf"); setErr("");
    const r = await api.post(`/projects/${projectId}/folders`, { kind: nf.kind, name });
    setBusy("");
    if (!r?.success) { setErr(r?.message || t("project_files.save_nahi_hua")); return; }
    setNf(null);
    pick((nf.kind === "photo" ? "p:" : "d:") + r.data.id);
    load();
  };
  const renameFolder = async () => {
    const name = String(ren?.name || "").trim();
    if (!name) return;
    setBusy("ren"); setErr("");
    const r = await api.patch(`/projects/${projectId}/folders/${ren.id}`, { name });
    setBusy("");
    if (!r?.success) { setErr(r?.message || t("project_files.save_nahi_hua")); return; }
    setRen(null);
    load();
  };
  const deleteFolder = async (f) => {
    const msg = t("project_files.folder_hatana_hai", { name: f.name });
    if (!(window.confirmAsync ? await window.confirmAsync(msg) : window.confirm(msg))) return;
    setBusy("delf"); setErr("");
    const r = await api.del(`/projects/${projectId}/folders/${f.id}`);
    setBusy("");
    if (!r?.success) { setErr(r?.message || t("project_files.save_nahi_hua")); return; }
    pick(f.kind === "photo" ? "photos" : "docs");
    load();
  };

  // Upload ka shuru: jo folder khula hai wahi, warna document → Other, photo → Site progress.
  const openUpload = () => {
    const photo = isPhotoView && sel !== "issues";
    const fl = photo ? photoFolders : docFolders.filter((f) => typeof f.id === "number");
    const def = photo ? fl.find((f) => f.sys_key === "photo_progress") : fl.find((f) => f.sys_key === "other");
    const cur = selFolder && typeof selFolder.id === "number" ? selFolder : null;
    setUp({ kind: photo ? "photo" : "document", category: selFolder?.sys_key && !photo ? selFolder.sys_key : "other",
      folder: String((cur || def || {}).id || ""), title: "", tags: "", files: [] });
  };

  if (hub === null) return <div style={{ textAlign: "center", padding: 60, color: T.t4, fontSize: 12.5 }}>{t("project_files.files_aa_rahi_hain")}</div>;

  const canFolders = hasFolders && !arch && !!hub?.can_folders;
  const docCount = (f) => docs.filter((d) => inDoc(d, f)).length;
  const photoCount = (f) => photos.filter((p) => p.folder_id === f.id).length;
  const unfiled = photos.filter((p) => p.source === "project" && !p.folder_id).length;
  const viewItem = view >= 0 ? shownPhotos[view] : null;

  return (
    <div style={{ padding: "14px 0" }}>
      {/* ── upar ki patti: ginti + archive + upload ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Kpi label={t("common.documents")} n={docs.length} on={!isPhotoView}
          onClick={() => pick("docs")} color={T.blu} />
        <Kpi label={t("project_files.site_photos")} n={photos.length} on={isPhotoView && sel !== "issues"}
          onClick={() => pick("photos")} color={T.grn} />
        <Kpi label={t("project_files.issue_photos")} n={issues.length} on={sel === "issues"}
          onClick={() => pick("issues")} color={T.red} />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setArch(!arch); pick(sel === "issues" ? "docs" : sel); }}
          style={{ padding: "7px 13px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", border: `1px solid ${arch ? T.amb : T.b1}`,
            background: arch ? T.ambL : T.surface, color: arch ? T.amb : T.t3 }}>
          {arch ? t("project_files.chaalu_files") : t("project_files.archive")}
        </button>
        {!arch && canUpload && (
          <button onClick={openUpload}
            style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: T.blu, color: "#fff",
              fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
           {t("project_files.file_daalo")}
          </button>
        )}
      </div>

      {arch && (
        <div style={{ marginBottom: 10, background: T.ambL, border: `1px solid ${T.ambM}`, color: "#92400E",
          borderRadius: 8, padding: "8px 12px", fontSize: 11.5 }}>
         {t("project_files.ye_archive_hai_hatai_gayi_cheezein")}
        </div>
      )}
      {!!err && (
        <div style={{ marginBottom: 10, background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
          borderRadius: 8, padding: "8px 12px", fontSize: 11.5 }}>{err}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "start" }}>
        {/* ── baayen: folder ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Rail active={sel === "docs"} onClick={() => pick("docs")} ic="🗂" label={t("project_files.sab_documents")} n={docs.length} color={T.blu} />
          {docFolders.map((f) => {
            const st = folderStyle(f);
            const n = docCount(f);
            return <Rail key={f.id} active={sel === "d:" + f.id} onClick={() => pick(sel === "d:" + f.id ? "docs" : "d:" + f.id)}
              ic={st.ic} label={f.name} n={n} color={st.c} dim={!n && !f.custom} indent />;
          })}
          {canFolders && <NewFolder kind="document" nf={nf} setNf={setNf} onSave={createFolder} busy={busy === "nf"} />}

          <div style={{ height: 8 }} />
          <Rail active={sel === "photos"} onClick={() => pick("photos")} ic="📷" label={t("project_files.sab_photos")} n={photos.length} color={T.grn} />
          {photoFolders.map((f) => {
            const st = folderStyle(f);
            const n = photoCount(f);
            return <Rail key={f.id} active={sel === "p:" + f.id} onClick={() => pick(sel === "p:" + f.id ? "photos" : "p:" + f.id)}
              ic={st.ic} label={f.name} n={n} color={st.c} dim={!n && !f.custom} indent />;
          })}
          {hasFolders && !!unfiled && (
            <Rail active={sel === "pnone"} onClick={() => pick(sel === "pnone" ? "photos" : "pnone")} ic="▫"
              label={t("project_files.bina_folder")} n={unfiled} color={T.t3} indent />
          )}
          {canFolders && <NewFolder kind="photo" nf={nf} setNf={setNf} onSave={createFolder} busy={busy === "nf"} />}
          {!arch && (
            <>
              <div style={{ height: 8 }} />
              <Rail active={sel === "issues"} onClick={() => pick("issues")} ic="⚠" label={t("project_files.issue_photos")} n={issues.length} color={T.red} dim={!issues.length} />
            </>
          )}
        </div>

        {/* ── daayen: list ya grid ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          {selFolder && selFolder.custom && !arch && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
              {ren && ren.id === selFolder.id ? (
                <>
                  <input autoFocus value={ren.name} maxLength={60} onChange={(e) => setRen({ ...ren, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") renameFolder(); if (e.key === "Escape") setRen(null); }}
                    style={{ ...inp, flex: 1, padding: "5px 9px" }} />
                  <button onClick={renameFolder} disabled={busy === "ren"} style={{ ...miniBtn(T.blu, T.bluL, T.bluM), cursor: "pointer" }}>{t("common.save")}</button>
                  <button onClick={() => setRen(null)} style={{ ...miniBtn(T.t3, T.surface, T.b1), cursor: "pointer" }}>{t("common.cancel")}</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>📁 {selFolder.name}</span>
                  {!!hub?.can_folders && (
                    <button onClick={() => setRen({ id: selFolder.id, name: selFolder.name })} style={{ ...miniBtn(T.t2, T.surface, T.b1), cursor: "pointer" }}>{t("project_files.naam_badlo")}</button>
                  )}
                  {!!hub?.can_remove && (
                    <button onClick={() => deleteFolder(selFolder)} disabled={busy === "delf"} style={{ ...miniBtn(T.red, T.redL, T.redM), cursor: "pointer" }}>{t("project_files.folder_hatao")}</button>
                  )}
                </>
              )}
            </div>
          )}
          {!!tagCounts.length && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "8px 12px", borderBottom: `1px solid ${T.b1}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.t4, alignSelf: "center", marginRight: 2 }}>{t("project_files.tag")}</span>
              <Chip on={!tag} onClick={() => setTag("")}>{t("project_files.sab_tag")}</Chip>
              {tagCounts.slice(0, 20).map((x) => (
                <Chip key={x.tag} on={tag.toLowerCase() === x.tag.toLowerCase()} onClick={() => setTag(tag.toLowerCase() === x.tag.toLowerCase() ? "" : x.tag)}>
                  #{x.tag} <span style={{ opacity: 0.6 }}>{x.n}</span>
                </Chip>
              ))}
            </div>
          )}
          {isPhotoView ? (
            <PhotoGrid items={shownPhotos} arch={arch} canRemove={canRemove} busy={busy}
              onOpen={setView} onRemove={remove} onRestore={restore} isIssue={sel === "issues"} inFolder={!!selFolder} />
          ) : (
            <DocList items={shownDocs} arch={arch} canRemove={canRemove} busy={busy}
              onRemove={remove} onRestore={restore} folderOf={(d) => folderById(d.folder_id)} inFolder={!!selFolder}
              canMove={canMove} onMove={(d) => setMv({ item: d, kind: "document", folder: String(d.folder_id || ""), tags: (d.tags || []).join(", ") })} />
          )}
        </div>
      </div>

      {viewItem && (
        <PhotoViewer items={shownPhotos} index={view} onIndex={setView} onClose={() => setView(-1)}
          onRemove={arch || sel === "issues" || !canRemove(viewItem) ? null : remove} busy={busy}
          folderOf={(p) => folderById(p.folder_id)}
          onMove={canMove(viewItem) ? (p) => setMv({ item: p, kind: "photo", folder: String(p.folder_id || ""), tags: (p.tags || []).join(", ") }) : null} />
      )}

      {up && (
        <UploadModal state={up} setState={setUp} projectId={projectId} cats={hub?.cats || []}
          docFolders={docFolders.filter((f) => typeof f.id === "number")} photoFolders={photoFolders}
          onSaved={load} onDone={() => { setUp(null); load(); }} />
      )}
      {mv && (
        <MoveModal state={mv} setState={setMv} projectId={projectId}
          folders={mv.kind === "photo" ? photoFolders : docFolders.filter((f) => typeof f.id === "number")}
          onDone={() => { setMv(null); setView(-1); load(); }} />
      )}
    </div>
  );
}

/* ── upar ki ginti wali tile ── */
function Kpi({ label, n, on, onClick, color }) {
  return (
    <button onClick={onClick} style={{ padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
      border: `1.5px solid ${on ? color : T.b1}`, background: on ? T.surface : T.surfaceB, textAlign: "left" }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: on ? color : T.t1, marginRight: 6 }}>{n}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: T.t3 }}>{label}</span>
    </button>
  );
}

/* ── baayen ka folder ── */
function Rail({ active, onClick, ic, label, n, color, dim, indent }) {
  return (
    <button onClick={onClick} title={label} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left",
      padding: indent ? "6px 10px 6px 16px" : "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${active ? color : "transparent"}`, background: active ? T.surface : "transparent",
      borderLeft: `3px solid ${active ? color : "transparent"}`, opacity: dim && !active ? 0.5 : 1 }}>
      <span style={{ fontSize: 12.5 }}>{ic}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: indent ? 11 : 11.5, fontWeight: active || !indent ? 700 : 600,
        color: active ? color : T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: n ? T.t3 : T.t4 }}>{n}</span>
    </button>
  );
}

/* ── "+ Naya folder" — rail me hi likho ── */
function NewFolder({ kind, nf, setNf, onSave, busy }) {
  if (!nf || nf.kind !== kind) {
    return (
      <button onClick={() => setNf({ kind, name: "" })} style={{ textAlign: "left", padding: "5px 10px 5px 16px", border: "none",
        background: "transparent", color: T.blu, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        {t("project_files.naya_folder")}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 4, padding: "3px 4px 3px 14px" }}>
      <input autoFocus value={nf.name} maxLength={60} placeholder={t("project_files.folder_naam_ph")}
        onChange={(e) => setNf({ ...nf, name: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") setNf(null); }}
        style={{ ...inp, padding: "5px 7px", fontSize: 11.5, minWidth: 0 }} />
      <button onClick={onSave} disabled={busy || !nf.name.trim()} title={t("project_files.banao")}
        style={{ ...miniBtn(T.blu, T.bluL, T.bluM), cursor: "pointer" }}>{busy ? "…" : "✓"}</button>
      <button onClick={() => setNf(null)} title={t("common.cancel")} style={{ ...miniBtn(T.t3, T.surface, T.b1), cursor: "pointer" }}>✕</button>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, cursor: "pointer",
      fontFamily: "inherit", border: `1px solid ${on ? T.blu : T.b1}`, background: on ? T.bluL : T.surface, color: on ? T.blu : T.t3 }}>
      {children}
    </button>
  );
}

const TagLine = ({ tags }) => (tags && tags.length ? (
  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
    {tags.map((x) => <span key={x} style={{ fontSize: 9, fontWeight: 700, color: T.blu, background: T.bluL, borderRadius: 10, padding: "0 6px" }}>#{x}</span>)}
  </div>
) : null);

/* ── documents ki list ── */
function DocList({ items, arch, canRemove, busy, onRemove, onRestore, folderOf, inFolder, canMove, onMove }) {
  if (!items.length) {
    return <div style={{ padding: "34px 16px", textAlign: "center", color: T.t4, fontSize: 12 }}>
      {arch ? t("project_files.archive_khali_hai") : inFolder ? t("project_files.folder_me_abhi_kuch_nahi") : t("project_files.yahan_abhi_koi_document_nahi_upar")}
    </div>;
  }
  const cols = "1fr 160px 116px 128px";
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: cols, padding: "7px 14px",
        background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 9.5, fontWeight: 700,
        color: T.t4, textTransform: "uppercase", letterSpacing: ".5px" }}>
        <span>{t("common.naam")}</span><span>{t("project_files.folder")}</span><span>{t("project_files.kisne_kab")}</span><span style={{ textAlign: "right" }}>{t("project_files.kaam")}</span>
      </div>
      {items.map((f) => {
        const fo = folderOf(f);
        const st = fo ? folderStyle(fo) : cs(f.category);
        return (
          <div key={f.ref} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center",
            padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: T.t3, background: T.sltL, border: `1px solid ${T.b1}`,
                borderRadius: 4, padding: "2px 4px", minWidth: 30, textAlign: "center" }}>{extOf(f.url)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.title || f.category_label}
                </div>
                {f.source === "design" && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", borderRadius: 10, padding: "0 6px" }}>
                    {t("project_files.design_se")}{f.design_status ? " · " + f.design_status : ""}
                  </span>
                )}
                <TagLine tags={f.tags} />
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: st.c, background: st.bg, padding: "2px 7px", maxWidth: 150,
              borderRadius: 20, justifySelf: "start", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.ic} {fo ? fo.name : f.category_label}</span>
            <span style={{ fontSize: 10, color: T.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.by || "—"}<br />{dt(f.created_at)}
            </span>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <a href={f.url} target="_blank" rel="noreferrer" style={miniBtn(T.blu, T.bluL, T.bluM)}>{t("machinery.kholo")}</a>
              {canMove(f) && (
                <button onClick={() => onMove(f)} title={t("project_files.jagah_badlo")} style={{ ...miniBtn(T.t2, T.surface, T.b1), cursor: "pointer" }}>📁</button>
              )}
              {arch ? (canRemove(f) &&
                <button onClick={() => onRestore(f.ref)} disabled={busy === f.ref} style={{ ...miniBtn(T.grn, T.grnL, T.grnM), cursor: "pointer" }}>
                  {busy === f.ref ? "…" : t("project_files.wapas")}
                </button>
              ) : canRemove(f) ? (
                <button onClick={() => onRemove(f.ref)} disabled={busy === f.ref} title={t("project_files.archive_me_daalo")}
                  style={{ ...miniBtn(T.red, T.redL, T.redM), cursor: "pointer" }}>
                  {busy === f.ref ? "…" : t("common.hatao")}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── photo ka grid ── */
function PhotoGrid({ items, arch, canRemove, busy, onOpen, onRemove, onRestore, isIssue, inFolder }) {
  if (!items.length) {
    return <div style={{ padding: "34px 16px", textAlign: "center", color: T.t4, fontSize: 12 }}>
      {arch ? t("project_files.archive_me_koi_photo_nahi") : isIssue
        ? t("project_files.kisi_issue_ke_saath_abhi_koi")
        : inFolder ? t("project_files.folder_me_abhi_kuch_nahi")
        : t("project_files.is_site_ki_koi_photo_nahi")}
    </div>;
  }
  return (
    <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(126px,1fr))", gap: 9 }}>
      {items.map((m, i) => (
        <div key={m.ref} style={{ position: "relative", borderRadius: 9, overflow: "hidden", border: `1px solid ${T.b1}` }}>
          <div onClick={() => onOpen(i)} style={{ position: "relative", paddingTop: "76%", background: T.sltL, cursor: "zoom-in" }}>
            <img src={cld(m.url, "tile")} alt="" loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 7px 4px",
              background: "linear-gradient(transparent, rgba(0,0,0,.78))", color: "#fff", fontSize: 9.5,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {m.task_name || m.caption || dt(m.created_at)}
              {!!(m.tags && m.tags.length) && <span style={{ opacity: 0.75 }}> · #{m.tags.join(" #")}</span>}
            </div>
            {m.lat != null && (
              <span title={t("project_files.is_photo_par_jagah_likhi_hai")} style={{ position: "absolute", top: 5, left: 5, fontSize: 9,
                background: "rgba(5,150,105,.92)", color: "#fff", padding: "1px 5px", borderRadius: 20, fontWeight: 700 }}>📍</span>
            )}
            {isIssue && m.status && (
              <span style={{ position: "absolute", top: 5, right: 5, fontSize: 8.5, background: "rgba(220,38,38,.92)",
                color: "#fff", padding: "1px 5px", borderRadius: 20, fontWeight: 700 }}>{m.status}</span>
            )}
          </div>
          {!isIssue && (arch ? (canRemove(m) &&
            <button onClick={() => onRestore(m.ref)} disabled={busy === m.ref}
              style={{ position: "absolute", top: 5, right: 5, ...roundBtn("rgba(5,150,105,.92)") }}>↩</button>
          ) : canRemove(m) ? (
            <button onClick={() => onRemove(m.ref)} disabled={busy === m.ref} title={t("project_files.archive_me_daalo")}
              style={{ position: "absolute", top: 5, right: 5, ...roundBtn("rgba(15,23,42,.62)") }}>✕</button>
          ) : null)}
        </div>
      ))}
    </div>
  );
}

/* ── photo bada karke dekhne wala ── */
function PhotoViewer({ items, index, onIndex, onClose, onRemove, busy, folderOf, onMove }) {
  const m = items[index];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onIndex, onClose]);
  const fo = folderOf(m);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 1400,
      display: "flex", flexDirection: "column" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 10,
        padding: "12px 18px", color: "#fff", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.task_name || m.caption || t("overview.site_photo")}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 2 }}>
            {dt(m.created_at)}{m.by ? ` · ${m.by}` : ""} · {index + 1}/{items.length}
            {fo ? ` · 📁 ${fo.name}` : ""}{m.tags && m.tags.length ? ` · #${m.tags.join(" #")}` : ""}
            {m.lat != null && m.lng != null ? ` · 📍 ${Number(m.lat).toFixed(5)}, ${Number(m.lng).toFixed(5)}` : ""}
          </div>
        </div>
        <a href={m.url} target="_blank" rel="noreferrer" style={{ ...vBtn, textDecoration: "none" }}>{t("project_files.asli_kholo")}</a>
        {onMove && <button onClick={() => onMove(m)} style={vBtn}>{t("project_files.folder_btn")}</button>}
        {onRemove && (
          <button onClick={() => onRemove(m.ref)} disabled={busy === m.ref}
            style={{ ...vBtn, background: "rgba(220,38,38,.85)" }}>{busy === m.ref ? "…" : t("common.hatao")}</button>
        )}
        <button onClick={onClose} style={vBtn}>{t("common.band")}</button>
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, overflow: "hidden", display: "flex",
        alignItems: "center", justifyContent: "center" }}>
        <img src={cld(m.url, "full")} alt="" style={{ maxWidth: "92%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center", gap: 16,
        padding: "10px 0 16px", flexShrink: 0 }}>
        <button onClick={() => index > 0 && onIndex(index - 1)} disabled={index === 0}
          style={{ ...vBtn, opacity: index === 0 ? 0.35 : 1 }}>{t("overview.pichhla")}</button>
        <button onClick={() => index < items.length - 1 && onIndex(index + 1)} disabled={index === items.length - 1}
          style={{ ...vBtn, opacity: index === items.length - 1 ? 0.35 : 1 }}>{t("overview.agla")}</button>
      </div>
    </div>
  );
}

/* ── folder ka dabba (upload aur jagah badlo dono me) ── */
function FolderPick({ value, onChange, folders, allowNone }) {
  return (
    <PickSelect value={value} onChange={(e) => onChange(e.target.value)} style={inp}>
      {allowNone && <option value="">{t("project_files.bina_folder")}</option>}
      {folders.map((f) => <option key={f.id} value={String(f.id)}>{folderStyle(f).ic} {f.name}</option>)}
    </PickSelect>
  );
}

/* ── nayi file chadhane wala (photo ek saath kai) ── */
function UploadModal({ state, setState, projectId, cats, docFolders, photoFolders, onSaved, onDone }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const set = (k, v) => setState({ ...state, [k]: v });
  const files = state.files || [];
  const isPhoto = state.kind === "photo";
  const folders = isPhoto ? photoFolders : docFolders;
  // Upload ki kism badli to folder bhi us kism ka pehla sahi wala.
  const setKind = (k) => {
    const fl = k === "photo" ? photoFolders : docFolders;
    const def = fl.find((f) => f.sys_key === (k === "photo" ? "photo_progress" : "other")) || fl[0];
    setState({ ...state, kind: k, folder: def ? String(def.id) : "", files: [] });
  };

  const go = async () => {
    if (!files.length) { setErr(t("project_files.pehle_file_chuno")); return; }
    setErr("");
    let done = 0;
    try {
      for (const file of files) {
        setBusy(files.length > 1 ? t("project_files.upload_n", { i: done + 1, n: files.length }) : t("project_files.upload_ho_rahi"));
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", PRESET);
        const cr = await (await fetch(CLOUD, { method: "POST", body: fd })).json();
        if (!cr.secure_url) throw new Error(cr?.error?.message || t("project_files.upload_nahi_hui"));
        const r = await api.post(`/projects/${projectId}/files`, {
          kind: state.kind,
          category: !isPhoto && !docFolders.length ? state.category : null,
          folder_id: folders.length && state.folder ? Number(state.folder) : null,
          tags: state.tags || "",
          title: (files.length === 1 && state.title) || file.name,
          file_url: cr.secure_url,
        });
        if (!r?.success) throw new Error(r?.message || t("project_files.save_nahi_hua"));
        done += 1;
      }
      setBusy("");
      onDone();
    } catch (e) {
      setBusy("");
      if (done) { onSaved(); setState({ ...state, files: files.slice(done) }); }
      setErr(done ? t("project_files.n_upload_hui", { done, n: files.length, msg: e.message }) : (e.message || t("project_files.upload_nahi_hui")));
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget && !busy) setState(null); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 220, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(460px,100%)", overflow: "hidden" }}>
        <div style={{ padding: "13px 17px", borderBottom: `1px solid ${T.b1}`, fontSize: 14, fontWeight: 800, color: T.t1 }}>
         {t("project_files.nayi_file")}
        </div>
        <div style={{ padding: "14px 17px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["document", "📄 Document"], ["photo", "📷 Site photo"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setKind(k)} disabled={!!busy}
                style={{ flex: 1, padding: "8px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", border: `1.5px solid ${state.kind === k ? T.blu : T.b1}`,
                  background: state.kind === k ? T.bluL : T.surface, color: state.kind === k ? T.blu : T.t3 }}>{lbl}</button>
            ))}
          </div>

          {folders.length ? (
            <>
              <Lbl>{t("project_files.folder")}</Lbl>
              <FolderPick value={state.folder} onChange={(v) => set("folder", v)} folders={folders} allowNone={isPhoto} />
            </>
          ) : !isPhoto && (
            <>
              <Lbl>{t("project_files.shreni")}</Lbl>
              <PickSelect value={state.category} onChange={(e) => set("category", e.target.value)} style={inp}>
                {(cats.length ? cats : [{ id: "other", label: t("project_files.other_documents") }]).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </PickSelect>
            </>
          )}

          {files.length <= 1 && (
            <>
              <Lbl>{t("common.naam")} <span style={{ color: T.t4, fontWeight: 400 }}>{t("project_files.chhod_do_to_file_ka_naam")}</span></Lbl>
              <input value={state.title} onChange={(e) => set("title", e.target.value)}
                placeholder={t("project_files.jaise_ra_2_bill_gfc_drawing")} style={inp} />
            </>
          )}

          {!!folders.length && (
            <>
              <Lbl>{t("project_files.tag")}</Lbl>
              <input value={state.tags || ""} maxLength={200} onChange={(e) => set("tags", e.target.value)}
                placeholder={t("project_files.tag_ph")} style={inp} />
            </>
          )}

          <label style={{ display: "block", marginTop: 12, padding: 14, borderRadius: 9, cursor: "pointer",
            border: `1.5px dashed ${files.length ? T.grn : T.b2}`, background: files.length ? T.grnL : T.surfaceB,
            textAlign: "center", fontSize: 12.5, color: files.length ? "#065F46" : T.t3 }}>
            {files.length > 1 ? `✓ ${t("project_files.n_files", { n: files.length })}`
              : files.length ? `✓ ${files[0].name}`
              : (isPhoto ? t("project_files.photo_chuno") : t("project_files.file_chuno_pdf_image_excel"))}
            {isPhoto && !files.length && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{t("project_files.kai_photo_hint")}</div>}
            <input type="file" style={{ display: "none" }} multiple={isPhoto}
              accept={isPhoto ? "image/*" : undefined}
              onChange={(e) => set("files", Array.from(e.target.files || []).slice(0, 30))} />
          </label>

          {!!err && <div style={{ marginTop: 11, background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
            borderRadius: 8, padding: "8px 11px", fontSize: 11.5 }}>{err}</div>}
          {!!busy && <div style={{ marginTop: 11, fontSize: 12, color: T.blu, textAlign: "center" }}>{busy}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "11px 16px", borderTop: `1px solid ${T.b1}` }}>
          <button onClick={() => setState(null)} disabled={!!busy} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
          <button onClick={go} disabled={!!busy || !files.length}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", color: "#fff", background: files.length ? T.blu : T.b2,
              cursor: files.length ? "pointer" : "default" }}>{busy ? "…" : t("project_files.chadha_do")}</button>
        </div>
      </div>
    </div>
  );
}

/* ── file ka folder / tag badlo ── */
function MoveModal({ state, setState, projectId, folders, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    const r = await api.patch(`/projects/${projectId}/files/${fileId(state.item)}`, {
      folder_id: state.folder ? Number(state.folder) : null, tags: state.tags || "" });
    setBusy(false);
    if (!r?.success) { setErr(r?.message || t("project_files.save_nahi_hua")); return; }
    onDone();
  };
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) setState(null); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1500, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(400px,100%)", overflow: "hidden" }}>
        <div style={{ padding: "13px 17px", borderBottom: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>{t("project_files.jagah_badlo")}</div>
          <div style={{ fontSize: 11, color: T.t4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {state.item.title || state.item.caption || state.item.category_label || ""}
          </div>
        </div>
        <div style={{ padding: "6px 17px 14px" }}>
          <Lbl>{t("project_files.folder")}</Lbl>
          <FolderPick value={state.folder} onChange={(v) => setState({ ...state, folder: v })} folders={folders} allowNone={state.kind === "photo"} />
          <Lbl>{t("project_files.tag")}</Lbl>
          <input value={state.tags} maxLength={200} onChange={(e) => setState({ ...state, tags: e.target.value })}
            placeholder={t("project_files.tag_ph")} style={inp} />
          {!!err && <div style={{ marginTop: 11, background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
            borderRadius: 8, padding: "8px 11px", fontSize: 11.5 }}>{err}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "11px 16px", borderTop: `1px solid ${T.b1}` }}>
          <button onClick={() => setState(null)} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
          <button onClick={save} disabled={busy}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", color: "#fff", background: T.blu, cursor: "pointer" }}>{busy ? "…" : t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}

const Lbl = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase",
    letterSpacing: ".4px", margin: "10px 0 4px" }}>{children}</div>
);
const inp = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7,
  border: `1px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", fontFamily: "inherit" };
const miniBtn = (c, bg, bd) => ({ padding: "3px 9px", borderRadius: 5, background: bg, border: `1px solid ${bd}`,
  color: c, fontSize: 10, fontWeight: 700, textDecoration: "none", fontFamily: "inherit" });
const roundBtn = (bg) => ({ width: 21, height: 21, borderRadius: "50%", border: "none", background: bg,
  color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", lineHeight: "21px", padding: 0, fontFamily: "inherit" });
const vBtn = { background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 7,
  padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
