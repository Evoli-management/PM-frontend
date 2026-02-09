import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section, Field, LoadingButton } from './UIComponents';
import userProfileService from '../../services/userProfileService';
import authService from '../../services/authService';
import privacyService from '../../services/privacyService';

export const Privacy = ({ showToast }) => {
    const navigate = useNavigate();
    const [privacy, setPrivacy] = useState({
        // Profile Visibility
        profileVisibility: 'team', // public, team, private

        // Data Export & Deletion
        dataRetentionPeriod: 365, // days
        allowDataExport: true,
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deactivatePassword, setDeactivatePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
    const [actionLoading, setActionLoading] = useState({ deactivate: false, delete: false });
    
    useEffect(() => {
        loadPrivacySettings();
    }, []);
    
    const loadPrivacySettings = async () => {
        setLoading(true);
        try {
            const prefs = await privacyService.getPreferences();
            const profileVisibility = prefs.profileVisibility || (prefs.profilePublic ? 'public' : 'team');
            const dataRetentionDays = typeof prefs.dataRetentionDays === 'number'
                ? prefs.dataRetentionDays
                : parseInt(prefs.dataRetentionDays || '365', 10);

            setPrivacy(prev => ({
                ...prev,
                profileVisibility,
                dataRetentionPeriod: Number.isNaN(dataRetentionDays) ? 365 : dataRetentionDays,
                allowDataExport: prefs.allowDataExport ?? true,
            }));
        } catch (error) {
            showToast('Failed to load privacy settings', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const savePrivacySettings = async () => {
        setSaving(true);
        try {
            const payload = {
                profileVisibility: privacy.profileVisibility,
                dataRetentionDays: privacy.dataRetentionPeriod,
                allowDataExport: privacy.allowDataExport,
            };

            const res = await privacyService.updatePreferences(payload);
            const updated = res.preferences || {};
            const profileVisibility = updated.profileVisibility || (updated.profilePublic ? 'public' : privacy.profileVisibility);
            const dataRetentionDays = typeof updated.dataRetentionDays === 'number'
                ? updated.dataRetentionDays
                : parseInt(updated.dataRetentionDays || `${privacy.dataRetentionPeriod}`, 10);

            setPrivacy(prev => ({
                ...prev,
                profileVisibility,
                dataRetentionPeriod: Number.isNaN(dataRetentionDays) ? prev.dataRetentionPeriod : dataRetentionDays,
                allowDataExport: updated.allowDataExport ?? prev.allowDataExport,
            }));
            showToast(res.message || 'Privacy settings saved successfully');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save privacy settings';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };
    
    const updatePrivacySetting = (key, value) => {
        setPrivacy(prev => ({ ...prev, [key]: value }));
    };
    
    const exportData = async () => {
        try {
            const res = await privacyService.requestDataExport();
            showToast(res.message || 'Data export initiated. You will receive an email when ready.', 'info');
            setShowExportModal(false);
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to initiate data export';
            showToast(message, 'error');
        }
    };
    
    const deleteAccount = async () => {
        if (!deletePassword.trim()) {
            showToast('Please enter your password to delete your account', 'error');
            return;
        }

        setActionLoading(prev => ({ ...prev, delete: true }));
        try {
            await userProfileService.deleteAccount(deletePassword);
            showToast('Your account has been deleted', 'info');
            setShowDeleteModal(false);
            setDeletePassword('');
            await authService.logout();
            navigate('/login?reason=deleted');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to delete account';
            showToast(message, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, delete: false }));
        }
    };

    const deactivateAccount = async () => {
        if (!deactivatePassword.trim()) {
            showToast('Please enter your password to deactivate your account', 'error');
            return;
        }

        setActionLoading(prev => ({ ...prev, deactivate: true }));
        try {
            await userProfileService.deactivateAccount(deactivatePassword);
            showToast('Your account has been deactivated', 'info');
            setShowDeactivateModal(false);
            setDeactivatePassword('');
            await authService.logout();
            navigate('/login?reason=deactivated');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to deactivate account';
            showToast(message, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, deactivate: false }));
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

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 mb-2">Deactivate Account</h4>
                        <p className="text-sm text-amber-700 mb-3">
                            Temporarily disable your account. You can contact support to reactivate it later.
                        </p>
                        <button
                            onClick={() => setShowDeactivateModal(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            Deactivate Account
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

            {/* Deactivate Account Modal */}
            {showDeactivateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-amber-900 mb-4">Deactivate Account</h3>
                        <p className="text-gray-600 mb-4">
                            Your account will be disabled and you will be logged out. You can contact support to reactivate it.
                        </p>
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700">Confirm your password</label>
                            <div className="relative mt-1">
                                <input
                                    type={showDeactivatePassword ? 'text' : 'password'}
                                    value={deactivatePassword}
                                    onChange={(e) => setDeactivatePassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDeactivatePassword(prev => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showDeactivatePassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeactivateModal(false);
                                    setDeactivatePassword('');
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                disabled={actionLoading.deactivate}
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                onClick={deactivateAccount}
                                loading={actionLoading.deactivate}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg"
                            >
                                Deactivate Account
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
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700">Confirm your password</label>
                            <div className="relative mt-1">
                                <input
                                    type={showDeletePassword ? 'text' : 'password'}
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDeletePassword(prev => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showDeletePassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletePassword('');
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                disabled={actionLoading.delete}
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                onClick={deleteAccount}
                                loading={actionLoading.delete}
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