"use client";

import { useQuery } from "@tanstack/react-query";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import { flightService } from "@/services/flightService";
import { alertService } from "@/services/alertService";
import { airspaceService } from "@/services/airspaceService";
import { connectivityService } from "@/services/connectivityService";
import { emergencyService } from "@/services/emergencyService";
import type { IncidentQueryParams } from "@/types";

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
    connectivityDevices: ["connectivity", "devices"] as const,
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

export function useEmergencyProtocols(active?: boolean) {
    return useQuery({
        queryKey: [...QUERY_KEYS.emergencyProtocols, active],
        queryFn: () => emergencyService.getProtocols(active),
        staleTime: 1000 * 60,
    });
}

export function useEmergencyTrends(from?: string, to?: string, interval?: string) {
    return useQuery({
        queryKey: [...QUERY_KEYS.emergencyTrends, from, to, interval],
        queryFn: () => emergencyService.getTrends({ from, to, interval }),
        staleTime: 1000 * 60,
    });
}

export function useEmergencyResolvedHistory(limit = 10) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyIncidents({ status: "resolved", limit }),
        queryFn: () => emergencyService.getIncidents({ status: "resolved", limit }),
        staleTime: 1000 * 15,
    });
}
