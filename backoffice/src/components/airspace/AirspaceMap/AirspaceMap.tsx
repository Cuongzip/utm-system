"use client";

import { Navigation } from "lucide-react";
import { BaseCesiumMap, AirspaceLayer, MapInspector, MapCardLayout } from "@/components/map";
import type { AirspaceZone } from "@/types";

interface AirspaceMapProps {
    zones: AirspaceZone[];
    selectedZoneId?: string | null;
    onSelectZone?: (zone: AirspaceZone | null) => void;
    hubMap?: Map<string, string>;
}

export function AirspaceMap({
    zones = [],
    selectedZoneId,
    onSelectZone,
    hubMap = new Map(),
}: AirspaceMapProps) {
    const selectedZone = zones.find((z) => z.id === selectedZoneId);
    const activeZonesCount = zones.filter((z) => z.status === "active").length;

    return (
        <MapCardLayout
            icon={<Navigation className="w-4 h-4 text-[var(--color-border-dark)]" />}
            title="AIRSPACE SECTOR MAP"
            badge={`${activeZonesCount} ${activeZonesCount === 1 ? "ZONE" : "ZONES"} ACTIVE`}
        >
            <BaseCesiumMap
                mode="2d"
                layerType="street"
                loadingText="Loading airspace satellite map..."
                onEntityClick={(entityId) => {
                    const found = zones.find((z) => z.id === entityId);
                    if (found && onSelectZone) {
                        onSelectZone(found);
                    }
                }}
            >
                <AirspaceLayer zones={zones} selectedZoneId={selectedZoneId} />
            </BaseCesiumMap>

            {selectedZone && (
                <MapInspector
                    code={selectedZone.zoneType?.toUpperCase().replace(/_/g, " ")}
                    title={selectedZone.name || "Unnamed Sector"}
                    metaItems={[
                        ...(selectedZone.hubId
                            ? [
                                  {
                                      label: "Hub",
                                      value: hubMap.get(selectedZone.hubId) || selectedZone.hubId,
                                  },
                              ]
                            : []),
                        {
                            label: "Ceiling",
                            value: `${selectedZone.altitudeCeiling ?? 120}m`,
                        },
                        {
                            label: "Status",
                            value: selectedZone.status || "active",
                        },
                    ]}
                    accentColor="default"
                    onClose={() => onSelectZone?.(null)}
                    closeTooltip="Close sector inspector"
                />
            )}
        </MapCardLayout>
    );
}

export default AirspaceMap;
