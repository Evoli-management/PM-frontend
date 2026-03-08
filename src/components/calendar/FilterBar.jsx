import React from "react";
import { useTranslation } from "react-i18next";

export default function FilterBar({ filter, setFilter }) {
    const { t } = useTranslation();
    return (
        <div className="flex gap-2 mb-2">
            <span className="font-semibold">{t("filterBar.show")}</span>
            <button
                className={`px-3 py-1 rounded ${filter === "both" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setFilter("both")}
            >
                {t("filterBar.both")}
            </button>
            <button
                className={`px-3 py-1 rounded ${filter === "task" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setFilter("task")}
            >
                {t("filterBar.tasks")}
            </button>
            <button
                className={`px-3 py-1 rounded ${filter === "activity" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setFilter("activity")}
            >
                {t("filterBar.activities")}
            </button>
        </div>
    );
}
