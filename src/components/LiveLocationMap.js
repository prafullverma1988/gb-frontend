import { useEffect, useRef, useState, useCallback } from "react";

// ────────────────────────────────────────────────────────────────
// Google Maps script loader (singleton — one fetch per page)
// ────────────────────────────────────────────────────────────────
let _gmapsPromise = null;
function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (_gmapsPromise) return _gmapsPromise;

  _gmapsPromise = new Promise((resolve, reject) => {
    const cb = "__gmapsReady_" + Math.random().toString(36).slice(2);
    window[cb] = () => { delete window[cb]; resolve(window.google); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${cb}&libraries=geometry`;
    s.async = true;
    s.defer = true;
    s.onerror = () => { _gmapsPromise = null; reject(new Error("Failed to load Google Maps")); };
    document.head.appendChild(s);
  });
  return _gmapsPromise;
}

// SVG marker icon — colored pin with initials
function pinIcon(google, color, label) {
  return {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
    scale: 1.8,
    labelOrigin: new google.maps.Point(12, 9),
    anchor: new google.maps.Point(12, 22),
  };
}

// ────────────────────────────────────────────────────────────────
// LiveLocationMap
//   props.members  = [{ user_id, name, lat, lng, color, live_status, project_name, ... }]
//   props.selectedUserId = id of member whose trail to draw
//   props.trail    = [{ lat, lng, ts }]  (ordered)
//   props.geofences = [{ id, label, center_lat, center_lng, radius_m }]
//   props.onSelectMember = (user_id) => void
// ────────────────────────────────────────────────────────────────
export default function LiveLocationMap({
  members = [],
  selectedUserId = null,
  trail = [],
  geofences = [],
  onSelectMember,
  height = 460,
}) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());      // user_id → google.maps.Marker
  const polylineRef = useRef(null);
  const fenceCirclesRef = useRef([]);
  const infoRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle|loading|ready|error|nokey
  const [error, setError] = useState(null);

  // Initial load
  useEffect(() => {
    if (!apiKey) { setStatus("nokey"); return; }
    setStatus("loading");
    loadGoogleMaps(apiKey)
      .then((google) => {
        if (!containerRef.current) return;
        // Default centre: India geographic centre, zoom out
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 21.1458, lng: 79.0882 },
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        mapRef.current = map;
        infoRef.current = new google.maps.InfoWindow();
        setStatus("ready");
      })
      .catch((e) => { setError(e.message); setStatus("error"); });
  }, [apiKey]);

  // Update markers when members change
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const google = window.google;
    const map = mapRef.current;
    const seen = new Set();
    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    for (const m of members) {
      if (m.lat == null || m.lng == null) continue;
      seen.add(m.user_id);
      hasPoints = true;
      const pos = { lat: Number(m.lat), lng: Number(m.lng) };
      bounds.extend(pos);

      const isSelected = selectedUserId && m.user_id === selectedUserId;
      const color = m.live_status === "active"   ? "#059669"
                  : m.live_status === "idle"     ? "#D97706"
                  : "#94A3B8";
      const ini = (m.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

      let marker = markersRef.current.get(m.user_id);
      if (!marker) {
        marker = new google.maps.Marker({
          map,
          position: pos,
          icon: pinIcon(google, color, ini),
          label: { text: ini, color: "white", fontSize: "10px", fontWeight: "700" },
          title: m.name,
          zIndex: isSelected ? 1000 : 1,
        });
        marker.addListener("click", () => {
          if (onSelectMember) onSelectMember(m.user_id);
          if (infoRef.current) {
            const html = `
              <div style="font:12px 'Segoe UI',sans-serif;padding:2px 4px;min-width:140px">
                <div style="font-weight:700;font-size:13px;margin-bottom:3px">${m.name || ""}</div>
                <div style="color:#6B7280">${m.project_name || (m.live_status === "off_duty" ? "Off duty" : "—")}</div>
                <div style="color:#94A3B8;font-size:11px;margin-top:4px">
                  ${m.minutes_since_ping != null ? `Last seen ${m.minutes_since_ping} min ago` : ""}
                </div>
              </div>`;
            infoRef.current.setContent(html);
            infoRef.current.open(map, marker);
          }
        });
        markersRef.current.set(m.user_id, marker);
      } else {
        marker.setPosition(pos);
        marker.setIcon(pinIcon(google, color, ini));
        marker.setZIndex(isSelected ? 1000 : 1);
      }
    }

    // Remove stale markers
    for (const [uid, marker] of markersRef.current.entries()) {
      if (!seen.has(uid)) { marker.setMap(null); markersRef.current.delete(uid); }
    }

    // Auto-fit on first render with markers
    if (hasPoints && !mapRef.current.__autoFitDone) {
      map.fitBounds(bounds, 60);
      if (members.length === 1) map.setZoom(15);
      mapRef.current.__autoFitDone = true;
    }
  }, [members, selectedUserId, status, onSelectMember]);

  // Update polyline trail when selection changes
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const google = window.google;
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (selectedUserId && trail.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        path: trail.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) })),
        geodesic: true,
        strokeColor: "#2563EB",
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map: mapRef.current,
      });
      // Zoom to trail
      const bounds = new google.maps.LatLngBounds();
      trail.forEach(p => bounds.extend({ lat: Number(p.lat), lng: Number(p.lng) }));
      mapRef.current.fitBounds(bounds, 80);
    }
  }, [trail, selectedUserId, status]);

  // Geofence circles
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const google = window.google;
    fenceCirclesRef.current.forEach(c => c.setMap(null));
    fenceCirclesRef.current = geofences.map(g => new google.maps.Circle({
      strokeColor: "#7C3AED",
      strokeOpacity: 0.6,
      strokeWeight: 1.5,
      fillColor: "#7C3AED",
      fillOpacity: 0.08,
      map: mapRef.current,
      center: { lat: Number(g.center_lat), lng: Number(g.center_lng) },
      radius: g.radius_m,
      title: g.label,
    }));
  }, [geofences, status]);

  // Cleanup on unmount
  useEffect(() => () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();
    if (polylineRef.current) polylineRef.current.setMap(null);
    fenceCirclesRef.current.forEach(c => c.setMap(null));
  }, []);

  if (status === "nokey") {
    return (
      <div style={{ height, display:"flex",alignItems:"center",justifyContent:"center",
        background:"#F8F9FB",border:"1px dashed #D1D5DB",borderRadius:10,
        fontFamily:"'Segoe UI',sans-serif",padding:30,textAlign:"center" }}>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:"#374151",marginBottom:6 }}>Google Maps API key missing</div>
          <div style={{ fontSize:12,color:"#6B7280",lineHeight:1.5 }}>
            Add <code style={{background:"#EEF2FF",padding:"1px 6px",borderRadius:4,fontSize:11}}>REACT_APP_GOOGLE_MAPS_KEY=...</code> to your <code>.env</code> file<br/>
            and restart <code>npm start</code>.
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ height,display:"flex",alignItems:"center",justifyContent:"center",
        background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,
        color:"#DC2626",fontSize:13,fontFamily:"'Segoe UI',sans-serif" }}>
        Map failed to load: {error}
      </div>
    );
  }

  return (
    <div style={{ position:"relative",height,borderRadius:10,overflow:"hidden",border:"1px solid #E5E7EB" }}>
      <div ref={containerRef} style={{ width:"100%",height:"100%",background:"#F1F5F9" }}/>
      {status !== "ready" && (
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(248,249,251,0.85)",fontFamily:"'Segoe UI',sans-serif" }}>
          <div style={{ fontSize:12,color:"#6B7280" }}>Loading map…</div>
        </div>
      )}
    </div>
  );
}
