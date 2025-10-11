import React, { useEffect, useRef, useState } from "react";
import { useToast } from "../shared/ToastProvider.jsx";
import keyAreaService from "../../services/keyAreaService";
import taskService from "../../services/taskService";
import activityService from "../../services/activityService";

export default function CreateTaskModal({ 
    isOpen, 
    onClose, 
    onSave,
    initialData = {},
    preselectedKeyArea = null,
    renderInline = false
}) {
    const { addToast } = useToast();
    const [keyAreas, setKeyAreas] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [form, setForm] = useState({
        keyAreaId: preselectedKeyArea || initialData.keyAreaId || "",
        title: initialData.title || "",
        description: initialData.description || "",
        date: initialData.date || new Date().toISOString().split('T')[0],
        time: initialData.time || "09:00",
        dueDate: initialData.dueDate || "",
        endDate: initialData.endDate || "",
        priority: initialData.priority || "medium",
        assignee: initialData.assignee || "",
        status: initialData.status || "todo",
        // UI-only extras to match form fields
        duration: initialData.duration || "",
        list: initialData.list || "",
        goal: initialData.goal || "",
    });

    // Refs for date pickers
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const finishDateRef = useRef(null);
    const dueDateRef = useRef(null);

    const openPicker = (ref) => {
        const el = ref?.current;
        if (!el) return;
        try {
            if (typeof el.showPicker === 'function') {
                el.showPicker();
                return;
            }
        } catch (_) {}
        el.focus();
        try { el.click(); } catch (_) {}
    };

    // Load key areas on mount
    useEffect(() => {
        if (!isOpen) return;
        
        (async () => {
            try {
                const areas = await keyAreaService.list({ includeTaskCount: false });
                setKeyAreas(Array.isArray(areas) ? areas : []);
            } catch (error) {
                console.error("Failed to load key areas:", error);
                setKeyAreas([]);
            }
        })();
    }, [isOpen]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setForm({
                keyAreaId: preselectedKeyArea || "",
                title: "",
                description: "",
                date: new Date().toISOString().split('T')[0],
                time: "09:00",
                dueDate: "",
                endDate: "",
                priority: "medium",
                assignee: "",
                status: "todo",
                duration: "",
                list: "",
                goal: "",
            });
        }
    }, [isOpen, preselectedKeyArea]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const next = {
                ...prev,
                [name]: value
            };
            if (name === 'date') {
                // Ensure endDate is not before start date; set if empty or earlier
                if (!prev.endDate || prev.endDate < value) {
                    next.endDate = value;
                }
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.title.trim()) {
            addToast({ title: "Task title is required", variant: "error" });
            return;
        }

        if (!form.keyAreaId) {
            addToast({ title: "Please select a key area", variant: "error" });
            return;
        }

        setLoading(true);
        try {
            // Prepare task data
            const taskData = {
                keyAreaId: form.keyAreaId,
                title: form.title.trim(),
                description: form.description.trim() || null,
                assignee: form.assignee.trim() || null,
                startDate: form.date && form.time ? 
                    new Date(`${form.date}T${form.time}`).toISOString() : 
                    (form.date ? new Date(form.date).toISOString() : null),
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
                status: form.status,
                priority: form.priority,
            };

            const createdTask = await taskService.create(taskData);
            
            addToast({ 
                title: "Task created successfully", 
                variant: "success" 
            });
            
            onSave?.(createdTask);
            onClose();
            
        } catch (error) {
            console.error("Failed to create task:", error);
            addToast({ 
                title: error.response?.data?.message || "Failed to create task", 
                variant: "error" 
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // New modal markup as requested
    return (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center">
            <div className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-4xl overflow-hidden">
                <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold">Add Task</div>
                <form className="p-4 md:p-6" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="sr-only" htmlFor="ka-task-title">Task name</label>
                        <input id="ka-task-title" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Task name" value={form.title} name="title" onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="grid gap-3 content-start">
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Description</label>
                                <input className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Brief description" value={form.description} name="description" onChange={handleInputChange} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Start date</label>
                                <div className="relative mt-1">
                                    <input ref={startDateRef} className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon" type="date" value={form.date} name="date" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(startDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(startDateRef); }}>📅</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">End date</label>
                                <div className="relative mt-1">
                                    <input ref={endDateRef} className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon" type="date" value={form.endDate} name="endDate" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(endDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(endDateRef); }}>📅</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Deadline</label>
                                <div className="relative mt-1">
                                    <input ref={dueDateRef} className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon" type="date" value={form.dueDate} name="dueDate" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(dueDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(dueDateRef); }}>📅</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">No later than</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Date (finish)</label>
                                <div className="relative mt-1">
                                    <input ref={finishDateRef} className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon" type="date" value={form.endDate || ""} name="endDate" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(finishDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(finishDateRef); }}>📅</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Duration</label>
                                <div className="relative mt-1">
                                    <input className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 1h, 1d" value={form.duration || ""} name="duration" onChange={handleInputChange} />
                                    <span className="absolute inset-y-0 right-2 grid place-items-center text-base">📅</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 content-start">
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">List</label>
                                <input className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="List name" value={form.list || ""} name="list" onChange={handleInputChange} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Key Area</label>
                                <select name="keyAreaId" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.keyAreaId} onChange={handleInputChange}>
                                    <option value="">— Select key area —</option>
                                    {keyAreas.map(area => (
                                        <option key={area.id} value={area.id}>{area.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Respons.</label>
                                <select name="assignee" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.assignee} onChange={handleInputChange}>
                                    <option value="">— Unassigned —</option>
                                    <option value="Me">Me</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Priority</label>
                                <select name="priority" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.priority} onChange={handleInputChange}>
                                    <option value="high">High</option>
                                    <option value="normal">Normal</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-semibold text-slate-700">Goal</label>
                                <input className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Goal" value={form.goal || ""} name="goal" onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                        <span></span>
                        <div className="flex items-center gap-2">
                            <button type="submit" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm">
                                OK
                            </button>
                            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancel</button>
                            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Help</button>
                        </div>
                    </div>
                </form>
                <button type="button" className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onClose}>
                    ✕
                </button>
            </div>
        </div>
    );

}