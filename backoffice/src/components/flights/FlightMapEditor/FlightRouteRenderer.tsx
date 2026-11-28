"use client";

import { useEffect, useRef, useState } from "react";
import {
    useCesium,
    getCesium,
    getHubIconUri,
    getWaypointIconUri,
    createTacticalLabel,
    addAltitudeDropLine,
    addRouteCurtainWall,
} from "@/components/map";
import { calculateDistance } from "@/utils";
import type { Hub } from "@/types";
import type { FlightWaypoint } from "../useFlightRoute";

interface FlightRouteRendererProps {
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    waypoints: FlightWaypoint[];
    selectedWaypointId: string | null;
    cruisingAltitude: number;
}

function isCoincidentWithHub(wp: FlightWaypoint, hub: Hub | null): boolean {
    if (!hub?.location || hub.location.latitude == null || hub.location.longitude == null) {
        return false;
    }
    return (
        Math.abs(wp.latitude - hub.location.latitude) < 0.00015 &&
        Math.abs(wp.longitude - hub.location.longitude) < 0.00015
    );
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
            const routeCoordList: Array<{ lng: number; lat: number; alt: number }> = [];

            let depPos: import("cesium").Cartesian3 | null = null;
            if (
                departureHub?.location?.latitude !== undefined &&
                departureHub?.location?.longitude !== undefined
            ) {
                const depAlt = departureHub.altitudeMsl ?? 10;
                const pos = Cesium.Cartesian3.fromDegrees(
                    departureHub.location.longitude,
                    departureHub.location.latitude,
                    depAlt
                );
                depPos = pos;
                routePositions.push(pos);
                routeCoordList.push({
                    lng: departureHub.location.longitude,
                    lat: departureHub.location.latitude,
                    alt: depAlt,
                });
            }

            waypoints.forEach((wp) => {
                const alt = wp.altitude ?? cruisingAltitude;
                const pos = Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, alt);
                routePositions.push(pos);
                routeCoordList.push({ lng: wp.longitude, lat: wp.latitude, alt });
            });

            let arrPos: import("cesium").Cartesian3 | null = null;
            if (
                arrivalHub?.location?.latitude !== undefined &&
                arrivalHub?.location?.longitude !== undefined &&
                arrivalHub.id !== departureHub?.id
            ) {
                const arrAlt = arrivalHub.altitudeMsl ?? 10;
                const pos = Cesium.Cartesian3.fromDegrees(
                    arrivalHub.location.longitude,
                    arrivalHub.location.latitude,
                    arrAlt
                );
                arrPos = pos;
                routePositions.push(pos);
                routeCoordList.push({
                    lng: arrivalHub.location.longitude,
                    lat: arrivalHub.location.latitude,
                    alt: arrAlt,
                });
            }

            if (routePositions.length >= 2) {
                const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
                const routeArcType = is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC;
                const lineId = "flight-planned-corridor";
                viewer.entities.add({
                    id: lineId,
                    polyline: {
                        positions: routePositions,
                        arcType: routeArcType,
                        width: 3.6,
                        material: new Cesium.PolylineOutlineMaterialProperty({
                            color: Cesium.Color.fromCssColorString("#06b6d4"),
                            outlineColor: Cesium.Color.fromCssColorString("#071328").withAlpha(0.8),
                            outlineWidth: 1.2,
                        }),
                        clampToGround: false,
                    },
                });
                newEntityIds.push(lineId);

                for (let i = 0; i < routeCoordList.length - 1; i++) {
                    const pStart = routeCoordList[i];
                    const pEnd = routeCoordList[i + 1];
                    if (calculateDistance(pStart.lat, pStart.lng, pEnd.lat, pEnd.lng) > 140) {
                        const arrowId = `flight-planned-dir-${i}`;
                        viewer.entities.add({
                            id: arrowId,
                            polyline: {
                                positions: [
                                    Cesium.Cartesian3.fromDegrees(
                                        pStart.lng + (pEnd.lng - pStart.lng) * 0.42,
                                        pStart.lat + (pEnd.lat - pStart.lat) * 0.42,
                                        is3D ? pStart.alt + (pEnd.alt - pStart.alt) * 0.42 + 0.5 : 6
                                    ),
                                    Cesium.Cartesian3.fromDegrees(
                                        pStart.lng + (pEnd.lng - pStart.lng) * 0.62,
                                        pStart.lat + (pEnd.lat - pStart.lat) * 0.62,
                                        is3D ? pStart.alt + (pEnd.alt - pStart.alt) * 0.62 + 0.5 : 6
                                    ),
                                ],
                                arcType: routeArcType,
                                width: 8,
                                material: new Cesium.PolylineArrowMaterialProperty(
                                    Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.95)
                                ),
                            },
                        });
                        newEntityIds.push(arrowId);
                    }
                }

                const curtainId = addRouteCurtainWall(Cesium, viewer, {
                    id: "flight-planned-curtain",
                    points: routeCoordList,
                    colorCss: "#06b6d4",
                    alpha: 0.12,
                });
                if (curtainId) newEntityIds.push(curtainId);
            }

            if (depPos && departureHub) {
                const depId = "flight-dep-hub";
                const isSameHub = arrivalHub?.id === departureHub.id;
                viewer.entities.add({
                    id: depId,
                    position: depPos,
                    billboard: {
                        image: getHubIconUri(
                            isSameHub ? "#06b6d4" : "#10b981",
                            false,
                            isSameHub ? "default" : "departure"
                        ),
                        width: 32,
                        height: 32,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: isSameHub
                            ? `HUB: ${departureHub.code || departureHub.name}`
                            : `DEP: ${departureHub.code || departureHub.name}`,
                        variant: "hub",
                        accentColor: isSameHub ? "#06b6d4" : "#10b981",
                        pixelOffset: new Cesium.Cartesian2(0, -22),
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
                        image: getHubIconUri("#06b6d4", false, "arrival"),
                        width: 32,
                        height: 32,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `ARR: ${arrivalHub.code || arrivalHub.name}`,
                        variant: "hub",
                        accentColor: "#06b6d4",
                        pixelOffset: new Cesium.Cartesian2(0, -22),
                    }),
                });
                newEntityIds.push(arrId);
            }

            waypoints.forEach((wp, index) => {
                const isSelected =
                    selectedWaypointId === wp.id ||
                    selectedWaypointId === wp.tempId ||
                    selectedWaypointId === `wp-${wp.id}`;

                if (
                    !isSelected &&
                    (isCoincidentWithHub(wp, departureHub) || isCoincidentWithHub(wp, arrivalHub))
                ) {
                    return;
                }

                const alt = wp.altitude ?? cruisingAltitude;
                const pos = Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, alt);
                const wpId = `flight-wp-${wp.id || wp.tempId || index}`;

                viewer.entities.add({
                    id: wpId,
                    position: pos,
                    billboard: {
                        image: getWaypointIconUri(wp.sequence ?? index + 1, isSelected),
                        width: isSelected ? 32 : 26,
                        height: isSelected ? 32 : 26,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `WP${wp.sequence ?? index + 1} (${alt}m)`,
                        isSelected,
                        accentColor: "#00e5ff",
                        pixelOffset: new Cesium.Cartesian2(0, isSelected ? -22 : -18),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                    }),
                });
                newEntityIds.push(wpId);

                const dropId = addAltitudeDropLine(Cesium, viewer, {
                    id: `drop-${wpId}`,
                    lng: wp.longitude,
                    lat: wp.latitude,
                    altitudeM: alt,
                    colorCss: isSelected ? "#00e5ff" : "#38bdf8",
                    alpha: isSelected ? 0.65 : 0.42,
                });
                if (dropId) newEntityIds.push(dropId);
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
                viewer.scene.requestRender();
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
        sceneRevision,
    ]);

    return null;
}
