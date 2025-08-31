import React from "react";
import Sidebar from "../../components/shared/Sidebar";

export default function TeamDashboard() {
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-900">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-6">
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600">
                        ← Back to Dashboard
                    </a>
                </div>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">Team Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300">Overview of team goals, workload, and recognition.</p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-white dark:bg-neutral-800 border rounded-2xl p-6 shadow">
                        <h2 className="font-semibold mb-2">Team goals</h2>
                        <div className="text-sm text-gray-500">Completion: 68%</div>
                    </section>
                    <section className="bg-white dark:bg-neutral-800 border rounded-2xl p-6 shadow">
                        <h2 className="font-semibold mb-2">Workload</h2>
                        <div className="text-sm text-gray-500">Avg 32h/week</div>
                    </section>
                </div>
            </main>
        </div>
    );
}
