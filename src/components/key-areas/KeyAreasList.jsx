import React from 'react';
import { FaLock, FaEdit, FaTrash } from 'react-icons/fa';

export default function KeyAreasList({
  loading,
  showOnlyIdeas,
  ideaForShow,
  filteredKAs,
  dragKAId,
  openKA,
  reorderByDrop,
  setDragKAId,
  setEditing,
  setShowForm,
  onDeleteKA,
}) {
  return (
    <>
      {/* LIST: Key Areas (extracted) */}
      <div>
        {loading ? (
          <div className="text-slate-700">Loading…</div>
        ) : showOnlyIdeas ? (
          // render Ideas as a single centered full-width card
          <div className="flex justify-center">
            <div
              key={ideaForShow.id}
              className="w-full max-w-3xl bg-white rounded-2xl shadow border border-slate-200 p-6 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{ideaForShow.title}</h3>
                    {ideaForShow.is_default && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <FaLock /> Locked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{ideaForShow.description || '—'}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
                  Position: 10
                </span>
                <p className="text-sm text-slate-700 ml-2">This Key Area is read-only (cannot edit or delete).</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl">
            <ol className="divide-y divide-slate-200">
              {filteredKAs
                .slice()
                .sort((a, b) => {
                  // Ideas/default areas always go to the end
                  const aIsIdeas = (a.title || '').toLowerCase() === 'ideas' || a.is_default;
                  const bIsIdeas = (b.title || '').toLowerCase() === 'ideas' || b.is_default;
                  if (aIsIdeas && !bIsIdeas) return 1;
                  if (!aIsIdeas && bIsIdeas) return -1;
                  // For non-Ideas areas, sort by position
                  return (a.position || 0) - (b.position || 0);
                })
                .map((ka, idx) => (
                  <li
                    key={ka.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-md ${
                      ka.is_default ? '' : 'hover:bg-slate-50 cursor-grab active:cursor-grabbing'
                    }`}
                    draggable={!ka.is_default}
                    onClick={(e) => {
                      if (dragKAId) return;
                      openKA(ka);
                    }}
                    onDragStart={(e) => {
                      if (ka.is_default) return;
                      setDragKAId(String(ka.id));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (ka.is_default) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      if (!dragKAId || String(dragKAId) === String(ka.id)) return;
                      await reorderByDrop(String(dragKAId), String(ka.id));
                      setDragKAId(null);
                    }}
                    onDragEnd={() => setDragKAId(null)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0"
                        style={{
                          backgroundColor: ka.color ? `${ka.color}66` : '#e2e8f0',
                          color: ka.color || '#334155',
                        }}
                      >
                        {ka.position && ka.position > 0 ? ka.position : idx + 1}
                      </span>
                      <div className="min-w-0 select-none">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold truncate cursor-inherit text-slate-700">{ka.title}</span>
                          {ka.is_default && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <FaLock /> Locked
                            </span>
                          )}
                        </div>
                        {ka.description ? <div className="text-xs text-slate-600 truncate">{ka.description}</div> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Row click opens lists; keep lightweight edit/delete actions only */}
                      <button
                        className="rounded-md bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center p-2 text-xs border border-slate-200"
                        title="Edit"
                        aria-label="Edit key area"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(ka);
                          setShowForm(true);
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        disabled={ka.is_default || (ka.title || '').toLowerCase() === 'ideas'}
                        title={
                          ka.is_default || (ka.title || '').toLowerCase() === 'ideas'
                            ? 'Cannot delete the Ideas key area'
                            : typeof ka.taskCount === 'number' && ka.taskCount > 0
                            ? `${ka.taskCount} task(s) present`
                            : undefined
                        }
                        aria-label="Delete key area"
                        className={`rounded-md flex items-center justify-center p-2 text-xs border ${
                          ka.is_default || (ka.title || '').toLowerCase() === 'ideas'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-slate-200'
                            : 'bg-white text-red-600 hover:bg-red-50 border-red-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteKA(ka);
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        )}

        {/* Info message removed per request */}
      </div>
    </>
  );
}
