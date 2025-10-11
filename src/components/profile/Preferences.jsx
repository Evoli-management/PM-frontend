import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';

export const Preferences = ({ showToast }) => {
    const [preferences, setPreferences] = useState({
        // Notification Preferences
        emailNotifications: true,
        browserNotifications: true,
        mobileNotifications: true,
        taskReminders: true,
        projectUpdates: true,
        deadlineAlerts: true,
        
        // Theme & Display
        theme: 'light',
        compactMode: false,
        showCompletedTasks: false,
        animationsEnabled: true,
        
        // Language & Region
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        
        // Productivity
        autoSave: true,
        quickCapture: true,
        showKeyboardShortcuts: true,
        
        // Privacy
        trackAnalytics: true,
        shareUsageData: false,
        allowCookies: true
    });
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        loadPreferences();
    }, []);
    
    const loadPreferences = async () => {
        setLoading(true);
        try {
            // Load from localStorage for now - replace with API call
            const saved = localStorage.getItem('userPreferences');
            if (saved) {
                setPreferences(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
        } catch (error) {
            showToast('Failed to load preferences', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const savePreferences = async () => {
        setSaving(true);
        try {
            // Save to localStorage for now - replace with API call
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            showToast('Preferences saved successfully');
        } catch (error) {
            showToast('Failed to save preferences', 'error');
        } finally {
            setSaving(false);
        }
    };
    
    const updatePreference = (key, value) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };
    
    const resetToDefaults = () => {
        setPreferences({
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
            autoSave: true,
            quickCapture: true,
            showKeyboardShortcuts: true,
            trackAnalytics: true,
            shareUsageData: false,
            allowCookies: true
        });
        showToast('Preferences reset to defaults');
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
            {/* Notifications */}
            <Section 
                title="Notifications" 
                description="Manage how you receive updates and alerts"
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
            
            {/* Theme & Display */}
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
            
            {/* Language & Region */}
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
            
            {/* Productivity */}
            <Section 
                title="Productivity" 
                description="Features to help you work more efficiently"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle
                        label="Auto Save"
                        description="Automatically save changes"
                        checked={preferences.autoSave}
                        onChange={(checked) => updatePreference('autoSave', checked)}
                    />
                    <Toggle
                        label="Quick Capture"
                        description="Enable quick task creation"
                        checked={preferences.quickCapture}
                        onChange={(checked) => updatePreference('quickCapture', checked)}
                    />
                    <Toggle
                        label="Keyboard Shortcuts"
                        description="Show keyboard shortcut hints"
                        checked={preferences.showKeyboardShortcuts}
                        onChange={(checked) => updatePreference('showKeyboardShortcuts', checked)}
                    />
                </div>
            </Section>
            
            {/* Privacy */}
            <Section 
                title="Privacy" 
                description="Control data collection and usage"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle
                        label="Analytics Tracking"
                        description="Help improve the app with usage data"
                        checked={preferences.trackAnalytics}
                        onChange={(checked) => updatePreference('trackAnalytics', checked)}
                    />
                    <Toggle
                        label="Share Usage Data"
                        description="Share anonymized usage statistics"
                        checked={preferences.shareUsageData}
                        onChange={(checked) => updatePreference('shareUsageData', checked)}
                    />
                    <Toggle
                        label="Allow Cookies"
                        description="Enable cookies for better experience"
                        checked={preferences.allowCookies}
                        onChange={(checked) => updatePreference('allowCookies', checked)}
                    />
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