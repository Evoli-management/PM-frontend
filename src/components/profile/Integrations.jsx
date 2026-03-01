import React, { useState, useEffect } from 'react';
import { Section, LoadingButton } from './UIComponents';
import calendarService from '../../services/calendarService';

export const Integrations = ({ showToast }) => {
    const [integrations, setIntegrations] = useState({
        googleCalendar: { connected: false, email: '' },
        outlookCalendar: { connected: false, email: '' },
        googleTasks: { connected: false },
        microsoftToDo: { connected: false },
    });

    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState('');
    const [syncingType, setSyncingType] = useState('');

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        setLoading(true);
        try {
            const syncStatus = await calendarService.getSyncStatus();
            const updates = {
                googleCalendar: { connected: false, email: '' },
                outlookCalendar: { connected: false, email: '' },
                googleTasks: { connected: false },
                microsoftToDo: { connected: false },
            };
            if (syncStatus.google) {
                updates.googleCalendar = { connected: syncStatus.google.connected, email: syncStatus.google.email || '' };
                updates.googleTasks = { connected: syncStatus.google.connected };
            }
            if (syncStatus.microsoft) {
                updates.outlookCalendar = { connected: syncStatus.microsoft.connected, email: syncStatus.microsoft.email || '' };
                updates.microsoftToDo = { connected: syncStatus.microsoft.connected };
            }
            setIntegrations(updates);
        } catch (err) {
            console.error('Failed to load integration status:', err);
        } finally {
            setLoading(false);
        }
    };

    const connectIntegration = async (type) => {
        setConnecting(type);
        try {
            let result;
            switch (type) {
                case 'googleCalendar':
                    result = await calendarService.syncGoogleCalendar();
                    if (result?.success) {
                        showToast && showToast('Google Calendar connected! Syncing events...');
                        await loadIntegrations();
                        calendarService.triggerSync().catch(e => console.warn('Initial sync failed:', e));
                    }
                    break;
                case 'outlookCalendar':
                    result = await calendarService.syncMicrosoftCalendar();
                    if (result?.success) {
                        showToast && showToast('Outlook Calendar connected! Syncing events...');
                        await loadIntegrations();
                        calendarService.triggerSync().catch(e => console.warn('Initial sync failed:', e));
                    }
                    break;
                case 'googleTasks':
                    result = await calendarService.syncGoogleTasks();
                    if (result?.success) {
                        showToast && showToast('Google Tasks connected and sync initiated!');
                        await loadIntegrations();
                        calendarService.triggerSync().catch(e => console.warn('Initial sync failed:', e));
                    }
                    break;
                case 'microsoftToDo':
                    result = await calendarService.syncMicrosoftToDo();
                    if (result?.success) {
                        showToast && showToast('Microsoft To Do connected and sync initiated!');
                        await loadIntegrations();
                        calendarService.triggerSync().catch(e => console.warn('Initial sync failed:', e));
                    }
                    break;
                default:
                    showToast && showToast('Unknown integration type', 'error');
            }
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

    const disconnectIntegration = async (type) => {
        try {
            if (type === 'googleCalendar' || type === 'googleTasks') {
                await calendarService.disconnectCalendar('google');
            } else if (type === 'outlookCalendar' || type === 'microsoftToDo') {
                await calendarService.disconnectCalendar('microsoft');
            }
            showToast && showToast(`Disconnected successfully`);
            await loadIntegrations();
        } catch (error) {
            console.error('Disconnect error:', error);
            showToast && showToast(`Failed to disconnect`, 'error');
        }
    };

    // Sync Now: triggers a fresh sync for all providers connected to this user.
    // /calendar/sync/trigger uses JWT to identify the user and syncs
    // whichever providers (Google / Microsoft) have stored tokens.
    const handleManualSync = async (type) => {
        setSyncingType(type);
        try {
            showToast && showToast('Sync started…');
            await calendarService.triggerSync();
            showToast && showToast('Sync completed successfully!', 'success');
            await loadIntegrations();
        } catch (err) {
            console.error('Sync error:', err);
            showToast && showToast('Sync failed', 'error');
        } finally {
            setSyncingType('');
        }
    };

    const IntegrationCard = ({ name, type, icon, description, config }) => (
        <div className="bg-white rounded-lg p-6">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
                        <span className="truncate">{name}</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                    {config.connected && config.email && (
                        <p className="text-xs text-blue-600 mt-1">{config.email}</p>
                    )}
                </div>

                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    {config.connected ? (
                        <>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                                Connected
                            </span>
                            <button
                                onClick={() => disconnectIntegration(type)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                            >
                                Disconnect
                            </button>
                            <button
                                onClick={() => handleManualSync(type)}
                                disabled={syncingType !== ''}
                                className="text-sm bg-blue-500 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-md whitespace-nowrap"
                            >
                                {syncingType === type ? 'Syncing…' : 'Sync Now'}
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
                        icon={<img src={`${import.meta.env.BASE_URL}google.svg`} alt="Google" className="w-6 h-6 object-contain" />}
                        description="Sync tasks and deadlines with Google Calendar"
                        config={integrations.googleCalendar}
                    />
                    <IntegrationCard
                        name="Outlook Calendar"
                        type="outlookCalendar"
                        icon={<img src={`${import.meta.env.BASE_URL}microsoft.svg`} alt="Microsoft" className="w-6 h-6 object-contain" />}
                        description="Sync with Microsoft Outlook Calendar"
                        config={integrations.outlookCalendar}
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
                    />
                    <IntegrationCard
                        name="Microsoft To Do"
                        type="microsoftToDo"
                        icon={<img src={`${import.meta.env.BASE_URL}microsoft.svg`} alt="Microsoft To Do" className="w-6 h-6 object-contain" />}
                        description="Sync tasks with Microsoft To Do"
                        config={integrations.microsoftToDo}
                    />
                </div>
            </Section>
        </div>
    );
}