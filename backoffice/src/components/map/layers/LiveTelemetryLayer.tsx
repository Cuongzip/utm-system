"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import type { Flight, TelemetryRecord } from "@/types";
import { getDroneIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";
import { formatSpeed } from "@/utils";

export interface LiveTelemetryLayerProps {
    flights: Flight[];
    telemetryMap: Record<string, TelemetryRecord>;
    selectedFlightId?: string | null;
    autoFollowSelected?: boolean;
    autoFitInitialBounds?: boolean;
}

export function LiveTelemetryLayer({
    flights = [],
    telemetryMap = {},
    selectedFlightId,
    autoFollowSelected = true,
    autoFitInitialBounds = false,
}: LiveTelemetryLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const lastCameraFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderTelemetry() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const allPoints: { lng: number; lat: number }[] = [];
            const coordBucket: Record<string, number> = {};
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
                        typeof telemetry.altitude === "number" && telemetry.altitude >= 0
                            ? telemetry.altitude
                            : 120;
                    const dronePosCartesian = Cesium.Cartesian3.fromDegrees(
                        droneLng,
                        droneLat,
                        droneAlt
                    );

                    allPoints.push({ lng: droneLng, lat: droneLat });

                    if (isSelected) {
                        focusedDronePos = { lng: droneLng, lat: droneLat, alt: droneAlt };
                    }

                    const bucketKey = `${droneLat.toFixed(3)}_${droneLng.toFixed(3)}`;
                    const stackIdx = coordBucket[bucketKey] ?? 0;
                    coordBucket[bucketKey] = stackIdx + 1;

                    const droneHeading = telemetry.heading ?? 0;
                    const hasAlert =
                        telemetry.batteryPercentage !== undefined &&
                        telemetry.batteryPercentage < 20;
                    const droneColor = hasAlert ? "#ef4444" : isSelected ? "#00e5ff" : "#10b981";

                    const hasSelectedTarget = Boolean(selectedFlightId);
                    const showFullLabel = isSelected || (!hasSelectedTarget && stackIdx === 0);
                    const labelText = isSelected
                        ? `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m • ${formatSpeed(telemetry.speed)}`
                        : `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m`;

                    const droneEntityId = `drone-live-${flight.id}`;
                    viewer.entities.add({
                        id: droneEntityId,
                        name:
                            flight.flightNumber || `Drone ${flight.droneId?.slice(0, 8) || "UAV"}`,
                        position: dronePosCartesian,
                        billboard: {
                            image: getDroneIconUri(droneColor, isSelected ? "#00e5ff" : "#ffffff"),
                            width: isSelected ? 34 : 26,
                            height: isSelected ? 34 : 26,
                            rotation: -Cesium.Math.toRadians(droneHeading),
                            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -35 : -28),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                        label: showFullLabel
                            ? createTacticalLabel(Cesium, {
                                  text: labelText,
                                  isSelected,
                                  accentColor: "#00e5ff",
                                  pixelOffset: new Cesium.Cartesian2(
                                      0,
                                      (isSelected ? -22 : -18) - stackIdx * 22
                                  ),
                                  eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -35 : -28),
                                  maxDistance: isSelected
                                      ? 250000
                                      : hasSelectedTarget
                                        ? 14000
                                        : 28000,
                              })
                            : undefined,
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
            } else if (
                autoFitInitialBounds &&
                allPoints.length > 0 &&
                !lastCameraFocusRef.current
            ) {
                lastCameraFocusRef.current = "bounds_fit";
                fitCameraToBounds(viewer, allPoints, { animate: false });
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
        selectedFlightId,
        autoFollowSelected,
        autoFitInitialBounds,
    ]);

    return null;
}
