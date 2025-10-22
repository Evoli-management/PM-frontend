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
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    
    // Avatar customization
    const [avatarFilter, setAvatarFilter] = useState('normal');
    const [avatarRing, setAvatarRing] = useState('none');
    const [avatarMode, setAvatarMode] = useState('geometric');
    const [avatarSeed, setAvatarSeed] = useState('User');
    const [avatarPalette, setAvatarPalette] = useState(0);
    
    const fileRef = useRef(null);
    const cropImgRef = useRef(null);

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

            {/* Generate Avatar Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Generate Avatar</h3>
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Avatar Preview */}
                            <div className="flex justify-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                                    <svg
                                        width="96"
                                        height="96"
                                        viewBox="0 0 96 96"
                                        style={{ background: avatarPalettes[avatarPalette][0] }}
                                    >
                                        <circle
                                            cx="48"
                                            cy="38"
                                            r="12"
                                            fill={avatarPalettes[avatarPalette][1]}
                                        />
                                        <rect
                                            x="30"
                                            y="60"
                                            width="36"
                                            height="24"
                                            rx="18"
                                            fill={avatarPalettes[avatarPalette][2]}
                                        />
                                        <circle
                                            cx="38"
                                            cy="32"
                                            r="2"
                                            fill={avatarPalettes[avatarPalette][3]}
                                        />
                                        <circle
                                            cx="58"
                                            cy="32"
                                            r="2"
                                            fill={avatarPalettes[avatarPalette][3]}
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Seed Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Avatar Seed
                                </label>
                                <input
                                    type="text"
                                    value={avatarSeed}
                                    onChange={(e) => setAvatarSeed(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    placeholder="Enter name or text"
                                />
                            </div>

                            {/* Color Palette */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color Palette
                                </label>
                                <div className="flex gap-2">
                                    {avatarPalettes.map((palette, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setAvatarPalette(index)}
                                            className={`w-8 h-8 rounded border-2 ${
                                                avatarPalette === index ? 'border-blue-500' : 'border-gray-300'
                                            }`}
                                            style={{ background: `linear-gradient(45deg, ${palette[0]}, ${palette[1]})` }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    🎲 Random
                                </button>
                                <LoadingButton
                                    onClick={() => {
                                        // Generate avatar as SVG and convert to data URL
                                        const svg = `
                                            <svg width="256" height="256" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
                                                <rect width="96" height="96" fill="${avatarPalettes[avatarPalette][0]}"/>
                                                <circle cx="48" cy="38" r="12" fill="${avatarPalettes[avatarPalette][1]}"/>
                                                <rect x="30" y="60" width="36" height="24" rx="18" fill="${avatarPalettes[avatarPalette][2]}"/>
                                                <circle cx="38" cy="32" r="2" fill="${avatarPalettes[avatarPalette][3]}"/>
                                                <circle cx="58" cy="32" r="2" fill="${avatarPalettes[avatarPalette][3]}"/>
                                            </svg>
                                        `;
                                        const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
                                        setAvatarPreview(dataUrl);
                                        localStorage.setItem('pm:avatar', dataUrl);
                                        showToast('Avatar generated successfully!');
                                        if (onAvatarChange) onAvatarChange(dataUrl);
                                        setShowAvatarModal(false);
                                    }}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    Generate Avatar
                                </LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};