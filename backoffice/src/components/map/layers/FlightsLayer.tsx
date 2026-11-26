"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { ACTIVE_FLIGHT_STATUSES, DEFAULT_FLIGHT_STATUS, type Flight, type Hub } from "@/types";
import { MAP_TOKENS } from "../mapTokens";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";

export interface FlightHubCoord {
    lat: number;
    lng: number;
    name?: string;
    code?: string;
}

export type RouteLabelVisibility = "all" | "focused" | "none";

export interface FlightsLayerProps {
    flights: Flight[];
    selectedFlightId?: string | null;
    highlightedFlightIds?: ReadonlySet<string>;
    dimUnselected?: boolean;
    showRouteLabels?: RouteLabelVisibility;
    hubs?: Hub[];
    activeOnly?: boolean;
}

const STATUS_COLOR_MAP: Record<string, string> = MAP_TOKENS.colors.flightStatus;

export function FlightsLayer({
    flights = [],
    selectedFlightId,
    highlightedFlightIds,
    dimUnselected = false,
    showRouteLabels = "all",
    hubs,
    activeOnly = false,
}: FlightsLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
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
            const Cesium = await getCesium();
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
            const midpointStackCounter: Record<string, number> = {};
            let selectedCoords: number[][] | null = null;

            const hasActiveFocus =
                Boolean(selectedFlightId) ||
                Boolean(highlightedFlightIds && highlightedFlightIds.size > 0);

            const targetFlights = activeOnly
                ? flights.filter(
                      (f) =>
                          f.status &&
                          (ACTIVE_FLIGHT_STATUSES as readonly string[]).includes(
                              f.status.toLowerCase()
                          )
                  )
                : flights;

            for (const flight of targetFlights) {
                let coordinates: number[][] = [];

                let parsedRoute: unknown = flight.plannedRoute;
                if (typeof parsedRoute === "string") {
                    try {
                        parsedRoute = JSON.parse(parsedRoute);
                    } catch {
                        parsedRoute = null;
                    }
                }
                const plannedRoute =
                    parsedRoute && typeof parsedRoute === "object"
                        ? (parsedRoute as { coordinates?: unknown })
                        : null;

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
                        coordinates = [
                            [dep.lng, dep.lat, 10],
                            [arr.lng, arr.lat, 10],
                        ];
                    }
                }

                if (coordinates.length < 2) continue;

                const isSelected = selectedFlightId === flight.id;
                const isConflictHighlighted = Boolean(highlightedFlightIds?.has(flight.id));
                const isFocused = isSelected || isConflictHighlighted;

                if (isSelected) {
                    selectedCoords = coordinates;
                }

                const normalizedStatus = (flight.status ?? DEFAULT_FLIGHT_STATUS)
                    .toLowerCase()
                    .replace(/[\s-]+/g, "_");
                const baseRouteColor = STATUS_COLOR_MAP[normalizedStatus] || "#00a3bf";
                const defaultAlt = flight.cruisingAltitudeM ?? 120;

                const cartesianPositions: import("cesium").Cartesian3[] = [];
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
                        }
                    }
                });

                if (cartesianPositions.length < 2) continue;

                const isDimmed = dimUnselected && hasActiveFocus && !isFocused;

                const routeEntityId = `flight-route-${flight.id}`;
                viewer.entities.add({
                    id: routeEntityId,
                    name: flight.flightNumber || `Flight ${flight.id.slice(0, 8)}`,
                    polyline: {
                        positions: cartesianPositions,
                        width: isSelected
                            ? 4.5
                            : isConflictHighlighted
                              ? 3.5
                              : isDimmed
                                ? 2.0
                                : 2.8,
                        material: isFocused
                            ? new Cesium.PolylineGlowMaterialProperty({
                                  glowPower: 0.2,
                                  taperPower: 1.0,
                                  color: Cesium.Color.fromCssColorString("#00e5ff"),
                              })
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString(baseRouteColor),
                                  isDimmed ? 0.28 : 0.82
                              ),
                        clampToGround: false,
                    },
                });
                newEntityIds.push(routeEntityId);

                const shouldRenderLabel =
                    showRouteLabels === "all"
                        ? true
                        : showRouteLabels === "focused"
                          ? isFocused
                          : false;

                if (shouldRenderLabel) {
                    const midIdx = Math.floor(cartesianPositions.length / 2);
                    const midCoord = coordinates[midIdx];
                    const midPos = cartesianPositions[midIdx];
                    const bucketKey = `${Number(midCoord[1]).toFixed(2)}_${Number(midCoord[0]).toFixed(2)}`;
                    const stackIdx = midpointStackCounter[bucketKey] ?? 0;
                    midpointStackCounter[bucketKey] = stackIdx + 1;

                    if (isFocused || stackIdx === 0) {
                        const labelId = `flight-label-${flight.id}`;
                        viewer.entities.add({
                            id: labelId,
                            position: midPos,
                            label: createTacticalLabel(Cesium, {
                                text: flight.flightNumber || "FLIGHT",
                                isSelected: isFocused,
                                accentColor: "#00e5ff",
                                pixelOffset: new Cesium.Cartesian2(0, -10 - stackIdx * 22),
                                maxDistance: isFocused ? 120000 : 16000,
                            }),
                        });
                        newEntityIds.push(labelId);
                    }
                }
            }

            entityIdsRef.current = newEntityIds;

            if (
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
        highlightedFlightIds,
        dimUnselected,
        showRouteLabels,
        hubs,
        activeOnly,
    ]);

    return null;
}
