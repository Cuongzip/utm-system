export const MAP_TOKENS = {
    colors: {
        flightStatus: {
            active: "#10b981",
            in_flight: "#10b981",
            authorized: "#00a3bf",
            scheduled: "#00a3bf",
            planned: "#00a3bf",
            completed: "#94a3b8",
            cancelled: "#ef4444",
            aborted: "#ef4444",
            warning: "#f59e0b",
        },
        airspace: {
            no_fly_zone: "#ef4444",
            prohibited: "#dc2626",
            emergency_exclusion: "#f43f5e",
            restricted: "#f59e0b",
            temporary_restriction: "#fb923c",
            warning: "#eab308",
            controlled: "#3b82f6",
            hub_corridor: "#06b6d4",
            hub_zone: "#14b8a6",
        },
    },
} as const;

export function getAirspaceZoneColor(zoneType?: string | null): string {
    if (!zoneType) return MAP_TOKENS.colors.airspace.warning;
    const normalized = zoneType.trim().toLowerCase() as keyof typeof MAP_TOKENS.colors.airspace;
    return MAP_TOKENS.colors.airspace[normalized] ?? "#64748b";
}
