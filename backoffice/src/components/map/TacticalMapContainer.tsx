"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Viewer } from "cesium";
import { Check, Globe, Map as MapIcon, Maximize2, Minimize2, Layers } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { BaseCesiumMap } from "./BaseCesiumMap";
import { TacticalCompassControls, TacticalMapStatusBar } from "./TacticalMapHud";
import type { ImageryType } from "./types";
import { cn } from "@/lib";

export interface TacticalMapContainerProps {
    initialLayerType?: ImageryType;
    onEntityClick?: (entityId: string) => void;
    onMapClick?: (coords: { latitude: number; longitude: number }) => void;
    pickMode?: boolean;
    children?: React.ReactNode;
    inspector?: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    overlay?: React.ReactNode;
    statusSlot?: React.ReactNode;
    hideBottomHud?: boolean;
    frameless?: boolean;
    className?: string;
}

export const VALID_IMAGERY_TYPES: readonly ImageryType[] = [
    "satellite-hybrid",
    "satellite",
    "tactical-dark",
    "carto",
    "street",
];

export const BASEMAP_OPTIONS: ReadonlyArray<{ id: ImageryType; label: string }> = [
    { id: "satellite-hybrid", label: "Satellite Hybrid" },
    { id: "satellite", label: "Satellite Clean" },
    { id: "tactical-dark", label: "Tactical Dark" },
    { id: "carto", label: "Light Gray Canvas" },
    { id: "street", label: "Street Map" },
];

function subscribeStorageEvent(eventName: string, callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener(eventName, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(eventName, callback);
    };
}

function getMapModeSnapshot(): "globe" | "2d" {
    if (typeof window === "undefined") return "2d";
    try {
        const saved = localStorage.getItem("utm_map_mode");
        if (saved === "2d" || saved === "globe") return saved;
    } catch {
        // ignore
    }
    return "2d";
}

function getMapLayerSnapshot(fallback: ImageryType): ImageryType {
    if (typeof window === "undefined") return fallback;
    try {
        const saved = localStorage.getItem("utm_map_layer");
        if (saved && (VALID_IMAGERY_TYPES as readonly string[]).includes(saved)) {
            return saved as ImageryType;
        }
    } catch {
        // ignore
    }
    return fallback;
}

function getBooleanSettingSnapshot(key: string, fallback: boolean): boolean {
    if (typeof window === "undefined") return fallback;
    try {
        const saved = localStorage.getItem(key);
        if (saved === "true") return true;
        if (saved === "false") return false;
    } catch {
        // ignore
    }
    return fallback;
}

