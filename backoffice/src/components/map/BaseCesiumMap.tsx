"use client";

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import { CesiumContext } from "./CesiumContext";
import { getCesium } from "./cesiumLoader";
import { applyConfiguredImageryLayers, createImageryLayersForType } from "./basemapProviders";
import { MapBootOverlays } from "./cesium-core/MapBootOverlays";
import { setupCanvasInteractions, usePickModeCursor } from "./cesium-core/setupCanvasInteractions";
import { useCesiumEnvironmentSync } from "./cesium-core/useCesiumEnvironmentSync";
import {
    applyInitialSceneCamera,
    useCesiumSceneModeSync,
} from "./cesium-core/useCesiumSceneModeSync";
import type { ImageryType, MapMode } from "./types";
import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

interface BaseCesiumMapProps {
    mode?: MapMode;
    layerType?: ImageryType;
    enable3DTerrain?: boolean;
    enable3DBuildings?: boolean;
    onViewerReady?: (viewer: Viewer | null, hasIonToken: boolean) => void;
    onEntityClick?: (entityId: string) => void;
    onMapClick?: (coords: { latitude: number; longitude: number }) => void;
    pickMode?: boolean;
    children?: ReactNode;
}

const HIDE_TOOLBAR = true;
const ION_TOKEN = (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "").trim();
const HAS_ION_TOKEN = ION_TOKEN.length > 0;

