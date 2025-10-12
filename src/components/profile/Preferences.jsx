import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';
import TimePicker from '../ui/TimePicker';
import userPreferencesService from '../../services/userPreferencesService';
import { timeToMinutes } from '../../utils/timeUtils';
import { useCalendarPreferences } from '../../hooks/useCalendarPreferences';

// Simple Toggle component for nested preferences
const SimpleToggle = ({ checked, onChange, disabled = false }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            disabled ? "bg-gray-200 cursor-not-allowed" : checked ? "bg-blue-600" : "bg-gray-300"
        }`}
    >
        <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
                checked ? "translate-x-5" : "translate-x-1"
            }`}
        />
    </button>
);

export const Preferences = ({ showToast }) => {
    // Use calendar preferences hook to get current time format
    const { 
        preferences: calendarPrefs, 
        use24Hour, 
        loading: calendarLoading,
        refreshPreferences 
    } = useCalendarPreferences();

    const [preferences, setPreferences] = useState({
        // Work Hours (mapped to backend fields)
        workStartTime: '09:00',
        workEndTime: '17:00',
        
        // Goal Reminders (mapped to backend fields)
        goalRemindersEmail: true,
        goalRemindersDesktop: true,
        goalReminderTiming: '1hour',
        
        // PracticalManager Reminders (mapped to backend fields)
        pmRemindersEmail: true,
        pmRemindersDesktop: true,
        pmReminderTiming: '30min',
        
        // Legacy preferences (keep for backward compatibility)
        emailNotifications: true,
        browserNotifications: true,
        mobileNotifications: true,
        taskReminders: true,
        projectUpdates: true,
        deadlineAlerts: true,
        theme: 'light',
        compactMode: false,
        showCompletedTasks: false,
        animationsEnabled: true,
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h'
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        loadPreferences();
    }, []);
    
    const loadPreferences = async () => {
        setLoading(true);
        try {
            // Load from API first
            const apiPreferences = await userPreferencesService.getPreferences();
            
            // Load legacy preferences from localStorage for backward compatibility
            const localPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
            
            // Merge API preferences with local ones, prioritizing API
            setPreferences(prev => ({
                ...prev,
                ...localPreferences,
                ...apiPreferences,
                // Map API fields to component fields
                workStartTime: apiPreferences.workStartTime || prev.workStartTime,
                workEndTime: apiPreferences.workEndTime || prev.workEndTime,
            }));
        } catch (error) {
            console.error('Error loading preferences:', error);
            // Fallback to localStorage if API fails
            try {
                const saved = localStorage.getItem('userPreferences');
                if (saved) {
                    setPreferences(prev => ({ ...prev, ...JSON.parse(saved) }));
                }
            } catch (localError) {
                showToast('Failed to load preferences', 'error');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const savePreferences = async () => {
        setSaving(true);
        try {
            console.log('Current preferences state:', preferences);
            
            // Validate preferences
            const validation = userPreferencesService.validatePreferences(preferences);
            if (!validation.isValid) {
                const firstError = Object.values(validation.errors)[0];
                showToast(firstError, 'error');
                return;
            }

            // Extra client-side validation for working hours ordering
            if (preferences.workStartTime && preferences.workEndTime) {
                const startMin = timeToMinutes(preferences.workStartTime);
                const endMin = timeToMinutes(preferences.workEndTime);
                if (!(startMin < endMin)) {
                    showToast('Work start time must be before end time', 'error');
                    return;
                }
            }

            // Validate time format before sending to API
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (preferences.workStartTime && !timeRegex.test(preferences.workStartTime)) {
                showToast('Work start time must be in HH:MM format', 'error');
                return;
            }
            if (preferences.workEndTime && !timeRegex.test(preferences.workEndTime)) {
                showToast('Work end time must be in HH:MM format', 'error');
                return;
            }

            // Prepare API data - only send backend-supported fields
            const apiData = {};
            
            // Only include time fields if they're properly formatted
            if (preferences.workStartTime && timeRegex.test(preferences.workStartTime)) {
                apiData.workStartTime = preferences.workStartTime;
            }
            if (preferences.workEndTime && timeRegex.test(preferences.workEndTime)) {
                apiData.workEndTime = preferences.workEndTime;
            }
            
            // Add other supported fields
            if (preferences.timeFormat) apiData.timeFormat = preferences.timeFormat;
            if (preferences.dateFormat) apiData.dateFormat = preferences.dateFormat;
            if (preferences.goalRemindersEmail !== undefined) apiData.goalRemindersEmail = preferences.goalRemindersEmail;
            if (preferences.goalRemindersDesktop !== undefined) apiData.goalRemindersDesktop = preferences.goalRemindersDesktop;
            if (preferences.goalReminderTiming) apiData.goalReminderTiming = preferences.goalReminderTiming;
            if (preferences.pmRemindersEmail !== undefined) apiData.pmRemindersEmail = preferences.pmRemindersEmail;
            if (preferences.pmRemindersDesktop !== undefined) apiData.pmRemindersDesktop = preferences.pmRemindersDesktop;
            if (preferences.pmReminderTiming) apiData.pmReminderTiming = preferences.pmReminderTiming;

            // Debug: Log the data being sent to help diagnose format issues
            console.log('Saving preferences - API data:', JSON.stringify(apiData, null, 2));

            // Save to API
            await userPreferencesService.updatePreferences(apiData);
            
            // Also save all preferences to localStorage for legacy support
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            
            // Refresh calendar preferences to pick up the changes immediately
            if (refreshPreferences) {
                await refreshPreferences();
            }
            
            // Trigger custom events to notify calendar components of changes
            if (apiData.workStartTime || apiData.workEndTime) {
                window.dispatchEvent(new CustomEvent('workingHoursChanged', {
                    detail: {
                        startTime: apiData.workStartTime || preferences.workStartTime,
                        endTime: apiData.workEndTime || preferences.workEndTime
                    }
                }));
            }
            
            if (apiData.timeFormat) {
                window.dispatchEvent(new CustomEvent('timeFormatChanged', {
                    detail: {
                        timeFormat: apiData.timeFormat
                    }
                }));
            }
            
            if (apiData.dateFormat) {
                window.dispatchEvent(new CustomEvent('dateFormatChanged', {
                    detail: {
                        dateFormat: apiData.dateFormat
                    }
                }));
            }
            
            showToast('Preferences saved successfully');
        } catch (error) {
            console.error('Error saving preferences:', error);
            const apiMsg = error?.response?.data?.message;
            const msg = Array.isArray(apiMsg) ? apiMsg.join(', ') : (apiMsg || 'Failed to save preferences');
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };
    
    const updatePreference = (key, value) => {
        console.log(`Updating preference ${key} to:`, value, typeof value);
        setPreferences(prev => ({ ...prev, [key]: value }));
    };
    
    const resetToDefaults = async () => {
        setSaving(true);
        try {
            // Reset via API
            const defaultPreferences = await userPreferencesService.resetPreferences();
            
            // Update state with API defaults plus local defaults for other fields
            setPreferences(prev => ({
                // Keep local defaults for non-API fields
                emailNotifications: true,
                browserNotifications: true,
                mobileNotifications: true,
                taskReminders: true,
                projectUpdates: true,
                deadlineAlerts: true,
                theme: 'light',
                compactMode: false,
                showCompletedTasks: false,
                animationsEnabled: true,
                language: 'en',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                dateFormat: 'MM/dd/yyyy',
                timeFormat: '12h',
                // Apply API defaults
                ...defaultPreferences,
            }));
            
            showToast('Preferences reset to defaults');
        } catch (error) {
            console.error('Error resetting preferences:', error);
            showToast('Failed to reset preferences', 'error');
        } finally {
            setSaving(false);
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
            {/* Language & Region - MOVED TO FIRST */}
            <Section 
                title="Language & Region" 
                description="Set your language, timezone, and format preferences"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Language">
                        <select
                            value={preferences.language}
                            onChange={(e) => updatePreference('language', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                            <option value="it">Italiano</option>
                            <option value="pt">Português</option>
                        </select>
                    </Field>
                    
                    <Field label="Timezone">
                        <select
                            value={preferences.timezone}
                            onChange={(e) => updatePreference('timezone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                            <option value="Europe/London">GMT</option>
                            <option value="Europe/Paris">CET</option>
                            <option value="Asia/Tokyo">JST</option>
                        </select>
                    </Field>
                    
                    <Field label="Date Format">
                        <select
                            value={preferences.dateFormat}
                            onChange={(e) => updatePreference('dateFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                            <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                            <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                            <option value="MMM dd, yyyy">MMM DD, YYYY</option>
                        </select>
                    </Field>
                    
                    <Field label="Time Format">
                        <select
                            value={preferences.timeFormat}
                            onChange={(e) => updatePreference('timeFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="12h">12 Hour</option>
                            <option value="24h">24 Hour</option>
                        </select>
                    </Field>
                </div>
            </Section>

            {/* Work Hours Preferences - MOVED TO SECOND */}
            <Section 
                title="Work Hours Preferences" 
                description="Set your preferred working hours. These hours will be used to customize calendar views to show only your working time."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Start Time">
                        <TimePicker
                            value={preferences.workStartTime}
                            onChange={(value) => updatePreference('workStartTime', value)}
                            use24Hour={use24Hour}
                            className="w-full"
                            label="Work Start Time"
                        />
                    </Field>
                    <Field label="End Time">
                        <TimePicker
                            value={preferences.workEndTime}
                            onChange={(value) => updatePreference('workEndTime', value)}
                            use24Hour={use24Hour}
                            className="w-full"
                            label="Work End Time"
                        />
                    </Field>
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-800">Calendar Integration</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Your working hours will automatically adjust the time range shown in daily and weekly calendar views. 
                                Instead of showing all 24 hours, the calendar will focus on your working period for a cleaner, more relevant view.
                            </p>
                        </div>
                    </div>
                </div>
            </Section>
            
            {/* PracticalManager Reminders - THIRD */}
            <Section 
                title="PracticalManager Reminders" 
                description="Manage system-wide reminder notifications"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800">PracticalManager Notifications</h4>
                            <p className="text-sm text-gray-600 mt-1">System reminders and notifications</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Email</span>
                                <SimpleToggle
                                    checked={preferences.pmRemindersEmail}
                                    onChange={(checked) => updatePreference('pmRemindersEmail', checked)}
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Desktop</span>
                                <SimpleToggle
                                    checked={preferences.pmRemindersDesktop}
                                    onChange={(checked) => updatePreference('pmRemindersDesktop', checked)}
                                />
                            </div>
                        </div>
                    </div>
                    <Field label="Reminder Timing">
                        <select
                            value={preferences.pmReminderTiming}
                            onChange={(e) => updatePreference('pmReminderTiming', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="5min">5 minutes before</option>
                            <option value="15min">15 minutes before</option>
                            <option value="30min">30 minutes before</option>
                            <option value="1hour">1 hour before</option>
                            <option value="2hours">2 hours before</option>
                            <option value="1day">1 day before</option>
                        </select>
                    </Field>
                </div>
            </Section>
            
            {/* Goal Reminders - FOURTH */}
            <Section 
                title="Goal Reminders" 
                description="Configure goal-related reminder notifications"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800">Goal Reminder Notifications</h4>
                            <p className="text-sm text-gray-600 mt-1">Reminders for goals and deadlines</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Email</span>
                                <SimpleToggle
                                    checked={preferences.goalRemindersEmail}
                                    onChange={(checked) => updatePreference('goalRemindersEmail', checked)}
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block mb-1">Desktop</span>
                                <SimpleToggle
                                    checked={preferences.goalRemindersDesktop}
                                    onChange={(checked) => updatePreference('goalRemindersDesktop', checked)}
                                />
                            </div>
                        </div>
                    </div>
                    <Field label="Reminder Timing">
                        <select
                            value={preferences.goalReminderTiming}
                            onChange={(e) => updatePreference('goalReminderTiming', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="5min">5 minutes before</option>
                            <option value="15min">15 minutes before</option>
                            <option value="30min">30 minutes before</option>
                            <option value="1hour">1 hour before</option>
                            <option value="2hours">2 hours before</option>
                            <option value="1day">1 day before</option>
                        </select>
                    </Field>
                </div>
            </Section>

            {/* General Notifications - FIFTH */}
            <Section 
                title="General Notifications" 
                description="Manage basic notification preferences"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle
                        label="Email Notifications"
                        description="Receive updates via email"
                        checked={preferences.emailNotifications}
                        onChange={(checked) => updatePreference('emailNotifications', checked)}
                    />
                    <Toggle
                        label="Browser Notifications"
                        description="Show desktop notifications"
                        checked={preferences.browserNotifications}
                        onChange={(checked) => updatePreference('browserNotifications', checked)}
                    />
                    <Toggle
                        label="Mobile Notifications"
                        description="Push notifications on mobile"
                        checked={preferences.mobileNotifications}
                        onChange={(checked) => updatePreference('mobileNotifications', checked)}
                    />
                    <Toggle
                        label="Task Reminders"
                        description="Alerts for upcoming tasks"
                        checked={preferences.taskReminders}
                        onChange={(checked) => updatePreference('taskReminders', checked)}
                    />
                    <Toggle
                        label="Project Updates"
                        description="Notifications about project changes"
                        checked={preferences.projectUpdates}
                        onChange={(checked) => updatePreference('projectUpdates', checked)}
                    />
                    <Toggle
                        label="Deadline Alerts"
                        description="Warnings for approaching deadlines"
                        checked={preferences.deadlineAlerts}
                        onChange={(checked) => updatePreference('deadlineAlerts', checked)}
                    />
                </div>
            </Section>
            
            {/* Theme & Display - SIXTH */}
            <Section 
                title="Theme & Display" 
                description="Customize the appearance of your workspace"
            >
                <div className="space-y-4">
                    <Field label="Theme">
                        <select
                            value={preferences.theme}
                            onChange={(e) => updatePreference('theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto (System)</option>
                        </select>
                    </Field>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle
                            label="Compact Mode"
                            description="Reduce spacing for more content"
                            checked={preferences.compactMode}
                            onChange={(checked) => updatePreference('compactMode', checked)}
                        />
                        <Toggle
                            label="Show Completed Tasks"
                            description="Display completed items in lists"
                            checked={preferences.showCompletedTasks}
                            onChange={(checked) => updatePreference('showCompletedTasks', checked)}
                        />
                        <Toggle
                            label="Animations"
                            description="Enable smooth transitions"
                            checked={preferences.animationsEnabled}
                            onChange={(checked) => updatePreference('animationsEnabled', checked)}
                        />
                    </div>
                </div>
            </Section>
            
            {/* Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                    onClick={resetToDefaults}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                >
                    Reset to Defaults
                </button>
                
                <LoadingButton
                    onClick={savePreferences}
                    loading={saving}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                    Save Preferences
                </LoadingButton>
            </div>
        </div>
    );
};