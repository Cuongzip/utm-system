"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useAppLocale, type AppLocale } from "@/i18n";
import { ApiError } from "@/services/apiClient";
import { connectivityService } from "@/services/connectivityService";
import { fleetService } from "@/services/fleetService";
import { intelligenceService } from "@/services/intelligenceService";
import { weatherAisService } from "@/services/weatherAisService";
import type { Hub } from "@/types";
import { QUERY_KEYS } from "../useQueryKeys";

export function useFleetOverview(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetOverview,
        queryFn: () => fleetService.getOverview(),
        refetchInterval: 10000,
        enabled,
    });
}

export function useFleetHubDrones(hubId?: string | null) {
    return useQuery({
        queryKey: QUERY_KEYS.fleetHubDrones(hubId ?? ""),
        queryFn: () => fleetService.getDronesAtHub(hubId!),
        enabled: Boolean(hubId),
        staleTime: 1000 * 15,
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

export function useConnectivityStatus(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityStatus,
        queryFn: () => connectivityService.getStatus(),
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

export function useDeviceCertificate(deviceId: string, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityDeviceCert(deviceId),
        queryFn: async () => {
            try {
                return await connectivityService.getDeviceCertificate(deviceId);
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    return null;
                }
                throw err;
            }
        },
        enabled: Boolean(deviceId) && enabled,
        retry: false,
    });
}

export function useDeviceTelemetryMode(deviceId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.connectivityDeviceMode(deviceId ?? ""),
        queryFn: () => connectivityService.getDeviceTelemetryMode(deviceId!),
        enabled: Boolean(deviceId) && enabled,
        staleTime: 1000 * 10,
        retry: false,
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
        queryKey: QUERY_KEYS.weatherHubCurrent(hubId ?? "", locale),
        queryFn: () => weatherAisService.getHubCurrentWeather(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

export function useHubWeatherForecast(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubForecast(hubId ?? "", locale),
        queryFn: () => weatherAisService.getHubForecast(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useHubWeatherAlerts(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubAlerts(hubId ?? "", locale),
        queryFn: () => weatherAisService.getHubAlerts(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 60 * 2,
    });
}

export function useHubWeatherGoNoGo(hubId?: string | null, enabled = true) {
    const locale = useAppLocale();
    return useQuery({
        queryKey: QUERY_KEYS.weatherHubGoNoGo(hubId ?? "", locale),
        queryFn: () => weatherAisService.getHubGoNoGo(hubId!),
        enabled: Boolean(hubId) && enabled,
        staleTime: 1000 * 120,
        retry: false,
    });
}

export function useHubsWeatherGoNoGo(hubs: Hub[], locale: AppLocale) {
    return useQueries({
        queries: hubs.map((hub) => ({
            queryKey: QUERY_KEYS.weatherHubGoNoGo(hub.id, locale),
            queryFn: () => weatherAisService.getHubGoNoGo(hub.id),
            staleTime: 1000 * 60 * 2,
            retry: false,
        })),
    });
}

export function useForesightPrediction(horizonSec: number, stepSec = 10, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.foresightPredict(horizonSec, stepSec),
        queryFn: () => intelligenceService.predictForesight(horizonSec, stepSec),
        enabled,
        staleTime: 1000 * 10,
    });
}
