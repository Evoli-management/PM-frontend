import React, { useEffect } from "react";

const ProfileLayout = ({ children, activeTab, setActiveTab }) => {
    const tabs = [
        "My Profile",
        "Security",
        "Preferences",
        "Integrations",
        "Organization",
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
                    "organization": "Organization",
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
        // Further reduce horizontal padding to remove unnecessary left space and better align with other pages
        <main className="flex-1 min-w-0 w-full min-h-screen transition-all md:ml-[1mm] overflow-y-auto px-0 md:px-0">
            <div className="max-w-full overflow-x-hidden pb-8 min-h-full">
                <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700" aria-label="Open sidebar">
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg>
                        </button>
                    </div>
                </div>

                <div>
                    <div className="rounded-lg bg-white p-1 shadow-sm sm:p-2">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-3">
                                <h1 className="text-lg font-semibold text-gray-600 sm:text-xl">Profile Settings</h1>
                                <div className="flex gap-2">
                                    {/* action buttons can go here if needed */}
                                </div>
                            </div>

                            <section className="mt-5 border-t border-gray-200 pt-5">
                                <div className="grid gap-4 lg:grid-cols-[240px_auto] items-stretch">
                                    {/* Left sidebar - tabs */}
                                    <nav className="rounded border border-gray-300 bg-gray-50 p-2">
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
                                    <div className="rounded border border-gray-300 bg-gray-50 p-3 min-h-[520px]">
                                        {children}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export { ProfileLayout };