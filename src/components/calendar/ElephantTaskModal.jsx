import React, { useEffect, useState } from "react";
import elephantTaskService from "../../services/elephantTaskService";
import { useDraggable } from "../../hooks/useDraggable";

export default function ElephantTaskModal({ isOpen, onClose, onSave, taskId }) {
    const [title, setTitle] = useState("");
    const [saving, setSaving] = useState(false);

    const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
    
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (!isOpen) return;
        setTitle("");
        resetPosition();
    }, [isOpen, resetPosition]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        const name = title.trim();
        if (!name) return;
        try {
            setSaving(true);
            await elephantTaskService.createElephantTask({ title: name, taskId: taskId || null });
            onSave?.();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div 
                className="relative z-10 w-[640px] max-w-[95vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'default'
                }}
            >
                <div 
                    className="relative px-5 py-2 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                >
                    <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
                        Create Don't Forget Task
                    </h3>
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2 space-y-2">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block">Title</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0.5"
                            placeholder="e.g., Draft quarterly plan"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm"
                            disabled={saving}
                        >
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
                            {saving ? "Saving..." : "OK"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
