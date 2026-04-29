// ── AVATAR + CREDIT — audit-trail building blocks ──────────────────
// Compact "Created by X · 2h ago" patterns used wherever a record has
// who-did-what metadata: requests, approvals, transactions, etc.
//
// Usage:
//   import { Avatar, Credit, fmtTimeAgo } from "../components/Credit";
//
//   <Avatar name="Prafull Verma" size={20}/>
//   <Credit label="Created by" name="Prafull" time="2024-04-26T10:30:00Z"/>
//   <Credit label="Approved by" name={txn.approver} time={txn.approved_at}/>
//
// Avatar: hash-colored initial circle. Same name → same color always.
// Credit: Avatar + "X by Name · time-ago" inline.
// fmtTimeAgo: "just now / 5m ago / 3h ago / 2d ago / 18 Mar"

const T = {
  t1: "#111827",
  t3: "#6B7280",
  t4: "#9CA3AF",
};

// Distinct, accessible color palette — same name always maps to same color
const PALETTE = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#F43F5E", // rose
  "#84CC16", // lime
  "#0EA5E9", // sky
  "#A855F7", // violet
];

function hashColor(name) {
  const n = String(name || "?").trim() || "?";
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ name, size = 20, title, style }) {
  const n = String(name || "?").trim() || "?";
  const initial = n[0].toUpperCase();
  const bg = hashColor(n);
  return (
    <div
      title={title || n}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        fontSize: Math.round(size * 0.46),
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        letterSpacing: 0,
        ...style,
      }}
    >
      {initial}
    </div>
  );
}

export function fmtTimeAgo(t) {
  if (!t) return "";
  try {
    const d = new Date(t);
    if (isNaN(d.getTime())) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

/**
 * Compact credit line: [Avatar] LABEL by NAME · time-ago
 * Renders nothing if no name.
 *
 * Props:
 *   label   — "Created by" / "Approved by" / "Uploaded by" etc. (optional)
 *   name    — person name (required)
 *   time    — ISO date string (optional, shows "X ago" if present)
 *   size    — avatar size (default 16)
 *   compact — drop the label (just Avatar + Name + time)
 */
export function Credit({ label, name, time, size = 16, compact = false, style }) {
  if (!name) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: T.t3,
        ...style,
      }}
    >
      <Avatar name={name} size={size} />
      {!compact && label && <span>{label}</span>}
      <span style={{ color: T.t1, fontWeight: 600 }}>{name}</span>
      {time && (
        <span style={{ color: T.t4, fontVariantNumeric: "tabular-nums" }}>
          · {fmtTimeAgo(time)}
        </span>
      )}
    </span>
  );
}

/**
 * Stack of credit lines (vertical layout). Pass entries as
 * [{label, name, time}, ...] — falsy names are skipped.
 */
export function CreditStack({ entries = [], gap = 6, size = 16, style }) {
  const valid = entries.filter((e) => e && e.name);
  if (valid.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        ...style,
      }}
    >
      {valid.map((e, i) => (
        <Credit key={i} label={e.label} name={e.name} time={e.time} size={size} />
      ))}
    </div>
  );
}

export default Credit;
