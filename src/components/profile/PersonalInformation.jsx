import React, { useState, useEffect } from 'react';
import { Field, Section, LoadingButton } from './UIComponents';
import { AvatarManager } from './AvatarManager';
import userProfileService from '../../services/userProfileService';

export const PersonalInformation = ({ showToast }) => {
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [avatarPreview, setAvatarPreview] = useState(null);
    
    const [personalDraft, setPersonalDraft] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });
    
    const [professionalDraft, setProfessionalDraft] = useState({
        jobTitle: "",
        department: "",
        manager: "",
    });
    
    const [savedPersonal, setSavedPersonal] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });
    
    const [savedProfessional, setSavedProfessional] = useState({
        jobTitle: "",
        department: "",
        manager: "",
    });
    

    // Load user profile data on component mount
    useEffect(() => {
        loadUserProfile();
    }, []);

    // Initialize drafts from saved data when saved data changes
    useEffect(() => {
        setPersonalDraft(savedPersonal);
    }, [savedPersonal]);

    useEffect(() => {
        setProfessionalDraft(savedProfessional);
    }, [savedProfessional]);

    const loadUserProfile = async () => {
        try {
            setInitialLoading(true);
            const profileData = await userProfileService.getProfile();
            const formattedData = userProfileService.formatProfileData(profileData);
            
            // Set personal information
            // Use direct firstName/lastName from API response
            const firstName = profileData.firstName || formattedData.firstName || '';
            const lastName = profileData.lastName || formattedData.lastName || '';
            
            setSavedPersonal({
                firstName: firstName,
                lastName: lastName,
                email: formattedData.email || profileData.email || '',
                phone: formattedData.phone || profileData.phone || ''
            });

            // Set professional information
            // Set professional information (without bio/skills on the UI)
            setSavedProfessional({
                jobTitle: formattedData.jobTitle || '',
                department: formattedData.department || '',
                manager: formattedData.manager || ''
            });

            // Set avatar if available
            if (formattedData.avatarUrl) {
                setAvatarPreview(formattedData.avatarUrl);
            }

        } catch (error) {
            console.error('Failed to load user profile:', error);
            showToast('Failed to load profile information', 'error');
        } finally {
            setInitialLoading(false);
        }
    };

    const clearError = (key) => {
        setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handlePersonalChange = (field) => (e) => {
        setPersonalDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    };

    const handleProfessionalChange = (field) => (e) => {
        setProfessionalDraft(prev => ({ ...prev, [field]: e.target.value }));
        clearError(field);
    };

    const validatePersonalForm = () => {
        const validation = userProfileService.validateProfileData({
            firstName: personalDraft.firstName,
            lastName: personalDraft.lastName,
            phone: personalDraft.phone
        });

        const newErrors = {};
        
        if (!personalDraft.firstName.trim()) {
            newErrors.firstName = "First name is required";
        }
        
        if (validation.errors.phone) {
            newErrors.phone = validation.errors.phone;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateProfessionalForm = () => {
        const validation = userProfileService.validateProfileData({
            jobTitle: professionalDraft.jobTitle,
            department: professionalDraft.department,
            manager: professionalDraft.manager
        });

        setErrors(validation.errors);
        return validation.isValid;
    };

    const savePersonalInfo = async () => {
        if (!validatePersonalForm()) return;
        
        setIsLoading(true);
        try {
            // Send first name and last name separately, plus phone
            const personalData = {
                firstName: personalDraft.firstName,
                lastName: personalDraft.lastName,
                phone: personalDraft.phone
            };
            
            const updatedProfile = await userProfileService.updatePersonalInfo(personalData);
            const formattedData = userProfileService.formatProfileData(updatedProfile);
            
            // Extract names from response
            const displayName = updatedProfile.fullName || formattedData.fullName || formattedData.name || '';
            const nameParts = displayName.split(' ');
            const firstName = nameParts[0] || personalDraft.firstName;
            const lastName = nameParts.slice(1).join(' ') || personalDraft.lastName;
            
            setSavedPersonal({
                firstName: firstName,
                lastName: lastName,
                email: formattedData.email || '', // Keep existing email
                phone: formattedData.phone || ''
            });
            
            setIsEditingPersonal(false);
            showToast('Personal information updated successfully!');
        } catch (error) {
            console.error('Failed to save personal info:', error);
            showToast('Failed to save personal information', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const saveProfessionalInfo = async () => {
        if (!validateProfessionalForm()) return;
        
        setIsLoading(true);
        try {
            const professionalData = {
                ...professionalDraft
            };
            
            const updatedProfile = await userProfileService.updateProfessionalInfo(professionalData);
            const formattedData = userProfileService.formatProfileData(updatedProfile);

            setSavedProfessional({
                jobTitle: formattedData.jobTitle || '',
                department: formattedData.department || '',
                manager: formattedData.manager || ''
            });

            setIsEditingProfessional(false);
            showToast('Professional information updated successfully!');
        } catch (error) {
            console.error('Failed to save professional info:', error);
            showToast('Failed to save professional information', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const cancelPersonalEdit = () => {
        setPersonalDraft(savedPersonal);
        setIsEditingPersonal(false);
        setErrors({});
    };

    const cancelProfessionalEdit = () => {
        setProfessionalDraft(savedProfessional);
        setIsEditingProfessional(false);
        setErrors({});
    };

    const addSkill = () => {
        // Skills functionality has been removed
    };
    

    const handleAvatarUpdate = async (avatarData) => {
        try {
            setIsLoading(true);
            // AvatarManager passes either a base64 string or an object { data, silent }
            let dataString = null;
            let silent = false;
            if (typeof avatarData === 'string') {
                dataString = avatarData;
            } else if (avatarData && typeof avatarData === 'object' && avatarData.data) {
                dataString = avatarData.data;
                silent = !!avatarData.silent;
            }

            if (dataString) {
                const updatedProfile = await userProfileService.updateAvatar(dataString);
                setAvatarPreview(updatedProfile.avatarUrl || dataString);
                setSavedPersonal(prev => ({ ...prev, avatarUrl: updatedProfile.avatarUrl || dataString }));
            }

            // Only show toast when not silent
            if (!silent) showToast('Avatar updated successfully!');

            // Dispatch event to notify other components (like Navbar) of profile update
            window.dispatchEvent(new CustomEvent('profileUpdated'));
        } catch (error) {
            console.error('Failed to update avatar:', error);
            showToast('Failed to update avatar', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading profile information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Compact Profile Header */}
            <Section title="Personal Details" icon="👤">
                <div className="bg-white shadow-sm ring-1 ring-gray-100 rounded-lg p-3">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-shrink-0">
                            <AvatarManager
                                avatarPreview={avatarPreview}
                                setAvatarPreview={setAvatarPreview}
                                onAvatarChange={handleAvatarUpdate}
                                avatarSeed={savedPersonal.firstName}
                                showToast={showToast}
                            />
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    First name
                                </label>
                                <input
                                    value={isEditingPersonal ? personalDraft.firstName : savedPersonal.firstName}
                                    onChange={handlePersonalChange('firstName')}
                                    className={`w-full px-2 py-1.5 text-sm border-b border-gray-200 ${isEditingPersonal ? 'bg-white focus:border-gray-400' : 'bg-gray-50 cursor-default'} focus:outline-none`}
                                    readOnly={!isEditingPersonal}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Last name
                                </label>
                                <input
                                    value={isEditingPersonal ? personalDraft.lastName : savedPersonal.lastName}
                                    onChange={handlePersonalChange('lastName')}
                                    className={`w-full px-2 py-1.5 text-sm border-b border-gray-200 ${isEditingPersonal ? 'bg-white focus:border-gray-400' : 'bg-gray-50 cursor-default'} focus:outline-none`}
                                    readOnly={!isEditingPersonal}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={savedPersonal.email}
                                    className="w-full px-2 py-1.5 text-sm border-b border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed focus:outline-none"
                                    disabled
                                    readOnly
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    Phone
                                </label>
                                <input
                                    value={isEditingPersonal ? personalDraft.phone : savedPersonal.phone}
                                    onChange={handlePersonalChange('phone')}
                                    className={`w-full px-2 py-1.5 text-sm border-b border-gray-200 ${isEditingPersonal ? 'bg-white focus:border-gray-400' : 'bg-gray-50 cursor-default'} focus:outline-none`}
                                    readOnly={!isEditingPersonal}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-2 mt-3">
                    {isEditingPersonal ? (
                        <>
                            <LoadingButton variant="outline" onClick={cancelPersonalEdit} disabled={isLoading}>Cancel</LoadingButton>
                            <LoadingButton onClick={savePersonalInfo} isLoading={isLoading} loadingText="Saving...">Save</LoadingButton>
                        </>
                    ) : (
                        <LoadingButton variant="outline" onClick={() => setIsEditingPersonal(true)}>Edit</LoadingButton>
                    )}
                </div>
            </Section>
        </div>
    );
};