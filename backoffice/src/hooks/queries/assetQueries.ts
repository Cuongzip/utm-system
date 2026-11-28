"use client";

import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { droneService } from "@/services/droneService";
import { hubService } from "@/services/hubService";
import { organizationService } from "@/services/organizationService";
import { IN_PROGRESS_COMMAND_STATUSES } from "@/types";
import { QUERY_KEYS } from "../useQueryKeys";
import { useHydratedQuery } from "./useHydratedQuery";

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

export function useDroneCommands(droneId?: string | null) {
    return useQuery({
        queryKey: QUERY_KEYS.droneCommands(droneId ?? ""),
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

export function useFlightCommands(flightId?: string | null, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.flightCommands(flightId ?? ""),
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

export function useCurrentUser() {
    return useHydratedQuery({
        queryKey: QUERY_KEYS.authUser,
        queryFn: () => authService.getCurrentUser(),
        staleTime: 1000 * 60 * 5,
    });
}
