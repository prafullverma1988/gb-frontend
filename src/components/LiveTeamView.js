import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import api from "../config/api";
import LiveLocationMap from "./LiveLocationMap";

// ── THEME (copy of subset used here, keeps file self-contained) ──
const T = {
  bg:"#F4F6F9", surface:"#FFFFFF", surfaceB:"#F8F9FB", sb:"#0D1B2A",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  blu:"#2563EB", bluL:"#EFF6FF",
  grn:"#059669", grnL:"#ECFDF5",
  amb:"#D97706", ambL:"#FFFBEB",
  red:"#DC2626", redL:"#FEF2F2",
  slt:"#64748B", sltL:"#F1F5F9",
};

const POLL_MS = 15000; // 15 seconds

function Avatar({ name, size = 30 }) {
  const ini = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const color = "#2563EB";
  return (
    <div style={{
      width:size,height:size,borderRadius:"50%",
      background:`linear-gradient(135deg,${color},${color}99)`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.36,fontWeight:700,color:"white",flexShrink:0,
    }}>{ini}</div>
  );
}

function StatusDot({ status }) {
  const map = {
    active:   { c:T.grn, label:"Active",   pulse:true },
    idle:     { c:T.amb, label:"Idle",     pulse:false },
    off_duty: { c:T.t4,  label:"Off duty", pulse:false },
  };
  const s = map[status] || map.off_duty;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5 }}>
      <span style={{
        width:8,height:8,borderRadius:"50%",background:s.c,
        boxShadow: s.pulse ? `0 0 0 0 ${s.c}88` : "none",
        animation: s.pulse ? "pulseDot 1.6s infinite" : "none",
      }}/>
      <span style={{ fontSize:11,fontWeight:600,color:s.c }}>{s.label}</span>
    </span>
  );
}

function lastSeenText(min) {
  if (min == null) return "Location pending";
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) {
    const m = min % 60;
    return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
  }
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr === 0 ? `${d}d ago` : `${d}d ${hr}h ago`;
}

