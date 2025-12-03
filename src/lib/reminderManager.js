import apiClient from '../services/apiClient';

const DEFAULT_POLL_MS = 60 * 1000;

const reminderManager = {
  _interval: null,
  _permission: 'default',
  _pollMs: DEFAULT_POLL_MS,

  async init({ pollMs } = {}) {
    if (pollMs) this._pollMs = pollMs;
    try {
      this._permission = await (typeof Notification !== 'undefined' ? Notification.requestPermission() : Promise.resolve('denied'));
    } catch (e) {
      this._permission = 'denied';
    }
    // Start polling only when user is authenticated (apiClient will redirect to login on 401)
    this._interval = setInterval(() => this.pollDue(), this._pollMs);
    // Immediately run first poll
    this.pollDue().catch(() => {});
  },

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  },

  async pollDue() {
    try {
      const res = await apiClient.get('/reminders/due');
      const rows = res.data || [];
      for (const r of rows) {
        try {
          // Show push notification if allowed and allowed by reminder
          if (r.notifyViaPush && this._permission === 'granted') {
            this._showNotification(r.title || 'Reminder', r.description || '', r.id);
          } else {
            // fallback: console and optionally alert if permission denied
            console.info('Reminder due', r);
          }
          // mark as sent so it won't be shown again by the poller
          await apiClient.post(`/reminders/${r.id}/mark-sent`);
        } catch (e) {
          console.error('Failed to process reminder', r.id, e);
        }
      }
    } catch (err) {
      // ignore network/auth errors here
      // console.debug('reminderManager poll failed', err?.message || err);
    }
  },

  _showNotification(title, body, reminderId) {
    try {
      const n = new Notification(title, { body });
      n.onclick = () => {
        try {
          window.focus();
        } catch (_) {}
      };
    } catch (e) {
      console.error('Notification failed', e);
    }
  },

  async testNotification() {
    try {
      if (typeof Notification === 'undefined') {
        alert('This browser does not support notifications');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Notification permission not granted');
        return;
      }
      new Notification('Test Reminder', { body: 'This is a test notification from Practical Manager.' });
    } catch (e) {
      console.error('Test notification failed', e);
      alert('Test notification failed');
    }
  },
};

export default reminderManager;
