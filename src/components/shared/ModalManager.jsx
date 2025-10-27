import React, { useEffect, useState } from "react";
import CreateTaskModal from "../modals/CreateTaskModal.jsx";
import CalendarCreateModal from "../modals/CalendarCreateModal.jsx";
import CreateActivityModal from "../modals/CreateActivityModal.jsx";
import GoalForm from "../goals/GoalForm.jsx";
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

    return (
        <>
            {/* Task modal */}
            {modal.type === 'task' && (
                <CreateTaskModal
                    isOpen={true}
                    onClose={close}
                    onSave={(res) => { addToast({ title: 'Task created', variant: 'success' }); close(); window.dispatchEvent(new CustomEvent('task-created', { detail: res })); }}
                    renderInline={false}
                />
            )}

            {/* Activity modal */}
            {modal.type === 'activity' && (
                <CreateActivityModal
                    isOpen={true}
                    onClose={close}
                    onSave={(res) => { addToast({ title: 'Activity created', variant: 'success' }); close(); window.dispatchEvent(new CustomEvent('activity-created', { detail: res })); }}
                    renderInline={false}
                />
            )}

            {/* Appointment / Calendar modal */}
            {modal.type === 'appointment' && (
                <CalendarCreateModal
                    isOpen={true}
                    onClose={close}
                    onSave={handleCalendarSave}
                    defaultType={'task'}
                    initialData={{}}
                    preselectedKeyArea={null}
                />
            )}

            {/* Goal modal */}
            {modal.type === 'goal' && (
                <GoalForm
                    onClose={close}
                    onGoalCreated={handleGoalCreate}
                    keyAreas={[]}
                />
            )}
        </>
    );
}
