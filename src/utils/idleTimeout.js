/**
 * Idle timeout utility for session management
 * TC011: Automatically logs out users after period of inactivity
 */

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000; // Show warning 5 minutes before logout

let idleTimer = null;
let warningTimer = null;
let onIdleCallback = null;
let onWarningCallback = null;

/**
 * Events to track user activity
 */
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
];

/**
 * Reset idle timers on user activity
 */
function resetIdleTimer() {
  // Clear existing timers
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);

  // Set warning timer (5 minutes before timeout)
  warningTimer = setTimeout(() => {
    if (onWarningCallback) {
      onWarningCallback();
    }
  }, IDLE_TIMEOUT - WARNING_BEFORE);

  // Set idle logout timer (30 minutes)
  idleTimer = setTimeout(() => {
    if (onIdleCallback) {
      onIdleCallback();
    }
  }, IDLE_TIMEOUT);
}

/**
 * Initialize idle timeout tracking
 * @param {Function} idleCallback - Called when user is idle too long
 * @param {Function} warningCallback - Called to warn user before logout
 */
export function initIdleTimeout(idleCallback, warningCallback) {
  onIdleCallback = idleCallback;
  onWarningCallback = warningCallback;

  // Add event listeners for user activity
  ACTIVITY_EVENTS.forEach((event) => {
    document.addEventListener(event, resetIdleTimer, true);
  });

  // Start the timer
  resetIdleTimer();
}

/**
 * Clean up idle timeout tracking
 */
export function cleanupIdleTimeout() {
  // Clear timers
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);

  // Remove event listeners
  ACTIVITY_EVENTS.forEach((event) => {
    document.removeEventListener(event, resetIdleTimer, true);
  });

  onIdleCallback = null;
  onWarningCallback = null;
}

/**
 * Manually reset the idle timer (e.g., after API call)
 */
export function resetIdle() {
  resetIdleTimer();
}
