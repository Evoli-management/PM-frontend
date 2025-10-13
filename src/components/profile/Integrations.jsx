import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';
import calendarService from '../../services/calendarService';

export const Integrations = ({ showToast }) => {
    const [integrations, setIntegrations] = useState({
        // Calendar Integrations
        googleCalendar: { connected: false, email: '', syncEnabled: true },
        outlookCalendar: { connected: false, email: '', syncEnabled: true },
        
        // Communication
        teams: { connected: false, tenant: '', notificationsEnabled: true }
    });
    
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState('');
    
    useEffect(() => {
        loadIntegrations();
    }, []);
    
    const loadIntegrations = async () => {
        setLoading(true);
        try {
            // Get sync status from API
            const syncStatus = await calendarService.getSyncStatus();
            
            const updates = { ...integrations };
            if (syncStatus.google) {
                updates.googleCalendar = {
                    connected: syncStatus.google.connected,
                    email: syncStatus.google.email || '',
                    syncEnabled: true
                };
            }
            if (syncStatus.microsoft) {
                updates.outlookCalendar = {
                    connected: syncStatus.microsoft.connected,
                    email: syncStatus.microsoft.email || '',
                    syncEnabled: true
                };
            }
            
            setIntegrations(updates);
        } catch (error) {
            console.log('Failed to load sync status:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('userIntegrations');
            if (saved) {
                setIntegrations(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
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
            let result;
            switch (type) {
                case 'googleCalendar':
                    result = await calendarService.syncGoogleCalendar();
                    if (result.authUrl) {
                        // Redirect to OAuth URL
                        window.location.href = result.authUrl;
                        return;
                    }
                    break;
                case 'outlookCalendar':
                    result = await calendarService.syncMicrosoftCalendar();
                    if (result.authUrl) {
                        // Redirect to OAuth URL
                        window.location.href = result.authUrl;
                        return;
                    }
                    break;
                case 'teams':
                    // For now, just simulate connection
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const updates = { ...integrations };
                    updates.teams = { 
                        connected: true, 
                        tenant: 'My Organization', 
                        notificationsEnabled: true 
                    };
                    setIntegrations(updates);
                    break;
            }
            
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} connection initiated`);
            
            // Reload integrations to get updated status
            await loadIntegrations();
            
        } catch (error) {
            console.error('Connection error:', error);
            showToast(`Failed to connect ${type}`, 'error');
        } finally {
            setConnecting('');
        }
    };
    
    const disconnectIntegration = async (type) => {
        try {
            switch (type) {
                case 'googleCalendar':
                    await calendarService.disconnectCalendar('google');
                    break;
                case 'outlookCalendar':
                    await calendarService.disconnectCalendar('microsoft');
                    break;
                case 'teams':
                    // For now, just update local state
                    break;
            }
            
            const updates = { ...integrations };
            updates[type] = { ...updates[type], connected: false };
            setIntegrations(updates);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} disconnected`);
            
            // Reload to get updated status
            await loadIntegrations();
            
        } catch (error) {
            console.error('Disconnect error:', error);
            showToast(`Failed to disconnect ${type}`, 'error');
        }
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
            
            {/* Communication Tools */}
            <Section 
                title="Communication Tools" 
                description="Connect with your team communication platforms"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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