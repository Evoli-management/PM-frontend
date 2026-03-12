import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { FaSpinner, FaCheckCircle, FaRegCircle, FaAlignJustify, FaTag, FaTrash, FaEdit, FaAngleDoubleRight, FaChevronUp, FaChevronDown, FaEllipsisV } from 'react-icons/fa';
import { toDateOnly, getPriorityLabel, mapUiStatusToServer, getStatusColorClass, getPriorityColorClass, resolveAssignee } from '../../utils/keyareasHelpers';
import { durationToTimeInputValue } from '../../utils/duration';
import DurationPicker from '../shared/DurationPicker.jsx';

const ActivityRow = ({
  a,
  index,
  listLength,
  selected = false,
  onToggleSelect = null,
  toggleComplete,
  savingActivityIds,
  remove,
  onEdit,
  onCreateAsTask,
  move,
  getPriorityLevel,
  taskPriority,
  // inline editing props
  enableInlineEditing = false,
  updateField = null,
  // optional users list for responsible dropdown: [{id,name}]
  users = [],
  currentUserId = null,
  taskAssignee = null,
}) => {
  const { t } = useTranslation();
  const isSaving = savingActivityIds && savingActivityIds.has(a.id);
  const eff = a.priority ?? taskPriority ?? 2;
  const lvl = getPriorityLevel ? getPriorityLevel(eff) : 2;
  const [editingKey, setEditingKey] = useState(null);
  const [localValue, setLocalValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const startDateValue = toDateOnly(a.start_date || a.startDate) || '';
  const endDateValue = toDateOnly(a.end_date || a.endDate) || '';
  const durationRaw = String(a.duration ?? '').trim();
  const durationInputValue = durationToTimeInputValue(a.duration);
  const [durationDisplay, setDurationDisplay] = useState(durationInputValue || durationRaw || '');
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
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
      const menuHeight = menuRef.current?.offsetHeight || 140;
      const menuWidth = menuRef.current?.offsetWidth || 176;
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
    setDurationDisplay(durationInputValue || durationRaw || '');
  }, [durationInputValue, durationRaw]);
  return (
    <div key={a.id} className="bg-white rounded border border-slate-200 p-2 mb-2">
      <div className="flex flex-col">
        <div className="flex items-center">
          {typeof onToggleSelect === 'function' && (
            <input
              type="checkbox"
              className="mr-2"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(a.id);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${(a.text || a.activity_name || 'activity').trim() || 'activity'}`}
            />
          )}
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
          <div className="relative mr-2">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              ref={menuBtnRef}
              onClick={(e) => {
                e.stopPropagation();
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
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1000, minWidth: 176 }}
                className="bg-white border border-slate-200 rounded shadow-lg"
              >
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit && onEdit(a); }}>
                  <FaEdit className="text-slate-600" />
                  <span>{t("activityRow.edit")}</span>
                </button>
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (confirm(`Delete activity \"${(a.text||a.activity_name||'Untitled activity')}\"?`)) remove && remove(a.id); }}>
                  <FaTrash />
                  <span>{t("activityRow.delete")}</span>
                </button>
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onCreateAsTask && onCreateAsTask(a); }}>
                  <FaAngleDoubleRight />
                  <span>{t("activityRow.convertToTask")}</span>
                </button>
              </div>,
              document.body
            )}
          </div>
          <span className="inline-flex items-center justify-center w-9 h-8 border rounded mr-2 text-[#4DC3D8]" title="Drag handle">
            <FaAlignJustify />
          </span>
          <div className="relative flex-1">
            <div className={`w-full border rounded px-2 py-1 pr-16 bg-white ${a.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
              {enableInlineEditing ? (
                editingKey === 'text' ? (
                  <input
                    autoFocus
                    className="border rounded px-1 py-0.5 text-sm w-full"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={async () => {
                      setEditingKey(null);
                      if (typeof updateField === 'function' && localValue !== (a.text || a.activity_name || '')) {
                        try { await updateField(a.id, 'text', localValue); } catch (e) { console.error(e); }
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                      else if (e.key === 'Escape') { setLocalValue(a.text || a.activity_name || ''); setEditingKey(null); }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="text-slate-800 text-left w-full cursor-pointer"
                    title="Double click to edit"
                    onClick={(e) => { e.stopPropagation(); setLocalValue((a.text || a.activity_name || '').trim()); setEditingKey('text'); }}
                    onDoubleClick={(e) => { e.stopPropagation(); setLocalValue((a.text || a.activity_name || '').trim()); setEditingKey('text'); }}
                  >
                    {(a.text || a.activity_name || '').trim() || 'Untitled activity'}
                  </button>
                )
              ) : (
                (a.text || a.activity_name || '').trim() || 'Untitled activity'
              )}
            </div>
            <button type="button" className="absolute right-14 top-1.5 text-[#4DC3D8]" title="Tag">
              <FaTag />
            </button>
          </div>
          <div className="ml-2 flex items-center gap-2 text-slate-600">
            {(() => {
              if (lvl === 2) return null;
              if (lvl === 3) {
                return (
                  <span className="inline-block text-xs font-bold leading-none text-red-600" title="Priority: High">
                    !
                  </span>
                );
              }
              return (
                <span className="inline-block text-xs font-bold leading-none text-slate-500" title="Priority: Low">
                  ↓
                </span>
              );
            })()}
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
      </div>
      {/* inline small row for responsible / status / priority / dates when inline editing is enabled */}
      <div className="mt-2 flex items-center gap-4 text-sm text-slate-700">
        {/* Responsible */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">{t("activityRow.responsible")}</div>
          {typeof updateField === 'function' ? (
                editingKey === 'assignee' ? (
              <select
                autoFocus
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
                value={(() => resolveAssignee({ activity: a, taskAssignee, users, currentUserId }).selectValue)()}
                onChange={async (e) => {
                  const sel = e.target.value;
                  // For activities, persist responsible as user id via delegatedToUserId.
                  try { await updateField && updateField(a.id, 'assignee', sel || null); } catch (err) {}
                  setEditingKey(null);
                }}
                onBlur={() => setEditingKey(null)}
              >
                <option value="">—</option>
                {Array.isArray(users) && users.length ? users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>)) : (<option value="Me">Me</option>)}
              </select>
              ) : (
              <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingKey('assignee'); }} title="Edit responsible">
                {resolveAssignee({ activity: a, taskAssignee, users, currentUserId }).display}
              </button>
            )
          ) : (
            <div>{a.assignee || '—'}</div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">{t("activityRow.status")}</div>
          {typeof updateField === 'function' ? (
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
              value={String(a.status || 'open').toLowerCase()}
              onChange={async (e) => {
                const ui = e.target.value;
                try { await updateField && updateField(a.id, 'status', mapUiStatusToServer(ui)); } catch (err) {}
              }}
            >
              <option value="open">{t("activityRow.openOpt")}</option>
              <option value="in_progress">{t("activityRow.inProgressOpt")}</option>
              <option value="done">{t("activityRow.doneOpt")}</option>
            </select>
          ) : (
            (() => {
              const cls = getStatusColorClass ? getStatusColorClass(a.status).badge : 'bg-slate-100 text-slate-700';
              return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${cls}`}>{String(a.status || '').replace('_', ' ') || 'Open'}</span>;
            })()
          )}
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">{t("activityRow.priority")}</div>
          {typeof updateField === 'function' ? (
            (() => {
              const priorityValue = (() => {
                const raw = a.priority ?? a.priority_level ?? a.priorityLevel ?? eff;
                if (raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low') return 'low';
                if (raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high') return 'high';
                return 'normal';
              })();
              return (
                <select
                  className="w-[96px] rounded-md border border-slate-300 bg-white py-0.5 text-sm px-2"
                  value={priorityValue}
                  onChange={async (e) => {
                    const v = e.target.value;
                    try { await updateField && updateField(a.id, 'priority', v); } catch (err) {}
                  }}
                >
                  <option value="high">{t("activityRow.highOpt")}</option>
                  <option value="normal">{t("activityRow.normalOpt")}</option>
                  <option value="low" style={{ color: "#6b7280" }}>{t("activityRow.lowOpt")}</option>
                </select>
              );
            })()
          ) : (
            (() => {
              const lvlLocal = getPriorityLevel ? getPriorityLevel(a.priority ?? a.priority_level ?? eff) : 2;
              if (lvlLocal === 2) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">{t("activityRow.normalOpt")}</span>;
              return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${lvlLocal === 3 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{lvlLocal === 3 ? t("activityRow.highOpt") : t("activityRow.lowOpt")}</span>;
            })()
          )}
        </div>

        {/* Dates: start / end / deadline */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-xs text-slate-500">{t("activityRow.start")}</div>
          {typeof updateField === 'function' ? (
            editingKey === 'start_date' ? (
              <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={startDateValue} onChange={async (e) => { try { await updateField && updateField(a.id, 'start_date', e.target.value); } catch (err) {} setEditingKey(null); }} onBlur={() => setEditingKey(null)} />
            ) : (
              <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingKey('start_date'); }} title="Edit start date">{startDateValue || '—'}</button>
            )
          ) : (
            <div>{startDateValue || '—'}</div>
          )}

          <div className="text-xs text-slate-500">{t("activityRow.end")}</div>
          {typeof updateField === 'function' ? (
            editingKey === 'end_date' ? (
              <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={endDateValue} onChange={async (e) => { try { await updateField && updateField(a.id, 'end_date', e.target.value); } catch (err) {} setEditingKey(null); }} onBlur={() => setEditingKey(null)} />
            ) : (
              <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingKey('end_date'); }} title="Edit end date">{endDateValue || '—'}</button>
            )
          ) : (
            <div>{endDateValue || '—'}</div>
          )}

          <div className="text-xs text-slate-500">{t("createTaskModal.durationLabel")}</div>
          {typeof updateField === 'function' ? (
            editingKey === 'duration' ? (
              <DurationPicker
                value={localValue}
                onChange={setLocalValue}
                onClose={async (reason, nextValue) => {
                  if (reason !== 'done') {
                    setLocalValue(durationInputValue);
                    setEditingKey(null);
                    return;
                  }
                  setLocalValue(nextValue || '');
                  setDurationDisplay(nextValue || '');
                  setEditingKey(null);
                  if ((nextValue || '') !== durationInputValue) {
                    try { await updateField(a.id, 'duration', nextValue || null); } catch (err) {}
                  }
                }}
                compact
                autoFocus
                className="w-full"
                allowClear
                hoursAriaLabel="Activity duration hours"
                minutesAriaLabel="Activity duration minutes"
              />
            ) : (
              <button
                className="hover:bg-slate-50 rounded px-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalValue(durationToTimeInputValue(durationDisplay) || durationInputValue);
                  setEditingKey('duration');
                }}
                title="Edit duration"
              >
                {durationDisplay || '—'}
              </button>
            )
          ) : (
            <div>{durationDisplay || '—'}</div>
          )}

          <div className="text-xs text-slate-500">{t("activityRow.deadline")}</div>
          {typeof updateField === 'function' ? (
            editingKey === 'deadline' ? (
              <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={toDateOnly(a.deadline) || ''} onChange={async (e) => { try { await updateField && updateField(a.id, 'deadline', e.target.value); } catch (err) {} setEditingKey(null); }} onBlur={() => setEditingKey(null)} />
            ) : (
              <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingKey('deadline'); }} title="Edit deadline">{toDateOnly(a.deadline) || '—'}</button>
            )
          ) : (
            <div>{toDateOnly(a.deadline) || '—'}</div>
          )}
        </div>

      </div>

      <div className="mt-1 text-xs text-amber-700" id={`activity-message-${a.id}`}></div>
    </div>
  );
};

export default ActivityRow;
