import React from 'react';
import { FaSpinner, FaCheckCircle, FaRegCircle, FaAlignJustify, FaTag, FaTrash, FaEdit, FaAngleDoubleLeft, FaChevronUp, FaChevronDown } from 'react-icons/fa';

const ActivityRow = ({
  a,
  index,
  listLength,
  toggleComplete,
  savingActivityIds,
  remove,
  onEdit,
  onCreateAsTask,
  move,
  getPriorityLevel,
  taskPriority,
}) => {
  const isSaving = savingActivityIds && savingActivityIds.has(a.id);
  const eff = a.priority ?? taskPriority ?? 2;
  const lvl = getPriorityLevel ? getPriorityLevel(eff) : 2;
  return (
    <div key={a.id} className="bg-white rounded border border-slate-200 p-2 mb-2">
      <div className="flex items-center">
        <button
          type="button"
          disabled={isSaving}
          className={`${a.completed ? 'mr-2 text-blue-600' : 'mr-2 text-slate-500'} ${isSaving ? 'opacity-60 cursor-wait' : 'hover:text-blue-600'}`}
          title={isSaving ? 'Saving...' : (a.completed ? 'Unmark' : 'Mark completed')}
          onClick={() => toggleComplete && toggleComplete(a.id)}
        >
          {isSaving ? (
            <FaSpinner className="animate-spin" />
          ) : a.completed ? (
            <FaCheckCircle />
          ) : (
            <FaRegCircle />
          )}
        </button>
        <span className="inline-flex items-center justify-center w-9 h-8 border rounded mr-2 text-[#4DC3D8]" title="Drag handle">
          <FaAlignJustify />
        </span>
        <div className="relative flex-1">
          <div className={`w-full border rounded px-2 py-1 pr-16 bg-white ${a.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
            {(a.text || a.activity_name || '').trim() || 'Untitled activity'}
          </div>
          <button type="button" className="absolute right-14 top-1.5 text-[#4DC3D8]" title="Tag">
            <FaTag />
          </button>
        </div>
        <div className="ml-2 flex items-center gap-2 text-slate-600">
          {(() => {
            if (lvl === 2) return null;
            const cls = lvl === 3 ? 'text-red-600' : 'text-emerald-600';
            return (
              <span className={`inline-block text-sm font-bold ${cls}`} title={`Priority: ${lvl === 3 ? 'high' : 'low'}`}>
                !
              </span>
            );
          })()}
          <button type="button" className="text-red-600" title="Delete activity" onClick={() => remove && remove(a.id)}>
            <FaTrash />
          </button>
          <button type="button" className="text-slate-700" title="Edit activity" onClick={() => onEdit && onEdit()}>
            <FaEdit />
          </button>
          <button
            type="button"
            className={a.created_task_id ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700'}
            title={a.created_task_id ? 'Already created a task from this activity' : 'Create as task'}
            disabled={!!a.created_task_id}
            onClick={() => onCreateAsTask && onCreateAsTask()}
          >
            <FaAngleDoubleLeft />
          </button>
          <div className="flex flex-col ml-1">
            <button type="button" className="text-slate-500 disabled:opacity-40" title="Move up" onClick={() => move && move(a.id, 'up')} disabled={index === 0}>
              <FaChevronUp />
            </button>
            <button type="button" className="text-slate-500 disabled:opacity-40" title="Move down" onClick={() => move && move(a.id, 'down')} disabled={index === listLength - 1}>
              <FaChevronDown />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-1 text-xs text-amber-700" id={`activity-message-${a.id}`}></div>
    </div>
  );
};

export default ActivityRow;
