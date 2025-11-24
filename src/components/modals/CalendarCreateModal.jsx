import React, { useState, Suspense } from "react";
const CreateTaskModal = React.lazy(() => import("../key-areas/CreateTaskModal.jsx"));
const CreateActivityModal = React.lazy(() => import("./CreateActivityFormModal.jsx"));

export default function CalendarCreateModal({ 
    isOpen, 
    onClose, 
    onSave,
    defaultType = "task", // "task" or "activity"
    initialData = {},
    preselectedKeyArea = null,
    preselectedTask = null
}) {
    const [activeType, setActiveType] = useState(defaultType);

    const handleSave = (result) => {
        onSave?.(result, activeType);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-[95vw] max-h-[90vh] overflow-hidden">
                {/* Tab Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Add to Calendar
                        </h2>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="text-slate-500 hover:text-slate-700 text-xl"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Type Selection Tabs */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                activeType === "task" 
                                    ? "bg-blue-600 text-white" 
                                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => setActiveType("task")}
                        >
                            📋 Task
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                activeType === "activity" 
                                    ? "bg-green-600 text-white" 
                                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => setActiveType("activity")}
                        >
                            ⚡ Activity
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative">
                    {activeType === "task" ? (
                        <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}> 
                            <CreateTaskModal
                                isOpen={true}
                                onCancel={onClose}
                                onClose={onClose}
                                onSave={handleSave}
                                initialData={{ ...(initialData || {}), key_area_id: initialData?.key_area_id || preselectedKeyArea || initialData?.keyAreaId }}
                                renderInline={true}
                            />
                        </Suspense>
                    ) : (
                        <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                            <CreateActivityModal
                                    isOpen={true}
                                    onCancel={onClose}
                                    initialData={initialData}
                                    preselectedKeyArea={preselectedKeyArea}
                                    preselectedTask={preselectedTask}
                                    renderInline={true}
                                    onSave={async (payload) => {
                                        try {
                                            const mod = await import('../../services/activityService');
                                            const svc = mod?.default || mod;
                                            const toSend = { text: payload.text || payload.title || '', taskId: payload.taskId || payload.task_id || null, ...payload };
                                            const res = await svc.create(toSend);
                                            handleSave(res, 'activity');
                                        } catch (e) {
                                            console.error('Failed to create activity from calendar modal', e);
                                            throw e;
                                        }
                                    }}
                                />
                        </Suspense>
                    )}
                </div>

                {/* Info Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                    <div className="text-xs text-slate-600">
                        {activeType === "task" ? (
                            <>
                                📋 <strong>Tasks</strong> are structured work items with deadlines, priorities, and assignments.
                            </>
                        ) : (
                            <>
                                ⚡ <strong>Activities</strong> are quick notes about what you did or what happened.
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}