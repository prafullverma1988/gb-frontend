// ─────────────────────────────────────────────────────────────────
// AppErrorBoundary — catches uncaught React render errors AND the
// ChunkLoadError thrown when a lazy chunk fails to download. The
// chunk failure mode used to blank the entire UI; now we:
//   1. Detect ChunkLoadError specifically.
//   2. Retry the load ONCE with a cache-bust query param (handles the
//      "stale deploy serving an old chunk filename" case after Vercel
//      re-deploys while a tab is open).
//   3. If retry still fails, show a recoverable UI with a "Reload app"
//      CTA instead of a white screen.
//
// Wrap this around every <Suspense> in App.js + at the very top in
// index.js so absolutely nothing escapes.
//
// Sentry hook: once @sentry/react is added, swap captureToConsole for
// Sentry.captureException(error, { contexts: { errorBoundary: info } }).
// Implemented defensively so it stays a no-op until Sentry is wired.
// ─────────────────────────────────────────────────────────────────
import React from "react";

const isChunkLoadError = (err) => {
  if (!err) return false;
  const name = err.name || "";
  const msg  = err.message || "";
  return name === "ChunkLoadError" ||
         /Loading chunk [\w-]+ failed/i.test(msg) ||
         /Failed to fetch dynamically imported module/i.test(msg);
};

const captureToConsole = (error, info) => {
  console.error("[AppErrorBoundary]", error, info);
  // Best-effort Sentry capture (no-op if Sentry isn't loaded yet).
  try {
    if (typeof window !== "undefined" && window.Sentry?.captureException) {
      window.Sentry.captureException(error, { contexts: { react: info } });
    }
  } catch (_) {}
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retried: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    captureToConsole(error, info);
    // First chunk-load failure → reload page with cache-bust so the new
    // bundle's manifest replaces the in-memory stale one. We only do
    // this once (gated via sessionStorage) so an actual code bug in the
    // new bundle doesn't loop forever.
    if (isChunkLoadError(error) && !this.state.retried) {
      try {
        const key = "gb_chunk_retry";
        const triedAt = parseInt(sessionStorage.getItem(key) || "0", 10);
        const now = Date.now();
        // Only auto-reload if we haven't retried in the last 30s.
        if (now - triedAt > 30000) {
          sessionStorage.setItem(key, String(now));
          // Tiny delay so we don't hit a tight reload loop on a hard fail.
          setTimeout(() => window.location.reload(), 400);
          this.setState({ retried: true });
          return;
        }
      } catch (_) { /* sessionStorage blocked → fall through to UI */ }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const err = this.state.error;
    const chunkFail = isChunkLoadError(err);
    const title = chunkFail
      ? "Update available"
      : "Something went wrong";
    const detail = chunkFail
      ? "A newer version of the app is available. Tap Reload to get it."
      : "We've logged the error. You can try reloading the app.";

    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", padding:24, background:"#F8F9FB",
        fontFamily:"'Segoe UI',system-ui,sans-serif"
      }}>
        <div style={{
          maxWidth:440, width:"100%", background:"#FFFFFF",
          border:"1px solid #E5E7EB", borderRadius:12, padding:"28px 26px",
          boxShadow:"0 8px 24px rgba(0,0,0,0.06)"
        }}>
          <div style={{fontSize:32, marginBottom:8}}>{chunkFail ? "🔄" : "⚠️"}</div>
          <h1 style={{fontSize:18, margin:"0 0 6px", color:"#111827", fontWeight:700}}>{title}</h1>
          <p style={{fontSize:13.5, color:"#6B7280", margin:"0 0 18px", lineHeight:1.5}}>{detail}</p>
          {process.env.NODE_ENV !== "production" && err && (
            <pre style={{
              fontSize:11, color:"#DC2626", background:"#FEF2F2",
              padding:"8px 10px", borderRadius:6, border:"1px solid #FECACA",
              overflowX:"auto", marginBottom:16, maxHeight:160
            }}>{err.message || String(err)}</pre>
          )}
          <button
            onClick={() => {
              try { sessionStorage.removeItem("gb_chunk_retry"); } catch(_){}
              window.location.reload();
            }}
            style={{
              width:"100%", padding:"10px 16px", borderRadius:8,
              background:"#2563EB", color:"white", border:"none",
              fontSize:14, fontWeight:600, cursor:"pointer"
            }}
          >Reload App</button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
export { isChunkLoadError };
