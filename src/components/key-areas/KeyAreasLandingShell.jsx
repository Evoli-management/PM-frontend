import React from 'react';
import KeyAreasList from './KeyAreasList';

export default function KeyAreasLandingShell({
    dragKAId,
    filteredKAs,
    ideaForShow,
    isGlobalTasksView,
    isSearching,
    keyAreas,
    loading,
    onDeleteKA,
    openKA,
    reorderByDrop,
    searchResults,
    setDragKAId,
    setEditing,
    setShowForm,
    selectedKA,
    showOnlyIdeas,
    siteSearch,
}) {
    if (selectedKA || isGlobalTasksView) return null;

    return (
        <>
            {String(siteSearch || '').trim().length >= 2 && (
                <div className="mb-4 bg-white border border-slate-200 rounded-lg shadow-sm p-3">
                    <div className="text-sm font-semibold text-slate-700 mb-2">
                        Search results for “{siteSearch.trim()}”
                    </div>
                    {isSearching ? (
                        <div className="text-sm text-slate-500">Searching…</div>
                    ) : searchResults && searchResults.length ? (
                        <ul className="space-y-2">
                            {searchResults.map((task) => {
                                const ka = (keyAreas || []).find(
                                    (item) =>
                                        String(item.id) ===
                                        String(task.key_area_id || task.keyAreaId || task.key_area),
                                );
                                return (
                                    <li key={task.id} className="text-sm">
                                        <span className="font-semibold text-slate-900">
                                            {task.title || task.name}
                                        </span>
                                        {ka ? (
                                            <span className="text-slate-500"> — {ka.title || ka.name}</span>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="text-sm text-slate-500">No matching tasks found.</div>
                    )}
                </div>
            )}
            <div className="flex-1 min-h-0">
                <KeyAreasList
                    loading={loading}
                    showOnlyIdeas={showOnlyIdeas}
                    ideaForShow={ideaForShow}
                    filteredKAs={filteredKAs}
                    dragKAId={dragKAId}
                    openKA={openKA}
                    reorderByDrop={reorderByDrop}
                    setDragKAId={setDragKAId}
                    setEditing={setEditing}
                    setShowForm={setShowForm}
                    onDeleteKA={onDeleteKA}
                />
            </div>
        </>
    );
}
