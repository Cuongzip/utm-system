"use client";

import { useEffect, useRef } from "react";
import { useCesium, getCesium } from "@/components/map";
import type { GeometryMode, GeoPoint } from "../useAirspaceGeometry";

interface AirspaceInteractionControllerProps {
    geometryMode: GeometryMode;
    onCenterChange: (lat: number, lng: number) => void;
    onAddPolygonPoint: (lat: number, lng: number) => void;
    onUpdatePolygonPoint: (index: number, lat: number, lng: number) => void;
    onHoverPointChange?: (point: GeoPoint | null) => void;
}

const VERTEX_PREFIX = "airspace-editor-vertex-";

export function AirspaceInteractionController({
    geometryMode,
    onCenterChange,
    onAddPolygonPoint,
    onUpdatePolygonPoint,
    onHoverPointChange,
}: AirspaceInteractionControllerProps) {
    const { viewer, isLoaded } = useCesium();
    const modeRef = useRef(geometryMode);
    const onCenterChangeRef = useRef(onCenterChange);
    const onAddPolygonPointRef = useRef(onAddPolygonPoint);
    const onUpdatePolygonPointRef = useRef(onUpdatePolygonPoint);
    const onHoverPointChangeRef = useRef(onHoverPointChange);

    const hasMovedRef = useRef(false);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const draggedVertexIdxRef = useRef<number | null>(null);

    useEffect(() => {
        modeRef.current = geometryMode;
        onCenterChangeRef.current = onCenterChange;
        onAddPolygonPointRef.current = onAddPolygonPoint;
        onUpdatePolygonPointRef.current = onUpdatePolygonPoint;
        onHoverPointChangeRef.current = onHoverPointChange;

        if (geometryMode !== "polygon") {
            onHoverPointChange?.(null);
        }
    }, [geometryMode, onCenterChange, onAddPolygonPoint, onUpdatePolygonPoint, onHoverPointChange]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;
        let handler: import("cesium").ScreenSpaceEventHandler | null = null;
        let lastHoverTs = 0;

        async function setupHandler() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler = eventHandler;

            const pickGroundLatLng = (screenPos: import("cesium").Cartesian2): GeoPoint | null => {
                const ray = viewer.camera.getPickRay(screenPos);
                const cartesian =
                    (ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined) ??
                    viewer.camera.pickEllipsoid(screenPos, viewer.scene.globe.ellipsoid);
                if (!cartesian) return null;
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                return {
                    lat: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6)),
                    lng: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6)),
                };
            };

            eventHandler.setInputAction((event: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                hasMovedRef.current = false;
                startPosRef.current = { x: event.position.x, y: event.position.y };

                if (modeRef.current === "polygon") {
                    const picked = viewer.scene.pick(event.position);
                    if (Cesium.defined(picked) && picked.id && picked.id.id) {
                        const idStr = String(picked.id.id);
                        if (idStr.startsWith(VERTEX_PREFIX)) {
                            const idx = Number(idStr.slice(VERTEX_PREFIX.length));
                            if (Number.isInteger(idx) && idx >= 0) {
                                draggedVertexIdxRef.current = idx;
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

            eventHandler.setInputAction(
                (movement: { endPosition: import("cesium").Cartesian2 }) => {
                    if (!viewer || viewer.isDestroyed()) return;

                    if (
                        startPosRef.current &&
                        Math.hypot(
                            movement.endPosition.x - startPosRef.current.x,
                            movement.endPosition.y - startPosRef.current.y
                        ) > 5
                    ) {
                        hasMovedRef.current = true;
                    }

                    if (draggedVertexIdxRef.current !== null) {
                        const pt = pickGroundLatLng(movement.endPosition);
                        if (pt) {
                            onUpdatePolygonPointRef.current(
                                draggedVertexIdxRef.current,
                                pt.lat,
                                pt.lng
                            );
                            viewer.scene.requestRender();
                        }
                        return;
                    }

                    if (modeRef.current === "polygon") {
                        const picked = viewer.scene.pick(movement.endPosition);
                        const isOverVertex =
                            Cesium.defined(picked) &&
                            picked.id &&
                            picked.id.id &&
                            String(picked.id.id).startsWith(VERTEX_PREFIX);
                        viewer.scene.canvas.style.cursor = isOverVertex ? "grab" : "crosshair";

                        if (isOverVertex) {
                            onHoverPointChangeRef.current?.(null);
                        } else {
                            const now = performance.now();
                            if (now - lastHoverTs >= 45) {
                                lastHoverTs = now;
                                onHoverPointChangeRef.current?.(
                                    pickGroundLatLng(movement.endPosition)
                                );
                            }
                        }
                    } else {
                        viewer.scene.canvas.style.cursor = "crosshair";
                    }
                },
                Cesium.ScreenSpaceEventType.MOUSE_MOVE
            );

            eventHandler.setInputAction(() => {
                startPosRef.current = null;
                if (!viewer || viewer.isDestroyed()) return;
                if (draggedVertexIdxRef.current !== null) {
                    draggedVertexIdxRef.current = null;
                    viewer.scene.screenSpaceCameraController.enableRotate = true;
                    viewer.scene.screenSpaceCameraController.enableTranslate = true;
                    viewer.scene.screenSpaceCameraController.enableZoom = true;
                    viewer.scene.screenSpaceCameraController.enableTilt = true;
                    viewer.scene.screenSpaceCameraController.enableLook = true;
                    viewer.scene.canvas.style.cursor = "crosshair";
                    viewer.scene.requestRender();
                }
            }, Cesium.ScreenSpaceEventType.LEFT_UP);

            eventHandler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;

                if (hasMovedRef.current) {
                    hasMovedRef.current = false;
                    return;
                }

                if (modeRef.current === "polygon") {
                    const picked = viewer.scene.pick(click.position);
                    if (
                        Cesium.defined(picked) &&
                        picked.id &&
                        picked.id.id &&
                        String(picked.id.id).startsWith(VERTEX_PREFIX)
                    ) {
                        return;
                    }
                }

                const pt = pickGroundLatLng(click.position);
                if (pt) {
                    if (modeRef.current === "radius") {
                        onCenterChangeRef.current(pt.lat, pt.lng);
                    } else {
                        onAddPolygonPointRef.current(pt.lat, pt.lng);
                    }
                    viewer.scene.requestRender();
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        }

        const canvasEl = viewer.scene.canvas;
        const handleMouseLeave = () => {
            onHoverPointChangeRef.current?.(null);
        };
        canvasEl.addEventListener("mouseleave", handleMouseLeave);

        setupHandler();

        return () => {
            cancelled = true;
            canvasEl.removeEventListener("mouseleave", handleMouseLeave);
            onHoverPointChangeRef.current?.(null);
            if (handler && !handler.isDestroyed()) {
                handler.destroy();
            }
            if (viewer && !viewer.isDestroyed()) {
                viewer.scene.canvas.style.cursor = "default";
                viewer.scene.screenSpaceCameraController.enableRotate = true;
                viewer.scene.screenSpaceCameraController.enableTranslate = true;
                viewer.scene.screenSpaceCameraController.enableZoom = true;
                viewer.scene.screenSpaceCameraController.enableTilt = true;
                viewer.scene.screenSpaceCameraController.enableLook = true;
            }
        };
    }, [viewer, isLoaded]);

    return null;
}
