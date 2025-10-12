import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';

export const Integrations = ({ showToast }) => {
    const [integrations, setIntegrations] = useState({
        // Calendar Integrations
        googleCalendar: { connected: false, email: '', syncEnabled: true },
        outlookCalendar: { connected: false, email: '', syncEnabled: true },
        appleCalendar: { connected: false, syncEnabled: true },
        
        // Communication
        slack: { connected: false, workspace: '', notificationsEnabled: true },
        teams: { connected: false, tenant: '', notificationsEnabled: true },
        discord: { connected: false, server: '', notificationsEnabled: false },
        
        // Project Management
        trello: { connected: false, boards: [], syncTasks: true },
        asana: { connected: false, projects: [], syncTasks: true },
        jira: { connected: false, projects: [], syncIssues: true },
        
        // File Storage
        googleDrive: { connected: false, email: '', autoSync: false },
        dropbox: { connected: false, email: '', autoSync: false },
        oneDrive: { connected: false, email: '', autoSync: false },
        
        // Development
        github: { connected: false, username: '', syncRepos: false },
        gitlab: { connected: false, username: '', syncRepos: false }
    });
    
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState('');
    
    useEffect(() => {
        loadIntegrations();
    }, []);
    
    const loadIntegrations = async () => {
        setLoading(true);
        try {
            // Load from localStorage for now - replace with API call
            const saved = localStorage.getItem('userIntegrations');
            if (saved) {
                setIntegrations(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
        } catch (error) {
            showToast('Failed to load integrations', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const saveIntegrations = async () => {
        try {
            // Save to localStorage for now - replace with API call
            localStorage.setItem('userIntegrations', JSON.stringify(integrations));
            showToast('Integration settings saved');
        } catch (error) {
            showToast('Failed to save integration settings', 'error');
        }
    };
    
    const connectIntegration = async (type) => {
        setConnecting(type);
        try {
            // Simulate OAuth flow - replace with actual OAuth implementation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const updates = { ...integrations };
            switch (type) {
                case 'googleCalendar':
                    updates.googleCalendar = { 
                        connected: true, 
                        email: 'user@gmail.com', 
                        syncEnabled: true 
                    };
                    break;
                case 'slack':
                    updates.slack = { 
                        connected: true, 
                        workspace: 'My Workspace', 
                        notificationsEnabled: true 
                    };
                    break;
                case 'github':
                    updates.github = { 
                        connected: true, 
                        username: 'myusername', 
                        syncRepos: true 
                    };
                    break;
                default:
                    updates[type] = { ...updates[type], connected: true };
            }
            
            setIntegrations(updates);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} connected successfully`);
        } catch (error) {
            showToast(`Failed to connect ${type}`, 'error');
        } finally {
            setConnecting('');
        }
    };
    
    const disconnectIntegration = (type) => {
        const updates = { ...integrations };
        updates[type] = { ...updates[type], connected: false };
        setIntegrations(updates);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} disconnected`);
    };
    
    const updateIntegrationSetting = (type, setting, value) => {
        const updates = { ...integrations };
        updates[type] = { ...updates[type], [setting]: value };
        setIntegrations(updates);
    };
    
    const IntegrationCard = ({ 
        name, 
        type, 
        icon, 
        description, 
        config, 
        settings 
    }) => (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className="text-2xl">{icon}</div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{name}</h3>
                        <p className="text-sm text-gray-600">{description}</p>
                        {config.connected && config.email && (
                            <p className="text-xs text-blue-600 mt-1">{config.email}</p>
                        )}
                        {config.connected && config.workspace && (
                            <p className="text-xs text-blue-600 mt-1">{config.workspace}</p>
                        )}
                        {config.connected && config.username && (
                            <p className="text-xs text-blue-600 mt-1">@{config.username}</p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    {config.connected ? (
                        <>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Connected
                            </span>
                            <button
                                onClick={() => disconnectIntegration(type)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                                Disconnect
                            </button>
                        </>
                    ) : (
                        <LoadingButton
                            onClick={() => connectIntegration(type)}
                            loading={connecting === type}
                            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                        >
                            Connect
                        </LoadingButton>
                    )}
                </div>
            </div>
            
            {config.connected && settings && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {settings.map((setting, index) => (
                        <Toggle
                            key={index}
                            label={setting.label}
                            description={setting.description}
                            checked={config[setting.key]}
                            onChange={(checked) => updateIntegrationSetting(type, setting.key, checked)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
    
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Calendar Integrations */}
            <Section 
                title="Calendar Integrations" 
                description="Sync your tasks and events with external calendars"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="Google Calendar"
                        type="googleCalendar"
                        icon="📅"
                        description="Sync tasks and deadlines with Google Calendar"
                        config={integrations.googleCalendar}
                        settings={[
                            { key: 'syncEnabled', label: 'Sync Tasks', description: 'Automatically sync tasks to calendar' }
                        ]}
                    />
                    <IntegrationCard
                        name="Outlook Calendar"
                        type="outlookCalendar"
                        icon="📆"
                        description="Sync with Microsoft Outlook Calendar"
                        config={integrations.outlookCalendar}
                        settings={[
                            { key: 'syncEnabled', label: 'Sync Tasks', description: 'Automatically sync tasks to calendar' }
                        ]}
                    />
                </div>
            </Section>
            
            {/* Communication */}
            <Section 
                title="Communication Tools" 
                description="Connect with your team communication platforms"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="Slack"
                        type="slack"
                        icon="💬"
                        description="Get notifications and updates in Slack"
                        config={integrations.slack}
                        settings={[
                            { key: 'notificationsEnabled', label: 'Notifications', description: 'Receive task updates in Slack' }
                        ]}
                    />
                    <IntegrationCard
                        name="Microsoft Teams"
                        type="teams"
                        icon="👥"
                        description="Collaborate through Microsoft Teams"
                        config={integrations.teams}
                        settings={[
                            { key: 'notificationsEnabled', label: 'Notifications', description: 'Receive updates in Teams' }
                        ]}
                    />
                </div>
            </Section>
            
            {/* Project Management */}
            <Section 
                title="Project Management" 
                description="Sync with other project management tools"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="Trello"
                        type="trello"
                        icon="📋"
                        description="Sync tasks with Trello boards"
                        config={integrations.trello}
                        settings={[
                            { key: 'syncTasks', label: 'Sync Tasks', description: 'Two-way sync with Trello cards' }
                        ]}
                    />
                    <IntegrationCard
                        name="Asana"
                        type="asana"
                        icon="✅"
                        description="Connect with Asana projects"
                        config={integrations.asana}
                        settings={[
                            { key: 'syncTasks', label: 'Sync Tasks', description: 'Sync tasks with Asana' }
                        ]}
                    />
                </div>
            </Section>
            
            {/* File Storage */}
            <Section 
                title="File Storage" 
                description="Connect cloud storage for file attachments"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="Google Drive"
                        type="googleDrive"
                        icon="🗂️"
                        description="Attach files from Google Drive"
                        config={integrations.googleDrive}
                        settings={[
                            { key: 'autoSync', label: 'Auto Sync', description: 'Automatically sync project files' }
                        ]}
                    />
                    <IntegrationCard
                        name="Dropbox"
                        type="dropbox"
                        icon="📦"
                        description="Access Dropbox files in projects"
                        config={integrations.dropbox}
                        settings={[
                            { key: 'autoSync', label: 'Auto Sync', description: 'Automatically sync project files' }
                        ]}
                    />
                </div>
            </Section>
            
            {/* Development Tools */}
            <Section 
                title="Development Tools" 
                description="Connect with development platforms"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="GitHub"
                        type="github"
                        icon="🐙"
                        description="Sync with GitHub repositories"
                        config={integrations.github}
                        settings={[
                            { key: 'syncRepos', label: 'Sync Repositories', description: 'Track repository activity' }
                        ]}
                    />
                    <IntegrationCard
                        name="GitLab"
                        type="gitlab"
                        icon="🦊"
                        description="Connect with GitLab projects"
                        config={integrations.gitlab}
                        settings={[
                            { key: 'syncRepos', label: 'Sync Repositories', description: 'Track repository activity' }
                        ]}
                    />
                </div>
            </Section>
            
            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
                <LoadingButton
                    onClick={saveIntegrations}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                    Save Settings
                </LoadingButton>
            </div>
        </div>
    );
};