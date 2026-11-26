"use client";

import { useEffect, useRef, useState } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { CONFLICT_SEVERITY, type Conflict, type Flight } from "@/types";
import { getConflictMarkerUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";
import {
    addAltitudeDropLine,
    buildClosedRingCartesian,
    generateGeodesicCircleRing,
} from "../cesiumOutlineUtils";

export interface ConflictsLayerProps {
    conflicts: Conflict[];
    flights?: Flight[];
    selectedConflictId?: string | null;
    autoFitBounds?: boolean;
}

function extractRouteMidpoint(flight?: Flight): { lat: number; lng: number; alt: number } | null {
    if (!flight?.plannedRoute) return null;
    let parsed: unknown = flight.plannedRoute;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    const coords =
        parsed && typeof parsed === "object" && "coordinates" in parsed
            ? (parsed as { coordinates?: unknown }).coordinates
            : null;
    if (!Array.isArray(coords) || coords.length === 0) return null;
    const mid = coords[Math.floor(coords.length / 2)];
    if (!Array.isArray(mid) || mid.length < 2) return null;
    const lng = Number(mid[0]);
    const lat = Number(mid[1]);
    const alt = typeof mid[2] === "number" ? mid[2] : (flight.cruisingAltitudeM ?? 110);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, alt };
}

export function ConflictsLayer({
    conflicts = [],
    flights = [],
    selectedConflictId,
    autoFitBounds = true,
}: ConflictsLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasInitialFitRef = useRef(false);
    const lastFocusedIdRef = useRef<string | null>(null);
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

        async function renderConflicts() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const flightMap = new Map(flights.map((f) => [f.id, f]));
            const newEntityIds: string[] = [];
            const conflictCoords: Array<{ id: string; lat: number; lng: number; alt: number }> = [];

            for (const conflict of conflicts) {
                const locLat = conflict.location?.latitude;
                const locLng = conflict.location?.longitude;
                let lat: number | undefined =
                    typeof locLat === "number" && Number.isFinite(locLat) ? locLat : undefined;
                let lng: number | undefined =
                    typeof locLng === "number" && Number.isFinite(locLng) ? locLng : undefined;
                let alt = conflict.altitude ?? 110;

                if (lat === undefined || lng === undefined) {
                    const primaryMid = conflict.primaryFlightId
                        ? extractRouteMidpoint(flightMap.get(conflict.primaryFlightId))
                        : null;
                    const secondaryMid = conflict.secondaryFlightId
                        ? extractRouteMidpoint(flightMap.get(conflict.secondaryFlightId))
                        : null;
                    if (primaryMid && secondaryMid) {
                        lat = (primaryMid.lat + secondaryMid.lat) / 2;
                        lng = (primaryMid.lng + secondaryMid.lng) / 2;
                        alt = (primaryMid.alt + secondaryMid.alt) / 2;
                    } else if (primaryMid) {
                        lat = primaryMid.lat;
                        lng = primaryMid.lng;
                        alt = primaryMid.alt;
                    }
                }

                if (lat === undefined || lng === undefined) continue;

                conflictCoords.push({ id: conflict.id, lat, lng, alt });

                const isSelected = selectedConflictId
                    ? selectedConflictId === conflict.id
                    : conflicts.length === 1;
                const isSevere =
                    conflict.severity === CONFLICT_SEVERITY.EMERGENCY ||
                    conflict.severity === CONFLICT_SEVERITY.CRITICAL ||
                    conflict.severity === CONFLICT_SEVERITY.HIGH;
                const ringColor = isSevere ? "#ef4444" : "#f59e0b";
                const radiusM = Math.max(conflict.minSeparationDistance ?? 150, 140);
                const resolvedAlt = Math.max(alt, 20);

                const sepText =
                    conflict.separationDistance != null
                        ? `CPA ${Math.round(conflict.separationDistance)}m`
                        : "CONFLICT";

                const ringDegrees = generateGeodesicCircleRing(lat, lng, radiusM, 48);
                const ringPositions = buildClosedRingCartesian(Cesium, ringDegrees, 2);

                const entityId = `conflict-marker-${conflict.id}`;
                viewer.entities.add({
                    id: entityId,
                    name: `Conflict ${sepText}`,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, resolvedAlt),
                    billboard: {
                        image: getConflictMarkerUri(),
                        width: isSelected ? 34 : 28,
                        height: isSelected ? 34 : 28,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -40),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: sepText,
                        isSelected: true,
                        accentColor: isSevere ? "#fca5a5" : "#fcd34d",
                        pixelOffset: new Cesium.Cartesian2(0, -24),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -40),
                        maxDistance: 120000,
                    }),
                    ellipse: {
                        semiMajorAxis: radiusM,
                        semiMinorAxis: radiusM,
                        height: 0,
                        material: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(ringColor),
                            isSelected ? 0.22 : 0.14
                        ),
                        outline: false,
                    },
                    polyline:
                        ringPositions.length >= 2
                            ? {
                                  positions: ringPositions,
                                  width: isSelected ? 2.6 : 1.8,
                                  material:
                                      Cesium.Color.fromCssColorString(ringColor).withAlpha(0.92),
                                  clampToGround: false,
                              }
                            : undefined,
                });
                newEntityIds.push(entityId);

                const dropId = addAltitudeDropLine(Cesium, viewer, {
                    id: `conflict-drop-${conflict.id}`,
                    lng,
                    lat,
                    altitudeM: resolvedAlt,
                    colorCss: ringColor,
                    alpha: 0.65,
                });
                if (dropId) newEntityIds.push(dropId);
            }

            entityIdsRef.current = newEntityIds;

            if (selectedConflictId && lastFocusedIdRef.current !== selectedConflictId) {
                const target = conflictCoords.find((c) => c.id === selectedConflictId);
                if (target) {
                    lastFocusedIdRef.current = selectedConflictId;
                    fitCameraToBounds(viewer, [{ lat: target.lat, lng: target.lng }], {
                        animate: true,
                        duration: 0.9,
                        minHeight: 5500,
                    });
                }
            } else if (autoFitBounds && !hasInitialFitRef.current && conflictCoords.length > 0) {
                hasInitialFitRef.current = true;
                const focusPoints = conflictCoords.map((c) => ({
                    lat: c.lat,
                    lng: c.lng,
                }));

                fitCameraToBounds(viewer, focusPoints, {
                    animate: false,
                    minHeight: 3800,
                    maxHeight: 9500,
                    paddingMultiplier: 1.5,
                });
            }

            viewer.scene.requestRender();
        }

        renderConflicts();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                entityIdsRef.current.forEach((id) => {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                });
                viewer.scene.requestRender();
            }
            entityIdsRef.current = [];
        };
    }, [viewer, isLoaded, conflicts, flights, selectedConflictId, autoFitBounds, sceneRevision]);

    return null;
}
