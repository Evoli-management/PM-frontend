import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Section, PasswordField, LoadingButton } from './UIComponents';
import securityService from '../../services/securityService';

export const SecuritySettings = ({ showToast }) => {
    const [changeMode, setChangeMode] = useState(null); // 'password' | 'email' | null
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [passwordDraft, setPasswordDraft] = useState({
        current: "",
        next: "",
        confirm: ""
    });
    
    const [emailDraft, setEmailDraft] = useState({
        current: "",
        next: ""
    });

    // Login history - will be loaded from API
    const [loginHistory, setLoginHistory] = useState([]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Load initial data
    useEffect(() => {
        loadSecurityData();
    }, []);

    const loadSecurityData = async () => {
        try {
            setIsLoading(true);
            
            // Load login history
            const historyData = await securityService.getLoginHistory(20);
            setLoginHistory(historyData.history || []);
            
            // Load active sessions for current session detection
            const sessionsData = await securityService.getActiveSessions();
            // Mark current session in login history
            if (sessionsData.sessions && sessionsData.sessions.length > 0) {
                const currentSession = sessionsData.sessions.find(s => s.isCurrent);
                if (currentSession && historyData.history) {
                    const updatedHistory = historyData.history.map(entry => ({
                        ...entry,
                        device: entry.browser && entry.os ? `${entry.device} - ${entry.browser}` : entry.device || 'Unknown Device',
                        current: entry.ipAddress === currentSession.ipAddress && entry.browser === currentSession.deviceInfo?.browser
                    }));
                    setLoginHistory(updatedHistory);
                }
            }
        } catch (error) {
            console.error('Failed to load security data:', error);
            showToast('Failed to load security settings', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = (key) => {
        setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handlePasswordChange = (field) => (e) => {
        setPasswordDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    };

    const handleEmailChange = (field) => (e) => {
        setEmailDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    };


    const validatePasswordChange = () => {
        const newErrors = {};
        
        if (!passwordDraft.current) {
            newErrors.current = "Current password is required";
        }
        
        if (!passwordDraft.next) {
            newErrors.next = "New password is required";
        } else if (passwordDraft.next.length < 8) {
            newErrors.next = "Password must be at least 8 characters";
        }
        
        if (passwordDraft.next !== passwordDraft.confirm) {
            newErrors.confirm = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateEmailChange = () => {
        const newErrors = {};
        
        if (!emailDraft.current) {
            newErrors.currentPassword = "Current password is required";
        }
        
        if (!emailDraft.next) {
            newErrors.newEmail = "New email is required";
        } else if (!/\S+@\S+\.\S+/.test(emailDraft.next)) {
            newErrors.newEmail = "Invalid email format";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const savePasswordChange = async () => {
        if (!validatePasswordChange()) return;
        
        setIsLoading(true);
        try {
            await securityService.requestPasswordChange({
                currentPassword: passwordDraft.current,
                newPassword: passwordDraft.next
            });
            
            setPasswordDraft({ current: "", next: "", confirm: "" });
            setChangeMode(null);
            showToast('Password change verification email sent! Please check your email to confirm the change.');
        } catch (error) {
            console.error('Failed to request password change:', error);
            const errorMessage = error.response?.data?.message || 'Failed to request password change';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const saveEmailChange = async () => {
        if (!validateEmailChange()) return;
        
        setIsLoading(true);
        try {
            await securityService.requestEmailChange(
                emailDraft.next,
                emailDraft.current
            );
            
            setChangeMode(null);
            setEmailDraft({ current: "", next: "" });
            setErrors({});
            showToast('Email change verification sent to your new email address! Please check and confirm.');
        } catch (error) {
            console.error('Failed to request email change:', error);
            const errorMessage = error.response?.data?.message || 'Failed to request email change';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const revokeSession = async (sessionId) => {
        try {
            await securityService.revokeSession(sessionId);
            setLoginHistory(prev => prev.filter(session => session.id !== sessionId || session.current));
            showToast('Session revoked successfully');
        } catch (error) {
            console.error('Failed to revoke session:', error);
            showToast('Failed to revoke session', 'error');
        }
    };

    const handleLogoutAllSessions = async () => {
        setIsLoading(true);
        try {
            await securityService.logoutAllSessions();
            // Reload login history to reflect changes
            await loadSecurityData();
            showToast('All sessions logged out successfully');
        } catch (error) {
            console.error('Failed to logout all sessions:', error);
            showToast('Failed to logout all sessions', 'error');
        } finally {
            setIsLoading(false);
            setShowLogoutModal(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Password Change */}
            <Section 
                title="Password & Authentication" 
                description="Manage your password and authentication settings"
            >
                <div className="space-y-4">
                    {changeMode === 'password' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw.old ? "text" : "password"}
                                        value={passwordDraft.current}
                                        onChange={handlePasswordChange('current')}
                                        className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none pr-8"
                                        placeholder="Current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(prev => ({ ...prev, old: !prev.old }))}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPw.old ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                                {errors.current && (
                                    <p className="text-xs text-red-600 mt-1">{errors.current}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw.new1 ? "text" : "password"}
                                        value={passwordDraft.next}
                                        onChange={handlePasswordChange('next')}
                                        className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none pr-8"
                                        placeholder="New password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(prev => ({ ...prev, new1: !prev.new1 }))}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPw.new1 ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                                {errors.next && (
                                    <p className="text-xs text-red-600 mt-1">{errors.next}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw.new2 ? "text" : "password"}
                                        value={passwordDraft.confirm}
                                        onChange={handlePasswordChange('confirm')}
                                        className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none pr-8"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(prev => ({ ...prev, new2: !prev.new2 }))}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPw.new2 ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                                {errors.confirm && (
                                    <p className="text-xs text-red-600 mt-1">{errors.confirm}</p>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <LoadingButton
                                    onClick={savePasswordChange}
                                    loading={isLoading}
                                    variant="primary"
                                >
                                    Change Password
                                </LoadingButton>
                                <button
                                    onClick={() => {
                                        setChangeMode(null);
                                        setPasswordDraft({ current: "", next: "", confirm: "" });
                                        setErrors({});
                                    }}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setChangeMode('password')}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Change Password
                        </button>
                    )}
                </div>
            </Section>

            {/* Email Change */}
            <Section 
                title="Email Address" 
                description="Change your email address used for login"
            >
                <div className="space-y-4">
                    {changeMode === 'email' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={emailDraft.current}
                                    onChange={handleEmailChange('current')}
                                    className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                                    placeholder="Enter your current password"
                                />
                                {errors.currentPassword && (
                                    <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    New Email Address
                                </label>
                                <input
                                    type="email"
                                    value={emailDraft.next}
                                    onChange={handleEmailChange('next')}
                                    className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                                    placeholder="Enter your new email address"
                                />
                                {errors.newEmail && (
                                    <p className="text-sm text-red-600 mt-1">{errors.newEmail}</p>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <LoadingButton
                                    onClick={saveEmailChange}
                                    loading={isLoading}
                                    variant="primary"
                                >
                                    Change Email
                                </LoadingButton>
                                <button
                                    onClick={() => {
                                        setChangeMode(null);
                                        setEmailDraft({ current: "", next: "" });
                                        setErrors({});
                                    }}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setChangeMode('email')}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Change Email
                        </button>
                    )}
                </div>
            </Section>

            {/* Login History */}
            <Section 
                title="Login History & Sessions" 
                description="Manage your active sessions and view login history"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {loginHistory.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{session.device}</span>
                                        {session.current && (
                                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        {session.location} • {session.ipAddress || session.ip} • {new Date(session.loginTime).toLocaleString()}
                                    </p>
                                </div>
                                {!session.current && (
                                    <button
                                        onClick={() => revokeSession(session.id)}
                                        className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                    >
                        Log out all sessions
                    </button>
                </div>
            </Section>

            {/* Logout All Sessions Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">🔒</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">Log out of all sessions?</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    You will be signed out on all devices and need to log in again everywhere.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setShowLogoutModal(false)}
                                        className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <LoadingButton
                                        onClick={handleLogoutAllSessions}
                                        loading={isLoading}
                                        variant="danger"
                                    >
                                        Log Out All Sessions
                                    </LoadingButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};