import React, { useState } from "react";
import Sidebar from "../../components/shared/Sidebar";
import { FaBars } from "react-icons/fa";

export default function TeamDashboard() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">Team Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">Overview of team goals, workload, and recognition.</p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Team goals</h2>
                        <div className="text-sm text-gray-500">Completion: 68%</div>
                    </section>
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Workload</h2>
                        <div className="text-sm text-gray-500">Avg 32h/week</div>
                    </section>
                </div>
            </main>
        </div>
    );
}
