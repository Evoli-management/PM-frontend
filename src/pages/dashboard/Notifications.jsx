import React, { useState } from "react";
import Sidebar from "../../components/shared/Sidebar";
import DashboardContainer from "../../components/dashboard/DashboardContainer";
import DashboardTile from "../../components/dashboard/DashboardTile";
import { FaBars } from "react-icons/fa";

export default function Notifications() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    const items = [
        { title: "You were mentioned in a comment", time: "2h" },
        { title: "Goal 'Launch MVP' updated", time: "1d" },
        { title: "New recognition received", time: "3d" },
    ];
    
    return (
        <div className="flex min-h-screen">
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

            <DashboardContainer title="Notifications">
                <div className="col-span-full mb-2 px-1">
                    <a href="#/dashboard" className="text-sm text-blue-600">← Back to Dashboard</a>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">Your recent activity and alerts.</p>
                </div>

                {items.map((it, i) => (
                    <DashboardTile key={i} className="flex justify-between items-center">
                        <div className="text-gray-800 dark:text-slate-200">{it.title}</div>
                        <div className="text-xs text-gray-400">{it.time}</div>
                    </DashboardTile>
                ))}
            </DashboardContainer>
        </div>
    );
}
