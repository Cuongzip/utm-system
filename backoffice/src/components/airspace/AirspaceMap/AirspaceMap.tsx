"use client";

import { Navigation, X } from "lucide-react";
import { ChamferCard, Tooltip } from "@/components/ui";
import { BaseCesiumMap, AirspaceLayer } from "@/components/map";
import type { AirspaceZone } from "@/types";
import styles from "./AirspaceMap.module.css";

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
        <ChamferCard size="lg" accent="dark" className="w-full h-full">
            <div className={styles.mapContainer}>
                <div className={styles.mapHeader}>
                    <div className={styles.headerTitle}>
                        <Navigation className="w-4 h-4 text-[var(--color-border-dark)]" />
                        <span>AIRSPACE SECTOR MAP</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono font-medium">
                        {activeZonesCount} {activeZonesCount === 1 ? "ZONE" : "ZONES"} ACTIVE
                    </span>
                </div>

                <div className={styles.viewerContainer}>
                    <BaseCesiumMap
                        mode="2d"
                        layerType="street"
                        canvasClassName={styles.mapCanvas}
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
                        <div className={styles.zoneInspector}>
                            <div className={styles.inspectorLeft}>
                                <div className={styles.inspectorTitle}>
                                    <span className={styles.inspectorCode}>
                                        {selectedZone.zoneType?.toUpperCase().replace(/_/g, " ")}
                                    </span>
                                    <span>{selectedZone.name || "Unnamed Sector"}</span>
                                </div>
                                <div className={styles.inspectorMeta}>
                                    {selectedZone.hubId && (
                                        <span>
                                            Hub:{" "}
                                            <span className={styles.inspectorValue}>
                                                {hubMap.get(selectedZone.hubId) ||
                                                    selectedZone.hubId}
                                            </span>
                                        </span>
                                    )}
                                    <span>
                                        Ceiling:{" "}
                                        <span className={styles.inspectorValue}>
                                            {selectedZone.altitudeCeiling ?? 120}m
                                        </span>
                                    </span>
                                    <span>
                                        Status:{" "}
                                        <span className={styles.inspectorValue}>
                                            {selectedZone.status || "active"}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <Tooltip content="Close sector inspector" side="left">
                                <button
                                    type="button"
                                    onClick={() => onSelectZone?.(null)}
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

export default AirspaceMap;
