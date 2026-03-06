
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaUser, FaBolt, FaTh, FaSearch } from "react-icons/fa";
import userProfileService from "../../services/userProfileService";
import teamsService from "../../services/teamsService";
import taskService from "../../services/taskService";
import activityService from "../../services/activityService";
import * as goalService from "../../services/goalService";
import keyAreaService from "../../services/keyAreaService";
import calendarService from "../../services/calendarService";
import usersService from "../../services/usersService";
import ReminderBell from "./ReminderBell";
import NotificationBell from "./NotificationBell";
import ReminderModal from "../reminders/ReminderModal";
import OrganizationSwitcher from "./OrganizationSwitcher";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [openQuick, setOpenQuick] = useState(false);
    const [openActiveMenu, setOpenActiveMenu] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [hasLeadTeams, setHasLeadTeams] = useState(false);
    const menuRef = useRef(null);
    const quickRef = useRef(null);
    const quickButtonRef = useRef(null);
    const activeMenuRef = useRef(null);
    const activeMenuButtonRef = useRef(null);
    const activeMenuPopupRef = useRef(null);
    const [activeMenuPosition, setActiveMenuPosition] = useState({ top: 0, left: 0 });

    // Close the profile/settings popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            const node = menuRef.current;
            const qnode = quickRef.current;
            const activeNode = activeMenuRef.current;
            const activePopupNode = activeMenuPopupRef.current;
            // Close profile menu if click outside
            if (open && node && !node.contains(e.target)) {
                setOpen(false);
            }
            // Close quick actions if click outside
            if (openQuick && qnode && !qnode.contains(e.target)) {
                setOpenQuick(false);
            }
            if (
                openActiveMenu &&
                activeNode &&
                !activeNode.contains(e.target) &&
                !(activePopupNode && activePopupNode.contains(e.target))
            ) {
                setOpenActiveMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, openQuick, openActiveMenu]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [openWidgets, setOpenWidgets] = useState(false);
    const showKeyAreaTabs = location.pathname.startsWith('/key-areas') || location.pathname === '/my-focus';
    const showTeamsTabs = location.pathname.startsWith('/teams');
    const showGiveStrokesTabs = location.pathname.startsWith('/give-strokes');
    const showGoalsTabs = location.pathname.startsWith('/goals');
    const widgetsRef = useRef(null);
    const leftBrandRef = useRef(null);
    const rightActionsRef = useRef(null);
    const [rightActionsWidth, setRightActionsWidth] = useState(280);
    const [leftBrandWidth, setLeftBrandWidth] = useState(0);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef(null);
    const searchInlineRef = useRef(null);
    const searchResultsPanelRef = useRef(null);
    const [openSearch, setOpenSearch] = useState(false);
    const [searchHistory, setSearchHistory] = useState(() => {
        try {
            const raw = localStorage.getItem("pm:search:history");
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    });
    const [widgetsPrefs, setWidgetsPrefs] = useState(() => {
        try {
            const raw = localStorage.getItem('pm:dashboard:prefs');
            const stored = raw ? JSON.parse(raw) : {};
            return stored.widgets || {};
        } catch (e) {
            return {};
        }
    });
    const [search, setSearch] = useState("");
    // Global inline reminder modal state (listens for events)
    const [globalReminderOpen, setGlobalReminderOpen] = useState(false);
    const [globalReminderObj, setGlobalReminderObj] = useState(null);
    // Unified Don't Forget filter tab state: 'all' | 'active' | 'completed' | 'imported'
    const [dfFilter, setDfFilter] = useState('all');
    useEffect(() => {
        const handler = (e) => {
            const val = e?.detail?.filter;
            if (val) setDfFilter(val);
        };
        window.addEventListener('pm-dontforget-filter', handler);
        return () => window.removeEventListener('pm-dontforget-filter', handler);
    }, []);

    const normalize = (v) => String(v ?? "").toLowerCase();
    const includesQuery = (v, q) => normalize(v).includes(q);
    const startsWithQuery = (v, q) => normalize(v).startsWith(q);
    const wordsStartWithQuery = (v, q) =>
        normalize(v)
            .split(/[\s,.;:!?()[\]{}"'-]+/)
            .filter(Boolean)
            .some((w) => w.startsWith(q));

    const scoreStringMatch = (value, query, { shortQuery = false } = {}) => {
        const text = normalize(value).trim();
        if (!text || !query) return 0;
        if (text === query) return 120;
        if (startsWithQuery(text, query)) return 90;
        if (wordsStartWithQuery(text, query)) return 70;
        if (!shortQuery && includesQuery(text, query)) return 40;
        return 0;
    };

    // Category-aware deep match with optional ignored key patterns.
    const deepMatchScore = (source, query, { maxDepth = 4, ignoreKeyPatterns = [] } = {}) => {
        if (!source || !query) return 0;
        const seen = new WeakSet();
        const stack = [{ value: source, depth: 0 }];
        let best = 0;
        const shouldIgnoreKey = (k) => ignoreKeyPatterns.some((re) => re.test(String(k || "")));

        while (stack.length > 0) {
            const { value, depth } = stack.pop();
            if (value == null) continue;

            const t = typeof value;
            if (t === "string" || t === "number" || t === "boolean") {
                best = Math.max(best, scoreStringMatch(value, query));
                continue;
            }

            if (depth >= maxDepth) continue;

            if (Array.isArray(value)) {
                for (const item of value) stack.push({ value: item, depth: depth + 1 });
                continue;
            }

            if (t === "object") {
                if (seen.has(value)) continue;
                seen.add(value);
                for (const [k, v] of Object.entries(value)) {
                    if (shouldIgnoreKey(k)) continue;
                    stack.push({ value: v, depth: depth + 1 });
                }
            }
        }

        return best;
    };

    const getPrimaryScore = (item, fields, query, { shortQuery = false } = {}) => {
        const values = fields.map((field) => item?.[field]).filter((v) => v !== undefined && v !== null);
        return values.reduce((max, v) => Math.max(max, scoreStringMatch(v, query, { shortQuery })), 0);
    };

    // Handle global search functionality across entire system
    const handleSearch = async (searchTerm) => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            setSearchLoading(false);
            return [];
        }

        const searchLower = normalize(searchTerm).trim();
        const shortQuery = searchLower.length < 3;
        const results = [];
        const seen = new Set();
        const pushResult = (item) => {
            if (!item?.title || !item?.route) return;
            const key = `${item.type || "other"}::${item.route}::${item.title}`;
            if (seen.has(key)) return;
            seen.add(key);
            results.push(item);
        };

        // Search pages/navigation (immediate results)
        const pageItems = [
            { title: "Dashboard", route: "/dashboard", type: "page", description: "Main dashboard overview" },
            { title: "Calendar", route: "/calendar", type: "page", description: "View and manage appointments" },
            { title: "Don't Forget", route: "/tasks?dontforget=1", type: "page", description: "Quick task reminders" },
            { title: "Goals & Tracking", route: "/goals", type: "page", description: "Manage goals and track progress" },
            { title: "Reminders", route: "/reminders", type: "page", description: "View and manage all reminders" },
            { title: "Key Areas", route: "/key-areas", type: "page", description: "Organize work by key areas" },
            { title: "Ideas", route: "/key-areas?select=ideas", type: "page", description: "Brainstorm and manage ideas" },
            { title: "Team", route: "/teams", type: "page", description: "Team collaboration and management" },
            { title: "Profile Settings", route: "/profile", type: "page", description: "User profile and settings" },
        ];

        const matchingPages = pageItems.filter(item =>
            scoreStringMatch(item.title, searchLower, { shortQuery }) > 0 ||
            scoreStringMatch(item.description, searchLower, { shortQuery }) > 0
        );
        matchingPages.forEach(pushResult);

        // Show immediate page results first
        setSearchResults([...results]);
        setShowSearchResults(true);
        setSearchLoading(true);

        try {
            const [tasks, activities, goals, keyAreas, appointments, users] = await Promise.all([
                taskService.list().catch(() => []),
                activityService.list().catch(() => []),
                goalService.getGoals().catch(() => []),
                keyAreaService.list().catch(() => []),
                calendarService.listAppointments().catch(() => []),
                usersService.list().catch(() => []),
            ]);

            const nonUserFieldExcludes = [/assignee/i, /assigned/i, /user/i, /member/i, /owner/i, /email/i, /avatar/i, /delegat/i];
            const rankAndLimit = (items, scorer) =>
                (items || [])
                    .map((item) => ({ item, score: scorer(item) }))
                    .filter((x) => x.score > 0)
                    .sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        const aTitle = normalize(a?.item?.title || a?.item?.name || a?.item?.text || "");
                        const bTitle = normalize(b?.item?.title || b?.item?.name || b?.item?.text || "");
                        return aTitle.localeCompare(bTitle);
                    })
                    .map((x) => x.item);

            rankAndLimit(tasks, (task) => {
                const primaryFields = shortQuery ? ["title", "name"] : ["title", "name", "description", "tags"];
                const primary = getPrimaryScore(task, primaryFields, searchLower, { shortQuery });
                if (primary > 0) return primary + 200;
                if (shortQuery) return 0;
                return deepMatchScore(task, searchLower, { ignoreKeyPatterns: nonUserFieldExcludes });
            })
                .forEach((task) => {
                    pushResult({
                        title: task.title || task.name || 'Untitled Task',
                        route: `/tasks?dontforget=1&task=${task.id}`,
                        type: "task",
                        description: task.description || task.assignee || 'Task',
                    });
                });

            rankAndLimit(activities, (activity) => {
                const primaryFields = shortQuery ? ["title", "name", "text"] : ["title", "name", "text", "description"];
                const primary = getPrimaryScore(activity, primaryFields, searchLower, { shortQuery });
                if (primary > 0) return primary + 200;
                if (shortQuery) return 0;
                return deepMatchScore(activity, searchLower, { ignoreKeyPatterns: nonUserFieldExcludes });
            })
                .forEach((activity) => {
                    pushResult({
                        title: activity.title || activity.name || activity.text || 'Untitled Activity',
                        route: `/key-areas?view=activity-trap&activity=${activity.id}`,
                        type: "activity",
                        description: activity.description || activity.text || 'Activity',
                    });
                });

            rankAndLimit(goals, (goal) => {
                const primaryFields = shortQuery ? ["title", "name"] : ["title", "name", "description"];
                const primary = getPrimaryScore(goal, primaryFields, searchLower, { shortQuery });
                if (primary > 0) return primary + 200;
                if (shortQuery) return 0;
                return deepMatchScore(goal, searchLower, { ignoreKeyPatterns: nonUserFieldExcludes });
            })
                .forEach((goal) => {
                    pushResult({
                        title: goal.title || goal.name || 'Untitled Goal',
                        route: `/goals?id=${goal.id}`,
                        type: "goal",
                        description: goal.description || 'Goal',
                    });
                });

            rankAndLimit(keyAreas, (area) => {
                const primaryFields = shortQuery ? ["title", "name"] : ["title", "name", "description"];
                const primary = getPrimaryScore(area, primaryFields, searchLower, { shortQuery });
                if (primary > 0) return primary + 200;
                if (shortQuery) return 0;
                return deepMatchScore(area, searchLower, { ignoreKeyPatterns: nonUserFieldExcludes });
            })
                .forEach((area) => {
                    pushResult({
                        title: area.title || area.name || 'Untitled Key Area',
                        route: `/key-areas?id=${area.id}`,
                        type: "key-area",
                        description: area.description || 'Key Area',
                    });
                });

            rankAndLimit(appointments, (appointment) => {
                const primaryFields = shortQuery ? ["title", "summary"] : ["title", "summary", "description", "notes"];
                const primary = getPrimaryScore(appointment, primaryFields, searchLower, { shortQuery });
                if (primary > 0) return primary + 200;
                if (shortQuery) return 0;
                return deepMatchScore(appointment, searchLower, { ignoreKeyPatterns: nonUserFieldExcludes });
            })
                .forEach((appointment) => {
                    pushResult({
                        title: appointment.title || appointment.summary || 'Untitled Appointment',
                        route: `/calendar?id=${appointment.id}`,
                        type: "appointment",
                        description: appointment.description || appointment.notes || 'Calendar Appointment',
                    });
                });

            rankAndLimit(users, (user) => {
                const primary = getPrimaryScore(user, ["name", "email", "firstName", "lastName"], searchLower, { shortQuery });
                if (primary > 0) return primary + 200;
                if (shortQuery) return 0;
                return deepMatchScore(user, searchLower);
            })
                .forEach((user) => {
                    pushResult({
                        title: user.name || user.email || 'User',
                        route: `/teams`,
                        type: "user",
                        description: user.email || 'Team member',
                    });
                });

        } catch (error) {
            console.error('Global search error:', error);
        }

        setSearchResults(results);
        setShowSearchResults(true);
        setSearchLoading(false);
        return results;
    };

    const persistSearchHistory = (items) => {
        try {
            localStorage.setItem("pm:search:history", JSON.stringify(items));
        } catch (e) {
            // Ignore persistence failures (e.g. private mode quota issues)
        }
    };

    const pushSearchHistory = (item) => {
        if (!item?.route || !item?.title) return;
        setSearchHistory((prev) => {
            const next = [
                {
                    title: item.title,
                    route: item.route,
                    type: item.type || "other",
                    description: item.description || "",
                    searchedAt: new Date().toISOString(),
                },
                ...prev.filter((h) => !(h.route === item.route && h.title === item.title)),
            ].slice(0, 30);
            persistSearchHistory(next);
            return next;
        });
    };

    const closeSearchOverlay = () => {
        if (window.searchTimeout) clearTimeout(window.searchTimeout);
        setOpenSearch(false);
        setSearch("");
        setSearchResults([]);
        setShowSearchResults(false);
        setSearchLoading(false);
    };
    const focusSearchInput = () => {
        requestAnimationFrame(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus({ preventScroll: true });
            }
        });
    };

    // Handle search input change with debouncing for better performance
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearch(value);

        // Clear previous timeout
        if (window.searchTimeout) {
            clearTimeout(window.searchTimeout);
        }

        // Debounce search to avoid too many API calls
        window.searchTimeout = setTimeout(() => {
            handleSearch(value);
        }, 150); // Wait 150ms after user stops typing for faster response
    };

    // Handle search result click
    const handleSearchResultClick = (route) => {
        const selected = searchResults.find((r) => r.route === route);
        if (selected) pushSearchHistory(selected);
        navigate(route);
        closeSearchOverlay();
    };

    // Handle Enter key for search
    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (window.searchTimeout) clearTimeout(window.searchTimeout);
            const q = (search || "").trim();
            if (!q) return;
            Promise.resolve(handleSearch(q)).then((results) => {
                const payload = Array.isArray(results) ? results : [];
                try {
                    sessionStorage.setItem(
                        "pm:last-search-results",
                        JSON.stringify({ q, results: payload, ts: Date.now() })
                    );
                } catch (_) {}
                navigate(`/search?q=${encodeURIComponent(q)}`, { state: { q, results: payload } });
                closeSearchOverlay();
            });
            return;
        }
        if (e.key === 'Escape') {
            closeSearchOverlay();
        }
    };

    // Focus search input and support escape-to-close while overlay is open
    useEffect(() => {
        if (!openSearch) return;
        const focusInput = setTimeout(() => {
            focusSearchInput();
        }, 0);
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                closeSearchOverlay();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            clearTimeout(focusInput);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [openSearch]);

    useEffect(() => {
        if (!openSearch) return;
        const onDocMouseDown = (e) => {
            const target = e.target;
            if (searchInlineRef.current?.contains(target)) return;
            if (searchResultsPanelRef.current?.contains(target)) return;
            closeSearchOverlay();
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [openSearch]);

    useEffect(() => {
        const measureRightActions = () => {
            const w = rightActionsRef.current?.getBoundingClientRect?.().width;
            if (w && Number.isFinite(w)) {
                setRightActionsWidth(Math.max(220, Math.round(w)));
            }
            const lw = leftBrandRef.current?.getBoundingClientRect?.().width;
            if (lw && Number.isFinite(lw)) {
                setLeftBrandWidth(Math.round(lw));
            }
        };
        measureRightActions();
        window.addEventListener("resize", measureRightActions);
        return () => window.removeEventListener("resize", measureRightActions);
    }, [openSearch, location.pathname, location.search]);

    // List of public routes where navbar should not be shown
    const publicRoutes = ["/", "/login", "/registration", "/get-started", "/PasswordPageForget", "/reset-password", "/verify-email"];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    useEffect(() => {
        // Check if user is authenticated by looking for access token
        const token = localStorage.getItem("access_token");
        setIsAuthenticated(!!token);

        // Fetch user profile for avatar if authenticated
        if (token) {
            fetchUserProfile();
        }
    }, [location]);

    // Listen for profile updates to refresh avatar
    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchUserProfile();
        };

        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);

    // Close widgets popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (widgetsRef.current && !widgetsRef.current.contains(event.target)) {
                setOpenWidgets(false);
            }
        };

        if (openWidgets) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [openWidgets]);

    // Listen for global open-reminder-inline events
    useEffect(() => {
        const handler = (e) => {
            const reminder = e?.detail?.reminder || null;
            setGlobalReminderObj(reminder);
            setGlobalReminderOpen(true);
        };

        window.addEventListener('open-reminder-inline', handler);
        return () => window.removeEventListener('open-reminder-inline', handler);
    }, []);

    const handleGlobalReminderClose = () => {
        setGlobalReminderOpen(false);
        setGlobalReminderObj(null);
    };

    const handleGlobalReminderSave = (saved) => {
        // Notify any listeners (e.g., reminders lists) to reload
        try { window.dispatchEvent(new CustomEvent('reminder-saved', { detail: { reminder: saved } })); } catch (err) { }
        handleGlobalReminderClose();
    };

    // Listen for global auth changes (login/logout) to refresh auth state immediately
    useEffect(() => {
        const onAuthChanged = () => {
            const token = localStorage.getItem("access_token");
            setIsAuthenticated(!!token);
            if (token) fetchUserProfile();
        };
        window.addEventListener('authChanged', onAuthChanged);
        return () => window.removeEventListener('authChanged', onAuthChanged);
    }, []);

    const fetchUserProfile = async () => {
        try {
            const profile = await userProfileService.getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    useEffect(() => {
        let isActive = true;
        const loadLeadTeams = async () => {
            if (!showTeamsTabs || !userProfile?.id) return;
            try {
                const teams = await teamsService.getTeams();
                const list = Array.isArray(teams)
                    ? teams
                    : Array.isArray(teams?.teams)
                        ? teams.teams
                        : [];
                const lead = list.some((t) =>
                    String(t.leadId || t.leaderId || t.teamLeadUserId || t.lead?.id || '') === String(userProfile.id)
                );
                if (isActive) setHasLeadTeams(lead);
            } catch (e) {
                if (isActive) setHasLeadTeams(false);
            }
        };
        loadLeadTeams();
        return () => {
            isActive = false;
        };
    }, [showTeamsTabs, userProfile?.id]);

    // Helper: open a modal globally via event so we reuse existing modal UI
    const openCreateModal = (type) => {
        try {
            setOpenQuick(false);

            if (type === 'dontforget') {
                navigate('/tasks?dontforget=1');
                setTimeout(() => {
                    try { window.dispatchEvent(new CustomEvent('open-create-modal', { detail: { type: 'dontforget' } })); } catch (_) { }
                }, 50);
                return;
            }

            if (type === 'appointment') {
                navigate('/calendar');
                setTimeout(() => {
                    try { window.dispatchEvent(new CustomEvent('open-create-appointment', { detail: { start: new Date().toISOString() } })); } catch (_) { }
                }, 50);
                return;
            }

            if (type === 'stroke') {
                navigate('/give-strokes?tab=give');
                return;
            }

            window.dispatchEvent(new CustomEvent('open-create-modal', { detail: { type } }));
        } catch (err) {
            console.warn('openCreateModal handler error', err);
        }
    };

    // When the quick actions menu opens, move focus into the first actionable item
    useEffect(() => {
        if (!openQuick) return;
        const node = quickRef.current;
        if (!node) return;

        const first = node.querySelector('button, [tabindex]:not([tabindex="-1"])');
        if (first) {
            // small timeout to ensure menu is visible before focusing
            setTimeout(() => first.focus(), 0);
        }

        const onKey = (e) => {
            if (e.key === 'Escape') {
                setOpenQuick(false);
                try {
                    if (quickButtonRef.current) quickButtonRef.current.focus();
                } catch (err) { }
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [openQuick]);

    // Widget keys shown in Navbar control (keeps labels simple) - QuickAdd removed to avoid duplication with navbar quick actions
    const widgetKeys = [
        { key: 'myDay', label: 'My Day' },
        { key: 'goals', label: 'Goals' },
        { key: 'enps', label: 'eNPS' },
        { key: 'calendarPreview', label: 'Calendar Preview' },
        { key: 'activity', label: "What's New" },
    ];

    // Toggle a widget on/off and persist to dashboard prefs in localStorage
    const toggleWidget = (k) => {
        try {
            const raw = localStorage.getItem('pm:dashboard:prefs');
            const stored = raw ? JSON.parse(raw) : {};
            const widgets = { ...(stored.widgets || {}) };
            widgets[k] = !widgets[k];
            const next = { ...(stored || {}), widgets };
            // write back to localStorage
            localStorage.setItem('pm:dashboard:prefs', JSON.stringify(next));
            // notify dashboard to update its local state
            // update our local state so the checkbox reflects immediately
            setWidgetsPrefs(widgets);
            window.dispatchEvent(new CustomEvent('dashboard-prefs-updated', { detail: { widgets } }));
        } catch (err) {
            console.warn('toggleWidget error', err);
        }
    };

    // Keep local widgetsPrefs in sync when other components update dashboard prefs
    useEffect(() => {
        const handler = (e) => {
            try {
                const widgets = e?.detail?.widgets;
                if (widgets) setWidgetsPrefs((p) => ({ ...p, ...widgets }));
            } catch (err) {
                console.warn('navbar prefs handler error', err);
            }
        };
        window.addEventListener('dashboard-prefs-updated', handler);
        return () => window.removeEventListener('dashboard-prefs-updated', handler);
    }, []);

    const updateActiveMenuPosition = () => {
        if (!activeMenuButtonRef.current) return;
        const rect = activeMenuButtonRef.current.getBoundingClientRect();
        setActiveMenuPosition({
            top: rect.bottom + 4,
            left: rect.left,
        });
    };

    useEffect(() => {
        if (!openActiveMenu) return;
        updateActiveMenuPosition();
        const onReposition = () => updateActiveMenuPosition();
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);
        return () => {
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [openActiveMenu]);

    // Don't render navbar on public pages
    if (isPublicRoute) {
        return null;
    }

    // Only render navbar on authenticated pages
    if (!isAuthenticated) {
        return null;
    }

    const activeKeyAreaView = (() => {
        if (location.pathname === '/my-focus') return 'my-focus';
        const params = new URLSearchParams(location.search || '');
        return params.get('view') || 'active-tasks';
    })();
    const activeKeyAreaFilter = (() => {
        const params = new URLSearchParams(location.search || '');
        return params.get('active') || 'active';
    })();
    const activeTasksLabel = activeKeyAreaFilter === 'all' ? 'ALL TASKS' : 'ACTIVE TASKS';
    const activeTeamsTab = (() => {
        const params = new URLSearchParams(location.search || '');
        return params.get('tab') || 'teams-members';
    })();
    const activeGiveStrokesTab = (() => {
        const params = new URLSearchParams(location.search || '');
        return params.get('tab') || 'give';
    })();
    const NAVBAR_Z_INDEX = 'z-[5000]';
    const NAVBAR_POPUP_Z_INDEX = 'z-[5010]';
    const SEARCH_OVERLAY_Z_INDEX = 'z-[5020]';
    const searchCategoryLabels = {
        page: "Pages",
        task: "Tasks",
        activity: "Activities",
        goal: "Goals",
        "key-area": "Key Areas",
        appointment: "Appointments",
        user: "Users",
        other: "Other",
    };
    const groupedHistory = (searchHistory || []).reduce((acc, item) => {
        if (!item?.title || !item?.route) return acc;
        const key = item.type || "other";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
    const groupedSearchResults = (searchResults || []).reduce((acc, item) => {
        if (!item?.title || !item?.route) return acc;
        const key = item.type || "other";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
    const getSearchColumnCount = (count) => {
        if (count > 10) return 3;
        if (count > 5) return 2;
        return 1;
    };
    const getSearchColumnsClass = () => "grid grid-cols-3";
    const splitItemsAcrossColumns = (items, columns) => {
        if (!Array.isArray(items) || items.length === 0) return [];
        if (columns <= 1) return [items];

        const out = [];
        const total = items.length;
        const base = Math.floor(total / columns);
        const remainder = total % columns;
        let cursor = 0;

        for (let i = 0; i < columns; i += 1) {
            const size = base + (i < remainder ? 1 : 0);
            out.push(items.slice(cursor, cursor + size));
            cursor += size;
        }
        return out.filter((col) => col.length > 0);
    };
    const resultCategoryOrder = ["task", "activity", "goal", "key-area", "appointment", "user", "page", "other"];
    const visibleResultCategories = resultCategoryOrder.filter(
        (type) => Array.isArray(groupedSearchResults[type]) && groupedSearchResults[type].length > 0
    );

    return (
        <header
            className={`bg-gray-50 text-slate-800 ${NAVBAR_Z_INDEX} border-b border-gray-200 fixed top-0 left-0 right-0 h-16`}
        // style={{
        //     background: 'linear-gradient(90deg, #dff7f9 0%, #a7eaf0 50%, #59d2df 100%)',
        // }}
        >
            <div className="w-full px-2 md:px-4 h-16 flex items-center gap-4">
                <div className="flex items-center flex-shrink-0">
                    <Link ref={leftBrandRef} to="/dashboard" className="font-bold tracking-wide flex items-center gap-2 flex-shrink-0">
                        <img
                            src={`${import.meta.env.BASE_URL}logo.png`}
                            alt="Practical Manager"
                            className="hidden md:block h-7 object-contain"
                            style={{ maxHeight: '32px' }}
                        />
                        <span className="sr-only">Practical Manager</span>
                    </Link>
                    {openSearch && (
                        <div
                            className="hidden md:block"
                            style={{ width: `${Math.max(0, rightActionsWidth - leftBrandWidth)}px` }}
                            aria-hidden="true"
                        />
                    )}
                </div>

                {/* Compact search icon (replaces large centered search bar) */}
                {/* Placed visually with other header actions for a cleaner layout */}

                {showKeyAreaTabs && !openSearch && (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto overflow-y-visible whitespace-nowrap navbar-keyarea-tabs">
                            <div className="relative" ref={activeMenuRef}>
                                <button
                                    ref={activeMenuButtonRef}
                                    type="button"
                                    onClick={() => {
                                        if (!openActiveMenu) updateActiveMenuPosition();
                                        setOpenActiveMenu((prev) => !prev);
                                    }}
                                    className={`px-2 py-2 rounded transition inline-flex items-center gap-1 ${activeKeyAreaView === 'active-tasks'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <span>{activeTasksLabel}</span>
                                    <span className="text-[11px] text-slate-500">▾</span>
                                </button>
                                {openActiveMenu && createPortal(
                                    <div
                                        ref={activeMenuPopupRef}
                                        className={`fixed w-44 rounded-md border border-slate-300 bg-white shadow-md ${NAVBAR_POPUP_Z_INDEX} overflow-hidden`}
                                        style={{ top: `${activeMenuPosition.top}px`, left: `${activeMenuPosition.left}px` }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate('/key-areas?view=active-tasks&active=active');
                                                setOpenActiveMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition ${activeKeyAreaView === 'active-tasks' && activeKeyAreaFilter === 'active'
                                                ? 'text-slate-900'
                                                : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            Active tasks
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate('/key-areas?view=active-tasks&active=all');
                                                setOpenActiveMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition ${activeKeyAreaView === 'active-tasks' && activeKeyAreaFilter === 'all'
                                                ? 'text-slate-900'
                                                : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            All Tasks
                                        </button>
                                    </div>,
                                    document.body
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/key-areas?view=delegated')}
                                className={`px-2 py-2 rounded transition ${activeKeyAreaView === 'delegated'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                DELEGATED
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/key-areas?view=todo')}
                                className={`px-2 py-2 rounded transition ${activeKeyAreaView === 'todo'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                TO-DO (RED)
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/key-areas?view=activity-trap')}
                                className={`px-2 py-2 rounded transition ${activeKeyAreaView === 'activity-trap'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                ACTIVITY TRAP
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/my-focus')}
                                className={`px-2 py-2 rounded transition ${activeKeyAreaView === 'my-focus'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                MY FOCUS
                            </button>
                        </div>
                    </div>
                )}
                {showTeamsTabs && !showKeyAreaTabs && !openSearch && (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap navbar-keyarea-tabs">
                            <button
                                type="button"
                                onClick={() => navigate('/teams?tab=teams-members')}
                                className={`px-2 py-2 rounded transition ${activeTeamsTab === 'teams-members'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                OVERVIEW
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/teams?tab=organization')}
                                className={`px-2 py-2 rounded transition ${activeTeamsTab === 'organization'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                MY ORGANISATION
                            </button>
                            {hasLeadTeams && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/teams?tab=myteams')}
                                    className={`px-2 py-2 rounded transition ${activeTeamsTab === 'myteams'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    MY TEAMS
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => navigate('/teams?tab=myreport')}
                                className={`px-2 py-2 rounded transition ${activeTeamsTab === 'myreport'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                MY REPORT
                            </button>
                        </div>
                    </div>
                )}
                {showGiveStrokesTabs && !showKeyAreaTabs && !showTeamsTabs && !openSearch && (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap navbar-keyarea-tabs">
                            <button
                                type="button"
                                onClick={() => navigate('/give-strokes?tab=give')}
                                className={`px-2 py-2 rounded transition ${activeGiveStrokesTab === 'give'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                GIVE STROKES
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/give-strokes?tab=account')}
                                className={`px-2 py-2 rounded transition ${activeGiveStrokesTab === 'account'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                STROKE ACCOUNT
                            </button>
                        </div>
                    </div>
                )}
                {/* Don't Forget Tab Group: Active Tasks | All Tasks | Completed | Imported Tasks */}
                {location.search.includes('dontforget=1') && location.pathname.startsWith('/tasks') && !openSearch && (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap navbar-keyarea-tabs">
                            {/* ACTIVE TASKS */}
                            <button
                                type="button"
                                onClick={() => {
                                    setDfFilter('active');
                                    window.dispatchEvent(new CustomEvent('pm-dontforget-filter', { detail: { filter: 'active' } }));
                                }}
                                className={`px-2 py-2 rounded transition ${dfFilter === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                ACTIVE TASKS
                            </button>
                            {/* ALL TASKS */}
                            <button
                                type="button"
                                onClick={() => {
                                    setDfFilter('all');
                                    window.dispatchEvent(new CustomEvent('pm-dontforget-filter', { detail: { filter: 'all' } }));
                                }}
                                className={`px-2 py-2 rounded transition ${dfFilter === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                ALL TASKS
                            </button>
                            {/* COMPLETED */}
                            <button
                                type="button"
                                onClick={() => {
                                    setDfFilter('completed');
                                    window.dispatchEvent(new CustomEvent('pm-dontforget-filter', { detail: { filter: 'completed' } }));
                                }}
                                className={`px-2 py-2 rounded transition ${dfFilter === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                COMPLETED
                            </button>
                            {/* IMPORTED TASKS */}
                            <button
                                type="button"
                                onClick={() => {
                                    setDfFilter('imported');
                                    window.dispatchEvent(new CustomEvent('pm-dontforget-filter', { detail: { filter: 'imported' } }));
                                }}
                                className={`px-2 py-2 rounded transition ${dfFilter === 'imported' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                IMPORTED TASKS
                            </button>
                        </div>
                    </div>
                )}
                {/* Goals Tab Group: My Goals | Quick Goals | Reports */}
                {showGoalsTabs && !showKeyAreaTabs && !showTeamsTabs && !showGiveStrokesTabs && !openSearch && (() => {
                    const params = new URLSearchParams(location.search || '');
                    const goalsTab = params.get('tab') || 'goals';
                    return (
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap navbar-keyarea-tabs">
                                <button
                                    type="button"
                                    onClick={() => navigate('/goals')}
                                    className={`px-2 py-2 rounded transition ${goalsTab === 'goals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    MY GOALS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.dispatchEvent(new CustomEvent('pm-goals-quick-panel', { detail: { open: true } }))}
                                    className="px-2 py-2 rounded transition text-slate-600 hover:text-slate-900"
                                >
                                    QUICK GOALS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/goals?tab=report')}
                                    className={`px-2 py-2 rounded transition ${goalsTab === 'report' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    REPORTS
                                </button>
                            </div>
                        </div>
                    );
                })()}
                {openSearch && (
                    <div
                        className="flex-1 min-w-0 px-1 md:px-3"
                        ref={searchInlineRef}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full">
                            <div className="relative w-full">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 md:w-5 md:h-5 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search across pages, tasks, activities, goals, key areas, and appointments..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleSearchKeyPress}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full h-10 pl-10 pr-3 text-sm border rounded-xl bg-white focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={rightActionsRef} className="relative flex items-center gap-3 ml-auto flex-shrink-0">
                    <div className="relative">
                        <button
                            className="text-black hover:text-gray-700 px-1 py-0.5 rounded-full"
                            aria-label="Search"
                            title="Search"
                            onClick={() => {
                                if (window.searchTimeout) clearTimeout(window.searchTimeout);
                                setSearch("");
                                setSearchResults([]);
                                setShowSearchResults(false);
                                setSearchLoading(false);
                                setOpenSearch(true);
                                focusSearchInput();
                            }}
                        >
                            <FaSearch className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Widgets control: only show on Dashboard route */}
                    {location.pathname === '/dashboard' && (
                        <div className="relative" ref={widgetsRef}>
                            <button
                                onClick={() => setOpenWidgets((o) => !o)}
                                className="text-white/90 hover:text-white px-1 py-0.5 rounded-full"
                                aria-haspopup="menu"
                                aria-expanded={openWidgets ? "true" : "false"}
                                title="Widgets"
                            >
                                <FaTh className="text-black w-4 h-4" />
                            </button>

                            {openWidgets && (
                                <div className={`absolute right-2 mt-2 w-64 rounded-md bg-white text-slate-800 shadow-lg ${NAVBAR_POPUP_Z_INDEX} p-2`}>
                                    <div className="px-2 py-1 text-xs text-slate-500 border-b flex items-center justify-between">
                                        <span>Widgets</span>
                                        <button
                                            onClick={() => setOpenWidgets(false)}
                                            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none"
                                            aria-label="Close widgets menu"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="p-2 max-h-64 overflow-auto">
                                        {widgetKeys.map((w) => {
                                            const checked = typeof widgetsPrefs[w.key] === 'boolean' ? widgetsPrefs[w.key] : true;
                                            return (
                                                <label key={w.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50">
                                                    <input type="checkbox" checked={checked} onChange={() => toggleWidget(w.key)} />
                                                    <span className="text-sm">{w.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Quick Actions icon */}
                    <div className="relative" ref={quickRef}>
                        <button
                            ref={quickButtonRef}
                            onClick={() => setOpenQuick((o) => !o)}
                            onKeyDown={(e) => {
                                // Open menu with ArrowDown for keyboard users
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setOpenQuick(true);
                                }
                            }}
                            className="text-white/90 hover:text-white px-1 py-0.5 rounded-full"
                            aria-haspopup="menu"
                            aria-expanded={openQuick ? "true" : "false"}
                            aria-controls="quick-actions-menu"
                            title="Quick Actions"
                            aria-label="Quick Actions"
                        >
                            <FaBolt className="text-black w-4 h-4" />
                            <span className="sr-only">Quick Actions</span>
                        </button>

                        {openQuick && (
                            <div id="quick-actions-menu" role="menu" className={`absolute right-20 mt-2 w-56 rounded-md bg-white text-slate-800 shadow-lg ${NAVBAR_POPUP_Z_INDEX}`}>
                                <div className="px-3 py-2 text-xs text-slate-500 border-b">Quick Actions</div>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenQuick(false); openCreateModal('dontforget'); } }}
                                    onClick={() => { setOpenQuick(false); openCreateModal('dontforget'); }}
                                >
                                    Don't Forget
                                </button>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateModal('task'); } }}
                                    onClick={() => openCreateModal('task')}
                                >
                                    Create Task
                                </button>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateModal('activity'); } }}
                                    onClick={() => openCreateModal('activity')}
                                >
                                    Create Activity
                                </button>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateModal('appointment'); } }}
                                    onClick={() => openCreateModal('appointment')}
                                >
                                    Create Appointment
                                </button>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateModal('goal'); } }}
                                    onClick={() => openCreateModal('goal')}
                                >
                                    Create Goal
                                </button>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateModal('stroke'); } }}
                                    onClick={() => openCreateModal('stroke')}
                                >
                                    Give Strokes
                                </button>
                                <button
                                    role="menuitem"
                                    tabIndex={0}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenQuick(false); try { window.location.hash = '#/key-areas'; } catch (ex) { window.location.href = '/#/key-areas'; } } }}
                                    onClick={() => { setOpenQuick(false); try { window.location.hash = '#/key-areas'; } catch (e) { window.location.href = '/#/key-areas'; } }}
                                >
                                    Edit Key Areas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={menuRef}>
                        <NotificationBell />
                    </div>

                    <div className="relative" ref={menuRef}>
                        <ReminderBell />
                    </div>

                    {/* Global inline ReminderModal — renders at navbar level so it survives closing the reminders panel */}
                    <ReminderModal
                        isOpen={globalReminderOpen}
                        inline={true}
                        reminder={globalReminderObj}
                        onClose={handleGlobalReminderClose}
                        onSave={handleGlobalReminderSave}
                    />

                    {/* Organization Switcher - for multi-org users */}
                    {isAuthenticated && <OrganizationSwitcher />}

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setOpen((o) => !o)}
                            className="flex items-center gap-2 rounded-full border border-white/30 bg-blue-500/40 px-2 py-0.5 hover:bg-blue-500/60"
                            aria-haspopup="menu"
                            aria-expanded={open ? "true" : "false"}
                        >
                            <span className="w-5 h-5 rounded-full bg-white/30 text-white flex items-center justify-center overflow-hidden">
                                {userProfile?.avatarUrl ? (
                                    <img
                                        src={userProfile.avatarUrl}
                                        alt="Profile Avatar"
                                        className="w-full h-full object-cover rounded-full"
                                        onError={(e) => {
                                            // Fallback to icon if image fails to load
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <FaUser
                                    className={`w-3 h-3 ${userProfile?.avatarUrl ? 'hidden' : 'block'}`}
                                />
                            </span>
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {open && (
                            <div className={`absolute right-0 mt-2 w-48 rounded-md bg-white text-slate-800 shadow-lg ${NAVBAR_POPUP_Z_INDEX}`}>
                                <Link
                                    to="/profile"
                                    className="block px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => setOpen(false)}
                                >
                                    Profile & Settings
                                </Link>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => {
                                        setOpen(false);
                                        // Clear auth token and redirect to login
                                        localStorage.removeItem("access_token");
                                        try {
                                            window.location.hash = "#/login";
                                        } catch (e) {
                                            window.location.href = "/login";
                                        }
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {openSearch && createPortal(
                <div className={`fixed left-0 right-0 top-16 bottom-0 ${SEARCH_OVERLAY_Z_INDEX}`}>
                    <div className="absolute inset-0 bg-black/40" onClick={closeSearchOverlay} />
                    <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-2 flex justify-center">
                        <div
                            ref={searchResultsPanelRef}
                            className="w-full max-w-[860px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-h-[calc(100vh-82px)] overflow-y-auto">
                                {searchLoading && (
                                    <div className="px-4 py-3 text-sm text-slate-600">Searching...</div>
                                )}

                                {showSearchResults && !searchLoading && searchResults.length > 0 && (
                                    <div className="py-1">
                                        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b">
                                            Search Results
                                        </div>
                                        {visibleResultCategories.map((type) => (
                                                <div key={type} className="px-4 py-1.5">
                                                    <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50">
                                                        {searchCategoryLabels[type] || "Other"}
                                                    </div>
                                                    <div className={`mt-1 px-4 gap-x-8 gap-y-0 ${getSearchColumnsClass()}`}>
                                                        {splitItemsAcrossColumns(
                                                            groupedSearchResults[type],
                                                            getSearchColumnCount(groupedSearchResults[type].length)
                                                        ).map((col, colIdx) => (
                                                            <div key={`${type}-col-${colIdx}`} className="space-y-1">
                                                                {col.map((r, idx) => (
                                                                    <Link
                                                                        key={`${type}-${r.route}-${colIdx}-${idx}`}
                                                                        to={r.route}
                                                                        onClick={() => handleSearchResultClick(r.route)}
                                                                        className="block text-sm font-medium text-slate-600 leading-5 tracking-[0.01em] hover:text-blue-600"
                                                                    >
                                                                        {r.title}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {showSearchResults && !searchLoading && searchResults.length === 0 && search.trim() && (
                                    <div className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
                                        No results
                                    </div>
                                )}

                                {searchHistory.length > 0 && !search.trim() && (
                                    <div className="py-1">
                                        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b">
                                            Recent Searches
                                        </div>
                                        {Object.entries(groupedHistory).map(([type, items]) => (
                                            <div key={type} className="border-b border-gray-100 last:border-b-0">
                                                <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50">
                                                    {searchCategoryLabels[type] || "Other"}
                                                </div>
                                                {(items || []).slice(0, 5).map((item, idx) => (
                                                    <button
                                                        key={`${type}-${item.route}-${idx}`}
                                                        type="button"
                                                        onClick={() => {
                                                            navigate(item.route);
                                                            closeSearchOverlay();
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50"
                                                    >
                                                        <div className="text-sm font-medium text-slate-800">{item.title}</div>
                                                        {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </header>
    );
}
