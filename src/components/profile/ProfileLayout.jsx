import React, { useState, useEffect } from "react";

const ProfileLayout = ({ children, activeTab, setActiveTab }) => {
    const tabs = [
        "My Profile",
        "Security",
        "Preferences",
        "Integrations",
        // "Teams & Members" // Hidden for now until Teams feature is implemented
    ];

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
                    "my-profile": "My Profile",
                    "security": "Security",
                    "preferences": "Preferences",
                    "integrations": "Integrations",
                    "teams": "Teams & Members",
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
    }, [setActiveTab]);

    return (
        <div className="mx-auto max-w-6xl rounded-lg bg-white p-4 shadow-sm">
            <h1 className="mb-4 text-xl font-semibold text-gray-800">Profile Settings</h1>

            <div className="grid gap-4 lg:grid-cols-[240px_auto] items-stretch">
                {/* Left sidebar - tabs */}
                <nav className="rounded border border-gray-300 bg-gray-50 p-3">
                    <div className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                                    activeTab === tab
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "hover:bg-gray-100 text-gray-700"
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main content area */}
                <div className="rounded border border-gray-300 bg-gray-50 p-4 min-h-[520px]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export { ProfileLayout };