"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppLocale } from "@/i18n";
import { organizationService } from "@/services/organizationService";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import { flightService } from "@/services/flightService";
import { alertService } from "@/services/alertService";
import { airspaceService } from "@/services/airspaceService";
import { connectivityService } from "@/services/connectivityService";
import { emergencyService } from "@/services/emergencyService";
import { conflictService } from "@/services/conflictService";
import { missionService } from "@/services/missionService";
import { simulationService } from "@/services/simulationService";
import { fleetService } from "@/services/fleetService";
import { weatherAisService } from "@/services/weatherAisService";
import { intelligenceService } from "@/services/intelligenceService";
import { apiClient } from "@/services/apiClient";
import {
    FLIGHT_STATUS,
    IN_PROGRESS_COMMAND_STATUSES,
    type IncidentQueryParams,
    type EmergencyStatsQueryParams,
    type EmergencyTrendsQueryParams,
    type ConflictQueryParams,
    type AuthenticatedUser,
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
    conflictsActive: ["conflicts", "active"] as const,
    conflictAdvice: (id: string) => ["conflicts", id, "advice"] as const,
    emergencyStats: ["emergency", "stats"] as const,
    emergencyStatsRange: (params?: EmergencyStatsQueryParams) =>
        params ? (["emergency", "stats", params] as const) : (["emergency", "stats"] as const),
    emergencyTrends: ["emergency", "trends"] as const,
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
    fleetConfigs: ["fleet", "configs"] as const,
    fleetActiveConfig: ["fleet", "config", "active"] as const,
    fleetAvailable: (hubId?: string) =>
        hubId ? (["fleet", "available", hubId] as const) : (["fleet", "available"] as const),
    fleetRebalancingPending: ["fleet", "rebalancing", "pending"] as const,
    fleetRebalancingActive: ["fleet", "rebalancing", "active"] as const,
    fleetRebalancingHistory: ["fleet", "rebalancing", "history"] as const,
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
    connectivityProtocolStats: ["connectivity", "protocols", "stats"] as const,
    connectivityTelemetryModes: ["connectivity", "telemetry", "modes"] as const,
    connectivityTelemetryStats: ["connectivity", "telemetry", "stats"] as const,
    connectivityCommandStats: ["connectivity", "commands", "stats"] as const,
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
    flightAssessment: (flightId: string, locale?: string) =>
        locale
            ? (["intelligence", "assess", flightId, locale] as const)
            : (["intelligence", "assess", flightId] as const),
    foresightPredict: (horizon: number, step: number) =>
        ["intelligence", "foresight", "predict", horizon, step] as const,
};

export function useOrganizationsAll(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.organizationsAll,
        queryFn: () => organizationService.getAll(),
        staleTime: 1000 * 60 * 5,
        enabled,
    });
}

export function useHubsAll() {
    return useQuery({
        queryKey: QUERY_KEYS.hubsAll,
        queryFn: () => hubService.getAll(),
        staleTime: 1000 * 60,
    });
}

export function useDronesAll() {
    return useQuery({
        queryKey: QUERY_KEYS.dronesAll,
        queryFn: () => droneService.getAll(),
        staleTime: 1000 * 60,
    });
}

export function useFlightsAll(refetchIntervalMs?: number | false) {
    return useQuery({
        queryKey: QUERY_KEYS.flightsAll,
        queryFn: () => flightService.getAll(),
        staleTime: refetchIntervalMs ? 0 : 1000 * 15,
        refetchInterval: refetchIntervalMs,
    });
}

export function useActiveAlerts() {
    const isHydrated = useIsHydrated();
    const query = useQuery({
        queryKey: QUERY_KEYS.alertsActive,
        queryFn: () => alertService.getActiveAlerts(),
        refetchInterval: 5000,
        enabled: isHydrated,
    });
    return {
        ...query,
        data: isHydrated ? query.data : undefined,
        isLoading: !isHydrated || query.isLoading,
    };
}

export function useDroneCommands(droneId?: string | null) {
    return useQuery({
        queryKey: QUERY_KEYS.droneCommands(droneId || ""),
        queryFn: () => droneService.getCommands(droneId!, { limit: 10 }),
        enabled: Boolean(droneId),
        refetchInterval: (query) => {
            const items = query.state.data?.items ?? [];
            const hasActive = items.some(
                (cmd) =>
                    cmd.status != null &&
                    IN_PROGRESS_COMMAND_STATUSES.includes(cmd.status.toLowerCase())
            );
            return hasActive ? 1500 : 3000;
        },
    });
}

export function useAirspaceAll() {
    return useQuery({
        queryKey: QUERY_KEYS.airspace,
        queryFn: async () => {
            const res = await airspaceService.getZones({ limit: 0 });
            return res.items ?? [];
        },
        staleTime: 1000 * 60,
    });
}

export function useAirspaceDetail(zoneId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.airspaceDetail(zoneId),
        queryFn: () => airspaceService.getZoneById(zoneId),
        enabled: Boolean(zoneId),
    });
}

export function useFlightDetail(flightId: string, refetchIntervalMs?: number | false) {
    return useQuery({
        queryKey: QUERY_KEYS.flightDetail(flightId),
        queryFn: () => flightService.getById(flightId),
        enabled: Boolean(flightId),
        staleTime: refetchIntervalMs ? 0 : undefined,
        refetchInterval: (query) => {
            if (!refetchIntervalMs) return false;
            const status = query.state.data?.status;
            if (
                status === FLIGHT_STATUS.COMPLETED ||
                status === FLIGHT_STATUS.CANCELLED ||
                status === FLIGHT_STATUS.EMERGENCY_LANDING
            ) {
                return false;
            }
            return refetchIntervalMs;
        },
    });
}

export function useMissionDetail(missionId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.missionDetail(missionId),
        queryFn: () => missionService.getById(missionId),
        enabled: Boolean(missionId),
    });
}

export function useSimulationEvents(sessionId: string, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.simulationEvents(sessionId),
        queryFn: () => simulationService.getEvents(sessionId),
        enabled: Boolean(sessionId) && enabled,
        refetchInterval: enabled ? 2000 : false,
    });
}

export function useConnectivityDevices() {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityDevices,
        queryFn: async () => {
            const res = await connectivityService.getDevices({ limit: 0 });
            return res.items ?? [];
        },
        refetchInterval: 3000,
    });
}

export function useConnectivityOnlineDevices() {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityOnline,
        queryFn: async () => {
            const res = await connectivityService.getOnlineDevices();
            return res ?? [];
        },
        refetchInterval: 10000,
    });
}

export function useEmergencyStats() {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyStats,
        queryFn: () => emergencyService.getStats(),
        refetchInterval: 5000,
    });
}

export function useEmergencyStatsRange(params?: EmergencyStatsQueryParams, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyStatsRange(params),
        queryFn: () => emergencyService.getStats(params),
        staleTime: 1000 * 30,
        enabled,
    });
}

export function useEmergencyActiveIncidents() {
    const isHydrated = useIsHydrated();
    const query = useQuery({
        queryKey: QUERY_KEYS.emergencyActive,
        queryFn: () => emergencyService.getActiveIncidents(),
        refetchInterval: 3000,
        enabled: isHydrated,
    });
    return {
        ...query,
        data: isHydrated ? query.data : undefined,
        isLoading: !isHydrated || query.isLoading,
    };
}

export function useEmergencyConfig() {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyConfig,
        queryFn: () => emergencyService.getConfig(),
        staleTime: 1000 * 30,
    });
}

export function useEmergencyProtocols(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyProtocols,
        queryFn: () => emergencyService.getProtocols(),
        staleTime: 1000 * 60,
        enabled,
    });
}

export function useEmergencyTrendsRange(params?: EmergencyTrendsQueryParams, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyTrendsRange(params),
        queryFn: () => emergencyService.getTrends(params),
        staleTime: 1000 * 30,
        enabled,
    });
}

export function useEmergencyIncidents(params?: IncidentQueryParams, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyIncidents(params),
        queryFn: () => emergencyService.getIncidents(params),
        staleTime: 1000 * 15,
        enabled,
    });
}

export function useEmergencyIncidentDetail(incidentId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyIncidentDetail(incidentId || ""),
        queryFn: () => emergencyService.getIncidentById(incidentId!),
        enabled: Boolean(incidentId) && enabled,
        staleTime: 1000 * 15,
    });
}

