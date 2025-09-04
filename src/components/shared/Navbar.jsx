import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaUser } from "react-icons/fa";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    return (
        <header className="bg-blue-600 text-white">
            <div className="w-full px-2 md:px-4 py-3 flex items-center justify-between">
                <Link to="/" className="font-bold tracking-wide">
                    Practical Manager
                </Link>
                <div className="relative">
                    <button
                        onClick={() => setOpen((o) => !o)}
                        className="flex items-center gap-3 rounded-full border border-white/30 bg-blue-500/40 px-3 py-1.5 hover:bg-blue-500/60"
                        aria-haspopup="menu"
                        aria-expanded={open ? "true" : "false"}
                    >
                        <span className="w-9 h-9 rounded-full bg-white/30 text-white flex items-center justify-center">
                            <FaUser className="w-6 h-6" />
                        </span>
                        <svg
                            className="w-5 h-5"
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
                                👤 Profile & Settings
                            </Link>
                            <Link
                                to="/admin-settings"
                                className="block px-3 py-2 text-sm hover:bg-slate-50"
                                onClick={() => setOpen(false)}
                            >
                                ⚙️ Admin Settings
                            </Link>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                onClick={() => {
                                    setOpen(false);
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
        </header>
    );
}
