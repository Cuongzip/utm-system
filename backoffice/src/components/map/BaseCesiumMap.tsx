"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import type { Cesium3DTileset, ScreenSpaceEventHandler, Viewer } from "cesium";
import { CesiumContext } from "./CesiumContext";
import { getCesium } from "./cesiumLoader";
import { applyConfiguredImageryLayers, createImageryLayersForType } from "./basemapProviders";
import { TACTICAL_3D_PITCH_DEG } from "./cesiumUtils";
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
    enable3DTerrain?: boolean;
    enable3DBuildings?: boolean;
    onViewerReady?: (viewer: Viewer | null, hasIonToken: boolean) => void;
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
    const t = useTranslations("map");
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const osmBuildingsRef = useRef<Cesium3DTileset | null>(null);
    const appliedTerrainRef = useRef<"world" | "ellipsoid">("ellipsoid");
    const layerRequestIdRef = useRef(0);

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
        let handler: { destroy: () => void; isDestroyed: () => boolean } | null = null;
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

                if (initialMode === "2d") {
                    activeViewer.scene.fog.enabled = false;
                    activeViewer.scene.globe.showGroundAtmosphere = false;
                    if (activeViewer.scene.sun) activeViewer.scene.sun.show = false;
                    if (activeViewer.scene.moon) activeViewer.scene.moon.show = false;
                    activeViewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(
                            DEFAULT_COORDINATES.lng,
                            DEFAULT_COORDINATES.lat,
                            DEFAULT_COORDINATES.height
                        ),
                    });
                } else {
                    const centerTarget = Cesium.Cartesian3.fromDegrees(
                        DEFAULT_COORDINATES.lng,
                        DEFAULT_COORDINATES.lat,
                        0
                    );
                    activeViewer.camera.lookAt(
                        centerTarget,
                        new Cesium.HeadingPitchRange(
                            0,
                            Cesium.Math.toRadians(TACTICAL_3D_PITCH_DEG),
                            DEFAULT_COORDINATES.height
                        )
                    );
                    activeViewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
                }

                let dragStartPos: { x: number; y: number } | null = null;
                let hasMovedDuringClick = false;
                let lastHoverCheckTs = 0;

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

                    if (
                        !dragStartPos &&
                        !pickModeRef.current &&
                        onEntityClickRef.current &&
                        activeViewer &&
                        !activeViewer.isDestroyed()
                    ) {
                        const now = performance.now();
                        if (now - lastHoverCheckTs >= 80) {
                            lastHoverCheckTs = now;
                            const hovered = activeViewer.scene.pick(movement.endPosition);
                            const isClickable = Boolean(
                                Cesium.defined(hovered) && hovered.id && hovered.id.id
                            );
                            activeViewer.scene.canvas.style.cursor = isClickable
                                ? "pointer"
                                : "default";
                        }
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
                        const ray = activeViewer.camera.getPickRay(click.position);
                        const globeCartesian = ray
                            ? activeViewer.scene.globe.pick(ray, activeViewer.scene)
                            : undefined;
                        const cartesian =
                            globeCartesian ??
                            activeViewer.camera.pickEllipsoid(
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
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (handler && !handler.isDestroyed()) {
                handler.destroy();
            }
            osmBuildingsRef.current = null;
            appliedTerrainRef.current = "ellipsoid";
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

        let cancelled = false;
        let removeMorphListener: (() => void) | undefined;

        async function updateSceneMode() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (cancelled || !currentViewer || currentViewer.isDestroyed()) return;

            const targetMode = mode === "3d" ? Cesium.SceneMode.SCENE3D : Cesium.SceneMode.SCENE2D;
            appliedModeRef.current = mode;

            if (currentViewer.scene.mode !== targetMode) {
                const canvas = currentViewer.scene.canvas;
                const centerScreen = new Cesium.Cartesian2(
                    canvas.clientWidth / 2,
                    canvas.clientHeight / 2
                );
                const centerRay = currentViewer.camera.getPickRay(centerScreen);
                const pickedGround = centerRay
                    ? currentViewer.scene.globe.pick(centerRay, currentViewer.scene)
                    : undefined;
                const fallbackCarto = currentViewer.camera.positionCartographic;
                const groundCarto = pickedGround
                    ? Cesium.Cartographic.fromCartesian(pickedGround)
                    : fallbackCarto;

                const hasValidCarto =
                    groundCarto &&
                    Number.isFinite(groundCarto.latitude) &&
                    Number.isFinite(groundCarto.longitude) &&
                    (Math.abs(groundCarto.latitude) > 0.0001 ||
                        Math.abs(groundCarto.longitude) > 0.0001);

                const targetLng = hasValidCarto
                    ? Cesium.Math.toDegrees(groundCarto.longitude)
                    : DEFAULT_COORDINATES.lng;
                const targetLat = hasValidCarto
                    ? Cesium.Math.toDegrees(groundCarto.latitude)
                    : DEFAULT_COORDINATES.lat;
                const isLeaving3D = currentViewer.scene.mode === Cesium.SceneMode.SCENE3D;
                const slantRange =
                    isLeaving3D && pickedGround
                        ? Cesium.Cartesian3.distance(currentViewer.camera.positionWC, pickedGround)
                        : (fallbackCarto?.height ?? DEFAULT_COORDINATES.height);
                const adjustedHeight =
                    isLeaving3D && targetMode === Cesium.SceneMode.SCENE2D
                        ? slantRange * 1.32
                        : !isLeaving3D && targetMode === Cesium.SceneMode.SCENE3D
                          ? slantRange * 0.95
                          : slantRange;
                const targetHeight = Number.isFinite(adjustedHeight)
                    ? Math.min(Math.max(adjustedHeight, 1200), 140000)
                    : DEFAULT_COORDINATES.height;

                const applyRestoredView = () => {
                    if (currentViewer.isDestroyed()) return;
                    if (targetMode === Cesium.SceneMode.SCENE3D) {
                        const centerTarget = Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 0);
                        currentViewer.camera.lookAt(
                            centerTarget,
                            new Cesium.HeadingPitchRange(
                                0,
                                Cesium.Math.toRadians(TACTICAL_3D_PITCH_DEG),
                                targetHeight * 1.12
                            )
                        );
                        currentViewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
                    } else {
                        currentViewer.camera.setView({
                            destination: Cesium.Cartesian3.fromDegrees(
                                targetLng,
                                targetLat,
                                targetHeight
                            ),
                        });
                    }
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
            cancelled = true;
            removeMorphListener?.();
        };
    }, [mode, isLoaded]);

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
    }, [layerType, isLoaded]);

    useEffect(() => {
        const v = viewerRef.current;
        if (!v || !isLoaded || v.isDestroyed()) return;

        let cancelled = false;

        async function sync3DEnvironment() {
            const Cesium = await getCesium();
            const currentViewer = viewerRef.current;
            if (cancelled || !currentViewer || currentViewer.isDestroyed()) return;

            const shouldUseWorldTerrain = mode === "3d" && enable3DTerrain && HAS_ION_TOKEN;
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

            const shouldShowBuildings = mode === "3d" && enable3DBuildings && HAS_ION_TOKEN;
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
    }, [mode, enable3DTerrain, enable3DBuildings, isLoaded]);

    return (
        <CesiumContext.Provider value={{ viewer, isLoaded, hasIonToken: HAS_ION_TOKEN }}>
            <div className="relative w-full overflow-hidden select-none" style={{ height: "100%" }}>
                <div
                    ref={containerRef}
                    className="w-full h-full [&_.cesium-widget]:!absolute [&_.cesium-widget]:!inset-0 [&_.cesium-widget]:!w-full [&_.cesium-widget]:!h-full [&_.cesium-widget]:!overflow-hidden [&_.cesium-widget_canvas]:!w-full [&_.cesium-widget_canvas]:!h-full [&_.cesium-widget_canvas]:!block"
                />

                {!isLoaded && !mapError && (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label={t("loadingMap")}
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
                        <span className="sr-only">{t("loadingMap")}</span>
                    </div>
                )}

                {mapError && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/92 px-4 text-center">
                        <span className="text-sm font-mono font-semibold text-red-400">
                            {mapError}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setMapError(null);
                                setInitAttempt((n) => n + 1);
                            }}
                            className="h-8 px-3 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                        >
                            {t("retryMap")}
                        </button>
                    </div>
                )}

                {isLoaded && children}
            </div>
        </CesiumContext.Provider>
    );
}
