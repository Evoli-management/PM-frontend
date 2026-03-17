import React from 'react';
import CreateTaskModal from './CreateTaskModal';
import KeyAreaModal from './KeyAreaModal';
import EditTaskModal from './EditTaskModal';
import BulkFieldPickerModal from '../shared/BulkFieldPickerModal';
import EditActivityModal from './EditActivityModal';
import CreateActivityFormModal from '../modals/CreateActivityFormModal';
import { normalizeActivity } from '../../utils/keyareasHelpers';

const buildEditActivityInitialData = ({
    editingActivityViaTaskModal,
    activitiesByTask,
    activityForm,
    allTasks,
}) => {
    try {
        const id = editingActivityViaTaskModal.id;
        const taskId = editingActivityViaTaskModal.taskId;
        let raw = null;
        if (taskId && activitiesByTask && activitiesByTask[String(taskId)]) {
            raw = activitiesByTask[String(taskId)].find((activity) => String(activity.id) === String(id));
        }
        const source = raw || activityForm || {};
        const norm = normalizeActivity(source || {});
        const parentTaskId = taskId
            ? String(taskId)
            : (
                norm.taskId || norm.task_id || norm.task
                    ? String(norm.taskId || norm.task_id || norm.task)
                    : null
            );
        const parent = parentTaskId
            ? ((allTasks || []).find((task) => String(task.id) === String(parentTaskId)) || null)
            : null;
        const resolvedKeyArea =
            norm.key_area_id ||
            norm.keyAreaId ||
            norm.keyArea ||
            (parent && (parent.key_area_id || parent.keyAreaId || parent.keyArea)) ||
            '';
        const resolvedList =
            norm.list ||
            norm.list_index ||
            norm.listIndex ||
            (parent && (parent.list || parent.list_index || parent.listIndex)) ||
            '';
        const resolvedAssignee =
            norm.assignee ||
            norm.responsible ||
            (parent && (parent.assignee || parent.responsible)) ||
            '';
        return {
            id: norm.id || norm.activityId || null,
            type: 'activity',
            taskId: norm.taskId || norm.task_id || norm.task || '',
            text: norm.text || norm.activity_name || '',
            title: norm.text || norm.activity_name || '',
            description: norm.description || norm.notes || norm.note || '',
            start_date: norm.start_date || norm.startDate || norm.date_start || '',
            startDate: norm.start_date || norm.startDate || norm.date_start || '',
            end_date: norm.end_date || norm.endDate || norm.date_end || '',
            endDate: norm.end_date || norm.endDate || norm.date_end || '',
            deadline: norm.deadline || norm.dueDate || norm.due_date || '',
            duration: norm.duration || norm.duration_minutes || '',
            key_area_id: resolvedKeyArea,
            list: resolvedList,
            list_index: resolvedList,
            assignee: resolvedAssignee,
            priority: norm.priority ?? norm.priority_level ?? undefined,
            goal: norm.goal || norm.goal_id || norm.goalId || undefined,
            completed: norm.completed || false,
        };
    } catch {
        return activityForm || {};
    }
};

