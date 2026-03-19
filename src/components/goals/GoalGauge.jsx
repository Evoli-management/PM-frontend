import React from "react";

const GoalGauge = ({ percent = 0, size = 100 }) => {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const color = clamped < 34 ? "#d02626" : clamped < 67 ? "#f5b400" : "#059669";
  const radians = Math.PI - (clamped / 100) * Math.PI;
  const pointerLength = 24;
  const pointerX = 50 + Math.cos(radians) * pointerLength;
  const pointerY = 50 - Math.sin(radians) * pointerLength;

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
      }}
    >
      <svg
        className="main-svg"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ background: "#ffffff", width: size, height: size }}
      >
        <path
          d="M25,50 a25,25 0 0 0 50,0"
          transform="rotate(180 50 50)"
          style={{ fill: "none", stroke: "#e5e7eb", strokeWidth: 6, strokeLinecap: "round" }}
        />
        <path
          d="M75,50 a25,25 0 0 0 -12.5,-21.650635094610962 l12.5,-21.65063509461097 a50,50 0 0 1 25,43.301270189221924Z"
          style={{ strokeWidth: 0, fill: "#009447", stroke: "#000", strokeOpacity: 1 }}
        />
        <path
          d="M62.49999999999999,28.34936490538903 a25,25 0 0 0 -25,1.0658141036401503e-14 l-12.50000000000001,-21.65063509461096 a50,50 0 0 1 50,-2.1316282072803006e-14Z"
          style={{ strokeWidth: 0, fill: "#ffc000", stroke: "#000", strokeOpacity: 1 }}
        />
        <path
          d="M37.499999999999986,28.34936490538904 a25,25 0 0 0 -12.49999999999999,21.650635094610973 l-25,1.5122536870443156e-14 a50,50 0 0 1 24.99999999999998,-43.301270189221945Z"
          style={{ strokeWidth: 0, fill: "#d00000", stroke: "#000", strokeOpacity: 1 }}
        />
        <line
          x1="50"
          y1="50"
          x2={pointerX}
          y2={pointerY}
          style={{
            stroke: color,
            strokeWidth: 3,
            strokeLinecap: "round",
            transition: "all 420ms cubic-bezier(0.2, 0.9, 0.2, 1)",
          }}
        />
        <circle cx="50" cy="50" r="3.5" style={{ fill: color, strokeWidth: 0 }} />
      </svg>
    </div>
  );
};

export default GoalGauge;
