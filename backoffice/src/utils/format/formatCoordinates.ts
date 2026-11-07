import { formatCoordinate } from "./formatCoordinate";

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
