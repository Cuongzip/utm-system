"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCw, ShieldCheck } from "lucide-react";
import { ChamferButton, OutlineButton, PageHeader, AlertBanner } from "@/components/ui";
import { AirspaceTable, AirspaceMap, AirspaceBriefingModal } from "@/components/airspace";
import { airspaceService } from "@/services/airspaceService";
import { useCrudList, useHubsAll, QUERY_KEYS } from "@/hooks";
import type { AirspaceZone } from "@/types";

export default function AirspacePage() {
    const router = useRouter();
    const { data: hubs = [], refetch: fetchHubs } = useHubsAll();
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);

    const fetchZones = useCallback(() => airspaceService.getZones({ limit: 0 }), []);
    const deleteZone = useCallback((id: string) => airspaceService.deleteZone(id), []);

    const {
        items: zones,
        loading,
        error,
        setError,
        refresh: refreshZones,
        highlightedId: highlightedZoneId,
        handleSelect: handleSelectZone,
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

    const hubMap = useMemo(() => {
        const map = new Map<string, string>();
        hubs.forEach((h) => {
            if (h.id) map.set(h.id, h.name || h.code || h.id);
        });
        return map;
    }, [hubs]);

    const handleCreateZone = () => {
        router.push("/dashboard/airspace/new");
    };

    const handleEditZone = (zone: AirspaceZone) => {
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

                <ChamferButton variant="dark" size="sm" onClick={handleCreateZone}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Add Zone</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col gap-6 w-full">
                <AirspaceTable
                    zones={zones}
                    loading={loading}
                    selectedZoneId={highlightedZoneId}
                    onSelectZone={handleSelectZone}
                    onEditZone={handleEditZone}
                    onDeleteZone={handleDeleteZone}
                    hubMap={hubMap}
                />

                <div className="w-full h-[560px]">
                    <AirspaceMap
                        zones={zones}
                        selectedZoneId={highlightedZoneId}
                        onSelectZone={handleSelectZone}
                        hubMap={hubMap}
                    />
                </div>
            </div>

            <AirspaceBriefingModal
                isOpen={isBriefingOpen}
                onClose={() => setIsBriefingOpen(false)}
            />
        </div>
    );
}
