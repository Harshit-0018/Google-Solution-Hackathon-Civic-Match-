import React, { useEffect, useRef } from "react";

const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
let loaderPromise = null;

function loadGoogleMaps() {
  if (!GMAPS_KEY) return Promise.reject(new Error("No Google Maps API key"));
  if (window.google && window.google.maps && window.google.maps.visualization) {
    return Promise.resolve(window.google);
  }
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=visualization,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return loaderPromise;
}

// Light/monochrome map style to match Swiss design
const MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#E3F2FD" }] },
];

export default function GoogleHeatMap({ points = [], center = { lat: 10.8505, lng: 76.2711 }, zoom = 7, height = 400 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatmapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        if (mapRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center, zoom, styles: MAP_STYLE, disableDefaultUI: false, scrollwheel: false,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    const google = window.google;
    if (heatmapRef.current) heatmapRef.current.setMap(null);
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const valid = points.filter((p) => p.lat && p.lng);
    if (valid.length === 0) return;
    const heatData = valid.map((p) => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      weight: Math.max(0.2, (p.weight || 3) / 5),
    }));
    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data: heatData, radius: 30,
      gradient: ["rgba(0,192,90,0)", "#00C05A", "#FFC000", "#FB8C00", "#FF2A2A"],
    });
    heatmapRef.current.setMap(mapRef.current);

    valid.forEach((p) => {
      const m = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: "#111", fillOpacity: 0.9, strokeColor: "#111" },
      });
      if (p.title) {
        const info = new google.maps.InfoWindow({
          content: `<div style="font-family:IBM Plex Sans;font-size:12px;"><b>${p.title}</b><br/>U/${p.weight || 3} · ${p.category || ""}<br/><span style='color:#5C5C5C'>${p.location_name || ""}</span></div>`,
        });
        m.addListener("click", () => info.open(mapRef.current, m));
      }
      markersRef.current.push(m);
    });

    const bounds = new google.maps.LatLngBounds();
    valid.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(bounds, 40);
  }, [points]);

  return (
    <div ref={containerRef} data-testid="heatmap" style={{ height: `${height}px`, width: "100%" }} className="border border-[#E5E5E5]" />
  );
}

export const GOOGLE_MAPS_ENABLED = !!GMAPS_KEY;
