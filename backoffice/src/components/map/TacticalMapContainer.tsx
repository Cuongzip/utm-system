"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Viewer } from "cesium";
import { Globe, Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { cn } from "@/lib";
import { BaseCesiumMap } from "./BaseCesiumMap";
import { TacticalBasemapMenu } from "./TacticalBasemapMenu";
import { TacticalCompassControls, TacticalMapStatusBar } from "./TacticalMapHud";
import type { ImageryType } from "./types";
import {
    BASEMAP_OPTIONS,
    getMapLayerSnapshot,
    getMapModeSnapshot,
    getServerMapModeSnapshot,
    subscribeMapLayer,
    subscribeMapMode,
    useTacticalMapSettings,
} from "./useTacticalMapSettings";

export {
    BASEMAP_OPTIONS,
    getMapLayerSnapshot,
    getMapModeSnapshot,
    getServerMapModeSnapshot,
    subscribeMapLayer,
    subscribeMapMode,
};

interface TacticalMapContainerProps {
    initialLayerType?: ImageryType;
    onEntityClick?: (entityId: string) => void;
    onMapClick?: (coords: { latitude: number; longitude: number }) => void;
    pickMode?: boolean;
    children?: ReactNode;
    inspector?: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
    overlay?: ReactNode;
    legendSlot?: ReactNode;
    statusSlot?: ReactNode;
    hideBottomHud?: boolean;
    frameless?: boolean;
    className?: string;
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
    legendSlot,
    statusSlot,
    hideBottomHud = false,
    frameless = false,
    className,
}: TacticalMapContainerProps) {
    const t = useTranslations("map");
    const {
        mapMode,
        imageryType,
        enable3DBuildings,
        enable3DTerrain,
        handleModeChange,
        handleLayerChange,
        handleToggle3DSetting,
    } = useTacticalMapSettings(initialLayerType);

    const [activeViewer, setActiveViewer] = useState<Viewer | null>(null);
    const [hasIonToken, setHasIonToken] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLayersOpen, setIsLayersOpen] = useState(false);
    const layersRef = useRef<HTMLDivElement>(null);

    const handleViewerReady = useCallback((v: Viewer | null, ionAvailable: boolean) => {
        setActiveViewer(v);
        setHasIonToken(ionAvailable);
    }, []);

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
                        className="h-8 flex items-center rounded-md bg-slate-950/88 p-0.5 border border-slate-700/80 backdrop-blur-md shadow-sm pointer-events-auto"
                    >
                        <button
                            type="button"
                            aria-pressed={mapMode === "globe"}
                            onClick={() => handleModeChange("globe")}
                            title={t("globe3dTitle")}
                            className={`h-full flex items-center gap-1 rounded-[4px] px-2 sm:px-2.5 text-[11px] font-semibold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 cursor-pointer ${
                                mapMode === "globe"
                                    ? "bg-slate-800 text-cyan-200 shadow-2xs ring-1 ring-cyan-500/40"
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
                            className={`h-full flex items-center gap-1 rounded-[4px] px-2 sm:px-2.5 text-[11px] font-semibold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 cursor-pointer ${
                                mapMode === "2d"
                                    ? "bg-slate-800 text-cyan-200 shadow-2xs ring-1 ring-cyan-500/40"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">{t("mode2d")}</span>
                        </button>
                    </div>

                    <TacticalCompassControls viewer={activeViewer} is3D={mapMode === "globe"} />

                    <TacticalBasemapMenu
                        containerRef={layersRef}
                        isOpen={isLayersOpen}
                        onToggleOpen={() => setIsLayersOpen((open) => !open)}
                        onClose={() => setIsLayersOpen(false)}
                        imageryType={imageryType}
                        onSelectLayer={handleLayerChange}
                        mapMode={mapMode}
                        hasIonToken={hasIonToken}
                        enable3DBuildings={enable3DBuildings}
                        enable3DTerrain={enable3DTerrain}
                        onToggle3DSetting={handleToggle3DSetting}
                    />

                    <button
                        type="button"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                        aria-pressed={isFullscreen}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-slate-950/88 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 transition-colors shadow-sm pointer-events-auto cursor-pointer"
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
                {!hideBottomHud && !inspector && legendSlot && (
                    <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-950/88 text-slate-100 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono shadow-md pointer-events-none max-w-[calc(100%-10rem)]">
                        {legendSlot}
                    </div>
                )}
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