export default function KeyAreasModalStack({
    addToast,
    activityForm,
    activitiesByTask,
    allTasks,
    availableListNumbers,
    currentUserId,
    editing,
    editingActivityId,
    editingActivityViaTaskModal,
    editingTaskId,
    goals,
    handleActivityModalSave,
    handleActivityPanelMassFieldSave,
    handleBulkFieldSave,
    handleSaveTask,
    isSavingActivity,
    keyAreas,
    listNames,
    onCreateTask,
    onHideActivityComposer,
    onHideEditActivityModal,
    onHideTaskComposer,
    onSaveKA,
    selectedKA,
    setActivityAttachTaskId,
    setEditing,
    setEditingActivityId,
    setEditingActivityViaTaskModal,
    setEditingTaskId,
    setMassEditField,
    setShowActivityMassFieldPicker,
    setShowForm,
    setShowMassFieldPicker,
    showActivityComposer,
    showActivityMassFieldPicker,
    showEditActivityModal,
    showForm,
    showMassFieldPicker,
    showTaskComposer,
    t,
    taskForm,
    users,
}) {
    const activityInitialData = editingActivityViaTaskModal
        ? buildEditActivityInitialData({
            editingActivityViaTaskModal,
            activitiesByTask,
            activityForm,
            allTasks,
        })
        : activityForm;

    return (
        <>
            {showEditActivityModal && editingActivityViaTaskModal && (
                <EditActivityModal
                    isOpen={true}
                    currentUserId={currentUserId}
                    initialData={activityInitialData}
                    keyAreas={keyAreas}
                    users={users}
                    goals={goals}
                    tasks={allTasks}
                    availableLists={availableListNumbers}
                    parentListNames={selectedKA ? listNames[selectedKA.id] : null}
                    onSave={async (payload) => {
                        await handleActivityModalSave(payload);
                        setEditingActivityViaTaskModal(null);
                        onHideEditActivityModal();
                    }}
                    onCancel={() => {
                        onHideEditActivityModal();
                        setEditingActivityViaTaskModal(null);
                    }}
                    isSaving={isSavingActivity}
                />
            )}

            {showTaskComposer && (
                <>
                    {editingTaskId ? (
                        <EditTaskModal
                            isOpen={true}
                            initialData={{ ...(taskForm || {}), id: editingTaskId || taskForm?.id || null }}
                            onSave={async (payload) => {
                                const originalTask = allTasks.find((task) => task.id === (editingTaskId || payload.id));
                                await handleSaveTask(payload);

                                const keyAreaChanged = originalTask &&
                                    String(originalTask.key_area_id || originalTask.keyAreaId) !==
                                    String(payload.key_area_id || payload.keyAreaId);
                                const listChanged = originalTask &&
                                    String(originalTask.list_index || originalTask.list) !==
                                    String(payload.list_index || payload.list);

                                setEditingTaskId(null);
                                onHideTaskComposer();

                                if (keyAreaChanged) {
                                    try {
                                        addToast && addToast({ type: 'success', message: t('keyAreas.toastMovedKeyArea') });
                                    } catch {}
                                } else if (listChanged) {
                                    try {
                                        addToast && addToast({ type: 'success', message: t('keyAreas.toastMovedList') });
                                    } catch {}
                                }
                            }}
                            onCancel={() => {
                                onHideTaskComposer();
                                setEditingTaskId(null);
                            }}
                            isSaving={false}
                            users={users}
                            currentUserId={currentUserId}
                            keyAreas={keyAreas}
                            goals={goals}
                            availableLists={[1]}
                        />
                    ) : editingActivityViaTaskModal ? (
                        <EditActivityModal
                            isOpen={true}
                            initialData={activityInitialData}
                            keyAreas={keyAreas}
                            users={users}
                            goals={goals}
                            tasks={allTasks}
                            availableLists={availableListNumbers}
                            parentListNames={selectedKA ? listNames[selectedKA.id] : null}
                            onSave={async (payload) => {
                                await handleActivityModalSave(payload);
                                setEditingActivityViaTaskModal(null);
                                onHideEditActivityModal();
                            }}
                            onCancel={() => {
                                onHideEditActivityModal();
                                setEditingActivityViaTaskModal(null);
                            }}
                            isSaving={isSavingActivity}
                        />
                    ) : (
                        <CreateTaskModal
                            isOpen={true}
                            initialData={taskForm}
                            keyAreas={keyAreas}
                            users={users}
                            goals={goals}
                            availableLists={availableListNumbers}
                            parentListNames={selectedKA ? listNames[selectedKA.id] : null}
                            currentUserId={currentUserId}
                            onSave={async (payload) => {
                                await onCreateTask(payload);
                                setEditingTaskId(null);
                                onHideTaskComposer();
                                setEditingActivityViaTaskModal(null);
                            }}
                            onCancel={() => {
                                onHideTaskComposer();
                                setEditingTaskId(null);
                                setEditingActivityViaTaskModal(null);
                            }}
                            isSaving={false}
                        />
                    )}
                </>
            )}

            {showActivityComposer && (
                <CreateActivityFormModal
                    isOpen={showActivityComposer}
                    currentUserId={currentUserId}
                    initialData={activityForm}
                    onSave={handleActivityModalSave}
                    onCancel={() => {
                        onHideActivityComposer();
                        setEditingActivityId(null);
                        setActivityAttachTaskId(null);
                    }}
                    isSaving={isSavingActivity}
                    keyAreas={keyAreas}
                    users={users}
                    goals={goals}
                    tasks={allTasks}
                    availableLists={availableListNumbers}
                />
            )}

            <BulkFieldPickerModal
                isOpen={showMassFieldPicker}
                title="Select field"
                fields={[
                    { value: 'assignee', label: 'Responsible' },
                    { value: 'status', label: 'Status' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'goalId', label: 'Goal' },
                    { value: 'duration', label: 'Duration' },
                    { value: 'key_area_bundle', label: 'Key Area' },
                    { value: 'date', label: 'Date' },
                ]}
                users={users}
                keyAreas={keyAreas}
                goals={goals}
                availableLists={availableListNumbers}
                listNamesByKeyArea={listNames}
                onCancel={() => {
                    setShowMassFieldPicker(false);
                    setMassEditField(null);
                }}
                onSave={handleBulkFieldSave}
            />

            <BulkFieldPickerModal
                isOpen={showActivityMassFieldPicker}
                title="Select field"
                fields={[
                    { value: 'assignee', label: 'Responsible' },
                    { value: 'status', label: 'Status' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'goalId', label: 'Goal' },
                    { value: 'duration', label: 'Duration' },
                    { value: 'date', label: 'Date' },
                ]}
                users={users}
                goals={goals}
                onCancel={() => setShowActivityMassFieldPicker(false)}
                onSave={handleActivityPanelMassFieldSave}
            />

            <KeyAreaModal
                isOpen={showForm}
                editing={editing}
                onSave={onSaveKA}
                onCancel={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
            />
        </>
    );
}
