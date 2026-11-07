export function formatSpeed(speedMps?: number | null): string {
    if (speedMps === undefined || speedMps === null || isNaN(speedMps)) return "0 km/h";
    return `${Math.round(speedMps * 3.6)} km/h`;
}
