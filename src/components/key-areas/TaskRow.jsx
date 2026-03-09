import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import StatusIndicator from '../ui/StatusIndicator';
import PriorityBadge from '../ui/PriorityBadge';
import { getQuadrantColorClass } from '../../utils/keyareasHelpers';
import { FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';
import { useFormattedDate } from '../../hooks/useFormattedDate';

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
  rowClassName = "",
}) => {
  const { formatDate } = useFormattedDate();
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
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
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

  useEffect(() => {
    if (!menuOpen) return;
    const updatePlacement = () => {
      const btn = menuBtnRef.current;
      if (!btn) return;
      const menuHeight = menuRef.current?.offsetHeight || 120;
      const menuWidth = menuRef.current?.offsetWidth || 160;
      const rect = btn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;
      let left = rect.left;
      const maxLeft = window.innerWidth - menuWidth - 8;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      if (left < 8) left = 8;
      const top = openUp ? Math.max(8, rect.top - menuHeight - 4) : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 4);
      setMenuPos({ top, left });
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [menuOpen]);

  
  return (
    <tr
      className={`border-t border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${rowClassName}`.trim()}
      onMouseEnter={onMouseEnter}
      onClick={() => onRowClick && onRowClick(t)}
    >
      <td className="px-3 py-2 align-top w-12">
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
            {menuOpen && createPortal(
              <div
                ref={menuRef}
                id={`task-row-menu-${t.id}`}
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1000, minWidth: 160 }}
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
              </div>,
              document.body
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 align-top w-[240px] overflow-hidden">
        <div className="flex items-start gap-2">
          {(() => {
            const lvl = getPriorityLevel ? getPriorityLevel(t.priority) : 2;
            if (lvl === 2) return null;
            if (lvl === 3) {
              return (
                <img src="/high-priority.svg" alt="High priority" className="mt-0.5 inline-block shrink-0 w-2 h-4" title="Priority: High" />
              );
            }
            return (
              <img src="/low-priority-down.svg" alt="Low priority" className="mt-0.5 inline-block shrink-0 w-2 h-4" title="Priority: Low" />
            );
          })()}
          <div className="flex flex-col">
            {enableInlineEditing ? (
              editingKey === 'name' ? (
                <input
                  autoFocus
                  className="border rounded px-1 py-0.5 text-sm w-full max-w-[540px]"
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
                <div
                  className={`text-sm truncate max-w-[540px] cursor-pointer ${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                  onDoubleClick={(e) => {
                    try { if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; } } catch (__) {}
                    e.stopPropagation();
                    setLocalValue(t.title || '');
                    setEditingKey('name');
                  }}
                  title="Double click to edit"
                >
                  {t.title}
                </div>
              )
            ) : (
              <div className={`text-sm truncate max-w-[540px] ${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {t.title}
              </div>
            )}
            <div className="text-xs text-slate-500">{t.notes || t.description || ''}</div>
          </div>
          {isSaving && (
            <div className="text-xs text-blue-600 ml-2">Saving...</div>
          )}
        </div>
      </td>
      {vc.responsible && (
        <td className="px-3 py-2 align-top text-slate-800 w-[140px]">
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
              try { await updateField && updateField(t.id, 'assignee', sel || null); } catch (err) {}
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
      <td className="px-3 py-2 align-top w-[120px]">
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
        <td className="px-3 py-2 align-top w-[100px]">
          {enableInlineEditing ? (
            (() => {
              const priorityValue = (() => {
                const raw = t.priority ?? t.priority_level ?? t.priorityLevel ?? null;
                if (raw === 1 || raw === '1' || String(raw) === '1') return 'low';
                if (raw === 3 || raw === '3' || String(raw) === '3') return 'high';
                const s = String(raw || '').toLowerCase();
                if (s === 'low' || s === 'high' || s === 'normal') return s;
                return 'normal';
              })();
              return (
                <select
                  className="w-[96px] rounded-md border border-slate-300 bg-white py-0.5 text-sm px-2"
                  value={priorityValue}
                  onChange={async (e) => {
                    const v = e.target.value;
                    try { await updateField && updateField(t.id, 'priority', v); } catch (err) {}
                  }}
                >
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low" style={{ color: "#6b7280" }}>Low</option>
                </select>
              );
            })()
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
        <td className="px-3 py-2 align-top w-[90px]">
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
        <td className="px-3 py-2 align-top text-slate-800 w-[120px]">
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
              <span>{(t.start_date) ? formatDate(t.start_date) : '—'}</span>
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
          (t.start_date) ? formatDate(t.start_date) : '—'
        )}
        </td>
      )}
      {vc.end_date && (
        <td className="px-3 py-2 align-top text-slate-800 w-[120px]">
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
              <span>{(t.end_date) ? formatDate(t.end_date) : '—'}</span>
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
          (t.end_date) ? formatDate(t.end_date) : '—'
        )}
        </td>
      )}
      {vc.deadline && (
        <td className="px-3 py-2 align-top text-slate-800 w-[120px]">
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
              <span>{(t.deadline || t.dueDate) ? formatDate(t.deadline || t.dueDate) : '—'}</span>
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
          (t.deadline || t.dueDate) ? formatDate(t.deadline || t.dueDate) : '—'
        )}
        </td>
      )}
      {vc.duration && (
        <td className="px-3 py-2 align-top text-slate-800 w-[90px]">
          {(() => {
            const raw = t.duration ?? t.duration_minutes ?? '';
            const val = String(raw).trim();
            return val || '—';
          })()}
        </td>
      )}
      {vc.completed && (
        <td className="px-3 py-2 align-top text-slate-800 w-[120px]">
          {(t.completionDate || t.completion_date) ? <span>{formatDate(t.completionDate || t.completion_date)}</span> : <span className="text-slate-500">—</span>}
        </td>
      )}
      
    </tr>
  );
};

export default TaskRow;
