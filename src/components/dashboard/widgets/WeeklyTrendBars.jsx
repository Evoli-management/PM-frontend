import React from "react";

// values: primary series (e.g., current week/month)
// compareValues: optional secondary series to compare (e.g., previous week/month)
export default function WeeklyTrendBars({ values = [], compareValues = [] }) {
    const maxLen = Math.max(values.length, compareValues.length || 0);
    const safe = (n) => Math.max(0, Math.min(10, Number(n) || 0));
    const norm = (n) => `${safe(n) * 10}%`;
    return (
        <div className="flex items-end gap-2 h-32 text-[CanvasText]">
            {Array.from({ length: maxLen }).map((_, i) => {
                const v = values[i] ?? 0;
                const c = compareValues[i] ?? null;
                return (
                    <div key={i} className="relative w-6 h-full">
                        {c != null && (
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-blue-400/30"
                                style={{ height: norm(c) }}
                                title={`Prev: ${c}h`}
                            />
                        )}
                        <div
                            className="absolute bottom-0 left-0 right-0 bg-blue-500/70"
                            style={{ height: norm(v) }}
                            title={`Now: ${v}h`}
                        />
                    </div>
                );
            })}
        </div>
    );
}
