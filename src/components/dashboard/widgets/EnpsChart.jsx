import React, { useRef, useState } from "react";

export default function EnpsChart({ data = [], labels = [] }) {
    const svgRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);
    const margin = { top: 8, right: 12, bottom: 26, left: 36 };
    const width = 680 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;
    const max = Math.max(...data, 10);
    const min = Math.min(...data, 0);
    const yRange = max - min || 1;
    const coords = data.map((v, i) => {
        const x = (i / Math.max(1, data.length - 1)) * width + margin.left;
        const y = margin.top + (height - ((v - min) / yRange) * height);
        return { x, y, v, i };
    });
    const areaPath = `M${margin.left},${margin.top + height} L ${coords.map((c) => `${c.x},${c.y}`).join(" L ")} L ${margin.left + width},${margin.top + height} Z`;
    const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const yTicks = 4;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, t) => Math.round(min + (t / yTicks) * yRange));
    function handleMove(e) {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
        const nearest = coords.reduce(
            (best, c) => (Math.abs(c.x - cursor.x) < Math.abs(best.x - cursor.x) ? c : best),
            coords[0],
        );
        setTooltip({ x: nearest.x, y: nearest.y, value: nearest.v, label: labels[nearest.i] || `#${nearest.i + 1}` });
    }
    return (
        <div className="relative w-full">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`}
                className="w-full h-32 rounded-md"
                onMouseMove={handleMove}
                onMouseLeave={() => setTooltip(null)}
            >
                <defs>
                    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {yTickValues.map((val, idx) => {
                    const y = margin.top + (height - ((val - min) / yRange) * height);
                    return (
                        <g key={idx}>
                            <line
                                x1={margin.left}
                                x2={margin.left + width}
                                y1={y}
                                y2={y}
                                stroke="#e6eefb"
                                strokeWidth={1}
                            />
                            <text x={margin.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                                {val}
                            </text>
                        </g>
                    );
                })}
                {coords.map((c, i) => (
                    <g key={i}>
                        <line
                            x1={c.x}
                            x2={c.x}
                            y1={margin.top + height}
                            y2={margin.top + height + 6}
                            stroke="#cde0ff"
                        />
                        <text x={c.x} y={margin.top + height + 18} textAnchor="middle" fontSize="11" fill="#6b7280">
                            {labels[i] || i + 1}
                        </text>
                    </g>
                ))}
                <path d={areaPath} fill="url(#g)" stroke="none" />
                <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    points={linePoints}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {coords.map((c, i) => (
                    <circle key={i} cx={c.x} cy={c.y} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1} />
                ))}
            </svg>
            {tooltip && (
                <div
                    className="absolute bg-[Canvas] shadow rounded px-3 py-2 text-sm text-[CanvasText] z-50 pointer-events-none"
                    style={{
                        left: Math.min(Math.max(tooltip.x - 40, 8), width + margin.left + margin.right - 120),
                        top: tooltip.y - 56,
                    }}
                >
                    <div className="font-semibold">{tooltip.label}</div>
                    <div className="text-xs opacity-70">Value: {tooltip.value}</div>
                </div>
            )}
        </div>
    );
}
