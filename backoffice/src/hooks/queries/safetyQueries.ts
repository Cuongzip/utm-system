"use client";

import { useQuery } from "@tanstack/react-query";
import { alertService } from "@/services/alertService";
import { conflictService } from "@/services/conflictService";
import { emergencyService } from "@/services/emergencyService";
import type {
    ConflictQueryParams,
    EmergencyStatsQueryParams,
    EmergencyTrendsQueryParams,
    IncidentQueryParams,
} from "@/types";
import { QUERY_KEYS } from "../useQueryKeys";
import { useHydratedQuery } from "./useHydratedQuery";

export function useActiveAlerts() {
    return useHydratedQuery({
        queryKey: QUERY_KEYS.alertsActive,
        queryFn: () => alertService.getActiveAlerts(),
        refetchInterval: 5000,
    });
}

export function useConflictsActive() {
    return useHydratedQuery({
        queryKey: QUERY_KEYS.conflictsActive,
        queryFn: () => conflictService.getActive(),
        refetchInterval: 3000,
    });
}

export function useConflictsAll(params?: ConflictQueryParams) {
    return useQuery({
        queryKey: QUERY_KEYS.conflictsList(params),
        queryFn: () => conflictService.getAll(params),
        staleTime: 1000 * 15,
    });
}

export function useConflictAdvice(conflictId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.conflictAdvice(conflictId ?? ""),
        queryFn: () => conflictService.getAdvice(conflictId!),
        enabled: Boolean(conflictId) && enabled,
        staleTime: 1000 * 15,
        retry: false,
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
    return useHydratedQuery({
        queryKey: QUERY_KEYS.emergencyActive,
        queryFn: () => emergencyService.getActiveIncidents(),
        refetchInterval: 3000,
    });
}

export function useEmergencyPendingConfirmations(enabled = true) {
    return useHydratedQuery({
        queryKey: QUERY_KEYS.emergencyPending,
        queryFn: () => emergencyService.getPendingConfirmations(),
        enabled,
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
        queryKey: QUERY_KEYS.emergencyIncidentDetail(incidentId ?? ""),
        queryFn: () => emergencyService.getIncidentById(incidentId!),
        enabled: Boolean(incidentId) && enabled,
        staleTime: 1000 * 15,
    });
}

export function useEmergencyIncidentBlackbox(incidentId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.emergencyBlackbox(incidentId ?? ""),
        queryFn: () => emergencyService.getIncidentBlackbox(incidentId!),
        enabled: Boolean(incidentId) && enabled,
        staleTime: 1000 * 30,
    });
}
