import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    FaHome,
    FaCalendarAlt,
    FaBell,
    FaBullseye,
    FaKey,
    FaHeart,
    FaUsers,
    FaChevronDown,
    FaCog,
    FaSignOutAlt,
    FaPlus,
    FaSearch,
    FaTasks,
    FaClock,
    FaChartBar,
} from "react-icons/fa";

const navItems = [
    { label: "Dashboard", icon: <FaHome />, to: "/dashboard", section: "Main" },
    { label: "Tasks & Activities", icon: <FaTasks />, to: "/tasks", section: "Main", badge: 3 },
    { label: "Calendar", icon: <FaCalendarAlt />, to: "/calendar", section: "Main" },
    { label: "Goals & Tracking", icon: <FaBullseye />, to: "/goals", section: "Main", badge: 2 },
    { label: "Key Areas", icon: <FaKey />, to: "/key-areas", section: "Main" },
    { label: "Time Tracking", icon: <FaClock />, to: "/time-tracking", section: "Main" },
    { label: "Team", icon: <FaUsers />, to: "/teams", section: "Main" },
    { label: "Analytics", icon: <FaChartBar />, to: "/analytics", section: "Main" },
    { label: "Settings", icon: <FaCog />, to: "/settings", section: "Main" },
];

const quickActions = [
    { label: "New Task", icon: <FaPlus />, to: "/tasks" },
    { label: "Activity Trap", icon: <FaBell />, to: "/tasks?view=activity-trap" },
    { label: "Set Goal", icon: <FaBullseye />, to: "/goals" },
    { label: "Invite Team", icon: <FaUsers />, to: "/teams" },
];

export default function Sidebar({ user }) {
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [search, setSearch] = useState("");

    return (
        <aside
            className={`bg-[#F7F6F3] ${collapsed ? "w-20" : "w-72"} min-h-screen shadow-lg border-r border-blue-300 flex flex-col justify-between px-2 transition-all duration-300 rounded-t-3xl rounded-b-3xl rounded-l-3xl rounded-r-3xl`}
            aria-label="Sidebar"
        >
            <div>
                <div className="mb-6 flex items-center gap-2 px-2">
                    <img src="/PM-frontend/logo.png" alt="Logo" className="w-8 h-8" />
                    {!collapsed && <span className="font-bold text-lg text-blue-900">Practical Manager</span>}
                    <button
                        className="ml-auto text-blue-700 hover:text-blue-900 focus:outline-none"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        onClick={() => setCollapsed((c) => !c)}
                    >
                        <FaChevronDown className={`transform ${collapsed ? "rotate-90" : "rotate-0"}`} />
                    </button>
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
                <nav aria-label="Sidebar navigation">
                    {navItems
                        .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
                        .map((item) =>
                            item.children ? (
                                <div key={item.label} className="mb-2">
                                    <div
                                        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition group focus:outline-none focus:ring-2 focus:ring-blue-400 ${location.pathname.startsWith(item.to) ? "bg-blue-100 text-blue-700 font-bold" : "text-blue-900 hover:bg-blue-50"} ${collapsed ? "justify-center px-0" : ""}`}
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
                                        {collapsed && <span className="sr-only">{item.label}</span>}
                                    </div>
                                    {/* Render children as nested links */}
                                    {!collapsed && (
                                        <div className="ml-8">
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.label}
                                                    to={child.to}
                                                    className={`flex items-center gap-2 px-2 py-1 rounded-lg mb-1 transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${location.pathname === child.to ? "bg-blue-200 text-blue-700 font-bold" : "text-blue-900 hover:bg-blue-50"}`}
                                                    tabIndex={0}
                                                    aria-label={child.label}
                                                >
                                                    <span className="text-lg" title={child.label}>
                                                        {child.icon}
                                                    </span>
                                                    <span>{child.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    key={item.label}
                                    to={item.to}
                                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition group focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                        location.pathname === item.to
                                            ? "bg-blue-200 text-blue-700 font-bold"
                                            : "text-blue-900 hover:bg-blue-50"
                                    } ${collapsed ? "justify-center px-0" : ""}`}
                                    tabIndex={0}
                                    aria-label={item.label}
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
                                    {collapsed && <span className="sr-only">{item.label}</span>}
                                </Link>
                            ),
                        )}
                </nav>
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
            <div className="mt-8 px-2 relative">
                <Link
                    to="/profile"
                    className="flex items-center gap-3 cursor-pointer group"
                    tabIndex={0}
                    aria-label="User menu"
                >
                    <img
                        src="/PM-frontend/avatar.png"
                        alt="User"
                        className="w-8 h-8 rounded-full border-2 border-blue-300"
                    />
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-blue-900 font-semibold">{user?.name || "Username"}</span>
                            <span className="text-xs text-green-600 font-bold">Online</span>
                        </div>
                    )}
                    <FaChevronDown className={`ml-auto text-blue-700`} />
                </Link>
                {userMenuOpen && !collapsed && (
                    <div className="absolute bottom-12 left-0 w-48 bg-white rounded-lg shadow-lg border border-blue-200 z-10">
                        <Link
                            to="/profile"
                            className="flex items-center gap-2 px-4 py-2 text-blue-900 hover:bg-blue-50 w-full"
                            onClick={() => setUserMenuOpen(false)}
                        >
                            <FaCog /> <span>Profile & Settings</span>
                        </Link>
                        <button className="flex items-center gap-2 px-4 py-2 text-blue-900 hover:bg-blue-50 w-full text-left">
                            <FaSignOutAlt /> <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
