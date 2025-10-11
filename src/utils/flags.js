// Simple feature flag reader for Vite env vars
// Usage: isFeatureEnabled('calendar')

const toBool = (v) => {
    if (v === true) return true;
    const s = String(v || "")
        .toLowerCase()
        .trim();
    return s === "1" || s === "true" || s === "yes" || s === "on";
};

export const features = {
    calendar: toBool(import.meta.env.VITE_FEATURE_CALENDAR),
};

export function isFeatureEnabled(key) {
    return !!features[key];
}
