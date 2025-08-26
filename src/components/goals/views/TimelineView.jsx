import React from "react";
import { FaStream, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import Chip from "../Chip.jsx";
import ProgressBar from "../ProgressBar.jsx";

const TimelineView = ({ filtered, onOpen }) => {
    return (
        <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center gap-2 mb-6">
                <FaStream className="text-blue-700" />
                <h4 className="font-bold text-slate-900">Goals Timeline</h4>
            </div>
            <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                <div className="space-y-6">
                    {filtered
                        .slice()
                        .sort((a, b) => (a.targetDate || "9999-12-31").localeCompare(b.targetDate || "9999-12-31"))
                        .map((g, index) => {
                            const isOverdue =
                                g.targetDate && new Date(g.targetDate) < new Date() && g.status === "active";
                            return (
                                <div key={g.id} className="relative flex items-start gap-4">
                                    <div
                                        className={`absolute left-0 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                                            g.status === "completed"
                                                ? "bg-green-500"
                                                : isOverdue
                                                  ? "bg-red-500"
                                                  : g.status === "active"
                                                    ? "bg-blue-500"
                                                    : "bg-gray-400"
                                        }`}
                                    >
                                        {g.status === "completed" && <FaCheck className="text-white text-xs" />}
                                        {isOverdue && <FaExclamationTriangle className="text-white text-xs" />}
                                    </div>
                                    <div className="ml-12 flex-1 bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div>
                                                <h5 className="font-semibold text-slate-900">{g.title}</h5>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {g.targetDate && (
                                                        <Chip
                                                            label={`Due ${new Date(g.targetDate).toLocaleDateString()}`}
                                                            toneClass={
                                                                isOverdue ? "bg-red-50 text-red-700 border-red-200" : ""
                                                            }
                                                        />
                                                    )}
                                                    {g.keyAreaName && <Chip label={g.keyAreaName} />}
                                                    <Chip label={`${g.progressPercentage || 0}% complete`} />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onOpen(g)}
                                                className="text-blue-600 hover:underline text-sm font-semibold"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                        {g.description && (
                                            <p className="text-sm text-slate-700 mb-2 line-clamp-2">{g.description}</p>
                                        )}
                                        <ProgressBar value={g.progressPercentage || 0} />
                                    </div>
                                </div>
                            );
                        })}
                    {filtered.length === 0 && (
                        <div className="text-center text-slate-500 py-8">No goals to display in timeline</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelineView;
