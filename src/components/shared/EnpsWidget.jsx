import React, { useState } from 'react';

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
        enableOrgReports: true
    }
}) => {
    const [selectedScore, setSelectedScore] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState('');

    const handleScoreSubmit = () => {
        if (selectedScore === null) return;
        
        // Create anonymous submission - no user identification
        const anonymousSubmission = {
            score: selectedScore,
            feedback: feedback.trim(),
            timestamp: new Date().toISOString(),
            // Explicitly NO user identification
            anonymous: true,
            sessionId: Math.random().toString(36).substring(7) // Random session for deduplication only
        };

        if (onSubmitScore) {
            onSubmitScore(anonymousSubmission);
        }
        
        setSubmitted(true);
        
        // Clear form for privacy
        setTimeout(() => {
            setSelectedScore(null);
            setFeedback('');
        }, 2000);
    };

    const getScoreCategory = (score) => {
        if (score >= 9) return { label: 'Promoter', color: 'text-green-600', bg: 'bg-green-50' };
        if (score >= 7) return { label: 'Passive', color: 'text-yellow-600', bg: 'bg-yellow-50' };
        return { label: 'Detractor', color: 'text-red-600', bg: 'bg-red-50' };
    };

    if (submitted) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-green-600 mb-2">Thank you!</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Your anonymous feedback has been recorded and will help improve our workplace.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-xs text-blue-700">
                            🔒 <strong>Privacy Protected:</strong> Your response is completely anonymous and cannot be traced back to you.
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
                    <h3 className="text-lg font-semibold text-gray-800">Employee Net Promoter Score</h3>
                    <p className="text-sm text-gray-600">How likely are you to recommend this company as a place to work?</p>
                </div>
                <div className="text-2xl">📊</div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-6">
                <div className="flex items-start gap-2">
                    <span className="text-green-600">🔒</span>
                    <div className="text-xs text-green-700">
                        <strong>100% Anonymous:</strong> Your response cannot be traced back to you. We only collect the score and optional feedback.
                    </div>
                </div>
            </div>

            {!showResults ? (
                /* Score Selection */
                <div>
                    {/* Score Scale */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Not likely</span>
                            <span>Extremely likely</span>
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
                                            ${isSelected 
                                                ? `${category.bg} ${category.color} border-current shadow-sm scale-110` 
                                                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
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
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getScoreCategory(selectedScore).bg} ${getScoreCategory(selectedScore).color}`}>
                                <span>{getScoreCategory(selectedScore).label}</span>
                            </div>
                        </div>
                    )}

                    {/* Optional Feedback */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional feedback (optional)
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="What could we improve? (This will remain anonymous)"
                            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={500}
                        />
                        <div className="text-xs text-gray-500 mt-1">{feedback.length}/500 characters</div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleScoreSubmit}
                        disabled={selectedScore === null}
                        className={`
                            w-full py-3 px-4 rounded-lg font-medium transition-all
                            ${selectedScore !== null
                                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        Submit Anonymous Response
                    </button>
                </div>
            ) : (
                /* Aggregated Results View (Admin) */
                <div>
                    {aggregatedData ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{aggregatedData.promoters || 0}</div>
                                    <div className="text-sm text-green-700">Promoters (9-10)</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">{aggregatedData.passives || 0}</div>
                                    <div className="text-sm text-yellow-700">Passives (7-8)</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{aggregatedData.detractors || 0}</div>
                                    <div className="text-sm text-red-700">Detractors (0-6)</div>
                                </div>
                            </div>
                            
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-600">{aggregatedData.enpsScore || 0}</div>
                                <div className="text-sm text-blue-700">Overall eNPS Score</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Based on {aggregatedData.totalResponses || 0} anonymous responses
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <div className="text-xs text-yellow-800">
                                    <strong>Privacy Note:</strong> All data shown is aggregated and anonymous. Individual responses cannot be identified.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <div className="text-4xl mb-4">📊</div>
                            <p>No eNPS data available yet.</p>
                            <p className="text-sm mt-2">Minimum 5 responses required for reporting.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EnpsWidget;
