import React from "react";
import { useTranslation } from "react-i18next";

export default function QuickAddBar({ onOpen, message }) {
    const { t } = useTranslation();
    const items = [
        { key: "task", label: t("quickAddBar.task") },
        { key: "goal", label: t("quickAddBar.goal") },
        { key: "stroke", label: t("quickAddBar.stroke") },
        { key: "note", label: t("quickAddBar.note") },
        { key: "appointment", label: t("quickAddBar.appointment") },
    ];
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex gap-2">
                {items.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => onOpen?.(item.key)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                        + {item.label}
                    </button>
                ))}
            </div>
            <div className="flex-1 text-xs opacity-70">{t("quickAddBar.hint")}</div>
            {message && (
                <div className="text-sm font-medium" style={{ color: "CanvasText" }}>
                    {message}
                </div>
            )}
        </div>
    );
}
