"use client";

import { useEffect, useRef, useState } from "react";
import type { Entity } from "cesium";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { fitCameraToBounds } from "../cesiumUtils";
import { createTacticalLabel } from "../mapLabels";
import { addRouteCurtainWall } from "../cesiumOutlineUtils";
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
    const staticIdsRef = useRef<string[]>([]);
    const cursorEntityRef = useRef<Entity | null>(null);
    const hasFittedRef = useRef(false);
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

        let cancelled = false;

        async function renderStaticTrack() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            for (const id of staticIdsRef.current) {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            }
            staticIdsRef.current = [];

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
                const routePts: Array<{ lng: number; lat: number; alt: number }> = [];
                const positions = validFrames.map((f) => {
                    const alt = Math.max(f.altitudeMsl ?? 30, 5);
                    boundsPoints.push({ lat: f.latitude!, lng: f.longitude! });
                    routePts.push({ lng: f.longitude!, lat: f.latitude!, alt });
                    return Cesium.Cartesian3.fromDegrees(f.longitude!, f.latitude!, alt);
                });

                const pathId = "incident-replay-track";
                viewer.entities.add({
                    id: pathId,
                    name: "Blackbox Flight Path",
                    polyline: {
                        positions,
                        width: 3.2,
                        material: new Cesium.PolylineGlowMaterialProperty({
                            glowPower: 0.16,
                            color: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.9),
                        }),
                    },
                });
                nextIds.push(pathId);

                const curtainId = addRouteCurtainWall(Cesium, viewer, {
                    id: "incident-replay-curtain",
                    points: routePts,
                    colorCss: "#38bdf8",
                    alpha: 0.12,
                });
                if (curtainId) nextIds.push(curtainId);
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

            staticIdsRef.current = nextIds;

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

        renderStaticTrack();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                for (const id of staticIdsRef.current) {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                }
                viewer.scene.requestRender();
            }
            staticIdsRef.current = [];
        };
    }, [
        viewer,
        isLoaded,
        incidentLat,
        incidentLng,
        incidentAlt,
        incidentLabel,
        blackboxEntries,
        sceneRevision,
    ]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function updateCursor() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const currentFrame = blackboxEntries[playbackIndex];
            if (
                !currentFrame ||
                typeof currentFrame.latitude !== "number" ||
                typeof currentFrame.longitude !== "number" ||
                Number.isNaN(currentFrame.latitude) ||
                Number.isNaN(currentFrame.longitude)
            ) {
                if (cursorEntityRef.current) {
                    viewer.entities.remove(cursorEntityRef.current);
                    cursorEntityRef.current = null;
                    viewer.scene.requestRender();
                }
                return;
            }

            const altLabel =
                currentFrame.altitudeMsl !== undefined
                    ? `${Math.round(currentFrame.altitudeMsl)}m`
                    : "—";
            const batLabel =
                currentFrame.batteryLevel !== undefined
                    ? `${Math.round(currentFrame.batteryLevel)}%`
                    : "—";
            const labelText = `FRAME ${playbackIndex + 1} • ${altLabel} • ${batLabel}`;
            const nextPos = Cesium.Cartesian3.fromDegrees(
                currentFrame.longitude,
                currentFrame.latitude,
                Math.max(currentFrame.altitudeMsl ?? 20, 5)
            );

            if (cursorEntityRef.current) {
                cursorEntityRef.current.position = new Cesium.ConstantPositionProperty(nextPos);
                if (cursorEntityRef.current.label) {
                    cursorEntityRef.current.label.text = new Cesium.ConstantProperty(labelText);
                }
            } else {
                cursorEntityRef.current = viewer.entities.add({
                    id: "incident-replay-cursor",
                    name: "Replay Position",
                    position: nextPos,
                    point: {
                        pixelSize: 14,
                        color: Cesium.Color.fromCssColorString("#f59e0b"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: labelText,
                        isSelected: true,
                        accentColor: "#f59e0b",
                        pixelOffset: new Cesium.Cartesian2(0, -22),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -30),
                    }),
                });
            }

            viewer.scene.requestRender();
        }

        updateCursor();

        return () => {
            cancelled = true;
        };
    }, [viewer, isLoaded, blackboxEntries, playbackIndex]);

    useEffect(() => {
        return () => {
            if (viewer && !viewer.isDestroyed() && cursorEntityRef.current) {
                viewer.entities.remove(cursorEntityRef.current);
                viewer.scene.requestRender();
            }
            cursorEntityRef.current = null;
        };
    }, [viewer]);

    return null;
}
