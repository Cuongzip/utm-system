export function formatCoordinate(val?: number | null, precision = 4, fallback = "—"): string {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(precision);
}
