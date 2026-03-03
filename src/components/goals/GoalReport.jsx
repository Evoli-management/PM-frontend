// src/components/goals/GoalReport.jsx
import React, { useState, useEffect, useCallback } from "react";
import * as goalService from "../../services/goalService";
import { FaFilePdf, FaFileExcel, FaFilter, FaCheckCircle, FaClock } from "react-icons/fa";

const GoalReport = () => {
    const [dateFromType, setDateFromType] = useState("deadline");
    const [dateToType, setDateToType] = useState("deadline");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [showActive, setShowActive] = useState(true);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchGoals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await goalService.getFilteredGoals({
                status: "all",
                includeMilestones: true,
            });
            setGoals(data || []);
        } catch (e) {
            setError("Failed to load goals.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    // Client-side date filter logic
    const filteredGoals = goals.filter((g) => {
        // Status filter
        const isCompleted = g.status === "completed" || !!g.completedAt;
        if (!showCompleted && isCompleted) return false;
        if (!showActive && !isCompleted) return false;

        // Date filter
        const getDate = (goal, type) => {
            switch (type) {
                case "date_start": return goal.startDate || goal.start_date;
                case "date_completed": return goal.completedAt || goal.completionDate;
                default: return goal.dueDate || goal.deadline;
            }
        };

        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;
        const fromVal = getDate(g, dateFromType);
        const toVal = getDate(g, dateToType);

        if (fromDate && fromVal && new Date(fromVal) < fromDate) return false;
        if (toDate && toVal && new Date(toVal) > toDate) return false;

        return true;
    });

    // Export as CSV (Excel-compatible)
    const exportCSV = () => {
        const headers = ["Title", "Status", "Start Date", "Deadline", "Completed At", "Progress %", "Description"];
        const rows = filteredGoals.map((g) => [
            `"${(g.title || "").replace(/"/g, '""')}"`,
            g.status || "",
            g.startDate || g.start_date || "",
            g.dueDate || g.deadline || "",
            g.completedAt || g.completionDate || "",
            g.progressPercent ?? "",
            `"${(g.description || "").replace(/"/g, '""')}"`,
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `goal-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export as PDF via browser print
    const exportPDF = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Goal Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1e3a5f; margin-bottom: 4px; }
                p.sub { color: #666; font-size: 13px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th { background: #2563eb; color: white; text-align: left; padding: 8px 10px; }
                td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                tr:nth-child(even) td { background: #f8fafc; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
                .badge.completed { background: #d1fae5; color: #065f46; }
                .badge.active { background: #dbeafe; color: #1e40af; }
                .badge.other { background: #f1f5f9; color: #475569; }
                .progress { background: #e2e8f0; border-radius: 4px; height: 8px; width: 80px; display: inline-block; vertical-align: middle; }
                .progress-fill { height: 8px; border-radius: 4px; background: #2563eb; }
            </style></head><body>
            <h1>Goal Report</h1>
            <p class="sub">Generated: ${new Date().toLocaleDateString()} &nbsp;|&nbsp; ${filteredGoals.length} goals</p>
            <table>
                <thead><tr>
                    <th>Title</th><th>Status</th><th>Progress</th>
                    <th>Start Date</th><th>Deadline</th><th>Completed</th>
                </tr></thead>
                <tbody>
                ${filteredGoals.map((g) => {
            const statusClass = g.status === "completed" ? "completed" : g.status === "active" ? "active" : "other";
            const pct = g.progressPercent ?? 0;
            return `<tr>
                        <td><strong>${g.title || ""}</strong>${g.description ? `<br><span style="color:#64748b;font-size:11px">${g.description.slice(0, 80)}${g.description.length > 80 ? "…" : ""}</span>` : ""}</td>
                        <td><span class="badge ${statusClass}">${g.status || "-"}</span></td>
                        <td>
                            <span style="font-size:12px;margin-right:4px">${pct}%</span>
                            <span class="progress"><span class="progress-fill" style="width:${pct}%"></span></span>
                        </td>
                        <td>${g.startDate ? new Date(g.startDate).toLocaleDateString() : "-"}</td>
                        <td>${g.dueDate ? new Date(g.dueDate).toLocaleDateString() : "-"}</td>
                        <td>${g.completedAt ? new Date(g.completedAt).toLocaleDateString() : "-"}</td>
                    </tr>`;
        }).join("")}
                </tbody>
            </table>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 400);
    };

    const progressColor = (pct) => {
        if (pct >= 90) return "#22c55e";
        if (pct >= 70) return "#3b82f6";
        if (pct >= 40) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <div style={{ padding: "20px 24px", minHeight: 400 }}>
            {/* Filter Bar */}
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "flex-end",
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "16px 20px",
                    marginBottom: 20,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
            >
                <FaFilter style={{ color: "#64748b", marginBottom: 6, flexShrink: 0 }} />

                {/* Date From */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>From type</label>
                    <select
                        value={dateFromType}
                        onChange={(e) => setDateFromType(e.target.value)}
                        style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}
                    >
                        <option value="deadline">Deadline</option>
                        <option value="date_start">Start date</option>
                        <option value="date_completed">Date completed</option>
                    </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}
                    />
                </div>

                {/* Date To */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>To type</label>
                    <select
                        value={dateToType}
                        onChange={(e) => setDateToType(e.target.value)}
                        style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}
                    >
                        <option value="deadline">Deadline</option>
                        <option value="date_start">Start date</option>
                        <option value="date_completed">Date completed</option>
                    </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}
                    />
                </div>

                {/* Status checkboxes */}
                <div style={{ display: "flex", gap: 16, alignItems: "center", paddingBottom: 2 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
                        <FaCheckCircle style={{ color: "#22c55e" }} /> Completed
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={showActive} onChange={(e) => setShowActive(e.target.checked)} />
                        <FaClock style={{ color: "#3b82f6" }} /> Active
                    </label>
                </div>

                {/* Export buttons */}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button
                        onClick={exportPDF}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 14px", borderRadius: 8, border: "none",
                            background: "#ef4444", color: "white", fontWeight: 600,
                            fontSize: 13, cursor: "pointer",
                        }}
                    >
                        <FaFilePdf /> PDF
                    </button>
                    <button
                        onClick={exportCSV}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 14px", borderRadius: 8, border: "none",
                            background: "#22c55e", color: "white", fontWeight: 600,
                            fontSize: 13, cursor: "pointer",
                        }}
                    >
                        <FaFileExcel /> Excel
                    </button>
                </div>
            </div>

            {/* Result count */}
            <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
                <strong style={{ color: "#1e293b" }}>{filteredGoals.length}</strong> goal{filteredGoals.length !== 1 ? "s" : ""} matched
                {(dateFrom || dateTo) ? " for selected date range" : ""}
            </div>

            {/* Goal Table */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading goals…</div>
            ) : error ? (
                <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>{error}</div>
            ) : filteredGoals.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
                    <FaFilter style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }} />
                    <div>No goals match the selected filters.</div>
                </div>
            ) : (
                <div
                    style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                {["Title", "Status", "Progress", "Start Date", "Deadline", "Completed"].map((h) => (
                                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGoals.map((g, i) => {
                                const pct = g.progressPercent ?? 0;
                                const isCompleted = g.status === "completed";
                                return (
                                    <tr key={g.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafbfc" }}>
                                        <td style={{ padding: "10px 14px" }}>
                                            <div style={{ fontWeight: 600, color: "#1e293b" }}>{g.title}</div>
                                            {g.description && (
                                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                                    {g.description.slice(0, 80)}{g.description.length > 80 ? "…" : ""}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "2px 10px",
                                                borderRadius: 20,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                background: isCompleted ? "#d1fae5" : g.status === "active" ? "#dbeafe" : "#f1f5f9",
                                                color: isCompleted ? "#065f46" : g.status === "active" ? "#1e40af" : "#475569",
                                            }}>
                                                {g.status || "—"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 70, background: "#e2e8f0", borderRadius: 4, height: 8, flexShrink: 0 }}>
                                                    <div style={{ width: `${pct}%`, height: 8, borderRadius: 4, background: progressColor(pct) }} />
                                                </div>
                                                <span style={{ fontSize: 12, color: "#64748b", minWidth: 30 }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#64748b" }}>
                                            {g.startDate ? new Date(g.startDate).toLocaleDateString() : "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#64748b" }}>
                                            {g.dueDate ? new Date(g.dueDate).toLocaleDateString() : "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#64748b" }}>
                                            {g.completedAt ? new Date(g.completedAt).toLocaleDateString() : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default GoalReport;
