
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaBolt, FaTh, FaSearch } from "react-icons/fa";
import userProfileService from "../../services/userProfileService";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [openQuick, setOpenQuick] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const menuRef = useRef(null);
    const quickRef = useRef(null);
    const quickButtonRef = useRef(null);

    // Close the profile/settings popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            const node = menuRef.current;
            const qnode = quickRef.current;
            // Close profile menu if click outside
            if (open && node && !node.contains(e.target)) {
                setOpen(false);
            }
            // Close quick actions if click outside
            if (openQuick && qnode && !qnode.contains(e.target)) {
                setOpenQuick(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, openQuick]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();
    const [openWidgets, setOpenWidgets] = useState(false);
    const widgetsRef = useRef(null);
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

    // List of public routes where navbar should not be shown
    const publicRoutes = ["/", "/login", "/registration", "/PasswordPageForget", "/reset-password", "/verify-email"];
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

    const fetchUserProfile = async () => {
        try {
            const profile = await userProfileService.getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    // Helper: open a modal globally via event so we reuse existing modal UI
    const openCreateModal = (type) => {
        try {
            setOpenQuick(false);
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
                } catch (err) {}
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
        { key: 'strokes', label: 'Strokes' },
        { key: 'productivity', label: 'Productivity' },
        { key: 'calendarPreview', label: 'Calendar Preview' },
        { key: 'activity', label: "What's New" },
        { key: 'suggestions', label: 'Suggestions' },
        { key: 'teamOverview', label: 'Team Overview' },
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

    // Don't render navbar on public pages
    if (isPublicRoute) {
        return null;
    }

    // Only render navbar on authenticated pages
    if (!isAuthenticated) {
        return null;
    }

    return (
        <header
            className="bg-white text-black shadow-sm z-40 border-b border-gray-200"
            // style={{
            //     background: 'linear-gradient(90deg, #dff7f9 0%, #a7eaf0 50%, #59d2df 100%)',
            // }}
        >
            <div className="w-full px-2 md:px-4 py-2 flex items-center justify-between">
                    <Link to="/" className="font-bold tracking-wide flex items-center gap-2">
                        <img
                            src={`${import.meta.env.BASE_URL}logo.png`}
                            alt="Practical Manager"
                            className="hidden md:block h-10 object-contain"
                            style={{ maxHeight: '44px' }}
                        />
                        <span className="sr-only">Practical Manager</span>
                    </Link>
                    
                    {/* Site-wide search */}
                    <div className="flex-1 max-w-md mx-4">
                        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 shadow-sm">
                            <FaSearch className="text-gray-500 mr-2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search across site..."
                                className="bg-transparent outline-none text-sm w-full text-gray-700 placeholder-gray-500"
                            />
                        </div>
                    </div>
                    
                <div className="relative flex items-center gap-3">
                    {/* Widgets control: only show on Dashboard route */}
                    {location.pathname === '/dashboard' && (
                        <div className="relative" ref={widgetsRef}>
                            <button
                                onClick={() => setOpenWidgets((o) => !o)}
                                className="text-white/90 hover:text-white px-3 py-1.5 rounded-full"
                                aria-haspopup="menu"
                                aria-expanded={openWidgets ? "true" : "false"}
                                title="Widgets"
                            >
                                <FaTh className="text-black w-5 h-5" />
                            </button>

                            {openWidgets && (
                                <div className="absolute right-20 mt-2 w-64 rounded-md bg-white text-slate-800 shadow-lg z-50 p-2">
                                    <div className="px-2 py-1 text-xs text-slate-500 border-b">Widgets</div>
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
                            className="text-white/90 hover:text-white px-3 py-1.5 rounded-full"
                            aria-haspopup="menu"
                            aria-expanded={openQuick ? "true" : "false"}
                            aria-controls="quick-actions-menu"
                            title="Quick Actions"
                            aria-label="Quick Actions"
                        >
                            <FaBolt className="text-black w-5 h-5" />
                            <span className="sr-only">Quick Actions</span>
                        </button>

                        {openQuick && (
                            <div id="quick-actions-menu" role="menu" className="absolute right-20 mt-2 w-56 rounded-md bg-white text-slate-800 shadow-lg z-50">
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
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenQuick(false); try { window.location.hash = '#/key-areas'; } catch(ex){ window.location.href = '/#/key-areas'; } } }}
                                    onClick={() => { setOpenQuick(false); try { window.location.hash = '#/key-areas'; } catch(e){ window.location.href = '/#/key-areas'; } }}
                                >
                                    Edit Key Areas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setOpen((o) => !o)}
                            className="flex items-center gap-2 rounded-full border border-white/30 bg-blue-500/40 px-2 py-1 hover:bg-blue-500/60"
                            aria-haspopup="menu"
                            aria-expanded={open ? "true" : "false"}
                        >
                            <span className="w-8 h-8 rounded-full bg-white/30 text-white flex items-center justify-center overflow-hidden">
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
                                    className={`w-5 h-5 ${userProfile?.avatarUrl ? 'hidden' : 'block'}`}
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
                            <div className="absolute right-0 mt-2 w-48 rounded-md bg-white text-slate-800 shadow-lg z-50">
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
        </header>
    );
}
