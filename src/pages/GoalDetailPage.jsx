// src/pages/GoalDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGoalById, updateGoal, deleteGoal } from "../services/goalService";
import { updateMilestone } from "../services/milestoneService";
import {
    FaArrowLeft,
    FaEdit,
    FaTrash,
    FaEye,
    FaEyeSlash,
    FaFlag,
    FaClock,
    FaCheckCircle,
    FaArchive,
    FaShare,
    FaSitemap,
} from "react-icons/fa";
import MilestoneItem from "../components/goals/MilestoneItem";
import EditGoalModal from "../components/goals/EditGoalModal";

const GoalDetailPage = () => {
    const { goalId } = useParams();
    const navigate = useNavigate();
    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);

    useEffect(() => {
        fetchGoal();
    }, [goalId]);

    const fetchGoal = async () => {
        try {
            setLoading(true);
            const data = await getGoalById(goalId);
            setGoal(data);
        } catch (err) {
            setError("Failed to load goal details");
        } finally {
            setLoading(false);
        }
    };

    const handleMilestoneUpdate = async (milestoneId, updateData) => {
        try {
            await updateMilestone(milestoneId, updateData);
            await fetchGoal(); // Refresh to get updated progress
        } catch (err) {
            console.error("Failed to update milestone:", err);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateGoal(goalId, { status: newStatus });
            await fetchGoal();
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const handleVisibilityToggle = async () => {
        try {
            const newVisibility = goal.visibility === "public" ? "private" : "public";
            await updateGoal(goalId, { visibility: newVisibility });
            await fetchGoal();
        } catch (err) {
            console.error("Failed to update visibility:", err);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
            try {
                await deleteGoal(goalId);
                navigate("/goals");
            } catch (err) {
                console.error("Failed to delete goal:", err);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading goal details...</p>
                </div>
            </div>
        );
    }

    if (error || !goal) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-red-800 font-medium">{error || "Goal not found"}</p>
                    <button
                        onClick={() => navigate("/goals")}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Back to Goals
                    </button>
                </div>
            </div>
        );
    }

    const isOverdue = goal.status === "active" && new Date(goal.dueDate) < new Date();
    const completedMilestones = goal.milestones?.filter((m) => m.done).length || 0;
    const totalMilestones = goal.milestones?.length || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => navigate("/goals")}
                            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <FaArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-slate-900">{goal.title}</h1>
                                {goal.visibility === "private" && (
                                    <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1">
                                        <FaEyeSlash className="w-3 h-3" />
                                        Private
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-600">{goal.description || "No description provided"}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setEditModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <FaEdit className="w-4 h-4" />
                            Edit Goal
                        </button>

                        <button
                            onClick={handleVisibilityToggle}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            {goal.visibility === "private" ? (
                                <FaEye className="w-4 h-4" />
                            ) : (
                                <FaEyeSlash className="w-4 h-4" />
                            )}
                            Make {goal.visibility === "private" ? "Public" : "Private"}
                        </button>

                        {goal.status === "active" && (
                            <button
                                onClick={() => handleStatusChange("completed")}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <FaCheckCircle className="w-4 h-4" />
                                Complete Goal
                            </button>
                        )}

                        {goal.status !== "archived" && (
                            <button
                                onClick={() => handleStatusChange("archived")}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                <FaArchive className="w-4 h-4" />
                                Archive
                            </button>
                        )}

                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <FaTrash className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Goal Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress Overview */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900">Progress Overview</h2>
                                <div className="text-3xl font-bold text-blue-600">{goal.progressPercent || 0}%</div>
                            </div>

                            <div className="mb-4">
                                <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 ${
                                            (goal.progressPercent || 0) >= 90
                                                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                                : (goal.progressPercent || 0) >= 70
                                                  ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                                                  : (goal.progressPercent || 0) >= 40
                                                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                                    : "bg-gradient-to-r from-red-500 to-pink-500"
                                        }`}
                                        style={{ width: `${goal.progressPercent || 0}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{completedMilestones}</div>
                                    <div className="text-sm text-slate-600">Completed</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {totalMilestones - completedMilestones}
                                    </div>
                                    <div className="text-sm text-slate-600">Remaining</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{totalMilestones}</div>
                                    <div className="text-sm text-slate-600">Total</div>
                                </div>
                            </div>
                        </div>

                        {/* Milestones */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <FaFlag className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-bold text-slate-900">Milestones</h2>
                            </div>

                            {goal.milestones && goal.milestones.length > 0 ? (
                                <div className="space-y-3">
                                    {goal.milestones.map((milestone) => (
                                        <MilestoneItem
                                            key={milestone.id}
                                            milestone={milestone}
                                            onUpdate={handleMilestoneUpdate}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    No milestones defined for this goal
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Sidebar Info */}
                    <div className="space-y-6">
                        {/* Goal Status */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Goal Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Status</span>
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                                            goal.status === "completed"
                                                ? "bg-green-100 text-green-800"
                                                : goal.status === "active"
                                                  ? "bg-blue-100 text-blue-800"
                                                  : "bg-slate-100 text-slate-800"
                                        }`}
                                    >
                                        {goal.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Due Date</span>
                                    <span className={`font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
                                        {new Date(goal.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                                {goal.startDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">Start Date</span>
                                        <span className="font-semibold text-slate-900">
                                            {new Date(goal.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Visibility</span>
                                    <span className="font-semibold text-slate-900 capitalize">{goal.visibility}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                                    <FaShare className="w-4 h-4" />
                                    Export Goal
                                </button>
                                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                                    <FaSitemap className="w-4 h-4" />
                                    View Hierarchy
                                </button>
                                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                                    <FaClock className="w-4 h-4" />
                                    View History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                {editModalOpen && (
                    <EditGoalModal
                        goal={goal}
                        onClose={() => setEditModalOpen(false)}
                        onUpdate={() => {
                            fetchGoal();
                            setEditModalOpen(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default GoalDetailPage;
