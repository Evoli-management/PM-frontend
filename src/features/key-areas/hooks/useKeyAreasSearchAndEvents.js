import { useEffect, useState } from 'react';

export default function useKeyAreasSearchAndEvents({
    activitiesByTask,
    allTasks,
    api,
    getActivityService,
    getPriorityLevel,
    selectedKA,
    setActivitiesByTask,
    setAllTasks,
    toDateOnly,
}) {
    const [siteSearch, setSiteSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const query = String(siteSearch || '').trim();
        let cancelled = false;
        let timer = null;

        if (query.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return () => {};
        }

        setIsSearching(true);
        timer = window.setTimeout(async () => {
            try {
                const keyAreas = await api.listKeyAreas();
                const taskLists = await Promise.all((keyAreas || []).map((keyArea) => api.listTasks(keyArea.id)));
                const combinedTasks = (taskLists || [])
                    .flat()
                    .map((task) => ({
                        ...task,
                        key_area_id: task.key_area_id || task.keyAreaId || task.key_area,
                    }));
                const normalizedQuery = query.toLowerCase();
                const filtered = combinedTasks.filter((task) => {
                    const title = (task.title || task.name || '').toLowerCase();
                    const description = (task.description || task.notes || '').toLowerCase();
                    return title.includes(normalizedQuery) || description.includes(normalizedQuery);
                });

                if (!cancelled) setSearchResults(filtered);
            } catch {
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [api, siteSearch]);

    useEffect(() => {
        const handler = async (event) => {
            const detail = event?.detail || {};
            const taskId = detail.taskId;
            const activity = detail.activity;
            if (!taskId || !activity) return;

            const parent = allTasks.find((task) => String(task.id) === String(taskId));
            if (!parent) return;

            const keyAreaId = parent.key_area_id || selectedKA?.id;
            if (!keyAreaId) return;

            const taskKey = String(taskId);
            const currentList = (activitiesByTask[taskKey] || []).slice();
            const currentItem = currentList.find((item) => String(item.id) === String(activity.id));
            if (currentItem?.created_task_id) return;

            const level = getPriorityLevel(activity.priority ?? parent.priority ?? 'med');
            const priority = level === 3 ? 'high' : level === 1 ? 'low' : 'med';
            const payload = {
                key_area_id: keyAreaId,
                title: (activity.text || activity.activity_name || '').trim() || 'Untitled activity',
                description:
                    (activity.notes || activity.text || '').trim() ||
                    `Created from activity in task "${parent.title || ''}"`,
                status: 'open',
                priority,
                category: parent.category || 'Key Areas',
                goal_id: parent.goal_id || '',
                list_index: parent.list_index || 1,
                start_date: toDateOnly(activity.date_start) || parent.start_date || '',
                deadline: toDateOnly(activity.deadline) || parent.deadline || '',
                end_date: toDateOnly(activity.date_end) || '',
                tags: parent.tags || '',
                recurrence: '',
                attachments: '',
                assignee: activity.responsible || parent.assignee || '',
            };

            try {
                const created = await api.createTask(payload);
                setAllTasks((prev) => [...prev, created]);

                setActivitiesByTask((prev) => {
                    const nextList = (prev[taskKey] || []).map((item) =>
                        String(item.id) === String(activity.id)
                            ? { ...item, created_task_id: created.id, created_task_at: Date.now() }
                            : item,
                    );
                    return { ...prev, [taskKey]: nextList };
                });

                const shouldRemove = typeof detail.remove === 'boolean'
                    ? detail.remove
                    : window.confirm('Task created. Do you want to remove the original activity (convert)?');

                if (shouldRemove) {
                    try {
                        const activityService = await getActivityService();
                        await activityService.remove(activity.id);
                    } catch (error) {
                        console.error('Failed to remove activity after convert', error);
                    }

                    setActivitiesByTask((prev) => {
                        const nextList = (prev[taskKey] || []).filter(
                            (item) => String(item.id) !== String(activity.id),
                        );
                        return { ...prev, [taskKey]: nextList };
                    });

                    window.dispatchEvent(new CustomEvent('ka-activities-updated', {
                        detail: { refresh: true, taskId },
                    }));
                } else {
                    setActivitiesByTask((prev) => {
                        const nextList = (prev[taskKey] || []).map((item) =>
                            String(item.id) === String(activity.id)
                                ? { ...item, created_task_id: created.id, created_task_at: Date.now() }
                                : item,
                        );
                        return { ...prev, [taskKey]: nextList };
                    });
                }
            } catch (error) {
                console.error('Failed creating task from activity', error);
            }
        };

        window.addEventListener('ka-create-task-from-activity', handler);
        return () => window.removeEventListener('ka-create-task-from-activity', handler);
    }, [
        activitiesByTask,
        allTasks,
        api,
        getActivityService,
        getPriorityLevel,
        selectedKA,
        setActivitiesByTask,
        setAllTasks,
        toDateOnly,
    ]);

    return {
        isSearching,
        searchResults,
        setSiteSearch,
        siteSearch,
    };
}
