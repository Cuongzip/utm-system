import { format, isValid, formatDistanceToNow } from "date-fns";

export function toValidDate(val?: string | Date | number | null): Date | null {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    return isValid(d) ? d : null;
}

export function formatDate(val?: string | Date | number | null, pattern = "MMM dd, yyyy"): string {
    const d = toValidDate(val);
    if (!d) return "—";
    try {
        return format(d, pattern);
    } catch {
        return "—";
    }
}

export function formatDateTime(
    val?: string | Date | number | null,
    pattern = "MMM dd, yyyy HH:mm:ss"
): string {
    const d = toValidDate(val);
    if (!d) return "--";
    try {
        return format(d, pattern);
    } catch {
        return String(val);
    }
}

export function formatTime(val?: string | Date | number | null, pattern = "HH:mm:ss"): string {
    const d = toValidDate(val);
    if (!d) return "--";
    try {
        return format(d, pattern);
    } catch {
        return String(val);
    }
}

export function formatRelativeTime(val?: string | Date | number | null): string {
    const d = toValidDate(val);
    if (!d) return "—";
    try {
        return formatDistanceToNow(d, { addSuffix: true });
    } catch {
        return "—";
    }
}

export function formatCoordinates(lat: number, lon: number): string {
    return `${lat.toFixed(5)}°N, ${lon.toFixed(5)}°E`;
}

export function formatAltitude(altitudeMeters: number): string {
    return `${Math.round(altitudeMeters)} m`;
}

export function formatSpeed(speedMps?: number | null): string {
    if (speedMps === undefined || speedMps === null || isNaN(speedMps)) return "0 km/h";
    return `${Math.round(speedMps * 3.6)} km/h`;
}

export function formatDistance(meters?: number | null, decimals = 1): string {
    if (meters === undefined || meters === null || isNaN(meters)) return "0 m";
    if (Math.abs(meters) >= 1000) {
        return `${(meters / 1000).toFixed(decimals)} km`;
    }
    return `${Math.round(meters)} m`;
}

export function estimateFlightDurationMinutes(distanceMeters: number, cruiseSpeedKmh = 60): number {
    if (!distanceMeters || distanceMeters <= 0) return 0;
    const distanceKm = distanceMeters / 1000;
    return Math.ceil((distanceKm / cruiseSpeedKmh) * 60);
}

export function estimateBatteryPercentage(distanceMeters: number, pctPerKm = 4): number {
    if (!distanceMeters || distanceMeters <= 0) return 0;
    const distanceKm = distanceMeters / 1000;
    return Math.min(100, Math.ceil(distanceKm * pctPerKm));
}
