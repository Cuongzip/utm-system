"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Globe, Map, Maximize2, Crosshair, Layers, Plus, Minus } from "lucide-react";
import { CompassLoader } from "@/components/CompassLoader";
import { ChamferCard } from "@/components/ui";

const CesiumMap = dynamic(() => import("@/components/CesiumMap"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
            <CompassLoader size={96} text="Đang tải bản đồ 3D Globe..." />
        </div>
    ),
});

const Map2D = dynamic(() => import("@/components/Map2D"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
            <CompassLoader size={96} text="Đang tải bản đồ 2D Flat Map..." />
        </div>
    ),
});

export type MapMode = "globe" | "2d";

interface TacticalMapPanelProps {
    initialMode?: MapMode;
}

export function TacticalMapPanel({ initialMode = "globe" }: TacticalMapPanelProps) {
    const [mapMode, setMapMode] = useState<MapMode>(initialMode);
    const [isFullscreen, setIsFullscreen] = useState(false);

    return (
        <ChamferCard
            size="lg"
            accent="dark"
            className={`transition-all ${
                isFullscreen ? "fixed inset-0 z-50 h-screen" : "h-[490px]"
            }`}
            innerClassName="relative w-full h-full overflow-hidden bg-slate-900 select-none"
        >
            <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 pointer-events-auto">
                <div className="bg-white border border-[#e2e8f0] rounded-[4px] shadow-xs flex flex-col overflow-hidden">
                    <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center text-[#334155] border-b border-[#f1f5f9] hover:bg-slate-50 cursor-pointer"
                        aria-label="Zoom in"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center text-[#334155] hover:bg-slate-50 cursor-pointer"
                        aria-label="Zoom out"
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </button>
                </div>
                <button
                    type="button"
                    className="w-7 h-7 bg-white border border-[#e2e8f0] rounded-[4px] shadow-xs flex items-center justify-center text-[#475569] hover:bg-slate-50 cursor-pointer"
                    aria-label="Layers"
                >
                    <Layers className="h-4 w-4" />
                </button>
            </div>

            <div className="absolute top-3 right-4 z-20 flex items-center gap-2 pointer-events-none">
                <div className="flex items-center rounded-lg bg-slate-900/90 p-1 border border-slate-700/80 backdrop-blur-md shadow-md pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => setMapMode("globe")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            mapMode === "globe"
                                ? "bg-slate-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Globe className="h-3.5 w-3.5" />
                        <span>3D Globe</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setMapMode("2d")}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            mapMode === "2d"
                                ? "bg-slate-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Map className="h-3.5 w-3.5" />
                        <span>2D Flat Map</span>
                    </button>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-300 backdrop-blur-md shadow-md pointer-events-auto">
                    <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Da Nang Airspace</span>
                </div>

                <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="flex items-center justify-center rounded-md bg-slate-900/90 border border-slate-700/80 p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur-md shadow-md pointer-events-auto cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
                    aria-label="Toggle Fullscreen"
                >
                    <Maximize2 className="h-4 w-4" />
                </button>
            </div>

            <div className="relative h-full w-full">
                {mapMode === "globe" ? (
                    <CesiumMap height="100%" hideToolbar />
                ) : (
                    <Map2D height="100%" hideToolbar />
                )}
            </div>
        </ChamferCard>
    );
}

export default TacticalMapPanel;
