import React from 'react';
import TaskFullView from './TaskFullView';
import { toDateOnly } from '../../utils/keyareasHelpers';

function buildTaskFormState(task, selectedKA) {
    return {
        id: task.id || task.taskId || task.task_id || task._id || null,
        title: task.title || task.name || '',
        description: task.description || '',
        list_index: task.list_index || task.listIndex || 1,
        goal_id: task.goal_id || '',
        start_date: toDateOnly(task.start_date) || toDateOnly(task.startDate) || '',
        deadline: toDateOnly(task.deadline) || toDateOnly(task.dueDate) || '',
        end_date: toDateOnly(task.end_date) || toDateOnly(task.endDate) || '',
        status: task.status || 'open',
        priority: (() => {
            const value = String(task.priority || 'normal').toLowerCase();
            if (value === 'low' || value === '1') return 1;
            if (value === 'high' || value === '3') return 3;
            return 2;
        })(),
        tags: task.tags || '',
        assignee: task.assignee || '',
        key_area_id: selectedKA?.id || task.key_area_id || task.keyAreaId || null,
        list: '',
        finish_date: '',
        duration: task.duration || '',
        _endAuto: false,
    };
}

export default function KeyAreasTaskFullSection({
    allTasks,
    activitiesByTask,
    availableListNumbers,
    currentUserId,
    goals,
    handleDeleteTask,
    handleSaveTask,
    keyAreas,
    listNames,
    locationSearch,
    savingActivityIds,
    selectedKA,
    selectedTaskFull,
    setActivitiesByTask,
    setEditingTaskId,
    setSavingActivityIds,
    setSelectedTaskFull,
    setShowTaskComposer,
    setTaskForm,
    taskFullInitialTab,
    users,
}) {
    if (!selectedTaskFull) return null;

    const selectedTaskKeyArea =
        selectedKA || keyAreas.find((item) => String(item.id) === String(selectedTaskFull.key_area_id));

    return (
        <div className="mb-4">
            <TaskFullView
                task={selectedTaskFull}
                goals={goals}
                kaTitle={selectedTaskKeyArea?.title}
                listNames={listNames}
                kaId={selectedTaskKeyArea?.id || selectedTaskFull.key_area_id}
                listNumbers={availableListNumbers}
                selectedKA={selectedTaskKeyArea}
                users={users}
                currentUserId={currentUserId}
                allTasks={allTasks}
                savingActivityIds={savingActivityIds}
                setSavingActivityIds={setSavingActivityIds}
                readOnly={
                    Boolean(selectedTaskKeyArea?.is_default) &&
                    String(selectedTaskKeyArea?.title || '').toLowerCase() !== 'ideas'
                }
                onBack={() => setSelectedTaskFull(null)}
                onSave={async (payload) => {
                    const originalTask = allTasks.find((item) => item.id === payload.id);
                    await handleSaveTask(payload);
                    const updated = allTasks.find((item) => item.id === payload.id) || payload;
                    const keyAreaChanged =
                        originalTask &&
                        String(originalTask.key_area_id || originalTask.keyAreaId) !==
                            String(payload.key_area_id || payload.keyAreaId);

                    if (!keyAreaChanged) {
                        setSelectedTaskFull(updated);
                    }
                }}
                onDelete={async (task) => {
                    await handleDeleteTask(task);
                    setSelectedTaskFull(null);
                }}
                onRequestEdit={async (task) => {
                    setTaskForm(buildTaskFormState(task, selectedKA));
                    setEditingTaskId(task.id);
                    setShowTaskComposer(true);
                }}
                activitiesByTask={activitiesByTask}
                onUpdateActivities={(id, nextList) => {
                    setActivitiesByTask((prev) => ({ ...prev, [id]: nextList }));
                }}
                initialTab={taskFullInitialTab}
                initialActivityId={(() => {
                    const params = new URLSearchParams(locationSearch);
                    const taskParam = params.get('task');
                    const activityParam = params.get('activity');
                    if (!activityParam || !selectedTaskFull?.id) return null;
                    return String(taskParam || '') === String(selectedTaskFull.id) ? activityParam : null;
                })()}
            />
        </div>
    );
}