export function useConflictsActive() {
    const isHydrated = useIsHydrated();
    const query = useQuery({
        queryKey: QUERY_KEYS.conflictsActive,
        queryFn: () => conflictService.getActive(),
        refetchInterval: 3000,
        enabled: isHydrated,
    });
    return {
        ...query,
        data: isHydrated ? query.data : undefined,
        isLoading: !isHydrated || query.isLoading,
    };
}

export function useConflictsAll(params?: ConflictQueryParams) {
    return useQuery({
        queryKey: params ? [...QUERY_KEYS.conflicts, params] : QUERY_KEYS.conflicts,
        queryFn: () => conflictService.getAll(params),
        staleTime: 1000 * 15,
    });
}

function subscribeHydration() {
    return () => {};
}

function useIsHydrated(): boolean {
    return useSyncExternalStore(
        subscribeHydration,
        () => true,
        () => false
    );
}

export function useCurrentUser() {
    const isHydrated = useIsHydrated();
    const query = useQuery({
        queryKey: QUERY_KEYS.authUser,
        queryFn: () => apiClient<AuthenticatedUser>("/authentication/user"),
        staleTime: 1000 * 60 * 5,
        enabled: isHydrated,
    });

    return {
        ...query,
        data: isHydrated ? query.data : undefined,
        isLoading: !isHydrated || query.isLoading,
    };
}

export function useMissionExecutionPlan(
    missionId?: string | null,
    enabled = true,
    autoSplitByRange = false
) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.missionExecutionPlan(missionId || "", autoSplitByRange, locale),
        queryFn: () => missionService.getExecutionPlan(missionId!, autoSplitByRange),
        enabled: Boolean(missionId) && enabled,
        staleTime: 1000 * 10,
    });
}

export function useMissionExecutions(missionId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.missionExecutions(missionId || ""),
        queryFn: () => missionService.getExecutions(missionId!),
        enabled: Boolean(missionId) && enabled,
        staleTime: 1000 * 15,
    });
}

export function useFlightFeasibility(flightId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.flightFeasibility(flightId || "", locale),
        queryFn: () => flightService.checkFeasibility(flightId!),
        enabled: Boolean(flightId) && enabled,
        staleTime: 1000 * 30,
        retry: false,
    });
}

export function useFlightConformance(flightId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.flightConformance(flightId || ""),
        queryFn: () => flightService.getConformance(flightId!),
        enabled: Boolean(flightId) && enabled,
        refetchInterval: enabled ? 5000 : false,
        retry: false,
    });
}

export function useConflictAdvice(conflictId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.conflictAdvice(conflictId || ""),
        queryFn: () => conflictService.getAdvice(conflictId!),
        enabled: Boolean(conflictId) && enabled,
        staleTime: 1000 * 15,
        retry: false,
    });
}

export function useEmergencyPendingConfirmations(enabled = true) {
    const isHydrated = useIsHydrated();
    const query = useQuery({
        queryKey: QUERY_KEYS.emergencyPending,
        queryFn: () => emergencyService.getPendingConfirmations(),
        enabled: isHydrated && enabled,
        refetchInterval: isHydrated && enabled ? 3000 : false,
    });
    return {
        ...query,
        data: isHydrated ? query.data : undefined,
        isLoading: !isHydrated || query.isLoading,
    };
}

export function useEmergencyIncidentBlackbox(incidentId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyBlackbox(incidentId || ""),
        queryFn: () => emergencyService.getIncidentBlackbox(incidentId!),
        enabled: Boolean(incidentId) && enabled,
        staleTime: 1000 * 30,
    });
}

export function useFleetOverview(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetOverview,
        queryFn: () => fleetService.getOverview(),
        refetchInterval: 10000,
        enabled,
    });
}

export function useFleetConfigs(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetConfigs,
        queryFn: () => fleetService.getAllConfigs(),
        staleTime: 1000 * 30,
        enabled,
    });
}

export function useFleetActiveConfig(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetActiveConfig,
        queryFn: () => fleetService.getActiveConfig(),
        staleTime: 1000 * 30,
        enabled,
    });
}

export function useFleetRebalancingPending(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetRebalancingPending,
        queryFn: () => fleetService.getPendingRebalancing(),
        refetchInterval: 10000,
        enabled,
    });
}

export function useFleetRebalancingActive(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetRebalancingActive,
        queryFn: () => fleetService.getActiveRebalancing(),
        refetchInterval: 10000,
        enabled,
    });
}

