import React, { useState, Suspense } from "react";
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
    FaSave,
    FaBuilding,
    FaTrophy,
    FaBullseye,
    FaChartPie,
    FaHistory,
} from "react-icons/fa";
const GoalForm = React.lazy(() => import("./GoalForm"));

const GoalDetailModal = ({ goal, onClose, keyAreas, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [editingKeyArea, setEditingKeyArea] = useState(false);
    const [tempKeyAreaId, setTempKeyAreaId] = useState(goal?.keyAreaId || "");

    if (!goal) return null;

    const keyAreaName = keyAreas?.find((k) => k.id === goal.keyAreaId)?.name || "Not assigned";
    const completedMilestones = goal.milestones?.filter((m) => m.done).length || 0;
    const totalMilestones = goal.milestones?.length || 0;
    const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    const isOverdue = goal.status === "active" && new Date(goal.dueDate) < new Date();
    const isCompleted = goal.status === "completed";
    const completionDate = isCompleted && goal.completedAt
        ? new Date(goal.completedAt).toLocaleDateString()
        : null;

    const handleEdit = () => setIsEditing(true);
    const handleCancelEdit = () => setIsEditing(false);
    const handleSave = async (goalData) => {
        await onUpdate(goal.id, goalData);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                <GoalForm
                    goal={goal}
                    onClose={handleCancelEdit}
                    onGoalCreated={handleSave}
                    keyAreas={keyAreas}
                    isEditing={true}
                />
            </Suspense>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                .animate-fadeIn { animation:fadeIn .2s ease-out; }
                .animate-slideUp { animation:slideUp .3s ease-out; }
                .milestone-scroll::-webkit-scrollbar { width:6px; }
                .milestone-scroll::-webkit-scrollbar-track { background:#f1f5f9; border-radius:3px; }
                .milestone-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
                .milestone-scroll::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
            `}</style>

            <div
                className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col animate-slideUp"
                style={{ maxHeight: "90vh", border: "1px solid #e5e7eb" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                            <FaBullseye className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{goal.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                        goal.status === "completed"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : goal.status === "active"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-gray-100 text-gray-700"
                                    }`}
                                >
                                    {goal.status}
                                </span>
                                {goal.visibility === "private" && <FaEyeSlash className="w-3.5 h-3.5 text-gray-500" />}
                                {isOverdue && <span className="text-xs font-medium text-red-600">Overdue</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleEdit}
                            className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                            title="Edit Goal"
                        >
                            <FaEdit className="w-4.5 h-4.5" />
                        </button>

                        {goal.status === "active" && (
                            <button className="p-2.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all" title="Complete">
                                <FaCheckCircle className="w-4.5 h-4.5" />
                            </button>
                        )}

                        <button
                            className="p-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                            title={goal.visibility === "public" ? "Make Private" : "Make Public"}
                        >
                            {goal.visibility === "public" ? <FaEyeSlash className="w-4.5 h-4.5" /> : <FaEye className="w-4.5 h-4.5" />}
                        </button>

                        {goal.status !== "archived" && (
                            <button className="p-2.5 text-gray-600 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-all" title="Archive">
                                <FaArchive className="w-4.5 h-4.5" />
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (window.confirm("Delete this goal?")) {
                                    onDelete(goal.id);
                                    onClose();
                                }
                            }}
                            className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                            title="Delete"
                        >
                            <FaTrash className="w-4.5 h-4.5" />
                        </button>

                        <div className="w-px h-7 bg-gray-300 mx-1" />

                        <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                            <FaTimes className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="border-b border-gray-200 flex-shrink-0">
                    <nav className="flex px-6">
                        {["overview", "milestones", "activity"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3.5 text-sm font-semibold capitalize transition-all border-b-2 ${
                                    activeTab === tab
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {tab === "overview" ? "Overview" : tab === " offender" ? "Milestones" : "Activity"}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* CONTENT – ALWAYS TWO COLUMNS */}
                <div className="flex-1 overflow-hidden" style={{ minHeight: '500px', maxHeight: 'calc(90vh - 200px)' }}>
                    <div className="h-full flex">
                        {/* LEFT: TAB CONTENT */}
                        <div className="flex-1 px-6 py-6 overflow-y-auto milestone-scroll max-w-2xl">
                            {/* OVERVIEW */}
                            {activeTab === "overview" && (
                                <div className="space-y-6 pb-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <FaTrophy className="w-4 h-4 text-blue-600" />
                                                Progress
                                            </span>
                                            <span className="text-lg font-bold text-blue-600">{progressPercent}%</span>
                                        </div>
                                        <div className="w-full bg-white/80 rounded-full h-3 shadow-sm">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                                                    progressPercent >= 90
                                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                                        : progressPercent >= 70
                                                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                                          : progressPercent >= 40
                                                            ? "bg-gradient-to-r from-amber-500 to-amber-600"
                                                            : "bg-gradient-to-r from-red-500 to-red-600"
                                                }`}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-3">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <FaFlag className="w-3.5 h-3.5" />
                                                {completedMilestones}/{totalMilestones} milestones
                                            </div>
                                            <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                                <FaCalendarAlt className="w-3.5 h-3.5" />
                                                {new Date(goal.dueDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <FaBullseye className="w-5 h-5 text-blue-600" />
                                            Goal Details
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</label>
                                                <p className="mt-1.5 text-gray-800 leading-relaxed">
                                                    {goal.description || <span className="italic text-gray-400">No description</span>}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Key Area</label>
                                                {editingKeyArea ? (
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <select
                                                            value={tempKeyAreaId}
                                                            onChange={(e) => setTempKeyAreaId(e.target.value)}
                                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                                        >
                                                            <option value="">None</option>
                                                            {keyAreas.map((a) => (
                                                                <option key={a.id} value={a.id}>{a.name}</option>
                                                            ))}
                                                        </select>
                                                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><FaSave className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingKeyArea(false)} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"><FaTimes className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <p className="text-gray-800 font-medium">{keyAreaName}</p>
                                                        <button
                                                            onClick={() => setEditingKeyArea(true)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <FaEdit className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</label>
                                                <p className={`mt-1.5 font-medium ${isOverdue ? "text-red-600" : "text-gray-800"}`}>
                                                    {new Date(goal.dueDate).toLocaleDateString()}
                                                    {isOverdue && " (Overdue)"}
                                                </p>
                                            </div>

                                            {goal.startDate && (
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</label>
                                                    <p className="mt-1.5 text-gray-800">{new Date(goal.startDate).toLocaleDateString()}</p>
                                                </div>
                                            )}

                                            {completionDate && (
                                                <div>
                                                    <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Completed On</label>
                                                    <p className="mt-1.5 text-emerald-700 font-medium flex items-center gap-1.5">
                                                        <FaTrophy className="w-4 h-4" />
                                                        {completionDate}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MILESTONES */}
                            {activeTab === "milestones" && (
                                <div className="space-y-4 pb-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <FaFlag className="w-5 h-5 text-blue-600" />
                                            Milestones ({completedMilestones}/{totalMilestones})
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">Track your progress step by step</p>
                                    </div>
                                    {goal.milestones && goal.milestones.length > 0 ? (
                                        goal.milestones.map((m, i) => (
                                            <div
                                                key={m.id || i}
                                                className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm mt-0.5 ${
                                                            m.done
                                                                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                                                                : "bg-gradient-to-br from-gray-400 to-gray-500"
                                                        }`}
                                                    >
                                                        {m.done ? <FaCheckCircle className="w-4 h-4" /> : i + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-semibold text-sm ${m.done ? "line-through text-gray-500" : "text-gray-900"}`}>
                                                            {m.title || "Untitled milestone"}
                                                        </p>
                                                        {m.dueDate && (
                                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                <FaCalendarAlt className="w-3 h-3" />
                                                                {new Date(m.dueDate).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                                                            <FaTrophy className="w-3 h-3" />
                                                            {m.weight || 1}x Score
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FaFlag className="w-7 h-7 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 font-medium">No milestones yet</p>
                                            <p className="text-xs text-gray-500 mt-1">Break your goal into smaller steps</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ACTIVITY */}
                            {activeTab === "activity" && (
                                <div className="h-full flex items-center justify-center pb-6">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                                            <FaHistory className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 font-medium">Activity log coming soon</p>
                                        <p className="text-sm text-gray-500 mt-1">Track edits, completions, and updates</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: PERSISTENT SIDE PANEL */}
                        <div className="w-72 border-l border-gray-200 flex flex-col bg-gray-50">
                            <div className="p-4 flex-shrink-0">
                                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                                    <FaChartPie className="w-4 h-4 text-indigo-600" />
                                    Goal Summary
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status</span>
                                        <span className="font-medium capitalize">{goal.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Visibility</span>
                                        <span className="font-medium capitalize">{goal.visibility}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Created</span>
                                        <span className="font-medium">
                                            {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : "—"}
                                        </span>
                                    </div>
                                    {completionDate && (
                                        <div className="flex justify-between text-emerald-600">
                                            <span>Completed</span>
                                            <span className="font-medium">{completionDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-4 py-4 border-t border-gray-200 flex-1 overflow-y-auto milestone-scroll">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white rounded-lg p-2.5 text-center shadow-sm">
                                        <div className="text-xl font-bold text-blue-600">{totalMilestones}</div>
                                        <div className="text-gray-500">Total</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-2.5 text-center shadow-sm">
                                        <div className="text-xl font-bold text-emerald-600">{completedMilestones}</div>
                                        <div className="text-gray-500">Done</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-2.5 text-center shadow-sm col-span-2">
                                        <div className="text-xl font-bold text-indigo-600">{progressPercent}%</div>
                                        <div className="text-gray-500">Progress</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalDetailModal;