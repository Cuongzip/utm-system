export function formatDateTime(isoString?: string): string {
    if (!isoString) return "--";
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return isoString;
    }
}

export function formatCoordinates(lat: number, lon: number): string {
    return `${lat.toFixed(5)}°N, ${lon.toFixed(5)}°E`;
}

export function formatAltitude(altitudeMeters: number): string {
    return `${Math.round(altitudeMeters)} m`;
}

export function formatDate(val?: string | Date): string {
    if (!val) return "—";
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return String(val);
    }
}