export function TacticalMapContainer({
    initialLayerType = "satellite-hybrid",
    onEntityClick,
    onMapClick,
    pickMode = false,
    children,
    inspector,
    header,
    footer,
    overlay,
    statusSlot,
    hideBottomHud = false,
    frameless = false,
    className,
}: TacticalMapContainerProps) {
    const t = useTranslations("map");
    const mapMode = useSyncExternalStore(
        (cb) => subscribeStorageEvent("utm_map_mode_change", cb),
        getMapModeSnapshot,
        () => "2d"
    );
    const imageryType = useSyncExternalStore(
        (cb) => subscribeStorageEvent("utm_map_layer_change", cb),
        () => getMapLayerSnapshot(initialLayerType),
        () => initialLayerType
    );
    const enable3DBuildings = useSyncExternalStore(
        (cb) => subscribeStorageEvent("utm_map_3d_buildings_change", cb),
        () => getBooleanSettingSnapshot("utm_map_3d_buildings", true),
        () => true
    );
    const enable3DTerrain = useSyncExternalStore(
        (cb) => subscribeStorageEvent("utm_map_3d_terrain_change", cb),
        () => getBooleanSettingSnapshot("utm_map_3d_terrain", true),
        () => true
    );

    const [activeViewer, setActiveViewer] = useState<Viewer | null>(null);
    const [hasIonToken, setHasIonToken] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLayersOpen, setIsLayersOpen] = useState(false);
    const layersRef = useRef<HTMLDivElement>(null);

    const handleViewerReady = useCallback((v: Viewer | null, ionAvailable: boolean) => {
        setActiveViewer(v);
        setHasIonToken(ionAvailable);
    }, []);

    const handleModeChange = (newMode: "globe" | "2d") => {
        try {
            localStorage.setItem("utm_map_mode", newMode);
            window.dispatchEvent(new Event("utm_map_mode_change"));
        } catch {
            // ignore
        }
    };

    const handleLayerChange = (newLayer: ImageryType) => {
        try {
            localStorage.setItem("utm_map_layer", newLayer);
            window.dispatchEvent(new Event("utm_map_layer_change"));
        } catch {
            // ignore
        }
    };

    const handleToggle3DSetting = (storageKey: string, eventName: string, nextValue: boolean) => {
        try {
            localStorage.setItem(storageKey, String(nextValue));
            window.dispatchEvent(new Event(eventName));
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!isLayersOpen && !isFullscreen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                isLayersOpen &&
                layersRef.current &&
                !layersRef.current.contains(e.target as Node)
            ) {
                setIsLayersOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isLayersOpen) {
                    setIsLayersOpen(false);
                } else if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isLayersOpen, isFullscreen]);

    const mapContentBody = (
        <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden bg-slate-900 select-none min-h-0">
            {header && <div className="shrink-0 z-10">{header}</div>}

            <div className="relative flex-1 w-full min-h-0 overflow-hidden">
                <div
                    className={cn(
                        "absolute top-3.5 right-3.5 flex flex-wrap items-center justify-end gap-1.5 pointer-events-none max-w-[calc(100%-2rem)]",
                        isLayersOpen ? "z-40" : "z-30"
                    )}
                >
                    <div
                        role="group"
                        aria-label={t("viewModeAria")}
                        className="h-8 flex items-center rounded-md bg-slate-900/90 p-0.5 border border-slate-700/80 backdrop-blur-md shadow-sm pointer-events-auto"
                    >
                        <button
                            type="button"
                            aria-pressed={mapMode === "globe"}
                            onClick={() => handleModeChange("globe")}
                            title={t("globe3dTitle")}
                            className={`h-full flex items-center gap-1 rounded-[4px] px-2 sm:px-2.5 text-[11px] font-semibold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer ${
                                mapMode === "globe"
                                    ? "bg-slate-700 text-white shadow-2xs"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">{t("mode3d")}</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={mapMode === "2d"}
                            onClick={() => handleModeChange("2d")}
                            title={t("flat2dTitle")}
                            className={`h-full flex items-center gap-1 rounded-[4px] px-2 sm:px-2.5 text-[11px] font-semibold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer ${
                                mapMode === "2d"
                                    ? "bg-slate-700 text-white shadow-2xs"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">{t("mode2d")}</span>
                        </button>
                    </div>

                    <TacticalCompassControls viewer={activeViewer} is3D={mapMode === "globe"} />

                    <div className="relative pointer-events-auto" ref={layersRef}>
                        <button
                            type="button"
                            onClick={() => setIsLayersOpen(!isLayersOpen)}
                            aria-label={t("basemapLayers")}
                            aria-expanded={isLayersOpen}
                            aria-haspopup="menu"
                            className={`h-8 w-8 inline-flex items-center justify-center rounded-md border text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm cursor-pointer ${
                                isLayersOpen
                                    ? "bg-slate-700 border-slate-500 text-white"
                                    : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md"
                            }`}
                            title={t("basemapLayers")}
                        >
                            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        {isLayersOpen && (
                            <div
                                role="menu"
                                aria-label={t("basemapOptionsAria")}
                                className="absolute right-0 top-full mt-1.5 w-48 rounded-md border border-slate-700/85 bg-slate-900/95 p-1 text-slate-200 shadow-xl backdrop-blur-md z-50 text-xs font-mono"
                            >
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/80 mb-0.5">
                                    {t("basemap")}
                                </div>
                                {BASEMAP_OPTIONS.map((layer) => {
                                    const isSelected = imageryType === layer.id;
                                    return (
                                        <button
                                            key={layer.id}
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={isSelected}
                                            onClick={() => {
                                                handleLayerChange(layer.id);
                                                setIsLayersOpen(false);
                                            }}
                                            className={`relative w-full text-left rounded-[4px] py-1.5 pl-7 pr-2.5 flex items-center justify-between transition-colors focus-visible:bg-slate-800 focus-visible:text-white focus-visible:outline-none cursor-pointer ${
                                                isSelected
                                                    ? "bg-slate-700/90 text-white font-bold"
                                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            }`}
                                        >
                                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                                {isSelected && (
                                                    <Check
                                                        className="h-3.5 w-3.5 text-white stroke-[2.5]"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <span>{t(`basemaps.${layer.id}`)}</span>
                                        </button>
                                    );
                                })}

                                {mapMode === "globe" && hasIonToken && (
                                    <div className="mt-1 pt-1 border-t border-slate-700/80">
                                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t("env3d")}
                                        </div>
                                        <button
                                            type="button"
                                            role="menuitemcheckbox"
                                            aria-checked={enable3DBuildings}
                                            onClick={() =>
                                                handleToggle3DSetting(
                                                    "utm_map_3d_buildings",
                                                    "utm_map_3d_buildings_change",
                                                    !enable3DBuildings
                                                )
                                            }
                                            className={`relative w-full text-left rounded-[4px] py-1.5 pl-7 pr-2.5 flex items-center justify-between transition-colors focus-visible:bg-slate-800 focus-visible:text-white focus-visible:outline-none cursor-pointer ${
                                                enable3DBuildings
                                                    ? "text-white font-semibold hover:bg-slate-800"
                                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            }`}
                                        >
                                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                                {enable3DBuildings && (
                                                    <Check
                                                        className="h-3.5 w-3.5 text-white stroke-[2.5]"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <span>{t("osmBuildings")}</span>
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitemcheckbox"
                                            aria-checked={enable3DTerrain}
                                            onClick={() =>
                                                handleToggle3DSetting(
                                                    "utm_map_3d_terrain",
                                                    "utm_map_3d_terrain_change",
                                                    !enable3DTerrain
                                                )
                                            }
                                            className={`relative w-full text-left rounded-[4px] py-1.5 pl-7 pr-2.5 flex items-center justify-between transition-colors focus-visible:bg-slate-800 focus-visible:text-white focus-visible:outline-none cursor-pointer ${
                                                enable3DTerrain
                                                    ? "text-white font-semibold hover:bg-slate-800"
                                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            }`}
                                        >
                                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                                {enable3DTerrain && (
                                                    <Check
                                                        className="h-3.5 w-3.5 text-white stroke-[2.5]"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <span>{t("worldTerrain")}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                        aria-pressed={isFullscreen}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shadow-sm pointer-events-auto cursor-pointer"
                        title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                    </button>
                </div>

                <BaseCesiumMap
                    mode={mapMode === "globe" ? "3d" : "2d"}
                    layerType={imageryType}
                    enable3DBuildings={enable3DBuildings}
                    enable3DTerrain={enable3DTerrain}
                    onViewerReady={handleViewerReady}
                    onEntityClick={onEntityClick}
                    onMapClick={onMapClick}
                    pickMode={pickMode}
                >
                    {children}
                </BaseCesiumMap>
                <TacticalMapStatusBar
                    viewer={activeViewer}
                    statusSlot={statusSlot}
                    hidden={Boolean(hideBottomHud || inspector)}
                />
                {inspector}
                {overlay}
            </div>

            {footer && <div className="shrink-0 z-10">{footer}</div>}
        </div>
    );

    if (frameless) {
        return (
            <div
                className={cn(
                    "w-full flex-1 flex flex-col min-h-0 overflow-hidden",
                    isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "h-full",
                    className
                )}
            >
                {mapContentBody}
            </div>
        );
    }

    return (
        <ChamferCard
            size="lg"
            className={cn(
                "w-full transition-shadow",
                isFullscreen
                    ? "fixed inset-0 z-50 h-screen w-screen rounded-none"
                    : "h-full min-h-[420px]",
                className
            )}
        >
            {mapContentBody}
        </ChamferCard>
    );
}
