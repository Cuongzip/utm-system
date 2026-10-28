"use client";

import React, { useState } from "react";
import { Globe, Map as MapIcon, Maximize2, Minimize2, Layers } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { BaseCesiumMap } from "./BaseCesiumMap";
import type { MapMode, ImageryType, MapCoordinates } from "./types";
import { cn } from "@/lib";

export interface TacticalMapContainerProps {
    initialMode?: MapMode;
    initialLayerType?: ImageryType;
    height?: string;
    initialCoordinates?: MapCoordinates;
    onEntityClick?: (entityId: string) => void;
    children?: React.ReactNode;
    inspector?: React.ReactNode;
    className?: string;
    loadingText?: string;
}

export function TacticalMapContainer({
    initialMode = "3d",
    initialLayerType = "satellite",
    height = "100%",
    initialCoordinates,
    onEntityClick,
    children,
    inspector,
    className,
    loadingText = "Loading tactical map...",
}: TacticalMapContainerProps) {
    const [mapMode, setMapMode] = useState<"globe" | "2d">(initialMode === "3d" ? "globe" : "2d");
    const [imageryType, setImageryType] = useState<ImageryType>(initialLayerType);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLayersOpen, setIsLayersOpen] = useState(false);

    return (
        <ChamferCard
            size="lg"
            className={cn(
                "w-full transition-all",
                isFullscreen
                    ? "fixed inset-0 z-50 h-screen w-screen rounded-none"
                    : "h-full min-h-[520px]",
                className
            )}
        >
            <div className="relative w-full h-full min-h-[520px] flex flex-col overflow-hidden bg-slate-900 select-none">
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2 pointer-events-none">
                    <div className="flex items-center rounded-lg bg-slate-900/90 p-1 border border-slate-700/80 backdrop-blur-md shadow-md pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => setMapMode("globe")}
                            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold font-mono transition-all cursor-pointer ${
                                mapMode === "globe"
                                    ? "bg-slate-700 text-white shadow-xs"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span>3D</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMapMode("2d")}
                            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold font-mono transition-all cursor-pointer ${
                                mapMode === "2d"
                                    ? "bg-slate-700 text-white shadow-xs"
                                    : "text-slate-400 hover:text-white"
                            }`}
                        >
                            <MapIcon className="h-3.5 w-3.5" />
                            <span>2D</span>
                        </button>
                    </div>

                    <div className="relative pointer-events-auto">
                        <button
                            type="button"
                            onClick={() => setIsLayersOpen(!isLayersOpen)}
                            className={`p-1.5 rounded-md border text-xs font-mono transition-colors shadow-md cursor-pointer ${
                                isLayersOpen
                                    ? "bg-slate-700 border-slate-500 text-cyan-400"
                                    : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
                            }`}
                            title="Basemap Layers"
                        >
                            <Layers className="h-4 w-4" />
                        </button>

                        {isLayersOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 z-50 text-xs font-mono">
                                {(
                                    [
                                        { id: "satellite", label: "Satellite" },
                                        { id: "street", label: "Street" },
                                        { id: "carto", label: "Dark Carto" },
                                    ] as const
                                ).map((layer) => (
                                    <button
                                        key={layer.id}
                                        type="button"
                                        onClick={() => {
                                            setImageryType(layer.id);
                                            setIsLayersOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 transition-colors cursor-pointer ${
                                            imageryType === layer.id
                                                ? "text-cyan-400 font-bold"
                                                : "text-slate-300"
                                        }`}
                                    >
                                        {layer.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-md pointer-events-auto cursor-pointer"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                        ) : (
                            <Maximize2 className="h-4 w-4" />
                        )}
                    </button>
                </div>

                <div className="relative flex-1 w-full h-full min-h-[460px] overflow-hidden">
                    <BaseCesiumMap
                        mode={mapMode === "globe" ? "3d" : "2d"}
                        layerType={imageryType}
                        height={height}
                        hideToolbar
                        onEntityClick={onEntityClick}
                        initialCoordinates={initialCoordinates}
                        loadingText={loadingText}
                    >
                        {children}
                    </BaseCesiumMap>
                    {inspector}
                </div>
            </div>
        </ChamferCard>
    );
}

export default TacticalMapContainer;
