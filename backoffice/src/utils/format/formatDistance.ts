export function formatDistance(meters?: number | null, decimals = 1, fallback = "—"): string {
    if (meters === undefined || meters === null || isNaN(meters)) return fallback;
    if (Math.abs(meters) >= 1000) {
        return `${(meters / 1000).toFixed(decimals)} km`;
    }
    return `${Math.round(meters)} m`;
}
