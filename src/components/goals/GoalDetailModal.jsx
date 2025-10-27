import React, { useState } from "react";
import {
    FaTimes,
    FaEdit,
    FaCheckCircle,
    FaArchive,
    FaTrash,
    FaEye,
    FaEyeSlash,
    FaCalendarAlt,
    FaFlag,
    FaClock,
    FaSave,
    FaBuilding,
} from "react-icons/fa";
import GoalForm from "./GoalForm";

const GoalDetailModal = ({ goal, onClose, keyAreas, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingKeyArea, setEditingKeyArea] = useState(false);
    const [tempKeyAreaId, setTempKeyAreaId] = useState(goal?.keyAreaId || "");
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [tempMilestoneTitle, setTempMilestoneTitle] = useState("");

    if (!goal) return null;

    const keyAreaName = keyAreas?.find((k) => k.id === goal.keyAreaId)?.name || "Not assigned";
    const completedMilestones = goal.milestones?.filter((m) => m.done).length || 0;
    const totalMilestones = goal.milestones?.length || 0;
    const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    const isOverdue = goal.status === "active" && new Date(goal.dueDate) < new Date();

    const handleEdit = () => setIsEditing(true);
    const handleCancelEdit = () => setIsEditing(false);

    const handleSave = async (goalData) => {
        await onUpdate(goal.id, goalData);
        setIsEditing(false);
    };

    const handleKeyAreaSave = async () => {
        await onUpdate(goal.id, { keyAreaId: tempKeyAreaId || null });
        setEditingKeyArea(false);
    };

    const handleKeyAreaCancel = () => {
        setTempKeyAreaId(goal?.keyAreaId || "");
        setEditingKeyArea(false);
    };

    const handleMilestoneEdit = (index) => {
        setEditingMilestone(index);
        setTempMilestoneTitle(goal.milestones[index].title);
    };

    const handleMilestoneSave = async (index) => {
        const updatedMilestones = [...goal.milestones];
        updatedMilestones[index].title = tempMilestoneTitle;

        await onUpdate(goal.id, { milestones: updatedMilestones });
        setEditingMilestone(null);
        setTempMilestoneTitle("");
    };

    const handleMilestoneCancel = () => {
        setEditingMilestone(null);
        setTempMilestoneTitle("");
    };

    const handleMilestoneToggle = async (milestoneIndex) => {
        if (!goal.milestones || !goal.milestones[milestoneIndex]) {
            console.error("Milestone not found at index:", milestoneIndex);
            return;
        }

        const updatedMilestones = [...goal.milestones];
        updatedMilestones[milestoneIndex].done = !updatedMilestones[milestoneIndex].done;

        await onUpdate(goal.id, { milestones: updatedMilestones });
    };

    const handleQuickAction = async (action) => {
        switch (action) {
            case "complete":
                await onUpdate(goal.id, { status: "completed" });
                break;
            case "archive":
                await onUpdate(goal.id, { status: "archived" });
                break;
            case "toggle-visibility":
                await onUpdate(goal.id, { visibility: goal.visibility === "public" ? "private" : "public" });
                break;
            case "delete":
                if (window.confirm("Are you sure you want to delete this goal?")) {
                    await onDelete(goal.id);
                    onClose();
                }
                break;
        }
    };

    if (isEditing) {
        return (
            <GoalForm
                goal={goal}
                onClose={handleCancelEdit}
                onGoalCreated={handleSave}
                keyAreas={keyAreas}
                isEditing={true}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Compact Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 truncate">{goal.title}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                    goal.status === "completed"
                                        ? "bg-green-100 text-green-800"
                                        : goal.status === "active"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-slate-100 text-slate-800"
                                }`}
                            >
                                {goal.status}
                            </span>
                            {goal.visibility === "private" && <FaEyeSlash className="w-3 h-3 text-slate-400" />}
                            {isOverdue && <span className="text-xs text-red-600 font-medium">Overdue</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={handleEdit}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <FaEdit className="w-3.5 h-3.5" />
                        </button>

                        {goal.status === "active" && (
                            <button
                                onClick={() => handleQuickAction("complete")}
                                className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Complete"
                            >
                                <FaCheckCircle className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <button
                            onClick={() => handleQuickAction("toggle-visibility")}
                            className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                            title={goal.visibility === "public" ? "Make Private" : "Make Public"}
                        >
                            {goal.visibility === "public" ? (
                                <FaEyeSlash className="w-3.5 h-3.5" />
                            ) : (
                                <FaEye className="w-3.5 h-3.5" />
                            )}
                        </button>

                        {goal.status !== "archived" && (
                            <button
                                onClick={() => handleQuickAction("archive")}
                                className="p-1.5 text-slate-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Archive"
                            >
                                <FaArchive className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <button
                            onClick={() => handleQuickAction("delete")}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <FaTrash className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                            <FaTimes className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Two Column Layout: Overview Left, Milestones Right */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column - Overview */}
                        <div className="space-y-3">
                            {/* Progress Card */}
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-700">Progress</span>
                                    <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            progressPercent >= 90
                                                ? "bg-green-500"
                                                : progressPercent >= 70
                                                  ? "bg-blue-500"
                                                  : progressPercent >= 40
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                        }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <FaFlag className="w-2.5 h-2.5" />
                                        {completedMilestones}/{totalMilestones} milestones
                                    </div>
                                    <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
                                        <FaCalendarAlt className="w-2.5 h-2.5" />
                                        {new Date(goal.dueDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Goal Details */}
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <h3 className="text-sm font-semibold text-slate-900 mb-2">Details</h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Description</label>
                                        <p className="text-slate-900 text-xs mt-0.5">
                                            {goal.description || "No description provided"}
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">Key Area</label>
                                            {editingKeyArea ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <select
                                                        value={tempKeyAreaId}
                                                        onChange={(e) => setTempKeyAreaId(e.target.value)}
                                                        className="flex-1 p-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="">None</option>
                                                        {keyAreas &&
                                                            keyAreas.map((area) => (
                                                                <option key={area.id} value={area.id}>
                                                                    {area.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                    <button
                                                        onClick={handleKeyAreaSave}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                    >
                                                        <FaSave className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                        onClick={handleKeyAreaCancel}
                                                        className="p-1 text-slate-600 hover:bg-slate-50 rounded"
                                                    >
                                                        <FaTimes className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className="text-slate-900 text-xs">{keyAreaName}</p>
                                                    <button
                                                        onClick={() => setEditingKeyArea(true)}
                                                        className="p-0.5 text-slate-400 hover:text-blue-600"
                                                    >
                                                        <FaEdit className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">Status</label>
                                            <p className="text-slate-900 text-xs capitalize mt-0.5">{goal.status}</p>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">Due Date</label>
                                            <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-medium" : "text-slate-900"}`}>
                                                {new Date(goal.dueDate).toLocaleDateString()}
                                                {isOverdue && " (!)"}
                                            </p>
                                        </div>
                                        
                                        {goal.startDate && (
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Start Date</label>
                                                <p className="text-slate-900 text-xs mt-0.5">
                                                    {new Date(goal.startDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">Visibility</label>
                                            <p className="text-slate-900 text-xs capitalize mt-0.5">{goal.visibility}</p>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">Created</label>
                                            <p className="text-slate-900 text-xs mt-0.5">
                                                {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : "Unknown"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Milestones */}
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-slate-900">Milestones</h3>
                                <span className="text-xs text-slate-500">
                                    {completedMilestones}/{totalMilestones}
                                </span>
                            </div>

                            {goal.milestones && Array.isArray(goal.milestones) && goal.milestones.length > 0 ? (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {goal.milestones.map((milestone, idx) => (
                                        <div
                                            key={milestone.id || idx}
                                            className="group flex items-start gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                                        >
                                            <button
                                                onClick={() => handleMilestoneToggle(idx)}
                                                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                    milestone.done
                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                        : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"
                                                }`}
                                            >
                                                {milestone.done && <FaCheckCircle className="w-2.5 h-2.5" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                {editingMilestone === idx ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={tempMilestoneTitle}
                                                            onChange={(e) => setTempMilestoneTitle(e.target.value)}
                                                            className="flex-1 p-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleMilestoneSave(idx)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                        >
                                                            <FaSave className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={handleMilestoneCancel}
                                                            className="p-1 text-slate-600 hover:bg-slate-50 rounded"
                                                        >
                                                            <FaTimes className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p
                                                                className={`text-xs font-medium ${
                                                                    milestone.done
                                                                        ? "line-through text-slate-500"
                                                                        : "text-slate-900"
                                                                }`}
                                                            >
                                                                {milestone.title || "Untitled milestone"}
                                                            </p>
                                                            {milestone.dueDate && (
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {new Date(milestone.dueDate).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <span className="text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                {milestone.weight || 1}x
                                                            </span>
                                                            <button
                                                                onClick={() => handleMilestoneEdit(idx)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded transition-all"
                                                            >
                                                                <FaEdit className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <FaFlag className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 text-xs font-medium">No milestones</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Add milestones to track progress</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalDetailModal;