import React, { useEffect, useRef } from "react";

/**
 * GoalGauge
 * - Needle rotates 180° over the top half, pivot fixed at center.
 * Props:
 *  - percent: number (0-100)
 *  - size: number (px) default 100
 *  - rawHtml: optional string with the provided gauge HTML
 */
const GoalGauge = ({ percent = 0, size = 100, rawHtml = null }) => {
  const containerRef = useRef(null);

  // Default static gauge markup (red / yellow / green semicircle + needle)
  const DEFAULT_GAUGE_HTML = `
<div class="plot-container plotly">
  <div class="svg-container" style="position: relative; width: 100px; height: 100px;">
    <svg class="main-svg"
         xmlns="http://www.w3.org/2000/svg"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         width="100"
         height="100"
         viewBox="0 0 100 100"
         style="background:#ffffff;">
  <!-- background semicircle guide (rotated to top so gauge background sits on the top half)
       Rotation does not affect needle rotation which uses its own transform pivot. -->
  <path d="M25,50
       a25,25 0 0 0 50,0"
    transform="rotate(180 50 50)"
    style="fill:none;stroke:#e5e7eb;stroke-width:6;stroke-linecap:round;" />

      <!-- green segment (right) -->
      <path d="M75,50
               a25,25 0 0 0 -12.5,-21.650635094610962
               l12.5,-21.65063509461097
               a50,50 0 0 1 25,43.301270189221924Z"
            style="pointer-events:all;stroke-width:0;fill:#009447;stroke:#000;stroke-opacity:1;" />
      <!-- yellow segment (top) -->
      <path d="M62.49999999999999,28.34936490538903
               a25,25 0 0 0 -25,1.0658141036401503e-14
               l-12.50000000000001,-21.65063509461096
               a50,50 0 0 1 50,-2.1316282072803006e-14Z"
            style="pointer-events:all;stroke-width:0;fill:#ffc000;stroke:#000;stroke-opacity:1;" />
      <!-- red segment (left) -->
      <path d="M37.499999999999986,28.34936490538904
               a25,25 0 0 0 -12.49999999999999,21.650635094610973
               l-25,1.5122536870443156e-14
               a50,50 0 0 1 24.99999999999998,-43.301270189221945Z"
            style="pointer-events:all;stroke-width:0;fill:#d00000;stroke:#000;stroke-opacity:1;" />

      <!-- center dot -->
      <circle cx="50" cy="50" r="3.5"
              class="gauge-center"
              style="fill:#850000;stroke-width:0;" />

      <!-- Needle triangle: base at center (50,50),
           pointing left when unrotated; we'll rotate it in JS -->
      <path class="gauge-needle"
            d="M 50 51.25 L 50 48.75 L 25 50 Z"
            style="opacity:1;stroke:#850000;stroke-opacity:1;fill:#850000;fill-opacity:1;stroke-width:2px;" />
    </svg>
  </div>
</div>`;

  // Inject SVG into container
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const htmlToUse = rawHtml || DEFAULT_GAUGE_HTML;

    el.innerHTML = htmlToUse;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.position = "relative";
    el.style.display = "inline-block";
    el.style.lineHeight = 0;

    return () => {
      el.innerHTML = "";
    };
  }, [rawHtml, size]);

  // Clamp percent and compute angle + color
  const clamped = Math.max(0, Math.min(100, percent));
  // Map percent (0-100) to a 0°→180° rotation so needle sweeps left -> top -> right
  // unrotated needle points left (0°). 0% -> 0° (left), 50% -> 90° (top), 100% -> 180° (right)
  const angle = clamped * 1.8;
  const color = clamped < 34 ? "#d02626" : clamped < 67 ? "#f5b400" : "#059669";

  // Rotate needle around fixed center (50,50) and recolor center dot + needle
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const needle = el.querySelector(".gauge-needle");
      const center = el.querySelector(".gauge-center");

      if (needle) {
        // SVG rotation with explicit pivot at (50,50)
        needle.setAttribute("transform", `rotate(${angle} 50 50)`);
        needle.style.transition = "transform 420ms cubic-bezier(0.2,0.9,0.2,1)";
        needle.style.fill = color;
        needle.style.stroke = color;
      }
      if (center) {
        center.style.fill = color;
      }
    } catch (e) {
      // ignore if something unexpected happens
    }
  }, [angle, color]);

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <div ref={containerRef} aria-hidden="true" />
    </div>
  );
};

export default GoalGauge;
