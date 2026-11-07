"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw, ShieldCheck } from "lucide-react";
import {
    ChamferButton,
    OutlineButton,
    PageHeader,
    TableFilterBar,
    type SelectOption,
} from "@/components/ui";
import { AirspaceTable, AirspaceBriefingModal } from "@/components/airspace";
import { airspaceService } from "@/services/airspaceService";
import { useCrudList, useHubsAll, QUERY_KEYS } from "@/hooks";
import { AIRSPACE_ZONE_STATUSES, type AirspaceZone } from "@/types";

const STATUS_OPTIONS: SelectOption[] = [
    { value: "all", label: "All Statuses" },
    ...AIRSPACE_ZONE_STATUSES.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
    })),
];

export default function AirspacePage() {
    const router = useRouter();
    const { data: hubs = [], refetch: fetchHubs } = useHubsAll();
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);

    const fetchZones = useCallback(() => airspaceService.getZones({ limit: 0 }), []);
    const deleteZone = useCallback((id: string) => airspaceService.deleteZone(id), []);

    const {
        items: zones,
        loading,
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
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredZones = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return zones.filter((z) => {
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
        });
    }, [zones, searchQuery, statusFilter, hubMap]);

    const handleSelectZone = (zone: AirspaceZone) => {
        router.push(`/dashboard/airspace/${zone.id}`);
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="AIRSPACE & GEOFENCING">
                <OutlineButton size="sm" onClick={() => setIsBriefingOpen(true)}>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Pre-Flight Check</span>
                </OutlineButton>

                <OutlineButton size="sm" onClick={handleRefreshAll}>
                    <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => router.push("/dashboard/airspace/new")}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Add Zone</span>
                </ChamferButton>
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search zones..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
            />

            <AirspaceTable
                zones={filteredZones}
                loading={loading}
                selectedZoneId={highlightedZoneId}
                onSelectZone={handleSelectZone}
                onDeleteZone={handleDeleteZone}
                hubMap={hubMap}
            />

            <AirspaceBriefingModal
                isOpen={isBriefingOpen}
                onClose={() => setIsBriefingOpen(false)}
            />
        </div>
    );
}
