"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { getDroneIconUri, getConflictMarkerUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";
import type { ForesightPrediction } from "@/types";

export interface ForesightLayerProps {
    prediction: ForesightPrediction | null;
    simulatedPrediction: ForesightPrediction | null;
    frameIndex: number;
    selectedConflictId?: string | null;
}

export function ForesightLayer({
    prediction,
    simulatedPrediction,
    frameIndex,
    selectedConflictId,
}: ForesightLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const lastPredictionKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderForesight() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            for (const id of entityIdsRef.current) {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            }
            entityIdsRef.current = [];

            const activeData = simulatedPrediction ?? prediction;
            if (!activeData) {
                viewer.scene.requestRender();
                return;
            }

            const nextIds: string[] = [];
            const boundsPoints: { lat: number; lng: number }[] = [];
            const isSimPreview = Boolean(simulatedPrediction);

            const objectLabelMap = new Map<string, string>();
            const droneObjectIds = new Set<string>();
            for (const obj of activeData.objects ?? []) {
                if (obj.id) {
                    objectLabelMap.set(obj.id, obj.label || obj.id.slice(0, 8));
                    if (obj.kind !== "manned") {
                        droneObjectIds.add(obj.id);
                    }
                }
            }

            const frames = activeData.frames ?? [];
            const trackMap = new Map<string, number[]>();

            for (const frame of frames) {
                for (const pt of frame.objects ?? []) {
                    if (!pt.id || typeof pt.lat !== "number" || typeof pt.lon !== "number") {
                        continue;
                    }
                    const coords = trackMap.get(pt.id) ?? [];
                    coords.push(pt.lon, pt.lat, pt.altitudeM ?? 80);
                    trackMap.set(pt.id, coords);
                    if (droneObjectIds.has(pt.id)) {
                        boundsPoints.push({ lat: pt.lat, lng: pt.lon });
                    }
                }
            }

            const trackColor = isSimPreview
                ? Cesium.Color.fromCssColorString("#10b981")
                : Cesium.Color.fromCssColorString("#38bdf8");

            for (const [objId, flatCoords] of trackMap.entries()) {
                if (flatCoords.length < 6) continue;
                const lineId = `foresight-track-${objId}`;
                viewer.entities.add({
                    id: lineId,
                    polyline: {
                        positions: Cesium.Cartesian3.fromDegreesArrayHeights(flatCoords),
                        width: isSimPreview ? 3.5 : 2.5,
                        material: new Cesium.PolylineDashMaterialProperty({
                            color: trackColor.withAlpha(0.85),
                            dashLength: 14,
                        }),
                    },
                });
                nextIds.push(lineId);
            }

            const safeIdx = Math.min(Math.max(frameIndex, 0), Math.max(frames.length - 1, 0));
            const currentFrame = frames[safeIdx];
            if (currentFrame) {
                const ghostIcon = getDroneIconUri(isSimPreview ? "#10b981" : "#38bdf8", "#ffffff");
                for (const pt of currentFrame.objects ?? []) {
                    if (!pt.id || typeof pt.lat !== "number" || typeof pt.lon !== "number") {
                        continue;
                    }
                    const ghostId = `foresight-ghost-${pt.id}`;
                    const labelText = objectLabelMap.get(pt.id) ?? pt.id.slice(0, 8);
                    viewer.entities.add({
                        id: ghostId,
                        name: `Predicted: ${labelText}`,
                        position: Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.altitudeM ?? 80),
                        billboard: {
                            image: ghostIcon,
                            width: 26,
                            height: 26,
                            eyeOffset: new Cesium.Cartesian3(0, 0, -35),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        label: createTacticalLabel(Cesium, {
                            text: `${labelText} · T+${currentFrame.tOffsetSec ?? 0}s`,
                            isSelected: false,
                            accentColor: isSimPreview ? "#10b981" : "#38bdf8",
                            pixelOffset: new Cesium.Cartesian2(0, -18),
                            eyeOffset: new Cesium.Cartesian3(0, 0, -35),
                            maxDistance: 300000,
                        }),
                    });
                    nextIds.push(ghostId);
                }
            }

            const conflictIcon = getConflictMarkerUri();
            for (const c of activeData.predictedConflicts ?? []) {
                if (typeof c.location?.lat !== "number" || typeof c.location?.lon !== "number") {
                    continue;
                }
                const cId = `foresight-conflict-${c.id || nextIds.length}`;
                const isSelected = Boolean(c.id && selectedConflictId === c.id);
                viewer.entities.add({
                    id: cId,
                    name: `Predicted CPA: ${c.primary?.label || "UAV 1"} / ${c.secondary?.label || "UAV 2"}`,
                    position: Cesium.Cartesian3.fromDegrees(
                        c.location.lon,
                        c.location.lat,
                        c.altitudeM ?? 80
                    ),
                    billboard: {
                        image: conflictIcon,
                        width: isSelected ? 36 : 30,
                        height: isSelected ? 36 : 30,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -45),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `CPA T+${Math.round(c.timeToConflictSec ?? 0)}s · ${Math.round(c.minSeparationM ?? 0)}m`,
                        isSelected,
                        accentColor: "#ef4444",
                        pixelOffset: new Cesium.Cartesian2(0, -22),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -45),
                        maxDistance: 300000,
                    }),
                });
                nextIds.push(cId);
                boundsPoints.push({ lat: c.location.lat, lng: c.location.lon });
            }

            entityIdsRef.current = nextIds;

            const predKey = activeData.generatedAt ?? null;
            if (predKey && predKey !== lastPredictionKeyRef.current && boundsPoints.length > 0) {
                lastPredictionKeyRef.current = predKey;
                fitCameraToBounds(viewer, boundsPoints, {
                    animate: true,
                    duration: 1.0,
                    minHeight: 1500,
                });
            }

            viewer.scene.requestRender();
        }

        renderForesight();

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
    }, [viewer, isLoaded, prediction, simulatedPrediction, frameIndex, selectedConflictId]);

    return null;
}
