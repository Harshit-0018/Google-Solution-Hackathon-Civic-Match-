import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// Light/silver map tiles (CartoDB Positron — free)
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
const TILE_ATTRIB = '&copy; OpenStreetMap &copy; CARTO';

export default function HeatMap({ points = [], center = [10.8505, 76.2711], zoom = 7, height = 400 }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const heatRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIB, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
    }
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const heatData = points
      .filter((p) => p.lat && p.lng)
      .map((p) => [p.lat, p.lng, Math.max(0.2, (p.weight || 3) / 5)]);

    if (heatData.length > 0) {
      heatRef.current = L.heatLayer(heatData, {
        radius: 30,
        blur: 25,
        maxZoom: 12,
        gradient: { 0.2: "#00C05A", 0.4: "#FFC000", 0.7: "#FB8C00", 1.0: "#FF2A2A" },
      }).addTo(map);
    }

    // dots on top with label
    points.forEach((p) => {
      if (!p.lat || !p.lng) return;
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 4,
        color: "#111",
        fillColor: "#111",
        fillOpacity: 0.9,
        weight: 1,
      }).addTo(map);
      if (p.title) {
        marker.bindPopup(`<div style="font-family:IBM Plex Sans;font-size:12px;"><b>${p.title}</b><br/>U/${p.weight || 3} · ${p.category || ""}<br/><span style="color:#5C5C5C">${p.location_name || ""}</span></div>`);
      }
    });

    if (heatData.length > 0) {
      try {
        const group = L.latLngBounds(heatData.map((d) => [d[0], d[1]]));
        map.fitBounds(group, { padding: [30, 30], maxZoom: 10 });
      } catch {}
    }
  }, [points]);

  return (
    <div
      ref={containerRef}
      data-testid="heatmap"
      style={{ height: `${height}px`, width: "100%" }}
      className="border border-[#E5E5E5]"
    />
  );
}
