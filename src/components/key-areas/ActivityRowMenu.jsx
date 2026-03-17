import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaAngleDoubleLeft, FaEdit, FaEllipsisV, FaTrash } from 'react-icons/fa';

export default function ActivityRowMenu({
    activity,
    getActivityService,
    setActivitiesByTask,
    t,
    taskId,
}) {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const updateMenuPos = () => {
        const btn = btnRef.current;
        if (!btn) return;
        const menuWidth = menuRef.current?.offsetWidth || 176;
        const rect = btn.getBoundingClientRect();
        const scrollHost =
            btn.closest('.overflow-x-auto') ||
            btn.closest('.overflow-auto') ||
            btn.closest('[class*="overflow"]');
        const hostRect = scrollHost?.getBoundingClientRect?.() || null;
        let left = rect.left;
        const minLeft = hostRect ? hostRect.left + 8 : 8;
        const maxLeft = hostRect
            ? hostRect.right - menuWidth - 8
            : window.innerWidth - menuWidth - 8;
        if (left > maxLeft) left = Math.max(minLeft, maxLeft);
        if (left < minLeft) left = minLeft;
        const top = rect.bottom + 4;
        setMenuPos({ top, left });
    };

    useEffect(() => {
        if (!open) return;
        const onDown = (event) => {
            if (menuRef.current && menuRef.current.contains(event.target)) return;
            if (btnRef.current && btnRef.current.contains(event.target)) return;
            setOpen(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        const onReposition = () => updateMenuPos();
        updateMenuPos();
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [open]);

    const toggle = (event) => {
        event.stopPropagation();
        setOpen((current) => !current);
    };

    const handleEdit = () => {
        setOpen(false);
        try {
            window.dispatchEvent(new CustomEvent('ka-open-activity-editor', { detail: { activity, taskId } }));
        } catch (_) {}
    };

    const handleDelete = async () => {
        setOpen(false);
        if (!confirm(`Delete activity "${activity?.text || activity?.activity_name || 'Untitled activity'}"?`)) {
            return;
        }
        try {
            const activityService = await getActivityService();
            await activityService.remove(activity.id);
            setActivitiesByTask((prev) => {
                const key = String(taskId || activity.task_id || activity.taskId || '');
                if (!key) return prev;
                const updated = { ...prev };
                updated[key] = (updated[key] || []).filter((item) => item.id !== activity.id);
                return updated;
            });
        } catch (error) {
            console.error('Failed to delete activity:', error);
        }
    };

    const handleConvert = () => {
        setOpen(false);
        try {
            window.dispatchEvent(new CustomEvent('ka-create-task-from-activity', { detail: { taskId, activity } }));
        } catch (_) {}
    };

    return (
        <div className="inline-block relative">
            <button
                type="button"
                ref={btnRef}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={toggle}
                className="p-1 rounded hover:bg-slate-100 text-slate-600"
                title="More actions"
            >
                <FaEllipsisV />
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            top: menuPos.top,
                            left: menuPos.left,
                            zIndex: 1000,
                            minWidth: 176,
                        }}
                        className="bg-white border border-slate-200 rounded shadow"
                    >
                        <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                            onClick={handleEdit}
                        >
                            <FaEdit className="text-slate-600" />
                            <span>Edit</span>
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={handleDelete}
                        >
                            <FaTrash />
                            <span>{t('keyAreas.deleteActivity')}</span>
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={handleConvert}
                        >
                            <FaAngleDoubleLeft />
                            <span>{t('keyAreas.convertToTask')}</span>
                        </button>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
