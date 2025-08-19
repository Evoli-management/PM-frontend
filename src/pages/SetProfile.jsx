import React, { useMemo, useRef, useState } from "react";

/**
 * ProfileSetting.js — Original Figma Design with Enhanced Components
 * - Left vertical tabs (Account, Preferences, 2FA, Synchronization)
 * - Main card: Avatar + Name/Email/Phone
 * - Change Password (old/new/confirm) + neon-green Submit
 * - Change Email (old/new) + neon-green Submit
 * - Account view ALSO shows: Time Zone, Language (multilingual), Work Hours (start/end), Notifications toggle
 * - Google Calendar connect card
 * - Bottom strip with mini cards (Time Zone | Reminders & Work Hours | Google Connect)
 * - Enhanced components with validation and better UX
 */

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("Account");
    const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [changeMode, setChangeMode] = useState(null); // 'password' | 'email' | null
    const fileRef = useRef(null);

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
    });

    const upd = (k) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((s) => ({ ...s, [k]: value }));
        // Clear error when user starts typing
        if (errors[k]) {
            setErrors((prev) => ({ ...prev, [k]: null }));
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
                (checked ? "bg-blue-600" : "bg-gray-300")
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
            <div className="mx-auto max-w-5xl rounded-lg bg-white p-3 shadow-sm sm:p-4">
                <h1 className="mb-3 text-lg font-semibold text-gray-600 sm:text-xl">Profile Settings</h1>

                <div className="grid gap-4 lg:grid-cols-[200px_auto]">
                    {/* Left tabs - horizontal on mobile, vertical on desktop */}
                    <nav className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-[13px]">
                        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1 lg:gap-0">
                            {["Account", "Preferences", "Two Factor Auth (2FA)", "Synchronization"].map((t) => (
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
                        {/* Title strip inside card */}
                        <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                            PROFILE INFORMATION
                        </div>

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
                                                <h3 className="text-sm font-semibold text-gray-800">Change Password</h3>
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
                                                        toggle={() => setShowPw((s) => ({ ...s, new1: !s.new1 }))}
                                                        error={errors.newPw}
                                                    />
                                                </Field>
                                                <Field label="Confirm New Password" error={errors.confirmPw}>
                                                    <PasswordField
                                                        value={form.confirmPw}
                                                        onChange={upd("confirmPw")}
                                                        placeholder="Confirm New Password"
                                                        open={showPw.new2}
                                                        toggle={() => setShowPw((s) => ({ ...s, new2: !s.new2 }))}
                                                        error={errors.confirmPw}
                                                    />
                                                </Field>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className={`mt-3 w-full rounded bg-[#00E676] py-2.5 text-[13px] font-semibold text-white transition-all sm:py-2 sm:text-[14px] ${
                                                    isLoading ? "opacity-50 cursor-not-allowed" : "hover:brightness-95"
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
                                                        <strong>Note:</strong> You will receive a verification email at
                                                        your new address. Click the link in that email to complete the
                                                        change.
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
                                            <select className="h-10 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:h-9">
                                                <option value="light">Light</option>
                                                <option value="dark">Dark</option>
                                                <option value="auto">Auto</option>
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
                                </Section>
                            </div>
                        )}

                        {activeTab === "Two Factor Auth (2FA)" && (
                            <div className="space-y-4">
                                <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                    SECURITY SETTINGS
                                </div>

                                <Section title="Two-Factor Authentication">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-gray-700">Enable 2FA</span>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Add an extra layer of security to your account
                                                </p>
                                            </div>
                                            <div className="flex justify-end sm:justify-start">
                                                <Toggle checked={false} onChange={() => {}} />
                                            </div>
                                        </div>

                                        <div className="rounded border border-gray-300 p-3 sm:p-4">
                                            <h3 className="text-sm font-semibold text-gray-800 mb-2">
                                                Setup Instructions
                                            </h3>
                                            <ol className="text-xs text-gray-600 space-y-1.5 sm:space-y-1">
                                                <li>1. Download an authenticator app (Google Authenticator, Authy)</li>
                                                <li>2. Scan the QR code below with your authenticator app</li>
                                                <li>3. Enter the 6-digit code from your app</li>
                                                <li>4. Save your backup codes in a secure location</li>
                                            </ol>
                                        </div>
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === "Synchronization" && (
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
                                                <button className="rounded bg-[#4285F4] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center">
                                                    Connect
                                                </button>
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
                                                <button className="rounded bg-[#0078D4] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center">
                                                    Connect
                                                </button>
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
                                                <button className="rounded bg-[#EA4335] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 self-start sm:self-center">
                                                    Connect
                                                </button>
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

                        {/* Bottom strip - responsive */}
                        <div className="mt-6 grid grid-cols-1 gap-3 rounded-lg border-t border-gray-200 pt-4 sm:mt-8 sm:grid-cols-3 sm:pt-5">
                            <div className="rounded bg-[#F5F5F5] p-3 text-center">
                                <h4 className="text-[11px] font-semibold text-gray-800 sm:text-[12px]">TIME ZONE</h4>
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
        </div>
    );
}
