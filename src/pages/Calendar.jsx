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
                <main className={`flex-1 min-w-0 w-full transition-all md:ml-[3mm]`}>
                    <div className="max-w-full overflow-x-hidden">
                        <div className="flex items-center justify-between gap-3 mb-4 p-4 md:p-8 pb-0 md:pb-0">
                            <div className="flex items-center gap-3">
                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>
                                <h1 className="text-3xl font-bold text-blue-700">Calendar</h1>
                            </div>
                        </div>
                        <div className="px-4 md:px-8">
                            <p className="text-gray-500 text-base mb-4">
                                Modern interactive calendar. All views enabled. Tasks & activities shown as events.
                            </p>
                            <CalendarContainer />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
