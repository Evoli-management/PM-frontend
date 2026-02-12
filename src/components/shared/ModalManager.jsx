import React, { useEffect, useState, Suspense } from "react";
// Lazy-load modal components to reduce initial bundle size
const CreateTaskModal = React.lazy(() => import("../key-areas/CreateTaskModal.jsx"));
const CalendarCreateModal = React.lazy(() => import("../modals/CalendarCreateModal.jsx"));
const CreateActivityModal = React.lazy(() => import("../modals/CreateActivityFormModal.jsx"));
const GoalForm = React.lazy(() => import("../goals/GoalForm.jsx"));
// Load services on demand to allow code-splitting
let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import("../../services/taskService");
    _taskService = mod?.default || mod;
    return _taskService;
};

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import("../../services/keyAreaService");
    _keyAreaService = mod?.default || mod;
    return _keyAreaService;
};

import { useToast } from "./ToastProvider.jsx";

export default function ModalManager() {
    const [modal, setModal] = useState({ type: null, payload: null });
    const [keyAreas, setKeyAreas] = useState([]);
    const [tasks, setTasks] = useState([]);
    const { addToast } = useToast();

    useEffect(() => {
        const handler = (e) => {
            const type = e?.detail?.type || e?.detail;
            if (type === 'appointment') {
                try { window.dispatchEvent(new CustomEvent('open-create-appointment')); } catch (_) {}
                setModal({ type: null, payload: null });
                return;
            }
            setModal({ type, payload: e?.detail || null });
        };
        window.addEventListener('open-create-modal', handler);
        return () => window.removeEventListener('open-create-modal', handler);
    }, []);

    // Load key areas and data when the activity modal opens
    useEffect(() => {
        if (modal.type === 'activity') {
            (async () => {
                try {
                    const kaSvc = await getKeyAreaService();
                    const taskSvc = await getTaskService();
                    
                    // Load key areas
                    const areas = await kaSvc.list({ includeTaskCount: false });
                    setKeyAreas(Array.isArray(areas) ? areas : []);
                    
                    // Load all tasks for all key areas
                    const allTasks = await taskSvc.list({});
                    setTasks(Array.isArray(allTasks) ? allTasks : []);
                } catch (err) {
                    console.error('Failed to load key areas and tasks for activity modal', err);
                    setKeyAreas([]);
                    setTasks([]);
                }
            })();
        } else {
            setKeyAreas([]);
            setTasks([]);
        }
    }, [modal.type]);

    const close = () => setModal({ type: null, payload: null });

    // onSave handlers
    const handleGoalCreate = async (goalData) => {
        try {
            // Dynamically import goalService so it can be code-split from
            // the main bundle when GoalForm is only used on demand.
            const { createGoal } = await import("../../services/goalService");
            const res = await createGoal(goalData);
            addToast({ title: 'Goal created', variant: 'success' });
            close();
            // Broadcast event so pages can refresh if needed
            window.dispatchEvent(new CustomEvent('goal-created', { detail: res }));
        } catch (err) {
            addToast({ title: 'Failed to create goal', description: String(err?.message || err), variant: 'error' });
            throw err;
        }
    };

    const handleCalendarSave = (result, activeType) => {
        addToast({ title: activeType === 'activity' ? 'Activity added to calendar' : 'Task added to calendar', variant: 'success' });
        close();
        window.dispatchEvent(new CustomEvent('calendar-item-created', { detail: { result, type: activeType } }));
    };

    // Handle Don't Forget composer submissions from the global modal
    // NOTE: DontForgetComposer handling removed here; DontForget page now
    // manages its own composer and listens for events. Keep other modal
    // handlers below.

    return (
        <>
            {/* Lightweight accessible fallback used while lazy-loaded modals load */}
            {/**
             * Accessible loading fallback: role=status with polite live region so
             * screen readers announce the loading state when a modal is requested.
             */}
            {/* Fallback element reused below via inline JSX */}
            
            {/* Task modal */}
            {modal.type === 'task' && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-6">Loading…</div>}>
                    <CreateTaskModal
                        isOpen={true}
                        onCancel={close}
                        onClose={close}
                        onSave={async (payload) => {
                            try {
                                const taskService = await getTaskService();
                                const created = await taskService.create(payload);
                                addToast({ title: 'Task created', variant: 'success' });
                                close();
                                window.dispatchEvent(new CustomEvent('task-created', { detail: created }));
                            } catch (err) {
                                addToast({ title: 'Failed to create task', description: String(err?.message || err), variant: 'error' });
                                throw err;
                            }
                        }}
                        renderInline={false}
                    />
                </Suspense>
            )}

            {/* Activity modal */}
            {modal.type === 'activity' && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-6">Loading…</div>}>
                    <CreateActivityModal
                        isOpen={true}
                        onCancel={close}
                        renderInline={false}
                        keyAreas={keyAreas}
                        tasks={tasks}
                        initialData={modal.payload || {}}
                        onSave={async (payload) => {
                            try {
                                const mod = await import('../../services/activityService');
                                const svc = mod?.default || mod;
                                
                                // Build a clean payload with only defined values
                                const toSend = {};
                                
                                // Required fields
                                toSend.text = (payload.text || payload.title || '').trim();
                                
                                // Optional fields (only include if defined and non-empty)
                                if (payload.taskId || payload.task_id) {
                                    toSend.taskId = payload.taskId || payload.task_id;
                                }
                                if (payload.keyAreaId || payload.key_area_id) {
                                    toSend.keyAreaId = payload.keyAreaId || payload.key_area_id;
                                }
                                if (payload.priority) {
                                    toSend.priority = payload.priority;
                                }
                                if (payload.startDate || payload.date_start) {
                                    toSend.startDate = payload.startDate || payload.date_start;
                                }
                                if (payload.endDate || payload.date_end) {
                                    toSend.endDate = payload.endDate || payload.date_end;
                                }
                                if (payload.deadline || payload.dueDate) {
                                    toSend.deadline = payload.deadline || payload.dueDate;
                                }
                                if (payload.goalId || payload.goal_id) {
                                    toSend.goalId = payload.goalId || payload.goal_id;
                                }
                                if (payload.listIndex || payload.list_index) {
                                    toSend.listIndex = payload.listIndex || payload.list_index;
                                }
                                if (payload.assignee) {
                                    toSend.assignee = payload.assignee;
                                }
                                if (payload.delegatedToUserId) {
                                    toSend.delegatedToUserId = payload.delegatedToUserId;
                                }
                                if (payload.duration) {
                                    toSend.duration = payload.duration;
                                }
                                if (typeof payload.completed === 'boolean') {
                                    toSend.completed = payload.completed;
                                }
                                
                                const res = await svc.create(toSend);
                                addToast({ title: 'Activity created', variant: 'success' });
                                close();
                                window.dispatchEvent(new CustomEvent('activity-created', { detail: res }));
                            } catch (err) {
                                addToast({ title: 'Failed to create activity', description: String(err?.message || err), variant: 'error' });
                                throw err;
                            }
                        }}
                    />
                </Suspense>
            )}

            {/* Appointment / Calendar modal */}
            {modal.type === 'appointment' && null}

            {/* Goal modal */}
            {modal.type === 'goal' && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-6">Loading…</div>}>
                    <GoalForm
                        onClose={close}
                        onGoalCreated={handleGoalCreate}
                        keyAreas={[]}
                    />
                </Suspense>
            )}

            {/* Don't Forget composer */}
                {/* Don't Forget composer removed; handled by DontForget page */}
        </>
    );
}
