export const API_ENDPOINTS = {
    DRONES: {
        BASE: "/api/api/v1/drones",
        BY_ID: (id: string) => `/api/api/v1/drones/${id}`,
        COMMANDS: (droneId: string) => `/api/api/v1/drones/${droneId}/commands`,
    },
    HUBS: {
        BASE: "/api/api/v1/hubs",
        BY_ID: (id: string) => `/api/api/v1/hubs/${id}`,
    },
    FLIGHTS: {
        BASE: "/api/api/v1/flights",
        BY_ID: (id: string) => `/api/api/v1/flights/${id}`,
    },
    AIRSPACES: {
        ZONES: "/api/api/v1/airspace/zones",
        BY_ID: (id: string) => `/api/api/v1/airspace/zones/${id}`,
        CHECK_PATH: "/api/api/v1/airspace/check-path",
    },
    ALERTS: {
        ACTIVE: "/api/api/v1/alerts/active",
        ACKNOWLEDGE: (id: string) => `/api/api/v1/alerts/${id}/acknowledge`,
    },
    CONFLICTS: {
        ALERTS: "/api/api/v1/alerts",
    },
    CONNECTIVITY: {
        BASE: "/api/api/v1/connectivity/devices",
        ONLINE: "/api/api/v1/connectivity/devices/online",
        BY_ID: (id: string) => `/api/api/v1/connectivity/devices/${id}`,
        REGISTER: "/api/api/v1/connectivity/devices/register",
        HEARTBEAT: (id: string) => `/api/api/v1/connectivity/devices/${id}/heartbeat`,
    },
    MISSIONS: {
        BASE: "/api/api/v1/missions",
        BY_ID: (id: string) => `/api/api/v1/missions/${id}`,
        EXECUTE: (id: string) => `/api/api/v1/missions/${id}/execute`,
        DUPLICATE: (id: string) => `/api/api/v1/missions/${id}/duplicate`,
        WAYPOINTS: (missionId: string) => `/api/api/v1/missions/${missionId}/waypoints`,
        WAYPOINT_BY_ID: (missionId: string, waypointId: string) =>
            `/api/api/v1/missions/${missionId}/waypoints/${waypointId}`,
        REORDER_WAYPOINTS: (missionId: string) =>
            `/api/api/v1/missions/${missionId}/waypoints/reorder`,
    },
    TELEMETRY: {
        LATEST_BY_FLIGHT: (flightId: string) => `/api/api/v1/telemetry/flight/${flightId}/latest`,
        LATEST_BY_DRONE: (droneId: string) => `/api/api/v1/telemetry/drone/${droneId}/latest`,
    },
    SIMULATION: {
        BASE: "/api/api/v1/simulation/sessions",
        BY_ID: (id: string) => `/api/api/v1/simulation/sessions/${id}`,
        PAUSE: (id: string) => `/api/api/v1/simulation/sessions/${id}/pause`,
        RESUME: (id: string) => `/api/api/v1/simulation/sessions/${id}/resume`,
        STOP: (id: string) => `/api/api/v1/simulation/sessions/${id}/stop`,
        TIME_SCALE: (id: string) => `/api/api/v1/simulation/sessions/${id}/time-scale`,
        INJECT_SCENARIO: (id: string) => `/api/api/v1/simulation/sessions/${id}/inject-scenario`,
        SCENARIOS: "/api/api/v1/simulation/scenarios",
        EVENTS: (id: string) => `/api/api/v1/simulation/sessions/${id}/events`,
        DEVICE_POWER_ON: (id: string) => `/api/api/v1/simulation/devices/${id}/power-on`,
        DEVICE_POWER_OFF: (id: string) => `/api/api/v1/simulation/devices/${id}/power-off`,
    },
    EMERGENCY: {
        STATS: "/api/api/v1/emergency/stats",
        TRENDS: "/api/api/v1/emergency/stats/trends",
        ACTIVE_INCIDENTS: "/api/api/v1/emergency/incidents/active",
        INCIDENTS: "/api/api/v1/emergency/incidents",
        INCIDENT_BY_ID: (id: string) => `/api/api/v1/emergency/incidents/${id}`,
        CONFIRM_INCIDENT: (id: string) => `/api/api/v1/emergency/incidents/${id}/confirm`,
        ROOT_CAUSE: (id: string) => `/api/api/v1/emergency/incidents/${id}/root-cause`,
        CONFIG: "/api/api/v1/emergency/config",
        SET_MODE: "/api/api/v1/emergency/config/mode",
        PROTOCOLS: "/api/api/v1/emergency/protocols",
        PROTOCOL_BY_ID: (id: string) => `/api/api/v1/emergency/protocols/${id}`,
    },
} as const;
