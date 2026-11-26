"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { Globe, Map as MapIcon, Maximize2, Minimize2, Layers } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { BaseCesiumMap } from "./BaseCesiumMap";
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
    className?: string;
}

function subscribeMapMode(callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener("utm_map_mode_change", callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("utm_map_mode_change", callback);
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

function getServerMapModeSnapshot(): "globe" | "2d" {
    return "2d";
}

function subscribeMapLayer(callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener("utm_map_layer_change", callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("utm_map_layer_change", callback);
    };
}

function getMapLayerSnapshot(fallback: ImageryType): ImageryType {
    if (typeof window === "undefined") return fallback;
    try {
        const saved = localStorage.getItem("utm_map_layer");
        if (saved === "satellite" || saved === "street" || saved === "carto") return saved;
    } catch {
        // ignore
    }
    return fallback;
}

export function TacticalMapContainer({
    initialLayerType = "satellite",
    onEntityClick,
    onMapClick,
    pickMode = false,
    children,
    inspector,
    header,
    footer,
    overlay,
    className,
}: TacticalMapContainerProps) {
    const mapMode = useSyncExternalStore(
        subscribeMapMode,
        getMapModeSnapshot,
        getServerMapModeSnapshot
    );
    const imageryType = useSyncExternalStore(
        subscribeMapLayer,
        () => getMapLayerSnapshot(initialLayerType),
        () => initialLayerType
    );
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLayersOpen, setIsLayersOpen] = useState(false);
    const layersRef = useRef<HTMLDivElement>(null);

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
            <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden bg-slate-900 select-none min-h-0">
                {header && <div className="shrink-0 z-10">{header}</div>}

                <div className="relative flex-1 w-full min-h-0 overflow-hidden">
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 pointer-events-none">
                        <div
                            role="group"
                            aria-label="Map view mode"
                            className="flex items-center rounded-lg bg-slate-900/90 p-1 border border-slate-700/80 backdrop-blur-md shadow-md pointer-events-auto"
                        >
                            <button
                                type="button"
                                aria-pressed={mapMode === "globe"}
                                onClick={() => handleModeChange("globe")}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer ${
                                    mapMode === "globe"
                                        ? "bg-slate-700 text-white shadow-xs"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>3D</span>
                            </button>
                            <button
                                type="button"
                                aria-pressed={mapMode === "2d"}
                                onClick={() => handleModeChange("2d")}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer ${
                                    mapMode === "2d"
                                        ? "bg-slate-700 text-white shadow-xs"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>2D</span>
                            </button>
                        </div>

                        <div className="relative pointer-events-auto" ref={layersRef}>
                            <button
                                type="button"
                                onClick={() => setIsLayersOpen(!isLayersOpen)}
                                aria-label="Basemap Layers"
                                aria-expanded={isLayersOpen}
                                aria-haspopup="menu"
                                className={`p-1.5 rounded-md border text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-md cursor-pointer ${
                                    isLayersOpen
                                        ? "bg-slate-700 border-slate-500 text-white"
                                        : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
                                }`}
                                title="Basemap Layers"
                            >
                                <Layers className="h-4 w-4" aria-hidden="true" />
                            </button>

                            {isLayersOpen && (
                                <div
                                    role="menu"
                                    aria-label="Basemap layer options"
                                    className="absolute right-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 z-50 text-xs font-mono"
                                >
                                    {(
                                        [
                                            { id: "satellite", label: "Satellite" },
                                            { id: "street", label: "Street" },
                                            { id: "carto", label: "Carto Voyager" },
                                        ] as const
                                    ).map((layer) => (
                                        <button
                                            key={layer.id}
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={imageryType === layer.id}
                                            onClick={() => {
                                                handleLayerChange(layer.id);
                                                setIsLayersOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 focus-visible:bg-slate-800 focus-visible:outline-none transition-colors cursor-pointer ${
                                                imageryType === layer.id
                                                    ? "bg-slate-800 text-white font-bold"
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
                            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            aria-pressed={isFullscreen}
                            className="p-1.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shadow-md pointer-events-auto cursor-pointer"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    <BaseCesiumMap
                        mode={mapMode === "globe" ? "3d" : "2d"}
                        layerType={imageryType}
                        onEntityClick={onEntityClick}
                        onMapClick={onMapClick}
                        pickMode={pickMode}
                    >
                        {children}
                    </BaseCesiumMap>
                    {inspector}
                    {overlay}
                </div>

                {footer && <div className="shrink-0 z-10">{footer}</div>}
            </div>
        </ChamferCard>
    );
}
