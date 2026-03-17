import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getItemStatusFilterValue } from '../../../utils/keyareasHelpers';
import { parseDurationToMinutes } from '../../../utils/duration';
import {
    DEFAULT_TASK_STATUS_FILTER_VALUES,
    TASK_STATUS_FILTER_VALUES,
    getInitialTaskStatusFilterValues,
    hasScheduledTaskDates,
    isTaskCompleted,
} from '../adapters/taskActivityAdapters.js';

const DEFAULT_VISIBLE_COLUMNS = {
    responsible: true,
    status: true,
    priority: true,
    quadrant: true,
    start_date: true,
    end_date: true,
    deadline: true,
    duration: true,
    completed: true,
};

export default function useKeyAreasTaskViewModel({
    activeFilter,
    allTasks,
    currentUserId,
    getPriorityLevel,
    goalTitleMap,
    goalsLength,
    initialActiveFilter,
    quadrant,
    searchResults,
    searchTerm,
    selectedKA,
    siteSearch,
    t,
    taskTab,
    users,
    viewTab,
}) {
    const prevActiveFilterRef = useRef(initialActiveFilter);
    const [sortBy, setSortBy] = useState('manual');
    const [taskSortField, setTaskSortField] = useState(() => {
        try {
            return window.localStorage.getItem('keyareas.taskSortField') || null;
        } catch (_) {}
        return null;
    });
    const [taskSortDirection, setTaskSortDirection] = useState(() => {
        try {
            return window.localStorage.getItem('keyareas.taskSortDirection') || null;
        } catch (_) {}
        return null;
    });
    const [activitySortField, setActivitySortField] = useState(() => {
        try {
            return window.localStorage.getItem('keyareas.activitySortField') || null;
        } catch (_) {}
        return null;
    });
    const [activitySortDirection, setActivitySortDirection] = useState(() => {
        try {
            return window.localStorage.getItem('keyareas.activitySortDirection') || null;
        } catch (_) {}
        return null;
    });
    const [filterStatuses, setFilterStatuses] = useState(() => getInitialTaskStatusFilterValues(initialActiveFilter));
    const [filterAssignee, setFilterAssignee] = useState('');
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const raw = window.localStorage.getItem('keyareas.visibleColumns');
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...DEFAULT_VISIBLE_COLUMNS, ...parsed };
            }
        } catch (_) {}
        return DEFAULT_VISIBLE_COLUMNS;
    });

    useEffect(() => {
        const prev = prevActiveFilterRef.current;
        if (prev === activeFilter) return;

        if (activeFilter === 'all') {
            setFilterStatuses(TASK_STATUS_FILTER_VALUES);
        } else if (activeFilter === 'completed') {
            setFilterStatuses(['completed']);
        } else if (
            activeFilter === 'active' &&
            (
                prev === 'completed' ||
                filterStatuses.length === 0 ||
                (filterStatuses.length === 1 && filterStatuses[0] === 'completed')
            )
        ) {
            setFilterStatuses(DEFAULT_TASK_STATUS_FILTER_VALUES);
        }

        prevActiveFilterRef.current = activeFilter;
    }, [activeFilter, filterStatuses]);

    useEffect(() => {
        try {
            window.localStorage.setItem('keyareas.visibleColumns', JSON.stringify(visibleColumns));
        } catch (_) {}
    }, [visibleColumns]);

    useEffect(() => {
        try {
            if (taskSortField) window.localStorage.setItem('keyareas.taskSortField', taskSortField);
            else window.localStorage.removeItem('keyareas.taskSortField');
        } catch (_) {}
    }, [taskSortField]);

    useEffect(() => {
        try {
            if (taskSortDirection) window.localStorage.setItem('keyareas.taskSortDirection', taskSortDirection);
            else window.localStorage.removeItem('keyareas.taskSortDirection');
        } catch (_) {}
    }, [taskSortDirection]);

    useEffect(() => {
        try {
            if (activitySortField) window.localStorage.setItem('keyareas.activitySortField', activitySortField);
            else window.localStorage.removeItem('keyareas.activitySortField');
        } catch (_) {}
    }, [activitySortField]);

    useEffect(() => {
        try {
            if (activitySortDirection) window.localStorage.setItem('keyareas.activitySortDirection', activitySortDirection);
            else window.localStorage.removeItem('keyareas.activitySortDirection');
        } catch (_) {}
    }, [activitySortDirection]);

    const visibleTasks = useMemo(() => {
        const isSearch = String(siteSearch || '').trim().length >= 2;
        let tasks = isSearch
            ? (searchResults || [])
            : allTasks.filter((task) => {
                if (selectedKA && String(task.key_area_id || task.keyAreaId) !== String(selectedKA.id)) {
                    return false;
                }
                return (task.list_index || 1) === taskTab;
            });

        if (viewTab === 'active-tasks') {
            if (activeFilter === 'completed') {
                tasks = tasks.filter((task) => isTaskCompleted(task));
            } else if (activeFilter === 'active') {
                tasks = tasks.filter((task) => !isTaskCompleted(task) && hasScheduledTaskDates(task));
            }
        }

        if (!isSearch && searchTerm.trim()) {
            const query = searchTerm.trim().toLowerCase();
            tasks = tasks.filter(
                (task) =>
                    (task.title || '').toLowerCase().includes(query) ||
                    (task.description || '').toLowerCase().includes(query),
            );
        }

        const allStatusesSelected =
            TASK_STATUS_FILTER_VALUES.length === filterStatuses.length &&
            TASK_STATUS_FILTER_VALUES.every((status) => filterStatuses.includes(status));

        if (!allStatusesSelected) {
            tasks = tasks.filter((task) => {
                const normalizedStatus = isTaskCompleted(task)
                    ? 'completed'
                    : getItemStatusFilterValue(task);
                return filterStatuses.includes(normalizedStatus);
            });
        }

        if (filterAssignee) {
            const selectedRaw = String(filterAssignee || '').trim();
            const selectedLower = selectedRaw.toLowerCase();
            const selectedUser = (users || []).find((user) => String(user?.id) === selectedRaw);
            const emailRx = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

            const selectedAliases = new Set([selectedLower]);
            if (selectedUser) {
                if (selectedUser?.name) selectedAliases.add(String(selectedUser.name).toLowerCase().trim());
                if (selectedUser?.email) selectedAliases.add(String(selectedUser.email).toLowerCase().trim());
                selectedAliases.add(String(selectedUser.id).toLowerCase().trim());
                if (currentUserId && String(selectedUser.id) === String(currentUserId)) {
                    selectedAliases.add('me');
                }
            } else if (currentUserId && String(currentUserId) === selectedRaw) {
                selectedAliases.add('me');
            }

            tasks = tasks.filter((task) => {
                const raw = String(task.assignee || task.responsible || task.owner || task.assigned_to || '').trim();
                if (!raw) return false;

                const rawLower = raw.toLowerCase();
                if (selectedAliases.has(rawLower)) return true;

                const rawEmail = (rawLower.match(emailRx) || [null])[0];
                if (rawEmail && selectedAliases.has(rawEmail)) return true;

                for (const alias of selectedAliases) {
                    if (!alias) continue;
                    if (rawLower.includes(alias) || alias.includes(rawLower)) return true;
                }
                return false;
            });
        }

        if (quadrant !== 'all') {
            tasks = tasks.filter((task) => String(task.eisenhower_quadrant || '') === quadrant);
        }

        return tasks;
    }, [
        activeFilter,
        allTasks,
        currentUserId,
        filterAssignee,
        filterStatuses,
        quadrant,
        searchResults,
        searchTerm,
        selectedKA,
        siteSearch,
        taskTab,
        users,
        viewTab,
    ]);

    const statusFilterOptions = useMemo(() => ([
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: t('keyAreas.statusInProgress') },
        { value: 'completed', label: t('keyAreas.completed') },
    ]), [t]);

    const allStatusesSelected =
        TASK_STATUS_FILTER_VALUES.length === filterStatuses.length &&
        TASK_STATUS_FILTER_VALUES.every((status) => filterStatuses.includes(status));

    const statusFilterLabel = allStatusesSelected
        ? 'All'
        : filterStatuses.length === 0
            ? 'None'
            : filterStatuses.length === 1
                ? statusFilterOptions.find((option) => option.value === filterStatuses[0])?.label || filterStatuses[0]
                : `${filterStatuses.length} selected`;

    const toggleStatusFilter = useCallback((value) => {
        if (value === 'all') {
            setFilterStatuses((prev) =>
                prev.length === TASK_STATUS_FILTER_VALUES.length ? [] : TASK_STATUS_FILTER_VALUES,
            );
            return;
        }

        setFilterStatuses((prev) => {
            const exists = prev.includes(value);
            if (exists) return prev.filter((status) => status !== value);
            return [...prev, value];
        });
    }, []);

    const handleTaskSort = useCallback((field) => {
        if (taskSortField === field) {
            if (taskSortDirection === 'asc') {
                setTaskSortDirection('desc');
            } else if (taskSortDirection === 'desc') {
                setTaskSortField(null);
                setTaskSortDirection(null);
            }
        } else {
            setTaskSortField(field);
            setTaskSortDirection('asc');
        }
    }, [taskSortDirection, taskSortField]);

    const handleActivitySort = useCallback((field) => {
        if (activitySortField === field) {
            if (activitySortDirection === 'asc') {
                setActivitySortDirection('desc');
            } else if (activitySortDirection === 'desc') {
                setActivitySortField(null);
                setActivitySortDirection(null);
            }
        } else {
            setActivitySortField(field);
            setActivitySortDirection('asc');
        }
    }, [activitySortDirection, activitySortField]);

    const sortedTasks = useMemo(() => {
        const tasks = Array.isArray(visibleTasks) ? visibleTasks.slice() : [];

        if (taskSortField && taskSortDirection) {
            tasks.sort((a, b) => {
                let aVal;
                let bVal;

                switch (taskSortField) {
                    case 'title':
                        aVal = (a.title || a.name || '').toLowerCase();
                        bVal = (b.title || b.name || '').toLowerCase();
                        break;
                    case 'responsible':
                        aVal = (a.assignee || a.responsible || '').toLowerCase();
                        bVal = (b.assignee || b.responsible || '').toLowerCase();
                        break;
                    case 'status':
                        aVal = (a.status || '').toLowerCase();
                        bVal = (b.status || '').toLowerCase();
                        break;
                    case 'priority':
                        aVal = getPriorityLevel(a.priority);
                        bVal = getPriorityLevel(b.priority);
                        break;
                    case 'quadrant':
                        aVal = a.quadrant || 4;
                        bVal = b.quadrant || 4;
                        break;
                    case 'start_date':
                        aVal = a.start_date || a.startDate || '';
                        bVal = b.start_date || b.startDate || '';
                        break;
                    case 'end_date':
                        aVal = a.end_date || a.endDate || '';
                        bVal = b.end_date || b.endDate || '';
                        break;
                    case 'deadline':
                        aVal = a.deadline || a.due_date || a.dueDate || '';
                        bVal = b.deadline || b.due_date || b.dueDate || '';
                        break;
                    case 'duration':
                        aVal = parseDurationToMinutes(a.duration ?? a.duration_minutes) ?? 0;
                        bVal = parseDurationToMinutes(b.duration ?? b.duration_minutes) ?? 0;
                        break;
                    case 'completed':
                        aVal = a.completionDate || a.completion_date || '';
                        bVal = b.completionDate || b.completion_date || '';
                        break;
                    default:
                        return 0;
                }

                if (!aVal && !bVal) return 0;
                if (!aVal) return 1;
                if (!bVal) return -1;

                let comparison = 0;
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    comparison = aVal.localeCompare(bVal);
                } else {
                    comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                }

                return taskSortDirection === 'asc' ? comparison : -comparison;
            });
        } else {
            switch (sortBy) {
                case 'date':
                    tasks.sort((a, b) => {
                        const aDate = a.deadline || a.due_date || a.dueDate || a.end_date || null;
                        const bDate = b.deadline || b.due_date || b.dueDate || b.end_date || null;
                        if (!aDate && !bDate) return 0;
                        if (!aDate) return 1;
                        if (!bDate) return -1;
                        return new Date(aDate).getTime() - new Date(bDate).getTime();
                    });
                    break;
                case 'priority':
                    tasks.sort((a, b) => getPriorityLevel(b.priority) - getPriorityLevel(a.priority));
                    break;
                case 'status': {
                    const order = { open: 0, in_progress: 1, done: 2, completed: 2, cancelled: 3, blocked: 3 };
                    tasks.sort(
                        (a, b) =>
                            (order[String(a.status || '').toLowerCase()] ?? 99) -
                            (order[String(b.status || '').toLowerCase()] ?? 99),
                    );
                    break;
                }
                default:
                    break;
            }
        }

        return tasks;
    }, [getPriorityLevel, sortBy, taskSortDirection, taskSortField, visibleTasks]);

    const visibleTasksWithResolvedGoal = useMemo(() => {
        try {
            return (visibleTasks || []).map((task) => {
                const existing = task.resolvedGoalTitle || null;
                if (existing) return { ...task, resolvedGoalTitle: existing };

                const goalId = task.goal_id ?? task.goalId ?? (task.goal && (task.goal.id || task.goal.goal_id)) ?? null;
                if (goalId === null || goalId === undefined) return { ...task, resolvedGoalTitle: null };

                let resolved = null;
                try {
                    if (goalTitleMap && typeof goalTitleMap.get === 'function') {
                        resolved = goalTitleMap.get(String(goalId)) || null;
                    } else if (goalTitleMap) {
                        resolved = goalTitleMap[String(goalId)] || null;
                    }
                } catch (_) {
                    resolved = null;
                }

                return { ...task, resolvedGoalTitle: resolved };
            });
        } catch (_) {
            return visibleTasks || [];
        }
    }, [goalTitleMap, visibleTasks]);

    useEffect(() => {
        try {
            const missing = (visibleTasksWithResolvedGoal || [])
                .filter((task) => {
                    const hasRef = !!(task.goal_id || task.goalId || (task.goal && (task.goal.id || task.goal.goal_id)));
                    return hasRef && !task.resolvedGoalTitle;
                })
                .slice(0, 10)
                .map((task) => ({
                    id: task.id,
                    title: task.title,
                    goalRef: task.goal_id || task.goalId || (task.goal && (task.goal.id || task.goal.goal_id)),
                }));

            if (missing.length) {
                console.info('KeyAreas: tasks with goal ref but missing resolved title', {
                    time: new Date().toISOString(),
                    count: missing.length,
                    sample: missing,
                });
            }
        } catch (_) {}
    }, [goalsLength, visibleTasksWithResolvedGoal]);

    return {
        activitySortDirection,
        activitySortField,
        allStatusesSelected,
        filterAssignee,
        filterStatuses,
        handleActivitySort,
        handleTaskSort,
        setFilterAssignee,
        setSortBy,
        setVisibleColumns,
        showTaskStatusFilterValues: TASK_STATUS_FILTER_VALUES,
        sortBy,
        sortedTasks,
        statusFilterLabel,
        statusFilterOptions,
        taskSortDirection,
        taskSortField,
        toggleStatusFilter,
        visibleColumns,
        visibleTasks,
        visibleTasksWithResolvedGoal,
    };
}
