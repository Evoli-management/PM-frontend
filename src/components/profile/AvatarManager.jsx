import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { LoadingButton } from './UIComponents';

export const AvatarManager = ({ 
    avatarPreview, 
    setAvatarPreview, 
    onAvatarChange,
    showToast 
}) => {
    const [avatarOriginal, setAvatarOriginal] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropZoom, setCropZoom] = useState(1);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [zoom, setZoom] = useState(1);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [showCameraOptions, setShowCameraOptions] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    
    // Avatar customization
    const [avatarFilter, setAvatarFilter] = useState('normal');
    const [avatarRing, setAvatarRing] = useState('none');
    const [avatarMode, setAvatarMode] = useState('geometric');
    const [avatarSeed, setAvatarSeed] = useState('User');
    const [avatarPalette, setAvatarPalette] = useState(0);
    
    const fileRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const cropImgRef = useRef(null);
    const cameraOptionsRef = useRef(null);
    const cameraButtonRef = useRef(null);

    const avatarFilterPresets = useMemo(() => ({
        normal: 'none',
        clarendon: 'contrast(1.15) saturate(1.25) brightness(1.05)',
        gingham: 'brightness(1.05) sepia(0.06) saturate(1.05)',
        juno: 'contrast(1.05) saturate(1.35) sepia(0.08) hue-rotate(-8deg)',
        lark: 'brightness(1.18) saturate(0.9)',
        moon: 'grayscale(1) contrast(1.1) brightness(1.08)',
        crema: 'sepia(0.08) saturate(1.2) contrast(0.92) brightness(1.04)'
    }), []);

    const avatarPalettes = useMemo(() => ([
        ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"],
        ["#FFAD08", "#EDD75A", "#73B06F", "#0C8F8F", "#405059"],
        ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"],
        ["#F94144", "#F3722C", "#F8961E", "#43AA8B", "#577590"],
        ["#2E7D32", "#66BB6A", "#A5D6A7", "#81C784", "#43A047"],
    ]), []);

    const getRingWrapperStyle = useCallback((ring) => {
        switch (ring) {
            case 'instagram': 
                return { 
                    background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', 
                    padding: '3px', 
                    borderRadius: '50%' 
                };
            case 'blue': 
                return { 
                    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)', 
                    padding: '3px', 
                    borderRadius: '50%' 
                };
            case 'sunset': 
                return { 
                    background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', 
                    padding: '3px', 
                    borderRadius: '50%' 
                };
            default: 
                return {};
        }
    }, []);

    const getAvatarFilterCss = useCallback((key) => avatarFilterPresets[key] || 'none', [avatarFilterPresets]);

    // Camera functions
    const checkCameraPermission = async () => {
        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            setCameraPermission(result.state);
            return result.state === 'granted';
        } catch (error) {
            console.warn('Permission API not supported', error);
            return false;
        }
    };

    const openCamera = async () => {
        try {
            const hasPermission = await checkCameraPermission();
            if (!hasPermission) {
                setShowPermissionDialog(true);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode }
            });
            
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraActive(true);
            setShowCameraOptions(false);
        } catch (error) {
            console.error('Camera access error:', error);
            showToast('Camera access denied or not available', 'error');
        }
    };

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
        setCapturedImage(null);
        setShowImagePreview(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setShowImagePreview(true);
    };

    const saveImage = async () => {
        if (capturedImage) {
            setAvatarPreview(capturedImage);
            setAvatarOriginal(capturedImage);
            localStorage.setItem('pm:avatar', capturedImage);
            showToast('Avatar updated successfully!');
            closeCamera();
            if (onAvatarChange) onAvatarChange(capturedImage);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarOriginal(e.target.result);
                setAvatarPreview(e.target.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

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
            localStorage.setItem('pm:avatar', dataUrl);
            showToast('Avatar updated successfully!');
            if (onAvatarChange) onAvatarChange(dataUrl);
        } finally {
            setShowCropper(false);
        }
    };

    // Close camera options dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showCameraOptions && 
                cameraOptionsRef.current && 
                !cameraOptionsRef.current.contains(e.target) &&
                cameraButtonRef.current && 
                !cameraButtonRef.current.contains(e.target)) {
                setShowCameraOptions(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCameraOptions]);

    return (
        <div className="flex flex-col items-center space-y-4">
            {/* Avatar Display */}
            <div style={getRingWrapperStyle(avatarRing)}>
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {avatarPreview ? (
                        <img
                            src={avatarPreview}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            style={{ filter: getAvatarFilterCss(avatarFilter) }}
                        />
                    ) : (
                        <span className="text-2xl text-gray-400">👤</span>
                    )}
                </div>
            </div>

            {/* Avatar Controls */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                    📁 Upload
                </button>
                
                <div className="relative">
                    <button
                        ref={cameraButtonRef}
                        type="button"
                        onClick={() => setShowCameraOptions(!showCameraOptions)}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                        📷 Camera
                    </button>
                    
                    {showCameraOptions && (
                        <div 
                            ref={cameraOptionsRef}
                            className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 p-2 space-y-1"
                        >
                            <button
                                onClick={openCamera}
                                className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                            >
                                Take Photo
                            </button>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                    🎨 Generate
                </button>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Camera Modal */}
            {cameraActive && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Take Photo</h3>
                            <button
                                onClick={closeCamera}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        
                        {!showImagePreview ? (
                            <div className="space-y-4">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full rounded"
                                />
                                <div className="flex justify-center">
                                    <button
                                        onClick={capturePhoto}
                                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        📷 Capture
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <img
                                    src={capturedImage}
                                    alt="Captured"
                                    className="w-full rounded"
                                />
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={() => setShowImagePreview(false)}
                                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                    >
                                        Retake
                                    </button>
                                    <LoadingButton
                                        onClick={saveImage}
                                        variant="primary"
                                    >
                                        Save Avatar
                                    </LoadingButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cropper Modal */}
            {showCropper && avatarOriginal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Crop Image</h3>
                        <div className="relative mb-4" style={{ height: '300px' }}>
                            <img
                                ref={cropImgRef}
                                src={avatarOriginal}
                                alt="Crop preview"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zoom: {cropZoom}x
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="4"
                                step="0.1"
                                value={cropZoom}
                                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowCropper(false)}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                onClick={applyCrop}
                                variant="primary"
                            >
                                Apply Crop
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};