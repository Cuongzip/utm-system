import type * as CesiumType from "cesium";

export function generateGeodesicCircleRing(
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
    segments: number = 64
): number[] {
    const degreePairs: number[] = [];
    const latRad = (centerLat * Math.PI) / 180;
    const metersPerDegLat = 111320;
    const metersPerDegLng = Math.max(111320 * Math.cos(latRad), 1e-6);

    for (let i = 0; i <= segments; i++) {
        const angle = (i * 2 * Math.PI) / segments;
        const pLat = centerLat + (radiusMeters * Math.cos(angle)) / metersPerDegLat;
        const pLng = centerLng + (radiusMeters * Math.sin(angle)) / metersPerDegLng;
        degreePairs.push(pLng, pLat);
    }

    return degreePairs;
}

export function buildClosedRingCartesian(
    Cesium: typeof CesiumType,
    degreePairs: number[],
    heightM: number
): CesiumType.Cartesian3[] {
    if (degreePairs.length < 6) return [];

    const coordsWithHeight: number[] = [];
    const count = Math.floor(degreePairs.length / 2);

    for (let i = 0; i < count; i++) {
        coordsWithHeight.push(degreePairs[i * 2], degreePairs[i * 2 + 1], heightM);
    }

    const firstLng = degreePairs[0];
    const firstLat = degreePairs[1];
    const lastLng = degreePairs[(count - 1) * 2];
    const lastLat = degreePairs[(count - 1) * 2 + 1];

    if (Math.abs(firstLng - lastLng) > 1e-7 || Math.abs(firstLat - lastLat) > 1e-7) {
        coordsWithHeight.push(firstLng, firstLat, heightM);
    }

    return Cesium.Cartesian3.fromDegreesArrayHeights(coordsWithHeight);
}

export interface BoundaryPolylineOptions {
    id: string;
    degreePairs: number[];
    heightM: number;
    colorCss: string;
    alpha?: number;
    width?: number;
}

export function addCrispBoundaryPolyline(
    Cesium: typeof CesiumType,
    viewer: CesiumType.Viewer,
    options: BoundaryPolylineOptions
): string | null {
    const positions = buildClosedRingCartesian(Cesium, options.degreePairs, options.heightM);
    if (positions.length < 2) return null;

    const entity = viewer.entities.add({
        id: options.id,
        polyline: {
            positions,
            width: options.width ?? 2.2,
            material: Cesium.Color.fromCssColorString(options.colorCss).withAlpha(
                options.alpha ?? 0.9
            ),
            clampToGround: false,
        },
    });
    return entity.id;
}

export interface AltitudeDropLineOptions {
    id: string;
    lng: number;
    lat: number;
    altitudeM: number;
    colorCss: string;
    alpha?: number;
}

export function addAltitudeDropLine(
    Cesium: typeof CesiumType,
    viewer: CesiumType.Viewer,
    options: AltitudeDropLineOptions
): string | null {
    if (viewer.scene.mode !== Cesium.SceneMode.SCENE3D || options.altitudeM <= 8) {
        return null;
    }

    const baseColor = Cesium.Color.fromCssColorString(options.colorCss);
    const entity = viewer.entities.add({
        id: options.id,
        position: Cesium.Cartesian3.fromDegrees(options.lng, options.lat, 0),
        point: {
            pixelSize: 5,
            color: baseColor.withAlpha(0.75),
            outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                options.lng,
                options.lat,
                0,
                options.lng,
                options.lat,
                options.altitudeM,
            ]),
            width: 1.4,
            material: new Cesium.PolylineDashMaterialProperty({
                color: baseColor.withAlpha(options.alpha ?? 0.52),
                dashLength: 10,
            }),
        },
    });

    return entity.id;
}

export interface RouteCurtainOptions {
    id: string;
    points: Array<{ lng: number; lat: number; alt: number }>;
    colorCss: string;
    alpha?: number;
}

export function addRouteCurtainWall(
    Cesium: typeof CesiumType,
    viewer: CesiumType.Viewer,
    options: RouteCurtainOptions
): string | null {
    if (viewer.scene.mode !== Cesium.SceneMode.SCENE3D || options.points.length < 2) {
        return null;
    }

    const positions: CesiumType.Cartesian3[] = [];
    const maximumHeights: number[] = [];
    const minimumHeights: number[] = [];

    for (const pt of options.points) {
        if (!Number.isFinite(pt.lng) || !Number.isFinite(pt.lat)) continue;
        positions.push(Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 0));
        maximumHeights.push(Math.max(pt.alt, 2));
        minimumHeights.push(0);
    }

    if (positions.length < 2) return null;

    const entity = viewer.entities.add({
        id: options.id,
        wall: {
            positions,
            maximumHeights,
            minimumHeights,
            material: Cesium.Color.fromCssColorString(options.colorCss).withAlpha(
                options.alpha ?? 0.12
            ),
            outline: false,
        },
    });

    return entity.id;
}
