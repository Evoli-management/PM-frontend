import React from "react";
import Sidebar from "../../components/shared/Sidebar";

export default function Recognition() {
    return (
        <div className="flex min-h-screen bg-[Canvas] text-[CanvasText]">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-6">
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600">
                        ← Back to Dashboard
                    </a>
                </div>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">Recognition</h1>
                <p className="text-gray-600 dark:text-gray-300">Give kudos and view recognition history.</p>
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Give a stroke</h2>
                        <div className="flex gap-2">
                            <input className="border rounded px-3 py-2 flex-1" placeholder="To" />
                            <input className="border rounded px-3 py-2 flex-1" placeholder="Message" />
                            <button className="px-3 py-2 bg-blue-600 text-white rounded">Send</button>
                        </div>
                    </section>
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Stats</h2>
                        <div className="text-sm text-gray-500">Top givers, most appreciated values</div>
                    </section>
                </div>
            </main>
        </div>
    );
}
