import React from "react";
import { Link } from "react-router-dom";
import {
    FaBullseye,
    FaEdit,
    FaTrash,
    FaExclamationTriangle,
    FaClock,
    FaTasks,
    FaLink,
    FaFlag,
    FaCheck,
} from "react-icons/fa";

import { getStatusColor } from "../../utils/goalUtils";
import Chip from "./Chip.jsx";
import ProgressBar from "./ProgressBar.jsx";

const GoalCard = ({ goal, onOpen, onEdit, onDelete }) => {
    const statusTone = getStatusColor(goal.status);

    const displayDate = goal.dueDate || goal.targetDate;
    const isOverdue = displayDate && new Date(displayDate) < new Date() && goal.status === "active";
    const daysUntilDue = displayDate ? Math.ceil((new Date(displayDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    // Milestone progress calculations
    const completedMilestones = goal.completedMilestoneCount || 0;
    const totalMilestones = goal.milestoneCount || 0;
    const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return (
        <div
            className={`bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow p-4 ${
                isOverdue ? "border-red-200 bg-red-50/30" : ""
            }`}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1">
                    <div
                        className={`p-2 rounded-xl ${
                            goal.status === "completed"
                                ? "bg-green-50 text-green-700"
                                : goal.status === "paused"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-blue-50 text-blue-700"
                        }`}
                    >
                        <FaBullseye />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 truncate" title={goal.title}>
                                {goal.title}
                            </h3>
                            {isOverdue && <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />}
                        </div>
                        {goal.keyAreaName && <Chip label={goal.keyAreaName} className="mb-2" />}
                        {goal.description && (
                            <p className="text-sm text-slate-700 mb-3 line-clamp-2">{goal.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => onEdit(goal)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        title="Edit goal"
                    >
                        <FaEdit className="text-xs" />
                    </button>
                    <button
                        onClick={() => onDelete(goal)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600"
                        title="Delete goal"
                    >
                        <FaTrash className="text-xs" />
                    </button>
                </div>
            </div>

            {/* Progress Section */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">Overall Progress</span>
                    <span className="text-xs font-semibold text-slate-900">{goal.progressPercentage || 0}%</span>
                </div>
                <ProgressBar value={goal.progressPercentage || 0} />
            </div>

            {/* Milestones Progress */}
            {totalMilestones > 0 && (
                <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                            <FaFlag className="text-xs text-slate-600" />
                            <span className="text-xs font-semibold text-slate-700">Milestones</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                            {completedMilestones}/{totalMilestones}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div
                                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${milestoneProgress}%` }}
                            />
                        </div>
                        {completedMilestones === totalMilestones && totalMilestones > 0 && (
                            <FaCheck className="text-green-600 text-xs" />
                        )}
                    </div>
                </div>
            )}

            <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap mb-3">
                {displayDate && (
                    <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                        <FaClock />
                        {isOverdue ? "Overdue" : daysUntilDue > 0 ? `${daysUntilDue}d left` : "Due today"}
                    </span>
                )}
                {typeof goal.subGoalCount === "number" && (
                    <span className="inline-flex items-center gap-1">
                        <FaTasks /> {goal.subGoalCount} sub-goals
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 mb-3">
                {goal.status && <Chip label={goal.status} toneClass={`${statusTone} border`} />}
                {goal.visibility && <Chip label={goal.visibility} />}
            </div>

            <div className="flex items-center justify-between">
                <button
                    className="text-sm font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                    onClick={() => onOpen(goal)}
                >
                    <FaLink /> View Details
                </button>
                <Link
                    to="/tasks?view=activity-trap"
                    className="text-xs text-amber-700 font-semibold hover:underline"
                    title="Link unassigned tasks from Activity Trap"
                >
                    Link Tasks
                </Link>
            </div>
        </div>
    );
};

export default GoalCard;
