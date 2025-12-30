import React, { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar";
import { FaBars, FaSmile, FaMeh, FaFrown, FaCheckCircle } from "react-icons/fa";
import { getCurrentEnpsScore, getEnpsTrend, submitEnpsResponse, getReminderStatus, getMyEnpsResponse } from "../../services/enpsService";

export default function ENPS() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [current, setCurrent] = useState(null);
    const [trend, setTrend] = useState([]);
    const [myResponse, setMyResponse] = useState(null);
    const [reminderStatus, setReminderStatus] = useState(null);
    const [selectedScore, setSelectedScore] = useState(null);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [curScore, trendData, myResp, reminderStat] = await Promise.all([
                    getCurrentEnpsScore(),
                    getEnpsTrend(8),
                    getMyEnpsResponse().catch(() => null),
                    getReminderStatus().catch(() => null),
                ]);
                setCurrent(curScore);
                setTrend(trendData.trend || []);
                setMyResponse(myResp);
                setReminderStatus(reminderStat);
                if (myResp?.score) {
                    setSelectedScore(myResp.score);
                    setComment(myResp.comment || "");
                    setSubmitted(true);
                }
            } catch (e) {
                console.error('Failed to load ENPS data', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSubmit = async () => {
        if (selectedScore === null) {
            alert("Please select a score");
            return;
        }
        setSubmitting(true);
        try {
            await submitEnpsResponse(selectedScore, comment);
            setSubmitted(true);
            // Refresh data
            const [curScore, myResp] = await Promise.all([
                getCurrentEnpsScore(),
                getMyEnpsResponse(),
            ]);
            setCurrent(curScore);
            setMyResponse(myResp);
            setTimeout(() => setSubmitted(false), 3000);
        } catch (e) {
            console.error('Failed to submit response', e);
            alert('Failed to submit your response');
        } finally {
            setSubmitting(false);
        }
    };

    const ScoreOption = ({ score, icon: Icon, label, color }) => (
        <button
            onClick={() => setSelectedScore(score)}
            className={`flex flex-col items-center p-4 rounded-lg border-2 transition ${
                selectedScore === score
                    ? `border-${color}-600 bg-${color}-50`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
        >
            <Icon className={`h-8 w-8 ${selectedScore === score ? `text-${color}-600` : 'text-gray-400'} mb-2`} />
            <div className="font-medium">{score}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </button>
    );

    return (
        <div className="flex min-h-screen bg-[Canvas] text-[CanvasText]">
            <Sidebar 
                user={{ name: "Hussein" }} 
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {mobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            <main className="flex-1 p-4 sm:p-6">
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
                    onClick={() => setMobileSidebarOpen(true)}
                >
                    <FaBars className="h-5 w-5 text-gray-600" />
                </button>
                
                <div className="mb-4">
                    <a href="#/dashboard" className="text-sm text-blue-600 hover:underline">
                        ← Back to Dashboard
                    </a>
                </div>
                
                <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-2">Employee Net Promoter Score (eNPS)</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Help us understand how you feel about working here</p>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-500">Loading survey...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Submission Form */}
                        <section className="lg:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center mb-6">
                                {submitted && (
                                    <div className="flex items-center text-green-600 text-sm">
                                        <FaCheckCircle className="mr-2" /> Response submitted!
                                    </div>
                                )}
                                <div className="text-sm text-gray-500">
                                    {myResponse ? `Last updated: ${new Date(myResponse.updatedAt).toLocaleDateString()}` : 'You haven\'t responded yet'}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block font-semibold mb-4">How likely are you to recommend this company as a great place to work?</label>
                                <p className="text-sm text-gray-600 mb-4">Please rate on a scale of 0-10</p>
                                
                                <div className="grid grid-cols-5 gap-2 mb-6">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                        <button
                                            key={score}
                                            onClick={() => setSelectedScore(score)}
                                            className={`p-2 rounded border-2 font-medium transition ${
                                                selectedScore === score
                                                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    <div className="text-center text-xs text-gray-500">
                                        <p className="font-semibold text-red-600">Unlikely</p>
                                        <p>0-6</p>
                                    </div>
                                    <div className="text-center text-xs text-gray-500">
                                        <p className="font-semibold text-yellow-600">Neutral</p>
                                        <p>7-8</p>
                                    </div>
                                    <div className="text-center text-xs text-gray-500">
                                        <p className="font-semibold text-green-600">Likely</p>
                                        <p>9-10</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block font-semibold mb-2">Additional comments (optional)</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tell us what we're doing well or where we can improve..."
                                    className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    rows={4}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedScore === null}
                                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                            >
                                {submitting ? 'Submitting...' : 'Submit Response'}
                            </button>
                        </section>

                        {/* Stats Sidebar */}
                        <aside className="space-y-6">
                            {/* Current Score */}
                            <section className="bg-white border rounded-2xl p-6 shadow-sm">
                                <h2 className="font-semibold mb-4">Organization Score</h2>
                                {current ? (
                                    <div>
                                        <div className="text-4xl font-bold text-blue-600 mb-3">{current.score}</div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center">
                                                <FaSmile className="text-green-600 mr-2" />
                                                <span>Promoters: {current.promoters}%</span>
                                            </div>
                                            <div className="flex items-center">
                                                <FaMeh className="text-yellow-600 mr-2" />
                                                <span>Passives: {current.passives}%</span>
                                            </div>
                                            <div className="flex items-center">
                                                <FaFrown className="text-red-600 mr-2" />
                                                <span>Detractors: {current.detractors}%</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                                            {current.totalResponses} responses • Period: {current.period}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No data yet</p>
                                )}
                            </section>

                            {/* Reminder Status */}
                            {reminderStatus && (
                                <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                                    <h3 className="font-semibold text-blue-900 mb-2 text-sm">Reminders</h3>
                                    <p className="text-sm text-blue-800">
                                        {reminderStatus.hasReminder
                                            ? `Last reminder: ${new Date(reminderStatus.lastSentAt).toLocaleDateString()}`
                                            : 'No reminders sent yet'
                                        }
                                    </p>
                                </section>
                            )}

                            {/* Trend */}
                            {trend.length > 0 && (
                                <section className="bg-white border rounded-2xl p-6 shadow-sm">
                                    <h2 className="font-semibold mb-4 text-sm">Recent Trend</h2>
                                    <div className="flex items-end gap-2 h-20">
                                        {trend.slice(-8).map((p, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col items-center group">
                                                <div
                                                    className="w-full bg-blue-400 rounded-t"
                                                    style={{ height: `${Math.max(4, (p.score + 100) / 2)}px` }}
                                                    title={`${p.period}: ${p.score}`}
                                                />
                                                <div className="text-[10px] text-gray-500 mt-1 group-hover:text-gray-700">{p.period.split('-')[1]}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
}
