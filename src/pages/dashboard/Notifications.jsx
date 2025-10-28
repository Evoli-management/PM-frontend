import React, { useState } from "react";
import Sidebar from "../../components/shared/Sidebar";
import { FaBars } from "react-icons/fa";

export default function Notifications() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    const items = [
        { title: "You were mentioned in a comment", time: "2h" },
        { title: "Goal 'Launch MVP' updated", time: "1d" },
        { title: "New recognition received", time: "3d" },
    ];
    
    return (
        <div className="flex min-h-screen bg-[Canvas] text-[CanvasText]">
            <Sidebar 
                user={{ name: "Hussein" }} 
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            <main className="flex-1 p-4 sm:p-6">
                {/* Mobile menu button */}
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
                    onClick={() => setMobileSidebarOpen(true)}
                >
                    <FaBars className="h-5 w-5 text-gray-600" />
                </button>
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600">
                        ← Back to Dashboard
                    </a>
                </div>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">Notifications</h1>
                <p className="text-gray-600 dark:text-gray-300">Your recent activity and alerts.</p>
                <ul className="mt-6 space-y-3">
                    {items.map((it, i) => (
                        <li key={i} className="bg-[Canvas] border rounded p-4 flex justify-between text-[CanvasText]">
                            <div className="text-gray-800 dark:text-slate-200">{it.title}</div>
                            <div className="text-xs text-gray-400">{it.time}</div>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
