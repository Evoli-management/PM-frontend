// Business hours helpers (frontend)
// Default 08:00–17:00 local. End is an inclusive boundary for event END times (events may end at 17:00 but may not start at 17:00).
export const BUSINESS_HOURS_START = "08:00";
export const BUSINESS_HOURS_END = "17:00";

const parseHM = (hm) => {
    const [h, m] = hm.split(":").map((v) => parseInt(v, 10));
    return { h, m };
};

export function withinBusinessHours(date) {
    if (!(date instanceof Date)) return false;
    const { h: sh, m: sm } = parseHM(BUSINESS_HOURS_START);
    const { h: eh, m: em } = parseHM(BUSINESS_HOURS_END);
    if (date.getHours() < sh || (date.getHours() === sh && date.getMinutes() < sm)) return false;
    // Allow timestamps exactly at end boundary (used for END times) but disallow starts there via caller logic.
    if (date.getHours() > eh || (date.getHours() === eh && date.getMinutes() > em)) return false;
    return true;
}

export function clampToBusinessHours(start, durationMinutes = 60) {
    const s = new Date(start);
    if (!withinBusinessHours(s)) {
        const { h: sh, m: sm } = parseHM(BUSINESS_HOURS_START);
        s.setHours(sh, sm, 0, 0);
    }
    const end = new Date(s.getTime() + durationMinutes * 60000);
    const { h: eh, m: em } = parseHM(BUSINESS_HOURS_END);
    const boundary = new Date(s);
    boundary.setHours(eh, em, 0, 0); // inclusive end boundary for event end
    if (end > boundary) {
        // shift start backwards so end aligns with boundary
        const overshoot = end.getTime() - boundary.getTime();
        s.setTime(s.getTime() - overshoot);
        return { start: s, end: boundary };
    }
    return { start: s, end };
}
