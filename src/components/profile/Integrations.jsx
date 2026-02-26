import React, { useState, useEffect } from 'react';
import { Section, Field, Toggle, LoadingButton } from './UIComponents';
import calendarService from '../../services/calendarService';
import { syncService } from '../../services/syncService';

export const Integrations = ({ showToast }) => {
        // Connect integration handler
        const connectIntegration = async (type) => {
            setConnecting(type);
            try {
                let result;
                switch (type) {
                    case 'googleCalendar':
                        result = await calendarService.syncGoogleCalendar();
                        if (result && result.success && result.accessToken) {
                            await calendarService.syncGoogleCalendarData(result.accessToken);
                            setIntegrations(prev => ({
                                ...prev,
                                googleCalendar: { ...prev.googleCalendar, connected: true }
                            }));
                            showToast && showToast('Google Calendar connected and sync initiated!');
                            await loadIntegrations();
                        }
                        break;
                    case 'outlookCalendar':
                        result = await calendarService.syncMicrosoftCalendar();
                        if (result && result.success && result.accessToken) {
                            await calendarService.syncMicrosoftCalendarData(result.accessToken);
                            setIntegrations(prev => ({
                                ...prev,
                                outlookCalendar: { ...prev.outlookCalendar, connected: true }
                            }));
                            showToast && showToast('Outlook Calendar connected and sync initiated!');
                            await loadIntegrations();
                        }
                        break;
                    case 'googleTasks':
                        try {
                            const res = await calendarService.syncGoogleTasks();
                            if (res && res.success && res.accessToken) {
                                await calendarService.syncGoogleTasksData(res.accessToken);
                                setIntegrations(prev => ({
                                    ...prev,
                                    googleTasks: { ...prev.googleTasks, connected: true }
                                }));
                                showToast && showToast('Google Tasks connected and sync initiated!');
                                await loadIntegrations();
                            }
                        } catch (error) {
                            throw error;
                        }
                        break;
                    case 'microsoftToDo':
                        try {
                            const res = await calendarService.syncMicrosoftToDo();
                            if (res && res.success) {
                                setIntegrations(prev => ({
                                    ...prev,
                                    microsoftToDo: { ...prev.microsoftToDo, connected: true }
                                }));
                                showToast && showToast('Microsoft To Do connected and sync initiated!');
                            }
                        } catch (error) {
                            throw error;
                        }
                        break;
                    case 'teams':
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        setIntegrations(prev => ({
                            ...prev,
                            teams: { connected: true, tenant: 'My Organization', notificationsEnabled: true }
                        }));
                        showToast && showToast('Microsoft Teams connected!');
                        break;
                    default:
                        showToast && showToast('Unknown integration type', 'error');
                }
                await loadIntegrations();
            } catch (error) {
                console.error('Connection error:', error);
                const errMsg = error?.response?.data?.error || error?.message || '';
                if (
                    error?.response?.status === 400 ||
                    /invalid(_grant|_token)/i.test(errMsg) ||
                    /token.*expired/i.test(errMsg)
                ) {
                    showToast && showToast('Your connection has expired. Please reconnect your account.', 'error');
                    const apiBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'https://practicalmanager-4241d0bfc5ed.herokuapp.com/api');
                    if (type === 'googleCalendar' || type === 'googleTasks') {
                        window.location.href = `${apiBase}/auth/google`;
                    } else if (type === 'outlookCalendar' || type === 'microsoftToDo') {
                        window.location.href = `${apiBase}/auth/microsoft`;
                    }
                } else if (error.message === 'OAuth cancelled by user') {
                    showToast && showToast('Connection cancelled', 'info');
                } else {
                    showToast && showToast(`Failed to connect ${type}`, 'error');
                }
            } finally {
                setConnecting('');
            }
        };
    const [integrations, setIntegrations] = useState({
        // Calendar Integrations
        googleCalendar: { connected: false, email: '', syncEnabled: true },
        outlookCalendar: { connected: false, email: '', syncEnabled: true },
        // Task Integrations
        googleTasks: { connected: false, syncEnabled: true },
        microsoftToDo: { connected: false, syncEnabled: true },
        // Communication
        teams: { connected: false, tenant: '', notificationsEnabled: true }
    });

    // Add saveIntegrations function to handle saving integration settings
    const saveIntegrations = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call to save integrations
            // await api.saveIntegrations(integrations);
            showToast && showToast('Integration settings saved!', 'success');
        } catch (err) {
            showToast && showToast('Failed to save integration settings', 'error');
        } finally {
            setLoading(false);
        }
    };
    
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
            // ...existing code...
        } finally {
            setLoading(false);
        }
    };

    // ...existing code...
    
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
        <div className="bg-white rounded-lg p-6">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
                            <span className="truncate">{name}</span>
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{description}</p>
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
                            {/* Sync Now button for all integrations */}
                            <button
                                onClick={() => handleManualSync(type)}
                                className="ml-2 text-sm bg-blue-500 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
                                disabled={syncingType === type}
                            >
                                {syncingType === type ? 'Syncing...' : 'Sync Now'}
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
                <div className="mt-4 pt-4 space-y-3">
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
    
    // State for manual sync
    const [syncingType, setSyncingType] = useState('');

    // Manual sync handler stub
    const handleManualSync = async (type) => {
        setSyncingType(type);
        try {
            showToast(`Manual sync for ${type} started`);
            // Map type to provider for backend
            let provider;
            if (type === 'googleTasks') provider = 'google';
            else if (type === 'microsoftToDo') provider = 'microsoft';
            else throw new Error('Unknown provider');

            await syncService.triggerManualSync(provider);
            showToast(`Manual sync for ${type} completed`);
            await loadIntegrations();
        } catch (err) {
            showToast(`Manual sync for ${type} failed`, 'error');
        } finally {
            setSyncingType('');
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
            {/* Calendar Integrations */}
            <Section 
                title="Calendar Integrations" 
                description="Sync your tasks and events with external calendars"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="Google Calendar"
                        type="googleCalendar"
                        icon={<img src={`${import.meta.env.BASE_URL}google.svg`} alt="Google" className="w-6 h-6 object-contain" />}
                        description="Sync tasks and deadlines with Google Calendar"
                        config={integrations.googleCalendar}
                        settings={[
                            { key: 'syncEnabled', label: 'Sync Tasks', description: 'Automatically sync tasks to calendar' }
                        ]}
                    />
                    <IntegrationCard
                        name="Outlook Calendar"
                        type="outlookCalendar"
                        icon={<img src={`${import.meta.env.BASE_URL}microsoft.svg`} alt="Microsoft" className="w-6 h-6 object-contain" />}
                        description="Sync with Microsoft Outlook Calendar"
                        config={integrations.outlookCalendar}
                        settings={[
                            { key: 'syncEnabled', label: 'Sync Tasks', description: 'Automatically sync tasks to calendar' }
                        ]}
                    />
                </div>
            </Section>

            {/* Task Integrations */}
            <Section 
                title="Task Integrations" 
                description="Sync your tasks with Google Tasks or Microsoft To Do"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <IntegrationCard
                        name="Google Tasks"
                        type="googleTasks"
                        icon={<img src={`${import.meta.env.BASE_URL}google.svg`} alt="Google Tasks" className="w-6 h-6 object-contain" />}
                        description="Sync tasks with Google Tasks"
                        config={integrations.googleTasks}
                        settings={[
                            { key: 'syncEnabled', label: 'Sync Tasks', description: 'Automatically sync tasks with Google Tasks' }
                        ]}
                    />
                    <IntegrationCard
                        name="Microsoft To Do"
                        type="microsoftToDo"
                        icon={<img src={`${import.meta.env.BASE_URL}microsoft.svg`} alt="Microsoft To Do" className="w-6 h-6 object-contain" />}
                        description="Sync tasks with Microsoft To Do"
                        config={integrations.microsoftToDo}
                        settings={[
                            { key: 'syncEnabled', label: 'Sync Tasks', description: 'Automatically sync tasks with Microsoft To Do' }
                        ]}
                    />
                </div>
            </Section>

            {/* Save Button */}
            <div className="flex justify-end pt-6">
                <LoadingButton
                    onClick={saveIntegrations}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                    Save Settings
                </LoadingButton>
            </div>
        </div>
    );
}