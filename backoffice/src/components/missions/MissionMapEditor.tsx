"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer, Plus, Pencil, Route, Compass } from "lucide-react";
import { BaseCesiumMap, MissionLayer, useCesium } from "@/components/map";
import { ChamferCard } from "@/components/ui";
import { cn } from "@/lib";
import { AltitudeProfile } from "./AltitudeProfile";
import type { Waypoint, Hub, ProfilePoint } from "@/types";

export type EditorMode = "select" | "add" | "draw" | "hub-to-hub";

function MissionCameraController({
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

interface MissionMapEditorProps {
    waypoints: Waypoint[];
    selectedWaypointId?: string | null;
    defaultAltitude?: number;
    onDefaultAltitudeChange?: (alt: number) => void;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    onAddWaypoint?: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint?: (wpId: string, lat: number, lng: number) => void;
    onSelectWaypoint?: (waypoint: Waypoint | null) => void;
    onGenerateHubToHub?: () => void;
    isReadOnly?: boolean;
    className?: string;
}

function MissionEditorController({
    mode,
    defaultAltitude,
    waypoints,
    isReadOnly = false,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
}: {
    mode: EditorMode;
    defaultAltitude: number;
    waypoints: Waypoint[];
    isReadOnly?: boolean;
    onAddWaypoint?: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint?: (wpId: string, lat: number, lng: number) => void;
    onSelectWaypoint?: (waypoint: Waypoint | null) => void;
}) {
    const { viewer, isLoaded } = useCesium();
    const waypointsRef = useRef(waypoints);
    const onMoveWaypointRef = useRef(onMoveWaypoint);
    const onAddWaypointRef = useRef(onAddWaypoint);
    const onSelectWaypointRef = useRef(onSelectWaypoint);
    const modeRef = useRef(mode);
    const altRef = useRef(defaultAltitude);
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
        altRef.current = defaultAltitude;
        isReadOnlyRef.current = isReadOnly;
    }, [
        waypoints,
        onMoveWaypoint,
        onAddWaypoint,
        onSelectWaypoint,
        mode,
        defaultAltitude,
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
                    if (idStr.startsWith("wp-")) {
                        const rawId = idStr.replace("wp-", "");
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
                            String(picked.id.id).startsWith("wp-")
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
                        String(picked.id.id).startsWith("wp-")
                    ) {
                        viewer.scene.canvas.style.cursor = "grab";
                    } else {
                        viewer.scene.canvas.style.cursor =
                            modeRef.current === "add" || modeRef.current === "draw"
                                ? "crosshair"
                                : "default";
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
                    if (idStr.startsWith("wp-")) {
                        const rawId = idStr.replace("wp-", "");
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

                if (modeRef.current === "add" || modeRef.current === "draw") {
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

export function MissionMapEditor({
    waypoints = [],
    selectedWaypointId,
    defaultAltitude = 50,
    onDefaultAltitudeChange,
    departureHub,
    arrivalHub,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
    onGenerateHubToHub,
    isReadOnly = false,
    className = "",
}: MissionMapEditorProps) {
    const [mode, setMode] = useState<EditorMode>(isReadOnly ? "select" : "add");
    const [altInput, setAltInput] = useState(String(defaultAltitude));
    const [flyToTarget, setFlyToTarget] = useState<{
        lat: number;
        lng: number;
        altitude?: number;
        key: number;
    } | null>(null);

    const handleProfilePointClick = (point: ProfilePoint) => {
        if (point.waypoint) {
            onSelectWaypoint?.(point.waypoint);
        }
        if (point.latitude !== undefined && point.longitude !== undefined) {
            setFlyToTarget({
                lat: point.latitude,
                lng: point.longitude,
                altitude: point.altitude,
                key: Date.now(),
            });
        }
    };

    const handleAltChange = (val: string) => {
        setAltInput(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
            onDefaultAltitudeChange?.(parsed);
        }
    };

    return (
        <ChamferCard size="lg" accent="dark" className={cn("w-full h-full", className)}>
            <div className="flex flex-col h-full bg-[var(--color-surface-panel)] overflow-hidden">
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

                                <button
                                    type="button"
                                    onClick={() => setMode("draw")}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                        mode === "draw"
                                            ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                    )}
                                    title="Draw continuous path"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Draw Path</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={onGenerateHubToHub}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                                    title="Auto connect Departure Vertiport to Arrival Vertiport"
                                >
                                    <Route className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                                    <span>Hub-to-Hub</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] px-2.5 py-1 rounded border border-[var(--color-border-default)]">
                                <span className="text-[11px] font-mono uppercase text-[var(--color-text-muted)]">
                                    Alt:
                                </span>
                                <input
                                    type="number"
                                    min="5"
                                    max="500"
                                    value={altInput}
                                    onChange={(e) => handleAltChange(e.target.value)}
                                    className="w-12 h-6 px-1 border border-[var(--color-border-default)] rounded text-center font-mono text-xs bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--color-border-dark)]"
                                />
                                <span className="font-mono text-slate-400 text-[11px]">m</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="relative flex-1 w-full min-h-[420px] overflow-hidden bg-slate-100">
                    <BaseCesiumMap
                        mode="2d"
                        layerType="street"
                        loadingText="Loading mission tactical canvas..."
                    >
                        <MissionLayer
                            waypoints={waypoints}
                            selectedWaypointId={selectedWaypointId}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            autoFitBounds={false}
                        />

                        <MissionEditorController
                            mode={mode}
                            defaultAltitude={defaultAltitude}
                            waypoints={waypoints}
                            isReadOnly={isReadOnly}
                            onAddWaypoint={onAddWaypoint}
                            onMoveWaypoint={onMoveWaypoint}
                            onSelectWaypoint={onSelectWaypoint}
                        />

                        <MissionCameraController targetLocation={flyToTarget} />
                    </BaseCesiumMap>

                    {isReadOnly ? (
                        <div className="absolute top-3 right-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 rounded backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                            <Compass className="w-3.5 h-3.5 text-[var(--color-tech-amber)]" />
                            <span>Click waypoint to inspect parameters</span>
                        </div>
                    ) : (
                        (mode === "add" || mode === "draw") && (
                            <div className="absolute top-3 right-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 rounded backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                                <Plus className="w-3.5 h-3.5 text-white animate-pulse" />
                                <span>Click to add • Drag point to move</span>
                            </div>
                        )
                    )}
                </div>

                <AltitudeProfile
                    waypoints={waypoints}
                    selectedWaypointId={selectedWaypointId}
                    departureHub={departureHub}
                    arrivalHub={arrivalHub}
                    onWaypointClick={onSelectWaypoint}
                    onPointClick={handleProfilePointClick}
                />
            </div>
        </ChamferCard>
    );
}

export default MissionMapEditor;
