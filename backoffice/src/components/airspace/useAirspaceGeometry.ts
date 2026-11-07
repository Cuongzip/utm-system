import { useState, useMemo } from "react";
import type { GeoPoint } from "@/utils/geo";

export type GeometryMode = "radius" | "polygon";

export type { GeoPoint };

export interface GeoJsonPolygon {
    type: "Polygon";
    coordinates: number[][][];
}

export function generateCircleCoordinates(
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
    pointsCount = 32
): [number, number][] {
    const coordinates: [number, number][] = [];
    const latRad = (centerLat * Math.PI) / 180;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(latRad);

    for (let i = 0; i <= pointsCount; i++) {
        const angle = (i * 2 * Math.PI) / pointsCount;
        const dLat = (radiusMeters * Math.cos(angle)) / metersPerDegreeLat;
        const dLng = (radiusMeters * Math.sin(angle)) / metersPerDegreeLng;

        const pLat = Number((centerLat + dLat).toFixed(6));
        const pLng = Number((centerLng + dLng).toFixed(6));
        coordinates.push([pLng, pLat]);
    }

    return coordinates;
}

export function generateCirclePolygon(
    centerLat: number,
    centerLng: number,
    radiusMeters: number
): GeoJsonPolygon {
    return {
        type: "Polygon",
        coordinates: [generateCircleCoordinates(centerLat, centerLng, radiusMeters)],
    };
}

export function parseExistingGeometry(geometry?: any): {
    mode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
} {
    const defaultCenter: GeoPoint = { lat: 10.7769, lng: 106.7009 };
    const defaultRadius = 1000;

    let parsed = geometry;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            parsed = null;
        }
    }

    if (!parsed || !parsed.coordinates || parsed.coordinates.length === 0) {
        return {
            mode: "radius",
            center: defaultCenter,
            radiusMeters: defaultRadius,
            polygonPoints: [],
        };
    }

    const outerRing = parsed.coordinates[0];
    if (!outerRing || outerRing.length < 3) {
        return {
            mode: "radius",
            center: defaultCenter,
            radiusMeters: defaultRadius,
            polygonPoints: [],
        };
    }

    const numVertices =
        outerRing.length > 1 &&
        outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
        outerRing[0][1] === outerRing[outerRing.length - 1][1]
            ? outerRing.length - 1
            : outerRing.length;

    const polygonPoints: GeoPoint[] = [];
    let sumLng = 0;
    let sumLat = 0;

    for (let i = 0; i < numVertices; i++) {
        const lng = outerRing[i][0];
        const lat = outerRing[i][1];
        polygonPoints.push({ lat, lng });
        sumLng += lng;
        sumLat += lat;
    }

    const center =
        numVertices > 0
            ? {
                  lat: Number((sumLat / numVertices).toFixed(6)),
                  lng: Number((sumLng / numVertices).toFixed(6)),
              }
            : defaultCenter;

    return {
        mode: "polygon",
        center,
        radiusMeters: defaultRadius,
        polygonPoints,
    };
}

export function useAirspaceGeometry(initialGeometry?: {
    type?: string;
    coordinates?: number[][][];
}) {
    const parsed = useMemo(() => parseExistingGeometry(initialGeometry), [initialGeometry]);

    const [geometryMode, setGeometryMode] = useState<GeometryMode>(parsed.mode);
    const [center, setCenterState] = useState<GeoPoint>(parsed.center);
    const [radiusMeters, setRadiusMetersState] = useState<number>(parsed.radiusMeters);
    const [polygonPoints, setPolygonPoints] = useState<GeoPoint[]>(parsed.polygonPoints);

    const setCenter = (lat: number, lng: number) =>
        setCenterState({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });

    const setRadiusMeters = (meters: number) =>
        setRadiusMetersState(Math.max(10, Math.round(meters)));

    const addPolygonPoint = (lat: number, lng: number) =>
        setPolygonPoints((prev) => [
            ...prev,
            { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
        ]);

    const removePolygonPoint = (index: number) =>
        setPolygonPoints((prev) => prev.filter((_, i) => i !== index));

    const undoPolygonPoint = () => setPolygonPoints((prev) => prev.slice(0, -1));

    const clearPolygonPoints = () => setPolygonPoints([]);

    const computedGeoJson = useMemo<GeoJsonPolygon | null>(() => {
        if (geometryMode === "radius") {
            if (radiusMeters <= 0 || !center.lat || !center.lng) return null;
            return generateCirclePolygon(center.lat, center.lng, radiusMeters);
        }

        if (polygonPoints.length < 3) return null;

        const coords: [number, number][] = polygonPoints.map((p) => [p.lng, p.lat]);
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push([first[0], first[1]]);
        }

        return {
            type: "Polygon",
            coordinates: [coords],
        };
    }, [geometryMode, center, radiusMeters, polygonPoints]);

    return {
        geometryMode,
        setGeometryMode,
        center,
        setCenter,
        radiusMeters,
        setRadiusMeters,
        polygonPoints,
        addPolygonPoint,
        removePolygonPoint,
        undoPolygonPoint,
        clearPolygonPoints,
        computedGeoJson,
    };
}
