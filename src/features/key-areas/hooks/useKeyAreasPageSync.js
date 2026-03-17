import { useEffect, useRef, useState } from 'react';

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
    const lastSearchRef = useRef(location.search);
    const lastSyncedViewRef = useRef(viewTab);

    useEffect(() => {
        // Only sync state from the URL when the URL search string actually changes.
        // This prevents a user-triggered viewTab update from being immediately overwritten
        // by the previous URL state (causing a "bounce" between tabs).
        if (location.search === lastSearchRef.current) return;
        lastSearchRef.current = location.search;

        const params = new URLSearchParams(location.search || '');
        const viewParam = params.get('view');
        const activeParam = params.get('active');

        if (
            viewParam &&
            ALLOWED_VIEWS.has(viewParam) &&
            viewParam !== viewTab &&
            viewParam !== lastSyncedViewRef.current
        ) {
            setViewTab(viewParam);
            lastSyncedViewRef.current = viewParam;
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
        // When switching to My Focus the app navigates away from /key-areas entirely,
        // so there's no need to keep the query params in sync while on that view.
        if (viewTab === 'my-focus') return;

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
            lastSyncedViewRef.current = viewTab;
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
