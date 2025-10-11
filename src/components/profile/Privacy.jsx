import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';

export const Privacy = ({ showToast }) => {
    const [privacy, setPrivacy] = useState({
        // Profile Visibility
        profileVisibility: 'team', // public, team, private
        showEmail: false,
        showPhone: false,
        showLocation: false,
        
        // Activity Visibility
        showOnlineStatus: true,
        showLastActivity: false,
        showWorkingHours: true,
        showCurrentProject: false,
        
        // Data & Analytics
        allowAnalytics: true,
        allowUsageData: false,
        allowCrashReports: true,
        allowPersonalization: true,
        
        // Communication
        allowDirectMessages: true,
        allowMentions: true,
        allowCalendarInvites: true,
        allowNotifications: true,
        
        // Data Export & Deletion
        dataRetentionPeriod: 365, // days
        allowDataExport: true,
        
        // Third-party Access
        allowThirdPartyApps: false,
        allowAPIAccess: false
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    
    useEffect(() => {
        loadPrivacySettings();
    }, []);
    
    const loadPrivacySettings = async () => {
        setLoading(true);
        try {
            // Load from localStorage for now - replace with API call
            const saved = localStorage.getItem('userPrivacySettings');
            if (saved) {
                setPrivacy(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
        } catch (error) {
            showToast('Failed to load privacy settings', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const savePrivacySettings = async () => {
        setSaving(true);
        try {
            // Save to localStorage for now - replace with API call
            localStorage.setItem('userPrivacySettings', JSON.stringify(privacy));
            showToast('Privacy settings saved successfully');
        } catch (error) {
            showToast('Failed to save privacy settings', 'error');
        } finally {
            setSaving(false);
        }
    };
    
    const updatePrivacySetting = (key, value) => {
        setPrivacy(prev => ({ ...prev, [key]: value }));
    };
    
    const exportData = async () => {
        try {
            // Simulate data export - replace with actual API call
            showToast('Data export initiated. You will receive an email when ready.', 'info');
            setShowExportModal(false);
        } catch (error) {
            showToast('Failed to initiate data export', 'error');
        }
    };
    
    const deleteAccount = async () => {
        try {
            // Simulate account deletion - replace with actual API call
            showToast('Account deletion request submitted', 'info');
            setShowDeleteModal(false);
        } catch (error) {
            showToast('Failed to submit deletion request', 'error');
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Profile Visibility */}
            <Section 
                title="Profile Visibility" 
                description="Control who can see your profile information"
            >
                <div className="space-y-4">
                    <Field label="Profile Visibility">
                        <select
                            value={privacy.profileVisibility}
                            onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="public">Public - Anyone can see</option>
                            <option value="team">Team Only - Only team members</option>
                            <option value="private">Private - Only you</option>
                        </select>
                    </Field>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle
                            label="Show Email Address"
                            description="Display email in your profile"
                            checked={privacy.showEmail}
                            onChange={(checked) => updatePrivacySetting('showEmail', checked)}
                        />
                        <Toggle
                            label="Show Phone Number"
                            description="Display phone in your profile"
                            checked={privacy.showPhone}
                            onChange={(checked) => updatePrivacySetting('showPhone', checked)}
                        />
                        <Toggle
                            label="Show Location"
                            description="Display your location"
                            checked={privacy.showLocation}
                            onChange={(checked) => updatePrivacySetting('showLocation', checked)}
                        />
                    </div>
                </div>
            </Section>
            
            {/* Activity Visibility */}
            <Section 
                title="Activity Visibility" 
                description="Control what activity information others can see"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle
                        label="Show Online Status"
                        description="Let others see when you're online"
                        checked={privacy.showOnlineStatus}
                        onChange={(checked) => updatePrivacySetting('showOnlineStatus', checked)}
                    />
                    <Toggle
                        label="Show Last Activity"
                        description="Display when you were last active"
                        checked={privacy.showLastActivity}
                        onChange={(checked) => updatePrivacySetting('showLastActivity', checked)}
                    />
                    <Toggle
                        label="Show Working Hours"
                        description="Display your working hours"
                        checked={privacy.showWorkingHours}
                        onChange={(checked) => updatePrivacySetting('showWorkingHours', checked)}
                    />
                    <Toggle
                        label="Show Current Project"
                        description="Display what project you're working on"
                        checked={privacy.showCurrentProject}
                        onChange={(checked) => updatePrivacySetting('showCurrentProject', checked)}
                    />
                </div>
            </Section>
            
            {/* Data & Analytics */}
            <Section 
                title="Data & Analytics" 
                description="Control how your data is used for analytics and improvements"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle
                        label="Allow Analytics"
                        description="Help improve the app with usage analytics"
                        checked={privacy.allowAnalytics}
                        onChange={(checked) => updatePrivacySetting('allowAnalytics', checked)}
                    />
                    <Toggle
                        label="Share Usage Data"
                        description="Share anonymized usage statistics"
                        checked={privacy.allowUsageData}
                        onChange={(checked) => updatePrivacySetting('allowUsageData', checked)}
                    />
                    <Toggle
                        label="Allow Crash Reports"
                        description="Send crash reports to help fix bugs"
                        checked={privacy.allowCrashReports}
                        onChange={(checked) => updatePrivacySetting('allowCrashReports', checked)}
                    />
                    <Toggle
                        label="Allow Personalization"
                        description="Use data to personalize your experience"
                        checked={privacy.allowPersonalization}
                        onChange={(checked) => updatePrivacySetting('allowPersonalization', checked)}
                    />
                </div>
            </Section>
            
            {/* Communication */}
            <Section 
                title="Communication Preferences" 
                description="Control how others can communicate with you"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle
                        label="Allow Direct Messages"
                        description="Let team members message you directly"
                        checked={privacy.allowDirectMessages}
                        onChange={(checked) => updatePrivacySetting('allowDirectMessages', checked)}
                    />
                    <Toggle
                        label="Allow Mentions"
                        description="Allow others to mention you in comments"
                        checked={privacy.allowMentions}
                        onChange={(checked) => updatePrivacySetting('allowMentions', checked)}
                    />
                    <Toggle
                        label="Allow Calendar Invites"
                        description="Let others send you meeting invites"
                        checked={privacy.allowCalendarInvites}
                        onChange={(checked) => updatePrivacySetting('allowCalendarInvites', checked)}
                    />
                    <Toggle
                        label="Allow Notifications"
                        description="Receive notifications from the platform"
                        checked={privacy.allowNotifications}
                        onChange={(checked) => updatePrivacySetting('allowNotifications', checked)}
                    />
                </div>
            </Section>
            
            {/* Data Management */}
            <Section 
                title="Data Management" 
                description="Control your data retention and access"
            >
                <div className="space-y-4">
                    <Field label="Data Retention Period">
                        <select
                            value={privacy.dataRetentionPeriod}
                            onChange={(e) => updatePrivacySetting('dataRetentionPeriod', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={90}>3 months</option>
                            <option value={180}>6 months</option>
                            <option value={365}>1 year</option>
                            <option value={730}>2 years</option>
                            <option value={-1}>Indefinitely</option>
                        </select>
                        <p className="text-sm text-gray-600 mt-1">
                            How long to keep your data after account deletion
                        </p>
                    </Field>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle
                            label="Allow Third-party Apps"
                            description="Let third-party apps access your data"
                            checked={privacy.allowThirdPartyApps}
                            onChange={(checked) => updatePrivacySetting('allowThirdPartyApps', checked)}
                        />
                        <Toggle
                            label="Allow API Access"
                            description="Enable API access to your account"
                            checked={privacy.allowAPIAccess}
                            onChange={(checked) => updatePrivacySetting('allowAPIAccess', checked)}
                        />
                    </div>
                </div>
            </Section>
            
            {/* Data Actions */}
            <Section 
                title="Data Actions" 
                description="Export or delete your account data"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Export Your Data</h4>
                        <p className="text-sm text-blue-700 mb-3">
                            Download a copy of all your data including profiles, projects, tasks, and settings.
                        </p>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            Export Data
                        </button>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                        <p className="text-sm text-red-700 mb-3">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </Section>
            
            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
                <LoadingButton
                    onClick={savePrivacySettings}
                    loading={saving}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                    Save Privacy Settings
                </LoadingButton>
            </div>
            
            {/* Export Data Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">Export Your Data</h3>
                        <p className="text-gray-600 mb-6">
                            We'll prepare a download of all your data and send you an email when it's ready. 
                            This usually takes a few minutes.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                onClick={exportData}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                            >
                                Start Export
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-red-900 mb-4">Delete Account</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to delete your account? This will permanently remove:
                        </p>
                        <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                            <li>Your profile and personal information</li>
                            <li>All projects and tasks you've created</li>
                            <li>Your activity history and settings</li>
                            <li>Any uploaded files or documents</li>
                        </ul>
                        <p className="text-sm text-red-600 font-medium mb-6">
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                onClick={deleteAccount}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                            >
                                Delete Account
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};