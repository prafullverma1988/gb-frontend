// ════════════════════════════════════════════════════════════════
// NotificationBell — Phase 3A web-admin polling notifications.
// Bell icon + unread badge in the top bar. Polls /notifications/count
// every 30s; opening the dropdown loads /notifications/unread. Click an
// item → mark read + navigate to its module. "Mark all read" clears.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from "react";
import api from "../config/api";

// Self-contained palette (App.js's T/C tokens are not exported).
const C = {
  surface: "#FFFFFF", bg: "#F8FAFC", b1: "#E2E8F0",
  t1: "#0F172A", t2: "#475569", t3: "#94A3B8",
  pri: "#2563EB", red: "#DC2626",
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return Math.floor(diff / 86400) + " day ago";
}

export default function NotificationBell({ onNavigate }) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const fetchCount = () => api.get("/notifications/count")
    .then(r => { if (r && r.success) setCount(r.count || 0); })
    .catch(() => {});
  const fetchList = () => api.get("/notifications/unread")
    .then(r => { if (r && r.success) setItems(r.data || []); })
    .catch(() => {});

  // 30s poll for the badge count (server-load floor — do not poll faster).
  useEffect(() => {
    fetchCount();
    const poll = setInterval(fetchCount, 30000);
    return () => clearInterval(poll);
  }, []);
  // Load the full list only while the dropdown is open.
  useEffect(() => { if (open) fetchList(); }, [open]);
  // Close on outside click.
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleItem = async (item) => {
    try { await api.post("/notifications/" + item.id + "/read", {}); } catch (_) {}
    setOpen(false);
    fetchCount();
    // Link like "/finance/wallets/approvals?txnId=1" → module key "finance".
    // DECISION: web app routes by module state, so we navigate to the
    // module home; deep-scroll to a specific txn is not wired (fallback).
    if (item.link && onNavigate) {
      const seg = String(item.link).replace(/^\//, "").split(/[/?]/)[0];
      if (seg) onNavigate(seg);
    }
  };
  const handleMarkAll = async () => {
    try { await api.post("/notifications/read-all", {}); } catch (_) {}
    setCount(0); setItems([]); setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Notifications"
        style={{ background: "none", border: "none", cursor: "pointer", color: C.t3,
          padding: 7, borderRadius: 7, position: "relative", display: "flex" }}
        onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {count > 0 && (
          <div style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16,
            padding: "0 3px", boxSizing: "border-box", borderRadius: 8, background: C.red,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8.5, fontWeight: 800, color: "white", border: "2px solid white" }}>
            {count > 99 ? "99+" : count}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: 42, right: 0, width: 344, maxHeight: 440,
          overflowY: "auto", background: C.surface, border: `1px solid ${C.b1}`,
          borderRadius: 10, boxShadow: "0 12px 36px rgba(0,0,0,0.18)", zIndex: 9000 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 14px", borderBottom: `1px solid ${C.b1}`, position: "sticky",
            top: 0, background: C.surface }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>Notifications</span>
            {items.length > 0 && (
              <button onClick={handleMarkAll}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: C.pri, fontSize: 11, fontWeight: 600 }}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: C.t3, fontSize: 12.5 }}>
              No new notifications
            </div>
          ) : items.map(item => (
            <div key={item.id} onClick={() => handleItem(item)}
              style={{ padding: "10px 14px", borderBottom: `1px solid ${C.b1}`, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>{item.title}</div>
              {item.body && (
                <div style={{ fontSize: 11.5, color: C.t2, marginTop: 2, lineHeight: 1.45 }}>{item.body}</div>
              )}
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 3 }}>{timeAgo(item.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
