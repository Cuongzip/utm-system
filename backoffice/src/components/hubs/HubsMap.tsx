"use client";

import { TacticalMapContainer, HubsLayer, MapInspector } from "@/components/map";
import { StatusBadge } from "@/components/ui";
import { formatDistance, formatAltitude, formatCoordinate } from "@/utils";
import { type Hub, ACTIVE_HUB_STATUS } from "@/types";

interface HubsMapProps {
    hubs: Hub[];
    selectedHubId?: string | null;
    onSelectHub: (hub: Hub | null) => void;
}

export function HubsMap({ hubs = [], selectedHubId, onSelectHub }: HubsMapProps) {
    const selectedHub = hubs.find((h) => h.id === selectedHubId);

    return (
        <TacticalMapContainer
            onEntityClick={(entityId) => {
                const found = hubs.find((h) => h.id === entityId);
                if (found) {
                    onSelectHub(found);
                }
            }}
            inspector={
                selectedHub ? (
                    <MapInspector
                        code={selectedHub.code}
                        title={selectedHub.name}
                        badge={<StatusBadge status={selectedHub.status ?? ACTIVE_HUB_STATUS} />}
                        metaItems={[
                            {
                                label: "Lat",
                                value: formatCoordinate(selectedHub.location?.latitude),
                            },
                            {
                                label: "Lng",
                                value: formatCoordinate(selectedHub.location?.longitude),
                            },
                            {
                                label: "Radius",
                                value: formatDistance(selectedHub.airspaceRadius),
                            },
                            {
                                label: "Altitude",
                                value: formatAltitude(selectedHub.altitudeMsl),
                            },
                        ]}
                        onClose={() => onSelectHub(null)}
                    />
                ) : null
            }
        >
            <HubsLayer hubs={hubs} selectedHubId={selectedHubId} />
        </TacticalMapContainer>
    );
}
