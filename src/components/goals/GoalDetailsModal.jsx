import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    FaBullseye,
    FaTimes,
    FaEdit,
    FaTags,
    FaFlagCheckered,
    FaUser,
    FaCalendarAlt,
    FaLink,
    FaFlag,
    FaCheck,
    FaClock,
    FaSpinner,
} from "react-icons/fa";

import { getStatusColor } from "../../utils/goalUtils";
import milestoneService from "../../services/milestoneService";
import Chip from "./Chip.jsx";
import ProgressBar from "./ProgressBar.jsx";

const GoalDetailsModal = ({ goal, onClose, onEdit }) => {
    const [milestones, setMilestones] = useState([]);
    const [loadingMilestones, setLoadingMilestones] = useState(true);

    useEffect(() => {
        const fetchMilestones = async () => {
            if (goal?.id) {
                try {
                    setLoadingMilestones(true);
                    console.log("Fetching milestones for goal:", goal.id); // Debug log
                    const goalMilestones = await milestoneService.getMilestonesByGoal(goal.id);
                    console.log("Received milestones:", goalMilestones); // Debug log
                    setMilestones(goalMilestones || []);
                } catch (error) {
                    console.error("Error fetching milestones:", error);
                    setMilestones([]); // Set empty array on error
                } finally {
                    setLoadingMilestones(false);
                }
            }
        };

        fetchMilestones();
    }, [goal?.id]);

    // Calculate milestone progress based on the actual schema fields
    const completedMilestones = milestones.filter((m) => m.done === true || m.completedAt).length;
    const totalMilestones = milestones.length;
    const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const getDateStatus = (targetDate) => {
        if (!targetDate) return null;
        const today = new Date();
        const target = new Date(targetDate);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: "Overdue", class: "text-red-600 bg-red-50" };
        if (diffDays === 0) return { text: "Due today", class: "text-orange-600 bg-orange-50" };
        if (diffDays <= 7) return { text: `${diffDays}d left`, class: "text-yellow-600 bg-yellow-50" };
        return { text: `${diffDays}d left`, class: "text-slate-600" };
    };

    const getMilestoneStatus = (milestone) => {
        // Handle different possible status field names
        if (milestone.done === true || milestone.completedAt) {
            return "completed";
        }
        // You might have other status fields - adjust as needed
        return milestone.status || "active";
    };

    const formatMilestoneDate = (milestone) => {
        // Handle different possible date field names
        const dateField = milestone.dueDate || milestone.targetDate;
        return dateField ? new Date(dateField).toLocaleDateString() : null;
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-5xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{goal.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    {goal.keyAreaName && <Chip label={goal.keyAreaName} />}
                                    <Chip label={`${goal.progressPercentage || 0}% Complete`} />
                                    {totalMilestones > 0 && (
                                        <Chip label={`${completedMilestones}/${totalMilestones} milestones`} />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onEdit(goal)}
                                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                                title="Edit goal"
                            >
                                <FaEdit />
                            </button>
                            <button onClick={onClose} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <FaTags className="text-blue-700" /> Description & Details
                                </h4>
                                <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                                    {goal.description || "No description provided."}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                    <FaFlagCheckered className="text-blue-700" /> Progress Tracking
                                </h4>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
                                        <span className="text-sm font-semibold text-slate-900">
                                            {goal.progressPercentage || 0}%
                                        </span>
                                    </div>
                                    <ProgressBar value={goal.progressPercentage || 0} />
                                </div>

                                {totalMilestones > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-slate-700">
                                                Milestone Progress
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900">
                                                {completedMilestones}/{totalMilestones} ({milestoneProgress}%)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${milestoneProgress}%` }}
                                                />
                                            </div>
                                            {completedMilestones === totalMilestones && totalMilestones > 0 && (
                                                <FaCheck className="text-green-600" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Milestones Section */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                    <FaFlag className="text-blue-700" /> Milestones
                                    {totalMilestones > 0 && (
                                        <span className="text-sm font-normal text-slate-600">
                                            ({totalMilestones} total)
                                        </span>
                                    )}
                                </h4>

                                {loadingMilestones ? (
                                    <div className="flex items-center justify-center py-4">
                                        <FaSpinner className="animate-spin text-blue-600 mr-2" />
                                        <span className="text-sm text-slate-600">Loading milestones...</span>
                                    </div>
                                ) : totalMilestones === 0 ? (
                                    <div className="text-center py-4 text-slate-500">
                                        <FaFlag className="mx-auto text-2xl mb-2 opacity-50" />
                                        <p className="text-sm">No milestones found for this goal</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Add milestones by editing this goal
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {milestones.map((milestone) => {
                                            const milestoneStatus = getMilestoneStatus(milestone);
                                            const milestoneDate = formatMilestoneDate(milestone);
                                            const dateStatus = getDateStatus(milestone.dueDate || milestone.targetDate);
                                            
                                            return (
                                                <div
                                                    key={milestone.id}
                                                    className={`border rounded-lg p-3 ${
                                                        milestoneStatus === "completed"
                                                            ? "bg-green-50 border-green-200"
                                                            : "bg-white border-slate-200"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                                milestoneStatus === "completed"
                                                                    ? "bg-green-500 border-green-500 text-white"
                                                                    : "border-slate-300"
                                                            }`}
                                                        >
                                                            {milestoneStatus === "completed" && (
                                                                <FaCheck className="text-xs" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <h5
                                                                className={`font-medium text-sm ${
                                                                    milestoneStatus === "completed"
                                                                        ? "line-through text-slate-600"
                                                                        : "text-slate-900"
                                                                }`}
                                                            >
                                                                {milestone.title}
                                                            </h5>

                                                            {milestone.description && (
                                                                <p className="text-xs text-slate-600 mt-1">
                                                                    {milestone.description}
                                                                </p>
                                                            )}

                                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                                {milestoneDate && (
                                                                    <div className="flex items-center gap-1">
                                                                        <FaCalendarAlt className="text-xs text-slate-500" />
                                                                        <span className="text-xs text-slate-600">
                                                                            {milestoneDate}
                                                                        </span>
                                                                        {dateStatus && milestoneStatus !== "completed" && (
                                                                            <span
                                                                                className={`text-xs px-2 py-0.5 rounded-full ${dateStatus.class}`}
                                                                            >
                                                                                {dateStatus.text}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                
                                                                {milestone.weight && (
                                                                    <span className="text-xs text-slate-500">
                                                                        Weight: {milestone.weight}
                                                                    </span>
                                                                )}
                                                                
                                                                <span
                                                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                                                        milestoneStatus === "completed"
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-slate-100 text-slate-700"
                                                                    }`}
                                                                >
                                                                    {milestoneStatus}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <FaUser className="text-blue-700" /> Goal Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Status:</span>
                                        <Chip label={goal.status || "active"} toneClass={getStatusColor(goal.status)} />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Visibility:</span>
                                        <Chip label={goal.visibility || "private"} />
                                    </div>
                                    {goal.keyAreaName && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Key Area:</span>
                                            <Chip label={goal.keyAreaName} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <FaCalendarAlt className="text-blue-700" /> Timeline
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Start:</span>
                                        <span className="font-semibold">
                                            {goal.startDate ? new Date(goal.startDate).toLocaleDateString() : "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Target:</span>
                                        <span
                                            className={`font-semibold ${
                                                goal.targetDate &&
                                                new Date(goal.targetDate) < new Date() &&
                                                goal.status === "active"
                                                    ? "text-red-600"
                                                    : ""
                                            }`}
                                        >
                                            {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "—"}
                                        </span>
                                    </div>
                                    {goal.completedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Completed:</span>
                                            <span className="font-semibold text-green-600">
                                                {new Date(goal.completedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <FaLink className="text-blue-700" /> Sub-Goals
                                </h4>
                                <div className="text-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-slate-600">Sub-goals:</span>
                                        <span className="font-bold text-lg">{goal.subGoalCount || 0}</span>
                                    </div>
                                    <Link
                                        to={`/sub-goals?goalId=${goal.id}`}
                                        className="text-blue-700 font-semibold hover:underline text-sm block"
                                    >
                                        → Manage Sub-Goals
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalDetailsModal;