"use client";

import { useQuery } from "@tanstack/react-query";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import { flightService } from "@/services/flightService";
import { alertService } from "@/services/alertService";
import { airspaceService } from "@/services/airspaceService";
import { connectivityService } from "@/services/connectivityService";
import { emergencyService } from "@/services/emergencyService";
import { conflictService } from "@/services/conflictService";
import { apiClient } from "@/services/apiClient";
import {
    INCIDENT_STATUS,
    type IncidentQueryParams,
    type ConflictQueryParams,
    type AuthenticatedUser,
} from "@/types";

export const QUERY_KEYS = {
    hubs: ["hubs"] as const,
    hubsAll: ["hubs", "all"] as const,
    drones: ["drones"] as const,
    dronesAll: ["drones", "all"] as const,
    droneCommands: (droneId: string) => ["drones", droneId, "commands"] as const,
    flights: ["flights"] as const,
    flightsAll: ["flights", "all"] as const,
    airspace: ["airspace"] as const,
    missions: ["missions"] as const,
    connectivity: ["connectivity"] as const,
    connectivityDevices: ["connectivity", "devices"] as const,
    connectivityOnline: ["connectivity", "online"] as const,
    alertsActive: ["alerts", "active"] as const,
    simulation: ["simulation"] as const,
    simulationDetail: (id: string) => ["simulation", "detail", id] as const,
    simulationScenarios: ["simulation", "scenarios"] as const,
    simulationEvents: (id: string) => ["simulation", "events", id] as const,
    conflicts: ["conflicts"] as const,
    conflictsActive: ["conflicts", "active"] as const,
    emergencyStats: ["emergency", "stats"] as const,
    emergencyTrends: ["emergency", "trends"] as const,
    emergencyActive: ["emergency", "active"] as const,
    emergencyPending: ["emergency", "pending"] as const,
    emergencyConfig: ["emergency", "config"] as const,
    emergencyProtocols: ["emergency", "protocols"] as const,
    authUser: ["auth", "user"] as const,
    emergencyIncidents: (params?: IncidentQueryParams) =>
        params
            ? (["emergency", "incidents", params] as const)
            : (["emergency", "incidents"] as const),
};

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

export function useFlightsAll() {
    return useQuery({
        queryKey: QUERY_KEYS.flightsAll,
        queryFn: () => flightService.getAll(),
        staleTime: 1000 * 15,
    });
}

export function useActiveAlerts() {
    return useQuery({
        queryKey: QUERY_KEYS.alertsActive,
        queryFn: () => alertService.getActiveAlerts(),
        refetchInterval: 5000,
    });
}

export function useDroneCommands(droneId?: string | null) {
    return useQuery({
        queryKey: QUERY_KEYS.droneCommands(droneId || ""),
        queryFn: () => droneService.getCommands(droneId!, { limit: 10 }),
        enabled: Boolean(droneId),
        refetchInterval: 3000,
    });
}

export function useAirspaceAll() {
    return useQuery({
        queryKey: QUERY_KEYS.airspace,
        queryFn: async () => {
            const res = await airspaceService.getZones({ limit: 0 });
            return res.items || [];
        },
        staleTime: 1000 * 60,
    });
}

export function useConnectivityDevices() {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityDevices,
        queryFn: async () => {
            const res = await connectivityService.getDevices({ limit: 0 });
            return res.items || [];
        },
        refetchInterval: 3000,
    });
}

export function useConnectivityOnlineDevices() {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityOnline,
        queryFn: async () => {
            const res = await connectivityService.getOnlineDevices();
            return res || [];
        },
        refetchInterval: 10000,
    });
}

export function useEmergencyStats(from?: string, to?: string) {
    return useQuery({
        queryKey: [...QUERY_KEYS.emergencyStats, from, to],
        queryFn: () => emergencyService.getStats(from && to ? { from, to } : undefined),
        refetchInterval: 5000,
    });
}

export function useEmergencyActiveIncidents() {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyActive,
        queryFn: () => emergencyService.getActiveIncidents(),
        refetchInterval: 3000,
    });
}

export function useEmergencyConfig() {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyConfig,
        queryFn: () => emergencyService.getConfig(),
        staleTime: 1000 * 30,
    });
}

export function useEmergencyProtocols(active?: boolean, enabled = true) {
    return useQuery({
        queryKey: [...QUERY_KEYS.emergencyProtocols, active],
        queryFn: () => emergencyService.getProtocols(active),
        staleTime: 1000 * 60,
        enabled,
    });
}

export function useEmergencyTrends(from?: string, to?: string, interval?: string, enabled = true) {
    return useQuery({
        queryKey: [...QUERY_KEYS.emergencyTrends, from, to, interval],
        queryFn: () => emergencyService.getTrends({ from, to, interval }),
        staleTime: 1000 * 60,
        enabled,
    });
}

export function useEmergencyResolvedHistory(limit = 10, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyIncidents({ status: INCIDENT_STATUS.RESOLVED, limit }),
        queryFn: () => emergencyService.getIncidents({ status: INCIDENT_STATUS.RESOLVED, limit }),
        staleTime: 1000 * 15,
        enabled,
    });
}

export function useConflictsActive() {
    return useQuery({
        queryKey: QUERY_KEYS.conflictsActive,
        queryFn: () => conflictService.getActive(),
        refetchInterval: 3000,
    });
}

export function useConflictsAll(params?: ConflictQueryParams) {
    return useQuery({
        queryKey: params ? [...QUERY_KEYS.conflicts, params] : QUERY_KEYS.conflicts,
        queryFn: () => conflictService.getAll(params),
        staleTime: 1000 * 15,
    });
}

export function useCurrentUser() {
    return useQuery({
        queryKey: QUERY_KEYS.authUser,
        queryFn: () => apiClient<AuthenticatedUser>("/authentication/user"),
        staleTime: 1000 * 60 * 5,
    });
}
