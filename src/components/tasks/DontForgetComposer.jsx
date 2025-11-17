import React, { useEffect, useRef, useState } from "react";
import { FaSave, FaTimes } from "react-icons/fa";
// Load keyAreaService on demand to reduce initial bundle weight
let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import("../../services/keyAreaService");
    _keyAreaService = mod?.default || mod;
    return _keyAreaService;
};
import usersService from "../../services/usersService";

export default function DontForgetComposer({ open, onClose, onAdd, defaultList = 1 }) {
    const modalRef = useRef(null);
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const deadlineRef = useRef(null);
    const finishDateRef = useRef(null);

    const [title, setTitle] = useState("");
    const [deadline, setDeadline] = useState("");
    const [priority, setPriority] = useState("normal");
    const [assignee, setAssignee] = useState("");
    const [startDate, setStartDate] = useState("");
    const [plannedEnd, setPlannedEnd] = useState("");
    const [duration, setDuration] = useState("");
    const [goal, setGoal] = useState("");
    const [notes, setNotes] = useState("");
    const [project, setProject] = useState("");
    const [finishDate, setFinishDate] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const [saving, setSaving] = useState(false);
    const [keyAreas, setKeyAreas] = useState([]);
    const [users, setUsers] = useState([]);
    const [keyAreaId, setKeyAreaId] = useState("");
    // Keep end date synced to start date until user edits end date manually
    const [endAuto, setEndAuto] = useState(true);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (open) {
            setTitle("");
            setDeadline("");
            setPriority("normal");
            setAssignee("");
            setStartDate("");
            setPlannedEnd("");
            setDuration("");
            setGoal("");
            setNotes("");
            setProject("");
            setFinishDate("");
            setShowHelp(false);
            setSaving(false);
            setKeyAreaId("");
            setEndAuto(true);
            (async () => {
                try {
                    const kaSvc = await getKeyAreaService();
                    const [kas, us] = await Promise.all([kaSvc.list({ includeTaskCount: false }), usersService.list()]);
                    setKeyAreas(kas);
                    setUsers(us);
                } catch {
                    setKeyAreas([]);
                    setUsers([]);
                }
            })();
        }
    }, [open, defaultList]);

    if (!open) return null;

    const openPicker = (ref) => {
        try {
            if (ref?.current) {
                ref.current.focus();
                if (typeof ref.current.showPicker === "function") {
                    ref.current.showPicker();
                }
            }
        } catch {}
    };

    const submit = async (e) => {
        e?.preventDefault?.();
        const name = title.trim();
        if (!name) return;
        try {
            setSaving(true);
            await onAdd?.({
                name,
                // left column
                notes, // Description
                start_date: startDate,
                end_date: plannedEnd,
                dueDate: deadline,
                finish_date: finishDate,
                duration,
                // right column
                project,
                assignee, // Respons.
                priority,
                goal,
                ...(keyAreaId ? { keyAreaId } : {}),
                keyAreaName: keyAreaId
                    ? keyAreas.find((k) => String(k.id) === String(keyAreaId))?.title || ""
                    : "Don't Forget",
            });
            onClose?.();
        } finally {
            setSaving(false);
        }
    };

    const onStartDateChange = (v) => {
        setStartDate(v);
        if (endAuto || !plannedEnd) {
            setPlannedEnd(v);
        }
    };

    const onEndDateChange = (v) => {
        setPlannedEnd(v);
        // Once user edits end date, stop auto-syncing
        setEndAuto(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center" onClick={onClose}>
            <div
                ref={modalRef}
                className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header strip */}
                <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold">
                    Add Task
                </div>
                <form onSubmit={submit} className="p-4 md:p-6">
                    {/* Task name field under header */}
                    <div className="mb-4">
                        <label className="sr-only" htmlFor="task-title">
                            Task name
                        </label>
                        <input
                            id="task-title"
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Task name"
                            required
                        />
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Left column: compact fields */}
                        <div className="grid gap-3 content-start">
                            {/* Description (short) */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Description</label>
                                <input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief description"
                                />
                            </div>

                            {/* Start date */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Start date</label>
                                <div className="relative mt-1">
                                    <input
                                        type="date"
                                        ref={startDateRef}
                                        value={startDate}
                                        onChange={(e) => onStartDateChange(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        onClick={() => openPicker(startDateRef)}
                                        onKeyDown={(e) =>
                                            (e.key === "Enter" || e.key === " ") && openPicker(startDateRef)
                                        }
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                    >
                                        📅
                                    </span>
                                </div>
                            </div>

                            {/* End date */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">End date</label>
                                <div className="relative mt-1">
                                    <input
                                        type="date"
                                        ref={endDateRef}
                                        value={plannedEnd}
                                        onChange={(e) => onEndDateChange(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        onClick={() => openPicker(endDateRef)}
                                        onKeyDown={(e) =>
                                            (e.key === "Enter" || e.key === " ") && openPicker(endDateRef)
                                        }
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                    >
                                        📅
                                    </span>
                                </div>
                            </div>

                            {/* Deadline */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Deadline</label>
                                <div className="relative mt-1">
                                    <input
                                        type="date"
                                        ref={deadlineRef}
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        onClick={() => openPicker(deadlineRef)}
                                        onKeyDown={(e) =>
                                            (e.key === "Enter" || e.key === " ") && openPicker(deadlineRef)
                                        }
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                    >
                                        📅
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">No later than</p>
                            </div>

                            {/* Date (finish) */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Date (finish)</label>
                                <div className="relative mt-1">
                                    <input
                                        type="date"
                                        ref={finishDateRef}
                                        value={finishDate}
                                        onChange={(e) => setFinishDate(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        onClick={() => openPicker(finishDateRef)}
                                        onKeyDown={(e) =>
                                            (e.key === "Enter" || e.key === " ") && openPicker(finishDateRef)
                                        }
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                    >
                                        📅
                                    </span>
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Duration</label>
                                <div className="relative mt-1">
                                    <input
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 1h, 1d"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right column: wider inputs */}
                        <div className="grid gap-3 content-start">
                            {/* List */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">List</label>
                                <input
                                    value={project}
                                    onChange={(e) => setProject(e.target.value)}
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="List name"
                                />
                            </div>

                            {/* Key Area */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Key Area</label>
                                <input
                                    value={"Don't Forget"}
                                    readOnly
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-500 bg-slate-50"
                                />
                            </div>

                            {/* Responsible */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Respons.</label>
                                <input
                                    value={assignee}
                                    onChange={(e) => setAssignee(e.target.value)}
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Assignee"
                                />
                            </div>

                            {/* Priority */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="high">High</option>
                                    <option value="normal">Normal</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>

                            {/* Goal */}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Goal</label>
                                <input
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Goal"
                                />
                            </div>

                            {/* Only the requested fields are shown */}
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="mt-6 flex items-center justify-between">
                        {showHelp ? (
                            <div className="text-xs text-slate-600">
                                • OK saves the task • Cancel closes without saving • Dates use your local timezone.
                            </div>
                        ) : (
                            <span />
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
                                disabled={saving}
                            >
                                <FaSave /> {saving ? "Saving..." : "OK"}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowHelp((v) => !v)}
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                disabled={saving}
                            >
                                Help
                            </button>
                        </div>
                    </div>
                </form>
                {/* Close button (corner X) */}
                <button
                    type="button"
                    className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <FaTimes />
                </button>
            </div>
        </div>
    );
}
