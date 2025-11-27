import React, { useState, useRef, useCallback } from 'react';
import Sidebar from '../components/shared/Sidebar';
import { ProfileLayout } from '../components/profile/ProfileLayout';
import { PersonalInformation } from '../components/profile/PersonalInformation';
import { SecuritySettings } from '../components/profile/SecuritySettings';
import { Preferences } from '../components/profile/Preferences';
import { Integrations } from '../components/profile/Integrations';
import { Toast } from '../components/profile/UIComponents';
import { FaBars } from 'react-icons/fa';

// Teams Component (simplified for now)
const TeamsTab = ({ showToast }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Teams & Members</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">👥</span>
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Teams & Members Management
                        </h3>
                        <p className="text-sm text-gray-600 max-w-md">
                            Manage your teams, invite members, assign leaders, and organize your workspace in the dedicated Teams section.
                        </p>
                    </div>
                    
                    <a
                        href="#/teams"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Go to Teams Section
                    </a>
                </div>
            </div>
        </div>
    );
};

export default function ProfileSetting() {
    const [activeTab, setActiveTab] = useState("My Profile");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    // Global toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);
    
    const showToast = useCallback((message, type = 'success', timeout = 2400) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        setToast({ visible: true, message, type });
        toastTimerRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, timeout);
    }, []);

    const closeToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "My Profile":
                return <PersonalInformation showToast={showToast} />;
            case "Security":
                return <SecuritySettings showToast={showToast} />;
            case "Preferences":
                return <Preferences showToast={showToast} />;
            case "Integrations":
                return <Integrations showToast={showToast} />;
            case "Teams & Members":
                return <TeamsTab showToast={showToast} />;
            default:
                return <PersonalInformation showToast={showToast} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#EDEDED] px-2 py-4 sm:px-4 sm:py-6 flex flex-col">
            <div className="flex flex-1 gap-[5mm] min-h-0">
                <Sidebar 
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />

                {/* Mobile backdrop */}
                {mobileSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}

                <main className="flex-1 flex flex-col min-h-0">
                    {/* Mobile menu button */}
                    <button
                        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        <FaBars className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex-1 flex min-h-0">
                        <ProfileLayout activeTab={activeTab} setActiveTab={setActiveTab}>
                            {renderTabContent()}
                        </ProfileLayout>
                    </div>
                </main>
            </div>
            
            {/* Global Toast */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onClose={closeToast}
            />
        </div>
    );
}
