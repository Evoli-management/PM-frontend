import React, { useState, useEffect } from 'react';

/**
 * Organization Summary Widget for Admin Dashboard
 * Shows key organization settings and provides quick access to admin settings
 */
const OrgSummaryWidget = ({ showQuickAccess = true }) => {
    const [orgSettings, setOrgSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load organization settings from localStorage
        try {
            const saved = localStorage.getItem('pm:org:settings');
            if (saved) {
                setOrgSettings(JSON.parse(saved));
            } else {
                // Default organization settings
                setOrgSettings({
                    organizationName: "Practical Manager Corp",
                    organizationCode: "PMC001",
                    industry: "technology",
                    timezone: "America/New_York",
                    currency: "USD",
                    security: {
                        enforceSecurePasswords: true,
                        enable2FAForAdmins: true,
                        enableLoginAttemptLimits: true
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load organization settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                    <div className="h-3 w-28 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!orgSettings) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">⚙️</div>
                    <p className="text-sm">Organization settings not configured</p>
                    {/* Admin Settings quick access removed */}
                </div>
            </div>
        );
    }

    const getIndustryIcon = (industry) => {
        const icons = {
            technology: "💻",
            healthcare: "🏥",
            finance: "💰",
            education: "🎓",
            manufacturing: "🏭",
            retail: "🏪",
            other: "🏢"
        };
        return icons[industry] || "🏢";
    };

    const getSecurityScore = () => {
        let score = 0;
        const checks = [
            orgSettings.security?.enforceSecurePasswords,
            orgSettings.security?.enable2FAForAdmins,
            orgSettings.security?.enableLoginAttemptLimits,
            !orgSettings.security?.allowPublicRegistration
        ];
        
        checks.forEach(check => {
            if (check) score += 25;
        });
        
        return score;
    };

    const securityScore = getSecurityScore();
    const getSecurityColor = (score) => {
        if (score >= 75) return "text-green-600";
        if (score >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Organization Overview</h3>
                <span className="text-2xl">{getIndustryIcon(orgSettings.industry)}</span>
            </div>

            {/* Organization Info */}
            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-800">{orgSettings.organizationName}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Code:</span>
                    <span className="text-sm font-medium text-gray-800">{orgSettings.organizationCode}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Industry:</span>
                    <span className="text-sm font-medium text-gray-800 capitalize">{orgSettings.industry}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Timezone:</span>
                    <span className="text-sm font-medium text-gray-800">{orgSettings.timezone?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Currency:</span>
                    <span className="text-sm font-medium text-gray-800">{orgSettings.currency}</span>
                </div>
            </div>

            {/* Security Status */}
            <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Security Score</span>
                    <span className={`text-lg font-bold ${getSecurityColor(securityScore)}`}>
                        {securityScore}%
                    </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                            securityScore >= 75 ? 'bg-green-500' : 
                            securityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${securityScore}%` }}
                    ></div>
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${orgSettings.security?.enforceSecurePasswords ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{orgSettings.security?.enforceSecurePasswords ? '✅' : '❌'}</span>
                        <span>Secure Passwords</span>
                    </div>
                    <div className={`flex items-center gap-1 ${orgSettings.security?.enable2FAForAdmins ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{orgSettings.security?.enable2FAForAdmins ? '✅' : '❌'}</span>
                        <span>Admin 2FA</span>
                    </div>
                    <div className={`flex items-center gap-1 ${orgSettings.security?.enableLoginAttemptLimits ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{orgSettings.security?.enableLoginAttemptLimits ? '✅' : '❌'}</span>
                        <span>Login Limits</span>
                    </div>
                    <div className={`flex items-center gap-1 ${!orgSettings.security?.allowPublicRegistration ? 'text-green-600' : 'text-yellow-600'}`}>
                        <span>{!orgSettings.security?.allowPublicRegistration ? '✅' : '⚠️'}</span>
                        <span>Registration Control</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            {/* Admin Settings quick actions removed */}

            {/* Status Footer */}
            <div className="mt-4 pt-3 border-t text-center">
                <p className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                </p>
            </div>
        </div>
    );
};

export default OrgSummaryWidget;
