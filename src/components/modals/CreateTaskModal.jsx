import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../shared/Modal";
import { useToast } from "../shared/ToastProvider.jsx";
import { useDraggable } from "../../hooks/useDraggable";
import { useResizable } from "../../hooks/useResizable";
import { FaSave, FaTrash } from "react-icons/fa";
import { formatKeyAreaLabel } from "../../utils/keyAreaDisplay";
import { durationToTimeInputValue } from "../../utils/duration";
// Load services on demand to allow them to be code-split from the main bundle
let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import("../../services/keyAreaService");
    _keyAreaService = mod?.default || mod;
    return _keyAreaService;
};

let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import("../../services/taskService");
    _taskService = mod?.default || mod;
    return _taskService;
};

export default function CreateTaskModal({ 
    isOpen, 
    onClose, 
    onSave,
    onDelete,
    initialData = {},
    preselectedKeyArea = null,
    renderInline = false,
    taskId = null  // For edit mode
}) {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [keyAreas, setKeyAreas] = useState([]);
    const [goals, setGoals] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [listNames, setListNames] = useState({});
    const [loading, setLoading] = useState(false);
    const isEditMode = !!taskId;
    
    const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
    const { size, isDraggingResize, handleResizeMouseDown } = useResizable(500, 490);
    
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);
    
    useEffect(() => {
        if (isOpen) resetPosition();
    }, [isOpen, resetPosition]);
    
    const [form, setForm] = useState({
        keyAreaId: preselectedKeyArea || initialData.keyAreaId || "",
        title: initialData.title || "",
        description: initialData.description || "",
        date: initialData.date || new Date().toISOString().split('T')[0],
        time: initialData.time || "09:00",
        dueDate: initialData.dueDate || "",
        endDate: initialData.endDate || "",
        list_index: initialData.list_index || 1,
        priority: initialData.priority || "medium",
        assignee: initialData.assignee || "",
        status: initialData.status || "todo",
        duration: durationToTimeInputValue(initialData.duration || ""),
        goal: initialData.goal || "",
    });

    // Refs for date pickers
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
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

    // Load key areas and tasks on mount
    useEffect(() => {
        if (!isOpen) return;
        
        (async () => {
            try {
                console.log('Fetching goals and other data...');
                const kaSvc = await getKeyAreaService();
                const ts = await getTaskService();
                const [areas, goalsData, allTasksData] = await Promise.all([
                    kaSvc.list({ includeTaskCount: false }),
                    // Dynamically import goalService so it can be split from the
                    // initial bundle when the modal is not used at startup.
                    import("../../services/goalService").then((m) => m.getGoals({ status: 'active' })).catch(() => []),
                    ts.list({}),
                ]);
                console.log('Goals fetched:', goalsData);
                setKeyAreas(Array.isArray(areas) ? areas : []);
                setGoals(Array.isArray(goalsData) ? goalsData : []);
                setAllTasks(Array.isArray(allTasksData) ? allTasksData : []);
            } catch (error) {
                console.error("Failed to load data:", error);
                setKeyAreas([]);
                setGoals([]);
                setAllTasks([]);
            }
        })();
    }, [isOpen]);

    // Load listNames for the selected key area
    useEffect(() => {
        if (!form.keyAreaId) {
            setListNames({});
            return;
        }
        const selectedArea = keyAreas.find(a => a.id === form.keyAreaId);
        if (selectedArea?.listNames) {
            setListNames(selectedArea.listNames);
        } else {
            setListNames({});
        }
    }, [form.keyAreaId, keyAreas]);

    // Compute available lists for the smart dropdown
    const availableLists = (() => {
        if (!form.keyAreaId) return [1];
        
        // Get lists with custom names
        const namedLists = Object.keys(listNames || {})
            .map(Number)
            .filter((idx) => listNames[idx] && listNames[idx].trim() !== "");
        
        // Get lists that have tasks
        const listsWithTasks = allTasks
            .filter((t) => t.keyAreaId === form.keyAreaId && t.list_index)
            .map((t) => t.list_index)
            .filter((idx, i, arr) => arr.indexOf(idx) === i);
        
        // Combine and deduplicate
        const combined = [1, ...namedLists, ...listsWithTasks];
        return [...new Set(combined)].sort((a, b) => a - b);
    })();

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
                list_index: 1,
                priority: "medium",
                assignee: "",
                status: "todo",
                duration: "",
                goal: "",
            });
        }
    }, [isOpen, preselectedKeyArea]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const next = {
                ...prev,
                [name]: name === 'list_index' ? parseInt(value, 10) : value
            };
            if (name === 'date') {
                // Ensure endDate is not before start date; set if empty or earlier
                if (!prev.endDate || prev.endDate < value) {
                    next.endDate = value;
                }
            }
            if (name === 'endDate') {
                // Keep start date aligned when end date is moved earlier.
                if (value && prev.date && value < prev.date) {
                    next.date = value;
                }
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.title.trim()) {
            addToast({ title: t("createTaskModal.titleRequired"), variant: "error" });
            return;
        }

        if (!form.keyAreaId) {
            addToast({ title: t("createTaskModal.keyAreaRequired"), variant: "error" });
            return;
        }

        setLoading(true);
        try {
            // Prepare task data
            const taskData = {
                keyAreaId: form.keyAreaId,
                goalId: form.goal || null,
                title: form.title.trim(),
                description: form.description.trim() || null,
                assignee: form.assignee.trim() || null,
                startDate: form.date && form.time ? 
                    new Date(`${form.date}T${form.time}`).toISOString() : 
                    (form.date ? new Date(form.date).toISOString() : null),
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
                list_index: form.list_index || 1,
                status: form.status,
                priority: form.priority,
                duration: form.duration ? String(form.duration).trim() : null,
            };

            let result;
            if (isEditMode) {
                const svc = await getTaskService();
                result = await svc.update(taskId, taskData);
                addToast({
                    title: t("createTaskModal.taskUpdated"),
                    variant: "success"
                });
            } else {
                const svc = await getTaskService();
                result = await svc.create(taskData);
                addToast({
                    title: t("createTaskModal.taskCreated"),
                    variant: "success"
                });
            }
            
            onSave?.(result);
            onClose();
            
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} task:`, error);
            addToast({ 
                title: error.response?.data?.message || t(isEditMode ? "createTaskModal.failedUpdate" : "createTaskModal.failedCreate"),
                variant: "error" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditMode || !taskId) return;
        if (!window.confirm(t("createTaskModal.deleteConfirm"))) return;
        try {
            if (typeof onDelete === "function") {
                await onDelete(taskId);
            } else {
                const svc = await getTaskService();
                await svc.remove(taskId);
            }
            addToast({ title: t("createTaskModal.taskDeleted"), variant: "success" });
            onClose();
        } catch (error) {
            console.error("Failed to delete task:", error);
            addToast({ title: t("createTaskModal.failedDelete"), variant: "error" });
        }
    };

    if (!isOpen) return null;

    return (
        <Modal open={isOpen} onClose={onClose}>
            <div 
                className="relative bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    minWidth: '300px',
                    minHeight: '200px'
                }}
            >
                <div 
                    className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold cursor-grab active:cursor-grabbing select-none flex-shrink-0"
                    onMouseDown={handleMouseDown}
                >
                    <div className="relative">
                        <span>{isEditMode ? t("createTaskModal.editTitle") : t("createTaskModal.addTitle")}</span>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button
                                type="submit"
                                form="create-task-legacy-form"
                                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                            >
                                <FaSave className="text-xs" />
                                {t("createTaskModal.save")}
                            </button>
                            {isEditMode && (
                                <button
                                    type="button"
                                    className="p-2 rounded-md text-red-600 hover:bg-red-50"
                                    aria-label="Delete"
                                    onClick={handleDelete}
                                >
                                    <FaTrash className="text-sm" />
                                </button>
                            )}
                            <button type="button" className="p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onClose}>
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
                <form id="create-task-legacy-form" className="pm-notched-form p-4 md:p-6 overflow-y-auto flex-1" onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="text-sm font-medium text-slate-700" htmlFor="ka-task-title">{t("createTaskModal.taskNameLabel")}</label>
                        <input autoFocus id="ka-task-title" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50" placeholder={t("createTaskModal.taskNamePlaceholder")} value={form.title} name="title" onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="grid gap-3 content-start">
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.descLabel")}</label>
                                <input className="mt-0 h-9 rounded-lg border border-slate-300 px-3 text-sm shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50" placeholder={t("createTaskModal.descPlaceholder")} value={form.description} name="description" onChange={handleInputChange} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.startDateLabel")}</label>
                                <div className="relative mt-0">
                                    <input ref={startDateRef} className="h-9 w-full rounded-lg border border-slate-300 pr-10 pl-3 text-sm shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 hide-native-date-icon" type="date" value={form.date} name="date" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(startDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(startDateRef); }}>📅</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.endDateLabel")}</label>
                                <div className="relative mt-0">
                                    <input ref={endDateRef} className="h-9 w-full rounded-lg border border-slate-300 pr-10 pl-3 text-sm shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 hide-native-date-icon" type="date" value={form.endDate} name="endDate" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(endDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(endDateRef); }}>📅</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.deadlineLabel")}</label>
                                <div className="relative mt-0.5">
                                    <input ref={dueDateRef} className="h-9 w-full rounded-lg border border-slate-300 pr-10 pl-3 text-sm shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 hide-native-date-icon" type="date" value={form.dueDate} name="dueDate" onChange={handleInputChange} />
                                    <span role="button" tabIndex={0} aria-label="Open date picker" className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none" onClick={() => openPicker(dueDateRef)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(dueDateRef); }}>📅</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500" aria-hidden="true">&nbsp;</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.durationLabel")}</label>
                                <div className="relative mt-0">
                                    <input className="h-9 w-full rounded-lg border border-slate-300 pr-10 pl-3 text-sm shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50" type="time" step="60" value={form.duration || ""} name="duration" onChange={handleInputChange} />
                                    <span className="absolute inset-y-0 right-2 grid place-items-center text-base">🕒</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 content-start">
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.keyAreaLabel")}</label>
                                <select name="keyAreaId" className="mt-0 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50" value={form.keyAreaId} onChange={handleInputChange}>
                                    <option value="">{t("createTaskModal.selectKeyArea")}</option>
                                    {keyAreas.map((area, idx) => (
                                        <option key={area.id} value={area.id}>{formatKeyAreaLabel(area, idx)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.listLabel")}</label>
                                <select
                                    name="list_index"
                                    className="mt-0 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                    value={form.list_index}
                                    onChange={handleInputChange}
                                    disabled={!form.keyAreaId}
                                >
                                    {availableLists.map((idx) => (
                                        <option key={idx} value={idx}>
                                            {listNames[idx] || t("createTaskModal.listFallback", { n: idx })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.assigneeLabel")}</label>
                                <select name="assignee" className="mt-0 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50" value={form.assignee} onChange={handleInputChange}>
                                    <option value="">{t("createTaskModal.unassigned")}</option>
                                    <option value="Me">{t("createTaskModal.meOption")}</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.priorityLabel")}</label>
                                <select
                                    name="priority"
                                    className="mt-0 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                    value={form.priority}
                                    onChange={handleInputChange}
                                >
                                    <option value="high">{t("createTaskModal.highOpt")}</option>
                                    <option value="normal">{t("createTaskModal.normalOpt")}</option>
                                    <option value="low" style={{ color: "#6b7280" }}>{t("createTaskModal.lowOpt")}</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.goalLabel")}</label>
                                <select
                                    className="mt-0 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                    value={form.goal || ""}
                                    name="goal"
                                    onChange={handleInputChange}
                                >
                                    <option value="">{t("createTaskModal.selectGoal")}</option>
                                    {goals.map((goal) => (
                                        <option key={goal.id} value={goal.id}>
                                            {goal.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
                {/* Right resize handle */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                  className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors"
                  style={{ zIndex: 40 }}
                />
                {/* Bottom resize handle */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                  className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors"
                  style={{ zIndex: 40 }}
                />
                {/* Corner resize handle (southeast) */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors rounded-tl"
                  style={{ zIndex: 41 }}
                  title="Drag to resize"
                />
            </div>
        </Modal>
    );

}
