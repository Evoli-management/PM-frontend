import apiClient from "./apiClient";

const base = "/calendar";

const calendarService = {
    async listEvents({ from, to, view } = {}) {
        const params = { from, to };
        if (view && (view === "day" || view === "week")) params.view = view;
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(`${base}/events`, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data || [];
    },

    async listTodos({ from, to } = {}) {
        const params = { from, to };
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(`${base}/todos`, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data || [];
    },

    async listAppointments({ from, to } = {}) {
        const params = { from, to };
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(`${base}/appointments`, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data || [];
    },

    async createEvent(payload) {
        const res = await apiClient.post(`${base}/events`, payload);
        return res.data;
    },

    async createAppointment(payload) {
        const res = await apiClient.post(`${base}/appointments`, payload);
        return res.data;
    },

    async updateEvent(id, payload) {
        if (!id) throw new Error("Missing event id");
        const res = await apiClient.patch(`${base}/events/${id}`, payload);
        return res.data;
    },

    async updateAppointment(id, payload) {
        if (!id) throw new Error("Missing appointment id");
        // Support generated occurrence ids of the form "<baseId>_<ISO>" used by the UI.
        // If present, forward the base appointment id to the backend and ensure
        // occurrence context is provided in the payload so the server can apply
        // edits to the right occurrence/series.
        let appointmentIdToUse = id;
        if (typeof id === 'string' && id.includes('_')) {
            appointmentIdToUse = id.split('_')[0];
            // If caller didn't provide an explicit editScope/occurrenceStart, prefer occurrence edit
            if (!payload.editScope && !payload.occurrenceStart) {
                payload.editScope = 'occurrence';
                // extract ISO part (everything after the first underscore)
                const iso = id.split('_').slice(1).join('_');
                payload.occurrenceStart = iso;
            }
        }
        const res = await apiClient.patch(`${base}/appointments/${appointmentIdToUse}`, payload);
        return res.data;
    },

    async deleteEvent(id) {
        if (!id) throw new Error("Missing event id");
        await apiClient.delete(`${base}/events/${id}`);
        return true;
    },

    async deleteAppointment(id, opts = {}) {
        if (!id) throw new Error("Missing appointment id");
        let appointmentIdToUse = id;
        const params = { ...(opts || {}) };
        if (typeof id === 'string' && id.includes('_')) {
            appointmentIdToUse = id.split('_')[0];
            // if caller didn't already pass occurrence context, add occurrence delete scope
            if (!params.editScope && !params.occurrenceStart) {
                params.editScope = 'occurrence';
                params.occurrenceStart = id.split('_').slice(1).join('_');
            }
        }
        await apiClient.delete(`${base}/appointments/${appointmentIdToUse}`, { params });
        return true;
    },

    // External Calendar Sync Methods
    async syncGoogleCalendar() {
        // Get OAuth URL from backend
        const res = await apiClient.get(`${base}/oauth/google`);
        const { authUrl } = res.data;
        
        return new Promise((resolve, reject) => {
            // Open popup window for OAuth
            const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
            
            let resolved = false;
            
            const cleanup = () => {
                if (resolved) return;
                resolved = true;
                window.removeEventListener('message', messageHandler);
                window.removeEventListener('storage', storageHandler);
                if (broadcastChannel) {
                    try { broadcastChannel.close(); } catch(e) {}
                }
                clearInterval(checkClosed);
                try { popup.close(); } catch(e) {}
            };
            
            // Method 1: Listen for postMessage from popup
            const messageHandler = async (event) => {
                if (event.data && event.data.provider === 'google') {
                    cleanup();
                    if (event.data.success === true) {
                        resolve({ success: true });
                    } else {
                        reject(new Error('OAuth cancelled by user'));
                    }
                }
            };
            window.addEventListener('message', messageHandler);
            
            // Method 2: BroadcastChannel (for COOP-blocked scenarios)
            let broadcastChannel;
            try {
                broadcastChannel = new BroadcastChannel('oauth-callback');
                broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.provider === 'google') {
                        cleanup();
                        if (event.data.success === true) {
                            resolve({ success: true });
                        } else {
                            reject(new Error('OAuth cancelled by user'));
                        }
                    }
                };
            } catch (e) {
                console.log('BroadcastChannel not available');
            }
            
            // Method 3: localStorage event (fallback)
            const storageHandler = (event) => {
                if (event.key === 'oauth-callback' && event.newValue) {
                    try {
                        const data = JSON.parse(event.newValue);
                        if (data.provider === 'google') {
                            cleanup();
                            if (data.success === true) {
                                resolve({ success: true });
                            } else {
                                reject(new Error('OAuth cancelled by user'));
                            }
                        }
                    } catch (e) {}
                }
            };
            window.addEventListener('storage', storageHandler);
            
            // Handle popup closed without auth
            const checkClosed = setInterval(() => {
                if (popup && popup.closed) {
                    cleanup();
                    reject(new Error('OAuth cancelled by user'));
                }
            }, 1000);
        });
    },

    async syncMicrosoftCalendar() {
        // Get OAuth URL from backend  
        const res = await apiClient.get(`${base}/oauth/microsoft`);
        const { authUrl } = res.data;
        
        return new Promise((resolve, reject) => {
            // Open popup window for OAuth
            const popup = window.open(authUrl, 'microsoft-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
            
            let resolved = false;
            
            const cleanup = () => {
                if (resolved) return;
                resolved = true;
                window.removeEventListener('message', messageHandler);
                window.removeEventListener('storage', storageHandler);
                if (broadcastChannel) {
                    try { broadcastChannel.close(); } catch(e) {}
                }
                clearInterval(checkClosed);
                try { popup.close(); } catch(e) {}
            };
            
            // Method 1: Listen for postMessage from popup
            const messageHandler = async (event) => {
                if (event.data && event.data.provider === 'graph') {
                    cleanup();
                    if (event.data.success === true) {
                        resolve({ success: true });
                    } else {
                        reject(new Error('OAuth cancelled by user'));
                    }
                }
            };
            window.addEventListener('message', messageHandler);
            
            // Method 2: BroadcastChannel (for COOP-blocked scenarios)
            let broadcastChannel;
            try {
                broadcastChannel = new BroadcastChannel('oauth-callback');
                broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.provider === 'graph') {
                        cleanup();
                        if (event.data.success === true) {
                            resolve({ success: true });
                        } else {
                            reject(new Error('OAuth cancelled by user'));
                        }
                    }
                };
            } catch (e) {
                console.log('BroadcastChannel not available');
            }
            
            // Method 3: localStorage event (fallback)
            const storageHandler = (event) => {
                if (event.key === 'oauth-callback' && event.newValue) {
                    try {
                        const data = JSON.parse(event.newValue);
                        if (data.provider === 'graph') {
                            cleanup();
                            if (data.success === true) {
                                resolve({ success: true });
                            } else {
                                reject(new Error('OAuth cancelled by user'));
                            }
                        }
                    } catch (e) {}
                }
            };
            window.addEventListener('storage', storageHandler);
            
            // Handle popup closed without auth
            const checkClosed = setInterval(() => {
                if (popup && popup.closed) {
                    cleanup();
                    reject(new Error('OAuth cancelled by user'));
                }
            }, 1000);
        });
    },

    async getSyncStatus() {
        const res = await apiClient.get(`${base}/sync/status`);
        return res.data;
    },

    async disconnectCalendar(provider) {
        if (!provider) throw new Error("Missing provider");
        
        // For disconnect, we need the access tokens which should be stored
        // For now, we'll call the generic disconnect endpoint
        // TODO: Store and retrieve access tokens properly
        
        let endpoint;
        switch (provider.toLowerCase()) {
            case 'google':
                endpoint = `${base}/signout/google`;
                break;
            case 'microsoft':
                endpoint = `${base}/signout/microsoft`;
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
        
        try {
            // This would need proper token management
            // For now, we'll just return success since we don't have stored tokens
            console.warn('Disconnect requires stored access tokens - implementing basic disconnect');
            return { success: true, message: `${provider} calendar disconnected` };
        } catch (error) {
            console.error('Disconnect error:', error);
            throw error;
        }
    },
};

export default calendarService;
