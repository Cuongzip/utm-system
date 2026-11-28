"use client";

import { useEffect, useRef } from "react";
import type { Entity, ScreenSpaceEventHandler } from "cesium";
import { useCesium } from "@/components/map/CesiumContext";
import { getCesium } from "@/components/map/cesiumLoader";
import { createTacticalLabel } from "@/components/map/mapLabels";
import {
    fitCameraToBounds,
    setViewerCanvasCursor,
    syncViewerTrackedEntity,
} from "@/components/map/cesiumUtils";
import { isValidGeoPoint } from "@/utils";
import type { TelemetryRecord } from "@/types";

export interface GotoDraftTarget {
    latitude: number;
    longitude: number;
    altitude: number;
}

export interface FlightDeckMapOverlayProps {
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

export function FlightDeckMapOverlay({
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
    const fullTrailEntityRef = useRef<Entity | null>(null);
    const trailEntityRef = useRef<Entity | null>(null);
    const gotoPinEntityRef = useRef<Entity | null>(null);
    const gotoTetherEntityRef = useRef<Entity | null>(null);
    const gotoVectorEntityRef = useRef<Entity | null>(null);
    const lastFitTriggerRef = useRef<number>(-1);
    const onPickRef = useRef(onPickGotoCoordinate);

    useEffect(() => {
        onPickRef.current = onPickGotoCoordinate;
    }, [onPickGotoCoordinate]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        syncViewerTrackedEntity(viewer, `drone-live-${flightId}`, followUav);
    }, [viewer, isLoaded, flightId, followUav, visibleTrail.length]);

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

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function syncBreadcrumbTrail() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            if (fullTrailEntityRef.current) {
                viewer.entities.remove(fullTrailEntityRef.current);
                fullTrailEntityRef.current = null;
            }
            if (trailEntityRef.current) {
                viewer.entities.remove(trailEntityRef.current);
                trailEntityRef.current = null;
            }

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;

            if (isReplay && fullTrail && fullTrail.length >= 2) {
                const validFull = fullTrail.filter(
                    (pt) =>
                        typeof pt.latitude === "number" &&
                        typeof pt.longitude === "number" &&
                        isValidGeoPoint(pt.latitude, pt.longitude)
                );
                if (validFull.length >= 2) {
                    const fullCoords: number[] = [];
                    for (const s of validFull) {
                        fullCoords.push(
                            s.longitude!,
                            s.latitude!,
                            is3D ? Math.max(2, s.altitude ?? 50) : 5
                        );
                    }
                    fullTrailEntityRef.current = viewer.entities.add({
                        id: `deck-full-trail-${flightId}`,
                        polyline: {
                            positions: Cesium.Cartesian3.fromDegreesArrayHeights(fullCoords),
                            width: 2.2,
                            arcType: is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC,
                            material: new Cesium.PolylineDashMaterialProperty({
                                color: Cesium.Color.fromCssColorString("#fbbf24").withAlpha(0.38),
                                dashLength: 12,
                            }),
                            clampToGround: false,
                        },
                    });
                }
            }

            const validSamples = visibleTrail.filter(
                (pt) =>
                    typeof pt.latitude === "number" &&
                    typeof pt.longitude === "number" &&
                    isValidGeoPoint(pt.latitude, pt.longitude)
            );

            if (validSamples.length < 2) {
                viewer.scene.requestRender();
                return;
            }

            const flatCoords: number[] = [];
            for (const s of validSamples) {
                flatCoords.push(
                    s.longitude!,
                    s.latitude!,
                    is3D ? Math.max(2, s.altitude ?? 50) : 6
                );
            }

            const trailHex = isReplay ? "#f59e0b" : "#10b981";
            trailEntityRef.current = viewer.entities.add({
                id: `deck-history-trail-${flightId}`,
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights(flatCoords),
                    width: 4.0,
                    arcType: is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.22,
                        taperPower: 0.9,
                        color: Cesium.Color.fromCssColorString(trailHex).withAlpha(0.94),
                    }),
                    clampToGround: false,
                },
            });

            viewer.scene.requestRender();
        }

        syncBreadcrumbTrail();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                if (fullTrailEntityRef.current) {
                    viewer.entities.remove(fullTrailEntityRef.current);
                    fullTrailEntityRef.current = null;
                }
                if (trailEntityRef.current) {
                    viewer.entities.remove(trailEntityRef.current);
                    trailEntityRef.current = null;
                }
                viewer.scene.requestRender();
            }
        };
    }, [viewer, isLoaded, flightId, visibleTrail, fullTrail, isReplay]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function syncGotoPin() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            if (gotoPinEntityRef.current) {
                viewer.entities.remove(gotoPinEntityRef.current);
                gotoPinEntityRef.current = null;
            }
            if (gotoTetherEntityRef.current) {
                viewer.entities.remove(gotoTetherEntityRef.current);
                gotoTetherEntityRef.current = null;
            }
            if (gotoVectorEntityRef.current) {
                viewer.entities.remove(gotoVectorEntityRef.current);
                gotoVectorEntityRef.current = null;
            }

            const targetPin = gotoDraft ?? activeC2Target;
            if (!targetPin || !isValidGeoPoint(targetPin.latitude, targetPin.longitude)) {
                viewer.scene.requestRender();
                return;
            }

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
            const alt = is3D ? Math.max(5, targetPin.altitude ?? 60) : 8;

            gotoTetherEntityRef.current = viewer.entities.add({
                id: `deck-goto-tether-${flightId}`,
                polyline: {
                    positions: [
                        Cesium.Cartesian3.fromDegrees(targetPin.longitude, targetPin.latitude, 0),
                        Cesium.Cartesian3.fromDegrees(targetPin.longitude, targetPin.latitude, alt),
                    ],
                    width: 1.8,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.fromCssColorString("#f59e0b").withAlpha(0.9),
                        dashLength: 10,
                    }),
                },
            });

            const latestSample =
                visibleTrail.length > 0 ? visibleTrail[visibleTrail.length - 1] : null;
            if (
                latestSample &&
                typeof latestSample.latitude === "number" &&
                typeof latestSample.longitude === "number" &&
                isValidGeoPoint(latestSample.latitude, latestSample.longitude)
            ) {
                const uavAlt = is3D ? Math.max(2, latestSample.altitude ?? alt) : 8;
                gotoVectorEntityRef.current = viewer.entities.add({
                    id: `deck-goto-vector-${flightId}`,
                    polyline: {
                        positions: [
                            Cesium.Cartesian3.fromDegrees(
                                latestSample.longitude,
                                latestSample.latitude,
                                uavAlt
                            ),
                            Cesium.Cartesian3.fromDegrees(
                                targetPin.longitude,
                                targetPin.latitude,
                                alt
                            ),
                        ],
                        width: 2.6,
                        arcType: is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC,
                        material: new Cesium.PolylineDashMaterialProperty({
                            color: Cesium.Color.fromCssColorString("#f59e0b").withAlpha(0.92),
                            dashLength: 14,
                        }),
                        clampToGround: false,
                    },
                });
            }

            gotoPinEntityRef.current = viewer.entities.add({
                id: `deck-goto-pin-${flightId}`,
                position: Cesium.Cartesian3.fromDegrees(
                    targetPin.longitude,
                    targetPin.latitude,
                    alt
                ),
                point: {
                    pixelSize: 11,
                    color: Cesium.Color.fromCssColorString("#f59e0b"),
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2.5,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: createTacticalLabel(Cesium, {
                    text: `GOTO • ${Math.round(targetPin.altitude)}m`,
                    isSelected: true,
                    accentColor: "#f59e0b",
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    eyeOffset: new Cesium.Cartesian3(0, 0, -30),
                    maxDistance: 250000,
                }),
            });

            viewer.scene.requestRender();
        }

        syncGotoPin();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                if (gotoPinEntityRef.current) {
                    viewer.entities.remove(gotoPinEntityRef.current);
                    gotoPinEntityRef.current = null;
                }
                if (gotoTetherEntityRef.current) {
                    viewer.entities.remove(gotoTetherEntityRef.current);
                    gotoTetherEntityRef.current = null;
                }
                if (gotoVectorEntityRef.current) {
                    viewer.entities.remove(gotoVectorEntityRef.current);
                    gotoVectorEntityRef.current = null;
                }
                viewer.scene.requestRender();
            }
        };
    }, [viewer, isLoaded, flightId, gotoDraft, activeC2Target, visibleTrail]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || !gotoPickMode) {
            setViewerCanvasCursor(viewer, "default");
            return;
        }

        let cancelled = false;
        let handler: ScreenSpaceEventHandler | null = null;
        setViewerCanvasCursor(viewer, "crosshair");

        async function attachPicker() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction((movement: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                let cartesian = viewer.scene.pickPosition(movement.position);
                if (!cartesian) {
                    cartesian =
                        viewer.camera.pickEllipsoid(
                            movement.position,
                            viewer.scene.globe.ellipsoid
                        ) ?? undefined!;
                }
                if (!cartesian) return;

                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                const lat = Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6));
                const lng = Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6));
                if (isValidGeoPoint(lat, lng)) {
                    onPickRef.current?.(lat, lng);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        }

        attachPicker();

        return () => {
            cancelled = true;
            if (handler) {
                handler.destroy();
                handler = null;
            }
            setViewerCanvasCursor(viewer, "default");
        };
    }, [viewer, isLoaded, gotoPickMode]);

    return null;
}
