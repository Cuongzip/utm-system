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

export function formatSpeed(speedMps?: number | null): string {
    if (speedMps === undefined || speedMps === null || isNaN(speedMps)) return "0 km/h";
    return `${Math.round(speedMps * 3.6)} km/h`;
}

export function formatDistance(meters?: number | null, decimals = 1, fallback = "—"): string {
    if (meters === undefined || meters === null || isNaN(meters)) return fallback;
    if (Math.abs(meters) >= 1000) {
        return `${(meters / 1000).toFixed(decimals)} km`;
    }
    return `${Math.round(meters)} m`;
}

export function formatCoordinate(val?: number | null, precision = 4, fallback = "—"): string {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(precision);
}

export function formatCoordinates(
    location?: { latitude?: number | null; longitude?: number | null } | null,
    precision = 4,
    fallback = "—"
): string {
    if (
        location?.latitude === undefined ||
        location?.latitude === null ||
        isNaN(location.latitude) ||
        location?.longitude === undefined ||
        location?.longitude === null ||
        isNaN(location.longitude)
    ) {
        return fallback;
    }
    return `${formatCoordinate(location.latitude, precision)}, ${formatCoordinate(location.longitude, precision)}`;
}

export function formatAltitude(altitudeMsl?: number | null, fallback = "—"): string {
    if (altitudeMsl === undefined || altitudeMsl === null || isNaN(altitudeMsl)) return fallback;
    return `${altitudeMsl} m`;
}

export function formatNullable<T>(
    val: T | null | undefined,
    formatter?: (val: T) => string,
    fallback = "—"
): string {
    if (val === null || val === undefined || val === "") return fallback;
    return formatter ? formatter(val) : String(val);
}
