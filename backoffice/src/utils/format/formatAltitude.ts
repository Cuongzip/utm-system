export function formatAltitude(altitudeMsl?: number | null, fallback = "—"): string {
    if (altitudeMsl === undefined || altitudeMsl === null || isNaN(altitudeMsl)) return fallback;
    return `${altitudeMsl} m`;
}
