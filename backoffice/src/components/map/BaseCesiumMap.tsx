"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import type { Viewer } from "cesium";
import { Loader2 } from "lucide-react";
import { CesiumContext } from "./CesiumContext";
import type { MapMode, ImageryType, MapCoordinates } from "./types";
import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

export interface BaseCesiumMapProps {
    mode?: MapMode;
    layerType?: ImageryType;
    height?: string;
    hideToolbar?: boolean;
    initialCoordinates?: MapCoordinates;
    onEntityClick?: (entityId: string) => void;
    children?: React.ReactNode;
    className?: string;
    canvasClassName?: string;
    loadingText?: string;
}

const DEFAULT_COORDINATES: MapCoordinates = {
    lng: 108.2208,
    lat: 16.0544,
    height: 2500000.0,
};

export function BaseCesiumMap({
    mode = "2d",
    layerType = "street",
    height = "100%",
    hideToolbar = true,
    initialCoordinates = DEFAULT_COORDINATES,
    onEntityClick,
    children,
    className = "",
    canvasClassName = "",
    loadingText = "Loading map...",
}: BaseCesiumMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const onEntityClickRef = useRef(onEntityClick);

    useLayoutEffect(() => {
        onEntityClickRef.current = onEntityClick;
    });

    useEffect(() => {
        let activeViewer: Viewer | null = null;
        let resizeObserver: ResizeObserver | null = null;

        async function initViewer() {
            if (!containerRef.current) return;

            try {
                window.CESIUM_BASE_URL = "/cesium";
                const Cesium = await import("cesium");

                Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

                let baseImageryProvider: any;
                if (layerType === "satellite") {
                    baseImageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
                        { enablePickFeatures: false }
                    );
                } else if (layerType === "carto") {
                    baseImageryProvider = new Cesium.UrlTemplateImageryProvider({
                        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                        subdomains: ["a", "b", "c", "d"],
                    });
                } else {
                    baseImageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
                        { enablePickFeatures: false }
                    );
                }

                activeViewer = new Cesium.Viewer(containerRef.current, {
                    sceneMode: mode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D,
                    baseLayer: new Cesium.ImageryLayer(baseImageryProvider),
                    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
                    creditContainer: document.createElement("div"),
                    requestRenderMode: true,
                    maximumRenderTimeChange: Infinity,
                    animation: false,
                    timeline: false,
                    fullscreenButton: !hideToolbar,
                    homeButton: !hideToolbar,
                    sceneModePicker: false,
                    baseLayerPicker: false,
                    navigationHelpButton: false,
                    infoBox: false,
                    geocoder: false,
                    selectionIndicator: false,
                });

                viewerRef.current = activeViewer;

                activeViewer.useBrowserRecommendedResolution = false;
                activeViewer.resolutionScale = 1.0;
                activeViewer.scene.globe.depthTestAgainstTerrain = false;

                if (mode === "2d") {
                    activeViewer.scene.fog.enabled = false;
                    activeViewer.scene.globe.showGroundAtmosphere = false;
                    if (activeViewer.scene.sun) activeViewer.scene.sun.show = false;
                    if (activeViewer.scene.moon) activeViewer.scene.moon.show = false;
                }

                activeViewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(
                        initialCoordinates.lng,
                        initialCoordinates.lat,
                        initialCoordinates.height ?? 2500000.0
                    ),
                });

                const handler = new Cesium.ScreenSpaceEventHandler(activeViewer.scene.canvas);
                handler.setInputAction((click: any) => {
                    if (!activeViewer || activeViewer.isDestroyed()) return;
                    const picked = activeViewer.scene.pick(click.position);
                    if (Cesium.defined(picked) && picked.id && picked.id.id) {
                        onEntityClickRef.current?.(picked.id.id);
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                activeViewer.resize();

                if (containerRef.current) {
                    resizeObserver = new ResizeObserver(() => {
                        if (activeViewer && !activeViewer.isDestroyed()) {
                            activeViewer.resize();
                        }
                    });
                    resizeObserver.observe(containerRef.current);
                }

                setViewer(activeViewer);
                setIsLoaded(true);
            } catch (err: unknown) {
                console.error("Failed to initialize Cesium Viewer:", err);
                const msg = err instanceof Error ? err.message : "Map initialization error";
                setMapError(msg);
            }
        }

        initViewer();

        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (activeViewer && !activeViewer.isDestroyed()) {
                activeViewer.destroy();
            }
            viewerRef.current = null;
            setViewer(null);
            setIsLoaded(false);
        };
    }, []);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;

        async function updateSceneMode() {
            const Cesium = await import("cesium");
            if (!v || v.isDestroyed()) return;

            const targetMode = mode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D;

            if (v.scene.mode !== targetMode) {
                if (targetMode === Cesium.SceneMode.SCENE2D) {
                    v.scene.morphTo2D(0.5);
                } else {
                    v.scene.morphTo3D(0.5);
                }
            }
        }

        updateSceneMode();
    }, [mode, isLoaded]);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;

        async function updateImagery() {
            const Cesium = await import("cesium");
            if (!v || v.isDestroyed()) return;

            v.imageryLayers.removeAll();

            let provider: any;
            if (layerType === "satellite") {
                provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
                    { enablePickFeatures: false }
                );
            } else if (layerType === "carto") {
                provider = new Cesium.UrlTemplateImageryProvider({
                    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                    subdomains: ["a", "b", "c", "d"],
                });
            } else {
                provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
                    { enablePickFeatures: false }
                );
            }

            if (!v.isDestroyed()) {
                v.imageryLayers.addImageryProvider(provider);
                v.scene.requestRender();
            }
        }

        updateImagery();
    }, [layerType, isLoaded]);

    return (
        <CesiumContext.Provider value={{ viewer, isLoaded }}>
            <div
                className={`relative w-full overflow-hidden select-none ${className}`}
                style={{ height }}
            >
                <div ref={containerRef} className={`w-full h-full ${canvasClassName}`} />

                {!isLoaded && !mapError && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-900/80 text-white backdrop-blur-xs">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        <span className="text-xs font-mono font-medium tracking-wide">
                            {loadingText}
                        </span>
                    </div>
                )}

                {mapError && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/90 text-red-400">
                        <span className="text-sm font-semibold">{mapError}</span>
                    </div>
                )}

                {isLoaded && children}
            </div>
        </CesiumContext.Provider>
    );
}

export default BaseCesiumMap;
