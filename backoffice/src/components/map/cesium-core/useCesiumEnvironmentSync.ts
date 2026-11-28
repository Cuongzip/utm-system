"use client";

import { useEffect, useRef } from "react";
import type { Cesium3DTileset, Viewer } from "cesium";
import { applyConfiguredImageryLayers, createImageryLayersForType } from "../basemapProviders";
import { getCesium } from "../cesiumLoader";
import type { ImageryType, MapMode } from "../types";

interface CesiumEnvironmentSyncParams {
    viewerRef: { current: Viewer | null };
    appliedLayerTypeRef: { current: ImageryType | null };
    mode: MapMode;
    layerType: ImageryType;
    enable3DTerrain: boolean;
    enable3DBuildings: boolean;
    hasIonToken: boolean;
    isLoaded: boolean;
}

export function useCesiumEnvironmentSync({
    viewerRef,
    appliedLayerTypeRef,
    mode,
    layerType,
    enable3DTerrain,
    enable3DBuildings,
    hasIonToken,
    isLoaded,
}: CesiumEnvironmentSyncParams): void {
    const osmBuildingsRef = useRef<Cesium3DTileset | null>(null);
    const appliedTerrainRef = useRef<"world" | "ellipsoid">("ellipsoid");
    const lastSyncedViewerRef = useRef<Viewer | null>(null);
    const layerRequestIdRef = useRef(0);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;
        if (appliedLayerTypeRef.current === layerType) return;

        const requestId = ++layerRequestIdRef.current;

        async function updateImagery() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (!currentViewer || currentViewer.isDestroyed()) return;

            const layers = await createImageryLayersForType(Cesium, layerType);
            if (
                requestId !== layerRequestIdRef.current ||
                !viewerRef.current ||
                viewerRef.current.isDestroyed()
            ) {
                return;
            }

            appliedLayerTypeRef.current = layerType;
            applyConfiguredImageryLayers(viewerRef.current, layers);
            viewerRef.current.scene.requestRender();
        }

        updateImagery();
    }, [viewerRef, appliedLayerTypeRef, layerType, isLoaded]);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) {
            osmBuildingsRef.current = null;
            appliedTerrainRef.current = "ellipsoid";
            lastSyncedViewerRef.current = null;
            return;
        }

        if (lastSyncedViewerRef.current !== v) {
            lastSyncedViewerRef.current = v;
            osmBuildingsRef.current = null;
            appliedTerrainRef.current = "ellipsoid";
        }

        let cancelled = false;

        async function sync3DEnvironment() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (cancelled || !currentViewer || currentViewer.isDestroyed()) return;

            const shouldUseWorldTerrain = mode === "3d" && enable3DTerrain && hasIonToken;
            if (shouldUseWorldTerrain && appliedTerrainRef.current !== "world") {
                try {
                    const worldTerrain = await Cesium.createWorldTerrainAsync({
                        requestVertexNormals: true,
                    });
                    if (!cancelled && !currentViewer.isDestroyed()) {
                        currentViewer.terrainProvider = worldTerrain;
                        appliedTerrainRef.current = "world";
                        currentViewer.scene.requestRender();
                    }
                } catch {
                    appliedTerrainRef.current = "ellipsoid";
                }
            } else if (!shouldUseWorldTerrain && appliedTerrainRef.current !== "ellipsoid") {
                currentViewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
                appliedTerrainRef.current = "ellipsoid";
                currentViewer.scene.requestRender();
            }

            const shouldShowBuildings = mode === "3d" && enable3DBuildings && hasIonToken;
            if (shouldShowBuildings) {
                if (osmBuildingsRef.current) {
                    osmBuildingsRef.current.show = true;
                    currentViewer.scene.requestRender();
                } else {
                    try {
                        const tileset = await Cesium.createOsmBuildingsAsync({
                            style: new Cesium.Cesium3DTileStyle({
                                color: "color('rgba(30, 41, 59, 0.78)')",
                            }),
                        });
                        if (cancelled || currentViewer.isDestroyed()) {
                            tileset.destroy();
                            return;
                        }
                        currentViewer.scene.primitives.add(tileset);
                        osmBuildingsRef.current = tileset;
                        currentViewer.scene.requestRender();
                    } catch {
                        // Gracefully continue without OSM buildings if Ion asset is unavailable
                    }
                }
            } else if (osmBuildingsRef.current) {
                osmBuildingsRef.current.show = false;
                currentViewer.scene.requestRender();
            }
        }

        sync3DEnvironment();

        return () => {
            cancelled = true;
        };
    }, [viewerRef, mode, enable3DTerrain, enable3DBuildings, hasIonToken, isLoaded]);
}
