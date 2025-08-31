import React from "react";
import Sidebar from "../../components/shared/Sidebar";

export default function Notifications() {
    const items = [
        { title: "You were mentioned in a comment", time: "2h" },
        { title: "Goal 'Launch MVP' updated", time: "1d" },
        { title: "New recognition received", time: "3d" },
    ];
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-900">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-6">
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600">
                        ← Back to Dashboard
                    </a>
                </div>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">Notifications</h1>
                <p className="text-gray-600 dark:text-gray-300">Your recent activity and alerts.</p>
                <ul className="mt-6 space-y-3">
                    {items.map((it, i) => (
                        <li key={i} className="bg-white dark:bg-neutral-800 border rounded p-4 flex justify-between">
                            <div className="text-gray-800 dark:text-slate-200">{it.title}</div>
                            <div className="text-xs text-gray-400">{it.time}</div>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
