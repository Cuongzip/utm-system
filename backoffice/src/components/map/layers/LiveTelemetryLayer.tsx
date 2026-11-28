"use client";

import { memo, useEffect, useRef } from "react";
import type { Cartesian3, CustomDataSource, Entity } from "cesium";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import type { Flight, TelemetryRecord } from "@/types";
import { getDroneIconUri, type DroneIconVariant } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";
import {
    deleteLiveInterpolatedPosition,
    setLiveInterpolatedPosition,
} from "../livePositionRegistry";
import { formatSpeed, isValidGeoPoint } from "@/utils";

export interface LiveTelemetryLayerProps {
    flights: Flight[];
    telemetryMap: Record<string, TelemetryRecord>;
    selectedFlightId?: string | null;
    autoFollowSelected?: boolean;
    autoFitInitialBounds?: boolean;
    showTrail?: boolean;
    interpolate?: boolean;
    variant?: "live" | "replay";
}

const MAX_TRAIL_POINTS = 26;
const DEFAULT_INTERP_MS = 950;
const MONO_FONT_FAMILY = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

interface TrailSample {
    lng: number;
    lat: number;
    alt: number;
}

interface DroneTrackState {
    flightId: string;
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
    avgIntervalMs: number;
    durationMs: number;
    trail: TrailSample[];
    droneEntity: Entity;
    trailEntity: Entity | null;
    tetherEntity: Entity;
    scratchPosition: Cartesian3;
    scratchTether: Cartesian3[];
    lastIconUri: string;
    lastColor: string;
    lastSelected: boolean;
    lastMaxDistance: number;
    lastLabelAccent: string;
    lastLabelText: string;
    lastShowFullLabel: boolean;
}

function shortestAngleLerp(fromDeg: number, toDeg: number, t: number): number {
    const delta = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
    return (fromDeg + delta * t + 360) % 360;
}

