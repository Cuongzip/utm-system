"use client";

import { useEffect, useRef } from "react";
import { useCesium } from "../CesiumContext";
import type { Hub } from "@/types";

export interface HubsLayerProps {
    hubs: Hub[];
    selectedHubId?: string | null;
    autoFitBounds?: boolean;
}

export function HubsLayer({ hubs = [], selectedHubId, autoFitBounds = true }: HubsLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderHubs() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const coordCounter: Record<string, number> = {};
            const newEntityIds: string[] = [];

            hubs.forEach((hub) => {
                const lat = hub.location?.lat;
                const lng = hub.location?.lng;
                if (lat === undefined || lng === undefined) return;

                const isSelected = selectedHubId === hub.id;
                const radius = hub.airspaceRadius || 5000;
                const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
                const stackIndex = coordCounter[coordKey] || 0;
                coordCounter[coordKey] = stackIndex + 1;
                const yOffset = -14 - stackIndex * 15;

                const entity = viewer.entities.add({
                    id: hub.id,
                    name: hub.name,
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
                    point: {
                        pixelSize: isSelected ? 12 : 8,
                        color: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: {
                        text: hub.code,
                        font: isSelected ? "bold 12px monospace" : "600 11px monospace",
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        fillColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromCssColorString("#334155"),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                        showBackground: false,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, yOffset),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    ellipse: {
                        semiMinorAxis: radius,
                        semiMajorAxis: radius,
                        material: isSelected
                            ? Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString("#334155"),
                                  0.22
                              )
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString("#64748b"),
                                  0.1
                              ),
                        outline: true,
                        outlineColor: isSelected
                            ? Cesium.Color.fromCssColorString("#0f172a")
                            : Cesium.Color.fromAlpha(
                                  Cesium.Color.fromCssColorString("#64748b"),
                                  0.5
                              ),
                        outlineWidth: isSelected ? 2 : 1,
                    },
                });

                newEntityIds.push(entity.id);
            });

            entityIdsRef.current = newEntityIds;

            if (selectedHubId) {
                const target = hubs.find((h) => h.id === selectedHubId);
                const lat = target?.location?.lat;
                const lng = target?.location?.lng;
                if (lat !== undefined && lng !== undefined) {
                    const zoomHeight = Math.max((target?.airspaceRadius || 5000) * 4, 15000);
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(lng, lat, zoomHeight),
                        duration: 0.8,
                    });
                }
            } else if (autoFitBounds && hubs.length > 0) {
                const valid = hubs
                    .map((h) => ({
                        lat: h.location?.lat,
                        lng: h.location?.lng,
                    }))
                    .filter(
                        (c): c is { lat: number; lng: number } =>
                            c.lat !== undefined && c.lng !== undefined
                    );

                if (valid.length === 1) {
                    viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(
                            valid[0].lng,
                            valid[0].lat,
                            30000.0
                        ),
                    });
                } else if (valid.length > 1) {
                    let minLat = 90,
                        maxLat = -90,
                        minLng = 180,
                        maxLng = -180;
                    valid.forEach((c) => {
                        if (c.lat < minLat) minLat = c.lat;
                        if (c.lat > maxLat) maxLat = c.lat;
                        if (c.lng < minLng) minLng = c.lng;
                        if (c.lng > maxLng) maxLng = c.lng;
                    });

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

        renderHubs();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                entityIdsRef.current.forEach((id) => {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                });
                entityIdsRef.current = [];
                viewer.scene.requestRender();
            }
        };
    }, [viewer, isLoaded, hubs, selectedHubId, autoFitBounds]);

    return null;
}

export default HubsLayer;
