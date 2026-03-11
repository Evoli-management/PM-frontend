import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSave } from 'react-icons/fa';
import usersService from '../../services/usersService';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import { formatKeyAreaLabel } from '../../utils/keyAreaDisplay';
import { durationToTimeInputValue, isDurationInputValid } from '../../utils/duration';

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

// Validate date range: end date must be >= start date
const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return { valid: true }; // Allow if either empty
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { valid: true };
  if (end < start) {
    return { valid: false, error: 'End date must be after or equal to start date' };
  }
  return { valid: true };
};

// Validate duration format: allow user-friendly formats like 1h30m / 1h 30m / 1hr 30min.
const validateDuration = (value) => {
  if (!value) return { valid: true }; // Optional field
  if (typeof value !== 'string') return { valid: true };
  const trimmed = value.trim();
  if (!trimmed) return { valid: true }; // Empty after trim
  if (isDurationInputValid(trimmed)) return { valid: true };
  return { valid: false, error: 'Duration format invalid. Examples: 01:30, 1h30m, 1h 30m, 1hr 30min, 45m.' };
};

const _idsOf = (arr = []) => (Array.isArray(arr) ? arr.map((x) => String(x && x.id)).join(',') : '');

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

export default function CreateTaskModal({
  isOpen,
  initialData = {},
  onSave,
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  availableLists = [1],
  // parentListNames: optional mapping passed by parent when no key area is selected
  parentListNames = null,
  // When true, the modal is being used to create a Don't Forget task (DontForget page)
  isDontForgetMode = false,
  // Current user ID for delegation detection
  currentUserId = null,
}) {
  const { t } = useTranslation();
  const firstRowRef = useRef(null);
  const [firstRowHeight, setFirstRowHeight] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let ro = null;
    const measure = () => {
      try {
        if (firstRowRef.current) {
          const h = firstRowRef.current.getBoundingClientRect().height;
          setFirstRowHeight(h);
        }
      } catch (_) {}
    };
    // measure once and observe size changes
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      if (firstRowRef.current) ro.observe(firstRowRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      try {
        if (ro && ro.disconnect) ro.disconnect();
      } catch (_) {}
      window.removeEventListener('resize', measure);
    };
  }, [isOpen]);
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [assignee, setAssignee] = useState(initialData.assignee || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.start_date || initialData.startDate || initialData.date) || '');
  const [startTime, setStartTime] = useState(() => {
    try {
      // Prefer explicit start_time/startTime, then a generic `time` passed by calendar slot.
      // If none provided, start empty (no default time).
      return initialData.start_time || initialData.startTime || initialData.time || '';
    } catch { return ''; }
  });
  const [endDate, setEndDate] = useState(safeDate(initialData.end_date || initialData.endDate || initialData.date) || '');
  const [endTime, setEndTime] = useState(() => {
    try {
      // Keep end time empty by default when not provided.
      return initialData.end_time || initialData.endTime || '';
    } catch { return ''; }
  });
  // When creating, we keep end date in-sync with start date until the user edits end date.
  const [endAuto, setEndAuto] = useState(!(initialData.end_date || initialData.endDate));
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [deadlineAuto, setDeadlineAuto] = useState(true);
  const [duration, setDuration] = useState(durationToTimeInputValue(initialData.duration || initialData.duration_minutes || ''));
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 2);
  const [status, setStatus] = useState(initialData.status || initialData.state || 'open');
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || ''
  );
  const [goal, setGoal] = useState(initialData.goalId || initialData.goal_id || initialData.goal || '');
  const [usersList, setUsersList] = useState(users || []);
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [allTasks, setAllTasks] = useState([]);
  const [listNames, setListNames] = useState({});
  const [localGoals, setLocalGoals] = useState(goals || []);
  const [resolvedCurrentUserId, setResolvedCurrentUserId] = useState(currentUserId || null);
  const rowMinHeight = firstRowHeight ? `${Math.min(firstRowHeight, 64)}px` : undefined;

  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const usersLoadedRef = useRef(false);
  const currentUserIdRef = useRef(false);

  const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
  const { size, isDraggingResize, handleResizeMouseDown } = useResizable(550, 470);
  
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
    const nextTitle = initialData.title || '';
    if (title !== nextTitle) setTitle(nextTitle);
    const nextDescription = initialData.description || '';
    if (description !== nextDescription) setDescription(nextDescription);
    const nextAssignee = initialData.assignee || '';
    if (assignee !== nextAssignee) setAssignee(nextAssignee);
  const nextStart = safeDate(initialData.start_date || initialData.startDate || initialData.date) || '';
    if (startDate !== nextStart) setStartDate(nextStart);
    const nextStartTime = initialData.start_time || initialData.startTime || initialData.time || '';
    if (nextStartTime && startTime !== nextStartTime) setStartTime(nextStartTime);
  const nextEnd = safeDate(initialData.end_date || initialData.endDate || initialData.date) || '';
  if (endDate !== nextEnd) setEndDate(nextEnd);
  const nextEndTime = initialData.end_time || initialData.endTime || initialData.endTime || '';
  if (nextEndTime && endTime !== nextEndTime) setEndTime(nextEndTime);
  // If the initial data provides an explicit end date, disable auto-sync; otherwise keep auto-sync enabled
  const nextEndAuto = !Boolean(initialData.end_date || initialData.endDate);
  if (endAuto !== nextEndAuto) setEndAuto(nextEndAuto);
  setDeadlineAuto(true);
    const nextDeadline = safeDate(initialData.deadline || initialData.dueDate);
    if (deadline !== nextDeadline) setDeadline(nextDeadline);
    const nextDuration = durationToTimeInputValue(initialData.duration || initialData.duration_minutes || '');
    if (duration !== nextDuration) setDuration(nextDuration);
    const nextPriority = initialData.priority ?? initialData.priority_level ?? 2;
    if (priority !== nextPriority) setPriority(nextPriority);
    const nextStatus = initialData.status || initialData.state || 'open';
    if (status !== nextStatus) setStatus(nextStatus);
    const nextKA = initialData.key_area_id || initialData.keyAreaId || '';
    if (String(keyAreaId) !== String(nextKA)) setKeyAreaId(nextKA);
    const nextList = initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1;
    if (listIndex !== nextList) setListIndex(nextList);
    const nextGoal = initialData.goalId || initialData.goal_id || initialData.goal || '';
    if (goal !== nextGoal) setGoal(nextGoal);

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
        } else {
          if (!usersLoadedRef.current) {
            const me = await usersService.list();
            usersLoadedRef.current = true;
            setUsersList(me || []);
          }
        }
      } catch (e) {
        setUsersList(users || []);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    // For CreateTaskModal we intentionally don't auto-default key area or list
    // so that all left-column fields (including Task name) start empty when creating.
    // This effect is intentionally a no-op here.
  }, [isOpen, localKeyAreas, keyAreas, availableLists, keyAreaId, listIndex]);

  useEffect(() => {
    if (!isOpen) usersLoadedRef.current = false;
  }, [isOpen]);

  // Fetch current user ID if not provided as prop
  useEffect(() => {
    if (!isOpen || resolvedCurrentUserId) return;
    if (currentUserIdRef.current) return; // Already attempted fetch
    currentUserIdRef.current = true;

    let ignore = false;
    (async () => {
      try {
        const mod = await import('../../services/userProfileService');
        const svc = mod?.default || mod;
        if (svc && typeof svc.getProfile === 'function') {
          const profile = await svc.getProfile();
          if (!ignore && profile?.id) {
            setResolvedCurrentUserId(profile.id);
          }
        }
      } catch (e) {
        // Silently fail - delegation will just use the unresolved ID
        if (!ignore) console.debug('Failed to fetch current user profile for delegation detection', e);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isOpen, resolvedCurrentUserId]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    (async () => {
      try {
        const mod = await import('../../services/keyAreaService');
        const kaSvc = mod?.default || mod;
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        const [areas, tasks, goalsData] = await Promise.all([
          kaSvc.list({ includeTaskCount: false }).catch(() => []),
          taskSvc ? taskSvc.list({}).catch(() => []) : Promise.resolve([]),
          import('../../services/goalService').then((m) => m.getGoals({ status: 'active' })).catch(() => []),
        ]);
        if (ignore) return;
        const newAreas = Array.isArray(areas) ? areas : [];
        setLocalKeyAreas((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(newAreas)) return prev;
          } catch (_) {}
          return newAreas;
        });
        const newTasks = Array.isArray(tasks) ? tasks : [];
        setAllTasks((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(newTasks)) return prev;
          } catch (_) {}
          return newTasks;
        });
        const fetchedGoals = Array.isArray(goalsData) ? goalsData : [];
        setLocalGoals((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(fetchedGoals)) return prev;
          } catch (_) {}
          return fetchedGoals;
        });
      } catch (e) {
        console.error('Failed to load key areas or tasks for CreateTaskModal', e);
        if (!ignore) {
          setLocalKeyAreas([]);
          setAllTasks([]);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!deadlineAuto) return;
    if (!endDate) return;
    if (deadline !== endDate) setDeadline(endDate);
  }, [isOpen, endDate, deadline, deadlineAuto]);

  // When a specific Key Area is selected while creating a task, fetch tasks for that
  // key area so the List dropdown can include any list_index values already used by
  // tasks in that area. This keeps the dropdown up-to-date without needing to load
  // all tasks for the entire workspace.
  useEffect(() => {
    if (!isOpen || !keyAreaId) return;
    let ignore = false;
    (async () => {
      try {
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        if (!taskSvc) return;
        const tasksForArea = await taskSvc.list({ keyAreaId }).catch(() => []);
        if (ignore) return;
        setAllTasks((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(tasksForArea)) return prev;
          } catch (_) {}
          return tasksForArea;
        });
      } catch (e) {
        if (!ignore) setAllTasks([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen, keyAreaId]);

  useEffect(() => {
    const kaId = keyAreaId;
    if (!kaId) {
      setListNames({});
      return;
    }
    const selectedArea = (localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).find(
      (a) => String(a.id) === String(kaId)
    );
    if (selectedArea?.listNames) {
      setListNames(selectedArea.listNames || {});
    } else {
      setListNames({});
    }
  }, [keyAreaId, localKeyAreas, keyAreas]);

  // If the availableLists prop updates after the modal opened (for example when
  // DontForget computes its available lists asynchronously), default the list
  // index to the first available value so the dropdown reflects the latest data.
  useEffect(() => {
    if (!isOpen) return;
    try {
      if ((!listIndex || listIndex === 0) && Array.isArray(availableLists) && availableLists.length) {
        setListIndex(availableLists[0]);
      }
    } catch (_) {}
  }, [availableLists, isOpen]);

  useEffect(() => {
    if (!goals || !Array.isArray(goals)) return;
    setLocalGoals((prev = []) => {
      const map = new Map();
      (goals || []).forEach((g) => map.set(String(g.id), g));
      (prev || []).forEach((g) => map.set(String(g.id), g));
      const merged = Array.from(map.values());
      try {
        if (_idsOf(prev) === _idsOf(merged)) return prev;
      } catch (_) {}
      return merged;
    });
  }, [goals]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      const g = (e && (e.detail && (e.detail.goal || e.detail))) || null;
      if (!g || !g.id) return;
      setLocalGoals((prev = []) => {
        if ((prev || []).some((x) => String(x.id) === String(g.id))) return prev;
        return [g, ...(prev || [])];
      });
    };
    window.addEventListener('goal-created', handler);
    return () => window.removeEventListener('goal-created', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // T500.4: Validate date range
    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      console.warn('Date validation failed:', dateValidation.error);
      return;
    }

    // T500.5: Validate duration format
    const durationValidation = validateDuration(duration);
    if (!durationValidation.valid) {
      console.warn('Duration validation failed:', durationValidation.error);
      return;
    }

    // Handle assignee - convert user ID to name and add delegatedToUserId for auto-delegation
    let assigneeName = assignee;
    let delegatedToUserId = null;
    
    if (assignee) {
      // Check if assignee is a user ID (UUID format) in usersList
      const selectedUser = usersList.find(u => String(u.id) === String(assignee));
      
      if (selectedUser) {
        const userId = selectedUser.id;
        
        // Set assignee name for display
        if (String(userId) === String(resolvedCurrentUserId)) {
          assigneeName = 'Me';
        } else {
          assigneeName = selectedUser.name;
          // Only add delegatedToUserId if assigning to different user (auto-creates delegation)
          delegatedToUserId = userId;
        }
      }
    }

    const payload = {
      title: (title || '').trim(),
      description: (description || '').trim(),
      assignee: assigneeName || null,
      delegatedToUserId: delegatedToUserId,
      start_date: startDate || null,
      time: startTime || null,
      start_time: startTime || null,
      date: startDate || null,
      end_date: endDate || null,
      end_time: endTime || null,
      deadline: deadline || null,
      duration: duration || null,
      priority: priority || 'medium',
      status,
      key_area_id: keyAreaId || null,
      // include both snake_case and camelCase for compatibility; prefer camelCase server-side
      list_index: listIndex,
      listIndex: listIndex,
      goalId: goal || null,
      goal_id: goal || null,
    };
    if (!onSave) {
      console.warn('CreateTaskModal: onSave prop not provided');
      return;
    }
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50';
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`;
  const selectCls = `${inputCls} appearance-none pr-10`;

  // Determine if the currently selected Key Area is the Don't Forget area
  const selectedKA = (localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).find(
    (a) => String(a.id) === String(keyAreaId)
  );
  const isDontForgetKA = !!(selectedKA && String(selectedKA.title || selectedKA.name || '').toLowerCase().match(/dont'?\s*forget/));
  const finalIsDontForget = !!(isDontForgetMode || isDontForgetKA);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
  <div 
        className="relative z-10 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '300px',
          minHeight: '200px'
        }}
      >
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-calendar::-ms-clear { display: none; }
        `}</style>
  <div 
          className="relative px-5 py-2 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
            {finalIsDontForget ? t("createTaskModal.createDontForget") : t("createTaskModal.createTask")}
          </h3>
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              form="create-task-form"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
            >
              <FaSave className="text-xs" />
              {t("createTaskModal.save")}
            </button>
            <button
              type="button"
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              onClick={onCancel}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

  <form id="create-task-form" onSubmit={onSubmit} className="pm-notched-form px-4 pb-4 pt-2 space-y-2 overflow-y-auto flex-1">
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700" htmlFor="ka-task-title">{t("createTaskModal.taskNameLabel")}</label>
            <input
              id="ka-task-title"
              name="title"
              required
              className={`${inputCls} mt-0.5`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-4 md:gap-x-6">
            <div className="grid grid-rows-5 gap-0 md:col-span-1">
              <div ref={firstRowRef} style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.descLabel")}</label>
                <input
                  name="description"
                  className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0"
                  placeholder="Brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.startDateLabel")}</label>
                <div className="relative mt-0">
                  <input
                    name="start_date"
                    type="date"
                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      if (endAuto) setEndDate(v);
                    }}
                    ref={startRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.endDateLabel")}</label>
                <div className="relative mt-0">
                  <input
                    name="end_date"
                    type="date"
                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={endDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEndDate(v);
                      setEndAuto(false);
                      if (v && startDate && v < startDate) setStartDate(v);
                    }}
                    ref={endRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.deadlineLabel")}</label>
                <div className="relative mt-0.5">
                  <input
                    name="deadline"
                    type="date"
                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={deadline}
                    onChange={(e) => { setDeadline(e.target.value); setDeadlineAuto(false); }}
                    ref={deadlineRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { deadlineRef.current?.showPicker?.(); deadlineRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
                <p className="mt-0 text-xs text-slate-500" aria-hidden="true">&nbsp;</p>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.durationLabel")}</label>
                <input
                  name="duration"
                  type="time"
                  step="60"
                  className={`${inputCls} mt-0`}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            {/* separator column centered between left and right on md+ */}
            <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
              <div className="w-px bg-slate-200 my-2" />
            </div>
            <div className="grid grid-rows-5 gap-0 md:col-span-1">
              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.keyAreaLabel")}</label>
                <div className="relative mt-0">
                  <select
                    name="key_area_id"
                    className={selectCls}
                    value={keyAreaId}
                    onChange={(e) => setKeyAreaId(e.target.value)}
                    required={!finalIsDontForget}
                  >
                    <option value="">{t("createTaskModal.selectKeyArea")}</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((ka, idx) => (
                      <option key={ka.id} value={ka.id}>{formatKeyAreaLabel(ka, idx)}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.listLabel")}</label>
                <div className="relative mt-0">
                  <select
                    name="list_index"
                    className={selectCls}
                    value={listIndex}
                    onChange={(e) => setListIndex(Number(e.target.value))}
                    required
                  >
                    {
                      (() => {
                        if (!keyAreaId) {
                          const useLists = (availableLists && availableLists.length) ? availableLists : [1];
                          return useLists.map((n) => (
                            <option key={n} value={n}>{(parentListNames && parentListNames[n]) || (listNames && listNames[n]) || t("createTaskModal.list", { n })}</option>
                          ));
                        }
                        const named = Object.keys(listNames || {}).map(Number).filter((idx) => listNames[idx] && String(listNames[idx]).trim() !== '');
                        const listsWithTasks = (allTasks || []).filter((t) => String(t.keyAreaId) === String(keyAreaId) && t.list_index).map((t) => t.list_index).filter((v, i, arr) => arr.indexOf(v) === i);
                        const combined = [1, ...named, ...listsWithTasks];
                        const uniq = [...new Set(combined)].sort((a, b) => a - b);
                        const toUse = (uniq && uniq.length) ? uniq : (availableLists || [1]);
                        return toUse.map((n) => (<option key={n} value={n}>{(listNames && listNames[n]) || t("createTaskModal.list", { n })}</option>));
                      })()
                    }
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.responsibleLabel")}</label>
                <div className="relative mt-0">
                  <select name="assignee" className={`${selectCls} mt-0 h-9`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">{t("createTaskModal.unassigned")}</option>
                    {(usersList || []).map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.priorityLabel")}</label>
                <div className="relative mt-0">
                  <select
                    name="priority"
                    className={selectCls}
                    value={String(priority)}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  >
                    <option value={3}>{t("createTaskModal.highOpt")}</option>
                    <option value={2}>{t("createTaskModal.normalOpt")}</option>
                    <option value={1} style={{ color: "#6b7280" }}>{t("createTaskModal.lowOpt")}</option>
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div style={rowMinHeight ? { minHeight: rowMinHeight } : undefined}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.goalLabel")}</label>
                <div className="relative mt-0">
                  <select name="goal" className={selectCls} value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option value="">{t("createTaskModal.selectGoal")}</option>
                    {(localGoals && localGoals.length ? localGoals : goals).map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>
          </div>
        </form>
        {/* Right resize handle */}
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
        />
        {/* Bottom resize handle */}
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
          className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
        />
        {/* Corner resize handle (southeast) */}
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors rounded-tl"
          style={{ zIndex: 41 }}
          title="Drag to resize"
        />
      </div>
    </div>
  );
}
