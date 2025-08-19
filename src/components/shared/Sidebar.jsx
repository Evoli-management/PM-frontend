import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaBell, FaBullseye, FaKey, FaHeart, FaUsers } from "react-icons/fa";

const navItems = [
  { label: "Dashboard", icon: <FaHome />, to: "/dashboard" },
  { label: "Calendar", icon: <FaCalendarAlt />, to: "/calendar" },
  { label: "Don't Forget", icon: <FaBell />, to: "/reminders" },
  { label: "Goals", icon: <FaBullseye />, to: "/goals" },
  { label: "Key Areas", icon: <FaKey />, to: "/key-areas" },
  { label: "Give Strokes", icon: <FaHeart />, to: "/recognition" },
  { label: "Teams & Members", icon: <FaUsers />, to: "/teams" },
];

export default function Sidebar({ user }) {
  const location = useLocation();
  return (
    <aside className="bg-gradient-to-b from-blue-400 to-blue-200 w-64 h-screen shadow-lg border-r border-blue-300 flex flex-col justify-between py-6 px-4">
      <div>
        <div className="mb-8 flex items-center gap-2">
          <img src="/PM-frontend/logo.png" alt="Logo" className="w-8 h-8" />
          <span className="font-bold text-lg text-blue-900">Practical Manager</span>
        </div>
        <nav aria-label="Sidebar navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition ${
                location.pathname === item.to
                  ? "bg-blue-200 text-blue-700 font-bold"
                  : "text-blue-900 hover:bg-blue-50"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-8 flex items-center gap-3">
        <img src="/PM-frontend/avatar.png" alt="User" className="w-8 h-8 rounded-full" />
        <span className="text-blue-900 font-semibold">{user?.name || "Username"}</span>
        <button className="ml-auto text-blue-700 hover:underline">Logout</button>
      </div>
    </aside>
  );
}
