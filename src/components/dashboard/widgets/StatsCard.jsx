import React from "react";

export default function StatsCard({ title, tooltip, children, href }) {
    const Wrapper = href ? "a" : "div";
    const props = href ? { href } : {};
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 border">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div>
                {tooltip && (
                    <span className="text-xs text-gray-400" title={tooltip}>
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
