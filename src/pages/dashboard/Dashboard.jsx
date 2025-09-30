export default function Dashboard() {

	// ... (omitted previous code for brevity)

	// ... (omitted drag-and-drop and countdown helpers)

    // Simple CSV export helper for client-side downloads
    function exportCsv(filename, rows) {
        try {
            const csv = Array.isArray(rows) ? rows.map((r) => r.join(",")).join("\n") : String(rows);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {}
    }

    return (
        <div className="flex min-h-screen bg-[Canvas]">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-4 md:p-8 text-[CanvasText]">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div></div>
                    {/* Widget toggles dropdown on the right */}
                    <div className="relative ml-auto">
                        <details ref={widgetsDetailsRef} className="relative">
                            <summary className="px-3 py-1 bg-[Canvas] border rounded cursor-pointer text-[CanvasText]">
                                Widgets
                            </summary>
                            <div className="absolute right-0 mt-2 w-64 bg-[Canvas] border rounded shadow p-3 z-40 max-h-80 overflow-auto text-[CanvasText]">
                                {Object.keys(prefs.widgets).map((k) => (
                                    <label
                                        key={k}
                                        className="flex items-center justify-between gap-2 mb-2 text-sm text-[CanvasText] opacity-90"
                                    >
                                        <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                                        <input
                                            type="checkbox"
                                            checked={prefs.widgets[k]}
                                            onChange={() => toggleWidget(k)}
                                        />
                                    </label>
                                ))}
                            </div>
                        </details>
                    </div>
                </div>

                {/* Onboarding tip */}
                {showTip && (
                    <div className="mb-4 p-3 rounded border bg-blue-50 text-blue-900 flex items-center gap-3 dark:bg-blue-900/20 dark:text-blue-200">
                        <span>New here? Take a 30-second tour of your dashboard.</span>
                        <button
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            onClick={() => setMessage("Tour is coming soon")}
                        >
                            Start Tour
                        </button>
                        <button className="ml-auto text-sm underline" onClick={dismissTip}>
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Top Section: Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                    {prefs.widgets.myDay && (
                        <StatsCard
                            title="My Day"
                            tooltip="Your daily schedule: appointments and tasks"
                            href="#/calendar"
                        >
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {myDayStats.tasksDueToday} tasks
                            </div>
                            <div className="text-xs text-[CanvasText] opacity-80">
                                {myDayStats.overdue} overdue • {myDayStats.appointments} appointments
                            </div>
                        </StatsCard>
                    )}

                    {prefs.widgets.goals && (
                        <StatsCard
                            title="Goals Progress"
                            tooltip="Average progress across your active goals"
                            href="#/goals"
                        >
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{avgGoal}%</div>
                            <div className="mt-2 bg-gray-100 dark:bg-neutral-700 rounded h-2 overflow-hidden">
                                <div className="h-2 bg-blue-500" style={{ width: `${avgGoal}%` }} />
                            </div>
                        </StatsCard>
                    )}

                    {prefs.widgets.enps && (
                        <StatsCard title="eNPS" tooltip="Employee Net Promoter Score (−100..+100)" href="#/enps">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">0</div>
                            <div className="text-xs text-[CanvasText] opacity-80">Survey status: up to date</div>
                        </StatsCard>
                    )}

                    {prefs.widgets.strokes && (
                        <StatsCard title="Strokes" tooltip="Recognition received and given" href="#/recognition">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {strokes.received.length}
                            </div>
                            <div className="text-xs text-[CanvasText] opacity-80">
                                received • {strokes.given.length} given
                            </div>
                        </StatsCard>
                    )}

                    {prefs.widgets.productivity && (
                        <StatsCard
                            title="Productivity"
                            tooltip="Hours logged this week: productive vs trap"
                            href="#/analytics"
                        >
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {productivity.productive}h
                            </div>
                            <div className="text-xs text-[CanvasText] opacity-80">
                                productive • {productivity.trap}h trap
                            </div>
                            <div className="mt-2 w-full h-2 bg-gray-100 dark:bg-neutral-700 rounded overflow-hidden flex">
                                {(() => {
                                    const total = productivity.productive + productivity.trap || 1;
                                    const prodW = (productivity.productive / total) * 100;
                                    const trapW = (productivity.trap / total) * 100;
                                    return (
                                        <>
                                            <div className="h-2 bg-green-500" style={{ width: `${prodW}%` }} />
                                            <div className="h-2 bg-red-500" style={{ width: `${trapW}%` }} />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="mt-2">
                                {(() => {
                                    const data = prodTrend;
                                    const W = 120;
                                    const H = 28;
                                    const max = 10;
                                    const pts = data
                                        .map((v, i) => {
                                            const x = (i / Math.max(1, data.length - 1)) * W;
                                            const y = H - (Math.min(max, Math.max(0, v)) / max) * H;
                                            return `${x},${y}`;
                                        })
                                        .join(" ");
                                    return (
                                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7">
                                            <polyline
                                                fill="none"
                                                stroke="#22c55e"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                points={pts}
                                            />
                                        </svg>
                                    );
                                })()}
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    className="px-2 py-1 border rounded text-xs"
                                    title="Export productivity summary"
                                    onClick={() => {
                                        const total = productivity.productive + productivity.trap;
                                        const pct = total ? (productivity.productive / total) * 100 : 0;
                                        exportCsv("productivity-summary.csv", [
                                            ["Metric", "Value"],
                                            ["Productive (h)", productivity.productive],
                                            ["Trap (h)", productivity.trap],
                                            ["Total (h)", total],
                                            ["Productive (%)", pct.toFixed(1)],
                                        ]);
                                    }}
                                >
                                    Export summary
                                </button>
                                <button
                                    className="px-2 py-1 border rounded text-xs"
                                    title="Export productivity trend"
                                    onClick={() => {
                                        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                                        const rows = [
                                            ["Label", "Hours"],
                                            ...prodTrend.map((v, i) => [labels[i] || `P${i + 1}`, v]),
                                        ];
                                        exportCsv("productivity-trend.csv", rows);
                                    }}
                                >
                                    Export trend
                                </button>
                            </div>
                        </StatsCard>
                    )}
                </div>

                {/* Middle Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* eNPS detailed snapshot */}
                    {prefs.widgets.enps && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-start justify-between">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">
                                    eNPS Snapshot
                                </h2>
                                <div className="text-xs text-[CanvasText] opacity-60 flex items-center gap-2">
                                    <span title="eNPS measures employee net promoter score; range -100 to +100">
                                        ℹ️
                                    </span>
                                    <button
                                        className="px-2 py-1 border rounded text-[CanvasText]"
                                        title="Export eNPS report"
                                        onClick={() =>
                                            exportCsv("enps-report.csv", [
                                                ["Week", "Score"],
                                                ...enpsData.map((v, i) => ["W" + (i + 1), v]),
                                            ])
                                        }
                                    >
                                        Export
                                    </button>
                                </div>
                            </div>
                            <a href="#/enps">
                                <EnpsChart data={enpsData} labels={enpsData.map((_, i) => `W${i + 1}`)} />
                            </a>
                        </section>
                    )}

                    {/* Goals list */}
                    {prefs.widgets.goals && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4">
                                    Your active goals
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="px-2 py-1 border rounded text-sm"
                                        title="Export goals"
                                        onClick={() => {
                                            const header = ["Title", "Progress (%)", "Status", "Last updated"];
                                            const toStatus = (p) =>
                                                p >= 70 ? "On track" : p >= 40 ? "At risk" : "Behind";
                                            const now = new Date().toISOString();
                                            const rows = [
                                                header,
                                                ...activeGoals.map((g) => [
                                                    g.title,
                                                    g.progress,
                                                    toStatus(g.progress),
                                                    now,
                                                ]),
                                            ];
                                            exportCsv("goals-export.csv", rows);
                                        }}
                                    >
                                        Export
                                    </button>
                                    <a href="#/goals" className="text-sm text-blue-600">
                                        View all
                                    </a>
                                </div>
                            </div>
                            {activeGoals.length === 0 ? (
                                <div className="text-[CanvasText] opacity-70">
                                    No goals yet.{" "}
                                    <a href="#/goals" className="text-blue-600">
                                        Add one
                                    </a>
                                    !
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {activeGoals.map((g, i) => (
                                        <li key={i} className="p-3 border rounded">
                                            <div className="flex justify-between items-center">
                                                <div className="font-semibold">{g.title}</div>
                                                <div className="text-sm opacity-70">{g.progress}%</div>
                                            </div>
                                            <div className="mt-2 bg-gray-100 dark:bg-neutral-700 rounded h-2 overflow-hidden">
                                                <div className="h-2 bg-blue-500" style={{ width: `${g.progress}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Calendar Preview with drag-and-drop */}
                    {prefs.widgets.calendarPreview && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                    Calendar Preview (Today)
                                </h2>
                                <a href="#/calendar" className="text-sm text-blue-600">
                                    Open Calendar
                                </a>
                            </div>
                            {calendarToday.length === 0 ? (
                                <div className="text-[CanvasText] opacity-70">
                                    No appointments today.{" "}
                                    <a href="#/calendar" className="text-blue-600">
                                        Add one
                                    </a>
                                    !
                                </div>
                            ) : (
                                <CalendarPreview
                                    events={calendarToday}
                                    getCountdownBadge={getCountdownBadge}
                                    onDragStart={onDragStart}
                                    onDragOver={onDragOver}
                                    onDrop={onDrop}
                                />
                            )}
                        </section>
                    )}

                    {/* Activity Feed */}
                    {prefs.widgets.activity && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                    Recent Activity
                                </h2>
                                <select
                                    className="border rounded px-2 py-1 text-sm bg-[Canvas]"
                                    value={activityFilter}
                                    onChange={(e) => setActivityFilter(e.target.value)}
                                >
                                    <option value="all">All</option>
                                    <option value="tasks">Tasks</option>
                                    <option value="goals">Goals</option>
                                    <option value="recognitions">Recognitions</option>
                                </select>
                            </div>
                            <ActivityFeed
                                activity={recentActivity}
                                filter={activityFilter}
                                onDrill={setDrillItem}
                            />
                        </section>
                    )}
                </div>

                {/* Bottom Section: Quick Add and Strokes/Analytics */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Quick Add Bar */}
                    {prefs.widgets.quickAdd && (
                        <QuickAddBar
                            quickAddOpen={quickAddOpen}
                            setQuickAddOpen={setQuickAddOpen}
                            doQuickAdd={doQuickAdd}
                        />
                    )}
                    {/* Strokes Panel */}
                    {prefs.widgets.strokes && (
                        <StrokesPanel
                            strokes={strokes}
                            setStrokes={setStrokes}
                            setMessage={setMessage}
                        />
                    )}
                </div>

                {/* Analytics Section */}
                {prefs.widgets.analytics && (
                    <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText] mb-6">
                        <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-4">
                            Analytics Overview
                        </h2>
                        <div className="flex justify-end gap-3 mb-4">
                            <select
                                className="border rounded px-2 py-1 text-sm bg-[Canvas]"
                                value={analyticsPeriod}
                                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                            >
                                <option value="Week">This Week</option>
                                <option value="Month">This Month</option>
                            </select>
                            <select
                                className="border rounded px-2 py-1 text-sm bg-[Canvas]"
                                value={analyticsCompare}
                                onChange={(e) => setAnalyticsCompare(e.target.value)}
                            >
                                <option value="None">No Comparison</option>
                                <option value="Previous">Previous {analyticsPeriod}</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Time Usage Pie Chart */}
                            <TimeUsagePie
                                data={{ productive: 30, meetings: 12, learning: 8, admin: 10, other: 5 }}
                                period={analyticsPeriod}
                            />
                            {/* Weekly Trend Bars (Example) */}
                            <WeeklyTrendBars
                                data={[
                                    { label: "Mon", value: 6 },
                                    { label: "Tue", value: 7 },
                                    { label: "Wed", value: 5 },
                                    { label: "Thu", value: 8 },
                                    { label: "Fri", value: 4 },
                                ]}
                                title={`Focus Time Trend (${analyticsPeriod})`}
                            />
                        </div>
                    </section>
                )}

                {/* Temporary Message / Toast */}
                {message && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 bg-green-500 text-white rounded shadow-lg z-50">
                        {message}
                    </div>
                )}

                {/* Drill Modal - Simple Placeholder */}
                {drillItem && (
                    <div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                        onClick={() => setDrillItem(null)}
                    >
                        <div
                            className="bg-[Canvas] p-6 rounded-lg shadow-xl w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4">Activity Details</h3>
                            <p>{drillItem.desc}</p>
                            <p className="text-sm opacity-70 mt-2">Time: {drillItem.time}</p>
                            <button
                                className="mt-4 px-3 py-1 bg-blue-500 text-white rounded"
                                onClick={() => setDrillItem(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </main>
            {loading && (
                <div className="fixed inset-0 bg-[Canvas] flex items-center justify-center z-[100]">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}
        </div>
	);

}
