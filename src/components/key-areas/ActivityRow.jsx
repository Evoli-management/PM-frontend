import React, { useState, useRef, useEffect } from 'react';
import { FaSpinner, FaCheckCircle, FaRegCircle, FaAlignJustify, FaTag, FaTrash, FaEdit, FaAngleDoubleRight, FaChevronUp, FaChevronDown, FaEllipsisV } from 'react-icons/fa';
import { toDateOnly, getPriorityLabel, mapUiStatusToServer, getStatusColorClass, getPriorityColorClass, resolveAssignee, selectedUserIdToPersistValue } from '../../utils/keyareasHelpers';

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
  // inline editing props
  enableInlineEditing = false,
  updateField = null,
  // optional users list for responsible dropdown: [{id,name}]
  users = [],
  currentUserId = null,
  taskAssignee = null,
}) => {
  const isSaving = savingActivityIds && savingActivityIds.has(a.id);
  const eff = a.priority ?? taskPriority ?? 2;
  const lvl = getPriorityLevel ? getPriorityLevel(eff) : 2;
  const [editingKey, setEditingKey] = useState(null);
  const [localValue, setLocalValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
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
  return (
    <div key={a.id} className="bg-white rounded border border-slate-200 p-2 mb-2">
      <div className="flex flex-col">
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
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 z-50 min-w-[176px] bg-white border border-slate-200 rounded shadow-lg"
              >
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit && onEdit(a); }}>
                  <FaEdit className="text-slate-600" />
                  <span>Edit</span>
                </button>
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (confirm(`Delete activity \"${(a.text||a.activity_name||'Untitled activity')}\"?`)) remove && remove(a.id); }}>
                  <FaTrash />
                  <span>Delete</span>
                </button>
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onCreateAsTask && onCreateAsTask(a); }}>
                  <FaAngleDoubleRight />
                  <span>Convert to task</span>
                </button>
              </div>
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
              const cls = lvl === 3 ? 'text-red-600' : 'text-emerald-600';
              return (
                <span className={`inline-block text-sm font-bold ${cls}`} title={`Priority: ${lvl === 3 ? 'high' : 'low'}`}>
                  !
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
          <div className="text-xs text-slate-500">Responsible</div>
          {typeof updateField === 'function' ? (
                editingKey === 'assignee' ? (
              <select
                autoFocus
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
                value={(() => resolveAssignee({ activity: a, taskAssignee, users, currentUserId }).selectValue)()}
                onChange={async (e) => {
                  const sel = e.target.value;
                  const valueToSave = selectedUserIdToPersistValue(sel, users, currentUserId);
                  try { await updateField && updateField(a.id, 'assignee', valueToSave); } catch (err) {}
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
          <div className="text-xs text-slate-500">Status</div>
          {typeof updateField === 'function' ? (
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
              value={String(a.status || 'open').toLowerCase()}
              onChange={async (e) => {
                const ui = e.target.value;
                try { await updateField && updateField(a.id, 'status', mapUiStatusToServer(ui)); } catch (err) {}
              }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
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
          <div className="text-xs text-slate-500">Priority</div>
          {typeof updateField === 'function' ? (
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
              value={(() => {
                const raw = a.priority ?? a.priority_level ?? a.priorityLevel ?? eff;
                if (raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low') return 'low';
                if (raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high') return 'high';
                return 'normal';
              })()}
              onChange={async (e) => {
                const v = e.target.value;
                try { await updateField && updateField(a.id, 'priority', v); } catch (err) {}
              }}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          ) : (
            (() => {
              const lvlLocal = getPriorityLevel ? getPriorityLevel(a.priority ?? a.priority_level ?? eff) : 2;
              if (lvlLocal === 2) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Normal</span>;
              return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${lvlLocal === 3 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{lvlLocal === 3 ? 'High' : 'Low'}</span>;
            })()
          )}
        </div>

        {/* Dates: start / end / deadline */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-xs text-slate-500">Start</div>
          {typeof updateField === 'function' ? (
            editingKey === 'start_date' ? (
              <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={toDateOnly(a.start_date) || ''} onChange={async (e) => { try { await updateField && updateField(a.id, 'start_date', e.target.value); } catch (err) {} setEditingKey(null); }} onBlur={() => setEditingKey(null)} />
            ) : (
              <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingKey('start_date'); }} title="Edit start date">{toDateOnly(a.start_date) || '—'}</button>
            )
          ) : (
            <div>{toDateOnly(a.start_date) || '—'}</div>
          )}

          <div className="text-xs text-slate-500">End</div>
          {typeof updateField === 'function' ? (
            editingKey === 'end_date' ? (
              <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={toDateOnly(a.end_date) || ''} onChange={async (e) => { try { await updateField && updateField(a.id, 'end_date', e.target.value); } catch (err) {} setEditingKey(null); }} onBlur={() => setEditingKey(null)} />
            ) : (
              <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingKey('end_date'); }} title="Edit end date">{toDateOnly(a.end_date) || '—'}</button>
            )
          ) : (
            <div>{toDateOnly(a.end_date) || '—'}</div>
          )}

          <div className="text-xs text-slate-500">Deadline</div>
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
