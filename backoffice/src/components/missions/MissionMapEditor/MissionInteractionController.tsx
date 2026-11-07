"use client";

import { useEffect, useRef } from "react";
import { useCesium, getCesium } from "@/components/map";
import type { Waypoint } from "@/types";

export type EditorMode = "select" | "add" | "draw" | "hub-to-hub";

export interface MissionInteractionControllerProps {
    mode: EditorMode;
    defaultAltitude: number;
    waypoints: Waypoint[];
    isReadOnly?: boolean;
    onAddWaypoint?: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint?: (wpId: string, lat: number, lng: number) => void;
    onSelectWaypoint?: (waypoint: Waypoint | null) => void;
}

export function MissionInteractionController({
    mode,
    defaultAltitude,
    waypoints,
    isReadOnly = false,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
}: MissionInteractionControllerProps) {
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
            const Cesium = await getCesium();
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
                if (viewer && !viewer.isDestroyed() && viewer.scene?.canvas) {
                    viewer.scene.canvas.style.cursor = "default";
                }
                handler.destroy();
            };
        }

        const cleanupPromise = setupHandler();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed() && viewer.scene?.canvas) {
                viewer.scene.canvas.style.cursor = "default";
            }
            cleanupPromise.then((cleanup) => cleanup?.());
        };
    }, [viewer, isLoaded]);

    return null;
}
