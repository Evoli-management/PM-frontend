import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar.jsx";
import { FiAlertTriangle, FiClock } from "react-icons/fi";

// Contract
// - View: If ?dontforget=1, render the simple two-column "Don't Forget" table.
// - Data: In-memory tasks; Don't Forget items have no keyArea.
// - Actions: Add new item via input + button or Enter key.
export default function Tasks() {
    const location = useLocation();

    // Minimal tasks; Don't Forget items have no keyArea
    const [tasks, setTasks] = useState([
        { id: 1, name: "taking lunch", dueDate: "", keyArea: "", priority: "high", completed: false },
    ]);

    // Open Don't Forget view if ?dontforget=1
    const [viewMode, setViewMode] = useState("list");
    useEffect(() => {
        const params = new URLSearchParams(location.search || "");
        if (params.get("dontforget") === "1") setViewMode("dont-forget");
    }, [location.search]);

    // Selection + New row state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [dfName, setDfName] = useState("");

    const dontForgetTasks = useMemo(() => tasks.filter((t) => !t.keyArea), [tasks]);

    const deadlineLabel = (date) => {
        if (!date) return "Deadline";
        const d = new Date(date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return "Overdue";
        if (diff === 0) return "Today";
        if (diff === 1) return "Tomorrow";
        return d.toLocaleDateString();
    };

    const addDontForgetTask = () => {
        const name = dfName.trim();
        if (!name) return;
        setTasks((prev) => [
            ...prev,
            {
                id: prev.length ? Math.max(...prev.map((t) => t.id)) + 1 : 1,
                name,
                dueDate: "",
                keyArea: "",
                priority: "normal",
                completed: false,
            },
        ]);
        setDfName("");
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

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
            <Sidebar user={{ name: "Hussein" }} />

            <main className="flex-1 p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {viewMode === "dont-forget" ? (
                        <div className="p-6">
                            <div className="border rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 bg-gray-900 text-white text-center font-semibold">
                                    Don't Forget ✅
                                </div>
                                <div className="overflow-x-auto">
                                    {/* Mass edit bar */}
                                    {selectedIds.size > 0 && (
                                        <div className="flex items-center justify-between gap-3 px-6 py-3 bg-blue-50 border-b border-blue-100">
                                            <div className="text-sm text-blue-800 font-medium">
                                                Mass edit ({selectedIds.size} selected):
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => massComplete(true)}
                                                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                                                >
                                                    Mark done
                                                </button>
                                                <button
                                                    onClick={() => massComplete(false)}
                                                    className="px-3 py-1.5 text-xs bg-slate-600 text-white rounded-md hover:bg-slate-700"
                                                >
                                                    Mark to-do
                                                </button>
                                                <select
                                                    onChange={(e) => massSetPriority(e.target.value)}
                                                    className="px-2 py-1.5 text-xs border rounded-md"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>
                                                        Set priority…
                                                    </option>
                                                    <option value="high">High</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="low">Low</option>
                                                </select>
                                                <button
                                                    onClick={massDelete}
                                                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={clearSelection}
                                                    className="px-2 py-1.5 text-xs text-blue-700 hover:underline"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                    )}

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
                                                <th className="w-2/3 px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Task name
                                                </th>
                                                <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                    Deadline
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {dontForgetTasks.map((task) => (
                                                <tr key={task.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 align-top">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected(task.id)}
                                                            onChange={() => toggleSelect(task.id)}
                                                            aria-label={`Select ${task.name}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <div className="flex items-center gap-2">
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
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-gray-700">
                                                        {deadlineLabel(task.dueDate)}
                                                    </td>
                                                </tr>
                                            ))}

                                            <tr className="bg-gray-50">
                                                <td className="px-4 py-3" />
                                                <td className="px-2 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-blue-600">⊕ New</span>
                                                        <input
                                                            type="text"
                                                            value={dfName}
                                                            onChange={(e) => setDfName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") addDontForgetTask();
                                                            }}
                                                            placeholder="Task name ................."
                                                            className="flex-1 min-w-0 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <button
                                                        onClick={addDontForgetTask}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        disabled={!dfName.trim()}
                                                    >
                                                        Add task
                                                    </button>
                                                </td>
                                            </tr>

                                            {dontForgetTasks.length === 0 && (
                                                <tr>
                                                    <td className="px-6 py-8 text-gray-500" colSpan={3}>
                                                        No items yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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
