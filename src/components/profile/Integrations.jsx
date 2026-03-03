import React, { useState, useEffect, useCallback } from 'react';
import { Section, LoadingButton } from './UIComponents';
import calendarService from '../../services/calendarService';

/**
 * Integrations page — 2 provider cards: Google and Microsoft.
 *
 * Google  → Google Calendar + Google Tasks (one OAuth token)
 * Microsoft → Outlook Calendar + Microsoft To Do (one OAuth token)
 */

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export const Integrations = ({ showToast }) => {
    const [providers, setProviders] = useState({
        google: { connected: false, email: '', lastSyncAt: null, lastError: null, syncStatus: null },
        microsoft: { connected: false, email: '', lastSyncAt: null, lastError: null, syncStatus: null },
    });

    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState('');
    const [syncing, setSyncing] = useState('');

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            const status = await calendarService.getSyncStatus();
            setProviders({
                google: {
                    connected: !!status.google?.connected,
                    email: status.google?.email || '',
                    lastSyncAt: status.google?.lastSyncAt || null,
                    lastError: status.google?.lastError || null,
                    syncStatus: status.google?.syncStatus || null,
                },
                microsoft: {
                    connected: !!status.microsoft?.connected,
                    email: status.microsoft?.email || '',
                    lastSyncAt: status.microsoft?.lastSyncAt || null,
                    lastError: status.microsoft?.lastError || null,
                    syncStatus: status.microsoft?.syncStatus || null,
                },
            });
        } catch (err) {
            console.error('Failed to load integration status:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const connect = async (provider) => {
        setConnecting(provider);
        try {
            const result = provider === 'google'
                ? await calendarService.syncGoogleCalendar()
                : await calendarService.syncMicrosoftCalendar();

            if (result?.success) {
                showToast && showToast(`${provider === 'google' ? 'Google' : 'Microsoft'} connected! Syncing now…`);
                await loadStatus();
                calendarService.triggerSync().catch(e => console.warn('Initial sync failed:', e));
            }
        } catch (error) {
            const errMsg = error?.response?.data?.error || error?.message || '';
            if (error?.response?.status === 400 || /invalid(_grant|_token)/i.test(errMsg) || /token.*expired/i.test(errMsg)) {
                showToast && showToast('Your connection has expired. Please reconnect.', 'error');
                const apiBase = import.meta.env.VITE_API_BASE_URL ||
                    (import.meta.env.DEV ? '/api' : 'https://practicalmanager-4241d0bfc5ed.herokuapp.com/api');
                window.location.href = `${apiBase}/auth/${provider === 'google' ? 'google' : 'microsoft'}`;
            } else if (error.message === 'OAuth cancelled by user') {
                showToast && showToast('Connection cancelled', 'info');
            } else {
                showToast && showToast(`Failed to connect ${provider}`, 'error');
            }
        } finally {
            setConnecting('');
        }
    };

    const disconnect = async (provider) => {
        try {
            await calendarService.disconnectCalendar(provider);
            showToast && showToast(`${provider === 'google' ? 'Google' : 'Microsoft'} disconnected`);
            await loadStatus();
        } catch {
            showToast && showToast('Failed to disconnect', 'error');
        }
    };

    const syncNow = async (provider) => {
        setSyncing(provider);
        try {
            showToast && showToast('Sync started…');
            await calendarService.triggerSync();
            showToast && showToast('Sync completed!', 'success');
            await loadStatus();
        } catch {
            showToast && showToast('Sync failed', 'error');
        } finally {
            setSyncing('');
        }
    };

    const ProviderCard = ({ provider, name, icon, services, config }) => {
        const lastSync = timeAgo(config.lastSyncAt);
        const hasError = config.syncStatus === 'error' && config.lastError;

        return (
            <div className="bg-white rounded-lg p-6 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">{icon}</span>
                            <span className="truncate">{name}</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">{services.join(' · ')}</p>
                        {config.connected && config.email && (
                            <p className="text-xs text-blue-600 mt-1">{config.email}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {config.connected ? (
                            <>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                                    Connected
                                </span>
                                <button
                                    onClick={() => disconnect(provider)}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                                >
                                    Disconnect
                                </button>
                                <button
                                    onClick={() => syncNow(provider)}
                                    disabled={syncing !== ''}
                                    className="text-sm bg-blue-500 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-md whitespace-nowrap"
                                >
                                    {syncing === provider ? 'Syncing…' : 'Sync Now'}
                                </button>
                            </>
                        ) : (
                            <LoadingButton
                                onClick={() => connect(provider)}
                                loading={connecting === provider}
                                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                            >
                                Connect
                            </LoadingButton>
                        )}
                    </div>
                </div>

                {/* Last sync / error row */}
                {config.connected && (
                    <div className="flex items-center gap-3 text-xs">
                        {lastSync ? (
                            <span className="text-gray-400">
                                🔄 Last synced: <span className="font-medium text-gray-600">{lastSync}</span>
                            </span>
                        ) : (
                            <span className="text-gray-400">Never synced — click Sync Now</span>
                        )}
                        {hasError && (
                            <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded" title={config.lastError}>
                                ⚠ Sync error
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Section
                title="Connected Accounts"
                description="Connect your Google or Microsoft account to sync your calendar events and tasks."
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ProviderCard
                        provider="google"
                        name="Google"
                        icon={<img src={`${import.meta.env.BASE_URL}google.svg`} alt="Google" className="w-6 h-6 object-contain" />}
                        services={['Google Calendar', 'Google Tasks']}
                        config={providers.google}
                    />
                    <ProviderCard
                        provider="microsoft"
                        name="Microsoft"
                        icon={<img src={`${import.meta.env.BASE_URL}microsoft.svg`} alt="Microsoft" className="w-6 h-6 object-contain" />}
                        services={['Outlook Calendar', 'Microsoft To Do']}
                        config={providers.microsoft}
                    />
                </div>
            </Section>
        </div>
    );
};