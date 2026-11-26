"use client";

import { Edit, MapPin } from "lucide-react";
import { TacticalMapContainer, HubsLayer, MapInspector } from "@/components/map";
import { StatusBadge } from "@/components/ui";
import { formatDistance, formatAltitude, formatCoordinates } from "@/utils";
import {
    ACTIVE_HUB_STATUS,
    HUB_AIRSPACE_DEFAULTS,
    type Hub,
    type HubDraftPreview,
    type HubOperationalMetrics,
} from "@/types";

export interface HubsMapProps {
    hubs: Hub[];
    selectedHubId: string | null;
    hubMetricsMap: Record<string, HubOperationalMetrics>;
    onSelectHub: (hub: Hub | null) => void;
    onEditHub?: (hub: Hub) => void;
    pickMode?: boolean;
    onMapPick?: (coords: { latitude: number; longitude: number }) => void;
    draftPreview?: HubDraftPreview | null;
    editingHubId?: string | null;
}

export function HubsMap({
    hubs = [],
    selectedHubId,
    hubMetricsMap,
    onSelectHub,
    onEditHub,
    pickMode = false,
    onMapPick,
    draftPreview = null,
    editingHubId = null,
}: HubsMapProps) {
    const selectedHub = hubs.find((h) => h.id === selectedHubId);
    const selectedMetrics = selectedHub
        ? (hubMetricsMap[selectedHub.id] ?? { activeFlights: 0, stationedDrones: 0 })
        : { activeFlights: 0, stationedDrones: 0 };
    const showInspector = Boolean(selectedHub && !draftPreview);

    const selectedFloor = selectedHub?.airspaceFloor ?? HUB_AIRSPACE_DEFAULTS.airspaceFloor;
    const selectedCeiling = selectedHub?.airspaceCeiling ?? HUB_AIRSPACE_DEFAULTS.airspaceCeiling;
    const selectedCapacity =
        selectedHub?.maxSimultaneousDrones ?? HUB_AIRSPACE_DEFAULTS.maxSimultaneousDrones;

    return (
        <TacticalMapContainer
            onEntityClick={(entityId) => {
                if (pickMode) return;
                const found = hubs.find((h) => h.id === entityId);
                if (found) {
                    onSelectHub(found);
                }
            }}
            onMapClick={onMapPick}
            pickMode={pickMode}
            overlay={
                <>
                    {!showInspector && (
                        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-900/90 text-slate-100 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono shadow-md pointer-events-none">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                                <span>HUB ACTIVE</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>MAINT</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <span>INACTIVE</span>
                            </span>
                        </div>
                    )}

                    {pickMode && (
                        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 text-slate-100 border border-slate-700/80 backdrop-blur-md text-[11px] font-mono shadow-lg pointer-events-none whitespace-nowrap">
                            <MapPin
                                className="w-3.5 h-3.5 text-slate-300 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Click map to place Vertiport coordinates</span>
                        </div>
                    )}
                </>
            }
            inspector={
                showInspector && selectedHub ? (
                    <MapInspector
                        code={selectedHub.code}
                        title={selectedHub.name}
                        badge={
                            <StatusBadge
                                status={selectedHub.status ?? ACTIVE_HUB_STATUS}
                                tone="dark"
                            />
                        }
                        metaItems={[
                            {
                                label: "Location",
                                value: formatCoordinates(selectedHub.location),
                                subValue: `${formatAltitude(selectedHub.altitudeMsl)} MSL`,
                            },
                            {
                                label: "Airspace",
                                value: formatDistance(selectedHub.airspaceRadius),
                                subValue: `${selectedFloor}–${selectedCeiling} m`,
                            },
                            {
                                label: "Capacity",
                                value: `${selectedMetrics.activeFlights}/${selectedCapacity} active`,
                                subValue: `${selectedMetrics.stationedDrones} ${selectedMetrics.stationedDrones === 1 ? "drone" : "drones"}`,
                            },
                        ]}
                        actions={
                            onEditHub ? (
                                <button
                                    type="button"
                                    onClick={() => onEditHub(selectedHub)}
                                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
                                >
                                    <Edit className="w-3 h-3" aria-hidden="true" />
                                    <span>Edit</span>
                                </button>
                            ) : undefined
                        }
                        onClose={() => onSelectHub(null)}
                    />
                ) : null
            }
        >
            <HubsLayer
                hubs={hubs}
                selectedHubId={selectedHubId}
                draftPreview={draftPreview}
                editingHubId={editingHubId}
            />
        </TacticalMapContainer>
    );
}
