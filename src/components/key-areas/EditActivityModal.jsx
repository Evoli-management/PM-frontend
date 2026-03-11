import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toDateOnly } from '../../utils/keyareasHelpers';
import Modal from '../shared/Modal';
import { getPriorityLevel } from '../../utils/keyareasHelpers';
import usersService from '../../services/usersService';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import { FaSave, FaTrash } from 'react-icons/fa';
import activityService from '../../services/activityService';
import { formatKeyAreaLabel } from '../../utils/keyAreaDisplay';
import { durationToTimeInputValue } from '../../utils/duration';

// ---- helpers (JS only) ----
const safeDate = (v) => {
  if (!v && v !== 0) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeUserLookupValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    return (
      value.id ||
      value.userId ||
      value.user_id ||
      value.name ||
      value.username ||
      value.email ||
      ''
    );
  }
  return String(value).trim();
};

const extractAssigneeCandidate = (item = {}) => {
  const candidates = [
    item.assigneeId,
    item.assignee_id,
    item.responsibleId,
    item.responsible_id,
    item.delegatedToUserId,
    item.delegated_to_user_id,
    item.assignee,
    item.responsible,
    item.assignee_name,
    item.responsibleName,
    item.responsible_name,
    item.owner,
    item.assigned_to,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeUserLookupValue(candidate);
    if (normalized) return normalized;
  }
  return '';
};

const findUserIdFromValue = (value, users = [], currentUserId = null) => {
  const normalized = normalizeUserLookupValue(value);
  if (!normalized) return '';
  if (String(normalized).toLowerCase() === 'me' && currentUserId) return String(currentUserId);
  if (UUID_RE.test(normalized)) return normalized;

  const target = String(normalized).toLowerCase();
  const user = (users || []).find((u) => {
    const candidates = [
      u.id,
      u.userId,
      u.user_id,
      u.name,
      u.username,
      u.email,
      `${u.firstname || ''} ${u.lastname || ''}`.trim(),
      `${u.name || u.firstname || ''} ${u.lastname || ''}`.trim(),
    ]
      .map((candidate) => String(candidate || '').trim())
      .filter(Boolean);

    return candidates.some((candidate) => {
      const lower = candidate.toLowerCase();
      return lower === target || target.includes(lower);
    });
  });

  return user?.id ? String(user.id) : '';
};

const resolveActivityAssigneeSelectValue = (item = {}, users = [], currentUserId = null, taskOptions = []) => {
  const direct = findUserIdFromValue(extractAssigneeCandidate(item), users, currentUserId);
  if (direct) return direct;

  const taskId = item.taskId || item.task_id || item.task || null;
  if (!taskId) return '';
  const parentTask = (taskOptions || []).find(
    (task) => String(task.id || task.taskId || task.task_id || task._id) === String(taskId)
  );
  return findUserIdFromValue(extractAssigneeCandidate(parentTask), users, currentUserId);
};

const normalizePriority = (value) => {
  if (value === undefined || value === null || value === '') return 'normal';
  const raw = String(value).toLowerCase();
  if (raw === '3' || raw === 'high') return 'high';
  if (raw === '1' || raw === 'low') return 'low';
  if (raw === '2' || raw === 'normal' || raw === 'med' || raw === 'medium') return 'normal';
  return 'normal';
};

const sanitizeTaskOptions = (items = [], currentActivityId = null) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    const id = item?.id ?? item?.taskId ?? item?.task_id ?? null;
    if (!id) return false;
    if (currentActivityId && String(id) === String(currentActivityId)) return false;
    // Activity-shaped rows should never appear in the task selector.
    if (item?.taskId || item?.task_id || item?.activityId || item?.activity_id) return false;
    return true;
  });
};

// inline SVG icons (untyped)

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

