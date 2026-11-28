"use client";

import { useEffect } from "react";
import type * as CesiumType from "cesium";
import type { ScreenSpaceEventHandler, Viewer } from "cesium";

const DRAG_THRESHOLD_PX = 5;

interface CanvasInteractionRefs {
    pickModeRef: { readonly current: boolean };
    onEntityClickRef: { readonly current: ((entityId: string) => void) | undefined };
    onMapClickRef: {
        readonly current: ((coords: { latitude: number; longitude: number }) => void) | undefined;
    };
}

export function setupCanvasInteractions(
    Cesium: typeof CesiumType,
    activeViewer: Viewer,
    refs: CanvasInteractionRefs
): () => void {
    let dragStartPos: { x: number; y: number } | null = null;
    let hasMovedDuringClick = false;
    let lastHoverCheckTs = 0;

    const inputHandler = new Cesium.ScreenSpaceEventHandler(activeViewer.scene.canvas);

    inputHandler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        hasMovedDuringClick = false;
        dragStartPos = { x: event.position.x, y: event.position.y };
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    inputHandler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
        if (
            dragStartPos &&
            Math.hypot(
                movement.endPosition.x - dragStartPos.x,
                movement.endPosition.y - dragStartPos.y
            ) > DRAG_THRESHOLD_PX
        ) {
            hasMovedDuringClick = true;
        }

        if (
            !dragStartPos &&
            !refs.pickModeRef.current &&
            refs.onEntityClickRef.current &&
            !activeViewer.isDestroyed()
        ) {
            const now = performance.now();
            if (now - lastHoverCheckTs >= 80) {
                lastHoverCheckTs = now;
                const hovered = activeViewer.scene.pick(movement.endPosition);
                const isClickable = Boolean(Cesium.defined(hovered) && hovered.id && hovered.id.id);
                activeViewer.scene.canvas.style.cursor = isClickable ? "pointer" : "default";
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    inputHandler.setInputAction(() => {
        dragStartPos = null;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    inputHandler.setInputAction((click: ScreenSpaceEventHandler.PositionedEvent) => {
        if (activeViewer.isDestroyed()) return;
        if (hasMovedDuringClick) {
            hasMovedDuringClick = false;
            return;
        }
        if (refs.pickModeRef.current && refs.onMapClickRef.current) {
            const ray = activeViewer.camera.getPickRay(click.position);
            const globeCartesian = ray
                ? activeViewer.scene.globe.pick(ray, activeViewer.scene)
                : undefined;
            const cartesian =
                globeCartesian ??
                activeViewer.camera.pickEllipsoid(
                    click.position,
                    activeViewer.scene.globe.ellipsoid
                );
            if (cartesian) {
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                refs.onMapClickRef.current({
                    latitude: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6)),
                    longitude: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6)),
                });
            }
            return;
        }
        const picked = activeViewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id && picked.id.id) {
            refs.onEntityClickRef.current?.(picked.id.id);
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
        if (!activeViewer.isDestroyed()) {
            activeViewer.scene.canvas.style.cursor = "default";
        }
        if (!inputHandler.isDestroyed()) {
            inputHandler.destroy();
        }
    };
}

export function usePickModeCursor(
    viewerRef: { current: Viewer | null },
    isLoaded: boolean,
    pickMode: boolean
): void {
    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;
        v.scene.canvas.style.cursor = pickMode ? "crosshair" : "default";
        return () => {
            if (!v.isDestroyed()) {
                v.scene.canvas.style.cursor = "default";
            }
        };
    }, [viewerRef, pickMode, isLoaded]);
}