export function BaseCesiumMap({
    mode = "2d",
    layerType = "satellite-hybrid",
    enable3DTerrain = true,
    enable3DBuildings = true,
    onViewerReady,
    onEntityClick,
    onMapClick,
    pickMode = false,
    children,
}: BaseCesiumMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);

    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [initAttempt, setInitAttempt] = useState(0);

    const onViewerReadyRef = useRef(onViewerReady);
    const onEntityClickRef = useRef(onEntityClick);
    const onMapClickRef = useRef(onMapClick);
    const pickModeRef = useRef(pickMode);
    const modeRef = useRef(mode);
    const layerTypeRef = useRef(layerType);
    const appliedModeRef = useRef<MapMode | null>(null);
    const appliedLayerTypeRef = useRef<ImageryType | null>(null);

    useLayoutEffect(() => {
        onViewerReadyRef.current = onViewerReady;
        onEntityClickRef.current = onEntityClick;
        onMapClickRef.current = onMapClick;
        pickModeRef.current = pickMode;
        modeRef.current = mode;
        layerTypeRef.current = layerType;
    });

    useEffect(() => {
        let activeViewer: Viewer | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let destroyInteractions: (() => void) | null = null;
        let cancelled = false;

        async function initViewer() {
            if (!containerRef.current) return;

            try {
                window.CESIUM_BASE_URL = "/cesium";
                const Cesium = await getCesium();
                if (cancelled || !containerRef.current) return;

                Cesium.Ion.defaultAccessToken = ION_TOKEN;

                const initialLayer = layerTypeRef.current;
                const initialMode = modeRef.current;

                const configuredLayers = await createImageryLayersForType(Cesium, initialLayer);
                if (cancelled || !containerRef.current) return;

                activeViewer = new Cesium.Viewer(containerRef.current, {
                    sceneMode:
                        initialMode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D,
                    baseLayer: false,
                    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
                    creditContainer: document.createElement("div"),
                    requestRenderMode: true,
                    maximumRenderTimeChange: Infinity,
                    msaaSamples: 4,
                    animation: false,
                    timeline: false,
                    fullscreenButton: !HIDE_TOOLBAR,
                    homeButton: !HIDE_TOOLBAR,
                    sceneModePicker: false,
                    baseLayerPicker: false,
                    navigationHelpButton: false,
                    infoBox: false,
                    geocoder: false,
                    selectionIndicator: false,
                });

                applyConfiguredImageryLayers(activeViewer, configuredLayers);

                activeViewer.screenSpaceEventHandler.removeInputAction(
                    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
                );
                if (activeViewer.cesiumWidget?.screenSpaceEventHandler) {
                    activeViewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
                        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
                    );
                }

                // Cap effective pixelRatio cleanly at 1.25x (with useBrowserRecommendedResolution=true,
                // Cesium uses 1.0 * resolutionScale instead of multiplying dpr * resolutionScale) and
                // skip redundant FXAA since 4x hardware MSAA is already active.
                activeViewer.useBrowserRecommendedResolution = true;
                activeViewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.25);
                activeViewer.scene.postProcessStages.fxaa.enabled = false;
                activeViewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#050912");
                activeViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#070d19");
                activeViewer.scene.globe.maximumScreenSpaceError = 1.85;
                activeViewer.scene.globe.loadingDescendantLimit = 12;
                activeViewer.scene.globe.preloadSiblings = false;
                activeViewer.scene.globe.tileCacheSize = 500;
                activeViewer.scene.globe.preloadAncestors = true;
                activeViewer.scene.globe.depthTestAgainstTerrain = false;
                activeViewer.camera.percentageChanged = 0.01;

                applyInitialSceneCamera(Cesium, activeViewer, initialMode);

                destroyInteractions = setupCanvasInteractions(Cesium, activeViewer, {
                    pickModeRef,
                    onEntityClickRef,
                    onMapClickRef,
                });

                activeViewer.resize();

                if (containerRef.current) {
                    resizeObserver = new ResizeObserver(() => {
                        if (activeViewer && !activeViewer.isDestroyed()) {
                            activeViewer.resize();
                        }
                    });
                    resizeObserver.observe(containerRef.current);
                }

                appliedModeRef.current = initialMode;
                appliedLayerTypeRef.current = initialLayer;
                viewerRef.current = activeViewer;
                setViewer(activeViewer);
                setIsLoaded(true);
                onViewerReadyRef.current?.(activeViewer, HAS_ION_TOKEN);
            } catch (err: unknown) {
                console.error("Failed to initialize Cesium Viewer:", err);
                const msg = err instanceof Error ? err.message : "Map initialization error";
                setMapError(msg);
            }
        }

        initViewer();

        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            destroyInteractions?.();
            if (activeViewer && !activeViewer.isDestroyed()) {
                activeViewer.scene.canvas.style.cursor = "default";
                activeViewer.destroy();
            }
            viewerRef.current = null;
            setViewer(null);
            setIsLoaded(false);
            onViewerReadyRef.current?.(null, HAS_ION_TOKEN);
        };
    }, [initAttempt]);

    usePickModeCursor(viewerRef, isLoaded, pickMode);
    useCesiumSceneModeSync(viewerRef, appliedModeRef, mode, isLoaded);
    useCesiumEnvironmentSync({
        viewerRef,
        appliedLayerTypeRef,
        mode,
        layerType,
        enable3DTerrain,
        enable3DBuildings,
        hasIonToken: HAS_ION_TOKEN,
        isLoaded,
    });

    const handleRetry = useCallback(() => {
        setMapError(null);
        setInitAttempt((n) => n + 1);
    }, []);

    return (
        <CesiumContext.Provider value={{ viewer, isLoaded, hasIonToken: HAS_ION_TOKEN }}>
            <div className="relative w-full overflow-hidden select-none" style={{ height: "100%" }}>
                <div
                    ref={containerRef}
                    className="w-full h-full [&_.cesium-widget]:!absolute [&_.cesium-widget]:!inset-0 [&_.cesium-widget]:!w-full [&_.cesium-widget]:!h-full [&_.cesium-widget]:!overflow-hidden [&_.cesium-widget_canvas]:!w-full [&_.cesium-widget_canvas]:!h-full [&_.cesium-widget_canvas]:!block"
                />

                <MapBootOverlays isLoaded={isLoaded} mapError={mapError} onRetry={handleRetry} />

                {isLoaded && children}
            </div>
        </CesiumContext.Provider>
    );
}
