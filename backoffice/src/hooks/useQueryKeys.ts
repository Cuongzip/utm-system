import type {
    ConflictQueryParams,
    EmergencyStatsQueryParams,
    EmergencyTrendsQueryParams,
    IncidentQueryParams,
} from "@/types";

export const QUERY_KEYS = {
    organizations: ["organizations"] as const,
    organizationsAll: ["organizations", "all"] as const,
    hubs: ["hubs"] as const,
    hubsAll: ["hubs", "all"] as const,
    drones: ["drones"] as const,
    dronesAll: ["drones", "all"] as const,
    droneCommands: (droneId: string) => ["drones", droneId, "commands"] as const,
    flightCommands: (flightId: string) => ["commands", "flight", flightId] as const,
    flights: ["flights"] as const,
    flightsAll: ["flights", "all"] as const,
    flightDetail: (id: string) => ["flights", "detail", id] as const,
    flightFeasibility: (id: string, locale?: string) =>
        locale
            ? (["flights", id, "feasibility", locale] as const)
            : (["flights", id, "feasibility"] as const),
    flightConformance: (id: string) => ["flights", id, "conformance"] as const,
    flightTelemetryHistory: (id: string) => ["telemetry", "flight", id, "history"] as const,
    airspace: ["airspace"] as const,
    airspaceDetail: (id: string) => ["airspace", "detail", id] as const,
    missions: ["missions"] as const,
    missionDetail: (id: string) => ["missions", "detail", id] as const,
    missionExecutionPlan: (id: string, autoSplitByRange = false, locale?: string) =>
        autoSplitByRange
            ? locale
                ? (["missions", id, "execution-plan", "auto-split", locale] as const)
                : (["missions", id, "execution-plan", "auto-split"] as const)
            : locale
              ? (["missions", id, "execution-plan", locale] as const)
              : (["missions", id, "execution-plan"] as const),
    missionExecutions: (id: string) => ["missions", id, "executions"] as const,
    connectivity: ["connectivity"] as const,
    connectivityDevices: ["connectivity", "devices"] as const,
    connectivityOnline: ["connectivity", "online"] as const,
    alertsActive: ["alerts", "active"] as const,
    simulation: ["simulation"] as const,
    simulationDetail: (id: string) => ["simulation", "detail", id] as const,
    simulationEvents: (id: string) => ["simulation", "events", id] as const,
    conflicts: ["conflicts"] as const,
    conflictsList: (params?: ConflictQueryParams) =>
        params ? (["conflicts", params] as const) : (["conflicts"] as const),
    conflictsActive: ["conflicts", "active"] as const,
    conflictAdvice: (id: string) => ["conflicts", id, "advice"] as const,
    emergencyStats: ["emergency", "stats"] as const,
    emergencyStatsRange: (params?: EmergencyStatsQueryParams) =>
        params ? (["emergency", "stats", params] as const) : (["emergency", "stats"] as const),
    emergencyTrendsRange: (params?: EmergencyTrendsQueryParams) =>
        params ? (["emergency", "trends", params] as const) : (["emergency", "trends"] as const),
    emergencyActive: ["emergency", "active"] as const,
    emergencyPending: ["emergency", "pending"] as const,
    emergencyIncidentDetail: (id: string) => ["emergency", "incidents", "detail", id] as const,
    emergencyBlackbox: (id: string) => ["emergency", "incidents", id, "blackbox"] as const,
    emergencyConfig: ["emergency", "config"] as const,
    emergencyProtocols: ["emergency", "protocols"] as const,
    authUser: ["auth", "user"] as const,
    emergencyIncidents: (params?: IncidentQueryParams) =>
        params
            ? (["emergency", "incidents", params] as const)
            : (["emergency", "incidents"] as const),
    fleetOverview: ["fleet", "overview"] as const,
    fleetHubDrones: (hubId: string) => ["fleet", "overview", "hub-drones", hubId] as const,
    fleetConfigs: ["fleet", "configs"] as const,
    fleetActiveConfig: ["fleet", "config", "active"] as const,
    fleetRebalancingPending: ["fleet", "rebalancing", "pending"] as const,
    fleetRebalancingActive: ["fleet", "rebalancing", "active"] as const,
    fleetRebalancingHistory: ["fleet", "rebalancing", "history"] as const,
    weatherRoot: ["weather"] as const,
    weatherMetar: ["weather", "metar"] as const,
    weatherTaf: ["weather", "taf"] as const,
    weatherSigmet: ["weather", "sigmet"] as const,
    weatherNotams: ["weather", "notams"] as const,
    weatherAdsb: ["weather", "adsb"] as const,
    weatherHubCurrent: (hubId: string, locale?: string) =>
        locale
            ? (["weather", "current", hubId, locale] as const)
            : (["weather", "current", hubId] as const),
    weatherHubForecast: (hubId: string, locale?: string) =>
        locale
            ? (["weather", "forecast", hubId, locale] as const)
            : (["weather", "forecast", hubId] as const),
    weatherHubAlerts: (hubId: string, locale?: string) =>
        locale
            ? (["weather", "alerts", hubId, locale] as const)
            : (["weather", "alerts", hubId] as const),
    weatherHubGoNoGo: (hubId: string, locale?: string) =>
        locale
            ? (["weather", "go-no-go", hubId, locale] as const)
            : (["weather", "go-no-go", hubId] as const),
    connectivityStatus: ["connectivity", "status"] as const,
    connectivityTelemetryModes: ["connectivity", "telemetry", "modes"] as const,
    connectivityCaCert: ["connectivity", "ca-certificate"] as const,
    connectivityDeviceCert: (deviceId: string) =>
        ["connectivity", "devices", deviceId, "certificate"] as const,
    connectivityDeviceMode: (deviceId: string) =>
        ["connectivity", "devices", deviceId, "telemetry-mode"] as const,
    integrationKeys: ["integration", "keys"] as const,
    flightBriefing: (flightId: string, locale?: string) =>
        locale
            ? (["intelligence", "briefing", flightId, locale] as const)
            : (["intelligence", "briefing", flightId] as const),
    foresightPredict: (horizon: number, step: number) =>
        ["intelligence", "foresight", "predict", horizon, step] as const,
};
