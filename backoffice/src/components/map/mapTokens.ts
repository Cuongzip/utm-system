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
            restricted: "#f59e0b",
            hub_corridor: "#06b6d4",
            warning: "#eab308",
        },
    },
} as const;
