import { useCallback, useEffect, useRef } from 'react';

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import('../../../services/keyAreaService');
    _keyAreaService = mod.default || mod;
    return _keyAreaService;
};

export default function useKeyAreasSelection({
    loading,
    keyAreas,
    setKeyAreas,
    location,
    navigate,
    selectedKA,
    setSelectedKA,
    allTasks,
    setAllTasks,
    viewTab,
    setViewTab,
    panelViewMode,
    selectedTaskFull,
    setSelectedTaskFull,
    selectedTaskInPanel,
    setSelectedTaskInPanel,
    setSelectedActivityIdsInPanel,
    setSelectedActivityCountInPanel,
    setActivitiesByTask,
    setTaskTab,
    setSearchTerm,
    setSiteSearch,
    setQuadrant,
    setShowTaskComposer,
    setEditingActivityViaTaskModal,
    setExpandedActivityRows,
    setOpenActivityDetails,
    setEditingActivity,
    setFilter,
    openTaskInKeyAreaPanels,
    setTaskFullInitialTab,
}) {
    const openingKaIdRef = useRef(null);
    const suppressKaParamOpenRef = useRef(false);

    const showAllKeyAreas = useCallback(() => {
        suppressKaParamOpenRef.current = true;
        setSelectedKA(null);
        setAllTasks([]);
        setFilter('');
    }, [setAllTasks, setFilter, setSelectedKA]);

    const selectIdeas = useCallback(async () => {
        if (loading) return;

        const found = keyAreas.find((item) => item.title?.toLowerCase() === 'ideas' || item.is_default);
        if (!found) return;

        setSelectedKA(null);
        setAllTasks([]);
        setFilter(found.title || 'Ideas');
    }, [keyAreas, loading, setAllTasks, setFilter, setSelectedKA]);

    const openKA = useCallback(async (ka) => {
        if (!ka?.id) return;

        const nextId = String(ka.id);
        if (openingKaIdRef.current === nextId) return;

        const isSameKa = selectedKA && String(selectedKA.id) === nextId;
        const needsContextReset =
            viewTab !== 'active-tasks' ||
            !!selectedTaskFull ||
            !!selectedTaskInPanel ||
            panelViewMode === 'simple';

        if (isSameKa && !needsContextReset) return;

        openingKaIdRef.current = nextId;

        try {
            setSelectedTaskFull(null);
            setSelectedTaskInPanel(null);
            setSelectedActivityIdsInPanel(new Set());
            setSelectedActivityCountInPanel(0);
            setSelectedKA(ka);
            setAllTasks([]);
            setActivitiesByTask({});
            setTaskTab(1);
            setViewTab('active-tasks');
            setSearchTerm('');
            setSiteSearch('');
            setQuadrant('all');
            setShowTaskComposer(false);
            setEditingActivityViaTaskModal(null);
            setExpandedActivityRows(new Set());
            setOpenActivityDetails(new Set());
            setEditingActivity(null);
        } finally {
            openingKaIdRef.current = null;
        }
    }, [
        panelViewMode,
        selectedKA,
        selectedTaskFull,
        selectedTaskInPanel,
        setActivitiesByTask,
        setAllTasks,
        setEditingActivity,
        setEditingActivityViaTaskModal,
        setExpandedActivityRows,
        setOpenActivityDetails,
        setQuadrant,
        setSearchTerm,
        setSelectedActivityCountInPanel,
        setSelectedActivityIdsInPanel,
        setSelectedKA,
        setSelectedTaskFull,
        setSelectedTaskInPanel,
        setShowTaskComposer,
        setSiteSearch,
        setTaskTab,
        setViewTab,
        viewTab,
    ]);

    useEffect(() => {
        const handleSidebarReorder = async (e) => {
            const reorderedKAs = e?.detail?.keyAreas;
            if (!Array.isArray(reorderedKAs)) return;

            setKeyAreas(reorderedKAs);

            try {
                const svc = await getKeyAreaService();
                const changed = reorderedKAs.filter((ka, idx) => {
                    const oldKa = keyAreas[idx];
                    return !oldKa || oldKa.id !== ka.id || oldKa.position !== ka.position;
                });

                if (changed.length > 0) {
                    await svc.reorder(changed);
                }
            } catch (err) {
                console.warn('Failed to persist sidebar reorder:', err);
            }
        };

        window.addEventListener('sidebar-keyareas-click', showAllKeyAreas);
        window.addEventListener('sidebar-ideas-click', selectIdeas);
        window.addEventListener('sidebar-keyareas-reorder', handleSidebarReorder);

        const params = new URLSearchParams(location.search);
        if (params.get('view') === 'all') showAllKeyAreas();
        if (params.get('select') === 'ideas') selectIdeas();

        return () => {
            window.removeEventListener('sidebar-keyareas-click', showAllKeyAreas);
            window.removeEventListener('sidebar-ideas-click', selectIdeas);
            window.removeEventListener('sidebar-keyareas-reorder', handleSidebarReorder);
        };
    }, [keyAreas, loading, location.search, selectIdeas, setKeyAreas, showAllKeyAreas]);

    useEffect(() => {
        const handler = (e) => {
            const id = e?.detail?.id;
            if (!id) return;

            const found = (keyAreas || []).find((item) => String(item.id) === String(id));
            if (found) openKA(found);
        };

        window.addEventListener('sidebar-open-ka', handler);
        return () => window.removeEventListener('sidebar-open-ka', handler);
    }, [keyAreas, openKA]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const kaParam = params.get('ka');
        const taskParam = params.get('task');
        const activityParam = params.get('activity');
        const openPanelTaskParam = params.get('openPanelTask');

        if (suppressKaParamOpenRef.current) {
            if (!kaParam) suppressKaParamOpenRef.current = false;
            return;
        }

        if (kaParam && keyAreas.length) {
            const found = keyAreas.find((item) => String(item.id) === String(kaParam));
            if (
                found &&
                (
                    !selectedKA ||
                    String(selectedKA.id) !== String(found.id) ||
                    viewTab !== 'active-tasks'
                )
            ) {
                openKA(found);
            }
        }

        if (taskParam && selectedKA && String(selectedKA.id) === String(kaParam)) {
            const hit = (allTasks || []).find((task) => String(task.id) === String(taskParam));
            if (!hit) return;

            if (openPanelTaskParam === '1') {
                openTaskInKeyAreaPanels(hit, { activityId: activityParam });
                return;
            }

            setSelectedTaskFull(hit);
            if (activityParam) setTaskFullInitialTab('activities');
        }
    }, [
        allTasks,
        keyAreas,
        location.search,
        openKA,
        openTaskInKeyAreaPanels,
        selectedKA,
        setSelectedTaskFull,
        setTaskFullInitialTab,
        viewTab,
    ]);

    useEffect(() => {
        const isOnKeyAreas = location.pathname && location.pathname.startsWith('/key-areas');
        if (!isOnKeyAreas) return;

        const params = new URLSearchParams(location.search || '');
        const hasOpenKA = params.get('openKA') === '1';
        const hasKASelected = Boolean(params.get('ka'));
        if (!hasOpenKA || hasKASelected) return;
        if (!keyAreas || keyAreas.length === 0) return;

        const sorted = [...keyAreas].sort((a, b) => (a.position || 0) - (b.position || 0));
        const firstNonIdeas = sorted.find((item) => !((item.title || '').toLowerCase() === 'ideas' || item.is_default));
        const first = firstNonIdeas || sorted[0];
        if (!first?.id) return;

        const next = new URLSearchParams(location.search || '');
        next.set('ka', String(first.id));
        next.set('openKA', '1');
        if (!next.get('view')) next.set('view', 'active-tasks');
        if (!next.get('active')) next.set('active', 'all');

        navigate({ pathname: '/key-areas', search: `?${next.toString()}` }, { replace: true });

        try {
            window.dispatchEvent(new CustomEvent('sidebar-open-ka', { detail: { id: first.id } }));
        } catch {}
    }, [keyAreas, location.pathname, location.search, navigate]);

    return {
        openKA,
        showAllKeyAreas,
    };
}
