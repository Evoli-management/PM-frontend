import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    FaBullseye,
    FaPlus,
    FaSearch,
    FaFilter,
    FaListUl,
    FaThLarge,
    FaStream,
    FaFlagCheckered,
    FaCalendarAlt,
    FaLink,
    FaUser,
    FaTags,
    FaCheck,
    FaClock,
    FaTasks,
    FaTimes,
    FaEdit,
    FaTrash,
    FaSave,
    FaArrowUp,
    FaArrowDown,
    FaExclamationTriangle,
    FaSpinner,
} from "react-icons/fa";
import Sidebar from "../components/shared/Sidebar";
import goalService from "../services/goalService";

// API Client
import apiClient from "../services/apiClient";

// Utility functions
const getGoalStatistics = (goals) => {
    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const onTrackGoals = goals.filter((g) => g.progressPercentage >= 70).length;
    const atRiskGoals = goals.filter((g) => g.progressPercentage < 50 && g.status === "active").length;

    return { totalGoals, activeGoals, completedGoals, onTrackGoals, atRiskGoals };
};

const getProgressColor = (progress) => {
    if (progress >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (progress >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
    if (progress >= 40) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
};

const getPriorityColor = (priority) => {
    switch (priority) {
        case "high":
            return "bg-red-50 text-red-700 border-red-200";
        case "medium":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "low":
            return "bg-green-50 text-green-700 border-green-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case "active":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "completed":
            return "bg-green-50 text-green-700 border-green-200";
        case "paused":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "cancelled":
            return "bg-gray-50 text-gray-700 border-gray-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
};

// Components
const Chip = ({ label, toneClass = "", className = "", ...rest }) => (
    <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
            toneClass || "border-blue-200 bg-blue-50 text-blue-700"
        } ${className}`}
        {...rest}
    >
        {label}
    </span>
);

const ProgressBar = ({ value }) => (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" aria-label="Progress">
        <div
            className={`h-full transition-all duration-300 ${
                value >= 80
                    ? "bg-green-600"
                    : value >= 60
                      ? "bg-blue-600"
                      : value >= 40
                        ? "bg-yellow-600"
                        : "bg-red-600"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

const GoalCard = ({ goal, onOpen, onEdit, onDelete }) => {
    const progressTone = getProgressColor(goal.progressPercentage);
    const statusTone = getStatusColor(goal.status);

    const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && goal.status === "active";
    const daysUntilDue = goal.targetDate
        ? Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

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

            <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">Progress</span>
                    <span className="text-xs font-semibold text-slate-900">{goal.progressPercentage || 0}%</span>
                </div>
                <ProgressBar value={goal.progressPercentage || 0} />
            </div>

            <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap mb-3">
                {goal.targetDate && (
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

const GoalForm = ({ initial = {}, onCancel, onSave }) => {
    const [title, setTitle] = useState(initial.title || "");
    const [description, setDescription] = useState(initial.description || "");
    const [keyAreaId, setKeyAreaId] = useState(initial.keyAreaId || "");
    const [status, setStatus] = useState(initial.status || "active");
    const [visibility, setVisibility] = useState(initial.visibility || "private");
    const [startDate, setStartDate] = useState(
        initial.startDate ? new Date(initial.startDate).toISOString().split("T")[0] : "",
    );
    const [targetDate, setTargetDate] = useState(
        initial.targetDate ? new Date(initial.targetDate).toISOString().split("T")[0] : "",
    );
    const [progressPercentage, setProgressPercentage] = useState(initial.progressPercentage || 0);
    const [keyAreas, setKeyAreas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch key areas when form opens
    useEffect(() => {
        const fetchKeyAreas = async () => {
            try {
                const areas = await goalService.getKeyAreas();
                setKeyAreas(areas);
            } catch (error) {
                console.error("Error fetching key areas:", error);
            }
        };
        fetchKeyAreas();
    }, []);

    const handleSave = async () => {
        if (!title.trim()) {
            alert("Title is required");
            return;
        }

        if (startDate && targetDate && new Date(startDate) >= new Date(targetDate)) {
            alert("Start date must be before target date");
            return;
        }

        setLoading(true);

        try {
            const goalData = {
                title: title.trim(),
                description: description.trim() || undefined,
                keyAreaId: keyAreaId || undefined,
                startDate: startDate || undefined,
                targetDate: targetDate || undefined,
                visibility,
                progressPercentage,
            };

            // If editing, include status in update data
            if (initial.id) {
                goalData.status = status;
            }

            await onSave(goalData);
        } catch (error) {
            console.error("Error saving goal:", error);
            alert("Failed to save goal. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FaBullseye className="text-blue-700 text-xl" />
                    <h3 className="text-xl font-bold text-slate-900">{initial.id ? "Edit Goal" : "Create New Goal"}</h3>
                </div>
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100" disabled={loading}>
                    <FaTimes />
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Title *</label>
                        <input
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Launch new product line"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
                        <textarea
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                            placeholder="Describe your goal in detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Key Area</label>
                        <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={keyAreaId}
                            onChange={(e) => setKeyAreaId(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select a key area (optional)</option>
                            {keyAreas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">Start Date</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">Target Date</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {initial.id && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
                            <select
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={loading}
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Visibility</label>
                        <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                            disabled={loading}
                        >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Progress ({progressPercentage}%)
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progressPercentage}
                            onChange={(e) => setProgressPercentage(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            disabled={loading}
                        />
                        <div className="mt-2">
                            <ProgressBar value={progressPercentage} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    {loading ? "Saving..." : initial.id ? "Update Goal" : "Create Goal"}
                </button>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, tone = "default", icon }) => {
    const toneMap = {
        success: "bg-green-50 text-green-800 border-green-200",
        warn: "bg-amber-50 text-amber-800 border-amber-200",
        danger: "bg-red-50 text-red-800 border-red-200",
        default: "bg-blue-50 text-blue-800 border-blue-200",
    };

    return (
        <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.default}`}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <div className="text-sm font-semibold">{label}</div>
            </div>
            <div className="text-2xl font-extrabold">{value}</div>
        </div>
    );
};

// Main Component
const GoalsTrackingPage = () => {
    const [goals, setGoals] = useState([]);
    const [view, setView] = useState("list");
    const [query, setQuery] = useState("");
    const [keyAreaFilter, setKeyAreaFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [activeGoal, setActiveGoal] = useState(null);
    const [keyAreas, setKeyAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch goals from the API
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                setLoading(true);
                const data = await goalService.getGoals({
                    includeKeyAreaName: true,
                    includeSubGoalCount: true,
                });
                setGoals(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching goals:", err);
                setError("Failed to load goals. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        const fetchKeyAreas = async () => {
            try {
                const data = await goalService.getKeyAreas();
                setKeyAreas(data);
            } catch (err) {
                console.error("Error fetching key areas:", err);
            }
        };

        fetchGoals();
        fetchKeyAreas();
    }, []);

    const allKeyAreas = useMemo(() => {
        const uniqueAreas = new Set();
        goals.forEach((goal) => {
            if (goal.keyAreaName) {
                uniqueAreas.add(goal.keyAreaName);
            }
        });
        return Array.from(uniqueAreas);
    }, [goals]);

    const filtered = useMemo(() => {
        return goals.filter((g) => {
            const matchesQuery = [g.title, g.description, g.keyAreaName]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase());

            const matchesKeyArea = keyAreaFilter === "all" ? true : g.keyAreaName === keyAreaFilter;
            const matchesStatus = statusFilter === "all" ? true : g.status === statusFilter;

            return matchesQuery && matchesKeyArea && matchesStatus;
        });
    }, [goals, query, keyAreaFilter, statusFilter]);

    const stats = useMemo(() => getGoalStatistics(goals), [goals]);

    const upsertGoal = async (goalData) => {
        try {
            let savedGoal;

            if (editingGoal?.id) {
                // Update existing goal
                savedGoal = await goalService.updateGoal(editingGoal.id, goalData);
            } else {
                // Create new goal
                savedGoal = await goalService.createGoal(goalData);
            }

            // Update state with the new/updated goal
            setGoals((prev) => {
                const exists = prev.some((g) => g.id === savedGoal.id);
                if (exists) return prev.map((g) => (g.id === savedGoal.id ? savedGoal : g));
                return [savedGoal, ...prev];
            });

            setShowForm(false);
            setEditingGoal(null);
        } catch (err) {
            console.error("Error saving goal:", err);
            throw err; // Let the form handle the error
        }
    };

    const deleteGoal = async (goalToDelete) => {
        if (confirm(`Are you sure you want to delete "${goalToDelete.title}"?`)) {
            try {
                await goalService.deleteGoal(goalToDelete.id);
                setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
            } catch (err) {
                console.error("Error deleting goal:", err);
                alert(`Error deleting goal: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    const openDetails = (g) => setActiveGoal(g);
    const closeDetails = () => setActiveGoal(null);

    const ListView = (
        <div className="grid lg:grid-cols-2 gap-6">
            {filtered.map((g) => (
                <GoalCard
                    key={g.id}
                    goal={g}
                    onOpen={openDetails}
                    onEdit={(goal) => {
                        setEditingGoal(goal);
                        setShowForm(true);
                    }}
                    onDelete={deleteGoal}
                />
            ))}
            {!filtered.length && (
                <div className="lg:col-span-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <FaBullseye className="mx-auto text-4xl text-slate-400 mb-3" />
                    <div className="text-lg font-semibold text-slate-900 mb-1">No goals found</div>
                    <div className="text-sm text-slate-600">
                        {query || keyAreaFilter !== "all" || statusFilter !== "all"
                            ? "Try adjusting your filters or search terms"
                            : "Create your first goal to get started"}
                    </div>
                </div>
            )}
        </div>
    );

    const KanbanView = (
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
                                                onClick={() => {
                                                    setEditingGoal(g);
                                                    setShowForm(true);
                                                }}
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
                                        <button
                                            onClick={() => openDetails(g)}
                                            className="text-blue-600 hover:underline"
                                        >
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

    const TimelineView = (
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
                                                onClick={() => openDetails(g)}
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

    return (
        <div className="flex">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-6 space-y-6">
                {/* Status messages for loading and errors */}
                {loading && (
                    <div className="flex justify-center items-center p-8">
                        <FaSpinner className="text-blue-600 animate-spin mr-2" />
                        <span>Loading goals...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">{error}</div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-700">
                            <FaBullseye className="text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">Goals & Tracking</h1>
                            <p className="text-sm text-slate-700 mt-1">
                                Create and manage your goals, track progress, and achieve your objectives.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingGoal(null);
                            setShowForm(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 font-bold shadow-lg hover:bg-blue-700 transition-colors"
                        disabled={loading}
                    >
                        <FaPlus /> New Goal
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Total Goals" value={stats.totalGoals} icon={<FaBullseye />} />
                    <StatCard label="Active" value={stats.activeGoals} icon={<FaArrowUp />} />
                    <StatCard label="Completed" value={stats.completedGoals} tone="success" icon={<FaCheck />} />
                    <StatCard label="On Track (≥70%)" value={stats.onTrackGoals} tone="success" icon={<FaArrowUp />} />
                    <StatCard
                        label="At Risk (<50%)"
                        value={stats.atRiskGoals}
                        tone="danger"
                        icon={<FaExclamationTriangle />}
                    />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border shadow-sm p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center bg-slate-50 rounded-xl px-3 py-2 border">
                            <FaSearch className="text-slate-600 mr-2" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search goals..."
                                className="bg-transparent outline-none text-sm w-64"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <FaFilter className="text-slate-600" />
                            <select
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={keyAreaFilter}
                                onChange={(e) => setKeyAreaFilter(e.target.value)}
                            >
                                <option value="all">All Key Areas</option>
                                {allKeyAreas.map((area) => (
                                    <option key={area} value={area}>
                                        {area}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="paused">Paused</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setView("list")}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                                    view === "list"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                                title="List view"
                            >
                                <FaListUl />
                            </button>
                            <button
                                onClick={() => setView("kanban")}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                                    view === "kanban"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                                title="Kanban view"
                            >
                                <FaThLarge />
                            </button>
                            <button
                                onClick={() => setView("timeline")}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                                    view === "timeline"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                                title="Timeline view"
                            >
                                <FaStream />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Views */}
                {!loading && (
                    <>
                        {view === "list" && ListView}
                        {view === "kanban" && KanbanView}
                        {view === "timeline" && TimelineView}
                    </>
                )}

                {/* Goal Form Modal */}
                {showForm && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowForm(false);
                                setEditingGoal(null);
                            }
                        }}
                    >
                        <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                            <GoalForm
                                initial={editingGoal || {}}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingGoal(null);
                                }}
                                onSave={upsertGoal}
                            />
                        </div>
                    </div>
                )}

                {/* Goal Details Modal */}
                {activeGoal && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) closeDetails();
                        }}
                    >
                        <div
                            className="w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`p-2 rounded-xl ${
                                                activeGoal.status === "completed"
                                                    ? "bg-green-50 text-green-700"
                                                    : activeGoal.status === "paused"
                                                      ? "bg-yellow-50 text-yellow-700"
                                                      : "bg-blue-50 text-blue-700"
                                            }`}
                                        >
                                            <FaBullseye />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{activeGoal.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {activeGoal.keyAreaName && <Chip label={activeGoal.keyAreaName} />}
                                                <Chip label={`${activeGoal.progressPercentage || 0}% Complete`} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingGoal(activeGoal);
                                                setShowForm(true);
                                                closeDetails();
                                            }}
                                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                                            title="Edit goal"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={closeDetails}
                                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-6">
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <FaTags className="text-blue-700" /> Description & Details
                                            </h4>
                                            <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                                                {activeGoal.description || "No description provided."}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                                                <FaFlagCheckered className="text-blue-700" /> Progress Tracking
                                            </h4>
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        Overall Progress
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        {activeGoal.progressPercentage || 0}%
                                                    </span>
                                                </div>
                                                <ProgressBar value={activeGoal.progressPercentage || 0} />
                                            </div>
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
                                                    <Chip
                                                        label={activeGoal.status || "active"}
                                                        toneClass={getStatusColor(activeGoal.status)}
                                                    />
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Visibility:</span>
                                                    <Chip label={activeGoal.visibility || "private"} />
                                                </div>
                                                {activeGoal.keyAreaName && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">Key Area:</span>
                                                        <Chip label={activeGoal.keyAreaName} />
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
                                                        {activeGoal.startDate
                                                            ? new Date(activeGoal.startDate).toLocaleDateString()
                                                            : "—"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Target:</span>
                                                    <span
                                                        className={`font-semibold ${
                                                            activeGoal.targetDate &&
                                                            new Date(activeGoal.targetDate) < new Date() &&
                                                            activeGoal.status === "active"
                                                                ? "text-red-600"
                                                                : ""
                                                        }`}
                                                    >
                                                        {activeGoal.targetDate
                                                            ? new Date(activeGoal.targetDate).toLocaleDateString()
                                                            : "—"}
                                                    </span>
                                                </div>
                                                {activeGoal.completedAt && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600">Completed:</span>
                                                        <span className="font-semibold text-green-600">
                                                            {new Date(activeGoal.completedAt).toLocaleDateString()}
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
                                                    <span className="font-bold text-lg">
                                                        {activeGoal.subGoalCount || 0}
                                                    </span>
                                                </div>
                                                <Link
                                                    to={`/sub-goals?goalId=${activeGoal.id}`}
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
                )}
            </main>
        </div>
    );
};

export default GoalsTrackingPage;
