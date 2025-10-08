import React, { useEffect, useState } from "react";
import { useToast } from "../shared/ToastProvider.jsx";
import keyAreaService from "../../services/keyAreaService";
import taskService from "../../services/taskService";

export default function TaskActivityModal({ item, onClose, onSave, onDelete }) {
    const { addToast } = useToast();
    // item may contain: { type, title, date, time, description }
    const [activeTab, setActiveTab] = useState(item?.type === "activity" ? "activity" : "task");
    const [keyAreas, setKeyAreas] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [taskForm, setTaskForm] = useState(() => {
        const localDate = (() => {
            if (item?.date) return item.date;
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        })();
        return {
            keyAreaId: item?.keyAreaId || "",
            title: item?.title || "",
            description: item?.description || "",
            date: localDate,
            time: item?.time || "08:00",
            dueDate: item?.dueDate || "",
            endDate: item?.endDate || "",
            priority: item?.priority || "medium",
            assignee: item?.assignee || "",
        };
    });

    const [activityForm, setActivityForm] = useState({
        text: item?.title || "",
        keyAreaId: "",
        taskId: "",
    });

    // No special options needed; using native time input for hour/minute scroll

    useEffect(() => {
        (async () => {
            try {
                const kas = await keyAreaService.list({ includeTaskCount: false });
                setKeyAreas(Array.isArray(kas) ? kas : []);
            } catch {}
        })();
    }, []);

    useEffect(() => {
        (async () => {
            if (!activityForm.keyAreaId) {
                setTasks([]);
                return;
            }
            try {
                const list = await taskService.list({ keyAreaId: activityForm.keyAreaId });
                setTasks(Array.isArray(list) ? list : []);
            } catch {
                setTasks([]);
            }
        })();
    }, [activityForm.keyAreaId]);

    const handleTaskChange = (e) => {
        const { name, value } = e.target;
        setTaskForm((s) => ({ ...s, [name]: value }));
    };
    const handleActivityChange = (e) => {
        const { name, value } = e.target;
        setActivityForm((s) => ({ ...s, [name]: value }));
    };

    const submit = (e) => {
        e.preventDefault();
        if (activeTab === "activity") {
            onSave({ type: "activity", ...activityForm });
        } else {
            onSave({ type: "task", ...taskForm });
        }
        onClose();
    };

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={(e) => {
                // Close when clicking outside the card
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <form
                onSubmit={submit}
                className="bg-white rounded-lg shadow-xl w-[520px] max-w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text/base font-semibold text-slate-800">
                        {item?.id ? (item?.type === "activity" ? "Edit Activity" : "Edit Task") : "Add Task / Activity"}
                    </h2>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        ✕
                    </button>
                </div>
                <div className="px-4 pt-3">
                    <div className="flex gap-2 border-b border-slate-200 mb-3">
                        <button
                            type="button"
                            className={`px-3 py-2 text-sm font-semibold ${activeTab === "task" ? "text-blue-700 border-b-2 border-blue-600" : "text-slate-600"}`}
                            onClick={() => setActiveTab("task")}
                        >
                            Task
                        </button>
                        <button
                            type="button"
                            className={`px-3 py-2 text-sm font-semibold ${activeTab === "activity" ? "text-blue-700 border-b-2 border-blue-600" : "text-slate-600"}`}
                            onClick={() => setActiveTab("activity")}
                        >
                            Activity
                        </button>
                    </div>

                    {activeTab === "task" ? (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Key Area</label>
                                <select
                                    name="keyAreaId"
                                    value={taskForm.keyAreaId}
                                    onChange={handleTaskChange}
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="">— Select key area —</option>
                                    {keyAreas.map((ka) => (
                                        <option key={ka.id} value={ka.id}>
                                            {ka.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Title</label>
                                <input
                                    name="title"
                                    value={taskForm.title}
                                    onChange={handleTaskChange}
                                    placeholder="Task title"
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={taskForm.description}
                                    onChange={handleTaskChange}
                                    placeholder="Optional"
                                    className="w-full px-3 py-2 border rounded"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Start date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={taskForm.date}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Time</label>
                                    <input
                                        type="time"
                                        name="time"
                                        value={taskForm.time}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border rounded"
                                        min="00:00"
                                        max="23:59"
                                        step={60}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Due date</label>
                                    <input
                                        type="date"
                                        name="dueDate"
                                        value={taskForm.dueDate}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">End date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={taskForm.endDate}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Priority</label>
                                    <select
                                        name="priority"
                                        value={taskForm.priority}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border rounded"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-600 mb-1">Assignee</label>
                                    <input
                                        name="assignee"
                                        value={taskForm.assignee}
                                        onChange={handleTaskChange}
                                        placeholder="Optional"
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Text</label>
                                <input
                                    name="text"
                                    value={activityForm.text}
                                    onChange={handleActivityChange}
                                    placeholder="What did you do?"
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">
                                    Key Area (optional, to pick a task)
                                </label>
                                <select
                                    name="keyAreaId"
                                    value={activityForm.keyAreaId}
                                    onChange={handleActivityChange}
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="">— None —</option>
                                    {keyAreas.map((ka) => (
                                        <option key={ka.id} value={ka.id}>
                                            {ka.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-600 mb-1">Attach to Task (optional)</label>
                                <select
                                    name="taskId"
                                    value={activityForm.taskId}
                                    onChange={handleActivityChange}
                                    className="w-full px-3 py-2 border rounded"
                                    onMouseDown={(e) => {
                                        if (!activityForm.keyAreaId) {
                                            e.preventDefault();
                                            addToast?.({ title: "Select a key area first", variant: "warning" });
                                        }
                                    }}
                                >
                                    {!activityForm.keyAreaId ? (
                                        <option value="" disabled>
                                            — Select key area first —
                                        </option>
                                    ) : (
                                        <>
                                            <option value="">— None —</option>
                                            {tasks.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.title}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                                {!activityForm.keyAreaId && (
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Select a key area to load its tasks.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    {item?.id && onDelete ? (
                        <button
                            type="button"
                            className="px-3 py-2 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                            onClick={() => {
                                if (confirm("Delete this item?")) onDelete();
                            }}
                        >
                            Delete
                        </button>
                    ) : (
                        <span />
                    )}
                    <button
                        type="button"
                        className="px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-3 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    >
                        {item?.id ? "Update" : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
