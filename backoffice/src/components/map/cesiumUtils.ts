import * as Cesium from "cesium";

export interface LatLngPoint {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
}

export interface FitCameraOptions {
    animate?: boolean;
    duration?: number;
    minHeight?: number;
    maxHeight?: number;
    paddingMultiplier?: number;
}

export function fitCameraToBounds(
    viewer: Cesium.Viewer,
    points: LatLngPoint[],
    options: FitCameraOptions = {}
): boolean {
    if (!viewer || viewer.isDestroyed() || !points || points.length === 0) return false;

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    let validCount = 0;

    for (const p of points) {
        const lat = p.lat ?? p.latitude;
        const lng = p.lng ?? p.longitude;
        if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            validCount++;
        }
    }

    if (validCount === 0) return false;

    viewer.resize();

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latSpanMeters = (maxLat - minLat) * 111320;
    const lngSpanMeters = (maxLng - minLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);
    const maxSpanMeters = Math.max(latSpanMeters, lngSpanMeters);

    const minHeight = options.minHeight ?? 1500;
    const maxHeight = options.maxHeight ?? 35000;
    const paddingMult = options.paddingMultiplier ?? 1.5;

    let targetHeight: number;
    if (validCount === 1 || maxSpanMeters < 80) {
        targetHeight = minHeight;
    } else {
        targetHeight = Math.min(Math.max(maxSpanMeters * paddingMult, minHeight), maxHeight);
    }

    const duration = options.duration ?? 0.8;

    if (validCount === 1 || maxSpanMeters < 80) {
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
    } else {
        const padLat = Math.max((maxLat - minLat) * 0.25, 0.005);
        const padLng = Math.max((maxLng - minLng) * 0.25, 0.005);
        const rect = Cesium.Rectangle.fromDegrees(
            minLng - padLng,
            minLat - padLat,
            maxLng + padLng,
            maxLat + padLat
        );

        if (options.animate !== false) {
            viewer.camera.flyTo({
                destination: rect,
                duration,
                complete: () => {
                    if (!viewer.isDestroyed()) viewer.scene.requestRender();
                },
            });
        } else {
            viewer.camera.setView({
                destination: rect,
            });
        }
    }

    viewer.scene.requestRender();
    return true;
}
