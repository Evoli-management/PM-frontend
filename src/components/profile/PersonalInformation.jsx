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
        bio: "",
        skills: []
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
        bio: "",
        skills: []
    });

    const [skillsInput, setSkillsInput] = useState("");

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
            console.log('🚀 Loading user profile...');
            setInitialLoading(true);
            const profileData = await userProfileService.getProfile();
            console.log('🔥 Raw profile data from API:', profileData);
            console.log('🔥 Raw profile data KEYS:', Object.keys(profileData));
            console.log('🔥 firstName from API:', profileData.firstName);
            console.log('🔥 lastName from API:', profileData.lastName);
            console.log('🔥 fullName from API:', profileData.fullName);
            console.log('🔥 name from API:', profileData.name);
            
            const formattedData = userProfileService.formatProfileData(profileData);
            console.log('✅ Formatted profile data:', formattedData);
            
            // Set personal information
            // Use direct firstName/lastName from API response
            const firstName = profileData.firstName || formattedData.firstName || '';
            const lastName = profileData.lastName || formattedData.lastName || '';
            
            console.log('🎯 Setting firstName:', firstName);
            console.log('🎯 Setting lastName:', lastName);
            
            setSavedPersonal({
                firstName: firstName,
                lastName: lastName,
                email: formattedData.email || profileData.email || '',
                phone: formattedData.phone || profileData.phone || ''
            });

            // Set professional information
            const skillsArray = formattedData.skills ? 
                formattedData.skills.split(',').map(s => s.trim()).filter(s => s) : [];
            
            setSavedProfessional({
                jobTitle: formattedData.jobTitle || '',
                department: formattedData.department || '',
                manager: formattedData.manager || '',
                bio: formattedData.bio || '',
                skills: skillsArray
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
            manager: professionalDraft.manager,
            bio: professionalDraft.bio,
            skills: professionalDraft.skills.join(', ')
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
                ...professionalDraft,
                skills: professionalDraft.skills.join(', ')
            };
            
            const updatedProfile = await userProfileService.updateProfessionalInfo(professionalData);
            const formattedData = userProfileService.formatProfileData(updatedProfile);
            
            const skillsArray = formattedData.skills ? 
                formattedData.skills.split(',').map(s => s.trim()).filter(s => s) : [];
            
            setSavedProfessional({
                jobTitle: formattedData.jobTitle || '',
                department: formattedData.department || '',
                manager: formattedData.manager || '',
                bio: formattedData.bio || '',
                skills: skillsArray
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
        const skill = skillsInput.trim();
        if (skill && !professionalDraft.skills.includes(skill)) {
            setProfessionalDraft(prev => ({
                ...prev,
                skills: [...prev.skills, skill]
            }));
            setSkillsInput("");
        }
    };

    const removeSkill = (skillToRemove) => {
        setProfessionalDraft(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleSkillKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    };

    const handleAvatarUpdate = async (avatarData) => {
        try {
            setIsLoading(true);
            
            // AvatarManager passes base64 data strings, not File objects
            if (typeof avatarData === 'string') {
                const updatedProfile = await userProfileService.updateAvatar(avatarData);
                setAvatarPreview(updatedProfile.avatarUrl || avatarData);
                setSavedPersonal(prev => ({ ...prev, avatarUrl: updatedProfile.avatarUrl || avatarData }));
            }
            
            showToast('Avatar updated successfully!');
            
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
        <div className="space-y-6">
            {/* Profile Picture and Basic Info - Horizontal Layout */}
            <Section title="Personal Details" icon="👤">
                <div className="space-y-4">
                    {/* Profile Picture and Name Fields Row */}
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Profile Picture on the left */}
                        <div className="flex-shrink-0">
                            <AvatarManager 
                                avatarPreview={avatarPreview}
                                setAvatarPreview={setAvatarPreview}
                                onAvatarChange={handleAvatarUpdate}
                                showToast={showToast}
                            />
                        </div>
                        
                        {/* Name fields stacked vertically on the right */}
                        <div className="flex-1 space-y-4">
                            <Field 
                                label="Name" 
                                value={isEditingPersonal ? personalDraft.firstName : savedPersonal.firstName}
                                isEditing={isEditingPersonal}
                                onChange={handlePersonalChange('firstName')}
                                error={errors.firstName}
                                placeholder="Enter your first name"
                                required
                            />
                            
                            <Field 
                                label="Last name" 
                                value={isEditingPersonal ? personalDraft.lastName : savedPersonal.lastName}
                                isEditing={isEditingPersonal}
                                onChange={handlePersonalChange('lastName')}
                                error={errors.lastName}
                                placeholder="Enter your last name"
                            />
                        </div>
                    </div>
                    
                    {/* Email and Phone fields below - separate section */}
                    <div className="space-y-4">
                        {/* Email Address - Read Only */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Email Address <span className="text-destructive">*</span>
                                <span className="ml-2 text-xs text-muted-foreground">(Change in Security settings)</span>
                            </label>
                            <input
                                type="email"
                                value={savedPersonal.email}
                                className="w-full p-3 border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                                disabled
                                readOnly
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Email cannot be changed here as it's used for login. Use Security settings to change email.
                            </p>
                        </div>
                        
                        <Field 
                            label="Phone Number" 
                            value={isEditingPersonal ? personalDraft.phone : savedPersonal.phone}
                            isEditing={isEditingPersonal}
                            onChange={handlePersonalChange('phone')}
                            error={errors.phone}
                            placeholder="Enter your phone number"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                    {isEditingPersonal ? (
                        <>
                            <LoadingButton
                                variant="outline"
                                onClick={cancelPersonalEdit}
                                disabled={isLoading}
                            >
                                Cancel
                            </LoadingButton>
                            <LoadingButton
                                onClick={savePersonalInfo}
                                isLoading={isLoading}
                                loadingText="Saving..."
                            >
                                Save Changes
                            </LoadingButton>
                        </>
                    ) : (
                        <LoadingButton
                            variant="outline"
                            onClick={() => setIsEditingPersonal(true)}
                        >
                            Edit Personal Info
                        </LoadingButton>
                    )}
                </div>
            </Section>

            {/* Professional Information Section */}
            <Section title="Professional Information" icon="💼">
                <div className="space-y-4">
                    <Field 
                        label="Job Title" 
                        value={isEditingProfessional ? professionalDraft.jobTitle : savedProfessional.jobTitle}
                        isEditing={isEditingProfessional}
                        onChange={handleProfessionalChange('jobTitle')}
                        error={errors.jobTitle}
                        placeholder="e.g., Senior Software Engineer"
                    />
                    
                    <Field 
                        label="Department" 
                        value={isEditingProfessional ? professionalDraft.department : savedProfessional.department}
                        isEditing={isEditingProfessional}
                        onChange={handleProfessionalChange('department')}
                        error={errors.department}
                        placeholder="e.g., Engineering"
                    />
                    
                    <Field 
                        label="Manager" 
                        value={isEditingProfessional ? professionalDraft.manager : savedProfessional.manager}
                        isEditing={isEditingProfessional}
                        onChange={handleProfessionalChange('manager')}
                        error={errors.manager}
                        placeholder="e.g., Sarah Johnson"
                    />

                    <div>
                        <label className="block text-sm font-medium mb-2">Bio</label>
                        {isEditingProfessional ? (
                            <textarea
                                value={professionalDraft.bio}
                                onChange={handleProfessionalChange('bio')}
                                className="w-full p-3 border rounded-lg resize-none"
                                rows={4}
                                placeholder="Tell us about yourself..."
                                maxLength={1000}
                            />
                        ) : (
                            <p className="p-3 bg-muted rounded-lg min-h-[100px] text-sm">
                                {savedProfessional.bio || "No bio provided"}
                            </p>
                        )}
                        {errors.bio && (
                            <p className="text-sm text-destructive mt-1">{errors.bio}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Skills</label>
                        {isEditingProfessional ? (
                            <div className="space-y-2">
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={skillsInput}
                                        onChange={(e) => setSkillsInput(e.target.value)}
                                        onKeyPress={handleSkillKeyPress}
                                        className="flex-1 p-2 border rounded-lg"
                                        placeholder="Add a skill..."
                                    />
                                    <button
                                        type="button"
                                        onClick={addSkill}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {professionalDraft.skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground"
                                        >
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(skill)}
                                                className="ml-2 text-muted-foreground hover:text-destructive"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {savedProfessional.skills.length > 0 ? (
                                    savedProfessional.skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground"
                                        >
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No skills added</p>
                                )}
                            </div>
                        )}
                        {errors.skills && (
                            <p className="text-sm text-destructive mt-1">{errors.skills}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                    {isEditingProfessional ? (
                        <>
                            <LoadingButton
                                variant="outline"
                                onClick={cancelProfessionalEdit}
                                disabled={isLoading}
                            >
                                Cancel
                            </LoadingButton>
                            <LoadingButton
                                onClick={saveProfessionalInfo}
                                isLoading={isLoading}
                                loadingText="Saving..."
                            >
                                Save Changes
                            </LoadingButton>
                        </>
                    ) : (
                        <LoadingButton
                            variant="outline"
                            onClick={() => setIsEditingProfessional(true)}
                        >
                            Edit Professional Info
                        </LoadingButton>
                    )}
                </div>
            </Section>
        </div>
    );
};