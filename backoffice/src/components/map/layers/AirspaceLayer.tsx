"use client";

import { memo, useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { useSceneMorphRevision } from "../useSceneMorphRevision";
import type { AirspaceZone } from "@/types";
import { getAirspaceZoneColor } from "../mapTokens";
import { createTacticalLabel } from "../mapLabels";
import { addCrispBoundaryPolyline, buildClosedRingCartesian } from "../cesiumOutlineUtils";

type AirspaceLabelFilter = "all" | "hazards" | "none";

interface AirspaceLayerProps {
    zones: AirspaceZone[];
    labelMaxDistance?: number;
    labelFilter?: AirspaceLabelFilter;
}

const HUB_CONTEXT_ZONE_TYPES = new Set(["hub_zone", "hub_corridor"]);

function formatCompactZoneName(zone: AirspaceZone): string {
    const raw = (zone.name || zone.id || "Zone").trim();
    return raw.length > 22 ? `${raw.slice(0, 20)}…` : raw;
}

const EMPTY_ZONES: AirspaceZone[] = [];

export const AirspaceLayer = memo(function AirspaceLayer({
    zones = EMPTY_ZONES,
    labelMaxDistance = 11000,
    labelFilter = "hazards",
}: AirspaceLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const sceneRevision = useSceneMorphRevision(viewer, isLoaded);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderZones() {
            const Cesium = await getCesium();
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
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

                const baseColor = getAirspaceZoneColor(zone.zoneType);

                const floor = zone.altitudeFloor ?? 0;
                const ceiling =
                    zone.altitudeCeiling !== undefined && zone.altitudeCeiling > floor
                        ? zone.altitudeCeiling
                        : floor + 150;

                const ringHeight = is3D ? ceiling : 2;
                const topRingPositions = buildClosedRingCartesian(Cesium, degreeArray, ringHeight);
                const normalizedZoneType = (zone.zoneType ?? "").trim().toLowerCase();
                const shouldShowLabel =
                    labelFilter === "all"
                        ? true
                        : labelFilter === "hazards"
                          ? !HUB_CONTEXT_ZONE_TYPES.has(normalizedZoneType)
                          : false;

                const entity = viewer.entities.add({
                    id: zone.id,
                    name: zone.name,
                    polygon: {
                        hierarchy: new Cesium.PolygonHierarchy(
                            Cesium.Cartesian3.fromDegreesArray(degreeArray)
                        ),
                        material: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(baseColor),
                            is3D ? 0.18 : 0.16
                        ),
                        outline: is3D,
                        outlineColor: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(baseColor),
                            0.55
                        ),
                        outlineWidth: 1,
                        height: is3D ? floor : 0,
                        extrudedHeight: is3D ? ceiling : undefined,
                    },
                    polyline:
                        topRingPositions.length >= 2
                            ? {
                                  positions: topRingPositions,
                                  width: 2.2,
                                  material:
                                      Cesium.Color.fromCssColorString(baseColor).withAlpha(0.9),
                                  clampToGround: false,
                              }
                            : undefined,
                    position: Cesium.Cartesian3.fromDegrees(
                        centerLng,
                        centerLat,
                        is3D ? ceiling + 15 : 15
                    ),
                    label: shouldShowLabel
                        ? createTacticalLabel(Cesium, {
                              text: `${formatCompactZoneName(zone)} · ${floor}–${ceiling}m`,
                              isSelected: false,
                              variant: "zone",
                              accentColor: baseColor,
                              maxDistance: labelMaxDistance,
                          })
                        : undefined,
                });

                newEntityIds.push(entity.id);

                if (is3D && floor > 0) {
                    const floorRingId = addCrispBoundaryPolyline(Cesium, viewer, {
                        id: `${zone.id}-floor-ring`,
                        degreePairs: degreeArray,
                        heightM: floor,
                        colorCss: baseColor,
                        alpha: 0.45,
                        width: 1.4,
                    });
                    if (floorRingId) newEntityIds.push(floorRingId);
                }
            });

            entityIdsRef.current = newEntityIds;
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
    }, [viewer, isLoaded, zones, labelMaxDistance, labelFilter, sceneRevision]);

    return null;
});
