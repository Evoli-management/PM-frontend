import React, { useState } from "react";
import Sidebar from "../components/shared/Sidebar.jsx";
import CalendarContainer from "../components/calendar/CalendarContainer.jsx";
import { FaBars } from "react-icons/fa";

export default function Calendar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex w-full overflow-hidden">
                <Sidebar
                    user={{ name: "User" }}
                    collapsed={collapsed}
                    onCollapseToggle={() => setCollapsed((c) => !c)}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <main className={`flex-1 min-w-0 w-full transition-all md:ml-[1mm]`}>
                    <div className="max-w-full overflow-x-hidden">
                        <div className="flex items-center justify-between gap-2 mb-2 p-2 md:p-3 pb-0 md:pb-0">
                            <div className="flex items-center gap-3">
                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>
                                {/* Title removed per request */}
                            </div>
                        </div>
                        <div className="px-4 md:px-8">
                            {/* Description removed per request */}
                            <CalendarContainer />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
