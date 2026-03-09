import React, { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * eNPS (Employee Net Promoter Score) Widget
 * Privacy-focused implementation that ensures anonymity
 */
const EnpsWidget = ({
    onSubmitScore,
    showResults = false,
    aggregatedData = null,
    privacySettings = {
        allowAnonymousScoring: true,
        showIndividualScores: false,
        enableTeamReports: true,
        enableOrgReports: true,
    },
}) => {
    const { t } = useTranslation();
    const [selectedScore, setSelectedScore] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState("");

    const handleScoreSubmit = () => {
        if (selectedScore === null) return;

        // Create anonymous submission - no user identification
        const anonymousSubmission = {
            score: selectedScore,
            feedback: feedback.trim(),
            timestamp: new Date().toISOString(),
            // Explicitly NO user identification
            anonymous: true,
            sessionId: Math.random().toString(36).substring(7), // Random session for deduplication only
        };

        if (onSubmitScore) {
            onSubmitScore(anonymousSubmission);
        }

        setSubmitted(true);

        // Clear form for privacy
        setTimeout(() => {
            setSelectedScore(null);
            setFeedback("");
        }, 2000);
    };

    const getScoreCategory = (score) => {
        if (score >= 9) return { label: t("enpsWidget.categoryPromoter"), color: "text-green-600", bg: "bg-green-50" };
        if (score >= 7) return { label: t("enpsWidget.categoryPassive"), color: "text-yellow-600", bg: "bg-yellow-50" };
        return { label: t("enpsWidget.categoryDetractor"), color: "text-red-600", bg: "bg-red-50" };
    };

    if (submitted) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-green-600 mb-2">{t("enpsWidget.thankyouTitle")}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {t("enpsWidget.thankyouBody")}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-xs text-blue-700">
                            🔒 <strong>{t("enpsWidget.privacyLabel")}</strong> {t("enpsWidget.privacyText")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{t("enpsWidget.title")}</h3>
                    <p className="text-sm text-gray-600">
                        {t("enpsWidget.subtitle")}
                    </p>
                </div>
                <div className="text-2xl">📊</div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-6">
                <div className="flex items-start gap-2">
                    <span className="text-green-600">🔒</span>
                    <div className="text-xs text-green-700">
                        <strong>{t("enpsWidget.anonymousLabel")}</strong> {t("enpsWidget.anonymousText")}
                    </div>
                </div>
            </div>

            {!showResults ? (
                /* Score Selection */
                <div>
                    {/* Score Scale */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>{t("enpsWidget.notLikely")}</span>
                            <span>{t("enpsWidget.extremelyLikely")}</span>
                        </div>
                        <div className="grid grid-cols-11 gap-1">
                            {[...Array(11)].map((_, i) => {
                                const score = i;
                                const category = getScoreCategory(score);
                                const isSelected = selectedScore === score;

                                return (
                                    <button
                                        key={score}
                                        onClick={() => setSelectedScore(score)}
                                        className={`
                                            h-10 rounded border text-sm font-medium transition-all
                                            ${
                                                isSelected
                                                    ? `${category.bg} ${category.color} border-current shadow-sm scale-110`
                                                    : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                                            }
                                        `}
                                    >
                                        {score}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Indicator */}
                    {selectedScore !== null && (
                        <div className="mb-4">
                            <div
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getScoreCategory(selectedScore).bg} ${getScoreCategory(selectedScore).color}`}
                            >
                                <span>{getScoreCategory(selectedScore).label}</span>
                            </div>
                        </div>
                    )}

                    {/* Optional Feedback */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("enpsWidget.feedbackLabel")}
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder={t("enpsWidget.feedbackPlaceholder")}
                            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={500}
                        />
                        <div className="text-xs text-gray-500 mt-1">{t("enpsWidget.characters", { n: feedback.length })}</div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleScoreSubmit}
                        disabled={selectedScore === null}
                        className={`
                            w-full py-3 px-4 rounded-lg font-medium transition-all
                            ${
                                selectedScore !== null
                                    ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }
                        `}
                    >
                        {t("enpsWidget.submitBtn")}
                    </button>
                </div>
            ) : (
                /* Aggregated Results View (Admin) */
                <div>
                    {aggregatedData ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {aggregatedData.promoters || 0}
                                    </div>
                                    <div className="text-sm text-green-700">{t("enpsWidget.promoters")}</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {aggregatedData.passives || 0}
                                    </div>
                                    <div className="text-sm text-yellow-700">{t("enpsWidget.passives")}</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">
                                        {aggregatedData.detractors || 0}
                                    </div>
                                    <div className="text-sm text-red-700">{t("enpsWidget.detractors")}</div>
                                </div>
                            </div>

                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-600">{aggregatedData.enpsScore || 0}</div>
                                <div className="text-sm text-blue-700">{t("enpsWidget.overallScore")}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {t("enpsWidget.basedOn", { n: aggregatedData.totalResponses || 0 })}
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <div className="text-xs text-yellow-800">
                                    <strong>{t("enpsWidget.privacyNote")}</strong> {t("enpsWidget.privacyNoteText")}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <div className="text-4xl mb-4">📊</div>
                            <p>{t("enpsWidget.noData")}</p>
                            <p className="text-sm mt-2">{t("enpsWidget.minResponses")}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EnpsWidget;
