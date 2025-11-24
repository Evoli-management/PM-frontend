import React, { useRef, useState, useEffect } from 'react';
import StatusIndicator from '../ui/StatusIndicator';
import PriorityBadge from '../ui/PriorityBadge';
import { getQuadrantColorClass } from '../../utils/keyareasHelpers';
import { FaEdit, FaTrash } from 'react-icons/fa';

const TaskRow = ({
  t,
  q,
  goals = [],
  isSaving = false,
  // optional Map like object mapping goal id -> title for fast stable lookup
  goalMap = null,
  isSelected,
  onToggleSelect,
  onOpenTask,
  onStatusChange,
  onToggleActivitiesRow,
  activityCount,
  getPriorityLevel,
  toDateOnly,
  formatDuration,
  onMouseEnter,
  expandedActivity,
  onEditClick,
  onDeleteClick,
  disableOpen = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  return (
    <tr
      className="border-t border-slate-200 hover:bg-slate-50"
      onMouseEnter={onMouseEnter}
    >
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          aria-label={`Select ${t.title}`}
          checked={!!isSelected}
          onChange={onToggleSelect}
        />
      </td>
      <td
        className={`px-3 py-2 align-top ${disableOpen ? '' : 'cursor-pointer'}`}
        onClick={disableOpen ? undefined : () => onOpenTask && onOpenTask(t)}
        title={disableOpen ? undefined : 'Open task'}
      >
        <div className="flex items-start gap-2">
          {(() => {
            const lvl = getPriorityLevel ? getPriorityLevel(t.priority) : 2;
            if (lvl === 2) return null;
            const cls = lvl === 3 ? "text-red-600" : "text-emerald-600";
            const label = lvl === 3 ? "High" : "Low";
            return (
              <span
                className={`mt-0.5 inline-block text-sm font-bold ${cls}`}
                title={`Priority: ${label}`}
              >
                !
              </span>
            );
          })()}
          {disableOpen ? (
            <span className={`${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-blue-700 font-semibold'}`}>{t.title}</span>
          ) : (
            <button
              type="button"
              className={`${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-blue-700 hover:underline font-semibold'}`}
              title="Click to open task"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTask && onOpenTask(t);
              }}
            >
              {t.title}
            </button>
          )}
          {isSaving && (
            <div className="text-xs text-blue-600 mt-1">Saving...</div>
          )}
        </div>
      </td>
      <td className="px-3 py-2 align-top text-slate-800">{t.assignee || '—'}</td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-2">
          <StatusIndicator status={t.status || "open"} />
          <div>
            <select
              aria-label={`Change status for ${t.title}`}
              className="rounded-md border border-slate-300 bg-white p-1 text-sm"
              value={String(t.status || "open").toLowerCase()}
              onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        {(() => {
          const raw = t.priority ?? t.priority_level ?? t.priorityLevel ?? null;
          // normalize numeric priorities 1|2|3 to low/med/high
          let norm;
          if (raw === 1 || raw === '1' || String(raw) === '1') norm = 'low';
          else if (raw === 3 || raw === '3' || String(raw) === '3') norm = 'high';
          else {
            const s = String(raw || '').toLowerCase();
            if (s === 'low') norm = 'low';
            else if (s === 'high') norm = 'high';
            else norm = 'med';
          }
          return <PriorityBadge priority={norm} />;
        })()}
      </td>
      <td className="px-3 py-2 align-top">
        {(() => {
          let qn = 4;
          if (typeof q === 'number') qn = Number(q) || 4;
          else if (typeof q === 'string') {
            const m = q.match(/^Q?([1-4])$/i);
            if (m) qn = Number(m[1]);
          }
          const qc = getQuadrantColorClass ? getQuadrantColorClass(qn) : { badge: 'bg-slate-100 text-slate-700' };
          return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${qc.badge}`}>{`Q${qn}`}</span>;
        })()}
      </td>
      <td className="px-3 py-2 align-top text-slate-800">
        {(() => {
          // support multiple goal shapes: goal_id, goalId, goal (id or object)
          // prefer a pre-resolved title when provided by the parent
          if (t && t.resolvedGoalTitle) return t.resolvedGoalTitle;
          const rawGoal = t.goal_id ?? t.goalId ?? t.goal ?? null;
          let gid = null;
          let inlineGoalTitle = null;
          if (!rawGoal) return <span className="text-slate-500">—</span>;
          if (typeof rawGoal === 'object' && rawGoal !== null) {
            gid = rawGoal.id || rawGoal.goal_id || null;
            inlineGoalTitle = rawGoal.title || null;
          } else {
            gid = rawGoal;
          }
          if (inlineGoalTitle) return inlineGoalTitle;
          // Prefer a provided goal map for lookup (fast and resilient)
          try {
            if (goalMap && typeof goalMap.get === 'function') {
              const maybe = goalMap.get(String(gid));
              if (maybe) return maybe;
            } else if (goalMap && (goalMap[String(gid)] || goalMap[String(gid)] === "")) {
              // support plain object maps
              const maybe = goalMap[String(gid)];
              if (maybe) return maybe;
            }
          } catch (_) {}
          const found = (goals || []).find((g) => {
            // match across several possible id fields returned by different services
            const candidates = [g && g.id, g && g.goalId, g && g._id, g && g.goal_id];
            return candidates.some((c) => c !== undefined && String(c) === String(gid));
          });
          // (temporary debug removed)
          if (found) return found.title || `#${gid}`;
          return `#${gid}`;
        })()}
      </td>
      <td className="px-3 py-2 align-top max-w-[240px]">
        <span className="block truncate text-slate-800">
          {(t.tags || "").split(",").filter(Boolean).slice(0, 4).join(", ") || '—'}
        </span>
      </td>
      <td className="px-3 py-2 align-top text-slate-800">{toDateOnly(t.start_date) || '—'}</td>
      <td className="px-3 py-2 align-top text-slate-800">{toDateOnly(t.end_date) || '—'}</td>
      <td className="px-3 py-2 align-top text-slate-800">{toDateOnly(t.deadline) || '—'}</td>
      <td className="px-3 py-2 align-top text-slate-800">{formatDuration(t.start_date || t.deadline, t.end_date)}</td>
      <td className="px-3 py-2 align-top text-slate-800">
        {t.completionDate ? <span>{new Date(t.completionDate).toLocaleString()}</span> : <span className="text-slate-500">—</span>}
      </td>
      <td className="px-3 py-2 align-top text-center w-24">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`Edit ${t.title}`}
            title="Edit task"
            onClick={(e) => {
              e.stopPropagation();
              onEditClick && onEditClick();
            }}
            className="inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium border bg-white text-slate-700 hover:bg-slate-50"
          >
              <FaEdit className="w-3 h-3" />
          </button>

          <button
            type="button"
            aria-label={`Delete ${t.title}`}
            title="Delete task"
            onClick={(e) => {
              e.stopPropagation();
              // confirm before calling delete handler to avoid accidental removal
              if (typeof onDeleteClick === 'function') {
                const ok = window.confirm(`Delete task "${t.title}"?`);
                if (ok) onDeleteClick();
              }
            }}
            className="inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium border bg-white text-red-600 hover:bg-red-50"
          >
            <FaTrash className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TaskRow;
