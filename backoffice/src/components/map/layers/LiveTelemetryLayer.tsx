"use client";

import { useEffect, useRef } from "react";
import type { Cartesian3, Entity } from "cesium";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import type { Flight, TelemetryRecord } from "@/types";
import { getDroneIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";
import { formatSpeed, isValidGeoPoint } from "@/utils";

export interface LiveTelemetryLayerProps {
    flights: Flight[];
    telemetryMap: Record<string, TelemetryRecord>;
    selectedFlightId?: string | null;
    autoFollowSelected?: boolean;
    autoFitInitialBounds?: boolean;
}

const MAX_TRAIL_POINTS = 26;
const DEFAULT_INTERP_MS = 950;

interface TrailSample {
    lng: number;
    lat: number;
    alt: number;
}

interface DroneTrackState {
    fromLng: number;
    fromLat: number;
    fromAlt: number;
    toLng: number;
    toLat: number;
    toAlt: number;
    currentLng: number;
    currentLat: number;
    currentAlt: number;
    fromHeading: number;
    toHeading: number;
    currentHeading: number;
    updatedAtMs: number;
    durationMs: number;
    trail: TrailSample[];
    droneEntity: Entity;
    trailEntity: Entity;
    tetherEntity: Entity;
    scratchPosition: Cartesian3;
    scratchTether: Cartesian3[];
    lastIconUri: string;
    lastColor: string;
    lastSelected: boolean;
    lastMaxDistance: number;
}

function shortestAngleLerp(fromDeg: number, toDeg: number, t: number): number {
    const delta = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
    return (fromDeg + delta * t + 360) % 360;
}

export function LiveTelemetryLayer({
    flights = [],
    telemetryMap = {},
    selectedFlightId,
    autoFollowSelected = true,
    autoFitInitialBounds = false,
}: LiveTelemetryLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const tracksRef = useRef<Map<string, DroneTrackState>>(new Map());
    const lastCameraFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;
        let rafPending = false;
        const tracksMap = tracksRef.current;

        const removePreRender = viewer.scene.preRender.addEventListener(() => {
            if (viewer.isDestroyed() || tracksMap.size === 0) return;

            const now = performance.now();
            let anyInterpolating = false;

            for (const state of tracksMap.values()) {
                const elapsed = now - state.updatedAtMs;
                const t = Math.min(1, Math.max(0, elapsed / state.durationMs));
                if (t < 1) {
                    anyInterpolating = true;
                }
                state.currentLng = state.fromLng + (state.toLng - state.fromLng) * t;
                state.currentLat = state.fromLat + (state.toLat - state.fromLat) * t;
                state.currentAlt = state.fromAlt + (state.toAlt - state.fromAlt) * t;
                state.currentHeading = shortestAngleLerp(state.fromHeading, state.toHeading, t);
            }

            if (anyInterpolating && !rafPending) {
                rafPending = true;
                requestAnimationFrame(() => {
                    rafPending = false;
                    if (!cancelled && !viewer.isDestroyed()) {
                        viewer.scene.requestRender();
                    }
                });
            }
        });

        return () => {
            cancelled = true;
            removePreRender();
            if (viewer && !viewer.isDestroyed()) {
                for (const state of tracksMap.values()) {
                    viewer.entities.remove(state.droneEntity);
                    viewer.entities.remove(state.trailEntity);
                    viewer.entities.remove(state.tetherEntity);
                }
                viewer.scene.requestRender();
            }
            tracksMap.clear();
        };
    }, [viewer, isLoaded]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function reconcileTelemetry() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const now = performance.now();
            const tracksMap = tracksRef.current;
            const activeFlightIds = new Set<string>();
            const allPoints: { lng: number; lat: number }[] = [];
            const coordBucket: Record<string, number> = {};
            let focusedDronePos: { lng: number; lat: number; alt: number } | null = null;
            const hasSelectedTarget = Boolean(selectedFlightId);

            const coordTotals: Record<string, number> = {};
            for (const f of flights) {
                const tel = telemetryMap[f.id];
                if (
                    tel &&
                    typeof tel.longitude === "number" &&
                    typeof tel.latitude === "number" &&
                    isValidGeoPoint(tel.latitude, tel.longitude)
                ) {
                    const key = `${tel.latitude.toFixed(2)}_${tel.longitude.toFixed(2)}`;
                    coordTotals[key] = (coordTotals[key] ?? 0) + 1;
                }
            }

            for (const flight of flights) {
                const telemetry = telemetryMap[flight.id];
                if (
                    !telemetry ||
                    typeof telemetry.longitude !== "number" ||
                    typeof telemetry.latitude !== "number" ||
                    !isValidGeoPoint(telemetry.latitude, telemetry.longitude)
                ) {
                    continue;
                }

                activeFlightIds.add(flight.id);
                const isSelected = selectedFlightId === flight.id;
                const droneLng = telemetry.longitude;
                const droneLat = telemetry.latitude;
                const droneAlt =
                    typeof telemetry.altitude === "number" && telemetry.altitude >= 0
                        ? telemetry.altitude
                        : 120;
                const droneHeading = telemetry.heading ?? 0;

                allPoints.push({ lng: droneLng, lat: droneLat });
                if (isSelected) {
                    focusedDronePos = { lng: droneLng, lat: droneLat, alt: droneAlt };
                }

                const bucketKey = `${droneLat.toFixed(2)}_${droneLng.toFixed(2)}`;
                const stackIdx = coordBucket[bucketKey] ?? 0;
                coordBucket[bucketKey] = stackIdx + 1;
                const sectorCount = coordTotals[bucketKey] ?? 1;

                const hasAlert =
                    telemetry.batteryPercentage !== undefined && telemetry.batteryPercentage < 20;
                const droneColor = hasAlert ? "#ef4444" : isSelected ? "#00e5ff" : "#10b981";
                const iconUri = getDroneIconUri(droneColor, isSelected ? "#00e5ff" : "#ffffff");
                const showFullLabel = isSelected || (!hasSelectedTarget && stackIdx === 0);
                const maxDistance = isSelected ? 250000 : hasSelectedTarget ? 10000 : 18000;
                const clusterSuffix =
                    !isSelected && sectorCount > 1 ? ` (+${sectorCount - 1})` : "";
                const labelText = isSelected
                    ? `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m • ${formatSpeed(telemetry.speed)}`
                    : `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m${clusterSuffix}`;

                const state = tracksMap.get(flight.id);

                if (!state) {
                    const scratchPosition = Cesium.Cartesian3.fromDegrees(
                        droneLng,
                        droneLat,
                        droneAlt
                    );
                    const scratchTether = [
                        Cesium.Cartesian3.fromDegrees(droneLng, droneLat, 0),
                        Cesium.Cartesian3.fromDegrees(droneLng, droneLat, droneAlt),
                    ];

                    const newState: DroneTrackState = {
                        fromLng: droneLng,
                        fromLat: droneLat,
                        fromAlt: droneAlt,
                        toLng: droneLng,
                        toLat: droneLat,
                        toAlt: droneAlt,
                        currentLng: droneLng,
                        currentLat: droneLat,
                        currentAlt: droneAlt,
                        fromHeading: droneHeading,
                        toHeading: droneHeading,
                        currentHeading: droneHeading,
                        updatedAtMs: now,
                        durationMs: DEFAULT_INTERP_MS,
                        trail: [{ lng: droneLng, lat: droneLat, alt: droneAlt }],
                        droneEntity: null as unknown as Entity,
                        trailEntity: null as unknown as Entity,
                        tetherEntity: null as unknown as Entity,
                        scratchPosition,
                        scratchTether,
                        lastIconUri: iconUri,
                        lastColor: droneColor,
                        lastSelected: isSelected,
                        lastMaxDistance: maxDistance,
                    };

                    const dynamicPos = new Cesium.CallbackPositionProperty(() => {
                        return Cesium.Cartesian3.fromDegrees(
                            newState.currentLng,
                            newState.currentLat,
                            newState.currentAlt,
                            undefined,
                            newState.scratchPosition
                        );
                    }, false);

                    const dynamicRotation = new Cesium.CallbackProperty(
                        () => -Cesium.Math.toRadians(newState.currentHeading),
                        false
                    );

                    const droneEntity = viewer.entities.add({
                        id: `drone-live-${flight.id}`,
                        name:
                            flight.flightNumber || `Drone ${flight.droneId?.slice(0, 8) || "UAV"}`,
                        position: dynamicPos,
                        billboard: {
                            image: iconUri,
                            width: isSelected ? 34 : 26,
                            height: isSelected ? 34 : 26,
                            rotation: dynamicRotation,
                            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -35 : -28),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        label: createTacticalLabel(Cesium, {
                            text: labelText,
                            isSelected,
                            accentColor: "#00e5ff",
                            pixelOffset: new Cesium.Cartesian2(0, isSelected ? -22 : -18),
                            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -35 : -28),
                            maxDistance,
                        }),
                    });
                    if (droneEntity.label) {
                        droneEntity.label.show = new Cesium.ConstantProperty(showFullLabel);
                    }

                    const trailEntity = viewer.entities.add({
                        id: `drone-trail-${flight.id}`,
                        polyline: {
                            positions: new Cesium.CallbackProperty(() => {
                                const pts = newState.trail;
                                const flat: number[] = [];
                                for (const s of pts) {
                                    flat.push(s.lng, s.lat, s.alt);
                                }
                                flat.push(
                                    newState.currentLng,
                                    newState.currentLat,
                                    newState.currentAlt
                                );
                                return flat.length >= 6
                                    ? Cesium.Cartesian3.fromDegreesArrayHeights(flat)
                                    : [];
                            }, false),
                            width: isSelected ? 3.8 : 2.6,
                            material: new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.22,
                                taperPower: 0.45,
                                color: Cesium.Color.fromCssColorString(droneColor).withAlpha(
                                    isSelected ? 0.92 : 0.72
                                ),
                            }),
                        },
                    });

                    const tetherEntity = viewer.entities.add({
                        id: `drone-tether-${flight.id}`,
                        polyline: {
                            show: new Cesium.CallbackProperty(
                                () =>
                                    !viewer.isDestroyed() &&
                                    viewer.scene.mode === Cesium.SceneMode.SCENE3D &&
                                    newState.currentAlt > 8,
                                false
                            ),
                            positions: new Cesium.CallbackProperty(() => {
                                Cesium.Cartesian3.fromDegrees(
                                    newState.currentLng,
                                    newState.currentLat,
                                    0,
                                    undefined,
                                    newState.scratchTether[0]
                                );
                                Cesium.Cartesian3.fromDegrees(
                                    newState.currentLng,
                                    newState.currentLat,
                                    newState.currentAlt,
                                    undefined,
                                    newState.scratchTether[1]
                                );
                                return newState.scratchTether;
                            }, false),
                            width: 1.4,
                            material: new Cesium.PolylineDashMaterialProperty({
                                color: Cesium.Color.fromCssColorString(droneColor).withAlpha(0.55),
                                dashLength: 10,
                            }),
                        },
                    });

                    newState.droneEntity = droneEntity;
                    newState.trailEntity = trailEntity;
                    newState.tetherEntity = tetherEntity;
                    tracksMap.set(flight.id, newState);
                } else {
                    const movedMeters =
                        Math.hypot(
                            (droneLat - state.toLat) * 111320,
                            (droneLng - state.toLng) * 111320
                        ) + Math.abs(droneAlt - state.toAlt);

                    if (movedMeters > 0.25 || Math.abs(droneHeading - state.toHeading) > 0.5) {
                        const dt = Math.min(Math.max(now - state.updatedAtMs, 250), 2000);
                        if (movedMeters > 2) {
                            state.trail.push({
                                lng: state.toLng,
                                lat: state.toLat,
                                alt: state.toAlt,
                            });
                            if (state.trail.length > MAX_TRAIL_POINTS) {
                                state.trail.shift();
                            }
                        }
                        state.fromLng = state.currentLng;
                        state.fromLat = state.currentLat;
                        state.fromAlt = state.currentAlt;
                        state.fromHeading = state.currentHeading;
                        state.toLng = droneLng;
                        state.toLat = droneLat;
                        state.toAlt = droneAlt;
                        state.toHeading = droneHeading;
                        state.durationMs = dt * 0.94;
                        state.updatedAtMs = now;
                    }

                    const selectionChanged = state.lastSelected !== isSelected;
                    const colorChanged = state.lastColor !== droneColor;
                    const maxDistChanged = state.lastMaxDistance !== maxDistance;

                    if (state.droneEntity.billboard) {
                        if (state.lastIconUri !== iconUri) {
                            state.droneEntity.billboard.image = new Cesium.ConstantProperty(
                                iconUri
                            );
                            state.lastIconUri = iconUri;
                        }
                        if (selectionChanged) {
                            const size = isSelected ? 34 : 26;
                            state.droneEntity.billboard.width = new Cesium.ConstantProperty(size);
                            state.droneEntity.billboard.height = new Cesium.ConstantProperty(size);
                            state.droneEntity.billboard.eyeOffset = new Cesium.ConstantProperty(
                                new Cesium.Cartesian3(0, 0, isSelected ? -35 : -28)
                            );
                        }
                    }

                    if (state.droneEntity.label) {
                        state.droneEntity.label.show = new Cesium.ConstantProperty(showFullLabel);
                        state.droneEntity.label.text = new Cesium.ConstantProperty(labelText);
                        state.droneEntity.label.pixelOffset = new Cesium.ConstantProperty(
                            new Cesium.Cartesian2(0, isSelected ? -22 : -18)
                        );

                        if (selectionChanged || maxDistChanged) {
                            const fadeStart = Math.max(2500, maxDistance * 0.62);
                            state.droneEntity.label.font = new Cesium.ConstantProperty(
                                `${isSelected ? "bold" : "600"} 11px monospace`
                            );
                            state.droneEntity.label.fillColor = new Cesium.ConstantProperty(
                                isSelected
                                    ? Cesium.Color.fromCssColorString("#00e5ff")
                                    : Cesium.Color.WHITE
                            );
                            state.droneEntity.label.backgroundColor = new Cesium.ConstantProperty(
                                isSelected
                                    ? new Cesium.Color(0.02, 0.14, 0.25, 0.94)
                                    : new Cesium.Color(0.04, 0.08, 0.16, 0.88)
                            );
                            state.droneEntity.label.eyeOffset = new Cesium.ConstantProperty(
                                new Cesium.Cartesian3(0, 0, isSelected ? -35 : -28)
                            );
                            state.droneEntity.label.scaleByDistance = new Cesium.ConstantProperty(
                                isSelected
                                    ? new Cesium.NearFarScalar(1500, 1.04, maxDistance, 0.88)
                                    : new Cesium.NearFarScalar(1500, 1.0, maxDistance, 0.78)
                            );
                            state.droneEntity.label.translucencyByDistance = isSelected
                                ? undefined
                                : new Cesium.ConstantProperty(
                                      new Cesium.NearFarScalar(fadeStart, 1.0, maxDistance, 0.0)
                                  );
                            state.droneEntity.label.distanceDisplayCondition =
                                new Cesium.ConstantProperty(
                                    new Cesium.DistanceDisplayCondition(0, maxDistance)
                                );
                        }
                    }

                    if (selectionChanged || colorChanged) {
                        if (state.trailEntity.polyline) {
                            state.trailEntity.polyline.width = new Cesium.ConstantProperty(
                                isSelected ? 3.8 : 2.6
                            );
                            state.trailEntity.polyline.material =
                                new Cesium.PolylineGlowMaterialProperty({
                                    glowPower: 0.22,
                                    taperPower: 0.45,
                                    color: Cesium.Color.fromCssColorString(droneColor).withAlpha(
                                        isSelected ? 0.92 : 0.72
                                    ),
                                });
                        }
                        if (state.tetherEntity.polyline) {
                            state.tetherEntity.polyline.material =
                                new Cesium.PolylineDashMaterialProperty({
                                    color: Cesium.Color.fromCssColorString(droneColor).withAlpha(
                                        0.55
                                    ),
                                    dashLength: 10,
                                });
                        }
                    }

                    state.lastSelected = isSelected;
                    state.lastColor = droneColor;
                    state.lastMaxDistance = maxDistance;
                }
            }

            for (const [flightId, stale] of tracksMap.entries()) {
                if (!activeFlightIds.has(flightId)) {
                    viewer.entities.remove(stale.droneEntity);
                    viewer.entities.remove(stale.trailEntity);
                    viewer.entities.remove(stale.tetherEntity);
                    tracksMap.delete(flightId);
                }
            }

            if (autoFollowSelected && focusedDronePos) {
                const cameraKey = `${selectedFlightId}_initial`;
                if (lastCameraFocusRef.current !== cameraKey) {
                    lastCameraFocusRef.current = cameraKey;
                    fitCameraToBounds(
                        viewer,
                        [{ lat: focusedDronePos.lat, lng: focusedDronePos.lng }],
                        {
                            animate: true,
                            duration: 1.0,
                            minHeight: Math.max(focusedDronePos.alt * 10, 4500),
                        }
                    );
                }
            } else if (
                autoFitInitialBounds &&
                allPoints.length > 0 &&
                !lastCameraFocusRef.current
            ) {
                lastCameraFocusRef.current = "bounds_fit";
                fitCameraToBounds(viewer, allPoints, { animate: false });
            }

            viewer.scene.requestRender();
        }

        reconcileTelemetry();

        return () => {
            cancelled = true;
        };
    }, [
        viewer,
        isLoaded,
        flights,
        telemetryMap,
        selectedFlightId,
        autoFollowSelected,
        autoFitInitialBounds,
    ]);

    return null;
}
