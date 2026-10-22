"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Loader2, X } from "lucide-react";
import { ChamferCard, Tooltip } from "@/components/ui";
import type { AirspaceZone } from "@/types";
import "cesium/Build/Cesium/Widgets/widgets.css";
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
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    const selectedZone = zones.find((z) => z.id === selectedZoneId);
    const activeZonesCount = zones.filter((z) => z.status === "active").length;

    useEffect(() => {
        let viewer: any = null;

        async function initMap() {
            if (!containerRef.current) return;

            try {
                window.CESIUM_BASE_URL = "/cesium";
                const Cesium = await import("cesium");

                Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

                const streetProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
                    { enablePickFeatures: false }
                );

                viewer = new Cesium.Viewer(containerRef.current, {
                    sceneMode: Cesium.SceneMode.SCENE2D,
                    baseLayer: new Cesium.ImageryLayer(streetProvider),
                    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
                    creditContainer: document.createElement("div"),
                    requestRenderMode: true,
                    maximumRenderTimeChange: Infinity,
                    animation: false,
                    timeline: false,
                    fullscreenButton: false,
                    homeButton: false,
                    sceneModePicker: false,
                    baseLayerPicker: false,
                    navigationHelpButton: false,
                    infoBox: false,
                    geocoder: false,
                    selectionIndicator: false,
                });

                viewerRef.current = viewer;

                viewer.resize();
                if (containerRef.current) {
                    const ro = new ResizeObserver(() => {
                        if (viewer && !viewer.isDestroyed()) {
                            viewer.resize();
                        }
                    });
                    ro.observe(containerRef.current);
                    resizeObserverRef.current = ro;
                }

                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(108.2208, 16.0544, 2500000.0),
                });

                const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
                handler.setInputAction((click: any) => {
                    const picked = viewer.scene.pick(click.position);
                    if (Cesium.defined(picked) && picked.id && picked.id.id) {
                        const found = zones.find((z) => z.id === picked.id.id);
                        if (found && onSelectZone) {
                            onSelectZone(found);
                        }
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                setIsLoaded(true);
            } catch (err: unknown) {
                console.error("Failed to initialize Airspace 2D Map:", err);
                setMapError("Failed to initialize map engine");
            }
        }

        initMap();

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
            if (viewer && !viewer.isDestroyed()) {
                viewer.destroy();
            }
        };
    }, []);

    useEffect(() => {
        async function updateEntities() {
            if (!viewerRef.current || !isLoaded) return;
            const Cesium = await import("cesium");
            const viewer = viewerRef.current;

            viewer.entities.removeAll();

            const typeColorMap: Record<string, string> = {
                no_fly_zone: "#ef4444",
                restricted: "#f59e0b",
                hub_corridor: "#06b6d4",
                warning: "#eab308",
            };

            zones.forEach((zone) => {
                const coordinates = zone.geometry?.coordinates;
                if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
                    return;
                }

                const outerRing = coordinates[0];
                if (!outerRing || outerRing.length < 3) return;

                const degreeArray: number[] = [];
                let sumLng = 0;
                let sumLat = 0;
                let validCount = 0;

                outerRing.forEach((point) => {
                    if (Array.isArray(point) && point.length >= 2) {
                        const lng = point[0];
                        const lat = point[1];
                        if (typeof lng === "number" && typeof lat === "number") {
                            degreeArray.push(lng, lat);
                            sumLng += lng;
                            sumLat += lat;
                            validCount++;
                        }
                    }
                });

                if (degreeArray.length < 6) return;

                const centerLng = sumLng / validCount;
                const centerLat = sumLat / validCount;

                const isSelected = selectedZoneId === zone.id;
                const zoneTypeKey = zone.zoneType || "warning";
                const baseColor = typeColorMap[zoneTypeKey] || "#64748b";

                viewer.entities.add({
                    id: zone.id,
                    name: zone.name,
                    polygon: {
                        hierarchy: new Cesium.PolygonHierarchy(
                            Cesium.Cartesian3.fromDegreesArray(degreeArray)
                        ),
                        material: isSelected
                            ? Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.28
                              )
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.12
                              ),
                        outline: true,
                        outlineColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.6
                              ),
                        outlineWidth: isSelected ? 2 : 1,
                        height: 0,
                    },
                    position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, 0),
                    label: {
                        text: zone.name || zone.id,
                        font: isSelected ? "bold 12px monospace" : "600 11px monospace",
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        showBackground: false,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000),
                    },
                });
            });

            if (selectedZoneId) {
                const target = zones.find((z) => z.id === selectedZoneId);
                const outerRing = target?.geometry?.coordinates?.[0];
                if (Array.isArray(outerRing) && outerRing.length > 0) {
                    let sumLng = 0,
                        sumLat = 0,
                        count = 0;
                    outerRing.forEach((point) => {
                        if (Array.isArray(point) && point.length >= 2) {
                            sumLng += point[0];
                            sumLat += point[1];
                            count++;
                        }
                    });
                    if (count > 0) {
                        viewer.camera.flyTo({
                            destination: Cesium.Cartesian3.fromDegrees(
                                sumLng / count,
                                sumLat / count,
                                20000.0
                            ),
                            duration: 0.8,
                        });
                    }
                }
            } else if (zones.length > 0) {
                let minLat = 90,
                    maxLat = -90,
                    minLng = 180,
                    maxLng = -180;
                let hasPoints = false;
                zones.forEach((z) => {
                    const outerRing = z.geometry?.coordinates?.[0];
                    if (Array.isArray(outerRing)) {
                        outerRing.forEach((point) => {
                            if (Array.isArray(point) && point.length >= 2) {
                                const lng = point[0];
                                const lat = point[1];
                                if (typeof lng === "number" && typeof lat === "number") {
                                    if (lat < minLat) minLat = lat;
                                    if (lat > maxLat) maxLat = lat;
                                    if (lng < minLng) minLng = lng;
                                    if (lng > maxLng) maxLng = lng;
                                    hasPoints = true;
                                }
                            }
                        });
                    }
                });

                if (hasPoints) {
                    const latBuf = Math.max((maxLat - minLat) * 0.4, 0.08);
                    const lngBuf = Math.max((maxLng - minLng) * 0.4, 0.08);

                    viewer.camera.setView({
                        destination: Cesium.Rectangle.fromDegrees(
                            minLng - lngBuf,
                            minLat - latBuf,
                            maxLng + lngBuf,
                            maxLat + latBuf
                        ),
                    });
                }
            }

            viewer.scene.requestRender();
        }

        updateEntities();
    }, [zones, isLoaded, selectedZoneId]);

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
                    <div ref={containerRef} className={styles.mapCanvas} />

                    {!isLoaded && !mapError && (
                        <div className={styles.loadingOverlay}>
                            <Loader2 className="w-6 h-6 text-[var(--color-border-dark)] animate-spin" />
                            <span>Loading airspace satellite map...</span>
                        </div>
                    )}

                    {mapError && (
                        <div className={styles.loadingOverlay}>
                            <span className="text-red-500 font-semibold">{mapError}</span>
                        </div>
                    )}

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
