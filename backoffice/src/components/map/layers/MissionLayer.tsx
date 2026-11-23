"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import type { Waypoint, Hub } from "@/types";
import { getHubIconUri, getWaypointIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { buildMissionRoutePoints } from "@/components/missions";
import { formatAltitude } from "@/utils";

export interface MissionLayerProps {
    waypoints?: Waypoint[];
    selectedWaypointId?: string | null;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
}

export function MissionLayer({
    waypoints = [],
    selectedWaypointId,
    departureHub,
    arrivalHub,
}: MissionLayerProps) {
    const routeColor = "#00a3bf";
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderMissionRoute() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];

            if (
                departureHub?.location?.latitude !== undefined &&
                departureHub.location?.longitude !== undefined
            ) {
                const depId = "hub-dep-marker";
                const lng = departureHub.location.longitude;
                const lat = departureHub.location.latitude;

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
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: labelText,
                        accentColor: "#06b6d4",
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                    }),
                });
                newEntityIds.push(entity.id);
            }

            if (
                arrivalHub?.location?.latitude !== undefined &&
                arrivalHub.location?.longitude !== undefined &&
                arrivalHub.id !== departureHub?.id
            ) {
                const arrId = "hub-arr-marker";
                const lng = arrivalHub.location.longitude;
                const lat = arrivalHub.location.latitude;

                const entity = viewer.entities.add({
                    id: arrId,
                    name: `Arrival: ${arrivalHub.name}`,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
                    billboard: {
                        image: getHubIconUri("#06b6d4", false),
                        width: 28,
                        height: 28,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `ARR: ${arrivalHub.code || arrivalHub.name}`,
                        accentColor: "#06b6d4",
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                    }),
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
                const positions = routeCoords.map((pt) =>
                    Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, pt.alt)
                );

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
            }

            sortedWaypoints.forEach((wp, idx) => {
                const wpId = `wp-${wp.id || wp.tempId || idx}`;
                const isSelected = Boolean(
                    (selectedWaypointId && wp.id === selectedWaypointId) ||
                    (selectedWaypointId && wp.tempId === selectedWaypointId)
                );
                const seqNum = wp.sequence ?? idx + 1;
                const altText =
                    wp.altitude !== undefined && wp.altitude !== null
                        ? formatAltitude(wp.altitude)
                        : "";
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
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: labelText,
                        isSelected,
                        accentColor: isSelected ? "#00e5ff" : undefined,
                        pixelOffset: new Cesium.Cartesian2(0, isSelected ? -20 : -16),
                    }),
                });
                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

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
    }, [viewer, isLoaded, waypoints, selectedWaypointId, departureHub, arrivalHub, routeColor]);

    return null;
}