export const LiveTelemetryLayer = memo(function LiveTelemetryLayer({
    flights = [],
    telemetryMap = {},
    selectedFlightId,
    autoFollowSelected = true,
    autoFitInitialBounds = false,
    showTrail = true,
    interpolate = true,
    variant = "live",
}: LiveTelemetryLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const tracksRef = useRef<Map<string, DroneTrackState>>(new Map());
    const dataSourceRef = useRef<CustomDataSource | null>(null);
    const cesiumRef = useRef<typeof import("cesium") | null>(null);
    const anyInterpolatingRef = useRef(false);
    const lastCameraFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;
        const tracksMap = tracksRef.current;

        getCesium().then((mod) => {
            if (!cancelled) {
                cesiumRef.current = mod;
            }
        });

        // Advance interpolated UAV positions in preUpdate (before DataSourceDisplay & trackedEntity
        // camera follow) and schedule the next frame directly in postRender so requestRenderMode
        // runs at a smooth locked 60 FPS with zero Follow-UAV 1-frame lag.
        const removePreUpdate = viewer.scene.preUpdate.addEventListener(() => {
            if (viewer.isDestroyed() || tracksMap.size === 0) {
                anyInterpolatingRef.current = false;
                return;
            }

            const now = performance.now();
            let anyInterpolating = false;

            for (const state of tracksMap.values()) {
                if (state.durationMs <= 0) {
                    state.currentLng = state.toLng;
                    state.currentLat = state.toLat;
                    state.currentAlt = state.toAlt;
                    state.currentHeading = state.toHeading;
                } else {
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
                setLiveInterpolatedPosition(
                    state.flightId,
                    state.currentLng,
                    state.currentLat,
                    state.currentAlt,
                    state.currentHeading
                );
            }

            anyInterpolatingRef.current = anyInterpolating;
        });

        const removePostRender = viewer.scene.postRender.addEventListener(() => {
            if (!cancelled && anyInterpolatingRef.current && !viewer.isDestroyed()) {
                viewer.scene.requestRender();
            }
        });

        return () => {
            cancelled = true;
            anyInterpolatingRef.current = false;
            removePreUpdate();
            removePostRender();
            const ds = dataSourceRef.current;
            for (const flightId of tracksMap.keys()) {
                deleteLiveInterpolatedPosition(flightId);
            }
            if (viewer && !viewer.isDestroyed()) {
                if (ds && viewer.dataSources.contains(ds)) {
                    viewer.dataSources.remove(ds, true);
                } else {
                    for (const state of tracksMap.values()) {
                        viewer.entities.remove(state.droneEntity);
                        if (state.trailEntity) viewer.entities.remove(state.trailEntity);
                        viewer.entities.remove(state.tetherEntity);
                    }
                }
                viewer.scene.requestRender();
            }
            dataSourceRef.current = null;
            tracksMap.clear();
        };
    }, [viewer, isLoaded]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function reconcileTelemetry() {
            const Cesium = cesiumRef.current ?? (await getCesium());
            cesiumRef.current = Cesium;
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            // Keep live/replay UAV billboards in a top-most CustomDataSource so they always
            // render above Hub/Airspace/Flight billboards in viewer.entities in both 2D and 3D.
            let ds = dataSourceRef.current;
            if (!ds) {
                ds = new Cesium.CustomDataSource("utm-live-telemetry");
                dataSourceRef.current = ds;
                await viewer.dataSources.add(ds);
                if (viewer.isDestroyed()) return;
                if (dataSourceRef.current !== ds) {
                    if (viewer.dataSources.contains(ds)) {
                        viewer.dataSources.remove(ds, true);
                    }
                    return;
                }
                if (cancelled) return;
            }
            const dsCount = viewer.dataSources.length;
            if (dsCount > 1 && viewer.dataSources.indexOf(ds) !== dsCount - 1) {
                viewer.dataSources.raiseToTop(ds);
            }
            const entities = ds.entities;

            const now = performance.now();
            const tracksMap = tracksRef.current;
            const activeFlightIds = new Set<string>();
            const allPoints: { lng: number; lat: number }[] = [];
            const coordBucket: Record<string, number> = {};
            let focusedDronePos: { lng: number; lat: number; alt: number } | null = null;
            const hasSelectedTarget = Boolean(selectedFlightId);
            const isReplayVariant = variant === "replay";

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

            const createTrailEntity = (
                flightId: string,
                stateRef: DroneTrackState,
                colorHex: string,
                selected: boolean
            ): Entity =>
                entities.add({
                    id: `drone-trail-${flightId}`,
                    polyline: {
                        positions: new Cesium.CallbackProperty(() => {
                            const pts = stateRef.trail;
                            const flat: number[] = [];
                            for (const s of pts) {
                                flat.push(s.lng, s.lat, s.alt);
                            }
                            flat.push(
                                stateRef.currentLng,
                                stateRef.currentLat,
                                stateRef.currentAlt
                            );
                            return flat.length >= 6
                                ? Cesium.Cartesian3.fromDegreesArrayHeights(flat)
                                : [];
                        }, false),
                        width: selected ? 3.2 : 2.2,
                        material: new Cesium.PolylineOutlineMaterialProperty({
                            color: Cesium.Color.fromCssColorString(colorHex).withAlpha(
                                selected ? 0.88 : 0.68
                            ),
                            outlineColor: Cesium.Color.fromCssColorString("#071328").withAlpha(0.6),
                            outlineWidth: 1,
                        }),
                    },
                });

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
                const iconVariant: DroneIconVariant = hasAlert
                    ? "alert"
                    : isReplayVariant
                      ? "replay"
                      : isSelected
                        ? "selected"
                        : "live";
                const droneColor = hasAlert
                    ? "#ef4444"
                    : isReplayVariant
                      ? "#f59e0b"
                      : isSelected
                        ? "#00e5ff"
                        : "#10b981";
                const outlineColor = hasAlert
                    ? "#fca5a5"
                    : isReplayVariant
                      ? "#fef3c7"
                      : isSelected
                        ? "#00e5ff"
                        : "#ffffff";
                const labelAccentColor = hasAlert
                    ? "#fca5a5"
                    : isReplayVariant
                      ? "#fbbf24"
                      : "#00e5ff";

                const iconUri = getDroneIconUri(droneColor, outlineColor, {
                    variant: iconVariant,
                });
                const iconSize = isSelected ? 44 : 36;
                const showFullLabel = isSelected || (!hasSelectedTarget && stackIdx === 0);
                const maxDistance = isSelected ? 250000 : hasSelectedTarget ? 10000 : 18000;
                const clusterSuffix =
                    !isSelected && sectorCount > 1 ? ` (+${sectorCount - 1})` : "";
                const labelText = isSelected
                    ? `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m • ${formatSpeed(telemetry.speed)}`
                    : `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m${clusterSuffix}`;

                const state = tracksMap.get(flight.id);

                if (!state) {
                    const initialRenderAlt =
                        viewer.scene.mode === Cesium.SceneMode.SCENE3D ? Math.max(droneAlt, 2) : 25;
                    const scratchPosition = Cesium.Cartesian3.fromDegrees(
                        droneLng,
                        droneLat,
                        initialRenderAlt
                    );
                    const scratchTether = [
                        Cesium.Cartesian3.fromDegrees(droneLng, droneLat, 0),
                        Cesium.Cartesian3.fromDegrees(droneLng, droneLat, droneAlt),
                    ];

                    const newState: DroneTrackState = {
                        flightId: flight.id,
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
                        avgIntervalMs: DEFAULT_INTERP_MS,
                        durationMs: interpolate ? DEFAULT_INTERP_MS : 0,
                        trail: showTrail ? [{ lng: droneLng, lat: droneLat, alt: droneAlt }] : [],
                        droneEntity: null as unknown as Entity,
                        trailEntity: null,
                        tetherEntity: null as unknown as Entity,
                        scratchPosition,
                        scratchTether,
                        lastIconUri: iconUri,
                        lastColor: droneColor,
                        lastSelected: isSelected,
                        lastMaxDistance: maxDistance,
                        lastLabelAccent: labelAccentColor,
                        lastLabelText: labelText,
                        lastShowFullLabel: showFullLabel,
                    };

                    setLiveInterpolatedPosition(
                        flight.id,
                        droneLng,
                        droneLat,
                        droneAlt,
                        droneHeading
                    );

                    const dynamicPos = new Cesium.CallbackPositionProperty(() => {
                        const is3D =
                            !viewer.isDestroyed() && viewer.scene.mode === Cesium.SceneMode.SCENE3D;
                        const renderAlt = is3D ? Math.max(newState.currentAlt, 2) : 25;
                        return Cesium.Cartesian3.fromDegrees(
                            newState.currentLng,
                            newState.currentLat,
                            renderAlt,
                            undefined,
                            newState.scratchPosition
                        );
                    }, false);

                    const dynamicRotation = new Cesium.CallbackProperty(
                        () => -Cesium.Math.toRadians(newState.currentHeading),
                        false
                    );

                    const droneEntity = entities.add({
                        id: `drone-live-${flight.id}`,
                        name:
                            flight.flightNumber || `Drone ${flight.droneId?.slice(0, 8) || "UAV"}`,
                        position: dynamicPos,
                        billboard: {
                            image: iconUri,
                            width: iconSize,
                            height: iconSize,
                            rotation: dynamicRotation,
                            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -50 : -30),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        label: createTacticalLabel(Cesium, {
                            text: labelText,
                            isSelected,
                            variant: hasAlert ? "alert" : "aircraft",
                            accentColor: labelAccentColor,
                            pixelOffset: new Cesium.Cartesian2(0, isSelected ? -32 : -26),
                            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -55 : -32),
                            maxDistance,
                        }),
                    });
                    if (droneEntity.label) {
                        droneEntity.label.show = new Cesium.ConstantProperty(showFullLabel);
                    }

                    const trailEntity = showTrail
                        ? createTrailEntity(flight.id, newState, droneColor, isSelected)
                        : null;

                    const tetherEntity = entities.add({
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

                    if (!interpolate) {
                        state.fromLng = droneLng;
                        state.fromLat = droneLat;
                        state.fromAlt = droneAlt;
                        state.toLng = droneLng;
                        state.toLat = droneLat;
                        state.toAlt = droneAlt;
                        state.currentLng = droneLng;
                        state.currentLat = droneLat;
                        state.currentAlt = droneAlt;
                        state.fromHeading = droneHeading;
                        state.toHeading = droneHeading;
                        state.currentHeading = droneHeading;
                        state.durationMs = 0;
                        state.updatedAtMs = now;
                        setLiveInterpolatedPosition(
                            flight.id,
                            droneLng,
                            droneLat,
                            droneAlt,
                            droneHeading
                        );
                    } else if (
                        movedMeters > 0.15 ||
                        Math.abs(droneHeading - state.toHeading) > 0.4
                    ) {
                        const rawDt = Math.min(Math.max(now - state.updatedAtMs, 60), 2400);
                        state.avgIntervalMs = state.avgIntervalMs * 0.55 + rawDt * 0.45;
                        if (showTrail && movedMeters > 2) {
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
                        state.durationMs = Math.min(Math.max(state.avgIntervalMs * 1.06, 85), 2200);
                        state.updatedAtMs = now;
                        anyInterpolatingRef.current = true;
                    }

                    if (!showTrail && state.trailEntity) {
                        entities.remove(state.trailEntity);
                        state.trailEntity = null;
                        state.trail = [];
                    } else if (showTrail && !state.trailEntity) {
                        state.trail = [{ lng: droneLng, lat: droneLat, alt: droneAlt }];
                        state.trailEntity = createTrailEntity(
                            flight.id,
                            state,
                            droneColor,
                            isSelected
                        );
                    }

                    const selectionChanged = state.lastSelected !== isSelected;
                    const colorChanged = state.lastColor !== droneColor;
                    const maxDistChanged = state.lastMaxDistance !== maxDistance;
                    const accentChanged = state.lastLabelAccent !== labelAccentColor;

                    if (state.droneEntity.billboard) {
                        if (state.lastIconUri !== iconUri) {
                            state.droneEntity.billboard.image = new Cesium.ConstantProperty(
                                iconUri
                            );
                            state.lastIconUri = iconUri;
                        }
                        if (selectionChanged) {
                            state.droneEntity.billboard.width = new Cesium.ConstantProperty(
                                iconSize
                            );
                            state.droneEntity.billboard.height = new Cesium.ConstantProperty(
                                iconSize
                            );
                            state.droneEntity.billboard.eyeOffset = new Cesium.ConstantProperty(
                                new Cesium.Cartesian3(0, 0, isSelected ? -50 : -30)
                            );
                        }
                    }

                    if (state.droneEntity.label) {
                        if (state.lastShowFullLabel !== showFullLabel) {
                            state.droneEntity.label.show = new Cesium.ConstantProperty(
                                showFullLabel
                            );
                            state.lastShowFullLabel = showFullLabel;
                        }
                        if (state.lastLabelText !== labelText) {
                            state.droneEntity.label.text = new Cesium.ConstantProperty(labelText);
                            state.lastLabelText = labelText;
                        }
                        if (selectionChanged) {
                            state.droneEntity.label.pixelOffset = new Cesium.ConstantProperty(
                                new Cesium.Cartesian2(0, isSelected ? -32 : -26)
                            );
                        }

                        if (selectionChanged || maxDistChanged || accentChanged) {
                            const fadeStart = Math.max(2500, maxDistance * 0.62);
                            state.droneEntity.label.font = new Cesium.ConstantProperty(
                                `${isSelected ? "700" : "600"} 11px ${MONO_FONT_FAMILY}`
                            );
                            state.droneEntity.label.fillColor = new Cesium.ConstantProperty(
                                isSelected
                                    ? Cesium.Color.fromCssColorString(labelAccentColor)
                                    : Cesium.Color.WHITE
                            );
                            state.droneEntity.label.backgroundColor = new Cesium.ConstantProperty(
                                isSelected
                                    ? new Cesium.Color(0.02, 0.14, 0.25, 0.94)
                                    : new Cesium.Color(0.04, 0.08, 0.16, 0.88)
                            );
                            state.droneEntity.label.eyeOffset = new Cesium.ConstantProperty(
                                new Cesium.Cartesian3(0, 0, isSelected ? -55 : -32)
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
                        if (state.trailEntity?.polyline) {
                            state.trailEntity.polyline.width = new Cesium.ConstantProperty(
                                isSelected ? 3.2 : 2.2
                            );
                            state.trailEntity.polyline.material =
                                new Cesium.PolylineOutlineMaterialProperty({
                                    color: Cesium.Color.fromCssColorString(droneColor).withAlpha(
                                        isSelected ? 0.88 : 0.68
                                    ),
                                    outlineColor:
                                        Cesium.Color.fromCssColorString("#071328").withAlpha(0.6),
                                    outlineWidth: 1,
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
                    state.lastLabelAccent = labelAccentColor;
                }
            }

            for (const [flightId, stale] of tracksMap.entries()) {
                if (!activeFlightIds.has(flightId)) {
                    entities.remove(stale.droneEntity);
                    if (stale.trailEntity) entities.remove(stale.trailEntity);
                    entities.remove(stale.tetherEntity);
                    tracksMap.delete(flightId);
                    deleteLiveInterpolatedPosition(flightId);
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
        showTrail,
        interpolate,
        variant,
    ]);

    return null;
});
