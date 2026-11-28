export function formatDuration(totalSeconds: number): string {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    if (clamped >= 3600) {
        const hours = Math.floor(clamped / 3600);
        const minutes = Math.floor((clamped % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (clamped >= 60) {
        const minutes = Math.floor(clamped / 60);
        const seconds = clamped % 60;
        return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
    }
    return `${clamped}s`;
}
