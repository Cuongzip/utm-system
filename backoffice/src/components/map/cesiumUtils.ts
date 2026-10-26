import * as Cesium from "cesium";

export interface LatLngPoint {
    lat: number;
    lng: number;
}

export interface FitCameraOptions {
    bufferRatio?: number;
    minBuffer?: number;
    animate?: boolean;
    duration?: number;
}

export function calculateBoundingRectangle(
    points: LatLngPoint[],
    bufferRatio = 0.4,
    minBuffer = 0.08
): Cesium.Rectangle | null {
    if (!points || points.length === 0) return null;

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    let hasValid = false;

    for (const p of points) {
        if (
            typeof p.lat === "number" &&
            typeof p.lng === "number" &&
            !isNaN(p.lat) &&
            !isNaN(p.lng)
        ) {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lng < minLng) minLng = p.lng;
            if (p.lng > maxLng) maxLng = p.lng;
            hasValid = true;
        }
    }

    if (!hasValid) return null;

    const latBuf = Math.max((maxLat - minLat) * bufferRatio, minBuffer);
    const lngBuf = Math.max((maxLng - minLng) * bufferRatio, minBuffer);

    return Cesium.Rectangle.fromDegrees(
        minLng - lngBuf,
        minLat - latBuf,
        maxLng + lngBuf,
        maxLat + latBuf
    );
}

export function fitCameraToBounds(
    viewer: Cesium.Viewer,
    points: LatLngPoint[],
    options: FitCameraOptions = {}
): boolean {
    const { bufferRatio = 0.4, minBuffer = 0.08, animate = false, duration = 1.5 } = options;

    const rect = calculateBoundingRectangle(points, bufferRatio, minBuffer);
    if (!rect) return false;

    if (animate) {
        viewer.camera.flyTo({
            destination: rect,
            duration,
        });
    } else {
        viewer.camera.setView({
            destination: rect,
        });
    }

    return true;
}
