import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaHome,
    FaCalendarAlt,
    FaLock,
    FaChevronDown,
    FaCog,
    FaSignOutAlt,
    FaPlus,
    FaSearch,
    FaClock,
    FaChartBar,
} from "react-icons/fa";

const navItems = [
    { label: "Dashboard", icon: <FaHome />, to: "/dashboard", section: "Main" },
    // Tasks & Activities removed per request
    { label: "Calendar", icon: <FaCalendarAlt />, to: "/calendar", section: "Main" },
    // Quick access for tasks not tied to Key Areas ("Activity Trap")
    {
        label: "Don't Forget",
        icon: (
            <img
                src={`${import.meta.env.BASE_URL}dont-forget.png`}
                alt="Don't forget"
                className="w-6 h-6 object-contain"
            />
        ),
        to: { pathname: "/tasks", search: "?dontforget=1" },
        section: "Main",
    },
    {
        label: "Goals & Tracking",
        icon: <img src={`${import.meta.env.BASE_URL}goals.png`} alt="Goals" className="w-6 h-6 object-contain" />,
        to: "/goals",
        section: "Main",
        badge: 2,
    },
    {
        label: "Key Areas",
        icon: (
            <img src={`${import.meta.env.BASE_URL}key-area.png`} alt="Key Areas" className="w-6 h-6 object-contain" />
        ),
        to: "/key-areas",
        section: "Main",
        children: [
            {
                label: "Ideas",
                icon: (
                    <img src={`${import.meta.env.BASE_URL}ideas.png`} alt="Ideas" className="w-6 h-6 object-contain" />
                ),
                to: { pathname: "/key-areas", search: "?select=ideas" },
            },
        ],
    },
    { label: "Time Tracking", icon: <FaClock />, to: "/time-tracking", section: "Main" },
    {
        label: "Team",
        icon: <img src={`${import.meta.env.BASE_URL}team.png`} alt="Team" className="w-6 h-6 object-contain" />,
        to: "/teams",
        section: "Main",
    },
    { label: "Analytics", icon: <FaChartBar />, to: "/analytics", section: "Main" },
    { label: "Settings", icon: <FaCog />, to: "/settings", section: "Main" },
];

const quickActions = [
    { label: "New Task", icon: <FaPlus />, to: "/tasks" },
    {
        label: "Set Goal",
        icon: <img src={`${import.meta.env.BASE_URL}goals.png`} alt="Goals" className="w-6 h-6 object-contain" />,
        to: "/goals",
    },
    {
        label: "Invite Team",
        icon: <img src={`${import.meta.env.BASE_URL}team.png`} alt="Team" className="w-6 h-6 object-contain" />,
        to: "/teams",
    },
];

