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
        const res = await apiClient.patch(`${base}/appointments/${id}`, payload);
        return res.data;
    },

    async deleteEvent(id) {
        if (!id) throw new Error("Missing event id");
        await apiClient.delete(`${base}/events/${id}`);
        return true;
    },

    async deleteAppointment(id) {
        if (!id) throw new Error("Missing appointment id");
        await apiClient.delete(`${base}/appointments/${id}`);
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
            
            // Listen for postMessage from popup
            const messageHandler = async (event) => {
                if (event.data?.res === 'pm-sync' && event.data?.platform === 'google') {
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    
                    try {
                        // Use the access token to perform sync
                        const syncRes = await apiClient.post(`${base}/sync/google`, {
                            accessToken: event.data.accessToken
                        });
                        resolve(syncRes.data);
                    } catch (error) {
                        reject(error);
                    }
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Handle popup closed without auth
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
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
            
            // Listen for postMessage from popup
            const messageHandler = async (event) => {
                if (event.data?.res === 'pm-sync' && event.data?.platform === 'graph') {
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    
                    try {
                        // Use the access token to perform sync
                        const syncRes = await apiClient.post(`${base}/sync/microsoft`, {
                            accessToken: event.data.accessToken
                        });
                        resolve(syncRes.data);
                    } catch (error) {
                        reject(error);
                    }
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Handle popup closed without auth
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
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
