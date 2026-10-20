// Agreement & documents of a paying client — the signed deal, quotation, PO
// and add-on approvals, so a rate or deal question is always answered from
// the paper. Client-level: every company of the client shows the same list
// (Customers → client, and the company's Agreement tab). Nothing is
// hard-deleted — a removed file stays on record with who, when and why.
import { useState, useEffect, useCallback } from "react";
import { apiFetch, T, fmtDate, fmtDateTime, IcPlus, IcDownload, IcX, IcChk, IcFolder } from "./tokens";
import { Badge, Btn, InputField, SelectField } from "./ui";
import { todayISO } from "../../utils/today";

const CLOUD_NAME = "dd632nqfm";
const UPLOAD_PRESET = "gb_buildcon_drawings";

const DOC_TYPES = [
  { value: "agreement",      label: "Agreement" },
  { value: "quotation",      label: "Quotation" },
  { value: "work_order",     label: "Work Order / PO" },
  { value: "addon_approval", label: "Add-on Approval" },
  { value: "other",          label: "Other" },
];
const TYPE_LABEL = Object.fromEntries(DOC_TYPES.map(t => [t.value, t.label]));

// Straight to Cloudinary like every other attachment in the app; PDF and
// Office files go up as "raw" so they download as the original file.
async function uploadDocFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "sanchalan/saas_agreements");
  const raw = file.type === "application/pdf" || /\.(pdf|doc|docx|xls|xlsx)$/i.test(file.name);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${raw ? "raw" : "image"}/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");
  return { file_url: data.secure_url, file_name: file.name, file_size: file.size };
}

