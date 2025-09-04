import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar.jsx";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { FaCheck, FaChevronDown, FaExclamation, FaLongArrowAltDown, FaTimes, FaTrash } from "react-icons/fa";
import DontForgetComposer from "../components/tasks/DontForgetComposer.jsx";

export default function Tasks() {
    const location = useLocation();

    // Minimal tasks; Don't Forget items have no keyArea
    const [tasks, setTasks] = useState([
        {
            id: 1,
            name: "taking lunch",
            assignee: "",
            status: "in progress",
            priority: "high",
            quadrant: "Q3",
            goal: "Trap",
            tags: "",
            start_date: "",
            dueDate: "",
            end_date: "",
            duration: "1d",
            time: "",
            notes: "",
            keyArea: "",
            listIndex: 1,
            completed: false,
            imported: false,
        },
    ]);

    // Open Don't Forget view if ?dontforget=1
    const [viewMode, setViewMode] = useState("list");
    useEffect(() => {
        const params = new URLSearchParams(location.search || "");
        if (params.get("dontforget") === "1") setViewMode("dont-forget");
    }, [location.search]);

    // UI state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showImported, setShowImported] = useState(true);
    const [showCompleted, setShowCompleted] = useState(true);
    const [expanded, setExpanded] = useState(new Set());
    const [savingIds, setSavingIds] = useState(new Set());
    const [dfName, setDfName] = useState("");
    const [showComposer, setShowComposer] = useState(false);
    const [showMassEdit, setShowMassEdit] = useState(false);
    const [massEdit, setMassEdit] = useState({
        dueDate: "",
        start_date: "",
        end_date: "",
        time: "",
        duration: "",
        assignee: "",
        status: "",
        priority: "",
        quadrant: "",
        goal: "",
        tags: "",
        listIndex: "",
        completed: "", // '', 'done', 'todo'
    });

    const dontForgetTasks = useMemo(
        () => tasks.filter((t) => !t.keyArea && (showImported || !t.imported) && (showCompleted || !t.completed)),
        [tasks, showImported, showCompleted],
    );

    const addDontForgetTask = (payload) => {
        const name = (payload?.name ?? dfName).trim();
        if (!name) return;
        setTasks((prev) => [
            ...prev,
            {
                id: prev.length ? Math.max(...prev.map((t) => t.id)) + 1 : 1,
                name,
                assignee: payload?.assignee || "",
                status: payload?.status || "in progress",
                priority: payload?.priority ?? "normal",
                quadrant: payload?.quadrant || "Q3",
                goal: payload?.goal || "Trap",
                tags: payload?.tags || "",
                start_date: payload?.start_date || "",
                dueDate: payload?.dueDate ?? "",
                end_date: payload?.end_date || payload?.dueDate || "",
                duration: payload?.duration || "1d",
                time: payload?.time || "",
                notes: payload?.notes || "",
                keyArea: "",
                listIndex: payload?.listIndex || 1,
                completed: false,
                imported: !!payload?.imported,
            },
        ]);
        setDfName("");
    };

    // Saving indicator helper
    const markSaving = (id, delay = 600) => {
        setSavingIds((prev) => new Set(prev).add(id));
        window.setTimeout(() => {
            setSavingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, delay);
    };

    // Selection helpers
    const isSelected = (id) => selectedIds.has(id);
    const toggleSelect = (id) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const clearSelection = () => setSelectedIds(new Set());
    const toggleSelectAllVisible = () => {
        const all = new Set(selectedIds);
        const visible = dontForgetTasks.map((t) => t.id);
        const allSelected = visible.length > 0 && visible.every((id) => all.has(id));
        if (allSelected) visible.forEach((id) => all.delete(id));
        else visible.forEach((id) => all.add(id));
        setSelectedIds(all);
    };

    // Mass edit actions
    const massDelete = () => {
        if (selectedIds.size === 0) return;
        setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
        clearSelection();
    };
    const massSetPriority = (p) =>
        setTasks((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, priority: p } : t)));
    const massComplete = (val) =>
        setTasks((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, completed: !!val } : t)));

    // Row actions
    const toggleCompleted = (id) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
        markSaving(id);
    };
    const setPriority = (id, p) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: p } : t)));
        markSaving(id);
    };
    const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));
    const updateField = (id, key, value) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
        markSaving(id);
    };
    const toggleExpanded = (id) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const applyMassEdit = () => {
        if (selectedIds.size === 0) return;
        setTasks((prev) =>
            prev.map((t) => {
                if (!selectedIds.has(t.id)) return t;
                const u = { ...t };
                if (massEdit.dueDate) u.dueDate = massEdit.dueDate;
                if (massEdit.start_date) u.start_date = massEdit.start_date;
                if (massEdit.end_date) u.end_date = massEdit.end_date;
                if (massEdit.time) u.time = massEdit.time;
                if (massEdit.duration) u.duration = massEdit.duration;
                if (massEdit.assignee) u.assignee = massEdit.assignee;
                if (massEdit.status) u.status = massEdit.status;
                if (massEdit.priority) u.priority = massEdit.priority;
                if (massEdit.quadrant) u.quadrant = massEdit.quadrant;
                if (massEdit.goal) u.goal = massEdit.goal;
                if (massEdit.tags) u.tags = massEdit.tags;
                if (massEdit.listIndex) u.listIndex = Number(massEdit.listIndex);
                if (massEdit.completed === "done") u.completed = true;
                if (massEdit.completed === "todo") u.completed = false;
                return u;
            }),
        );
        // show saving on each affected row
        selectedIds.forEach((id) => markSaving(id, 800));
        setShowMassEdit(false);
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
            <Sidebar user={{ name: "Hussein" }} />

            <main className="flex-1 p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {viewMode === "dont-forget" ? (
                        <div className="p-6">
                            <div className="border rounded-2xl overflow-hidden relative">
                                <div className="px-6 py-4 bg-white text-gray-900 font-semibold flex items-center justify-between border-b border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-lg">Don't Forget</h3>
                                        {/* Filters */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                className={`px-2 py-1 rounded-md border ${
                                                    showImported
                                                        ? "text-cyan-700 border-cyan-200 bg-cyan-50"
                                                        : "text-gray-600 border-gray-200 bg-white"
                                                }`}
                                                title={showImported ? "Hide imported tasks" : "Show imported tasks"}
                                                onClick={() => setShowImported((v) => !v)}
                                            >
                                                <span
                                                    className={`relative pl-5 text-xs before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:rounded-[2px] before:border ${
                                                        showImported
                                                            ? "before:bg-cyan-500 before:border-cyan-600"
                                                            : "before:bg-white before:border-gray-300"
                                                    }`}
                                                >
                                                    Imported
                                                </span>
                                            </button>
                                            <button
                                                className={`px-2 py-1 rounded-md border ${
                                                    showCompleted
                                                        ? "text-green-700 border-green-200 bg-green-50"
                                                        : "text-gray-600 border-gray-200 bg-white"
                                                }`}
                                                title={showCompleted ? "Hide completed tasks" : "Show completed tasks"}
                                                onClick={() => setShowCompleted((v) => !v)}
                                            >
                                                <span
                                                    className={`relative pl-5 text-xs before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-3 before:rounded-[2px] before:border ${
                                                        showCompleted
                                                            ? "before:bg-green-500 before:border-green-600"
                                                            : "before:bg-white before:border-gray-300"
                                                    }`}
                                                >
                                                    Completed
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Selection summary + Mass edit */}
                                    <div className="flex items-center gap-3">
                                        <span id="mass-selected-number" className="text-sm">
                                            {selectedIds.size} selected
                                        </span>
                                        <button
                                            id="mass-edit"
                                            onClick={() => setShowMassEdit(true)}
                                            disabled={selectedIds.size === 0}
                                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            Mass edit
                                        </button>
                                    </div>
                                </div>
                                {showMassEdit && selectedIds.size > 0 && (
                                    <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                                        <div className="text-sm text-blue-900 font-medium mb-3">
                                            Mass edit {selectedIds.size} task{selectedIds.size > 1 ? "s" : ""}
                                        </div>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-blue-900">Deadline</label>
                                                <input
                                                    type="date"
                                                    value={massEdit.dueDate}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, dueDate: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={massEdit.start_date}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, start_date: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">End Date</label>
                                                <input
                                                    type="date"
                                                    value={massEdit.end_date}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, end_date: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Time</label>
                                                <input
                                                    type="time"
                                                    value={massEdit.time}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, time: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Duration</label>
                                                <input
                                                    value={massEdit.duration}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, duration: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="e.g., 1h, 1d"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Responsible</label>
                                                <input
                                                    value={massEdit.assignee}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, assignee: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="Name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Status</label>
                                                <select
                                                    value={massEdit.status}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, status: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="open">Open</option>
                                                    <option value="in progress">In progress</option>
                                                    <option value="done">Done</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Priority</label>
                                                <select
                                                    value={massEdit.priority}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, priority: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="high">High</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="low">Low</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Quadrant</label>
                                                <select
                                                    value={massEdit.quadrant}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, quadrant: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="Q1">Q1</option>
                                                    <option value="Q2">Q2</option>
                                                    <option value="Q3">Q3</option>
                                                    <option value="Q4">Q4</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Goal</label>
                                                <input
                                                    value={massEdit.goal}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, goal: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="Goal"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Tags</label>
                                                <input
                                                    value={massEdit.tags}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, tags: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="e.g., q3,planning"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">List</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={4}
                                                    value={massEdit.listIndex}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, listIndex: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Completed</label>
                                                <select
                                                    value={massEdit.completed}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, completed: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="done">Mark done</option>
                                                    <option value="todo">Mark to-do</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    setMassEdit({
                                                        dueDate: "",
                                                        start_date: "",
                                                        end_date: "",
                                                        time: "",
                                                        duration: "",
                                                        assignee: "",
                                                        status: "",
                                                        priority: "",
                                                        quadrant: "",
                                                        goal: "",
                                                        tags: "",
                                                        listIndex: "",
                                                        completed: "",
                                                    })
                                                }
                                                className="px-3 py-1.5 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300"
                                            >
                                                Clear all
                                            </button>
                                            <button
                                                onClick={applyMassEdit}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => setShowMassEdit(false)}
                                                className="px-3 py-1.5 text-blue-700 hover:underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full table-fixed">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="w-8 px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all visible"
                                                        onChange={toggleSelectAllVisible}
                                                        checked={
                                                            dontForgetTasks.length > 0 &&
                                                            dontForgetTasks.every((t) => isSelected(t.id))
                                                        }
                                                    />
                                                </th>
                                                <th className="w-[calc(100%-220px)] px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Task name
                                                </th>
                                                <th className="w-[180px] px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Deadline
                                                </th>
                                                <th className="w-[120px] px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {dontForgetTasks.map((task) => (
                                                <React.Fragment key={task.id}>
                                                    <tr className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 align-top">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected(task.id)}
                                                                onChange={() => toggleSelect(task.id)}
                                                                aria-label={`Select ${task.name}`}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <button
                                                                className="flex items-center gap-2 text-left w-full"
                                                                onClick={() => toggleExpanded(task.id)}
                                                                title="Toggle details"
                                                            >
                                                                {task.priority === "high" ? (
                                                                    <FiAlertTriangle className="text-red-500" />
                                                                ) : (
                                                                    <FiClock className="text-blue-500" />
                                                                )}
                                                                <span
                                                                    className={`truncate ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}
                                                                >
                                                                    {task.name}
                                                                </span>
                                                                <FaChevronDown
                                                                    className={`ml-auto transition-transform ${expanded.has(task.id) ? "rotate-180" : ""}`}
                                                                />
                                                            </button>
                                                            {savingIds.has(task.id) && (
                                                                <div className="text-xs text-blue-600 mt-1">
                                                                    Saving...
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-3 text-sm text-gray-700">
                                                            <input
                                                                className="w-full border rounded px-2 py-1"
                                                                value={task.dueDate || ""}
                                                                onChange={(e) =>
                                                                    updateField(task.id, "dueDate", e.target.value)
                                                                }
                                                                type="date"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3 text-sm text-gray-700">
                                                            <div className="flex items-center gap-3">
                                                                {task.priority === "high" && (
                                                                    <FaExclamation
                                                                        className="text-red-600"
                                                                        title="High priority"
                                                                    />
                                                                )}
                                                                {task.priority === "low" && (
                                                                    <FaLongArrowAltDown
                                                                        className="text-gray-500"
                                                                        title="Low priority"
                                                                    />
                                                                )}
                                                                {task.completed ? (
                                                                    <button
                                                                        onClick={() => toggleCompleted(task.id)}
                                                                        className="text-slate-600 hover:text-slate-800"
                                                                        title="Mark as not completed"
                                                                    >
                                                                        <FaTimes />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => toggleCompleted(task.id)}
                                                                        className="text-emerald-600 hover:text-emerald-700"
                                                                        title="Mark as completed"
                                                                    >
                                                                        <FaCheck />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => deleteTask(task.id)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                    title="Delete task"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expanded.has(task.id) && (
                                                        <tr className="bg-gray-50">
                                                            <td />
                                                            <td colSpan={3} className="px-2 py-3">
                                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label className="block text-xs text-gray-600">
                                                                                Start Date
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                className="w-full border rounded px-2 py-1"
                                                                                value={task.start_date || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        task.id,
                                                                                        "start_date",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-gray-600">
                                                                                End Date
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                className="w-full border rounded px-2 py-1"
                                                                                value={task.end_date || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        task.id,
                                                                                        "end_date",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-gray-600">
                                                                                Deadline
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                className="w-full border rounded px-2 py-1"
                                                                                value={task.dueDate || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        task.id,
                                                                                        "dueDate",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-gray-600">
                                                                                Duration
                                                                            </label>
                                                                            <input
                                                                                className="w-full border rounded px-2 py-1"
                                                                                value={task.duration || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        task.id,
                                                                                        "duration",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                                placeholder="Duration"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-4 lg:col-span-2">
                                                                        <div className="grid md:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600">
                                                                                    Key Area
                                                                                </label>
                                                                                <input
                                                                                    className="w-full border rounded px-2 py-1 text-gray-500"
                                                                                    value={"Don't Forget"}
                                                                                    readOnly
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600">
                                                                                    Goal
                                                                                </label>
                                                                                <input
                                                                                    className="w-full border rounded px-2 py-1"
                                                                                    value={task.goal || ""}
                                                                                    onChange={(e) =>
                                                                                        updateField(
                                                                                            task.id,
                                                                                            "goal",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="Goal"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid md:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600">
                                                                                    Priority
                                                                                </label>
                                                                                <select
                                                                                    className="w-full border rounded px-2 py-1"
                                                                                    value={task.priority}
                                                                                    onChange={(e) =>
                                                                                        setPriority(
                                                                                            task.id,
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <option value="high">High</option>
                                                                                    <option value="normal">
                                                                                        Normal
                                                                                    </option>
                                                                                    <option value="low">Low</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-600">
                                                                                    Responsible
                                                                                </label>
                                                                                <input
                                                                                    className="w-full border rounded px-2 py-1"
                                                                                    value={task.assignee || ""}
                                                                                    onChange={(e) =>
                                                                                        updateField(
                                                                                            task.id,
                                                                                            "assignee",
                                                                                            e.target.value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="Responsible"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs text-gray-600">
                                                                                Notes
                                                                            </label>
                                                                            <textarea
                                                                                rows={3}
                                                                                className="w-full border rounded px-2 py-1"
                                                                                value={task.notes || ""}
                                                                                onChange={(e) =>
                                                                                    updateField(
                                                                                        task.id,
                                                                                        "notes",
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                                placeholder="Notes"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}

                                            <tr className="bg-gray-50">
                                                <td className="px-4 py-3" />
                                                <td className="px-2 py-3">
                                                    <div className="inline-flex items-stretch w-full">
                                                        <label
                                                            htmlFor="df-quick-add"
                                                            className="px-3 py-2 bg-blue-600 border border-blue-600 rounded-l-lg text-white select-none"
                                                            title="New quick add"
                                                        >
                                                            New
                                                        </label>
                                                        <input
                                                            id="df-quick-add"
                                                            type="text"
                                                            value={dfName}
                                                            onChange={(e) => setDfName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter")
                                                                    addDontForgetTask({ name: dfName });
                                                            }}
                                                            placeholder="Quick add... press Enter"
                                                            className="flex-1 min-w-0 px-3 py-2 border border-l-0 border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="pl-2 pr-6 py-3" colSpan={2}>
                                                    <button
                                                        onClick={() => addDontForgetTask({ name: dfName })}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        disabled={!dfName.trim()}
                                                    >
                                                        Add task
                                                    </button>
                                                </td>
                                            </tr>

                                            {dontForgetTasks.length === 0 && (
                                                <tr>
                                                    <td className="px-6 py-8 text-gray-500" colSpan={4}>
                                                        No items yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <DontForgetComposer
                                    open={showComposer}
                                    onClose={() => setShowComposer(false)}
                                    onAdd={(data) => addDontForgetTask(data)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-gray-500">Select a view.</div>
                    )}
                </div>
            </main>
        </div>
    );
}
