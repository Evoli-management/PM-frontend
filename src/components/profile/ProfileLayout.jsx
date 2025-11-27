import React, { useState, useEffect } from "react";

const ProfileLayout = ({ children, activeTab, setActiveTab }) => {
    const tabs = [
        "My Profile",
        "Security",
        "Preferences",
        "Integrations",
        "Teams & Members"
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
        <div className="flex flex-col w-full h-full rounded-xl bg-white p-2 shadow-md border border-gray-200">
            <div className="grid flex-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                {/* Left sidebar - tabs */}
                <nav className="rounded-xl border border-gray-200 bg-gray-50/90 p-2.5 flex flex-col h-full">
                    <div className="space-y-1 pr-0.5">
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
                <div className="rounded-xl border border-gray-200 bg-white p-4 h-full">
                    {children}
                </div>
            </div>
        </div>
    );
};

export { ProfileLayout };