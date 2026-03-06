import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Section, Toggle, PasswordField, LoadingButton } from './UIComponents';
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

    // 2FA state
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFASetupMode, setTwoFASetupMode] = useState(null); // 'start' | 'verify' | 'done' | null
    const [twoFASecret, setTwoFASecret] = useState(null);
    const [twoFAQrCodeUrl, setTwoFAQrCodeUrl] = useState(null);
    const [twoFACodeInput, setTwoFACodeInput] = useState("");
    const [backupCodes, setBackupCodes] = useState([]);
    const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
    const [twoFADisableMode, setTwoFADisableMode] = useState(false);
    const [codeDigits, setCodeDigits] = useState(Array(6).fill(""));
    const [twoFADisableDigits, setTwoFADisableDigits] = useState(Array(6).fill(""));
    const [regenCodeInput, setRegenCodeInput] = useState("");
    const [showRegenPrompt, setShowRegenPrompt] = useState(false);

    const twoFAInputsRef = useRef([]);
    const twoFADisableInputsRef = useRef([]);

    // Login history - will be loaded from API
    const [loginHistory, setLoginHistory] = useState([]);
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Load initial data
    useEffect(() => {
        loadSecurityData();
    }, []);

    const loadSecurityData = async () => {
        try {
            setIsLoading(true);
            setLoginLoading(true);

            // Load 2FA status
            const twoFAStatus = await securityService.get2FAStatus();
            setTwoFAEnabled(twoFAStatus.enabled);
            setBackupCodesRemaining(twoFAStatus.backupCodesRemaining || 0);

            // Load login history
            const historyData = await securityService.getLoginHistory(20);
            const rawHistory = historyData.history || [];

            // Load active sessions for current session detection
            const sessionsData = await securityService.getActiveSessions();
            const activeSessions = sessionsData.sessions || [];

            const updatedHistory = rawHistory.map((entry) => {
                const ip = entry.ipAddress || entry.ip || entry.ip_addr || entry.ipaddr || '';
                const loginTime = entry.loginTime || entry.loggedAt || entry.createdAt || entry.at || null;
                const deviceName = entry.device || entry.deviceName || entry.deviceInfo?.device || entry.userAgent || '';
                const browser = entry.browser || entry.deviceInfo?.browser || '';
                const os = entry.os || entry.deviceInfo?.os || '';
                const location = entry.location || entry.geoLocation || '';

                // Try to detect if this matches a current active session by id or ip+browser
                const isCurrent = !!activeSessions.find(s => (
                    (s.id && (s.id === entry.id || s.id === entry.sessionId)) ||
                    (entry.id && s.id === entry.id) ||
                    (s.isCurrent) ||
                    (s.ipAddress && s.ipAddress === ip && (s.deviceInfo?.browser || s.browser) === browser)
                ));

                return {
                    id: entry.id || entry.sessionId || entry._id || `${ip}-${browser}-${loginTime}`,
                    device: deviceName || (browser && os ? `${browser} • ${os}` : (browser || os) ) || 'Unknown Device',
                    browser,
                    os,
                    location: location || 'Unknown',
                    ipAddress: ip,
                    loginTime,
                    current: isCurrent
                };
            });

            setLoginHistory(updatedHistory);
        } catch (error) {
            console.error('Failed to load security data:', error);
            showToast('Failed to load security settings', 'error');
        } finally {
            setIsLoading(false);
            setLoginLoading(false);
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

    // Focus helper that avoids scrolling
    const focusNoScroll = (el) => {
        if (!el) return;
        try {
            el.focus({ preventScroll: true });
            return;
        } catch (_) {
            // Fallback
        }
        const winX = window.scrollX;
        const winY = window.scrollY;
        const containers = [];
        let p = el.parentElement;
        while (p) {
            if (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth) {
                containers.push({ el: p, top: p.scrollTop, left: p.scrollLeft });
            }
            p = p.parentElement;
        }
        el.focus();
        window.scrollTo(winX, winY);
        containers.forEach((c) => {
            c.el.scrollTop = c.top;
            c.el.scrollLeft = c.left;
        });
    };

    // 2FA Functions - Real API integration
    const startTwoFASetup = async () => {
        try {
            setIsLoading(true);
            const response = await securityService.start2FASetup();
            setTwoFASecret(response.manualEntryKey || response.secret);
            setTwoFAQrCodeUrl(response.qrCodeUrl || null);
            setTwoFASetupMode("verify");
            showToast('Scan the QR code with your authenticator app, then enter the code.');
        } catch (error) {
            console.error('Failed to start 2FA setup:', error);
            showToast('Failed to start 2FA setup', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyTwoFACode = async () => {
        const code = twoFACodeInput.replace(/\s+/g, "");
        if (!code || code.length !== 6) {
            showToast('Please enter a valid 6-digit code', 'error');
            return false;
        }

        try {
            setIsLoading(true);
            const response = await securityService.verify2FASetup(code);
            setTwoFAEnabled(true);
            setTwoFASetupMode("done");
            setBackupCodes(response.backupCodes || []);
            setCodeDigits(Array(6).fill(""));
            setTwoFACodeInput("");
            showToast('Two-factor authentication enabled successfully!');
            return true;
        } catch (error) {
            console.error('Failed to verify 2FA code:', error);
            showToast('Invalid verification code. Please try again.', 'error');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const disableTwoFA = async () => {
        const code = twoFADisableDigits.join('');
        if (!code || code.length !== 6) {
            showToast('Please enter a valid 6-digit code', 'error');
            return;
        }

        try {
            setIsLoading(true);
            await securityService.disable2FA(code);
            setTwoFAEnabled(false);
            setTwoFASecret(null);
            setBackupCodes([]);
            setTwoFASetupMode(null);
            setTwoFACodeInput("");
            setTwoFADisableMode(false);
            setTwoFADisableDigits(Array(6).fill(""));
            showToast('Two-factor authentication disabled successfully');
        } catch (error) {
            console.error('Failed to disable 2FA:', error);
            showToast('Failed to disable 2FA. Please check your code.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const generateBackupCodes = async () => {
        if (!regenCodeInput.trim()) {
            showToast('Please enter your current 2FA code to regenerate backup codes', 'error');
            return;
        }
        try {
            setIsLoading(true);
            const response = await securityService.generateBackupCodes(regenCodeInput.trim());
            setBackupCodes(response.backupCodes || []);
            setBackupCodesRemaining(response.backupCodes?.length || 0);
            setRegenCodeInput("");
            setShowRegenPrompt(false);
            showToast('New backup codes generated. Save them somewhere safe!');
        } catch (error) {
            console.error('Failed to generate backup codes:', error);
            showToast('Invalid code. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Download the current backup codes as a plain text file.
    const downloadBackupCodes = () => {
        if (!backupCodes || backupCodes.length === 0) return;
        const content = backupCodes.join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pm-backup-codes.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // Copy backup codes to the clipboard (fallback if Clipboard API unavailable)
    const copyBackupCodes = async () => {
        if (!backupCodes || backupCodes.length === 0) return;
        const text = backupCodes.join("\n");
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                showToast('Backup codes copied to clipboard');
            } else {
                // Fallback for older browsers
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
                showToast('Backup codes copied to clipboard');
            }
        } catch (err) {
            console.error('Failed to copy backup codes:', err);
            showToast('Failed to copy backup codes', 'error');
        }
    };

    // Hide backup codes from the UI after user is done (security hygiene)
    const doneWithBackupCodes = () => {
        setBackupCodes([]);
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
            setLoginHistory(prev => prev.filter(session => session.id !== sessionId));
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

    // Auto-focus 2FA inputs
    useEffect(() => {
        if (twoFASetupMode === "verify") {
            focusNoScroll(twoFAInputsRef.current[0]);
        }
    }, [twoFASetupMode]);

    useEffect(() => {
        if (twoFADisableMode) {
            focusNoScroll(twoFADisableInputsRef.current[0]);
        }
    }, [twoFADisableMode]);

    return (
        <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <Section
                title="Two-Factor Authentication"
                description="Add an extra layer of security using Google Authenticator, Microsoft Authenticator, or any TOTP app"
            >
                {twoFAEnabled ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                            <span className="text-base">✅</span>
                            <span className="font-medium">Two-factor authentication is enabled</span>
                        </div>

                        {/* Backup codes info */}
                        <div className="text-sm text-gray-600">
                            Backup codes remaining: <span className={backupCodesRemaining <= 2 ? "text-red-600 font-semibold" : "font-medium"}>{backupCodesRemaining}</span>
                            {backupCodesRemaining <= 2 && <span className="text-red-600"> — generate new codes soon</span>}
                        </div>

                        {/* Show newly generated backup codes */}
                        {backupCodes.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-yellow-800 mb-2">Save these backup codes — they won't be shown again:</p>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {backupCodes.map((code, i) => (
                                        <code key={i} className="bg-white border border-yellow-300 rounded px-2 py-1 text-xs font-mono text-center tracking-widest">{code}</code>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={copyBackupCodes} className="text-xs px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded">Copy</button>
                                    <button onClick={downloadBackupCodes} className="text-xs px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded">Download</button>
                                    <button onClick={() => setBackupCodes([])} className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 underline ml-auto">Dismiss</button>
                                </div>
                            </div>
                        )}

                        {/* Regenerate backup codes */}
                        {!showRegenPrompt ? (
                            <button
                                onClick={() => setShowRegenPrompt(true)}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Regenerate backup codes
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-600">Enter your current 2FA code to generate new backup codes:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={8}
                                        value={regenCodeInput}
                                        onChange={(e) => setRegenCodeInput(e.target.value.replace(/\s/g, ""))}
                                        placeholder="123456"
                                        className="w-32 border border-gray-300 rounded px-3 py-1.5 text-sm font-mono text-center tracking-widest"
                                        autoFocus
                                    />
                                    <LoadingButton onClick={generateBackupCodes} loading={isLoading} variant="primary">Generate</LoadingButton>
                                    <button onClick={() => { setShowRegenPrompt(false); setRegenCodeInput(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* Disable 2FA */}
                        {!twoFADisableMode ? (
                            <button
                                onClick={() => setTwoFADisableMode(true)}
                                className="text-sm text-red-600 hover:underline"
                            >
                                Disable two-factor authentication
                            </button>
                        ) : (
                            <div className="space-y-3 border border-red-200 bg-red-50 rounded-lg p-4">
                                <p className="text-sm font-medium text-red-800">Enter your 2FA code to confirm disabling:</p>
                                <div className="flex gap-1">
                                    {twoFADisableDigits.map((d, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => (twoFADisableInputsRef.current[i] = el)}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={d}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                const next = [...twoFADisableDigits];
                                                next[i] = val;
                                                setTwoFADisableDigits(next);
                                                if (val && i < 5) focusNoScroll(twoFADisableInputsRef.current[i + 1]);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace" && !twoFADisableDigits[i] && i > 0) {
                                                    focusNoScroll(twoFADisableInputsRef.current[i - 1]);
                                                }
                                            }}
                                            className="w-10 h-10 border border-red-300 rounded text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <LoadingButton onClick={disableTwoFA} loading={isLoading} variant="danger">Disable 2FA</LoadingButton>
                                    <button onClick={() => { setTwoFADisableMode(false); setTwoFADisableDigits(Array(6).fill("")); }} className="text-sm text-gray-500 hover:text-gray-700 underline">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : twoFASetupMode === "verify" ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Scan this QR code with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, <strong>Authy</strong>, or any TOTP app:
                        </p>
                        {twoFAQrCodeUrl && (
                            <img src={twoFAQrCodeUrl} alt="2FA QR Code" className="w-48 h-48 border border-gray-200 rounded-lg p-2 bg-white" />
                        )}
                        <div className="text-xs text-gray-500">
                            <p>Can't scan? Enter this key manually:</p>
                            <code className="block mt-1 bg-gray-100 px-3 py-2 rounded font-mono tracking-widest break-all">{twoFASecret}</code>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Enter the 6-digit code from your app to confirm setup:</p>
                            <div className="flex gap-1 mb-3">
                                {codeDigits.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (twoFAInputsRef.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            const next = [...codeDigits];
                                            next[i] = val;
                                            setCodeDigits(next);
                                            setTwoFACodeInput(next.join(""));
                                            if (val && i < 5) focusNoScroll(twoFAInputsRef.current[i + 1]);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Backspace" && !codeDigits[i] && i > 0) {
                                                focusNoScroll(twoFAInputsRef.current[i - 1]);
                                            }
                                        }}
                                        className="w-10 h-10 border border-gray-300 rounded text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <LoadingButton onClick={verifyTwoFACode} loading={isLoading} variant="primary">Verify & Enable</LoadingButton>
                                <button onClick={() => { setTwoFASetupMode(null); setCodeDigits(Array(6).fill("")); setTwoFACodeInput(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">Cancel</button>
                            </div>
                        </div>
                    </div>
                ) : twoFASetupMode === "done" ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                            <span className="text-base">✅</span>
                            <span className="font-medium">Two-factor authentication enabled successfully!</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">Save these backup codes — they won't be shown again:</p>
                        <div className="grid grid-cols-3 gap-2">
                            {backupCodes.map((code, i) => (
                                <code key={i} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs font-mono text-center tracking-widest">{code}</code>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyBackupCodes} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded">Copy codes</button>
                            <button onClick={downloadBackupCodes} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded">Download</button>
                            <button onClick={() => { setTwoFASetupMode(null); setBackupCodes([]); }} className="text-sm px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded ml-auto">Done</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">Protect your account with a time-based one-time password from your phone. Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password, and more.</p>
                        <LoadingButton onClick={startTwoFASetup} loading={isLoading} variant="primary">
                            Enable Two-Factor Authentication
                        </LoadingButton>
                    </div>
                )}
            </Section>

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
                        {loginLoading ? (
                            <div className="p-4 text-sm text-gray-600">Loading login history...</div>
                        ) : loginHistory.length === 0 ? (
                            <div className="p-4 text-sm text-gray-600">No login history or active sessions found.</div>
                        ) : (
                            loginHistory.map((session) => (
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
                                            {session.location} • {session.ipAddress || session.ip} • {session.loginTime ? new Date(session.loginTime).toLocaleString() : 'Unknown time'}
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
                            ))
                        )}
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