import React, { useEffect, useState } from "react";
import Sidebar from "../components/shared/Sidebar.jsx";
import CalendarContainer from "../components/calendar/CalendarContainer.jsx";
import { FaBars } from "react-icons/fa";

export default function Calendar() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyOverflow = document.body.style.overflow;

        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        return () => {
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
        };
    }, []);

    return (
        <div className="h-[calc(100vh-72px)] bg-[#EDEDED] overflow-hidden">
            <div className="flex w-full h-full min-h-0 overflow-hidden">
                <Sidebar
                    user={{ name: "User" }}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <main className="flex-1 min-w-0 w-full h-full min-h-0 transition-all overflow-hidden">
                    <div className="max-w-full h-full min-h-0 overflow-hidden pb-1">
                        <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
                            <div className="flex items-center gap-4">
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
                        <div className="px-1 md:px-2 h-full min-h-0 overflow-hidden">
                            {/* Description removed per request */}
                            <CalendarContainer />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
