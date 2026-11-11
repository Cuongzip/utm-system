"use client";

import { useEffect, useRef } from "react";
import {
    useCesium,
    getCesium,
    getHubIconUri,
    getWaypointIconUri,
    createTacticalLabel,
} from "@/components/map";
import type { Hub } from "@/types";
import type { FlightWaypoint } from "../useFlightRoute";

export interface FlightRouteRendererProps {
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    waypoints: FlightWaypoint[];
    selectedWaypointId?: string | null;
    cruisingAltitude: number;
}

export function FlightRouteRenderer({
    departureHub,
    arrivalHub,
    waypoints = [],
    selectedWaypointId,
    cruisingAltitude = 120,
}: FlightRouteRendererProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderRoute() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const routePositions: import("cesium").Cartesian3[] = [];

            let depPos: import("cesium").Cartesian3 | null = null;
            if (
                departureHub?.location?.latitude !== undefined &&
                departureHub?.location?.longitude !== undefined
            ) {
                const pos = Cesium.Cartesian3.fromDegrees(
                    departureHub.location.longitude,
                    departureHub.location.latitude,
                    departureHub.altitudeMsl ?? 10
                );
                depPos = pos;
                routePositions.push(pos);
            }

            waypoints.forEach((wp) => {
                const alt = wp.altitude ?? cruisingAltitude;
                const pos = Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, alt);
                routePositions.push(pos);
            });

            let arrPos: import("cesium").Cartesian3 | null = null;
            if (
                arrivalHub?.location?.latitude !== undefined &&
                arrivalHub?.location?.longitude !== undefined &&
                arrivalHub.id !== departureHub?.id
            ) {
                const pos = Cesium.Cartesian3.fromDegrees(
                    arrivalHub.location.longitude,
                    arrivalHub.location.latitude,
                    arrivalHub.altitudeMsl ?? 10
                );
                arrPos = pos;
                routePositions.push(pos);
            }

            if (routePositions.length >= 2) {
                const lineId = "flight-planned-corridor";
                viewer.entities.add({
                    id: lineId,
                    polyline: {
                        positions: routePositions,
                        width: 3.0,
                        material: Cesium.Color.fromCssColorString("#06b6d4"),
                        clampToGround: false,
                    },
                });
                newEntityIds.push(lineId);
            }

            if (depPos && departureHub) {
                const depId = "flight-dep-hub";
                const isSameHub = arrivalHub?.id === departureHub.id;
                viewer.entities.add({
                    id: depId,
                    position: depPos,
                    billboard: {
                        image: getHubIconUri("#10b981", false),
                        width: 28,
                        height: 28,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: isSameHub
                            ? `HUB: ${departureHub.code || departureHub.name}`
                            : `DEP: ${departureHub.code || departureHub.name}`,
                        accentColor: "#10b981",
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                    }),
                });
                newEntityIds.push(depId);
            }

            if (arrPos && arrivalHub && arrivalHub.id !== departureHub?.id) {
                const arrId = "flight-arr-hub";
                viewer.entities.add({
                    id: arrId,
                    position: arrPos,
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
                newEntityIds.push(arrId);
            }

            waypoints.forEach((wp, index) => {
                const alt = wp.altitude ?? cruisingAltitude;
                const pos = Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, alt);
                const isSelected =
                    selectedWaypointId === wp.id ||
                    selectedWaypointId === wp.tempId ||
                    selectedWaypointId === `wp-${wp.id}`;
                const wpId = `flight-wp-${wp.id || wp.tempId || index}`;

                viewer.entities.add({
                    id: wpId,
                    position: pos,
                    billboard: {
                        image: getWaypointIconUri(wp.sequence ?? index + 1, isSelected),
                        width: isSelected ? 30 : 24,
                        height: isSelected ? 30 : 24,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `WP${wp.sequence ?? index + 1} (${alt}m)`,
                        isSelected,
                        accentColor: "#00e5ff",
                        pixelOffset: new Cesium.Cartesian2(0, isSelected ? -20 : -16),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                    }),
                });
                newEntityIds.push(wpId);
            });

            entityIdsRef.current = newEntityIds;
            viewer.scene.requestRender();
        }

        renderRoute();

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
        departureHub,
        arrivalHub,
        waypoints,
        selectedWaypointId,
        cruisingAltitude,
    ]);

    return null;
}