export default function Sidebar({
    user,
    collapsed: collapsedProp,
    onCollapseToggle,
    mobileOpen = false,
    onMobileClose,
}) {
    const location = useLocation();
    const [keyAreasList, setKeyAreasList] = useState([]);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [keyAreasOpen, setKeyAreasOpen] = useState(false); // State for Key Areas dropdown
    const openFirstKARef = useRef(false);
    const collapsed = typeof collapsedProp === "boolean" ? collapsedProp : internalCollapsed;

    // no navigation for Key Areas toggle; we only open/close

    const navigate = useNavigate();

    // Key Areas list comes from page events; no local cache

    const handleKeyAreasClick = (e, item) => {
        e.preventDefault();
        // navigate to Key Areas main view and toggle submenu
        const nextOpen = !keyAreasOpen;
        let openedFirstId = null;
        try {
            if (nextOpen) {
                // if we already have the list, go straight to the first KA
                if (keyAreasList && keyAreasList.length > 0) {
                    const first = [...keyAreasList].sort((a, b) => (a.position || 0) - (b.position || 0))[0];
                    openedFirstId = first?.id;
                    navigate({ pathname: item.to, search: `?ka=${first.id}&openKA=1` });
                } else {
                    // otherwise, open view and wait for the list, then select first
                    openFirstKARef.current = true;
                    navigate({ pathname: item.to, search: "?openKA=1" });
                }
            } else {
                navigate({ pathname: item.to, search: "?view=all" });
            }
        } catch (err) {
            // fallback
            if (nextOpen) {
                if (keyAreasList && keyAreasList.length > 0) {
                    const first = [...keyAreasList].sort((a, b) => (a.position || 0) - (b.position || 0))[0];
                    openedFirstId = first?.id;
                    window.location.href = `${item.to}?ka=${first.id}&openKA=1`;
                } else {
                    openFirstKARef.current = true;
                    window.location.href = `${item.to}?openKA=1`;
                }
            } else {
                window.location.href = `${item.to}?view=all`;
            }
        }
        setKeyAreasOpen(nextOpen);
        try {
            if (nextOpen) {
                if (openedFirstId != null) {
                    window.dispatchEvent(new CustomEvent("sidebar-open-ka", { detail: { id: openedFirstId } }));
                }
                // do not emit sidebar-keyareas-click here to avoid overriding selection
            } else {
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-click"));
            }
        } catch (e) {}
    };

    // listen for key areas data emitted by the KeyAreas page
    React.useEffect(() => {
        const handler = (e) => {
            const ka = e?.detail?.keyAreas || [];
            setKeyAreasList(Array.isArray(ka) ? ka : []);
            if (openFirstKARef.current && Array.isArray(ka) && ka.length > 0) {
                // select first KA after list arrives
                const first = [...ka].sort((a, b) => (a.position || 0) - (b.position || 0))[0];
                try {
                    navigate({ pathname: "/key-areas", search: `?ka=${first.id}&openKA=1` });
                } catch {
                    window.location.href = `/key-areas?ka=${first.id}&openKA=1`;
                }
                try {
                    window.dispatchEvent(new CustomEvent("sidebar-open-ka", { detail: { id: first.id } }));
                } catch {}
                openFirstKARef.current = false;
            }
        };
        window.addEventListener("sidebar-keyareas-data", handler);
        return () => window.removeEventListener("sidebar-keyareas-data", handler);
    }, []);

    // when landing on /key-areas with openKA=1, auto-open the dropdown on first render
    React.useEffect(() => {
        if (location.pathname.startsWith("/key-areas")) {
            const params = new URLSearchParams(location.search || "");
            if (params.get("openKA") === "1" && !keyAreasOpen) {
                setKeyAreasOpen(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, location.search]);

    // mobile overlay classes: off-canvas when closed, fixed overlay when open on small screens
    const mobileTranslate = mobileOpen ? "translate-x-0" : "-translate-x-full";

    return (
        <aside
            className={`bg-[#F7F6F3] ${collapsed ? "w-20" : "w-64"} h-screen md:h-[calc(100vh-2rem)] shadow-lg border border-blue-300 flex flex-col justify-between px-2 transition-transform duration-300 rounded-2xl overflow-hidden ${mobileTranslate} fixed top-0 left-0 z-40 md:sticky md:top-4 md:translate-x-0 md:ml-4 md:mr-2 md:my-4 hidden-mobile`}
            aria-label="Sidebar"
        >
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className="mb-6 flex items-center gap-2 px-2">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-8 h-8" />
                    {!collapsed && <span className="font-bold text-lg text-blue-900">Practical Manager</span>}

                    {/* mobile close button */}
                    <div className="ml-auto flex items-center gap-2">
                        {mobileOpen && (
                            <button
                                className="md:hidden text-blue-700 hover:text-blue-900 focus:outline-none"
                                aria-label="Close sidebar"
                                onClick={() => (typeof onMobileClose === "function" ? onMobileClose() : null)}
                            >
                                <span className="sr-only">Close</span>
                                <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}

                        <button
                            className="text-blue-700 hover:text-blue-900 focus:outline-none"
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            onClick={() => {
                                if (typeof onCollapseToggle === "function") onCollapseToggle();
                                else setInternalCollapsed((c) => !c);
                            }}
                        >
                            <svg
                                className={`w-4 h-4 transform ${collapsed ? "rotate-90" : "rotate-0"}`}
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
                    </div>
                </div>
                {!collapsed && (
                    <div className="mb-4 px-2">
                        <div className="flex items-center bg-white rounded-lg px-2 py-1 shadow">
                            <FaSearch className="text-blue-700 mr-2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="bg-transparent outline-none text-sm w-full"
                            />
                        </div>
                    </div>
                )}
                {/* Profile Settings style: wrap nav in a subtle gray container (labels hidden when collapsed) */}
                <div className={`px-2`}>
                    <div className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-[13px]">
                        <nav aria-label="Sidebar navigation">
                            {navItems
                                .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
                                .map((item) => {
                                    const isKeyAreas =
                                        item.label === "Key Areas" || (item.to && item.to === "/key-areas");

                                    // Key Areas: render as a toggle with submenu (All Key Areas, Ideas, Bright Idea)
                                    if (isKeyAreas) {
                                        return (
                                            <div key={item.label} className="mb-2">
                                                <button
                                                    onClick={(e) => handleKeyAreasClick(e, item)}
                                                    aria-expanded={keyAreasOpen}
                                                    className={`relative flex items-center gap-3 w-full px-3 py-2 rounded transition group focus:outline-none ${location.pathname.startsWith("/key-areas") ? "bg-white text-blue-700 shadow-inner font-semibold" : "text-gray-800 hover:bg-white"}`}
                                                >
                                                    <span className="text-xl" title={item.label}>
                                                        {item.icon}
                                                    </span>
                                                    {!collapsed && <span>{item.label}</span>}
                                                    {item.badge && (
                                                        <span className="absolute right-3 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold group-hover:bg-red-600">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    <FaChevronDown
                                                        className={`ml-auto ${keyAreasOpen ? "rotate-180" : "rotate-0"}`}
                                                    />
                                                </button>

                                                {!collapsed && keyAreasOpen && (
                                                    <div className="ml-6 mt-2 space-y-1">
                                                        {/* dynamically render key areas received from KeyAreas page */}
                                                        {keyAreasList &&
                                                            keyAreasList.length > 0 &&
                                                            keyAreasList.map((ka) => {
                                                                const isActive =
                                                                    location.pathname.startsWith("/key-areas") &&
                                                                    new URLSearchParams(location.search).get("ka") ===
                                                                        String(ka.id);
                                                                const itemClasses = isActive
                                                                    ? "flex items-center gap-2 px-3 py-2 rounded mb-2 transition text-blue-700 font-semibold bg-white shadow-inner text-left w-full"
                                                                    : "flex items-center gap-2 px-3 py-2 rounded mb-2 transition text-gray-800 hover:bg-white text-left w-full";
                                                                const isLocked = !!ka.is_default;
                                                                const isIdeas = /idea/i.test(ka.title || "");
                                                                return (
                                                                    <Link
                                                                        key={ka.id}
                                                                        to={{
                                                                            pathname: "/key-areas",
                                                                            search: `?ka=${ka.id}`,
                                                                        }}
                                                                        onClick={(e) => {
                                                                            // keep dropdown open; just dispatch event
                                                                            try {
                                                                                window.dispatchEvent(
                                                                                    new CustomEvent("sidebar-open-ka", {
                                                                                        detail: { id: ka.id },
                                                                                    }),
                                                                                );
                                                                            } catch (err) {}
                                                                        }}
                                                                        className={itemClasses}
                                                                    >
                                                                        <span className="text-sm flex items-center gap-2">
                                                                            {ka.title}
                                                                            {isLocked && (
                                                                                <span className="ml-2 inline-flex items-center">
                                                                                    {isIdeas ? (
                                                                                        <img
                                                                                            src={`${import.meta.env.BASE_URL}ideas.png`}
                                                                                            alt="Ideas"
                                                                                            className="w-4 h-4 object-contain"
                                                                                        />
                                                                                    ) : (
                                                                                        <FaLock className="text-slate-500 text-xs" />
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </Link>
                                                                );
                                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // All other nav items: render as simple links
                                    return (
                                        <div key={item.label} className="mb-2">
                                            <Link
                                                to={item.to}
                                                className={`relative flex items-center gap-3 px-3 py-2 rounded transition group ${location.pathname.startsWith(item.to) ? "bg-white text-blue-700 shadow-inner font-semibold" : "text-gray-800 hover:bg-white"}`}
                                            >
                                                <span className="text-xl" title={item.label}>
                                                    {item.icon}
                                                </span>
                                                {!collapsed && <span>{item.label}</span>}
                                                {item.badge && (
                                                    <span className="absolute right-3 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold group-hover:bg-red-600">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </div>
                                    );
                                })}
                            {/* Ideas quick link removed per request */}
                        </nav>
                    </div>
                </div>
                {!collapsed && (
                    <div className="mt-6 px-2">
                        <div className="uppercase text-xs text-blue-700 font-bold mb-2">Quick Actions</div>
                        {quickActions.map((action) => (
                            <Link
                                key={action.label}
                                to={action.to}
                                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 mb-2 shadow text-blue-700 font-bold hover:bg-blue-50 transition"
                            >
                                {action.icon} <span>{action.label}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-2 border-t border-blue-200" />
            <div className="mt-4 px-2 relative flex-shrink-0">
                <button
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-white text-blue-900 hover:bg-blue-50 border border-blue-200 transition"
                    onClick={() => {
                        // TODO: integrate real logout; for now navigate to login
                        try {
                            window.location.hash = "#/login";
                        } catch (e) {
                            window.location.href = "/login";
                        }
                    }}
                    aria-label="Logout"
                >
                    <FaSignOutAlt /> <span className="font-semibold">Logout</span>
                </button>
            </div>
        </aside>
    );
}
