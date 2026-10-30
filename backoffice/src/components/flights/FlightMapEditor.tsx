"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer, Plus, Trash2, Compass } from "lucide-react";
import { TacticalMapContainer, AltitudeProfile, useCesium } from "@/components/map";
import { ChamferCard } from "@/components/ui";
import { cn } from "@/lib";
import { fitCameraToBounds } from "@/components/map/cesiumUtils";
import { getHubIconUri, getWaypointIconUri } from "@/components/map/mapIcons";
import type { Hub, ProfilePoint } from "@/types";
import type { FlightWaypoint } from "./useFlightRoute";

export type FlightEditorMode = "select" | "add";

function FlightCameraController({
    targetLocation,
}: {
    targetLocation: { lat: number; lng: number; altitude?: number; key: number } | null;
}) {
    const { viewer, isLoaded } = useCesium();

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || !targetLocation) return;

        let cancelled = false;

        async function flyToTarget() {
            const Cesium = await import("cesium");
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            const currentHeight = viewer.camera.positionCartographic?.height || 3000;
            const zoomHeight = Math.min(Math.max(currentHeight, 1500), 5000);

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    targetLocation!.lng,
                    targetLocation!.lat,
                    zoomHeight
                ),
                duration: 0.8,
            });
        }

        flyToTarget();

        return () => {
            cancelled = true;
        };
    }, [viewer, isLoaded, targetLocation]);

    return null;
}

interface FlightMapEditorProps {
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    waypoints?: FlightWaypoint[];
    cruisingAltitude?: number;
    onCruisingAltitudeChange?: (alt: number) => void;
    selectedWaypointId?: string | null;
    onAddWaypoint?: (lat: number, lng: number, altitude?: number) => void;
    onMoveWaypoint?: (id: string, lat: number, lng: number) => void;
    onSelectWaypoint?: (waypoint: FlightWaypoint | null) => void;
    onClearWaypoints?: () => void;
    isReadOnly?: boolean;
    className?: string;
}

