import React, { useState, useRef, useCallback } from 'react';
import Sidebar from '../components/shared/Sidebar';
import { ProfileLayout } from '../components/profile/ProfileLayout';
import { PersonalInformation } from '../components/profile/PersonalInformation';
import { SecuritySettings } from '../components/profile/SecuritySettings';
import { Preferences } from '../components/profile/Preferences';
import { Integrations } from '../components/profile/Integrations';
import { Toast } from '../components/profile/UIComponents';
import { OrganizationOverview, OrganizationMembers, InviteModal, OrganizationInvitations, ManageTeams, ManageMembers, CultureAndValues, OrganizationSettings } from '../components/profile';
import { FaBars } from 'react-icons/fa';
import userProfileService from '../services/userProfileService';
import organizationService from '../services/organizationService';

const OrganizationTab = ({ showToast }) => {
    const [activeSubTab, setActiveSubTab] = React.useState("overview");
    const [canManage, setCanManage] = React.useState(false);

    React.useEffect(() => {
        const checkPermissions = async () => {
            try {
                const profile = await userProfileService.getProfile();
                const org = await organizationService.getCurrentOrganization();
                const isAdmin = profile?.role === 'admin' || profile?.isSuperUser === true;
                const isOwner = org?.contactEmail === profile?.email;
                setCanManage(isAdmin || isOwner);
            } catch (e) {
                setCanManage(false);
            }
        };
        checkPermissions();
    }, []);

    const subTabs = [
        { id: "overview", label: "Overview" },
        { id: "teams", label: canManage ? "Manage Teams" : "View Teams" },
        { id: "members", label: canManage ? "Manage Members" : "View Members" },
        { id: "culture", label: canManage ? "Manage Culture and Values" : "View Culture and Values" },
        ...(canManage ? [{ id: "settings", label: "Settings" }] : []),
    ];

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            case "overview":
                return <OrganizationOverview showToast={showToast} />;
            case "teams":
                return <ManageTeams showToast={showToast} />;
            case "members":
                return <ManageMembers showToast={showToast} />;
            case "culture":
                return <CultureAndValues showToast={showToast} />;
            case "settings":
                return <OrganizationSettings showToast={showToast} />;
            default:
                return <OrganizationOverview showToast={showToast} />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Sub-navigation */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                {subTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            activeSubTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab content */}
            <div>{renderSubTabContent()}</div>
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
            case "Organization":
                return <OrganizationTab showToast={showToast} />;
            default:
                return <PersonalInformation showToast={showToast} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#EDEDED] px-2 py-4 sm:px-4 sm:py-6">
            <div className="flex gap-[5mm]">
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

                <main className="flex-1">
                    {/* Mobile menu button */}
                    <button
                        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        <FaBars className="h-5 w-5 text-gray-600" />
                    </button>
                    <ProfileLayout activeTab={activeTab} setActiveTab={setActiveTab}>
                        {renderTabContent()}
                    </ProfileLayout>
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
