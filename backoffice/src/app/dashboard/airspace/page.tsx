"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw, ShieldCheck } from "lucide-react";
import {
    ChamferButton,
    PageHeader,
    TableFilterBar,
    ErrorState,
    type SelectOption,
} from "@/components/ui";
import { AirspaceTable, AirspaceBriefingModal } from "@/components/airspace";
import { airspaceService } from "@/services/airspaceService";
import { useCrudList, useHubsAll, usePermissions, QUERY_KEYS } from "@/hooks";
import { createStatusOptions } from "@/utils";
import {
    AIRSPACE_ZONE_STATUS,
    AIRSPACE_ZONE_STATUSES,
    AIRSPACE_ZONE_STATUS_LABELS,
    type AirspaceZone,
} from "@/types";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(
    AIRSPACE_ZONE_STATUSES,
    AIRSPACE_ZONE_STATUS_LABELS
);

export default function AirspacePage() {
    const router = useRouter();
    const { canCreateAirspaceZone, canDeleteAirspaceZone } = usePermissions();
    const { data: hubs = [], refetch: fetchHubs } = useHubsAll();
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);

    const fetchZones = useCallback(() => airspaceService.getZones({ limit: 0 }), []);
    const deleteZone = useCallback((id: string) => airspaceService.deleteZone(id), []);

    const {
        items: zones,
        loading,
        isError,
        refresh: refreshZones,
        highlightedId: highlightedZoneId,
        handleDelete: handleDeleteZone,
    } = useCrudList<AirspaceZone>({
        queryKey: QUERY_KEYS.airspace,
        fetchFn: fetchZones,
        deleteFn: deleteZone,
        entityName: "Airspace zone",
    });

    const handleRefreshAll = useCallback(async () => {
        await Promise.all([refreshZones(), fetchHubs()]);
    }, [refreshZones, fetchHubs]);

    const hubMap = useMemo(
        () => new Map(hubs.filter((h) => h.id).map((h) => [h.id, h.name || h.code || h.id])),
        [hubs]
    );

    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState("all");

    const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const filteredZones = useMemo(() => {
        const query = deferredSearch.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return [...zones]
            .filter((z) => {
                const hubName = (z.hubId ? hubMap.get(z.hubId) : "") || "";
                const matchesSearch =
                    !query ||
                    (z.code || "").toLowerCase().includes(query) ||
                    (z.name || "").toLowerCase().includes(query) ||
                    (z.zoneType || "").toLowerCase().includes(query) ||
                    (z.description || "").toLowerCase().includes(query) ||
                    hubName.toLowerCase().includes(query);

                const matchesStatus = status === "all" || (z.status || "").toLowerCase() === status;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const aActive = a.status === AIRSPACE_ZONE_STATUS.ACTIVE ? 0 : 1;
                const bActive = b.status === AIRSPACE_ZONE_STATUS.ACTIVE ? 0 : 1;
                if (aActive !== bActive) return aActive - bActive;
                return (a.code || a.name || "").localeCompare(b.code || b.name || "");
            });
    }, [zones, deferredSearch, statusFilter, hubMap]);

    const handleSelectZone = (zone: AirspaceZone) => {
        router.push(`/dashboard/airspace/${zone.id}`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="AIRSPACE & GEOFENCING">
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={() => setIsBriefingOpen(true)}
                >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Pre-Flight Check</span>
                </ChamferButton>

                <ChamferButton variant="outline" size="sm" clip="xs" onClick={handleRefreshAll}>
                    <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Refresh</span>
                </ChamferButton>

                {canCreateAirspaceZone && (
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        onClick={() => router.push("/dashboard/airspace/new")}
                    >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Add Zone</span>
                    </ChamferButton>
                )}
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search zone code, name, or hub..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
                onClearFilters={clearFilters}
                totalCount={zones.length}
                filteredCount={filteredZones.length}
            />

            {isError && zones.length === 0 ? (
                <ErrorState
                    title="Unable to load airspace zones"
                    description="The Airspace Service could not be reached. Please try again."
                    onRetry={handleRefreshAll}
                />
            ) : (
                <AirspaceTable
                    zones={filteredZones}
                    loading={loading}
                    canDelete={canDeleteAirspaceZone}
                    selectedZoneId={highlightedZoneId}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    onSelectZone={handleSelectZone}
                    onDeleteZone={handleDeleteZone}
                    hubMap={hubMap}
                />
            )}

            <AirspaceBriefingModal
                isOpen={isBriefingOpen}
                onClose={() => setIsBriefingOpen(false)}
            />
        </div>
    );
}
