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
} as const;
