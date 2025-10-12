import React, { useEffect, useRef, useState } from 'react';
import Modal from '../shared/Modal';
import { useToast } from "../shared/ToastProvider.jsx";
import activityService from "../../services/activityService";
import keyAreaService from "../../services/keyAreaService";
import taskService from "../../services/taskService";

const CreateActivityModal = ({ isOpen, onClose, onSave, initialData = {}, attachedTaskId = null }) => {
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [keyAreas, setKeyAreas] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [form, setForm] = useState({
        // backend-relevant
        taskId: initialData.taskId || attachedTaskId || "",
        text: initialData.text || "",
        // UI fields
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        deadline: '',
        finish_date: '',
        duration: '',
        list: '',
        key_area_id: '',
        assignee: '',
        priority: 'normal',
        goal: '',
    });

    // Refs for date inputs to open native pickers
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const deadlineRef = useRef(null);
    const finishDateRef = useRef(null);

    const openPicker = (ref) => {
        const el = ref?.current;
        if (!el) return;
        // Try the native showPicker when available
        try {
            if (typeof el.showPicker === 'function') {
                el.showPicker();
                return;
            }
        } catch (_) {
            // ignore
        }
        // Fallbacks to encourage the picker to open
        el.focus();
        try { el.click(); } catch (_) {}
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'start_date') {
                // If end_date is empty or comes before the new start_date, set it to start_date
                if (!prev.end_date || prev.end_date < value) {
                    next.end_date = value;
                }
            }
            return next;
        });
    };

    // Load key areas when modal opens
    useEffect(() => {
        let ignore = false;
        async function loadKeyAreas() {
            try {
                const areas = await keyAreaService.list({ includeTaskCount: false });
                if (!ignore) setKeyAreas(Array.isArray(areas) ? areas : []);
            } catch (error) {
                console.error("Failed to load key areas:", error);
                if (!ignore) setKeyAreas([]);
            }
        }
        if (isOpen) {
            loadKeyAreas();
        }
        return () => {
            ignore = true;
        };
    }, [isOpen]);

    // Load tasks when key area changes (if provided) and no attachedTaskId forcing attachment
    useEffect(() => {
        let ignore = false;
        async function loadTasks() {
            const ka = form.key_area_id;
            if (!isOpen || attachedTaskId || !ka) {
                if (!ignore) setTasks([]);
                return;
            }
            try {
                setLoadingTasks(true);
                const rows = await taskService.list({ keyAreaId: ka });
                if (!ignore) setTasks(Array.isArray(rows) ? rows : []);
            } catch (e) {
                console.error("Failed to load tasks for key area", ka, e);
                if (!ignore) setTasks([]);
            } finally {
                if (!ignore) setLoadingTasks(false);
            }
        }
        loadTasks();
        return () => {
            ignore = true;
        };
    }, [isOpen, form.key_area_id, attachedTaskId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            // Require key area and task selection when not pre-attached
            if (!attachedTaskId) {
                if (!form.key_area_id) {
                    addToast({ title: "Please select a Key Area", variant: "error" });
                    setSubmitting(false);
                    return;
                }
                if (!form.taskId) {
                    addToast({ title: "Please select a Task", description: "Pick a task in the selected Key Area to attach this activity.", variant: "error" });
                    setSubmitting(false);
                    return;
                }
            }

            const payload = {
                text: (form.title && form.title.trim()) || (form.text && form.text.trim()) || (form.description && form.description.trim()) || "",
                taskId: attachedTaskId || form.taskId || null,
            };
            if (!payload.text) {
                addToast({ title: "Activity name is required", variant: "error" });
                setSubmitting(false);
                return;
            }
            const created = await activityService.create(payload);
            addToast({ title: "Activity created", variant: "success" });
            onSave?.(created);
            onClose?.();
        } catch (err) {
            console.error("Failed to create activity", err);
            addToast({ title: "Failed to create activity", description: String(err?.message || err), variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal open={isOpen} onClose={onClose}>
            <div className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-4xl overflow-hidden">
                <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold">
                    Add Activity
                    {(form.taskId || attachedTaskId) && (
                        <span className="ml-2 text-xs font-normal text-slate-500">(attaching to task #{form.taskId || attachedTaskId})</span>
                    )}
                </div>
                <form className="p-4 md:p-6" onSubmit={handleSubmit}>
                    {(form.taskId || attachedTaskId) && (
                        <input type="hidden" name="taskId" value={form.taskId || attachedTaskId} />
                    )}
                    <div className="mb-4">
                        <label className="sr-only" htmlFor="ka-activity-title">Activity name</label>
                        <input
                            id="ka-activity-title"
                            required
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Activity name"
                            value={form.title}
                            name="title"
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="grid gap-3 content-start">
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Description</label>
                                <input
                                    className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief description"
                                    value={form.description}
                                    name="description"
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Start date</label>
                                <div className="relative mt-1">
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                        type="date"
                                        value={form.start_date}
                                        name="start_date"
                                        onChange={handleChange}
                                        ref={startDateRef}
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                        onClick={() => openPicker(startDateRef)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(startDateRef); }}
                                    >
                                        📅
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">End date</label>
                                <div className="relative mt-1">
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                        type="date"
                                        value={form.end_date}
                                        name="end_date"
                                        onChange={handleChange}
                                        ref={endDateRef}
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                        onClick={() => openPicker(endDateRef)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(endDateRef); }}
                                    >
                                        📅
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Deadline</label>
                                <div className="relative mt-1">
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                        type="date"
                                        value={form.deadline}
                                        name="deadline"
                                        onChange={handleChange}
                                        ref={deadlineRef}
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                        onClick={() => openPicker(deadlineRef)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(deadlineRef); }}
                                    >
                                        📅
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">No later than</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Date (finish)</label>
                                <div className="relative mt-1">
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                        type="date"
                                        value={form.finish_date}
                                        name="finish_date"
                                        onChange={handleChange}
                                        ref={finishDateRef}
                                    />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open date picker"
                                        className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                        onClick={() => openPicker(finishDateRef)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(finishDateRef); }}
                                    >
                                        📅
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Duration</label>
                                <div className="relative mt-1">
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 1h, 1d"
                                        value={form.duration}
                                        name="duration"
                                        onChange={handleChange}
                                    />
                                    <span className="absolute inset-y-0 right-2 grid place-items-center text-base">📅</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 content-start">
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">List</label>
                                <input
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="List name"
                                    value={form.list}
                                    name="list"
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Key Area</label>
                                <select
                                    name="key_area_id"
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.key_area_id}
                                    onChange={(e) => {
                                        handleChange(e);
                                        // Clear any previously selected task when key area changes
                                        setForm((prev) => ({ ...prev, taskId: "" }));
                                    }}
                                    disabled={!!attachedTaskId}
                                >
                                    <option value="">— Select key area —</option>
                                    {keyAreas.map((ka) => (
                                        <option key={ka.id} value={ka.id}>{ka.title}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Task picker appears when not pre-attached */}
                            {!attachedTaskId && (
                                <div className="flex flex-col">
                                    <label className="text-xs font-semibold text-slate-700">Task</label>
                                    <select
                                        name="taskId"
                                        className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={form.taskId}
                                        onChange={handleChange}
                                        disabled={!form.key_area_id || loadingTasks}
                                    >
                                        {!form.key_area_id ? (
                                            <option value="">Select key area first</option>
                                        ) : loadingTasks ? (
                                            <option value="">Loading tasks…</option>
                                        ) : tasks.length === 0 ? (
                                            <option value="">No tasks found in this key area</option>
                                        ) : (
                                            <>
                                                <option value="">— Select task —</option>
                                                {tasks.map((t) => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                            )}
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Respons.</label>
                                <select
                                    name="assignee"
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.assignee}
                                    onChange={handleChange}
                                >
                                    <option value="">— Unassigned —</option>
                                    <option value="Me">Me</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Priority</label>
                                <select
                                    name="priority"
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.priority}
                                    onChange={handleChange}
                                >
                                    <option value="high">High</option>
                                    <option value="normal">Normal</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Goal</label>
                                <input
                                    className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Goal"
                                    value={form.goal}
                                    name="goal"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <span></span>
                        <div className="flex items-center gap-2">
                            <button type="submit" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm" disabled={submitting}>
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
                                {submitting ? 'Saving…' : 'OK'}
                            </button>
                            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancel</button>
                            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" disabled>Help</button>
                        </div>
                    </div>
                </form>
                <button type="button" className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onClose}>
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
                </button>
            </div>
        </Modal>
    );
};

export default CreateActivityModal;