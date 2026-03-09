import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Section, Field, LoadingButton } from './UIComponents';
import userProfileService from '../../services/userProfileService';
import authService from '../../services/authService';
import privacyService from '../../services/privacyService';

export const Privacy = ({ showToast }) => {
    const { t } = useTranslation();
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
            showToast(t('privacy.loadError'), 'error');
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
            showToast(res.message || t('privacy.saveSuccess'));
        } catch (error) {
            const message = error.response?.data?.message || t('privacy.saveSuccess');
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
            showToast(res.message || t('privacy.exportInitiated'), 'info');
            setShowExportModal(false);
        } catch (error) {
            const message = error.response?.data?.message || t('privacy.exportError');
            showToast(message, 'error');
        }
    };

    const deleteAccount = async () => {
        if (!deletePassword.trim()) {
            showToast(t('privacy.deletePasswordRequired'), 'error');
            return;
        }

        setActionLoading(prev => ({ ...prev, delete: true }));
        try {
            await userProfileService.deleteAccount(deletePassword);
            showToast(t('privacy.accountDeleted'), 'info');
            setShowDeleteModal(false);
            setDeletePassword('');
            await authService.logout();
            navigate('/login?reason=deleted');
        } catch (error) {
            const message = error.response?.data?.message || t('privacy.deleteError');
            showToast(message, 'error');
        } finally {
            setActionLoading(prev => ({ ...prev, delete: false }));
        }
    };

    const deactivateAccount = async () => {
        if (!deactivatePassword.trim()) {
            showToast(t('privacy.deactivatePasswordRequired'), 'error');
            return;
        }

        setActionLoading(prev => ({ ...prev, deactivate: true }));
        try {
            await userProfileService.deactivateAccount(deactivatePassword);
            showToast(t('privacy.accountDeactivated'), 'info');
            setShowDeactivateModal(false);
            setDeactivatePassword('');
            await authService.logout();
            navigate('/login?reason=deactivated');
        } catch (error) {
            const message = error.response?.data?.message || t('privacy.deactivateError');
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
                title={t('privacy.profileVisibilityTitle')}
                description={t('privacy.profileVisibilityDesc')}
            >
                <div className="space-y-4">
                    <Field label={t('privacy.profileVisibilityLabel')}>
                        <select
                            value={privacy.profileVisibility}
                            onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="public">{t('privacy.visibilityPublic')}</option>
                            <option value="team">{t('privacy.visibilityTeam')}</option>
                            <option value="private">{t('privacy.visibilityPrivate')}</option>
                        </select>
                    </Field>
                </div>
            </Section>

            {/* Data Management */}
            <Section
                title={t('privacy.dataManagementTitle')}
                description={t('privacy.dataManagementDesc')}
            >
                <div className="space-y-4">
                    <Field label={t('privacy.dataRetentionLabel')}>
                        <select
                            value={privacy.dataRetentionPeriod}
                            onChange={(e) => updatePrivacySetting('dataRetentionPeriod', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={90}>{t('privacy.retention3Months')}</option>
                            <option value={180}>{t('privacy.retention6Months')}</option>
                            <option value={365}>{t('privacy.retention1Year')}</option>
                            <option value={730}>{t('privacy.retention2Years')}</option>
                            <option value={-1}>{t('privacy.retentionIndefinitely')}</option>
                        </select>
                        <p className="text-sm text-gray-600 mt-1">
                            {t('privacy.retentionHint')}
                        </p>
                    </Field>

                </div>
            </Section>

            {/* Data Actions */}
            <Section
                title={t('privacy.dataActionsTitle')}
                description={t('privacy.dataActionsDesc')}
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">{t('privacy.exportTitle')}</h4>
                        <p className="text-sm text-blue-700 mb-3">
                            {t('privacy.exportDesc')}
                        </p>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            {t('privacy.exportBtn')}
                        </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 mb-2">{t('privacy.deactivateTitle')}</h4>
                        <p className="text-sm text-amber-700 mb-3">
                            {t('privacy.deactivateDesc')}
                        </p>
                        <button
                            onClick={() => setShowDeactivateModal(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            {t('privacy.deactivateBtn')}
                        </button>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2">{t('privacy.deleteTitle')}</h4>
                        <p className="text-sm text-red-700 mb-3">
                            {t('privacy.deleteDesc')}
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            {t('privacy.deleteBtn')}
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
                    {t('privacy.saveBtn')}
                </LoadingButton>
            </div>

            {/* Export Data Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">{t('privacy.exportModalTitle')}</h3>
                        <p className="text-gray-600 mb-6">
                            {t('privacy.exportModalDesc')}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                {t('privacy.cancel')}
                            </button>
                            <LoadingButton
                                onClick={exportData}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                            >
                                {t('privacy.startExport')}
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate Account Modal */}
            {showDeactivateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-amber-900 mb-4">{t('privacy.deactivateModalTitle')}</h3>
                        <p className="text-gray-600 mb-4">
                            {t('privacy.deactivateModalDesc')}
                        </p>
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700">{t('privacy.confirmPassword')}</label>
                            <div className="relative mt-1">
                                <input
                                    type={showDeactivatePassword ? 'text' : 'password'}
                                    value={deactivatePassword}
                                    onChange={(e) => setDeactivatePassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder={t('privacy.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDeactivatePassword(prev => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showDeactivatePassword ? t('privacy.hide') : t('privacy.show')}
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
                                {t('privacy.cancel')}
                            </button>
                            <LoadingButton
                                onClick={deactivateAccount}
                                loading={actionLoading.deactivate}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg"
                            >
                                {t('privacy.deactivateBtn')}
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-red-900 mb-4">{t('privacy.deleteModalTitle')}</h3>
                        <p className="text-gray-600 mb-4">
                            {t('privacy.deleteModalDesc')}
                        </p>
                        <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                            <li>{t('privacy.deleteItem1')}</li>
                            <li>{t('privacy.deleteItem2')}</li>
                            <li>{t('privacy.deleteItem3')}</li>
                            <li>{t('privacy.deleteItem4')}</li>
                        </ul>
                        <p className="text-sm text-red-600 font-medium mb-6">
                            {t('privacy.cannotUndo')}
                        </p>
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700">{t('privacy.confirmPassword')}</label>
                            <div className="relative mt-1">
                                <input
                                    type={showDeletePassword ? 'text' : 'password'}
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder={t('privacy.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDeletePassword(prev => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showDeletePassword ? t('privacy.hide') : t('privacy.show')}
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
                                {t('privacy.cancel')}
                            </button>
                            <LoadingButton
                                onClick={deleteAccount}
                                loading={actionLoading.delete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                            >
                                {t('privacy.deleteBtn')}
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
