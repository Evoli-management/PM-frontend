import React, { useState, useEffect } from 'react';
import { Field, Section, LoadingButton } from './UIComponents';
import { AvatarManager } from './AvatarManager';

export const PersonalInformation = ({ showToast }) => {
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [avatarPreview, setAvatarPreview] = useState(null);
    
    const [personalDraft, setPersonalDraft] = useState({
        name: "",
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
        name: "John Doe",
        email: "john.doe@company.com",
        phone: "+1 555-123-4567"
    });
    
    const [savedProfessional, setSavedProfessional] = useState({
        jobTitle: "Lead Developer",
        department: "Engineering",
        manager: "Sarah Johnson",
        bio: "Passionate software developer with 5+ years of experience in full-stack development.",
        skills: ["React", "Node.js", "TypeScript", "Python", "AWS"]
    });

    const [skillsInput, setSkillsInput] = useState("");

    // Initialize drafts from saved data
    useEffect(() => {
        setPersonalDraft(savedPersonal);
        setProfessionalDraft(savedProfessional);
    }, [savedPersonal, savedProfessional]);

    // Load stored avatar
    useEffect(() => {
        const storedAvatar = localStorage.getItem('pm:avatar');
        if (storedAvatar) {
            setAvatarPreview(storedAvatar);
        }
    }, []);

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
        const newErrors = {};
        
        if (!personalDraft.name.trim()) {
            newErrors.name = "Name is required";
        }
        
        if (!personalDraft.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(personalDraft.email)) {
            newErrors.email = "Email is invalid";
        }
        
        if (personalDraft.phone && !/^\+?[\d\s\-\(\)]+$/.test(personalDraft.phone)) {
            newErrors.phone = "Phone number is invalid";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const savePersonalInfo = async () => {
        if (!validatePersonalForm()) return;
        
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSavedPersonal(personalDraft);
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
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSavedProfessional(professionalDraft);
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

    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addSkill();
        }
    };

    return (
        <div className="space-y-6">
            {/* Avatar Section */}
            <div className="text-center">
                <AvatarManager
                    avatarPreview={avatarPreview}
                    setAvatarPreview={setAvatarPreview}
                    showToast={showToast}
                />
            </div>

            {/* Personal Information */}
            <Section 
                title="Personal Information" 
                description="Basic personal details and contact information"
            >
                <div className="space-y-4">
                    {isEditingPersonal ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Full Name" error={errors.name} required>
                                    <input
                                        type="text"
                                        value={personalDraft.name}
                                        onChange={handlePersonalChange('name')}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter your full name"
                                    />
                                </Field>
                                
                                <Field label="Email Address" error={errors.email} required>
                                    <input
                                        type="email"
                                        value={personalDraft.email}
                                        onChange={handlePersonalChange('email')}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter your email address"
                                    />
                                </Field>
                            </div>
                            
                            <Field label="Phone Number" error={errors.phone}>
                                <input
                                    type="tel"
                                    value={personalDraft.phone}
                                    onChange={handlePersonalChange('phone')}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.phone ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter your phone number"
                                />
                            </Field>
                            
                            <div className="flex gap-2">
                                <LoadingButton
                                    onClick={savePersonalInfo}
                                    loading={isLoading}
                                    variant="primary"
                                >
                                    Save Changes
                                </LoadingButton>
                                <button
                                    onClick={cancelPersonalEdit}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <p className="text-gray-900">{savedPersonal.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <p className="text-gray-900">{savedPersonal.email}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <p className="text-gray-900">{savedPersonal.phone || 'Not provided'}</p>
                            </div>
                            <button
                                onClick={() => setIsEditingPersonal(true)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Edit Personal Info
                            </button>
                        </>
                    )}
                </div>
            </Section>

            {/* Professional Information */}
            <Section 
                title="Professional Information" 
                description="Work-related details and professional background"
            >
                <div className="space-y-4">
                    {isEditingProfessional ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Job Title">
                                    <input
                                        type="text"
                                        value={professionalDraft.jobTitle}
                                        onChange={handleProfessionalChange('jobTitle')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Product Manager"
                                    />
                                </Field>
                                
                                <Field label="Department">
                                    <input
                                        type="text"
                                        value={professionalDraft.department}
                                        onChange={handleProfessionalChange('department')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Engineering"
                                    />
                                </Field>
                                
                                <Field label="Manager">
                                    <input
                                        type="text"
                                        value={professionalDraft.manager}
                                        onChange={handleProfessionalChange('manager')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Manager name"
                                    />
                                </Field>
                            </div>
                            
                            <Field label="Bio / About Me">
                                <textarea
                                    value={professionalDraft.bio}
                                    onChange={handleProfessionalChange('bio')}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Tell us about yourself, your experience, and what you do..."
                                />
                            </Field>
                            
                            <Field label="Skills">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        {professionalDraft.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                            >
                                                {skill}
                                                <button
                                                    onClick={() => removeSkill(skill)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={skillsInput}
                                            onChange={(e) => setSkillsInput(e.target.value)}
                                            onKeyDown={handleSkillKeyDown}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Type a skill and press Enter"
                                        />
                                        <button
                                            onClick={addSkill}
                                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </Field>
                            
                            <div className="flex gap-2">
                                <LoadingButton
                                    onClick={saveProfessionalInfo}
                                    loading={isLoading}
                                    variant="primary"
                                >
                                    Save Changes
                                </LoadingButton>
                                <button
                                    onClick={cancelProfessionalEdit}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                    <p className="text-gray-900">{savedProfessional.jobTitle || 'Not specified'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <p className="text-gray-900">{savedProfessional.department || 'Not specified'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                                    <p className="text-gray-900">{savedProfessional.manager || 'Not specified'}</p>
                                </div>
                            </div>
                            
                            {savedProfessional.bio && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                    <p className="text-gray-900">{savedProfessional.bio}</p>
                                </div>
                            )}
                            
                            {savedProfessional.skills.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                                    <div className="flex flex-wrap gap-2">
                                        {savedProfessional.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <button
                                onClick={() => setIsEditingProfessional(true)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Edit Professional Info
                            </button>
                        </>
                    )}
                </div>
            </Section>
        </div>
    );
};