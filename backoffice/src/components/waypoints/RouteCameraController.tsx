"use client";

import { useEffect, useRef } from "react";
import { useCesium, fitCameraToBounds, getCesium } from "@/components/map";

interface RouteCameraControllerProps {
    targetLocation: { lat: number; lng: number; altitude?: number; key: number } | null;
    points: { lat: number; lng: number }[];
}

export function RouteCameraController({ targetLocation, points }: RouteCameraControllerProps) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFittedRef = useRef(false);
    const lastPointCountRef = useRef(0);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || points.length === 0) return;
        if (hasInitialFittedRef.current && points.length <= lastPointCountRef.current) return;

        const timer = setTimeout(() => {
            if (!viewer || viewer.isDestroyed()) return;
            const success = fitCameraToBounds(viewer, points, {
                animate: true,
                duration: 0.8,
                minHeight: 1500,
            });
            if (success) {
                hasInitialFittedRef.current = true;
                lastPointCountRef.current = points.length;
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [viewer, isLoaded, points]);

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
