"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { AirspaceZone } from "@/types";
import { MAP_TOKENS } from "../mapTokens";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";

export interface AirspaceLayerProps {
    zones: AirspaceZone[];
    selectedZoneId?: string | null;
    autoFitBounds?: boolean;
}

const TYPE_COLOR_MAP: Record<string, string> = {
    no_fly_zone: MAP_TOKENS.colors.airspace.no_fly_zone,
    restricted: MAP_TOKENS.colors.airspace.restricted,
    hub_corridor: MAP_TOKENS.colors.airspace.hub_corridor,
    warning: MAP_TOKENS.colors.airspace.warning,
};

export function AirspaceLayer({
    zones = [],
    selectedZoneId,
    autoFitBounds = true,
}: AirspaceLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasAutoFittedRef = useRef(false);

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

                const floor = 0;
                const ceiling =
                    zone.altitudeCeiling && zone.altitudeCeiling > floor
                        ? zone.altitudeCeiling
                        : 150;

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
                                  0.32
                              )
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.16
                              ),
                        outline: true,
                        outlineColor: isSelected
                            ? Cesium.Color.fromCssColorString("#ffffff")
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseColor),
                                  0.8
                              ),
                        outlineWidth: isSelected ? 2.5 : 1.5,
                        height: floor,
                        extrudedHeight: ceiling,
                    },
                    position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, ceiling + 15),
                    label: createTacticalLabel(Cesium, {
                        text: `${zone.name || zone.id} (${floor}-${ceiling}m)`,
                        isSelected,
                        accentColor: "#f59e0b",
                        fontSize: isSelected ? 12 : 11,
                        maxDistance: 1500000,
                    }),
                });

                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

            if (selectedZoneId) {
                const target = zones.find((z) => z.id === selectedZoneId);
                const outerRing = target?.geometry?.coordinates?.[0];
                if (Array.isArray(outerRing) && outerRing.length > 0) {
                    const pts: { lat: number; lng: number }[] = [];
                    outerRing.forEach((point) => {
                        if (Array.isArray(point) && point.length >= 2) {
                            pts.push({ lng: point[0], lat: point[1] });
                        }
                    });
                    if (pts.length > 0) {
                        fitCameraToBounds(viewer, pts, {
                            animate: true,
                            duration: 0.8,
                            minHeight: 1200,
                            paddingMultiplier: 1.5,
                        });
                    }
                }
            } else if (autoFitBounds && !hasAutoFittedRef.current && zones.length > 0) {
                hasAutoFittedRef.current = true;
                const points = zones.flatMap(
                    (z) =>
                        z.geometry?.coordinates?.[0]
                            ?.filter(
                                (p) =>
                                    Array.isArray(p) &&
                                    p.length >= 2 &&
                                    !isNaN(p[0]) &&
                                    !isNaN(p[1])
                            )
                            .map((p) => ({ lng: p[0], lat: p[1] })) ?? []
                );

                fitCameraToBounds(viewer, points, {
                    animate: true,
                    duration: 1.0,
                    minHeight: 2000,
                    paddingMultiplier: 1.4,
                });
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
