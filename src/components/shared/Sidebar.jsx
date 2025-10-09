import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaHome,
    FaCalendarAlt,
    FaLock,
    FaUser,
    FaCog,
    FaPlus,
    FaSearch,
    FaClock,
    FaChartBar,
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
    { label: "Time Tracking", icon: <FaClock />, to: "/time-tracking", section: "Main" },
    {
        label: "Team",
        icon: <img src={`${import.meta.env.BASE_URL}team.png`} alt="Team" className="w-6 h-6 object-contain" />,
        to: "/teams",
        section: "Main",
    },
    { label: "Analytics", icon: <FaChartBar />, to: "/analytics", section: "Main" },
];

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    const handleNavigation = (item) => {
        if (typeof item.to === 'string') {
            navigate(item.to);
        } else {
            navigate(item.to);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="w-64 bg-white border-r border-gray-200 p-4">
            <div className="space-y-2">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handleNavigation(item)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                            location.pathname === (typeof item.to === 'string' ? item.to : item.to.pathname)
                                ? 'bg-blue-100 text-blue-700'
                                : 'hover:bg-gray-100'
                        }`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}