export function useFleetRebalancingHistory(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetRebalancingHistory,
        queryFn: () => fleetService.getRebalancingHistory(30, 0),
        staleTime: 1000 * 30,
        enabled,
    });
}

export function useWeatherMetar(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.weatherMetar,
        queryFn: () => weatherAisService.getMetar(),
        staleTime: 1000 * 60 * 2,
        refetchInterval: 1000 * 60 * 5,
        enabled,
    });
}

export function useWeatherTaf(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.weatherTaf,
        queryFn: () => weatherAisService.getTaf(),
        staleTime: 1000 * 60 * 5,
        enabled,
    });
}

export function useWeatherSigmet(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.weatherSigmet,
        queryFn: () => weatherAisService.getSigmet(),
        staleTime: 1000 * 60 * 2,
        enabled,
    });
}

export function useWeatherNotams(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.weatherNotams,
        queryFn: () => weatherAisService.getNotams(),
        staleTime: 1000 * 60 * 5,
        enabled,
    });
}

export function useAdsbAircraft(enabled = true, refetchInterval = 15000) {
    return useQuery({
        queryKey: QUERY_KEYS.weatherAdsb,
        queryFn: () => weatherAisService.getAdsbAircraft(),
        refetchInterval: enabled ? refetchInterval : false,
        enabled,
    });
}

export function useHubCurrentWeather(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubCurrent(hubId || "", locale),
        queryFn: () => weatherAisService.getHubCurrentWeather(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

export function useHubWeatherForecast(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubForecast(hubId || "", locale),
        queryFn: () => weatherAisService.getHubForecast(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useHubWeatherAlerts(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubAlerts(hubId || "", locale),
        queryFn: () => weatherAisService.getHubAlerts(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

export function useConnectivityStatus(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityStatus,
        queryFn: () => connectivityService.getStatus(),
        refetchInterval: 5000,
        enabled,
    });
}

export function useConnectivityProtocolStats(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityProtocolStats,
        queryFn: () => connectivityService.getProtocolStats(),
        refetchInterval: 5000,
        enabled,
    });
}

export function useConnectivityTelemetryModes(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityTelemetryModes,
        queryFn: () => connectivityService.getTelemetryModes(),
        staleTime: 1000 * 60 * 5,
        enabled,
    });
}

export function useConnectivityCaCertificate(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityCaCert,
        queryFn: () => connectivityService.getCaCertificate(),
        staleTime: 1000 * 60 * 10,
        enabled,
    });
}

export function useIntegrationApiKeys(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.integrationKeys,
        queryFn: () => connectivityService.listApiKeys(),
        staleTime: 1000 * 30,
        enabled,
    });
}

export function useFlightBriefing(flightId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.flightBriefing(flightId || "", locale),
        queryFn: () => intelligenceService.getFlightBriefing(flightId!),
        enabled: Boolean(flightId) && enabled,
        staleTime: 1000 * 30,
        retry: false,
    });
}

export function useFlightAssessment(flightId?: string | null, enabled = false) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.flightAssessment(flightId || "", locale),
        queryFn: () => intelligenceService.assessFlight(flightId!),
        enabled: Boolean(flightId) && enabled,
        staleTime: 1000 * 30,
        retry: false,
    });
}

export function useFlightCommands(flightId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.flightCommands(flightId || ""),
        queryFn: () => droneService.getCommandsByFlightId(flightId!),
        enabled: Boolean(flightId) && enabled,
        refetchInterval: (query) => {
            if (!enabled) return false;
            const items = query.state.data ?? [];
            const hasActive = items.some(
                (cmd) =>
                    cmd.status != null &&
                    IN_PROGRESS_COMMAND_STATUSES.includes(cmd.status.toLowerCase())
            );
            return hasActive ? 1500 : 4000;
        },
    });
}

export function useDeviceTelemetryMode(deviceId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityDeviceMode(deviceId || ""),
        queryFn: () => connectivityService.getDeviceTelemetryMode(deviceId!),
        enabled: Boolean(deviceId) && enabled,
        staleTime: 1000 * 10,
        retry: false,
    });
}

export function useHubWeatherGoNoGo(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubGoNoGo(hubId || "", locale),
        queryFn: () => weatherAisService.getHubGoNoGo(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 120,
        retry: false,
    });
}
