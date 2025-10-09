import React from "react";

export default function StatsCard({ title, tooltip, children, href }) {
    const Wrapper = href ? "a" : "div";
    const props = href ? { href } : {};
    return (
        <div className="bg-[Canvas] rounded-2xl shadow p-1 border flex flex-col h-full">
            <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-semibold text-[CanvasText]">{title}</div>
                {tooltip && (
                    <span className="text-xs text-[CanvasText] opacity-60" title={tooltip}>
                        ℹ️
                    </span>
                )}
            </div>
            <Wrapper
                {...props}
                className={
                    href
                        ? "block flex-grow p-0.5"
                        : "flex-grow flex flex-col justify-center items-center gap-0.5 p-0.5"
                }
            >
                {children}
            </Wrapper>
        </div>
    );
}
