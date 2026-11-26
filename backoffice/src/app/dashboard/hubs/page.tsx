"use client";

import { Suspense, useState, useCallback, useMemo, useEffect, useDeferredValue } from "react";
import { useSearchParams } from "next/navigation";
import { Columns2, Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChamferButton,
    ErrorState,
    PageHeader,
    TableFilterBar,
    type SelectOption,
} from "@/components/ui";
import { HubsKpiStrip, HubsTable, HubEditorPanel, HubsMap } from "@/components/hubs";
import { hubService } from "@/services/hubService";
import { QUERY_KEYS, useCurrentUser, useDronesAll, useFlightsAll } from "@/hooks";
import { createStatusOptions, hasAnyRole, compareCreatedDesc } from "@/utils";
import {
    ACTIVE_FLIGHT_STATUSES,
    HUB_AIRSPACE_DEFAULTS,
    HUB_STATUS,
    HUB_STATUSES,
    type CreateHubPayload,
    type Hub,
    type HubDraftPreview,
    type HubOperationalMetrics,
    type HubStatus,
    type UpdateHubPayload,
} from "@/types";
import { cn } from "@/lib";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(HUB_STATUSES);
const FALLBACK_CENTER = { latitude: 10.7769, longitude: 106.7009 };

type HubsViewMode = "split" | "table";

