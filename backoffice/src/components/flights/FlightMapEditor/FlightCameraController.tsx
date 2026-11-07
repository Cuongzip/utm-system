"use client";

import { useEffect, useRef } from "react";
import { useCesium, fitCameraToBounds, getCesium } from "@/components/map";

export interface FlightCameraControllerProps {
    targetLocation: { lat: number; lng: number; altitude?: number; key: number } | null;
    routePoints: { lat: number; lng: number }[];
}

export function FlightCameraController({
    targetLocation,
    routePoints,
}: FlightCameraControllerProps) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFittedRef = useRef(false);
    const lastPointCountRef = useRef(0);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || routePoints.length === 0) return;
        if (hasInitialFittedRef.current && routePoints.length <= lastPointCountRef.current) return;

        const timer = setTimeout(() => {
            if (!viewer || viewer.isDestroyed()) return;
            const success = fitCameraToBounds(viewer, routePoints, {
                animate: true,
                duration: 0.8,
                minHeight: 1500,
            });
            if (success) {
                hasInitialFittedRef.current = true;
                lastPointCountRef.current = routePoints.length;
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [viewer, isLoaded, routePoints]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || !targetLocation) return;

        let cancelled = false;

        async function flyToTarget() {
            const Cesium = await getCesium();
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    targetLocation!.lng,
                    targetLocation!.lat,
                    1500
                ),
                duration: 0.8,
                complete: () => {
                    if (!viewer.isDestroyed()) viewer.scene.requestRender();
                },
            });
            viewer.scene.requestRender();
        }

        flyToTarget();

        return () => {
            cancelled = true;
        };
    }, [viewer, isLoaded, targetLocation]);

    return null;
}
