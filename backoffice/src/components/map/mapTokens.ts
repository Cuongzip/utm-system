export const MAP_TOKENS = {
    colors: {
        drone: {
            active: "#10b981",
            selected: "#00e5ff",
            alert: "#ef4444",
            standby: "#f59e0b",
            offline: "#64748b",
        },
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
        hub: {
            normal: "#06b6d4",
            selected: "#00e5ff",
            warning: "#f59e0b",
        },
    },
    dimensions: {
        droneBillboardSize: 32,
        hubBillboardSize: 30,
        pinBillboardSize: 24,
        waypointBillboardSize: 26,
    },
} as const;
