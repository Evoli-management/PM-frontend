import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/shared/ToastProvider.jsx';
import { useFormattedDate } from '../hooks/useFormattedDate';
import Sidebar from '../components/shared/Sidebar';
import KeyAreasGlobalTables from '../components/key-areas/KeyAreasGlobalTables.jsx';
import KeyAreasHeaderBar from '../components/key-areas/KeyAreasHeaderBar.jsx';
import KeyAreasActivityPanel from '../components/key-areas/KeyAreasActivityPanel.jsx';
import ActivityRowMenu from '../components/key-areas/ActivityRowMenu.jsx';
import KeyAreasActivitiesPopover from '../components/key-areas/KeyAreasActivitiesPopover.jsx';
import KeyAreasLandingShell from '../components/key-areas/KeyAreasLandingShell.jsx';
import KeyAreasModalStack from '../components/key-areas/KeyAreasModalStack.jsx';
import KeyAreasTaskPanel from '../components/key-areas/KeyAreasTaskPanel.jsx';
import KeyAreasTaskFullSection from '../components/key-areas/KeyAreasTaskFullSection.jsx';
import ResizablePanels from '../components/key-areas/ResizablePanels';
import '../styles/triple-view.css';
import {
    safeParseDate,
    computeEisenhowerQuadrant,
    getPriorityLevel,
    toDateOnly,
    mapServerStatusToUi,
    normalizeActivity,
} from '../utils/keyareasHelpers';
import api from '../features/key-areas/api/keyAreasPageApi.js';
import useKeyAreasBootstrap from '../features/key-areas/hooks/useKeyAreasBootstrap.js';
import useKeyAreaLists from '../features/key-areas/hooks/useKeyAreaLists.js';
import useKeyAreasBulkActions from '../features/key-areas/hooks/useKeyAreasBulkActions.js';
import useKeyAreasComposer from '../features/key-areas/hooks/useKeyAreasComposer.js';
import useKeyAreasComposerSync from '../features/key-areas/hooks/useKeyAreasComposerSync.js';
import useKeyAreasCrud from '../features/key-areas/hooks/useKeyAreasCrud.js';
import useKeyAreasMenus from '../features/key-areas/hooks/useKeyAreasMenus.js';
import useKeyAreasMutations from '../features/key-areas/hooks/useKeyAreasMutations.js';
import useKeyAreasPageSync from '../features/key-areas/hooks/useKeyAreasPageSync.js';
import useKeyAreasSearchAndEvents from '../features/key-areas/hooks/useKeyAreasSearchAndEvents.js';
import useKeyAreasSelection from '../features/key-areas/hooks/useKeyAreasSelection.js';
import useKeyAreasTaskData from '../features/key-areas/hooks/useKeyAreasTaskData.js';
import useKeyAreasTaskViewModel from '../features/key-areas/hooks/useKeyAreasTaskViewModel.js';
import {
    normalizeActivityWithTask,
    normalizeTaskForUi,
    mergeTaskUpdateForUi,
} from '../features/key-areas/adapters/taskActivityAdapters.js';

// Lazy getters for services to allow code-splitting and avoid circular imports
let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import('../services/taskService');
    _taskService = mod.default || mod;
    return _taskService;
};

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import('../services/keyAreaService');
    _keyAreaService = mod.default || mod;
    return _keyAreaService;
};

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

let _calendarService = null;
const getCalendarService = async () => {
    if (_calendarService) return _calendarService;
    const mod = await import('../services/calendarService');
    _calendarService = mod.default || mod;
    return _calendarService;
};

/* Full page TaskFullView has been moved to src/components/key-areas/TaskFullView.jsx */

