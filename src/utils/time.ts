// Frontend timezone helpers (TypeScript)
import { format as formatDate } from 'date-fns';

let tzLibCache: any = null;

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Preloads the timezone library (`date-fns-tz`) and caches it for later synchronous usage.
 * Call this at app startup to make the synchronous wrappers usable immediately.
 */
export async function preloadTzLib(): Promise<void> {
  if (tzLibCache) return;
  try {
    const mod = await import('date-fns-tz');
    tzLibCache = (mod as any).default ?? mod;
  } catch (e) {
    tzLibCache = null;
  }
}

export async function localToUtcIso(localIso: string, timeZone: string): Promise<string> {
  // localIso: '2025-11-30T10:00' or '2025-11-30T10:00:00' (no zone)
  try {
    if (!tzLibCache) await preloadTzLib();
    const tzLib = tzLibCache;
    if (tzLib && typeof tzLib.zonedTimeToUtc === 'function') {
      const dt = tzLib.zonedTimeToUtc(localIso, timeZone);
      return dt.toISOString();
    }
    // fallback: interpret as local and convert to UTC
    const d = new Date(localIso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  } catch (e) {
    try {
      const d = new Date(localIso);
      return d.toISOString();
    } catch {
      return localIso;
    }
  }
}

export async function formatUtcForUser(utcIso: string | Date, timeZone: string, pattern = 'yyyy-MM-dd HH:mm'): Promise<string> {
  if (!utcIso) return '';
  try {
    const d = typeof utcIso === 'string' ? new Date(utcIso) : utcIso;
    if (!tzLibCache) await preloadTzLib();
    const tzLib = tzLibCache;
    if (tzLib && typeof tzLib.utcToZonedTime === 'function') {
      const zoned = tzLib.utcToZonedTime(d, timeZone);
      return formatDate(zoned, pattern);
    }
    // fallback: use Intl with timeZone if available
    try {
      const opts: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      };
      return new Intl.DateTimeFormat(undefined, opts).format(d).replace(',', '');
    } catch (inner) {
      return String(utcIso);
    }
  } catch (e) {
    return String(utcIso);
  }
}

export async function utcToZonedDate(utcIso: string | Date, timeZone: string): Promise<Date> {
  const d = typeof utcIso === 'string' ? new Date(utcIso) : utcIso;
  try {
    if (!tzLibCache) await preloadTzLib();
    const tzLib = tzLibCache;
    if (tzLib && typeof tzLib.utcToZonedTime === 'function') return tzLib.utcToZonedTime(d, timeZone);
  } catch {}
  return d;
}

// Synchronous wrappers that use the cached lib if preloaded. They fall back to reasonable alternatives.
export function formatUtcForUserSync(utcIso: string | Date, timeZone: string, pattern = 'yyyy-MM-dd HH:mm'): string {
  if (!utcIso) return '';
  const d = typeof utcIso === 'string' ? new Date(utcIso) : utcIso;
  if (tzLibCache && typeof tzLibCache.utcToZonedTime === 'function') {
    try {
      const zoned = tzLibCache.utcToZonedTime(d, timeZone);
      return formatDate(zoned, pattern);
    } catch {}
  }
  try {
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    };
    return new Intl.DateTimeFormat(undefined, opts).format(d).replace(',', '');
  } catch {
    return String(utcIso);
  }
}

const defaultExport = {
  getBrowserTimeZone,
  preloadTzLib,
  localToUtcIso,
  formatUtcForUser,
  formatUtcForUserSync,
  utcToZonedDate,
};

export default defaultExport;
