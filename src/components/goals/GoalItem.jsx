// src/components/goals/GoalItem.jsx
import React from "react";
import { calculateGoalProgress } from "../../utils/goalUtils";
import { Link } from "react-router-dom";
import { FaArrowRight, FaExclamationTriangle, FaCheckCircle, FaClock, FaFlag } from "react-icons/fa";
import { Pencil, MoreHorizontal } from "lucide-react";
import { useFormattedDate } from "../../hooks/useFormattedDate";
import { getStatusConfig, getProgressColor } from "../../utils/goalCardStyles";

const GoalItem = ({ goal }) => {
    const { id, title, description, dueDate, status, milestones = [] } = goal;
    const { formatDate } = useFormattedDate();

    const formattedDueDate = formatDate(new Date(dueDate));

    const isOverdue = status === "active" && new Date(dueDate) < new Date();
    const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));

    const completedMilestones =
        (milestones || []).filter((m) => {
            if (m && m.done) return true;
            if (m && m.score !== undefined && m.score !== null) return parseFloat(m.score) >= 1;
            return false;
        }).length;
    const totalMilestones = milestones.length;
    const progressPercent = calculateGoalProgress(goal);

    const statusConfig = getStatusConfig(status);

    return (
        <Link to={`/goals/${id}`} className="group block relative">
            <div
                className={`
        relative p-6 bg-white border-2 rounded-2xl shadow-sm transition-all duration-300 
        hover:shadow-xl hover:border-blue-300 hover:-translate-y-1
        ${isOverdue ? "border-red-200 bg-red-50/30" : "border-slate-200"}
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
      `}
            >
                {/* Overdue indicator */}
                {isOverdue && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <FaExclamationTriangle className="w-3 h-3 text-white" />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {/* Left side: Checkbox + Status Badge */}
                    <div className="flex items-center gap-2">
                        {status === "active" && (
                            <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                                <FaCheckCircle className="w-4 h-4" />
                            </button>
                        )}
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span
                            className={`
                inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full
                ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border
              `}
                        >
                            {statusConfig.label}
                        </span>
                    </div>

                    {/* Right side: Edit + Menu + Arrow */}
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                            <FaArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-all group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h3
                    className="font-bold text-slate-900 text-lg mb-2 group-hover:text-blue-900 transition-colors"
                    title={title}
                >
                    {title}
                </h3>

                {/* Description */}
                {description && (
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">{description}</p>
                )}

                {/* Progress Section */}
                <div className="mb-4 space-y-3">
                    {/* Progress Bar */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700">Overall Progress</span>
                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-full">
                                {progressPercent}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${getProgressColor(progressPercent)} transition-all duration-700 ease-out relative`}
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Milestones indicator */}
                    {totalMilestones > 0 && (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <FaFlag className="w-3 h-3 text-slate-600" />
                                <span className="text-xs font-semibold text-slate-700">Milestones</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                    {completedMilestones}/{totalMilestones}
                                </span>
                                <div className="flex gap-1">
                                    {milestones.slice(0, 5).map((milestone, index) => (
                                        <div
                                            key={index}
                                            className={`w-2 h-2 rounded-full ${
                                                milestone.done ? "bg-green-500" : "bg-slate-300"
                                            }`}
                                        />
                                    ))}
                                    {totalMilestones > 5 && (
                                        <span className="text-xs text-slate-500">+{totalMilestones - 5}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    {/* Due date */}
                    <div
                        className={`flex items-center gap-2 text-xs ${
                            isOverdue ? "text-red-600 font-semibold" : "text-slate-600"
                        }`}
                    >
                        <FaClock className="w-3 h-3" />
                        {isOverdue ? (
                            <span>Overdue by {Math.abs(daysUntilDue)} days</span>
                        ) : daysUntilDue === 0 ? (
                            <span>Due today</span>
                        ) : daysUntilDue > 0 ? (
                            <span>Due in {daysUntilDue} days</span>
                        ) : (
                            <span>Due {formattedDueDate}</span>
                        )}
                    </div>

                    {/* Action hint */}
                    <div className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                        View Details →
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default GoalItem;