function FlightRouteRenderer({
    departureHub,
    arrivalHub,
    waypoints = [],
    selectedWaypointId,
    cruisingAltitude = 120,
}: {
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    waypoints: FlightWaypoint[];
    selectedWaypointId?: string | null;
    cruisingAltitude: number;
}) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasFittedRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderRoute() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const routePositions: import("cesium").Cartesian3[] = [];
            const boundPoints: { lat: number; lng: number }[] = [];

            if (
                departureHub?.location?.lat !== undefined &&
                departureHub?.location?.lng !== undefined
            ) {
                const depPos = Cesium.Cartesian3.fromDegrees(
                    departureHub.location.lng,
                    departureHub.location.lat,
                    departureHub.altitudeMsl ?? 10
                );
                routePositions.push(depPos);
                boundPoints.push({
                    lat: departureHub.location.lat,
                    lng: departureHub.location.lng,
                });

                const depId = "flight-dep-hub";
                const isSameHub = arrivalHub?.id === departureHub.id;
                viewer.entities.add({
                    id: depId,
                    position: depPos,
                    billboard: {
                        image: getHubIconUri("#10b981", false),
                        width: 28,
                        height: 28,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: isSameHub
                            ? `HUB: ${departureHub.code || departureHub.name}`
                            : `DEP: ${departureHub.code || departureHub.name}`,
                        font: "bold 10px monospace",
                        fillColor: Cesium.Color.fromCssColorString("#10b981"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(depId);
            }

            waypoints.forEach((wp, index) => {
                const alt = wp.altitude ?? cruisingAltitude;
                const pos = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, alt);
                routePositions.push(pos);
                boundPoints.push({ lat: wp.lat, lng: wp.lng });

                const isSelected =
                    selectedWaypointId === wp.id ||
                    selectedWaypointId === wp.tempId ||
                    selectedWaypointId === `wp-${wp.id}`;
                const wpId = `flight-wp-${wp.id || wp.tempId || index}`;

                viewer.entities.add({
                    id: wpId,
                    position: pos,
                    billboard: {
                        image: getWaypointIconUri(wp.sequence ?? index + 1, isSelected),
                        width: isSelected ? 30 : 24,
                        height: isSelected ? 30 : 24,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: `WP${wp.sequence ?? index + 1} (${alt}m)`,
                        font: isSelected ? "bold 11px monospace" : "600 10px monospace",
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#00e5ff")
                            : Cesium.Color.fromCssColorString("#0f172a"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, isSelected ? -20 : -16),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(wpId);
            });

            if (
                arrivalHub?.location?.lat !== undefined &&
                arrivalHub?.location?.lng !== undefined &&
                arrivalHub.id !== departureHub?.id
            ) {
                const arrPos = Cesium.Cartesian3.fromDegrees(
                    arrivalHub.location.lng,
                    arrivalHub.location.lat,
                    arrivalHub.altitudeMsl ?? 10
                );
                routePositions.push(arrPos);
                boundPoints.push({
                    lat: arrivalHub.location.lat,
                    lng: arrivalHub.location.lng,
                });

                const arrId = "flight-arr-hub";
                viewer.entities.add({
                    id: arrId,
                    position: arrPos,
                    billboard: {
                        image: getHubIconUri("#06b6d4", false),
                        width: 28,
                        height: 28,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: `ARR: ${arrivalHub.code || arrivalHub.name}`,
                        font: "bold 10px monospace",
                        fillColor: Cesium.Color.fromCssColorString("#06b6d4"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(arrId);
            }

            if (routePositions.length >= 2) {
                const lineId = "flight-planned-corridor";
                viewer.entities.add({
                    id: lineId,
                    polyline: {
                        positions: routePositions,
                        width: 3.5,
                        material: new Cesium.PolylineGlowMaterialProperty({
                            glowPower: 0.25,
                            color: Cesium.Color.fromCssColorString("#06b6d4"),
                        }),
                    },
                });
                newEntityIds.push(lineId);
            }

            entityIdsRef.current = newEntityIds;

            if (boundPoints.length > 0 && !hasFittedRef.current) {
                fitCameraToBounds(viewer, boundPoints, { bufferRatio: 0.35, minBuffer: 0.02 });
                hasFittedRef.current = true;
            }

            viewer.scene.requestRender();
        }

        renderRoute();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                entityIdsRef.current.forEach((id) => {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                });
            }
            entityIdsRef.current = [];
        };
    }, [
        viewer,
        isLoaded,
        departureHub,
        arrivalHub,
        waypoints,
        selectedWaypointId,
        cruisingAltitude,
    ]);

    return null;
}

function FlightEditorController({
    mode,
    cruisingAltitude,
    waypoints,
    isReadOnly = false,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
}: {
    mode: FlightEditorMode;
    cruisingAltitude: number;
    waypoints: FlightWaypoint[];
    isReadOnly?: boolean;
    onAddWaypoint?: (lat: number, lng: number, altitude?: number) => void;
    onMoveWaypoint?: (id: string, lat: number, lng: number) => void;
    onSelectWaypoint?: (waypoint: FlightWaypoint | null) => void;
}) {
    const { viewer, isLoaded } = useCesium();
    const waypointsRef = useRef(waypoints);
    const onMoveWaypointRef = useRef(onMoveWaypoint);
    const onAddWaypointRef = useRef(onAddWaypoint);
    const onSelectWaypointRef = useRef(onSelectWaypoint);
    const modeRef = useRef(mode);
    const altRef = useRef(cruisingAltitude);
    const isReadOnlyRef = useRef(isReadOnly);

    const isDraggingRef = useRef(false);
    const draggedWpIdRef = useRef<string | null>(null);
    const hasMovedRef = useRef(false);

    useEffect(() => {
        waypointsRef.current = waypoints;
        onMoveWaypointRef.current = onMoveWaypoint;
        onAddWaypointRef.current = onAddWaypoint;
        onSelectWaypointRef.current = onSelectWaypoint;
        modeRef.current = mode;
        altRef.current = cruisingAltitude;
        isReadOnlyRef.current = isReadOnly;
    }, [
        waypoints,
        onMoveWaypoint,
        onAddWaypoint,
        onSelectWaypoint,
        mode,
        cruisingAltitude,
        isReadOnly,
    ]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function setupHandler() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

            handler.setInputAction((event: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                const picked = viewer.scene.pick(event.position);
                if (Cesium.defined(picked) && picked.id && picked.id.id) {
                    const idStr = String(picked.id.id);
                    if (idStr.startsWith("flight-wp-")) {
                        const rawId = idStr.replace("flight-wp-", "");
                        const found = waypointsRef.current.find(
                            (w) => String(w.id || w.tempId) === rawId
                        );
                        if (found) {
                            onSelectWaypointRef.current?.(found);
                            if (!isReadOnlyRef.current) {
                                isDraggingRef.current = true;
                                draggedWpIdRef.current = rawId;
                                hasMovedRef.current = false;
                                viewer.scene.screenSpaceCameraController.enableRotate = false;
                                viewer.scene.screenSpaceCameraController.enableTranslate = false;
                                viewer.scene.screenSpaceCameraController.enableZoom = false;
                                viewer.scene.screenSpaceCameraController.enableTilt = false;
                                viewer.scene.screenSpaceCameraController.enableLook = false;
                                viewer.scene.canvas.style.cursor = "grabbing";
                            }
                        }
                    }
                }
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

            handler.setInputAction(
                (movement: {
                    startPosition: import("cesium").Cartesian2;
                    endPosition: import("cesium").Cartesian2;
                }) => {
                    if (!viewer || viewer.isDestroyed()) return;

                    if (isReadOnlyRef.current) {
                        const picked = viewer.scene.pick(movement.endPosition);
                        if (
                            Cesium.defined(picked) &&
                            picked.id &&
                            picked.id.id &&
                            String(picked.id.id).startsWith("flight-wp-")
                        ) {
                            viewer.scene.canvas.style.cursor = "pointer";
                        } else {
                            viewer.scene.canvas.style.cursor = "default";
                        }
                        return;
                    }

                    if (isDraggingRef.current && draggedWpIdRef.current) {
                        hasMovedRef.current = true;
                        const ray = viewer.camera.getPickRay(movement.endPosition);
                        if (ray) {
                            const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                            if (cartesian) {
                                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                                const lat = Number(
                                    Cesium.Math.toDegrees(carto.latitude).toFixed(6)
                                );
                                const lng = Number(
                                    Cesium.Math.toDegrees(carto.longitude).toFixed(6)
                                );
                                onMoveWaypointRef.current?.(draggedWpIdRef.current, lat, lng);
                                viewer.scene.requestRender();
                            }
                        }
                        return;
                    }

                    const picked = viewer.scene.pick(movement.endPosition);
                    if (
                        Cesium.defined(picked) &&
                        picked.id &&
                        picked.id.id &&
                        String(picked.id.id).startsWith("flight-wp-")
                    ) {
                        viewer.scene.canvas.style.cursor = "grab";
                    } else {
                        viewer.scene.canvas.style.cursor =
                            modeRef.current === "add" ? "crosshair" : "default";
                    }
                },
                Cesium.ScreenSpaceEventType.MOUSE_MOVE
            );

            handler.setInputAction(() => {
                if (!viewer || viewer.isDestroyed()) return;
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    draggedWpIdRef.current = null;
                    viewer.scene.screenSpaceCameraController.enableRotate = true;
                    viewer.scene.screenSpaceCameraController.enableTranslate = true;
                    viewer.scene.screenSpaceCameraController.enableZoom = true;
                    viewer.scene.screenSpaceCameraController.enableTilt = true;
                    viewer.scene.screenSpaceCameraController.enableLook = true;
                    viewer.scene.canvas.style.cursor = "default";
                    viewer.scene.requestRender();
                }
            }, Cesium.ScreenSpaceEventType.LEFT_UP);

            handler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;

                if (hasMovedRef.current) {
                    hasMovedRef.current = false;
                    return;
                }

                const picked = viewer.scene.pick(click.position);
                if (Cesium.defined(picked) && picked.id && picked.id.id) {
                    const idStr = String(picked.id.id);
                    if (idStr.startsWith("flight-wp-")) {
                        const rawId = idStr.replace("flight-wp-", "");
                        const found = waypointsRef.current.find(
                            (w) => String(w.id || w.tempId) === rawId
                        );
                        if (found) {
                            onSelectWaypointRef.current?.(found);
                            return;
                        }
                    }
                    return;
                }

                if (isReadOnlyRef.current) return;

                if (modeRef.current === "add") {
                    const ray = viewer.camera.getPickRay(click.position);
                    if (ray) {
                        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                        if (cartesian) {
                            const carto = Cesium.Cartographic.fromCartesian(cartesian);
                            const lat = Cesium.Math.toDegrees(carto.latitude);
                            const lng = Cesium.Math.toDegrees(carto.longitude);
                            onAddWaypointRef.current?.(
                                Number(lat.toFixed(6)),
                                Number(lng.toFixed(6)),
                                altRef.current
                            );
                            viewer.scene.requestRender();
                        }
                    }
                } else {
                    onSelectWaypointRef.current?.(null);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            return () => {
                handler.destroy();
            };
        }

        const cleanupPromise = setupHandler();

        return () => {
            cancelled = true;
            cleanupPromise.then((cleanup) => cleanup?.());
        };
    }, [viewer, isLoaded]);

    return null;
}

export function FlightMapEditor({
    departureHub,
    arrivalHub,
    waypoints = [],
    cruisingAltitude = 120,
    onCruisingAltitudeChange,
    selectedWaypointId,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
    onClearWaypoints,
    isReadOnly = false,
    className = "",
}: FlightMapEditorProps) {
    const [mode, setMode] = useState<FlightEditorMode>(isReadOnly ? "select" : "add");
    const [altInput, setAltInput] = useState(String(cruisingAltitude));
    const [flyToTarget, setFlyToTarget] = useState<{
        lat: number;
        lng: number;
        altitude?: number;
        key: number;
    } | null>(null);

    useEffect(() => {
        setAltInput(String(cruisingAltitude));
    }, [cruisingAltitude]);

    const handleAltChange = (val: string) => {
        setAltInput(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
            onCruisingAltitudeChange?.(parsed);
        }
    };

    const handleProfilePointClick = (point: ProfilePoint) => {
        setFlyToTarget({
            lat: point.latitude,
            lng: point.longitude,
            altitude: point.altitude,
            key: Date.now(),
        });
    };

    return (
        <TacticalMapContainer
            initialMode="2d"
            className={className}
            header={
                <div className="px-[18px] py-2.5 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-panel)] z-10">
                    {isReadOnly ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono ml-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>READ-ONLY VIEW</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                                <button
                                    type="button"
                                    onClick={() => setMode("select")}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                        mode === "select"
                                            ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                    )}
                                    title="Select or drag waypoints"
                                >
                                    <MousePointer className="w-3.5 h-3.5" />
                                    <span>Select</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("add")}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                        mode === "add"
                                            ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                    )}
                                    title="Click on map to add waypoint"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Point</span>
                                </button>

                                {waypoints.length > 0 && onClearWaypoints && (
                                    <button
                                        type="button"
                                        onClick={onClearWaypoints}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Clear all intermediate waypoints"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Clear</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] px-2.5 py-1 rounded border border-[var(--color-border-default)]">
                                <span className="text-[11px] font-mono uppercase text-[var(--color-text-muted)]">
                                    Alt:
                                </span>
                                <input
                                    type="number"
                                    min="10"
                                    max="1000"
                                    value={altInput}
                                    onChange={(e) => handleAltChange(e.target.value)}
                                    className="w-14 h-6 px-1 border border-[var(--color-border-default)] rounded text-center font-mono text-xs bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--color-border-dark)]"
                                />
                                <span className="font-mono text-slate-400 text-[11px]">m</span>
                            </div>
                        </>
                    )}
                </div>
            }
            overlay={
                isReadOnly ? (
                    <div className="absolute top-3 left-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 rounded backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                        <Compass className="w-3.5 h-3.5 text-[var(--color-tech-amber)]" />
                        <span>Click waypoint to inspect parameters</span>
                    </div>
                ) : (
                    mode === "add" && (
                        <div className="absolute top-3 left-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 rounded backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                            <Plus className="w-3.5 h-3.5 text-white animate-pulse" />
                            <span>Click to add • Drag point to move</span>
                        </div>
                    )
                )
            }
            footer={
                <AltitudeProfile
                    waypoints={waypoints}
                    selectedWaypointId={selectedWaypointId}
                    departureHub={departureHub}
                    arrivalHub={arrivalHub}
                    onWaypointClick={onSelectWaypoint}
                    onPointClick={handleProfilePointClick}
                />
            }
        >
            <FlightRouteRenderer
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                waypoints={waypoints}
                selectedWaypointId={selectedWaypointId}
                cruisingAltitude={cruisingAltitude}
            />

            <FlightEditorController
                mode={mode}
                cruisingAltitude={cruisingAltitude}
                waypoints={waypoints}
                isReadOnly={isReadOnly}
                onAddWaypoint={onAddWaypoint}
                onMoveWaypoint={onMoveWaypoint}
                onSelectWaypoint={onSelectWaypoint}
            />

            <FlightCameraController targetLocation={flyToTarget} />
        </TacticalMapContainer>
    );
}

export default FlightMapEditor;
