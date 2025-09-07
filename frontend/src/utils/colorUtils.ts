import React from "react";

/**
 * Defines a consistent, 8-level color scheme based on percentage.
 * Includes a special celebratory color for 100%.
 * @param pct The percentage value (0-100).
 * @returns A CSSProperties object with the appropriate background and color.
 */
export function getStyleForPercentage(pct: number): React.CSSProperties {
  if (pct === 100) {
    return {
      background: "linear-gradient(45deg, #a855f7, #22d3ee)", // Purple to Cyan
      color: "#ffffff",
      fontWeight: "bold",
      textShadow: "0 0 5px rgba(0,0,0,0.5)",
    };
  }
  if (pct >= 88) return { background: "#16a34a", color: "#ffffff" }; // Bright Green
  if (pct >= 75) return { background: "#4d7c0f", color: "#ffffff" }; // Green
  if (pct >= 63) return { background: "#a16207", color: "#ffffff" }; // Dark Yellow
  if (pct >= 50) return { background: "#d97706", color: "#ffffff" }; // Orange
  if (pct >= 37) return { background: "#b45309", color: "#ffffff" }; // Dark Orange
  if (pct >= 25) return { background: "#b91c1c", color: "#ffffff" }; // Red
  if (pct > 0) return { background: "#7f1d1d", color: "#ffffff" }; // Dark Red

  // Default for 0% or less
  return { background: "#374151", color: "#d1d5db" }; // Dark Gray
}
