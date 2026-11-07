export function isDuplicateCoord(
    p1: { lat?: number; lng?: number; latitude?: number; longitude?: number },
    p2: { lat?: number; lng?: number; latitude?: number; longitude?: number },
    tolerance = 0.0001
): boolean {
    const lat1 = p1.lat ?? p1.latitude;
    const lng1 = p1.lng ?? p1.longitude;
    const lat2 = p2.lat ?? p2.latitude;
    const lng2 = p2.lng ?? p2.longitude;

    if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) {
        return false;
    }
    return Math.abs(lat1 - lat2) < tolerance && Math.abs(lng1 - lng2) < tolerance;
}