/* --------------------------------- Screen -------------------------------- */
export default function KeyAreas() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { formatDate } = useFormattedDate();
    const [filter, setFilter] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedKA, setSelectedKA] = useState(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const [taskTab, setTaskTab] = useState(1);
    // Main view tab: 'active-tasks' | 'delegated' | 'todo' | 'activity-trap' | 'my-focus'
    const params = new URLSearchParams(location.search || "");
    const allowedViews = new Set(['active-tasks', 'delegated', 'todo', 'activity-trap', 'my-focus']);
    const initialViewTab = (() => {
        const viewParam = params.get('view');
        if (viewParam && allowedViews.has(viewParam)) return viewParam;
        return 'active-tasks';
    })();
    const initialActiveFilter = (() => {
        const activeParam = params.get('active');
        if (activeParam === 'active' || activeParam === 'all' || activeParam === 'completed') return activeParam;
        return 'all';
    })();
    const pendingDirectOpen = params.get('openKA') === '1' || Boolean(params.get('ka'));
    const [viewTab, setViewTab] = useState(initialViewTab);
    // Sub-filter for ACTIVE TASKS view:
    // 'active' => not completed and has scheduled dates,
    // 'all' => all tasks regardless of dates or completion state,
    // 'completed' => completed tasks only.
    const [activeFilter, setActiveFilter] = useState(initialActiveFilter);
    const isGlobalTasksView = viewTab === 'delegated' || viewTab === 'todo' || viewTab === 'activity-trap';
    const { refreshTick } = useKeyAreasPageSync({
        activeFilter,
        getCalendarService,
        location,
        navigate,
        setActiveFilter,
        setViewTab,
        viewTab,
    });
    // Handler: change a task's status (UI value: open | in_progress | done)
    const handleTaskStatusChange = async (id, uiStatus) => {
        // optimistic update: set status locally (completionDate will be reconciled from server)
        setAllTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: uiStatus } : t)),
        );

        try {
            // Send request to update the status
            await api.updateTask(id, { status: uiStatus });
            // Fetch canonical server state for this task so UI reflects server-side completionDate and status
            const taskService = await getTaskService();
            const server = await taskService.get(id);
                if (server) {
                const normalized = {
                    ...server,
                    // Normalize server status to UI values (open|in_progress|done)
                    status: mapServerStatusToUi(server.status),
                    completionDate: server.completionDate || server.completion_date || null,
                    due_date: server.dueDate || server.due_date || null,
                    start_date: server.startDate || server.start_date || null,
                    end_date: server.endDate || server.end_date || null,
                    assignee: server.assignee ?? null,
                    duration: server.duration ?? null,
                    key_area_id: server.keyAreaId || server.key_area_id || selectedKA?.id,
                };
                setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)));
                setSelectedTaskFull((prev) => (prev && prev.id === id ? { ...prev, ...normalized } : prev));
                return;
            }
        } catch (err) {
            console.error("Failed to update task status", err);
            // revert optimistic change by fetching the task list from backend if possible
                try {
                const taskService = await getTaskService();
                const rows = await taskService.list({ keyAreaId: selectedKA?.id });
                const server = (Array.isArray(rows) ? rows : []).find((r) => r.id === id);
                if (server) {
                    const normalized = {
                        ...server,
                        status: mapServerStatusToUi(server.status),
                        completionDate: server.completionDate || server.completion_date || null,
                    };
                    setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)));
                } else {
                    // If server doesn't return the task, clear optimistic completionDate and revert status
                    setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "open", completionDate: null } : t)));
                }
            } catch (e) {
                // If we can't refresh, at least revert the optimistic status to open and clear completionDate
                setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "open", completionDate: null } : t)));
            }
        }
    };
    const [searchTerm, setSearchTerm] = useState("");
    const [quadrant, setQuadrant] = useState("all");
    const [selectedTask, setSelectedTask] = useState(null);
    const [slideOverInitialTab, setSlideOverInitialTab] = useState("details");
    // Full page task view state
    const [selectedTaskFull, setSelectedTaskFull] = useState(null);
    const [taskFullInitialTab, setTaskFullInitialTab] = useState("activities");
    // Triple view left panel selected task
    const [selectedTaskInPanel, setSelectedTaskInPanel] = useState(null);
    const [selectedActivityCountInPanel, setSelectedActivityCountInPanel] = useState(0);
    const [selectedActivityIdsInPanel, setSelectedActivityIdsInPanel] = useState(new Set());
    const [showActivityMassFieldPicker, setShowActivityMassFieldPicker] = useState(false);
    const [panelTargetActivityId, setPanelTargetActivityId] = useState(null);
    const {
        allTasks,
        setAllTasks,
        delegatedTasks,
        setDelegatedTasks,
        delegatedActivities,
        setDelegatedActivities,
        pendingDelegationsLoading,
        activitiesByTask,
        setActivitiesByTask,
        refreshDelegatedData,
        refreshActivitiesForTask,
    } = useKeyAreasTaskData({
        viewTab,
        selectedKA,
        selectedTaskFullId: selectedTaskFull?.id,
        refreshTick,
    });
    const {
        isSearching,
        searchResults,
        setSiteSearch,
        siteSearch,
    } = useKeyAreasSearchAndEvents({
        activitiesByTask,
        allTasks,
        api,
        getActivityService,
        getPriorityLevel,
        selectedKA,
        setActivitiesByTask,
        setAllTasks,
        toDateOnly,
    });

    const resolveTaskForUnifiedActivity = useCallback(async (activity) => {
        const normalizedActivity = normalizeActivity(activity || {});
        const candidateTaskId =
            normalizedActivity?.taskId ||
            normalizedActivity?.task_id ||
            activity?.taskId ||
            activity?.task_id ||
            activity?.task?.id ||
            activity?.task?.task_id ||
            null;

        if (!candidateTaskId) return null;

        const existingTask = (allTasks || []).find((task) => String(task.id) === String(candidateTaskId));
        if (existingTask) return existingTask;

        try {
            const taskService = await getTaskService();
            const fetchedTask = await taskService.get(String(candidateTaskId));
            const normalizedTask = normalizeTaskForUi(
                fetchedTask,
                normalizedActivity?.key_area_id || selectedKA?.id || null,
            );
            return normalizedTask;
        } catch (error) {
            console.error('Failed to resolve parent task for activity', error);
            return null;
        }
    }, [allTasks, selectedKA]);

    const openUnifiedTaskDetails = useCallback((task) => {
        if (!task) return;
        setSelectedTaskFull(task);
        setTaskFullInitialTab("activities");
    }, []);

    const openUnifiedActivityDetails = useCallback(async (activity) => {
        const task = await resolveTaskForUnifiedActivity(activity);
        if (!task) return;
        setSelectedTaskFull(task);
        setTaskFullInitialTab("activities");
    }, [resolveTaskForUnifiedActivity]);

    const editUnifiedTask = useCallback((task) => {
        if (!task) return;

        setTaskForm({
            id: task.id || task.taskId || task.task_id || task._id || null,
            title: task.title || task.name || "",
            description: task.description || "",
            list_index: task.list_index || task.listIndex || 1,
            goal_id: task.goal_id || task.goalId || "",
            start_date: toDateOnly(task.start_date) || toDateOnly(task.startDate) || "",
            deadline: toDateOnly(task.deadline) || toDateOnly(task.dueDate) || "",
            end_date: toDateOnly(task.end_date) || toDateOnly(task.endDate) || "",
            status: task.status || "open",
            priority: (function (p) {
                const s = String(p || "normal").toLowerCase();
                if (s === "low" || s === "1") return 1;
                if (s === "high" || s === "3") return 3;
                return 2;
            })(task.priority),
            tags: task.tags || "",
            assignee: task.assignee || "",
            key_area_id: task.key_area_id || task.keyAreaId || selectedKA?.id || null,
            list: "",
            finish_date: "",
            duration: task.duration || "",
            _endAuto: false,
        });
        setEditingTaskId(task.id || task.taskId || task.task_id || task._id || null);
        setEditingActivityViaTaskModal(null);
        setShowEditActivityModal(false);
        setShowActivityComposer(false);
        setShowTaskComposer(true);
    }, [selectedKA]);

    const editUnifiedActivity = useCallback(async (activity) => {
        if (!activity) return;
        const normalizedActivity = normalizeActivity(activity || {});
        const task = await resolveTaskForUnifiedActivity(normalizedActivity);
        const taskId =
            task?.id ||
            normalizedActivity?.taskId ||
            normalizedActivity?.task_id ||
            activity?.taskId ||
            activity?.task_id ||
            null;

        setActivityAttachTaskId(taskId ? String(taskId) : null);

        setTaskForm({
            id: normalizedActivity.id || null,
            title: normalizedActivity.text || "",
            description: normalizedActivity.description || normalizedActivity.notes || "",
            list_index: normalizedActivity.list || normalizedActivity.list_index || 1,
            goal_id: normalizedActivity.goal || normalizedActivity.goalId || normalizedActivity.goal_id || "",
            start_date: toDateOnly(normalizedActivity.start_date) || "",
            deadline: toDateOnly(normalizedActivity.deadline) || "",
            end_date: toDateOnly(normalizedActivity.end_date) || "",
            status: normalizedActivity.completed ? "done" : "open",
            priority: (function (p) {
                const s = String(p || "normal").toLowerCase();
                if (s === "low" || s === "1") return 1;
                if (s === "high" || s === "3") return 3;
                return 2;
            })(normalizedActivity.priority),
            tags: "",
            assignee: normalizedActivity.assignee || normalizedActivity.responsible || "",
            key_area_id: normalizedActivity.key_area_id || selectedKA?.id || null,
            list: normalizedActivity.list || "",
            finish_date: toDateOnly(normalizedActivity.completionDate) || "",
            duration: normalizedActivity.duration || "",
            _endAuto: false,
        });

        setActivityForm({
            title: normalizedActivity.text || "",
            description: normalizedActivity.description || normalizedActivity.notes || "",
            list: normalizedActivity.list || "",
            key_area_id: normalizedActivity.key_area_id || selectedKA?.id || null,
            assignee: normalizedActivity.assignee || normalizedActivity.responsible || "",
            priority: (function (p) {
                const s = String(p || "normal").toLowerCase();
                if (s === "low" || s === "1") return 1;
                if (s === "high" || s === "3") return 3;
                return 2;
            })(normalizedActivity.priority),
            goal: normalizedActivity.goal || "",
            start_date: toDateOnly(normalizedActivity.start_date) || "",
            end_date: toDateOnly(normalizedActivity.end_date) || "",
            deadline: toDateOnly(normalizedActivity.deadline) || "",
            finish_date: toDateOnly(normalizedActivity.completionDate) || "",
            duration: normalizedActivity.duration || "",
            _endAuto: false,
        });

        setEditingTaskId(null);
        setShowTaskComposer(false);
        setShowActivityComposer(false);
        setEditingActivityViaTaskModal({
            id: normalizedActivity.id || activity.id,
            taskId: taskId ? String(taskId) : null,
        });
        setShowEditActivityModal(true);
    }, [resolveTaskForUnifiedActivity, selectedKA]);

    const getDelegationStatus = useCallback(
        (item) => String(item?.delegationStatus || item?.delegation_status || '').toLowerCase(),
        [],
    );

    const pendingDelegations = useMemo(
        () => [
            ...delegatedTasks
                .filter((item) => {
                    const status = getDelegationStatus(item);
                    return !status || status === 'pending';
                })
                .map((item) => ({ ...item, type: 'task' })),
            ...delegatedActivities
                .filter((item) => {
                    const status = getDelegationStatus(item);
                    return !status || status === 'pending';
                })
                .map((item) => ({ ...item, type: 'activity' })),
        ],
        [delegatedActivities, delegatedTasks, getDelegationStatus],
    );

    const acceptedDelegatedTasks = useMemo(
        () => delegatedTasks.filter((item) => getDelegationStatus(item) === 'accepted'),
        [delegatedTasks, getDelegationStatus],
    );

    const acceptedDelegatedActivities = useMemo(
        () => delegatedActivities.filter((item) => getDelegationStatus(item) === 'accepted'),
        [delegatedActivities, getDelegationStatus],
    );
    const {
        activitiesMenuPos,
        columnsMenuRef,
        listMenuPos,
        openActivitiesMenu,
        openListMenu,
        panelViewMenuRef,
        panelViewMode,
        setActivitiesMenuPos,
        setOpenActivitiesMenu,
        setOpenListMenu,
        setListMenuPos,
        setPanelViewMode,
        setShowColumnsMenu,
        setShowPanelViewMenu,
        setShowStatusMenu,
        showColumnsMenu,
        showPanelViewMenu,
        showStatusMenu,
        statusMenuRef,
        tabsRef,
    } = useKeyAreasMenus();
    const prevViewTabRef = useRef(initialViewTab);
    useEffect(() => {
        if (panelViewMode === "simple") {
            setSelectedTaskInPanel(null);
        }
    }, [panelViewMode]);

    useEffect(() => {
        // Never keep a locally-open task row while on global tabs
        // (delegated / todo / activity-trap).
        if (isGlobalTasksView) {
            setSelectedTaskInPanel(null);
        }
    }, [isGlobalTasksView, viewTab]);

    useEffect(() => {
        // Keep inline task-open state only for Active Tasks view.
        if (viewTab !== "active-tasks") {
            setSelectedTaskInPanel(null);
        }
    }, [viewTab]);

    useEffect(() => {
        // When returning from global tabs to Active Tasks, force KA selection first.
        const prev = prevViewTabRef.current;
        const wasGlobal = prev === "delegated" || prev === "todo" || prev === "activity-trap";
        if (viewTab === "active-tasks" && wasGlobal) {
            setSelectedKA(null);
            setAllTasks([]);
        }
        prevViewTabRef.current = viewTab;
    }, [viewTab]);

    const [activityNameEditId, setActivityNameEditId] = useState(null);
    const [activityNameEditValue, setActivityNameEditValue] = useState('');
    const [activityDateEditId, setActivityDateEditId] = useState(null);
    const [activityDurationEdit, setActivityDurationEdit] = useState({ id: null, value: '' });
    const activityDateRefs = useRef({});
    const [showTaskHelp, setShowTaskHelp] = useState(false);
    // Toasts and saving state for activity updates
    const { addToast } = useToast ? useToast() : { addToast: () => {} };
    const {
        activityAttachTaskId,
        setActivityAttachTaskId,
        activityForm,
        setActivityForm,
        editingActivityId,
        setEditingActivityId,
        editingActivityViaTaskModal,
        setEditingActivityViaTaskModal,
        editingTaskId,
        setEditingTaskId,
        showActivityComposer,
        setShowActivityComposer,
        showEditActivityModal,
        setShowEditActivityModal,
        showTaskComposer,
        setShowTaskComposer,
        taskForm,
        setTaskForm,
    } = useKeyAreasComposer({
        selectedKA,
        allTasks,
        setAllTasks,
        setActivitiesByTask,
    });
    useKeyAreasComposerSync({
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
    });
    // Sidebar sort: Alphabetical A→Z, with "Ideas" (or system default) always last
    const sortForSidebar = React.useCallback((arr) => {
        const items = Array.isArray(arr) ? arr.slice() : [];

        const regularAreas = items.filter((item) => {
            const isIdeas = (item.title || '').trim().toLowerCase() === 'ideas' || !!item.is_default;
            return !isIdeas;
        });

        const ideasAreas = items.filter((item) => {
            const isIdeas = (item.title || '').trim().toLowerCase() === 'ideas' || !!item.is_default;
            return isIdeas;
        });

        const sortedRegular = regularAreas.sort((a, b) => (a.position || 0) - (b.position || 0));
        return [...sortedRegular, ...ideasAreas];
    }, []);
    const {
        loading,
        keyAreas,
        setKeyAreas,
        goals,
        users,
        currentUserId,
    } = useKeyAreasBootstrap({ sortForSidebar });

    // Build a stable lookup map from any possible goal id key to the goal title.
    // This avoids repeated array scans in TaskRow and makes lookups resilient
    // to different id field names returned by the backend (_id, id, goalId, goal_id).
    const goalTitleMap = React.useMemo(() => {
        const m = new Map();
        try {
            (goals || []).forEach((g) => {
                const title = g && (g.title || g.name || g.label);
                const ids = [g && g.id, g && g._id, g && g.goalId, g && g.goal_id];
                ids.forEach((id) => {
                    if (id !== undefined && id !== null) m.set(String(id), title || '');
                });
            });
        } catch (_) {}
        return m;
    }, [goals]);

    // If goals load after tasks, force a shallow update to allTasks so TaskRow re-renders
    // and can resolve titles via the freshly-populated goalTitleMap.
    useEffect(() => {
        try {
            if (goals && goals.length && allTasks && allTasks.length) {
                setAllTasks((prev) => (Array.isArray(prev) ? prev.slice() : prev));
            }
        } catch (_) {}
    }, [goals.length]);
    const {
        handleActivityModalSave,
        handleDeleteTask,
        handleSaveTask,
        isSavingActivity,
        saveActivityName,
        savingActivityIds,
        savingIds,
        setSavingActivityIds,
        updateActivityField,
        updateField,
    } = useKeyAreasMutations({
        t,
        addToast,
        users,
        currentUserId,
        selectedKA,
        allTasks,
        setAllTasks,
        activitiesByTask,
        setActivitiesByTask,
        setSelectedTask,
        setSelectedTaskFull,
        refreshActivitiesForTask,
        activityAttachTaskId,
        setActivityAttachTaskId,
        editingActivityViaTaskModal,
        setEditingActivityId,
        setShowActivityComposer,
    });

    // Expanded inline activities (tree mode) per task id
    const [expandedActivityRows, setExpandedActivityRows] = useState(new Set());
    const [editingActivity, setEditingActivity] = useState(null); // { taskId, id }
    const [openActivityDetails, setOpenActivityDetails] = useState(new Set()); // Set of activity ids for a given task row render
    const toggleActivitiesRow = (id) => {
        setExpandedActivityRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Activities associated to tasks: { [taskId]: Activity[] }
    const [activityName, setActivityName] = useState("");

    const openTaskInKeyAreaPanels = useCallback((task, { activityId = null } = {}) => {
        if (!task?.id) return;

        const resolvedListIndex = Number(task.list_index ?? task.listIndex ?? 1) || 1;
        const targetActivityId = activityId ? String(activityId) : null;

        setSelectedTaskFull(null);
        setTaskTab(resolvedListIndex);
        setSelectedTaskInPanel(task);
        setPanelTargetActivityId(targetActivityId);

        const existingActivities = activitiesByTask[String(task.id)];
        if (!Array.isArray(existingActivities)) {
            refreshActivitiesForTask(task.id).catch((error) => {
                console.error('Failed to preload activities for task panel open', error);
            });
        }
    }, [activitiesByTask]);

    const {
        openKA,
        showAllKeyAreas,
    } = useKeyAreasSelection({
        loading,
        keyAreas,
        setKeyAreas,
        location,
        navigate,
        selectedKA,
        setSelectedKA,
        allTasks,
        setAllTasks,
        viewTab,
        setViewTab,
        panelViewMode,
        selectedTaskFull,
        setSelectedTaskFull,
        selectedTaskInPanel,
        setSelectedTaskInPanel,
        setSelectedActivityIdsInPanel,
        setSelectedActivityCountInPanel,
        setActivitiesByTask,
        setTaskTab,
        setSearchTerm,
        setSiteSearch,
        setQuadrant,
        setShowTaskComposer,
        setEditingActivityViaTaskModal,
        setExpandedActivityRows,
        setOpenActivityDetails,
        setEditingActivity,
        setFilter,
        openTaskInKeyAreaPanels,
        setTaskFullInitialTab,
    });

    useEffect(() => {
        setSelectedActivityIdsInPanel(new Set());
        setSelectedActivityCountInPanel(0);
    }, [selectedTaskInPanel?.id]);

    useEffect(() => {
        if (!selectedTaskInPanel?.id || !panelTargetActivityId) return;

        const taskKey = String(selectedTaskInPanel.id);
        const list = Array.isArray(activitiesByTask[taskKey]) ? activitiesByTask[taskKey] : [];
        const hasTarget = list.some((activity) => String(activity.id) === String(panelTargetActivityId));
        if (!hasTarget) return;

        const selectorId = String(panelTargetActivityId).replace(/"/g, '\\"');
        const timer = window.setTimeout(() => {
            const row = document.querySelector(`[data-activity-row-id="${selectorId}"]`);
            if (row && typeof row.scrollIntoView === 'function') {
                row.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }, 80);

        const clearTimer = window.setTimeout(() => {
            setPanelTargetActivityId((prev) =>
                String(prev || '') === String(panelTargetActivityId) ? null : prev,
            );
        }, 2200);

        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(clearTimer);
        };
    }, [selectedTaskInPanel?.id, activitiesByTask, panelTargetActivityId]);

    useEffect(() => {
        setSelectedActivityCountInPanel(selectedActivityIdsInPanel.size);
    }, [selectedActivityIdsInPanel]);

    // storage picker removed

    const {
        canAdd,
        filteredKAs,
        showOnlyIdeas,
        ideaForShow,
        dragKAId,
        setDragKAId,
        onSaveKA,
        onDeleteKA,
        reorderByDrop,
    } = useKeyAreasCrud({
        keyAreas,
        setKeyAreas,
        location,
        filter,
        editing,
        setEditing,
        setShowForm,
        selectedKA,
        setSelectedKA,
        allTasks,
        setAllTasks,
        sortForSidebar,
    });
    const {
        availableListNumbers,
        deleteList,
        getListName,
        leftListCount,
        listNames,
        renameList,
        setListNames,
    } = useKeyAreaLists({
        allTasks,
        getKeyAreaService,
        keyAreas,
        selectedKA,
        setKeyAreas,
        setTaskTab,
        t,
        taskTab,
    });
    const {
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
        sortBy,
        sortedTasks,
        statusFilterLabel,
        statusFilterOptions,
        taskSortDirection,
        taskSortField,
        toggleStatusFilter,
        visibleColumns,
        visibleTasksWithResolvedGoal,
    } = useKeyAreasTaskViewModel({
        activeFilter,
        allTasks,
        currentUserId,
        getPriorityLevel,
        goalTitleMap,
        goalsLength: goals.length,
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
    });
    const {
        handleActivityPanelMassFieldSave,
        handleBulkFieldSave,
        handleTaskMassActionChange,
        isSelected,
        massEditField,
        selectedIds,
        selectAllVisible,
        setMassEditField,
        setShowMassFieldPicker,
        showMassEdit,
        showMassFieldPicker,
        tasksDisplayRef,
        toggleSelect,
    } = useKeyAreasBulkActions({
        activitiesByTask,
        allTasks,
        api,
        computeEisenhowerQuadrant,
        currentUserId,
        getActivityService,
        handleDeleteTask,
        normalizeActivityWithTask,
        selectedActivityIdsInPanel,
        selectedTaskInPanel,
        setActivitiesByTask,
        setAllTasks,
        setSelectedActivityIdsInPanel,
        setShowActivityMassFieldPicker,
        sortedTasks,
        updateActivityField,
        users,
    });

    return (
        <div className="h-[calc(100vh-72px)] bg-[#EDEDED] overflow-hidden">
            <div className="flex w-full h-full min-h-0">
                <Sidebar
                    user={{ name: "User" }}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <KeyAreasModalStack
                    addToast={addToast}
                    activityForm={activityForm}
                    activitiesByTask={activitiesByTask}
                    allTasks={allTasks}
                    availableListNumbers={availableListNumbers}
                    currentUserId={currentUserId}
                    editing={editing}
                    editingActivityId={editingActivityId}
                    editingActivityViaTaskModal={editingActivityViaTaskModal}
                    editingTaskId={editingTaskId}
                    goals={goals}
                    handleActivityModalSave={handleActivityModalSave}
                    handleActivityPanelMassFieldSave={handleActivityPanelMassFieldSave}
                    handleBulkFieldSave={handleBulkFieldSave}
                    handleSaveTask={handleSaveTask}
                    isSavingActivity={isSavingActivity}
                    keyAreas={keyAreas}
                    listNames={listNames}
                    onCreateTask={async (payload) => {
                        try {
                            const created = await api.createTask(payload);
                            setAllTasks((prev) => [...prev, created]);
                        } catch (err) {
                            console.error('Failed to create task from modal', err);
                        }
                    }}
                    onHideActivityComposer={() => setShowActivityComposer(false)}
                    onHideEditActivityModal={() => setShowEditActivityModal(false)}
                    onHideTaskComposer={() => setShowTaskComposer(false)}
                    onSaveKA={onSaveKA}
                    selectedKA={selectedKA}
                    setActivityAttachTaskId={setActivityAttachTaskId}
                    setEditing={setEditing}
                    setEditingActivityId={setEditingActivityId}
                    setEditingActivityViaTaskModal={setEditingActivityViaTaskModal}
                    setEditingTaskId={setEditingTaskId}
                    setMassEditField={setMassEditField}
                    setShowActivityMassFieldPicker={setShowActivityMassFieldPicker}
                    setShowForm={setShowForm}
                    setShowMassFieldPicker={setShowMassFieldPicker}
                    showActivityComposer={showActivityComposer}
                    showActivityMassFieldPicker={showActivityMassFieldPicker}
                    showEditActivityModal={showEditActivityModal}
                    showForm={showForm}
                    showMassFieldPicker={showMassFieldPicker}
                    showTaskComposer={showTaskComposer}
                    t={t}
                    taskForm={taskForm}
                    users={users}
                />
                <main className="flex-1 min-w-0 w-full h-full min-h-0 transition-all overflow-hidden">
                    <div className="flex-1 h-full min-h-0 max-w-full overflow-hidden px-1 md:px-2 pb-1 flex flex-col">
                        <div>
                            <KeyAreasHeaderBar
                                activeFilter={activeFilter}
                                setActiveFilter={setActiveFilter}
                                allStatusesSelected={allStatusesSelected}
                                canAdd={canAdd}
                                columnsMenuRef={columnsMenuRef}
                                filterAssignee={filterAssignee}
                                filterStatuses={filterStatuses}
                                getPriorityLevel={getPriorityLevel}
                                isGlobalTasksView={isGlobalTasksView}
                                pendingDelegationsCount={pendingDelegations.length}
                                panelViewMenuRef={panelViewMenuRef}
                                panelViewMode={panelViewMode}
                                selectedKA={selectedKA}
                                selectedTaskFull={selectedTaskFull}
                                selectedTaskInPanel={selectedTaskInPanel}
                                setEditing={setEditing}
                                setFilterAssignee={setFilterAssignee}
                                setMobileSidebarOpen={setMobileSidebarOpen}
                                setPanelViewMode={setPanelViewMode}
                                setSelectedTaskInPanel={setSelectedTaskInPanel}
                                setShowColumnsMenu={setShowColumnsMenu}
                                setShowForm={setShowForm}
                                setShowPanelViewMenu={setShowPanelViewMenu}
                                setShowStatusMenu={setShowStatusMenu}
                                setSortBy={setSortBy}
                                setViewTab={setViewTab}
                                showAllKeyAreas={showAllKeyAreas}
                                showColumnsMenu={showColumnsMenu}
                                showOnlyIdeas={showOnlyIdeas}
                                showPanelViewMenu={showPanelViewMenu}
                                showStatusMenu={showStatusMenu}
                                sortBy={sortBy}
                                statusFilterLabel={statusFilterLabel}
                                statusFilterOptions={statusFilterOptions}
                                statusMenuRef={statusMenuRef}
                                t={t}
                                toggleStatusFilter={toggleStatusFilter}
                                users={users}
                                viewTab={viewTab}
                                visibleColumns={visibleColumns}
                                setVisibleColumns={setVisibleColumns}
                                navigate={navigate}
                            />
                        </div>
                        <KeyAreasTaskFullSection
                            allTasks={allTasks}
                            activitiesByTask={activitiesByTask}
                            availableListNumbers={availableListNumbers}
                            currentUserId={currentUserId}
                            goals={goals}
                            handleDeleteTask={handleDeleteTask}
                            handleSaveTask={handleSaveTask}
                            keyAreas={keyAreas}
                            listNames={listNames}
                            locationSearch={location.search}
                            savingActivityIds={savingActivityIds}
                            selectedKA={selectedKA}
                            selectedTaskFull={selectedTaskFull}
                            setActivitiesByTask={setActivitiesByTask}
                            setEditingTaskId={setEditingTaskId}
                            setSavingActivityIds={setSavingActivityIds}
                            setSelectedTaskFull={setSelectedTaskFull}
                            setShowTaskComposer={setShowTaskComposer}
                            setTaskForm={setTaskForm}
                            taskFullInitialTab={taskFullInitialTab}
                            users={users}
                        />
                        {(selectedKA || viewTab === 'delegated' || viewTab === 'todo') && (viewTab !== 'delegated' && viewTab !== 'todo' && viewTab !== 'activity-trap') && (
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <ResizablePanels
                                    mode={panelViewMode}
                                    simpleActivePanel={panelViewMode === "simple" && selectedTaskInPanel ? "activity" : "task"}
                                    taskPanel={
                                        <KeyAreasTaskPanel
                                            activitiesByTask={activitiesByTask}
                                            addToast={addToast}
                                            allStatusesSelected={allStatusesSelected}
                                            currentUserId={currentUserId}
                                            deleteList={deleteList}
                                            expandedActivityRows={expandedActivityRows}
                                            filterStatuses={filterStatuses}
                                            getKeyAreaService={getKeyAreaService}
                                            getListName={getListName}
                                            getPriorityLevel={getPriorityLevel}
                                            goalTitleMap={goalTitleMap}
                                            goals={goals}
                                            handleDeleteTask={handleDeleteTask}
                                            handleTaskMassActionChange={handleTaskMassActionChange}
                                            handleTaskSort={handleTaskSort}
                                            handleTaskStatusChange={handleTaskStatusChange}
                                            isSelected={isSelected}
                                            leftListCount={leftListCount}
                                            listMenuPos={listMenuPos}
                                            listNames={listNames}
                                            openListMenu={openListMenu}
                                            panelViewMode={panelViewMode}
                                            renameList={renameList}
                                            savingActivityIds={savingActivityIds}
                                            savingIds={savingIds}
                                            selectAllVisible={selectAllVisible}
                                            selectedIds={selectedIds}
                                            selectedKA={selectedKA}
                                            setActivitiesByTask={setActivitiesByTask}
                                            setEditingTaskId={setEditingTaskId}
                                            setExpandedActivityRows={setExpandedActivityRows}
                                            setListMenuPos={setListMenuPos}
                                            setListNames={setListNames}
                                            setOpenListMenu={setOpenListMenu}
                                            setSelectedTaskFull={setSelectedTaskFull}
                                            setSelectedTaskInPanel={setSelectedTaskInPanel}
                                            setSavingActivityIds={setSavingActivityIds}
                                            setShowTaskComposer={setShowTaskComposer}
                                            setTaskForm={setTaskForm}
                                            setTaskFullInitialTab={setTaskFullInitialTab}
                                            setTaskTab={setTaskTab}
                                            showMassEdit={showMassEdit}
                                            sortedTasks={sortedTasks}
                                            t={t}
                                            tabsRef={tabsRef}
                                            taskSortDirection={taskSortDirection}
                                            taskSortField={taskSortField}
                                            taskTab={taskTab}
                                            tasksDisplayRef={tasksDisplayRef}
                                            toggleActivitiesRow={toggleActivitiesRow}
                                            toggleSelect={toggleSelect}
                                            updateField={updateField}
                                            users={users}
                                            viewTab={viewTab}
                                            visibleColumns={visibleColumns}
                                        />
                                    }
                                activityPanel={
                                    <KeyAreasActivityPanel
                                        ActivityRowMenu={(props) => (
                                            <ActivityRowMenu
                                                {...props}
                                                getActivityService={getActivityService}
                                                setActivitiesByTask={setActivitiesByTask}
                                                t={t}
                                            />
                                        )}
                                        activityDateRefs={activityDateRefs}
                                        activityDurationEdit={activityDurationEdit}
                                        activityNameEditId={activityNameEditId}
                                        activityNameEditValue={activityNameEditValue}
                                        activitySortDirection={activitySortDirection}
                                        activitySortField={activitySortField}
                                        activitiesByTask={activitiesByTask}
                                        allStatusesSelected={allStatusesSelected}
                                        currentUserId={currentUserId}
                                        filterStatuses={filterStatuses}
                                        formatDate={formatDate}
                                        getActivityService={getActivityService}
                                        getPriorityLevel={getPriorityLevel}
                                        handleActivitySort={handleActivitySort}
                                        panelTargetActivityId={panelTargetActivityId}
                                        panelViewMode={panelViewMode}
                                        saveActivityName={saveActivityName}
                                        savingActivityIds={savingActivityIds}
                                        selectedActivityCountInPanel={selectedActivityCountInPanel}
                                        selectedActivityIdsInPanel={selectedActivityIdsInPanel}
                                        selectedKA={selectedKA}
                                        selectedTaskInPanel={selectedTaskInPanel}
                                        setActivitiesByTask={setActivitiesByTask}
                                        setActivityDateEditId={setActivityDateEditId}
                                        setActivityDurationEdit={setActivityDurationEdit}
                                        setActivityNameEditId={setActivityNameEditId}
                                        setActivityNameEditValue={setActivityNameEditValue}
                                        setSelectedActivityIdsInPanel={setSelectedActivityIdsInPanel}
                                        setSelectedTaskInPanel={setSelectedTaskInPanel}
                                        setShowActivityMassFieldPicker={setShowActivityMassFieldPicker}
                                        t={t}
                                        updateActivityField={updateActivityField}
                                        users={users}
                                        visibleColumns={visibleColumns}
                                    />
                                }
                                initialTaskWidth={50}
                                minTaskWidth={30}
                                minActivityWidth={30}
                            />
                            </div>
                        )}

                        <KeyAreasGlobalTables
                            acceptedDelegatedActivities={acceptedDelegatedActivities}
                            acceptedDelegatedTasks={acceptedDelegatedTasks}
                            activitiesByTask={activitiesByTask}
                            allTasks={allTasks}
                            currentUserId={currentUserId}
                            delegatedActivities={delegatedActivities}
                            delegatedTasks={delegatedTasks}
                            editUnifiedActivity={editUnifiedActivity}
                            editUnifiedTask={editUnifiedTask}
                            getDelegationStatus={getDelegationStatus}
                            goals={goals}
                            handleBulkFieldSave={handleBulkFieldSave}
                            keyAreas={keyAreas}
                            openUnifiedActivityDetails={openUnifiedActivityDetails}
                            openUnifiedTaskDetails={openUnifiedTaskDetails}
                            pendingDelegations={pendingDelegations}
                            refreshDelegatedData={refreshDelegatedData}
                            selectedKA={selectedKA}
                            selectedTaskFull={selectedTaskFull}
                            setActivitiesByTask={setActivitiesByTask}
                            setAllTasks={setAllTasks}
                            setDelegatedTasks={setDelegatedTasks}
                            setSelectedTaskFull={setSelectedTaskFull}
                            setTaskFullInitialTab={setTaskFullInitialTab}
                            users={users}
                            viewTab={viewTab}
                        />

                        <KeyAreasActivitiesPopover
                            activitiesByTask={activitiesByTask}
                            activitiesMenuPos={activitiesMenuPos}
                            allTasks={allTasks}
                            openActivitiesMenu={openActivitiesMenu}
                            setOpenActivitiesMenu={setOpenActivitiesMenu}
                            setSelectedTaskFull={setSelectedTaskFull}
                            setTaskFullInitialTab={setTaskFullInitialTab}
                        />
                        <KeyAreasLandingShell
                            dragKAId={dragKAId}
                            filteredKAs={filteredKAs}
                            ideaForShow={ideaForShow}
                            isGlobalTasksView={isGlobalTasksView}
                            isSearching={isSearching}
                            keyAreas={keyAreas}
                            loading={loading}
                            onDeleteKA={onDeleteKA}
                            openKA={openKA}
                            pendingDirectOpen={pendingDirectOpen}
                            reorderByDrop={reorderByDrop}
                            searchResults={searchResults}
                            selectedKA={selectedKA}
                            setDragKAId={setDragKAId}
                            setEditing={setEditing}
                            setShowForm={setShowForm}
                            showOnlyIdeas={showOnlyIdeas}
                            siteSearch={siteSearch}
                        />
                        {/* DETAIL: Tabs */}
                        {selectedKA && (
                            <div className="space-y-4">
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
