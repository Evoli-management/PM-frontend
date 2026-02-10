import React, { useEffect, useState, useRef } from 'react';
import { toDateOnly } from '../../utils/keyareasHelpers';
import { FaSave } from 'react-icons/fa';
import Modal from '../shared/Modal';
import { getPriorityLevel } from '../../utils/keyareasHelpers';

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

const now = new Date();
const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  tasks = [],
  availableLists = [1],
  currentUserId = null,
}) {
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [localTasks, setLocalTasks] = useState(tasks || []);
  const [localGoals, setLocalGoals] = useState(goals || []);
  const [listNamesMap, setListNamesMap] = useState({});
  const [title, setTitle] = useState(initialData.text || initialData.activity_name || '');
  const [description, setDescription] = useState(initialData.notes || initialData.description || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.date_start || initialData.startDate) || defaultDate);
  const [endDate, setEndDate] = useState(safeDate(initialData.date_end || initialData.endDate) || defaultDate);
  const [keyAreaError, setKeyAreaError] = useState('');
  const [listError, setListError] = useState('');
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [duration, setDuration] = useState(initialData.duration || '');
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || (keyAreas[0] && keyAreas[0].id) || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1
  );
  const [taskId, setTaskId] = useState(initialData.taskId || initialData.task_id || initialData.task || '');
  const [assignee, setAssignee] = useState(initialData.responsible || initialData.assignee || '');
  const [priority, setPriority] = useState(getPriorityLevel(initialData.priority ?? initialData.priority_level ?? 2));
  const [goal, setGoal] = useState(initialData.goal || '');
  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    try { console.debug('[EditActivityModal] opening with initialData', initialData, { keyAreasLength: (keyAreas||[]).length, tasksLength: (tasks||[]).length }); } catch (__) {}
    setTitle(initialData.text || initialData.activity_name || '');
    setDescription(initialData.notes || initialData.description || '');
  // Try multiple possible date aliases to maximize chance of prefill
  setStartDate(safeDate(initialData.date_start ?? initialData.dateStart ?? initialData.startDate ?? initialData.start_date ?? initialData.date));
  setEndDate(safeDate(initialData.date_end ?? initialData.endDate ?? initialData.end_date ?? initialData.date_end));
  setDeadline(safeDate(initialData.deadline ?? initialData.dueDate ?? initialData.due_date ?? initialData.deadline));
    setDuration(initialData.duration || '');
  setKeyAreaId(initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || (keyAreas[0] && keyAreas[0].id) || '');
    setListIndex(initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1);
  setTaskId(initialData.taskId || initialData.task_id || initialData.task || initialData.task_id || '');
    // If activity doesn't carry an assignee, prefer the parent task's assignee (if available)
    const initialAssignee = initialData.responsible || initialData.assignee || '';
    if (initialAssignee) setAssignee(initialAssignee);
    else {
      try {
        const lookupTasks = (localTasks && localTasks.length) ? localTasks : (tasks && tasks.length ? tasks : []);
        const tid = initialData.taskId || initialData.task_id || initialData.task || null;
        if (tid) {
          const parent = lookupTasks.find((t) => String(t.id) === String(tid));
          if (parent && (parent.assignee || parent.responsible)) setAssignee(parent.assignee || parent.responsible || '');
        }
      } catch (e) {}
    }
  setPriority(getPriorityLevel(initialData.priority ?? initialData.priority_level ?? 2));
    setGoal(initialData.goal || '');
  }, [isOpen, initialData, keyAreas, availableLists]);

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
          goalsMod && goalsMod.getGoals ? goalsMod.getGoals().catch(() => []) : Promise.resolve([]),
        ]);
        if (ignore) return;
        setLocalKeyAreas(Array.isArray(areas) ? areas : []);
        setLocalTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
        setLocalGoals(Array.isArray(fetchedGoals) ? fetchedGoals : []);
        // If a key area is already selected, set list names for it
        try {
          const kaId = initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || null;
          if (kaId) {
            const selected = (areas || []).find((k) => String(k.id) === String(kaId));
            if (selected && selected.listNames) setListNamesMap(selected.listNames || {});
          }
        } catch (e) {}
      } catch (e) {
        // non-fatal
      }
    })();
    return () => { ignore = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate required fields
    if (!keyAreaId) {
      setKeyAreaError('Please select a Key Area');
      try { document.querySelector('select[name="key_area_id"]')?.focus?.(); } catch (_) {}
      return;
    }
    if (!listIndex) {
      setListError('Please select a List');
      try { document.querySelector('select[name="list_index"]')?.focus?.(); } catch (_) {}
      return;
    }
  // Normalize dates to date-only strings (YYYY-MM-DD) to avoid timezone shifts
  const normStart = toDateOnly(startDate) || null;
  const normEnd = toDateOnly(endDate) || null;
  const normDeadline = toDateOnly(deadline) || null;

  // Handle assignee - convert user ID to assignee and add delegatedToUserId for auto-delegation
  let assigneeValue = assignee || null;
  let delegatedToUserId = null;
  
  if (assignee) {
    const selectedUser = users.find(u => String(u.id) === String(assignee));
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
      // keep legacy aliases but prefer normalized ISO fields
  date_start: normStart,
  date_end: normEnd,
  deadline: normDeadline,
  // also set camelCase aliases to help consumers that expect them
  startDate: normStart,
  endDate: normEnd,
      duration: duration || null,
      key_area_id: keyAreaId || null,
      list: listIndex,
      taskId: taskId || null,
      assignee: assigneeValue,
      delegatedToUserId: delegatedToUserId,
      priority,
      goal: goal || null,
    };
    // Strip empty-string values (backend treats empty string as invalid)
    Object.keys(payload).forEach((k) => {
      try {
        if (payload[k] === '') delete payload[k];
      } catch (__) {}
    });

    try { console.debug('[EditActivityModal] onSave payload', payload); } catch (__) {}
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  // compact shared styles (match CreateTask/CreateActivity modals)
  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50';
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`;
  const selectCls = `${inputCls} appearance-none pr-10`;

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <div className="relative z-10 w-[640px] max-w-[95vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* hide native date picker icons for inputs with .no-calendar */}
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-calendar::-ms-clear { display: none; }
        `}</style>
        {/* header - title centered, divider gray */}
        <div className="relative px-5 py-2 border-b border-slate-200 text-center font-semibold text-slate-900">Edit Activity</div>

        {/* body */}
  <form onSubmit={onSubmit} className="px-4 pb-4 pt-2">
        <div className="mb-3">
          <label className="text-sm font-medium text-slate-700 mb-0 block" htmlFor="ka-activity-title">Activity name</label>
          <input
            id="ka-activity-title"
            name="title"
            required
            className={`${inputCls} mt-0 h-9 text-sm`}
            placeholder="Activity name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-2 md:gap-x-0.5">
    <div className="grid grid-rows-6 gap-2 md:col-span-1">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input
                name="description"
                className={`${inputCls} mt-0 h-9 text-sm`}
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <div className="relative mt-0">
                <input
                  name="start_date"
                  type="date"
                  className={`${dateCls} h-9 pr-10 pl-3 text-sm hide-native-date-icon`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  ref={startRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-sm cursor-pointer select-none"
                  onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">End date</label>
              <div className="relative mt-0">
                <input
                  name="end_date"
                  type="date"
                  className={`${dateCls} h-9 pr-10 pl-3 text-sm hide-native-date-icon`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  ref={endRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-sm cursor-pointer select-none"
                  onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Deadline</label>
              <div className="relative mt-0">
                <input
                  name="deadline"
                  type="date"
                  className={`${dateCls} h-9 pr-10 pl-3 text-sm hide-native-date-icon`}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  ref={deadlineRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-sm cursor-pointer select-none"
                  onClick={() => { try { deadlineRef.current?.showPicker?.(); deadlineRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
              <p className="mt-0 text-xs text-slate-500">No later than</p>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Duration</label>
              <div className="relative mt-0">
                <input
                  name="duration"
                  className={`${inputCls} h-9 pr-3 pl-3 text-sm`}
                  placeholder="e.g., 1h, 1d"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
            <div aria-hidden="true" />
          </div>
          {/* separator column centered between left and right on md+ */}
          <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
            <div className="w-px bg-slate-400 my-2" />
          </div>

            {/* RIGHT column */}
            <div className="grid grid-rows-6 gap-2 content-start md:col-span-1">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">Key Area</label>
                <div className="relative mt-0">
                  <select name="key_area_id" className={`${selectCls} mt-0 h-9`} value={keyAreaId} onChange={(e) => { setKeyAreaId(e.target.value); setKeyAreaError(''); }} required>
                    <option value="">— Select Key Area —</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((ka) => (<option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {keyAreaError ? (<p className="mt-1 text-xs text-red-600">{keyAreaError}</p>) : null}
                </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">List</label>
                <div className="relative mt-0">
                  <select name="list_index" className={`${selectCls} mt-0 h-9`} value={listIndex} onChange={(e) => { setListIndex(Number(e.target.value)); setListError(''); }} required>
                    {(availableLists && availableLists.length ? availableLists : [1]).map((n) => {
                      const namesSource = (Object.keys(listNamesMap || {}).length ? listNamesMap : ((localKeyAreas && localKeyAreas.length) ? (localKeyAreas.find(k => String(k.id) === String(keyAreaId))?.listNames || {}) : {}));
                      const label = namesSource && (namesSource[n] || namesSource[String(n)]) ? (namesSource[n] || namesSource[String(n)]) : `List ${n}`;
                      return (<option key={n} value={n}>{label}</option>);
                    })}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {listError ? (<p className="mt-1 text-xs text-red-600">{listError}</p>) : null}
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">Task</label>
                <div className="relative mt-0">
                  <select name="task_id" className={`${selectCls} mt-0 h-9`} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                    <option value="">— Select Task —</option>
                    {(localTasks && localTasks.length ? localTasks : tasks).map((t) => (<option key={t.id} value={t.id}>{t.title || t.name}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">Responsible</label>
                <div className="relative mt-0">
                  <select name="assignee" className={`${selectCls} mt-0 h-9`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {users.map((u) => (<option key={u.id} value={u.name}>{u.name}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <div className="relative mt-0">
                  <select name="priority" className={`${selectCls} mt-0 h-9`} value={String(priority)} onChange={(e) => setPriority(Number(e.target.value))}>
                    <option value={1}>Low</option>
                    <option value={2}>Normal</option>
                    <option value={3}>High</option>
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700">Goal</label>
                <div className="relative mt-0">
                  <select name="goal" className={`${selectCls} mt-0 h-9`} value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option value="">— Select Goal —</option>
                    {goals.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>
          </div>
          {/* footer */}
          <div className="flex items-center justify-end gap-2 w-full mt-2">
            <button type="submit" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
              OK
            </button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onCancel}>Cancel</button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" disabled>Help</button>
          </div>
        </form>
        <button type="button" className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onCancel}>
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
        </button>
      </div>
    </Modal>
  );
}
