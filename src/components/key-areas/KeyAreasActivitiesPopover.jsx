import React from 'react';
import EmptyState from '../goals/EmptyState.jsx';

export default function KeyAreasActivitiesPopover({
    activitiesByTask,
    activitiesMenuPos,
    allTasks,
    openActivitiesMenu,
    setOpenActivitiesMenu,
    setSelectedTaskFull,
    setTaskFullInitialTab,
}) {
    if (!openActivitiesMenu) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActivitiesMenu(null)} />
            <div
                className="fixed z-50 w-72 bg-white border border-slate-200 rounded-lg shadow"
                style={{ top: `${activitiesMenuPos.top}px`, left: `${activitiesMenuPos.left}px` }}
                role="dialog"
                aria-label="Task activities"
            >
                <div className="px-3 py-2 border-b text-sm font-semibold text-slate-900">
                    Activities
                </div>
                <div className="max-h-60 overflow-auto">
                    {(() => {
                        const list = activitiesByTask[String(openActivitiesMenu)] || [];
                        if (!list.length) {
                            return (
                                <div className="px-3 py-3">
                                    <EmptyState title="No activities for this task yet." />
                                </div>
                            );
                        }
                        return (
                            <ul className="py-1">
                                {list.map((activity) => (
                                    <li
                                        key={activity.id}
                                        className="px-3 py-2 text-sm text-slate-800 border-b last:border-b-0"
                                    >
                                        <div className="truncate">{activity.text}</div>
                                    </li>
                                ))}
                            </ul>
                        );
                    })()}
                </div>
                <div className="px-3 py-2 border-t flex items-center gap-2">
                    <button
                        type="button"
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        onClick={() => {
                            const task = allTasks.find(
                                (item) => String(item.id) === String(openActivitiesMenu),
                            );
                            if (task) {
                                setTaskFullInitialTab('activities');
                                setSelectedTaskFull(task);
                            }
                            setOpenActivitiesMenu(null);
                        }}
                    >
                        Open
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                        onClick={() => setOpenActivitiesMenu(null)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
}
