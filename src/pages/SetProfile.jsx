import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import Sidebar from '../components/shared/Sidebar.jsx';

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("My Profile");
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarOriginal, setAvatarOriginal] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropZoom, setCropZoom] = useState(1);
    const [showCameraOptions, setShowCameraOptions] = useState(false);
    const cropImgRef = useRef(null);
    const [errors, setErrors] = useState({});
    const [personalDraft, setPersonalDraft] = useState({ name: "", email: "", phone: "" });
    const [professionalDraft, setProfessionalDraft] = useState({ jobTitle: "", department: "", manager: "" });
    const [passwordDraft, setPasswordDraft] = useState({ current: "", next: "", confirm: "" });
    const [emailDraft, setEmailDraft] = useState({ current: "", next: "" });

    // Close options when clicking outside camera widget
    useEffect(() => {
        const onDocClick = (e) => {
            if (!e.target.closest('.camera-options-container')) {
                setShowCameraOptions(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [showCameraOptions]);

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
                        <div className="text-center py-8">
                            <p className="text-gray-600">Profile settings functionality will be implemented here.</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}