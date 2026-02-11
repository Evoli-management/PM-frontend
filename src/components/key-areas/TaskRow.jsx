import React, { useRef, useState, useEffect } from 'react';
import StatusIndicator from '../ui/StatusIndicator';
import PriorityBadge from '../ui/PriorityBadge';
import { getQuadrantColorClass } from '../../utils/keyareasHelpers';
import { FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';

const TaskRow = ({
  t,
  q,
  goals = [],
  // isSaving: boolean indicating this row is saving
  isSaving = false,
  // optional callback: (id, key, value) => Promise
  updateField,
  // if true, enable inline editing interactions
  enableInlineEditing = false,
  // list of users for assignee selection: [{id,name}]
  users = [],
  // id of the current user so we can store/display "Me" when assigning to self
  currentUserId = null,
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
  onRowClick,
  disableOpen = false,
  visibleColumns = null,
}) => {
  const vc = visibleColumns ?? {
    responsible: true,
    priority: true,
    quadrant: true,
    start_date: true,
    end_date: true,
    deadline: true,
    duration: true,
    completed: true,
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const [editingKey, setEditingKey] = useState(null);
  const [localValue, setLocalValue] = useState("");
  const clickTimer = useRef(null);
  const dateInputRefs = useRef({});
  
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      // If click is inside the menu or on the menu button, keep it open
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (menuBtnRef.current && menuBtnRef.current.contains(e.target)) return;
      setMenuOpen(false);
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
      className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
      onMouseEnter={onMouseEnter}
      onClick={() => onRowClick && onRowClick(t)}
    >
      <td className="px-3 py-2 align-top">
        <div className="relative inline-flex items-center gap-2">
          <input
            type="checkbox"
            aria-label={`Select ${t.title}`}
            checked={!!isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="relative">
            <button
              ref={menuBtnRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                try { e.stopPropagation(); e.preventDefault(); } catch (__) {}
                setMenuOpen((s) => !s);
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-600"
              title="More actions"
            >
              <FaEllipsisV />
            </button>
            {menuOpen && (
              <div 
                ref={menuRef} 
                id={`task-row-menu-${t.id}`} 
                style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 160, marginTop: '0.25rem' }} 
                className="bg-white border border-slate-200 rounded shadow"
              >
              <button
                type="button"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                onClick={(e) => { try { e.stopPropagation(); } catch (__) {} setMenuOpen(false); onEditClick && onEditClick(); }}
              >
                <FaEdit className="w-3 h-3" />
                Edit
              </button>
              <button
                type="button"
                className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={async (e) => {
                  try { e.stopPropagation(); } catch (__) {}
                  setMenuOpen(false);
                  if (typeof onDeleteClick === 'function') {
                    const ok = window.confirm(`Delete task "${t.title}"?`);
                    if (ok) {
                      try {
                        await onDeleteClick();
                      } catch (err) {
                        console.error('Delete failed:', err);
                      }
                    }
                  }
                }}
              >
                <FaTrash className="w-3 h-3" />
                Delete
              </button>
            </div>
            )}
          </div>
        </div>
      </td>
      <td
        className={`px-3 py-2 align-top`}
        onDoubleClick={(e) => {
          // Allow double-click to enter inline edit even when disableOpen is true.
          // Clear any pending single-click action and open the inline editor.
          try { if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; } } catch (__) {}
          if (enableInlineEditing) {
            e.stopPropagation();
            setLocalValue(t.title || '');
            setEditingKey('name');
          }
        }}
        title={enableInlineEditing ? 'Double-click to edit' : undefined}
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
          {enableInlineEditing ? (
            editingKey === 'name' ? (
              <input
                autoFocus
                className="border rounded px-1 py-0.5 text-sm w-full"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={async () => {
                  setEditingKey(null);
                  if (localValue !== t.title && typeof updateField === 'function') {
                    try { await updateField(t.id, 'name', localValue); } catch (e) {}
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setLocalValue(t.title);
                    setEditingKey(null);
                  }
                }}
              />
            ) : (
              <span
                className={`${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-blue-700 hover:underline font-semibold'}`}
                title={disableOpen ? 'Double-click to edit' : undefined}
              >
                {t.title}
              </span>
            )
          ) : (
            disableOpen ? (
              <span className={`${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-blue-700 font-semibold'}`}>{t.title}</span>
            ) : (
              <span
                className={`${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-blue-700 hover:underline font-semibold'}`}
              >
                {t.title}
              </span>
            )
          )}
          {isSaving && (
            <div className="text-xs text-blue-600 mt-1">Saving...</div>
          )}
        </div>
      </td>
      {vc.responsible && (
        <td className="px-3 py-2 align-top text-slate-800">
          {enableInlineEditing ? (
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm w-20"
            value={(() => {
              if (t.assignee === 'Me' && currentUserId) return String(currentUserId);
              const found = (users || []).find((u) => (u.name || '') === t.assignee);
              return found ? String(found.id) : '';
            })()}
            onChange={async (e) => {
              const sel = e.target.value;
              const user = (users || []).find((u) => String(u.id) === String(sel));
              const valueToSave = user ? ((currentUserId && String(user.id) === String(currentUserId)) ? 'Me' : (user.name || '')) : '';
              try { await updateField && updateField(t.id, 'assignee', valueToSave); } catch (err) {}
            }}
          >
            <option value="">—</option>
            {(users || []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          ) : (
            t.assignee || '—'
          )}
        </td>
      )}
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-2">
          <StatusIndicator status={t.status || "open"} />
          <div>
            <select
              aria-label={`Change status for ${t.title}`}
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm w-18"
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
      {vc.priority && (
        <td className="px-3 py-2 align-top">
          {enableInlineEditing ? (
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
              value={(() => {
                const raw = t.priority ?? t.priority_level ?? t.priorityLevel ?? null;
                if (raw === 1 || raw === '1' || String(raw) === '1') return 'low';
                if (raw === 3 || raw === '3' || String(raw) === '3') return 'high';
                const s = String(raw || '').toLowerCase();
                if (s === 'low' || s === 'high' || s === 'normal') return s;
                return 'normal';
              })()}
              onChange={async (e) => {
                const v = e.target.value;
                try { await updateField && updateField(t.id, 'priority', v); } catch (err) {}
              }}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          ) : (
            (() => {
              const raw = t.priority ?? t.priority_level ?? t.priorityLevel ?? null;
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
            })()
          )}
        </td>
      )}
      {vc.quadrant && (
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
      )}
      {/* Goal and Tags columns removed per UX request */}
      {vc.start_date && (
        <td className="px-3 py-2 align-top text-slate-800">
        {enableInlineEditing ? (
          <div className="relative inline-block">
            <button
              type="button"
              className="hover:bg-slate-100 rounded px-1 flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setEditingKey('start_date');
                setTimeout(() => {
                  const input = dateInputRefs.current['start_date'];
                  if (input?.showPicker) {
                    input.showPicker();
                  } else {
                    input?.focus();
                  }
                }, 0);
              }}
              title="Edit start date"
            >
              <span>{toDateOnly(t.start_date) || '—'}</span>
              {editingKey === 'start_date' && <span className="text-sm">📅</span>}
            </button>
            <input
              ref={(el) => { dateInputRefs.current['start_date'] = el; }}
              type="date"
              className="absolute opacity-0"
              style={{ width: 0, height: 0 }}
              value={toDateOnly(t.start_date) || ''}
              onChange={async (e) => {
                const v = e.target.value || '';
                try { await updateField && updateField(t.id, 'start_date', v); } catch (e) {}
              }}
              onBlur={() => setEditingKey(null)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          toDateOnly(t.start_date) || '—'
        )}
        </td>
      )}
      {vc.end_date && (
        <td className="px-3 py-2 align-top text-slate-800">
        {enableInlineEditing ? (
          <div className="relative inline-block">
            <button
              type="button"
              className="hover:bg-slate-100 rounded px-1 flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setEditingKey('end_date');
                setTimeout(() => {
                  const input = dateInputRefs.current['end_date'];
                  if (input?.showPicker) {
                    input.showPicker();
                  } else {
                    input?.focus();
                  }
                }, 0);
              }}
              title="Edit end date"
            >
              <span>{toDateOnly(t.end_date) || '—'}</span>
              {editingKey === 'end_date' && <span className="text-sm">📅</span>}
            </button>
            <input
              ref={(el) => { dateInputRefs.current['end_date'] = el; }}
              type="date"
              className="absolute opacity-0"
              style={{ width: 0, height: 0 }}
              value={toDateOnly(t.end_date) || ''}
              onChange={async (e) => {
                const v = e.target.value || '';
                try { await updateField && updateField(t.id, 'end_date', v); } catch (e) {}
              }}
              onBlur={() => setEditingKey(null)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          toDateOnly(t.end_date) || '—'
        )}
        </td>
      )}
      {vc.deadline && (
        <td className="px-3 py-2 align-top text-slate-800">
        {enableInlineEditing ? (
          <div className="relative inline-block">
            <button
              type="button"
              className="hover:bg-slate-100 rounded px-1 flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setEditingKey('deadline');
                setTimeout(() => {
                  const input = dateInputRefs.current['deadline'];
                  if (input?.showPicker) {
                    input.showPicker();
                  } else {
                    input?.focus();
                  }
                }, 0);
              }}
              title="Edit deadline"
            >
              <span>{toDateOnly(t.deadline || t.dueDate) || '—'}</span>
              {editingKey === 'deadline' && <span className="text-sm">📅</span>}
            </button>
            <input
              ref={(el) => { dateInputRefs.current['deadline'] = el; }}
              type="date"
              className="absolute opacity-0"
              style={{ width: 0, height: 0 }}
              value={toDateOnly(t.deadline || t.dueDate) || ''}
              onChange={async (e) => {
                const v = e.target.value || '';
                try { await updateField && updateField(t.id, 'dueDate', v); } catch (e) {}
              }}
              onBlur={() => setEditingKey(null)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          toDateOnly(t.deadline) || '—'
        )}
        </td>
      )}
      {vc.duration && (
        <td className="px-3 py-2 align-top text-slate-800">{formatDuration(t.start_date || t.deadline, t.end_date)}</td>
      )}
      {vc.completed && (
        <td className="px-3 py-2 align-top text-slate-800">
          {toDateOnly(t.completionDate || t.completion_date) ? <span>{toDateOnly(t.completionDate || t.completion_date)}</span> : <span className="text-slate-500">—</span>}
        </td>
      )}
      
    </tr>
  );
};

export default TaskRow;
