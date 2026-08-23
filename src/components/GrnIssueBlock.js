// ── GRN ISSUE BLOCK ────────────────────────────────────────────
// "Maal aate hi problem dikh gayi" — the site person reports it while
// the truck is still being unloaded, instead of saving the GRN and then
// hunting for the material in the ledger to raise an issue afterwards.
//
// Same five types, same note-compulsory rule and same photo proof as the
// "+ Create Issue" form inside MaterialFlowDrawer, because both end up in
// the same grn_issues rows — an issue raised here shows up there later.
//
// Props:
//   value     — array of { issue_type, note, photo_url }
//   onChange  — receives the next array
//   compact   — row-level variant (one material inside a batch); the full
//               variant is for a whole delivery / GRN
//   title     — override the heading text
import React, { useState } from "react";
import uploadManager from "../utils/uploadManager";

const T = {
  surface: "#FFFFFF",
  t1: "#111827", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
};

export const ISSUE_TYPES = ["Quality", "Short", "Damaged", "WrongItem", "Other"];
const TYPE_HINT = {
  Quality:   "Maal ghatiya / spec ke hisaab se nahi",
  Short:     "Challan se kam maal aaya",
  Damaged:   "Toota / bheega / kharab haalat me aaya",
  WrongItem: "Order kuch aur tha, aaya kuch aur",
  Other:     "Koi aur problem",
};

export default function GrnIssueBlock({ value, onChange, compact = false, title }) {
  const issues = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Quality");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState("");

  const reset = () => { setType("Quality"); setNote(""); setPhoto(""); setOpen(false); };
  const add = () => {
    if (!note.trim()) return;
    onChange([...issues, { issue_type: type, note: note.trim(), photo_url: photo || null }]);
    reset();
  };
  const remove = (i) => onChange(issues.filter((_, idx) => idx !== i));

  const heading = title || (compact ? "Is material me problem?" : "Delivery me koi problem?");

  return (
    <div style={{
      background: issues.length ? T.redL : T.surface,
      border: `1px solid ${issues.length ? T.redM : T.b1}`,
      borderLeft: `3px solid ${issues.length ? T.red : T.b2}`,
      borderRadius: 8, padding: compact ? "8px 10px" : "10px 13px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: compact ? 12 : 13 }}>⚠️</span>
        <span style={{ fontSize: compact ? 11 : 11.5, fontWeight: 700, color: issues.length ? T.red : T.t3 }}>
          {heading}{issues.length > 0 ? ` — ${issues.length} issue` : ""}
        </span>
        <div style={{ flex: 1 }} />
        {!open && (
          <button type="button" onClick={() => setOpen(true)}
            style={{ padding: "3px 10px", borderRadius: 5, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {issues.length ? "+ Aur issue" : "+ Issue"}
          </button>
        )}
      </div>

      {!open && issues.length === 0 && !compact && (
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4, paddingLeft: 20 }}>
          Sab theek hai to kuch mat karo — issue GRN ke saath hi log ho jayega aur baad me material ke andar dikhega.
        </div>
      )}

      {/* Already-added issues */}
      {issues.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 7 }}>
          {issues.map((iss, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, background: T.surface, border: `1px solid ${T.redM}`, borderRadius: 6, padding: "6px 8px" }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: T.red, color: "white", flexShrink: 0, marginTop: 1 }}>{iss.issue_type}</span>
              <span style={{ fontSize: 11, color: T.t1, flex: 1, wordBreak: "break-word" }}>{iss.note}</span>
              {iss.photo_url && <span title="Photo attached" style={{ fontSize: 11, flexShrink: 0 }}>📎</span>}
              <button type="button" onClick={() => remove(i)} title="Hatao"
                style={{ width: 18, height: 18, borderRadius: 4, background: "none", border: "none", color: T.t4, fontSize: 13, cursor: "pointer", lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Entry form */}
      {open && (
        <div style={{ marginTop: 8, padding: 9, background: T.surface, border: `1px solid ${T.redM}`, borderRadius: 7 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 7, flexWrap: "wrap" }}>
            {ISSUE_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)} title={TYPE_HINT[t]}
                style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: type === t ? T.red : "white", color: type === t ? "white" : T.red, border: `1px solid ${T.red}` }}>
                {t}
              </button>
            ))}
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} autoFocus rows={2}
            placeholder="Kya problem hai? (compulsory) — e.g. 40 bags me se 6 bheege hue the"
            style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: `1px solid ${T.b1}`, fontSize: 11.5, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outline: "none", color: T.t1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
            {photo ? (
              <div style={{ position: "relative", width: 44, height: 44, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.b1}`, flexShrink: 0 }}>
                <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => setPhoto("")}
                  style={{ position: "absolute", top: 1, right: 1, width: 15, height: 15, borderRadius: "50%", background: "rgba(0,0,0,.65)", color: "white", border: "none", fontSize: 9, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ) : (
              <label style={{ width: 44, height: 44, borderRadius: 6, border: `1.5px dashed ${T.b2}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>
                📷
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                  onChange={e => {
                    const file = (e.target.files || [])[0];
                    if (file) uploadManager.add({
                      file, folder: "gb_buildcon/issues",
                      label: "Issue photo: " + file.name,
                      onDone: (url) => setPhoto(url),
                    });
                    e.target.value = "";
                  }} />
              </label>
            )}
            <span style={{ fontSize: 10, color: T.t4, flex: 1 }}>
              {photo ? "Photo lag gayi — proof of problem" : "Photo optional, par damage/quality me proof kaam aata hai"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
            <button type="button" onClick={reset}
              style={{ flex: 1, padding: "6px", borderRadius: 5, background: "white", border: `1px solid ${T.b1}`, color: T.t3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button type="button" onClick={add} disabled={!note.trim()}
              style={{ flex: 2, padding: "6px", borderRadius: 5, background: note.trim() ? T.red : "#9CA3AF", border: "none", color: "white", fontSize: 11, fontWeight: 700, cursor: note.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              ⚠ Issue add karo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
