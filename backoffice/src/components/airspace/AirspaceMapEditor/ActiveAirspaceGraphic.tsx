"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "@/components/map";
import { MAP_TOKENS } from "@/components/map/mapTokens";
import type { AirspaceZoneType } from "@/types";
import { GeometryMode, GeoPoint, generateCircleCoordinates } from "../useAirspaceGeometry";
import { getCesium } from "./cesiumLoader";

const TYPE_COLOR_MAP: Record<string, string> = {
    no_fly_zone: MAP_TOKENS.colors.airspace.no_fly_zone,
    restricted: MAP_TOKENS.colors.airspace.restricted,
    hub_corridor: MAP_TOKENS.colors.airspace.hub_corridor,
    warning: MAP_TOKENS.colors.airspace.warning,
};

export interface ActiveAirspaceGraphicProps {
    geometryMode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
    zoneType: AirspaceZoneType;
    altitudeCeiling: number;
}

export function ActiveAirspaceGraphic({
    geometryMode,
    center,
    radiusMeters,
    polygonPoints,
    zoneType,
    altitudeCeiling,
}: ActiveAirspaceGraphicProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderGraphic() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const hexColor = TYPE_COLOR_MAP[zoneType] || "#06b6d4";
            const baseColor = Cesium.Color.fromCssColorString(hexColor);
            const fillColor = Cesium.Color.fromAlpha(baseColor, 0.35);
            const outlineColor = Cesium.Color.fromAlpha(baseColor, 0.9);
            const ceiling = Math.max(altitudeCeiling || 120, 20);

            if (geometryMode === "radius") {
                const centerPoint = viewer.entities.add({
                    id: "airspace-editor-center",
                    position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, 0),
                    point: {
                        pixelSize: 10,
                        color: outlineColor,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(centerPoint.id);

                const circleCoords = generateCircleCoordinates(
                    center.lat,
                    center.lng,
                    radiusMeters,
                    36
                );
                const degreesArray = circleCoords.flat();

                if (degreesArray.length >= 6) {
                    const circleEntity = viewer.entities.add({
                        id: "airspace-editor-circle-volume",
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(
                                Cesium.Cartesian3.fromDegreesArray(degreesArray)
                            ),
                            height: 0,
                            extrudedHeight: ceiling,
                            material: fillColor,
                            outline: true,
                            outlineColor: outlineColor,
                            outlineWidth: 2,
                            closeTop: true,
                            closeBottom: true,
                        },
                    });
                    newEntityIds.push(circleEntity.id);
                }
            } else {
                polygonPoints.forEach((p, idx) => {
                    const isFirst = idx === 0;
                    const vertexEntity = viewer.entities.add({
                        id: `airspace-editor-vertex-${idx}`,
                        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 0),
                        point: {
                            pixelSize: isFirst ? 11 : 8,
                            color: isFirst ? Cesium.Color.WHITE : outlineColor,
                            outlineColor: isFirst ? outlineColor : Cesium.Color.WHITE,
                            outlineWidth: 2,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                    });
                    newEntityIds.push(vertexEntity.id);
                });

                if (polygonPoints.length >= 2) {
                    const degreesArray = polygonPoints.flatMap((p) => [p.lng, p.lat]);

                    if (polygonPoints.length >= 3) {
                        const polygonEntity = viewer.entities.add({
                            id: "airspace-editor-polygon-volume",
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(
                                    Cesium.Cartesian3.fromDegreesArray(degreesArray)
                                ),
                                height: 0,
                                extrudedHeight: ceiling,
                                material: fillColor,
                                outline: true,
                                outlineColor: outlineColor,
                                outlineWidth: 2,
                                closeTop: true,
                                closeBottom: true,
                            },
                        });
                        newEntityIds.push(polygonEntity.id);
                    } else {
                        const lineEntity = viewer.entities.add({
                            id: "airspace-editor-polyline",
                            polyline: {
                                positions: Cesium.Cartesian3.fromDegreesArray(degreesArray),
                                width: 3,
                                material: outlineColor,
                                clampToGround: true,
                            },
                        });
                        newEntityIds.push(lineEntity.id);
                    }
                }
            }

            entityIdsRef.current = newEntityIds;
            viewer.scene.requestRender();
        }

        renderGraphic();

        return () => {
            cancelled = true;
        };
    }, [
        viewer,
        isLoaded,
        geometryMode,
        center,
        radiusMeters,
        polygonPoints,
        zoneType,
        altitudeCeiling,
    ]);

    return null;
}
