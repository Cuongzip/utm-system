"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { Waypoint, Hub } from "@/types";

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

                const entity = viewer.entities.add({
                    id: depId,
                    name: `Departure: ${departureHub.name}`,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
                    point: {
                        pixelSize: 10,
                        color: Cesium.Color.fromCssColorString("#00a3bf"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: `DEP: ${departureHub.code || departureHub.name}`,
                        font: "bold 10px monospace",
                        fillColor: Cesium.Color.fromCssColorString("#00a3bf"),
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
                    point: {
                        pixelSize: 10,
                        color: Cesium.Color.fromCssColorString("#f59e0b"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: `ARR: ${arrivalHub.code || arrivalHub.name}`,
                        font: "bold 10px monospace",
                        fillColor: Cesium.Color.fromCssColorString("#f59e0b"),
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

            const hasDep =
                departureHub?.location?.lat !== undefined &&
                departureHub?.location?.lng !== undefined;
            const depLat = departureHub?.location?.lat ?? 0;
            const depLng = departureHub?.location?.lng ?? 0;

            const hasArr =
                arrivalHub?.location?.lat !== undefined && arrivalHub?.location?.lng !== undefined;
            const arrLat = arrivalHub?.location?.lat ?? 0;
            const arrLng = arrivalHub?.location?.lng ?? 0;

            const routeCoords: { lng: number; lat: number; alt: number }[] = [];

            if (hasDep) {
                routeCoords.push({
                    lng: depLng,
                    lat: depLat,
                    alt: 10,
                });
            }

            sortedWaypoints.forEach((wp) => {
                const lng = wp.longitude ?? 0;
                const lat = wp.latitude ?? 0;
                const alt = wp.altitude ?? 50;

                const last = routeCoords[routeCoords.length - 1];
                const isDup =
                    last && Math.abs(last.lat - lat) < 0.0001 && Math.abs(last.lng - lng) < 0.0001;

                if (!isDup) {
                    routeCoords.push({ lng, lat, alt });
                }
            });

            if (hasArr) {
                const last = routeCoords[routeCoords.length - 1];
                const isDup =
                    last &&
                    Math.abs(last.lat - arrLat) < 0.0001 &&
                    Math.abs(last.lng - arrLng) < 0.0001;

                if (!isDup) {
                    routeCoords.push({
                        lng: arrLng,
                        lat: arrLat,
                        alt: 10,
                    });
                }
            }

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
                const isSelected =
                    (selectedWaypointId && wp.id === selectedWaypointId) ||
                    (selectedWaypointId && wp.tempId === selectedWaypointId);
                const isStart = idx === 0;
                const isEnd = idx === sortedWaypoints.length - 1;

                const pinColor = isStart
                    ? Cesium.Color.fromCssColorString("#10b981")
                    : isEnd
                      ? Cesium.Color.fromCssColorString("#ef4444")
                      : Cesium.Color.fromCssColorString(routeColor);

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
                    point: {
                        pixelSize: isSelected ? 22 : 18,
                        color: pinColor,
                        outlineColor: isSelected
                            ? Cesium.Color.fromCssColorString("#f59e0b")
                            : Cesium.Color.WHITE,
                        outlineWidth: isSelected ? 3 : 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: labelText,
                        font: isSelected ? "bold 11px monospace" : "600 10px monospace",
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -20),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

            if (autoFitBounds && allPoints.length > 0) {
                let minLat = 90,
                    maxLat = -90,
                    minLng = 180,
                    maxLng = -180;

                allPoints.forEach((p) => {
                    if (p.lat < minLat) minLat = p.lat;
                    if (p.lat > maxLat) maxLat = p.lat;
                    if (p.lng < minLng) minLng = p.lng;
                    if (p.lng > maxLng) maxLng = p.lng;
                });

                if (
                    allPoints.length === 1 ||
                    (maxLng - minLng < 0.001 && maxLat - minLat < 0.001)
                ) {
                    viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(minLng, minLat, 15000.0),
                    });
                } else {
                    const latBuf = Math.max((maxLat - minLat) * 0.35, 0.02);
                    const lngBuf = Math.max((maxLng - minLng) * 0.35, 0.02);
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
