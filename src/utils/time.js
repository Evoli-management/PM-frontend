// Frontend timezone helpers (uses date-fns + date-fns-tz)
import { format as formatDate } from 'date-fns';
import * as tz from 'date-fns-tz';

// Get browser timezone (IANA)
export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Given a local ISO (e.g. '2025-11-30T10:00' or '2025-11-30T10:00:00'), interpret it
// in provided timezone and return a UTC ISO string (Z terminated) suitable for backend.
export function localToUtcIso(localIso, timeZone) {
  const dt = tz.zonedTimeToUtc(localIso, timeZone);
  return dt.toISOString();
}

// Given a UTC ISO string and a timezone, return a formatted label for display.
export function formatUtcForUser(utcIso, timeZone, pattern = 'yyyy-MM-dd HH:mm') {
  if (!utcIso) return '';
  try {
    const d = typeof utcIso === 'string' ? new Date(utcIso) : utcIso;
    const zoned = tz.utcToZonedTime(d, timeZone);
    return formatDate(zoned, pattern);
  } catch (e) {
    return String(utcIso);
  }
}

// Convert UTC ISO string to zoned Date object (for UI components needing Date)
export function utcToZonedDate(utcIso, timeZone) {
  const d = typeof utcIso === 'string' ? new Date(utcIso) : utcIso;
  return tz.utcToZonedTime(d, timeZone);
}

export default {
  getBrowserTimeZone,
  localToUtcIso,
  formatUtcForUser,
  utcToZonedDate,
};
