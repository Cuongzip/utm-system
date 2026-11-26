"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { fitCameraToBounds } from "../cesiumUtils";
import { createTacticalLabel } from "../mapLabels";
import type { BlackboxEntryVm } from "@/types";

export interface IncidentReplayLayerProps {
    incidentLat?: number | null;
    incidentLng?: number | null;
    incidentAlt?: number | null;
    incidentLabel?: string;
    blackboxEntries: BlackboxEntryVm[];
    playbackIndex: number;
}

export function IncidentReplayLayer({
    incidentLat,
    incidentLng,
    incidentAlt,
    incidentLabel = "INCIDENT",
    blackboxEntries,
    playbackIndex,
}: IncidentReplayLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasFittedRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderReplay() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            for (const id of entityIdsRef.current) {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            }
            entityIdsRef.current = [];

            const nextIds: string[] = [];
            const boundsPoints: { lat: number; lng: number }[] = [];

            const validFrames = blackboxEntries.filter(
                (f) =>
                    typeof f.latitude === "number" &&
                    typeof f.longitude === "number" &&
                    !Number.isNaN(f.latitude) &&
                    !Number.isNaN(f.longitude)
            );

            if (validFrames.length >= 2) {
                const positions = validFrames.map((f) => {
                    boundsPoints.push({ lat: f.latitude!, lng: f.longitude! });
                    return Cesium.Cartesian3.fromDegrees(
                        f.longitude!,
                        f.latitude!,
                        Math.max(f.altitudeMsl ?? 30, 5)
                    );
                });

                const pathId = "incident-replay-track";
                viewer.entities.add({
                    id: pathId,
                    name: "Blackbox Flight Path",
                    polyline: {
                        positions,
                        width: 3,
                        material: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.85),
                    },
                });
                nextIds.push(pathId);
            }

            if (
                typeof incidentLat === "number" &&
                typeof incidentLng === "number" &&
                !Number.isNaN(incidentLat) &&
                !Number.isNaN(incidentLng)
            ) {
                boundsPoints.push({ lat: incidentLat, lng: incidentLng });
                const originId = "incident-replay-origin";
                viewer.entities.add({
                    id: originId,
                    name: incidentLabel,
                    position: Cesium.Cartesian3.fromDegrees(
                        incidentLng,
                        incidentLat,
                        Math.max(incidentAlt ?? 20, 5)
                    ),
                    point: {
                        pixelSize: 12,
                        color: Cesium.Color.fromCssColorString("#ef4444"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: incidentLabel,
                        isSelected: false,
                        accentColor: "#ef4444",
                        pixelOffset: new Cesium.Cartesian2(0, 20),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                    }),
                });
                nextIds.push(originId);
            }

            const currentFrame = blackboxEntries[playbackIndex];
            if (
                currentFrame &&
                typeof currentFrame.latitude === "number" &&
                typeof currentFrame.longitude === "number" &&
                !Number.isNaN(currentFrame.latitude) &&
                !Number.isNaN(currentFrame.longitude)
            ) {
                boundsPoints.push({ lat: currentFrame.latitude, lng: currentFrame.longitude });
                const frameId = "incident-replay-cursor";
                const altLabel =
                    currentFrame.altitudeMsl !== undefined
                        ? `${Math.round(currentFrame.altitudeMsl)}m`
                        : "—";
                const batLabel =
                    currentFrame.batteryLevel !== undefined
                        ? `${Math.round(currentFrame.batteryLevel)}%`
                        : "—";

                viewer.entities.add({
                    id: frameId,
                    name: "Replay Position",
                    position: Cesium.Cartesian3.fromDegrees(
                        currentFrame.longitude,
                        currentFrame.latitude,
                        Math.max(currentFrame.altitudeMsl ?? 20, 5)
                    ),
                    point: {
                        pixelSize: 14,
                        color: Cesium.Color.fromCssColorString("#f59e0b"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `FRAME ${playbackIndex + 1} • ${altLabel} • ${batLabel}`,
                        isSelected: true,
                        accentColor: "#f59e0b",
                        pixelOffset: new Cesium.Cartesian2(0, -22),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -30),
                    }),
                });
                nextIds.push(frameId);
            }

            entityIdsRef.current = nextIds;

            if (!hasFittedRef.current && boundsPoints.length > 0) {
                hasFittedRef.current = true;
                fitCameraToBounds(viewer, boundsPoints, {
                    animate: false,
                    duration: 0.8,
                    minHeight: 800,
                    paddingMultiplier: 1.5,
                });
            }

            viewer.scene.requestRender();
        }

        renderReplay();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                for (const id of entityIdsRef.current) {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                }
            }
            entityIdsRef.current = [];
        };
    }, [
        viewer,
        isLoaded,
        incidentLat,
        incidentLng,
        incidentAlt,
        incidentLabel,
        blackboxEntries,
        playbackIndex,
    ]);

    return null;
}
