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

