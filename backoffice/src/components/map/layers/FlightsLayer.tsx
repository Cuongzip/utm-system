"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { Flight, Hub } from "@/types";
import { getWaypointIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";

export interface FlightHubCoord {
    lat: number;
    lng: number;
    name?: string;
    code?: string;
}

export interface FlightsLayerProps {
    flights: Flight[];
    selectedFlightId?: string | null;
    hubs?: Hub[];
    autoFitBounds?: boolean;
    focusOnSelected?: boolean;
    activeOnly?: boolean;
    showEndpoints?: boolean;
}

const STATUS_COLOR_MAP: Record<string, string> = {
    active: "#10b981",
    in_flight: "#10b981",
    authorized: "#00a3bf",
    scheduled: "#00a3bf",
    planned: "#00a3bf",
    completed: "#94a3b8",
    cancelled: "#ef4444",
    aborted: "#ef4444",
    warning: "#f59e0b",
};

export function FlightsLayer({
    flights = [],
    selectedFlightId,
    hubs,
    autoFitBounds = true,
    focusOnSelected = true,
    activeOnly = false,
    showEndpoints = false,
}: FlightsLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasAutoFittedRef = useRef(false);
    const lastFocusedFlightIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedFlightId) {
            lastFocusedFlightIdRef.current = null;
        }
    }, [selectedFlightId]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderFlights() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const effectiveHubMap = new Map<string, FlightHubCoord>();
            if (hubs && hubs.length > 0) {
                hubs.forEach((h) => {
                    if (h.location?.latitude !== undefined && h.location?.longitude !== undefined) {
                        effectiveHubMap.set(h.id, {
                            lat: h.location.latitude,
                            lng: h.location.longitude,
                            name: h.name,
                            code: h.code,
                        });
                    }
                });
            }

            const newEntityIds: string[] = [];
            let selectedCoords: number[][] | null = null;
            const allPoints: { lng: number; lat: number }[] = [];

            const targetFlights = activeOnly
                ? flights.filter((f) => {
                      const s = (f.status || "").toLowerCase().replace(/[\s-]+/g, "_");
                      return (
                          s === "active" ||
                          s === "in_flight" ||
                          s === "diverted" ||
                          s === "emergency_landing"
                      );
                  })
                : flights;

            for (const flight of targetFlights) {
                let coordinates: number[][] = [];

                let plannedRoute = flight.plannedRoute as any;
                if (typeof plannedRoute === "string") {
                    try {
                        plannedRoute = JSON.parse(plannedRoute);
                    } catch {
                        plannedRoute = null;
                    }
                }

                if (
                    plannedRoute?.coordinates &&
                    Array.isArray(plannedRoute.coordinates) &&
                    plannedRoute.coordinates.length >= 2
                ) {
                    coordinates = (plannedRoute.coordinates as number[][]).map((pt) => [...pt]);
                    const dep = flight.departureHubId
                        ? effectiveHubMap.get(flight.departureHubId)
                        : null;
                    const arr = flight.arrivalHubId
                        ? effectiveHubMap.get(flight.arrivalHubId)
                        : null;
                    if (dep && coordinates.length > 0) {
                        coordinates[0] = [dep.lng, dep.lat, coordinates[0][2] ?? 10];
                    }
                    if (arr && coordinates.length > 1) {
                        coordinates[coordinates.length - 1] = [
                            arr.lng,
                            arr.lat,
                            coordinates[coordinates.length - 1][2] ?? 10,
                        ];
                    }
                } else if (flight.departureHubId && flight.arrivalHubId) {
                    const dep = effectiveHubMap.get(flight.departureHubId);
                    const arr = effectiveHubMap.get(flight.arrivalHubId);
                    if (dep && arr) {
                        const cruiseAlt = flight.cruisingAltitudeM || 120;
                        coordinates = [
                            [dep.lng, dep.lat, 10],
                            [arr.lng, arr.lat, 10],
                        ];
                    }
                }

                if (coordinates.length < 2) continue;

                const isSelected = selectedFlightId === flight.id;
                if (isSelected) {
                    selectedCoords = coordinates;
                }

                const normalizedStatus = (flight.status || "planned")
                    .toLowerCase()
                    .replace(/[\s-]+/g, "_");
                const routeColor = STATUS_COLOR_MAP[normalizedStatus] || "#00a3bf";
                const defaultAlt = flight.cruisingAltitudeM || 120;

                const cartesianPositions: any[] = [];
                coordinates.forEach((pt) => {
                    if (Array.isArray(pt) && pt.length >= 2) {
                        const lng = Number(pt[0]);
                        const lat = Number(pt[1]);
                        const alt =
                            pt.length >= 3 && typeof pt[2] === "number" ? pt[2] : defaultAlt;
                        if (
                            !isNaN(lng) &&
                            !isNaN(lat) &&
                            lng >= -180 &&
                            lng <= 180 &&
                            lat >= -90 &&
                            lat <= 90
                        ) {
                            cartesianPositions.push(Cesium.Cartesian3.fromDegrees(lng, lat, alt));
                            allPoints.push({ lng, lat });
                        }
                    }
                });

                if (cartesianPositions.length < 2) continue;

                const routeEntityId = `flight-route-${flight.id}`;
                viewer.entities.add({
                    id: routeEntityId,
                    name: flight.flightNumber || `Flight ${flight.id.slice(0, 8)}`,
                    polyline: {
                        positions: cartesianPositions,
                        width: isSelected ? 4.5 : 3.0,
                        material: isSelected
                            ? new Cesium.PolylineGlowMaterialProperty({
                                  glowPower: 0.25,
                                  taperPower: 1.0,
                                  color: Cesium.Color.fromCssColorString("#00e5ff"),
                              })
                            : Cesium.Color.fromCssColorString(routeColor),
                        clampToGround: false,
                    },
                });
                newEntityIds.push(routeEntityId);

                if (showEndpoints) {
                    const startPos = cartesianPositions[0];
                    const startPinId = `flight-start-${flight.id}`;
                    viewer.entities.add({
                        id: startPinId,
                        position: startPos,
                        billboard: {
                            image: getWaypointIconUri(1, isSelected),
                            width: isSelected ? 22 : 18,
                            height: isSelected ? 22 : 18,
                            eyeOffset: new Cesium.Cartesian3(0, 0, -10),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                    });
                    newEntityIds.push(startPinId);

                    const endPos = cartesianPositions[cartesianPositions.length - 1];
                    const isRoundTrip = Cesium.Cartesian3.distance(startPos, endPos) < 1.0;
                    if (!isRoundTrip) {
                        const endPinId = `flight-end-${flight.id}`;
                        viewer.entities.add({
                            id: endPinId,
                            position: endPos,
                            billboard: {
                                image: getWaypointIconUri(coordinates.length, isSelected),
                                width: isSelected ? 22 : 18,
                                height: isSelected ? 22 : 18,
                                eyeOffset: new Cesium.Cartesian3(0, 0, -10),
                                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                            },
                        });
                        newEntityIds.push(endPinId);
                    }
                }

                const midIdx = Math.floor(cartesianPositions.length / 2);
                const midPos = cartesianPositions[midIdx];
                const labelId = `flight-label-${flight.id}`;
                viewer.entities.add({
                    id: labelId,
                    position: midPos,
                    label: createTacticalLabel(Cesium, {
                        text: flight.flightNumber || "FLIGHT",
                        isSelected,
                        pixelOffset: new Cesium.Cartesian2(0, -8),
                        maxDistance: 150000,
                    }),
                });
                newEntityIds.push(labelId);
            }

            entityIdsRef.current = newEntityIds;

            if (
                focusOnSelected &&
                selectedFlightId &&
                lastFocusedFlightIdRef.current !== selectedFlightId &&
                selectedCoords &&
                selectedCoords.length >= 2
            ) {
                lastFocusedFlightIdRef.current = selectedFlightId;
                const pts = selectedCoords
                    .filter((pt) => Array.isArray(pt) && pt.length >= 2)
                    .map((pt) => ({ lng: Number(pt[0]), lat: Number(pt[1]) }));
                fitCameraToBounds(viewer, pts, {
                    animate: true,
                    duration: 0.8,
                    minHeight: 1500,
                    paddingMultiplier: 1.5,
                });
            } else if (autoFitBounds && !hasAutoFittedRef.current && allPoints.length > 0) {
                hasAutoFittedRef.current = true;
                fitCameraToBounds(viewer, allPoints, {
                    animate: true,
                    duration: 1.0,
                    minHeight: 2000,
                    paddingMultiplier: 1.5,
                });
            }

            viewer.scene.requestRender();
        }

        renderFlights();

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
        selectedFlightId,
        hubs,
        autoFitBounds,
        focusOnSelected,
        activeOnly,
        showEndpoints,
    ]);

    return null;
}