function HubsWorkspace() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const { data: currentUser } = useCurrentUser();
    const canManageHubs = hasAnyRole(currentUser?.roles, ["admin"]);
    const canEditHubs = hasAnyRole(currentUser?.roles, ["admin", "hub_operator"]);

    const {
        data: hubs = [],
        isLoading: loading,
        isError: hubsError,
        refetch: refetchHubs,
    } = useQuery({
        queryKey: QUERY_KEYS.hubs,
        queryFn: async () => {
            const res = await hubService.getHubs({ limit: 0 });
            return res.items ?? [];
        },
    });
    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();

    const [viewMode, setViewMode] = useState<HubsViewMode>("split");
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
    const [highlightedHubId, setHighlightedHubId] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingHub, setEditingHub] = useState<Hub | null>(null);
    const [pickedCoords, setPickedCoords] = useState<{
        latitude: number;
        longitude: number;
        seq: number;
    } | null>(null);
    const [draftPreview, setDraftPreview] = useState<HubDraftPreview | null>(null);

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
            toast.success(
                variables.id
                    ? "Vertiport hub updated successfully"
                    : "Vertiport hub created successfully"
            );
            if (saved?.id) {
                setHighlightedHubId(saved.id);
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
        },
        meta: { defaultErrorMessage: "Failed to save hub" },
    });

    const changeStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: HubStatus }) =>
            hubService.updateHub(id, { status }),
        onSuccess: (_data, variables) => {
            const label =
                variables.status === HUB_STATUS.MAINTENANCE
                    ? "Hub placed into maintenance"
                    : "Hub activated successfully";
            toast.success(label);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
        },
        meta: { defaultErrorMessage: "Failed to update hub status" },
    });

    const deactivateHubMutation = useMutation({
        mutationFn: (id: string) => hubService.deleteHub(id),
        onSuccess: () => {
            toast.success("Vertiport hub deactivated successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
        },
        meta: { defaultErrorMessage: "Failed to deactivate hub" },
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
            .sort(compareCreatedDesc);
    }, [hubs, deferredSearchQuery, statusFilter]);

    const hasActiveFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const handleClearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const handleSelectHub = useCallback((hub: Hub | null) => {
        setHighlightedHubId(hub?.id ?? null);
    }, []);

    const handleFocusOnMap = useCallback((hub: Hub) => {
        setHighlightedHubId(hub.id);
        setViewMode("split");
    }, []);

    const openCreateEditor = useCallback(() => {
        setHighlightedHubId(null);
        setEditingHub(null);
        setIsEditorOpen(true);
        setViewMode("split");
    }, []);

    const openEditEditor = useCallback((hub: Hub) => {
        setEditingHub(hub);
        setHighlightedHubId(hub.id);
        setIsEditorOpen(true);
        setViewMode("split");
    }, []);

    const closeEditor = useCallback(() => {
        setIsEditorOpen(false);
        setEditingHub(null);
        setDraftPreview(null);
    }, []);

    const handleMapPick = useCallback((coords: { latitude: number; longitude: number }) => {
        setPickedCoords((prev) => ({
            latitude: coords.latitude,
            longitude: coords.longitude,
            seq: (prev?.seq ?? 0) + 1,
        }));
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

    const isCreatingNewHub = isEditorOpen && !editingHub;
    const isSplitDesktop = viewMode === "split" || isEditorOpen;

    return (
        <div
            className={cn(
                "px-4 py-4 sm:px-6 sm:py-5 xl:px-8 xl:py-6 flex flex-col gap-4 w-full",
                isSplitDesktop ? "flex-1 min-h-0 lg:overflow-hidden" : "min-h-full"
            )}
        >
            <PageHeader title="HUBS">
                <div
                    role="group"
                    aria-label="Workspace layout"
                    className="inline-flex items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] p-0.5"
                >
                    <button
                        type="button"
                        aria-pressed={viewMode === "split"}
                        onClick={() => setViewMode("split")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            viewMode === "split"
                                ? "bg-slate-800 text-white"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Split</span>
                    </button>
                    <button
                        type="button"
                        aria-pressed={viewMode === "table"}
                        onClick={() => {
                            if (isEditorOpen) closeEditor();
                            setViewMode("table");
                        }}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            viewMode === "table"
                                ? "bg-slate-800 text-white"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Table</span>
                    </button>
                </div>

                {canManageHubs && !isCreatingNewHub && (
                    <ChamferButton variant="dark" size="sm" onClick={openCreateEditor}>
                        <Plus className="w-4 h-4 text-white" aria-hidden="true" />
                        <span>Add Hub</span>
                    </ChamferButton>
                )}
            </PageHeader>

            {hubsError && hubs.length === 0 ? (
                <ErrorState
                    title="Unable to load hubs"
                    description="The Hub Service did not respond. Please try again."
                    onRetry={() => refetchHubs()}
                />
            ) : (
                <>
                    <HubsKpiStrip
                        totalHubs={hubs.length}
                        activeHubs={kpiSummary.activeHubs}
                        maintenanceHubs={kpiSummary.maintenanceHubs}
                        inactiveHubs={kpiSummary.inactiveHubs}
                        activeFlightsTotal={kpiSummary.activeFlightsTotal}
                        totalCapacity={kpiSummary.totalCapacity}
                        stationedDronesTotal={kpiSummary.stationedDronesTotal}
                        statusFilter={isEditorOpen ? "all" : statusFilter}
                        onFilterByStatus={setStatusFilter}
                        isLoading={loading}
                    />

                    {!isEditorOpen && (
                        <TableFilterBar
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder="Search by hub code or name…"
                            statusFilter={statusFilter}
                            onStatusFilterChange={setStatusFilter}
                            statusOptions={STATUS_OPTIONS}
                            onClearFilters={handleClearFilters}
                            totalCount={hubs.length}
                            filteredCount={filteredHubs.length}
                        />
                    )}

                    {viewMode === "table" && !isEditorOpen ? (
                        <div className="w-full">
                            <HubsTable
                                hubs={filteredHubs}
                                totalHubsCount={hubs.length}
                                loading={loading}
                                selectedHubId={highlightedHubId}
                                hubMetricsMap={hubMetricsMap}
                                canManageHubs={canManageHubs}
                                canEditHubs={canEditHubs}
                                hasActiveFilters={hasActiveFilters}
                                compact={false}
                                onClearFilters={handleClearFilters}
                                onAddHub={canManageHubs ? openCreateEditor : undefined}
                                onSelectHub={handleSelectHub}
                                onFocusOnMap={handleFocusOnMap}
                                onEditHub={openEditEditor}
                                onChangeStatus={handleChangeStatus}
                                onDeactivateHub={handleDeactivateHub}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full flex-1 min-h-0">
                            <div
                                className={cn(
                                    "flex flex-col min-h-[420px] lg:min-h-0 lg:h-full",
                                    isEditorOpen ? "lg:col-span-5" : "lg:col-span-7"
                                )}
                            >
                                {isEditorOpen ? (
                                    <HubEditorPanel
                                        hubToEdit={editingHub}
                                        defaultCenter={defaultCenter}
                                        pickedCoords={pickedCoords}
                                        onDraftChange={setDraftPreview}
                                        onClose={closeEditor}
                                        onSubmit={(payload, id) =>
                                            saveHubMutation.mutateAsync({ payload, id })
                                        }
                                    />
                                ) : (
                                    <HubsTable
                                        hubs={filteredHubs}
                                        totalHubsCount={hubs.length}
                                        loading={loading}
                                        selectedHubId={highlightedHubId}
                                        hubMetricsMap={hubMetricsMap}
                                        canManageHubs={canManageHubs}
                                        canEditHubs={canEditHubs}
                                        hasActiveFilters={hasActiveFilters}
                                        compact
                                        onClearFilters={handleClearFilters}
                                        onAddHub={canManageHubs ? openCreateEditor : undefined}
                                        onSelectHub={handleSelectHub}
                                        onFocusOnMap={handleFocusOnMap}
                                        onEditHub={openEditEditor}
                                        onChangeStatus={handleChangeStatus}
                                        onDeactivateHub={handleDeactivateHub}
                                    />
                                )}
                            </div>

                            <div
                                className={cn(
                                    "flex flex-col min-h-[440px] lg:min-h-0 lg:h-full",
                                    isEditorOpen ? "lg:col-span-7" : "lg:col-span-5"
                                )}
                            >
                                <HubsMap
                                    hubs={filteredHubs}
                                    selectedHubId={highlightedHubId}
                                    hubMetricsMap={hubMetricsMap}
                                    onSelectHub={handleSelectHub}
                                    onEditHub={canEditHubs ? openEditEditor : undefined}
                                    pickMode={isEditorOpen}
                                    onMapPick={handleMapPick}
                                    draftPreview={draftPreview}
                                    editingHubId={editingHub?.id ?? null}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function HubsPage() {
    return (
        <Suspense fallback={null}>
            <HubsWorkspace />
        </Suspense>
    );
}
