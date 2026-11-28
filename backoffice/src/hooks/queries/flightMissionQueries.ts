"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppLocale } from "@/i18n";
import { airspaceService } from "@/services/airspaceService";
import { flightService } from "@/services/flightService";
import { intelligenceService } from "@/services/intelligenceService";
import { missionService } from "@/services/missionService";
import { simulationService } from "@/services/simulationService";
import { FLIGHT_STATUS, SIMULATION_STATUS } from "@/types";
import { QUERY_KEYS } from "../useQueryKeys";

export function useFlightsAll(refetchIntervalMs?: number | false) {
    return useQuery({
        queryKey: QUERY_KEYS.flightsAll,
        queryFn: () => flightService.getAll(),
        staleTime: refetchIntervalMs ? 0 : 1000 * 15,
        refetchInterval: refetchIntervalMs,
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

export function useFlightFeasibility(flightId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.flightFeasibility(flightId ?? "", locale),
        queryFn: () => flightService.checkFeasibility(flightId!),
        enabled: Boolean(flightId) && enabled,
        staleTime: 1000 * 30,
        retry: false,
    });
}

export function useFlightConformance(flightId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.flightConformance(flightId ?? ""),
        queryFn: () => flightService.getConformance(flightId!),
        enabled: Boolean(flightId) && enabled,
        refetchInterval: enabled ? 5000 : false,
        retry: false,
    });
}

export function useFlightBriefing(flightId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.flightBriefing(flightId ?? "", locale),
        queryFn: () => intelligenceService.getFlightBriefing(flightId!),
        enabled: Boolean(flightId) && enabled,
        staleTime: 1000 * 30,
        retry: false,
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

export function useMissionDetail(missionId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.missionDetail(missionId),
        queryFn: () => missionService.getById(missionId),
        enabled: Boolean(missionId),
    });
}

export function useMissionExecutionPlan(
    missionId?: string | null,
    enabled = true,
    autoSplitByRange = false
) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.missionExecutionPlan(missionId ?? "", autoSplitByRange, locale),
        queryFn: () => missionService.getExecutionPlan(missionId!, autoSplitByRange),
        enabled: Boolean(missionId) && enabled,
        staleTime: 1000 * 10,
    });
}

export function useMissionExecutions(missionId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.missionExecutions(missionId ?? ""),
        queryFn: () => missionService.getExecutions(missionId!),
        enabled: Boolean(missionId) && enabled,
        staleTime: 1000 * 15,
    });
}

export function useSimulationDetail(sessionId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.simulationDetail(sessionId),
        queryFn: () => simulationService.getById(sessionId),
        enabled: Boolean(sessionId),
        refetchInterval: (query) => {
            const status = String(query.state.data?.status ?? "").toLowerCase();
            return status === SIMULATION_STATUS.RUNNING ? 2000 : false;
        },
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
