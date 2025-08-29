import React from "react";
import { FaEdit } from "react-icons/fa";
import Chip from "../Chip.jsx";
import ProgressBar from "../ProgressBar.jsx";

const KanbanView = ({ filtered, onOpen, onEdit, onDelete }) => {
    return (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {["active", "paused", "completed", "cancelled"].map((col) => {
                const columnGoals = filtered.filter((g) => g.status === col);
                return (
                    <div key={col} className="bg-slate-50 rounded-2xl border p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-3 h-3 rounded-full ${
                                        col === "active"
                                            ? "bg-blue-500"
                                            : col === "completed"
                                              ? "bg-green-500"
                                              : col === "paused"
                                                ? "bg-yellow-500"
                                                : "bg-gray-500"
                                    }`}
                                />
                                <h4 className="font-bold text-slate-900 capitalize">{col}</h4>
                            </div>
                            <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded-full">
                                {columnGoals.length}
                            </span>
                        </div>
                        <div className="space-y-3 min-h-[200px]">
                            {columnGoals.map((g) => (
                                <div
                                    key={g.id}
                                    className="bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h5 className="font-semibold text-slate-900 text-sm line-clamp-2">{g.title}</h5>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => onEdit(g)}
                                                className="p-1 text-slate-500 hover:text-blue-600"
                                            >
                                                <FaEdit className="text-xs" />
                                            </button>
                                        </div>
                                    </div>
                                    {g.keyAreaName && <Chip label={g.keyAreaName} className="mb-2" />}
                                    <div className="mb-2">
                                        <ProgressBar value={g.progressPercentage || 0} />
                                    </div>
                                    <div className="text-xs text-slate-600 flex items-center justify-between">
                                        <span>{g.progressPercentage || 0}% complete</span>
                                        <button onClick={() => onOpen(g)} className="text-blue-600 hover:underline">
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {columnGoals.length === 0 && (
                                <div className="text-sm text-slate-500 text-center py-8">No goals</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default KanbanView;
