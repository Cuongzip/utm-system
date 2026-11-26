"use client";

import { useEffect, useRef, useState } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { HUB_STATUS, type Hub, type HubDraftPreview, type HubStatus } from "@/types";
import { getHubIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { fitCameraToBounds } from "../cesiumUtils";

export interface HubsLayerProps {
    hubs: Hub[];
    selectedHubId?: string | null;
    autoFitBounds?: boolean;
    draftPreview?: HubDraftPreview | null;
    editingHubId?: string | null;
}

const DRAFT_ENTITY_ID = "__hub_draft_preview__";

function getHubStatusPalette(status: HubStatus | undefined, isSelected: boolean) {
    switch (status) {
        case HUB_STATUS.MAINTENANCE:
            return {
                icon: isSelected ? "#fbbf24" : "#f59e0b",
                fill: "#f59e0b",
                fillAlpha: isSelected ? 0.28 : 0.14,
                outline: isSelected ? "#fcd34d" : "#f59e0b",
                outlineAlpha: isSelected ? 0.95 : 0.7,
            };
        case HUB_STATUS.INACTIVE:
            return {
                icon: isSelected ? "#cbd5e1" : "#94a3b8",
                fill: "#64748b",
                fillAlpha: isSelected ? 0.2 : 0.08,
                outline: isSelected ? "#cbd5e1" : "#94a3b8",
                outlineAlpha: isSelected ? 0.85 : 0.5,
            };
        case HUB_STATUS.ACTIVE:
        default:
            return {
                icon: isSelected ? "#00e5ff" : "#06b6d4",
                fill: "#06b6d4",
                fillAlpha: isSelected ? 0.24 : 0.12,
                outline: isSelected ? "#00e5ff" : "#06b6d4",
                outlineAlpha: isSelected ? 0.95 : 0.65,
            };
    }
}

export function HubsLayer({
    hubs = [],
    selectedHubId,
    autoFitBounds = true,
    draftPreview = null,
    editingHubId = null,
}: HubsLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const hasAutoFittedRef = useRef(false);
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

        async function renderHubs() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const is3D = viewer.scene.mode === Cesium.SceneMode.SCENE3D;
            const coordCounter: Record<string, number> = {};
            const newEntityIds: string[] = [];

            hubs.forEach((hub) => {
                if (editingHubId && hub.id === editingHubId && draftPreview) {
                    return;
                }
                const lat = hub.location?.latitude;
                const lng = hub.location?.longitude;
                if (lat === undefined || lng === undefined) return;

                const isSelected = selectedHubId === hub.id;
                const radius = Math.max(hub.airspaceRadius ?? 1500, 50);
                const floor = hub.airspaceFloor ?? 0;
                const ceiling = Math.max(hub.airspaceCeiling ?? 120, floor + 10);
                const palette = getHubStatusPalette(hub.status, isSelected);

                const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
                const stackIndex = coordCounter[coordKey] ?? 0;
                coordCounter[coordKey] = stackIndex + 1;
                const yOffset = -22 - stackIndex * 24;

                const entity = viewer.entities.add({
                    id: hub.id,
                    name: hub.name,
                    position: Cesium.Cartesian3.fromDegrees(
                        lng,
                        lat,
                        is3D ? Math.max(ceiling, 20) : 10
                    ),
                    billboard: {
                        image: getHubIconUri(palette.icon, isSelected),
                        width: isSelected ? 34 : 28,
                        height: isSelected ? 34 : 28,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -10),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: hub.code || hub.name || "HUB",
                        isSelected,
                        pixelOffset: new Cesium.Cartesian2(0, yOffset),
                    }),
                    ellipse: {
                        semiMinorAxis: radius,
                        semiMajorAxis: radius,
                        height: is3D ? floor : 0,
                        extrudedHeight: is3D ? ceiling : undefined,
                        material: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(palette.fill),
                            palette.fillAlpha
                        ),
                        outline: true,
                        outlineColor: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString(palette.outline),
                            palette.outlineAlpha
                        ),
                        outlineWidth: isSelected ? 2.5 : 1.5,
                    },
                });

                newEntityIds.push(entity.id);
            });

            if (
                draftPreview &&
                Number.isFinite(draftPreview.latitude) &&
                Number.isFinite(draftPreview.longitude) &&
                draftPreview.latitude >= -90 &&
                draftPreview.latitude <= 90 &&
                draftPreview.longitude >= -180 &&
                draftPreview.longitude <= 180
            ) {
                const draftRadius = Math.max(draftPreview.airspaceRadius || 1500, 50);
                const draftFloor = Math.max(draftPreview.airspaceFloor ?? 0, 0);
                const draftCeiling = Math.max(draftPreview.airspaceCeiling ?? 120, draftFloor + 10);

                const draftEntity = viewer.entities.add({
                    id: DRAFT_ENTITY_ID,
                    name: draftPreview.name || "Draft Hub",
                    position: Cesium.Cartesian3.fromDegrees(
                        draftPreview.longitude,
                        draftPreview.latitude,
                        is3D ? Math.max(draftCeiling, 20) : 10
                    ),
                    billboard: {
                        image: getHubIconUri("#ffffff", false),
                        width: 36,
                        height: 36,
                        eyeOffset: new Cesium.Cartesian3(0, 0, -15),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: draftPreview.code?.trim() || draftPreview.name?.trim() || "NEW HUB",
                        isSelected: true,
                        accentColor: "#ffffff",
                        pixelOffset: new Cesium.Cartesian2(0, -26),
                    }),
                    ellipse: {
                        semiMinorAxis: draftRadius,
                        semiMajorAxis: draftRadius,
                        height: is3D ? draftFloor : 0,
                        extrudedHeight: is3D ? draftCeiling : undefined,
                        material: Cesium.Color.fromAlpha(
                            Cesium.Color.fromCssColorString("#ffffff"),
                            0.2
                        ),
                        outline: true,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 3,
                    },
                });
                newEntityIds.push(draftEntity.id);
            }

            entityIdsRef.current = newEntityIds;

            if (selectedHubId && !draftPreview) {
                const target = hubs.find((h) => h.id === selectedHubId);
                const lat = target?.location?.latitude;
                const lng = target?.location?.longitude;
                if (lat !== undefined && lng !== undefined) {
                    const zoomHeight = Math.min(
                        Math.max((target?.airspaceRadius ?? 1000) * 3.6, 2600),
                        15000
                    );
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromDegrees(lng, lat, zoomHeight),
                        duration: 0.6,
                    });
                }
            } else if (autoFitBounds && !hasAutoFittedRef.current && hubs.length > 0) {
                hasAutoFittedRef.current = true;
                const valid = hubs
                    .map((h) => ({
                        lat: h.location?.latitude,
                        lng: h.location?.longitude,
                    }))
                    .filter(
                        (c): c is { lat: number; lng: number } =>
                            c.lat !== undefined && c.lng !== undefined
                    );

                if (valid.length > 0) {
                    fitCameraToBounds(viewer, valid, {
                        animate: false,
                        minHeight: 3500,
                        paddingMultiplier: 1.6,
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
    }, [
        viewer,
        isLoaded,
        hubs,
        selectedHubId,
        autoFitBounds,
        draftPreview,
        editingHubId,
        sceneRevision,
    ]);

    return null;
}
