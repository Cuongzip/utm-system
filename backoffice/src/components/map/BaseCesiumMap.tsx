"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import type { ImageryProvider, ScreenSpaceEventHandler, Viewer } from "cesium";
import { CesiumContext } from "./CesiumContext";
import { getCesium } from "./cesiumLoader";
import type { MapMode, ImageryType } from "./types";
import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
    interface Window {
        CESIUM_BASE_URL?: string;
    }
}

export interface BaseCesiumMapProps {
    mode?: MapMode;
    layerType?: ImageryType;
    onEntityClick?: (entityId: string) => void;
    onMapClick?: (coords: { latitude: number; longitude: number }) => void;
    pickMode?: boolean;
    children?: React.ReactNode;
}

const HIDE_TOOLBAR = true;
const DRAG_THRESHOLD_PX = 5;

const DEFAULT_COORDINATES = {
    lng: 106.7009,
    lat: 10.7769,
    height: 35000.0,
};

export function BaseCesiumMap({
    mode = "2d",
    layerType = "satellite",
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
    const onEntityClickRef = useRef(onEntityClick);
    const onMapClickRef = useRef(onMapClick);
    const pickModeRef = useRef(pickMode);
    const modeRef = useRef(mode);
    const layerTypeRef = useRef(layerType);
    const appliedModeRef = useRef<MapMode | null>(null);
    const appliedLayerTypeRef = useRef<ImageryType | null>(null);

    useLayoutEffect(() => {
        onEntityClickRef.current = onEntityClick;
        onMapClickRef.current = onMapClick;
        pickModeRef.current = pickMode;
        modeRef.current = mode;
        layerTypeRef.current = layerType;
    });

    useEffect(() => {
        let activeViewer: Viewer | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let handler: { destroy: () => void; isDestroyed: () => boolean } | null = null;

        async function initViewer() {
            if (!containerRef.current) return;

            try {
                window.CESIUM_BASE_URL = "/cesium";
                const Cesium = await getCesium();

                Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

                const initialLayer = layerTypeRef.current;
                const initialMode = modeRef.current;

                let baseImageryProvider: ImageryProvider;
                if (initialLayer === "satellite") {
                    baseImageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
                        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
                        { enablePickFeatures: false }
                    );
                } else if (initialLayer === "carto") {
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
                    sceneMode:
                        initialMode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D,
                    baseLayer: new Cesium.ImageryLayer(baseImageryProvider),
                    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
                    creditContainer: document.createElement("div"),
                    requestRenderMode: true,
                    maximumRenderTimeChange: Infinity,
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

                activeViewer.screenSpaceEventHandler.removeInputAction(
                    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
                );
                if (activeViewer.cesiumWidget?.screenSpaceEventHandler) {
                    activeViewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
                        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
                    );
                }

                activeViewer.useBrowserRecommendedResolution = false;
                activeViewer.resolutionScale = 1.0;
                activeViewer.scene.globe.depthTestAgainstTerrain = false;

                if (initialMode === "2d") {
                    activeViewer.scene.fog.enabled = false;
                    activeViewer.scene.globe.showGroundAtmosphere = false;
                    if (activeViewer.scene.sun) activeViewer.scene.sun.show = false;
                    if (activeViewer.scene.moon) activeViewer.scene.moon.show = false;
                }

                activeViewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(
                        DEFAULT_COORDINATES.lng,
                        DEFAULT_COORDINATES.lat,
                        DEFAULT_COORDINATES.height
                    ),
                });

                let dragStartPos: { x: number; y: number } | null = null;
                let hasMovedDuringClick = false;

                const inputHandler = new Cesium.ScreenSpaceEventHandler(activeViewer.scene.canvas);
                inputHandler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
                    hasMovedDuringClick = false;
                    dragStartPos = { x: event.position.x, y: event.position.y };
                }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
                inputHandler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
                    if (
                        dragStartPos &&
                        Math.hypot(
                            movement.endPosition.x - dragStartPos.x,
                            movement.endPosition.y - dragStartPos.y
                        ) > DRAG_THRESHOLD_PX
                    ) {
                        hasMovedDuringClick = true;
                    }
                }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                inputHandler.setInputAction(() => {
                    dragStartPos = null;
                }, Cesium.ScreenSpaceEventType.LEFT_UP);
                inputHandler.setInputAction((click: ScreenSpaceEventHandler.PositionedEvent) => {
                    if (!activeViewer || activeViewer.isDestroyed()) return;
                    if (hasMovedDuringClick) {
                        hasMovedDuringClick = false;
                        return;
                    }
                    if (pickModeRef.current && onMapClickRef.current) {
                        const cartesian = activeViewer.camera.pickEllipsoid(
                            click.position,
                            activeViewer.scene.globe.ellipsoid
                        );
                        if (cartesian) {
                            const carto = Cesium.Cartographic.fromCartesian(cartesian);
                            onMapClickRef.current({
                                latitude: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6)),
                                longitude: Number(
                                    Cesium.Math.toDegrees(carto.longitude).toFixed(6)
                                ),
                            });
                        }
                        return;
                    }
                    const picked = activeViewer.scene.pick(click.position);
                    if (Cesium.defined(picked) && picked.id && picked.id.id) {
                        onEntityClickRef.current?.(picked.id.id);
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                handler = inputHandler;

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
            if (handler && !handler.isDestroyed()) {
                handler.destroy();
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
        v.scene.canvas.style.cursor = pickMode ? "crosshair" : "default";
        return () => {
            if (v && !v.isDestroyed()) {
                v.scene.canvas.style.cursor = "default";
            }
        };
    }, [pickMode, isLoaded]);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;
        if (appliedModeRef.current === mode) return;

        let removeMorphListener: (() => void) | undefined;

        async function updateSceneMode() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (!currentViewer || currentViewer.isDestroyed()) return;

            const targetMode = mode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D;
            appliedModeRef.current = mode;

            if (currentViewer.scene.mode !== targetMode) {
                const carto = currentViewer.camera.positionCartographic;
                const hasValidCarto =
                    carto &&
                    Number.isFinite(carto.latitude) &&
                    Number.isFinite(carto.longitude) &&
                    (Math.abs(carto.latitude) > 0.0001 || Math.abs(carto.longitude) > 0.0001);
                const targetLng = hasValidCarto
                    ? Cesium.Math.toDegrees(carto.longitude)
                    : DEFAULT_COORDINATES.lng;
                const targetLat = hasValidCarto
                    ? Cesium.Math.toDegrees(carto.latitude)
                    : DEFAULT_COORDINATES.lat;
                const targetHeight = hasValidCarto
                    ? Math.min(Math.max(carto.height, 1200), 120000)
                    : DEFAULT_COORDINATES.height;

                const applyRestoredView = () => {
                    if (currentViewer.isDestroyed()) return;
                    currentViewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(
                            targetLng,
                            targetLat,
                            targetHeight
                        ),
                    });
                    currentViewer.scene.requestRender();
                };

                removeMorphListener = currentViewer.scene.morphComplete.addEventListener(() => {
                    removeMorphListener?.();
                    removeMorphListener = undefined;
                    applyRestoredView();
                });

                if (targetMode === Cesium.SceneMode.SCENE2D) {
                    currentViewer.scene.fog.enabled = false;
                    currentViewer.scene.globe.showGroundAtmosphere = false;
                    if (currentViewer.scene.sun) currentViewer.scene.sun.show = false;
                    if (currentViewer.scene.moon) currentViewer.scene.moon.show = false;
                    currentViewer.scene.morphTo2D(0);
                } else {
                    currentViewer.scene.fog.enabled = true;
                    currentViewer.scene.globe.showGroundAtmosphere = true;
                    if (currentViewer.scene.sun) currentViewer.scene.sun.show = true;
                    if (currentViewer.scene.moon) currentViewer.scene.moon.show = true;
                    currentViewer.scene.morphTo3D(0);
                }

                applyRestoredView();
            }
        }

        updateSceneMode();

        return () => {
            removeMorphListener?.();
        };
    }, [mode, isLoaded]);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;
        if (appliedLayerTypeRef.current === layerType) return;

        async function updateImagery() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (!currentViewer || currentViewer.isDestroyed()) return;

            appliedLayerTypeRef.current = layerType;
            currentViewer.imageryLayers.removeAll();

            let provider: ImageryProvider;
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

            if (!currentViewer.isDestroyed()) {
                currentViewer.imageryLayers.addImageryProvider(provider);
                currentViewer.scene.requestRender();
            }
        }

        updateImagery();
    }, [layerType, isLoaded]);

    return (
        <CesiumContext.Provider value={{ viewer, isLoaded }}>
            <div className="relative w-full overflow-hidden select-none" style={{ height: "100%" }}>
                <div
                    ref={containerRef}
                    className="w-full h-full [&_.cesium-widget]:!absolute [&_.cesium-widget]:!inset-0 [&_.cesium-widget]:!w-full [&_.cesium-widget]:!h-full [&_.cesium-widget]:!overflow-hidden [&_.cesium-widget_canvas]:!w-full [&_.cesium-widget_canvas]:!h-full [&_.cesium-widget_canvas]:!block"
                />

                {!isLoaded && !mapError && (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label="Loading map"
                        className="absolute inset-0 z-30 bg-slate-900/95 p-4 flex flex-col justify-between overflow-hidden"
                    >
                        <div className="flex items-center justify-between">
                            <div className="h-7 w-20 rounded bg-slate-800 animate-pulse" />
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-24 rounded bg-slate-800 animate-pulse" />
                                <div className="h-7 w-7 rounded bg-slate-800 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex-1 my-4 rounded border border-slate-800/80 bg-slate-800/40 animate-pulse" />
                        <div className="flex items-center justify-between">
                            <div className="h-5 w-32 rounded bg-slate-800 animate-pulse" />
                            <div className="h-5 w-24 rounded bg-slate-800 animate-pulse" />
                        </div>
                        <span className="sr-only">Loading map...</span>
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
