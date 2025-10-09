import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Avatar from 'boring-avatars';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import Cropper from 'react-easy-crop';
import Sidebar from "../components/shared/Sidebar";

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("My Profile");
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarOriginal, setAvatarOriginal] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropZoom, setCropZoom] = useState(1);
    const cropImgRef = useRef(null);
    const [errors, setErrors] = useState({});
    const [personalDraft, setPersonalDraft] = useState({ name: "", email: "", phone: "" });
    const [professionalDraft, setProfessionalDraft] = useState({ jobTitle: "", department: "", manager: "" });
    const [passwordDraft, setPasswordDraft] = useState({ current: "", next: "", confirm: "" });
    const [emailDraft, setEmailDraft] = useState({ current: "", next: "" });
    const [teamDraft, setTeamDraft] = useState({ mainTeamName: "", otherTeams: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [prefSaved, setPrefSaved] = useState(false);
    const [privacySaved, setPrivacySaved] = useState(false);
    const [accountSaved, setAccountSaved] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [changeMode, setChangeMode] = useState(null); // 'password' | 'email' | null
    const clearError = useCallback((key) => {
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const handlePersonalChange = useCallback((field) => (e) => {
        const value = e.target.value;
        setPersonalDraft((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
        clearError(field);
    }, [clearError]);

    const handleProfessionalChange = useCallback((field) => (e) => {
        const value = e.target.value;
        setProfessionalDraft((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
    }, []);

    const handlePasswordChange = useCallback((field) => (e) => {
        const value = e.target.value;
        setPasswordDraft((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
        if (field === "current") clearError("oldPw");
        else if (field === "next") clearError("newPw");
        else clearError("confirmPw");
    }, [clearError]);

    const handleEmailChange = useCallback((field) => (e) => {
        const value = e.target.value;
        setEmailDraft((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
        clearError(field === "current" ? "oldEmail" : "newEmail");
    }, [clearError]);

    const updateTeamDraftName = useCallback((value) => {
        setTeamDraft((prev) => (prev.mainTeamName === value ? prev : { ...prev, mainTeamName: value }));
    }, []);
    // Global toast/snackbar state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);
    const showToast = useCallback((message, type = 'success', timeout = 2400) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        setToast({ visible: true, message, type });
        toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), timeout);
    }, []);
    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);
    const fileRef = useRef(null);
    const cameraOptionsRef = useRef(null);
    const cameraButtonRef = useRef(null);
    
    // Camera capture state
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null); // 'granted', 'denied', 'prompt', null
    const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
    const [zoom, setZoom] = useState(1);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null); // For preview before saving
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [showCameraOptions, setShowCameraOptions] = useState(false); // Show camera mode selection

    // Cropper state (WhatsApp-style crop before saving avatar)
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Modern avatar enhancements: filter presets and gradient ring
    const [avatarFilter, setAvatarFilter] = useState('normal'); // filter preset key
    const [avatarRing, setAvatarRing] = useState('none'); // 'none' | 'instagram' | 'blue' | 'sunset'
    const avatarFilterPresets = useMemo(() => ({
        normal: 'none',
        clarendon: 'contrast(1.15) saturate(1.25) brightness(1.05)',
        gingham: 'brightness(1.05) sepia(0.06) saturate(1.05)',
        juno: 'contrast(1.05) saturate(1.35) sepia(0.08) hue-rotate(-8deg)',
        lark: 'brightness(1.18) saturate(0.9)',
        moon: 'grayscale(1) contrast(1.1) brightness(1.08)',
        crema: 'sepia(0.08) saturate(1.2) contrast(0.92) brightness(1.04)'
    }), []);
    const getAvatarFilterCss = useCallback((key) => avatarFilterPresets[key] || 'none', [avatarFilterPresets]);
    const getRingWrapperStyle = useCallback((ring) => {
        switch (ring) {
            case 'instagram':
                return { background: 'conic-gradient(#feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)' };
            case 'blue':
                return { background: 'conic-gradient(#60a5fa, #2563eb, #60a5fa)' };
            case 'sunset':
                return { background: 'conic-gradient(#ff9a9e, #fecfef, #feada6, #f6d365, #fda085, #ff9a9e)' };
            default:
                return {};
        }
    }, []);

    // Avatar (WhatsApp-style) modal state
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarMode, setAvatarMode] = useState('geometric'); // 'geometric' | 'human'
    const [avatarSeed, setAvatarSeed] = useState('You');
    const [avatarVariant, setAvatarVariant] = useState('beam'); // 'beam' | 'marble' | 'sunset' | 'ring' | 'bauhaus'
    const [avatarPalette, setAvatarPalette] = useState(0);
    const avatarSvgWrapRef = useRef(null);
    const avatarPalettes = useMemo(() => ([
        ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"],
        ["#FFAD08", "#EDD75A", "#73B06F", "#0C8F8F", "#405059"],
        ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"],
        ["#F94144", "#F3722C", "#F8961E", "#43AA8B", "#577590"],
        ["#2E7D32", "#66BB6A", "#A5D6A7", "#81C784", "#43A047"],
    ]), []);

    // Human-like avatar traits (DiceBear - adventurer)
    const [humanSkin, setHumanSkin] = useState('light');
    const [humanHair, setHumanHair] = useState('short01');
    const [humanHairColor, setHumanHairColor] = useState('#6b4f2a');
    const [humanEyes, setHumanEyes] = useState('variant01');
    const [humanMouth, setHumanMouth] = useState('smile');
    const [humanAccessory, setHumanAccessory] = useState('none');
    const [humanBg, setHumanBg] = useState('#ffffff');
    const [diceSvg, setDiceSvg] = useState('');

    useEffect(() => {
        if (showAvatarModal && avatarMode === 'human') {
            const svg = createAvatar(adventurer, {
                seed: avatarSeed || 'You',
                backgroundColor: [humanBg.replace('#', '')],
                skinColor: [humanSkin], // library will map or ignore unknowns gracefully
                hair: [humanHair],
                hairColor: [humanHairColor.replace('#', '')],
                eyes: [humanEyes],
                mouth: [humanMouth],
                accessories: [humanAccessory],
                radius: 0,
            }).toString();
            setDiceSvg(svg);
        }
    }, [showAvatarModal, avatarMode, avatarSeed, humanSkin, humanHair, humanHairColor, humanEyes, humanMouth, humanAccessory, humanBg]);

    // Close camera options dropdown when clicking outside (click-away)
    useEffect(() => {
        const onDocClick = (e) => {
            if (!showCameraOptions) return;
            const menu = cameraOptionsRef.current;
            const btn = cameraButtonRef.current;
            if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
                setShowCameraOptions(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [showCameraOptions]);

    // Personal details edit mode + saved snapshot
    const [savedPersonal, setSavedPersonal] = useState({
        name: "John Doe",
        email: "john.doe@company.com",
        phone: "+1 555-123-4567"
    });
    // load stored avatar if present
    useEffect(() => {
        try {
            const a = localStorage.getItem('pm:user:avatar');
            if (a) setAvatarPreview(a);
            const ring = localStorage.getItem('pm:user:avatar:ring');
            if (ring) setAvatarRing(ring);
            const filt = localStorage.getItem('pm:user:avatar:filter');
            if (filt) setAvatarFilter(filt);
        } catch (e) {}
    }, []);
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);

    // Professional details edit mode + saved snapshot
    const [savedProfessional, setSavedProfessional] = useState({
        jobTitle: "Lead Developer",
        department: "Engineering",
        manager: "Sarah Johnson"
    });
    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [professionalSaved, setProfessionalSaved] = useState(false);

    // Team Assignment edit mode + saved snapshot
    const [savedTeams, setSavedTeams] = useState({
        mainTeam: {
            name: "Product Development",
            members: 8,
            role: "Lead Developer",
        },
        otherTeams: [
            { name: "Marketing", role: "Contributor", members: 5 },
            { name: "Design System", role: "Reviewer", members: 3 },
        ],
    });
    const [isEditingTeams, setIsEditingTeams] = useState(false);
    const [teamsSaved, setTeamsSaved] = useState(false);

    // Teams & Members board (drag & drop)
    const [teamsBoard, setTeamsBoard] = useState(() => {
        // derive teams from savedTeams
        const base = [
            { id: 'main', name: 'Product Development' },
            { id: 'team-1', name: 'Marketing' },
            { id: 'team-2', name: 'Design System' },
        ];
        try {
            const local = localStorage.getItem('pm:teamsBoard');
            if (local) return JSON.parse(local);
        } catch(_){}
        return base.map((t) => ({ ...t }));
    });
    const [membersByTeam, setMembersByTeam] = useState(() => {
        try {
            const local = localStorage.getItem('pm:membersByTeam');
            if (local) return JSON.parse(local);
        } catch(_){}
        const demoNames = [
            'John Doe','Sarah Johnson','Michael Lee','Emily Davis','David Patel','Amina Yusuf',
            'Carlos Garcia','Mei Chen','Ethan Brown','Olivia Wilson','Noah Kim','Ava Thompson'
        ];
        const demoRoles = ['Lead','Contributor','Reviewer','Designer','Engineer','PM'];
        const seed = {
            main: demoNames.slice(0, 5).map((n, i) => ({ id: 'm'+i, name: n, role: demoRoles[i % demoRoles.length] })),
            'team-1': demoNames.slice(5, 9).map((n, i) => ({ id: 'm'+(i+5), name: n, role: demoRoles[(i+1) % demoRoles.length] })),
            'team-2': demoNames.slice(9, 12).map((n, i) => ({ id: 'm'+(i+9), name: n, role: demoRoles[(i+2) % demoRoles.length] })),
        };
        return seed;
    });
    const [memberSearch, setMemberSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState(''); // '' means all
    const [dragOverTeam, setDragOverTeam] = useState(null);

    useEffect(() => {
        try { localStorage.setItem('pm:teamsBoard', JSON.stringify(teamsBoard)); } catch(_){}
    }, [teamsBoard]);
    useEffect(() => {
        try { localStorage.setItem('pm:membersByTeam', JSON.stringify(membersByTeam)); } catch(_){}
    }, [membersByTeam]);

    const filteredMembersByTeam = useMemo(() => {
        const term = memberSearch.trim().toLowerCase();
        const role = roleFilter.trim().toLowerCase();
        const out = {};
        for (const k of Object.keys(membersByTeam)) {
            let list = membersByTeam[k] || [];
            if (term) list = list.filter(m => m.name.toLowerCase().includes(term) || (m.role||'').toLowerCase().includes(term));
            if (role) list = list.filter(m => (m.role||'').toLowerCase() === role);
            out[k] = list;
        }
        return out;
    }, [membersByTeam, memberSearch, roleFilter]);

    const onDragStartMember = (e, memberId, fromTeamId) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ memberId, fromTeamId }));
        e.dataTransfer.effectAllowed = 'move';
    };
    const onDragOverTeam = (e, teamId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTeam !== teamId) setDragOverTeam(teamId);
    };
    const onDropOnTeam = (e, toTeamId) => {
        e.preventDefault();
        setDragOverTeam(null);
        let payload = null;
        try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(_){}
        if (!payload) return;
        const { memberId, fromTeamId } = payload;
        if (!memberId || !fromTeamId || fromTeamId === toTeamId) return;
        setMembersByTeam((prev) => {
            const fromList = [...(prev[fromTeamId] || [])];
            const idx = fromList.findIndex(m => m.id === memberId);
            if (idx === -1) return prev;
            const member = fromList[idx];
            fromList.splice(idx, 1);
            const toList = [...(prev[toTeamId] || [])];
            toList.unshift(member); // add to top
            const next = { ...prev, [fromTeamId]: fromList, [toTeamId]: toList };
            return next;
        });
        const member = (membersByTeam[fromTeamId] || []).find(m => m.id === memberId);
        const toName = teamsBoard.find(t => t.id === toTeamId)?.name || 'Team';
        if (member) showToast(`Moved ${member.name} to ${toName}`, 'success');
    };

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
                    account: "My Profile",
                    "my-profile": "My Profile",
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

    // Personal details edit mode + saved snapshot
    const [savedPersonal, setSavedPersonal] = useState({
        name: "John Doe",
        email: "john.doe@company.com",
        phone: "+1 555-123-4567"
    });
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);

    // Professional details edit mode + saved snapshot
    const [savedProfessional, setSavedProfessional] = useState({
        jobTitle: "Lead Developer",
        department: "Engineering",
        manager: "Sarah Johnson"
    });
    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [professionalSaved, setProfessionalSaved] = useState(false);

    // About Me & Skills edit mode + saved snapshot
    const [savedAbout, setSavedAbout] = useState({
        bio: "",
        skills: []
    });
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutSaved, setAboutSaved] = useState(false);

    // Team Assignment edit mode + saved snapshot
    const [savedTeams, setSavedTeams] = useState({
        mainTeam: {
            name: "Product Development",
            members: 8,
            role: "Lead Developer",
        },
        otherTeams: [
            { name: "Marketing", role: "Contributor", members: 5 },
            { name: "Design System", role: "Reviewer", members: 3 },
        ],
    });
    const [isEditingTeams, setIsEditingTeams] = useState(false);
    const [teamsSaved, setTeamsSaved] = useState(false);

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

    // Copy backup codes to the clipboard (fallback if Clipboard API unavailable)
    const copyBackupCodes = async () => {
        if (!backupCodes || backupCodes.length === 0) return;
        const text = backupCodes.join("\n");
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) {
            // fall through to legacy path
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
        } finally {
            document.body.removeChild(ta);
        }
        return true;
    };

    // Hide backup codes from the UI after user is done (security hygiene)
    const doneWithBackupCodes = () => {
        setBackupCodes([]);
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
        const code = twoFADisableCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (code.length !== 6) return false;
        if (ALLOW_ANY_CODE_FOR_TEST) return true;
        // Accept if matches last 6 of secret in non-test mode
        if (twoFASecret && code === twoFASecret.slice(-6).toUpperCase()) return true;
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

    // Initialize draft fields from saved snapshots on mount (one-time initialization)
    useEffect(() => {
        setPersonalDraft({
            name: savedPersonal.name,
            email: savedPersonal.email,
            phone: savedPersonal.phone,
        });
        setProfessionalDraft({
            jobTitle: savedProfessional.jobTitle,
            department: savedProfessional.department,
            manager: savedProfessional.manager,
        });
        setTeamDraft({
            mainTeamName: savedTeams.mainTeam?.name || "",
            otherTeams: savedTeams.otherTeams || [],
        });
    // Initialize form fields from saved snapshots on mount (one-time initialization)
    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            name: prev.name || savedPersonal.name,
            email: prev.email || savedPersonal.email,
            phone: prev.phone || savedPersonal.phone,
            jobTitle: prev.jobTitle || savedProfessional.jobTitle,
            department: prev.department || savedProfessional.department,
            manager: prev.manager || savedProfessional.manager,
            bio: typeof prev.bio === 'string' && prev.bio.length > 0 ? prev.bio : (savedAbout.bio || ""),
            skills: Array.isArray(prev.skills) && prev.skills.length > 0 ? prev.skills : (savedAbout.skills || []),
            teams: {
                ...(prev.teams || {}),
                mainTeam: prev.teams?.mainTeam || savedTeams.mainTeam,
                otherTeams: prev.teams?.otherTeams || savedTeams.otherTeams,
                canCreateTeams: typeof prev.teams?.canCreateTeams === 'boolean' ? prev.teams.canCreateTeams : true,
                canJoinTeams: typeof prev.teams?.canJoinTeams === 'boolean' ? prev.teams.canJoinTeams : true,
            },
        }));
    }, []); // Only run once on mount

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
            showToast('Preferences saved', 'success');
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
            showToast('Privacy settings saved', 'success');
        } catch (_) {
            // ignore
        }
    };

    // Optimized update function with memoization
    const upd = useCallback((k) => (e) => {
    // Derived team permissions (scoped to this component)
    const canCreateTeams = form?.teams?.canCreateTeams ?? true;
    const canJoinTeams = form?.teams?.canJoinTeams ?? true;
    const canManageTeams = canCreateTeams; // simple gate for demo
    const upd = (k) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        
        setForm((s) => {
            if (s[k] === value) return s;
            return { ...s, [k]: value };
        });
        
        // Clear error when user starts typing
        if (errors[k]) {
            setErrors((prev) => {
                if (!prev[k]) return prev;
                const { [k]: _, ...rest } = prev;
                return rest;
            });
        }
    }, [errors]);

    // Helper function for updating widget preferences
    const updateWidgetPreference = useCallback((widgetKey) => (checked) => {
        React.startTransition(() => {
            setForm((s) => {
                if (s.widgetPreferences?.[widgetKey] === checked) return s;
                return {
                    ...s,
                    widgetPreferences: {
                        ...s.widgetPreferences,
                        [widgetKey]: checked,
                    },
                };
            });
        });
    }, []);

    // Helper function for updating notification settings
    const updateNotificationSetting = useCallback((key) => (checked) => {
        React.startTransition(() => {
            setForm((s) => {
                if (s.notifications?.[key] === checked) return s;
                return {
                    ...s,
                    notifications: {
                        ...s.notifications,
                        [key]: checked,
                    },
                };
            });
        });
    }, []);

    // Helper function for updating eNPS privacy settings
    const updateEnpsPrivacySetting = useCallback((settingKey) => (checked) => {
        React.startTransition(() => {
            setForm((s) => {
                if (s.enpsPrivacySettings?.[settingKey] === checked) return s;
                return {
                    ...s,
                    enpsPrivacySettings: {
                        ...s.enpsPrivacySettings,
                        [settingKey]: checked,
                    },
                };
            });
        });
    }, []);

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
            security: {
                ...s.security,
                twoFactorStatus: twoFAEnabled ? 'enabled' : (twoFASetupMode === 'verify' ? 'pending' : 'disabled'),
            },
        }));
    }, [twoFAEnabled, twoFASetupMode]);

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
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Profile updated:", form);
            setAccountSaved(true);
            setTimeout(() => setAccountSaved(false), 2000);
        } catch (error) {
            console.error("Failed to logout all sessions:", error);
        } finally {
            setIsLoading(false);
            setShowLogoutModal(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowed.includes(file.type)) {
                setErrors((prev) => ({ ...prev, avatar: 'Unsupported format. Use JPG, PNG or WEBP.' }));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                // 5MB limit
                setErrors((prev) => ({ ...prev, avatar: "File size must be less than 5MB" }));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                // Open cropper modal with selected image (WhatsApp-style flow)
                setCapturedImage(e.target.result);
                setShowImagePreview(true);
                setCrop({ x: 0, y: 0 });
                setCropZoom(1);
                setErrors((prev) => ({ ...prev, avatar: null }));
                setAvatarOriginal(e.target.result);
                setAvatarPreview(e.target.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
            setErrors((prev) => ({ ...prev, avatar: null }));
        }
    };

    // Camera capture functionality
    const checkCameraPermission = async () => {
        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            setCameraPermission(result.state);
            return result.state;
        } catch (err) {
            // Permissions API not supported, will handle during getUserMedia
            return 'prompt';
        }
    };

    const openCamera = async () => {
        try {
            // Request high quality video with selected facing mode
            // Browser will show native permission prompt
            const constraints = { 
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setCameraActive(true);
            setCameraPermission('granted');
            
            // Apply zoom if supported
            const videoTrack = stream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            if (capabilities.zoom) {
                setZoom(capabilities.zoom.min || 1);
            }
            
            // Wait for next tick to ensure video element is rendered
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error('Video play error:', e));
                }
            }, 100);
        } catch (err) {
            console.error('Camera access failed:', err);
            setCameraPermission('denied');
            // Show friendly error message
            setErrors((prev) => ({ 
                ...prev, 
                avatar: 'Camera access denied. Please allow camera in browser settings or choose a file instead.' 
            }));
        }
    };

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setZoom(1);
    };

    const flipCamera = async () => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);
        
        // Restart camera with new facing mode
        closeCamera();
        
        setTimeout(() => {
            openCamera();
        }, 100);
    };

    const applyZoom = (newZoom) => {
        try {
            if (streamRef.current) {
                const videoTrack = streamRef.current.getVideoTracks()[0];
                const capabilities = videoTrack.getCapabilities();
                
                if (capabilities.zoom) {
                    const clampedZoom = Math.max(
                        capabilities.zoom.min,
                        Math.min(newZoom, capabilities.zoom.max)
                    );
                    videoTrack.applyConstraints({
                        advanced: [{ zoom: clampedZoom }]
                    });
                    setZoom(clampedZoom);
                }
            }
        } catch (err) {
            console.error('Zoom failed:', err);
        }
    };

    const capturePhoto = () => {
        try {
            const video = videoRef.current;
            if (!video) return;

            const videoWidth = video.videoWidth || 1920;
            const videoHeight = video.videoHeight || 1080;
            
            // Calculate square crop dimensions (center crop)
            const size = Math.min(videoWidth, videoHeight);
            const offsetX = (videoWidth - size) / 2;
            const offsetY = (videoHeight - size) / 2;

            // Create square canvas for circular avatar
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            // Draw the center square portion of the video
            ctx.drawImage(
                video, 
                offsetX, offsetY, size, size,  // Source (crop from video)
                0, 0, size, size                // Destination (full canvas)
            );
            
            // Convert to high quality JPEG (0.95 quality)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

            // Open cropper (WhatsApp-style) instead of static preview
            setCapturedImage(dataUrl);
            setCrop({ x: 0, y: 0 });
            setCropZoom(1);
            setShowImagePreview(true);
            closeCamera();
        } catch (err) {
            console.error('Capture failed:', err);
            setErrors((prev) => ({ ...prev, avatar: 'Failed to capture photo' }));
        }
    };

    // Helper to crop using canvas, with optional CSS-like filter string
    const getCroppedImg = async (imageSrc, pixelCrop, asCircle = true, filterCss = 'none') => {
        const image = new Image();
        image.src = imageSrc;
        await new Promise((res, rej) => {
            image.onload = res;
            image.onerror = rej;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // Draw the cropped area
        if (asCircle) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(pixelCrop.width / 2, pixelCrop.height / 2, pixelCrop.width / 2, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip();
        }

        // Apply filter if any
        try { ctx.filter = filterCss || 'none'; } catch (_) {}
        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        if (asCircle) ctx.restore();

        return canvas.toDataURL('image/jpeg', 0.95);
    };

    const saveImage = async () => {
        if (capturedImage && croppedAreaPixels) {
            try {
                const filterCss = getAvatarFilterCss(avatarFilter);
                const croppedDataUrl = await getCroppedImg(capturedImage, croppedAreaPixels, true, filterCss);
                setAvatarOriginal(croppedDataUrl);
                setAvatarPreview(croppedDataUrl);
                try { localStorage.setItem('pm:user:avatar', croppedDataUrl); } catch (_) {}
                try { localStorage.setItem('pm:user:avatar:filter', avatarFilter); } catch (_) {}
                setShowImagePreview(false);
                setCapturedImage(null);
                setErrors((prev) => ({ ...prev, avatar: null }));
                showToast('Profile photo updated', 'success');
            } catch (e) {
                console.error('Cropping failed:', e);
                setErrors((prev) => ({ ...prev, avatar: 'Failed to crop image' }));
            }
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setShowImagePreview(false);
        openCamera();
    };

    const discardPhoto = () => {
        setCapturedImage(null);
        setShowImagePreview(false);
    };

    // cropper removed — uploaded image is used as-is (resized client-side when saved)

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
                className={`h-10 w-full rounded border px-3 pr-10 text-sm outline-none focus:border-blue-500 ${
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
                        <h1 className="mb-3 text-base font-semibold text-gray-700">Profile Settings</h1>

                        <div className="grid gap-4 lg:grid-cols-[200px_auto]">
                            {/* Left tabs - horizontal on mobile, vertical on desktop */}
                            <nav className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-sm">
                                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1 lg:gap-0">

                                    {["My Profile", "Security", "Preferences", "Integrations", "Privacy", "Teams & Members"].map((t) => (

                               
                                        <button
                                            key={t}
                                            onClick={() => setActiveTab(t)}
                                            className={
                                                "rounded px-2 py-2 text-left text-sm lg:mb-1 lg:w-full lg:px-3 " +
                                                (activeTab === t
                                                    ? "bg-white text-blue-700 shadow-inner font-medium"
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
                                {activeTab === "My Profile" && (
                                    <div className="space-y-6">
                                        {/* Profile Picture Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile Picture</h3>
                                            <div className="flex items-center gap-6">
                                                {/* Avatar with upload and crop */}
                                                <div className="relative">
                                                    <div className="relative">
                                                        {avatarRing !== 'none' ? (
                                                            <div className="p-[3px] rounded-full" style={getRingWrapperStyle(avatarRing)}>
                                                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                                                                    {avatarPreview ? (
                                                                        <img
                                                                            src={avatarPreview}
                                                                            alt="Profile"
                                                                            className="w-full h-full object-cover"
                                                                            style={{ filter: getAvatarFilterCss(avatarFilter) }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl sm:text-2xl">
                                                                            👤
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                                                                {avatarPreview ? (
                                                                    <img
                                                                        src={avatarPreview}
                                                                        alt="Profile"
                                                                        className="w-full h-full object-cover"
                                                                        style={{ filter: getAvatarFilterCss(avatarFilter) }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl sm:text-2xl">
                                                                        👤
                                                                    </div>
                                                                )}
                                {activeTab === "Account" && (
                                    <div className="space-y-6">
                                        {/* Profile Picture Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
                                            <div className="flex items-center gap-6">
                                                {/* Avatar with upload and crop */}
                                                <div className="relative">
                                                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                                                        {avatarPreview ? (
                                                            <img
                                                                src={avatarPreview}
                                                                alt="Profile"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">
                                                                👤
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        ref={cameraButtonRef}
                                                        onClick={() => setShowCameraOptions(!showCameraOptions)}
                                                        className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm hover:bg-blue-700 transition-colors shadow-lg"
                                                        title="Take photo with camera"
                                                    >
                                                        📷
                                                    </button>
                                                    
                                                    {/* Camera Options Dropdown */}
                                                    {showCameraOptions && (
                                                        <div ref={cameraOptionsRef} className="absolute -bottom-2 right-10 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 min-w-[200px]">
                                                            <button
                                                                onClick={() => {
                                                                    setFacingMode('user');
                                                                    setShowCameraOptions(false);
                                                                    openCamera();
                                                                }}
                                                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                                <span>Front Camera</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setFacingMode('environment');
                                                                    setShowCameraOptions(false);
                                                                    openCamera();
                                                                }}
                                                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span>Back Camera</span>
                                                            </button>
                                                            <div className="border-t border-gray-100 my-1"></div>
                                                            <button
                                                                onClick={() => {
                                                                    setShowCameraOptions(false);
                                                                    fileRef.current?.click();
                                                                }}
                                                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <span>Choose from Files</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowCameraOptions(false);
                                                                    setShowAvatarModal(true);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
                                                                </svg>
                                                                <span>Create Avatar</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                        onClick={() => fileRef.current?.click()}
                                                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-blue-700 transition-colors shadow-lg"
                                                    >
                                                        📷
                                                    </button>
                                                    <input
                                                        ref={fileRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAvatarChange}
                                                        className="hidden"
                                                    />
                                                </div>
                                                
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-700 font-medium mb-2">Profile Picture</p>
                                                    <p className="text-sm text-gray-500">Click the camera icon to take a photo or upload from files</p>
                                                    {errors.avatar && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.avatar}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Camera Capture Modal */}
                                        {cameraActive && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                                                {/* Camera Controls Overlay */}
                                                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
                                                    <div className="flex justify-between items-center">
                                                        <button 
                                                            onClick={closeCamera} 
                                                            className="text-white text-3xl leading-none hover:text-gray-300"
                                                            aria-label="Close camera"
                                                        >
                                                            ×
                                                        </button>
                                                        <button
                                                            onClick={flipCamera}
                                                            className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                                                            title="Flip camera"
                                                        >
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => fileRef.current?.click()}
                                                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Upload Photo
                                                        </button>
                                                        {avatarOriginal && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowCropper(true)}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Crop Photo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Video Preview - Full Screen */}
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <video 
                                                        ref={videoRef} 
                                                        className="w-full h-full object-cover" 
                                                        playsInline 
                                                        muted 
                                                        autoPlay
                                                    />
                                                    
                                                    {/* Circular crop guide overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="relative" style={{ width: '60%', maxWidth: '400px', paddingBottom: '60%', maxHeight: '400px' }}>
                                                            <div className="absolute inset-0 rounded-full border-4 border-white/70 shadow-2xl"></div>
                                                            <div className="absolute inset-0 rounded-full border-2 border-blue-400/50"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bottom Controls */}
                                                <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/70 to-transparent">
                                                    {/* Zoom Control (if supported) */}
                                                    {streamRef.current && (
                                                        <div className="mb-6 px-8">
                                                            <input
                                                                type="range"
                                                                min="1"
                                                                max="3"
                                                                step="0.1"
                                                                value={zoom}
                                                                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                                                                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Capture Button (WhatsApp style) */}
                                                    <div className="flex justify-center items-center gap-8">
                                                        <button 
                                                            onClick={closeCamera}
                                                            className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                                                        >
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                        
                                                        {/* Large Capture Button */}
                                                        <button 
                                                            onClick={capturePhoto}
                                                            className="relative group"
                                                        >
                                                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:bg-white transition-colors shadow-2xl">
                                                                <div className="w-16 h-16 rounded-full bg-white border-4 border-gray-800"></div>
                                                            </div>
                                                        </button>

                                                        <button
                                                            onClick={() => fileRef.current?.click()}
                                                            className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                                                            title="Choose from gallery"
                                                        >
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Cropper Modal (WhatsApp-style) */}
                                        {showImagePreview && capturedImage && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                                                <div className="w-full h-full flex flex-col">
                                                    {/* Header */}
                                                    <div className="p-4 bg-gradient-to-b from-black/70 to-transparent">
                                                        <div className="flex justify-between items-center">
                                                            <button 
                                                                onClick={discardPhoto}
                                                                className="text-white text-3xl leading-none hover:text-gray-300"
                                                            >
                                                                ×
                                                            </button>
                                                            <h3 className="text-white font-medium">Adjust and Crop</h3>
                                                            <div className="w-8"></div>
                                                        </div>
                                                    </div>

                                                    {/* Cropper */}
                                                    <div className="flex-1 relative">
                                                        <Cropper
                                                            image={capturedImage}
                                                            crop={crop}
                                                            zoom={cropZoom}
                                                            aspect={1}
                                                            cropShape="round"
                                                            showGrid={false}
                                                            onCropChange={setCrop}
                                                            onZoomChange={setCropZoom}
                                                            onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                                                        />
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="p-4 bg-gradient-to-t from-black/70 to-transparent">
                                                        <div className="max-w-lg mx-auto">
                                                            <input
                                                                type="range"
                                                                min={1}
                                                                max={4}
                                                                step={0.01}
                                                                value={cropZoom}
                                                                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        {/* Modern filter presets */}
                                                        <div className="mt-4 max-w-lg mx-auto grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                            {Object.keys(avatarFilterPresets).map((key) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => setAvatarFilter(key)}
                                                                    className={`rounded overflow-hidden border text-[10px] uppercase tracking-wide ${avatarFilter === key ? 'border-blue-500' : 'border-white/30'}`}
                                                                >
                                                                    <div className="w-full aspect-square">
                                                                        <img src={capturedImage} alt={key} className="w-full h-full object-cover" style={{ filter: getAvatarFilterCss(key) }} />
                                                                    </div>
                                                                    <div className="px-1 py-1 text-center text-white/90">{key}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {/* Ring styles */}
                                                        <div className="mt-3 max-w-lg mx-auto flex items-center justify-center gap-2 flex-wrap">
                                                            {[{k:'none',l:'No Ring'},{k:'instagram',l:'Instagram'},{k:'blue',l:'Blue'},{k:'sunset',l:'Sunset'}].map(opt => (
                                                                <button key={opt.k} onClick={() => { setAvatarRing(opt.k); try { localStorage.setItem('pm:user:avatar:ring', opt.k); } catch(_){} }} className={`px-2 py-1 rounded text-xs ${avatarRing===opt.k?'bg-white text-black':'bg-white/15 text-white'} hover:bg-white/25`}>
                                                                    {opt.l}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="mt-4 flex justify-center items-center gap-6">
                                                            <button 
                                                                onClick={retakePhoto}
                                                                className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors text-white font-medium flex items-center gap-2"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                                Retake
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={saveImage}
                                                                className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-white font-medium flex items-center gap-2 shadow-lg"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Use Photo
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Personal Details Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-sm font-semibold text-gray-900">Personal Details</h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingPersonal ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPersonalDraft({
                                                                    name: savedPersonal.name,
                                                                    email: savedPersonal.email,
                                                                    phone: savedPersonal.phone,
                                                                });
                                                                setIsEditingPersonal(true);
                                                            }}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Enable Edit
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPersonalDraft({
                                                                        name: savedPersonal.name,
                                                                        email: savedPersonal.email,
                                                                        phone: savedPersonal.phone,
                                                                    });
                                                                    setErrors((e) => ({ ...e, name: undefined, email: undefined, phone: undefined }));
                                                                    setIsEditingPersonal(false);
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    const newErrors = {};
                                                                        if (!personalDraft.name.trim()) newErrors.name = "Name is required";
                                                                        if (!personalDraft.email.trim()) newErrors.email = "Email is required";
                                                                        else if (!/\S+@\S+\.\S+/.test(personalDraft.email)) newErrors.email = "Email is invalid";
                                                                        if (personalDraft.phone && !/^\+?[\d\s\-\(\)]+$/.test(personalDraft.phone)) newErrors.phone = "Phone number is invalid";
                                                                    setErrors((prev) => ({ ...prev, ...newErrors }));
                                                                    if (Object.keys(newErrors).length) return;

                                                                    setIsLoading(true);
                                                                    await new Promise((r) => setTimeout(r, 800));
                                                                    setIsLoading(false);
                                                                        const trimmed = {
                                                                            name: personalDraft.name.trim(),
                                                                            email: personalDraft.email.trim(),
                                                                            phone: personalDraft.phone.trim(),
                                                                        };
                                                                        setSavedPersonal(trimmed);
                                                                        setPersonalDraft(trimmed);
                                                                    setIsEditingPersonal(false);
                                                                    setAccountSaved(true);
                                                                    setTimeout(() => setAccountSaved(false), 2500);
                                                                    showToast('Personal details saved', 'success');
                                                                }}
                                                                disabled={isLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoading ? "Saving..." : "Save"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Read-only view */}
                                            {!isEditingPersonal ? (
                                                <div className="flex flex-col gap-3 text-sm text-gray-900 md:flex-row md:flex-wrap md:items-center md:gap-6">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</span>
                                                        <span className="text-base">🙎</span>
                                                        <span className="font-medium break-all">{savedPersonal.name || "—"}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                                                        <span className="text-base">✉️</span>
                                                        <span className="font-medium break-all">{savedPersonal.email || "—"}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                                                        <span className="text-base">📞</span>
                                                        <span className="font-medium break-all">{savedPersonal.phone || "—"}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                                            <input type="text" value={personalDraft.name} onChange={handlePersonalChange('name')} className="mt-1 w-full border rounded-lg p-2.5 text-sm focus:ring focus:border-blue-500" />
                                                            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Email</label>
                                                            <input type="email" value={personalDraft.email} onChange={handlePersonalChange('email')} className="mt-1 w-full border rounded-lg p-2.5 text-sm focus:ring focus:border-blue-500" />
                                                            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                                                            <input type="tel" value={personalDraft.phone} onChange={handlePersonalChange('phone')} className="mt-1 w-full border rounded-lg p-2.5 text-sm focus:ring focus:border-blue-500" />
                                                            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Success Toast */}
                                            {accountSaved && (
                                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                    <span className="text-green-600">✓</span>
                                                    <span className="text-sm font-medium">Personal details saved successfully!</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Password & Email Change Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-6">Password & Email Settings</h3>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Change Password */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (changeMode === 'password') {
                                                                    setPasswordDraft({ current: '', next: '', confirm: '' });
                                                                    setErrors(e => ({ ...e, oldPw: null, newPw: null, confirmPw: null }));
                                                                }
                                                                setChangeMode(changeMode === 'password' ? null : 'password');
                                                            }}
                                                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            {changeMode === 'password' ? 'Cancel' : 'Change'}
                                                        </button>
                                                    </div>
                                                    
                                                    {changeMode === 'password' && (
                                                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                                            <Field label="Current Password" error={errors.oldPw}>
                                                                <PasswordField 
                                                                    value={passwordDraft.current} 
                                                                    onChange={handlePasswordChange('current')} 
                                                                    placeholder="Enter current password" 
                                                                    open={showPw.old} 
                                                                    toggle={() => setShowPw((s) => ({ ...s, old: !s.old }))} 
                                                                    error={errors.oldPw} 
                                                                />
                                                            </Field>
                                                            <Field label="New Password" error={errors.newPw}>
                                                                <PasswordField 
                                                                    value={passwordDraft.next} 
                                                                    onChange={handlePasswordChange('next')} 
                                                                    placeholder="Enter new password" 
                                                                    open={showPw.new1} 
                                                                    toggle={() => setShowPw((s) => ({ ...s, new1: !s.new1 }))} 
                                                                    error={errors.newPw} 
                                                                />
                                                            </Field>
                                                            <Field label="Confirm Password" error={errors.confirmPw}>
                                                                <PasswordField 
                                                                    value={passwordDraft.confirm} 
                                                                    onChange={handlePasswordChange('confirm')} 
                                                                    placeholder="Confirm new password" 
                                                                    open={showPw.new2} 
                                                                    toggle={() => setShowPw((s) => ({ ...s, new2: !s.new2 }))} 
                                                                    error={errors.confirmPw} 
                                                                />
                                                            </Field>
                                                            <div className="flex justify-end">
                                                                <button 
                                                                    type="button" 
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors" 
                                                                    onClick={async () => {
                                                                        const errs = {};
                                                                        if (!passwordDraft.current) errs.oldPw = 'Current password is required';
                                                                        if (!passwordDraft.next || passwordDraft.next.length < 8) errs.newPw = 'Minimum 8 characters';
                                                                        if (passwordDraft.next !== passwordDraft.confirm) errs.confirmPw = 'Passwords do not match';
                                                                        setErrors((e) => ({ ...e, ...errs }));
                                                                        if (Object.keys(errs).length) return;
                                                                        setIsLoading(true);
                                                                        await new Promise(r => setTimeout(r, 1000));
                                                                        setIsLoading(false);
                                                                        setPasswordDraft({ current: '', next: '', confirm: '' });
                                                                        setPasswordSaved(true);
                                                                        setTimeout(() => {
                                                                            setPasswordSaved(false);
                                                                            setChangeMode(null);
                                                                        }, 3000);
                                                                        showToast('Password updated', 'success');
                                                                    }}
                                                                >
                                                                    Update Password
                                                                </button>
                                                            </div>
                                                            {passwordSaved && (
                                                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                                    <span className="text-green-600">✓</span>
                                                                    <span className="text-sm font-medium">Password updated successfully!</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Change Email */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium text-gray-900">Change Email</h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (changeMode === 'email') {
                                                                    setEmailDraft({ current: '', next: '' });
                                                                    setErrors((e) => ({ ...e, oldEmail: null, newEmail: null }));
                                                                }
                                                                setChangeMode(changeMode === 'email' ? null : 'email');
                                                            }}
                                                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            {changeMode === 'email' ? 'Cancel' : 'Change'}
                                                        </button>
                                                    </div>
                                                    
                                                    {changeMode === 'email' && (
                                                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                                            <Field label="Current Email" error={errors.oldEmail}>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <span className="text-gray-500 text-lg">✉️</span>
                                                                    </div>
                                                                    <input 
                                                                        type="email" 
                                                                        value={emailDraft.current} 
                                                                        onChange={handleEmailChange('current')} 
                                                                        placeholder="Current email address" 
                                                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors ${errors.oldEmail ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                                                    />
                                                                </div>
                                                            </Field>
                                                            <Field label="New Email" error={errors.newEmail}>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <span className="text-gray-500 text-lg">✉️</span>
                                                                    </div>
                                                                    <input 
                                                                        type="email" 
                                                                        value={emailDraft.next} 
                                                                        onChange={handleEmailChange('next')} 
                                                                        placeholder="New email address" 
                                                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors ${errors.newEmail ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                                                    />
                                                                </div>
                                                            </Field>
                                                            <div className="flex justify-end">
                                                                <button 
                                                                    type="button" 
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors" 
                                                                    onClick={async () => {
                                                                        const errs = {};
                                                                        if (!emailDraft.current) errs.oldEmail = 'Current email is required';
                                                                        if (!emailDraft.next) errs.newEmail = 'New email is required';
                                                                        else if (!/\S+@\S+\.\S+/.test(emailDraft.next)) errs.newEmail = 'Email is invalid';
                                                                        setErrors((e) => ({ ...e, ...errs }));
                                                                        if (Object.keys(errs).length) return;
                                                                        setIsLoading(true);
                                                                        await new Promise(r => setTimeout(r, 1000));
                                                                        setIsLoading(false);
                                                                        setEmailSaved(true);
                                                                        setTimeout(() => {
                                                                            setEmailSaved(false);
                                                                            setChangeMode(null);
                                                                        }, 3000);
                                                                        setEmailDraft({ current: '', next: '' });
                                                                        showToast('Email updated', 'success');
                                                                    }}
                                                                >
                                                                    Update Email
                                                                </button>
                                                            </div>
                                                            {emailSaved && (
                                                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                                    <span className="text-green-600">✓</span>
                                                                    <span className="text-sm font-medium">Email updated successfully!</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Professional Details Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-sm font-semibold text-gray-900">Professional Details</h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingProfessional ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setProfessionalDraft({
                                                                    jobTitle: savedProfessional.jobTitle,
                                                                    department: savedProfessional.department,
                                                                    manager: savedProfessional.manager,
                                                                });
                                                                setIsEditingProfessional(true);
                                                    <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF (max. 5MB)</p>
                                                    {errors.avatar && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.avatar}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Personal Details Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingPersonal ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Ensure form shows saved values when entering edit mode
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    name: savedPersonal.name,
                                                                    email: savedPersonal.email,
                                                                    phone: savedPersonal.phone,
                                                                }));
                                                                setIsEditingPersonal(true);
                                                            }}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Enable Edit
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setProfessionalDraft({
                                                                        jobTitle: savedProfessional.jobTitle,
                                                                        department: savedProfessional.department,
                                                                        manager: savedProfessional.manager,
                                                                    });
                                                                    setIsEditingProfessional(false);


                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    // Minimal validation: allow empty, but trim values
                                                                    setIsLoading(true);
                                                                    await new Promise((r) => setTimeout(r, 800));
                                                                    setIsLoading(false);
                                                                    setSavedProfessional({
                                                                        jobTitle: (professionalDraft.jobTitle || "").trim(),
                                                                        department: (professionalDraft.department || "").trim(),
                                                                        manager: (professionalDraft.manager || "").trim(),
                                                                    });
                                                                    setProfessionalDraft({
                                                                        jobTitle: (professionalDraft.jobTitle || "").trim(),
                                                                        department: (professionalDraft.department || "").trim(),
                                                                        manager: (professionalDraft.manager || "").trim(),
                                                                    });
                                                                    setIsEditingProfessional(false);
                                                                    setProfessionalSaved(true);
                                                                    setTimeout(() => setProfessionalSaved(false), 2500);
                                                                    showToast('Professional details saved', 'success');

                                                                }}
                                                                disabled={isLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoading ? "Saving..." : "Save"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Read-only view */}
                                            {!isEditingProfessional ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Job Title</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">💼</span>
                                                            <span className="font-medium break-all">{savedProfessional.jobTitle || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Department</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">🏢</span>
                                                            <span className="font-medium break-all">{savedProfessional.department || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Manager</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">👨‍💼</span>
                                                            <span className="font-medium break-all">{savedProfessional.manager || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {/* Job Title */}
                                                    <Field label="Job Title">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">💼</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={professionalDraft.jobTitle}
                                                                onChange={handleProfessionalChange("jobTitle")}
                                                                placeholder="e.g., Product Manager"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Department */}
                                                    <Field label="Department">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">🏢</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={professionalDraft.department}
                                                                onChange={handleProfessionalChange("department")}
                                                                placeholder="e.g., Engineering"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Manager */}
                                                    <Field label="Manager">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">👨‍💼</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={professionalDraft.manager}
                                                                onChange={handleProfessionalChange("manager")}
                                                                placeholder="Manager name"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>
                                                </div>
                                            )}

                                            {/* Success Toast */}
                                            {professionalSaved && (
                                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                    <span className="text-green-600">✓</span>
                                                    <span className="text-sm font-medium">Professional details saved successfully!</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Team Assignment Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-sm font-semibold text-gray-900">Team Assignment</h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingTeams ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTeamDraft({
                                                                    mainTeamName: savedTeams.mainTeam?.name || "",
                                                                    otherTeams: savedTeams.otherTeams || [],
                                                                });
                                                                setIsEditingTeams(true);
                                                            }}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Enable Edit
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTeamDraft({
                                                                        mainTeamName: savedTeams.mainTeam?.name || "",
                                                                        otherTeams: savedTeams.otherTeams || [],
                                                                    });
                                                                    setIsEditingTeams(false);
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    setIsLoading(true);
                                                                    await new Promise((r) => setTimeout(r, 800));
                                                                    setIsLoading(false);
                                                                    // Commit to saved snapshot
                                                                    const sanitizedMainName = (teamDraft.mainTeamName || "").trim();
                                                                    const sanitizedOtherTeams = (teamDraft.otherTeams || [])
                                                                        .map((team) => ({ ...team, name: team.name.trim() }))
                                                                        .filter((team) => team.name.length > 0);
                                                                    setSavedTeams((prev) => ({
                                                                        mainTeam: { ...prev.mainTeam, name: sanitizedMainName },
                                                                        otherTeams: sanitizedOtherTeams,
                                                                    }));
                                                                    setTeamDraft({
                                                                        mainTeamName: sanitizedMainName,
                                                                        otherTeams: sanitizedOtherTeams,
                                                                    });
                                                                    setIsEditingTeams(false);
                                                                    setTeamsSaved(true);
                                                                    setTimeout(() => setTeamsSaved(false), 2500);
                                                                    showToast('Team assignment saved', 'success');
                                                                }}
                                                                disabled={isLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoading ? "Saving..." : "Save"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Read-only view */}
                                            {!isEditingTeams ? (
                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Main Team</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">👥</span>
                                                            <span className="font-medium break-all">{savedTeams.mainTeam?.name || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Other Teams</div>
                                                        {Array.isArray(savedTeams.otherTeams) && savedTeams.otherTeams.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {savedTeams.otherTeams.map((t, i) => (
                                                                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full border border-gray-200">
                                                                        {t.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">No additional teams</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Main Team */}
                                                    <Field label="Main Team">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">👥</span>
                                                            </div>
                                                            <input
                                                                value={teamDraft.mainTeamName}
                                                                onChange={(e) => updateTeamDraftName(e.target.value)}
                                                                placeholder="Your primary team"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Other Teams */}
                                                    <div>
                                                        <Field label="Add Other Team">
                                                            <div className="flex gap-3">
                                                                <div className="relative flex-1">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <span className="text-gray-500 text-lg">👥</span>
                                                                    </div>
                                                                    <input 
                                                                        id="addOtherTeam" 
                                                                        placeholder="Team name" 
                                                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                                                                    />
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0" 
                                                                    onClick={() => {
                                                                        const el = document.getElementById('addOtherTeam');
                                                                        const name = el?.value?.trim();
                                                                        if (!name) return;
                                                                        setTeamDraft((prev) => ({
                                                                            ...prev,
                                                                            otherTeams: [...(prev.otherTeams || []), { name, role: 'Contributor', members: 0 }],
                                                                        }));
                                                                        if (el) el.value = '';
                                                                    }}
                                                                >
                                                                    Add Team
                                                                </button>
                                                            </div>
                                                        </Field>
                                                        
                                                        {/* Other Teams List */}
                                                        {(teamDraft.otherTeams || []).length > 0 && (
                                                            <div className="mt-4">
                                                                <label className="block text-sm font-medium text-gray-700 mb-3">Other Teams</label>
                                                                <div className="space-y-2">
                                                                    {(teamDraft.otherTeams || []).map((team, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-lg">👥</span>
                                                                                <div>
                                                                                    <span className="font-medium text-gray-900">{team.name}</span>
                                                                                    <span className="text-sm text-gray-500 ml-2">• {team.role}</span>
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                type="button" 
                                                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors" 
                                                                                onClick={() => setTeamDraft((prev) => ({
                                                                                    ...prev,
                                                                                    otherTeams: (prev.otherTeams || []).filter((_, i) => i !== idx),
                                                                                }))}
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Success Toast */}
                                            {teamsSaved && (
                                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                    <span className="text-green-600">✓</span>
                                                    <span className="text-sm font-medium">Team assignment saved successfully!</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "Preferences" && (
                                    <div className="space-y-4">

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

                                        {/* Dashboard Preferences removed */}
                                    </div>
                                )}

                                {activeTab === "Integrations" && (
                                    <div className="space-y-4">

                                        {/* helper to render a provider card */}
                                        {(() => {
                                            const Card = ({ logo, title, color, desc, provider }) => {
                                                const data = integrations[provider] || {};
                                                const connected = !!data.connected;
                                                const badgeCls = connected ? "bg-green-600 text-white" : "bg-gray-300 text-gray-800";
                                                const btnText = connected ? "Revoke" : "Connect";
                                                const btnAction = () => connected ? disconnectIntegration(provider) : connectIntegration(provider);
                                                const btnStyle = connected ? "bg-gray-200 text-gray-900" : `${color} text-white`;
                                                const borderlessProviders = ["google", "outlook", "apple", "zoho"];
                                                const cardBaseClasses = borderlessProviders.includes(provider)
                                                    ? "p-3 sm:p-4"
                                                    : "rounded border border-gray-300 p-3 sm:p-4";
                                                return (
                                                    <div className={cardBaseClasses}>
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
                                        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div className="flex gap-2">
                                                    <div className="relative">
                                                        <input
                                                            value={memberSearch}
                                                            onChange={(e)=>setMemberSearch(e.target.value)}
                                                            placeholder="Search members by name or role"
                                                            className="pl-8 pr-3 py-2 rounded border text-sm outline-none focus:border-blue-500"
                                                        />
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">🔎</span>
                                                    </div>
                                                    <select
                                                        value={roleFilter}
                                                        onChange={(e)=>setRoleFilter(e.target.value)}
                                                        className="px-2 py-2 rounded border text-sm outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">All roles</option>
                                                        <option value="lead">Lead</option>
                                                        <option value="contributor">Contributor</option>
                                                        <option value="reviewer">Reviewer</option>
                                                        <option value="designer">Designer</option>
                                                        <option value="engineer">Engineer</option>
                                                        <option value="pm">PM</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                                {teamsBoard.map((team) => (
                                                    <div
                                                        key={team.id}
                                                        className={`rounded-lg border ${dragOverTeam===team.id ? 'border-blue-400' : 'border-gray-200'} bg-gray-50`}
                                                        onDragOver={(e)=>onDragOverTeam(e, team.id)}
                                                        onDrop={(e)=>onDropOnTeam(e, team.id)}
                                                    >
                                                        <div className="px-3 py-2 bg-white rounded-t-lg border-b flex items-center justify-between">
                                                            <div className="text-sm font-semibold text-gray-800 truncate" title={team.name}>{team.name}</div>
                                                            <div className="text-xs text-gray-500">{(membersByTeam[team.id]||[]).length}</div>
                                                        </div>
                                                        <div className="p-3 min-h-[140px] space-y-2">
                                                            {(filteredMembersByTeam[team.id]||[]).map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    draggable
                                                                    onDragStart={(e)=>onDragStartMember(e, m.id, team.id)}
                                                                    className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0">
                                                                            {m.name.split(' ').map(s=>s[0]).join('').slice(0,2)}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="text-sm font-medium text-gray-800 truncate" title={m.name}>{m.name}</div>
                                                                            <div className="text-xs text-gray-500 truncate">{m.role}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">⋮⋮</div>
                                                                </div>
                                                            ))}
                                                            {(filteredMembersByTeam[team.id]||[]).length === 0 && (
                                                                <div className="text-xs text-gray-500 text-center py-6">
                                                                    {memberSearch || roleFilter ? 'No matches' : 'Drop members here'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "Security" && (
                                    <div className="space-y-4">
                                                {/* Change Email */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium text-gray-900">Change Email</h4>
                                                        <button
                                                            type="button"
                                                            onClick={() => setChangeMode(changeMode === 'email' ? null : 'email')}
                                                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            {changeMode === 'email' ? 'Cancel' : 'Change'}
                                                        </button>
                                                    </div>
                                                    
                                                    {changeMode === 'email' && (
                                                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                                            <Field label="Current Email" error={errors.oldEmail}>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <span className="text-gray-500 text-lg">✉️</span>
                                                                    </div>
                                                                    <input 
                                                                        type="email" 
                                                                        value={form.oldEmail} 
                                                                        onChange={upd("oldEmail")} 
                                                                        placeholder="Current email address" 
                                                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors ${errors.oldEmail ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                                                    />
                                                                </div>
                                                            </Field>
                                                            <Field label="New Email" error={errors.newEmail}>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <span className="text-gray-500 text-lg">✉️</span>
                                                                    </div>
                                                                    <input 
                                                                        type="email" 
                                                                        value={form.newEmail} 
                                                                        onChange={upd("newEmail")} 
                                                                        placeholder="New email address" 
                                                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors ${errors.newEmail ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                                                    />
                                                                </div>
                                                            </Field>
                                                            <div className="flex justify-end">
                                                                <button 
                                                                    type="button" 
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors" 
                                                                    onClick={async () => {
                                                                        const errs = {};
                                                                        if (!form.oldEmail) errs.oldEmail = 'Current email is required';
                                                                        if (!form.newEmail) errs.newEmail = 'New email is required';
                                                                        else if (!/\S+@\S+\.\S+/.test(form.newEmail)) errs.newEmail = 'Email is invalid';
                                                                        setErrors((e) => ({ ...e, ...errs }));
                                                                        if (Object.keys(errs).length) return;
                                                                        setIsLoading(true);
                                                                        await new Promise(r => setTimeout(r, 1000));
                                                                        setIsLoading(false);
                                                                        setEmailSaved(true);
                                                                        setTimeout(() => {
                                                                            setEmailSaved(false);
                                                                            setChangeMode(null);
                                                                        }, 3000);
                                                                    }}
                                                                >
                                                                    Update Email
                                                                </button>
                                                            </div>
                                                            {emailSaved && (
                                                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                                    <span className="text-green-600">✓</span>
                                                                    <span className="text-sm font-medium">Email updated successfully!</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Professional Details Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-semibold text-gray-900">Professional Details</h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingProfessional ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Ensure form shows saved values when entering edit mode
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    jobTitle: savedProfessional.jobTitle,
                                                                    department: savedProfessional.department,
                                                                    manager: savedProfessional.manager,
                                                                }));
                                                                setIsEditingProfessional(true);
                                                            }}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Enable Edit
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    // Revert to saved and exit edit
                                                                    setForm((prev) => ({
                                                                        ...prev,
                                                                        jobTitle: savedProfessional.jobTitle,
                                                                        department: savedProfessional.department,
                                                                        manager: savedProfessional.manager,
                                                                    }));
                                                                    setIsEditingProfessional(false);
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    // Minimal validation: allow empty, but trim values
                                                                    setIsLoading(true);
                                                                    await new Promise((r) => setTimeout(r, 800));
                                                                    setIsLoading(false);
                                                                    setSavedProfessional({
                                                                        jobTitle: (form.jobTitle || "").trim(),
                                                                        department: (form.department || "").trim(),
                                                                        manager: (form.manager || "").trim(),
                                                                    });
                                                                    setIsEditingProfessional(false);
                                                                    setProfessionalSaved(true);
                                                                    setTimeout(() => setProfessionalSaved(false), 2500);
                                                                }}
                                                                disabled={isLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoading ? "Saving..." : "Save"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Read-only view */}
                                            {!isEditingProfessional ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Job Title</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">💼</span>
                                                            <span className="font-medium break-all">{savedProfessional.jobTitle || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Department</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">🏢</span>
                                                            <span className="font-medium break-all">{savedProfessional.department || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Manager</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">👨‍💼</span>
                                                            <span className="font-medium break-all">{savedProfessional.manager || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {/* Job Title */}
                                                    <Field label="Job Title">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">💼</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={form.jobTitle}
                                                                onChange={upd("jobTitle")}
                                                                placeholder="e.g., Product Manager"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Department */}
                                                    <Field label="Department">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">🏢</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={form.department}
                                                                onChange={upd("department")}
                                                                placeholder="e.g., Engineering"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Manager */}
                                                    <Field label="Manager">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">👨‍💼</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={form.manager}
                                                                onChange={upd("manager")}
                                                                placeholder="Manager name"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>
                                                </div>
                                            )}

                                            {/* Success Toast */}
                                            {professionalSaved && (
                                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                    <span className="text-green-600">✓</span>
                                                    <span className="text-sm font-medium">Professional details saved successfully!</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bio / Skills / About Me Section (Optional) */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-semibold text-gray-900">About Me & Skills <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingAbout ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    bio: savedAbout.bio || "",
                                                                    skills: savedAbout.skills || [],
                                                                }));
                                                                setIsEditingAbout(true);
                                                            }}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Enable Edit
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    // Revert and exit edit
                                                                    setForm((prev) => ({
                                                                        ...prev,
                                                                        bio: savedAbout.bio || "",
                                                                        skills: savedAbout.skills || [],
                                                                    }));
                                                                    setIsEditingAbout(false);
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    setIsLoading(true);
                                                                    await new Promise((r) => setTimeout(r, 800));
                                                                    setIsLoading(false);
                                                                    setSavedAbout({ bio: form.bio || "", skills: form.skills || [] });
                                                                    setIsEditingAbout(false);
                                                                    setAboutSaved(true);
                                                                    setTimeout(() => setAboutSaved(false), 2500);
                                                                }}
                                                                disabled={isLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoading ? "Saving..." : "Save"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Read-only view */}
                                            {!isEditingAbout ? (
                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Bio / About Me</div>
                                                        <div className="flex items-start gap-2 text-gray-900">
                                                            <span className="text-lg mt-0.5">📝</span>
                                                            <p className="text-sm whitespace-pre-wrap">{(savedAbout.bio || "").trim() || "—"}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-3">Skills</div>
                                                        {Array.isArray(savedAbout.skills) && savedAbout.skills.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {savedAbout.skills.map((skill, idx) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">No skills added yet</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Bio */}
                                                    <Field label="Bio / About Me">
                                                        <div className="relative">
                                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                                <span className="text-gray-500 text-lg">📝</span>
                                                            </div>
                                                            <textarea
                                                                value={form.bio}
                                                                onChange={upd("bio")}
                                                                placeholder="Tell us a bit about yourself..."
                                                                rows={4}
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Skills */}
                                                    <Field label="Skills">
                                                        <div className="space-y-3">
                                                            {/* Skills Display */}
                                                            {form.skills.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                                                                    {form.skills.map((skill, idx) => (
                                                                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200">
                                                                            {skill}
                                                                            <button 
                                                                                type="button" 
                                                                                className="text-blue-600 hover:text-blue-800 ml-1 text-xs" 
                                                                                onClick={() => setForm((st) => ({ ...st, skills: st.skills.filter((_, i) => i !== idx) }))}
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Add Skills Input */}
                                                            <div className="relative">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                    <span className="text-gray-500 text-lg">🎯</span>
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
                                                                    placeholder="Add skills (press Enter or comma to add)"
                                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                />
                                                            </div>
                                                            <p className="text-xs text-gray-500">Press Enter or comma to add skills. Click ✕ to remove.</p>
                                                        </div>
                                                    </Field>
                                                </div>
                                            )}

                                            {/* Success Toast */}
                                            {aboutSaved && (
                                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                    <span className="text-green-600">✓</span>
                                                    <span className="text-sm font-medium">About me & skills saved successfully!</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Team Assignment Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-semibold text-gray-900">Team Assignment</h3>
                                                <div className="flex items-center gap-2">
                                                    {!isEditingTeams ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Load saved into form for editing
                                                                setForm((s) => ({
                                                                    ...s,
                                                                    teams: {
                                                                        ...(s.teams || {}),
                                                                        mainTeam: savedTeams.mainTeam,
                                                                        otherTeams: savedTeams.otherTeams,
                                                                        canCreateTeams: s.teams?.canCreateTeams ?? true,
                                                                        canJoinTeams: s.teams?.canJoinTeams ?? true,
                                                                    },
                                                                }));
                                                                setIsEditingTeams(true);
                                                            }}
                                                            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            Enable Edit
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    // Revert and exit edit
                                                                    setForm((s) => ({
                                                                        ...s,
                                                                        teams: {
                                                                            ...(s.teams || {}),
                                                                            mainTeam: savedTeams.mainTeam,
                                                                            otherTeams: savedTeams.otherTeams,
                                                                        },
                                                                    }));
                                                                    setIsEditingTeams(false);
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    setIsLoading(true);
                                                                    await new Promise((r) => setTimeout(r, 800));
                                                                    setIsLoading(false);
                                                                    // Commit to saved snapshot
                                                                    setSavedTeams({
                                                                        mainTeam: form.teams?.mainTeam || { name: "" },
                                                                        otherTeams: form.teams?.otherTeams || [],
                                                                    });
                                                                    setIsEditingTeams(false);
                                                                    setTeamsSaved(true);
                                                                    setTimeout(() => setTeamsSaved(false), 2500);
                                                                }}
                                                                disabled={isLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isLoading ? "Saving..." : "Save"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Read-only view */}
                                            {!isEditingTeams ? (
                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Main Team</div>
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <span className="text-lg">👥</span>
                                                            <span className="font-medium break-all">{savedTeams.mainTeam?.name || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Other Teams</div>
                                                        {Array.isArray(savedTeams.otherTeams) && savedTeams.otherTeams.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {savedTeams.otherTeams.map((t, i) => (
                                                                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full border border-gray-200">
                                                                        {t.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">No additional teams</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Main Team */}
                                                    <Field label="Main Team">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 text-lg">👥</span>
                                                            </div>
                                                            <input
                                                                value={form.teams?.mainTeam?.name || ''}
                                                                onChange={(e) => setForm((s) => ({
                                                                    ...s,
                                                                    teams: { ...s.teams, mainTeam: { ...(s.teams?.mainTeam || {}), name: e.target.value } }
                                                                }))}
                                                                placeholder="Your primary team"
                                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                            />
                                                        </div>
                                                    </Field>

                                                    {/* Other Teams */}
                                                    <div>
                                                        <Field label="Add Other Team">
                                                            <div className="flex gap-3">
                                                                <div className="relative flex-1">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <span className="text-gray-500 text-lg">👥</span>
                                                                    </div>
                                                                    <input 
                                                                        id="addOtherTeam" 
                                                                        placeholder="Team name" 
                                                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                                                                    />
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0" 
                                                                    onClick={() => {
                                                                        const el = document.getElementById('addOtherTeam');
                                                                        const name = el?.value?.trim();
                                                                        if (!name) return;
                                                                        setForm((s) => ({
                                                                            ...s,
                                                                            teams: { ...s.teams, otherTeams: [...(s.teams?.otherTeams || []), { name, role: 'Contributor', members: 0 }] }
                                                                        }));
                                                                        if (el) el.value = '';
                                                                    }}
                                                                >
                                                                    Add Team
                                                                </button>
                                                            </div>
                                                        </Field>
                                                        
                                                        {/* Other Teams List */}
                                                        {(form.teams?.otherTeams || []).length > 0 && (
                                                            <div className="mt-4">
                                                                <label className="block text-sm font-medium text-gray-700 mb-3">Other Teams</label>
                                                                <div className="space-y-2">
                                                                    {(form.teams?.otherTeams || []).map((team, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-lg">👥</span>
                                                                                <div>
                                                                                    <span className="font-medium text-gray-900">{team.name}</span>
                                                                                    <span className="text-sm text-gray-500 ml-2">• {team.role}</span>
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                type="button" 
                                                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors" 
                                                                                onClick={() => setForm((s) => ({
                                                                                    ...s,
                                                                                    teams: { ...s.teams, otherTeams: (s.teams?.otherTeams || []).filter((_, i) => i !== idx) }
                                                                                }))}
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Success Toast */}
                                            {teamsSaved && (
                                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                                                    <span className="text-green-600">✓</span>
                                                    <span className="text-sm font-medium">Team assignment saved successfully!</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                                            onClick={() => { 
                                                                setActiveTab('Account'); 
                                                                setAccountSubTab('actions'); 
                                                                setChangeMode('password'); 
                                                            }}
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
                                                                            inputMode="text"
                                                                            pattern="[A-Za-z0-9]*"
                                                                            maxLength={1}
                                                                            className="h-10 w-10 text-center rounded border text-sm"
                                                                            style={{ fontSize: 16 }}
                                                                            placeholder="0"
                                                                            autoComplete="one-time-code"
                                                                            value={codeDigits[i]}
                                                                            ref={(el) => (twoFAInputsRef.current[i] = el)}
                                                                            onFocus={(e) => {
                                                                                // Select to make overwriting easy when clicking/tapping
                                                                                e.target.select?.();
                                                                            }}
                                                                            onPaste={(e) => {
                                                                                const text = (e.clipboardData?.getData('text') || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
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
                                                                                const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 1);
                                                                                setCodeDigits((prev) => {
                                                                                    const next = [...prev];
                                                                                    next[i] = v;
                                                                                    const joined = next.join("");
                                                                                    setTwoFACodeInput(joined);
                                                                                    return next;
                                                                                });
                                                                                if (v && i < 5) {
                                                                                    focusNoScroll(twoFAInputsRef.current[i + 1]);
                                                                                }
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                // Handle alphanumeric keys directly (supports numpad digits too)
                                                                                const isAlnumKey = (e.key?.length === 1 && /[0-9a-zA-Z]/.test(e.key)) || (e.code && /^Numpad[0-9]$/.test(e.code));
                                                                                if (isAlnumKey) {
                                                                                    e.preventDefault();
                                                                                    const ch = e.key?.length === 1 && /[0-9a-zA-Z]/.test(e.key)
                                                                                        ? e.key
                                                                                        : (e.code?.replace(/\D/g, '') || '').slice(-1);
                                                                                    setCodeDigits((prev) => {
                                                                                        const next = [...prev];
                                                                                        next[i] = (ch || '').toUpperCase();
                                                                                        setTwoFACodeInput(next.join(''));
                                                                                        return next;
                                                                                    });
                                                                                    if (i < 5) focusNoScroll(twoFAInputsRef.current[i + 1]);
                                                                                    return;
                                                                                }
                                                                                if (e.key === 'Backspace') {
                                                                                    if (!codeDigits[i] && i > 0) {
                                                                                        e.preventDefault();
                                                                                        focusNoScroll(twoFAInputsRef.current[i - 1]);
                                                                                    }
                                                                                    return; // allow normal deletion if value exists
                                                                                }
                                                                                if (e.key === 'ArrowLeft' && i > 0) {
                                                                                    e.preventDefault();
                                                                                    focusNoScroll(twoFAInputsRef.current[i - 1]);
                                                                                } else if (e.key === 'ArrowRight' && i < 5) {
                                                                                    e.preventDefault();
                                                                                    focusNoScroll(twoFAInputsRef.current[i + 1]);
                                                                                } else if (e.key && e.key.length === 1 && /[^0-9a-zA-Z]/.test(e.key)) {
                                                                                    // Block non-digit printable characters
                                                                                    e.preventDefault();
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
                                                                        inputMode="text"
                                                                        pattern="[A-Za-z0-9]*"
                                                                        maxLength={1}
                                                                            className={`h-10 w-10 text-center rounded border text-sm ${twoFADisableError ? 'border-red-500 bg-red-100' : 'border-red-300 bg-white'}`}
                                                                            style={{ fontSize: 16 }}
                                                                        placeholder="0"
                                                                        autoComplete="one-time-code"
                                                                        value={twoFADisableDigits[i]}
                                                                        ref={(el) => (twoFADisableInputsRef.current[i] = el)}
                                                                        onFocus={(e) => {
                                                                            e.target.select?.();
                                                                        }}
                                                                        onPaste={(e) => {
                                                                            const text = (e.clipboardData?.getData('text') || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
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
                                                                            const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 1);
                                                                            setTwoFADisableDigits((prev) => {
                                                                                const next = [...prev];
                                                                                next[i] = v;
                                                                                const joined = next.join('');
                                                                                setTwoFADisableCode(joined);
                                                                                return next;
                                                                            });
                                                                            if (v && i < 5) {
                                                                                focusNoScroll(twoFADisableInputsRef.current[i + 1]);
                                                                            }
                                                                            if (twoFADisableError) setTwoFADisableError(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            const isAlnumKey = (e.key?.length === 1 && /[0-9a-zA-Z]/.test(e.key)) || (e.code && /^Numpad[0-9]$/.test(e.code));
                                                                            if (isAlnumKey) {
                                                                                e.preventDefault();
                                                                                const ch = e.key?.length === 1 && /[0-9a-zA-Z]/.test(e.key)
                                                                                    ? e.key
                                                                                    : (e.code?.replace(/\D/g, '') || '').slice(-1);
                                                                                setTwoFADisableDigits((prev) => {
                                                                                    const next = [...prev];
                                                                                    next[i] = (ch || '').toUpperCase();
                                                                                    setTwoFADisableCode(next.join(''));
                                                                                    return next;
                                                                                });
                                                                                if (i < 5) focusNoScroll(twoFADisableInputsRef.current[i + 1]);
                                                                                if (twoFADisableError) setTwoFADisableError(null);
                                                                                return;
                                                                            }
                                                                            if (e.key === 'Backspace') {
                                                                                if (!twoFADisableDigits[i] && i > 0) {
                                                                                    e.preventDefault();
                                                                                    focusNoScroll(twoFADisableInputsRef.current[i - 1]);
                                                                                }
                                                                                return;
                                                                            }
                                                                            if (e.key === 'ArrowLeft' && i > 0) {
                                                                                e.preventDefault();
                                                                                focusNoScroll(twoFADisableInputsRef.current[i - 1]);
                                                                            } else if (e.key === 'ArrowRight' && i < 5) {
                                                                                e.preventDefault();
                                                                                focusNoScroll(twoFADisableInputsRef.current[i + 1]);
                                                                            } else if (e.key && e.key.length === 1 && /[^0-9a-zA-Z]/.test(e.key)) {
                                                                                e.preventDefault();
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
                                                                    disabled={twoFADisableCode.replace(/[^A-Za-z0-9]/g, '').length !== 6}
                                                                    className={`px-3 py-1.5 text-sm rounded text-white ${twoFADisableCode.replace(/[^A-Za-z0-9]/g, '').length === 6 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
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
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button type="button" className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300" onClick={downloadBackupCodes}>
                                                                Download Codes
                                                            </button>
                                                            <button type="button" className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300" onClick={copyBackupCodes}>
                                                                Copy Codes
                                                            </button>
                                                            <button type="button" className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" onClick={generateBackupCodes}>
                                                                Regenerate Codes
                                                            </button>
                                                            <button type="button" className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700" onClick={doneWithBackupCodes}>
                                                                Done
                                                            </button>

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
                                    </div>
                                )}

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
            {/* Avatar Creation Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <h3 className="text-sm font-semibold text-gray-900">Create Avatar</h3>
                            <button onClick={() => setShowAvatarModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex items-center justify-center">
                                <div ref={avatarSvgWrapRef} className="w-40 h-40 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                                    {avatarMode === 'geometric' ? (
                                        <Avatar
                                            size={128}
                                            name={avatarSeed}
                                            variant={avatarVariant}
                                            colors={avatarPalettes[avatarPalette]}
                                            square={false}
                                        />
                                    ) : (
                                        <div
                                            className="scale-100"
                                            dangerouslySetInnerHTML={{ __html: diceSvg }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Avatar Type</label>
                                    <select
                                        value={avatarMode}
                                        onChange={(e) => setAvatarMode(e.target.value)}
                                        className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500"
                                    >
                                        <option value="geometric">Geometric</option>
                                        <option value="human">Human-like</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Seed</label>
                                    <input
                                        value={avatarSeed}
                                        onChange={(e) => setAvatarSeed(e.target.value)}
                                        className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500"
                                        placeholder="Type any name/seed"
                                    />
                                </div>
                                {avatarMode === 'geometric' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Style</label>
                                        <select
                                            value={avatarVariant}
                                            onChange={(e) => setAvatarVariant(e.target.value)}
                                            className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500"
                                        >
                                            <option value="beam">Beam</option>
                                            <option value="marble">Marble</option>
                                            <option value="sunset">Sunset</option>
                                            <option value="ring">Ring</option>
                                            <option value="bauhaus">Bauhaus</option>
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Skin</label>
                                                <select value={humanSkin} onChange={(e)=>setHumanSkin(e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500">
                                                    <option value="light">Light</option>
                                                    <option value="tanned">Tanned</option>
                                                    <option value="brown">Brown</option>
                                                    <option value="dark">Dark</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Hair</label>
                                                <select value={humanHair} onChange={(e)=>setHumanHair(e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500">
                                                    <option value="short01">Short 1</option>
                                                    <option value="short02">Short 2</option>
                                                    <option value="long01">Long 1</option>
                                                    <option value="long02">Long 2</option>
                                                    <option value="bun">Bun</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Eyes</label>
                                                <select value={humanEyes} onChange={(e)=>setHumanEyes(e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500">
                                                    <option value="variant01">Default</option>
                                                    <option value="variant02">Happy</option>
                                                    <option value="variant03">Closed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Mouth</label>
                                                <select value={humanMouth} onChange={(e)=>setHumanMouth(e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500">
                                                    <option value="smile">Smile</option>
                                                    <option value="laughing">Laughing</option>
                                                    <option value="serious">Serious</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Accessories</label>
                                                <select value={humanAccessory} onChange={(e)=>setHumanAccessory(e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-blue-500">
                                                    <option value="none">None</option>
                                                    <option value="glasses">Glasses</option>
                                                    <option value="earrings">Earrings</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Hair Color</label>
                                                <input type="color" value={humanHairColor} onChange={(e)=>setHumanHairColor(e.target.value)} className="h-10 w-full rounded border" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Background</label>
                                                <input type="color" value={humanBg} onChange={(e)=>setHumanBg(e.target.value)} className="h-10 w-full rounded border" />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Palette</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {avatarPalettes.map((palette, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setAvatarPalette(idx)}
                                                className={`p-1 rounded border ${idx === avatarPalette ? 'border-blue-500' : 'border-gray-200'}`}
                                                title={`Palette ${idx + 1}`}
                                            >
                                                <div className="flex">
                                                    {palette.map((c) => (
                                                        <div key={c} style={{ background: c }} className="w-4 h-4" />
                                                    ))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t px-5 py-3 bg-gray-50">
                            <button onClick={() => setShowAvatarModal(false)} className="px-3 py-2 text-sm rounded border hover:bg-gray-100">Cancel</button>
                            <button
                                onClick={async () => {
                                    try {
                                        const size = 256;
                                        const canvas = document.createElement('canvas');
                                        canvas.width = size;
                                        canvas.height = size;
                                        const ctx = canvas.getContext('2d');
                                        ctx.fillStyle = '#ffffff';
                                        ctx.fillRect(0, 0, size, size);
                                        ctx.save();
                                        ctx.beginPath();
                                        ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
                                        ctx.closePath();
                                        ctx.clip();

                                        if (avatarMode === 'geometric') {
                                            const wrap = avatarSvgWrapRef.current;
                                            if (!wrap) return;
                                            const svgEl = wrap.querySelector('svg');
                                            if (!svgEl) return;
                                            const svgText = new XMLSerializer().serializeToString(svgEl);
                                            const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
                                            const url = URL.createObjectURL(svgBlob);
                                            await new Promise((res, rej) => {
                                                const img = new Image();
                                                img.crossOrigin = 'anonymous';
                                                img.onload = () => { ctx.drawImage(img, 0, 0, size, size); URL.revokeObjectURL(url); res(); };
                                                img.onerror = () => { URL.revokeObjectURL(url); rej(); };
                                                img.src = url;
                                            });
                                        } else {
                                            // human mode: render diceSvg directly to canvas
                                            const svgBlob = new Blob([diceSvg], { type: 'image/svg+xml;charset=utf-8' });
                                            const url = URL.createObjectURL(svgBlob);
                                            await new Promise((res, rej) => {
                                                const img = new Image();
                                                img.crossOrigin = 'anonymous';
                                                img.onload = () => { ctx.drawImage(img, 0, 0, size, size); URL.revokeObjectURL(url); res(); };
                                                img.onerror = () => { URL.revokeObjectURL(url); rej(); };
                                                img.src = url;
                                            });
                                        }

                                        ctx.restore();
                                        // Apply filter and optional ring on export
                                        try {
                                            const base = canvas.toDataURL('image/jpeg', 0.95);
                                            // draw into buffer with filter
                                            const buf = document.createElement('canvas');
                                            buf.width = size; buf.height = size;
                                            const bctx = buf.getContext('2d');
                                            try { bctx.filter = getAvatarFilterCss(avatarFilter); } catch(_) {}
                                            await new Promise((res, rej) => {
                                                const im = new Image();
                                                im.onload = () => { bctx.drawImage(im, 0, 0, size, size); res(); };
                                                im.onerror = rej;
                                                im.src = base;
                                            });

                                            if (avatarRing && avatarRing !== 'none') {
                                                const out = document.createElement('canvas');
                                                out.width = size + 8; out.height = size + 8;
                                                const octx = out.getContext('2d');
                                                // Approximate colored ring (solid fallback)
                                                octx.fillStyle = '#fa7e1e';
                                                octx.beginPath(); octx.arc(out.width/2, out.height/2, out.width/2, 0, Math.PI*2); octx.fill();
                                                octx.globalCompositeOperation = 'destination-out';
                                                octx.beginPath(); octx.arc(out.width/2, out.height/2, size/2, 0, Math.PI*2); octx.fill();
                                                octx.globalCompositeOperation = 'destination-over';
                                                octx.drawImage(buf, 4, 4, size, size);
                                                const dataUrl = out.toDataURL('image/jpeg', 0.95);
                                                setAvatarOriginal(dataUrl);
                                                setAvatarPreview(dataUrl);
                                                try { localStorage.setItem('pm:user:avatar', dataUrl); } catch (_) {}
                                                try { localStorage.setItem('pm:user:avatar:ring', avatarRing); } catch(_) {}
                                                try { localStorage.setItem('pm:user:avatar:filter', avatarFilter); } catch(_) {}
                                                setShowAvatarModal(false);
                                                showToast('Avatar updated', 'success');
                                                return;
                                            }

                                            const dataUrl = buf.toDataURL('image/jpeg', 0.95);
                                            setAvatarOriginal(dataUrl);
                                            setAvatarPreview(dataUrl);
                                            try { localStorage.setItem('pm:user:avatar', dataUrl); } catch (_) {}
                                            try { localStorage.setItem('pm:user:avatar:ring', avatarRing); } catch(_) {}
                                            try { localStorage.setItem('pm:user:avatar:filter', avatarFilter); } catch(_) {}
                                            setShowAvatarModal(false);
                                            showToast('Avatar updated', 'success');
                                            return;
                                        } catch (_) {}

                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                                        setAvatarOriginal(dataUrl);
                                        setAvatarPreview(dataUrl);
                                        try { localStorage.setItem('pm:user:avatar', dataUrl); } catch (_) {}
                                        try { localStorage.setItem('pm:user:avatar:ring', avatarRing); } catch(_) {}
                                        try { localStorage.setItem('pm:user:avatar:filter', avatarFilter); } catch(_) {}
                                        setShowAvatarModal(false);
                                        showToast('Avatar updated', 'success');
                                    } catch (e) {
                                        console.error('Failed to save avatar', e);
                                    }
                                }}
                                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Use Avatar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Global Snackbar */}
            {toast.visible && (
                <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
                    <div className={`px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
                        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
                        <span>{toast.message}</span>
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
