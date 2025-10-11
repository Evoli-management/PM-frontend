import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Section, Toggle, PasswordField, LoadingButton } from './UIComponents';

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
    const [twoFACodeInput, setTwoFACodeInput] = useState("");
    const [backupCodes, setBackupCodes] = useState([]);
    const [twoFADisableMode, setTwoFADisableMode] = useState(false);
    const [codeDigits, setCodeDigits] = useState(Array(6).fill(""));
    const [twoFADisableDigits, setTwoFADisableDigits] = useState(Array(6).fill(""));
    
    const twoFAInputsRef = useRef([]);
    const twoFADisableInputsRef = useRef([]);

    // Login history
    const [loginHistory, setLoginHistory] = useState([
        { id: 1, device: "Windows PC - Chrome", location: "New York, US", ip: "192.168.1.100", loginTime: "2024-12-01 09:15:23", current: true },
        { id: 2, device: "iPhone - Safari", location: "New York, US", ip: "192.168.1.101", loginTime: "2024-11-30 18:45:12", current: false },
        { id: 3, device: "MacBook - Safari", location: "Chicago, US", ip: "10.0.1.50", loginTime: "2024-11-29 14:22:35", current: false },
        { id: 4, device: "Android - Chrome", location: "Los Angeles, US", ip: "172.16.0.25", loginTime: "2024-11-28 11:33:47", current: false },
    ]);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const ALLOW_ANY_CODE_FOR_TEST = true; // Set to false in production

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

    // 2FA Functions
    const generateMockSecret = () => {
        return Math.random().toString(36).slice(2, 14).toUpperCase();
    };

    const generateBackupCodes = () => {
        const codes = Array.from({ length: 6 }).map(() => 
            Math.random().toString(36).slice(2, 10).toUpperCase()
        );
        setBackupCodes(codes);
        return codes;
    };

    const startTwoFASetup = () => {
        const secret = generateMockSecret();
        setTwoFASecret(secret);
        setTwoFASetupMode("verify");
    };

    const verifyTwoFACode = () => {
        const code = twoFACodeInput.replace(/\s+/g, "");
        if (!code || code.length !== 6) return false;
        
        if (ALLOW_ANY_CODE_FOR_TEST) {
            setTwoFAEnabled(true);
            setTwoFASetupMode("done");
            generateBackupCodes();
            setCodeDigits(Array(6).fill(""));
            setTwoFACodeInput("");
            showToast('Two-factor authentication enabled successfully!');
            return true;
        }
        return false;
    };

    const disableTwoFA = () => {
        setTwoFAEnabled(false);
        setTwoFASecret(null);
        setBackupCodes([]);
        setTwoFASetupMode(null);
        setTwoFACodeInput("");
        setTwoFADisableMode(false);
        showToast('Two-factor authentication disabled');
    };

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

    const savePasswordChange = async () => {
        if (!validatePasswordChange()) return;
        
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setPasswordDraft({ current: "", next: "", confirm: "" });
            setChangeMode(null);
            showToast('Password changed successfully!');
        } catch (error) {
            console.error('Failed to change password:', error);
            showToast('Failed to change password', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const revokeSession = (id) => {
        setLoginHistory(prev => prev.filter(session => session.id !== id || session.current));
        showToast('Session revoked successfully');
    };

    const handleLogoutAllSessions = async () => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setLoginHistory(prev => prev.filter(session => session.current));
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
            {/* Password Change */}
            <Section 
                title="Password & Authentication" 
                description="Manage your password and authentication settings"
            >
                <div className="space-y-4">
                    {changeMode === 'password' ? (
                        <div className="space-y-4">
                            <PasswordField
                                value={passwordDraft.current}
                                onChange={handlePasswordChange('current')}
                                placeholder="Current password"
                                open={showPw.old}
                                toggle={() => setShowPw(prev => ({ ...prev, old: !prev.old }))}
                                error={errors.current}
                            />
                            
                            <PasswordField
                                value={passwordDraft.next}
                                onChange={handlePasswordChange('next')}
                                placeholder="New password"
                                open={showPw.new1}
                                toggle={() => setShowPw(prev => ({ ...prev, new1: !prev.new1 }))}
                                error={errors.next}
                            />
                            
                            <PasswordField
                                value={passwordDraft.confirm}
                                onChange={handlePasswordChange('confirm')}
                                placeholder="Confirm new password"
                                open={showPw.new2}
                                toggle={() => setShowPw(prev => ({ ...prev, new2: !prev.new2 }))}
                                error={errors.confirm}
                            />
                            
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

            {/* Two-Factor Authentication */}
            <Section 
                title="Two-Factor Authentication" 
                description="Add an extra layer of security to your account"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium text-gray-700">Enable 2FA</span>
                            <p className="text-xs text-gray-600 mt-1">
                                Secure your account with time-based one-time passwords
                            </p>
                        </div>
                        <Toggle
                            checked={twoFAEnabled || twoFASetupMode === 'verify'}
                            onChange={(v) => {
                                if (v) {
                                    if (!twoFAEnabled && twoFASetupMode !== 'verify') {
                                        startTwoFASetup();
                                    }
                                } else {
                                    if (twoFAEnabled) {
                                        setTwoFADisableMode(true);
                                    } else if (twoFASetupMode === 'verify') {
                                        setTwoFASetupMode(null);
                                        setTwoFASecret(null);
                                        setCodeDigits(Array(6).fill(""));
                                        setTwoFACodeInput("");
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* 2FA Setup Panel */}
                    {twoFASetupMode === "verify" && (
                        <div className="border border-gray-300 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">
                                Setup Two-Factor Authentication
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-24 w-24 bg-gray-100 border rounded flex items-center justify-center">
                                            <span className="text-xs text-gray-500">QR Code</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-600 mb-2">
                                            Scan this QR code with your authenticator app or enter the secret manually.
                                        </p>
                                        <div className="bg-gray-50 rounded p-2 mb-3">
                                            <code className="text-sm">{twoFASecret}</code>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Enter verification code
                                    </label>
                                    <div className="flex gap-2">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="\\d*"
                                                maxLength={1}
                                                className="w-10 h-10 text-center border border-gray-300 rounded text-sm"
                                                placeholder="0"
                                                value={codeDigits[i]}
                                                ref={(el) => (twoFAInputsRef.current[i] = el)}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                    setCodeDigits(prev => {
                                                        const next = [...prev];
                                                        next[i] = value;
                                                        setTwoFACodeInput(next.join(''));
                                                        return next;
                                                    });
                                                    if (value && i < 5) {
                                                        focusNoScroll(twoFAInputsRef.current[i + 1]);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
                                                        focusNoScroll(twoFAInputsRef.current[i - 1]);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                <LoadingButton
                                    onClick={verifyTwoFACode}
                                    disabled={twoFACodeInput.length !== 6}
                                    variant="primary"
                                >
                                    Verify & Enable 2FA
                                </LoadingButton>
                            </div>
                        </div>
                    )}

                    {/* Backup Codes */}
                    {twoFAEnabled && backupCodes.length > 0 && (
                        <div className="border border-gray-300 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">
                                Backup Codes
                            </h3>
                            <p className="text-xs text-gray-600 mb-3">
                                Save these codes in a safe place. Each can be used once if you lose device access.
                            </p>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {backupCodes.map((code, index) => (
                                    <code key={index} className="text-xs bg-gray-50 p-2 rounded">
                                        {code}
                                    </code>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={downloadBackupCodes}
                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Download Codes
                                </button>
                                <button
                                    onClick={generateBackupCodes}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Disable 2FA Modal */}
                    {twoFADisableMode && (
                        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                <h3 className="text-lg font-semibold mb-4">Disable Two-Factor Authentication</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Enter a verification code from your authenticator app to disable 2FA.
                                </p>
                                <div className="flex gap-2 mb-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <input
                                            key={i}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="\\d*"
                                            maxLength={1}
                                            className="w-10 h-10 text-center border border-gray-300 rounded text-sm"
                                            placeholder="0"
                                            value={twoFADisableDigits[i]}
                                            ref={(el) => (twoFADisableInputsRef.current[i] = el)}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                setTwoFADisableDigits(prev => {
                                                    const next = [...prev];
                                                    next[i] = value;
                                                    return next;
                                                });
                                                if (value && i < 5) {
                                                    focusNoScroll(twoFADisableInputsRef.current[i + 1]);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !twoFADisableDigits[i] && i > 0) {
                                                    focusNoScroll(twoFADisableInputsRef.current[i - 1]);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setTwoFADisableMode(false);
                                            setTwoFADisableDigits(Array(6).fill(""));
                                        }}
                                        className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <LoadingButton
                                        onClick={disableTwoFA}
                                        variant="danger"
                                        disabled={twoFADisableDigits.join('').length !== 6}
                                    >
                                        Disable 2FA
                                    </LoadingButton>
                                </div>
                            </div>
                        </div>
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
                                        {session.location} • {session.ip} • {session.loginTime}
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