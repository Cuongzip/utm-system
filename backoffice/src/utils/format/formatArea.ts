export function formatArea(areaSqMeters: number | null | undefined): string {
    if (areaSqMeters == null || !Number.isFinite(areaSqMeters) || areaSqMeters <= 0) {
        return "—";
    }
    if (areaSqMeters < 10_000) {
        return `${Math.round(areaSqMeters).toLocaleString("en-US")} m²`;
    }
    if (areaSqMeters < 1_000_000) {
        return `${(areaSqMeters / 10_000).toFixed(2)} ha`;
    }
    return `${(areaSqMeters / 1_000_000).toFixed(2)} km²`;
}
