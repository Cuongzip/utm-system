"use client";

import { TacticalMapContainer, HubsLayer, MapInspector } from "@/components/map";
import type { Hub } from "@/types";

interface HubsMapProps {
    hubs: Hub[];
    selectedHubId?: string | null;
    onSelectHub?: (hub: Hub) => void;
}

export function HubsMap({ hubs = [], selectedHubId, onSelectHub }: HubsMapProps) {
    const selectedHub = hubs.find((h) => h.id === selectedHubId);

    return (
        <TacticalMapContainer
            onEntityClick={(entityId) => {
                const found = hubs.find((h) => h.id === entityId);
                if (found && onSelectHub) {
                    onSelectHub(found);
                }
            }}
            inspector={
                selectedHub ? (
                    <MapInspector
                        code={selectedHub.code}
                        title={selectedHub.name}
                        metaItems={[
                            {
                                label: "Lat",
                                value: (selectedHub.location?.lat ?? 0).toFixed(4),
                            },
                            {
                                label: "Lng",
                                value: (selectedHub.location?.lng ?? 0).toFixed(4),
                            },
                            {
                                label: "Radius",
                                value: `${selectedHub.airspaceRadius || 5000}m`,
                            },
                        ]}
                        accentColor="default"
                        onClose={() => onSelectHub?.(null as unknown as Hub)}
                        closeTooltip="Close hub inspector"
                    />
                ) : null
            }
        >
            <HubsLayer hubs={hubs} selectedHubId={selectedHubId} />
        </TacticalMapContainer>
    );
}

export default HubsMap;
