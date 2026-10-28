"use client";

import { TacticalMapContainer, AirspaceLayer, MapInspector } from "@/components/map";
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

    return (
        <TacticalMapContainer
            initialMode="3d"
            onEntityClick={(entityId) => {
                const found = zones.find((z) => z.id === entityId);
                if (found && onSelectZone) {
                    onSelectZone(found);
                }
            }}
            inspector={
                selectedZone ? (
                    <MapInspector
                        code={selectedZone.zoneType?.toUpperCase().replace(/_/g, " ")}
                        title={selectedZone.name || "Unnamed Sector"}
                        metaItems={[
                            ...(selectedZone.hubId
                                ? [
                                      {
                                          label: "Hub",
                                          value:
                                              hubMap.get(selectedZone.hubId) || selectedZone.hubId,
                                      },
                                  ]
                                : []),
                            {
                                label: "Floor",
                                value: "0m",
                            },
                            {
                                label: "Ceiling",
                                value: `${selectedZone.altitudeCeiling ?? 120}m`,
                            },
                            {
                                label: "Status",
                                value: selectedZone.status || "active",
                            },
                        ]}
                        accentColor={selectedZone.zoneType === "no_fly_zone" ? "red" : "default"}
                        onClose={() => onSelectZone?.(null)}
                        closeTooltip="Close sector inspector"
                    />
                ) : null
            }
        >
            <AirspaceLayer zones={zones} selectedZoneId={selectedZoneId} />
        </TacticalMapContainer>
    );
}

export default AirspaceMap;
