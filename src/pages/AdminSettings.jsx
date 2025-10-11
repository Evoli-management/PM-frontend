import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";

/**
 * Admin Settings Module
 * Organization-wide administrative settings separate from user Profile Settings
 * Covers organizational policies, system configurations, and admin controls
 */
export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState("Organization");
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Admin Organization Settings State
    const [orgSettings, setOrgSettings] = useState({
        // Organization Information
        organizationName: "Practical Manager Corp",
        organizationCode: "PMC001",
        industry: "technology",
        timezone: "America/New_York",
        country: "United States",
        currency: "USD",
        workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        workHoursStart: "09:00",
        workHoursEnd: "17:00",

        // System Policies
        passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            passwordExpiry: 90,
        },

        // Data Management
        dataRetention: {
            userActivityLogs: 365,
            auditLogs: 2555, // 7 years
            temporaryFiles: 30,
            deletedItems: 30,
        },

        // Security Settings
        security: {
            enableSingleSignOn: false,
            enforceSecurePasswords: true,
            enableLoginAttemptLimits: true,
            maxLoginAttempts: 5,
            sessionTimeout: 480, // 8 hours in minutes
            enable2FAForAdmins: true,
            allowPublicRegistration: false,
        },

        // Notification Settings
        notifications: {
            systemMaintenanceNotices: true,
            securityAlerts: true,
            userRegistrationNotices: true,
            dailyReports: false,
            weeklyReports: true,
            monthlyReports: true,
        },

        // Integration Settings
        integrations: {
            emailProvider: "smtp",
            emailHost: "smtp.gmail.com",
            emailPort: 587,
            enableAPIAccess: false,
            apiRateLimit: 1000,
            webhookEndpoints: [],
        },
    });

    const updateOrgSetting = (section, key, value) => {
        setOrgSettings((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
    };

    const updateTopLevelSetting = (key, value) => {
        setOrgSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Simulate API call to save org settings
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // In real implementation, save to backend
            localStorage.setItem("pm:org:settings", JSON.stringify(orgSettings));

            alert("Organization settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Load settings on component mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("pm:org:settings");
            if (saved) {
                setOrgSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
    }, []);

    // Helper components
    const Field = ({ label, error, children }) => (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );

    const Section = ({ title, description, children }) => (
        <section className="rounded border border-gray-300 bg-white p-4 mb-4">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
            </div>
            {children}
        </section>
    );

    const Toggle = ({ checked, onChange, disabled = false }) => (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                disabled ? "bg-gray-200 cursor-not-allowed" : checked ? "bg-blue-600" : "bg-gray-300"
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    checked ? "translate-x-5" : "translate-x-1"
                }`}
            />
        </button>
    );

    return (
        <div className="min-h-screen bg-[#EDEDED] px-2 py-4 sm:px-4 sm:py-6">
            <div className="flex gap-[5mm]">
                <Sidebar />
                <main className="flex-1">
                    <div className="mx-auto max-w-6xl rounded-lg bg-white p-3 shadow-sm sm:p-4">
                        <div className="mb-6">
                            <h1 className="text-xl font-semibold text-gray-600 sm:text-2xl">Admin Settings</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Organization-wide administrative settings and system configuration
                            </p>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[240px_auto]">
                            {/* Left navigation tabs */}
                            <nav className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-[13px]">
                                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1 lg:gap-0">
                                    {["Organization", "Security", "Policies", "Integrations", "Reports"].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`rounded px-3 py-2 text-left text-xs sm:text-[13px] lg:mb-1 lg:w-full transition-colors ${
                                                activeTab === tab
                                                    ? "bg-white text-blue-700 shadow-inner font-semibold"
                                                    : "hover:bg-white hover:text-gray-800"
                                            }`}
                                        >
                                            <span className="block truncate">{tab}</span>
                                        </button>
                                    ))}
                                </div>
                            </nav>

                            {/* Main content area */}
                            <div className="rounded border border-gray-300 bg-[#F7F7F7] p-4">
                                <form onSubmit={handleSubmit}>
                                    {activeTab === "Organization" && (
                                        <div className="space-y-6">
                                            <div className="mb-4 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                                ORGANIZATION SETTINGS
                                            </div>

                                            <Section
                                                title="Organization Information"
                                                description="Basic information about your organization"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Organization Name">
                                                        <input
                                                            type="text"
                                                            value={orgSettings.organizationName}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting(
                                                                    "organizationName",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </Field>
                                                    <Field label="Organization Code">
                                                        <input
                                                            type="text"
                                                            value={orgSettings.organizationCode}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting(
                                                                    "organizationCode",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            placeholder="e.g., ABC001"
                                                        />
                                                    </Field>
                                                    <Field label="Industry">
                                                        <select
                                                            value={orgSettings.industry}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting("industry", e.target.value)
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="technology">Technology</option>
                                                            <option value="healthcare">Healthcare</option>
                                                            <option value="finance">Finance</option>
                                                            <option value="education">Education</option>
                                                            <option value="manufacturing">Manufacturing</option>
                                                            <option value="retail">Retail</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Country">
                                                        <select
                                                            value={orgSettings.country}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting("country", e.target.value)
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="United States">United States</option>
                                                            <option value="Canada">Canada</option>
                                                            <option value="United Kingdom">United Kingdom</option>
                                                            <option value="Kenya">Kenya</option>
                                                            <option value="Germany">Germany</option>
                                                            <option value="France">France</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </Field>
                                                </div>
                                            </Section>

                                            <Section
                                                title="Working Hours & Calendar"
                                                description="Define organization working hours and policies"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                    <Field label="Timezone">
                                                        <select
                                                            value={orgSettings.timezone}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting("timezone", e.target.value)
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="America/New_York">Eastern Time (US)</option>
                                                            <option value="America/Chicago">Central Time (US)</option>
                                                            <option value="America/Los_Angeles">
                                                                Pacific Time (US)
                                                            </option>
                                                            <option value="Europe/London">London</option>
                                                            <option value="Europe/Berlin">Berlin</option>
                                                            <option value="Africa/Nairobi">Nairobi</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Currency">
                                                        <select
                                                            value={orgSettings.currency}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting("currency", e.target.value)
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="USD">USD - US Dollar</option>
                                                            <option value="EUR">EUR - Euro</option>
                                                            <option value="GBP">GBP - British Pound</option>
                                                            <option value="KES">KES - Kenyan Shilling</option>
                                                            <option value="CAD">CAD - Canadian Dollar</option>
                                                        </select>
                                                    </Field>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Work Hours Start">
                                                        <input
                                                            type="time"
                                                            value={orgSettings.workHoursStart}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting("workHoursStart", e.target.value)
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </Field>
                                                    <Field label="Work Hours End">
                                                        <input
                                                            type="time"
                                                            value={orgSettings.workHoursEnd}
                                                            onChange={(e) =>
                                                                updateTopLevelSetting("workHoursEnd", e.target.value)
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </Field>
                                                </div>
                                            </Section>

                                            <Section
                                                title="Data Management"
                                                description="Configure data retention and cleanup policies"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="User Activity Logs (days)">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.dataRetention.userActivityLogs}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "dataRetention",
                                                                    "userActivityLogs",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="30"
                                                            max="2555"
                                                        />
                                                    </Field>
                                                    <Field label="Audit Logs (days)">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.dataRetention.auditLogs}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "dataRetention",
                                                                    "auditLogs",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="365"
                                                            max="3650"
                                                        />
                                                    </Field>
                                                    <Field label="Temporary Files (days)">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.dataRetention.temporaryFiles}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "dataRetention",
                                                                    "temporaryFiles",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="1"
                                                            max="90"
                                                        />
                                                    </Field>
                                                    <Field label="Deleted Items (days)">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.dataRetention.deletedItems}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "dataRetention",
                                                                    "deletedItems",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="7"
                                                            max="90"
                                                        />
                                                    </Field>
                                                </div>
                                            </Section>
                                        </div>
                                    )}

                                    {activeTab === "Security" && (
                                        <div className="space-y-6">
                                            <div className="mb-4 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                                SECURITY SETTINGS
                                            </div>

                                            <Section
                                                title="Authentication & Access"
                                                description="Configure login security and access controls"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Enable Single Sign-On (SSO)
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Allow users to login with external identity providers
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={orgSettings.security.enableSingleSignOn}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "enableSingleSignOn",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Enforce Secure Passwords
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Require complex passwords meeting security standards
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={orgSettings.security.enforceSecurePasswords}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "enforceSecurePasswords",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Login Attempt Limits
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Lock accounts after failed login attempts
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={orgSettings.security.enableLoginAttemptLimits}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "enableLoginAttemptLimits",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Require 2FA for Admins
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Force two-factor authentication for administrative users
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={orgSettings.security.enable2FAForAdmins}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "enable2FAForAdmins",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between py-2">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Allow Public Registration
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Allow users to create accounts without admin approval
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={orgSettings.security.allowPublicRegistration}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "allowPublicRegistration",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                                    <Field label="Max Login Attempts">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.security.maxLoginAttempts}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "maxLoginAttempts",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="3"
                                                            max="10"
                                                        />
                                                    </Field>
                                                    <Field label="Session Timeout (minutes)">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.security.sessionTimeout}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "security",
                                                                    "sessionTimeout",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="15"
                                                            max="1440"
                                                        />
                                                    </Field>
                                                </div>
                                            </Section>
                                        </div>
                                    )}

                                    {activeTab === "Policies" && (
                                        <div className="space-y-6">
                                            <div className="mb-4 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                                ORGANIZATIONAL POLICIES
                                            </div>

                                            <Section
                                                title="Password Policy"
                                                description="Define password requirements for all users"
                                            >
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <Field label="Minimum Length">
                                                            <input
                                                                type="number"
                                                                value={orgSettings.passwordPolicy.minLength}
                                                                onChange={(e) =>
                                                                    updateOrgSetting(
                                                                        "passwordPolicy",
                                                                        "minLength",
                                                                        parseInt(e.target.value),
                                                                    )
                                                                }
                                                                className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                                min="6"
                                                                max="32"
                                                            />
                                                        </Field>
                                                        <Field label="Password Expiry (days)">
                                                            <input
                                                                type="number"
                                                                value={orgSettings.passwordPolicy.passwordExpiry}
                                                                onChange={(e) =>
                                                                    updateOrgSetting(
                                                                        "passwordPolicy",
                                                                        "passwordExpiry",
                                                                        parseInt(e.target.value),
                                                                    )
                                                                }
                                                                className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                                min="30"
                                                                max="365"
                                                            />
                                                        </Field>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Require Uppercase Letters
                                                            </span>
                                                            <Toggle
                                                                checked={orgSettings.passwordPolicy.requireUppercase}
                                                                onChange={(checked) =>
                                                                    updateOrgSetting(
                                                                        "passwordPolicy",
                                                                        "requireUppercase",
                                                                        checked,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Require Lowercase Letters
                                                            </span>
                                                            <Toggle
                                                                checked={orgSettings.passwordPolicy.requireLowercase}
                                                                onChange={(checked) =>
                                                                    updateOrgSetting(
                                                                        "passwordPolicy",
                                                                        "requireLowercase",
                                                                        checked,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Require Numbers
                                                            </span>
                                                            <Toggle
                                                                checked={orgSettings.passwordPolicy.requireNumbers}
                                                                onChange={(checked) =>
                                                                    updateOrgSetting(
                                                                        "passwordPolicy",
                                                                        "requireNumbers",
                                                                        checked,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-2">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Require Special Characters
                                                            </span>
                                                            <Toggle
                                                                checked={orgSettings.passwordPolicy.requireSpecialChars}
                                                                onChange={(checked) =>
                                                                    updateOrgSetting(
                                                                        "passwordPolicy",
                                                                        "requireSpecialChars",
                                                                        checked,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Section>
                                        </div>
                                    )}

                                    {activeTab === "Integrations" && (
                                        <div className="space-y-6">
                                            <div className="mb-4 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                                SYSTEM INTEGRATIONS
                                            </div>

                                            <Section
                                                title="Email Configuration"
                                                description="Configure email service for system notifications"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Email Provider">
                                                        <select
                                                            value={orgSettings.integrations.emailProvider}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "integrations",
                                                                    "emailProvider",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                        >
                                                            <option value="smtp">SMTP</option>
                                                            <option value="sendgrid">SendGrid</option>
                                                            <option value="mailgun">Mailgun</option>
                                                            <option value="aws-ses">AWS SES</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Email Host">
                                                        <input
                                                            type="text"
                                                            value={orgSettings.integrations.emailHost}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "integrations",
                                                                    "emailHost",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            placeholder="smtp.gmail.com"
                                                        />
                                                    </Field>
                                                    <Field label="Email Port">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.integrations.emailPort}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "integrations",
                                                                    "emailPort",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            placeholder="587"
                                                        />
                                                    </Field>
                                                </div>
                                            </Section>

                                            <Section
                                                title="API Access"
                                                description="Configure API access and rate limiting"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Enable API Access
                                                            </span>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Allow external applications to access the API
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            checked={orgSettings.integrations.enableAPIAccess}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "integrations",
                                                                    "enableAPIAccess",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <Field label="API Rate Limit (requests/hour)">
                                                        <input
                                                            type="number"
                                                            value={orgSettings.integrations.apiRateLimit}
                                                            onChange={(e) =>
                                                                updateOrgSetting(
                                                                    "integrations",
                                                                    "apiRateLimit",
                                                                    parseInt(e.target.value),
                                                                )
                                                            }
                                                            className="w-full h-10 px-3 border border-gray-400 rounded text-sm focus:border-blue-500 focus:outline-none"
                                                            min="100"
                                                            max="10000"
                                                        />
                                                    </Field>
                                                </div>
                                            </Section>
                                        </div>
                                    )}

                                    {activeTab === "Reports" && (
                                        <div className="space-y-6">
                                            <div className="mb-4 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                                REPORTING & NOTIFICATIONS
                                            </div>

                                            <Section
                                                title="System Notifications"
                                                description="Configure which notifications to send to administrators"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            System Maintenance Notices
                                                        </span>
                                                        <Toggle
                                                            checked={orgSettings.notifications.systemMaintenanceNotices}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "notifications",
                                                                    "systemMaintenanceNotices",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Security Alerts
                                                        </span>
                                                        <Toggle
                                                            checked={orgSettings.notifications.securityAlerts}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "notifications",
                                                                    "securityAlerts",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            User Registration Notices
                                                        </span>
                                                        <Toggle
                                                            checked={orgSettings.notifications.userRegistrationNotices}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "notifications",
                                                                    "userRegistrationNotices",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Daily Reports
                                                        </span>
                                                        <Toggle
                                                            checked={orgSettings.notifications.dailyReports}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "notifications",
                                                                    "dailyReports",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Weekly Reports
                                                        </span>
                                                        <Toggle
                                                            checked={orgSettings.notifications.weeklyReports}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "notifications",
                                                                    "weeklyReports",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Monthly Reports
                                                        </span>
                                                        <Toggle
                                                            checked={orgSettings.notifications.monthlyReports}
                                                            onChange={(checked) =>
                                                                updateOrgSetting(
                                                                    "notifications",
                                                                    "monthlyReports",
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </Section>
                                        </div>
                                    )}

                                    {/* Save Button */}
                                    <div className="mt-8 pt-6 border-t border-gray-200">
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                                    isLoading
                                                        ? "bg-gray-400 cursor-not-allowed"
                                                        : "bg-[#00E676] hover:bg-[#00C853] text-white shadow-sm"
                                                }`}
                                            >
                                                {isLoading ? "Saving..." : "Save Admin Settings"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
