"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "@/components/map";
import type { GeometryMode } from "../useAirspaceGeometry";
import { getCesium } from "./cesiumLoader";

export interface AirspaceInteractionControllerProps {
    geometryMode: GeometryMode;
    onCenterChange: (lat: number, lng: number) => void;
    onAddPolygonPoint: (lat: number, lng: number) => void;
}

export function AirspaceInteractionController({
    geometryMode,
    onCenterChange,
    onAddPolygonPoint,
}: AirspaceInteractionControllerProps) {
    const { viewer, isLoaded } = useCesium();
    const modeRef = useRef(geometryMode);
    const onCenterChangeRef = useRef(onCenterChange);
    const onAddPolygonPointRef = useRef(onAddPolygonPoint);

    modeRef.current = geometryMode;
    onCenterChangeRef.current = onCenterChange;
    onAddPolygonPointRef.current = onAddPolygonPoint;

    const hasMovedRef = useRef(false);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function setupHandler() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

            handler.setInputAction((event: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                hasMovedRef.current = false;
                startPosRef.current = { x: event.position.x, y: event.position.y };
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

            handler.setInputAction((movement: { endPosition: import("cesium").Cartesian2 }) => {
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
                viewer.scene.canvas.style.cursor = "crosshair";
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

            handler.setInputAction(() => {
                startPosRef.current = null;
            }, Cesium.ScreenSpaceEventType.LEFT_UP);

            handler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;

                if (hasMovedRef.current) {
                    hasMovedRef.current = false;
                    return;
                }

                const ray = viewer.camera.getPickRay(click.position);
                if (ray) {
                    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                    if (cartesian) {
                        const carto = Cesium.Cartographic.fromCartesian(cartesian);
                        const lat = Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6));
                        const lng = Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6));

                        if (modeRef.current === "radius") {
                            onCenterChangeRef.current(lat, lng);
                        } else {
                            onAddPolygonPointRef.current(lat, lng);
                        }
                        viewer.scene.requestRender();
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
