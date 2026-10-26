"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, RotateCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, OutlineButton, PageHeader, AlertBanner } from "@/components/ui";
import {
    AirspaceTable,
    AirspaceMap,
    AddAirspaceModal,
    AirspaceBriefingModal,
} from "@/components/airspace";
import { airspaceService } from "@/services/airspaceService";
import { useCrudList, useHubsAll, QUERY_KEYS } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { AirspaceZone, CreateAirspaceZonePayload, UpdateAirspaceZonePayload } from "@/types";

export default function AirspacePage() {
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
        isModalOpen: isAddModalOpen,
        itemToEdit: selectedZone,
        openCreateModal,
        openEditModal,
        closeModal,
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

    const saveZoneMutation = useMutation({
        mutationFn: async ({
            payload,
            id,
        }: {
            payload: CreateAirspaceZonePayload | UpdateAirspaceZonePayload;
            id?: string;
        }) => {
            if (id) {
                return airspaceService.updateZone(id, payload as UpdateAirspaceZonePayload);
            }
            return airspaceService.createZone(payload as CreateAirspaceZonePayload);
        },
        onSuccess: (_data, variables) => {
            toast.success(
                variables.id
                    ? "Airspace zone updated successfully"
                    : "Airspace zone created successfully"
            );
            refreshZones();
        },
        meta: { defaultErrorMessage: "Failed to save airspace zone" },
    });

    const handleSaveZone = async (
        payload: CreateAirspaceZonePayload | UpdateAirspaceZonePayload,
        id?: string
    ) => {
        await saveZoneMutation.mutateAsync({ payload, id });
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

                <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
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
                    onEditZone={openEditModal}
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

            <AddAirspaceModal
                isOpen={isAddModalOpen}
                zoneToEdit={selectedZone}
                hubs={hubs}
                onClose={closeModal}
                onSubmit={handleSaveZone}
            />

            <AirspaceBriefingModal
                isOpen={isBriefingOpen}
                onClose={() => setIsBriefingOpen(false)}
            />
        </div>
    );
}
