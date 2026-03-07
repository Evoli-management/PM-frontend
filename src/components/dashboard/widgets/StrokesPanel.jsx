import React from "react";
import { useTranslation } from "react-i18next";

export default function StrokesPanel({ strokes = { received: [], given: [] }, onGive }) {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[CanvasText]">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{t("strokesPanel.received")}</div>
                </div>
                {strokes.received.length === 0 ? (
                    <div className="opacity-60 text-sm">{t("strokesPanel.noReceived")}</div>
                ) : (
                    <ul className="space-y-2">
                        {strokes.received.map((s) => (
                            <li key={s.id} className="p-3 border rounded">
                                <div className="text-sm">
                                    <span className="font-medium">{s.from}</span>: {s.msg}
                                </div>
                                <div className="text-xs opacity-60">{s.time} ago</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div>
                <div className="font-semibold text-sm mb-2">{t("strokesPanel.given")}</div>
                {strokes.given.length === 0 ? (
                    <div className="opacity-60 text-sm">{t("strokesPanel.noGiven")}</div>
                ) : (
                    <ul className="space-y-2">
                        {strokes.given.map((s) => (
                            <li key={s.id} className="p-3 border rounded">
                                <div className="text-sm">
                                    {t("strokesPanel.to")} <span className="font-medium">{s.to}</span>: {s.msg}
                                </div>
                                <div className="text-xs opacity-60">{s.time} ago</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
