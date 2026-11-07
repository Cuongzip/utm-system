"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "@/components/map";
import { fitCameraToBounds } from "@/components/map/cesiumUtils";
import type { GeometryMode, GeoPoint } from "../useAirspaceGeometry";

export interface AirspaceCameraControllerProps {
    geometryMode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
}

export function AirspaceCameraController({
    geometryMode,
    center,
    radiusMeters,
    polygonPoints,
}: AirspaceCameraControllerProps) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFittedRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        if (hasInitialFittedRef.current) return;

        let pointsToFit: { lat: number; lng: number }[] = [];
        let minHeight = 1500;

        if (geometryMode === "radius") {
            if (
                Number.isFinite(center?.lat) &&
                Number.isFinite(center?.lng) &&
                (center.lat !== 0 || center.lng !== 0)
            ) {
                pointsToFit = [{ lat: center.lat, lng: center.lng }];
                minHeight = Math.max(radiusMeters * 2.8, 1500);
            }
        } else if (polygonPoints && polygonPoints.length > 0) {
            pointsToFit = polygonPoints;
            minHeight = 1200;
        }

        if (pointsToFit.length === 0) return;

        const timer = setTimeout(() => {
            if (!viewer || viewer.isDestroyed()) return;
            const success = fitCameraToBounds(viewer, pointsToFit, {
                animate: true,
                duration: 0.8,
                minHeight,
            });
            if (success) {
                hasInitialFittedRef.current = true;
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [viewer, isLoaded, geometryMode, center, radiusMeters, polygonPoints]);

    return null;
}
