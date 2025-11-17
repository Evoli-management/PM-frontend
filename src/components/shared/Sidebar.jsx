import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaHome,
    FaCalendarAlt,
    FaLock,
    FaChevronDown,
    FaSearch,
    FaGripVertical,
} from "react-icons/fa";
import { isFeatureEnabled } from "../../utils/flags.js";

const navItems = [
    { label: "Dashboard", icon: <FaHome />, to: "/dashboard", section: "Main" },
    { label: "Calendar", icon: <FaCalendarAlt />, to: "/calendar", section: "Main" },
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
    {
        label: "Team",
        icon: <img src={`${import.meta.env.BASE_URL}team.png`} alt="Team" className="w-6 h-6 object-contain" />,
        to: "/teams",
        section: "Main",
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
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [keyAreasOpen, setKeyAreasOpen] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const openFirstKARef = useRef(false);
    const collapsed = typeof collapsedProp === "boolean" ? collapsedProp : internalCollapsed;

    const navigate = useNavigate();
    const calendarEnabled = isFeatureEnabled("calendar");

    // Drag and drop handlers
    const handleDragStart = (e, ka, index) => {
        setDraggedItem({ ka, index });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", e.target);
        e.target.style.opacity = "0.5";
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = "1";
        setDraggedItem(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    };

    const handleDragLeave = (e) => {
        // Only clear dragOverIndex if we're leaving the entire droppable area
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        setDragOverIndex(null);
        
        if (!draggedItem || draggedItem.index === targetIndex) {
            return;
        }

        const newKeyAreasList = [...displayKeyAreas];
        const draggedKa = newKeyAreasList[draggedItem.index];
        
        // Remove the dragged item
        newKeyAreasList.splice(draggedItem.index, 1);
        
        // Insert at new position
        newKeyAreasList.splice(targetIndex, 0, draggedKa);
        
        // Update the positions for all key areas
        const updatedKeyAreas = newKeyAreasList.map((ka, index) => ({
            ...ka,
            position: index
        }));
        
        // Update local state immediately for UI responsiveness
        setKeyAreasList(updatedKeyAreas);
        
        // Emit custom event to notify the KeyAreas page about the reorder
        try {
            window.dispatchEvent(new CustomEvent("sidebar-keyareas-reorder", { 
                detail: { keyAreas: updatedKeyAreas } 
            }));
        } catch (err) {
            console.warn("Failed to emit keyareas reorder event:", err);
        }
        
        setDraggedItem(null);
    };

    const handleKeyAreasClick = (e, item) => {
        e.preventDefault();
        const nextOpen = !keyAreasOpen;
        let openedFirstId = null;
        try {
            if (nextOpen) {
                if (keyAreasList && keyAreasList.length > 0) {
                    const first = [...keyAreasList].sort((a, b) => (a.position || 0) - (b.position || 0))[0];
                    openedFirstId = first?.id;
                    navigate({ pathname: item.to, search: `?ka=${first.id}&openKA=1` });
                } else {
                    openFirstKARef.current = true;
                    navigate({ pathname: item.to, search: "?openKA=1" });
                }
            } else {
                navigate({ pathname: item.to, search: "?view=all" });
            }
        } catch (err) {
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
                const first = [...ka].sort((a, b) => {
                    const aIsIdeas = (a.title || "").trim().toLowerCase() === "ideas" || !!a.is_default;
                    const bIsIdeas = (b.title || "").trim().toLowerCase() === "ideas" || !!b.is_default;
                    if (aIsIdeas && !bIsIdeas) return 1;
                    if (!aIsIdeas && bIsIdeas) return -1;
                    return String(a.title || "").localeCompare(String(b.title || ""));
                })[0];
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

    // Derive display list: Use position if available, otherwise alphabetical A→Z, Ideas last, dedupe any duplicate Ideas
    const displayKeyAreas = React.useMemo(() => {
        let arr = Array.isArray(keyAreasList) ? keyAreasList.slice() : [];
        const seen = new Set();
        arr = arr.filter((x) => {
            const id = String(x.id || "");
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
        const ideas = arr.filter(
            (i) =>
                String(i.title || "")
                    .trim()
                    .toLowerCase() === "ideas" || i.is_default,
        );
        if (ideas.length > 1) {
            const keep = ideas.find((i) => i.is_default) || ideas[0];
            const keepId = keep.id;
            arr = arr.filter((i) => {
                const isIdeas =
                    String(i.title || "")
                        .trim()
                        .toLowerCase() === "ideas" || i.is_default;
                return !isIdeas || i.id === keepId;
            });
        }
        
        // Sort by position if available, otherwise by name (Ideas last)
        return arr.sort((a, b) => {
            // If both have positions, sort by position
            if (typeof a.position === 'number' && typeof b.position === 'number') {
                return a.position - b.position;
            }
            
            // If only one has position, prioritize it
            if (typeof a.position === 'number') return -1;
            if (typeof b.position === 'number') return 1;
            
            // Fallback to original alphabetical sorting with Ideas last
            const aIsIdeas = (a.title || "").trim().toLowerCase() === "ideas" || !!a.is_default;
            const bIsIdeas = (b.title || "").trim().toLowerCase() === "ideas" || !!b.is_default;
            if (aIsIdeas && !bIsIdeas) return 1;
            if (!aIsIdeas && bIsIdeas) return -1;
            return String(a.title || "").localeCompare(String(b.title || ""));
        });
    }, [keyAreasList]);

    // when landing on /key-areas with openKA=1, auto-open the dropdown on first render
    React.useEffect(() => {
        if (location.pathname.startsWith("/key-areas")) {
            const params = new URLSearchParams(location.search || "");
            if (params.get("openKA") === "1" && !keyAreasOpen) {
                setKeyAreasOpen(true);
            }
        }
    }, [location.pathname, location.search]);

    // mobile overlay classes
    const mobileTranslate = mobileOpen ? "translate-x-0" : "-translate-x-full";

    return (
        <aside
            className={`bg-[#F7F6F3] ${collapsed ? "w-20" : "w-64"} h-screen shadow-lg border border-blue-300 flex flex-col justify-between px-2 transition-transform duration-300 rounded-2xl overflow-hidden ${mobileTranslate} fixed top-0 left-0 bottom-0 z-40 md:sticky md:top-0 md:translate-x-0 md:ml-4 md:mr-2 hidden-mobile`}
            aria-label="Sidebar"
        >
            <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
                <div className="mb-6 flex items-center gap-2 px-2">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-8 h-8" />
                    {!collapsed && <span className="font-bold text-lg text-blue-900">Practical Manager</span>}

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
                
                <div className={`px-2`}>
                    <div className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-[13px]">
                        <nav aria-label="Sidebar navigation">
                            {navItems
                                .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
                                .filter((item) => (item.to === "/calendar" ? calendarEnabled : true))
                                .map((item) => {
                                    const isKeyAreas = item.label === "Key Areas" || (item.to && item.to === "/key-areas");

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
                                                        {displayKeyAreas &&
                                                            displayKeyAreas.length > 0 &&
                                                            displayKeyAreas.map((ka, index) => {
                                                                const isActive =
                                                                    location.pathname.startsWith("/key-areas") &&
                                                                    new URLSearchParams(location.search).get("ka") ===
                                                                        String(ka.id);
                                                                const baseClasses = "flex items-center gap-2 px-3 py-2 rounded mb-2 transition text-left w-full";
                                                                const activeClasses = "text-blue-700 font-semibold bg-white shadow-inner";
                                                                const inactiveClasses = "text-gray-800 hover:bg-white";
                                                                const dragOverClasses = dragOverIndex === index ? "bg-blue-100 border-2 border-blue-300 border-dashed" : "";
                                                                
                                                                const itemClasses = `${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${dragOverClasses}`;
                                                                const isLocked = !!ka.is_default;
                                                                const isIdeas = /idea/i.test(ka.title || "");
                                                                const isDraggable = !isLocked; // Only allow dragging non-default items
                                                                
                                                                return (
                                                                    <div
                                                                        key={ka.id}
                                                                        draggable={isDraggable}
                                                                        onDragStart={isDraggable ? (e) => handleDragStart(e, ka, index) : undefined}
                                                                        onDragEnd={isDraggable ? handleDragEnd : undefined}
                                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                                        onDragLeave={handleDragLeave}
                                                                        onDrop={(e) => handleDrop(e, index)}
                                                                        className={`relative sidebar-key-area-item ${
                                                                            isDraggable ? 'sidebar-draggable cursor-move' : ''
                                                                        } ${
                                                                            draggedItem?.ka.id === ka.id ? 'sidebar-dragging' : ''
                                                                        } ${
                                                                            dragOverIndex === index ? 'sidebar-drag-over' : ''
                                                                        }`}
                                                                        style={{
                                                                            opacity: draggedItem?.ka.id === ka.id ? 0.7 : 1
                                                                        }}
                                                                    >
                                                                        <Link
                                                                            to={{
                                                                                pathname: "/key-areas",
                                                                                search: `?ka=${ka.id}`,
                                                                            }}
                                                                            onClick={(e) => {
                                                                                // Prevent navigation if we're dragging
                                                                                if (draggedItem) {
                                                                                    e.preventDefault();
                                                                                    return;
                                                                                }
                                                                                try {
                                                                                    window.dispatchEvent(
                                                                                        new CustomEvent("sidebar-open-ka", {
                                                                                            detail: { id: ka.id },
                                                                                        }),
                                                                                    );
                                                                                } catch (err) {}
                                                                            }}
                                                                            className={`${itemClasses} group`}
                                                                        >
                                                                            {isDraggable && (
                                                                                <FaGripVertical 
                                                                                    className="text-gray-300 hover:text-gray-600 text-xs mr-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                                                                                    title="Drag to reorder"
                                                                                />
                                                                            )}
                                                                            <span 
                                                                                className="text-sm flex items-center gap-2 flex-1"
                                                                                style={{ color: ka.color || '#374151' }}
                                                                            >
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
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

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
                        </nav>
                    </div>
                </div>
                
                {/* Quick Actions removed per request */}
            </div>
        </aside>
    );
}