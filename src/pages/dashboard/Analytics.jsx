import React from "react";
import Sidebar from "../../components/shared/Sidebar";

export default function Analytics() {
    return (
        <div className="flex min-h-screen bg-[Canvas] text-[CanvasText]">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-6">
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600">
                        ← Back to Dashboard
                    </a>
                </div>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">Analytics</h1>
                <p className="text-[CanvasText] opacity-80">Productivity insights and trends.</p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Time distribution</h2>
                        <div className="text-sm text-[CanvasText] opacity-70">Goals vs Trap vs Meetings</div>
                    </section>
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Focus hours</h2>
                        <div className="text-sm text-[CanvasText] opacity-70">Best time-of-day for deep work</div>
                    </section>
                    <section className="bg-[Canvas] border rounded-2xl p-6 shadow text-[CanvasText]">
                        <h2 className="font-semibold mb-2">Goal completion rate</h2>
                        <div className="text-sm text-[CanvasText] opacity-70">Weekly trend</div>
                    </section>
                </div>
            </main>
        </div>
    );
}
