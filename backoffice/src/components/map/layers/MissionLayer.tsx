"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { useSceneMorphRevision } from "../useSceneMorphRevision";
import { WAYPOINT_TYPE, type Waypoint, type Hub } from "@/types";
import { getHubIconUri, getWaypointIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { addAltitudeDropLine, addRouteCurtainWall } from "../cesiumOutlineUtils";
import { buildMissionRoutePoints } from "@/components/missions";
import { calculateDistance, formatAltitude } from "@/utils";

interface MissionLayerProps {
    waypoints?: Waypoint[];
    selectedWaypointId?: string | null;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
}

const EMPTY_WAYPOINTS: Waypoint[] = [];

export function MissionLayer({
    waypoints = EMPTY_WAYPOINTS,
    selectedWaypointId,
    departureHub,
    arrivalHub,
}: MissionLayerProps) {
    const routeColor = "#00a3bf";
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const sceneRevision = useSceneMorphRevision(viewer, isLoaded);

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
                        text: labelText,
                        variant: "hub",
                        accentColor: isSameHub ? "#06b6d4" : "#10b981",
                        pixelOffset: new Cesium.Cartesian2(0, -22),
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
                const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
                const routeArcType = is3D ? Cesium.ArcType.NONE : Cesium.ArcType.GEODESIC;
                const polylineId = "mission-polyline";
                const positions = routeCoords.map((pt) =>
                    Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, is3D ? pt.alt : 5)
                );

                const entity = viewer.entities.add({
                    id: polylineId,
                    name: "Mission Flight Path",
                    polyline: {
                        positions,
                        arcType: routeArcType,
                        width: 3.6,
                        material: new Cesium.PolylineOutlineMaterialProperty({
                            color: Cesium.Color.fromCssColorString(routeColor),
                            outlineColor: Cesium.Color.fromCssColorString("#071328").withAlpha(0.8),
                            outlineWidth: 1.2,
                        }),
                        clampToGround: false,
                    },
                });
                newEntityIds.push(entity.id);

                for (let i = 0; i < routeCoords.length - 1; i++) {
                    const pStart = routeCoords[i];
                    const pEnd = routeCoords[i + 1];
                    if (calculateDistance(pStart.lat, pStart.lng, pEnd.lat, pEnd.lng) > 140) {
                        const arrowEntity = viewer.entities.add({
                            id: `mission-dir-${i}`,
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
                                    Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.92)
                                ),
                            },
                        });
                        newEntityIds.push(arrowEntity.id);
                    }
                }

                const curtainId = addRouteCurtainWall(Cesium, viewer, {
                    id: "mission-route-curtain",
                    points: routeCoords,
                    colorCss: routeColor,
                    alpha: 0.12,
                });
                if (curtainId) newEntityIds.push(curtainId);
            }

            sortedWaypoints.forEach((wp, idx) => {
                const isHubNode = wp.waypointType === WAYPOINT_TYPE.HUB || Boolean(wp.hubId);
                if (
                    isHubNode &&
                    ((idx === 0 && departureHub?.id && wp.hubId === departureHub.id) ||
                        (idx === sortedWaypoints.length - 1 &&
                            arrivalHub?.id &&
                            wp.hubId === arrivalHub.id))
                ) {
                    return;
                }

                const wpId = `wp-${wp.id || wp.tempId || idx}`;
                const isSelected = Boolean(
                    (selectedWaypointId && wp.id === selectedWaypointId) ||
                    (selectedWaypointId && wp.tempId === selectedWaypointId)
                );
                const seqNum = wp.sequence ?? idx + 1;
                const altVal = isHubNode ? Math.max(10, wp.altitude ?? 0) : (wp.altitude ?? 50);
                const altText =
                    wp.altitude !== undefined && wp.altitude !== null
                        ? formatAltitude(wp.altitude)
                        : "";
                const compactHubLabel = wp.hub?.code || wp.name || "HUB";
                const labelText = isHubNode
                    ? `STOP #${seqNum}: ${compactHubLabel}`
                    : `WP${seqNum} ${altText}`.trim();

                const wpLng = wp.longitude ?? 0;
                const wpLat = wp.latitude ?? 0;

                const entity = viewer.entities.add({
                    id: wpId,
                    name: wp.name || `Waypoint ${seqNum}`,
                    position: Cesium.Cartesian3.fromDegrees(wpLng, wpLat, altVal),
                    billboard: {
                        image: isHubNode
                            ? getHubIconUri("#f59e0b", isSelected, "stop")
                            : getWaypointIconUri(seqNum, isSelected),
                        width: isSelected ? 34 : isHubNode ? 30 : 26,
                        height: isSelected ? 34 : isHubNode ? 30 : 26,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: labelText,
                        isSelected,
                        variant: isHubNode ? "hub" : "default",
                        accentColor: isSelected ? "#00e5ff" : isHubNode ? "#f59e0b" : undefined,
                        pixelOffset: new Cesium.Cartesian2(0, isSelected ? -22 : -18),
                    }),
                });
                newEntityIds.push(entity.id);

                const dropId = addAltitudeDropLine(Cesium, viewer, {
                    id: `drop-${wpId}`,
                    lng: wpLng,
                    lat: wpLat,
                    altitudeM: altVal,
                    colorCss: isSelected ? "#00e5ff" : "#38bdf8",
                    alpha: isSelected ? 0.65 : 0.42,
                });
                if (dropId) newEntityIds.push(dropId);
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
                viewer.scene.requestRender();
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
        routeColor,
        sceneRevision,
    ]);

    return null;
}
