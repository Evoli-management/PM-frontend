import { useEffect, useState } from 'react';

const ALLOWED_VIEWS = new Set(['active-tasks', 'delegated', 'todo', 'activity-trap', 'my-focus']);

export default function useKeyAreasPageSync({
    activeFilter,
    getCalendarService,
    location,
    navigate,
    setActiveFilter,
    setViewTab,
    viewTab,
}) {
    const [syncActive, setSyncActive] = useState(false);
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const viewParam = params.get('view');
        const activeParam = params.get('active');

        if (viewParam && ALLOWED_VIEWS.has(viewParam) && viewParam !== viewTab) {
            setViewTab(viewParam);
        }

        if (
            activeParam &&
            (activeParam === 'active' || activeParam === 'all' || activeParam === 'completed') &&
            activeParam !== activeFilter
        ) {
            setActiveFilter(activeParam);
        } else if (
            !activeParam &&
            (viewParam === 'active-tasks' || (!viewParam && viewTab === 'active-tasks')) &&
            activeFilter !== 'all'
        ) {
            setActiveFilter('all');
        }
    }, [activeFilter, location.search, setActiveFilter, setViewTab, viewTab]);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        let changed = false;

        if (params.get('view') !== viewTab) {
            params.set('view', viewTab);
            changed = true;
        }

        if (viewTab === 'active-tasks') {
            if (params.get('active') !== activeFilter) {
                params.set('active', activeFilter);
                changed = true;
            }
        } else if (params.has('active')) {
            params.delete('active');
            changed = true;
        }

        if (changed) {
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
        }
    }, [activeFilter, location.pathname, location.search, navigate, viewTab]);

    useEffect(() => {
        let ignore = false;

        (async () => {
            try {
                const calendarService = await getCalendarService();
                const status = await calendarService.getSyncStatus();
                if (!ignore) setSyncActive(!!(status?.google?.connected || status?.microsoft?.connected));
            } catch {
                if (!ignore) setSyncActive(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, [getCalendarService]);

    useEffect(() => {
        if (!syncActive) return undefined;

        const intervalId = window.setInterval(() => setRefreshTick((tick) => tick + 1), 15000);
        return () => window.clearInterval(intervalId);
    }, [syncActive]);

    useEffect(() => {
        if (viewTab === 'my-focus') {
            navigate('/my-focus');
        }
    }, [navigate, viewTab]);

    return { refreshTick };
}
