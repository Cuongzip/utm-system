"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { hubService } from "@/services/hubService";
import type {
    AirspaceZone,
    CreateAirspaceZonePayload,
    UpdateAirspaceZonePayload,
    Hub,
} from "@/types";

export default function AirspacePage() {
    const [zones, setZones] = useState<AirspaceZone[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);
    const [selectedZone, setSelectedZone] = useState<AirspaceZone | null>(null);
    const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [zonesRes, hubsRes] = await Promise.all([
                airspaceService.getZones({ limit: 0 }),
                hubService.getHubs({ limit: 0 }),
            ]);

            setZones(zonesRes.items || []);
            setHubs(hubsRes.items || []);
            setError(null);
        } catch {
            setError("Failed to fetch airspace sectors and geofence data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const hubMap = useMemo(() => {
        const map = new Map<string, string>();
        hubs.forEach((h) => {
            if (h.id) map.set(h.id, h.name || h.code || h.id);
        });
        return map;
    }, [hubs]);

    const handleSaveZone = async (
        payload: CreateAirspaceZonePayload | UpdateAirspaceZonePayload,
        id?: string
    ) => {
        try {
            if (id) {
                await airspaceService.updateZone(id, payload as UpdateAirspaceZonePayload);
                toast.success("Airspace zone updated successfully");
            } else {
                await airspaceService.createZone(payload as CreateAirspaceZonePayload);
                toast.success("Airspace zone created successfully");
            }
            await fetchData();
        } catch (err: unknown) {
            toast.error("Failed to save airspace zone");
            throw err;
        }
    };

    const handleDeleteZone = async (id: string) => {
        try {
            await airspaceService.deleteZone(id);
            if (highlightedZoneId === id) {
                setHighlightedZoneId(null);
            }
            toast.success("Airspace zone deleted successfully");
            await fetchData();
        } catch {
            toast.error("Failed to delete airspace zone");
            setError("Failed to delete airspace zone");
        }
    };

    const handleEditZone = (zone: AirspaceZone) => {
        setSelectedZone(zone);
        setIsAddModalOpen(true);
    };

    const handleSelectZone = (zone: AirspaceZone | null) => {
        setHighlightedZoneId(zone ? zone.id : null);
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="AIRSPACE & GEOFENCING">
                <OutlineButton size="sm" onClick={() => setIsBriefingOpen(true)}>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Pre-Flight Check</span>
                </OutlineButton>

                <OutlineButton size="sm" onClick={fetchData}>
                    <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => {
                        setSelectedZone(null);
                        setIsAddModalOpen(true);
                    }}
                >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Add Zone</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
                <div className="xl:col-span-7 flex flex-col gap-4">
                    <AirspaceTable
                        zones={zones}
                        loading={loading}
                        selectedZoneId={highlightedZoneId}
                        onSelectZone={handleSelectZone}
                        onEditZone={handleEditZone}
                        onDeleteZone={handleDeleteZone}
                        hubMap={hubMap}
                    />
                </div>

                <div className="xl:col-span-5 flex flex-col gap-4 h-[580px]">
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
                onClose={() => {
                    setIsAddModalOpen(false);
                    setSelectedZone(null);
                }}
                onSubmit={handleSaveZone}
            />

            <AirspaceBriefingModal
                isOpen={isBriefingOpen}
                onClose={() => setIsBriefingOpen(false)}
            />
        </div>
    );
}
