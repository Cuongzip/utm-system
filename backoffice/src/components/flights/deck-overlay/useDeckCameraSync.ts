"use client";

import { useEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import { fitCameraToBounds, syncViewerTrackedEntity } from "@/components/map/cesiumUtils";

interface UseDeckCameraSyncParams {
    viewer: Viewer | null;
    isLoaded: boolean;
    flightId: string;
    followUav: boolean;
    hasTrailSample: boolean;
    fitBoundsPoints: { lat: number; lng: number }[];
    fitTrigger: number;
}

export function useDeckCameraSync({
    viewer,
    isLoaded,
    flightId,
    followUav,
    hasTrailSample,
    fitBoundsPoints,
    fitTrigger,
}: UseDeckCameraSyncParams): number {
    const lastFitTriggerRef = useRef<number>(-1);
    const [sceneRevision, setSceneRevision] = useState(0);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        const removeListener = viewer.scene.morphComplete.addEventListener(() => {
            setSceneRevision((rev) => rev + 1);
        });
        return () => {
            removeListener();
        };
    }, [viewer, isLoaded]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        syncViewerTrackedEntity(viewer, `drone-live-${flightId}`, followUav);
    }, [viewer, isLoaded, flightId, followUav, hasTrailSample]);

    useEffect(() => {
        const targetEntityId = `drone-live-${flightId}`;
        return () => {
            syncViewerTrackedEntity(viewer, targetEntityId, false);
        };
    }, [viewer, isLoaded, flightId]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        if (fitTrigger === lastFitTriggerRef.current) return;
        if (fitBoundsPoints.length === 0) return;

        lastFitTriggerRef.current = fitTrigger;
        fitCameraToBounds(viewer, fitBoundsPoints, {
            animate: fitTrigger > 0,
            duration: 0.9,
            minHeight: 1400,
            paddingMultiplier: 1.45,
        });
    }, [viewer, isLoaded, fitBoundsPoints, fitTrigger]);

    return sceneRevision;
}
