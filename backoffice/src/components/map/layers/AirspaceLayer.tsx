"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { AirspaceZone } from "@/types";
import { MAP_TOKENS } from "../mapTokens";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";

export interface AirspaceLayerProps {
    zones: AirspaceZone[];
    autoFitBounds?: boolean;
}

const TYPE_COLOR_MAP: Record<string, string> = {
    no_fly_zone: MAP_TOKENS.colors.airspace.no_fly_zone,
    restricted: MAP_TOKENS.colors.airspace.restricted,
    hub_corridor: MAP_TOKENS.colors.airspace.hub_corridor,
    warning: MAP_TOKENS.colors.airspace.warning,
};

export function AirspaceLayer({ zones = [], autoFitBounds = true }: AirspaceLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasAutoFittedRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderZones() {
            const Cesium = await import("cesium");
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];

            zones.forEach((zone) => {
                const coords = zone.geometry?.coordinates?.[0];
                if (!Array.isArray(coords) || coords.length < 3) return;

                const degreeArray: number[] = [];
                let sumLng = 0;
                let sumLat = 0;
                let validCount = 0;

                coords.forEach((coord) => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                        const lng = coord[0];
                        const lat = coord[1];
                        if (!isNaN(lng) && !isNaN(lat)) {
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
                        material: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(baseColor),
                            0.16
                        ),
                        outline: true,
                        outlineColor: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(baseColor),
                            0.8
                        ),
                        outlineWidth: 1.5,
                        height: floor,
                        extrudedHeight: ceiling,
                    },
                    position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, ceiling + 15),
                    label: createTacticalLabel(Cesium, {
                        text: `${zone.name || zone.id} (${floor}-${ceiling}m)`,
                        isSelected: false,
                        accentColor: "#f59e0b",
                        fontSize: 11,
                        maxDistance: 1500000,
                    }),
                });

                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

            if (autoFitBounds && !hasAutoFittedRef.current && zones.length > 0) {
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
    }, [viewer, isLoaded, zones, autoFitBounds]);

    return null;
}
