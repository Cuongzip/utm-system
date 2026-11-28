import type * as Cesium from "cesium";
import { getLoadedCesium } from "./cesiumLoader";

interface LatLngPoint {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
}

interface FitCameraOptions {
    animate?: boolean;
    duration?: number;
    minHeight?: number;
    maxHeight?: number;
    paddingMultiplier?: number;
}

export const TACTICAL_3D_PITCH_DEG = -48;

function computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function fitCameraToBounds(
    viewer: Cesium.Viewer,
    points: LatLngPoint[],
    options: FitCameraOptions = {}
): boolean {
    const Cesium = getLoadedCesium();
    if (!Cesium || !viewer || viewer.isDestroyed() || !points || points.length === 0) return false;

    const validPoints: Array<{ lat: number; lng: number }> = [];

    for (const p of points) {
        const lat = p.lat ?? p.latitude;
        const lng = p.lng ?? p.longitude;
        if (
            typeof lat === "number" &&
            typeof lng === "number" &&
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180 &&
            (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001)
        ) {
            validPoints.push({ lat, lng });
        }
    }

    if (validPoints.length === 0) return false;

    const minHeight = options.minHeight ?? 1500;
    const maxHeight = options.maxHeight ?? 80000;
    const paddingMult = options.paddingMultiplier ?? 1.55;

    let targetPoints = validPoints;
    if (validPoints.length > 2) {
        const medLat = computeMedian(validPoints.map((pt) => pt.lat));
        const medLng = computeMedian(validPoints.map((pt) => pt.lng));
        const maxClusterDeg = (maxHeight * 1.5) / 111320;
        const clustered = validPoints.filter(
            (pt) =>
                Math.abs(pt.lat - medLat) <= maxClusterDeg &&
                Math.abs(pt.lng - medLng) <= maxClusterDeg
        );
        if (clustered.length > 0) {
            targetPoints = clustered;
        }
    }

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    for (const pt of targetPoints) {
        minLat = Math.min(minLat, pt.lat);
        maxLat = Math.max(maxLat, pt.lat);
        minLng = Math.min(minLng, pt.lng);
        maxLng = Math.max(maxLng, pt.lng);
    }

    viewer.resize();

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latSpanMeters = (maxLat - minLat) * 111320;
    const lngSpanMeters = (maxLng - minLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);

    const canvas = viewer.scene?.canvas;
    const aspect =
        canvas && canvas.clientHeight > 0
            ? Math.max(canvas.clientWidth / canvas.clientHeight, 0.6)
            : 1.6;

    const effectiveSpanMeters = Math.max(latSpanMeters, lngSpanMeters / aspect);
    const maxSpanMeters = Math.max(latSpanMeters, lngSpanMeters);

    const targetHeight =
        targetPoints.length === 1 || maxSpanMeters < 80
            ? minHeight
            : Math.min(Math.max(effectiveSpanMeters * paddingMult, minHeight), maxHeight);

    const duration = options.duration ?? 0.8;
    const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;

    if (is3D) {
        const centerTarget = Cesium.Cartesian3.fromDegrees(centerLng, centerLat, 0);
        const sphere = new Cesium.BoundingSphere(centerTarget, Math.max(maxSpanMeters * 0.5, 120));
        const pitchRad = Math.abs(Cesium.Math.toRadians(TACTICAL_3D_PITCH_DEG));
        const pitchComp = 1 / Math.max(Math.sin(pitchRad), 0.5);
        const range = Math.min(Math.max(targetHeight * pitchComp, minHeight), maxHeight * 1.45);

        viewer.camera.flyToBoundingSphere(sphere, {
            offset: new Cesium.HeadingPitchRange(
                0,
                Cesium.Math.toRadians(TACTICAL_3D_PITCH_DEG),
                range
            ),
            duration: options.animate !== false ? duration : 0,
            complete: () => {
                if (!viewer.isDestroyed()) viewer.scene.requestRender();
            },
        });
    } else {
        const destination = Cesium.Cartesian3.fromDegrees(centerLng, centerLat, targetHeight);
        if (options.animate !== false) {
            viewer.camera.flyTo({
                destination,
                duration,
                complete: () => {
                    if (!viewer.isDestroyed()) viewer.scene.requestRender();
                },
            });
        } else {
            viewer.camera.setView({
                destination,
            });
        }
    }

    viewer.scene.requestRender();
    return true;
}

export function syncViewerTrackedEntity(
    viewer: Cesium.Viewer | null | undefined,
    entityId: string,
    enabled: boolean
): void {
    if (!viewer || viewer.isDestroyed()) return;
    if (!enabled) {
        if (viewer.trackedEntity?.id === entityId) {
            viewer.trackedEntity = undefined;
            viewer.scene.requestRender();
        }
        return;
    }
    let target = viewer.entities.getById(entityId);
    if (!target) {
        for (let i = 0; i < viewer.dataSources.length; i++) {
            const found = viewer.dataSources.get(i).entities.getById(entityId);
            if (found) {
                target = found;
                break;
            }
        }
    }
    if (target && viewer.trackedEntity !== target) {
        viewer.trackedEntity = target;
        viewer.scene.requestRender();
    }
}

export function setViewerCanvasCursor(
    viewer: Cesium.Viewer | null | undefined,
    cursor: string
): void {
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.canvas.style.cursor = cursor;
}
