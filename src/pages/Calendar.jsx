import React, { useState } from "react";
import Sidebar from "../components/shared/Sidebar.jsx";
import CalendarContainer from "../components/calendar/CalendarContainer.jsx";
import { FaBars } from "react-icons/fa";

export default function Calendar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#EDEDED]">
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
                <main className="flex-1 min-w-0 w-full min-h-screen transition-all overflow-y-auto">
                    <div className="max-w-full overflow-x-hidden pb-1 min-h-full">
                        <div className="flex items-center justify-between gap-2 mb-0 p-0 pb-0">
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
                        <div className="px-1 md:px-2">
                            {/* Description removed per request */}
                            <CalendarContainer />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
