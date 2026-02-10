import React, { useState, useMemo } from 'react';
import TripleViewLayout from './TripleViewLayout';
import TaskListPanel from './TaskListPanel';
import ActivityListPanel from './ActivityListPanel';

/**
 * KeyAreasTripleView Component
 * 
 * Integrates the triple-view layout for Key Areas, managing:
 * - Left panel: Task list display and selection
 * - Right panel: Activity list for selected task
 * - Divider: Resizable split between panels
 */
export default function KeyAreasTripleView({
    selectedKA,
    allTasks = [],
    selectedTaskInPanel,
    setSelectedTaskInPanel,
    taskListContent,
    activityListContent,
    onAddTask,
    tasksLoading = false,
}) {
    const [taskPanelWidth, setTaskPanelWidth] = useState('50%');

    return (
        <div className="mb-4" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
            <TripleViewLayout
                taskListContent={
                    <TaskListPanel
                        selectedKA={selectedKA}
                        onAddTask={onAddTask}
                        tasksLoading={tasksLoading}
                        header={
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    {selectedKA?.title || 'Tasks'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {allTasks.length} task{allTasks.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        }
                    >
                        {taskListContent}
                    </TaskListPanel>
                }
                activityListContent={
                    <ActivityListPanel
                        selectedTask={selectedTaskInPanel}
                        onTaskDeselect={() => setSelectedTaskInPanel(null)}
                        header={
                            selectedTaskInPanel && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                                        {selectedTaskInPanel.title || 'Untitled Task'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Activities
                                    </p>
                                </div>
                            )
                        }
                    >
                        {activityListContent}
                    </ActivityListPanel>
                }
                selectedTask={selectedTaskInPanel}
                onTaskSelect={setSelectedTaskInPanel}
                defaultTaskWidth="50%"
            />
        </div>
    );
}
