import React, { useEffect, useState } from "react";
import elephantTaskService from "../../services/elephantTaskService";

export default function ElephantTaskModal({ isOpen, onClose, onSave, taskId }) {
    const [title, setTitle] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTitle("");
    }, [isOpen]);

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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl w-[92vw] max-w-md p-4">
                <h2 className="text-lg font-semibold mb-2">Create Elephant Task</h2>
                <form onSubmit={handleSubmit} className="grid gap-3">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block">Title</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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
                            className="rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 text-sm disabled:opacity-50"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
