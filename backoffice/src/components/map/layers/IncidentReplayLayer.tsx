"use client";

import { useEffect, useRef, useState } from "react";
import type { Entity } from "cesium";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { fitCameraToBounds } from "../cesiumUtils";
import { getDroneIconUri, getIncidentOriginIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { addRouteCurtainWall } from "../cesiumOutlineUtils";
import type { BlackboxEntryVm } from "@/types";

function computeSegmentHeadingDeg(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
): number {
    const dLat = toLat - fromLat;
    const dLng = (toLng - fromLng) * Math.cos((fromLat * Math.PI) / 180);
    if (Math.abs(dLat) < 1e-8 && Math.abs(dLng) < 1e-8) return 0;
    return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
}

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
                        width: 3.4,
                        material: new Cesium.PolylineOutlineMaterialProperty({
                            color: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.92),
                            outlineColor: Cesium.Color.fromCssColorString("#071328").withAlpha(0.8),
                            outlineWidth: 1.2,
                        }),
                    },
                });
                nextIds.push(pathId);

                const curtainId = addRouteCurtainWall(Cesium, viewer, {
                    id: "incident-replay-curtain",
                    points: routePts,
                    colorCss: "#38bdf8",
                    alpha: 0.1,
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
                    billboard: {
                        image: getIncidentOriginIconUri(),
                        width: 34,
                        height: 34,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: incidentLabel,
                        isSelected: false,
                        variant: "alert",
                        accentColor: "#fca5a5",
                        pixelOffset: new Cesium.Cartesian2(0, 24),
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

            const prevFrame = playbackIndex > 0 ? blackboxEntries[playbackIndex - 1] : null;
            const nextFrame =
                playbackIndex + 1 < blackboxEntries.length
                    ? blackboxEntries[playbackIndex + 1]
                    : null;
            let headingDeg = 0;
            if (
                prevFrame &&
                typeof prevFrame.latitude === "number" &&
                typeof prevFrame.longitude === "number"
            ) {
                headingDeg = computeSegmentHeadingDeg(
                    prevFrame.latitude,
                    prevFrame.longitude,
                    currentFrame.latitude,
                    currentFrame.longitude
                );
            } else if (
                nextFrame &&
                typeof nextFrame.latitude === "number" &&
                typeof nextFrame.longitude === "number"
            ) {
                headingDeg = computeSegmentHeadingDeg(
                    currentFrame.latitude,
                    currentFrame.longitude,
                    nextFrame.latitude,
                    nextFrame.longitude
                );
            }

            if (cursorEntityRef.current) {
                cursorEntityRef.current.position = new Cesium.ConstantPositionProperty(nextPos);
                if (cursorEntityRef.current.billboard) {
                    cursorEntityRef.current.billboard.rotation = new Cesium.ConstantProperty(
                        -Cesium.Math.toRadians(headingDeg)
                    );
                }
                if (cursorEntityRef.current.label) {
                    cursorEntityRef.current.label.text = new Cesium.ConstantProperty(labelText);
                }
            } else {
                cursorEntityRef.current = viewer.entities.add({
                    id: "incident-replay-cursor",
                    name: "Replay Position",
                    position: nextPos,
                    billboard: {
                        image: getDroneIconUri("#f59e0b", "#fef3c7", { variant: "replay" }),
                        width: 36,
                        height: 36,
                        rotation: -Cesium.Math.toRadians(headingDeg),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -30),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: labelText,
                        isSelected: true,
                        variant: "aircraft",
                        accentColor: "#fbbf24",
                        pixelOffset: new Cesium.Cartesian2(0, -24),
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
