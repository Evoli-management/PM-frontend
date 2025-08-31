import React from "react";
import Sidebar from "../../components/shared/Sidebar";

export default function ENPS() {
    return (
        <div className="flex min-h-screen bg-[Canvas] text-[CanvasText]">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-6">
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600">
                        ← Back to Dashboard
                    </a>
                </div>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">eNPS</h1>
                <p className="text-gray-600 dark:text-gray-300">Survey results and trend.</p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Current score</h2>
                        <div className="text-4xl font-bold text-blue-600">0</div>
                        <div className="text-sm text-gray-500">Updated weekly</div>
                    </section>
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Actions</h2>
                        <button className="px-3 py-2 bg-blue-600 text-white rounded">Export CSV</button>
                    </section>
                </div>
            </main>
        </div>
    );
}
