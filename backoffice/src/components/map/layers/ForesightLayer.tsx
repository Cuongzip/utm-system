"use client";

import { useEffect, useRef } from "react";
import type { Entity } from "cesium";
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
    const staticEntityIdsRef = useRef<string[]>([]);
    const ghostEntitiesRef = useRef<Map<string, Entity>>(new Map());
    const lastPredictionKeyRef = useRef<string | null>(null);

    const activeData = simulatedPrediction ?? prediction;
    const isSimPreview = Boolean(simulatedPrediction);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;
        const ghostMap = ghostEntitiesRef.current;

        async function renderStaticTracksAndConflicts() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            for (const id of staticEntityIdsRef.current) {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            }
            staticEntityIdsRef.current = [];

            if (!activeData) {
                for (const ghost of ghostMap.values()) {
                    viewer.entities.remove(ghost);
                }
                ghostMap.clear();
                viewer.scene.requestRender();
                return;
            }

            const nextStaticIds: string[] = [];
            const boundsPoints: { lat: number; lng: number }[] = [];

            const droneObjectIds = new Set<string>();
            for (const obj of activeData.objects ?? []) {
                if (obj.id && obj.kind !== "manned") {
                    droneObjectIds.add(obj.id);
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
                nextStaticIds.push(lineId);
            }

            const conflictIcon = getConflictMarkerUri("high");
            for (const c of activeData.predictedConflicts ?? []) {
                if (typeof c.location?.lat !== "number" || typeof c.location?.lon !== "number") {
                    continue;
                }
                const cId = `foresight-conflict-${c.id || nextStaticIds.length}`;
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
                        width: isSelected ? 38 : 32,
                        height: isSelected ? 38 : 32,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -45),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `CPA T+${Math.round(c.timeToConflictSec ?? 0)}s · ${Math.round(c.minSeparationM ?? 0)}m`,
                        isSelected,
                        variant: "alert",
                        accentColor: "#fca5a5",
                        pixelOffset: new Cesium.Cartesian2(0, -24),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -45),
                        maxDistance: 300000,
                    }),
                });
                nextStaticIds.push(cId);
                boundsPoints.push({ lat: c.location.lat, lng: c.location.lon });
            }

            staticEntityIdsRef.current = nextStaticIds;

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

        renderStaticTracksAndConflicts();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                for (const id of staticEntityIdsRef.current) {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                }
                viewer.scene.requestRender();
            }
            staticEntityIdsRef.current = [];
        };
    }, [viewer, isLoaded, activeData, isSimPreview, selectedConflictId]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;
        const ghostMap = ghostEntitiesRef.current;

        async function updateGhostMarkers() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const frames = activeData?.frames ?? [];
            if (!activeData || frames.length === 0) {
                for (const ghost of ghostMap.values()) {
                    viewer.entities.remove(ghost);
                }
                ghostMap.clear();
                viewer.scene.requestRender();
                return;
            }

            const objectLabelMap = new Map<string, string>();
            for (const obj of activeData.objects ?? []) {
                if (obj.id) {
                    objectLabelMap.set(obj.id, obj.label || obj.id.slice(0, 8));
                }
            }

            const safeIdx = Math.min(Math.max(frameIndex, 0), frames.length - 1);
            const currentFrame = frames[safeIdx];
            const ghostIcon = getDroneIconUri(
                isSimPreview ? "#10b981" : "#38bdf8",
                isSimPreview ? "#6ee7b7" : "#7dd3fc",
                { variant: "ghost" }
            );
            const seenIds = new Set<string>();

            for (const pt of currentFrame?.objects ?? []) {
                if (!pt.id || typeof pt.lat !== "number" || typeof pt.lon !== "number") {
                    continue;
                }
                seenIds.add(pt.id);
                const labelBase = objectLabelMap.get(pt.id) ?? pt.id.slice(0, 8);
                const labelText = `${labelBase} · T+${currentFrame.tOffsetSec ?? 0}s`;
                const nextPos = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.altitudeM ?? 80);

                const existing = ghostMap.get(pt.id);
                if (existing) {
                    existing.position = new Cesium.ConstantPositionProperty(nextPos);
                    if (existing.billboard) {
                        existing.billboard.image = new Cesium.ConstantProperty(ghostIcon);
                    }
                    if (existing.label) {
                        existing.label.text = new Cesium.ConstantProperty(labelText);
                    }
                } else {
                    const created = viewer.entities.add({
                        id: `foresight-ghost-${pt.id}`,
                        name: `Predicted: ${labelBase}`,
                        position: nextPos,
                        billboard: {
                            image: ghostIcon,
                            width: 32,
                            height: 32,
                            eyeOffset: new Cesium.Cartesian3(0, 0, -35),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        label: createTacticalLabel(Cesium, {
                            text: labelText,
                            isSelected: false,
                            variant: "aircraft",
                            accentColor: isSimPreview ? "#10b981" : "#38bdf8",
                            pixelOffset: new Cesium.Cartesian2(0, -22),
                            eyeOffset: new Cesium.Cartesian3(0, 0, -35),
                            maxDistance: 300000,
                        }),
                    });
                    ghostMap.set(pt.id, created);
                }
            }

            for (const [objId, stale] of ghostMap.entries()) {
                if (!seenIds.has(objId)) {
                    viewer.entities.remove(stale);
                    ghostMap.delete(objId);
                }
            }

            viewer.scene.requestRender();
        }

        updateGhostMarkers();

        return () => {
            cancelled = true;
        };
    }, [viewer, isLoaded, activeData, isSimPreview, frameIndex]);

    useEffect(() => {
        const ghostMap = ghostEntitiesRef.current;
        return () => {
            if (viewer && !viewer.isDestroyed()) {
                for (const ghost of ghostMap.values()) {
                    viewer.entities.remove(ghost);
                }
                viewer.scene.requestRender();
            }
            ghostMap.clear();
        };
    }, [viewer]);

    return null;
}
