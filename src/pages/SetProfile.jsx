import React, { useMemo, useRef, useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("Account");
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [changeMode, setChangeMode] = useState(null); // 'password' | 'email' | null
    const fileRef = useRef(null);

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

    // ---------------- Teams & Members UI state (local only) ----------------
    const [teamsSearch, setTeamsSearch] = useState("");
    const [joinMenuOpen, setJoinMenuOpen] = useState(false);
    const [joinMenuFilter, setJoinMenuFilter] = useState("");
    const [draggingMember, setDraggingMember] = useState(null); // { memberId, fromTeamId }
    const [teamsUI, setTeamsUI] = useState({ mainTeam: null, otherTeams: [] });

    const mkId = () => Math.random().toString(36).slice(2, 9);

    // Build local teams state from form once available
    useEffect(() => {
        try {
            const seedMembers = (count = 3) =>
                Array.from({ length: count }).map((_, i) => ({ id: mkId(), name: `Member ${i + 1}`, role: "Member" }));
        const main = form?.teams?.mainTeam
                ? {
                      id: "main",
                      name: form.teams.mainTeam.name,
                      leaderId: null,
                members: [{ id: mkId(), name: "You", role: "Leader" }, ...seedMembers(2)],
                invites: [],
                joinRequests: [],
                  }
                : null;
            const others = (form?.teams?.otherTeams || []).map((t, idx) => ({
                id: `${t.name.toLowerCase().replace(/\s+/g, "-")}-${idx}`,
                name: t.name,
                leaderId: null,
            members: seedMembers(3),
            invites: [],
            joinRequests: [],
            }));
            setTeamsUI({ mainTeam: main, otherTeams: others });
        } catch (e) {
            // keep defaults
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setLeader = (teamId, memberId) => {
        setTeamsUI((s) => {
            const upd = (t) => (t && t.id === teamId ? { ...t, leaderId: memberId } : t);
            return {
                mainTeam: s.mainTeam && s.mainTeam.id === teamId ? { ...s.mainTeam, leaderId: memberId } : s.mainTeam,
                otherTeams: s.otherTeams.map(upd),
            };
        });
    };

    const addMember = (teamId, name) => {
        if (!name?.trim()) return;
        const newM = { id: mkId(), name: name.trim(), role: "Member" };
        setTeamsUI((s) => {
            const addTo = (t) => (t && t.id === teamId ? { ...t, members: [...t.members, newM] } : t);
            return {
                mainTeam: s.mainTeam && s.mainTeam.id === teamId ? { ...s.mainTeam, members: [...s.mainTeam.members, newM] } : s.mainTeam,
                otherTeams: s.otherTeams.map(addTo),
            };
        });
    };

    const removeMember = (teamId, memberId) => {
        setTeamsUI((s) => {
            const rem = (t) => {
                if (!t || t.id !== teamId) return t;
                // Prevent removing the last remaining member
                if ((t.members || []).length <= 1) return t;
                const member = t.members.find((m) => m.id === memberId);
                // Prevent removing "You" from main team (demo safeguard)
                if (t.id === 'main' && member && member.name === 'You') return t;
                const nextMembers = t.members.filter((m) => m.id !== memberId);
                const nextLeaderId = t.leaderId === memberId ? null : t.leaderId;
                return { ...t, members: nextMembers, leaderId: nextLeaderId };
            };
            return { mainTeam: rem(s.mainTeam), otherTeams: s.otherTeams.map(rem) };
        });
    };

    const moveMember = (fromTeamId, toTeamId, memberId) => {
        if (!toTeamId || fromTeamId === toTeamId) return;
        setTeamsUI((s) => {
            let moving = null;
            const take = (t) => {
                if (!t || t.id !== fromTeamId) return t;
                const idx = t.members.findIndex((m) => m.id === memberId);
                if (idx >= 0) {
                    moving = t.members[idx];
                    return { ...t, members: t.members.filter((m) => m.id !== memberId) };
                }
                return t;
            };
            const give = (t) => (t && t.id === toTeamId && moving ? { ...t, members: [...t.members, moving] } : t);
            const afterTake = { mainTeam: take(s.mainTeam), otherTeams: s.otherTeams.map(take) };
            return { mainTeam: give(afterTake.mainTeam), otherTeams: afterTake.otherTeams.map(give) };
        });
    };

    const createTeam = (name) => {
        if (!canCreateTeams) return;
        const raw = name?.trim();
        if (!raw) return;
        setTeamsUI((s) => {
            const banned = /^new team$/i;
            const base = banned.test(raw) ? "Team" : raw;
            let finalName = base;
            const exists = (n) => (s.otherTeams || []).some((t) => t.name.toLowerCase() === n.toLowerCase());
            let i = 2;
            while (exists(finalName)) finalName = `${base} ${i++}`;
            const newTeam = { id: mkId(), name: finalName, leaderId: null, members: [], invites: [], joinRequests: [] };
            return { ...s, otherTeams: [...s.otherTeams, newTeam] };
        });
    };

    const renameTeam = (teamId, name) => {
        if (!name?.trim()) return;
        setTeamsUI((s) => {
            const rn = (t) => (t && t.id === teamId ? { ...t, name: name.trim() } : t);
            return { mainTeam: rn(s.mainTeam), otherTeams: s.otherTeams.map(rn) };
        });
    };

    // Invite members (local demo only)
    const sendInvite = (teamId, emailOrName) => {
        const val = (emailOrName || "").trim();
        if (!val) return;
        const invite = { id: mkId(), contact: val, status: "Pending", invitedAt: new Date().toISOString() };
        setTeamsUI((s) => {
            const add = (t) => (t && t.id === teamId ? { ...t, invites: [...(t.invites || []), invite] } : t);
            return { mainTeam: add(s.mainTeam), otherTeams: s.otherTeams.map(add) };
        });
    };

    const cancelInvite = (teamId, inviteId) => {
        setTeamsUI((s) => {
            const rem = (t) => (t && t.id === teamId ? { ...t, invites: (t.invites || []).filter((i) => i.id !== inviteId) } : t);
            return { mainTeam: rem(s.mainTeam), otherTeams: s.otherTeams.map(rem) };
        });
    };

    // Ask to join team (local demo only)
    const requestJoin = (teamId) => {
        setTeamsUI((s) => {
            const upd = (t) => {
                if (!t || t.id !== teamId) return t;
                // If already a member, skip
                if ((t.members || []).some((m) => m.name === 'You')) return t;
                const jr = t.joinRequests || [];
                // If already requested, skip
                if (jr.some((r) => r.user === 'You' && r.status === 'Pending')) return t;
                const req = { id: mkId(), user: 'You', status: 'Pending', requestedAt: new Date().toISOString() };
                return { ...t, joinRequests: [...jr, req] };
            };
            return { mainTeam: upd(s.mainTeam), otherTeams: s.otherTeams.map(upd) };
        });
    };

    const cancelJoinRequest = (teamId, requestId) => {
        setTeamsUI((s) => {
            const upd = (t) => (t && t.id === teamId ? { ...t, joinRequests: (t.joinRequests || []).filter((r) => r.id !== requestId) } : t);
            return { mainTeam: upd(s.mainTeam), otherTeams: s.otherTeams.map(upd) };
        });
    };

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
                      google: { connected: false, account: null },
                      outlook: { connected: false, account: null },
                      apple: { connected: false, account: null },
                      slack: { connected: false, account: null },
                      discord: { connected: false, account: null },
                      email: { connected: false, account: null },
                  };
        } catch (e) {
            return {
                google: { connected: false, account: null },
                outlook: { connected: false, account: null },
                apple: { connected: false, account: null },
                slack: { connected: false, account: null },
                discord: { connected: false, account: null },
                email: { connected: false, account: null },
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
        tz: "America/Los_Angeles",
        lang: "en",
        start: "09:00",
        end: "17:00",
        notifications: true,
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
            // Show success message
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
            reader.onload = (e) => setAvatarPreview(e.target.result);
            reader.readAsDataURL(file);
            setErrors((prev) => ({ ...prev, avatar: null }));
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

                                            {/* Name / Email / Phone */}
                                            <div className="grid grid-cols-1 gap-3 sm:gap-2">
                                                <Field label="Name" error={errors.name}>
                                                    <input
                                                        value={form.name}
                                                        onChange={upd("name")}
                                                        placeholder="Name"
                                                        autoComplete="off"
                                                        className={`h-10 w-full rounded border px-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                                                            errors.name
                                                                ? "border-red-500 bg-red-50"
                                                                : "border-gray-400 bg-white"
                                                        }`}
                                                    />
                                                </Field>
                                                <Field label="Email" error={errors.email}>
                                                    <input
                                                        type="email"
                                                        value={form.email}
                                                        onChange={upd("email")}
                                                        placeholder="Email"
                                                        autoComplete="off"
                                                        className={`h-10 w-full rounded border px-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                                                            errors.email
                                                                ? "border-red-500 bg-red-50"
                                                                : "border-gray-400 bg-white"
                                                        }`}
                                                    />
                                                </Field>
                                                <Field label="Phone Number" error={errors.phone}>
                                                    <input
                                                        type="tel"
                                                        value={form.phone}
                                                        onChange={upd("phone")}
                                                        placeholder="Phone Number"
                                                        autoComplete="off"
                                                        className={`h-10 w-full rounded border px-3 text-sm outline-none focus:border-blue-500 sm:h-9 ${
                                                            errors.phone
                                                                ? "border-red-500 bg-red-50"
                                                                : "border-gray-400 bg-white"
                                                        }`}
                                                    />
                                                </Field>
                                            </div>
                                        </div>

                                        {/* Dynamic Change Section */}
                                        <Section title="Security & Account Changes">
                                            {!changeMode ? (
                                                // Selection buttons when no mode is active
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setChangeMode("password")}
                                                        className="flex items-center justify-center gap-2 rounded border-2 border-gray-300 bg-white py-3 px-4 text-sm font-medium text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                            />
                                                        </svg>
                                                        Change Password
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChangeMode("email")}
                                                        className="flex items-center justify-center gap-2 rounded border-2 border-gray-300 bg-white py-3 px-4 text-sm font-medium text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                                                            />
                                                        </svg>
                                                        Change Email
                                                    </button>
                                                </div>
                                            ) : changeMode === "password" ? (
                                                // Password change form
                                                <div>
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h3 className="text-sm font-semibold text-gray-800">
                                                            Change Password
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            onClick={() => setChangeMode(null)}
                                                            className="text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            ← Back to options
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:gap-2">
                                                        <Field label="Current Password" error={errors.oldPw}>
                                                            <PasswordField
                                                                value={form.oldPw}
                                                                onChange={upd("oldPw")}
                                                                placeholder="Current Password"
                                                                open={showPw.old}
                                                                toggle={() => setShowPw((s) => ({ ...s, old: !s.old }))}
                                                                error={errors.oldPw}
                                                            />
                                                        </Field>
                                                        <Field label="New Password" error={errors.newPw}>
                                                            <PasswordField
                                                                value={form.newPw}
                                                                onChange={upd("newPw")}
                                                                placeholder="New Password"
                                                                open={showPw.new1}
                                                                toggle={() =>
                                                                    setShowPw((s) => ({ ...s, new1: !s.new1 }))
                                                                }
                                                                error={errors.newPw}
                                                            />
                                                        </Field>
                                                        <Field label="Confirm New Password" error={errors.confirmPw}>
                                                            <PasswordField
                                                                value={form.confirmPw}
                                                                onChange={upd("confirmPw")}
                                                                placeholder="Confirm New Password"
                                                                open={showPw.new2}
                                                                toggle={() =>
                                                                    setShowPw((s) => ({ ...s, new2: !s.new2 }))
                                                                }
                                                                error={errors.confirmPw}
                                                            />
                                                        </Field>
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={isLoading}
                                                        className={`mt-3 w-full rounded bg-[#00E676] py-2.5 text-[13px] font-semibold text-white transition-all sm:py-2 sm:text-[14px] ${
                                                            isLoading
                                                                ? "opacity-50 cursor-not-allowed"
                                                                : "hover:brightness-95"
                                                        }`}
                                                    >
                                                        {isLoading ? "Updating Password..." : "Update Password"}
                                                    </button>
                                                </div>
                                            ) : (
                                                // Email change form
                                                <div>
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h3 className="text-sm font-semibold text-gray-800">
                                                            Change Email Address
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            onClick={() => setChangeMode(null)}
                                                            className="text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            ← Back to options
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:gap-2">
                                                        <Field label="New Email Address">
                                                            <input
                                                                type="email"
                                                                value={form.newEmail}
                                                                onChange={upd("newEmail")}
                                                                placeholder="Enter your new email address"
                                                                autoComplete="off"
                                                                className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                            />
                                                        </Field>
                                                        <div className="rounded bg-blue-50 p-3 text-xs text-blue-700">
                                                            <p>
                                                                <strong>Note:</strong> You will receive a verification
                                                                email at your new address. Click the link in that email
                                                                to complete the change.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="mt-3 w-full rounded bg-[#00E676] py-2.5 text-[13px] font-semibold text-white transition-all hover:brightness-95 sm:py-2 sm:text-[14px]"
                                                    >
                                                        Send Verification Email
                                                    </button>
                                                </div>
                                            )}
                                        </Section>
                                    </form>
                                )}

                                {activeTab === "Preferences" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            USER PREFERENCES
                                        </div>

                                        <Section title="Regional Settings">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Field label="Time Zone">
                                                    <select
                                                        value={form.tz}
                                                        onChange={upd("tz")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        {timezones.map((tz) => (
                                                            <option key={tz.value} value={tz.value}>
                                                                {tz.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Language">
                                                    <select
                                                        value={form.lang}
                                                        onChange={upd("lang")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        {languages.map((l) => (
                                                            <option key={l.code} value={l.code}>
                                                                {l.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </Field>
                                            </div>
                                        </Section>

                                        <Section title="Work Schedule">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Field label="Work Hours (Start)">
                                                    <input
                                                        type="time"
                                                        value={form.start}
                                                        onChange={upd("start")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    />
                                                </Field>
                                                <Field label="Work Hours (End)">
                                                    <input
                                                        type="time"
                                                        value={form.end}
                                                        onChange={upd("end")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    />
                                                </Field>
                                            </div>
                                        </Section>

                                        <Section title="Notification Settings">
                                            <div className="space-y-4 sm:space-y-3">
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-sm text-gray-700">General Notifications</span>
                                                    <Toggle
                                                        checked={form.notifications}
                                                        onChange={(checked) =>
                                                            setForm((s) => ({ ...s, notifications: checked }))
                                                        }
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-sm text-gray-700">Email Notifications</span>
                                                    <Toggle checked={true} onChange={() => {}} />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-sm text-gray-700">Push Notifications</span>
                                                    <Toggle checked={false} onChange={() => {}} />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-sm text-gray-700">Weekly Reports</span>
                                                    <Toggle checked={true} onChange={() => {}} />
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Display Settings">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Field label="Theme">
                                                    <select 
                                                        value={form.dashboardTheme}
                                                        onChange={upd("dashboardTheme")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        <option value="light">Light</option>
                                                        <option value="dark">Dark</option>
                                                        <option value="auto">Auto</option>
                                                    </select>
                                                </Field>
                                                <Field label="Language">
                                                    <select 
                                                        value={form.lang}
                                                        onChange={upd("lang")}
                                                        className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                    >
                                                        {languages.map((lang) => (
                                                            <option key={lang.code} value={lang.code}>
                                                                {lang.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Date Format">
                                                    <select className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9">
                                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                                    </select>
                                                </Field>
                                            </div>
                                            
                                            {/* Language Implementation Notice */}
                                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="text-2xl">🌐</div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Multi-Language Support</h4>
                                                        <p className="text-sm text-blue-700 mb-2">
                                                            Language selection will be implemented soon with a comprehensive translation system.
                                                        </p>
                                                        <p className="text-sm text-blue-700">
                                                            <strong>Backend Implementation:</strong> A language table will govern field translations across the entire platform.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Live Theme Preview */}
                                            <div className="mt-4 border-t pt-4">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Theme Preview</h4>
                                                <div className="rounded-lg border border-gray-200 p-4" 
                                                     style={{
                                                         backgroundColor: form.dashboardTheme === 'dark' ? '#1f2937' : 
                                                                          form.dashboardTheme === 'light' ? '#ffffff' : '#f3f4f6',
                                                         color: form.dashboardTheme === 'dark' ? '#f9fafb' : '#111827'
                                                     }}>
                                                    <div className="text-xs mb-2 opacity-75">Live Preview:</div>
                                                    <div className="space-y-2">
                                                        <div className="text-sm font-semibold">Sample Dashboard Element</div>
                                                        <div className="text-xs opacity-75">This is how your selected theme will look</div>
                                                        <div className="flex gap-2 mt-2">
                                                            <div className="px-2 py-1 text-xs rounded" 
                                                                 style={{
                                                                     backgroundColor: form.dashboardTheme === 'dark' ? '#374151' : '#e5e7eb',
                                                                     color: form.dashboardTheme === 'dark' ? '#f9fafb' : '#374151'
                                                                 }}>
                                                                Button
                                                            </div>
                                                            <div className="px-2 py-1 text-xs rounded bg-blue-500 text-white">
                                                                Primary Action
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Dashboard Preferences">
                                            <div className="space-y-4">
                                                {/* Dashboard Theme & Layout */}
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <Field label="Dashboard Theme">
                                                        <select 
                                                            value={form.dashboardTheme}
                                                            onChange={upd("dashboardTheme")}
                                                            className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                        >
                                                            <option value="light">Light Theme</option>
                                                            <option value="dark">Dark Theme</option>
                                                            <option value="blue">Blue Theme</option>
                                                            <option value="green">Green Theme</option>
                                                            <option value="purple">Purple Theme</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Dashboard Layout">
                                                        <select 
                                                            value={form.dashboardLayout}
                                                            onChange={upd("dashboardLayout")}
                                                            className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                        >
                                                            <option value="default">Default Layout</option>
                                                            <option value="compact">Compact Layout</option>
                                                            <option value="expanded">Expanded Layout</option>
                                                            <option value="minimalist">Minimalist Layout</option>
                                                        </select>
                                                    </Field>
                                                </div>

                                                {/* Widget Visibility Settings */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Widget Visibility</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">📁</span>
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-700">Projects Widget</span>
                                                                    <p className="text-xs text-gray-500">Show projects overview and quick actions</p>
                                                                </div>
                                                            </div>
                                                            <Toggle
                                                                checked={form.widgetPreferences.showProjects}
                                                                onChange={updateWidgetPreference("showProjects")}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">✅</span>
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-700">Tasks Widget</span>
                                                                    <p className="text-xs text-gray-500">Display task summary and assignment options</p>
                                                                </div>
                                                            </div>
                                                            <Toggle
                                                                checked={form.widgetPreferences.showTasks}
                                                                onChange={updateWidgetPreference("showTasks")}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">👥</span>
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-700">Team Widget</span>
                                                                    <p className="text-xs text-gray-500">Show team overview and member management</p>
                                                                </div>
                                                            </div>
                                                            <Toggle
                                                                checked={form.widgetPreferences.showTeam}
                                                                onChange={updateWidgetPreference("showTeam")}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">📈</span>
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-700">Recent Activity Widget</span>
                                                                    <p className="text-xs text-gray-500">Display recent activity and updates</p>
                                                                </div>
                                                            </div>
                                                            <Toggle
                                                                checked={form.widgetPreferences.showRecentActivity}
                                                                onChange={updateWidgetPreference("showRecentActivity")}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">⚡</span>
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-700">Quick Actions Widget</span>
                                                                    <p className="text-xs text-gray-500">Show quick action buttons for common tasks</p>
                                                                </div>
                                                            </div>
                                                            <Toggle
                                                                checked={form.widgetPreferences.showQuickActions}
                                                                onChange={updateWidgetPreference("showQuickActions")}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Refresh Rate */}
                                                <div className="border-t pt-4">
                                                    <Field label="Dashboard Refresh Rate">
                                                        <select 
                                                            value={form.dashboardRefreshRate}
                                                            onChange={upd("dashboardRefreshRate")}
                                                            className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                        >
                                                            <option value="auto">Auto Refresh</option>
                                                            <option value="30s">Every 30 seconds</option>
                                                            <option value="1m">Every minute</option>
                                                            <option value="5m">Every 5 minutes</option>
                                                            <option value="15m">Every 15 minutes</option>
                                                            <option value="manual">Manual only</option>
                                                        </select>
                                                    </Field>
                                                </div>

                                                {/* Preview Card */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Dashboard Preview</h4>
                                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                                        <div className="text-xs text-gray-600 mb-2">Preview of your customized dashboard:</div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {form.widgetPreferences.showProjects && (
                                                                <div className="h-16 rounded bg-green-100 border border-green-200 flex items-center justify-center text-xs text-green-700 font-semibold">
                                                                    📁 Projects
                                                                </div>
                                                            )}
                                                            {form.widgetPreferences.showTasks && (
                                                                <div className="h-16 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-xs text-blue-700 font-semibold">
                                                                    ✅ Tasks
                                                                </div>
                                                            )}
                                                            {form.widgetPreferences.showTeam && (
                                                                <div className="h-16 rounded bg-purple-100 border border-purple-200 flex items-center justify-center text-xs text-purple-700 font-semibold">
                                                                    👥 Team
                                                                </div>
                                                            )}
                                                            {form.widgetPreferences.showRecentActivity && (
                                                                <div className="h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-700 font-semibold col-span-2">
                                                                    📈 Recent Activity
                                                                </div>
                                                            )}
                                                            {form.widgetPreferences.showQuickActions && (
                                                                <div className="h-16 rounded bg-yellow-100 border border-yellow-200 flex items-center justify-center text-xs text-yellow-700 font-semibold">
                                                                    ⚡ Quick Actions
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!Object.values(form.widgetPreferences).some(Boolean) && (
                                                            <div className="text-center text-gray-400 text-xs py-4">
                                                                No widgets selected - please enable at least one widget above
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Privacy Controls">
                                            <div className="space-y-6">
                                                {/* Strokes Visibility */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Activity Visibility</h4>
                                                    <div className="space-y-4">
                                                        <Field label="Strokes Visibility">
                                                            <select 
                                                                value={form.strokesVisibility}
                                                                onChange={(e) => setForm(s => ({ ...s, strokesVisibility: e.target.value }))}
                                                                className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                            >
                                                                <option value="public">Public - Visible to everyone</option>
                                                                <option value="team-only">Team Only - Visible to team members</option>
                                                                <option value="private">Private - Only visible to you</option>
                                                            </select>
                                                        </Field>
                                                        <p className="text-xs text-gray-500">
                                                            Control who can see your activity strokes and work patterns.
                                                        </p>
                                                        
                                                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700">Show in Activity Feed</span>
                                                                <p className="text-xs text-gray-500 mt-1">Allow your activities to appear in the "What's New" feed</p>
                                                            </div>
                                                            <Toggle
                                                                checked={form.showInActivityFeed}
                                                                onChange={(checked) => setForm(s => ({ ...s, showInActivityFeed: checked }))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* eNPS Privacy Notice */}
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="text-2xl">🔒</div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-blue-800 mb-2">eNPS Privacy Protection</h4>
                                                            <p className="text-sm text-blue-700 mb-2">
                                                                <strong>Anonymous by Design:</strong> eNPS scores are always anonymous. The system only records the answer but never the user identity.
                                                            </p>
                                                            <p className="text-sm text-blue-700">
                                                                Even admin reports only show cumulative scores for each team and the organization but not for individuals.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* eNPS Anonymity Notice */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">eNPS Anonymity Settings</h4>
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="text-2xl">✅</div>
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-green-800 mb-2">Always Anonymous</h4>
                                                                <p className="text-sm text-green-700 mb-2">
                                                                    <strong>System Design:</strong> eNPS responses are only collected anonymously.
                                                                </p>
                                                                <p className="text-sm text-green-700">
                                                                    No user preferences needed - anonymity is built into the system architecture.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* eNPS Data Collection Settings */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-4">eNPS Data Collection Settings</h4>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700">Allow Anonymous Scoring</span>
                                                                <p className="text-xs text-gray-500 mt-1">Enable employees to submit eNPS scores anonymously</p>
                                                            </div>
                                                            <Toggle
                                                                checked={form.enpsPrivacySettings.allowAnonymousScoring}
                                                                onChange={updateEnpsPrivacySetting("allowAnonymousScoring")}
                                                            />
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700">Show Individual Scores to Admins</span>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    <span className="text-red-600 font-semibold">⚠️ Not Recommended:</span> This would compromise anonymity
                                                                </p>
                                                            </div>
                                                            <Toggle
                                                                checked={form.enpsPrivacySettings.showIndividualScores}
                                                                onChange={updateEnpsPrivacySetting("showIndividualScores")}
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700">Enable Team-Level Reports</span>
                                                                <p className="text-xs text-gray-500 mt-1">Show aggregated eNPS scores by team (minimum 5 responses)</p>
                                                            </div>
                                                            <Toggle
                                                                checked={form.enpsPrivacySettings.enableTeamReports}
                                                                onChange={updateEnpsPrivacySetting("enableTeamReports")}
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700">Enable Organization Reports</span>
                                                                <p className="text-xs text-gray-500 mt-1">Show aggregated eNPS scores for entire organization</p>
                                                            </div>
                                                            <Toggle
                                                                checked={form.enpsPrivacySettings.enableOrgReports}
                                                                onChange={updateEnpsPrivacySetting("enableOrgReports")}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Data Retention Settings */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Data Retention</h4>
                                                    <Field label="eNPS Data Retention Period">
                                                        <select 
                                                            value={form.enpsPrivacySettings.dataRetentionDays}
                                                            onChange={(e) => setForm(s => ({
                                                                ...s,
                                                                enpsPrivacySettings: {
                                                                    ...s.enpsPrivacySettings,
                                                                    dataRetentionDays: parseInt(e.target.value)
                                                                }
                                                            }))}
                                                            className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9"
                                                        >
                                                            <option value={90}>3 months (90 days)</option>
                                                            <option value={180}>6 months (180 days)</option>
                                                            <option value={365}>1 year (365 days)</option>
                                                            <option value={730}>2 years (730 days)</option>
                                                            <option value={-1}>Indefinite (until manually deleted)</option>
                                                        </select>
                                                    </Field>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Anonymous eNPS responses will be automatically deleted after this period to protect privacy.
                                                    </p>
                                                </div>

                                                {/* Privacy Compliance Status */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Privacy Compliance Status</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className={`p-3 rounded-lg border ${
                                                            form.enpsPrivacySettings.allowAnonymousScoring 
                                                                ? 'bg-green-50 border-green-200' 
                                                                : 'bg-red-50 border-red-200'
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={form.enpsPrivacySettings.allowAnonymousScoring ? 'text-green-600' : 'text-red-600'}>
                                                                    {form.enpsPrivacySettings.allowAnonymousScoring ? '✅' : '❌'}
                                                                </span>
                                                                <span className="text-xs font-medium">Anonymous Collection</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={`p-3 rounded-lg border ${
                                                            !form.enpsPrivacySettings.showIndividualScores 
                                                                ? 'bg-green-50 border-green-200' 
                                                                : 'bg-red-50 border-red-200'
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={!form.enpsPrivacySettings.showIndividualScores ? 'text-green-600' : 'text-red-600'}>
                                                                    {!form.enpsPrivacySettings.showIndividualScores ? '✅' : '⚠️'}
                                                                </span>
                                                                <span className="text-xs font-medium">Individual Privacy</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={`p-3 rounded-lg border ${
                                                            form.enpsPrivacySettings.enableTeamReports 
                                                                ? 'bg-blue-50 border-blue-200' 
                                                                : 'bg-gray-50 border-gray-200'
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-blue-600">📊</span>
                                                                <span className="text-xs font-medium">Team Insights</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={`p-3 rounded-lg border ${
                                                            form.enpsPrivacySettings.dataRetentionDays > 0 
                                                                ? 'bg-purple-50 border-purple-200' 
                                                                : 'bg-gray-50 border-gray-200'
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-purple-600">🗓️</span>
                                                                <span className="text-xs font-medium">
                                                                    {form.enpsPrivacySettings.dataRetentionDays === -1 
                                                                        ? 'No Auto-Delete' 
                                                                        : `${form.enpsPrivacySettings.dataRetentionDays}d Retention`
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Admin Guidelines */}
                                                <div className="border-t pt-4">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Administrator Guidelines</h4>
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                        <div className="space-y-2 text-sm text-yellow-800">
                                                            <p><strong>✓ Do:</strong> Review team and organization-level trends</p>
                                                            <p><strong>✓ Do:</strong> Use aggregated data for improvement initiatives</p>
                                                            <p><strong>✓ Do:</strong> Ensure minimum response thresholds (5+ responses)</p>
                                                            <p><strong>✗ Don't:</strong> Attempt to identify individual respondents</p>
                                                            <p><strong>✗ Don't:</strong> Use data for performance reviews</p>
                                                            <p><strong>✗ Don't:</strong> Share raw response data outside authorized personnel</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {activeTab === "Integrations" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            SYNCHRONIZATION SETTINGS
                                        </div>

                                        <Section title="Calendar Integration">
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#4285F4] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                G
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Google Calendar
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Sync your tasks and events with Google Calendar
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {/* Existing Google integration UI continues below in file */}
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {activeTab === "Integrations" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            SYNCHRONIZATION SETTINGS
                                        </div>

                                        <Section title="Calendar Integration">
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#4285F4] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                G
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Google Calendar
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Sync your tasks and events with Google Calendar
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {integrations.google && integrations.google.connected ? (
                                                            <div className="flex gap-3 items-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-semibold text-gray-700">
                                                                        {integrations.google.account?.name}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500">
                                                                        {integrations.google.account?.email}
                                                                    </span>
                                                                    {integrations.google.lastSynced && (
                                                                        <span className="text-[11px] text-gray-400">
                                                                            Last synced:{" "}
                                                                            {formatDate(integrations.google.lastSynced)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {integrations.google.syncing ? (
                                                                        <span className="text-xs text-gray-600">
                                                                            Syncing...
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            className="rounded border px-2 py-1 text-xs"
                                                                            onClick={() => syncIntegration("google")}
                                                                        >
                                                                            Sync now
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="rounded bg-gray-200 px-3 py-1.5 text-xs font-semibold"
                                                                        onClick={() => disconnectIntegration("google")}
                                                                    >
                                                                        Disconnect
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : connectPending === "google" ? (
                                                            <div className="inline-flex items-center gap-2">
                                                                <span className="text-xs text-gray-600">
                                                                    Authorizing...
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="rounded bg-[#4285F4] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center"
                                                                onClick={() => connectIntegration("google")}
                                                            >
                                                                Connect
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#0078D4] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                O
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Outlook Calendar
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Sync with Microsoft Outlook
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {integrations.outlook && integrations.outlook.connected ? (
                                                            <div className="flex gap-3 items-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-semibold text-gray-700">
                                                                        {integrations.outlook.account?.name}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500">
                                                                        {integrations.outlook.account?.email}
                                                                    </span>
                                                                    {integrations.outlook.lastSynced && (
                                                                        <span className="text-[11px] text-gray-400">
                                                                            Last synced:{" "}
                                                                            {formatDate(
                                                                                integrations.outlook.lastSynced,
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {integrations.outlook.syncing ? (
                                                                        <span className="text-xs text-gray-600">
                                                                            Syncing...
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            className="rounded border px-2 py-1 text-xs"
                                                                            onClick={() => syncIntegration("outlook")}
                                                                        >
                                                                            Sync now
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="rounded bg-gray-200 px-3 py-1.5 text-xs font-semibold"
                                                                        onClick={() => disconnectIntegration("outlook")}
                                                                    >
                                                                        Disconnect
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : connectPending === "outlook" ? (
                                                            <div className="inline-flex items-center gap-2">
                                                                <span className="text-xs text-gray-600">
                                                                    Authorizing...
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="rounded bg-[#0078D4] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center"
                                                                onClick={() => connectIntegration("outlook")}
                                                            >
                                                                Connect
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#EA4335] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                📅
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Apple Calendar
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Sync with Apple iCloud Calendar
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {integrations.apple && integrations.apple.connected ? (
                                                            <div className="flex gap-3 items-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-semibold text-gray-700">
                                                                        {integrations.apple.account?.name}
                                                                    </span>
                                                                    <span className="text-[11px] text-gray-500">
                                                                        {integrations.apple.account?.email}
                                                                    </span>
                                                                    {integrations.apple.lastSynced && (
                                                                        <span className="text-[11px] text-gray-400">
                                                                            Last synced:{" "}
                                                                            {formatDate(integrations.apple.lastSynced)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {integrations.apple.syncing ? (
                                                                        <span className="text-xs text-gray-600">
                                                                            Syncing...
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            className="rounded border px-2 py-1 text-xs"
                                                                            onClick={() => syncIntegration("apple")}
                                                                        >
                                                                            Sync now
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="rounded bg-gray-200 px-3 py-1.5 text-xs font-semibold"
                                                                        onClick={() => disconnectIntegration("apple")}
                                                                    >
                                                                        Disconnect
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : connectPending === "apple" ? (
                                                            <div className="inline-flex items-center gap-2">
                                                                <span className="text-xs text-gray-600">
                                                                    Authorizing...
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="rounded bg-[#EA4335] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center"
                                                                onClick={() => connectIntegration("apple")}
                                                            >
                                                                Connect
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Team Collaboration">
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#4A154B] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                S
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Slack Integration
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Get notifications in Slack
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button className="rounded bg-[#4A154B] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center">
                                                            Connect
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#5865F2] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                D
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Discord Integration
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Connect with your Discord server
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button className="rounded bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center">
                                                            Connect
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="rounded border border-gray-300 p-3 sm:p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#0177B5] rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                📧
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-sm font-semibold text-gray-800">
                                                                    Email Integration
                                                                </h3>
                                                                <p className="text-xs text-gray-600">
                                                                    Sync with Gmail, Outlook, or other email
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button className="rounded bg-[#0177B5] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center">
                                                            Connect
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {activeTab === "Teams & Members" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            TEAM MANAGEMENT
                                        </div>
                                        <Section title="Teams & Members">
                                            <div className="space-y-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <input
                                                        value={teamsSearch}
                                                        onChange={(e) => setTeamsSearch(e.target.value)}
                                                        placeholder="Search members or teams..."
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                                    />
                                                    {canCreateTeams && (
                                                        <div className="flex gap-2">
                                                            <input id="newTeamName" placeholder="Enter new team name" className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
                                                            <button
                                                                onClick={() => {
                                                                    const el = document.getElementById('newTeamName');
                                                                    const val = el?.value?.trim();
                                                                    if (!val) return;
                                                                    createTeam(val);
                                                                    if (el) el.value = '';
                                                                }}
                                                                className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                            >
                                                                Create Team
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {/* Main Team Card */}
                                                    <div
                                                        className="rounded border border-blue-200 bg-blue-50 p-3"
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => {
                                                            const payload = draggingMember;
                                                            setDraggingMember(null);
                                                            if (teamsUI.mainTeam && payload) moveMember(payload.fromTeamId, teamsUI.mainTeam.id, payload.memberId);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-sm font-semibold text-gray-800">Main Team</h4>
                                                            {teamsUI.mainTeam && (
                                                                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600 text-white">Primary</span>
                                                            )}
                                                        </div>
                                                        {teamsUI.mainTeam ? (
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                                        {teamsUI.mainTeam.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-800">{teamsUI.mainTeam.name}</div>
                                                                        <div className="text-xs text-gray-600">{teamsUI.mainTeam.members.length} members</div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {teamsUI.mainTeam.members
                                                                        .filter((m) => m.name.toLowerCase().includes(teamsSearch.toLowerCase()))
                                                                        .map((m) => (
                                                                            <div
                                                                                key={m.id}
                                                                                className="flex items-center justify-between rounded border bg-white px-2 py-1"
                                                                                draggable
                                                                                onDragStart={() => setDraggingMember({ memberId: m.id, fromTeamId: teamsUI.mainTeam.id })}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center">
                                                                                        {m.name.charAt(0)}
                                                                                    </div>
                                                                                    <div className="text-sm text-gray-800">{m.name}</div>
                                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${teamsUI.mainTeam.leaderId === m.id || m.role === 'Leader' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                                        {teamsUI.mainTeam.leaderId === m.id || m.role === 'Leader' ? 'Leader' : 'Member'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex gap-1">
                                                                                    {canManageTeams && (
                                                                                        <button onClick={() => setLeader(teamsUI.mainTeam.id, m.id)} className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50">Set Leader</button>
                                                                                    )}
                                                                                    {canManageTeams && (
                                                                                        <button onClick={() => removeMember(teamsUI.mainTeam.id, m.id)} className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50">Remove</button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                                {canManageTeams && (
                                                                    <div className="mt-2 flex gap-2">
                                                                        <input id="addMainMember" placeholder="Add member name" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                        <button
                                                                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                                                                            onClick={() => {
                                                                                const el = document.getElementById('addMainMember');
                                                                                addMember(teamsUI.mainTeam.id, el?.value || 'New Member');
                                                                                if (el) el.value = '';
                                                                            }}
                                                                        >
                                                                            Add Member
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {canManageTeams && (
                                                                    <div className="mt-2">
                                                                        <div className="text-xs font-semibold text-gray-700 mb-1">Invite members</div>
                                                                        <div className="flex gap-2">
                                                                            <input id="inviteMain" placeholder="Email or username" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                            <button
                                                                                className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                                                                                onClick={() => {
                                                                                    const el = document.getElementById('inviteMain');
                                                                                    sendInvite(teamsUI.mainTeam.id, el?.value || 'someone@example.com');
                                                                                    if (el) el.value = '';
                                                                                }}
                                                                            >
                                                                                Send Invite
                                                                            </button>
                                                                        </div>
                                                                        {(teamsUI.mainTeam.invites || []).length > 0 && (
                                                                            <div className="mt-2 space-y-1">
                                                                                {(teamsUI.mainTeam.invites || []).map((iv) => (
                                                                                    <div key={iv.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-white">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">Pending</span>
                                                                                            <span className="text-gray-800">{iv.contact}</span>
                                                                                        </div>
                                                                                        <button className="px-2 py-0.5 border rounded hover:bg-gray-50" onClick={() => cancelInvite(teamsUI.mainTeam.id, iv.id)}>Cancel</button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-6 text-gray-500">
                                                                <div className="text-4xl mb-2">👥</div>
                                                                <p className="text-sm">No main team assigned</p>
                                                                {canCreateTeams && (
                                                                    <button className="mt-3 px-4 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" onClick={() => createTeam('My Team')}>
                                                                        Create Team
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Other Teams Cards */}
                                                    <div className="rounded border p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-sm font-semibold text-gray-800">Other Teams</h4>
                                                            {canJoinTeams && (
                                                                <div className="relative">
                                                                    <button
                                                                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                                        onClick={() => setJoinMenuOpen((v) => {
                                                                            const next = !v;
                                                                            if (next) setJoinMenuFilter("");
                                                                            return next;
                                                                        })}
                                                                    >
                                                                        Join Team
                                                                    </button>
                                                                    {joinMenuOpen && (
                                                                        <div className="absolute right-0 mt-1 w-64 rounded border bg-white shadow z-10">
                                                                            <div className="p-2 border-b">
                                                                                <input
                                                                                    autoFocus
                                                                                    value={joinMenuFilter}
                                                                                    onChange={(e) => setJoinMenuFilter(e.target.value)}
                                                                                    placeholder="Search teams..."
                                                                                    className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-500"
                                                                                />
                                                                            </div>
                                                                            <div className="max-h-56 overflow-auto py-1">
                                                                                {(() => {
                                                                                    const banned = /^(new team|team)$/i;
                                                                                    const q = joinMenuFilter.trim().toLowerCase();
                                                                                    const items = (teamsUI.otherTeams || [])
                                                                                        .filter((t) => !banned.test(t.name))
                                                                                        .filter((t) => !(t.members || []).some((m) => m.name === 'You'))
                                                                                        .filter((t) => !q || t.name.toLowerCase().includes(q))
                                                                                        .slice(0, 12);
                                                                                    return items.length ? items.map((t) => (
                                                                                        <button
                                                                                            key={t.id}
                                                                                            className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                                                                                            onClick={() => {
                                                                                                requestJoin(t.id);
                                                                                                setJoinMenuOpen(false);
                                                                                            }}
                                                                                        >
                                                                                            {t.name}
                                                                                        </button>
                                                                                    )) : (
                                                                                        <div className="px-3 py-2 text-xs text-gray-500">No teams found</div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {teamsUI.otherTeams
                                                                .filter((t) => t.name.toLowerCase().includes(teamsSearch.toLowerCase()) || t.members.some((m) => m.name.toLowerCase().includes(teamsSearch.toLowerCase())))
                                                                .map((t) => (
                                                                    <div
                                                                        key={t.id}
                                                                        className="border rounded p-2 bg-white"
                                                                        onDragOver={(e) => e.preventDefault()}
                                                                        onDrop={() => {
                                                                            const payload = draggingMember;
                                                                            setDraggingMember(null);
                                                                            if (payload) moveMember(payload.fromTeamId, t.id, payload.memberId);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-7 h-7 bg-gray-500 rounded-full text-white text-xs flex items-center justify-center">
                                                                                    {t.name.charAt(0)}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                                                                                    <div className="text-xs text-gray-600">{t.members.length} members</div>
                                                                                </div>
                                                                            </div>
                                                                            {canManageTeams && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <input id={`rn-${t.id}`} placeholder="Rename" className="px-2 py-1 text-xs border rounded" />
                                                                                    <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={() => {
                                                                                        const el = document.getElementById(`rn-${t.id}`);
                                                                                        renameTeam(t.id, el?.value || t.name);
                                                                                        if (el) el.value = '';
                                                                                    }}>Rename</button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {t.members
                                                                                .filter((m) => m.name.toLowerCase().includes(teamsSearch.toLowerCase()))
                                                                                .map((m) => (
                                                                                    <div
                                                                                        key={m.id}
                                                                                        className="flex items-center justify-between rounded border px-2 py-1"
                                                                                        draggable
                                                                                        onDragStart={() => setDraggingMember({ memberId: m.id, fromTeamId: t.id })}
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center">
                                                                                                {m.name.charAt(0)}
                                                                                            </div>
                                                                                            <div className="text-sm text-gray-800">{m.name}</div>
                                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.leaderId === m.id || m.role === 'Leader' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                                                {t.leaderId === m.id || m.role === 'Leader' ? 'Leader' : 'Member'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex gap-1">
                                                                                            {canManageTeams && (
                                                                                                <button onClick={() => setLeader(t.id, m.id)} className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50">Set Leader</button>
                                                                                            )}
                                                                                            {canManageTeams && (
                                                                                                <button onClick={() => removeMember(t.id, m.id)} className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50">Remove</button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                        {canJoinTeams && !t.members.some((m) => m.name === 'You') && (
                                                                            <div className="mt-2">
                                                                                <button
                                                                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                                                                                    onClick={() => requestJoin(t.id)}
                                                                                >
                                                                                    Request to Join
                                                                                </button>
                                                                                {(t.joinRequests || []).some((r) => r.user === 'You' && r.status === 'Pending') && (
                                                                                    <span className="ml-2 text-xs text-yellow-700">Pending approval…</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {(t.joinRequests || []).length > 0 && (
                                                                            <div className="mt-2 space-y-1">
                                                                                {(t.joinRequests || []).map((r) => (
                                                                                    <div key={r.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-white">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={`px-1.5 py-0.5 rounded ${r.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>{r.status}</span>
                                                                                            <span className="text-gray-800">{r.user}</span>
                                                                                        </div>
                                                                                        {r.user === 'You' && r.status === 'Pending' && (
                                                                                            <button className="px-2 py-0.5 border rounded hover:bg-gray-50" onClick={() => cancelJoinRequest(t.id, r.id)}>Cancel</button>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {canManageTeams && (
                                                                            <div className="mt-2 flex gap-2">
                                                                                <input id={`add-${t.id}`} placeholder="Add member name" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                                <button
                                                                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                                                                                    onClick={() => {
                                                                                        const el = document.getElementById(`add-${t.id}`);
                                                                                        addMember(t.id, el?.value || 'New Member');
                                                                                        if (el) el.value = '';
                                                                                    }}
                                                                                >
                                                                                    Add Member
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {canManageTeams && (
                                                                            <div className="mt-2">
                                                                                <div className="text-xs font-semibold text-gray-700 mb-1">Invite members</div>
                                                                                <div className="flex gap-2">
                                                                                    <input id={`invite-${t.id}`} placeholder="Email or username" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                                    <button
                                                                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                                                                                        onClick={() => {
                                                                                            const el = document.getElementById(`invite-${t.id}`);
                                                                                            sendInvite(t.id, el?.value || 'someone@example.com');
                                                                                            if (el) el.value = '';
                                                                                        }}
                                                                                    >
                                                                                        Send Invite
                                                                                    </button>
                                                                                </div>
                                                                                {(t.invites || []).length > 0 && (
                                                                                    <div className="mt-2 space-y-1">
                                                                                        {(t.invites || []).map((iv) => (
                                                                                            <div key={iv.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">Pending</span>
                                                                                                    <span className="text-gray-800">{iv.contact}</span>
                                                                                                </div>
                                                                                                <button className="px-2 py-0.5 border rounded hover:bg-gray-50" onClick={() => cancelInvite(t.id, iv.id)}>Cancel</button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            {teamsUI.otherTeams.length === 0 && (
                                                                <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
                                                                    <p className="text-sm">No additional teams</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>
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
                                                            Save these backup codes in a safe place. You can use them to access your account if you lose your device.
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                                            {backupCodes.map((code, i) => (
                                                                <div key={i} className="font-mono text-sm bg-gray-50 p-2 rounded">
                                                                    {code}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={downloadBackupCodes}
                                                            className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                                        >
                                                            Download Codes
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {activeTab === "Privacy" && (
                                    <div className="space-y-4">
                                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                            PRIVACY SETTINGS
                                        </div>

                                        <Section title="Data Visibility">
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <label className="text-sm font-medium text-gray-700">Strokes Visibility</label>
                                                    <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                                                        <option value="public">Public - Visible to everyone in organization</option>
                                                        <option value="team">Team Only - Visible only to my team members</option>
                                                        <option value="private">Private - Only visible to me</option>
                                                    </select>
                                                    <p className="text-xs text-gray-600">
                                                        Control who can see your strokes and activity data.
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-sm font-medium text-gray-700">Activity Feed Visibility</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            defaultChecked={true}
                                                        />
                                                        <span className="text-sm text-gray-700">Show my activities in "What's New" feed</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600">
                                                        When enabled, your goal updates and achievements will appear in the organization's activity feed.
                                                    </p>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Survey Responses">
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <label className="text-sm font-medium text-gray-700">eNPS Response Anonymity</label>
                                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-yellow-600">⚠️</div>
                                                            <span className="text-sm font-medium text-yellow-800">Anonymous Only</span>
                                                        </div>
                                                        <p className="text-xs text-yellow-700 mt-1">
                                                            All eNPS survey responses are automatically anonymous to ensure honest feedback.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-sm font-medium text-gray-700">Survey Participation</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            defaultChecked={true}
                                                        />
                                                        <span className="text-sm text-gray-700">Receive survey notifications</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600">
                                                        Get notified when new surveys are available.
                                                    </p>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section title="Data Control">
                                            <div className="space-y-4">
                                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                    <h4 className="text-sm font-medium text-gray-800 mb-2">Data Export</h4>
                                                    <p className="text-xs text-gray-600 mb-3">
                                                        Download all your personal data including goals, activities, and survey responses.
                                                    </p>
                                                    <button className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                                                        Request Data Export
                                                    </button>
                                                </div>

                                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <h4 className="text-sm font-medium text-red-800 mb-2">Account Deletion</h4>
                                                    <p className="text-xs text-red-600 mb-3">
                                                        Permanently delete your account and all associated data. This action cannot be undone.
                                                    </p>
                                                    <button className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                                                        Delete Account
                                                    </button>
                                                </div>
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
                                        <h4 className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">
                                            GOOGLE CONNECT
                                        </h4>
                                        <p className="text-[10px] text-gray-600 sm:text-[11px]">Not Connected</p>
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