import React, { useEffect, useState, Suspense } from "react";
// Lazy-load modal components to reduce initial bundle size
const CreateTaskModal = React.lazy(() => import("../modals/CreateTaskModal.jsx"));
const CalendarCreateModal = React.lazy(() => import("../modals/CalendarCreateModal.jsx"));
const CreateActivityModal = React.lazy(() => import("../modals/CreateActivityModal.jsx"));
const GoalForm = React.lazy(() => import("../goals/GoalForm.jsx"));
const DontForgetComposer = React.lazy(() => import("../tasks/DontForgetComposer.jsx"));
import taskService from "../../services/taskService";
import { createGoal } from "../../services/goalService";
import { useToast } from "./ToastProvider.jsx";

export default function ModalManager() {
    const [modal, setModal] = useState({ type: null, payload: null });
    const { addToast } = useToast();

    useEffect(() => {
        const handler = (e) => {
            const type = e?.detail?.type || e?.detail;
            setModal({ type, payload: e?.detail || null });
        };
        window.addEventListener('open-create-modal', handler);
        return () => window.removeEventListener('open-create-modal', handler);
    }, []);

    const close = () => setModal({ type: null, payload: null });

    // onSave handlers
    const handleGoalCreate = async (goalData) => {
        try {
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
    const handleDontForgetAdd = async (payload) => {
        try {
            // Map UI values to backend enums where applicable (same mapping used by Tasks.jsx)
            const statusMap = {
                open: "todo",
                "in progress": "in_progress",
                done: "completed",
                cancelled: "cancelled",
            };
            const mappedStatus = payload?.status ? statusMap[payload.status] : undefined;
            const mappedPriority = payload?.priority === "normal" ? "medium" : payload?.priority;

            const body = {
                title: (payload?.name || payload?.title || "").trim(),
                description: payload?.notes || "",
                assignee: payload?.assignee || "",
                startDate: payload?.start_date ? new Date(payload.start_date).toISOString() : undefined,
                endDate: payload?.end_date ? new Date(payload.end_date).toISOString() : undefined,
                dueDate: payload?.dueDate ? new Date(payload.dueDate).toISOString() : undefined,
                duration: payload?.duration ? String(payload.duration) : undefined,
                ...(mappedStatus ? { status: mappedStatus } : {}),
                ...(mappedPriority ? { priority: mappedPriority } : {}),
            };
            if (payload?.keyAreaId) body.keyAreaId = payload.keyAreaId;

            const created = await taskService.create(body);
            addToast({ title: 'Task added to Don\'t Forget', variant: 'success' });
            close();
            // Broadcast so tasks page can refresh if open
            window.dispatchEvent(new CustomEvent('dontforget-created', { detail: created }));
            // Also emit generic task-created
            window.dispatchEvent(new CustomEvent('task-created', { detail: created }));
        } catch (err) {
            addToast({ title: 'Failed to add task', description: String(err?.message || err), variant: 'error' });
            throw err;
        }
    };

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
                        onClose={close}
                        onSave={(res) => { addToast({ title: 'Task created', variant: 'success' }); close(); window.dispatchEvent(new CustomEvent('task-created', { detail: res })); }}
                        renderInline={false}
                    />
                </Suspense>
            )}

            {/* Activity modal */}
            {modal.type === 'activity' && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-6">Loading…</div>}>
                    <CreateActivityModal
                        isOpen={true}
                        onClose={close}
                        onSave={(res) => { addToast({ title: 'Activity created', variant: 'success' }); close(); window.dispatchEvent(new CustomEvent('activity-created', { detail: res })); }}
                        renderInline={false}
                    />
                </Suspense>
            )}

            {/* Appointment / Calendar modal */}
            {modal.type === 'appointment' && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-6">Loading…</div>}>
                    <CalendarCreateModal
                        isOpen={true}
                        onClose={close}
                        onSave={handleCalendarSave}
                        defaultType={'task'}
                        initialData={{}}
                        preselectedKeyArea={null}
                    />
                </Suspense>
            )}

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
            {modal.type === 'dontforget' && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-6">Loading…</div>}>
                    <DontForgetComposer
                        open={true}
                        onClose={close}
                        onAdd={handleDontForgetAdd}
                        defaultList={1}
                    />
                </Suspense>
            )}
        </>
    );
}
