import React, { useEffect, useRef, useState } from "react";
import { FaExclamationCircle, FaSave, FaTimes } from "react-icons/fa";

export default function DontForgetComposer({ open, onClose, onAdd, defaultList = 1 }) {
    const modalRef = useRef(null);
    const [title, setTitle] = useState("");
    const [deadline, setDeadline] = useState("");
    const [priority, setPriority] = useState("normal");
    const [assignee, setAssignee] = useState("");
    const [status, setStatus] = useState("in progress");
    const [tags, setTags] = useState("");
    const [startDate, setStartDate] = useState("");
    const [plannedEnd, setPlannedEnd] = useState("");
    const [quadrant, setQuadrant] = useState("Q3");
    const [listIndex, setListIndex] = useState(defaultList || 1);
    const [timeOfDay, setTimeOfDay] = useState("");
    const [duration, setDuration] = useState("");
    const [goal, setGoal] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Use same naming convention as Tasks page if present
    const dfListNames = React.useMemo(() => {
        try {
            const raw = localStorage.getItem("dfListNames");
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, []);
    const getDfListName = (n) => (dfListNames?.[n] ? dfListNames[n] : `List ${n}`);

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
            setStatus("in progress");
            setTags("");
            setStartDate("");
            setPlannedEnd("");
            setQuadrant("Q3");
            setListIndex(defaultList || 1);
            setTimeOfDay("");
            setDuration("");
            setGoal("");
            setNotes("");
            setSaving(false);
        }
    }, [open, defaultList]);

    if (!open) return null;

    const submit = async (e) => {
        e?.preventDefault?.();
        const name = title.trim();
        if (!name) return;
        try {
            setSaving(true);
            await onAdd?.({
                name,
                dueDate: deadline,
                priority,
                assignee,
                status,
                tags,
                start_date: startDate,
                end_date: plannedEnd,
                quadrant,
                listIndex,
                time: timeOfDay,
                duration,
                goal,
                notes,
                keyAreaName: "Don't Forget",
            });
            onClose?.();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center" onClick={onClose}>
            <div
                ref={modalRef}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl w-[92vw] max-w-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-900">New Task</h2>
                    <button
                        type="button"
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>
                <form onSubmit={submit} className="grid gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <label className="text-sm font-semibold text-slate-900 block">Task Title *</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            placeholder="e.g., Pay utility bill"
                            required
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Deadline</label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            >
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">End Date</label>
                            <input
                                type="date"
                                value={plannedEnd}
                                onChange={(e) => setPlannedEnd(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Time</label>
                            <input
                                type="time"
                                value={timeOfDay}
                                onChange={(e) => setTimeOfDay(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                placeholder="--:-- --"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Duration</label>
                            <input
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                placeholder="e.g., 1h, 1d"
                            />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Responsible</label>
                            <input
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                placeholder="Name"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            >
                                <option value="open">Open</option>
                                <option value="in progress">In progress</option>
                                <option value="done">Done</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Tags</label>
                            <input
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                placeholder="e.g., q3,planning"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Quadrant</label>
                            <select
                                value={quadrant}
                                onChange={(e) => setQuadrant(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            >
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Key Area</label>
                            <input
                                value={"Don't Forget"}
                                readOnly
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2 text-slate-500"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Goal</label>
                            <input
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                placeholder="Goal"
                            />
                        </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <label className="text-sm font-semibold text-slate-900 block">Notes</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            placeholder="Add notes..."
                        />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">Planned End</label>
                            <input
                                type="date"
                                value={plannedEnd}
                                onChange={(e) => setPlannedEnd(e.target.value)}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <label className="text-sm font-semibold text-slate-900 block">
                                {`List — ${getDfListName(listIndex || 1)}`}
                            </label>
                            <select
                                value={String(listIndex || 1)}
                                onChange={(e) => setListIndex(Number(e.target.value || 1))}
                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                            >
                                {Object.keys(dfListNames || {})
                                    .map((k) => Number(k))
                                    .concat([1])
                                    .filter((v, i, arr) => arr.indexOf(v) === i)
                                    .sort((a, b) => a - b)
                                    .map((n) => (
                                        <option key={n} value={String(n)}>
                                            {getDfListName(n)}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-slate-700 flex items-center gap-1">
                            <FaExclamationCircle /> These tasks don’t belong to a Key Area.
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg text-sm text-slate-600 hover:underline"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50"
                                disabled={saving}
                            >
                                <FaSave /> {saving ? "Saving..." : "Add Task"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
