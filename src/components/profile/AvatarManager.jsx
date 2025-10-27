import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { LoadingButton } from './UIComponents';

export const AvatarManager = ({ 
    avatarPreview, 
    setAvatarPreview, 
    onAvatarChange,
    showToast,
    avatarSeed: avatarSeedProp
}) => {
    const [avatarOriginal, setAvatarOriginal] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropPanX, setCropPanX] = useState(0);
    const [cropPanY, setCropPanY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraFacingMode, setCameraFacingMode] = useState('user'); // 'user' or 'environment'
    const [cameraZoom, setCameraZoom] = useState(1);
    const [isCapturing, setIsCapturing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null); // pre-crop preview
    const [showPreview, setShowPreview] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const videoTrackRef = useRef(null);
    
    // Avatar customization
    const [avatarFilter, setAvatarFilter] = useState('normal');
    const [avatarRing, setAvatarRing] = useState('none');
    const [avatarMode, setAvatarMode] = useState('initial');
    const [avatarSeed, setAvatarSeed] = useState(avatarSeedProp || 'User');
    const [avatarPalette, setAvatarPalette] = useState(0);
    
    const fileRef = useRef(null);
    const cropImgRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        return () => {
            // Cleanup camera stream on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setShowCamera(false);
        setShowPreview(false);
        setPreviewImage(null);
        setIsCapturing(false);
        // reset torch state
        setTorchOn(false);
        videoTrackRef.current = null;
    };

    const captureFromCamera = async () => {
        try {
            const video = videoRef.current;
            if (!video) return;
            setIsCapturing(true);

            // small shutter delay for UI effect
            await new Promise((res) => setTimeout(res, 150));

            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (!vw || !vh) {
                throw new Error('Video dimensions not available');
            }

            // target high-res capture but keep aspect square
            const DPR = Math.min(window.devicePixelRatio || 1, 2);
            const target = 1024 * DPR; // higher resolution for realistic avatars
            const canvas = document.createElement('canvas');
            canvas.width = target;
            canvas.height = target;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';

            // compute center crop taking cameraZoom into account
            const base = Math.min(vw, vh);
            const zoom = Math.max(1, Math.min(4, Number(cameraZoom) || 1));
            const cropSize = base / zoom;
            const sx = (vw - cropSize) / 2;
            const sy = (vh - cropSize) / 2;

            ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, target, target);
            const dataUrl = canvas.toDataURL('image/png');

            // show preview first so user can retake or proceed to crop
            setPreviewImage(dataUrl);
            setShowPreview(true);
            setIsCapturing(false);
        } catch (e) {
            console.error('Failed to capture from camera', e);
            if (showToast) showToast('Failed to capture image from camera', 'error');
            setIsCapturing(false);
        }
    };

    const confirmPreview = () => {
        if (!previewImage) return;
        setAvatarOriginal(previewImage);
        setAvatarPreview(previewImage);
        // Inform parent immediately so the avatar appears in the profile UI
        if (onAvatarChange) {
            try {
                // Pass an object with `silent: true` to indicate parent should not show a toast
                onAvatarChange({ data: previewImage, silent: true });
            } catch (e) {
                // swallow errors from parent handler to avoid breaking UI
                console.error('onAvatarChange error', e);
            }
        }

        // Close camera and preview and do not open the cropper so user returns to profile page
        setShowPreview(false);
        setPreviewImage(null);
        setShowCropper(false);
        stopCamera();
    };

    // Mouse handlers for panning
    const onMouseMove = (e) => {
        if (!isPanning) return;
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setCropPanX(panStartRef.current.panX + dx);
        setCropPanY(panStartRef.current.panY + dy);
    };

    const onMouseUp = (e) => {
        setIsPanning(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };

    // Touch handlers (drag + pinch)
    const onTouchStartCrop = (e) => {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            setIsPanning(true);
            panStartRef.current = { x: t.clientX, y: t.clientY, panX: cropPanX, panY: cropPanY };
        } else if (e.touches.length === 2) {
            pinchRef.current.active = true;
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchRef.current.startDist = dist;
            pinchRef.current.startZoom = cropZoom;
        }
    };

    const onTouchMoveCrop = (e) => {
        if (pinchRef.current.active && e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = dist / (pinchRef.current.startDist || dist);
            setCropZoom(Math.max(1, Math.min(4, pinchRef.current.startZoom * ratio)));
        } else if (isPanning && e.touches.length === 1) {
            const t = e.touches[0];
            const dx = t.clientX - panStartRef.current.x;
            const dy = t.clientY - panStartRef.current.y;
            setCropPanX(panStartRef.current.panX + dx);
            setCropPanY(panStartRef.current.panY + dy);
        }
    };

    const onTouchEndCrop = (e) => {
        if (pinchRef.current.active && e.touches.length < 2) {
            pinchRef.current.active = false;
        }
        if (isPanning && e.touches.length === 0) {
            setIsPanning(false);
        }
    };

    const retake = () => {
        setShowPreview(false);
        setPreviewImage(null);
        setIsCapturing(false);
        // keep camera open for retake
    };

    const startCamera = async (facing = cameraFacingMode) => {
        try {
            // stop previous stream if any
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }

            const constraints = {
                video: {
                    facingMode: { ideal: facing },
                    width: { ideal: 1280 },
                    height: { ideal: 1280 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            const [track] = stream.getVideoTracks();
            videoTrackRef.current = track;
            try {
                const caps = track.getCapabilities ? track.getCapabilities() : {};
                if (caps && 'torch' in caps) setTorchAvailable(true);
            } catch (e) {
                // ignore capability errors
            }
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // try to play (some browsers require explicit play)
                try { await videoRef.current.play(); } catch (e) { /* ignore */ }
            }
            setCameraFacingMode(facing);
            setShowCamera(true);
            setShowPreview(false);
            setPreviewImage(null);
        } catch (e) {
            console.error('Camera start error', e);
            if (showToast) showToast('Unable to access camera. Please grant permission or use file upload.', 'error');
        }
    };

    // Keyboard shortcuts when camera modal is open
    useEffect(() => {
        if (!showCamera) return;
        const onKey = (e) => {
            if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space') {
                e.preventDefault();
                if (!showPreview) captureFromCamera();
            }
            if (e.key === 'Escape') {
                stopCamera();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showCamera, showPreview, cameraZoom]);

    const toggleTorch = async () => {
        const track = videoTrackRef.current;
        if (!track || !torchAvailable) return;
        try {
            await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
            setTorchOn((s) => !s);
        } catch (e) {
            console.warn('Torch toggle failed', e);
        }
    };

    const avatarFilterPresets = useMemo(() => ({
        normal: 'none',
        clarendon: 'contrast(1.15) saturate(1.25) brightness(1.05)',
        gingham: 'brightness(1.05) sepia(0.06) saturate(1.05)',
        juno: 'contrast(1.05) saturate(1.35) sepia(0.08) hue-rotate(-8deg)',
        lark: 'brightness(1.18) saturate(0.9)',
        moon: 'grayscale(1) contrast(1.1) brightness(1.08)',
        crema: 'sepia(0.08) saturate(1.2) contrast(0.92) brightness(1.04)'
    }), []);

    useEffect(() => {
        if (avatarSeedProp) setAvatarSeed(avatarSeedProp);
    }, [avatarSeedProp]);

    const emojiList = useMemo(() => ['😀','😎','🤖','🐶','🐱','🦊','🦁','🐼','🐸','🐵','🌞','🌙','⭐️','🔥','🍀'], []);

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
                // Normalize image by loading into an Image and resizing if huge
                const img = new Image();
                img.onload = () => {
                    try {
                        const maxDim = 2048; // cap large uploads to reasonable size
                        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.round(img.width * ratio);
                        canvas.height = Math.round(img.height * ratio);
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/png', 0.92);

                        // stop any active camera and previews
                        stopCamera();
                        setShowPreview(false);
                        setPreviewImage(null);

                        // reset pan/zoom to defaults
                        setCropZoom(1);
                        setCropPanX(0);
                        setCropPanY(0);
                        setAvatarOriginal(dataUrl);
                        setAvatarPreview(dataUrl);
                        setShowCropper(true);
                    } catch (err) {
                        console.error('Error processing uploaded image', err);
                        if (showToast) showToast('Failed to process image', 'error');
                    }
                };
                img.onerror = (err) => {
                    console.error('Image load error', err);
                    if (showToast) showToast('Invalid image file', 'error');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const getCroppedDataUrl = () => {
        const img = cropImgRef.current;
        if (!img) return null;
        const canvas = document.createElement('canvas');
        const target = 256;
        canvas.width = target;
        canvas.height = target;
        const ctx = canvas.getContext('2d');
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Compute initial scale used to fit the image into the viewport as "cover"
        const viewport = 300; // matches crop preview height
        const initialScale = Math.max(viewport / w, viewport / h);
        const displayScale = initialScale * (cropZoom || 1);

        // pan offsets are in displayed pixels; convert to source pixels
        const panXSource = (cropPanX) / displayScale;
        const panYSource = (cropPanY) / displayScale;

        // center of source image
        const cx = w / 2 - panXSource;
        const cy = h / 2 - panYSource;

        const srcHalf = (target / 2) / displayScale;
        const sx = cx - srcHalf;
        const sy = cy - srcHalf;

        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = 'white';
        ctx.fillRect(0,0,target,target);
        ctx.drawImage(img, sx, sy, srcHalf * 2, srcHalf * 2, 0, 0, target, target);
        return canvas.toDataURL('image/png');
    };

    const saveCroppedAndReturn = () => {
        try {
            const dataUrl = getCroppedDataUrl();
            if (!dataUrl) return setShowCropper(false);
            // Persist silently and update parent so profile shows updated image
            setAvatarPreview(dataUrl);
            localStorage.setItem('pm:avatar', dataUrl);
            if (onAvatarChange) {
                try {
                    onAvatarChange({ data: dataUrl, silent: true });
                } catch (e) {
                    console.error('onAvatarChange error', e);
                }
            }
        } finally {
            setShowCropper(false);
            stopCamera();
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
                            className="w-full h-full object-cover cursor-pointer"
                            style={{ filter: getAvatarFilterCss(avatarFilter) }}
                            onClick={() => setShowImageViewer(true)}
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
                    onClick={() => startCamera('user')}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    aria-label="Open camera"
                >
                    📷 Camera
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
                            <div
                                className="w-full h-full relative overflow-hidden touch-none"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsPanning(true);
                                    panStartRef.current = { x: e.clientX, y: e.clientY, panX: cropPanX, panY: cropPanY };
                                    window.addEventListener('mousemove', onMouseMove);
                                    window.addEventListener('mouseup', onMouseUp);
                                }}
                                onTouchStart={(e) => onTouchStartCrop(e)}
                                onTouchMove={(e) => onTouchMoveCrop(e)}
                                onTouchEnd={(e) => onTouchEndCrop(e)}
                            >
                                <img
                                    ref={cropImgRef}
                                    src={avatarOriginal}
                                    alt="Crop preview"
                                    className="absolute left-1/2 top-1/2"
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${cropPanX}px, ${cropPanY}px) scale(${cropZoom})`,
                                        transformOrigin: 'center center',
                                        touchAction: 'none',
                                        userSelect: 'none',
                                        maxWidth: 'none'
                                    }}
                                />
                            </div>
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
                                onClick={saveCroppedAndReturn}
                                variant="primary"
                            >
                                Save
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 max-w-xl w-full mx-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Take Photo</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const next = cameraFacingMode === 'user' ? 'environment' : 'user';
                                        startCamera(next);
                                    }}
                                    className="px-2 py-1 border rounded text-sm"
                                    aria-label="Switch camera"
                                >
                                    ⇆
                                </button>
                                <button
                                    onClick={() => { stopCamera(); }}
                                    className="px-2 py-1 border rounded text-sm"
                                    aria-label="Close camera"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="relative bg-black mb-3" style={{ height: '420px' }}>
                            {/* Video preview */}
                            {!showPreview && (
                                <div className="w-full h-full overflow-hidden rounded">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                        style={{
                                            transform: `scale(${cameraZoom})`,
                                            transformOrigin: 'center',
                                            transition: 'transform .12s ease-in-out'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Dim overlay with transparent circular cutout to indicate crop area */}
                            <div
                                aria-hidden
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                    background: 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 160px, rgba(0,0,0,0.5) 170px)'
                                }}
                            />

                            {/* Preview image if captured */}
                            {showPreview && previewImage && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded" />
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="block text-sm text-gray-600 mb-1">Zoom</label>
                            <input
                                aria-label="Camera zoom"
                                type="range"
                                min="1"
                                max="3"
                                step="0.05"
                                value={cameraZoom}
                                onChange={(e) => setCameraZoom(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <div className="text-sm text-muted-foreground">Zoom: {cameraZoom.toFixed(2)}x</div>
                                <div className="flex gap-2">
                                    {torchAvailable && (
                                        <button onClick={toggleTorch} className={`px-2 py-1 border rounded text-sm ${torchOn ? 'bg-yellow-200' : ''}`}>{torchOn ? 'Torch On' : 'Torch'}</button>
                                    )}
                                    <button onClick={() => setCameraZoom(1)} className="px-2 py-1 border rounded text-sm">Reset</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            {showPreview ? (
                                <>
                                    <button onClick={retake} className="px-4 py-2 border rounded">Retake</button>
                                    <LoadingButton onClick={confirmPreview} variant="primary">Use Photo</LoadingButton>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { stopCamera(); }} className="px-4 py-2 border rounded">Cancel</button>
                                    <LoadingButton onClick={captureFromCamera} variant="primary">
                                        {isCapturing ? 'Capturing…' : 'Capture'}
                                    </LoadingButton>
                                </>
                            )}
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
                            {/* Avatar Type Selector */}
                            <div className="flex gap-2 items-center">
                                <label className="text-sm font-medium">Type</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setAvatarMode('initial')} className={`px-2 py-1 border rounded ${avatarMode==='initial'?'border-blue-500':''}`}>Initial</button>
                                    <button onClick={() => setAvatarMode('emoji')} className={`px-2 py-1 border rounded ${avatarMode==='emoji'?'border-blue-500':''}`}>Emoji</button>
                                </div>
                            </div>
                            {/* Avatar Preview */}
                            <div className="flex justify-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                                    {/** Render preview for selected avatar type */}
                                    {avatarMode === 'emoji' ? (
                                        <div className="w-full h-full flex items-center justify-center text-4xl" style={{backgroundColor: avatarPalettes[avatarPalette][0]}}>
                                            {emojiList[avatarSeed.charCodeAt(0) % emojiList.length]}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white">
                                            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                                <span style={{fontSize:32,fontWeight:700,color:avatarPalettes[avatarPalette][1]}}>{(avatarSeed||'U').charAt(0).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    )}
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
                                        className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-400 focus:outline-none"
                                        placeholder="Enter name or text"
                                    />
                                    {avatarMode === 'emoji' && (
                                        <div className="mt-2 text-sm">Tip: enter a character to influence the emoji choice, or click Random.</div>
                                    )}
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
                                        // Generate avatar based on selected mode
                                        let dataUrl = null;
                                        if (avatarMode === 'emoji') {
                                            const emoji = emojiList[avatarSeed.charCodeAt(0) % emojiList.length] || emojiList[0];
                                            // Create a canvas to render emoji properly
                                            const canvas = document.createElement('canvas');
                                            const size = 256;
                                            canvas.width = size;
                                            canvas.height = size;
                                            const ctx = canvas.getContext('2d');
                                            
                                            // Draw background
                                            ctx.fillStyle = avatarPalettes[avatarPalette][0];
                                            ctx.fillRect(0, 0, size, size);
                                            
                                            // Draw emoji
                                            ctx.font = '140px Arial';
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'middle';
                                            ctx.fillText(emoji, size / 2, size / 2);
                                            
                                            dataUrl = canvas.toDataURL('image/png');
                                        } else {
                                            const letter = (avatarSeed || 'U').charAt(0).toUpperCase();
                                            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='100%' height='100%' fill='${avatarPalettes[avatarPalette][0]}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='120' font-weight='700' fill='${avatarPalettes[avatarPalette][1]}'>${letter}</text></svg>`;
                                            dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
                                        }

                                        if (dataUrl) {
                                            setAvatarPreview(dataUrl);
                                            localStorage.setItem('pm:avatar', dataUrl);
                                            if (showToast) showToast('Avatar generated successfully!');
                                            if (onAvatarChange) onAvatarChange(dataUrl);
                                            setShowAvatarModal(false);
                                        }
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
            
            {/* Image Viewer Modal */}
            {showImageViewer && avatarPreview && (
                <div className="fixed inset-0 z-60 bg-black bg-opacity-85 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-3xl w-full overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">Profile Image</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        // Download image
                                        const a = document.createElement('a');
                                        a.href = avatarPreview;
                                        a.download = 'avatar.png';
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                    }}
                                    className="px-3 py-1 border rounded"
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => setShowImageViewer(false)}
                                    className="px-3 py-1 border rounded"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-gray-50">
                            <img src={avatarPreview} alt="Full profile" className="max-h-[70vh] object-contain" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};