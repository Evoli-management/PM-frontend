// src/components/goals/MilestoneItem.jsx
import React, { useState } from "react";
import { Check, Clock, Scale } from "lucide-react";

const MilestoneItem = ({ milestone, onUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleToggleComplete = async () => {
        setIsUpdating(true);
        try {
            await onUpdate(milestone.id, { done: !milestone.done });
        } catch (error) {
            console.error("Failed to update milestone:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div
            className={`
      flex items-start gap-4 p-4 border-2 rounded-xl transition-all duration-300
      ${milestone.done
                    ? "border-green-200 bg-green-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }
    `}
        >
            {/* Checkbox */}
            <button
                onClick={handleToggleComplete}
                disabled={isUpdating}
                className={`
          flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
          ${milestone.done ? "border-green-500 bg-green-500 text-white" : "border-slate-300 hover:border-blue-500"}
          ${isUpdating ? "opacity-50 cursor-wait" : "cursor-pointer"}
        `}
            >
                {isUpdating ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : milestone.done ? (
                    <Check className="w-3 h-3" />
                ) : null}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h4
                        className={`
            font-semibold transition-all
            ${milestone.done ? "text-green-800 line-through" : "text-slate-900"}
          `}
                    >
                        {milestone.title}
                    </h4>

                    {/* Weight indicator */}
                    {milestone.weight && parseFloat(milestone.weight) !== 1.0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <Scale className="w-3 h-3" />
                            {parseFloat(milestone.weight)}x
                        </div>
                    )}
                </div>

                {/* Date range: start date and due date */}
                <div className="flex flex-col gap-2">
                    {milestone.startDate && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>Start {new Date(milestone.startDate).toLocaleDateString()}</span>
                        </div>
                    )}
                    {milestone.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
                            {!milestone.done && new Date(milestone.dueDate) < new Date() && (
                                <span className="text-red-600 font-semibold">(Overdue)</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Score if partial completion */}
                {milestone.score && !milestone.done && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Partial Progress</span>
                            <span className="text-xs font-semibold text-slate-900">
                                {Math.round(parseFloat(milestone.score) * 100)}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="h-2 bg-blue-500 rounded-full transition-all"
                                style={{ width: `${Math.round(parseFloat(milestone.score) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MilestoneItem;
