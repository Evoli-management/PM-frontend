import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Home,
    Calendar,
    Lock,
    ChevronDown,
    Search,
    GripVertical,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { isFeatureEnabled } from "../../utils/flags.js";

const navItems = [
    { label: "Dashboard", icon: <Home className="w-5 h-5" />, to: "/dashboard", section: "Main" },
    { label: "Calendar", icon: <Calendar className="w-5 h-5" />, to: "/calendar", section: "Main" },
    {
        label: "Goals & Tracking",
        icon: <img src={`${import.meta.env.BASE_URL}goals.png`} alt="Goals" className="w-5 h-5 object-contain" />,
        to: "/goals",
        section: "Main",
    },
    {
        label: "Don't Forget",
        icon: <img src={`${import.meta.env.BASE_URL}dont-forget.png`} alt="Don't Forget" className="w-5 h-5 object-contain" />,
        to: "/tasks",
        section: "Main",
    },
    {
        label: "Key Areas",
        icon: (
            <img src={`${import.meta.env.BASE_URL}key-area.png`} alt="Key Areas" className="w-5 h-5 object-contain" />
        ),
        to: "/key-areas",
        section: "Main",
    },
    {
        label: "Team",
        icon: <img src={`${import.meta.env.BASE_URL}team.png`} alt="Team" className="w-5 h-5 object-contain" />,
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
            
            // Filter out "Don't Forget" - it's a separate nav item now
            const title = String(x.title || "").trim().toLowerCase();
            if (title === "don't forget" || title === "dont forget") return false;
            
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
            className={`bg-white ${collapsed ? "w-20" : "w-72"} h-screen md:h-[calc(100vh-2rem)] shadow-xl border border-slate-200 flex flex-col transition-all duration-300 rounded-2xl overflow-hidden ${mobileTranslate} fixed top-0 left-0 z-40 md:sticky md:top-4 md:translate-x-0 md:ml-4 md:mr-2 md:my-4 hidden-mobile`}
            aria-label="Sidebar"
        >
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-10 h-10 flex-shrink-0" />
                            {!collapsed && (
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-lg text-slate-900 truncate">Practical</span>
                                    <span className="text-xs text-slate-500 truncate">Manager</span>
                                </div>
                            )}
                        </div>

                        <button
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            onClick={() => {
                                if (typeof onCollapseToggle === "function") onCollapseToggle();
                                else setInternalCollapsed((c) => !c);
                            }}
                        >
                            {collapsed ? (
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            ) : (
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            )}
                        </button>
                    </div>

                    {/* Search Bar */}
                    {!collapsed && (
                        <div className="mt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Navigation */}
                <div className="p-4">
                    <nav aria-label="Sidebar navigation" className="space-y-1">
                            {navItems
                                .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
                                .filter((item) => (item.to === "/calendar" ? calendarEnabled : true))
                                .map((item) => {
                                    const isKeyAreas = item.label === "Key Areas" || (item.to && item.to === "/key-areas");
                                    const isActive = location.pathname.startsWith(item.to);

                                    if (isKeyAreas) {
                                        return (
                                            <div key={item.label}>
                                                <button
                                                    onClick={(e) => handleKeyAreasClick(e, item)}
                                                    aria-expanded={keyAreasOpen}
                                                    className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all group focus:outline-none ${
                                                        isActive 
                                                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold" 
                                                            : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <span className="flex-shrink-0" title={item.label}>
                                                        {item.icon}
                                                    </span>
                                                    {!collapsed && (
                                                        <>
                                                            <span className="flex-1 text-left text-sm">{item.label}</span>
                                                            <ChevronDown
                                                                className={`w-4 h-4 transition-transform ${keyAreasOpen ? "rotate-180" : "rotate-0"}`}
                                                            />
                                                        </>
                                                    )}
                                                </button>
                                                {!collapsed && keyAreasOpen && (
                                                    <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
                                                        {/* Dynamic Key Areas */}
                                                        {displayKeyAreas &&
                                                            displayKeyAreas.length > 0 &&
                                                            displayKeyAreas.map((ka, index) => {
                                                                const isActive =
                                                                    location.pathname.startsWith("/key-areas") &&
                                                                    new URLSearchParams(location.search).get("ka") ===
                                                                        String(ka.id);
                                                                const baseClasses = "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left w-full text-sm";
                                                                const activeClasses = "bg-blue-50 text-blue-700 font-medium";
                                                                const inactiveClasses = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
                                                                const dragOverClasses = dragOverIndex === index ? "bg-blue-100 ring-2 ring-blue-300 ring-inset" : "";
                                                                
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
                                                                                <GripVertical 
                                                                                    className="text-slate-300 group-hover:text-slate-500 w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                                                    title="Drag to reorder"
                                                                                />
                                                                            )}
                                                                            <span 
                                                                                className="flex items-center gap-2 flex-1 truncate"
                                                                                style={{ color: isActive ? undefined : (ka.color || '#64748b') }}
                                                                            >
                                                                                <span className="truncate">{ka.title}</span>
                                                                                {isLocked && (
                                                                                    <span className="inline-flex items-center flex-shrink-0">
                                                                                        {isIdeas ? (
                                                                                            <img
                                                                                                src={`${import.meta.env.BASE_URL}ideas.png`}
                                                                                                alt="Ideas"
                                                                                                className="w-3.5 h-3.5 object-contain"
                                                                                            />
                                                                                        ) : (
                                                                                            <Lock className="w-3 h-3 text-slate-400" />
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
                                        <div key={item.label}>
                                            <Link
                                                to={item.to}
                                                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                                                    isActive 
                                                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold" 
                                                        : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <span className="flex-shrink-0" title={item.label}>
                                                    {item.icon}
                                                </span>
                                                {!collapsed && <span className="text-sm flex-1">{item.label}</span>}
                                                {item.badge && !collapsed && (
                                                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
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
        </aside>
    );
}