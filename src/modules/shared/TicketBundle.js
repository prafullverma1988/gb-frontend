// ── Sahayak ticket bits shared by two inboxes ─────────────────────
// The company admin's Tickets tab (SahayakModule) and Phynaxon's cross-company
// Bug Inbox (SaaSModule) render the same ticket rows and the same diagnostic
// bundle, so the rendering lives here rather than being copied. A bundle
// displayed two different ways is a bundle that gets misread.
import { T } from "./tokens";

const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const IcImage = (p) => <Ic {...p} d="M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6" />;
export const IcChevron = (p) => <Ic {...p} d="M9 18l6-6-6-6" />;

export function TicketBadge({ text, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.2px" }}>{text}</span>;
}

export function fmtTicketTime(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch (_) { return String(v); }
}

// The diagnostic bundle, stored as JSON text, rendered as something a human
// can act on: where the user had been, what failed, what threw.
export function BundleView({ meta, url, accent = T.blu }) {
  if (!meta && !url) return null;
  let d = null;
  if (meta) { try { d = typeof meta === "string" ? JSON.parse(meta) : meta; } catch (_) { d = null; } }

  const row = (label, value) => (
    <div style={{ display: "flex", gap: 8, fontSize: 11.5, lineHeight: 1.5 }}>
      <span style={{ color: T.t4, minWidth: 88, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.t2, wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ border: `1px solid ${T.b1}`, background: T.surfaceB, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t2 }}>Diagnostic bundle</div>
      {!d && meta && <div style={{ fontSize: 11, color: T.t4 }}>Bundle padha nahi ja saka.</div>}
      {d && (
        <>
          {row("App", `${d.app_version || "—"} · ${d.online === false ? "offline" : "online"}`)}
          {d.captured_at && row("Kab", fmtTicketTime(d.captured_at))}
          {d.user_agent && row("Device", d.user_agent)}
          {row("Screens", (d.screens || []).map((s) => s.name).join(" → ") || "—")}
          <div>
            <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 3 }}>Failed calls ({(d.failed_calls || []).length})</div>
            {(d.failed_calls || []).map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: T.t2, fontFamily: "ui-monospace, monospace" }}>{c.status} {c.method} {c.path}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 3 }}>Errors ({(d.errors || []).length})</div>
            {(d.errors || []).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: T.t2, wordBreak: "break-word" }}>{e.msg}</div>
            ))}
          </div>
        </>
      )}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: accent, textDecoration: "none" }}>
          <IcImage size={13} color={accent} />Screenshot kholein
        </a>
      )}
    </div>
  );
}
