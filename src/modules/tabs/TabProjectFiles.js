import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";

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
     • documents  — shreni ke hisaab se (purane naam bhi sudhar kar)
     • site photos — Overview se li gayi + task ke andar li gayi
     • issue photos — jo issue ke saath lagi thi

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

const extOf = (url) => {
  const m = String(url || "").split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toUpperCase() : "FILE";
};
const dt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

export default function TabProjectFiles({ projectId }) {
  const [hub, setHub] = useState(null);     // null = load ho raha hai
  const [sel, setSel] = useState("docs");   // "docs" | "<catId>" | "photos" | "issues"
  const [arch, setArch] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [up, setUp] = useState(null);       // upload modal
  const [view, setView] = useState(-1);     // photo viewer ka index

  const load = useCallback(() => {
    setErr("");
    api.get(`/projects/${projectId}/file-hub${arch ? "?archived=1" : ""}`)
      .then((r) => setHub(r?.success ? r.data : { documents: [], photos: [], issue_photos: [], cats: [] }))
      .catch(() => setHub({ documents: [], photos: [], issue_photos: [], cats: [] }));
  }, [projectId, arch]);

  useEffect(() => { setHub(null); load(); }, [load]);

  const docs = hub?.documents || [];
  const photos = hub?.photos || [];
  const issues = hub?.issue_photos || [];
  const cats = hub?.cats || [];
  const canRemove = !!hub?.can_remove;

  const shownDocs = useMemo(
    () => (sel === "docs" ? docs : docs.filter((d) => d.category === sel)),
    [docs, sel]);
  const shownPhotos = sel === "issues" ? issues : photos;

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

  if (hub === null) return <div style={{ textAlign: "center", padding: 60, color: T.t4, fontSize: 12.5 }}>Files aa rahi hain…</div>;

  const isPhotoView = sel === "photos" || sel === "issues";

  return (
    <div style={{ padding: "14px 0" }}>
      {/* ── upar ki patti: ginti + archive + upload ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Kpi label="Documents" n={docs.length} on={sel === "docs" || cats.some((c) => c.id === sel)}
          onClick={() => setSel("docs")} color={T.blu} />
        <Kpi label="Site photos" n={photos.length} on={sel === "photos"}
          onClick={() => setSel("photos")} color={T.grn} />
        <Kpi label="Issue photos" n={issues.length} on={sel === "issues"}
          onClick={() => setSel("issues")} color={T.red} />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setArch(!arch); setSel(sel === "issues" ? "docs" : sel); }}
          style={{ padding: "7px 13px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", border: `1px solid ${arch ? T.amb : T.b1}`,
            background: arch ? T.ambL : T.surface, color: arch ? T.amb : T.t3 }}>
          {arch ? "← Chaalu files" : "🗄 Archive"}
        </button>
        {!arch && (
          <button onClick={() => setUp({ kind: "document", category: "other", title: "", file: null })}
            style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: T.blu, color: "#fff",
              fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ＋ File daalo
          </button>
        )}
      </div>

      {arch && (
        <div style={{ marginBottom: 10, background: T.ambL, border: `1px solid ${T.ambM}`, color: "#92400E",
          borderRadius: 8, padding: "8px 12px", fontSize: 11.5 }}>
          🗄 Ye archive hai — hatai gayi cheezein yahan padi rehti hain, mitti nahi. Kabhi bhi wapas la sakte ho.
        </div>
      )}
      {!!err && (
        <div style={{ marginBottom: 10, background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
          borderRadius: 8, padding: "8px 12px", fontSize: 11.5 }}>{err}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 12, alignItems: "start" }}>
        {/* ── baayen: shreni ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Rail active={sel === "docs"} onClick={() => setSel("docs")} ic="🗂" label="Sab documents" n={docs.length} color={T.blu} />
          {cats.map((c) => (
            <Rail key={c.id} active={sel === c.id} onClick={() => setSel(sel === c.id ? "docs" : c.id)}
              ic={cs(c.id).ic} label={c.label} n={c.count} color={cs(c.id).c} dim={!c.count} />
          ))}
          <div style={{ height: 6 }} />
          <Rail active={sel === "photos"} onClick={() => setSel("photos")} ic="📷" label="Site photos" n={photos.length} color={T.grn} />
          {!arch && (
            <Rail active={sel === "issues"} onClick={() => setSel("issues")} ic="⚠" label="Issue photos" n={issues.length} color={T.red} dim={!issues.length} />
          )}
        </div>

        {/* ── daayen: list ya grid ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          {isPhotoView ? (
            <PhotoGrid items={shownPhotos} arch={arch} canRemove={canRemove} busy={busy}
              onOpen={setView} onRemove={remove} onRestore={restore} isIssue={sel === "issues"} />
          ) : (
            <DocList items={shownDocs} arch={arch} canRemove={canRemove} busy={busy}
              onRemove={remove} onRestore={restore} />
          )}
        </div>
      </div>

      {view >= 0 && shownPhotos[view] && (
        <PhotoViewer items={shownPhotos} index={view} onIndex={setView} onClose={() => setView(-1)}
          onRemove={arch || sel === "issues" || !canRemove ? null : remove} busy={busy} />
      )}

      {up && (
        <UploadModal state={up} setState={setUp} projectId={projectId} cats={cats}
          onDone={() => { setUp(null); load(); }} />
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

/* ── baayen ki shreni ── */
function Rail({ active, onClick, ic, label, n, color, dim }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left",
      padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${active ? color : "transparent"}`, background: active ? T.surface : "transparent",
      borderLeft: `3px solid ${active ? color : "transparent"}`, opacity: dim && !active ? 0.5 : 1 }}>
      <span style={{ fontSize: 12.5 }}>{ic}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: active ? 700 : 600,
        color: active ? color : T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: n ? T.t3 : T.t4 }}>{n}</span>
    </button>
  );
}

/* ── documents ki list ── */
function DocList({ items, arch, canRemove, busy, onRemove, onRestore }) {
  if (!items.length) {
    return <div style={{ padding: "34px 16px", textAlign: "center", color: T.t4, fontSize: 12 }}>
      {arch ? "Archive khali hai." : "Yahan abhi koi document nahi. Upar ＋ File daalo se chadha do — mobile se daale hue kaagaz bhi yahin dikhte hain."}
    </div>;
  }
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 116px 96px", padding: "7px 14px",
        background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 9.5, fontWeight: 700,
        color: T.t4, textTransform: "uppercase", letterSpacing: ".5px" }}>
        <span>Naam</span><span>Shreni</span><span>Kisne / kab</span><span style={{ textAlign: "right" }}>Kaam</span>
      </div>
      {items.map((f) => {
        const st = cs(f.category);
        return (
          <div key={f.ref} style={{ display: "grid", gridTemplateColumns: "1fr 150px 116px 96px", alignItems: "center",
            padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: T.t3, background: T.sltL, border: `1px solid ${T.b1}`,
                borderRadius: 4, padding: "2px 4px", minWidth: 30, textAlign: "center" }}>{extOf(f.url)}</span>
              <span style={{ fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.title || f.category_label}
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: st.c, background: st.bg, padding: "2px 7px",
              borderRadius: 20, justifySelf: "start" }}>{st.ic} {f.category_label}</span>
            <span style={{ fontSize: 10, color: T.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.by || "—"}<br />{dt(f.created_at)}
            </span>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
              <a href={f.url} target="_blank" rel="noreferrer" style={miniBtn(T.blu, T.bluL, T.bluM)}>Kholo</a>
              {arch ? (
                <button onClick={() => onRestore(f.ref)} disabled={busy === f.ref} style={{ ...miniBtn(T.grn, T.grnL, T.grnM), cursor: "pointer" }}>
                  {busy === f.ref ? "…" : "Wapas"}
                </button>
              ) : canRemove ? (
                <button onClick={() => onRemove(f.ref)} disabled={busy === f.ref} title="Archive me daalo"
                  style={{ ...miniBtn(T.red, T.redL, T.redM), cursor: "pointer" }}>
                  {busy === f.ref ? "…" : "Hatao"}
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
function PhotoGrid({ items, arch, canRemove, busy, onOpen, onRemove, onRestore, isIssue }) {
  if (!items.length) {
    return <div style={{ padding: "34px 16px", textAlign: "center", color: T.t4, fontSize: 12 }}>
      {arch ? "Archive me koi photo nahi." : isIssue
        ? "Kisi issue ke saath abhi koi photo nahi lagi."
        : "Is site ki koi photo nahi. Mobile se li gayi photo — Overview se ya task ke andar se — dono yahin aati hain."}
    </div>;
  }
  return (
    <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(126px,1fr))", gap: 9 }}>
      {items.map((m, i) => (
        <div key={m.ref} style={{ position: "relative", borderRadius: 9, overflow: "hidden", border: `1px solid ${T.b1}` }}>
          <div onClick={() => onOpen(i)} style={{ position: "relative", paddingTop: "76%", background: T.sltL, cursor: "zoom-in" }}>
            <img src={m.url} alt="" loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 7px 4px",
              background: "linear-gradient(transparent, rgba(0,0,0,.78))", color: "#fff", fontSize: 9.5,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {m.task_name || m.caption || dt(m.created_at)}
            </div>
            {m.lat != null && (
              <span title="Is photo par jagah likhi hai" style={{ position: "absolute", top: 5, left: 5, fontSize: 9,
                background: "rgba(5,150,105,.92)", color: "#fff", padding: "1px 5px", borderRadius: 20, fontWeight: 700 }}>📍</span>
            )}
            {isIssue && m.status && (
              <span style={{ position: "absolute", top: 5, right: 5, fontSize: 8.5, background: "rgba(220,38,38,.92)",
                color: "#fff", padding: "1px 5px", borderRadius: 20, fontWeight: 700 }}>{m.status}</span>
            )}
          </div>
          {!isIssue && (arch ? (
            <button onClick={() => onRestore(m.ref)} disabled={busy === m.ref}
              style={{ position: "absolute", top: 5, right: 5, ...roundBtn("rgba(5,150,105,.92)") }}>↩</button>
          ) : canRemove ? (
            <button onClick={() => onRemove(m.ref)} disabled={busy === m.ref} title="Archive me daalo"
              style={{ position: "absolute", top: 5, right: 5, ...roundBtn("rgba(15,23,42,.62)") }}>✕</button>
          ) : null)}
        </div>
      ))}
    </div>
  );
}

/* ── photo bada karke dekhne wala ── */
function PhotoViewer({ items, index, onIndex, onClose, onRemove, busy }) {
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

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 1400,
      display: "flex", flexDirection: "column" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 10,
        padding: "12px 18px", color: "#fff", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.task_name || m.caption || "Site photo"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 2 }}>
            {dt(m.created_at)}{m.by ? ` · ${m.by}` : ""} · {index + 1}/{items.length}
            {m.lat != null && m.lng != null ? ` · 📍 ${Number(m.lat).toFixed(5)}, ${Number(m.lng).toFixed(5)}` : ""}
          </div>
        </div>
        <a href={m.url} target="_blank" rel="noreferrer" style={{ ...vBtn, textDecoration: "none" }}>Asli kholo</a>
        {onRemove && (
          <button onClick={() => onRemove(m.ref)} disabled={busy === m.ref}
            style={{ ...vBtn, background: "rgba(220,38,38,.85)" }}>{busy === m.ref ? "…" : "Hatao"}</button>
        )}
        <button onClick={onClose} style={vBtn}>Band</button>
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, overflow: "hidden", display: "flex",
        alignItems: "center", justifyContent: "center" }}>
        <img src={m.url} alt="" style={{ maxWidth: "92%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center", gap: 16,
        padding: "10px 0 16px", flexShrink: 0 }}>
        <button onClick={() => index > 0 && onIndex(index - 1)} disabled={index === 0}
          style={{ ...vBtn, opacity: index === 0 ? 0.35 : 1 }}>← Pichhla</button>
        <button onClick={() => index < items.length - 1 && onIndex(index + 1)} disabled={index === items.length - 1}
          style={{ ...vBtn, opacity: index === items.length - 1 ? 0.35 : 1 }}>Agla →</button>
      </div>
    </div>
  );
}

/* ── nayi file chadhane wala ── */
function UploadModal({ state, setState, projectId, cats, onDone }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const set = (k, v) => setState({ ...state, [k]: v });

  const go = async () => {
    if (!state.file) { setErr("Pehle file chuno"); return; }
    setErr(""); setBusy("Upload ho rahi hai…");
    try {
      const fd = new FormData();
      fd.append("file", state.file);
      fd.append("upload_preset", PRESET);
      const cr = await (await fetch(CLOUD, { method: "POST", body: fd })).json();
      if (!cr.secure_url) throw new Error(cr?.error?.message || "Cloud upload nahi hui");
      setBusy("Save ho raha hai…");
      const r = await api.post(`/projects/${projectId}/files`, {
        kind: state.kind,
        category: state.kind === "document" ? state.category : null,
        title: state.title || state.file.name,
        file_url: cr.secure_url,
      });
      setBusy("");
      if (!r?.success) { setErr(r?.message || "Save nahi hua"); return; }
      onDone();
    } catch (e) { setBusy(""); setErr(e.message || "Upload nahi hui"); }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) setState(null); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 200, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ background: T.surface, borderRadius: 12, width: "min(460px,100%)", overflow: "hidden" }}>
        <div style={{ padding: "13px 17px", borderBottom: `1px solid ${T.b1}`, fontSize: 14, fontWeight: 800, color: T.t1 }}>
          Nayi file
        </div>
        <div style={{ padding: "14px 17px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["document", "📄 Document"], ["photo", "📷 Site photo"]].map(([k, lbl]) => (
              <button key={k} onClick={() => set("kind", k)}
                style={{ flex: 1, padding: "8px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", border: `1.5px solid ${state.kind === k ? T.blu : T.b1}`,
                  background: state.kind === k ? T.bluL : T.surface, color: state.kind === k ? T.blu : T.t3 }}>{lbl}</button>
            ))}
          </div>

          {state.kind === "document" && (
            <>
              <Lbl>Shreni</Lbl>
              <select value={state.category} onChange={(e) => set("category", e.target.value)} style={inp}>
                {(cats.length ? cats : [{ id: "other", label: "Other Documents" }]).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </>
          )}

          <Lbl>Naam <span style={{ color: T.t4, fontWeight: 400 }}>(chhod do to file ka naam lag jayega)</span></Lbl>
          <input value={state.title} onChange={(e) => set("title", e.target.value)}
            placeholder="जैसे: RA-2 bill, GFC drawing rev-3" style={inp} />

          <label style={{ display: "block", marginTop: 12, padding: 14, borderRadius: 9, cursor: "pointer",
            border: `1.5px dashed ${state.file ? T.grn : T.b2}`, background: state.file ? T.grnL : T.surfaceB,
            textAlign: "center", fontSize: 12.5, color: state.file ? "#065F46" : T.t3 }}>
            {state.file ? `✓ ${state.file.name}` : (state.kind === "photo" ? "Photo chuno" : "File chuno (PDF / image / Excel)")}
            <input type="file" style={{ display: "none" }}
              accept={state.kind === "photo" ? "image/*" : undefined}
              onChange={(e) => set("file", e.target.files?.[0] || null)} />
          </label>

          {!!err && <div style={{ marginTop: 11, background: T.redL, border: `1px solid ${T.redM}`, color: "#991B1B",
            borderRadius: 8, padding: "8px 11px", fontSize: 11.5 }}>{err}</div>}
          {!!busy && <div style={{ marginTop: 11, fontSize: 12, color: T.blu, textAlign: "center" }}>{busy}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "11px 16px", borderTop: `1px solid ${T.b1}` }}>
          <button onClick={() => setState(null)} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`,
            background: T.surface, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={go} disabled={!!busy || !state.file}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 700,
              fontFamily: "inherit", color: "#fff", background: state.file ? T.blu : T.b2,
              cursor: state.file ? "pointer" : "default" }}>{busy ? "…" : "Chadha do"}</button>
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
