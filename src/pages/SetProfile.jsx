import React, { useMemo, useRef, useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("Account");
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarOriginal, setAvatarOriginal] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropZoom, setCropZoom] = useState(1);
    const cropImgRef = useRef(null);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [prefSaved, setPrefSaved] = useState(false);
    const [privacySaved, setPrivacySaved] = useState(false);
    const [accountSaved, setAccountSaved] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [changeMode, setChangeMode] = useState(null); // 'password' | 'email' | null
    const fileRef = useRef(null);

    // Allow deep-linking: #/profile-settings?tab=preferences selects the Preferences tab
    useEffect(() => {
        const applyFromHash = () => {
            try {
                const hash = window.location.hash || "";
                const queryIndex = hash.indexOf("?");
                if (queryIndex === -1) return;
                const qs = new URLSearchParams(hash.substring(queryIndex + 1));
                const tab = (qs.get("tab") || "").toLowerCase();
                const map = {
                    account: "Account",
                    security: "Security",
                    preferences: "Preferences",
                    integrations: "Integrations",
                    privacy: "Privacy",
                    teams: "Teams & Members",
                    "teams-members": "Teams & Members",
                };
                if (map[tab]) setActiveTab(map[tab]);
            } catch (_) {
                // ignore
            }
        };
        applyFromHash();
        window.addEventListener("hashchange", applyFromHash);
        return () => window.removeEventListener("hashchange", applyFromHash);
    }, []);

    // 2FA state (mocked local flow)
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFASetupMode, setTwoFASetupMode] = useState(null); // 'start' | 'verify' | 'done' | null
    const [twoFASecret, setTwoFASecret] = useState(null);
    const [twoFACodeInput, setTwoFACodeInput] = useState("");
    const [backupCodes, setBackupCodes] = useState([]);
    const twoFAInputsRef = useRef([]);
    const [twoFADisableMode, setTwoFADisableMode] = useState(false);
    const [twoFADisableCode, setTwoFADisableCode] = useState("");
    const [codeDigits, setCodeDigits] = useState(Array(6).fill(""));
    const [twoFADisableError, setTwoFADisableError] = useState(null);
    const [twoFADisableDigits, setTwoFADisableDigits] = useState(Array(6).fill(""));
    const twoFADisableInputsRef = useRef([]);

    // Focus helper that avoids scrolling the page when moving between inputs
    const focusNoScroll = (el) => {
        if (!el) return;
        try {
            // Modern browsers
            el.focus({ preventScroll: true });
            return;
        } catch (_) {
            // Fallback path below
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
        // Restore scroll positions
        window.scrollTo(winX, winY);
        containers.forEach((c) => {
            c.el.scrollTop = c.top;
            c.el.scrollLeft = c.left;
        });
    };

    const generateMockSecret = () => {
        // simple mocked secret
        return Math.random().toString(36).slice(2, 14).toUpperCase();
    };

    const generateBackupCodes = () => {
        const codes = Array.from({ length: 6 }).map(() => Math.random().toString(36).slice(2, 10).toUpperCase());
        setBackupCodes(codes);
        return codes;
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

    // Integration / Synchronization state (persisted locally for demo)
    const [integrations, setIntegrations] = useState(() => {
        try {
            const raw = localStorage.getItem("pm:integrations");
            return raw
                ? JSON.parse(raw)
                : {
                      // Calendars
                      google: { connected: false, account: null },
                      outlook: { connected: false, account: null },
                      apple: { connected: false, account: null },
                      // CRM/Storage (future-ready)
                      zoho: { connected: false, account: null },
                  };
        } catch (e) {
            return {
                google: { connected: false, account: null },
                outlook: { connected: false, account: null },
                apple: { connected: false, account: null },
                zoho: { connected: false, account: null },
            };
        }
    });

    const saveIntegrations = (updater) => {
        setIntegrations((prev) => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            try {
                localStorage.setItem("pm:integrations", JSON.stringify(next));
            } catch (err) {
                console.error("Failed to persist integrations", err);
            }
            return next;
        });
    };

    // ------------------ Synchronization helpers ------------------
    const formatDate = (iso) => {
        try {
            return new Date(iso).toLocaleString();
        } catch (e) {
            return iso;
        }
    };

    const syncIntegration = async (provider) => {
        // mark syncing
        saveIntegrations((prev) => ({
            ...prev,
            [provider]: { ...(prev[provider] || {}), syncing: true },
        }));

        try {
            // simulate network sync (replace with real API call in prod)
            await new Promise((res) => setTimeout(res, 1000 + Math.random() * 2000));
            const now = new Date().toISOString();
            saveIntegrations((prev) => ({
                ...prev,
                [provider]: {
                    ...(prev[provider] || {}),
                    syncing: false,
                    lastSynced: now,
                    lastSyncResult: "ok",
                },
            }));
        } catch (err) {
            console.error("Sync failed for", provider, err);
            saveIntegrations((prev) => ({
                ...prev,
                [provider]: {
                    ...(prev[provider] || {}),
                    syncing: false,
                    lastSyncResult: "error",
                },
            }));
        }
    };

    const syncAllIntegrations = async () => {
        const providers = Object.keys(integrations).filter((p) => integrations[p]?.connected);
        for (const p of providers) {
            // sequential to avoid many parallel ops; change to parallel if desired
            // eslint-disable-next-line no-await-in-loop
            await syncIntegration(p);
        }
    };

    // Track which provider is currently in the authorization popup/pending state
    const [connectPending, setConnectPending] = useState(null);

    // Simulated connect flow: open a small popup that posts back a success message.
    // Production: replace this with a real OAuth redirect and server-side token exchange.
    const connectIntegration = (provider) => {
        setConnectPending(provider);
        const w = 600;
        const h = 700;
        const left = window.screenX + (window.innerWidth - w) / 2;
        const top = window.screenY + (window.innerHeight - h) / 2;
        const popup = window.open("", "pm_oauth", `width=${w},height=${h},left=${left},top=${top}`);
        if (!popup) {
            // Popup blocked: fallback to prompt for email
            const email = window.prompt(`Enter ${provider} account email to connect (simulated)`);
            if (!email) {
                setConnectPending(null);
                return;
            }
            saveIntegrations((prev) => ({
                ...prev,
                [provider]: { connected: true, account: { email, name: email.split("@")[0] } },
            }));
            setConnectPending(null);
            return;
        }

        // Minimal HTML UI for simulated auth
        const acctEmail = `user+${provider}@example.com`;
        const acctName = `Demo ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
        const html = `
                        <html>
                        <head><title>Simulated ${provider} OAuth</title></head>
                        <body style="font-family: sans-serif; padding: 20px;">
                            <h2>Simulated ${provider} Authorization</h2>
                            <p>This popup simulates the OAuth consent screen for <strong>${provider}</strong>.</p>
                            <p>Click <strong>Authorize</strong> to complete the simulated flow and return to the app.</p>
                            <div style="margin-top:20px;">
                                <button id="auth">Authorize</button>
                                <button id="cancel" style="margin-left:8px;">Cancel</button>
                            </div>
                            <script>
                                document.getElementById('auth').addEventListener('click', function(){
                                    window.opener.postMessage({ provider: '${provider}', status: 'success', account: { email: '${acctEmail}', name: '${acctName}' } }, '*');
                                    window.close();
                                });
                                document.getElementById('cancel').addEventListener('click', function(){
                                    window.opener.postMessage({ provider: '${provider}', status: 'cancel' }, '*');
                                    window.close();
                                });
                            <\/script>
                        </body>
                        </html>
                `;
        popup.document.write(html);
        popup.document.close();
    };

    const disconnectIntegration = (provider) => {
        if (!window.confirm(`Disconnect ${provider.toUpperCase()} integration?`)) return;
        // Production: call server to revoke tokens before clearing client state.
        saveIntegrations((prev) => ({ ...prev, [provider]: { connected: false, account: null } }));
        // clear any pending state
        if (connectPending === provider) setConnectPending(null);
    };

    // Listen for messages from the simulated popup and apply the integration result
    useEffect(() => {
        const onMessage = (e) => {
            try {
                const data = e.data;
                if (!data || !data.provider) return;
                if (data.status === "success") {
                    saveIntegrations((prev) => ({
                        ...prev,
                        [data.provider]: { connected: true, account: data.account },
                    }));
                    setConnectPending(null);
                    // Kick off an initial sync after connecting
                    setTimeout(() => syncIntegration(data.provider), 200);
                }
            } catch (err) {
                console.error("Integration message handler error", err);
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    const startTwoFASetup = () => {
        const secret = generateMockSecret();
        setTwoFASecret(secret);
        setTwoFASetupMode("verify");
    };

    // TESTING: keep this true so any non-empty code is accepted during local testing.
    // When you're ready for production, set this to false or use an env guard.
    const ALLOW_ANY_CODE_FOR_TEST = true;

    // Verify the entered code during setup.
    // NOTE: This contains a testing shortcut when ALLOW_ANY_CODE_FOR_TEST is enabled.
    // Remove or guard this behavior in production builds.
    // Test-mode verify: accept any non-empty 6-digit code. Keep this while testing locally.
    const verifyTwoFACode = () => {
        const code = twoFACodeInput.replace(/\s+/g, "");
        if (!code || code.length !== 6) return false;
        if (ALLOW_ANY_CODE_FOR_TEST) {
            setTwoFAEnabled(true);
            setTwoFASetupMode("done");
            generateBackupCodes();
            setCodeDigits(Array(6).fill(""));
            setTwoFACodeInput("");
            return true;
        }
        // If not using test mode, you should replace this with a server-side verification.
        return false;
    };

    const disableTwoFA = () => {
        setTwoFAEnabled(false);
        setTwoFASecret(null);
        setBackupCodes([]);
        setTwoFASetupMode(null);
        setTwoFACodeInput("");
    };

    /*
    PRODUCTION INTEGRATION SAMPLES (COMMENTED OUT)

    When you're ready to move to production, uncomment these helpers and replace the
    test-mode behavior above (set ALLOW_ANY_CODE_FOR_TEST = false).

    // Request server to create TOTP secret / QR and return it.
    const requestTwoFASetupFromServer = async () => {
        try {
            const res = await fetch('/api/2fa/setup', { method: 'POST' });
            return await res.json();
        } catch (err) {
            console.error('2FA setup request failed', err);
            return null;
        }
    };

    // Verify code with server. Example: POST /api/2fa/verify { code } -> { ok: true }
    const verifyTwoFAOnServer = async (code) => {
        try {
            const res = await fetch('/api/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            return (await res.json()) || { ok: false };
        } catch (err) {
            console.error('verifyTwoFAOnServer error', err);
            return { ok: false };
        }
    };

    // Ask server to disable 2FA after verifying provided code.
    const disableTwoFAOnServer = async (code) => {
        try {
            const res = await fetch('/api/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            return (await res.json()) || { ok: false };
        } catch (err) {
            console.error('disableTwoFAOnServer error', err);
            return { ok: false };
        }
    };

    */

    // Verify a code entered to disable 2FA. In test mode this will accept any code.
    // IMPORTANT: do not enable ALLOW_ANY_CODE_FOR_TEST in production.
    const verifyDisableCode = () => {
        const code = twoFADisableCode.replace(/\D/g, "");
        if (code.length !== 6) return false;
        if (ALLOW_ANY_CODE_FOR_TEST) return true;
        // Accept if matches last 6 of secret in non-test mode
        if (twoFASecret && code === twoFASecret.slice(-6)) return true;
        return false;
    };

    // autofocus first digit input when verify panel opens
    useEffect(() => {
        if (twoFASetupMode === "verify") {
            focusNoScroll(twoFAInputsRef.current[0]);
        }
    }, [twoFASetupMode]);

    // autofocus first disable digit input when disable panel opens
    useEffect(() => {
        if (twoFADisableMode) {
            focusNoScroll(twoFADisableInputsRef.current[0]);
        }
    }, [twoFADisableMode]);

    const timezones = useMemo(
        () => [
            { label: "Pacific Time (US)", value: "America/Los_Angeles" },
            { label: "Eastern Time (US)", value: "America/New_York" },
            { label: "Central European Time", value: "Europe/Berlin" },
            { label: "East Africa Time (GMT+3)", value: "Africa/Nairobi" },
        ],
        [],
    );
    const languages = [
        { code: "en", label: "English" },
        { code: "sw", label: "Swahili" },
        { code: "fr", label: "French" },
        { code: "es", label: "Spanish" },
        { code: "de", label: "German" },
        { code: "pt", label: "Portuguese" },
        { code: "ar", label: "Arabic" },
        { code: "zh", label: "Chinese (Simplified)" },
        { code: "ja", label: "Japanese" },
        { code: "ko", label: "Korean" },
    ];

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
    jobTitle: "",
    department: "",
    manager: "",
    bio: "",
    skills: [],
        tz: "America/Los_Angeles",
        lang: "en",
        start: "09:00",
        end: "17:00",
        // Regional formats
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        // Notification settings
        notifications: {
            inApp: true,
            email: true,
            push: false,
            weeklyReports: true,
            dailyReports: false,
        },
        oldEmail: "",
        newEmail: "",
        oldPw: "",
        newPw: "",
        confirmPw: "",
        // Dashboard Preferences
        dashboardTheme: "light",
        dashboardLayout: "default",
        widgetPreferences: {
            showProjects: true,
            showTasks: true,
            showTeam: true,
            showRecentActivity: true,
            showQuickActions: true,
        },
                                        dashboardRefreshRate: "auto",
        // Privacy Controls for eNPS
        enpsPrivacySettings: {
            allowAnonymousScoring: true,
            showIndividualScores: false,
            enableTeamReports: true,
            enableOrgReports: true,
            dataRetentionDays: 365,
        },
        // Enhanced Privacy Controls
        strokesVisibility: "team-only", // "public", "team-only", "private"
        showInActivityFeed: true,
        // Team Management
        teams: {
            mainTeam: {
                name: "Product Development",
                members: 8,
                role: "Lead Developer"
            },
            otherTeams: [
                { name: "Marketing", role: "Contributor", members: 5 },
                { name: "Design System", role: "Reviewer", members: 3 }
            ],
            canCreateTeams: true,
            canJoinTeams: true,
        },
        // Security Settings
        security: {
            loginHistory: [],
            sessionsToLogOut: false,
            twoFactorStatus: twoFAEnabled ? "enabled" : "disabled",
        },
    });
    const [skillsInput, setSkillsInput] = useState("");

    // Load preferences from localStorage (if available)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("pm:preferences");
            if (!raw) return;
            const saved = JSON.parse(raw);
            setForm((s) => ({
                ...s,
                tz: saved.tz ?? s.tz,
                lang: saved.lang ?? s.lang,
                dateFormat: saved.dateFormat ?? s.dateFormat,
                timeFormat: saved.timeFormat ?? s.timeFormat,
                start: saved.start ?? s.start,
                end: saved.end ?? s.end,
                notifications: { ...s.notifications, ...(saved.notifications || {}) },
                dashboardTheme: saved.dashboardTheme ?? s.dashboardTheme,
                dashboardLayout: saved.dashboardLayout ?? s.dashboardLayout,
                widgetPreferences: { ...s.widgetPreferences, ...(saved.widgetPreferences || {}) },
                dashboardRefreshRate: saved.dashboardRefreshRate ?? s.dashboardRefreshRate,
                // Privacy related loads if present
                strokesVisibility: saved.strokesVisibility ?? s.strokesVisibility,
                showInActivityFeed: saved.showInActivityFeed ?? s.showInActivityFeed,
                enpsPrivacySettings: {
                    ...s.enpsPrivacySettings,
                    ...(saved.enpsPrivacySettings || {}),
                },
            }));
        } catch (_) {
            // ignore malformed storage
        }
    }, []);

    const savePreferences = () => {
        try {
            const toStore = {
                tz: form.tz,
                lang: form.lang,
                dateFormat: form.dateFormat,
                timeFormat: form.timeFormat,
                start: form.start,
                end: form.end,
                notifications: form.notifications,
                dashboardTheme: form.dashboardTheme,
                dashboardLayout: form.dashboardLayout,
                widgetPreferences: form.widgetPreferences,
                dashboardRefreshRate: form.dashboardRefreshRate,
                // also persist privacy so both tabs share the same bucket
                strokesVisibility: form.strokesVisibility,
                showInActivityFeed: form.showInActivityFeed,
                enpsPrivacySettings: form.enpsPrivacySettings,
            };
            localStorage.setItem("pm:preferences", JSON.stringify(toStore));
            setPrefSaved(true);
            setTimeout(() => setPrefSaved(false), 2000);
        } catch (_) {
            // ignore
        }
    };

    const savePrivacy = () => {
        try {
            const raw = localStorage.getItem("pm:preferences");
            const base = raw ? JSON.parse(raw) : {};
            const toStore = {
                ...base,
                strokesVisibility: form.strokesVisibility,
                showInActivityFeed: form.showInActivityFeed,
                enpsPrivacySettings: form.enpsPrivacySettings,
            };
            localStorage.setItem("pm:preferences", JSON.stringify(toStore));
            setPrivacySaved(true);
            setTimeout(() => setPrivacySaved(false), 2000);
        } catch (_) {
            // ignore
        }
    };

    // Derived team permissions (scoped to this component)
    const canCreateTeams = form?.teams?.canCreateTeams ?? true;
    const canJoinTeams = form?.teams?.canJoinTeams ?? true;
    const canManageTeams = canCreateTeams; // simple gate for demo

    const upd = (k) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((s) => ({ ...s, [k]: value }));
        // Clear error when user starts typing
        if (errors[k]) {
            setErrors((prev) => ({ ...prev, [k]: null }));
        }
    };

    // Helper function for updating widget preferences
    const updateWidgetPreference = (widgetKey) => (checked) => {
        setForm((s) => ({
            ...s,
            widgetPreferences: {
                ...s.widgetPreferences,
                [widgetKey]: checked,
            },
        }));
    };

    // Helper function for updating notification settings
    const updateNotificationSetting = (key) => (checked) => {
        setForm((s) => ({
            ...s,
            notifications: {
                ...s.notifications,
                [key]: checked,
            },
        }));
    };

    // Helper function for updating eNPS privacy settings
    const updateEnpsPrivacySetting = (settingKey) => (checked) => {
        setForm((s) => ({
            ...s,
            enpsPrivacySettings: {
                ...s.enpsPrivacySettings,
                [settingKey]: checked,
            },
        }));
    };

    // Helper function for updating team settings
    const updateTeamSetting = (settingKey) => (value) => {
        setForm((s) => ({
            ...s,
            teams: {
                ...s.teams,
                [settingKey]: value,
            },
        }));
    };

    // Helper function for updating security settings
    const updateSecuritySetting = (settingKey) => (value) => {
        setForm((s) => ({
            ...s,
            security: {
                ...s.security,
                [settingKey]: value,
            },
        }));
    };

    // Keep the form's security.twoFactorStatus in sync with UI state
    useEffect(() => {
        setForm((s) => ({
            ...s,
            security: {
                ...s.security,
                twoFactorStatus: twoFAEnabled ? 'enabled' : (twoFASetupMode === 'verify' ? 'pending' : 'disabled'),
            },
        }));
    }, [twoFAEnabled, twoFASetupMode]);

    // Enforce eNPS anonymity policy (anonymous-only)
    useEffect(() => {
        setForm((s) => {
            const allowAnon = true;
            const showIndividuals = false;
            if (
                s.enpsPrivacySettings?.allowAnonymousScoring === allowAnon &&
                s.enpsPrivacySettings?.showIndividualScores === showIndividuals
            ) {
                return s;
            }
            return {
                ...s,
                enpsPrivacySettings: {
                    ...s.enpsPrivacySettings,
                    allowAnonymousScoring: allowAnon,
                    showIndividualScores: showIndividuals,
                },
            };
        });
    }, []);

    // Mock login history data
    const mockLoginHistory = [
        { id: 1, device: "Windows PC - Chrome", location: "New York, US", ip: "192.168.1.100", loginTime: "2024-12-01 09:15:23", current: true },
        { id: 2, device: "iPhone - Safari", location: "New York, US", ip: "192.168.1.101", loginTime: "2024-11-30 18:45:12", current: false },
        { id: 3, device: "MacBook - Safari", location: "Chicago, US", ip: "10.0.1.50", loginTime: "2024-11-29 14:22:35", current: false },
        { id: 4, device: "Android - Chrome", location: "Los Angeles, US", ip: "172.16.0.25", loginTime: "2024-11-28 11:33:47", current: false },
    ];

    // State for login history and logout modal
    const [loginHistory, setLoginHistory] = useState(mockLoginHistory);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const revokeSession = (id) => {
        setLoginHistory((list) => list.filter((s) => s.id !== id || s.current));
    };

    // Function to handle logging out of all sessions (triggered by modal confirm)
    const handleLogoutAllSessions = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            updateSecuritySetting("sessionsToLogOut")(true);
            // Optionally keep only the current session in history
            setLoginHistory((list) => list.filter((s) => s.current));
        } catch (error) {
            console.error("Failed to logout all sessions:", error);
        } finally {
            setIsLoading(false);
            setShowLogoutModal(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!form.email.trim()) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Email is invalid";

        if (form.phone && !/^\+?[\d\s\-\(\)]+$/.test(form.phone)) {
            newErrors.phone = "Phone number is invalid";
        }

        // Password validation
        if (form.newPw) {
            if (!form.oldPw) newErrors.oldPw = "Current password is required";
            if (form.newPw.length < 8) newErrors.newPw = "Password must be at least 8 characters";
            if (form.newPw !== form.confirmPw) newErrors.confirmPw = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Profile updated:", form);
            setAccountSaved(true);
            setTimeout(() => setAccountSaved(false), 2000);
        } catch (error) {
            console.error("Update failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                // 5MB limit
                setErrors((prev) => ({ ...prev, avatar: "File size must be less than 5MB" }));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarOriginal(e.target.result);
                setAvatarPreview(e.target.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
            setErrors((prev) => ({ ...prev, avatar: null }));
        }
    };

    // Simple center-square crop with zoom
    const applyCrop = () => {
        try {
            const img = cropImgRef.current;
            if (!img) return setShowCropper(false);
            const canvas = document.createElement('canvas');
            const target = 256;
            canvas.width = target;
            canvas.height = target;
            const ctx = canvas.getContext('2d');
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const base = Math.min(w, h);
            const zoom = Math.max(1, Math.min(4, Number(cropZoom) || 1));
            const cropSize = base / zoom;
            const sx = (w - cropSize) / 2;
            const sy = (h - cropSize) / 2;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, target, target);
            const dataUrl = canvas.toDataURL('image/png');
            setAvatarPreview(dataUrl);
        } finally {
            setShowCropper(false);
        }
    };

    // Enhanced Toggle Component
    const Toggle = ({ checked, onChange }) => (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
            className={
                "relative inline-flex h-5 w-10 items-center rounded-full transition-colors " +
                (checked ? "bg-green-600" : "bg-gray-300")
            }
        >
            <span
                className={
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition " +
                    (checked ? "translate-x-5" : "translate-x-1")
                }
            />
        </button>
    );

    // Enhanced Eye Icon Component
    const Eye = ({ open }) => (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor">
            {open ? (
                <path
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.1 12S5.5 5 12 5s9.9 7 9.9 7-3.4 7-9.9 7S2.1 12 2.1 12Zm9.9 3.25A3.25 3.25 0 1 1 15.25 12 3.25 3.25 0 0 1 12 15.25Z"
                />
            ) : (
                <>
                    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    <path
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.9 12S17.5 5 11 5a10 10 0 0 0-4.6 1.1M3.1 12S6.5 19 13 19a10 10 0 0 0 4.6-1.1"
                    />
                </>
            )}
        </svg>
    );

    // Enhanced Password Field Component
    const PasswordField = ({ value, onChange, placeholder, open, toggle, error }) => (
        <div className="relative">
            <input
                type={open ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete="off"
                className={`h-10 w-full rounded border px-3 pr-10 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                    error ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"
                }`}
            />
            <button
                type="button"
                onClick={toggle}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                aria-label="Toggle password"
            >
                <Eye open={open} />
            </button>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );

    // Enhanced Field Component
    const Field = ({ label, children, error }) => (
        <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">{label}</span>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </label>
    );

    // Enhanced Section Component
    const Section = ({ title, children }) => (
        <section className="mt-5 border-t border-gray-200 pt-5">
            <h2 className="mb-3 text-[15px] font-semibold text-gray-800">{title}</h2>
            {children}
        </section>
    );

    return (
        <div className="min-h-screen bg-[#EDEDED] px-2 py-4 sm:px-4 sm:py-6">
            <div className="flex gap-[5mm]">
                <Sidebar />
                <main className="flex-1">
                    <div className="mx-auto max-w-5xl rounded-lg bg-white p-3 shadow-sm sm:p-4">
                        <h1 className="mb-3 text-lg font-semibold text-gray-600 sm:text-xl">Profile Settings</h1>

                        <div className="grid gap-4 lg:grid-cols-[200px_auto]">
                            {/* Left tabs - horizontal on mobile, vertical on desktop */}
                            <nav className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-[13px]">
                                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1 lg:gap-0">
                                    {["Account", "Security", "Preferences", "Integrations", "Privacy", "Teams & Members"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setActiveTab(t)}
                                            className={
                                                "rounded px-2 py-2 text-left text-xs sm:text-[13px] lg:mb-1 lg:w-full lg:px-3 " +
                                                (activeTab === t
                                                    ? "bg-white text-blue-700 shadow-inner"
                                                    : "hover:bg-white hover:text-gray-800")
                                            }
                                        >
                                            <span className="block truncate">{t}</span>
                                        </button>
                                    ))}
                                </div>
                            </nav>

                            {/* Main content */}
                            <div className="rounded border border-gray-300 bg-[#F7F7F7] p-3 sm:p-4">
                                {activeTab === "Account" && (
                                    <form onSubmit={handleSubmit}>
                                        {/* Top: avatar + core fields - responsive layout */}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[80px_1fr] lg:grid-cols-[64px_1fr]">
                                            {/* Avatar */}
                                            <div className="flex flex-col items-center justify-center sm:items-start">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-300 text-2xl text-white overflow-hidden sm:h-14 sm:w-14">
                                                    {avatarPreview ? (
                                                        <img
                                                            src={avatarPreview}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span>👤</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => fileRef.current?.click()}
                                                    className="mt-2 w-20 rounded border border-gray-400 bg-white py-1 text-[11px] hover:bg-gray-50 sm:w-[88px] sm:text-[12px]"
                                                >
                                                    ↓ Upload
                                                </button>
                                                {avatarOriginal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCropper(true)}
                                                        className="mt-2 w-20 rounded border border-blue-500 text-blue-700 bg-white py-1 text-[11px] hover:bg-blue-50 sm:w-[88px] sm:text-[12px]"
                                                    >
                                                        ✂ Crop
                                                    </button>
                                                )}
                                                <input
                                                    ref={fileRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleAvatarChange}
                                                    className="hidden"
                                                />
                                                {errors.avatar && (
                                                    <p className="text-xs text-red-600 mt-1 text-center sm:text-left">
                                                        {errors.avatar}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Name / Email / Phone with icons */}
                                            <div className="grid grid-cols-1 gap-3 sm:gap-2">
                                                <Field label="Name" error={errors.name}>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                                                        <input
                                                            value={form.name}
                                                            onChange={upd("name")}
                                                            placeholder="Name"
                                                            autoComplete="off"
                                                            className={`h-10 w-full rounded border pl-7 pr-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                                                                errors.name ? "border-red-500 bg-red-50" : "border-gray-400 bg-white"
                                                            }`}
                                                        />
                                                    </div>
                                                </Field>
                                                <Field label="Email" error={errors.email}>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">✉️</span>
                                                        <input
                                                            type="email"
                                                            value={form.email}
                                                            onChange={upd("email")}
                                                            placeholder="Email"
                                                            autoComplete="off"
                                                            className={`h-10 w-full rounded border pl-7 pr-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                                                                errors.email ? "border-red-500 bg-red-50" : "border-gray-400 bg-white"
                                                            }`}
                                                        />
                                                    </div>
                                                </Field>
                                                <Field label="Phone Number" error={errors.phone}>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">📞</span>
                                                        <input
                                                            type="tel"
                                                            value={form.phone}
                                                            onChange={upd("phone")}
                                                            placeholder="Phone Number"
                                                            autoComplete="off"
                                                            className={`h-10 w-full rounded border pl-7 pr-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                                                                errors.phone ? "border-red-500 bg-red-50" : "border-gray-400 bg-white"
                                                            }`}
                                                        />
                                                    </div>
                                                </Field>
                                            </div>
                                            </div>
                                            {/* End core fields */}

                                        {/* Professional Details */}
                                        <Section title="Professional Details">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <Field label="Job Title">
                                                    <input value={form.jobTitle} onChange={upd("jobTitle")} placeholder="e.g., Product Manager" className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9" />
                                                </Field>
                                                <Field label="Department">
                                                    <input value={form.department} onChange={upd("department")} placeholder="e.g., Growth" className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9" />
                                                </Field>
                                                <Field label="Manager">
                                                    <input value={form.manager} onChange={upd("manager")} placeholder="Manager name" className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9" />
                                                </Field>
                                            </div>
                                        </Section>

                                        {/* About Me / Skills */}
                                        <Section title="About Me & Skills">
                                            <div className="space-y-3">
                                                <Field label="About Me / Bio">
                                                    <textarea value={form.bio} onChange={upd("bio")} placeholder="Tell us a bit about yourself..." rows={4} className="w-full rounded border border-gray-400 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                                </Field>
                                                <Field label="Skills (comma or Enter to add)">
                                                    <div className="flex flex-wrap gap-2">
                                                        {form.skills.map((s, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                                                                {s}
                                                                <button type="button" className="text-blue-700" onClick={() => setForm((st) => ({ ...st, skills: st.skills.filter((_, i) => i !== idx) }))}>×</button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <input
                                                        value={skillsInput}
                                                        onChange={(e) => setSkillsInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ',') {
                                                                e.preventDefault();
                                                                const val = skillsInput.trim().replace(/,$/, '');
                                                                if (!val) return;
                                                                setForm((st) => ({ ...st, skills: Array.from(new Set([...(st.skills || []), val])) }));
                                                                setSkillsInput("");
                                                            }
                                                        }}
                                                        placeholder="Type a skill and press Enter"
                                                        className="mt-2 h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    />
                                                </Field>
                                            </div>
                                        </Section>

                                        {/* Team Assignment (quick edit) */}
                                        <Section title="Team Assignment">
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <Field label="Main Team">
                                                        <input
                                                            value={form.teams?.mainTeam?.name || ''}
                                                            onChange={(e) => setForm((s) => ({
                                                                ...s,
                                                                teams: { ...s.teams, mainTeam: { ...(s.teams?.mainTeam || {}), name: e.target.value } }
                                                            }))}
                                                            placeholder="Your primary team"
                                                            className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                        />
                                                    </Field>
                                                    <Field label="Add Other Team">
                                                        <div className="flex gap-2">
                                                            <input id="addOtherTeam" placeholder="Team name" className="flex-1 h-10 rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9" />
                                                            <button type="button" className="px-3 rounded bg-green-600 text-white text-sm" onClick={() => {
                                                                const el = document.getElementById('addOtherTeam');
                                                                const name = el?.value?.trim();
                                                                if (!name) return;
                                                                setForm((s) => ({
                                                                    ...s,
                                                                    teams: { ...s.teams, otherTeams: [...(s.teams?.otherTeams || []), { name, role: 'Contributor', members: 0 }] }
                                                                }));
                                                                if (el) el.value = '';
                                                            }}>Add</button>
                                                        </div>
                                                    </Field>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600 mb-1">Other Teams</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(form.teams?.otherTeams || []).map((t, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 border">
                                                                {t.name}
                                                                <button type="button" className="text-gray-600" onClick={() => setForm((s) => ({
                                                                    ...s,
                                                                    teams: { ...s.teams, otherTeams: (s.teams?.otherTeams || []).filter((_, i) => i !== idx) }
                                                                }))}>×</button>
                                                            </span>
                                                        ))}
                                                        {!(form.teams?.otherTeams || []).length && (
                                                            <span className="text-xs text-gray-500">No other teams yet.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        {/* Change Password */}
                                        <Section title="Change Password">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <Field label="Current Password" error={errors.oldPw}>
                                                    <PasswordField value={form.oldPw} onChange={upd('oldPw')} placeholder="Current password" open={showPw.old} toggle={() => setShowPw((s) => ({ ...s, old: !s.old }))} error={errors.oldPw} />
                                                </Field>
                                                <Field label="New Password" error={errors.newPw}>
                                                    <PasswordField value={form.newPw} onChange={upd('newPw')} placeholder="New password" open={showPw.new1} toggle={() => setShowPw((s) => ({ ...s, new1: !s.new1 }))} error={errors.newPw} />
                                                </Field>
                                                <Field label="Confirm Password" error={errors.confirmPw}>
                                                    <PasswordField value={form.confirmPw} onChange={upd('confirmPw')} placeholder="Confirm password" open={showPw.new2} toggle={() => setShowPw((s) => ({ ...s, new2: !s.new2 }))} error={errors.confirmPw} />
                                                </Field>
                                            </div>
                                            <div className="flex justify-end mt-3">
                                                <button type="button" className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={async () => {
                                                    const errs = {};
                                                    if (!form.oldPw) errs.oldPw = 'Current password is required';
                                                    if (!form.newPw || form.newPw.length < 8) errs.newPw = 'Minimum 8 characters';
                                                    if (form.newPw !== form.confirmPw) errs.confirmPw = 'Passwords do not match';
                                                    setErrors((e) => ({ ...e, ...errs }));
                                                    if (Object.keys(errs).length) return;
                                                    setIsLoading(true);
                                                    await new Promise(r => setTimeout(r, 800));
                                                    setIsLoading(false);
                                                    setPasswordSaved(true);
                                                    setTimeout(() => setPasswordSaved(false), 2000);
                                                }}>Update Password</button>
                                            </div>
                                            {passwordSaved && <div className="mt-2 rounded border border-green-300 bg-green-50 text-green-800 text-xs px-3 py-2">Password updated.</div>}
                                        </Section>

                                        {/* Change Email */}
                                        <Section title="Change Email">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Field label="Current Email" error={errors.oldEmail}>
                                                    <input type="email" value={form.oldEmail} onChange={upd("oldEmail")} placeholder="Current email" className={`h-10 w-full rounded border px-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${errors.oldEmail ? 'border-red-500 bg-red-50' : 'border-gray-400 bg-white'}`} />
                                                </Field>
                                                <Field label="New Email" error={errors.newEmail}>
                                                    <input type="email" value={form.newEmail} onChange={upd("newEmail")} placeholder="New email" className={`h-10 w-full rounded border px-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${errors.newEmail ? 'border-red-500 bg-red-50' : 'border-gray-400 bg-white'}`} />
                                                </Field>
                                            </div>
                                            <div className="flex justify-end mt-3">
                                                <button type="button" className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={async () => {
                                                    const errs = {};
                                                    if (!form.oldEmail) errs.oldEmail = 'Current email is required';
                                                    if (!form.newEmail) errs.newEmail = 'New email is required';
                                                    else if (!/\S+@\S+\.\S+/.test(form.newEmail)) errs.newEmail = 'Email is invalid';
                                                    setErrors((e) => ({ ...e, ...errs }));
                                                    if (Object.keys(errs).length) return;
                                                    setIsLoading(true);
                                                    await new Promise(r => setTimeout(r, 800));
                                                    setIsLoading(false);
                                                    setEmailSaved(true);
                                                    setTimeout(() => setEmailSaved(false), 2000);
                                                }}>Update Email</button>
                                            </div>
                                            {emailSaved && <div className="mt-2 rounded border border-green-300 bg-green-50 text-green-800 text-xs px-3 py-2">Email updated.</div>}
                                        </Section>

                                        <div className="flex justify-end mt-4">
                                            <button type="submit" className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" disabled={isLoading}>
                                                {isLoading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                        {accountSaved && (
                                            <div className="mt-2 rounded border border-green-300 bg-green-50 text-green-800 text-xs px-3 py-2">Account details saved.</div>
                                        )}
                                    </form>
                                )}

                                {activeTab === "Preferences" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            PREFERENCES
                                        </div>

                                        <Section title="Regional Settings">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                <Field label="Time Zone">
                                                    <select
                                                        value={form.tz}
                                                        onChange={upd("tz")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        {timezones.map((t) => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Language">
                                                    <select
                                                        value={form.lang}
                                                        onChange={upd("lang")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        {languages.map((lang) => (
                                                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Date Format">
                                                    <select
                                                        value={form.dateFormat}
                                                        onChange={upd("dateFormat")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                                    </select>
                                                </Field>
                                                <Field label="Time Format">
                                                    <select
                                                        value={form.timeFormat}
                                                        onChange={upd("timeFormat")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        <option value="12h">12-hour</option>
                                                        <option value="24h">24-hour</option>
                                                    </select>
                                                </Field>
                                            </div>
                                        </Section>

                                        {/* Work Schedule */}
                                        <Section title="Work Schedule">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Field label="Start Time">
                                                    <input
                                                        type="time"
                                                        value={form.start}
                                                        onChange={upd("start")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    />
                                                </Field>
                                                <Field label="End Time">
                                                    <input
                                                        type="time"
                                                        value={form.end}
                                                        onChange={upd("end")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    />
                                                </Field>
                                            </div>
                                        </Section>

                                        {/* Save button moved here under Work Schedule */}
                                        <div className="flex justify-end">
                                            <button type="button" onClick={savePreferences} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
                                                Save Preferences
                                            </button>
                                        </div>

                                        {/* Notification Settings */}
                                        <Section title="Notification Settings">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">In-app notifications</div>
                                                        <div className="text-xs text-gray-500">Show alerts inside the app</div>
                                                    </div>
                                                    <Toggle checked={form.notifications.inApp} onChange={updateNotificationSetting("inApp")} />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">Email notifications</div>
                                                        <div className="text-xs text-gray-500">Receive updates via email</div>
                                                    </div>
                                                    <Toggle checked={form.notifications.email} onChange={updateNotificationSetting("email")} />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">Push notifications</div>
                                                        <div className="text-xs text-gray-500">Mobile and desktop push alerts</div>
                                                    </div>
                                                    <Toggle checked={form.notifications.push} onChange={updateNotificationSetting("push")} />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">Weekly reports</div>
                                                        <div className="text-xs text-gray-500">Summary reports every week</div>
                                                    </div>
                                                    <Toggle checked={form.notifications.weeklyReports} onChange={updateNotificationSetting("weeklyReports")} />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-700">Daily reports</div>
                                                        <div className="text-xs text-gray-500">Summary reports every day</div>
                                                    </div>
                                                    <Toggle checked={form.notifications.dailyReports} onChange={updateNotificationSetting("dailyReports")} />
                                                </div>
                                            </div>
                                        </Section>

                                        {/* Dashboard Preferences removed */}
                                    </div>
                                )}

                                {activeTab === "Integrations" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            INTEGRATIONS
                                        </div>

                                        {/* helper to render a provider card */}
                                        {(() => {
                                            const Card = ({ logo, title, color, desc, provider }) => {
                                                const data = integrations[provider] || {};
                                                const connected = !!data.connected;
                                                const badgeCls = connected ? "bg-green-600 text-white" : "bg-gray-300 text-gray-800";
                                                const btnText = connected ? "Revoke" : "Connect";
                                                const btnAction = () => connected ? disconnectIntegration(provider) : connectIntegration(provider);
                                                const btnStyle = connected ? "bg-gray-200 text-gray-900" : `${color} text-white`;
                                                return (
                                                    <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}>
                                                                    {logo}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${badgeCls}`}>
                                                                            {connected ? "Connected" : "Not Connected"}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600">{desc}</p>
                                                                    {connected && (
                                                                        <div className="mt-1 text-[11px] text-gray-600">
                                                                            {data.account?.name} {data.account?.email && `• ${data.account.email}`}
                                                                            {data.lastSynced && (
                                                                                <span className="ml-1 text-gray-500">(Last synced: {formatDate(data.lastSynced)})</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {data.syncing ? (
                                                                    <span className="text-xs text-gray-600">Syncing...</span>
                                                                ) : connected ? (
                                                                    <button className="rounded border px-2 py-1 text-xs" onClick={() => syncIntegration(provider)}>
                                                                        Sync now
                                                                    </button>
                                                                ) : null}
                                                                <button className={`rounded px-3 py-1.5 text-xs font-semibold hover:brightness-95 ${btnStyle}`} onClick={btnAction}>
                                                                    {connected && connectPending === provider ? "Revoking..." : (!connected && connectPending === provider ? "Authorizing..." : btnText)}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            };

                                            return (
                                                <>
                                                    <Section title="Calendars">
                                                        <div className="space-y-3 sm:space-y-4">
                                                            <Card logo="G" title="Google Calendar" color="bg-[#4285F4]" desc="Sync your tasks and events with Google Calendar" provider="google" />
                                                            <Card logo="O" title="Outlook Calendar" color="bg-[#0078D4]" desc="Sync with Microsoft Outlook" provider="outlook" />
                                                            <Card logo="📅" title="Apple Calendar" color="bg-[#EA4335]" desc="Sync with Apple iCloud Calendar" provider="apple" />
                                                        </div>
                                                    </Section>

                                                    {/* Collaboration integrations removed in this version */}

                                                    <Section title="CRM / Storage">
                                                        <div className="space-y-3 sm:space-y-4">
                                                            <Card logo="Z" title="Zoho (future-ready)" color="bg-[#FF4F1F]" desc="Prepare for CRM syncing with Zoho" provider="zoho" />
                                                        </div>
                                                    </Section>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {activeTab === "Privacy" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            PRIVACY
                                        </div>
                                        <Section title="Strokes Visibility">
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-600">Control who can see the strokes you give or receive. <span title="Public: anyone in your org can see; Team-only: only members of your teams; Private: only you and admins." className="underline decoration-dotted cursor-help">What does this mean?</span></p>
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    {[
                                                        { value: 'public', label: 'Public' },
                                                        { value: 'team-only', label: 'Team-only' },
                                                        { value: 'private', label: 'Private' },
                                                    ].map(opt => (
                                                        <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                                                            <input
                                                                type="radio"
                                                                name="strokesVisibility"
                                                                value={opt.value}
                                                                checked={form.strokesVisibility === opt.value}
                                                                onChange={(e) => setForm(s => ({ ...s, strokesVisibility: e.target.value }))}
                                                            />
                                                            <span>{opt.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </Section>
                                        <Section title="Activity Feed Visibility">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700">Show my activity in “What’s New”</div>
                                                    <div className="text-xs text-gray-500">If off, your actions won’t appear in the org-wide activity feed.</div>
                                                </div>
                                                <Toggle checked={form.showInActivityFeed} onChange={(v) => setForm(s => ({ ...s, showInActivityFeed: v }))} />
                                            </div>
                                        </Section>

                                        <div className="flex justify-end">
                                            <button type="button" onClick={savePrivacy} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Save Privacy Settings</button>
                                        </div>
                                        {privacySaved && (
                                            <div className="mt-2 rounded border border-green-300 bg-green-50 text-green-800 text-xs px-3 py-2">Privacy settings saved.</div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "Teams & Members" && (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <img 
                                                        src={`${import.meta.env.BASE_URL}team.png`} 
                                                        alt="Team" 
                                                        className="w-8 h-8 object-contain" 
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Teams & Members Management
                                                    </h3>
                                                    <p className="text-sm text-gray-600 max-w-md">
                                                        Manage your teams, invite members, assign leaders, and organize your workspace in the dedicated Teams section.
                                                    </p>
                                                </div>
                                                
                                                <a
                                                    href="#/teams"
                                                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    Go to Teams Section
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "Security" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            SECURITY & SESSIONS
                                        </div>

                                        <Section title="Login History">
                                            <div className="overflow-x-auto border rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Device</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Location</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">IP Address</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Last Login</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                                                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                        {loginHistory.map((session) => (
                                                            <tr key={session.id} className={session.current ? 'bg-green-50' : ''}>
                                                                <td className="px-4 py-2 text-sm text-gray-800">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-lg">
                                                                            {session.device.includes('Windows') ? '💻' : 
                                                                             session.device.includes('iPhone') ? '📱' : 
                                                                             session.device.includes('MacBook') ? '💻' : 
                                                                             session.device.includes('Android') ? '📱' : '🖥️'}
                                                                        </span>
                                                                        <span className="truncate max-w-[200px]" title={session.device}>{session.device}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-gray-700">{session.location}</td>
                                                                <td className="px-4 py-2 text-sm font-mono text-gray-700">{session.ip}</td>
                                                                <td className="px-4 py-2 text-sm text-gray-600">{session.loginTime}</td>
                                                                <td className="px-4 py-2 text-sm">
                                                                    {session.current ? (
                                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-600 text-white">Current</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">Active</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-right">
                                                                    {!session.current && (
                                                                        <button onClick={() => revokeSession(session.id)} className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">
                                                                            Revoke
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Section>

                                        <Section title="Session Management">
                                            <div className="space-y-4">
                                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="text-2xl">⚠️</div>
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-semibold text-orange-800 mb-2">Security Action</h4>
                                                            <p className="text-sm text-orange-700 mb-3">
                                                                Log out of all sessions on all devices. You will need to log in again everywhere.
                                                            </p>
                                                            <button 
                                                                onClick={() => setShowLogoutModal(true)}
                                                                disabled={isLoading}
                                                                className={`px-4 py-2 text-sm rounded transition-colors ${
                                                                    isLoading 
                                                                        ? 'bg-gray-400 cursor-not-allowed text-white' 
                                                                        : 'bg-red-500 hover:bg-red-600 text-white'
                                                                }`}
                                                            >
                                                                {isLoading ? 'Logging Out...' : 'Log Out All Sessions'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Password Management">
                                            <div className="border rounded-lg p-4 bg-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl">🔒</div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-semibold text-gray-800 mb-1">Change Password</h4>
                                                        <p className="text-xs text-gray-600 mb-2">Update your password (current, new, and confirm).</p>
                                                        <button
                                                            onClick={() => { setActiveTab('Account'); setChangeMode('password'); }}
                                                            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                                                        >
                                                            Open Change Password
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Two-Factor Authentication Status">
                                            <div className="space-y-4">
                                                {(() => {
                                                    const pending = twoFASetupMode === 'verify' && !twoFAEnabled;
                                                    const wrapper = twoFAEnabled
                                                        ? 'bg-green-50 border-green-200'
                                                        : pending
                                                            ? 'bg-yellow-50 border-yellow-200'
                                                            : 'bg-red-50 border-red-200';
                                                    const titleColor = twoFAEnabled
                                                        ? 'text-green-800'
                                                        : pending
                                                            ? 'text-yellow-800'
                                                            : 'text-red-800';
                                                    const textColor = twoFAEnabled
                                                        ? 'text-green-700'
                                                        : pending
                                                            ? 'text-yellow-700'
                                                            : 'text-red-700';
                                                    const badge = twoFAEnabled
                                                        ? { text: '2FA Enabled', cls: 'bg-green-600 text-white' }
                                                        : pending
                                                            ? { text: '2FA Pending', cls: 'bg-yellow-600 text-white' }
                                                            : { text: '2FA Disabled', cls: 'bg-red-600 text-white' };
                                                    const pill = twoFAEnabled
                                                        ? { text: 'SECURE', cls: 'bg-green-600 text-white' }
                                                        : pending
                                                            ? { text: 'PENDING SETUP', cls: 'bg-yellow-600 text-white' }
                                                            : { text: 'AT RISK', cls: 'bg-red-600 text-white' };
                                                    return (
                                                        <div className={`border rounded-lg p-4 ${wrapper}`}>
                                                            <div className="flex items-start gap-3">
                                                                <div className="text-2xl">
                                                                    {twoFAEnabled ? '🔐' : pending ? '⏳' : '⚠️'}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className={`text-sm font-semibold mb-2 ${titleColor}`}>
                                                                        Two-Factor Authentication: {twoFAEnabled ? 'ENABLED' : pending ? 'PENDING' : 'DISABLED'}
                                                                    </h4>
                                                                    <p className={`text-sm mb-3 ${textColor}`}>
                                                                        {twoFAEnabled
                                                                            ? 'Your account is protected with two-factor authentication.'
                                                                            : pending
                                                                                ? 'Complete the verification step to finish enabling 2FA.'
                                                                                : 'Enable 2FA to add an extra layer of security to your account.'}
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${badge.cls}`}>
                                                                            {badge.text}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className={`px-3 py-1 text-xs rounded-full font-semibold ${pill.cls}`}>{pill.text}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </Section>

                                        <Section title="Two-Factor Authentication">
                                            <div className="space-y-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Enable 2FA
                                                        </span>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Add an extra layer of security to your account
                                                        </p>
                                                    </div>
                                                    <div className="flex justify-end sm:justify-start">
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
                                                                        // cancel setup
                                                                        setTwoFASetupMode(null);
                                                                        setTwoFASecret(null);
                                                                        setCodeDigits(Array(6).fill(""));
                                                                        setTwoFACodeInput("");
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* 2FA Setup Panel */}
                                                {twoFASetupMode === "verify" && (
                                                    <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                                                            Scan QR & Verify
                                                        </h3>
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                                            <div className="flex-shrink-0">
                                                                <div className="h-28 w-28 rounded bg-gray-100 flex items-center justify-center border">
                                                                    <span className="text-xs text-gray-500">QR Code</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-gray-600 mb-2">
                                                                    Scan the QR code with your authenticator app or enter the secret key manually.
                                                                </p>
                                                                <div className="mb-2 rounded bg-gray-50 p-2 text-sm font-mono">
                                                                    {twoFASecret}
                                                                </div>
                                                                <div className="flex gap-2 mb-3" style={{ overflowAnchor: 'none' }}>
                                                                    {Array.from({ length: 6 }).map((_, i) => (
                                                                        <input
                                                                            key={i}
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            pattern="\\d*"
                                                                            maxLength={1}
                                                                            className="h-10 w-10 text-center rounded border text-sm"
                                                                            style={{ fontSize: 16 }}
                                                                            placeholder="0"
                                                                            autoComplete="one-time-code"
                                                                            value={codeDigits[i]}
                                                                            ref={(el) => (twoFAInputsRef.current[i] = el)}
                                                                            onPaste={(e) => {
                                                                                const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                                                                                if (text.length) {
                                                                                    e.preventDefault();
                                                                                    const next = Array(6).fill('');
                                                                                    for (let j = 0; j < text.length; j++) next[j] = text[j];
                                                                                    setCodeDigits(next);
                                                                                    setTwoFACodeInput(next.join(''));
                                                                                    twoFAInputsRef.current[Math.min(text.length, 5)]?.focus();
                                                                                }
                                                                            }}
                                                                            onChange={(e) => {
                                                                                const v = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                                                setCodeDigits((prev) => {
                                                                                    const next = [...prev];
                                                                                    next[i] = v;
                                                                                    const joined = next.join("");
                                                                                    setTwoFACodeInput(joined);
                                                                                    return next;
                                                                                });
                                                                                if (e.target.value && i < 5) {
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
                                                                <button
                                                                    onClick={verifyTwoFACode}
                                                                    disabled={twoFACodeInput.replace(/\s+/g, '').length !== 6}
                                                                    className={`px-4 py-2 text-white text-sm rounded ${twoFACodeInput.replace(/\s+/g, '').length === 6 ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                                                                >
                                                                    Verify & Enable
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Disable 2FA Panel */}
                                                {twoFADisableMode && twoFAEnabled && (
                                                    <div className="rounded border border-red-200 bg-red-50 p-3 sm:p-4">
                                                        <h3 className="text-sm font-semibold text-red-800 mb-2">
                                                            Disable Two-Factor Authentication
                                                        </h3>
                                                        <p className="text-xs text-red-700 mb-3">
                                                            Enter the 6-digit code from your authenticator app to disable 2FA.
                                                        </p>
                                                        <div className="space-y-3">
                                                            <div className="flex gap-2" style={{ overflowAnchor: 'none' }}>
                                                                {Array.from({ length: 6 }).map((_, i) => (
                                                                        <input
                                                                        key={i}
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="\\d*"
                                                                        maxLength={1}
                                                                            className={`h-10 w-10 text-center rounded border text-sm ${twoFADisableError ? 'border-red-500 bg-red-100' : 'border-red-300 bg-white'}`}
                                                                            style={{ fontSize: 16 }}
                                                                        placeholder="0"
                                                                        autoComplete="one-time-code"
                                                                        value={twoFADisableDigits[i]}
                                                                        ref={(el) => (twoFADisableInputsRef.current[i] = el)}
                                                                        onPaste={(e) => {
                                                                            const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                                                                            if (text.length) {
                                                                                e.preventDefault();
                                                                                const next = Array(6).fill('');
                                                                                for (let j = 0; j < text.length; j++) next[j] = text[j];
                                                                                setTwoFADisableDigits(next);
                                                                                const joined = next.join('');
                                                                                setTwoFADisableCode(joined);
                                                                                twoFADisableInputsRef.current[Math.min(text.length, 5)]?.focus();
                                                                                if (twoFADisableError) setTwoFADisableError(null);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                                            setTwoFADisableDigits((prev) => {
                                                                                const next = [...prev];
                                                                                next[i] = v;
                                                                                const joined = next.join('');
                                                                                setTwoFADisableCode(joined);
                                                                                return next;
                                                                            });
                                                                            if (e.target.value && i < 5) {
                                                                                focusNoScroll(twoFADisableInputsRef.current[i + 1]);
                                                                            }
                                                                            if (twoFADisableError) setTwoFADisableError(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Backspace' && !twoFADisableDigits[i] && i > 0) {
                                                                                focusNoScroll(twoFADisableInputsRef.current[i - 1]);
                                                                            }
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="flex gap-2 sm:justify-end">
                                                                <button
                                                                    type="button"
                                                                    className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300"
                                                                    onClick={() => {
                                                                        setTwoFADisableMode(false);
                                                                        setTwoFADisableCode("");
                                                                        setTwoFADisableError(null);
                                                                        setTwoFADisableDigits(Array(6).fill(""));
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={twoFADisableCode.replace(/\D/g, '').length !== 6}
                                                                    className={`px-3 py-1.5 text-sm rounded text-white ${twoFADisableCode.replace(/\D/g, '').length === 6 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
                                                                    onClick={() => {
                                                                        const ok = verifyDisableCode();
                                                                        if (!ok) {
                                                                            setTwoFADisableError('Invalid code. Please try again.');
                                                                            return;
                                                                        }
                                                                        disableTwoFA();
                                                                        setTwoFADisableMode(false);
                                                                        setTwoFADisableCode("");
                                                                        setTwoFADisableError(null);
                                                                        setTwoFADisableDigits(Array(6).fill(""));
                                                                    }}
                                                                >
                                                                    Disable 2FA
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {twoFADisableError && (
                                                            <p className="mt-2 text-xs text-red-700">{twoFADisableError}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Backup Codes */}
                                                {twoFAEnabled && backupCodes.length > 0 && (
                                                    <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                                                            Backup Codes
                                                        </h3>
                                                        <p className="text-xs text-gray-600 mb-3">
                                                            Save these one-time codes in a safe place. Each code can be used once if you lose device access.
                                                        </p>
                                                        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                            {backupCodes.map((c, i) => (
                                                                <li key={i} className="text-xs font-mono rounded border bg-white px-2 py-1 text-gray-800">
                                                                    {c}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <div className="mt-3 flex gap-2">
                                                            <button type="button" className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300" onClick={downloadBackupCodes}>
                                                                Download Codes
                                                            </button>
                                                            <button type="button" className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" onClick={generateBackupCodes}>
                                                                Regenerate Codes
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {/* Bottom strip - responsive */}
                                <div className="mt-6 grid grid-cols-1 gap-3 rounded-lg border-t border-gray-200 pt-4 sm:mt-8 sm:grid-cols-3 sm:pt-5">
                                    <div className="rounded bg-[#F5F5F5] p-3 text-center">
                                        <h4 className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">
                                            TIME ZONE
                                        </h4>
                                        <p className="text-[10px] text-gray-600 sm:text-[11px]">
                                            {timezones.find((t) => t.value === form.tz)?.label || "Not Set"}
                                        </p>
                                    </div>

                                    <div className="rounded bg-[#F5F5F5] p-3 text-center">
                                        <h4 className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">
                                            REMINDERS & WORK HOURS
                                        </h4>
                                        <p className="text-[10px] text-gray-600 sm:text-[11px]">
                                            {form.start} - {form.end}
                                        </p>
                                    </div>

                                    <div className="rounded bg-[#F5F5F5] p-3 text-center">
                                        <h4 className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">INTEGRATIONS</h4>
                                        {(() => {
                                            const anyCal = integrations.google?.connected || integrations.outlook?.connected || integrations.apple?.connected;
                                            const crm = integrations.zoho?.connected;
                                            if (anyCal && crm) return <p className="text-[10px] text-gray-600 sm:text-[11px]">Calendars & CRM connected</p>;
                                            if (anyCal) return <p className="text-[10px] text-gray-600 sm:text-[11px]">Calendars connected</p>;
                                            if (crm) return <p className="text-[10px] text-gray-600 sm:text-[11px]">CRM connected</p>;
                                            return <p className="text-[10px] text-gray-600 sm:text-[11px]">Not Connected</p>;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">🔒</div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-800 mb-1">Log out of all sessions?</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    You will be signed out on all devices and will need to log in again everywhere.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
                                        onClick={() => setShowLogoutModal(false)}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm rounded text-white ${isLoading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                                        onClick={handleLogoutAllSessions}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Logging Out...' : 'Log Out All Sessions'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}