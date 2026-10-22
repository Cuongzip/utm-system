"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { AirspaceZone } from "@/types";

export interface AirspaceLayerProps {
    zones: AirspaceZone[];
    selectedZoneId?: string | null;
    autoFitBounds?: boolean;
}

const TYPE_COLOR_MAP: Record<string, string> = {
    no_fly_zone: "#ef4444",
    restricted: "#f59e0b",
    hub_corridor: "#06b6d4",
    warning: "#eab308",
};

export function AirspaceLayer({
    zones = [],
    selectedZoneId,
    autoFitBounds = true,
}: AirspaceLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderZones() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];

            zones.forEach((zone) => {
                const coordinates = zone.geometry?.coordinates;
                if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
                    return;
                }

                const outerRing = coordinates[0];
                if (!outerRing || outerRing.length < 3) return;

                const degreeArray: number[] = [];
                let sumLng = 0;
                let sumLat = 0;
                let validCount = 0;

                outerRing.forEach((point) => {
                    if (Array.isArray(point) && point.length >= 2) {
                        const lng = point[0];
                        const lat = point[1];
                        if (typeof lng === "number" && typeof lat === "number") {
                            degreeArray.push(lng, lat);
                            sumLng += lng;
                            sumLat += lat;
                            validCount++;
                        }
                    }
                });

                if (degreeArray.length < 6) return;

                const centerLng = sumLng / validCount;
                const centerLat = sumLat / validCount;

                const isSelected = selectedZoneId === zone.id;
                const zoneTypeKey = zone.zoneType || "warning";
                const baseColor = TYPE_COLOR_MAP[zoneTypeKey] || "#64748b";

                const entity = viewer.entities.add({
                    id: zone.id,
                    name: zone.name,
                    polygon: {
                        hierarchy: new Cesium.PolygonHierarchy(
                            Cesium.Cartesian3.fromDegreesArray(degreeArray)
                        ),
                        material: isSelected
                            ? Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.28
                              )
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.12
                              ),
                        outline: true,
                        outlineColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.6
                              ),
                        outlineWidth: isSelected ? 2 : 1,
                        height: 0,
                    },
                    position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, 0),
                    label: {
                        text: zone.name || zone.id,
                        font: isSelected ? "bold 12px monospace" : "600 11px monospace",
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        showBackground: false,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1500000),
                    },
                });

                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

            if (selectedZoneId) {
                const target = zones.find((z) => z.id === selectedZoneId);
                const outerRing = target?.geometry?.coordinates?.[0];
                if (Array.isArray(outerRing) && outerRing.length > 0) {
                    let sumLng = 0,
                        sumLat = 0,
                        count = 0;
                    outerRing.forEach((point) => {
                        if (Array.isArray(point) && point.length >= 2) {
                            sumLng += point[0];
                            sumLat += point[1];
                            count++;
                        }
                    });
                    if (count > 0) {
                        viewer.camera.flyTo({
                            destination: Cesium.Cartesian3.fromDegrees(
                                sumLng / count,
                                sumLat / count,
                                20000.0
                            ),
                            duration: 0.8,
                        });
                    }
                }
            } else if (autoFitBounds && zones.length > 0) {
                let minLat = 90,
                    maxLat = -90,
                    minLng = 180,
                    maxLng = -180;
                let hasPoints = false;
                zones.forEach((z) => {
                    const outerRing = z.geometry?.coordinates?.[0];
                    if (Array.isArray(outerRing)) {
                        outerRing.forEach((point) => {
                            if (Array.isArray(point) && point.length >= 2) {
                                const lng = point[0];
                                const lat = point[1];
                                if (typeof lng === "number" && typeof lat === "number") {
                                    if (lat < minLat) minLat = lat;
                                    if (lat > maxLat) maxLat = lat;
                                    if (lng < minLng) minLng = lng;
                                    if (lng > maxLng) maxLng = lng;
                                    hasPoints = true;
                                }
                            }
                        });
                    }
                });

                if (hasPoints) {
                    const latBuf = Math.max((maxLat - minLat) * 0.4, 0.08);
                    const lngBuf = Math.max((maxLng - minLng) * 0.4, 0.08);

                    viewer.camera.setView({
                        destination: Cesium.Rectangle.fromDegrees(
                            minLng - lngBuf,
                            minLat - latBuf,
                            maxLng + lngBuf,
                            maxLat + latBuf
                        ),
                    });
                }
            }

            viewer.scene.requestRender();
        }

        renderZones();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                entityIdsRef.current.forEach((id) => {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                });
                entityIdsRef.current = [];
                viewer.scene.requestRender();
            }
        };
    }, [viewer, isLoaded, zones, selectedZoneId, autoFitBounds]);

    return null;
}

export default AirspaceLayer;