const sizeStr = (b) => !b ? "" : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(Math.round(b / 1024), 1)} KB`;

const EMPTY = { doc_type: "agreement", title: "", doc_date: "", notes: "", is_final: true };

function ClientDocuments({ clientId, setToast }) {
  const [docs, setDocs] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiFetch(`/saas-admin/clients/${clientId}/documents`)
      .then(res => setDocs(res.success ? res.data : []))
      .catch(() => setDocs([]));
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  const toast = (msg, type) => setToast && setToast({ msg, type });

  const save = async () => {
    if (!file) return toast("File chuno", "error");
    if (!f.title.trim()) return toast("File ka naam likho", "error");
    setSaving(true);
    try {
      const up = await uploadDocFile(file);
      const res = await apiFetch(`/saas-admin/clients/${clientId}/documents`, {
        method: "POST", body: { ...f, is_final: f.doc_type === "agreement" && f.is_final, ...up },
      });
      if (res.success) {
        toast(res.message || "File save ho gayi");
        setShowForm(false); setF(EMPTY); setFile(null); load();
      } else toast(res.message || "Failed", "error");
    } catch (e) {
      toast(e.message || "Upload failed", "error");
    }
    setSaving(false);
  };

  const post = async (path, body, okMsg) => {
    const res = await apiFetch(path, { method: "POST", body: body || {} });
    if (res.success) { toast(res.message || okMsg); load(); }
    else toast(res.message || "Failed", "error");
  };

  const remove = (d) => {
    const reason = window.prompt(`"${d.title}" hatane ki wajah? (file record me rahegi)`);
    if (reason === null) return;
    post(`/saas-admin/client-documents/${d.id}/remove`, { reason });
  };

  const live = (docs || []).filter(d => !d.removed_at);
  const removed = (docs || []).filter(d => d.removed_at);
  const final = live.find(d => d.is_final);
  const rest = live.filter(d => !d.is_final);

  const docMeta = (d) => [
    TYPE_LABEL[d.doc_type] || d.doc_type,
    d.doc_date && fmtDate(d.doc_date),
    d.addon_qty && `Add-on +${d.addon_qty} (seat ${d.addon_seat_from}–${d.addon_seat_to})`,
    sizeStr(d.file_size),
  ].filter(Boolean).join(" · ");

  const openBtn = (d) => (
    <a href={d.file_url} target="_blank" rel="noreferrer"
      style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surface, color: T.t2,
        fontSize: 10.5, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <IcDownload size={11}/> Kholo
    </a>
  );

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>Agreement & Documents</div>
          <div style={{ fontSize: 10.5, color: T.t4 }}>Deal ka kaagaz — rate ya terms par sawaal ho to yahi dekho. File kabhi delete nahi hoti.</div>
        </div>
        {!showForm && <Btn onClick={() => setShowForm(true)} style={{ padding: "5px 10px", fontSize: 11.5 }}><IcPlus size={12}/> File jodo</Btn>}
      </div>

      {showForm && (
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: 10 }}>
            <SelectField label="Type" value={f.doc_type} onChange={v => setF(p => ({ ...p, doc_type: v }))} options={DOC_TYPES}/>
            <InputField label="Naam" required value={f.title} onChange={v => setF(p => ({ ...p, title: v }))} placeholder="Signed Agreement 2026-27"/>
            <InputField label="Date" type="date" value={f.doc_date || todayISO()} onChange={v => setF(p => ({ ...p, doc_date: v }))}/>
          </div>
          <InputField label="Note" value={f.notes} onChange={v => setF(p => ({ ...p, notes: v }))} placeholder="Optional — jaise 'Rate ₹10,000/user, 30 users committed'"/>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ fontSize: 12, color: T.t2 }}/>
            {f.doc_type === "agreement" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, cursor: "pointer" }}>
                <input type="checkbox" checked={f.is_final} onChange={e => setF(p => ({ ...p, is_final: e.target.checked }))}/>
                Ye Final Agreement hai (pichhla "Purana" ban jayega)
              </label>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="outline" onClick={() => { setShowForm(false); setF(EMPTY); setFile(null); }} style={{ padding: "5px 12px", fontSize: 11.5 }}>Cancel</Btn>
            <Btn onClick={save} disabled={saving} style={{ padding: "5px 12px", fontSize: 11.5 }}>{saving ? "Upload ho raha hai..." : "Save"}</Btn>
          </div>
        </div>
      )}

      {docs === null && <div style={{ padding: "18px 16px", fontSize: 12, color: T.t4 }}>Loading...</div>}

      {docs !== null && (
        <div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 12 }}>
            <IcFolder size={18} color={final ? T.grn : T.t4}/>
            {final ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, display: "flex", alignItems: "center", gap: 8 }}>
                    {final.title} <Badge text="FINAL AGREEMENT" color={T.grn}/>
                  </div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>
                    {docMeta(final)} · {final.uploaded_by_name || "--"}, {fmtDateTime(final.created_at)}
                  </div>
                  {final.notes && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{final.notes}</div>}
                </div>
                {openBtn(final)}
              </>
            ) : (
              <div style={{ fontSize: 12, color: T.amb, fontWeight: 600 }}>Final Agreement abhi upload nahi hua.</div>
            )}
          </div>

          {rest.map(d => (
            <div key={d.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.t1, display: "flex", alignItems: "center", gap: 8 }}>
                  {d.title}
                  {d.doc_type === "agreement" && <Badge text="Purana" color={T.slt}/>}
                </div>
                <div style={{ fontSize: 10.5, color: T.t4 }}>{docMeta(d)} · {d.uploaded_by_name || "--"}, {fmtDateTime(d.created_at)}</div>
                {d.notes && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{d.notes}</div>}
              </div>
              {openBtn(d)}
              {d.doc_type === "agreement" && (
                <button onClick={() => window.confirm(`"${d.title}" ko Final Agreement banana hai?`) && post(`/saas-admin/client-documents/${d.id}/final`)}
                  style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surface, color: T.grn, fontSize: 10.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IcChk size={11}/> Final banao
                </button>
              )}
              <button onClick={() => remove(d)} title="Hatao — record me rahegi"
                style={{ padding: "3px 7px", borderRadius: 6, border: `1px solid ${T.redM}`, background: T.redL, color: T.red, fontSize: 10.5, cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                <IcX size={11}/>
              </button>
            </div>
          ))}
          {final && (
            <div style={{ padding: "8px 16px", display: "flex", justifyContent: "flex-end", borderBottom: removed.length ? `1px solid ${T.b1}` : "none" }}>
              <button onClick={() => remove(final)}
                style={{ padding: 0, border: "none", background: "none", color: T.t4, fontSize: 10.5, cursor: "pointer", textDecoration: "underline" }}>
                Final Agreement galat hai? Hatao
              </button>
            </div>
          )}

          {removed.length > 0 && (
            <div style={{ padding: "8px 16px" }}>
              <button onClick={() => setShowRemoved(v => !v)}
                style={{ padding: 0, border: "none", background: "none", color: T.t3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {showRemoved ? "▾" : "▸"} Hatayi gayi files ({removed.length})
              </button>
              {showRemoved && removed.map(d => (
                <div key={d.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.b1}`, marginTop: 6, display: "flex", alignItems: "center", gap: 10, opacity: 0.7 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: T.t2, textDecoration: "line-through" }}>{d.title}</div>
                    <div style={{ fontSize: 10.5, color: T.t4 }}>{docMeta(d)} · hatayi {fmtDateTime(d.removed_at)} — {d.remove_reason}</div>
                  </div>
                  {openBtn(d)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { uploadDocFile };
export default ClientDocuments;
