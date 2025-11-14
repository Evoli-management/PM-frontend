import React, { useEffect, useState, useRef } from 'react';
import { FaSave } from 'react-icons/fa';
import usersService from '../../services/usersService';

// ---- helpers (JS only) ----
const safeDate = (v) => {
  if (!v && v !== 0) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const _idsOf = (arr = []) => (Array.isArray(arr) ? arr.map((x) => String(x && x.id)).join(',') : '');

// inline SVG icons (untyped)

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

export default function EditTaskModal({
  isOpen,
  initialData = {},
  onSave,
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  availableLists = [1],
  // optional custom modal title (used for mass-editing banner)
  modalTitle = undefined,
}) {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [assignee, setAssignee] = useState(initialData.assignee || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.start_date || initialData.startDate));
  const [endDate, setEndDate] = useState(safeDate(initialData.end_date || initialData.endDate));
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [duration, setDuration] = useState(initialData.duration || initialData.duration_minutes || '');
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 2);
  const [status, setStatus] = useState(initialData.status || initialData.state || 'open');
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1
  );
  // taskId removed per UX request; tasks selection no longer shown
  const [goal, setGoal] = useState(initialData.goal || '');
  const [usersList, setUsersList] = useState(users || []);
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [allTasks, setAllTasks] = useState([]);
  const [listNames, setListNames] = useState({});
  const [localGoals, setLocalGoals] = useState(goals || []);

  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const usersLoadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextTitle = initialData.title || '';
    if (title !== nextTitle) setTitle(nextTitle);
    const nextDescription = initialData.description || '';
    if (description !== nextDescription) setDescription(nextDescription);
    const nextAssignee = initialData.assignee || '';
    if (assignee !== nextAssignee) setAssignee(nextAssignee);
    const nextStart = safeDate(initialData.start_date || initialData.startDate);
    if (startDate !== nextStart) setStartDate(nextStart);
    const nextEnd = safeDate(initialData.end_date || initialData.endDate);
    if (endDate !== nextEnd) setEndDate(nextEnd);
    const nextDeadline = safeDate(initialData.deadline || initialData.dueDate);
    if (deadline !== nextDeadline) setDeadline(nextDeadline);
    const nextDuration = initialData.duration || initialData.duration_minutes || '';
    if (duration !== nextDuration) setDuration(nextDuration);
    const nextPriority = initialData.priority ?? initialData.priority_level ?? 2;
    if (priority !== nextPriority) setPriority(nextPriority);
    const nextStatus = initialData.status || initialData.state || 'open';
    if (status !== nextStatus) setStatus(nextStatus);
    // Initialize keyAreaId from the incoming task data only. We set defaults from
    // fetched key areas in a separate effect to avoid update loops.
  const nextKA = initialData.key_area_id || initialData.keyAreaId || '';
  if (String(keyAreaId) !== String(nextKA)) setKeyAreaId(nextKA);
  const nextList = initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1;
  if (listIndex !== nextList) setListIndex(nextList);
  // taskId removed per UX request; tasks selection no longer shown
  const nextGoal = initialData.goal || '';
  if (goal !== nextGoal) setGoal(nextGoal);
    // load users if none provided so the assignee dropdown always contains at least the current user
    (async () => {
      try {
        // Only fetch current user once per modal open to avoid repeated /users/me calls
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
              // only update state if content differs to avoid re-render loops
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (merged || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(merged);
            } else {
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (users || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(users || []);
            }
          } else {
            // merge any newly provided users prop without refetching, only if new ids appear
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

  // When fetched key areas load, if no keyAreaId is set, default to the first area.
  useEffect(() => {
    if (!isOpen) return;
    // We intentionally do NOT auto-default the key area here. The dropdown will
    // be populated from `localKeyAreas` / `keyAreas`, but the selected value
    // should remain empty unless the caller provided an initial value. This
    // keeps the modal consistent with the requirement that the key area be
    // "not filled by default".
    if ((!listIndex || listIndex === 0) && availableLists && availableLists.length) {
      setListIndex((prev) => (prev && prev !== 0 ? prev : (availableLists[0] || 1)));
    }
  }, [isOpen, localKeyAreas, keyAreas, availableLists, keyAreaId, listIndex]);

  // reset usersLoadedRef when modal closes so next open can refresh if needed
  useEffect(() => {
    if (!isOpen) usersLoadedRef.current = false;
  }, [isOpen]);

  // Load key areas and tasks when modal opens so we can show the full list and list names
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    (async () => {
      try {
        // dynamic import to keep bundles small like other modals
        const mod = await import('../../services/keyAreaService');
        const kaSvc = mod?.default || mod;
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        const [areas, tasks, goalsData] = await Promise.all([
          kaSvc.list({ includeTaskCount: false }).catch(() => []),
          taskSvc ? taskSvc.list({}).catch(() => []) : Promise.resolve([]),
          import('../../services/goalService').then((m) => m.getGoals()).catch(() => []),
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
        // If the task has a goal id that wasn't included in fetched goals, try to fetch it individually
        try {
          const taskGoalId = initialData && (initialData.goal || initialData.goal_id || initialData.goalId);
          const hasGoal = fetchedGoals.some((g) => String(g.id) === String(taskGoalId));
          if (taskGoalId && !hasGoal) {
            const getGoal = (await import('../../services/goalService')).getGoalById;
            if (typeof getGoal === 'function') {
              const single = await getGoal(taskGoalId).catch(() => null);
              if (single) {
                setLocalGoals((prev) => {
                  const exists = (prev || []).some((g) => String(g.id) === String(single.id));
                  if (exists) return prev;
                  return [single, ...(prev || [])];
                });
              }
            }
          }
        } catch (err) {
          // non-fatal
          console.warn('Could not fetch single goal for EditTaskModal', err);
        }
      } catch (e) {
        console.error('Failed to load key areas or tasks for EditTaskModal', e);
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

  // When selected key area or loaded areas change, populate listNames for that area
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

  // Merge incoming goals prop into localGoals when it changes so newly-created goals become available
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

  // Listen for global 'goal-created' events so the modal updates instantly when goals are created elsewhere
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      // Support both { detail: goal } and { detail: { goal } } shapes
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
    const payload = {
      ...initialData,
      // ensure we include a usable id for update flows
      id: initialData.id || initialData.taskId || initialData.task_id || initialData._id || undefined,
      title: (title || '').trim(),
      description: (description || '').trim(),
      assignee: assignee || null,
      start_date: startDate || null,
      end_date: endDate || null,
      deadline: deadline || null,
      duration: duration || null,
      priority,
      status,
      key_area_id: keyAreaId || null,
      // backend and page expect `list_index` and `goal_id` keys
      list_index: listIndex,
      goal_id: goal || null,
    };
    // payload prepared for save
    if (!onSave) {
      console.warn('EditTaskModal: onSave prop not provided');
      return;
    }
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  // shared styles to match existing UI
  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100';
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`;
  const selectCls = `${inputCls} appearance-none pr-10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      {/* dialog */}
      <div className="relative z-10 w-[820px] max-w-[95vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* hide native date picker icons for inputs with .no-calendar */}
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-calendar::-ms-clear { display: none; }
        `}</style>
        {/* header - title centered, divider gray */}
        <div className="relative px-5 py-3 border-b border-slate-200">
          <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
            {modalTitle || 'Edit Task'}
          </h3>
          <div className="flex items-center justify-end">
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

        {/* body */}
        <form onSubmit={onSubmit} className="px-5 pb-5 pt-3 space-y-3">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="ka-task-title">Task name</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT column */}
            <div className="grid grid-rows-6 gap-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <input
                  name="description"
                  className={`${inputCls} mt-0.5`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Start date</label>
                <div className="relative mt-0.5">
                  <input
                    ref={startRef}
                    name="start_date"
                    type="date"
                    className={dateCls}
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); }}
                    // onInput helps catch native picker changes in some browsers
                    onInput={(e) => { setStartDate(e.target.value); }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        // If no date is set, prefill with today's date so the native
                        // showPicker opens with a sensible value instead of empty.
                        const today = new Date();
                        const todayStr = today.toISOString().slice(0, 10);
                        if (!startRef.current?.value) {
                          setStartDate(todayStr);
                        }
                        startRef.current?.showPicker?.();
                        startRef.current?.focus();
                      } catch (e) {}
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                  >
                    📅
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">End date</label>
                <div className="relative mt-0.5">
                  <input
                    ref={endRef}
                    name="end_date"
                    type="date"
                    className={dateCls}
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); }}
                    onInput={(e) => { setEndDate(e.target.value); }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const today = new Date();
                        const todayStr = today.toISOString().slice(0, 10);
                        if (!endRef.current?.value) {
                          setEndDate(todayStr);
                        }
                        endRef.current?.showPicker?.();
                        endRef.current?.focus();
                      } catch (e) {}
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                  >
                    📅
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Deadline</label>
                <div className="relative mt-0.5">
                  <input
                    ref={deadlineRef}
                    name="deadline"
                    type="date"
                    className={dateCls}
                    value={deadline}
                    onChange={(e) => { setDeadline(e.target.value); }}
                    onInput={(e) => { setDeadline(e.target.value); }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const today = new Date();
                        const todayStr = today.toISOString().slice(0, 10);
                        if (!deadlineRef.current?.value) {
                          setDeadline(todayStr);
                        }
                        deadlineRef.current?.showPicker?.();
                        deadlineRef.current?.focus();
                      } catch (e) {}
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                  >
                    📅
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">No later than</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <input
                  name="duration"
                  className={`${inputCls} mt-0.5`}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 1h, 1d"
                />
              </div>
            </div>

            {/* RIGHT column */}
            <div className="grid grid-rows-6 gap-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Key Area</label>
                <div className="relative mt-0.5">
                  <select
                    name="key_area_id"
                    className={selectCls}
                    value={keyAreaId}
                    onChange={(e) => setKeyAreaId(e.target.value)}
                  >
                    <option value="">— Select Key Area —</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((ka) => (
                      <option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">List</label>
                <div className="relative mt-0.5">
                  <select
                    name="list_index"
                    className={selectCls}
                    value={listIndex}
                    onChange={(e) => setListIndex(Number(e.target.value))}
                  >
                    {// compute available lists using listNames and allTasks similar to other modals
                      (() => {
                        // prefer listNames for the selected key area
                        const named = Object.keys(listNames || {})
                          .map(Number)
                          .filter((idx) => listNames[idx] && String(listNames[idx]).trim() !== '');
                        const listsWithTasks = (allTasks || [])
                          .filter((t) => String(t.keyAreaId) === String(keyAreaId) && t.list_index)
                          .map((t) => t.list_index)
                          .filter((v, i, arr) => arr.indexOf(v) === i);
                        const combined = [1, ...named, ...listsWithTasks];
                        const uniq = [...new Set(combined)].sort((a, b) => a - b);
                        const toUse = (uniq && uniq.length) ? uniq : (availableLists || [1]);
                        return toUse.map((n) => (
                          <option key={n} value={n}>{(listNames && listNames[n]) || `List ${n}`}</option>
                        ));
                      })()
                    }
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Assignee</label>
                <div className="relative mt-0.5">
                  <select
                    name="assignee"
                    className={selectCls}
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Task field removed per request */}

              <div>
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <div className="relative mt-0.5">
                  <select
                    name="priority"
                    className={selectCls}
                    value={String(priority)}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Normal</option>
                    <option value={3}>High</option>
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Goal</label>
                <div className="relative mt-0.5">
                  <select
                    name="goal"
                    className={selectCls}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  >
                    <option value="">— Select Goal —</option>
                    {(localGoals && localGoals.length ? localGoals : goals).map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              onClick={(e) => {
                  // ensure click triggers save even if form submit gets blocked by browser
                  e.preventDefault();
                  if (!isSaving && title.trim()) {
                    handleSave();
                  } else if (!title.trim()) {
                    // provide quick feedback in console for disabled reason
                    console.warn('EditTaskModal: Save not triggered because title is empty');
                  }
                }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-white font-medium shadow-sm hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              <FaSave className="h-4 w-4" />
              Save
            </button>
            <button type="button" onClick={onCancel} className="px-3 py-2 text-slate-700 hover:underline">
              Cancel
            </button>
            <button type="button" disabled className="px-3 py-2 text-slate-400">
              Help
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
