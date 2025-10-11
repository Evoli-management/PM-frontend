import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("My Profile");
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarOriginal, setAvatarOriginal] = useState(null);
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
        setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const handlePersonalChange = useCallback((field) => (e) => {
        setPersonalDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    }, [clearError]);

    const handleProfessionalChange = useCallback((field) => (e) => {
        setProfessionalDraft(prev => ({ ...prev, [field]: e.target.value }));
    }, []);

    const handlePasswordChange = useCallback((field) => (e) => {
        setPasswordDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    }, [clearError]);

    const handleEmailChange = useCallback((field) => (e) => {
        setEmailDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    }, [clearError]);

    const updateTeamDraftName = useCallback((value) => {
        setTeamDraft(prev => ({ ...prev, mainTeamName: value }));
    }, []);

    // Global toast/snackbar state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);
    const showToast = useCallback((message, type = 'success', timeout = 2400) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ visible: true, message, type });
        toastTimerRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), timeout);
    }, []);
    useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

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
            case 'instagram': return { background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', padding: '3px', borderRadius: '50%' };
            case 'blue': return { background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)', padding: '3px', borderRadius: '50%' };
            case 'sunset': return { background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', padding: '3px', borderRadius: '50%' };
            default: return {};
        }
    }, []);

    // Rest of the component will be split into smaller components...
    
    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <h1 className="text-2xl font-bold mb-6">Profile Settings (To Be Componentized)</h1>
            <p className="text-gray-600">This comprehensive profile will be broken down into reusable components.</p>
        </div>
    );
}