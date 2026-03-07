import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaFilter, FaTrophy, FaStar, FaAward } from "react-icons/fa";
import recognitionsService from "../services/recognitionsService";

export default function ViewStrokes() {
    const { t } = useTranslation();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('received'); // 'received' or 'given'
    const [strokes, setStrokes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(null);
    const [showLedger, setShowLedger] = useState(false);
    const [filters, setFilters] = useState({
        type: '', // '', 'employeeship', 'performance', 'achievement'
    });

    useEffect(() => {
        loadStrokes();
        loadScore();
    }, [activeTab, filters]);

    const loadScore = async () => {
        try {
            const scoreData = await recognitionsService.getMyScore();
            setScore(scoreData);
        } catch (err) {
            console.error("Failed to load score:", err);
        }
    };

    const loadStrokes = async () => {
        try {
            setLoading(true);
            const currentUserId = localStorage.getItem('userId'); // Assuming userId is stored
            
            const filterParams = {
                ...filters,
                [activeTab === 'received' ? 'recipientId' : 'senderId']: currentUserId,
            };

            const data = await recognitionsService.getRecognitions(filterParams);
            setStrokes(data);
        } catch (err) {
            console.error("Failed to load strokes:", err);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'employeeship':
                return <FaStar className="text-blue-500" />;
            case 'performance':
                return <FaTrophy className="text-yellow-500" />;
            case 'achievement':
                return <FaAward className="text-green-500" />;
            default:
                return <FaStar className="text-gray-500" />;
        }
    };

    const getTypeLabel = (type) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar 
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />
            {mobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
            
            <main className="flex-1 min-w-0 w-full min-h-screen transition-all md:ml-[1mm] overflow-y-auto px-4 md:px-8 py-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            <FaBars />
                        </button>
                        <h1 className="text-3xl font-semibold text-gray-800">{t("viewStrokes.title")}</h1>
                    </div>

                    {/* Stroke Account Summary */}
                    {score && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                                <p className="text-gray-600 text-sm mb-2">{t("viewStrokes.strokesReceived")}</p>
                                <p className="text-3xl font-bold text-gray-800">{score.totalReceivedPoints || 0}</p>
                                <p className="text-xs text-gray-500 mt-2">{t("viewStrokes.strokesReceivedDesc")}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                                <p className="text-gray-600 text-sm mb-2">{t("viewStrokes.strokesGiven")}</p>
                                <p className="text-3xl font-bold text-gray-800">{score.totalSentPoints || 0}</p>
                                <p className="text-xs text-gray-500 mt-2">{t("viewStrokes.strokesGivenDesc")}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                                <p className="text-gray-600 text-sm mb-2">{t("viewStrokes.totalRecognitions")}</p>
                                <p className="text-3xl font-bold text-gray-800">{(score.totalReceivedCount || 0) + (score.totalSentCount || 0)}</p>
                                <p className="text-xs text-gray-500 mt-2">{t("viewStrokes.totalRecognitionsDesc")}</p>
                            </div>
                        </div>
                    )}

                    {/* Ledger Toggle */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowLedger(!showLedger)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                showLedger
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-blue-500 border border-blue-500 hover:bg-blue-50'
                            }`}
                        >
                            {showLedger ? t("viewStrokes.hideLedger") : t("viewStrokes.viewLedger")}
                        </button>
                    </div>

                    {/* Ledger View */}
                    {showLedger && score && (
                        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("viewStrokes.dateHeader")}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("viewStrokes.descriptionHeader")}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("viewStrokes.typeHeader")}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("viewStrokes.amountHeader")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr className="bg-green-50">
                                        <td className="px-6 py-4 text-sm text-gray-600">—</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{t("viewStrokes.totalStrokesReceived")}</td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600">{t("viewStrokes.credit")}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-green-600">+{score.totalReceivedPoints || 0}</td>
                                    </tr>
                                    <tr className="bg-blue-50">
                                        <td className="px-6 py-4 text-sm text-gray-600">—</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{t("viewStrokes.totalStrokesGiven")}</td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600">{t("viewStrokes.debit")}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">-{score.totalSentPoints || 0}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="bg-white rounded-lg shadow-sm mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('received')}
                                    className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                                        activeTab === 'received'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {t("viewStrokes.tabReceived")}
                                </button>
                                <button
                                    onClick={() => setActiveTab('given')}
                                    className={`py-4 px-6 text-sm font-medium border-b-2 transition ${
                                        activeTab === 'given'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {t("viewStrokes.tabGiven")}
                                </button>
                            </nav>
                        </div>

                        {/* Filters */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-4">
                                <FaFilter className="text-gray-500" />
                                <select
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">{t("viewStrokes.filterAllTypes")}</option>
                                    <option value="employeeship">{t("viewStrokes.filterEmployeeship")}</option>
                                    <option value="performance">{t("viewStrokes.filterPerformance")}</option>
                                    <option value="achievement">{t("viewStrokes.filterAchievement")}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Strokes List */}
                    <div className="bg-white rounded-lg shadow-sm">
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">
                                {t("viewStrokes.loading")}
                            </div>
                        ) : strokes.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                {t("viewStrokes.noStrokes")}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {strokes.map((stroke) => (
                                    <div key={stroke.id} className="p-6 hover:bg-gray-50 transition">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getTypeIcon(stroke.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                            {getTypeLabel(stroke.type)}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {formatDate(stroke.createdAt)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {t("viewStrokes.points", { n: stroke.recipientPoints })}
                                                    </div>
                                                </div>

                                                {activeTab === 'received' && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        {t("viewStrokes.fromAnonymous")}
                                                    </div>
                                                )}

                                                {activeTab === 'given' && stroke.recipient && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        To: <span className="font-medium text-gray-800">
                                                            {stroke.recipient.firstName} {stroke.recipient.lastName}
                                                        </span>
                                                    </div>
                                                )}

                                                {stroke.cultureValue && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Value: <span className="font-medium">{stroke.cultureValue.heading}</span>
                                                    </div>
                                                )}

                                                {stroke.keyArea && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Key Area: <span className="font-medium">{stroke.keyArea.name}</span>
                                                    </div>
                                                )}

                                                {stroke.goal && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Goal: <span className="font-medium">{stroke.goal.title}</span>
                                                    </div>
                                                )}

                                                {stroke.milestone && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Milestone: <span className="font-medium">{stroke.milestone.title}</span>
                                                    </div>
                                                )}

                                                {stroke.selectedBehaviors && stroke.selectedBehaviors.length > 0 && (
                                                    <div className="mt-2">
                                                        <div className="flex flex-wrap gap-2">
                                                            {stroke.selectedBehaviors.map((behavior, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                                                >
                                                                    {behavior}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {stroke.personalNote && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                                                        <p className="text-sm text-gray-700 italic">
                                                            "{stroke.personalNote}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
