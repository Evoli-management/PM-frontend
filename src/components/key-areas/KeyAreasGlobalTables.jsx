import React from 'react';
import UnifiedTaskActivityTable from './UnifiedTaskActivityTable';
import api from '../../features/key-areas/api/keyAreasPageApi.js';
import {
    normalizeActivityWithTask,
    normalizeTaskForUi,
    mergeTaskUpdateForUi,
} from '../../features/key-areas/adapters/taskActivityAdapters.js';
import { normalizeActivity } from '../../utils/keyareasHelpers';

let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import('../../services/taskService');
    _taskService = mod.default || mod;
    return _taskService;
};

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

export default function KeyAreasGlobalTables({
    acceptedDelegatedActivities,
    acceptedDelegatedTasks,
    activitiesByTask,
    allTasks,
    currentUserId,
    delegatedActivities,
    delegatedTasks,
    getDelegationStatus,
    goals,
    handleBulkFieldSave,
    keyAreas,
    openUnifiedActivityDetails,
    openUnifiedTaskDetails,
    pendingDelegations,
    refreshDelegatedData,
    selectedKA,
    selectedTaskFull,
    setActivitiesByTask,
    setAllTasks,
    setDelegatedTasks,
    setSelectedTaskFull,
    setTaskFullInitialTab,
    users,
    viewTab,
    editUnifiedActivity,
    editUnifiedTask,
}) {
    if (viewTab === 'delegated') {
        return (
            <div
                className="flex-1 h-[calc(100vh-200px)] min-h-0 overflow-hidden flex flex-col gap-4"
                style={{ display: selectedTaskFull ? 'none' : undefined }}
            >
                <div
                    className={`min-h-[180px] overflow-hidden flex flex-col ${pendingDelegations.length > 0 ? 'flex-1' : 'flex-none'}`}
                    style={pendingDelegations.length > 0 ? undefined : { flexBasis: '180px' }}
                >
                    <UnifiedTaskActivityTable
                        viewTab={viewTab}
                        title="Pending Delegations"
                        delegatedSection="pending"
                        tasks={delegatedTasks.filter((item) => {
                            const status = getDelegationStatus(item);
                            return !status || status === 'pending';
                        })}
                        activities={delegatedActivities.filter((item) => {
                            const status = getDelegationStatus(item);
                            return !status || status === 'pending';
                        })}
                        keyAreas={keyAreas}
                        users={users}
                        goals={goals}
                        currentUserId={currentUserId}
                        hideSearch={true}
                        delegationActionsEnabled={true}
                        onDelegationRefresh={refreshDelegatedData}
                        onTaskClick={(task) => {
                            setSelectedTaskFull(task);
                            setTaskFullInitialTab('details');
                        }}
                        onActivityClick={(activity) => {
                            const task = delegatedTasks.find((item) => String(item.id) === String(activity.taskId || activity.task_id));
                            if (task) {
                                setSelectedTaskFull(task);
                                setTaskFullInitialTab('details');
                            }
                        }}
                        onTaskUpdate={async (id, updatedTask) => {
                            const previousTask = delegatedTasks.find((task) => String(task.id) === String(id));
                            if (previousTask) {
                                setDelegatedTasks((prev) =>
                                    prev.map((task) =>
                                        String(task.id) === String(id)
                                            ? mergeTaskUpdateForUi(task, updatedTask)
                                            : task,
                                    ),
                                );
                            }
                            try {
                                await api.updateTask(id, updatedTask);
                                await refreshDelegatedData();
                            } catch (error) {
                                console.error('Failed to update task:', error);
                                await refreshDelegatedData();
                            }
                        }}
                        onTaskDelete={async (id) => {
                            try {
                                await api.deleteTask(id);
                                await refreshDelegatedData();
                            } catch (error) {
                                console.error('Failed to delete task:', error);
                            }
                        }}
                        onActivityUpdate={async (id, updatedActivity) => {
                            try {
                                const activityService = await getActivityService();
                                await activityService.update(id, updatedActivity);
                                await refreshDelegatedData();
                            } catch (error) {
                                console.error('Failed to update activity:', error);
                            }
                        }}
                        onActivityDelete={async (id) => {
                            try {
                                const activityService = await getActivityService();
                                await activityService.remove(id);
                                await refreshDelegatedData();
                            } catch (error) {
                                console.error('Failed to delete activity:', error);
                            }
                        }}
                    />
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <UnifiedTaskActivityTable
                            viewTab={viewTab}
                            title="Accepted Delegations"
                            delegatedSection="accepted"
                            tasks={acceptedDelegatedTasks}
                            activities={acceptedDelegatedActivities}
                            keyAreas={keyAreas}
                            users={users}
                            goals={goals}
                            currentUserId={currentUserId}
                            hideSearch={true}
                            onDelegationRefresh={refreshDelegatedData}
                            onTaskClick={(task) => {
                                setSelectedTaskFull(task);
                                setTaskFullInitialTab('details');
                            }}
                            onActivityClick={(activity) => {
                                const task = delegatedTasks.find((item) => String(item.id) === String(activity.taskId || activity.task_id));
                                if (task) {
                                    setSelectedTaskFull(task);
                                    setTaskFullInitialTab('details');
                                }
                            }}
                            onTaskUpdate={async (id, updatedTask) => {
                                const previousTask = delegatedTasks.find((task) => String(task.id) === String(id));
                                if (previousTask) {
                                    setDelegatedTasks((prev) =>
                                        prev.map((task) =>
                                            String(task.id) === String(id)
                                                ? mergeTaskUpdateForUi(task, updatedTask)
                                                : task,
                                        ),
                                    );
                                }
                                try {
                                    await api.updateTask(id, updatedTask);
                                    await refreshDelegatedData();
                                } catch (error) {
                                    console.error('Failed to update task:', error);
                                    await refreshDelegatedData();
                                }
                            }}
                            onTaskDelete={async (id) => {
                                try {
                                    await api.deleteTask(id);
                                    await refreshDelegatedData();
                                } catch (error) {
                                    console.error('Failed to delete task:', error);
                                }
                            }}
                            onActivityUpdate={async (id, updatedActivity) => {
                                try {
                                    const activityService = await getActivityService();
                                    await activityService.update(id, updatedActivity);
                                    await refreshDelegatedData();
                                } catch (error) {
                                    console.error('Failed to update activity:', error);
                                }
                            }}
                            onActivityDelete={async (id) => {
                                try {
                                    const activityService = await getActivityService();
                                    await activityService.remove(id);
                                    await refreshDelegatedData();
                                } catch (error) {
                                    console.error('Failed to delete activity:', error);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (viewTab === 'todo' || viewTab === 'activity-trap') {
        return (
            <div
                className="flex-1 h-[calc(100vh-200px)] min-h-0 overflow-hidden flex flex-col"
                style={{ display: selectedTaskFull ? 'none' : undefined }}
            >
                <div className="flex-1 min-h-0">
                    <UnifiedTaskActivityTable
                        viewTab={viewTab}
                        tasks={allTasks}
                        activities={Object.values(activitiesByTask).flat()}
                        keyAreas={keyAreas}
                        users={users}
                        goals={goals}
                        currentUserId={currentUserId}
                        onTaskClick={openUnifiedTaskDetails}
                        onActivityClick={openUnifiedActivityDetails}
                        onTaskEdit={editUnifiedTask}
                        onActivityEdit={editUnifiedActivity}
                        onTaskUpdate={async (id, updatedTask) => {
                            const previousTask = allTasks.find((task) => String(task.id) === String(id));
                            if (previousTask) {
                                setAllTasks((prev) =>
                                    prev.map((task) =>
                                        String(task.id) === String(id)
                                            ? mergeTaskUpdateForUi(task, updatedTask)
                                            : task,
                                    ),
                                );
                                setSelectedTaskFull((prevTask) =>
                                    prevTask && String(prevTask.id) === String(id)
                                        ? mergeTaskUpdateForUi(prevTask, updatedTask)
                                        : prevTask,
                                );
                            }
                            try {
                                if (updatedTask.delegatedToUserId) {
                                    await api.updateTask(id, updatedTask);
                                    if (viewTab === 'todo') {
                                        const svc = await getTaskService();
                                        const allUserTasks = await svc.list({});
                                        setAllTasks(
                                            Array.isArray(allUserTasks)
                                                ? allUserTasks.map((task) => normalizeTaskForUi(task))
                                                : [],
                                        );
                                    } else if (viewTab === 'activity-trap') {
                                        const svc = await getTaskService();
                                        const trapTasks = await svc.list({ withoutGoal: true });
                                        setAllTasks(
                                            Array.isArray(trapTasks)
                                                ? trapTasks.map((task) => normalizeTaskForUi(task))
                                                : [],
                                        );
                                    } else if (selectedKA) {
                                        const rows = await api.listTasks(selectedKA.id);
                                        setAllTasks(rows || []);
                                    }
                                } else {
                                    const result = await api.updateTask(id, updatedTask);
                                    const normalizedResult = normalizeTaskForUi(
                                        result,
                                        updatedTask?.key_area_id || updatedTask?.keyAreaId || null,
                                    );
                                    setAllTasks((prev) =>
                                        prev.map((task) =>
                                            String(task.id) === String(id) ? normalizedResult : task,
                                        ),
                                    );
                                }
                            } catch (error) {
                                console.error('Failed to update task:', error);
                                if (previousTask) {
                                    setAllTasks((prev) =>
                                        prev.map((task) =>
                                            String(task.id) === String(id) ? previousTask : task,
                                        ),
                                    );
                                    setSelectedTaskFull((prevTask) =>
                                        prevTask && String(prevTask.id) === String(id)
                                            ? previousTask
                                            : prevTask,
                                    );
                                }
                            }
                        }}
                        onTaskDelete={async (id) => {
                            try {
                                await api.deleteTask(id);
                                setAllTasks((prev) =>
                                    prev.filter((task) => String(task.id) !== String(id)),
                                );
                                setActivitiesByTask((prev) => {
                                    const updated = { ...prev };
                                    delete updated[String(id)];
                                    return updated;
                                });
                            } catch (error) {
                                console.error('Failed to delete task:', error);
                            }
                        }}
                        onActivityUpdate={async (id, updatedActivity) => {
                            try {
                                const activityService = await getActivityService();
                                const result = await activityService.update(id, updatedActivity);
                                const normalizedResult = normalizeActivity(result || {});
                                setActivitiesByTask((prev) => {
                                    const updated = { ...prev };
                                    for (const key of Object.keys(updated)) {
                                        updated[key] = updated[key].map((activity) =>
                                            String(activity.id) === String(id)
                                                ? normalizeActivityWithTask(
                                                    normalizedResult,
                                                    allTasks.find(
                                                        (task) =>
                                                            String(task.id) ===
                                                            String(
                                                                normalizedResult.taskId ||
                                                                normalizedResult.task_id ||
                                                                activity.taskId ||
                                                                activity.task_id,
                                                            ),
                                                    ) || activity,
                                                )
                                                : activity,
                                        );
                                    }
                                    return updated;
                                });
                            } catch (error) {
                                console.error('Failed to update activity:', error);
                            }
                        }}
                        onActivityDelete={async (id) => {
                            try {
                                const activityService = await getActivityService();
                                await activityService.remove(id);
                                setActivitiesByTask((prev) => {
                                    const updated = { ...prev };
                                    for (const key of Object.keys(updated)) {
                                        updated[key] = updated[key].filter(
                                            (activity) => String(activity.id) !== String(id),
                                        );
                                    }
                                    return updated;
                                });
                            } catch (error) {
                                console.error('Failed to delete activity:', error);
                            }
                        }}
                        onMassEdit={async (selected) => {
                            const taskIds = Array.isArray(selected?.taskIds)
                                ? selected.taskIds.map((id) => String(id))
                                : [];
                            const activityIds = Array.isArray(selected?.activityIds)
                                ? selected.activityIds.map((id) => String(id))
                                : [];
                            if ((taskIds.length === 0 && activityIds.length === 0) || !selected?.field) return;
                            await handleBulkFieldSave(
                                selected.field,
                                selected.value,
                                taskIds,
                                activityIds,
                            );
                        }}
                    />
                </div>
            </div>
        );
    }

    return null;
}
