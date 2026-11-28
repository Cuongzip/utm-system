"use client";

import { useState, useCallback, useMemo, useEffect, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SelectOption } from "@/components/ui";
import { hubService } from "@/services/hubService";
import { QUERY_KEYS, useCurrentUser, useDronesAll, useFlightsAll, useHubsAll } from "@/hooks";
import { createStatusOptions, hasAnyRole, compareCreatedDesc } from "@/utils";
import {
    ACTIVE_FLIGHT_STATUSES,
    HUB_AIRSPACE_DEFAULTS,
    HUB_STATUS,
    HUB_STATUSES,
    type CreateHubPayload,
    type Hub,
    type HubOperationalMetrics,
    type HubStatus,
    type UpdateHubPayload,
} from "@/types";

const FALLBACK_CENTER = { latitude: 10.7769, longitude: 106.7009 };
const HUB_STATUS_RANK: Record<string, number> = {
    [HUB_STATUS.ACTIVE]: 0,
    [HUB_STATUS.MAINTENANCE]: 1,
    [HUB_STATUS.INACTIVE]: 2,
};

export function useHubsWorkspaceData() {
    const t = useTranslations("hubs");
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const { data: currentUser } = useCurrentUser();
    const canManageHubs = hasAnyRole(currentUser?.roles, ["admin"]);
    const canEditHubs = hasAnyRole(currentUser?.roles, ["admin", "hub_operator"]);

    const statusOptions: SelectOption[] = createStatusOptions(HUB_STATUSES);

    const {
        data: hubs = [],
        isLoading: loading,
        isError: hubsError,
        refetch: refetchHubs,
    } = useHubsAll();
    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();

    const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
    const [highlightedHubId, setHighlightedHubId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (searchQuery.trim()) {
            params.set("search", searchQuery.trim());
        } else {
            params.delete("search");
        }
        if (statusFilter && statusFilter !== "all") {
            params.set("status", statusFilter);
        } else {
            params.delete("status");
        }
        const nextQuery = params.toString();
        const nextUrl = nextQuery
            ? `${window.location.pathname}?${nextQuery}`
            : window.location.pathname;
        window.history.replaceState(null, "", nextUrl);
    }, [searchQuery, statusFilter]);

    const saveHubMutation = useMutation({
        mutationFn: async ({
            payload,
            id,
        }: {
            payload: CreateHubPayload | UpdateHubPayload;
            id?: string;
        }) => {
            if (id) {
                return hubService.updateHub(id, payload as UpdateHubPayload);
            }
            return hubService.createHub(payload as CreateHubPayload);
        },
        onSuccess: (saved, variables) => {
            toast.success(variables.id ? t("updatedToast") : t("createdToast"));
            if (saved?.id) {
                setHighlightedHubId(saved.id);
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
        },
        meta: { defaultErrorMessage: t("saveError") },
    });

    const changeStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: HubStatus }) =>
            hubService.updateHub(id, { status }),
        onSuccess: (_data, variables) => {
            const label =
                variables.status === HUB_STATUS.MAINTENANCE
                    ? t("maintenanceToast")
                    : t("activatedToast");
            toast.success(label);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
        },
        meta: { defaultErrorMessage: t("statusError") },
    });

    const deactivateHubMutation = useMutation({
        mutationFn: (id: string) => hubService.deleteHub(id),
        onSuccess: () => {
            toast.success(t("deactivatedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
        },
        meta: { defaultErrorMessage: t("deactivateError") },
    });

    const hubMetricsMap = useMemo(() => {
        const map: Record<string, HubOperationalMetrics> = {};
        const ensure = (hubId: string) => {
            if (!map[hubId]) {
                map[hubId] = { activeFlights: 0, stationedDrones: 0 };
            }
            return map[hubId];
        };

        const activeStatuses = new Set<string>(ACTIVE_FLIGHT_STATUSES);
        for (const flight of flights) {
            if (!flight.status || !activeStatuses.has(flight.status.toLowerCase())) continue;
            const touchedHubIds = new Set<string>();
            if (flight.departureHubId) touchedHubIds.add(flight.departureHubId);
            if (flight.arrivalHubId) touchedHubIds.add(flight.arrivalHubId);
            touchedHubIds.forEach((hubId) => {
                ensure(hubId).activeFlights += 1;
            });
        }

        for (const drone of drones) {
            const hubId = drone.currentHubId || drone.homeHubId;
            if (hubId) {
                ensure(hubId).stationedDrones += 1;
            }
        }

        return map;
    }, [flights, drones]);

    const kpiSummary = useMemo(() => {
        let activeHubs = 0;
        let maintenanceHubs = 0;
        let inactiveHubs = 0;
        let totalCapacity = 0;
        let activeFlightsTotal = 0;
        let stationedDronesTotal = 0;

        for (const hub of hubs) {
            const status = (hub.status || HUB_STATUS.ACTIVE).toLowerCase();
            if (status === HUB_STATUS.ACTIVE) activeHubs += 1;
            else if (status === HUB_STATUS.MAINTENANCE) maintenanceHubs += 1;
            else if (status === HUB_STATUS.INACTIVE) inactiveHubs += 1;

            if (status === HUB_STATUS.ACTIVE) {
                totalCapacity +=
                    hub.maxSimultaneousDrones ?? HUB_AIRSPACE_DEFAULTS.maxSimultaneousDrones;
            }

            const metrics = hubMetricsMap[hub.id];
            if (metrics) {
                activeFlightsTotal += metrics.activeFlights;
                stationedDronesTotal += metrics.stationedDrones;
            }
        }

        return {
            activeHubs,
            maintenanceHubs,
            inactiveHubs,
            totalCapacity,
            activeFlightsTotal,
            stationedDronesTotal,
        };
    }, [hubs, hubMetricsMap]);

    const defaultCenter = useMemo(() => {
        const valid = hubs.filter(
            (h) =>
                typeof h.location?.latitude === "number" &&
                typeof h.location?.longitude === "number"
        );
        if (valid.length === 0) return FALLBACK_CENTER;
        const sumLat = valid.reduce((acc, h) => acc + (h.location?.latitude ?? 0), 0);
        const sumLng = valid.reduce((acc, h) => acc + (h.location?.longitude ?? 0), 0);
        return {
            latitude: Number((sumLat / valid.length).toFixed(6)),
            longitude: Number((sumLng / valid.length).toFixed(6)),
        };
    }, [hubs]);

    const filteredHubs = useMemo(() => {
        const query = deferredSearchQuery.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return [...hubs]
            .filter((h) => {
                const matchesSearch =
                    !query ||
                    (h.name || "").toLowerCase().includes(query) ||
                    (h.code || "").toLowerCase().includes(query);

                const matchesStatus = status === "all" || (h.status || "").toLowerCase() === status;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const rankA = HUB_STATUS_RANK[(a.status || HUB_STATUS.ACTIVE).toLowerCase()] ?? 1;
                const rankB = HUB_STATUS_RANK[(b.status || HUB_STATUS.ACTIVE).toLowerCase()] ?? 1;
                if (rankA !== rankB) return rankA - rankB;
                return compareCreatedDesc(a, b);
            });
    }, [hubs, deferredSearchQuery, statusFilter]);

    const hasActiveFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const handleClearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const handleChangeStatus = useCallback(
        (hub: Hub, status: HubStatus) => {
            changeStatusMutation.mutate({ id: hub.id, status });
        },
        [changeStatusMutation]
    );

    const handleDeactivateHub = useCallback(
        (id: string) => {
            deactivateHubMutation.mutate(id);
        },
        [deactivateHubMutation]
    );

    return {
        hubs,
        filteredHubs,
        loading,
        hubsError,
        refetchHubs,
        canManageHubs,
        canEditHubs,
        statusOptions,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        hasActiveFilters,
        handleClearFilters,
        highlightedHubId,
        setHighlightedHubId,
        hubMetricsMap,
        kpiSummary,
        defaultCenter,
        saveHubMutation,
        handleChangeStatus,
        handleDeactivateHub,
    };
}
