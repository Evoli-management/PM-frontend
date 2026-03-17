import { useCallback, useMemo, useState } from 'react';
import api from '../api/keyAreasPageApi.js';

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import('../../../services/keyAreaService');
    _keyAreaService = mod.default || mod;
    return _keyAreaService;
};

export default function useKeyAreasCrud({
    keyAreas,
    setKeyAreas,
    location,
    filter,
    editing,
    setEditing,
    setShowForm,
    selectedKA,
    setSelectedKA,
    allTasks,
    setAllTasks,
    sortForSidebar,
}) {
    const [dragKAId, setDragKAId] = useState(null);

    const nonIdeasCount = useMemo(
        () => keyAreas.filter((item) => (item.title || '').toLowerCase() !== 'ideas' && !item.is_default).length,
        [keyAreas],
    );

    const canAdd = useMemo(() => nonIdeasCount < 9, [nonIdeasCount]);

    const filteredKAs = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const params = new URLSearchParams(location.search);
        const explicitSelect = params.get('select');

        if (explicitSelect === 'ideas') {
            return keyAreas.filter((item) => (item.title || '').toLowerCase() === 'ideas' || item.is_default);
        }

        if (!q) return keyAreas;

        return keyAreas.filter(
            (item) =>
                item.title.toLowerCase().includes(q) ||
                (item.description || '').toLowerCase().includes(q),
        );
    }, [filter, keyAreas, location.search]);

    const showOnlyIdeas = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('select') === 'ideas';
    }, [location.search]);

    const ideaForShow = useMemo(
        () => keyAreas.find((item) => (item.title || '').toLowerCase() === 'ideas') || null,
        [keyAreas],
    );

    const onSaveKA = useCallback(async (e) => {
        e.preventDefault();

        const form = new FormData(e.currentTarget);
        const payload = {
            title: form.get('title').toString().trim(),
            description: form.get('description').toString().trim(),
            color: form.get('color').toString().trim() || '#3B82F6',
        };
        if (!payload.title) return;

        if (editing) {
            const updated = await api.updateKeyArea(editing.id, {
                title: payload.title,
                description: payload.description,
                color: payload.color,
            });

            setKeyAreas((prev) =>
                prev.map((item) => (
                    item.id === editing.id
                        ? {
                            ...item,
                            title: payload.title,
                            description: payload.description,
                            color: payload.color,
                            ...updated,
                        }
                        : item
                )),
            );

            try {
                const updatedList = (keyAreas || []).map((item) => (
                    item.id === editing.id
                        ? {
                            ...item,
                            title: payload.title,
                            description: payload.description,
                            color: payload.color,
                            ...updated,
                        }
                        : item
                ));
                const sidebarList = sortForSidebar(updatedList);
                window.dispatchEvent(new CustomEvent('sidebar-keyareas-data', { detail: { keyAreas: sidebarList } }));
            } catch {}
        } else {
            const isRegular = (item) => (item.title || '').toLowerCase() !== 'ideas' && !item.is_default;
            const used = new Set(keyAreas.filter(isRegular).map((item) => item.position));
            let pos = 1;
            while (used.has(pos) && pos <= 9) pos++;

            try {
                const created = await api.createKeyArea({
                    title: payload.title,
                    description: payload.description,
                    color: payload.color,
                    position: pos,
                    is_default: false,
                });

                setKeyAreas((prev) => {
                    const regular = prev.filter(isRegular);
                    const others = prev.filter((item) => !isRegular(item));
                    const nextRegular = [
                        ...regular.filter((item) => item.position !== pos),
                        { ...created, position: pos },
                    ].sort((a, b) => (a.position || 0) - (b.position || 0));
                    return [...others, ...nextRegular].sort((a, b) => (a.position || 0) - (b.position || 0));
                });

                try {
                    const regular = (keyAreas || []).filter(isRegular);
                    const others = (keyAreas || []).filter((item) => !isRegular(item));
                    const nextRegular = [
                        ...regular.filter((item) => item.position !== pos),
                        { ...created, position: pos },
                    ].sort((a, b) => (a.position || 0) - (b.position || 0));
                    const after = [...others, ...nextRegular];
                    const sidebarList = sortForSidebar(after);
                    window.dispatchEvent(new CustomEvent('sidebar-keyareas-data', { detail: { keyAreas: sidebarList } }));
                } catch {}
            } catch (err) {
                const msg = err?.response?.data?.message || err?.message || 'Action not allowed';
                alert(`Cannot create key area: ${msg}`);
            }
        }

        setShowForm(false);
        setEditing(null);
    }, [editing, keyAreas, setEditing, setKeyAreas, setShowForm, sortForSidebar]);

    const onDeleteKA = useCallback(async (ka) => {
        if (ka.is_default) return;

        const isSelected = selectedKA?.id && String(selectedKA.id) === String(ka.id);
        const loadedCount = isSelected && Array.isArray(allTasks) ? allTasks.length : 0;
        const serverCount = typeof ka.taskCount === 'number' ? ka.taskCount : 0;
        const effectiveCount = Math.max(loadedCount, serverCount);

        let proceed = true;
        if (effectiveCount > 0) {
            proceed = confirm(
                `"${ka.title}" has ${effectiveCount} task(s).\n` +
                    'You need to move or delete these tasks first.\n\n' +
                    'Do you still want to try deleting the key area now?',
            );
            if (!proceed) return;
        } else {
            proceed = confirm(`Delete "${ka.title}"?`);
            if (!proceed) return;
        }

        try {
            await api.deleteKeyArea(ka.id);
            const next = (keyAreas || []).filter((item) => item.id !== ka.id);
            setKeyAreas(next);

            try {
                const sidebarList = sortForSidebar(next);
                window.dispatchEvent(new CustomEvent('sidebar-keyareas-data', { detail: { keyAreas: sidebarList } }));
            } catch {}

            if (selectedKA?.id === ka.id) {
                setSelectedKA(null);
                setAllTasks([]);
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'This key area has tasks and cannot be deleted until tasks are moved or removed.';
            alert(`Cannot delete "${ka.title}": ${msg}`);

            try {
                const fresh = await api.listKeyAreas();
                setKeyAreas(fresh);
            } catch {}
        }
    }, [allTasks, keyAreas, selectedKA, setAllTasks, setKeyAreas, setSelectedKA, sortForSidebar]);

    const reorderByDrop = useCallback(async (fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return;

        const ordered = (keyAreas || [])
            .filter((item) => (item.title || '').toLowerCase() !== 'ideas' && !item.is_default)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        const fromIdx = ordered.findIndex((item) => String(item.id) === String(fromId));
        const toIdx = ordered.findIndex((item) => String(item.id) === String(toId));
        if (fromIdx < 0 || toIdx < 0) return;

        const nextOrdered = ordered.slice();
        const [moved] = nextOrdered.splice(fromIdx, 1);
        nextOrdered.splice(toIdx, 0, moved);

        const withPos = nextOrdered.map((item, index) => ({ ...item, position: index + 1 }));
        const changed = withPos.filter(
            (item, index) => ordered[index]?.id !== item.id || ordered[index]?.position !== item.position,
        );

        try {
            if (changed.length) {
                const svc = await getKeyAreaService();
                await svc.reorder(changed);
            }

            setKeyAreas((prev) => {
                const map = new Map(prev.map((item) => [String(item.id), { ...item }]));
                withPos.forEach((item) => {
                    map.set(String(item.id), { ...map.get(String(item.id)), position: item.position });
                });
                const next = Array.from(map.values()).sort((a, b) => (a.position || 0) - (b.position || 0));

                try {
                    const sidebarList = sortForSidebar(next);
                    window.dispatchEvent(new CustomEvent('sidebar-keyareas-data', { detail: { keyAreas: sidebarList } }));
                } catch {}

                return next;
            });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Could not reorder';
            alert(msg);
        }
    }, [keyAreas, setKeyAreas, sortForSidebar]);

    return {
        canAdd,
        filteredKAs,
        showOnlyIdeas,
        ideaForShow,
        dragKAId,
        setDragKAId,
        onSaveKA,
        onDeleteKA,
        reorderByDrop,
    };
}
