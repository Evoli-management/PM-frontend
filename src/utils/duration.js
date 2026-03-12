export const STRICT_DURATION_RE = /^([0-9]{1,2}):([0-5]\d)$/;

const parseLegacyMeridiemToMinutes = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  const meridiemMatch = raw.match(/^([1-9]|1[0-2]):([0-5]\d)\s*(am|pm)$/);
  if (!meridiemMatch) return null;

  const hour12 = parseInt(meridiemMatch[1], 10);
  const minute = parseInt(meridiemMatch[2], 10);
  const meridiem = meridiemMatch[3];
  if (!Number.isFinite(hour12) || !Number.isFinite(minute)) return null;

  let hour24 = hour12 % 12;
  if (meridiem === 'pm') hour24 += 12;
  return hour24 * 60 + minute;
};

const formatMinutesAsClockDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatMinutesAsCompactDuration = (minutes, { spaced = false } = {}) => {
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes === 0) return '0m';

  const parts = [];
  let remaining = Math.round(minutes);

  const days = Math.floor(remaining / (24 * 60));
  if (days > 0) {
    parts.push(`${days}d`);
    remaining -= days * 24 * 60;
  }

  const hours = Math.floor(remaining / 60);
  if (hours > 0) {
    parts.push(`${hours}h`);
    remaining -= hours * 60;
  }

  if (remaining > 0) {
    parts.push(`${remaining}m`);
  }

  return spaced ? parts.join(' ') : parts.join('');
};

export const parseDurationToMinutes = (value) => {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.round(value));
  }

  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  // Accept HH:mm (time-picker style) as duration.
  const hhmm = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }

  // Accept plain numbers as minutes for backward compatibility.
  if (/^\d+$/.test(raw)) {
    return Math.max(0, parseInt(raw, 10));
  }

  const normalized = raw
    .replace(/\band\b/g, ' ')
    .replace(/days?/g, 'd')
    .replace(/hours?/g, 'h')
    .replace(/hrs?/g, 'h')
    .replace(/minutes?/g, 'm')
    .replace(/mins?/g, 'm')
    .replace(/,/g, ' ');

  let total = 0;
  let matched = false;

  const remainder = normalized.replace(/(\d+)\s*(d|h|m)/g, (_, num, unit) => {
    matched = true;
    const amount = parseInt(num, 10);
    if (!Number.isFinite(amount)) return _;
    if (unit === 'd') total += amount * 24 * 60;
    else if (unit === 'h') total += amount * 60;
    else total += amount;
    return ' ';
  });

  if (!matched) return null;

  // Allow only whitespace and common separators after token extraction.
  if (remainder.replace(/[\s:+-]/g, '').length > 0) return null;

  return total;
};

export const isDurationInputValid = (value) => {
  if (value === null || typeof value === 'undefined') return true;
  const asString = String(value).trim();
  if (!asString) return true;
  return STRICT_DURATION_RE.test(asString);
};

export const durationToTimeInputValue = (value) => {
  if (value === null || typeof value === 'undefined') return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const legacyMinutes = parseLegacyMeridiemToMinutes(raw);
  if (legacyMinutes !== null) {
    return formatMinutesAsClockDuration(legacyMinutes);
  }

  const asHHMM = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (asHHMM) {
    const h = parseInt(asHHMM[1], 10);
    const m = parseInt(asHHMM[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const mins = parseDurationToMinutes(raw);
  if (mins === null) return raw;
  if (/^\d+$/.test(raw)) {
    return formatMinutesAsCompactDuration(mins, { spaced: true });
  }
  if (/[dhm]/i.test(raw)) {
    return formatMinutesAsCompactDuration(mins, { spaced: true });
  }
  return formatMinutesAsClockDuration(mins);
};

export const normalizeDurationForApi = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const raw = String(value).trim();
  if (!raw) return null;
  const strictMatch = raw.match(STRICT_DURATION_RE);
  if (!strictMatch) return raw;
  return `${strictMatch[1].padStart(2, '0')}:${strictMatch[2]}`;
};
