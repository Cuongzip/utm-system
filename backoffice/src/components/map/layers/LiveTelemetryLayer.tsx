"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { Flight, TelemetryRecord } from "@/types";
import type { FlightHubCoord } from "./FlightsLayer";
import { getDroneIconUri } from "../mapIcons";

export interface LiveTelemetryLayerProps {
    flights: Flight[];
    telemetryMap: Record<string, TelemetryRecord>;
    telemetryHistoryMap?: Record<string, TelemetryRecord[]>;
    selectedFlightId?: string | null;
    onSelectFlight?: (flightId: string) => void;
    hubCoordsMap?: Map<string, FlightHubCoord>;
    autoFollowSelected?: boolean;
}

export function LiveTelemetryLayer({
    flights = [],
    telemetryMap = {},
    telemetryHistoryMap = {},
    selectedFlightId,
    onSelectFlight,
    hubCoordsMap = new Map(),
    autoFollowSelected = true,
}: LiveTelemetryLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const lastCameraFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderTelemetry() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const allPoints: { lng: number; lat: number }[] = [];
            let focusedDronePos: { lng: number; lat: number; alt: number } | null = null;

            for (const flight of flights) {
                const isSelected = selectedFlightId === flight.id;
                const telemetry = telemetryMap[flight.id];
                const history = telemetryHistoryMap[flight.id] || [];

                let plannedCoords: number[][] = [];
                if (
                    flight.plannedRoute?.coordinates &&
                    Array.isArray(flight.plannedRoute.coordinates) &&
                    flight.plannedRoute.coordinates.length >= 2
                ) {
                    plannedCoords = flight.plannedRoute.coordinates as number[][];
                } else if (flight.departureHubId && flight.arrivalHubId) {
                    const dep = hubCoordsMap.get(flight.departureHubId);
                    const arr = hubCoordsMap.get(flight.arrivalHubId);
                    if (dep && arr) {
                        const cruiseAlt = flight.cruisingAltitudeM || 120;
                        plannedCoords = [
                            [dep.lng, dep.lat, cruiseAlt],
                            [arr.lng, arr.lat, cruiseAlt],
                        ];
                    }
                }

                if (plannedCoords.length >= 2) {
                    const plannedCartesians = plannedCoords.map((pt) => {
                        const lng = pt[0];
                        const lat = pt[1];
                        const alt = pt.length >= 3 ? pt[2] : flight.cruisingAltitudeM || 120;
                        allPoints.push({ lng, lat });
                        return Cesium.Cartesian3.fromDegrees(lng, lat, alt);
                    });

                    const plannedEntityId = `flight-planned-${flight.id}`;
                    viewer.entities.add({
                        id: plannedEntityId,
                        name: `Planned: ${flight.flightNumber || flight.id.slice(0, 8)}`,
                        polyline: {
                            positions: plannedCartesians,
                            width: isSelected ? 2.5 : 1.5,
                            material: new Cesium.PolylineDashMaterialProperty({
                                color: Cesium.Color.fromCssColorString(
                                    isSelected ? "#38bdf8" : "#64748b"
                                ),
                                dashLength: 16.0,
                            }),
                            clampToGround: false,
                        },
                    });
                    newEntityIds.push(plannedEntityId);
                }

                if (history.length >= 2 || (history.length >= 1 && telemetry)) {
                    const historyCartesians: any[] = [];
                    history.forEach((rec) => {
                        if (typeof rec.longitude === "number" && typeof rec.latitude === "number") {
                            const alt =
                                typeof rec.altitude === "number" && rec.altitude > 0
                                    ? rec.altitude
                                    : 120;
                            historyCartesians.push(
                                Cesium.Cartesian3.fromDegrees(rec.longitude, rec.latitude, alt)
                            );
                            allPoints.push({ lng: rec.longitude, lat: rec.latitude });
                        }
                    });

                    if (
                        telemetry &&
                        typeof telemetry.longitude === "number" &&
                        typeof telemetry.latitude === "number"
                    ) {
                        const curAlt =
                            typeof telemetry.altitude === "number" && telemetry.altitude > 0
                                ? telemetry.altitude
                                : 120;
                        const lastPt = history[history.length - 1];
                        if (
                            !lastPt ||
                            lastPt.longitude !== telemetry.longitude ||
                            lastPt.latitude !== telemetry.latitude
                        ) {
                            historyCartesians.push(
                                Cesium.Cartesian3.fromDegrees(
                                    telemetry.longitude,
                                    telemetry.latitude,
                                    curAlt
                                )
                            );
                        }
                    }

                    if (historyCartesians.length >= 2) {
                        const historyEntityId = `flight-history-${flight.id}`;
                        viewer.entities.add({
                            id: historyEntityId,
                            name: `History: ${flight.flightNumber || flight.id.slice(0, 8)}`,
                            polyline: {
                                positions: historyCartesians,
                                width: isSelected ? 4.0 : 3.0,
                                material: new Cesium.PolylineGlowMaterialProperty({
                                    glowPower: 0.25,
                                    taperPower: 1.0,
                                    color: Cesium.Color.fromCssColorString(
                                        isSelected ? "#00e5ff" : "#10b981"
                                    ),
                                }),
                                clampToGround: false,
                            },
                        });
                        newEntityIds.push(historyEntityId);
                    }
                }

                if (
                    telemetry &&
                    typeof telemetry.longitude === "number" &&
                    typeof telemetry.latitude === "number"
                ) {
                    const droneLng = telemetry.longitude;
                    const droneLat = telemetry.latitude;
                    const droneAlt =
                        typeof telemetry.altitude === "number" && telemetry.altitude > 0
                            ? telemetry.altitude
                            : 120;
                    const droneSpeedKmh = Math.round((telemetry.speed || 0) * 3.6);
                    const dronePosCartesian = Cesium.Cartesian3.fromDegrees(
                        droneLng,
                        droneLat,
                        droneAlt
                    );

                    allPoints.push({ lng: droneLng, lat: droneLat });

                    if (isSelected) {
                        focusedDronePos = { lng: droneLng, lat: droneLat, alt: droneAlt };
                    }

                    const droneHeading = telemetry.heading || 0;
                    const hasAlert =
                        telemetry.batteryPercentage !== undefined &&
                        telemetry.batteryPercentage < 20;
                    const droneColor = hasAlert ? "#ef4444" : isSelected ? "#00e5ff" : "#10b981";

                    const droneEntityId = `drone-live-${flight.id}`;
                    viewer.entities.add({
                        id: droneEntityId,
                        name:
                            flight.flightNumber || `Drone ${flight.droneId?.slice(0, 8) || "UAV"}`,
                        position: dronePosCartesian,
                        billboard: {
                            image: getDroneIconUri(droneColor, isSelected ? "#00e5ff" : "#ffffff"),
                            width: isSelected ? 34 : 28,
                            height: isSelected ? 34 : 28,
                            rotation: -Cesium.Math.toRadians(droneHeading),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        label: {
                            text: `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m • ${droneSpeedKmh}km/h`,
                            font: "bold 11px monospace",
                            fillColor: Cesium.Color.WHITE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                            pixelOffset: new Cesium.Cartesian2(0, isSelected ? -20 : -16),
                            showBackground: true,
                            backgroundColor: isSelected
                                ? new Cesium.Color(0.02, 0.15, 0.25, 0.9)
                                : new Cesium.Color(0.05, 0.08, 0.14, 0.85),
                            backgroundPadding: new Cesium.Cartesian2(7, 4),
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                                0,
                                300000
                            ),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                    });
                    newEntityIds.push(droneEntityId);
                }
            }

            entityIdsRef.current = newEntityIds;

            if (autoFollowSelected && focusedDronePos) {
                const cameraKey = `${selectedFlightId}_initial`;
                if (lastCameraFocusRef.current !== cameraKey) {
                    lastCameraFocusRef.current = cameraKey;
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(
                            focusedDronePos.lng,
                            focusedDronePos.lat,
                            Math.max(focusedDronePos.alt * 10, 8000.0)
                        ),
                        duration: 1.2,
                    });
                }
            } else if (allPoints.length > 0 && !lastCameraFocusRef.current) {
                lastCameraFocusRef.current = "bounds_fit";
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
                viewer.camera.setView({
                    destination: Cesium.Rectangle.fromDegrees(
                        minLng - 0.05,
                        minLat - 0.05,
                        maxLng + 0.05,
                        maxLat + 0.05
                    ),
                });
            }

            viewer.scene.requestRender();
        }

        renderTelemetry();

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
        flights,
        telemetryMap,
        telemetryHistoryMap,
        selectedFlightId,
        hubCoordsMap,
        autoFollowSelected,
    ]);

    return null;
}

export default LiveTelemetryLayer;
