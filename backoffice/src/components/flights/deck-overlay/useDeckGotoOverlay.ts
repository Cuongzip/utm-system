"use client";

import { useEffect, useRef } from "react";
import type { Cartesian2, Cartesian3, Entity, ScreenSpaceEventHandler, Viewer } from "cesium";
import { getCesium } from "@/components/map/cesiumLoader";
import { getTargetPinIconUri } from "@/components/map/mapIcons";
import { createTacticalLabel } from "@/components/map/mapLabels";
import { getLiveInterpolatedPosition } from "@/components/map/livePositionRegistry";
import { setViewerCanvasCursor } from "@/components/map/cesiumUtils";
import { isValidGeoPoint } from "@/utils";
import type { TelemetryRecord } from "@/types";

export interface GotoDraftTarget {
    latitude: number;
    longitude: number;
    altitude: number;
}

interface UseDeckGotoOverlayParams {
    viewer: Viewer | null;
    isLoaded: boolean;
    cesiumRef: { current: typeof import("cesium") | null };
    flightId: string;
    visibleTrail: TelemetryRecord[];
    gotoPickMode: boolean;
    gotoDraft: GotoDraftTarget | null;
    activeC2Target: GotoDraftTarget | null;
    onPickGotoCoordinate?: (latitude: number, longitude: number) => void;
    sceneRevision: number;
}

export function useDeckGotoOverlay({
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
}: UseDeckGotoOverlayParams) {
    const gotoPinEntityRef = useRef<Entity | null>(null);
    const gotoTetherEntityRef = useRef<Entity | null>(null);
    const gotoVectorEntityRef = useRef<Entity | null>(null);
    const gotoStartScratchRef = useRef<Cartesian3 | null>(null);
    const gotoVectorScratchRef = useRef<Cartesian3[]>([]);
    const latestSampleRef = useRef<TelemetryRecord | null>(null);
    const onPickRef = useRef(onPickGotoCoordinate);

    useEffect(() => {
        onPickRef.current = onPickGotoCoordinate;
    }, [onPickGotoCoordinate]);

    useEffect(() => {
        latestSampleRef.current =
            visibleTrail.length > 0 ? (visibleTrail[visibleTrail.length - 1] ?? null) : null;
    }, [visibleTrail]);

    const targetPin = gotoDraft ?? activeC2Target;
    const hasValidTargetPin = Boolean(
        targetPin && isValidGeoPoint(targetPin.latitude, targetPin.longitude)
    );
    const targetLat = hasValidTargetPin ? targetPin!.latitude : Number.NaN;
    const targetLng = hasValidTargetPin ? targetPin!.longitude : Number.NaN;
    const targetAltInput = hasValidTargetPin ? (targetPin!.altitude ?? 60) : Number.NaN;

    // Mount GOTO pin, vertical tether, and live-tracking vector ONLY when the GOTO target
    // itself changes — never rebuilt per telemetry packet.
    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function syncGotoEntities() {
            const Cesium = cesiumRef.current ?? (await getCesium());
            cesiumRef.current = Cesium;
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

            if (!hasValidTargetPin) {
                viewer.scene.requestRender();
                return;
            }

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
            const alt = is3D ? Math.max(5, targetAltInput) : 8;
            const targetPos = Cesium.Cartesian3.fromDegrees(targetLng, targetLat, alt);

            if (!gotoStartScratchRef.current) {
                gotoStartScratchRef.current = new Cesium.Cartesian3();
            }

            gotoTetherEntityRef.current = viewer.entities.add({
                id: `deck-goto-tether-${flightId}`,
                polyline: {
                    positions: [Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 0), targetPos],
                    width: 1.8,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.fromCssColorString("#f59e0b").withAlpha(0.9),
                        dashLength: 10,
                    }),
                },
            });

            gotoVectorEntityRef.current = viewer.entities.add({
                id: `deck-goto-vector-${flightId}`,
                polyline: {
                    positions: new Cesium.CallbackProperty(() => {
                        const live = getLiveInterpolatedPosition(flightId);
                        let srcLng: number | undefined;
                        let srcLat: number | undefined;
                        let srcAlt: number;

                        if (live) {
                            srcLng = live.lng;
                            srcLat = live.lat;
                            srcAlt = is3D ? Math.max(2, live.alt) : 8;
                        } else {
                            const fallback = latestSampleRef.current;
                            if (
                                fallback &&
                                typeof fallback.latitude === "number" &&
                                typeof fallback.longitude === "number" &&
                                isValidGeoPoint(fallback.latitude, fallback.longitude)
                            ) {
                                srcLng = fallback.longitude;
                                srcLat = fallback.latitude;
                                srcAlt = is3D ? Math.max(2, fallback.altitude ?? alt) : 8;
                            } else {
                                return [];
                            }
                        }

                        const start = Cesium.Cartesian3.fromDegrees(
                            srcLng,
                            srcLat,
                            srcAlt,
                            undefined,
                            gotoStartScratchRef.current ?? undefined
                        );
                        const pair = gotoVectorScratchRef.current;
                        pair.length = 2;
                        pair[0] = start;
                        pair[1] = targetPos;
                        return pair;
                    }, false),
                    width: 2.6,
                    arcType: is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.fromCssColorString("#f59e0b").withAlpha(0.92),
                        dashLength: 14,
                    }),
                    clampToGround: false,
                },
            });

            gotoPinEntityRef.current = viewer.entities.add({
                id: `deck-goto-pin-${flightId}`,
                position: targetPos,
                billboard: {
                    image: getTargetPinIconUri("#f59e0b"),
                    width: 30,
                    height: 30,
                    eyeOffset: new Cesium.Cartesian3(0, 0, -30),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
                label: createTacticalLabel(Cesium, {
                    text: `GOTO • ${Math.round(targetAltInput)}m`,
                    isSelected: true,
                    variant: "aircraft",
                    accentColor: "#f59e0b",
                    pixelOffset: new Cesium.Cartesian2(0, -22),
                    eyeOffset: new Cesium.Cartesian3(0, 0, -30),
                    maxDistance: 250000,
                }),
            });

            viewer.scene.requestRender();
        }

        syncGotoEntities();

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
    }, [
        viewer,
        isLoaded,
        cesiumRef,
        flightId,
        hasValidTargetPin,
        targetLat,
        targetLng,
        targetAltInput,
        sceneRevision,
    ]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || !gotoPickMode) {
            setViewerCanvasCursor(viewer, "default");
            return;
        }

        let cancelled = false;
        let handler: ScreenSpaceEventHandler | null = null;
        setViewerCanvasCursor(viewer, "crosshair");

        async function attachPicker() {
            const Cesium = cesiumRef.current ?? (await getCesium());
            cesiumRef.current = Cesium;
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction((movement: { position: Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                const picked =
                    viewer.scene.pickPosition(movement.position) ??
                    viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
                if (!picked) return;

                const carto = Cesium.Cartographic.fromCartesian(picked);
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
    }, [viewer, isLoaded, cesiumRef, gotoPickMode]);
}
