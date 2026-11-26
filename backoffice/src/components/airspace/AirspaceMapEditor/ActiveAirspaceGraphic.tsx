"use client";

import { useEffect, useRef, useState } from "react";
import {
    useCesium,
    getCesium,
    buildClosedRingCartesian,
    getAirspaceZoneColor,
} from "@/components/map";
import type { AirspaceZoneType } from "@/types";
import { GeometryMode, GeoPoint, generateCircleCoordinates } from "../useAirspaceGeometry";

export interface ActiveAirspaceGraphicProps {
    geometryMode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
    hoverPoint?: GeoPoint | null;
    zoneType: AirspaceZoneType;
    altitudeFloor: number;
    altitudeCeiling: number;
}

export function ActiveAirspaceGraphic({
    geometryMode,
    center,
    radiusMeters,
    polygonPoints,
    hoverPoint = null,
    zoneType,
    altitudeFloor,
    altitudeCeiling,
}: ActiveAirspaceGraphicProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const previewEntityIdRef = useRef<string | null>(null);
    const [sceneRevision, setSceneRevision] = useState(0);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        const removeListener = viewer.scene.morphComplete.addEventListener(() => {
            setSceneRevision((rev) => rev + 1);
        });
        return () => {
            removeListener();
        };
    }, [viewer, isLoaded]);

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

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
            const newEntityIds: string[] = [];
            const hexColor = getAirspaceZoneColor(zoneType);
            const baseColor = Cesium.Color.fromCssColorString(hexColor);
            const fillColor = Cesium.Color.fromAlpha(baseColor, 0.32);
            const outlineColor = Cesium.Color.fromAlpha(baseColor, 0.95);
            const floor = Math.max(altitudeFloor ?? 0, 0);
            const ceiling = Math.max(altitudeCeiling ?? 120, floor + 10);

            if (geometryMode === "radius") {
                const centerPoint = viewer.entities.add({
                    id: "airspace-editor-center",
                    position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, 2),
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
                    64
                );
                const degreesArray = circleCoords.flat();

                if (degreesArray.length >= 6) {
                    const ringPositions = buildClosedRingCartesian(
                        Cesium,
                        degreesArray,
                        is3D ? ceiling : 2
                    );
                    const circleEntity = viewer.entities.add({
                        id: "airspace-editor-circle-volume",
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(
                                Cesium.Cartesian3.fromDegreesArray(degreesArray)
                            ),
                            height: is3D ? floor : 0,
                            extrudedHeight: is3D ? ceiling : undefined,
                            material: fillColor,
                            outline: is3D,
                            outlineColor: baseColor.withAlpha(0.5),
                            outlineWidth: 1,
                            closeTop: true,
                            closeBottom: true,
                        },
                        polyline:
                            ringPositions.length >= 2
                                ? {
                                      positions: ringPositions,
                                      width: 2.6,
                                      material: outlineColor,
                                      clampToGround: false,
                                  }
                                : undefined,
                    });
                    newEntityIds.push(circleEntity.id);
                }
            } else {
                polygonPoints.forEach((p, idx) => {
                    const isFirst = idx === 0;
                    const vertexEntity = viewer.entities.add({
                        id: `airspace-editor-vertex-${idx}`,
                        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 2),
                        point: {
                            pixelSize: isFirst ? 12 : 9,
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
                        const ringPositions = buildClosedRingCartesian(
                            Cesium,
                            degreesArray,
                            is3D ? ceiling : 2
                        );
                        const polygonEntity = viewer.entities.add({
                            id: "airspace-editor-polygon-volume",
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(
                                    Cesium.Cartesian3.fromDegreesArray(degreesArray)
                                ),
                                height: is3D ? floor : 0,
                                extrudedHeight: is3D ? ceiling : undefined,
                                material: fillColor,
                                outline: is3D,
                                outlineColor: baseColor.withAlpha(0.5),
                                outlineWidth: 1,
                                closeTop: true,
                                closeBottom: true,
                            },
                            polyline:
                                ringPositions.length >= 2
                                    ? {
                                          positions: ringPositions,
                                          width: 2.6,
                                          material: outlineColor,
                                          clampToGround: false,
                                      }
                                    : undefined,
                        });
                        newEntityIds.push(polygonEntity.id);

                        if (is3D) {
                            const groundRingPositions = buildClosedRingCartesian(
                                Cesium,
                                degreesArray,
                                2
                            );
                            if (groundRingPositions.length >= 2) {
                                const groundRing = viewer.entities.add({
                                    id: "airspace-editor-polygon-ground-ring",
                                    polyline: {
                                        positions: groundRingPositions,
                                        width: 1.8,
                                        material: new Cesium.PolylineDashMaterialProperty({
                                            color: baseColor.withAlpha(0.75),
                                            dashLength: 10,
                                        }),
                                    },
                                });
                                newEntityIds.push(groundRing.id);
                            }
                        }
                    } else {
                        const lineEntity = viewer.entities.add({
                            id: "airspace-editor-polyline",
                            polyline: {
                                positions: Cesium.Cartesian3.fromDegreesArrayHeights(
                                    polygonPoints.flatMap((p) => [p.lng, p.lat, 2])
                                ),
                                width: 2.8,
                                material: outlineColor,
                                clampToGround: false,
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
            if (viewer && !viewer.isDestroyed()) {
                entityIdsRef.current.forEach((id) => {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                });
                viewer.scene.requestRender();
            }
            entityIdsRef.current = [];
        };
    }, [
        viewer,
        isLoaded,
        geometryMode,
        center,
        radiusMeters,
        polygonPoints,
        zoneType,
        altitudeFloor,
        altitudeCeiling,
        sceneRevision,
    ]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderRubberBand() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            if (previewEntityIdRef.current) {
                const prev = viewer.entities.getById(previewEntityIdRef.current);
                if (prev) viewer.entities.remove(prev);
                previewEntityIdRef.current = null;
            }

            if (geometryMode !== "polygon" || !hoverPoint || polygonPoints.length === 0) {
                viewer.scene.requestRender();
                return;
            }

            const lineH = 2;
            const hexColor = getAirspaceZoneColor(zoneType);

            const lastPt = polygonPoints[polygonPoints.length - 1];
            const flatHeights = [
                lastPt.lng,
                lastPt.lat,
                lineH,
                hoverPoint.lng,
                hoverPoint.lat,
                lineH,
            ];
            if (polygonPoints.length >= 2) {
                const firstPt = polygonPoints[0];
                flatHeights.push(firstPt.lng, firstPt.lat, lineH);
            }

            const previewEntity = viewer.entities.add({
                id: "airspace-editor-rubberband",
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArrayHeights(flatHeights),
                    width: 2,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.fromCssColorString(hexColor).withAlpha(0.85),
                        dashLength: 12,
                    }),
                },
            });
            previewEntityIdRef.current = previewEntity.id;
            viewer.scene.requestRender();
        }

        renderRubberBand();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed() && previewEntityIdRef.current) {
                const prev = viewer.entities.getById(previewEntityIdRef.current);
                if (prev) viewer.entities.remove(prev);
                previewEntityIdRef.current = null;
                viewer.scene.requestRender();
            }
        };
    }, [viewer, isLoaded, geometryMode, polygonPoints, hoverPoint, zoneType, sceneRevision]);

    return null;
}
