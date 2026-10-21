"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Loader2, X } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import type { Hub } from "@/types";
import "cesium/Build/Cesium/Widgets/widgets.css";
import styles from "./HubsMap.module.css";

interface HubsMapProps {
    hubs: Hub[];
    selectedHubId?: string | null;
    onSelectHub?: (hub: Hub) => void;
}

export function HubsMap({ hubs = [], selectedHubId, onSelectHub }: HubsMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    const selectedHub = hubs.find((h) => h.id === selectedHubId);

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
                        const found = hubs.find((h) => h.id === picked.id.id);
                        if (found && onSelectHub) {
                            onSelectHub(found);
                        }
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                setIsLoaded(true);
            } catch (err: unknown) {
                console.error("Failed to initialize Hubs 2D Map:", err);
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

            const coordCounter: Record<string, number> = {};

            hubs.forEach((hub) => {
                const lat = hub.location?.lat;
                const lng = hub.location?.lng;
                if (lat === undefined || lng === undefined) return;

                const isSelected = selectedHubId === hub.id;
                const radius = hub.airspaceRadius || 5000;
                const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
                const stackIndex = coordCounter[coordKey] || 0;
                coordCounter[coordKey] = stackIndex + 1;
                const yOffset = -14 - stackIndex * 15;

                viewer.entities.add({
                    id: hub.id,
                    name: hub.name,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
                    point: {
                        pixelSize: isSelected ? 12 : 8,
                        color: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: hub.code,
                        font: isSelected ? "bold 12px monospace" : "600 11px monospace",
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        showBackground: false,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, yOffset),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    ellipse: {
                        semiMinorAxis: radius,
                        semiMajorAxis: radius,
                        material: isSelected
                            ? Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString("#334155"),
                                  0.22
                              )
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString("#64748b"),
                                  0.1
                              ),
                        outline: true,
                        outlineColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString("#64748b"),
                                  0.5
                              ),
                        outlineWidth: isSelected ? 2 : 1,
                    },
                });
            });

            if (selectedHubId) {
                const target = hubs.find((h) => h.id === selectedHubId);
                const lat = target?.location?.lat;
                const lng = target?.location?.lng;
                if (lat !== undefined && lng !== undefined) {
                    const zoomHeight = Math.max((target?.airspaceRadius || 5000) * 4, 15000);
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(lng, lat, zoomHeight),
                        duration: 0.8,
                    });
                }
            } else if (hubs.length > 0) {
                const valid = hubs
                    .map((h) => ({
                        lat: h.location?.lat,
                        lng: h.location?.lng,
                    }))
                    .filter(
                        (c): c is { lat: number; lng: number } =>
                            c.lat !== undefined && c.lng !== undefined
                    );

                if (valid.length === 1) {
                    viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(
                            valid[0].lng,
                            valid[0].lat,
                            30000.0
                        ),
                    });
                } else if (valid.length > 1) {
                    let minLat = 90,
                        maxLat = -90,
                        minLng = 180,
                        maxLng = -180;
                    valid.forEach((c) => {
                        if (c.lat < minLat) minLat = c.lat;
                        if (c.lat > maxLat) maxLat = c.lat;
                        if (c.lng < minLng) minLng = c.lng;
                        if (c.lng > maxLng) maxLng = c.lng;
                    });

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
    }, [hubs, selectedHubId, isLoaded]);

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
                            <button
                                type="button"
                                onClick={() => onSelectHub?.(null as unknown as Hub)}
                                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                                aria-label="Close inspector"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

export default HubsMap;
