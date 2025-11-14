import React, { useEffect, useState, useRef } from 'react';
import { FaSave } from 'react-icons/fa';

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
}) {
  const [title, setTitle] = useState(initialData.text || initialData.activity_name || '');
  const [description, setDescription] = useState(initialData.notes || initialData.description || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.date_start || initialData.startDate));
  const [endDate, setEndDate] = useState(safeDate(initialData.date_end || initialData.endDate));
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
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 2);
  const [goal, setGoal] = useState(initialData.goal || '');
  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData.text || initialData.activity_name || '');
    setDescription(initialData.notes || initialData.description || '');
    setStartDate(safeDate(initialData.date_start || initialData.startDate));
    setEndDate(safeDate(initialData.date_end || initialData.endDate));
    setDeadline(safeDate(initialData.deadline || initialData.dueDate));
    setDuration(initialData.duration || '');
    setKeyAreaId(initialData.key_area_id || initialData.keyAreaId || (keyAreas[0] && keyAreas[0].id) || '');
    setListIndex(initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1);
    setTaskId(initialData.taskId || initialData.task_id || initialData.task || '');
    setAssignee(initialData.responsible || initialData.assignee || '');
    setPriority(initialData.priority ?? initialData.priority_level ?? 2);
    setGoal(initialData.goal || '');
  }, [isOpen, initialData, keyAreas, availableLists]);

  if (!isOpen) return null;

  const handleSave = () => {
    const payload = {
      ...initialData,
      text: (title || '').trim(),
      notes: (description || '').trim(),
      date_start: startDate || null,
      date_end: endDate || null,
      deadline: deadline || null,
      duration: duration || null,
      key_area_id: keyAreaId || null,
      list: listIndex,
      taskId: taskId || null,
      assignee: assignee || null,
      priority,
      goal: goal || null,
    };
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  // shared styles to match screenshot
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
            Edit Activity
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
            <label className="text-sm font-medium text-slate-700" htmlFor="ka-activity-title">Activity name</label>
            <input
              id="ka-activity-title"
              name="title"
              required
              className={`${inputCls} mt-0.5`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity name"
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
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
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
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
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
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
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
                    {keyAreas.map((ka) => (
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
                    {availableLists.map((n) => (
                      <option key={n} value={n}>List {n}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Task</label>
                <div className="relative mt-0.5">
                  <select
                    name="task_id"
                    className={selectCls}
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                  >
                    <option value="">— Select Task —</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
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
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

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
                    {goals.map((g) => (
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
