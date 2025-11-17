import React, { useRef } from 'react';
import { FaTimes, FaSave, FaExclamationCircle } from 'react-icons/fa';

export default function KeyAreaModal({ isOpen, editing, onSave, onCancel }) {
    const colorRef = useRef(null);

    if (!isOpen) return null;

    const isLocked = Boolean(editing?.is_default) || (String(editing?.title || '').toLowerCase() === 'ideas');

    const onSwatchClick = (color) => {
        if (colorRef.current) {
            colorRef.current.value = color;
            // emit input/change for any listeners
            colorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
            colorRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-[92vw] max-w-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Key Area' : 'New Key Area'}</h2>
                    <button className="p-2 rounded-lg hover:bg-slate-50" onClick={onCancel}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={onSave} className="grid gap-3">
                    <div>
                        <label className="text-sm font-semibold text-slate-900">Title *</label>
                        <input
                            name="title"
                            required
                            defaultValue={editing?.title || ''}
                            readOnly={isLocked}
                            disabled={isLocked}
                            className="mt-1 w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-700"
                            placeholder="e.g., Finance"
                        />
                        {isLocked ? (
                            <p className="text-xs text-slate-600 mt-1">The "Ideas" key area cannot be renamed.</p>
                        ) : null}
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-900">Description</label>
                        <textarea
                            name="description"
                            rows={3}
                            defaultValue={editing?.description || ''}
                            className="mt-1 w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-400"
                            placeholder="What belongs to this area?"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-900">Color</label>
                        <div className="flex items-center gap-2">
                            <input
                                ref={colorRef}
                                type="color"
                                name="color"
                                defaultValue={editing?.color || '#3B82F6'}
                                className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer"
                                title="Choose color for this Key Area"
                            />
                            <div className="flex flex-wrap gap-2">
                                {[
                                    '#3B82F6', // Blue
                                    '#10B981', // Green
                                    '#F59E0B', // Amber
                                    '#8B5CF6', // Purple
                                    '#EC4899', // Pink
                                    '#06B6D4', // Cyan
                                    '#84CC16', // Lime
                                    '#F97316', // Orange
                                ].map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => onSwatchClick(color)}
                                        className="w-6 h-6 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        aria-label={`Choose ${color}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2">
                            <FaSave /> Save
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-3 py-2 rounded-lg bg-white border text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="text-xs text-slate-700 flex items-start gap-2">
                        <FaExclamationCircle className="mt-0.5" />
                        <span>
                            “Ideas” is locked and always at position 10. Enforce max 10 on server too.
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
}
