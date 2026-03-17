import { useEffect } from 'react';

export default function useKeyAreasComposerSync({
    activityForm,
    setActivityAttachTaskId,
    setActivityForm,
    setEditingActivityViaTaskModal,
    setEditingTaskId,
    setShowActivityComposer,
    setShowTaskComposer,
    setTaskForm,
    setTaskTab,
    showActivityComposer,
    showTaskComposer,
    taskForm,
    taskTab,
}) {
    useEffect(() => {
        if (showTaskComposer) {
            const nextTab = Number(taskForm?.list_index || 1);
            if (taskTab !== nextTab) setTaskTab(nextTab);
        }
    }, [setTaskTab, showTaskComposer, taskForm?.list_index, taskTab]);

    useEffect(() => {
        if (showTaskComposer) {
            setTaskForm((state) => ({ ...state, list_index: taskTab }));
        }
    }, [setTaskForm, showTaskComposer, taskTab]);

    useEffect(() => {
        if (!showTaskComposer) return;

        setTaskForm((state) => {
            const start = state.start_date || '';
            if (state._endAuto || !state.end_date) {
                return { ...state, end_date: start };
            }
            return state;
        });
    }, [setTaskForm, showTaskComposer, taskForm.start_date]);

    useEffect(() => {
        if (!showActivityComposer) return;

        setActivityForm((state) => {
            const start = state.start_date || '';
            if (state._endAuto || !state.end_date) {
                return { ...state, end_date: start };
            }
            return state;
        });
    }, [activityForm.start_date, setActivityForm, showActivityComposer]);

    useEffect(() => {
        if (!showTaskComposer) return undefined;

        const onKey = (event) => {
            if (event.key === 'Escape') {
                setShowTaskComposer(false);
                setEditingTaskId(null);
                setEditingActivityViaTaskModal(null);
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [
        setEditingActivityViaTaskModal,
        setEditingTaskId,
        setShowTaskComposer,
        showTaskComposer,
    ]);

    useEffect(() => {
        if (!showActivityComposer) return undefined;

        const onKey = (event) => {
            if (event.key === 'Escape') {
                setShowActivityComposer(false);
                setActivityAttachTaskId(null);
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [setActivityAttachTaskId, setShowActivityComposer, showActivityComposer]);
}
