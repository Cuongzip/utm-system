"use client";

import { useEffect, useRef } from "react";
import type { Cartesian3, Entity, Viewer } from "cesium";
import { getCesium } from "@/components/map/cesiumLoader";
import { getLiveInterpolatedPosition } from "@/components/map/livePositionRegistry";
import { isValidGeoPoint } from "@/utils";
import type { TelemetryRecord } from "@/types";

const MIN_TRAIL_STEP_M = 1.5;

function sampleKey(rec: TelemetryRecord | undefined): string {
    if (!rec) return "";
    if (rec.id) return rec.id;
    return `${rec.timestamp ?? ""}_${rec.latitude ?? ""}_${rec.longitude ?? ""}_${rec.altitude ?? ""}`;
}

interface UseDeckTelemetryTrailsParams {
    viewer: Viewer | null;
    isLoaded: boolean;
    cesiumRef: { current: typeof import("cesium") | null };
    flightId: string;
    visibleTrail: TelemetryRecord[];
    fullTrail?: TelemetryRecord[];
    isReplay: boolean;
    sceneRevision: number;
}

export function useDeckTelemetryTrails({
    viewer,
    isLoaded,
    cesiumRef,
    flightId,
    visibleTrail,
    fullTrail,
    isReplay,
    sceneRevision,
}: UseDeckTelemetryTrailsParams) {
    const remainingTrailEntityRef = useRef<Entity | null>(null);
    const trailEntityRef = useRef<Entity | null>(null);

    const flownPositionsRef = useRef<Cartesian3[]>([]);
    const remainingPositionsRef = useRef<Cartesian3[]>([]);
    const liveTrailScratchRef = useRef<Cartesian3[]>([]);
    const liveTipScratchRef = useRef<Cartesian3 | null>(null);

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
    }, [viewer, isLoaded, cesiumRef, flightId, isReplay, sceneRevision]);

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
    }, [viewer, isLoaded, cesiumRef, flightId, visibleTrail, fullTrail, isReplay, sceneRevision]);
}
