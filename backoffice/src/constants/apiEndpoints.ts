export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: "/oauth2/authorization/keycloak",
        LOGOUT: "/logout",
        USER_INFO: "/authentication/user",
    },
    DRONES: {
        BASE: "/api/api/v1/drones",
        BY_ID: (id: string) => `/api/api/v1/drones/${id}`,
        TELEMETRY: (id: string) => `/api/api/v1/telemetry/${id}`,
        COMMANDS: (droneId: string) => `/api/api/v1/drones/${droneId}/commands`,
        COMMAND_BY_ID: (droneId: string, commandId: string) =>
            `/api/api/v1/drones/${droneId}/commands/${commandId}`,
        ACTIVE_COMMANDS: (droneId: string) => `/api/api/v1/drones/${droneId}/commands/active`,
        CANCEL_COMMAND: (droneId: string, commandId: string) =>
            `/api/api/v1/drones/${droneId}/commands/${commandId}/cancel`,
    },
    HUBS: {
        BASE: "/api/api/v1/hubs",
        BY_ID: (id: string) => `/api/api/v1/hubs/${id}`,
    },
    ORGANIZATIONS: {
        BASE: "/api/api/v1/organizations",
        BY_ID: (id: string) => `/api/api/v1/organizations/${id}`,
    },
    FLIGHTS: {
        BASE: "/api/api/v1/flights",
        BY_ID: (id: string) => `/api/api/v1/flights/${id}`,
        SUBMIT_PLAN: "/api/api/v1/flights/plans",
    },
    AIRSPACES: {
        BASE: "/api/api/v1/airspace",
        ZONES: "/api/api/v1/airspace/zones",
        BY_ID: (id: string) => `/api/api/v1/airspace/zones/${id}`,
        CHECK_POINT: "/api/api/v1/airspace/check",
        CHECK_PATH: "/api/api/v1/airspace/check-path",
    },
    ALERTS: {
        BASE: "/api/api/v1/alerts",
        ACTIVE: "/api/api/v1/alerts/active",
        BY_ID: (id: string) => `/api/api/v1/alerts/${id}`,
        ACKNOWLEDGE: (id: string) => `/api/api/v1/alerts/${id}/acknowledge`,
        RESOLVE: (id: string) => `/api/api/v1/alerts/${id}/resolve`,
    },
    CONFLICTS: {
        BASE: "/api/api/v1/conflicts",
        ALERTS: "/api/api/v1/alerts",
    },
    CONNECTIVITY: {
        BASE: "/api/api/v1/connectivity/devices",
        ONLINE: "/api/api/v1/connectivity/devices/online",
        BY_ID: (id: string) => `/api/api/v1/connectivity/devices/${id}`,
        REGISTER: "/api/api/v1/connectivity/devices/register",
        HEARTBEAT: (id: string) => `/api/api/v1/connectivity/devices/${id}/heartbeat`,
        STATUS: "/api/api/v1/connectivity/status",
        TELEMETRY_STATS: "/api/api/v1/connectivity/telemetry/stats",
        COMMANDS_STATS: "/api/api/v1/connectivity/commands/stats",
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
        BASE: "/api/api/v1/telemetry",
        BY_FLIGHT: (flightId: string) => `/api/api/v1/telemetry/flight/${flightId}`,
        LATEST_BY_FLIGHT: (flightId: string) => `/api/api/v1/telemetry/flight/${flightId}/latest`,
        BY_DRONE: (droneId: string) => `/api/api/v1/telemetry/drone/${droneId}`,
        LATEST_BY_DRONE: (droneId: string) => `/api/api/v1/telemetry/drone/${droneId}/latest`,
    },
} as const;
