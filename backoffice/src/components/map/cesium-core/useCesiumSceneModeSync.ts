"use client";

import { useEffect } from "react";
import type * as CesiumType from "cesium";
import type { Viewer } from "cesium";
import { getCesium } from "../cesiumLoader";
import { TACTICAL_3D_PITCH_DEG } from "../cesiumUtils";
import type { MapMode } from "../types";

const DEFAULT_COORDINATES = {
    lng: 106.7009,
    lat: 10.7769,
    height: 35000.0,
};

export function applyInitialSceneCamera(
    Cesium: typeof CesiumType,
    viewer: Viewer,
    initialMode: MapMode
): void {
    if (initialMode === "2d") {
        viewer.scene.fog.enabled = false;
        viewer.scene.globe.showGroundAtmosphere = false;
        if (viewer.scene.sun) viewer.scene.sun.show = false;
        if (viewer.scene.moon) viewer.scene.moon.show = false;
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
                DEFAULT_COORDINATES.lng,
                DEFAULT_COORDINATES.lat,
                DEFAULT_COORDINATES.height
            ),
        });
    } else {
        const centerTarget = Cesium.Cartesian3.fromDegrees(
            DEFAULT_COORDINATES.lng,
            DEFAULT_COORDINATES.lat,
            0
        );
        viewer.camera.lookAt(
            centerTarget,
            new Cesium.HeadingPitchRange(
                0,
                Cesium.Math.toRadians(TACTICAL_3D_PITCH_DEG),
                DEFAULT_COORDINATES.height
            )
        );
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
}

export function useCesiumSceneModeSync(
    viewerRef: { current: Viewer | null },
    appliedModeRef: { current: MapMode | null },
    mode: MapMode,
    isLoaded: boolean
): void {
    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;
        if (appliedModeRef.current === mode) return;

        let cancelled = false;
        let removeMorphListener: (() => void) | undefined;

        async function updateSceneMode() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (cancelled || !currentViewer || currentViewer.isDestroyed()) return;

            const targetMode = mode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D;
            appliedModeRef.current = mode;

            if (currentViewer.scene.mode !== targetMode) {
                const canvas = currentViewer.scene.canvas;
                const centerScreen = new Cesium.Cartesian2(
                    canvas.clientWidth / 2,
                    canvas.clientHeight / 2
                );
                const centerRay = currentViewer.camera.getPickRay(centerScreen);
                const pickedGround = centerRay
                    ? currentViewer.scene.globe.pick(centerRay, currentViewer.scene)
                    : undefined;
                const fallbackCarto = currentViewer.camera.positionCartographic;
                const groundCarto = pickedGround
                    ? Cesium.Cartographic.fromCartesian(pickedGround)
                    : fallbackCarto;

                const hasValidCarto =
                    groundCarto &&
                    Number.isFinite(groundCarto.latitude) &&
                    Number.isFinite(groundCarto.longitude) &&
                    (Math.abs(groundCarto.latitude) > 0.0001 ||
                        Math.abs(groundCarto.longitude) > 0.0001);

                const targetLng = hasValidCarto
                    ? Cesium.Math.toDegrees(groundCarto.longitude)
                    : DEFAULT_COORDINATES.lng;
                const targetLat = hasValidCarto
                    ? Cesium.Math.toDegrees(groundCarto.latitude)
                    : DEFAULT_COORDINATES.lat;
                const isLeaving3D = currentViewer.scene.mode === Cesium.SceneMode.SCENE3D;
                const slantRange =
                    isLeaving3D && pickedGround
                        ? Cesium.Cartesian3.distance(currentViewer.camera.positionWC, pickedGround)
                        : (fallbackCarto?.height ?? DEFAULT_COORDINATES.height);
                const adjustedHeight =
                    isLeaving3D && targetMode === Cesium.SceneMode.SCENE2D
                        ? slantRange * 1.32
                        : !isLeaving3D && targetMode === Cesium.SceneMode.SCENE3D
                          ? slantRange * 0.95
                          : slantRange;
                const targetHeight = Number.isFinite(adjustedHeight)
                    ? Math.min(Math.max(adjustedHeight, 1200), 140000)
                    : DEFAULT_COORDINATES.height;

                const applyRestoredView = () => {
                    if (currentViewer.isDestroyed()) return;
                    if (targetMode === Cesium.SceneMode.SCENE3D) {
                        const centerTarget = Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 0);
                        currentViewer.camera.lookAt(
                            centerTarget,
                            new Cesium.HeadingPitchRange(
                                0,
                                Cesium.Math.toRadians(TACTICAL_3D_PITCH_DEG),
                                targetHeight * 1.12
                            )
                        );
                        currentViewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
                    } else {
                        currentViewer.camera.setView({
                            destination: Cesium.Cartesian3.fromDegrees(
                                targetLng,
                                targetLat,
                                targetHeight
                            ),
                        });
                    }
                    currentViewer.scene.requestRender();
                };

                removeMorphListener = currentViewer.scene.morphComplete.addEventListener(() => {
                    removeMorphListener?.();
                    removeMorphListener = undefined;
                    applyRestoredView();
                });

                if (targetMode === Cesium.SceneMode.SCENE2D) {
                    currentViewer.scene.fog.enabled = false;
                    currentViewer.scene.globe.showGroundAtmosphere = false;
                    if (currentViewer.scene.sun) currentViewer.scene.sun.show = false;
                    if (currentViewer.scene.moon) currentViewer.scene.moon.show = false;
                    currentViewer.scene.morphTo2D(0);
                } else {
                    currentViewer.scene.fog.enabled = true;
                    currentViewer.scene.globe.showGroundAtmosphere = true;
                    if (currentViewer.scene.sun) currentViewer.scene.sun.show = true;
                    if (currentViewer.scene.moon) currentViewer.scene.moon.show = true;
                    currentViewer.scene.morphTo3D(0);
                }

                applyRestoredView();
            }
        }

        updateSceneMode();

        return () => {
            cancelled = true;
            removeMorphListener?.();
        };
    }, [viewerRef, appliedModeRef, mode, isLoaded]);
}
