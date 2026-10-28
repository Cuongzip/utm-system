import { useState, useCallback, useMemo } from "react";

export type GeometryMode = "radius" | "polygon";

export interface GeoPoint {
    lat: number;
    lng: number;
}

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

export function calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function parseExistingGeometry(geometry?: { type?: string; coordinates?: number[][][] }): {
    mode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
} {
    const defaultCenter: GeoPoint = { lat: 10.7769, lng: 106.7009 };
    const defaultRadius = 1000;

    if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
        return {
            mode: "radius",
            center: defaultCenter,
            radiusMeters: defaultRadius,
            polygonPoints: [],
        };
    }

    const outerRing = geometry.coordinates[0];
    if (!outerRing || outerRing.length < 3) {
        return {
            mode: "radius",
            center: defaultCenter,
            radiusMeters: defaultRadius,
            polygonPoints: [],
        };
    }

    let sumLng = 0;
    let sumLat = 0;
    const pointsCount = outerRing.length;

    for (let i = 0; i < pointsCount - 1; i++) {
        sumLng += outerRing[i][0];
        sumLat += outerRing[i][1];
    }
    const centroidLng = sumLng / (pointsCount - 1);
    const centroidLat = sumLat / (pointsCount - 1);

    if (pointsCount >= 30 && pointsCount <= 36) {
        const d0 = calculateDistanceMeters(
            centroidLat,
            centroidLng,
            outerRing[0][1],
            outerRing[0][0]
        );
        const dHalf = calculateDistanceMeters(
            centroidLat,
            centroidLng,
            outerRing[Math.floor(pointsCount / 2)][1],
            outerRing[Math.floor(pointsCount / 2)][0]
        );

        if (Math.abs(d0 - dHalf) / Math.max(d0, 1) < 0.1) {
            return {
                mode: "radius",
                center: {
                    lat: Number(centroidLat.toFixed(6)),
                    lng: Number(centroidLng.toFixed(6)),
                },
                radiusMeters: Math.round(d0),
                polygonPoints: [],
            };
        }
    }

    const polygonPoints: GeoPoint[] = [];
    const numVertices =
        outerRing.length > 1 &&
        outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
        outerRing[0][1] === outerRing[outerRing.length - 1][1]
            ? outerRing.length - 1
            : outerRing.length;

    for (let i = 0; i < numVertices; i++) {
        polygonPoints.push({
            lat: outerRing[i][1],
            lng: outerRing[i][0],
        });
    }

    return {
        mode: "polygon",
        center: {
            lat: Number(centroidLat.toFixed(6)),
            lng: Number(centroidLng.toFixed(6)),
        },
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
    const [center, setCenter] = useState<GeoPoint>(parsed.center);
    const [radiusMeters, setRadiusMeters] = useState<number>(parsed.radiusMeters);
    const [polygonPoints, setPolygonPoints] = useState<GeoPoint[]>(parsed.polygonPoints);

    const updateCenter = useCallback((lat: number, lng: number) => {
        setCenter({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
        });
    }, []);

    const updateRadius = useCallback((meters: number) => {
        setRadiusMeters(Math.max(10, Math.round(meters)));
    }, []);

    const addPolygonPoint = useCallback((lat: number, lng: number) => {
        setPolygonPoints((prev) => [
            ...prev,
            { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
        ]);
    }, []);

    const removePolygonPoint = useCallback((index: number) => {
        setPolygonPoints((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const undoPolygonPoint = useCallback(() => {
        setPolygonPoints((prev) => prev.slice(0, -1));
    }, []);

    const clearPolygonPoints = useCallback(() => {
        setPolygonPoints([]);
    }, []);

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
        setCenter: updateCenter,
        radiusMeters,
        setRadiusMeters: updateRadius,
        polygonPoints,
        addPolygonPoint,
        removePolygonPoint,
        undoPolygonPoint,
        clearPolygonPoints,
        computedGeoJson,
    };
}
