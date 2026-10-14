export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/oauth2/authorization/keycloak",
    LOGOUT: "/logout",
    USER_INFO: "/api/user",
  },
  DRONES: {
    BASE: "/api/drones",
    BY_ID: (id: string) => `/api/drones/${id}`,
    TELEMETRY: (id: string) => `/api/drones/${id}/telemetry`,
  },
  FLIGHTS: {
    BASE: "/api/flights",
    BY_ID: (id: string) => `/api/flights/${id}`,
    SUBMIT_PLAN: "/api/flights/plans",
  },
  AIRSPACES: {
    BASE: "/api/airspaces",
    ZONES: "/api/airspaces/zones",
  },
  CONFLICTS: {
    BASE: "/api/conflicts",
    ALERTS: "/api/conflicts/alerts",
  },
} as const;
