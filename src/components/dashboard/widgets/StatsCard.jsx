import React from "react";

export default function StatsCard({ title, tooltip, children, href }) {
    const Wrapper = href ? "a" : "div";
    const props = href ? { href } : {};
    return (
        <div className="bg-[Canvas] rounded-2xl shadow p-4 border">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-[CanvasText]">{title}</div>
                {tooltip && (
                    <span className="text-xs text-[CanvasText] opacity-60" title={tooltip}>
                        ℹ️
                    </span>
                )}
            </div>
            <Wrapper {...props} className={href ? "block" : undefined}>
                {children}
            </Wrapper>
        </div>
    );
}
