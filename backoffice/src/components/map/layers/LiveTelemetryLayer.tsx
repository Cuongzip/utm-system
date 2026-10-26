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
    showPlannedRoute?: boolean;
}

export function LiveTelemetryLayer({
    flights = [],
    telemetryMap = {},
    telemetryHistoryMap: _telemetryHistoryMap = {},
    selectedFlightId,
    onSelectFlight: _onSelectFlight,
    hubCoordsMap: _hubCoordsMap = new Map(),
    autoFollowSelected = true,
    showPlannedRoute: _showPlannedRoute = false,
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
    }, [viewer, isLoaded, flights, telemetryMap, selectedFlightId, autoFollowSelected]);

    return null;
}

export default LiveTelemetryLayer;
