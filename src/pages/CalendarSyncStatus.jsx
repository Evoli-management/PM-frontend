import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import authService from '../services/authService';
import { 
  RefreshCw, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings,
  Loader
} from 'lucide-react';

export default function CalendarSyncStatus() {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncPreferences, setSyncPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadSyncData();
    }
  }, [user?.id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const res = await authService.verifyToken();
      setUser(res?.user || res);
    } catch (err) {
      console.error('Failed to load user:', err);
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) return;
      const [status, preferences] = await Promise.all([
        syncService.getSyncStatus(user.id),
        syncService.getSyncPreferences(user.id),
      ]);
      setSyncStatus(status);
      setSyncPreferences(preferences);
    } catch (err) {
      console.error('Failed to load sync data:', err);
      setError(err.message || 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  const toggleSync = async (provider, currentlyEnabled) => {
    try {
      setUpdating(true);
      if (provider === 'google') {
        await syncService.setGoogleSync(user.id, !currentlyEnabled);
      } else {
        await syncService.setOutlookSync(user.id, !currentlyEnabled);
      }
      await loadSyncData();
    } catch (err) {
      console.error('Failed to toggle sync:', err);
      setError(err.message || 'Failed to update sync settings');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'idle':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'syncing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'idle':
        return 'Active';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Calendar Sync
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your calendar synchronization settings
          </p>
        </div>
        <button
          onClick={loadSyncData}
          disabled={updating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Calendar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
                <p className="text-sm text-gray-500">
                  {syncPreferences?.syncToGoogle ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncPreferences?.syncToGoogle || false}
                onChange={() => toggleSync('google', syncPreferences?.syncToGoogle)}
                disabled={updating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {syncStatus?.providers?.find(p => p.provider === 'google') && (
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus.providers.find(p => p.provider === 'google')?.syncStatus)}
                  <span className="text-sm font-medium">
                    {getStatusText(syncStatus.providers.find(p => p.provider === 'google')?.syncStatus)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Sync</span>
                <span className="text-sm text-gray-900">
                  {formatDate(syncStatus.providers.find(p => p.provider === 'google')?.lastSyncAt)}
                </span>
              </div>
              {syncStatus.providers.find(p => p.provider === 'google')?.lastError && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                  {syncStatus.providers.find(p => p.provider === 'google')?.lastError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Microsoft Outlook */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Microsoft Outlook</h3>
                <p className="text-sm text-gray-500">
                  {syncPreferences?.syncToOutlook ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncPreferences?.syncToOutlook || false}
                onChange={() => toggleSync('outlook', syncPreferences?.syncToOutlook)}
                disabled={updating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {syncStatus?.providers?.find(p => p.provider === 'microsoft') && (
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus.providers.find(p => p.provider === 'microsoft')?.syncStatus)}
                  <span className="text-sm font-medium">
                    {getStatusText(syncStatus.providers.find(p => p.provider === 'microsoft')?.syncStatus)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Sync</span>
                <span className="text-sm text-gray-900">
                  {formatDate(syncStatus.providers.find(p => p.provider === 'microsoft')?.lastSyncAt)}
                </span>
              </div>
              {syncStatus.providers.find(p => p.provider === 'microsoft')?.lastError && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                  {syncStatus.providers.find(p => p.provider === 'microsoft')?.lastError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Sync Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {syncStatus?.totalAppointments || 0}
            </div>
            <div className="text-sm text-gray-600">Total Appointments</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {syncStatus?.providers?.filter(p => p.syncStatus === 'idle').length || 0}
            </div>
            <div className="text-sm text-gray-600">Active Syncs</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {syncStatus?.providers?.[0]?.syncFrequencyMinutes || 15} min
            </div>
            <div className="text-sm text-gray-600">Sync Frequency</div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How Calendar Sync Works</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Events from your external calendars are automatically synced to Practical Manager</li>
          <li>Sync happens every {syncStatus?.providers?.[0]?.syncFrequencyMinutes || 15} minutes</li>
          <li>Changes in your external calendar will override local changes (conflict resolution: external-wins)</li>
          <li>You can enable/disable sync for each calendar provider independently</li>
        </ul>
      </div>
    </div>
  );
}