export default function EditActivityModal({
  isOpen,
  initialData = {},
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  tasks = [],
  availableLists = [1],
  currentUserId = null,
  parentListNames = null,
}) {
  const usersLoadedRef = useRef(false);
  const currentActivityId =
    initialData.id || initialData.activityId || initialData.activity_id || null;
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [localTasks, setLocalTasks] = useState(sanitizeTaskOptions(tasks || [], currentActivityId));
  const { t } = useTranslation();
  const hasSameListNames = (a, b) => {
    const aObj = a && typeof a === 'object' ? a : {};
    const bObj = b && typeof b === 'object' ? b : {};
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => String(aObj[k] ?? '') === String(bObj[k] ?? ''));
  };
  const normalizedParentListNames = {};
  try {
    Object.keys(parentListNames || {}).forEach((k) => {
      const num = Number(k);
      if (!Number.isNaN(num)) normalizedParentListNames[num] = parentListNames[k];
      else normalizedParentListNames[k] = parentListNames[k];
    });
  } catch (e) {}
  const [localGoals, setLocalGoals] = useState(goals || []);
  const [usersList, setUsersList] = useState(users || []);
  const [title, setTitle] = useState(initialData.text || initialData.activity_name || '');
  const [description, setDescription] = useState(initialData.notes || initialData.description || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.date_start || initialData.startDate) || '');
  const [endDate, setEndDate] = useState(safeDate(initialData.date_end || initialData.endDate) || '');
  const [endAuto, setEndAuto] = useState(true);
  const [deadlineAuto, setDeadlineAuto] = useState(true);
  const [keyAreaError, setKeyAreaError] = useState('');
  const [listError, setListError] = useState('');
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [duration, setDuration] = useState(durationToTimeInputValue(initialData.duration || ''));
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || initialData.key_area || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || ''
  );
  const [localAvailableLists, setLocalAvailableLists] = useState(Array.isArray(availableLists) ? availableLists : [1]);
  const [localListNames, setLocalListNames] = useState({});
  const [taskId, setTaskId] = useState(initialData.taskId || initialData.task_id || initialData.task || '');
  const [assignee, setAssignee] = useState(() =>
    resolveActivityAssigneeSelectValue(initialData, users, currentUserId, tasks)
  );
  const [priority, setPriority] = useState(normalizePriority(initialData.priority ?? initialData.priority_level ?? 'normal'));
  const [goal, setGoal] = useState(initialData.goal || initialData.goalId || '');
  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
  const { size, isDraggingResize, handleResizeMouseDown } = useResizable(550, 510);

  // Filter tasks by selected key area and list
  const filteredTasks = useMemo(() => {
    if (!keyAreaId || !listIndex) return [];
    const allTasks = sanitizeTaskOptions(
      localTasks.length > 0 ? localTasks : (tasks || []),
      currentActivityId,
    );
    return allTasks.filter((t) => {
      const tKeyArea = t.keyAreaId || t.key_area_id || t.keyArea || t.key_area;
      const tList = t.list || t.list_index || t.listIndex;
      return String(tKeyArea) === String(keyAreaId) && String(tList) === String(listIndex);
    });
  }, [keyAreaId, listIndex, localTasks, tasks, currentActivityId]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen) resetPosition();
  }, [isOpen, resetPosition]);

  useEffect(() => {
    if (!isOpen) return;
    try { console.debug('[EditActivityModal] opening with initialData', initialData, { keyAreasLength: (keyAreas||[]).length, tasksLength: (tasks||[]).length }); } catch (__) {}
    setTitle(initialData.text || initialData.activity_name || '');
    setDescription(initialData.notes || initialData.description || '');
    // Try multiple possible date aliases to maximize chance of prefill
    setStartDate(safeDate(initialData.date_start ?? initialData.dateStart ?? initialData.startDate ?? initialData.start_date ?? initialData.date) || '');
    const nextEnd = safeDate(initialData.date_end ?? initialData.endDate ?? initialData.end_date ?? initialData.date_end) || '';
    setEndDate(nextEnd);
    // Keep auto-sync enabled on open so changing Start date auto-fills End date,
    // matching behavior in other composer/edit modals until user edits End date manually.
    setEndAuto(true);
    setDeadlineAuto(true);
    setDeadline(safeDate(initialData.deadline ?? initialData.dueDate ?? initialData.due_date ?? initialData.deadline));
    setDuration(durationToTimeInputValue(initialData.duration || ''));
    setKeyAreaId(initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || initialData.key_area || '');
    setListIndex(initialData.list || initialData.list_index || '');
    setTaskId(initialData.taskId || initialData.task_id || initialData.task || initialData.task_id || '');
    const lookupTasks = (localTasks && localTasks.length) ? localTasks : (tasks && tasks.length ? tasks : []);
    setAssignee(resolveActivityAssigneeSelectValue(initialData, usersList, currentUserId, lookupTasks));
    setPriority(normalizePriority(initialData.priority ?? initialData.priority_level ?? 'normal'));
    setGoal(initialData.goal || initialData.goalId || '');
  }, [isOpen, initialData, keyAreas, availableLists]);

  useEffect(() => {
    if (!isOpen) return;
    if (assignee) return;
    const lookupTasks = (localTasks && localTasks.length) ? localTasks : (tasks && tasks.length ? tasks : []);
    const nextAssignee = resolveActivityAssigneeSelectValue(initialData, usersList, currentUserId, lookupTasks);
    if (nextAssignee) setAssignee(nextAssignee);
  }, [isOpen, assignee, initialData, usersList, currentUserId, localTasks, tasks]);

  // Load key areas, tasks and goals when modal opens so Task and List dropdowns
  // are populated even if parent didn't pass full lists. This mirrors EditTaskModal.
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    (async () => {
      try {
        const kaMod = await import('../../services/keyAreaService');
        const kaSvc = kaMod?.default || kaMod;
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        const goalsMod = await import('../../services/goalService').catch(() => null);
        const [areas, fetchedTasks, fetchedGoals] = await Promise.all([
          kaSvc.list({ includeTaskCount: false }).catch(() => []),
          taskSvc ? taskSvc.list({}).catch(() => []) : Promise.resolve([]),
          goalsMod && goalsMod.getGoals ? goalsMod.getGoals({ status: 'active' }).catch(() => []) : Promise.resolve([]),
        ]);
        if (ignore) return;
        setLocalKeyAreas(Array.isArray(areas) ? areas : []);
        setLocalTasks(sanitizeTaskOptions(fetchedTasks || [], currentActivityId));
        setLocalGoals(Array.isArray(fetchedGoals) ? fetchedGoals : []);
      } catch (e) {
        // non-fatal
      }
    })();
    return () => { ignore = true; };
  }, [isOpen, currentActivityId]);

  useEffect(() => {
    const fallbackNames = normalizedParentListNames && Object.keys(normalizedParentListNames).length
      ? normalizedParentListNames
      : {};
    const selectedArea = keyAreaId
      ? (localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).find(
          (area) => String(area.id) === String(keyAreaId)
        )
      : null;
    const nextListNames = selectedArea?.listNames && Object.keys(selectedArea.listNames || {}).length
      ? selectedArea.listNames
      : fallbackNames;
    setLocalListNames((prev) => (hasSameListNames(prev, nextListNames) ? prev : nextListNames));

    const availableFromNames = Object.keys(nextListNames || {})
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const baseLists = Array.isArray(availableLists) ? availableLists : [1];
    const currentList = Number(listIndex);
    const mergedLists = [...new Set([
      ...baseLists,
      ...availableFromNames,
      ...(Number.isNaN(currentList) || currentList <= 0 ? [] : [currentList]),
    ])].sort((a, b) => a - b);

    setLocalAvailableLists((prev) => {
      if (prev.length === mergedLists.length && prev.every((value, idx) => Number(value) === Number(mergedLists[idx]))) {
        return prev;
      }
      return mergedLists;
    });
  }, [keyAreaId, localKeyAreas, keyAreas, availableLists, listIndex, parentListNames]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        if (users && users.length) {
          if (!usersLoadedRef.current) {
            const me = await usersService.list();
            usersLoadedRef.current = true;
            if (me && me.length) {
              const existingIds = new Set((users || []).map((u) => String(u.id)));
              const merged = [...users];
              me.forEach((m) => {
                if (!existingIds.has(String(m.id))) merged.push(m);
              });
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (merged || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(merged);
            } else {
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (users || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(users || []);
            }
          } else {
            const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
            const merged = (usersList || []).slice();
            const existingIdsSet = new Set((usersList || []).map((u) => String(u.id)));
            (users || []).forEach((u) => {
              if (!existingIdsSet.has(String(u.id))) merged.push(u);
            });
            const newIds = (merged || []).map((u) => String(u.id)).join(',');
            if (prevIds !== newIds) setUsersList(merged);
          }
        } else if (!usersLoadedRef.current) {
          const me = await usersService.list();
          usersLoadedRef.current = true;
          setUsersList(me || []);
        }
      } catch (e) {
        if (users && users.length) setUsersList(users || []);
      }
    })();
  }, [isOpen, users]);

  useEffect(() => {
    if (!isOpen) return;
    if (!deadlineAuto) return;
    if (!endDate) return;
    if (deadline !== endDate) setDeadline(endDate);
  }, [isOpen, endDate, deadline, deadlineAuto]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Activities don't require key area or list - they're attached to tasks which have those
    // Normalize dates to date-only strings (YYYY-MM-DD) to avoid timezone shifts
    const normStart = toDateOnly(startDate) || null;
    const normEnd = toDateOnly(endDate) || null;
    const normDeadline = toDateOnly(deadline) || null;

  // Handle assignee - convert user ID to delegatedToUserId for auto-delegation
  let delegatedToUserId = null;
  
  if (assignee) {
    const selectedUser = usersList.find(u => String(u.id) === String(assignee));
    if (selectedUser) {
      const userId = selectedUser.id;
      
      // Only add delegatedToUserId if assigning to different user (auto-creates delegation)
      if (String(userId) !== String(currentUserId)) {
        delegatedToUserId = userId;
      }
    }
  }

    const payload = {
      ...initialData,
      text: (title || '').trim(),
      notes: (description || '').trim(),
      // Backend expects camelCase date fields
      startDate: normStart,
      start_date: normStart,
      date_start: normStart,
      endDate: normEnd,
      end_date: normEnd,
      date_end: normEnd,
      deadline: normDeadline,
      dueDate: normDeadline,
      due_date: normDeadline,
      duration: duration || null,
      taskId: taskId || null,
      delegatedToUserId: delegatedToUserId,
      priority,
      goalId: goal || null,
    };
    // Strip empty-string values and fields not supported by activities backend
    const unsupportedFields = ['key_area_id', 'keyAreaId', 'keyArea', 'list', 'listIndex', 'list_index', 'assignee', 'responsible', 'assigneeId', 'responsibleId'];
    Object.keys(payload).forEach((k) => {
      try {
        if (payload[k] === '' || unsupportedFields.includes(k)) delete payload[k];
      } catch (__) {}
    });

    try { console.debug('[EditActivityModal] onSave payload', payload); } catch (__) {}
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const handleDelete = async () => {
    const id = initialData.id || initialData.activityId || initialData._id;
    if (!id) return;
    if (!window.confirm('Delete this activity?')) return;
    try {
      if (typeof onDelete === 'function') {
        await onDelete(id, initialData);
      } else {
        await activityService.remove(id);
      }
      onCancel && onCancel();
    } catch (e) {
      console.error('Failed to delete activity', e);
    }
  };

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <div
        className="relative z-10 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '300px',
          minHeight: '200px',
        }}
      >
        {/* hide native date picker icons for inputs with .no-calendar */}
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { opacity: 0; pointer-events: none; display: block; width: 0; height: 0; }
          .no-calendar::-webkit-clear-button,
          .no-calendar::-webkit-inner-spin-button { display: none; }
          .no-calendar { -webkit-appearance: none; appearance: none; }
          .no-calendar::-moz-focus-inner { border: 0; }
        `}</style>

        <div
          className="relative px-5 py-2 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
          onMouseDown={handleMouseDown}
        >
          <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
            {t("editActivityModal.title")}
          </h3>
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              form="edit-activity-form"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
            >
              <FaSave className="text-xs" />
              {t("createTaskModal.save")}
            </button>
            <button
              type="button"
              className="p-2 rounded-md text-red-600 hover:bg-red-50"
              aria-label="Delete"
              onClick={handleDelete}
            >
              <FaTrash className="text-sm" />
            </button>
            <button type="button" className="p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onCancel}>
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
            </button>
          </div>
        </div>

        <form id="edit-activity-form" className="pm-notched-form px-4 pb-4 pt-2 space-y-2 overflow-y-auto flex-1" onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700" htmlFor="ka-activity-title">{t("editActivityModal.activityNameLabel")}</label>
            <input
              id="ka-activity-title"
              required
              name="title"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 mt-0.5"
              placeholder="Activity name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-4 md:gap-x-6">
            <div className="grid grid-rows-6 gap-0 md:col-span-1">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.descLabel")}</label>
                <input
                  name="description"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0"
                  placeholder="Brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.startDateLabel")}</label>
                <div className="relative mt-0">
                  <input
                    name="start_date"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      try { if (endAuto) setEndDate(v); } catch (__) {}
                    }}
                    ref={startRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.endDateLabel")}</label>
                <div className="relative mt-0">
                  <input
                    name="end_date"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                  value={endDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEndDate(v);
                    if (deadlineAuto) setDeadline(v);
                    if (v && startDate && v < startDate) setStartDate(v);
                    try { setEndAuto(false); } catch (__) {}
                  }}
                  ref={endRef}
                />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.deadlineLabel")}</label>
                <div className="relative mt-0.5">
                  <input
                    name="deadline"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      setDeadlineAuto(false);
                    }}
                    ref={deadlineRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { deadlineRef.current?.showPicker?.(); deadlineRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
                <p className="mt-0 text-xs text-slate-500" aria-hidden="true">&nbsp;</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.durationLabel")}</label>
                <input
                  name="duration"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 mt-0"
                  type="time"
                  step="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
              <div className="w-px bg-slate-200 my-2" />
            </div>

            <div className="grid grid-rows-6 gap-0 md:col-span-1">
              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.keyAreaLabel")}</label>
                <div className="relative mt-0">
                  <select name="key_area_id" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={keyAreaId} onChange={(e) => { setKeyAreaId(e.target.value); setKeyAreaError(''); }} required>
                    <option value="">{t("createTaskModal.selectKeyArea")}</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((ka, idx) => (<option key={ka.id} value={ka.id}>{formatKeyAreaLabel(ka, idx)}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {keyAreaError ? (<p className="mt-1 text-xs text-red-600">{keyAreaError}</p>) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.listLabel")}</label>
                <div className="relative mt-0">
                  <select name="list_index" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={listIndex} onChange={(e) => { setListIndex(e.target.value); setListError(''); }} disabled={!keyAreaId} required>
                    {!keyAreaId ? (<option value="">{t("editActivityModal.selectKeyAreaFirst")}</option>) : (<option value="">{t("editActivityModal.selectList")}</option>)}
                    {keyAreaId && localAvailableLists.map((n) => {
                      const label =
                        (localListNames && (localListNames[n] || localListNames[String(n)])) ||
                        (normalizedParentListNames && (normalizedParentListNames[n] || normalizedParentListNames[String(n)])) ||
                        t("createTaskModal.list", { n });
                      return (<option key={n} value={n}>{label}</option>);
                    })}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {listError ? (<p className="mt-1 text-xs text-red-600">{listError}</p>) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("editActivityModal.taskLabel")}</label>
                <div className="relative mt-0">
                  <select name="task_id" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={!keyAreaId || !listIndex}>
                    {!keyAreaId ? (<option value="">{t("editActivityModal.selectKeyAreaFirst")}</option>) : (!listIndex ? (<option value="">{t("editActivityModal.selectListFirst")}</option>) : (<option value="">{t("editActivityModal.selectTask")}</option>))}
                    {keyAreaId && listIndex && filteredTasks.map((t) => {
                      const label = t.title || t.name || t.activity_name || t.text || String(t.id);
                      return (<option key={t.id} value={t.id}>{label}</option>);
                    })}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.responsibleLabel")}</label>
                <div className="relative mt-0">
                  <select name="assignee" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">{t("createTaskModal.unassigned")}</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.firstname} {u.lastname || ''}
                      </option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.priorityLabel")}</label>
                <div className="relative mt-0">
                  <select
                    name="priority"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="high">{t("createTaskModal.highOpt")}</option>
                    <option value="normal">{t("createTaskModal.normalOpt")}</option>
                    <option value="low" style={{ color: "#6b7280" }}>{t("createTaskModal.lowOpt")}</option>
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.goalLabel")}</label>
                <div className="relative mt-0">
                  <select name="goal" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option value="">{t("createTaskModal.selectGoal")}</option>
                    {(localGoals && localGoals.length ? localGoals : goals).map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

        </form>

        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
        />
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
          className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
        />
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors rounded-tl"
          style={{ zIndex: 41 }}
          title="Drag to resize"
        />

      </div>
    </Modal>
  );
}
