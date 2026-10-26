"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { Waypoint, Hub } from "@/types";
import { getHubIconUri, getWaypointIconUri } from "../mapIcons";
import { fitCameraToBounds } from "../cesiumUtils";
import { buildMissionRoutePoints } from "@/components/missions";

export interface MissionLayerProps {
    waypoints?: Waypoint[];
    selectedWaypointId?: string | null;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    autoFitBounds?: boolean;
    routeColor?: string;
}

export function MissionLayer({
    waypoints = [],
    selectedWaypointId,
    departureHub,
    arrivalHub,
    autoFitBounds = true,
    routeColor = "#00a3bf",
}: MissionLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderMissionRoute() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const allPoints: { lng: number; lat: number }[] = [];

            if (
                departureHub?.location?.lat !== undefined &&
                departureHub.location?.lng !== undefined
            ) {
                const depId = "hub-dep-marker";
                const lng = departureHub.location.lng;
                const lat = departureHub.location.lat;
                allPoints.push({ lng, lat });

                const isSameHub = arrivalHub?.id === departureHub.id;
                const labelText = isSameHub
                    ? `HUB: ${departureHub.code || departureHub.name}`
                    : `DEP: ${departureHub.code || departureHub.name}`;

                const entity = viewer.entities.add({
                    id: depId,
                    name: `Departure: ${departureHub.name}`,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
                    billboard: {
                        image: getHubIconUri("#06b6d4", false),
                        width: 28,
                        height: 28,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: labelText,
                        font: "bold 10px monospace",
                        fillColor: Cesium.Color.fromCssColorString("#06b6d4"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(entity.id);
            }

            if (
                arrivalHub?.location?.lat !== undefined &&
                arrivalHub.location?.lng !== undefined &&
                arrivalHub.id !== departureHub?.id
            ) {
                const arrId = "hub-arr-marker";
                const lng = arrivalHub.location.lng;
                const lat = arrivalHub.location.lat;
                allPoints.push({ lng, lat });

                const entity = viewer.entities.add({
                    id: arrId,
                    name: `Arrival: ${arrivalHub.name}`,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
                    billboard: {
                        image: getHubIconUri("#06b6d4", false),
                        width: 28,
                        height: 28,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: `ARR: ${arrivalHub.code || arrivalHub.name}`,
                        font: "bold 10px monospace",
                        fillColor: Cesium.Color.fromCssColorString("#06b6d4"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(entity.id);
            }

            const sortedWaypoints = [...waypoints].sort(
                (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
            );

            const routePoints = buildMissionRoutePoints(waypoints, departureHub, arrivalHub);
            const routeCoords = routePoints.map((pt) => ({
                lng: pt.longitude,
                lat: pt.latitude,
                alt: pt.isDeparture || pt.isArrival ? 10 : pt.altitude,
            }));

            if (routeCoords.length >= 2) {
                const polylineId = "mission-polyline";
                const positions = routeCoords.map((pt) => {
                    allPoints.push({ lng: pt.lng, lat: pt.lat });
                    return Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, pt.alt);
                });

                const entity = viewer.entities.add({
                    id: polylineId,
                    name: "Mission Flight Path",
                    polyline: {
                        positions,
                        width: 3,
                        material: Cesium.Color.fromCssColorString(routeColor),
                        clampToGround: false,
                    },
                });
                newEntityIds.push(entity.id);
            } else if (routeCoords.length === 1) {
                allPoints.push({ lng: routeCoords[0].lng, lat: routeCoords[0].lat });
            }

            sortedWaypoints.forEach((wp, idx) => {
                const wpId = `wp-${wp.id || wp.tempId || idx}`;
                const isSelected = Boolean(
                    (selectedWaypointId && wp.id === selectedWaypointId) ||
                    (selectedWaypointId && wp.tempId === selectedWaypointId)
                );
                const isStart = idx === 0;
                const seqNum = wp.sequence ?? idx + 1;
                const altText = wp.altitude ? `${wp.altitude}m` : "";
                const labelText = `WP${seqNum} ${altText}`.trim();

                const entity = viewer.entities.add({
                    id: wpId,
                    name: wp.name || `Waypoint ${seqNum}`,
                    position: Cesium.Cartesian3.fromDegrees(
                        wp.longitude ?? 0,
                        wp.latitude ?? 0,
                        wp.altitude ?? 50
                    ),
                    billboard: {
                        image: getWaypointIconUri(seqNum, isSelected),
                        width: isSelected ? 30 : 24,
                        height: isSelected ? 30 : 24,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: labelText,
                        font: isSelected ? "bold 11px monospace" : "600 10px monospace",
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#00e5ff")
                            : Cesium.Color.fromCssColorString("#0f172a"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, isSelected ? -20 : -16),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

            if (autoFitBounds && allPoints.length > 0) {
                if (allPoints.length === 1) {
                    viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(
                            allPoints[0].lng,
                            allPoints[0].lat,
                            15000.0
                        ),
                    });
                } else {
                    fitCameraToBounds(viewer, allPoints, { bufferRatio: 0.35, minBuffer: 0.02 });
                }
            }

            viewer.scene.requestRender();
        }

        renderMissionRoute();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                entityIdsRef.current.forEach((id) => {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                });
            }
            entityIdsRef.current = [];
        };
    }, [
        viewer,
        isLoaded,
        waypoints,
        selectedWaypointId,
        departureHub,
        arrivalHub,
        autoFitBounds,
        routeColor,
    ]);

    return null;
}

export default MissionLayer;