export default function LiveTeamView() {
  const [members, setMembers]       = useState([]);
  const [geofences, setGeofences]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [trail, setTrail]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all|active|idle|off_duty
  const [cityFilter, setCityFilter]     = useState("all");
  const pollTimer = useRef(null);
  const membersRef = useRef([]);            // avoids re-creating loadTrail every poll
  useEffect(() => { membersRef.current = members; }, [members]);

  const loadLive = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/location/live");
      if (res?.success) {
        setMembers(res.data || []);
        setLastUpdated(new Date());
        setError(null);
      } else if (res?.message) {
        setError(res.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadGeofences = useCallback(async () => {
    try {
      const res = await api.get("/geofences");
      if (res?.success) setGeofences(res.data || []);
    } catch (e) { /* non-fatal */ }
  }, []);

  // Load trail for selected member's active session (or last 12h).
  // Reads members from a ref so it doesn't get recreated on every 15s poll.
  const loadTrail = useCallback(async (userId) => {
    if (!userId) { setTrail([]); return; }
    const m = membersRef.current.find(mm => mm.user_id === userId);
    try {
      let res;
      if (m?.session_id) {
        res = await api.get(`/location/track?session_id=${m.session_id}`);
      } else {
        const from = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
        res = await api.get(`/location/track?user_id=${userId}&from=${encodeURIComponent(from)}`);
      }
      if (res?.success) setTrail(res.data || []);
    } catch (e) { /* ignore */ }
  }, []);

  // ── P4 #69: Visibility-aware polling ──────────────────────────
  // 15s poll for live team locations — pause when the tab is hidden so
  // we don't drain GPS-heavy queries every 15s for nobody watching.
  // Initial geofence load runs once regardless of visibility (cheap).
  useEffect(() => {
    loadLive();
    loadGeofences();
    const start = () => {
      if (pollTimer.current) return;
      loadLive();
      pollTimer.current = setInterval(loadLive, POLL_MS);
    };
    const stop = () => {
      if (!pollTimer.current) return;
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadLive, loadGeofences]);

  // Reload trail only when the selected member changes (not on every poll)
  useEffect(() => { loadTrail(selectedId); }, [selectedId, loadTrail]);

  // ── Cities present in the roster (for the city filter) ─────────
  const cities = useMemo(() => {
    const set = new Set();
    members.forEach(m => { if (m.city) set.add(m.city); });
    return [...set].sort();
  }, [members]);

  // ── Filtering / counts ─────────────────────────────────────
  const cityMatch = m => cityFilter === "all" || m.city === cityFilter;

  // Summary strip counts (respect the city filter so admin can drill into a city)
  const cityScoped = members.filter(cityMatch);
  const summary = {
    punchedIn: cityScoped.filter(m => m.session_status === "active").length,
    active:    cityScoped.filter(m => m.live_status === "active").length,
    idle:      cityScoped.filter(m => m.live_status === "idle").length,
    outFence:  cityScoped.filter(m => m.out_of_fence).length,
  };

  const counts = {
    all:      cityScoped.length,
    active:   cityScoped.filter(m => m.live_status === "active").length,
    idle:     cityScoped.filter(m => m.live_status === "idle").length,
    off_duty: cityScoped.filter(m => m.live_status === "off_duty").length,
  };
  const filtered = members.filter(m =>
    cityMatch(m) && (statusFilter === "all" || m.live_status === statusFilter)
  );

  if (loading) {
    return (
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:T.t4 }}>
        <div>
          <div style={{ width:24,height:24,border:`3px solid ${T.b1}`,borderTopColor:T.blu,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 10px" }}/>
          Loading live locations…
        </div>
      </div>
    );
  }

  const SUMMARY_TILES = [
    { l:"Punched In", v:summary.punchedIn, c:T.blu },
    { l:"Active",     v:summary.active,    c:T.grn },
    { l:"Idle",       v:summary.idle,      c:T.amb },
    { l:"Out of fence", v:summary.outFence, c:summary.outFence > 0 ? T.red : T.t4 },
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>

      {/* ── Live summary strip ─────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
        {SUMMARY_TILES.map((s,i) => (
          <div key={i} style={{ padding:"10px 14px",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:9,borderTop:`3px solid ${s.c}` }}>
            <div style={{ fontSize:9.5,color:T.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:20,fontWeight:700,color:T.t1,lineHeight:1 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"300px 1fr",gap:12,minHeight:560 }}>

      {/* ── LEFT: live grid ─────────────────────────────────── */}
      <div style={{ background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"11px 14px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:T.t1 }}>Live Team</div>
            <div style={{ fontSize:10.5,color:T.t4,marginTop:2 }}>
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}` : "—"}
              {error && <span style={{ color:T.red,marginLeft:6 }}>· {error}</span>}
            </div>
          </div>
          <button onClick={loadLive} disabled={refreshing}
            style={{ padding:"5px 10px",borderRadius:6,border:`1px solid ${T.b1}`,background:T.surfaceB,color:T.t2,fontSize:11,fontWeight:600,cursor:refreshing?"default":"pointer",opacity:refreshing?0.7:1,display:"flex",alignItems:"center",gap:5 }}>
            <span style={{ width:11,height:11,border:`2px solid ${T.b2}`,borderTopColor:T.blu,borderRadius:"50%",display:"inline-block",animation:refreshing?"spin 0.7s linear infinite":"none" }}/>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {/* City filter */}
        {cities.length > 0 && (
          <div style={{ padding:"8px 12px",borderBottom:`1px solid ${T.b1}`,display:"flex",alignItems:"center",gap:7 }}>
            <span style={{ fontSize:10.5,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px" }}>City</span>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
              style={{ flex:1,height:28,padding:"0 8px",borderRadius:6,border:`1.5px solid ${cityFilter!=="all"?T.blu:T.b1}`,background:cityFilter!=="all"?T.bluL:T.surface,fontSize:12,color:cityFilter!=="all"?T.blu:T.t2,outline:"none",cursor:"pointer",fontFamily:"inherit" }}>
              <option value="all">All cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Filter chips */}
        <div style={{ padding:"8px 12px",borderBottom:`1px solid ${T.b1}`,display:"flex",gap:5,flexWrap:"wrap" }}>
          {[
            { id:"all",      l:"All",      c:T.slt },
            { id:"active",   l:"Active",   c:T.grn },
            { id:"idle",     l:"Idle",     c:T.amb },
            { id:"off_duty", l:"Off duty", c:T.t4  },
          ].map(f => {
            const isOn = statusFilter === f.id;
            return (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                style={{
                  padding:"4px 9px",borderRadius:14,
                  border:`1.5px solid ${isOn ? f.c : T.b1}`,
                  background: isOn ? `${f.c}18` : "none",
                  color: isOn ? f.c : T.t3,
                  fontSize:11,fontWeight:isOn?700:500,cursor:"pointer",
                }}>
                {f.l} <span style={{ opacity:0.7 }}>{counts[f.id]}</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div style={{ flex:1,overflowY:"auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding:"40px 16px",textAlign:"center",color:T.t4,fontSize:12 }}>
              {members.length === 0
                ? "No one is punched in right now. Staff appear here once they punch in from the mobile app."
                : "No members match this filter."}
            </div>
          )}
          {filtered.map(m => {
            const isSel = m.user_id === selectedId;
            return (
              <div key={m.user_id}
                onClick={() => setSelectedId(isSel ? null : m.user_id)}
                style={{
                  padding:"10px 14px",
                  borderBottom:`1px solid ${T.b1}`,
                  background: isSel ? T.bluL : "transparent",
                  borderLeft: isSel ? `3px solid ${T.blu}` : `3px solid transparent`,
                  display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                  transition:"background .12s",
                }}>
                <Avatar name={m.name}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
                    <span style={{ fontSize:12.5,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {m.name}
                    </span>
                    <StatusDot status={m.live_status}/>
                  </div>
                  <div style={{ fontSize:11,color:T.t3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    {m.live_status === "off_duty"
                      ? "Off duty"
                      : (m.project_name || m.designation || "No project")}
                    {m.city && <span style={{ color:T.t4 }}> · {m.city}</span>}
                  </div>
                  <div style={{ fontSize:10,color:T.t4,marginTop:2,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                    <span style={{ color: m.has_location ? T.t4 : T.amb }}>
                      {lastSeenText(m.minutes_since_ping)}
                    </span>
                    {m.battery_pct != null && (
                      <span style={{ color: m.battery_pct < 20 ? T.red : T.t4 }}>
                        🔋 {m.battery_pct}%
                      </span>
                    )}
                    {m.out_of_fence ? (
                      <span style={{ color:T.red,fontWeight:700,background:T.redL,padding:"1px 6px",borderRadius:10,border:`1px solid ${T.red}33` }}>
                        Out of fence
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: map ──────────────────────────────────────── */}
      <div>
        <LiveLocationMap
          members={filtered}
          selectedUserId={selectedId}
          trail={trail}
          geofences={geofences}
          onSelectMember={(uid) => setSelectedId(uid === selectedId ? null : uid)}
          height={560}
        />
        {selectedId && (
          <div style={{
            marginTop:8,padding:"8px 12px",background:T.bluL,
            border:`1px solid ${T.b2}`,borderRadius:8,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            fontSize:11.5,color:T.t2,
          }}>
            <span>
              Showing trail for <b>{members.find(m=>m.user_id===selectedId)?.name}</b>
              {trail.length > 0 ? ` · ${trail.length} pings` : " · no pings yet"}
            </span>
            <button onClick={() => setSelectedId(null)}
              style={{ background:"none",border:"none",color:T.blu,fontSize:11.5,fontWeight:600,cursor:"pointer" }}>
              Clear selection
            </button>
          </div>
        )}
      </div>

      </div>

      <style>{`
        @keyframes pulseDot {
          0%   { box-shadow: 0 0 0 0 rgba(5,150,105,0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(5,150,105,0); }
          100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
