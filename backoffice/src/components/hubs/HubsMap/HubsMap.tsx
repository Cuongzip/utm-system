"use client";

import { Navigation, X } from "lucide-react";
import { ChamferCard, Tooltip } from "@/components/ui";
import { BaseCesiumMap, HubsLayer } from "@/components/map";
import type { Hub } from "@/types";
import styles from "./HubsMap.module.css";

interface HubsMapProps {
    hubs: Hub[];
    selectedHubId?: string | null;
    onSelectHub?: (hub: Hub) => void;
}

export function HubsMap({ hubs = [], selectedHubId, onSelectHub }: HubsMapProps) {
    const selectedHub = hubs.find((h) => h.id === selectedHubId);

    return (
        <ChamferCard size="lg" accent="dark" className="w-full h-full">
            <div className={styles.mapContainer}>
                <div className={styles.mapHeader}>
                    <div className={styles.headerTitle}>
                        <Navigation className="w-4 h-4 text-[var(--color-border-dark)]" />
                        <span>VERTIPORT AIRSPACE MAP</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono font-medium">
                        {hubs.length} {hubs.length === 1 ? "HUB" : "HUBS"} ACTIVE
                    </span>
                </div>

                <div className={styles.viewerContainer}>
                    <BaseCesiumMap
                        mode="2d"
                        layerType="street"
                        canvasClassName={styles.mapCanvas}
                        loadingText="Loading airspace satellite map..."
                        onEntityClick={(entityId) => {
                            const found = hubs.find((h) => h.id === entityId);
                            if (found && onSelectHub) {
                                onSelectHub(found);
                            }
                        }}
                    >
                        <HubsLayer hubs={hubs} selectedHubId={selectedHubId} />
                    </BaseCesiumMap>

                    {selectedHub && (
                        <div className={styles.hubInspector}>
                            <div className={styles.inspectorLeft}>
                                <div className={styles.inspectorTitle}>
                                    <span className={styles.inspectorCode}>{selectedHub.code}</span>
                                    <span>{selectedHub.name}</span>
                                </div>
                                <div className={styles.inspectorMeta}>
                                    <span>
                                        Lat:{" "}
                                        <span className={styles.inspectorValue}>
                                            {(selectedHub.location?.lat ?? 0).toFixed(4)}
                                        </span>
                                    </span>
                                    <span>
                                        Lng:{" "}
                                        <span className={styles.inspectorValue}>
                                            {(selectedHub.location?.lng ?? 0).toFixed(4)}
                                        </span>
                                    </span>
                                    <span>
                                        Radius:{" "}
                                        <span className={styles.inspectorValue}>
                                            {selectedHub.airspaceRadius || 5000}m
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <Tooltip content="Close hub inspector" side="left">
                                <button
                                    type="button"
                                    onClick={() => onSelectHub?.(null as unknown as Hub)}
                                    className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                                    aria-label="Close inspector"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

export default HubsMap;
