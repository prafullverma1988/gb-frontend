// ── MAP PICKER (Leaflet + OpenStreetMap, no API key) ─────────────────
// Click on the map to drop a pin, or search an address. Returns {lat,lng}.
// Used to set office/warehouse + project geo-locations from a PC where
// "use my current location" isn't the right site.
//
// Usage:
//   <MapPicker initial={{lat, lng}} onPick={({lat,lng})=>...} onClose={...}/>

import { useEffect, useRef, useState } from "react";

const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const ICON = {
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41],
};

// India centroid fallback when no initial coords
const DEFAULT_CENTER = { lat: 21.25, lng: 81.63 };

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet"; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.getElementById("leaflet-js");
    if (existing) { existing.addEventListener("load", () => resolve(window.L)); return; }
    const s = document.createElement("script");
    s.id = "leaflet-js"; s.src = LEAFLET_JS;
    s.onload = () => resolve(window.L);
    document.body.appendChild(s);
  });
}

export default function MapPicker({ initial, onPick, onClose }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerRef = useRef(null);
  const [coords, setCoords] = useState(() => {
    const lat = parseFloat(initial?.lat), lng = parseFloat(initial?.lng);
    return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null;
  });
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      const start = coords || DEFAULT_CENTER;
      const map = L.map(mapRef.current).setView([start.lat, start.lng], coords ? 16 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap",
      }).addTo(map);
      const icon = L.icon(ICON);
      const place = (lat, lng) => {
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
          markerRef.current.on("dragend", (e) => {
            const p = e.target.getLatLng(); setCoords({ lat: p.lat, lng: p.lng });
          });
        }
        setCoords({ lat, lng });
      };
      if (coords) place(coords.lat, coords.lng);
      map.on("click", (e) => place(e.latlng.lat, e.latlng.lng));
      mapObj.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => { cancelled = true; if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
    // eslint-disable-next-line
  }, []);

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(search));
      const data = await r.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
        const L = window.L, map = mapObj.current;
        if (map) {
          map.setView([lat, lng], 16);
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          else markerRef.current = L.marker([lat, lng], { icon: L.icon(ICON), draggable: true }).addTo(map);
          setCoords({ lat, lng });
        }
      } else alert("Location nahi mili — alag keyword try karo");
    } catch (e) { alert("Search failed"); }
    setSearching(false);
  };

  const confirm = () => {
    if (!coords) { alert("Map pe click karke pin drop karo"); return; }
    onPick({ lat: Number(coords.lat.toFixed(6)), lng: Number(coords.lng.toFixed(6)) });
    onClose();
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 800 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(720px,95vw)", height: "min(560px,88vh)", background: "#fff", borderRadius: 12,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)", zIndex: 801, display: "flex", flexDirection: "column",
        overflow: "hidden", fontFamily: "'Segoe UI',sans-serif" }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", background: "#0D1B2A", color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>🗺️ Pick Location on Map</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        {/* Search */}
        <div style={{ padding: "10px 14px", display: "flex", gap: 8, borderBottom: "1px solid #E5E7EB" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search address / area (e.g. Raipur Civil Lines)…"
            style={{ flex: 1, padding: "8px 11px", borderRadius: 7, border: "1.5px solid #E5E7EB", fontSize: 12.5, outline: "none", fontFamily: "inherit" }} />
          <button onClick={doSearch} disabled={searching}
            style={{ padding: "8px 16px", borderRadius: 7, background: "#2563EB", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {searching ? "…" : "Search"}
          </button>
        </div>
        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          {!ready && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", fontSize: 13 }}>Loading map…</div>}
        </div>
        {/* Footer */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 12, color: "#374151" }}>
            {coords ? <>📍 <b>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</b></> : <span style={{ color: "#9CA3AF" }}>Map pe click karke ya search se pin drop karo</span>}
          </div>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 7, background: "#F3F4F6", border: "1px solid #D1D5DB", color: "#374151", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={confirm} disabled={!coords} style={{ padding: "9px 20px", borderRadius: 7, background: coords ? "#059669" : "#D1D5DB", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: coords ? "pointer" : "not-allowed" }}>✓ Use This Location</button>
        </div>
      </div>
    </>
  );
}
