"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import { Compass } from "lucide-react";
import { getCesium } from "./cesiumLoader";
import { TACTICAL_3D_PITCH_DEG } from "./cesiumUtils";
import { formatCoordinates, formatDistance } from "@/utils";

const SCALE_STEPS_M = [
    10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000,
] as const;

export interface TacticalCompassControlsProps {
    viewer: Viewer | null;
    is3D: boolean;
}

export function TacticalCompassControls({ viewer, is3D }: TacticalCompassControlsProps) {
    const needleRef = useRef<SVGSVGElement>(null);
    const [isTilted, setIsTilted] = useState(true);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        let cancelled = false;
        let removePostRender: (() => void) | undefined;

        async function bindCameraSync() {
            const Cesium = await getCesium();
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            const syncOrientation = () => {
                if (viewer.isDestroyed()) return;
                const headingDeg = Cesium.Math.toDegrees(viewer.camera.heading);
                if (needleRef.current) {
                    needleRef.current.style.transform = `rotate(${-headingDeg}deg)`;
                }
                const pitchDeg = Cesium.Math.toDegrees(viewer.camera.pitch);
                const tiltedNow = pitchDeg > -78;
                setIsTilted((prev) => (prev === tiltedNow ? prev : tiltedNow));
            };

            syncOrientation();
            removePostRender = viewer.scene.postRender.addEventListener(syncOrientation);
        }

        bindCameraSync();

        return () => {
            cancelled = true;
            removePostRender?.();
        };
    }, [viewer, is3D]);

    const handleResetNorth = async () => {
        if (!viewer || viewer.isDestroyed()) return;
        const Cesium = await getCesium();
        if (viewer.isDestroyed()) return;

        const canvas = viewer.scene.canvas;
        const centerScreen = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        const ray = viewer.camera.getPickRay(centerScreen);
        const picked =
            (ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined) ??
            viewer.camera.pickEllipsoid(centerScreen, viewer.scene.globe.ellipsoid);

        if (picked && viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
            const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, picked);
            const sphere = new Cesium.BoundingSphere(picked, 50);
            viewer.camera.flyToBoundingSphere(sphere, {
                offset: new Cesium.HeadingPitchRange(0, viewer.camera.pitch, range),
                duration: 0.45,
                complete: () => {
                    if (!viewer.isDestroyed()) viewer.scene.requestRender();
                },
            });
        } else {
            viewer.camera.flyTo({
                destination: viewer.camera.positionWC,
                orientation: {
                    heading: 0,
                    pitch: viewer.camera.pitch,
                    roll: 0,
                },
                duration: 0.45,
                complete: () => {
                    if (!viewer.isDestroyed()) viewer.scene.requestRender();
                },
            });
        }
        viewer.scene.requestRender();
    };

    const handleToggleTilt = async () => {
        if (!viewer || viewer.isDestroyed() || !is3D) return;
        const Cesium = await getCesium();
        if (viewer.isDestroyed()) return;

        const canvas = viewer.scene.canvas;
        const centerScreen = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        const ray = viewer.camera.getPickRay(centerScreen);
        const picked =
            (ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined) ??
            viewer.camera.pickEllipsoid(centerScreen, viewer.scene.globe.ellipsoid);

        if (!picked) return;

        const range = Math.max(Cesium.Cartesian3.distance(viewer.camera.positionWC, picked), 400);
        const nextPitchDeg = isTilted ? -89 : TACTICAL_3D_PITCH_DEG;
        const sphere = new Cesium.BoundingSphere(picked, 50);

        viewer.camera.flyToBoundingSphere(sphere, {
            offset: new Cesium.HeadingPitchRange(
                viewer.camera.heading,
                Cesium.Math.toRadians(nextPitchDeg),
                range
            ),
            duration: 0.5,
            complete: () => {
                if (!viewer.isDestroyed()) viewer.scene.requestRender();
            },
        });
        viewer.scene.requestRender();
    };

    if (!viewer) return null;

    return (
        <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
                type="button"
                onClick={handleResetNorth}
                aria-label="Reset map heading to North"
                title="Reset North (0°)"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shadow-sm cursor-pointer"
            >
                <Compass
                    ref={needleRef}
                    className="h-3.5 w-3.5 text-slate-200 transition-transform duration-75"
                    aria-hidden="true"
                />
            </button>

            {is3D && (
                <button
                    type="button"
                    onClick={handleToggleTilt}
                    aria-pressed={isTilted}
                    aria-label="Toggle 3D camera tilt angle"
                    title={isTilted ? "Switch to Top-Down (-90°)" : "Tilt 3D View (-48°)"}
                    className={`h-8 px-2.5 inline-flex items-center justify-center rounded-md border text-[11px] leading-none font-mono font-semibold backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm cursor-pointer ${
                        isTilted
                            ? "bg-slate-700 border-slate-500 text-white"
                            : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                >
                    {isTilted ? "48°" : "90°"}
                </button>
            )}
        </div>
    );
}

export interface TacticalMapStatusBarProps {
    viewer: Viewer | null;
    statusSlot?: React.ReactNode;
    hidden?: boolean;
}

export function TacticalMapStatusBar({
    viewer,
    statusSlot,
    hidden = false,
}: TacticalMapStatusBarProps) {
    const [cursorCoord, setCursorCoord] = useState<{ latitude: number; longitude: number } | null>(
        null
    );
    const [cameraHeightM, setCameraHeightM] = useState<number | null>(null);
    const [scaleBar, setScaleBar] = useState<{ label: string; widthPx: number } | null>(null);

    useEffect(() => {
        if (!viewer || viewer.isDestroyed() || hidden) return;

        let cancelled = false;
        let handler: import("cesium").ScreenSpaceEventHandler | null = null;
        let removeCameraChanged: (() => void) | undefined;
        let removeMoveEnd: (() => void) | undefined;
        let lastMoveTs = 0;

        async function setupHudListeners() {
            const Cesium = await getCesium();
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            const updateScaleAndCamera = () => {
                if (viewer.isDestroyed()) return;

                const carto = viewer.camera.positionCartographic;
                if (carto && Number.isFinite(carto.height)) {
                    setCameraHeightM(Math.max(Math.round(carto.height), 10));
                }

                const canvas = viewer.scene.canvas;
                const w = canvas.clientWidth;
                const h = canvas.clientHeight;
                if (w < 120 || h < 80) return;

                const pLeft = new Cesium.Cartesian2(w / 2 - 50, h - 24);
                const pRight = new Cesium.Cartesian2(w / 2 + 50, h - 24);
                const r1 = viewer.camera.getPickRay(pLeft);
                const r2 = viewer.camera.getPickRay(pRight);
                const c1 =
                    (r1 ? viewer.scene.globe.pick(r1, viewer.scene) : undefined) ??
                    viewer.camera.pickEllipsoid(pLeft, viewer.scene.globe.ellipsoid);
                const c2 =
                    (r2 ? viewer.scene.globe.pick(r2, viewer.scene) : undefined) ??
                    viewer.camera.pickEllipsoid(pRight, viewer.scene.globe.ellipsoid);

                if (c1 && c2) {
                    const g1 = Cesium.Cartographic.fromCartesian(c1);
                    const g2 = Cesium.Cartographic.fromCartesian(c2);
                    const geodesic = new Cesium.EllipsoidGeodesic(g1, g2);
                    const metersPerPixel = geodesic.surfaceDistance / 100;

                    if (Number.isFinite(metersPerPixel) && metersPerPixel > 0) {
                        let chosenStep: number = SCALE_STEPS_M[SCALE_STEPS_M.length - 1];
                        for (const step of SCALE_STEPS_M) {
                            const px = step / metersPerPixel;
                            if (px >= 42 && px <= 110) {
                                chosenStep = step;
                                break;
                            }
                        }
                        const widthPx = Math.min(
                            Math.max(Math.round(chosenStep / metersPerPixel), 36),
                            112
                        );
                        setScaleBar({
                            label: formatDistance(chosenStep),
                            widthPx,
                        });
                    }
                }
            };

            updateScaleAndCamera();
            removeCameraChanged = viewer.camera.changed.addEventListener(updateScaleAndCamera);
            removeMoveEnd = viewer.camera.moveEnd.addEventListener(updateScaleAndCamera);

            const moveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            moveHandler.setInputAction((movement: { endPosition: import("cesium").Cartesian2 }) => {
                const now = performance.now();
                if (now - lastMoveTs < 65 || viewer.isDestroyed()) return;
                lastMoveTs = now;

                const ray = viewer.camera.getPickRay(movement.endPosition);
                const cartesian =
                    (ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined) ??
                    viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
                if (cartesian) {
                    const carto = Cesium.Cartographic.fromCartesian(cartesian);
                    setCursorCoord({
                        latitude: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(5)),
                        longitude: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(5)),
                    });
                }
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            handler = moveHandler;
        }

        setupHudListeners();

        return () => {
            cancelled = true;
            removeCameraChanged?.();
            removeMoveEnd?.();
            if (handler && !handler.isDestroyed()) {
                handler.destroy();
            }
        };
    }, [viewer, hidden]);

    if (hidden) return null;

    return (
        <div className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono text-slate-300 shadow-md pointer-events-none max-w-[calc(100%-1.5rem)]">
            {cursorCoord && (
                <span className="hidden sm:inline-flex items-center gap-1 tabular-nums text-slate-200">
                    <span>{formatCoordinates(cursorCoord, 4)}</span>
                </span>
            )}

            {cameraHeightM !== null && (
                <span className="hidden md:inline-flex items-center gap-1 tabular-nums text-slate-400 border-l border-slate-700 pl-2 first:border-l-0 first:pl-0">
                    <span>CAM</span>
                    <strong className="text-slate-100 font-semibold">
                        {formatDistance(cameraHeightM)}
                    </strong>
                </span>
            )}

            {scaleBar && (
                <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-200 border-l border-slate-700 first:border-l-0 first:pl-0 pl-2">
                    <span>{scaleBar.label}</span>
                    <span
                        className="inline-block h-1.5 border-x border-b border-slate-300/90"
                        style={{ width: `${scaleBar.widthPx}px` }}
                    />
                </span>
            )}

            {statusSlot && (
                <span className="inline-flex items-center border-l border-slate-700 first:border-l-0 first:pl-0 pl-2">
                    {statusSlot}
                </span>
            )}
        </div>
    );
}
