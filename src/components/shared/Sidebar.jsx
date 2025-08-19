import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaBell, FaBullseye, FaKey, FaHeart, FaUsers, FaChevronDown, FaCog, FaSignOutAlt, FaPlus } from "react-icons/fa";

const navItems = [
  { label: "Dashboard", icon: <FaHome />, to: "/dashboard", section: "Main" },
  { label: "Calendar", icon: <FaCalendarAlt />, to: "/calendar", section: "Main" },
  { label: "Don't Forget", icon: <FaBell />, to: "/reminders", section: "Main", badge: 3 },
  { label: "Goals", icon: <FaBullseye />, to: "/goals", section: "Main" },
  { label: "Key Areas", icon: <FaKey />, to: "/key-areas", section: "Team" },
  { label: "Give Strokes", icon: <FaHeart />, to: "/recognition", section: "Team" },
  { label: "Teams & Members", icon: <FaUsers />, to: "/teams", section: "Team" },
];

const sections = ["Main", "Team"];

export default function Sidebar({ user }) {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-gradient-to-b from-blue-400 to-blue-200 ${collapsed ? "w-20" : "w-64"} h-screen shadow-lg border-r border-blue-300 flex flex-col justify-between py-6 px-2 transition-all duration-300`}
      aria-label="Sidebar"
    >
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
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
        {sections.map((section) => (
          <div key={section} className="mb-4">
            {!collapsed && <div className="uppercase text-xs text-blue-700 font-bold px-2 mb-2">{section}</div>}
            <nav aria-label={`${section} navigation`}>
              {navItems.filter((item) => item.section === section).map((item) => (
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
                  <span className="text-xl" title={item.label}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && (
                    <span className="absolute right-3 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold group-hover:bg-red-600">{item.badge}</span>
                  )}
                  {collapsed && <span className="sr-only">{item.label}</span>}
                </Link>
              ))}
            </nav>
          </div>
        ))}
        {!collapsed && (
          <div className="mt-4 px-2">
            <button className="w-full flex items-center gap-2 bg-green-500 text-white rounded-lg px-3 py-2 font-bold hover:bg-green-600 transition">
              <FaPlus /> <span>Add Task</span>
            </button>
          </div>
        )}
      </div>
      <div className="mt-8 px-2 relative">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          tabIndex={0}
          aria-label="User menu"
          onClick={() => setUserMenuOpen((o) => !o)}
          onBlur={() => setUserMenuOpen(false)}
        >
          <img src="/PM-frontend/avatar.png" alt="User" className="w-8 h-8 rounded-full border-2 border-blue-300" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-blue-900 font-semibold">{user?.name || "Username"}</span>
              <span className="text-xs text-green-600 font-bold">Online</span>
            </div>
          )}
          <FaChevronDown className={`ml-auto text-blue-700 ${userMenuOpen ? "rotate-180" : "rotate-0"}`} />
        </div>
        {userMenuOpen && !collapsed && (
          <div className="absolute bottom-12 left-0 w-48 bg-white rounded-lg shadow-lg border border-blue-200 z-10">
            <Link to="/profile-settings" className="flex items-center gap-2 px-4 py-2 text-blue-900 hover:bg-blue-50">
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
