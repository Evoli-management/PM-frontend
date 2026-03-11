export const parseDurationToMinutes = (value) => {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.round(value));
  }

  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  const meridiemMatch = raw.match(/^([1-9]|1[0-2]):([0-5]\d)\s*(am|pm)$/);
  if (meridiemMatch) {
    const hour12 = parseInt(meridiemMatch[1], 10);
    const minute = parseInt(meridiemMatch[2], 10);
    const meridiem = meridiemMatch[3];
    if (!Number.isFinite(hour12) || !Number.isFinite(minute)) return null;
    let hour24 = hour12 % 12;
    if (meridiem === 'pm') hour24 += 12;
    return hour24 * 60 + minute;
  }

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
    .replace(/hours?/g, 'h')
    .replace(/hrs?/g, 'h')
    .replace(/minutes?/g, 'm')
    .replace(/mins?/g, 'm')
    .replace(/,/g, ' ');

  let total = 0;
  let matched = false;

  const remainder = normalized.replace(/(\d+)\s*(h|m)/g, (_, num, unit) => {
    matched = true;
    const amount = parseInt(num, 10);
    if (!Number.isFinite(amount)) return _;
    total += unit === 'h' ? amount * 60 : amount;
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
  return parseDurationToMinutes(asString) !== null;
};

export const durationToTimeInputValue = (value) => {
  if (value === null || typeof value === 'undefined') return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const asHHMM = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (asHHMM) {
    const h = parseInt(asHHMM[1], 10);
    const m = parseInt(asHHMM[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const mins = parseDurationToMinutes(raw);
  if (mins === null) return '';
  if (mins > 23 * 60 + 59) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
