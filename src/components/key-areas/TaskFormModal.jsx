import React, { useEffect, useState } from 'react';

const TaskFormModal = ({ isOpen, initialData = {}, onSave, onCancel, isSaving = false }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [assignee, setAssignee] = useState(initialData.assignee || '');
  const [startDate, setStartDate] = useState(initialData.start_date || '');
  const [endDate, setEndDate] = useState(initialData.end_date || '');
  const [deadline, setDeadline] = useState(initialData.deadline || '');
  const [priority, setPriority] = useState(initialData.priority || 'med');
  const [status, setStatus] = useState(initialData.status || 'open');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData.title || '');
    setDescription(initialData.description || '');
    setAssignee(initialData.assignee || '');
    setStartDate(initialData.start_date || '');
    setEndDate(initialData.end_date || '');
    setDeadline(initialData.deadline || '');
    setPriority(initialData.priority || 'med');
    setStatus(initialData.status || 'open');
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    const payload = {
      ...initialData,
      title: title.trim(),
      description: description.trim(),
      assignee: assignee || null,
      start_date: startDate || null,
      end_date: endDate || null,
      deadline: deadline || null,
      priority,
      status,
    };
    onSave && onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onCancel} />
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-lg border border-slate-200 p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{initialData.id ? 'Edit task' : 'Create task'}</h3>
          <button type="button" className="text-slate-600" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              className="w-full mt-1 rounded border border-slate-300 p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Task title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="w-full mt-1 rounded border border-slate-300 p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Assignee</label>
              <input className="w-full mt-1 rounded border border-slate-300 p-2" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Priority</label>
              <select className="w-full mt-1 rounded border border-slate-300 p-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="med">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Start date</label>
              <input type="date" className="w-full mt-1 rounded border border-slate-300 p-2" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">End date</label>
              <input type="date" className="w-full mt-1 rounded border border-slate-300 p-2" value={endDate || ''} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Deadline</label>
              <input type="date" className="w-full mt-1 rounded border border-slate-300 p-2" value={deadline || ''} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select className="w-full mt-1 rounded border border-slate-300 p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded bg-white border border-slate-200" onClick={onCancel}>Cancel</button>
          <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white" onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
