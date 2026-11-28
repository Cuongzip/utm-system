"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { Cartesian3, Entity, ScreenSpaceEventHandler } from "cesium";
import { useCesium } from "@/components/map/CesiumContext";
import { getCesium } from "@/components/map/cesiumLoader";
import { getTargetPinIconUri } from "@/components/map/mapIcons";
import { createTacticalLabel } from "@/components/map/mapLabels";
import { getLiveInterpolatedPosition } from "@/components/map/livePositionRegistry";
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

const MIN_TRAIL_STEP_M = 1.5;

function sampleKey(rec: TelemetryRecord | undefined): string {
    if (!rec) return "";
    if (rec.id) return rec.id;
    return `${rec.timestamp ?? ""}_${rec.latitude ?? ""}_${rec.longitude ?? ""}_${rec.altitude ?? ""}`;
}

export const FlightDeckMapOverlay = memo(function FlightDeckMapOverlay({
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
    const cesiumRef = useRef<typeof import("cesium") | null>(null);
    const remainingTrailEntityRef = useRef<Entity | null>(null);
    const trailEntityRef = useRef<Entity | null>(null);
    const gotoPinEntityRef = useRef<Entity | null>(null);
    const gotoTetherEntityRef = useRef<Entity | null>(null);
    const gotoVectorEntityRef = useRef<Entity | null>(null);

    const flownPositionsRef = useRef<Cartesian3[]>([]);
    const remainingPositionsRef = useRef<Cartesian3[]>([]);
    const liveTrailScratchRef = useRef<Cartesian3[]>([]);
    const liveTipScratchRef = useRef<Cartesian3 | null>(null);
    const gotoStartScratchRef = useRef<Cartesian3 | null>(null);
    const gotoVectorScratchRef = useRef<Cartesian3[]>([]);

    const trailCursorRef = useRef<{
        flightId: string;
        isReplay: boolean;
        sceneRevision: number;
        firstKey: string;
        processedCount: number;
        lastKeptLat: number;
        lastKeptLng: number;
        lastKeptAlt: number;
    }>({
        flightId: "",
        isReplay: false,
        sceneRevision: -1,
        firstKey: "",
        processedCount: 0,
        lastKeptLat: Number.NaN,
        lastKeptLng: Number.NaN,
        lastKeptAlt: Number.NaN,
    });

    const latestSampleRef = useRef<TelemetryRecord | null>(null);
    const lastFitTriggerRef = useRef<number>(-1);
    const onPickRef = useRef(onPickGotoCoordinate);
    const [sceneRevision, setSceneRevision] = useState(0);

    useEffect(() => {
        onPickRef.current = onPickGotoCoordinate;
    }, [onPickGotoCoordinate]);

    useEffect(() => {
        latestSampleRef.current =
            visibleTrail.length > 0 ? (visibleTrail[visibleTrail.length - 1] ?? null) : null;
    }, [visibleTrail]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        const removeListener = viewer.scene.morphComplete.addEventListener(() => {
            setSceneRevision((rev) => rev + 1);
        });
        return () => {
            removeListener();
        };
    }, [viewer, isLoaded]);

    const hasTrailSample = visibleTrail.length > 0;
    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        syncViewerTrackedEntity(viewer, `drone-live-${flightId}`, followUav);
    }, [viewer, isLoaded, flightId, followUav, hasTrailSample]);

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

    // Mount persistent trail entities once per flight / mode / 2D-3D switch so live 5-10 Hz
    // telemetry updates never destroy and recreate WebGL polyline geometries.
    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function mountPersistentTrailEntities() {
            const Cesium = cesiumRef.current ?? (await getCesium());
            cesiumRef.current = Cesium;
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
            const arcType = is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC;
            const trailHex = isReplay ? "#f59e0b" : "#10b981";
            const outlineHex = isReplay ? "#1c1917" : "#052e16";

            if (!liveTipScratchRef.current) {
                liveTipScratchRef.current = new Cesium.Cartesian3();
            }

            if (isReplay) {
                remainingTrailEntityRef.current = viewer.entities.add({
                    id: `deck-remaining-trail-${flightId}`,
                    polyline: {
                        positions: new Cesium.CallbackProperty(() => {
                            const pts = remainingPositionsRef.current;
                            return pts.length >= 2 ? pts : [];
                        }, false),
                        width: 1.8,
                        arcType,
                        material: new Cesium.PolylineDashMaterialProperty({
                            color: Cesium.Color.fromCssColorString("#fbbf24").withAlpha(0.32),
                            dashLength: 10,
                        }),
                        clampToGround: false,
                    },
                });
            }

            trailEntityRef.current = viewer.entities.add({
                id: `deck-history-trail-${flightId}`,
                polyline: {
                    positions: new Cesium.CallbackProperty(() => {
                        const base = flownPositionsRef.current;
                        if (isReplay) {
                            return base.length >= 2 ? base : [];
                        }
                        if (base.length === 0) return [];
                        const live = getLiveInterpolatedPosition(flightId);
                        if (!live) {
                            return base.length >= 2 ? base : [];
                        }
                        const tipAlt =
                            !viewer.isDestroyed() && viewer.scene.mode === Cesium.SceneMode.SCENE3D
                                ? Math.max(2, live.alt)
                                : 6.5;
                        const tip = Cesium.Cartesian3.fromDegrees(
                            live.lng,
                            live.lat,
                            tipAlt,
                            undefined,
                            liveTipScratchRef.current ?? undefined
                        );
                        const scratch = liveTrailScratchRef.current;
                        scratch.length = base.length + 1;
                        for (let i = 0; i < base.length; i++) {
                            scratch[i] = base[i];
                        }
                        scratch[base.length] = tip;
                        return scratch.length >= 2 ? scratch : [];
                    }, false),
                    width: isReplay ? 3.6 : 3.8,
                    arcType,
                    material: new Cesium.PolylineOutlineMaterialProperty({
                        color: Cesium.Color.fromCssColorString(trailHex).withAlpha(0.96),
                        outlineColor: Cesium.Color.fromCssColorString(outlineHex).withAlpha(0.85),
                        outlineWidth: 1.2,
                    }),
                    clampToGround: false,
                },
            });

            viewer.scene.requestRender();
        }

        mountPersistentTrailEntities();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                if (remainingTrailEntityRef.current) {
                    viewer.entities.remove(remainingTrailEntityRef.current);
                    remainingTrailEntityRef.current = null;
                }
                if (trailEntityRef.current) {
                    viewer.entities.remove(trailEntityRef.current);
                    trailEntityRef.current = null;
                }
                viewer.scene.requestRender();
            }
        };
    }, [viewer, isLoaded, flightId, isReplay, sceneRevision]);

    // Incrementally update pre-converted Cartesian3 trail buffers in place (O(1) per live packet).
    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function updateTrailBuffers() {
            const Cesium = cesiumRef.current ?? (await getCesium());
            cesiumRef.current = Cesium;
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
            const firstKey = sampleKey(visibleTrail[0]);
            const cur = trailCursorRef.current;
            const canAppend =
                !isReplay &&
                cur.flightId === flightId &&
                cur.isReplay === isReplay &&
                cur.sceneRevision === sceneRevision &&
                cur.firstKey === firstKey &&
                cur.processedCount > 0 &&
                visibleTrail.length >= cur.processedCount;

            if (canAppend) {
                const pts = flownPositionsRef.current;
                for (let i = cur.processedCount; i < visibleTrail.length; i++) {
                    const s = visibleTrail[i];
                    if (
                        typeof s.latitude !== "number" ||
                        typeof s.longitude !== "number" ||
                        !isValidGeoPoint(s.latitude, s.longitude)
                    ) {
                        continue;
                    }
                    const alt = is3D ? Math.max(2, s.altitude ?? 50) : 6.5;
                    const isLast = i === visibleTrail.length - 1;
                    if (!isLast && Number.isFinite(cur.lastKeptLat)) {
                        const distM =
                            Math.hypot(
                                (s.latitude - cur.lastKeptLat) * 111320,
                                (s.longitude - cur.lastKeptLng) * 111320
                            ) + Math.abs(alt - cur.lastKeptAlt);
                        if (distM < MIN_TRAIL_STEP_M) continue;
                    }
                    pts.push(Cesium.Cartesian3.fromDegrees(s.longitude, s.latitude, alt));
                    cur.lastKeptLat = s.latitude;
                    cur.lastKeptLng = s.longitude;
                    cur.lastKeptAlt = alt;
                }
                cur.processedCount = visibleTrail.length;
            } else {
                const nextPts: Cartesian3[] = [];
                let lastLat = Number.NaN;
                let lastLng = Number.NaN;
                let lastAlt = Number.NaN;

                for (let i = 0; i < visibleTrail.length; i++) {
                    const s = visibleTrail[i];
                    if (
                        typeof s.latitude !== "number" ||
                        typeof s.longitude !== "number" ||
                        !isValidGeoPoint(s.latitude, s.longitude)
                    ) {
                        continue;
                    }
                    const alt = is3D ? Math.max(2, s.altitude ?? 50) : 6.5;
                    const isEndpoint = i === 0 || i === visibleTrail.length - 1;
                    if (!isEndpoint && Number.isFinite(lastLat)) {
                        const distM =
                            Math.hypot(
                                (s.latitude - lastLat) * 111320,
                                (s.longitude - lastLng) * 111320
                            ) + Math.abs(alt - lastAlt);
                        if (distM < MIN_TRAIL_STEP_M) continue;
                    }
                    nextPts.push(Cesium.Cartesian3.fromDegrees(s.longitude, s.latitude, alt));
                    lastLat = s.latitude;
                    lastLng = s.longitude;
                    lastAlt = alt;
                }

                flownPositionsRef.current = nextPts;
                trailCursorRef.current = {
                    flightId,
                    isReplay,
                    sceneRevision,
                    firstKey,
                    processedCount: visibleTrail.length,
                    lastKeptLat: lastLat,
                    lastKeptLng: lastLng,
                    lastKeptAlt: lastAlt,
                };
            }

            // Split the actual track cleanly at the playback cursor in Replay mode so flown
            // and remaining segments never overlap.
            if (isReplay && fullTrail && fullTrail.length > visibleTrail.length) {
                const startIdx = Math.max(0, visibleTrail.length - 1);
                const nextRemaining: Cartesian3[] = [];
                for (let i = startIdx; i < fullTrail.length; i++) {
                    const s = fullTrail[i];
                    if (
                        typeof s.latitude !== "number" ||
                        typeof s.longitude !== "number" ||
                        !isValidGeoPoint(s.latitude, s.longitude)
                    ) {
                        continue;
                    }
                    nextRemaining.push(
                        Cesium.Cartesian3.fromDegrees(
                            s.longitude,
                            s.latitude,
                            is3D ? Math.max(2, s.altitude ?? 50) : 5.5
                        )
                    );
                }
                remainingPositionsRef.current = nextRemaining;
            } else {
                remainingPositionsRef.current = [];
            }

            viewer.scene.requestRender();
        }

        updateTrailBuffers();

        return () => {
            cancelled = true;
        };
    }, [viewer, isLoaded, flightId, visibleTrail, fullTrail, isReplay, sceneRevision]);

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
});
