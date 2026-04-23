import React from "react";
import LeafletHeatMap from "./LeafletHeatMap";
import GoogleHeatMap, { GOOGLE_MAPS_ENABLED } from "./GoogleHeatMap";

/**
 * Unified HeatMap component.
 * Uses Google Maps (visualization library) if REACT_APP_GOOGLE_MAPS_API_KEY is set,
 * otherwise falls back to Leaflet + CartoDB (free tiles).
 * Both render light/monochrome base with urgency-weighted red→green heatmap.
 */
export default function HeatMap(props) {
  if (GOOGLE_MAPS_ENABLED) {
    return <GoogleHeatMap {...props} />;
  }
  return <LeafletHeatMap {...props} />;
}
