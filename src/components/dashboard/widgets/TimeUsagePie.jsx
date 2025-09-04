import React from "react";

export default function TimeUsagePie({ productive = 0, trap = 0 }) {
    const total = productive + trap || 1;
    const percent = Math.min(100, Math.max(0, (productive / total) * 100));
    return (
        <div className="flex items-center gap-4 text-[CanvasText]">
            <svg viewBox="0 0 32 32" className="w-24 h-24">
                {/* Track uses current text color with low opacity for system-aware contrast */}
                <circle r="16" cx="16" cy="16" fill="currentColor" opacity="0.12" />
                <circle
                    r="16"
                    cx="16"
                    cy="16"
                    fill="transparent"
                    stroke="#22c55e"
                    strokeWidth="32"
                    strokeDasharray={`${percent} 100`}
                    transform="rotate(-90 16 16)"
                />
            </svg>
            <div className="text-sm text-[CanvasText]/70">
                <div>
                    <span className="inline-block w-3 h-3 bg-green-500 mr-2" />
                    Goal-aligned
                </div>
                <div>
                    <span className="inline-block w-3 h-3 bg-red-500 mr-2" />
                    Trap
                </div>
            </div>
        </div>
    );
}
