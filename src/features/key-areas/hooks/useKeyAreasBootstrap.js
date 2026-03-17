import { useEffect, useState } from 'react';
import api from '../api/keyAreasPageApi.js';

let _usersService = null;
const getUsersService = async () => {
    if (_usersService) return _usersService;
    const mod = await import('../../../services/usersService');
    _usersService = mod.default || mod;
    return _usersService;
};

let _userProfileService = null;
const getUserProfileService = async () => {
    if (_userProfileService) return _userProfileService;
    const mod = await import('../../../services/userProfileService');
    _userProfileService = mod.default || mod;
    return _userProfileService;
};

export default function useKeyAreasBootstrap({ sortForSidebar }) {
    const [loading, setLoading] = useState(true);
    const [keyAreas, setKeyAreas] = useState([]);
    const [goals, setGoals] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [kas, gs] = await Promise.all([api.listKeyAreas(), api.listGoals()]);
                if (cancelled) return;

                const processedKas = (kas || []).map((ka) => {
                    const isIdeas = (ka.title || '').trim().toLowerCase() === 'ideas' || !!ka.is_default;
                    if (isIdeas) return { ...ka, position: 10 };
                    return ka;
                });
                const sorted = processedKas.slice().sort((a, b) => (a.position || 0) - (b.position || 0));

                setKeyAreas(sorted);
                setGoals(gs || []);
                setLoading(false);
            } catch (e) {
                if (cancelled) return;
                const status = e?.response?.status;
                if (status === 401) {
                    window.location.hash = '#/login';
                    return;
                }
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const userService = await getUsersService();
                const list = await userService.list();
                if (!cancelled) setUsers(Array.isArray(list) ? list : []);
            } catch {
                if (!cancelled) setUsers([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const profileService = await getUserProfileService();
                const profile = await profileService.getProfile();
                const id = profile?.id || profile?.userId || profile?.sub || null;
                if (!cancelled && id) setCurrentUserId(id);
            } catch {
                // Keep null if profile fetch fails; auth guard will redirect on 401.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (loading) return;
        try {
            const sidebarList = sortForSidebar(keyAreas);
            window.dispatchEvent(new CustomEvent('sidebar-keyareas-data', { detail: { keyAreas: sidebarList } }));
        } catch {}
    }, [keyAreas, loading, sortForSidebar]);

    return {
        loading,
        keyAreas,
        setKeyAreas,
        goals,
        users,
        currentUserId,
    };
}
