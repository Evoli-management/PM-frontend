import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import StatusIndicator from '../ui/StatusIndicator';
import PriorityBadge from '../ui/PriorityBadge';
import { getQuadrantColorClass } from '../../utils/keyareasHelpers';
import { FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';
import { useFormattedDate } from '../../hooks/useFormattedDate';
import { durationToTimeInputValue } from '../../utils/duration';
import DurationPicker from '../shared/DurationPicker.jsx';

const TaskRow = ({
  t: task,
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
  const { t } = useTranslation();
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
  const lastDateCommitRef = useRef({});
  
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

  useEffect(() => {
    return () => {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
    };
  }, []);

  const queueTitleOpen = (e) => {
    try { e.stopPropagation(); } catch (__) {}
    if (!onRowClick) return;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onRowClick(task);
    }, 180);
  };

  const commitDateFieldChange = async (field, rawValue) => {
    if (typeof updateField !== 'function') return;
    const value = rawValue || '';
    const stamp = `${field}:${value}`;
    if (lastDateCommitRef.current[field] === stamp) return;
    lastDateCommitRef.current[field] = stamp;
    setEditingKey(null);
    try {
      await updateField(task.id, field, value);
    } finally {
      setTimeout(() => {
        if (lastDateCommitRef.current[field] === stamp) {
          delete lastDateCommitRef.current[field];
        }
      }, 0);
    }
  };

  
  return (
    <tr
      className={`border-t border-slate-200 hover:bg-slate-50 transition-colors ${rowClassName}`.trim()}
      onMouseEnter={onMouseEnter}
    >
      <td className="px-3 py-2 align-top w-12">
        <div className="relative inline-flex items-center gap-2">
          <input
            type="checkbox"
            aria-label={`Select ${task.title}`}
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
                id={`task-row-menu-${task.id}`}
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1000, minWidth: 160 }}
                className="bg-white border border-slate-200 rounded shadow"
              >
                <button
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  onClick={(e) => { try { e.stopPropagation(); } catch (__) {} setMenuOpen(false); onEditClick && onEditClick(); }}
                >
                  <FaEdit className="w-3 h-3" />
                  {t("taskRow.edit")}
                </button>
                <button
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  onClick={async (e) => {
                    try { e.stopPropagation(); } catch (__) {}
                    setMenuOpen(false);
                    if (typeof onDeleteClick === 'function') {
                      const ok = window.confirm(t("taskRow.deleteConfirm"));
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
                  {t("taskRow.delete")}
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </td>
      <td
        className={`px-3 py-2 align-top w-[240px] overflow-hidden ${disableOpen ? '' : 'cursor-pointer'}`.trim()}
        onClick={disableOpen || editingKey === 'name' ? undefined : queueTitleOpen}
        onDoubleClick={enableInlineEditing && !disableOpen ? (e) => {
          try { if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; } } catch (__) {}
          e.stopPropagation();
          setLocalValue(task.title || '');
          setEditingKey('name');
        } : undefined}
      >
        <div className="flex items-start gap-2">
          {(() => {
            const lvl = getPriorityLevel ? getPriorityLevel(task.priority) : 2;
            if (lvl === 2) return null;
            if (lvl === 3) {
              return (
                <img src={`${import.meta.env.BASE_URL}high-priority.svg`} alt="High priority" className="mt-0.5 inline-block shrink-0 w-2 h-4" title="Priority: High" />
              );
            }
            return (
              <img src={`${import.meta.env.BASE_URL}low-priority-down.svg`} alt="Low priority" className="mt-0.5 inline-block shrink-0 w-2 h-4" title="Priority: Low" />
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
                    if (localValue !== task.title && typeof updateField === 'function') {
                      try { await updateField(task.id, 'name', localValue); } catch (e) {}
                    }
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setLocalValue(task.title);
                      setEditingKey(null);
                    }
                  }}
                />
              ) : (
                <div
                  className={`max-w-[540px] truncate text-sm ${String(task.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                  title="Double click to edit"
                >
                  {task.title}
                </div>
              )
            ) : (
              <div
                className={`max-w-[540px] truncate text-sm ${String(task.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}
              >
                {task.title}
              </div>
            )}
            <div className="text-xs text-slate-500">{task.notes || task.description || ''}</div>
          </div>
          {isSaving && (
            <div className="text-xs text-blue-600 ml-2">{t("taskRow.saving")}</div>
          )}
        </div>
      </td>
      {vc.responsible && (
        <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
          <div className="w-full">
          {enableInlineEditing ? (
          <select
            className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
            value={(() => {
              const delegatedToUserId = task.delegatedToUserId || task.delegated_to_user_id || null;
              if (delegatedToUserId) return String(delegatedToUserId);
              if (task.assignee === 'Me' && currentUserId) return String(currentUserId);
              const found = (users || []).find((u) => (u.name || '') === task.assignee);
              return found ? String(found.id) : '';
            })()}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={async (e) => {
              e.stopPropagation();
              const sel = e.target.value;
              try { await updateField && updateField(task.id, 'assignee', sel || null); } catch (err) {}
            }}
          >
            <option value="">—</option>
            {(users || []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          ) : (
            task.assignee || '—'
          )}
          </div>
        </td>
      )}
      <td className="px-3 py-2 align-top w-[96px]">
        <div className="flex w-full items-center gap-2">
          <div className="shrink-0">
            <StatusIndicator status={task.status || "open"} />
          </div>
          <div className="min-w-0 flex-1">
            <select
              aria-label={`Change status for ${task.title}`}
              className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
              value={String(task.status || "open").toLowerCase()}
              onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
            >
              <option value="open">{t("taskRow.openOpt")}</option>
              <option value="in_progress">{t("taskRow.inProgressOpt")}</option>
              <option value="done">{t("taskRow.doneOpt")}</option>
            </select>
          </div>
        </div>
      </td>
      {vc.priority && (
        <td className="px-3 py-2 align-top w-[96px]">
          <div className="w-full">
          {enableInlineEditing ? (
            (() => {
              const priorityValue = (() => {
                const raw = task.priority ?? task.priority_level ?? task.priorityLevel ?? null;
                if (raw === 1 || raw === '1' || String(raw) === '1') return 'low';
                if (raw === 3 || raw === '3' || String(raw) === '3') return 'high';
                const s = String(raw || '').toLowerCase();
                if (s === 'low' || s === 'high' || s === 'normal') return s;
                return 'normal';
              })();
              return (
                <select
                  className="w-full min-w-0 rounded-md border border-slate-300 bg-white py-0.5 text-sm px-2"
                  value={priorityValue}
                  onChange={async (e) => {
                    const v = e.target.value;
                    try { await updateField && updateField(task.id, 'priority', v); } catch (err) {}
                  }}
                >
                  <option value="high">{t("taskRow.highOpt")}</option>
                  <option value="normal">{t("taskRow.normalOpt")}</option>
                  <option value="low" style={{ color: "#6b7280" }}>{t("taskRow.lowOpt")}</option>
                </select>
              );
            })()
          ) : (
            (() => {
              const raw = task.priority ?? task.priority_level ?? task.priorityLevel ?? null;
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
          </div>
        </td>
      )}
      {vc.quadrant && (
        <td className="px-3 py-2 align-top w-[96px]">
        <div className="flex w-full justify-start">
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
        </div>
        </td>
      )}
      {/* Goal and Tags columns removed per UX request */}
      {vc.start_date && (
        <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
        {enableInlineEditing ? (
          <div className="relative block w-full">
            <button
              type="button"
              className="flex w-full items-center justify-start gap-1 rounded px-1 text-left hover:bg-slate-100"
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
              <span>{(task.start_date) ? formatDate(task.start_date) : '—'}</span>
            </button>
            <input
              ref={(el) => { dateInputRefs.current['start_date'] = el; }}
              type="date"
              className="absolute opacity-0"
              style={{ width: 0, height: 0 }}
              value={toDateOnly(task.start_date) || ''}
              onInput={(e) => { void commitDateFieldChange('start_date', e.target.value); }}
              onChange={(e) => { void commitDateFieldChange('start_date', e.target.value); }}
              onBlur={() => setEditingKey(null)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          (task.start_date) ? formatDate(task.start_date) : '—'
        )}
        </td>
      )}
      {vc.end_date && (
        <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
        {enableInlineEditing ? (
          <div className="relative block w-full">
            <button
              type="button"
              className="flex w-full items-center justify-start gap-1 rounded px-1 text-left hover:bg-slate-100"
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
              <span>{(task.end_date) ? formatDate(task.end_date) : '—'}</span>
            </button>
            <input
              ref={(el) => { dateInputRefs.current['end_date'] = el; }}
              type="date"
              className="absolute opacity-0"
              style={{ width: 0, height: 0 }}
              value={toDateOnly(task.end_date) || ''}
              onInput={(e) => { void commitDateFieldChange('end_date', e.target.value); }}
              onChange={(e) => { void commitDateFieldChange('end_date', e.target.value); }}
              onBlur={() => setEditingKey(null)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          (task.end_date) ? formatDate(task.end_date) : '—'
        )}
        </td>
      )}
      {vc.deadline && (
        <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
        {enableInlineEditing ? (
          <div className="relative block w-full">
            <button
              type="button"
              className="flex w-full items-center justify-start gap-1 rounded px-1 text-left hover:bg-slate-100"
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
              <span>{(task.deadline || task.dueDate) ? formatDate(task.deadline || task.dueDate) : '—'}</span>
            </button>
            <input
              ref={(el) => { dateInputRefs.current['deadline'] = el; }}
              type="date"
              className="absolute opacity-0"
              style={{ width: 0, height: 0 }}
              value={toDateOnly(task.deadline || task.dueDate) || ''}
              min={toDateOnly(task.start_date || task.startDate) || undefined}
              max={toDateOnly(task.end_date || task.endDate) || undefined}
              onInput={(e) => { void commitDateFieldChange('dueDate', e.target.value); }}
              onChange={(e) => { void commitDateFieldChange('dueDate', e.target.value); }}
              onBlur={() => setEditingKey(null)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          (task.deadline || task.dueDate) ? formatDate(task.deadline || task.dueDate) : '—'
        )}
        </td>
      )}
      {vc.duration && (
        <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
          <div className="w-full text-left">
            {(() => {
              const raw = task.duration ?? task.duration_minutes ?? '';
              const val = String(raw ?? '').trim();
              const normalized = durationToTimeInputValue(raw);
              if (!enableInlineEditing) return val || '—';
              if (editingKey === 'duration') {
                return (
                  <DurationPicker
                    value={localValue}
                    onChange={(nextValue) => setLocalValue(nextValue)}
                    onClose={async (reason, nextValue) => {
                      if (reason !== 'done') {
                        setLocalValue(normalized);
                        setEditingKey(null);
                        return;
                      }
                      setLocalValue(nextValue || '');
                      setEditingKey(null);
                      if ((nextValue || '') !== normalized && typeof updateField === 'function') {
                        try { await updateField(task.id, 'duration', nextValue || null); } catch (e) {}
                      }
                    }}
                    compact
                    autoFocus
                    className="w-full"
                    allowClear
                    hoursAriaLabel="Task duration hours"
                    minutesAriaLabel="Task duration minutes"
                  />
                );
              }
              return (
                <button
                  type="button"
                  className="w-full rounded px-1 text-left hover:bg-slate-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalValue(normalized);
                    setEditingKey('duration');
                  }}
                  title="Edit duration"
                >
                  {normalized || val || '—'}
                </button>
              );
            })()}
          </div>
        </td>
      )}
      {vc.completed && (
        <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
          <div className="w-full text-left">
            {(task.completionDate || task.completion_date) ? <span>{formatDate(task.completionDate || task.completion_date)}</span> : <span className="text-slate-500">—</span>}
          </div>
        </td>
      )}
      
    </tr>
  );
};

export default TaskRow;
