"use client";

import { memo, useRef } from "react";
import { useCesium } from "@/components/map/CesiumContext";
import type { TelemetryRecord } from "@/types";
import { useDeckCameraSync } from "./deck-overlay/useDeckCameraSync";
import { useDeckTelemetryTrails } from "./deck-overlay/useDeckTelemetryTrails";
import { useDeckGotoOverlay, type GotoDraftTarget } from "./deck-overlay/useDeckGotoOverlay";

export type { GotoDraftTarget };

interface FlightDeckMapOverlayProps {
    flightId: string;
    visibleTrail: TelemetryRecord[];
    fullTrail?: TelemetryRecord[];
    isReplay: boolean;
    followUav: boolean;
    gotoPickMode?: boolean;
    gotoDraft?: GotoDraftTarget | null;
    activeC2Target?: GotoDraftTarget | null;
    onPickGotoCoordinate?: (latitude: number, longitude: number) => void;
    fitBoundsPoints: { lat: number; lng: number }[];
    fitTrigger: number;
}

export const FlightDeckMapOverlay = memo(function FlightDeckMapOverlay({
    flightId,
    visibleTrail,
    fullTrail,
    isReplay,
    followUav,
    gotoPickMode = false,
    gotoDraft = null,
    activeC2Target = null,
    onPickGotoCoordinate,
    fitBoundsPoints,
    fitTrigger,
}: FlightDeckMapOverlayProps) {
    const { viewer, isLoaded } = useCesium();
    const cesiumRef = useRef<typeof import("cesium") | null>(null);

    const sceneRevision = useDeckCameraSync({
        viewer,
        isLoaded,
        flightId,
        followUav,
        hasTrailSample: visibleTrail.length > 0,
        fitBoundsPoints,
        fitTrigger,
    });

    useDeckTelemetryTrails({
        viewer,
        isLoaded,
        cesiumRef,
        flightId,
        visibleTrail,
        fullTrail,
        isReplay,
        sceneRevision,
    });

    useDeckGotoOverlay({
        viewer,
        isLoaded,
        cesiumRef,
        flightId,
        visibleTrail,
        gotoPickMode,
        gotoDraft,
        activeC2Target,
        onPickGotoCoordinate,
        sceneRevision,
    });

    return null;
});
