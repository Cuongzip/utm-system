"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { Flight } from "@/types";

export interface FlightHubCoord {
    lat: number;
    lng: number;
    name?: string;
    code?: string;
}

export interface FlightsLayerProps {
    flights: Flight[];
    selectedFlightId?: string | null;
    hubCoordsMap?: Map<string, FlightHubCoord>;
    autoFitBounds?: boolean;
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
    hubCoordsMap = new Map(),
    autoFitBounds = true,
}: FlightsLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

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

            const newEntityIds: string[] = [];
            let selectedCoords: number[][] | null = null;
            const allPoints: { lng: number; lat: number }[] = [];

            for (const flight of flights) {
                let coordinates: number[][] = [];

                if (
                    flight.plannedRoute?.coordinates &&
                    Array.isArray(flight.plannedRoute.coordinates) &&
                    flight.plannedRoute.coordinates.length >= 2
                ) {
                    coordinates = flight.plannedRoute.coordinates as number[][];
                } else if (
                    flight.actualRoute?.coordinates &&
                    Array.isArray(flight.actualRoute.coordinates) &&
                    flight.actualRoute.coordinates.length >= 2
                ) {
                    coordinates = flight.actualRoute.coordinates as number[][];
                } else if (flight.departureHubId && flight.arrivalHubId) {
                    const dep = hubCoordsMap.get(flight.departureHubId);
                    const arr = hubCoordsMap.get(flight.arrivalHubId);
                    if (dep && arr) {
                        const cruiseAlt = flight.cruisingAltitudeM || 120;
                        coordinates = [
                            [dep.lng, dep.lat, cruiseAlt],
                            [arr.lng, arr.lat, cruiseAlt],
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
                        const lng = pt[0];
                        const lat = pt[1];
                        const alt = pt.length >= 3 ? pt[2] : defaultAlt;
                        cartesianPositions.push(Cesium.Cartesian3.fromDegrees(lng, lat, alt));
                        allPoints.push({ lng, lat });
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

                const startPos = cartesianPositions[0];
                const startPinId = `flight-start-${flight.id}`;
                viewer.entities.add({
                    id: startPinId,
                    position: startPos,
                    point: {
                        pixelSize: isSelected ? 10 : 8,
                        color: Cesium.Color.fromCssColorString("#10b981"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                    },
                });
                newEntityIds.push(startPinId);

                const endPos = cartesianPositions[cartesianPositions.length - 1];
                const endPinId = `flight-end-${flight.id}`;
                viewer.entities.add({
                    id: endPinId,
                    position: endPos,
                    point: {
                        pixelSize: isSelected ? 10 : 8,
                        color: Cesium.Color.fromCssColorString("#00a3bf"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                    },
                });
                newEntityIds.push(endPinId);

                const midIdx = Math.floor(cartesianPositions.length / 2);
                const midPos = cartesianPositions[midIdx];
                const labelId = `flight-label-${flight.id}`;
                viewer.entities.add({
                    id: labelId,
                    position: midPos,
                    label: {
                        text: flight.flightNumber || "FLIGHT",
                        font: "bold 11px monospace",
                        fillColor: Cesium.Color.WHITE,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -8),
                        showBackground: true,
                        backgroundColor: new Cesium.Color(0.05, 0.08, 0.14, 0.85),
                        backgroundPadding: new Cesium.Cartesian2(6, 3),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
                    },
                });
                newEntityIds.push(labelId);
            }

            entityIdsRef.current = newEntityIds;

            if (selectedFlightId && selectedCoords && selectedCoords.length >= 2) {
                let minLng = 180,
                    maxLng = -180,
                    minLat = 90,
                    maxLat = -90;

                selectedCoords.forEach((pt) => {
                    if (Array.isArray(pt) && pt.length >= 2) {
                        const [lng, lat] = pt;
                        if (lng < minLng) minLng = lng;
                        if (lng > maxLng) maxLng = lng;
                        if (lat < minLat) minLat = lat;
                        if (lat > maxLat) maxLat = lat;
                    }
                });

                const midLng = (minLng + maxLng) / 2;
                const midLat = (minLat + maxLat) / 2;
                const spanLng = Math.abs(maxLng - minLng);
                const spanLat = Math.abs(maxLat - minLat);
                const maxSpan = Math.max(spanLng, spanLat);
                const zoomHeight = Math.max(maxSpan * 111000 * 2.5, 12000.0);

                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(midLng, midLat, zoomHeight),
                    duration: 0.8,
                });
            } else if (autoFitBounds && allPoints.length > 0) {
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
                        destination: Cesium.Cartesian3.fromDegrees(minLng, minLat, 25000.0),
                    });
                } else {
                    const latBuf = Math.max((maxLat - minLat) * 0.4, 0.08);
                    const lngBuf = Math.max((maxLng - minLng) * 0.4, 0.08);
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
    }, [viewer, isLoaded, flights, selectedFlightId, hubCoordsMap, autoFitBounds]);

    return null;
}

export default FlightsLayer;
